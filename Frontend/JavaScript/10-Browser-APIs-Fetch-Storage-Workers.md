# Browser APIs: Fetch, Storage, and Web Workers

Almost every frontend interview drifts into "how would you cancel a stale request," "where would you store this," or "how do you avoid freezing the UI" — and all three questions come back to Web APIs the browser gives JavaScript, not the language itself. Getting the mental model right here separates candidates who've shipped real apps from candidates who've only used these APIs in isolation.

## 1. Fetch API — Promises, Streaming Bodies, and Error Handling

`fetch()` is the modern, Promise-based interface for HTTP requests, replacing `XMLHttpRequest`. Two things trip people up in real code:

- **A `fetch()` promise does not reject on HTTP error status codes.** A `404` or `500` still resolves successfully — you get a valid `Response` object with `response.ok === false`. It only *rejects* on a network failure (DNS failure, connection refused, CORS block).
- **Reading the body is a second async step.** When the promise resolves, only the headers have arrived; the body streams in afterward, which is why `response.json()` / `response.text()` return their own promise.

```javascript
async function loadOrders(page) {
  let response;
  try {
    response = await fetch(`/api/orders?page=${page}`);
  } catch (networkError) {
    // DNS failure, dropped connection, CORS block — the request never completed
    throw new Error("Network unreachable, please retry.");
  }

  if (!response.ok) {
    if (response.status === 401) {
      redirectToLogin();
      return;
    }
    // The request completed, but the server rejected it — a 404/500 does NOT throw above
    throw new Error(`Failed to load orders: ${response.status}`);
  }

  const { orders, totalPages } = await response.json(); // second await: streamed body
  return { orders, totalPages };
}
```

Treating a `try/catch` around `fetch()` as "catches all errors" is the classic bug: a `500` from a broken endpoint sails right past the `catch` block and into your success path unless `response.ok` is checked explicitly.

## 2. AbortController — Canceling an In-Flight Search Request

`AbortController` cancels an in-progress async operation — most commonly a `fetch()` — by giving it a `signal` it listens to. Call `.abort()` and the operation rejects with an `AbortError` instead of resolving.

The textbook real-world case is a search-as-you-type box: a customer support dashboard's "search customers by name" field fires a request on every keystroke. If the user types `"jo"` then `"joh"`, the request for `"jo"` can resolve *after* the request for `"joh"` (slower network hop, server load) and overwrite the correct results with stale ones. The fix is to abort the previous request the moment a new one starts.

```javascript
let activeSearchController = null;

async function handleCustomerSearchInput(query) {
  // Kill whatever search is still in flight — its result would be stale anyway
  if (activeSearchController) {
    activeSearchController.abort();
  }

  activeSearchController = new AbortController();
  const { signal } = activeSearchController;

  try {
    const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`, { signal });
    if (!response.ok) throw new Error(`Search failed: ${response.status}`);
    const customers = await response.json();
    renderCustomerResults(customers);
  } catch (error) {
    if (error.name === "AbortError") {
      // Expected — a newer keystroke superseded this request. Not a real error.
      return;
    }
    showSearchError("Could not search customers right now.");
  }
}

