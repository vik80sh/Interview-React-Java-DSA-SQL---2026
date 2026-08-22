# JVM and Memory Architecture

Every Java interview eventually asks "what happens when you run your program?" The JVM is the answer. It loads your `.class` files, executes bytecode, and manages memory so you never call `free()` yourself — but the moment something runs slow or crashes with `OutOfMemoryError` in production, you need to know exactly what's inside that black box.

## 1. JDK, JRE, and JVM

| Component | What it is |
|---|---|
| **JDK** (Java Development Kit) | Everything to *write and compile* Java — includes the compiler (`javac`), debugger, and a JRE. |
| **JRE** (Java Runtime Environment) | Everything to *run* Java — the JVM plus core libraries. No compiler. |
| **JVM** (Java Virtual Machine) | The actual engine that loads classes, executes bytecode, and manages memory. |

The flow from source to execution:

```text
MyService.java --(javac)--> MyService.class (bytecode) --(JVM)--> machine instructions
```

This is also why Java is "write once, run anywhere": the compiler produces the same bytecode on any OS, and each platform has its own JVM that translates that bytecode to its native machine code.

## 2. Class Loading and Execution

When your Spring Boot app starts and a request hits `OrderController`, the JVM has already gone through:

- **Class loading** — the class loader subsystem reads `OrderController.class` into memory. Three loaders, in a parent-first hierarchy: **Bootstrap** (loads `java.lang.*` and other core JDK classes), **Platform/Extension** (JDK extension libraries), **Application** (your own classes and the JARs on the classpath — this is the one that loads `OrderController`, `OrderService`, and every class your `pom.xml`/`build.gradle` pulled in).
- **Execution** — the execution engine runs the bytecode. An **interpreter** executes it line by line at first; the **JIT (Just-In-Time) compiler** watches for "hot" methods called repeatedly (like `OrderService.findById`, called on every request) and compiles those specific methods to native machine code, which is why a long-running server gets *faster* as it warms up, not just during a benchmark loop.

## 3. Runtime Memory Areas

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

Trace a real request through this. Say `OrderController.getOrder(Long id)` calls `OrderService.findById(id)`, which calls `OrderRepository.findById(id)`:

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

