# Testing Java Backend Applications (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. The Problem: Testing By Hand Doesn't Scale

Say you've built `UserService.findById(id)`. It should throw `UserNotFoundException` when the user doesn't exist. How do you check that it actually does?

The obvious first approach: start the app, open Postman, call `GET /api/v1/users/99`, look at the response. It works. You move on.

A week later you add a discount feature to `OrderService`. To be safe you should re-check `UserService` too — did anything you touched in a shared config break it? In practice, nobody actually goes back and manually re-clicks through every old scenario before every change. It's slow, it's tedious, and there's no record of which edge cases were ever actually checked. A bug that was "tested" by hand once, months ago, can quietly come back and nobody will notice until a real user hits it in production.

That's the real problem: manual testing doesn't scale, and it leaves no repeatable proof. The fix is to write the check once, as code, and let a machine run it every time, in seconds, for free, forever. A check like that is called a **test**. When it exercises one small piece of behavior in isolation from the rest of the app, it's specifically a **unit test**.

**JUnit 5** is the framework that runs these checks in a Java project and reports which passed and which failed. It's the thing that turns "did I remember to check this" into "the build fails if this breaks."

## 2. Structuring a Test: Arrange-Act-Assert

Here's a first attempt at a test for the scenario above, written without much structure:

```java
@Test
void test1() {
    UserRepository repository = mock(UserRepository.class);
    UserService service = new UserService(repository);
    when(repository.findById(99L)).thenReturn(Optional.empty());
    Exception thrown = null;
    try {
        service.findById(99L);
    } catch (Exception e) {
        thrown = e;
    }
    assertNotNull(thrown);
    assertTrue(thrown instanceof UserNotFoundException);
}
```

This works, but read it as someone who's never seen it before: `test1` says nothing about what's being checked. Setup, the actual call, and the check are all tangled into one block, and the manual `try`/`catch` to capture an exception is clumsy. If this test fails six months from now, the name and the body both give you almost nothing to go on.

