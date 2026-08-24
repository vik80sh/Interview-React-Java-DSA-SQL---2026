# Master Question Bank — React Interview Prep

This file aggregates **every interview question and its full answer** from each of the 13 files in this folder (`01-Fundamentals-Rendering-Reconciliation-Fiber.md` through `13-Frontend-System-Design-Scenarios.md`), in one place, so you can drill the whole set without opening each file individually. Answers are copied verbatim from their source file. Every question links back to its exact heading in the original file (`*Source: ...*` line beneath each answer) so you can open that file for the surrounding lesson content, code examples, and Revision Checklist that give it fuller context.

## [1. React Fundamentals: Rendering, Reconciliation, and Fiber](01-Fundamentals-Rendering-Reconciliation-Fiber.md)

### 1. What does it mean that React is declarative, and why does that matter?

**Answer:** You describe the UI as a function of the current state and props, rather than writing step-by-step DOM mutation instructions. It matters because the same state always produces the same output, so a bug becomes "which state value is wrong" instead of "which imperative DOM call fired in the wrong order" — a much smaller debugging surface.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#1-what-does-it-mean-that-react-is-declarative-and-why-does-that-matter](01-Fundamentals-Rendering-Reconciliation-Fiber.md#1-what-does-it-mean-that-react-is-declarative-and-why-does-that-matter)*

### 2. What is the Virtual DOM, and why is diffing it faster than manipulating the real DOM directly?

**Answer:** It's a plain JavaScript object tree — `{ type, props, children }` — that mirrors the intended UI, with none of the browser's layout, style, or event-listener machinery attached. Comparing two plain JS trees in memory is cheap; touching the real DOM is expensive because it can trigger layout recalculation and repaint, so React does all its "what changed" thinking in memory first and only issues the minimal real DOM operations at the end.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#2-what-is-the-virtual-dom-and-why-is-diffing-it-faster-than-manipulating-the-real-dom-directly](01-Fundamentals-Rendering-Reconciliation-Fiber.md#2-what-is-the-virtual-dom-and-why-is-diffing-it-faster-than-manipulating-the-real-dom-directly)*

### 3. Walk through what happens when a single piece of state changes, from render to paint.

**Answer:** React re-runs the component function (and any children affected) to produce a new Virtual DOM tree — this is rendering, and it's pure calculation with no DOM contact yet. Reconciliation then diffs that new tree against the previous one to compute a minimal patch list, and the commit phase applies just those changes to the real DOM. Only after commit does the browser actually paint.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#3-walk-through-what-happens-when-a-single-piece-of-state-changes-from-render-to-paint](01-Fundamentals-Rendering-Reconciliation-Fiber.md#3-walk-through-what-happens-when-a-single-piece-of-state-changes-from-render-to-paint)*

### 4. Why does using an array index as a `key` break when a list of cart items gets reordered?

**Answer:** React uses the key to match old and new elements across renders; with an index key, "identity" is really just "position." If the Mouse row (index 0, with a typed-in quantity) and the USB-C Hub row swap positions after a sort, React sees the element at key `0` is still a `CartRow` and reuses its DOM node — including the `<input>`'s current value — while only updating the props, so the quantity ends up attached to the wrong product. A stable key like `item.id` makes the identity travel with the data instead of the array slot.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#4-why-does-using-an-array-index-as-a-key-break-when-a-list-of-cart-items-gets-reordered](01-Fundamentals-Rendering-Reconciliation-Fiber.md#4-why-does-using-an-array-index-as-a-key-break-when-a-list-of-cart-items-gets-reordered)*

### 5. When is index-as-key actually fine?

**Answer:** When the list is genuinely static — it never reorders, filters, or has items inserted or removed in the middle — the index and the item's identity never diverge, so there's no mismatch to create. The moment sorting, filtering, deletion, or insertion enters the picture, switch to a key derived from real data identity, like a database ID.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#5-when-is-index-as-key-actually-fine](01-Fundamentals-Rendering-Reconciliation-Fiber.md#5-when-is-index-as-key-actually-fine)*

### 6. What problem did Fiber solve that the old stack reconciler couldn't?

**Answer:** The stack reconciler used plain recursive JS function calls to walk the component tree, and a call stack can't be paused mid-execution — so a large update ran synchronously to completion, however long that took, blocking the main thread and freezing input handling or animations. Fiber restructures that same walk as a linked list of small units of work that can be paused after any unit and resumed later.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#6-what-problem-did-fiber-solve-that-the-old-stack-reconciler-couldnt](01-Fundamentals-Rendering-Reconciliation-Fiber.md#6-what-problem-did-fiber-solve-that-the-old-stack-reconciler-couldnt)*

### 7. Give a concrete scenario where Fiber's interruptibility is visibly the difference between good and bad UX.

**Answer:** A search input filtering a large product grid: typing a character re-renders hundreds of `ProductCard`s, which can take real time. Without Fiber, that render blocks the thread and the next keystroke feels dropped; with Fiber, React can pause the grid re-render mid-flight, prioritize handling the new keystroke, and resume the grid work afterward, so typing stays responsive even while a large re-render is happening in the background.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#7-give-a-concrete-scenario-where-fibers-interruptibility-is-visibly-the-difference-between-good-and-bad-ux](01-Fundamentals-Rendering-Reconciliation-Fiber.md#7-give-a-concrete-scenario-where-fibers-interruptibility-is-visibly-the-difference-between-good-and-bad-ux)*

### 8. Why does Fiber split work into a render phase and a commit phase, and why is only one of them interruptible?

**Answer:** The render phase just builds a new work-in-progress tree and runs component functions and hooks — pure calculation with no visible side effects, so it's safe to pause, discard, or restart. The commit phase actually mutates the real DOM and fires effects; pausing partway through would leave the user looking at a half-applied, visually broken layout, so it always runs synchronously to completion once started.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#8-why-does-fiber-split-work-into-a-render-phase-and-a-commit-phase-and-why-is-only-one-of-them-interruptible](01-Fundamentals-Rendering-Reconciliation-Fiber.md#8-why-does-fiber-split-work-into-a-render-phase-and-a-commit-phase-and-why-is-only-one-of-them-interruptible)*

### 9. What is a Fiber node, structurally?

**Answer:** It's a plain JavaScript object representing one unit of work — one component or DOM element — holding pointers to its child, sibling, and parent fibers (forming a linked-list-style tree), plus an `alternate` pointer to the previous version of itself for diffing, and an effect tag (`PLACEMENT`/`UPDATE`/`DELETION`) recording what changed. That structure is what lets React traverse, pause, and resume the tree without relying on the native call stack.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#9-what-is-a-fiber-node-structurally](01-Fundamentals-Rendering-Reconciliation-Fiber.md#9-what-is-a-fiber-node-structurally)*

## [2. React Hooks Deep Dive](02-Hooks-Deep-Dive.md)

### 1. Why does `console.log(state)` right after calling its setter still show the old value?

**Answer:** `useState`'s setter schedules a re-render rather than mutating anything in place; the variable in the current closure keeps referring to the value that was current when that render started. The new value only exists in the *next* render's closure, which is why reading `state` on the very next line after `setState(...)` still shows the pre-update value.

