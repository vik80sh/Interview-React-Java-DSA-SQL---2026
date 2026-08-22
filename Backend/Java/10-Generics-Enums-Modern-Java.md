# Generics, Enums, and Modern Java Features (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](../Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. The Problem: A Collection That Can Hold Anything — Including the Wrong Thing

Scenario: you're building a list of usernames. Before generics existed (pre-Java 5), a `List` had no idea what type of object it was supposed to hold — it just stored plain `Object`:

```java
List list = new ArrayList();      // pre-generics style — a list of "anything"
list.add("Vikash");
list.add(42);                     // compiles fine — nothing checks the type at all
String s = (String) list.get(1);  // ClassCastException at RUNTIME, not compile time
```

Walk through exactly what went wrong: `list.add(42)` compiled without complaint, because the list only ever promised to hold `Object`, and an `int` boxes into one just fine. The real mistake — an `Integer` slipping into what was meant to be a list of names — doesn't surface until some other piece of code, maybe far away in the codebase, reads that slot back out expecting a `String` and casts it. By then you're debugging a crash in production instead of catching a typo while writing the code.

This is exactly what **generics** answer: they let a class declare, up front, exactly what type it's built around, so the compiler enforces that type everywhere the class is used:

```java
List<String> names = new ArrayList<>(); // generics: the compiler enforces String, always
names.add("Vikash");
// names.add(42);                       // compile error — caught immediately, not in production
String first = names.get(0);            // no cast needed either — the compiler already knows the type
```

Two wins at once: the wrong type can no longer get in, and reading a value back out doesn't need a manual cast, because the compiler already knows what's in there.

### A real generic type: the repository pattern

Generics aren't just for `List`/`Map` — you write your own generic types the same way. This is the exact pattern behind every Spring Data repository interface from the [Database/JPA guide](../Springboot/03-Database-JPA-Hibernate.md): one generic interface, reused for every entity type instead of writing a near-identical interface per entity:

```java
interface Repository<T, ID> {
    Optional<T> findById(ID id);
    T save(T entity);
    void deleteById(ID id);
}

class InMemoryUserRepository implements Repository<User, Long> {
    private final Map<Long, User> store = new HashMap<>();

    public Optional<User> findById(Long id) { return Optional.ofNullable(store.get(id)); }
    public User save(User user) { store.put(user.getId(), user); return user; }
    public void deleteById(Long id) { store.remove(id); }
}
```

`Repository<User, Long>` and `Repository<Order, UUID>` share the exact same interface with zero duplicated code — that's the whole point of a generic type: write the contract once, and let the caller decide which concrete types `T` and `ID` become.

### Bounded types: restricting what a type parameter is allowed to be

Scenario: you want a `PriceRange<T>` that can check whether a value falls between a `min` and `max`, calling `.doubleValue()` to compare them:

```java
class PriceRange<T> {
    T min, max;
    boolean isWithin(T value) {
        return value.doubleValue() >= min.doubleValue() && value.doubleValue() <= max.doubleValue(); // compile error
    }
}
```

This doesn't compile — plain `T` could be a `String`, a `User`, literally anything, and none of those have a `.doubleValue()` method. The compiler has no way to know `T` supports that call.

This is what a **bounded type parameter** answers: restrict `T` to only the types that actually support what the class needs to do with it.

```java
class PriceRange<T extends Number> {   // T must be a Number or a subtype (Integer, Double, BigDecimal, ...)
    T min, max;
    boolean isWithin(T value) {
        return value.doubleValue() >= min.doubleValue() && value.doubleValue() <= max.doubleValue();
    }
}
```

Now the compiler knows every possible `T` has `.doubleValue()`, because `Number` guarantees it — the bound is a promise the class can rely on.

### Wildcards: when the generic type itself needs to flex

Scenario: you write a method to total up a list of prices:

```java
double sumAll(List<Number> values) {
    double total = 0;
    for (Number n : values) total += n.doubleValue();
    return total;
}
```

