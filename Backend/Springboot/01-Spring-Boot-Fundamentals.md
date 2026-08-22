# Spring Boot Fundamentals 

This file is written for someone who has never built a Spring Boot app before. Read it top to bottom, in order, once — it builds one idea at a time and doesn't repeat itself, so skipping ahead will feel confusing.

---

## 1. The Problem: A Class Building Its Own Dependency

Forget Spring for a moment. Plain Java:

```java
class Car {
    private Engine engine = new PetrolEngine();

    void start() {
        engine.ignite();
    }
}
```

`Car` needs an `Engine`, so it just makes one itself, right there. This looks normal — it's how most people write Java at first. But it causes two real problems:

1. **`Car` is welded to `PetrolEngine` forever.** Need an `ElectricEngine` tomorrow? You have to edit `Car`'s source code.
2. **You can't test `Car` alone.** Testing `Car.start()` also tests whatever `PetrolEngine.ignite()` really does — real hardware, slow calls, whatever it happens to be.

And it doesn't stay small: a real app has hundreds of classes, each building its own dependencies the same way, and none of it can be swapped or tested without editing source code everywhere.

## 2. The Fix: Hand the Dependency In From Outside

Instead of `Car` building its own `Engine`, someone else builds the `Engine` and hands it to `Car`:

```java
interface Engine {
    void ignite();
}

class PetrolEngine implements Engine {
    public void ignite() { System.out.println("Vroom (petrol)"); }
}

class ElectricEngine implements Engine {
    public void ignite() { System.out.println("Silent whir (electric)"); }
}

class Car {
    private final Engine engine;

    Car(Engine engine) {       // the engine arrives here — Car doesn't build it
        this.engine = engine;
    }

    void start() { engine.ignite(); }
}
```

Whoever creates the `Car` now decides which engine it gets:

```java
Car petrolCar = new Car(new PetrolEngine());
Car electricCar = new Car(new ElectricEngine());
Car testCar = new Car(new FakeEngineForTesting());   // unit test, no real hardware
```

**This is Dependency Injection. A class declares what it needs (through its constructor), and something else supplies it, instead of the class creating it itself.** Nothing about this requires Spring — you just wrote DI in plain Java. This is the one thing beginners most often get backwards: DI is a plain technique; Spring didn't invent it, it just automates it later.

What you gained: `Car` no longer cares which engine it gets, and testing `Car` is now trivial — hand it a fake `Engine`.

## 3. The New Problem: Now Someone Has to Wire Everything

Someone still has to write `new Car(new PetrolEngine())`. Fine for one class. A real app looks like this instead:

```java
UserRepository repository = new JpaUserRepository(dataSource);
UserService service = new UserService(repository);
EmailSender emailSender = new SmtpEmailSender(smtpConfig);
NotificationService notifications = new NotificationService(emailSender);
UserController controller = new UserController(service, notifications);
// ...repeat for every one of 300 classes, in the right order, every time something changes.
```

The wiring code itself is now the tangled, repetitive thing. Something needs to take over the job of "create every object, work out what it needs, plug it together, in the right order." That something is Spring.

## 4. Spring's Answer: A Container That Wires It For You

Spring hands you a **container** — machinery that creates objects, figures out what each one needs, and wires them together automatically at startup, so you stop writing `new` for your own application classes.

Two terms, and neither is more complicated than what it names:

- **IoC (Inversion of Control):** normally your code decides when objects get created. Spring flips that — the container decides. Control is handed over ("inverted") from your code to the container.
- **DI (Dependency Injection):** the exact same idea from section 2 — a class declares what it needs, something else supplies it. The only change is *who* supplies it: now the container, not you by hand.

**IoC is who's in charge of creating objects (the container). DI is how a class receives what it needs (handed in, not self-built). Spring uses DI to achieve IoC.** That one sentence is the key to everything else in this file.

A Spring-managed object — one the container creates and wires instead of you calling `new` — is called a **bean**. That's the whole definition: a bean is just an object the container is responsible for.

## 5. Telling Spring What to Manage

```java
@Component
class PetrolEngine implements Engine {
    public void ignite() { System.out.println("Vroom (petrol)"); }
}

@Component
class Car {
    private final Engine engine;

    Car(Engine engine) {        // exactly the same constructor as before
        this.engine = engine;
    }

    void start() { engine.ignite(); }
}
```

