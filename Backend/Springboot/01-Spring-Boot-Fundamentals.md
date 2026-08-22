# Spring Boot Fundamentals

Spring Boot is a way to build Spring applications with sensible defaults, auto-configuration, embedded servers, and production tooling. The important interview skill is not memorizing annotations; it is explaining what happens from application startup to an HTTP response.

## 1. The Mental Model

Spring manages objects called **beans**. A bean is an object whose creation and lifecycle are controlled by the Spring IoC container.

- **IoC** is the principle: application code does not control every object creation decision.
- **DI** is the technique: dependencies are supplied to a class from outside.
- **Spring Boot** configures a Spring application quickly using auto-configuration and starters.

Without DI, a class chooses a concrete dependency:

```java
class UserService {
    private final UserRepository repository = new JpaUserRepository();
}
```

This is difficult to replace in a test and couples business logic to one implementation. With constructor injection:

```java
@Service
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }
}
```

The class declares what it needs. Spring chooses and supplies the implementation.

### Constructor, setter, and field injection

Use constructor injection for required dependencies. It makes invalid object states harder to create and makes unit tests simple:

```java
UserService service = new UserService(fakeRepository);
```

Setter injection is reasonable for an optional dependency. Field injection hides dependencies, prevents `final` fields, and makes plain unit testing awkward, so avoid it in new code.

`@Autowired` is optional when a class has one constructor. Lombok's `@RequiredArgsConstructor` can generate that constructor, but Lombok does not perform injection; Spring does.

### Lombok constructor annotations — a real startup-breaking trap

| Annotation | Fields included | Safe for a Spring bean? |
|---|---|---|
| `@RequiredArgsConstructor` | Only `final` (or `@NonNull`) fields | Yes — the standard choice for `@Service`/`@Component` classes |
| `@AllArgsConstructor` | Every field, `final` or not | Risky — a non-`final` field like `private boolean enabled = true;` becomes a constructor parameter too |
| `@NoArgsConstructor` | None | Not for injection — no parameters means nothing for Spring to inject |

The real trap with `@AllArgsConstructor`: adding an ordinary non-dependency field to a `@Service` class — a plain `boolean`, a default `int` — silently turns that field into a required constructor argument too. Since Spring has no bean of type `boolean` to inject, startup fails with `NoSuchBeanDefinitionException`, and the error points at the symptom (a missing bean) rather than the actual cause (the wrong Lombok annotation). `@RequiredArgsConstructor` avoids this because it only pulls in `final` fields — exactly the set that should be constructor-injected — leaving ordinary fields alone.

### IoC container implementations: `BeanFactory` vs `ApplicationContext`

`BeanFactory` is the root interface: the most basic container, providing bean lookup and dependency injection with **lazy initialization** — a bean isn't created until it's actually requested. `ApplicationContext` extends `BeanFactory` and adds what a real application actually needs: **eager singleton initialization at startup** (so a misconfigured bean fails fast at boot instead of on the first request that happens to need it), event publication (`ApplicationEventPublisher`), internationalization support, and easy integration with AOP. Every Spring Boot application uses an `ApplicationContext` (specifically `AnnotationConfigServletWebServerApplicationContext` for a web app) — `BeanFactory` is rarely instantiated directly in application code today; knowing it exists as the foundational interface `ApplicationContext` builds on is what the question is actually testing.

## 2. What Happens at Startup?

For a typical application:

1. `SpringApplication.run` creates an application context.
2. Component scanning finds classes such as `@Service` and `@RestController`.
3. Auto-configuration adds beans when required classes and properties are present.
4. Spring creates beans, resolves constructor dependencies, and applies post-processors.
5. Proxies may be created for features such as transactions, caching, or security.
6. The embedded server starts and the application accepts requests.

The request path is usually:

```text
HTTP request
  -> servlet filters/security
  -> DispatcherServlet
  -> controller
  -> service
  -> repository/database
  -> response serialization
```

`@SpringBootApplication` combines `@Configuration`, `@EnableAutoConfiguration`, and `@ComponentScan`. Keep the main class in a package above the application packages, or configure scanning explicitly.

## 3. A Small Layered Example

```java
public record UserResponse(Long id, String name, String email) {}

public interface UserRepository extends JpaRepository<User, Long> {}

@Service
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        User user = repository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
        return new UserResponse(user.getId(), user.getName(), user.getEmail());
    }
}

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public UserResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }
}
```

