# Authentication and Security (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. The Problem: Two Different Questions Hiding in One Request

Take a normal-looking endpoint on a `UserController`:

```java
@PutMapping("/{id}")
public UserResponse updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
    return userService.update(id, request);
}
```

Say user 42 is logged in and sends `PUT /api/v1/users/77`. Before this method can safely run, two completely separate questions need answering:

1. **Is there a real, logged-in caller behind this request at all** — did they prove who they are, or is this just an anonymous HTTP call with no credentials?
2. **Is user 42, specifically, allowed to edit user 77's profile** — or should this be rejected even though user 42 is genuinely logged in?

These are two different failure modes, and mixing them up is exactly where bugs come from:

- **Authentication** answers question 1: *who is making this request?* It's the login step — checking a password, a token, a certificate — that establishes an identity.
- **Authorization** answers question 2: *is that already-established identity allowed to do this specific thing, to this specific resource?*

Here's the trap: if your code only checks "does this caller have `ROLE_USER`," user 42 sails straight through, because user 42 genuinely does have that role — the role check says nothing about *whose* data is being touched. Nobody stopped them from changing `77` to any id they like in the URL and editing someone else's profile. This exact bug — trusting an id taken from the request without verifying the caller actually owns or is entitled to that specific object — has a name: **IDOR (Insecure Direct Object Reference)**. The fix has to happen inside `updateUser`'s own logic (or a method-security check, section 5), not just at "is this person logged in": load the resource, compare it against the authenticated caller, and reject the mismatch. A role check tells you *what kind* of user someone is; it never tells you *which* records that particular user is entitled to touch.

## 2. Passwords: Why You Can Never Store Them As Typed

**Scenario:** your `User` entity needs a way to check a password at login. The obvious-looking approach is a `password` column holding exactly what the user typed at signup. If your database is ever breached — and databases do get breached — every single user's real password is sitting there in plain text, and because people reuse passwords across sites, the damage isn't limited to your app at all.

The next instinct is usually "so encrypt it instead of storing it raw." That sounds safer, but think about what encryption actually requires: a key, sitting somewhere on your server, that can turn the encrypted value back into the original password. Anyone who compromises your server gets the key alongside the encrypted data, and encryption is *designed* to be reversible — that's the whole point of it. But look at what you actually need at login: you never need to recover the original password at all. You only ever need to answer "does what they just typed match what they typed at signup?" That's a one-way question, not a "recover the secret" question.

**Password hashing** is built for exactly that one-way question: a function that's easy to compute forward (turn a password into a hash) but effectively impossible to reverse (turn the hash back into the password). At login you hash what the user just typed and compare it to the stored hash — the real password is never stored or recoverable anywhere.

There's still a trap here: an ordinary fast hash like plain `SHA-256` (Secure Hash Algorithm) is a bad choice for passwords, even though it's genuinely one-way. It's *fast* — designed to be, for things like checking file integrity — and an attacker with a GPU or ASIC can compute billions of candidate hashes per second and simply try every common password until one matches. What you actually want is a hash that's *deliberately, expensively slow*, so that guessing at scale becomes impractical even though checking one real login is still fast enough for a real user to not notice. That's what **Argon2id**, **bcrypt**, and **PBKDF2 (Password-Based Key Derivation Function 2)** are for — they're built to cost real CPU time and memory per attempt, on purpose.

One more piece: if two users both pick `password123` and you hash it the same way for everyone, both rows get the *identical* stored hash — and an attacker can precompute hashes for common passwords once (a "rainbow table") and instantly crack every account that shares one. A **salt** — a random value generated per user and mixed into the hash — fixes this: it's stored right alongside the hash (it doesn't need to be secret, just unique), so two identical passwords produce two different stored hashes, and a precomputed table becomes useless.

```java
@Bean
PasswordEncoder passwordEncoder() {
    return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
}

// at signup
String hash = encoder.encode(rawPassword);   // salted, slow hash — stored in the password column

// at login
boolean valid = encoder.matches(rawPassword, hash);   // recomputes and compares, never decrypts
```

Never use `MD5` (Message Digest 5) or `SHA-1` for passwords — both are fast general-purpose hashes, not designed to resist targeted password guessing, and both have known weaknesses besides. A few practices go alongside the hashing itself: rate-limit login attempts so an attacker can't just try millions of guesses against one account; return a generic failure message ("invalid email or password") rather than revealing whether the email exists at all; never log raw credentials anywhere; and build password reset and email-verification flows around single-use, short-lived tokens. On password rules, a long passphrase plus a check against known-breached password lists (services like this exist precisely for that lookup) generally stops more real attacks than forcing an arbitrary mix of uppercase letters, digits, and symbols.

