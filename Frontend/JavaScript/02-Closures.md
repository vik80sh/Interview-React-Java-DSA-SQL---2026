# Closures

Closures come up in almost every senior JS/React interview, either directly ("explain a closure") or disguised as a bug ("why does this log the wrong value?"). The important skill isn't reciting the definition — it's spotting closures in real code and predicting exactly what they capture.

## 1. What a Closure Actually Is

A closure is created every time a function is created, not just when it's returned. **Technical definition:** a closure is a function bundled together with a reference to its surrounding lexical scope. **Plain-English version:** an inner function keeps access to its outer function's variables even after the outer function has finished running.

Mechanically: every function call creates an execution context with its own Environment Record (variable name -> value). Normally, once the function returns, that context is popped off the call stack and garbage collected. But if an inner function was created inside it and is still reachable (returned, stored in a ref, passed as a callback), that inner function holds an internal `[[Environment]]` reference to the outer Environment Record — which keeps it alive in memory as long as the inner function itself is reachable.

```javascript
function makeIdGenerator(prefix) {
  let counter = 0;
  return function next() {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

const orderIdGen = makeIdGenerator("ORD");
orderIdGen(); // "ORD-1"
orderIdGen(); // "ORD-2" — counter kept its state between calls
```

`makeIdGenerator` returned long ago, but `next()` still reads and writes `counter` because it closed over `makeIdGenerator`'s Environment Record, not a snapshot of it. This is the piece people get wrong: a closure captures a **live binding**, not a copied value.

## 2. Real-World Example: Debounce Hook

Closures are the backbone of React hooks — because a function component re-runs from scratch on every render, hooks like `useRef` and `useEffect` rely entirely on closures to "remember" things across renders. A `useDebounce` hook is a real, project-grade example: it limits how often an expensive operation (an API search call) fires while the user is typing.

```jsx
import { useEffect, useRef } from "react";

export function useDebounce(callback, delay) {
  // A ref's box has a stable identity across renders; closures that read
  // latestCallback.current always see the newest function, never a stale one.
  const latestCallback = useRef(callback);

  useEffect(() => {
    latestCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    // The closure is born here: `handler` captures `latestCallback` by
    // reference. When the timer fires later, it looks up the current
    // value in that box rather than whatever callback existed at creation.
    const handler = (...args) => {
      latestCallback.current(...args);
    };

    const timerId = setTimeout(handler, delay);

    // The cleanup function is also a closure — it captures `timerId`
    // from this specific effect run.
    return () => clearTimeout(timerId);
  }, [delay]);
}

function SearchBox() {
  const [term, setTerm] = useState("");

  useDebounce(() => {
    if (term) fetch(`/api/search?q=${term}`);
  }, 500);

  return <input value={term} onChange={(e) => setTerm(e.target.value)} />;
}
```

Timeline: user types "A" -> a 500ms timer starts. User types "B" 100ms later -> the effect re-runs, its cleanup closure fires first and clears "A"'s timer, then a fresh timer starts for "B". This repeats on every keystroke. Only when the user stops typing for a full 500ms does the timer survive long enough to fire, so the expensive `fetch` runs exactly once per pause, not once per keystroke.

## 3. Real-World Example: Private State via the Module/Counter Pattern

Before ES2022 private fields (`#field`) existed everywhere, closures were the standard way to get true information hiding in JavaScript — a variable with no way to reach it except through the functions you expose. This still shows up in real code: rate limiters, request-id generators, simple in-memory caches.

```javascript
function createRateLimiter(maxRequests, windowMs) {
  let requestCount = 0;
  let windowStart = Date.now();

  return {
    tryRequest() {
      const now = Date.now();
      if (now - windowStart > windowMs) {
        windowStart = now;
        requestCount = 0;
      }
      if (requestCount >= maxRequests) {
        return false; // rejected — over the limit for this window
      }
      requestCount += 1;
      return true;
    },
  };
}

const limiter = createRateLimiter(5, 1000);
limiter.tryRequest(); // true
// requestCount and windowStart are not reachable from outside at all —
// no property on `limiter` exposes them, unlike a class field which is
// always visible on `this` even when documented as "private."
```

Nothing outside `createRateLimiter` can read or corrupt `requestCount` directly — there's no `limiter.requestCount` to reach into. That's a stronger guarantee than a class's `this.requestCount`, which is a real object property visible to anything holding the instance (until you use `#private` fields, which give the same guarantee a different way).

