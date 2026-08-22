# JVM and Memory Architecture

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](../Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. The Problem: What Do You Actually Need Installed?

A job posting says "JDK 17 required." Your production Dockerfile says `FROM eclipse-temurin:17-jre`. A tutorial tells you to "install Java" and everything just works. Are the JDK and the JRE the same thing? If a JRE is enough to run your app in production, why does the JDK exist at all, and why would anyone ship the bigger one?

Walk through what actually has to happen to your code before it can run:

```text
OrderService.java --(javac, the compiler)--> OrderService.class (bytecode) --(the JVM)--> machine instructions
```

Three different jobs are hiding in that one arrow, and each has its own package:

| Component | What it is | What it's for |
|---|---|---|
| **JDK** (Java Development Kit) | Compiler (`javac`), debugger, and a full JRE bundled together | *Writing and compiling* code — you need this on your laptop, in your CI build image |
| **JRE** (Java Runtime Environment) | The JVM plus the core class libraries (`java.util`, `java.lang`, etc.) — no compiler | *Running* already-compiled code — this is all a production container needs |
| **JVM** (Java Virtual Machine) | The actual engine inside the JRE that loads `.class` files, executes their bytecode, and manages memory | The thing that's actually running while your app is up |

That's the whole answer to the confusion: you need the JDK only where code gets *compiled* (your machine, your build pipeline). Anywhere code only needs to *run* (a production server), the smaller JRE is enough — which is exactly why a production Docker image built on a `-jre` base is smaller and has a smaller attack surface than one built on a `-jdk` base, with nothing lost, because nothing in production calls `javac`.

One more thing this setup buys you for free: **"write once, run anywhere."** `javac` produces the exact same `.class` bytecode regardless of whether it ran on Windows, Linux, or macOS. What differs is the JVM itself — Linux gets a Linux JVM, Windows gets a Windows JVM, each translating that identical bytecode into instructions for its own machine. Your source is compiled once; the JVM absorbs the platform difference.

## 2. The Problem: How Does a `.class` File Turn Into a Running Method?

Say your Spring Boot app just started, and the very first request hits `OrderController.getOrder(42)`. Nobody has ever called this method in this process before. What does the JVM actually have to do before your code's first line executes — and why does the exact same method get noticeably *faster* the 10,000th time it's called, without you changing a single line?

Two separate things happen, and conflating them is where most confusion comes from.

**First, class loading** — before `OrderController` can be used at all, the JVM has to read `OrderController.class` off disk and build an in-memory representation of it: its fields, its methods, its bytecode. This is done by a **class loader**, and there isn't just one — there are three, arranged parent-first (a child asks its parent to load a class before trying itself):

- **Bootstrap** class loader — loads the core JDK classes, `java.lang.*`, `java.util.*`.
- **Platform/Extension** class loader — loads JDK extension libraries.
- **Application** class loader — loads *your* code: `OrderController`, `OrderService`, and every JAR your `pom.xml`/`build.gradle` pulled in. This is the one that ends up loading almost everything you write.

This happens once per class, the first time it's actually needed — not once per request, not once per object.

**Second, execution** — once the bytecode is loaded, something has to actually run it. The **execution engine** starts by using an **interpreter**, which reads bytecode and executes it line by line — simple, but slow for code that runs over and over. The execution engine also tracks how often each method gets called, and if a method is called repeatedly (like `OrderService.findById`, which runs on every single request to that endpoint), the **JIT (Just-In-Time) compiler** kicks in: it compiles *that specific hot method* down to native machine code, so future calls skip the interpreter entirely and run at close to native speed.

That's the real answer to "why does it get faster": the first few calls to `findById` are interpreted, slower. Once the JIT decides it's hot, it gets compiled, and every call after that is faster — which is also why a benchmark that only runs a method once or twice never shows the JVM at its actual steady-state speed, and why a freshly restarted production server is measurably slower for its first minute or two ("JIT warm-up") than the same server an hour later.

## 3. The Problem: Where Does Everything Actually Live?

A profiler on your production server shows memory split into categories with names like "Heap," "Metaspace," and a separate number per thread. What are these regions, and which one is responsible for a given object at a given moment?

```text
                JVM Memory
┌─────────────────────────────────────┐
│  Method Area / Metaspace            │  ← class metadata, static fields — one per JVM
├─────────────────────────────────────┤
│  Heap                               │  ← all objects — shared across every thread
├─────────────────────────────────────┤
│  Stack (one per thread)             │  ← method calls, local variables
├─────────────────────────────────────┤
│  PC Register (one per thread)       │  ← address of the current instruction
├─────────────────────────────────────┤
│  Native Method Stack                │  ← for calls into non-Java (JNI) code
└─────────────────────────────────────┘
```

The clearest way to actually understand this layout is to trace one real request through it. Say `OrderController.getOrder(Long id)` calls `OrderService.findById(id)`, which calls `OrderRepository.findById(id)`:

```java
@RestController
class OrderController {
    private final OrderService service; // reference lives in the Heap, inside the OrderController object

    @GetMapping("/orders/{id}")
    ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
        OrderResponse response = service.findById(id); // a new stack frame for getOrder()
        return ResponseEntity.ok(response);
    }
}
```

- **Method Area** already holds `OrderController`'s class metadata — its field list, its method bytecode, the fact that it has one constructor — loaded once by the Application class loader from section 2, no matter how many requests arrive afterward.
- **Heap** holds the actual `OrderController` bean (one instance — Spring made it a singleton), the actual `OrderResponse` object built for *this specific request*, and every object either of them references.
- **Stack** — the thread handling this HTTP request gets its own stack. Calling `getOrder` pushes a new frame holding the local variable `id`, the reference to the not-yet-built `response`, and where to return to when the method ends. Calling into `service.findById(id)` pushes another frame on top of that one. The instant `findById` returns, its frame is popped off — which is why a local variable disappears the moment a method ends, with no garbage collector involved at all.
- Two concurrent requests get two completely independent stacks — each with its own `id`, its own frames — but both share the exact same `OrderController` heap object and the exact same Method Area class metadata. That sharing is precisely why a singleton bean's *instance fields* are dangerous under concurrency (two requests racing on the same field), while its *local variables* inside a method are always safe (each thread's stack keeps its own copy, untouched by any other thread).

