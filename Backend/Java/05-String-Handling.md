# String Handling (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](../Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. The Problem: You Call a String Method and Nothing Happens

Say you're writing validation logic for an order-processing service:

```java
String orderId = "  ORD-4471  ";
orderId.trim();                       // looks like it removes the spaces
System.out.println(orderId.length()); // still 14 — the spaces are still there!
```

You called `trim()`, it clearly ran (no error), and yet `orderId` is completely unchanged. Same bug, different method:

```java
String errorMessage = "user not found";
errorMessage.replace("not found", "is inactive");
System.out.println(errorMessage);   // still "user not found"
```

This is a real, common code-review catch — someone assumes `String` methods work like `List.add(...)` (change the object in place), calls `trim()` or `replace(...)` or `concat(...)` for its side effect, and forgets that the method actually *returns something*:

```java
String orderId = "  ORD-4471  ";
orderId = orderId.trim();             // reassign the result — now it actually changes
System.out.println(orderId.length()); // 8
```

**Here's why this happens: in Java, a `String`'s content can never change after it's created — a `String` is immutable.** `trim()`, `replace()`, and `concat()` don't modify the string you called them on at all — they build and return a brand-new `String` object, leaving the original exactly as it was. If you don't capture that return value, the new string you just paid to create is thrown away, and you're left looking at the untouched original. This is worth internalizing now because almost every other String topic in this file is really just a consequence of this one fact.

## 2. The Problem: The Same Text, Stored Over and Over

Now picture a service that processes orders. Every single `Order` object gets a `status` field, and a huge number of them are `"PENDING"`:

```java
Order order1 = new Order("PENDING");
Order order2 = new Order("PENDING");
Order order3 = new Order("PENDING");
// ...and this exact literal appears in thousands of Order objects across the app
```

If every one of those `"PENDING"` strings were a separate object sitting in memory, you'd be storing the exact same six characters thousands of times over, for no reason — pure waste, since none of them can ever change anyway (section 1).

Because strings are immutable, Java can safely take a shortcut here: identical string literals can all point to the *same* object, since there's no risk of one piece of code mutating it and corrupting it for everyone else. That shortcut is a special, deduplicated area of memory called the **String Constant Pool**. The first time the JVM sees the literal `"PENDING"`, it creates one object and stores it in the pool; every later `"PENDING"` literal, anywhere in the program, just points at that same object instead of creating a new one.

```java
String a = "PENDING";
String b = "PENDING";
System.out.println(a == b);   // true — a and b are literally the same object
```

### The trap this creates: `==` versus `.equals()`

`==` on objects doesn't compare content — it compares whether two references point at the *exact same object in memory*. For the pooled literals above, that happens to also mean "same content," which is exactly what makes this trap so easy to fall into.

Now watch what happens the moment a string doesn't come from a literal:

```java
String c = new String("PENDING");     // new String(...) forces creation of a brand-new object,
                                       // deliberately bypassing the pool
System.out.println(a == c);           // false — different objects in memory
System.out.println(a.equals(c));      // true — same content, compared by value
```

`a` and `c` hold the exact same six characters, but `a == c` is `false`, because `c` was explicitly built outside the pool. This is the rule that actually matters day to day: **`==` compares references; `.equals()` compares content.** In real code, an order's status read from a database row, a request body, or deserialized JSON is *never* guaranteed to come from the pool — so comparing it with `==` can silently be `false` even when the text is identical, purely by accident of *how* the string was constructed rather than *what* it contains. Always use `.equals()` (or, for null-safety, `Objects.equals(a, b)`) to compare string content — reserve `==` for the rare case where you deliberately want to know "is this the literal same object," not "does it hold the same text."

(For primitives like `int` or `boolean`, there's no such trap — `==` compares the value directly, because there's no separate object identity to confuse it with. The trap is specific to comparing objects, and `String` is simply the object type beginners run into it with constantly.)

