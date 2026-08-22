# Event Loop and Concurrency

The event loop is asked about in nearly every senior frontend interview because it's the mechanism behind two things you deal with daily: why your UI sometimes freezes, and why `console.log` order in async code is never "top to bottom." Understanding it precisely — not just "promises run before setTimeout" — is what separates a candidate who's memorized the punchline from one who can actually debug a jank issue in production.

## 1. JavaScript Is Single-Threaded — So How Does It Feel Concurrent?

JavaScript has exactly **one call stack** and can execute exactly one line of code at a time — there's no native multithreading in the language itself. Yet a real web app can fetch data, animate a spinner, respond to clicks, and run a countdown timer all while feeling responsive. That illusion of concurrency isn't produced by the JS engine (V8, SpiderMonkey) at all — it's produced by the **host environment** around it (the browser or Node.js), which is genuinely multithreaded, plus the **event loop**, which is the referee deciding when each pending piece of JS gets its turn on the one thread that actually runs your code.

```javascript
// A dashboard that must stay responsive while several things happen "at once"
fetchLatestOrders();                 // network call — handled off-thread
startClock();                        // setInterval — handled off-thread
searchInput.addEventListener('input', handleSearch); // waits for a real user event

console.log('Dashboard mounted');
```

None of `fetchLatestOrders`, the interval timer, or the click listener is actually running concurrently with your JS. Each one is registered with the browser's Web API layer, and the browser calls back into your single JS thread only when the call stack is empty and it's that callback's turn — which is exactly what the rest of this guide defines precisely.

## 2. The Call Stack, Execution Context, and Scope Chain

The **call stack** is a LIFO (last-in, first-out) structure: every function call pushes a new **execution context** on top, and returning pops it off. Each execution context bundles the function's local variables, its `this` binding, and a reference to its outer scope. Looking up a variable that isn't local walks that chain of outer-scope references — the **scope chain** — from the current function, out to any enclosing functions, out to the global scope, until it's found or a `ReferenceError` is thrown.

```javascript
function processCheckout(cart) {
    const total = calculateTotal(cart); // pushes calculateTotal onto the stack
    return applyDiscount(total);        // pushes applyDiscount onto the stack
}

function calculateTotal(cart) {
    return cart.reduce((sum, item) => sum + item.price, 0);
}

function applyDiscount(total) {
    const discountRate = 0.1; // only visible inside applyDiscount's own scope
    return total * (1 - discountRate);
}

processCheckout([{ price: 20 }, { price: 30 }]);
```

At the deepest point of this call, the stack reads `global → processCheckout → calculateTotal` (or `applyDiscount`), and that's exactly what a stack trace shows you when one of these throws. This matters practically in two ways: (1) if any of these functions run a genuinely long synchronous loop, **nothing else on the page can run** until it's popped off — no click handler, no repaint, no timer callback — because there's only one stack and one thread; and (2) a scope chain that has to walk through many nested closures to resolve a variable is a real (if usually minor) performance cost, and is why deeply nested callback pyramids are also a lookup-cost problem, not just a readability one.

## 3. Where Async Work Actually Runs: Web APIs and Background Threads

`setTimeout`, `fetch`, DOM event listeners, and file I/O are **not part of the JavaScript language or the V8 engine** — they're APIs the host environment provides. When you call `setTimeout(cb, 3000)`, the JS engine doesn't block for three seconds; it hands the timer off to the browser's own multithreaded infrastructure (in Node.js, `libuv`'s thread pool and event notification system) and immediately continues to the next line. The browser tracks the countdown on a separate thread, and only when the timer elapses does it place `cb` into a queue for the event loop to eventually run on the main JS thread.

```javascript
console.log('Requesting inventory sync');

fetch('/api/inventory/sync') // handed off entirely — network happens off the JS thread
    .then(res => res.json())
    .then(data => updateInventoryTable(data));

console.log('Inventory sync requested, UI stays interactive');
// A user can still scroll, click, and type while the network request is in flight —
// because that request was never occupying the single JS thread to begin with.
```

This is the real answer to "how is JS concurrent if it's single-threaded": it isn't, on its own. The browser is multithreaded, offloads the waiting part of async work to those other threads, and only ever schedules the callback's actual JS code back onto the one JS thread when it's ready to run — the event loop is what enforces that handoff.

## 4. Microtasks vs. Macrotasks — the Concrete Difference

Callbacks waiting to run on the main thread don't all sit in one queue — there are two, with different priority.

