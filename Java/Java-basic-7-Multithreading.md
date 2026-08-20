

#### 🔹 Why Multithreading?

👉 Run multiple tasks **parallel**

Example:

* Download file + play music
* Handle multiple users (backend)

---

#### 🔹 Thread Creation (Deep Understanding)

---

### 📌 Method 1: Thread Class

```java
class MyThread extends Thread {
    public void run() {
        System.out.println("Running: " + Thread.currentThread().getName());
    }
}

public class Main {
    public static void main(String[] args) {
        MyThread t1 = new MyThread();
        t1.start();
    }
}
```

👉 Output:

```
Running: Thread-0
```

---

## 📌 Method 2: Runnable (Best)

```java
class MyTask implements Runnable {
    public void run() {
        System.out.println("Running: " + Thread.currentThread().getName());
    }
}

public class Main {
    public static void main(String[] args) {
        Thread t1 = new Thread(new MyTask());
        t1.start();
    }
}
```

---

## 📌 Lambda (Java 8)

```java
Thread t = new Thread(() -> {
    System.out.println("Lambda thread");
});
t.start();
```

👉 Most used in real projects

---

#### 🔹 start() vs run() (Very Important)

```java
t.start(); // new thread
t.run();   // normal method
```

👉 start() → JVM creates new thread
👉 run() → executes in same thread

---

# #### 🔹 Multiple Threads Example

```java
class Task extends Thread {
    public void run() {
        for(int i=0;i<3;i++) {
            System.out.println(Thread.currentThread().getName());
        }
    }
}

public class Main {
    public static void main(String[] args) {
        Task t1 = new Task();
        Task t2 = new Task();

        t1.start();
        t2.start();
    }
}
```

👉 Output (random order):

```
Thread-0
Thread-1
Thread-0
Thread-1
```

👉 Because threads run **parallel**

---

#### 🔹 Race Condition (Problem)

```java
class Counter {
    int count = 0;

    void increment() {
        count++;
    }
}
```

👉 If 2 threads call `increment()`
👉 Expected = 2
👉 But may get = 1 ❌

👉 Because both read same value

---

#### 🔹 Solution: synchronized

```java
synchronized void increment() {
    count++;
}
```

👉 Only one thread allowed

---

#### 🔹 Synchronized Block

```java
void increment() {
    synchronized(this) {
        count++;
    }
}
```

👉 Lock only required part

---

#### 🔹 Deadlock Example

```java
synchronized(obj1) {
    synchronized(obj2) {
    }
}

synchronized(obj2) {
    synchronized(obj1) {
    }
}
```

👉 Thread1 waits for obj2
👉 Thread2 waits for obj1
👉 Both stuck forever ❌

---

#### 🔹 sleep() Example

```java
try {
    Thread.sleep(1000);
} catch(Exception e) {}
```

👉 Pause thread for 1 second

👉 Does NOT release lock

---

#### 🔹 join() Example

```java
Thread t1 = new Thread(() -> {
    System.out.println("Task1");
});

t1.start();
t1.join();

System.out.println("Main");
```

👉 Output:

```
Task1
Main
```

👉 Main waits for t1

---

#### 🔹 wait() & notify()

👉 Used for **thread communication**

---

## Example

```java
synchronized(obj) {
    obj.wait();
}

synchronized(obj) {
    obj.notify();
}
```

👉 wait() → release lock + wait
👉 notify() → wake thread

---

#### 🔹 volatile (Important)

```java
volatile boolean flag = true;
```

👉 Ensures **latest value visible to all threads**

👉 Without volatile → thread may use cached value

---

#### 🔹 Executor Framework (Best Practice)

👉 Instead of manual threads

```java
ExecutorService ex = Executors.newFixedThreadPool(2);

ex.execute(() -> {
    System.out.println("Task");
});

ex.shutdown();
```

👉 Manage thread pool efficiently

---

#### 🔹 Thread States

1. NEW
2. RUNNABLE
3. BLOCKED
4. WAITING
5. TERMINATED

---

#### 🔥 Real Interview Questions

---

### Q: Why Runnable better than Thread?

👉 Supports multiple inheritance
👉 Better design

---

### Q: What is race condition?

👉 Multiple threads update same data → wrong result

---

### Q: What is deadlock?

👉 Threads waiting for each other forever

---

### Q: Difference sleep vs wait?

👉 sleep → pause, no lock release
👉 wait → pause + release lock

---

### Q: What is synchronized?

👉 Allow only one thread at a time

---

#### ⚡ Quick Revision

* start() → new thread
* run() → normal call
* synchronized → lock
* volatile → visibility
* join() → wait
* sleep() → pause
* deadlock → stuck
* race condition → wrong data

---

#### 🔥 Next (Important)

👉 **Java 8 (Lambda + Stream deep)**
OR
👉 **Spring Boot core (very important for job 🔥)**

Just tell 👍
