# Java 8: Lambdas, Streams, and Optional

Java 8 is asked about in nearly every interview because it's the version that made functional-style code — filter, map, collect — the normal way to write everyday business logic like "get all active users' emails." Every example below uses a real DTO-shaped transformation, the kind you'd actually write in a service layer.

## 1. Lambda Expressions

```java
// Before Java 8 — an anonymous class just to pass a bit of behavior
Comparator<Order> byTotal = new Comparator<Order>() {
    public int compare(Order a, Order b) {
        return a.getTotal().compareTo(b.getTotal());
    }
};

// Java 8 — the same behavior, as a lambda
Comparator<Order> byTotalLambda = (a, b) -> a.getTotal().compareTo(b.getTotal());
```

Syntax: `(parameters) -> expression` or `(parameters) -> { statements; }`. A lambda is shorthand for implementing a **functional interface** — it needs somewhere to plug into, which is exactly Section 2.

## 2. Functional Interfaces

A functional interface has exactly **one** abstract method (it can still have `default`/`static` methods with bodies).

```java
@FunctionalInterface
interface DiscountRule {
    BigDecimal apply(BigDecimal price);
}

DiscountRule tenPercentOff = price -> price.multiply(new BigDecimal("0.9"));
```

The JDK ships the common shapes so you rarely need to declare your own:

| Interface | Signature | Real use |
|---|---|---|
| `Predicate<T>` | `T -> boolean` | `user -> user.isActive()` — a filter condition |
| `Function<T, R>` | `T -> R` | `user -> user.getEmail()` — a transformation |
| `Consumer<T>` | `T -> void` | `order -> auditLog.record(order)` — a side effect, no return value |
| `Supplier<T>` | `() -> T` | `() -> new Order()` — a lazy value/factory |
| `BiFunction<T, U, R>` | `(T, U) -> R` | `(price, qty) -> price.multiply(qty)` |

## 3. Method References — a Lambda That Just Calls an Existing Method

```java
users.forEach(System.out::println);           // instance method on the passed argument
users.stream().map(User::getEmail);            // instance method, "the object being processed"
list.stream().filter(Objects::nonNull);         // static method reference
Supplier<Order> factory = Order::new;           // constructor reference
```

Purely a shorthand — `User::getEmail` is exactly equivalent to `user -> user.getEmail()`, and either compiles to the same functional-interface implementation.

## 4. Stream API — the Real Everyday Use Case

A stream is a **pipeline for processing a collection's data**, not a data structure itself — it doesn't store anything, and it doesn't modify the source collection.

```java
List<User> users = repository.findAll();

List<String> activeUserEmails = users.stream()
    .filter(User::isActive)          // intermediate — keeps only matching elements, lazy
    .map(User::getEmail)             // intermediate — transforms each element
    .sorted()                        // intermediate — sorts what's left
    .collect(Collectors.toList());   // terminal — actually runs the whole pipeline, produces a result
```

This single pipeline replaces what used to be a loop with an `if`, a manual list, and manual sorting — and it reads in the same order it executes conceptually: filter, then map, then sort, then collect.

**Intermediate operations are lazy** — nothing in `filter`/`map`/`sorted` actually runs until a terminal operation (`collect`, `forEach`, `count`, `reduce`, ...) is called. This lets the stream fuse the whole pipeline into a single pass over the data instead of materializing an intermediate list at every step.

### `map()` vs `flatMap()` — one output per input vs one-to-many, flattened

```java
// map() — one Order in, one BigDecimal out
List<BigDecimal> totals = orders.stream()
    .map(Order::getTotal)
    .collect(Collectors.toList());

// flatMap() — one Order in, MANY OrderLines out, flattened into a single stream
List<OrderLine> allLines = orders.stream()
    .flatMap(order -> order.getLines().stream())
    .collect(Collectors.toList());
```

`flatMap` is the tool the moment your data is nested — a list of orders, each holding a list of lines, that you need to process as one flat stream of lines. Trying to do this with `map` alone would leave you with a `Stream<List<OrderLine>>` (a stream of lists) instead of a flat `Stream<OrderLine>`.

### `Collectors` — real aggregation, not just `toList()`

```java
// Group orders by status — a genuinely common real query: "show me all orders by status"
Map<OrderStatus, List<Order>> byStatus = orders.stream()
    .collect(Collectors.groupingBy(Order::getStatus));

// Sum revenue per customer
Map<Long, BigDecimal> revenuePerCustomer = orders.stream()
    .collect(Collectors.groupingBy(Order::getCustomerId,
             Collectors.reducing(BigDecimal.ZERO, Order::getTotal, BigDecimal::add)));

// Build a lookup map from a list — id -> DTO, exactly what a cache warm-up needs
Map<Long, UserResponse> usersById = users.stream()
    .collect(Collectors.toMap(User::getId, UserMapper::toResponse));

// Join into a single string, e.g. a CSV of SKUs for a log line
String skuList = order.getLines().stream()
    .map(OrderLine::getSku)
    .collect(Collectors.joining(", "));
```

### `reduce()` — combine everything into one value

```java
BigDecimal orderTotal = order.getLines().stream()
    .map(OrderLine::getAmount)
    .reduce(BigDecimal.ZERO, BigDecimal::add); // start at ZERO, combine pairwise with add
```

`reduce(identity, accumulator)` is the general-purpose tool behind `sum`/`count`/`max` — useful whenever the built-in collectors don't match your exact aggregation.

