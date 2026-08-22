# JavaScript Interview Roadmap

Core JavaScript is the highest-weighted topic in almost any frontend interview — it's what separates "knows React's API" from "actually understands the language React is built on." Every guide here uses a real product scenario (a checkout flow, a search box, an auth flow) rather than a toy example, so you can explain each concept the way you'd actually explain a decision at work.

## Recommended Order

1. [Scope, Hoisting, and Variables](01-Scope-Hoisting-Variables.md)
2. [Closures](02-Closures.md)
3. [The `this` Keyword](03-this-Keyword.md)
4. [Prototypes and Classes](04-Prototypes-and-Classes.md)
5. [Modules: ESM vs CommonJS](05-Modules-ESM-CommonJS.md)
6. [Event Loop and Concurrency](06-Event-Loop-and-Concurrency.md)
7. [Promises and Async/Await](07-Promises-Async-Await.md)
8. [Debounce, Throttle, and Error Handling](08-Debounce-Throttle-and-Error-Handling.md)
9. [Memory Management, GC, and WeakMap](09-Memory-Management-GC-WeakMap.md)
10. [Browser APIs: Fetch, Storage, and Workers](10-Browser-APIs-Fetch-Storage-Workers.md)
11. [Networking: HTTP, Cookies, Caching, and CORS](11-Networking-HTTP-Cookies-Caching-CORS.md)
12. [Authentication: OAuth and JWT](12-Authentication-OAuth-JWT.md)
13. [JavaScript Engine and Browser Internals](13-JavaScript-Engine-and-Browser-Internals.md)
14. [Internationalization (i18n)](14-Internationalization-i18n.md)
15. [TypeScript Language Fundamentals](15-TypeScript-Language-Fundamentals.md)
16. [Event Bubbling, Capturing, and Delegation](16-DOM-Events-Bubbling-Capturing-Delegation.md)

React-specific TypeScript patterns (typing props, hooks, forwardRef) live in the [React folder](../React/06-TypeScript-with-React.md) instead of here, since they need JSX context. The render pipeline (DOM/CSSOM/reflow/repaint) lives in the [HTML-CSS folder](../HTML-CSS/07-Critical-Rendering-Path-and-Browser-Rendering.md), since it's fundamentally about how the browser turns markup and styles into pixels, not a JS-language topic.

## What Mastery Looks Like

- You can explain a mechanism (closures, the event loop, prototypal inheritance) with a real production scenario, not a definition alone.
- You can predict the output of a tricky async/scoping code snippet before running it.
- You can name the classic trap in each topic — the `Integer`-style boxed-value gotchas don't exist in JS, but the loop-variable closure trap, the microtask-starves-macrotask trap, and the `this`-loses-binding-in-a-callback trap absolutely do — and explain why each one happens.
- You can connect a JS-language mechanic to its real-world consequence: why a memory leak happens, why a UI freezes, why a race condition corrupts a search result.

## Final Readiness Checklist

- [ ] Explain `var`/`let`/`const`, hoisting, and the temporal dead zone with a real example each.
- [ ] Explain closures with a real hook or module-pattern example, not just the definition.
- [ ] Predict `this` binding across all four rules, including the classic React class-method callback bug.
- [ ] Explain the prototype chain and why `class`/`extends` is sugar over it.
- [ ] Trace the event loop's call-stack/microtask/macrotask ordering on a real async code snippet.
- [ ] Use all four Promise combinators (`all`/`race`/`allSettled`/`any`) with a correct real use case for each.
- [ ] Implement debounce and throttle from scratch and know when to use each.
- [ ] Diagnose a real frontend memory leak (detached DOM, forgotten listener, closure capture).
- [ ] Explain CORS/SOP precisely: what's actually blocked, and by whom.
- [ ] Explain where a JWT should be stored client-side and why that's a security trade-off, not a solved problem.
- [ ] Recite the capture/target/bubble phases and implement event delegation for a dynamic list.
