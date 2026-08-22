# Promises & Async/Await

Promises are the backbone of every real async operation in a JavaScript app — API calls, file reads, timers — and interviewers use them to check both whether you understand the underlying state machine and whether you can spot the concurrency bugs (serialized loops, swallowed rejections, all-or-nothing failures) that show up constantly in production code.

## 1. Promise States and the "Settle Once" Guarantee

A promise is an object representing the eventual result of an async operation. It starts `pending` and can move to exactly **one** final state — `fulfilled` (via `resolve(value)`) or `rejected` (via `reject(error)`) — and once it settles, it can never change state or settle again, no matter how many more times `resolve`/`reject` are called.

| State | Meaning | How you observe it |
|---|---|---|
| Pending | Operation still in flight | Neither `.then` nor `.catch` has fired yet |
| Fulfilled | `resolve(value)` was called | `.then()`'s success handler runs, or `await` returns `value` |
| Rejected | `reject(error)` was called | `.catch()` runs (or `.then()`'s second argument), or `await` throws `error` |

```javascript
function chargeCard(paymentGateway, order) {
  return new Promise((resolve, reject) => {
    paymentGateway.charge(order.total, (err, confirmation) => {
      if (err) {
        reject(new Error(`Payment failed for order ${order.id}: ${err.message}`));
        return;
      }
      resolve(confirmation);
    });

    // Some payment gateways retry their own webhook on a flaky connection and
    // can invoke this callback twice for the same charge. That's fine here --
    // once resolve()/reject() has been called once, the promise is settled.
    // A second call is silently ignored; .then() handlers never fire twice.
  });
}
```

This "settle once" guarantee is what makes promises safe to hand out to multiple consumers: several parts of the app can `.then()` off the *same* pending promise (e.g. a cached in-flight request), and every consumer is guaranteed to see the same single outcome exactly once, regardless of how many times the underlying async work tries to signal completion.

## 2. From Callback Hell to Promise Chaining

Before promises, composing dependent async steps meant nesting callbacks inside callbacks — each level adding indentation and its own ad-hoc error handling, since a callback has no way to propagate an error upward on its own.

```javascript
// Callback hell: fetch an order, then its shipment, then its tracking events
getOrder(orderId, (orderErr, order) => {
  if (orderErr) return handleError(orderErr);
  getShipment(order.shipmentId, (shipErr, shipment) => {
    if (shipErr) return handleError(shipErr);
    getTrackingEvents(shipment.trackingId, (trackErr, events) => {
      if (trackErr) return handleError(trackErr);
      renderTrackingTimeline(events); // 3 levels deep, 3 duplicated error paths
    });
  });
});
```

Promises fix this because `.then()` always returns a **new promise** — if the callback passed to `.then()` returns another promise, the chain automatically waits for it and flattens, instead of nesting:

```javascript
function getOrder(orderId) {
  return fetch(`/api/orders/${orderId}`).then(r => r.json());
}
function getShipment(shipmentId) {
  return fetch(`/api/shipments/${shipmentId}`).then(r => r.json());
}
function getTrackingEvents(trackingId) {
  return fetch(`/api/tracking/${trackingId}`).then(r => r.json());
}

getOrder(orderId)
  .then(order => getShipment(order.shipmentId))          // flattened, not nested
  .then(shipment => getTrackingEvents(shipment.trackingId))
  .then(events => renderTrackingTimeline(events))
  .catch(handleError); // ONE handler catches a failure from any step above
```

The chain reads top-to-bottom in the order the steps actually happen, and a single `.catch()` at the end catches a rejection from *any* preceding link — you no longer need per-level error branches.

## 3. Async/Await — Syntactic Sugar Over Promises

`async`/`await` (ES2017) doesn't replace promises; it's sugar over them, built on the same state machine. An `async function` always returns a promise (a plain returned value is wrapped in `Promise.resolve(value)`), and `await` pauses execution of that function — without blocking the main thread — until the awaited promise settles, then either returns its value or throws its rejection.

```javascript
// The chained version from Section 2, rewritten with async/await
async function renderOrderTracking(orderId) {
  try {
    const order = await getOrder(orderId);
    const shipment = await getShipment(order.shipmentId);
    const events = await getTrackingEvents(shipment.trackingId);
    renderTrackingTimeline(events);
  } catch (error) {
    handleError(error); // replaces the .catch() at the end of the chain
  }
}
```

Both versions run identically under the hood — same microtask scheduling, same promise objects — `async`/`await` just removes the `.then` nesting and lets you use ordinary control flow (`if`, `for`, `try/catch`) around asynchronous steps the same way you would around synchronous ones. This is why `await` is illegal outside an `async function` (or a module top level): the engine needs a suspendable function context to pause and resume.

## 4. Error Handling: try/catch Around await vs .catch()

A `try/catch` wrapping an `await` and a `.catch()` at the end of a `.then()` chain both handle a rejection, but they aren't quite interchangeable, and mixing them carelessly causes real bugs.

```javascript
// try/catch: catches a rejection from ANY awaited call inside the try block
async function loadOrderDetails(orderId) {
  try {
    const order = await getOrder(orderId);       // if this rejects...
    const shipment = await getShipment(order.shipmentId); // ...or this...
    return { order, shipment };
  } catch (error) {
    if (error instanceof TypeError) {
      // fetch() throws TypeError for network failures (DNS, offline, CORS)
      throw new Error('Network unavailable, please retry');
    }
    throw error; // re-throw anything else unchanged
  }
}
```

```javascript
// .catch() mid-chain: converts a rejection into a FULFILLED promise for what
// follows -- a common footgun if it's not the last link in the chain.
getOrder(orderId)
  .catch(error => {
    log.warn('Order lookup failed, falling back to cache', error);
    return getCachedOrder(orderId); // recovers -- downstream .then sees success
  })
  .then(order => getShipment(order.shipmentId)) // runs even if the first call failed
  .catch(error => handleError(error)); // catches anything still unhandled
```

The practical rule: `try/catch` around `await` is equivalent to attaching `.catch()` to the whole chain up to that point, so put it around exactly the awaits that should share a recovery path. A `.catch()` placed in the *middle* of a chain doesn't stop error propagation — it recovers the chain (turning rejection back into fulfillment) unless it re-throws, which is powerful for fallback logic but easy to trigger by accident. And a rejected promise that nobody ever `await`s or `.catch()`es fires an `unhandledrejection` (browser) or crashes the process by default in modern Node — "fire and forget" on a promise-returning function without a trailing `.catch()` is a real production bug, not a style nitpick.

## 5. Promise.all — Fetch a User and Their Orders in Parallel

`Promise.all()` takes an iterable of promises that are already in flight and resolves with an array of their results, in the same order they were passed, once **every** one has fulfilled. If any single promise rejects, `Promise.all()` rejects immediately with that error — it doesn't wait for or cancel the others, it simply stops caring about their outcome.

```javascript
// Real use case: a user-profile page needs the user AND their order history.
// Neither depends on the other's result, so there's no reason to fetch them
// one after another.
async function loadUserProfilePage(userId) {
  const [user, orders] = await Promise.all([
    fetch(`/api/users/${userId}`).then(r => r.json()),
    fetch(`/api/users/${userId}/orders`).then(r => r.json()),
  ]);
  return { user, orders };
}
```

If the orders request 404s, `Promise.all()` rejects immediately even though the user request already succeeded — appropriate here because a profile page that can show the user but silently has no idea whether the orders call failed or legitimately returned zero orders is worse than a clear error. Use `Promise.all()` when every result is required for the caller to do anything useful with the combined output.

## 6. Promise.race — Enforcing a Network Timeout

`Promise.race()` settles as soon as the **first** promise in the array settles — fulfilled or rejected — and ignores the rest. It's the standard way to bolt a timeout onto an API call that has no timeout option of its own.

```javascript
// Real use case: a checkout page can't let a slow payment-gateway call hang
// the UI indefinitely. Race the real request against a timer that rejects.
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

async function confirmPayment(paymentIntentId) {
  try {
    return await withTimeout(
      fetch(`/api/payments/${paymentIntentId}/confirm`, { method: 'POST' }),
      5000
    );
  } catch (error) {
    // Either the request failed OR it just didn't answer in time
    throw new Error('Payment confirmation failed or timed out, please retry');
  }
}
```

One real caveat: `Promise.race()` losing a race doesn't cancel the loser — the actual `fetch` keeps running in the background and its eventual result (or the memory it holds) isn't cleaned up just because you stopped waiting on it. For a real cancelable timeout, pair this pattern with an `AbortController` so the losing request is actually aborted, not just ignored.

## 7. Promise.allSettled — A Dashboard That Shouldn't Fail Entirely

`Promise.allSettled()` waits for every promise to settle — success or failure — and never itself rejects. It resolves with an array of `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }` objects, one per input, letting the caller decide how to handle partial failure instead of having `Promise.all()` decide for it (fail everything).

```javascript
// Real use case: an analytics dashboard renders several independent widgets.
// One widget's data source being down should never blank the whole page.
async function loadDashboard() {
  const results = await Promise.allSettled([
    fetchRevenueMetrics(),
    fetchTrafficMetrics(),
    fetchActiveAlertsCount(),
  ]);

  return results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return { widget: WIDGET_NAMES[i], data: result.value };
    }
    log.warn(`Widget ${WIDGET_NAMES[i]} failed to load`, result.reason);
    return { widget: WIDGET_NAMES[i], error: 'Unavailable' }; // render a fallback card
  });
}
```

Reach for `Promise.allSettled()` whenever the operations are independent and partial success is still a useful outcome to the user — the opposite situation from `Promise.all()`, where any single failure should abort the whole thing.

## 8. Promise.any — Racing Redundant Sources for the First Success

`Promise.any()` resolves as soon as the **first** promise fulfills, and ignores rejections unless *every* promise rejects — in which case it rejects with an `AggregateError` wrapping all the individual errors. It's the fulfillment-only counterpart to `Promise.race()`.

```javascript
// Real use case: a feature-flag config is replicated across three regional
// endpoints for availability. Query all of them and take whichever answers
// successfully first -- a single region being down shouldn't matter.
async function fetchFeatureFlags(userId) {
  try {
    return await Promise.any([
      fetch(`https://flags-us.internal/api/${userId}`).then(r => r.json()),
      fetch(`https://flags-eu.internal/api/${userId}`).then(r => r.json()),
      fetch(`https://flags-apac.internal/api/${userId}`).then(r => r.json()),
    ]);
  } catch (aggregateError) {
    log.error('All flag regions unreachable', aggregateError.errors); // .errors: array of causes
    return DEFAULT_FLAGS; // fail open with safe defaults
  }
}
```

The distinction to keep straight in an interview: `Promise.race()` returns whatever settles first, success or failure — a single fast-failing endpoint can "win" with an error. `Promise.any()` specifically waits for a *success*, only giving up once there's no possibility of one, which is the right behavior for redundant/fallback sources.

| Combinator | Settles when | Rejects when | Real use case |
|---|---|---|---|
| `Promise.all` | Every promise fulfills | Any single promise rejects (immediately) | Fetch a user + their orders — both required |
| `Promise.race` | The first promise to settle, either way | That first settlement is a rejection | Timeout pattern around a slow network call |
| `Promise.allSettled` | Every promise settles, success or failure | Never | Dashboard widgets — one failing shouldn't blank the page |
| `Promise.any` | The first promise to fulfill | Only if every promise rejects (`AggregateError`) | Redundant fallback endpoints — first success wins |

## 9. Sequential vs Parallel await — The Loop Bug

`await` only pauses the function it's written in; it doesn't automatically parallelize anything. The most common real-world bug is `await` inside a `for` loop over independent requests, which serializes work that had no reason to be sequential.

```javascript
// ❌ BUG: fetching details for 20 order IDs, one at a time
async function loadOrderDetailsSequential(orderIds) {
  const details = [];
  for (const id of orderIds) {
    const detail = await fetch(`/api/orders/${id}`).then(r => r.json()); // waits before starting the next
    details.push(detail);
  }
  return details;
  // 20 orders x 150ms each = ~3000ms, even though none of these requests
  // depend on each other's results
}

