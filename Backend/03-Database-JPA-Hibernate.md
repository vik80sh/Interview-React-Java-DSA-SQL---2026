# Database & JPA/Hibernate
## Complete Guide to ORM and Data Access

---

## TABLE OF CONTENTS
1. JPA/Hibernate Basics
2. Entity Mapping
3. Relationships (One-to-Many, Many-to-Many)
4. JPQL & Query Methods
5. Transactions & Performance
6. Common Interview Questions

---

# PART 1: JPA/HIBERNATE BASICS

## What is JPA?

```
JPA = Java Persistence API (interface/specification)
Hibernate = Implementation of JPA (most popular)

Flow:
Java Object → Hibernate → SQL → Database
Database → Hibernate → Java Object

BENEFITS:
- Object-relational mapping (ORM)
- No manual SQL writing
- Type-safe queries
- Automatic transaction handling
- Caching

DISADVANTAGES:
- Performance overhead
- N+1 query problem
- Complex queries harder to optimize
```

---

## Minimal JPA Setup

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
</dependency>
```

```properties
# application.properties
spring.datasource.url=jdbc:mysql://localhost:3306/mydb
spring.datasource.username=root
spring.datasource.password=password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
```

---

# PART 2: ENTITY MAPPING

## Basic Entity

```java
@Entity
@Table(name = "users") // Optional, defaults to class name
public class User {
    
    @Id // Primary key
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Auto-increment
    private Long id;
    
    @Column(unique = true, nullable = false, length = 100)
    private String email;
    
    @Column(nullable = false)
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String bio;
    
    @CreationTimestamp // Automatically set on creation
    private LocalDateTime createdAt;
    
    @UpdateTimestamp // Automatically set on update
    private LocalDateTime updatedAt;
    
    // Getters/setters (or use Lombok @Data)
}

// ANNOTATIONS:
// @Entity - Marks as JPA entity (mapped to DB table)
// @Table - Specify table name
// @Id - Primary key
// @GeneratedValue - Auto-generate value
// @Column - Customize column
// @Transient - Exclude from DB
// @CreationTimestamp/@UpdateTimestamp - Audit fields
```

---

## Column Annotations

```java
@Entity
public class Product {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // Simple column
    @Column(nullable = false)
    private String name;
    
    // Unique column
    @Column(unique = true)
    private String sku;
    
    // Length constraint
    @Column(length = 50)
    private String category;
    
    // Precision for decimals
    @Column(precision = 10, scale = 2) // 99999999.99
    private BigDecimal price;
    
    // Large text
    @Column(columnDefinition = "TEXT")
    private String description;
    
    // Not persisted in database
    @Transient
    private boolean isOutOfStock;
    
    // Enum stored as string
    @Enumerated(EnumType.STRING)
    private Status status; // ACTIVE, INACTIVE, DELETED
}

enum Status {
    ACTIVE, INACTIVE, DELETED
}
```

---

## Inheritance Strategies

```java
// Strategy 1: SINGLE_TABLE (One table for all, discriminator column)
@Entity
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "type")
public abstract class Animal {
    @Id
    private Long id;
}

@Entity
@DiscriminatorValue("DOG")
public class Dog extends Animal { }

@Entity
@DiscriminatorValue("CAT")
public class Cat extends Animal { }

// Result: Single "animal" table with "type" column (DOG, CAT)

// Strategy 2: TABLE_PER_CLASS (Separate table for each)
@Entity
@Inheritance(strategy = InheritanceType.TABLE_PER_CLASS)
public abstract class Animal {
    @Id
    private Long id;
}

@Entity
public class Dog extends Animal { } // "dog" table

@Entity
public class Cat extends Animal { } // "cat" table

// Strategy 3: JOINED (Separate table with foreign key)
@Entity
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class Animal {
    @Id
    @GeneratedValue
    private Long id;
}

@Entity
public class Dog extends Animal { } // "dog" table with foreign key to "animal"

// BEST PRACTICE:
// - SINGLE_TABLE if little variation
// - JOINED if lots of unique fields per subclass
// - Avoid TABLE_PER_CLASS (complex queries)
```

---

# PART 3: RELATIONSHIPS

## One-to-Many & Many-to-One

```java
// COMPANY → EMPLOYEES (1 to Many)

