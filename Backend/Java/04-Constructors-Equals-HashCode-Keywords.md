# Constructors, equals()/hashCode(), and Java's Keyword Trio (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](../Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. The Problem: An Object Born With Nothing Set Up

Say you're modeling an order in a shop's backend:

```java
class Order {
    private Long id;
    private String customerEmail;
}
```

Without writing anything special, this still compiles and runs:

```java
Order order = new Order();
// order.id is null, order.customerEmail is null — nothing has gone wrong *yet*
order.setCustomerEmail("ana@example.com");
// ...somewhere later, a confirmation email gets sent using order.id, which was never set
```

Nothing stops you from creating an `Order` and using it before it's actually filled in. If whoever wrote this code forgets to call `setCustomerEmail(...)` — or calls it in the wrong order, or a new field gets added six months later and someone forgets to set that one too — the object sits around half-built until something downstream (usually far away from where the bug actually is) throws a `NullPointerException` trying to use a field that was never assigned.

What you actually want is a way to force the required data to be supplied at the exact moment the object comes into existence, so a half-built `Order` can never exist in the first place. That's exactly what a **constructor** is: a special method that runs once, right when an object is created with `new`, and can require the caller to hand in everything the object needs.

```java
class Order {
    private final Long id;
    private final String customerEmail;

    Order(Long id, String customerEmail) {   // no return type, not even void — name matches the class
        this.id = id;
        this.customerEmail = customerEmail;
    }
}
```

```java
Order order = new Order(42L, "ana@example.com");   // the compiler now forces both values in
// Order order2 = new Order();                     // doesn't even compile — no constructor matches
```

Two things changed, and they reinforce each other: the fields are now `final` (set once, never reassigned — the compiler enforces this and will refuse to compile if any code path leaves one unset), and there's a constructor whose parameter list is the only way to build an `Order`. Together, an `Order` simply cannot exist without both values.

**Where the "default constructor" comes from, and the trap it sets.** If you don't write any constructor at all, Java automatically generates an empty, no-argument one for you — that's why the very first `new Order()` example above compiled with no constructor visible anywhere in the class. But the moment you write *any* constructor yourself, Java stops generating that free no-arg one. So if other code elsewhere was relying on `new Order()` (maybe a framework, a test, or a mapping library expects it), adding your own parameterized constructor silently breaks that other code at compile time — a very common real gotcha. If you genuinely need both a no-arg and a parameterized constructor, you now have to write the no-arg one explicitly.

## 2. `this`: Telling a Field Apart From a Parameter With the Same Name

The clearest name for a constructor parameter is usually the same name as the field it sets — `id` the parameter, `id` the field. That convenience creates a real problem:

```java
class Order {
    private Long id;

    Order(Long id) {
        id = id;      // looks like it should work — it does not
    }
}
```

```java
Order order = new Order(42L);
System.out.println(order.id);   // null — the field was never touched
```

This compiles cleanly and runs with no error, which is exactly what makes it dangerous. Inside the constructor body, the bare name `id` always refers to the closest thing in scope — the parameter — never the field, because the parameter *shadows* the field. `id = id;` is really "take the parameter, and assign it to... the parameter." The field `id` is never involved at all, and it silently keeps its default value forever.

`this` is the fix: `this.id` explicitly means "the field on this object," cutting through the shadowing:

```java
Order(Long id) {
    this.id = id;   // this.id is the field; id (bare) is the parameter
}
```

(If the field had been declared `final`, this exact bug would actually have been caught at compile time — Java would refuse to compile a class where a `final` field is never definitely assigned. Non-`final` fields get no such protection, which is one more reason to default to `final` for anything set only in the constructor.)

## 3. Constructor Chaining: Not Repeating Setup Logic With `this(...)`

Real classes often need more than one way to be constructed. Say `Order` sometimes gets created with just an ID (email filled in later by another process) and sometimes with both values up front:

```java
class Order {
    private final Long id;
    private final String customerEmail;

    Order(Long id) {
        if (id == null) throw new IllegalArgumentException("id required");
        this.id = id;
        this.customerEmail = "unknown@example.com";
    }

    Order(Long id, String customerEmail) {
        // whoops — forgot to repeat the id == null check here
        this.id = id;
        this.customerEmail = customerEmail;
    }
}
```

