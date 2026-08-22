# SOLID Principles

SOLID isn't five separate rules to memorize — it's five answers to "why did this design get hard to change?" Every example below is a realistic before/after on a small piece of an order/payment system, because that's how these actually get asked: "here's some code, what's wrong with it, how would you fix it."

## S — Single Responsibility Principle

**A class should have one reason to change.**

```java
// Before: one class doing persistence, notification, AND invoice generation.
// A change to the invoice PDF layout risks breaking order-saving logic in the same class.
class OrderService {
    void placeOrder(Order order) {
        repository.save(order);
        emailClient.send(order.getCustomerEmail(), "Order placed");
        pdfGenerator.generateInvoice(order);
    }
}
```

```java
// After: three classes, three separate reasons to change.
class OrderService {
    private final OrderRepository repository;
    private final NotificationService notifications;
    private final InvoiceGenerator invoices;

    void placeOrder(Order order) {
        repository.save(order);
        notifications.notifyOrderPlaced(order);
        invoices.generate(order);
    }
}
```

`OrderService` now changes only when order-placement *logic* changes. A new email template no longer risks touching order-saving code, and each class is independently testable without mocking the other two concerns.

## O — Open/Closed Principle

**Open for extension, closed for modification** — you should be able to add new behavior without editing existing, already-tested code.

```java
// Violates OCP: every new payment method means editing this method and re-testing all of it.
BigDecimal charge(String paymentType, BigDecimal amount) {
    if (paymentType.equals("CREDIT_CARD")) { return chargeCreditCard(amount); }
    else if (paymentType.equals("UPI")) { return chargeUpi(amount); }
    // adding PAYPAL means modifying this method again
    throw new IllegalArgumentException("Unknown payment type");
}
```

```java
// Follows OCP: the exact PaymentMethod polymorphism example from the OOP guide.
interface PaymentMethod {
    void charge(BigDecimal amount);
}
// Adding CryptoPayment later means writing ONE new class — checkout() below never changes.
void checkout(PaymentMethod method, BigDecimal amount) {
    method.charge(amount);
}
```

This is the same `PaymentMethod` example from the [OOP guide](03-OOP-Fundamentals.md#4-polymorphism--one-interface-many-real-implementations) — polymorphism is usually the actual mechanism behind satisfying OCP.

## L — Liskov Substitution Principle

**A subtype must be usable anywhere its supertype is expected, without surprising the caller.**

The JDK itself has a famous, real example that (deliberately, controversially) breaks this:

```java
List<String> names = Collections.unmodifiableList(new ArrayList<>(List.of("a", "b")));
names.add("c"); // compiles fine — List declares add() — but throws UnsupportedOperationException at runtime
```

`Collections.unmodifiableList(...)` returns something that IS-A `List` and therefore *promises* `add()` works, per the `List` interface contract — but calling it blows up at runtime. Any code written against the general `List` contract that assumes `add()` behaves as documented can be broken by receiving this particular implementation. This is exactly what an LSP violation looks like in practice: a subtype that technically compiles against the parent's interface but silently narrows what actually works, surprising callers who trusted the parent contract.

A backend-shaped version of the same mistake:

```java
class ShippingRule {
    BigDecimal calculateCost(Order order) { return standardRate(order); }
}

class InStorePickupRule extends ShippingRule {
    @Override
    BigDecimal calculateCost(Order order) {
        throw new UnsupportedOperationException("No shipping cost for in-store pickup");
        // any code that loops over a List<ShippingRule> calling calculateCost() on each now
        // crashes the moment an InStorePickupRule is in the list — a real LSP violation
    }
}
```

The fix is usually to recognize the subtype doesn't actually belong in that hierarchy — `InStorePickupRule` isn't really a `ShippingRule` at all; it's a *different case* the calling code should handle explicitly (e.g. a `Optional<BigDecimal> calculateCost(Order order)` returning empty for non-applicable rules, or a separate `FulfillmentMethod` abstraction that doesn't assume "cost" is always meaningful).

## I — Interface Segregation Principle

**Don't force a class to implement methods it has no use for.**

```java
// Violates ISP: a read-only reporting client is forced to implement write methods it will never use.
interface OrderRepository {
    Order findById(Long id);
    List<Order> findAll();
    void save(Order order);
    void deleteById(Long id);
}

class ReportingOrderReader implements OrderRepository {
    public Order findById(Long id) { ... }
    public List<Order> findAll() { ... }
    public void save(Order order) { throw new UnsupportedOperationException(); } // dead code, forced
    public void deleteById(Long id) { throw new UnsupportedOperationException(); } // dead code, forced
}
```

