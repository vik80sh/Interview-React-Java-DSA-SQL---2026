# REST API Design 


---

## 1. The Problem: How Should an App Talk to Your Server?

Say you're building the backend for a `User` feature. A mobile app needs to: read a user, create a user, change a user, delete a user. How should the app's HTTP requests be shaped?

A very common first instinct looks like this:

```text
GET  /getUser?id=42
GET  /deleteUser?id=42
GET  /createUser?name=Ana&email=ana@example.com
GET  /updateUserName?id=42&name=Ana2
```

This *works*. But look at what's already going wrong:

1. **Every operation is its own made-up endpoint name.** `getUser`, `deleteUser`, `createUser`, `updateUserName` — there's no shared shape. The next person adding "suspend a user" has to invent yet another name (`suspendUser`? `disableUser`? `setUserStatus`?), and nothing tells them which convention to follow.
2. **Deleting and creating data through `GET` is actively dangerous.** Browsers, proxies, and crawlers can and do "revisit" or prefetch `GET` URLs automatically, assuming a `GET` is just *reading* something. A `GET /deleteUser?id=42` link sitting in a browser's history or getting prefetched can delete a real user with zero user action.
3. **Nothing about the URL structure itself is predictable.** You can't guess `updateUserEmail`'s shape from having seen `updateUserName` — every endpoint is a one-off you have to go read the code (or docs) to understand.

**REST (REpresentational State Transfer)** is the fix for exactly this: instead of inventing a new endpoint name per operation, you name the *thing* (the "resource" — here, a user) once as a URL, and let the HTTP *method* say what you're doing to it:

```text
GET    /api/v1/users/42       read user 42
POST   /api/v1/users          create a new user
PUT    /api/v1/users/42       replace user 42's data
PATCH  /api/v1/users/42       change part of user 42's data
DELETE /api/v1/users/42       delete user 42
```

Now there's exactly one URL per resource (`/users/{id}`), and the operation is expressed by the *verb* (`GET`/`POST`/`PUT`/`PATCH`/`DELETE`), not by inventing a new path name. Anyone who's seen this pattern once can guess the shape for a brand-new resource, like `/api/v1/orders/17`, without being told anything extra.

This doesn't mean every single action must be forced into a noun. Some operations are genuinely commands, not resource edits — `POST /payments/{id}/capture` ("capture this payment") reads perfectly fine as a resource-flavored action. Consistency and clear semantics matter more than dogmatically avoiding every verb in a URL.

**One more piece of the REST idea worth knowing by name: statelessness.** It means the server doesn't remember anything about "the conversation so far" between one request and the next — each request must carry everything the server needs to handle it (like an auth token), rather than relying on the server having remembered something from three requests ago. This does *not* mean the server can't use a database or cache — it means the server's memory of *you as a client* doesn't persist between requests; only the data it's storing does.

## 2. HTTP Methods: Safe, and Idempotent

Two words get thrown around constantly with HTTP methods, and both make immediate sense once you hit the scenario that motivates them.

**Scenario: you tap "Delete User" in the app, the request goes out, and then your WiFi drops before you see a response.** Did the delete happen or not? Is it safe to just tap "Delete" again?

This is exactly what **idempotent** answers: *if I send the exact same request again, does it leave the system in the same state as sending it once?* `DELETE /users/42` is idempotent — the first call deletes user 42, and every repeat afterward still results in "user 42 doesn't exist," even if the second call now returns 404 instead of 200. Nothing bad happens by retrying it. Compare that to `POST /users` (create a new user) — if you retry that after a dropped connection, you might now have *two* new users instead of one, because each `POST` is treated as "create another one." That's why `POST` is **not** idempotent by default.

| Method | Idempotent? | Why |
|---|---|---|
| `GET` | Yes | Reading data twice returns the same data (barring changes from elsewhere) |
| `PUT` | Yes | "Replace with this exact representation" — replacing it again with the same data leaves the same result |
| `DELETE` | Yes | Deleted stays deleted, no matter how many times you ask |
| `PATCH` | Depends | `PATCH {"name":"Ana"}` repeated is fine; `PATCH {"op":"increment","amount":1}` repeated keeps incrementing — not idempotent |
| `POST` | No | Each call is usually treated as "create a new thing" |

