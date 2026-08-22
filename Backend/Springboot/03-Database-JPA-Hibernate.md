# Database, JPA, and Hibernate

JPA is a specification. Hibernate is a popular implementation. Spring Data JPA adds repository abstractions over JPA. The database remains the source of truth: ORM reduces repetitive mapping code, but it does not remove SQL, indexes, transactions, or query-plan reasoning.

## 1. Entity Mapping

```java
@Entity
@Table(name = "users",
       uniqueConstraints = @UniqueConstraint(name = "uk_users_email", columnNames = "email"))
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(nullable = false, length = 80)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    @Version
    private long version;

    private LocalDateTime createdAt;
}
```

Use `LocalDateTime` or `Instant` directly; `@Temporal` is for legacy `java.util.Date` and `Calendar`. Database constraints such as `NOT NULL`, `UNIQUE`, foreign keys, and indexes are essential because application validation alone cannot protect against concurrent writers.

## 2. Entity Lifecycle and Persistence Context

An entity can be transient, managed, detached, or removed. A managed entity belongs to the persistence context. Hibernate tracks its original state and uses dirty checking at flush time:

```java
@Transactional
public void rename(Long id, String name) {
    User user = repository.findById(id).orElseThrow();
    user.setName(name); // no explicit update required
} // flush occurs before commit
```

`save()` may persist or merge depending on entity state. `flush()` synchronizes pending SQL with the database but does not commit the transaction. A persistence context is usually scoped to a transaction, which is why lazy relationships should be read and mapped to DTOs inside the service transaction.

## 3. Relationships

There are four relationship annotations: `@OneToOne`, `@OneToMany`, `@ManyToOne`, and `@ManyToMany`.

### 3.0 What `mappedBy` actually means

Take `Order` and `OrderLine` from Section 3.1. In the database there is only **one** foreign key column in this whole relationship: `order_line.order_id`. There is no column on the `orders` table pointing back at its lines — a parent row doesn't need one; you find its lines by querying `WHERE order_id = ?`.

So when you write the same relationship as two Java fields — `Order.lines` (a `List<OrderLine>`) and `OrderLine.order` (an `Order`) — only one of those two fields corresponds to a real column. That field is the **owning side**. The other field is a pure Java-side convenience with nothing to persist directly, and it must tell Hibernate: *"don't try to create a column for me — go look at this other field on the other entity, that's where the real foreign key lives."* That instruction is exactly what `mappedBy` says:

```java
@Entity
class Order {
    @OneToMany(mappedBy = "order") // "the real column is on OrderLine.order, not here"
    private List<OrderLine> lines;
}

@Entity
class OrderLine {
    @ManyToOne              // no mappedBy here — this side owns the order_id column
    @JoinColumn(name = "order_id")
    private Order order;
}
```

Read `mappedBy = "order"` as "this collection is mapped by [i.e., mirrors] the field named `order` over on `OrderLine`." The string must exactly match the field name on the other class.

Practical consequence: **Hibernate only writes to the database through the owning side.** If you only do `order.getLines().add(newLine)` and never set `newLine.setOrder(order)`, no `order_id` gets written on save, because the collection side is not where JPA looks for what to persist — that's why Section 3.4's `addLine()` helper sets both sides.

Rule for spotting the owning side on sight: **the side with `@JoinColumn` (or `@JoinTable`) owns the relationship; the side with `mappedBy` is the inverse, descriptive-only side.**

### 3.1 `@ManyToOne` / `@OneToMany` — the everyday pair (e.g., one `Order` has many `OrderLine`s)

```java
@Entity
class Order {
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL,
               orphanRemoval = true, fetch = FetchType.LAZY)
    private List<OrderLine> lines = new ArrayList<>();
}

@Entity
class OrderLine {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;
}
```

The `@ManyToOne` side owns the foreign key because that is where the `order_id` column physically lives. `@OneToMany` is lazy by default; `@ManyToOne` is **eager by JPA default**, so mark it lazy explicitly and fetch what the use case actually needs. `orphanRemoval` means removing a child from the parent's collection deletes that child row — this is different from `CascadeType.REMOVE`, which only deletes children when the *parent itself* is deleted.

