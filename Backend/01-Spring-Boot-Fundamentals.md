# Spring Boot Fundamentals
## Complete Interview Guide with Real Examples

---

## TABLE OF CONTENTS
1. Spring Boot Basics & Setup
2. Dependency Injection & Inversion of Control
3. Common Annotations
4. Application Properties & Configuration
5. Spring Boot Starters
6. Common Interview Questions

---

# PART 1: SPRING BOOT BASICS

## What is Spring Boot?

```
Spring Framework: Low-level framework, requires lots of XML config
Spring Boot: Opinionated, auto-configured version of Spring

BENEFITS:
- Auto-configuration (no XML)
- Embedded servers (Tomcat built-in)
- Starter dependencies (simplified pom.xml)
- Production-ready (metrics, health checks)
- Convention over configuration
```

---

## Spring Boot Project Structure

```
my-app/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/myapp/
│   │   │       ├── MyAppApplication.java (entry point)
│   │   │       ├── controller/
│   │   │       │   └── UserController.java
│   │   │       ├── service/
│   │   │       │   └── UserService.java
│   │   │       ├── repository/
│   │   │       │   └── UserRepository.java
│   │   │       ├── entity/
│   │   │       │   └── User.java
│   │   │       ├── exception/
│   │   │       │   └── UserNotFoundException.java
│   │   │       └── config/
│   │   │           └── AppConfig.java
│   │   └── resources/
│   │       ├── application.properties
│   │       └── application-prod.properties
│   └── test/
│       └── java/com/example/myapp/...
└── pom.xml (Maven dependencies)
```

---

## Minimal Spring Boot App

```java
// pom.xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

// MyAppApplication.java (Entry point)
@SpringBootApplication
public class MyAppApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyAppApplication.class, args);
    }
}

// UserController.java
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.getUserById(id);
    }
}

// That's it! Server runs on port 8080 automatically
```

---

# PART 2: DEPENDENCY INJECTION & IOC

## What is Inversion of Control (IoC)?

```java
// ❌ TRADITIONAL: You create objects
class UserController {
    private UserService userService;
    
    public UserController() {
        userService = new UserService(); // I create it
    }
}

// ✅ IoC: Spring creates objects
class UserController {
    private UserService userService;
    
    @Autowired
    public UserController(UserService userService) {
        this.userService = userService; // Spring provides it
    }
}

// BENEFITS:
// - Loose coupling
// - Easy to test (inject mocks)
// - Centralized object management
// - Spring handles object lifecycle

```

## Complete Flow

```text
Application Starts
        │
        ▼
Component Scan
        │
        ▼
Find @Service
        │
        ▼
Create UserService Bean
        │
        ▼
Find @RestController
        │
        ▼
See constructor(UserService)
        │
        ▼
Fetch UserService Bean
        │
        ▼
Create UserController(UserService)
        │
        ▼
Store both beans in IoC Container
```

---

## Where is IoC here?

Notice that **you never write**:

```java
UserService service = new UserService();

UserController controller = new UserController(service);
```

Instead, **Spring writes (internally)**:

```java
UserService service = new UserService();

UserController controller = new UserController(service);
```

That is **Inversion of Control**.

The control of object creation has moved from your application code to the **Spring IoC Container**.

---

## Interview Answer

If the interviewer asks:

> **"Nowadays we don't use `@Autowired`. How does dependency injection still work?"**

You can answer:

> "Starting with Spring 4.3, if a bean has only one constructor, Spring automatically treats it as the injection constructor, so `@Autowired` is optional. In most modern projects, we use Lombok's `@RequiredArgsConstructor`, which generates that constructor. During application startup, the Spring IoC container scans for beans, creates them, resolves constructor dependencies, and injects them automatically. The IoC container—not Lombok or `@Autowired`—is responsible for creating and wiring the objects."


# Spring IoC & Dependency Injection – Interview Notes

---

# 1. What is IoC (Inversion of Control)?

**Definition:**

> **Inversion of Control (IoC)** is a design principle where the **Spring IoC Container** creates, manages, and injects objects (beans) instead of the application creating them using `new`.

### Without IoC

```java
UserService service = new UserService();
UserController controller = new UserController(service);
```

Here, the application controls object creation.

### With IoC

```java
@Service
class UserService {}

@RestController
@RequiredArgsConstructor
class UserController {
    private final UserService userService;
}
```

Spring automatically:

1. Creates `UserService`
2. Creates `UserController`
3. Injects `UserService` into `UserController`

**Control of object creation is transferred from the application to the Spring Container.**

---

# 2. What is Dependency Injection (DI)?

**Definition:**