**Safe** is a related but separate idea: *does this method intentionally change anything on the server at all?* `GET`, `HEAD`, and `OPTIONS` are "safe" — they're meant to only read, never write. This is why a `GET` that deletes data (from section 1's bad example) is a real problem: it breaks the promise every browser, proxy, and crawler on the internet already assumes about `GET`.

**So what do you do about `POST` not being idempotent, for something like a payment?** If a client's request times out and it doesn't know whether the payment went through, retrying a plain `POST /payments` risks charging twice. The fix is an **idempotency key**: the client generates a unique ID for "this attempt to pay," sends it with the request, and the server stores "I've already processed this exact key" — so a retry with the same key returns the original result instead of charging again.

One more nuance worth knowing: `PUT` means "replace this resource's representation entirely" — so what happens to a field you *don't* include? That's an API design decision (rejected, defaulted, or cleared to null), not something HTTP dictates universally. `PATCH` is different by design — it changes only the fields you name, so it needs its own explicit rule for "what does `null` mean vs. leaving a field out entirely."

## 3. Status Codes: What Actually Happened, and What Should the Client Do Next

A status code isn't just a number to memorize — it's the answer to "what happened, and what should I, the client, do about it?" Grouping them that way makes them far easier to hold onto:

**"It worked" (2xx):**
```text
200 OK              worked, here's the data you asked for
201 Created         worked, a new resource now exists — include its URL in a `Location` header
202 Accepted        I took the request, but the work isn't done yet (e.g. a slow export just started)
204 No Content      worked, nothing to send back (a common response for a successful DELETE)
```

**"You (the client) did something the server won't accept" (4xx):**
```text
400 Bad Request     the request itself is malformed — bad JSON, wrong shape
401 Unauthorized    you didn't prove who you are (missing/invalid credentials)
403 Forbidden       I know who you are, but you're not allowed to do this
404 Not Found       this resource doesn't exist (or we're hiding that it does)
409 Conflict        this collides with existing state — duplicate email, stale version
422 Unprocessable   the request was well-formed JSON, but the values inside it don't make sense
429 Too Many        you're sending requests faster than the rate limit allows
```

**"Something broke on the server's side" (5xx):**
```text
500 Internal Error  something unexpected failed — a bug, not a client mistake
503 Unavailable     temporarily can't serve this (overloaded, deploying, dependency down)
```

The most commonly confused pair is **401 vs. 403**, and the retry scenario makes the difference obvious: 401 means "I don't even know who you are — go log in." 403 means "I know exactly who you are, and the answer is still no." Never return 401 just because a business rule blocked an already-authenticated user — that's a 403.

One firm rule regardless of which code you pick: **never let a raw exception message, stack trace, or database error reach the client.** That leaks internal implementation details (and sometimes credentials or schema info) to whoever's calling your API. Log the real exception with a correlation ID (a unique ID you generate per request so you can find it in your logs later) and return a stable, generic error body instead — section 5 shows exactly how.

## 4. DTOs and Validation: Don't Let the Client Control Fields It Shouldn't

**Scenario:** your `User` entity has a `role` field (`"USER"` or `"ADMIN"`) that only an admin action should ever set. Your create-user endpoint accepts a JSON body and maps it straight onto that entity:

```java
@PostMapping
public User create(@RequestBody User user) {   // binding directly to the entity — the bug is right here
    return repository.save(user);
}
```

Nothing stops a caller from sending `{"name": "Ana", "email": "ana@example.com", "role": "ADMIN"}` and making themselves an admin on signup. This is called **mass assignment** — the client sets fields it should never have access to, simply because those fields exist on the entity you bound the request to.

**The fix is a DTO (Data Transfer Object)** — a plain class shaped exactly like the *input you're willing to accept*, with nothing extra:

```java
public record CreateUserRequest(
    @NotBlank @Size(max = 80) String name,
    @NotBlank @Email String email
    // no "role" field here — it simply cannot be set by this endpoint, by construction
) {}

public record UserResponse(Long id, String name, String email) {}

@PostMapping
public ResponseEntity<UserResponse> create(
        @Valid @RequestBody CreateUserRequest request) {
    UserResponse created = service.create(request);
    URI location = URI.create("/api/v1/users/" + created.id());
    return ResponseEntity.created(location).body(created);
}
```

Because `CreateUserRequest` has no `role` field, there is *nothing for a malicious caller to even set* — the DTO's shape is the security boundary. `@NotBlank`, `@Size`, and `@Email` are Bean Validation annotations checked automatically when `@Valid` is present; a request that fails one comes back as a 400 before your service code even runs.

DTOs solve a second problem too: they protect the *output* side. Returning your database entity directly to the client risks accidentally serializing an internal field, a password hash, or a lazily-loaded relationship that triggers a database error mid-response. `UserResponse` only ever contains what you deliberately chose to expose.

### When built-in validation isn't enough

`@NotBlank` and `@Email` only check simple, static rules. What about "status must be one of these three specific strings the business defines," or "endDate must come after startDate"? That needs real logic, so you write a custom constraint instead of stuffing that check into the service layer as an afterthought:

```java
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = AllowedStatusValidator.class)
public @interface AllowedStatus {
    String message() default "must be one of the allowed statuses";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class AllowedStatusValidator implements ConstraintValidator<AllowedStatus, String> {
    private static final Set<String> ALLOWED = Set.of("ACTIVE", "SUSPENDED", "CLOSED");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || ALLOWED.contains(value);   // null is valid here on purpose — see below
    }
}

public record UpdateUserRequest(@AllowedStatus String status) {}
```

Treat `null` as valid *inside* the custom validator, and pair it with a separate `@NotNull` when the field is actually required. That keeps "is it present at all" and "is it one of the allowed values" as two independent, composable checks, instead of tangling both rules into one validator. For a rule spanning multiple fields (like `endDate` after `startDate`), put `@Constraint` on the whole class instead of one field, and implement `isValid` against the entire object.

## 5. Pagination: You Can't Return a Million Rows at Once

**Scenario:** `GET /api/v1/users` needs to work whether there are 20 users or 20 million. Returning everything at once isn't an option — so the client asks for a *page* at a time.

The first instinct is **offset pagination** — `?page=3&size=20` means "skip the first 60 rows, give me the next 20":

```java
int safeSize = Math.min(Math.max(requestedSize, 1), 100);   // never trust the client's raw number
Set<String> allowedSorts = Set.of("name", "createdAt");
if (!allowedSorts.contains(sortField)) {
    throw new BadRequestException("Unsupported sort field");
}
```

Two things to notice in that snippet: the page size is clamped to a sane range (an unclamped `size=1000000` from a client is a real way to accidentally DoS your own database), and the sort field is checked against an explicit allowlist (letting a client sort by an arbitrary column name is a good way to leak internal schema or enable an injection-style attack).

Offset pagination is simple and lets you show a total row count and jump to "page 47" directly. But it has a real problem at scale: to get to page 5000, the database still has to walk past the first 4999 pages internally, which gets slow. Worse, if rows are being inserted while someone pages through results, the same row can shift between pages or get skipped entirely.

**Keyset pagination** fixes both: instead of "skip N rows," the client sends a cursor — the *value* of the last row it saw, like `(createdAt, id)` — and the query says "give me the next rows after this exact point," which stays fast no matter how deep you page, and doesn't shift under concurrent inserts. The one requirement: the ordering must be deterministic and unique (hence pairing `createdAt` with the tie-breaking `id`, since two rows can share a timestamp). The trade-off is you lose "jump straight to page 47" — you can only page forward/backward from where you are.

Use offset pagination when clients genuinely need random page access on a modest dataset (an admin table with a few thousand rows). Use keyset pagination for anything large or frequently changing (an activity feed, a public API over a big table).

## 6. Error Handling: One Consistent Shape for "It Went Wrong"

