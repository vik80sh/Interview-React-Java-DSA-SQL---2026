# Spring Boot Annotations Reference

This file is a lookup table, not another problem-first chapter — use [01-Spring-Boot-Fundamentals.md](01-Spring-Boot-Fundamentals.md) for the *why* behind beans, DI (Dependency Injection), and proxies; use this file when you need to quickly recall what a specific annotation does, where it's actually placed, and the one gotcha that trips people up. Annotations are grouped by category, in the order you'd naturally meet them while building an app.

Every entry follows the same shape: **what it does** → **a real usage example** → **where you'll actually see it** → **the gotcha**, if there is one worth knowing.

---

## 1. Bean Registration and Dependency Injection

These are the annotations that decide *what becomes a bean* and *how it receives what it needs* — the two ideas built up from scratch in file 01.

### `@Component`
- **Does:** marks a class as a Spring-managed bean — component scanning finds it and the container creates/wires it.
- **Example:** `@Component class InvoiceNumberGenerator { ... }`
- **Where:** any class you own that doesn't fit a more specific stereotype below.
- **Gotcha:** only works on classes you wrote — you can't add it to a class from a third-party `.jar`; use `@Bean` (below) for those instead.

### `@Service`
- **Does:** mechanically identical to `@Component` — also registers a bean. Exists purely to tell a human reader "this holds business logic."
- **Example:** `@Service class OrderService { ... }`
- **Where:** the service layer, between controllers and repositories.
- **Gotcha:** swapping `@Service` for `@Component` changes nothing at runtime — don't expect different injection behavior from the choice.

### `@Repository`
- **Does:** registers a bean, and additionally enables Spring's persistence-exception translation — a raw JDBC/Hibernate exception thrown from this bean gets converted into one of Spring's own `DataAccessException` subtypes.
- **Example:** `@Repository interface UserRepository extends JpaRepository<User, Long> {}`
- **Where:** the data-access layer. Spring Data JPA repository interfaces don't strictly need it (Spring detects them by their `JpaRepository` extension), but a custom `@Repository`-annotated DAO class does.
- **Gotcha:** the exception translation only kicks in with a registered `PersistenceExceptionTranslationPostProcessor`, which Spring Boot auto-configures for you — you don't wire it by hand.

### `@RestController`
- **Does:** `@Controller` plus `@ResponseBody` baked in — every method's return value is written directly into the HTTP response body (as JSON, typically) instead of being resolved as a view name.
- **Example:** `@RestController class UserController { ... }`
- **Where:** any class exposing HTTP endpoints in an API (as opposed to a server-rendered page).
- **Gotcha:** if you actually need to return a view name (server-rendered HTML), use plain `@Controller` instead — `@RestController` never does that.

### `@Configuration`
- **Does:** marks a class as a source of bean definitions — the container looks inside it for `@Bean` methods.
- **Example:** `@Configuration class AppConfig { @Bean Clock clock() { return Clock.systemUTC(); } }`
- **Where:** any class whose whole job is defining beans, especially for third-party types you can't annotate directly.
- **Gotcha:** methods inside a `@Configuration` class that call each other for beans go through a CGLIB proxy so the second call also returns the shared singleton — this is a real, non-obvious mechanism, not incidental.

### `@Bean`
- **Does:** marks a single method (inside a `@Configuration` class) whose return value becomes a bean.
- **Example:**
```java
@Bean
public ObjectMapper objectMapper() {
    return new ObjectMapper().registerModule(new JavaTimeModule());
}
```
- **Where:** constructing a bean that needs setup logic, or that comes from a library class you didn't write.
- **Gotcha:** the method name becomes the bean's name by default — two `@Bean` methods with the same name silently conflict.

### `@Autowired`
- **Does:** tells Spring "inject a matching bean here." On a constructor, it's optional if the class has exactly one constructor — Spring assumes that's the injection point.
- **Example:** `@Autowired public UserService(UserRepository repository) { ... }` — or, more simply, just the constructor with no annotation at all, since there's only one.
- **Where:** constructors (preferred), setters (for optional dependencies), or fields (avoid — see file 01's DI section for why).
- **Gotcha:** if `required = false` and no matching bean exists, the field/parameter is left `null` — that silent `null` is a common source of a later `NullPointerException` far from the actual cause.

### `@Qualifier`
- **Does:** disambiguates which bean to inject when more than one bean of the same type exists.
- **Example:**
```java
@Autowired
public NotificationService(@Qualifier("smtpEmailSender") EmailSender sender) { ... }
```
- **Where:** any injection point with multiple candidate beans of the same interface type.
- **Gotcha:** the string must match the bean's actual name (the `@Component`'s default name, or a name you gave a `@Bean` method) — a typo fails at startup with a "no qualifying bean" error, not silently.