**Arrange-Act-Assert (AAA)** is just a naming convention for the three things every test is already doing — arrange the inputs, act on the thing you're testing, assert on the result — made explicit instead of tangled together:

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    UserRepository repository;

    @InjectMocks
    UserService service;

    @Test
    void findById_whenUserDoesNotExist_throwsNotFound() {
        // Arrange
        when(repository.findById(99L)).thenReturn(Optional.empty());

        // Act and assert
        assertThatThrownBy(() -> service.findById(99L))
            .isInstanceOf(UserNotFoundException.class);
    }
}
```

Everything that changed makes the failure easier to diagnose, not just prettier:

- The test name, `findById_whenUserDoesNotExist_throwsNotFound`, states the scenario and the expected result. If it fails in a CI log, you know what broke without opening the file.
- `@ExtendWith(MockitoExtension.class)` tells JUnit to let Mockito process the annotations below. `@Mock` creates a fake `UserRepository` (more on why in section 3), and `@InjectMocks` builds a real `UserService` and hands it that fake — the exact "hand the dependency in from outside" pattern from file 01, just done by Mockito instead of Spring.
- `assertThatThrownBy` (from AssertJ, a fluent assertion library) reads as a sentence and replaces the manual `try`/`catch` entirely.

One more habit worth having early: if `UserService` has logic that depends on the current time — say, "an account is stale after 30 days of inactivity" — don't call `LocalDateTime.now()` directly inside it. Inject a `Clock` through the constructor instead, the same way you'd inject any other dependency, and hand the test a fixed `Clock` (`Clock.fixed(...)`). Otherwise the test is comparing against the real system clock, and a test that only fails once a year, near a date boundary, is one of the hardest kinds of bug to track down.

Use `assertAll` only when you're grouping several genuinely independent facts about one result — for example, checking three fields of a returned DTO in one go so all three failures show up together instead of stopping at the first one.

## 3. Mockito: Faking the Parts You Don't Want to Really Run

Look again at the test above. `UserService.findById` calls `repository.findById(...)`, and `UserRepository` really talks to a database. If the test used a real `UserRepository`, it would need a real database running, seeded with a user (or specifically *not* seeded with user 99), just to check one `if` branch inside `UserService`. That's slow, and it means "testing business logic" and "testing the database" become the same test — if the database connection is flaky, your business-logic test fails for a completely unrelated reason.

This is what `@Mock` from Mockito solves: it creates a fake `UserRepository` that does nothing on its own until you tell it what to return. `when(repository.findById(99L)).thenReturn(Optional.empty())` says "when this exact call happens, hand back this exact result" — no database, no network, just a controllable stand-in for one method call. That fake object is called a **mock**.

**Where to mock, and where not to.** Mock at a real boundary — a repository, a message publisher, an external HTTP client, anything slow or non-deterministic. Don't mock the class you're actually testing (`UserService` itself), and don't mock a simple value object that has no real behavior to fake.

**Stubbing versus verifying.** `when(...).thenReturn(...)` is called *stubbing* — you're just telling the mock what to say back so the code under test can keep running. `verify(...)` is a different move: it asserts that a specific call *happened*. Reach for `verify` only when the interaction itself is a requirement, not an implementation detail. For example, say `OrderService.placeOrder` is supposed to publish exactly one `OrderPlacedEvent` after saving the order:

```java
@Test
void placeOrder_publishesOrderPlacedEventExactlyOnce() {
    // Arrange
    Order order = new Order(1L, "user-42", BigDecimal.valueOf(59.99));
    when(orderRepository.save(any())).thenReturn(order);

    // Act
    orderService.placeOrder(order);

    // Assert
    verify(eventPublisher, times(1)).publish(any(OrderPlacedEvent.class));
}
```

"Exactly one event, exactly once" is a real requirement here — publishing it twice could double-charge a downstream billing listener. That's a legitimate use of `verify`.

Compare that to sprinkling `verify(repository).findById(99L)` into every single test just because the call happened. That doesn't check anything a well-written `assertThatThrownBy` on the *result* doesn't already prove, and it actively backfires later: if someone harmlessly refactors `UserService` to check a cache before calling the repository, this test now fails — not because the behavior is wrong, but because the test is coupled to *how* the method happens to be implemented today, not *what* it promises. This is the real reason interaction-heavy tests get called brittle: they assert internal call sequences instead of observable outcomes, so refactoring breaks them even when nothing user-visible changed.

**Capturing what was actually sent.** Sometimes the interaction you care about isn't just "was this called" but "was it called with the right data." `ArgumentCaptor` grabs the actual argument a mock received so you can assert on it directly:

```java
@Test
void placeOrder_publishesEventWithCorrectOrderId() {
    ArgumentCaptor<OrderPlacedEvent> captor = ArgumentCaptor.forClass(OrderPlacedEvent.class);

    orderService.placeOrder(new Order(1L, "user-42", BigDecimal.valueOf(59.99)));

    verify(eventPublisher).publish(captor.capture());
    assertThat(captor.getValue().orderId()).isEqualTo(1L);
}
```

**Mock versus fake.** A mock is generic and controlled entirely by `when(...)` calls written in the test. Sometimes a dependency is small and deterministic enough that writing ten `when` stubs is more effort than just writing a tiny real implementation — an in-memory `Map`-backed `UserRepository`, say. That's called a **fake**: real code, just not the production implementation. Prefer a fake over a mock when the stubbing would otherwise be extensive.

The test-design payoff of all this: a well-written unit test for `UserService` never needs Spring at all — no `@SpringBootTest`, no application context, just plain Java objects and Mockito. If a "unit" test needs Spring to even construct the class under test, that's usually a sign it's testing more than one unit.

## 4. Spring Test Slices: Testing a Layer Without Loading the Whole App

Section 3's tests never touched Spring. But at some point you need to check things Mockito alone can't tell you: does `UserController` actually return HTTP 404 with the right JSON body when the service throws `UserNotFoundException`? Does the `@Valid` validation on a request DTO actually reject bad input at the HTTP layer? Mocking `HttpServletRequest`/`HttpServletResponse` by hand to answer that would be painful and wouldn't prove anything about how Spring's actual request pipeline behaves.

The blunt-instrument fix is `@SpringBootTest` — start the *entire* application context, real beans, real wiring, and send a real request through it. That works, but it's slow: a full app with a database connection pool, security filters, and every bean in the project can take real seconds to boot, and if you write one of these for every controller and every repository, your test suite that should give fast feedback starts feeling like a mini deployment.

Spring's answer is a **test slice**: load only the beans one layer actually needs, and nothing else.

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    MockMvc mvc;

    @MockBean
    UserService service;

    @Test
    void getUser_returns404WhenMissing() throws Exception {
        when(service.findById(7L)).thenThrow(new UserNotFoundException(7L));

        mvc.perform(get("/api/v1/users/7"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status").value(404));
    }
}
```