searchInput.addEventListener("input", (e) => handleCustomerSearchInput(e.target.value));
```

`AbortController` isn't fetch-specific — the same `signal` can be passed to `addEventListener(type, handler, { signal })` to remove a listener, or checked manually inside a long-running custom async task (`signal.throwIfAborted()`), which is why it's the general cancellation primitive for async work in the browser, not just a fetch feature.

## 3. localStorage vs sessionStorage

Both are synchronous, string-only key-value stores on `window`, scoped per-origin, capped around 5-10MB depending on the browser. The difference is lifetime and scope:

- **`localStorage`** persists indefinitely — across tab closes, browser restarts, even OS reboots — until explicitly cleared, and is shared across every tab/window on the same origin.
- **`sessionStorage`** is scoped to a single tab: it survives a page reload in that tab, but a new tab (even to the same URL) gets a completely empty store, and closing the tab wipes it.

Real use case for each:

```javascript
// localStorage: a theme preference that should survive closing the browser entirely
function setTheme(theme) {
  localStorage.setItem("theme", theme); // "dark" or "light"
  document.documentElement.dataset.theme = theme;
}
// On app boot, before anything renders:
document.documentElement.dataset.theme = localStorage.getItem("theme") ?? "light";
```

```javascript
// sessionStorage: in-progress state for a multi-step checkout that shouldn't
// leak into a second tab or outlive this shopping session
function saveCheckoutStep(step, formData) {
  const checkout = JSON.parse(sessionStorage.getItem("checkout") ?? "{}");
  checkout[step] = formData; // e.g. checkout.shipping = {...}, checkout.payment = {...}
  sessionStorage.setItem("checkout", JSON.stringify(checkout));
}
// If the user opens a second tab to copy an address, that tab starts a fresh,
// empty checkout — exactly what you want, since a half-filled card number
// shouldn't silently appear in an unrelated tab.
```

Because both are synchronous and string-only, storing large or deeply nested objects blocks the main thread during `JSON.stringify`/`parse` and is capped well below what a real dataset needs — which is exactly the gap IndexedDB fills (Section 5).

## 4. Cookies and Security Attributes

Cookies are small (~4KB) key-value strings that, unlike `localStorage`, are **automatically attached to every HTTP request** sent to the issuing domain — that's what makes them the mechanism for server-side session auth, not a general storage tool. The server sets them via a `Set-Cookie` response header, and three flags control their exposure:

- **`HttpOnly`** — blocks `document.cookie` from reading it in JavaScript, so an XSS payload injected into your page can't steal the session token even if it can run arbitrary JS.
- **`Secure`** — the cookie is only ever sent over HTTPS.
- **`SameSite`** — controls whether the cookie is sent on cross-site requests; `Strict` never sends it cross-site, `Lax` sends it on top-level navigation (clicking a link in) but not on cross-site `fetch`/image requests, which is the standard CSRF defense.

```text
Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Lax; Max-Age=3600
```

A logged-in dashboard's session cookie set this way means: your JS bundle never sees the raw token (so a compromised third-party script can't exfiltrate it), the browser refuses to send it over plain HTTP, and a malicious site embedding `<img src="yourapp.com/api/delete-account">` can't ride the user's session to trigger it.

## 5. IndexedDB — A Real Client-Side Database

`IndexedDB` is a transactional, asynchronous, object-oriented database built into the browser, designed for structured data that's too large or too relational for `localStorage` — think gigabytes, not kilobytes, and objects/blobs, not just strings. This is the API most interview prep skips, but it's what actually powers offline-capable web apps (Notion's local cache, Figma's offline mode, any PWA that has to work on a flight).

Core architecture:

- **Object stores**, not tables — each store holds JS objects keyed by a `keyPath` (e.g. every record has an `id` field that IndexedDB indexes automatically).
- **Indexes** on top of a store let you query by a field other than the primary key (e.g. look up expenses by `synced` status without scanning every record).
- **Transactions** wrap every read/write; a `readwrite` transaction either commits completely or rolls back completely on error — there's no partially-applied write.
- **Versioned schema** — `onupgradeneeded` fires when you bump the version number, which is where you create/modify object stores and indexes, the same role a SQL migration plays.
- The native API is callback-based (`onsuccess`/`onerror`); real projects almost always wrap it in a thin Promise layer (the `idb` library is the de facto standard) instead of hand-rolling event listeners.

Real use case: a field-service or expense-tracking app that has to keep working without a network connection, then sync once connectivity returns.

```javascript
import { openDB } from "idb";

const dbPromise = openDB("ExpenseTracker", 1, {
  upgrade(db) {
    const store = db.createObjectStore("expenses", { keyPath: "id" });
    store.createIndex("by-synced", "synced"); // query "give me everything not yet synced"
  },
});

// Works offline: save immediately to IndexedDB, mark it unsynced
async function saveExpenseOffline(expense) {
  const db = await dbPromise;
  await db.put("expenses", { ...expense, id: crypto.randomUUID(), synced: false });
}

// Runs whenever connectivity returns (e.g. on a 'online' event)
async function syncPendingExpenses() {
  const db = await dbPromise;
  const unsynced = await db.getAllFromIndex("expenses", "by-synced", false);

  for (const expense of unsynced) {
    try {
      await fetch("/api/expenses", { method: "POST", body: JSON.stringify(expense) });
      await db.put("expenses", { ...expense, synced: true });
    } catch {
      break; // still offline or server down — stop and retry on the next 'online' event
    }
  }
}