The validation logic (`if (id == null) ...`) had to be written twice, and the second constructor quietly forgot it. This is exactly the kind of duplication bug that creeps in as a class grows more constructors over time — every one of them has to remember to repeat the same setup by hand, and eventually one of them won't.

`this(...)` lets one constructor call another constructor of the *same* class, so the setup logic lives in exactly one place:

```java
class Order {
    private final Long id;
    private final String customerEmail;

    Order(Long id) {
        this(id, "unknown@example.com");   // delegates to the constructor below
    }

    Order(Long id, String customerEmail) {
        if (id == null) throw new IllegalArgumentException("id required");
        this.id = id;
        this.customerEmail = customerEmail;
    }
}
```

Now the validation exists once, in the "real" constructor that all the others eventually call into. The one hard rule: `this(...)` must be the very first statement in the constructor body — Java requires the object to be initialized through exactly one path before any of this constructor's own code runs, so there's no ambiguity about what ran first.

## 4. `super()`: Making Sure the Parent Gets Initialized Too

Now suppose there's a subclass:

```java
class PriorityOrder extends Order {
    private final int priorityLevel;

    PriorityOrder(Long id, String customerEmail, int priorityLevel) {
        this.priorityLevel = priorityLevel;
        // Order's fields (id, customerEmail) — who sets those up?
    }
}
```

A `PriorityOrder` *is* an `Order` underneath, so `Order`'s own fields still need to be initialized — but nothing in `PriorityOrder`'s constructor above does that. Java actually won't let this compile as written, because `Order` no longer has a no-arg constructor (section 1) for Java to call automatically, and this code never calls `Order`'s real constructor at all.

`super(...)` calls the parent class's constructor explicitly, and — like `this(...)` — must be the first statement:

```java
class PriorityOrder extends Order {
    private final int priorityLevel;

    PriorityOrder(Long id, String customerEmail, int priorityLevel) {
        super(id, customerEmail);   // runs Order's constructor first
        this.priorityLevel = priorityLevel;
    }
}
```

If a class's parent *does* have a plain no-arg constructor, Java inserts an implicit `super()` call for you automatically when you don't write one — this is exactly why simple inheritance often "just works" without anyone ever typing `super()`. It's only when the parent has no matching no-arg constructor (as with `Order` here, once it gained a required-argument constructor) that you're forced to call `super(...)` explicitly, with the right arguments. A constructor can call `this(...)` or `super(...)`, never both — there's only one first statement to spend.

## 5. `static` Blocks: One-Time Setup That Happens Before Any Object Exists

Now a different kind of setup problem. Say every part of the app needs to check a shared set of feature flags, loaded once from configuration — not per `Order`, not per request, just once for the whole running application:

```java
class FeatureFlags {
    static final Map<String, Boolean> flags = new HashMap<>();
    // how do you actually populate this with more than one line,
    // handle a config-loading failure, and still keep it final?
}
```

A field initializer only lets you write a single expression. The moment setup needs more than one step — build a map, loop over config entries, handle a failure — a plain field initializer isn't enough, and you can't reassign a `final` field a second time to fix it up afterward either.

A **static block** is a block of code that runs exactly once, automatically, the first time the class is loaded by the Java Virtual Machine (JVM — the program that actually runs compiled Java bytecode) — before any instance of the class is created, and before `main()` runs if that class happens to be the application's entry point:

```java
class FeatureFlags {
    static final Map<String, Boolean> flags;

    static {                                  // static block
        Map<String, Boolean> loaded = new HashMap<>();
        loaded.put("auditEnabled", loadFromConfig());
        flags = Collections.unmodifiableMap(loaded);
    }
}
```

This runs once total, no matter how many `FeatureFlags` objects ever get created (or even if none ever do) — it belongs to the class itself, not to any particular instance. The full order of events when a brand-new object is created, worth memorizing exactly: **static block (once, only the very first time the class is loaded) → instance field initializers → constructor body.** Static setup always finishes before any constructor for that class ever starts running.

## 6. The equals()/hashCode() Contract: Why an Object Can Silently Vanish From a `HashSet`

Here's a scenario that catches almost everyone at least once. Your app tracks which users have already been notified about something today, using a set to avoid double-notifying:

```java
class User {
    private final Long id;
    private final String email;

    User(Long id, String email) {
        this.id = id;
        this.email = email;
    }
}
```

