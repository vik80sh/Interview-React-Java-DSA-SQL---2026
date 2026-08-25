# Master Question Bank — React Interview Prep

This file aggregates **every interview question and its full answer** from each of the 13 files in this folder (`01-Fundamentals-Rendering-Reconciliation-Fiber.md` through `13-Frontend-System-Design-Scenarios.md`), in one place, so you can drill the whole set without opening each file individually. Answers are copied verbatim from their source file. Every question links back to its exact heading in the original file (`*Source: ...*` line beneath each answer) so you can open that file for the surrounding lesson content, code examples, and Revision Checklist that give it fuller context.

## [1. React Fundamentals: Rendering, Reconciliation, and Fiber](01-Fundamentals-Rendering-Reconciliation-Fiber.md)

### 1. What does it mean that React is declarative, and why does that matter?

**Answer:** Simple way to remember it: declarative means you describe the destination, not the turn-by-turn directions. You just say what the UI should look like for the current state and props, and React works out the DOM steps itself. Why it matters: the same state always produces the same output. So when something's wrong, you're asking "which state value is wrong," not "which imperative DOM call fired in the wrong order" — a much smaller bug to hunt down.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#1-what-does-it-mean-that-react-is-declarative-and-why-does-that-matter](01-Fundamentals-Rendering-Reconciliation-Fiber.md#1-what-does-it-mean-that-react-is-declarative-and-why-does-that-matter)*

### 2. What is the Virtual DOM, and why is diffing it faster than manipulating the real DOM directly?

**Answer:** Think of the Virtual DOM as a lightweight blueprint of the UI — just a plain JS object tree of `{ type, props, children }`, with none of the heavy machinery a real DOM node carries, like layout, style, and event listeners. Comparing two blueprints in memory is basically free. Touching the real DOM is expensive, because it can trigger layout recalculation and repaint. So React does all its "what changed" thinking on the cheap blueprint first, and only touches the real DOM for the minimal set of actual changes at the end.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#2-what-is-the-virtual-dom-and-why-is-diffing-it-faster-than-manipulating-the-real-dom-directly](01-Fundamentals-Rendering-Reconciliation-Fiber.md#2-what-is-the-virtual-dom-and-why-is-diffing-it-faster-than-manipulating-the-real-dom-directly)*

### 3. Walk through what happens when a single piece of state changes, from render to paint.

**Answer:** Three stages, in order: render, reconcile, commit. Render — React reruns the component function, and any children affected, to build a new Virtual DOM tree. That's pure calculation, no DOM touched yet. Reconcile — React diffs that new tree against the previous one to work out the minimal list of real changes needed. Commit — React applies just those changes to the real DOM. Only after commit does the browser actually paint the screen.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#3-walk-through-what-happens-when-a-single-piece-of-state-changes-from-render-to-paint](01-Fundamentals-Rendering-Reconciliation-Fiber.md#3-walk-through-what-happens-when-a-single-piece-of-state-changes-from-render-to-paint)*

### 4. Why does using an array index as a `key` break when a list of cart items gets reordered?

**Answer:** Here's the mental picture: a key is React's way of asking "is this the same item as before, or a new one?" Use the array index as the key, and you're really telling React "identity equals position" instead of "identity equals this specific item." So say the Mouse row is at index 0 with a typed-in quantity, and after a sort the USB-C Hub row moves into index 0 instead. React sees key `0` is still a `CartRow`, so it reuses that same DOM node — including whatever quantity was typed into the input — and just updates the props on top. The typed quantity now sits on the wrong product. Fix: use a stable key like `item.id`, so identity travels with the actual data, not with its slot in the array.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#4-why-does-using-an-array-index-as-a-key-break-when-a-list-of-cart-items-gets-reordered](01-Fundamentals-Rendering-Reconciliation-Fiber.md#4-why-does-using-an-array-index-as-a-key-break-when-a-list-of-cart-items-gets-reordered)*

### 5. When is index-as-key actually fine?

**Answer:** Rule of thumb: index-as-key is fine only when the list truly never changes order — no reordering, no filtering, no inserting or removing items in the middle. In that case position and identity are always the same thing, so there's nothing to get confused. The moment sorting, filtering, deleting, or inserting shows up, switch to a real identity-based key, like a database ID.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#5-when-is-index-as-key-actually-fine](01-Fundamentals-Rendering-Reconciliation-Fiber.md#5-when-is-index-as-key-actually-fine)*

### 6. What problem did Fiber solve that the old stack reconciler couldn't?

**Answer:** The old stack reconciler had one big weakness: it walked the component tree using plain recursive function calls, and you can't pause a call stack halfway through. So a big update just ran start-to-finish synchronously, no matter how long it took — and while that was happening, the main thread was blocked, so typing and animations froze. Fiber's fix is to restructure that walk as a linked list of small units of work, so React can pause after any single unit and pick back up later.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#6-what-problem-did-fiber-solve-that-the-old-stack-reconciler-couldnt](01-Fundamentals-Rendering-Reconciliation-Fiber.md#6-what-problem-did-fiber-solve-that-the-old-stack-reconciler-couldnt)*

### 7. Give a concrete scenario where Fiber's interruptibility is visibly the difference between good and bad UX.

**Answer:** Picture a search box filtering a huge product grid. Typing one character re-renders hundreds of `ProductCard`s, and that takes real time. Without Fiber, that render blocks the thread, so the next keystroke feels dropped or laggy. With Fiber, React can pause the grid re-render mid-flight, jump to handle the new keystroke first, and resume the grid work afterward. So typing stays smooth even while a big re-render is happening behind the scenes.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#7-give-a-concrete-scenario-where-fibers-interruptibility-is-visibly-the-difference-between-good-and-bad-ux](01-Fundamentals-Rendering-Reconciliation-Fiber.md#7-give-a-concrete-scenario-where-fibers-interruptibility-is-visibly-the-difference-between-good-and-bad-ux)*

### 8. Why does Fiber split work into a render phase and a commit phase, and why is only one of them interruptible?

**Answer:** Think of it as "plan first, then act." The render phase just builds a new work-in-progress tree and runs component functions and hooks — pure calculation, no visible side effects — so it's totally safe to pause, throw away, or restart. The commit phase is different: it actually mutates the real DOM and fires effects. If React paused halfway through committing, the user would be staring at a half-applied, visually broken layout. So commit always runs synchronously, start to finish, once it starts.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#8-why-does-fiber-split-work-into-a-render-phase-and-a-commit-phase-and-why-is-only-one-of-them-interruptible](01-Fundamentals-Rendering-Reconciliation-Fiber.md#8-why-does-fiber-split-work-into-a-render-phase-and-a-commit-phase-and-why-is-only-one-of-them-interruptible)*

### 9. What is a Fiber node, structurally?

**Answer:** A Fiber node is just a plain JavaScript object representing one unit of work — one component or one DOM element. It holds pointers to its child, sibling, and parent fiber, which together form a linked-list-style tree instead of relying on the native call stack. It also holds an `alternate` pointer back to its previous version, for diffing, and an effect tag — `PLACEMENT`, `UPDATE`, or `DELETION` — recording what changed. That structure is exactly what lets React traverse, pause, and resume the tree on its own terms.