## 4. Real-World Example: Memoizing an Expensive Computation

A memoization cache is closures doing dependency injection: the returned function keeps a reference to a `Map` that lives in the outer scope, so repeated calls with the same input skip the expensive work entirely.

```javascript
function memoize(expensiveFn) {
  const cache = new Map();

  return function memoized(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = expensiveFn(...args);
    cache.set(key, result);
    return result;
  };
}

function computeShippingQuote(distanceKm, weightKg) {
  // simulate a costly calculation (e.g. calling a pricing engine)
  console.log("computing...");
  return distanceKm * 0.5 + weightKg * 1.2;
}

const quote = memoize(computeShippingQuote);
quote(100, 20); // logs "computing...", returns 74
quote(100, 20); // cache hit, no log, same result returned instantly
```

`cache` lives entirely inside `memoize`'s closure — every call to `quote(...)` reads and writes the exact same `Map` because both calls share the same closure over the same execution of `memoize`. This is the same mechanism `React.useMemo` and libraries like `lodash.memoize` rely on internally.

## 5. The Classic Bug: `var` in a Loop with `setTimeout`

This is the single most common closure interview question because it looks like a trivial loop but exposes a real misunderstanding of scoping that causes production bugs (e.g. attaching click handlers to a list of DOM rows and having them all report the last row's index).

```javascript
function attachClickHandlers(rows) {
  for (var i = 0; i < rows.length; i++) {
    rows[i].addEventListener("click", function () {
      console.log("Clicked row:", i); // BUG: always logs rows.length
    });
  }
}
```

`var` is function-scoped, so there is exactly **one** `i` binding shared by every closure created in the loop. By the time any click handler actually runs, the loop has already finished and `i` holds its final value (`rows.length`). All handlers read that same shared box.

Two real fixes:

```javascript
// Fix 1: let is block-scoped — a fresh `i` binding is created per iteration
for (let i = 0; i < rows.length; i++) {
  rows[i].addEventListener("click", function () {
    console.log("Clicked row:", i); // correct index, each closure has its own i
  });
}

// Fix 2 (pre-ES6 / general pattern): force a new scope per iteration with an IIFE
for (var i = 0; i < rows.length; i++) {
  (function (capturedIndex) {
    rows[capturedIndex].addEventListener("click", function () {
      console.log("Clicked row:", capturedIndex);
    });
  })(i);
}
```

`let`'s per-iteration binding is the standard fix today; the IIFE pattern is worth knowing because it's exactly how this bug was solved before `let` existed, and it explains *why* `let` works — it's doing that same "capture the current value in a new scope" trick automatically on every iteration.

## 6. The React-Specific Trap: Stale Closures in `useEffect`

The loop bug above has a direct React analog that catches people who otherwise understand closures fine in plain JS: an effect with an empty dependency array closes over the state from the render it was created in, and never sees updates.

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      console.log("count is", count); // always logs 0
    }, 1000);
    return () => clearInterval(timer);
  }, []); // runs once, closes over count === 0 forever

  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

Each render calls `Counter` fresh, creating a brand-new local `count` binding for that render. The effect with `[]` only ever runs after the *first* render, so the `setInterval` callback's closure is permanently locked onto that render's `count`, which is `0`. Clicking the button re-renders with a new `count`, but the interval callback from the first render never sees it — it's a different closure over a different binding entirely.

Fix by adding `count` to the dependency array (so the effect tears down and re-creates the interval with a fresh closure every time `count` changes), or by reading through a ref that's updated every render instead of a snapshot value:

```jsx
useEffect(() => {
  const timer = setInterval(() => {
    console.log("count is", count);
  }, 1000);
  return () => clearInterval(timer);
}, [count]); // fresh closure over the latest count each time it changes
```

The `useDebounce` hook in Section 2 sidesteps this exact trap by reading `latestCallback.current` instead of closing over `callback` directly — that's the production pattern for "I need the latest value inside a long-lived closure without re-running the whole effect."

## Interview Questions and Answers

### 1. What is a closure, in terms an interviewer will accept as precise?

**Answer:** A closure is a function paired with a reference to the lexical environment it was created in, so it can read and write variables from an outer scope even after that outer function has returned. It's created at function-creation time, not at return time — every function has a closure over its defining scope, it just isn't observable unless the function outlives its creator.

### 2. Does a closure capture a value or a variable?

