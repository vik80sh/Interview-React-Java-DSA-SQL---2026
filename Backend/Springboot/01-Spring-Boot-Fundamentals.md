# Spring Boot Fundamentals

This file is written for someone who has never built a Spring Boot app before. Every new term is introduced by first showing the *problem* it solves in plain Java — no Spring, no annotations — and only then giving the term a name. If you already know the vocabulary, this will feel slow; that's intentional. Read it top to bottom once, in order — each section leans on the one before it.

---

## 1. The Actual Problem: Objects Building Their Own Dependencies

Forget Spring for a moment. Here's a plain Java class:

```java
class Car {
    private Engine engine = new PetrolEngine();

    void start() {
        engine.ignite();
    }
}
```

`Car` needs an `Engine` to work. So it just... makes one, right there in the field declaration, using `new PetrolEngine()`.

This looks completely normal — it's how most people write Java when they're starting out. But it has three real problems, and every one of them shows up eventually:

1. **`Car` is welded to `PetrolEngine` forever.** If tomorrow you need an `ElectricEngine`, you have to open up `Car` and edit its source code. A class that's supposed to just be "a car" now has to change every time the *engine* changes.
2. **You cannot test `Car` in isolation.** If you want to write a unit test for `Car.start()`, you're stuck also testing whatever `PetrolEngine.ignite()` actually does — maybe it talks to real hardware, maybe it's slow, maybe it throws in some environments. You wanted to test one class; you got two, whether you wanted to or not.
3. **This doesn't stay small.** A real application isn't one class with one dependency — it's hundreds of classes, each needing a handful of others. If every class manufactures its own dependencies internally, the whole codebase turns into a tangle where nothing can be swapped, mocked, or reused without editing source code all over the place.

Keep this `Car`/`Engine` example in your head. Everything below is the fix for exactly this problem, introduced one small step at a time.

## 2. The Fix (Still Plain Java, No Spring Yet): Hand the Dependency In From Outside

The fix is almost embarrassingly simple. Instead of `Car` building its own `Engine`, someone else builds the `Engine` and **hands it to** `Car`:

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

    // The engine arrives through the constructor — Car doesn't build it.
    Car(Engine engine) {
        this.engine = engine;
    }

    void start() {
        engine.ignite();
    }
}
```

And now, whoever creates the `Car` decides which engine it gets:

```java
Car petrolCar = new Car(new PetrolEngine());
Car electricCar = new Car(new ElectricEngine());
Car testCar = new Car(new FakeEngineForTesting());   // for a unit test — no real hardware involved
```

**This is Dependency Injection. That's it. That's the whole idea.** "Dependency Injection" is just a formal-sounding name for: *a class declares what it needs (through its constructor), and something else supplies it, instead of the class creating it itself.*

Nothing about this requires Spring. You could write your entire application this way in plain Java, with no framework at all, and you would already be "doing DI." Re-read that sentence — it's the single most common thing beginners get confused about. DI is a **technique**, not a Spring feature. Spring just automates it at scale, which is the next problem to solve.

Notice what you gained just from this one change, with zero extra code beyond moving where `new` happens:

- `Car` no longer cares which engine it gets, as long as it's an `Engine`. Swapping `PetrolEngine` for `ElectricEngine` requires zero changes inside `Car`.
- Testing `Car` is now trivial — hand it a fake `Engine` that does nothing real, and you're testing only `Car`'s own logic.

## 3. The New Problem DI Creates: Now *Someone* Has to Do All This Wiring

Look again at this line:

```java
Car petrolCar = new Car(new PetrolEngine());
```

Someone still has to write `new Car(new PetrolEngine())`. For one class with one dependency, that's trivial. But a real application looks more like this:

```java
UserRepository repository = new JpaUserRepository(dataSource);
UserService service = new UserService(repository);
EmailSender emailSender = new SmtpEmailSender(smtpConfig);
NotificationService notifications = new NotificationService(emailSender);
UserController controller = new UserController(service, notifications);
// ...repeat this for every one of the 300 classes in your application, in the right order,
// every time one of them changes what it needs.
```

This is the exact problem DI was solving in section 2, just one level up: now the *wiring code itself* is the thing that's tangled, repetitive, and painful to change. Someone (or something) needs to take over the job of "create every object, figure out what each one needs, and plug them together in the right order." Doing that by hand for a real application doesn't scale.

This is precisely the gap Spring exists to fill.

## 4. Spring's Answer: A Container That Does the Wiring for You

Spring's core idea is: instead of *you* writing `new Car(new PetrolEngine())` everywhere, you hand that responsibility to a **container** — a piece of Spring's machinery that knows how to create objects, figure out what each one needs, and wire them together automatically, once, at application startup.

Two terms fall directly out of what you just read, and neither is more complicated than what it names:

- **IoC (Inversion of Control):** normally, *your code* controls when objects get created (`new Car(...)`, written by you, in your code). Spring flips that — control over creation is handed over ("inverted") to the container. You stop writing `new` for your application's classes; the container does it.
- **DI (Dependency Injection):** this is the exact same technique from section 2 — a class declares what it needs, and something else supplies it. The only thing that changes is *who* is doing the supplying: in section 2 it was you, writing wiring code by hand; now it's the Spring container, doing it automatically.

**So: IoC is the "who's in charge of creating objects" principle (the container, not you). DI is the "how a class receives what it needs" technique (handed in, not self-created). Spring uses DI as the mechanism to achieve IoC.** If you only remember one sentence from this file, remember that one — it's the sentence that makes every other Spring concept click into place, because it tells you Spring isn't inventing a new idea, it's automating the plain-Java trick from section 2.

A Spring-managed object — one the container creates and wires for you instead of you calling `new` yourself — has a name: a **bean**. That's all a "bean" is: an object the container is responsible for.

## 5. Telling Spring What to Manage

Translate the `Car`/`Engine` example into Spring. Two questions need answering: *which classes should the container create* (`@Component`/`@Service`/etc.), and *how does a class ask for what it needs* (constructor parameters — same as section 2, unchanged).

```java
@Component
class PetrolEngine implements Engine {
    public void ignite() { System.out.println("Vroom (petrol)"); }
}