## 4. The Problem: Not All Objects Deserve the Same GC Effort

Every `OrderResponse` your controller builds is garbage within milliseconds of being serialized and sent back. The `OrderService` bean, on the other hand, is created once at startup and referenced for the app's entire lifetime — it will never be garbage until shutdown. If the garbage collector scanned the *entire* heap with equal effort every single time, it would waste enormous effort re-checking long-lived objects like `OrderService` on every single pass, just to keep discovering — correctly, but uselessly — that they're still alive.

The fix is to split the heap so short-lived and long-lived objects are collected differently:

```text
Heap
├── Young Generation
│   ├── Eden        — every new object is born here
│   └── Survivor (S0, S1) — objects that survived at least one GC
└── Old Generation (Tenured) — long-lived objects
```

Back to the real request: every `OrderResponse` is born in **Eden**. Almost all of them die there within one collection cycle — that's the common case this design is built around. The `OrderService` bean is also born in Eden, but because something (the container) keeps referencing it, it survives collection after collection, gets moved Eden → Survivor → and eventually **promoted into the Old Generation (Tenured)**, where it stays for the rest of the app's life.

This split gives you two different kinds of collection, with two different costs:

- **Minor GC** — cleans only the Young Generation. Fast and frequent, because most objects there are already dead and get thrown away cheaply.
- **Major/Full GC** — cleans the Old Generation, or the entire heap. Slower, because it has to walk through the objects that survived precisely *because* they're still referenced. A Full GC that pauses a live server for hundreds of milliseconds is a classic, real production root cause behind a sudden p99 latency spike that has nothing to do with your endpoint code at all.

## 5. The Problem: Local Variables Need to Be Fast and Disappear on Their Own

Every method call needs somewhere to keep its parameters and local variables while it runs, and that somewhere needs to vanish automatically the instant the method returns — without waiting for a garbage collector to notice and clean it up, because that would make every single method call pay a GC-adjacent cost.

That's what the **stack** is for. Each thread gets its own, sized at JVM startup via `-Xss`, and it stores method call frames, local variables (primitives and references), and partial results of in-progress expressions:

```java
void computeTotal() {
    int total = 0;          // lives in this frame, on this thread's stack
    for (OrderLine line : lines) {
        total += line.getAmount(); // "lines" is a heap reference; "total" stays on the stack
    }
}
```

Because a stack frame is popped the moment its method returns, stack memory is reclaimed automatically and instantly — no garbage collector involvement, no pause, no scanning. That's also exactly why it's fast: no bookkeeping beyond "move the top-of-stack pointer back down."

## 6. Heap vs Stack, Side by Side

Sections 4 and 5 covered each region on its own. Put next to each other, the contrast is the whole point:

