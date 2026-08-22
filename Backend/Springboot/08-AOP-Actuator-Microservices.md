# AOP, Actuator, and Microservice Communication

These are the Spring-specific mechanics an interviewer expects on top of core Spring Boot: how cross-cutting behavior like `@Transactional` is actually implemented (AOP, and how it differs from a Filter or an Interceptor), how a running instance exposes its own health for humans and for Kubernetes (Actuator, liveness vs readiness), how one service calls another synchronously (RestTemplate/WebClient/Feign) or asynchronously (Kafka/RabbitMQ), and how it survives that other service being slow or down (Resilience4j).

## 1. AOP — What Actually Powers `@Transactional`, `@Async`, and `@Cacheable`

Aspect-Oriented Programming lets you attach behavior to method calls without editing the methods themselves — a cross-cutting concern like logging, security, or transactions. Spring implements AOP with **proxies**: at startup, Spring wraps a bean in a dynamic proxy (JDK interface proxy or a CGLIB subclass) that runs advice before or after the real method.

```java
@Aspect
@Component
class LoggingAspect {

    @Around("@annotation(com.example.Loggable)")
    Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.nanoTime();
        try {
            return joinPoint.proceed();
        } finally {
            long elapsedMs = (System.nanoTime() - start) / 1_000_000;
            log.info("{} took {} ms", joinPoint.getSignature(), elapsedMs);
        }
    }
}
```

Key vocabulary:

- **Join point** — a point during execution, in Spring AOP almost always a method call.
- **Pointcut** — an expression selecting which join points match, e.g. `execution(* com.example.service.*.*(..))` or `@annotation(Loggable)`.
- **Advice** — the code that runs: `@Before`, `@After`, `@AfterReturning`, `@AfterThrowing`, or `@Around` (the only one that can change the return value, short-circuit, or measure elapsed time).
- **Aspect** — a class bundling pointcuts and advice.

This is the exact mechanism behind `@Transactional`, `@Async`, `@Cacheable`, and `@PreAuthorize`, which is why **self-invocation bypasses all of them**: calling `this.save()` from inside the same bean never goes through the proxy, so no advice runs. Only calls that arrive from *outside* the bean — through the proxy Spring injected everywhere else — trigger the aspect.

## 2. Filter vs Interceptor vs AOP

Interviewers like asking for all three together because each one runs code "around" something, but they sit at different layers and see different things:

| | Filter | Interceptor | AOP |
|---|---|---|---|
| Layer | Servlet container — runs before Spring MVC even sees the request | Spring MVC — runs around the controller method | Any Spring bean method (controller, service, repository, listener) |
| Sees | Raw `ServletRequest`/`ServletResponse` | The resolved `HandlerMethod`, model/view | Method arguments, return value, `ProceedingJoinPoint` |
| Aware of Spring beans? | No — plain servlet spec, no DI awareness required | Yes | Yes |
| Typical use | Auth token/JWT parsing, CORS, request logging, response compression | Logging with handler info, injecting common model attributes, quick pre-controller checks | Cross-cutting business logic: `@Transactional`, `@Async`, `@Cacheable`, custom logging/metrics on any bean method |

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

Order for one request: **Filter → `DispatcherServlet` → Interceptor `preHandle` → controller (AOP advice fires here if the controller or a bean it calls is advised) → Interceptor `postHandle` → Interceptor `afterCompletion`**. Use a Filter for anything that must run even for requests Spring MVC never routes to a controller (static resources, other servlets). Use an Interceptor when you need the resolved handler method but nothing DI-specific. Use AOP when the cross-cutting concern belongs on a *bean method* regardless of how it was reached — a scheduled job or a message listener has no HTTP request at all, so only AOP (not a Filter or Interceptor) can wrap it.

## 3. Spring Boot Actuator

Actuator exposes operational endpoints without you writing them by hand:

```properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.health.show-details=when-authorized
```

- `/actuator/health` — up/down status, aggregated from `HealthIndicator` beans (database, disk space, custom checks).
- `/actuator/info` — static build/version metadata.
- `/actuator/metrics` — counters, timers, gauges, backed by Micrometer.
- `/actuator/prometheus` — metrics in a format Prometheus can scrape.

A custom health check:

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

Never expose Actuator endpoints publicly and unauthenticated in production — `/actuator/env` or `/actuator/heapdump` can leak secrets or memory contents. Restrict exposure by profile, put Actuator behind Spring Security with its own authorization rule, or serve it on a separate management port.

### Liveness versus readiness

Kubernetes-style deployments split health into two separate probes instead of one blanket `/health`:

```properties
management.endpoint.health.probes.enabled=true
management.health.livenessstate.enabled=true
management.health.readinessstate.enabled=true
```

- `/actuator/health/liveness` — "is this process still alive, or should it be killed and restarted?" Should only fail for something a restart actually fixes, such as internal deadlocked state.
- `/actuator/health/readiness` — "can this instance currently accept traffic?" Should fail while the app is still starting up, or when a critical downstream dependency (database, required config) is unavailable — that tells the load balancer to stop sending it requests without killing the instance.

