# Database, JPA, and Hibernate (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. The Problem: Writing Database Code by Hand for Every Entity

Say you have a `User` with `id`, `email`, `name`, `status`, and `createdAt`. Without any help from a framework, saving one and loading one means writing something like this yourself, in plain JDBC (Java Database Connectivity):

```java
String sql = "INSERT INTO users (email, name, status, created_at) VALUES (?, ?, ?, ?)";
PreparedStatement ps = connection.prepareStatement(sql);
ps.setString(1, user.getEmail());
ps.setString(2, user.getName());
ps.setString(3, user.getStatus().name());
ps.setObject(4, user.getCreatedAt());
ps.executeUpdate();

// ...and to read one back:
ResultSet rs = connection.prepareStatement("SELECT * FROM users WHERE id = ?").executeQuery();
User user = new User();
user.setId(rs.getLong("id"));
user.setEmail(rs.getString("email"));
user.setName(rs.getString("name"));
// ...one line per column, every time, for every entity in the app
```

This works, but it does not stay pleasant:

1. **Every field appears twice** — once in the class, once in the SQL string and the column-mapping code. Add a field to `User` and forget to update the `INSERT` or the `ResultSet` mapping, and you get a silent bug, not a compile error.
2. **It's the same repetitive shape for every single entity** — `Order`, `Product`, `Profile` — hundreds of nearly identical blocks of connection handling and manual column-to-field mapping, none of which has anything to do with your actual business logic.
3. **A typo in a column name** (`"statuss"`) is only caught at runtime, as a database error, not by the compiler.

**This is exactly what ORM (Object-Relational Mapping) answers:** describe the mapping between a Java class and a database table declaratively — once, with annotations — and let a library generate the SQL and do the column-to-field translation for you, instead of you writing it by hand for every entity.

Three names you'll see together constantly, and what each one actually is:

- **JPA (Java Persistence API)** is the *specification* — a standard set of interfaces and annotations (`@Entity`, `@Id`, `EntityManager`, and so on) describing how object-relational mapping in Java should work. A specification by itself does nothing; it needs an implementation.
- **Hibernate** is the most widely used *implementation* of that specification — the actual library that reads your annotations, generates real SQL, and talks to the database.
- **Spring Data JPA** sits one layer higher, on top of JPA/Hibernate: you write a repository *interface*, and Spring generates a working implementation of it at startup, so you don't hand-write even the basic CRUD (Create, Read, Update, Delete) methods.

One caveat worth planting right at the start, because it's easy to lose sight of once annotations start doing the work: **the database is still the source of truth.** ORM removes repetitive mapping code, but it does not remove the need to understand SQL (Structured Query Language), indexes, transactions, or how a query actually gets executed. Everything from here on is about using that removed repetition well — not about no longer needing to think about the database.

## 2. Mapping a Class to a Table: `@Entity`

Once you accept that annotations should describe the mapping instead of hand-written SQL, the natural next question is: which annotation says what? Here's a `User` mapped completely:

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

Reading it top to bottom: `@Entity` says "this class maps to a table." `@Table` names that table and lets you declare constraints, like the unique email here. `@Id` marks the primary-key field, and `@GeneratedValue(strategy = GenerationType.IDENTITY)` says the database itself assigns the value (an auto-increment column) rather than Java generating it. `@Column` lets you be explicit about nullability and length instead of relying on defaults you'd have to go check. `@Enumerated(EnumType.STRING)` stores the enum's *name* (`"ACTIVE"`) rather than its ordinal position — storing the ordinal is a real trap: reorder the enum's constants later and every existing row silently means something different. `@Version` is for optimistic locking, covered fully in section 8 — for now, just know it exists.

Use `LocalDateTime` or `Instant` directly for dates, as shown for `createdAt`; `@Temporal` only exists for the legacy `java.util.Date`/`Calendar` types and isn't needed here.

**Why bother with database-level constraints (`NOT NULL`, `UNIQUE`, foreign keys, indexes) if you're already validating in Java?** Because application validation runs per-request, and two requests can run *at the same time*. Imagine two signup requests for the same email arrive within a millisecond of each other: both check "does this email already exist?" in Java, both get "no" back, both proceed to insert. Without a `UNIQUE` constraint at the database level, you now have two rows with the same email — a race condition no amount of application-side checking prevents, because the check and the write aren't atomic from the application's point of view. The database constraint is the actual, final guarantee; application validation is only a friendlier first line of defense that gives a nicer error message in the common case.

## 3. What "Managed" Means: The Persistence Context and Dirty Checking

