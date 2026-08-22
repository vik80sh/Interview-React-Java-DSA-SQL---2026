# Networking: HTTP, Cookies, Caching, and CORS

Every frontend engineer eventually debugs a "CORS error" or a stale bundle in production, and interviewers use these topics to check whether you understand what the browser is actually doing on the wire, not just which npm package fixes it.

## 1. HTTP Methods, Status Codes, and Headers That Matter

`GET`, `POST`, `PUT`, `PATCH`, and `DELETE` map to intent, not just verbs in a URL. `GET` and `DELETE` are idempotent — retrying them should not change the outcome again — which matters when a flaky network makes your `fetch` retry logic resend a request. `POST` is not idempotent, so a retried "place order" call can create a duplicate unless the backend is given an idempotency key. On the response side, the status code tells your UI code which branch to take before it even looks at the body: `2xx` render the data, `304` reuse the cache, `401` means "not logged in, redirect to login," `403` means "logged in, but not allowed, show a permission error," `429` means "back off," and `5xx` means "show a retry/error state, not a blank screen."

A realistic `fetch` wrapper that branches on status and headers, the way you'd write it in a production app with token-based auth:

```javascript
async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Access token expired mid-session; try one silent refresh, then bail to login.
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch(url, options);
    redirectToLogin();
    throw new Error('Session expired');
  }

  if (response.status === 403) {
    throw new Error('You do not have permission to do this');
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After') ?? 1);
    await sleep(retryAfter * 1000);
    return apiFetch(url, options);
  }

  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.status === 204 ? null : response.json();
}
```

`Content-Type` tells the server how to parse the body you sent; `Accept` tells it what format you want back; `Authorization` carries the bearer token or basic auth credential. Getting `Content-Type` wrong (for example, sending a JSON string with the default `text/plain` from a plain form submit) is one of the most common "why does my POST 400" bugs in real apps.

## 2. HTTP Caching: Cache-Control, ETag, and 304

`Cache-Control` on a response tells every cache in the path — the browser, a CDN edge, a proxy — who may store the response and for how long. `public` allows CDNs and browsers to cache it; `private` restricts caching to the end user's browser only, which is what you want for anything containing user-specific data; `no-store` forbids caching entirely; and `no-cache` is the confusing one — it does not mean "don't cache," it means "cache it, but revalidate with the server before reusing it."

When a cached response's `max-age` expires, the browser does not necessarily re-download the whole payload. It sends a conditional request with the validator it was given, and the server can reply with a `304 Not Modified` and an empty body:

```text
First response from the server:
HTTP/1.1 200 OK
ETag: "a1b2c3-v7"
Cache-Control: private, max-age=0, must-revalidate

Revalidation request the browser sends automatically once max-age elapses:
GET /api/v1/profile HTTP/1.1
If-None-Match: "a1b2c3-v7"

Server's response when the resource has not changed:
HTTP/1.1 304 Not Modified
ETag: "a1b2c3-v7"
```