*Source: [02-Hooks-Deep-Dive.md#1-why-does-consolelogstate-right-after-calling-its-setter-still-show-the-old-value](02-Hooks-Deep-Dive.md#1-why-does-consolelogstate-right-after-calling-its-setter-still-show-the-old-value)*

### 2. What's the difference between `useState(expensiveFn())` and `useState(() => expensiveFn())`?

**Answer:** The first form calls `expensiveFn()` on every single render and discards the result on all renders after the first, since React only uses the initial value once. The second form passes a lazy initializer function that React invokes exactly once, on mount — this matters whenever the initial value requires real work, like parsing `localStorage` or reading from a cache.

*Source: [02-Hooks-Deep-Dive.md#2-whats-the-difference-between-usestateexpensivefn-and-usestate-expensivefn](02-Hooks-Deep-Dive.md#2-whats-the-difference-between-usestateexpensivefn-and-usestate-expensivefn)*

### 3. How does React know which cleanup function belongs to which effect when a component has several `useEffect` calls?

**Answer:** Each `useEffect` call is tracked by its position in the per-component hook list, in the same order every render, so React pairs each effect with the cleanup it returned last time by that positional slot. Cleanups run in reverse order relative to how the effects were declared, matching stack-like unwind semantics, before the next matching effect runs or the component unmounts.

*Source: [02-Hooks-Deep-Dive.md#3-how-does-react-know-which-cleanup-function-belongs-to-which-effect-when-a-component-has-several-useeffect-calls](02-Hooks-Deep-Dive.md#3-how-does-react-know-which-cleanup-function-belongs-to-which-effect-when-a-component-has-several-useeffect-calls)*

### 4. Why does a search-as-you-type feature sometimes show results for an earlier, shorter query instead of the latest one?

**Answer:** This is a race condition — requests fire on every keystroke, and network latency means an earlier request (for a shorter, less specific query) can resolve after a later one. The fix is a cancellation flag or `AbortController` set in the effect's cleanup, so a stale response arriving after a newer request started is simply ignored instead of overwriting the correct results.

*Source: [02-Hooks-Deep-Dive.md#4-why-does-a-search-as-you-type-feature-sometimes-show-results-for-an-earlier-shorter-query-instead-of-the-latest-one](02-Hooks-Deep-Dive.md#4-why-does-a-search-as-you-type-feature-sometimes-show-results-for-an-earlier-shorter-query-instead-of-the-latest-one)*

### 5. What actually happens if `useEffect` is given no dependency array at all?

**Answer:** The effect runs after every render with no exception, so any state update performed inside it (like `setState`) triggers another render, which runs the effect again, producing an infinite loop if the effect always updates state. An empty array `[]` runs it only once on mount; omitting the array entirely is different from an empty array and is almost never what's intended.

*Source: [02-Hooks-Deep-Dive.md#5-what-actually-happens-if-useeffect-is-given-no-dependency-array-at-all](02-Hooks-Deep-Dive.md#5-what-actually-happens-if-useeffect-is-given-no-dependency-array-at-all)*

### 6. `useMemo` versus `useCallback` — what does each one actually cache?

**Answer:** `useMemo` runs a function during render and caches its *return value* — an object, array, or computed primitive. `useCallback` does not execute anything; it caches the *function definition itself* so the same reference is reused across renders, which only matters for reference-equality checks like `React.memo` or a dependency array elsewhere, not for the function's actual behavior.

*Source: [02-Hooks-Deep-Dive.md#6-usememo-versus-usecallback-what-does-each-one-actually-cache](02-Hooks-Deep-Dive.md#6-usememo-versus-usecallback-what-does-each-one-actually-cache)*

### 7. A child is wrapped in `React.memo` but still re-renders every time its parent renders — why?

**Answer:** `React.memo` skips a re-render only if every prop is reference-equal (via `Object.is`, shallow comparison) to the previous render's props. Passing an inline arrow function or object literal — `onClick={() => doThing()}` or `style={{ color: 'red' }}` — creates a new reference every render regardless of memoization elsewhere, so the shallow comparison always reports a change; the function needs `useCallback` and any object prop needs `useMemo` (or to be defined outside the render entirely).

*Source: [02-Hooks-Deep-Dive.md#7-a-child-is-wrapped-in-reactmemo-but-still-re-renders-every-time-its-parent-renders-why](02-Hooks-Deep-Dive.md#7-a-child-is-wrapped-in-reactmemo-but-still-re-renders-every-time-its-parent-renders-why)*

### 8. Why does changing an unrelated field in a context value cause a component that never reads that field to re-render anyway?

**Answer:** `useContext` subscribes a component to the *entire* context value, not to individual fields inside it, so any change to the provider's value re-renders every consumer of that context regardless of which specific property changed. The fix in real applications is splitting one large context into several smaller, more focused contexts (e.g. separating notifications from language settings) so a component only re-renders when the slice it actually consumes changes.

*Source: [02-Hooks-Deep-Dive.md#8-why-does-changing-an-unrelated-field-in-a-context-value-cause-a-component-that-never-reads-that-field-to-re-render-anyway](02-Hooks-Deep-Dive.md#8-why-does-changing-an-unrelated-field-in-a-context-value-cause-a-component-that-never-reads-that-field-to-re-render-anyway)*

### 9. When would you reach for `useReducer` instead of several `useState` calls?

**Answer:** When multiple pieces of state change together in response to the same event (like a cart's items and total updating from one `ADD_ITEM` action), or when the next state depends heavily on the previous state in ways that are easy to get inconsistent across several independent setters. A reducer centralizes every valid transition into one pure, unit-testable function and makes invalid state combinations much harder to reach by accident.

*Source: [02-Hooks-Deep-Dive.md#9-when-would-you-reach-for-usereducer-instead-of-several-usestate-calls](02-Hooks-Deep-Dive.md#9-when-would-you-reach-for-usereducer-instead-of-several-usestate-calls)*

### 10. Why can't hooks be called inside an `if` statement or a loop?

**Answer:** React tracks each component's hooks as an ordered list matched purely by call position, not by name — the *n*-th hook call in this render is matched to the *n*-th hook call from the last render. Calling a hook conditionally means that position can shift between renders, so a later hook's state or effect can get matched against the wrong stored data with no runtime error, which is why the rule is enforced unconditionally rather than treated as a style preference.

*Source: [02-Hooks-Deep-Dive.md#10-why-cant-hooks-be-called-inside-an-if-statement-or-a-loop](02-Hooks-Deep-Dive.md#10-why-cant-hooks-be-called-inside-an-if-statement-or-a-loop)*

### 11. Can a custom hook share state between two different components that both call it?

**Answer:** No — every call to a custom hook gets its own independent state, exactly like two separate calls to `useState` never share a value. A custom hook only shares *logic* (the implementation), not state; sharing actual state across components requires lifting it up to a common ancestor or putting it in context.

*Source: [02-Hooks-Deep-Dive.md#11-can-a-custom-hook-share-state-between-two-different-components-that-both-call-it](02-Hooks-Deep-Dive.md#11-can-a-custom-hook-share-state-between-two-different-components-that-both-call-it)*

### 12. What's the real risk of forgetting a cleanup function in an effect that subscribes to something?

**Answer:** Without cleanup, every time the effect re-runs (on a dependency change) or the component unmounts, the old subscription/listener/connection is never torn down, so they accumulate — a chat room component that reconnects on every `roomId` change without disconnecting the old one ends up with a growing number of live connections all still delivering events to components that no longer care about them.

*Source: [02-Hooks-Deep-Dive.md#12-whats-the-real-risk-of-forgetting-a-cleanup-function-in-an-effect-that-subscribes-to-something](02-Hooks-Deep-Dive.md#12-whats-the-real-risk-of-forgetting-a-cleanup-function-in-an-effect-that-subscribes-to-something)*

## [3. Custom Hooks in React](03-Custom-Hooks.md)

### 1. Do two components calling the same custom hook share state?

**Answer:** No. Each call to a custom hook gets its own isolated state bucket inside that component's Fiber node. If `ComponentA` and `ComponentB` both call `useCounter()`, incrementing A's counter never affects B's — the hook only shares the reusable *logic*, not a live data value.

*Source: [03-Custom-Hooks.md#1-do-two-components-calling-the-same-custom-hook-share-state](03-Custom-Hooks.md#1-do-two-components-calling-the-same-custom-hook-share-state)*

### 2. Why must a custom hook's name start with `use`?

**Answer:** The `use` prefix is how `eslint-plugin-react-hooks` recognizes a function as a hook and enforces the Rules of Hooks on it — only call at the top level, only call from a component or another hook. A helper function that internally calls `useState` but isn't named `useSomething` won't be checked, so calling it conditionally could break at runtime with no lint warning.

*Source: [03-Custom-Hooks.md#2-why-must-a-custom-hooks-name-start-with-use](03-Custom-Hooks.md#2-why-must-a-custom-hooks-name-start-with-use)*

### 3. What problem does `useDebounce` solve, and how does it work internally?

**Answer:** It stops a fast-changing value (like search input) from triggering expensive work (an API call) on every keystroke. Every time the source value changes, the effect clears the previous `setTimeout` and starts a new one; the debounced value only updates once the timer finishes uninterrupted, so a burst of keystrokes collapses into a single update.

*Source: [03-Custom-Hooks.md#3-what-problem-does-usedebounce-solve-and-how-does-it-work-internally](03-Custom-Hooks.md#3-what-problem-does-usedebounce-solve-and-how-does-it-work-internally)*

### 4. In `useFetch`, why use `AbortController` instead of just an `isMounted` flag?

**Answer:** An `isMounted` flag only prevents the state update from happening — it doesn't stop the actual network request, which keeps consuming bandwidth and server resources. `AbortController.abort()` in the effect's cleanup actually cancels the underlying HTTP request, which matters when a user navigates quickly between pages that each trigger a fetch.

*Source: [03-Custom-Hooks.md#4-in-usefetch-why-use-abortcontroller-instead-of-just-an-ismounted-flag](03-Custom-Hooks.md#4-in-usefetch-why-use-abortcontroller-instead-of-just-an-ismounted-flag)*

### 5. Why does `useLocalStorage` read the initial value lazily (`useState(() => ...)`) instead of `useState(localStorage.getItem(key))`?

**Answer:** Passing a plain value re-evaluates the expression on every render even though `useState` only uses it on the very first render — for `localStorage.getItem`, that means an unnecessary synchronous disk read on every re-render. The lazy initializer function form is only invoked once, on mount, which is both faster and avoids redundant `localStorage` access.

*Source: [03-Custom-Hooks.md#5-why-does-uselocalstorage-read-the-initial-value-lazily-usestate-instead-of-usestatelocalstoragegetitemkey](03-Custom-Hooks.md#5-why-does-uselocalstorage-read-the-initial-value-lazily-usestate-instead-of-usestatelocalstoragegetitemkey)*

### 6. How would you make `useOnlineStatus` safe to use in many components on the same page?

**Answer:** Each component's call runs its own `useEffect`, which adds its own `online`/`offline` listeners and removes exactly those same listeners in its cleanup function. Because listener add/remove is scoped per hook call, ten components each calling `useOnlineStatus()` produce ten independent listener pairs with no shared state and no leaks.

*Source: [03-Custom-Hooks.md#6-how-would-you-make-useonlinestatus-safe-to-use-in-many-components-on-the-same-page](03-Custom-Hooks.md#6-how-would-you-make-useonlinestatus-safe-to-use-in-many-components-on-the-same-page)*

### 7. What's the advantage of `useToggle` returning both a `toggle` function and separate `open`/`close` functions?

**Answer:** Different UI triggers need different semantics — a hamburger button should flip open/closed, but a modal's backdrop click or "X" button should only ever close it, never accidentally reopen it. Exposing all three lets each trigger call the action that matches its intent instead of every caller re-deriving the same boolean logic.

*Source: [03-Custom-Hooks.md#7-whats-the-advantage-of-usetoggle-returning-both-a-toggle-function-and-separate-openclose-functions](03-Custom-Hooks.md#7-whats-the-advantage-of-usetoggle-returning-both-a-toggle-function-and-separate-openclose-functions)*

### 8. Why does `useFetch` use `useReducer` instead of three separate `useState` calls for `data`, `loading`, and `error`?

**Answer:** The three fields are not independent — they change together as a set (start: `loading=true, error=null`; success: `loading=false, data=...`), and three separate setters make it possible to accidentally leave them in an inconsistent combination, like `loading=true` and `data` already populated. A single reducer action updates all three atomically, so the state machine can't drift into an invalid combination.

*Source: [03-Custom-Hooks.md#8-why-does-usefetch-use-usereducer-instead-of-three-separate-usestate-calls-for-data-loading-and-error](03-Custom-Hooks.md#8-why-does-usefetch-use-usereducer-instead-of-three-separate-usestate-calls-for-data-loading-and-error)*

### 9. Can you call a custom hook conditionally if you're careful about it?

**Answer:** No — this is a hard rule regardless of the custom hook's internal logic. React matches up hook calls between renders purely by call order, since hooks are stored as a linked list per component; skipping a call in some renders but not others shifts every subsequent hook's position and corrupts state for all of them.

*Source: [03-Custom-Hooks.md#9-can-you-call-a-custom-hook-conditionally-if-youre-careful-about-it](03-Custom-Hooks.md#9-can-you-call-a-custom-hook-conditionally-if-youre-careful-about-it)*

### 10. Give a concrete example of when you'd reach for a custom hook instead of just inlining the logic in the component.

**Answer:** Any time the same stateful behavior is needed in more than one component — for example, three different pages each needing a "has the user scrolled past 200px" boolean to show a sticky header. Extracting it into `useScrollPosition()` avoids duplicating the same `useState`/`useEffect`/event-listener block three times and keeps the cleanup logic correct in exactly one place.

*Source: [03-Custom-Hooks.md#10-give-a-concrete-example-of-when-youd-reach-for-a-custom-hook-instead-of-just-inlining-the-logic-in-the-component](03-Custom-Hooks.md#10-give-a-concrete-example-of-when-youd-reach-for-a-custom-hook-instead-of-just-inlining-the-logic-in-the-component)*

## [4. Performance Optimization](04-Performance-Optimization.md)

### 1. Why doesn't `React.memo` help when a prop is an inline object literal?

**Answer:** `React.memo`'s default comparator checks reference equality for non-primitive props, and an object literal like `{ name: 'Alex' }` gets a new reference on every parent render even when its contents are unchanged. The fix is either a custom comparison function that checks the fields that matter, or stabilizing the reference in the parent with `useMemo`.

*Source: [04-Performance-Optimization.md#1-why-doesnt-reactmemo-help-when-a-prop-is-an-inline-object-literal](04-Performance-Optimization.md#1-why-doesnt-reactmemo-help-when-a-prop-is-an-inline-object-literal)*

### 2. When would you write a custom comparison function instead of using `useMemo` in the parent?

**Answer:** Use a custom comparator when the object's reference is out of your control, such as data coming fresh from an API response or a third-party library, so you cannot memoize it upstream. It lets the child component itself decide which fields are semantically relevant (e.g. `user.id` and `user.updatedAt`) rather than requiring every caller to remember to memoize correctly.

*Source: [04-Performance-Optimization.md#2-when-would-you-write-a-custom-comparison-function-instead-of-using-usememo-in-the-parent](04-Performance-Optimization.md#2-when-would-you-write-a-custom-comparison-function-instead-of-using-usememo-in-the-parent)*

### 3. How does `React.lazy` combined with `Suspense` actually defer downloading code?

**Answer:** `React.lazy` wraps a dynamic `import()` call, which returns a promise instead of resolving synchronously; the module is only requested over the network the first time React tries to render that component. Until the promise resolves, React "suspends" that subtree and renders the nearest `Suspense` fallback, so a route or bundle a user never visits is never fetched at all.

*Source: [04-Performance-Optimization.md#3-how-does-reactlazy-combined-with-suspense-actually-defer-downloading-code](04-Performance-Optimization.md#3-how-does-reactlazy-combined-with-suspense-actually-defer-downloading-code)*

### 4. Why is splitting an admin-only route into its own bundle valuable even if only 5% of users are admins?

**Answer:** Because the split moves the admin code out of the main chunk entirely, the other 95% of users' initial bundle shrinks by however much that admin code weighed, directly improving their time-to-interactive. Without the split, every visitor downloads and parses code they will never execute, purely because it was bundled alongside code they do need.

*Source: [04-Performance-Optimization.md#4-why-is-splitting-an-admin-only-route-into-its-own-bundle-valuable-even-if-only-5-of-users-are-admins](04-Performance-Optimization.md#4-why-is-splitting-an-admin-only-route-into-its-own-bundle-valuable-even-if-only-5-of-users-are-admins)*

### 5. Why does rendering 10,000 list items without virtualization hurt performance even if the data itself is small?

**Answer:** The cost isn't the JavaScript data — it's that the browser has to create, lay out, and paint 10,000 real DOM nodes, and every subsequent reconciliation pass has more nodes to diff. Scroll and resize handlers also get more expensive because layout recalculation scales with DOM node count, so the page feels laggy well before memory becomes the bottleneck.

*Source: [04-Performance-Optimization.md#5-why-does-rendering-10000-list-items-without-virtualization-hurt-performance-even-if-the-data-itself-is-small](04-Performance-Optimization.md#5-why-does-rendering-10000-list-items-without-virtualization-hurt-performance-even-if-the-data-itself-is-small)*

### 6. How does windowing keep the scrollbar accurate if most rows aren't actually in the DOM?

**Answer:** The virtualization library renders a container sized to the full logical height (row count times row height) even though only the visible rows plus a small overscan buffer are mounted inside it. The browser's scrollbar reflects that container's height, so it behaves as if all rows were present, while the library swaps which rows are mounted in and out as `scrollTop` changes.

*Source: [04-Performance-Optimization.md#6-how-does-windowing-keep-the-scrollbar-accurate-if-most-rows-arent-actually-in-the-dom](04-Performance-Optimization.md#6-how-does-windowing-keep-the-scrollbar-accurate-if-most-rows-arent-actually-in-the-dom)*

### 7. How do you find out what's actually bloating a production bundle, and what do you do next?

**Answer:** Run a bundle analyzer (`webpack-bundle-analyzer` or `rollup-plugin-visualizer`) against the production build to get a treemap of every module's contribution to bundle size. From there, look for accidental full-library imports (importing all of `lodash` for one function) and swap monolithic, non-tree-shakable dependencies like `moment` for modular alternatives like `date-fns`, then re-run the analyzer to confirm the reduction.

*Source: [04-Performance-Optimization.md#7-how-do-you-find-out-whats-actually-bloating-a-production-bundle-and-what-do-you-do-next](04-Performance-Optimization.md#7-how-do-you-find-out-whats-actually-bloating-a-production-bundle-and-what-do-you-do-next)*

### 8. Why is `moment.js` hard to tree-shake, and how does `date-fns` avoid the same problem?

**Answer:** `moment` ships as a single object with every method attached and bundles all locale data by default, so a bundler can't statically determine which parts are unused and safely drop them. `date-fns` exposes each function as an independent named ES module export, so importing only `format` lets the bundler exclude every other function from the final bundle.

*Source: [04-Performance-Optimization.md#8-why-is-momentjs-hard-to-tree-shake-and-how-does-date-fns-avoid-the-same-problem](04-Performance-Optimization.md#8-why-is-momentjs-hard-to-tree-shake-and-how-does-date-fns-avoid-the-same-problem)*

### 9. What's the difference between `loading="lazy"` and an `IntersectionObserver`-based lazy image component?

**Answer:** `loading="lazy"` is a native browser attribute that defers the image request until it nears the viewport, with no JavaScript required, but it only works on plain `<img>` elements and offers no hook for placeholders or custom thresholds. An `IntersectionObserver` implementation gives you control over the trigger margin, lets you show a placeholder until the real image loads, and works for CSS background images too — at the cost of writing and maintaining the observer logic yourself.

*Source: [04-Performance-Optimization.md#9-whats-the-difference-between-loadinglazy-and-an-intersectionobserver-based-lazy-image-component](04-Performance-Optimization.md#9-whats-the-difference-between-loadinglazy-and-an-intersectionobserver-based-lazy-image-component)*

### 10. A component re-renders on every keystroke in a search box even though it's wrapped in `React.memo`. What's the most likely cause?

**Answer:** The most common cause is that one of its props is a new object, array, or function reference created on every parent render — for example an inline `onSelect={() => ...}` handler — which fails `React.memo`'s shallow comparison every time. The fix is to stabilize that reference with `useCallback` or `useMemo` in the parent (see the Hooks Deep Dive guide) or to write a custom comparator that ignores the parts of the prop that don't affect output.

*Source: [04-Performance-Optimization.md#10-a-component-re-renders-on-every-keystroke-in-a-search-box-even-though-its-wrapped-in-reactmemo-whats-the-most-likely-cause](04-Performance-Optimization.md#10-a-component-re-renders-on-every-keystroke-in-a-search-box-even-though-its-wrapped-in-reactmemo-whats-the-most-likely-cause)*

## [5. Advanced Component Patterns in React](05-Advanced-Component-Patterns.md)

### 1. When would you deliberately choose an uncontrolled input over a controlled one?

**Answer:** When you don't need to react to every keystroke — a file input is the clearest case, since the browser refuses to let JavaScript set its value at all, so it must stay uncontrolled and read via a `ref` on submit. It's also a reasonable choice for a very large form where re-rendering on every keystroke is a measurable performance cost and no per-keystroke validation is needed.

*Source: [05-Advanced-Component-Patterns.md#1-when-would-you-deliberately-choose-an-uncontrolled-input-over-a-controlled-one](05-Advanced-Component-Patterns.md#1-when-would-you-deliberately-choose-an-uncontrolled-input-over-a-controlled-one)*

### 2. What specifically breaks when you stack multiple HOCs, beyond "it's messy"?

**Answer:** Two concrete things: the component tree grows a wrapper level per HOC (`withAuth(withTheme(withData(Profile)))` shows up as three extra components in DevTools with no visual counterpart), and two HOCs that both inject a prop with the same name — say `data` or `position` — silently overwrite each other with no compile-time error, because the injected props are merged with `{...props}` and JavaScript object spread just takes the last value.

*Source: [05-Advanced-Component-Patterns.md#2-what-specifically-breaks-when-you-stack-multiple-hocs-beyond-its-messy](05-Advanced-Component-Patterns.md#2-what-specifically-breaks-when-you-stack-multiple-hocs-beyond-its-messy)*

### 3. Why don't custom hooks have the wrapper-hell or prop-collision problems that HOCs do?

**Answer:** A hook runs inside the consuming component's own function call rather than wrapping it in an extra rendered component, so it adds zero levels to the component tree. And because each hook's return value is assigned to a local variable the caller names explicitly (`const mousePosition = useMouseTracker()`), there is no shared props object for two unrelated pieces of logic to collide in.

*Source: [05-Advanced-Component-Patterns.md#3-why-dont-custom-hooks-have-the-wrapper-hell-or-prop-collision-problems-that-hocs-do](05-Advanced-Component-Patterns.md#3-why-dont-custom-hooks-have-the-wrapper-hell-or-prop-collision-problems-that-hocs-do)*

### 4. Why must Error Boundaries be class components?

**Answer:** The two lifecycle methods that catch rendering errors — `static getDerivedStateFromError` for computing fallback state and `componentDidCatch` for side-effecting logging — only exist on the class component API; there is no hook equivalent for either one. This is also why third-party libraries like `react-error-boundary` still ship a class component under the hood even though they expose a hook-friendly wrapper API.

*Source: [05-Advanced-Component-Patterns.md#4-why-must-error-boundaries-be-class-components](05-Advanced-Component-Patterns.md#4-why-must-error-boundaries-be-class-components)*

### 5. What kinds of errors will an Error Boundary NOT catch?

**Answer:** Errors thrown inside asynchronous event handlers (a `fetch` that rejects inside an `onClick`), inside `setTimeout` callbacks, and during server-side rendering are all invisible to an Error Boundary, because it only wraps the synchronous render/lifecycle call stack. Those cases still need an ordinary `try/catch` around the async code itself.

*Source: [05-Advanced-Component-Patterns.md#5-what-kinds-of-errors-will-an-error-boundary-not-catch](05-Advanced-Component-Patterns.md#5-what-kinds-of-errors-will-an-error-boundary-not-catch)*

### 6. Why wrap each dashboard widget in its own Error Boundary instead of one boundary around the whole page?

**Answer:** A single boundary around the entire dashboard means any one widget's bug takes down every other widget on the page, since the boundary replaces its entire child tree with the fallback UI the moment anything inside throws. Wrapping each widget individually means a crash in, say, a stock ticker widget only blanks that one grid cell while the revenue chart and activity feed next to it keep rendering normally.

*Source: [05-Advanced-Component-Patterns.md#6-why-wrap-each-dashboard-widget-in-its-own-error-boundary-instead-of-one-boundary-around-the-whole-page](05-Advanced-Component-Patterns.md#6-why-wrap-each-dashboard-widget-in-its-own-error-boundary-instead-of-one-boundary-around-the-whole-page)*

### 7. Why does a Portal-rendered modal still receive context from its logical parent, even though it's mounted under `<body>`?

**Answer:** `createPortal` only changes where React paints the DOM nodes — it does not remove the component from its place in the React component tree, which is what Context and event bubbling are both based on. So a `<Modal>` rendered by `<ProductCard>` still sees any context provider that wraps `ProductCard` in JSX, and a click inside the modal still bubbles up through `ProductCard`'s handlers, exactly as if no portal were involved.

*Source: [05-Advanced-Component-Patterns.md#7-why-does-a-portal-rendered-modal-still-receive-context-from-its-logical-parent-even-though-its-mounted-under-body](05-Advanced-Component-Patterns.md#7-why-does-a-portal-rendered-modal-still-receive-context-from-its-logical-parent-even-though-its-mounted-under-body)*

### 8. Why does a pile of independent booleans (`isLoading`, `isSuccess`, `hasError`) cause real bugs, and how does a state machine fix it?

**Answer:** Nothing stops `isLoading` and `isSuccess` from both being `true` at the same time if one `setState` call is missed during a refactor, and that impossible combination has to be defensively guarded against in the JSX render logic. A state machine collapses those into one `status` field that can only hold one value, and a reducer's `switch` statement is the single place that defines which transitions are legal, so an impossible combination simply cannot be represented.

*Source: [05-Advanced-Component-Patterns.md#8-why-does-a-pile-of-independent-booleans-isloading-issuccess-haserror-cause-real-bugs-and-how-does-a-state-machine-fix-it](05-Advanced-Component-Patterns.md#8-why-does-a-pile-of-independent-booleans-isloading-issuccess-haserror-cause-real-bugs-and-how-does-a-state-machine-fix-it)*

### 9. In the Tabs compound component example, what does Context actually save you from doing?

**Answer:** Without Context, `Tabs` would have to pass `activeValue` and `setActiveValue` down as explicit props through every intermediate component, and the caller composing `<Tabs><TabList><Tab/></TabList></Tabs>` would need to manually wire an `activeIndex`/`onChange` pair themselves. Context lets `Tab` and `TabPanel` read and update that shared state directly, no matter how deeply they're nested inside `<Tabs>`, while the caller's JSX stays plain markup.

*Source: [05-Advanced-Component-Patterns.md#9-in-the-tabs-compound-component-example-what-does-context-actually-save-you-from-doing](05-Advanced-Component-Patterns.md#9-in-the-tabs-compound-component-example-what-does-context-actually-save-you-from-doing)*

### 10. Give a concrete case where a controlled component's re-render cost actually matters.

**Answer:** A large form with fifty text fields, each controlled and re-rendering the whole form component on every keystroke, can visibly lag on a slower device if the form's render function is doing nontrivial work like re-computing validation across all fields each time. In that case, splitting each field into its own controlled sub-component (so each keystroke only re-renders one field) or using an uncontrolled `ref`-based approach for fields that don't need live validation are both legitimate fixes.

*Source: [05-Advanced-Component-Patterns.md#10-give-a-concrete-case-where-a-controlled-components-re-render-cost-actually-matters](05-Advanced-Component-Patterns.md#10-give-a-concrete-case-where-a-controlled-components-re-render-cost-actually-matters)*

## [6. TypeScript with React](06-TypeScript-with-React.md)

### 1. Why type `children` as `React.ReactNode` instead of `JSX.Element`?

**Answer:** `JSX.Element` only covers a single rendered element and rejects strings, numbers, arrays, fragments, and `null` — all of which are valid React children. `React.ReactNode` is the union that actually matches what `children` can legally be, so a component like `<Card>Just text</Card>` type-checks correctly.

*Source: [06-TypeScript-with-React.md#1-why-type-children-as-reactreactnode-instead-of-jsxelement](06-TypeScript-with-React.md#1-why-type-children-as-reactreactnode-instead-of-jsxelement)*

### 2. How do you make a prop required only for specific variants of a component?

**Answer:** Model the props as a discriminated union keyed on a `variant` (or `kind`) field, with each member interface adding its own required fields — for example an `ErrorAlertProps` variant requiring `onRetry` while `InfoAlertProps` does not. TypeScript then narrows the union inside a `switch (props.variant)`, so accessing `props.onRetry` is only allowed in the branch where it's guaranteed to exist, and omitting it on an `error` alert fails at compile time.

*Source: [06-TypeScript-with-React.md#2-how-do-you-make-a-prop-required-only-for-specific-variants-of-a-component](06-TypeScript-with-React.md#2-how-do-you-make-a-prop-required-only-for-specific-variants-of-a-component)*

### 3. Why does `useContext` typically return `T | undefined`, and how do you avoid null checks everywhere?

**Answer:** The context has to have some default value before a provider mounts, and `undefined` is the honest one — claiming a fake default (`{}` cast as `T`) just hides the bug. The fix is a custom hook (`useAuth`, `useTheme`) that calls `useContext` once, throws if the value is `undefined`, and returns the narrowed non-null type, so every other component in the tree calls the safe hook instead of the raw context.

*Source: [06-TypeScript-with-React.md#3-why-does-usecontext-typically-return-t-undefined-and-how-do-you-avoid-null-checks-everywhere](06-TypeScript-with-React.md#3-why-does-usecontext-typically-return-t-undefined-and-how-do-you-avoid-null-checks-everywhere)*

### 4. How do you type an event handler for a text input's `onChange`?

**Answer:** `(event: React.ChangeEvent<HTMLInputElement>) => void`. The generic parameter tells TypeScript which DOM element `event.target` refers to, so `event.target.value` and `event.target.checked` are typed correctly instead of falling back to `any` on an untyped `event`.

*Source: [06-TypeScript-with-React.md#4-how-do-you-type-an-event-handler-for-a-text-inputs-onchange](06-TypeScript-with-React.md#4-how-do-you-type-an-event-handler-for-a-text-inputs-onchange)*

### 5. Why can't you pass a `ref` prop to a plain function component, and how does `forwardRef` fix it?

**Answer:** Function components don't automatically receive a second `ref` argument the way class components' underlying DOM nodes do — React treats `ref` as a reserved prop that bypasses the normal props object. `React.forwardRef<HTMLInputElement, FormInputProps>((props, ref) => ...)` explicitly opts the component into receiving that ref and forwarding it to the real `<input>`, which is what lets a parent call `inputRef.current?.focus()` on a custom wrapper component.

*Source: [06-TypeScript-with-React.md#5-why-cant-you-pass-a-ref-prop-to-a-plain-function-component-and-how-does-forwardref-fix-it](06-TypeScript-with-React.md#5-why-cant-you-pass-a-ref-prop-to-a-plain-function-component-and-how-does-forwardref-fix-it)*

### 6. What's the point of `React.memo`'s second argument, and does it work without `useCallback`?

**Answer:** The second argument is a custom equality function that decides whether to skip a re-render; without it, `memo` does a shallow prop comparison by default. It only helps if the props being compared are stable between renders — if a parent passes a new inline callback on every render, `memo` sees a new function reference every time and re-renders anyway, which is why memoized child components are usually paired with `useCallback` on the handlers passed to them.

*Source: [06-TypeScript-with-React.md#6-whats-the-point-of-reactmemos-second-argument-and-does-it-work-without-usecallback](06-TypeScript-with-React.md#6-whats-the-point-of-reactmemos-second-argument-and-does-it-work-without-usecallback)*

### 7. How do you type a Redux Toolkit slice so `action.payload` isn't `any`?

**Answer:** Type each reducer's action parameter as `PayloadAction<T>` from `@reduxjs/toolkit`, where `T` is the shape of that specific action's payload — `PayloadAction<{ sku: string }>` for a "remove item" action, for instance. Redux Toolkit then generates the matching typed action creator automatically, so calling `itemRemoved({ sku: 'x' })` is checked against that same `T` at the call site.

*Source: [06-TypeScript-with-React.md#7-how-do-you-type-a-redux-toolkit-slice-so-actionpayload-isnt-any](06-TypeScript-with-React.md#7-how-do-you-type-a-redux-toolkit-slice-so-actionpayload-isnt-any)*

### 8. Why derive `RootState` and `AppDispatch` from the store instead of writing them by hand?

**Answer:** `type RootState = ReturnType<typeof store.getState>` and `type AppDispatch = typeof store.dispatch` stay automatically in sync with whatever reducers are actually registered in `configureStore`. A hand-written `interface RootState` would silently drift out of date the moment someone adds or renames a slice, and every `useSelector` call using the stale type would compile without catching the mismatch.

*Source: [06-TypeScript-with-React.md#8-why-derive-rootstate-and-appdispatch-from-the-store-instead-of-writing-them-by-hand](06-TypeScript-with-React.md#8-why-derive-rootstate-and-appdispatch-from-the-store-instead-of-writing-them-by-hand)*

### 9. How do you write one `Table` component that works for both `Invoice` rows and `User` rows without losing type safety?

**Answer:** Make the component generic — `function Table<T>({ rows, columns, getRowKey }: TableProps<T>)` — with `Column<T>['render']` typed as `(row: T) => React.ReactNode`. TypeScript infers `T` from the `rows` array passed in, so a column definition that references a field missing from that particular `T` fails to compile, which is the whole benefit over a loosely typed table that accepts `rows: any[]`.

*Source: [06-TypeScript-with-React.md#9-how-do-you-write-one-table-component-that-works-for-both-invoice-rows-and-user-rows-without-losing-type-safety](06-TypeScript-with-React.md#9-how-do-you-write-one-table-component-that-works-for-both-invoice-rows-and-user-rows-without-losing-type-safety)*

### 10. What's the generic constraint doing in `function withAuthGuard<P extends object>(Component: React.ComponentType<P>)`?

**Answer:** `P extends object` lets the HOC accept a component with any props shape while still being able to spread `{...props}` onto it safely — without the constraint, `P` could theoretically be a primitive type that spreading doesn't make sense for. It also means the returned wrapped component (`AuthGuarded`) keeps the original component's exact prop types, so callers still get full autocomplete and type-checking on `ProtectedDashboard`'s props.

*Source: [06-TypeScript-with-React.md#10-whats-the-generic-constraint-doing-in-function-withauthguardp-extends-objectcomponent-reactcomponenttypep](06-TypeScript-with-React.md#10-whats-the-generic-constraint-doing-in-function-withauthguardp-extends-objectcomponent-reactcomponenttypep)*

## [7. Testing React with Jest and React Testing Library](07-Testing-React-Jest-RTL.md)

### 1. What does "test behavior, not implementation" mean in practice?

**Answer:** Assert on what the user sees and can do — rendered text, roles, form values, callback invocations — rather than internal state, private methods, or component structure. A behavior-focused test keeps passing through a refactor that preserves the feature, while an implementation-focused test breaks on refactors that change nothing observable.

*Source: [07-Testing-React-Jest-RTL.md#1-what-does-test-behavior-not-implementation-mean-in-practice](07-Testing-React-Jest-RTL.md#1-what-does-test-behavior-not-implementation-mean-in-practice)*

### 2. What is React Testing Library's query priority, and why does it matter?

**Answer:** Prefer `getByRole`, `getByLabelText`, and `getByPlaceholderText`/`getByText` first because they mirror how a real user or screen reader finds an element; fall back to `getByAltText`/`getByTitle` for semantic markup; use `getByTestId` only as a last resort. This ordering pushes the component toward accessible markup as a side effect of writing the test, and keeps the test decoupled from CSS classes or DOM structure.

*Source: [07-Testing-React-Jest-RTL.md#2-what-is-react-testing-librarys-query-priority-and-why-does-it-matter](07-Testing-React-Jest-RTL.md#2-what-is-react-testing-librarys-query-priority-and-why-does-it-matter)*

### 3. What's the difference between `getBy`, `queryBy`, and `findBy`?

**Answer:** `getBy*` throws immediately if the element is missing, so it's for elements expected to be present now. `queryBy*` returns `null` instead of throwing, so it's for asserting an element is absent. `findBy*` returns a promise that retries until the element appears or a timeout elapses, so it's for elements that appear asynchronously.

*Source: [07-Testing-React-Jest-RTL.md#3-whats-the-difference-between-getby-queryby-and-findby](07-Testing-React-Jest-RTL.md#3-whats-the-difference-between-getby-queryby-and-findby)*

### 4. Why prefer `userEvent` over `fireEvent`?

**Answer:** `fireEvent` dispatches one raw DOM event, which can skip behavior a real interaction would trigger, such as focus, blur, or the full keydown/input/change sequence. `userEvent` simulates the complete sequence a browser produces for a real user action, so it catches bugs that only show up with realistic event ordering.

*Source: [07-Testing-React-Jest-RTL.md#4-why-prefer-userevent-over-fireevent](07-Testing-React-Jest-RTL.md#4-why-prefer-userevent-over-fireevent)*

### 5. How do you test a component that makes an API call?

**Answer:** Mock the network boundary — either `global.fetch`/the service module with `jest.mock`, or intercept requests with MSW — never mock the component itself. Render the component, assert the loading state is shown first, then use `findBy*` to wait for the resolved UI, and optionally assert the mock was called with the right arguments.

*Source: [07-Testing-React-Jest-RTL.md#5-how-do-you-test-a-component-that-makes-an-api-call](07-Testing-React-Jest-RTL.md#5-how-do-you-test-a-component-that-makes-an-api-call)*

### 6. How do you test a component that reads and writes `localStorage`?

**Answer:** `localStorage` is a real synchronous API in jsdom, so no mock is needed — clear it in `beforeEach` for isolation, seed it before rendering to test the read path, and assert on `localStorage.getItem` after an interaction to test the write path.

*Source: [07-Testing-React-Jest-RTL.md#6-how-do-you-test-a-component-that-reads-and-writes-localstorage](07-Testing-React-Jest-RTL.md#6-how-do-you-test-a-component-that-reads-and-writes-localstorage)*

### 7. How do you test a custom hook in isolation?

**Answer:** Use `renderHook` from `@testing-library/react` to mount the hook without a full component, and read its return value from `result.current`. Wrap any call that triggers a state update outside of an event handler in `act` so React flushes the update before the next assertion.

*Source: [07-Testing-React-Jest-RTL.md#7-how-do-you-test-a-custom-hook-in-isolation](07-Testing-React-Jest-RTL.md#7-how-do-you-test-a-custom-hook-in-isolation)*

### 8. Is 100% test coverage a meaningful goal?

**Answer:** No. Coverage percentages show which lines executed, not whether the assertions are strong or the edge cases are handled. Aim for high coverage of critical paths, branches, and error states — usually 80-90% is a healthy target — rather than treating the number itself as the goal.

*Source: [07-Testing-React-Jest-RTL.md#8-is-100-test-coverage-a-meaningful-goal](07-Testing-React-Jest-RTL.md#8-is-100-test-coverage-a-meaningful-goal)*

### 9. What's the difference between a unit, integration, and end-to-end test for a React app?

**Answer:** A unit test isolates one function or component with its dependencies stubbed. An integration test exercises several units together, such as a form, its validation, and its submit handler. An end-to-end test drives a real or simulated browser through a full user journey across multiple pages. The pyramid favors many fast unit tests, a moderate number of integration tests, and few, high-value end-to-end tests.

*Source: [07-Testing-React-Jest-RTL.md#9-whats-the-difference-between-a-unit-integration-and-end-to-end-test-for-a-react-app](07-Testing-React-Jest-RTL.md#9-whats-the-difference-between-a-unit-integration-and-end-to-end-test-for-a-react-app)*

### 10. When should you reach for a `data-testid`?

**Answer:** Only when no accessible or semantic query can identify the element — for example, a purely decorative wrapper `div` with no role, label, or text. Reaching for `data-testid` by default is a sign the test isn't validating anything about accessibility or user-facing behavior, and it's the most fragile query when markup changes.

*Source: [07-Testing-React-Jest-RTL.md#10-when-should-you-reach-for-a-data-testid](07-Testing-React-Jest-RTL.md#10-when-should-you-reach-for-a-data-testid)*

## [8. State Management: Context, Redux, and Zustand](08-State-Management-Context-Redux-Zustand.md)

### 1. When would you reach for Context instead of Redux?

**Answer:** When the value is read widely but changes infrequently, such as theme, locale, or the current authenticated user. Context avoids pulling in an external library for something that doesn't need selector-based re-render control or DevTools.

*Source: [08-State-Management-Context-Redux-Zustand.md#1-when-would-you-reach-for-context-instead-of-redux](08-State-Management-Context-Redux-Zustand.md#1-when-would-you-reach-for-context-instead-of-redux)*

### 2. Why does Context cause unnecessary re-renders, and how do you fix it?

**Answer:** Every consumer of a context re-renders whenever the provider passes a new value, regardless of which fields the consumer reads, because Context has no per-field subscription mechanism. Memoizing the value with `useMemo` prevents renders caused by unrelated provider re-renders, but splitting one context into several independent contexts is what actually stops an unrelated field's change from re-rendering a consumer.

*Source: [08-State-Management-Context-Redux-Zustand.md#2-why-does-context-cause-unnecessary-re-renders-and-how-do-you-fix-it](08-State-Management-Context-Redux-Zustand.md#2-why-does-context-cause-unnecessary-re-renders-and-how-do-you-fix-it)*

### 3. Walk through the Redux data flow.

**Answer:** A component dispatches a plain action object describing what happened. The store passes the current state and that action to a pure reducer, which returns a new state without mutating the old one. Subscribed components read the new state through selectors and re-render if the slice they selected changed.

*Source: [08-State-Management-Context-Redux-Zustand.md#3-walk-through-the-redux-data-flow](08-State-Management-Context-Redux-Zustand.md#3-walk-through-the-redux-data-flow)*

### 4. What does Redux Toolkit change about writing Redux?

**Answer:** `createSlice` generates action creators and a reducer together and uses Immer so reducers can write direct-looking mutations while the store still gets an immutable update. `configureStore` sets up DevTools and default middleware, including checks for accidental mutation, removing most of the manual boilerplate of hand-written Redux.

*Source: [08-State-Management-Context-Redux-Zustand.md#4-what-does-redux-toolkit-change-about-writing-redux](08-State-Management-Context-Redux-Zustand.md#4-what-does-redux-toolkit-change-about-writing-redux)*

### 5. How do you handle asynchronous logic in Redux?

**Answer:** Reducers must stay pure and synchronous, so async work is handled by middleware. A thunk is a function dispatched instead of an action object; it receives `dispatch` and can run async code, dispatching plain actions as it progresses. `createAsyncThunk` automates the pending/fulfilled/rejected action dispatch around a promise.

*Source: [08-State-Management-Context-Redux-Zustand.md#5-how-do-you-handle-asynchronous-logic-in-redux](08-State-Management-Context-Redux-Zustand.md#5-how-do-you-handle-asynchronous-logic-in-redux)*

### 6. What is a selector and why does memoization matter?

**Answer:** A selector is a function that reads a piece of state, giving one reusable place to access a value. Memoized selectors (via `createSelector`) cache their result and only recompute when their inputs actually change by reference, which prevents components from re-rendering when a selector would otherwise return a new derived array or object on every call.

*Source: [08-State-Management-Context-Redux-Zustand.md#6-what-is-a-selector-and-why-does-memoization-matter](08-State-Management-Context-Redux-Zustand.md#6-what-is-a-selector-and-why-does-memoization-matter)*

### 7. How does Zustand differ from Redux?

**Answer:** Zustand drops the action/reducer/dispatch ceremony — a store is just a function returning state and updater functions, with no provider component required. It still supports per-field subscriptions through selector functions, giving Redux-like re-render control with a much smaller API and bundle size, at the cost of Redux's mature middleware ecosystem and built-in DevTools.

*Source: [08-State-Management-Context-Redux-Zustand.md#7-how-does-zustand-differ-from-redux](08-State-Management-Context-Redux-Zustand.md#7-how-does-zustand-differ-from-redux)*

### 8. Redux vs. Zustand — how would you decide for a real project?

**Answer:** It depends on team size and complexity rather than one being objectively better. Redux fits a large codebase with many contributors, complex derived state, and a need for time-travel debugging; Zustand fits a smaller team or app that wants shared state without the boilerplate, since both give comparable re-render performance through selectors.

*Source: [08-State-Management-Context-Redux-Zustand.md#8-redux-vs-zustand-how-would-you-decide-for-a-real-project](08-State-Management-Context-Redux-Zustand.md#8-redux-vs-zustand-how-would-you-decide-for-a-real-project)*

### 9. Is prop drilling always a reason to add Context?

**Answer:** No. Passing props explicitly through two or three levels is often more readable and easier to trace than hiding a dependency behind `useContext`. Context earns its cost when the same value is needed by many unrelated subtrees, not simply because a prop passes through an intermediate component.

*Source: [08-State-Management-Context-Redux-Zustand.md#9-is-prop-drilling-always-a-reason-to-add-context](08-State-Management-Context-Redux-Zustand.md#9-is-prop-drilling-always-a-reason-to-add-context)*

### 10. When would you choose Redux Saga over a thunk?

**Answer:** Thunks are enough for straightforward async flows like a single fetch-and-dispatch. Saga's generator-based effects are worth the steeper learning curve only when you need cancellation, retries, debouncing, or coordinating multiple concurrent async streams — behavior that gets awkward to hand-roll with plain thunks.

*Source: [08-State-Management-Context-Redux-Zustand.md#10-when-would-you-choose-redux-saga-over-a-thunk](08-State-Management-Context-Redux-Zustand.md#10-when-would-you-choose-redux-saga-over-a-thunk)*

## [9. DOM, Refs and Event Handling](09-DOM-Refs-and-Event-Handling.md)

### 1. What's the fundamental difference between `useRef` and `useState`?

**Answer:** Both persist a value across re-renders, but updating a ref's `.current` does not trigger a re-render while updating state does. Use state for anything that should be reflected in the UI, and a ref for DOM access or mutable bookkeeping that the render output doesn't depend on.

*Source: [09-DOM-Refs-and-Event-Handling.md#1-whats-the-fundamental-difference-between-useref-and-usestate](09-DOM-Refs-and-Event-Handling.md#1-whats-the-fundamental-difference-between-useref-and-usestate)*

### 2. Give three concrete use cases for `useRef` beyond just holding a DOM node.

**Answer:** Storing an interval or timeout ID so it can be cleared later, storing the previous value of a prop to compare against the current one, and storing a boolean flag like "has this effect already run" to guard against duplicate initialization (common with `StrictMode`'s double-invoke in development).

*Source: [09-DOM-Refs-and-Event-Handling.md#2-give-three-concrete-use-cases-for-useref-beyond-just-holding-a-dom-node](09-DOM-Refs-and-Event-Handling.md#2-give-three-concrete-use-cases-for-useref-beyond-just-holding-a-dom-node)*

### 3. How do you decide between `ref` and `key` when working with lists?

**Answer:** They solve unrelated problems. `key` tells React's reconciler which array item is which across renders so it can correctly reuse, reorder, or discard DOM nodes; it's never read or dereferenced by your code. `ref` gives you a handle to actually reach into a DOM node imperatively — it has nothing to do with list identity.

*Source: [09-DOM-Refs-and-Event-Handling.md#3-how-do-you-decide-between-ref-and-key-when-working-with-lists](09-DOM-Refs-and-Event-Handling.md#3-how-do-you-decide-between-ref-and-key-when-working-with-lists)*

### 4. Why is overusing refs considered an anti-pattern in React?

**Answer:** Manually pushing values into the DOM through a ref (e.g., setting `textContent` by hand) bypasses React's declarative data flow, making the component harder to test and reason about, and risks the ref-held value and the actual rendered DOM silently drifting out of sync. If a value affects what's on screen, it belongs in state so React can keep the render output and the value consistent.

*Source: [09-DOM-Refs-and-Event-Handling.md#4-why-is-overusing-refs-considered-an-anti-pattern-in-react](09-DOM-Refs-and-Event-Handling.md#4-why-is-overusing-refs-considered-an-anti-pattern-in-react)*

### 5. How do you attach a ref to a custom function component?

**Answer:** By default a function component can't receive `ref` as a prop because React intercepts it. Wrapping the component in `forwardRef` lets it explicitly forward the ref to whichever underlying DOM node (or object built with `useImperativeHandle`) it chooses to expose.

*Source: [09-DOM-Refs-and-Event-Handling.md#5-how-do-you-attach-a-ref-to-a-custom-function-component](09-DOM-Refs-and-Event-Handling.md#5-how-do-you-attach-a-ref-to-a-custom-function-component)*

### 6. What changed about event pooling between React 16 and React 17?

**Answer:** In React 16, `SyntheticEvent` objects were pooled and reused, so their fields were nulled out immediately after the synchronous handler returned — reading `e.target.value` inside a `setTimeout` or async callback returned `undefined` unless you extracted the value first. React 17 removed pooling, so synthetic events can be safely referenced asynchronously without that workaround.

*Source: [09-DOM-Refs-and-Event-Handling.md#6-what-changed-about-event-pooling-between-react-16-and-react-17](09-DOM-Refs-and-Event-Handling.md#6-what-changed-about-event-pooling-between-react-16-and-react-17)*

### 7. When would you reach for event delegation instead of a handler per element?

**Answer:** When rendering a large or frequently-changing list, attaching one listener to a shared parent and reading `e.target` (often via `data-*` attributes) to figure out which child was interacted with avoids creating and tearing down one listener per row. In practice React's synthetic event system already delegates at the root internally, so the main benefit shown here is understanding the underlying bubbling mechanism, which is what vanilla-JS delegation relies on directly.

*Source: [09-DOM-Refs-and-Event-Handling.md#7-when-would-you-reach-for-event-delegation-instead-of-a-handler-per-element](09-DOM-Refs-and-Event-Handling.md#7-when-would-you-reach-for-event-delegation-instead-of-a-handler-per-element)*

### 8. What's the difference between `IntersectionObserver` and `MutationObserver`, and when would you use each?

**Answer:** `IntersectionObserver` reports when an element crosses a visibility threshold relative to the viewport (or another ancestor), which is what drives lazy-loading images and infinite scroll. `MutationObserver` reports when a DOM subtree's attributes, children, or text change, which is useful mainly for detecting changes made by code outside your control — typically third-party scripts or non-React libraries — since React already knows about the changes it makes itself.

*Source: [09-DOM-Refs-and-Event-Handling.md#8-whats-the-difference-between-intersectionobserver-and-mutationobserver-and-when-would-you-use-each](09-DOM-Refs-and-Event-Handling.md#8-whats-the-difference-between-intersectionobserver-and-mutationobserver-and-when-would-you-use-each)*

### 9. Why must event listeners added directly to `window` or `document` be removed in a cleanup function?

**Answer:** `useEffect`'s callback runs on every mount (and dependency change), and if the returned cleanup doesn't call `removeEventListener`, the listener keeps firing after the component unmounts, holding its closure (and any DOM/state references it captures) alive indefinitely. This is a common source of real memory leaks and of stale callbacks firing against components that no longer exist.

*Source: [09-DOM-Refs-and-Event-Handling.md#9-why-must-event-listeners-added-directly-to-window-or-document-be-removed-in-a-cleanup-function](09-DOM-Refs-and-Event-Handling.md#9-why-must-event-listeners-added-directly-to-window-or-document-be-removed-in-a-cleanup-function)*

### 10. Why doesn't a ref update cause a child component to re-render, and why is that useful?

**Answer:** `useRef` deliberately doesn't hook into React's state/scheduling system, so mutating `.current` is a plain JavaScript object mutation with zero rendering side effects. That's exactly what makes it the right tool for values like scroll positions, timer IDs, or a third-party library instance — things a component needs to track without paying a re-render for every change.

*Source: [09-DOM-Refs-and-Event-Handling.md#10-why-doesnt-a-ref-update-cause-a-child-component-to-re-render-and-why-is-that-useful](09-DOM-Refs-and-Event-Handling.md#10-why-doesnt-a-ref-update-cause-a-child-component-to-re-render-and-why-is-that-useful)*

## [10. Forms and Validation](10-Forms-and-Validation.md)

### 1. Controlled or uncontrolled — which do you default to?

**Answer:** Controlled, for the majority of real forms, because it enables validation, conditional rendering, and cross-field logic. Uncontrolled is the right call for file inputs, integration with non-React widgets, and trivial forms where per-keystroke re-renders are pure overhead. React Hook Form blurs this by using refs internally while still presenting a controlled-feeling API.

*Source: [10-Forms-and-Validation.md#1-controlled-or-uncontrolled-which-do-you-default-to](10-Forms-and-Validation.md#1-controlled-or-uncontrolled-which-do-you-default-to)*

### 2. Why does React Hook Form re-render less than a `useState`-based form?

**Answer:** `register` wires a ref and native DOM event listeners directly to the input rather than routing every keystroke through React state, so typing doesn't trigger a re-render of the form component. Re-renders happen only for fields whose validation state changed, or fields explicitly subscribed to via `watch`/`useWatch`. This matters most on large forms where a `useState`-per-field approach re-renders the whole tree on every keystroke.

*Source: [10-Forms-and-Validation.md#2-why-does-react-hook-form-re-render-less-than-a-usestate-based-form](10-Forms-and-Validation.md#2-why-does-react-hook-form-re-render-less-than-a-usestate-based-form)*

### 3. What's the difference between validating on change versus on blur?

**Answer:** On-change validation gives the fastest feedback but can flag an error mid-input, such as marking an email invalid before the user finishes typing it. On-blur validation waits until the user leaves the field, which avoids premature errors while still giving feedback before submit. The common pattern is to validate on blur first, then keep validating on change only for fields already touched.

*Source: [10-Forms-and-Validation.md#3-whats-the-difference-between-validating-on-change-versus-on-blur](10-Forms-and-Validation.md#3-whats-the-difference-between-validating-on-change-versus-on-blur)*

### 4. Why track a `touched` state separately from the values and errors?

**Answer:** Without it, errors would either show for every field before the user has interacted with any of them, or validation would have to be suppressed until submit, which defeats real-time feedback. `touched` lets you compute an error but only render it once the relevant field has been visited, giving accurate real-time validation without a wall of errors on page load.

*Source: [10-Forms-and-Validation.md#4-why-track-a-touched-state-separately-from-the-values-and-errors](10-Forms-and-Validation.md#4-why-track-a-touched-state-separately-from-the-values-and-errors)*

### 5. When would you choose Formik over React Hook Form today?

**Answer:** Mainly when a codebase already has Formik and Yup deeply embedded, since Formik is controlled and carries a larger bundle with more re-renders per keystroke. For new forms, React Hook Form is the default answer because of its uncontrolled-by-default performance model and smaller footprint; Formik is worth mentioning as the established alternative, not as the first recommendation.

*Source: [10-Forms-and-Validation.md#5-when-would-you-choose-formik-over-react-hook-form-today](10-Forms-and-Validation.md#5-when-would-you-choose-formik-over-react-hook-form-today)*

### 6. How do you implement async validation, such as checking username availability?

**Answer:** Attach an async `validate` function (React Hook Form) or an async `.test()` on a Yup schema (Formik) that awaits an API call and returns true or an error message. For validation on every keystroke, debounce the API call so it fires only after the user pauses typing. For a check that only matters at submit, run it inside the submit handler and call `setError` on failure instead of validating live.

*Source: [10-Forms-and-Validation.md#6-how-do-you-implement-async-validation-such-as-checking-username-availability](10-Forms-and-Validation.md#6-how-do-you-implement-async-validation-such-as-checking-username-availability)*

### 7. How do you handle a dynamically growing list of fields, like multiple addresses?

**Answer:** Use `useFieldArray` in React Hook Form (or Formik's `FieldArray`), which manages an array of registered fields and exposes `append`/`remove`/`fields`. The critical detail is using the library-generated stable `field.id` as the React key rather than the array index, since removing a middle row shifts every later index and can cause React to misattribute input state to the wrong row.

*Source: [10-Forms-and-Validation.md#7-how-do-you-handle-a-dynamically-growing-list-of-fields-like-multiple-addresses](10-Forms-and-Validation.md#7-how-do-you-handle-a-dynamically-growing-list-of-fields-like-multiple-addresses)*

### 8. How do you validate that two fields agree, such as password and confirm-password?

**Answer:** Read the first field's live value with `watch` (or `useWatch` for a narrower re-render) and reference it inside the second field's `validate` function, returning true or an error message when they don't match. In Formik/Yup, the equivalent is a schema-level `.test()` that has access to sibling fields via the validation context.

*Source: [10-Forms-and-Validation.md#8-how-do-you-validate-that-two-fields-agree-such-as-password-and-confirm-password](10-Forms-and-Validation.md#8-how-do-you-validate-that-two-fields-agree-such-as-password-and-confirm-password)*

### 9. What's the tradeoff of validating everything on submit only?

**Answer:** It's the cheapest to build and avoids any premature error flashing, but the user gets zero feedback until they've filled the entire form and pressed submit, which is a poor experience on longer forms. It's an acceptable choice only for very short forms, such as a single search or subscribe field.

*Source: [10-Forms-and-Validation.md#9-whats-the-tradeoff-of-validating-everything-on-submit-only](10-Forms-and-Validation.md#9-whats-the-tradeoff-of-validating-everything-on-submit-only)*

### 10. Why is `PATCH`-style partial state update (`{ ...prev, [name]: value }`) the standard shape for manual form state?

**Answer:** Keeping all field values in a single object keyed by the input's `name` attribute lets one `handleChange` function serve every field, rather than one `useState` and one handler per field. It also mirrors how validation and error objects are naturally shaped — `Partial<Record<keyof FormData, string>>` — so values, errors, and touched state can all be looked up by the same key.

*Source: [10-Forms-and-Validation.md#10-why-is-patch-style-partial-state-update-prev-name-value-the-standard-shape-for-manual-form-state](10-Forms-and-Validation.md#10-why-is-patch-style-partial-state-update-prev-name-value-the-standard-shape-for-manual-form-state)*

## [11. SSR, CSR, and Next.js](11-SSR-CSR-and-Nextjs.md)

### 1. What is the fundamental difference between CSR and SSR?

**Answer:** CSR ships a near-empty HTML shell and lets the browser build the page after downloading and executing JavaScript; SSR executes the component tree on the server per request and ships a complete HTML string that the browser paints immediately, then hydrates. The practical difference is where the "white screen" wait happens: on the client waiting for JS in CSR, or on the server computing the response in SSR (a TTFB cost).

*Source: [11-SSR-CSR-and-Nextjs.md#1-what-is-the-fundamental-difference-between-csr-and-ssr](11-SSR-CSR-and-Nextjs.md#1-what-is-the-fundamental-difference-between-csr-and-ssr)*

### 2. What is SSG and how does it differ from SSR?

**Answer:** SSG renders pages once at build time into static HTML served by a CDN, with no per-request server compute; SSR renders on every request. SSG gets CSR-level TTFB with SSR-level FCP, but the trade-off is staleness — content is only as fresh as the last build, which is why a product catalog favors SSG/ISR while a live checkout page favors SSR.

*Source: [11-SSR-CSR-and-Nextjs.md#2-what-is-ssg-and-how-does-it-differ-from-ssr](11-SSR-CSR-and-Nextjs.md#2-what-is-ssg-and-how-does-it-differ-from-ssr)*

### 3. What is ISR and when would you use it over plain SSG?

**Answer:** ISR is SSG with a revalidation window — the cached page is served instantly, and after the window expires, one request triggers a background re-render that updates the cache for everyone after, without a full rebuild. Use it when data changes occasionally (product prices, blog content) and near-real-time freshness is not required, avoiding both SSG's staleness and SSR's per-request server cost.

*Source: [11-SSR-CSR-and-Nextjs.md#3-what-is-isr-and-when-would-you-use-it-over-plain-ssg](11-SSR-CSR-and-Nextjs.md#3-what-is-isr-and-when-would-you-use-it-over-plain-ssg)*

### 4. Walk through the hydration sequence for an SSR page.

**Answer:** The server renders the full component tree to an HTML string and sends it; the browser parses and paints that HTML immediately, so the user sees content before any JS has run. The browser then downloads the JS bundle in the background, and once ready, React "hydrates" by walking the existing DOM and attaching its internal representation and event listeners to it, rather than rebuilding the DOM from scratch. Until hydration finishes, the page is visible but not interactive — clicking a button does nothing yet.

*Source: [11-SSR-CSR-and-Nextjs.md#4-walk-through-the-hydration-sequence-for-an-ssr-page](11-SSR-CSR-and-Nextjs.md#4-walk-through-the-hydration-sequence-for-an-ssr-page)*

### 5. Is Next.js a replacement for React?

**Answer:** No — Next.js is a framework built on top of React; every Next.js component is still a React component using the same hooks and JSX. Next.js adds the parts React intentionally does not provide: file-based routing, SSR/SSG/ISR rendering, API routes, and built-in image/font optimization.

*Source: [11-SSR-CSR-and-Nextjs.md#5-is-nextjs-a-replacement-for-react](11-SSR-CSR-and-Nextjs.md#5-is-nextjs-a-replacement-for-react)*

### 6. What would you have to hand-roll in a plain React (Vite/CRA) app that Next.js gives you out of the box?

**Answer:** Routing (`react-router-dom` and manual route configuration), any server-side rendering (there is none by default — a plain React app is CSR-only unless you build a custom SSR server), a separate backend service for any API endpoint, and image optimization (responsive `srcset`, format conversion, lazy loading) all have to be built or wired up manually. Next.js provides file-based routing, SSR/SSG/ISR per page, colocated API routes, and `next/image`/`next/font` automatically.

*Source: [11-SSR-CSR-and-Nextjs.md#6-what-would-you-have-to-hand-roll-in-a-plain-react-vitecra-app-that-nextjs-gives-you-out-of-the-box](11-SSR-CSR-and-Nextjs.md#6-what-would-you-have-to-hand-roll-in-a-plain-react-vitecra-app-that-nextjs-gives-you-out-of-the-box)*

### 7. When would you still choose plain React over Next.js?

**Answer:** For a pure SPA sitting behind authentication where SEO is irrelevant — an internal admin dashboard or analytics console that every user reaches only after logging in. There is nothing to gain from server rendering or file-based routing overhead there, and a Vite SPA deploys as static files with simpler infrastructure and no server-cost or cache-invalidation concerns.

*Source: [11-SSR-CSR-and-Nextjs.md#7-when-would-you-still-choose-plain-react-over-nextjs](11-SSR-CSR-and-Nextjs.md#7-when-would-you-still-choose-plain-react-over-nextjs)*

### 8. What's the difference between the App Router and the Pages Router?

**Answer:** The Pages Router (`pages/`) uses exported functions like `getServerSideProps` and `getStaticProps` for data fetching, and every page is client-rendered after being delivered as HTML. The App Router (`app/`) replaces those with `async` Server Components that fetch data directly and a `fetch`-level cache for ISR-style revalidation, and adds persistent `layout.js` files that avoid remounting shared UI across nested route changes.

*Source: [11-SSR-CSR-and-Nextjs.md#8-whats-the-difference-between-the-app-router-and-the-pages-router](11-SSR-CSR-and-Nextjs.md#8-whats-the-difference-between-the-app-router-and-the-pages-router)*

### 9. What is a React Server Component, and how does it differ from a Client Component?

**Answer:** A Server Component runs only on the server — it can be `async`, query data directly, and its code never ships to the browser bundle at all. Adding `"use client"` at the top of a file marks it (and its imports) as a Client Component, which ships to the browser and can use `useState`, `useEffect`, and DOM event handlers. This is a new mental model beyond plain React, where every component unconditionally ships as client JS.

*Source: [11-SSR-CSR-and-Nextjs.md#9-what-is-a-react-server-component-and-how-does-it-differ-from-a-client-component](11-SSR-CSR-and-Nextjs.md#9-what-is-a-react-server-component-and-how-does-it-differ-from-a-client-component)*

### 10. Why can't a Server Component use `useState` or an `onClick` handler?

**Answer:** Server Components run once on the server to produce output and are never re-rendered in the browser in response to user interaction, so there is no runtime on the client to hold state or dispatch events for them. Any interactivity has to be pushed down into a `"use client"` leaf component, which is why patterns like the product page's "like" button are extracted into their own client file while the surrounding page stays a Server Component.

*Source: [11-SSR-CSR-and-Nextjs.md#10-why-cant-a-server-component-use-usestate-or-an-onclick-handler](11-SSR-CSR-and-Nextjs.md#10-why-cant-a-server-component-use-usestate-or-an-onclick-handler)*

### 11. What causes a hydration mismatch error, and give a concrete example?

**Answer:** It happens when the HTML React would produce on the client's first render does not match the HTML the server actually sent — commonly because the render reads something that differs between environments, like `Date.now()` (different clock/instant) or `window` (undefined on the server). A countdown timer computed directly in a component body during both server and client render is a classic example; the fix is to render a static placeholder on both server and initial client render, then update the live value from inside a `useEffect` after mount.

*Source: [11-SSR-CSR-and-Nextjs.md#11-what-causes-a-hydration-mismatch-error-and-give-a-concrete-example](11-SSR-CSR-and-Nextjs.md#11-what-causes-a-hydration-mismatch-error-and-give-a-concrete-example)*

### 12. How does `getServerSideProps` differ from `getStaticProps`, and how does the App Router change this?

**Answer:** `getServerSideProps` runs on every request (SSR); `getStaticProps` runs at build time (SSG), optionally with `revalidate` for ISR. The App Router replaces both with `async` Server Components that call `fetch` directly, where the caching behavior — SSR-like (no cache), SSG-like (cached indefinitely), or ISR-like (`revalidate: N`) — is configured per fetch call instead of per exported function.

*Source: [11-SSR-CSR-and-Nextjs.md#12-how-does-getserversideprops-differ-from-getstaticprops-and-how-does-the-app-router-change-this](11-SSR-CSR-and-Nextjs.md#12-how-does-getserversideprops-differ-from-getstaticprops-and-how-does-the-app-router-change-this)*

## [12. Common UI Component Problems](12-Common-UI-Component-Problems.md)

### 1. Why isn't debouncing alone enough to make a search box correct?

**Answer:** Debouncing only controls *how often* requests are sent, not the *order in which responses arrive*. If a request for a shorter, earlier query happens to resolve after a request for a longer, later query, its stale response can overwrite the correct one already on screen. Fixing that race requires either cancelling the earlier request (AbortController) or tagging each response with its query and ignoring any response that doesn't match the current input.

*Source: [12-Common-UI-Component-Problems.md#1-why-isnt-debouncing-alone-enough-to-make-a-search-box-correct](12-Common-UI-Component-Problems.md#1-why-isnt-debouncing-alone-enough-to-make-a-search-box-correct)*

### 2. Why use `AbortController` instead of a boolean "cancelled" flag to handle stale requests?

**Answer:** A boolean flag checked after `await fetch(...)` resolves still lets the network request run to completion in the background, wasting bandwidth and server work, and it requires manually re-checking the flag at every await point. `AbortController.abort()` actually terminates the underlying HTTP request immediately, throws a distinguishable `AbortError` you can filter out in the `catch` block, and composes cleanly with `fetch`'s built-in `signal` option instead of hand-rolled bookkeeping.

*Source: [12-Common-UI-Component-Problems.md#2-why-use-abortcontroller-instead-of-a-boolean-cancelled-flag-to-handle-stale-requests](12-Common-UI-Component-Problems.md#2-why-use-abortcontroller-instead-of-a-boolean-cancelled-flag-to-handle-stale-requests)*

### 3. Why does infinite scroll use `IntersectionObserver` instead of a `scroll` event listener?

**Answer:** A `scroll` listener fires continuously as the user scrolls, forcing you to throttle it and manually compute `getBoundingClientRect()` on every tick just to ask "is the sentinel visible yet" — expensive and easy to get wrong. `IntersectionObserver` asks the browser to answer that exact visibility question asynchronously off the main thread, and only calls back when the intersection state actually changes, so there's no manual throttling and no layout-thrashing reads.

*Source: [12-Common-UI-Component-Problems.md#3-why-does-infinite-scroll-use-intersectionobserver-instead-of-a-scroll-event-listener](12-Common-UI-Component-Problems.md#3-why-does-infinite-scroll-use-intersectionobserver-instead-of-a-scroll-event-listener)*

### 4. Why does the dropdown's click-outside handler listen on `mousedown` rather than `click`?

**Answer:** `mousedown` fires before `click`, so closing the menu on `mousedown` guarantees the menu is already closed by the time any `click` handler underneath it (or on the trigger button itself) runs. Listening on `click` instead can create ordering bugs — e.g. a click on the trigger button both closing the menu via the outside-click handler and immediately reopening it via the button's own `onClick`.

*Source: [12-Common-UI-Component-Problems.md#4-why-does-the-dropdowns-click-outside-handler-listen-on-mousedown-rather-than-click](12-Common-UI-Component-Problems.md#4-why-does-the-dropdowns-click-outside-handler-listen-on-mousedown-rather-than-click)*

### 5. Why does the modal both add a `keydown` listener and reset `document.body.style.overflow` inside the same `useEffect`, and why does the cleanup function matter here?

**Answer:** Both are page-global side effects — a global key listener and a global style change — that must not outlive the modal being open, or they'll affect the rest of the app even after the modal closes. The cleanup function returned from `useEffect` runs on every close and on unmount, removing the listener and restoring `overflow: 'unset'`; without it, closing the modal without unmounting the component would leave scroll permanently locked and stack up duplicate `keydown` listeners on repeated opens.

*Source: [12-Common-UI-Component-Problems.md#5-why-does-the-modal-both-add-a-keydown-listener-and-reset-documentbodystyleoverflow-inside-the-same-useeffect-and-why-does-the-cleanup-function-matter-here](12-Common-UI-Component-Problems.md#5-why-does-the-modal-both-add-a-keydown-listener-and-reset-documentbodystyleoverflow-inside-the-same-useeffect-and-why-does-the-cleanup-function-matter-here)*

### 6. Why implement the toast system with React Context and a hook instead of a global mutable array plus manual re-renders?

**Answer:** Context lets any component in the tree call `showToast` without the parent chain having to pass the function down as props (no prop drilling), while state updates through `setToasts` still go through React's normal render cycle so the `ToastContainer` re-renders correctly and predictably. A module-level mutable array bypasses React's rendering model entirely, so nothing would visually update unless you manually forced a re-render from outside React.

*Source: [12-Common-UI-Component-Problems.md#6-why-implement-the-toast-system-with-react-context-and-a-hook-instead-of-a-global-mutable-array-plus-manual-re-renders](12-Common-UI-Component-Problems.md#6-why-implement-the-toast-system-with-react-context-and-a-hook-instead-of-a-global-mutable-array-plus-manual-re-renders)*

### 7. What's wrong with generating toast ids using `Math.random().toString(36)`, and what would you use in a production system?

**Answer:** It's not cryptographically unique — with enough toasts in a session, collisions become possible, and a duplicate `id` breaks the `key` prop in the list render and can cause `removeToast` to remove the wrong toast. `crypto.randomUUID()` (or a small library like `nanoid`) gives collision-resistant unique ids with effectively the same one-line ergonomics.

*Source: [12-Common-UI-Component-Problems.md#7-whats-wrong-with-generating-toast-ids-using-mathrandomtostring36-and-what-would-you-use-in-a-production-system](12-Common-UI-Component-Problems.md#7-whats-wrong-with-generating-toast-ids-using-mathrandomtostring36-and-what-would-you-use-in-a-production-system)*

### 8. Why does the pagination component collapse the page list into windows with "..." instead of rendering every page number?

**Answer:** Rendering all `totalPages` buttons is fine for 5 pages but unusable for 5,000 — the control would overflow its container and the DOM would carry hundreds of unnecessary button nodes. Keeping only the first page, last page, and a small window around the current page (with "..." filling the gaps) keeps the control's width bounded and its render cost constant regardless of dataset size.

*Source: [12-Common-UI-Component-Problems.md#8-why-does-the-pagination-component-collapse-the-page-list-into-windows-with-instead-of-rendering-every-page-number](12-Common-UI-Component-Problems.md#8-why-does-the-pagination-component-collapse-the-page-list-into-windows-with-instead-of-rendering-every-page-number)*

## [13. Frontend System Design Scenarios](13-Frontend-System-Design-Scenarios.md)

### 1. Why does organizing a large React app by file type break down, and what replaces it?

**Answer:** Type-based folders (`components/`, `hooks/`, `pages/`) scatter the logic for one feature across several unrelated directories, so understanding or changing a feature means opening files spread across the whole codebase. A feature-based structure groups each feature's components, hooks, services, and state together, so ownership and onboarding scale with the number of features rather than the number of files.

*Source: [13-Frontend-System-Design-Scenarios.md#1-why-does-organizing-a-large-react-app-by-file-type-break-down-and-what-replaces-it](13-Frontend-System-Design-Scenarios.md#1-why-does-organizing-a-large-react-app-by-file-type-break-down-and-what-replaces-it)*

### 2. How do code splitting and lazy loading work together, and what does `Suspense` add?

**Answer:** Code splitting breaks one large bundle into smaller per-route chunks; lazy loading (`React.lazy`) ensures a chunk is only requested when its route is actually visited, instead of upfront. `Suspense` covers the gap while that chunk downloads by rendering a fallback, so the UI shows a loading state instead of freezing or going blank.

*Source: [13-Frontend-System-Design-Scenarios.md#2-how-do-code-splitting-and-lazy-loading-work-together-and-what-does-suspense-add](13-Frontend-System-Design-Scenarios.md#2-how-do-code-splitting-and-lazy-loading-work-together-and-what-does-suspense-add)*

### 3. Why is retrying a failed request immediately after a 429 dangerous, and what should replace it?

**Answer:** An immediate retry adds more load to a backend that just told you it's overwhelmed, which usually produces another failure and can trigger a retry storm across many clients at once. Exponential backoff with jitter, a bounded retry count, and respecting a `Retry-After` header if the server sends one give the backend room to recover instead of compounding the problem.

*Source: [13-Frontend-System-Design-Scenarios.md#3-why-is-retrying-a-failed-request-immediately-after-a-429-dangerous-and-what-should-replace-it](13-Frontend-System-Design-Scenarios.md#3-why-is-retrying-a-failed-request-immediately-after-a-429-dangerous-and-what-should-replace-it)*

### 4. What causes a Next.js hydration mismatch? Give two concrete triggers and their fixes.

**Answer:** A mismatch happens whenever the server-rendered HTML and the client's first render compute different output — for example, reading `window.innerWidth` (undefined on the server, a real number in the browser) or rendering a conditional based on a client-only auth check the server never saw. Both are fixed the same way: defer the browser-only or client-only logic into `useEffect` so the value used during hydration's before-mount comparison matches on both sides, then let the effect correct it afterward.

*Source: [13-Frontend-System-Design-Scenarios.md#4-what-causes-a-nextjs-hydration-mismatch-give-two-concrete-triggers-and-their-fixes](13-Frontend-System-Design-Scenarios.md#4-what-causes-a-nextjs-hydration-mismatch-give-two-concrete-triggers-and-their-fixes)*

### 5. Why does fixing a hydration issue with `useEffect` still cause a visible flash?

**Answer:** `useEffect` only runs after React has already compared the server HTML against the client's first render and mounted the tree, so the first paint necessarily uses the same placeholder value the server used (like `undefined`). The effect then updates that value a tick later, trading a hard hydration error for a brief, deliberate flash instead of eliminating the visible change entirely.

*Source: [13-Frontend-System-Design-Scenarios.md#5-why-does-fixing-a-hydration-issue-with-useeffect-still-cause-a-visible-flash](13-Frontend-System-Design-Scenarios.md#5-why-does-fixing-a-hydration-issue-with-useeffect-still-cause-a-visible-flash)*

### 6. What's the practical difference between a shared component library and a design system?

**Answer:** A component library is the code — reusable `Button`, `Modal`, and `Input` components consuming teams can import. A design system is the layer above it: the design tokens, theming rules, documentation, versioning discipline, and governance that make that code consistent and safe for many teams to depend on. A library without that layer tends to drift back into inconsistency as more teams touch it.

*Source: [13-Frontend-System-Design-Scenarios.md#6-whats-the-practical-difference-between-a-shared-component-library-and-a-design-system](13-Frontend-System-Design-Scenarios.md#6-whats-the-practical-difference-between-a-shared-component-library-and-a-design-system)*

### 7. How would you decide whether a given page should be CSR, SSR, or SSG?

**Answer:** Ask whether the page needs to be indexed by search engines and whether its content changes between builds. Content that's stable and doesn't need real-time data is the cheapest as SSG; pages that need both SEO and current data on every load need SSR; and authenticated, highly interactive surfaces with no SEO requirement, like a dashboard, are well served by CSR. Most real products end up running all three side by side, chosen per route rather than once for the whole app.

*Source: [13-Frontend-System-Design-Scenarios.md#7-how-would-you-decide-whether-a-given-page-should-be-csr-ssr-or-ssg](13-Frontend-System-Design-Scenarios.md#7-how-would-you-decide-whether-a-given-page-should-be-csr-ssr-or-ssg)*

### 8. What's the single biggest lever for scaling a frontend to 1M+ daily users, and why doesn't caching alone fix backend overload?

**Answer:** There isn't one lever — delivery (CDN, code splitting), backend load (caching and deduplication), release safety (feature flags), security, and observability all have to move together, because at that scale each one becomes a bottleneck on its own. Caching reduces redundant requests but doesn't help the requests that are genuinely new or user-specific, so backend capacity and request deduplication still matter independently of how well the cache performs.

*Source: [13-Frontend-System-Design-Scenarios.md#8-whats-the-single-biggest-lever-for-scaling-a-frontend-to-1m-daily-users-and-why-doesnt-caching-alone-fix-backend-overload](13-Frontend-System-Design-Scenarios.md#8-whats-the-single-biggest-lever-for-scaling-a-frontend-to-1m-daily-users-and-why-doesnt-caching-alone-fix-backend-overload)*

### 9. Why is a modular monolith often the right starting point instead of jumping straight to microfrontends?

**Answer:** A modular monolith already gets you feature isolation, independent ownership, and clear boundaries without the operational cost of multiple independently deployed applications — shared tooling, cross-app routing, and versioned contracts between apps. Microfrontends are worth the added complexity once a single deployable genuinely can't scale for the organization anymore, not as a default architecture chosen upfront.

*Source: [13-Frontend-System-Design-Scenarios.md#9-why-is-a-modular-monolith-often-the-right-starting-point-instead-of-jumping-straight-to-microfrontends](13-Frontend-System-Design-Scenarios.md#9-why-is-a-modular-monolith-often-the-right-starting-point-instead-of-jumping-straight-to-microfrontends)*

### 10. Where do `useContext`, Zustand, and Redux each fit in a layered state strategy?

**Answer:** `useContext` is a distribution mechanism, not a store — it's fine for state that changes rarely, like a theme, because every consumer re-renders on any value change. Zustand fits medium-to-large client state (modals, active tabs, session) where you want selective subscriptions with minimal setup. Redux fits large, highly interconnected state where a team specifically needs strict unidirectional data flow and time-travel debugging, at the cost of more boilerplate and friction with server-rendered components.

*Source: [13-Frontend-System-Design-Scenarios.md#10-where-do-usecontext-zustand-and-redux-each-fit-in-a-layered-state-strategy](13-Frontend-System-Design-Scenarios.md#10-where-do-usecontext-zustand-and-redux-each-fit-in-a-layered-state-strategy)*

### 11. Why does offset-based pagination (`page=3`) break down for infinite scroll over a dataset that changes while the user is browsing it?

**Answer:** Offset pagination identifies a page by position, so if rows are inserted or deleted elsewhere in the dataset between requests, "page 3" now refers to a different slice of data than the user was actually scrolled to, producing visible duplicates or gaps. A keyset/cursor built from the last item's own sort key instead of its position is stable under concurrent inserts and deletes, because it always means "everything after this specific item," not "everything at this specific offset."

*Source: [13-Frontend-System-Design-Scenarios.md#11-why-does-offset-based-pagination-page3-break-down-for-infinite-scroll-over-a-dataset-that-changes-while-the-user-is-browsing-it](13-Frontend-System-Design-Scenarios.md#11-why-does-offset-based-pagination-page3-break-down-for-infinite-scroll-over-a-dataset-that-changes-while-the-user-is-browsing-it)*

### 12. Why should a large data grid virtualize both rows and columns instead of just paginating the rows?

**Answer:** Even a single fully-rendered page of a wide grid can mean rendering far more DOM cells than are ever visible in the viewport at once, which is expensive to lay out and paint regardless of how the rows were fetched. Virtualizing both axes recycles a small, constant number of DOM nodes for whatever is currently scrolled into view, keeping rendering cost roughly constant instead of scaling with total row and column count.

*Source: [13-Frontend-System-Design-Scenarios.md#12-why-should-a-large-data-grid-virtualize-both-rows-and-columns-instead-of-just-paginating-the-rows](13-Frontend-System-Design-Scenarios.md#12-why-should-a-large-data-grid-virtualize-both-rows-and-columns-instead-of-just-paginating-the-rows)*

### 13. Why upload large files directly to object storage via a presigned URL instead of routing them through your own application server?

**Answer:** Routing file bytes through your server makes your server's own bandwidth and memory the bottleneck for every concurrent upload, and ties up a request for the entire transfer duration. A presigned URL lets the browser upload directly to storage (S3/GCS) while your server only issues the short-lived credential and confirms completion afterward, keeping large-file traffic off your application infrastructure entirely.

*Source: [13-Frontend-System-Design-Scenarios.md#13-why-upload-large-files-directly-to-object-storage-via-a-presigned-url-instead-of-routing-them-through-your-own-application-server](13-Frontend-System-Design-Scenarios.md#13-why-upload-large-files-directly-to-object-storage-via-a-presigned-url-instead-of-routing-them-through-your-own-application-server)*

### 14. How would you prevent a user from seeing the same real-time notification twice across two open tabs?

**Answer:** Give every notification a stable ID and deduplicate against IDs already shown in this browser session before displaying anything. A `BroadcastChannel` (or a shared `localStorage` key with a `storage` event) lets open tabs of the same app coordinate which notifications have already been surfaced, so only one tab actually shows the toast even though both received the same live update.

*Source: [13-Frontend-System-Design-Scenarios.md#14-how-would-you-prevent-a-user-from-seeing-the-same-real-time-notification-twice-across-two-open-tabs](13-Frontend-System-Design-Scenarios.md#14-how-would-you-prevent-a-user-from-seeing-the-same-real-time-notification-twice-across-two-open-tabs)*