@Entity
public class Company {
    @Id
    @GeneratedValue
    private Long id;
    
    private String name;
    
    // One company has many employees
    @OneToMany(mappedBy = "company")
    private List<Employee> employees;
}

@Entity
public class Employee {
    @Id
    @GeneratedValue
    private Long id;
    
    private String name;
    
    // Many employees belong to one company
    @ManyToOne
    @JoinColumn(name = "company_id") // Foreign key
    private Company company;
}

// USAGE:
Company company = new Company();
company.setName("Tech Corp");
// ... save company

Employee emp = new Employee();
emp.setName("John");
emp.setCompany(company);
// ... save employee

// Querying:
Company c = companyRepo.findById(1L).get();
List<Employee> employees = c.getEmployees(); // Lazy loaded!

// FETCH TYPES:
// LAZY (default): Load only when accessed
// EAGER: Load immediately with parent
@OneToMany(mappedBy = "company", fetch = FetchType.EAGER)
```

---

## Many-to-Many

```java
// STUDENTS ↔ COURSES (Many to Many)

@Entity
public class Student {
    @Id
    @GeneratedValue
    private Long id;
    
    private String name;
    
    @ManyToMany
    @JoinTable(
        name = "student_course",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private List<Course> courses;
}

@Entity
public class Course {
    @Id
    @GeneratedValue
    private Long id;
    
    private String title;
    
    @ManyToMany(mappedBy = "courses")
    private List<Student> students;
}

// USAGE:
Student s1 = new Student("Alice");
Student s2 = new Student("Bob");

Course c1 = new Course("Java");
Course c2 = new Course("Python");

s1.getCourses().add(c1);
s1.getCourses().add(c2);
s2.getCourses().add(c1);

// Creates join table: student_course(student_id, course_id)

// CASCADING:
@ManyToMany(cascade = CascadeType.ALL)
// When student is deleted, cascading actions apply

// CASCADE TYPES:
// CascadeType.ALL - Propagate all operations
// CascadeType.PERSIST - Cascade save
// CascadeType.MERGE - Cascade update
// CascadeType.REMOVE - Cascade delete
// CascadeType.REFRESH - Cascade refresh
```

---

# PART 4: JPQL & QUERIES

## Basic Queries

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Spring generates SQL automatically!
    
    // Find by single field
    User findByEmail(String email);
    
    // Find by multiple fields
    User findByEmailAndName(String email, String name);
    
    // Find with condition
    List<User> findByEmailContaining(String email);
    List<User> findByNameIgnoreCase(String name);
    List<User> findByCreatedAtAfter(LocalDateTime date);
    
    // List queries
    List<User> findAll(); // Inherited from JpaRepository
    Page<User> findAll(Pageable pageable);
    
    // Check existence
    boolean existsByEmail(String email);
    
    // Count
    long countByRole(String role);
}

// QUERY KEYWORDS:
// findBy + Field + Condition
// And, Or, Between, LessThan, GreaterThan, Like, In, IsNull, IsNotNull, etc.
```

---

## Custom JPQL Queries

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // JPQL (object-oriented, uses entity names)
    @Query("SELECT u FROM User u WHERE u.email = :email")
    User findByEmailCustom(@Param("email") String email);
    
    // With multiple parameters
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.role = :role")
    List<User> findByEmailAndRole(
        @Param("email") String email,
        @Param("role") String role
    );
    
    // With JOIN
    @Query("SELECT u FROM User u LEFT JOIN u.company c WHERE c.name = :companyName")
    List<User> findByCompanyName(@Param("companyName") String companyName);
    
    // Aggregation
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRole(@Param("role") String role);
    
    @Query("SELECT new com.example.UserDTO(u.id, u.name, u.email) " +
           "FROM User u WHERE u.role = :role")
    List<UserDTO> findDTOByRole(@Param("role") String role);
    
    // Custom update
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.role = :role WHERE u.id = :id")
    void updateRole(@Param("id") Long id, @Param("role") String role);
    