`@WebMvcTest(UserController.class)` loads only the MVC machinery — `DispatcherServlet`, argument resolvers, the `@RestControllerAdvice` exception handler from file 02's error-handling section, JSON serialization — around this one controller. `@MockBean` puts a Mockito mock of `UserService` *into the Spring context* in place of the real bean, so the controller is wired exactly like production, but the service layer is fully controlled. `MockMvc` sends a fake HTTP request through the real Spring MVC pipeline without starting an actual server or opening a real socket.

This is the layer where you should test things a plain unit test can't reach: does a malformed JSON body come back as 400? Does an invalid field trigger the field-level validation error contract? Does the response actually serialize the shape you expect? A single happy-path 200 test tells you almost nothing about whether the *contract* is right — the interesting bugs live in the edge cases.

The same idea applies one layer down, for the database:

```java
@DataJpaTest
class UserRepositoryTest {

    @Autowired
    UserRepository repository;

    @Test
    void findByEmail_returnsUserWhenPresent() {
        repository.save(new User(null, "Ana", "ana@example.com"));

        Optional<User> found = repository.findByEmail("ana@example.com");

        assertThat(found).isPresent();
    }
}
```

`@DataJpaTest` loads just the JPA/persistence machinery and a test database, and by default wraps each test in a transaction that rolls back afterward — so tests don't leak data into each other just by running in the same class. Use this slice for entity mappings, custom query methods, and database-level constraints (like a unique index on `email`), which a mocked repository could never actually verify since the mock doesn't run any real query at all.

Putting all three together as a decision, not a rule to apply blindly:

| Need to test | Use | Why |
|---|---|---|
| Business logic in a service, in isolation | Plain unit test + Mockito (section 3) | Fastest, no framework needed at all |
| Controller status codes, JSON shape, validation | `@WebMvcTest` + `MockMvc` | Loads only MVC, mocks the service |
| Entity mappings, queries, constraints | `@DataJpaTest` | Loads only JPA, real (test) database |
| Multiple real layers wired together, or startup itself | `@SpringBootTest` | Loads the full context — slow, use sparingly |

The rule of thumb: reach for the narrowest slice that can actually prove the behavior. `@SpringBootTest` isn't "the more thorough version of a unit test" — it's a different kind of test, for a different kind of question (does the whole thing actually wire together), and it's the wrong tool if all you wanted to check was one `if` branch in a service.

## 5. Testing the Database Layer for Real: Testcontainers

`@DataJpaTest` by default runs against an in-memory database like H2, unless you configure it otherwise. That's fast, but it creates a real gap: H2 doesn't behave identically to whatever database actually runs in production. A query that relies on Postgres-specific JSON column behavior, a case-sensitivity rule, or a particular way a unique constraint reports its violation can pass against H2 and then fail — or worse, silently behave differently — against real Postgres in production. The test gave you a green checkmark that didn't actually prove what you thought it proved.