The controller handles HTTP concerns, the service owns business decisions and transaction boundaries, and the repository handles persistence. Returning a DTO instead of an entity prevents database structure and internal fields from becoming an accidental API contract.

## 4. Stereotypes and Configuration

`@Component` is a generic scanned bean. `@Service` communicates business logic. `@Repository` communicates data access and enables Spring's persistence exception translation for applicable classes. `@RestController` is effectively `@Controller` plus `@ResponseBody`.

Use `@Bean` when an object comes from a library or needs explicit construction:

```java
@Configuration
public class AppConfig {
    @Bean
    public Clock applicationClock() {
        return Clock.systemUTC();
    }
}
```

Use component scanning for application-owned classes and `@Bean` for explicit configuration. If two beans implement the same interface, use `@Primary` or `@Qualifier` rather than relying on accidental selection.

### Bean scopes and proxies

Singleton is the default scope: one bean instance per application context. A singleton must be thread-safe because many request threads can use it. Prototype creates a new instance when requested, but Spring does not manage the full lifecycle of a prototype after creation. Web scopes such as request scope are tied to an HTTP request.

Annotations such as `@Transactional`, `@Cacheable`, and `@Async` generally work through a proxy. A call from one bean to another passes through the proxy; a self-invocation such as `this.asyncMethod()` does not, so the annotation may not take effect.

## 5. Auto-Configuration and Starters

A starter is a curated dependency set. For example, `spring-boot-starter-web` brings Spring MVC, JSON support, validation integration, and an embedded server. Auto-configuration then creates suitable beans based on the classpath and properties.

Auto-configuration is conditional, not magic. Conditions commonly check whether a class exists, a property has a value, or a bean is missing. To debug an unexpected configuration, run with the condition evaluation report enabled or inspect the startup logs. Do not disable auto-configuration blindly; identify the condition that produced the bean.

The actual mechanism behind "conditional" is a family of `@Conditional*` annotations on the auto-configuration classes themselves:

```java
@Configuration
@ConditionalOnClass(DataSource.class)          // only applies if this class is on the classpath
public class DataSourceAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean                   // only creates this bean if the app didn't define its own
    public DataSource dataSource() { ... }

    @Bean
    @ConditionalOnProperty(name = "app.cache.enabled", havingValue = "true")
    public CacheManager cacheManager() { ... }
}
```

`@ConditionalOnClass` is why adding `spring-boot-starter-data-jpa` to the classpath is enough to get JPA auto-configured — the condition simply checks that `EntityManager`/`DataSource`-related classes are present. `@ConditionalOnMissingBean` is exactly why declaring your own `@Bean` of the same type in your own `@Configuration` class silently overrides the auto-configured one, with no conflict error — auto-configuration deliberately backs off once it sees you've already provided one.

## 6. Externalized Configuration

```properties
spring.application.name=interview-api
server.port=8080
spring.jpa.hibernate.ddl-auto=validate
app.feature.audit-enabled=true
```

Use environment variables or a secret manager for credentials. Do not commit passwords or signing keys. `ddl-auto=update` can be convenient locally but should not replace reviewed migrations in production. Prefer `validate` with Flyway or Liquibase.

For grouped, typed settings:

```java
@ConfigurationProperties(prefix = "app.feature")
@Validated
public record FeatureProperties(@NotNull Boolean auditEnabled) {}
```

Register it with `@ConfigurationPropertiesScan` or `@EnableConfigurationProperties(FeatureProperties.class)`. Use `@Value` for a small isolated value; use configuration properties for a related group.

Profiles select environment-specific configuration, but they are not a secret-management system. Prefer `application-dev.yml`, `application-test.yml`, and deployment-provided environment variables with an explicit active profile.

`.properties` and `.yml` configure the same underlying keys; `.yml` just uses indentation to express nesting instead of repeating the dotted prefix on every line:

```properties
app.feature.audit-enabled=true
app.feature.retention-days=30
```

```yaml
app:
  feature:
    audit-enabled: true
    retention-days: 30
```

Both formats can coexist in the same project (Spring merges them), but mixing the same key in both is a real source of "why is my property not taking effect" confusion — pick one format per project and stay consistent. YAML's indentation-based nesting reads better for deeply grouped settings; `.properties` is occasionally preferred for its unambiguous, grep-friendly flat key syntax.

## 7. Lifecycle and Transactions

The simplified lifecycle is instantiation, dependency injection, initialization, ready state, and destruction. `@PostConstruct` is useful for validation or small initialization tasks. `@PreDestroy` is useful for releasing resources. Avoid long network calls during startup unless startup should genuinely fail when that dependency is unavailable.