    // Delete
    @Modifying
    @Transactional
    @Query("DELETE FROM User u WHERE u.role = :role")
    int deleteByRole(@Param("role") String role);
}

// JPQL:
// FROM User (not FROM users)
// u.email = :email (use entity names and fields)
// SELECT u FROM User u
// SELECT new DTO(...)

// NATIVE QUERY (raw SQL):
@Query(value = "SELECT * FROM users WHERE role = ?1", nativeQuery = true)
List<User> findByRoleNative(String role);
```

---

# PART 5: TRANSACTIONS & PERFORMANCE

## Transaction Management

```java
@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private CompanyRepository companyRepository;
    
    // Default: REQUIRED (join existing or create new)
    @Transactional
    public void createUserWithCompany(User user, Company company) {
        companyRepository.save(company);
        user.setCompany(company);
        userRepository.save(user);
        
        // If exception thrown here, both are rolled back!
    }
    
    // READ-ONLY optimization
    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    
    // Different isolation level
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public User updateUser(Long id, String name) {
        User user = userRepository.findById(id).get();
        user.setName(name);
        return userRepository.save(user);
    }
    
    // No transaction
    @Transactional(propagation = Propagation.NEVER)
    public void logAction(String action) {
        // This method should not run in a transaction
    }
    
    // Rollback on specific exception
    @Transactional(rollbackFor = Exception.class)
    public void process() throws Exception {
        // Rollback even on checked exception
    }
}

// ISOLATION LEVELS:
// READ_UNCOMMITTED - Dirty reads allowed (avoid)
// READ_COMMITTED - No dirty reads (default)
// REPEATABLE_READ - No dirty reads or non-repeatable reads
// SERIALIZABLE - Complete isolation (slowest)

// PROPAGATION:
// REQUIRED - Join or create (default)
// REQUIRES_NEW - Always new transaction
// NESTED - Nested transaction (savepoints)
// NEVER - No transaction (error if one exists)
```

---

## N+1 Problem & Solutions

```java
// ❌ PROBLEM: N+1 queries
@Entity
public class Company {
    @OneToMany(mappedBy = "company", fetch = FetchType.LAZY)
    private List<Employee> employees;
}

@Service
public class CompanyService {
    public void printCompanies() {
        List<Company> companies = companyRepository.findAll(); // 1 query
        
        for (Company c : companies) {
            System.out.println(c.getName());
            for (Employee e : c.getEmployees()) { // N queries (one per company)
                System.out.println(e.getName());
            }
        }
        // Total: 1 + N queries = N+1 problem!
    }
}

// ✅ SOLUTION 1: EAGER fetch
@OneToMany(mappedBy = "company", fetch = FetchType.EAGER)
private List<Employee> employees;

// Only works well if relationship is small

// ✅ SOLUTION 2: JOIN FETCH in JPQL
@Query("SELECT DISTINCT c FROM Company c LEFT JOIN FETCH c.employees")
List<Company> findAllWithEmployees();

// ✅ SOLUTION 3: EntityGraph
@Entity
@NamedEntityGraph(name = "Company.employees",
    attributeNodes = @NamedAttributeNode("employees"))
public class Company { }

@Query("SELECT c FROM Company c")
@EntityGraph("Company.employees")
List<Company> findAllWithEmployees();

// ✅ SOLUTION 4: Projection/DTO
@Query("SELECT new com.example.CompanyDTO(c.id, c.name) FROM Company c")
List<CompanyDTO> findAllProjection();

// RULE: EAGER by default risks memory issues, LAZY requires care with N+1
```

---

## Lazy Loading Exception

```java
// ❌ PROBLEM: Lazy loading after session closes
@Service
public class UserService {
    
    @Transactional(readOnly = true)
    public User getUser(Long id) {
        return userRepository.findById(id).get();
    } // Session closes here
}

// In Controller:
User user = userService.getUser(1); // Transaction closed
user.getCompany().getName(); // ❌ LazyInitializationException!

// ✅ SOLUTION 1: Load in service (eager)
@Transactional(readOnly = true)
public UserDTO getUser(Long id) {
    User user = userRepository.findById(id).get();
    String companyName = user.getCompany().getName(); // Load in transaction
    return new UserDTO(user, companyName);
}