- **Method Area** already holds `OrderController`'s class metadata: its field list, method bytecode, and the fact that it extends nothing and has one constructor. This is loaded once per class, no matter how many requests come in.
- **Heap** holds the actual `OrderController` bean (one instance — it's a singleton), the actual `OrderResponse` object created for *this* request, and every object either of them reference.
- **Stack** — the thread handling this HTTP request gets its own stack. Calling `getOrder` pushes a new frame holding the local variable `id`, the reference to the not-yet-existing `response`, and where to return to. Calling into `service.findById(id)` pushes another frame on top of it. When `findById` returns, its frame is popped — this is why local variables disappear the instant a method ends, with no garbage collection involved.
- Two concurrent requests get two independent stacks (each with its own `id`, its own frames) but share the same `OrderController` heap object and the same Method Area class metadata — which is exactly why a singleton bean's instance fields are dangerous under concurrency (see Section 6.1 of the [Spring Boot Fundamentals](../Backend/01-Spring-Boot-Fundamentals.md) guide) but its *local variables* inside a method are always safe.

## 4. Heap Memory in Depth

The heap is subdivided to make garbage collection cheap for the common case: most objects are short-lived.

```text
Heap
├── Young Generation
│   ├── Eden        — every new object is born here
│   └── Survivor (S0, S1) — objects that survived at least one GC
└── Old Generation (Tenured) — long-lived objects
```

Map this to a real request: every `OrderResponse` DTO your controller builds for a single HTTP request is born in **Eden** and is almost always garbage within milliseconds, once the response is serialized and sent. The `OrderService` bean itself, created once at startup and referenced for the app's entire lifetime, gets promoted from Eden → Survivor → **Old Generation** after surviving a few collection cycles, because it keeps getting referenced.

- **Minor GC** — cleans the Young Generation. Fast, frequent.
- **Major/Full GC** — cleans the Old Generation (or the whole heap). Slower, and a Full GC pausing a live server for hundreds of milliseconds is a classic "why did p99 latency spike" root cause.

## 5. Stack Memory in Depth

Each thread gets its own stack, sized at JVM startup (`-Xss`). It stores:

- Method call frames
- Local variables (primitives and references)
- Partial results of expressions

```java
void computeTotal() {
    int total = 0;          // lives in this frame, on this thread's stack
    for (OrderLine line : lines) {
        total += line.getAmount(); // "lines" is a heap reference; "total" stays on the stack
    }
}
```

Stack memory is fast (no GC involved) and automatically reclaimed the instant a method returns.

## 6. Heap vs Stack

| | Heap | Stack |
|---|---|---|
| Shared across threads? | Yes | No — one stack per thread |
| Stores | Objects, instance fields | Local variables, method frames, references |
| Speed | Slower | Faster |
| Size | Large, GC-managed | Small, fixed per thread |
| Cleared by | Garbage Collector | Automatically, when the method returns |

## 7. Method Area (Metaspace) and the String Pool

The **Method Area** (called **Metaspace** since Java 8) stores class-level information: class metadata, method bytecode, and `static` fields.

```java
class FeatureFlags {
    static boolean auditEnabled = true; // lives in Metaspace, one copy for the whole class
}
```

The **String Pool** is a special region (part of heap memory) that deduplicates string literals:

```java
String a = "PENDING";
String b = "PENDING";
// a == b is true — both point at the SAME pooled object

String c = new String("PENDING");
// c == a is false — new String(...) forces a fresh object outside the pool
```

This matters in real code: comparing enum-like string status codes with `==` instead of `.equals()` works by accident when both come from literals, and breaks the moment one of them arrives from `new String(...)`, deserialization, or string concatenation at runtime — which is exactly why `.equals()` is the rule, not `==` (see the [String Handling guide](05-String-Handling.md)).

## 8. Garbage Collection and Memory Leaks

An object becomes eligible for GC once **nothing reachable from a GC root** references it anymore — not merely when a variable goes out of scope in the source code, but when no live reference chain reaches it.

```java
Order order = new Order();
order = null; // the old Order is now eligible for GC, assuming nothing else references it
```

A **memory leak in Java** doesn't mean forgetting to free memory (there's no `free()`); it means something keeps a reference alive long after it's logically done being used. The classic real-world case: a static cache with no eviction policy.

```java
class ReportCache {
    // Every generated report gets cached here forever — never evicted, never bounded.
    static final Map<Long, byte[]> cache = new HashMap<>();

    static void store(Long reportId, byte[] report) {
        cache.put(reportId, report); // grows without limit as the service runs
    }
}
```

This compiles fine, runs fine in a demo, and slowly consumes the whole heap in production until it throws `OutOfMemoryError` weeks into a deployment. The fix is a bounded cache with eviction (an LRU `LinkedHashMap`, Caffeine, or Redis — see the [caching section](../Backend/07-Common-Backend-Problems.md) of the Backend guide), not "just call GC" — `System.gc()` is only ever a hint and Java's own docs make no promise it will do anything.

## 9. OutOfMemoryError vs StackOverflowError

Both are real production failures with different causes:

```text
OutOfMemoryError       → the Heap (or Metaspace) is full and GC cannot free enough space.
                          Real cause: unbounded cache, loading an entire huge result set into
                          memory instead of paginating it, or a genuine memory leak.

StackOverflowError     → one thread's call stack grew past its limit.
                          Real cause: unbounded or infinite recursion — e.g. a recursive
                          category tree traversal with a cycle, or a self-referencing JSON
                          structure with no depth limit.
```

```java
// A realistic StackOverflowError: traversing a category tree that (by a data bug) has a cycle
void printCategoryPath(Category category) {
    System.out.println(category.getName());
    printCategoryPath(category.getParent()); // if parent chains cycle back, this never terminates
}
```

## 10. Escape Analysis (Advanced)

