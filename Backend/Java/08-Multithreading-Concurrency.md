# Multithreading and Concurrency (Core Java)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](../Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

This file stays at the plain-Java level: creating threads, `synchronized`, `wait`/`notify`/`notifyAll`, `volatile`, the Java Memory Model, race conditions, deadlock, and `ExecutorService`. For `CompletableFuture`, executor sizing decisions, `@Async`, reactive/virtual threads, and backpressure in a Spring context, see [06-Concurrency-Async.md](../Springboot/06-Concurrency-Async.md) — that file is the Spring layer built on top of everything explained here.

---

## 1. The Problem: Why Bother With Threads At All

Imagine a web server that can only do one thing at a time: read a request, handle it fully, write the response, and only then look at the next request. If one client asks for something slow — a report that takes eight seconds to generate — every other client is stuck waiting behind that one request, even though their own requests would take ten milliseconds. One slow user degrades the experience for everyone else, even though their work has nothing to do with each other.

A real backend server (Tomcat inside Spring Boot, for example) avoids this by handing each incoming request to its own **thread** — an independent, concurrently-running unit of execution inside the same program. The slow report-generating request runs on its own thread; every other request runs on a different thread and finishes on its own schedule, unaffected. This is exactly what multithreading answers: how do you let a program do more than one unit of work at the same time, instead of forcing everything through a single line of execution? Everything in this file is really about how to create threads safely and coordinate them without them stepping on each other.

## 2. Creating a Thread: Three Ways to Get One Running

The most obvious way to get a thread is to subclass Java's built-in `Thread` class and override its `run()` method:

```java
class ReportGeneratorThread extends Thread {
    public void run() {
        System.out.println("Generating on " + Thread.currentThread().getName());
    }
}

new ReportGeneratorThread().start();
```

This works, but it quietly costs you something: Java classes can only `extend` one other class. If `ReportGeneratorThread` needs to extend some other meaningful base class later — say a shared `BackgroundJob` class your codebase already uses — it can't, because the one `extends` slot is already spent on `Thread`, and `Thread` isn't even behavior you actually needed to inherit; you just wanted "run this on a separate thread."

The fix is to separate "what work to run" from "how it gets executed." `Runnable` is an interface with exactly one method, `run()` — describing a task, with no commitment to *how* it's executed:

```java
class ReportGeneratorTask implements Runnable {
    public void run() {
        System.out.println("Generating on " + Thread.currentThread().getName());
    }
}

new Thread(new ReportGeneratorTask()).start();
```

Your class now implements an interface instead of extending a class, leaving it free to extend anything else it actually needs. You hand the `Runnable` to a `Thread` (or, as section 7 shows, to an `ExecutorService`) — the task and the thread it runs on are two separate objects.

Because `Runnable` has exactly one abstract method, it's a **functional interface**, which means a lambda works in its place, and this is what real code actually writes today:

```java
new Thread(() -> System.out.println("Generating on " + Thread.currentThread().getName())).start();
```

Same effect as the `Runnable` implementation above, without a named class at all.

**A classic trap: `start()` versus `run()`.** `start()` asks the JVM to allocate a genuine, separate OS-level thread, and once that thread exists, the JVM calls `run()` *on it*. Calling `thread.run()` directly skips all of that — it just calls the method body like any ordinary method call, synchronously, on whichever thread you called it from. No new thread is created. The code *looks* concurrent because it's wrapped in a `Thread` object, but it silently executes sequentially, with no error or warning telling you anything went wrong. This is a real bug that shows up in production code that "used threads" and never actually ran anything in parallel.

## 3. Race Conditions: When Two Threads Trip Over Each Other

Here's a small piece of code that looks completely fine on its own:

```java
class InventoryCounter {
    private int stock = 10;

    void decrement() {
        stock--;
    }
}
```

`stock--` looks like one operation, but it isn't. The JVM actually does three separate steps: read the current value of `stock`, subtract one from it, write the result back. Now imagine two threads — say, two customers both buying the last item at the same instant — both call `decrement()` at nearly the same time:

```text
Thread A reads stock = 10
Thread B reads stock = 10          (Thread B read this BEFORE Thread A wrote anything back)
Thread A computes 10 - 1 = 9, writes stock = 9
Thread B computes 10 - 1 = 9, writes stock = 9
```