`@Component` tells Spring: "create and manage one instance of this — make it a bean." At startup Spring scans your code, finds every `@Component`, creates one instance of each, checks each constructor to see what it needs, and plugs in a matching bean. `PetrolEngine` needs nothing, so it's built first. `Car` needs an `Engine`; Spring already has a `PetrolEngine` bean that fits, so it hands that in automatically — the same wiring you'd otherwise do by hand, now done for the whole app at once.

That's the entire mental model. Everything else in this file is either more specific vocabulary for pieces of this same picture, or something Spring Boot specifically adds on top.

### Constructor injection — the default to reach for

You have three ways to get a dependency into a bean: constructor, setter, or field. Constructor injection — what you've seen throughout — is the default:

```java
@Service
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }
}
```

It lets the field be `final`, and it's impossible to create a `UserService` without giving it a `UserRepository` — the compiler enforces it. Compare field injection:

```java
@Service
public class UserService {
    @Autowired
    private UserRepository repository;   // avoid this style in new code
}
```

Shorter to type, but it hides what the class needs (you have to scan every field to find dependencies), the field can't be `final`, and there's no constructor to hand a fake repository into for a test. Setter injection is reasonable only for a genuinely optional dependency; field injection is the one style worth actively avoiding.

`@Autowired` is optional on a constructor when a class has only one — Spring assumes that's the one to use. Lombok's `@RequiredArgsConstructor` can generate that constructor from your `final` fields, but Lombok only writes the constructor — Spring is still the one calling it and injecting the beans.

### The Lombok trap that breaks startup

Lombok annotations write a constructor for you, so you don't have to type it by hand. The important thing to understand is that **each one decides which fields go into that constructor by a different rule** — and picking the wrong rule is what causes the crash.

| Annotation | Rule for which fields go in the constructor | Safe for a Spring bean? |
|---|---|---|
| `@RequiredArgsConstructor` | Only `final` (or `@NonNull`) fields | Yes — standard choice |
| `@AllArgsConstructor` | Every field, `final` or not | Risky |
| `@NoArgsConstructor` | None at all | Not for injection |

Watch what each one actually generates for the same class:

```java
@Service
@AllArgsConstructor          // <-- "put EVERY field in the constructor"
public class UserService {
    private final UserRepository repository;   // a real dependency, meant to be injected
    private boolean auditEnabled = true;        // just an ordinary flag, not a dependency at all
}

// Lombok generates this constructor for you, invisibly:
public UserService(UserRepository repository, boolean auditEnabled) {
    this.repository = repository;
    this.auditEnabled = auditEnabled;
}
```

Here's exactly why it breaks: Spring's whole injection mechanism works by looking at a bean's constructor and asking, "what does this parameter's *type* need — do I have a bean for that?" Spring has a `UserRepository` bean ready to go, no problem there. But the second parameter's type is `boolean` — and there is no such thing as a "bean of type boolean" sitting in the container; a plain flag was never meant to come from Spring in the first place. So Spring throws `NoSuchBeanDefinitionException`, complaining about a missing bean — which reads like a *wiring* problem, sending you off hunting for a missing `@Component`, when the actual cause is one line up: `@AllArgsConstructor` swept up a field that was never supposed to be a constructor parameter at all.

Now compare `@RequiredArgsConstructor` on the exact same class:

```java
@Service
@RequiredArgsConstructor      // <-- "put only the FINAL fields in the constructor"
public class UserService {
    private final UserRepository repository;   // final -> included
    private boolean auditEnabled = true;        // not final -> left alone completely
}

// Lombok generates this instead:
public UserService(UserRepository repository) {
    this.repository = repository;
}
// auditEnabled keeps its default value (true) and is never touched by the constructor at all.
```

Same class, same fields — the only thing that changed is *which rule* Lombok used to decide what belongs in the constructor. `final` is the natural marker for "this must be supplied from outside, and never reassigned after" — which is exactly what a dependency is, and exactly what an ordinary configuration flag is not. That's why the convention is: dependencies are `final`, everything else isn't, and you reach for `@RequiredArgsConstructor` by default and treat `@AllArgsConstructor` on a Spring bean as a smell — it works fine right up until someone adds one ordinary field, and then it silently breaks startup with an error that points nowhere near the real cause.