## 3. Sessions: Remembering "You're Logged In" Between Requests

HTTP requests don't carry any memory of each other by default — this is the same statelessness idea from REST (each request stands alone, section 2 of the API design file), just showing up here applied to *identity* instead of to an API contract. Once a `User` logs in successfully, how does the *next* request know it's still the same logged-in person, instead of asking for a password on every single click?

The traditional fix is a **session**: right after a successful login, the server creates a record — something like `sessionId -> {userId, roles, expiresAt}` — kept in server memory or a shared store, and hands the client back just the `sessionId`, almost always via a cookie. The browser then automatically attaches that cookie to every later request to the same domain, and the server looks up the session to know who's asking, with the real credentials never sent again.

Sessions have a genuinely nice property: revocation is trivial. Delete the session record server-side, and the very next request with that cookie fails immediately — useful for "log out everywhere" or "someone's account was compromised, kill it now." The trade-off shows up once you have more than one server instance: if the session record lives only in server A's memory and the user's next request happens to land on server B, server B has no idea who they are. Fixing that means either a shared session store (like Redis) that every instance can reach, or "sticky" routing that always sends the same user to the same server — the second option is fragile the moment that server goes down.

Because the browser attaches the session cookie *automatically*, a few cookie flags matter a lot: `HttpOnly` stops JavaScript on the page from reading the cookie at all (so a cross-site scripting bug can't just steal the session id outright), `Secure` ensures the cookie is only ever sent over HTTPS, never plain HTTP, and `SameSite` restricts whether the cookie gets attached on requests originating from a different site. That last one is also the first line of defense against a specific attack — a malicious page tricking your browser into firing an authenticated request at your real app — which gets its own full explanation, with the attack walked through step by step, in section 7.

## 4. Tokens and JWT: A Stateless Alternative

**Scenario:** the shared session store from section 3 solves the multi-instance problem, but it adds a real cost — every single request now needs a network round trip to Redis (or wherever sessions live) just to answer "who is this?" before any actual work happens. What if the client just carried proof of its own identity along with the request, and the server never had to look anything up at all?

A **JWT (JSON Web Token)** is exactly that: a compact block of text the server hands back after a successful login, made of three parts — `header.payload.signature`. The payload holds **claims**: things like the user's id, their roles, and an expiry time. The header and payload are just base64url-*encoded*, not encrypted — readable by anyone who has the token, the same way base64-encoding an image doesn't hide it, just reformats it. The signature is what makes it trustworthy: the server signs the header+payload with a secret key (or a private key), and on every later request it can *recompute* that signature and check it matches — proving the claims weren't tampered with, without needing to look anything up in a database.

This is the single most misunderstood thing about JWTs, so it's worth stating plainly: **the signature protects integrity, not confidentiality.** Anyone holding the token — including a curious user themselves — can decode the payload and read every claim in it, with nothing more than a text editor and a base64 decoder. Never put a password, a secret, or anything sensitive you don't want the token's own holder to see inside a JWT's claims.

Compared to a session, a JWT trades one problem for another. You lose the DB/Redis round trip on every request — the server just verifies a signature, which is fast and local. But you also lose the easy revocation sessions gave you: once a JWT is signed and handed out, it stays valid until it expires, no matter what happens on the server afterward — the user changes their role, gets suspended, or explicitly logs out — unless you build extra infrastructure (like a blocklist of revoked token ids) back on top, which erodes the "no lookup needed" benefit you were chasing in the first place. The usual mitigation is keeping access tokens short-lived (minutes, not days), which limits how long a stolen or stale token stays useful — but that then creates the need for a way to get a *new* token without forcing the user to log in again every few minutes, which is exactly what section 8's refresh tokens solve.

None of this makes JWT "better" than a session — it isn't, categorically, for APIs or for microservices, despite how often that gets repeated. Sessions, opaque tokens (a random string the server looks up, with none of a JWT's self-contained claims), and JWTs are three different trade-offs between revocation control, lookup cost, and infrastructure — pick based on your actual clients, your actual revocation needs, and what infrastructure you're willing to run.