@Component
class Car {
    private final Engine engine;

    Car(Engine engine) {           // identical to section 2 — nothing new here
        this.engine = engine;
    }

    void start() { engine.ignite(); }
}
```

`@Component` tells Spring: "create and manage one instance of this class — make it a bean." At startup, Spring scans your code, finds every `@Component` (and related annotations — more on those in a moment), creates one instance of each, looks at each one's constructor to see what it needs, and plugs the matching beans in. `PetrolEngine` needs nothing, so it's created first. `Car` needs an `Engine`, and Spring already has a `PetrolEngine` bean sitting there that implements `Engine`, so it hands that in — automatically, the same way you did by hand in section 2, except now for every class in the entire application, in the correct order, without you writing a single `new`.

That's the entire mental model. Everything past this point in the file is either (a) more specific vocabulary for pieces of this same picture, or (b) how Spring Boot specifically (as opposed to plain Spring) makes this convenient.

### Constructor injection is what you already saw — prefer it

You technically have three ways to get a dependency into a Spring bean: through the constructor, through a setter method, or directly into a field. Constructor injection — exactly what section 2 and section 5 both used — is the one to default to:

```java
@Service
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {   // required dependency, arrives at construction time
        this.repository = repository;
    }
}
```

Why it's preferred: the field can be `final` (once set, it can't accidentally be reassigned later), and it's *impossible* to create a `UserService` without giving it a `UserRepository` — the compiler won't let you leave out a constructor argument. Compare that to field injection:

```java
@Service
public class UserService {
    @Autowired
    private UserRepository repository;   // avoid this style in new code
}
```

This *looks* shorter, but it hides what the class actually needs (you have to read every field to know its dependencies), it can't be `final`, and — connecting back to section 2's whole point — it makes plain unit testing awkward, because there's no constructor to hand a fake repository into. Setter injection sits in between and is reasonable only for a genuinely *optional* dependency. Field injection is the one style worth actively avoiding.

One more small thing that trips people up: `@Autowired` is *optional* on a constructor when the class has exactly one constructor — Spring assumes that's the one to use. Lombok's `@RequiredArgsConstructor` can generate that constructor for you from your `final` fields, but to be precise about what's doing what: **Lombok only writes the constructor; Spring is still the one actually calling it and injecting the beans.** Lombok saves you keystrokes; it has no involvement in DI itself.

### Lombok constructor annotations — a real startup-breaking trap

| Annotation | Fields included | Safe for a Spring bean? |
|---|---|---|
| `@RequiredArgsConstructor` | Only `final` (or `@NonNull`) fields | Yes — the standard choice for `@Service`/`@Component` classes |
| `@AllArgsConstructor` | Every field, `final` or not | Risky — a non-`final` field like `private boolean enabled = true;` becomes a constructor parameter too |
| `@NoArgsConstructor` | None | Not for injection — no parameters means nothing for Spring to inject |

The trap: add one ordinary, non-dependency field to a `@Service` class — a plain `boolean`, a default `int` — and if that class uses `@AllArgsConstructor`, that field silently becomes a *required constructor argument too*. Spring has no bean of type `boolean` anywhere to inject, so startup fails with `NoSuchBeanDefinitionException` — an error that points at "a missing bean" when the real cause is "the wrong Lombok annotation." `@RequiredArgsConstructor` never has this problem, because it only ever pulls in `final` fields — which, by convention, is exactly the set of fields that should be dependencies.

## 6. What Happens When You Actually Run the App

Every Spring Boot project has exactly one file that kicks off everything described in section 4 and 5. It looks like this, and it's usually the *only* file with a `main` method in the whole project:

```java
@SpringBootApplication
public class InterviewApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(InterviewApiApplication.class, args);
    }
}
```

Two lines, and each one maps directly onto something you already understand from earlier sections:

- **`@SpringBootApplication`** is the annotation that turns on **configure** + **scan**: it bundles `@Configuration` (this class is allowed to define beans), `@ComponentScan` (go find every `@Component`/`@Service`/`@Repository`/`@RestController` in this package and below — the discovery step from section 5), and `@EnableAutoConfiguration` (turn on the conditional auto-configuration from section 9).
- **`SpringApplication.run(InterviewApiApplication.class, args)`** is the line that actually **initializes** everything — it's the one piece of code, anywhere in your whole project, that says "build the container and start the app." It reads the annotations on the class you passed in (`InterviewApiApplication.class`), and that's how it knows where to scan and what to configure.

So the ordinary Java `public static void main` you already know from plain Java hasn't gone anywhere — it's still the JVM's real entry point. It just contains exactly one meaningful line, and that line hands control over to Spring, which is the "Inversion of Control" from section 4 happening at the very first possible moment: instead of *your* `main` method manually creating `Car`, `PetrolEngine`, `UserService`, `UserRepository`, and everything else one by one, it makes a single call, and the container takes over creating and wiring all of them.

Concretely, here's the sequence that one `SpringApplication.run(...)` line sets in motion:

1. It creates the container (an `ApplicationContext` — see section 13 for why it's not just called "the container").
2. Spring scans your code for `@Component` and its relatives (`@Service`, `@Repository`, `@RestController`) — the same discovery step described in section 5, turned on by `@ComponentScan` inside `@SpringBootApplication`.
3. Auto-configuration (section 9) adds extra beans automatically based on what's on your classpath — turned on by `@EnableAutoConfiguration`.
4. Spring creates every bean, works out each one's dependencies from its constructor, and injects them — exactly the wiring process from section 5, done for the whole app at once.
5. Some beans get wrapped in a proxy for features like transactions or caching (section 8 explains what a proxy is and why it matters).
6. The embedded web server starts, and the app is ready to receive HTTP requests.

### Proof that it actually happened: pulling a bean straight out of `main`

All of this can feel abstract until you see it directly. `SpringApplication.run(...)` doesn't just start the app and vanish — it **returns the container itself** (the `ApplicationContext`). That means you can reach into it, right from `main`, and pull out a bean that Spring built and wired on its own, with no `new` anywhere:

```java
@SpringBootApplication
public class InterviewApiApplication {

