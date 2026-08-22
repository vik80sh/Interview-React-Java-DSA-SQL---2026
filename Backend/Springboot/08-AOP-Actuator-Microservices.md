# AOP, Actuator, and Microservice Communication (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. The Problem: The Same Few Lines, Copy-Pasted Into Every Method

Say you're building `OrderService`, `UserService`, and `PaymentService`, and your team lead asks for timing logs on the important methods so you can see what's slow in production:

```java
@Service
class OrderService {
    OrderResponse placeOrder(OrderRequest request) {
        long start = System.nanoTime();
        OrderResponse result = doPlaceOrder(request);
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;
        log.info("placeOrder took {} ms", elapsedMs);
        return result;
    }
    // ...
}

@Service
class UserService {
    UserResponse findById(Long id) {
        long start = System.nanoTime();
        UserResponse result = doFindById(id);
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;
        log.info("findById took {} ms", elapsedMs);
        return result;
    }
    // ...
}
```

This works, but look at what it costs:

1. **The timing code has nothing to do with placing an order or finding a user**, yet it's now welded into both methods, and every future method that needs it.
2. **It's duplicated everywhere.** Fifty methods across ten services means fifty copies of the same five lines. Change the log format once, and you're editing fifty places.
3. **It's easy to forget.** Nothing stops the next developer from writing a new method without the timing block, or copy-pasting it slightly wrong.

This kind of behavior — logging, timing, security checks, transaction handling — is called a **cross-cutting concern**: it cuts across many unrelated methods in many unrelated classes, instead of belonging to any one of them. Copy-pasting it everywhere is exactly the same mistake as `Car` building its own `Engine` in the fundamentals file: the logic that *should* live in one place is instead scattered through the codebase, and every scattered copy has to be kept in sync by hand.

## 2. The Fix: Attach the Behavior From Outside the Method

**AOP (Aspect-Oriented Programming)** is the fix for exactly this. Instead of writing the timing code inside `placeOrder` and inside `findById` and inside every other method that needs it, you write it *once*, and tell Spring which methods it should wrap around:

```java
@Aspect
@Component
class LoggingAspect {

    @Around("@annotation(com.example.Loggable)")
    Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.nanoTime();
        try {
            return joinPoint.proceed();   // actually runs the real method
        } finally {
            long elapsedMs = (System.nanoTime() - start) / 1_000_000;
            log.info("{} took {} ms", joinPoint.getSignature(), elapsedMs);
        }
    }
}
```

```java
@Service
class OrderService {
    @Loggable
    OrderResponse placeOrder(OrderRequest request) {
        return doPlaceOrder(request);   // no timing code in here at all anymore
    }
}
```

`placeOrder` goes back to only containing order logic. The timing behavior lives in exactly one class, and any method anywhere in the app gets it just by carrying `@Loggable`. This is the same relationship as DI in the fundamentals file: there, a class stopped building its own dependency and let something else supply it; here, a method stops containing its own cross-cutting behavior and lets something else wrap it in from outside.

### The vocabulary, mapped onto the example you just saw

Four terms cover this whole mechanism, and each one names a piece you already saw above:

- **Join point** — a point during execution where behavior *could* be attached. In Spring AOP this is almost always "a method call" — `placeOrder(...)` running is a join point.
- **Pointcut** — an expression that picks out *which* join points actually get the behavior. `@annotation(com.example.Loggable)` above is a pointcut: "any method carrying `@Loggable`." You could instead write `execution(* com.example.service.*.*(..))` to match every method in every class in the `service` package, regardless of annotations.
- **Advice** — the code that actually runs at a matched join point. `logExecutionTime` above is advice. There are five kinds: `@Before` (runs before the method), `@After` (runs after, regardless of outcome), `@AfterReturning` (after a successful return), `@AfterThrowing` (after an exception), and `@Around` — the only kind that wraps the *entire* call, which is why it's the only one that can change the return value, skip the real method entirely, or measure elapsed time the way the example does.
- **Aspect** — a class, marked `@Aspect`, that bundles one or more pointcut-plus-advice pairs together. `LoggingAspect` above is an aspect.

