# Authentication and Security

Security is a chain of decisions: identify the caller, validate credentials, establish an identity, authorize the requested action, protect data in transit and at rest, and observe abuse. No single technology makes an application secure.

## 1. Authentication and Authorization

- **Authentication:** Who is making the request?
- **Authorization:** Is that authenticated identity allowed to perform this action on this resource?

A role check is not enough for object-level access. `ROLE_USER` may allow profile editing, but the service must still verify that the requested profile belongs to the current user. Missing that check creates IDOR vulnerabilities.

## 2. Passwords

Never encrypt or store plain passwords. Passwords should be hashed with a deliberately slow, salted password hashing function such as Argon2id, bcrypt, or PBKDF2. The salt is normally stored with the hash; it prevents identical passwords from having identical stored values.

```java
@Bean
PasswordEncoder passwordEncoder() {
    return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
}

String hash = encoder.encode(rawPassword);
boolean valid = encoder.matches(rawPassword, hash);
```

Do not use MD5, SHA-1, or a fast general-purpose SHA hash for passwords. Rate-limit login attempts, use generic failure messages, avoid logging credentials, and provide secure reset and email-verification flows. Password complexity rules should be risk-based; length and breached-password checks are generally more useful than arbitrary composition rules.

## 3. Sessions and Tokens

A session stores authentication state on the server, usually referenced by a cookie. It is easy to revoke and works well for browser applications, but multiple instances need shared session storage or sticky routing. Protect cookies with `Secure`, `HttpOnly`, and an appropriate `SameSite` setting, and protect state-changing requests from CSRF.

A JWT is a signed, serialized claim set. Its signature protects integrity, not confidentiality. Anyone holding a JWT can decode its payload, so do not put secrets in claims. Short-lived access tokens reduce exposure, but JWTs do not magically solve revocation, logout, key rotation, or stale roles.

Choose sessions, opaque tokens, or JWTs based on clients, revocation needs, infrastructure, and trust boundaries. JWT is not categorically better for APIs or microservices. OAuth2 and OpenID Connect are appropriate when delegating identity to an authorization server; a resource server should validate issuer, audience, signature algorithm, expiry, and scopes.

## 4. Modern Spring Security Configuration

```java
@Configuration
@EnableMethodSecurity
class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // only for a non-cookie stateless API
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/login", "/auth/signup", "/actuator/health")
                    .permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
```

`oauth2ResourceServer` delegates JWT validation to Spring Security's resource-server support. Configure issuer and audience in properties and keep signing keys in a key-management system. Do not hard-code a secret or accept any algorithm supplied by the token.

Method security can add a domain check:

```java
@PreAuthorize("hasRole('ADMIN') or @authorizationService.canEditUser(authentication, #id)")
public UserResponse updateUser(Long id, UpdateUserRequest request) { ... }
```

Authorization should be enforced in the service boundary too, because a URL rule alone does not protect other call paths.

### How a JWT actually becomes "the current user" — the filter and `SecurityContextHolder`

The `oauth2ResourceServer(...)` configuration above works through a filter that runs once per request, before any controller method:

```java
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain chain) throws ServletException, IOException {
        String token = extractToken(request);
        if (token != null && jwtUtils.validate(token)) {
            Authentication auth = jwtUtils.buildAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(auth); // the request "becomes" authenticated here
        }
        chain.doFilter(request, response); // continue to the next filter / eventually the controller
    }
}
```

