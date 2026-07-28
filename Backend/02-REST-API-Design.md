# REST API Design & Implementation
## Complete Guide with Real Examples

---

## TABLE OF CONTENTS
1. REST Principles
2. HTTP Methods & Status Codes
3. Request/Response Design
4. Error Handling
5. API Versioning
6. Common Interview Questions

---

# PART 1: REST PRINCIPLES

## What is REST?

```
REST = Representational State Transfer

PRINCIPLES:
1. Client-Server Architecture
2. Statelessness (each request has all needed info)
3. Cacheable (responses can be cached)
4. Uniform Interface (consistent API design)
5. Resource-Based (URLs represent resources, not actions)

EXAMPLES:
✅ REST: GET /api/users/1 (get user resource)
❌ NOT REST: GET /api/getUser?id=1 (action-based)

✅ REST: POST /api/users (create user resource)
❌ NOT REST: GET /api/createUser (action-based)
```

---

## Resource-Based Design

```java
// ❌ ACTION-BASED (Not REST)
GET /api/getUser/1
GET /api/deleteUser/1
POST /api/createUser
POST /api/updateUser/1

// ✅ RESOURCE-BASED (REST)
GET /api/users/1        (read)
DELETE /api/users/1     (delete)
POST /api/users         (create)
PUT /api/users/1        (update)

// HTTP method determines the action!
// URL identifies the RESOURCE, not the action
```

---

# PART 2: HTTP METHODS & STATUS CODES

## HTTP Methods

```java
// GET - Retrieve resource (SAFE & IDEMPOTENT)
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    return userService.getUserById(id);
}

// POST - Create resource (NOT idempotent)
@PostMapping("/users")
public User createUser(@RequestBody User user) {
    return userService.save(user);
}

// PUT - Update entire resource (IDEMPOTENT)
@PutMapping("/users/{id}")
public User updateUser(@PathVariable Long id, @RequestBody User user) {
    return userService.update(id, user);
}

// PATCH - Partial update (IDEMPOTENT)
@PatchMapping("/users/{id}")
public User partialUpdate(@PathVariable Long id, @RequestBody UserDTO dto) {
    return userService.partialUpdate(id, dto);
}

// DELETE - Delete resource (IDEMPOTENT)
@DeleteMapping("/users/{id}")
public void deleteUser(@PathVariable Long id) {
    userService.delete(id);
}

// TERMINOLOGY:
// SAFE: Doesn't modify server state (GET, HEAD, OPTIONS)
// IDEMPOTENT: Same result multiple times (GET, PUT, DELETE, PATCH, HEAD, OPTIONS)
// NON-IDEMPOTENT: Different result each call (POST)
```

---

## HTTP Status Codes

```java
// 2xx - SUCCESS

@PostMapping
public ResponseEntity<User> createUser(@RequestBody User user) {
    User saved = userService.save(user);
    return ResponseEntity.status(201).body(saved); // 201 Created
}

@GetMapping("/{id}")
public User getUser(@PathVariable Long id) {
    return userService.getUserById(id); // 200 OK (implicit)
}

@DeleteMapping("/{id}")
public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    userService.delete(id);
    return ResponseEntity.noContent().build(); // 204 No Content
}

// 3xx - REDIRECTION

// 4xx - CLIENT ERROR

@GetMapping("/{id}")
public ResponseEntity<User> getUser(@PathVariable Long id) {
    return userService.getUserById(id)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build()); // 404 Not Found
}

@PostMapping
public ResponseEntity<?> createUser(@RequestBody User user) {
    if (!validateUser(user)) {
        return ResponseEntity.badRequest().build(); // 400 Bad Request
    }
}

// Check authorization:
if (!currentUser.hasPermission()) {
    return ResponseEntity.status(403).build(); // 403 Forbidden
}

// Check authentication:
if (!isAuthenticated()) {
    return ResponseEntity.status(401).build(); // 401 Unauthorized
}

// 5xx - SERVER ERROR (usually automatic on exception)
// 500 Internal Server Error
// 503 Service Unavailable
```

---

## Status Code Summary

```
200 OK              - Request successful, response has body
201 Created         - Resource created successfully
204 No Content      - Request successful, no response body (DELETE)
301 Moved           - Resource moved permanently
304 Not Modified    - Cache still valid
400 Bad Request     - Invalid request format/data
401 Unauthorized    - Authentication required
403 Forbidden       - Authenticated but no permission
404 Not Found       - Resource doesn't exist
409 Conflict        - Request conflicts with current state
422 Unprocessable   - Validation failed
429 Too Many        - Rate limit exceeded
500 Internal Error  - Server error
503 Unavailable     - Service temporarily down

RULE:
- Use most specific code
- 2xx for success
- 3xx for redirection
- 4xx for client errors
- 5xx for server errors
```

---

# PART 3: REQUEST/RESPONSE DESIGN