| | Heap | Stack |
|---|---|---|
| Shared across threads? | Yes | No — one stack per thread |
| Stores | Objects, instance fields | Local variables, method frames, references |
| Speed | Slower | Faster |
| Size | Large, GC-managed | Small, fixed per thread |
| Cleared by | Garbage Collector | Automatically, when the method returns |

## 7. The Problem: A String Comparison That "Works" — Until It Doesn't

You write a status check like this, run it in a quick test, and it passes:

```java
String status = "PENDING";
if (status == "PENDING") {   // == on Strings — looks fine, compiles fine, passes today
    System.out.println("still pending");
}
```

Then, weeks later, the exact same logic starts silently failing in production — not for every request, just some — and there's no exception, just wrong behavior. The status genuinely is `"PENDING"`, `.equals()` would say so, but `==` now says `false`.

Here's exactly why. String literals aren't each their own separate object — the JVM keeps a **String Pool** (a special region that lives inside the heap) that deduplicates them:

```java
String a = "PENDING";
String b = "PENDING";
// a == b is true — both point at the SAME pooled object

String c = new String("PENDING");
// c == a is false — new String(...) forces a fresh object outside the pool
```

`==` on objects compares *references* (are these literally the same object in memory?), never content. Two literals written directly in your source code happen to point at the same pooled object, so `==` "works" — by coincidence, not by correctness. The moment a string arrives from anywhere other than a literal — `new String(...)`, JSON deserialization, reading from a database, string concatenation built at runtime — it's a distinct object outside the pool, `==` returns `false`, and your check silently breaks even though the value is identical. That's exactly why `.equals()` (which compares actual content) is the only correct way to compare string values, and `==` is never safe for it — it happens to pass in a quick test written entirely with literals and then fails on real, dynamically-produced data (see the full breakdown in the [String Handling guide](05-String-Handling.md)).

While we're in this same region of memory: the **Method Area**, called **Metaspace** since Java 8, is where class-level information lives — class metadata, method bytecode, and `static` fields:

```java
class FeatureFlags {
    static boolean auditEnabled = true; // lives in Metaspace, one copy for the whole class
}
```

One copy, shared by every instance and every thread — never per-object. That single fact is also why a `static` field is the classic source of the exact kind of accidental cross-thread state described in section 3, and it sets up the next problem directly.

## 8. The Problem: Code With No Bugs That Still Crashes Weeks Later

Here's a class that compiles cleanly, passes every test, works fine in a demo, and gets deployed:

```java
class ReportCache {
    // Every generated report gets cached here forever — never evicted, never bounded.
    static final Map<Long, byte[]> cache = new HashMap<>();

    static void store(Long reportId, byte[] report) {
        cache.put(reportId, report); // grows without limit as the service runs
    }
}
```

Nothing here looks like a "bug" by any normal reading of that word. There's no null pointer, no off-by-one, no wrong logic. And yet, three weeks into a real deployment, the service throws `OutOfMemoryError` and dies.

To see why, first pin down when an object is actually allowed to be garbage-collected. It is *not* "when the variable goes out of scope in your source code" — it's when **nothing reachable from a GC root** (an active thread's stack, a static field, a JNI reference) references it anymore, through any chain of references:

```java
Order order = new Order();
order = null; // the old Order is now eligible for GC, assuming nothing else references it
```

Now look back at `ReportCache.cache`. It's a `static` field — which section 7 just established lives in Metaspace as long as the class is loaded, which for a normal running app means "forever." Every `byte[] report` ever stored in it is therefore reachable from a GC root (the static field itself) for the entire life of the process. The garbage collector isn't broken and isn't failing to do its job — it's doing exactly what it's supposed to do: it will never collect something it can still reach. The cache simply never lets go of anything, so the heap fills up one report at a time until there's no room left.

**This is what a "memory leak" means in Java** — there's no `free()` to forget to call, so nothing is literally leaking out of the process. Instead, something (almost always: a static collection, a listener that's registered and never unregistered, or a cache) keeps a reference alive long after the object is logically done being useful. The fix is a bounded cache with an actual eviction policy — an LRU-based `LinkedHashMap`, a library like Caffeine, or an external cache like Redis (see the [caching section](../Springboot/07-Common-Backend-Problems.md) of the Spring Boot guide) — never "just call `System.gc()`." That call is only ever a *hint* to the JVM that this might be a decent time to collect; the JVM is free to ignore it outright, and Java's own documentation makes no promise that it does anything at all. It does not free your unbounded map for you.

## 9. The Problem: Two Very Different Crashes That Get Confused

