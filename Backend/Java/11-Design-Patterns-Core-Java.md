# Design Patterns in Core Java (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](../Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

Everything below is plain Java — no Spring, no framework, nothing to install. These three patterns get asked about on their own because they solve problems that show up in ordinary Java code, long before a framework enters the picture. Spring happens to use versions of the same ideas internally (proxies, bean creation, choosing an implementation for you) — that side of the story is covered separately in [08-AOP-Actuator-Microservices.md](../Springboot/08-AOP-Actuator-Microservices.md#10-design-patterns-spring-uses-internally), once you already know Spring Boot itself. This file only needs plain Java.

---

## 1. The Problem: Something That Must Exist Exactly Once — Singleton

Say your app needs to read a settings file from disk and hand out those settings wherever they're needed:

```java
class ConfigurationLoader {
    private final Map<String, String> settings;

    ConfigurationLoader() {
        this.settings = loadFromDisk();   // reads a file, parses it — not instant
    }

    String get(String key) {
        return settings.get(key);
    }
}
```

Looks fine on its own. The trouble starts once more than one part of the app needs it:

```java
ConfigurationLoader loaderInStartup = new ConfigurationLoader();
ConfigurationLoader loaderInRequestHandler = new ConfigurationLoader();
```

Two real problems show up here:

1. **You just read the same file from disk twice**, for no reason — wasted work that only gets worse the more places construct their own copy.
2. **Nothing stops the two instances from disagreeing.** If the file on disk changes between the two reads, `loaderInStartup` and `loaderInRequestHandler` now hold two different versions of "the settings" at the same time, and nothing in the code even hints that this can happen. For something like a shared database connection pool, this is worse than wasteful — if every part of the app opens its own pool, you can quietly exceed the database's connection limit, because nothing enforces "there should only ever be one pool."

**This is exactly what the Singleton pattern answers: how do you guarantee a class is instantiated exactly once, and every part of the app that asks for it gets that same one instance?**

The mechanism has two parts: make the constructor `private` (so nobody outside the class can call `new ConfigurationLoader()`), and add a static method that hands back the one shared instance, creating it the first time it's asked for:

```java
class ConfigurationLoader {
    private static ConfigurationLoader instance;
    private final Map<String, String> settings;

    private ConfigurationLoader() {          // private — `new` is no longer possible from outside
        this.settings = loadFromDisk();
    }

    static ConfigurationLoader getInstance() {
        if (instance == null) {
            instance = new ConfigurationLoader();
        }
        return instance;
    }
}

ConfigurationLoader.getInstance().get("app.name");   // same instance, every single call
```

This version has a real bug the moment two threads call `getInstance()` at nearly the same time: both can see `instance == null` before either has finished constructing one, and both go on to build a `ConfigurationLoader` — you end up with two instances anyway, exactly the problem you were trying to prevent, just harder to spot because it only happens under concurrent load.

The fix is called **double-checked locking**:

```java
class ConfigurationLoader {
    private static volatile ConfigurationLoader instance;   // volatile matters — see below
    private final Map<String, String> settings;

    private ConfigurationLoader() {
        this.settings = loadFromDisk();
    }

    static ConfigurationLoader getInstance() {
        if (instance == null) {                          // first check, no lock — fast path once built
            synchronized (ConfigurationLoader.class) {
                if (instance == null) {                   // second check, inside the lock
                    instance = new ConfigurationLoader();
                }
            }
        }
        return instance;
    }
}
```

Read it as two separate checks solving two separate problems: the *first* check (before the lock) means that once the instance exists, every later call skips locking entirely — locking on every single call would be needless overhead forever, just to protect a decision that only matters once. The *second* check (inside the lock) is what actually prevents two instances: if two threads both got past the first check before either acquired the lock, only one of them gets to actually run `new ConfigurationLoader()` — the other, once it gets the lock, sees `instance` is no longer `null` and skips construction.

The `volatile` keyword is not decoration — leave it off and this can still break. Constructing an object and assigning it to `instance` is not guaranteed to happen as one atomic step from another thread's point of view; due to how the JVM (Java Virtual Machine) and CPU are allowed to reorder instructions for performance, another thread can observe `instance` as already non-null *before* the constructor has actually finished setting up `settings`. That thread then reads `instance.settings` and gets a partially-built object — a real, famous, hard-to-reproduce bug. `volatile` forbids exactly that reordering for this field, guaranteeing that once another thread sees `instance` as non-null, it also sees the fully-constructed object behind it.

**A simpler alternative that avoids all of this, and that most experienced Java engineers reach for first:** an enum singleton.

```java
enum ConfigurationLoaderEnum {
    INSTANCE;

    private final Map<String, String> settings = loadFromDisk();

    Map<String, String> get(String key) { return settings.get(key); }
}

ConfigurationLoaderEnum.INSTANCE.get("app.name");
```

The JVM itself guarantees an enum constant is created exactly once, thread-safely, with no locking code written by you at all — enum construction already has these guarantees built in as a language rule. If a real interview asks "how would you write a thread-safe singleton," knowing this trade-off — and that it's usually the better real-world answer — matters more than reciting double-checked locking from memory without understanding why each of its two checks exists.

**The trade-off worth saying out loud, either way:** a singleton is convenient, but it hides a dependency. A class that calls `ConfigurationLoader.getInstance()` inside its own methods doesn't declare that dependency anywhere visible — not in its constructor, not in its fields — so you can't swap in a fake version for a test the way you could with a dependency handed in through a constructor. And because the one instance is shared everywhere, any mutable state inside it is shared and can be modified from anywhere too, which is exactly the kind of shared mutable state that's easy to get wrong under concurrent access. (If you've already read the Spring Boot file: a singleton-scoped bean — Spring's default — gives you the exact same "exactly one shared instance" guarantee for free, with none of this hand-written locking, which is why hand-rolled singletons are common in plain utility code but rare inside a Spring-managed class.)

## 2. The Problem: A Constructor (or a Setter Chain) That's Hard to Use Safely — Builder

Say you're building an `Order` with a handful of required fields and a few optional ones — a coupon code, gift wrapping, a shipping tier. The obvious first approach is one big constructor:

```java
Order order = new Order(42L, new BigDecimal("199.99"), null, true, false, null, "STANDARD");
```

Read that call site cold, with no editor tooltip helping you. Which `boolean` is `giftWrapped` and which is some other flag? What does the first `null` mean versus leaving it out? You can't tell without going and reading `Order`'s constructor signature every single time. And it gets worse as fields grow — this is sometimes called the **telescoping constructor problem**: every new optional field either forces existing call sites to pass more positional arguments they don't care about, or you write an overload for every plausible combination of "which optional fields does this caller actually want to set."

The other obvious fix — setters instead of a giant constructor — creates a different problem:

```java
Order order = new Order();
order.setCustomerId(42L);
order.setTotal(new BigDecimal("199.99"));
// order.giftWrapped is still unset, order.shippingTier is still unset here —
// if anything reads `order` at this exact line, it sees an incomplete, half-configured object
order.setGiftWrapped(true);
```

Between the first `new Order()` and the last setter call, `order` exists in a half-built state, and nothing stops code elsewhere from getting a reference to it and reading it before it's actually finished being configured. There's also no single place that enforces "customerId and total are actually required" — you find out only if something downstream breaks because a field was silently left at its default.

**This is exactly what the Builder pattern answers: how do you construct a complex object, with named optional fields and required-field validation, while keeping the finished object immutable and never observable in a half-built state?**

```java
class Order {
    private final Long customerId;
    private final BigDecimal total;
    private final String couponCode;    // optional
    private final boolean giftWrapped;  // optional
    private final String shippingTier;

    private Order(Builder builder) {
        this.customerId = builder.customerId;
        this.total = builder.total;
        this.couponCode = builder.couponCode;
        this.giftWrapped = builder.giftWrapped;
        this.shippingTier = builder.shippingTier;
    }

    static class Builder {
        private Long customerId;
        private BigDecimal total;
        private String couponCode;
        private boolean giftWrapped = false;
        private String shippingTier = "STANDARD";

        Builder customerId(Long customerId) { this.customerId = customerId; return this; }
        Builder total(BigDecimal total) { this.total = total; return this; }
        Builder couponCode(String couponCode) { this.couponCode = couponCode; return this; }
        Builder giftWrapped(boolean giftWrapped) { this.giftWrapped = giftWrapped; return this; }
        Builder shippingTier(String shippingTier) { this.shippingTier = shippingTier; return this; }

        Order build() {
            if (customerId == null || total == null) {
                throw new IllegalStateException("customerId and total are required");
            }
            return new Order(this);   // Order only comes into existence here, fully formed
        }
    }
}

Order order = new Order.Builder()
    .customerId(42L)
    .total(new BigDecimal("199.99"))
    .giftWrapped(true)
    .build();
```

Compare this call site to the constructor call above: every value is now named at the call site (`giftWrapped(true)`, not a bare `true` buried among six other arguments), fields that don't matter for this order simply aren't called at all, `build()` is the one and only place that checks required fields are actually set, and — this is the part the setter-chain version couldn't give you — there is no moment where an `Order` exists half-configured. The `Order` object doesn't come into existence at all until `build()` runs, by which point it's fully valid and immutable (every field is `final`).

In real codebases you'll rarely hand-write all of this — Lombok's `@Builder` annotation generates exactly this `Builder` class for you from your fields. Knowing what `@Builder` actually expands to, and why each part exists, is what an interview question about it is really testing — not whether you can recite the annotation name.

## 3. The Problem: The Same "Which Implementation Do I Need" Logic, Copied Everywhere — Factory

Say your app supports paying by credit card, UPI (Unified Payments Interface), or PayPal, and several places in the codebase need to turn a `PaymentType` into the right processor to actually run the charge — checkout, refunds, and an admin retry screen all need this same decision:

```java
// inside checkout code
PaymentProcessor processor;
if (type == PaymentType.CREDIT_CARD) {
    processor = new CreditCardProcessor();
} else if (type == PaymentType.UPI) {
    processor = new UpiProcessor();
} else {
    processor = new PaypalProcessor();
}
processor.process(amount);
```

```java
// the exact same if/else, copy-pasted into the refund code
// ...and copy-pasted again into the admin retry screen
```

The actual bug this causes isn't visible yet — it shows up the day a fourth payment type is added. Now there are three separate copies of this if/else chain scattered through the codebase, and updating "how do we pick a processor" means finding every one of them and changing each the same way. Miss one — easy to do, since nothing connects these copies to each other — and that one code path quietly keeps using the old logic, or throws for the new type, while everywhere else works fine.

**This is exactly what the Factory pattern answers: how do you centralize "which concrete implementation does this type need" in one place, so every caller depends only on an interface and a type, never on the concrete classes or the decision logic itself?**

```java
interface PaymentProcessor {
    void process(BigDecimal amount);
}

class PaymentProcessorFactory {
    static PaymentProcessor create(PaymentType type) {
        return switch (type) {
            case CREDIT_CARD -> new CreditCardProcessor();
            case UPI -> new UpiProcessor();
            case PAYPAL -> new PaypalProcessor();
        };
    }
}
```

Every call site now looks like this instead:

```java
PaymentProcessor processor = PaymentProcessorFactory.create(request.paymentType());
processor.process(request.amount());
```

Checkout, refunds, and the admin screen all call the same `create(...)` method — none of them know or care that `CreditCardProcessor` or `UpiProcessor` even exist as concrete classes. Adding a fourth payment type now means changing exactly one method, in exactly one file, and every caller picks it up automatically.

If you've read the Spring Boot Fundamentals file, this should feel familiar: Spring's dependency injection is doing this same job — "decide which concrete implementation satisfies this interface, and hand it to whoever asked" — automatically, for every bean in the app, instead of you writing and maintaining a factory method by hand for each one. The Factory pattern here is the plain-Java version of exactly what a container like Spring's is automating at a much larger scale.

## Interview Questions and Answers

### 1. Why does the double-checked-locking singleton need `volatile` on the instance field?

**Answer:** Without `volatile`, another thread can observe the `instance` reference as non-null before the constructor has actually finished initializing the object's fields, because the JVM and CPU are allowed to reorder the steps of "allocate, initialize, assign" for performance. That thread then reads a partially-constructed object. `volatile` forbids that reordering for this field, so any thread that sees a non-null `instance` is guaranteed to see a fully-initialized one.

**Follow-up:** Why are there two `null` checks instead of one? The outer check (no lock) lets every call skip locking once the instance already exists — that's the fast path. The inner check (inside the lock) is the one that actually prevents two instances: it catches the case where two threads both passed the outer check before either acquired the lock.

### 2. Why might an enum singleton be a stronger interview answer than double-checked locking?

**Answer:** It shows you know the JVM already guarantees an enum constant is created exactly once, thread-safely, with zero hand-written locking and no chance of getting `volatile` or the double-check wrong. A simpler solution that's still fully correct is generally the stronger answer over a more complex one recited from memory.

### 3. What's the actual downside of singletons, beyond "they're an anti-pattern" as a slogan?

**Answer:** A singleton hides a dependency that would otherwise be visible and swappable through a constructor parameter — code that calls `getInstance()` internally can't easily be given a fake version for a unit test. It also concentrates shared mutable state in one place accessed from everywhere, which is exactly the kind of state that's easy to get wrong under concurrent access if it isn't carefully kept thread-safe.

### 4. Why choose Builder over a large constructor or a chain of setters?

**Answer:** A large constructor makes call sites unreadable — you can't tell which positional argument is which flag without checking the signature — and gets worse as optional fields are added (the telescoping constructor problem). A setter chain avoids that but leaves the object mutable and observable in a half-configured state at every point between the first setter call and the last. A builder makes every field assignment self-documenting by name, validates required fields in exactly one place (`build()`), and the object doesn't exist at all until it's fully and validly constructed.

**Follow-up:** What does Lombok's `@Builder` actually do? It generates the same static inner `Builder` class, the named setter-style methods, and a `build()` method — the same boilerplate shown above, just written for you.

### 5. What does the Factory pattern actually decouple, and why does that matter as a codebase grows?

**Answer:** It decouples "which concrete implementation is needed for a given type" from every place that needs one. Callers depend only on the interface (`PaymentProcessor`) and a type value, never on the concrete classes or the decision logic that picks between them. Adding a new implementation later means changing the factory in one place instead of finding and updating every scattered `new ConcreteClass()` call across checkout, refunds, admin tools, and anywhere else the decision was copy-pasted.

### 6. How does the Factory pattern relate to what Spring's dependency injection does automatically?

**Answer:** Dependency injection is essentially factory-pattern construction, automated by the framework. Spring decides which concrete bean implementation satisfies a given interface and hands it to whoever declared a need for it in their constructor — the same decision a hand-written factory method makes based on a type parameter, just performed by the container for the whole app instead of by a method you write and maintain yourself.

### 7. Is Builder's immutability actually required, or just conventional?

**Answer:** Just conventional, but worth keeping. Nothing forces a builder to produce an immutable object — you could make the built class's fields non-final and mutable. The reason not to is that immutability is what actually removes the "observed half-built" bug: an immutable object that only comes into existence inside `build()`, fully populated, can never be read in an inconsistent state by anything holding a reference to it.

### 8. When is a singleton the wrong tool, even though "only one instance" sounds correct?

**Answer:** When the "one instance" requirement is really about a single logical instance *within a given scope* — one per request, one per test, one per user session — rather than one per entire running application. A hand-rolled singleton (static field, private constructor) gives you exactly one instance for the whole JVM process, which is too broad for those narrower cases and actively gets in the way of testing, since every test run shares the same static instance unless it's explicitly reset.

## Revision Checklist

- [ ] Explain, using `ConfigurationLoader`, why constructing something meant to be shared more than once is a real bug, not just wasteful.
- [ ] Write double-checked locking from memory and explain what each of the two `null` checks actually prevents.
- [ ] Explain why `volatile` is required on the instance field, in terms of instruction reordering and partially-constructed objects.
- [ ] Explain why an enum singleton is often the simpler, equally-correct real-world choice.
- [ ] Name the two real downsides of singletons: hidden/untestable dependencies, and shared mutable state.
- [ ] Explain the telescoping constructor problem and the half-built-object problem, using `Order`, before describing Builder itself.
- [ ] Build a `Builder` for a class with required and optional fields, validating in `build()`, and explain why the object can't be observed half-configured.
- [ ] Explain the scattered-`if`/`else`-copied-everywhere problem before describing Factory, using the `PaymentProcessor` example.
- [ ] Implement a `Factory` that returns the right implementation based on a type, and state precisely what it decouples.
- [ ] Connect the Factory pattern to what Spring's dependency injection automates, in your own words.