### 3.2 `@OneToOne` — exactly one row maps to exactly one other row (e.g., one `User` has one `Profile`)

Two common shapes:

**Foreign key on the owning side** (like `@ManyToOne` but unique):

```java
@Entity
class Profile {
    @Id @GeneratedValue
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;
}

@Entity
class User {
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private Profile profile;
}
```

**Shared primary key with `@MapsId`** — `Profile.id` reuses `User.id`, avoiding an extra column and an extra unique index:

```java
@Entity
class Profile {
    @Id
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "id")
    private User user;
}
```

`@OneToOne` is eager by JPA default just like `@ManyToOne` — mark it lazy explicitly. Note that a lazy `@OneToOne` on the side *without* the foreign key normally still needs a query to know whether an associated row even exists, unless bytecode enhancement is configured. That subtlety is why the FK-holding side or `@MapsId` is usually preferred over a `mappedBy`-only lazy one-to-one.

### 3.3 `@ManyToMany` — both sides can have many of the other (e.g., `Student` and `Course`)

```java
@Entity
class Student {
    @ManyToMany
    @JoinTable(
        name = "student_course",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "course_id"))
    private Set<Course> courses = new HashSet<>();
}

@Entity
class Course {
    @ManyToMany(mappedBy = "courses")
    private Set<Student> students = new HashSet<>();
}
```

`Student` owns the relationship here because it declares the `@JoinTable`; `Course` is the inverse side. A plain `@ManyToMany` can only store the two foreign keys — it cannot carry an extra column such as an enrollment date. Once the join needs its own data, stop using `@ManyToMany` and model the join table as its own entity (`Enrollment`) with a `@ManyToOne` to each side. This is the standard answer to "how would you add a column to a many-to-many relationship."

### 3.4 Keeping both sides in sync

Because Hibernate persists only from the owning side, add helper methods so callers can't forget the inverse side and leave the in-memory graph inconsistent with the database:

```java
public void addLine(OrderLine line) {
    lines.add(line);
    line.setOrder(this);
}

public void removeLine(OrderLine line) {
    lines.remove(line);
    line.setOrder(null);
}
```

### 3.5 Cascade types

| Cascade | Effect when the parent operation runs |
|---|---|
| `PERSIST` | Saving the parent also saves new children |
| `MERGE` | Merging the parent also merges children |
| `REMOVE` | Deleting the parent also deletes children |
| `REFRESH` | Refreshing the parent also refreshes children |
| `DETACH` | Detaching the parent also detaches children |
| `ALL` | All of the above |

`REMOVE`/`ALL` fits a true parent-owns-child relationship (`Order` → `OrderLine`, a line has no meaning without its order). It is dangerous on `@ManyToMany` or shared entities (`Student` ↔ `Course`): cascading remove from `Student` could delete a `Course` that other students still reference.

### 3.6 `equals()` and `hashCode()` on entities

Default identity-based `equals`/`hashCode` works until an entity is placed in a `Set` before it has a database-assigned ID (a new, unsaved child), or compared across a detach/reattach cycle. A safe pattern: base `equals`/`hashCode` on a natural business key when one exists (e.g., `email`), or use a constant `hashCode()` plus an ID-based `equals()` where two transient (no-ID) instances are only equal to themselves. Never base `hashCode()` purely on a mutable, database-generated `id`, since adding the entity to a `HashSet` before it is persisted and again afterward would put it in two different buckets.

### 3.7 LAZY vs EAGER — the default for every relationship, with examples

"Lazy" means the associated data is fetched only when the field is first accessed; "eager" means it is fetched immediately, as part of loading the owning entity. Each relationship annotation has its own JPA **default**, and every one of them can be overridden with `fetch = FetchType.LAZY` or `fetch = FetchType.EAGER`:

| Relationship | JPA default | Why |
|---|---|---|
| `@OneToOne` | **EAGER** | JPA assumes a "to-one" side is cheap — one extra row |
| `@ManyToOne` | **EAGER** | Same reasoning: one row, e.g. `OrderLine.order` |
| `@OneToMany` | **LAZY** | A collection could be huge, e.g. all of a user's orders |
| `@ManyToMany` | **LAZY** | Same reasoning — potentially many rows on both sides |

In practice, the two EAGER defaults (`@OneToOne`, `@ManyToOne`) are the ones interviewers ask about, because leaving them eager silently pulls in extra data on every load of the parent.

**EAGER — fetched immediately, no code needed to trigger the query:**

```java
@Entity
class OrderLine {
    @ManyToOne // fetch = EAGER by default — no override needed
    @JoinColumn(name = "order_id")
    private Order order;
}

OrderLine line = orderLineRepository.findById(1L).orElseThrow();
// The SQL for "line.order" already ran as part of the query above —
// even if this code never touches line.getOrder().
```

**LAZY — fetched only on first access, and only while the persistence context is open:**

```java
@Entity
class Order {
    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY) // LAZY is already the default here
    private List<OrderLine> lines;
}

@Transactional(readOnly = true)
public OrderDetails loadOrder(Long id) {
    Order order = orderRepository.findById(id).orElseThrow();
    order.getLines().size(); // triggers a second SELECT, here, inside the open transaction
    return mapper.toDetails(order);
}
```

**Overriding an EAGER default to LAZY** (the most common real-world change — almost every `@ManyToOne`/`@OneToOne` should be explicitly lazy):

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "order_id", nullable = false)
private Order order;
```

**Overriding a LAZY default to EAGER** (rare — only when a collection is genuinely always needed and known to be small, e.g. a fixed small list of roles):

```java
@ManyToMany(fetch = FetchType.EAGER)
@JoinTable(name = "user_roles", ...)
private Set<Role> roles;
```

**What goes wrong with each:**

- **EAGER everywhere** silently grows the query for every load — turn on SQL logging and you will see joins or extra `SELECT`s for associations the current use case never reads. This is the root cause of many "why is this simple endpoint slow" interview scenarios.
- **LAZY accessed too late** throws `LazyInitializationException` — the code tried `order.getLines()` *after* the transaction/persistence context that loaded `order` had already closed (e.g., in a controller or a JSON serializer, not the `@Transactional` service method). The durable fix is to read what you need inside the transaction and map it to a DTO there, not to make everything eager or enable Open Session in View.

**Rule of thumb for interviews:** default every relationship to `LAZY` explicitly, and fetch exactly what a given use case needs with a fetch join, `@EntityGraph`, or a projection (see Section 6, N+1 and Lazy Loading) — never solve a missing-data problem by flipping a relationship to EAGER globally, because that fix helps one use case and silently taxes every other one.

## 4. Queries and Projections

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    @Query("select u from User u where u.status = :status")
    Page<User> findByStatus(UserStatus status, Pageable pageable);

    @Query("select new com.example.UserSummary(u.id, u.name) " +
           "from User u where u.status = :status")
    List<UserSummary> findSummaries(UserStatus status);
}
```

JPQL uses entity names and fields, not table and column names. Derived queries are readable for simple predicates. Use JPQL, Criteria, Querydsl, or native SQL when the query needs explicit joins or database-specific features. A projection is often better than loading a full entity for a read-only list.

For filters that are optional and combine dynamically — a search screen where any subset of name, status, and date range may be supplied — writing one derived query or JPQL string per combination doesn't scale. `Specification` composes predicates at runtime:

```java
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {}

public class UserSpecifications {
    public static Specification<User> hasStatus(UserStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<User> nameContains(String text) {
        return (root, query, cb) -> text == null ? null
            : cb.like(cb.lower(root.get("name")), "%" + text.toLowerCase() + "%");
    }
}

Specification<User> spec = Specification.where(UserSpecifications.hasStatus(status))
    .and(UserSpecifications.nameContains(searchText));
Page<User> results = userRepository.findAll(spec, pageable);
```

