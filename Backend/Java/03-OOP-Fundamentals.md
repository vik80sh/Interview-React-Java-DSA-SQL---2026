# Object-Oriented Programming in Java

The four pillars — encapsulation, inheritance, polymorphism, abstraction — are easy to recite and hard to explain with a real example on the spot. Every example below is a small piece of a real payment/order system, the kind of thing you'd actually build, not `Animal`/`Dog`.

## 1. Class and Object

A **class** is the blueprint; an **object** is a specific instance built from it.

```java
class Order {
    Long id;
    BigDecimal total;
}

Order order = new Order(); // an actual Order, in memory, with its own id and total
order.id = 101L;
```

## 2. Encapsulation — Protect Invariants, Not Just Hide Fields

Encapsulation is usually taught as "make fields private, add getters/setters" — but the real reason is to **protect an invariant that must never be violated**, like a bank balance never going negative:

```java
class BankAccount {
    private BigDecimal balance;

    public BankAccount(BigDecimal openingBalance) {
        if (openingBalance.signum() < 0) {
            throw new IllegalArgumentException("Opening balance cannot be negative");
        }
        this.balance = openingBalance;
    }

    public void withdraw(BigDecimal amount) {
        if (amount.compareTo(balance) > 0) {
            throw new IllegalStateException("Insufficient funds");
        }
        balance = balance.subtract(amount);
    }

    public BigDecimal getBalance() {
        return balance;
    }
}
```

If `balance` were a public field, any caller could write `account.balance = new BigDecimal("-999")` directly and skip the check entirely. Encapsulation isn't about hiding for its own sake — a plain public getter with no validating setter is still fully encapsulated if it protects the class's rules. A blind "generate getters and setters for every field" is not encapsulation; it's just as unsafe as a public field, since callers can still set any value with no validation.

## 3. Inheritance — Code Reuse Through an IS-A Relationship

```java
class Employee {
    protected String name;
    protected BigDecimal baseSalary;

    BigDecimal computePay() {
        return baseSalary;
    }
}

class Manager extends Employee {
    private BigDecimal teamBonus;

    @Override
    BigDecimal computePay() {
        return baseSalary.add(teamBonus); // reuses baseSalary from Employee, adds its own rule
    }
}
```

`Manager` IS-A `Employee` — it reuses `Employee`'s fields and method, then changes just the pay calculation. Java supports **single inheritance** for classes (`extends` one class only); use interfaces when a class genuinely needs to honor multiple contracts. `super` refers to the parent: `super.computePay()` inside `Manager` would call `Employee`'s version directly, useful when you want to add to the parent behavior rather than fully replace it. The parent's constructor always runs before the child's — if you don't call `super(...)` explicitly, Java inserts a no-arg `super()` call automatically.

## 4. Polymorphism — One Interface, Many Real Implementations

### Compile-time (overloading) — same method name, different parameters

```java
class PricingCalculator {
    BigDecimal applyDiscount(BigDecimal price, BigDecimal percent) { ... }
    BigDecimal applyDiscount(BigDecimal price, BigDecimal percent, BigDecimal cap) { ... }
}
```

Resolved at compile time based on the arguments you pass. Overloads must differ by parameter type, count, or order — return type alone is never enough to distinguish them.

### Runtime (overriding) — the actual real-world use case for polymorphism

This is the version that shows up constantly in real backend code — processing a payment without the caller needing to know *which* payment method it is:

```java
interface PaymentMethod {
    void charge(BigDecimal amount);
}

class CreditCardPayment implements PaymentMethod {
    public void charge(BigDecimal amount) { /* call card network */ }
}

class UpiPayment implements PaymentMethod {
    public void charge(BigDecimal amount) { /* call UPI gateway */ }
}

class PaypalPayment implements PaymentMethod {
    public void charge(BigDecimal amount) { /* call PayPal API */ }
}

void checkout(PaymentMethod method, BigDecimal amount) {
    method.charge(amount); // the actual charge() that runs depends on the real object at runtime
}
```

`checkout` never has an `if (method instanceof CreditCardPayment) ... else if ...` chain — the JVM resolves `charge()` to the correct override based on the object's actual runtime type. This is exactly what lets you add a new `CryptoPayment` later without touching `checkout` at all.

| | Overloading | Overriding |
|---|---|---|
| Same method name | Yes | Yes |
| Parameters | Must differ | Must be identical |
| Return type | Doesn't matter for resolution | Same or covariant (subclass) type |
| Where | Same class | Parent and child class |
| Requires inheritance? | No | Yes |
| Resolved | Compile time | Runtime |
| Access level | Any | Cannot be reduced in the override |

Common traps: a `static` method with the same signature in a subclass is **method hiding**, not overriding (it's resolved by the reference's declared type, not the actual object). A `final` method cannot be overridden at all.

## 5. Abstraction — Hide the "How," Publish the "What"

```java
interface NotificationSender {
    void send(String recipient, String message);
}

class EmailSender implements NotificationSender {
    public void send(String recipient, String message) { /* SMTP details hidden here */ }
}

class SmsSender implements NotificationSender {
    public void send(String recipient, String message) { /* SMS gateway details hidden here */ }
}
```

Calling code depends only on `NotificationSender.send(...)` — it never needs to know whether that's SMTP, an SMS gateway, or a push notification service underneath. That's the actual point of abstraction: the caller's code doesn't change when the implementation does.

### Abstract class vs interface

```java
abstract class BaseNotificationSender implements NotificationSender {
    // shared logic every sender needs — logging, retry count — lives here once
    public void send(String recipient, String message) {
        log(recipient, message);
        doSend(recipient, message);
    }

    protected abstract void doSend(String recipient, String message);

    private void log(String recipient, String message) { /* shared logging code */ }
}
```

