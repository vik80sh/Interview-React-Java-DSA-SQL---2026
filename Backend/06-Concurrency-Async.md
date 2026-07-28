# Concurrency & Async Processing
## Threads, Thread Safety, CompletableFuture, Scheduling

---

## TABLE OF CONTENTS
1. Thread Basics & Safety
2. Synchronization & Locks
3. Async/Non-blocking Code
4. CompletableFuture
5. Task Scheduling
6. Common Interview Questions

---

# PART 1: THREAD BASICS

## Understanding Threads

```java
// SINGLE-THREADED (blocking)
@RestController
public class ReportController {
    
    @GetMapping("/report")
    public ResponseEntity<Report> getReport() {
        // This blocks the thread!
        Report report = expensiveOperation(); // Takes 5 seconds
        return ResponseEntity.ok(report);
    }
    
    private Report expensiveOperation() {
        try {
            Thread.sleep(5000); // Simulate long operation
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return new Report("data");
    }
}

// PROBLEMS:
// - Each request = 1 thread (limited pool)
// - Thread waits 5 seconds doing nothing
// - Can't scale (servlet threads = limited)
// - Database connections blocked

// ✅ SOLUTION: Use async/non-blocking
@GetMapping("/report")
public CompletableFuture<ResponseEntity<Report>> getReportAsync() {
    return reportService.generateReportAsync()
        .thenApply(ResponseEntity::ok);
}

// BENEFITS:
// - Same thread handles other requests
// - Better resource utilization
// - Can scale to more concurrent users
```

---

## Thread Safety Problem

```java
// ❌ NOT THREAD-SAFE
class Counter {
    private int count = 0; // Shared state
    
    public void increment() {
        count++; // Not atomic!
        // Thread 1: reads count (0), increments, writes (1)
        // Thread 2: reads count (0), increments, writes (1)
        // Result: count = 1 (but should be 2!)
    }
}

// What happens:
// Thread 1: read count=0
// Thread 2: read count=0
// Thread 1: write count=1
// Thread 2: write count=1
// Final: count=1 (WRONG! Lost update)

// ✅ THREAD-SAFE SOLUTIONS

// Solution 1: Synchronized
class SafeCounter1 {
    private int count = 0;
    
    public synchronized void increment() {
        count++; // Only one thread at a time
    }
}

// Solution 2: Atomic
class SafeCounter2 {
    private AtomicInteger count = new AtomicInteger(0);
    
    public void increment() {
        count.incrementAndGet(); // Atomic operation
    }
}

// Solution 3: Volatile (for simple cases)
class SafeCounter3 {
    private volatile int count = 0;
    
    public void increment() {
        count++; // Still not thread-safe! Use Atomic instead
    }
}

// Solution 4: No shared state (best)
// Pass data through method parameters, no instance variables
```

---

# PART 2: SYNCHRONIZATION & LOCKS

## Synchronized Blocks

```java
// ❌ Synchronized entire method (slow)
class BankAccount {
    private double balance = 0;
    
    public synchronized void deposit(double amount) {
        balance += amount;
    }
    
    public synchronized double getBalance() {
        return balance;
    }
}
// Entire method is locked - not efficient

// ✅ Synchronized specific section (better)
class BankAccount {
    private double balance = 0;
    private final Object lock = new Object();
    
    public void deposit(double amount) {
        // Some work outside lock
        double fee = calculateFee(amount);
        
        // Only lock what needs it
        synchronized(lock) {
            balance += amount - fee;
        }
    }
}
```

---

## Locks (ReentrantLock)

```java
class BankAccount {
    private double balance = 0;
    private final ReentrantLock lock = new ReentrantLock();
    
    public void deposit(double amount) {
        lock.lock();
        try {
            balance += amount;
        } finally {
            lock.unlock(); // Always unlock
        }
    }
    
    public void transferToOtherAccount(BankAccount other, double amount) {
        // Lock both accounts to prevent deadlock
        lock.lock();
        other.lock.lock();
        try {
            this.balance -= amount;
            other.balance += amount;
        } finally {
            other.lock.unlock();
            lock.unlock();
        }
    }
}

// ReentrantLock advantages:
// - More control (tryLock, timeout)
// - Fair locking option
// - Better than synchronized for complex scenarios
```

