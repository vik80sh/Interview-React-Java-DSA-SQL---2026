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

## 7. Lifecycle and Transactions

The simplified lifecycle is instantiation, dependency injection, initialization, ready state, and destruction. `@PostConstruct` is useful for validation or small initialization tasks. `@PreDestroy` is useful for releasing resources. Avoid long network calls during startup unless startup should genuinely fail when that dependency is unavailable.

`@Transactional` is normally placed on a public service method. Spring opens or joins a transaction through a proxy. By default, unchecked exceptions cause rollback; checked exceptions do not unless configured with `rollbackFor`. A transaction is a database boundary, not a general distributed transaction: sending an email inside it does not roll back the email if the database later fails.

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

## Revision Checklist

- [ ] Explain IoC, DI, constructor injection, and bean lifecycle in your own words.
- [ ] Draw the startup and request flow without looking at the notes.
- [ ] Explain when to use `@Bean`, `@Service`, and `@Repository`.
- [ ] Describe why proxies affect `@Transactional`, `@Async`, and caching.
- [ ] Build a controller-service-repository slice using DTOs.
- [ ] Explain how configuration and secrets differ between local and production environments.
