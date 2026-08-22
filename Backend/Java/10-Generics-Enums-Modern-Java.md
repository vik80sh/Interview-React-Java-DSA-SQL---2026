# Generics, Enums, and Modern Java Features

Generics and enums are core-Java staples asked in almost every interview; records, sealed classes, and pattern matching are the newer features that show up once a role touches a Java 17+ codebase — increasingly common, and worth being fluent in even if your day-to-day code is still on an older version.

## 1. Generics — Type Safety Without Casting

Before generics, a collection held `Object`, and every read needed an unchecked cast that could fail at runtime:

```java
List list = new ArrayList();      // pre-generics style
list.add("hello");
list.add(42);                     // compiles fine — no type checking at all
String s = (String) list.get(1);  // ClassCastException at RUNTIME, not compile time
```

```java
List<String> names = new ArrayList<>(); // generics: the compiler enforces String, always
names.add("Vikash");
// names.add(42);                       // compile error — caught immediately, not in production
```

### A real generic type: the repository pattern

This is the exact pattern behind every Spring Data JPA repository interface from the [Database/JPA guide](../Backend/03-Database-JPA-Hibernate.md) — one generic interface, reused for every entity type:

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

`Repository<User, Long>` and `Repository<Order, UUID>` share the exact same interface with zero duplicated code — that's the whole point: write the contract once, parameterize the types.

### Bounded types and wildcards

```java
// Bounded type parameter — T must be a Number or a subtype
class PriceRange<T extends Number> {
    T min, max;
    boolean isWithin(T value) {
        return value.doubleValue() >= min.doubleValue() && value.doubleValue() <= max.doubleValue();
    }
}

// Wildcard: accept a list of any Number subtype, read-only
double sumAll(List<? extends Number> values) {
    double total = 0;
    for (Number n : values) total += n.doubleValue();
    return total;
}

// Wildcard: accept anything you can safely ADD an Integer into
void addDefaults(List<? super Integer> list) {
    list.add(0);
}
```

The memorable rule (**PECS** — Producer Extends, Consumer Super): use `? extends T` when you only **read** from the generic collection (it *produces* values for you), and `? super T` when you only **write into** it (it *consumes* values from you). Trying to `add()` to a `List<? extends Number>` is a compile error — the compiler can't know the list's *actual* element type is compatible with what you're trying to insert.

### Type erasure

At runtime, generic type information is erased — `List<String>` and `List<Integer>` are both just `List` in the compiled bytecode. This is why you can't write `new T()` inside a generic class, can't do `list instanceof List<String>`, and can't overload two methods that differ only by generic parameter (`process(List<String>)` vs `process(List<Integer>)` collide, since both erase to `process(List)`).

## 2. Enums — More Than a Named Constant List

```java
enum OrderStatus {
    PENDING, PAID, SHIPPED, CANCELLED
}
```

That's the basic form, but real enums usually carry data and behavior — a much stronger interview answer than "a list of constants":

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

An enum can even have **per-constant behavior**, useful for a real state machine like allowed order-status transitions:

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