Wiring the database health check into **liveness** is a classic misconfiguration: a temporary database blip then causes Kubernetes to kill and restart every pod instead of just pausing traffic to them, which usually turns a brief outage into a much longer one. Downstream-dependency checks belong under readiness; liveness should reflect only the process's own internal health.

## 4. Calling Another Service: RestTemplate, WebClient, and Feign

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

`RestTemplate` is simple but blocking and effectively frozen for new features. `WebClient` is non-blocking end-to-end in a reactive stack, and can also be used with `.block()` in a traditional servlet app (which reintroduces blocking, so it needs the same thread-budget thinking as any blocking call). `Feign` reads like a plain interface and hides the HTTP plumbing, which is convenient but can hide latency and failure modes from the caller if you're not deliberate about timeouts. Whichever client you pick, always set an explicit connect and read timeout — an unbounded call to a downstream service is an outage waiting to happen.

## 5. Service Discovery and Centralized Configuration

In a fixed two-service setup you can hardcode a URL. Once instances scale up and down dynamically, hardcoded addresses stop working, and two Spring Cloud pieces solve that:

- **Eureka (service discovery)** — each instance registers itself with a Eureka server on startup and sends heartbeats; callers ask Eureka for the current list of healthy instances instead of using a fixed hostname. A client-side load balancer picks one.
- **Spring Cloud Config Server** — configuration lives in one Git-backed service; each application fetches its `application.yml` from Config Server at startup (and optionally refreshes it live), instead of each service carrying its own copy of shared settings.

An interviewer is usually checking that you know *why* these exist (dynamic instance counts, avoiding config duplicated across dozens of services) rather than deep configuration syntax.

## 6. Resilience4j — the Spring-Native Version of Circuit Breakers and Retries

Resilience4j is the modern (Hystrix-successor) resilience library for Spring Boot. It provides the same conceptual patterns as the generic ones in the reliability guide, wired in with annotations:

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

The circuit breaker moves through closed → open → half-open exactly as described generically elsewhere in this folder; Resilience4j just gives you the Spring Boot starter, metrics integration, and annotation-driven wiring instead of hand-rolled state tracking. A fallback method must return something the caller can safely treat as a real (if degraded) result — never silently return default/zero values that look like a valid answer.

## 7. Messaging with Spring: `@KafkaListener` and `@RabbitListener`

The outbox and dead-letter-queue *patterns* are covered generically in the reliability guide; here is what producing and consuming actually look like wired into Spring.

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

Both Kafka and RabbitMQ give Spring **at-least-once** delivery by default: a consumer that crashes after processing but before acknowledging sees the same message again after a restart or a consumer-group rebalance. That is exactly why `billingService.applyIdempotently(...)` above must actually be idempotent — check a processed-message-ID table, or rely on a natural unique constraint — instead of assuming a message arrives exactly once. Kafka additionally guarantees ordering only *within a single partition*, so events that must stay in order (e.g. every event for one order) need to share a partition key, typically the order ID, not be spread randomly across partitions.

## 8. Design Patterns Spring Uses Internally

A frequent one-liner interview question: "which design patterns does Spring use?" Quick, concrete answers:

| Pattern | Where |
|---|---|
| **Proxy** | AOP-backed features: `@Transactional`, `@Async`, `@Cacheable`, `@PreAuthorize` (Section 1 above) |
| **Singleton** | Default bean scope — one instance per `ApplicationContext` |
| **Factory** | `BeanFactory` / `ApplicationContext` construct and wire beans |
| **Template Method** | `JdbcTemplate`, `RestTemplate` — fixed workflow, plug in the varying step |
| **Builder** | `UriComponentsBuilder`, Lombok's `@Builder` on request/response objects |
| **Observer** | `ApplicationEventPublisher` / `@EventListener` |

## Interview Questions and Answers

### 1. How does Spring implement `@Transactional` under the hood?

**Answer:** Through AOP proxies. Spring wraps the bean in a proxy that starts a transaction before the method runs and commits or rolls back after, based on the outcome. Because the proxy sits *around* the bean, calling the annotated method from outside the bean (through the proxy) triggers it; calling it from `this` inside the same bean bypasses the proxy entirely.

### 2. What is a pointcut versus advice versus a join point?

**Answer:** A join point is a candidate point in execution (a method call, in Spring AOP). A pointcut is an expression that selects which join points match. Advice is the actual code that runs at a matched join point — `@Before`, `@After`, or `@Around`, the last being the only kind that can wrap, modify, or short-circuit the call.

### 3. Why does self-invocation break `@Async`/`@Transactional`?

**Answer:** Both are proxy-based. `this.method()` calls the real object directly, never passing through the Spring-generated proxy that would have started the transaction or submitted the async task. The fix is to call through another bean, or inject the bean's own proxy via `ApplicationContext`/self-injection.

