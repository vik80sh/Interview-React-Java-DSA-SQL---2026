# OOP (Object-Oriented Programming) Fundamentals

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](../Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

The four pillars — encapsulation, inheritance, polymorphism, abstraction — are easy to recite and hard to explain with a real example on the spot. Every example below is a small piece of a real order/payment/payroll system, the kind of thing you'd actually build, never `Animal`/`Dog`.

---

## 1. The Problem: Data and the Code That Uses It, Scattered Everywhere

Say you're tracking orders in a small e-commerce backend. The first instinct, before you reach for any class at all, is often just loose variables and functions:

```java
Long orderId = 101L;
BigDecimal orderTotal = new BigDecimal("250.00");
String orderStatus = "PENDING";

void markPaid(Long orderId, BigDecimal orderTotal, String orderStatus) {
    // ...updates something, somewhere, based on three separate values
}
```

This looks harmless for one order. It falls apart the moment you have many:

```java
Long[] orderIds = {101L, 102L, 103L};
BigDecimal[] orderTotals = {new BigDecimal("250.00"), new BigDecimal("40.00"), new BigDecimal("999.00")};
String[] orderStatuses = {"PENDING", "PAID", "PENDING"};
```

1. **Nothing ties one order's id, total, and status together except their shared array index.** Sort `orderTotals` for a report and forget to sort the other two arrays in lockstep, and now order 101's total is silently attached to order 103's status. The compiler won't catch this — it's just three unrelated arrays as far as Java is concerned.
2. **Every function that touches an order needs the same three parameters, in the same order, forever.** Add a `customerEmail` field next month, and you're editing the parameter list of every function that deals with an order.
3. **There's no single place that enforces "a status must be one of PENDING/PAID/CANCELLED."** Any code anywhere could set `orderStatuses[1] = "WHATEVER"` and nothing would object.

**This is exactly what a class answers: bundle the data that belongs together with the behavior that operates on it, into one unit.** A **class** is the blueprint for that unit — it declares what fields and methods every order of this shape will have. An **object** is one specific instance built from that blueprint, with its own actual values in memory:

```java
class Order {
    Long id;
    BigDecimal total;
    String status;
}

Order order = new Order();   // an actual Order, in memory, with its own id, total, and status
order.id = 101L;
order.total = new BigDecimal("250.00");
order.status = "PENDING";
```

Now `id`, `total`, and `status` for one order travel together as a single `Order` object — no separate arrays to keep in sync, and a method that needs "an order" takes one parameter instead of three. This one idea — data and the behavior on that data, bundled into a single unit — is the foundation everything else in this file builds on.

## 2. Encapsulation — Protect Invariants, Not Just Hide Fields

Bundling `id`, `total`, and `status` into one `Order` class fixed the "scattered arrays" problem, but it introduced a new one. Nothing stops code elsewhere from doing this:

```java
class BankAccount {
    BigDecimal balance;   // a plain public field
}

BankAccount account = new BankAccount();
account.balance = new BigDecimal("100.00");
account.balance = new BigDecimal("-999.00");   // nothing stops this
```

A bank balance going negative through a direct field assignment, with zero validation, is a real bug — not a hypothetical one. Bundling data into a class didn't prevent it, because the field is still wide open to being set to anything, from anywhere.

**This is exactly what encapsulation answers: control access to a class's fields so that whatever rule must always hold true — its invariant — genuinely can't be violated from outside.** Encapsulation is usually taught as "make fields private, add getters and setters," but that phrase misses the actual point. The real reason is protecting an invariant:

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

Now `balance` is `private`, so no code outside `BankAccount` can touch it directly — the only way to reduce it is `withdraw(...)`, and that method checks the invariant ("balance never goes negative") before it lets the change happen at all.

Here's the part that trips people up: **a blind "generate a getter and a setter for every private field" is not encapsulation.** A `setBalance(BigDecimal newBalance)` that just assigns `this.balance = newBalance` with no validation is exactly as unsafe as the public field was — it just adds a method call in front of the same problem. What actually makes `BankAccount` encapsulated is that `withdraw` validates before it mutates state; the fact that `balance` is `private` is just the mechanism that forces every caller to go through that validation instead of bypassing it. A class with a plain public getter and no setter at all is still fully encapsulated, as long as nothing lets an outside caller push the object into an invalid state.

## 3. Inheritance — Code Reuse Through an IS-A Relationship

Encapsulation fixed "who's allowed to change this data." A separate problem shows up once you have more than one kind of thing that's mostly-but-not-entirely the same. Say your payroll system needs both a regular `Employee` and a `Manager`:

```java
class Employee {
    String name;
    BigDecimal baseSalary;

    BigDecimal computePay() {
        return baseSalary;
    }

    void printPayslip() {
        System.out.println(name + ": " + computePay());
    }
}

class Manager {
    String name;              // duplicated
    BigDecimal baseSalary;    // duplicated
    BigDecimal teamBonus;     // the one thing that's actually different

    BigDecimal computePay() {
        return baseSalary.add(teamBonus);
    }

    void printPayslip() {                                    // duplicated, word for word
        System.out.println(name + ": " + computePay());
    }
}
```

`Manager` is a near-total copy-paste of `Employee`, with one field added and one method changed. That's a real maintenance problem: fix a bug in `printPayslip`, and you have to remember to fix it in both places. Add a `Director` next month with yet another pay rule, and you copy-paste the same fields and the same `printPayslip` a third time.

**This is exactly what inheritance answers: a class can reuse another class's fields and methods by declaring an IS-A relationship to it, instead of copying them.** A `Manager` genuinely IS-A `Employee` — it has a name and a base salary just like any employee, plus something extra. Java lets you say that directly:

```java
class Employee {
    protected String name;
    protected BigDecimal baseSalary;

    BigDecimal computePay() {
        return baseSalary;
    }

    void printPayslip() {
        System.out.println(name + ": " + computePay());
    }
}

class Manager extends Employee {
    private BigDecimal teamBonus;

    @Override
    BigDecimal computePay() {
        return baseSalary.add(teamBonus);   // reuses baseSalary from Employee, adds its own rule
    }
    // printPayslip is inherited as-is — not retyped anywhere
}
```

`Manager` now gets `name`, `baseSalary`, and `printPayslip()` for free, and only overrides the one method that's genuinely different: `computePay()`. Fix a bug in `printPayslip` once, in `Employee`, and every subclass picks up the fix automatically.

A few mechanical details worth knowing cold:

- Java supports **single inheritance** for classes — `extends` names exactly one parent, never more than one. When a class genuinely needs to honor several unrelated contracts at once, that's what interfaces are for (section 5).
- `super` refers to the parent. `super.computePay()` inside `Manager` calls `Employee`'s version directly — useful when you want to *add to* the parent's behavior rather than fully replace it, instead of retyping the parent's logic.
- The parent's constructor always runs before the child's. If `Manager`'s constructor doesn't explicitly call `super(...)`, Java inserts a no-argument `super()` call automatically, before anything else in the child constructor runs.
- Fields and methods marked `protected` (like `name` and `baseSalary` above) are visible to subclasses even outside the parent's package, unlike `private`, which no subclass can see at all.

## 4. Polymorphism — One Interface, Many Real Implementations

### The problem inheritance alone doesn't solve: branching on type

Inheritance stops duplicated code between `Employee` and `Manager`. It does not, by itself, stop a different problem: code that has to ask "what kind of thing is this?" before it can act. Say your checkout flow supports several payment methods:

```java
void checkout(String paymentType, BigDecimal amount) {
    if (paymentType.equals("CREDIT_CARD")) {
        // call card network
    } else if (paymentType.equals("UPI")) {          // UPI = Unified Payments Interface
        // call UPI gateway
    } else if (paymentType.equals("PAYPAL")) {
        // call PayPal API
    }
    // adding CryptoPayment means coming back here and adding another else-if branch
}
```

This is fragile in a very specific way: every single place in the codebase that needs to act differently per payment type has to repeat some version of this same `if`/`else if` chain. Add a `CryptoPayment` method, and you have to hunt down every one of those chains and add a new branch to each — miss one, and that spot silently keeps treating crypto payments wrong (or throws, if there's a fallback `else`).

**This is exactly what runtime polymorphism answers: calling code depends on one shared interface, and the correct behavior is chosen automatically based on the real object at runtime — no branching required.**

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
    method.charge(amount);   // the actual charge() that runs depends on the real object at runtime
}
```

`checkout` never contains `instanceof CreditCardPayment` anywhere. The JVM (Java Virtual Machine) resolves `charge()` to whichever class's version actually matches the object passed in, at the moment the call happens. Adding `CryptoPayment implements PaymentMethod` next month means `checkout` needs zero changes — the new class simply becomes another valid argument. This is the specific real-world case runtime polymorphism exists for: replacing a branch-on-type chain, repeated in N places, with dynamic dispatch, defined once.

This flavor of polymorphism — the same method name, `charge`, doing something different depending on which class actually implements it — is called **overriding**, and it only works because `CreditCardPayment`, `UpiPayment`, and `PaypalPayment` all sit underneath the same `PaymentMethod` type.

### A second, unrelated problem: the same operation, different inputs

Overriding solves "same method name, different classes." A completely different problem shows up within a *single* class. Say `PricingCalculator` needs to apply a discount, but sometimes callers want to cap how much discount can apply:

```java
class PricingCalculator {
    BigDecimal applyDiscount(BigDecimal price, BigDecimal percent) {
        return price.subtract(price.multiply(percent));
    }

    BigDecimal applyDiscountWithCap(BigDecimal price, BigDecimal percent, BigDecimal cap) {
        BigDecimal discount = price.multiply(percent);
        BigDecimal cappedDiscount = discount.min(cap);
        return price.subtract(cappedDiscount);
    }
}
```

`applyDiscount` and `applyDiscountWithCap` do conceptually the same thing — apply a discount to a price — but the second name exists only because Java doesn't let you define the method twice under the same name with different parameters... except it does:

```java
class PricingCalculator {
    BigDecimal applyDiscount(BigDecimal price, BigDecimal percent) {
        return price.subtract(price.multiply(percent));
    }

    BigDecimal applyDiscount(BigDecimal price, BigDecimal percent, BigDecimal cap) {
        BigDecimal discount = price.multiply(percent);
        BigDecimal cappedDiscount = discount.min(cap);
        return price.subtract(cappedDiscount);
    }
}
```

**This is overloading: the same method name reused for the same conceptual operation, distinguished by its parameters instead of by an invented name.** Which `applyDiscount` runs is decided at compile time, purely from the arguments you pass — call it with two `BigDecimal`s and the two-parameter version runs; add a third and the compiler picks the other one. Overloads must differ by parameter type, count, or order — return type alone is never enough for the compiler to tell them apart.

### Overriding vs. overloading, side by side

| | Overloading | Overriding |
|---|---|---|
| Same method name | Yes | Yes |
| Parameters | Must differ | Must be identical |
| Return type | Doesn't matter for resolution | Same, or a covariant (subclass) type |
| Where | Same class | Parent and child class |
| Requires inheritance? | No | Yes |
| Resolved | Compile time | Runtime |
| Access level | Any | Cannot be reduced in the override |

Two common traps worth knowing by name:

- A `static` method in a subclass with the same signature as the parent's `static` method is **method hiding**, not overriding. Static methods are resolved by the reference's *declared* type, not the object's actual runtime type — there's no dynamic dispatch involved, which is the entire point overriding exists for.
- A `final` method cannot be overridden at all — declaring it `final` is how you deliberately close off that extension point.

## 5. Abstraction — Hide the "How," Publish the "What"

Runtime polymorphism (section 4) already leans on abstraction without naming it yet — `checkout` depends on `PaymentMethod`, not on any concrete class. Here's the problem that makes abstraction worth naming on its own. Say a class sends notifications directly through SMTP (Simple Mail Transfer Protocol), with the email details spelled out inline everywhere it's needed:

```java
class SignupHandler {
    void notifyUser(String email, String message) {
        // open an SMTP connection, authenticate, format a MIME message, send it...
    }
}
```

Every place that needs to notify a user now has to know it's specifically SMTP. Switch to an SMS gateway, or add push notifications, and you're rewriting every caller that hard-coded "it's email" into its own logic.

**This is exactly what abstraction answers: publish what a piece of code does, and hide how it does it, so calling code only ever depends on the "what."**

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

Calling code depends only on `NotificationSender.send(...)`. It never needs to know whether that's SMTP, an SMS gateway, or a push notification service underneath — the actual point of abstraction is that the caller's code doesn't change when the implementation does.

### Abstract class vs. interface

An interface alone starts to strain once several implementations share real logic, not just a shared method name. Say every `NotificationSender` needs the exact same logging and retry bookkeeping before it actually sends:

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

An interface can't hold that shared `send`/`log` implementation for you — every implementing class would have to repeat it. An **abstract class** can, because unlike an interface, it's allowed to mix fully-implemented methods with ones it deliberately leaves unfinished (`doSend`) for a subclass to fill in.

| | Interface | Abstract class |
|---|---|---|
| Methods | Abstract by default (also allows `default`/`static`) | Mix of abstract and fully implemented methods |
| Fields | Implicitly `public static final` (constants only) | Any field, any modifier |
| Constructor | Not allowed | Allowed |
| Inheritance | A class can `implements` many | A class can `extends` only one |
| Use it when | You need a pure contract, or multiple unrelated classes must honor it | Several related classes share real, non-trivial logic |

The real decision rule: reach for an interface when you're defining a *capability* (`PaymentMethod`, `NotificationSender`) that unrelated classes might implement completely differently. Reach for an abstract class when several implementations share enough actual code — not just a signature — that duplicating it would become a maintenance problem, like the shared `log()` call above.

## 6. Nested, Inner, and Anonymous Classes

Everything so far assumed a class deserves to stand entirely on its own, as a top-level type. Sometimes that's overkill. Say `OrderProcessor` needs a small class purely to describe its own result, and a one-off comparator purely to sort order lines inside one method:

```java
class ProcessingResult {
    final boolean success;
    ProcessingResult(boolean success) { this.success = success; }
}
// ...as a top-level class, ProcessingResult now sits in the package namespace
// as if it were a general-purpose type, even though nothing outside
// OrderProcessor has any real reason to construct one.
```

Making `ProcessingResult` a full top-level class works, mechanically, but it advertises it as a general-purpose type to the whole package when really it only ever means anything in the context of `OrderProcessor`. And a comparator you need exactly once, inside exactly one method, doesn't obviously deserve a name and a file of its own either.

**This is exactly what nested, inner, local, and anonymous classes answer: let a class live scoped inside the class (or method) that actually uses it, at the level of visibility that actually fits.** Four flavors show up in real code and in interviews:

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
            System.out.println(orderProcessorName + ": " + message);   // reaches into the outer instance
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

The practical distinction: a **static nested class** behaves like an ordinary class that simply happens to be namespaced inside another one — `OrderProcessor.ProcessingResult` — with no need for an enclosing instance to exist at all (a real-world equivalent: a `Builder` nested inside the class it builds — see [Design Patterns in Core Java](11-Design-Patterns-Core-Java.md)). An **inner class** holds an implicit reference to the specific outer instance that created it — `AuditLogger` can read `orderProcessorName` directly because of that reference — which is powerful but means it can't outlive or exist independently of that instance. **Local** and **anonymous** classes matter mostly for short-lived, single-use logic scoped to one method; in modern Java, a lambda usually replaces what an anonymous class used to do for a single-method interface like `Comparator` (see the [Java 8 guide](09-Java8-Lambda-Stream-Optional.md)).

## Interview Questions and Answers

### 1. What are the four pillars of OOP, and can you give a one-line reason for each?

**Answer:** Encapsulation protects an object's invariants by controlling how its state can change. Inheritance lets a class reuse and extend another class's behavior through an IS-A relationship, instead of copy-pasting fields and methods. Polymorphism lets calling code work against a common interface while the actual behavior varies by the real runtime type, replacing branch-on-type logic. Abstraction publishes what something does while hiding how it does it, so the caller's code doesn't change when the implementation does.

### 2. Why is "private fields + generated getters and setters" not automatically good encapsulation?

**Answer:** Encapsulation's job is protecting an invariant, not just adding a method call in front of a field. A setter that assigns any value with no validation offers the exact same lack of safety as a public field would. Real encapsulation, like `BankAccount.withdraw()` rejecting a withdrawal that would overdraw the account, validates before it mutates state — that's what actually makes it encapsulated, not the presence of `private`.

**Follow-up:** Can a class be fully encapsulated with a public getter and no setter at all? Yes — as long as nothing lets an outside caller push the object into an invalid state, hiding a field isn't even required for encapsulation to hold.

### 3. Why does copy-pasting fields and methods between `Employee` and `Manager` become a real problem, and how does inheritance fix it?

**Answer:** Duplicated logic (like `printPayslip()`) has to be fixed in every copy when a bug shows up, and every new employee type multiplies the copies. Inheritance lets `Manager extends Employee`, reusing `Employee`'s fields and methods and overriding only `computePay()`, the one part that's genuinely different — a fix to the shared logic in `Employee` now applies to every subclass automatically.

### 4. Give a real example of runtime polymorphism, and explain why it's useful.

**Answer:** A `checkout(PaymentMethod method, BigDecimal amount)` method that calls `method.charge(amount)` without knowing whether `method` is a credit card, UPI (Unified Payments Interface), or PayPal implementation. The JVM resolves `charge()` to the correct override based on the object's actual type at runtime. It's useful because it replaces an `if`/`else if` chain that would otherwise have to be repeated everywhere payment-type branching happens — adding a brand-new payment type means writing one new class, touching zero existing call sites.

### 5. How is method overloading resolved differently from method overriding?

**Answer:** Overloading is resolved at compile time, based on the declared types of the arguments you pass and which overload's parameter list matches. Overriding is resolved at runtime, based on the actual object's real class, regardless of the reference type used to call it.

### 6. When would you choose an abstract class over an interface?

**Answer:** When multiple related implementations share real, non-trivial logic — not just a method signature — that would otherwise be duplicated in every implementation, like the shared logging code in `BaseNotificationSender`. An interface fits better when you're defining a pure capability that unrelated classes need to honor, especially if a class needs to satisfy more than one such contract at once.

### 7. Why can't a class extend two other classes but can implement multiple interfaces?

**Answer:** Java deliberately disallows multiple class inheritance to avoid the "diamond problem" — ambiguity when two parent classes define conflicting behavior for the same inherited method. Interfaces avoid that ambiguity because, historically, they carried no implementation at all; even with `default` methods today, Java forces you to explicitly resolve a conflict if two interfaces provide clashing defaults.

### 8. What's the practical difference between a static nested class and an inner (non-static) class?

**Answer:** A static nested class behaves like an ordinary class that's simply namespaced inside another — it needs no enclosing instance to exist. An inner class holds an implicit reference to the specific outer instance that created it, can access that instance's fields directly, and cannot exist independently of it.

### 9. Why is a `static` method in a subclass with the same signature as a parent's `static` method not "overriding"?

**Answer:** It's method hiding, not overriding. Static methods are resolved by the reference's declared (compile-time) type, not the object's actual runtime type, so there's no dynamic dispatch involved — the opposite of what overriding means.

**Follow-up:** What happens to a `final` method in a subclass? It can't be redeclared at all — `final` exists specifically to close off that extension point.

## Revision Checklist

- [ ] Explain why loose parallel arrays for order data break down, and how bundling data and behavior into a class fixes it.
- [ ] Explain the four pillars with a real order/payment/payroll example for each, not `Animal`/`Dog`.
- [ ] Build a `BankAccount`-style class that protects an invariant, not just wraps a field — and explain why a blind getter/setter pair wouldn't.
- [ ] Show the duplicated-code problem between `Employee` and `Manager` before writing `extends`, and explain `super` and constructor-chaining order.
- [ ] Show a branch-on-type `if`/`else if` chain before introducing runtime polymorphism, and explain why `checkout(PaymentMethod, ...)` never needs to change for a new payment type.
- [ ] Explain overloading vs overriding side by side, including the static-method-hiding trap and why `final` blocks overriding.
- [ ] Decide between an interface and an abstract class for a given real scenario and justify it.
- [ ] Explain the difference between static nested, inner, local, and anonymous classes, and when a lambda replaces an anonymous class.