Returning `null` from a `Specification` lambda means "skip this predicate," which is how the optional filters compose cleanly without an `if` per combination. Querydsl solves the same problem with generated, type-safe query classes instead of the Criteria API's string-based attribute names; reach for either over hand-built JPQL string concatenation once the number of optional filters grows past two or three.

Bulk updates are efficient but bypass dirty checking and can leave already-managed objects stale. Consider `clearAutomatically = true`, a new transaction, or an explicit persistence-context strategy.

## 5. Transactions and Isolation

Put a transaction around a business operation, not around an arbitrary repository call:

```java
@Transactional
public void move(Order order, User user) {
    orderRepository.save(order);
    auditRepository.save(new AuditEntry("ORDER_MOVED", user.getId()));
}
```

Default propagation `REQUIRED` joins an existing transaction or creates one. `REQUIRES_NEW` suspends the caller and starts a separate transaction, which can be useful for independent audit logging but can surprise you during rollback. Rollback normally occurs for unchecked exceptions; configure checked exceptions deliberately.

Isolation controls anomalies such as dirty reads, non-repeatable reads, and phantoms. The exact default depends on the database. `readOnly = true` is a hint and may reduce flush work; it does not universally mean no locks or guaranteed faster queries.

## 6. N+1 and Lazy Loading

If one query loads 100 orders and accessing each order's lines causes 100 more queries, the total is 101: the N+1 problem. Detect it with SQL logs, datasource metrics, or query-count tests.

Fetch for the use case rather than globally switching everything to eager:

```java
@Query("select distinct o from Order o " +
       "left join fetch o.lines where o.id = :id")
Optional<Order> findDetails(@Param("id") Long id);
```

Alternatives include `@EntityGraph`, batch fetching, and DTO projections. A collection fetch join combined with pagination can produce incorrect or inefficient results; for pages, first select IDs or project the required fields.

A `LazyInitializationException` means code accessed a lazy association after its persistence context closed. The durable fix is to fetch the required data in a transaction and map it to a DTO, not to enable Open Session in View everywhere.

## 7. Locking, Indexes, and Testing

`@Version` adds an optimistic check to updates and raises a conflict when another transaction changed the row. Pessimistic locks such as `SELECT ... FOR UPDATE` hold database locks until commit and require short, well-indexed transactions. Lock ordering and deadlock retry still matter.

Indexes speed reads but add write and storage cost. Index columns used by selective filters, joins, and ordering, then confirm with `EXPLAIN`. An index is not automatically used, especially when functions or leading wildcards prevent efficient lookup.

Use `@DataJpaTest` for repository behavior and Testcontainers when production database behavior matters. H2 compatibility alone does not prove a query works on MySQL or PostgreSQL.

## Interview Questions and Answers

### 1. JPA versus Hibernate versus Spring Data JPA?

**Answer:** JPA is the standard API and annotations. Hibernate implements JPA and generates SQL. Spring Data JPA adds repository interfaces and query derivation on top of a JPA provider.

### 2. What is dirty checking?

**Answer:** Hibernate tracks managed entities in the persistence context. At flush time it compares state and generates updates for changed fields, so an explicit `save` is not required for a managed entity inside a transaction.

### 3. `save()` versus `flush()`?

**Answer:** `save` makes an entity persistent or merged according to its state. `flush` sends pending changes to the database but does not commit. A transaction can flush several times before commit.

### 4. Explain N+1 and its fixes.

**Answer:** One parent query followed by one child query per parent creates N+1 queries. Use a targeted fetch join, entity graph, batch fetching, or a DTO projection. Do not blindly make relationships eager.

### 5. Why is `@ManyToOne(fetch = LAZY)` often explicit?

**Answer:** JPA's default for many-to-one is eager, which can unexpectedly load large graphs. Explicit lazy loading gives each use case control over what it reads.

### 6. What does `@Transactional` guarantee?

