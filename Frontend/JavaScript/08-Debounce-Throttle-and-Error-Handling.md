# Debounce, Throttle, and Error Handling

Rate-limiting user-triggered events and handling failures cleanly are two of the most common "write it on a whiteboard" requests in a senior front-end interview — not because the code is hard, but because interviewers use them to check whether you actually understand timers, closures, and how errors propagate through async code, rather than just having memorized a snippet.

## 1. Debounce — Wait Until Activity Stops

Debounce delays invoking a function until a pause of at least `delay` ms has passed since the *last* call. Every new call cancels the pending timer and restarts the wait. It's the right tool when you only care about the final state after a burst of events — the classic case being a search-as-you-type box that shouldn't fire an API call on every keystroke.

```javascript
function debounce(fn, delay) {
  let timeoutId;

  return function debounced(...args) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(context, args);
    }, delay);
  };
}
```

```javascript
// REAL USE CASE: search-as-you-type that must not fire a request per keystroke
const searchInput = document.getElementById('search-box');
const resultsList = document.getElementById('results');

async function searchProducts(query) {
  if (!query.trim()) {
    resultsList.innerHTML = '';
    return;
  }
  const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
  const products = await response.json();
  renderResults(products);
}

const debouncedSearch = debounce(searchProducts, 400);

searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});

// User types "react hooks" (11 keystrokes) in under 400ms of typing rhythm.
// Only ONE network request fires, 400ms after the last keystroke — not 11.
```