---

# PART 3: ASYNC/NON-BLOCKING CODE

## CompletableFuture

```java
@Service
public class ReportService {
    
    @Async // Make method run in thread pool
    public CompletableFuture<Report> generateReportAsync() {
        // This runs in background thread
        Report report = expensive Operation();
        return CompletableFuture.completedFuture(report);
    }
    
    // Chaining async operations
    @GetMapping("/report")
    public CompletableFuture<ResponseEntity<Report>> getReport() {
        return reportService.generateReportAsync()
            .thenApply(report -> enrich(report))        // Chain operation
            .thenApply(report -> ResponseEntity.ok(report))
            .exceptionally(ex -> ResponseEntity.status(500).build());
    }
    
    // Combining multiple async operations
    public CompletableFuture<Report> combineReports() {
        CompletableFuture<Report> report1 = generateReport1Async();
        CompletableFuture<Report> report2 = generateReport2Async();
        
        // Wait for both
        return report1.thenCombine(report2, (r1, r2) -> {
            return new Report(r1.getData() + r2.getData());
        });
    }
    
    // Multiple async operations
    public CompletableFuture<List<String>> fetchFromMultipleSources() {
        return CompletableFuture.allOf(
            fetchSource1Async(),
            fetchSource2Async(),
            fetchSource3Async()
        ).thenApply(v -> combineResults());
    }
}

// Enable async
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}
```

---

# PART 4: REACTIVE (ADVANCED)

```java
// Reactive approach (non-blocking, push-based)
@RestController
public class ReportReactiveController {
    
    @GetMapping("/report")
    public Mono<Report> getReportReactive() {
        return reportService.generateReportMono()
            .map(this::enrich)
            .onErrorReturn(new Report("error"));
    }
    
    // Stream multiple values
    @GetMapping("/reports", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<Report> getReportsStream() {
        return reportService.generateReportsFlux()
            .delayElement(Duration.ofSeconds(1));
    }
}

// Advantages:
// - True non-blocking
// - Backpressure handling
// - Resource efficient
// 
// Disadvantages:
// - Steeper learning curve
// - Complex debugging
// - Requires reactive libraries (Project Reactor, RxJava)
```

---

# PART 5: TASK SCHEDULING

## Scheduled Tasks

```java
@Configuration
@EnableScheduling
public class SchedulingConfig {
}

@Component
public class ScheduledTasks {
    
    @Scheduled(fixedRate = 5000) // Every 5 seconds
    public void taskFixedRate() {
        System.out.println("Running every 5 seconds");
    }
    
    @Scheduled(fixedDelay = 5000) // 5 seconds after last execution ends
    public void taskFixedDelay() {
        System.out.println("5 seconds after last execution");
    }
    
    @Scheduled(cron = "0 0 12 * * ?") // Daily at noon
    public void taskCron() {
        System.out.println("Running at noon");
    }
    
    @Scheduled(cron = "0 */15 * * * ?") // Every 15 minutes
    public void quarterlyTask() {
        System.out.println("Every 15 minutes");
    }
    
    @Async
    @Scheduled(fixedRate = 5000)
    public void asyncScheduledTask() {
        // Runs in separate thread
    }
}

// CRON EXPRESSION: second minute hour day month day-of-week
// 0 0 12 * * ? = 12:00:00 daily
// 0 */15 * * * ? = Every 15 minutes
// 0 0 0 1 * ? = 1st of month

// fixedRate vs fixedDelay:
// fixedRate: Starts next at fixed interval (regardless of duration)
// fixedDelay: Waits fixed delay after completion
```

---

# PART 6: INTERVIEW QUESTIONS

## Question 1: Synchronous vs Asynchronous