## Request Design

```java
// Simple GET
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    return userService.getUserById(id);
}

// GET with filters
@GetMapping("/users")
public Page<User> getUsers(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size,
    @RequestParam(required = false) String role,
    @RequestParam(required = false) Boolean active
) {
    return userService.findUsers(page, size, role, active);
}

// GET with sorting
@GetMapping("/users")
public Page<User> getUsers(
    Pageable pageable // Spring converts to Page/Sort
) {
    return userService.findAll(pageable);
}
// Usage: GET /users?page=0&size=10&sort=name,asc

// POST with validation
@PostMapping("/users")
public ResponseEntity<User> createUser(
    @Valid @RequestBody CreateUserRequest request
) {
    User user = userService.create(request);
    return ResponseEntity.status(201).body(user);
}

// PUT - Full update
@PutMapping("/users/{id}")
public User updateUser(
    @PathVariable Long id,
    @Valid @RequestBody User user
) {
    return userService.update(id, user);
}

// PATCH - Partial update
@PatchMapping("/users/{id}")
public User partialUpdate(
    @PathVariable Long id,
    @RequestBody Map<String, Object> updates
) {
    return userService.partialUpdate(id, updates);
}
```

---

## Response Design

```java
// Standard response
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    return userService.getUserById(id);
}
// Response: { "id": 1, "name": "John", "email": "john@example.com" }

// List response
@GetMapping("/users")
public List<User> getUsers() {
    return userService.findAll();
}
// Response: [{ "id": 1, "name": "John" }, { "id": 2, "name": "Jane" }]

// Paginated response
@GetMapping("/users")
public Page<User> getUsers(Pageable pageable) {
    return userService.findAll(pageable);
}
// Response: { "content": [...], "totalElements": 100, "totalPages": 10, "number": 0 }

// Custom response wrapper
@GetMapping("/users/{id}")
public ResponseEntity<ApiResponse<User>> getUser(@PathVariable Long id) {
    User user = userService.getUserById(id);
    return ResponseEntity.ok(new ApiResponse<>(true, "User found", user));
}

// Response:
// {
//   "success": true,
//   "message": "User found",
//   "data": { "id": 1, "name": "John" }
// }

public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    
    public ApiResponse(boolean success, String message, T data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }
}
```

---

# PART 4: ERROR HANDLING

## Exception Handling Strategy

```java
// 1. CREATE CUSTOM EXCEPTIONS
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(String message) {
        super(message);
    }
}

public class InvalidUserException extends RuntimeException {
    public InvalidUserException(String message) {
        super(message);
    }
}

// 2. SERVICE LAYER - Throw exceptions
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
    
    public User getUserById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("User not found"));
    }
    
    public User createUser(CreateUserRequest request) {
        if (request.getName() == null || request.getName().isEmpty()) {
            throw new InvalidUserException("User name is required");
        }
        
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new InvalidUserException("Email already exists");
        }
        
        return userRepository.save(new User(request));
    }
}

// 3. ERROR RESPONSE DTO
public class ErrorResponse {
    private String message;
    private int status;
    private String timestamp;
    private String path;
    
    public ErrorResponse(String message, int status, String path) {
        this.message = message;
        this.status = status;
        this.path = path;
        this.timestamp = LocalDateTime.now().toString();
    }
}

// 4. GLOBAL EXCEPTION HANDLER
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(
        UserNotFoundException ex,
        HttpServletRequest request
    ) {
        ErrorResponse error = new ErrorResponse(
            ex.getMessage(),
            404,
            request.getRequestURI()
        );
        return ResponseEntity.status(404).body(error);
    }
    
    @ExceptionHandler(InvalidUserException.class)
    public ResponseEntity<ErrorResponse> handleInvalidUser(
        InvalidUserException ex,
        HttpServletRequest request
    ) {
        ErrorResponse error = new ErrorResponse(
            ex.getMessage(),
            400,
            request.getRequestURI()
        );
        return ResponseEntity.status(400).body(error);
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
        MethodArgumentNotValidException ex,
        HttpServletRequest request
    ) {
        String message = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .collect(Collectors.joining(", "));
        
        ErrorResponse error = new ErrorResponse(message, 400, request.getRequestURI());
        return ResponseEntity.status(400).body(error);
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
        Exception ex,
        HttpServletRequest request
    ) {
        ErrorResponse error = new ErrorResponse(
            "Internal server error",
            500,
            request.getRequestURI()
        );
        return ResponseEntity.status(500).body(error);
    }
}

// 5. CONTROLLER - Clean code (exception handling in controller advice)
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.getUserById(id); // Exception handled by @RestControllerAdvice
    }
    
    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody CreateUserRequest request) {
        User user = userService.createUser(request); // Exception handled
        return ResponseEntity.status(201).body(user);
    }
}

// ✅ BENEFITS:
// - Centralized error handling
// - Consistent error responses
// - Clean controller code
// - Easy to test
```