## 3. How Spring Actually Attaches This Behavior: Proxies

The natural next question is: how does Spring get code to run "around" `placeOrder` without you editing `OrderService` at all? The answer is the same mechanism behind `@Transactional`, `@Async`, and `@Cacheable`, and it's worth understanding concretely rather than as a buzzword.

At startup, when Spring sees a bean that has advice attached to it (either through `@Aspect` matching, or a built-in annotation like `@Transactional`), it doesn't hand out the real `OrderService` object. Instead it creates a **proxy** — a stand-in object of the same type, generated at startup (either a JDK dynamic proxy, if `OrderService` implements an interface, or a CGLIB-generated subclass if it doesn't) — and registers *that* as the bean everywhere in the app. Every other bean that gets an `OrderService` injected actually receives the proxy, not the original object.

```text
Caller -> proxy.placeOrder(request)
             |
             |-- advice runs (e.g. start the timer / begin the transaction)
             |-- proxy calls the REAL OrderService.placeOrder(request)
             |-- advice runs again (e.g. log elapsed time / commit or roll back)
             v
          result returned to caller
```

This explains a bug that trips up almost everyone at least once: **calling an advised method from inside the same bean skips the advice entirely.**

```java
@Service
class OrderService {
    @Transactional
    void placeOrder(OrderRequest request) { ... }

    void placeOrderAndNotify(OrderRequest request) {
        this.placeOrder(request);   // NOT transactional — no proxy involved here
        notify(request);
    }
}
```

`placeOrderAndNotify` calls `this.placeOrder(...)` directly on the real object — there's no proxy in the middle of a call from inside the same class to itself, so no transaction ever starts. Only a call that arrives from *outside* the bean — through the proxy Spring wired in everywhere else — actually triggers the advice. This is called **self-invocation**, and it's the single most common reason `@Transactional`, `@Async`, or `@Cacheable` "silently doesn't work": nothing throws an error, the annotation just quietly does nothing. The fix is to call the annotated method through a different bean, or to inject the bean's own proxy into itself and call through that.

## 4. Filter vs. Interceptor vs. AOP — Three Different "Wrap Around Something" Tools

Once you know AOP wraps behavior around a method call, an obvious question follows: Spring already has `Filter` and `HandlerInterceptor` for wrapping behavior around an HTTP request — so what's actually different, and when do you reach for which one?

The honest answer is that all three run code "before and after" something, but they sit at different layers and see different things:

| | Filter | Interceptor | AOP |
|---|---|---|---|
| Layer | Servlet container — runs before Spring MVC even sees the request | Spring MVC — runs around the controller method | Any Spring bean method (controller, service, repository, listener) |
| Sees | Raw `ServletRequest`/`ServletResponse` | The resolved `HandlerMethod`, model/view | Method arguments, return value, `ProceedingJoinPoint` |
| Needs Spring beans to work? | No — plain servlet spec | Yes | Yes |
| Typical use | Auth-token parsing, CORS, request logging, response compression | Logging with handler info, injecting common model attributes, quick pre-controller checks | Cross-cutting business logic: `@Transactional`, `@Async`, `@Cacheable`, custom logging/metrics on any bean method |

```java
// Filter — runs for every request, before Spring MVC
@Component
class RequestIdFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        MDC.put("requestId", UUID.randomUUID().toString());
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.clear();
        }
    }
}

// Interceptor — runs inside Spring MVC, around the controller call
@Component
class TimingInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        req.setAttribute("start", System.nanoTime());
        return true; // returning false here short-circuits the request
    }

    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res, Object handler, Exception ex) {
        long elapsed = System.nanoTime() - (long) req.getAttribute("start");
        log.info("{} took {} ns", req.getRequestURI(), elapsed);
    }
}

@Configuration
class WebConfig implements WebMvcConfigurer {
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new TimingInterceptor());
    }
}
```