**Testcontainers** fixes this by starting a real instance of your actual production database — in a Docker container, just for the duration of the test run — instead of a lightweight substitute:

```java
@DataJpaTest
@Testcontainers
class UserRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    UserRepository repository;

    @Test
    void savingDuplicateEmail_violatesUniqueConstraint() {
        repository.save(new User(null, "Ana", "ana@example.com"));

        assertThatThrownBy(() -> repository.save(new User(null, "Ana2", "ana@example.com")))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
}
```

This is slower than plain `@DataJpaTest` against H2, which is exactly why it isn't the default for every repository test — reserve it for the tests where dialect-specific behavior is actually the point.

A few practical habits matter once you're testing against a real database across many tests:

- **Control schema with migrations** (Flyway or Liquibase), the same migrations production uses, rather than letting Hibernate auto-generate a schema that might not match reality.
- **Isolate data between tests.** `deleteAll()` between tests works but can be slow on a large table and can silently hide foreign-key ordering problems (deleting a `User` while an `Order` still references it). Transactional rollback (what `@DataJpaTest` does by default) is usually faster and cleaner when it's available; for tests that can't use a transaction (because the code under test manages its own), a fresh container or explicit cleanup ordering may be the better fit.
- **Match the database family to production** whenever the behavior under test is database-specific — there's no point catching a Postgres bug against MySQL.

## 6. Testing Security: Who's Actually Allowed to Do What

Say `UserController` has an admin-only endpoint: `GET /api/admin/users`, meant to list all users. If nobody adds an authorization check — or someone adds it and gets the role name wrong — a `@WebMvcTest` that only stubs the service and hits the endpoint would still return 200. The test suite goes green while a real security hole ships to production, because nothing in the test ever asked "should this caller actually be allowed to do this?"

`spring-security-test` exists specifically so you can construct a fake authenticated identity and check authorization rules directly, without weakening the real security configuration just to make the test runnable:

```java
mvc.perform(get("/api/admin/users").with(user("alice").roles("USER")))
   .andExpect(status().isForbidden());

mvc.perform(get("/api/admin/users").with(user("root").roles("ADMIN")))
   .andExpect(status().isOk());
```

`.with(user("alice").roles("USER"))` tells Spring Security "treat this request as if `alice`, with role `USER`, made it" — the real `@PreAuthorize`/security filter chain still runs, it's only the *identity* that's faked, not the authorization logic itself.

A thorough security test for any protected endpoint checks at least these cases, since each one is a genuinely different failure mode:

- **Unauthenticated** — no credentials at all should be rejected (401), not silently treated as some default user.
- **Authenticated but forbidden** — a real, valid user who simply isn't allowed to do this (403), which is exactly the `alice` case above.
- **Authenticated and authorized** — the actual happy path (the `root` case above).
- **Ownership** — a logged-in user hitting `GET /api/v1/orders/17` that belongs to a *different* user should be rejected even though they're a perfectly valid, authenticated user. Role checks alone don't catch this — you need a test that specifically uses one user's identity against another user's data.

For an API secured with **JWTs (JSON Web Tokens)** — the resource-server style setup where a token, not a session, proves identity — the same testing library provides JWT-specific request post-processors so you can simulate "a request carrying a valid JWT with these claims" without running a real token-issuing authorization server in every test. Reserve an actual end-to-end test against a real authorization server for a small number of critical login/token-refresh flows, not for every protected endpoint.

## 7. How Much Testing Is Enough? Strategy and Coverage

By now you have four different kinds of test in the toolbox: fast Mockito-based unit tests, `@WebMvcTest`/`@DataJpaTest` slices, Testcontainers-backed integration tests, and the occasional full `@SpringBootTest`. How many of each should a real project actually have?