Looks fine — until you try to call it with a `List<Integer>`:

```java
List<Integer> quantities = List.of(1, 2, 3);
sumAll(quantities); // compile error: List<Integer> cannot be converted to List<Number>
```

This trips up almost everyone the first time: an `Integer` *is* a `Number`, so why isn't a `List<Integer>` a `List<Number>`? Because Java generics are **invariant** — the compiler refuses to treat `List<Integer>` as a `List<Number>`, because if it allowed that, code could then call `values.add(3.14)` on what's secretly backed by an `Integer`-only list somewhere else, corrupting it at runtime with no warning.

This is exactly what a **wildcard** answers: it tells the compiler what you actually intend to do with the list — read from it, or write into it — instead of demanding an exact type match.

```java
// Wildcard: accept a list of any Number subtype, but only READ from it
double sumAll(List<? extends Number> values) {
    double total = 0;
    for (Number n : values) total += n.doubleValue();
    return total;
}
sumAll(quantities);   // now compiles — List<Integer> matches List<? extends Number>

// Wildcard: accept anything you can safely ADD an Integer into
void addDefaults(List<? super Integer> list) {
    list.add(0);
}
```

The memorable rule (**PECS** — Producer Extends, Consumer Super): use `? extends T` when you only **read** from the generic collection (it *produces* values for you), and `? super T` when you only **write into** it (it *consumes* values from you). Trying to call `.add()` on a `List<? extends Number>` is a compile error — the compiler genuinely doesn't know the list's *actual* element type is compatible with what you're trying to insert, so it refuses rather than risk corrupting it.

### Type erasure: why some "obviously fine" generic code doesn't compile

Scenario: you try to overload a method for two different generic types, the same way you'd overload for `String` versus `int`:

```java
void process(List<String> names) { ... }
void process(List<Integer> ids) { ... }   // compile error: same erasure as process(List<String>)
```

This looks like ordinary overloading with two different parameter types, but it fails with "process(List<Integer>) has the same erasure as process(List<String>)." The reason is **type erasure**: generic type information exists only at compile time, purely so the compiler can check your code. Once compiled, `List<String>` and `List<Integer>` are both just `List` in the actual bytecode — the Java Virtual Machine (JVM) never sees the difference at runtime.

Erasure is also why you can't write `new T()` inside a generic class (the JVM has no idea what real type `T` erased from), can't check `list instanceof List<String>` (only `instanceof List` compiles — the element type is gone by then), and, as just shown, can't overload two methods that differ only in their generic type argument.

## 2. The Problem: Magic Constants

Scenario: modeling a status field with plain `int` constants, a very common pattern before (or without) enums:

```java
public static final int STATUS_PENDING = 0;
public static final int STATUS_PAID = 1;
public static final int STATUS_SHIPPED = 2;
public static final int STATUS_CANCELLED = 3;

void ship(int status) {
    if (status == STATUS_PAID) { /* ... */ }
}
```

This has real problems: `ship(99)` compiles fine even though 99 means nothing; a constant meant for a totally different group of statuses (say, `PAYMENT_FAILED = 1` defined somewhere else) can be passed in by mistake and the compiler has no way to catch it, since both are just plain `int`s; printing `status` gives a meaningless number instead of a readable name; and there's no built-in way to ask "give me every possible status" to loop over.

This is exactly what an **enum** answers: a fixed, named, type-safe set of constants that the compiler treats as its own distinct type:

```java
enum OrderStatus {
    PENDING, PAID, SHIPPED, CANCELLED
}

void ship(OrderStatus status) { /* ... */ }
// ship(99);            // doesn't even compile — 99 isn't an OrderStatus
// ship(Currency.USD);  // doesn't compile either — wrong enum type entirely, caught immediately
```

### Enums with real data and behavior

That basic form is just named constants — a real enum usually carries data and behavior too, which is a much stronger interview answer than "a list of constants":

