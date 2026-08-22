# SOLID Principles (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](../Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

**SOLID** isn't a class you'll ever write or something the compiler checks — it's an acronym for five separate design principles, each named after the specific maintenance pain it prevents: **S**ingle Responsibility, **O**pen/Closed, **L**iskov Substitution, **I**nterface Segregation, and **D**ependency Inversion. None of the five mean anything as a definition to memorize; each one only clicks once you've seen the concrete bug or maintenance headache it's protecting against. So instead of five definitions, what follows is five small pieces of a realistic order/payment system, each with a real problem first, walked through until the fix earns a name — because that's how these actually get asked in interviews too: "here's some code, what's wrong with it, how would you fix it."

## 1. Single Responsibility Principle

**Scenario:** you're asked to change the email template on the "order placed" notification — a one-line wording tweak. You make the change, run the app, and somehow order-saving is now broken too. How does changing an email template break something about saving an order to the database? Because both live in the exact same class, sharing the same file, the same review, the same deploy:

```java
// One class doing persistence, notification, AND invoice generation.
// A change to the invoice PDF layout risks breaking order-saving logic in the same class,
// and a change to the email wording risks breaking both of the others — nothing here is isolated.
class OrderService {
    void placeOrder(Order order) {
        repository.save(order);
        emailClient.send(order.getCustomerEmail(), "Order placed");
        pdfGenerator.generateInvoice(order);
    }
}
```

Three unrelated jobs are bundled into one class: saving data, sending notifications, generating documents. Any one of them changing for its own reasons — a new email provider, a new invoice layout, a new database column — means editing this same class and re-testing all three concerns, even though only one of them actually changed. That's the real cost: it's not that the code is wrong today, it's that every future change here carries the risk of breaking two unrelated things it never needed to touch.

This is exactly what the **Single Responsibility Principle (SRP)** answers: **a class should have one reason to change.** "Responsibility" here means "a reason to change," not "a method" — a class can have several methods and still satisfy SRP, as long as all of them serve the one job the class exists for. The fix is to split by reason-to-change, not by line count:

```java
// Three classes, three separate reasons to change.
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

`OrderService` now changes only when order-placement *logic* itself changes. A new email template no longer risks touching order-saving code, and each of the three classes is independently testable without mocking the other two concerns just to test one.

## 2. Open/Closed Principle

**Scenario:** the business adds a new payment method — UPI (India's Unified Payments Interface) — a few months after launch, and then PayPal a few months after that. Every single time, someone has to open this method, add another `else if`, and re-test the *entire* method, including the branches that had nothing to do with the new payment type:

```java
// Every new payment method means editing this method and re-testing all of it.
BigDecimal charge(String paymentType, BigDecimal amount) {
    if (paymentType.equals("CREDIT_CARD")) { return chargeCreditCard(amount); }
    else if (paymentType.equals("UPI")) { return chargeUpi(amount); }
    // adding PAYPAL means modifying this method again, right alongside the two branches
    // that were already written, reviewed, and working
    throw new IllegalArgumentException("Unknown payment type");
}
```

The problem isn't that this code is broken — it runs fine today. The problem is that adding behavior number four always means editing, recompiling, and re-testing behaviors one through three, which is exactly where regressions in already-working code sneak in.

This is exactly what the **Open/Closed Principle (OCP)** answers: a class (or method) should be **open for extension, but closed for modification** — you should be able to add new behavior without editing existing, already-tested code at all. In practice, polymorphism is almost always the mechanism used to satisfy this:

```java
// Adding CryptoPayment later means writing ONE new class — checkout() below never changes.
interface PaymentMethod {
    void charge(BigDecimal amount);
}