`ETag`/`If-None-Match` compares a content hash; `Last-Modified`/`If-Modified-Since` compares a timestamp and is coarser (it can't tell two edits made within the same second apart). For an API endpoint that returns a large, rarely-changing payload — a user's settings object, a product catalog page — implementing `ETag` support turns a repeat `GET` into a near-free `304` instead of re-shipping the full JSON body every time.

## 3. Cache-Busting for Production Frontend Deployments

This is the caching problem every React/Vue/Angular deployment actually hits: you want your JS/CSS bundles cached for a year for speed, but you also need users to get your latest deploy immediately. Bundlers like Vite and Webpack solve this by putting a content hash in the filename, so the filename itself changes whenever the content does. You then apply two different `Cache-Control` policies:

```text
/assets/main.4b2c8e9f.js, /assets/styles.7a1d55e2.css
  Cache-Control: public, max-age=31536000, immutable
  -> Safe to cache forever: if the content ever changes, the filename changes with it.

/index.html
  Cache-Control: no-cache, must-revalidate
  -> Must be revalidated on every load (via ETag/304) because it references
     the current hashed filenames. Caching it "forever" would freeze users
     on your old deploy indefinitely, since they'd never re-fetch the HTML
     that points at the new bundle.
```

The `immutable` directive is a hint that skips even the revalidation check most browsers would otherwise do on refresh, since the hash guarantees the content can never change under that URL. Get the two policies backwards — cache `index.html` long and the assets short — and users silently get stuck running a stale build after every deploy.

## 4. Cookies and Secure Session Attributes

Cookies are the one piece of client storage the browser attaches to requests automatically, which is exactly why session cookies need explicit hardening. A typical login flow:

```text
POST /login  { "email": "...", "password": "..." }
  ->
HTTP/1.1 200 OK
Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400

Every subsequent request to the same site, the browser adds automatically:
GET /dashboard
  Cookie: session_id=abc123
```

Each attribute defends against a specific attack, not a generic "best practice":

- **`HttpOnly`** — makes the cookie invisible to `document.cookie`, so a stored-XSS payload injected into your app (a malicious `<script>` from an unsanitized comment field, say) cannot read the session ID and exfiltrate it. This is the single biggest reason session tokens belong in cookies rather than `localStorage` for apps worried about XSS.
- **`Secure`** — the browser will only ever send the cookie over HTTPS, so it can't leak in plaintext to anyone on the same coffee-shop Wi-Fi doing packet capture.
- **`SameSite`** — controls CSRF exposure. `Strict` never sends the cookie on a cross-site navigation (breaks flows like clicking a link from an email straight into a logged-in state). `Lax` (the modern default) sends it on top-level navigations but not on cross-site `POST`s or subresource loads, which blocks the classic CSRF pattern of an attacker's page auto-submitting a hidden form to your `/transfer-funds` endpoint. `None` sends it everywhere, including inside third-party iframes (needed for embedded widgets/SSO), but browsers require `Secure` alongside it or they reject the cookie outright.

If you've ever seen a login work in production but silently fail to persist in a QA environment served over plain HTTP, `Secure` on the cookie is almost always why.

## 5. The Same-Origin Policy

An origin is the triple `scheme + host + port`. `https://app.example.com` and `https://api.example.com` are different origins even though they share a parent domain; `https://app.example.com` and `http://app.example.com` are different origins because the scheme differs. The Same-Origin Policy (SOP) is the browser's default rule that JavaScript running on one origin cannot read data from another origin's responses.

Crucially, SOP restricts *reading*, not *loading*. `<img src="https://other-origin.com/pic.jpg">`, `<script src="...">`, and `<link rel="stylesheet">` all work cross-origin because the browser renders/executes them without handing the raw response bytes to your JavaScript. What SOP blocks is a `fetch()` or `XMLHttpRequest` call where your script tries to inspect the response body, headers, or status of a cross-origin request. A dashboard on `https://app.example.com` doing `fetch('https://api.example.com/orders')` is exactly the case SOP restricts by default, which is the entire reason CORS exists.

## 6. CORS and the Preflight Request

CORS is the mechanism a server uses to opt back into cross-origin access that SOP blocks by default, by sending headers that tell the browser "this specific origin, and these specific methods/headers, are allowed to read my response." The detail that trips up almost everyone in interviews:

**A CORS failure does not stop the request from being sent — it stops the browser from letting your JavaScript read the response.** If a React app on `https://app.example.com` does `fetch('https://api.example.com/orders', { method: 'POST', body: ... })` and the API doesn't send back `Access-Control-Allow-Origin: https://app.example.com`, the server still receives the `POST`, still runs its handler, and still creates the order in the database. The browser only blocks the response from reaching your `.then()`/`await` — you'll see a CORS error in the console and your code never sees a response, but the side effect already happened server-side. This is why "CORS error, so nothing happened" is a dangerous assumption to debug from; the fix is checking server-side logs/state, not just retrying the request.

Whether the browser sends a preflight depends on whether the request is a "simple request" (`GET`/`HEAD`/`POST` with only a small allowlist of headers and content types like `text/plain`, `application/x-www-form-urlencoded`, or `multipart/form-data`) or not. A JSON `POST` with `Content-Type: application/json`, or any request carrying a custom header like `Authorization` or `X-Request-Id`, is not "simple," so the browser sends an automatic `OPTIONS` preflight *before* your real request, asking permission:

```text
Preflight the browser sends automatically (your JS never sees this):
OPTIONS /orders HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type, authorization

Server's preflight response, granting permission:
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: content-type, authorization
Access-Control-Max-Age: 86400

Only after this succeeds does the browser send the real request:
POST /orders HTTP/1.1
Origin: https://app.example.com
Content-Type: application/json
Authorization: Bearer xyz123
```

If the endpoint needs to receive cookies cross-origin (a login-session cookie sent to `api.example.com` from `app.example.com`), two extra things are required on top of the above: the client must set `fetch(url, { credentials: 'include' })`, and the server must respond with `Access-Control-Allow-Credentials: true` plus an *exact* `Access-Control-Allow-Origin` value — the wildcard `*` is explicitly disallowed by browsers whenever credentials are involved, precisely because "any origin can read cookie-authenticated responses" would defeat the whole point of the Same-Origin Policy. `Access-Control-Max-Age` lets the browser cache the preflight result so it doesn't re-run the `OPTIONS` round trip on every single request for that duration.

## Interview Questions and Answers

### 1. What does CORS actually block?

**Answer:** CORS never stops the request from reaching the server; the server still processes it and any side effects (writes, emails, charges) still happen. What CORS blocks is the browser handing the response back to your JavaScript when the server didn't grant that origin permission. This is why a "CORS error" on a `POST` can still mean the resource was created — you have to check the server, not assume nothing happened.

### 2. When does the browser send a CORS preflight, and what is in it?

**Answer:** The browser preflights any request that isn't a "simple request" — most commonly a JSON `POST` (`Content-Type: application/json`) or any request with a custom header like `Authorization`. It sends an `OPTIONS` request with `Origin`, `Access-Control-Request-Method`, and `Access-Control-Request-Headers`, and only fires the real request if the server's response includes matching `Access-Control-Allow-*` headers.

### 3. Why doesn't `Access-Control-Allow-Origin: *` work with cookies?

**Answer:** Browsers require an exact origin in `Access-Control-Allow-Origin` plus `Access-Control-Allow-Credentials: true` whenever the request carries credentials (cookies or HTTP auth), and refuse the wildcard in that case. Allowing a wildcard with credentials would let any website read cookie-authenticated data from your API on a logged-in user's behalf, which is the exact cross-site data leak the Same-Origin Policy exists to prevent.

### 4. What is the difference between the Same-Origin Policy and CORS?

**Answer:** The Same-Origin Policy is the browser's default restriction that JavaScript on one origin cannot read responses from another origin. CORS is the opt-in mechanism a server uses to relax that restriction for specific origins, methods, and headers by sending `Access-Control-Allow-*` response headers. SOP is the lock; CORS headers are the key a server can hand out.

### 5. `HttpOnly` vs `Secure` vs `SameSite` on a cookie — what does each one actually stop?

**Answer:** `HttpOnly` stops JavaScript from reading the cookie via `document.cookie`, which blocks a successful XSS payload from stealing the session token. `Secure` stops the cookie from ever being sent over plain HTTP, which blocks network eavesdropping. `SameSite=Lax` or `Strict` stops the cookie from being attached to cross-site requests, which blocks CSRF attacks like an attacker's page silently submitting a form to your authenticated API.

### 6. What's the difference between `Cache-Control: no-cache` and `no-store`?

**Answer:** `no-cache` allows the response to be stored, but forces revalidation with the server (via `ETag`/`Last-Modified`) before it can be reused, so a match still returns a fast `304`. `no-store` forbids caching the response anywhere at all, which is what you'd set on a page showing a bank balance or a one-time payment token.

### 7. How would you set caching headers for a React production deployment?

**Answer:** Give hashed static assets (`main.4b2c8e9f.js`) `Cache-Control: public, max-age=31536000, immutable`, since the filename itself changes whenever the content does, so caching forever is safe. Give `index.html` `Cache-Control: no-cache, must-revalidate`, since it references the current hashed filenames and must be re-checked with the server on every load, otherwise users can get stuck on a stale deploy indefinitely.

### 8. 401 vs 403 — how should a frontend app react differently to each?

**Answer:** `401` means the request has no valid credentials, so the app should try a token refresh and, failing that, redirect to login. `403` means the credentials are valid but the user isn't allowed to do this, so the app should show a permission-denied state, not send the user back through login, since logging in again won't fix a permissions problem.

### 9. Why is `PUT` idempotent but `POST` is not, and why does that matter for retries?

**Answer:** `PUT` replaces a resource at a known URI, so sending it twice with the same body leaves the resource in the same state either way. `POST` typically creates a new resource each time it's called, so blindly retrying a failed `POST` (say, after a timeout where you don't know if it succeeded) can create a duplicate order or charge — which is why retry logic for `POST` needs an idempotency key rather than a naive resend.

### 10. Where does `ETag` help outside of static assets?

**Answer:** Any API `GET` endpoint with an expensive-to-render but infrequently-changing payload — a settings blob, a large list — can send an `ETag`, and the client's next request with `If-None-Match` gets back a cheap `304` instead of the full body when nothing changed. This saves both bandwidth and server render time compared to always returning `200` with the complete payload.

## Revision Checklist

- [ ] Explain idempotency and safe methods, and why it matters for retrying a failed `POST`.
- [ ] Branch UI behavior correctly on 401 vs 403 vs 429 vs 304.
- [ ] Explain `Cache-Control` directives: `public`, `private`, `no-cache`, `no-store`, `immutable`.
- [ ] Walk through an `ETag`/`If-None-Match` revalidation producing a `304`.
- [ ] Design the two-tier cache-busting policy for hashed assets versus `index.html`.
- [ ] Explain what `HttpOnly`, `Secure`, and each `SameSite` value actually defend against.
- [ ] State precisely what CORS blocks: response readability by JS, not request delivery to the server.
- [ ] Trace a real preflight `OPTIONS` request and explain why `Allow-Origin: *` fails with credentials.