Section 3 said never leak a stack trace to the client — here's the actual mechanism. Spring's `@RestControllerAdvice` catches exceptions thrown anywhere in your controllers and translates them into one consistent HTTP response, in one place, instead of every controller method having its own try/catch:

```java
public record ApiError(
    String type, String title, int status, String detail, String instance) {}

@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(UserNotFoundException.class)
    ResponseEntity<ApiError> notFound(UserNotFoundException ex,
                                      HttpServletRequest request) {
        ApiError error = new ApiError(
            "https://example.com/problems/user-not-found",
            "User not found", 404, ex.getMessage(), request.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
}
```

This shape — `type`/`title`/`status`/`detail`/`instance` — mirrors **RFC 7807 Problem Details** (RFC = Request For Comments, the naming convention for official internet standards documents; this particular one standardizes "here's a consistent JSON shape for API errors" so clients don't have to guess your error format). You don't have to use this exact shape, but picking *one* consistent error contract for your whole API, instead of a different ad-hoc JSON shape per endpoint, is the actual point.

A validation failure (from section 4's `@Valid`) should include field-level detail — which field failed and why — so the client can point the user at the right form field. A truly unexpected exception (a null pointer, a database timeout) should be caught by a generic fallback handler: log the full exception internally with its correlation ID, and return the same generic, safe error body externally. The client never needs to see "NullPointerException at line 42" — it needs a stable shape it can handle in code, and a correlation ID support can use to find the real cause in your logs.

## 7. Caching and Conditional Requests

**Scenario:** a client fetches `GET /users/42` repeatedly (maybe polling for updates), but the data hasn't actually changed since the last fetch. Sending the full response body every single time wastes bandwidth for data the client already has.

An **ETag** (Entity Tag) is a short identifier the server generates for the *current version* of a representation — often a hash of the content. The client stores it, and on the next request sends `If-None-Match: <etag>`. If the server's current ETag still matches, it returns `304 Not Modified` with *no body at all* — the client already has the current version, so there's nothing to resend.

The same mechanism solves a second, different problem: **lost updates**. If two clients fetch user 42, both edit it, and both save — whoever saves second silently overwrites the first client's changes with no warning. Sending `If-Match: <etag-from-when-i-fetched-it>` on the update tells the server "only apply this if the data hasn't changed since I last read it." If someone else updated it in between, the server returns `412 Precondition Failed` instead of silently clobbering their change.

Two things worth being explicit about, since they're easy to conflate: caching rules must explicitly say what's cacheable and for how long — never let private, per-user data get cached as if it were public. And **CORS (Cross-Origin Resource Sharing)** — the browser mechanism that decides whether a webpage on one domain is allowed to call an API on another — is *only* a browser-enforced rule. It is not authentication and not authorization; a request from `curl` or a mobile app ignores CORS entirely, so real access control still has to happen at the server, regardless of what CORS allows or blocks in a browser.

## 8. Versioning: Changing an API Without Breaking Existing Clients

**Scenario:** your API has been live for a year, mobile apps out in the wild are calling it, and you now need to remove a field those old app versions don't expect.

The rule for whether a change needs a new version: **does it break a client who hasn't changed anything?** Removing a field, renaming a field, or changing what a field means — yes, that breaks anyone relying on the old shape. Adding a new *optional* response field is usually safe, since old clients that don't read it are unaffected.

Two common ways to version: **URL versioning** (`/api/v1/users`, later `/api/v2/users`) is easy to see in logs and easy to route differently at the infrastructure level, but bakes the version into every URL forever. **Header or media-type versioning** (`Accept: application/vnd.myapi.v2+json`) keeps URLs stable, but is harder to discover just by looking — nobody can tell which version a request used just by glancing at the URL in a log line. Either is fine; the real requirement is picking one policy, documenting when old versions get deprecated, and actually measuring how many clients are still on the old version before removing it.

Documentation matters here for the same reason: **OpenAPI** (a standard format for machine-readable API descriptions) lets you generate docs and, more importantly, run contract tests that fail your build if the implementation drifts from what you published — so "the docs say X but the API actually does Y" gets caught before a client does. A version number by itself doesn't make a contract stable; the compatibility rules you actually follow are what does.

## Interview Questions and Answers

### 1. Is `PATCH` idempotent?

**Answer:** Not inherently — it depends on the operation. `PATCH {"name":"Ana"}` is idempotent because repeating it leaves the same value. `PATCH {"op":"increment","amount":1}` is not, since repeating it keeps incrementing. The patch format and server behavior decide, not the method name alone.

### 2. `PUT` versus `PATCH`?

**Answer:** `PUT` replaces the entire representation at a URI and is idempotent. `PATCH` applies a partial change and may or may not be idempotent depending on what the change actually does. Either way, the API must explicitly define what an omitted field means versus an explicit `null`.

### 3. `401` versus `403`?

**Answer:** `401` means the request lacks valid authentication — the server doesn't know who's calling. `403` means the server knows exactly who's calling, and that caller isn't allowed to do this. Never use `401` just because a business rule rejected an already-authenticated user.

### 4. How would you make a payment endpoint safe to retry?

**Answer:** Require an idempotency key scoped to the account, enforce a unique database constraint on it, atomically claim the key together with a hash of the request, and return the originally stored result if the same key is retried. Return a conflict if the same key shows up with different request parameters.

### 5. How do you design pagination for millions of rows?

**Answer:** Use a bounded, clamped page size, a deterministic and uniquely-ordered sort, and keyset pagination with an opaque cursor for anything large or frequently changing. Validate sort fields against an explicit allowlist. Reach for offset pagination only when clients need direct random page access and the dataset stays modest in size.

### 6. Why use DTOs instead of binding directly to the entity?

**Answer:** A request DTO prevents mass assignment — a caller setting fields like `role` that only an internal process should control — simply because those fields don't exist on the DTO. A response DTO protects the API from persistence changes and avoids accidentally serializing internal fields or lazily-loaded relationships.

### 7. When do you return `202`?

**Answer:** When a request is accepted but the work isn't finished yet — starting an asynchronous export, for example. Return a status resource or polling URL so the client can check on completion rather than blocking the original request.

### 8. How should a generic, unexpected exception be handled?

**Answer:** Log it with full context and a correlation ID internally, return a stable and generic error body externally, never leak a stack trace or raw exception message, and map any *known* domain failures to their own specific status codes rather than letting everything fall through to a 500.

### 9. What is an `ETag` actually useful for?

**Answer:** Two things — cache validation via `If-None-Match` (skip resending unchanged data, returning `304` instead) and concurrency control via `If-Match` (reject an update if the resource changed since the client last read it, preventing a silent lost update).

### 10. REST or RPC-style endpoints?

**Answer:** Standard resource CRUD (Create, Read, Update, Delete) and HTTP-level caching benefit from REST's resource model. Command-heavy workflows (like "capture this payment") are often clearer as an explicit action endpoint. The choice should follow the domain, consistency, and client needs — not treating "REST" as a rule to force everything into.

### 11. When would you write a custom Bean Validation constraint instead of composing built-in ones?

**Answer:** When the rule needs real logic beyond a static check — membership in a business-defined set, comparing two fields against each other, or a lookup. Implement `ConstraintValidator`, treat `null` as valid inside it (pairing it with a separate `@NotNull` for "required"), and use a class-level constraint instead of a field-level one when the rule spans multiple fields.

## Revision Checklist

- [ ] Explain, using the messy `/getUser?id=42` example, why REST's "resource + HTTP verb" model is an improvement.
- [ ] Explain idempotent and safe using the dropped-connection retry scenario, not just the definitions.
- [ ] Design a CRUD API with the correct methods and status codes for each operation.
- [ ] Explain mass assignment and how a request DTO prevents it by construction.
- [ ] Compare offset and keyset pagination, and say when each one is the right choice.
- [ ] Design an error contract with correlation-ID logging that never leaks internals.
- [ ] Explain `ETag`, `If-None-Match`, and `If-Match` using the "wasted bandwidth" and "lost update" scenarios.
- [ ] Explain how to decide whether an API change needs a new version.
- [ ] Write a custom `ConstraintValidator` for a rule built-in annotations can't express.