    public static void main(String[] args) {
        ApplicationContext context = SpringApplication.run(InterviewApiApplication.class, args);

        Car car = context.getBean(Car.class);   // the exact Car bean Spring created and wired for you
        car.start();                             // "Vroom (petrol)" — its Engine was injected automatically
    }
}
```

Walk through what just happened, connecting every piece back to earlier sections:

1. `Car` and `PetrolEngine` were both marked `@Component` (section 5), so step 2 of the startup sequence above found them during scanning.
2. Spring looked at `Car`'s constructor, saw it needs an `Engine`, and — since `PetrolEngine implements Engine` — injected it automatically (step 4). This is DI (section 2) and IoC (section 4) happening for real, not just in a diagram.
3. `context.getBean(Car.class)` asks the container, "give me the `Car` bean you already built." It hands back the *same* fully-wired instance — you never wrote `new Car(new PetrolEngine())` anywhere.

In a real application you will almost never call `getBean(...)` directly like this — instead, another bean simply declares what it needs in *its own* constructor, and Spring injects it the same way, one layer deeper (exactly like `UserController` receiving `UserService` in section 7). Calling `getBean` from `main` is shown here purely so you can *see* dependency injection happen with your own eyes, once, before trusting that it's happening everywhere else behind the scenes.

If you do want code to run automatically at startup — using an injected bean, without manually calling `getBean` — Spring Boot gives you `CommandLineRunner` for exactly that:

```java
@Component
class StartupDemo implements CommandLineRunner {
    private final Car car;   // injected the normal way — constructor injection, section 5