Every enum implicitly extends `java.lang.Enum` (which is why an enum can't `extend` anything else, though it can `implement` interfaces), gets `values()` and `valueOf(String)` for free, and is safely usable in a `switch`. `EnumMap`/`EnumSet` are specialized, more memory-efficient collections for when your key or element type is an enum — worth knowing they exist as the "right tool" over a plain `HashMap<OrderStatus, ...>` when that's the whole key space.

## 3. `var` — Local Type Inference, Not Dynamic Typing

```java
var orders = new ArrayList<Order>(); // the compiler infers List<Order>... no, ArrayList<Order> — still fixed
var total = order.getTotal();        // infers BigDecimal
```

`var` is purely a compile-time convenience — the variable's type is fixed and fully checked at compile time, exactly as if you'd written it explicitly; Java has not become dynamically typed. It's local-variable-only (no fields, no method parameters, no return types), and best used when the right-hand side already makes the type obvious — `var user = new User(...)` is fine; `var result = someMethod()` where `someMethod`'s return type isn't obvious from the name just makes code harder to read.

## 4. Records — Real DTO Boilerplate, Gone

Compare this to the record examples used throughout the [Backend REST API guide](../Backend/02-REST-API-Design.md) — this is exactly what powers them:

```java
// Before records: a DTO needs a constructor, getters, equals(), hashCode(), and toString() —
// five things to write and keep in sync by hand for one piece of data.
class UserResponseOld {
    private final Long id;
    private final String name;
    UserResponseOld(Long id, String name) { this.id = id; this.name = name; }
    public Long getId() { return id; }
    public String getName() { return name; }
    // equals(), hashCode(), toString() omitted here — but you'd have to write them
}

// A record generates the constructor, accessors (id(), name() — no "get" prefix),
// equals(), hashCode(), and toString() automatically, from one line.
record UserResponse(Long id, String name) {}

UserResponse response = new UserResponse(1L, "Vikash");
response.id();   // 1
response.name(); // "Vikash"
```

A record is implicitly `final`, all fields are implicitly `private final`, and it's the ideal shape for an immutable DTO — exactly the kind of object that should never change after being built and returned from a service layer.

## 5. Sealed Classes — a Closed, Known Set of Subtypes

```java
sealed interface PaymentResult permits PaymentSuccess, PaymentFailure {}

record PaymentSuccess(String transactionId) implements PaymentResult {}
record PaymentFailure(String reason) implements PaymentResult {}
```

`sealed` restricts which classes are allowed to implement/extend it — listed explicitly via `permits` (or, if they're in the same file, inferred automatically). The real payoff is with pattern-matching `switch` (Section 6): the compiler *knows* there are exactly two possible subtypes, so it can verify a `switch` over them is exhaustive with no `default` branch needed — genuinely useful for a result type like this one, where "handle every possible outcome" is exactly the property you want the compiler to enforce.

## 6. Pattern Matching for `instanceof` and `switch`

```java
// Before: cast after the instanceof check, a redundant extra step
if (result instanceof PaymentSuccess) {
    PaymentSuccess success = (PaymentSuccess) result;
    log.info("Charged: {}", success.transactionId());
}

// Pattern matching for instanceof (Java 16+): the cast and the check happen together
if (result instanceof PaymentSuccess success) {
    log.info("Charged: {}", success.transactionId());
}

// Pattern matching for switch (Java 21+), combined with the sealed interface above:
String message = switch (result) {
    case PaymentSuccess success -> "Charged: " + success.transactionId();
    case PaymentFailure failure -> "Failed: " + failure.reason();
    // no default needed — the compiler knows these are the only two possible subtypes
};
```

## 7. Text Blocks — Multi-Line Strings Without Escaping Hell

```java
String query = """
    SELECT id, name, status
    FROM orders
    WHERE customer_id = ?
    """;
```

A real, practical win for embedded SQL, JSON payloads in tests, or any multi-line literal that used to be an unreadable chain of `"...\n" + "...\n"` concatenation with manual escaping.

## Interview Questions and Answers

### 1. What problem do generics actually solve, beyond "type safety" as a buzzword?

**Answer:** Before generics, a collection held raw `Object`, so putting the wrong type in compiled fine and only failed with `ClassCastException` at runtime, often far from where the mistake was made. Generics push that error to compile time and eliminate the manual cast on every read — the exact same `Repository<T, ID>` interface can also be written once and reused correctly for every entity type instead of duplicated per type.

### 2. Explain PECS — when do you use `? extends T` vs `? super T`?

**Answer:** "Producer Extends, Consumer Super." Use `? extends T` when you only read values out of the generic type (it produces values for you) — you can't safely add to it, since the compiler doesn't know the exact subtype. Use `? super T` when you only write values into it (it consumes values from you) — reading from it is unsafe beyond `Object`, since the compiler doesn't know exactly what supertype it holds.

### 3. What is type erasure, and what does it prevent you from doing?

**Answer:** Generic type parameters exist only at compile time; at runtime, `List<String>` and `List<Integer>` are both just `List`. This is why you can't instantiate a type parameter directly (`new T()`), can't check `instanceof List<String>`, and can't overload two methods whose signatures differ only by generic type argument.

### 4. Why write an enum with a constructor and fields instead of just plain constants?

**Answer:** A plain enum is just named constants; giving it fields (like a currency symbol and decimal places) and a constructor lets each constant carry its own real data and behavior, so calling code asks the enum constant itself instead of maintaining a separate lookup table or switch statement scattered elsewhere.

### 5. Is `var` a step toward dynamic typing in Java?

**Answer:** No — the type is still fully determined and checked at compile time from the right-hand side; `var` only saves you from writing it explicitly. It's restricted to local variables and works best when the inferred type is already obvious from context, not when it would hide meaningful type information from a reader.

### 6. What does a `record` actually generate for you, and why does that matter for DTOs?

**Answer:** A canonical constructor, accessor methods for each component, and correct `equals()`, `hashCode()`, and `toString()` implementations — all from one declaration line. For an immutable DTO (exactly the shape a REST response or a JPA projection needs), this removes the boilerplate that used to require hand-writing and keeping five separate pieces in sync.

### 7. What's the actual benefit of a `sealed` interface over a plain one, especially with pattern matching?

**Answer:** It restricts the complete set of permitted implementations, so the compiler can verify a pattern-matching `switch` over that type is exhaustive without requiring a `default` case. That's directly useful for a result type like `PaymentResult` — if a new subtype is ever added, every `switch` over it that isn't updated becomes a compile error instead of a silently-missed case at runtime.

## Revision Checklist

- [ ] Explain what generics prevent, with the pre-generics `ClassCastException` example.
- [ ] Apply PECS correctly to decide between `? extends T` and `? super T`.
- [ ] Explain type erasure and one concrete thing it prevents.
- [ ] Write an enum with fields, a constructor, and per-constant behavior for a real state machine.
- [ ] Explain what a `record` generates and why it fits DTOs, and what `sealed` + pattern-matching `switch` buys you together.