**Scenario:** a team writes almost nothing but full end-to-end tests that spin up the whole app and a real database for every single scenario. Each one is thorough, but the whole suite takes 40 minutes to run, so nobody runs it locally before pushing, and CI feedback comes back long after the developer has moved on to something else. The opposite extreme — nothing but mocked unit tests — runs in seconds, but a real bug in how two layers actually talk to each other (a JPA mapping mistake, a JSON field name typo) can sail straight through, because no test ever exercised the real integration point.

The **test pyramid** is just a name for the balance that avoids both failure modes: many fast, cheap unit tests at the bottom for business logic; a moderate number of slice and integration tests for the framework boundaries (HTTP, database, security) that unit tests can't see; and a small number of slow, expensive end-to-end tests reserved for the handful of critical user journeys where you want proof the whole system actually works together. It's a heuristic for shaping a healthy suite, not a literal 70/20/10 ratio to hit.

For systems made of multiple independently deployed services, there's a related problem: `OrderService` and a separate `PaymentService` need to agree on what a request/response actually looks like, but you can't practically spin up every other team's service in your own test suite. A **contract test** checks your side against an agreed, versioned contract (often generated from real examples) instead of against the other service directly — catching a breaking change before it reaches a real integration environment.

**On coverage.** Code coverage — the percentage of lines actually executed while running the test suite — tells you which lines were *touched*, not whether anything meaningful was actually checked. This test technically achieves 100% line coverage of `getName()`:

```java
@Test
void getName_returnsTheName() {
    User user = new User(1L, "Ana", "ana@example.com");
    user.getName();   // called, but nothing is asserted about the result
}
```

It runs the line, and coverage tooling counts it as "tested" — but it proves nothing, since there's no assertion at all. Coverage is a signal for finding code nobody has exercised yet, not proof of correctness. Chasing 100% coverage tends to produce exactly this kind of vacuous test on trivial getters, while the actually risky code — edge cases, failure paths, authorization rules, retries, timeout handling, database constraints — is where real bugs hide, and where the strongest assertions actually belong. A lower coverage number backed by strong, meaningful assertions on the risky paths is a better outcome than a high number padded with tests like the one above. Mutation testing (deliberately breaking a line of production code and checking whether any test then fails) is one concrete way to find tests that run code without actually asserting anything about it.

## Interview Questions and Answers

### 1. What's the difference between a unit test and an integration test?

**Answer:** A unit test isolates one small piece of behavior and replaces its collaborators (usually with Mockito mocks), so it's fast and pinpoints exactly where business logic broke. An integration test lets real framework components or infrastructure participate — JPA against a real database, HTTP serialization through `MockMvc`, or an actual container via Testcontainers — so it can catch problems a mocked collaborator would hide.

### 2. Why write `findById_whenUserDoesNotExist_throwsNotFound` instead of `test1`?

**Answer:** A test name should state the scenario and the expected result so a failure is understandable from the test report alone, without opening the test body. `test1` gives a reader nothing to go on when it fails months later.

### 3. When should you reach for a mock, and when should you avoid one?

**Answer:** Mock a real boundary — a repository, an external client, a message publisher — when controlling its response isolates the behavior you actually want to test. Don't mock the class under test, and don't reach for a mock when a small, deterministic fake would need less setup and behave more like real code.

**Follow-up:** Why can heavy use of `verify()` make tests brittle? Because it asserts on *how* the code happens to call its collaborators today, not on the observable result. A harmless refactor that changes the call sequence without changing the outcome can break the test anyway. Reserve `verify()` for interactions that are themselves a real requirement, like "publish this event exactly once."

### 4. `@WebMvcTest` versus `@SpringBootTest` — what's actually different, and when do you use each?

