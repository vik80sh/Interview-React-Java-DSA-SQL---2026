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

The `@ManyToOne` side normally owns the foreign key. `mappedBy` marks the inverse side. Helper methods should update both sides so the in-memory graph and database relationship agree.

`@OneToMany` is lazy by default; `@ManyToOne` is eager by JPA default, so explicitly choose lazy for associations and fetch what a use case needs. Avoid `CascadeType.ALL` on many-to-many relationships involving shared entities. `orphanRemoval` means removing a child from the parent's collection deletes that child; it is different from cascade remove.

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

## Revision Checklist

- [ ] Explain entity states, persistence context, dirty checking, flush, and commit.
- [ ] Map both sides of a relationship and identify the owning side.
- [ ] Diagnose N+1 from SQL output and select an appropriate fix.
- [ ] Compare optimistic and pessimistic locking.
- [ ] Explain transaction propagation, rollback, and isolation.
- [ ] Design indexes and verify them with a query plan.