```java
enum Currency {
    USD("$", 2),
    JPY("¥", 0),
    INR("₹", 2);

    private final String symbol;
    private final int decimalPlaces;

    Currency(String symbol, int decimalPlaces) { // enum constructors are always private
        this.symbol = symbol;
        this.decimalPlaces = decimalPlaces;
    }

    String format(BigDecimal amount) {
        return symbol + amount.setScale(decimalPlaces, RoundingMode.HALF_UP);
    }
}

Currency.JPY.format(new BigDecimal("1500")); // "¥1500" — JPY has no decimal places
```

Each constant now carries its own real data (a symbol, a decimal-place count) and behavior (`format`), so calling code just asks the constant itself instead of maintaining a separate lookup table or `switch` scattered across the codebase.

### Per-constant behavior: a real state machine

An enum can go one step further and give **each constant its own implementation** of a method — genuinely useful for something like allowed order-status transitions, where the rule for "what can this become next" is different for every constant:

```java
enum OrderStatus {
    PENDING {
        public boolean canTransitionTo(OrderStatus next) { return next == PAID || next == CANCELLED; }
    },
    PAID {
        public boolean canTransitionTo(OrderStatus next) { return next == SHIPPED; }
    },
    SHIPPED {
        public boolean canTransitionTo(OrderStatus next) { return false; }
    },
    CANCELLED {
        public boolean canTransitionTo(OrderStatus next) { return false; }
    };

    public abstract boolean canTransitionTo(OrderStatus next);
}
```