// ✅ SOLUTION 2: EAGER fetch
@ManyToOne(fetch = FetchType.EAGER)
private Company company;

// ✅ SOLUTION 3: JOIN FETCH
@Query("SELECT u FROM User u LEFT JOIN FETCH u.company WHERE u.id = :id")
User findByIdWithCompany(@Param("id") Long id);
```

---

# PART 6: INTERVIEW QUESTIONS

## Question 1: Difference between JPA and Hibernate

**Answer:**
```
JPA: Specification/Interface (Java standard)
Hibernate: Implementation (most popular ORM framework)

Analogy:
JPA = Interface
Hibernate = Implementation class

Other JPA implementations: EclipseLink, OpenJPA

Spring Data JPA = Abstraction layer over JPA/Hibernate
```

---

## Question 2: How do you handle N+1 problem?

**Answer:**
```
Problem: 1 query to load parents + N queries to load children = N+1 total

Solutions:
1. JOIN FETCH in JPQL
   @Query("SELECT c FROM Company c LEFT JOIN FETCH c.employees")
   
2. EntityGraph annotation
   @EntityGraph("Company.employees")
   List<Company> findAll();
   
3. Projection/DTO (load only needed data)
   
4. EAGER fetch (if relationship is small)
   
5. Batch fetching (load children in batches)

Best: JOIN FETCH or EntityGraph (explicit about what's loaded)
```

---

## Question 3: @Transactional - When needed?

**Answer:**
```
@Transactional is needed when:
1. Multiple database operations (save, update, delete)
2. Want automatic rollback on exception
3. Need isolation from concurrent transactions

REQUIRED (default): Reuse existing or create new
REQUIRES_NEW: Always new (separate from caller)
NESTED: Nested transaction with savepoints

Read-only optimization:
@Transactional(readOnly = true)
- No locks
- Faster
- Safe for queries

Don't need @Transactional:
- Single save/delete (automatic)
- Repository methods (already transactional)
- Query-only operations

RULE: Use @Transactional for multiple operations or complex logic
```

---

## Question 4: LAZY vs EAGER loading

**Answer:**
```
LAZY (default):
✅ Load only when accessed
✅ Faster initial load
✅ Less memory
❌ Risk of N+1 problem
❌ LazyInitializationException if session closed

EAGER:
✅ Everything loaded upfront
✅ No lazy initialization exception
❌ Slower
❌ More memory
❌ Loads unnecessary data

Best Practice:
- Default to LAZY
- Use JOIN FETCH explicitly when needed
- Use EntityGraph for complex loading strategies
- Never use EAGER for large relationships
```

---

## Question 5: How to update without loading?

**Answer:**
```
❌ Traditional: Load then update
User user = userRepository.findById(1L).get();
user.setName("New Name");
userRepository.save(user); // 2 queries: SELECT + UPDATE

✅ Direct update (no load):
@Modifying
@Transactional
@Query("UPDATE User u SET u.name = :name WHERE u.id = :id")
void updateName(@Param("id") Long id, @Param("name") String name);

Benefits:
- Single query
- Faster
- Less memory
- No entity object needed

Trade-off:
- No entity validation
- No cascade operations
- No dirty-checking
```

---

# SUMMARY: Database & JPA Mastery

✅ **JPA Basics:**
- [ ] Understand ORM concept
- [ ] Know @Entity, @Id, @Column
- [ ] Know GenerationType strategies

✅ **Relationships:**
- [ ] Know @OneToMany, @ManyToOne
- [ ] Know @ManyToMany with JoinTable
- [ ] Know LAZY vs EAGER

✅ **Queries:**
- [ ] Know method naming (findBy, findAll, etc.)
- [ ] Can write JPQL queries
- [ ] Know aggregation queries

✅ **Performance:**
- [ ] Understand N+1 problem
- [ ] Know JOIN FETCH solution
- [ ] Understand lazy loading exceptions
- [ ] Know when to use projections

✅ **Transactions:**
- [ ] Know @Transactional
- [ ] Understand rollback behavior
- [ ] Know isolation levels
- [ ] Know propagation strategies

---

**Master JPA/Hibernate—they're critical for backend!**