Two sales happened, but `stock` only dropped by one. One decrement was silently lost — not because either thread did anything wrong on its own, but because the timing of the two threads interleaved badly. This is a **race condition**: a bug where the correctness of the result depends on the unpredictable order in which threads happen to execute. It's a nasty class of bug precisely because it can pass every test you run on your laptop — where the timing rarely lines up badly — and then show up under real concurrent production load, where it eventually will.

### Fix 1 — `synchronized`

```java
synchronized void decrement() {
    stock--; // only one thread can be inside this method, on this object, at a time
}
```

Marking a method (or a block) `synchronized` means a thread must first acquire a lock on the target object before it's allowed to enter — and every other thread that wants the same lock has to wait until the first thread leaves. With `decrement()` synchronized, Thread B simply cannot read `stock` until Thread A has finished reading, subtracting, and writing back, which closes the exact gap that caused the race.

You don't have to lock the whole method — if only part of it is actually risky, lock just that part, since locking less code means less time other threads spend waiting:

```java
void decrement() {
    synchronized (this) {
        stock--;
    }
    log("stock decremented"); // doesn't touch shared state, so it doesn't need the lock
}
```

### Fix 2 — atomic classes

For something as simple as a single counter, there's often a better fix than a lock at all:

```java
private final AtomicInteger stock = new AtomicInteger(10);

void decrement() {
    stock.decrementAndGet(); // one atomic, hardware-backed read-modify-write — no lock involved
}
```

`AtomicInteger` uses the CPU's compare-and-swap instruction to perform the entire read-modify-write as one indivisible step, with no thread ever blocking waiting for a lock. For a simple counter this is usually both simpler to write and faster to run than `synchronized` — reach for it first, and reach for `synchronized` when you need to protect more than one variable together, or a sequence of operations that has to happen as one unit.

## 4. Deadlock: When Two Threads Wait On Each Other Forever

`synchronized` fixes the race condition above, but locking more than one thing at once opens a different failure mode. Picture a money-transfer feature between two bank accounts, where a transfer has to lock both accounts involved (so nobody reads a half-updated balance):

```java
// Thread 1: transferring money FROM accountA TO accountB
synchronized (accountA) {
    synchronized (accountB) {
        transfer(accountA, accountB);
    }
}

// Thread 2: a different transfer, FROM accountB TO accountA, running at the same time
synchronized (accountB) {
    synchronized (accountA) {
        transfer(accountB, accountA);
    }
}
```

Walk through the timing: Thread 1 grabs the lock on `accountA`. At almost the same instant, Thread 2 grabs the lock on `accountB`. Now Thread 1 tries to grab `accountB` — but Thread 2 already holds it, so Thread 1 waits. Thread 2 tries to grab `accountA` — but Thread 1 already holds it, so Thread 2 waits too. Neither thread ever lets go of the lock it's holding, because neither can finish its work to reach the `synchronized` block that releases it. Both threads are now stuck waiting for each other, forever. This is a **deadlock** — two (or more) threads each holding a lock the other one needs, with no thread willing to give up what it's already holding.

The fix isn't a special API — it's a discipline: always acquire multiple locks in the same globally agreed order, regardless of which account is "from" and which is "to." For example, always lock the account with the smaller account ID first:

```java
Account first = accountA.getId() < accountB.getId() ? accountA : accountB;
Account second = accountA.getId() < accountB.getId() ? accountB : accountA;

synchronized (first) {
    synchronized (second) {
        transfer(accountA, accountB);
    }
}
```

Now every thread, no matter which account is "from" or "to," locks the lower ID first. Thread 1 and Thread 2 can never both be holding one lock while waiting on the other, because they're both trying to acquire locks in the same order — the cycle that caused the deadlock simply can't form anymore.

## 5. Waiting Instead of Guessing: `wait()`, `notify()`, `notifyAll()`, and `sleep()`

Say you're building a background worker thread that processes orders as they arrive in a shared queue. A tempting first attempt is to just keep checking:

```java
while (queue.isEmpty()) {
    // do nothing, just check again
}
Order next = queue.poll();
```

This technically works, but it's a **busy-wait** — the worker thread burns 100% of a CPU core just repeatedly asking "is there anything yet? is there anything yet?" thousands of times a second, doing no useful work at all while it waits. What you actually want is a way for the thread to truly pause — using no CPU — until another thread specifically tells it "something changed, check again now."

That's what `wait()` and `notify()` give you, and they only make sense together with a lock, because they're solving a coordination problem *around* shared state:

```java
synchronized (queue) {
    while (queue.isEmpty()) {
        queue.wait();     // releases the lock on `queue` and pauses here — uses no CPU
    }
    Order next = queue.poll();
}

// meanwhile, on the producer thread:
synchronized (queue) {
    queue.add(newOrder);
    queue.notify();       // wakes ONE thread that's waiting on `queue`
}
```

The important detail is that `wait()` releases the lock on `queue` while it pauses — if it didn't, the producer thread could never get the lock to add an order and call `notify()`, and both threads would deadlock instead of cooperating. Once notified, the waiting thread reacquires the lock and resumes right where it left off, checking the `while` condition again (the `while`, not `if`, matters — another thread might have already grabbed the order between the notify and this thread waking up).

`notify()` only wakes one waiting thread, chosen arbitrarily. If several threads might be waiting and all of them need a chance to recheck the condition, `notifyAll()` wakes every one of them instead — each reacquires the lock in turn, rechecks its own `while` condition, and either proceeds or goes back to waiting.

**Don't confuse this with `sleep()`.** `Thread.sleep(1000)` just pauses the current thread for roughly one second, with no relationship to any lock at all — it doesn't release anything it's holding, and nothing wakes it early. `wait()` is specifically for coordinating threads around shared state: it only makes sense inside a `synchronized` block, it releases the lock while paused, and another thread wakes it deliberately via `notify()`/`notifyAll()`.

In real code today you'd rarely hand-write the `wait`/`notify` pattern above — `BlockingQueue` implementations (`LinkedBlockingQueue`, `ArrayBlockingQueue`) wrap this exact producer-consumer pattern correctly and safely, exposing it as plain `put()`/`take()` calls. A full worked producer-consumer example using `BlockingQueue` is in the Spring [Concurrency guide](../Springboot/06-Concurrency-Async.md). What matters here is understanding what's happening underneath: a waiting thread giving up its lock so a producer can make progress, then being woken deliberately rather than polling in a loop.

## 6. `volatile` and the Java Memory Model: Making Sure Threads See Fresh Data

Here's a shared shutdown flag that looks reasonable:

```java
private boolean shutdownRequested = false;

void requestShutdown() { shutdownRequested = true; }  // called from one thread

void workerLoop() {
    while (!shutdownRequested) { processNextTask(); }  // read from a different thread
}
```

One thread calls `requestShutdown()`; a separate worker thread is meanwhile spinning in `workerLoop()`, reading `shutdownRequested` over and over. The problem is that each CPU core can keep its own cached copy of a variable for speed, and the compiler is also allowed to reorder or optimize reads if it looks safe from a single thread's point of view. Nothing in plain Java guarantees the worker thread's cached copy of `shutdownRequested` ever gets refreshed from what the other thread wrote — the worker can loop forever, never seeing the update, even though `requestShutdown()` genuinely ran.

This is a question the **Java Memory Model** (the rulebook that defines when a write made by one thread is guaranteed to become visible to another thread) exists to answer, and the specific tool it gives you for this exact case is `volatile`:

```java
private volatile boolean shutdownRequested = false;
```

Marking the field `volatile` guarantees that a write to it by one thread is immediately visible to every other thread's next read — no stale CPU-cached copy, no reordering that hides the update. The worker loop now reliably sees `true` as soon as `requestShutdown()` runs.

**The trap: `volatile` does not make compound operations atomic.** It only guarantees *visibility* — that a read sees the latest write. It says nothing about a read-modify-write sequence being indivisible. `count++` on a `volatile int` is still, underneath, "read, add one, write back" — exactly the same three-step sequence from section 3's race condition — and two threads can still both read the same value before either writes back. `volatile` fixes the shutdown-flag scenario perfectly because that's a simple "one thread sets it, another thread reads it" case with no read-modify-write involved. For a counter, or anything with a compound update, you still need `AtomicInteger` or `synchronized` — `volatile` alone will not save you.

## 7. Thread Pools: Why You Don't Create a Thread Per Task

Suppose your system suddenly needs to process a batch of 10,000 orders. Following section 2's pattern literally would mean:

```java
for (Order order : batchOfOrders) {
    new Thread(() -> processOrder(order)).start();  // one brand-new OS thread PER order
}
```

Each `Thread` object corresponds to a real, fairly expensive OS-level thread — creating one takes real memory and setup cost, and the OS has to context-switch between all of them. Ten thousand orders means an attempt to create ten thousand OS threads nearly simultaneously, which is enough to exhaust memory and bring the machine to a crawl purely from thread-management overhead, long before any actual order processing gets done.