**Answer:** A live variable binding, not a copied value. `makeIdGenerator`'s `next()` function keeps incrementing the same `counter` on every call precisely because it holds a reference to the actual binding, not a snapshot taken when `next` was created — which is also exactly why the `var i` loop bug happens.

### 3. Why did all three functions in the classic `var i` loop log the same final value?

**Answer:** `var` is function-scoped, so the loop creates one shared `i` binding for the entire function, and every closure created inside the loop body references that same binding. By the time any of the closures actually run, the loop has finished and `i` already holds its terminal value, so every closure reads that same final number.

### 4. How does changing `var` to `let` fix the loop bug, mechanically?

**Answer:** `let` is block-scoped, so the JavaScript engine creates a brand-new lexical binding for `i` on every iteration of the loop, and each closure created in that iteration captures its own private binding. It's functionally equivalent to wrapping each iteration in an IIFE that receives the current index as a parameter, which is the pattern used to fix this before `let` existed.

### 5. What is a "stale closure" in React, and how does `useDebounce`'s `useRef` avoid it?

**Answer:** A stale closure is a callback (typically inside `useEffect`, `setTimeout`, or `setInterval`) that closed over a piece of state or a prop from an earlier render and never sees later updates because the effect didn't re-run. `useDebounce` avoids this by having the long-lived closure read `latestCallback.current` — a ref whose box has a stable identity across renders — instead of closing over the `callback` argument directly, so a separate effect can keep that box updated on every render without needing to recreate the timer.

### 6. Give a real use of closures for private state, and say why it's stronger than a class field.

**Answer:** A rate limiter or counter created by a factory function (`createRateLimiter`) keeps its internal counters as local variables in the factory's scope, exposed only through the methods it returns. Unlike `this.count` on a class instance, which is a real, always-visible property on the object, there is no property path that reaches the closed-over variable from outside — nothing to enumerate, log, or accidentally mutate.

### 7. How does a memoization cache use closures?

**Answer:** `memoize(fn)` creates one `Map` in its own scope and returns a wrapper function that closes over that same `Map`. Every call to the wrapper reads and writes the identical cache because all calls share the one closure created by the single `memoize(fn)` invocation — calling `memoize(fn)` twice would produce two independent caches.

### 8. Why can closures cause memory leaks, and when should you actually worry about it?

**Answer:** A closure keeps its entire outer Environment Record reachable for as long as the closure itself is reachable, so if that outer scope holds a large object or DOM node the closure doesn't need, the whole thing stays in memory. This matters in practice for long-lived closures — an event listener never removed, an interval never cleared, a cache with no eviction — which is exactly why `useDebounce` and the counter example both clean up (`clearTimeout`/`clearInterval`) rather than letting timers accumulate.

### 9. What's the difference between a closure and a regular function scope lookup?

**Answer:** Every function does a scope lookup through its lexical environment chain, but "closure" specifically describes the case where that outer scope would otherwise have been destroyed and the function's reference is the thing keeping it alive. Calling a function while its defining scope is still on the call stack is ordinary scoping; the interesting case interviewers mean by "closure" is when the outer function has already returned.

### 10. In the debounce hook, why is the cleanup function also called a closure?

**Answer:** The `return () => clearTimeout(timerId)` function captures `timerId` from that specific run of the effect, so when React calls it (before the next effect run or on unmount) it clears the exact timer that run created, not some other run's timer. Each effect execution creates its own `timerId` variable and its own cleanup closure over it, which is what makes it safe to call `useDebounce` from a component that re-renders rapidly without timers colliding.

## Revision Checklist

- [ ] State the technical definition of a closure and explain why it's created at function-creation time, not return time.
- [ ] Explain why a closure captures a live binding, not a copied value, using the counter/ID-generator example.
- [ ] Walk through `useDebounce` line by line and identify every closure in it (the handler, the cleanup function).
- [ ] Reproduce the `var i` loop bug from memory, explain why it happens, and fix it two ways (`let`, IIFE).
- [ ] Explain a React stale-closure bug in `useEffect` with an empty dependency array and fix it two ways (dependency array, ref).
- [ ] Build a private-state factory function (counter or rate limiter) and explain why its state is unreachable from outside.
- [ ] Explain how a memoization cache uses a closure over a `Map`, and why two calls to the memoizing factory produce independent caches.
- [ ] Explain when a closure can cause a real memory leak and how cleanup (`clearTimeout`/`clearInterval`/removing listeners) prevents it.