*Source: [01-Fundamentals-Rendering-Reconciliation-Fiber.md#9-what-is-a-fiber-node-structurally](01-Fundamentals-Rendering-Reconciliation-Fiber.md#9-what-is-a-fiber-node-structurally)*

## [2. React Hooks Deep Dive](02-Hooks-Deep-Dive.md)

### 1. Why does `console.log(state)` right after calling its setter still show the old value?

**Answer:** Simple way to remember it: calling the setter doesn't change the value in place, it schedules a fresh render. The `state` variable you're holding right now belongs to the current render's closure, frozen at whatever it was when this render started. The updated value only shows up in the *next* render's closure. So reading `state` on the very next line after calling `setState(...)` still gives you the old value — that's expected, not a bug.

*Source: [02-Hooks-Deep-Dive.md#1-why-does-consolelogstate-right-after-calling-its-setter-still-show-the-old-value](02-Hooks-Deep-Dive.md#1-why-does-consolelogstate-right-after-calling-its-setter-still-show-the-old-value)*

### 2. What's the difference between `useState(expensiveFn())` and `useState(() => expensiveFn())`?

**Answer:** The first form runs `expensiveFn()` on every single render, then throws the result away every time except the first, because React only actually uses the initial value once. Wasteful. The second form passes a lazy initializer function, and React calls that function exactly once, on mount. This matters any time the initial value takes real work to produce — parsing something from `localStorage`, reading from a cache, that kind of thing.

*Source: [02-Hooks-Deep-Dive.md#2-whats-the-difference-between-usestateexpensivefn-and-usestate-expensivefn](02-Hooks-Deep-Dive.md#2-whats-the-difference-between-usestateexpensivefn-and-usestate-expensivefn)*

### 3. How does React know which cleanup function belongs to which effect when a component has several `useEffect` calls?

**Answer:** React tracks each `useEffect` call by its position in the component's hook list — same order, every single render. So each effect gets paired with the cleanup function it returned last time, just by matching that same slot number. When it's time to clean up, they unwind in reverse order from how they were declared, like popping a stack, and that happens right before the next matching effect runs, or when the component unmounts.

*Source: [02-Hooks-Deep-Dive.md#3-how-does-react-know-which-cleanup-function-belongs-to-which-effect-when-a-component-has-several-useeffect-calls](02-Hooks-Deep-Dive.md#3-how-does-react-know-which-cleanup-function-belongs-to-which-effect-when-a-component-has-several-useeffect-calls)*

### 4. Why does a search-as-you-type feature sometimes show results for an earlier, shorter query instead of the latest one?

**Answer:** This is a classic race condition. A request fires on every keystroke, and network timing is unpredictable — so an earlier request, for a shorter and less specific query, can actually come back *after* a later, more specific one. Whichever response lands last just overwrites the screen, correct or not. The fix is a cancellation flag or an `AbortController`, set up in the effect's cleanup, so that when a newer request starts, any stale response still in flight gets ignored instead of overwriting the right results.

*Source: [02-Hooks-Deep-Dive.md#4-why-does-a-search-as-you-type-feature-sometimes-show-results-for-an-earlier-shorter-query-instead-of-the-latest-one](02-Hooks-Deep-Dive.md#4-why-does-a-search-as-you-type-feature-sometimes-show-results-for-an-earlier-shorter-query-instead-of-the-latest-one)*

### 5. What actually happens if `useEffect` is given no dependency array at all?

**Answer:** No dependency array means "run after every single render," no exceptions. So if that effect calls `setState`, that triggers another render, which runs the effect again, which calls `setState` again — an infinite loop. Compare that to an empty array `[]`, which means "run once, on mount, and never again." Those two are very different things, and skipping the array entirely is almost never what you actually want.

*Source: [02-Hooks-Deep-Dive.md#5-what-actually-happens-if-useeffect-is-given-no-dependency-array-at-all](02-Hooks-Deep-Dive.md#5-what-actually-happens-if-useeffect-is-given-no-dependency-array-at-all)*

### 6. `useMemo` versus `useCallback` — what does each one actually cache?

**Answer:** Simple way to remember it: `useMemo` caches a *value*, `useCallback` caches a *function reference*. `useMemo` runs a function during render and stores what it returns — an object, an array, a computed number, whatever. `useCallback` never actually runs anything; it just hands back the same function reference across renders instead of a new one each time. That only matters for reference-equality checks, like `React.memo` or a dependency array somewhere else — it has zero effect on what the function actually does when called.

*Source: [02-Hooks-Deep-Dive.md#6-usememo-versus-usecallback-what-does-each-one-actually-cache](02-Hooks-Deep-Dive.md#6-usememo-versus-usecallback-what-does-each-one-actually-cache)*

### 7. A child is wrapped in `React.memo` but still re-renders every time its parent renders — why?

**Answer:** `React.memo` only skips the re-render if every single prop is reference-equal to what it got last time — a shallow comparison, via `Object.is`. The usual culprit is an inline arrow function or object literal, like `onClick={() => doThing()}` or `style={{ color: 'red' }}`. Those create a brand-new reference on every single render, no matter what else is memoized, so the shallow comparison always says "something changed." Fix it by wrapping the function in `useCallback` and the object in `useMemo` — or just defining them outside the render entirely.

*Source: [02-Hooks-Deep-Dive.md#7-a-child-is-wrapped-in-reactmemo-but-still-re-renders-every-time-its-parent-renders-why](02-Hooks-Deep-Dive.md#7-a-child-is-wrapped-in-reactmemo-but-still-re-renders-every-time-its-parent-renders-why)*

### 8. Why does changing an unrelated field in a context value cause a component that never reads that field to re-render anyway?

**Answer:** Here's the key thing to remember: `useContext` subscribes to the *whole* context value, not to individual fields inside it. So the moment the provider's value changes at all, every consumer re-renders — it doesn't matter which specific field actually changed. The real fix is splitting one big context into several smaller, focused ones. Separate notifications from language settings, for example, so a component only re-renders when the slice it actually reads from changes.

*Source: [02-Hooks-Deep-Dive.md#8-why-does-changing-an-unrelated-field-in-a-context-value-cause-a-component-that-never-reads-that-field-to-re-render-anyway](02-Hooks-Deep-Dive.md#8-why-does-changing-an-unrelated-field-in-a-context-value-cause-a-component-that-never-reads-that-field-to-re-render-anyway)*

### 9. When would you reach for `useReducer` instead of several `useState` calls?

**Answer:** Reach for `useReducer` when several pieces of state need to change together, as one atomic unit — like a cart's items and total both updating off one `ADD_ITEM` action. Also reach for it when the next state depends heavily on the previous state, in a way that's easy to get inconsistent across a handful of separate setters. A reducer puts every valid transition in one pure, unit-testable function, which makes it much harder to accidentally land in an invalid state.

*Source: [02-Hooks-Deep-Dive.md#9-when-would-you-reach-for-usereducer-instead-of-several-usestate-calls](02-Hooks-Deep-Dive.md#9-when-would-you-reach-for-usereducer-instead-of-several-usestate-calls)*

### 10. Why can't hooks be called inside an `if` statement or a loop?

**Answer:** React keeps each component's hooks in an ordered list, and it matches them up purely by position, not by name. The 5th hook call this render is matched to the 5th hook call from last render — that's it. Put a hook inside an `if` or a loop, and that position can shift between renders. Now a later hook's state or effect silently gets matched against the wrong stored data, with no error thrown to warn you. That silent corruption is exactly why this is a hard rule, not just a style preference.

*Source: [02-Hooks-Deep-Dive.md#10-why-cant-hooks-be-called-inside-an-if-statement-or-a-loop](02-Hooks-Deep-Dive.md#10-why-cant-hooks-be-called-inside-an-if-statement-or-a-loop)*

### 11. Can a custom hook share state between two different components that both call it?

**Answer:** No. Every call to a custom hook gets its own completely independent state — same as calling `useState` twice in two different places never shares a value between them. A custom hook shares *logic*, the implementation, not the actual data. If you need real shared state across components, you lift it up to a common parent or put it in context instead.

*Source: [02-Hooks-Deep-Dive.md#11-can-a-custom-hook-share-state-between-two-different-components-that-both-call-it](02-Hooks-Deep-Dive.md#11-can-a-custom-hook-share-state-between-two-different-components-that-both-call-it)*

### 12. What's the real risk of forgetting a cleanup function in an effect that subscribes to something?

**Answer:** Skip the cleanup, and every time the effect re-runs — a dependency changes, or the component unmounts — the old subscription, listener, or connection never gets torn down. They just pile up. Picture a chat room component that reconnects on every `roomId` change but never disconnects the old room: you end up with a growing pile of live connections, all still firing events into a component that's already moved on.

*Source: [02-Hooks-Deep-Dive.md#12-whats-the-real-risk-of-forgetting-a-cleanup-function-in-an-effect-that-subscribes-to-something](02-Hooks-Deep-Dive.md#12-whats-the-real-risk-of-forgetting-a-cleanup-function-in-an-effect-that-subscribes-to-something)*

## [3. Custom Hooks in React](03-Custom-Hooks.md)

### 1. Do two components calling the same custom hook share state?

**Answer:** No. Think of it like this: every call gets its own private bucket of state, tucked inside that component's own Fiber node. So if `ComponentA` and `ComponentB` both call `useCounter()`, bumping A's counter never touches B's. What the hook actually shares is the reusable *logic* — not a live, connected data value.

*Source: [03-Custom-Hooks.md#1-do-two-components-calling-the-same-custom-hook-share-state](03-Custom-Hooks.md#1-do-two-components-calling-the-same-custom-hook-share-state)*

### 2. Why must a custom hook's name start with `use`?

**Answer:** That `use` prefix is basically a signal flag for the linter. `eslint-plugin-react-hooks` uses the name to recognize "this is a hook" and then enforces the Rules of Hooks on it — call it only at the top level, only from a component or another hook. If a helper function calls `useState` internally but isn't named `useSomething`, the linter has no way to know it needs checking. Call that helper conditionally, and it can break at runtime with zero warning.

*Source: [03-Custom-Hooks.md#2-why-must-a-custom-hooks-name-start-with-use](03-Custom-Hooks.md#2-why-must-a-custom-hooks-name-start-with-use)*

### 3. What problem does `useDebounce` solve, and how does it work internally?

**Answer:** It's a buffer between a fast-changing value, like a search input, and expensive work you don't want firing on every keystroke, like an API call. Here's how: every time the source value changes, the effect clears whatever `setTimeout` was pending and starts a fresh one. The debounced value only actually updates once a timer finishes without being interrupted. So a whole burst of keystrokes collapses down into just one update.

*Source: [03-Custom-Hooks.md#3-what-problem-does-usedebounce-solve-and-how-does-it-work-internally](03-Custom-Hooks.md#3-what-problem-does-usedebounce-solve-and-how-does-it-work-internally)*

### 4. In `useFetch`, why use `AbortController` instead of just an `isMounted` flag?

**Answer:** The difference is: one stops the symptom, the other stops the cause. An `isMounted` flag just blocks the state update from happening — the actual network request is still running in the background, still burning bandwidth and server resources. `AbortController.abort()`, called in the effect's cleanup, actually cancels the underlying HTTP request itself. That matters a lot when a user is clicking quickly through pages that each kick off their own fetch.

*Source: [03-Custom-Hooks.md#4-in-usefetch-why-use-abortcontroller-instead-of-just-an-ismounted-flag](03-Custom-Hooks.md#4-in-usefetch-why-use-abortcontroller-instead-of-just-an-ismounted-flag)*

### 5. Why does `useLocalStorage` read the initial value lazily (`useState(() => ...)`) instead of `useState(localStorage.getItem(key))`?

**Answer:** Passing a plain value means that expression gets evaluated on *every* render, even though `useState` only actually needs it once, on the very first render. For `localStorage.getItem`, that's a wasted synchronous disk read on every single re-render. The lazy initializer function form only runs once, on mount — faster, and no redundant `localStorage` hits.

*Source: [03-Custom-Hooks.md#5-why-does-uselocalstorage-read-the-initial-value-lazily-usestate-instead-of-usestatelocalstoragegetitemkey](03-Custom-Hooks.md#5-why-does-uselocalstorage-read-the-initial-value-lazily-usestate-instead-of-usestatelocalstoragegetitemkey)*

### 6. How would you make `useOnlineStatus` safe to use in many components on the same page?

**Answer:** It's already safe, because each call runs its own `useEffect`, which adds its own `online`/`offline` listeners and removes those exact same listeners in its own cleanup. Since the add/remove is scoped to each individual hook call, ten components all calling `useOnlineStatus()` just gives you ten independent listener pairs — no shared state, no leaks.

*Source: [03-Custom-Hooks.md#6-how-would-you-make-useonlinestatus-safe-to-use-in-many-components-on-the-same-page](03-Custom-Hooks.md#6-how-would-you-make-useonlinestatus-safe-to-use-in-many-components-on-the-same-page)*

### 7. What's the advantage of `useToggle` returning both a `toggle` function and separate `open`/`close` functions?

**Answer:** Different triggers need different intents, not just different names for the same action. A hamburger button should flip open and closed — that's `toggle`. But a modal's backdrop click or its "X" button should only ever close it, and should never accidentally reopen it if clicked twice. Giving callers `open`, `close`, and `toggle` separately means each trigger calls the action that actually matches what it means to do, instead of every caller re-deriving the same boolean logic by hand.

*Source: [03-Custom-Hooks.md#7-whats-the-advantage-of-usetoggle-returning-both-a-toggle-function-and-separate-openclose-functions](03-Custom-Hooks.md#7-whats-the-advantage-of-usetoggle-returning-both-a-toggle-function-and-separate-openclose-functions)*

### 8. Why does `useFetch` use `useReducer` instead of three separate `useState` calls for `data`, `loading`, and `error`?

**Answer:** Because those three fields aren't really independent — they always change together, as one set. On start: `loading=true, error=null`. On success: `loading=false, data=...`. With three separate `useState` setters, it's easy to accidentally leave them in a combination that shouldn't exist, like `loading=true` while `data` is already populated. A single reducer action updates all three together, atomically, so that invalid combination simply can't happen.

*Source: [03-Custom-Hooks.md#8-why-does-usefetch-use-usereducer-instead-of-three-separate-usestate-calls-for-data-loading-and-error](03-Custom-Hooks.md#8-why-does-usefetch-use-usereducer-instead-of-three-separate-usestate-calls-for-data-loading-and-error)*

### 9. Can you call a custom hook conditionally if you're careful about it?

**Answer:** No, and it doesn't matter how careful you are — this is a hard rule regardless of what's inside the hook. React matches hook calls between renders purely by call order, because hooks are stored as a linked list per component. Skip a call in some renders but not others, and you shift every hook's position after it, corrupting state for all of them.

*Source: [03-Custom-Hooks.md#9-can-you-call-a-custom-hook-conditionally-if-youre-careful-about-it](03-Custom-Hooks.md#9-can-you-call-a-custom-hook-conditionally-if-youre-careful-about-it)*

### 10. Give a concrete example of when you'd reach for a custom hook instead of just inlining the logic in the component.

**Answer:** Reach for a custom hook whenever the same stateful behavior is needed in more than one place. Say three different pages each need a "has the user scrolled past 200px" boolean to trigger a sticky header. Pulling that into `useScrollPosition()` means you write the `useState`/`useEffect`/event-listener block once instead of three times — and the cleanup logic only has to be correct in exactly one place.

*Source: [03-Custom-Hooks.md#10-give-a-concrete-example-of-when-youd-reach-for-a-custom-hook-instead-of-just-inlining-the-logic-in-the-component](03-Custom-Hooks.md#10-give-a-concrete-example-of-when-youd-reach-for-a-custom-hook-instead-of-just-inlining-the-logic-in-the-component)*

## [4. Performance Optimization](04-Performance-Optimization.md)

### 1. Why doesn't `React.memo` help when a prop is an inline object literal?

**Answer:** By default, `React.memo` checks non-primitive props by reference, not by contents. An object literal like `{ name: 'Alex' }` gets a brand-new reference on every single parent render, even when nothing inside it actually changed. So the comparison always says "different," even though it isn't. Fix it one of two ways: write a custom comparison function that checks just the fields that matter, or stabilize the reference in the parent with `useMemo`.

*Source: [04-Performance-Optimization.md#1-why-doesnt-reactmemo-help-when-a-prop-is-an-inline-object-literal](04-Performance-Optimization.md#1-why-doesnt-reactmemo-help-when-a-prop-is-an-inline-object-literal)*

### 2. When would you write a custom comparison function instead of using `useMemo` in the parent?

**Answer:** Reach for a custom comparator when the object's reference is simply out of your control — fresh data from an API response, or something coming from a third-party library — so there's no way to memoize it upstream. It shifts the decision to the child component itself: "these specific fields matter, like `user.id` and `user.updatedAt`, ignore the rest." That's more reliable than hoping every single caller remembers to memoize correctly.

*Source: [04-Performance-Optimization.md#2-when-would-you-write-a-custom-comparison-function-instead-of-using-usememo-in-the-parent](04-Performance-Optimization.md#2-when-would-you-write-a-custom-comparison-function-instead-of-using-usememo-in-the-parent)*

### 3. How does `React.lazy` combined with `Suspense` actually defer downloading code?

**Answer:** `React.lazy` wraps a dynamic `import()` call, and that call returns a promise instead of resolving right away. The module only actually gets requested over the network the first time React tries to render that component — not before. While that promise is pending, React "suspends" that part of the tree and shows the nearest `Suspense` fallback instead. Net effect: a route or bundle the user never visits never gets downloaded at all.

*Source: [04-Performance-Optimization.md#3-how-does-reactlazy-combined-with-suspense-actually-defer-downloading-code](04-Performance-Optimization.md#3-how-does-reactlazy-combined-with-suspense-actually-defer-downloading-code)*

### 4. Why is splitting an admin-only route into its own bundle valuable even if only 5% of users are admins?

**Answer:** Because that split moves the admin code out of the main chunk entirely — so the other 95% of users get a smaller initial bundle, by exactly however much that admin code weighed, which directly speeds up their time-to-interactive. Without the split, every single visitor downloads and parses code they'll never run, purely because it happened to get bundled next to code they actually need.

*Source: [04-Performance-Optimization.md#4-why-is-splitting-an-admin-only-route-into-its-own-bundle-valuable-even-if-only-5-of-users-are-admins](04-Performance-Optimization.md#4-why-is-splitting-an-admin-only-route-into-its-own-bundle-valuable-even-if-only-5-of-users-are-admins)*

### 5. Why does rendering 10,000 list items without virtualization hurt performance even if the data itself is small?

**Answer:** The cost was never the JavaScript data — it's the DOM. The browser has to create, lay out, and paint 10,000 real DOM nodes, and every reconciliation pass after that has 10,000 nodes to diff instead of a handful. Scroll and resize handlers get slower too, since layout recalculation scales with node count. The page feels laggy long before memory is ever the actual bottleneck.

*Source: [04-Performance-Optimization.md#5-why-does-rendering-10000-list-items-without-virtualization-hurt-performance-even-if-the-data-itself-is-small](04-Performance-Optimization.md#5-why-does-rendering-10000-list-items-without-virtualization-hurt-performance-even-if-the-data-itself-is-small)*

### 6. How does windowing keep the scrollbar accurate if most rows aren't actually in the DOM?

**Answer:** The trick is a bit of an illusion: the container itself is sized to the *full* logical height — row count times row height — even though only the rows currently visible, plus a small overscan buffer, are actually mounted inside it. The scrollbar reads off that container's real height, so it behaves exactly as if all 10,000 rows were sitting there. Behind the scenes, the library just swaps which rows are mounted in and out as `scrollTop` changes.

*Source: [04-Performance-Optimization.md#6-how-does-windowing-keep-the-scrollbar-accurate-if-most-rows-arent-actually-in-the-dom](04-Performance-Optimization.md#6-how-does-windowing-keep-the-scrollbar-accurate-if-most-rows-arent-actually-in-the-dom)*

### 7. How do you find out what's actually bloating a production bundle, and what do you do next?

**Answer:** Start by running a bundle analyzer — `webpack-bundle-analyzer` or `rollup-plugin-visualizer` — against the production build. That gives you a treemap showing exactly how much each module contributes to the total size. From there, look for the usual suspects: accidentally importing an entire library for one function (pulling in all of `lodash` for one helper), or a monolithic, non-tree-shakable dependency like `moment` that could be swapped for a modular alternative like `date-fns`. Then re-run the analyzer to confirm the size actually dropped.

*Source: [04-Performance-Optimization.md#7-how-do-you-find-out-whats-actually-bloating-a-production-bundle-and-what-do-you-do-next](04-Performance-Optimization.md#7-how-do-you-find-out-whats-actually-bloating-a-production-bundle-and-what-do-you-do-next)*

### 8. Why is `moment.js` hard to tree-shake, and how does `date-fns` avoid the same problem?

**Answer:** `moment` ships as one giant object with every method already attached, plus all locale data bundled in by default — so a bundler has no way to statically prove which parts are unused, and can't safely drop anything. `date-fns` takes the opposite approach: each function is its own independent named export. Import just `format`, and the bundler can confidently exclude every other function from the final bundle.

*Source: [04-Performance-Optimization.md#8-why-is-momentjs-hard-to-tree-shake-and-how-does-date-fns-avoid-the-same-problem](04-Performance-Optimization.md#8-why-is-momentjs-hard-to-tree-shake-and-how-does-date-fns-avoid-the-same-problem)*

### 9. What's the difference between `loading="lazy"` and an `IntersectionObserver`-based lazy image component?

**Answer:** `loading="lazy"` is the zero-effort option — a native browser attribute that defers the image request until it's near the viewport, no JavaScript needed. The catch is it only works on plain `<img>` elements, and gives you no hook for placeholders or custom trigger distances. An `IntersectionObserver`-based component costs you more code to write and maintain, but in exchange gives you control over the trigger margin, a placeholder while the real image loads, and it even works for CSS background images.

*Source: [04-Performance-Optimization.md#9-whats-the-difference-between-loadinglazy-and-an-intersectionobserver-based-lazy-image-component](04-Performance-Optimization.md#9-whats-the-difference-between-loadinglazy-and-an-intersectionobserver-based-lazy-image-component)*

### 10. A component re-renders on every keystroke in a search box even though it's wrapped in `React.memo`. What's the most likely cause?

**Answer:** Nine times out of ten, it's a prop that's a brand-new object, array, or function reference on every parent render — something like an inline `onSelect={() => ...}` handler. That fails `React.memo`'s shallow comparison every single time, memo or no memo. Fix it by stabilizing that reference with `useCallback` or `useMemo` in the parent (see the Hooks Deep Dive guide), or by writing a custom comparator that ignores whatever part of the prop doesn't actually affect the output.

*Source: [04-Performance-Optimization.md#10-a-component-re-renders-on-every-keystroke-in-a-search-box-even-though-its-wrapped-in-reactmemo-whats-the-most-likely-cause](04-Performance-Optimization.md#10-a-component-re-renders-on-every-keystroke-in-a-search-box-even-though-its-wrapped-in-reactmemo-whats-the-most-likely-cause)*

## [5. Advanced Component Patterns in React](05-Advanced-Component-Patterns.md)

### 1. When would you deliberately choose an uncontrolled input over a controlled one?

**Answer:** Go uncontrolled when you genuinely don't need to react to every keystroke. The clearest case is a file input — the browser flat-out refuses to let JavaScript set its value, so it has no choice but to stay uncontrolled, read via a `ref` at submit time. It's also a reasonable call for a very large form, where re-rendering on every keystroke is a measurable performance cost and nothing needs live, per-keystroke validation anyway.

*Source: [05-Advanced-Component-Patterns.md#1-when-would-you-deliberately-choose-an-uncontrolled-input-over-a-controlled-one](05-Advanced-Component-Patterns.md#1-when-would-you-deliberately-choose-an-uncontrolled-input-over-a-controlled-one)*

### 2. What specifically breaks when you stack multiple HOCs, beyond "it's messy"?

**Answer:** Two concrete things break, beyond it just looking messy. First, the component tree grows an extra wrapper level per HOC — `withAuth(withTheme(withData(Profile)))` shows up as three extra components in DevTools, with nothing to show for it visually. Second, if two HOCs both inject a prop with the same name — say `data` or `position` — they silently overwrite each other, with no compile-time error at all. That's because the injected props just get merged with `{...props}`, and plain JavaScript object spread always takes the last value written.

*Source: [05-Advanced-Component-Patterns.md#2-what-specifically-breaks-when-you-stack-multiple-hocs-beyond-its-messy](05-Advanced-Component-Patterns.md#2-what-specifically-breaks-when-you-stack-multiple-hocs-beyond-its-messy)*

### 3. Why don't custom hooks have the wrapper-hell or prop-collision problems that HOCs do?

**Answer:** Because a hook runs *inside* the consuming component's own function call, instead of wrapping it in an extra rendered component — so it adds zero levels to the component tree, no wrapper hell. And since each hook's return value gets assigned to a local variable the caller names explicitly — `const mousePosition = useMouseTracker()` — there's no shared props object where two unrelated pieces of logic could collide in the first place.

*Source: [05-Advanced-Component-Patterns.md#3-why-dont-custom-hooks-have-the-wrapper-hell-or-prop-collision-problems-that-hocs-do](05-Advanced-Component-Patterns.md#3-why-dont-custom-hooks-have-the-wrapper-hell-or-prop-collision-problems-that-hocs-do)*

### 4. Why must Error Boundaries be class components?

**Answer:** Because the two lifecycle methods that actually catch rendering errors — `static getDerivedStateFromError` for computing fallback state, and `componentDidCatch` for logging the error as a side effect — only exist on the class component API. There is no hook equivalent for either one, full stop. That's exactly why a library like `react-error-boundary` still has a class component under the hood, even while it hands you a hook-friendly wrapper on the outside.

*Source: [05-Advanced-Component-Patterns.md#4-why-must-error-boundaries-be-class-components](05-Advanced-Component-Patterns.md#4-why-must-error-boundaries-be-class-components)*

### 5. What kinds of errors will an Error Boundary NOT catch?

**Answer:** An Error Boundary only wraps the synchronous render and lifecycle call stack — so anything async is invisible to it. That includes a `fetch` that rejects inside an `onClick`, an error thrown inside a `setTimeout` callback, and anything that happens during server-side rendering. All of those still need an ordinary `try/catch` wrapped around the async code itself.

*Source: [05-Advanced-Component-Patterns.md#5-what-kinds-of-errors-will-an-error-boundary-not-catch](05-Advanced-Component-Patterns.md#5-what-kinds-of-errors-will-an-error-boundary-not-catch)*

### 6. Why wrap each dashboard widget in its own Error Boundary instead of one boundary around the whole page?

**Answer:** Blast radius, basically. One boundary around the whole dashboard means any single widget's bug takes down every other widget on the page — the boundary swaps its *entire* child tree for the fallback UI the moment anything inside it throws. Wrap each widget in its own boundary instead, and a crash in, say, the stock ticker only blanks that one grid cell. The revenue chart and activity feed right next to it keep rendering just fine.

*Source: [05-Advanced-Component-Patterns.md#6-why-wrap-each-dashboard-widget-in-its-own-error-boundary-instead-of-one-boundary-around-the-whole-page](05-Advanced-Component-Patterns.md#6-why-wrap-each-dashboard-widget-in-its-own-error-boundary-instead-of-one-boundary-around-the-whole-page)*

### 7. Why does a Portal-rendered modal still receive context from its logical parent, even though it's mounted under `<body>`?

**Answer:** Because a portal only changes *where React paints the DOM nodes* — it never actually moves the component out of its place in the React component tree, and that tree position is exactly what Context and event bubbling are both based on. So a `<Modal>` rendered from inside `<ProductCard>` still sees any context provider wrapping `ProductCard` in JSX, and a click inside the modal still bubbles up through `ProductCard`'s handlers — exactly as if `createPortal` had never been used at all.

*Source: [05-Advanced-Component-Patterns.md#7-why-does-a-portal-rendered-modal-still-receive-context-from-its-logical-parent-even-though-its-mounted-under-body](05-Advanced-Component-Patterns.md#7-why-does-a-portal-rendered-modal-still-receive-context-from-its-logical-parent-even-though-its-mounted-under-body)*

### 8. Why does a pile of independent booleans (`isLoading`, `isSuccess`, `hasError`) cause real bugs, and how does a state machine fix it?

**Answer:** With separate booleans, nothing actually stops `isLoading` and `isSuccess` from both being `true` at the same time — one missed `setState` call during a refactor and you're there, and now the JSX has to defensively guard against a combination that should be impossible. A state machine fixes this by collapsing everything into one `status` field that can only ever hold a single value. The reducer's `switch` statement becomes the one place that defines which transitions are even legal, so an impossible combination simply has nowhere to exist.

*Source: [05-Advanced-Component-Patterns.md#8-why-does-a-pile-of-independent-booleans-isloading-issuccess-haserror-cause-real-bugs-and-how-does-a-state-machine-fix-it](05-Advanced-Component-Patterns.md#8-why-does-a-pile-of-independent-booleans-isloading-issuccess-haserror-cause-real-bugs-and-how-does-a-state-machine-fix-it)*

### 9. In the Tabs compound component example, what does Context actually save you from doing?

**Answer:** It saves you from wiring things by hand at every level. Without Context, `Tabs` would have to pass `activeValue` and `setActiveValue` down as explicit props through every intermediate component, and whoever's composing `<Tabs><TabList><Tab/></TabList></Tabs>` would need to manually wire up an `activeIndex`/`onChange` pair themselves. With Context, `Tab` and `TabPanel` just read and update that shared state directly, no matter how deeply they're nested inside `<Tabs>` — and the caller's JSX stays plain, clean markup.

*Source: [05-Advanced-Component-Patterns.md#9-in-the-tabs-compound-component-example-what-does-context-actually-save-you-from-doing](05-Advanced-Component-Patterns.md#9-in-the-tabs-compound-component-example-what-does-context-actually-save-you-from-doing)*

### 10. Give a concrete case where a controlled component's re-render cost actually matters.

**Answer:** Picture a form with fifty text fields, all controlled, all re-rendering the *entire* form component on every keystroke. If the form's render function is also doing real work each time — re-computing validation across all fifty fields, say — that lag becomes visible on a slower device. Two legitimate fixes: split each field into its own controlled sub-component, so a keystroke only re-renders that one field, or fall back to an uncontrolled `ref`-based approach for fields that don't actually need live validation.

*Source: [05-Advanced-Component-Patterns.md#10-give-a-concrete-case-where-a-controlled-components-re-render-cost-actually-matters](05-Advanced-Component-Patterns.md#10-give-a-concrete-case-where-a-controlled-components-re-render-cost-actually-matters)*

## [6. TypeScript with React](06-TypeScript-with-React.md)

### 1. Why type `children` as `React.ReactNode` instead of `JSX.Element`?

**Answer:** Because `JSX.Element` is too narrow — it only covers a single rendered element, and rejects strings, numbers, arrays, fragments, and `null`, even though every one of those is a perfectly valid React child. `React.ReactNode` is the actual union that matches everything `children` is legally allowed to be. Type it that way, and something like `<Card>Just text</Card>` type-checks correctly instead of erroring on plain text.

*Source: [06-TypeScript-with-React.md#1-why-type-children-as-reactreactnode-instead-of-jsxelement](06-TypeScript-with-React.md#1-why-type-children-as-reactreactnode-instead-of-jsxelement)*

### 2. How do you make a prop required only for specific variants of a component?

**Answer:** Model the props as a discriminated union, keyed on a `variant` (or `kind`) field, where each member interface adds only the fields it needs — an `ErrorAlertProps` variant that requires `onRetry`, versus an `InfoAlertProps` that doesn't. TypeScript then narrows the union for you inside a `switch (props.variant)`, so `props.onRetry` is only even accessible in the branch where it's guaranteed to exist. Forget to pass it on an `error` alert, and it fails right at compile time.

*Source: [06-TypeScript-with-React.md#2-how-do-you-make-a-prop-required-only-for-specific-variants-of-a-component](06-TypeScript-with-React.md#2-how-do-you-make-a-prop-required-only-for-specific-variants-of-a-component)*

### 3. Why does `useContext` typically return `T | undefined`, and how do you avoid null checks everywhere?

**Answer:** Because before a provider mounts, the context genuinely has no real value yet — and `undefined` is the honest way to represent that. Faking a default, like casting `{}` as `T`, just hides the bug instead of fixing it. The clean fix is a custom hook — `useAuth`, `useTheme` — that calls `useContext` once, throws if it gets `undefined`, and returns the narrowed, guaranteed non-null type. Every other component in the tree calls that safe hook instead of touching the raw context directly, so the null check only ever has to happen in one place.

*Source: [06-TypeScript-with-React.md#3-why-does-usecontext-typically-return-t-undefined-and-how-do-you-avoid-null-checks-everywhere](06-TypeScript-with-React.md#3-why-does-usecontext-typically-return-t-undefined-and-how-do-you-avoid-null-checks-everywhere)*

### 4. How do you type an event handler for a text input's `onChange`?

**Answer:** `(event: React.ChangeEvent<HTMLInputElement>) => void`. That generic parameter is what tells TypeScript which exact DOM element `event.target` refers to — so `event.target.value` and `event.target.checked` come back properly typed, instead of falling back to `any` on an untyped event.

*Source: [06-TypeScript-with-React.md#4-how-do-you-type-an-event-handler-for-a-text-inputs-onchange](06-TypeScript-with-React.md#4-how-do-you-type-an-event-handler-for-a-text-inputs-onchange)*

### 5. Why can't you pass a `ref` prop to a plain function component, and how does `forwardRef` fix it?

**Answer:** Because React treats `ref` as a special, reserved prop that bypasses the normal props object entirely — a plain function component just never receives it as a second argument the way a class component's underlying DOM node effectively does. `React.forwardRef<HTMLInputElement, FormInputProps>((props, ref) => ...)` is the explicit opt-in: it lets the component actually receive that ref and forward it down to the real `<input>`. That's exactly what lets a parent call `inputRef.current?.focus()` on what is otherwise just a custom wrapper component.

*Source: [06-TypeScript-with-React.md#5-why-cant-you-pass-a-ref-prop-to-a-plain-function-component-and-how-does-forwardref-fix-it](06-TypeScript-with-React.md#5-why-cant-you-pass-a-ref-prop-to-a-plain-function-component-and-how-does-forwardref-fix-it)*

### 6. What's the point of `React.memo`'s second argument, and does it work without `useCallback`?

**Answer:** That second argument is a custom equality function you provide, which decides whether to skip a re-render — without it, `memo` just falls back to a shallow prop comparison. But here's the catch: it only helps if the props being compared are actually stable between renders. If a parent hands down a new inline callback every render, `memo` sees a new function reference every time and re-renders anyway, custom comparator or not. That's exactly why memoized child components are almost always paired with `useCallback` on whatever handlers get passed down to them.

*Source: [06-TypeScript-with-React.md#6-whats-the-point-of-reactmemos-second-argument-and-does-it-work-without-usecallback](06-TypeScript-with-React.md#6-whats-the-point-of-reactmemos-second-argument-and-does-it-work-without-usecallback)*

### 7. How do you type a Redux Toolkit slice so `action.payload` isn't `any`?

**Answer:** Type each reducer's action parameter as `PayloadAction<T>` from `@reduxjs/toolkit`, where `T` describes the shape of that specific action's payload — `PayloadAction<{ sku: string }>` for a "remove item" action, say. Redux Toolkit automatically generates a matching typed action creator from that, so calling `itemRemoved({ sku: 'x' })` gets checked against that exact same `T` right at the call site.

*Source: [06-TypeScript-with-React.md#7-how-do-you-type-a-redux-toolkit-slice-so-actionpayload-isnt-any](06-TypeScript-with-React.md#7-how-do-you-type-a-redux-toolkit-slice-so-actionpayload-isnt-any)*

### 8. Why derive `RootState` and `AppDispatch` from the store instead of writing them by hand?

**Answer:** Because deriving them — `type RootState = ReturnType<typeof store.getState>` and `type AppDispatch = typeof store.dispatch` — keeps them automatically in sync with whatever reducers are actually registered in `configureStore`. A hand-written `interface RootState`, by contrast, silently drifts out of date the moment someone adds or renames a slice — and every `useSelector` call using that stale type would just compile happily, mismatch and all.

*Source: [06-TypeScript-with-React.md#8-why-derive-rootstate-and-appdispatch-from-the-store-instead-of-writing-them-by-hand](06-TypeScript-with-React.md#8-why-derive-rootstate-and-appdispatch-from-the-store-instead-of-writing-them-by-hand)*

### 9. How do you write one `Table` component that works for both `Invoice` rows and `User` rows without losing type safety?

**Answer:** Make the component itself generic — `function Table<T>({ rows, columns, getRowKey }: TableProps<T>)` — with `Column<T>['render']` typed as `(row: T) => React.ReactNode`. TypeScript then infers `T` straight from the `rows` array you pass in, so a column definition referencing a field that doesn't exist on that particular `T` simply fails to compile. That's the whole payoff versus a loosely typed table that just accepts `rows: any[]` and gives up on safety entirely.

*Source: [06-TypeScript-with-React.md#9-how-do-you-write-one-table-component-that-works-for-both-invoice-rows-and-user-rows-without-losing-type-safety](06-TypeScript-with-React.md#9-how-do-you-write-one-table-component-that-works-for-both-invoice-rows-and-user-rows-without-losing-type-safety)*

### 10. What's the generic constraint doing in `function withAuthGuard<P extends object>(Component: React.ComponentType<P>)`?

**Answer:** `P extends object` lets the HOC accept a component with literally any props shape, while still being able to safely spread `{...props}` onto it. Without that constraint, `P` could theoretically be inferred as a primitive type, and spreading a primitive just doesn't make sense. The other payoff: the wrapped component it returns (`AuthGuarded`) keeps the original component's exact prop types, so callers still get full autocomplete and type-checking on `ProtectedDashboard`'s props, nothing lost.

*Source: [06-TypeScript-with-React.md#10-whats-the-generic-constraint-doing-in-function-withauthguardp-extends-objectcomponent-reactcomponenttypep](06-TypeScript-with-React.md#10-whats-the-generic-constraint-doing-in-function-withauthguardp-extends-objectcomponent-reactcomponenttypep)*

## [7. Testing React with Jest and React Testing Library](07-Testing-React-Jest-RTL.md)

### 1. What does "test behavior, not implementation" mean in practice?

**Answer:** Test what the user sees and can do, not how the code is written inside. Assert on rendered text, roles, form values, callback invocations — never internal state, private methods, or component structure. Here's why that matters: a behavior-focused test keeps passing through a refactor that preserves the feature, while an implementation-focused test breaks on refactors that changed nothing a user could ever observe.

*Source: [07-Testing-React-Jest-RTL.md#1-what-does-test-behavior-not-implementation-mean-in-practice](07-Testing-React-Jest-RTL.md#1-what-does-test-behavior-not-implementation-mean-in-practice)*

### 2. What is React Testing Library's query priority, and why does it matter?

**Answer:** Think of it as a priority ladder, from most realistic to least. At the top: `getByRole`, `getByLabelText`, `getByPlaceholderText`/`getByText` — these mirror exactly how a real user or a screen reader would find an element. Next: `getByAltText`/`getByTitle`, for semantic markup. Last resort only: `getByTestId`. Following that order has a nice side effect — it nudges the component toward accessible markup just by the act of writing the test, and it keeps the test decoupled from CSS classes or DOM structure that might change.

*Source: [07-Testing-React-Jest-RTL.md#2-what-is-react-testing-librarys-query-priority-and-why-does-it-matter](07-Testing-React-Jest-RTL.md#2-what-is-react-testing-librarys-query-priority-and-why-does-it-matter)*

### 3. What's the difference between `getBy`, `queryBy`, and `findBy`?

**Answer:** Three tools, three jobs. `getBy*` throws immediately if the element isn't there — use it when you expect the element to already be present. `queryBy*` returns `null` instead of throwing — use it when you're asserting something is *absent*. `findBy*` returns a promise and keeps retrying until the element shows up or a timeout hits — use it for anything that appears asynchronously.

*Source: [07-Testing-React-Jest-RTL.md#3-whats-the-difference-between-getby-queryby-and-findby](07-Testing-React-Jest-RTL.md#3-whats-the-difference-between-getby-queryby-and-findby)*

### 4. Why prefer `userEvent` over `fireEvent`?

**Answer:** `fireEvent` only dispatches one raw DOM event, and that can skip over behavior a real interaction would naturally trigger — focus, blur, the full keydown/input/change sequence. `userEvent` simulates the *complete* sequence a real browser produces for a real user action, so it catches bugs that only surface when events fire in a realistic order.

*Source: [07-Testing-React-Jest-RTL.md#4-why-prefer-userevent-over-fireevent](07-Testing-React-Jest-RTL.md#4-why-prefer-userevent-over-fireevent)*

### 5. How do you test a component that makes an API call?

**Answer:** Mock at the network boundary, never the component itself. That means either `global.fetch`/the service module via `jest.mock`, or intercepting requests with MSW. Then: render the component, assert the loading state shows up first, use `findBy*` to wait for the resolved UI to appear, and optionally check the mock was actually called with the right arguments.

*Source: [07-Testing-React-Jest-RTL.md#5-how-do-you-test-a-component-that-makes-an-api-call](07-Testing-React-Jest-RTL.md#5-how-do-you-test-a-component-that-makes-an-api-call)*

### 6. How do you test a component that reads and writes `localStorage`?

**Answer:** No mock needed at all — `localStorage` is a real, synchronous API right there in jsdom. Clear it in `beforeEach` so tests stay isolated from each other. To test the read path, seed it before rendering. To test the write path, do the interaction and then check `localStorage.getItem` for what actually got written.

*Source: [07-Testing-React-Jest-RTL.md#6-how-do-you-test-a-component-that-reads-and-writes-localstorage](07-Testing-React-Jest-RTL.md#6-how-do-you-test-a-component-that-reads-and-writes-localstorage)*

### 7. How do you test a custom hook in isolation?

**Answer:** Use `renderHook` from `@testing-library/react` — it mounts the hook without needing a full component around it, and you read its return value off `result.current`. One thing to watch for: if you trigger a state update outside of a normal event handler, wrap that call in `act` so React flushes the update before your next assertion runs.

*Source: [07-Testing-React-Jest-RTL.md#7-how-do-you-test-a-custom-hook-in-isolation](07-Testing-React-Jest-RTL.md#7-how-do-you-test-a-custom-hook-in-isolation)*

### 8. Is 100% test coverage a meaningful goal?

**Answer:** No. Coverage percentages only tell you which lines *ran* — they say nothing about whether the assertions are actually strong, or whether the edge cases are handled correctly. A better target: high coverage on the critical paths, branches, and error states specifically. 80-90% is usually a healthy number, but the number itself is never the actual goal.

*Source: [07-Testing-React-Jest-RTL.md#8-is-100-test-coverage-a-meaningful-goal](07-Testing-React-Jest-RTL.md#8-is-100-test-coverage-a-meaningful-goal)*

### 9. What's the difference between a unit, integration, and end-to-end test for a React app?

**Answer:** Think of it as three widening circles. A unit test isolates one function or component, with its dependencies stubbed out. An integration test brings several units together — a form, its validation, and its submit handler, all working as one. An end-to-end test drives a real or simulated browser through an entire user journey across multiple pages. The testing pyramid reflects that: lots of fast unit tests at the base, a moderate number of integration tests in the middle, and just a few, high-value end-to-end tests at the top.

*Source: [07-Testing-React-Jest-RTL.md#9-whats-the-difference-between-a-unit-integration-and-end-to-end-test-for-a-react-app](07-Testing-React-Jest-RTL.md#9-whats-the-difference-between-a-unit-integration-and-end-to-end-test-for-a-react-app)*

### 10. When should you reach for a `data-testid`?

**Answer:** Treat it as the last resort, only when no accessible or semantic query can identify the element at all — a purely decorative wrapper `div` with no role, label, or text, for example. If `data-testid` is your default go-to, that's actually a warning sign: the test isn't validating anything about accessibility or real user-facing behavior, and it's also the most fragile query of the bunch whenever the markup changes.

*Source: [07-Testing-React-Jest-RTL.md#10-when-should-you-reach-for-a-data-testid](07-Testing-React-Jest-RTL.md#10-when-should-you-reach-for-a-data-testid)*

## [8. State Management: Context, Redux, and Zustand](08-State-Management-Context-Redux-Zustand.md)

### 1. When would you reach for Context instead of Redux?

**Answer:** Rule of thumb: Context is for stuff that's read everywhere but rarely changes — theme, locale, the currently logged-in user. For that kind of value, pulling in an external state library is overkill when you don't actually need selector-based re-render control or DevTools.

*Source: [08-State-Management-Context-Redux-Zustand.md#1-when-would-you-reach-for-context-instead-of-redux](08-State-Management-Context-Redux-Zustand.md#1-when-would-you-reach-for-context-instead-of-redux)*

### 2. Why does Context cause unnecessary re-renders, and how do you fix it?

**Answer:** Because Context has no concept of subscribing to just one field — every consumer re-renders whenever the provider passes a *new* value, full stop, regardless of which fields that consumer actually reads. Memoizing the value with `useMemo` fixes one slice of the problem — renders caused by the provider itself re-rendering unnecessarily. But the real fix, for an unrelated field's change not re-rendering a consumer, is splitting one big context into several independent smaller ones.

*Source: [08-State-Management-Context-Redux-Zustand.md#2-why-does-context-cause-unnecessary-re-renders-and-how-do-you-fix-it](08-State-Management-Context-Redux-Zustand.md#2-why-does-context-cause-unnecessary-re-renders-and-how-do-you-fix-it)*

### 3. Walk through the Redux data flow.

**Answer:** Four steps, one direction, always. A component dispatches a plain action object describing what happened. The store hands the current state and that action to a pure reducer, which returns a brand-new state without mutating the old one. Subscribed components read that new state back through selectors, and re-render only if the slice they selected actually changed.

*Source: [08-State-Management-Context-Redux-Zustand.md#3-walk-through-the-redux-data-flow](08-State-Management-Context-Redux-Zustand.md#3-walk-through-the-redux-data-flow)*

### 4. What does Redux Toolkit change about writing Redux?

**Answer:** It cuts out most of the boilerplate that made hand-written Redux painful. `createSlice` generates action creators and a reducer together in one step, and it uses Immer under the hood — so reducers can write code that *looks* like a direct mutation, while the store still gets a proper immutable update behind the scenes. `configureStore` sets up DevTools and sensible default middleware automatically, including checks that catch accidental mutation.

*Source: [08-State-Management-Context-Redux-Zustand.md#4-what-does-redux-toolkit-change-about-writing-redux](08-State-Management-Context-Redux-Zustand.md#4-what-does-redux-toolkit-change-about-writing-redux)*

### 5. How do you handle asynchronous logic in Redux?

**Answer:** Reducers have to stay pure and synchronous, always, so anything async gets pushed out to middleware instead. A thunk is a function you dispatch in place of a plain action object — it receives `dispatch`, runs whatever async code it needs to, and dispatches plain actions along the way as things progress. `createAsyncThunk` automates that whole pending/fulfilled/rejected dance around a promise, so you don't write it by hand every time.

*Source: [08-State-Management-Context-Redux-Zustand.md#5-how-do-you-handle-asynchronous-logic-in-redux](08-State-Management-Context-Redux-Zustand.md#5-how-do-you-handle-asynchronous-logic-in-redux)*

### 6. What is a selector and why does memoization matter?

**Answer:** A selector is just a function that reads a piece of state — one reusable place to grab a value from, instead of reaching into the store shape everywhere. Memoization matters because a memoized selector, via `createSelector`, caches its result and only recomputes when its actual inputs change by reference. Without that, a selector that derives a new array or object on every call would make components re-render every time, even when nothing meaningful actually changed.

*Source: [08-State-Management-Context-Redux-Zustand.md#6-what-is-a-selector-and-why-does-memoization-matter](08-State-Management-Context-Redux-Zustand.md#6-what-is-a-selector-and-why-does-memoization-matter)*

### 7. How does Zustand differ from Redux?

**Answer:** Zustand drops the whole action/reducer/dispatch ceremony entirely — a store there is just a function that returns state plus some updater functions, and it doesn't even need a provider component wrapping your app. It still gives you per-field subscriptions through selector functions, so you get Redux-like control over re-renders, just with a much smaller API and bundle size. The trade-off: you give up Redux's mature middleware ecosystem and its built-in DevTools.

*Source: [08-State-Management-Context-Redux-Zustand.md#7-how-does-zustand-differ-from-redux](08-State-Management-Context-Redux-Zustand.md#7-how-does-zustand-differ-from-redux)*

### 8. Redux vs. Zustand — how would you decide for a real project?

**Answer:** Neither one is objectively better — it comes down to team size and complexity. Redux fits a large codebase with many contributors, complicated derived state, and a real need for time-travel debugging. Zustand fits a smaller team or app that wants shared state without all the boilerplate. Worth knowing: both give comparable re-render performance once you're using selectors properly, so performance alone isn't the deciding factor.

*Source: [08-State-Management-Context-Redux-Zustand.md#8-redux-vs-zustand-how-would-you-decide-for-a-real-project](08-State-Management-Context-Redux-Zustand.md#8-redux-vs-zustand-how-would-you-decide-for-a-real-project)*

### 9. Is prop drilling always a reason to add Context?

**Answer:** No. Passing props explicitly through two or three levels is often actually more readable and easier to trace than hiding a dependency behind a `useContext` call. Context only earns its cost when the same value is genuinely needed by many unrelated subtrees — not just because a prop happens to pass through one intermediate component.

*Source: [08-State-Management-Context-Redux-Zustand.md#9-is-prop-drilling-always-a-reason-to-add-context](08-State-Management-Context-Redux-Zustand.md#9-is-prop-drilling-always-a-reason-to-add-context)*

### 10. When would you choose Redux Saga over a thunk?

**Answer:** A thunk is plenty for a straightforward async flow, like one fetch followed by a dispatch. Saga earns its steeper learning curve only when you need something thunks get awkward at — cancellation, retries, debouncing, or coordinating several concurrent async streams together. That's what its generator-based effects are actually built for.

*Source: [08-State-Management-Context-Redux-Zustand.md#10-when-would-you-choose-redux-saga-over-a-thunk](08-State-Management-Context-Redux-Zustand.md#10-when-would-you-choose-redux-saga-over-a-thunk)*

## [9. DOM, Refs and Event Handling](09-DOM-Refs-and-Event-Handling.md)

### 1. What's the fundamental difference between `useRef` and `useState`?

**Answer:** Both hold onto a value across re-renders, but here's the key difference: updating state triggers a re-render, updating a ref's `.current` does not. So the rule of thumb is — if it should show up on screen, it's state; if it's DOM access or mutable bookkeeping the render output doesn't actually depend on, it's a ref.

*Source: [09-DOM-Refs-and-Event-Handling.md#1-whats-the-fundamental-difference-between-useref-and-usestate](09-DOM-Refs-and-Event-Handling.md#1-whats-the-fundamental-difference-between-useref-and-usestate)*

### 2. Give three concrete use cases for `useRef` beyond just holding a DOM node.

**Answer:** Three good examples beyond just grabbing a DOM node: storing an interval or timeout ID so you can clear it later; storing the previous value of a prop so you can compare it against the current one; and storing a boolean flag like "has this effect already run," to guard against duplicate initialization — which comes up a lot with `StrictMode`'s double-invoke behavior in development.

*Source: [09-DOM-Refs-and-Event-Handling.md#2-give-three-concrete-use-cases-for-useref-beyond-just-holding-a-dom-node](09-DOM-Refs-and-Event-Handling.md#2-give-three-concrete-use-cases-for-useref-beyond-just-holding-a-dom-node)*

### 3. How do you decide between `ref` and `key` when working with lists?

**Answer:** They're not actually competing for the same job — they solve completely unrelated problems. `key` tells React's reconciler which array item is which across renders, so it can correctly reuse, reorder, or discard DOM nodes. It's never something your code reads or dereferences directly. `ref` is the opposite — it's a handle for *you* to reach into a DOM node imperatively. It has nothing to do with list identity at all.

*Source: [09-DOM-Refs-and-Event-Handling.md#3-how-do-you-decide-between-ref-and-key-when-working-with-lists](09-DOM-Refs-and-Event-Handling.md#3-how-do-you-decide-between-ref-and-key-when-working-with-lists)*

### 4. Why is overusing refs considered an anti-pattern in React?

**Answer:** Because it quietly breaks React's whole model. Manually pushing a value into the DOM through a ref — setting `textContent` by hand, say — bypasses React's declarative data flow entirely, which makes the component harder to test and reason about. Worse, the ref-held value and what's actually rendered on screen can silently drift out of sync, with nothing catching it. Rule of thumb: if a value affects what's on screen, it belongs in state, so React can keep the render output and that value consistent for you.

*Source: [09-DOM-Refs-and-Event-Handling.md#4-why-is-overusing-refs-considered-an-anti-pattern-in-react](09-DOM-Refs-and-Event-Handling.md#4-why-is-overusing-refs-considered-an-anti-pattern-in-react)*

### 5. How do you attach a ref to a custom function component?

**Answer:** By default it can't — React intercepts `ref` before it ever reaches a function component as a normal prop. Wrapping the component in `forwardRef` is the fix: it lets the component explicitly forward that ref down to whichever underlying DOM node it wants to expose — or to a custom object built with `useImperativeHandle`, if you want to expose specific methods instead of the raw node.

*Source: [09-DOM-Refs-and-Event-Handling.md#5-how-do-you-attach-a-ref-to-a-custom-function-component](09-DOM-Refs-and-Event-Handling.md#5-how-do-you-attach-a-ref-to-a-custom-function-component)*

### 6. What changed about event pooling between React 16 and React 17?

**Answer:** In React 16, `SyntheticEvent` objects were pooled and reused for performance — which meant their fields got nulled out right after the synchronous handler returned. Try to read `e.target.value` inside a `setTimeout` or an async callback, and you'd get `undefined`, unless you'd already pulled the value out beforehand. React 17 removed that pooling entirely, so synthetic events can now be safely referenced asynchronously with no workaround needed.

*Source: [09-DOM-Refs-and-Event-Handling.md#6-what-changed-about-event-pooling-between-react-16-and-react-17](09-DOM-Refs-and-Event-Handling.md#6-what-changed-about-event-pooling-between-react-16-and-react-17)*

### 7. When would you reach for event delegation instead of a handler per element?

**Answer:** For a large or frequently-changing list, attach one listener to a shared parent and read `e.target` — often via `data-*` attributes — to figure out which child was actually interacted with. That avoids creating and tearing down a separate listener per row. Worth knowing though: React's synthetic event system already delegates at the root internally, so in React specifically, the real value here is understanding the underlying bubbling mechanism itself, which is exactly what vanilla-JS delegation relies on directly.

*Source: [09-DOM-Refs-and-Event-Handling.md#7-when-would-you-reach-for-event-delegation-instead-of-a-handler-per-element](09-DOM-Refs-and-Event-Handling.md#7-when-would-you-reach-for-event-delegation-instead-of-a-handler-per-element)*

### 8. What's the difference between `IntersectionObserver` and `MutationObserver`, and when would you use each?

**Answer:** They watch for two completely different things. `IntersectionObserver` reports when an element crosses a visibility threshold relative to the viewport, or another ancestor — that's what drives lazy-loading images and infinite scroll. `MutationObserver` reports when a DOM subtree's attributes, children, or text actually change. That's mainly useful for catching changes made by code *outside* your control — third-party scripts, non-React libraries — since React already knows about every change it makes to the DOM itself.

*Source: [09-DOM-Refs-and-Event-Handling.md#8-whats-the-difference-between-intersectionobserver-and-mutationobserver-and-when-would-you-use-each](09-DOM-Refs-and-Event-Handling.md#8-whats-the-difference-between-intersectionobserver-and-mutationobserver-and-when-would-you-use-each)*

### 9. Why must event listeners added directly to `window` or `document` be removed in a cleanup function?

**Answer:** Because without that cleanup, the listener just keeps firing forever, even after the component that added it is long gone. `useEffect`'s callback runs on every mount and every dependency change — and if the returned cleanup skips `removeEventListener`, the listener keeps holding its whole closure alive indefinitely, including any DOM or state references it captured. That's a common source of real memory leaks, and of stale callbacks firing against components that no longer even exist.

*Source: [09-DOM-Refs-and-Event-Handling.md#9-why-must-event-listeners-added-directly-to-window-or-document-be-removed-in-a-cleanup-function](09-DOM-Refs-and-Event-Handling.md#9-why-must-event-listeners-added-directly-to-window-or-document-be-removed-in-a-cleanup-function)*

### 10. Why doesn't a ref update cause a child component to re-render, and why is that useful?

**Answer:** Because `useRef` deliberately sits outside React's state and scheduling system entirely — mutating `.current` is just a plain JavaScript object mutation, with zero rendering side effects attached. That's precisely why it's the right tool for things like scroll positions, timer IDs, or a third-party library instance: values a component genuinely needs to track, without paying for a re-render on every single change.

*Source: [09-DOM-Refs-and-Event-Handling.md#10-why-doesnt-a-ref-update-cause-a-child-component-to-re-render-and-why-is-that-useful](09-DOM-Refs-and-Event-Handling.md#10-why-doesnt-a-ref-update-cause-a-child-component-to-re-render-and-why-is-that-useful)*

## [10. Forms and Validation](10-Forms-and-Validation.md)

### 1. Controlled or uncontrolled — which do you default to?

**Answer:** Controlled, for most real forms — it's what enables validation, conditional rendering, and cross-field logic. Uncontrolled is the right call for a few specific cases: file inputs, integrating with non-React widgets, or trivial forms where a re-render on every keystroke is pure overhead with nothing to show for it. Worth mentioning: React Hook Form actually blurs this line — it uses refs internally for performance, while still presenting an API that feels controlled to work with.

*Source: [10-Forms-and-Validation.md#1-controlled-or-uncontrolled-which-do-you-default-to](10-Forms-and-Validation.md#1-controlled-or-uncontrolled-which-do-you-default-to)*

### 2. Why does React Hook Form re-render less than a `useState`-based form?

**Answer:** Because `register` wires a ref and native DOM event listeners directly onto the input, instead of routing every keystroke through React state — so typing doesn't trigger a re-render of the form component at all. Re-renders only happen for fields whose validation state actually changed, or ones explicitly subscribed to via `watch`/`useWatch`. This matters most on large forms, where a `useState`-per-field approach would re-render the entire tree on every single keystroke.

*Source: [10-Forms-and-Validation.md#2-why-does-react-hook-form-re-render-less-than-a-usestate-based-form](10-Forms-and-Validation.md#2-why-does-react-hook-form-re-render-less-than-a-usestate-based-form)*

### 3. What's the difference between validating on change versus on blur?

**Answer:** On-change gives the fastest feedback, but it's trigger-happy — it can flag an email as invalid while the user is still halfway through typing it. On-blur waits until the user actually leaves the field, so it avoids those premature errors while still giving feedback before submit. The common pattern splits the difference: validate on blur first, and only start validating on every change for fields that have already been touched once.

*Source: [10-Forms-and-Validation.md#3-whats-the-difference-between-validating-on-change-versus-on-blur](10-Forms-and-Validation.md#3-whats-the-difference-between-validating-on-change-versus-on-blur)*

### 4. Why track a `touched` state separately from the values and errors?

**Answer:** Without a separate `touched` flag, you're stuck with a bad trade-off: either show errors for every field before the user has touched any of them, or suppress validation entirely until submit and lose real-time feedback. `touched` solves that — it lets you compute an error as usual, but only actually render it once that specific field has been visited. Real-time validation, without a wall of errors greeting the user on page load.

*Source: [10-Forms-and-Validation.md#4-why-track-a-touched-state-separately-from-the-values-and-errors](10-Forms-and-Validation.md#4-why-track-a-touched-state-separately-from-the-values-and-errors)*

### 5. When would you choose Formik over React Hook Form today?

**Answer:** Mainly when a codebase already has Formik and Yup deeply embedded — ripping that out isn't usually worth it. On its own merits, Formik is controlled, carries a larger bundle, and re-renders more per keystroke. For a brand-new form, React Hook Form is the default answer today, because of its uncontrolled-by-default performance model and smaller footprint. Formik's worth knowing about as the established alternative, just not the first recommendation.

*Source: [10-Forms-and-Validation.md#5-when-would-you-choose-formik-over-react-hook-form-today](10-Forms-and-Validation.md#5-when-would-you-choose-formik-over-react-hook-form-today)*

### 6. How do you implement async validation, such as checking username availability?

**Answer:** Attach an async `validate` function in React Hook Form, or an async `.test()` on a Yup schema in Formik — it awaits an API call, then returns either true or an error message. If you're validating on every keystroke, debounce that API call so it only fires once the user actually pauses typing. If the check only really matters at submit time, skip live validation entirely: run it inside the submit handler and call `setError` if it fails.

*Source: [10-Forms-and-Validation.md#6-how-do-you-implement-async-validation-such-as-checking-username-availability](10-Forms-and-Validation.md#6-how-do-you-implement-async-validation-such-as-checking-username-availability)*

### 7. How do you handle a dynamically growing list of fields, like multiple addresses?

**Answer:** Use `useFieldArray` in React Hook Form, or Formik's `FieldArray` — it manages an array of registered fields for you and exposes `append`/`remove`/`fields`. The one critical detail to get right: use the library's stable `field.id` as the React key, not the array index. Remove a row in the middle, and every index after it shifts — which can make React misattribute input state to the wrong row entirely, the same key-as-position trap that shows up with any reordered list.

*Source: [10-Forms-and-Validation.md#7-how-do-you-handle-a-dynamically-growing-list-of-fields-like-multiple-addresses](10-Forms-and-Validation.md#7-how-do-you-handle-a-dynamically-growing-list-of-fields-like-multiple-addresses)*

### 8. How do you validate that two fields agree, such as password and confirm-password?

**Answer:** Read the first field's live value with `watch` — or `useWatch` if you want a narrower re-render — and check it inside the second field's `validate` function, returning true if they match or an error message if they don't. The Formik/Yup equivalent is a schema-level `.test()`, which gets access to sibling fields through the validation context.

*Source: [10-Forms-and-Validation.md#8-how-do-you-validate-that-two-fields-agree-such-as-password-and-confirm-password](10-Forms-and-Validation.md#8-how-do-you-validate-that-two-fields-agree-such-as-password-and-confirm-password)*

### 9. What's the tradeoff of validating everything on submit only?

**Answer:** It's the cheapest option to build, and it avoids any premature error flashing — but the trade-off is the user gets zero feedback until they've filled out the entire form and hit submit. On a longer form, that's a rough experience. It's really only an acceptable choice for very short forms — a single search box, a subscribe field, that kind of thing.

*Source: [10-Forms-and-Validation.md#9-whats-the-tradeoff-of-validating-everything-on-submit-only](10-Forms-and-Validation.md#9-whats-the-tradeoff-of-validating-everything-on-submit-only)*

### 10. Why is `PATCH`-style partial state update (`{ ...prev, [name]: value }`) the standard shape for manual form state?

**Answer:** Keeping all the field values in one object, keyed by the input's `name` attribute, means a single `handleChange` function can serve every field — instead of a separate `useState` and handler for each one. It also happens to mirror how validation and error objects naturally shape up — `Partial<Record<keyof FormData, string>>` — so values, errors, and touched state can all be looked up by that same key.

*Source: [10-Forms-and-Validation.md#10-why-is-patch-style-partial-state-update-prev-name-value-the-standard-shape-for-manual-form-state](10-Forms-and-Validation.md#10-why-is-patch-style-partial-state-update-prev-name-value-the-standard-shape-for-manual-form-state)*

## [11. SSR, CSR, and Next.js](11-SSR-CSR-and-Nextjs.md)

### 1. What is the fundamental difference between CSR and SSR?

**Answer:** It comes down to where the page actually gets built. CSR ships a near-empty HTML shell, and the browser builds the whole page itself, after downloading and running the JavaScript. SSR flips that: the server runs the component tree per request and ships back a complete HTML string, which the browser paints immediately and then hydrates. The practical difference is just where the "white screen" wait happens — on the client, waiting for JS, with CSR; or on the server, computing the response, with SSR — that's the TTFB cost.

*Source: [11-SSR-CSR-and-Nextjs.md#1-what-is-the-fundamental-difference-between-csr-and-ssr](11-SSR-CSR-and-Nextjs.md#1-what-is-the-fundamental-difference-between-csr-and-ssr)*

### 2. What is SSG and how does it differ from SSR?

**Answer:** SSG renders each page exactly once, at build time, into static HTML that a CDN just serves — no per-request server compute at all. SSR, by contrast, renders fresh on every single request. The appeal of SSG: you get CSR-level TTFB with SSR-level FCP, best of both. The catch is staleness — content is only ever as fresh as the last build. That's why a product catalog is happy with SSG or ISR, while a live checkout page needs SSR.

*Source: [11-SSR-CSR-and-Nextjs.md#2-what-is-ssg-and-how-does-it-differ-from-ssr](11-SSR-CSR-and-Nextjs.md#2-what-is-ssg-and-how-does-it-differ-from-ssr)*

### 3. What is ISR and when would you use it over plain SSG?

**Answer:** Think of ISR as SSG with an expiry timer built in. The cached page still gets served instantly, but once the revalidation window expires, the next request triggers a background re-render that refreshes the cache for everyone after — no full rebuild needed. Reach for it when data changes occasionally, like product prices or blog content, and near-real-time freshness isn't actually required. It sidesteps both SSG's staleness problem and SSR's per-request server cost.

*Source: [11-SSR-CSR-and-Nextjs.md#3-what-is-isr-and-when-would-you-use-it-over-plain-ssg](11-SSR-CSR-and-Nextjs.md#3-what-is-isr-and-when-would-you-use-it-over-plain-ssg)*

### 4. Walk through the hydration sequence for an SSR page.

**Answer:** Three steps, in order. First, the server renders the full component tree into an HTML string and sends it down. Second, the browser parses and paints that HTML right away, so the user sees content before a single line of JS has even run. Third, while that's happening, the browser downloads the JS bundle in the background — and once it's ready, React "hydrates": it walks the *existing* DOM and attaches its internal representation and event listeners to it, rather than rebuilding anything from scratch. One catch worth remembering: until hydration finishes, the page is visible but not interactive yet — clicking a button does nothing.

*Source: [11-SSR-CSR-and-Nextjs.md#4-walk-through-the-hydration-sequence-for-an-ssr-page](11-SSR-CSR-and-Nextjs.md#4-walk-through-the-hydration-sequence-for-an-ssr-page)*

### 5. Is Next.js a replacement for React?

**Answer:** No. Next.js is built *on top of* React — every Next.js component is still a plain React component, using the exact same hooks and JSX you already know. What Next.js adds is exactly the stuff React deliberately leaves out of scope: file-based routing, SSR/SSG/ISR rendering, API routes, and built-in image and font optimization.

*Source: [11-SSR-CSR-and-Nextjs.md#5-is-nextjs-a-replacement-for-react](11-SSR-CSR-and-Nextjs.md#5-is-nextjs-a-replacement-for-react)*

### 6. What would you have to hand-roll in a plain React (Vite/CRA) app that Next.js gives you out of the box?

**Answer:** Quite a lot, actually. Routing — `react-router-dom` plus manual route configuration. Any server-side rendering at all, since a plain React app is CSR-only by default unless you build a custom SSR server yourself. A separate backend service for any API endpoint. And image optimization — responsive `srcset`, format conversion, lazy loading — all hand-rolled. Next.js gives you every one of those out of the box: file-based routing, SSR/SSG/ISR per page, colocated API routes, and `next/image`/`next/font` automatically.

*Source: [11-SSR-CSR-and-Nextjs.md#6-what-would-you-have-to-hand-roll-in-a-plain-react-vitecra-app-that-nextjs-gives-you-out-of-the-box](11-SSR-CSR-and-Nextjs.md#6-what-would-you-have-to-hand-roll-in-a-plain-react-vitecra-app-that-nextjs-gives-you-out-of-the-box)*

### 7. When would you still choose plain React over Next.js?

**Answer:** For a pure SPA sitting behind a login wall, where SEO simply doesn't matter — an internal admin dashboard, an analytics console, anything every user only reaches after authenticating. There's nothing to gain from server rendering there, and the file-based routing overhead buys you nothing either. A plain Vite SPA deploys as static files, which means simpler infrastructure and no server cost or cache-invalidation headaches to manage.

*Source: [11-SSR-CSR-and-Nextjs.md#7-when-would-you-still-choose-plain-react-over-nextjs](11-SSR-CSR-and-Nextjs.md#7-when-would-you-still-choose-plain-react-over-nextjs)*

### 8. What's the difference between the App Router and the Pages Router?

**Answer:** The Pages Router (`pages/`) uses exported functions — `getServerSideProps`, `getStaticProps` — for data fetching, and every page still gets client-rendered after being delivered as HTML. The App Router (`app/`) replaces all of that with `async` Server Components that fetch data directly, plus a `fetch`-level cache handling ISR-style revalidation. It also adds persistent `layout.js` files, which means shared UI doesn't get remounted every time a nested route changes.

*Source: [11-SSR-CSR-and-Nextjs.md#8-whats-the-difference-between-the-app-router-and-the-pages-router](11-SSR-CSR-and-Nextjs.md#8-whats-the-difference-between-the-app-router-and-the-pages-router)*

### 9. What is a React Server Component, and how does it differ from a Client Component?

**Answer:** A Server Component runs only on the server — it can be `async`, query data directly, and here's the key part: its code never ships to the browser bundle at all. Add `"use client"` at the top of a file, and that marks it, and its imports, as a Client Component instead — which *does* ship to the browser and can use `useState`, `useEffect`, DOM event handlers, all the normal stuff. This is genuinely a new mental model on top of plain React, where every component used to unconditionally ship as client JS.

*Source: [11-SSR-CSR-and-Nextjs.md#9-what-is-a-react-server-component-and-how-does-it-differ-from-a-client-component](11-SSR-CSR-and-Nextjs.md#9-what-is-a-react-server-component-and-how-does-it-differ-from-a-client-component)*

### 10. Why can't a Server Component use `useState` or an `onClick` handler?

**Answer:** Because a Server Component runs exactly once, on the server, to produce its output — and it's never re-rendered in the browser in response to a click or any user interaction. There's simply no client-side runtime attached to it to hold state or dispatch events. Any interactivity has to get pushed down into a `"use client"` leaf component instead. That's why a pattern like a product page's "like" button gets pulled out into its own small client file, while the rest of the page stays a Server Component.

*Source: [11-SSR-CSR-and-Nextjs.md#10-why-cant-a-server-component-use-usestate-or-an-onclick-handler](11-SSR-CSR-and-Nextjs.md#10-why-cant-a-server-component-use-usestate-or-an-onclick-handler)*

### 11. What causes a hydration mismatch error, and give a concrete example?

**Answer:** A hydration mismatch happens whenever the HTML React would produce on the client's first render doesn't match what the server actually sent. The usual cause: the render reads something that differs between environments — `Date.now()`, which gives a different instant each time, or `window`, which is simply undefined on the server. A classic example is a countdown timer computed directly in the component body during both server and client render. The fix is always the same shape: render a static placeholder on both the server and the initial client render, then update it to the live value from inside a `useEffect` after mount.

*Source: [11-SSR-CSR-and-Nextjs.md#11-what-causes-a-hydration-mismatch-error-and-give-a-concrete-example](11-SSR-CSR-and-Nextjs.md#11-what-causes-a-hydration-mismatch-error-and-give-a-concrete-example)*

### 12. How does `getServerSideProps` differ from `getStaticProps`, and how does the App Router change this?

**Answer:** `getServerSideProps` runs on every request — that's SSR. `getStaticProps` runs once, at build time — that's SSG, and it can add `revalidate` to behave like ISR. The App Router collapses both of those into `async` Server Components that just call `fetch` directly, where the caching behavior itself — SSR-like with no cache, SSG-like cached indefinitely, or ISR-like with `revalidate: N` — gets configured per individual fetch call, instead of per exported function.

*Source: [11-SSR-CSR-and-Nextjs.md#12-how-does-getserversideprops-differ-from-getstaticprops-and-how-does-the-app-router-change-this](11-SSR-CSR-and-Nextjs.md#12-how-does-getserversideprops-differ-from-getstaticprops-and-how-does-the-app-router-change-this)*

## [12. Common UI Component Problems](12-Common-UI-Component-Problems.md)

### 1. Why isn't debouncing alone enough to make a search box correct?

**Answer:** Because debouncing only controls *how often* requests get sent — it says nothing about the *order responses come back in*. If a request for a shorter, earlier query happens to resolve after a request for a longer, later one, that stale response can overwrite the correct answer already sitting on screen. Fixing that race takes one of two things: cancel the earlier request with `AbortController`, or tag every response with the query it answered and ignore any that doesn't match the current input.

*Source: [12-Common-UI-Component-Problems.md#1-why-isnt-debouncing-alone-enough-to-make-a-search-box-correct](12-Common-UI-Component-Problems.md#1-why-isnt-debouncing-alone-enough-to-make-a-search-box-correct)*

### 2. Why use `AbortController` instead of a boolean "cancelled" flag to handle stale requests?

**Answer:** A boolean flag checked after `await fetch(...)` resolves still lets that network request run all the way to completion in the background — wasted bandwidth, wasted server work — and you have to manually re-check the flag at every single await point. `AbortController.abort()` actually kills the underlying HTTP request immediately, throws a distinguishable `AbortError` you can filter out in the `catch` block, and just plugs straight into `fetch`'s built-in `signal` option instead of needing hand-rolled bookkeeping.

*Source: [12-Common-UI-Component-Problems.md#2-why-use-abortcontroller-instead-of-a-boolean-cancelled-flag-to-handle-stale-requests](12-Common-UI-Component-Problems.md#2-why-use-abortcontroller-instead-of-a-boolean-cancelled-flag-to-handle-stale-requests)*

### 3. Why does infinite scroll use `IntersectionObserver` instead of a `scroll` event listener?

**Answer:** A `scroll` listener fires nonstop while the user scrolls, which forces you to throttle it yourself and manually run `getBoundingClientRect()` on every tick, just to answer one simple question: "is the sentinel visible yet." That's expensive, and easy to get subtly wrong. `IntersectionObserver` hands that exact question to the browser instead — it answers asynchronously, off the main thread, and only calls back when the intersection state actually changes. No manual throttling, no layout-thrashing reads.

*Source: [12-Common-UI-Component-Problems.md#3-why-does-infinite-scroll-use-intersectionobserver-instead-of-a-scroll-event-listener](12-Common-UI-Component-Problems.md#3-why-does-infinite-scroll-use-intersectionobserver-instead-of-a-scroll-event-listener)*

### 4. Why does the dropdown's click-outside handler listen on `mousedown` rather than `click`?

**Answer:** Because `mousedown` fires before `click` does — so closing the menu on `mousedown` guarantees it's already closed by the time any `click` handler underneath it, or on the trigger button itself, actually runs. Listen on `click` instead, and you get an ordering bug: clicking the trigger button closes the menu via the outside-click handler, and then immediately reopens it via the button's own `onClick` — both firing off the same click.

*Source: [12-Common-UI-Component-Problems.md#4-why-does-the-dropdowns-click-outside-handler-listen-on-mousedown-rather-than-click](12-Common-UI-Component-Problems.md#4-why-does-the-dropdowns-click-outside-handler-listen-on-mousedown-rather-than-click)*

### 5. Why does the modal both add a `keydown` listener and reset `document.body.style.overflow` inside the same `useEffect`, and why does the cleanup function matter here?

**Answer:** Because both of those are page-global side effects — a global key listener, a global style change — and neither one should outlive the modal actually being open. Leave either one dangling, and it affects the rest of the app even after the modal closes. The cleanup function returned from `useEffect` runs on every close and on unmount, removing the listener and restoring `overflow: 'unset'`. Skip that cleanup, and closing the modal without unmounting the component leaves scroll permanently locked, plus a growing stack of duplicate `keydown` listeners every time the modal reopens.

*Source: [12-Common-UI-Component-Problems.md#5-why-does-the-modal-both-add-a-keydown-listener-and-reset-documentbodystyleoverflow-inside-the-same-useeffect-and-why-does-the-cleanup-function-matter-here](12-Common-UI-Component-Problems.md#5-why-does-the-modal-both-add-a-keydown-listener-and-reset-documentbodystyleoverflow-inside-the-same-useeffect-and-why-does-the-cleanup-function-matter-here)*

### 6. Why implement the toast system with React Context and a hook instead of a global mutable array plus manual re-renders?

**Answer:** Context lets any component anywhere in the tree call `showToast` directly, with no parent chain needing to pass that function down as props — no prop drilling. And because state updates still go through `setToasts`, they flow through React's normal render cycle, so the `ToastContainer` re-renders correctly and predictably every time. A module-level mutable array skips React's rendering model entirely — nothing would ever visually update unless you manually forced a re-render from outside React yourself.

*Source: [12-Common-UI-Component-Problems.md#6-why-implement-the-toast-system-with-react-context-and-a-hook-instead-of-a-global-mutable-array-plus-manual-re-renders](12-Common-UI-Component-Problems.md#6-why-implement-the-toast-system-with-react-context-and-a-hook-instead-of-a-global-mutable-array-plus-manual-re-renders)*

### 7. What's wrong with generating toast ids using `Math.random().toString(36)`, and what would you use in a production system?

**Answer:** It's not cryptographically unique — run enough toasts in one session, and collisions become genuinely possible. A duplicate `id` breaks the `key` prop in the list render, and it can make `removeToast` remove the wrong toast entirely. `crypto.randomUUID()`, or a small library like `nanoid`, gives you collision-resistant unique ids with basically the same one-line simplicity.

*Source: [12-Common-UI-Component-Problems.md#7-whats-wrong-with-generating-toast-ids-using-mathrandomtostring36-and-what-would-you-use-in-a-production-system](12-Common-UI-Component-Problems.md#7-whats-wrong-with-generating-toast-ids-using-mathrandomtostring36-and-what-would-you-use-in-a-production-system)*

### 8. Why does the pagination component collapse the page list into windows with "..." instead of rendering every page number?

**Answer:** Rendering all `totalPages` buttons works fine for 5 pages, but falls apart at 5,000 — the control overflows its container, and the DOM ends up carrying hundreds of button nodes nobody will ever click. Keeping just the first page, the last page, and a small window around the current page — with "..." filling the gaps — keeps the control's width bounded and its render cost constant, no matter how big the dataset gets.

*Source: [12-Common-UI-Component-Problems.md#8-why-does-the-pagination-component-collapse-the-page-list-into-windows-with-instead-of-rendering-every-page-number](12-Common-UI-Component-Problems.md#8-why-does-the-pagination-component-collapse-the-page-list-into-windows-with-instead-of-rendering-every-page-number)*

## [13. Frontend System Design Scenarios](13-Frontend-System-Design-Scenarios.md)

### 1. Why does organizing a large React app by file type break down, and what replaces it?

**Answer:** Type-based folders — `components/`, `hooks/`, `pages/` — scatter one feature's logic across several unrelated directories, so understanding or changing that feature means hopping between files spread across the whole codebase. A feature-based structure fixes that by grouping each feature's components, hooks, services, and state together in one place. Ownership and onboarding then scale with the number of features, not the number of files.

*Source: [13-Frontend-System-Design-Scenarios.md#1-why-does-organizing-a-large-react-app-by-file-type-break-down-and-what-replaces-it](13-Frontend-System-Design-Scenarios.md#1-why-does-organizing-a-large-react-app-by-file-type-break-down-and-what-replaces-it)*

### 2. How do code splitting and lazy loading work together, and what does `Suspense` add?

**Answer:** Code splitting breaks one big bundle into smaller per-route chunks. Lazy loading, via `React.lazy`, makes sure a chunk only actually gets requested when its route is visited, instead of upfront with everything else. `Suspense` fills the gap while that chunk downloads, rendering a fallback so the UI shows a proper loading state instead of freezing or going blank.

*Source: [13-Frontend-System-Design-Scenarios.md#2-how-do-code-splitting-and-lazy-loading-work-together-and-what-does-suspense-add](13-Frontend-System-Design-Scenarios.md#2-how-do-code-splitting-and-lazy-loading-work-together-and-what-does-suspense-add)*

### 3. Why is retrying a failed request immediately after a 429 dangerous, and what should replace it?

**Answer:** Because a 429 is the backend explicitly telling you "I'm overwhelmed," and retrying immediately just adds more load right on top of that — usually producing another failure, and across enough clients doing the same thing, a full-blown retry storm. The fix: exponential backoff with jitter, a bounded retry count, and respecting a `Retry-After` header if the server sends one. That gives the backend actual room to recover instead of making things worse.

*Source: [13-Frontend-System-Design-Scenarios.md#3-why-is-retrying-a-failed-request-immediately-after-a-429-dangerous-and-what-should-replace-it](13-Frontend-System-Design-Scenarios.md#3-why-is-retrying-a-failed-request-immediately-after-a-429-dangerous-and-what-should-replace-it)*

### 4. What causes a Next.js hydration mismatch? Give two concrete triggers and their fixes.

**Answer:** A mismatch happens any time the server-rendered HTML and the client's first render compute different output. Two concrete triggers: reading `window.innerWidth`, which is undefined on the server but a real number in the browser, and rendering a conditional off a client-only auth check the server never even saw. Both get fixed the exact same way — defer that browser-only or client-only logic into a `useEffect`, so the value used during hydration's before-mount comparison matches on both sides, and let the effect correct it right after.

*Source: [13-Frontend-System-Design-Scenarios.md#4-what-causes-a-nextjs-hydration-mismatch-give-two-concrete-triggers-and-their-fixes](13-Frontend-System-Design-Scenarios.md#4-what-causes-a-nextjs-hydration-mismatch-give-two-concrete-triggers-and-their-fixes)*

### 5. Why does fixing a hydration issue with `useEffect` still cause a visible flash?

**Answer:** Because `useEffect` only runs *after* React has already compared the server HTML against the client's first render and mounted the tree — so that very first paint necessarily uses the same placeholder value the server used, like `undefined`. The effect then updates that value a tick later. You've traded a hard hydration error for a brief, deliberate flash — that's real progress, but it doesn't eliminate the visible change entirely.

*Source: [13-Frontend-System-Design-Scenarios.md#5-why-does-fixing-a-hydration-issue-with-useeffect-still-cause-a-visible-flash](13-Frontend-System-Design-Scenarios.md#5-why-does-fixing-a-hydration-issue-with-useeffect-still-cause-a-visible-flash)*

### 6. What's the practical difference between a shared component library and a design system?

**Answer:** A component library is just the code — reusable `Button`, `Modal`, and `Input` components that consuming teams import. A design system sits above it: the design tokens, theming rules, documentation, versioning discipline, and governance that actually make that code consistent and safe for many teams to depend on long-term. Skip that layer, and a library tends to drift right back into inconsistency as more and more teams touch it.

*Source: [13-Frontend-System-Design-Scenarios.md#6-whats-the-practical-difference-between-a-shared-component-library-and-a-design-system](13-Frontend-System-Design-Scenarios.md#6-whats-the-practical-difference-between-a-shared-component-library-and-a-design-system)*

### 7. How would you decide whether a given page should be CSR, SSR, or SSG?

**Answer:** Two questions settle it: does the page need to be indexed by search engines, and does its content change between builds? Stable content with no real-time data need is cheapest as SSG. A page that needs both SEO and fresh data on every load needs SSR. An authenticated, highly interactive surface with no SEO requirement at all, like a dashboard, is well served by CSR. In practice, most real products run all three side by side, chosen per route rather than picked once for the whole app.

*Source: [13-Frontend-System-Design-Scenarios.md#7-how-would-you-decide-whether-a-given-page-should-be-csr-ssr-or-ssg](13-Frontend-System-Design-Scenarios.md#7-how-would-you-decide-whether-a-given-page-should-be-csr-ssr-or-ssg)*

### 8. What's the single biggest lever for scaling a frontend to 1M+ daily users, and why doesn't caching alone fix backend overload?

**Answer:** Honestly, there isn't a single lever — delivery (CDN, code splitting), backend load (caching and deduplication), release safety (feature flags), security, and observability all have to move together, because at that scale, each one becomes its own bottleneck on its own. And to the second half of the question: caching only reduces *redundant* requests. It does nothing for requests that are genuinely new or user-specific, so backend capacity and request deduplication still matter no matter how well the cache is performing.

*Source: [13-Frontend-System-Design-Scenarios.md#8-whats-the-single-biggest-lever-for-scaling-a-frontend-to-1m-daily-users-and-why-doesnt-caching-alone-fix-backend-overload](13-Frontend-System-Design-Scenarios.md#8-whats-the-single-biggest-lever-for-scaling-a-frontend-to-1m-daily-users-and-why-doesnt-caching-alone-fix-backend-overload)*

### 9. Why is a modular monolith often the right starting point instead of jumping straight to microfrontends?

**Answer:** Because a modular monolith already gets you feature isolation, independent ownership, and clear boundaries — without paying the operational cost of running multiple independently deployed applications: shared tooling, cross-app routing, versioned contracts between apps. Microfrontends earn their added complexity once a single deployable genuinely can't scale for the organization anymore — that's a decision to make when you hit the wall, not a default architecture to reach for upfront.

*Source: [13-Frontend-System-Design-Scenarios.md#9-why-is-a-modular-monolith-often-the-right-starting-point-instead-of-jumping-straight-to-microfrontends](13-Frontend-System-Design-Scenarios.md#9-why-is-a-modular-monolith-often-the-right-starting-point-instead-of-jumping-straight-to-microfrontends)*

### 10. Where do `useContext`, Zustand, and Redux each fit in a layered state strategy?

**Answer:** Think of it as three tiers. `useContext` is a distribution mechanism, not a real store — fine for state that changes rarely, like a theme, since every consumer re-renders on any value change at all. Zustand fits medium-to-large client state — modals, active tabs, session — where you want selective subscriptions without a lot of setup. Redux fits large, highly interconnected state, where a team specifically needs strict unidirectional data flow and time-travel debugging, at the cost of more boilerplate and more friction with server-rendered components.

*Source: [13-Frontend-System-Design-Scenarios.md#10-where-do-usecontext-zustand-and-redux-each-fit-in-a-layered-state-strategy](13-Frontend-System-Design-Scenarios.md#10-where-do-usecontext-zustand-and-redux-each-fit-in-a-layered-state-strategy)*

### 11. Why does offset-based pagination (`page=3`) break down for infinite scroll over a dataset that changes while the user is browsing it?

**Answer:** Because offset pagination identifies a page by *position* — so if rows get inserted or deleted anywhere else in the dataset between requests, "page 3" now points at a completely different slice of data than where the user actually was, showing up as visible duplicates or gaps. A keyset, or cursor, built from the last item's own sort key instead of its position, stays stable under concurrent inserts and deletes — because it always means "everything after this specific item," never "everything at this specific offset."

*Source: [13-Frontend-System-Design-Scenarios.md#11-why-does-offset-based-pagination-page3-break-down-for-infinite-scroll-over-a-dataset-that-changes-while-the-user-is-browsing-it](13-Frontend-System-Design-Scenarios.md#11-why-does-offset-based-pagination-page3-break-down-for-infinite-scroll-over-a-dataset-that-changes-while-the-user-is-browsing-it)*

### 12. Why should a large data grid virtualize both rows and columns instead of just paginating the rows?

**Answer:** Because even a single fully-rendered page of a wide grid can mean rendering far more DOM cells than the viewport ever actually shows at once — and that's expensive to lay out and paint no matter how the rows were fetched. Virtualizing just the rows doesn't fix the column side of that problem. Virtualizing both axes recycles a small, constant number of DOM nodes for whatever's currently scrolled into view, so rendering cost stays roughly flat instead of scaling with the total row and column count.

*Source: [13-Frontend-System-Design-Scenarios.md#12-why-should-a-large-data-grid-virtualize-both-rows-and-columns-instead-of-just-paginating-the-rows](13-Frontend-System-Design-Scenarios.md#12-why-should-a-large-data-grid-virtualize-both-rows-and-columns-instead-of-just-paginating-the-rows)*

### 13. Why upload large files directly to object storage via a presigned URL instead of routing them through your own application server?

**Answer:** Because routing file bytes through your own server makes that server's bandwidth and memory the bottleneck for every concurrent upload, and it ties up a request for the entire transfer duration — for potentially a very large file. A presigned URL sidesteps all of that: the browser uploads directly to storage, S3 or GCS, while your server's only job is issuing a short-lived credential up front and confirming completion afterward. Large-file traffic never touches your application infrastructure at all.

*Source: [13-Frontend-System-Design-Scenarios.md#13-why-upload-large-files-directly-to-object-storage-via-a-presigned-url-instead-of-routing-them-through-your-own-application-server](13-Frontend-System-Design-Scenarios.md#13-why-upload-large-files-directly-to-object-storage-via-a-presigned-url-instead-of-routing-them-through-your-own-application-server)*

### 14. How would you prevent a user from seeing the same real-time notification twice across two open tabs?

**Answer:** Give every notification a stable ID, and before showing anything, check it against the IDs already shown in this browser session — that's the deduplication step. Then, to coordinate across tabs specifically, use a `BroadcastChannel`, or a shared `localStorage` key paired with a `storage` event. That lets open tabs of the same app agree on which notifications have already been surfaced, so only one tab actually shows the toast — even though both tabs received the exact same live update.

*Source: [13-Frontend-System-Design-Scenarios.md#14-how-would-you-prevent-a-user-from-seeing-the-same-real-time-notification-twice-across-two-open-tabs](13-Frontend-System-Design-Scenarios.md#14-how-would-you-prevent-a-user-from-seeing-the-same-real-time-notification-twice-across-two-open-tabs)*