If the user types "react hooks" quickly, each keystroke resets the timer. Only once they pause for 400ms does `searchProducts` actually run. This directly cuts backend load and avoids a race where an early "rea" response arrives after the later "react" response and overwrites the correct results (a bug you'd otherwise have to solve separately with request cancellation or a response-sequence check).

## 2. Throttle — Cap the Call Rate

Throttle guarantees a function runs at most once per `delay` ms, no matter how many times it's triggered in that window. Unlike debounce, it doesn't wait for silence — it fires on a steady cadence during continuous activity. This is the right tool for a `scroll` or `resize` listener, which can fire dozens of times per second and would tank performance if every single event recalculated layout.

```javascript
function throttle(fn, delay) {
  let lastCallTime = 0;
  let timeoutId = null;

  return function throttled(...args) {
    const context = this;
    const now = Date.now();
    const remaining = delay - (now - lastCallTime);

    if (remaining <= 0) {
      // Enough time has passed — run immediately (leading edge)
      lastCallTime = now;
      fn.apply(context, args);
    } else if (!timeoutId) {
      // Schedule a trailing call so the LAST event in a burst isn't dropped
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        timeoutId = null;
        fn.apply(context, args);
      }, remaining);
    }
  };
}
```

```javascript
// REAL USE CASE: recalculating a sticky-header/parallax layout on scroll
function updateStickyHeaderState() {
  const scrollY = window.scrollY;
  header.classList.toggle('is-condensed', scrollY > 120);
  progressBar.style.width = `${(scrollY / document.body.scrollHeight) * 100}%`;
}

const throttledScrollHandler = throttle(updateStickyHeaderState, 100);

window.addEventListener('scroll', throttledScrollHandler, { passive: true });

// A fast scroll fires the native 'scroll' event 60+ times per second.
// throttledScrollHandler runs updateStickyHeaderState at most every 100ms,
// so layout math and style writes happen ~10x/sec instead of ~60x/sec.
```

Without throttling, the scroll handler runs on every frame the browser can fire the event, forcing repeated layout reads/writes and visibly janking the page on lower-end devices. Throttling caps that to a fixed cadence while still keeping the UI responsive.

## 3. Leading vs Trailing Edge Execution

This is the detail that separates a memorized snippet from real understanding, and it's a near-guaranteed follow-up question.

- **Leading edge**: the function fires immediately on the *first* call, then ignores subsequent calls until the window elapses. Good for "fire an action the instant the user starts something" (e.g., disabling a submit button the moment it's clicked, before a debounce-style cooldown).
- **Trailing edge**: the function fires *after* the wait period, using the arguments from the *last* call seen during that period. This is what the basic `debounce` above does, and what the `throttle` above does when calls keep arriving faster than `delay`.
- Some implementations (lodash's `debounce`/`throttle`) support both simultaneously via `{ leading, trailing }` options — e.g., a button click handler that responds instantly on the first click (leading) but also processes the final click if more came in during the cooldown (trailing), so no user action is silently swallowed.

```javascript
// Debounce with a leading-edge option — useful for "act now, then settle"
function debounce(fn, delay, { leading = false } = {}) {
  let timeoutId;
  let calledOnLeadingEdge = false;

  return function debounced(...args) {
    const context = this;

    if (leading && !timeoutId) {
      fn.apply(context, args);
      calledOnLeadingEdge = true;
    }

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!leading || !calledOnLeadingEdge) {
        fn.apply(context, args);
      }
      calledOnLeadingEdge = false;
    }, delay);
  };
}
```

The throttle implementation in Section 2 is already a leading-plus-trailing hybrid: it runs immediately when enough time has passed (leading), and schedules exactly one trailing call to capture the final event of a burst that would otherwise be dropped. A throttle with *only* leading-edge behavior (no trailing timeout) is simpler but has a real bug for scroll/resize use cases: if the user stops scrolling mid-window, the very last scroll position never triggers a recalculation, leaving the UI in a stale state until the next scroll event happens to occur.

## 4. try / catch / finally in JavaScript

The core semantics mirror most languages, but a few JS-specific behaviors are common trip-ups.

```javascript
function parseUserPreferences(rawJson) {
  let preferences;
  try {
    preferences = JSON.parse(rawJson);
  } catch (error) {
    // JSON.parse throws a SyntaxError on malformed input
    console.error('Malformed preferences, falling back to defaults:', error.message);
    preferences = { theme: 'light', notifications: true };
  } finally {
    // Runs whether parse succeeded or the catch block ran — good place for
    // cleanup that must always happen, like clearing a "loading" flag.
    analytics.track('preferences_load_attempted');
  }
  return preferences;
}
```

- `finally` always runs — on success, on a caught exception, and even if `try` or `catch` contains a `return`. The return value is computed first, `finally` runs, and only then does control actually leave the function — unless `finally` itself returns or throws, which silently overrides whatever `try`/`catch` decided.
- A `catch` block without a binding (`catch { ... }`) is valid when you don't need the error object — useful for a best-effort cleanup you intentionally want to ignore the reason for.
- Multiple distinct error types typically get disambiguated with `instanceof` inside a single `catch`, since JS has no multi-catch syntax like Java's `catch (A | B e)`.

```javascript
// try/catch/finally with async/await — the pattern that matters most in real apps
async function loadUserDashboard(userId) {
  showSpinner();
  try {
    const response = await fetch(`/api/users/${userId}/dashboard`);
    if (!response.ok) {
      throw new Error(`Dashboard request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    // A rejected fetch() promise (network down, CORS, DNS failure) AND a
    // manually thrown Error above both land here — await turns a promise
    // rejection into a thrown exception, so ordinary try/catch just works.
    console.error('Failed to load dashboard:', error);
    showErrorBanner('Could not load your dashboard. Please retry.');
    return null;
  } finally {
    // Always runs — success, thrown error, or early return above.
    hideSpinner();
  }
}
```

The key insight interviewers probe for: `await` converts a rejected promise into a synchronously-thrown exception at that line, which is exactly what makes `try/catch` around `await` work the same way it works around any synchronous throwing call. Without `await` (i.e., handling the promise with raw `.then()`), a `try/catch` wrapped around the promise-returning call catches nothing, because the rejection happens asynchronously, after the `try` block has already finished executing.

## 5. Custom Error Subclasses for a Real Fetch Wrapper

A flat pile of generic `Error` throws forces every caller to string-match `error.message`, which is brittle and unmaintainable. A small typed hierarchy lets calling code branch on *what kind* of failure occurred and respond appropriately — retry, show a form-field message, redirect to login, etc.

```javascript
// Base class — never thrown directly, just a shared type to catch against
class AppError extends Error {
  constructor(message, options = {}) {
    super(message, options); // options.cause is preserved by native Error (ES2022)
    this.name = this.constructor.name;
    // Restores the prototype chain correctly when targeting older transpile
    // configs where extending built-ins can otherwise break instanceof.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class ValidationError extends AppError {
  constructor(message, fieldErrors = {}) {
    super(message);
    this.fieldErrors = fieldErrors; // e.g. { email: 'Invalid email format' }
  }
}

class NetworkError extends AppError {
  constructor(message, { cause } = {}) {
    super(message, { cause });
  }
}

class HttpError extends AppError {
  constructor(message, status, body) {
    super(message);
    this.status = status; // e.g. 404, 500
    this.body = body;
  }
}

class UnauthorizedError extends HttpError {
  constructor(body) {
    super('Session expired or unauthorized', 401, body);
  }
}
```

```javascript
// A fetch wrapper that turns every failure mode into a typed error
async function apiFetch(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (cause) {
    // fetch() itself rejects only for network-level failures — offline,
    // DNS failure, CORS block — never for HTTP error status codes.
    throw new NetworkError(`Network request to ${url} failed`, { cause });
  }

  if (response.status === 401) {
    throw new UnauthorizedError(await safeParseJson(response));
  }

  if (!response.ok) {
    throw new HttpError(
      `Request to ${url} failed with status ${response.status}`,
      response.status,
      await safeParseJson(response)
    );
  }

  return response.json();
}

async function safeParseJson(response) {
  try {
    return await response.json();
  } catch {
    return null; // body wasn't valid JSON — don't let that mask the real error
  }
}
```

```javascript
// Calling code branches on the specific subtype, not on message string-matching
async function submitSignupForm(formData) {
  try {
    if (!formData.email.includes('@')) {
      throw new ValidationError('Invalid form input', { email: 'Enter a valid email' });
    }
    await apiFetch('/api/signup', { method: 'POST', body: JSON.stringify(formData) });
  } catch (error) {
    if (error instanceof ValidationError) {
      renderFieldErrors(error.fieldErrors);
    } else if (error instanceof UnauthorizedError) {
      redirectToLogin();
    } else if (error instanceof NetworkError) {
      showToast('You appear to be offline. Please check your connection.');
    } else if (error instanceof HttpError) {
      showToast(`Server error (${error.status}). Please try again later.`);
    } else {
      throw error; // Truly unexpected — let it surface rather than swallow it
    }
  }
}
```

Two details matter here for a senior interview: passing the original failure via `{ cause }` (native since ES2022) preserves the real root cause the same way exception chaining does in Java, and `Object.setPrototypeOf` (or targeting ES2015+ output without downleveling) is necessary because transpiling `class X extends Error` down to old ES5 output can silently break `instanceof` checks — a real, easy-to-hit footgun with Babel/TypeScript configs that target old runtimes.

## 6. Unhandled Promise Rejections

If a promise rejects and nothing calls `.catch()` (or an `await` inside a `try/catch`) on it, the rejection doesn't just vanish — it becomes an "unhandled rejection," and in Node this can even crash the process depending on configuration. Production apps need a last-resort handler for these, the same way you'd want a global error boundary for synchronous errors.

```javascript
// Browser
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  logToMonitoring({
    type: 'unhandledrejection',
    message: event.reason?.message ?? String(event.reason),
    stack: event.reason?.stack,
  });
  // event.preventDefault() suppresses the default browser console warning —
  // only do this once you've actually handled/reported it yourself.
  event.preventDefault();
});

