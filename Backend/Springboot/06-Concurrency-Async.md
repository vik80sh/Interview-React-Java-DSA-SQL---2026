# Concurrency and Asynchronous Processing (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. The Problem: Two Requests, One Shared Counter

Say `OrderService` tracks how many orders it has processed today, as a plain field:

```java
class OrderService {
    private int ordersProcessedToday;

    void processOrder(Order order) {
        // ... save the order, charge the card, etc ...
        ordersProcessedToday++;
    }
}
```

Under one request at a time, this works fine. But a real server handles many requests concurrently, on different threads, and `ordersProcessedToday++` is not one operation — it's three: **read** the current value, **add** one, **write** it back. Two threads can interleave like this:

```text
Thread A reads ordersProcessedToday = 41
Thread B reads ordersProcessedToday = 41
Thread A computes 42, writes 42
Thread B computes 42, writes 42        <- B overwrote A's update
```

Two orders were processed, but the counter only went up by one. This is a **race condition**: the correctness of the result depends on the unpredictable timing of two threads, and one thread's update silently disappears. It's the single most common concurrency bug, and it happens with nothing more exotic than a shared field and `++`.

### Why "just add `volatile`" doesn't fix it

A different but related scenario: a background thread checks a `shuttingDown` flag in a loop, and the main thread sets it to `true` when the app is told to stop:

```java
class OrderWorker implements Runnable {
    private boolean shuttingDown = false;

    void stop() { shuttingDown = true; }

    public void run() {
        while (!shuttingDown) {
            // pick up and process the next order
        }
    }
}
```

This can loop forever even after `stop()` runs, because nothing guarantees the worker thread ever *sees* the new value — the JVM (Java Virtual Machine) and the CPU are both allowed to cache `shuttingDown` in a way that's only visible to the thread that wrote it. Marking the field `volatile` fixes exactly this: it guarantees that once one thread writes a `volatile` field, every other thread's next read of it sees that write, not a stale cached copy.

But `volatile` would **not** have fixed `ordersProcessedToday++`. `volatile` only guarantees *visibility* of a single read or a single write — it does nothing to make the three-step read-add-write sequence atomic (indivisible). Two threads can still both read the same fresh value and both write the same incremented result. Visibility and atomicity are two different guarantees, and mixing them up is exactly what causes people to add `volatile` to a counter and still see missed increments.

### The actual fix: make the operation atomic

```java
private final AtomicInteger ordersProcessedToday = new AtomicInteger();

void processOrder(Order order) {
    // ... save the order, charge the card, etc ...
    ordersProcessedToday.incrementAndGet();
}
```

`AtomicInteger.incrementAndGet()` performs the read-add-write as one indivisible hardware-backed operation, using a CPU instruction called CAS (Compare-And-Swap): "only write the new value if the current value still equals what I last read; if someone else changed it in between, retry." No thread can ever see a half-finished increment, and no update gets silently dropped. The same family exists for `long`, references, arrays, and fields (`AtomicLong`, `AtomicReference`, `LongAdder`, and so on) — reach for one whenever multiple threads mutate a single shared value.

### Naming the underlying rule: happens-before

All of this — why an unsynchronized read can see a stale value, and why a `volatile` write fixes it — is governed by something Java formally defines called the **Java Memory Model**. Its central idea is a relationship called **happens-before**: if action A happens-before action B, then B is guaranteed to see every effect of A. Without a happens-before relationship between two threads' operations, the second thread is allowed to see stale or reordered data — not as a bug, but as a documented possibility the JVM is free to exploit for performance.

A happens-before relationship gets established by things like: releasing a lock, then another thread acquiring that same lock; writing a `volatile` field, then another thread reading it; one thread finishing (`Thread.join()`); or a `CompletableFuture` completing and another thread observing that completion (section 4). This is the actual mechanism underneath every fix in this file — locks, atomics, and futures all work partly *because* they establish happens-before between the threads involved.