`OutOfMemoryError` and `StackOverflowError` are both real, production-grade failures, both sound similarly catastrophic, and both get lumped together by beginners as "ran out of memory." They come from two completely different regions covered above, with two completely different real-world causes:

```text
OutOfMemoryError       → the Heap (or Metaspace) is full and GC cannot free enough space.
                          Real cause: an unbounded cache like section 8's, loading an entire
                          huge result set into memory instead of paginating it, or a genuine
                          reference leak.

StackOverflowError     → one thread's call stack (section 5) grew past its size limit.
                          Real cause: unbounded or infinite recursion — e.g. a recursive
                          category tree traversal where the data has a cycle, or a self-
                          referencing JSON structure with no depth limit.
```

The second one is easy to actually trigger by accident. Say a `Category` tree is supposed to be a strict hierarchy, but a data bug lets a category end up as its own ancestor:

```java
// A realistic StackOverflowError: traversing a category tree that (by a data bug) has a cycle
void printCategoryPath(Category category) {
    System.out.println(category.getName());
    printCategoryPath(category.getParent()); // if parent chains cycle back, this never terminates
}
```

Every recursive call pushes one more frame onto that thread's stack (section 5). With a genuine cycle, this recursion never reaches a base case — it just keeps pushing frames until the thread's fixed-size stack runs out, and `StackOverflowError` is thrown. Notice this has nothing to do with the heap being full at all; a machine with terabytes of free heap will still throw this, because the limit being hit is the *stack size*, set independently via `-Xss`.

## 10. The Problem: "Avoid Creating Objects" Is Advice From an Older JVM

A common piece of performance advice says to minimize object allocation wherever possible, because every object means heap space and, eventually, GC work. Taken at face value today, that advice is outdated — and the reason is a JIT optimization worth knowing about even though you never write code to trigger it directly.

The JIT compiler (section 2) can sometimes prove that an object never "escapes" the method that creates it — no reference to it is ever stored anywhere else, returned, or handed to another thread. This is called **escape analysis**. When the JIT can prove this, it's free to allocate that object on the *stack* instead of the heap (or skip the allocation entirely) — because if nothing outside the method can ever see it, there is no need for it to survive past the method's own stack frame, and no need for the garbage collector to ever think about it.

You don't control this directly — it's an automatic JIT decision, made per method, based on what it can prove. But knowing it exists is exactly why "avoid all object creation for performance" is outdated as a blanket rule: plenty of short-lived, clearly-local objects already skip heap allocation and GC overhead entirely, without you doing anything special to make that happen.

## Interview Questions and Answers

### 1. Why is Java called platform-independent?

**Answer:** The compiler (`javac`) produces the same bytecode regardless of the OS it ran on. Each platform then has its own JVM that translates that identical bytecode into native instructions for that specific machine. The source is compiled once; the JVM absorbs the platform-specific part.

### 2. What's the actual difference between the JDK, JRE, and JVM?

**Answer:** The JVM is the engine that loads classes and executes bytecode. The JRE is the JVM plus the core runtime libraries — enough to *run* compiled code, nothing more. The JDK is the JRE plus the compiler and other development tools — needed to *write and compile* code. Production containers only need a JRE; build machines and developer laptops need a JDK.

### 3. What happens, step by step, when you write `Order order = new Order();`?

**Answer:** The class loader ensures `Order`'s class metadata is loaded into the Method Area/Metaspace (only once, the first time it's needed, by whichever loader owns it in the parent-first hierarchy). Memory for the new object is allocated on the heap, in Eden. The constructor runs, initializing its fields. Finally, the reference `order` is stored in the current thread's stack frame, pointing at that heap object.

### 4. What's the difference between the interpreter and the JIT compiler?

**Answer:** The interpreter executes bytecode line by line and is used for every method at first. The JIT (Just-In-Time) compiler watches for methods that get called repeatedly ("hot" methods) and compiles those specific methods to native machine code so later calls skip interpretation entirely — which is why a long-running server measurably speeds up as it warms up, not just in a synthetic benchmark loop.

### 5. Where are static variables stored, and what does that imply?

**Answer:** In the Method Area (Metaspace) — one copy exists for the whole class, not per instance. That's exactly why a `static` field is shared state across every caller and every thread, and why a static, unbounded cache is a classic memory leak: it's reachable from a GC root for as long as the class is loaded, which in practice means forever.

### 6. Heap vs Stack — what actually goes where?

**Answer:** Objects and their instance fields live on the heap and are shared across threads. Local variables, method parameters, and call frames live on the stack, and each thread has its own stack. A reference variable itself is a stack value; the object it points to is a heap value.