### `@Primary`
- **Does:** the alternative fix for the same ambiguity `@Qualifier` solves — marks one candidate bean as the default when nothing else specifies a `@Qualifier`.
- **Example:** `@Primary @Component class SmtpEmailSender implements EmailSender { ... }`
- **Where:** when one implementation should be the sensible default almost everywhere, and only a few call sites need the alternative (which then uses `@Qualifier` to opt out of the default).

### `@Scope`
- **Does:** overrides a bean's default scope. Without it, every bean is a **singleton** — one shared instance.
- **Example:** `@Scope("prototype") @Component class ReportBuilder { ... }`
- **Where:** rare — mainly for stateful helper objects that must not be shared across concurrent use.
- **Gotcha:** `"request"` scope needs a web-aware context; using it outside a web request throws at bean-creation time.

### `@Lazy`
- **Does:** defers a bean's real construction until it's first actually used, instead of at startup. On a constructor parameter, it injects a proxy standing in for the real bean.
- **Example:** `OrderService(@Lazy NotificationService notificationService) { ... }`
- **Where:** breaking a genuine circular-dependency deadlock between two beans (covered in file 01) — treat it as a stopgap for that specific problem, not a general-purpose tool.

### `@PostConstruct` / `@PreDestroy`
- **Does:** `@PostConstruct` runs right after a bean's dependencies are injected; `@PreDestroy` runs during container shutdown, before the bean is discarded.
- **Example:**
```java
@PostConstruct
void warmUpCache() { cache.putAll(repository.findAllActive()); }

@PreDestroy
void closeConnectionPool() { pool.close(); }
```
- **Where:** one-time setup (cache warm-up, config validation) and resource cleanup (closing connections, flushing buffers).
- **Gotcha:** these run once per bean's lifetime, not per request — don't confuse them with something that runs on every method call.

### `@Value`
- **Does:** injects a single configuration value (from a properties/YAML file, an environment variable, or a system property) into a field or parameter.
- **Example:** `@Value("${app.feature.retention-days:30}") int retentionDays;` (the `:30` is a default if the key is missing).
- **Where:** a small, standalone configuration value.
- **Gotcha:** for more than one or two related settings, prefer `@ConfigurationProperties` (below) — a class full of scattered `@Value` fields becomes hard to test and validate together.

### `@ConfigurationProperties`
- **Does:** binds a whole group of related, prefixed configuration keys onto one typed class at once, instead of one `@Value` per key.
- **Example:**
```java
@ConfigurationProperties(prefix = "app.feature")
@Validated
public record FeatureProperties(@NotNull Boolean auditEnabled) {}
```
- **Where:** any related cluster of settings — timeouts, feature flags, third-party API config.
- **Gotcha:** needs `@ConfigurationPropertiesScan` on your main class (or `@EnableConfigurationProperties(FeatureProperties.class)`) to actually get registered as a bean — adding the annotation alone isn't enough.

### `@Profile`
- **Does:** only registers a bean (or a whole `@Configuration` class) when a named Spring profile is active.
- **Example:** `@Profile("dev") @Bean DataSource devDataSource() { ... }`
- **Where:** environment-specific beans — an in-memory database for `dev`, a real connection pool for `prod`.
- **Gotcha:** profiles are for varying *configuration* per environment, not for storing secrets — see file 01's externalized-config section.

### `@ComponentScan`
- **Does:** tells Spring which package(s) to scan for `@Component`-family classes. Included automatically inside `@SpringBootApplication`.
- **Example:** `@ComponentScan(basePackages = "com.example.app")`
- **Where:** rarely written explicitly — only when your main class isn't in a package above everything else it needs to scan.

### `@SpringBootApplication`
- **Does:** shorthand bundling `@Configuration` + `@ComponentScan` + `@EnableAutoConfiguration` onto one class — the class with your `main` method.
- **Example:** `@SpringBootApplication public class OrderApiApplication { public static void main(String[] args) { SpringApplication.run(OrderApiApplication.class, args); } }`
- **Where:** exactly one class per application — the entry point.

