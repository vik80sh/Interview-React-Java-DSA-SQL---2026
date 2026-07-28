# Common Backend Problems & Solutions
## Caching, Pagination, Transactions, Optimistic Locking, Real-World Patterns

---

## TABLE OF CONTENTS
1. Caching Strategies
2. Pagination & Sorting
3. Soft Deletes
4. Optimistic Locking
5. Common Patterns
6. Interview Scenarios

---

# PART 1: CACHING STRATEGIES

## Cache Aside (Lazy Load)

```java
@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private CacheManager cacheManager;
    
    public User getUserById(Long id) {
        Cache cache = cacheManager.getCache("users");
        User user = cache.get(id, User.class);
        
        if (user == null) {
            // Cache miss - load from DB
            user = userRepository.findById(id).orElse(null);
            if (user != null) {
                cache.put(id, user);
            }
        }
        return user;
    }
}

// Or with Spring annotation (cleaner):
@Cacheable("users")
public User getUserById(Long id) {
    return userRepository.findById(id).orElse(null);
}

// Cache invalidation:
@CacheEvict("users")
public void deleteUser(Long id) {
    userRepository.deleteById(id);
}

// Update cache:
@CachePut(value = "users", key = "#id")
public User updateUser(Long id, User user) {
    return userRepository.save(user);
}
```

---

## Write Through

```java
// Write to cache and database atomically

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private Cache cache;
    
    public User createUser(User user) {
        // 1. Write to database
        User saved = userRepository.save(user);
        
        // 2. Write to cache
        cache.put(saved.getId(), saved);
        
        return saved;
    }
}

// Benefits:
// - Cache always has latest data
// - Consistent writes
// - Read hits cache
//
// Disadvantages:
// - Slower writes (dual write)
// - Cache must be reliable
```

---

## Cache Warming

```java
@Component
public class CacheWarmer {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private Cache cache;
    
    @PostConstruct // On app startup
    public void warmCache() {
        List<User> users = userRepository.findAll();
        for (User user : users) {
            cache.put(user.getId(), user);
        }
    }
    
    @Scheduled(cron = "0 0 2 * * ?") // Daily at 2 AM
    public void refreshCache() {
        cache.clear();
        warmCache();
    }
}

// Benefits:
// - Avoid cold cache on startup
// - Preload hot data
```

---

# PART 2: PAGINATION & SORTING

## Proper Pagination

```java
// ❌ WRONG: Load all data (memory issue!)
public List<User> getAllUsers() {
    return userRepository.findAll();
}

// ✅ CORRECT: Paginate
public Page<User> getUsers(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size,
    @RequestParam(defaultValue = "id,desc") String sort
) {
    Sort sortSpec = parseSortString(sort);
    Pageable pageable = PageRequest.of(page, size, sortSpec);
    return userRepository.findAll(pageable);
}

// Helper to parse sort string
private Sort parseSortString(String sortStr) {
    // "id,desc" → Sort.by(Sort.Order.desc("id"))
    String[] parts = sortStr.split(",");
    String field = parts[0];
    String direction = parts.length > 1 ? parts[1] : "asc";
    
    Sort.Direction dir = direction.equals("desc") 
        ? Sort.Direction.DESC 
        : Sort.Direction.ASC;
    
    return Sort.by(new Sort.Order(dir, field));
}

// Response:
{
  "content": [ {...}, {...} ],
  "totalElements": 100,
  "totalPages": 10,
  "currentPage": 0,
  "pageSize": 10,
  "hasNext": true,
  "hasPrevious": false
}
```

---

## Keyset Pagination (Better for large datasets)

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    @Query("SELECT u FROM User u WHERE u.id > :lastId ORDER BY u.id ASC")
    List<User> findNextPage(
        @Param("lastId") Long lastId,
        @PageableDefault(size = 10) Pageable pageable
    );
}

// Client uses: lastId = 100 (from previous page)
// Gets next 10 users after ID 100
// Better than offset (no skipping)

// Usage:
public List<User> getPage(Long lastId) {
    return userRepository.findNextPage(lastId, PageRequest.of(0, 10));
}
```

---

# PART 3: SOFT DELETES

## Logical Deletion

```java
// Add deleted flag
@Entity
public class User {
    @Id
    @GeneratedValue
    private Long id;
    
    private String name;
    
    @Column(nullable = false)
    private boolean deleted = false;
    
    @Temporal(TemporalType.TIMESTAMP)
    private LocalDateTime deletedAt;
}