## 2. The Problem: Two Locks, Acquired in Different Orders

A single shared counter is one thing. Now say `AccountService` needs to transfer money between two accounts — read both balances, then write both, as one unit, with no other thread seeing a half-finished transfer. The natural fix for "make this block of code run as one atomic unit" is a lock:

```java
class Account {
    private final Long id;
    private BigDecimal balance;
    private final ReentrantLock lock = new ReentrantLock();
}

void transfer(Account from, Account to, BigDecimal amount) {
    from.lock().lock();
    try {
        to.lock().lock();
        try {
            from.setBalance(from.getBalance().subtract(amount));
            to.setBalance(to.getBalance().add(amount));
        } finally {
            to.lock().unlock();
        }
    } finally {
        from.lock().unlock();
    }
}
```

This looks reasonable, and it works — right up until two transfers happen in opposite directions at the same moment:

```text
Thread A: transfer(accountX, accountY, ...)   -> locks X, then tries to lock Y
Thread B: transfer(accountY, accountX, ...)   -> locks Y, then tries to lock X
```

Thread A is holding X's lock, waiting for Y. Thread B is holding Y's lock, waiting for X. Neither can ever proceed, and neither will ever time out on its own — this is a **deadlock**: two or more threads each waiting on a resource the other one holds, forever.

### The fix: always acquire locks in the same order

The bug isn't locking two accounts — it's locking them in whichever order the *parameters happened to arrive in*. The fix is to pick a global, deterministic order — for example, always lock the account with the smaller ID first — so two threads transferring between the same pair of accounts, in either direction, always compete for the locks in the same sequence and never form a cycle:

```java
Account first = from.getId() < to.getId() ? from : to;
Account second = first == from ? to : from;

first.lock().lock();
try {
    second.lock().lock();
    try {
        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));
    } finally {
        second.lock().unlock();
    }
} finally {
    first.lock().unlock();
}
```

Now thread A and thread B both try to lock the lower-ID account first — whichever gets there first proceeds to completion, the other simply waits its turn. No cycle can form.

`synchronized` would have worked here too for plain mutual exclusion, and it's the simpler default when you don't need anything more. Reach for `ReentrantLock` specifically when you need a feature `synchronized` doesn't offer: `tryLock(timeout)` to give up rather than wait forever, an interruptible wait, or `fair` ordering across many contending threads. Whichever you use, always release the lock in a `finally` block — an exception thrown while holding a lock must never leave it held forever.

Beyond consistent lock ordering, other real tools against deadlock are: acquiring locks with a timeout instead of waiting indefinitely, keeping critical sections (the code between lock and unlock) as small as possible, and avoiding nested locks altogether where the logic allows it. And it's worth being explicit that an in-process Java lock only protects one JVM — it does nothing to prevent two separate application instances from racing on the same database row; that needs a database-level lock (e.g. `SELECT ... FOR UPDATE`) or a distributed lock service instead.

## 3. The Problem: A New Thread Per Request Doesn't Scale

Say every incoming order triggers some background work — generating an invoice PDF, say — and the obvious first move is:

```java
void processOrder(Order order) {
    new Thread(() -> invoiceGenerator.generate(order)).start();
}
```

Under light load this works. Under real load it doesn't: every order now spins up a brand-new OS thread, each costing real memory for its stack and real scheduling overhead. Enough concurrent orders and the process runs out of memory or the OS simply refuses to create more threads — an unbounded, uncontrolled resource is being handed out one request at a time.

### The fix: a bounded pool of reusable threads

```java
ExecutorService invoiceExecutor = new ThreadPoolExecutor(
    4, 8,                                  // core / max threads
    60, TimeUnit.SECONDS,                  // idle thread keep-alive
    new LinkedBlockingQueue<>(200),        // bounded queue for work waiting for a thread
    new ThreadFactoryBuilder().setNameFormat("invoice-%d").build(),
    new ThreadPoolExecutor.CallerRunsPolicy()   // what to do when the queue is also full
);

void processOrder(Order order) {
    invoiceExecutor.submit(() -> invoiceGenerator.generate(order));
}
```

