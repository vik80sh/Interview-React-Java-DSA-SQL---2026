# Master Question Bank — Core Java Interview Q&A

This file aggregates every interview question and its full answer from all 13 files in this folder (`Backend/Java/`), in the same order the files are numbered. Each question keeps the exact numbering it has in its source file, and each question's heading links back to the exact section in the original file — via the *Source* line beneath its answer — so you can open the original for the full worked example, code, and surrounding explanation that motivated it. Nothing here has been paraphrased or shortened: every Answer and Follow-up below is copied verbatim from its source file.

---

## [1. JVM and Memory Architecture](01-JVM-Memory-Architecture.md)

### 1. Why is Java called platform-independent?

**Answer:** The compiler (`javac`) produces the same bytecode regardless of the OS it ran on. Each platform then has its own JVM that translates that identical bytecode into native instructions for that specific machine. The source is compiled once; the JVM absorbs the platform-specific part.

*Source: [01-JVM-Memory-Architecture.md#1-why-is-java-called-platformindependent](01-JVM-Memory-Architecture.md#1-why-is-java-called-platformindependent)*

### 2. What's the actual difference between the JDK, JRE, and JVM?

**Answer:** The JVM is the engine that loads classes and executes bytecode. The JRE is the JVM plus the core runtime libraries — enough to *run* compiled code, nothing more. The JDK is the JRE plus the compiler and other development tools — needed to *write and compile* code. Production containers only need a JRE; build machines and developer laptops need a JDK.

*Source: [01-JVM-Memory-Architecture.md#2-whats-the-actual-difference-between-the-jdk-jre-and-jvm](01-JVM-Memory-Architecture.md#2-whats-the-actual-difference-between-the-jdk-jre-and-jvm)*

### 3. What happens, step by step, when you write `Order order = new Order();`?

**Answer:** The class loader ensures `Order`'s class metadata is loaded into the Method Area/Metaspace (only once, the first time it's needed, by whichever loader owns it in the parent-first hierarchy). Memory for the new object is allocated on the heap, in Eden. The constructor runs, initializing its fields. Finally, the reference `order` is stored in the current thread's stack frame, pointing at that heap object.

*Source: [01-JVM-Memory-Architecture.md#3-what-happens-step-by-step-when-you-write-order-order-new-order](01-JVM-Memory-Architecture.md#3-what-happens-step-by-step-when-you-write-order-order-new-order)*

### 4. What's the difference between the interpreter and the JIT compiler?

**Answer:** The interpreter executes bytecode line by line and is used for every method at first. The JIT (Just-In-Time) compiler watches for methods that get called repeatedly ("hot" methods) and compiles those specific methods to native machine code so later calls skip interpretation entirely — which is why a long-running server measurably speeds up as it warms up, not just in a synthetic benchmark loop.

*Source: [01-JVM-Memory-Architecture.md#4-whats-the-difference-between-the-interpreter-and-the-jit-compiler](01-JVM-Memory-Architecture.md#4-whats-the-difference-between-the-interpreter-and-the-jit-compiler)*

### 5. Where are static variables stored, and what does that imply?

**Answer:** In the Method Area (Metaspace) — one copy exists for the whole class, not per instance. That's exactly why a `static` field is shared state across every caller and every thread, and why a static, unbounded cache is a classic memory leak: it's reachable from a GC root for as long as the class is loaded, which in practice means forever.

*Source: [01-JVM-Memory-Architecture.md#5-where-are-static-variables-stored-and-what-does-that-imply](01-JVM-Memory-Architecture.md#5-where-are-static-variables-stored-and-what-does-that-imply)*

### 6. Heap vs Stack — what actually goes where?

**Answer:** Objects and their instance fields live on the heap and are shared across threads. Local variables, method parameters, and call frames live on the stack, and each thread has its own stack. A reference variable itself is a stack value; the object it points to is a heap value.

*Source: [01-JVM-Memory-Architecture.md#6-heap-vs-stack-what-actually-goes-where](01-JVM-Memory-Architecture.md#6-heap-vs-stack-what-actually-goes-where)*

### 7. Explain minor GC vs major/full GC.

**Answer:** Minor GC cleans only the Young Generation (Eden and the Survivor spaces) — fast and frequent, because most objects born there die almost immediately. Major/Full GC cleans the Old Generation, or the whole heap — slower, because it has to walk through objects that are still genuinely reachable. A Full GC pausing a live server for hundreds of milliseconds is a classic real cause of a sudden production latency spike.

*Source: [01-JVM-Memory-Architecture.md#7-explain-minor-gc-vs-majorfull-gc](01-JVM-Memory-Architecture.md#7-explain-minor-gc-vs-majorfull-gc)*

### 8. What's the difference between `OutOfMemoryError` and `StackOverflowError`?

**Answer:** `OutOfMemoryError` means the heap (or Metaspace) is full and GC couldn't reclaim enough — usually an unbounded cache, an oversized result set loaded without pagination, or a true reference leak. `StackOverflowError` means one thread's call stack exceeded its fixed size limit — almost always unbounded or cyclic recursion. They come from entirely different memory regions and have unrelated fixes.

*Source: [01-JVM-Memory-Architecture.md#8-whats-the-difference-between-outofmemoryerror-and-stackoverflowerror](01-JVM-Memory-Architecture.md#8-whats-the-difference-between-outofmemoryerror-and-stackoverflowerror)*

### 9. When does an object actually become eligible for garbage collection?

**Answer:** When no reachable reference chain from a GC root (active thread stacks, static fields, JNI references) reaches it anymore. Setting a variable to `null`, reassigning it, or letting it go out of scope with nothing else referencing it are all ways this can happen — but the underlying rule is reachability from a GC root, not lexical scope in your source code.

*Source: [01-JVM-Memory-Architecture.md#9-when-does-an-object-actually-become-eligible-for-garbage-collection](01-JVM-Memory-Architecture.md#9-when-does-an-object-actually-become-eligible-for-garbage-collection)*

### 10. Does calling `System.gc()` force garbage collection?

**Answer:** No — it's only a hint to the JVM that this might be a reasonable time to collect. The JVM is free to ignore it entirely, and production code should never rely on it running, let alone use it as a fix for an unbounded cache.

*Source: [01-JVM-Memory-Architecture.md#10-does-calling-systemgc-force-garbage-collection](01-JVM-Memory-Architecture.md#10-does-calling-systemgc-force-garbage-collection)*

### 11. Why does comparing pooled string literals with `==` sometimes "work," and why is it still wrong?

**Answer:** Two string literals with identical content point at the same object in the String Pool, so `==` happens to return `true` by coincidence. It breaks the moment either string comes from `new String(...)`, string concatenation built at runtime, deserialization, or any non-literal source — which is unpredictable in real code — so `.equals()`, which compares actual content rather than object identity, is the only correct way to compare string values.

*Source: [01-JVM-Memory-Architecture.md#11-why-does-comparing-pooled-string-literals-with-sometimes-work-and-why-is-it-still-wrong](01-JVM-Memory-Architecture.md#11-why-does-comparing-pooled-string-literals-with-sometimes-work-and-why-is-it-still-wrong)*

### 12. What is escape analysis, and why does it matter?

**Answer:** It's a JIT optimization that detects when an object never "escapes" the method that created it — no external reference to it survives past that method. When the JIT can prove this, it can allocate the object on the stack instead of the heap, or skip the allocation entirely, avoiding GC overhead for it. It happens automatically per method; you don't write different code to trigger it, but it's exactly why "minimize every object allocation" is outdated blanket advice.

*Source: [01-JVM-Memory-Architecture.md#12-what-is-escape-analysis-and-why-does-it-matter](01-JVM-Memory-Architecture.md#12-what-is-escape-analysis-and-why-does-it-matter)*

### 13. Describe the three class loaders and why the hierarchy matters.

**Answer:** Bootstrap loads core JDK classes (`java.lang.*`), Platform/Extension loads JDK extension libraries, and Application loads your own code and its JAR dependencies — the one responsible for essentially everything you write. They're arranged parent-first: a loader asks its parent to try loading a class before attempting it itself, which is what guarantees, for example, that your own code can never accidentally shadow a core class like `java.lang.String`.

*Source: [01-JVM-Memory-Architecture.md#13-describe-the-three-class-loaders-and-why-the-hierarchy-matters](01-JVM-Memory-Architecture.md#13-describe-the-three-class-loaders-and-why-the-hierarchy-matters)*

### 14. Is the JVM itself thread-safe?

**Answer:** Yes, for its own internal bookkeeping — memory management, garbage collection, class loading. That says nothing about *your* code: two threads calling methods on a shared, mutable object still race unless you add your own synchronization (see the [Multithreading guide](08-Multithreading-Concurrency.md)).

*Source: [01-JVM-Memory-Architecture.md#14-is-the-jvm-itself-threadsafe](01-JVM-Memory-Architecture.md#14-is-the-jvm-itself-threadsafe)*

### 15. Why is a singleton Spring bean's instance field dangerous under concurrency, while its local variables aren't?

**Answer:** A singleton bean is one object on the heap, shared by every thread handling every request — so an instance field is one shared memory location every request can race on. A local variable inside a method exists only in that call's own stack frame; each thread has its own stack, so there is no sharing and no race, no matter how many requests run concurrently.

*Source: [01-JVM-Memory-Architecture.md#15-why-is-a-singleton-spring-beans-instance-field-dangerous-under-concurrency-while-its-local-variables-arent](01-JVM-Memory-Architecture.md#15-why-is-a-singleton-spring-beans-instance-field-dangerous-under-concurrency-while-its-local-variables-arent)*


## [2. Variables, Data Types, and Type Casting](02-Variables-DataTypes-Casting.md)

### 1. Why does an uninitialized local variable fail to compile, but an uninitialized instance field doesn't?

**Answer:** A local variable lives only on the stack for the duration of one method call, and Java's compiler enforces "definite assignment" — it statically checks that every path reaching a read of that variable already wrote to it, and refuses to compile otherwise. An instance (or static) field belongs to an object (or the class) that's going to exist regardless of whether every field was explicitly set, so Java gives it a safe default value (`0`, `false`, `null`) instead of requiring assignment. Reading an unset field just silently returns that default — which is why a forgotten field assignment can produce a wrong-looking result instead of a compile error.

**Follow-up:** Where does each kind of variable physically live? Local on the stack, instance on the heap (inside the object), static in Metaspace (one copy per class, not per object).

*Source: [02-Variables-DataTypes-Casting.md#1-why-does-an-uninitialized-local-variable-fail-to-compile-but-an-uninitialized-instance-field-doesnt](02-Variables-DataTypes-Casting.md#1-why-does-an-uninitialized-local-variable-fail-to-compile-but-an-uninitialized-instance-field-doesnt)*

### 2. What actually happens when you narrow `int 130` down to a `byte`?

**Answer:** `byte` only holds -128 to 127. `130` doesn't fit, so the cast doesn't clamp or round it — it overflows using two's-complement wraparound and silently produces `-126`. There is no runtime error; the cast "succeeds" and just returns a number you probably didn't expect.

*Source: [02-Variables-DataTypes-Casting.md#2-what-actually-happens-when-you-narrow-int-130-down-to-a-byte](02-Variables-DataTypes-Casting.md#2-what-actually-happens-when-you-narrow-int-130-down-to-a-byte)*

### 3. Why does `Integer a = 100; Integer b = 100; a == b` return `true`, while the same code with `200` returns `false`?

**Answer:** The JVM caches boxed `Integer` objects for values from -128 to 127 and reuses them, so both `100`s are autoboxed to the exact same cached object, and `==` (which compares object identity) reports `true`. `200` is outside the cache range, so autoboxing creates two distinct objects, and `==` correctly reports `false`. The fix that avoids relying on this cache boundary at all: always compare wrapper objects with `.equals()`, never `==`.

**Follow-up:** Does the same caching happen for `Long`, `Short`, and `Byte`? Yes — the same -128 to 127 caching pattern applies to those wrapper types too (`Byte` and `Short`'s full ranges are small enough that they're effectively always cached within their own bounds); `Character` caches 0–127; `Boolean` caches both possible values.

*Source: [02-Variables-DataTypes-Casting.md#3-why-does-integer-a-100-integer-b-100-a-b-return-true-while-the-same-code-with-200-returns-false](02-Variables-DataTypes-Casting.md#3-why-does-integer-a-100-integer-b-100-a-b-return-true-while-the-same-code-with-200-returns-false)*

### 4. Why can unboxing a `null` be a confusing bug to track down?

**Answer:** The `NullPointerException` is thrown at the point where the `null` wrapper is unboxed into a primitive — typically an arithmetic expression or a comparison — not at the line that actually produced the `null` (a repository lookup that found no row, for example). The stack trace points at the symptom, an innocent-looking line of math, rather than the cause several lines or methods upstream.

*Source: [02-Variables-DataTypes-Casting.md#4-why-can-unboxing-a-null-be-a-confusing-bug-to-track-down](02-Variables-DataTypes-Casting.md#4-why-can-unboxing-a-null-be-a-confusing-bug-to-track-down)*

### 5. Widening vs narrowing — which is automatic and which needs an explicit cast, and why?

**Answer:** Widening (a smaller type into a larger one, like `int` to `double`) happens automatically because the destination type can always represent every value of the source type — nothing can be lost. Narrowing (a larger type into a smaller one, like `double` to `int`, or `int` to `byte`) requires an explicit cast because it can truncate or overflow, and the cast exists specifically to make you acknowledge that risk in the code instead of it happening invisibly.

*Source: [02-Variables-DataTypes-Casting.md#5-widening-vs-narrowing-which-is-automatic-and-which-needs-an-explicit-cast-and-why](02-Variables-DataTypes-Casting.md#5-widening-vs-narrowing-which-is-automatic-and-which-needs-an-explicit-cast-and-why)*

### 6. Does a `double → int` cast round the number?

**Answer:** No — it truncates toward zero, discarding the decimal part entirely regardless of what it was. `(int) 19.99` is `19`, not `20`, and `(int) -19.99` is `-19`, not `-20`. Rounding requires calling `Math.round()` explicitly.

*Source: [02-Variables-DataTypes-Casting.md#6-does-a-double-→-int-cast-round-the-number](02-Variables-DataTypes-Casting.md#6-does-a-double-→-int-cast-round-the-number)*

### 7. Why is `if (someInt)` a compile error in Java, when it's valid in JavaScript?

**Answer:** Java requires an `if` condition to be an actual `boolean` expression and performs no truthy/falsy coercion at all — there's no rule anywhere that treats a non-zero number, non-empty string, or object as an implicit `true`. JavaScript defines exactly such coercion rules; Java deliberately omits them to eliminate an entire class of implicit-conversion bugs, at the cost of you having to write the comparison out explicitly (`if (someInt != 0)`).

*Source: [02-Variables-DataTypes-Casting.md#7-why-is-if-someint-a-compile-error-in-java-when-its-valid-in-javascript](02-Variables-DataTypes-Casting.md#7-why-is-if-someint-a-compile-error-in-java-when-its-valid-in-javascript)*

### 8. What's the practical difference between a primitive `int` field and a reference-type `Integer` field, beyond boxing overhead?

**Answer:** An `int` can never be `null` and always has a real numeric value (defaulting to `0` if unset), so it's safe in arithmetic without a null check. An `Integer` can be `null` — useful for "value not yet known" or "no row found" — but that flexibility means every unboxing operation is a potential `NullPointerException`, and every `==` comparison is a potential cache-boundary trap. Use `Integer` specifically when `null` is a meaningful, intended state; use `int` otherwise.

*Source: [02-Variables-DataTypes-Casting.md#8-whats-the-practical-difference-between-a-primitive-int-field-and-a-referencetype-integer-field-beyond-boxing-overhead](02-Variables-DataTypes-Casting.md#8-whats-the-practical-difference-between-a-primitive-int-field-and-a-referencetype-integer-field-beyond-boxing-overhead)*


## [3. OOP (Object-Oriented Programming) Fundamentals](03-OOP-Fundamentals.md)

### 1. What are the four pillars of OOP, and can you give a one-line reason for each?

**Answer:** Encapsulation protects an object's invariants by controlling how its state can change. Inheritance lets a class reuse and extend another class's behavior through an IS-A relationship, instead of copy-pasting fields and methods. Polymorphism lets calling code work against a common interface while the actual behavior varies by the real runtime type, replacing branch-on-type logic. Abstraction publishes what something does while hiding how it does it, so the caller's code doesn't change when the implementation does.

*Source: [03-OOP-Fundamentals.md#1-what-are-the-four-pillars-of-oop-and-can-you-give-a-oneline-reason-for-each](03-OOP-Fundamentals.md#1-what-are-the-four-pillars-of-oop-and-can-you-give-a-oneline-reason-for-each)*

### 2. Why is "private fields + generated getters and setters" not automatically good encapsulation?

**Answer:** Encapsulation's job is protecting an invariant, not just adding a method call in front of a field. A setter that assigns any value with no validation offers the exact same lack of safety as a public field would. Real encapsulation, like `BankAccount.withdraw()` rejecting a withdrawal that would overdraw the account, validates before it mutates state — that's what actually makes it encapsulated, not the presence of `private`.

**Follow-up:** Can a class be fully encapsulated with a public getter and no setter at all? Yes — as long as nothing lets an outside caller push the object into an invalid state, hiding a field isn't even required for encapsulation to hold.

*Source: [03-OOP-Fundamentals.md#2-why-is-private-fields-generated-getters-and-setters-not-automatically-good-encapsulation](03-OOP-Fundamentals.md#2-why-is-private-fields-generated-getters-and-setters-not-automatically-good-encapsulation)*

### 3. Why does copy-pasting fields and methods between `Employee` and `Manager` become a real problem, and how does inheritance fix it?

**Answer:** Duplicated logic (like `printPayslip()`) has to be fixed in every copy when a bug shows up, and every new employee type multiplies the copies. Inheritance lets `Manager extends Employee`, reusing `Employee`'s fields and methods and overriding only `computePay()`, the one part that's genuinely different — a fix to the shared logic in `Employee` now applies to every subclass automatically.

*Source: [03-OOP-Fundamentals.md#3-why-does-copypasting-fields-and-methods-between-employee-and-manager-become-a-real-problem-and-how-does-inheritance-fix-it](03-OOP-Fundamentals.md#3-why-does-copypasting-fields-and-methods-between-employee-and-manager-become-a-real-problem-and-how-does-inheritance-fix-it)*

### 4. Give a real example of runtime polymorphism, and explain why it's useful.

**Answer:** A `checkout(PaymentMethod method, BigDecimal amount)` method that calls `method.charge(amount)` without knowing whether `method` is a credit card, UPI (Unified Payments Interface), or PayPal implementation. The JVM resolves `charge()` to the correct override based on the object's actual type at runtime. It's useful because it replaces an `if`/`else if` chain that would otherwise have to be repeated everywhere payment-type branching happens — adding a brand-new payment type means writing one new class, touching zero existing call sites.

*Source: [03-OOP-Fundamentals.md#4-give-a-real-example-of-runtime-polymorphism-and-explain-why-its-useful](03-OOP-Fundamentals.md#4-give-a-real-example-of-runtime-polymorphism-and-explain-why-its-useful)*

### 5. How is method overloading resolved differently from method overriding?

**Answer:** Overloading is resolved at compile time, based on the declared types of the arguments you pass and which overload's parameter list matches. Overriding is resolved at runtime, based on the actual object's real class, regardless of the reference type used to call it.

*Source: [03-OOP-Fundamentals.md#5-how-is-method-overloading-resolved-differently-from-method-overriding](03-OOP-Fundamentals.md#5-how-is-method-overloading-resolved-differently-from-method-overriding)*

### 6. When would you choose an abstract class over an interface?

**Answer:** When multiple related implementations share real, non-trivial logic — not just a method signature — that would otherwise be duplicated in every implementation, like the shared logging code in `BaseNotificationSender`. An interface fits better when you're defining a pure capability that unrelated classes need to honor, especially if a class needs to satisfy more than one such contract at once.

*Source: [03-OOP-Fundamentals.md#6-when-would-you-choose-an-abstract-class-over-an-interface](03-OOP-Fundamentals.md#6-when-would-you-choose-an-abstract-class-over-an-interface)*

### 7. Why can't a class extend two other classes but can implement multiple interfaces?

**Answer:** Java deliberately disallows multiple class inheritance to avoid the "diamond problem" — ambiguity when two parent classes define conflicting behavior for the same inherited method. Interfaces avoid that ambiguity because, historically, they carried no implementation at all; even with `default` methods today, Java forces you to explicitly resolve a conflict if two interfaces provide clashing defaults.

*Source: [03-OOP-Fundamentals.md#7-why-cant-a-class-extend-two-other-classes-but-can-implement-multiple-interfaces](03-OOP-Fundamentals.md#7-why-cant-a-class-extend-two-other-classes-but-can-implement-multiple-interfaces)*

### 8. What's the practical difference between a static nested class and an inner (non-static) class?

**Answer:** A static nested class behaves like an ordinary class that's simply namespaced inside another — it needs no enclosing instance to exist. An inner class holds an implicit reference to the specific outer instance that created it, can access that instance's fields directly, and cannot exist independently of it.

*Source: [03-OOP-Fundamentals.md#8-whats-the-practical-difference-between-a-static-nested-class-and-an-inner-nonstatic-class](03-OOP-Fundamentals.md#8-whats-the-practical-difference-between-a-static-nested-class-and-an-inner-nonstatic-class)*

### 9. Why is a `static` method in a subclass with the same signature as a parent's `static` method not "overriding"?

**Answer:** It's method hiding, not overriding. Static methods are resolved by the reference's declared (compile-time) type, not the object's actual runtime type, so there's no dynamic dispatch involved — the opposite of what overriding means.

**Follow-up:** What happens to a `final` method in a subclass? It can't be redeclared at all — `final` exists specifically to close off that extension point.

*Source: [03-OOP-Fundamentals.md#9-why-is-a-static-method-in-a-subclass-with-the-same-signature-as-a-parents-static-method-not-overriding](03-OOP-Fundamentals.md#9-why-is-a-static-method-in-a-subclass-with-the-same-signature-as-a-parents-static-method-not-overriding)*


## [4. Constructors, equals()/hashCode(), and Java's Keyword Trio](04-Constructors-Equals-HashCode-Keywords.md)

### 1. Why must `this(...)` or `super(...)` be the first statement in a constructor?

**Answer:** Java requires the object's parent state — or an alternate constructor's full initialization — to be established before this constructor's own body runs, so there's exactly one, unambiguous initialization order. Allowing it anywhere else would let a constructor use fields before they're guaranteed to exist yet.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#1-why-must-this-or-super-be-the-first-statement-in-a-constructor](04-Constructors-Equals-HashCode-Keywords.md#1-why-must-this-or-super-be-the-first-statement-in-a-constructor)*

### 2. What happens to the "default" no-arg constructor once you write your own constructor?

**Answer:** Java only auto-generates a no-arg constructor when a class declares no constructor at all. The instant you write any constructor yourself, that automatic one disappears — code elsewhere calling `new SomeClass()` will now fail to compile unless you explicitly write a no-arg constructor too.

**Follow-up:** Why is `id = id;` inside a constructor a silent bug rather than a compile error? Because the bare parameter name shadows the field of the same name — the statement assigns the parameter to itself, and the field is never touched. `this.id = id;` is required to reach the field. If the field were `final`, the compiler would actually catch this, since it would see the field is never definitely assigned.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#2-what-happens-to-the-default-noarg-constructor-once-you-write-your-own-constructor](04-Constructors-Equals-HashCode-Keywords.md#2-what-happens-to-the-default-noarg-constructor-once-you-write-your-own-constructor)*

### 3. When does a static block run, relative to instance field initializers and the constructor?

**Answer:** Exactly once — the first time the class is loaded by the JVM — before any instance of that class is created, and therefore before any field initializer or constructor body for that class ever runs. The full order for a brand-new object is: static block (once, class load) → instance field initializers → constructor body.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#3-when-does-a-static-block-run-relative-to-instance-field-initializers-and-the-constructor](04-Constructors-Equals-HashCode-Keywords.md#3-when-does-a-static-block-run-relative-to-instance-field-initializers-and-the-constructor)*

### 4. Why does overriding `equals()` without `hashCode()` break lookups in a `HashSet`?

**Answer:** A `HashSet` uses `hashCode()` first to pick which bucket to look in, then `equals()` second to compare against whatever's already in that bucket. If `hashCode()` is left at its default (identity-based), two logically-equal objects can land in different buckets and never even get compared with `equals()` — the set reports the object as missing even though an "equal" one is sitting in a different bucket.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#4-why-does-overriding-equals-without-hashcode-break-lookups-in-a-hashset](04-Constructors-Equals-HashCode-Keywords.md#4-why-does-overriding-equals-without-hashcode-break-lookups-in-a-hashset)*

### 5. What's the exact contract between `equals()` and `hashCode()`?

**Answer:** If two objects are equal according to `equals()`, they must return the same `hashCode()`. The reverse isn't required — two unequal objects are allowed to share a hash code, which is called a collision, and `equals()` is exactly what distinguishes them once they're compared inside the same bucket.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#5-whats-the-exact-contract-between-equals-and-hashcode](04-Constructors-Equals-HashCode-Keywords.md#5-whats-the-exact-contract-between-equals-and-hashcode)*

### 6. Why is mutating a field used in `equals()`/`hashCode()` dangerous after the object is already a `HashSet`/`HashMap` key?

**Answer:** The object's bucket was computed from that field's value at insertion time, and nothing re-computes it automatically when the field later changes. A subsequent lookup computes a bucket based on the field's current value, which no longer matches the bucket the object actually lives in, so the lookup silently fails to find it.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#6-why-is-mutating-a-field-used-in-equalshashcode-dangerous-after-the-object-is-already-a-hashsethashmap-key](04-Constructors-Equals-HashCode-Keywords.md#6-why-is-mutating-a-field-used-in-equalshashcode-dangerous-after-the-object-is-already-a-hashsethashmap-key)*

### 7. How does a `HashMap`/`HashSet` resolve a hash collision internally?

**Answer:** Multiple objects with the same hash code land in the same bucket, and within that bucket `equals()` is used to tell them apart. Since Java 8, once a single bucket collects enough entries, its internal storage switches from a plain linked list to a balanced tree, keeping worst-case lookups fast even under heavy collisions.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#7-how-does-a-hashmaphashset-resolve-a-hash-collision-internally](04-Constructors-Equals-HashCode-Keywords.md#7-how-does-a-hashmaphashset-resolve-a-hash-collision-internally)*

### 8. Difference between `final`, `finally`, and `finalize()`?

**Answer:** `final` is a keyword/modifier restricting reassignment of a variable, overriding of a method, or extension of a class. `finally` is a block attached to a `try` statement that always runs afterward (barring `System.exit()` or a JVM crash), typically used for cleanup. `finalize()` is a deprecated, unreliable method the garbage collector may call before reclaiming an object — real cleanup should use `try`-with-resources instead.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#8-difference-between-final-finally-and-finalize](04-Constructors-Equals-HashCode-Keywords.md#8-difference-between-final-finally-and-finalize)*

### 9. Can a `finally` block ever be skipped?

**Answer:** Yes, in exactly two cases: `System.exit()` terminates the JVM immediately without running any pending `finally` blocks, and a JVM crash skips everything. Under normal exception flow — even a `return` inside the `try` or `catch` — `finally` still runs first, before control actually leaves the method.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#9-can-a-finally-block-ever-be-skipped](04-Constructors-Equals-HashCode-Keywords.md#9-can-a-finally-block-ever-be-skipped)*

### 10. Why was `finalize()` effectively phased out in favor of `try`-with-resources?

**Answer:** `finalize()` gives no guarantee about when the garbage collector will call it, or whether it runs at all before JVM shutdown — that unpredictable timing made it unreliable for real cleanup like closing files, sockets, or connections. `try`-with-resources calls `close()` deterministically the instant the block exits, success or failure, with no such uncertainty.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#10-why-was-finalize-effectively-phased-out-in-favor-of-trywithresources](04-Constructors-Equals-HashCode-Keywords.md#10-why-was-finalize-effectively-phased-out-in-favor-of-trywithresources)*

### 11. Can a constructor call both `this(...)` and `super(...)`?

**Answer:** No. Only one statement can be first in a constructor body, and both `this(...)` and `super(...)` are required to be that first statement — so a constructor picks exactly one, never both.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#11-can-a-constructor-call-both-this-and-super](04-Constructors-Equals-HashCode-Keywords.md#11-can-a-constructor-call-both-this-and-super)*

### 12. If a parent class has no no-arg constructor, what happens to a subclass that doesn't call `super(...)` explicitly?

**Answer:** It fails to compile. Java only inserts an implicit, silent `super()` call for you when the parent class actually has a matching no-arg constructor available. Once the parent's only constructor requires arguments, every subclass constructor must call `super(...)` explicitly with the right values, as its first statement.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#12-if-a-parent-class-has-no-noarg-constructor-what-happens-to-a-subclass-that-doesnt-call-super-explicitly](04-Constructors-Equals-HashCode-Keywords.md#12-if-a-parent-class-has-no-noarg-constructor-what-happens-to-a-subclass-that-doesnt-call-super-explicitly)*


## [5. String Handling](05-String-Handling.md)

### 1. `String a = "hello"; String b = "hello";` — what does `a == b` return, and why?

**Answer:** `true`. Both are string literals, so both point to the same object in the String Constant Pool — the JVM never creates a second object for identical literal content.

*Source: [05-String-Handling.md#1-string-a-hello-string-b-hello-what-does-a-b-return-and-why](05-String-Handling.md#1-string-a-hello-string-b-hello-what-does-a-b-return-and-why)*

### 2. `String a = new String("hello"); String b = new String("hello");` — what does `a == b` return?

**Answer:** `false`. `new String(...)` explicitly forces creation of a new object on the heap outside the pool, every time, regardless of content — so `a` and `b` are two distinct objects even though `a.equals(b)` is `true`.

*Source: [05-String-Handling.md#2-string-a-new-stringhello-string-b-new-stringhello-what-does-a-b-return](05-String-Handling.md#2-string-a-new-stringhello-string-b-new-stringhello-what-does-a-b-return)*

### 3. Why does `String c = b + "llo"` (where `b` is a plain variable) produce a different object than the equivalent literal, but using `final String b` doesn't?

**Answer:** With a plain variable, the compiler can't guarantee `b`'s value at compile time, so the concatenation happens at runtime (via an internally generated `StringBuilder`) and produces a new heap object outside the pool. Marking `b` as `final` with a compile-time-constant value lets the compiler treat it as a constant and fold the whole expression at compile time, landing the result in the pool just like a literal.

**Follow-up:** What does `intern()` do for a string like `c`? It checks the pool for existing content that matches and returns that pooled reference, adding `c`'s content to the pool if it wasn't already there.

*Source: [05-String-Handling.md#3-why-does-string-c-b-llo-where-b-is-a-plain-variable-produce-a-different-object-than-the-equivalent-literal-but-using-final-string-b-doesnt](05-String-Handling.md#3-why-does-string-c-b-llo-where-b-is-a-plain-variable-produce-a-different-object-than-the-equivalent-literal-but-using-final-string-b-doesnt)*

### 4. What does `s.concat(" world")` do if you never assign its result back to `s`?

**Answer:** Nothing observable — `concat()` returns a brand-new `String`, but since strings are immutable, `s` itself is never modified. The correct usage is `s = s.concat(" world")`. This is a very common real bug when someone assumes `String` methods mutate in place, and the same mistake shows up with `trim()` and `replace()`.

*Source: [05-String-Handling.md#4-what-does-sconcat-world-do-if-you-never-assign-its-result-back-to-s](05-String-Handling.md#4-what-does-sconcat-world-do-if-you-never-assign-its-result-back-to-s)*

### 5. Why is building a large string with `+` inside a loop a real performance problem?

**Answer:** Because `String` is immutable, every `+` inside the loop discards the previous string and allocates an entirely new one holding the combined text — for a loop of N iterations, that's roughly N throwaway objects and repeated copying of an ever-growing block of text. `StringBuilder` fixes this by mutating one growable buffer in place instead of allocating a new object per append.

*Source: [05-String-Handling.md#5-why-is-building-a-large-string-with-inside-a-loop-a-real-performance-problem](05-String-Handling.md#5-why-is-building-a-large-string-with-inside-a-loop-a-real-performance-problem)*

### 6. Why doesn't `StringBuilder.equals()` compare content the way `String.equals()` does?

**Answer:** `StringBuilder` never overrides `equals()`, so it falls back to `Object`'s default — a reference comparison, identical to `==`. Two `StringBuilder`s with the same text are never "equal" by `.equals()` unless they're the literal same object; you'd compare `sb1.toString().equals(sb2.toString())` instead.

*Source: [05-String-Handling.md#6-why-doesnt-stringbuilderequals-compare-content-the-way-stringequals-does](05-String-Handling.md#6-why-doesnt-stringbuilderequals-compare-content-the-way-stringequals-does)*

### 7. When would you choose `StringBuffer` over `StringBuilder`?

**Answer:** Only when the exact same builder instance is genuinely mutated by multiple threads concurrently and that shared mutation is actually required — a fairly rare situation, since it's usually cleaner to let each thread build its own `StringBuilder` and merge the results afterward. `StringBuilder` is the default choice everywhere else because it's faster and unsynchronized.

*Source: [05-String-Handling.md#7-when-would-you-choose-stringbuffer-over-stringbuilder](05-String-Handling.md#7-when-would-you-choose-stringbuffer-over-stringbuilder)*

### 8. Why is String immutability actually useful, beyond "it's just how Java designed it"?

**Answer:** It lets many references share one pooled object safely with no risk of one caller corrupting it for everyone else, makes `String` inherently thread-safe with no synchronization needed, and makes it safe to use as a `HashMap`/`HashSet` key — a mutable key would risk the exact bucket-mismatch bug described for `equals()`/`hashCode()` in the constructors/equals/hashCode guide.

*Source: [05-String-Handling.md#8-why-is-string-immutability-actually-useful-beyond-its-just-how-java-designed-it](05-String-Handling.md#8-why-is-string-immutability-actually-useful-beyond-its-just-how-java-designed-it)*

### 9. For primitives like `int`, does the `==` vs `.equals()` distinction still apply?

**Answer:** No — `==` on a primitive compares the value directly, since there's no separate object identity involved. The `==` vs `.equals()` trap is specific to comparing objects, and `String` is where beginners hit it constantly because a `String` literal's pooling makes `==` *look* like it's comparing content, right up until a `new String(...)` or a non-pooled value breaks that assumption.

*Source: [05-String-Handling.md#9-for-primitives-like-int-does-the-vs-equals-distinction-still-apply](05-String-Handling.md#9-for-primitives-like-int-does-the-vs-equals-distinction-still-apply)*


## [6. Collections Framework](06-Collections-Framework.md)

### 1. What's the difference between `Collection` and `Collections`?

**Answer:** `Collection` is an interface — the root of the framework, extended by `List`, `Set`, and `Queue`. `Collections` is an unrelated static utility class offering helper methods like `sort`, `unmodifiableList`, and `synchronizedList` that operate on collections you already have. One is a type; the other is a toolbox.

*Source: [06-Collections-Framework.md#1-whats-the-difference-between-collection-and-collections](06-Collections-Framework.md#1-whats-the-difference-between-collection-and-collections)*

### 2. `ArrayList` vs `LinkedList` — how would you actually decide, in a real system?

**Answer:** `ArrayList` for anything read-heavy with occasional appends, which covers most real lists (order history, search results) — `get(i)` is `O(1)` and appends are cheap. `LinkedList` only in the rare case of genuinely frequent inserts/deletes at arbitrary positions via an iterator — and even then, `ArrayDeque` usually beats it for the common queue/stack shape, since it avoids the per-node object overhead a linked list pays for.

**Follow-up:** Why is inserting at index 0 of a large `ArrayList` a million times so slow? Every insert at the front has to shift every existing element one slot to the right, so a single insert is `O(n)` and a million of them is roughly `O(n²)` — the fix is a `LinkedList` or `ArrayDeque`, where inserting at an end is `O(1)`.

*Source: [06-Collections-Framework.md#2-arraylist-vs-linkedlist-how-would-you-actually-decide-in-a-real-system](06-Collections-Framework.md#2-arraylist-vs-linkedlist-how-would-you-actually-decide-in-a-real-system)*

### 3. How would you implement a bounded LRU cache with minimal code?

**Answer:** A `LinkedHashMap` constructed with `accessOrder = true`, overriding `removeEldestEntry` to return `true` once the map exceeds the desired capacity. That's a complete, correct LRU (Least Recently Used) cache without hand-rolling a doubly-linked list plus hash map.

*Source: [06-Collections-Framework.md#3-how-would-you-implement-a-bounded-lru-cache-with-minimal-code](06-Collections-Framework.md#3-how-would-you-implement-a-bounded-lru-cache-with-minimal-code)*

### 4. Why is `HashMap` not thread-safe, and what would you use instead in a multithreaded service?

**Answer:** Concurrent `put`/resize operations can corrupt its internal bucket structure or lose updates, since there's no internal locking or coordination. `ConcurrentHashMap` is the standard real-world replacement — it partitions locking so concurrent reads and writes on different keys don't block each other, unlike wrapping a `HashMap` with `Collections.synchronizedMap`, which serializes every access behind one lock.

*Source: [06-Collections-Framework.md#4-why-is-hashmap-not-threadsafe-and-what-would-you-use-instead-in-a-multithreaded-service](06-Collections-Framework.md#4-why-is-hashmap-not-threadsafe-and-what-would-you-use-instead-in-a-multithreaded-service)*

### 5. Walk through what happens internally on `map.put(key, value)`.

**Answer:** `key.hashCode()` is computed and mixed into a bucket index. If that bucket is empty, the entry is stored directly. If not (a collision), `equals()` checks existing entries in that bucket for a match — replacing the value if found, or adding a new entry to the bucket (a linked list, or a Red-Black Tree if that bucket has grown large enough, since Java 8) if not.

*Source: [06-Collections-Framework.md#5-walk-through-what-happens-internally-on-mapputkey-value](06-Collections-Framework.md#5-walk-through-what-happens-internally-on-mapputkey-value)*

### 6. What is the load factor, and why does it matter for performance?

**Answer:** It's the fill-ratio threshold (default `0.75`) at which the map resizes (typically doubling capacity) and rehashes every entry into the new bucket array, because each entry's bucket index depends on the array's size. Resizing is `O(n)`, so repeated resizes during a large bulk load are wasted work — pre-sizing the map with `new HashMap<>(expectedSize)` avoids that churn.

*Source: [06-Collections-Framework.md#6-what-is-the-load-factor-and-why-does-it-matter-for-performance](06-Collections-Framework.md#6-what-is-the-load-factor-and-why-does-it-matter-for-performance)*

### 7. Why does removing an element with `list.remove(element)` inside a `for-each` loop throw `ConcurrentModificationException`?

**Answer:** `ArrayList`'s iterator is fail-fast: it tracks a modification count and checks it on every `next()` call. Removing directly on the list (not through the iterator) bumps that count out from under the iterator, and the iterator throws rather than risk returning an inconsistent view. The fix is `iterator.remove()`, which keeps the iterator's own bookkeeping in sync.

*Source: [06-Collections-Framework.md#7-why-does-removing-an-element-with-listremoveelement-inside-a-foreach-loop-throw-concurrentmodificationexception](06-Collections-Framework.md#7-why-does-removing-an-element-with-listremoveelement-inside-a-foreach-loop-throw-concurrentmodificationexception)*

### 8. What's the difference between fail-fast and fail-safe iteration?

**Answer:** Fail-fast collections (`ArrayList`, `HashMap`, and most standard collections) detect an unexpected structural change mid-iteration and throw `ConcurrentModificationException` immediately. Fail-safe collections (`ConcurrentHashMap`'s iterator, `CopyOnWriteArrayList`) tolerate concurrent modification without throwing, typically by iterating a snapshot — the trade-off is the iteration might not reflect changes made while it's running.

*Source: [06-Collections-Framework.md#8-whats-the-difference-between-failfast-and-failsafe-iteration](06-Collections-Framework.md#8-whats-the-difference-between-failfast-and-failsafe-iteration)*

### 9. Comparable vs Comparator — when do you reach for each?

**Answer:** `Comparable` (via `compareTo`) when a class has one obvious natural ordering that belongs to the class itself, like sorting employees by salary for payroll. `Comparator` when you need a different, situational ordering — sorting the same employees by name for a directory screen — without modifying the class, and you can have as many `Comparator`s as you need.

*Source: [06-Collections-Framework.md#9-comparable-vs-comparator-when-do-you-reach-for-each](06-Collections-Framework.md#9-comparable-vs-comparator-when-do-you-reach-for-each)*

### 10. Why does `TreeMap`/`TreeSet` not allow a `null` key, while `HashMap`/`HashSet` allow one?

**Answer:** A `TreeMap`/`TreeSet` needs to compare every key to maintain sorted order, and comparing `null` against anything throws `NullPointerException` — there's no natural ordering for `null`. `HashMap`/`HashSet` only need `hashCode()`/`equals()`, and `null` is handled as a special case internally, so one `null` key is allowed.

*Source: [06-Collections-Framework.md#10-why-does-treemaptreeset-not-allow-a-null-key-while-hashmaphashset-allow-one](06-Collections-Framework.md#10-why-does-treemaptreeset-not-allow-a-null-key-while-hashmaphashset-allow-one)*

### 11. Why should `PriorityQueue` not be treated as a regular queue?

**Answer:** `poll()` doesn't return the element that's been waiting longest — it returns the smallest element according to the given `Comparator` (or natural ordering via `Comparable`), backed by a min-heap. It's the right tool specifically when "most urgent/most important next" should beat strict arrival order, like processing support tickets by severity instead of FIFO (First In, First Out).

*Source: [06-Collections-Framework.md#11-why-should-priorityqueue-not-be-treated-as-a-regular-queue](06-Collections-Framework.md#11-why-should-priorityqueue-not-be-treated-as-a-regular-queue)*


## [7. Exception Handling](07-Exception-Handling.md)

### 1. Checked vs unchecked exceptions — how do you decide which to use for a new exception type?

**Answer:** Checked when the failure is genuinely recoverable and the caller can be reasonably expected to plan for it at compile time (a missing file, a network call that can time out). Unchecked for programming errors and most business-rule violations — forcing every method in a deep call chain to declare `throws` for an exception it can't itself handle is exactly the ceremony most modern services avoid by making business exceptions extend `RuntimeException`.

*Source: [07-Exception-Handling.md#1-checked-vs-unchecked-exceptions-how-do-you-decide-which-to-use-for-a-new-exception-type](07-Exception-Handling.md#1-checked-vs-unchecked-exceptions-how-do-you-decide-which-to-use-for-a-new-exception-type)*

### 2. Why use exceptions instead of returning an error code?

**Answer:** A return code is only checked if the caller remembers to check it, and nothing enforces that — a forgotten check lets the program silently continue with a failure it never noticed. Throwing an exception stops execution immediately at the point of failure and unwinds the stack until something catches it, so a failure can't be silently ignored by accident, and it carries a type, a message, and a full stack trace that a bare int or null never could.

*Source: [07-Exception-Handling.md#2-why-use-exceptions-instead-of-returning-an-error-code](07-Exception-Handling.md#2-why-use-exceptions-instead-of-returning-an-error-code)*

### 3. Does `finally` run if the `try` block has a `return` statement?

**Answer:** Yes. The return value is computed, then `finally` executes, then control actually returns to the caller — unless `finally` itself returns or throws, which silently discards the original outcome. That's a real footgun and a good reason never to `return` (or `throw`) from inside a `finally` block.

**Follow-up:** What's the difference between `throw` and `throws`? `throw` is a statement that actually raises an exception at that line. `throws` is a method-signature declaration saying this method might propagate a checked exception, so callers know to handle or declare it.

*Source: [07-Exception-Handling.md#3-does-finally-run-if-the-try-block-has-a-return-statement](07-Exception-Handling.md#3-does-finally-run-if-the-try-block-has-a-return-statement)*

### 4. Why must more specific exceptions be caught before more general ones in the same `try`?

**Answer:** Catch blocks are evaluated top to bottom and only the first match runs. If a general exception type is caught first, a more specific subtype catch block placed after it becomes unreachable — every instance of the subtype would already match the general catch first. Java rejects this ordering at compile time for exception types with a real subclass relationship, rather than letting the dead code through.

*Source: [07-Exception-Handling.md#4-why-must-more-specific-exceptions-be-caught-before-more-general-ones-in-the-same-try](07-Exception-Handling.md#4-why-must-more-specific-exceptions-be-caught-before-more-general-ones-in-the-same-try)*

### 5. Why should you always pass the original exception as the `cause` when wrapping it in a custom exception?

**Answer:** Without the cause, the new exception's stack trace only shows where you threw the wrapper — the actual root cause (e.g. a database timeout) is gone from the logs. Passing it via `super(message, cause)` preserves the full original stack trace as a nested "Caused by," which is often the only way to actually debug the real failure later.

*Source: [07-Exception-Handling.md#5-why-should-you-always-pass-the-original-exception-as-the-cause-when-wrapping-it-in-a-custom-exception](07-Exception-Handling.md#5-why-should-you-always-pass-the-original-exception-as-the-cause-when-wrapping-it-in-a-custom-exception)*

### 6. Why build a custom exception hierarchy instead of throwing plain `RuntimeException` everywhere?

**Answer:** A shared base type lets error-handling code (a `@RestControllerAdvice`, a retry policy, a metrics counter) catch one type and branch on the specific subtype, mapping each business failure to the right response — a 404 for "not found," a 409 for "conflict" — instead of every failure looking identical and forcing a generic 500 response, or requiring fragile string-matching on the exception message to tell failures apart.

*Source: [07-Exception-Handling.md#6-why-build-a-custom-exception-hierarchy-instead-of-throwing-plain-runtimeexception-everywhere](07-Exception-Handling.md#6-why-build-a-custom-exception-hierarchy-instead-of-throwing-plain-runtimeexception-everywhere)*

### 7. What does `try`-with-resources actually guarantee, and how is it better than closing a resource in `finally`?

**Answer:** It guarantees `close()` is called on every declared resource when the block exits, in reverse declaration order, regardless of whether the block succeeded, threw, or returned early — and if closing one resource throws, it still goes on to close the rest. Manually closing resources in `finally` is easy to get subtly wrong with multiple resources, because an earlier `close()` call throwing skips every `close()` call after it in that same `finally` block.

**Follow-up:** What's the difference between `AutoCloseable` and `Closeable`? `AutoCloseable` is the general contract — `close()` declared to throw the broad `Exception`. `Closeable` narrows that to Input/Output classes specifically, with `close()` declared to throw only `IOException`. Both work in a `try`-with-resources statement.

*Source: [07-Exception-Handling.md#7-what-does-trywithresources-actually-guarantee-and-how-is-it-better-than-closing-a-resource-in-finally](07-Exception-Handling.md#7-what-does-trywithresources-actually-guarantee-and-how-is-it-better-than-closing-a-resource-in-finally)*

### 8. Is it acceptable to catch `Exception` (or worse, `Throwable`) broadly in application code?

**Answer:** Only at a deliberate boundary — like a top-level request handler or a scheduled job runner that must never crash the whole process — and even there, log the full exception and either rethrow it or return a safe failure response, rather than silently swallowing it. Catching broadly deep inside ordinary business logic hides real bugs (including completely unrelated ones, like a typo causing a `NullPointerException`) and makes failures far harder to diagnose.

*Source: [07-Exception-Handling.md#8-is-it-acceptable-to-catch-exception-or-worse-throwable-broadly-in-application-code](07-Exception-Handling.md#8-is-it-acceptable-to-catch-exception-or-worse-throwable-broadly-in-application-code)*

### 9. What's actually wrong with an empty `catch` block?

**Answer:** It swallows the exception — the failure happened, but nothing records that it happened, so the program appears to work while it's actually failing every time. This can go undetected for a long time because there's no log line, no metric, and no visible symptom pointing at the real cause. At minimum, log the exception; ideally, decide explicitly whether to recover, rethrow, or fail loudly.

*Source: [07-Exception-Handling.md#9-whats-actually-wrong-with-an-empty-catch-block](07-Exception-Handling.md#9-whats-actually-wrong-with-an-empty-catch-block)*


## [8. Multithreading and Concurrency (Core Java)](08-Multithreading-Concurrency.md)

### 1. Why is `Runnable` generally preferred over extending `Thread`?

**Answer:** Extending `Thread` spends your one available `extends` slot (Java only allows single inheritance) purely to gain thread behavior you could get through composition instead. Implementing `Runnable` — or just passing a lambda, since `Runnable` is a functional interface — keeps your class free to extend something else, and cleanly separates "what work to run" from "how it gets executed": the same `Runnable` can be handed to a `Thread` directly or submitted to an `ExecutorService`.

*Source: [08-Multithreading-Concurrency.md#1-why-is-runnable-generally-preferred-over-extending-thread](08-Multithreading-Concurrency.md#1-why-is-runnable-generally-preferred-over-extending-thread)*

### 2. What actually goes wrong if you call `thread.run()` instead of `thread.start()`?

**Answer:** `run()` just executes the method body synchronously on whichever thread called it — no new thread is ever created. Code that assumes it's running concurrently silently runs sequentially instead, with no error or warning, which is exactly what makes this mistake dangerous: it looks correct and often even produces correct output, just without any of the concurrency you intended.

**Follow-up:** How would you notice this bug in practice? The telltale sign is that `Thread.currentThread().getName()` inside `run()` prints the *calling* thread's name (often `main`) instead of a new thread name.

*Source: [08-Multithreading-Concurrency.md#2-what-actually-goes-wrong-if-you-call-threadrun-instead-of-threadstart](08-Multithreading-Concurrency.md#2-what-actually-goes-wrong-if-you-call-threadrun-instead-of-threadstart)*

### 3. Why is `count++` on a shared field a race condition, even though it looks like one line?

**Answer:** Incrementing is really three separate steps at the JVM level — read the current value, add one, write the result back — with no guarantee those three steps happen as a single indivisible unit. Two threads can both read the same old value before either has written back, so one of the two increments is silently lost.

*Source: [08-Multithreading-Concurrency.md#3-why-is-count-on-a-shared-field-a-race-condition-even-though-it-looks-like-one-line](08-Multithreading-Concurrency.md#3-why-is-count-on-a-shared-field-a-race-condition-even-though-it-looks-like-one-line)*

### 4. Does `volatile` fix the `count++` race condition?

**Answer:** No. `volatile` only guarantees visibility — that a read on one thread sees the most recent write from another thread — as defined by the Java Memory Model. It says nothing about making a multi-step read-modify-write operation atomic. `count++` on a `volatile int` is still a race; you need `AtomicInteger`, `synchronized`, or an equivalent lock to actually fix it.

*Source: [08-Multithreading-Concurrency.md#4-does-volatile-fix-the-count-race-condition](08-Multithreading-Concurrency.md#4-does-volatile-fix-the-count-race-condition)*

### 5. `sleep()` versus `wait()` — what's the real difference?

**Answer:** `sleep()` simply pauses the current thread for a fixed duration and holds onto any lock it currently has. `wait()` is called while holding a lock, releases that lock while paused, and stays paused until another thread calls `notify()`/`notifyAll()` on the same object — it exists specifically to coordinate threads around shared state, like a consumer thread waiting for a producer to add work to a queue.

*Source: [08-Multithreading-Concurrency.md#5-sleep-versus-wait-whats-the-real-difference](08-Multithreading-Concurrency.md#5-sleep-versus-wait-whats-the-real-difference)*

### 6. What's the difference between `notify()` and `notifyAll()`?

**Answer:** `notify()` wakes exactly one arbitrarily-chosen thread that's currently waiting on that object's lock. `notifyAll()` wakes every waiting thread, and each one reacquires the lock in turn and rechecks its own condition. Use `notify()` when any one waiter can handle the event and it doesn't matter which; use `notifyAll()` when multiple waiters may need to reevaluate, since with only `notify()` you risk waking the "wrong" thread while others that could have proceeded stay asleep.

*Source: [08-Multithreading-Concurrency.md#6-whats-the-difference-between-notify-and-notifyall](08-Multithreading-Concurrency.md#6-whats-the-difference-between-notify-and-notifyall)*

### 7. How would you cause a deadlock, and how would you prevent it?

**Answer:** Two threads acquiring the same two locks in opposite order — Thread 1 takes lock A then waits for lock B, while Thread 2 has already taken lock B and waits for lock A. Neither can ever proceed, because neither will release what it's already holding. The fix is a globally consistent lock-acquisition order — for example, always lock the object with the smaller ID first — so it's structurally impossible for two threads to end up waiting on each other in a cycle.

*Source: [08-Multithreading-Concurrency.md#7-how-would-you-cause-a-deadlock-and-how-would-you-prevent-it](08-Multithreading-Concurrency.md#7-how-would-you-cause-a-deadlock-and-how-would-you-prevent-it)*

### 8. Why use an `ExecutorService` instead of creating a `Thread` per task?

**Answer:** A brand-new `Thread` maps to a real, fairly expensive OS thread. Spawning one per task doesn't scale — a burst of thousands of tasks would try to create thousands of OS threads at once, exhausting memory and drowning the system in context-switching overhead. An `ExecutorService` reuses a fixed, bounded pool of threads and queues excess work instead, which is how real batch- and background-processing systems are actually built.

*Source: [08-Multithreading-Concurrency.md#8-why-use-an-executorservice-instead-of-creating-a-thread-per-task](08-Multithreading-Concurrency.md#8-why-use-an-executorservice-instead-of-creating-a-thread-per-task)*

### 9. What's the difference between the `BLOCKED` and `WAITING` thread states?

**Answer:** `BLOCKED` means the thread is trying to enter a `synchronized` block or method and another thread currently holds that lock — it becomes runnable again automatically once the lock is free. `WAITING` means the thread deliberately paused itself, via `wait()` or `join()`, and needs an explicit wake-up — a `notify()`/`notifyAll()` call, or the joined thread finishing — a free lock by itself isn't enough.

*Source: [08-Multithreading-Concurrency.md#9-whats-the-difference-between-the-blocked-and-waiting-thread-states](08-Multithreading-Concurrency.md#9-whats-the-difference-between-the-blocked-and-waiting-thread-states)*

### 10. What does the Java Memory Model actually guarantee, in plain terms?

**Answer:** It's the rulebook defining when a write made by one thread is guaranteed to be visible to a read made by another thread. Without a mechanism like `volatile`, `synchronized`, or the higher-level `java.util.concurrent` classes, a thread can keep reading a stale, cached copy of a variable and never observe another thread's update — CPU caching and compiler reordering are both allowed to produce that outcome unless you use a construct that establishes a visibility guarantee.

*Source: [08-Multithreading-Concurrency.md#10-what-does-the-java-memory-model-actually-guarantee-in-plain-terms](08-Multithreading-Concurrency.md#10-what-does-the-java-memory-model-actually-guarantee-in-plain-terms)*

### 11. For a simple shared counter, would you reach for `synchronized` or `AtomicInteger`?

**Answer:** `AtomicInteger` first — its compare-and-swap-based operations perform the whole read-modify-write as one atomic step with no thread ever blocking, which is usually both simpler and faster than a lock for a single variable. Reach for `synchronized` when you need to protect more than one variable together, or a whole sequence of operations that must execute as one unit — something a single atomic class can't express.

*Source: [08-Multithreading-Concurrency.md#11-for-a-simple-shared-counter-would-you-reach-for-synchronized-or-atomicinteger](08-Multithreading-Concurrency.md#11-for-a-simple-shared-counter-would-you-reach-for-synchronized-or-atomicinteger)*


## [9. Java 8: Lambdas, Streams, and Optional](09-Java8-Lambda-Stream-Optional.md)

### 1. What is a functional interface, and why does a lambda need one?

**Answer:** An interface with exactly one abstract method (it may still have `default`/`static` methods with bodies). A lambda has no type of its own — it's shorthand syntax for implementing that single abstract method, so the compiler needs a functional interface as the target type to know what the lambda is actually implementing.

**Follow-up:** Why doesn't `@FunctionalInterface` do anything at runtime? It's a compile-time-only check that stops a second abstract method from being added later, which would otherwise silently break every lambda already written against that interface.

*Source: [09-Java8-Lambda-Stream-Optional.md#1-what-is-a-functional-interface-and-why-does-a-lambda-need-one](09-Java8-Lambda-Stream-Optional.md#1-what-is-a-functional-interface-and-why-does-a-lambda-need-one)*

### 2. `map()` vs `flatMap()` — give a real example of when you'd need `flatMap`.

**Answer:** `map()` transforms each element into exactly one output element. `flatMap()` transforms each element into a stream of elements and flattens all of those into one combined stream. Turning a `List<Order>` (each holding a `List<OrderLine>`) into one flat `Stream<OrderLine>` needs `flatMap` — `map` alone would leave you with a stream of lists, not a flat stream of lines.

*Source: [09-Java8-Lambda-Stream-Optional.md#2-map-vs-flatmap-give-a-real-example-of-when-youd-need-flatmap](09-Java8-Lambda-Stream-Optional.md#2-map-vs-flatmap-give-a-real-example-of-when-youd-need-flatmap)*

### 3. Why are intermediate stream operations lazy, and why does that matter?

**Answer:** Nothing runs until a terminal operation is invoked, which lets the whole pipeline (filter, map, sorted, etc.) fuse into a single pass over the data instead of building a fully materialized intermediate list at every stage. It also means a stream with no terminal operation does nothing at all — a common "why didn't my filter run" confusion when someone forgets to call `collect()`/`forEach()`/similar.

*Source: [09-Java8-Lambda-Stream-Optional.md#3-why-are-intermediate-stream-operations-lazy-and-why-does-that-matter](09-Java8-Lambda-Stream-Optional.md#3-why-are-intermediate-stream-operations-lazy-and-why-does-that-matter)*

### 4. What does `Collectors.groupingBy()` actually give you, with a real example?

**Answer:** A `Map` from a key function to the list of elements that share that key — e.g. `orders.stream().collect(Collectors.groupingBy(Order::getStatus))` produces a `Map<OrderStatus, List<Order>>`, exactly the shape needed to answer "show me all orders grouped by status" without hand-writing the grouping loop. Pairing it with a second collector (like `Collectors.reducing`) replaces the grouped list with an aggregate — a sum per group instead of the raw matching elements.

*Source: [09-Java8-Lambda-Stream-Optional.md#4-what-does-collectorsgroupingby-actually-give-you-with-a-real-example](09-Java8-Lambda-Stream-Optional.md#4-what-does-collectorsgroupingby-actually-give-you-with-a-real-example)*

### 5. Why is `Optional` not "just a replacement for every `null`"?

**Answer:** Its real purpose is to make "this might be absent" an explicit part of a method's return type, forcing the caller to decide what happens in that case (`orElse`, `orElseThrow`, etc.) instead of silently risking a `NullPointerException` several calls downstream. Using it as a field or parameter type, or calling `.get()` without checking presence, just relocates the same null-handling problem rather than solving it.

**Follow-up:** What's the difference between `orElse` and `orElseGet`? `orElse` always evaluates its argument, even when the value is present. `orElseGet` takes a supplier and only computes the fallback when the value is actually absent — the right choice whenever the fallback is expensive to compute.

*Source: [09-Java8-Lambda-Stream-Optional.md#5-why-is-optional-not-just-a-replacement-for-every-null](09-Java8-Lambda-Stream-Optional.md#5-why-is-optional-not-just-a-replacement-for-every-null)*

### 6. Why did Java 8 add `default` methods to interfaces?

**Answer:** To let the standard library (and any interface) add new methods without breaking every class that already implements it — before Java 8, adding a method to a published interface was a breaking change for every implementer. `default` gives a body that existing implementers inherit automatically, while new implementers can still override it. This is exactly how `Collection.forEach()` and `stream()` were added without breaking the existing ecosystem.

*Source: [09-Java8-Lambda-Stream-Optional.md#6-why-did-java-8-add-default-methods-to-interfaces](09-Java8-Lambda-Stream-Optional.md#6-why-did-java-8-add-default-methods-to-interfaces)*

### 7. Stream vs Collection — what's the actual distinction an interviewer wants to hear?

**Answer:** A `Collection` stores data and is eagerly, repeatedly usable. A `Stream` processes data through a pipeline, evaluates lazily until a terminal operation runs, never modifies the source, and can only be consumed once — reusing an already-consumed stream throws `IllegalStateException`.

*Source: [09-Java8-Lambda-Stream-Optional.md#7-stream-vs-collection-whats-the-actual-distinction-an-interviewer-wants-to-hear](09-Java8-Lambda-Stream-Optional.md#7-stream-vs-collection-whats-the-actual-distinction-an-interviewer-wants-to-hear)*

### 8. What's the actual difference between a lambda and a method reference?

**Answer:** None in what they produce — a method reference like `User::getEmail` is exactly equivalent to the lambda `user -> user.getEmail()`; both compile to the same functional-interface implementation. A method reference is purely a shorthand for the common case where a lambda's entire body is just calling one existing method on its argument.

*Source: [09-Java8-Lambda-Stream-Optional.md#8-whats-the-actual-difference-between-a-lambda-and-a-method-reference](09-Java8-Lambda-Stream-Optional.md#8-whats-the-actual-difference-between-a-lambda-and-a-method-reference)*

### 9. What's the general-purpose tool behind operations like `sum`, `count`, and `max` on a stream?

**Answer:** `reduce(identity, accumulator)` — it starts from an identity value and repeatedly combines the running result with the next stream element using the given function. It's worth reaching for directly whenever an aggregation doesn't match one of the built-in `Collectors`.

*Source: [09-Java8-Lambda-Stream-Optional.md#9-whats-the-generalpurpose-tool-behind-operations-like-sum-count-and-max-on-a-stream](09-Java8-Lambda-Stream-Optional.md#9-whats-the-generalpurpose-tool-behind-operations-like-sum-count-and-max-on-a-stream)*


## [10. Generics, Enums, and Modern Java Features](10-Generics-Enums-Modern-Java.md)

### 1. What problem do generics actually solve, beyond "type safety" as a buzzword?

**Answer:** Before generics, a collection held raw `Object`, so putting the wrong type in compiled fine and only failed with `ClassCastException` at runtime, often far from where the mistake was made. Generics push that error to compile time and eliminate the manual cast on every read — the exact same `Repository<T, ID>` interface can also be written once and reused correctly for every entity type instead of duplicated per type.

*Source: [10-Generics-Enums-Modern-Java.md#1-what-problem-do-generics-actually-solve-beyond-type-safety-as-a-buzzword](10-Generics-Enums-Modern-Java.md#1-what-problem-do-generics-actually-solve-beyond-type-safety-as-a-buzzword)*

### 2. Explain PECS — when do you use `? extends T` vs `? super T`?

**Answer:** "Producer Extends, Consumer Super." Use `? extends T` when you only read values out of the generic type (it produces values for you) — you can't safely add to it, since the compiler doesn't know the exact subtype. Use `? super T` when you only write values into it (it consumes values from you) — reading from it is unsafe beyond `Object`, since the compiler doesn't know exactly what supertype it holds.

*Source: [10-Generics-Enums-Modern-Java.md#2-explain-pecs-when-do-you-use-extends-t-vs-super-t](10-Generics-Enums-Modern-Java.md#2-explain-pecs-when-do-you-use-extends-t-vs-super-t)*

### 3. What is type erasure, and what does it prevent you from doing?

**Answer:** Generic type parameters exist only at compile time, purely for the compiler's own checking; at runtime, `List<String>` and `List<Integer>` are both just `List`. This is why you can't instantiate a type parameter directly (`new T()`), can't check `instanceof List<String>`, and can't overload two methods whose signatures differ only by generic type argument.

*Source: [10-Generics-Enums-Modern-Java.md#3-what-is-type-erasure-and-what-does-it-prevent-you-from-doing](10-Generics-Enums-Modern-Java.md#3-what-is-type-erasure-and-what-does-it-prevent-you-from-doing)*

### 4. Why write an enum with a constructor and fields instead of just plain constants?

**Answer:** A plain enum is just named constants; giving it fields (like a currency symbol and decimal places) and a constructor lets each constant carry its own real data and behavior, so calling code asks the enum constant itself instead of maintaining a separate lookup table or switch statement scattered elsewhere.

*Source: [10-Generics-Enums-Modern-Java.md#4-why-write-an-enum-with-a-constructor-and-fields-instead-of-just-plain-constants](10-Generics-Enums-Modern-Java.md#4-why-write-an-enum-with-a-constructor-and-fields-instead-of-just-plain-constants)*

### 5. Why is a single-element enum considered the safest way to implement a Singleton in Java?

**Answer:** A hand-written singleton has three real failure modes: a race condition if `getInstance()` isn't properly synchronized, reflection bypassing the private constructor to build a second instance, and deserialization silently creating another instance without a `readResolve()`. The JVM guarantees an enum constant is constructed exactly once, forbids reflective construction of enum constructors, and handles enum serialization specially so it always resolves back to the same constant — closing all three holes without any code the developer has to get right.

**Follow-up:** Why can't a hand-written singleton just declare its constructor `private` and call it done? Because `private` only stops normal `new` calls at compile time — reflection (`setAccessible(true)`) can still invoke a private constructor directly at runtime, so `private` alone isn't a real guarantee of "exactly one instance."

*Source: [10-Generics-Enums-Modern-Java.md#5-why-is-a-singleelement-enum-considered-the-safest-way-to-implement-a-singleton-in-java](10-Generics-Enums-Modern-Java.md#5-why-is-a-singleelement-enum-considered-the-safest-way-to-implement-a-singleton-in-java)*

### 6. Is `var` a step toward dynamic typing in Java?

**Answer:** No — the type is still fully determined and checked at compile time from the right-hand side; `var` only saves you from writing it explicitly. It's restricted to local variables and works best when the inferred type is already obvious from context, not when it would hide meaningful type information from a reader.

*Source: [10-Generics-Enums-Modern-Java.md#6-is-var-a-step-toward-dynamic-typing-in-java](10-Generics-Enums-Modern-Java.md#6-is-var-a-step-toward-dynamic-typing-in-java)*

### 7. What does a `record` actually generate for you, and why does that matter for DTOs?

**Answer:** A canonical constructor, accessor methods for each component, and correct `equals()`, `hashCode()`, and `toString()` implementations — all from one declaration line. For an immutable DTO (exactly the shape a REST response or a JPA projection needs), this removes the boilerplate that used to require hand-writing and keeping five separate pieces in sync, and it removes a classic bug source: an `equals()` or `hashCode()` that quietly falls out of sync after a field is added.

*Source: [10-Generics-Enums-Modern-Java.md#7-what-does-a-record-actually-generate-for-you-and-why-does-that-matter-for-dtos](10-Generics-Enums-Modern-Java.md#7-what-does-a-record-actually-generate-for-you-and-why-does-that-matter-for-dtos)*

### 8. What's the actual benefit of a `sealed` interface over a plain one, especially with pattern matching?

**Answer:** It restricts the complete set of permitted implementations, so the compiler can verify a pattern-matching `switch` over that type is exhaustive without requiring a `default` case. That's directly useful for a result type like `PaymentResult` — if a new subtype is ever added, every `switch` over it that isn't updated becomes a compile error instead of a silently-missed case at runtime.

*Source: [10-Generics-Enums-Modern-Java.md#8-whats-the-actual-benefit-of-a-sealed-interface-over-a-plain-one-especially-with-pattern-matching](10-Generics-Enums-Modern-Java.md#8-whats-the-actual-benefit-of-a-sealed-interface-over-a-plain-one-especially-with-pattern-matching)*

### 9. Why reach for `EnumMap`/`EnumSet` instead of a plain `HashMap`/`HashSet` when the key or element type is an enum?

**Answer:** `EnumMap`/`EnumSet` are backed internally by a plain array indexed by each constant's declaration order, instead of a general-purpose hash table — so they're more memory-efficient and faster for exactly this one case. They're the "right tool" specifically when the key space is an enum's full set of constants; for any other key type, a regular `HashMap`/`HashSet` is still the normal choice.

*Source: [10-Generics-Enums-Modern-Java.md#9-why-reach-for-enummapenumset-instead-of-a-plain-hashmaphashset-when-the-key-or-element-type-is-an-enum](10-Generics-Enums-Modern-Java.md#9-why-reach-for-enummapenumset-instead-of-a-plain-hashmaphashset-when-the-key-or-element-type-is-an-enum)*


## [11. Design Patterns in Core Java](11-Design-Patterns-Core-Java.md)

### 1. Why does the double-checked-locking singleton need `volatile` on the instance field?

**Answer:** Without `volatile`, another thread can observe the `instance` reference as non-null before the constructor has actually finished initializing the object's fields, because the JVM and CPU are allowed to reorder the steps of "allocate, initialize, assign" for performance. That thread then reads a partially-constructed object. `volatile` forbids that reordering for this field, so any thread that sees a non-null `instance` is guaranteed to see a fully-initialized one.

**Follow-up:** Why are there two `null` checks instead of one? The outer check (no lock) lets every call skip locking once the instance already exists — that's the fast path. The inner check (inside the lock) is the one that actually prevents two instances: it catches the case where two threads both passed the outer check before either acquired the lock.

*Source: [11-Design-Patterns-Core-Java.md#1-why-does-the-doublecheckedlocking-singleton-need-volatile-on-the-instance-field](11-Design-Patterns-Core-Java.md#1-why-does-the-doublecheckedlocking-singleton-need-volatile-on-the-instance-field)*

### 2. Why might an enum singleton be a stronger interview answer than double-checked locking?

**Answer:** It shows you know the JVM already guarantees an enum constant is created exactly once, thread-safely, with zero hand-written locking and no chance of getting `volatile` or the double-check wrong. A simpler solution that's still fully correct is generally the stronger answer over a more complex one recited from memory.

*Source: [11-Design-Patterns-Core-Java.md#2-why-might-an-enum-singleton-be-a-stronger-interview-answer-than-doublechecked-locking](11-Design-Patterns-Core-Java.md#2-why-might-an-enum-singleton-be-a-stronger-interview-answer-than-doublechecked-locking)*

### 3. What's the actual downside of singletons, beyond "they're an anti-pattern" as a slogan?

**Answer:** A singleton hides a dependency that would otherwise be visible and swappable through a constructor parameter — code that calls `getInstance()` internally can't easily be given a fake version for a unit test. It also concentrates shared mutable state in one place accessed from everywhere, which is exactly the kind of state that's easy to get wrong under concurrent access if it isn't carefully kept thread-safe.

*Source: [11-Design-Patterns-Core-Java.md#3-whats-the-actual-downside-of-singletons-beyond-theyre-an-antipattern-as-a-slogan](11-Design-Patterns-Core-Java.md#3-whats-the-actual-downside-of-singletons-beyond-theyre-an-antipattern-as-a-slogan)*

### 4. Why choose Builder over a large constructor or a chain of setters?

**Answer:** A large constructor makes call sites unreadable — you can't tell which positional argument is which flag without checking the signature — and gets worse as optional fields are added (the telescoping constructor problem). A setter chain avoids that but leaves the object mutable and observable in a half-configured state at every point between the first setter call and the last. A builder makes every field assignment self-documenting by name, validates required fields in exactly one place (`build()`), and the object doesn't exist at all until it's fully and validly constructed.

**Follow-up:** What does Lombok's `@Builder` actually do? It generates the same static inner `Builder` class, the named setter-style methods, and a `build()` method — the same boilerplate shown above, just written for you.

*Source: [11-Design-Patterns-Core-Java.md#4-why-choose-builder-over-a-large-constructor-or-a-chain-of-setters](11-Design-Patterns-Core-Java.md#4-why-choose-builder-over-a-large-constructor-or-a-chain-of-setters)*

### 5. What does the Factory pattern actually decouple, and why does that matter as a codebase grows?

**Answer:** It decouples "which concrete implementation is needed for a given type" from every place that needs one. Callers depend only on the interface (`PaymentProcessor`) and a type value, never on the concrete classes or the decision logic that picks between them. Adding a new implementation later means changing the factory in one place instead of finding and updating every scattered `new ConcreteClass()` call across checkout, refunds, admin tools, and anywhere else the decision was copy-pasted.

*Source: [11-Design-Patterns-Core-Java.md#5-what-does-the-factory-pattern-actually-decouple-and-why-does-that-matter-as-a-codebase-grows](11-Design-Patterns-Core-Java.md#5-what-does-the-factory-pattern-actually-decouple-and-why-does-that-matter-as-a-codebase-grows)*

### 6. How does the Factory pattern relate to what Spring's dependency injection does automatically?

**Answer:** Dependency injection is essentially factory-pattern construction, automated by the framework. Spring decides which concrete bean implementation satisfies a given interface and hands it to whoever declared a need for it in their constructor — the same decision a hand-written factory method makes based on a type parameter, just performed by the container for the whole app instead of by a method you write and maintain yourself.

*Source: [11-Design-Patterns-Core-Java.md#6-how-does-the-factory-pattern-relate-to-what-springs-dependency-injection-does-automatically](11-Design-Patterns-Core-Java.md#6-how-does-the-factory-pattern-relate-to-what-springs-dependency-injection-does-automatically)*

### 7. Is Builder's immutability actually required, or just conventional?

**Answer:** Just conventional, but worth keeping. Nothing forces a builder to produce an immutable object — you could make the built class's fields non-final and mutable. The reason not to is that immutability is what actually removes the "observed half-built" bug: an immutable object that only comes into existence inside `build()`, fully populated, can never be read in an inconsistent state by anything holding a reference to it.

*Source: [11-Design-Patterns-Core-Java.md#7-is-builders-immutability-actually-required-or-just-conventional](11-Design-Patterns-Core-Java.md#7-is-builders-immutability-actually-required-or-just-conventional)*

### 8. When is a singleton the wrong tool, even though "only one instance" sounds correct?

**Answer:** When the "one instance" requirement is really about a single logical instance *within a given scope* — one per request, one per test, one per user session — rather than one per entire running application. A hand-rolled singleton (static field, private constructor) gives you exactly one instance for the whole JVM process, which is too broad for those narrower cases and actively gets in the way of testing, since every test run shares the same static instance unless it's explicitly reset.

*Source: [11-Design-Patterns-Core-Java.md#8-when-is-a-singleton-the-wrong-tool-even-though-only-one-instance-sounds-correct](11-Design-Patterns-Core-Java.md#8-when-is-a-singleton-the-wrong-tool-even-though-only-one-instance-sounds-correct)*


## [12. SOLID Principles](12-SOLID-Principles.md)

### 1. What does each letter in SOLID actually stand for?

**Answer:** Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. All five are separate design principles bundled under one acronym for convenience — they aren't steps of one process, and a class can satisfy some while violating others.

*Source: [12-SOLID-Principles.md#1-what-does-each-letter-in-solid-actually-stand-for](12-SOLID-Principles.md#1-what-does-each-letter-in-solid-actually-stand-for)*

### 2. What's the actual test for whether a class violates Single Responsibility?

**Answer:** Ask "what would force this class to change?" — if there are multiple unrelated answers (a notification template changes, or the persistence schema changes, or the invoice layout changes), the class has multiple responsibilities bundled together and should be split so each piece changes independently of the others.

*Source: [12-SOLID-Principles.md#2-whats-the-actual-test-for-whether-a-class-violates-single-responsibility](12-SOLID-Principles.md#2-whats-the-actual-test-for-whether-a-class-violates-single-responsibility)*

### 3. How does polymorphism relate to the Open/Closed Principle?

**Answer:** Polymorphism is usually the mechanism that satisfies OCP in practice — a method that accepts an interface (like `PaymentMethod`) and calls its abstract method never needs to change when a new implementation is added; you extend behavior by writing a new class, not by editing the existing, already-tested method.

*Source: [12-SOLID-Principles.md#3-how-does-polymorphism-relate-to-the-openclosed-principle](12-SOLID-Principles.md#3-how-does-polymorphism-relate-to-the-openclosed-principle)*

### 4. What makes `Collections.unmodifiableList()` a real, famous LSP violation?

**Answer:** It returns an object that IS-A `List`, which contractually promises `add()`/`remove()` work — but calling those methods throws `UnsupportedOperationException` at runtime instead. Code written generically against the `List` interface, trusting its documented contract, can be broken simply by being handed this particular implementation.

**Follow-up:** How do you fix a genuine LSP violation like `InStorePickupRule` throwing inside `calculateCost()`? Recognize the subtype doesn't actually belong in that hierarchy — either change the method to return something like `Optional<BigDecimal>` so "not applicable" is an expected outcome, or split the hierarchy so the non-conforming case lives in its own abstraction instead of pretending to be a `ShippingRule`.

*Source: [12-SOLID-Principles.md#4-what-makes-collectionsunmodifiablelist-a-real-famous-lsp-violation](12-SOLID-Principles.md#4-what-makes-collectionsunmodifiablelist-a-real-famous-lsp-violation)*

### 5. How do you recognize an Interface Segregation violation in real code?

**Answer:** A class implementing an interface method just to throw `UnsupportedOperationException` or leave it empty is the clearest signal — it means the interface bundles capabilities that don't all belong together, and should be split so each implementer only takes on the methods it actually supports.

*Source: [12-SOLID-Principles.md#5-how-do-you-recognize-an-interface-segregation-violation-in-real-code](12-SOLID-Principles.md#5-how-do-you-recognize-an-interface-segregation-violation-in-real-code)*

### 6. What's the difference between Dependency Inversion and Dependency Injection?

**Answer:** Dependency Inversion is the design principle: high-level code should depend on abstractions, and something external should decide which concrete implementation satisfies them. Dependency Injection is one specific technique for achieving that — supplying the concrete implementation from outside (constructor, setter, or a framework like Spring) instead of the class constructing it itself.

**Follow-up:** Does applying DIP require Spring or any framework? No — the constructor-parameter version of `OrderService` above satisfies DIP in plain Java with no framework involved. A framework like Spring just automates supplying those constructor arguments across an entire application instead of someone wiring `new OrderService(new SmtpEmailSender())` by hand everywhere.

*Source: [12-SOLID-Principles.md#6-whats-the-difference-between-dependency-inversion-and-dependency-injection](12-SOLID-Principles.md#6-whats-the-difference-between-dependency-inversion-and-dependency-injection)*

### 7. Can you violate SOLID and still ship working code? Why does it matter anyway?

**Answer:** Yes — SOLID violations are almost never compile errors or immediate bugs; the code runs fine on day one. The cost shows up later, as change friction: a class with five responsibilities means five different reasons someone might need to touch (and risk breaking) it, and a hardcoded dependency means you can't swap implementations for testing or for a new requirement without editing code that already works.

*Source: [12-SOLID-Principles.md#7-can-you-violate-solid-and-still-ship-working-code-why-does-it-matter-anyway](12-SOLID-Principles.md#7-can-you-violate-solid-and-still-ship-working-code-why-does-it-matter-anyway)*


## [13. Serialization, Cloning, Reflection, and Custom Annotations](13-Serialization-Cloning-Reflection-Annotations.md)

### 1. What does `transient` actually do, and what's a real reason to use it?

**Answer:** It excludes a field from Java serialization entirely — after deserialization, that field comes back at its type's default value instead of the value it held before. A real use is excluding a secret (an OTP, a raw password) or a cheaply-recomputable cached value from ever being written into the serialized bytes in the first place.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#1-what-does-transient-actually-do-and-whats-a-real-reason-to-use-it](13-Serialization-Cloning-Reflection-Annotations.md#1-what-does-transient-actually-do-and-whats-a-real-reason-to-use-it)*

### 2. Why does forgetting to declare `serialVersionUID` cause a real production problem?

**Answer:** Without an explicit value, Java computes it automatically from the class's structure, so any structural change (adding or removing a field) changes that computed value. Deserializing bytes that were written by an older version of the class then throws `InvalidClassException` at runtime — a real deployment problem for anything with serialized data (a cache, a session store) that outlives one version of the class.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#2-why-does-forgetting-to-declare-serialversionuid-cause-a-real-production-problem](13-Serialization-Cloning-Reflection-Annotations.md#2-why-does-forgetting-to-declare-serialversionuid-cause-a-real-production-problem)*

### 3. Why does the default `Object.clone()` produce a broken copy for a class with a mutable field like a `List`?

**Answer:** `Object.clone()` performs a shallow copy — it duplicates primitive fields correctly but copies reference fields as the *same reference*, so the "copy" and the original end up sharing the exact same underlying `List`. Mutating that list through either object affects both, which is almost never the intended behavior — the `Order`/`OrderLine` example above shows this concretely.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#3-why-does-the-default-objectclone-produce-a-broken-copy-for-a-class-with-a-mutable-field-like-a-list](13-Serialization-Cloning-Reflection-Annotations.md#3-why-does-the-default-objectclone-produce-a-broken-copy-for-a-class-with-a-mutable-field-like-a-list)*

### 4. Why do most experienced Java developers avoid `Cloneable` entirely?

**Answer:** `Cloneable` is a marker interface with no actual `clone()` method to override cleanly (the real method lives on `Object` and is `protected`), `clone()` bypasses the constructor so any validation logic there never runs, and it forces a checked `CloneNotSupportedException` that's almost never meaningfully handled. A copy constructor or a static factory method achieves the same goal far more predictably.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#4-why-do-most-experienced-java-developers-avoid-cloneable-entirely](13-Serialization-Cloning-Reflection-Annotations.md#4-why-do-most-experienced-java-developers-avoid-cloneable-entirely)*

### 5. What makes reflection powerful, and what does it genuinely cost?

**Answer:** It lets code inspect and invoke classes, fields, and methods dynamically at runtime — exactly what lets a testing framework find and run `@Test` methods on classes it's never seen, Spring discover `@Service` classes, and Jackson map JSON onto DTO fields, all without anyone writing that lookup code by hand. It costs runtime performance (no JIT inlining, extra checks), compile-time type safety (a bad method name only fails at runtime), and — via `setAccessible(true)` — the ability to deliberately bypass encapsulation, which is a real risk if used outside trusted framework code.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#5-what-makes-reflection-powerful-and-what-does-it-genuinely-cost](13-Serialization-Cloning-Reflection-Annotations.md#5-what-makes-reflection-powerful-and-what-does-it-genuinely-cost)*

### 6. Why must a custom annotation use `@Retention(RetentionPolicy.RUNTIME)` if you intend to read it via reflection?

**Answer:** The default retention (`CLASS`) keeps the annotation in the compiled `.class` file but discards it before the class is loaded into a running JVM, so reflection at runtime can't see it at all. Only `RUNTIME` retention keeps it available for `Method.getAnnotation(...)`/`isAnnotationPresent(...)` calls while the program is actually executing — exactly what `@Loggable` needs to drive an AOP aspect, or `@AllowedStatus` needs to drive a validator.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#6-why-must-a-custom-annotation-use-retentionretentionpolicyruntime-if-you-intend-to-read-it-via-reflection](13-Serialization-Cloning-Reflection-Annotations.md#6-why-must-a-custom-annotation-use-retentionretentionpolicyruntime-if-you-intend-to-read-it-via-reflection)*

### 7. Does putting `@Loggable` on a method actually do anything by itself?

**Answer:** No. An annotation is purely metadata — a label with zero behavior attached. `@Loggable` only ends up timing and logging a method call because a separate piece of code (an AOP aspect) uses reflection to check, at runtime, whether a method carries that annotation, and only then acts on it. Delete the aspect and `@Loggable` becomes an inert label that changes nothing about how the method runs.

**Follow-up:** Name the other example from this material that works the same way. `@AllowedStatus` from the REST API guide — the annotation itself does nothing; a `ConstraintValidator` found via reflection by the Bean Validation engine is what actually rejects a disallowed value.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#7-does-putting-loggable-on-a-method-actually-do-anything-by-itself](13-Serialization-Cloning-Reflection-Annotations.md#7-does-putting-loggable-on-a-method-actually-do-anything-by-itself)*

### 8. Why does Java resolve a non-varargs overload before a varargs one when both could match a call?

**Answer:** Varargs is treated as the lowest-priority match specifically to avoid ambiguous or surprising resolution when both an exact-arity method and a varargs method could apply to the same call — Java favors the more specific, exact match first.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#8-why-does-java-resolve-a-nonvarargs-overload-before-a-varargs-one-when-both-could-match-a-call](13-Serialization-Cloning-Reflection-Annotations.md#8-why-does-java-resolve-a-nonvarargs-overload-before-a-varargs-one-when-both-could-match-a-call)*