## 3. The Trap Interviewers Love: Compile-Time vs. Runtime Concatenation

Here's a puzzle that looks like it contradicts everything in section 2:

```java
String a = "hello";
String b = "he" + "llo";
System.out.println(a == b);   // true — as expected, both are "hello" literals

String he = "he";
String c = he + "llo";        // he is a variable now, not a literal
System.out.println(a == c);   // false!! same text, but not the same object anymore
```

`b` was built from two literals joined with `+`, and it's pooled, exactly like section 2 predicts. But `c` holds the exact same text, `"hello"`, and it's *not* pooled — `a == c` is `false`. Why would changing `"he"` from a literal to a variable change whether the result lands in the pool at all?

Here's exactly what's going on: when both sides of a `+` are literals, the *compiler* — not the JVM at runtime — can work out the final text ahead of time and folds `"he" + "llo"` directly into the single literal `"hello"` while compiling your code. Since that's now just an ordinary literal, it gets pooled like any other. But the moment either side is a plain variable, the compiler can't know what that variable will hold when the line actually runs — someone could reassign `he` right before this line — so it can't fold anything. The concatenation genuinely happens at runtime instead (using a `StringBuilder` internally, which section 6 covers), and it produces a brand-new heap object that was never a literal at all, so it's never pooled.

You can get the compile-time folding back even with a variable, if you tell the compiler that variable's value can never change:

```java
final String heFinal = "he";      // final + a compile-time-constant value
String d = heFinal + "llo";       // the compiler can now safely fold this at compile time too
System.out.println(a == d);       // true
```

Marking `heFinal` as `final` and giving it a literal value tells the compiler "this will always be `\"he\"`, guaranteed" — so it's free to fold the expression exactly as if you'd written the literal `"hello"` yourself.

### Forcing a string into the pool manually: `intern()`

Going back to `c` from the runtime-concatenation example — it holds `"hello"` but isn't pooled. `String.intern()` fixes that on demand: it checks the pool for a string with matching content, and returns the pooled reference if one already exists (or adds this one to the pool if not).

```java
String pooled = c.intern();
System.out.println(a == pooled);   // true — c's content now resolves to the existing pooled object
```

## 4. Why Java Designed Strings This Way

Sections 1–3 covered the traps immutability and pooling create. It's worth pausing on why Java accepted those traps in exchange for this design, because the payoff shows up in places far beyond string comparison:

- **Sharing is safe.** Because a `String`'s content can never change, thousands of references can point at the exact same pooled object (section 2) with zero risk of one piece of code corrupting it for everyone else. A mutable shared string would make that dangerous.
- **Thread-safety for free.** A `String` needs no synchronization to be used safely across multiple threads — there's nothing to synchronize, since nothing about it can ever change after construction.
- **Safe as a `HashMap` key.** A `HashMap` decides which bucket a key belongs in based on that key's `hashCode()` at the time it's inserted. If a key's content — and therefore its hash — could change after insertion, the entry could end up "lost" in the wrong bucket, unfindable by any lookup afterward. Because `String` is immutable, its hash code can never drift out from under a map that's already relying on it. (The mechanics of `hashCode()`/`equals()` and this exact bucket-mismatch bug for a genuinely mutable key are covered in the [equals/hashCode guide](04-Constructors-Equals-HashCode-Keywords.md).)

## 5. The Problem: Building a Big String in a Loop

Now a different scenario. Say you're exporting orders to a CSV file:

```java
String csv = "";
for (OrderLine line : lines) {
    csv = csv + line.getSku() + "," + line.getAmount() + "\n";   // looks harmless
}
```

This *works*. But remember section 1: `String` is immutable, so `csv + line.getSku() + ...` doesn't extend the existing string — it builds an entirely new `String` object holding the combined text, and throws the previous `csv` object away. If `lines` has 50,000 rows, this loop silently creates roughly 50,000 throwaway `String` objects along the way, each one copying and re-copying an ever-growing block of text, just to get discarded a moment later. That's a real, measurable performance problem in any code that builds up text incrementally — not a micro-optimization concern, but something that shows up in profiler output on real services.

