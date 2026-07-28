# Authentication & Security
## JWT, Spring Security, Password Hashing - Complete Guide

---

## TABLE OF CONTENTS
1. Authentication vs Authorization
2. Password Hashing & Security
3. JWT (JSON Web Token)
4. Spring Security Configuration
5. CORS & Security Headers
6. Common Interview Questions

---

# PART 1: AUTHENTICATION VS AUTHORIZATION

## Concepts

```
AUTHENTICATION: Who are you? (verify identity)
- Username/Password login
- JWT token validation
- OAuth2 provider

AUTHORIZATION: What can you do? (check permissions)
- Role-based access (ROLE_USER, ROLE_ADMIN)
- Permission checking
- Resource access control

EXAMPLE:
User logs in (AUTHENTICATION)
System verifies credentials → Issues token

User requests resource (AUTHORIZATION)
System checks token/role → Allows/Denies access
```

---

## Traditional Session-Based Auth

```java
// ❌ OLD: Session-based (stateful)
// Server stores session data

@RestController
public class AuthController {
    
    @PostMapping("/login")
    public String login(@RequestBody LoginRequest request) {
        User user = userService.findByEmail(request.getEmail());
        
        if (passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            // Create session (server stores it)
            HttpSession session = request.getSession();
            session.setAttribute("user", user);
            return "Login successful";
        }
        throw new BadCredentialsException("Invalid credentials");
    }
}

// PROBLEMS:
// - Server must store all sessions
// - Doesn't scale (multiple servers)
// - Requires shared session store
// - CSRF vulnerable
```

---

## Token-Based Auth (JWT)

```java
// ✅ NEW: Token-based (stateless)
// Client stores token, presents on each request

@RestController
public class AuthController {
    
    @Autowired
    private JwtProvider jwtProvider;
    
    @Autowired
    private UserService userService;
    
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        User user = userService.authenticate(request.getEmail(), request.getPassword());
        
        // Generate token (server doesn't store it!)
        String token = jwtProvider.generateToken(user);
        
        return ResponseEntity.ok(new AuthResponse(token));
    }
}

// CLIENT: Stores token, sends on each request
// GET /api/users HTTP/1.1
// Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

// BENEFITS:
// - Stateless (no server storage needed)
// - Scalable (any server can validate)
// - CORS friendly
// - Works with microservices
```

---

# PART 2: PASSWORD HASHING & SECURITY

## Password Hashing

```java
// ❌ NEVER store plain passwords
User user = new User();
user.setPassword("myPassword"); // ❌❌❌ Never!

// ✅ ALWAYS hash passwords
@Configuration
public class SecurityConfig {
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10); // strength = 10
    }
}

@Service
public class AuthService {
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    // Register
    @Transactional
    public User register(SignUpRequest request) {
        User user = new User();
        user.setEmail(request.getEmail());
        
        // Hash password
        String hashedPassword = passwordEncoder.encode(request.getPassword());
        user.setPassword(hashedPassword);
        
        return userRepository.save(user);
    }
    
    // Login
    @Transactional(readOnly = true)
    public User authenticate(String email, String password) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        
        // Compare plain password with hashed
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        
        return user;
    }
}

// PASSWORD HASHING ALGORITHMS:
// BCRYPT - Best for most cases
// ARGON2 - Better security (newer)
// PBKDF2 - Simple alternative
// SCRYPT - Good security

// NEVER USE:
// - MD5 (broken)
// - SHA1 (broken)
// - SHA256 (fast, bad for passwords)

// ✅ USE:
// - BCrypt (slow = harder to brute force)
// - Argon2 (best security)
```

---

## Security Best Practices

```java
// ❌ VULNERABLE CODE
@PostMapping("/users")
public User createUser(@RequestBody User user) {
    return userRepository.save(user);
    // Anyone can create any user!
}

// ✅ SECURE CODE
@PostMapping("/users")
@PreAuthorize("hasRole('ADMIN')") // Only admins
public User createUser(@RequestBody User user) {
    return userRepository.save(user);
}

// ✅ VALIDATE INPUT
@PostMapping("/login")
public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
    // @Valid ensures email format, password length, etc.
}

// ✅ RATE LIMITING
@Component
public class RateLimitingFilter extends OncePerRequestFilter {
    
    private final RateLimiter limiter = RateLimiter.create(10.0); // 10 req/sec
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                   HttpServletResponse response,
                                   FilterChain chain) throws ServletException, IOException {
        if (!limiter.tryAcquire()) {
            response.setStatus(429); // Too Many Requests
            return;
        }
        chain.doFilter(request, response);
    }
}

// ✅ HTTPS ONLY (in production)
server.ssl.key-store=classpath:keystore.jks
server.ssl.key-store-password=password

// ✅ HIDE SENSITIVE ERRORS
// ❌ Wrong:
catch (Exception e) {
    return ResponseEntity.status(500).body(e.getMessage()); // Exposes stack trace
}

// ✅ Correct:
catch (Exception e) {
    logger.error("Error occurred", e);
    return ResponseEntity.status(500).body("Internal server error");
}

// ✅ USE HTTPS_ONLY COOKIES
@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.sessionManagement()
            .sessionFixationProtection(SessionFixationProtectionStrategy.MIGRAATE_SESSION)
            .and()
            .cookie().httpOnly(true).secure(true);
        return http.build();
    }
}
```