void checkout(PaymentMethod method, BigDecimal amount) {
    method.charge(amount);
}
```

This is the same `PaymentMethod` idea covered as runtime polymorphism in the [OOP guide](03-OOP-Fundamentals.md#4-polymorphism--one-interface-many-real-implementations) — `checkout()` calls an interface method and never needs to know or care which concrete class it's actually holding. Adding `CryptoPayment` means writing one new class that implements `PaymentMethod`; `checkout()`'s source code — already written, already tested — never changes. That's the whole principle in one line: extension happens by adding new code, not by editing old code.

## 3. Liskov Substitution Principle

The JDK itself has a famous, real example of what happens when this gets violated:

```java
List<String> names = Collections.unmodifiableList(new ArrayList<>(List.of("a", "b")));
names.add("c"); // compiles fine — List declares add() — but throws UnsupportedOperationException at runtime
```

**Scenario:** you write a method that takes a `List<String>` parameter and calls `.add(...)` on it, because that's a documented, normal thing any `List` supports. It works in every test you write — until someone passes in the result of `Collections.unmodifiableList(...)`, and your method blows up at runtime with `UnsupportedOperationException`, even though the compiler never complained. `Collections.unmodifiableList(...)` returns something that IS-A `List`, and the `List` interface's contract *promises* `add()` works — but this particular implementation silently breaks that promise the moment you call it.

This is exactly what the **Liskov Substitution Principle (LSP)** — named after computer scientist Barbara Liskov — answers: **a subtype must be usable anywhere its supertype is expected, without surprising the caller.** It's not enough for a subclass to compile against the parent's method signatures; it has to actually honor the behavior the parent promised. A backend-shaped version of the same mistake:

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

Any code written against `ShippingRule` trusts that calling `calculateCost(order)` returns a cost — that's the whole point of depending on the parent type instead of checking for every concrete subclass by hand. `InStorePickupRule` breaks that trust the instant it's substituted in.

The fix is usually to recognize that the subtype doesn't actually belong in that hierarchy at all — `InStorePickupRule` isn't really a `ShippingRule`; it's a *different case* the calling code needs to handle explicitly. That could mean changing the return type to `Optional<BigDecimal> calculateCost(Order order)`, returning empty for rules where "cost" isn't meaningful, or pulling shipping and pickup apart into a separate `FulfillmentMethod` abstraction that doesn't assume every implementation has a cost at all. Either way, the signal is the same one as the JDK example: a subtype that technically compiles against the parent's interface but silently narrows or breaks what the parent promised.

## 4. Interface Segregation Principle

**Scenario:** you're asked to build a reporting screen that only ever reads orders — it never creates, updates, or deletes anything. The obvious-looking interface to implement already exists in the codebase:

```java
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

Because Java requires implementing every method an interface declares, `ReportingOrderReader` is forced to write bodies for `save()` and `deleteById()` even though it will never call either — the only honest thing to put in them is a thrown exception. Now anyone reading this class has to wonder whether those methods are actually reachable, and anyone calling `OrderRepository` generically has no compile-time way to know which implementations will blow up on `save()`.

This is exactly what the **Interface Segregation Principle (ISP)** answers: **don't force a class to implement methods it has no use for.** The fix is to split the fat interface into smaller ones grouped by what actually gets used together:

```java
// Segregated by capability, so a class only implements what it actually does.
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

The two `throw new UnsupportedOperationException()` overrides in the "before" version are the actual tell to watch for in real code — any time you're implementing an interface method purely to throw or no-op it, that interface is bundling capabilities that don't all belong together, and it needs to be split so each implementer only takes on what it genuinely supports.

## 5. Dependency Inversion Principle

**Scenario:** `OrderService` needs to send a notification when an order is placed, so it just creates the concrete sender it needs, right there in the class:

```java
// OrderService is hard-wired to one concrete email implementation.
class OrderService {
    private final SmtpEmailSender emailSender = new SmtpEmailSender(); // concrete, hardcoded
}
```

This looks harmless until the business asks for SMS notifications alongside email, or until you try to unit-test `OrderService` and discover you can't — testing it also means testing whatever `SmtpEmailSender` really does, real network calls and all, because there's no way to swap in a fake. `OrderService` (the high-level piece that decides *when* to notify) is welded directly to `SmtpEmailSender` (the low-level piece that decides *how*), and any change to the low-level detail risks rippling into the high-level class, or vice versa.

This is exactly what the **Dependency Inversion Principle (DIP)** answers: **depend on abstractions, not concrete implementations — and let something else decide which concrete implementation to use.**

```java
// OrderService depends on an abstraction; something else decides the real implementation.
class OrderService {
    private final NotificationSender notificationSender; // the interface from the OOP guide

