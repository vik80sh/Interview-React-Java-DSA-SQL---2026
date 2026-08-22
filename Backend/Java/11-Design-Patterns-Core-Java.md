# Design Patterns in Core Java

These three patterns get asked about independently of any framework, because they solve problems that show up in plain Java before Spring ever enters the picture. (Spring's *own* internal use of these same patterns — proxies, `BeanFactory`, `JdbcTemplate` — is covered separately in the [AOP/Actuator/Microservices guide](../Backend/08-AOP-Actuator-Microservices.md#8-design-patterns-spring-uses-internally).)

## 1. Singleton — Exactly One Instance, Real Trade-Offs

Real use case: a single, shared configuration loader or connection-pool manager that must never accidentally be constructed twice.

```java
class ConfigurationLoader {
    private static volatile ConfigurationLoader instance; // volatile matters — see below
    private final Map<String, String> settings;

    private ConfigurationLoader() { // private constructor — nobody outside can call `new`
        this.settings = loadFromDisk();
    }

    public static ConfigurationLoader getInstance() {
        if (instance == null) {                         // first check (no lock) — fast path
            synchronized (ConfigurationLoader.class) {
                if (instance == null) {                  // second check (inside the lock)
                    instance = new ConfigurationLoader();
                }
            }
        }
        return instance;
    }
}
```

This is **double-checked locking**: checking `instance == null` before locking avoids paying the synchronization cost on every call once the instance exists; checking again *inside* the lock avoids two threads both passing the first check and constructing two instances. The `volatile` keyword here is not optional — without it, another thread could see a partially-constructed object due to instruction reordering (the reference gets assigned before the constructor has fully finished initializing fields), which is a genuinely subtle real bug this exact pattern is famous for.

**The simpler, usually-better real-world alternative** — an enum singleton:

```java
enum ConfigurationLoaderEnum {
    INSTANCE;

    private final Map<String, String> settings = loadFromDisk();

    Map<String, String> get() { return settings; }
}
```

The JVM guarantees an enum constant is instantiated exactly once, thread-safely, with no manual locking code at all — this is the version most experienced Java engineers actually reach for today, and a strong answer to "how would you implement a thread-safe singleton" is knowing this trade-off, not just reciting double-checked locking from memory.

**The trade-off worth naming out loud:** singletons are convenient but make unit testing harder (you can't easily swap in a test double for a hardcoded static instance) and hide a dependency that would otherwise be visible in a constructor. In a Spring application, a singleton-scoped bean (the framework's default scope) gives you the same "exactly one instance" guarantee without any of this hand-written locking — see [Bean scopes and proxies](../Backend/01-Spring-Boot-Fundamentals.md#bean-scopes-and-proxies) — which is exactly why hand-rolled singletons are rare inside a Spring codebase and far more common in plain-Java utility code.

## 2. Builder — Constructing a Complex Object With Many Optional Fields

Real use case: an `Order` with a handful of required fields and several optional ones — a multi-argument constructor here is unreadable, and a chain of setters leaves the object mutable and partially-constructed at every intermediate step.

```java
// The problem this solves: which boolean is which, here?
Order order = new Order(customerId, total, null, true, false, null, "STANDARD");
```

```java
class Order {
    private final Long customerId;
    private final BigDecimal total;
    private final String couponCode;   // optional
    private final boolean giftWrapped; // optional
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
            return new Order(this);
        }
    }
}

Order order = new Order.Builder()
    .customerId(42L)
    .total(new BigDecimal("199.99"))
    .giftWrapped(true)
    .build();
```

Every call is self-documenting (`giftWrapped(true)`, not a bare `true` in a 7-argument constructor call), optional fields simply aren't called, `build()` is the one place to validate required fields are actually set, and the resulting `Order` is fully immutable — nothing can partially construct it and leave it in a broken intermediate state. In real projects, Lombok's `@Builder` annotation generates exactly this boilerplate for you; understanding what it expands to is what the interview question is actually testing.

## 3. Factory — Creating the Right Implementation Without the Caller Deciding How

Real use case: creating the correct `PaymentProcessor` for a given payment method, without scattering `new CreditCardProcessor()` / `new UpiProcessor()` construction logic across every place that needs one.

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

PaymentProcessor processor = PaymentProcessorFactory.create(request.paymentType());
processor.process(request.amount());
```

The caller only knows `PaymentType` and the `PaymentProcessor` interface — it never needs to know the concrete class, and adding a new payment type later means changing the factory in one place instead of hunting down every `new SomeProcessor()` call site across the codebase. This is the plain-Java version of exactly the same idea behind Spring choosing a bean implementation for you via dependency injection — the factory pattern is what DI is automating at a framework level.

## Interview Questions and Answers

### 1. Why does the classic double-checked-locking singleton need `volatile` on the instance field?

**Answer:** Without `volatile`, another thread could observe the instance reference as non-null before the constructor has fully finished initializing its fields, due to instruction reordering — giving that thread a partially-constructed object. `volatile` establishes the happens-before relationship needed so a fully-initialized object is what other threads actually see.

### 2. Why might an enum singleton be a better answer than double-checked locking in a real interview?

**Answer:** It shows you know the JVM already guarantees thread-safe, exactly-once instantiation of enum constants — no manual locking, no `volatile`, no risk of getting the pattern subtly wrong. It's simpler, and simpler-but-still-correct is usually the stronger answer over reciting a more complex pattern from memory.

### 3. What's the actual downside of singletons, beyond "they're an anti-pattern" as a slogan?

**Answer:** They hide a dependency that would otherwise be visible and injectable through a constructor, which makes swapping in a test double for unit testing harder, and they introduce global shared mutable state if the singleton itself isn't carefully kept immutable or thread-safe internally.

### 4. Why choose the Builder pattern over a large constructor or a chain of setters?

**Answer:** A large constructor makes call sites unreadable (which positional argument is which boolean?) and a chain of setters leaves the object mutable and possibly only partially configured at any point in time. A builder makes every field assignment self-documenting by name, validates required fields in one place (`build()`), and produces a fully-formed immutable object at the end.

### 5. What does the Factory pattern actually decouple, and why does that matter as a codebase grows?

**Answer:** It decouples "which concrete implementation is needed" from every call site that needs one — the caller only depends on the interface and a type/key, not the concrete class. Adding a new implementation later means changing the factory in one place instead of finding and updating every scattered `new ConcreteClass()` call across the codebase.

### 6. How does the Factory pattern relate to what Spring's dependency injection does automatically?

**Answer:** Dependency injection is essentially factory-pattern construction automated by the framework — Spring decides which concrete bean implementation satisfies a given interface and hands it to whoever asked for it, the same way a hand-written factory method decides which concrete class to `new` up based on a type parameter, just without you writing the factory method yourself.

## Revision Checklist

- [ ] Implement double-checked-locking singleton correctly, including why `volatile` is required.
- [ ] Explain why an enum singleton is often the simpler, equally-correct real-world choice.
- [ ] Build a `Builder` for a class with required and optional fields, validating in `build()`.
- [ ] Implement a `Factory` that returns the right implementation based on a type, and explain what it decouples.
- [ ] Connect the Factory pattern to what Spring's dependency injection automates.