// A rejection that reaches this handler, because nobody awaited or .catch()'d it:
function loadAnalyticsBeacon() {
  fetch('/api/analytics/beacon', { method: 'POST' }); // fire-and-forget, no .catch()
}
// If this fetch rejects (network blip), it surfaces via 'unhandledrejection'
// instead of silently disappearing — which is exactly why it should be caught:
function loadAnalyticsBeaconSafely() {
  fetch('/api/analytics/beacon', { method: 'POST' }).catch((error) => {
    console.warn('Analytics beacon failed (non-critical):', error);
  });
}
```

```javascript
// Node.js equivalent
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection:', reason);
  logToMonitoring({ type: 'unhandledRejection', reason });
});

process.on('uncaughtException', (error) => {
  // Synchronous errors that escaped every try/catch — genuinely last resort.
  console.error('Uncaught exception, shutting down:', error);
  process.exit(1); // safest move: the process state may be corrupted
});
```

`window.onunhandledrejection` (the older property-assignment form) works too, but `addEventListener('unhandledrejection', ...)` is preferred because it composes with other listeners instead of overwriting them. This handler is a safety net for observability — logging and alerting — not a substitute for handling errors close to where they happen; relying on it as your primary error-handling strategy means every failure looks the same in your logs and you lose the context needed to actually fix anything.

## Interview Questions and Answers

### 1. What's the concrete difference between debounce and throttle, and how do you pick between them?

**Answer:** Debounce delays execution until calls stop arriving for `delay` ms, resetting the timer on every new call — it only cares about the final state after a burst, like a search box firing one request after the user pauses typing. Throttle guarantees execution happens at most once every `delay` ms regardless of how many calls arrive, which fits continuous streams like `scroll` or `mousemove` where you need periodic updates throughout the activity, not just at the end.

### 2. In your throttle implementation, why is a trailing-edge call necessary in addition to the leading-edge call?

**Answer:** A leading-edge-only throttle fires on the first event of a burst and then ignores everything until the window elapses, which means if activity stops mid-window, the very last event's data never gets processed. Scheduling a trailing timeout captures that final call so the UI reflects the true end state (e.g. the final scroll position), rather than freezing on stale data from the last leading-edge call.

### 3. Does `finally` run if the `try` block contains a `return` statement, and what's the one case where `finally` can silently override the outcome?

**Answer:** Yes — the return value is computed, `finally` executes, and only then does control leave the function. The overriding case is if `finally` itself contains a `return` or `throw`: that silently replaces whatever the `try`/`catch` was about to produce, which is why returning from `finally` is considered a footgun and generally avoided.

### 4. Why does wrapping an `await`ed call in `try/catch` work, but wrapping a `.then()`-chained call in the same `try/catch` doesn't catch anything?

**Answer:** `await` suspends the function and, when the awaited promise rejects, re-throws that rejection synchronously at the `await` line — so it behaves exactly like a normal thrown exception and a surrounding `try/catch` catches it. A `.then()` call, by contrast, schedules its callback for a future microtask; the `try` block has already finished executing by the time that rejection would occur, so there's nothing there left to catch it.

### 5. Why build a custom `Error` subclass hierarchy for a fetch wrapper instead of throwing plain `Error` with different messages?

**Answer:** Typed errors (`ValidationError`, `NetworkError`, `HttpError`, `UnauthorizedError`) let calling code branch with `instanceof` and respond correctly — redirect to login on `UnauthorizedError`, show field-level messages on `ValidationError`, show a generic retry toast on `NetworkError` — instead of fragile string-matching on `error.message`. It also lets each subtype carry structured data relevant to that failure mode, like an HTTP `status` or a `fieldErrors` map, which a flat `Error` has no natural place to hold.

### 6. What's the practical difference between `fetch()` rejecting and `fetch()` resolving with a non-2xx status?

**Answer:** `fetch()`'s returned promise only rejects for network-level failures — the request never completed at all, due to being offline, a DNS failure, or a CORS block. A 404 or 500 response is still a *successful* HTTP round trip as far as `fetch()` is concerned, so it resolves normally with `response.ok === false`; you have to check `response.ok` (or `response.status`) yourself and throw your own error if you want a bad status code to be treated as a failure.

### 7. What is an unhandled promise rejection, and what should a production app do about it?

**Answer:** It's a promise that rejected without any `.catch()` handler or an `await` inside a `try/catch` ever being attached to it — in the browser this fires a `window.unhandledrejection` event, and in Node it fires `process.on('unhandledRejection', ...)` (and can terminate the process depending on Node's configured behavior). A production app should attach a global listener as a last-resort safety net that logs the failure to monitoring, but it should not be the primary error-handling strategy, since by the time an error reaches that handler you've lost the specific context needed to recover or show a useful message to the user.

### 8. Why does `error.cause` (or manually attaching the original error) matter when wrapping errors in a fetch wrapper?

**Answer:** Without it, catching a low-level network failure and throwing a new `NetworkError` loses the original stack trace and underlying reason (e.g. "Failed to fetch" vs. a specific DNS error), leaving whoever debugs the log with only the wrapper's generic message. Passing it as `super(message, { cause })` (ES2022) preserves the full original error object on `.cause`, the same reasoning behind exception chaining with `super(message, cause)` in Java.

### 9. What's a real bug that `var` vs closures aside — leading-edge-only throttling — causes in a scroll handler, and how do you fix it?

**Answer:** If the throttle only fires on the leading edge, the layout recalculation runs at the start of each throttle window but the true final scroll position (reached after the user stops scrolling) never triggers a recalculation, leaving a sticky header or progress bar visually stuck one step behind. Adding a trailing-edge `setTimeout` that fires once more after the window closes — using the most recent arguments seen — fixes this by guaranteeing the last event is always eventually processed.

## Revision Checklist

- [ ] Implement debounce and throttle from scratch without looking them up, including the leading/trailing distinction.
- [ ] Explain why debounce fits a search input and throttle fits a scroll/resize listener, with the concrete cost each one avoids.
- [ ] Explain why `try/catch` works around `await` but not around a `.then()`-chained call.
- [ ] State the `finally`-with-`return` execution order and the return-from-`finally` footgun.
- [ ] Design a small custom `Error` hierarchy for a fetch wrapper and justify it over plain `Error` with different messages.
- [ ] Explain the difference between `fetch()` rejecting (network failure) and resolving with `response.ok === false` (HTTP error status).
- [ ] Wire up `window.onunhandledrejection` / `process.on('unhandledRejection', ...)` as a monitoring safety net, and explain why it shouldn't be the primary error-handling strategy.
- [ ] Preserve the original error via `{ cause }` when wrapping/rethrowing, the same way you would in a Java exception hierarchy.