Here's something that looks like it shouldn't work, the first time you see it:

```java
@Transactional
public void rename(Long id, String name) {
    User user = repository.findById(id).orElseThrow();
    user.setName(name);   // no explicit save() call, no explicit UPDATE anywhere
}   // ...and yet the database row is updated when this method returns
```

There's no `repository.save(user)`, no SQL written anywhere — just a plain setter call on a plain Java object. So what actually persists the change?

When `findById` loads `user` inside an active transaction, Hibernate doesn't just hand you back a detached object and forget about it — it keeps that specific object registered in something called the **persistence context**, along with a snapshot of its original field values. This registered, tracked state is what "**managed**" means. Right before the transaction commits, Hibernate does a **flush**: it compares each managed entity's current field values against the snapshot it kept, and for anything that changed, it generates the `UPDATE` SQL automatically. This comparison step is called **dirty checking**, and it's the entire reason `user.setName(name)` alone was enough — Hibernate noticed the field no longer matched its snapshot and wrote the `UPDATE` for you.

An entity moves through four states in its life, and knowing which one you're looking at explains a lot of otherwise-confusing behavior:

- **Transient** — a plain `new User()` you just constructed. Not in the database, not tracked by anything.
- **Managed** — loaded (or saved) inside an active persistence context. Tracked; dirty checking applies.
- **Detached** — was managed once, but its persistence context has since closed (the transaction ended). Changes to it are no longer tracked or saved — you'd have to explicitly merge it back in.
- **Removed** — marked for deletion; gone from the database at the next flush.

`repository.save()` either persists a transient entity or merges a detached one back into the persistence context, depending on which state it's in — that's why it's the one method that "just works" regardless of state. `flush()` is a different operation entirely: it pushes pending SQL to the database *right now*, without ending the transaction — a transaction can flush multiple times before it finally commits.

This has one very practical consequence worth internalizing now, because it explains a real exception you'll see later (section 7): the persistence context is normally scoped to a single transaction. Once that transaction ends, the entities loaded inside it become detached, and any lazy relationship on them (more in section 4 and 7) can no longer be fetched on demand. That's why lazy fields need to be read and converted to a DTO (Data Transfer Object — a plain object shaped for what you actually want to hand back) *inside* the transactional service method, not later in a controller.

## 4. Relationships Between Entities

There are four relationship annotations in JPA: `@OneToOne`, `@OneToMany`, `@ManyToOne`, and `@ManyToMany`. Before looking at any of them individually, there's one idea underneath all four that explains a very common bug, so it's worth working through first.

### The foreign key lives in exactly one place: owning side and `mappedBy`

**Scenario:** you're modeling `Order` and `OrderLine` — one order has many lines. You write this:

```java
order.getLines().add(newLine);
repository.save(order);
// ...and newLine's order_id column comes back null. Why?
```

Look at the actual database: there is only **one** foreign key column in this whole relationship — `order_line.order_id`. There is no column on the `orders` table pointing back at its lines; a parent row doesn't need one, because you find its lines with `WHERE order_id = ?`. So when you model the same relationship as two Java fields — `Order.lines` (a `List<OrderLine>`) and `OrderLine.order` (an `Order`) — only *one* of those two fields corresponds to a real column. That field is the **owning side**. The other field is a pure Java-side convenience, and it has to tell Hibernate: "don't create a column for me — the real foreign key lives on the other entity's field." That instruction is `mappedBy`:

```java
@Entity
class Order {
    @OneToMany(mappedBy = "order")   // "the real column is on OrderLine.order, not here"
    private List<OrderLine> lines;
}

@Entity
class OrderLine {
    @ManyToOne                       // no mappedBy — this side owns the order_id column
    @JoinColumn(name = "order_id")
    private Order order;
}
```

Read `mappedBy = "order"` as "this collection mirrors the field named `order` over on `OrderLine`" — the string has to exactly match that field's name.

That explains the scenario above precisely: **Hibernate only writes to the database through the owning side.** Doing `order.getLines().add(newLine)` alone updates only the in-memory Java list; it never touches `newLine.order`, so no `order_id` gets written, because the collection side isn't where JPA looks for what to persist. Section 4's sync-helper pattern below exists specifically to stop this bug from happening.

The rule for spotting the owning side on sight, from here on: **the side with `@JoinColumn` (or `@JoinTable`) owns the relationship; the side with `mappedBy` is the inverse, descriptive-only side.**

### `@ManyToOne` / `@OneToMany` — the everyday pair

The `Order`/`OrderLine` pair above, written out fully:

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

