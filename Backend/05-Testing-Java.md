# Testing Java - JUnit, Mockito, Integration Tests
## Complete Testing Guide for Backend

---

## TABLE OF CONTENTS
1. JUnit Basics & Annotations
2. Mockito Mocking Framework
3. Integration Testing with Spring
4. Test Organization & Best Practices
5. Common Interview Questions

---

# PART 1: JUNIT BASICS

## JUnit Setup & Annotations

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

```java
@SpringBootTest // For integration tests
class UserServiceTest {
    
    @Test // Mark as test method
    void testGetUserById() {
        // Arrange
        // Act
        // Assert
    }
    
    @BeforeEach // Runs before each test
    void setUp() {
        // Initialize test data
    }
    
    @AfterEach // Runs after each test
    void tearDown() {
        // Cleanup
    }
    
    @BeforeAll // Runs once before all tests
    static void setupAll() {
        // One-time setup
    }
    
    @DisplayName("Should get user by valid ID")
    @Test
    void shouldGetUserByValidId() { }
    
    @Disabled("Not implemented yet")
    @Test
    void incompleteTest() { }
}
```

---

## Assertions

```java
@Test
void testUserCreation() {
    User user = new User("John", "john@example.com");
    
    // Equality
    assertEquals("John", user.getName());
    assertEquals(1L, user.getId());
    
    // Null checks
    assertNull(user.getDeletedAt());
    assertNotNull(user.getCreatedAt());
    
    // Boolean
    assertTrue(user.isActive());
    assertFalse(user.isDeleted());
    
    // Collections
    List<String> roles = user.getRoles();
    assertFalse(roles.isEmpty());
    assertTrue(roles.contains("USER"));
    
    // Exceptions
    assertThrows(IllegalArgumentException.class, () -> {
        new User("", "email@example.com");
    });
    
    // All conditions (fails on first false)
    assertAll("User validation",
        () -> assertEquals("John", user.getName()),
        () -> assertNotNull(user.getId()),
        () -> assertTrue(user.isActive())
    );
}
```

---

# PART 2: MOCKITO MOCKING

## Basic Mocking

```java
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository; // Mock dependency
    
    @InjectMocks
    private UserService userService; // Inject mocks into service
    
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this); // Initialize mocks
    }
    
    @Test
    void testGetUserById() {
        // Arrange
        User mockUser = new User(1L, "John", "john@example.com");
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
        
        // Act
        User result = userService.getUserById(1L);
        
        // Assert
        assertEquals("John", result.getName());
        verify(userRepository).findById(1L); // Verify method was called
    }
    
    @Test
    void testGetUserNotFound() {
        // Arrange
        when(userRepository.findById(999L)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(UserNotFoundException.class, () -> {
            userService.getUserById(999L);
        });
    }
    
    @Test
    void testCreateUser() {
        // Arrange
        User newUser = new User("Jane", "jane@example.com");
        User savedUser = new User(2L, "Jane", "jane@example.com");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        
        // Act
        User result = userService.createUser(newUser);
        
        // Assert
        assertEquals(2L, result.getId());
        verify(userRepository).save(any(User.class));
    }
}
```

---

## Advanced Mocking

```java
@Test
void testCreateUserMultipleTimes() {
    User mockUser = new User(1L, "John", "john@example.com");
    
    // Return different values on successive calls
    when(userRepository.save(any())).thenReturn(mockUser)
                                     .thenThrow(new RuntimeException("DB error"))
                                     .thenReturn(mockUser);
    
    User result1 = userService.createUser(new User());
    assertEquals(1L, result1.getId());
    
    assertThrows(RuntimeException.class, () -> userService.createUser(new User()));
    
    User result2 = userService.createUser(new User());
    assertEquals(1L, result2.getId());
}

@Test
void testVerifyMethodCalls() {
    User mockUser = new User(1L, "John", "john@example.com");
    when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
    
    userService.getUserById(1L);
    userService.getUserById(1L);
    
    // Verify called exactly twice
    verify(userRepository, times(2)).findById(1L);
    
    // Verify never called
    verify(userRepository, never()).save(any());
    
    // Verify called at least once
    verify(userRepository, atLeastOnce()).findById(1L);
}

@Test
void testCaptureArguments() {
    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    
    User newUser = new User("John", "john@example.com");
    when(userRepository.save(any())).thenReturn(newUser);
    
    userService.createUser(newUser);
    
    verify(userRepository).save(captor.capture());
    User capturedUser = captor.getValue();
    assertEquals("John", capturedUser.getName());
}
```

