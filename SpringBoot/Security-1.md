# Spring Security & JWT Architecture (Backend)

Security in a stateless REST API (like our Twitter backend) works on a simple principle: **The server does not remember who you are via traditional HTTP sessions.** Instead, every request carries a digitally signed proof of identity called a **JSON Web Token (JWT)**.

---

## 1. How Stateless Authentication Works (The Flow)

```
[ Next.js Frontend ]                     [ Spring Boot Backend ]
         |                                          |
         |--- 1. POST /signup or /login ----------->| (Validates credentials in DB)
         |<-- 2. Returns Response + JWT Cookie -----| (Generates signed JWT)
         |                                          |
         |--- 3. GET /tweets (with JWT in Cookie) ->| (Filter intercepts request)
         |                                          | (Validates signature & sets Context)
         |<-- 4. Returns Tweet Data ----------------| (Executes Controller logic)

```

---

## 2. Key Components You Need in Spring Boot

To set up Spring Security with JWT, you will build **3 core classes**:

### A. `JwtUtils` / `JwtProvider` (The Token Handler)

This utility class handles everything related to creating and verifying tokens:

* **Generate Token:** Takes a `username` or `userId`, sets an expiration time (e.g., 24 hours), and signs it using a secret key (`HMAC-SHA256`).
* **Validate Token:** Checks if the incoming token signature is valid and hasn't expired.
* **Extract Username/Claims:** Reads the `userId` or `username` stored inside the token payload.

### B. `JwtAuthenticationFilter` (The Request Interceptor)

This filter runs **before** Spring Boot processes any controller request (`OncePerRequestFilter`):

1. Intercepts the incoming HTTP request.
2. Extracts the JWT from the request header (or `httpOnly` cookie).
3. If the token is valid, it extracts the user details and loads them into Spring Security's **`SecurityContextHolder`**.
4. If invalid or missing, it passes the request along (Spring Security will reject it if the route is protected).

### C. `SecurityConfig` (The Rules Engine)

This class defines your security policies:

* **Public Routes:** Permitted to everyone without a token (e.g., `/api/v1/auth/**`).
* **Protected Routes:** Requires a valid token (e.g., `/api/v1/tweets/**`, `/api/v1/users/follow`).
* **CSRF (Cross-Site Request Forgery):** Disabled (`csrf.disable()`) because stateless APIs using JWTs do not use session cookies vulnerable to standard CSRF.
* **Session Management:** Set to `SessionCreationPolicy.STATELESS`.

---

## 3. Dual-Perspective: Learning vs. Production Security

| Feature / Concept | Learning / Small Project | Large / Production System (Real Twitter) |
| --- | --- | --- |
| **Token Storage** | Single **Access Token** (expires in 24 hours). | **Access Token** (short-lived, 15 mins) + **Refresh Token** (long-lived, 7–30 days stored in DB/Redis). |
| **Password Encoding** | Standard `BCryptPasswordEncoder` (Strength = 10). | `BCrypt` or `Argon2` with salt, plus rate-limiting on failed login attempts to prevent brute-force attacks. |
| **Secret Key Management** | Hardcoded string in `application.properties`. | Injected at runtime via environment variables or secret managers (e.g., AWS Secrets Manager, HashiCorp Vault). |
| **Token Revocation (Logout)** | Delete the token on the client side. Server accepts old tokens until they naturally expire. | **Token Blacklisting:** Revoked token IDs are pushed to a central **Redis** cache so they are rejected immediately upon logout. |

---

## 4. Your Implementation Step-by-Step

Here is the exact order to build your backend security:

1. **Password Hashing:** Create a `BCryptPasswordEncoder` bean in your configuration. Hash the raw password in your `UserService` during `/signup`.
2. **JWT Dependencies:** Ensure your `pom.xml` has JWT libraries (like `io.jsonwebtoken:jjwt-api`, `jjwt-impl`, `jjwt-jackson`).
3. **Build `JwtUtils`:** Implement token generation and parsing methods.
4. **Build `JwtAuthenticationFilter`:** Create the custom filter class extending `OncePerRequestFilter`.
5. **Configure `SecurityFilterChain`:** Wire your filter into Spring Security and define public vs. protected endpoints.
6. **Build Auth Controllers:** Create `/login` (checks password with `AuthenticationManager` and generates token) and `/signup`.

---

Which specific part of this security pipeline would you like to design first—the **`SecurityConfig` rules**, the **JWT generation utility**, or the **Database UserDetails mapping**?