| | Interface | Abstract class |
|---|---|---|
| Methods | Abstract by default (also allows `default`/`static`) | Mix of abstract and fully implemented methods |
| Fields | Implicitly `public static final` (constants only) | Any field, any modifier |
| Constructor | Not allowed | Allowed |
| Inheritance | A class can `implements` many | A class can `extends` only one |
| Use it when | You need a pure contract, or multiple unrelated classes must honor it | Several related classes share real, non-trivial logic |

The real decision rule: reach for an interface when you're defining a *capability* (`PaymentMethod`, `NotificationSender`) that unrelated classes might implement differently. Reach for an abstract class when several implementations share enough actual code (not just a signature) that duplicating it would be a maintenance problem — like the shared `log()` call above.

## 6. Nested, Inner, and Anonymous Classes

Four flavors show up in real code and interviews both:

```java
class OrderProcessor {

    // Static nested class — doesn't need an OrderProcessor instance to exist
    static class ProcessingResult {
        final boolean success;
        ProcessingResult(boolean success) { this.success = success; }
    }

    // Inner (non-static) class — tied to a specific OrderProcessor instance,
    // can access its outer instance's fields directly
    class AuditLogger {
        void log(String message) {
            System.out.println(orderProcessorName + ": " + message); // reaches into the outer instance
        }
    }

    private String orderProcessorName = "primary";

    ProcessingResult process(Order order) {
        // Local class — defined inside a method, visible only there
        class RetryPolicy {
            int attemptsLeft = 3;
        }

        // Anonymous class — a one-off implementation with no named class at all,
        // still common for a quick Comparator or a callback
        Comparator<OrderLine> byAmountDesc = new Comparator<OrderLine>() {
            @Override
            public int compare(OrderLine a, OrderLine b) {
                return b.getAmount().compareTo(a.getAmount());
            }
        };

        return new ProcessingResult(true);
    }
}
```

The practical distinction: a **static nested class** is basically a regular class that happens to be namespaced inside another one (Section 4's real-world equivalent: a `Builder` nested inside the class it builds — see [Design Patterns in Core Java](11-Design-Patterns-Core-Java.md)). An **inner class** holds an implicit reference to its enclosing instance, which is powerful but means it can't outlive or exist independently of that instance. **Local** and **anonymous** classes matter mostly for short-lived, single-use logic — in modern Java, a lambda usually replaces what an anonymous class used to do for a single-method interface (see the [Java 8 guide](09-Java8-Lambda-Stream-Optional.md)).

## Interview Questions and Answers

### 1. What are the four pillars of OOP, and can you give a one-line reason for each?

**Answer:** Encapsulation protects an object's invariants by controlling how its state can change. Inheritance lets a class reuse and extend another class's behavior through an IS-A relationship. Polymorphism lets calling code work with a common interface while the actual behavior varies by the real runtime type. Abstraction publishes what something does while hiding how it does it.

### 2. Why is "private fields + generated getters and setters" not automatically good encapsulation?

**Answer:** Encapsulation's job is protecting an invariant. A setter that assigns any value with no validation offers the same lack of safety as a public field — it just adds a method call in front of it. Real encapsulation, like `BankAccount.withdraw()` rejecting an overdraft, validates before mutating state.

### 3. Give a real example of runtime polymorphism, and explain why it's useful.

**Answer:** A `checkout(PaymentMethod method, BigDecimal amount)` method that calls `method.charge(amount)` without knowing whether `method` is a credit card, UPI, or PayPal implementation. The JVM resolves `charge()` to the correct override based on the object's actual type at runtime. It's useful because you can add a brand-new payment type later without touching `checkout` at all.

### 4. How is method overloading resolved differently from method overriding?

**Answer:** Overloading is resolved at compile time, based on the declared types of the arguments you pass and which overload matches. Overriding is resolved at runtime, based on the actual object's real class, regardless of the reference type used to call it.

### 5. When would you choose an abstract class over an interface?

**Answer:** When multiple related implementations share real, non-trivial logic — not just a method signature — that would otherwise be duplicated in every implementation. An interface fits better when you're defining a pure capability that unrelated classes need to honor, especially if a class needs to satisfy more than one such contract at once.

### 6. Why can't a class extend two other classes but can implement multiple interfaces?

**Answer:** Java deliberately disallows multiple class inheritance to avoid the "diamond problem" (ambiguity when two parent classes define conflicting behavior for the same inherited method). Interfaces avoid that ambiguity because, historically, they carried no implementation at all; even with `default` methods today, Java forces you to explicitly resolve a conflict if two interfaces provide clashing defaults.

### 7. What's the practical difference between a static nested class and an inner (non-static) class?

**Answer:** A static nested class behaves like an ordinary class that's simply namespaced inside another — it needs no enclosing instance to exist. An inner class holds an implicit reference to the specific outer instance that created it, can access that instance's fields directly, and cannot exist independently of it.

### 8. Why is a `static` method in a subclass with the same signature as a parent's `static` method not "overriding"?

**Answer:** It's method hiding, not overriding. Static methods are resolved by the reference's declared (compile-time) type, not the object's actual runtime type, so there's no dynamic dispatch involved — the opposite of what overriding means.

## Revision Checklist

- [ ] Explain the four pillars with a real payment/order example for each, not `Animal`/`Dog`.
- [ ] Build a `BankAccount`-style class that protects an invariant, not just wraps a field.
- [ ] Explain overloading vs overriding, including the static-method-hiding trap.
- [ ] Decide between an interface and an abstract class for a given real scenario and justify it.
- [ ] Explain the difference between static nested, inner, local, and anonymous classes.