**This is exactly what `StringBuilder` answers: a genuinely mutable, growable buffer of characters, so appending text doesn't create a new object every single time.**

```java
StringBuilder csv = new StringBuilder();
for (OrderLine line : lines) {
    csv.append(line.getSku()).append(",").append(line.getAmount()).append("\n");
}
String result = csv.toString();   // convert to a String only once, at the end
```

Each `.append(...)` call mutates the same underlying buffer in place — no new object per line, no throwaway garbage for the loop to generate. `StringBuilder` is not thread-safe (nothing stops it from being), but for the overwhelmingly common case — one thread building up one string — that's irrelevant, and the speed it buys is the entire point.

One nuance worth knowing: for a small, fixed number of concatenations (like building one log message), the compiler already generates a `StringBuilder` for you behind the scenes (that's literally what happened at runtime in section 3's `c = he + "llo"` case), so plain `+` is completely fine there. The loop is specifically what turns naive `+` concatenation into a real problem, because every iteration compounds the wasted work.

## 6. The Problem: What If Multiple Threads Build the Same String?

`StringBuilder` solves the loop problem, but it comes with one condition: it's not safe if more than one thread appends to the *same* instance at the same time — concurrent, unsynchronized mutation of the same buffer can corrupt it or lose appended data.

Say you had a genuinely shared log buffer written to by multiple worker threads at once:

```java
StringBuffer sharedLog = new StringBuffer();
// multiple threads call sharedLog.append(...) concurrently
```

**`StringBuffer` is `StringBuilder`'s older, synchronized twin — every method is `synchronized`, so it's safe for multiple threads to mutate the exact same instance.** That safety isn't free: synchronizing every call adds locking overhead, so `StringBuffer` is slower than `StringBuilder` even in the common case where nothing is actually contending for the lock.

In practice this situation — many threads genuinely required to mutate one shared builder — is rarer than it sounds. Most of the time it's cleaner for each thread to build its own local `StringBuilder` and combine the finished results afterward (e.g. into a thread-safe collection), which sidesteps the whole synchronization cost entirely. Reach for `StringBuffer` only when a single shared, mutable instance is a genuine requirement, not a default.

## 7. Putting the Three Side by Side

| | `String` | `StringBuilder` | `StringBuffer` |
|---|---|---|---|
| Mutable | No — every "change" is a new object | Yes | Yes |
| Thread-safe | Yes, trivially (nothing to synchronize — it never changes) | No | Yes (synchronized methods) |
| Performance | Slow for repeated changes (section 5) | Fast | Slower than `StringBuilder` (locking overhead) |
| Stored in the String Pool | Literals only (section 2) | Never | Never |
| Typical use | Values that don't change often, or a handful of one-off concatenations | Building a string incrementally, single-threaded (a loop, conditional appends) | A single builder instance genuinely shared and mutated across threads |

The decision in practice: reach for plain `String` by default. The moment you're building text incrementally — especially inside a loop — switch to `StringBuilder`. Only escalate to `StringBuffer` if you've confirmed the exact same instance really is being mutated by more than one thread at once.

## Interview Questions and Answers

### 1. `String a = "hello"; String b = "hello";` — what does `a == b` return, and why?

**Answer:** `true`. Both are string literals, so both point to the same object in the String Constant Pool — the JVM never creates a second object for identical literal content.

### 2. `String a = new String("hello"); String b = new String("hello");` — what does `a == b` return?

**Answer:** `false`. `new String(...)` explicitly forces creation of a new object on the heap outside the pool, every time, regardless of content — so `a` and `b` are two distinct objects even though `a.equals(b)` is `true`.

### 3. Why does `String c = b + "llo"` (where `b` is a plain variable) produce a different object than the equivalent literal, but using `final String b` doesn't?

