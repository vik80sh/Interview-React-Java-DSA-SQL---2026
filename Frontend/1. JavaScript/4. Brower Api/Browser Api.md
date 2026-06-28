## 1. Fetch API

The `fetch()` API is the modern, Promise-based browser interface for making HTTP requests. It replaces the older, event-based `XMLHttpRequest`.

### Core Mechanics

* **Promises and HTTP Errors:** A `fetch()` promise **will not reject on HTTP error status codes** (like `404` or `500`). It only rejects if there is a network failure or if the request is blocked (e.g., CORS issues). To catch HTTP errors, you must manually check the `response.ok` boolean flag.
* **Two-Step Stream Consumption:** When `fetch()` resolves, it returns a `Response` object. At this point, only the HTTP headers have been fully downloaded. Reading the body (e.g., via `response.json()`) requires a second asynchronous step because the browser streams the response body data packets incrementally.

```javascript
async function loadUserData() {
  try {
    const response = await fetch('https://api.example.com/user');
    
    // Check for HTTP errors (4xx or 5xx)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Read and parse the incoming stream
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Network or parsing failed:", error);
  }
}

```

---

## 2. AbortController

`AbortController` is a built-in DOM API that allows you to cleanly cancel asynchronous operations, such as Fetch requests, DOM events, or custom promises, before they finish executing.

### How it Works

1. You instantiate an `AbortController`.
2. You pass its underlying `signal` object into an asynchronous operation (like `fetch`).
3. Calling `.abort()` on the controller instantly cancels the operation, causing the fetch promise to reject with an `AbortError`.

### Use Case: Auto-Canceling Stale Search Requests

When a user types quickly in an autocomplete search field, older API requests can return *after* newer ones, resulting in incorrect UI data. `AbortController` fixes this by canceling the previous request before kicking off a new one.

```javascript
let currentController = null;

async function handleSearchInput(query) {
  // If a previous request is still running, kill it immediately
  if (currentController) {
    currentController.abort();
  }

  // Create a new controller instance for the current request
  currentController = new AbortController();
  const { signal } = currentController;

  try {
    const response = await fetch(`/api/search?q=${query}`, { signal });
    const data = await response.json();
    renderResults(data);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Fetch successfully aborted safely.');
    } else {
      console.error('Actual network error:', error);
    }
  }
}

```

---

## 3. Cookies

Cookies are tiny strings of key-value text data (limited to roughly 4KB) stored inside the browser. Unlike `localStorage`, cookies are **automatically attached to the headers of every single HTTP request** sent to the issuing domain.

### Critical Security Attributes

When setting cookies via server response headers (`Set-Cookie`), specific flags must be used to protect application data:

* **`HttpOnly`:** Blocks JavaScript from reading the cookie via `document.cookie`. This prevents Cross-Site Scripting (XSS) attacks from stealing session tokens.
* **`Secure`:** Forces the cookie to be transmitted exclusively over encrypted HTTPS connections.
* **`SameSite`:** Controls whether cookies are sent along with cross-site requests, acting as a crucial defense against Cross-Site Request Forgery (CSRF) attacks.
* `Strict`: Never sends the cookie on cross-site requests.
* `Lax`: Sends cookies only when navigating *to* the origin site via standard top-level links.



---

## 4. IndexedDB

`IndexedDB` is a full-scale, transactional, object-oriented database embedded directly inside the browser environment. It is designed to handle massive volumes of structured data (including files, blobs, and images) and can scale to gigabytes of offline storage.

### Core Architecture

* **No SQL:** It stores data as JavaScript objects in simple key-value pairings inside collections called **Object Stores**.
* **Transactional:** Every single read or write query must run inside an explicit transaction block. If an error occurs halfway through a transaction, the entire sequence rolls back to keep data pristine.
* **Asynchronous & Event-driven:** The native API relies on legacy event listeners (`onsuccess`, `onerror`). In real-world projects, developers use thin wrappers like `idb` to interact with IndexedDB using clean `async/await` syntax.

```javascript
// Native IndexedDB boilerplate overview
const request = indexedDB.open("AppDatabase", 1);

// Run setup/migrations if database schema version upgrades
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  db.createObjectStore("users", { keyPath: "id" });
};

request.onsuccess = (event) => {
  const db = event.target.result;
  
  // To write data, you must follow the Transaction lifecycle:
  const transaction = db.transaction("users", "readwrite");
  const store = transaction.objectStore("users");
  
  store.put({ id: 101, name: "Alex", role: "Admin" });
  
  transaction.oncomplete = () => console.log("Transaction committed safely.");
};

```

---

## 5. Web Workers

JavaScript is single-threaded; it runs entirely on the main UI thread. If you run a massive mathematical calculation or parse an enormous dataset, the user interface will freeze entirely. `Web Workers` solve this by allowing you to spawn independent background execution threads.

### Architectural Constraints

* **Isolated Environment:** Web Workers run in a completely separate global scope (`DedicatedWorkerGlobalScope`). They have **zero access to the DOM, `window`, or `document**`.
* **Message Channel Communication:** The main thread and the worker thread communicate exclusively by exchanging asynchronous serialized data payloads via `postMessage()` and the `onmessage` event listener.

### Code Implementation

#### `main.js` (The UI Thread)

```javascript
const worker = new Worker('heavy-processor.js');

// Send data down to the worker thread
worker.postMessage({ numbersToParse: [1, 2, 3, 4, 5] });

// Listen for the calculated result back from the worker
worker.onmessage = (event) => {
  console.log("Calculated data received:", event.data.result);
};

```

#### `heavy-processor.js` (The Background Thread)

```javascript
// Listen for messages from the main thread
self.onmessage = (event) => {
  const { numbersToParse } = event.data;
  
  // Perform heavy operations without freezing the UI screen
  const result = numbersToParse.map(num => num * 42); 
  
  // Post the processed data back up to the main UI thread
  self.postMessage({ result });
};

```

---

## 📊 Summary Cheat Sheet

| API Component | Storage Capacity | Sync / Async | Access to DOM? | Primary Use Case |
| --- | --- | --- | --- | --- |
| **Fetch** | N/A | Async | Yes | Network communication and data fetching. |
| **AbortController** | N/A | Sync | Yes | Canceling requests or tearing down active event listeners. |
| **Cookies** | ~4KB max | Sync | No (if `HttpOnly` is active) | Session tokens and user authentication states. |
| **IndexedDB** | Gigabytes / Hard drive limits | Async | Yes | Caching complex client data and assets for offline use. |
| **Web Workers** | N/A | Async | ❌ **No** | Offloading expensive computation off the main execution thread. |