// Repository - Filter out deleted
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    @Query("SELECT u FROM User u WHERE u.deleted = false")
    List<User> findAllActive();
    
    @Query("SELECT u FROM User u WHERE u.deleted = false AND u.id = :id")
    Optional<User> findById(@Param("id") Long id);
}

// Service - Soft delete
@Service
public class UserService {
    
    public void deleteUser(Long id) {
        User user = userRepository.findById(id).orElseThrow();
        user.setDeleted(true);
        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);
        // Data still in database!
    }
}

// Benefits:
// - Recoverable
// - Preserve relationships
// - Audit trail
//
// Disadvantages:
// - Must filter deleted everywhere
// - Database bloat
// - Slower queries
```

---

# PART 4: OPTIMISTIC LOCKING

## Preventing Lost Updates

```java
// ❌ PROBLEM: Lost update
// User A reads version 1
// User B reads version 1
// User A updates (version stays 1)
// User B updates (version stays 1)
// CONFLICT! One update lost

// ✅ SOLUTION: Optimistic Locking

@Entity
public class User {
    @Id
    @GeneratedValue
    private Long id;
    
    private String name;
    
    @Version // Spring manages this
    private Long version;
}

// Service:
@Service
public class UserService {
    
    public User updateUser(Long id, String newName) {
        User user = userRepository.findById(id).orElseThrow();
        user.setName(newName);
        
        try {
            return userRepository.save(user);
            // If version doesn't match, OptimisticLockingFailureException
        } catch (ObjectOptimisticLockingFailureException e) {
            // Another user updated, retry
            throw new ConflictException("User was updated by another user");
        }
    }
}

// Flow:
// User A: Read version=1
// User B: Read version=1
// User A: Update with version=1 → Success, version=2
// User B: Update with version=1 → FAIL! (current is 2)
//         Must retry with new version

// Benefits:
// - No locks (better performance)
// - Prevents lost updates
// - Handles conflicts gracefully
```

---

# PART 5: COMMON PATTERNS

## Idempotent Operations

```java
// ❌ NOT IDEMPOTENT
@PostMapping("/transfer")
public void transfer(@RequestBody TransferRequest request) {
    // Each call transfers money
    account1.debit(100);
    account2.credit(100);
}

// Call twice = transfer twice!

// ✅ IDEMPOTENT
@PostMapping("/transfer")
public void transfer(@RequestBody TransferRequest request) {
    // Use idempotency key
    String idempotencyKey = request.getIdempotencyKey();
    
    // Check if already processed
    if (isAlreadyProcessed(idempotencyKey)) {
        return; // Return cached result
    }
    
    // Process
    account1.debit(100);
    account2.credit(100);
    
    // Mark as processed
    markAsProcessed(idempotencyKey);
}

// Database:
@Entity
public class IdempotencyRecord {
    @Id
    private String idempotencyKey;
    
    private String response;
    
    private LocalDateTime processedAt;
}
```

---

## Retrying Failed Operations

```java
@Service
public class ReliableService {
    
    @Retryable(
        value = { TemporaryException.class },
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000)
    )
    public void unreliableOperation() {
        externalService.call(); // Might fail temporarily
    }
    
    @Recover
    public void recoverFromRetry(TemporaryException ex) {
        // Called after all retries exhausted
        logger.error("Operation failed after retries", ex);
        sendAlert();
    }
}

// Manual retry with exponential backoff:
public void retryWithBackoff(Callable<Void> operation) {
    int attempt = 0;
    int maxAttempts = 3;
    
    while (attempt < maxAttempts) {
        try {
            operation.call();
            return;
        } catch (TemporaryException e) {
            attempt++;
            long delay = (long) Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            Thread.sleep(delay);
        }
    }
    throw new Exception("Operation failed after " + maxAttempts + " attempts");
}
```

---

## Circuit Breaker Pattern

```java
// External service might be down temporarily
// Circuit Breaker: Fast fail instead of retrying

@Service
public class ExternalServiceClient {
    
    @CircuitBreaker(
        name = "externalService",
        fallbackMethod = "fallback"
    )
    public Data fetchData() {
        return externalService.getData();
    }
    
    public Data fallback(Exception ex) {
        // Return cached/default data
        return getLastKnownData();
    }
}

// States:
// CLOSED: Normal, requests go through
// OPEN: Service down, requests fail fast
// HALF_OPEN: Testing if service recovered

// Config:
resilience4j.circuitbreaker.instances.externalService:
  failure-rate-threshold: 50
  wait-duration-in-open-state: 30000 (30 seconds)
  minimum-number-of-calls: 10