> Dependency Injection is the process by which the Spring IoC Container provides required dependencies to a class instead of the class creating them itself.

Example:

```java
@RequiredArgsConstructor
@RestController
public class UserController {

    private final UserService userService;
}
```

Spring injects `UserService` automatically.

**IoC is the principle.**

**Dependency Injection is one way Spring implements IoC.**

---

# 3. IoC vs Dependency Injection

| IoC                             | Dependency Injection                    |
| ------------------------------- | --------------------------------------- |
| Design Principle                | Implementation Technique                |
| Spring controls object creation | Spring injects dependencies             |
| Implemented using DI            | Constructor, Setter, or Field Injection |

---

# 4. Dependency Injection Methods

## A. Constructor Injection ✅ (Recommended)

```java
@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
}
```

Lombok generates:

```java
public UserController(UserService userService) {
    this.userService = userService;
}
```

### Advantages

* ✅ Recommended by Spring
* ✅ Supports `final` fields
* ✅ Easy to test
* ✅ Dependencies are explicit
* ✅ Prevents NullPointerException
* ✅ Immutable dependencies

---

## B. Setter Injection

```java
@RestController
public class UserController {

    private UserService userService;

    @Autowired
    public void setUserService(UserService userService) {
        this.userService = userService;
    }
}
```

### Advantages

* Good for optional dependencies
* Dependency can be changed later

### Disadvantages

* Can be `null`
* Object can exist in an incomplete state
* Less suitable for required dependencies

---

## C. Field Injection ❌

```java
@RestController
public class UserController {

    @Autowired
    private UserService userService;
}
```

### Disadvantages

* Hard to unit test
* Uses reflection
* Hidden dependencies
* Cannot use `final`
* Not recommended in modern Spring applications

---

# 5. Why Constructor Injection is Best

* Dependencies are mandatory
* Supports immutable (`final`) fields
* Easy unit testing
* Clear and explicit dependencies
* Recommended by Spring

---

# 6. Why We Don't Use `@Autowired` Nowadays

Since **Spring 4.3**, if a class has **only one constructor**, Spring automatically uses it for dependency injection.

Example:

```java
@RestController
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }
}
```

No `@Autowired` needed.

With Lombok:

```java
@RequiredArgsConstructor
@RestController
public class UserController {

    private final UserService userService;
}
```

Lombok generates the constructor, and Spring injects the dependency automatically.

> **Lombok only generates constructors. Spring performs Dependency Injection.**

---

# 7. Spring Bean Lifecycle

```
Application Starts
        │
        ▼
Component Scan
        │
        ▼
Bean Instantiation
(new Object())
        │
        ▼
Dependency Injection
(Constructor/Setter/Field)
        │
        ▼
@PostConstruct
        │
        ▼
Bean Ready
        │
        ▼
Application Running
        │
        ▼
Application Stops
        │
        ▼
@PreDestroy
        │
        ▼
Bean Destroyed
```

---

# 8. `@PostConstruct`

Runs **after dependency injection**.

Used for:

* Cache initialization
* Loading configuration
* Opening resources
* Validation

```java
@PostConstruct
public void init() {
    System.out.println("Bean initialized");
}
```

---

# 9. `@PreDestroy`

Runs **before bean destruction**.

Used for:

* Closing database connections
* Closing files
* Releasing resources
* Stopping background threads

```java
@PreDestroy
public void cleanup() {
    System.out.println("Bean destroyed");
}
```

---

# 10. Interview Summary (30 Seconds)

> **IoC (Inversion of Control)** means Spring manages object creation and lifecycle instead of the application creating objects with `new`. **Dependency Injection** is the mechanism Spring uses to provide required dependencies to those objects. Spring supports constructor, setter, and field injection, but **constructor injection is the recommended approach** because it supports immutable (`final`) fields, makes dependencies explicit, and is easier to unit test. In modern Spring Boot, `@Autowired` is optional for a class with a single constructor, and Lombok's `@RequiredArgsConstructor` is commonly used to generate that constructor automatically.


---

## Dependency Injection Methods

### Method 1: Constructor Injection (Recommended)

```java
@RestController
public class UserController {
    private final UserService userService;
    private final UserRepository userRepository;
    
    // Constructor injection - BEST PRACTICE
    public UserController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }
    
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.getUserById(id);
    }
}

// ADVANTAGES:
// - Immutability (final fields)
// - Clear dependencies
// - Easy to test
// - Never null
```

---

### Method 2: Setter Injection

```java
@RestController
public class UserController {
    private UserService userService;
    
    @Autowired
    public void setUserService(UserService userService) {
        this.userService = userService;
    }
}

// DISADVANTAGES:
// - Can be null
// - Dependencies not obvious
// - Hard to test
// - Avoid this!
```