For one request, the order is: **Filter → `DispatcherServlet` → Interceptor `preHandle` → controller (AOP advice fires here if the controller or a bean it calls is advised) → Interceptor `postHandle` → Interceptor `afterCompletion`**.

The decision rule follows directly from what each layer can see: use a Filter for anything that must run even for requests Spring MVC never routes to a controller at all (static resources, other servlets) — it doesn't need or know about Spring beans. Use an Interceptor when you need the resolved handler method but nothing DI-specific. Use AOP when the cross-cutting concern belongs on a *bean method* regardless of how it was reached — a scheduled job or a Kafka message listener (section 10) has no HTTP request at all, so a Filter and an Interceptor literally cannot see it; only AOP can wrap it.

## 5. The Problem: Is the App Actually Healthy Right Now?

Your `OrderService` and `PaymentService` are deployed and running. A completely different question now shows up: is the app actually *working*? Can it reach its database? Is it about to run out of disk space? If a load balancer or Kubernetes needs to decide whether to send traffic to this instance, or whether to kill and restart it, it needs an answer *right now*, from the running process itself — not from someone manually checking logs.

Writing this by hand for every check (database connectivity, disk space, downstream dependency reachability) across every service would mean repeating the same kind of boilerplate endpoint in every project. **Spring Boot Actuator** is a starter that gives you a set of ready-made operational endpoints instead:

```properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.health.show-details=when-authorized
```

- `/actuator/health` — an aggregated up/down status, built from every registered `HealthIndicator` bean (database, disk space, message broker, plus anything custom you add).
- `/actuator/info` — static build/version metadata.
- `/actuator/metrics` — counters, timers, and gauges, backed by a library called Micrometer.
- `/actuator/prometheus` — the same metrics, formatted for a monitoring tool called Prometheus to scrape.

The built-in checks won't know about your own dependencies, like a payment gateway your `PaymentService` calls. For that, you write your own `HealthIndicator`, and Actuator folds it into the same aggregated `/health` result automatically:

```java
@Component
class PaymentGatewayHealthIndicator implements HealthIndicator {
    private final PaymentClient client;

    @Override
    public Health health() {
        try {
            client.ping();
            return Health.up().build();
        } catch (Exception ex) {
            return Health.down(ex).withDetail("gateway", "unreachable").build();
        }
    }
}
```

One serious risk to know before shipping any of this: **never expose Actuator endpoints publicly and unauthenticated in production.** `/actuator/env` can dump configuration (including secrets), and `/actuator/heapdump` can leak raw memory contents. Restrict which endpoints are exposed per environment, put Actuator behind Spring Security with its own authorization rule, or serve it on a separate management port that isn't reachable from the public internet at all.

### The next problem: "healthy" isn't one question, it's two

A single `/health` endpoint that reports "up" or "down" sounds complete, but it actually conflates two very different questions that a container orchestrator like Kubernetes needs answered separately:

**Scenario:** your database has a 20-second blip — nothing wrong with your app process itself, just a downstream dependency being briefly unreachable. If your one `/health` check reports "down" for those 20 seconds, and Kubernetes reacts to "down" by killing and restarting every pod, you've just turned a 20-second database hiccup into a multi-minute outage while every instance restarts and reconnects.

The fix is splitting health into two separate probes:

```properties
management.endpoint.health.probes.enabled=true
management.health.livenessstate.enabled=true
management.health.readinessstate.enabled=true
```

- `/actuator/health/liveness` — "is this process still alive, or is it in a state only a restart can fix?" This should only fail for something genuinely broken internally, like a deadlock. If it fails, the orchestrator kills and restarts the instance.
- `/actuator/health/readiness` — "can this instance accept traffic right now?" This should fail while the app is still starting up, or when a critical downstream dependency (database, required config) is temporarily unavailable. If it fails, the load balancer simply stops sending traffic to this instance — the process itself keeps running and can recover on its own.

Wiring the database check into **liveness** instead of **readiness** is exactly the mistake in the scenario above: a temporary database blip gets "fixed" by killing and restarting every pod, when the actual fix — waiting for the database to come back — required no restart at all. Downstream-dependency checks belong under readiness; liveness should reflect only the process's own internal state.