**Answer:**
```
SYNCHRONOUS (Blocking):
- Thread waits for operation to complete
- Request blocked until response
- Simple to understand
- Limited scalability
- Traditional servlet apps

ASYNCHRONOUS (Non-blocking):
- Thread continues to other work
- Operation happens in background
- Callback/Promise when done
- Better scalability
- Modern microservices

Example:
// Sync
var result = getUserFromDatabase(); // Waits here
console.log(result);

// Async
getUserFromDatabase().then(result => {
    console.log(result);
});
```

---

## Question 2: Thread-safety - How to ensure it?

**Answer:**
```
1. Immutability (best)
   - Make objects immutable
   - No shared mutable state
   - Thread-safe by design

2. Atomic operations
   - Use AtomicInteger, AtomicReference
   - Provides atomic updates

3. Synchronization
   - synchronized keyword
   - ReentrantLock
   - Coarse-grained locking (slower)

4. ThreadLocal
   - Each thread gets own instance
   - Good for thread-local context

5. Avoid shared state
   - Use local variables
   - Pass data through parameters
   - Best practice!

6. Collections.synchronizedList()
   - Thread-safe collections
   - ConcurrentHashMap (better than synchronized)
```

---

## Question 3: @Async - How does it work?

**Answer:**
```
1. Method marked with @Async
2. Spring creates proxy that intercepts calls
3. Proxy submits method to thread pool (TaskExecutor)
4. Method runs in separate thread
5. Main thread continues immediately

Example:
@Async
public CompletableFuture<Report> generateReport() {
    return CompletableFuture.completedFuture(report);
}

// Caller
public void getReport() {
    CompletableFuture<Report> future = generateReport();
    // Continues immediately, doesn't wait
    
    // Later:
    Report report = future.get(); // Block if needed
}

Limitations:
- Only works on @Component methods
- Can't call from same class (proxy issue)
- Returns CompletableFuture or void only
```

---

## Question 4: How to prevent deadlock?

**Answer:**
```
DEADLOCK: Two threads waiting for each other's locks

Example:
Thread 1: Locks A, wants B
Thread 2: Locks B, wants A
DEADLOCK!

Prevention:
1. Acquire locks in same order
   Thread 1: Lock A then B
   Thread 2: Lock A then B
   
2. Use timeout
   lock.tryLock(1, TimeUnit.SECONDS)
   
3. Avoid nested locks
   
4. Use ReentrantLock (more control)
   
5. Use lock-free data structures
   AtomicReference, ConcurrentHashMap
```

---

## Question 5: Thread pool size - How to choose?

**Answer:**
```
CPU-BOUND TASKS (calculations, logic):
- Pool size = Number of CPU cores
- Example: 4-core CPU = 4-8 threads

I/O-BOUND TASKS (database, API calls):
- Pool size = Larger (many waiting for I/O)
- Example: 4-core CPU = 20-100 threads

Formula:
threads = cores * (1 + wait_time / compute_time)
threads = cores * (1 + IO_time / processing_time)

Spring configuration:
ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
executor.setCorePoolSize(5);      // Minimum
executor.setMaxPoolSize(20);      // Maximum
executor.setQueueCapacity(100);   // Queue size
executor.initialize();

Queue strategies:
- Unbounded queue: Accepts all, memory risk
- Bounded queue: Rejects if full
- SynchronousQueue: Direct handoff
```

---

# SUMMARY: Concurrency Mastery

✅ **Thread Safety:**
- [ ] Understand race conditions
- [ ] Know AtomicInteger/AtomicReference
- [ ] Know synchronized vs ReentrantLock
- [ ] Know immutability benefits

✅ **Async:**
- [ ] Know @Async annotation
- [ ] Know CompletableFuture (thenApply, thenCombine)
- [ ] Know when to use async

✅ **Scheduling:**
- [ ] Know @Scheduled
- [ ] Know fixedRate vs fixedDelay
- [ ] Know cron expressions

✅ **Performance:**
- [ ] Know thread pool sizing
- [ ] Know ThreadPoolTaskExecutor
- [ ] Know when to use what

---

**Master concurrency—it's 10% of backend interviews!**
