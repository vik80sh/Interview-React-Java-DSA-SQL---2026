# Master Question Bank — Spring Boot Interview Prep

This file aggregates every interview question and its full answer from every file in this folder ([Backend/Springboot](.)), in one place, so you can review the entire question set without opening each file individually. Each entry reproduces the question and its complete answer (and follow-up, where one exists) verbatim from its source file, and is followed by a link back to that exact heading in the original file for the surrounding explanation, code examples, and revision checklist that give it fuller context.

## [1. Spring Boot Fundamentals (Beginner-Friendly)](01-Spring-Boot-Fundamentals.md)

### 1. What's the difference between IoC and DI?

**Answer:** DI is a technique: a class declares what it needs and something else supplies it, instead of the class creating it with `new`. IoC is the broader principle that control over creating and wiring objects has moved to a container. Spring uses DI as the mechanism to implement IoC.

**Follow-up:** Why is constructor injection preferred over field injection? It makes required dependencies explicit and impossible to omit, allows `final` fields, and makes unit testing trivial.

*Source: [01-Spring-Boot-Fundamentals.md#1-whats-the-difference-between-ioc-and-di](01-Spring-Boot-Fundamentals.md#1-whats-the-difference-between-ioc-and-di)*

### 2. How does Spring find and create a bean?

**Answer:** Component scanning finds stereotype-annotated classes, `@Configuration` classes contribute `@Bean` methods, and auto-configuration adds conditional beans. Spring creates each bean, resolves constructor dependencies, wires matching beans in, applies proxies, and stores the result in the application context.

*Source: [01-Spring-Boot-Fundamentals.md#2-how-does-spring-find-and-create-a-bean](01-Spring-Boot-Fundamentals.md#2-how-does-spring-find-and-create-a-bean)*

### 3. What's actually different between `@Component`, `@Service`, and `@Repository`?

**Answer:** Mechanically nothing — all three make a class a discoverable bean. The difference is intent: `@Service` signals business logic, `@Repository` signals persistence code (plus exception translation), `@Component` is the generic fallback.

*Source: [01-Spring-Boot-Fundamentals.md#3-whats-actually-different-between-component-service-and-repository](01-Spring-Boot-Fundamentals.md#3-whats-actually-different-between-component-service-and-repository)*

### 4. When would you use `@Bean` instead of a stereotype annotation?

**Answer:** Stereotype annotations only work on classes you wrote. For a third-party class, or one needing explicit construction, write a `@Bean` factory method inside a `@Configuration` class instead.

*Source: [01-Spring-Boot-Fundamentals.md#4-when-would-you-use-bean-instead-of-a-stereotype-annotation](01-Spring-Boot-Fundamentals.md#4-when-would-you-use-bean-instead-of-a-stereotype-annotation)*

### 5. Are `@Service`/`@Component`/`@Repository` themselves dependency injection?

**Answer:** No. They only register a class as a bean so Spring's container creates and manages it — that's the IoC/registration side. DI is a separate, later step: it's what happens at a bean's *constructor*, when Spring supplies a matching bean for each declared parameter. You could swap `@Service` for `@Component` on a class and its injection behavior wouldn't change at all, which is proof the stereotype annotation isn't what performs the injecting.

*Source: [01-Spring-Boot-Fundamentals.md#5-are-servicecomponentrepository-themselves-dependency-injection](01-Spring-Boot-Fundamentals.md#5-are-servicecomponentrepository-themselves-dependency-injection)*

### 6. Why might `@Transactional` appear to silently not work?

**Answer:** It's implemented via a proxy. A self-invocation from inside the same class bypasses the proxy entirely. It can also fail to roll back on a checked exception without `rollbackFor`.

*Source: [01-Spring-Boot-Fundamentals.md#6-why-might-transactional-appear-to-silently-not-work](01-Spring-Boot-Fundamentals.md#6-why-might-transactional-appear-to-silently-not-work)*

### 7. What is Spring Boot auto-configuration, concretely?

**Answer:** Conditionally-activated configuration classes, gated by annotations like `@ConditionalOnClass` and `@ConditionalOnMissingBean`, that create default beans when certain libraries are present and no conflicting bean already exists.

*Source: [01-Spring-Boot-Fundamentals.md#7-what-is-spring-boot-auto-configuration-concretely](01-Spring-Boot-Fundamentals.md#7-what-is-spring-boot-auto-configuration-concretely)*

### 8. Why should a controller return a DTO instead of the entity?

**Answer:** Returning the entity couples the API to the database schema, risks serializing fields never meant to be public, and can trigger lazy-loading errors. A DTO keeps the API and the database model free to evolve independently.

*Source: [01-Spring-Boot-Fundamentals.md#8-why-should-a-controller-return-a-dto-instead-of-the-entity](01-Spring-Boot-Fundamentals.md#8-why-should-a-controller-return-a-dto-instead-of-the-entity)*

### 9. What makes a singleton bean unsafe, and when?

**Answer:** Only when it stores mutable, request-specific state in an instance field — concurrent requests would race on that field. Request data should live in local variables, not bean fields.

*Source: [01-Spring-Boot-Fundamentals.md#9-what-makes-a-singleton-bean-unsafe-and-when](01-Spring-Boot-Fundamentals.md#9-what-makes-a-singleton-bean-unsafe-and-when)*

### 10. How would you debug a bean Spring says it can't find?

**Answer:** Check the class is within component-scan's package boundary, check `@Profile`/`@Conditional*` properties, check the constructor's dependencies are themselves satisfiable, and check whether multiple candidates need a `@Qualifier`. Read the actual startup error and condition evaluation report before adding speculative annotations.

*Source: [01-Spring-Boot-Fundamentals.md#10-how-would-you-debug-a-bean-spring-says-it-cant-find](01-Spring-Boot-Fundamentals.md#10-how-would-you-debug-a-bean-spring-says-it-cant-find)*

### 11. Walk through the request flow in Spring MVC.

**Answer:** Filters run first, then `DispatcherServlet` matches the request to a controller method. Argument resolvers build the method's parameters, the controller delegates to a service, and a message converter serializes the response. `@RestControllerAdvice` can centralize exception handling across controllers.

*Source: [01-Spring-Boot-Fundamentals.md#11-walk-through-the-request-flow-in-spring-mvc](01-Spring-Boot-Fundamentals.md#11-walk-through-the-request-flow-in-spring-mvc)*

### 12. How does Spring handle a circular dependency, and how do you actually fix it?

**Answer:** With constructor injection, Spring fails startup immediately with `BeanCurrentlyInCreationException`. The real fix is to remove the cycle — extract shared behavior into a third bean, or make the dependency one-directional. `@Lazy` unblocks startup but is a stopgap, not a design fix.

*Source: [01-Spring-Boot-Fundamentals.md#12-how-does-spring-handle-a-circular-dependency-and-how-do-you-actually-fix-it](01-Spring-Boot-Fundamentals.md#12-how-does-spring-handle-a-circular-dependency-and-how-do-you-actually-fix-it)*

### 13. Why can adding an unrelated `boolean` field to a `@Service` class break startup?

**Answer:** If the class uses `@AllArgsConstructor`, every field — not just `final` dependencies — becomes a constructor parameter, including the new `boolean`. Spring has no bean of that type, so startup fails with `NoSuchBeanDefinitionException`, an error naming a missing bean when the real cause is the Lombok annotation. `@RequiredArgsConstructor` avoids this by only including `final` fields. Note this trap is specific to Spring beans — the same annotation on a plain DTO or entity is completely fine, since Spring never constructs those.

*Source: [01-Spring-Boot-Fundamentals.md#13-why-can-adding-an-unrelated-boolean-field-to-a-service-class-break-startup](01-Spring-Boot-Fundamentals.md#13-why-can-adding-an-unrelated-boolean-field-to-a-service-class-break-startup)*

### 14. What's the difference between `BeanFactory` and `ApplicationContext`?

**Answer:** `BeanFactory` is the root container: lazy bean creation, only built when first requested. `ApplicationContext` extends it with eager singleton initialization, event publication, internationalization, and AOP integration. Every real app runs on an `ApplicationContext`.

*Source: [01-Spring-Boot-Fundamentals.md#14-whats-the-difference-between-beanfactory-and-applicationcontext](01-Spring-Boot-Fundamentals.md#14-whats-the-difference-between-beanfactory-and-applicationcontext)*

### 15. What does `@ConditionalOnMissingBean` actually enable?

**Answer:** It makes an auto-configured bean activate only if no bean of that type already exists. Your own `@Bean` is seen first, so the auto-configured version never activates — no conflict, by design.

*Source: [01-Spring-Boot-Fundamentals.md#15-what-does-conditionalonmissingbean-actually-enable](01-Spring-Boot-Fundamentals.md#15-what-does-conditionalonmissingbean-actually-enable)*

### 16. Besides `@PostConstruct`/`@PreDestroy`, what else hooks into a bean's lifecycle?

**Answer:** `InitializingBean`/`DisposableBean` give identical timing via interfaces, and a separately-registered `BeanPostProcessor` can inspect or wrap every bean around its initialization — the mechanism Spring uses internally to attach proxies like the one behind `@Transactional`.

*Source: [01-Spring-Boot-Fundamentals.md#16-besides-postconstructpredestroy-what-else-hooks-into-a-beans-lifecycle](01-Spring-Boot-Fundamentals.md#16-besides-postconstructpredestroy-what-else-hooks-into-a-beans-lifecycle)*

## [2. REST API Design (Beginner-Friendly)](02-REST-API-Design.md)

### 1. Is `PATCH` idempotent?

**Answer:** Not inherently — it depends on the operation. `PATCH {"name":"Ana"}` is idempotent because repeating it leaves the same value. `PATCH {"op":"increment","amount":1}` is not, since repeating it keeps incrementing. The patch format and server behavior decide, not the method name alone.

*Source: [02-REST-API-Design.md#1-is-patch-idempotent](02-REST-API-Design.md#1-is-patch-idempotent)*

### 2. `PUT` versus `PATCH`?

**Answer:** `PUT` replaces the entire representation at a URI and is idempotent. `PATCH` applies a partial change and may or may not be idempotent depending on what the change actually does. Either way, the API must explicitly define what an omitted field means versus an explicit `null`.

*Source: [02-REST-API-Design.md#2-put-versus-patch](02-REST-API-Design.md#2-put-versus-patch)*

### 3. `401` versus `403`?

**Answer:** `401` means the request lacks valid authentication — the server doesn't know who's calling. `403` means the server knows exactly who's calling, and that caller isn't allowed to do this. Never use `401` just because a business rule rejected an already-authenticated user.

*Source: [02-REST-API-Design.md#3-401-versus-403](02-REST-API-Design.md#3-401-versus-403)*

### 4. How would you make a payment endpoint safe to retry?

**Answer:** Require an idempotency key scoped to the account, enforce a unique database constraint on it, atomically claim the key together with a hash of the request, and return the originally stored result if the same key is retried. Return a conflict if the same key shows up with different request parameters.

*Source: [02-REST-API-Design.md#4-how-would-you-make-a-payment-endpoint-safe-to-retry](02-REST-API-Design.md#4-how-would-you-make-a-payment-endpoint-safe-to-retry)*

### 5. How do you design pagination for millions of rows?

**Answer:** Use a bounded, clamped page size, a deterministic and uniquely-ordered sort, and keyset pagination with an opaque cursor for anything large or frequently changing. Validate sort fields against an explicit allowlist. Reach for offset pagination only when clients need direct random page access and the dataset stays modest in size.

*Source: [02-REST-API-Design.md#5-how-do-you-design-pagination-for-millions-of-rows](02-REST-API-Design.md#5-how-do-you-design-pagination-for-millions-of-rows)*

### 6. Why use DTOs instead of binding directly to the entity?

**Answer:** A request DTO prevents mass assignment — a caller setting fields like `role` that only an internal process should control — simply because those fields don't exist on the DTO. A response DTO protects the API from persistence changes and avoids accidentally serializing internal fields or lazily-loaded relationships.

*Source: [02-REST-API-Design.md#6-why-use-dtos-instead-of-binding-directly-to-the-entity](02-REST-API-Design.md#6-why-use-dtos-instead-of-binding-directly-to-the-entity)*

### 7. When do you return `202`?

**Answer:** When a request is accepted but the work isn't finished yet — starting an asynchronous export, for example. Return a status resource or polling URL so the client can check on completion rather than blocking the original request.

*Source: [02-REST-API-Design.md#7-when-do-you-return-202](02-REST-API-Design.md#7-when-do-you-return-202)*

### 8. How should a generic, unexpected exception be handled?

**Answer:** Log it with full context and a correlation ID internally, return a stable and generic error body externally, never leak a stack trace or raw exception message, and map any *known* domain failures to their own specific status codes rather than letting everything fall through to a 500.

*Source: [02-REST-API-Design.md#8-how-should-a-generic-unexpected-exception-be-handled](02-REST-API-Design.md#8-how-should-a-generic-unexpected-exception-be-handled)*

### 9. What is an `ETag` actually useful for?

**Answer:** Two things — cache validation via `If-None-Match` (skip resending unchanged data, returning `304` instead) and concurrency control via `If-Match` (reject an update if the resource changed since the client last read it, preventing a silent lost update).

*Source: [02-REST-API-Design.md#9-what-is-an-etag-actually-useful-for](02-REST-API-Design.md#9-what-is-an-etag-actually-useful-for)*

### 10. REST or RPC-style endpoints?

**Answer:** Standard resource CRUD (Create, Read, Update, Delete) and HTTP-level caching benefit from REST's resource model. Command-heavy workflows (like "capture this payment") are often clearer as an explicit action endpoint. The choice should follow the domain, consistency, and client needs — not treating "REST" as a rule to force everything into.

*Source: [02-REST-API-Design.md#10-rest-or-rpc-style-endpoints](02-REST-API-Design.md#10-rest-or-rpc-style-endpoints)*

### 11. When would you write a custom Bean Validation constraint instead of composing built-in ones?

**Answer:** When the rule needs real logic beyond a static check — membership in a business-defined set, comparing two fields against each other, or a lookup. Implement `ConstraintValidator`, treat `null` as valid inside it (pairing it with a separate `@NotNull` for "required"), and use a class-level constraint instead of a field-level one when the rule spans multiple fields.

*Source: [02-REST-API-Design.md#11-when-would-you-write-a-custom-bean-validation-constraint-instead-of-composing-built-in-ones](02-REST-API-Design.md#11-when-would-you-write-a-custom-bean-validation-constraint-instead-of-composing-built-in-ones)*

## [3. Database, JPA, and Hibernate (Beginner-Friendly)](03-Database-JPA-Hibernate.md)

### 1. What's the actual difference between JPA, Hibernate, and Spring Data JPA?

**Answer:** JPA is the specification — a set of standard interfaces and annotations. Hibernate is the most common implementation of that specification — it's the library that actually generates SQL and executes it. Spring Data JPA sits a layer above both, generating a working repository implementation from an interface so you don't hand-write basic CRUD methods.

*Source: [03-Database-JPA-Hibernate.md#1-whats-the-actual-difference-between-jpa-hibernate-and-spring-data-jpa](03-Database-JPA-Hibernate.md#1-whats-the-actual-difference-between-jpa-hibernate-and-spring-data-jpa)*

### 2. What is dirty checking, and why does an entity update without an explicit `save()` call?

**Answer:** Hibernate tracks every managed entity's field values against a snapshot taken when it was loaded. At flush time — normally just before commit — it compares current values to that snapshot and generates `UPDATE` statements for anything that changed, which is why a plain setter call inside a `@Transactional` method is enough to persist a change.

*Source: [03-Database-JPA-Hibernate.md#2-what-is-dirty-checking-and-why-does-an-entity-update-without-an-explicit-save-call](03-Database-JPA-Hibernate.md#2-what-is-dirty-checking-and-why-does-an-entity-update-without-an-explicit-save-call)*

### 3. `save()` versus `flush()`?

**Answer:** `save()` makes an entity persistent (if it was transient) or merges it back in (if it was detached) — one call that adapts to whatever state the entity is in. `flush()` sends any pending SQL to the database immediately, without ending the transaction; a single transaction can flush multiple times before it finally commits.

*Source: [03-Database-JPA-Hibernate.md#3-save-versus-flush](03-Database-JPA-Hibernate.md#3-save-versus-flush)*

### 4. What decides the owning side of a relationship, and why does it matter?

**Answer:** The side that physically holds the foreign key column — marked with `@JoinColumn` or `@JoinTable` — is the owning side; Hibernate only persists writes made through that side. The other side, marked `mappedBy`, is inverse and read-only from Hibernate's perspective. In `@OneToMany`/`@ManyToOne`, the "many" side almost always owns the relationship, since that's where the foreign key column actually lives. Updating only the inverse-side collection in memory and forgetting the owning side is a common real bug: nothing gets saved.

*Source: [03-Database-JPA-Hibernate.md#4-what-decides-the-owning-side-of-a-relationship-and-why-does-it-matter](03-Database-JPA-Hibernate.md#4-what-decides-the-owning-side-of-a-relationship-and-why-does-it-matter)*

### 5. Why shouldn't you add extra columns directly to a `@ManyToMany` relationship?

**Answer:** `@ManyToMany` with `@JoinTable` can only ever map the two foreign keys — there's no entity to attach an extra column like `enrolledAt` to. The fix is to stop modeling it as `@ManyToMany` and introduce an explicit join entity (e.g., `Enrollment`) with a `@ManyToOne` to each side, which is a normal entity you can add any field to.

*Source: [03-Database-JPA-Hibernate.md#5-why-shouldnt-you-add-extra-columns-directly-to-a-manytomany-relationship](03-Database-JPA-Hibernate.md#5-why-shouldnt-you-add-extra-columns-directly-to-a-manytomany-relationship)*

### 6. Why can `equals()`/`hashCode()` on a JPA entity cause subtle bugs?

**Answer:** Identity-based defaults break across a detach/merge cycle, and hashing a mutable, database-generated `id` breaks `HashSet`/`HashMap` lookups if the entity is added before it's persisted (`id == null`) and looked up afterward (`id` now assigned) — it lands in a different bucket. Prefer a natural business key for `equals`/`hashCode` when one exists, or a constant hash code paired with ID-based equality that treats distinct transient instances as unequal to each other.

*Source: [03-Database-JPA-Hibernate.md#6-why-can-equalshashcode-on-a-jpa-entity-cause-subtle-bugs](03-Database-JPA-Hibernate.md#6-why-can-equalshashcode-on-a-jpa-entity-cause-subtle-bugs)*

### 7. Explain the N+1 problem and how you'd fix it.

**Answer:** One query loads a list of parent entities, and then accessing a lazy association on each parent individually fires one additional query per parent — N extra queries on top of the original one. Fix it with a targeted fetch join, `@EntityGraph`, batch fetching, or a DTO projection for the specific use case; never by making the relationship eager globally, since that only shifts the cost onto every other use case that didn't need the data.

*Source: [03-Database-JPA-Hibernate.md#7-explain-the-n1-problem-and-how-youd-fix-it](03-Database-JPA-Hibernate.md#7-explain-the-n1-problem-and-how-youd-fix-it)*

### 8. Why is `@ManyToOne(fetch = LAZY)` written out explicitly so often, when `LAZY` isn't even the JPA default there?

**Answer:** That's exactly the point — JPA's default for `@ManyToOne` (and `@OneToOne`) is EAGER, which silently loads the associated entity on every query, whether or not the current use case needs it. Writing `fetch = FetchType.LAZY` explicitly overrides that default so each use case controls what it actually loads.

*Source: [03-Database-JPA-Hibernate.md#8-why-is-manytoonefetch--lazy-written-out-explicitly-so-often-when-lazy-isnt-even-the-jpa-default-there](03-Database-JPA-Hibernate.md#8-why-is-manytoonefetch--lazy-written-out-explicitly-so-often-when-lazy-isnt-even-the-jpa-default-there)*

### 9. What does `@Transactional` actually guarantee, and what can it not do?

**Answer:** It defines an all-or-nothing boundary for the database operations inside it, through Spring's proxy mechanism (file 01 covers proxies generally) — all writes commit together or all roll back together. It cannot roll back things outside the database, like an email that already went out or an external HTTP call that already succeeded.

*Source: [03-Database-JPA-Hibernate.md#9-what-does-transactional-actually-guarantee-and-what-can-it-not-do](03-Database-JPA-Hibernate.md#9-what-does-transactional-actually-guarantee-and-what-can-it-not-do)*

### 10. Walk through dirty read, non-repeatable read, and phantom read.

**Answer:** A dirty read sees another transaction's uncommitted change, which might later be rolled back. A non-repeatable read gets a different value reading the *same row* twice in one transaction, because another transaction committed a change in between. A phantom read gets a different *set of rows* running the same query twice in one transaction, because another transaction inserted or deleted a matching row in between. Higher isolation levels prevent more of these at the cost of more locking.

*Source: [03-Database-JPA-Hibernate.md#10-walk-through-dirty-read-non-repeatable-read-and-phantom-read](03-Database-JPA-Hibernate.md#10-walk-through-dirty-read-non-repeatable-read-and-phantom-read)*

### 11. Optimistic versus pessimistic locking — how do you choose?

**Answer:** Optimistic locking (via `@Version`) allows concurrent reads and only detects a conflict at write time, throwing an exception the caller must handle by retrying — good for low-conflict situations where most attempts succeed. Pessimistic locking (`SELECT ... FOR UPDATE`) blocks other transactions from touching the row for the duration, suiting short, highly-contended critical sections where a retry would be more expensive than briefly blocking.

*Source: [03-Database-JPA-Hibernate.md#11-optimistic-versus-pessimistic-locking--how-do-you-choose](03-Database-JPA-Hibernate.md#11-optimistic-versus-pessimistic-locking--how-do-you-choose)*

### 12. Why can a bulk update be dangerous, even though it's efficient?

**Answer:** A bulk `UPDATE`/`DELETE` bypasses the persistence context entirely — no dirty checking, no lifecycle callbacks. Any entity already loaded as managed earlier in the same transaction keeps its old, now-stale in-memory values, unaware the database changed underneath it. Use `clearAutomatically = true`, a separate transaction, or an explicit reload afterward.

*Source: [03-Database-JPA-Hibernate.md#12-why-can-a-bulk-update-be-dangerous-even-though-its-efficient](03-Database-JPA-Hibernate.md#12-why-can-a-bulk-update-be-dangerous-even-though-its-efficient)*

### 13. Why are database constraints still necessary if the application already validates input?

**Answer:** Application validation runs per-request; two concurrent requests can both pass the same check before either one writes, because the check and the write aren't atomic together. A database-level `UNIQUE` or foreign-key constraint is enforced at the actual point of writing and is the only guarantee that holds regardless of request timing.

*Source: [03-Database-JPA-Hibernate.md#13-why-are-database-constraints-still-necessary-if-the-application-already-validates-input](03-Database-JPA-Hibernate.md#13-why-are-database-constraints-still-necessary-if-the-application-already-validates-input)*

### 14. How would you investigate a slow query in production?

**Answer:** Capture the actual generated SQL and its parameters, check how many queries a single request issues (ruling out N+1), inspect the query plan with `EXPLAIN`, verify the relevant columns are indexed and that the index is actually being used (not defeated by a wrapped function or leading wildcard), then consider a projection, pagination, or query rewrite — and measure before and after the change.

*Source: [03-Database-JPA-Hibernate.md#14-how-would-you-investigate-a-slow-query-in-production](03-Database-JPA-Hibernate.md#14-how-would-you-investigate-a-slow-query-in-production)*

### 15. How would you build a search endpoint with several independent optional filters?

**Answer:** Not with one JPQL string per possible filter combination. Use Spring Data's `Specification` (or Querydsl) to compose predicates at runtime, returning `null` from a predicate when that particular filter wasn't supplied — which composes cleanly with `Specification.where(...).and(...)` — then pass the combined result to `findAll(spec, pageable)`.

*Source: [03-Database-JPA-Hibernate.md#15-how-would-you-build-a-search-endpoint-with-several-independent-optional-filters](03-Database-JPA-Hibernate.md#15-how-would-you-build-a-search-endpoint-with-several-independent-optional-filters)*

### 16. Why does testing a query against H2 not prove it works in production?

**Answer:** Different databases parse and optimize SQL differently, and database-specific functions or behaviors simply don't exist in an in-memory test database like H2. `@DataJpaTest` against H2 is a reasonable check that mappings and query shapes are correct, but Testcontainers — running the actual production database engine for the test — is what actually proves a query behaves the same way in production.

*Source: [03-Database-JPA-Hibernate.md#16-why-does-testing-a-query-against-h2-not-prove-it-works-in-production](03-Database-JPA-Hibernate.md#16-why-does-testing-a-query-against-h2-not-prove-it-works-in-production)*

## [4. Authentication and Security (Beginner-Friendly)](04-Authentication-Security.md)

### 1. Authentication versus authorization?

**Answer:** Authentication verifies who is making the request. Authorization checks whether that already-established identity is allowed to perform a specific action on a specific resource. A role check alone answers a coarser question than authorization usually requires — it says what kind of user someone is, not which specific records they're entitled to touch.

**Follow-up:** Why isn't `hasRole("USER")` enough to protect `PUT /users/{id}`? Because any user with that role passes the check regardless of which `id` is in the URL — you also need to verify the authenticated caller actually owns or is entitled to that specific resource.

*Source: [04-Authentication-Security.md#1-authentication-versus-authorization](04-Authentication-Security.md#1-authentication-versus-authorization)*

### 2. What is IDOR, and how do you prevent it?

**Answer:** Insecure Direct Object Reference — trusting an identifier taken from the request (a URL path variable, a query parameter) without verifying the authenticated caller is actually entitled to that specific object. Prevent it by loading the resource through a query constrained by the authenticated principal or tenant, or by an explicit ownership check in the service or a method-security expression — never by a role check alone.

*Source: [04-Authentication-Security.md#2-what-is-idor-and-how-do-you-prevent-it](04-Authentication-Security.md#2-what-is-idor-and-how-do-you-prevent-it)*

### 3. Why hash passwords instead of encrypting them?

**Answer:** The application only ever needs to verify a password, not recover it, and encryption is reversible by design — anyone with the key can get the original back. A salted, deliberately slow one-way hash (Argon2id, bcrypt, PBKDF2) means there's no key to steal that reverses it, and it makes large-scale offline guessing computationally expensive even if the database is stolen.

*Source: [04-Authentication-Security.md#3-why-hash-passwords-instead-of-encrypting-them](04-Authentication-Security.md#3-why-hash-passwords-instead-of-encrypting-them)*

### 4. Why does the salt matter, separately from the hash algorithm being slow?

**Answer:** Without a salt, identical passwords produce identical stored hashes, letting an attacker precompute hashes for common passwords once and instantly crack every account sharing one (a rainbow table). A per-user random salt mixed into the hash makes every stored hash unique even for identical passwords, defeating precomputed tables regardless of how slow the underlying hash function is.

*Source: [04-Authentication-Security.md#4-why-does-the-salt-matter-separately-from-the-hash-algorithm-being-slow](04-Authentication-Security.md#4-why-does-the-salt-matter-separately-from-the-hash-algorithm-being-slow)*

### 5. Sessions versus JWTs — how do you actually choose?

**Answer:** Sessions make revocation trivial (delete the server-side record) but need a shared store or sticky routing once you scale past one instance. JWTs avoid a per-request lookup and scale horizontally without shared state, but complicate revocation, role/claim freshness, and require careful signature and claim validation. Choose based on your actual revocation requirements, client types, and infrastructure — JWT is not categorically better for APIs or microservices.

*Source: [04-Authentication-Security.md#5-sessions-versus-jwts--how-do-you-actually-choose](04-Authentication-Security.md#5-sessions-versus-jwts--how-do-you-actually-choose)*

### 6. Is a JWT encrypted?

**Answer:** Usually not. Its header and payload are base64url-encoded, not encrypted, and readable by anyone holding the token. The signature only proves the claims haven't been tampered with since signing — it says nothing about who can read them — so sensitive data should never go inside the claims.

*Source: [04-Authentication-Security.md#6-is-a-jwt-encrypted](04-Authentication-Security.md#6-is-a-jwt-encrypted)*

### 7. What should a resource server validate before trusting a JWT's claims?

**Answer:** Signature against trusted keys (rejecting unexpected or "none" algorithms), issuer, audience, expiration, not-before if present, and the scopes or authorities it carries. Only after that does domain-level authorization against the actual resource apply.

*Source: [04-Authentication-Security.md#7-what-should-a-resource-server-validate-before-trusting-a-jwts-claims](04-Authentication-Security.md#7-what-should-a-resource-server-validate-before-trusting-a-jwts-claims)*

### 8. What's the practical difference between OAuth2 and OpenID Connect?

**Answer:** OAuth2 is fundamentally about delegated authorization — letting an application act on a user's behalf with a defined set of permissions (scopes) — without that application ever seeing the user's real credentials. OpenID Connect is a layer built on top of OAuth2 specifically for authentication — establishing who the person actually is, via a standardized identity token.

*Source: [04-Authentication-Security.md#8-whats-the-practical-difference-between-oauth2-and-openid-connect](04-Authentication-Security.md#8-whats-the-practical-difference-between-oauth2-and-openid-connect)*

### 9. What is CSRF, concretely, and why does it depend on cookies?

**Answer:** A malicious page causes a victim's browser to send a request to another site the victim is authenticated to — the browser attaches that site's cookie automatically because it doesn't know the request originated from an unrelated page. It's primarily a cookie-based risk because cookies are attached without the calling page asking; a bearer token that a legitimate client must deliberately attach in a header doesn't get silently forwarded the same way. Defenses are CSRF tokens and `SameSite` cookies.

*Source: [04-Authentication-Security.md#9-what-is-csrf-concretely-and-why-does-it-depend-on-cookies](04-Authentication-Security.md#9-what-is-csrf-concretely-and-why-does-it-depend-on-cookies)*

### 10. When is it actually safe to disable CSRF protection?

**Answer:** Only when the API is authenticated by something the browser doesn't attach automatically — an explicitly supplied bearer token rather than a cookie — and the broader threat model supports it. It is not a general "APIs don't need CSRF" rule; a cookie-authenticated endpoint still needs it regardless of whether it's technically "an API."

*Source: [04-Authentication-Security.md#10-when-is-it-actually-safe-to-disable-csrf-protection](04-Authentication-Security.md#10-when-is-it-actually-safe-to-disable-csrf-protection)*

### 11. What is CORS, and what does it not do?

**Answer:** CORS is a browser-enforced policy controlling which origins' JavaScript is allowed to read a cross-origin response. It is not authentication, not authorization, and does not affect non-browser clients like `curl`, mobile apps, or other backend services at all, since only browsers enforce it — real access control still has to happen on the server.

*Source: [04-Authentication-Security.md#11-what-is-cors-and-what-does-it-not-do](04-Authentication-Security.md#11-what-is-cors-and-what-does-it-not-do)*

### 12. Why extend `OncePerRequestFilter` instead of implementing `Filter` directly for token validation?

**Answer:** `OncePerRequestFilter` guarantees its logic runs exactly once per incoming request, even across internal servlet dispatches (like a forward) that could otherwise invoke a plain `Filter` more than once for the same request. For logic that sets security state, running twice isn't just wasteful — it risks subtly inconsistent behavior — so it's the correct base class specifically to rule that out.

*Source: [04-Authentication-Security.md#12-why-extend-onceperrequestfilter-instead-of-implementing-filter-directly-for-token-validation](04-Authentication-Security.md#12-why-extend-onceperrequestfilter-instead-of-implementing-filter-directly-for-token-validation)*

### 13. What is `SecurityContextHolder`, and why doesn't the authenticated user need to be passed explicitly into every method?

**Answer:** It stores the current request's authenticated identity in a `ThreadLocal`, scoped to the single thread handling that request. Once the authentication filter sets it early in the chain, any code running later on that same thread — a controller, a service, a `@PreAuthorize` check — can read it directly. That's also exactly why it does not automatically follow the request onto a different thread, such as a manually spawned thread or an `@Async` method, without deliberately propagating it.

*Source: [04-Authentication-Security.md#13-what-is-securitycontextholder-and-why-doesnt-the-authenticated-user-need-to-be-passed-explicitly-into-every-method](04-Authentication-Security.md#13-what-is-securitycontextholder-and-why-doesnt-the-authenticated-user-need-to-be-passed-explicitly-into-every-method)*

### 14. Why validate a token in one filter instead of decoding it inside every controller that needs the caller's identity?

**Answer:** Decoding it per-controller duplicates validation logic everywhere, risks one endpoint forgetting a check the others remember, and mixes authentication mechanics into business logic. Centralizing it in one filter that populates `SecurityContextHolder` lets every downstream layer simply ask "who is the current user" without knowing or caring whether that identity came from a JWT, a session, or an API key.

*Source: [04-Authentication-Security.md#14-why-validate-a-token-in-one-filter-instead-of-decoding-it-inside-every-controller-that-needs-the-callers-identity](04-Authentication-Security.md#14-why-validate-a-token-in-one-filter-instead-of-decoding-it-inside-every-controller-that-needs-the-callers-identity)*

### 15. How do you secure refresh tokens?

**Answer:** Store them hashed rather than in plain text, keep them no longer-lived than necessary, bind each one to a specific device or session, rotate on every use, detect reuse (a used-and-invalidated token reappearing signals theft) and revoke the entire token family when that happens, and revoke on explicit logout.

*Source: [04-Authentication-Security.md#15-how-do-you-secure-refresh-tokens](04-Authentication-Security.md#15-how-do-you-secure-refresh-tokens)*

### 16. What's the actual point of `HSTS`, `nosniff`, and CSP, and why is `X-XSS-Protection` no longer worth relying on?

**Answer:** HSTS forces the browser to only use HTTPS for the domain going forward, `X-Content-Type-Options: nosniff` stops the browser from reinterpreting a response as a different, more dangerous content type than declared, and a Content Security Policy restricts which sources scripts and other resources may load from — meaningfully limiting what a cross-site scripting bug can do even if one occurs. `X-XSS-Protection` configured a browser filter that modern browsers have since removed, so it no longer does anything meaningful and shouldn't be treated as a real defense.

*Source: [04-Authentication-Security.md#16-whats-the-actual-point-of-hsts-nosniff-and-csp-and-why-is-x-xss-protection-no-longer-worth-relying-on](04-Authentication-Security.md#16-whats-the-actual-point-of-hsts-nosniff-and-csp-and-why-is-x-xss-protection-no-longer-worth-relying-on)*

## [5. Testing Java Backend Applications (Beginner-Friendly)](05-Testing-Java.md)

### 1. What's the difference between a unit test and an integration test?

**Answer:** A unit test isolates one small piece of behavior and replaces its collaborators (usually with Mockito mocks), so it's fast and pinpoints exactly where business logic broke. An integration test lets real framework components or infrastructure participate — JPA against a real database, HTTP serialization through `MockMvc`, or an actual container via Testcontainers — so it can catch problems a mocked collaborator would hide.

*Source: [05-Testing-Java.md#1-whats-the-difference-between-a-unit-test-and-an-integration-test](05-Testing-Java.md#1-whats-the-difference-between-a-unit-test-and-an-integration-test)*

### 2. Why write `findById_whenUserDoesNotExist_throwsNotFound` instead of `test1`?

**Answer:** A test name should state the scenario and the expected result so a failure is understandable from the test report alone, without opening the test body. `test1` gives a reader nothing to go on when it fails months later.

*Source: [05-Testing-Java.md#2-why-write-findbyid_whenuserdoesnotexist_throwsnotfound-instead-of-test1](05-Testing-Java.md#2-why-write-findbyid_whenuserdoesnotexist_throwsnotfound-instead-of-test1)*

### 3. When should you reach for a mock, and when should you avoid one?

**Answer:** Mock a real boundary — a repository, an external client, a message publisher — when controlling its response isolates the behavior you actually want to test. Don't mock the class under test, and don't reach for a mock when a small, deterministic fake would need less setup and behave more like real code.

**Follow-up:** Why can heavy use of `verify()` make tests brittle? Because it asserts on *how* the code happens to call its collaborators today, not on the observable result. A harmless refactor that changes the call sequence without changing the outcome can break the test anyway. Reserve `verify()` for interactions that are themselves a real requirement, like "publish this event exactly once."

*Source: [05-Testing-Java.md#3-when-should-you-reach-for-a-mock-and-when-should-you-avoid-one](05-Testing-Java.md#3-when-should-you-reach-for-a-mock-and-when-should-you-avoid-one)*

### 4. `@WebMvcTest` versus `@SpringBootTest` — what's actually different, and when do you use each?

**Answer:** `@WebMvcTest` loads only the MVC layer around one controller and mocks its service dependency, so it's fast and focused on HTTP-level behavior: status codes, JSON shape, validation. `@SpringBootTest` loads the entire application context and is for proving cross-layer wiring or startup behavior — it is not automatically a "more thorough unit test," and using it for every test makes the suite slow for no real benefit.

*Source: [05-Testing-Java.md#4-webmvctest-versus-springboottest--whats-actually-different-and-when-do-you-use-each](05-Testing-Java.md#4-webmvctest-versus-springboottest--whats-actually-different-and-when-do-you-use-each)*

### 5. What does `@DataJpaTest` give you that a mocked repository never can?

**Answer:** It runs against a real (test) database, so it actually executes your queries, entity mappings, and constraints — a unique index violation, a custom `@Query`, a lazy-loading mapping mistake. A mocked `UserRepository` can never fail on any of those, because it never runs a real query at all.

*Source: [05-Testing-Java.md#5-what-does-datajpatest-give-you-that-a-mocked-repository-never-can](05-Testing-Java.md#5-what-does-datajpatest-give-you-that-a-mocked-repository-never-can)*

### 6. Why reach for Testcontainers instead of relying on H2 for every database test?

**Answer:** H2 doesn't reproduce every dialect-specific behavior of a real production database — indexing behavior, constraint error types, JSON column handling. Testcontainers runs your actual database engine in a container, catching differences that would otherwise only surface in production. It's slower, so it's used for the tests where that dialect-specific behavior is genuinely the point, not for every repository test.

*Source: [05-Testing-Java.md#6-why-reach-for-testcontainers-instead-of-relying-on-h2-for-every-database-test](05-Testing-Java.md#6-why-reach-for-testcontainers-instead-of-relying-on-h2-for-every-database-test)*

### 7. How do you actually test that an admin-only endpoint is protected?

**Answer:** Use `spring-security-test` to build a fake authenticated identity for a non-admin role and assert 403, build one for the admin role and assert 200, and separately assert that a completely unauthenticated request gets 401. Also test ownership — one authenticated user's request against another user's resource — since role checks alone don't catch that.

*Source: [05-Testing-Java.md#7-how-do-you-actually-test-that-an-admin-only-endpoint-is-protected](05-Testing-Java.md#7-how-do-you-actually-test-that-an-admin-only-endpoint-is-protected)*

### 8. Is 100% code coverage a good target?

**Answer:** No. Coverage only reports which lines executed, not whether anything meaningful was asserted — a test can call a getter and touch 100% of its lines while proving nothing. Risk, edge cases, failure paths, and assertion strength matter more than the raw percentage; a lower number backed by strong assertions on risky code beats a padded high number.

*Source: [05-Testing-Java.md#8-is-100-code-coverage-a-good-target](05-Testing-Java.md#8-is-100-code-coverage-a-good-target)*

### 9. What's a contract test, and why would a team use one?

**Answer:** It checks one service's request/response behavior against an agreed, versioned contract shared with the services that call it, instead of requiring every service to be spun up together to test integration directly. It catches a breaking change to the contract before it reaches a real multi-service environment.

*Source: [05-Testing-Java.md#9-whats-a-contract-test-and-why-would-a-team-use-one](05-Testing-Java.md#9-whats-a-contract-test-and-why-would-a-team-use-one)*

### 10. How should `deleteAll()` between integration tests be treated?

**Answer:** As a reasonable but sometimes slow and fragile default — it can be slow on a large table and can surface or hide foreign-key ordering issues. Transactional rollback (the `@DataJpaTest` default) is often a faster and cleaner alternative when the code under test can run inside a test transaction; when it can't, explicit cleanup ordering or container lifecycle management may fit better.

*Source: [05-Testing-Java.md#10-how-should-deleteall-between-integration-tests-be-treated](05-Testing-Java.md#10-how-should-deleteall-between-integration-tests-be-treated)*

### 11. Why should you inject a `Clock` instead of calling `LocalDateTime.now()` directly inside business logic?

**Answer:** Code that reads the system clock directly can't be tested deterministically — the test result depends on whatever moment it happens to run. Injecting a `Clock` lets a test hand in a fixed point in time, making time-based logic ("stale after 30 days") reproducible and removing an entire class of rare, date-boundary bugs from the test suite.

*Source: [05-Testing-Java.md#11-why-should-you-inject-a-clock-instead-of-calling-localdatetimenow-directly-inside-business-logic](05-Testing-Java.md#11-why-should-you-inject-a-clock-instead-of-calling-localdatetimenow-directly-inside-business-logic)*

## [6. Concurrency and Asynchronous Processing (Beginner-Friendly)](06-Concurrency-Async.md)

### 1. Why is `volatile` insufficient to fix `ordersProcessedToday++`?

**Answer:** `volatile` only guarantees that a write becomes visible to other threads' reads — it does not make a multi-step read-modify-write sequence atomic. Two threads can both read the same fresh value and both write the same incremented result, losing an update. Use `AtomicInteger` (or a lock) for a compound operation like increment; reserve `volatile` for simple flags and single-value visibility.

*Source: [06-Concurrency-Async.md#1-why-is-volatile-insufficient-to-fix-ordersprocessedtoday](06-Concurrency-Async.md#1-why-is-volatile-insufficient-to-fix-ordersprocessedtoday)*

### 2. What does CAS (Compare-And-Swap) actually do, and why does `AtomicInteger` rely on it?

**Answer:** CAS is a CPU-level instruction that atomically checks "does this memory location still hold the value I last read?" and only writes the new value if so; if another thread changed it in between, the operation fails and the caller retries. `AtomicInteger.incrementAndGet()` uses this to make read-add-write indivisible without needing a lock.

*Source: [06-Concurrency-Async.md#2-what-does-cas-compare-and-swap-actually-do-and-why-does-atomicinteger-rely-on-it](06-Concurrency-Async.md#2-what-does-cas-compare-and-swap-actually-do-and-why-does-atomicinteger-rely-on-it)*

### 3. How do you prevent a deadlock like the account-transfer example?

**Answer:** Always acquire multiple locks in the same global, deterministic order (e.g. by ascending account ID) regardless of which order the parameters arrived in, so two threads contending for the same pair of locks always compete in the same sequence. Supplement with lock timeouts, minimal critical sections, and avoiding unnecessary nested locks.

**Follow-up:** Would an in-process `ReentrantLock` prevent two separate application instances from double-processing the same database row? No — an in-process lock only protects threads inside one JVM. Cross-instance coordination needs a database-level lock or a distributed lock service.

*Source: [06-Concurrency-Async.md#3-how-do-you-prevent-a-deadlock-like-the-account-transfer-example](06-Concurrency-Async.md#3-how-do-you-prevent-a-deadlock-like-the-account-transfer-example)*

### 4. What does `@Async` actually do, mechanically?

**Answer:** Spring wraps the bean in a proxy; a call to the annotated method through that proxy is submitted to a configured task executor instead of running on the caller's thread. It does not make the work non-blocking — it moves it to a different, still-boundable pool of threads.

*Source: [06-Concurrency-Async.md#4-what-does-async-actually-do-mechanically](06-Concurrency-Async.md#4-what-does-async-actually-do-mechanically)*

### 5. Why can `@Async` silently do nothing?

**Answer:** Self-invocation — calling the annotated method from another method inside the same class (`this.method()`) — bypasses the Spring proxy entirely, since it's a plain Java call, not a call through the container-managed proxy. The method then runs synchronously on the caller's thread with no error. The fix is to put the `@Async` method on a separate bean and call it through that bean.

*Source: [06-Concurrency-Async.md#5-why-can-async-silently-do-nothing](06-Concurrency-Async.md#5-why-can-async-silently-do-nothing)*

### 6. `thenApply` versus `thenCompose` on a `CompletableFuture`?

**Answer:** `thenApply` maps the completed value to another plain value. `thenCompose` is for when the transformation itself returns another `CompletableFuture` — it flattens the result instead of producing a nested `CompletableFuture<CompletableFuture<T>>`.

*Source: [06-Concurrency-Async.md#6-thenapply-versus-thencompose-on-a-completablefuture](06-Concurrency-Async.md#6-thenapply-versus-thencompose-on-a-completablefuture)*

### 7. How should a thread pool be sized?

**Answer:** Base it on measured workload behavior, not a fixed formula. CPU-bound work rarely benefits from more threads than available cores. Blocking I/O-bound work can profitably use more threads than cores, but the useful ceiling is usually set by a downstream limit — database connection pool size, remote service capacity — not by the thread pool's own configuration.

*Source: [06-Concurrency-Async.md#7-how-should-a-thread-pool-be-sized](06-Concurrency-Async.md#7-how-should-a-thread-pool-be-sized)*

### 8. Why does wrapping a blocking JDBC call in `Mono.fromCallable(...)` not make it non-blocking?

**Answer:** The call still blocks whichever thread executes it. Reactive frameworks run on a small, fixed pool of event-loop threads that assume nothing ever blocks; blocking one of them under load collapses throughput for every other request sharing that pool. The call must be offloaded to a scheduler meant for blocking work (e.g. `Schedulers.boundedElastic()`), or replaced with a genuinely non-blocking driver.

*Source: [06-Concurrency-Async.md#8-why-does-wrapping-a-blocking-jdbc-call-in-monofromcallable-not-make-it-non-blocking](06-Concurrency-Async.md#8-why-does-wrapping-a-blocking-jdbc-call-in-monofromcallable-not-make-it-non-blocking)*

### 9. Why can a `@Scheduled` job run multiple times in production but only once locally?

**Answer:** `@Scheduled` triggers independently on every instance that has the bean; each instance's scheduler has no knowledge of the others. In a single-instance local run there's only one trigger, but a three-instance production deployment fires the job three times. Fix it with a distributed lock that lets only one instance's trigger actually run the job, or by making the job idempotent so duplicate runs are harmless.

*Source: [06-Concurrency-Async.md#9-why-can-a-scheduled-job-run-multiple-times-in-production-but-only-once-locally](06-Concurrency-Async.md#9-why-can-a-scheduled-job-run-multiple-times-in-production-but-only-once-locally)*

### 10. `fixedRate` versus `fixedDelay`?

**Answer:** `fixedRate` schedules the next run relative to when the previous run *started*, which can queue up back-to-back or overlapping runs if a job occasionally runs long. `fixedDelay` schedules the next run relative to when the previous run *finished*, so it never overlaps regardless of how long a run takes.

*Source: [06-Concurrency-Async.md#10-fixedrate-versus-fixeddelay](06-Concurrency-Async.md#10-fixedrate-versus-fixeddelay)*

### 11. Do virtual threads remove the need for connection pools, timeouts, and rate limits?

**Answer:** No. Virtual threads make the cost of a *blocked thread* cheap, letting far more concurrent blocking calls exist at once. They do nothing about the finite capacity of what those calls are waiting on — a database connection pool, a downstream service's capacity — so the same overload-control tools (bounded pools, timeouts, bulkheads, rate limits) are still required, and are now easier to overwhelm faster since spinning up virtual threads is cheap.

*Source: [06-Concurrency-Async.md#11-do-virtual-threads-remove-the-need-for-connection-pools-timeouts-and-rate-limits](06-Concurrency-Async.md#11-do-virtual-threads-remove-the-need-for-connection-pools-timeouts-and-rate-limits)*

### 12. What is backpressure, and where does it apply?

**Answer:** It's a mechanism for a slow consumer to signal capacity limits back to a producer so the producer doesn't overwhelm it, instead of the consumer buffering unboundedly or silently dropping data. Bounded queues in an executor, reactive streams' demand signaling, and rate limiting are all different implementations of the same underlying idea.

*Source: [06-Concurrency-Async.md#12-what-is-backpressure-and-where-does-it-apply](06-Concurrency-Async.md#12-what-is-backpressure-and-where-does-it-apply)*

### 13. What does happens-before mean, and name two ways to establish it?

**Answer:** It's the Java Memory Model's guarantee that if action A happens-before action B, B is guaranteed to observe every effect of A — without it, a thread may legally see stale or reordered data. It's established by things like releasing then re-acquiring the same lock, writing then reading the same `volatile` field, `Thread.join()` completing, or a `CompletableFuture` completing before another thread observes it.

*Source: [06-Concurrency-Async.md#13-what-does-happens-before-mean-and-name-two-ways-to-establish-it](06-Concurrency-Async.md#13-what-does-happens-before-mean-and-name-two-ways-to-establish-it)*

## [7. Common Backend Problems and Reliable Patterns (Beginner-Friendly)](07-Common-Backend-Problems.md)

### 1. Why is cache invalidation genuinely difficult?

**Answer:** The database and the cache are two separate systems with no shared atomic commit between them. A crash or a concurrent write between the database update and the cache update can leave a stale cached value with nothing to signal it's stale. The realistic mitigation is a clear invalidation strategy on every write path, a TTL as a backstop, and metrics on hit rate and staleness — not chasing perfect consistency.

*Source: [07-Common-Backend-Problems.md#1-why-is-cache-invalidation-genuinely-difficult](07-Common-Backend-Problems.md#1-why-is-cache-invalidation-genuinely-difficult)*

### 2. What causes a cache stampede, and how do you prevent one?

**Answer:** A popular cache entry expiring (or a cold restart with an empty cache) causes many concurrent requests to miss at the same instant, all of which hit the database simultaneously — recreating the load spike caching was meant to prevent. Prevent it with request coalescing, jittered TTLs so entries don't expire in lockstep, stale-while-revalidate, or a short-lived lock around the refill.

*Source: [07-Common-Backend-Problems.md#2-what-causes-a-cache-stampede-and-how-do-you-prevent-one](07-Common-Backend-Problems.md#2-what-causes-a-cache-stampede-and-how-do-you-prevent-one)*

### 3. Offset versus keyset pagination — when does each make sense?

**Answer:** Offset pagination is simple and supports jumping directly to an arbitrary page, but deep pages force the database to scan and discard everything before them, and results can shift under concurrent inserts. Keyset pagination uses a cursor and a deterministic, uniquely-ordered sort to fetch "whatever comes next," staying fast at any depth and stable under concurrent writes, at the cost of losing random page access. Use offset for small, relatively static datasets where users need to jump to a specific page; use keyset for anything large or frequently changing.

*Source: [07-Common-Backend-Problems.md#3-offset-versus-keyset-pagination--when-does-each-make-sense](07-Common-Backend-Problems.md#3-offset-versus-keyset-pagination--when-does-each-make-sense)*

### 4. Why do soft deletes complicate a unique constraint?

**Answer:** A normal unique index doesn't distinguish an active row from a soft-deleted one, so a soft-deleted user's email still blocks a new signup that reuses it. The fix is a database-specific partial unique index scoped to non-deleted rows, a business decision to permanently reserve the value, or physically archiving the row once a retention period passes.

**Follow-up:** Why isn't one custom repository method enough to hide deleted rows everywhere? Because every other query path — `findAll()`, native SQL, raw JPQL, inherited methods — has no idea the `deleted` column exists unless the filter is applied globally (a `Specification`, a Hibernate `@Filter`, a view, or a separate archive table), not endpoint by endpoint.

*Source: [07-Common-Backend-Problems.md#4-why-do-soft-deletes-complicate-a-unique-constraint](07-Common-Backend-Problems.md#4-why-do-soft-deletes-complicate-a-unique-constraint)*

### 5. How do you make idempotency actually race-safe, not just "check first"?

**Answer:** A check-then-insert has a gap where two concurrent identical requests can both pass the check before either commits, producing two rows anyway. The fix is a unique database constraint on the idempotency key, claimed with an atomic insert in the same transaction as the business effect. A retried request with the same key and same request hash returns the stored result; a different hash under the same key is rejected as a conflict.

*Source: [07-Common-Backend-Problems.md#5-how-do-you-make-idempotency-actually-race-safe-not-just-check-first](07-Common-Backend-Problems.md#5-how-do-you-make-idempotency-actually-race-safe-not-just-check-first)*

### 6. When is retrying a failed call actually dangerous?

**Answer:** When the operation isn't idempotent and could double-execute (charging a customer twice), when the failure is permanent rather than transient (retrying a validation error accomplishes nothing), or when many clients retrying at once turns a partial outage into a full one (a retry storm). Safe retries need bounded attempts, exponential backoff with jitter, a deadline, and — for non-idempotent operations — an idempotency key.

*Source: [07-Common-Backend-Problems.md#6-when-is-retrying-a-failed-call-actually-dangerous](07-Common-Backend-Problems.md#6-when-is-retrying-a-failed-call-actually-dangerous)*

### 7. What does a circuit breaker solve that a timeout alone doesn't?

**Answer:** A timeout still makes every caller wait out the full deadline before failing, which under a sustained outage exhausts the thread pool and turns one dependency's failure into a cascading failure across the whole app. A circuit breaker tracks failure rate and, once open, fails calls immediately with no network attempt at all — protecting the thread pool — then periodically tests recovery via a half-open state. It has to be paired with timeouts, retries, bulkheads, and a fallback that doesn't fabricate an incorrect business answer.

*Source: [07-Common-Backend-Problems.md#7-what-does-a-circuit-breaker-solve-that-a-timeout-alone-doesnt](07-Common-Backend-Problems.md#7-what-does-a-circuit-breaker-solve-that-a-timeout-alone-doesnt)*

### 8. What's a bulkhead, and why does it matter alongside a circuit breaker?

**Answer:** It's isolating the thread or connection pool used for one dependency from the pools used for others, so a struggling dependency can exhaust only its own resources instead of starving requests that have nothing to do with it. A circuit breaker stops calls to the failing dependency; a bulkhead limits the damage while it's still failing.

*Source: [07-Common-Backend-Problems.md#8-whats-a-bulkhead-and-why-does-it-matter-alongside-a-circuit-breaker](07-Common-Backend-Problems.md#8-whats-a-bulkhead-and-why-does-it-matter-alongside-a-circuit-breaker)*

### 9. What problem does the transactional outbox pattern actually fix?

**Answer:** Writing a database row and publishing a message as two separate steps creates a dual-write problem — a crash between the two leaves the database and the message broker disagreeing about what happened, with no shared transaction to prevent it. The outbox pattern writes the business row and an outbox row describing the event in one database transaction, so they always commit together; a separate publisher then delivers the outbox row and marks it sent.

*Source: [07-Common-Backend-Problems.md#9-what-problem-does-the-transactional-outbox-pattern-actually-fix](07-Common-Backend-Problems.md#9-what-problem-does-the-transactional-outbox-pattern-actually-fix)*

### 10. What is at-least-once delivery, and what does it require from a consumer?

**Answer:** A messaging guarantee that a message will eventually be delivered, but possibly more than once (for example, if a publisher crashes after sending but before recording it as sent). Consumers have to be idempotent — able to safely process the same message twice without a duplicate side effect — because exactly-once delivery at the message-broker level generally isn't available; exactly-once *business* behavior has to be built at the application level.

*Source: [07-Common-Backend-Problems.md#10-what-is-at-least-once-delivery-and-what-does-it-require-from-a-consumer](07-Common-Backend-Problems.md#10-what-is-at-least-once-delivery-and-what-does-it-require-from-a-consumer)*

### 11. Walk through what makes a money-transfer endpoint safe.

**Answer:** Wrap the debit and credit in one database transaction so a crash partway through rolls back both, not one. Use a decimal type built for exact arithmetic (never `double`), require an idempotency key so a retried request doesn't move money twice, check authorization and sufficient funds inside that same transaction, and lock both accounts in one deterministic order (such as by ascending account ID) regardless of transfer direction.

*Source: [07-Common-Backend-Problems.md#11-walk-through-what-makes-a-money-transfer-endpoint-safe](07-Common-Backend-Problems.md#11-walk-through-what-makes-a-money-transfer-endpoint-safe)*

### 12. Why does locking accounts in a fixed order prevent the deadlock, specifically?

**Answer:** If each transfer locks its own "from" account first, two transfers running in opposite directions can each hold the lock the other one needs, and neither can proceed. Locking by a fixed, direction-independent rule (say, always the lower account ID first) means both transfers attempt to acquire the same first lock, so one simply waits for the other to finish instead of the two waiting on each other forever.

*Source: [07-Common-Backend-Problems.md#12-why-does-locking-accounts-in-a-fixed-order-prevent-the-deadlock-specifically](07-Common-Backend-Problems.md#12-why-does-locking-accounts-in-a-fixed-order-prevent-the-deadlock-specifically)*

## [8. AOP, Actuator, and Microservice Communication (Beginner-Friendly)](08-AOP-Actuator-Microservices.md)

### 1. How does Spring implement `@Transactional` under the hood?

**Answer:** Through an AOP proxy. Spring wraps the bean in a proxy that starts a transaction before the annotated method runs and commits or rolls back after, based on the outcome. Because the proxy sits *around* the bean, calling the annotated method from outside the bean (through the proxy) triggers it; calling it via `this` from inside the same bean bypasses the proxy entirely, so nothing happens.

*Source: [08-AOP-Actuator-Microservices.md#1-how-does-spring-implement-transactional-under-the-hood](08-AOP-Actuator-Microservices.md#1-how-does-spring-implement-transactional-under-the-hood)*

### 2. What is a join point, a pointcut, and advice?

**Answer:** A join point is a candidate point in execution — in Spring AOP, almost always a method call. A pointcut is an expression that selects which join points actually match, like `@annotation(Loggable)` or `execution(* com.example.service.*.*(..))`. Advice is the code that runs at a matched join point — `@Before`, `@After`, `@AfterReturning`, `@AfterThrowing`, or `@Around`, the last being the only one that can wrap, modify the return value of, or short-circuit the call.

**Follow-up:** What's an aspect? A class, marked `@Aspect`, that bundles one or more pointcut-and-advice pairs together.

*Source: [08-AOP-Actuator-Microservices.md#2-what-is-a-join-point-a-pointcut-and-advice](08-AOP-Actuator-Microservices.md#2-what-is-a-join-point-a-pointcut-and-advice)*

### 3. Why does self-invocation break `@Async`/`@Transactional`?

**Answer:** Both are proxy-based. `this.method()` calls the real object directly, never passing through the Spring-generated proxy that would have started the transaction or submitted the async task. The fix is to call through another bean, or inject the bean's own proxy via `ApplicationContext`/self-injection.

*Source: [08-AOP-Actuator-Microservices.md#3-why-does-self-invocation-break-asynctransactional](08-AOP-Actuator-Microservices.md#3-why-does-self-invocation-break-asynctransactional)*

### 4. Compare Filter, Interceptor, and AOP — when would you reach for each?

**Answer:** A Filter runs at the servlet layer before Spring MVC even sees the request, with no awareness of Spring beans — good for cross-cutting concerns like auth-header parsing or CORS that must apply to every request, including ones MVC never routes to a controller. An Interceptor runs inside Spring MVC, around the resolved controller method, with access to the handler — good for MVC-specific concerns like adding common model attributes. AOP wraps any Spring bean method regardless of how it was invoked, which is the only one of the three that can advise a scheduled job or a message listener that has no HTTP request at all.

*Source: [08-AOP-Actuator-Microservices.md#4-compare-filter-interceptor-and-aop--when-would-you-reach-for-each](08-AOP-Actuator-Microservices.md#4-compare-filter-interceptor-and-aop--when-would-you-reach-for-each)*

### 5. What does the Actuator `/health` endpoint actually check?

**Answer:** It aggregates the status of every registered `HealthIndicator` bean — built-in ones for the database, disk space, and message brokers, plus any custom `HealthIndicator` you add for a downstream dependency like a payment gateway. The endpoint's overall status is the worst of the individual checks.

*Source: [08-AOP-Actuator-Microservices.md#5-what-does-the-actuator-health-endpoint-actually-check](08-AOP-Actuator-Microservices.md#5-what-does-the-actuator-health-endpoint-actually-check)*

### 6. Why is exposing Actuator endpoints without authentication risky?

**Answer:** Endpoints like `/actuator/env`, `/actuator/heapdump`, or `/actuator/httptrace` can leak configuration secrets, memory contents, or recent request bodies. Expose only what's needed, and put Actuator behind authentication or a separate, network-restricted management port in production.

*Source: [08-AOP-Actuator-Microservices.md#6-why-is-exposing-actuator-endpoints-without-authentication-risky](08-AOP-Actuator-Microservices.md#6-why-is-exposing-actuator-endpoints-without-authentication-risky)*

### 7. What is the difference between the Actuator liveness and readiness probes, and why does mixing them up cause outages?

**Answer:** Liveness asks "should this process be killed and restarted?" and should only fail for something a restart genuinely fixes, like deadlocked internal state. Readiness asks "can this instance accept traffic right now?" and should fail during startup or when a required downstream dependency is down, so the load balancer pauses traffic without killing the instance. Wiring a downstream dependency check into liveness means a brief database blip gets "fixed" by restarting every pod, which usually makes the outage worse and longer.

*Source: [08-AOP-Actuator-Microservices.md#7-what-is-the-difference-between-the-actuator-liveness-and-readiness-probes-and-why-does-mixing-them-up-cause-outages](08-AOP-Actuator-Microservices.md#7-what-is-the-difference-between-the-actuator-liveness-and-readiness-probes-and-why-does-mixing-them-up-cause-outages)*

### 8. WebClient versus RestTemplate versus Feign — how do you choose?

**Answer:** `RestTemplate` is blocking and in maintenance mode — avoid it for new code. `WebClient` is the current, non-blocking client, usable in both reactive and traditional apps (with `.block()` in the latter, which reintroduces blocking-thread cost). `Feign` trades explicitness for a clean declarative interface; good for many simple internal calls, but you must still configure its timeouts explicitly because the interface hides the HTTP details.

*Source: [08-AOP-Actuator-Microservices.md#8-webclient-versus-resttemplate-versus-feign--how-do-you-choose](08-AOP-Actuator-Microservices.md#8-webclient-versus-resttemplate-versus-feign--how-do-you-choose)*

### 9. Why do you need service discovery instead of hardcoded URLs?

**Answer:** In a scaled deployment, instance counts and addresses change constantly. A discovery service like Eureka lets callers ask for the current healthy instance list at call time instead of relying on a fixed, possibly stale, address — and the client-side load balancer spreads calls across instances.

*Source: [08-AOP-Actuator-Microservices.md#9-why-do-you-need-service-discovery-instead-of-hardcoded-urls](08-AOP-Actuator-Microservices.md#9-why-do-you-need-service-discovery-instead-of-hardcoded-urls)*

### 10. What does Resilience4j's circuit breaker actually prevent?

**Answer:** It stops sending calls to a dependency that is already failing, avoiding wasted latency and further overload while the dependency recovers, and periodically lets a trial request through (half-open) to test recovery. It does not fix the underlying failure and must be paired with a meaningful, non-misleading fallback and with timeouts.

*Source: [08-AOP-Actuator-Microservices.md#10-what-does-resilience4js-circuit-breaker-actually-prevent](08-AOP-Actuator-Microservices.md#10-what-does-resilience4js-circuit-breaker-actually-prevent)*

### 11. Is a `@FeignClient` call automatically resilient?

**Answer:** No. Feign only makes the call declarative; it does not add retries, circuit breaking, or bounded timeouts by itself. Those need explicit configuration — Resilience4j annotations, Feign's own timeout properties, or both.

*Source: [08-AOP-Actuator-Microservices.md#11-is-a-feignclient-call-automatically-resilient](08-AOP-Actuator-Microservices.md#11-is-a-feignclient-call-automatically-resilient)*

### 12. Why must a `@KafkaListener` or `@RabbitListener` handler be idempotent?

**Answer:** Both give at-least-once delivery by default: if the consumer crashes after processing but before acknowledging, or a consumer-group rebalance happens, the same message is redelivered. A handler that isn't safe to run twice will double-apply that message's effect. The fix is to check a processed-message-ID table or rely on a natural unique constraint before applying the effect, not to assume delivery happens exactly once.

**Follow-up:** Does Kafka guarantee ordering across a whole topic? No — only within a single partition. Events that must stay in order relative to each other need to share a partition key, typically an entity ID like the order ID.

*Source: [08-AOP-Actuator-Microservices.md#12-why-must-a-kafkalistener-or-rabbitlistener-handler-be-idempotent](08-AOP-Actuator-Microservices.md#12-why-must-a-kafkalistener-or-rabbitlistener-handler-be-idempotent)*

### 13. Name three design patterns visible in the Spring Framework itself.

**Answer:** Proxy (AOP-backed `@Transactional`/`@Async`), Singleton (default bean scope), and Template Method (`JdbcTemplate`/`RestTemplate` fixing the workflow while callback code supplies the varying step). Factory (`BeanFactory`) and Observer (`ApplicationEventPublisher`) are also solid answers.

*Source: [08-AOP-Actuator-Microservices.md#13-name-three-design-patterns-visible-in-the-spring-framework-itself](08-AOP-Actuator-Microservices.md#13-name-three-design-patterns-visible-in-the-spring-framework-itself)*

## [9. Spring Boot Annotations Reference](09-Annotations-Reference.md)

### 1. `@Component` vs `@Service` vs `@Repository` — what's actually different at runtime?

**Answer:** Nothing mechanically — all three register a bean the same way. `@Repository` additionally enables persistence-exception translation. The rest of the difference is purely to communicate intent to a reader.

*Source: [09-Annotations-Reference.md#1-component-vs-service-vs-repository--whats-actually-different-at-runtime](09-Annotations-Reference.md#1-component-vs-service-vs-repository--whats-actually-different-at-runtime)*

### 2. When do you reach for `@Bean` instead of a stereotype annotation?

**Answer:** When the class isn't yours to annotate (a third-party library type), or when constructing it needs explicit setup logic that a bare `@Component` on the class itself can't express.

*Source: [09-Annotations-Reference.md#2-when-do-you-reach-for-bean-instead-of-a-stereotype-annotation](09-Annotations-Reference.md#2-when-do-you-reach-for-bean-instead-of-a-stereotype-annotation)*

### 3. Why doesn't `@Autowired` need to be written on most constructors today?

**Answer:** Spring treats a class's single constructor as the injection point automatically. `@Autowired` is only required if a class has more than one constructor and you need to tell Spring which one to use for injection.

*Source: [09-Annotations-Reference.md#3-why-doesnt-autowired-need-to-be-written-on-most-constructors-today](09-Annotations-Reference.md#3-why-doesnt-autowired-need-to-be-written-on-most-constructors-today)*

### 4. What's the actual difference between `@Valid` and `@Validated`?

**Answer:** `@Valid` is the standard Bean Validation trigger. `@Validated` is Spring's own variant, which adds support for validation groups — applying a different subset of constraints depending on context (e.g. creation vs. update) — otherwise they behave the same.

*Source: [09-Annotations-Reference.md#4-whats-the-actual-difference-between-valid-and-validated](09-Annotations-Reference.md#4-whats-the-actual-difference-between-valid-and-validated)*

### 5. Why does `@Transactional` (or `@Async`, or `@PreAuthorize`) sometimes appear to do nothing?

**Answer:** All three are implemented via a proxy that wraps the bean. A call from inside the same class via `this.method()` never passes through that proxy, so the transaction never starts, the async submission never happens, and the authorization check never runs — with no error thrown. The fix is calling through a different bean.

*Source: [09-Annotations-Reference.md#5-why-does-transactional-or-async-or-preauthorize-sometimes-appear-to-do-nothing](09-Annotations-Reference.md#5-why-does-transactional-or-async-or-preauthorize-sometimes-appear-to-do-nothing)*

### 6. What's the default fetch type for each JPA relationship annotation, and why does it matter?

**Answer:** `@ManyToOne` and `@OneToOne` default to EAGER; `@OneToMany` and `@ManyToMany` default to LAZY. Getting this backwards from what you expect is a common cause of either an unnecessary eager join (loading data you didn't need) or a `LazyInitializationException` when a lazy relationship is accessed outside its transaction.

*Source: [09-Annotations-Reference.md#6-whats-the-default-fetch-type-for-each-jpa-relationship-annotation-and-why-does-it-matter](09-Annotations-Reference.md#6-whats-the-default-fetch-type-for-each-jpa-relationship-annotation-and-why-does-it-matter)*

### 7. Is `@AllArgsConstructor` always dangerous on a Spring bean?

**Answer:** Only when Spring itself constructs the class (a `@Service`/`@Component`/etc.) — Spring tries to inject a bean into every constructor parameter, and a plain non-dependency field forced into that constructor has no bean to satisfy it, breaking startup. On a DTO or entity Spring never constructs, it's completely fine.

*Source: [09-Annotations-Reference.md#7-is-allargsconstructor-always-dangerous-on-a-spring-bean](09-Annotations-Reference.md#7-is-allargsconstructor-always-dangerous-on-a-spring-bean)*

### 8. Why does a `@Scheduled` job sometimes run more often than expected in production?

**Answer:** Because every instance in a multi-instance deployment runs its own copy of the schedule independently — with three instances running, the job fires three times, not once. Fixing this needs a distributed lock or a scheduling mechanism that's aware of the multiple instances, not the annotation alone.

*Source: [09-Annotations-Reference.md#8-why-does-a-scheduled-job-sometimes-run-more-often-than-expected-in-production](09-Annotations-Reference.md#8-why-does-a-scheduled-job-sometimes-run-more-often-than-expected-in-production)*