### 4. What does the Actuator `/health` endpoint actually check?

**Answer:** It aggregates the status of every registered `HealthIndicator` bean — built-in ones for the database, disk space, and message brokers, plus any custom `HealthIndicator` you add for downstream dependencies. The endpoint's overall status is the worst of the individual checks.

### 5. Why is exposing Actuator endpoints without authentication risky?

**Answer:** Endpoints like `/actuator/env`, `/actuator/heapdump`, or `/actuator/httptrace` can leak configuration secrets, memory contents, or recent request bodies. Expose only what's needed, and put Actuator behind authentication or a separate, network-restricted management port in production.

### 6. WebClient versus RestTemplate versus Feign — how do you choose?

**Answer:** `RestTemplate` is blocking and in maintenance mode — avoid it for new code. `WebClient` is the current, non-blocking client, usable in both reactive and traditional apps (with `.block()` in the latter, which reintroduces blocking-thread cost). `Feign` trades explicitness for a clean declarative interface; good for many simple internal calls, but you must still configure its timeouts explicitly because the interface hides the HTTP details.

### 7. Why do you need service discovery instead of hardcoded URLs?

**Answer:** In a scaled deployment, instance counts and addresses change constantly. A discovery service like Eureka lets callers ask for the current healthy instance list at call time instead of relying on a fixed, possibly stale, address — and the client-side load balancer spreads calls across instances.

### 8. What does Resilience4j's circuit breaker actually prevent?

**Answer:** It stops sending calls to a dependency that is already failing, avoiding wasted latency and further overload while the dependency recovers, and periodically lets a trial request through (half-open) to test recovery. It does not fix the underlying failure and must be paired with a meaningful, non-misleading fallback and with timeouts.

### 9. Is a `@FeignClient` call automatically resilient?

**Answer:** No. Feign only makes the call declarative; it does not add retries, circuit breaking, or bounded timeouts by itself. Those need explicit configuration — Resilience4j annotations, Feign's own timeout properties, or both.

### 10. Name three design patterns visible in the Spring Framework itself.

**Answer:** Proxy (AOP-backed `@Transactional`/`@Async`), Singleton (default bean scope), and Template Method (`JdbcTemplate`/`RestTemplate` fixing the workflow while callback code supplies the varying step). Factory (`BeanFactory`) and Observer (`ApplicationEventPublisher`) are also solid answers.

### 11. Compare Filter, Interceptor, and AOP — when would you reach for each?

**Answer:** A Filter runs at the servlet layer before Spring MVC even sees the request, with no awareness of Spring beans — good for cross-cutting concerns like auth-header parsing or CORS that must apply to every request, including ones MVC never routes. An Interceptor runs inside Spring MVC, around the resolved controller method, with access to the handler — good for MVC-specific concerns like adding common model attributes. AOP wraps any Spring bean method regardless of how it was invoked, which is the only one of the three that can advise a scheduled job or a message listener that has no HTTP request at all.

### 12. What is the difference between the Actuator liveness and readiness probes, and why does mixing them up cause outages?

**Answer:** Liveness asks "should this process be killed and restarted?" and should only fail for something a restart genuinely fixes, like deadlocked internal state. Readiness asks "can this instance accept traffic right now?" and should fail during startup or when a required downstream dependency is down, so the load balancer pauses traffic without killing the instance. Wiring a downstream dependency check into liveness means a brief database blip gets "fixed" by restarting every pod, which usually makes the outage worse and longer.

### 13. Why must a `@KafkaListener` or `@RabbitListener` handler be idempotent?

**Answer:** Both give at-least-once delivery by default: if the consumer crashes after processing but before acknowledging, or a consumer-group rebalance happens, the same message is redelivered. A handler that isn't safe to run twice will double-apply that message's effect. The fix is to check a processed-message-ID table or rely on a natural unique constraint before applying the effect, not to assume delivery happens exactly once.

## Revision Checklist

- [ ] Explain join point, pointcut, and advice, and why self-invocation breaks proxy-based annotations.
- [ ] Compare Filter, Interceptor, and AOP by layer, and know which one can advise a non-HTTP method like a scheduled job.
- [ ] Write a custom `HealthIndicator` and know which Actuator endpoints are risky to expose publicly.
- [ ] Explain the difference between liveness and readiness probes, and why a downstream check belongs under readiness, not liveness.
- [ ] Compare RestTemplate, WebClient, and Feign, and always set explicit timeouts on outbound calls.
- [ ] Explain why service discovery and centralized config exist once instance counts scale dynamically.
- [ ] Configure a Resilience4j circuit breaker with a real fallback, not a silently-wrong default.
- [ ] Explain why `@KafkaListener`/`@RabbitListener` handlers must be idempotent, and why Kafka ordering only holds within a partition.
- [ ] Name the design patterns visible inside Spring itself (Proxy, Singleton, Factory, Template Method).
