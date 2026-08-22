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

## Revision Checklist

- [ ] Explain authentication, authorization, roles, permissions, and ownership.
- [ ] Implement safe password hashing and generic login errors.
- [ ] Compare sessions, opaque tokens, and JWTs.
- [ ] Explain CSRF versus CORS accurately.
- [ ] Describe refresh rotation, revocation, and IDOR prevention.
- [ ] Read a Spring Security 6 filter-chain configuration fluently.
