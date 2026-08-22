# Java 8: Lambdas, Streams, and Optional (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](../Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. The Problem: Loops, Null Checks, and Boilerplate Everywhere

Say you're building an order-processing service. Two completely ordinary requirements show up on day one, and both look fine written the "normal" pre-Java-8 way — until you look closely.

**Requirement one: "give me the emails of all active users."**

```java
List<User> users = repository.findAll();
List<String> activeUserEmails = new ArrayList<>();
for (User user : users) {
    if (user.isActive()) {
        activeUserEmails.add(user.getEmail());
    }
}
Collections.sort(activeUserEmails);
```

Nothing here is *wrong*. But notice what you actually had to write to express one sentence of business intent ("active users' emails, sorted"): declare an empty list, loop, branch on a condition, mutate the list, then separately sort it. The *intent* — filter, then transform, then sort — is buried inside four lines of bookkeeping that have nothing to do with users or emails; they're the same four lines you'd write for filtering orders, products, or anything else.

**Requirement two: "look up a user by email, and use their display name."**

```java
User user = userRepository.findByEmail(email);   // returns null if nobody matches
String displayName = user.getName();              // NullPointerException if email didn't match
```

This compiles and runs fine — right up until someone searches for an email that doesn't exist, `findByEmail` returns `null`, and `.getName()` blows up with a `NullPointerException` (NPE). The signature `User findByEmail(String email)` gives you no hint at all that `null` is a possible outcome — you only find out by reading the method's implementation, or by getting paged when it crashes in production. Nothing in the *type* `User` warns the caller "this might not actually be there."

**A third, smaller but related annoyance: passing a bit of behavior around.** Say you need to sort orders by total instead of by whatever `Order`'s natural order is:

```java
Comparator<Order> byTotal = new Comparator<Order>() {
    public int compare(Order a, Order b) {
        return a.getTotal().compareTo(b.getTotal());
    }
};
Collections.sort(orders, byTotal);
```

You wanted to express one idea — "compare two orders by their total" — and it took a whole anonymous class declaration, with a method name and parameter types you have to write out in full, to say it.

Three different symptoms, but they share one root cause: **Java before version 8 had no lightweight way to say "here's a small piece of behavior" or "this value might be absent."** Everything had to be spelled out as a full loop, a full class, or a value you just hoped wasn't `null`. Java 8 is the release that fixed exactly this — lambdas and streams replace requirement one and the comparator example, and `Optional` replaces requirement two. The rest of this file builds each of those up from here, in order.

## 2. Lambda Expressions: Shorter Syntax for "a Little Bit of Behavior"

Go back to the `Comparator` from section 1. The anonymous class had exactly one thing that actually mattered — the single line `a.getTotal().compareTo(b.getTotal())` — buried inside a method signature, a class body, and braces that exist purely because Java requires a full class to hand over one method's worth of behavior.

A **lambda expression** strips away everything that isn't that one meaningful line:

```java
// Before Java 8 — an anonymous class just to pass a bit of behavior
Comparator<Order> byTotal = new Comparator<Order>() {
    public int compare(Order a, Order b) {
        return a.getTotal().compareTo(b.getTotal());
    }
};

// Java 8 — the exact same behavior, as a lambda
Comparator<Order> byTotalLambda = (a, b) -> a.getTotal().compareTo(b.getTotal());
```

Same two parameters, same comparison, same result — just without re-declaring the method name (`compare`), the parameter types (the compiler already knows `a` and `b` are `Order`, from `Comparator<Order>`), or the class boilerplate around it. The syntax is `(parameters) -> expression`, or `(parameters) -> { statement; statement; }` when you need more than one line.

A lambda on its own doesn't have a "type" the way a class does — it's shorthand for implementing *some* interface's single method, but which interface isn't visible from the lambda's syntax alone. `Collections.sort(orders, byTotalLambda)` only compiles because the compiler already knows the second parameter must be a `Comparator<Order>`, so it treats the lambda as an implementation of `Comparator.compare(Order, Order)`. That "some interface with exactly one method" idea has a name, and it's the very next thing worth pinning down, because every lambda you'll ever write needs one to plug into.

## 3. Functional Interfaces: What a Lambda Actually Plugs Into