### Stream vs Collection — the one-line distinction

| | Collection | Stream |
|---|---|---|
| Purpose | Store data | Process data |
| Evaluation | Eager | Lazy (until a terminal op runs) |
| Reusable? | Yes | No — a stream is consumed once and done |
| Modifies source | Yes, if mutable | Never |

## 5. Optional — Making "This Might Not Exist" Explicit

```java
Optional<User> maybeUser = userRepository.findByEmail(email); // no user found -> empty Optional, not null

User user = maybeUser.orElseThrow(() -> new UserNotFoundException(email));

String displayName = maybeUser
    .map(User::getName)
    .orElse("Guest");
```

The point of `Optional` isn't "replace every `null`" — it's a return type that forces the caller to explicitly decide what happens when a value is absent, instead of silently risking `NullPointerException` three calls later, which is exactly the "unboxing a `null`" bug from the [Variables/DataTypes guide](02-Variables-DataTypes-Casting.md#4-autoboxing-unboxing-and-the-integer-cache-trap). Common real methods: `orElse(default)`, `orElseGet(supplier)` (lazy — only computes the fallback if actually needed), `orElseThrow(...)`, `map(...)`, `isPresent()`/`isEmpty()`. Avoid calling `Optional.get()` directly without checking presence first — that just relocates the null-check problem instead of solving it, and avoid using `Optional` as a field type or a method parameter type — it's designed for return values.

## 6. Default and Static Methods on Interfaces

```java
interface PaymentValidator {
    boolean isValid(BigDecimal amount);

    default boolean isValidAndPositive(BigDecimal amount) { // interfaces can now ship real behavior
        return amount.signum() > 0 && isValid(amount);
    }

    static PaymentValidator alwaysValid() { // a static factory living on the interface itself
        return amount -> true;
    }
}
```

Before Java 8, adding a new method to a published interface broke every existing implementation. `default` methods solved that: existing implementers keep compiling, and new implementers can override the default if they need different behavior. This is exactly the mechanism the standard library used to add `forEach()` to `Collection` and `stream()` to every collection type without breaking the entire ecosystem of pre-existing implementations.

## Interview Questions and Answers

### 1. What is a functional interface, and why does a lambda need one?

**Answer:** An interface with exactly one abstract method (it may still have `default`/`static` methods with bodies). A lambda has no type of its own — it's shorthand syntax for implementing that single abstract method, so the compiler needs a functional interface as the target type to know what the lambda is actually implementing.

### 2. `map()` vs `flatMap()` — give a real example of when you'd need `flatMap`.

**Answer:** `map()` transforms each element into exactly one output element. `flatMap()` transforms each element into a stream of elements and flattens all of those into one combined stream. Turning a `List<Order>` (each holding a `List<OrderLine>`) into one flat `Stream<OrderLine>` needs `flatMap` — `map` alone would leave you with a stream of lists, not a flat stream of lines.

### 3. Why are intermediate stream operations lazy, and why does that matter?

**Answer:** Nothing runs until a terminal operation is invoked, which lets the whole pipeline (filter, map, sorted, etc.) fuse into a single pass over the data instead of building a fully materialized intermediate list at every stage. It also means a stream with no terminal operation does nothing at all — a common "why didn't my filter run" confusion when someone forgets to call `collect()`/`forEach()`/similar.

### 4. What does `Collectors.groupingBy()` actually give you, with a real example?

**Answer:** A `Map` from a key function to the list of elements that share that key — e.g. `orders.stream().collect(Collectors.groupingBy(Order::getStatus))` produces a `Map<OrderStatus, List<Order>>`, exactly the shape needed to answer "show me all orders grouped by status" without hand-writing the grouping loop.

### 5. Why is `Optional` not "just a replacement for every `null`"?

**Answer:** Its real purpose is to make "this might be absent" an explicit part of a method's return type, forcing the caller to decide what happens in that case (`orElse`, `orElseThrow`, etc.) instead of silently risking a `NullPointerException` several calls downstream. Using it as a field or parameter type, or calling `.get()` without checking presence, just relocates the same null-handling problem rather than solving it.

### 6. Why did Java 8 add `default` methods to interfaces?

**Answer:** To let the standard library (and any interface) add new methods without breaking every class that already implements it — before Java 8, adding a method to a published interface was a breaking change for every implementer. `default` gives a body that existing implementers inherit automatically, while new implementers can still override it.

### 7. Stream vs Collection — what's the actual distinction an interviewer wants to hear?

**Answer:** A `Collection` stores data and is eagerly, repeatedly usable. A `Stream` processes data through a pipeline, evaluates lazily until a terminal operation runs, never modifies the source, and can only be consumed once — reusing an already-consumed stream throws `IllegalStateException`.

## Revision Checklist

- [ ] Explain what makes an interface "functional" and write a lambda against a custom one.
- [ ] Build a real filter → map → collect pipeline over a domain object, not toy strings.
- [ ] Explain `map()` vs `flatMap()` with a nested-collection example.
- [ ] Use `Collectors.groupingBy`, `toMap`, `joining`, and `reduce()` for real aggregation tasks.
- [ ] Explain what `Optional` actually solves, and its two real misuses (as a field/parameter, or unchecked `.get()`).
- [ ] Explain why `default` methods were added to interfaces in Java 8.
