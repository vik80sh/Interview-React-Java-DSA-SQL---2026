# Exception Handling

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](../Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. The Problem: What Do You Do When a Method Can't Finish Normally?

Imagine `OrderService` has a method that reserves inventory for an order, and it uses return codes to report what happened — no exceptions yet, just plain values:

```java
class OrderService {
    // returns 0 for success, -1 for insufficient inventory, -2 for unknown SKU
    int reserve(String sku, int quantity) {
        Item item = catalog.find(sku);
        if (item == null) return -2;
        if (item.getStock() < quantity) return -1;
        item.decreaseStock(quantity);
        return 0;
    }
}
```

Now look at the caller:

```java
int result = orderService.reserve("SKU-1234", 5);
chargeCustomer(order); // whoops — nobody checked `result` first
```

Nothing here is a language error. The code compiles, runs, and — if the SKU didn't exist or there wasn't enough stock — happily charges the customer for an order that was never actually reserved. The bug isn't in `reserve()`; it's that checking the return value is entirely optional, and optional checks eventually get skipped. Multiply this across a real codebase: every single caller of every method that can fail now has to remember, by discipline alone, to check a return code before doing anything else with the result. Forget once, and the failure doesn't crash anything — it just gets silently ignored and the program keeps going with bad data.

**This is exactly what Java's exception mechanism fixes.** Instead of returning a special value the caller might ignore, a method **throws** an exception — an object representing "this failed, and here's why." Throwing one immediately stops normal execution at that exact line and starts unwinding the call stack, skipping every remaining line in every calling method, until something explicitly catches it or the program terminates. There's no "forgot to check" failure mode: an uncaught exception is loud by default, not silent.

```java
class OrderService {
    void reserve(String sku, int quantity) {
        Item item = catalog.find(sku);
        if (item == null) {
            throw new UnknownSkuException(sku);
        }
        if (item.getStock() < quantity) {
            throw new InsufficientInventoryException(sku);
        }
        item.decreaseStock(quantity);
    }
}
```

```java
orderService.reserve("SKU-1234", 5);
chargeCustomer(order); // this line simply never runs if reserve() throws — no check needed, no way to forget it
```

An exception also carries more than an int ever could: a message describing what went wrong, the exact type of failure (so callers can catch specific kinds), and a stack trace recording exactly which line, in which method, called from which other method, caused it — invaluable when you're staring at a production log at 2 a.m. trying to work out what actually happened.

## 2. Checked vs Unchecked Exceptions

Not every possible failure is the same kind of failure. Compare two methods:

```java
void readConfigFile() throws IOException { ... }         // the file might genuinely not exist on disk

void charge(BigDecimal amount) {
    if (amount.signum() < 0) {
        throw new IllegalArgumentException("Amount cannot be negative");
    }
}
```

`readConfigFile()`'s failure is a real, external possibility that has nothing to do with a bug — disks fail, files get moved, permissions change. A caller can reasonably be expected to plan for it: retry, fall back to a default config, or show the user a real error. `charge()`'s failure is different in kind — a negative amount reaching this method means some earlier code is simply wrong. There's no sensible "recovery" for a caller to plan for; the fix is to not call it with bad input in the first place.

If Java treated both cases identically, you'd end up with one of two bad outcomes: either every method in a long call chain is forced to declare it might throw for things that are really just bugs (pure ceremony, since nobody can meaningfully "handle" a negative-amount bug three layers up), or nothing is ever enforced and a genuinely recoverable failure like a missing config file gets silently ignored because nobody remembered it could happen. Java's answer is to split exceptions into two kinds, enforced differently:

```java
// Checked — the compiler forces the caller to handle it or declare it (via `throws`).
// Represents a recoverable condition the caller can reasonably be expected to plan for.
void readConfigFile() throws IOException { ... }

// Unchecked (RuntimeException and its subclasses) — not enforced by the compiler.
// Represents a programming error or a condition the caller usually can't meaningfully recover from.
void charge(BigDecimal amount) {
    if (amount.signum() < 0) {
        throw new IllegalArgumentException("Amount cannot be negative");
    }
}
```

| | Checked | Unchecked |
|---|---|---|
| Checked at | Compile time | Runtime |
| Must handle or declare | Yes | No |
| Typical examples | `IOException` (Input/Output Exception), `SQLException` | `NullPointerException`, `IllegalArgumentException`, custom business exceptions |
| Real design guidance | Use for conditions the caller can plan for and recover from — a missing file, a network timeout | Use for programming bugs and violated preconditions — most real business-rule exceptions end up unchecked too, to avoid forcing every caller through the call chain to declare `throws` |

Most modern Java services actually lean unchecked even for business failures — `InsufficientFundsException extends RuntimeException`, not a checked exception — because a deep call chain forcing every intermediate method to add `throws` for an exception it doesn't itself handle is exactly the kind of ceremony checked exceptions get criticized for. Reserve checked exceptions for truly recoverable, I/O-style conditions where forcing the caller to think about the failure at compile time is genuinely valuable.

## 3. try / catch / finally — Handling It and Guaranteeing Cleanup

**Scenario:** processing an order means placing an inventory hold, then charging a payment gateway. Whatever happens next — success, a declined card, or the gateway itself being down — that hold has to be released, or the inventory silently stays locked and becomes unsellable forever. Here's the bug hiding in the obvious-looking version:

```java
paymentGateway.charge(order.getTotal()); // this can throw
releaseInventoryHold(order);              // never reached if charge() throws — the hold leaks
```

If `charge()` throws anything at all, execution jumps straight past `releaseInventoryHold(order)` — it never runs. Putting the cleanup code "after" the risky call only works when nothing goes wrong, which defeats the point of having cleanup code. What you actually need is a block of code that runs *no matter what* — whether the try block finished cleanly, threw, or even returned early. That's what `finally` is for:

```java
try {
    paymentGateway.charge(order.getTotal());
} catch (PaymentDeclinedException e) {
    notifyCustomer(order, e.getMessage());
} catch (PaymentGatewayException e) {
    log.error("Gateway error for order {}", order.getId(), e);
    throw new OrderProcessingException("Could not process payment", e); // rethrow, wrapped with context
} finally {
    releaseInventoryHold(order); // always runs — success, decline, or gateway failure
}
```

Walking through exactly what runs, in order:

- The `try` block runs first.
- If it throws, Java looks for the **first matching `catch`**, top to bottom, and runs only that one block — never more than one catch block runs for a single exception. This is why ordering catch blocks matters, covered in the next section.
- `finally` runs after that, regardless of whether `try` completed normally, a `catch` block ran, or a `catch` block itself threw again.

Two more mechanics worth knowing exactly:

- **`throw`** raises an exception right at that line — you're creating the failure. **`throws`**, seen in the previous section's `readConfigFile() throws IOException`, is a method-signature declaration that this method might propagate a checked exception, so callers know they must handle or declare it too. They look similar but do different jobs: one is an action, the other is a promise about the method.
- A `try` block must be followed by at least a `catch` or a `finally` (or both) — a bare `try` with neither doesn't compile.
- `finally` runs even if `try` or `catch` contains a `return`: the return value is computed first, then `finally` runs, and only then does control actually leave the method — *unless* `finally` itself returns or throws, which silently overrides whatever the `try`/`catch` was about to return. That's a genuine footgun. Never put a `return` (or a `throw`) inside a `finally` block.

## 4. Catching Multiple Exception Types — Multi-Catch and Ordering

Say `InsufficientInventoryException` and `PaymentDeclinedException` both need the exact same handling — notify the customer. Writing that out naively duplicates the whole catch body:

```java
try {
    process(order);
} catch (InsufficientInventoryException e) {
    notifyCustomer(order, e.getMessage());
} catch (PaymentDeclinedException e) {
    notifyCustomer(order, e.getMessage()); // identical body, just copy-pasted
} catch (OrderException e) {
    log.error("Unhandled order failure", e);
}
```

Java lets you combine catch blocks with identical bodies using `|` (multi-catch), removing the duplication entirely:

```java
try {
    process(order);
} catch (InsufficientInventoryException | PaymentDeclinedException e) {
    // handle both the same way, without duplicating the catch block
    notifyCustomer(order, e.getMessage());
} catch (OrderException e) {
    log.error("Unhandled order failure", e);
}
```

Ordering is not a style preference here — it's enforced. Catch blocks are checked top to bottom, and only the first one that matches the thrown exception's type runs. If `InsufficientInventoryException` and `PaymentDeclinedException` are both subtypes of `OrderException` (section 6 builds exactly this hierarchy), then catching `OrderException` *before* the specific subtypes would mean the specific catch blocks could never run — every one of those exceptions IS-A `OrderException`, so the general catch would always match first and swallow them. Java doesn't let this compile at all: catching a more general type before a more specific subtype is a compile error, precisely because the specific catch would be unreachable dead code. The rule to keep is simple — **most specific exceptions first, most general last.**

## 5. Exception Chaining — Preserve the Real Cause

**Scenario:** saving an order fails because the database connection timed out. You want to translate that into a domain-meaningful exception instead of leaking a raw `DataAccessException` up through your service layer — but watch what happens if you do it carelessly:

```java
try {
    orderRepository.save(order);
} catch (DataAccessException e) {
    // Wrapping without the cause LOSES the original stack trace — a real production debugging pain point
    throw new OrderProcessingException("Failed to save order " + order.getId()); // BAD — no cause
}
```

Whoever reads the logs later sees "Failed to save order 42" and nothing else — no indication this was actually a connection timeout, a constraint violation, or anything else. The original exception, and its entire stack trace showing exactly where and why it happened, is simply gone. The fix is to pass the original exception in as the new exception's **cause**:

```java
try {
    orderRepository.save(order);
} catch (DataAccessException e) {
    // Correct: pass the original exception as the cause
    throw new OrderProcessingException("Failed to save order " + order.getId(), e); // GOOD
}
```

```java
class OrderProcessingException extends RuntimeException {
    OrderProcessingException(String message, Throwable cause) {
        super(message, cause); // Throwable's constructor stores the cause, preserving the original stack trace
    }
}
```

Now the logged exception shows both: your domain-meaningful message *and*, nested underneath it ("Caused by: ..."), the exact original exception and stack trace. You get a message that makes sense to a human reading the log, without throwing away the one thing that actually explains what happened underneath.

## 6. Designing a Real Exception Hierarchy

**Scenario:** if every business failure in the order flow is just a bare `RuntimeException` with a different message string, error-handling code that wants to react differently to "order not found" versus "payment declined" has nothing to catch except the message text itself — parsing strings to decide behavior is fragile and easy to break with an innocent wording change. What you actually want is for the *type* of the exception to carry that meaning:

```java
abstract class OrderException extends RuntimeException {
    OrderException(String message) { super(message); }
    OrderException(String message, Throwable cause) { super(message, cause); }
}

class OrderNotFoundException extends OrderException {
    OrderNotFoundException(Long id) { super("Order not found: " + id); }
}

class InsufficientInventoryException extends OrderException {
    InsufficientInventoryException(String sku) { super("Insufficient inventory for SKU: " + sku); }
}

class PaymentDeclinedException extends OrderException {
    PaymentDeclinedException(String reason) { super("Payment declined: " + reason); }
}
```

A shared abstract base means error-handling code can catch `OrderException` in exactly one place and branch on the concrete subtype to decide what to do — for a web API, that means mapping each one to the right HTTP status: `OrderNotFoundException` to 404, `InsufficientInventoryException`/`PaymentDeclinedException` to 409, instead of every business failure collapsing into a generic 500. (The REST API Design guide's error-handling section — `Backend/Springboot/02-REST-API-Design.md` — shows the `@RestControllerAdvice` side of exactly this: one handler per exception type, translating each into a consistent response shape.) This is the real reason to bother with a custom hierarchy instead of throwing bare `RuntimeException`s everywhere: it gives calling code, and any error-handling middleware sitting above it, something specific to catch and branch on, instead of one indistinguishable failure type for everything.

## 7. try-with-resources — Guaranteeing a Resource Actually Gets Released

**Scenario:** a database connection needs to be closed once you're done with it, or the underlying connection (and whatever it's holding onto — a socket, a file handle, a lock) never gets released, and you slowly leak resources until the application runs out of them. The obvious-looking fix is closing it in `finally`:

```java
DatabaseConnection connection = new DatabaseConnection();
try {
    connection.query("SELECT * FROM orders WHERE id = ?", orderId);
} finally {
    connection.close();
}
```

That's correct for exactly one resource. Now add a second one — say, writing the query results out to a CSV export file at the same time:

```java
DatabaseConnection connection = new DatabaseConnection();
FileWriter writer = new FileWriter("export.csv");
try {
    // use connection and writer
} finally {
    connection.close(); // if THIS throws, writer.close() below never runs — writer leaks
    writer.close();
}
```

If `connection.close()` itself throws, `writer.close()` on the next line is simply never reached — the exact same "code after this line never runs" problem from section 3, just relocated into the cleanup code itself. You'd have to nest a `try`/`finally` inside the `finally` block just to close each resource independently and safely, and that gets unreadable fast with three or four resources.

Java has a purpose-built fix: **`try`-with-resources**. Any class that implements the `AutoCloseable` interface (or its more specific I/O-flavored cousin, `Closeable`) can be declared directly inside the parentheses of a `try`:

```java
class DatabaseConnection implements AutoCloseable {
    @Override
    public void close() {
        System.out.println("Connection released");
    }
}

try (DatabaseConnection connection = new DatabaseConnection();
     FileWriter writer = new FileWriter("export.csv")) {
    // use connection and writer
} // both close() calls happen automatically here, in reverse order, even if an exception was thrown
```

`AutoCloseable` is the general contract: a single method, `close()`, declared to throw the broad `Exception`. `Closeable` (implemented by most I/O classes, including `FileWriter` above) is the same idea narrowed to Input/Output classes specifically, with `close()` declared to throw only `IOException`. Either way, the contract is the same: "I hold onto something that needs to be released, and calling `close()` releases it."

What `try`-with-resources actually guarantees: every resource declared in the parentheses gets `close()` called on it when the block exits — whether the block finished normally, threw an exception, or returned early — and it closes them in **reverse declaration order** (last opened, first closed, which matters when resources depend on each other). Crucially, if closing one resource throws, Java still goes on to close the rest; it doesn't abandon the remaining resources the way the manual `finally` version above did. This is the direct, reliable replacement for manually closing resources inside `finally`, and it's also the modern replacement for relying on `finalize()` — see [Section 3 of the Constructors/equals/hashCode guide](04-Constructors-Equals-HashCode-Keywords.md#3-final-vs-finally-vs-finalize) — for cleanup: `finalize()` is called by the garbage collector at some unpredictable time, or possibly never before the JVM exits, while `try`-with-resources runs deterministically, exactly when the block exits, every time.

## 8. Anti-Patterns: Swallowing Exceptions and Catching Too Broadly

**Scenario:** you're debugging a report that's silently coming out wrong, and after a long search you find this, three layers deep in the code that generates it:

```java
try {
    inventorySync.run();
} catch (Exception e) {
    // nothing here
}
```

The `inventorySync.run()` call has been failing every single time — maybe a null pointer, maybe a downstream service being unreachable — and nobody has known, because this catch block **swallows** the exception: it catches it and then does absolutely nothing, not even a log line. From the outside, the program looks like it's working. It isn't. This is one of the most damaging patterns in exception handling precisely because it hides real failures behind a facade of success, and it can go undetected for months.

A closely related problem is catching too broadly. `catch (Exception e)` (or worse, `catch (Throwable t)`, which even catches `Error`s the JVM throws for things like running out of memory) matches almost anything — including bugs you never intended to handle, like a `NullPointerException` from a typo three calls deep, or a `ClassCastException` from an unrelated mistake. Catching that broadly deep inside ordinary business logic means a completely unrelated bug gets silently absorbed by a catch block written for a specific, expected failure, and the real problem never surfaces where it happened.

Neither of these means "never catch broadly." There's a legitimate, narrow place for it: a genuine boundary that must never crash the whole process — a top-level HTTP request handler, or a scheduled job runner that has to keep running its next scheduled execution no matter what the previous one did. Even there, the rule doesn't change: log the full exception (so the failure is visible and diagnosable) and either rethrow it as something the caller can act on, or return a safe, well-defined failure result — never just swallow it and move on:

```java
@Scheduled(fixedRate = 60000)
void runInventorySync() {
    try {
        inventorySync.run();
    } catch (Exception e) {
        // legitimate: a scheduled job must survive one bad run to try again next time,
        // but the failure is still visible — nobody's debugging a silent mystery
        log.error("Inventory sync failed, will retry on next scheduled run", e);
    }
}
```

The difference between this and the swallowed version above isn't the `catch (Exception e)` — it's identical. The difference is the boundary it sits at (a scheduler that must survive to try again, not buried inside ordinary business logic) and the fact that the failure is actually logged instead of disappearing without a trace.

## Interview Questions and Answers

### 1. Checked vs unchecked exceptions — how do you decide which to use for a new exception type?

**Answer:** Checked when the failure is genuinely recoverable and the caller can be reasonably expected to plan for it at compile time (a missing file, a network call that can time out). Unchecked for programming errors and most business-rule violations — forcing every method in a deep call chain to declare `throws` for an exception it can't itself handle is exactly the ceremony most modern services avoid by making business exceptions extend `RuntimeException`.

### 2. Why use exceptions instead of returning an error code?

**Answer:** A return code is only checked if the caller remembers to check it, and nothing enforces that — a forgotten check lets the program silently continue with a failure it never noticed. Throwing an exception stops execution immediately at the point of failure and unwinds the stack until something catches it, so a failure can't be silently ignored by accident, and it carries a type, a message, and a full stack trace that a bare int or null never could.

### 3. Does `finally` run if the `try` block has a `return` statement?

**Answer:** Yes. The return value is computed, then `finally` executes, then control actually returns to the caller — unless `finally` itself returns or throws, which silently discards the original outcome. That's a real footgun and a good reason never to `return` (or `throw`) from inside a `finally` block.

**Follow-up:** What's the difference between `throw` and `throws`? `throw` is a statement that actually raises an exception at that line. `throws` is a method-signature declaration saying this method might propagate a checked exception, so callers know to handle or declare it.

### 4. Why must more specific exceptions be caught before more general ones in the same `try`?

**Answer:** Catch blocks are evaluated top to bottom and only the first match runs. If a general exception type is caught first, a more specific subtype catch block placed after it becomes unreachable — every instance of the subtype would already match the general catch first. Java rejects this ordering at compile time for exception types with a real subclass relationship, rather than letting the dead code through.

### 5. Why should you always pass the original exception as the `cause` when wrapping it in a custom exception?

**Answer:** Without the cause, the new exception's stack trace only shows where you threw the wrapper — the actual root cause (e.g. a database timeout) is gone from the logs. Passing it via `super(message, cause)` preserves the full original stack trace as a nested "Caused by," which is often the only way to actually debug the real failure later.

### 6. Why build a custom exception hierarchy instead of throwing plain `RuntimeException` everywhere?

**Answer:** A shared base type lets error-handling code (a `@RestControllerAdvice`, a retry policy, a metrics counter) catch one type and branch on the specific subtype, mapping each business failure to the right response — a 404 for "not found," a 409 for "conflict" — instead of every failure looking identical and forcing a generic 500 response, or requiring fragile string-matching on the exception message to tell failures apart.

### 7. What does `try`-with-resources actually guarantee, and how is it better than closing a resource in `finally`?

**Answer:** It guarantees `close()` is called on every declared resource when the block exits, in reverse declaration order, regardless of whether the block succeeded, threw, or returned early — and if closing one resource throws, it still goes on to close the rest. Manually closing resources in `finally` is easy to get subtly wrong with multiple resources, because an earlier `close()` call throwing skips every `close()` call after it in that same `finally` block.

**Follow-up:** What's the difference between `AutoCloseable` and `Closeable`? `AutoCloseable` is the general contract — `close()` declared to throw the broad `Exception`. `Closeable` narrows that to Input/Output classes specifically, with `close()` declared to throw only `IOException`. Both work in a `try`-with-resources statement.

### 8. Is it acceptable to catch `Exception` (or worse, `Throwable`) broadly in application code?

**Answer:** Only at a deliberate boundary — like a top-level request handler or a scheduled job runner that must never crash the whole process — and even there, log the full exception and either rethrow it or return a safe failure response, rather than silently swallowing it. Catching broadly deep inside ordinary business logic hides real bugs (including completely unrelated ones, like a typo causing a `NullPointerException`) and makes failures far harder to diagnose.

### 9. What's actually wrong with an empty `catch` block?

**Answer:** It swallows the exception — the failure happened, but nothing records that it happened, so the program appears to work while it's actually failing every time. This can go undetected for a long time because there's no log line, no metric, and no visible symptom pointing at the real cause. At minimum, log the exception; ideally, decide explicitly whether to recover, rethrow, or fail loudly.

## Revision Checklist

- [ ] Explain, using a return-code example, why a caller forgetting to check a return value is a real bug class, and how throwing an exception removes that failure mode.
- [ ] Decide checked vs unchecked for a new exception type and justify the choice.
- [ ] Explain `finally`'s guarantees, including the `return`-inside-`finally` footgun, and the difference between `throw` and `throws`.
- [ ] Explain why catch-block ordering matters and why catching a general type before a specific subtype doesn't compile.
- [ ] Wrap a low-level exception in a domain exception without losing the original cause.
- [ ] Design a small exception hierarchy for a real service and map it to HTTP status codes.
- [ ] Use `try`-with-resources correctly for multiple resources, explain the `AutoCloseable`/`Closeable` contract, and explain why it beats manual `finally` cleanup.
- [ ] Explain why swallowing an exception in an empty catch block is dangerous, and when catching broadly is actually legitimate.