Beyond the two annotations, Spring also recognizes lifecycle **interfaces** if a bean chooses to implement them directly, which is worth knowing as the mechanism `@PostConstruct`/`@PreDestroy` are actually a more convenient alternative to:

- **`InitializingBean.afterPropertiesSet()`** — runs after dependency injection, equivalent to `@PostConstruct` but tying the bean's code directly to a Spring interface instead of an annotation.
- **`DisposableBean.destroy()`** — runs on shutdown, equivalent to `@PreDestroy`.
- **`BeanPostProcessor`** — a separate, application-wide hook (not implemented by the bean itself) that can inspect or wrap *every* bean immediately before and after its initialization callbacks run; this is the actual extension point Spring itself uses internally to apply things like AOP proxies to newly created beans.

In practice, `@PostConstruct`/`@PreDestroy` are preferred for application code because they don't couple a class to a Spring-specific interface — the interfaces exist mainly for framework-level code and for the rare case where you need the exact ordering guarantee `BeanPostProcessor` provides across every bean in the context.

`@Transactional` is normally placed on a public service method. Spring opens or joins a transaction through a proxy. By default, unchecked exceptions cause rollback; checked exceptions do not unless configured with `rollbackFor`. A transaction is a database boundary, not a general distributed transaction: sending an email inside it does not roll back the email if the database later fails.

## 8. Circular Dependencies

Two beans that depend on each other through constructor injection — `A` needs `B` in its constructor, `B` needs `A` in its constructor — cannot both be constructed first, since neither one can be fully instantiated before the other. Spring detects this at startup and fails fast with `BeanCurrentlyInCreationException` rather than silently doing something clever:

```java
@Service
class OrderService {
    private final NotificationService notificationService;
    OrderService(NotificationService notificationService) { this.notificationService = notificationService; }
}

@Service
class NotificationService {
    private final OrderService orderService;
    NotificationService(OrderService orderService) { this.orderService = orderService; }
}
// Startup fails: OrderService needs NotificationService needs OrderService...
```

A circular dependency is almost always a design smell — the two classes are too tightly coupled and probably belong together, or the shared behavior belongs in a third class both can depend on one-way. Extract the shared piece, or invert one of the dependencies so only one class points at the other, before reaching for a framework workaround.

Where a genuine cycle is unavoidable (rare — usually an internal wiring convenience, not a good long-term design), `@Lazy` on one side breaks it by injecting a proxy instead of the real bean:

```java
@Service
class OrderService {
    private final NotificationService notificationService;
    OrderService(@Lazy NotificationService notificationService) {
        this.notificationService = notificationService;
    }
}
```

The proxy defers creating the real `NotificationService` until it is first actually used, by which point `OrderService` — and everything else — has already finished constructing. This unblocks startup but does not remove the underlying coupling: treat `@Lazy` here as a stopgap, not a fix, and prefer a redesign when the same cycle keeps recurring.

## Interview Questions and Answers

### 1. What is the difference between IoC and DI?

**Answer:** IoC is the principle that control of object creation and lifecycle is moved to a container. Dependency injection is the mechanism that supplies an object's dependencies from outside. Spring uses DI to implement IoC.

**Follow-up:** Why is constructor injection preferred? It makes required dependencies explicit, supports immutable fields, prevents partially initialized objects, and makes unit tests easy.

### 2. How does Spring find and create a bean?

**Answer:** Component scanning finds stereotype-annotated classes, configuration classes declare explicit `@Bean` methods, and auto-configuration contributes conditional beans. Spring creates the beans, resolves constructor dependencies, applies post-processors or proxies, and stores them in the application context.

### 3. `@Component`, `@Service`, and `@Repository`?

**Answer:** All are component stereotypes, but they communicate intent. `@Service` marks business logic. `@Repository` marks persistence code and can translate persistence exceptions into Spring's data-access hierarchy. `@Component` is the generic option.

### 4. What is the difference between `@Bean` and component scanning?

**Answer:** Component scanning discovers application classes automatically. `@Bean` explicitly creates an object in a configuration class, which is useful for third-party classes or construction that needs parameters.

### 5. Why might `@Transactional` appear not to work?

**Answer:** The call may bypass the Spring proxy, such as self-invocation or calling a method on an object created with `new`. It may also be placed on a non-public method or the exception may not trigger rollback under the default rules. Put the transaction boundary on a public service method called through another bean and verify the actual database behavior.

### 6. What is Spring Boot auto-configuration?

