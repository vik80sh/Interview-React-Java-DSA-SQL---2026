# Testing Java Backend Applications

Testing is a feedback system. The goal is confidence in behavior and fast diagnosis, not a percentage detached from risk. A useful test names a behavior, controls its inputs, and fails for a meaningful reason.

## 1. JUnit and AAA

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock UserRepository repository;
    @InjectMocks UserService service;

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

Arrange-Act-Assert separates setup, behavior, and proof. Use descriptive names, test one observable behavior, and use `assertAll` only when grouping independent facts helps diagnosis. Control time with an injected `Clock` rather than testing against the real system clock.

## 2. Mockito Without Brittle Tests

Mock collaborators at a boundary: repositories, message publishers, or external clients. Stub results that affect the behavior and verify interactions only when the interaction itself is a requirement, such as publishing an event exactly once. Excessive `verify` calls couple a test to implementation details and make harmless refactoring painful.

Use `ArgumentCaptor` to inspect an important outbound command. Prefer a fake for a small deterministic dependency when a mock would require many stubs. A unit test should not need Spring to construct the class under test.

## 3. Spring Test Slices

Choose the narrowest test that proves the behavior:

- `@WebMvcTest` loads MVC components and is appropriate for controller status codes, JSON, validation, and exception mapping. Use `MockMvc` and mock the service.
- `@DataJpaTest` loads JPA components and a test database. Use it for mappings, queries, constraints, and transaction behavior.
- `@SpringBootTest` loads the application context. Use it for wiring and cross-layer integration, not every unit test.
- Testcontainers runs a real database or dependency in a container and catches dialect differences that H2 can hide.

Example controller-slice test:

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @Autowired MockMvc mvc;
    @MockBean UserService service;

    @Test
    void getUser_returns404WhenMissing() throws Exception {
        when(service.findById(7L)).thenThrow(new UserNotFoundException(7L));

        mvc.perform(get("/api/v1/users/7"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status").value(404));
    }
}
```

Test validation failures, malformed JSON, authorization failures, and response shapes. A happy-path request alone does not test the API contract.

## 4. Integration Data and Security

Integration tests should control schema creation with migrations, isolate data between tests, and use the same database family as production when behavior is database-specific. `deleteAll()` may be slow and can hide foreign-key issues; transactional rollback or container lifecycle strategies may be better depending on the test.

With `spring-security-test`, test authorization explicitly:

```java
mvc.perform(get("/api/admin/users").with(user("alice").roles("USER")))
   .andExpect(status().isForbidden());

mvc.perform(get("/api/admin/users").with(user("root").roles("ADMIN")))
   .andExpect(status().isOk());
```

Also test that unauthenticated requests are rejected and that object ownership is enforced. For resource-server JWTs, use the library's JWT request post-processors or a real authorization-server integration test.

## 5. Test Strategy

The test pyramid is a heuristic, not a fixed 70/20/10 law. Keep many fast unit tests, enough slice and integration tests for framework boundaries, and a small number of end-to-end tests for critical journeys. Contract tests help independently deployed clients and services agree on request and response behavior.

Coverage identifies unexecuted code but cannot prove assertions are meaningful. Review mutation-test survivors, edge cases, failure paths, authorization, retries, timeouts, and data constraints. A lower percentage with strong behavior assertions is better than high coverage of getters and trivial lines.

## Interview Questions and Answers

### 1. Unit versus integration test?

**Answer:** A unit test isolates one unit and replaces collaborators, so it is fast and diagnoses business logic failures. An integration test verifies collaboration with real framework components or infrastructure, such as JPA, HTTP serialization, or a database.

### 2. `@WebMvcTest` versus `@SpringBootTest`?

**Answer:** `@WebMvcTest` loads the MVC slice and is focused and fast. `@SpringBootTest` loads the full application context and is useful for wiring and cross-layer behavior. It is not automatically a better unit test.

### 3. When should you mock?

**Answer:** Mock an external or independently tested collaborator when controlling its response isolates the behavior under test. Do not mock the class under test or replace simple value objects with mocks.

### 4. Is 100% coverage a good goal?

**Answer:** No. Coverage is a signal, not proof of quality. Risk, business impact, edge cases, and assertion strength matter more than exercising every trivial line.

### 5. Why use Testcontainers?

**Answer:** It tests against a real dependency and catches database dialect, indexing, constraint, and transaction differences that an in-memory substitute may miss.

### 6. How do you test validation?

**Answer:** Send invalid input through the controller boundary and assert the status and field-level error contract. Also test domain invariants in unit tests when they are not HTTP-specific.

### 7. How do you test security?

**Answer:** Test unauthenticated, authenticated-but-forbidden, and authorized cases, plus ownership or tenant isolation. Use Spring Security test support to construct identities without weakening production configuration.

### 8. Why can interaction tests be brittle?

**Answer:** They assert internal call sequences rather than observable behavior. Refactoring can fail them even when the contract remains correct. Verify interactions only when count or ordering is part of the requirement.

### 9. How do you test asynchronous code?

**Answer:** Inject a controllable executor or awaitility-style condition, assert completion and failure paths, and test timeout and cancellation behavior. Avoid arbitrary sleeps.

### 10. What makes a good test name?

**Answer:** It states the scenario and expected result, such as `createUser_whenEmailExists_returnsConflict`. The name should make a failure understandable without opening the test body.

## Revision Checklist

- [ ] Write unit tests with Arrange-Act-Assert and clear behavior names.
- [ ] Use Mockito at boundaries without over-verifying implementation.
- [ ] Choose between `@WebMvcTest`, `@DataJpaTest`, and `@SpringBootTest`.
- [ ] Test validation, errors, security, and database constraints.
- [ ] Explain why coverage and the pyramid are heuristics.
- [ ] Use real infrastructure tests where dialect or integration behavior matters.