---

# PART 3: INTEGRATION TESTING

## Full Spring Context Test

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserControllerIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate; // Real HTTP calls
    
    @Autowired
    private UserRepository userRepository;
    
    @BeforeEach
    void setUp() {
        userRepository.deleteAll(); // Clean database
    }
    
    @Test
    void testCreateUserEndpoint() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest("John", "john@example.com");
        
        // Act
        ResponseEntity<User> response = restTemplate.postForEntity(
            "/api/users",
            request,
            User.class
        );
        
        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals("john@example.com", response.getBody().getEmail());
        
        // Verify in database
        User savedUser = userRepository.findByEmail("john@example.com").get();
        assertEquals("John", savedUser.getName());
    }
    
    @Test
    void testGetUserEndpoint() {
        // Arrange
        User user = userRepository.save(new User("Jane", "jane@example.com"));
        
        // Act
        ResponseEntity<User> response = restTemplate.getForEntity(
            "/api/users/" + user.getId(),
            User.class
        );
        
        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("jane@example.com", response.getBody().getEmail());
    }
    
    @Test
    void testGetUserNotFound() {
        // Act
        ResponseEntity<ErrorResponse> response = restTemplate.getForEntity(
            "/api/users/999",
            ErrorResponse.class
        );
        
        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
```

---

## Unit Test (No Spring Context)

```java
@ExtendWith(MockitoExtension.class)
class UserServiceUnitTest {
    
    @Mock
    private UserRepository userRepository;
    
    @InjectMocks
    private UserService userService; // No Spring needed
    
    @Test
    void testGetUserById() {
        // Arrange
        User mockUser = new User(1L, "John", "john@example.com");
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
        
        // Act
        User result = userService.getUserById(1L);
        
        // Assert
        assertEquals("John", result.getName());
    }
}

// UNIT vs INTEGRATION:
// UNIT: Fast, isolated, mocks dependencies
// INTEGRATION: Slow, tests real database/HTTP, full context
//
// Use UNIT for: Business logic, calculations, algorithms
// Use INTEGRATION for: Database operations, API endpoints, transactions
```

---

# PART 4: TEST BEST PRACTICES

## Arrange-Act-Assert Pattern

```java
@Test
void testGetUserById() {
    // ARRANGE - Set up test data
    User expectedUser = new User(1L, "John", "john@example.com");
    when(userRepository.findById(1L)).thenReturn(Optional.of(expectedUser));
    
    // ACT - Execute the code being tested
    User result = userService.getUserById(1L);
    
    // ASSERT - Verify the result
    assertEquals(expectedUser, result);
}
```

---

## Test Naming & Organization

```java
// ✅ GOOD: Clear, descriptive names
@Test
void testGetUserByIdWithValidId_ShouldReturnUser() { }

@Test
void testGetUserByIdWithInvalidId_ShouldThrowException() { }

@Test
void testCreateUserWithValidData_ShouldSaveAndReturnUser() { }

// ❌ BAD: Unclear names
@Test
void test1() { }

@Test
void testUser() { }

@Test
void testCreateUser() { } // Which scenario?

// ORGANIZE BY LAYER:
// src/test/java/com/example/
//   ├── controller/  (integration tests)
//   ├── service/     (unit tests)
//   ├── repository/  (integration tests)
//   └── util/        (unit tests)
```

---

## Test Fixtures & Builders

```java
// TestFixtures.java
public class TestFixtures {
    public static User createUser(String name, String email) {
        return new User(1L, name, email);
    }
    
    public static User createAdminUser() {
        User user = new User(1L, "Admin", "admin@example.com");
        user.setRole(Role.ADMIN);
        return user;
    }
}

// Usage in tests:
@Test
void testGetUserById() {
    User mockUser = TestFixtures.createUser("John", "john@example.com");
    when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
    
    User result = userService.getUserById(1L);
    assertEquals("John", result.getName());
}

// Or use Builder Pattern:
@Test
void testGetUserById() {
    User mockUser = new UserBuilder()
        .withId(1L)
        .withName("John")
        .withEmail("john@example.com")
        .build();
    
    when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
    
    User result = userService.getUserById(1L);
    assertEquals("John", result.getName());
}
```

---

## Parameterized Tests

```java
@ParameterizedTest
@ValueSource(strings = { "john@example.com", "jane@example.com", "admin@example.com" })
void testValidEmails(String email) {
    assertTrue(isValidEmail(email));
}

@ParameterizedTest
@CsvSource({
    "john, john@example.com, true",
    "jane, jane@example.com, true",
    "admin, admin@example.com, true"
})
void testCreateUser(String name, String email, boolean expectedActive) {
    User user = new User(name, email);
    assertEquals(expectedActive, user.isActive());
}

// ✅ Benefits: Test multiple scenarios with less code
```

---

# PART 5: INTERVIEW QUESTIONS

## Question 1: Unit tests vs Integration tests

**Answer:**
```
UNIT TESTS:
- Test single component in isolation
- Mock all dependencies
- Fast (< 100ms each)
- Use Mockito, JUnit
- 70% of tests should be unit tests

INTEGRATION TESTS:
- Test multiple components together
- Use real database/HTTP
- Slower (> 1s each)
- Use @SpringBootTest
- 20% of tests should be integration tests

E2E TESTS:
- Test entire application end-to-end
- Real servers, real database
- Slowest (> 10s each)
- Use Selenium, Cypress
- 10% of tests should be E2E

Pyramid:
    △
   ╱│╲ E2E (10%)
  ╱ │ ╲
 ╱──┼──╲ Integration (20%)
╱   │   ╲
────┼──── Unit (70%)
```

---

## Question 2: How to test Spring Security?

**Answer:**
```
@SpringBootTest
class SecurityTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void testPublicEndpointNoAuth() {
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/api/public",
            String.class
        );
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }
    
    @Test
    void testProtectedEndpointNoAuth() {
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/api/users",
            String.class
        );
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }
    
    @Test
    void testProtectedEndpointWithAuth() {
        TestRestTemplate authenticatedClient = restTemplate.withBasicAuth("user", "password");
        ResponseEntity<String> response = authenticatedClient.getForEntity(
            "/api/users",
            String.class
        );
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }
}
```

---

## Question 3: How much to test?

**Answer:**
```
CODE COVERAGE TARGETS:
- Overall: 70-80% (not 100%)
- Business logic: 90%+
- Controllers: 80%+
- Getters/setters: Skip (trivial)

What NOT to test:
- Trivial getters/setters
- Framework code (Spring handles)
- Third-party library code
- Generated code

What TO test:
- Business logic
- Edge cases
- Error handling
- Validations
- Integrations

Coverage metric: Good for tracking, not a goal!
Better to have 60% good tests than 100% bad tests.
```

---

# SUMMARY: Testing Mastery

✅ **JUnit:**
- [ ] Know @Test, @BeforeEach, @AfterEach
- [ ] Know assertEquals, assertTrue, assertThrows
- [ ] Know @DisplayName

✅ **Mockito:**
- [ ] Know @Mock, @InjectMocks
- [ ] Know when(), verify()
- [ ] Know ArgumentCaptor
- [ ] Know different return strategies

✅ **Integration:**
- [ ] Know @SpringBootTest
- [ ] Know TestRestTemplate
- [ ] Know database setup/teardown

✅ **Best Practices:**
- [ ] Know AAA pattern
- [ ] Know unit vs integration vs E2E
- [ ] Know 70/20/10 pyramid
- [ ] Know coverage targets

---

**Master testing—it's 15% of backend interviews!**