### The `@Conditional*` family
- **Does:** gates whether a `@Bean` or `@Configuration` activates, based on a condition checked at startup.
- **Common ones:** `@ConditionalOnClass` ("only if this class is on the classpath"), `@ConditionalOnMissingBean` ("only if nothing else already defined one"), `@ConditionalOnProperty` ("only if this config key has this value").
- **Where:** almost never written by you directly — this is the mechanism *behind* Spring Boot's own auto-configuration. Worth recognizing when reading how a starter decides what to configure.

## 2. Web / REST Endpoints

### `@RequestMapping`
- **Does:** maps an HTTP request to a controller class or method. Can specify the path, method, headers, and content type.
- **Example:** `@RequestMapping("/api/v1/users")` on the class, to set a shared base path for every method inside.
- **Where:** class-level base path; the method-level shortcuts below are used far more often than writing `@RequestMapping(method = RequestMethod.GET)` directly.

### `@GetMapping` / `@PostMapping` / `@PutMapping` / `@PatchMapping` / `@DeleteMapping`
- **Does:** shorthand for `@RequestMapping` fixed to one HTTP method — matches the resource-and-verb model from [02-REST-API-Design.md](02-REST-API-Design.md).
- **Example:** `@GetMapping("/{id}") UserResponse findById(@PathVariable Long id) { ... }`
- **Where:** every controller endpoint.

### `@PathVariable`
- **Does:** binds a value from the URL path itself into a method parameter.
- **Example:** `@GetMapping("/{id}") UserResponse findById(@PathVariable Long id)` — the `{id}` segment becomes the `id` parameter.
- **Gotcha:** the path placeholder and the parameter name must match, unless you specify it explicitly: `@PathVariable("id") Long userId`.

### `@RequestParam`
- **Does:** binds a query-string parameter (`?size=20&page=1`) into a method parameter.
- **Example:** `@GetMapping List<UserResponse> list(@RequestParam(defaultValue = "20") int size)`
- **Gotcha:** required by default — a missing required query param returns 400, not `null`. Use `required = false` or `defaultValue` for optional ones.

### `@RequestBody`
- **Does:** deserializes the incoming HTTP request body (typically JSON) into a Java object.
- **Example:** `@PostMapping UserResponse create(@Valid @RequestBody CreateUserRequest request)`
- **Gotcha:** almost always paired with `@Valid` (section 3) — without it, Bean Validation annotations on the DTO's fields are never actually checked.

### `@ResponseBody`
- **Does:** tells Spring to serialize a method's return value directly into the response body instead of resolving it as a view name. Already included in `@RestController`, so you rarely write it standalone.
- **Where:** a single method inside an otherwise `@Controller`-annotated (not `@RestController`) class, when most of that controller returns views but one endpoint returns raw JSON.

### `@ResponseStatus`
- **Does:** fixes the HTTP status code a method (or an exception class) returns, overriding the default of 200.
- **Example:** `@ResponseStatus(HttpStatus.CREATED)` on a create endpoint, or on a custom exception class so throwing it always maps to that status.

### `@RestControllerAdvice`
- **Does:** a `@RestController` variant of `@ControllerAdvice` — a single class that centralizes exception handling across every controller, instead of a try/catch in every method.
- **Example:**
```java
@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(UserNotFoundException.class)
    ResponseEntity<ApiError> notFound(UserNotFoundException ex) { ... }
}
```
- **Where:** exactly one (or a small number, scoped by package) per application — see file 02's error-handling section.

### `@ExceptionHandler`
- **Does:** marks a method (inside a `@RestControllerAdvice`, or inside a controller itself) as the handler for a specific exception type.
- **Gotcha:** the most specific matching exception type wins — if you catch both `UserNotFoundException` and its parent `RuntimeException`, the more specific handler runs.

### `@CrossOrigin`
- **Does:** allows a browser page on a different origin to call this endpoint — configures CORS (Cross-Origin Resource Sharing) for that controller/method.
- **Gotcha:** CORS is a browser-enforced rule only — see file 02's caching/CORS section. It is not authentication and does not replace real server-side access control.

## 3. Validation

