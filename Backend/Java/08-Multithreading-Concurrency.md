# Multithreading and Concurrency (Core Java)

This guide covers the core-language mechanics: creating threads, `synchronized`, `wait`/`notify`, `volatile`, and thread states. For `CompletableFuture`, executor sizing, `@Async`, virtual threads, and backpressure in a Spring context, see the [Backend Concurrency guide](../Backend/06-Concurrency-Async.md) — this file is the "how does the language itself support this" layer underneath that one.

## 1. Why Multithreading, With a Real Example

A single-threaded web server could only handle one HTTP request at a time — every other client would queue behind it. A real backend server (Tomcat inside Spring Boot, for instance) hands each incoming request to its own worker thread, so a slow request for one user doesn't block a fast request for another. That's the concrete, everyday reason concurrency exists in backend systems, not just "do two things at once" in the abstract.

## 2. Creating a Thread — Three Ways

```java
// 1. Extending Thread — rarely used in practice, since Java only allows single inheritance
// and this uses up your one extends slot on a Thread base class you don't actually need.
class ReportGeneratorThread extends Thread {
    public void run() {
        System.out.println("Generating on " + Thread.currentThread().getName());
    }
}

// 2. Implementing Runnable — the traditional, better-designed way: your class stays free
// to extend something meaningful, since Runnable is just a single-method contract.
class ReportGeneratorTask implements Runnable {
    public void run() {
        System.out.println("Generating on " + Thread.currentThread().getName());
    }
}
new Thread(new ReportGeneratorTask()).start();

// 3. Lambda (Java 8+) — the version you actually write in real code today, since Runnable
// is a functional interface (one abstract method: run()).
new Thread(() -> System.out.println("Generating on " + Thread.currentThread().getName())).start();
```

**`start()` vs `run()` — a classic trap:** `start()` asks the JVM to allocate a real OS thread and *then* call `run()` on it. Calling `run()` directly just executes that code synchronously on the current thread, like any ordinary method call — no new thread is created at all, and code that "looks concurrent" silently runs sequentially.

## 3. Race Conditions — a Real Concurrency Bug

```java
class InventoryCounter {
    private int stock = 10;

    void decrement() {
        stock--; // NOT atomic — this is really "read stock, subtract 1, write stock back"
    }
}
```

If two threads call `decrement()` at nearly the same instant, both can read `stock == 10` before either writes back, and both write `9` — one sale is silently lost from the inventory count. This is a **race condition**: the correctness of the result depends on the unpredictable timing of two threads, and it's exactly the kind of bug that passes every test run on a laptop and then shows up under real production load.

### Fix 1 — `synchronized`

```java
synchronized void decrement() {
    stock--; // only one thread can be inside this method on this object at a time
}
```

A `synchronized` method (or block) requires a thread to acquire a lock on the target object before entering, and forces every other thread to wait for that lock. Prefer a synchronized *block* around only the risky section when the rest of the method doesn't need protection — locking less code means less contention:

```java
void decrement() {
    synchronized (this) {
        stock--;
    }
    log("stock decremented"); // doesn't need the lock — stays outside the block
}
```

### Fix 2 — atomic classes (often the better real-world fix for a simple counter)

```java
private final AtomicInteger stock = new AtomicInteger(10);
void decrement() {
    stock.decrementAndGet(); // a single atomic hardware-backed operation, no lock needed
}
```

For a single counter, `AtomicInteger` is usually simpler and faster than `synchronized` — no lock, no thread ever blocks waiting, and the CPU's compare-and-swap instruction does the whole read-modify-write atomically.

## 4. Deadlock — Two Locks, Opposite Order

```java
// Thread 1
synchronized (accountA) {
    synchronized (accountB) { transfer(accountA, accountB); }
}

// Thread 2 — locks the SAME two objects in the OPPOSITE order
synchronized (accountB) {
    synchronized (accountA) { transfer(accountB, accountA); }
}
```