An `ExecutorService` is a fixed, bounded pool of reusable threads plus a queue for work waiting for one to free up. Instead of creating a thread per task, you submit tasks and the pool runs them with a fixed ceiling on how many run at once. That single design decision buys you several things you'd otherwise have to hand-build: named threads (so a stack trace or profiler shows `invoice-3`, not `Thread-47291`), a defined queue policy for work that arrives faster than it can be processed, a rejection policy for when even the queue is full, and a graceful shutdown path (`shutdown()` lets in-flight work finish; `shutdownNow()` interrupts it).

Sizing the pool depends on *what kind* of work it's running. CPU-bound work (heavy computation, no waiting) can't usefully run more concurrent tasks than there are CPU cores — extra threads just cause more context switching, not more throughput. Blocking I/O-bound work (waiting on a database, a file, a downstream HTTP call) is different: while a thread is blocked waiting, it isn't using the CPU at all, so a pool doing I/O-bound work can profitably run more threads than there are cores. But that pool is now bounded by something else instead — the number of connections the database or the downstream service can actually handle. A bigger thread pool than your database connection pool just means more threads queued up waiting for a connection, not more real throughput.

## 4. The Problem: Combining Two Independent Async Calls

Say building a `Dashboard` for a user requires two independent, slow calls: fetch the user's profile, and fetch their order history. Done naively, one waits for the other even though neither depends on the other's result:

```java
User user = userClient.fetchUser(id);           // blocks here
List<Order> orders = orderClient.fetchOrders(id); // then blocks here too
Dashboard dashboard = new Dashboard(user, orders);
```

If each call takes 200ms, this takes 400ms total, purely because the code happens to be written sequentially — there was never a real dependency forcing that order.

### The fix: run them concurrently and combine the results

```java
CompletableFuture<User> userFuture = userClient.fetchUser(id);
CompletableFuture<List<Order>> ordersFuture = orderClient.fetchOrders(id);

CompletableFuture<Dashboard> dashboardFuture = userFuture
    .thenCombine(ordersFuture, (user, orders) -> new Dashboard(user, orders))
    .orTimeout(2, TimeUnit.SECONDS)
    .exceptionally(ex -> Dashboard.unavailable());
```

A `CompletableFuture` represents "a value that will exist later," and lets you chain what should happen once it does, without blocking the current thread to wait for it. Both calls fire off immediately and run concurrently; `thenCombine` runs once *both* have finished, combining their results — the total time is now roughly 200ms (whichever call is slower), not 400ms. `orTimeout` gives up and fails after 2 seconds rather than waiting indefinitely on a stuck downstream call, and `exceptionally` supplies a fallback value instead of letting the failure propagate all the way to the caller.

Two methods look similar but do different things, and mixing them up is a common mistake:

- **`thenApply`** — transforms a value into another *plain* value: `userFuture.thenApply(user -> user.getName())`.
- **`thenCompose`** — use this instead when the transformation *itself* returns another `CompletableFuture`, such as making a second async call using the first result: `userFuture.thenCompose(user -> loyaltyClient.fetchTier(user.getId()))`. Using `thenApply` here would produce a `CompletableFuture<CompletableFuture<LoyaltyTier>>` — a future nested inside a future, which is almost never what you want. `thenCompose` flattens that into a single `CompletableFuture<LoyaltyTier>`.

For waiting on more than two futures, `CompletableFuture.allOf(f1, f2, f3)` returns a future that completes once all of them do — but it discards their typed results (it completes as `CompletableFuture<Void>`), so you go back to the original futures afterward (`f1.join()`, etc.) to actually collect the values.