The fix is to reuse a bounded set of threads instead of creating a new one per task:

```java
ExecutorService pool = Executors.newFixedThreadPool(4);

for (Order order : batchOfOrders) {
    pool.execute(() -> processOrder(order));  // reuses one of 4 threads; never spawns a new one per task
}
pool.shutdown();
```

An `ExecutorService` manages a fixed pool of worker threads and a queue of pending work: submit a task, and whichever thread is free next picks it up; if all threads are busy, the task simply waits in the queue instead of the JVM trying to spin up thread number 4,001. This is how real batch jobs and background task runners are actually built — you decide how many threads make sense for your hardware and workload once, and every task afterward reuses that fixed pool. How to size that pool, and the richer `Callable`/`Future`/`CompletableFuture` APIs for getting a result back out of a submitted task, are covered in depth in the [Spring Concurrency guide](../Springboot/06-Concurrency-Async.md) — this is the plain-Java mechanism underneath all of that.

## 8. Thread States: What "Running" Actually Means Under the Hood

A thread isn't simply "running" or "not running" — it moves through a specific set of states, and the vocabulary for each one maps directly onto the mechanisms already covered above:

```text
NEW           created, but start() hasn't been called yet
RUNNABLE      running right now, or ready and simply waiting for the CPU's attention
BLOCKED       trying to enter a synchronized block, but another thread already holds that lock
WAITING       paused indefinitely, waiting for notify()/notifyAll(), or for join()'s target to finish
TIMED_WAITING paused for a bounded time — sleep(ms), wait(ms), or join(ms)
TERMINATED    run() has finished; the thread is done for good
```

`BLOCKED` and `WAITING` are easy to mix up, but the distinction is exactly what sections 3–5 already explained: `BLOCKED` is what happens when a thread wants a `synchronized` lock that's currently held elsewhere (section 3/4's scenario) — it becomes runnable again the moment the lock is free, with no explicit signal needed. `WAITING` is what a thread does after deliberately calling `wait()` or `join()` (section 5) — it needs an actual `notify()`/`notifyAll()` call, or the joined thread actually finishing, before it can proceed; a free lock alone isn't enough to wake it.

`join()` is the everyday tool for "don't continue until this other thread has actually finished" — for example, a `main` method that shouldn't start accepting traffic until a cache-warming background thread has completed:

```java
Thread warmup = new Thread(() -> preloadCache());
warmup.start();
warmup.join();  // the calling thread pauses here (WAITING, or TIMED_WAITING with a timeout) until warmup finishes
System.out.println("Cache warm, accepting traffic");
```

## Interview Questions and Answers

### 1. Why is `Runnable` generally preferred over extending `Thread`?

**Answer:** Extending `Thread` spends your one available `extends` slot (Java only allows single inheritance) purely to gain thread behavior you could get through composition instead. Implementing `Runnable` — or just passing a lambda, since `Runnable` is a functional interface — keeps your class free to extend something else, and cleanly separates "what work to run" from "how it gets executed": the same `Runnable` can be handed to a `Thread` directly or submitted to an `ExecutorService`.

### 2. What actually goes wrong if you call `thread.run()` instead of `thread.start()`?

**Answer:** `run()` just executes the method body synchronously on whichever thread called it — no new thread is ever created. Code that assumes it's running concurrently silently runs sequentially instead, with no error or warning, which is exactly what makes this mistake dangerous: it looks correct and often even produces correct output, just without any of the concurrency you intended.

**Follow-up:** How would you notice this bug in practice? The telltale sign is that `Thread.currentThread().getName()` inside `run()` prints the *calling* thread's name (often `main`) instead of a new thread name.

### 3. Why is `count++` on a shared field a race condition, even though it looks like one line?

**Answer:** Incrementing is really three separate steps at the JVM level — read the current value, add one, write the result back — with no guarantee those three steps happen as a single indivisible unit. Two threads can both read the same old value before either has written back, so one of the two increments is silently lost.

### 4. Does `volatile` fix the `count++` race condition?

**Answer:** No. `volatile` only guarantees visibility — that a read on one thread sees the most recent write from another thread — as defined by the Java Memory Model. It says nothing about making a multi-step read-modify-write operation atomic. `count++` on a `volatile int` is still a race; you need `AtomicInteger`, `synchronized`, or an equivalent lock to actually fix it.