## 6. The Problem: Your App Now Needs to Talk to Another Service

So far, `OrderService` has only talked to its own database. Now `OrderService` needs to fetch the buyer's details from a separate `user-service` over HTTP before it can finish placing an order. How do you actually make that call?

```java
// RestTemplate — blocking, synchronous, in maintenance mode since Spring 5
RestTemplate restTemplate = new RestTemplate();
User user = restTemplate.getForObject("/users/{id}", User.class, id);

// WebClient — non-blocking, reactive, the current recommended HTTP client
WebClient client = WebClient.create("http://user-service");
Mono<User> user = client.get()
    .uri("/users/{id}", id)
    .retrieve()
    .bodyToMono(User.class);

// WebClient used synchronously in a non-reactive app
User user = client.get().uri("/users/{id}", id)
    .retrieve().bodyToMono(User.class)
    .block(Duration.ofSeconds(2));

// Feign — declarative, interface-based
@FeignClient(name = "user-service", url = "${user-service.url}")
interface UserClient {
    @GetMapping("/users/{id}")
    User getUser(@PathVariable Long id);
}
```

`RestTemplate` is the oldest and simplest of the three: you call a method and it blocks the current thread until the response comes back. It's easy to read, but it's blocking, and it's effectively frozen — no new features are being added to it. `WebClient` is the current recommended client: non-blocking end-to-end in a reactive app, but it can also be used with `.block()` inside an ordinary (non-reactive) app, which reintroduces the same blocking-thread cost as `RestTemplate` and needs the same thread-budget thinking. `Feign` reads like a plain Java interface — you declare the method signature and the HTTP details are generated for you — which is convenient, but it also hides the fact that an HTTP call, with all its latency and failure modes, is happening underneath.

Whichever client you pick, **always set an explicit connect timeout and read timeout.** An HTTP call with no timeout at all means one slow downstream service can hang every thread waiting on it, and a slow dependency turns into an outage for your own service too.

## 7. The Problem: Hardcoded Addresses Don't Survive Scaling

In the example above, `user-service` had one fixed address. That's fine while there's exactly one instance of it. Real deployments scale instances up and down constantly — three instances of `user-service` at peak traffic, one at 3 a.m. — and a hardcoded URL has no way to know which instances currently exist or whether the one you hardcoded is even still running.

**Eureka** is Spring Cloud's service discovery piece, and it solves this the same way a phone book solves "I don't know anyone's number by heart": each `user-service` instance registers itself with a Eureka server on startup and keeps sending heartbeats to prove it's still alive. When `OrderService` needs to call `user-service`, it asks Eureka for the current list of healthy instances instead of using a fixed hostname, and a client-side load balancer picks one to actually call. Instances can come and go, and callers never need to know the specific addresses.

A second, related problem shows up once you have many services: each one needs configuration (database URLs, feature flags, timeouts), and copying the same shared settings into every service's own config file means updating a dozen files by hand every time a shared value changes. **Spring Cloud Config Server** solves this by keeping configuration in one Git-backed service; each application fetches its `application.yml` from Config Server at startup (and, if wired for it, can refresh it live) instead of carrying its own private copy of shared settings.

An interviewer asking about either of these is usually checking that you understand *why* they exist — dynamically changing instance counts, and configuration duplicated across dozens of services — rather than expecting deep configuration syntax.

## 8. The Problem: What Happens When `user-service` Is Slow or Down?

Service discovery solves "which address do I call." It doesn't solve a different problem: what does `OrderService` do when `user-service` is reachable but responding very slowly, or not responding at all?

**Scenario:** `user-service` starts timing out. Without any protection, every incoming order request from `OrderService` calls `user-service`, waits out the full timeout, and fails — and while it waits, it's holding a thread the whole time. Enough of these piling up and `OrderService` itself runs out of threads and goes down too, even though the actual problem was somewhere else entirely. One struggling dependency just took down a service that didn't even have a bug in it.

