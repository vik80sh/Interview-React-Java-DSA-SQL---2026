# String Handling

Strings are the most-used type in any backend codebase — every request ID, status code, and log line is one — and Java's specific choice to make them immutable and pool literals produces a small set of interview traps that show up constantly in real code review, not just quizzes.

## 1. Strings Are Immutable

Once created, a `String`'s content can never change. Every operation that looks like it "modifies" a string actually creates a new one.

```java
String status = "PENDING";
status.concat("_REVIEW");        // creates a new String, but throws it away — nothing assigned
System.out.println(status);      // still "PENDING"

status = status.concat("_REVIEW"); // this is the correct way — reassign the result
System.out.println(status);        // "PENDING_REVIEW"
```

Real bug shape: calling `input.trim()` or `errorMessage.replace(...)` and forgetting to capture the return value does nothing at all — a very common code-review catch, especially in validation logic that silently no-ops.

Why Java made strings immutable: it lets many references safely share the exact same object (the String Pool below), makes strings inherently thread-safe with zero synchronization, and lets `String` be used safely as a `HashMap` key without the mutable-key bug described in the [equals/hashCode guide](04-Constructors-Equals-HashCode-Keywords.md).

## 2. The String Pool

String literals are stored in a special, deduplicated area (part of the heap) called the **String Constant Pool**.

```java
String a = "PENDING";
String b = "PENDING";
System.out.println(a == b); // true — literal a and literal b are the SAME pooled object

String c = new String("PENDING");
System.out.println(a == c); // false — new String(...) forces a brand-new object outside the pool
System.out.println(a.equals(c)); // true — same content, compared by value
```

The rule this teaches, and that shows up everywhere in real code: **`==` compares references, `.equals()` compares content.** For primitives, `==` compares value directly (there's no reference involved), but for any object — `String` included — `==` is a reference check. Always use `.equals()` when comparing string *content*, including order statuses, currency codes, or any string coming from user input, a database row, or deserialization — none of those are guaranteed to come from the pool.

### Compile-time vs runtime concatenation — the trap interviewers love

```java
String a = "hello";
String b = "he" + "llo";          // both are literals -> folded at compile time -> pooled
System.out.println(a == b);       // true

String he = "he";
String c = he + "llo";            // "he" is a variable -> concatenation happens at RUNTIME
System.out.println(a == c);       // false — c is a new object on the heap, not in the pool

final String heFinal = "he";      // final + compile-time-constant value -> compiler treats it as a constant
String d = heFinal + "llo";       // folded at compile time again, just like the literal case
System.out.println(a == d);       // true
```

The compiler can fold `"he" + "llo"` into `"hello"` at compile time because both sides are literals — but the moment either side is a plain (non-`final`) variable, the JVM can't assume it won't change, so the concatenation happens at runtime (via `StringBuilder` internally) and produces a fresh heap object outside the pool. Marking the variable `final` with a compile-time-constant value restores compile-time folding.

`String.intern()` manually forces a string into the pool (or returns the existing pooled reference if the content is already there):

```java
String pooled = c.intern();
System.out.println(a == pooled); // true — c's content now resolves to the pooled object
```

## 3. String vs StringBuilder vs StringBuffer

```java
// String — every "modification" builds a new object. Fine for a handful of concatenations.
String message = "Order " + orderId + " shipped";

// StringBuilder — mutable, not thread-safe, fastest. The right choice for building a large
// string in a loop, e.g. constructing a CSV export row by row.
StringBuilder csv = new StringBuilder();
for (OrderLine line : lines) {
    csv.append(line.getSku()).append(",").append(line.getAmount()).append("\n");
}

// StringBuffer — mutable AND synchronized, so it's safe to share across threads, at a
// performance cost. Rarely needed in modern code — most string building isn't actually shared
// across threads, and if it is, building locally per-thread and combining results is usually cleaner.
StringBuffer sharedLog = new StringBuffer();
```

| | `String` | `StringBuilder` | `StringBuffer` |
|---|---|---|---|
| Mutable | No | Yes | Yes |
| Thread-safe | N/A (immutable, so inherently safe) | No | Yes (synchronized) |
| Performance | Slow for repeated changes | Fast | Slower than `StringBuilder` |
| Stored in String Pool | Literals only | Never | Never |

The real-world rule: default to `StringBuilder` any time you're building a string incrementally (loops, conditional appends). Reach for `StringBuffer` only when the *same* builder instance is genuinely shared and mutated by multiple threads — which is rare; more often each thread should build its own `StringBuilder` and combine results afterward.

## Interview Questions and Answers

### 1. `String a = "hello"; String b = "hello";` — what does `a == b` return, and why?

**Answer:** `true`. Both are string literals, so both point to the same object in the String Constant Pool — the JVM never creates a second object for identical literal content.

### 2. `String a = new String("hello"); String b = new String("hello");` — what does `a == b` return?

**Answer:** `false`. `new String(...)` explicitly forces creation of a new object on the heap outside the pool, every time, regardless of content — so `a` and `b` are two distinct objects even though `a.equals(b)` is `true`.

### 3. Why does `String c = b + "llo"` (where `b` is a plain variable) produce a different object than the equivalent literal, but using `final String b` doesn't?

**Answer:** With a plain variable, the compiler can't guarantee `b`'s value at compile time, so the concatenation happens at runtime and produces a new heap object outside the pool. Marking `b` as `final` with a compile-time-constant value lets the compiler treat it as a constant and fold the whole expression at compile time, landing the result in the pool just like a literal.

### 4. What does `s.concat(" world")` do if you never assign its result back to `s`?

**Answer:** Nothing observable — `concat()` returns a brand-new `String`, but since strings are immutable, `s` itself is never modified. The correct usage is `s = s.concat(" world")`. This is a very common real bug when someone assumes `String` methods mutate in place.

### 5. Why doesn't `StringBuilder.equals()` compare content the way `String.equals()` does?

**Answer:** `StringBuilder` never overrides `equals()`, so it falls back to `Object`'s default — a reference comparison, identical to `==`. Two `StringBuilder`s with the same text are never "equal" by `.equals()` unless they're the literal same object; you'd compare `sb1.toString().equals(sb2.toString())` instead.

### 6. When would you choose `StringBuffer` over `StringBuilder`?

**Answer:** Only when the exact same builder instance is genuinely mutated by multiple threads concurrently and that shared mutation is actually required — a fairly rare situation, since it's usually cleaner to let each thread build its own `StringBuilder` and merge the results afterward. `StringBuilder` is the default choice everywhere else because it's faster and unsynchronized.

### 7. Why is String immutability actually useful, beyond "it's just how Java designed it"?

**Answer:** It lets many references share one object safely (the pool), makes `String` inherently thread-safe with no synchronization needed, and makes it safe to use as a `HashMap`/`HashSet` key — a mutable key would risk the exact bucket-mismatch bug described for `equals()`/`hashCode()` in the previous guide.

## Revision Checklist

- [ ] Explain why `String` is immutable and what that implies for methods like `concat()`/`trim()`/`replace()`.
- [ ] Explain the String Pool and predict `==` vs `.equals()` output for literal, `new String(...)`, and `intern()` cases.
- [ ] Trace through the compile-time vs runtime concatenation trap, including the `final` fix.
- [ ] Choose correctly between `String`, `StringBuilder`, and `StringBuffer` for a real scenario (e.g. building a CSV export).