### 5. `sleep()` versus `wait()` — what's the real difference?

**Answer:** `sleep()` simply pauses the current thread for a fixed duration and holds onto any lock it currently has. `wait()` is called while holding a lock, releases that lock while paused, and stays paused until another thread calls `notify()`/`notifyAll()` on the same object — it exists specifically to coordinate threads around shared state, like a consumer thread waiting for a producer to add work to a queue.

### 6. What's the difference between `notify()` and `notifyAll()`?

**Answer:** `notify()` wakes exactly one arbitrarily-chosen thread that's currently waiting on that object's lock. `notifyAll()` wakes every waiting thread, and each one reacquires the lock in turn and rechecks its own condition. Use `notify()` when any one waiter can handle the event and it doesn't matter which; use `notifyAll()` when multiple waiters may need to reevaluate, since with only `notify()` you risk waking the "wrong" thread while others that could have proceeded stay asleep.

### 7. How would you cause a deadlock, and how would you prevent it?

**Answer:** Two threads acquiring the same two locks in opposite order — Thread 1 takes lock A then waits for lock B, while Thread 2 has already taken lock B and waits for lock A. Neither can ever proceed, because neither will release what it's already holding. The fix is a globally consistent lock-acquisition order — for example, always lock the object with the smaller ID first — so it's structurally impossible for two threads to end up waiting on each other in a cycle.

### 8. Why use an `ExecutorService` instead of creating a `Thread` per task?

**Answer:** A brand-new `Thread` maps to a real, fairly expensive OS thread. Spawning one per task doesn't scale — a burst of thousands of tasks would try to create thousands of OS threads at once, exhausting memory and drowning the system in context-switching overhead. An `ExecutorService` reuses a fixed, bounded pool of threads and queues excess work instead, which is how real batch- and background-processing systems are actually built.

### 9. What's the difference between the `BLOCKED` and `WAITING` thread states?

**Answer:** `BLOCKED` means the thread is trying to enter a `synchronized` block or method and another thread currently holds that lock — it becomes runnable again automatically once the lock is free. `WAITING` means the thread deliberately paused itself, via `wait()` or `join()`, and needs an explicit wake-up — a `notify()`/`notifyAll()` call, or the joined thread finishing — a free lock by itself isn't enough.

### 10. What does the Java Memory Model actually guarantee, in plain terms?

**Answer:** It's the rulebook defining when a write made by one thread is guaranteed to be visible to a read made by another thread. Without a mechanism like `volatile`, `synchronized`, or the higher-level `java.util.concurrent` classes, a thread can keep reading a stale, cached copy of a variable and never observe another thread's update — CPU caching and compiler reordering are both allowed to produce that outcome unless you use a construct that establishes a visibility guarantee.

### 11. For a simple shared counter, would you reach for `synchronized` or `AtomicInteger`?

**Answer:** `AtomicInteger` first — its compare-and-swap-based operations perform the whole read-modify-write as one atomic step with no thread ever blocking, which is usually both simpler and faster than a lock for a single variable. Reach for `synchronized` when you need to protect more than one variable together, or a whole sequence of operations that must execute as one unit — something a single atomic class can't express.

## Revision Checklist

- [ ] Explain, with the single-threaded-server scenario, why multithreading exists as a real backend concern, not just an abstract idea.
- [ ] Write all three ways to create a thread (`Thread` subclass, `Runnable` implementation, lambda), and explain why `Runnable`/lambda is preferred.
- [ ] Explain exactly what goes wrong if you call `run()` instead of `start()`.
- [ ] Walk through the `InventoryCounter` interleaving step by step and explain why it's a race condition, then fix it two ways (`synchronized`, `AtomicInteger`), and know when to reach for which.
- [ ] Walk through the two-account deadlock scenario step by step, and explain the consistent-lock-ordering fix.
- [ ] Explain why a busy-wait loop is bad, and how `wait()`/`notify()`/`notifyAll()` fix it — including that `wait()` releases its lock while paused.
- [ ] Distinguish `sleep()` from `wait()`, and know which one releases a lock.
- [ ] Explain what `volatile` actually guarantees (visibility, via the Java Memory Model) and why it does not fix `count++`.
- [ ] Explain why creating one `Thread` per task doesn't scale, and how `ExecutorService` fixes it.
- [ ] Name all six thread states and explain the difference between `BLOCKED` and `WAITING` specifically.