window.addEventListener("online", syncPendingExpenses);
```

This pattern — write to IndexedDB immediately, sync opportunistically — is the backbone of "offline-first" apps: the UI never has to wait on a network round-trip to feel responsive, and no user-entered data is lost just because a field tech was in a basement with no signal.

## 6. Choosing a Client-Side Storage Mechanism

| Storage | Sync/Async | Typical Capacity | Sent to server automatically? | Persists across | Real use case |
|---|---|---|---|---|---|
| **`localStorage`** | Synchronous | ~5-10MB | No | Tab closes, browser restarts | Theme preference, "don't show this tip again" flags |
| **`sessionStorage`** | Synchronous | ~5-10MB | No | Page reloads in the *same* tab only | Multi-step checkout form state that shouldn't leak across tabs |
| **Cookies** | Synchronous (`document.cookie`), or invisible to JS if `HttpOnly` | ~4KB | **Yes** — attached to every matching request | Configurable via `Max-Age`/`Expires` | Session/auth tokens |
| **IndexedDB** | Asynchronous | Gigabytes (disk-quota-based) | No | Until explicitly cleared | Offline-capable structured data (drafts, cached records, file blobs) |

The decision in practice: does the *server* need this automatically on every request (cookie)? Is it a small flag/preference the UI reads synchronously on boot (`localStorage`)? Is it disposable, per-tab, in-progress form state (`sessionStorage`)? Or is it real structured data that needs to survive offline and outgrow a few kilobytes (IndexedDB)?

## 7. Web Workers — Threads, Message Passing, and What They Can't Do

JavaScript runs on a single main thread shared with layout, paint, and user input — a CPU-heavy task run there (a large computation, not a network wait) blocks scrolling, typing, and rendering for as long as it runs. A `Web Worker` spawns a genuine background OS thread running an **isolated** JS global scope (`DedicatedWorkerGlobalScope`), completely separate from the page.

**The message-passing model:** the main thread and the worker never share memory or variables directly. They exchange data exclusively through `postMessage()`, received via an `onmessage` (or `addEventListener("message", ...)`) handler on the other side. The data passed through `postMessage` is copied using the **structured clone algorithm** — a deep copy, not a live reference — so mutating an object on one side never affects the other side's copy. For large binary data (e.g. an `ArrayBuffer`), passing it as a **Transferable** hands ownership across without copying the bytes, which matters for performance on big payloads.

**What a Web Worker cannot do**, and why it matters in interviews:

- **No DOM access** — no `document`, no `window`, no direct element manipulation. This is deliberate: the DOM isn't thread-safe, so letting a worker touch it would reintroduce race conditions.
- **No access to the parent's variables or closures** — only what's explicitly sent via `postMessage`.
- **No `localStorage`/`sessionStorage`** — both are `window`-scoped and simply don't exist inside a worker (a common trick question: workers *can* use `fetch`, `IndexedDB`, `WebSocket`, and timers, but not the synchronous storage APIs).
- Calling `alert()`, `confirm()`, or anything UI-blocking inside a worker throws — there's no UI for it to block.

## 8. Web Workers in Practice — Parsing a Large CSV Off the Main Thread

A concrete case that comes up constantly: an analytics dashboard lets a user upload a multi-megabyte CSV export (say, a year of sales transactions) to see aggregated charts. Parsing and summing hundreds of thousands of rows on the main thread freezes scrolling and input for the whole page while it runs. Moving the parse into a Web Worker keeps the UI responsive and lets you report progress back incrementally.

```javascript
// main.js — the UI thread
const worker = new Worker("csv-parser-worker.js");

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  progressBar.value = 0;
  worker.postMessage({ type: "PARSE_FILE", file }); // File objects clone fine via postMessage
});

worker.onmessage = (event) => {
  const { type, payload } = event.data;
  if (type === "PROGRESS") {
    progressBar.value = payload.percent; // UI keeps updating smoothly while the worker churns
  } else if (type === "DONE") {
    renderSalesChart(payload.aggregatedByMonth);
  } else if (type === "ERROR") {
    showUploadError(payload.message);
  }
};