```java
// Follows ISP: segregated by capability, so a class only implements what it actually does.
interface OrderReader {
    Order findById(Long id);
    List<Order> findAll();
}

interface OrderWriter {
    void save(Order order);
    void deleteById(Long id);
}

class ReportingOrderReader implements OrderReader { /* only the two read methods, no dead throw-code */ }
```

The two `throw new UnsupportedOperationException()` overrides in the "before" version are the tell — any time you're implementing an interface method just to throw or no-op it, the interface is doing too much and needs to be split.

## D — Dependency Inversion Principle

**Depend on abstractions, not concrete implementations — and let something else decide which concrete implementation to use.**

```java
// Violates DIP: OrderService is hard-wired to one concrete email implementation.
class OrderService {
    private final SmtpEmailSender emailSender = new SmtpEmailSender(); // concrete, hardcoded
}
```

```java
// Follows DIP: OrderService depends on an abstraction; something else decides the real implementation.
class OrderService {
    private final NotificationSender notificationSender; // the interface from the OOP guide

    OrderService(NotificationSender notificationSender) { // supplied from outside — DIP in one line
        this.notificationSender = notificationSender;
    }
}
```

This is the exact principle behind constructor injection in the [Spring Boot Fundamentals guide](../Backend/01-Spring-Boot-Fundamentals.md#1-the-mental-model) — Spring's entire IoC container exists to apply Dependency Inversion automatically across a whole application: high-level code (`OrderService`) depends only on an interface, and a separate mechanism (Spring's container, or here, whoever calls `new OrderService(...)`) decides which concrete class satisfies it. "Dependency Injection" is the *technique*; "Dependency Inversion" is the *design principle* it's used to satisfy — they're related but not the same word for the same thing, which is itself a common interview clarification question.

## Interview Questions and Answers

### 1. What's the actual test for whether a class violates Single Responsibility?

**Answer:** Ask "what would force this class to change?" — if there are multiple unrelated answers (a notification template changes, or the persistence schema changes, or the invoice layout changes), the class has multiple responsibilities bundled together and should be split so each piece changes independently of the others.

### 2. How does polymorphism relate to the Open/Closed Principle?

**Answer:** Polymorphism is usually the mechanism that satisfies OCP in practice — a method that accepts an interface (like `PaymentMethod`) and calls its abstract method never needs to change when a new implementation is added; you extend behavior by writing a new class, not by editing the existing, already-tested method.

### 3. What makes `Collections.unmodifiableList()` a real, famous LSP violation?

**Answer:** It returns an object that IS-A `List`, which contractually promises `add()`/`remove()` work — but calling those methods throws `UnsupportedOperationException` at runtime instead. Code written generically against the `List` interface, trusting its documented contract, can be broken simply by being handed this particular implementation.

### 4. How do you recognize an Interface Segregation violation in real code?

**Answer:** A class implementing an interface method just to throw `UnsupportedOperationException` or leave it empty is the clearest signal — it means the interface bundles capabilities that don't all belong together, and should be split so each implementer only takes on the methods it actually supports.

### 5. What's the difference between Dependency Inversion and Dependency Injection?

**Answer:** Dependency Inversion is the design principle: high-level code should depend on abstractions, and something external should decide which concrete implementation satisfies them. Dependency Injection is one specific technique for achieving that — supplying the concrete implementation from outside (constructor, setter, or a framework like Spring) instead of the class constructing it itself.

### 6. Can you violate SOLID and still ship working code? Why does it matter anyway?

**Answer:** Yes — SOLID violations are almost never compile errors or immediate bugs; the code runs fine on day one. The cost shows up later, as change friction: a class with five responsibilities means five different reasons someone might need to touch (and risk breaking) it, and a hardcoded dependency means you can't swap implementations for testing or for a new requirement without editing code that already works.

## Revision Checklist

- [ ] Identify a Single Responsibility violation by asking "what would force this class to change?"
- [ ] Explain how polymorphism satisfies Open/Closed with the `PaymentMethod` example.
- [ ] Explain the `Collections.unmodifiableList()` LSP violation and how to recognize the same shape in your own code.
- [ ] Spot an Interface Segregation violation via forced `UnsupportedOperationException` overrides.
- [ ] Explain Dependency Inversion vs Dependency Injection, and connect DIP to Spring's constructor injection.