**Answer:** It defines a transaction boundary for database operations through Spring's proxy. It provides atomicity and isolation according to the database, but it cannot roll back external HTTP calls or email delivery.

### 7. Optimistic versus pessimistic locking?

**Answer:** Optimistic locking allows concurrent reads and detects conflicts with a version at update time. Pessimistic locking blocks competing transactions while a row is locked. Optimistic is often better for low-conflict edits; pessimistic suits short, highly contended critical sections.

### 8. Why can a bulk update be dangerous?

**Answer:** It bypasses entity lifecycle callbacks and dirty checking. Managed entities may contain stale values, so clear or refresh the persistence context and understand which rules the bulk operation skips.

### 9. Why are database constraints needed if Java validates input?

**Answer:** Concurrent requests can pass application checks simultaneously. A unique or foreign-key constraint is enforced at the actual serialization point and is the final integrity guarantee.

### 10. How would you investigate a slow query?

**Answer:** Capture the generated SQL and parameters, check query count, inspect `EXPLAIN`, verify indexes and cardinality, then consider a projection, pagination, or query rewrite. Measure before and after.

### 11. Explain the four JPA relationship types with a real example each.

**Answer:** `@OneToOne` — one `User` has one `Profile`. `@OneToMany`/`@ManyToOne` — one `Order` has many `OrderLine`s, each line belongs to exactly one order. `@ManyToMany` — many `Student`s take many `Course`s, joined through a link table. Pick the type from the actual cardinality, and replace `@ManyToMany` with an explicit join entity the moment the relationship itself needs data (like an enrollment date).

### 12. What decides the owning side of a relationship, and why does it matter?

**Answer:** The side that physically holds the foreign key column is the owning side; only writes made through that side are persisted. The other side is `mappedBy` and is inverse — read-only for Hibernate's purposes. In `@OneToMany`/`@ManyToOne`, the "many" side almost always owns the relationship because that's where the FK column lives. Forgetting this and only updating the inverse-side collection in memory is a common bug: nothing gets saved.

### 13. Why shouldn't you put extra columns directly on a `@ManyToMany` join table?

**Answer:** `@ManyToMany` with `@JoinTable` only maps the two foreign keys; JPA gives you no entity to hang an extra column like `enrolledAt` or `status` on. The fix is to stop modeling it as `@ManyToMany` and introduce an explicit join entity (e.g., `Enrollment`) with a `@ManyToOne` to each side, which is a normal entity you can add fields to freely.

### 14. Why can `equals()`/`hashCode()` on JPA entities cause subtle bugs?

**Answer:** Default identity equality breaks across detach/merge, and hashing a mutable, database-generated `id` breaks `HashSet` lookups if the entity is added before being persisted (transient, `id == null`) and looked up after (`id` assigned) — it lands in a different bucket. Prefer a natural business key for `equals`/`hashCode` when one exists, or a constant hash code with ID-based equality that treats distinct transient instances as unequal.

### 15. How would you build a search endpoint with several optional filters?

**Answer:** Not with one JPQL string per filter combination. Use Spring Data's `Specification` (or Querydsl) to compose predicates at runtime, returning `null` from a predicate to mean "skip it" when that filter wasn't supplied, then combine them with `Specification.where(...).and(...)` and pass the result to `findAll(spec, pageable)`.

## Revision Checklist

- [ ] Explain entity states, persistence context, dirty checking, flush, and commit.
- [ ] Map all four relationship types (`@OneToOne`, `@OneToMany`/`@ManyToOne`, `@ManyToMany`) and identify the owning side in each.
- [ ] Know when to replace `@ManyToMany` with an explicit join entity, and why `equals`/`hashCode` on entities is easy to get wrong.
- [ ] Diagnose N+1 from SQL output and select an appropriate fix.
- [ ] Compare optimistic and pessimistic locking.
- [ ] Explain transaction propagation, rollback, and isolation.
- [ ] Design indexes and verify them with a query plan.
- [ ] Compose optional search filters with `Specification`/Querydsl instead of one query per combination.