`OncePerRequestFilter` guarantees the filter's logic runs exactly once per request even if the servlet container's dispatch mechanism would otherwise invoke the filter chain more than once (e.g. on an internal forward) — a real, easy-to-get-subtly-wrong detail if you extend the more generic `Filter` interface directly instead. `SecurityContextHolder` stores the authenticated principal in a `ThreadLocal`, meaning it's scoped to the single thread handling *this* request — which is exactly why `SecurityContextHolder.getContext().getAuthentication()` called anywhere later in that same request's call stack (a controller, a service, an `@PreAuthorize` check) sees the same authenticated user with no need to pass it explicitly as a parameter, but also why propagating security context into a manually-spawned thread or a `@Async` method requires deliberately copying it across (see the [Concurrency guide](06-Concurrency-Async.md#4-spring-async) for why context doesn't automatically transfer to another thread).

This is also the direct answer to "why not just decode the JWT inside every controller method that needs the user": doing that would duplicate the validation logic everywhere, make it easy for one endpoint to forget a check the others remember, and mix authentication concerns into business logic. Centralizing it in one filter means every downstream layer — controllers, services, method-security annotations — can simply ask `SecurityContextHolder` "who is the current user," fully decoupled from *how* that identity was established (a JWT here, but it could be a session or an API key in a different filter without changing a single controller).

## 5. CSRF, CORS, and Headers

CSRF matters when browsers automatically attach credentials, especially cookies. Keep CSRF protection for session and cookie-authenticated browser applications. A bearer token stored and attached explicitly by a non-browser client has a different CSRF profile, but storing tokens in browser-accessible storage increases XSS impact.

CORS tells a browser which origins may read responses. It is not authentication or authorization, and it does not block non-browser clients. Never combine wildcard origins with credentials; allowlist exact origins.

Prefer modern headers such as HSTS, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`, and frame protections. The old `X-XSS-Protection` header is obsolete and should not be presented as a primary defense.

## 6. Refresh Tokens and Logout

A robust flow uses a short-lived access token and a longer-lived refresh token. Store refresh tokens hashed in a database or secure token store, associate them with a device/session, rotate them on use, and revoke the token family on reuse detection or logout. A refresh endpoint must validate issuer, subject, expiry, and rotation state; it should not merely decode a token and issue another token.

## Interview Questions and Answers

### 1. Authentication versus authorization?

**Answer:** Authentication verifies identity. Authorization checks whether that identity may perform a specific action on a specific resource. The second check often needs ownership or tenant information, not just a role.

### 2. JWT versus session authentication?

**Answer:** Sessions make revocation and server-side state straightforward but need shared state when scaled. JWTs can be validated without session lookup but complicate revocation, rotation, claim freshness, and secure storage. The choice depends on the system, not a universal rule.

### 3. Is a JWT encrypted?

**Answer:** Usually no. It is encoded and signed. The signature detects tampering, but the payload is readable, so sensitive data should not be placed in it.

### 4. How do you secure refresh tokens?

**Answer:** Make them long-lived only as necessary, store them securely and preferably hashed server-side, rotate on every use, detect reuse, bind them to a session or device, and revoke them during logout or compromise.

### 5. What is CSRF?

**Answer:** A malicious site causes a browser to send an authenticated request to another site. It is primarily a risk when the browser automatically attaches cookies. Use CSRF tokens and SameSite cookies for cookie-based authentication.

### 6. What is CORS?

**Answer:** CORS is a browser policy controlling which origins can read cross-origin responses. It does not replace authorization and does not protect an API from direct non-browser calls.

### 7. How would you prevent IDOR?

**Answer:** Load the resource through a query constrained by the authenticated principal or tenant, or perform an explicit ownership check in the service. Never trust an ID in the URL merely because the caller has a general user role.

### 8. Why hash passwords instead of encrypting them?

**Answer:** The application needs to verify a password, not recover it. A salted, slow one-way hash limits damage if the database is stolen and makes offline guessing more expensive.

### 9. What should a resource server validate in a JWT?

**Answer:** Signature against trusted keys, issuer, audience, expiration, not-before if used, algorithm policy, and scopes or authorities. Then apply domain authorization to the resource.

### 10. Why disable CSRF in some APIs?

**Answer:** Only when the API uses credentials that the browser does not automatically attach, such as an explicitly supplied bearer token, and the threat model supports it. Disabling CSRF is not a generic API best practice.

### 11. Why extend `OncePerRequestFilter` instead of implementing `Filter` directly for JWT validation?

**Answer:** `OncePerRequestFilter` guarantees its logic runs exactly one time per incoming request, even across internal servlet dispatches (like a forward) that could otherwise invoke a plain `Filter` more than once for the same request. For something like token validation that sets security state, running twice isn't just wasteful — it can produce subtly inconsistent behavior — so `OncePerRequestFilter` is the correct base class specifically to rule that out.

### 12. What is `SecurityContextHolder`, and why doesn't the authenticated user need to be passed explicitly into every method?

**Answer:** It stores the current request's authenticated principal in a `ThreadLocal`, scoped to the single thread handling that request. Once the authentication filter sets it early in the chain, any code running later on that same thread — a controller, a service, a `@PreAuthorize` check — can read it directly, which is why it doesn't need to be threaded through method signatures, but also why it does not automatically follow the request onto a separate thread (a manually spawned thread, or an `@Async` method) without deliberately propagating it.

### 13. Why validate a JWT in one filter instead of decoding it inside each controller that needs the user?

**Answer:** Decoding it per-controller duplicates validation logic everywhere, risks one endpoint forgetting a check the others remember, and mixes authentication mechanics into business logic. Centralizing it in one filter that populates `SecurityContextHolder` lets every downstream layer simply ask "who is the current user" without knowing or caring whether that identity came from a JWT, a session, or an API key.

## Revision Checklist

- [ ] Explain authentication, authorization, roles, permissions, and ownership.
- [ ] Implement safe password hashing and generic login errors.
- [ ] Compare sessions, opaque tokens, and JWTs.
- [ ] Explain CSRF versus CORS accurately.
- [ ] Describe refresh rotation, revocation, and IDOR prevention.
- [ ] Read a Spring Security 6 filter-chain configuration fluently.
- [ ] Explain `OncePerRequestFilter` and `SecurityContextHolder`'s `ThreadLocal` scoping, and why security context needs explicit propagation onto another thread.