// If the user navigates away or uploads a new file mid-parse, stop the stale work
function cancelParsing() {
  worker.terminate();
}
```

```javascript
// csv-parser-worker.js — runs on its own background thread, no DOM access at all
self.onmessage = async (event) => {
  if (event.data.type !== "PARSE_FILE") return;

  const text = await event.data.file.text();
  const rows = text.split("\n");
  const totals = {}; // { "2026-01": 48213.50, ... }

  for (let i = 1; i < rows.length; i++) { // skip header row
    const [, date, amount] = rows[i].split(",");
    const month = date.slice(0, 7);
    totals[month] = (totals[month] ?? 0) + parseFloat(amount);

    if (i % 5000 === 0) {
      self.postMessage({ type: "PROGRESS", payload: { percent: Math.round((i / rows.length) * 100) } });
    }
  }

  self.postMessage({ type: "DONE", payload: { aggregatedByMonth: totals } });
};
```

Notice the worker never touches `progressBar` or the chart directly — it can't, since it has no DOM access. It only ever emits plain data through `postMessage`, and the main thread owns every actual UI update. That boundary is the entire point: the expensive loop runs off-thread, but rendering stays exactly where it has to.

## Interview Questions and Answers

### 1. Why doesn't a `fetch()` promise reject on a `404` or `500` response?

**Answer:** `fetch()` only rejects on a genuine network-level failure — DNS resolution failure, a dropped connection, or a CORS block — because from the browser's perspective the HTTP request-response cycle *completed successfully*; the server just returned an error status. You have to check `response.ok` (or `response.status`) explicitly, otherwise a `try/catch` around `fetch()` silently lets `4xx`/`5xx` responses flow into your success path.

### 2. Walk through how `AbortController` prevents a stale search result from overwriting a fresh one.

**Answer:** Each keystroke creates a new `AbortController`, and before doing so, the handler calls `.abort()` on whatever controller is still active from the previous keystroke. That makes the in-flight fetch for the old query reject with an `AbortError`, which the `catch` block recognizes and silently ignores, so only the response for the most recent query ever reaches `renderResults`. Without it, a slower earlier request can resolve after a faster later one and clobber the correct results on screen.

### 3. How do you decide between `localStorage`, `sessionStorage`, and a cookie for a given piece of data?

**Answer:** If the server needs the value automatically on every request, it has to be a cookie — that's the only one of the three the browser attaches to outgoing requests. If it's UI-only state that should survive closing the browser, use `localStorage` (a theme preference); if it's UI-only state that should be scoped to one tab and disposable (an in-progress checkout form), use `sessionStorage`. Cookies are also the only one that supports `HttpOnly`, which matters for anything security-sensitive like a session token.

### 4. Why is IndexedDB asynchronous while `localStorage` is synchronous, and why does that distinction matter?

**Answer:** `localStorage` reads/writes block the main thread, which is tolerable because it only ever holds small strings; IndexedDB is designed for large structured datasets (potentially gigabytes), so a synchronous API would freeze the page during any real query. Because IndexedDB is async and transactional, you can safely store and query large offline datasets — like a full local cache of records for a PWA — without janking scrolling or input while a query runs.

### 5. What can a Web Worker not do, and why is that restriction there?

**Answer:** A Web Worker has no access to the DOM, `window`, `document`, or `localStorage`/`sessionStorage`, and no access to the main thread's variables except what's explicitly passed via `postMessage`. The DOM restriction exists because the DOM isn't thread-safe — allowing a second thread to mutate it would reintroduce the exact race conditions single-threaded JS was designed to avoid.

### 6. What actually travels across `postMessage`, and how does a `Transferable` differ from a normal message?

**Answer:** A normal message is deep-copied via the structured clone algorithm — the receiving side gets an independent copy, so mutating it never affects the sender's original object. A `Transferable` (like an `ArrayBuffer`) instead hands ownership of the underlying memory to the other side with zero copying, which is why it's used for large binary payloads where copying would be expensive; the sending side loses access to it once transferred.

### 7. When would you reach for a Web Worker instead of just making something `async`?

**Answer:** `async`/`await` and Promises solve *I/O-bound* waiting — the main thread is free while a network request or timer is pending, because no CPU work is actually happening during the wait. A Web Worker solves *CPU-bound* work — a genuinely expensive synchronous computation, like parsing a huge CSV or running encryption, that would otherwise occupy the main thread's single execution context and freeze the UI regardless of how it's wrapped in a Promise.

### 8. What's the difference between a Web Worker and a Service Worker?

**Answer:** A Web Worker is a general-purpose background thread for offloading CPU-heavy computation, and it exists only as long as the page that created it is open. A Service Worker is a specialized worker that sits as a network proxy between the page, the network, and the cache — it can intercept `fetch` requests, serve cached responses offline, and keep running in the background even after the tab is closed, which is what powers PWA offline mode and push notifications; it isn't meant for arbitrary heavy computation.

### 9. If `HttpOnly` blocks JavaScript from ever reading a cookie, what's the actual security benefit?

**Answer:** It specifically defends against XSS: if an attacker manages to inject a malicious script into your page, that script runs with full JS privileges but still cannot read `document.cookie` for an `HttpOnly` cookie, so it can't exfiltrate the session token even though it can run arbitrary code. It's not a defense against every attack (CSRF still needs `SameSite`), but it closes off the most common path to session hijacking via injected scripts.

## Revision Checklist

- [ ] Explain why `fetch()` resolves on a `404`/`500` and why `response.ok` must be checked explicitly.
- [ ] Implement `AbortController` to cancel a stale in-flight request when a newer one starts (search-as-you-type).
- [ ] State the real distinction between `localStorage` and `sessionStorage` (persistence + tab scope), with a concrete use case for each.
- [ ] Explain what `HttpOnly`, `Secure`, and `SameSite` each protect against on a cookie.
- [ ] Describe IndexedDB's object store / index / transaction / versioned-upgrade model and a real offline-first use case for it.
- [ ] List what a Web Worker cannot access (DOM, `window`, `localStorage`) and why.
- [ ] Explain the `postMessage` structured-clone model versus a `Transferable` object.
- [ ] Distinguish a Web Worker (CPU offload, dies with the tab) from a Service Worker (network proxy, survives tab close).