**This trap is specific to Spring-managed beans — it does not apply to DTOs, entities, or plain value objects.** The whole problem only exists because *Spring itself* calls the constructor of a `@Service`/`@Component`/etc. and tries to inject a bean into every parameter. A class like `UserResponse` from section 7 is never annotated `@Component`, so Spring never touches its constructor at all — *you* call `new UserResponse(id, name, email)` yourself, or a mapping library does. There's no injection happening, so there's nothing to break:

```java
@AllArgsConstructor   // completely fine — this class is never constructed by Spring
public class UserResponse {
    private final Long id;
    private final String name;
    private final String email;
}
```

So the real rule is narrower than "avoid `@AllArgsConstructor` everywhere": on a **Spring bean** (anything Spring scans and constructs — `@Service`, `@Component`, `@Repository`, `@RestController`), prefer `@RequiredArgsConstructor`. On a **plain object** Spring never constructs — a DTO, a JPA entity, a simple data holder — `@AllArgsConstructor` is normal and often exactly what you want.

## 6. The File That Starts Everything: `main`

Every Spring Boot project has exactly one file like this — usually the only file with a `main` method at all:

```java
@SpringBootApplication
public class InterviewApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(InterviewApiApplication.class, args);
    }
}
```

- **`@SpringBootApplication`** bundles three things: `@Configuration` (this class may define beans), `@ComponentScan` (find every `@Component`/`@Service`/`@Repository`/`@RestController` in this package and below), and `@EnableAutoConfiguration` (covered shortly).
- **`SpringApplication.run(...)`** is the one line that actually builds the container and starts the app. It reads the class you passed in to know what to scan and configure.

Your ordinary `main` method hasn't gone anywhere — it's still the JVM's real entry point. It just contains one meaningful line, and that line hands control to Spring: instead of *you* manually creating `Car`, `PetrolEngine`, and everything else, one call, and the container takes over building and wiring all of them.

That one line sets this in motion:

1. Creates the container (called an `ApplicationContext` — more on the name later).
2. Scans your code for `@Component` and its relatives.
3. Adds extra beans automatically based on what's on your classpath (auto-configuration).
4. Creates every bean, works out its dependencies from its constructor, injects them.
5. Wraps some beans in a proxy for features like transactions or caching (more below).
6. Starts the embedded web server — the app is ready for requests.

### Seeing it happen: pulling a bean out of `main`

`SpringApplication.run(...)` returns the container itself. You can reach in and pull out a bean Spring built and wired on its own:

```java
public static void main(String[] args) {
    ApplicationContext context = SpringApplication.run(InterviewApiApplication.class, args);

    Car car = context.getBean(Car.class);   // the exact bean Spring created and wired
    car.start();                             // "Vroom (petrol)" — Engine was injected automatically
}
```

`Car` and `PetrolEngine` were both `@Component`, so scanning found them; Spring saw `Car`'s constructor needs an `Engine`, and injected the `PetrolEngine` bean automatically. `getBean(Car.class)` just asks the container for the instance it already built — no `new` anywhere.

In real code you'd almost never call `getBean` directly — a bean simply declares what it needs in its own constructor, one layer deeper, and Spring injects it the same way. `getBean` here is only to let you see the wiring happen once. For code that should run automatically at startup, use `CommandLineRunner` instead:

```java
@Component
class StartupDemo implements CommandLineRunner {
    private final Car car;   // ordinary constructor injection

    StartupDemo(Car car) { this.car = car; }

    @Override
    public void run(String... args) {
        car.start();   // runs automatically once the container finishes building everything
    }
}
```

### The request flow, once the app is running

```text
HTTP request
  -> servlet filters / security
  -> DispatcherServlet (Spring's traffic router)
  -> controller   (handles HTTP: reads the request, returns a response)
  -> service      (business logic, decides what should happen)
  -> repository   (talks to the database)
  -> response serialization (turns a Java object back into JSON)
```

One packaging note: put your main class in a package *above* everything else. `@ComponentScan` scans that package and everything below it, so a main class buried in a subpackage means classes outside that subpackage never get found.

## 7. A Small Layered Example, Tying It Together

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

Same `Car`/`Engine` pattern, real names: `UserController` depends on `UserService`, which depends on `UserRepository`. Spring builds all three in dependency order and wires them together.

Notice the controller returns a `UserResponse` (a DTO — "Data Transfer Object," a plain class shaped for the API), not the raw `User` entity. This keeps the database structure from leaking into the API — a database column can change without necessarily changing what clients receive, and you avoid accidentally serializing internal fields or triggering lazy-loading errors.