**OAuth (Open Authorization) and OpenID Connect** matter once you stop handling logins yourself entirely. Think "Sign in with Google" on some app's login page: instead of that app ever seeing your Google password, it redirects you to Google, you log in there, and Google hands the app back a token proving who you are — the app delegated the actual identity check to Google. **OAuth2** is the protocol for that delegation, originally framed around *authorization* — "let this app act on my behalf, with these specific permissions (scopes)." **OpenID Connect** is a layer built on top of OAuth2 specifically for *authentication* — "tell me who this person actually is," with a standardized identity token. When your Spring Boot service is the one *receiving* a token from an external authorization server like this (acting as a "resource server"), it must not just check the signature and call it done — it has to validate the **issuer** (was this really signed by the authorization server I trust, and not some other party), the **audience** (was this token actually meant for my API, or was it issued for a different application and just happens to be a valid token somewhere), the **signature algorithm** (reject a token that claims "no signature at all" or an unexpected algorithm — a real, historical attack against JWT libraries), the **expiry**, and the **scopes** it carries, before trusting any of its claims.

## 5. Wiring This Into Spring Security

Spring Security ties the previous sections together through one configuration bean:

```java
@Configuration
@EnableMethodSecurity
class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // only safe for a non-cookie, stateless API — section 7 explains why
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // no server-side session at all — we're using JWTs
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

Reading it top to bottom against everything already covered: `csrf().disable()` is safe here specifically because this API is stateless and JWT-based, not cookie-based (section 7 makes the distinction precise). `sessionCreationPolicy(STATELESS)` tells Spring Security not to create the server-side session from section 3 at all — every request is expected to prove its own identity via the token, every time. `authorizeHttpRequests` is coarse-grained, URL-level authorization: it can say "only `ADMIN` may hit `/admin/**`," but it has no idea about individual resource ownership. `oauth2ResourceServer(...).jwt(...)` is what performs the validation described at the end of section 4 — issuer, audience, signature, expiry — and, on success, populates the request with an authenticated identity (the mechanism for exactly how is section 6).

That URL-level rule is still just a role check — it cannot express "user 42 may edit user 42's profile but not user 77's," the exact IDOR gap from section 1. That needs a check with actual domain knowledge, which is what method security adds:

```java
@PreAuthorize("hasRole('ADMIN') or @authorizationService.canEditUser(authentication, #id)")
public UserResponse updateUser(Long id, UpdateUserRequest request) { ... }
```

This is the same idea as section 1, just enforced in real code instead of described in the abstract: either the caller is an admin, or a real domain check (`canEditUser`) confirms the authenticated caller actually owns user `id`. And because a URL-based rule only protects requests that come in through that exact URL, the same ownership check belongs in the service layer too, not only at the controller boundary — a different call path (an internal batch job, another controller reusing the service) that skips the annotated method would otherwise bypass it entirely.

## 6. How a Token Actually Becomes "The Current User"

The `oauth2ResourceServer(...)` line above doesn't do its work inside the controller — it runs earlier, in a **filter**: code that runs on every incoming request, before any controller method is reached.

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

Two names here are worth understanding precisely, because they explain behavior that otherwise looks like magic.

**`OncePerRequestFilter`** guarantees this logic runs exactly one time per incoming request — even though the servlet container can, in some situations (like an internal forward), invoke a filter chain more than once for what's conceptually a single request. If you extended the plain `Filter` interface directly instead, token validation and `SecurityContextHolder` assignment could silently run twice for one request — not just wasteful, but a real source of subtly inconsistent behavior. Extending `OncePerRequestFilter` specifically rules that out.

**`SecurityContextHolder`** is where the filter stashes the authenticated identity it just built. It stores that identity in a `ThreadLocal` — a value scoped to the *one thread* handling this specific request. That's exactly why a controller method, a service method, or a `@PreAuthorize` check written anywhere later in that same request's call stack can call `SecurityContextHolder.getContext().getAuthentication()` and get back the same authenticated user, with nobody having to pass it down explicitly as a parameter through every method signature. It's also exactly why that identity does *not* automatically show up inside a manually-spawned thread, or inside an `@Async` method running on a different thread pool thread — a `ThreadLocal` belongs to one thread, and a new thread starts with an empty one. Propagating security context onto another thread requires deliberately copying it across.

This also answers a natural question: why centralize token checking in one filter instead of just decoding the JWT inside every controller method that needs to know who's calling? Doing it per-controller would duplicate the same validation logic everywhere, make it easy for one endpoint to forget a check the others remember, and tangle authentication mechanics into business logic that shouldn't care how identity was established. With one filter populating `SecurityContextHolder`, every downstream layer — controllers, services, `@PreAuthorize` annotations — can simply ask "who is the current user" and get an answer, fully decoupled from *how* that identity was proven. Swap the JWT filter for a session-cookie filter or an API-key filter tomorrow, and not one line of downstream code needs to change.

## 7. CSRF, CORS, and Security Headers

**CSRF (Cross-Site Request Forgery)** only matters once you understand exactly what a browser does automatically. Say you're logged into your bank at `bank.com` via a session cookie (section 3). You then visit a completely unrelated, malicious page in another tab. That page can contain an invisible form that auto-submits a `POST` to `bank.com/transfer-funds` the instant it loads. Your browser doesn't know or care that the request "came from" a shady page — it just sees "a request to `bank.com`," and because you have a valid session cookie for `bank.com`, the browser attaches it automatically, exactly as it would for a request you initiated yourself. `bank.com`'s server sees what looks like a perfectly authenticated request from you, because — as far as cookies go — it is one.

This is specifically a **cookie** problem, because cookies are what browsers attach automatically without the page asking. A CSRF token (a random value the legitimate page must read and include, which the malicious page has no way of obtaining) and a `SameSite` cookie setting are the standard defenses. This is exactly why disabling CSRF protection is only safe for an API that *isn't* cookie-authenticated — a bearer token (like the JWT from section 4) attached explicitly by client code in an `Authorization` header has a fundamentally different exposure, since a malicious page has no way to make your browser attach a header it doesn't know about. That said, storing a bearer token somewhere JavaScript can read it (like `localStorage`) trades one risk for another — it becomes stealable by a cross-site scripting bug in a way an `HttpOnly` cookie never would be.

**CORS (Cross-Origin Resource Sharing)** is a different mechanism solving a different problem. Say your frontend is served from `app.example.com` and it calls an API at `api.example.com` — different origin. By default, browsers block a webpage's JavaScript from reading a cross-origin response, as a baseline protection against one site silently reading another's data on your behalf. CORS is the server telling the browser, explicitly, "responses to requests from these origins may be read by the calling page's JavaScript." It's worth being precise about what CORS is *not*: it is not authentication, and it is not authorization — it's purely a browser-enforced rule about which page's JavaScript is allowed to read a response. A request made with `curl`, from a mobile app, or from another backend service ignores CORS entirely, because CORS is enforced by browsers, not servers. That means real access control still has to happen server-side, in the ways sections 1 and 5 already covered, regardless of whatever CORS does or doesn't allow. One configuration mistake worth naming explicitly: never combine a wildcard origin (`*`) with `allowCredentials(true)` — that combination effectively tells browsers "any site on the internet may make credentialed requests here," which defeats the point of the restriction entirely. Allowlist exact origins instead.

A handful of response headers add further browser-side protection worth knowing by name: **HSTS (HTTP Strict Transport Security)** tells the browser to only ever connect to your domain over HTTPS from now on, even if someone types a plain `http://` link. `X-Content-Type-Options: nosniff` stops the browser from guessing a different content type than what the server declared, which can otherwise be tricked into executing something as a script that was meant to be plain data. **CSP (Content Security Policy)** lets you declare exactly which sources of scripts, styles, and other resources a page is allowed to load from, which meaningfully limits what a cross-site scripting bug can actually do even if one slips through. Frame-related protections (`X-Frame-Options` or the newer `frame-ancestors` CSP directive) stop your pages from being embedded in an invisible iframe on someone else's site, which is how "clickjacking" attacks work. The older `X-XSS-Protection` header is obsolete — modern browsers have removed the filter it used to configure — so it shouldn't be presented as a real defense today; CSP is the modern replacement for that role.

## 8. Refresh Tokens and Logout

**Scenario:** section 4 recommended short-lived JWT access tokens — say 15 minutes — specifically to limit how long a stolen token stays dangerous. But logging a user out and back in every 15 minutes is a terrible experience. You need a way to get a *new* access token without asking for a password again, but without also making that renewal mechanism just as dangerous as a long-lived token would have been.

The standard shape is a **refresh token**: a second, longer-lived token issued alongside the short-lived access token, whose only job is "trade me in for a fresh access token." Because it's long-lived, it needs to be handled more carefully than the access token itself — store it hashed (the same hashing idea from section 2, applied to a token instead of a password) in a database or a dedicated token store, never in plain text. Associate each refresh token with a specific device or session, so a compromise of one device doesn't quietly grant access everywhere. **Rotate** it on every use — issuing a brand-new refresh token each time the old one is redeemed, and invalidating the old one immediately. That rotation is also what enables **reuse detection**: if an already-used-and-invalidated refresh token shows up again, that's a strong signal someone else has a copy of it (it was stolen and both the real user and an attacker tried to use it) — the correct response is to revoke the *entire* token family for that session, not just the one token, and force a real re-login. A refresh endpoint therefore has to do real validation work — issuer, subject, expiry, and rotation state — not simply decode whatever token it's handed and mint a new one in return. Logout, in this model, is straightforward: delete or revoke the stored refresh token, so no future "refresh" call can succeed for that session, even though any already-issued short-lived access token will keep working until it naturally expires a few minutes later.

## Interview Questions and Answers

### 1. Authentication versus authorization?

**Answer:** Authentication verifies who is making the request. Authorization checks whether that already-established identity is allowed to perform a specific action on a specific resource. A role check alone answers a coarser question than authorization usually requires — it says what kind of user someone is, not which specific records they're entitled to touch.

**Follow-up:** Why isn't `hasRole("USER")` enough to protect `PUT /users/{id}`? Because any user with that role passes the check regardless of which `id` is in the URL — you also need to verify the authenticated caller actually owns or is entitled to that specific resource.

### 2. What is IDOR, and how do you prevent it?

**Answer:** Insecure Direct Object Reference — trusting an identifier taken from the request (a URL path variable, a query parameter) without verifying the authenticated caller is actually entitled to that specific object. Prevent it by loading the resource through a query constrained by the authenticated principal or tenant, or by an explicit ownership check in the service or a method-security expression — never by a role check alone.

### 3. Why hash passwords instead of encrypting them?

**Answer:** The application only ever needs to verify a password, not recover it, and encryption is reversible by design — anyone with the key can get the original back. A salted, deliberately slow one-way hash (Argon2id, bcrypt, PBKDF2) means there's no key to steal that reverses it, and it makes large-scale offline guessing computationally expensive even if the database is stolen.

### 4. Why does the salt matter, separately from the hash algorithm being slow?

**Answer:** Without a salt, identical passwords produce identical stored hashes, letting an attacker precompute hashes for common passwords once and instantly crack every account sharing one (a rainbow table). A per-user random salt mixed into the hash makes every stored hash unique even for identical passwords, defeating precomputed tables regardless of how slow the underlying hash function is.

### 5. Sessions versus JWTs — how do you actually choose?

**Answer:** Sessions make revocation trivial (delete the server-side record) but need a shared store or sticky routing once you scale past one instance. JWTs avoid a per-request lookup and scale horizontally without shared state, but complicate revocation, role/claim freshness, and require careful signature and claim validation. Choose based on your actual revocation requirements, client types, and infrastructure — JWT is not categorically better for APIs or microservices.

### 6. Is a JWT encrypted?

**Answer:** Usually not. Its header and payload are base64url-encoded, not encrypted, and readable by anyone holding the token. The signature only proves the claims haven't been tampered with since signing — it says nothing about who can read them — so sensitive data should never go inside the claims.

### 7. What should a resource server validate before trusting a JWT's claims?

**Answer:** Signature against trusted keys (rejecting unexpected or "none" algorithms), issuer, audience, expiration, not-before if present, and the scopes or authorities it carries. Only after that does domain-level authorization against the actual resource apply.

### 8. What's the practical difference between OAuth2 and OpenID Connect?

**Answer:** OAuth2 is fundamentally about delegated authorization — letting an application act on a user's behalf with a defined set of permissions (scopes) — without that application ever seeing the user's real credentials. OpenID Connect is a layer built on top of OAuth2 specifically for authentication — establishing who the person actually is, via a standardized identity token.

### 9. What is CSRF, concretely, and why does it depend on cookies?

**Answer:** A malicious page causes a victim's browser to send a request to another site the victim is authenticated to — the browser attaches that site's cookie automatically because it doesn't know the request originated from an unrelated page. It's primarily a cookie-based risk because cookies are attached without the calling page asking; a bearer token that a legitimate client must deliberately attach in a header doesn't get silently forwarded the same way. Defenses are CSRF tokens and `SameSite` cookies.

### 10. When is it actually safe to disable CSRF protection?

**Answer:** Only when the API is authenticated by something the browser doesn't attach automatically — an explicitly supplied bearer token rather than a cookie — and the broader threat model supports it. It is not a general "APIs don't need CSRF" rule; a cookie-authenticated endpoint still needs it regardless of whether it's technically "an API."

### 11. What is CORS, and what does it not do?

**Answer:** CORS is a browser-enforced policy controlling which origins' JavaScript is allowed to read a cross-origin response. It is not authentication, not authorization, and does not affect non-browser clients like `curl`, mobile apps, or other backend services at all, since only browsers enforce it — real access control still has to happen on the server.

### 12. Why extend `OncePerRequestFilter` instead of implementing `Filter` directly for token validation?

**Answer:** `OncePerRequestFilter` guarantees its logic runs exactly once per incoming request, even across internal servlet dispatches (like a forward) that could otherwise invoke a plain `Filter` more than once for the same request. For logic that sets security state, running twice isn't just wasteful — it risks subtly inconsistent behavior — so it's the correct base class specifically to rule that out.

### 13. What is `SecurityContextHolder`, and why doesn't the authenticated user need to be passed explicitly into every method?

**Answer:** It stores the current request's authenticated identity in a `ThreadLocal`, scoped to the single thread handling that request. Once the authentication filter sets it early in the chain, any code running later on that same thread — a controller, a service, a `@PreAuthorize` check — can read it directly. That's also exactly why it does not automatically follow the request onto a different thread, such as a manually spawned thread or an `@Async` method, without deliberately propagating it.

### 14. Why validate a token in one filter instead of decoding it inside every controller that needs the caller's identity?

**Answer:** Decoding it per-controller duplicates validation logic everywhere, risks one endpoint forgetting a check the others remember, and mixes authentication mechanics into business logic. Centralizing it in one filter that populates `SecurityContextHolder` lets every downstream layer simply ask "who is the current user" without knowing or caring whether that identity came from a JWT, a session, or an API key.

### 15. How do you secure refresh tokens?

**Answer:** Store them hashed rather than in plain text, keep them no longer-lived than necessary, bind each one to a specific device or session, rotate on every use, detect reuse (a used-and-invalidated token reappearing signals theft) and revoke the entire token family when that happens, and revoke on explicit logout.

### 16. What's the actual point of `HSTS`, `nosniff`, and CSP, and why is `X-XSS-Protection` no longer worth relying on?

**Answer:** HSTS forces the browser to only use HTTPS for the domain going forward, `X-Content-Type-Options: nosniff` stops the browser from reinterpreting a response as a different, more dangerous content type than declared, and a Content Security Policy restricts which sources scripts and other resources may load from — meaningfully limiting what a cross-site scripting bug can do even if one occurs. `X-XSS-Protection` configured a browser filter that modern browsers have since removed, so it no longer does anything meaningful and shouldn't be treated as a real defense.

## Revision Checklist

- [ ] Explain authentication versus authorization using the "edit user 77" scenario, and define IDOR precisely.
- [ ] Explain why encryption is the wrong tool for passwords, and why hashing is the right one — including why a fast hash like SHA-256 is still unsafe.
- [ ] Explain what a salt actually prevents (rainbow tables), separately from why the hash function itself needs to be slow.
- [ ] Implement a `PasswordEncoder` bean and describe rate limiting, generic login errors, and breached-password checks.
- [ ] Explain sessions (cookie-based, easy revocation, scaling trade-off) and the purpose of `Secure`/`HttpOnly`/`SameSite`.
- [ ] Explain a JWT's structure, why its signature protects integrity but not confidentiality, and why revocation is hard.
- [ ] Compare sessions, opaque tokens, and JWTs, and justify a choice based on revocation needs and infrastructure.
- [ ] Explain what OAuth2 delegates versus what OpenID Connect adds, and what a resource server must validate on an incoming JWT.
- [ ] Read a Spring Security 6 `SecurityFilterChain` configuration fluently, including why `csrf().disable()` and `STATELESS` sessions go together.
- [ ] Explain why a `@PreAuthorize` domain check is necessary on top of a URL-level `authorizeHttpRequests` rule, and why the same check belongs at the service boundary too.
- [ ] Explain `OncePerRequestFilter` and `SecurityContextHolder`'s `ThreadLocal` scoping, and why security context needs explicit propagation onto another thread.
- [ ] Walk through the CSRF attack scenario step by step, and explain why it's specifically a cookie problem.
- [ ] Explain what CORS actually controls, and why it is neither authentication nor authorization.
- [ ] Name HSTS, `nosniff`, CSP, and frame protections, and explain why `X-XSS-Protection` is obsolete.
- [ ] Explain refresh token rotation, reuse detection, and what a proper logout actually revokes.
