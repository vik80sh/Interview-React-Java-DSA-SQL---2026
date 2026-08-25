
# Master Question Bank — Core Java Interview Q&A

This file aggregates every interview question and its full answer from all 13 files in this folder (`Backend/Java/`), in the same order the files are numbered. Each question keeps the exact numbering it has in its source file, and each question's heading links back to the exact section in the original file — via the *Source* line beneath its answer — so you can open the original for the full worked example, code, and surrounding explanation that motivated it. Nothing here has been paraphrased or shortened: every Answer and Follow-up below is copied verbatim from its source file.

---

## [1. JVM and Memory Architecture](01-JVM-Memory-Architecture.md)

### 1. Why is Java called platform-independent?

**Answer:** Simple way to remember it: you compile once, and the JVM does the rest. `javac` turns your source code into bytecode, and that bytecode comes out identical no matter which OS built it. Each platform then has its own JVM that translates that same bytecode into native instructions for that machine. So the compile step happens only once — it's the JVM that absorbs all the platform-specific differences afterward.

*Source: [01-JVM-Memory-Architecture.md#1-why-is-java-called-platformindependent](01-JVM-Memory-Architecture.md#1-why-is-java-called-platformindependent)*

### 2. What's the actual difference between the JDK, JRE, and JVM?

**Answer:** Think of it as three boxes, each one bigger than the last. The JVM is the engine — it loads classes and executes bytecode. The JRE is the JVM plus the core runtime libraries, so it's enough to *run* a compiled program, nothing more. The JDK is the JRE plus the compiler and other developer tools, so it's what you need to *write and compile* code. That's why a production container only needs a JRE, while a build machine or a developer's laptop needs the full JDK.

*Source: [01-JVM-Memory-Architecture.md#2-whats-the-actual-difference-between-the-jdk-jre-and-jvm](01-JVM-Memory-Architecture.md#2-whats-the-actual-difference-between-the-jdk-jre-and-jvm)*

### 3. What happens, step by step, when you write `Order order = new Order();`?

**Answer:** Four steps, in order. First, the class loader makes sure `Order`'s class metadata is loaded into the Method Area or Metaspace — that only happens once, the first time it's needed, by whichever loader owns it in the parent-first hierarchy. Second, memory for the new object is allocated on the heap, specifically in Eden. Third, the constructor runs and initializes the fields. Finally, the reference `order` is stored in the current thread's stack frame, pointing at that object on the heap.

*Source: [01-JVM-Memory-Architecture.md#3-what-happens-step-by-step-when-you-write-order-order-new-order](01-JVM-Memory-Architecture.md#3-what-happens-step-by-step-when-you-write-order-order-new-order)*

### 4. What's the difference between the interpreter and the JIT compiler?

**Answer:** Picture a JVM that starts slow and speeds up as it warms up — that's the JIT at work. The interpreter runs bytecode line by line, and every method starts out handled this way. The JIT, the Just-In-Time compiler, watches for methods that get called over and over — the "hot" ones — and compiles just those to native machine code, so later calls skip interpretation entirely. That's exactly why a long-running server measurably gets faster as it warms up, not just in a synthetic benchmark loop.

*Source: [01-JVM-Memory-Architecture.md#4-whats-the-difference-between-the-interpreter-and-the-jit-compiler](01-JVM-Memory-Architecture.md#4-whats-the-difference-between-the-interpreter-and-the-jit-compiler)*

### 5. Where are static variables stored, and what does that imply?

**Answer:** They live in one place: the Method Area, or Metaspace — one single copy for the whole class, never one per object. That has two real consequences. First, a `static` field is shared state that every caller and every thread can see and change. Second, an unbounded static cache is a classic memory leak, because it stays reachable from a GC root for as long as the class is loaded — which in practice means forever.

*Source: [01-JVM-Memory-Architecture.md#5-where-are-static-variables-stored-and-what-does-that-imply](01-JVM-Memory-Architecture.md#5-where-are-static-variables-stored-and-what-does-that-imply)*

### 6. Heap vs Stack — what actually goes where?

**Answer:** Quick rule of thumb: objects go on the heap, everything about a method call goes on the stack. Objects and their instance fields live on the heap and are shared across threads. Local variables, method parameters, and call frames live on the stack, and each thread has its own separate stack. Even a reference variable itself is really a stack value — it's just pointing at an object that lives on the heap.

*Source: [01-JVM-Memory-Architecture.md#6-heap-vs-stack-what-actually-goes-where](01-JVM-Memory-Architecture.md#6-heap-vs-stack-what-actually-goes-where)*

### 7. Explain minor GC vs major/full GC.

**Answer:** Minor GC is quick and constant; major GC is rare but expensive. Minor GC only cleans the Young Generation — Eden plus the Survivor spaces — and it's fast and frequent, because most objects born there die almost immediately. Major, or Full, GC cleans the Old Generation, or sometimes the whole heap, and it's slower because it has to walk through objects that are genuinely still reachable. That's the real explanation behind a sudden production latency spike: a Full GC pausing a live server for hundreds of milliseconds.

*Source: [01-JVM-Memory-Architecture.md#7-explain-minor-gc-vs-majorfull-gc](01-JVM-Memory-Architecture.md#7-explain-minor-gc-vs-majorfull-gc)*

### 8. What's the difference between `OutOfMemoryError` and `StackOverflowError`?

**Answer:** They come from two completely different places, so they need two completely different fixes. `OutOfMemoryError` means the heap, or Metaspace, is full and GC couldn't reclaim enough — usually an unbounded cache, an oversized result set loaded without pagination, or a genuine reference leak. `StackOverflowError` means one thread's call stack blew past its fixed size limit — almost always unbounded or cyclic recursion. Different memory region, different root cause, different fix.

*Source: [01-JVM-Memory-Architecture.md#8-whats-the-difference-between-outofmemoryerror-and-stackoverflowerror](01-JVM-Memory-Architecture.md#8-whats-the-difference-between-outofmemoryerror-and-stackoverflowerror)*

### 9. When does an object actually become eligible for garbage collection?

**Answer:** The rule is reachability, not scope. An object becomes eligible for garbage collection the moment no reachable reference chain from a GC root — an active thread stack, a static field, a JNI reference — reaches it anymore. Setting a variable to `null`, reassigning it, or letting it go out of scope with nothing else referencing it can all lead to that. But underneath all of those, the actual rule is reachability from a GC root, not where the variable happens to sit in your source code.

*Source: [01-JVM-Memory-Architecture.md#9-when-does-an-object-actually-become-eligible-for-garbage-collection](01-JVM-Memory-Architecture.md#9-when-does-an-object-actually-become-eligible-for-garbage-collection)*

### 10. Does calling `System.gc()` force garbage collection?

**Answer:** No, and don't rely on it. `System.gc()` is only a hint to the JVM that this might be a reasonable time to collect — the JVM is completely free to ignore it. Production code should never assume it actually runs, and it's definitely not a real fix for an unbounded cache.

*Source: [01-JVM-Memory-Architecture.md#10-does-calling-systemgc-force-garbage-collection](01-JVM-Memory-Architecture.md#10-does-calling-systemgc-force-garbage-collection)*

### 11. Why does comparing pooled string literals with `==` sometimes "work," and why is it still wrong?

**Answer:** It's a coincidence of pooling, not a real content comparison. Two string literals with identical content point at the same object in the String Pool, so `==` happens to return `true`. But that breaks the moment either string comes from `new String(...)`, from concatenation built at runtime, from deserialization, or from any other non-literal source — and in real code, you can't predict which of those you're dealing with. That's why `.equals()`, which compares actual content instead of object identity, is the only correct way to compare string values.

*Source: [01-JVM-Memory-Architecture.md#11-why-does-comparing-pooled-string-literals-with-sometimes-work-and-why-is-it-still-wrong](01-JVM-Memory-Architecture.md#11-why-does-comparing-pooled-string-literals-with-sometimes-work-and-why-is-it-still-wrong)*

### 12. What is escape analysis, and why does it matter?

**Answer:** Think of it as the JIT proving an object never leaves the building. Escape analysis is a JIT optimization that detects when an object never "escapes" the method that created it — meaning no outside reference to it survives past that method. When the JIT can prove that, it can allocate the object on the stack instead of the heap, or even skip the allocation entirely, avoiding GC overhead for it. It happens automatically, method by method — you don't write special code to trigger it. And it's exactly why "minimize every object allocation" is outdated blanket advice today.

*Source: [01-JVM-Memory-Architecture.md#12-what-is-escape-analysis-and-why-does-it-matter](01-JVM-Memory-Architecture.md#12-what-is-escape-analysis-and-why-does-it-matter)*

### 13. Describe the three class loaders and why the hierarchy matters.

**Answer:** Three loaders, and they always ask their parent first. Bootstrap loads the core JDK classes, like `java.lang.*`. Platform, or Extension, loads JDK extension libraries. Application loads your own code and its JAR dependencies — that's the one responsible for essentially everything you write. They're arranged parent-first: a loader always asks its parent to try loading a class before attempting it itself. That's exactly what guarantees your own code can never accidentally shadow a core class like `java.lang.String`.

*Source: [01-JVM-Memory-Architecture.md#13-describe-the-three-class-loaders-and-why-the-hierarchy-matters](01-JVM-Memory-Architecture.md#13-describe-the-three-class-loaders-and-why-the-hierarchy-matters)*

### 14. Is the JVM itself thread-safe?

**Answer:** Yes, but only for its own bookkeeping — that guarantee doesn't extend to your code. The JVM is thread-safe internally for memory management, garbage collection, and class loading. That says nothing about *your* code: two threads calling methods on a shared, mutable object still race unless you add your own synchronization (see the [Multithreading guide](08-Multithreading-Concurrency.md)).

*Source: [01-JVM-Memory-Architecture.md#14-is-the-jvm-itself-threadsafe](01-JVM-Memory-Architecture.md#14-is-the-jvm-itself-threadsafe)*

### 15. Why is a singleton Spring bean's instance field dangerous under concurrency, while its local variables aren't?

**Answer:** One object, many threads, one shared memory location — that's the danger. A singleton Spring bean is a single object on the heap, shared by every thread handling every request, so an instance field on it is one memory location every request can race on. A local variable inside a method is different: it exists only in that call's own stack frame, and since each thread has its own stack, there's no sharing and no race — no matter how many requests run concurrently.

*Source: [01-JVM-Memory-Architecture.md#15-why-is-a-singleton-spring-beans-instance-field-dangerous-under-concurrency-while-its-local-variables-arent](01-JVM-Memory-Architecture.md#15-why-is-a-singleton-spring-beans-instance-field-dangerous-under-concurrency-while-its-local-variables-arent)*


## [2. Variables, Data Types, and Type Casting](02-Variables-DataTypes-Casting.md)

### 1. Why does an uninitialized local variable fail to compile, but an uninitialized instance field doesn't?

**Answer:** The compiler treats these two very differently on purpose. A local variable lives only on the stack for the duration of one method call, and Java enforces "definite assignment" for it — the compiler statically checks that every possible path reaching a read of that variable already wrote to it, and simply refuses to compile if not. An instance or static field is different: it belongs to an object, or a class, that's going to exist whether or not every field was explicitly set. So Java just gives it a safe default value — `0`, `false`, `null` — instead of requiring assignment. That means reading an unset field silently returns that default, which is why a forgotten field assignment can quietly produce a wrong-looking result instead of a compile error.

**Follow-up:** Where does each kind of variable physically live? Local variables live on the stack, instance fields live on the heap inside the object, and static fields live in Metaspace — one copy per class, not per object.

*Source: [02-Variables-DataTypes-Casting.md#1-why-does-an-uninitialized-local-variable-fail-to-compile-but-an-uninitialized-instance-field-doesnt](02-Variables-DataTypes-Casting.md#1-why-does-an-uninitialized-local-variable-fail-to-compile-but-an-uninitialized-instance-field-doesnt)*

### 2. What actually happens when you narrow `int 130` down to a `byte`?

**Answer:** It quietly wraps around instead of failing. `byte` can only hold -128 to 127, and `130` doesn't fit. The cast doesn't clamp it and doesn't round it — it overflows using two's-complement wraparound and silently produces `-126`. There's no runtime error at all; the cast "succeeds" and just hands you back a number you probably weren't expecting.

*Source: [02-Variables-DataTypes-Casting.md#2-what-actually-happens-when-you-narrow-int-130-down-to-a-byte](02-Variables-DataTypes-Casting.md#2-what-actually-happens-when-you-narrow-int-130-down-to-a-byte)*

### 3. Why does `Integer a = 100; Integer b = 100; a == b` return `true`, while the same code with `200` returns `false`?

**Answer:** It comes down to a hidden cache with a boundary at 127. The JVM caches boxed `Integer` objects for values from -128 to 127 and reuses them. Both `100`s get autoboxed to that exact same cached object, so `==`, which compares object identity, reports `true`. `200` falls outside that cache range, so autoboxing creates two separate objects, and `==` correctly reports `false`. The real fix is to never rely on where that cache boundary sits — always compare wrapper objects with `.equals()`, never `==`.

**Follow-up:** Does the same caching happen for `Long`, `Short`, and `Byte`? Yes. `Long` and `Short` follow the same -128 to 127 caching pattern — `Byte`'s entire range is small enough that it's effectively always cached. `Character` caches 0 to 127, and `Boolean` caches both possible values.

*Source: [02-Variables-DataTypes-Casting.md#3-why-does-integer-a-100-integer-b-100-a-b-return-true-while-the-same-code-with-200-returns-false](02-Variables-DataTypes-Casting.md#3-why-does-integer-a-100-integer-b-100-a-b-return-true-while-the-same-code-with-200-returns-false)*

### 4. Why can unboxing a `null` be a confusing bug to track down?

**Answer:** Because the crash and the cause happen in two different places. The `NullPointerException` gets thrown right where the `null` wrapper is unboxed into a primitive — typically some innocent-looking arithmetic or a comparison — not at the line that actually produced the `null` in the first place, like a repository lookup that found no row. So the stack trace points at the symptom, an ordinary line of math, instead of the real cause sitting several lines or methods upstream.

*Source: [02-Variables-DataTypes-Casting.md#4-why-can-unboxing-a-null-be-a-confusing-bug-to-track-down](02-Variables-DataTypes-Casting.md#4-why-can-unboxing-a-null-be-a-confusing-bug-to-track-down)*

### 5. Widening vs narrowing — which is automatic and which needs an explicit cast, and why?

**Answer:** The rule follows one idea: automatic when nothing can be lost, explicit when something might be. Widening — a smaller type into a larger one, like `int` into `double` — happens automatically, because the destination type can always represent every value the source type could hold. Narrowing — a larger type into a smaller one, like `double` into `int`, or `int` into `byte` — needs an explicit cast, because it can truncate or overflow. The cast exists specifically to make you acknowledge that risk in the code, instead of letting it happen invisibly.

*Source: [02-Variables-DataTypes-Casting.md#5-widening-vs-narrowing-which-is-automatic-and-which-needs-an-explicit-cast-and-why](02-Variables-DataTypes-Casting.md#5-widening-vs-narrowing-which-is-automatic-and-which-needs-an-explicit-cast-and-why)*

### 6. Does a `double → int` cast round the number?

**Answer:** No — it just chops off the decimal part, it never rounds. A `double` to `int` cast truncates toward zero, throwing away the decimal part entirely regardless of what it was. `(int) 19.99` gives you `19`, not `20`, and `(int) -19.99` gives you `-19`, not `-20`. If you actually want rounding, you have to call `Math.round()` explicitly.

*Source: [02-Variables-DataTypes-Casting.md#6-does-a-double-→-int-cast-round-the-number](02-Variables-DataTypes-Casting.md#6-does-a-double-→-int-cast-round-the-number)*

### 7. Why is `if (someInt)` a compile error in Java, when it's valid in JavaScript?

**Answer:** Because Java has no concept of "truthy" at all — an `if` condition must be a real `boolean`, full stop. There's no rule anywhere in Java that treats a non-zero number, a non-empty string, or an object as an implicit `true`. JavaScript defines exactly those coercion rules; Java deliberately leaves them out, to wipe out an entire category of implicit-conversion bugs. The trade-off is you have to spell the comparison out explicitly, like `if (someInt != 0)`.

*Source: [02-Variables-DataTypes-Casting.md#7-why-is-if-someint-a-compile-error-in-java-when-its-valid-in-javascript](02-Variables-DataTypes-Casting.md#7-why-is-if-someint-a-compile-error-in-java-when-its-valid-in-javascript)*

### 8. What's the practical difference between a primitive `int` field and a reference-type `Integer` field, beyond boxing overhead?

**Answer:** It really comes down to whether "unknown" is a state you need. An `int` can never be `null` — it always has a real numeric value, defaulting to `0` if unset — so it's safe to use in arithmetic with no null check needed. An `Integer` can be `null`, which is genuinely useful for "value not yet known" or "no row found." But that flexibility has a cost: every unboxing operation becomes a potential `NullPointerException`, and every `==` comparison becomes a potential cache-boundary trap. So use `Integer` specifically when `null` is a meaningful, intended state, and use `int` for everything else.

*Source: [02-Variables-DataTypes-Casting.md#8-whats-the-practical-difference-between-a-primitive-int-field-and-a-referencetype-integer-field-beyond-boxing-overhead](02-Variables-DataTypes-Casting.md#8-whats-the-practical-difference-between-a-primitive-int-field-and-a-referencetype-integer-field-beyond-boxing-overhead)*


## [3. OOP (Object-Oriented Programming) Fundamentals](03-OOP-Fundamentals.md)

### 1. What are the four pillars of OOP, and can you give a one-line reason for each?

**Answer:** Four pillars, four one-liners. Encapsulation protects an object's internal rules by controlling how its state is allowed to change. Inheritance lets a class reuse and extend another class's behavior through an IS-A relationship, instead of copy-pasting fields and methods everywhere. Polymorphism lets your calling code work against one common interface while the actual behavior varies depending on the real runtime type — that's what replaces a long branch-on-type `if`/`else` chain. Abstraction publishes what something does while hiding how it actually does it, so the caller's code doesn't need to change when the implementation underneath does.

*Source: [03-OOP-Fundamentals.md#1-what-are-the-four-pillars-of-oop-and-can-you-give-a-oneline-reason-for-each](03-OOP-Fundamentals.md#1-what-are-the-four-pillars-of-oop-and-can-you-give-a-oneline-reason-for-each)*

### 2. Why is "private fields + generated getters and setters" not automatically good encapsulation?

**Answer:** Because a getter and setter are just a field with extra typing, unless the setter actually protects something. Encapsulation's real job is protecting an invariant, not just wrapping a method call around a field. A setter that accepts any value with zero validation offers the exact same lack of safety as making the field public in the first place. Real encapsulation looks like `BankAccount.withdraw()` rejecting a withdrawal that would overdraw the account — it validates before it mutates state. That validation is what actually makes something encapsulated, not the presence of the word `private`.

**Follow-up:** Can a class be fully encapsulated with a public getter and no setter at all? Yes. As long as nothing lets an outside caller push the object into an invalid state, you don't even need to hide the field for encapsulation to hold.

*Source: [03-OOP-Fundamentals.md#2-why-is-private-fields-generated-getters-and-setters-not-automatically-good-encapsulation](03-OOP-Fundamentals.md#2-why-is-private-fields-generated-getters-and-setters-not-automatically-good-encapsulation)*

### 3. Why does copy-pasting fields and methods between `Employee` and `Manager` become a real problem, and how does inheritance fix it?

**Answer:** Because a bug in duplicated code has to be fixed everywhere it was copied, and every new employee type multiplies the copies you have to track down. If `printPayslip()` is pasted into both `Employee` and `Manager`, fixing a bug means remembering to fix it twice — and a third employee type means a third copy to keep in sync. Inheritance fixes this: `Manager extends Employee`, reusing `Employee`'s fields and methods and overriding only `computePay()`, the one part that's genuinely different. Now a fix to the shared logic in `Employee` applies automatically to every subclass.

*Source: [03-OOP-Fundamentals.md#3-why-does-copypasting-fields-and-methods-between-employee-and-manager-become-a-real-problem-and-how-does-inheritance-fix-it](03-OOP-Fundamentals.md#3-why-does-copypasting-fields-and-methods-between-employee-and-manager-become-a-real-problem-and-how-does-inheritance-fix-it)*

### 4. Give a real example of runtime polymorphism, and explain why it's useful.

**Answer:** Picture a `checkout(PaymentMethod method, BigDecimal amount)` method that just calls `method.charge(amount)` — it has no idea whether `method` is a credit card, UPI (Unified Payments Interface), or PayPal underneath. The JVM figures out the correct override to run based on the object's actual type, at runtime. The payoff is real: it replaces an `if`/`else if` chain that would otherwise need repeating everywhere payment-type branching happens. Adding a brand-new payment type just means writing one new class — zero existing call sites need to change.

*Source: [03-OOP-Fundamentals.md#4-give-a-real-example-of-runtime-polymorphism-and-explain-why-its-useful](03-OOP-Fundamentals.md#4-give-a-real-example-of-runtime-polymorphism-and-explain-why-its-useful)*

### 5. How is method overloading resolved differently from method overriding?

**Answer:** One's decided by the compiler, the other by what's actually running. Overloading is resolved at compile time, based on the declared types of the arguments you pass and which overload's parameter list matches them. Overriding is resolved at runtime, based on the object's real, actual class — regardless of what reference type you used to call it.

*Source: [03-OOP-Fundamentals.md#5-how-is-method-overloading-resolved-differently-from-method-overriding](03-OOP-Fundamentals.md#5-how-is-method-overloading-resolved-differently-from-method-overriding)*

### 6. When would you choose an abstract class over an interface?

**Answer:** Reach for an abstract class when there's real, shared logic to reuse — not just interfaces when it's just a shared signature. Pick an abstract class when multiple related implementations share real, non-trivial code that would otherwise be duplicated in every one of them, like the shared logging code sitting in `BaseNotificationSender`. Pick an interface instead when you're defining a pure capability that unrelated classes need to honor — especially if a class needs to satisfy more than one such contract at the same time.

*Source: [03-OOP-Fundamentals.md#6-when-would-you-choose-an-abstract-class-over-an-interface](03-OOP-Fundamentals.md#6-when-would-you-choose-an-abstract-class-over-an-interface)*

### 7. Why can't a class extend two other classes but can implement multiple interfaces?

**Answer:** It's a deliberate choice to dodge the "diamond problem" — the ambiguity you'd get if two parent classes each defined conflicting behavior for the same inherited method. Interfaces sidestep that ambiguity because, historically, they carried no implementation at all. Even now that interfaces can have `default` methods, Java still forces you to explicitly resolve the conflict if two interfaces hand you clashing defaults for the same method.

*Source: [03-OOP-Fundamentals.md#7-why-cant-a-class-extend-two-other-classes-but-can-implement-multiple-interfaces](03-OOP-Fundamentals.md#7-why-cant-a-class-extend-two-other-classes-but-can-implement-multiple-interfaces)*

### 8. What's the practical difference between a static nested class and an inner (non-static) class?

**Answer:** One needs an outer object to exist; the other doesn't. A static nested class behaves like an ordinary class that just happens to be namespaced inside another one — it needs no enclosing instance at all to exist. An inner, non-static class is tied to its outer object: it holds an implicit reference to the specific outer instance that created it, can reach that instance's fields directly, and can't exist independently of it.

*Source: [03-OOP-Fundamentals.md#8-whats-the-practical-difference-between-a-static-nested-class-and-an-inner-nonstatic-class](03-OOP-Fundamentals.md#8-whats-the-practical-difference-between-a-static-nested-class-and-an-inner-nonstatic-class)*

### 9. Why is a `static` method in a subclass with the same signature as a parent's `static` method not "overriding"?

**Answer:** Because there's no dynamic dispatch happening — it's method hiding, not overriding, and that's the whole distinction. Static methods get resolved by the reference's declared, compile-time type, not by the object's actual runtime type. Overriding is specifically about runtime dispatch, so without it, calling it "overriding" would be the wrong word entirely.

**Follow-up:** What happens to a `final` method in a subclass? It can't be redeclared at all — `final` exists specifically to close off that extension point for good.

*Source: [03-OOP-Fundamentals.md#9-why-is-a-static-method-in-a-subclass-with-the-same-signature-as-a-parents-static-method-not-overriding](03-OOP-Fundamentals.md#9-why-is-a-static-method-in-a-subclass-with-the-same-signature-as-a-parents-static-method-not-overriding)*


## [4. Constructors, equals()/hashCode(), and Java's Keyword Trio](04-Constructors-Equals-HashCode-Keywords.md)

### 1. Why must `this(...)` or `super(...)` be the first statement in a constructor?

**Answer:** Because everything has to be built from the outside in, in one guaranteed order. Java requires the parent's state — or another constructor's full initialization — to be finished before this constructor's own body runs, so there's exactly one, unambiguous order things get set up in. If it were allowed anywhere else, a constructor could end up using fields before they're guaranteed to even exist yet.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#1-why-must-this-or-super-be-the-first-statement-in-a-constructor](04-Constructors-Equals-HashCode-Keywords.md#1-why-must-this-or-super-be-the-first-statement-in-a-constructor)*

### 2. What happens to the "default" no-arg constructor once you write your own constructor?

**Answer:** It vanishes the moment you write any constructor of your own. Java only auto-generates a no-arg constructor when a class declares no constructor at all. The instant you write even one constructor yourself, that automatic freebie disappears — so code elsewhere calling `new SomeClass()` will now fail to compile, unless you go back and explicitly add a no-arg constructor too.

**Follow-up:** Why is `id = id;` inside a constructor a silent bug rather than a compile error? Because the parameter name quietly shadows the field with the same name. That statement just assigns the parameter to itself — the field is never actually touched. You need `this.id = id;` to reach the real field. If the field were `final`, the compiler would actually catch this, because it would notice the field was never definitely assigned.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#2-what-happens-to-the-default-noarg-constructor-once-you-write-your-own-constructor](04-Constructors-Equals-HashCode-Keywords.md#2-what-happens-to-the-default-noarg-constructor-once-you-write-your-own-constructor)*

### 3. When does a static block run, relative to instance field initializers and the constructor?

**Answer:** Exactly once, and always first. A static block runs the first time the class is loaded by the JVM, before any instance of that class is ever created — which means before any field initializer or constructor body for that class runs too. So the full order for a brand-new object is: static block, once at class load, then instance field initializers, then finally the constructor body.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#3-when-does-a-static-block-run-relative-to-instance-field-initializers-and-the-constructor](04-Constructors-Equals-HashCode-Keywords.md#3-when-does-a-static-block-run-relative-to-instance-field-initializers-and-the-constructor)*

### 4. Why does overriding `equals()` without `hashCode()` break lookups in a `HashSet`?

**Answer:** Because `HashSet` uses `hashCode()` to find the neighborhood before `equals()` ever gets a chance to knock on the door. A `HashSet` first calls `hashCode()` to pick which bucket to search, then uses `equals()` to compare against whatever's already sitting in that bucket. If `hashCode()` is left at its default, identity-based behavior, two logically-equal objects can land in completely different buckets — and they never even get compared with `equals()`. The set reports the object as missing, even though an "equal" one is sitting right there in a different bucket.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#4-why-does-overriding-equals-without-hashcode-break-lookups-in-a-hashset](04-Constructors-Equals-HashCode-Keywords.md#4-why-does-overriding-equals-without-hashcode-break-lookups-in-a-hashset)*

### 5. What's the exact contract between `equals()` and `hashCode()`?

**Answer:** It's a one-way street: equal objects must share a hash code, but sharing a hash code doesn't mean the objects are equal. If two objects are equal according to `equals()`, they're required to return the same `hashCode()`. The reverse isn't required — two unequal objects are allowed to share a hash code, and that's called a collision. `equals()` is exactly the tool that tells them apart once they end up compared inside the same bucket.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#5-whats-the-exact-contract-between-equals-and-hashcode](04-Constructors-Equals-HashCode-Keywords.md#5-whats-the-exact-contract-between-equals-and-hashcode)*

### 6. Why is mutating a field used in `equals()`/`hashCode()` dangerous after the object is already a `HashSet`/`HashMap` key?

**Answer:** Because the map never notices the field changed and never moves the object to its new bucket. The object's bucket was calculated from that field's value back when it was inserted, and nothing recomputes it automatically just because the field changes later. So a later lookup calculates a bucket based on the field's *current* value — which no longer matches the bucket the object is actually sitting in — and the lookup silently fails to find it.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#6-why-is-mutating-a-field-used-in-equalshashcode-dangerous-after-the-object-is-already-a-hashsethashmap-key](04-Constructors-Equals-HashCode-Keywords.md#6-why-is-mutating-a-field-used-in-equalshashcode-dangerous-after-the-object-is-already-a-hashsethashmap-key)*

### 7. How does a `HashMap`/`HashSet` resolve a hash collision internally?

**Answer:** Objects that collide just pile up together in the same bucket, and `equals()` sorts them out from there. Multiple objects sharing a hash code land in the same bucket, and within that bucket, `equals()` is what tells them apart. Since Java 8, there's an extra safety net too: once a single bucket collects enough entries, its internal storage switches from a plain linked list to a balanced tree, which keeps worst-case lookups fast even under heavy collisions.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#7-how-does-a-hashmaphashset-resolve-a-hash-collision-internally](04-Constructors-Equals-HashCode-Keywords.md#7-how-does-a-hashmaphashset-resolve-a-hash-collision-internally)*

### 8. Difference between `final`, `finally`, and `finalize()`?

**Answer:** Three similar-sounding words, three completely different jobs. `final` is a modifier that locks something down — it stops a variable from being reassigned, a method from being overridden, or a class from being extended. `finally` is a block attached to a `try` statement that always runs afterward, aside from `System.exit()` or a JVM crash, and it's typically used for cleanup. `finalize()` is a deprecated, unreliable method the garbage collector might call before reclaiming an object — real cleanup work should use `try`-with-resources instead, not this.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#8-difference-between-final-finally-and-finalize](04-Constructors-Equals-HashCode-Keywords.md#8-difference-between-final-finally-and-finalize)*

### 9. Can a `finally` block ever be skipped?

**Answer:** Yes, but only in two specific cases. `System.exit()` shuts the JVM down immediately, without running any pending `finally` blocks, and a JVM crash skips everything too. Outside of those two, `finally` always runs — even if there's a `return` inside the `try` or `catch` block, `finally` still executes first, before control actually leaves the method.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#9-can-a-finally-block-ever-be-skipped](04-Constructors-Equals-HashCode-Keywords.md#9-can-a-finally-block-ever-be-skipped)*

### 10. Why was `finalize()` effectively phased out in favor of `try`-with-resources?

**Answer:** Because "maybe, eventually" isn't good enough for cleanup code. `finalize()` gives no guarantee about when the garbage collector will actually call it, or even whether it runs at all before the JVM shuts down — that unpredictable timing made it unreliable for real cleanup like closing files, sockets, or database connections. `try`-with-resources fixes that: it calls `close()` deterministically, the instant the block exits, whether it succeeded or failed, with none of that uncertainty.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#10-why-was-finalize-effectively-phased-out-in-favor-of-trywithresources](04-Constructors-Equals-HashCode-Keywords.md#10-why-was-finalize-effectively-phased-out-in-favor-of-trywithresources)*

### 11. Can a constructor call both `this(...)` and `super(...)`?

**Answer:** No — a constructor has to pick one. Only one statement is allowed to be first in a constructor body, and both `this(...)` and `super(...)` are required to be that first statement. So a constructor calls exactly one of the two, never both.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#11-can-a-constructor-call-both-this-and-super](04-Constructors-Equals-HashCode-Keywords.md#11-can-a-constructor-call-both-this-and-super)*

### 12. If a parent class has no no-arg constructor, what happens to a subclass that doesn't call `super(...)` explicitly?

**Answer:** It fails to compile. Java only quietly inserts that free `super()` call for you when the parent class actually has a matching no-arg constructor available. The moment the parent's only constructor requires arguments, every subclass constructor has to call `super(...)` explicitly with the right values, as its very first statement — the free ride is gone.

*Source: [04-Constructors-Equals-HashCode-Keywords.md#12-if-a-parent-class-has-no-noarg-constructor-what-happens-to-a-subclass-that-doesnt-call-super-explicitly](04-Constructors-Equals-HashCode-Keywords.md#12-if-a-parent-class-has-no-noarg-constructor-what-happens-to-a-subclass-that-doesnt-call-super-explicitly)*


## [5. String Handling](05-String-Handling.md)

### 1. `String a = "hello"; String b = "hello";` — what does `a == b` return, and why?

**Answer:** `true`. Both `a` and `b` are string literals, so they both point at the exact same object sitting in the String Constant Pool — the JVM never bothers creating a second object for identical literal content.

*Source: [05-String-Handling.md#1-string-a-hello-string-b-hello-what-does-a-b-return-and-why](05-String-Handling.md#1-string-a-hello-string-b-hello-what-does-a-b-return-and-why)*

### 2. `String a = new String("hello"); String b = new String("hello");` — what does `a == b` return?

**Answer:** `false`. `new String(...)` always forces the creation of a brand-new object on the heap, outside the pool, every single time, no matter what the content is. So `a` and `b` end up as two genuinely different objects — even though `a.equals(b)` is still `true`, because the content matches.

*Source: [05-String-Handling.md#2-string-a-new-stringhello-string-b-new-stringhello-what-does-a-b-return](05-String-Handling.md#2-string-a-new-stringhello-string-b-new-stringhello-what-does-a-b-return)*

### 3. Why does `String c = b + "llo"` (where `b` is a plain variable) produce a different object than the equivalent literal, but using `final String b` doesn't?

**Answer:** It comes down to whether the compiler can prove the value ahead of time. With a plain variable, the compiler can't guarantee what `b` holds at compile time, so the concatenation has to happen at runtime — using an internally generated `StringBuilder` — which produces a new heap object outside the pool. But mark `b` as `final` with a compile-time-constant value, and the compiler can now treat it as a true constant and fold the whole expression at compile time, landing the result in the pool, just like a literal would.

**Follow-up:** What does `intern()` do for a string like `c`? It checks the pool for matching existing content and hands back that pooled reference — and if `c`'s content wasn't already in the pool, it adds it there.

*Source: [05-String-Handling.md#3-why-does-string-c-b-llo-where-b-is-a-plain-variable-produce-a-different-object-than-the-equivalent-literal-but-using-final-string-b-doesnt](05-String-Handling.md#3-why-does-string-c-b-llo-where-b-is-a-plain-variable-produce-a-different-object-than-the-equivalent-literal-but-using-final-string-b-doesnt)*

### 4. What does `s.concat(" world")` do if you never assign its result back to `s`?

**Answer:** Nothing you can actually observe. `concat()` returns a brand-new `String`, but strings are immutable, so `s` itself is never touched. You have to write `s = s.concat(" world")` to actually keep the result. This is a very common real bug — someone assumes a `String` method mutates in place — and the exact same trap shows up with `trim()` and `replace()` too.

*Source: [05-String-Handling.md#4-what-does-sconcat-world-do-if-you-never-assign-its-result-back-to-s](05-String-Handling.md#4-what-does-sconcat-world-do-if-you-never-assign-its-result-back-to-s)*

### 5. Why is building a large string with `+` inside a loop a real performance problem?

**Answer:** Because every single `+` quietly throws away the old string and builds a whole new one. Since `String` is immutable, every `+` inside the loop discards the previous string and allocates an entirely new object holding the combined text. For a loop with N iterations, that's roughly N throwaway objects, plus repeated copying of an ever-growing block of text. `StringBuilder` fixes this by mutating one growable buffer in place, instead of allocating a brand-new object on every single append.

*Source: [05-String-Handling.md#5-why-is-building-a-large-string-with-inside-a-loop-a-real-performance-problem](05-String-Handling.md#5-why-is-building-a-large-string-with-inside-a-loop-a-real-performance-problem)*

### 6. Why doesn't `StringBuilder.equals()` compare content the way `String.equals()` does?

**Answer:** Because `StringBuilder` simply never bothered to override `equals()`, so it falls back to `Object`'s default behavior — a plain reference comparison, identical to `==`. Two `StringBuilder`s holding the exact same text are never "equal" by `.equals()` unless they're literally the same object. To compare their actual text, you'd write `sb1.toString().equals(sb2.toString())` instead.

*Source: [05-String-Handling.md#6-why-doesnt-stringbuilderequals-compare-content-the-way-stringequals-does](05-String-Handling.md#6-why-doesnt-stringbuilderequals-compare-content-the-way-stringequals-does)*

### 7. When would you choose `StringBuffer` over `StringBuilder`?

**Answer:** Only in the fairly rare case where the exact same builder instance genuinely needs to be mutated by multiple threads at once. Even then, it's usually cleaner to just let each thread build its own separate `StringBuilder` and merge the results afterward. `StringBuilder` stays the default choice everywhere else, because it's faster and doesn't carry synchronization overhead.

*Source: [05-String-Handling.md#7-when-would-you-choose-stringbuffer-over-stringbuilder](05-String-Handling.md#7-when-would-you-choose-stringbuffer-over-stringbuilder)*

### 8. Why is String immutability actually useful, beyond "it's just how Java designed it"?

**Answer:** Immutability quietly solves three real problems at once. It lets many references safely share one pooled object, with zero risk that one caller corrupts it for everyone else. It makes `String` inherently thread-safe, with no synchronization needed at all. And it makes `String` safe to use as a `HashMap`/`HashSet` key — a mutable key would risk exactly the bucket-mismatch bug described earlier for `equals()`/`hashCode()`.

*Source: [05-String-Handling.md#8-why-is-string-immutability-actually-useful-beyond-its-just-how-java-designed-it](05-String-Handling.md#8-why-is-string-immutability-actually-useful-beyond-its-just-how-java-designed-it)*

### 9. For primitives like `int`, does the `==` vs `.equals()` distinction still apply?

**Answer:** No — for a primitive, `==` compares the value directly, since there's no separate object identity to worry about at all. The `==` versus `.equals()` trap is specific to comparing objects. `String` is exactly where beginners get burned by it, because literal pooling makes `==` *look* like it's comparing content — right up until a `new String(...)` or some non-pooled value breaks that illusion.

*Source: [05-String-Handling.md#9-for-primitives-like-int-does-the-vs-equals-distinction-still-apply](05-String-Handling.md#9-for-primitives-like-int-does-the-vs-equals-distinction-still-apply)*


## [6. Collections Framework](06-Collections-Framework.md)

### 1. What's the difference between `Collection` and `Collections`?

**Answer:** One's a type, the other's a toolbox — and the extra "s" is the only thing they share. `Collection` is an interface, the root of the whole framework, extended by `List`, `Set`, and `Queue`. `Collections` is a completely unrelated static utility class, full of helper methods like `sort`, `unmodifiableList`, and `synchronizedList` that operate on collections you already have.

*Source: [06-Collections-Framework.md#1-whats-the-difference-between-collection-and-collections](06-Collections-Framework.md#1-whats-the-difference-between-collection-and-collections)*

### 2. `ArrayList` vs `LinkedList` — how would you actually decide, in a real system?

**Answer:** Default to `ArrayList` almost always, and only reach for `LinkedList` in one narrow case. `ArrayList` is the right call for anything read-heavy with occasional appends — which covers most real lists, like order history or search results — because `get(i)` is `O(1)` and appends are cheap. `LinkedList` only earns its place in the rare situation of genuinely frequent inserts or deletes at arbitrary positions via an iterator. Even then, `ArrayDeque` usually beats it for the common queue or stack shape, since it skips the per-node object overhead a linked list has to pay.

**Follow-up:** Why is inserting at index 0 of a large `ArrayList` a million times so slow? Every single insert at the front has to shift every existing element one slot to the right, so one insert costs `O(n)`, and a million of them cost roughly `O(n²)`. The fix is `LinkedList` or `ArrayDeque`, where inserting at an end is `O(1)`.

*Source: [06-Collections-Framework.md#2-arraylist-vs-linkedlist-how-would-you-actually-decide-in-a-real-system](06-Collections-Framework.md#2-arraylist-vs-linkedlist-how-would-you-actually-decide-in-a-real-system)*

### 3. How would you implement a bounded LRU cache with minimal code?

**Answer:** You get a working LRU cache almost for free from `LinkedHashMap`. Construct it with `accessOrder = true`, and override `removeEldestEntry` to return `true` once the map exceeds the capacity you want. That's a complete, correct LRU (Least Recently Used) cache, with no need to hand-roll a doubly-linked list plus a hash map yourself.

*Source: [06-Collections-Framework.md#3-how-would-you-implement-a-bounded-lru-cache-with-minimal-code](06-Collections-Framework.md#3-how-would-you-implement-a-bounded-lru-cache-with-minimal-code)*

### 4. Why is `HashMap` not thread-safe, and what would you use instead in a multithreaded service?

**Answer:** Because there's no internal locking or coordination at all, so concurrent `put`s or resizes can corrupt its internal bucket structure or just lose updates outright. `ConcurrentHashMap` is the standard real-world fix — it splits up locking across the map so concurrent reads and writes on different keys don't block each other. That's a real advantage over wrapping a `HashMap` with `Collections.synchronizedMap`, which just serializes every single access behind one big lock.

*Source: [06-Collections-Framework.md#4-why-is-hashmap-not-threadsafe-and-what-would-you-use-instead-in-a-multithreaded-service](06-Collections-Framework.md#4-why-is-hashmap-not-threadsafe-and-what-would-you-use-instead-in-a-multithreaded-service)*

### 5. Walk through what happens internally on `map.put(key, value)`.

**Answer:** Three steps: hash it, find the bucket, then check for a match. First, `key.hashCode()` gets computed and mixed into a bucket index. If that bucket is empty, the entry just gets stored there directly. If it's not empty — a collision — `equals()` checks the existing entries in that bucket for a match: replace the value if one's found, or add a new entry to the bucket if not. Since Java 8, that bucket is a linked list normally, or a Red-Black Tree if the bucket has grown large enough.

*Source: [06-Collections-Framework.md#5-walk-through-what-happens-internally-on-mapputkey-value](06-Collections-Framework.md#5-walk-through-what-happens-internally-on-mapputkey-value)*

### 6. What is the load factor, and why does it matter for performance?

**Answer:** It's the fill-ratio trigger for a resize, and it defaults to `0.75`. Once the map's fill ratio crosses that threshold, it resizes — typically doubling capacity — and has to rehash every single entry into the new bucket array, because each entry's bucket index depends on the array's size. That resize is `O(n)`, so repeated resizes during one big bulk load are pure wasted work. Pre-sizing the map up front with `new HashMap<>(expectedSize)` avoids that churn entirely.

*Source: [06-Collections-Framework.md#6-what-is-the-load-factor-and-why-does-it-matter-for-performance](06-Collections-Framework.md#6-what-is-the-load-factor-and-why-does-it-matter-for-performance)*

### 7. Why does removing an element with `list.remove(element)` inside a `for-each` loop throw `ConcurrentModificationException`?

**Answer:** Because the iterator notices the list changed behind its back and refuses to trust it anymore. `ArrayList`'s iterator is fail-fast: it tracks a modification count and checks it on every `next()` call. Removing directly on the list, rather than through the iterator, bumps that count without the iterator knowing — so the iterator throws rather than risk handing back an inconsistent view of the list. The fix is `iterator.remove()`, which keeps the iterator's own bookkeeping in sync as it goes.

*Source: [06-Collections-Framework.md#7-why-does-removing-an-element-with-listremoveelement-inside-a-foreach-loop-throw-concurrentmodificationexception](06-Collections-Framework.md#7-why-does-removing-an-element-with-listremoveelement-inside-a-foreach-loop-throw-concurrentmodificationexception)*

### 8. What's the difference between fail-fast and fail-safe iteration?

**Answer:** One throws the moment something changes underneath it; the other just shrugs and keeps going. Fail-fast collections — `ArrayList`, `HashMap`, and most standard collections — detect an unexpected structural change mid-iteration and throw `ConcurrentModificationException` right away. Fail-safe collections — `ConcurrentHashMap`'s iterator, `CopyOnWriteArrayList` — tolerate concurrent modification without throwing, usually by iterating over a snapshot instead. The trade-off is that the iteration might not reflect changes made while it's still running.

*Source: [06-Collections-Framework.md#8-whats-the-difference-between-failfast-and-failsafe-iteration](06-Collections-Framework.md#8-whats-the-difference-between-failfast-and-failsafe-iteration)*

### 9. Comparable vs Comparator — when do you reach for each?

**Answer:** Ask whether the ordering belongs to the class itself, or just to this one use case. Reach for `Comparable`, via `compareTo`, when a class has one obvious natural ordering that really belongs to the class — sorting employees by salary for payroll, for instance. Reach for `Comparator` when you need a different, situational ordering instead — sorting those same employees by name for a directory screen — without touching the class itself. You can write as many `Comparator`s as you need.

*Source: [06-Collections-Framework.md#9-comparable-vs-comparator-when-do-you-reach-for-each](06-Collections-Framework.md#9-comparable-vs-comparator-when-do-you-reach-for-each)*

### 10. Why does `TreeMap`/`TreeSet` not allow a `null` key, while `HashMap`/`HashSet` allow one?

**Answer:** It comes down to whether the structure needs to compare keys or just hash them. A `TreeMap`/`TreeSet` has to compare every key to maintain sorted order, and comparing `null` against anything throws `NullPointerException` — there's simply no natural ordering for `null`. A `HashMap`/`HashSet` only needs `hashCode()`/`equals()`, and `null` gets handled internally as a special case, so one `null` key is allowed there.

*Source: [06-Collections-Framework.md#10-why-does-treemaptreeset-not-allow-a-null-key-while-hashmaphashset-allow-one](06-Collections-Framework.md#10-why-does-treemaptreeset-not-allow-a-null-key-while-hashmaphashset-allow-one)*

### 11. Why should `PriorityQueue` not be treated as a regular queue?

**Answer:** Because `poll()` hands you the most important element, not the one that's been waiting longest. `PriorityQueue` is backed by a min-heap, and `poll()` returns the smallest element according to the given `Comparator`, or natural ordering via `Comparable` — not whatever arrived first. It's the right tool specifically when "most urgent, most important, next" should beat strict arrival order — like processing support tickets by severity instead of FIFO, First In, First Out.

*Source: [06-Collections-Framework.md#11-why-should-priorityqueue-not-be-treated-as-a-regular-queue](06-Collections-Framework.md#11-why-should-priorityqueue-not-be-treated-as-a-regular-queue)*


## [7. Exception Handling](07-Exception-Handling.md)

### 1. Checked vs unchecked exceptions — how do you decide which to use for a new exception type?

**Answer:** Ask whether the caller can realistically plan for this at compile time. Go checked when the failure is genuinely recoverable and the caller can reasonably be expected to plan for it — a missing file, a network call that might time out. Go unchecked for programming errors and most business-rule violations. Forcing every method in a deep call chain to declare `throws` for an exception it can't even handle itself is exactly the ceremony most modern services skip, by making business exceptions extend `RuntimeException`.

*Source: [07-Exception-Handling.md#1-checked-vs-unchecked-exceptions-how-do-you-decide-which-to-use-for-a-new-exception-type](07-Exception-Handling.md#1-checked-vs-unchecked-exceptions-how-do-you-decide-which-to-use-for-a-new-exception-type)*

### 2. Why use exceptions instead of returning an error code?

**Answer:** Because a failure that can be ignored eventually will be. A return code only gets checked if the caller remembers to check it, and nothing forces that — a forgotten check lets the program silently keep going with a failure it never even noticed. An exception is different: it stops execution immediately at the point of failure and unwinds the stack until something catches it, so it can't be silently ignored by accident. It also carries a type, a message, and a full stack trace, none of which a bare int or a `null` could ever give you.

*Source: [07-Exception-Handling.md#2-why-use-exceptions-instead-of-returning-an-error-code](07-Exception-Handling.md#2-why-use-exceptions-instead-of-returning-an-error-code)*

### 3. Does `finally` run if the `try` block has a `return` statement?

**Answer:** Yes, every time. The return value gets computed first, then `finally` runs, and only after that does control actually go back to the caller. The one dangerous exception: if `finally` itself returns or throws, it silently discards the original outcome. That's a real footgun, and exactly why you should never `return` or `throw` from inside a `finally` block.

**Follow-up:** What's the difference between `throw` and `throws`? `throw` is a statement that actually raises an exception right there, on that line. `throws` is just a declaration in the method signature, saying this method might propagate a checked exception, so callers know they need to handle it or declare it too.

*Source: [07-Exception-Handling.md#3-does-finally-run-if-the-try-block-has-a-return-statement](07-Exception-Handling.md#3-does-finally-run-if-the-try-block-has-a-return-statement)*

### 4. Why must more specific exceptions be caught before more general ones in the same `try`?

**Answer:** Because catch blocks are checked top to bottom, and only the first match wins. If a general exception type is caught first, a more specific catch block placed after it becomes dead code — every instance of that subtype would already have matched the general catch above it. Java actually catches this at compile time for exception types with a real subclass relationship, and rejects the ordering outright instead of letting the dead code through.

*Source: [07-Exception-Handling.md#4-why-must-more-specific-exceptions-be-caught-before-more-general-ones-in-the-same-try](07-Exception-Handling.md#4-why-must-more-specific-exceptions-be-caught-before-more-general-ones-in-the-same-try)*

### 5. Why should you always pass the original exception as the `cause` when wrapping it in a custom exception?

**Answer:** Because without it, you throw away the one clue that would've told you what actually went wrong. Skip the cause, and the new exception's stack trace only shows where you threw the wrapper — the real root cause, like a database timeout, is simply gone from the logs. Pass it through `super(message, cause)` instead, and the full original stack trace survives as a nested "Caused by" — often the only way you'll actually be able to debug the real failure later.

*Source: [07-Exception-Handling.md#5-why-should-you-always-pass-the-original-exception-as-the-cause-when-wrapping-it-in-a-custom-exception](07-Exception-Handling.md#5-why-should-you-always-pass-the-original-exception-as-the-cause-when-wrapping-it-in-a-custom-exception)*

### 6. Why build a custom exception hierarchy instead of throwing plain `RuntimeException` everywhere?

**Answer:** So error-handling code can tell failures apart without resorting to string-matching on a message. A shared base type lets code like a `@RestControllerAdvice`, a retry policy, or a metrics counter catch one type and branch on the specific subtype — mapping each business failure to the right response, a 404 for "not found," a 409 for "conflict." Without that hierarchy, every failure ends up looking identical, forcing a generic 500 response, or forcing fragile string-matching on the exception message just to figure out what actually went wrong.

*Source: [07-Exception-Handling.md#6-why-build-a-custom-exception-hierarchy-instead-of-throwing-plain-runtimeexception-everywhere](07-Exception-Handling.md#6-why-build-a-custom-exception-hierarchy-instead-of-throwing-plain-runtimeexception-everywhere)*

### 7. What does `try`-with-resources actually guarantee, and how is it better than closing a resource in `finally`?

**Answer:** It guarantees every declared resource actually gets closed, no matter how the block exits — that's the one thing manual `finally` cleanup can quietly get wrong. `try`-with-resources calls `close()` on every declared resource when the block exits, in reverse declaration order, whether the block succeeded, threw, or returned early. And if closing one resource throws, it still goes on and closes the rest. Manual cleanup in a `finally` block is easy to get subtly wrong with multiple resources, because one `close()` call throwing there skips every `close()` call after it in that same block.

**Follow-up:** What's the difference between `AutoCloseable` and `Closeable`? `AutoCloseable` is the general contract, with `close()` declared to throw the broad `Exception`. `Closeable` narrows that down to Input/Output classes specifically, with `close()` declared to throw only `IOException`. Both work fine in a `try`-with-resources statement.

*Source: [07-Exception-Handling.md#7-what-does-trywithresources-actually-guarantee-and-how-is-it-better-than-closing-a-resource-in-finally](07-Exception-Handling.md#7-what-does-trywithresources-actually-guarantee-and-how-is-it-better-than-closing-a-resource-in-finally)*

### 8. Is it acceptable to catch `Exception` (or worse, `Throwable`) broadly in application code?

**Answer:** Only at one deliberate boundary in the whole system — never scattered through ordinary business logic. That boundary looks like a top-level request handler or a scheduled job runner that must never crash the whole process. Even there, you log the full exception and either rethrow it or return a safe failure response — you never silently swallow it. Catching broadly deep inside ordinary business logic hides real bugs, including completely unrelated ones, like a typo that causes a `NullPointerException`, and makes every failure far harder to diagnose later.

*Source: [07-Exception-Handling.md#8-is-it-acceptable-to-catch-exception-or-worse-throwable-broadly-in-application-code](07-Exception-Handling.md#8-is-it-acceptable-to-catch-exception-or-worse-throwable-broadly-in-application-code)*

### 9. What's actually wrong with an empty `catch` block?

**Answer:** It makes a real failure invisible — the program looks like it's working while it's actually failing every single time. An empty `catch` block swallows the exception: the failure genuinely happened, but nothing records that it did. This can go unnoticed for a long time, because there's no log line, no metric, no visible symptom pointing back at the real cause. At an absolute minimum, log the exception — ideally, decide explicitly whether to recover, rethrow, or fail loudly instead.

*Source: [07-Exception-Handling.md#9-whats-actually-wrong-with-an-empty-catch-block](07-Exception-Handling.md#9-whats-actually-wrong-with-an-empty-catch-block)*


## [8. Multithreading and Concurrency (Core Java)](08-Multithreading-Concurrency.md)

### 1. Why is `Runnable` generally preferred over extending `Thread`?

**Answer:** Because Java only gives you one `extends` slot, and extending `Thread` burns it on something you could get another way. Extending `Thread` spends your one available `extends` slot purely to gain thread behavior — behavior you could just as easily get through composition instead. Implementing `Runnable`, or just passing a lambda since `Runnable` is a functional interface, keeps your class free to extend something else. It also cleanly separates "what work to run" from "how it gets executed" — the same `Runnable` can be handed straight to a `Thread`, or submitted to an `ExecutorService`.

*Source: [08-Multithreading-Concurrency.md#1-why-is-runnable-generally-preferred-over-extending-thread](08-Multithreading-Concurrency.md#1-why-is-runnable-generally-preferred-over-extending-thread)*

### 2. What actually goes wrong if you call `thread.run()` instead of `thread.start()`?

**Answer:** No new thread ever gets created — that's the whole bug in one sentence. `run()` just executes the method body synchronously on whichever thread called it. Code that assumes it's running concurrently ends up silently running sequentially instead, with no error and no warning. That's exactly what makes this mistake dangerous: the code still looks correct, and often even produces the correct output — it just has none of the concurrency you actually intended.

**Follow-up:** How would you notice this bug in practice? The telltale sign is that `Thread.currentThread().getName()` inside `run()` prints the *calling* thread's name, often `main`, instead of a brand-new thread name.

*Source: [08-Multithreading-Concurrency.md#2-what-actually-goes-wrong-if-you-call-threadrun-instead-of-threadstart](08-Multithreading-Concurrency.md#2-what-actually-goes-wrong-if-you-call-threadrun-instead-of-threadstart)*

### 3. Why is `count++` on a shared field a race condition, even though it looks like one line?

**Answer:** Because "one line" is actually hiding three separate steps underneath. `count++` is really read the current value, add one, then write the result back — and nothing guarantees those three steps happen as a single indivisible unit. Two threads can both read the same old value before either has written its result back, so one of the two increments just quietly gets lost.

*Source: [08-Multithreading-Concurrency.md#3-why-is-count-on-a-shared-field-a-race-condition-even-though-it-looks-like-one-line](08-Multithreading-Concurrency.md#3-why-is-count-on-a-shared-field-a-race-condition-even-though-it-looks-like-one-line)*

### 4. Does `volatile` fix the `count++` race condition?

**Answer:** No — `volatile` solves a completely different problem: visibility, not atomicity. It only guarantees that a read on one thread sees the most recent write from another thread, as defined by the Java Memory Model. It says nothing at all about making a multi-step read-modify-write operation atomic. `count++` on a `volatile int` is still a race; you need `AtomicInteger`, `synchronized`, or an equivalent lock to actually fix it.

*Source: [08-Multithreading-Concurrency.md#4-does-volatile-fix-the-count-race-condition](08-Multithreading-Concurrency.md#4-does-volatile-fix-the-count-race-condition)*

### 5. `sleep()` versus `wait()` — what's the real difference?

**Answer:** `sleep()` just pauses; `wait()` pauses and lets go of the lock so someone else can actually make progress. `sleep()` simply pauses the current thread for a fixed duration, and holds onto any lock it currently has the whole time. `wait()` is called while holding a lock, releases that lock while it's paused, and stays paused until another thread calls `notify()` or `notifyAll()` on the same object. It exists specifically to coordinate threads around shared state — like a consumer thread waiting for a producer to add work to a queue.

*Source: [08-Multithreading-Concurrency.md#5-sleep-versus-wait-whats-the-real-difference](08-Multithreading-Concurrency.md#5-sleep-versus-wait-whats-the-real-difference)*

### 6. What's the difference between `notify()` and `notifyAll()`?

**Answer:** One wakes a single, arbitrary thread; the other wakes everybody. `notify()` wakes exactly one arbitrarily-chosen thread currently waiting on that object's lock. `notifyAll()` wakes every waiting thread, and each one reacquires the lock in turn and rechecks its own condition. Use `notify()` when any single waiter can handle the event and it truly doesn't matter which one. Use `notifyAll()` when multiple waiters might need to reevaluate — with only `notify()`, you risk waking the "wrong" thread while others that actually could have proceeded stay asleep.

*Source: [08-Multithreading-Concurrency.md#6-whats-the-difference-between-notify-and-notifyall](08-Multithreading-Concurrency.md#6-whats-the-difference-between-notify-and-notifyall)*

### 7. How would you cause a deadlock, and how would you prevent it?

**Answer:** Have two threads grab the same two locks in opposite order, and you get a deadlock every time. Thread 1 takes lock A, then waits for lock B. Thread 2 has already taken lock B, and waits for lock A. Neither can ever proceed, because neither will let go of what it's already holding. The fix is a globally consistent lock-acquisition order — for example, always lock the object with the smaller ID first — so it becomes structurally impossible for two threads to end up waiting on each other in a cycle.

*Source: [08-Multithreading-Concurrency.md#7-how-would-you-cause-a-deadlock-and-how-would-you-prevent-it](08-Multithreading-Concurrency.md#7-how-would-you-cause-a-deadlock-and-how-would-you-prevent-it)*

### 8. Why use an `ExecutorService` instead of creating a `Thread` per task?

**Answer:** Because a `Thread` isn't free — it maps to a real, fairly expensive OS thread. Spawning one per task doesn't scale: a burst of thousands of tasks would try to create thousands of OS threads all at once, exhausting memory and drowning the system in context-switching overhead. An `ExecutorService` avoids that by reusing a fixed, bounded pool of threads and just queuing the excess work instead — which is how real batch- and background-processing systems are actually built.

*Source: [08-Multithreading-Concurrency.md#8-why-use-an-executorservice-instead-of-creating-a-thread-per-task](08-Multithreading-Concurrency.md#8-why-use-an-executorservice-instead-of-creating-a-thread-per-task)*

### 9. What's the difference between the `BLOCKED` and `WAITING` thread states?

**Answer:** `BLOCKED` resolves itself automatically; `WAITING` needs someone else to actively wake it up. `BLOCKED` means the thread is trying to enter a `synchronized` block or method and another thread currently holds that lock — it becomes runnable again the moment the lock frees up, with no extra help needed. `WAITING` means the thread deliberately paused itself, via `wait()` or `join()`, and it needs an explicit wake-up — a `notify()`/`notifyAll()` call, or the joined thread actually finishing. A free lock by itself isn't enough to wake it.

*Source: [08-Multithreading-Concurrency.md#9-whats-the-difference-between-the-blocked-and-waiting-thread-states](08-Multithreading-Concurrency.md#9-whats-the-difference-between-the-blocked-and-waiting-thread-states)*

### 10. What does the Java Memory Model actually guarantee, in plain terms?

**Answer:** It's the rulebook for one specific question: when is a write by one thread guaranteed to actually be visible to a read on another thread? Without a mechanism like `volatile`, `synchronized`, or one of the higher-level `java.util.concurrent` classes, a thread can keep reading a stale, cached copy of a variable and never see another thread's update at all. Both CPU caching and compiler reordering are allowed to produce exactly that outcome — unless you use a construct that establishes a real visibility guarantee.

*Source: [08-Multithreading-Concurrency.md#10-what-does-the-java-memory-model-actually-guarantee-in-plain-terms](08-Multithreading-Concurrency.md#10-what-does-the-java-memory-model-actually-guarantee-in-plain-terms)*

### 11. For a simple shared counter, would you reach for `synchronized` or `AtomicInteger`?

**Answer:** Default to `AtomicInteger` for a single counter, and only reach for `synchronized` once more than one variable is involved. `AtomicInteger`'s compare-and-swap-based operations perform the whole read-modify-write as one atomic step, with no thread ever blocking — that's usually both simpler and faster than a lock for a single variable. Reach for `synchronized` instead when you need to protect more than one variable together, or a whole sequence of operations that has to run as one unit — that's something a single atomic class just can't express.

*Source: [08-Multithreading-Concurrency.md#11-for-a-simple-shared-counter-would-you-reach-for-synchronized-or-atomicinteger](08-Multithreading-Concurrency.md#11-for-a-simple-shared-counter-would-you-reach-for-synchronized-or-atomicinteger)*


## [9. Java 8: Lambdas, Streams, and Optional](09-Java8-Lambda-Stream-Optional.md)

### 1. What is a functional interface, and why does a lambda need one?

**Answer:** A functional interface is just an interface with exactly one abstract method — it can still have `default` or `static` methods with real bodies, that's fine. A lambda needs one because a lambda has no type of its own; it's just shorthand syntax for implementing that one abstract method. The compiler needs a functional interface as the target type to even know what the lambda is implementing.

**Follow-up:** Why doesn't `@FunctionalInterface` do anything at runtime? It's a compile-time-only check. It stops someone from later adding a second abstract method, which would otherwise silently break every lambda already written against that interface.

*Source: [09-Java8-Lambda-Stream-Optional.md#1-what-is-a-functional-interface-and-why-does-a-lambda-need-one](09-Java8-Lambda-Stream-Optional.md#1-what-is-a-functional-interface-and-why-does-a-lambda-need-one)*

### 2. `map()` vs `flatMap()` — give a real example of when you'd need `flatMap`.

**Answer:** `map()` gives you one output per input; `flatMap()` flattens a stream of streams into one single stream. `map()` transforms each element into exactly one output element. `flatMap()` transforms each element into a stream of elements, then flattens all of those into one combined stream. Say you have a `List<Order>`, and each `Order` holds a `List<OrderLine>` — turning that into one flat `Stream<OrderLine>` needs `flatMap`. `map` alone would just leave you with a stream of lists, not a flat stream of lines.

*Source: [09-Java8-Lambda-Stream-Optional.md#2-map-vs-flatmap-give-a-real-example-of-when-youd-need-flatmap](09-Java8-Lambda-Stream-Optional.md#2-map-vs-flatmap-give-a-real-example-of-when-youd-need-flatmap)*

### 3. Why are intermediate stream operations lazy, and why does that matter?

**Answer:** Laziness is what lets a whole chain of `filter`, `map`, `sorted` fuse into one single pass over the data, instead of building a fully materialized list at every single stage. Nothing actually runs until a terminal operation gets invoked. The flip side is that a stream with no terminal operation does absolutely nothing — which is exactly the "why didn't my filter run" confusion someone hits when they forget to call `collect()`, `forEach()`, or similar.

*Source: [09-Java8-Lambda-Stream-Optional.md#3-why-are-intermediate-stream-operations-lazy-and-why-does-that-matter](09-Java8-Lambda-Stream-Optional.md#3-why-are-intermediate-stream-operations-lazy-and-why-does-that-matter)*

### 4. What does `Collectors.groupingBy()` actually give you, with a real example?

**Answer:** It hands you a `Map` from a key straight to the list of elements that share that key, with no grouping loop to write yourself. For example, `orders.stream().collect(Collectors.groupingBy(Order::getStatus))` produces a `Map<OrderStatus, List<Order>>` — exactly the shape you need to answer "show me all orders grouped by status." Pair it with a second collector, like `Collectors.reducing`, and you can replace that grouped list with an aggregate instead — a sum per group, rather than the raw matching elements.

*Source: [09-Java8-Lambda-Stream-Optional.md#4-what-does-collectorsgroupingby-actually-give-you-with-a-real-example](09-Java8-Lambda-Stream-Optional.md#4-what-does-collectorsgroupingby-actually-give-you-with-a-real-example)*

### 5. Why is `Optional` not "just a replacement for every `null`"?

**Answer:** Its real job is forcing the caller to actually deal with absence, right there in the return type — not hiding a `null` and hoping for the best. `Optional` makes "this might be absent" an explicit, visible part of a method's return type, forcing the caller to decide what happens in that case — via `orElse`, `orElseThrow`, and so on — instead of silently risking a `NullPointerException` several calls downstream. Using it as a field or parameter type, or calling `.get()` without checking presence first, just moves the same null-handling problem somewhere else instead of actually solving it.

**Follow-up:** What's the difference between `orElse` and `orElseGet`? `orElse` always evaluates its argument, even when the value is already present. `orElseGet` takes a supplier and only computes the fallback when the value is genuinely absent — the right choice whenever computing that fallback is expensive.

*Source: [09-Java8-Lambda-Stream-Optional.md#5-why-is-optional-not-just-a-replacement-for-every-null](09-Java8-Lambda-Stream-Optional.md#5-why-is-optional-not-just-a-replacement-for-every-null)*

### 6. Why did Java 8 add `default` methods to interfaces?

**Answer:** So the standard library, or any interface, could add new methods without breaking every class that already implements it. Before Java 8, adding a method to a published interface was a breaking change for every single implementer out there. `default` gives that new method a body that existing implementers just inherit automatically, while new implementers are still free to override it. That's exactly how `Collection.forEach()` and `stream()` got added without breaking the existing ecosystem.

*Source: [09-Java8-Lambda-Stream-Optional.md#6-why-did-java-8-add-default-methods-to-interfaces](09-Java8-Lambda-Stream-Optional.md#6-why-did-java-8-add-default-methods-to-interfaces)*

### 7. Stream vs Collection — what's the actual distinction an interviewer wants to hear?

**Answer:** A `Collection` is something you store and reuse; a `Stream` is a one-shot pipeline that runs through the data once. A `Collection` holds data eagerly, and you can use it over and over. A `Stream` processes data through a pipeline, evaluates lazily until a terminal operation runs, never modifies its source, and can only be consumed once — try to reuse an already-consumed stream and it throws `IllegalStateException`.

*Source: [09-Java8-Lambda-Stream-Optional.md#7-stream-vs-collection-whats-the-actual-distinction-an-interviewer-wants-to-hear](09-Java8-Lambda-Stream-Optional.md#7-stream-vs-collection-whats-the-actual-distinction-an-interviewer-wants-to-hear)*

### 8. What's the actual difference between a lambda and a method reference?

**Answer:** None, really — they produce exactly the same thing. A method reference like `User::getEmail` is exactly equivalent to the lambda `user -> user.getEmail()`; both compile down to the same functional-interface implementation. A method reference is really just shorthand for the common case where a lambda's whole body is just calling one existing method on its argument.

*Source: [09-Java8-Lambda-Stream-Optional.md#8-whats-the-actual-difference-between-a-lambda-and-a-method-reference](09-Java8-Lambda-Stream-Optional.md#8-whats-the-actual-difference-between-a-lambda-and-a-method-reference)*

### 9. What's the general-purpose tool behind operations like `sum`, `count`, and `max` on a stream?

**Answer:** `reduce(identity, accumulator)` is the one general-purpose tool underneath all of those. It starts from an identity value, then repeatedly combines the running result with the next stream element using the function you give it. It's worth reaching for directly whenever the aggregation you need doesn't match one of the built-in `Collectors`.

*Source: [09-Java8-Lambda-Stream-Optional.md#9-whats-the-generalpurpose-tool-behind-operations-like-sum-count-and-max-on-a-stream](09-Java8-Lambda-Stream-Optional.md#9-whats-the-generalpurpose-tool-behind-operations-like-sum-count-and-max-on-a-stream)*


## [10. Generics, Enums, and Modern Java Features](10-Generics-Enums-Modern-Java.md)

### 1. What problem do generics actually solve, beyond "type safety" as a buzzword?

**Answer:** Generics move a bug from a runtime surprise to a compile-time error, and save you a manual cast on every read too. Before generics, a collection held raw `Object`, so putting the wrong type in compiled just fine and only blew up with `ClassCastException` at runtime — often far away from where the actual mistake was made. Generics push that error to compile time instead, and remove the need for a manual cast every time you read a value out. The same benefit shows up architecturally too: the exact same `Repository<T, ID>` interface can be written once and reused correctly for every entity type, instead of duplicated per type.

*Source: [10-Generics-Enums-Modern-Java.md#1-what-problem-do-generics-actually-solve-beyond-type-safety-as-a-buzzword](10-Generics-Enums-Modern-Java.md#1-what-problem-do-generics-actually-solve-beyond-type-safety-as-a-buzzword)*

### 2. Explain PECS — when do you use `? extends T` vs `? super T`?

**Answer:** PECS: "Producer Extends, Consumer Super" — that's the whole rule in four words. Use `? extends T` when you're only reading values out — it's producing values for you — and you can't safely add to it, since the compiler doesn't know the exact subtype involved. Use `? super T` when you're only writing values in — it's consuming values from you — and reading from it beyond `Object` is unsafe, since the compiler doesn't know exactly what supertype it actually holds.

*Source: [10-Generics-Enums-Modern-Java.md#2-explain-pecs-when-do-you-use-extends-t-vs-super-t](10-Generics-Enums-Modern-Java.md#2-explain-pecs-when-do-you-use-extends-t-vs-super-t)*

### 3. What is type erasure, and what does it prevent you from doing?

**Answer:** By runtime, the generic type information is just gone — that's type erasure, and it's the source of several strange restrictions. Generic type parameters exist only at compile time, purely for the compiler's own checking; at runtime, `List<String>` and `List<Integer>` are both just plain `List`. That's exactly why you can't instantiate a type parameter directly with `new T()`, can't check `instanceof List<String>`, and can't overload two methods whose signatures differ only by their generic type argument.

*Source: [10-Generics-Enums-Modern-Java.md#3-what-is-type-erasure-and-what-does-it-prevent-you-from-doing](10-Generics-Enums-Modern-Java.md#3-what-is-type-erasure-and-what-does-it-prevent-you-from-doing)*

### 4. Why write an enum with a constructor and fields instead of just plain constants?

**Answer:** So each constant can carry its own real data and behavior, instead of the calling code needing a separate lookup table somewhere else. A plain enum is just named constants. Give it fields — like a currency symbol and a decimal-places count — plus a constructor, and each constant now carries its own real data and behavior. Calling code just asks the constant itself, instead of maintaining a separate lookup table or a switch statement scattered somewhere else in the codebase.

*Source: [10-Generics-Enums-Modern-Java.md#4-why-write-an-enum-with-a-constructor-and-fields-instead-of-just-plain-constants](10-Generics-Enums-Modern-Java.md#4-why-write-an-enum-with-a-constructor-and-fields-instead-of-just-plain-constants)*

### 5. Why is a single-element enum considered the safest way to implement a Singleton in Java?

**Answer:** Because the JVM itself closes three real holes that a hand-written singleton has to close manually, and can easily get wrong. A hand-written singleton faces three real failure modes: a race condition if `getInstance()` isn't properly synchronized, reflection bypassing the private constructor to build a second instance anyway, and deserialization silently creating yet another instance without a `readResolve()`. An enum sidesteps all three automatically: the JVM guarantees an enum constant is constructed exactly once, it forbids reflective construction of enum constructors, and it handles enum serialization specially so it always resolves back to the same constant. No developer-written code has to get any of that right.

**Follow-up:** Why can't a hand-written singleton just declare its constructor `private` and call it done? Because `private` only stops normal `new` calls at compile time. Reflection, via `setAccessible(true)`, can still invoke a private constructor directly at runtime — so `private` alone is never a real guarantee of "exactly one instance."

*Source: [10-Generics-Enums-Modern-Java.md#5-why-is-a-singleelement-enum-considered-the-safest-way-to-implement-a-singleton-in-java](10-Generics-Enums-Modern-Java.md#5-why-is-a-singleelement-enum-considered-the-safest-way-to-implement-a-singleton-in-java)*

### 6. Is `var` a step toward dynamic typing in Java?

**Answer:** No — the type is still fully nailed down and checked at compile time, `var` just saves you from having to type it out. The compiler figures the type out from the right-hand side, exactly as it always would; `var` is purely a typing shortcut. It's also restricted to local variables, and it works best when the inferred type is already obvious from context — not in cases where it would hide meaningful type information from whoever reads the code later.

*Source: [10-Generics-Enums-Modern-Java.md#6-is-var-a-step-toward-dynamic-typing-in-java](10-Generics-Enums-Modern-Java.md#6-is-var-a-step-toward-dynamic-typing-in-java)*

### 7. What does a `record` actually generate for you, and why does that matter for DTOs?

**Answer:** One line gets you a constructor, accessors, and correct `equals()`, `hashCode()`, and `toString()` — five pieces of boilerplate you used to have to hand-write and keep in sync yourself. That matters a lot for a DTO, which is exactly the immutable shape a REST response or a JPA projection needs — it removes the boilerplate, and it removes a classic bug source too: an `equals()` or `hashCode()` that quietly falls out of sync after someone adds a new field.

*Source: [10-Generics-Enums-Modern-Java.md#7-what-does-a-record-actually-generate-for-you-and-why-does-that-matter-for-dtos](10-Generics-Enums-Modern-Java.md#7-what-does-a-record-actually-generate-for-you-and-why-does-that-matter-for-dtos)*

### 8. What's the actual benefit of a `sealed` interface over a plain one, especially with pattern matching?

**Answer:** A `sealed` interface locks down the complete list of allowed implementations, so the compiler can actually verify a pattern-matching `switch` covers every case, with no `default` branch required. That's directly useful for a result type like `PaymentResult`: if a new subtype ever gets added later, every `switch` over it that wasn't updated becomes a compile error, instead of a silently-missed case that only shows up at runtime.

*Source: [10-Generics-Enums-Modern-Java.md#8-whats-the-actual-benefit-of-a-sealed-interface-over-a-plain-one-especially-with-pattern-matching](10-Generics-Enums-Modern-Java.md#8-whats-the-actual-benefit-of-a-sealed-interface-over-a-plain-one-especially-with-pattern-matching)*

### 9. Why reach for `EnumMap`/`EnumSet` instead of a plain `HashMap`/`HashSet` when the key or element type is an enum?

**Answer:** Because they're backed by a plain array instead of a hash table, so they're faster and more memory-efficient for exactly this one case. `EnumMap`/`EnumSet` are indexed internally by each constant's declaration order, rather than going through a general-purpose hash table. They're the right tool specifically when the key space is an enum's full set of constants — for any other key type, a regular `HashMap`/`HashSet` is still the normal choice.

*Source: [10-Generics-Enums-Modern-Java.md#9-why-reach-for-enummapenumset-instead-of-a-plain-hashmaphashset-when-the-key-or-element-type-is-an-enum](10-Generics-Enums-Modern-Java.md#9-why-reach-for-enummapenumset-instead-of-a-plain-hashmaphashset-when-the-key-or-element-type-is-an-enum)*


## [11. Design Patterns in Core Java](11-Design-Patterns-Core-Java.md)

### 1. Why does the double-checked-locking singleton need `volatile` on the instance field?

**Answer:** Without `volatile`, another thread can end up looking at a half-built object, because the JVM and CPU are allowed to reorder "allocate, initialize, assign" for performance. That means another thread could observe the `instance` reference as non-null before the constructor has actually finished setting up the object's fields — and read a partially-constructed object as a result. `volatile` forbids that reordering for this field, so any thread that sees a non-null `instance` is guaranteed to see a fully-initialized one.

**Follow-up:** Why are there two `null` checks instead of one? They do two different jobs. The outer check, with no lock, lets every call skip locking once the instance already exists — that's just the fast path. The inner check, inside the lock, is the one that actually prevents two instances: it catches the case where two threads both passed the outer check before either one managed to acquire the lock.

*Source: [11-Design-Patterns-Core-Java.md#1-why-does-the-doublecheckedlocking-singleton-need-volatile-on-the-instance-field](11-Design-Patterns-Core-Java.md#1-why-does-the-doublecheckedlocking-singleton-need-volatile-on-the-instance-field)*

### 2. Why might an enum singleton be a stronger interview answer than double-checked locking?

**Answer:** Because a simpler solution that's just as correct is always the stronger answer than a complicated one recited from memory. Choosing an enum singleton shows you know the JVM already guarantees an enum constant is created exactly once, thread-safely, with zero hand-written locking and no chance of getting `volatile` or the double-check logic wrong.

*Source: [11-Design-Patterns-Core-Java.md#2-why-might-an-enum-singleton-be-a-stronger-interview-answer-than-doublechecked-locking](11-Design-Patterns-Core-Java.md#2-why-might-an-enum-singleton-be-a-stronger-interview-answer-than-doublechecked-locking)*

### 3. What's the actual downside of singletons, beyond "they're an anti-pattern" as a slogan?

**Answer:** It hides a dependency that testing really needs to see, and concentrates shared state in one place everything touches. A singleton hides a dependency that would otherwise be visible and swappable through a constructor parameter — code that calls `getInstance()` internally can't easily be handed a fake version for a unit test. It also concentrates shared mutable state in one single place, accessed from everywhere, which is exactly the kind of state that's easy to get wrong under concurrent access unless it's carefully kept thread-safe.

*Source: [11-Design-Patterns-Core-Java.md#3-whats-the-actual-downside-of-singletons-beyond-theyre-an-antipattern-as-a-slogan](11-Design-Patterns-Core-Java.md#3-whats-the-actual-downside-of-singletons-beyond-theyre-an-antipattern-as-a-slogan)*

### 4. Why choose Builder over a large constructor or a chain of setters?

**Answer:** Both alternatives fail differently, and Builder avoids both failures at once. A large constructor makes call sites unreadable — you can't tell which positional argument is which flag without going and checking the signature — and it only gets worse as optional fields get added, the classic telescoping-constructor problem. A setter chain avoids that, but leaves the object mutable and visible in a half-configured state at every point between the first setter call and the last. A builder fixes both: every field assignment is self-documenting by name, required fields get validated in exactly one place, `build()`, and the object doesn't even exist until it's fully and validly constructed.

**Follow-up:** What does Lombok's `@Builder` actually do? It generates that same static inner `Builder` class, the named setter-style methods, and a `build()` method — the exact same boilerplate described above, just written for you automatically.

*Source: [11-Design-Patterns-Core-Java.md#4-why-choose-builder-over-a-large-constructor-or-a-chain-of-setters](11-Design-Patterns-Core-Java.md#4-why-choose-builder-over-a-large-constructor-or-a-chain-of-setters)*

### 5. What does the Factory pattern actually decouple, and why does that matter as a codebase grows?

**Answer:** It decouples "which concrete implementation do I need" from every place that actually needs one. Callers depend only on the interface, like `PaymentProcessor`, and a type value — never on the concrete classes, or on the decision logic that picks between them. That pays off as the codebase grows: adding a new implementation later means changing the factory in exactly one place, instead of hunting down and updating every scattered `new ConcreteClass()` call across checkout, refunds, admin tools, and wherever else that decision got copy-pasted.

*Source: [11-Design-Patterns-Core-Java.md#5-what-does-the-factory-pattern-actually-decouple-and-why-does-that-matter-as-a-codebase-grows](11-Design-Patterns-Core-Java.md#5-what-does-the-factory-pattern-actually-decouple-and-why-does-that-matter-as-a-codebase-grows)*

### 6. How does the Factory pattern relate to what Spring's dependency injection does automatically?

**Answer:** Dependency injection really is just the factory pattern, except the framework does the deciding for you. Spring figures out which concrete bean implementation satisfies a given interface, and hands it to whoever declared a need for it in their constructor. That's the exact same decision a hand-written factory method makes based on a type parameter — it's just performed by the container across the whole app, instead of by a method you have to write and maintain yourself.

*Source: [11-Design-Patterns-Core-Java.md#6-how-does-the-factory-pattern-relate-to-what-springs-dependency-injection-does-automatically](11-Design-Patterns-Core-Java.md#6-how-does-the-factory-pattern-relate-to-what-springs-dependency-injection-does-automatically)*

### 7. Is Builder's immutability actually required, or just conventional?

**Answer:** Just conventional — but it's a convention worth keeping. Nothing technically forces a builder to produce an immutable object; you could make the built class's fields non-final and mutable if you wanted to. The reason not to is that immutability is what actually eliminates the "observed half-built" bug. An immutable object that only comes into existence inside `build()`, already fully populated, can never be read in an inconsistent state by anything holding a reference to it.

*Source: [11-Design-Patterns-Core-Java.md#7-is-builders-immutability-actually-required-or-just-conventional](11-Design-Patterns-Core-Java.md#7-is-builders-immutability-actually-required-or-just-conventional)*

### 8. When is a singleton the wrong tool, even though "only one instance" sounds correct?

**Answer:** When "one instance" really means one instance *per request*, or *per test*, or *per session* — not one instance for the entire running application. A hand-rolled singleton, with a static field and a private constructor, gives you exactly one instance for the whole JVM process, which is far too broad for those narrower cases. It also actively gets in the way of testing, since every test run ends up sharing that same static instance unless it's explicitly reset.

*Source: [11-Design-Patterns-Core-Java.md#8-when-is-a-singleton-the-wrong-tool-even-though-only-one-instance-sounds-correct](11-Design-Patterns-Core-Java.md#8-when-is-a-singleton-the-wrong-tool-even-though-only-one-instance-sounds-correct)*


## [12. SOLID Principles](12-SOLID-Principles.md)

### 1. What does each letter in SOLID actually stand for?

**Answer:** Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. Worth remembering: these are five independent design principles bundled under one acronym for convenience, not five steps of one process — a class can happily satisfy some of them while violating others.

*Source: [12-SOLID-Principles.md#1-what-does-each-letter-in-solid-actually-stand-for](12-SOLID-Principles.md#1-what-does-each-letter-in-solid-actually-stand-for)*

### 2. What's the actual test for whether a class violates Single Responsibility?

**Answer:** Ask yourself one question: "what would force this class to change?" If you come up with multiple unrelated answers — a notification template changes, or the persistence schema changes, or the invoice layout changes — that class has multiple responsibilities bundled together, and it should be split so each piece can change independently of the others.

*Source: [12-SOLID-Principles.md#2-whats-the-actual-test-for-whether-a-class-violates-single-responsibility](12-SOLID-Principles.md#2-whats-the-actual-test-for-whether-a-class-violates-single-responsibility)*

### 3. How does polymorphism relate to the Open/Closed Principle?

**Answer:** Polymorphism is usually the actual mechanism that makes OCP happen in practice. A method that accepts an interface, like `PaymentMethod`, and just calls its abstract method, never needs to change when a new implementation shows up. You extend the behavior by writing a brand-new class, not by editing the existing, already-tested method.

*Source: [12-SOLID-Principles.md#3-how-does-polymorphism-relate-to-the-openclosed-principle](12-SOLID-Principles.md#3-how-does-polymorphism-relate-to-the-openclosed-principle)*

### 4. What makes `Collections.unmodifiableList()` a real, famous LSP violation?

**Answer:** Because it hands you something that claims to be a `List` but breaks the `List` contract the moment you actually use it that way. `Collections.unmodifiableList()` returns an object that IS-A `List`, which contractually promises `add()`/`remove()` will work — but calling either one throws `UnsupportedOperationException` at runtime instead. Code written generically against the `List` interface, trusting its documented contract, can get broken simply by being handed this one particular implementation.

**Follow-up:** How do you fix a genuine LSP violation like `InStorePickupRule` throwing inside `calculateCost()`? Recognize that the subtype doesn't actually belong in that hierarchy. Either change the method to return something like `Optional<BigDecimal>`, so "not applicable" becomes an expected outcome, or split the hierarchy so the non-conforming case lives in its own abstraction instead of pretending to be a `ShippingRule`.

*Source: [12-SOLID-Principles.md#4-what-makes-collectionsunmodifiablelist-a-real-famous-lsp-violation](12-SOLID-Principles.md#4-what-makes-collectionsunmodifiablelist-a-real-famous-lsp-violation)*

### 5. How do you recognize an Interface Segregation violation in real code?

**Answer:** The clearest tell is a class implementing an interface method just to throw `UnsupportedOperationException`, or leave the body empty. That's a sign the interface is bundling capabilities that don't all actually belong together, and it should be split so each implementer only has to take on the methods it genuinely supports.

*Source: [12-SOLID-Principles.md#5-how-do-you-recognize-an-interface-segregation-violation-in-real-code](12-SOLID-Principles.md#5-how-do-you-recognize-an-interface-segregation-violation-in-real-code)*

### 6. What's the difference between Dependency Inversion and Dependency Injection?

**Answer:** Simple way to remember it: Dependency Inversion is the rule, Dependency Injection is one way to follow it. Dependency Inversion says high-level code should depend on abstractions, and something external should decide which concrete implementation actually satisfies them. Dependency Injection is one specific technique for making that happen — supplying the concrete implementation from outside, through a constructor, a setter, or a framework like Spring, instead of the class building it itself.

**Follow-up:** Does applying DIP require Spring or any framework? No. The constructor-parameter version of `OrderService` satisfies DIP in plain Java with no framework anywhere in sight. A framework like Spring just automates supplying those constructor arguments across an entire application, instead of someone wiring `new OrderService(new SmtpEmailSender())` by hand everywhere it's needed.

*Source: [12-SOLID-Principles.md#6-whats-the-difference-between-dependency-inversion-and-dependency-injection](12-SOLID-Principles.md#6-whats-the-difference-between-dependency-inversion-and-dependency-injection)*

### 7. Can you violate SOLID and still ship working code? Why does it matter anyway?

**Answer:** Yes, easily — SOLID violations are almost never compile errors or immediate bugs, so the code runs perfectly fine on day one. The real cost shows up later, as friction whenever something needs to change. A class with five bundled responsibilities means five different reasons someone might need to touch it — and risk breaking it. A hardcoded dependency means you can't swap implementations for a test, or for a new requirement, without editing code that already worked and already shipped.

*Source: [12-SOLID-Principles.md#7-can-you-violate-solid-and-still-ship-working-code-why-does-it-matter-anyway](12-SOLID-Principles.md#7-can-you-violate-solid-and-still-ship-working-code-why-does-it-matter-anyway)*


## [13. Serialization, Cloning, Reflection, and Custom Annotations](13-Serialization-Cloning-Reflection-Annotations.md)

### 1. What does `transient` actually do, and what's a real reason to use it?

**Answer:** `transient` tells serialization to just skip a field entirely, so it excludes that field from Java serialization altogether. After deserialization, that field comes back at its type's default value, not the value it actually held before. A real use case is keeping a secret — an OTP, a raw password — or a cheaply-recomputable cached value from ever being written into the serialized bytes in the first place.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#1-what-does-transient-actually-do-and-whats-a-real-reason-to-use-it](13-Serialization-Cloning-Reflection-Annotations.md#1-what-does-transient-actually-do-and-whats-a-real-reason-to-use-it)*

### 2. Why does forgetting to declare `serialVersionUID` cause a real production problem?

**Answer:** Because Java quietly recomputes that ID from the class's structure, so any change to the class — even just adding a field — can silently break old serialized data. Without an explicit value, Java computes `serialVersionUID` automatically from the class's structure, so adding or removing a field changes that computed value. Trying to deserialize bytes written by an older version of the class then throws `InvalidClassException` at runtime — a real deployment problem for anything with serialized data, like a cache or a session store, that outlives one version of the class.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#2-why-does-forgetting-to-declare-serialversionuid-cause-a-real-production-problem](13-Serialization-Cloning-Reflection-Annotations.md#2-why-does-forgetting-to-declare-serialversionuid-cause-a-real-production-problem)*

### 3. Why does the default `Object.clone()` produce a broken copy for a class with a mutable field like a `List`?

**Answer:** Because it only copies one layer deep, so the "copy" ends up secretly sharing its inner objects with the original. `Object.clone()` performs a shallow copy: it duplicates primitive fields correctly, but copies reference fields as the *same reference* — so the copy and the original end up pointing at the exact same underlying `List`. Mutate that list through either object, and both objects see the change, which is almost never what you actually wanted. The `Order`/`OrderLine` example shows exactly this happening.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#3-why-does-the-default-objectclone-produce-a-broken-copy-for-a-class-with-a-mutable-field-like-a-list](13-Serialization-Cloning-Reflection-Annotations.md#3-why-does-the-default-objectclone-produce-a-broken-copy-for-a-class-with-a-mutable-field-like-a-list)*

### 4. Why do most experienced Java developers avoid `Cloneable` entirely?

**Answer:** Because `Cloneable` is awkward in three separate ways at once, and there's a simpler alternative that avoids all three. It's a marker interface with no actual `clone()` method to override cleanly — the real method lives on `Object` and is `protected`. `clone()` also bypasses the constructor entirely, so any validation logic sitting there never runs. And it forces a checked `CloneNotSupportedException` that's almost never meaningfully handled by anyone. A copy constructor or a static factory method gets you the same result far more predictably.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#4-why-do-most-experienced-java-developers-avoid-cloneable-entirely](13-Serialization-Cloning-Reflection-Annotations.md#4-why-do-most-experienced-java-developers-avoid-cloneable-entirely)*

### 5. What makes reflection powerful, and what does it genuinely cost?

**Answer:** Reflection's power and its cost come from the exact same thing: it lets code look at and call classes, fields, and methods it's never seen before, at runtime. That's exactly what lets a testing framework find and run `@Test` methods, lets Spring discover `@Service` classes, and lets Jackson map JSON onto DTO fields — all without anyone writing that lookup code by hand. But it costs real things in return: runtime performance, since the JIT can't inline through it and it needs extra checks; compile-time type safety, since a bad method name only fails at runtime instead of at compile time; and, through `setAccessible(true)`, the ability to deliberately bypass encapsulation — a genuine risk if that power is used outside trusted framework code.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#5-what-makes-reflection-powerful-and-what-does-it-genuinely-cost](13-Serialization-Cloning-Reflection-Annotations.md#5-what-makes-reflection-powerful-and-what-does-it-genuinely-cost)*

### 6. Why must a custom annotation use `@Retention(RetentionPolicy.RUNTIME)` if you intend to read it via reflection?

**Answer:** Because without it, the annotation gets thrown away before your running program ever gets a chance to look for it. The default retention, `CLASS`, keeps the annotation in the compiled `.class` file but discards it before the class gets loaded into a running JVM — so reflection at runtime can't see it at all. Only `RUNTIME` retention keeps it around for `Method.getAnnotation(...)` or `isAnnotationPresent(...)` calls while the program is actually executing. That's exactly what `@Loggable` needs to drive an AOP aspect, or what `@AllowedStatus` needs to drive a validator.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#6-why-must-a-custom-annotation-use-retentionretentionpolicyruntime-if-you-intend-to-read-it-via-reflection](13-Serialization-Cloning-Reflection-Annotations.md#6-why-must-a-custom-annotation-use-retentionretentionpolicyruntime-if-you-intend-to-read-it-via-reflection)*

### 7. Does putting `@Loggable` on a method actually do anything by itself?

**Answer:** No — an annotation by itself is just a label, with zero behavior of its own attached. `@Loggable` only ends up timing and logging a method call because some separate piece of code, an AOP aspect, uses reflection to check at runtime whether a method carries that annotation, and only then acts on it. Delete the aspect, and `@Loggable` becomes an inert label that changes absolutely nothing about how the method runs.

**Follow-up:** Name the other example from this material that works the same way. `@AllowedStatus`, from the REST API guide, works identically — the annotation itself does nothing; it's a `ConstraintValidator`, found via reflection by the Bean Validation engine, that actually rejects a disallowed value.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#7-does-putting-loggable-on-a-method-actually-do-anything-by-itself](13-Serialization-Cloning-Reflection-Annotations.md#7-does-putting-loggable-on-a-method-actually-do-anything-by-itself)*

### 8. Why does Java resolve a non-varargs overload before a varargs one when both could match a call?

**Answer:** Because Java always prefers the more specific, exact match over the more flexible one. Varargs is deliberately treated as the lowest-priority match, specifically to avoid ambiguous or surprising resolution whenever both an exact-arity method and a varargs method could apply to the same call.

*Source: [13-Serialization-Cloning-Reflection-Annotations.md#8-why-does-java-resolve-a-nonvarargs-overload-before-a-varargs-one-when-both-could-match-a-call](13-Serialization-Cloning-Reflection-Annotations.md#8-why-does-java-resolve-a-nonvarargs-overload-before-a-varargs-one-when-both-could-match-a-call)*