One easy mistake: composing futures with `thenApply`/`thenCombine` avoids blocking, but if code later calls `.join()` or `.get()` on a future from inside another executor's task, that thread *is* blocked waiting, consuming a pooled thread just like any other blocking call — the non-blocking benefit only holds as long as you keep composing instead of blocking to wait. Whichever way a chain fails, preserve the original exception's cause when wrapping it, and make sure cancellation (calling `.cancel()` upstream) actually propagates instead of leaving orphaned work running.

## 5. The Problem: Making an Existing Method Run in the Background

Say `OrderService.processOrder` currently sends a confirmation email synchronously, as part of handling the request — so the client sits waiting on an email provider's round trip before getting a response:

```java
@Service
class OrderService {
    void processOrder(Order order) {
        // ... save order ...
        emailSender.sendConfirmation(order);   // client waits for this too
    }
}
```

The email doesn't need to block the response — it just needs to happen. Spring's answer is `@Async`:

```java
@Service
class OrderService {
    private final EmailSender emailSender;

    OrderService(EmailSender emailSender) { this.emailSender = emailSender; }

    void processOrder(Order order) {
        // ... save order ...
        emailSender.sendConfirmationAsync(order);   // returns immediately
    }
}

@Component
class EmailSender {
    @Async("emailExecutor")
    void sendConfirmationAsync(Order order) {
        // this body now runs on a background thread from "emailExecutor"
    }
}
```

`@Async` works the same way `@Transactional` does (see file 01, section 8): Spring wraps the bean in a **proxy**, and a call to the annotated method through that proxy gets submitted to a task executor instead of running on the caller's thread. `processOrder` returns to its caller immediately; the email sends on a separate pooled thread.

Two things about this are easy to miss and worth stating directly:

1. **`@Async` does not make the work non-blocking — it just moves it to a different thread.** The email call inside `sendConfirmationAsync` still blocks *that* thread while it waits on the email provider. If enough orders come in at once, the executor backing `@Async` can itself run out of threads (or the email provider can run out of connections), exactly like the unbounded-thread problem in section 3. Always point `@Async` at a specifically configured, named, bounded executor (as shown with `"emailExecutor"` above) rather than Spring's tiny default pool.

2. **Self-invocation silently skips the proxy.** If `OrderService` called `this.sendConfirmationAsync(order)` on a method defined *inside itself*, the call never goes through the proxy at all — it's a plain Java method call — so `@Async` does nothing and the method runs synchronously with no error or warning. This is why `sendConfirmationAsync` lives on a separate `EmailSender` bean above: the call from `OrderService` to `EmailSender` genuinely goes through the proxy.

There's a third gotcha specific to moving work to another thread: things that feel automatically "just there" on the original request thread — the security context (who's logged in), the transaction, request-scoped data, logging context like MDC (Mapped Diagnostic Context, the key-value data attached to log lines for the current request) — do **not** automatically follow the task onto the new thread. If the background code needs any of that, it has to be captured explicitly before submitting the task and re-applied inside it.

## 6. The Problem: Wrapping a Blocking Call in `Mono` Doesn't Make It Non-Blocking

Say a team is moving `OrderService` to a reactive stack and has a legacy JDBC (Java Database Connectivity) call they need inside a reactive pipeline. The tempting shortcut:

```java
Mono<Order> findOrder(Long id) {
    return Mono.fromCallable(() -> jdbcOrderRepository.findById(id));  // still blocks!
}
```

This compiles, returns a `Mono`, and looks reactive. But `jdbcOrderRepository.findById(id)` is still a synchronous, blocking JDBC call underneath. Reactive frameworks run on a small, fixed pool of event-loop threads specifically because the whole model assumes nothing ever blocks one of them — and this code blocks one of those precious threads for the entire duration of the database call. Do this under real load and throughput collapses, because a handful of event-loop threads are all stuck waiting on a database instead of servicing other requests.

### The fix: keep blocking work off the reactive threads, or don't use blocking calls at all

```java
Mono<Order> findOrder(Long id) {
    return Mono.fromCallable(() -> jdbcOrderRepository.findById(id))
        .subscribeOn(Schedulers.boundedElastic());   // runs on a pool meant for blocking work
}
```

