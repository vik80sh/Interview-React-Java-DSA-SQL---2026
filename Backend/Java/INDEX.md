# Java Interview Roadmap

This folder is a learning path, not a trivia list. Every example ties back to a real backend scenario (an order, a payment, a user, a cache) so you can explain each topic in an interview the way you'd actually explain a design decision at work, not recite a definition.

## Recommended Order

1. [JVM and Memory Architecture](01-JVM-Memory-Architecture.md)
2. [Variables, Data Types, and Type Casting](02-Variables-DataTypes-Casting.md)
3. [Object-Oriented Programming](03-OOP-Fundamentals.md)
4. [Constructors, equals()/hashCode(), and final/finally/finalize](04-Constructors-Equals-HashCode-Keywords.md)
5. [String Handling](05-String-Handling.md)
6. [Collections Framework](06-Collections-Framework.md)
7. [Exception Handling](07-Exception-Handling.md)
8. [Multithreading and Concurrency (Core Java)](08-Multithreading-Concurrency.md)
9. [Java 8: Lambdas, Streams, and Optional](09-Java8-Lambda-Stream-Optional.md)
10. [Generics, Enums, and Modern Java Features](10-Generics-Enums-Modern-Java.md)
11. [Design Patterns in Core Java](11-Design-Patterns-Core-Java.md)
12. [SOLID Principles](12-SOLID-Principles.md)
13. [Serialization, Cloning, Reflection, and Annotations](13-Serialization-Cloning-Reflection-Annotations.md)

This folder covers core Java. Once you're through it, the [Backend folder](../Backend/INDEX.md) covers Spring Boot, REST, JPA, security, testing, concurrency in a Spring context, and reliability patterns — several files there (JVM memory, concurrency, design patterns) are cross-linked from here because the same mechanics show up at both layers.

## What Mastery Looks Like

### Explain

- You can describe a mechanism using a real example (an `Order`, a `PaymentMethod`, a cache) instead of `Animal`/`Dog`.
- You can answer a definition question in 30 seconds and then explain the trade-off or the trap that usually follows it.

### Implement

- You can write the small example from a section without looking, and predict its output.
- You can spot the classic trap in each topic (the `Integer` cache, `ConcurrentModificationException`, a race condition, a memory leak) in a code snippet, not just describe it abstractly.

### Diagnose

- You can explain what actually breaks in production for a given misuse — a growing static cache, an un-synchronized counter under load, a `HashSet` with a bad `equals()`/`hashCode()` pair.
- You can connect a core-Java mechanism to the Spring-level concept it underpins — proxies and AOP, `Repository<T, ID>` and Spring Data, immutable records and DTOs.

## Interview Answer Template

When asked to explain a core Java concept, structure the answer like this:

1. **Definition in one or two sentences.**
2. **A real example** — not a toy one — showing it in a scenario you'd actually build.
3. **The trap or edge case** interviewers actually probe for (the `Integer` cache, the mutable hash-key bug, the `volatile`-doesn't-fix-`count++` trap).
4. **The trade-off or alternative** — why this approach over another one, and when you'd choose differently.

## Final Readiness Checklist

- [ ] Explain the JVM's memory areas and trace a real request through heap, stack, and Metaspace.
- [ ] Explain the four pillars of OOP with a real payment/order example for each.
- [ ] Implement `equals()`/`hashCode()` correctly together, and explain the contract.
- [ ] Explain the String Pool, `==` vs `.equals()`, and the compile-time vs runtime concatenation trap.
- [ ] Pick the right collection for a stated real scenario, and explain `HashMap` internals.
- [ ] Design a small exception hierarchy and use `try`-with-resources correctly.
- [ ] Reproduce and fix a race condition, and explain a deadlock and its prevention.
- [ ] Build a real stream pipeline with `Collectors`, and explain what `Optional` actually solves.
- [ ] Apply PECS correctly, and explain what a `record` generates for you.
- [ ] Implement Singleton, Builder, and Factory from memory with a real use case for each.
- [ ] Identify a SOLID violation in a code snippet and name which principle it breaks.
- [ ] Explain the `Cloneable` shallow-copy trap, and why reflection-plus-annotations powers frameworks like Spring and Jackson.

## How to Study Each File

1. Read one section.
2. Close the guide and explain it out loud, using the file's real-world example, not the abstract definition.
3. Predict the output of the code example before running it.
4. Answer that section's interview questions, including the follow-up reasoning, not just the one-line answer.
5. Note anything you couldn't explain cleanly, and revisit that section before moving on.