---

# PART 3: JWT (JSON WEB TOKEN)

## JWT Structure

```
JWT = Header.Payload.Signature

HEADER:
{
  "alg": "HS256",    // Algorithm
  "typ": "JWT"       // Type
}

PAYLOAD:
{
  "sub": "user123",            // Subject (user ID)
  "email": "user@example.com",
  "role": "USER",
  "iat": 1234567890,           // Issued at (timestamp)
  "exp": 1234571490            // Expiration (timestamp)
}

SIGNATURE:
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret_key
)

Complete JWT:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIn0.
TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ
```

---

## JWT Implementation

```java
// pom.xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.11.5</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.11.5</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.11.5</version>
    <scope>runtime</scope>
</dependency>

// JWT Provider (Token creation/validation)
@Component
public class JwtProvider {
    
    @Value("${app.jwtSecret:mySecretKeyMustBeLongEnough}")
    private String jwtSecret;
    
    @Value("${app.jwtExpiration:86400000}") // 24 hours in ms
    private long jwtExpiration;
    
    // Generate token
    public String generateToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);
        
        return Jwts.builder()
            .setSubject(user.getId().toString())
            .claim("email", user.getEmail())
            .claim("role", user.getRole())
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(SignatureAlgorithm.HS512, jwtSecret)
            .compact();
    }
    
    // Validate token
    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token);
            return true;
        } catch (MalformedJwtException e) {
            logger.error("Invalid JWT token: {}", e);
        } catch (ExpiredJwtException e) {
            logger.error("Expired JWT token: {}", e);
        } catch (UnsupportedJwtException e) {
            logger.error("Unsupported JWT token: {}", e);
        } catch (IllegalArgumentException e) {
            logger.error("JWT claims string is empty: {}", e);
        }
        return false;
    }
    
    // Extract user ID
    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
            .setSigningKey(jwtSecret)
            .parseClaimsJws(token)
            .getBody();
        
        return Long.parseLong(claims.getSubject());
    }
}

// JWT Filter (validate token on each request)
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private JwtProvider jwtProvider;
    
    @Autowired
    private UserDetailsService userDetailsService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                   HttpServletResponse response,
                                   FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);
            
            if (jwt != null && jwtProvider.validateToken(jwt)) {
                Long userId = jwtProvider.getUserIdFromToken(jwt);
                UserDetails userDetails = userDetailsService.loadUserById(userId);
                
                UsernamePasswordAuthenticationToken auth = 
                    new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        } catch (Exception e) {
            logger.error("Invalid JWT token", e);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
```

---

# PART 4: SPRING SECURITY CONFIGURATION

## Security Configuration

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF (OK for stateless APIs)
            .csrf().disable()
            
            // Disable sessions (we're using JWT)
            .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
            
            // Authorization rules
            .authorizeRequests()
                .antMatchers("/auth/login", "/auth/signup").permitAll()
                .antMatchers("/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
                .and()
            
            // Add JWT filter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            
            // Exception handling
            .exceptionHandling()
                .authenticationEntryPoint(new JwtAuthenticationEntryPoint());
        
        return http.build();
    }
}

// Endpoint security
@RestController
@RequestMapping("/api")
public class UserController {
    
    @GetMapping("/public")
    public String publicEndpoint() {
        return "No authentication needed";
    }
    
    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')") // Both roles
    public List<User> getUsers() {
        return userService.findAll();
    }
    
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')") // Only admin
    public void deleteUser(@PathVariable Long id) {
        userService.delete(id);
    }
    
    @PostMapping("/users/{id}/admin")
    @PreAuthorize("hasRole('ADMIN') and @securityService.isOwner(#id)") // Custom logic
    public void promoteUser(@PathVariable Long id) {
        userService.promote(id);
    }
}
```

---

# PART 5: CORS & SECURITY HEADERS

## CORS Configuration

```java
@Configuration
public class CorsConfig {
    
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins("https://example.com", "https://app.example.com")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH")
                    .allowedHeaders("*")
                    .allowCredentials(true)
                    .maxAge(3600); // Cache preflight for 1 hour
            }
        };
    }
}

// Or in Spring Security:
@Configuration
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(Customizer.withDefaults()); // Enable CORS
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("https://*.example.com"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}