    StartupDemo(Car car) {
        this.car = car;
    }

    @Override
    public void run(String... args) {
        car.start();   // runs automatically once the container has finished building everything
    }
}
```

Spring finds any bean implementing `CommandLineRunner` and calls its `run` method automatically right after the container finishes starting — no `getBean` call, no changes to `main` at all. This is the pattern you'd actually use in real code; the `getBean` version above was only for seeing the wiring happen directly.

Once it's running, a typical HTTP request flows through the layers like this:

```text
HTTP request
  -> servlet filters / security
  -> DispatcherServlet (Spring's traffic router)
  -> controller   (handles HTTP: reads the request, returns a response)
  -> service      (business logic, decides what should happen)
  -> repository   (talks to the database)
  -> response serialization (turns a Java object back into JSON)
```

`@SpringBootApplication` is shorthand for three annotations at once: `@Configuration` (this class can define beans), `@EnableAutoConfiguration` (turn on step 3 above), and `@ComponentScan` (turn on step 2 above, scanning this package and everything below it). That last part is why the convention is to put your main class in a package *above* all your other packages — if it's buried in a subpackage, component scanning won't reach classes outside that subpackage.

## 7. A Small Layered Example, Tying It Together

```java
public record UserResponse(Long id, String name, String email) {}

public interface UserRepository extends JpaRepository<User, Long> {}

@Service
public class UserService {
    private final UserRepository repository;   // dependency, arrives via constructor — section 2's idea, again

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
    private final UserService service;   // same pattern, one layer up

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public UserResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }
}
```

Nothing here is a new idea — it's section 5's `Car`/`Engine` pattern, just with real class names: `UserController` depends on `UserService`, which depends on `UserRepository`. Spring creates all three, in dependency order, and wires them together at startup, exactly like it wired `Car` and `PetrolEngine`.

One deliberate design choice worth noticing: the controller returns a `UserResponse` (a DTO — "Data Transfer Object," just a plain class shaped for the API response), not the raw `User` entity. This keeps your database structure from leaking directly into your API — you can change a database column without necessarily changing what clients receive, and you avoid accidentally serializing internal fields (or triggering lazy-loading errors) that were never meant to be public.

## 8. The Stereotype Annotations, and When to Use `@Bean` Instead

`@Component`, `@Service`, `@Repository`, and `@RestController` all do the *same mechanical thing* — they mark a class as a bean for step 2 of startup to find. The difference between them is purely about communicating intent to a human reader:

- `@Component` — generic; "this is a Spring-managed class," no further claim.
- `@Service` — "this class holds business logic."
- `@Repository` — "this class talks to the database"; it also enables Spring's persistence-exception translation for classes that use it.
- `@RestController` — a `@Controller` that also assumes every method's return value should be written directly into the HTTP response body (it bakes in `@ResponseBody`).

All four of those work by *scanning your own source code*. But sometimes you need a bean for a class you didn't write — a third-party class from a library, or something that needs a small amount of setup logic to construct. You can't put `@Component` on a class that lives in someone else's `.jar` file. For that case, you write the construction logic yourself inside a `@Configuration` class, using `@Bean`:

```java
@Configuration
public class AppConfig {
    @Bean
    public Clock applicationClock() {
        return Clock.systemUTC();
    }
}
```

Rule of thumb: **`@Component`-family annotations for classes you own; `@Bean` for anything you don't own or that needs explicit construction logic.** If two beans end up implementing the same interface and Spring can't tell which one you mean, `@Primary` (pick a default) or `@Qualifier` (name the exact one you want at the injection point) resolve the ambiguity — don't leave it to chance.

### Bean scopes: how many instances actually exist?

By default, a bean is a **singleton** — Spring creates exactly *one* instance of `Car`, and every part of your app that needs a `Car` gets that same instance. This has one important consequence: because it's shared across every concurrent HTTP request, a singleton bean must not store per-request data in an instance field — two requests running at the same time would silently overwrite each other's data. Keep request-specific data in local variables inside a method, never in a field.

Less commonly, **prototype** scope gives you a brand-new instance every time one is requested (Spring hands it off but stops managing its full lifecycle after that), and **request scope** ties a bean's lifetime to a single HTTP request. Singleton is what you'll use for the vast majority of `@Service`/`@Repository`/`@Component` classes.

### Proxies — why some annotations "stop working" in a specific situation

Annotations like `@Transactional`, `@Cacheable`, and `@Async` aren't magic keywords the JVM understands — Spring implements them by wrapping your bean in a **proxy**: a stand-in object that intercepts the method call, does its extra behavior (start a transaction, check a cache, run the method on another thread), and *then* calls your real method.

This matters because of one specific gotcha: the proxy only gets involved when the call comes from *outside* the bean, through the bean reference Spring handed out. If a method calls another method on `this` from inside the same class (`this.someAsyncMethod()`), that call never passes through the proxy — it's a plain, direct Java method call — so `@Async`/`@Transactional`/`@Cacheable` on that inner method silently does nothing. This is a common real-world bug, not a theoretical one: the fix is to call the annotated method from a *different* bean, so the call genuinely goes through the proxy.

## 9. Auto-Configuration: Spring Boot's Actual Contribution

Everything through section 8 is really just "Spring" (the container, DI, beans). Spring **Boot** specifically adds one thing on top: it tries to configure sensible beans *for you*, automatically, based on what you've added to your project — so you write far less setup code than plain Spring required.

A **starter** is just a curated bundle of dependencies with a name, so you don't have to hunt down and version-match a dozen libraries by hand. `spring-boot-starter-web` pulls in Spring MVC, JSON handling, request validation, and an embedded server, all at once.

Once those libraries are on your classpath, **auto-configuration** kicks in and creates the beans a typical app using them would need — but it does this *conditionally*, not unconditionally. The actual mechanism is a family of `@Conditional*` annotations sitting on Spring's own internal configuration classes:

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

Two of these explain nearly every "why did that happen automatically" question you'll ever have:

- **`@ConditionalOnClass`** is why adding `spring-boot-starter-data-jpa` as a dependency is *enough* to get JPA fully configured — the condition is simply "is `EntityManager`/`DataSource` on the classpath," and adding the starter puts it there.
- **`@ConditionalOnMissingBean`** is why defining your *own* `@Bean` of the same type in your own `@Configuration` class quietly overrides the auto-configured one — with no conflict, no error. Auto-configuration deliberately checks "has the developer already provided one of these?" first, and backs off if so. It was designed to defer to you, not compete with you.

If a configuration outcome ever looks unexplainable, the fix isn't to disable auto-configuration wholesale — it's to find the specific condition that produced (or skipped) the bean, usually via the startup logs or the condition evaluation report.

## 10. Externalized Configuration

Hard-coding values like a port number or a database URL directly in Java means recompiling to change them. Spring Boot instead reads configuration from a properties or YAML file at startup:

```properties
spring.application.name=interview-api
server.port=8080
spring.jpa.hibernate.ddl-auto=validate
app.feature.audit-enabled=true
```

`.properties` and `.yml` configure the exact same underlying keys — YAML just uses indentation to express nesting instead of repeating the dotted prefix on every line:

```yaml
app:
  feature:
    audit-enabled: true
    retention-days: 30