```java
Set<User> alreadyNotified = new HashSet<>();
alreadyNotified.add(new User(42L, "ana@example.com"));

// later — a fresh User object rebuilt from a database row, same person, same id
User sameUserAgain = new User(42L, "ana@example.com");

if (!alreadyNotified.contains(sameUserAgain)) {
    sendNotification(sameUserAgain);   // sends it again — the check just said "not found"
}
```

That user gets notified twice. From `alreadyNotified`'s point of view, the `User` you added is effectively invisible — `contains(...)` looked right at logically-the-same person and reported "not here." Nothing crashed, nothing logged an error; the object just silently isn't found again.

The reason: `Object.equals()` defaults to comparing object identity (the same thing `==` does — "is this literally the same object in memory?"), and `Object.hashCode()` defaults to something derived from that same identity. Two separate `User` objects, even with identical `id` and `email`, are different objects in memory, so by default they're never "equal" to each other and never hash the same way. `HashSet`/`HashMap` are built entirely around trusting those two methods, and a domain object like `User` — which should count as "the same" based on its *data*, not its memory address — needs to say so explicitly.

The natural first fix is to override `equals()`:

```java
class User {
    private final Long id;
    private final String email;

    User(Long id, String email) { this.id = id; this.email = email; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;                // fast path: same object
        if (!(o instanceof User other)) return false;
        return id.equals(other.id);
    }
    // hashCode() not overridden yet — see what happens
}
```

This alone does **not** fix the bug. `alreadyNotified.contains(sameUserAgain)` still returns `false`. Here's exactly why: a `HashSet` never actually calls `equals()` on every element to check membership — that would be far too slow for a large set. Instead it calls `hashCode()` on the object you're looking for first, to jump straight to one specific bucket (an internal bin holding only the handful of objects that hash the same way), and only compares with `equals()` against the objects already sitting in *that* bucket. Since `hashCode()` is still identity-based, `sameUserAgain`'s hash code almost certainly points to a different bucket than the one the original `User` landed in — so `equals()`, even though it would correctly say "yes, same id," never even gets called. The object the set is looking for and the object already inside it are sitting in two different buckets entirely, and the set has no reason to compare across buckets.

The real fix overrides both together, using the same fields in each:

```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof User other)) return false;
    return id.equals(other.id);
}

@Override
public int hashCode() {
    return Objects.hash(id);
}
```

Now both `User` objects land in the same bucket (same `id`, same `hashCode()`), `equals()` runs and correctly reports them as the same user, and `contains(...)` returns `true` as it should.