### `@Valid`
- **Does:** tells Spring to actually run Bean Validation checks on the annotated argument before the method body runs.
- **Example:** `create(@Valid @RequestBody CreateUserRequest request)`
- **Gotcha:** without `@Valid` (or `@Validated`), annotations like `@NotBlank`/`@Email` on the DTO are inert — they exist on the class but nothing ever checks them.

### `@Validated`
- **Does:** a Spring-specific variant of `@Valid`, with one extra ability — it supports validation *groups*, letting you apply different rule subsets in different contexts (e.g., "required on create, optional on update").
- **Where:** on a class (to enable method-parameter validation for every method) or when you specifically need validation groups; otherwise `@Valid` is the simpler default choice.

### `@NotNull` / `@NotBlank` / `@NotEmpty` / `@Size` / `@Email` / `@Min` / `@Max`
- **Does:** the common built-in Bean Validation constraints. `@NotNull` — value must be present. `@NotBlank` — a `String` must be non-null and contain non-whitespace. `@NotEmpty` — a collection/string must be non-null and non-empty (but blank whitespace is still allowed for a `String`). `@Size` — bounds a `String`/collection's length. `@Email` — checks basic email shape. `@Min`/`@Max` — numeric bounds.
- **Example:** `@NotBlank @Size(max = 80) String name`
- **Gotcha:** these only cover static, single-field rules. Anything needing real logic (cross-field comparisons, a business-specific allowed set) needs a custom `ConstraintValidator` — covered in file 02.

## 4. Data / JPA (Java Persistence API)

See [03-Database-JPA-Hibernate.md](03-Database-JPA-Hibernate.md) for the full mental model — this is the quick-lookup version.

### `@Entity`
- **Does:** marks a class as mapped to a database table.
- **Example:** `@Entity @Table(name = "users") class User { @Id @GeneratedValue Long id; }`

### `@Table`
- **Does:** customizes the table name/schema an `@Entity` maps to, when it shouldn't just default to the class name.

### `@Id` / `@GeneratedValue`
- **Does:** `@Id` marks the primary-key field. `@GeneratedValue` says the database (or a sequence) should generate its value automatically rather than you assigning it.
- **Example:** `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;`

### `@Column`
- **Does:** customizes a field's mapped column — name, nullability, length, uniqueness — when the defaults derived from the field itself aren't right.
- **Example:** `@Column(name = "email_address", nullable = false, unique = true) String email;`

### `@OneToMany` / `@ManyToOne` / `@OneToOne` / `@ManyToMany`
- **Does:** declares a relationship between two entities. `@ManyToOne` is almost always the *owning* side (it holds the actual foreign key column).
- **Example:**
```java
@Entity class OrderLine {
    @ManyToOne @JoinColumn(name = "order_id") Order order;
}
```
- **Gotcha:** the default fetch type differs by relationship (`@ManyToOne`/`@OneToOne` default to EAGER, `@OneToMany`/`@ManyToMany` default to LAZY) — a common source of surprise N+1 queries or unexpected `LazyInitializationException`s. File 03 covers this in depth.

### `@JoinColumn`
- **Does:** names the actual foreign-key column for a relationship, on the owning side.

### `@Transactional`
- **Does:** wraps the method in a database transaction via a proxy (the same proxy mechanism from file 01/08) — commits on success, rolls back on an unchecked exception by default.
- **Example:** `@Transactional public void transfer(Long fromId, Long toId, BigDecimal amount) { ... }`
- **Gotcha:** self-invocation bypasses the proxy entirely — calling an `@Transactional` method via `this.method()` from inside the same class runs with no transaction at all. Also: it's a database boundary only, not a distributed transaction across other side effects like sending an email.

### `@Query`
- **Does:** lets you write an explicit JPQL (Java Persistence Query Language) or native SQL query on a repository method, when Spring Data's derived-query-from-method-name convention can't express what you need.
- **Example:** `@Query("SELECT u FROM User u WHERE u.status = :status") List<User> findByStatus(@Param("status") String status);`