    OrderService(NotificationSender notificationSender) { // supplied from outside — DIP in one line
        this.notificationSender = notificationSender;
    }
}
```

Now `OrderService` only knows about the `NotificationSender` interface — it has no idea whether it's actually talking to email, SMS, or a fake used in a test, and it doesn't need to. Something outside the class decides which concrete implementation to hand in.

If that constructor-parameter pattern looks familiar, it should — it's the exact plain-Java technique the [Spring Boot Fundamentals guide](../Springboot/01-Spring-Boot-Fundamentals.md) walks through with `Car` and `Engine`: a class declares what it needs through its constructor instead of building it with `new`, and something else supplies the real object. That technique is called Dependency Injection, and none of it requires a framework — you can write `new OrderService(new SmtpEmailSender())` yourself, in plain Java, and you've already satisfied DIP. Spring's container is just a piece of machinery that automates doing this everywhere across a whole application instead of by hand for each class. **Dependency Injection is the technique; Dependency Inversion is the design principle it's used to satisfy** — they're related, but not the same word for the same thing, and mixing them up is itself a common interview clarification question.

## Interview Questions and Answers

### 1. What does each letter in SOLID actually stand for?

**Answer:** Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. All five are separate design principles bundled under one acronym for convenience — they aren't steps of one process, and a class can satisfy some while violating others.

### 2. What's the actual test for whether a class violates Single Responsibility?

**Answer:** Ask "what would force this class to change?" — if there are multiple unrelated answers (a notification template changes, or the persistence schema changes, or the invoice layout changes), the class has multiple responsibilities bundled together and should be split so each piece changes independently of the others.

### 3. How does polymorphism relate to the Open/Closed Principle?

**Answer:** Polymorphism is usually the mechanism that satisfies OCP in practice — a method that accepts an interface (like `PaymentMethod`) and calls its abstract method never needs to change when a new implementation is added; you extend behavior by writing a new class, not by editing the existing, already-tested method.

### 4. What makes `Collections.unmodifiableList()` a real, famous LSP violation?

**Answer:** It returns an object that IS-A `List`, which contractually promises `add()`/`remove()` work — but calling those methods throws `UnsupportedOperationException` at runtime instead. Code written generically against the `List` interface, trusting its documented contract, can be broken simply by being handed this particular implementation.

**Follow-up:** How do you fix a genuine LSP violation like `InStorePickupRule` throwing inside `calculateCost()`? Recognize the subtype doesn't actually belong in that hierarchy — either change the method to return something like `Optional<BigDecimal>` so "not applicable" is an expected outcome, or split the hierarchy so the non-conforming case lives in its own abstraction instead of pretending to be a `ShippingRule`.

### 5. How do you recognize an Interface Segregation violation in real code?

**Answer:** A class implementing an interface method just to throw `UnsupportedOperationException` or leave it empty is the clearest signal — it means the interface bundles capabilities that don't all belong together, and should be split so each implementer only takes on the methods it actually supports.

### 6. What's the difference between Dependency Inversion and Dependency Injection?

**Answer:** Dependency Inversion is the design principle: high-level code should depend on abstractions, and something external should decide which concrete implementation satisfies them. Dependency Injection is one specific technique for achieving that — supplying the concrete implementation from outside (constructor, setter, or a framework like Spring) instead of the class constructing it itself.

**Follow-up:** Does applying DIP require Spring or any framework? No — the constructor-parameter version of `OrderService` above satisfies DIP in plain Java with no framework involved. A framework like Spring just automates supplying those constructor arguments across an entire application instead of someone wiring `new OrderService(new SmtpEmailSender())` by hand everywhere.

### 7. Can you violate SOLID and still ship working code? Why does it matter anyway?

**Answer:** Yes — SOLID violations are almost never compile errors or immediate bugs; the code runs fine on day one. The cost shows up later, as change friction: a class with five responsibilities means five different reasons someone might need to touch (and risk breaking) it, and a hardcoded dependency means you can't swap implementations for testing or for a new requirement without editing code that already works.

## Revision Checklist

- [ ] Say what each letter in SOLID stands for, and that it's five independent principles, not one sequential process.
- [ ] Identify a Single Responsibility violation by asking "what would force this class to change?"
- [ ] Explain how polymorphism satisfies Open/Closed with the `PaymentMethod` example.
- [ ] Explain the `Collections.unmodifiableList()` LSP violation and how to recognize the same shape in your own code, plus how to fix a violation like `InStorePickupRule`.
- [ ] Spot an Interface Segregation violation via forced `UnsupportedOperationException` overrides.
- [ ] Explain Dependency Inversion vs Dependency Injection, and connect DIP to the plain-Java `Car`/`Engine` pattern and Spring's constructor injection.
- [ ] Explain why none of the SOLID principles show up as compiler errors, and what kind of cost they actually prevent.