---

# PART 5: API VERSIONING

## Versioning Strategies

```java
// Strategy 1: URL versioning (Most common)
@RestController
@RequestMapping("/api/v1/users")
public class UserControllerV1 {
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) { }
}

@RestController
@RequestMapping("/api/v2/users")
public class UserControllerV2 {
    @GetMapping("/{id}")
    public UserDTO getUser(@PathVariable Long id) { } // Different response
}

// Strategy 2: Header versioning
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @GetMapping("/{id}")
    @RequestMapping(headers = "API-Version=1")
    public User getUserV1(@PathVariable Long id) { }
    
    @GetMapping("/{id}")
    @RequestMapping(headers = "API-Version=2")
    public UserDTO getUserV2(@PathVariable Long id) { }
}
// Usage: GET /api/users/1 with header "API-Version: 2"

// ❌ Strategy 3: Query parameter (Generally discouraged)
GET /api/users/1?v=2

// BEST PRACTICE: URL versioning (clear and explicit)
```

---

# PART 6: INTERVIEW QUESTIONS

## Question 1: Design a User CRUD API

**Answer:**
```
GET    /api/users          - Get all users (with pagination)
POST   /api/users          - Create user
GET    /api/users/{id}     - Get specific user
PUT    /api/users/{id}     - Update user (full)
PATCH  /api/users/{id}     - Update user (partial)
DELETE /api/users/{id}     - Delete user

Request examples:
POST /api/users
{ "name": "John", "email": "john@example.com" }

Response: 201 Created
{ "id": 1, "name": "John", "email": "john@example.com" }

GET /api/users?page=0&size=10&sort=name,asc
Response: 200 OK
{
  "content": [{ "id": 1, "name": "John" }],
  "totalElements": 100,
  "totalPages": 10
}

Error:
POST /api/users
{ "name": "", "email": "invalid" }

Response: 400 Bad Request
{ "message": "Name is required, Email is invalid", "status": 400 }
```

---

## Question 2: What's the difference between PUT and PATCH?

**Answer:**
```
PUT:
- Replace ENTIRE resource
- If field not provided, it's set to null/default
- Idempotent (same result multiple times)
- Usually requires all fields

PUT /api/users/1
{ "name": "John" }
Result: User updated with only name, other fields deleted

PATCH:
- Partial update
- Only provided fields are updated
- Idempotent
- Can work with full or partial data

PATCH /api/users/1
{ "name": "John" }
Result: Only name updated, other fields unchanged

RULE:
- Full update (all fields required) → PUT
- Partial update (some fields) → PATCH
```

---

## Question 3: How to handle validation errors?

**Answer:**
```
1. Use @Valid on @RequestBody
2. Let MethodArgumentNotValidException be thrown
3. Handle in @RestControllerAdvice
4. Return 400 Bad Request with details

Example:
@PostMapping
public ResponseEntity<User> createUser(@Valid @RequestBody CreateUserRequest request) {
    // If validation fails, exception is thrown
    // @RestControllerAdvice catches it
    // Returns 400 with error details
}

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
        MethodArgumentNotValidException ex
    ) {
        // Extract validation errors
        // Return formatted error response
    }
}
```

---

## Question 4: API Versioning - When to version?

**Answer:**
```
VERSION when:
- Breaking changes (removing fields, changing response format)
- Structural changes to existing endpoints
- Deprecating endpoints

DON'T VERSION when:
- Adding optional fields
- Adding new endpoints
- Fixing bugs
- Improving performance

Example - No versioning needed:
Old: GET /users/1 → { "id": 1, "name": "John" }
New: GET /users/1 → { "id": 1, "name": "John", "email": "john@example.com" }
(Added optional field, clients can ignore)

Example - Versioning needed:
Old: { "fullName": "John Doe" }
New: { "firstName": "John", "lastName": "Doe" }
(Structural change, need v2)
```

---

# SUMMARY: REST API Design Mastery

✅ **REST Principles:**
- [ ] Understand resource-based design
- [ ] Know difference from RPC-style
- [ ] Understand statelessness

✅ **HTTP Methods:**
- [ ] Know GET, POST, PUT, PATCH, DELETE
- [ ] Know SAFE vs IDEMPOTENT
- [ ] Know when to use each

✅ **Status Codes:**
- [ ] Know 2xx (success), 3xx (redirect), 4xx (client error), 5xx (server error)
- [ ] Know common codes (200, 201, 204, 400, 401, 403, 404, 500)

✅ **Error Handling:**
- [ ] Know @RestControllerAdvice pattern
- [ ] Know custom exceptions
- [ ] Know validation error handling

✅ **API Design:**
- [ ] Know pagination design
- [ ] Know versioning strategy
- [ ] Know request/response design

---

**Master REST API design—it's 20% of backend interviews!**