## 8. Stereotypes, `@Bean`, Scopes, and Proxies

`@Component`, `@Service`, `@Repository`, and `@RestController` all do the same mechanical thing — mark a class as a bean for scanning to find. The difference is purely intent, for a human reader:

- `@Component` — generic, no further claim.
- `@Service` — business logic.
- `@Repository` — talks to the database; also enables Spring's persistence-exception translation.
- `@RestController` — a `@Controller` whose methods write their return value directly into the HTTP response body.

All four work by scanning your own source code. For a class you didn't write — a third-party library class, or something needing setup logic — you can't add an annotation to it, so you write the construction yourself inside a `@Configuration` class using `@Bean`:

```java
@Configuration
public class AppConfig {
    @Bean
    public Clock applicationClock() {
        return Clock.systemUTC();
    }
}
```

Rule of thumb: stereotype annotations for classes you own, `@Bean` for anything you don't own or that needs explicit construction. If two beans implement the same interface and Spring can't tell which you mean, `@Primary` (pick a default) or `@Qualifier` (name the exact one) resolve it.

**Scopes.** By default a bean is a **singleton** — one instance, shared by the whole app. Because it's shared across concurrent requests, a singleton must never store per-request data in an instance field — two requests would silently overwrite each other. Keep request-specific data in local variables inside a method. Less commonly, **prototype** scope gives a new instance every time one's requested, and **request** scope ties a bean's life to one HTTP request. Singleton is what you'll use almost everywhere.

**Proxies.** Annotations like `@Transactional`, `@Cacheable`, and `@Async` aren't magic keywords — Spring wraps the bean in a **proxy**: a stand-in that intercepts the call, does its extra behavior, then calls your real method. The gotcha: the proxy only gets involved on a call from *outside* the bean. A self-invocation (`this.someAsyncMethod()`) from inside the same class bypasses the proxy entirely, so the annotation silently does nothing. This is a common real bug — the fix is to call the annotated method through a different bean.

## 9. Auto-Configuration

Everything above is really just "Spring" — the container, DI, beans. Spring **Boot** adds one thing on top: it tries to configure sensible beans for you automatically, based on what's in your project.

A **starter** is a curated bundle of dependencies with a name — `spring-boot-starter-web` pulls in Spring MVC, JSON handling, validation, and an embedded server all at once. Once those libraries are on your classpath, **auto-configuration** creates the beans a typical app would need — conditionally, via a family of `@Conditional*` annotations on Spring's own configuration classes:

```java
@Configuration
@ConditionalOnClass(DataSource.class)          // only applies if this class is on the classpath
public class DataSourceAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean                   // only creates this if the app didn't define its own
    public DataSource dataSource() { ... }

    @Bean
    @ConditionalOnProperty(name = "app.cache.enabled", havingValue = "true")
    public CacheManager cacheManager() { ... }
}
```

Two of these explain most "why did that happen automatically" questions:

- **`@ConditionalOnClass`** — adding `spring-boot-starter-data-jpa` is enough to get JPA configured, because the condition is just "is the relevant class on the classpath."
- **`@ConditionalOnMissingBean`** — defining your own `@Bean` of the same type quietly overrides the auto-configured one, no conflict, no error. Auto-configuration checks "did the developer already provide one?" first, and backs off if so.

If a configuration outcome ever looks unexplainable, don't disable auto-configuration wholesale — find the specific condition that produced or skipped the bean, via the startup logs or the condition evaluation report.

## 10. Externalized Configuration

```properties
spring.application.name=interview-api
server.port=8080
spring.jpa.hibernate.ddl-auto=validate
app.feature.audit-enabled=true
```

`.properties` and `.yml` configure the same underlying keys — YAML just uses indentation instead of a repeated dotted prefix:

```yaml
app:
  feature:
    audit-enabled: true
    retention-days: 30
```

Both can coexist in one project, but defining the same key in both is a real source of "why isn't my property taking effect" bugs — pick one format and stay consistent.

For one small value, `@Value("${some.key}")` on a field is fine. For a related group, a typed class is clearer and gets validated at startup instead of silently returning `null` on a typo'd key:

```java
@ConfigurationProperties(prefix = "app.feature")
@Validated
public record FeatureProperties(@NotNull Boolean auditEnabled) {}
```