The JIT can prove that some objects never "escape" the method that creates them — no reference to them is ever stored anywhere else or returned. When that's provable, the JVM can allocate the object on the stack (or eliminate the allocation entirely) instead of the heap, skipping GC overhead for it entirely. You don't control this directly; it's a JIT optimization, but knowing it exists explains why "avoid all object creation for performance" is outdated advice — the JIT already avoids heap allocation for plenty of short-lived objects on its own.

## Interview Questions and Answers

### 1. Why is Java called platform-independent?

**Answer:** The compiler produces the same bytecode regardless of OS; each platform has its own JVM that translates that bytecode into native instructions for that machine. The source is compiled once; the JVM handles the platform-specific part.

### 2. What happens, step by step, when you write `Order order = new Order();`?

**Answer:** The class loader ensures `Order`'s class metadata is loaded into the Method Area (only once, the first time it's needed). Memory for the new object is allocated on the heap. The constructor runs, initializing its fields. Finally, the reference `order` is stored in the current stack frame, pointing at that heap object.

### 3. Where are static variables stored, and what does that imply?

**Answer:** In the Method Area (Metaspace) — one copy exists for the whole class, not per instance. That's exactly why a `static` field is shared state across every caller and every thread, and why a static, unbounded cache is a classic memory leak (Section 8).

### 4. Heap vs Stack — what actually goes where?

**Answer:** Objects and their instance fields live on the heap and are shared across threads. Local variables, method parameters, and call frames live on the stack, and each thread has its own stack. A reference variable itself is a stack value; the object it points to is a heap value.

### 5. What's the difference between `OutOfMemoryError` and `StackOverflowError`?

**Answer:** `OutOfMemoryError` means the heap (or Metaspace) is full and GC couldn't reclaim enough — usually an unbounded cache, an oversized result set loaded without pagination, or a true leak. `StackOverflowError` means one thread's call stack exceeded its size limit — almost always unbounded or cyclic recursion.

### 6. When does an object become eligible for garbage collection?

**Answer:** When no reachable reference chain from a GC root (active thread stacks, static fields, JNI references) reaches it anymore. Setting a variable to `null`, reassigning it, or letting it go out of scope with no other reference to it are all ways this happens — but the underlying rule is reachability, not lexical scope.

### 7. Does calling `System.gc()` force garbage collection?

**Answer:** No — it's only a hint to the JVM that this might be a good time to collect. The JVM is free to ignore it, and production code should never rely on it running.

### 8. Why does comparing pooled string literals with `==` sometimes "work," and why is it still wrong?

**Answer:** Two string literals with the same content point to the same object in the String Pool, so `==` happens to return `true`. It breaks the moment either string comes from `new String(...)`, string concatenation at runtime, deserialization, or any non-literal source — which is unpredictable in real code, so `.equals()` is the only correct comparison for string content.

### 9. What is escape analysis, and why does it matter?

**Answer:** It's a JIT optimization that detects when an object never "escapes" the method that created it (no external reference to it survives), letting the JVM allocate it on the stack instead of the heap and skip GC overhead for it. It happens automatically — you don't write code differently to trigger it, but it explains why not every object allocation actually costs heap/GC overhead in practice.

### 10. Is the JVM itself thread-safe?

**Answer:** Yes for its own internal bookkeeping (memory management, garbage collection, class loading) — but that says nothing about *your* code. Two threads calling methods on a shared, mutable object still race unless you add your own synchronization (see the [Multithreading guide](08-Multithreading-Concurrency.md)).

## Revision Checklist

- [ ] Explain JDK vs JRE vs JVM, and the `.java` → `.class` → machine-code flow.
- [ ] Draw the JVM memory areas and say what each one stores.
- [ ] Trace a real controller → service → repository call through heap, stack, and Method Area.
- [ ] Explain Young/Old generation, minor vs major GC, and why a Full GC pause matters in production.
- [ ] Describe a real-world Java memory leak (unbounded static cache) and its fix.
- [ ] Explain the difference between `OutOfMemoryError` and `StackOverflowError` with a real cause for each.