```

---

# PART 6: INTERVIEW SCENARIOS

## Scenario 1: Design user profile update API

**Answer:**
```java
@Entity
public class User {
    @Id private Long id;
    @Version private Long version; // Optimistic lock
    private String name;
    private String email;
    
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp private LocalDateTime updatedAt;
}

@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(
        @PathVariable Long id,
        @Valid @RequestBody UpdateUserRequest request
    ) {
        try {
            User updated = userService.updateUser(id, request);
            return ResponseEntity.ok(updated);
        } catch (ObjectOptimisticLockingFailureException e) {
            return ResponseEntity.status(409).body(null); // Conflict
        }
    }
}

@Service
public class UserService {
    
    @Transactional
    public User updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id).orElseThrow();
        
        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }
        
        return userRepository.save(user);
        // Optimistic lock checked automatically
    }
}

// Key points:
// - @Version for optimistic locking
// - @Valid for validation
// - @Transactional for consistency
// - 409 Conflict on version mismatch
// - Timestamps for audit
```

---

## Scenario 2: Design paginated search API

**Answer:**
```java
@GetMapping("/search")
public ResponseEntity<Page<User>> search(
    @RequestParam String query,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size,
    @RequestParam(defaultValue = "name,asc") String sort
) {
    Pageable pageable = PageRequest.of(page, size, parseSortString(sort));
    Page<User> results = userService.search(query, pageable);
    
    return ResponseEntity
        .ok()
        .header("X-Total-Count", String.valueOf(results.getTotalElements()))
        .body(results);
}

@Service
public class UserService {
    
    public Page<User> search(String query, Pageable pageable) {
        return userRepository.search(query, pageable);
    }
}

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    @Query("SELECT u FROM User u " +
           "WHERE u.deleted = false AND " +
           "(LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<User> search(@Param("query") String query, Pageable pageable);
}

// Key points:
// - Pageable for pagination
// - Sort string parsing
// - Soft delete filter
// - LOWER() for case-insensitive search
// - X-Total-Count header for total count
```

---

## Scenario 3: Handle money transfer safely

**Answer:**
```java
@Entity
public class Transfer {
    @Id
    private String transferId; // Idempotency key
    
    private Long fromAccountId;
    private Long toAccountId;
    private BigDecimal amount;
    
    @Enumerated(EnumType.STRING)
    private TransferStatus status; // PENDING, COMPLETED, FAILED
}

@Service
public class TransferService {
    
    @Transactional
    public void transfer(TransferRequest request) {
        String idempotencyKey = request.getIdempotencyKey();
        
        // Check if already processed (idempotent)
        Transfer existing = transferRepository.findById(idempotencyKey).orElse(null);
        if (existing != null && existing.getStatus() == COMPLETED) {
            return;
        }
        
        // Lock accounts (prevent concurrent transfers)
        Account from = accountRepository.findByIdWithLock(request.getFromId());
        Account to = accountRepository.findByIdWithLock(request.getToId());
        
        // Validate
        if (from.getBalance().compareTo(request.getAmount()) < 0) {
            throw new InsufficientFundsException();
        }
        
        // Transfer
        from.setBalance(from.getBalance().subtract(request.getAmount()));
        to.setBalance(to.getBalance().add(request.getAmount()));
        
        accountRepository.save(from);
        accountRepository.save(to);
        
        // Record transfer
        Transfer transfer = new Transfer();
        transfer.setTransferId(idempotencyKey);
        transfer.setFromAccountId(from.getId());
        transfer.setToAccountId(to.getId());
        transfer.setAmount(request.getAmount());
        transfer.setStatus(COMPLETED);
        transferRepository.save(transfer);
    }
}

// With pessimistic lock:
@Query(value = "SELECT * FROM account WHERE id = :id FOR UPDATE",
       nativeQuery = true)
Account findByIdWithLock(@Param("id") Long id);

// Key points:
// - Idempotency key for safety
// - Pessimistic lock on accounts
// - Validate before transfer
// - Record transfer
// - Transaction rollback on error
```

---

# SUMMARY: Common Problems Mastery

✅ **Caching:**
- [ ] Know cache-aside strategy
- [ ] Know cache invalidation
- [ ] Know @Cacheable, @CacheEvict

✅ **Pagination:**
- [ ] Know offset-based pagination
- [ ] Know keyset pagination
- [ ] Know sorting

✅ **Concurrency:**
- [ ] Know optimistic locking
- [ ] Know pessimistic locking
- [ ] Know soft deletes

✅ **Patterns:**
- [ ] Know idempotent operations
- [ ] Know retry logic
- [ ] Know circuit breaker
- [ ] Know money transfer safety

---

**Master these patterns—they're asked in system design!**
