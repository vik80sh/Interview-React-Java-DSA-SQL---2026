# REST API Design

REST is a style for designing network APIs around resources and HTTP semantics. A good interview answer connects a URL, method, status code, representation, validation rule, and failure behavior.

## 1. Resource Thinking

Prefer nouns in URLs and let the HTTP method describe the operation:

```text
GET    /api/v1/users/42       read a user
POST   /api/v1/users          create a user
PUT    /api/v1/users/42       replace a user
PATCH  /api/v1/users/42       partially modify a user
DELETE /api/v1/users/42       delete a user
```

`/getUser?id=42` is RPC-shaped. It can be valid, but it does not use HTTP's resource model as clearly. Some operations are naturally commands, such as `POST /payments/{id}/capture`; consistency and clear semantics matter more than forcing every action into a noun.

REST constraints include client-server separation, stateless requests, cacheability, a uniform interface, and layered systems. Stateless means the server does not rely on hidden conversational state between requests; it does not mean the application cannot use a database or cache.

## 2. HTTP Semantics

- **Safe** methods do not intentionally change server state: `GET`, `HEAD`, and `OPTIONS`.
- **Idempotent** means repeating the same request has the same intended effect as sending it once. `GET`, `PUT`, and `DELETE` are defined as idempotent, although a response can differ. `PATCH` may be idempotent or non-idempotent depending on its operation.
- `POST` is not inherently idempotent. Use an idempotency key when a client may safely retry a create or payment request.

`PUT` replaces the selected representation. Whether omitted fields are rejected, defaulted, or cleared is an API contract, not a universal HTTP rule. `PATCH` changes only named fields and must define null versus omitted behavior.

## 3. Status Codes That Communicate

```text
200 OK              successful request with a representation
201 Created         resource created; include Location when useful
202 Accepted        work accepted for asynchronous processing
204 No Content      successful operation with no response body
400 Bad Request     malformed syntax or invalid request shape
401 Unauthorized    no valid authentication credentials
403 Forbidden       authenticated but not allowed
404 Not Found       resource absent, or intentionally hidden
409 Conflict        state conflict, such as duplicate email or version mismatch
422 Unprocessable   syntactically valid but semantically invalid input
429 Too Many        rate limit exceeded
500 Internal Error  unexpected server failure
503 Unavailable     temporary inability to serve the request
```

Do not return stack traces or database messages to clients. Log the exception with a correlation ID and return a stable, safe error contract.

## 4. DTOs, Validation, and Pagination

```java
public record CreateUserRequest(
    @NotBlank @Size(max = 80) String name,
    @NotBlank @Email String email
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

Do not bind request JSON directly to an entity. Separate request DTOs prevent mass assignment, where a caller sets fields such as `role` or `approved` that the endpoint should control.

For list endpoints, validate page size and allowlist sortable fields:

```java
int safeSize = Math.min(Math.max(requestedSize, 1), 100);
Set<String> allowedSorts = Set.of("name", "createdAt");
if (!allowedSorts.contains(sortField)) {
    throw new BadRequestException("Unsupported sort field");
}
```

Offset pagination (`page` and `size`) is simple and supports total counts, but deep pages become expensive and can shift while rows are inserted. Keyset pagination uses a stable cursor, for example `(createdAt, id)`, and is usually better for large changing datasets. The ordering must be deterministic and unique.

## 5. Error Handling

Spring's `@RestControllerAdvice` centralizes translation from application exceptions to HTTP responses:

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

This resembles RFC 7807 Problem Details. Validation errors should include field-level details. The generic handler should log unexpected exceptions internally and return a generic message externally.

## 6. Caching and Conditional Requests

An `ETag` identifies a representation version. A client can send `If-None-Match`; if unchanged, the server returns `304 Not Modified`. For updates, `If-Match` can prevent overwriting a newer version and should produce `412 Precondition Failed` when it does not match.

Caching must declare what may be cached and for how long. Never cache private user data as public. Authentication and authorization still happen at the origin; CORS is only a browser enforcement mechanism and is not authorization.

## 7. Versioning and Documentation

Version when a change breaks existing clients, such as removing a field, changing its meaning, or changing a required request. Adding an optional response field is usually compatible. URL versioning (`/v1`) is easy to see and operate; header or media-type versioning keeps URLs stable but is harder to discover. Pick one policy, document deprecation dates, and measure remaining old clients.

Use OpenAPI for discoverability and contract tests to ensure implementation matches the published contract. A version number does not fix an unstable contract; compatibility rules do.

## Interview Questions and Answers

### 1. Is PATCH idempotent?

**Answer:** Not inherently. `PATCH {"name":"Ana"}` is usually idempotent because repeating it leaves the same value. An operation such as `PATCH {"op":"increment","amount":1}` is not. The patch format and server behavior decide.

### 2. PUT versus PATCH?

**Answer:** PUT replaces the representation at a URI and is idempotent. PATCH applies a partial change and may or may not be idempotent. The API must define omitted fields and null values explicitly.

### 3. 401 versus 403?

**Answer:** 401 means the request lacks valid authentication credentials. 403 means the server knows the caller but the caller lacks permission. Do not use 401 merely because a business rule rejects an authenticated user.

### 4. How would you make a payment endpoint retry-safe?

**Answer:** Require an idempotency key scoped to the merchant or account, enforce a unique database constraint, atomically claim the key with the request hash, and return the stored result for the same request. Return a conflict if the same key is reused with different parameters.

### 5. How do you design pagination for millions of rows?

**Answer:** Use a bounded page size, an indexed and deterministic ordering, and keyset pagination with an opaque cursor. Validate filters and sort fields. Use offset pagination when clients need random page access and the dataset is manageable.

### 6. Why use DTOs?

**Answer:** They protect the API from persistence changes, prevent clients from writing server-controlled fields, and avoid serialization of lazy relationships or sensitive fields.

### 7. When do you return 202?

**Answer:** When the request is accepted but work is not complete, such as starting an export. Return a status resource or polling location so the client can observe completion.

### 8. How should a generic exception be handled?

**Answer:** Log the exception with request or trace context, return a stable safe error body, avoid leaking stack traces, and map known domain failures to specific status codes.

### 9. What is an ETag useful for?

**Answer:** It supports cache validation with `If-None-Match` and concurrency control with `If-Match`, reducing bandwidth and preventing lost updates.

### 10. REST or RPC?

**Answer:** Resource CRUD and standard HTTP caching benefit from REST. Command-heavy workflows may be clearer as RPC-style endpoints. I choose based on the domain, consistency, observability, and client needs rather than treating REST as a slogan.

## Revision Checklist

- [ ] Design a CRUD API with correct methods and status codes.
- [ ] Explain safe versus idempotent and the PATCH nuance.
- [ ] Validate DTOs and prevent mass assignment.
- [ ] Design an error contract and correlation-ID logging.
- [ ] Compare offset and keyset pagination.
- [ ] Explain retries, idempotency keys, ETags, and versioning.