Never commit real passwords or signing keys — use environment variables or a secret manager. Profiles (`application-dev.yml`, `application-prod.yml`) vary configuration per environment; they are not a secret-management system.

## 11. Bean Lifecycle

A bean's life: Spring instantiates it, injects its dependencies, runs initialization logic, keeps it ready, eventually destroys it (e.g. on shutdown).

`@PostConstruct` runs right after dependency injection — good for validation or small setup. `@PreDestroy` runs on shutdown — good for releasing resources.

Spring also recognizes two lifecycle interfaces, worth knowing because they explain why the annotations exist at all — they're a convenience layer on top:

- **`InitializingBean.afterPropertiesSet()`** — same timing as `@PostConstruct`, via an interface instead of an annotation.
- **`DisposableBean.destroy()`** — same timing as `@PreDestroy`.
- **`BeanPostProcessor`** — different: not implemented by the bean itself, but registered separately, and it can inspect or wrap *every* bean around its initialization. This is how Spring internally attaches the proxies described earlier.

Prefer the annotations in application code — they don't tie your class to a Spring interface. The interfaces mostly matter for framework-level code.

One more note on `@Transactional`: by default an unchecked exception triggers a rollback, a checked one does not unless you add `rollbackFor`. And a transaction is a database boundary only — if a method sends an email and the database write later fails, the email isn't "rolled back," only the database change is.

## 12. Circular Dependencies

If `OrderService` needs a `NotificationService` in its constructor, and `NotificationService` needs an `OrderService` in its constructor, neither can finish being built first:

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

Spring fails immediately with `BeanCurrentlyInCreationException` rather than guessing. That's a feature, not an annoyance — two classes depending on each other both ways is almost always a design smell: extract the shared behavior into a third class, or make the dependency one-directional.

If a cycle is genuinely unavoidable, `@Lazy` on one side injects a placeholder proxy and defers real construction until first use:

```java
@Service
class OrderService {
    private final NotificationService notificationService;
    OrderService(@Lazy NotificationService notificationService) {
        this.notificationService = notificationService;
    }
}
```

Treat this as a stopgap, not a fix — if the same cycle keeps reappearing, redesign.

## 13. `BeanFactory` vs `ApplicationContext`

The container isn't one interface — it's two, one built on the other.

`BeanFactory` is the root interface: the most basic container, with **lazy initialization** — a bean isn't created until something asks for it. `ApplicationContext` extends it and adds what a real app needs: **eager initialization** of singletons at startup (so a misconfigured bean fails fast at boot, not on some later request), event publication, internationalization, and AOP integration (the mechanism behind the proxies above).

Every Spring Boot app runs on an `ApplicationContext`; you'll essentially never instantiate a bare `BeanFactory` yourself. It matters mainly as the interface `ApplicationContext` is built on.

## Interview Questions and Answers

### 1. What's the difference between IoC and DI?

**Answer:** DI is a technique: a class declares what it needs and something else supplies it, instead of the class creating it with `new`. IoC is the broader principle that control over creating and wiring objects has moved to a container. Spring uses DI as the mechanism to implement IoC.

**Follow-up:** Why is constructor injection preferred over field injection? It makes required dependencies explicit and impossible to omit, allows `final` fields, and makes unit testing trivial.

### 2. How does Spring find and create a bean?

**Answer:** Component scanning finds stereotype-annotated classes, `@Configuration` classes contribute `@Bean` methods, and auto-configuration adds conditional beans. Spring creates each bean, resolves constructor dependencies, wires matching beans in, applies proxies, and stores the result in the application context.

### 3. What's actually different between `@Component`, `@Service`, and `@Repository`?

**Answer:** Mechanically nothing — all three make a class a discoverable bean. The difference is intent: `@Service` signals business logic, `@Repository` signals persistence code (plus exception translation), `@Component` is the generic fallback.

### 4. When would you use `@Bean` instead of a stereotype annotation?

**Answer:** Stereotype annotations only work on classes you wrote. For a third-party class, or one needing explicit construction, write a `@Bean` factory method inside a `@Configuration` class instead.

### 5. Why might `@Transactional` appear to silently not work?

**Answer:** It's implemented via a proxy. A self-invocation from inside the same class bypasses the proxy entirely. It can also fail to roll back on a checked exception without `rollbackFor`.