**Answer:** It is conditional configuration activated by the classpath, existing beans, and properties. For example, adding a web starter allows Boot to configure MVC and an embedded server. It provides defaults while still allowing explicit application beans to override them.

### 7. Why should controllers return DTOs instead of entities?

**Answer:** DTOs prevent persistence details from leaking into the API, avoid accidental lazy-loading or recursive JSON serialization, and allow the API and database model to evolve independently.

### 8. What makes a singleton bean unsafe?

**Answer:** Mutable request-specific state stored in an instance field. Singleton beans are shared by concurrent requests, so request data should stay in method-local variables or immutable objects.

### 9. How would you debug a missing bean?

**Answer:** Check package scanning boundaries, profile and conditional properties, constructor dependencies, and whether multiple candidates require `@Qualifier`. Then inspect the startup error and condition evaluation report rather than adding random annotations.

### 10. Explain the request flow in Spring MVC.

**Answer:** Filters run first, then `DispatcherServlet` selects a controller method using mappings. Argument resolvers build method arguments, the controller calls application services, and message converters serialize the return value into the HTTP response. Exceptions can be converted centrally by `@RestControllerAdvice`.

### 11. How does Spring handle a circular dependency between two beans, and how would you actually fix it?

**Answer:** With constructor injection, Spring fails startup with a `BeanCurrentlyInCreationException` because neither bean can finish constructing before the other. The right fix is usually to remove the cycle — extract the shared behavior into a third bean, or make the dependency one-directional. `@Lazy` on one of the constructor parameters injects a proxy and defers real construction, which unblocks startup, but it is a workaround for tight coupling, not a substitute for fixing the design.

### 12. Why can adding an unrelated `boolean` field to a `@Service` class break startup with `NoSuchBeanDefinitionException`?

**Answer:** If the class uses Lombok's `@AllArgsConstructor`, every field — not just the `final` dependency fields — becomes a constructor parameter, including that new `boolean`. Spring has no bean of type `boolean` to inject, so startup fails with an error that names a missing bean, even though the real cause is the choice of Lombok annotation. `@RequiredArgsConstructor` avoids this because it only includes `final` fields.

### 13. What's the difference between `BeanFactory` and `ApplicationContext`?

**Answer:** `BeanFactory` is the root container interface, providing lazy bean lookup and injection — a bean is created only when first requested. `ApplicationContext` extends it and adds eager singleton initialization at startup, event publication, internationalization, and AOP integration. Every Spring Boot application actually runs on an `ApplicationContext`; `BeanFactory` matters mainly as the foundational interface it builds on.

### 14. What does `@ConditionalOnMissingBean` actually enable, and why don't you get a conflict error when you define your own bean of the same type?

**Answer:** Auto-configuration classes mark their beans `@ConditionalOnMissingBean`, meaning that condition only creates the bean if no bean of that type already exists in the context. Declaring your own `@Bean` of the same type is seen first, so the auto-configured version simply never activates — there's no conflict because auto-configuration was designed to defer to an explicit application bean, not compete with it.

### 15. Besides `@PostConstruct`/`@PreDestroy`, what other mechanism can hook into a bean's lifecycle?

**Answer:** A bean can implement `InitializingBean`/`DisposableBean` directly for the same initialization/destruction timing without an annotation, or a separate `BeanPostProcessor` can inspect or wrap every bean in the context immediately around its initialization callbacks — which is the actual extension point Spring itself uses internally to apply AOP proxies to newly created beans.

## Revision Checklist

- [ ] Explain IoC, DI, constructor injection, and bean lifecycle in your own words.
- [ ] Draw the startup and request flow without looking at the notes.
- [ ] Explain when to use `@Bean`, `@Service`, and `@Repository`.
- [ ] Describe why proxies affect `@Transactional`, `@Async`, and caching.
- [ ] Build a controller-service-repository slice using DTOs.
- [ ] Explain how configuration and secrets differ between local and production environments.
- [ ] Explain why Spring fails fast on a circular constructor dependency and when (rarely) `@Lazy` is the right stopgap.
- [ ] Explain the `@AllArgsConstructor` `NoSuchBeanDefinitionException` trap and why `@RequiredArgsConstructor` avoids it.
- [ ] Explain `BeanFactory` vs `ApplicationContext`, and name the actual `@Conditional*` annotations behind auto-configuration.
- [ ] Explain `InitializingBean`/`DisposableBean`/`BeanPostProcessor` as the interface-based alternative to `@PostConstruct`/`@PreDestroy`.