| | Microtask queue | Macrotask (task) queue |
|---|---|---|
| Goes here | `Promise.then/catch/finally` callbacks, `async/await` resumption points, `queueMicrotask()`, `MutationObserver` callbacks | `setTimeout`, `setInterval`, I/O completion callbacks, UI events (click, input), `postMessage` |
| Drain rule | **Fully drained** before the next step — if a microtask schedules another microtask, that one also runs before moving on | Exactly **one** task is taken per loop iteration, then control returns to check microtasks and rendering again |
| Effective priority | Always runs before the next macrotask, even a `setTimeout(fn, 0)` scheduled earlier | Always waits for the microtask queue to be completely empty first |

```javascript
console.log('1: sync start');

setTimeout(() => console.log('2: setTimeout (macrotask)'), 0);

Promise.resolve()
    .then(() => console.log('3: promise .then (microtask)'))
    .then(() => console.log('4: chained .then (microtask)'));

queueMicrotask(() => console.log('5: queueMicrotask (microtask)'));

console.log('6: sync end');

// Output:
// 1: sync start
// 6: sync end
// 3: promise .then (microtask)
// 5: queueMicrotask (microtask)
// 4: chained .then (microtask)
```

Walk it: both synchronous logs (`1`, `6`) run first, because the call stack always finishes before any queue is even checked. Then the microtask queue drains completely: the first `.then` runs and logs `3`, and *while draining* it schedules the second `.then` — that new microtask still finishes before the engine touches the macrotask queue, which is why `4` prints after `5`, not `2`. Only once the microtask queue is provably empty does the engine finally pull the `setTimeout` callback and log `2`. This is the single most common "predict the output" interview question, and the trap is always the same: people assume `setTimeout(fn, 0)` means "next," when it really means "after every microtask currently queued, including ones scheduled while draining."

One extra nuance worth knowing for a senior interview: `requestAnimationFrame` is often lumped in with macrotasks, but it isn't one — it's a separate callback list the browser runs once per rendered frame, right before style/layout/paint, and it's driven by the display's refresh rate rather than the task queue. And Node.js has its own extra queue, `process.nextTick`, which drains with even higher priority than promise microtasks — so in Node, ordering is `process.nextTick` queue → microtask queue → the relevant phase of the macrotask/event-loop phases (timers, poll, check, etc.).

## 5. The Event Loop Algorithm, Step by Step

The event loop is a continuously running process that repeats a fixed sequence:

```text
1. Run the call stack until it's empty (all synchronous code for this turn).
2. Drain the microtask queue completely — including any microtasks
   that get added while draining. Do not move on until it's empty.
3. If the browser needs to repaint (layout/style changed, and a frame is due),
   it paints here — after microtasks, before the next task.
4. Take exactly ONE task from the macrotask queue and push it onto the
   (now empty) call stack. Run it to completion.
5. Go back to step 1.
```

The step people get wrong most often is step 2's drain rule: microtasks aren't just "higher priority," they can **starve** everything else if misused. A recursive `.then()` that keeps re-scheduling itself will never let the microtask queue reach zero, which means the event loop can never reach step 3 or 4 — no repaint, no timers, no click handlers, ever, even though the call stack itself is technically "empty" between each microtask. This is a real production bug pattern (e.g., a retry-on-promise-rejection loop with no backoff that keeps chaining `.then` synchronously), and it's worse than a synchronous infinite loop in one way: it doesn't even show up as "one function running forever" in a profiler — it shows up as thousands of tiny microtask executions that never yield.

## 6. Why a Large Synchronous Loop Freezes the UI

This is the event loop concept made concrete as a symptom you've actually hit: click a button that triggers client-side processing over a large dataset — sorting 200,000 rows, re-parsing a huge JSON blob, computing a report — and the entire tab stops responding until it finishes. Scrolling doesn't work, the spinner you rendered a moment earlier doesn't even appear, clicks queue up silently. This isn't a bug in the browser; it's the direct, mechanical consequence of step 1 above: the call stack must be empty before the event loop will even check for rendering or run the next task, and a long synchronous function keeps the stack non-empty the entire time it runs.

```javascript
// PROBLEM: this blocks the main thread for as long as it takes to finish
function renderReport(rows) {
    showSpinner(); // this DOM change won't actually paint — see below
    const result = rows
        .filter(r => r.active)
        .map(computeRiskScore)   // expensive, synchronous, per row
        .sort((a, b) => b.riskScore - a.riskScore);
    renderTable(result);
    hideSpinner();
}
// showSpinner() only mutates the DOM — it doesn't force a paint. The browser
// won't get a chance to paint until the call stack empties, and the call
// stack doesn't empty until hideSpinner() has already run. Net effect: the
// spinner never visibly appears, and the tab is frozen the entire time.

// FIX: yield back to the event loop between chunks so the browser can
// paint and handle input between batches
function renderReportChunked(rows, chunkSize = 2000) {
    showSpinner();
    const filtered = rows.filter(r => r.active);
    let i = 0;
    const results = [];

    function processNextChunk() {
        const end = Math.min(i + chunkSize, filtered.length);
        for (; i < end; i++) {
            results.push(computeRiskScore(filtered[i]));
        }
        if (i < filtered.length) {
            setTimeout(processNextChunk, 0); // yields: lets the event loop
                                              // reach step 3 (paint) and run
                                              // any pending input events
        } else {
            results.sort((a, b) => b.riskScore - a.riskScore);
            renderTable(results);
            hideSpinner();
        }
    }
    processNextChunk();
}
```