```

Both formats can technically coexist in one project (Spring merges them), but defining the *same* key in both is a genuine source of "why isn't my property taking effect" bugs — pick one format for a project and stay consistent. YAML tends to read better once settings are deeply nested; `.properties` stays popular for being flat and easy to `grep`.

For a small, one-off value, `@Value("${some.key}")` on a field is fine. For a *group* of related settings, a typed configuration class is clearer and gets validated at startup instead of failing later when a typo'd key silently returns `null`:

```java
@ConfigurationProperties(prefix = "app.feature")
@Validated
public record FeatureProperties(@NotNull Boolean auditEnabled) {}
```

(Register it with `@ConfigurationPropertiesScan`, or explicitly with `@EnableConfigurationProperties(FeatureProperties.class)`.)

Never commit real passwords or signing keys into a properties file — use environment variables or a secret manager, and treat Spring "profiles" (`application-dev.yml`, `application-prod.yml`, selected by an active-profile setting) as a way to vary *configuration* per environment, not as a substitute for actual secret management.

## 11. Bean Lifecycle: Creation, Setup, and Shutdown

A bean's life has a shape: Spring instantiates it, injects its dependencies (section 5's wiring), runs any initialization logic, keeps it ready for use, and eventually destroys it (e.g., on application shutdown).

For the two lifecycle moments you'll actually touch as an application developer, the annotations `@PostConstruct` (runs right after dependency injection finishes — good for validation or small setup work) and `@PreDestroy` (runs on shutdown — good for releasing resources like file handles or connections) are all you typically need.

Spring also recognizes two lifecycle **interfaces**, which are worth knowing about specifically because they explain *why* `@PostConstruct`/`@PreDestroy` exist at all — they're the annotation-based convenience layer on top of these older interfaces:

- **`InitializingBean.afterPropertiesSet()`** — the same timing as `@PostConstruct`, but the class implements a Spring interface directly instead of using an annotation.
- **`DisposableBean.destroy()`** — the same timing as `@PreDestroy`, interface-based instead of annotation-based.
- **`BeanPostProcessor`** — different from the two above: this isn't implemented *by* the bean itself, but registered separately, and it can inspect or wrap *every* bean in the application right around each one's initialization. This is the actual mechanism Spring uses internally to attach the proxies described in section 8 — when you see `@Transactional` wrapping a bean in a proxy, a `BeanPostProcessor` is what did that wrapping.

In everyday application code, prefer the annotations — they don't tie your class to a Spring-specific interface. The interfaces mostly matter for framework-level code, or the rare case where you need `BeanPostProcessor`'s exact, guaranteed ordering across every bean.

`@Transactional` deserves one clarifying note here since it's built on the same proxy mechanism: by default, an *unchecked* exception (like `RuntimeException`) triggers a rollback, but a *checked* exception does not, unless you explicitly add `rollbackFor`. Also remember a transaction is a **database** boundary only — if a method sends an email and then the database write fails, the email does not get "rolled back"; only the database change does.

## 12. Circular Dependencies: When Two Beans Both Need Each Other

Constructor injection has one sharp edge: if `OrderService` needs a `NotificationService` in its constructor, and `NotificationService` needs an `OrderService` in its constructor, **neither can finish being built first** — building either one requires the other to already exist.

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

Spring detects this at startup and fails immediately with `BeanCurrentlyInCreationException`, rather than silently guessing. That's a *feature*, not an annoyance — a class design where two things depend on each other in both directions is almost always a sign that they're too tightly coupled, or that some shared behavior actually belongs in a third class both can point at one-way instead.

If a genuine cycle is truly unavoidable — rare, and usually an internal wiring convenience rather than good long-term design — `@Lazy` on one side breaks it by injecting a placeholder proxy instead of the real object, deferring the real construction until the bean is first actually used (by which point everything has finished starting up):

```java
@Service
class OrderService {
    private final NotificationService notificationService;
    OrderService(@Lazy NotificationService notificationService) {
        this.notificationService = notificationService;
    }
}
```

Treat this as a stopgap that unblocks startup, not a fix for the underlying coupling — if the same cycle keeps reappearing, that's the signal to redesign.

## 13. `BeanFactory` vs `ApplicationContext`

One last piece of vocabulary, now that "the container" has a concrete meaning from section 4 onward: the container isn't one single interface, it's two, one built on top of the other.

`BeanFactory` is the root interface — the most basic possible container. It provides bean lookup and injection, but with **lazy initialization**: a bean isn't actually created until something asks for it. `ApplicationContext` extends `BeanFactory` and adds what a real application needs in practice: **eager initialization** of singleton beans at startup (so a misconfigured bean fails immediately at boot, not on whatever later request happens to first need it), the ability to publish application events, internationalization support, and integration with AOP (the mechanism behind the proxies from section 8).

Every Spring Boot application actually runs on an `ApplicationContext` — you will essentially never instantiate a bare `BeanFactory` yourself. Knowing it exists mainly matters for recognizing it as the foundational interface `ApplicationContext` is built on top of.

## Interview Questions and Answers

### 1. In your own words, what's the difference between IoC and DI?

**Answer:** DI is a technique: a class declares what it needs (typically via its constructor) and something else supplies it, rather than the class creating its own dependency with `new`. IoC is the broader principle that *control* over creating and wiring objects has been handed over to a container instead of being scattered through application code. Spring uses DI as the concrete mechanism to implement IoC — DI is "how," IoC is "who's in charge."

**Follow-up:** Why is constructor injection preferred over field injection? It makes required dependencies explicit and impossible to omit, allows `final` fields, and makes the class trivial to unit test by handing fakes directly into the constructor — none of which field injection allows.

### 2. How does Spring actually find and create a bean?

**Answer:** Component scanning finds classes marked with stereotype annotations (`@Component`, `@Service`, `@Repository`, `@RestController`), `@Configuration` classes contribute explicit `@Bean`-method objects, and auto-configuration adds conditional beans based on the classpath and properties. Spring then creates each bean, inspects its constructor to resolve dependencies, wires matching beans in, applies any post-processors or proxies, and stores the result in the application context.

### 3. What's actually different between `@Component`, `@Service`, and `@Repository`?

**Answer:** Mechanically, nothing — all three make a class a Spring-managed bean discoverable by component scanning. The difference is purely to communicate intent to a reader: `@Service` signals business logic, `@Repository` signals persistence code (and adds Spring's exception-translation for persistence errors), `@Component` is the generic fallback.

### 4. When would you reach for `@Bean` instead of a stereotype annotation?

**Answer:** Stereotype annotations only work on classes you wrote and control. For a class from a third-party library, or one that needs explicit construction logic/parameters, you write a `@Bean`-annotated factory method inside a `@Configuration` class instead.

### 5. Why might `@Transactional` appear to silently not work?

**Answer:** `@Transactional` is implemented via a proxy that wraps the bean. If the call happens through a self-invocation (`this.method()` from inside the same class) rather than through the proxy Spring handed out, the proxy is bypassed entirely and the transactional behavior never triggers. It can also fail to roll back if the thrown exception is checked rather than unchecked, without an explicit `rollbackFor`.

### 6. What is Spring Boot auto-configuration, concretely?

**Answer:** A set of conditionally-activated configuration classes, gated by annotations like `@ConditionalOnClass` and `@ConditionalOnMissingBean`, that create sensible-default beans when certain libraries are present on the classpath and no conflicting bean already exists. It removes most manual setup while still letting an explicitly-defined application bean silently take precedence.

### 7. Why should a controller return a DTO instead of the database entity directly?

**Answer:** Returning the entity directly couples your public API shape to your internal database schema, risks accidentally serializing fields that were never meant to be public, and can trigger lazy-loading exceptions during JSON serialization. A DTO keeps the API and the database model free to evolve independently.

### 8. What makes a singleton-scoped bean unsafe, and when?

**Answer:** Only when it stores mutable, request-specific state in an instance field — since a singleton bean is shared across every concurrent request, two requests writing to that same field race against each other. Request-specific data should live in local variables inside a method, not bean fields.

### 9. How would you debug a bean that Spring says it can't find?

**Answer:** Check that the class is actually within component-scan's package boundary, check any relevant `@Profile`/`@Conditional*` properties, check the constructor's declared dependencies are themselves satisfiable, and check whether multiple candidate beans for the same type need a `@Qualifier`. Read the actual startup error and the condition evaluation report before adding speculative annotations.

### 10. Walk through the request flow in Spring MVC.

**Answer:** Filters run first (security, logging), then `DispatcherServlet` matches the request to a controller method. Argument resolvers build the method's parameters from the request, the controller delegates to a service for business logic, and a message converter serializes the returned object into the HTTP response body. `@RestControllerAdvice` can centralize exception-to-response translation across all controllers.

### 11. How does Spring handle a circular dependency between two beans, and how would you actually fix it?

**Answer:** With constructor injection, Spring fails startup immediately with `BeanCurrentlyInCreationException`, since neither bean can finish constructing while waiting on the other. The correct fix is almost always to remove the cycle — extract shared behavior into a third bean, or make the dependency one-directional. `@Lazy` on one constructor parameter injects a deferred proxy and unblocks startup, but it's a stopgap for tight coupling, not a design fix.

### 12. Why can adding an unrelated `boolean` field to a `@Service` class break startup with `NoSuchBeanDefinitionException`?

**Answer:** If the class uses Lombok's `@AllArgsConstructor`, every field becomes a constructor parameter — not just the intended `final` dependencies — including the new `boolean`. Spring has no bean of type `boolean` to inject, so startup fails with an error naming a missing bean, even though the actual cause is the Lombok annotation choice. `@RequiredArgsConstructor` avoids this entirely by only including `final` fields.

### 13. What's the difference between `BeanFactory` and `ApplicationContext`?

**Answer:** `BeanFactory` is the root container interface: lazy bean creation, only building a bean when it's first requested. `ApplicationContext` extends it with eager singleton initialization at startup (so misconfiguration fails fast), event publication, internationalization, and AOP integration. Every real Spring Boot app runs on an `ApplicationContext`; `BeanFactory` matters mainly as the interface it's built on.

### 14. What does `@ConditionalOnMissingBean` actually enable?

**Answer:** It makes an auto-configured bean only activate if no bean of that type already exists in the context. Defining your own `@Bean` of the same type is seen first, so the auto-configured version simply never activates — there's no conflict, because auto-configuration is designed to defer to an explicit application bean rather than compete with it.

### 15. Besides `@PostConstruct`/`@PreDestroy`, what else can hook into a bean's lifecycle?

**Answer:** A bean can implement `InitializingBean`/`DisposableBean` directly for identical timing without annotations, or a separately-registered `BeanPostProcessor` can inspect/wrap every bean in the context around its initialization — the actual mechanism Spring uses internally to attach proxies (like the ones behind `@Transactional`) to newly created beans.

## Revision Checklist

- [ ] Explain, using the `Car`/`Engine` example, why a class building its own dependency with `new` is a problem.
- [ ] Explain DI as "hand it in from outside" — and say out loud that this idea has nothing to do with Spring by itself.
- [ ] Explain IoC as "the container is in charge of creating objects, not you" — and that DI is the mechanism Spring uses to do that automatically.
- [ ] Draw the startup sequence and the HTTP request flow without looking at the notes.
- [ ] Explain when to use `@Bean` vs a stereotype annotation like `@Service`.
- [ ] Explain why a self-invocation call can silently bypass `@Transactional`/`@Async`/`@Cacheable`.
- [ ] Build a controller-service-repository slice from scratch, using a DTO for the response.
- [ ] Explain why Spring fails fast on a circular constructor dependency, and when (rarely) `@Lazy` is the right stopgap.
- [ ] Explain the `@AllArgsConstructor` → `NoSuchBeanDefinitionException` trap and why `@RequiredArgsConstructor` avoids it.
- [ ] Explain `BeanFactory` vs `ApplicationContext`, and name the actual `@Conditional*` annotations behind auto-configuration.
- [ ] Explain `InitializingBean`/`DisposableBean`/`BeanPostProcessor` as the interface-based alternative to `@PostConstruct`/`@PreDestroy`.