**Answer:** `@WebMvcTest` loads only the MVC layer around one controller and mocks its service dependency, so it's fast and focused on HTTP-level behavior: status codes, JSON shape, validation. `@SpringBootTest` loads the entire application context and is for proving cross-layer wiring or startup behavior — it is not automatically a "more thorough unit test," and using it for every test makes the suite slow for no real benefit.

### 5. What does `@DataJpaTest` give you that a mocked repository never can?

**Answer:** It runs against a real (test) database, so it actually executes your queries, entity mappings, and constraints — a unique index violation, a custom `@Query`, a lazy-loading mapping mistake. A mocked `UserRepository` can never fail on any of those, because it never runs a real query at all.

### 6. Why reach for Testcontainers instead of relying on H2 for every database test?

**Answer:** H2 doesn't reproduce every dialect-specific behavior of a real production database — indexing behavior, constraint error types, JSON column handling. Testcontainers runs your actual database engine in a container, catching differences that would otherwise only surface in production. It's slower, so it's used for the tests where that dialect-specific behavior is genuinely the point, not for every repository test.

### 7. How do you actually test that an admin-only endpoint is protected?

**Answer:** Use `spring-security-test` to build a fake authenticated identity for a non-admin role and assert 403, build one for the admin role and assert 200, and separately assert that a completely unauthenticated request gets 401. Also test ownership — one authenticated user's request against another user's resource — since role checks alone don't catch that.

### 8. Is 100% code coverage a good target?

**Answer:** No. Coverage only reports which lines executed, not whether anything meaningful was asserted — a test can call a getter and touch 100% of its lines while proving nothing. Risk, edge cases, failure paths, and assertion strength matter more than the raw percentage; a lower number backed by strong assertions on risky code beats a padded high number.

### 9. What's a contract test, and why would a team use one?

**Answer:** It checks one service's request/response behavior against an agreed, versioned contract shared with the services that call it, instead of requiring every service to be spun up together to test integration directly. It catches a breaking change to the contract before it reaches a real multi-service environment.

### 10. How should `deleteAll()` between integration tests be treated?

**Answer:** As a reasonable but sometimes slow and fragile default — it can be slow on a large table and can surface or hide foreign-key ordering issues. Transactional rollback (the `@DataJpaTest` default) is often a faster and cleaner alternative when the code under test can run inside a test transaction; when it can't, explicit cleanup ordering or container lifecycle management may fit better.

### 11. Why should you inject a `Clock` instead of calling `LocalDateTime.now()` directly inside business logic?

**Answer:** Code that reads the system clock directly can't be tested deterministically — the test result depends on whatever moment it happens to run. Injecting a `Clock` lets a test hand in a fixed point in time, making time-based logic ("stale after 30 days") reproducible and removing an entire class of rare, date-boundary bugs from the test suite.

## Revision Checklist

- [ ] Explain why manual, click-through testing doesn't scale, using the "fixed a bug, forgot to retest" scenario.
- [ ] Write a test using Arrange-Act-Assert with a name that states the scenario and expected result.
- [ ] Explain what `@Mock` and `@InjectMocks` actually do, and why a good unit test needs no Spring context at all.
- [ ] Explain the difference between stubbing (`when...thenReturn`) and verifying (`verify`), and why over-verifying makes tests brittle.
- [ ] Use `ArgumentCaptor` to assert on the actual value passed to a mocked collaborator.
- [ ] Choose correctly between a plain unit test, `@WebMvcTest`, `@DataJpaTest`, and `@SpringBootTest` for a given question.
- [ ] Explain why Testcontainers exists when `@DataJpaTest` already runs against H2.
- [ ] Design a security test covering unauthenticated, forbidden, authorized, and ownership cases.
- [ ] Explain why 100% coverage doesn't prove correctness, using the vacuous-getter-test example.
- [ ] Explain the test pyramid as a balance between fast feedback and catching real integration bugs, not a fixed ratio.
- [ ] Explain why injecting a `Clock` avoids a whole class of flaky, time-dependent test failures.