**The contract, stated precisely:** if `a.equals(b)` is `true`, then `a.hashCode()` **must** also equal `b.hashCode()`. This is the rule the whole bucket-lookup mechanism depends on. The reverse is *not* required — two genuinely unequal objects are allowed to produce the same hash code (that's called a **collision**), because `equals()` is exactly what tells them apart once they land in the same bucket. When a bucket collects enough entries, Java (since Java 8) automatically switches that bucket's internal storage from a plain linked list to a balanced tree, keeping worst-case lookups fast even when many objects happen to collide.

**One more real bug that follows directly from this mechanism: never mutate a field that's part of `equals()`/`hashCode()` after the object has already been inserted into a `HashSet` or used as a `HashMap` key.**

```java
User user = new User(42L, "ana@example.com");
Set<User> users = new HashSet<>();
users.add(user);            // bucket chosen based on id = 42L right now

// (imagine User's id were mutable, and it got changed here)
// user.setId(99L);

users.contains(user);       // looks in the bucket for id = 99L — but the object still physically
                             // lives in the bucket for id = 42L, computed back when it was inserted
```

The set computed and stored the object in a bucket based on the field's value *at insertion time*. Changing that field afterward doesn't move the object to a new bucket — nothing re-hashes it automatically — so a later lookup computes a different bucket than where the object actually sits, and the lookup silently fails. This exact problem is why a JPA (Java Persistence API) entity's `equals()`/`hashCode()` deserves special care too, covered in the [Database/JPA guide](../Springboot/03-Database-JPA-Hibernate.md) — an entity's `id` is often null before it's saved and only assigned afterward, which is the same mutable-key trap wearing a different hat.

## 7. `final` vs `finally` vs `finalize()`: Three Words That Sound Related and Aren't

**Scenario:** you're processing a payment, and no matter whether it succeeds or throws an exception, an inventory lock taken earlier absolutely must be released — otherwise that inventory stays locked forever.

```java
try {
    processPayment(order);
} catch (PaymentException e) {
    log.error("Payment failed", e);
}
releaseInventoryLock(order);   // bug: skipped entirely if processPayment throws something
                                 // that isn't a PaymentException — no catch block covers it
```

If `processPayment` throws some exception this `catch` doesn't cover, execution jumps straight out of this whole block and `releaseInventoryLock` never runs — the lock leaks. What's needed is a block of code Java guarantees will run *no matter what happens above it*, exception or not. That's exactly what a **`finally` block** is:

```java
try {
    processPayment(order);
} catch (PaymentException e) {
    log.error("Payment failed", e);
} finally {
    releaseInventoryLock(order);   // now runs whether processPayment succeeded, threw, or returned early
}
```

`finally` runs after the `try`/`catch` no matter what — even if the `try` or `catch` block hits a `return` statement, `finally` still runs before the method actually returns. The only two ways to skip it: `System.exit(...)` terminates the JVM immediately with no cleanup, or the JVM itself crashes. Ordinary exceptions never skip it.

**`final`** is a completely unrelated keyword — not a block, a modifier — and it means "this cannot change" in three different places:

```java
final int MAX_RETRIES = 3;        // final variable — cannot be reassigned after this

class ImmutablePoint {
    final int x, y;               // final field — set once (declaration or constructor), never again
}

final class ImmutablePoint2 { }   // final class — cannot be extended/subclassed

class Base {
    final void validate() { }     // final method — cannot be overridden by a subclass
}
```

**`finalize()`** is yet another unrelated thing — a method, not a keyword or a block, and one you should actively avoid relying on:

```java
class TempFileHandle {
    @Override
    protected void finalize() {   // called by the garbage collector, at some point, maybe
        System.out.println("cleaning up");
    }
}
```

The garbage collector (the JVM component that reclaims memory from objects nothing references anymore) *may* call `finalize()` before it reclaims an object — but it gives no guarantee about *when* that happens, or even *whether* it happens at all before the JVM shuts down. Relying on it to close a file handle or a network socket is a production bug waiting to happen: the resource might stay open far longer than expected, or forever. `finalize()` is deprecated for exactly this reason. The reliable modern replacement is `try`-with-resources together with `AutoCloseable`, covered in the [Exception Handling guide](07-Exception-Handling.md) — it calls `close()` deterministically the instant the block exits, success or failure, with none of `finalize()`'s uncertainty.

| | `final` | `finally` | `finalize()` |
|---|---|---|---|
| What it is | Keyword/modifier | Block attached to `try` | Method (deprecated) |
| Applies to | Variable, field, method, or class | A `try` statement | Any object; called by the GC |
| Guaranteed to run/apply? | N/A — enforced at compile time | Yes, except `System.exit()` or a crash | No — unreliable, avoid |
| Modern replacement | — | — | `try`-with-resources / `AutoCloseable` |

## Interview Questions and Answers

### 1. Why must `this(...)` or `super(...)` be the first statement in a constructor?

**Answer:** Java requires the object's parent state — or an alternate constructor's full initialization — to be established before this constructor's own body runs, so there's exactly one, unambiguous initialization order. Allowing it anywhere else would let a constructor use fields before they're guaranteed to exist yet.

### 2. What happens to the "default" no-arg constructor once you write your own constructor?

**Answer:** Java only auto-generates a no-arg constructor when a class declares no constructor at all. The instant you write any constructor yourself, that automatic one disappears — code elsewhere calling `new SomeClass()` will now fail to compile unless you explicitly write a no-arg constructor too.

**Follow-up:** Why is `id = id;` inside a constructor a silent bug rather than a compile error? Because the bare parameter name shadows the field of the same name — the statement assigns the parameter to itself, and the field is never touched. `this.id = id;` is required to reach the field. If the field were `final`, the compiler would actually catch this, since it would see the field is never definitely assigned.

### 3. When does a static block run, relative to instance field initializers and the constructor?

**Answer:** Exactly once — the first time the class is loaded by the JVM — before any instance of that class is created, and therefore before any field initializer or constructor body for that class ever runs. The full order for a brand-new object is: static block (once, class load) → instance field initializers → constructor body.

### 4. Why does overriding `equals()` without `hashCode()` break lookups in a `HashSet`?

**Answer:** A `HashSet` uses `hashCode()` first to pick which bucket to look in, then `equals()` second to compare against whatever's already in that bucket. If `hashCode()` is left at its default (identity-based), two logically-equal objects can land in different buckets and never even get compared with `equals()` — the set reports the object as missing even though an "equal" one is sitting in a different bucket.

### 5. What's the exact contract between `equals()` and `hashCode()`?

**Answer:** If two objects are equal according to `equals()`, they must return the same `hashCode()`. The reverse isn't required — two unequal objects are allowed to share a hash code, which is called a collision, and `equals()` is exactly what distinguishes them once they're compared inside the same bucket.

### 6. Why is mutating a field used in `equals()`/`hashCode()` dangerous after the object is already a `HashSet`/`HashMap` key?

**Answer:** The object's bucket was computed from that field's value at insertion time, and nothing re-computes it automatically when the field later changes. A subsequent lookup computes a bucket based on the field's current value, which no longer matches the bucket the object actually lives in, so the lookup silently fails to find it.

### 7. How does a `HashMap`/`HashSet` resolve a hash collision internally?

**Answer:** Multiple objects with the same hash code land in the same bucket, and within that bucket `equals()` is used to tell them apart. Since Java 8, once a single bucket collects enough entries, its internal storage switches from a plain linked list to a balanced tree, keeping worst-case lookups fast even under heavy collisions.

### 8. Difference between `final`, `finally`, and `finalize()`?

**Answer:** `final` is a keyword/modifier restricting reassignment of a variable, overriding of a method, or extension of a class. `finally` is a block attached to a `try` statement that always runs afterward (barring `System.exit()` or a JVM crash), typically used for cleanup. `finalize()` is a deprecated, unreliable method the garbage collector may call before reclaiming an object — real cleanup should use `try`-with-resources instead.

### 9. Can a `finally` block ever be skipped?

**Answer:** Yes, in exactly two cases: `System.exit()` terminates the JVM immediately without running any pending `finally` blocks, and a JVM crash skips everything. Under normal exception flow — even a `return` inside the `try` or `catch` — `finally` still runs first, before control actually leaves the method.

### 10. Why was `finalize()` effectively phased out in favor of `try`-with-resources?

**Answer:** `finalize()` gives no guarantee about when the garbage collector will call it, or whether it runs at all before JVM shutdown — that unpredictable timing made it unreliable for real cleanup like closing files, sockets, or connections. `try`-with-resources calls `close()` deterministically the instant the block exits, success or failure, with no such uncertainty.

### 11. Can a constructor call both `this(...)` and `super(...)`?

**Answer:** No. Only one statement can be first in a constructor body, and both `this(...)` and `super(...)` are required to be that first statement — so a constructor picks exactly one, never both.

### 12. If a parent class has no no-arg constructor, what happens to a subclass that doesn't call `super(...)` explicitly?

**Answer:** It fails to compile. Java only inserts an implicit, silent `super()` call for you when the parent class actually has a matching no-arg constructor available. Once the parent's only constructor requires arguments, every subclass constructor must call `super(...)` explicitly with the right values, as its first statement.

## Revision Checklist

- [ ] Explain, using the `Order` example, why an object with no constructor can end up half-initialized, and how a constructor with required parameters prevents that.
- [ ] Explain the default no-arg constructor rule and the exact moment it stops being generated.
- [ ] Explain why `id = id;` in a constructor is a silent bug, and how `this.id = id;` fixes it.
- [ ] Explain constructor chaining with `this(...)`, why it must be the first statement, and what duplication problem it solves.
- [ ] Explain `super(...)`, when Java inserts it implicitly for you, and when you're forced to call it explicitly.
- [ ] Explain when a static block runs relative to field initializers and the constructor, and why a plain field initializer sometimes isn't enough.
- [ ] Walk through the `User`/`HashSet` scenario end to end: why the object "vanishes," why fixing only `equals()` isn't enough, and how fixing both together resolves it.
- [ ] State the equals/hashCode contract precisely, including what's true about collisions and what isn't required.
- [ ] Explain the mutable-key bug in `HashSet`/`HashMap`, and why it also affects JPA entities.
- [ ] Distinguish `final`, `finally`, and `finalize()`, and explain why `finalize()` should be avoided in favor of `try`-with-resources.