### `@Version`
- **Does:** marks a field Hibernate uses for **optimistic locking** — it's automatically incremented on every update, and an update using a stale version number fails instead of silently overwriting a newer change.
- **Example:** `@Version Long version;`
- **Where:** any entity at real risk of two concurrent updates racing (see file 03's lost-update scenario).

## 5. Security

See [04-Authentication-Security.md](04-Authentication-Security.md) for the full picture — sessions vs. tokens, filters, `SecurityContextHolder`.

### `@EnableWebSecurity`
- **Does:** turns on Spring Security's web-layer configuration for the application.
- **Where:** typically one `SecurityConfig` class.

### `@PreAuthorize`
- **Does:** checks an authorization expression *before* a method runs — can reference method arguments, not just a fixed role.
- **Example:** `@PreAuthorize("#id == authentication.principal.id or hasRole('ADMIN')") void update(Long id, ...) { ... }`
- **Gotcha:** like `@Transactional`, this is proxy-based — self-invocation bypasses it too. Real object-level authorization (checking "does THIS resource belong to THIS caller") still needs to happen inside the method/service logic in many cases, not just at the annotation level — see file 04's IDOR (Insecure Direct Object Reference) discussion.

### `@Secured` / `@RolesAllowed`
- **Does:** older, simpler alternatives to `@PreAuthorize` — check for a fixed role/authority, without expression support.
- **Where:** legacy codebases; `@PreAuthorize` is the more flexible modern default.

## 6. AOP (Aspect-Oriented Programming), Async, and Scheduling

See [08-AOP-Actuator-Microservices.md](08-AOP-Actuator-Microservices.md) for the full mechanism (proxies, join points, advice).

### `@Aspect`
- **Does:** marks a class as bundling cross-cutting behavior (logging, timing, security checks) that gets woven into other beans' method calls.
- **Example:** `@Aspect @Component class LoggingAspect { @Around("@annotation(Loggable)") Object logTime(ProceedingJoinPoint jp) throws Throwable { ... } }`

### `@Before` / `@After` / `@AfterReturning` / `@AfterThrowing` / `@Around`
- **Does:** the five kinds of advice. `@Around` is the only one that wraps the entire call, letting it change the return value or skip the real method — the others just run at a fixed point relative to it.

### `@EnableAsync` / `@Async`
- **Does:** `@EnableAsync` turns the feature on for the application; `@Async` on a method makes it run on a separate thread pool instead of blocking the caller.
- **Example:** `@Async CompletableFuture<Report> generateReport(Long id) { ... }`
- **Gotcha:** proxy-based, same self-invocation trap as `@Transactional`. Also: the calling thread's context (security principal, MDC/logging context) does not automatically carry over into the async thread unless explicitly propagated.

### `@EnableScheduling` / `@Scheduled`
- **Does:** `@EnableScheduling` turns the feature on; `@Scheduled` runs a method on a fixed schedule.
- **Example:** `@Scheduled(cron = "0 0 * * * *") void hourlyCleanup() { ... }`
- **Gotcha:** in a multi-instance deployment, every instance runs the schedule independently — without a distributed lock, the same job fires once *per instance*, not once total.

## 7. Testing

See [05-Testing-Java.md](05-Testing-Java.md) for the full picture of what each test slice actually loads.

### `@SpringBootTest`
- **Does:** loads the full application context for an integration test.
- **Gotcha:** slow, because it builds the entire app — reach for one of the slices below when you only need part of it.

### `@WebMvcTest`
- **Does:** loads only the web layer (controllers, filters, `@ControllerAdvice`) — service/repository beans must be mocked.
- **Example:** `@WebMvcTest(UserController.class)`

### `@DataJpaTest`
- **Does:** loads only the JPA layer, against an in-memory database by default, rolling back after each test.

### `@MockBean`
- **Does:** replaces a real bean in the test's application context with a Mockito mock.
- **Example:** `@MockBean UserService userService;` inside a `@WebMvcTest`.

### `@Test` / `@ExtendWith`
- **Does:** `@Test` (JUnit 5) marks a method as a test case. `@ExtendWith(MockitoExtension.class)` wires Mockito's `@Mock`/`@InjectMocks` into a plain (non-Spring) unit test.

## 8. Lombok (Not Spring — But Constantly Seen Alongside It)

Lombok annotations generate boilerplate code at compile time. They have nothing to do with Spring or dependency injection by themselves — see file 01's Lombok trap section for exactly where that confusion causes a real bug.

### `@Data`
- **Does:** generates getters, setters, `equals()`/`hashCode()`, and `toString()` all at once.
- **Gotcha:** on a JPA `@Entity`, the generated `equals()`/`hashCode()` (based on all fields) can misbehave with lazy-loaded relationships and mutable entities — many teams avoid `@Data` on entities for this reason and write those methods deliberately instead.

### `@Getter` / `@Setter`
- **Does:** generates just the getters, or just the setters, for a class's fields — more targeted than `@Data`.

### `@RequiredArgsConstructor` / `@AllArgsConstructor` / `@NoArgsConstructor`
- **Does:** generate a constructor. `@RequiredArgsConstructor` — only `final` fields. `@AllArgsConstructor` — every field. `@NoArgsConstructor` — no parameters.
- **Gotcha:** this is the exact trap from file 01 — `@AllArgsConstructor` on a Spring bean turns every field into a constructor parameter Spring tries to inject, breaking startup the moment a plain non-dependency field is added. Fine on a DTO/entity Spring never constructs.

### `@Builder`
- **Does:** generates a fluent builder for constructing an object step by step, useful when a constructor would otherwise need many parameters.
- **Example:** `User.builder().name("Ana").email("ana@example.com").build();`

### `@Slf4j`
- **Does:** generates a `private static final Logger log` field, so you can call `log.info(...)` without writing the boilerplate declaration yourself.

## Interview Questions and Answers

### 1. `@Component` vs `@Service` vs `@Repository` — what's actually different at runtime?

**Answer:** Nothing mechanically — all three register a bean the same way. `@Repository` additionally enables persistence-exception translation. The rest of the difference is purely to communicate intent to a reader.

### 2. When do you reach for `@Bean` instead of a stereotype annotation?

**Answer:** When the class isn't yours to annotate (a third-party library type), or when constructing it needs explicit setup logic that a bare `@Component` on the class itself can't express.

### 3. Why doesn't `@Autowired` need to be written on most constructors today?

**Answer:** Spring treats a class's single constructor as the injection point automatically. `@Autowired` is only required if a class has more than one constructor and you need to tell Spring which one to use for injection.

### 4. What's the actual difference between `@Valid` and `@Validated`?

**Answer:** `@Valid` is the standard Bean Validation trigger. `@Validated` is Spring's own variant, which adds support for validation groups — applying a different subset of constraints depending on context (e.g. creation vs. update) — otherwise they behave the same.

### 5. Why does `@Transactional` (or `@Async`, or `@PreAuthorize`) sometimes appear to do nothing?

**Answer:** All three are implemented via a proxy that wraps the bean. A call from inside the same class via `this.method()` never passes through that proxy, so the transaction never starts, the async submission never happens, and the authorization check never runs — with no error thrown. The fix is calling through a different bean.

### 6. What's the default fetch type for each JPA relationship annotation, and why does it matter?

**Answer:** `@ManyToOne` and `@OneToOne` default to EAGER; `@OneToMany` and `@ManyToMany` default to LAZY. Getting this backwards from what you expect is a common cause of either an unnecessary eager join (loading data you didn't need) or a `LazyInitializationException` when a lazy relationship is accessed outside its transaction.

### 7. Is `@AllArgsConstructor` always dangerous on a Spring bean?

**Answer:** Only when Spring itself constructs the class (a `@Service`/`@Component`/etc.) — Spring tries to inject a bean into every constructor parameter, and a plain non-dependency field forced into that constructor has no bean to satisfy it, breaking startup. On a DTO or entity Spring never constructs, it's completely fine.

### 8. Why does a `@Scheduled` job sometimes run more often than expected in production?

**Answer:** Because every instance in a multi-instance deployment runs its own copy of the schedule independently — with three instances running, the job fires three times, not once. Fixing this needs a distributed lock or a scheduling mechanism that's aware of the multiple instances, not the annotation alone.

## Revision Checklist

- [ ] Explain which annotations only register a bean versus which ones actually perform injection (see file 01's DI clarification).
- [ ] List the proxy-based annotations (`@Transactional`, `@Async`, `@Cacheable`, `@PreAuthorize`) and explain why self-invocation breaks all of them the same way.
- [ ] Know the default fetch type for each of the four JPA relationship annotations.
- [ ] Explain why `@Valid`/`@Validated` must be present for Bean Validation constraints to actually run.
- [ ] Explain the `@AllArgsConstructor` startup trap and why it doesn't apply to plain DTOs/entities.
- [ ] Know which test annotation (`@SpringBootTest`/`@WebMvcTest`/`@DataJpaTest`) loads which slice of the application.
