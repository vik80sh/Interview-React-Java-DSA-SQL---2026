# Variables, Data Types, and Type Casting (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](../Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. Where a Variable Actually Lives

Say you're writing a method that totals up an order:

```java
class Order {
    double total(List<OrderLine> lines) {
        double sum;                 // declared, not initialized
        for (OrderLine line : lines) {
            sum += line.getAmount();
        }
        return sum;
    }
}
```

This won't even compile. Java's compiler refuses to let you read `sum` before it's definitely been assigned a value — `sum += ...` reads `sum` before writing it, so the compiler stops you right there: `variable sum might not have been initialized`.

Fine, you think, Java just always requires initialization. Except now look at this, which compiles and runs without complaint:

```java
class Order {
    int id;              // never explicitly set
    double totalPaid;    // never explicitly set

    void printSummary() {
        System.out.println(id + ": " + totalPaid); // prints "0: 0.0" — no error at all
    }
}
```

Same situation — a variable nobody assigned a value to — but one version is a compile error and the other silently runs and prints zeros. Why the difference?

It comes down to **where the variable lives**, and Java has three categories:

```java
class Order {
    int id = 101;                    // instance variable — one copy per Order object, lives on the heap
    static String currency = "USD";  // static variable — one copy shared by the whole class, in Metaspace

    double total(List<OrderLine> lines) {
        double sum = 0;              // local variable — lives on the stack, only exists during this call
        for (OrderLine line : lines) sum += line.getAmount();
        return sum;
    }
}
```

| Type | Declared | Memory | Default value |
|---|---|---|---|
| Local | Inside a method | Stack | None — must be initialized before use |
| Instance | Inside a class, per object | Heap | Yes (`0`, `false`, `null`) |
| Static | Class level, `static` keyword | Metaspace | Yes |

A **local variable** exists only for the duration of one method call, sitting on that call's stack frame — and because there's no sensible "default" the compiler could invent on your behalf for something so short-lived, Java forces you to assign it a real value before reading it. An **instance variable** belongs to one specific object and lives as long as that object does, on the heap — and because the object is going to exist whether or not you remembered to set every field, Java gives it a safe default (`0` for numbers, `false` for booleans, `null` for objects) so reading it early doesn't crash, it just quietly returns that default. A **static variable** works the same way as an instance variable for defaults, except there's exactly one copy for the entire class, shared by every object of that type, stored in an area called Metaspace rather than inside any one object.

That's the whole explanation for the asymmetry above: `sum` was local, so Java demanded you initialize it. `id` and `totalPaid` were instance fields, so Java quietly handed you `0` and `0.0` instead of refusing to compile — which is exactly how a real bug slips through: a report that should show a real total silently prints `0.0` instead of failing loudly, because nobody actually set `totalPaid` before printing it, and Java never complained.

## 2. Primitive vs Reference Types

Two fields on the same `Order`, both look like ordinary variables:

```java
int quantity = 5;          // primitive
String status = "SHIPPED"; // non-primitive (reference type)
```

Try to use them the same way and the difference shows up immediately:

```java
quantity.toString();  // compile error — int has no methods at all
status.toUpperCase(); // fine — String is an object with real methods
```

`quantity` holds the number `5` directly — there's nothing to call a method *on*, it's just a value sitting in memory. `status`, on the other hand, doesn't hold the characters `"SHIPPED"` directly in the variable itself — it holds a **reference** (an address) pointing at a `String` object elsewhere on the heap, and that object is what actually has methods like `toUpperCase()`.

This is the core split in Java's type system:

| | Primitive | Non-Primitive (reference type) |
|---|---|---|
| Holds | The value itself | A reference to an object on the heap |
| Speed | Faster — no indirection | One extra hop through the reference |
| Methods | None | Has methods (`status.equals(...)`) |
| Default | `0`, `false`, etc. | `null` |

There are exactly eight primitive types in Java, and their sizes and ranges aren't arbitrary trivia — they're exactly what explains the data-loss bugs in the next section:

| Data Type | Size | Default | Range |
|---|---|---|---|
| `byte` | 1 byte | `0` | -128 to 127 |
| `short` | 2 bytes | `0` | -32,768 to 32,767 |
| `int` | 4 bytes | `0` | -2³¹ to 2³¹-1 |
| `long` | 8 bytes | `0L` | -2⁶³ to 2⁶³-1 |
| `float` | 4 bytes | `0.0f` | ~±3.4E38, 6–7 significant digits |
| `double` | 8 bytes | `0.0d` | ~±1.7E308, 15 significant digits |
| `char` | 2 bytes | `' '` | 0 to 65,535 (unsigned, Unicode) |
| `boolean` | JVM-dependent | `false` | `true` / `false` only |

Everything else in Java — `String`, `List`, `Order`, every class you write — is a reference type: a variable of that type is always a pointer to an object, never the object's data sitting directly in the variable.

## 3. Type Casting and Real Data Loss

**Scenario:** you're computing a final invoice amount as a `double` (it has cents), but the field the finance system wants is a whole-dollar `int`.

```java
double price = 19.99;
int wholeDollars = (int) price;
System.out.println(wholeDollars); // 19 — not 20
```

You might expect rounding. You get truncation — the decimal part is simply chopped off, no matter what it was. `19.99` becomes `19`, and so would `19.01`. This is exactly the kind of thing that looks fine in a quick test (`19.0` → `19`, nothing looks wrong) and only surfaces as "why is this invoice a dollar short" once real, non-round numbers show up in production.

That cast — squeezing a `double` into an `int` — is called **narrowing**: converting a bigger type into a smaller one. Java doesn't do this automatically; you have to write `(int)` explicitly, because the conversion can lose information, and the explicit cast is Java's way of forcing you to acknowledge that risk instead of doing it silently behind your back.

Compare that to going the other direction:

```java
int quantity = 10;
double totalWithTax = quantity; // int -> double, no cast needed, nothing lost
```

No cast, no warning, because a `double` can represent every `int` value with room to spare — this direction is called **widening**, and it's always safe, so Java performs it automatically.

Narrowing doesn't just lose decimal digits — it can overflow entirely and wrap around to a completely different number:

```java
int rawScore = 130;
byte compactScore = (byte) rawScore; // -126, not 130 and not 127
```

`byte` only has room for -128 to 127. `130` doesn't fit, so the cast doesn't clamp it to the nearest valid value (127) and doesn't throw an error — it wraps around using two's-complement arithmetic and produces `-126`, a number that looks like it came from nowhere if you don't already know narrowing overflows silently. Picture this happening for real: a field from an external system or a legacy database column is documented as fitting in a `byte`, someone reads a value of `130` into it, and the application now has `-126` sitting in a field, with no exception, no log line, nothing — just a wrong number quietly flowing into the rest of the program.

The rules worth keeping straight, all following from the same idea — narrowing is explicit and can lose data, widening is implicit and never does:

- `double → float` loses precision, because `float` only has about 6–7 significant digits to work with.
- `double/float → int/long` truncates the decimal part — it does **not** round.
- Converting into a smaller integer type (`int → byte`, `int → short`, and so on) can overflow and wrap around silently, exactly like the `byte` example above.

## 4. Autoboxing, Unboxing, and the Integer Cache Trap

**Scenario:** you're comparing two order quantities, both stored as `Integer` (not `int`) because the field is allowed to be `null` when quantity hasn't been set yet.

```java
Integer quantityA = 100;
Integer quantityB = 100;
System.out.println(quantityA == quantityB); // true
```

Looks correct. You ship it. Then a real order comes in with a bigger quantity, and the exact same comparison logic breaks:

```java
Integer quantityA = 200;
Integer quantityB = 200;
System.out.println(quantityA == quantityB); // false
```

Same code, same idea — two `Integer`s holding the same numeric value — and `==` flips from `true` to `false` for no reason that's visible in the code itself. To see why, back up one step to what's actually happening when you write `Integer quantityA = 100;`.