If Thread 1 grabs `accountA` right as Thread 2 grabs `accountB`, each then waits forever for the lock the other is holding — a real deadlock, exactly the kind that shows up in a money-transfer feature between two accounts. The fix (also covered with a full example in the [Concurrency guide](../Backend/06-Concurrency-Async.md#2-locks-and-deadlocks)) is to always acquire multiple locks in the same globally agreed order — e.g. by ascending account ID — no matter which account is "from" and which is "to."

## 5. `sleep()` vs `wait()`/`notify()`

```java
Thread.sleep(1000); // pauses THIS thread for ~1 second, does NOT release any lock it holds

synchronized (queue) {
    while (queue.isEmpty()) {
        queue.wait();     // releases the lock on `queue` and pauses, until notified
    }
    Order next = queue.poll();
}

synchronized (queue) {
    queue.add(newOrder);
    queue.notify();       // wakes one thread waiting on `queue`
}
```

`sleep()` is a plain pause with no relationship to locking. `wait()`/`notify()` are for real **thread coordination** — a classic producer-consumer setup, like a background worker thread waiting for new orders to appear in a shared queue, releasing the lock while waiting so the producer thread can actually get in and add work. In modern code, `BlockingQueue` (`LinkedBlockingQueue`, etc.) wraps this exact `wait`/`notify` pattern correctly and is what you'd actually reach for — see it applied to a real producer-consumer example in the Backend guide.

## 6. `volatile` — Visibility, Not Atomicity

```java
private volatile boolean shutdownRequested = false;

void requestShutdown() { shutdownRequested = true; }  // called from one thread

void workerLoop() {
    while (!shutdownRequested) { processNextTask(); }  // read from another thread
}
```

Without `volatile`, the worker thread might keep its own cached copy of `shutdownRequested` (via CPU caches or compiler reordering) and never see the update — the loop could run forever even after `requestShutdown()` was called. `volatile` guarantees every thread reads the latest written value.

**The trap:** `volatile` does **not** make compound operations atomic. `count++` on a `volatile int` is still read-then-write-back, still race-prone with two threads — `volatile` fixes visibility, not the read-modify-write race from Section 3. For a shared flag that's simply set/read, `volatile` is exactly right; for a counter, you still need `AtomicInteger` or `synchronized`.

## 7. Executors — Don't Hand-Roll Threads in Real Code

```java
ExecutorService pool = Executors.newFixedThreadPool(4);

for (Order order : batchOfOrders) {
    pool.execute(() -> processOrder(order)); // reuses one of 4 threads, doesn't spawn a new one each time
}
pool.shutdown();
```

Creating a brand-new `Thread` per task doesn't scale — a burst of 10,000 orders would try to create 10,000 OS threads. An `ExecutorService` manages a bounded pool of reusable threads and queues excess work, which is exactly how a real batch-processing job or a background task runner is built. Executor sizing, `Callable`/`Future`, and `CompletableFuture` composition are covered in depth in the [Backend Concurrency guide](../Backend/06-Concurrency-Async.md#3-executors-and-completablefuture).

## 8. Thread States

```text
NEW        → created, start() not called yet
RUNNABLE   → running, or ready and waiting for CPU time
BLOCKED    → waiting to acquire a lock held by another thread
WAITING    → paused indefinitely until another thread calls notify()/notifyAll(), or join()'s target finishes
TIMED_WAITING → paused for a bounded time (sleep(ms), wait(ms), join(ms))
TERMINATED → run() has completed
```

`join()` is the real-world tool for "wait for this background thread to actually finish before continuing" — e.g. the main method waiting for a startup warm-up task to complete before accepting traffic:

```java
Thread warmup = new Thread(() -> preloadCache());
warmup.start();
warmup.join(); // main thread blocks here (TIMED_WAITING/WAITING) until warmup finishes
System.out.println("Cache warm, accepting traffic");
```

## Interview Questions and Answers

### 1. Why is `Runnable` generally preferred over extending `Thread`?

**Answer:** Extending `Thread` uses up your one available superclass slot (Java allows only single inheritance) purely to gain thread behavior you could get by composition instead. Implementing `Runnable` (or just passing a lambda) keeps your class free to extend something meaningful, and separates "what work to run" from "how it's executed" — you can hand the same `Runnable` to a thread, an executor, or a scheduler.

### 2. What actually goes wrong if you call `thread.run()` instead of `thread.start()`?

**Answer:** `run()` just executes the method body synchronously on the calling thread — no new thread is ever created. Code that assumes it's running concurrently silently runs sequentially instead, with no error or warning, which makes this a quietly dangerous mistake in real code.

### 3. Why is `count++` on a shared field a race condition even without any explicit multi-line logic?

**Answer:** Incrementing is really three separate steps — read the current value, add one, write the result back — and there's no guarantee those three steps happen atomically. Two threads can both read the same old value before either writes back, and one increment is lost.

### 4. Does `volatile` fix the `count++` race condition?

**Answer:** No. `volatile` only guarantees that reads see the latest written value across threads (visibility) — it says nothing about making a multi-step operation atomic. `count++` is still a race even on a `volatile int`; you need `AtomicInteger`, `synchronized`, or an equivalent lock to fix the actual race.

### 5. `sleep()` vs `wait()` — what's the real difference?

**Answer:** `sleep()` simply pauses the current thread for a fixed time and holds onto any lock it has. `wait()` is called while holding a lock, releases that lock, and pauses until another thread calls `notify()`/`notifyAll()` on the same object — it's built for coordinating threads around shared state, like a consumer waiting for a producer to add work to a queue.

### 6. How would you cause a deadlock, and how would you prevent it?

**Answer:** Two threads acquiring the same two locks in opposite order — Thread 1 takes lock A then waits for B, while Thread 2 has already taken B and waits for A. Neither can proceed. The fix is a globally consistent lock-acquisition order (e.g. always lock the object with the smaller ID first) so it's never possible for two threads to be waiting on each other in a cycle.

### 7. Why use an `ExecutorService` instead of creating threads manually for each task?

**Answer:** Manually spawning one OS thread per task doesn't scale — a burst of thousands of tasks would try to create thousands of threads, exhausting memory and context-switching overhead. An `ExecutorService` reuses a bounded pool of threads and queues excess work, which is how real batch and background-processing systems are actually built.

### 8. What's the difference between the `BLOCKED` and `WAITING` thread states?

**Answer:** `BLOCKED` means the thread is trying to enter a `synchronized` block/method and another thread currently holds that lock. `WAITING` means the thread deliberately paused itself — via `wait()`, `join()`, or similar — and needs another thread to explicitly wake it (via `notify()`/`notifyAll()`, or by that other thread finishing), not just a lock becoming free.

## Revision Checklist

- [ ] Explain why `start()` and `run()` behave completely differently, with the real-world consequence of confusing them.
- [ ] Reproduce a race condition on a shared counter and fix it two ways (`synchronized`, `AtomicInteger`).
- [ ] Explain a deadlock scenario between two locks and the deterministic-ordering fix.
- [ ] Distinguish `sleep()` from `wait()`/`notify()`, and know which one releases a lock.
- [ ] Explain what `volatile` actually guarantees, and why it doesn't fix `count++`.
- [ ] Name all six thread states and what causes each transition.