Every enum implicitly extends `java.lang.Enum` (which is why an enum can't `extend` another class, though it can `implement` interfaces), gets `values()` and `valueOf(String)` for free, and is safely usable in a `switch`. `EnumMap`/`EnumSet` are specialized, more memory-efficient collections for when your key or element type is an enum — worth knowing they exist as the "right tool" over a plain `HashMap<OrderStatus, ...>` when that enum is the whole key space; internally they're backed by an array indexed by the constant's declaration order, instead of a general-purpose hash table.

### Enums as the safest way to write a Singleton

Scenario: you need exactly one shared instance of something app-wide — say a `ConfigurationLoader` that reads settings from disk once. The classic hand-written way to guarantee "only one instance ever exists":

```java
public class ConfigurationLoader {
    private static ConfigurationLoader instance;
    private ConfigurationLoader() { /* loads settings from disk */ }

    public static ConfigurationLoader getInstance() {
        if (instance == null) {
            instance = new ConfigurationLoader();   // race condition under concurrent access
        }
        return instance;
    }
}
```

This looks reasonable, but it has three real, well-known problems: under concurrent access, two threads can both check `instance == null`, both see `true`, and both construct their own separate instance before either assignment happens — fixing that properly needs a `synchronized` block or double-checked locking, both easy to get subtly wrong. A private constructor doesn't actually stop **reflection** from calling it anyway (`constructor.setAccessible(true); constructor.newInstance();` bypasses `private` entirely). And if the class ever implements `Serializable`, deserializing a saved copy of it can silently produce a *second* instance, unless you remember to add a `readResolve()` method.

This is exactly what an **enum-based singleton** answers — the identical one-instance guarantee, with none of the hand-written pitfalls:

```java
enum ConfigurationLoader {
    INSTANCE;

    private final Properties settings = loadFromDisk();

    public String get(String key) { return settings.getProperty(key); }
}

ConfigurationLoader.INSTANCE.get("app.name");
```

The JVM itself guarantees an enum constant is constructed exactly once, and that guarantee holds under concurrent class loading with no `synchronized` block for you to write or get wrong. Reflection can't construct a second instance either — the language specifically forbids invoking an enum's constructor reflectively. And serialization of an enum is handled specially by the JVM: it serializes only the constant's name and resolves it back to that exact same singleton constant on the other end, so there's no `readResolve()` to remember. This is the reason Joshua Bloch's *Effective Java* recommends a single-element enum as the best way to implement a singleton in Java.

## 3. `var` — Local Type Inference, Not Dynamic Typing

Scenario: declaring a variable with a long generic type means writing that type out twice — once for the declaration, once for the constructor:

```java
Map<String, List<OrderStatus>> statusesByRegion = new HashMap<String, List<OrderStatus>>();
```

The repetition adds nothing — the right-hand side already says exactly what type this is, so the compiler could work out the left-hand side's type on its own.

This is what **`var`** answers — local type inference: the compiler infers the type from the right-hand side, so you don't type it twice:

```java
var orders = new ArrayList<Order>(); // the compiler infers ArrayList<Order> — still a fixed, checked type
var total = order.getTotal();        // infers BigDecimal
```

`var` is purely a compile-time convenience — the variable's type is fixed and fully checked at compile time, exactly as if you'd written it explicitly; Java has not become dynamically typed. It's local-variable-only (no fields, no method parameters, no return types), and best used when the right-hand side already makes the type obvious — `var user = new User(...)` is fine; `var result = someMethod()` where `someMethod`'s return type isn't obvious from the name just makes code harder to read.

## 4. Records — Real DTO Boilerplate, Gone

Scenario: a Data Transfer Object (DTO) — a plain class shaped for an API response — needs a constructor, accessor methods, `equals()`, `hashCode()`, and `toString()`. For one piece of data, that's five things to write and keep in sync by hand, every single time:

```java
// Before records: five things to write and keep in sync for one piece of data.
class UserResponseOld {
    private final Long id;
    private final String name;

    UserResponseOld(Long id, String name) {
        this.id = id;
        this.name = name;
    }

    public Long getId() { return id; }
    public String getName() { return name; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserResponseOld)) return false;
        UserResponseOld other = (UserResponseOld) o;
        return Objects.equals(id, other.id) && Objects.equals(name, other.name);
    }

    @Override
    public int hashCode() { return Objects.hash(id, name); }

    @Override
    public String toString() { return "UserResponseOld{id=" + id + ", name='" + name + "'}"; }
}
```

Every field added here means editing the constructor, both accessors, `equals()`, `hashCode()`, and `toString()` — five separate places to forget to update, and a classic source of bugs (an `equals()` that forgets a newly-added field is a very real, very common mistake).

This is exactly what a **record** answers: from one line, it generates the constructor, an accessor per component, and correct `equals()`, `hashCode()`, and `toString()` implementations, all automatically. This is the same shape used throughout the [REST API guide](../Springboot/02-REST-API-Design.md) for every request and response type:

```java
record UserResponse(Long id, String name) {}

UserResponse response = new UserResponse(1L, "Vikash");
response.id();   // 1
response.name();  // "Vikash" — accessors are named after the component, no "get" prefix
```

A record is implicitly `final`, all of its fields are implicitly `private final`, and it's the ideal shape for an immutable DTO — exactly the kind of object that should never change after being built and returned from a service layer.

## 5. Sealed Classes — a Closed, Known Set of Subtypes

Scenario: `PaymentResult` is an interface with two implementations, `PaymentSuccess` and `PaymentFailure`. As a plain interface, nothing stops a third class somewhere else in a large codebase from also implementing `PaymentResult` — and nothing stops an `if`/`else` chain (or a `switch`) handling every `PaymentResult` from silently missing that new case when it shows up, since the compiler has no idea the interface was ever meant to be limited to just those two.

This is exactly what a **sealed** type answers: it restricts, explicitly, which classes are allowed to implement or extend it:

```java
sealed interface PaymentResult permits PaymentSuccess, PaymentFailure {}

record PaymentSuccess(String transactionId) implements PaymentResult {}
record PaymentFailure(String reason) implements PaymentResult {}
```

The `permits` clause lists every allowed subtype explicitly (or, if they're all in the same file, the compiler infers the list automatically). The real payoff shows up with pattern-matching `switch` in the next section: because the compiler *knows* there are exactly two possible subtypes, it can verify a `switch` over `PaymentResult` is exhaustive with no `default` branch needed — genuinely valuable for a result type like this one, where "handle every possible outcome" is exactly the property you want the compiler to enforce, not just hope a developer remembers.

## 6. Pattern Matching for `instanceof` and `switch`

Scenario: handling a `PaymentResult` the traditional way means checking the type, then casting it separately as a second, redundant step:

```java
// Before: cast after the instanceof check, a redundant extra step
if (result instanceof PaymentSuccess) {
    PaymentSuccess success = (PaymentSuccess) result;   // we just proved this — why type it again?
    log.info("Charged: {}", success.transactionId());
}
```

This is exactly what **pattern matching** answers: the check and the cast happen together, in one step, and the compiler introduces the cast variable for you:

```java
// Pattern matching for instanceof (Java 16+): the cast and the check happen together
if (result instanceof PaymentSuccess success) {
    log.info("Charged: {}", success.transactionId());
}
```

The same idea extends to `switch`, and combines directly with the sealed interface from the previous section:

```java
// Pattern matching for switch (Java 21+), combined with the sealed interface above:
String message = switch (result) {
    case PaymentSuccess success -> "Charged: " + success.transactionId();
    case PaymentFailure failure -> "Failed: " + failure.reason();
    // no default needed — the compiler knows these are the only two possible subtypes
};
```

Because `PaymentResult` is `sealed` with exactly two `permits`-listed subtypes, the compiler can prove this `switch` is exhaustive on its own — if a third subtype is ever added later, every `switch` over `PaymentResult` that wasn't updated becomes a compile error, not a silently-missed case discovered in production.

## 7. Text Blocks — Multi-Line Strings Without Escaping Hell

Scenario: embedding a multi-line SQL query as a Java string, the old way, means manually gluing lines together with `\n` and `+`:

```java
String query = "SELECT id, name, status\n" +
               "FROM orders\n" +
               "WHERE customer_id = ?\n";
```

Forget one `\n`, misplace a `+`, or add a line without matching the existing indentation style, and the query silently breaks or becomes unreadable — and it's genuinely hard to visually verify a multi-line string built this way is even correct SQL at a glance.

This is exactly what a **text block** answers — a multi-line string literal written the way it actually looks:

```java
String query = """
    SELECT id, name, status
    FROM orders
    WHERE customer_id = ?
    """;
```

No `\n`, no `+` concatenation, no manual escaping — the triple-quote `"""` opens and closes the block, and the content in between is the string, with Java automatically stripping the common leading indentation. A real, practical win for embedded SQL, JSON payloads in tests, or any multi-line literal that used to be an unreadable chain of concatenated, escaped fragments.

## Interview Questions and Answers

### 1. What problem do generics actually solve, beyond "type safety" as a buzzword?

**Answer:** Before generics, a collection held raw `Object`, so putting the wrong type in compiled fine and only failed with `ClassCastException` at runtime, often far from where the mistake was made. Generics push that error to compile time and eliminate the manual cast on every read — the exact same `Repository<T, ID>` interface can also be written once and reused correctly for every entity type instead of duplicated per type.

### 2. Explain PECS — when do you use `? extends T` vs `? super T`?

**Answer:** "Producer Extends, Consumer Super." Use `? extends T` when you only read values out of the generic type (it produces values for you) — you can't safely add to it, since the compiler doesn't know the exact subtype. Use `? super T` when you only write values into it (it consumes values from you) — reading from it is unsafe beyond `Object`, since the compiler doesn't know exactly what supertype it holds.

### 3. What is type erasure, and what does it prevent you from doing?

**Answer:** Generic type parameters exist only at compile time, purely for the compiler's own checking; at runtime, `List<String>` and `List<Integer>` are both just `List`. This is why you can't instantiate a type parameter directly (`new T()`), can't check `instanceof List<String>`, and can't overload two methods whose signatures differ only by generic type argument.

### 4. Why write an enum with a constructor and fields instead of just plain constants?

**Answer:** A plain enum is just named constants; giving it fields (like a currency symbol and decimal places) and a constructor lets each constant carry its own real data and behavior, so calling code asks the enum constant itself instead of maintaining a separate lookup table or switch statement scattered elsewhere.

### 5. Why is a single-element enum considered the safest way to implement a Singleton in Java?

**Answer:** A hand-written singleton has three real failure modes: a race condition if `getInstance()` isn't properly synchronized, reflection bypassing the private constructor to build a second instance, and deserialization silently creating another instance without a `readResolve()`. The JVM guarantees an enum constant is constructed exactly once, forbids reflective construction of enum constructors, and handles enum serialization specially so it always resolves back to the same constant — closing all three holes without any code the developer has to get right.

**Follow-up:** Why can't a hand-written singleton just declare its constructor `private` and call it done? Because `private` only stops normal `new` calls at compile time — reflection (`setAccessible(true)`) can still invoke a private constructor directly at runtime, so `private` alone isn't a real guarantee of "exactly one instance."

### 6. Is `var` a step toward dynamic typing in Java?

**Answer:** No — the type is still fully determined and checked at compile time from the right-hand side; `var` only saves you from writing it explicitly. It's restricted to local variables and works best when the inferred type is already obvious from context, not when it would hide meaningful type information from a reader.

### 7. What does a `record` actually generate for you, and why does that matter for DTOs?

**Answer:** A canonical constructor, accessor methods for each component, and correct `equals()`, `hashCode()`, and `toString()` implementations — all from one declaration line. For an immutable DTO (exactly the shape a REST response or a JPA projection needs), this removes the boilerplate that used to require hand-writing and keeping five separate pieces in sync, and it removes a classic bug source: an `equals()` or `hashCode()` that quietly falls out of sync after a field is added.

### 8. What's the actual benefit of a `sealed` interface over a plain one, especially with pattern matching?

**Answer:** It restricts the complete set of permitted implementations, so the compiler can verify a pattern-matching `switch` over that type is exhaustive without requiring a `default` case. That's directly useful for a result type like `PaymentResult` — if a new subtype is ever added, every `switch` over it that isn't updated becomes a compile error instead of a silently-missed case at runtime.

### 9. Why reach for `EnumMap`/`EnumSet` instead of a plain `HashMap`/`HashSet` when the key or element type is an enum?

**Answer:** `EnumMap`/`EnumSet` are backed internally by a plain array indexed by each constant's declaration order, instead of a general-purpose hash table — so they're more memory-efficient and faster for exactly this one case. They're the "right tool" specifically when the key space is an enum's full set of constants; for any other key type, a regular `HashMap`/`HashSet` is still the normal choice.

## Revision Checklist

- [ ] Explain what generics prevent, with the pre-generics `ClassCastException` example.
- [ ] Explain a bounded type parameter (`T extends Number`) and why plain `T` wasn't enough.
- [ ] Apply PECS correctly to decide between `? extends T` and `? super T`, using the `List<Integer>`-isn't-a-`List<Number>` surprise as the motivating example.
- [ ] Explain type erasure and one concrete thing it prevents.
- [ ] Explain why plain `int`/`String` constants are a real problem, and how an enum fixes it.
- [ ] Write an enum with fields, a constructor, and per-constant behavior for a real state machine.
- [ ] Explain the three failure modes of a hand-written singleton, and why a single-element enum closes all three.
- [ ] Explain what a `record` generates and why it fits DTOs, and what `sealed` + pattern-matching `switch` buys you together.
- [ ] Explain when `EnumMap`/`EnumSet` beat a plain `HashMap`/`HashSet`.
