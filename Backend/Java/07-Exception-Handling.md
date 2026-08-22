# Exception Handling

An exception is Java's way of saying "normal execution can't continue past this point." The interview-critical part isn't the syntax — it's knowing when to use a checked vs unchecked exception, how to design a real exception hierarchy for a service, and how to guarantee a resource actually gets released.

## 1. Checked vs Unchecked Exceptions

```java
// Checked — the compiler forces the caller to handle it or declare it. Represents a recoverable
// condition the caller can reasonably be expected to plan for.
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
| Typical examples | `IOException`, `SQLException` | `NullPointerException`, `IllegalArgumentException`, custom business exceptions |
| Real design guidance | Use for conditions the caller can plan for and recover from — a missing file, a network timeout | Use for programming bugs and violated preconditions — most real business-rule exceptions end up unchecked too, to avoid forcing every caller through the call chain to declare `throws` |

Most modern Java services actually lean unchecked even for business failures (`InsufficientFundsException extends RuntimeException`), because a deep call chain forcing every intermediate method to add `throws` for an exception it doesn't handle itself is exactly the kind of ceremony checked exceptions are criticized for. Reserve checked exceptions for truly recoverable I/O-style conditions where forcing the caller to think about the failure at compile time is genuinely valuable.

## 2. try / catch / finally, throw / throws

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

- **Execution order:** `try` runs → if an exception occurs, the **first matching** `catch` runs (order them specific → general, since only one catch block executes) → `finally` runs regardless of what happened above.
- **`throw`** raises an exception right here. **`throws`** is a method-signature declaration that this method might propagate a checked exception, telling callers they must handle or declare it too.
- A `try` block must be followed by at least a `catch` or a `finally` — never neither.
- `finally` runs even if `try` or `catch` contains a `return` — the return value is computed, then `finally` runs, then control actually returns (unless `finally` itself returns or throws, which silently overrides the original outcome — a real footgun, avoid returning from `finally`).

## 3. Exception Chaining — Preserve the Real Cause

```java
try {
    orderRepository.save(order);
} catch (DataAccessException e) {
    // Wrapping without the cause LOSES the original stack trace — a real production debugging pain point
    throw new OrderProcessingException("Failed to save order " + order.getId()); // BAD — no cause

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

When you catch a low-level exception and throw a more meaningful, domain-specific one, always pass the original as the `cause`. Without it, whoever reads the logs later sees "Failed to save order 42" with no indication it was actually a connection timeout — the real root cause is gone.

## 4. Designing a Real Exception Hierarchy

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

A shared abstract base lets a `@RestControllerAdvice`-style handler (see the [REST API Design guide](../Backend/02-REST-API-Design.md#5-error-handling)) catch `OrderException` in one place and map each specific subtype to the right HTTP status — `OrderNotFoundException` → 404, `InsufficientInventoryException`/`PaymentDeclinedException` → 409 — instead of a generic 500 for every business failure. This is the real reason to bother with a custom hierarchy rather than throwing bare `RuntimeException`s everywhere: it gives calling code (and error-handling middleware) something specific to catch and branch on.

## 5. try-with-resources — Deterministic Cleanup

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

Anything implementing `AutoCloseable` (or `Closeable`) can go in the parentheses of a `try`. Java guarantees `close()` is called when the block exits — success, exception, or `return` — in reverse declaration order, with zero risk of forgetting it in some code path. This is the direct, reliable replacement for the old pattern of closing a resource manually inside `finally` (which is easy to get wrong when there are multiple resources and one's `close()` itself can throw), and it's also the modern replacement for relying on `finalize()` (Section 3 of the [Constructors/equals/hashCode guide](04-Constructors-Equals-HashCode-Keywords.md)) for cleanup — `try`-with-resources runs deterministically; `finalize()` never guaranteed to run at all.

## 6. Multi-Catch and Exception Ordering

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

Catch blocks are checked top to bottom, and only the first matching one runs — ordering **more specific exceptions before more general ones** is required, or the compiler rejects an unreachable general-then-specific ordering (catching `OrderException` before `PaymentDeclinedException` would make the specific catch unreachable, since `PaymentDeclinedException` IS-A `OrderException`).

## Interview Questions and Answers

### 1. Checked vs unchecked exceptions — how do you decide which to use for a new exception type?

**Answer:** Checked when the failure is genuinely recoverable and the caller can be reasonably expected to plan for it at compile time (a missing file, a network call that can time out). Unchecked for programming errors and most business-rule violations — forcing every method in a deep call chain to declare `throws` for an exception it can't itself handle is exactly the ceremony most modern services avoid by making business exceptions extend `RuntimeException`.

### 2. Does `finally` run if the `try` block has a `return` statement?

**Answer:** Yes. The return value is computed, then `finally` executes, then control actually returns to the caller — unless `finally` itself returns or throws, which silently discards the original outcome. That's a real footgun and a good reason never to `return` from inside a `finally` block.

### 3. Why should you always pass the original exception as the `cause` when wrapping it in a custom exception?

**Answer:** Without the cause, the new exception's stack trace only shows where you threw the wrapper — the actual root cause (e.g. a database timeout) is gone from the logs. Passing it via `super(message, cause)` preserves the full original stack trace, which is often the only way to actually debug the real failure later.

### 4. Why build a custom exception hierarchy instead of throwing plain `RuntimeException` everywhere?

**Answer:** A shared base type lets error-handling code (a `@RestControllerAdvice`, a retry policy, a metrics counter) catch one type and branch on the specific subtype, mapping each business failure to the right response — a 404 for "not found," a 409 for "conflict" — instead of every failure looking identical and forcing a generic 500 response.

### 5. What does `try`-with-resources actually guarantee, and how is it better than closing a resource in `finally`?

**Answer:** It guarantees `close()` is called on every declared resource when the block exits, in reverse declaration order, regardless of whether the block succeeded, threw, or returned early. Manually closing resources in `finally` is easy to get subtly wrong with multiple resources (especially if an earlier `close()` call itself throws and skips the rest), while `try`-with-resources handles that correctly by construction.

### 6. Why must more specific exceptions be caught before more general ones in the same `try`?

**Answer:** Catch blocks are evaluated top to bottom and only the first match runs. If a general exception type is caught first, a more specific subtype catch block placed after it becomes unreachable — the compiler actually rejects this ordering at compile time for exception types with a real subclass relationship.

### 7. Is it acceptable to catch `Exception` (or worse, `Throwable`) broadly in application code?

**Answer:** Only at a deliberate boundary — like a top-level request handler or a scheduled job runner that must never crash the whole process — and even there, log the full exception and rethrow or return a safe failure response rather than silently swallowing it. Catching broadly deep inside business logic hides real bugs and makes failures much harder to diagnose.

## Revision Checklist

- [ ] Decide checked vs unchecked for a new exception type and justify the choice.
- [ ] Explain `finally`'s guarantees, including the `return`-inside-`finally` footgun.
- [ ] Wrap a low-level exception in a domain exception without losing the original cause.
- [ ] Design a small exception hierarchy for a real service and map it to HTTP status codes.
- [ ] Use `try`-with-resources correctly for multiple resources and explain why it beats manual `finally` cleanup.