// ❌ NEVER use:
.allowedOrigins("*")         // Insecure
.allowCredentials(true)      // With wildcard origin = error
```

---

## Security Headers

```java
@Configuration
public class SecurityHeadersConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.headers()
            // Prevent clickjacking
            .xssProtection()
                .and()
            
            // Prevent MIME type sniffing
            .contentTypeOptions()
                .and()
            
            // Prevent frame embedding (clickjacking)
            .frameOptions().deny()
                .and()
            
            // Enforce HTTPS
            .httpStrictTransportSecurity()
                .maxAgeInSeconds(31536000)
                .includeSubDomains(true)
                .and()
            
            // CSP (Content Security Policy)
            .contentSecurityPolicy("default-src 'self'");
        
        return http.build();
    }
}

// Headers sent:
// Strict-Transport-Security: max-age=31536000; includeSubDomains
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// X-XSS-Protection: 1; mode=block
// Content-Security-Policy: default-src 'self'
```

---

# PART 6: INTERVIEW QUESTIONS

## Question 1: JWT vs Session-based authentication

**Answer:**
```
SESSION-BASED (Old):
- Server stores session data
- Doesn't scale (needs shared storage)
- CSRF vulnerable
- Good for monoliths

JWT (Modern):
- Stateless (no server storage)
- Scalable across servers
- CORS friendly
- Good for microservices
- Signature verifies integrity

JWT is better for APIs and microservices.
Session is better for traditional web apps.
```

---

## Question 2: How to secure passwords?

**Answer:**
```
1. HASH passwords using strong algorithm
   - BCrypt (slow = better security)
   - Argon2 (newest, best)
   - PBKDF2 (simple)

2. Never use: MD5, SHA1, SHA256 (too fast)

3. Each password gets unique SALT (built into BCrypt)

4. Implement rate limiting (prevent brute force)

5. Password requirements:
   - Min 8 characters
   - Mix of upper/lower/numbers/special
   - Don't reuse last N passwords
   - Expire periodically

6. Never log passwords
   - Log authentication attempts
   - Log failed logins
   - Alert on suspicious activity
```

---

## Question 3: JWT token expiration - How to refresh?

**Answer:**
```
SHORT-LIVED JWT:
- Access token: 15 minutes (short-lived)
- Refresh token: 7 days (longer-lived)

Flow:
1. Login → Issue access token + refresh token
2. Access token expires
3. Client sends refresh token → Get new access token
4. New access token valid for 15 more minutes

Implementation:
@PostMapping("/refresh")
public ResponseEntity<AuthResponse> refresh(@RequestBody RefreshTokenRequest request) {
    if (!jwtProvider.validateToken(request.getRefreshToken())) {
        return ResponseEntity.status(401).build();
    }
    
    Long userId = jwtProvider.getUserIdFromToken(request.getRefreshToken());
    User user = userService.findById(userId);
    String newAccessToken = jwtProvider.generateToken(user);
    
    return ResponseEntity.ok(new AuthResponse(newAccessToken));
}
```

---

## Question 4: How to prevent CSRF attacks?

**Answer:**
```
CSRF = Cross-Site Request Forgery (attacker makes request on behalf of user)

Prevention:
1. CSRF Tokens (for form-based apps)
   - Server generates unique token
   - Client includes in requests
   - Server validates

2. SameSite Cookie (modern, best)
   - Set SameSite=Strict on cookies
   - Browser won't send cookie cross-domain

3. Stateless APIs (JWT)
   - No cookies = no CSRF risk

Spring Security:
- CSRF enabled by default for non-GET requests
- Can disable for stateless APIs: csrf().disable()

Rule:
- Form apps → Keep CSRF protection
- Stateless APIs → Disable CSRF (use JWT)
- Always use SameSite cookies
```

---

## Question 5: Authorization - How to check permissions?

**Answer:**
```
ROLE-BASED:
@PreAuthorize("hasRole('ADMIN')")
public void deleteUser(Long id) { }

PERMISSION-BASED:
@PreAuthorize("hasAuthority('DELETE_USER')")
public void deleteUser(Long id) { }

CUSTOM:
@PreAuthorize("@securityService.isOwner(#id)")
public void updateProfile(Long id) { }

MULTIPLE CONDITIONS:
@PreAuthorize("hasRole('ADMIN') OR @securityService.isOwner(#id)")
public void updateUser(Long id) { }

RUNTIME CHECK:
if (!securityService.hasPermission(currentUser, resource)) {
    throw new ForbiddenException();
}
```

---

# SUMMARY: Authentication & Security Mastery

✅ **Basics:**
- [ ] Know authentication vs authorization
- [ ] Understand stateless vs stateful
- [ ] Know session vs token

✅ **Password Security:**
- [ ] Use BCrypt/Argon2 (never plain text)
- [ ] Understand salting
- [ ] Know rate limiting

✅ **JWT:**
- [ ] Understand structure (header.payload.signature)
- [ ] Know generation and validation
- [ ] Know expiration and refresh tokens

✅ **Spring Security:**
- [ ] Can configure auth rules
- [ ] Know @PreAuthorize
- [ ] Understand filters

✅ **Best Practices:**
- [ ] HTTPS only
- [ ] Secure headers
- [ ] CORS properly configured
- [ ] CSRF protection (when needed)

---

**Master authentication & security—they're critical for production!**