---

### Method 3: Field Injection

```java
@RestController
public class UserController {
    @Autowired
    private UserService userService; // Direct injection
}

// DISADVANTAGES:
// - Can be null
// - Hard to test (need reflection)
// - Spring magic (not obvious)
// - Avoid this too!

// WHEN TESTING:
// ❌ Can't easily inject mocks
@Test
public void testGetUser() {
    UserController controller = new UserController();
    // userService is null! Can't test!
}

// ✅ With constructor injection:
@Test
public void testGetUser() {
    UserService mockService = mock(UserService.class);
    UserController controller = new UserController(mockService);
    // Easy to test!
}
```

---

## Spring Bean Lifecycle

```java
// 1. INSTANTIATION - Spring creates object
// 2. POPULATE PROPERTIES - DI happens
// 3. INITIALIZATION - @PostConstruct methods
// 4. READY - Bean available
// 5. DESTRUCTION - @PreDestroy methods

@Component
public class MyBean {
    
    @PostConstruct
    public void init() {
        System.out.println("Bean initialized");
        // Good for: Database connections, cache initialization
    }
    
    @PreDestroy
    public void cleanup() {
        System.out.println("Bean destroyed");
        // Good for: Closing connections, cleanup
    }
}
```

---

# PART 3: COMMON ANNOTATIONS

## Stereotypes (Component Types)

```java
// @Component: Generic component
@Component
public class MyComponent {
}

// @Service: Business logic
@Service
public class UserService {
    // Usually contains business logic
}

// @Repository: Data access
@Repository
public class UserRepository {
    // Database operations
}

// @Controller: Request handling (returns HTML)
@Controller
public class UserController {
}

// @RestController: Request handling (returns JSON)
@RestController
public class UserRestController {
}

// DIFFERENCE:
// @Controller returns view name (HTML)
// @RestController returns data (JSON)

// Under the hood:
// @RestController = @Controller + @ResponseBody
```

---

## Request Mapping Annotations

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    // GET /api/users
    @GetMapping
    public List<User> getAllUsers() { }
    
    // GET /api/users/1
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) { }
    
    // POST /api/users
    @PostMapping
    public User createUser(@RequestBody User user) { }
    
    // PUT /api/users/1
    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User user) { }
    
    // DELETE /api/users/1
    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) { }
    
    // Custom path: GET /api/users/search?q=john
    @GetMapping("/search")
    public List<User> search(@RequestParam String q) { }
}

// PARAMETER ANNOTATIONS:
// @PathVariable - From URL path (/users/{id})
// @RequestParam - From query string (?name=value)
// @RequestBody - From request body (JSON)
// @RequestHeader - From HTTP headers
```

---

## Other Important Annotations

```java
// CONFIGURATION
@Configuration
public class AppConfig {
    // Bean definitions
}

// CONDITIONAL BEAN CREATION
@ConditionalOnProperty(name = "feature.enabled", havingValue = "true")
@Component
public class FeatureComponent { }

// SCHEDULING
@Scheduled(fixedRate = 5000) // Every 5 seconds
public void doSomething() { }

// ASPECT (Logging, Caching)
@Aspect
@Component
public class LoggingAspect {
    @Around("execution(* com.example.service.*.*(..))")
    public Object logExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        System.out.println("Before: " + joinPoint.getSignature());
        Object result = joinPoint.proceed();
        System.out.println("After: " + result);
        return result;
    }
}

// VALIDATION
@NotNull
@NotEmpty
@Min(1)
@Max(100)
@Email
@Pattern(regexp = "...")
private String field;

// CACHING
@Cacheable("users")
public User getUserById(Long id) { }

@CacheEvict("users")
public void deleteUser(Long id) { }
```

---

# PART 4: APPLICATION PROPERTIES

## application.properties Configuration

```properties
# Server Configuration
server.port=8080
server.servlet.context-path=/api

# Spring Boot Auto-configuration
spring.application.name=my-app
spring.profiles.active=dev

# Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/mydb
spring.datasource.username=root
spring.datasource.password=password
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA/Hibernate Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

# Logging Configuration
logging.level.root=INFO
logging.level.com.example=DEBUG
logging.file.name=logs/app.log

# Connection Pool
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=20000
```

---

## Environment-Specific Configuration

```properties
# application-dev.properties
server.port=8080
spring.datasource.url=jdbc:mysql://localhost:3306/mydb_dev
logging.level.root=DEBUG

# application-prod.properties
server.port=80
spring.datasource.url=jdbc:mysql://prod-db:3306/mydb
logging.level.root=WARN
spring.jpa.hibernate.ddl-auto=validate