**Answer:** With a plain variable, the compiler can't guarantee `b`'s value at compile time, so the concatenation happens at runtime (via an internally generated `StringBuilder`) and produces a new heap object outside the pool. Marking `b` as `final` with a compile-time-constant value lets the compiler treat it as a constant and fold the whole expression at compile time, landing the result in the pool just like a literal.

**Follow-up:** What does `intern()` do for a string like `c`? It checks the pool for existing content that matches and returns that pooled reference, adding `c`'s content to the pool if it wasn't already there.

### 4. What does `s.concat(" world")` do if you never assign its result back to `s`?

**Answer:** Nothing observable — `concat()` returns a brand-new `String`, but since strings are immutable, `s` itself is never modified. The correct usage is `s = s.concat(" world")`. This is a very common real bug when someone assumes `String` methods mutate in place, and the same mistake shows up with `trim()` and `replace()`.

### 5. Why is building a large string with `+` inside a loop a real performance problem?

**Answer:** Because `String` is immutable, every `+` inside the loop discards the previous string and allocates an entirely new one holding the combined text — for a loop of N iterations, that's roughly N throwaway objects and repeated copying of an ever-growing block of text. `StringBuilder` fixes this by mutating one growable buffer in place instead of allocating a new object per append.

### 6. Why doesn't `StringBuilder.equals()` compare content the way `String.equals()` does?

**Answer:** `StringBuilder` never overrides `equals()`, so it falls back to `Object`'s default — a reference comparison, identical to `==`. Two `StringBuilder`s with the same text are never "equal" by `.equals()` unless they're the literal same object; you'd compare `sb1.toString().equals(sb2.toString())` instead.

### 7. When would you choose `StringBuffer` over `StringBuilder`?

**Answer:** Only when the exact same builder instance is genuinely mutated by multiple threads concurrently and that shared mutation is actually required — a fairly rare situation, since it's usually cleaner to let each thread build its own `StringBuilder` and merge the results afterward. `StringBuilder` is the default choice everywhere else because it's faster and unsynchronized.

### 8. Why is String immutability actually useful, beyond "it's just how Java designed it"?

**Answer:** It lets many references share one pooled object safely with no risk of one caller corrupting it for everyone else, makes `String` inherently thread-safe with no synchronization needed, and makes it safe to use as a `HashMap`/`HashSet` key — a mutable key would risk the exact bucket-mismatch bug described for `equals()`/`hashCode()` in the constructors/equals/hashCode guide.

### 9. For primitives like `int`, does the `==` vs `.equals()` distinction still apply?

**Answer:** No — `==` on a primitive compares the value directly, since there's no separate object identity involved. The `==` vs `.equals()` trap is specific to comparing objects, and `String` is where beginners hit it constantly because a `String` literal's pooling makes `==` *look* like it's comparing content, right up until a `new String(...)` or a non-pooled value breaks that assumption.

## Revision Checklist

- [ ] Explain why calling `trim()`/`replace()`/`concat()` without reassigning the result silently does nothing, and connect it to `String` being immutable.
- [ ] Explain the String Pool as a fix for storing identical literal text redundantly, and predict `==` vs `.equals()` output for literal, `new String(...)`, and `intern()` cases.
- [ ] Trace through the compile-time vs runtime concatenation trap, including why `final` restores compile-time folding.
- [ ] Explain the three real payoffs of immutability: safe sharing, thread-safety with no synchronization, and safety as a `HashMap` key.
- [ ] Explain, using the CSV-export loop, why repeated `+` concatenation in a loop is a genuine performance problem, and how `StringBuilder` fixes it.
- [ ] Choose correctly between `String`, `StringBuilder`, and `StringBuffer` for a real scenario, including when a shared builder across threads actually justifies `StringBuffer`.
- [ ] Explain why `StringBuilder.equals()` doesn't compare content, and how to compare two builders' text correctly.