`Schedulers.boundedElastic()` is a pool specifically sized and intended for wrapping unavoidable blocking calls, keeping them off the small event-loop pool. It's a workable stopgap, but the real fix, where possible, is to use a genuinely non-blocking driver end-to-end — R2DBC instead of JDBC for the database layer, for example — so nothing is blocking in the first place.

Stepping back to what reactive programming is actually for: it gives you non-blocking I/O and **backpressure** — a way for a slow consumer to signal "slow down" back to a fast producer, instead of either buffering unboundedly or dropping data — but *only* when the entire pipeline, top to bottom, is genuinely non-blocking. It is not a free performance upgrade over blocking code, and it adds real complexity (different error handling, different debugging, different mental model for control flow). It's worth it for high-concurrency, I/O-heavy workloads; it does nothing for CPU-bound work, and it actively hurts a codebase where blocking calls sneak in unnoticed, exactly as above.

## 7. The Problem: A Scheduled Job That Runs Three Times Instead of Once

Say there's a nightly job that emails a sales report, written with Spring's scheduling support:

```java
@Component
class ReportScheduler {
    @Scheduled(cron = "0 0 2 * * *")   // 2 AM every day
    void generateDailySalesReport() {
        reportService.generateAndEmail();
    }
}
```

This works perfectly in local testing, and then in production — where the app actually runs as three separate instances behind a load balancer — the report goes out three times, one per instance, because **`@Scheduled` runs independently on every application instance that has this bean.** Each instance has no idea the other two exist; each one dutifully fires its own timer at 2 AM.

### The fix: coordinate across instances, or make duplicates harmless

There are two genuinely different ways to solve this, and the right one depends on the job:

- **Prevent the duplicate from running at all** — a distributed lock (e.g. via ShedLock or a database row used as a mutex) that only lets one instance's scheduled trigger actually execute the job; the other instances see the lock is held and skip that run.
- **Make running it three times harmless** — design the job to be idempotent, so `generateAndEmail()` checks "has today's report already been sent?" before sending, and running it again is a safe no-op.

Idempotency is usually the more robust choice, since a distributed lock can still have edge cases (a lock that expires mid-job, a network partition) — but for jobs where "just don't send it three times" is the actual requirement, a lock is simpler to reason about.

One more distinction worth knowing precisely, since it explains a subtly different class of bug: `fixedRate` schedules the next run measured from when the *previous run started*; `fixedDelay` schedules the next run measured from when the *previous run finished*. If a job occasionally takes longer than the configured interval, `fixedRate` can queue up a second execution immediately behind the first (or even trigger overlapping runs, depending on configuration), while `fixedDelay` never lets that happen — it always waits out the full delay after completion before starting again. Pick `fixedDelay` unless you specifically need runs anchored to a fixed clock cadence regardless of how long each one takes.

## 8. The Problem: Blocking Threads Are Expensive — Except When the JVM Makes Them Cheap

Everything back in section 3 assumed a blocked thread is expensive: each one reserves real memory for its stack and real OS scheduling overhead, which is exactly why a thread-per-request model caps out at some number of concurrent blocked connections no matter how much you tune it.