`Integer` is a **wrapper class** — a proper object wrapped around a primitive `int`, so it can be used anywhere an object is required (in a `List<Integer>`, for instance, since generics can't hold a raw `int`). Java automatically converts between the primitive and its wrapper for you: assigning an `int` value to an `Integer` variable is called **autoboxing** (primitive → wrapper object), and assigning an `Integer` back to an `int` variable is **unboxing** (wrapper object → primitive):

```java
Integer boxed = 5;      // autoboxing: int -> Integer
int primitive = boxed;  // unboxing: Integer -> int
```

Now, the trap: `==` on two objects compares whether they're the *exact same object in memory*, not whether they hold equal values. Autoboxing `100` twice should, by that logic, always give you two different objects and `==` should always be `false` — yet the first example above printed `true`. The reason is that the JVM keeps a small cache of already-created `Integer` objects for the range **-128 to 127**, since these are by far the most commonly used values, and reuses one cached object instead of creating a new one every time a value in that range gets boxed. `100` is inside that range, so `quantityA` and `quantityB` both end up pointing at the *same* cached object, and `==` — comparing object identity — happens to come back `true`. `200` is outside the cache range, so each autoboxing creates a genuinely new object, and `==` correctly reports `false`, because they *are* two different objects.

This is precisely the shape a real production bug takes: code that compares order quantities, status codes, or IDs stored as `Integer` using `==` will pass every test you write with small, convenient numbers (they all hit the cache and happen to work), and then fail once a real value in production exceeds 127. The fix, and the rule to just always follow: **compare wrapper objects with `.equals()`, never `==`**, unless you specifically and deliberately mean "are these the same object in memory." This is the exact same trap as comparing two `String`s with `==` instead of `.equals()` — same underlying cause, an object-identity comparison where you meant a value comparison.

There's a second trap hiding in unboxing, and it's about `null`, not caching:

```java
Integer discountPercent = repository.findDiscount(productId); // returns null if no row found
int total = price - (price * discountPercent / 100); // throws NullPointerException here
```

`discountPercent` can legitimately be `null` — the repository found no matching row. The moment that `null` gets used in an arithmetic expression, Java has to unbox it back to a primitive `int` to do the math, and unboxing a `null` reference means calling a method on nothing — it throws `NullPointerException` right there, at the arithmetic line. The confusing part when debugging this for real: the stack trace points at the *arithmetic expression*, which looks completely innocent, not at the repository call several lines (or several methods) earlier that actually returned the `null`. You end up staring at a line of plain subtraction wondering how it could possibly throw, when the real cause is upstream and out of view.

## 5. Why Java Won't Let You Fake a Boolean, or Add a Number to Text

If you've used JavaScript before, this next bit of code looks completely reasonable:

```java
int x = 5 + "5";   // compile error
if (someInt) { }   // compile error
```

In JavaScript, `5 + "5"` happily becomes the string `"55"`, and pretty much anything — a non-zero number, a non-empty string, an object — can stand in for `true` inside an `if`. Neither of those things is true in Java, and both lines above fail to compile, not just at runtime.

Java simply never performs **implicit type coercion** between unrelated types — it won't quietly turn a number into a string to add them, and it won't invent a truthy/falsy meaning for an `int` just because you put it where a `boolean` was expected. An `if` condition must be an actual `boolean` expression, full stop; there's no equivalent of "any non-zero number counts as true" anywhere in the language.

This is a deliberate design choice, not a missing feature: the entire class of bugs where a language silently reinterprets one type as another — a stray `0` accidentally read as `false`, string concatenation happening where arithmetic was intended — simply can't occur in Java, because the compiler refuses to build the program in the first place. If you genuinely want to add a number and a string together as text, you have to say so explicitly (`5 + "" + 5`, or `String.valueOf(5) + "5"`) — Java makes you spell out the intent instead of guessing at it for you.

## Interview Questions and Answers

### 1. Why does an uninitialized local variable fail to compile, but an uninitialized instance field doesn't?

**Answer:** A local variable lives only on the stack for the duration of one method call, and Java's compiler enforces "definite assignment" — it statically checks that every path reaching a read of that variable already wrote to it, and refuses to compile otherwise. An instance (or static) field belongs to an object (or the class) that's going to exist regardless of whether every field was explicitly set, so Java gives it a safe default value (`0`, `false`, `null`) instead of requiring assignment. Reading an unset field just silently returns that default — which is why a forgotten field assignment can produce a wrong-looking result instead of a compile error.

**Follow-up:** Where does each kind of variable physically live? Local on the stack, instance on the heap (inside the object), static in Metaspace (one copy per class, not per object).

### 2. What actually happens when you narrow `int 130` down to a `byte`?

**Answer:** `byte` only holds -128 to 127. `130` doesn't fit, so the cast doesn't clamp or round it — it overflows using two's-complement wraparound and silently produces `-126`. There is no runtime error; the cast "succeeds" and just returns a number you probably didn't expect.

### 3. Why does `Integer a = 100; Integer b = 100; a == b` return `true`, while the same code with `200` returns `false`?

**Answer:** The JVM caches boxed `Integer` objects for values from -128 to 127 and reuses them, so both `100`s are autoboxed to the exact same cached object, and `==` (which compares object identity) reports `true`. `200` is outside the cache range, so autoboxing creates two distinct objects, and `==` correctly reports `false`. The fix that avoids relying on this cache boundary at all: always compare wrapper objects with `.equals()`, never `==`.

**Follow-up:** Does the same caching happen for `Long`, `Short`, and `Byte`? Yes — the same -128 to 127 caching pattern applies to those wrapper types too (`Byte` and `Short`'s full ranges are small enough that they're effectively always cached within their own bounds); `Character` caches 0–127; `Boolean` caches both possible values.

### 4. Why can unboxing a `null` be a confusing bug to track down?

**Answer:** The `NullPointerException` is thrown at the point where the `null` wrapper is unboxed into a primitive — typically an arithmetic expression or a comparison — not at the line that actually produced the `null` (a repository lookup that found no row, for example). The stack trace points at the symptom, an innocent-looking line of math, rather than the cause several lines or methods upstream.

### 5. Widening vs narrowing — which is automatic and which needs an explicit cast, and why?

**Answer:** Widening (a smaller type into a larger one, like `int` to `double`) happens automatically because the destination type can always represent every value of the source type — nothing can be lost. Narrowing (a larger type into a smaller one, like `double` to `int`, or `int` to `byte`) requires an explicit cast because it can truncate or overflow, and the cast exists specifically to make you acknowledge that risk in the code instead of it happening invisibly.

### 6. Does a `double → int` cast round the number?

**Answer:** No — it truncates toward zero, discarding the decimal part entirely regardless of what it was. `(int) 19.99` is `19`, not `20`, and `(int) -19.99` is `-19`, not `-20`. Rounding requires calling `Math.round()` explicitly.

### 7. Why is `if (someInt)` a compile error in Java, when it's valid in JavaScript?

**Answer:** Java requires an `if` condition to be an actual `boolean` expression and performs no truthy/falsy coercion at all — there's no rule anywhere that treats a non-zero number, non-empty string, or object as an implicit `true`. JavaScript defines exactly such coercion rules; Java deliberately omits them to eliminate an entire class of implicit-conversion bugs, at the cost of you having to write the comparison out explicitly (`if (someInt != 0)`).

### 8. What's the practical difference between a primitive `int` field and a reference-type `Integer` field, beyond boxing overhead?

**Answer:** An `int` can never be `null` and always has a real numeric value (defaulting to `0` if unset), so it's safe in arithmetic without a null check. An `Integer` can be `null` — useful for "value not yet known" or "no row found" — but that flexibility means every unboxing operation is a potential `NullPointerException`, and every `==` comparison is a potential cache-boundary trap. Use `Integer` specifically when `null` is a meaningful, intended state; use `int` otherwise.

## Revision Checklist

- [ ] Explain, using the `sum`-vs-`id` example, why an uninitialized local variable is a compile error but an uninitialized instance field silently runs with a default value.
- [ ] State where local, instance, and static variables physically live, and which have default values.
- [ ] Explain the primitive vs reference-type split — what each kind of variable actually holds — and name all eight primitive types with their sizes and ranges.
- [ ] Explain widening vs narrowing, and walk through both the truncation (`19.99 → 19`) and overflow (`130 → -126`) examples of narrowing losing data silently.
- [ ] Explain the `Integer` cache trap end to end: what autoboxing/unboxing are, why the cache exists, why `100 == 100` is `true` but `200 == 200` is `false`, and why `.equals()` is the correct comparison.
- [ ] Explain why unboxing a `null` throws `NullPointerException`, and why the stack trace points at the wrong-looking line.
- [ ] Explain why Java rejects `5 + "5"` as an `int` and `if (someInt)`, and name the concept (no implicit type coercion) that explains both.