An interface with **exactly one abstract method** is called a **functional interface** — `Comparator` qualifies (`compare` is its one abstract method; it happens to also have some `default` methods, which is still allowed and covered in section 11). You can declare your own:

```java
@FunctionalInterface
interface DiscountRule {
    BigDecimal apply(BigDecimal price);
}

DiscountRule tenPercentOff = price -> price.multiply(new BigDecimal("0.9"));
```

`@FunctionalInterface` isn't required for any of this to work — it's a compile-time check that stops you from accidentally adding a second abstract method later, which would break every lambda already written against that interface.

In practice, you rarely declare your own functional interface, because the JDK (Java Development Kit) already ships the common shapes as ready-made interfaces in `java.util.function`:

| Interface | Signature | Real use |
|---|---|---|
| `Predicate<T>` | `T -> boolean` | `user -> user.isActive()` — a filter condition |
| `Function<T, R>` | `T -> R` | `user -> user.getEmail()` — a transformation |
| `Consumer<T>` | `T -> void` | `order -> auditLog.record(order)` — a side effect, no return value |
| `Supplier<T>` | `() -> T` | `() -> new Order()` — a lazy value/factory |
| `BiFunction<T, U, R>` | `(T, U) -> R` | `(price, qty) -> price.multiply(qty)` |

Every one of these is just "an interface with one abstract method," named for the *shape* of that method rather than any specific business meaning — that's exactly why they're reusable across completely unrelated domains (users, orders, prices) instead of needing a new interface declared per use case. Section 5 leans on `Predicate` and `Function` heavily — they're what `filter` and `map` actually take as arguments.

## 4. Method References: A Lambda That Just Calls an Existing Method

A huge fraction of lambdas you end up writing look like `x -> x.someMethod()` — take the argument, immediately call one existing method on it, nothing else. Writing that out in full is redundant once you notice the pattern, so Java gives it a shorter form: the **method reference**.

```java
users.forEach(System.out::println);            // instance method on the passed argument
users.stream().map(User::getEmail);             // instance method, "the object being processed"
list.stream().filter(Objects::nonNull);          // static method reference
Supplier<Order> factory = Order::new;            // constructor reference
```

`User::getEmail` means exactly the same thing as `user -> user.getEmail()`, and compiles to the same functional-interface implementation — it's purely a shorthand for "a lambda whose entire body is calling this one existing method," not a different mechanism. Reach for it whenever a lambda would do nothing but forward its argument straight into a method call; write the full lambda whenever you actually need to compute something first.

## 5. The Stream API: Turning the Loop From Section 1 Into a Pipeline

Now return to requirement one from section 1 — active users' emails, sorted:

```java
List<User> users = repository.findAll();
List<String> activeUserEmails = new ArrayList<>();
for (User user : users) {
    if (user.isActive()) {
        activeUserEmails.add(user.getEmail());
    }
}
Collections.sort(activeUserEmails);
```

The problem, again: four lines of *mechanics* (declare a list, loop, mutate, sort) surrounding one line of *actual intent* (filter, transform). With lambdas now available as a way to pass around "the condition" and "the transformation," Java 8 added a way to chain them directly against a collection's data, without the surrounding loop scaffolding at all:

```java
List<User> users = repository.findAll();

List<String> activeUserEmails = users.stream()
    .filter(User::isActive)          // keep only active users
    .map(User::getEmail)             // turn each remaining User into its email
    .sorted()                        // sort what's left
    .collect(Collectors.toList());   // produce the final List<String>
```

Read left to right, this *is* the sentence "active users' emails, sorted" — filter, then map, then sort, then collect — with no list to declare by hand, no manual mutation, and no separate sort call afterward. `.stream()` is what turns the `List<User>` into this pipeline in the first place.

A **stream** is a pipeline for processing a collection's data — it is deliberately *not* a data structure itself: it doesn't store any elements of its own, and running a pipeline never modifies the original `users` list. Each step in the chain is one of two kinds:

- **Intermediate operations** (`filter`, `map`, `sorted`) describe a transformation but don't run anything by themselves — they return another stream, ready for the next step.
- **Terminal operations** (`collect`, `forEach`, `count`, `reduce`, and others covered below) are what actually walk the data and produce a real result — a `List`, a `Map`, a single number, whatever the terminal operation is.