`setTimeout(fn, 0)` doesn't run "immediately" — its entire value here is that it's a macrotask, so scheduling it forces the current chunk's function to return, which empties the call stack, which lets the browser paint and process queued input before the next chunk starts. For real workloads, the better fix is usually a **Web Worker** (moves the computation to an actual separate OS thread, so the main thread is never blocked at all and doesn't need to be chopped into artificial chunks) or `requestIdleCallback`/React's concurrent scheduling for lower-priority chunked work that should yield to anything more urgent. The chunking trick above is the manual version of what a scheduler does automatically.

## 7. React's Render/Commit/Effect Timing and the Event Loop

React's rendering pipeline is layered directly on top of the mechanics above, and interviewers ask this specifically to see if you understand *why* `useEffect` and `useLayoutEffect` differ, not just that they do. Render and commit are both plain synchronous JavaScript, running on the call stack like any other function call — React doesn't get any special scheduling privilege there. `useLayoutEffect` callbacks are flushed synchronously right after the DOM is mutated, **before** the browser is allowed to paint — they're still on the same call stack turn, which is why they can safely read/adjust layout (e.g., measuring a node's size) without a visible flash, but also why doing anything expensive in one blocks paint exactly like the loop in Section 6 does. `useEffect` (a "passive effect") is deliberately scheduled to run **after** the browser has painted — React hands it off using a mechanism that behaves like a macrotask (historically a `MessageChannel`-based scheduler), so it doesn't compete with or delay the paint the way a layout effect would.

```javascript
function OrderStatusBadge({ orderId }) {
    const [status, setStatus] = useState('loading');

    useLayoutEffect(() => {
        console.log('2: useLayoutEffect — runs before paint, same turn as commit');
    });

    useEffect(() => {
        console.log('4: useEffect — runs after paint, scheduled like a macrotask');
        fetchOrderStatus(orderId).then(s => {
            console.log('5: promise resolution inside useEffect (a microtask)');
            setStatus(s); // schedules another render
        });
    }, [orderId]);

    console.log('1: render — plain synchronous call stack work');
    return <span>{status}</span>;
}

// Full turn order for the initial mount:
// 1: render (call stack)
// 2: useLayoutEffect (call stack, same turn, before paint)
// --- browser paints here ---
// 4: useEffect (its own later task, after paint)
// 5: promise resolves as a microtask once fetchOrderStatus settles,
//    which then triggers a second render/commit cycle for the fetched status
```

The practical interview-relevant consequence: if you need to prevent a visual flash (measuring a DOM node and adjusting a style before the user ever sees the unadjusted version), you need `useLayoutEffect`, because `useEffect` runs strictly after paint — the user would see one frame of the "wrong" layout first. Conversely, doing expensive work (a fetch, a subscription, analytics) in `useLayoutEffect` is a real performance bug, because it blocks the paint the same way a long synchronous loop does; `useEffect` exists specifically so that category of work doesn't have to hold up what the user sees.

## Interview Questions and Answers

### 1. JavaScript is single-threaded — so how can a browser tab run a timer, a network request, and stay responsive to clicks all "at once"?