**Resilience4j** is the modern (Hystrix-successor) library that protects against exactly this, and it gives you the pattern as an annotation instead of something you'd otherwise have to hand-roll with your own state tracking:

```java
@CircuitBreaker(name = "userService", fallbackMethod = "fallbackUser")
@Retry(name = "userService")
@RateLimiter(name = "userService")
public User getUser(Long id) {
    return userClient.getUser(id);
}

private User fallbackUser(Long id, Throwable ex) {
    return User.unavailablePlaceholder(id);
}
```

```properties
resilience4j.circuitbreaker.instances.userService.failure-rate-threshold=50
resilience4j.circuitbreaker.instances.userService.wait-duration-in-open-state=10s
resilience4j.retry.instances.userService.max-attempts=3
resilience4j.retry.instances.userService.wait-duration=200ms
```

The **circuit breaker** tracks the failure rate of calls to `userService`. While failures stay under the threshold, it's **closed** — calls go through normally. Once too many calls fail, it flips **open** — for the configured wait duration, it stops even attempting the real call and immediately runs the fallback instead, which protects `OrderService` from wasting threads waiting on a dependency that's already known to be struggling. After that wait, it goes **half-open** and lets a small trial of real calls through to check whether `user-service` has recovered — closing again if they succeed, or reopening if they don't.

`@Retry` handles a different, narrower case: a single call that failed due to a brief blip, worth trying again a few times with a short wait between attempts. `@RateLimiter` caps how many calls are allowed through in a given window, protecting the *caller* from overwhelming a dependency that's already fragile.

The one requirement that's easy to get wrong: `fallbackUser` must return something the caller can safely treat as a real, if degraded, result — `User.unavailablePlaceholder(id)` clearly marks itself as a placeholder. Never have a fallback silently return a default or zero value that looks like a valid, successful answer — that turns a visible failure into a much harder-to-notice data-correctness bug somewhere downstream.

## 9. The Problem: Not Every Call Needs an Immediate Answer

Every example so far has been `OrderService` calling `user-service` and waiting for a reply before continuing. Some things genuinely don't need that. When an order is placed, `OrderService` needs to tell `billing-service` "an order happened" — but it doesn't need to sit there waiting for billing to finish before it can respond to the original caller. Waiting anyway means `OrderService`'s response time is now tied to how long billing takes, for no real reason.

Messaging solves this: `OrderService` publishes an event onto a queue or topic and moves on immediately; `billing-service` picks the event up whenever it's ready, completely decoupled in time from the moment the order was placed.

```java
// Producer
@Service
class OrderEventPublisher {
    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    void publish(OrderEvent event) {
        kafkaTemplate.send("orders", event.orderId().toString(), event);
    }
}

// Consumer
@Component
class OrderEventListener {
    @KafkaListener(topics = "orders", groupId = "billing-service")
    void onOrderEvent(OrderEvent event, Acknowledgment ack) {
        billingService.applyIdempotently(event); // must be safe to run more than once
        ack.acknowledge();
    }
}
```

```java
// RabbitMQ equivalent
@RabbitListener(queues = "orders.queue")
void onOrderEvent(OrderEvent event) {
    billingService.applyIdempotently(event);
}
```

There's a subtlety here that causes real production bugs if missed: both Kafka and RabbitMQ give Spring **at-least-once** delivery by default, not exactly-once. If `billing-service` crashes after processing an event but before acknowledging it, or a consumer-group rebalance happens at the wrong moment, the *same* event gets delivered again after restart. That's exactly why `billingService.applyIdempotently(...)` in the example above has to actually be idempotent — checking a processed-message-ID table, or relying on a natural unique constraint, before applying the event's effect — instead of assuming each message arrives exactly once. Assume redelivery will happen eventually, because it will.

One more Kafka-specific detail worth knowing: Kafka only guarantees ordering *within a single partition*, not across the whole topic. If every event for a given order must be processed in the order it happened (created, then paid, then shipped), those events need to share a partition key — typically the order ID — so they're routed to the same partition. Spread across partitions randomly, Kafka gives no guarantee they'll be *consumed* in the order they were *produced*.

