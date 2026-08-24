# Master Question Bank — Spring Boot Interview Prep

This file aggregates every interview question and its full answer from every file in this folder ([Backend/Springboot](.)), in one place, so you can review the entire question set without opening each file individually. Each entry reproduces the question and its complete answer (and follow-up, where one exists) verbatim from its source file, and is followed by a link back to that exact heading in the original file for the surrounding explanation, code examples, and revision checklist that give it fuller context.

## [1. Spring Boot Fundamentals (Beginner-Friendly)](01-Spring-Boot-Fundamentals.md)

### 1. What's the difference between IoC and DI?

**Answer:** Simple way to remember it: DI is the "how" — a class doesn't build what it needs, it just asks for it, and something else hands it over. IoC is the "why" — instead of my code deciding when objects get created, that control moves to the Spring container. Spring uses DI to actually make IoC happen.

**Follow-up:** Why is constructor injection preferred over field injection? Three reasons, easy to rattle off: it makes every required dependency obvious right in the signature, so you can't forget one. It lets you mark the fields `final`, so nobody swaps them later. And it makes testing trivial — you just call `new` with mocks, no Spring container needed.

*Source: [01-Spring-Boot-Fundamentals.md#1-whats-the-difference-between-ioc-and-di](01-Spring-Boot-Fundamentals.md#1-whats-the-difference-between-ioc-and-di)*

### 2. How does Spring find and create a bean?

**Answer:** Think of it as three sources feeding one pipeline. Beans come from three places: component scanning picks up classes with stereotype annotations like `@Service`, `@Configuration` classes contribute `@Bean` methods, and auto-configuration quietly adds its own beans when conditions are met. Then for each one, Spring creates the object, figures out what its constructor needs, wires in matching beans, wraps it in a proxy if needed, and stores the finished bean in the application context.

*Source: [01-Spring-Boot-Fundamentals.md#2-how-does-spring-find-and-create-a-bean](01-Spring-Boot-Fundamentals.md#2-how-does-spring-find-and-create-a-bean)*

### 3. What's actually different between `@Component`, `@Service`, and `@Repository`?

**Answer:** Nothing, mechanically — that's the trick in this question. All three just register the class as a bean, full stop. The difference is only about signaling intent to the next reader: `@Service` says "business logic lives here," `@Repository` says "persistence code" and also switches on exception translation, and `@Component` is just the generic catch-all when neither label fits.

*Source: [01-Spring-Boot-Fundamentals.md#3-whats-actually-different-between-component-service-and-repository](01-Spring-Boot-Fundamentals.md#3-whats-actually-different-between-component-service-and-repository)*

### 4. When would you use `@Bean` instead of a stereotype annotation?

**Answer:** Simple rule: stereotype annotations only work on code you own. If it's a third-party class you can't annotate, or something that needs custom setup logic to build, write a `@Bean` factory method inside a `@Configuration` class instead.

*Source: [01-Spring-Boot-Fundamentals.md#4-when-would-you-use-bean-instead-of-a-stereotype-annotation](01-Spring-Boot-Fundamentals.md#4-when-would-you-use-bean-instead-of-a-stereotype-annotation)*

### 5. Are `@Service`/`@Component`/`@Repository` themselves dependency injection?

**Answer:** No — and this trips people up. Stereotype annotations only handle registration: they tell Spring "manage this class as a bean." That's the IoC side. DI is a separate step that happens later, at the constructor — Spring looks at the parameters and hands over a matching bean for each one. Here's the proof: swap `@Service` for `@Component` on any class, and its injection behavior doesn't change one bit. That's because the stereotype annotation was never the thing doing the injecting.

*Source: [01-Spring-Boot-Fundamentals.md#5-are-servicecomponentrepository-themselves-dependency-injection](01-Spring-Boot-Fundamentals.md#5-are-servicecomponentrepository-themselves-dependency-injection)*

### 6. Why might `@Transactional` appear to silently not work?

**Answer:** Two classic traps. First, `@Transactional` is built on a proxy, and calling the method from inside the same class — a self-invocation — skips that proxy completely, so nothing happens. Second, by default it only rolls back on unchecked exceptions; a checked exception won't trigger a rollback unless you explicitly add `rollbackFor`.

*Source: [01-Spring-Boot-Fundamentals.md#6-why-might-transactional-appear-to-silently-not-work](01-Spring-Boot-Fundamentals.md#6-why-might-transactional-appear-to-silently-not-work)*

### 7. What is Spring Boot auto-configuration, concretely?

**Answer:** Picture a set of configuration classes sitting on standby, each gated by a condition. Auto-configuration is just `@Configuration` classes that only activate when their condition is met — say, `@ConditionalOnClass` checks a library is on the classpath, and `@ConditionalOnMissingBean` checks you haven't already defined your own. When both are satisfied, it quietly creates a sensible default bean for you.

*Source: [01-Spring-Boot-Fundamentals.md#7-what-is-spring-boot-auto-configuration-concretely](01-Spring-Boot-Fundamentals.md#7-what-is-spring-boot-auto-configuration-concretely)*

### 8. Why should a controller return a DTO instead of the entity?

**Answer:** Returning the entity ties your API's shape directly to your database schema — change one, you risk breaking the other. It also risks accidentally exposing fields that were never meant to be public, and can blow up with lazy-loading errors when Hibernate tries to serialize a relationship outside a transaction. A DTO is the buffer that lets the API and the database evolve independently.

*Source: [01-Spring-Boot-Fundamentals.md#8-why-should-a-controller-return-a-dto-instead-of-the-entity](01-Spring-Boot-Fundamentals.md#8-why-should-a-controller-return-a-dto-instead-of-the-entity)*

### 9. What makes a singleton bean unsafe, and when?

**Answer:** Only in one specific case: when it stores mutable, request-specific data in an instance field. Since a singleton bean is shared by every request, two requests hitting that field at the same time will race on it. Rule of thumb: request data belongs in a local variable, never in a bean field.

*Source: [01-Spring-Boot-Fundamentals.md#9-what-makes-a-singleton-bean-unsafe-and-when](01-Spring-Boot-Fundamentals.md#9-what-makes-a-singleton-bean-unsafe-and-when)*

### 10. How would you debug a bean Spring says it can't find?

**Answer:** Work it like a checklist rather than guessing. Is the class actually inside component-scan's package boundary? Is a `@Profile` or `@Conditional` annotation quietly excluding it? Can its own constructor dependencies be satisfied? And if there are multiple candidates of the same type, do you need a `@Qualifier` to pick one? Before bolting on random annotations, just read the actual startup error and the condition evaluation report — it usually names the exact problem.

*Source: [01-Spring-Boot-Fundamentals.md#10-how-would-you-debug-a-bean-spring-says-it-cant-find](01-Spring-Boot-Fundamentals.md#10-how-would-you-debug-a-bean-spring-says-it-cant-find)*

### 11. Walk through the request flow in Spring MVC.

**Answer:** Walk it start to finish. Filters run first, at the servlet level. Then `DispatcherServlet` matches the request to a controller method. Argument resolvers assemble that method's parameters, the controller hands off to a service, and a message converter turns the result into JSON on the way out. And if anything throws along the way, `@RestControllerAdvice` can catch it in one central place instead of every controller handling its own errors.

*Source: [01-Spring-Boot-Fundamentals.md#11-walk-through-the-request-flow-in-spring-mvc](01-Spring-Boot-Fundamentals.md#11-walk-through-the-request-flow-in-spring-mvc)*

### 12. How does Spring handle a circular dependency, and how do you actually fix it?

**Answer:** With constructor injection, Spring just refuses to start — it fails fast with a `BeanCurrentlyInCreationException`. The real fix is to break the cycle: pull the shared behavior out into a third bean, or make the dependency go one direction only. You can slap `@Lazy` on it to get the app to boot, but that's a stopgap, not an actual fix to the design problem.

*Source: [01-Spring-Boot-Fundamentals.md#12-how-does-spring-handle-a-circular-dependency-and-how-do-you-actually-fix-it](01-Spring-Boot-Fundamentals.md#12-how-does-spring-handle-a-circular-dependency-and-how-do-you-actually-fix-it)*

### 13. Why can adding an unrelated `boolean` field to a `@Service` class break startup?

**Answer:** Here's the trap: if the class uses `@AllArgsConstructor`, every field becomes a constructor parameter — not just the `final` dependency fields, but that new plain `boolean` too. Spring tries to find a bean of type `boolean` to inject, finds none, and startup fails with `NoSuchBeanDefinitionException`. The error points at a "missing bean," but the real cause is the Lombok annotation. `@RequiredArgsConstructor` sidesteps this because it only pulls in `final` fields. One caveat worth remembering: this trap is specific to Spring beans — the same `@AllArgsConstructor` on a plain DTO or entity is totally harmless, since Spring never constructs those itself.

*Source: [01-Spring-Boot-Fundamentals.md#13-why-can-adding-an-unrelated-boolean-field-to-a-service-class-break-startup](01-Spring-Boot-Fundamentals.md#13-why-can-adding-an-unrelated-boolean-field-to-a-service-class-break-startup)*

### 14. What's the difference between `BeanFactory` and `ApplicationContext`?

**Answer:** `BeanFactory` is the bare-bones root container — it's lazy, so a bean isn't built until something actually asks for it. `ApplicationContext` builds on top of that and adds the things a real app needs: singletons created eagerly at startup, event publishing, internationalization, and AOP support. In practice, every real Spring app runs on an `ApplicationContext`.

*Source: [01-Spring-Boot-Fundamentals.md#14-whats-the-difference-between-beanfactory-and-applicationcontext](01-Spring-Boot-Fundamentals.md#14-whats-the-difference-between-beanfactory-and-applicationcontext)*

### 15. What does `@ConditionalOnMissingBean` actually enable?

**Answer:** It's Spring's way of saying "only step in if nobody else did." An auto-configured bean marked with it only activates if no bean of that type already exists. So if you define your own `@Bean`, Spring sees yours first and the auto-configured version never even activates — there's no conflict, because it's designed to yield to you.

*Source: [01-Spring-Boot-Fundamentals.md#15-what-does-conditionalonmissingbean-actually-enable](01-Spring-Boot-Fundamentals.md#15-what-does-conditionalonmissingbean-actually-enable)*

### 16. Besides `@PostConstruct`/`@PreDestroy`, what else hooks into a bean's lifecycle?

**Answer:** Two more hooks besides those annotations. `InitializingBean` and `DisposableBean` are interface versions that fire at the exact same points in time. And a `BeanPostProcessor`, registered separately, can inspect or even wrap every single bean as it initializes — this is actually the mechanism Spring uses internally to attach proxies, including the one behind `@Transactional`.

*Source: [01-Spring-Boot-Fundamentals.md#16-besides-postconstructpredestroy-what-else-hooks-into-a-beans-lifecycle](01-Spring-Boot-Fundamentals.md#16-besides-postconstructpredestroy-what-else-hooks-into-a-beans-lifecycle)*

## [2. REST API Design (Beginner-Friendly)](02-REST-API-Design.md)

### 1. Is `PATCH` idempotent?

**Answer:** Not automatically — it depends entirely on what the patch actually does. `PATCH {"name":"Ana"}` is idempotent, because repeating it just sets the same value again. But `PATCH {"op":"increment","amount":1}` is not idempotent, because repeating it keeps adding one each time. So the method name `PATCH` doesn't decide idempotency — the shape of the patch and how the server applies it does.

*Source: [02-REST-API-Design.md#1-is-patch-idempotent](02-REST-API-Design.md#1-is-patch-idempotent)*

### 2. `PUT` versus `PATCH`?

**Answer:** `PUT` replaces the whole resource at that URI, and it's always idempotent — send it twice, same end state. `PATCH` applies a partial change, and whether it's idempotent depends on what that change does. Either way, your API needs to spell out one subtle thing: does leaving a field out of the request mean "leave it alone," or does it mean the same as sending it as `null`?

*Source: [02-REST-API-Design.md#2-put-versus-patch](02-REST-API-Design.md#2-put-versus-patch)*

### 3. `401` versus `403`?

**Answer:** `401` means "I don't know who you are" — the request has no valid authentication at all. `403` means "I know exactly who you are, and you're not allowed to do this." A common mistake to avoid: don't return `401` just because a logged-in user got rejected by a business rule — that's a `403`.

*Source: [02-REST-API-Design.md#3-401-versus-403](02-REST-API-Design.md#3-401-versus-403)*

### 4. How would you make a payment endpoint safe to retry?

**Answer:** Build it around an idempotency key. Require the client to send one, scoped to the account, and back it with a unique database constraint. Claim that key atomically together with a hash of the request in the same step. Then if the same key comes in again, just return whatever result you stored the first time — no double charge. And if the same key shows up but with different request parameters, that's suspicious, so return a conflict instead of silently processing it.

*Source: [02-REST-API-Design.md#4-how-would-you-make-a-payment-endpoint-safe-to-retry](02-REST-API-Design.md#4-how-would-you-make-a-payment-endpoint-safe-to-retry)*

### 5. How do you design pagination for millions of rows?

**Answer:** Three pieces. Cap and clamp the page size so nobody can request a million rows at once. Use a deterministic sort with a tiebreaker so ordering is always unique. And for anything large or fast-changing, use keyset pagination — an opaque cursor pointing to "whatever comes next" — instead of offset. Also validate sort fields against an explicit allowlist, don't just trust whatever field name comes in. Offset pagination still has its place, but only for smaller, fairly static datasets where users genuinely need to jump to an arbitrary page.

*Source: [02-REST-API-Design.md#5-how-do-you-design-pagination-for-millions-of-rows](02-REST-API-Design.md#5-how-do-you-design-pagination-for-millions-of-rows)*

### 6. Why use DTOs instead of binding directly to the entity?

**Answer:** Two separate protections, one on each side. On the way in, a request DTO blocks mass assignment — if a caller tries to set a field like `role` that only an internal process should touch, it simply doesn't exist on the DTO, so it can't be set. On the way out, a response DTO protects the API from database changes and stops you from accidentally serializing internal fields or lazily-loaded relationships you never meant to expose.

*Source: [02-REST-API-Design.md#6-why-use-dtos-instead-of-binding-directly-to-the-entity](02-REST-API-Design.md#6-why-use-dtos-instead-of-binding-directly-to-the-entity)*

### 7. When do you return `202`?

**Answer:** Use `202` when you've accepted the request but the actual work is still running — kicking off an async export is the classic example. Give the client a status resource or a polling URL so they can check back on progress, instead of making them block on the original request until it's done.

*Source: [02-REST-API-Design.md#7-when-do-you-return-202](02-REST-API-Design.md#7-when-do-you-return-202)*

### 8. How should a generic, unexpected exception be handled?

**Answer:** Split what you log from what you return. Internally, log the full context plus a correlation ID so you can actually trace it later. Externally, return a stable, generic error body — never leak a stack trace or the raw exception message to the caller. And map any known domain failures to their own specific status codes rather than letting everything collapse into a generic 500.

*Source: [02-REST-API-Design.md#8-how-should-a-generic-unexpected-exception-be-handled](02-REST-API-Design.md#8-how-should-a-generic-unexpected-exception-be-handled)*

### 9. What is an `ETag` actually useful for?

**Answer:** Two genuinely useful jobs. For caching, `If-None-Match` lets the server skip resending unchanged data and just return `304` instead. For concurrency, `If-Match` lets you reject an update if the resource changed since the client last read it — which stops a silent lost update where one person's change quietly overwrites another's.

*Source: [02-REST-API-Design.md#9-what-is-an-etag-actually-useful-for](02-REST-API-Design.md#9-what-is-an-etag-actually-useful-for)*

### 10. REST or RPC-style endpoints?

**Answer:** It depends on the shape of the operation, not on some rule that everything must be REST. Standard CRUD — create, read, update, delete — and HTTP-level caching genuinely benefit from REST's resource model. But a command like "capture this payment" is often clearer as an explicit action endpoint. Let the domain and the client's actual needs decide — don't force every operation into a resource shape just to say you did REST.

*Source: [02-REST-API-Design.md#10-rest-or-rpc-style-endpoints](02-REST-API-Design.md#10-rest-or-rpc-style-endpoints)*

### 11. When would you write a custom Bean Validation constraint instead of composing built-in ones?

**Answer:** Reach for a custom constraint once the rule needs real logic — checking membership in a business-defined set, comparing two fields against each other, or doing a lookup. When you implement `ConstraintValidator`, treat `null` as valid inside it, and pair it with a separate `@NotNull` if the field is actually required — that keeps the two concerns separate. And if the rule spans multiple fields, put the constraint at the class level instead of on a single field.

*Source: [02-REST-API-Design.md#11-when-would-you-write-a-custom-bean-validation-constraint-instead-of-composing-built-in-ones](02-REST-API-Design.md#11-when-would-you-write-a-custom-bean-validation-constraint-instead-of-composing-built-in-ones)*

## [3. Database, JPA, and Hibernate (Beginner-Friendly)](03-Database-JPA-Hibernate.md)

### 1. What's the actual difference between JPA, Hibernate, and Spring Data JPA?

**Answer:** Think of it as three layers stacked on each other. JPA is just the specification — a set of standard interfaces and annotations, nothing more. Hibernate is the most common implementation of that spec — the actual library generating and running SQL. Spring Data JPA sits a layer above both of those, generating a working repository implementation from an interface you write, so you never hand-write basic CRUD methods yourself.

*Source: [03-Database-JPA-Hibernate.md#1-whats-the-actual-difference-between-jpa-hibernate-and-spring-data-jpa](03-Database-JPA-Hibernate.md#1-whats-the-actual-difference-between-jpa-hibernate-and-spring-data-jpa)*

### 2. What is dirty checking, and why does an entity update without an explicit `save()` call?

**Answer:** Hibernate keeps a snapshot of every managed entity's fields from the moment it was loaded. At flush time — usually right before commit — it compares the current values against that snapshot, and anything that changed gets an `UPDATE` generated automatically. That's the whole reason calling a plain setter inside a `@Transactional` method is enough to persist a change — you never had to call `save()` yourself.

*Source: [03-Database-JPA-Hibernate.md#2-what-is-dirty-checking-and-why-does-an-entity-update-without-an-explicit-save-call](03-Database-JPA-Hibernate.md#2-what-is-dirty-checking-and-why-does-an-entity-update-without-an-explicit-save-call)*

### 3. `save()` versus `flush()`?

**Answer:** `save()` makes an entity persistent if it was new, or merges it back in if it was detached — one call that adapts to whatever state the entity's in. `flush()` is different: it pushes any pending SQL to the database right now, without ending the transaction. A single transaction can flush several times before it finally commits.

*Source: [03-Database-JPA-Hibernate.md#3-save-versus-flush](03-Database-JPA-Hibernate.md#3-save-versus-flush)*

### 4. What decides the owning side of a relationship, and why does it matter?

**Answer:** Whoever physically holds the foreign key column — marked with `@JoinColumn` or `@JoinTable` — is the owning side, and Hibernate only persists changes made through that side. The other side, marked `mappedBy`, is inverse and read-only as far as Hibernate is concerned. In a `@OneToMany`/`@ManyToOne` pair, the "many" side almost always owns the relationship, since that's where the foreign key column physically lives. A really common bug follows from this: updating only the inverse-side collection in memory and forgetting the owning side — and nothing actually gets saved.

*Source: [03-Database-JPA-Hibernate.md#4-what-decides-the-owning-side-of-a-relationship-and-why-does-it-matter](03-Database-JPA-Hibernate.md#4-what-decides-the-owning-side-of-a-relationship-and-why-does-it-matter)*

### 5. Why shouldn't you add extra columns directly to a `@ManyToMany` relationship?

**Answer:** A `@ManyToMany` with `@JoinTable` can only ever hold two foreign keys — there's no entity there to hang an extra column like `enrolledAt` off of. The fix is to stop modeling it as `@ManyToMany` altogether and introduce an explicit join entity instead — something like `Enrollment` with a `@ManyToOne` to each side — which is just a normal entity, so you can add whatever fields you want to it.

*Source: [03-Database-JPA-Hibernate.md#5-why-shouldnt-you-add-extra-columns-directly-to-a-manytomany-relationship](03-Database-JPA-Hibernate.md#5-why-shouldnt-you-add-extra-columns-directly-to-a-manytomany-relationship)*

### 6. Why can `equals()`/`hashCode()` on a JPA entity cause subtle bugs?

**Answer:** Two separate traps here. Identity-based `equals`/`hashCode` defaults break across a detach/merge cycle. And hashing a mutable, database-generated `id` breaks lookups in a `HashSet` or `HashMap`, because an entity added before it's persisted (`id` is `null`) lands in a different bucket than the same entity looked up afterward (`id` now has a value). The safer bet: use a natural business key for `equals`/`hashCode` if one exists, or fall back to a constant hash code paired with ID-based equality that treats distinct transient instances as unequal.

*Source: [03-Database-JPA-Hibernate.md#6-why-can-equalshashcode-on-a-jpa-entity-cause-subtle-bugs](03-Database-JPA-Hibernate.md#6-why-can-equalshashcode-on-a-jpa-entity-cause-subtle-bugs)*

### 7. Explain the N+1 problem and how you'd fix it.

**Answer:** Picture loading a list of parents with one query, and then touching a lazy association on each one individually — that fires one extra query per parent, so N extra queries stacked on top of the original. Fix it with a targeted fetch join, `@EntityGraph`, batch fetching, or a DTO projection built for that specific use case. Don't fix it by making the relationship eager globally — that just shifts the cost onto every other use case that never needed that data in the first place.

*Source: [03-Database-JPA-Hibernate.md#7-explain-the-n1-problem-and-how-youd-fix-it](03-Database-JPA-Hibernate.md#7-explain-the-n1-problem-and-how-youd-fix-it)*

### 8. Why is `@ManyToOne(fetch = LAZY)` written out explicitly so often, when `LAZY` isn't even the JPA default there?

**Answer:** That's exactly the point being tested here — JPA's actual default for `@ManyToOne` and `@OneToOne` is EAGER, meaning it silently loads the associated entity on every single query whether you need it or not. Writing `fetch = FetchType.LAZY` explicitly is you overriding that default, so each use case controls what it actually pulls in.

*Source: [03-Database-JPA-Hibernate.md#8-why-is-manytoonefetch--lazy-written-out-explicitly-so-often-when-lazy-isnt-even-the-jpa-default-there](03-Database-JPA-Hibernate.md#8-why-is-manytoonefetch--lazy-written-out-explicitly-so-often-when-lazy-isnt-even-the-jpa-default-there)*

### 9. What does `@Transactional` actually guarantee, and what can it not do?

**Answer:** It guarantees all-or-nothing for the database writes inside it, via Spring's proxy mechanism (file 01 covers proxies generally) — either every write commits together, or every write rolls back together. What it can't touch is anything outside the database: an email that already went out, or an external HTTP call that already succeeded — those don't get undone just because the transaction rolls back.

*Source: [03-Database-JPA-Hibernate.md#9-what-does-transactional-actually-guarantee-and-what-can-it-not-do](03-Database-JPA-Hibernate.md#9-what-does-transactional-actually-guarantee-and-what-can-it-not-do)*

### 10. Walk through dirty read, non-repeatable read, and phantom read.

**Answer:** Three distinct problems, worth keeping straight. A dirty read sees another transaction's uncommitted change — one that might get rolled back later. A non-repeatable read reads the *same row* twice in one transaction and gets two different values, because another transaction committed a change in between. A phantom read runs the *same query* twice and gets a different *set of rows*, because another transaction inserted or deleted a matching row in between. Higher isolation levels block more of these, but cost you more locking.

*Source: [03-Database-JPA-Hibernate.md#10-walk-through-dirty-read-non-repeatable-read-and-phantom-read](03-Database-JPA-Hibernate.md#10-walk-through-dirty-read-non-repeatable-read-and-phantom-read)*

### 11. Optimistic versus pessimistic locking — how do you choose?

**Answer:** Optimistic locking, via `@Version`, lets everyone read concurrently and only checks for a conflict at write time — if there's a clash, it throws and the caller retries. That's good when conflicts are rare and most attempts succeed anyway. Pessimistic locking, `SELECT ... FOR UPDATE`, blocks anyone else from touching that row for the whole duration. That fits short, heavily-contended critical sections where retrying would actually cost more than briefly blocking.

*Source: [03-Database-JPA-Hibernate.md#11-optimistic-versus-pessimistic-locking--how-do-you-choose](03-Database-JPA-Hibernate.md#11-optimistic-versus-pessimistic-locking--how-do-you-choose)*

### 12. Why can a bulk update be dangerous, even though it's efficient?

**Answer:** A bulk `UPDATE` or `DELETE` skips the persistence context entirely — no dirty checking, no lifecycle callbacks, none of it. So if an entity was already loaded as managed earlier in that same transaction, it keeps its old, now-stale values in memory, with no idea the database just changed underneath it. Guard against this with `clearAutomatically = true`, running it in a separate transaction, or explicitly reloading afterward.

*Source: [03-Database-JPA-Hibernate.md#12-why-can-a-bulk-update-be-dangerous-even-though-its-efficient](03-Database-JPA-Hibernate.md#12-why-can-a-bulk-update-be-dangerous-even-though-its-efficient)*

### 13. Why are database constraints still necessary if the application already validates input?

**Answer:** Application-level validation runs per request, and that's exactly the gap — two concurrent requests can both pass the same check before either one actually writes, since the check and the write aren't atomic together. A database-level `UNIQUE` or foreign-key constraint is enforced right at the moment of writing, and it's the only guarantee that holds no matter how the requests are timed.

*Source: [03-Database-JPA-Hibernate.md#13-why-are-database-constraints-still-necessary-if-the-application-already-validates-input](03-Database-JPA-Hibernate.md#13-why-are-database-constraints-still-necessary-if-the-application-already-validates-input)*

### 14. How would you investigate a slow query in production?

**Answer:** Work it step by step. Capture the actual generated SQL and its parameters. Check how many queries one request fires, to rule out N+1. Run `EXPLAIN` to inspect the query plan. Verify the relevant columns are indexed and the index is genuinely being used — not defeated by a wrapped function or a leading wildcard. Then consider a projection, pagination, or a query rewrite — and always measure before and after to confirm it actually helped.

*Source: [03-Database-JPA-Hibernate.md#14-how-would-you-investigate-a-slow-query-in-production](03-Database-JPA-Hibernate.md#14-how-would-you-investigate-a-slow-query-in-production)*

### 15. How would you build a search endpoint with several independent optional filters?

**Answer:** Not by hand-writing one JPQL string per possible filter combination — that explodes fast. Use Spring Data's `Specification`, or Querydsl, to build up predicates at runtime, returning `null` for any filter that wasn't supplied. Those compose cleanly with `Specification.where(...).and(...)`, and you pass the combined result into `findAll(spec, pageable)`.

*Source: [03-Database-JPA-Hibernate.md#15-how-would-you-build-a-search-endpoint-with-several-independent-optional-filters](03-Database-JPA-Hibernate.md#15-how-would-you-build-a-search-endpoint-with-several-independent-optional-filters)*

### 16. Why does testing a query against H2 not prove it works in production?

**Answer:** Because different databases parse and optimize SQL differently, and some database-specific functions or behaviors simply don't exist in an in-memory test database like H2. `@DataJpaTest` against H2 is a reasonable sanity check that your mappings and query shapes are correct, but it's Testcontainers — running the actual production database engine for the test — that really proves a query behaves the same way in production.

*Source: [03-Database-JPA-Hibernate.md#16-why-does-testing-a-query-against-h2-not-prove-it-works-in-production](03-Database-JPA-Hibernate.md#16-why-does-testing-a-query-against-h2-not-prove-it-works-in-production)*

## [4. Authentication and Security (Beginner-Friendly)](04-Authentication-Security.md)

### 1. Authentication versus authorization?

**Answer:** Authentication answers "who are you" — it verifies the identity making the request. Authorization answers a different question: "given that identity, are you allowed to do this specific thing to this specific resource." A role check alone is a coarser tool than authorization usually needs — it tells you what kind of user someone is, not which particular records they're actually entitled to touch.

**Follow-up:** Why isn't `hasRole("USER")` enough to protect `PUT /users/{id}`? Because that check passes for any user with that role, no matter what `id` is in the URL. You still need a separate check that the authenticated caller actually owns or is entitled to that specific resource.

*Source: [04-Authentication-Security.md#1-authentication-versus-authorization](04-Authentication-Security.md#1-authentication-versus-authorization)*

### 2. What is IDOR, and how do you prevent it?

**Answer:** IDOR stands for Insecure Direct Object Reference — it's trusting an identifier straight out of the request, like a URL path variable or a query parameter, without checking the authenticated caller is actually allowed to touch that specific object. Prevent it by loading the resource through a query that's already constrained to the authenticated principal or tenant, or with an explicit ownership check in the service layer or a method-security expression. A role check alone never catches this.

*Source: [04-Authentication-Security.md#2-what-is-idor-and-how-do-you-prevent-it](04-Authentication-Security.md#2-what-is-idor-and-how-do-you-prevent-it)*

### 3. Why hash passwords instead of encrypting them?

**Answer:** The app only ever needs to verify a password, never recover it — and encryption is reversible by design, so anyone holding the key can get the original back. A salted, deliberately slow one-way hash like Argon2id, bcrypt, or PBKDF2 has no key to steal that reverses it, and being deliberately slow makes large-scale offline guessing computationally expensive even if the whole database leaks.

*Source: [04-Authentication-Security.md#3-why-hash-passwords-instead-of-encrypting-them](04-Authentication-Security.md#3-why-hash-passwords-instead-of-encrypting-them)*

### 4. Why does the salt matter, separately from the hash algorithm being slow?

**Answer:** Without a salt, identical passwords produce identical stored hashes, so an attacker can precompute hashes for common passwords once — a rainbow table — and instantly crack every account that happens to share one. A per-user random salt mixed into the hash makes every stored hash unique even for identical passwords, defeating those precomputed tables no matter how slow the hash function already is.

*Source: [04-Authentication-Security.md#4-why-does-the-salt-matter-separately-from-the-hash-algorithm-being-slow](04-Authentication-Security.md#4-why-does-the-salt-matter-separately-from-the-hash-algorithm-being-slow)*

### 5. Sessions versus JWTs — how do you actually choose?

**Answer:** Sessions make revocation trivial — just delete the server-side record — but once you scale past one instance, you need a shared store or sticky routing. JWTs skip the per-request lookup and scale horizontally with no shared state, but that convenience comes at a cost: revocation gets harder, role and claim freshness gets harder, and you need careful signature and claim validation. Pick based on your actual revocation needs, client types, and infrastructure — JWT isn't categorically the better choice for APIs or microservices, despite the reputation.

*Source: [04-Authentication-Security.md#5-sessions-versus-jwts--how-do-you-actually-choose](04-Authentication-Security.md#5-sessions-versus-jwts--how-do-you-actually-choose)*

### 6. Is a JWT encrypted?

**Answer:** Usually not, and this trips people up. The header and payload are base64url-encoded, not encrypted — anyone holding the token can read them plainly. The signature only proves the claims haven't been tampered with since signing; it says nothing about who's allowed to read them. So sensitive data should never go inside the claims.

*Source: [04-Authentication-Security.md#6-is-a-jwt-encrypted](04-Authentication-Security.md#6-is-a-jwt-encrypted)*

### 7. What should a resource server validate before trusting a JWT's claims?

**Answer:** Check, in order: the signature against trusted keys, and reject anything using an unexpected algorithm or "none." Then the issuer, the audience, the expiration, and the not-before time if it's present. And the scopes or authorities it carries. Only after all of that passes does domain-level authorization against the actual resource even come into play.

*Source: [04-Authentication-Security.md#7-what-should-a-resource-server-validate-before-trusting-a-jwts-claims](04-Authentication-Security.md#7-what-should-a-resource-server-validate-before-trusting-a-jwts-claims)*

### 8. What's the practical difference between OAuth2 and OpenID Connect?

**Answer:** OAuth2 is fundamentally about delegated authorization — letting an application act on a user's behalf with a defined set of permissions, called scopes, without that app ever seeing the user's real credentials. OpenID Connect builds on top of OAuth2 specifically for authentication — establishing who the person actually is, through a standardized identity token.

*Source: [04-Authentication-Security.md#8-whats-the-practical-difference-between-oauth2-and-openid-connect](04-Authentication-Security.md#8-whats-the-practical-difference-between-oauth2-and-openid-connect)*

### 9. What is CSRF, concretely, and why does it depend on cookies?

**Answer:** CSRF is when a malicious page tricks a victim's browser into sending a request to another site the victim is already logged into. The browser attaches that site's cookie automatically, with no idea the request actually originated from an unrelated page. It's mainly a cookie problem because cookies get attached without the page having to ask — a bearer token that a legitimate client has to deliberately put in a header doesn't get silently forwarded the same way. Defenses are CSRF tokens and `SameSite` cookies.

*Source: [04-Authentication-Security.md#9-what-is-csrf-concretely-and-why-does-it-depend-on-cookies](04-Authentication-Security.md#9-what-is-csrf-concretely-and-why-does-it-depend-on-cookies)*

### 10. When is it actually safe to disable CSRF protection?

**Answer:** Only when the API is authenticated by something the browser doesn't attach automatically — an explicitly supplied bearer token, not a cookie — and the wider threat model actually supports it. This isn't a blanket "APIs don't need CSRF" rule — a cookie-authenticated endpoint still needs protection regardless of whether you'd call it "an API."

*Source: [04-Authentication-Security.md#10-when-is-it-actually-safe-to-disable-csrf-protection](04-Authentication-Security.md#10-when-is-it-actually-safe-to-disable-csrf-protection)*

### 11. What is CORS, and what does it not do?

**Answer:** CORS is a browser-enforced policy that controls which origins' JavaScript is allowed to read a cross-origin response — that's it. It's not authentication, it's not authorization, and it does nothing at all for non-browser clients like `curl`, mobile apps, or other backend services, because only browsers enforce it. Real access control still has to happen on the server.

*Source: [04-Authentication-Security.md#11-what-is-cors-and-what-does-it-not-do](04-Authentication-Security.md#11-what-is-cors-and-what-does-it-not-do)*

### 12. Why extend `OncePerRequestFilter` instead of implementing `Filter` directly for token validation?

**Answer:** `OncePerRequestFilter` guarantees its logic runs exactly once per incoming request, even across internal servlet dispatches like a forward, which could otherwise trigger a plain `Filter` more than once for the same request. For anything that sets security state, running twice isn't just wasted work — it risks subtly inconsistent behavior. That's exactly why it's the right base class to rule that out.

*Source: [04-Authentication-Security.md#12-why-extend-onceperrequestfilter-instead-of-implementing-filter-directly-for-token-validation](04-Authentication-Security.md#12-why-extend-onceperrequestfilter-instead-of-implementing-filter-directly-for-token-validation)*

### 13. What is `SecurityContextHolder`, and why doesn't the authenticated user need to be passed explicitly into every method?

**Answer:** It stores the current request's authenticated identity in a `ThreadLocal`, scoped to whichever single thread is handling that request. Once the authentication filter sets it early in the chain, anything running later on that same thread — a controller, a service, a `@PreAuthorize` check — can just read it directly, no need to pass the user around as a parameter. And that's exactly why it doesn't automatically follow the request onto a different thread — a manually spawned thread, or an `@Async` method — unless you deliberately propagate it yourself.

*Source: [04-Authentication-Security.md#13-what-is-securitycontextholder-and-why-doesnt-the-authenticated-user-need-to-be-passed-explicitly-into-every-method](04-Authentication-Security.md#13-what-is-securitycontextholder-and-why-doesnt-the-authenticated-user-need-to-be-passed-explicitly-into-every-method)*

### 14. Why validate a token in one filter instead of decoding it inside every controller that needs the caller's identity?

**Answer:** Decoding it inside every controller duplicates the validation logic everywhere, risks one endpoint forgetting a check the others remember, and mixes authentication plumbing into business logic. Centralizing it in one filter that populates `SecurityContextHolder` lets every downstream layer just ask "who is the current user" — without caring whether that identity came from a JWT, a session, or an API key.

*Source: [04-Authentication-Security.md#14-why-validate-a-token-in-one-filter-instead-of-decoding-it-inside-every-controller-that-needs-the-callers-identity](04-Authentication-Security.md#14-why-validate-a-token-in-one-filter-instead-of-decoding-it-inside-every-controller-that-needs-the-callers-identity)*

### 15. How do you secure refresh tokens?

**Answer:** Store them hashed, never in plain text. Keep the lifetime as short as you can get away with. Bind each one to a specific device or session. Rotate it on every use. Watch for reuse — a used-and-invalidated token showing up again is a strong signal of theft — and if that happens, revoke the entire token family, not just the one token. And revoke on explicit logout too.

*Source: [04-Authentication-Security.md#15-how-do-you-secure-refresh-tokens](04-Authentication-Security.md#15-how-do-you-secure-refresh-tokens)*

### 16. What's the actual point of `HSTS`, `nosniff`, and CSP, and why is `X-XSS-Protection` no longer worth relying on?

**Answer:** Each one does a distinct job. HSTS forces the browser to only use HTTPS for that domain from now on. `X-Content-Type-Options: nosniff` stops the browser from reinterpreting a response as a more dangerous content type than what was declared. A Content Security Policy restricts which sources scripts and other resources are allowed to load from — that meaningfully limits what a cross-site scripting bug can actually do, even if one slips through. `X-XSS-Protection`, on the other hand, configured a browser-side filter that modern browsers have since removed entirely — it does nothing anymore, so don't treat it as a real defense.

*Source: [04-Authentication-Security.md#16-whats-the-actual-point-of-hsts-nosniff-and-csp-and-why-is-x-xss-protection-no-longer-worth-relying-on](04-Authentication-Security.md#16-whats-the-actual-point-of-hsts-nosniff-and-csp-and-why-is-x-xss-protection-no-longer-worth-relying-on)*

## [5. Testing Java Backend Applications (Beginner-Friendly)](05-Testing-Java.md)

### 1. What's the difference between a unit test and an integration test?

**Answer:** A unit test isolates one small piece of behavior and swaps out its collaborators, usually with Mockito mocks — that keeps it fast and makes it easy to pinpoint exactly where the business logic broke. An integration test lets real framework components or infrastructure take part instead — JPA against a real database, HTTP serialization through `MockMvc`, an actual container via Testcontainers — so it can catch problems a mocked collaborator would just hide.

*Source: [05-Testing-Java.md#1-whats-the-difference-between-a-unit-test-and-an-integration-test](05-Testing-Java.md#1-whats-the-difference-between-a-unit-test-and-an-integration-test)*

### 2. Why write `findById_whenUserDoesNotExist_throwsNotFound` instead of `test1`?

**Answer:** A good test name states the scenario and the expected result, so when it fails months later, you understand what broke just from the report — without ever opening the test body. `test1` gives a future reader absolutely nothing to go on.

*Source: [05-Testing-Java.md#2-why-write-findbyid_whenuserdoesnotexist_throwsnotfound-instead-of-test1](05-Testing-Java.md#2-why-write-findbyid_whenuserdoesnotexist_throwsnotfound-instead-of-test1)*

### 3. When should you reach for a mock, and when should you avoid one?

**Answer:** Mock a real boundary — a repository, an external client, a message publisher — when controlling its response is what actually isolates the behavior you're trying to test. Two things to avoid: don't mock the class you're actually testing, and don't reach for a mock when a small, deterministic fake would need less setup and behave more like real code.

**Follow-up:** Why can heavy use of `verify()` make tests brittle? Because it asserts on *how* the code happens to call its collaborators today, not on the actual result. A harmless refactor that changes the call sequence without changing the outcome can still break the test. Save `verify()` for interactions that are themselves a real requirement — like "publish this event exactly once."

*Source: [05-Testing-Java.md#3-when-should-you-reach-for-a-mock-and-when-should-you-avoid-one](05-Testing-Java.md#3-when-should-you-reach-for-a-mock-and-when-should-you-avoid-one)*

### 4. `@WebMvcTest` versus `@SpringBootTest` — what's actually different, and when do you use each?

**Answer:** `@WebMvcTest` loads just the MVC layer around one controller and mocks its service, so it's fast and focused purely on HTTP-level behavior — status codes, JSON shape, validation. `@SpringBootTest` loads the entire application context, and it's for proving cross-layer wiring or startup behavior actually works. It is not automatically "a more thorough unit test" — reaching for it on every test just makes the whole suite slow for no real benefit.

*Source: [05-Testing-Java.md#4-webmvctest-versus-springboottest--whats-actually-different-and-when-do-you-use-each](05-Testing-Java.md#4-webmvctest-versus-springboottest--whats-actually-different-and-when-do-you-use-each)*

### 5. What does `@DataJpaTest` give you that a mocked repository never can?

**Answer:** It runs against a real, if temporary, database — so it actually executes your queries, entity mappings, and constraints. It'll catch a unique index violation, a bug in a custom `@Query`, a lazy-loading mapping mistake. A mocked `UserRepository` can never fail on any of that, because it never runs a real query in the first place.

*Source: [05-Testing-Java.md#5-what-does-datajpatest-give-you-that-a-mocked-repository-never-can](05-Testing-Java.md#5-what-does-datajpatest-give-you-that-a-mocked-repository-never-can)*

### 6. Why reach for Testcontainers instead of relying on H2 for every database test?

**Answer:** H2 doesn't reproduce every dialect-specific behavior of your real production database — indexing behavior, the exact type of constraint error, JSON column handling, that sort of thing. Testcontainers runs your actual database engine inside a container, so it catches differences that would otherwise only show up in production. It's slower, so you reach for it on the tests where that dialect-specific behavior is genuinely the point — not for every single repository test.

*Source: [05-Testing-Java.md#6-why-reach-for-testcontainers-instead-of-relying-on-h2-for-every-database-test](05-Testing-Java.md#6-why-reach-for-testcontainers-instead-of-relying-on-h2-for-every-database-test)*

### 7. How do you actually test that an admin-only endpoint is protected?

**Answer:** Use `spring-security-test` to build a fake authenticated identity three ways: a non-admin role and assert `403`, the admin role and assert `200`, and a fully unauthenticated request and assert `401`. And don't stop at role checks — also test ownership, one authenticated user hitting another user's resource, since a role check alone won't catch that.

*Source: [05-Testing-Java.md#7-how-do-you-actually-test-that-an-admin-only-endpoint-is-protected](05-Testing-Java.md#7-how-do-you-actually-test-that-an-admin-only-endpoint-is-protected)*

### 8. Is 100% code coverage a good target?

**Answer:** No. Coverage only tells you which lines executed, not whether anything meaningful was actually asserted — a test can call a getter, touch 100% of its lines, and prove absolutely nothing. What actually matters is risk, edge cases, failure paths, and how strong the assertions are. A lower coverage number backed by strong assertions on the risky code beats a padded 100% every time.

*Source: [05-Testing-Java.md#8-is-100-code-coverage-a-good-target](05-Testing-Java.md#8-is-100-code-coverage-a-good-target)*

### 9. What's a contract test, and why would a team use one?

**Answer:** It checks one service's request/response behavior against an agreed, versioned contract shared with whoever calls it — instead of needing every service spun up together just to test the integration directly. It catches a breaking change to that contract before it ever reaches a real multi-service environment.

*Source: [05-Testing-Java.md#9-whats-a-contract-test-and-why-would-a-team-use-one](05-Testing-Java.md#9-whats-a-contract-test-and-why-would-a-team-use-one)*

### 10. How should `deleteAll()` between integration tests be treated?

**Answer:** Treat it as a reasonable but sometimes slow and fragile default — it can be genuinely slow on a large table, and it can surface or hide foreign-key ordering problems. Transactional rollback, which `@DataJpaTest` uses by default, is often faster and cleaner when the code under test can run inside a test transaction. When it can't, explicit cleanup ordering or managing the container's lifecycle might fit better.

*Source: [05-Testing-Java.md#10-how-should-deleteall-between-integration-tests-be-treated](05-Testing-Java.md#10-how-should-deleteall-between-integration-tests-be-treated)*

### 11. Why should you inject a `Clock` instead of calling `LocalDateTime.now()` directly inside business logic?

**Answer:** Code that reads the system clock directly can't be tested deterministically — the result depends on whatever exact moment the test happens to run. Injecting a `Clock` lets a test hand in a fixed point in time instead, so time-based logic like "stale after 30 days" becomes reproducible, and you remove a whole class of rare, date-boundary bugs from the suite.

*Source: [05-Testing-Java.md#11-why-should-you-inject-a-clock-instead-of-calling-localdatetimenow-directly-inside-business-logic](05-Testing-Java.md#11-why-should-you-inject-a-clock-instead-of-calling-localdatetimenow-directly-inside-business-logic)*

## [6. Concurrency and Asynchronous Processing (Beginner-Friendly)](06-Concurrency-Async.md)

### 1. Why is `volatile` insufficient to fix `ordersProcessedToday++`?

**Answer:** `volatile` only guarantees that a write becomes visible to other threads — it does not make a multi-step read-modify-write sequence atomic. Two threads can both read the same fresh value and both write back the same incremented result, and an update quietly gets lost. For a compound operation like increment, reach for `AtomicInteger`, or a lock. Save `volatile` for simple flags and plain single-value visibility.

*Source: [06-Concurrency-Async.md#1-why-is-volatile-insufficient-to-fix-ordersprocessedtoday](06-Concurrency-Async.md#1-why-is-volatile-insufficient-to-fix-ordersprocessedtoday)*

### 2. What does CAS (Compare-And-Swap) actually do, and why does `AtomicInteger` rely on it?

**Answer:** CAS is a CPU-level instruction that atomically checks "does this memory location still hold the value I last read?" and only writes the new value if the answer is yes. If another thread changed it in between, the operation fails and the caller just retries. `AtomicInteger.incrementAndGet()` leans on exactly this to make read-add-write indivisible without ever needing a lock.

*Source: [06-Concurrency-Async.md#2-what-does-cas-compare-and-swap-actually-do-and-why-does-atomicinteger-rely-on-it](06-Concurrency-Async.md#2-what-does-cas-compare-and-swap-actually-do-and-why-does-atomicinteger-rely-on-it)*

### 3. How do you prevent a deadlock like the account-transfer example?

**Answer:** Always acquire multiple locks in the same global, deterministic order — say, by ascending account ID — no matter which order the parameters happened to arrive in. That way, two threads contending for the same pair of locks always compete in the same sequence, and neither can end up waiting on the other forever. On top of that, add lock timeouts, keep critical sections minimal, and avoid unnecessary nested locks.

**Follow-up:** Would an in-process `ReentrantLock` prevent two separate application instances from double-processing the same database row? No — an in-process lock only protects threads inside one JVM. Coordinating across instances needs a database-level lock or a distributed lock service instead.

*Source: [06-Concurrency-Async.md#3-how-do-you-prevent-a-deadlock-like-the-account-transfer-example](06-Concurrency-Async.md#3-how-do-you-prevent-a-deadlock-like-the-account-transfer-example)*

### 4. What does `@Async` actually do, mechanically?

**Answer:** Spring wraps the bean in a proxy, and a call to the annotated method through that proxy gets handed off to a configured task executor instead of running on the caller's own thread. It's important to be precise here: it doesn't make the work non-blocking, it just moves it to a different — still limited — pool of threads.

*Source: [06-Concurrency-Async.md#4-what-does-async-actually-do-mechanically](06-Concurrency-Async.md#4-what-does-async-actually-do-mechanically)*

### 5. Why can `@Async` silently do nothing?

**Answer:** Same self-invocation trap as always: calling the annotated method from another method inside the same class, via `this.method()`, skips the Spring proxy entirely because it's a plain Java call, not one going through the container-managed proxy. The method just runs synchronously on the caller's thread, with no error to warn you. Fix it by putting the `@Async` method on a separate bean and calling it through that bean.

*Source: [06-Concurrency-Async.md#5-why-can-async-silently-do-nothing](06-Concurrency-Async.md#5-why-can-async-silently-do-nothing)*

### 6. `thenApply` versus `thenCompose` on a `CompletableFuture`?

**Answer:** `thenApply` maps the completed value into another plain value — simple transformation. `thenCompose` is for when that transformation itself returns another `CompletableFuture` — it flattens the result instead of leaving you with a nested `CompletableFuture<CompletableFuture<T>>`.

*Source: [06-Concurrency-Async.md#6-thenapply-versus-thencompose-on-a-completablefuture](06-Concurrency-Async.md#6-thenapply-versus-thencompose-on-a-completablefuture)*

### 7. How should a thread pool be sized?

**Answer:** Base it on measured behavior, not a fixed formula pulled from a blog post. CPU-bound work rarely gets faster with more threads than you have cores. Blocking I/O-bound work can genuinely benefit from more threads than cores — but the real ceiling is usually set by whatever's downstream: a database connection pool, a remote service's capacity — not by how you configure the thread pool itself.

*Source: [06-Concurrency-Async.md#7-how-should-a-thread-pool-be-sized](06-Concurrency-Async.md#7-how-should-a-thread-pool-be-sized)*

### 8. Why does wrapping a blocking JDBC call in `Mono.fromCallable(...)` not make it non-blocking?

**Answer:** Wrapping it in `Mono.fromCallable(...)` doesn't change the fact that the call itself still blocks whichever thread runs it. Reactive frameworks run on a small, fixed pool of event-loop threads that assume nothing ever blocks — block even one of them under load, and throughput collapses for every other request sharing that pool. The fix is to offload the call to a scheduler built for blocking work, like `Schedulers.boundedElastic()`, or replace it with a genuinely non-blocking driver.

*Source: [06-Concurrency-Async.md#8-why-does-wrapping-a-blocking-jdbc-call-in-monofromcallable-not-make-it-non-blocking](06-Concurrency-Async.md#8-why-does-wrapping-a-blocking-jdbc-call-in-monofromcallable-not-make-it-non-blocking)*

### 9. Why can a `@Scheduled` job run multiple times in production but only once locally?

**Answer:** `@Scheduled` triggers independently on every instance that has the bean, and each instance's scheduler has no idea the others exist. Run one instance locally, and you only ever see one trigger. Deploy three instances in production, and the job fires three times. Fix it with a distributed lock so only one instance's trigger actually runs the job, or make the job idempotent so duplicate runs are harmless either way.

*Source: [06-Concurrency-Async.md#9-why-can-a-scheduled-job-run-multiple-times-in-production-but-only-once-locally](06-Concurrency-Async.md#9-why-can-a-scheduled-job-run-multiple-times-in-production-but-only-once-locally)*

### 10. `fixedRate` versus `fixedDelay`?

**Answer:** `fixedRate` schedules the next run relative to when the previous run *started* — so if a run occasionally takes too long, you can get back-to-back or even overlapping runs queuing up. `fixedDelay` schedules the next run relative to when the previous run *finished*, so it never overlaps no matter how long a run takes.

*Source: [06-Concurrency-Async.md#10-fixedrate-versus-fixeddelay](06-Concurrency-Async.md#10-fixedrate-versus-fixeddelay)*

### 11. Do virtual threads remove the need for connection pools, timeouts, and rate limits?

**Answer:** No, and this is an easy trap to fall into. Virtual threads make a *blocked thread* cheap, so you can have far more concurrent blocking calls in flight at once. But they do nothing about the finite capacity of whatever those calls are actually waiting on — a database connection pool, a downstream service's limits. You still need the same overload-control tools: bounded pools, timeouts, bulkheads, rate limits. If anything, they're now easier to overwhelm faster, since spinning up a virtual thread is so cheap.

*Source: [06-Concurrency-Async.md#11-do-virtual-threads-remove-the-need-for-connection-pools-timeouts-and-rate-limits](06-Concurrency-Async.md#11-do-virtual-threads-remove-the-need-for-connection-pools-timeouts-and-rate-limits)*

### 12. What is backpressure, and where does it apply?

**Answer:** It's a mechanism for a slow consumer to tell a producer "slow down, I'm at capacity" — instead of the consumer buffering endlessly or silently dropping data. Bounded queues in an executor, reactive streams' demand signaling, and rate limiting are really just three different implementations of that same underlying idea.

*Source: [06-Concurrency-Async.md#12-what-is-backpressure-and-where-does-it-apply](06-Concurrency-Async.md#12-what-is-backpressure-and-where-does-it-apply)*

### 13. What does happens-before mean, and name two ways to establish it?

**Answer:** It's the Java Memory Model's guarantee that if action A happens-before action B, then B is guaranteed to see every effect of A. Without that guarantee, a thread might legally see stale or reordered data. It gets established by things like releasing and then re-acquiring the same lock, writing then reading the same `volatile` field, a `Thread.join()` completing, or a `CompletableFuture` completing before another thread observes it.

*Source: [06-Concurrency-Async.md#13-what-does-happens-before-mean-and-name-two-ways-to-establish-it](06-Concurrency-Async.md#13-what-does-happens-before-mean-and-name-two-ways-to-establish-it)*

## [7. Common Backend Problems and Reliable Patterns (Beginner-Friendly)](07-Common-Backend-Problems.md)

### 1. Why is cache invalidation genuinely difficult?

**Answer:** The database and the cache are two separate systems with no shared atomic commit tying them together. A crash, or just a concurrent write landing between the database update and the cache update, can leave a stale cached value with nothing signaling that it's stale. The realistic fix isn't chasing perfect consistency — it's a clear invalidation strategy on every write path, a TTL as a backstop, and metrics tracking hit rate and staleness.

*Source: [07-Common-Backend-Problems.md#1-why-is-cache-invalidation-genuinely-difficult](07-Common-Backend-Problems.md#1-why-is-cache-invalidation-genuinely-difficult)*

### 2. What causes a cache stampede, and how do you prevent one?

**Answer:** A popular cache entry expires — or you get a cold restart with an empty cache — and suddenly many concurrent requests all miss at the same instant, all hitting the database simultaneously. That recreates exactly the load spike caching was supposed to prevent. Prevent it with request coalescing, jittered TTLs so entries don't all expire in lockstep, stale-while-revalidate, or a short-lived lock around the refill.

*Source: [07-Common-Backend-Problems.md#2-what-causes-a-cache-stampede-and-how-do-you-prevent-one](07-Common-Backend-Problems.md#2-what-causes-a-cache-stampede-and-how-do-you-prevent-one)*

### 3. Offset versus keyset pagination — when does each make sense?

**Answer:** Offset pagination is simple and lets you jump straight to an arbitrary page, but deep pages force the database to scan and throw away everything before them, and results can shift under concurrent inserts. Keyset pagination uses a cursor plus a deterministic, uniquely-ordered sort to fetch "whatever comes next" — it stays fast at any depth and stable under concurrent writes, but you lose random page access. Use offset for small, fairly static datasets where users need to jump to a specific page; use keyset for anything large or frequently changing.

*Source: [07-Common-Backend-Problems.md#3-offset-versus-keyset-pagination--when-does-each-make-sense](07-Common-Backend-Problems.md#3-offset-versus-keyset-pagination--when-does-each-make-sense)*

### 4. Why do soft deletes complicate a unique constraint?

**Answer:** A normal unique index can't tell an active row apart from a soft-deleted one, so a soft-deleted user's old email still blocks a new signup that wants to reuse it. Fix it with a database-specific partial unique index scoped to non-deleted rows, or a business decision to permanently reserve the value, or by physically archiving the row once a retention period passes.

**Follow-up:** Why isn't one custom repository method enough to hide deleted rows everywhere? Because every other query path — `findAll()`, native SQL, raw JPQL, inherited methods — has no idea the `deleted` column even exists, unless the filter is applied globally: a `Specification`, a Hibernate `@Filter`, a view, or a separate archive table. It can't be bolted on endpoint by endpoint.

*Source: [07-Common-Backend-Problems.md#4-why-do-soft-deletes-complicate-a-unique-constraint](07-Common-Backend-Problems.md#4-why-do-soft-deletes-complicate-a-unique-constraint)*

### 5. How do you make idempotency actually race-safe, not just "check first"?

**Answer:** A plain check-then-insert has a gap: two concurrent identical requests can both pass the check before either one commits, so you end up with two rows anyway. The real fix is a unique database constraint on the idempotency key, claimed with an atomic insert in the same transaction as the actual business effect. A retried request with the same key and the same request hash just returns the stored result; the same key with a different hash gets rejected as a conflict.

*Source: [07-Common-Backend-Problems.md#5-how-do-you-make-idempotency-actually-race-safe-not-just-check-first](07-Common-Backend-Problems.md#5-how-do-you-make-idempotency-actually-race-safe-not-just-check-first)*

### 6. When is retrying a failed call actually dangerous?

**Answer:** Three situations where retrying bites you. When the operation isn't idempotent and could double-execute — charging a customer twice. When the failure is permanent rather than transient — retrying a validation error accomplishes nothing. And when a lot of clients retry at once and turn a partial outage into a full one — a retry storm. Safe retries need bounded attempts, exponential backoff with jitter, a deadline, and for non-idempotent operations, an idempotency key.

*Source: [07-Common-Backend-Problems.md#6-when-is-retrying-a-failed-call-actually-dangerous](07-Common-Backend-Problems.md#6-when-is-retrying-a-failed-call-actually-dangerous)*

### 7. What does a circuit breaker solve that a timeout alone doesn't?

**Answer:** A timeout alone still makes every caller wait out the full deadline before failing — under a sustained outage, that exhausts the thread pool and turns one dependency's failure into a cascading failure across the whole app. A circuit breaker tracks the failure rate, and once it opens, it fails calls immediately with no network attempt at all — protecting the thread pool — then periodically lets a trial call through in a half-open state to test recovery. It still has to be paired with timeouts, retries, bulkheads, and a fallback that doesn't fabricate an incorrect business answer.

*Source: [07-Common-Backend-Problems.md#7-what-does-a-circuit-breaker-solve-that-a-timeout-alone-doesnt](07-Common-Backend-Problems.md#7-what-does-a-circuit-breaker-solve-that-a-timeout-alone-doesnt)*

### 8. What's a bulkhead, and why does it matter alongside a circuit breaker?

**Answer:** A bulkhead isolates the thread or connection pool used for one dependency from the pools used for everything else, so a struggling dependency can only exhaust its own resources instead of starving requests that have nothing to do with it. Think of the division of labor: a circuit breaker stops calls to the failing dependency; a bulkhead limits the damage while it's still failing.

*Source: [07-Common-Backend-Problems.md#8-whats-a-bulkhead-and-why-does-it-matter-alongside-a-circuit-breaker](07-Common-Backend-Problems.md#8-whats-a-bulkhead-and-why-does-it-matter-alongside-a-circuit-breaker)*

### 9. What problem does the transactional outbox pattern actually fix?

**Answer:** Writing a database row and publishing a message as two separate steps creates a dual-write problem — a crash between the two leaves the database and the message broker disagreeing about what actually happened, with nothing to prevent it. The outbox pattern fixes this by writing the business row and an outbox row describing the event in one single database transaction, so they always commit together. A separate publisher then delivers the outbox row afterward and marks it sent.

*Source: [07-Common-Backend-Problems.md#9-what-problem-does-the-transactional-outbox-pattern-actually-fix](07-Common-Backend-Problems.md#9-what-problem-does-the-transactional-outbox-pattern-actually-fix)*

### 10. What is at-least-once delivery, and what does it require from a consumer?

**Answer:** It's a guarantee that a message will eventually get delivered, but possibly more than once — say, if a publisher crashes after sending but before recording that it sent. Because of that, consumers have to be idempotent — safe to process the exact same message twice without a duplicate side effect — since exactly-once delivery at the broker level generally isn't available. Exactly-once *business* behavior has to be built at the application level instead.

*Source: [07-Common-Backend-Problems.md#10-what-is-at-least-once-delivery-and-what-does-it-require-from-a-consumer](07-Common-Backend-Problems.md#10-what-is-at-least-once-delivery-and-what-does-it-require-from-a-consumer)*

### 11. Walk through what makes a money-transfer endpoint safe.

**Answer:** Wrap the debit and the credit in one database transaction, so a crash partway through rolls back both, never just one. Use a decimal type built for exact arithmetic — never `double` — for money. Require an idempotency key so a retried request can't move money twice. Check authorization and sufficient funds inside that same transaction. And lock both accounts in one deterministic order, such as ascending account ID, regardless of which direction the transfer is going.

*Source: [07-Common-Backend-Problems.md#11-walk-through-what-makes-a-money-transfer-endpoint-safe](07-Common-Backend-Problems.md#11-walk-through-what-makes-a-money-transfer-endpoint-safe)*

### 12. Why does locking accounts in a fixed order prevent the deadlock, specifically?

**Answer:** If each transfer locks its own "from" account first, two transfers running in opposite directions can each end up holding the lock the other one needs — and neither can move. Locking by a fixed, direction-independent rule — always the lower account ID first, say — means both transfers reach for the same first lock, so one just waits for the other to finish instead of the two waiting on each other forever.

*Source: [07-Common-Backend-Problems.md#12-why-does-locking-accounts-in-a-fixed-order-prevent-the-deadlock-specifically](07-Common-Backend-Problems.md#12-why-does-locking-accounts-in-a-fixed-order-prevent-the-deadlock-specifically)*

## [8. AOP, Actuator, and Microservice Communication (Beginner-Friendly)](08-AOP-Actuator-Microservices.md)

### 1. How does Spring implement `@Transactional` under the hood?

**Answer:** It's all built on an AOP proxy. Spring wraps the bean in a proxy that starts a transaction before the annotated method runs, and commits or rolls back afterward based on the outcome. Because that proxy sits *around* the bean, calling the annotated method from outside — through the proxy — triggers it correctly. Calling it via `this` from inside the same bean skips the proxy entirely, so nothing happens.

*Source: [08-AOP-Actuator-Microservices.md#1-how-does-spring-implement-transactional-under-the-hood](08-AOP-Actuator-Microservices.md#1-how-does-spring-implement-transactional-under-the-hood)*

### 2. What is a join point, a pointcut, and advice?

**Answer:** A join point is a candidate point in execution — in Spring AOP, that's almost always a method call. A pointcut is an expression that picks out which join points actually match, like `@annotation(Loggable)` or `execution(* com.example.service.*.*(..))`. Advice is the actual code that runs at a matched join point — `@Before`, `@After`, `@AfterReturning`, `@AfterThrowing`, or `@Around`, which is the only one that can wrap the call, change its return value, or short-circuit it entirely.

**Follow-up:** What's an aspect? A class marked `@Aspect` that bundles one or more pointcut-and-advice pairs together.

*Source: [08-AOP-Actuator-Microservices.md#2-what-is-a-join-point-a-pointcut-and-advice](08-AOP-Actuator-Microservices.md#2-what-is-a-join-point-a-pointcut-and-advice)*

### 3. Why does self-invocation break `@Async`/`@Transactional`?

**Answer:** Both are proxy-based, so this is really the same bug wearing two names. `this.method()` calls the real object directly, never passing through the Spring-generated proxy that would've started the transaction or submitted the async task. Fix it by calling through another bean, or by injecting the bean's own proxy via `ApplicationContext` or self-injection.

*Source: [08-AOP-Actuator-Microservices.md#3-why-does-self-invocation-break-asynctransactional](08-AOP-Actuator-Microservices.md#3-why-does-self-invocation-break-asynctransactional)*

### 4. Compare Filter, Interceptor, and AOP — when would you reach for each?

**Answer:** Each one operates at a different layer. A Filter runs at the servlet layer, before Spring MVC even sees the request, with no awareness of Spring beans at all — good for something like auth-header parsing or CORS that has to apply to every request, even ones MVC never routes to a controller. An Interceptor runs inside Spring MVC, around the resolved controller method, with access to the handler — good for MVC-specific things like adding common model attributes. AOP wraps any Spring bean method no matter how it was invoked — and it's the only one of the three that can advise something like a scheduled job or a message listener, which has no HTTP request to speak of.

*Source: [08-AOP-Actuator-Microservices.md#4-compare-filter-interceptor-and-aop--when-would-you-reach-for-each](08-AOP-Actuator-Microservices.md#4-compare-filter-interceptor-and-aop--when-would-you-reach-for-each)*

### 5. What does the Actuator `/health` endpoint actually check?

**Answer:** It aggregates the status of every registered `HealthIndicator` bean — built-in ones for the database, disk space, message brokers, plus any custom `HealthIndicator` you add for something like a payment gateway. The endpoint's overall status is simply the worst of all those individual checks.

*Source: [08-AOP-Actuator-Microservices.md#5-what-does-the-actuator-health-endpoint-actually-check](08-AOP-Actuator-Microservices.md#5-what-does-the-actuator-health-endpoint-actually-check)*

### 6. Why is exposing Actuator endpoints without authentication risky?

**Answer:** Endpoints like `/actuator/env`, `/actuator/heapdump`, or `/actuator/httptrace` can leak configuration secrets, raw memory contents, or recent request bodies. Only expose what you actually need, and put Actuator behind authentication — or a separate, network-restricted management port — in production.

*Source: [08-AOP-Actuator-Microservices.md#6-why-is-exposing-actuator-endpoints-without-authentication-risky](08-AOP-Actuator-Microservices.md#6-why-is-exposing-actuator-endpoints-without-authentication-risky)*

### 7. What is the difference between the Actuator liveness and readiness probes, and why does mixing them up cause outages?

**Answer:** Liveness is asking one question: "should this process be killed and restarted?" It should only fail for something a restart genuinely fixes, like deadlocked internal state. Readiness asks a different question: "can this instance accept traffic right now?" It should fail during startup, or when a required downstream dependency is down, so the load balancer just pauses traffic without killing the instance. Wire a downstream dependency check into liveness by mistake, and a brief database blip gets "fixed" by restarting every pod — which usually makes the outage worse and longer, not better.

*Source: [08-AOP-Actuator-Microservices.md#7-what-is-the-difference-between-the-actuator-liveness-and-readiness-probes-and-why-does-mixing-them-up-cause-outages](08-AOP-Actuator-Microservices.md#7-what-is-the-difference-between-the-actuator-liveness-and-readiness-probes-and-why-does-mixing-them-up-cause-outages)*

### 8. WebClient versus RestTemplate versus Feign — how do you choose?

**Answer:** `RestTemplate` is blocking and in maintenance mode — avoid it for new code. `WebClient` is the current, non-blocking client, usable in both reactive and traditional apps, though calling `.block()` on it in a traditional app brings back the blocking-thread cost. `Feign` trades some explicitness for a clean declarative interface — good for a lot of simple internal calls, but you still have to configure its timeouts explicitly, since the interface hides the HTTP details from you.

*Source: [08-AOP-Actuator-Microservices.md#8-webclient-versus-resttemplate-versus-feign--how-do-you-choose](08-AOP-Actuator-Microservices.md#8-webclient-versus-resttemplate-versus-feign--how-do-you-choose)*

### 9. Why do you need service discovery instead of hardcoded URLs?

**Answer:** In a scaled deployment, instance counts and addresses change constantly. A discovery service like Eureka lets a caller ask for the current list of healthy instances at call time, instead of relying on a fixed address that might already be stale — and a client-side load balancer then spreads calls across those instances.

*Source: [08-AOP-Actuator-Microservices.md#9-why-do-you-need-service-discovery-instead-of-hardcoded-urls](08-AOP-Actuator-Microservices.md#9-why-do-you-need-service-discovery-instead-of-hardcoded-urls)*

### 10. What does Resilience4j's circuit breaker actually prevent?

**Answer:** It stops sending calls to a dependency that's already failing, so you're not wasting latency and piling on more load while that dependency tries to recover — and it periodically lets one trial request through, in a half-open state, to test whether recovery happened. It doesn't fix the underlying failure by itself, so it has to be paired with a meaningful, non-misleading fallback and with timeouts.

*Source: [08-AOP-Actuator-Microservices.md#10-what-does-resilience4js-circuit-breaker-actually-prevent](08-AOP-Actuator-Microservices.md#10-what-does-resilience4js-circuit-breaker-actually-prevent)*

### 11. Is a `@FeignClient` call automatically resilient?

**Answer:** No. Feign only makes the call declarative — it doesn't add retries, circuit breaking, or bounded timeouts on its own. Those all need explicit configuration: Resilience4j annotations, Feign's own timeout properties, or both together.

*Source: [08-AOP-Actuator-Microservices.md#11-is-a-feignclient-call-automatically-resilient](08-AOP-Actuator-Microservices.md#11-is-a-feignclient-call-automatically-resilient)*

### 12. Why must a `@KafkaListener` or `@RabbitListener` handler be idempotent?

**Answer:** Both Kafka and RabbitMQ give at-least-once delivery by default. If the consumer crashes after processing but before acknowledging, or a consumer-group rebalance happens, the same message gets redelivered. A handler that isn't safe to run twice will double-apply that message's effect. The fix is checking a processed-message-ID table, or relying on a natural unique constraint, before applying the effect — never assuming delivery happens exactly once.

**Follow-up:** Does Kafka guarantee ordering across a whole topic? No — only within a single partition. Events that must stay in order relative to each other need to share a partition key, typically an entity ID like the order ID.

*Source: [08-AOP-Actuator-Microservices.md#12-why-must-a-kafkalistener-or-rabbitlistener-handler-be-idempotent](08-AOP-Actuator-Microservices.md#12-why-must-a-kafkalistener-or-rabbitlistener-handler-be-idempotent)*

### 13. Name three design patterns visible in the Spring Framework itself.

**Answer:** Three solid ones to name: Proxy — the AOP mechanism behind `@Transactional` and `@Async`. Singleton — the default bean scope. And Template Method — `JdbcTemplate` and `RestTemplate` fix the overall workflow while your callback code supplies the one varying step. Factory (`BeanFactory`) and Observer (`ApplicationEventPublisher`) are also solid answers if asked for more.

*Source: [08-AOP-Actuator-Microservices.md#13-name-three-design-patterns-visible-in-the-spring-framework-itself](08-AOP-Actuator-Microservices.md#13-name-three-design-patterns-visible-in-the-spring-framework-itself)*

## [9. Spring Boot Annotations Reference](09-Annotations-Reference.md)

### 1. `@Component` vs `@Service` vs `@Repository` — what's actually different at runtime?

**Answer:** Nothing mechanically — all three register a bean exactly the same way. `@Repository` is the one exception with an actual runtime effect: it additionally enables persistence-exception translation. Beyond that, the difference is purely about communicating intent to whoever reads the code next.

*Source: [09-Annotations-Reference.md#1-component-vs-service-vs-repository--whats-actually-different-at-runtime](09-Annotations-Reference.md#1-component-vs-service-vs-repository--whats-actually-different-at-runtime)*

### 2. When do you reach for `@Bean` instead of a stereotype annotation?

**Answer:** Reach for `@Bean` when the class isn't yours to annotate — a third-party library type — or when constructing it needs explicit setup logic that a bare `@Component` on the class itself just can't express.

*Source: [09-Annotations-Reference.md#2-when-do-you-reach-for-bean-instead-of-a-stereotype-annotation](09-Annotations-Reference.md#2-when-do-you-reach-for-bean-instead-of-a-stereotype-annotation)*

### 3. Why doesn't `@Autowired` need to be written on most constructors today?

**Answer:** Spring automatically treats a class's single constructor as its injection point — no annotation needed. `@Autowired` only becomes necessary when a class has more than one constructor and you need to tell Spring explicitly which one to use for injection.

*Source: [09-Annotations-Reference.md#3-why-doesnt-autowired-need-to-be-written-on-most-constructors-today](09-Annotations-Reference.md#3-why-doesnt-autowired-need-to-be-written-on-most-constructors-today)*

### 4. What's the actual difference between `@Valid` and `@Validated`?

**Answer:** `@Valid` is the standard Bean Validation trigger. `@Validated` is Spring's own variant, and its one extra trick is supporting validation groups — applying a different subset of constraints depending on context, like creation versus update. Otherwise, the two behave the same.

*Source: [09-Annotations-Reference.md#4-whats-the-actual-difference-between-valid-and-validated](09-Annotations-Reference.md#4-whats-the-actual-difference-between-valid-and-validated)*

### 5. Why does `@Transactional` (or `@Async`, or `@PreAuthorize`) sometimes appear to do nothing?

**Answer:** All three run on the same proxy mechanism, so this is really one bug with three names. A call from inside the same class via `this.method()` never passes through that proxy — so the transaction never starts, the async submission never happens, and the authorization check never runs, all with no error thrown to warn you. The fix is always the same: call through a different bean.

*Source: [09-Annotations-Reference.md#5-why-does-transactional-or-async-or-preauthorize-sometimes-appear-to-do-nothing](09-Annotations-Reference.md#5-why-does-transactional-or-async-or-preauthorize-sometimes-appear-to-do-nothing)*

### 6. What's the default fetch type for each JPA relationship annotation, and why does it matter?

**Answer:** `@ManyToOne` and `@OneToOne` default to EAGER. `@OneToMany` and `@ManyToMany` default to LAZY. Get this backwards from what you expect, and you'll hit one of two problems: an unnecessary eager join loading data you never needed, or a `LazyInitializationException` when a lazy relationship gets accessed outside its transaction.

*Source: [09-Annotations-Reference.md#6-whats-the-default-fetch-type-for-each-jpa-relationship-annotation-and-why-does-it-matter](09-Annotations-Reference.md#6-whats-the-default-fetch-type-for-each-jpa-relationship-annotation-and-why-does-it-matter)*

### 7. Is `@AllArgsConstructor` always dangerous on a Spring bean?

**Answer:** Only when Spring itself is the one constructing the class — a `@Service`, `@Component`, and so on. Spring tries to inject a bean into every constructor parameter, and a plain non-dependency field forced into that constructor has no bean to satisfy it, so startup breaks. On a DTO or entity that Spring never constructs itself, it's completely fine.

*Source: [09-Annotations-Reference.md#7-is-allargsconstructor-always-dangerous-on-a-spring-bean](09-Annotations-Reference.md#7-is-allargsconstructor-always-dangerous-on-a-spring-bean)*

### 8. Why does a `@Scheduled` job sometimes run more often than expected in production?

**Answer:** Because every instance in a multi-instance deployment runs its own independent copy of the schedule — with three instances running, the job fires three times, not once. Fixing it needs a distributed lock, or a scheduling mechanism that's actually aware of the multiple instances — the annotation alone doesn't handle that.

*Source: [09-Annotations-Reference.md#8-why-does-a-scheduled-job-sometimes-run-more-often-than-expected-in-production](09-Annotations-Reference.md#8-why-does-a-scheduled-job-sometimes-run-more-often-than-expected-in-production)*