# application-test.properties
spring.datasource.url=jdbc:h2:mem:testdb
spring.h2.console.enabled=true
spring.jpa.hibernate.ddl-auto=create-drop
```

---

## Accessing Properties in Code

```java
@Component
public class AppProperties {
    
    // Method 1: @Value annotation
    @Value("${server.port}")
    private int serverPort;
    
    // Method 2: @Value with default
    @Value("${app.name:DefaultName}")
    private String appName;
    
    // Method 3: Environment object
    @Autowired
    private Environment env;
    
    public void print() {
        String dbUrl = env.getProperty("spring.datasource.url");
        System.out.println(dbUrl);
    }
    
    // Method 4: Configuration Properties (Best)
    @Configuration
    @ConfigurationProperties(prefix = "app")
    public static class AppConfig {
        private String name;
        private String version;
        
        // getters/setters
    }
}

// In application.properties:
// app.name=MyApp
// app.version=1.0.0
```

---

# PART 5: SPRING BOOT STARTERS

## Common Starters

```xml
<!-- Web Application -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- Database Access -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- MySQL Driver -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <version>8.0.33</version>
</dependency>

<!-- Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- Validation -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>

<!-- Testing -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>

<!-- Lombok (Reduce boilerplate) -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

---

# PART 6: INTERVIEW QUESTIONS

## Question 1: Explain Dependency Injection

**Answer:**
```
Dependency Injection is a design pattern where objects receive their dependencies 
from an external source (Spring container) rather than creating them themselves.

Benefits:
1. Loose coupling - Easy to swap implementations
2. Testability - Inject mocks for testing
3. Reusability - Same object used everywhere
4. Centralized management - Spring handles lifecycle

Spring uses IoC (Inversion of Control) container to manage object creation and injection.
```

---

## Question 2: @Autowired vs Constructor Injection

**Answer:**
```
CONSTRUCTOR INJECTION (PREFERRED):
✅ Immutability (final fields)
✅ Clear dependencies (visible in constructor)
✅ Easy to test (pass objects in constructor)
✅ Never null
✅ Works with @SpringBootTest

FIELD INJECTION (@Autowired):
❌ Can be null (harder to reason about)
❌ Dependencies not obvious
❌ Requires reflection for testing
❌ Spring magic (implicit)

RULE: Always use constructor injection!
```

---

## Question 3: Spring Bean Lifecycle

**Answer:**
```
1. INSTANTIATION - Spring creates object instance
2. DEPENDENCY INJECTION - Dependencies injected
3. INITIALIZATION - @PostConstruct method called
4. READY - Bean available for use
5. DESTRUCTION - @PreDestroy method called (on shutdown)

Use cases:
- @PostConstruct: Initialize resources, load cache, DB connections
- @PreDestroy: Close connections, cleanup, release resources
```

---

## Question 4: What's the difference between @Component, @Service, @Repository?

**Answer:**
```
Semantically, they're the same (@Component is parent).
But they indicate intent:

@Component - Generic component
@Service - Business logic
@Repository - Data access (automatically translates DB exceptions)

@Repository also provides exception translation:
DataAccessException (Spring) ← SQLException (Database)

Best practice: Use the most specific one for clarity!
```

---

## Question 5: application.properties vs application.yml

**Answer:**
```
PROPERTIES FORMAT:
server.port=8080
spring.datasource.url=jdbc:mysql://localhost/mydb

YAML FORMAT:
server:
  port: 8080
spring:
  datasource:
    url: jdbc:mysql://localhost/mydb

YAML is more readable but slightly slower to parse.
Spring Boot reads both.

CHOICE: Team preference (usually YAML for new projects)
```

---

# SUMMARY: Spring Boot Fundamentals Mastery

✅ **IoC & Dependency Injection:**
- [ ] Understand IoC vs traditional approach
- [ ] Know 3 DI methods (constructor preferred)
- [ ] Understand bean lifecycle
- [ ] Know @PostConstruct and @PreDestroy

✅ **Annotations:**
- [ ] Know stereotypes (@Component, @Service, @Repository)
- [ ] Know request mapping (@GetMapping, @PostMapping, etc.)
- [ ] Know @PathVariable, @RequestParam, @RequestBody
- [ ] Know @Configuration and @Bean

✅ **Configuration:**
- [ ] Know application.properties structure
- [ ] Know environment-specific configs
- [ ] Can use @Value and @ConfigurationProperties
- [ ] Know common properties

✅ **Project Structure:**
- [ ] Know standard folder structure
- [ ] Know when to use each component type
- [ ] Understand package organization

---

**Master Spring Boot fundamentals—they're the foundation!**