**Answer:** It can't, on the JS thread itself — there's only one call stack. The illusion comes from the host environment: the browser (or Node's `libuv`) is genuinely multithreaded and handles timers, network I/O, and event listening on its own threads, only pushing the resulting callback into a queue for the event loop to run on the single JS thread once it's free. `fetch`, `setTimeout`, and DOM listeners are Web APIs, not JS engine features.

### 2. What's the concrete difference between a microtask and a macrotask, and which runs first?

**Answer:** Microtasks (`Promise.then`, `async/await` resumption, `queueMicrotask`) always run before the next macrotask (`setTimeout`, `setInterval`, UI events), because the event loop fully drains the microtask queue — including any microtasks scheduled while draining — before it will pull even one macrotask. This is why `Promise.resolve().then(...)` logs before a `setTimeout(fn, 0)` scheduled earlier in the same script.

### 3. Predict the output: a script logs synchronously, schedules a `setTimeout(fn, 0)`, then a `Promise.resolve().then(fn)` that itself chains another `.then`, then logs synchronously again.

**Answer:** Both synchronous logs print first, in order, since the call stack always finishes before any queue is checked. Then the microtask queue drains fully — the first `.then` runs, and since it schedules a second `.then` while draining, that one also finishes before the engine moves on. Only after the microtask queue is completely empty does the `setTimeout` callback finally run.

### 4. Why does processing a large array synchronously (e.g., sorting 200,000 rows on a button click) freeze the entire tab, including a spinner you just rendered?

**Answer:** The call stack must be empty before the event loop will let the browser paint or process the next task — that's a hard ordering rule, not a performance heuristic. A long synchronous function keeps the stack occupied the whole time it runs, so a `showSpinner()` DOM mutation made just before it never actually gets painted, and clicks/scrolls queue up invisibly until the function returns.

### 5. How would you fix a UI freeze caused by a large synchronous computation, and what are the trade-offs between the options?

**Answer:** Break the work into chunks and yield between them with `setTimeout(fn, 0)` or `requestIdleCallback`, which forces the call stack to empty periodically so the browser can paint and handle input — simple, but adds overhead and complexity for manual chunking. The better fix for real CPU-bound work is a Web Worker, which runs on an actual separate OS thread so the main thread is never blocked at all; the trade-off is that workers can't directly touch the DOM and require message-passing to get data back.

### 6. What happens if a promise chain keeps rescheduling itself recursively (e.g., a retry loop with no backoff that always chains `.then`)?

**Answer:** It starves the event loop: the microtask queue must be fully drained before the loop can paint or run the next macrotask, so a microtask that keeps re-adding itself never lets that queue reach zero. The result is a frozen tab with no visible long-running function in a naive read of the call stack — a profiler shows thousands of tiny microtask executions back to back instead of one obvious infinite loop.

### 7. Does `setTimeout(fn, 0)` run "immediately"? Why is it still useful in the chunking pattern?

**Answer:** No — it still has to wait for the current call stack to finish and for the entire microtask queue to drain, and it's only guaranteed a minimum delay (commonly clamped to ~4ms after nesting), not zero. Its value in a chunking pattern isn't speed — it's that scheduling it forces the current function to return, which empties the call stack and lets the browser paint and handle pending input before the next chunk of work starts.

### 8. Why does `useLayoutEffect` need to exist separately from `useEffect` — isn't "after render" the same either way?

**Answer:** No — `useLayoutEffect` runs synchronously right after the DOM commit but before the browser paints, in the same call-stack turn, so it can measure or adjust layout with zero visible flicker. `useEffect` is deliberately deferred to run after paint (scheduled roughly like a macrotask), so if you used it to adjust layout, the user would briefly see one frame of the unadjusted state before the effect corrects it.

### 9. Why is it a performance mistake to do expensive work like a network call inside `useLayoutEffect`?

**Answer:** Because `useLayoutEffect` runs before the browser is allowed to paint, so any slow synchronous work inside it blocks the very next frame the user would see — mechanically the same problem as a long synchronous loop in Section 6. `useEffect` exists precisely so that category of work (fetches, subscriptions, logging) doesn't hold up paint, since it's scheduled to run only after the browser has already painted.

### 10. What's the scope chain, and why does it matter beyond just "closures work somehow"?

**Answer:** Every execution context keeps a reference to its outer scope, and looking up a variable that isn't local walks that chain outward — current function, enclosing function(s), then global — until it's found or a `ReferenceError` is thrown. It matters practically because a deeply nested callback structure has to walk further per lookup (a minor but real cost), and because it's the exact mechanism that explains why an inner function can still read a variable from an outer function after the outer one has already returned.

## Revision Checklist

- [ ] Explain why JS feels concurrent despite having one call stack — name the actual multithreaded layer doing the work (Web APIs / libuv).
- [ ] State the microtask-vs-macrotask priority rule precisely, including that a microtask scheduled while draining still runs before the next macrotask.
- [ ] Walk through a mixed `setTimeout` + chained `.then()` + `queueMicrotask` script and predict the exact output order.
- [ ] Explain, mechanically, why a large synchronous loop freezes the UI and why a spinner shown right before it never appears.
- [ ] Describe at least two real fixes for a blocking computation (chunking with a yield point, Web Worker) and the trade-off between them.
- [ ] Explain how a recursive microtask chain can starve the event loop without ever looking like an infinite loop in the call stack.
- [ ] Explain the timing difference between `useLayoutEffect` (before paint, same turn) and `useEffect` (after paint, macrotask-like), and give a real reason to pick each.
- [ ] Explain the scope chain and how it relates to variable lookup across nested execution contexts.