### 7. Explain minor GC vs major/full GC.

**Answer:** Minor GC cleans only the Young Generation (Eden and the Survivor spaces) — fast and frequent, because most objects born there die almost immediately. Major/Full GC cleans the Old Generation, or the whole heap — slower, because it has to walk through objects that are still genuinely reachable. A Full GC pausing a live server for hundreds of milliseconds is a classic real cause of a sudden production latency spike.

### 8. What's the difference between `OutOfMemoryError` and `StackOverflowError`?

**Answer:** `OutOfMemoryError` means the heap (or Metaspace) is full and GC couldn't reclaim enough — usually an unbounded cache, an oversized result set loaded without pagination, or a true reference leak. `StackOverflowError` means one thread's call stack exceeded its fixed size limit — almost always unbounded or cyclic recursion. They come from entirely different memory regions and have unrelated fixes.

### 9. When does an object actually become eligible for garbage collection?

**Answer:** When no reachable reference chain from a GC root (active thread stacks, static fields, JNI references) reaches it anymore. Setting a variable to `null`, reassigning it, or letting it go out of scope with nothing else referencing it are all ways this can happen — but the underlying rule is reachability from a GC root, not lexical scope in your source code.

### 10. Does calling `System.gc()` force garbage collection?

**Answer:** No — it's only a hint to the JVM that this might be a reasonable time to collect. The JVM is free to ignore it entirely, and production code should never rely on it running, let alone use it as a fix for an unbounded cache.

### 11. Why does comparing pooled string literals with `==` sometimes "work," and why is it still wrong?

**Answer:** Two string literals with identical content point at the same object in the String Pool, so `==` happens to return `true` by coincidence. It breaks the moment either string comes from `new String(...)`, string concatenation built at runtime, deserialization, or any non-literal source — which is unpredictable in real code — so `.equals()`, which compares actual content rather than object identity, is the only correct way to compare string values.

### 12. What is escape analysis, and why does it matter?

**Answer:** It's a JIT optimization that detects when an object never "escapes" the method that created it — no external reference to it survives past that method. When the JIT can prove this, it can allocate the object on the stack instead of the heap, or skip the allocation entirely, avoiding GC overhead for it. It happens automatically per method; you don't write different code to trigger it, but it's exactly why "minimize every object allocation" is outdated blanket advice.

### 13. Describe the three class loaders and why the hierarchy matters.

**Answer:** Bootstrap loads core JDK classes (`java.lang.*`), Platform/Extension loads JDK extension libraries, and Application loads your own code and its JAR dependencies — the one responsible for essentially everything you write. They're arranged parent-first: a loader asks its parent to try loading a class before attempting it itself, which is what guarantees, for example, that your own code can never accidentally shadow a core class like `java.lang.String`.

### 14. Is the JVM itself thread-safe?

**Answer:** Yes, for its own internal bookkeeping — memory management, garbage collection, class loading. That says nothing about *your* code: two threads calling methods on a shared, mutable object still race unless you add your own synchronization (see the [Multithreading guide](08-Multithreading-Concurrency.md)).

### 15. Why is a singleton Spring bean's instance field dangerous under concurrency, while its local variables aren't?

**Answer:** A singleton bean is one object on the heap, shared by every thread handling every request — so an instance field is one shared memory location every request can race on. A local variable inside a method exists only in that call's own stack frame; each thread has its own stack, so there is no sharing and no race, no matter how many requests run concurrently.

## Revision Checklist

- [ ] Explain the JDK/JRE/JVM split using the "job posting vs Dockerfile" confusion, and the `.java` → `.class` → machine-code flow.
- [ ] Explain class loading (the three loaders, parent-first) as separate from execution (interpreter vs JIT), and why a hot method gets faster over time.
- [ ] Draw the JVM memory areas and say what each one stores.
- [ ] Trace a real controller → service → repository call through heap, stack, and Method Area.
- [ ] Explain Young/Old generation, Eden/Survivor, minor vs major GC, and why a Full GC pause matters in production.
- [ ] Explain why stack memory needs no GC and is reclaimed the instant a method returns.
- [ ] Explain the String Pool using the `==` bug that passes in a quick test and fails on real data, and why `.equals()` is the only safe comparison.
- [ ] Describe a real-world Java memory leak (unbounded static cache), explain reachability and GC roots, and why `System.gc()` doesn't fix it.
- [ ] Explain the difference between `OutOfMemoryError` and `StackOverflowError` with a real cause for each, including the cyclic-recursion example.
- [ ] Explain escape analysis and why "avoid all object creation" is outdated advice.