`@OneToMany` is lazy by default (section 4's last subsection covers exactly what that means); `@ManyToOne` is **eager by JPA's own default**, which is why it's marked `LAZY` explicitly here — leaving it eager is one of the most common real-world performance mistakes, covered later. `orphanRemoval = true` means removing a line from `order.getLines()` deletes that row from the database — this is a different thing from `CascadeType.REMOVE`, which only deletes children when the *parent itself* is deleted, not when a child is merely removed from the collection.

### `@OneToOne` — exactly one row maps to exactly one other row

**Scenario:** every `User` has exactly one `Profile` (bio, avatar, preferences) — never zero, never more than one. Two ways to model that:

**Foreign key on the owning side**, structurally identical to `@ManyToOne` but with a `unique` constraint added:

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

**Shared primary key with `@MapsId`** — `Profile.id` simply reuses `User.id`'s value, so you avoid an extra column and an extra unique index entirely:

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

`@OneToOne` is eager by JPA default, exactly like `@ManyToOne` — mark it lazy explicitly. One subtlety worth knowing: a lazy `@OneToOne` on the side *without* the foreign key column often still needs to run a query just to find out whether an associated row even exists, unless bytecode enhancement is specifically configured — Hibernate can't know "no row" from "not loaded yet" without asking. That's why the foreign-key-holding side, or `@MapsId`, is usually the preferred shape over a `mappedBy`-only lazy one-to-one.

### `@ManyToMany` — both sides can have many of the other

**Scenario:** a `Student` can enroll in many `Course`s, and a `Course` has many `Student`s.

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

`Student` owns the relationship here, because it's the side that declares the `@JoinTable`; `Course` is the inverse side.

**Scenario, continued:** now the business wants to record *when* each student enrolled in each course. Where does `enrolledAt` go? Nowhere — a plain `@ManyToMany` join table can only ever hold the two foreign keys; JPA gives you no entity to hang an extra column on. The fix is to stop using `@ManyToMany` at all and model the join table as its own real entity, `Enrollment`, with a plain `@ManyToOne` to each side:

```java
@Entity
class Enrollment {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne
    private Student student;

    @ManyToOne
    private Course course;

    private LocalDateTime enrolledAt;   // now there's somewhere for this to live
}
```

This is the standard answer to "how would you add a column to a many-to-many relationship" — you don't add it to `@ManyToMany`, you replace `@ManyToMany` with an explicit entity.

### Keeping both sides in sync in memory

Since Hibernate persists only from the owning side (the bug from earlier in this section), add helper methods to the parent so callers can't forget the inverse side and leave the in-memory object graph inconsistent with what actually gets saved:

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

Calling `order.addLine(newLine)` instead of `order.getLines().add(newLine)` directly makes it structurally impossible to forget the side that actually gets written.

### Cascade types: what happens to children when the parent changes

| Cascade | Effect when the parent operation runs |
|---|---|
| `PERSIST` | Saving the parent also saves new children |
| `MERGE` | Merging the parent also merges children |
| `REMOVE` | Deleting the parent also deletes children |
| `REFRESH` | Refreshing the parent also refreshes children |
| `DETACH` | Detaching the parent also detaches children |
| `ALL` | All of the above |

`REMOVE`/`ALL` fits a true parent-owns-child relationship, like `Order` → `OrderLine` — a line has no meaning without its order, so deleting the order should delete its lines. It's dangerous on `@ManyToMany` or any shared entity, like `Student` ↔ `Course`: cascading remove from `Student` could delete a `Course` that other students are still enrolled in.

### Why `equals()`/`hashCode()` on entities need special care

**Scenario:** you create a brand-new `OrderLine`, add it to a `HashSet` before saving it (so it has no database `id` yet — it's transient), then save it, and later look it up in that same set by its now-assigned `id`. It's not found, even though it's "the same" line.

Default identity-based `equals`/`hashCode` (Java's default, based on memory identity) technically works — until an entity is placed in a `Set` before it has a database-assigned ID, or gets compared across a detach/reattach cycle. The failure above happens specifically if `hashCode()` was overridden to use the mutable, database-generated `id` field: before saving, `id` is `null`, so the object hashes into one bucket; after saving, `id` has a real value, so it now belongs in a *different* bucket — but the `HashSet` never rehashes existing entries, so the lookup misses.

The safe pattern: base `equals`/`hashCode` on a natural business key when one genuinely exists (like `email` on `User`), or use a constant `hashCode()` (so hashing never changes across the entity's life) paired with an ID-based `equals()`, where two transient (no-ID) instances are only ever equal to themselves. Never base `hashCode()` purely on a mutable, database-generated `id` for exactly the reason the scenario above shows.

### LAZY vs EAGER: fetching immediately vs. on first access

"Lazy" means the associated data is fetched only when the field is first actually accessed in code; "eager" means it's fetched immediately, as part of the query that loads the owning entity — before your code has even asked for it. Each relationship annotation carries its own JPA default, and every one of them can be overridden with `fetch = FetchType.LAZY` or `fetch = FetchType.EAGER`:

| Relationship | JPA default | Why |
|---|---|---|
| `@OneToOne` | **EAGER** | JPA assumes a "to-one" side is cheap — one extra row |
| `@ManyToOne` | **EAGER** | Same reasoning: one row, e.g. `OrderLine.order` |
| `@OneToMany` | **LAZY** | A collection could be huge, e.g. all of a user's orders |
| `@ManyToMany` | **LAZY** | Same reasoning — potentially many rows on both sides |

In practice, the two EAGER defaults (`@OneToOne`, `@ManyToOne`) are the ones interviewers ask about, because leaving them eager silently pulls in extra data on *every* load of the parent — including places that never needed it.

**EAGER — fetched immediately, no code needed to trigger the query:**

```java
@Entity
class OrderLine {
    @ManyToOne   // fetch = EAGER by default — no override needed
    @JoinColumn(name = "order_id")
    private Order order;
}

OrderLine line = orderLineRepository.findById(1L).orElseThrow();
// The SQL for "line.order" already ran as part of the query above —
// even if this code never touches line.getOrder().
```

**LAZY — fetched only on first access, and only while the persistence context is still open:**

```java
@Entity
class Order {
    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)   // LAZY is already the default here
    private List<OrderLine> lines;
}

@Transactional(readOnly = true)
public OrderDetails loadOrder(Long id) {
    Order order = orderRepository.findById(id).orElseThrow();
    order.getLines().size();   // triggers a second SELECT, here, inside the still-open transaction
    return mapper.toDetails(order);
}
```

**Overriding an EAGER default to LAZY** — the single most common real-world change; almost every `@ManyToOne`/`@OneToOne` in a real app should be explicitly lazy:

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "order_id", nullable = false)
private Order order;
```

**Overriding a LAZY default to EAGER** — rare, and only reasonable when a collection is genuinely always needed and known to stay small, like a fixed short list of roles:

```java
@ManyToMany(fetch = FetchType.EAGER)
@JoinTable(name = "user_roles", ...)
private Set<Role> roles;
```

What actually goes wrong with each extreme:

- **EAGER everywhere** silently grows the query for every load. Turn on SQL logging and you'll see joins or extra `SELECT`s for associations the current use case never even reads. This is the root cause behind many "why is this simple endpoint slow" interview scenarios.
- **LAZY accessed too late** throws `LazyInitializationException` — the code tried `order.getLines()` *after* the transaction that loaded `order` had already closed (for example, in a controller, or inside a JSON serializer, rather than the `@Transactional` service method). The durable fix — foreshadowed in section 3 — is to read what you need inside the transaction and map it to a DTO there, not to make everything eager or turn on Open Session in View as a blanket workaround.

**Rule of thumb for interviews:** default every relationship to `LAZY` explicitly, and fetch exactly what a given use case needs with a fetch join, `@EntityGraph`, or a projection (section 7 covers all three). Never solve a missing-data problem by flipping a relationship to EAGER globally — that fix helps the one use case that needed the data and silently taxes every other use case that didn't.

## 5. Querying: Derived Methods, JPQL, and Optional Filters

The simplest queries don't need any SQL at all — Spring Data JPA can generate them from a method name:

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
```

That's readable for simple, fixed predicates. But what about "give me a page of users with a given status," where the filter needs a real query and pagination? That's where **JPQL (Java Persistence Query Language)** comes in — a query language that looks like SQL but is written in terms of entity names and Java field names, not table and column names, so it stays portable across databases:

```java
    @Query("select u from User u where u.status = :status")
    Page<User> findByStatus(UserStatus status, Pageable pageable);

    @Query("select new com.example.UserSummary(u.id, u.name) " +
           "from User u where u.status = :status")
    List<UserSummary> findSummaries(UserStatus status);
}
```

That second query is a **projection** — instead of loading a complete `User` entity, it constructs a lightweight `UserSummary` (just `id` and `name`) directly from the query. For a read-only list screen that only ever displays two fields, loading the full entity — every column, every lazy relationship proxy — is wasted work; a projection fetches only what's actually going to be shown. Once a query needs explicit joins or a feature specific to your database, reach for JPQL, the Criteria API, Querydsl, or native SQL instead of a derived method name.

**Scenario:** a search screen lets a user filter by name, status, and a date range — and any subset of those three might be supplied, or none at all. Writing one JPQL string per possible combination (name only, status only, name+status, all three...) doesn't scale — that's up to eight variants for just three optional filters. `Specification` composes predicates at runtime instead, one filter at a time:

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

Returning `null` from a `Specification` lambda means "skip this predicate entirely" — that's exactly how the optional filters compose cleanly without writing an `if` per combination. Querydsl solves the same underlying problem with generated, type-safe query classes instead of the Criteria API's string-based attribute names (`root.get("name")` above is a string that a typo would only catch at runtime); reach for either one over hand-built JPQL string concatenation once the number of optional filters grows past two or three.

## 6. Transactions: Grouping Operations That Must Succeed or Fail Together

**Scenario:** moving an order also needs to write an audit log entry. What should happen if the audit write fails right after the order update succeeds — should the order update be undone too, so you never end up with a moved order and no record of who moved it?

```java
@Transactional
public void move(Order order, User user) {
    orderRepository.save(order);
    auditRepository.save(new AuditEntry("ORDER_MOVED", user.getId()));
}
```

`@Transactional` (the same annotation from file 01's proxy discussion) wraps this whole method in one database transaction: both writes commit together, or — if anything throws — both roll back together, leaving the database exactly as it was before the method ran. This all-or-nothing behavior, plus a few related guarantees, is what people mean by **ACID (Atomicity, Consistency, Isolation, Durability)** — Atomicity being precisely this "both happen or neither happens" property.

Put the boundary around a business operation, not around an arbitrary single repository call — a transaction spanning only `orderRepository.save(order)` alone would let the audit write fail independently, defeating the whole point.

**Propagation** decides what happens when a `@Transactional` method calls another `@Transactional` method. The default, `REQUIRED`, joins whatever transaction is already running, or starts one if there isn't one. `REQUIRES_NEW` suspends the caller's transaction and starts a completely separate one — useful for something like audit logging that should still get recorded even if the outer business operation later rolls back, but it can surprise you: a `REQUIRES_NEW` write commits independently and won't be undone by the outer transaction's rollback.

**Rollback** happens automatically for unchecked exceptions; a checked exception does *not* trigger a rollback unless you explicitly add `rollbackFor` — the same rule file 01 mentioned in passing, restated here because it matters most at the database boundary.

**Isolation** controls what one transaction is allowed to see of another transaction's in-progress, uncommitted work — and the anomalies it's named after are easiest to understand as scenarios, not definitions:

- **Dirty read:** transaction A updates a row but hasn't committed yet. Transaction B reads that row and sees A's *uncommitted* change. Then A rolls back. B just made a decision based on data that, as far as the database is concerned, never actually happened.
- **Non-repeatable read:** transaction B reads a row, does some other work, then reads the *same* row again in the same transaction — and gets a different value, because transaction A committed a change to it in between B's two reads.
- **Phantom read:** transaction B runs the same `WHERE status = 'ACTIVE'` query twice in one transaction, and gets a different *set of rows* the second time, because transaction A inserted or deleted a row matching that condition in between.

Higher isolation levels prevent more of these anomalies at the cost of more locking and less concurrency; the exact default isolation level depends on the specific database (PostgreSQL and MySQL don't default to the same one). `readOnly = true` on `@Transactional` is a hint that may reduce flush work for a read-only method — it does not universally mean "no locks" or "guaranteed faster," since that still depends on the database and driver.

## 7. The N+1 Problem

**Scenario:** an endpoint loads 100 orders, then for each order accesses `order.getLines()` to build a response. If `lines` is lazy (the correct default from section 4), each access that hasn't been fetched yet fires its own `SELECT`. One query loads the 100 orders; then 100 more queries load each order's lines separately. Total: 101 queries for something that should have taken one or two. This is the **N+1 problem** — one query for the parents, plus N more, one per parent, for the children.

You detect it the same way you'd detect any unexpected extra work: turn on SQL logging, or a datasource metrics view, and count the queries a single request actually issues — a request generating 101 queries for what looks like "get 100 orders" is the tell.

The fix is never "make it eager everywhere" (section 4 already explained why that just moves the cost to every *other* use case). Instead, fetch exactly what this particular use case needs, in one query, with a fetch join:

```java
@Query("select distinct o from Order o " +
       "left join fetch o.lines where o.id = :id")
Optional<Order> findDetails(@Param("id") Long id);
```

`@EntityGraph`, batch fetching, and DTO projections (section 5) are the other standard alternatives. One trap worth knowing about specifically: combining a *collection* fetch join with pagination can silently produce incorrect or inefficient results, because the join multiplies rows before the database applies the `LIMIT`. For paged results, select just the IDs first (or project only the fields you need), then fetch details for that specific page separately.

Tying back to section 3: a `LazyInitializationException` means code accessed a lazy association after its persistence context had already closed. The durable fix is exactly what section 3 and 4 already said — fetch the required data inside an open transaction and map it to a DTO there — not to enable Open Session in View as a way to keep the persistence context open indefinitely.

## 8. Locking: Handling Two Updates to the Same Row

**Scenario:** two support agents both open the same `User` record to edit it. Agent A changes the email and saves. A few seconds later, agent B — who loaded the *old* data and never saw A's change — changes the phone number and saves. Whichever save happens second silently overwrites the other agent's change, with no warning to either of them. This is a **lost update**.

**Optimistic locking** fixes this using the `@Version` field from section 2. Every update includes a check: "only apply this update if the version number is still what I originally read." Hibernate does this automatically once a field is annotated `@Version` — the generated `UPDATE` includes `WHERE id = ? AND version = ?`, and if that `WHERE` matches zero rows (because someone else already updated it, bumping the version), Hibernate throws an `OptimisticLockException` instead of silently overwriting. The caller then has to reload the current data and retry, rather than clobbering someone else's work. This is "optimistic" because it assumes conflicts are rare and only checks for one at the moment of writing, rather than blocking anyone else the whole time you're editing.

**Pessimistic locking** takes the opposite stance: assume conflicts are likely, and block other transactions from touching the row at all until you're done.

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select u from User u where u.id = :id")
Optional<User> findByIdForUpdate(@Param("id") Long id);
```

This generates a `SELECT ... FOR UPDATE`, holding a real database lock on that row until the transaction commits or rolls back. It requires short, well-indexed transactions — holding a row lock across a slow operation blocks every other transaction that needs that row, and locking rows in inconsistent order across different code paths is exactly how deadlocks happen, so lock ordering and deadlock-retry handling still matter.

Optimistic locking suits low-conflict situations — most edits to most rows, most of the time, like the two-support-agents scenario above, where a retry is cheap and collisions are rare. Pessimistic locking suits short, highly-contended critical sections where you'd genuinely rather block briefly than ever have to detect and retry a conflict — inventory decrement during a flash sale is a common example.

## 9. Indexes: Making Reads Fast Without Breaking Writes

**Scenario:** `findByEmail` was fast with a thousand test rows and turned painfully slow once the `users` table hit a few million real rows. Without an index, the database has no shortcut — it scans every row to find a match, and that scan gets linearly slower as the table grows.

An index is a separate, ordered structure the database maintains alongside the table, letting it jump straight to matching rows instead of scanning everything. That speed isn't free: every index has to be updated on every `INSERT`/`UPDATE`/`DELETE` to the columns it covers, so indexes trade write speed and storage for read speed. Index the columns actually used by selective filters, joins, and `ORDER BY` clauses — not every column "just in case" — and confirm the index is actually being used with `EXPLAIN` (or your database's equivalent query-plan tool) rather than assuming it.

An index existing doesn't guarantee the database uses it: wrapping an indexed column in a function (`WHERE UPPER(email) = ?` against a plain index on `email`) or filtering with a leading wildcard (`LIKE '%smith'`) commonly prevents the database from using the index efficiently, forcing it back to a full scan anyway.

## 10. Bulk Updates and Testing Against a Real Database

**Scenario:** you need to deactivate 50,000 users matching some condition in one shot. Loading all 50,000 entities, calling a setter on each, and letting dirty checking (section 3) generate 50,000 individual `UPDATE` statements is far too slow. A bulk update sends one `UPDATE` statement straight to the database:

```java
@Modifying(clearAutomatically = true)
@Query("update User u set u.status = 'INACTIVE' where u.lastLoginAt < :cutoff")
int deactivateInactive(@Param("cutoff") LocalDateTime cutoff);
```

The trade-off: a bulk update is efficient, but it bypasses the persistence context entirely — no dirty checking, no entity lifecycle callbacks. If any of those 50,000 rows were *already loaded as managed entities* earlier in the same transaction, those in-memory objects are now stale; they still hold the old status, unaware the database just changed underneath them. `clearAutomatically = true` clears the persistence context after the bulk operation specifically to prevent that staleness, or you can run the bulk update in its own transaction and reload anything you need afterward.

**Testing this kind of thing well means testing against something real.** `@DataJpaTest` spins up repository tests with a real (if often in-memory) JPA setup, which is enough to check that your mappings and derived queries are shaped correctly. But H2 (a common in-memory test database) being satisfied with a query proves nothing about whether that same query works, or performs the same way, on MySQL or PostgreSQL — different databases parse and optimize SQL differently, and database-specific functions won't even exist in H2. Testcontainers — spinning up a real, disposable instance of your actual production database engine inside a Docker container for the test run — is the way to get a test that actually proves production behavior, once a query is important enough that "it worked in H2" isn't a reassuring enough answer.

## Interview Questions and Answers

### 1. What's the actual difference between JPA, Hibernate, and Spring Data JPA?

**Answer:** JPA is the specification — a set of standard interfaces and annotations. Hibernate is the most common implementation of that specification — it's the library that actually generates SQL and executes it. Spring Data JPA sits a layer above both, generating a working repository implementation from an interface so you don't hand-write basic CRUD methods.

### 2. What is dirty checking, and why does an entity update without an explicit `save()` call?

**Answer:** Hibernate tracks every managed entity's field values against a snapshot taken when it was loaded. At flush time — normally just before commit — it compares current values to that snapshot and generates `UPDATE` statements for anything that changed, which is why a plain setter call inside a `@Transactional` method is enough to persist a change.

### 3. `save()` versus `flush()`?

**Answer:** `save()` makes an entity persistent (if it was transient) or merges it back in (if it was detached) — one call that adapts to whatever state the entity is in. `flush()` sends any pending SQL to the database immediately, without ending the transaction; a single transaction can flush multiple times before it finally commits.

### 4. What decides the owning side of a relationship, and why does it matter?

**Answer:** The side that physically holds the foreign key column — marked with `@JoinColumn` or `@JoinTable` — is the owning side; Hibernate only persists writes made through that side. The other side, marked `mappedBy`, is inverse and read-only from Hibernate's perspective. In `@OneToMany`/`@ManyToOne`, the "many" side almost always owns the relationship, since that's where the foreign key column actually lives. Updating only the inverse-side collection in memory and forgetting the owning side is a common real bug: nothing gets saved.

### 5. Why shouldn't you add extra columns directly to a `@ManyToMany` relationship?

**Answer:** `@ManyToMany` with `@JoinTable` can only ever map the two foreign keys — there's no entity to attach an extra column like `enrolledAt` to. The fix is to stop modeling it as `@ManyToMany` and introduce an explicit join entity (e.g., `Enrollment`) with a `@ManyToOne` to each side, which is a normal entity you can add any field to.

### 6. Why can `equals()`/`hashCode()` on a JPA entity cause subtle bugs?

**Answer:** Identity-based defaults break across a detach/merge cycle, and hashing a mutable, database-generated `id` breaks `HashSet`/`HashMap` lookups if the entity is added before it's persisted (`id == null`) and looked up afterward (`id` now assigned) — it lands in a different bucket. Prefer a natural business key for `equals`/`hashCode` when one exists, or a constant hash code paired with ID-based equality that treats distinct transient instances as unequal to each other.

### 7. Explain the N+1 problem and how you'd fix it.

**Answer:** One query loads a list of parent entities, and then accessing a lazy association on each parent individually fires one additional query per parent — N extra queries on top of the original one. Fix it with a targeted fetch join, `@EntityGraph`, batch fetching, or a DTO projection for the specific use case; never by making the relationship eager globally, since that only shifts the cost onto every other use case that didn't need the data.

### 8. Why is `@ManyToOne(fetch = LAZY)` written out explicitly so often, when `LAZY` isn't even the JPA default there?

**Answer:** That's exactly the point — JPA's default for `@ManyToOne` (and `@OneToOne`) is EAGER, which silently loads the associated entity on every query, whether or not the current use case needs it. Writing `fetch = FetchType.LAZY` explicitly overrides that default so each use case controls what it actually loads.

### 9. What does `@Transactional` actually guarantee, and what can it not do?

**Answer:** It defines an all-or-nothing boundary for the database operations inside it, through Spring's proxy mechanism (file 01 covers proxies generally) — all writes commit together or all roll back together. It cannot roll back things outside the database, like an email that already went out or an external HTTP call that already succeeded.

### 10. Walk through dirty read, non-repeatable read, and phantom read.

**Answer:** A dirty read sees another transaction's uncommitted change, which might later be rolled back. A non-repeatable read gets a different value reading the *same row* twice in one transaction, because another transaction committed a change in between. A phantom read gets a different *set of rows* running the same query twice in one transaction, because another transaction inserted or deleted a matching row in between. Higher isolation levels prevent more of these at the cost of more locking.

### 11. Optimistic versus pessimistic locking — how do you choose?

**Answer:** Optimistic locking (via `@Version`) allows concurrent reads and only detects a conflict at write time, throwing an exception the caller must handle by retrying — good for low-conflict situations where most attempts succeed. Pessimistic locking (`SELECT ... FOR UPDATE`) blocks other transactions from touching the row for the duration, suiting short, highly-contended critical sections where a retry would be more expensive than briefly blocking.

### 12. Why can a bulk update be dangerous, even though it's efficient?

**Answer:** A bulk `UPDATE`/`DELETE` bypasses the persistence context entirely — no dirty checking, no lifecycle callbacks. Any entity already loaded as managed earlier in the same transaction keeps its old, now-stale in-memory values, unaware the database changed underneath it. Use `clearAutomatically = true`, a separate transaction, or an explicit reload afterward.

### 13. Why are database constraints still necessary if the application already validates input?

**Answer:** Application validation runs per-request; two concurrent requests can both pass the same check before either one writes, because the check and the write aren't atomic together. A database-level `UNIQUE` or foreign-key constraint is enforced at the actual point of writing and is the only guarantee that holds regardless of request timing.

### 14. How would you investigate a slow query in production?

**Answer:** Capture the actual generated SQL and its parameters, check how many queries a single request issues (ruling out N+1), inspect the query plan with `EXPLAIN`, verify the relevant columns are indexed and that the index is actually being used (not defeated by a wrapped function or leading wildcard), then consider a projection, pagination, or query rewrite — and measure before and after the change.

### 15. How would you build a search endpoint with several independent optional filters?

**Answer:** Not with one JPQL string per possible filter combination. Use Spring Data's `Specification` (or Querydsl) to compose predicates at runtime, returning `null` from a predicate when that particular filter wasn't supplied — which composes cleanly with `Specification.where(...).and(...)` — then pass the combined result to `findAll(spec, pageable)`.

### 16. Why does testing a query against H2 not prove it works in production?

**Answer:** Different databases parse and optimize SQL differently, and database-specific functions or behaviors simply don't exist in an in-memory test database like H2. `@DataJpaTest` against H2 is a reasonable check that mappings and query shapes are correct, but Testcontainers — running the actual production database engine for the test — is what actually proves a query behaves the same way in production.

## Revision Checklist

- [ ] Explain, using the hand-written JDBC example, exactly what repetitive problem ORM removes — and state plainly what JPA, Hibernate, and Spring Data JPA each are.
- [ ] Map a class with `@Entity`/`@Table`/`@Id`/`@GeneratedValue`/`@Column`/`@Enumerated`, and explain why a database-level constraint is still needed even with application validation.
- [ ] Explain the four entity states (transient, managed, detached, removed), the persistence context, dirty checking, and the difference between `save()` and `flush()`.
- [ ] Explain `mappedBy` and the owning side using the `Order`/`OrderLine` bug scenario — and say why only the owning side's writes get persisted.
- [ ] Map all four relationship types and identify the owning side in each; know when to replace `@ManyToMany` with an explicit join entity.
- [ ] Explain why identity-based `equals`/`hashCode` on entities is easy to get wrong, and what the safe alternative is.
- [ ] State the JPA default fetch type for each relationship annotation, and explain what goes wrong at both extremes (EAGER everywhere vs. `LazyInitializationException`).
- [ ] Compose an optional-filter search query with `Specification`/Querydsl instead of one query string per combination.
- [ ] Explain transaction propagation (`REQUIRED` vs `REQUIRES_NEW`), rollback rules, and the three isolation anomalies with a concrete scenario for each.
- [ ] Diagnose the N+1 problem from query counts or SQL logs and pick an appropriate fix (fetch join, `@EntityGraph`, batch fetching, projection).
- [ ] Compare optimistic (`@Version`) and pessimistic (`SELECT ... FOR UPDATE`) locking using the lost-update scenario, and say when each is the right choice.
- [ ] Explain why a bulk update bypasses dirty checking, and how to avoid ending up with stale managed entities afterward.
- [ ] Design an index for a slow query and confirm it's actually used with `EXPLAIN`.
- [ ] Explain why passing against H2 doesn't prove a query works in production, and when Testcontainers is worth reaching for.