### 6. What is Spring Boot auto-configuration, concretely?

**Answer:** Conditionally-activated configuration classes, gated by annotations like `@ConditionalOnClass` and `@ConditionalOnMissingBean`, that create default beans when certain libraries are present and no conflicting bean already exists.

### 7. Why should a controller return a DTO instead of the entity?

**Answer:** Returning the entity couples the API to the database schema, risks serializing fields never meant to be public, and can trigger lazy-loading errors. A DTO keeps the API and the database model free to evolve independently.

### 8. What makes a singleton bean unsafe, and when?

**Answer:** Only when it stores mutable, request-specific state in an instance field — concurrent requests would race on that field. Request data should live in local variables, not bean fields.

### 9. How would you debug a bean Spring says it can't find?

**Answer:** Check the class is within component-scan's package boundary, check `@Profile`/`@Conditional*` properties, check the constructor's dependencies are themselves satisfiable, and check whether multiple candidates need a `@Qualifier`. Read the actual startup error and condition evaluation report before adding speculative annotations.

### 10. Walk through the request flow in Spring MVC.

**Answer:** Filters run first, then `DispatcherServlet` matches the request to a controller method. Argument resolvers build the method's parameters, the controller delegates to a service, and a message converter serializes the response. `@RestControllerAdvice` can centralize exception handling across controllers.

### 11. How does Spring handle a circular dependency, and how do you actually fix it?

**Answer:** With constructor injection, Spring fails startup immediately with `BeanCurrentlyInCreationException`. The real fix is to remove the cycle — extract shared behavior into a third bean, or make the dependency one-directional. `@Lazy` unblocks startup but is a stopgap, not a design fix.

### 12. Why can adding an unrelated `boolean` field to a `@Service` class break startup?

**Answer:** If the class uses `@AllArgsConstructor`, every field — not just `final` dependencies — becomes a constructor parameter, including the new `boolean`. Spring has no bean of that type, so startup fails with `NoSuchBeanDefinitionException`, an error naming a missing bean when the real cause is the Lombok annotation. `@RequiredArgsConstructor` avoids this by only including `final` fields.

### 13. What's the difference between `BeanFactory` and `ApplicationContext`?

**Answer:** `BeanFactory` is the root container: lazy bean creation, only built when first requested. `ApplicationContext` extends it with eager singleton initialization, event publication, internationalization, and AOP integration. Every real app runs on an `ApplicationContext`.

### 14. What does `@ConditionalOnMissingBean` actually enable?

**Answer:** It makes an auto-configured bean activate only if no bean of that type already exists. Your own `@Bean` is seen first, so the auto-configured version never activates — no conflict, by design.

### 15. Besides `@PostConstruct`/`@PreDestroy`, what else hooks into a bean's lifecycle?

**Answer:** `InitializingBean`/`DisposableBean` give identical timing via interfaces, and a separately-registered `BeanPostProcessor` can inspect or wrap every bean around its initialization — the mechanism Spring uses internally to attach proxies like the one behind `@Transactional`.

## Revision Checklist

- [ ] Explain, using `Car`/`Engine`, why a class building its own dependency with `new` is a problem.
- [ ] Explain DI as "hand it in from outside" — and that this has nothing to do with Spring by itself.
- [ ] Explain IoC as "the container is in charge of creating objects" — and DI as the mechanism it uses.
- [ ] Write the `main` class from memory and explain what `@SpringBootApplication` and `SpringApplication.run(...)` each do.
- [ ] Draw the startup sequence and the HTTP request flow without looking at the notes.
- [ ] Explain when to use `@Bean` vs a stereotype annotation like `@Service`.
- [ ] Explain why a self-invocation call can silently bypass `@Transactional`/`@Async`/`@Cacheable`.
- [ ] Build a controller-service-repository slice from scratch, using a DTO for the response.
- [ ] Explain why Spring fails fast on a circular constructor dependency, and when `@Lazy` is the right stopgap.
- [ ] Explain the `@AllArgsConstructor` → `NoSuchBeanDefinitionException` trap and why `@RequiredArgsConstructor` avoids it.
- [ ] Explain `BeanFactory` vs `ApplicationContext`, and name the `@Conditional*` annotations behind auto-configuration.
- [ ] Explain `InitializingBean`/`DisposableBean`/`BeanPostProcessor` as the interface-based alternative to `@PostConstruct`/`@PreDestroy`.