## 10. Design Patterns Spring Uses Internally

A frequent one-liner interview question is "which design patterns does Spring use?" Having read through the sections above, most of these are patterns you've already seen in action, just not named as such at the time:

| Pattern | Where you already saw it |
|---|---|
| **Proxy** | Section 3 — the stand-in object Spring wraps around a bean to run AOP advice, `@Transactional`, `@Async`, `@Cacheable` |
| **Singleton** | The default bean scope from the fundamentals file — one shared instance per `ApplicationContext` |
| **Factory** | `BeanFactory`/`ApplicationContext` constructing and wiring every bean at startup |
| **Template Method** | `JdbcTemplate`, `RestTemplate` — a fixed overall workflow, with the varying step plugged in by you |
| **Builder** | `UriComponentsBuilder`, Lombok's `@Builder` on request/response objects |
| **Observer** | `ApplicationEventPublisher`/`@EventListener` — publishers and listeners decoupled from each other |

## Interview Questions and Answers

### 1. How does Spring implement `@Transactional` under the hood?

**Answer:** Through an AOP proxy. Spring wraps the bean in a proxy that starts a transaction before the annotated method runs and commits or rolls back after, based on the outcome. Because the proxy sits *around* the bean, calling the annotated method from outside the bean (through the proxy) triggers it; calling it via `this` from inside the same bean bypasses the proxy entirely, so nothing happens.

### 2. What is a join point, a pointcut, and advice?

**Answer:** A join point is a candidate point in execution — in Spring AOP, almost always a method call. A pointcut is an expression that selects which join points actually match, like `@annotation(Loggable)` or `execution(* com.example.service.*.*(..))`. Advice is the code that runs at a matched join point — `@Before`, `@After`, `@AfterReturning`, `@AfterThrowing`, or `@Around`, the last being the only one that can wrap, modify the return value of, or short-circuit the call.

**Follow-up:** What's an aspect? A class, marked `@Aspect`, that bundles one or more pointcut-and-advice pairs together.

### 3. Why does self-invocation break `@Async`/`@Transactional`?

**Answer:** Both are proxy-based. `this.method()` calls the real object directly, never passing through the Spring-generated proxy that would have started the transaction or submitted the async task. The fix is to call through another bean, or inject the bean's own proxy via `ApplicationContext`/self-injection.

### 4. Compare Filter, Interceptor, and AOP — when would you reach for each?

**Answer:** A Filter runs at the servlet layer before Spring MVC even sees the request, with no awareness of Spring beans — good for cross-cutting concerns like auth-header parsing or CORS that must apply to every request, including ones MVC never routes to a controller. An Interceptor runs inside Spring MVC, around the resolved controller method, with access to the handler — good for MVC-specific concerns like adding common model attributes. AOP wraps any Spring bean method regardless of how it was invoked, which is the only one of the three that can advise a scheduled job or a message listener that has no HTTP request at all.

### 5. What does the Actuator `/health` endpoint actually check?

**Answer:** It aggregates the status of every registered `HealthIndicator` bean — built-in ones for the database, disk space, and message brokers, plus any custom `HealthIndicator` you add for a downstream dependency like a payment gateway. The endpoint's overall status is the worst of the individual checks.

### 6. Why is exposing Actuator endpoints without authentication risky?

**Answer:** Endpoints like `/actuator/env`, `/actuator/heapdump`, or `/actuator/httptrace` can leak configuration secrets, memory contents, or recent request bodies. Expose only what's needed, and put Actuator behind authentication or a separate, network-restricted management port in production.

### 7. What is the difference between the Actuator liveness and readiness probes, and why does mixing them up cause outages?

**Answer:** Liveness asks "should this process be killed and restarted?" and should only fail for something a restart genuinely fixes, like deadlocked internal state. Readiness asks "can this instance accept traffic right now?" and should fail during startup or when a required downstream dependency is down, so the load balancer pauses traffic without killing the instance. Wiring a downstream dependency check into liveness means a brief database blip gets "fixed" by restarting every pod, which usually makes the outage worse and longer.