**Virtual threads** change that underlying cost, without changing how you write the code at all:

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    executor.submit(() -> orderClient.fetchOrders(id));   // ordinary blocking call, unchanged
}
```

A virtual thread is scheduled by the JVM rather than the OS, and when it blocks on I/O, the JVM parks it cheaply and frees up the underlying OS thread to run other virtual threads — so you can have hundreds of thousands of "blocked" virtual threads where you used to be limited to a few thousand real OS threads. The code inside stays exactly the same ordinary, blocking, easy-to-read Java you'd write without any of this — no `CompletableFuture` chains, no reactive operators.

### What virtual threads don't fix

Virtual threads make *threads* cheap. They do nothing about the resources those threads are waiting on. If ten thousand virtual threads all try to query the same database at once, the database's connection pool — still a small, fixed number of real connections — is the actual bottleneck, exactly as it always was. Cheap threads just mean you can now generate that same overload faster and with less code, not that the downstream limit went away.

This is why every one of the tools in this file eventually needs pairing with explicit overload protection, regardless of which concurrency model you're using:

- A **semaphore** or a bounded connection/thread pool caps how many callers can use a scarce resource at once.
- A **timeout** on every external call (section 4's `orTimeout` is one example) makes sure a stuck dependency doesn't hold a caller — thread, virtual thread, or reactive subscriber — forever.
- A **bulkhead** (borrowing the term from ship design) isolates one dependency's failures from consuming resources needed by unrelated calls, so one slow downstream service can't starve everything else.
- A **rate limit** rejects or queues excess load explicitly, rather than letting it silently degrade every other request.

None of synchronous blocking code, `@Async`, reactive streams, or virtual threads removes the need for these — they only change which thread is waiting and how cheaply it can wait. Every async boundary in a real system needs a timeout and an explicit answer to "what happens when this is overloaded," or the overload just shows up somewhere else, later, and harder to diagnose.

## Interview Questions and Answers

### 1. Why is `volatile` insufficient to fix `ordersProcessedToday++`?

**Answer:** `volatile` only guarantees that a write becomes visible to other threads' reads — it does not make a multi-step read-modify-write sequence atomic. Two threads can both read the same fresh value and both write the same incremented result, losing an update. Use `AtomicInteger` (or a lock) for a compound operation like increment; reserve `volatile` for simple flags and single-value visibility.

### 2. What does CAS (Compare-And-Swap) actually do, and why does `AtomicInteger` rely on it?

**Answer:** CAS is a CPU-level instruction that atomically checks "does this memory location still hold the value I last read?" and only writes the new value if so; if another thread changed it in between, the operation fails and the caller retries. `AtomicInteger.incrementAndGet()` uses this to make read-add-write indivisible without needing a lock.

### 3. How do you prevent a deadlock like the account-transfer example?

**Answer:** Always acquire multiple locks in the same global, deterministic order (e.g. by ascending account ID) regardless of which order the parameters arrived in, so two threads contending for the same pair of locks always compete in the same sequence. Supplement with lock timeouts, minimal critical sections, and avoiding unnecessary nested locks.

**Follow-up:** Would an in-process `ReentrantLock` prevent two separate application instances from double-processing the same database row? No — an in-process lock only protects threads inside one JVM. Cross-instance coordination needs a database-level lock or a distributed lock service.

### 4. What does `@Async` actually do, mechanically?

**Answer:** Spring wraps the bean in a proxy; a call to the annotated method through that proxy is submitted to a configured task executor instead of running on the caller's thread. It does not make the work non-blocking — it moves it to a different, still-boundable pool of threads.

### 5. Why can `@Async` silently do nothing?

**Answer:** Self-invocation — calling the annotated method from another method inside the same class (`this.method()`) — bypasses the Spring proxy entirely, since it's a plain Java call, not a call through the container-managed proxy. The method then runs synchronously on the caller's thread with no error. The fix is to put the `@Async` method on a separate bean and call it through that bean.

### 6. `thenApply` versus `thenCompose` on a `CompletableFuture`?

**Answer:** `thenApply` maps the completed value to another plain value. `thenCompose` is for when the transformation itself returns another `CompletableFuture` — it flattens the result instead of producing a nested `CompletableFuture<CompletableFuture<T>>`.

### 7. How should a thread pool be sized?

**Answer:** Base it on measured workload behavior, not a fixed formula. CPU-bound work rarely benefits from more threads than available cores. Blocking I/O-bound work can profitably use more threads than cores, but the useful ceiling is usually set by a downstream limit — database connection pool size, remote service capacity — not by the thread pool's own configuration.

### 8. Why does wrapping a blocking JDBC call in `Mono.fromCallable(...)` not make it non-blocking?

**Answer:** The call still blocks whichever thread executes it. Reactive frameworks run on a small, fixed pool of event-loop threads that assume nothing ever blocks; blocking one of them under load collapses throughput for every other request sharing that pool. The call must be offloaded to a scheduler meant for blocking work (e.g. `Schedulers.boundedElastic()`), or replaced with a genuinely non-blocking driver.

### 9. Why can a `@Scheduled` job run multiple times in production but only once locally?

**Answer:** `@Scheduled` triggers independently on every instance that has the bean; each instance's scheduler has no knowledge of the others. In a single-instance local run there's only one trigger, but a three-instance production deployment fires the job three times. Fix it with a distributed lock that lets only one instance's trigger actually run the job, or by making the job idempotent so duplicate runs are harmless.

### 10. `fixedRate` versus `fixedDelay`?

**Answer:** `fixedRate` schedules the next run relative to when the previous run *started*, which can queue up back-to-back or overlapping runs if a job occasionally runs long. `fixedDelay` schedules the next run relative to when the previous run *finished*, so it never overlaps regardless of how long a run takes.

### 11. Do virtual threads remove the need for connection pools, timeouts, and rate limits?

**Answer:** No. Virtual threads make the cost of a *blocked thread* cheap, letting far more concurrent blocking calls exist at once. They do nothing about the finite capacity of what those calls are waiting on — a database connection pool, a downstream service's capacity — so the same overload-control tools (bounded pools, timeouts, bulkheads, rate limits) are still required, and are now easier to overwhelm faster since spinning up virtual threads is cheap.

### 12. What is backpressure, and where does it apply?

**Answer:** It's a mechanism for a slow consumer to signal capacity limits back to a producer so the producer doesn't overwhelm it, instead of the consumer buffering unboundedly or silently dropping data. Bounded queues in an executor, reactive streams' demand signaling, and rate limiting are all different implementations of the same underlying idea.

### 13. What does happens-before mean, and name two ways to establish it?

**Answer:** It's the Java Memory Model's guarantee that if action A happens-before action B, B is guaranteed to observe every effect of A — without it, a thread may legally see stale or reordered data. It's established by things like releasing then re-acquiring the same lock, writing then reading the same `volatile` field, `Thread.join()` completing, or a `CompletableFuture` completing before another thread observes it.

## Revision Checklist

- [ ] Explain the `ordersProcessedToday++` race condition step by step (read, add, write) and why `volatile` alone doesn't fix it.
- [ ] Explain CAS (Compare-And-Swap) and why `AtomicInteger` is the right fix for a shared counter.
- [ ] Walk through the account-transfer deadlock and fix it with deterministic lock ordering.
- [ ] Explain when to reach for `ReentrantLock` over `synchronized`, and why locks must always release in `finally`.
- [ ] Explain why an unbounded `new Thread()` per request fails, and what a bounded `ExecutorService` buys you.
- [ ] Explain how to size a thread pool differently for CPU-bound versus blocking I/O-bound work.
- [ ] Compose two independent `CompletableFuture` calls with `thenCombine`, add a timeout and a fallback, and explain `thenApply` versus `thenCompose`.
- [ ] Explain what `@Async` actually does via its proxy, why self-invocation breaks it, and why request/security/transaction context doesn't automatically follow the new thread.
- [ ] Explain why wrapping a blocking call in `Mono`/`Flux` doesn't make it non-blocking, and how `Schedulers.boundedElastic()` addresses that.
- [ ] Explain why `@Scheduled` can run a job multiple times in a multi-instance deployment, and the two ways to fix it (distributed lock vs. idempotent design).
- [ ] Explain the difference between `fixedRate` and `fixedDelay` using a job that occasionally runs long.
- [ ] Explain what virtual threads change (thread cost) and what they don't (downstream resource limits), and name the tools — semaphores, timeouts, bulkheads, rate limits — that still apply regardless of concurrency model.
- [ ] Explain happens-before and name at least three ways to establish it.