Here's the part that trips people up the first time: **intermediate operations are lazy**. Nothing in `filter`/`map`/`sorted` executes the moment you write that line — the whole chain just builds up a description of work to do. Only when a terminal operation like `.collect(...)` is called does the stream actually walk the underlying data, and it does so in a single pass, running `filter`, then `map`, then `sorted`'s comparison logic element by element, rather than building a fully materialized intermediate list at every stage. One direct, practical consequence: a pipeline with `.filter(...).map(...)` and *no* terminal operation at the end does nothing at all when it runs — a common real "why isn't my filter doing anything" bug is simply forgetting to call `.collect()`/`.forEach()`/similar.

### `map()` vs `flatMap()` — one output per input, versus one-to-many flattened

`map()` from the pipeline above turns each element into exactly one other element — one `User` becomes one `String`. But real data is often nested: a list of orders, where each order itself holds a list of order lines.

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

If you tried to reach for plain `map` on the nested case — `orders.stream().map(order -> order.getLines())` — you'd end up with a `Stream<List<OrderLine>>`: a stream where each element is itself a whole list. That's rarely what you want; you usually want one flat stream of every line across every order, so you can `filter`/`sum`/`collect` over lines directly. `flatMap` is exactly the tool for "each input produces several outputs, and I want them combined into one flat stream" — it takes the little stream produced for each order (`order.getLines().stream()`) and merges all of them together.

### `Collectors` — real aggregation, not just building a list

`Collectors.toList()` is the simplest terminal collector, but the same `.collect(...)` step handles far more useful real-world aggregation:

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

`groupingBy` alone (first example) buckets elements into a `Map` keyed by whatever function you give it, with each bucket holding the matching elements as a `List` — a hand-written version of this would be a `Map`, a loop, and a `computeIfAbsent`/`add` pair; `groupingBy` is that whole pattern in one call. `groupingBy` combined with a second collector (second example) lets you replace "list of matches" with "some aggregate of the matches" — here, a running sum per customer instead of the raw list of their orders. `toMap` (third example) is the direct tool for "turn a list into an id-keyed lookup," a pattern that shows up constantly when you need O(1) (constant-time) access into a batch you already fetched instead of scanning the list repeatedly. `joining` (fourth example) is string concatenation with a separator, built in instead of hand-rolled with a `StringBuilder` and a manual "don't add a comma after the last one" check.

### `reduce()` — combine everything into one value

```java
BigDecimal orderTotal = order.getLines().stream()
    .map(OrderLine::getAmount)
    .reduce(BigDecimal.ZERO, BigDecimal::add); // start at ZERO, combine pairwise with add
```

`reduce(identity, accumulator)` walks the stream, starting from `identity` (here `BigDecimal.ZERO`), and repeatedly combines the running result with the next element using the given function (here `BigDecimal::add`). It's the general-purpose mechanism that things like `sum`, `count`, and `max` are themselves built on — reach for it directly whenever your aggregation doesn't match any of the built-in `Collectors`, since it can express essentially any "combine everything into one value" operation, not just addition.

### Stream vs Collection — the one-line distinction

| | Collection | Stream |
|---|---|---|
| Purpose | Store data | Process data |
| Evaluation | Eager | Lazy (until a terminal operation runs) |
| Reusable? | Yes | No — a stream is consumed once and done |
| Modifies source | Yes, if mutable | Never |

That "no — consumed once" row is a real, easy-to-hit bug: calling a second terminal operation on a stream you've already run a terminal operation on throws `IllegalStateException`, because the stream doesn't hold data to run through again — it's a one-time description of a pipeline, not a reusable container. If you need to run two different pipelines over the same data, call `.stream()` again on the original collection for the second one.

## 6. Optional: Making "This Might Not Exist" Explicit

Now return to requirement two from section 1 — looking up a user by email:

```java
User user = userRepository.findByEmail(email);   // returns null if nobody matches
String displayName = user.getName();              // NullPointerException if email didn't match
```

The core problem wasn't the `null` itself — sometimes a lookup genuinely has nothing to return. The problem is that the method's signature, `User findByEmail(String email)`, looks identical whether or not `null` is a real possible outcome. A caller has no way to tell, just from the type, whether they need to check for absence — they only find out the hard way, when it crashes.

`Optional<T>` fixes this by making "might be absent" part of the return type itself:

```java
Optional<User> maybeUser = userRepository.findByEmail(email); // no user found -> empty Optional, not null

User user = maybeUser.orElseThrow(() -> new UserNotFoundException(email));

String displayName = maybeUser
    .map(User::getName)
    .orElse("Guest");
```

The moment a method returns `Optional<User>` instead of `User`, the signature itself is telling every caller "this might come back empty — decide what you want to happen." That's the entire point of `Optional`: **not** "replace every `null` in the codebase," but specifically make absence visible in a return type, so the compiler and the method signature nudge the caller into handling it instead of silently risking an NPE several calls later — which is exactly the same "unboxing a `null`" failure mode covered in the [Variables/DataTypes guide](02-Variables-DataTypes-Casting.md#4-autoboxing-unboxing-and-the-integer-cache-trap), just showing up through a different kind of value.

Common real methods, all shown above or extending naturally from them:

- `orElse(default)` — return the value if present, otherwise a fixed fallback.
- `orElseGet(supplier)` — same idea, but the fallback is computed lazily, only if actually needed (useful when computing the fallback is expensive — a database call or similar — that you don't want to pay for on the common "value was present" path).
- `orElseThrow(...)` — return the value if present, otherwise throw the given exception.
- `map(...)` — transform the contained value if present, otherwise stay empty; this is exactly why `maybeUser.map(User::getName)` above works even when `maybeUser` is empty.
- `isPresent()` / `isEmpty()` — check presence directly, for the rarer cases the methods above don't cover cleanly.

Two real misuses to avoid, since both quietly defeat the whole point:

1. **Calling `Optional.get()` directly without checking presence first.** This just relocates the exact same null-check problem one method deeper — you've swapped a possible `NullPointerException` for a possible `NoSuchElementException`, with no actual improvement.
2. **Using `Optional` as a field type or a method parameter type.** It's designed specifically for return values, where it communicates "this call might not produce anything" to a caller. As a field, it adds serialization and equality complications for no real benefit — a field that might be absent should usually just be allowed to hold `null` (or the class redesigned so absence isn't representable at all), not wrapped in `Optional`. As a parameter, it forces every caller to wrap a value in `Optional.of(...)` just to call the method, which is more ceremony than a plain overload or a `null`-accepting parameter would have been.

## 7. Default and Static Methods on Interfaces

**Scenario:** imagine the JDK team, back when `Collection` was already a published interface implemented by thousands of classes across the world, wants to add a `forEach` method to it. Before Java 8, adding *any* new method to a published interface was a breaking change — every single class that already implements `Collection` would suddenly fail to compile, because it doesn't implement the new method. That's an impossible upgrade path for something as foundational as `Collection`.

Java 8's fix is to let an interface method carry an actual body, so existing implementers don't need to do anything at all:

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

A `default` method has a body right there in the interface. Any class that already implements `PaymentValidator` automatically inherits `isValidAndPositive` with no changes required, and a new implementer is still free to override it with different behavior if it needs to. A `static` method on an interface works like a static method on a class — it's not inherited by implementers at all, it's just a convenient place to put a factory or helper related to the interface (`alwaysValid()` here returns a lambda implementing the interface).

This exact mechanism is how the standard library added `forEach()` to `Collection` and `stream()` to every collection type in Java 8 without breaking the entire existing ecosystem of classes that implement those interfaces — which is also why a functional interface (section 3) is still allowed to have more than the "one abstract method" rule might suggest: `default` and `static` methods have bodies, so they're never counted against that one-abstract-method limit.

## Interview Questions and Answers

### 1. What is a functional interface, and why does a lambda need one?

**Answer:** An interface with exactly one abstract method (it may still have `default`/`static` methods with bodies). A lambda has no type of its own — it's shorthand syntax for implementing that single abstract method, so the compiler needs a functional interface as the target type to know what the lambda is actually implementing.

**Follow-up:** Why doesn't `@FunctionalInterface` do anything at runtime? It's a compile-time-only check that stops a second abstract method from being added later, which would otherwise silently break every lambda already written against that interface.

### 2. `map()` vs `flatMap()` — give a real example of when you'd need `flatMap`.

**Answer:** `map()` transforms each element into exactly one output element. `flatMap()` transforms each element into a stream of elements and flattens all of those into one combined stream. Turning a `List<Order>` (each holding a `List<OrderLine>`) into one flat `Stream<OrderLine>` needs `flatMap` — `map` alone would leave you with a stream of lists, not a flat stream of lines.