### 8. WebClient versus RestTemplate versus Feign — how do you choose?

**Answer:** `RestTemplate` is blocking and in maintenance mode — avoid it for new code. `WebClient` is the current, non-blocking client, usable in both reactive and traditional apps (with `.block()` in the latter, which reintroduces blocking-thread cost). `Feign` trades explicitness for a clean declarative interface; good for many simple internal calls, but you must still configure its timeouts explicitly because the interface hides the HTTP details.

### 9. Why do you need service discovery instead of hardcoded URLs?

**Answer:** In a scaled deployment, instance counts and addresses change constantly. A discovery service like Eureka lets callers ask for the current healthy instance list at call time instead of relying on a fixed, possibly stale, address — and the client-side load balancer spreads calls across instances.

### 10. What does Resilience4j's circuit breaker actually prevent?

**Answer:** It stops sending calls to a dependency that is already failing, avoiding wasted latency and further overload while the dependency recovers, and periodically lets a trial request through (half-open) to test recovery. It does not fix the underlying failure and must be paired with a meaningful, non-misleading fallback and with timeouts.

### 11. Is a `@FeignClient` call automatically resilient?

**Answer:** No. Feign only makes the call declarative; it does not add retries, circuit breaking, or bounded timeouts by itself. Those need explicit configuration — Resilience4j annotations, Feign's own timeout properties, or both.

### 12. Why must a `@KafkaListener` or `@RabbitListener` handler be idempotent?

**Answer:** Both give at-least-once delivery by default: if the consumer crashes after processing but before acknowledging, or a consumer-group rebalance happens, the same message is redelivered. A handler that isn't safe to run twice will double-apply that message's effect. The fix is to check a processed-message-ID table or rely on a natural unique constraint before applying the effect, not to assume delivery happens exactly once.

**Follow-up:** Does Kafka guarantee ordering across a whole topic? No — only within a single partition. Events that must stay in order relative to each other need to share a partition key, typically an entity ID like the order ID.

### 13. Name three design patterns visible in the Spring Framework itself.

**Answer:** Proxy (AOP-backed `@Transactional`/`@Async`), Singleton (default bean scope), and Template Method (`JdbcTemplate`/`RestTemplate` fixing the workflow while callback code supplies the varying step). Factory (`BeanFactory`) and Observer (`ApplicationEventPublisher`) are also solid answers.

## Revision Checklist

- [ ] Explain, using the timing-code-copy-pasted-everywhere scenario, what a cross-cutting concern is and why AOP fixes it.
- [ ] Define join point, pointcut, advice, and aspect, and map each one back onto the `LoggingAspect` example.
- [ ] Explain how a proxy sits "around" a bean, and why self-invocation bypasses it and silently breaks `@Transactional`/`@Async`/`@Cacheable`.
- [ ] Compare Filter, Interceptor, and AOP by layer, and know which one can advise a non-HTTP method like a scheduled job or a Kafka listener.
- [ ] Write a custom `HealthIndicator` and know which Actuator endpoints are risky to expose publicly.
- [ ] Explain the difference between liveness and readiness probes using the database-blip scenario, and why a downstream check belongs under readiness, not liveness.
- [ ] Compare RestTemplate, WebClient, and Feign, and always set explicit timeouts on outbound calls.
- [ ] Explain why service discovery (Eureka) and centralized config (Config Server) exist once instance counts scale dynamically.
- [ ] Walk through the circuit breaker's closed → open → half-open states using the "one slow dependency takes down a healthy service" scenario, and configure a real (non-misleading) fallback.
- [ ] Explain why `@KafkaListener`/`@RabbitListener` handlers must be idempotent, and why Kafka ordering only holds within a partition.
- [ ] Name the design patterns visible inside Spring itself (Proxy, Singleton, Factory, Template Method, Builder, Observer).