// ✅ FIX: start every request first, THEN await them together
async function loadOrderDetailsParallel(orderIds) {
  const requests = orderIds.map(id => fetch(`/api/orders/${id}`).then(r => r.json()));
  return Promise.all(requests);
  // All 20 requests fire immediately; total time is ~150ms (the slowest one),
  // not the sum of all of them
}
```

The fix is the same shape as the puzzle interviewers like to ask directly:

```javascript
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const taskA = delay(1000).then(() => 'A'); // timer starts now
  const taskB = delay(2000).then(() => 'B'); // timer ALSO starts now, concurrently

  console.log(await taskA); // waits ~1000ms, logs "A"
  console.log(await taskB); // taskB has already been counting down for 1000ms,
                             // so this only waits ~1000ms MORE, not 2000ms
  // Total elapsed: ~2000ms, not 3000ms, because both timers started together
}
```

The rule: **starting** an async operation (calling the function that returns a promise) is what kicks off the work; `await` only decides when *this* function pauses to wait for a result already in flight. Sequential `await` is only correct when a later call genuinely needs the previous call's result (e.g. paging through a cursor-based API, or deliberately throttling calls against a rate-limited endpoint) — for independent, fire-and-forget-able requests, kick them all off first and await them together with `Promise.all()`.

## Interview Questions and Answers

### 1. Why can a promise only settle once, and why does that matter in practice?

**Answer:** A promise starts pending and transitions to fulfilled or rejected exactly once; any further calls to `resolve`/`reject` are silently ignored. This matters because it makes promises safe to share — multiple consumers can `.then()` off the same in-flight promise and each is guaranteed to see one consistent outcome, even if the underlying operation's completion callback fires more than once (e.g. a flaky webhook retry).

### 2. How does promise chaining solve callback hell, mechanically?

**Answer:** Every `.then()` call returns a brand-new promise, and if the handler passed to `.then()` returns another promise, the chain automatically waits on it and flattens the result instead of nesting a new callback inside the previous one. That turns N levels of nested, individually-error-handled callbacks into a flat sequence of `.then()` calls with one `.catch()` at the end.

### 3. Is `async`/`await` faster than `.then()` chains?

**Answer:** No — they run identically under the hood, since `async`/`await` is syntactic sugar over the exact same promise machinery and microtask scheduling. The benefit is purely readability and control flow: ordinary `try/catch`, loops, and conditionals work around `await`ed calls the same way they do around synchronous code, which `.then()` chains can't offer as naturally.

### 4. What's the difference between catching an error with `try/catch` around `await` versus `.catch()` on the promise chain?

**Answer:** They're equivalent in effect for the awaits inside that specific `try` block — a `try/catch` around one or more `await`s behaves like a `.catch()` attached to the chain up to that point. The trap is `.catch()` placed in the middle of a chain: unless it re-throws, it converts the rejection back into a fulfillment for everything downstream, which is useful for fallback logic (e.g. serving cached data) but a real bug if you meant it to be the final error handler.

### 5. When would you use `Promise.all()` versus `Promise.allSettled()`?

**Answer:** Use `Promise.all()` when every result is required and a single failure should abort the whole operation — e.g. a profile page needing both the user and their orders, where showing one without knowing the other's status is worse than a clean error. Use `Promise.allSettled()` when the operations are independent and partial success is still useful, like dashboard widgets that should each render or fail on their own without blanking the whole page.

### 6. What's the actual difference between `Promise.race()` and `Promise.any()`?

**Answer:** `Promise.race()` settles on whatever finishes first, success or failure — so a fast-failing request can "win" with a rejection. `Promise.any()` specifically waits for the first *fulfillment* and only rejects (with an `AggregateError`) if every input promise rejects, which is the correct behavior for redundant fallback sources like regional API replicas where you want the first success, not just the first response.

### 7. What's wrong with `await`ing inside a `for` loop over independent requests, and how do you fix it?

**Answer:** Each `await` pauses the loop until that iteration's request finishes before the next one even starts, serializing requests that don't depend on each other and multiplying total latency by the number of items. The fix is to start every request first (e.g. via `.map()` to build an array of in-flight promises) and then await them together with `Promise.all()`, so the total time is roughly the slowest single request, not the sum of all of them.

### 8. If you forget to `await` or `.catch()` a promise-returning call, what actually happens?

**Answer:** The call still runs, but its result and any rejection are disconnected from the caller — if it rejects, that becomes an unhandled promise rejection, which logs a warning (or triggers an `unhandledrejection` event) in browsers and can crash the process by default in modern Node. This is a real "fire and forget" bug, not just a style issue, especially for calls with side effects the caller assumes completed successfully.

### 9. Does `Promise.all()` cancel the other requests once one of them rejects?

**Answer:** No. `Promise.all()` itself immediately rejects and stops waiting once any input rejects, but the other promises keep running to completion in the background — nothing about `Promise.all()` cancels them. If the underlying work needs to actually stop (e.g. an in-flight `fetch`), that requires wiring in something like `AbortController` separately.

## Revision Checklist

- [ ] Explain the three promise states and why a promise can only settle once, with a concrete scenario where that guarantee matters.
- [ ] Rewrite a nested callback pattern as a flat promise chain, and explain why `.then()` returning a new promise is what makes flattening possible.
- [ ] Explain why `async`/`await` is sugar over promises, not a separate concurrency system.
- [ ] Explain the difference between `try/catch` around `await` and `.catch()` on a chain, including the mid-chain recovery footgun.
- [ ] Pick the right combinator (`all`, `race`, `allSettled`, `any`) for a given scenario and justify it against the other three.
- [ ] Spot and fix the sequential-`await`-in-a-loop bug, and explain when sequential `await` is actually correct.
- [ ] Explain what an unhandled promise rejection is and when it can occur.
- [ ] Explain why `Promise.race()` and `Promise.all()` don't cancel the promises they stop waiting on.