### 3. Why are intermediate stream operations lazy, and why does that matter?

**Answer:** Nothing runs until a terminal operation is invoked, which lets the whole pipeline (filter, map, sorted, etc.) fuse into a single pass over the data instead of building a fully materialized intermediate list at every stage. It also means a stream with no terminal operation does nothing at all — a common "why didn't my filter run" confusion when someone forgets to call `collect()`/`forEach()`/similar.

### 4. What does `Collectors.groupingBy()` actually give you, with a real example?

**Answer:** A `Map` from a key function to the list of elements that share that key — e.g. `orders.stream().collect(Collectors.groupingBy(Order::getStatus))` produces a `Map<OrderStatus, List<Order>>`, exactly the shape needed to answer "show me all orders grouped by status" without hand-writing the grouping loop. Pairing it with a second collector (like `Collectors.reducing`) replaces the grouped list with an aggregate — a sum per group instead of the raw matching elements.

### 5. Why is `Optional` not "just a replacement for every `null`"?

**Answer:** Its real purpose is to make "this might be absent" an explicit part of a method's return type, forcing the caller to decide what happens in that case (`orElse`, `orElseThrow`, etc.) instead of silently risking a `NullPointerException` several calls downstream. Using it as a field or parameter type, or calling `.get()` without checking presence, just relocates the same null-handling problem rather than solving it.

**Follow-up:** What's the difference between `orElse` and `orElseGet`? `orElse` always evaluates its argument, even when the value is present. `orElseGet` takes a supplier and only computes the fallback when the value is actually absent — the right choice whenever the fallback is expensive to compute.

### 6. Why did Java 8 add `default` methods to interfaces?

**Answer:** To let the standard library (and any interface) add new methods without breaking every class that already implements it — before Java 8, adding a method to a published interface was a breaking change for every implementer. `default` gives a body that existing implementers inherit automatically, while new implementers can still override it. This is exactly how `Collection.forEach()` and `stream()` were added without breaking the existing ecosystem.

### 7. Stream vs Collection — what's the actual distinction an interviewer wants to hear?

**Answer:** A `Collection` stores data and is eagerly, repeatedly usable. A `Stream` processes data through a pipeline, evaluates lazily until a terminal operation runs, never modifies the source, and can only be consumed once — reusing an already-consumed stream throws `IllegalStateException`.

### 8. What's the actual difference between a lambda and a method reference?

**Answer:** None in what they produce — a method reference like `User::getEmail` is exactly equivalent to the lambda `user -> user.getEmail()`; both compile to the same functional-interface implementation. A method reference is purely a shorthand for the common case where a lambda's entire body is just calling one existing method on its argument.

### 9. What's the general-purpose tool behind operations like `sum`, `count`, and `max` on a stream?

**Answer:** `reduce(identity, accumulator)` — it starts from an identity value and repeatedly combines the running result with the next stream element using the given function. It's worth reaching for directly whenever an aggregation doesn't match one of the built-in `Collectors`.

## Revision Checklist

- [ ] Explain, using the manual for-loop and the `null`-returning lookup from section 1, what concrete problems lambdas/streams and `Optional` each solve.
- [ ] Write the `Comparator` anonymous-class-vs-lambda example from memory, and explain why a lambda needs a functional interface as its target type.
- [ ] Name the five common built-in functional interfaces (`Predicate`, `Function`, `Consumer`, `Supplier`, `BiFunction`) and a real use for each.
- [ ] Explain why `User::getEmail` and `user -> user.getEmail()` are the same thing.
- [ ] Build a real filter → map → sorted → collect pipeline over a domain object, not toy strings, and explain why nothing runs until `collect()` is called.
- [ ] Explain `map()` vs `flatMap()` with a nested-collection example (orders holding order lines).
- [ ] Use `Collectors.groupingBy`, `toMap`, `joining`, and `reduce()` for real aggregation tasks.
- [ ] Explain what `Optional` actually solves, and its two real misuses (as a field/parameter, or unchecked `.get()`).
- [ ] Explain why `default` methods were added to interfaces in Java 8, with the `Collection.forEach()`/`stream()` example.
- [ ] Explain the Stream vs Collection table, especially why a consumed stream can't be reused.
