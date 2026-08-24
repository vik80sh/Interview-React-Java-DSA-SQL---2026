# Master Question Bank — JavaScript Interview Prep

This file aggregates **every interview question and its full answer** from each of the 16 files in this folder (`01-Scope-Hoisting-Variables.md` through `16-DOM-Events-Bubbling-Capturing-Delegation.md`), in one place, so the whole set can be drilled without opening each file individually. Every answer (and follow-up, where present) is copied verbatim from its source file, and every question links back to its exact heading in that original file (the `*Source: ...*` line beneath each answer) so you can open it for the surrounding lesson content, code examples, and Revision Checklist that give it fuller context.

## [1. Scope, Hoisting, and Variables in JavaScript](01-Scope-Hoisting-Variables.md)

### 1. What's the practical difference between `var`, `let`, and `const`?

**Answer:** `var` is function-scoped, hoisted and pre-initialized to `undefined`, and can be redeclared. `let` and `const` are block-scoped and hoisted into the TDZ instead of being initialized, so using them before their declaration line throws. `const` additionally forbids reassigning the binding, though an object or array it points to can still be mutated, like pushing into a `const cart = []`.

*Source: [01-Scope-Hoisting-Variables.md#1-whats-the-practical-difference-between-var-let-and-const](01-Scope-Hoisting-Variables.md#1-whats-the-practical-difference-between-var-let-and-const)*

### 2. Why does a `var` declared inside an `if` block "leak" out, but a `let` doesn't?

**Answer:** `var` is scoped to the nearest function (or global scope), and a bare `{}` block has no effect on that — it's purely a syntactic grouping for `var`. `let` and `const` are scoped to that exact block, so they cease to exist the moment the block's closing brace is reached. This is why two `if` branches using `var discount` for different rates can silently overwrite each other's value.

*Source: [01-Scope-Hoisting-Variables.md#2-why-does-a-var-declared-inside-an-if-block-leak-out-but-a-let-doesnt](01-Scope-Hoisting-Variables.md#2-why-does-a-var-declared-inside-an-if-block-leak-out-but-a-let-doesnt)*

### 3. What is the scope chain, and how does JavaScript resolve a variable reference?

**Answer:** When an identifier isn't found in the current scope, the engine walks outward through each enclosing scope in the order the code was lexically written, stopping at the first match or throwing a `ReferenceError` at the global scope. It's resolved based on where a function was defined, not where it's called from, which is why a nested function like `withAuth` in an API client can still read `baseUrl` from an outer `createApiClient` closure no matter who invokes it later.

*Source: [01-Scope-Hoisting-Variables.md#3-what-is-the-scope-chain-and-how-does-javascript-resolve-a-variable-reference](01-Scope-Hoisting-Variables.md#3-what-is-the-scope-chain-and-how-does-javascript-resolve-a-variable-reference)*

### 4. Explain what actually happens during hoisting's "creation phase."

**Answer:** Before executing any code in a scope, the engine scans it and sets up memory bindings for every declaration it finds — function declarations get their full body attached immediately, `var` gets pre-initialized to `undefined`, and `let`/`const`/`class` get a binding marked uninitialized. Nothing physically moves in the source; the illusion of "moving to the top" comes entirely from this pre-scan happening before line-by-line execution starts.

*Source: [01-Scope-Hoisting-Variables.md#4-explain-what-actually-happens-during-hoistings-creation-phase](01-Scope-Hoisting-Variables.md#4-explain-what-actually-happens-during-hoistings-creation-phase)*

### 5. What is the Temporal Dead Zone, and why does `typeof` throw on a TDZ variable instead of returning `"undefined"`?

**Answer:** The TDZ is the window between a scope being entered and the actual `let`/`const` declaration line executing, during which the variable exists but is locked and throws on any access. `typeof` throwing here — unlike on a truly undeclared identifier, where it safely returns `"undefined"` — is a deliberate design choice: it removes the old `var`-era trick of using `typeof` to safely probe for a variable before it's been properly initialized.

*Source: [01-Scope-Hoisting-Variables.md#5-what-is-the-temporal-dead-zone-and-why-does-typeof-throw-on-a-tdz-variable-instead-of-returning-undefined](01-Scope-Hoisting-Variables.md#5-what-is-the-temporal-dead-zone-and-why-does-typeof-throw-on-a-tdz-variable-instead-of-returning-undefined)*

### 6. Why does a function declaration win over a `var` with the same name during hoisting?

**Answer:** The creation phase hoists function declarations first and binds them to their full body; when it then processes `var` declarations with the same name, it finds the binding already occupied by a function and does not overwrite it with `undefined`. That's why, in a function containing both `var notifyUser` and `function notifyUser(){}`, reading `notifyUser` at the top of the function returns the function, not `undefined`, regardless of which one appears first in the source.

*Source: [01-Scope-Hoisting-Variables.md#6-why-does-a-function-declaration-win-over-a-var-with-the-same-name-during-hoisting](01-Scope-Hoisting-Variables.md#6-why-does-a-function-declaration-win-over-a-var-with-the-same-name-during-hoisting)*

### 7. Walk through why a `var` loop variable breaks closures attached inside a loop, and how `let` fixes it.

**Answer:** With `var`, the loop variable is a single function-scoped binding shared by every iteration, so a closure that runs later — like a click handler — reads whatever value that one variable ended up with after the loop finished, not its value at closure-creation time. `let` gives each iteration of a `for` loop its own fresh binding, so each closure captures a distinct value; this is exactly why attaching per-row "remove from cart" click handlers with `var i` makes every button remove the last item, while switching to `let i` fixes it with no other code changes.

*Source: [01-Scope-Hoisting-Variables.md#7-walk-through-why-a-var-loop-variable-breaks-closures-attached-inside-a-loop-and-how-let-fixes-it](01-Scope-Hoisting-Variables.md#7-walk-through-why-a-var-loop-variable-breaks-closures-attached-inside-a-loop-and-how-let-fixes-it)*

### 8. Is a `const` variable actually immutable?

**Answer:** No — `const` only prevents the binding itself from being reassigned to a different value or reference. If the value is an object or array, its contents can still be freely mutated, so `const cart = []; cart.push(item);` is completely legal, while `cart = []` afterward is a `TypeError`.

*Source: [01-Scope-Hoisting-Variables.md#8-is-a-const-variable-actually-immutable](01-Scope-Hoisting-Variables.md#8-is-a-const-variable-actually-immutable)*

### 9. Are function declarations always hoisted to the top of the enclosing function, no matter where they're nested?

**Answer:** Not reliably. A function declared at the top level of a function or module is fully hoisted with its body. One declared inside a block like `if` or `for` is technically block-scoped under strict mode and ES modules, but many non-strict environments still hoist it out of the block using legacy fallback behavior with `var`-like semantics. Because the behavior differs by environment, block-nested function declarations should be avoided in favor of a function expression assigned to a `let`/`const`.

*Source: [01-Scope-Hoisting-Variables.md#9-are-function-declarations-always-hoisted-to-the-top-of-the-enclosing-function-no-matter-where-theyre-nested](01-Scope-Hoisting-Variables.md#9-are-function-declarations-always-hoisted-to-the-top-of-the-enclosing-function-no-matter-where-theyre-nested)*

### 10. How does hoisting differ between a function declaration and a function expression assigned to a `const`?

**Answer:** A function declaration hoists both the name and the complete function body, so it's callable anywhere in its scope, even before its source line. A function expression like `const sendConfirmationEmail = function(){}` only hoists the identifier per `const`'s rules — into the TDZ — so calling it before that assignment line executes throws a `ReferenceError`, exactly like using any other TDZ `const` too early.

*Source: [01-Scope-Hoisting-Variables.md#10-how-does-hoisting-differ-between-a-function-declaration-and-a-function-expression-assigned-to-a-const](01-Scope-Hoisting-Variables.md#10-how-does-hoisting-differ-between-a-function-declaration-and-a-function-expression-assigned-to-a-const)*

## [2. Closures](02-Closures.md)

### 1. What is a closure, in terms an interviewer will accept as precise?

**Answer:** A closure is a function paired with a reference to the lexical environment it was created in, so it can read and write variables from an outer scope even after that outer function has returned. It's created at function-creation time, not at return time — every function has a closure over its defining scope, it just isn't observable unless the function outlives its creator.

*Source: [02-Closures.md#1-what-is-a-closure-in-terms-an-interviewer-will-accept-as-precise](02-Closures.md#1-what-is-a-closure-in-terms-an-interviewer-will-accept-as-precise)*

### 2. Does a closure capture a value or a variable?

**Answer:** A live variable binding, not a copied value. `makeIdGenerator`'s `next()` function keeps incrementing the same `counter` on every call precisely because it holds a reference to the actual binding, not a snapshot taken when `next` was created — which is also exactly why the `var i` loop bug happens.

*Source: [02-Closures.md#2-does-a-closure-capture-a-value-or-a-variable](02-Closures.md#2-does-a-closure-capture-a-value-or-a-variable)*

### 3. Why did all three functions in the classic `var i` loop log the same final value?

**Answer:** `var` is function-scoped, so the loop creates one shared `i` binding for the entire function, and every closure created inside the loop body references that same binding. By the time any of the closures actually run, the loop has finished and `i` already holds its terminal value, so every closure reads that same final number.

*Source: [02-Closures.md#3-why-did-all-three-functions-in-the-classic-var-i-loop-log-the-same-final-value](02-Closures.md#3-why-did-all-three-functions-in-the-classic-var-i-loop-log-the-same-final-value)*

### 4. How does changing `var` to `let` fix the loop bug, mechanically?

**Answer:** `let` is block-scoped, so the JavaScript engine creates a brand-new lexical binding for `i` on every iteration of the loop, and each closure created in that iteration captures its own private binding. It's functionally equivalent to wrapping each iteration in an IIFE that receives the current index as a parameter, which is the pattern used to fix this before `let` existed.

*Source: [02-Closures.md#4-how-does-changing-var-to-let-fix-the-loop-bug-mechanically](02-Closures.md#4-how-does-changing-var-to-let-fix-the-loop-bug-mechanically)*

### 5. What is a "stale closure" in React, and how does `useDebounce`'s `useRef` avoid it?

**Answer:** A stale closure is a callback (typically inside `useEffect`, `setTimeout`, or `setInterval`) that closed over a piece of state or a prop from an earlier render and never sees later updates because the effect didn't re-run. `useDebounce` avoids this by having the long-lived closure read `latestCallback.current` — a ref whose box has a stable identity across renders — instead of closing over the `callback` argument directly, so a separate effect can keep that box updated on every render without needing to recreate the timer.

*Source: [02-Closures.md#5-what-is-a-stale-closure-in-react-and-how-does-usedebounces-useref-avoid-it](02-Closures.md#5-what-is-a-stale-closure-in-react-and-how-does-usedebounces-useref-avoid-it)*

### 6. Give a real use of closures for private state, and say why it's stronger than a class field.

**Answer:** A rate limiter or counter created by a factory function (`createRateLimiter`) keeps its internal counters as local variables in the factory's scope, exposed only through the methods it returns. Unlike `this.count` on a class instance, which is a real, always-visible property on the object, there is no property path that reaches the closed-over variable from outside — nothing to enumerate, log, or accidentally mutate.

*Source: [02-Closures.md#6-give-a-real-use-of-closures-for-private-state-and-say-why-its-stronger-than-a-class-field](02-Closures.md#6-give-a-real-use-of-closures-for-private-state-and-say-why-its-stronger-than-a-class-field)*

### 7. How does a memoization cache use closures?

**Answer:** `memoize(fn)` creates one `Map` in its own scope and returns a wrapper function that closes over that same `Map`. Every call to the wrapper reads and writes the identical cache because all calls share the one closure created by the single `memoize(fn)` invocation — calling `memoize(fn)` twice would produce two independent caches.

*Source: [02-Closures.md#7-how-does-a-memoization-cache-use-closures](02-Closures.md#7-how-does-a-memoization-cache-use-closures)*

### 8. Why can closures cause memory leaks, and when should you actually worry about it?

**Answer:** A closure keeps its entire outer Environment Record reachable for as long as the closure itself is reachable, so if that outer scope holds a large object or DOM node the closure doesn't need, the whole thing stays in memory. This matters in practice for long-lived closures — an event listener never removed, an interval never cleared, a cache with no eviction — which is exactly why `useDebounce` and the counter example both clean up (`clearTimeout`/`clearInterval`) rather than letting timers accumulate.

*Source: [02-Closures.md#8-why-can-closures-cause-memory-leaks-and-when-should-you-actually-worry-about-it](02-Closures.md#8-why-can-closures-cause-memory-leaks-and-when-should-you-actually-worry-about-it)*

### 9. What's the difference between a closure and a regular function scope lookup?

**Answer:** Every function does a scope lookup through its lexical environment chain, but "closure" specifically describes the case where that outer scope would otherwise have been destroyed and the function's reference is the thing keeping it alive. Calling a function while its defining scope is still on the call stack is ordinary scoping; the interesting case interviewers mean by "closure" is when the outer function has already returned.

*Source: [02-Closures.md#9-whats-the-difference-between-a-closure-and-a-regular-function-scope-lookup](02-Closures.md#9-whats-the-difference-between-a-closure-and-a-regular-function-scope-lookup)*

### 10. In the debounce hook, why is the cleanup function also called a closure?

**Answer:** The `return () => clearTimeout(timerId)` function captures `timerId` from that specific run of the effect, so when React calls it (before the next effect run or on unmount) it clears the exact timer that run created, not some other run's timer. Each effect execution creates its own `timerId` variable and its own cleanup closure over it, which is what makes it safe to call `useDebounce` from a component that re-renders rapidly without timers colliding.

*Source: [02-Closures.md#10-in-the-debounce-hook-why-is-the-cleanup-function-also-called-a-closure](02-Closures.md#10-in-the-debounce-hook-why-is-the-cleanup-function-also-called-a-closure)*

## [3. The `this` Keyword](03-this-Keyword.md)

### 1. How do you determine what `this` refers to inside a given function?

**Answer:** Look at the call-site, not the function definition. Ask how the function is actually invoked: standalone (`fn()`), as a method (`obj.fn()`), explicitly (`fn.call(obj)`), or with `new`. The same function body can resolve `this` differently on every call depending on which of these shapes applies.

*Source: [03-this-Keyword.md#1-how-do-you-determine-what-this-refers-to-inside-a-given-function](03-this-Keyword.md#1-how-do-you-determine-what-this-refers-to-inside-a-given-function)*

### 2. What is the order of precedence among the four binding rules?

**Answer:** `new` binding wins over explicit binding (`call`/`apply`/`bind`), which wins over implicit binding (method call syntax), which wins over default binding (standalone call). For example, calling `new boundFn()` on a function already bound with `.bind(obj)` still targets the brand-new instance created by `new`, not `obj`.

*Source: [03-this-Keyword.md#2-what-is-the-order-of-precedence-among-the-four-binding-rules](03-this-Keyword.md#2-what-is-the-order-of-precedence-among-the-four-binding-rules)*

### 3. Why does extracting a method off an object and calling it separately break `this`?

**Answer:** Implicit binding depends on there being a dot immediately before the call — `const fn = obj.method; fn()` has no dot at the call-site, so it falls through to default binding and `this` becomes `undefined` (strict mode) or the global object. This is exactly what happens when you pass `obj.method` directly to `setTimeout`, `addEventListener`, or as a React `onClick` handler without binding it.

*Source: [03-this-Keyword.md#3-why-does-extracting-a-method-off-an-object-and-calling-it-separately-break-this](03-this-Keyword.md#3-why-does-extracting-a-method-off-an-object-and-calling-it-separately-break-this)*

### 4. How do arrow functions handle `this`, and why can't you `bind()` a new value onto one?

**Answer:** Arrow functions have no `this` binding of their own; they resolve `this` lexically by looking at the enclosing scope at the time they were defined, exactly like a closed-over variable. Since there's no internal `this` slot to set, `call`, `apply`, `bind`, and `new` all have no effect on an arrow function's `this` — `arrowFn.bind(obj)` returns a function that still uses the original lexical `this`.

*Source: [03-this-Keyword.md#4-how-do-arrow-functions-handle-this-and-why-cant-you-bind-a-new-value-onto-one](03-this-Keyword.md#4-how-do-arrow-functions-handle-this-and-why-cant-you-bind-a-new-value-onto-one)*

### 5. What's the practical difference between `call`, `apply`, and `bind`?

**Answer:** `call` and `apply` both invoke the function immediately with a given `this`, differing only in how arguments are passed — individually for `call`, as an array for `apply`. `bind` does not invoke anything; it returns a new function with `this` permanently locked, which is what you use when you need a reusable callback rather than a one-off invocation.

*Source: [03-this-Keyword.md#5-whats-the-practical-difference-between-call-apply-and-bind](03-this-Keyword.md#5-whats-the-practical-difference-between-call-apply-and-bind)*

### 6. Why does `<button onClick={this.handleClick}>` throw inside a React class component, and how do you fix it?

**Answer:** `this.handleClick` passed as a prop is just a bare function reference; React later invokes it as a standalone call with no receiver, so `this` inside `handleClick` is `undefined` and `this.setState(...)` throws. The standard fixes are binding it in the constructor (`this.handleClick = this.handleClick.bind(this)`), defining it as an arrow-function class field, or wrapping it inline as `onClick={() => this.handleClick()}`.

*Source: [03-this-Keyword.md#6-why-does-button-onclickthishandleclick-throw-inside-a-react-class-component-and-how-do-you-fix-it](03-this-Keyword.md#6-why-does-button-onclickthishandleclick-throw-inside-a-react-class-component-and-how-do-you-fix-it)*

### 7. Why doesn't this class of bug exist in function components?

**Answer:** Function components have no `this` at all — state comes from `useState` and handlers are ordinary closures over local variables and setter functions. Since there's no object instance whose `this` could be lost, passing a handler defined inside a function component to `onClick` always works correctly without binding.

*Source: [03-this-Keyword.md#7-why-doesnt-this-class-of-bug-exist-in-function-components](03-this-Keyword.md#7-why-doesnt-this-class-of-bug-exist-in-function-components)*

### 8. What does `this` refer to inside a regular function passed to `setTimeout`, and how do you fix it without `bind`?

**Answer:** A callback passed to `setTimeout` is invoked by the timer with no receiver, so a regular `function` falls back to default binding and `this` is `undefined` or the global object, not the object that scheduled it. Replacing it with an arrow function fixes it because the arrow function has no own `this` and instead inherits it lexically from the enclosing method where `setTimeout` was called.

*Source: [03-this-Keyword.md#8-what-does-this-refer-to-inside-a-regular-function-passed-to-settimeout-and-how-do-you-fix-it-without-bind](03-this-Keyword.md#8-what-does-this-refer-to-inside-a-regular-function-passed-to-settimeout-and-how-do-you-fix-it-without-bind)*

### 9. If you pass `null` or `undefined` to `Function.prototype.call`, what happens to `this`?

**Answer:** In non-strict mode, JavaScript silently substitutes the global object for a `null`/`undefined` receiver, so `this` ends up being `window` (or `globalThis`) rather than throwing. In strict mode — which applies inside ES modules, class bodies, and any function marked `"use strict"` — `this` stays exactly `null` or `undefined`, so accessing a property on it throws a `TypeError` immediately, which is usually the more useful failure mode for catching bugs early.

*Source: [03-this-Keyword.md#9-if-you-pass-null-or-undefined-to-functionprototypecall-what-happens-to-this](03-this-Keyword.md#9-if-you-pass-null-or-undefined-to-functionprototypecall-what-happens-to-this)*

## [4. Prototypes and Classes](04-Prototypes-and-Classes.md)

### 1. What actually happens when you write `obj.someMethod()` and `someMethod` isn't defined directly on `obj`?

**Answer:** The engine checks `obj` itself first; if the property isn't found, it follows `obj.__proto__` to the next object in the chain, and keeps walking until it either finds the property or reaches `null` at the end of the chain (`Object.prototype.__proto__`). If it reaches `null` without finding it, the result is `undefined` for a plain access, or a `TypeError` if you try to call it as a function.

*Source: [04-Prototypes-and-Classes.md#1-what-actually-happens-when-you-write-objsomemethod-and-somemethod-isnt-defined-directly-on-obj](04-Prototypes-and-Classes.md#1-what-actually-happens-when-you-write-objsomemethod-and-somemethod-isnt-defined-directly-on-obj)*

### 2. How is `class`/`extends` different from manually wiring `Object.create` and `.call()`, if it's "the same mechanism"?

**Answer:** The runtime object model is identical — `extends` still wires `Child.prototype.__proto__` to `Parent.prototype`, and `super(...)` still runs the parent constructor against the new instance's `this`, exactly like `Parent.call(this, ...)` did before ES6. The differences are enforced rules the engine adds: you cannot touch `this` in a derived constructor before calling `super()`, and a `class` declaration is not usable before its line runs (temporal dead zone), unlike a function declaration.

*Source: [04-Prototypes-and-Classes.md#2-how-is-classextends-different-from-manually-wiring-objectcreate-and-call-if-its-the-same-mechanism](04-Prototypes-and-Classes.md#2-how-is-classextends-different-from-manually-wiring-objectcreate-and-call-if-its-the-same-mechanism)*

### 3. What's the difference between a property on `Button.prototype` and a property assigned inside the `Button` constructor with `this.x = ...`?

**Answer:** A property on `Button.prototype` exists once in memory and is shared — reached through the chain — by every instance, which is why methods belong there. A property set with `this.x` inside the constructor is created fresh on every single instance, which is correct for unique instance data like a `baseUrl`, but would waste memory if used for a method that behaves identically across every instance.

*Source: [04-Prototypes-and-Classes.md#3-whats-the-difference-between-a-property-on-buttonprototype-and-a-property-assigned-inside-the-button-constructor-with-thisx-](04-Prototypes-and-Classes.md#3-whats-the-difference-between-a-property-on-buttonprototype-and-a-property-assigned-inside-the-button-constructor-with-thisx-)*

### 4. Why does forgetting to reset `Child.prototype.constructor` after `Child.prototype = Object.create(Parent.prototype)` cause a bug, and does `class` have the same trap?

**Answer:** After that line, `Child.prototype.constructor` still points at `Parent`, because the newly created object inherited `constructor` from `Parent.prototype` instead of pointing back at `Child` — code that inspects `instance.constructor.name` for logging or reflection silently gets the wrong class name. `class extends` doesn't have this trap: the engine sets up the constructor link correctly and automatically, which is one of the concrete bugs `class` syntax was designed to prevent.

*Source: [04-Prototypes-and-Classes.md#4-why-does-forgetting-to-reset-childprototypeconstructor-after-childprototype-objectcreateparentprototype-cause-a-bug-and-does-class-have-the-same-trap](04-Prototypes-and-Classes.md#4-why-does-forgetting-to-reset-childprototypeconstructor-after-childprototype-objectcreateparentprototype-cause-a-bug-and-does-class-have-the-same-trap)*

### 5. How does a private field (`#token`) differ from the old `_token` underscore convention?

**Answer:** `_token` is purely a naming convention — nothing stops outside code from reading or writing `instance._token` directly, it's just a signal to other developers not to. `#token` is enforced by the JavaScript engine itself: accessing `instance.#token` from outside the declaring class is a `SyntaxError`, not merely `undefined`, so there is no way to accidentally or deliberately reach into it from outside.

*Source: [04-Prototypes-and-Classes.md#5-how-does-a-private-field-token-differ-from-the-old-_token-underscore-convention](04-Prototypes-and-Classes.md#5-how-does-a-private-field-token-differ-from-the-old-_token-underscore-convention)*

### 6. When would you reach for a getter/setter instead of a plain public field?

**Answer:** When reading or writing the value needs to trigger real logic — validation on write (like rejecting a negative retry count), a computed value on read (like `attemptsRemaining` derived from a private counter), or a side effect like logging — while still letting callers use plain `obj.prop` syntax instead of `obj.getProp()`/`obj.setProp()`. A plain public field is fine when there's genuinely no invariant to protect and no computation involved.

*Source: [04-Prototypes-and-Classes.md#6-when-would-you-reach-for-a-gettersetter-instead-of-a-plain-public-field](04-Prototypes-and-Classes.md#6-when-would-you-reach-for-a-gettersetter-instead-of-a-plain-public-field)*

### 7. Is a `static` method reachable on an instance? What about a static field?

**Answer:** No — a `static` member lives on the class/constructor function itself, not on `.prototype`, so instances never see it through the prototype chain. `HttpClient.withDefaultTimeout(...)` is callable, but `client.withDefaultTimeout(...)` on an instance throws a `TypeError`, since that method was never placed anywhere the instance's chain reaches.

*Source: [04-Prototypes-and-Classes.md#7-is-a-static-method-reachable-on-an-instance-what-about-a-static-field](04-Prototypes-and-Classes.md#7-is-a-static-method-reachable-on-an-instance-what-about-a-static-field)*

### 8. What actually is `Object.create(null)` useful for, and why not just use `{}`?

**Answer:** `Object.create(null)` produces an object with no prototype at all, so it inherits nothing from `Object.prototype` — no `toString`, no `hasOwnProperty`, no `constructor`. `{}` implicitly inherits from `Object.prototype`, which becomes a real problem if the object is used as a dictionary with attacker-influenced keys, since a key like `"toString"` or `"constructor"` would otherwise collide with an inherited method instead of behaving like a plain data slot.

*Source: [04-Prototypes-and-Classes.md#8-what-actually-is-objectcreatenull-useful-for-and-why-not-just-use-](04-Prototypes-and-Classes.md#8-what-actually-is-objectcreatenull-useful-for-and-why-not-just-use-)*

## [5. JavaScript Modules: ESM vs CommonJS](05-Modules-ESM-CommonJS.md)

### 1. What is the fundamental difference between how CommonJS and ESM resolve imports?

**Answer:** CommonJS resolves `require()` calls at runtime — the engine literally executes the required file and returns its `module.exports` object at the moment `require` is called, so imports can be conditional. ESM resolves the entire import/export graph statically, before any module body runs, which is why `import` statements must be top-level and why the engine can reason about the graph without executing it.

*Source: [05-Modules-ESM-CommonJS.md#1-what-is-the-fundamental-difference-between-how-commonjs-and-esm-resolve-imports](05-Modules-ESM-CommonJS.md#1-what-is-the-fundamental-difference-between-how-commonjs-and-esm-resolve-imports)*

### 2. Why does ESM enable tree-shaking while CommonJS effectively blocks it?

**Answer:** ESM's `export`/`import` bindings are declared statically, so a bundler can build the full dependency graph and prove which exports are unused without running any code, then delete them. CommonJS's `module.exports` is a plain runtime object that can be built with loops, conditionals, or computed keys, so a bundler cannot safely determine which properties are unused without simulating execution — it has to keep the whole module.

*Source: [05-Modules-ESM-CommonJS.md#2-why-does-esm-enable-tree-shaking-while-commonjs-effectively-blocks-it](05-Modules-ESM-CommonJS.md#2-why-does-esm-enable-tree-shaking-while-commonjs-effectively-blocks-it)*

### 3. When would you use dynamic `import()` instead of a static `import`?

**Answer:** Whenever you want to defer loading code until it's actually needed — for example, only fetching a heavy charting library when a user opens an analytics tab on a dashboard, rather than shipping it in the initial bundle. `import()` returns a Promise and can be called from anywhere, including inside an event handler, which static `import` cannot do since it must sit at the top level.

*Source: [05-Modules-ESM-CommonJS.md#3-when-would-you-use-dynamic-import-instead-of-a-static-import](05-Modules-ESM-CommonJS.md#3-when-would-you-use-dynamic-import-instead-of-a-static-import)*

### 4. Explain the "live binding" behavior of ESM imports and how it differs from CommonJS.

**Answer:** In ESM, an imported binding is a live, read-only reference to the actual variable in the exporting module — if the exporting module later reassigns that variable, every importer sees the new value immediately. CommonJS instead copies whatever value existed on `module.exports` at the time `require` ran; later mutations of a primitive value in the source module are invisible to modules that already imported it, unless they imported the containing object and mutated a property on it.

*Source: [05-Modules-ESM-CommonJS.md#4-explain-the-live-binding-behavior-of-esm-imports-and-how-it-differs-from-commonjs](05-Modules-ESM-CommonJS.md#4-explain-the-live-binding-behavior-of-esm-imports-and-how-it-differs-from-commonjs)*

### 5. What actually happens when two ESM modules import each other in a cycle?

**Answer:** The engine hoists both modules' export declarations before running either body, so each side gets a live reference to the other's bindings — but if code from one module executes and immediately reads a binding from the other before that other module's top-level code has run and assigned it, it throws a `ReferenceError` because the binding is still in an uninitialized state. The safe fix in practice is to extract the shared piece both modules need into a separate module they both depend on, breaking the cycle rather than relying on execution order.

*Source: [05-Modules-ESM-CommonJS.md#5-what-actually-happens-when-two-esm-modules-import-each-other-in-a-cycle](05-Modules-ESM-CommonJS.md#5-what-actually-happens-when-two-esm-modules-import-each-other-in-a-cycle)*

### 6. How does importing a CommonJS package from an ESM file actually work under Node and under bundlers?

**Answer:** Node's ESM loader treats the entire CJS `module.exports` object as the default export when you `import` a `.cjs` module, and only exposes named exports if a static-analysis tool like `cjs-module-lexer` can detect them syntactically — it's not guaranteed for dynamically-constructed exports. Bundlers like webpack do the same conceptually: they wrap the CJS module and inject an interop helper so `import x from 'cjsPackage'` resolves correctly, which is the same mechanism behind TypeScript/Babel's `esModuleInterop` flag.

*Source: [05-Modules-ESM-CommonJS.md#6-how-does-importing-a-commonjs-package-from-an-esm-file-actually-work-under-node-and-under-bundlers](05-Modules-ESM-CommonJS.md#6-how-does-importing-a-commonjs-package-from-an-esm-file-actually-work-under-node-and-under-bundlers)*

### 7. Why do libraries like lodash ship both a CJS build and an ESM build (`lodash` vs `lodash-es`)?

**Answer:** The CJS build's `module.exports` is a single runtime object, so importing even one function pulls in the whole module because a bundler cannot prove the rest is unused. The ESM build (`lodash-es`) exports each function as a separate static named export, letting Rollup/webpack/esbuild tree-shake away every function you never imported, which materially shrinks the final bundle.

*Source: [05-Modules-ESM-CommonJS.md#7-why-do-libraries-like-lodash-ship-both-a-cjs-build-and-an-esm-build-lodash-vs-lodash-es](05-Modules-ESM-CommonJS.md#7-why-do-libraries-like-lodash-ship-both-a-cjs-build-and-an-esm-build-lodash-vs-lodash-es)*

### 8. How do Vite and webpack differ in how they handle ESM vs CommonJS during development versus production?

**Answer:** In dev, Vite serves your own ESM source files directly to the browser as native modules for instant HMR, while pre-bundling CJS `node_modules` dependencies into ESM-compatible chunks with esbuild up front, since browsers can't natively `import` a CJS file. In production, Vite hands off to Rollup, and webpack behaves similarly throughout: both parse every module regardless of source format, tree-shake the ESM portions of the graph, and treat CJS dependencies as opaque, un-shakeable units wrapped with interop helpers.

*Source: [05-Modules-ESM-CommonJS.md#8-how-do-vite-and-webpack-differ-in-how-they-handle-esm-vs-commonjs-during-development-versus-production](05-Modules-ESM-CommonJS.md#8-how-do-vite-and-webpack-differ-in-how-they-handle-esm-vs-commonjs-during-development-versus-production)*

### 9. Why can't you put a static `import` statement inside an `if` block, and how would you achieve the same effect?

**Answer:** Static `import` must be resolvable at parse time so the engine can build the module graph before executing anything, and an `if` condition is only known at runtime, which would contradict that guarantee — this is enforced as a syntax error, not just a lint rule. To conditionally load a module you use dynamic `import()`, which is a real function call returning a Promise and can legally live inside any runtime branch.

*Source: [05-Modules-ESM-CommonJS.md#9-why-cant-you-put-a-static-import-statement-inside-an-if-block-and-how-would-you-achieve-the-same-effect](05-Modules-ESM-CommonJS.md#9-why-cant-you-put-a-static-import-statement-inside-an-if-block-and-how-would-you-achieve-the-same-effect)*

### 10. Give a concrete reason a real project would still need CommonJS support in 2026 despite ESM being the modern standard.

**Answer:** A large share of npm packages, especially older or infrequently-maintained ones, and much of Node's own tooling ecosystem (some Jest transforms, certain build plugins) still ship or expect CJS, so any nontrivial project's dependency tree is guaranteed to include CJS modules. Bundlers and Node's dual-package interop exist specifically because you can't realistically require an entire ecosystem to migrate before you're allowed to ship.

*Source: [05-Modules-ESM-CommonJS.md#10-give-a-concrete-reason-a-real-project-would-still-need-commonjs-support-in-2026-despite-esm-being-the-modern-standard](05-Modules-ESM-CommonJS.md#10-give-a-concrete-reason-a-real-project-would-still-need-commonjs-support-in-2026-despite-esm-being-the-modern-standard)*

## [6. Event Loop and Concurrency](06-Event-Loop-and-Concurrency.md)

### 1. JavaScript is single-threaded — so how can a browser tab run a timer, a network request, and stay responsive to clicks all "at once"?

**Answer:** It can't, on the JS thread itself — there's only one call stack. The illusion comes from the host environment: the browser (or Node's `libuv`) is genuinely multithreaded and handles timers, network I/O, and event listening on its own threads, only pushing the resulting callback into a queue for the event loop to run on the single JS thread once it's free. `fetch`, `setTimeout`, and DOM listeners are Web APIs, not JS engine features.

*Source: [06-Event-Loop-and-Concurrency.md#1-javascript-is-single-threaded-—-so-how-can-a-browser-tab-run-a-timer-a-network-request-and-stay-responsive-to-clicks-all-at-once](06-Event-Loop-and-Concurrency.md#1-javascript-is-single-threaded-—-so-how-can-a-browser-tab-run-a-timer-a-network-request-and-stay-responsive-to-clicks-all-at-once)*

### 2. What's the concrete difference between a microtask and a macrotask, and which runs first?

**Answer:** Microtasks (`Promise.then`, `async/await` resumption, `queueMicrotask`) always run before the next macrotask (`setTimeout`, `setInterval`, UI events), because the event loop fully drains the microtask queue — including any microtasks scheduled while draining — before it will pull even one macrotask. This is why `Promise.resolve().then(...)` logs before a `setTimeout(fn, 0)` scheduled earlier in the same script.

*Source: [06-Event-Loop-and-Concurrency.md#2-whats-the-concrete-difference-between-a-microtask-and-a-macrotask-and-which-runs-first](06-Event-Loop-and-Concurrency.md#2-whats-the-concrete-difference-between-a-microtask-and-a-macrotask-and-which-runs-first)*

### 3. Predict the output: a script logs synchronously, schedules a `setTimeout(fn, 0)`, then a `Promise.resolve().then(fn)` that itself chains another `.then`, then logs synchronously again.

**Answer:** Both synchronous logs print first, in order, since the call stack always finishes before any queue is checked. Then the microtask queue drains fully — the first `.then` runs, and since it schedules a second `.then` while draining, that one also finishes before the engine moves on. Only after the microtask queue is completely empty does the `setTimeout` callback finally run.

*Source: [06-Event-Loop-and-Concurrency.md#3-predict-the-output-a-script-logs-synchronously-schedules-a-settimeoutfn-0-then-a-promiseresolvethenfn-that-itself-chains-another-then-then-logs-synchronously-again](06-Event-Loop-and-Concurrency.md#3-predict-the-output-a-script-logs-synchronously-schedules-a-settimeoutfn-0-then-a-promiseresolvethenfn-that-itself-chains-another-then-then-logs-synchronously-again)*

### 4. Why does processing a large array synchronously (e.g., sorting 200,000 rows on a button click) freeze the entire tab, including a spinner you just rendered?

**Answer:** The call stack must be empty before the event loop will let the browser paint or process the next task — that's a hard ordering rule, not a performance heuristic. A long synchronous function keeps the stack occupied the whole time it runs, so a `showSpinner()` DOM mutation made just before it never actually gets painted, and clicks/scrolls queue up invisibly until the function returns.

*Source: [06-Event-Loop-and-Concurrency.md#4-why-does-processing-a-large-array-synchronously-eg-sorting-200000-rows-on-a-button-click-freeze-the-entire-tab-including-a-spinner-you-just-rendered](06-Event-Loop-and-Concurrency.md#4-why-does-processing-a-large-array-synchronously-eg-sorting-200000-rows-on-a-button-click-freeze-the-entire-tab-including-a-spinner-you-just-rendered)*

### 5. How would you fix a UI freeze caused by a large synchronous computation, and what are the trade-offs between the options?

**Answer:** Break the work into chunks and yield between them with `setTimeout(fn, 0)` or `requestIdleCallback`, which forces the call stack to empty periodically so the browser can paint and handle input — simple, but adds overhead and complexity for manual chunking. The better fix for real CPU-bound work is a Web Worker, which runs on an actual separate OS thread so the main thread is never blocked at all; the trade-off is that workers can't directly touch the DOM and require message-passing to get data back.

*Source: [06-Event-Loop-and-Concurrency.md#5-how-would-you-fix-a-ui-freeze-caused-by-a-large-synchronous-computation-and-what-are-the-trade-offs-between-the-options](06-Event-Loop-and-Concurrency.md#5-how-would-you-fix-a-ui-freeze-caused-by-a-large-synchronous-computation-and-what-are-the-trade-offs-between-the-options)*

### 6. What happens if a promise chain keeps rescheduling itself recursively (e.g., a retry loop with no backoff that always chains `.then`)?

**Answer:** It starves the event loop: the microtask queue must be fully drained before the loop can paint or run the next macrotask, so a microtask that keeps re-adding itself never lets that queue reach zero. The result is a frozen tab with no visible long-running function in a naive read of the call stack — a profiler shows thousands of tiny microtask executions back to back instead of one obvious infinite loop.

*Source: [06-Event-Loop-and-Concurrency.md#6-what-happens-if-a-promise-chain-keeps-rescheduling-itself-recursively-eg-a-retry-loop-with-no-backoff-that-always-chains-then](06-Event-Loop-and-Concurrency.md#6-what-happens-if-a-promise-chain-keeps-rescheduling-itself-recursively-eg-a-retry-loop-with-no-backoff-that-always-chains-then)*

### 7. Does `setTimeout(fn, 0)` run "immediately"? Why is it still useful in the chunking pattern?

**Answer:** No — it still has to wait for the current call stack to finish and for the entire microtask queue to drain, and it's only guaranteed a minimum delay (commonly clamped to ~4ms after nesting), not zero. Its value in a chunking pattern isn't speed — it's that scheduling it forces the current function to return, which empties the call stack and lets the browser paint and handle pending input before the next chunk of work starts.

*Source: [06-Event-Loop-and-Concurrency.md#7-does-settimeoutfn-0-run-immediately-why-is-it-still-useful-in-the-chunking-pattern](06-Event-Loop-and-Concurrency.md#7-does-settimeoutfn-0-run-immediately-why-is-it-still-useful-in-the-chunking-pattern)*

### 8. Why does `useLayoutEffect` need to exist separately from `useEffect` — isn't "after render" the same either way?

**Answer:** No — `useLayoutEffect` runs synchronously right after the DOM commit but before the browser paints, in the same call-stack turn, so it can measure or adjust layout with zero visible flicker. `useEffect` is deliberately deferred to run after paint (scheduled roughly like a macrotask), so if you used it to adjust layout, the user would briefly see one frame of the unadjusted state before the effect corrects it.

*Source: [06-Event-Loop-and-Concurrency.md#8-why-does-uselayouteffect-need-to-exist-separately-from-useeffect-—-isnt-after-render-the-same-either-way](06-Event-Loop-and-Concurrency.md#8-why-does-uselayouteffect-need-to-exist-separately-from-useeffect-—-isnt-after-render-the-same-either-way)*

### 9. Why is it a performance mistake to do expensive work like a network call inside `useLayoutEffect`?

**Answer:** Because `useLayoutEffect` runs before the browser is allowed to paint, so any slow synchronous work inside it blocks the very next frame the user would see — mechanically the same problem as a long synchronous loop in Section 6. `useEffect` exists precisely so that category of work (fetches, subscriptions, logging) doesn't hold up paint, since it's scheduled to run only after the browser has already painted.

*Source: [06-Event-Loop-and-Concurrency.md#9-why-is-it-a-performance-mistake-to-do-expensive-work-like-a-network-call-inside-uselayouteffect](06-Event-Loop-and-Concurrency.md#9-why-is-it-a-performance-mistake-to-do-expensive-work-like-a-network-call-inside-uselayouteffect)*

### 10. What's the scope chain, and why does it matter beyond just "closures work somehow"?

**Answer:** Every execution context keeps a reference to its outer scope, and looking up a variable that isn't local walks that chain outward — current function, enclosing function(s), then global — until it's found or a `ReferenceError` is thrown. It matters practically because a deeply nested callback structure has to walk further per lookup (a minor but real cost), and because it's the exact mechanism that explains why an inner function can still read a variable from an outer function after the outer one has already returned.

*Source: [06-Event-Loop-and-Concurrency.md#10-whats-the-scope-chain-and-why-does-it-matter-beyond-just-closures-work-somehow](06-Event-Loop-and-Concurrency.md#10-whats-the-scope-chain-and-why-does-it-matter-beyond-just-closures-work-somehow)*

## [7. Promises & Async/Await](07-Promises-Async-Await.md)

### 1. Why can a promise only settle once, and why does that matter in practice?

**Answer:** A promise starts pending and transitions to fulfilled or rejected exactly once; any further calls to `resolve`/`reject` are silently ignored. This matters because it makes promises safe to share — multiple consumers can `.then()` off the same in-flight promise and each is guaranteed to see one consistent outcome, even if the underlying operation's completion callback fires more than once (e.g. a flaky webhook retry).

*Source: [07-Promises-Async-Await.md#1-why-can-a-promise-only-settle-once-and-why-does-that-matter-in-practice](07-Promises-Async-Await.md#1-why-can-a-promise-only-settle-once-and-why-does-that-matter-in-practice)*

### 2. How does promise chaining solve callback hell, mechanically?

**Answer:** Every `.then()` call returns a brand-new promise, and if the handler passed to `.then()` returns another promise, the chain automatically waits on it and flattens the result instead of nesting a new callback inside the previous one. That turns N levels of nested, individually-error-handled callbacks into a flat sequence of `.then()` calls with one `.catch()` at the end.

*Source: [07-Promises-Async-Await.md#2-how-does-promise-chaining-solve-callback-hell-mechanically](07-Promises-Async-Await.md#2-how-does-promise-chaining-solve-callback-hell-mechanically)*

### 3. Is `async`/`await` faster than `.then()` chains?

**Answer:** No — they run identically under the hood, since `async`/`await` is syntactic sugar over the exact same promise machinery and microtask scheduling. The benefit is purely readability and control flow: ordinary `try/catch`, loops, and conditionals work around `await`ed calls the same way they do around synchronous code, which `.then()` chains can't offer as naturally.

*Source: [07-Promises-Async-Await.md#3-is-asyncawait-faster-than-then-chains](07-Promises-Async-Await.md#3-is-asyncawait-faster-than-then-chains)*

### 4. What's the difference between catching an error with `try/catch` around `await` versus `.catch()` on the promise chain?

**Answer:** They're equivalent in effect for the awaits inside that specific `try` block — a `try/catch` around one or more `await`s behaves like a `.catch()` attached to the chain up to that point. The trap is `.catch()` placed in the middle of a chain: unless it re-throws, it converts the rejection back into a fulfillment for everything downstream, which is useful for fallback logic (e.g. serving cached data) but a real bug if you meant it to be the final error handler.

*Source: [07-Promises-Async-Await.md#4-whats-the-difference-between-catching-an-error-with-trycatch-around-await-versus-catch-on-the-promise-chain](07-Promises-Async-Await.md#4-whats-the-difference-between-catching-an-error-with-trycatch-around-await-versus-catch-on-the-promise-chain)*

### 5. When would you use `Promise.all()` versus `Promise.allSettled()`?

**Answer:** Use `Promise.all()` when every result is required and a single failure should abort the whole operation — e.g. a profile page needing both the user and their orders, where showing one without knowing the other's status is worse than a clean error. Use `Promise.allSettled()` when the operations are independent and partial success is still useful, like dashboard widgets that should each render or fail on their own without blanking the whole page.

*Source: [07-Promises-Async-Await.md#5-when-would-you-use-promiseall-versus-promiseallsettled](07-Promises-Async-Await.md#5-when-would-you-use-promiseall-versus-promiseallsettled)*

### 6. What's the actual difference between `Promise.race()` and `Promise.any()`?

**Answer:** `Promise.race()` settles on whatever finishes first, success or failure — so a fast-failing request can "win" with a rejection. `Promise.any()` specifically waits for the first *fulfillment* and only rejects (with an `AggregateError`) if every input promise rejects, which is the correct behavior for redundant fallback sources like regional API replicas where you want the first success, not just the first response.

*Source: [07-Promises-Async-Await.md#6-whats-the-actual-difference-between-promiserace-and-promiseany](07-Promises-Async-Await.md#6-whats-the-actual-difference-between-promiserace-and-promiseany)*

### 7. What's wrong with `await`ing inside a `for` loop over independent requests, and how do you fix it?

**Answer:** Each `await` pauses the loop until that iteration's request finishes before the next one even starts, serializing requests that don't depend on each other and multiplying total latency by the number of items. The fix is to start every request first (e.g. via `.map()` to build an array of in-flight promises) and then await them together with `Promise.all()`, so the total time is roughly the slowest single request, not the sum of all of them.

*Source: [07-Promises-Async-Await.md#7-whats-wrong-with-awaiting-inside-a-for-loop-over-independent-requests-and-how-do-you-fix-it](07-Promises-Async-Await.md#7-whats-wrong-with-awaiting-inside-a-for-loop-over-independent-requests-and-how-do-you-fix-it)*

### 8. If you forget to `await` or `.catch()` a promise-returning call, what actually happens?

**Answer:** The call still runs, but its result and any rejection are disconnected from the caller — if it rejects, that becomes an unhandled promise rejection, which logs a warning (or triggers an `unhandledrejection` event) in browsers and can crash the process by default in modern Node. This is a real "fire and forget" bug, not just a style issue, especially for calls with side effects the caller assumes completed successfully.

*Source: [07-Promises-Async-Await.md#8-if-you-forget-to-await-or-catch-a-promise-returning-call-what-actually-happens](07-Promises-Async-Await.md#8-if-you-forget-to-await-or-catch-a-promise-returning-call-what-actually-happens)*

### 9. Does `Promise.all()` cancel the other requests once one of them rejects?

**Answer:** No. `Promise.all()` itself immediately rejects and stops waiting once any input rejects, but the other promises keep running to completion in the background — nothing about `Promise.all()` cancels them. If the underlying work needs to actually stop (e.g. an in-flight `fetch`), that requires wiring in something like `AbortController` separately.

*Source: [07-Promises-Async-Await.md#9-does-promiseall-cancel-the-other-requests-once-one-of-them-rejects](07-Promises-Async-Await.md#9-does-promiseall-cancel-the-other-requests-once-one-of-them-rejects)*

## [8. Debounce, Throttle, and Error Handling](08-Debounce-Throttle-and-Error-Handling.md)

### 1. What's the concrete difference between debounce and throttle, and how do you pick between them?

**Answer:** Debounce delays execution until calls stop arriving for `delay` ms, resetting the timer on every new call — it only cares about the final state after a burst, like a search box firing one request after the user pauses typing. Throttle guarantees execution happens at most once every `delay` ms regardless of how many calls arrive, which fits continuous streams like `scroll` or `mousemove` where you need periodic updates throughout the activity, not just at the end.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#1-whats-the-concrete-difference-between-debounce-and-throttle-and-how-do-you-pick-between-them](08-Debounce-Throttle-and-Error-Handling.md#1-whats-the-concrete-difference-between-debounce-and-throttle-and-how-do-you-pick-between-them)*

### 2. In your throttle implementation, why is a trailing-edge call necessary in addition to the leading-edge call?

**Answer:** A leading-edge-only throttle fires on the first event of a burst and then ignores everything until the window elapses, which means if activity stops mid-window, the very last event's data never gets processed. Scheduling a trailing timeout captures that final call so the UI reflects the true end state (e.g. the final scroll position), rather than freezing on stale data from the last leading-edge call.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#2-in-your-throttle-implementation-why-is-a-trailing-edge-call-necessary-in-addition-to-the-leading-edge-call](08-Debounce-Throttle-and-Error-Handling.md#2-in-your-throttle-implementation-why-is-a-trailing-edge-call-necessary-in-addition-to-the-leading-edge-call)*

### 3. Does `finally` run if the `try` block contains a `return` statement, and what's the one case where `finally` can silently override the outcome?

**Answer:** Yes — the return value is computed, `finally` executes, and only then does control leave the function. The overriding case is if `finally` itself contains a `return` or `throw`: that silently replaces whatever the `try`/`catch` was about to produce, which is why returning from `finally` is considered a footgun and generally avoided.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#3-does-finally-run-if-the-try-block-contains-a-return-statement-and-whats-the-one-case-where-finally-can-silently-override-the-outcome](08-Debounce-Throttle-and-Error-Handling.md#3-does-finally-run-if-the-try-block-contains-a-return-statement-and-whats-the-one-case-where-finally-can-silently-override-the-outcome)*

### 4. Why does wrapping an `await`ed call in `try/catch` work, but wrapping a `.then()`-chained call in the same `try/catch` doesn't catch anything?

**Answer:** `await` suspends the function and, when the awaited promise rejects, re-throws that rejection synchronously at the `await` line — so it behaves exactly like a normal thrown exception and a surrounding `try/catch` catches it. A `.then()` call, by contrast, schedules its callback for a future microtask; the `try` block has already finished executing by the time that rejection would occur, so there's nothing there left to catch it.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#4-why-does-wrapping-an-awaited-call-in-trycatch-work-but-wrapping-a-then-chained-call-in-the-same-trycatch-doesnt-catch-anything](08-Debounce-Throttle-and-Error-Handling.md#4-why-does-wrapping-an-awaited-call-in-trycatch-work-but-wrapping-a-then-chained-call-in-the-same-trycatch-doesnt-catch-anything)*

### 5. Why build a custom `Error` subclass hierarchy for a fetch wrapper instead of throwing plain `Error` with different messages?

**Answer:** Typed errors (`ValidationError`, `NetworkError`, `HttpError`, `UnauthorizedError`) let calling code branch with `instanceof` and respond correctly — redirect to login on `UnauthorizedError`, show field-level messages on `ValidationError`, show a generic retry toast on `NetworkError` — instead of fragile string-matching on `error.message`. It also lets each subtype carry structured data relevant to that failure mode, like an HTTP `status` or a `fieldErrors` map, which a flat `Error` has no natural place to hold.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#5-why-build-a-custom-error-subclass-hierarchy-for-a-fetch-wrapper-instead-of-throwing-plain-error-with-different-messages](08-Debounce-Throttle-and-Error-Handling.md#5-why-build-a-custom-error-subclass-hierarchy-for-a-fetch-wrapper-instead-of-throwing-plain-error-with-different-messages)*

### 6. What's the practical difference between `fetch()` rejecting and `fetch()` resolving with a non-2xx status?

**Answer:** `fetch()`'s returned promise only rejects for network-level failures — the request never completed at all, due to being offline, a DNS failure, or a CORS block. A 404 or 500 response is still a *successful* HTTP round trip as far as `fetch()` is concerned, so it resolves normally with `response.ok === false`; you have to check `response.ok` (or `response.status`) yourself and throw your own error if you want a bad status code to be treated as a failure.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#6-whats-the-practical-difference-between-fetch-rejecting-and-fetch-resolving-with-a-non-2xx-status](08-Debounce-Throttle-and-Error-Handling.md#6-whats-the-practical-difference-between-fetch-rejecting-and-fetch-resolving-with-a-non-2xx-status)*

### 7. What is an unhandled promise rejection, and what should a production app do about it?

**Answer:** It's a promise that rejected without any `.catch()` handler or an `await` inside a `try/catch` ever being attached to it — in the browser this fires a `window.unhandledrejection` event, and in Node it fires `process.on('unhandledRejection', ...)` (and can terminate the process depending on Node's configured behavior). A production app should attach a global listener as a last-resort safety net that logs the failure to monitoring, but it should not be the primary error-handling strategy, since by the time an error reaches that handler you've lost the specific context needed to recover or show a useful message to the user.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#7-what-is-an-unhandled-promise-rejection-and-what-should-a-production-app-do-about-it](08-Debounce-Throttle-and-Error-Handling.md#7-what-is-an-unhandled-promise-rejection-and-what-should-a-production-app-do-about-it)*

### 8. Why does `error.cause` (or manually attaching the original error) matter when wrapping errors in a fetch wrapper?

**Answer:** Without it, catching a low-level network failure and throwing a new `NetworkError` loses the original stack trace and underlying reason (e.g. "Failed to fetch" vs. a specific DNS error), leaving whoever debugs the log with only the wrapper's generic message. Passing it as `super(message, { cause })` (ES2022) preserves the full original error object on `.cause`, the same reasoning behind exception chaining with `super(message, cause)` in Java.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#8-why-does-errorcause-or-manually-attaching-the-original-error-matter-when-wrapping-errors-in-a-fetch-wrapper](08-Debounce-Throttle-and-Error-Handling.md#8-why-does-errorcause-or-manually-attaching-the-original-error-matter-when-wrapping-errors-in-a-fetch-wrapper)*

### 9. What's a real bug that `var` vs closures aside — leading-edge-only throttling — causes in a scroll handler, and how do you fix it?

**Answer:** If the throttle only fires on the leading edge, the layout recalculation runs at the start of each throttle window but the true final scroll position (reached after the user stops scrolling) never triggers a recalculation, leaving a sticky header or progress bar visually stuck one step behind. Adding a trailing-edge `setTimeout` that fires once more after the window closes — using the most recent arguments seen — fixes this by guaranteeing the last event is always eventually processed.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#9-whats-a-real-bug-that-var-vs-closures-aside-—-leading-edge-only-throttling-—-causes-in-a-scroll-handler-and-how-do-you-fix-it](08-Debounce-Throttle-and-Error-Handling.md#9-whats-a-real-bug-that-var-vs-closures-aside-—-leading-edge-only-throttling-—-causes-in-a-scroll-handler-and-how-do-you-fix-it)*

## [9. Memory Management, Garbage Collection, and WeakMap/WeakSet](09-Memory-Management-GC-WeakMap.md)

### 1. What algorithm do JS engines use for garbage collection, and how does it decide what to free?

**Answer:** Mark-and-sweep. Starting from a set of roots (globals, the active call stack), the collector marks every object reachable by following references, then sweeps — frees — everything left unmarked. It's reachability from roots that matters, not whether a variable "went out of scope" or whether objects reference each other in a cycle.

*Source: [09-Memory-Management-GC-WeakMap.md#1-what-algorithm-do-js-engines-use-for-garbage-collection-and-how-does-it-decide-what-to-free](09-Memory-Management-GC-WeakMap.md#1-what-algorithm-do-js-engines-use-for-garbage-collection-and-how-does-it-decide-what-to-free)*

### 2. Can two objects that reference each other ever be garbage collected?

**Answer:** Yes — mark-and-sweep collects unreachable cycles just fine, unlike older reference-counting collectors (e.g. IE6's DOM/COM leak). If neither object in a two-way reference cycle is reachable from any root, both get swept in the same pass, because reachability is computed from the roots inward, not by counting inbound pointers on each object.

*Source: [09-Memory-Management-GC-WeakMap.md#2-can-two-objects-that-reference-each-other-ever-be-garbage-collected](09-Memory-Management-GC-WeakMap.md#2-can-two-objects-that-reference-each-other-ever-be-garbage-collected)*

### 3. What is a detached DOM node, and why does it leak memory?

**Answer:** It's an element removed from the visible document tree (via `.remove()`, `removeChild`, or replacing `innerHTML`) that some JS variable, closure, or cache still references. Because that reference is still reachable from a root, the GC can't sweep the node or, critically, the rest of the subtree still attached under it — you have to explicitly null out every reference into a removed subtree, not just remove it from the document.

*Source: [09-Memory-Management-GC-WeakMap.md#3-what-is-a-detached-dom-node-and-why-does-it-leak-memory](09-Memory-Management-GC-WeakMap.md#3-what-is-a-detached-dom-node-and-why-does-it-leak-memory)*

### 4. Why do forgotten `setInterval` calls or `addEventListener` calls on unmounted React components cause leaks?

**Answer:** `window`, `document`, and the browser's internal timer queue are effectively GC roots — anything they hold a live reference to stays reachable forever. An interval callback or a `resize` listener registered in a `useEffect` without a matching `clearInterval`/`removeEventListener` in the cleanup function keeps its whole closure (and the state/props it captured) alive after the component unmounts, which is why every unmounted-but-still-firing ticker or listener is memory that never comes back.

*Source: [09-Memory-Management-GC-WeakMap.md#4-why-do-forgotten-setinterval-calls-or-addeventlistener-calls-on-unmounted-react-components-cause-leaks](09-Memory-Management-GC-WeakMap.md#4-why-do-forgotten-setinterval-calls-or-addeventlistener-calls-on-unmounted-react-components-cause-leaks)*

### 5. How does a closure leak memory even if the leaked object is never used inside the closure?

**Answer:** A closure captures its entire enclosing scope, not just the variables it references — so if a large object (like a raw API payload) is declared in the same function as a callback that's kept alive long-term (e.g. attached to a persistent button's `onclick`), that object stays reachable through the scope chain for as long as the callback exists. The fix is moving the long-lived callback into a smaller, separate function scope that only receives the small value it actually needs.

*Source: [09-Memory-Management-GC-WeakMap.md#5-how-does-a-closure-leak-memory-even-if-the-leaked-object-is-never-used-inside-the-closure](09-Memory-Management-GC-WeakMap.md#5-how-does-a-closure-leak-memory-even-if-the-leaked-object-is-never-used-inside-the-closure)*

### 6. What makes a `WeakMap` different from a `Map`, mechanically?

**Answer:** A `Map` holds strong references to its keys and values, so anything stored in it is reachable — and therefore never collected — for as long as the `Map` itself exists, even after every other reference to that key is gone. A `WeakMap` holds weak references to its keys: a weak reference doesn't count during the mark phase, so once a key object has no other reachable references, GC collects it and its `WeakMap` entry disappears automatically, with no `.delete()` call required.

*Source: [09-Memory-Management-GC-WeakMap.md#6-what-makes-a-weakmap-different-from-a-map-mechanically](09-Memory-Management-GC-WeakMap.md#6-what-makes-a-weakmap-different-from-a-map-mechanically)*

### 7. Why can't you use a string or number as a `WeakMap` key?

**Answer:** Primitives aren't garbage-collected the way objects are — there's no single heap allocation for the number `5` that could become "unreachable" and get swept, since JS engines can represent and duplicate primitive values freely. `WeakMap`'s entire mechanism depends on the key being an object whose reachability the GC can actually track, so the spec requires object (or symbol, from ES2023) keys.

*Source: [09-Memory-Management-GC-WeakMap.md#7-why-cant-you-use-a-string-or-number-as-a-weakmap-key](09-Memory-Management-GC-WeakMap.md#7-why-cant-you-use-a-string-or-number-as-a-weakmap-key)*

### 8. Give a real, non-toy use case for `WeakMap` and explain why a regular `Map` would be wrong there.

**Answer:** Caching per-DOM-node computed data — e.g. a virtualized list caching each row element's measured height keyed by the row element itself. Rows are created and destroyed constantly as the user scrolls; with a `Map`, every removed row's cache entry would need an explicit `.delete()` call at every single removal code path, and missing even one leaks that DOM node forever — a `WeakMap` releases the entry automatically the moment the row element itself is no longer referenced.

*Source: [09-Memory-Management-GC-WeakMap.md#8-give-a-real-non-toy-use-case-for-weakmap-and-explain-why-a-regular-map-would-be-wrong-there](09-Memory-Management-GC-WeakMap.md#8-give-a-real-non-toy-use-case-for-weakmap-and-explain-why-a-regular-map-would-be-wrong-there)*

### 9. Why are `WeakMap` and `WeakSet` not iterable and have no `.size`?

**Answer:** Because exactly which entries exist at any given moment depends on when the garbage collector last ran, and GC timing is intentionally unobservable and implementation-defined in the spec. If you could call `.size` or iterate, that count would be unpredictable and non-deterministic across engines and runs, so the spec simply doesn't expose iteration or count on weak collections.

*Source: [09-Memory-Management-GC-WeakMap.md#9-why-are-weakmap-and-weakset-not-iterable-and-have-no-size](09-Memory-Management-GC-WeakMap.md#9-why-are-weakmap-and-weakset-not-iterable-and-have-no-size)*

### 10. You suspect a React SPA leaks memory on every route navigation. Walk through how you'd confirm and locate it in Chrome DevTools.

**Answer:** Take a baseline heap snapshot after the app settles, navigate into and out of the suspect route several times, force a manual GC with the trash-can icon, then take a second snapshot and use the Comparison view — a `Delta` count on some object type that keeps growing proportional to the number of navigation cycles (not a one-time bump) is the leak signature. Filter for "Detached" to catch leaked DOM subtrees specifically, then expand the "Retainers" panel on one to see the exact reference chain — closure, stale cache, or forgotten listener — keeping it alive, which tells you exactly what to null out or unsubscribe.

*Source: [09-Memory-Management-GC-WeakMap.md#10-you-suspect-a-react-spa-leaks-memory-on-every-route-navigation-walk-through-how-youd-confirm-and-locate-it-in-chrome-devtools](09-Memory-Management-GC-WeakMap.md#10-you-suspect-a-react-spa-leaks-memory-on-every-route-navigation-walk-through-how-youd-confirm-and-locate-it-in-chrome-devtools)*

## [10. Browser APIs: Fetch, Storage, and Web Workers](10-Browser-APIs-Fetch-Storage-Workers.md)

### 1. Why doesn't a `fetch()` promise reject on a `404` or `500` response?

**Answer:** `fetch()` only rejects on a genuine network-level failure — DNS resolution failure, a dropped connection, or a CORS block — because from the browser's perspective the HTTP request-response cycle *completed successfully*; the server just returned an error status. You have to check `response.ok` (or `response.status`) explicitly, otherwise a `try/catch` around `fetch()` silently lets `4xx`/`5xx` responses flow into your success path.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#1-why-doesnt-a-fetch-promise-reject-on-a-404-or-500-response](10-Browser-APIs-Fetch-Storage-Workers.md#1-why-doesnt-a-fetch-promise-reject-on-a-404-or-500-response)*

### 2. Walk through how `AbortController` prevents a stale search result from overwriting a fresh one.

**Answer:** Each keystroke creates a new `AbortController`, and before doing so, the handler calls `.abort()` on whatever controller is still active from the previous keystroke. That makes the in-flight fetch for the old query reject with an `AbortError`, which the `catch` block recognizes and silently ignores, so only the response for the most recent query ever reaches `renderResults`. Without it, a slower earlier request can resolve after a faster later one and clobber the correct results on screen.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#2-walk-through-how-abortcontroller-prevents-a-stale-search-result-from-overwriting-a-fresh-one](10-Browser-APIs-Fetch-Storage-Workers.md#2-walk-through-how-abortcontroller-prevents-a-stale-search-result-from-overwriting-a-fresh-one)*

### 3. How do you decide between `localStorage`, `sessionStorage`, and a cookie for a given piece of data?

**Answer:** If the server needs the value automatically on every request, it has to be a cookie — that's the only one of the three the browser attaches to outgoing requests. If it's UI-only state that should survive closing the browser, use `localStorage` (a theme preference); if it's UI-only state that should be scoped to one tab and disposable (an in-progress checkout form), use `sessionStorage`. Cookies are also the only one that supports `HttpOnly`, which matters for anything security-sensitive like a session token.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#3-how-do-you-decide-between-localstorage-sessionstorage-and-a-cookie-for-a-given-piece-of-data](10-Browser-APIs-Fetch-Storage-Workers.md#3-how-do-you-decide-between-localstorage-sessionstorage-and-a-cookie-for-a-given-piece-of-data)*

### 4. Why is IndexedDB asynchronous while `localStorage` is synchronous, and why does that distinction matter?

**Answer:** `localStorage` reads/writes block the main thread, which is tolerable because it only ever holds small strings; IndexedDB is designed for large structured datasets (potentially gigabytes), so a synchronous API would freeze the page during any real query. Because IndexedDB is async and transactional, you can safely store and query large offline datasets — like a full local cache of records for a PWA — without janking scrolling or input while a query runs.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#4-why-is-indexeddb-asynchronous-while-localstorage-is-synchronous-and-why-does-that-distinction-matter](10-Browser-APIs-Fetch-Storage-Workers.md#4-why-is-indexeddb-asynchronous-while-localstorage-is-synchronous-and-why-does-that-distinction-matter)*

### 5. What can a Web Worker not do, and why is that restriction there?

**Answer:** A Web Worker has no access to the DOM, `window`, `document`, or `localStorage`/`sessionStorage`, and no access to the main thread's variables except what's explicitly passed via `postMessage`. The DOM restriction exists because the DOM isn't thread-safe — allowing a second thread to mutate it would reintroduce the exact race conditions single-threaded JS was designed to avoid.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#5-what-can-a-web-worker-not-do-and-why-is-that-restriction-there](10-Browser-APIs-Fetch-Storage-Workers.md#5-what-can-a-web-worker-not-do-and-why-is-that-restriction-there)*

### 6. What actually travels across `postMessage`, and how does a `Transferable` differ from a normal message?

**Answer:** A normal message is deep-copied via the structured clone algorithm — the receiving side gets an independent copy, so mutating it never affects the sender's original object. A `Transferable` (like an `ArrayBuffer`) instead hands ownership of the underlying memory to the other side with zero copying, which is why it's used for large binary payloads where copying would be expensive; the sending side loses access to it once transferred.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#6-what-actually-travels-across-postmessage-and-how-does-a-transferable-differ-from-a-normal-message](10-Browser-APIs-Fetch-Storage-Workers.md#6-what-actually-travels-across-postmessage-and-how-does-a-transferable-differ-from-a-normal-message)*

### 7. When would you reach for a Web Worker instead of just making something `async`?

**Answer:** `async`/`await` and Promises solve *I/O-bound* waiting — the main thread is free while a network request or timer is pending, because no CPU work is actually happening during the wait. A Web Worker solves *CPU-bound* work — a genuinely expensive synchronous computation, like parsing a huge CSV or running encryption, that would otherwise occupy the main thread's single execution context and freeze the UI regardless of how it's wrapped in a Promise.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#7-when-would-you-reach-for-a-web-worker-instead-of-just-making-something-async](10-Browser-APIs-Fetch-Storage-Workers.md#7-when-would-you-reach-for-a-web-worker-instead-of-just-making-something-async)*

### 8. What's the difference between a Web Worker and a Service Worker?

**Answer:** A Web Worker is a general-purpose background thread for offloading CPU-heavy computation, and it exists only as long as the page that created it is open. A Service Worker is a specialized worker that sits as a network proxy between the page, the network, and the cache — it can intercept `fetch` requests, serve cached responses offline, and keep running in the background even after the tab is closed, which is what powers PWA offline mode and push notifications; it isn't meant for arbitrary heavy computation.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#8-whats-the-difference-between-a-web-worker-and-a-service-worker](10-Browser-APIs-Fetch-Storage-Workers.md#8-whats-the-difference-between-a-web-worker-and-a-service-worker)*

### 9. If `HttpOnly` blocks JavaScript from ever reading a cookie, what's the actual security benefit?

**Answer:** It specifically defends against XSS: if an attacker manages to inject a malicious script into your page, that script runs with full JS privileges but still cannot read `document.cookie` for an `HttpOnly` cookie, so it can't exfiltrate the session token even though it can run arbitrary code. It's not a defense against every attack (CSRF still needs `SameSite`), but it closes off the most common path to session hijacking via injected scripts.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#9-if-httponly-blocks-javascript-from-ever-reading-a-cookie-whats-the-actual-security-benefit](10-Browser-APIs-Fetch-Storage-Workers.md#9-if-httponly-blocks-javascript-from-ever-reading-a-cookie-whats-the-actual-security-benefit)*

## [11. Networking: HTTP, Cookies, Caching, and CORS](11-Networking-HTTP-Cookies-Caching-CORS.md)

### 1. What does CORS actually block?

**Answer:** CORS never stops the request from reaching the server; the server still processes it and any side effects (writes, emails, charges) still happen. What CORS blocks is the browser handing the response back to your JavaScript when the server didn't grant that origin permission. This is why a "CORS error" on a `POST` can still mean the resource was created — you have to check the server, not assume nothing happened.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#1-what-does-cors-actually-block](11-Networking-HTTP-Cookies-Caching-CORS.md#1-what-does-cors-actually-block)*

### 2. When does the browser send a CORS preflight, and what is in it?

**Answer:** The browser preflights any request that isn't a "simple request" — most commonly a JSON `POST` (`Content-Type: application/json`) or any request with a custom header like `Authorization`. It sends an `OPTIONS` request with `Origin`, `Access-Control-Request-Method`, and `Access-Control-Request-Headers`, and only fires the real request if the server's response includes matching `Access-Control-Allow-*` headers.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#2-when-does-the-browser-send-a-cors-preflight-and-what-is-in-it](11-Networking-HTTP-Cookies-Caching-CORS.md#2-when-does-the-browser-send-a-cors-preflight-and-what-is-in-it)*

### 3. Why doesn't `Access-Control-Allow-Origin: *` work with cookies?

**Answer:** Browsers require an exact origin in `Access-Control-Allow-Origin` plus `Access-Control-Allow-Credentials: true` whenever the request carries credentials (cookies or HTTP auth), and refuse the wildcard in that case. Allowing a wildcard with credentials would let any website read cookie-authenticated data from your API on a logged-in user's behalf, which is the exact cross-site data leak the Same-Origin Policy exists to prevent.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#3-why-doesnt-access-control-allow-origin-work-with-cookies](11-Networking-HTTP-Cookies-Caching-CORS.md#3-why-doesnt-access-control-allow-origin-work-with-cookies)*

### 4. What is the difference between the Same-Origin Policy and CORS?

**Answer:** The Same-Origin Policy is the browser's default restriction that JavaScript on one origin cannot read responses from another origin. CORS is the opt-in mechanism a server uses to relax that restriction for specific origins, methods, and headers by sending `Access-Control-Allow-*` response headers. SOP is the lock; CORS headers are the key a server can hand out.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#4-what-is-the-difference-between-the-same-origin-policy-and-cors](11-Networking-HTTP-Cookies-Caching-CORS.md#4-what-is-the-difference-between-the-same-origin-policy-and-cors)*

### 5. `HttpOnly` vs `Secure` vs `SameSite` on a cookie — what does each one actually stop?

**Answer:** `HttpOnly` stops JavaScript from reading the cookie via `document.cookie`, which blocks a successful XSS payload from stealing the session token. `Secure` stops the cookie from ever being sent over plain HTTP, which blocks network eavesdropping. `SameSite=Lax` or `Strict` stops the cookie from being attached to cross-site requests, which blocks CSRF attacks like an attacker's page silently submitting a form to your authenticated API.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#5-httponly-vs-secure-vs-samesite-on-a-cookie-—-what-does-each-one-actually-stop](11-Networking-HTTP-Cookies-Caching-CORS.md#5-httponly-vs-secure-vs-samesite-on-a-cookie-—-what-does-each-one-actually-stop)*

### 6. What's the difference between `Cache-Control: no-cache` and `no-store`?

**Answer:** `no-cache` allows the response to be stored, but forces revalidation with the server (via `ETag`/`Last-Modified`) before it can be reused, so a match still returns a fast `304`. `no-store` forbids caching the response anywhere at all, which is what you'd set on a page showing a bank balance or a one-time payment token.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#6-whats-the-difference-between-cache-control-no-cache-and-no-store](11-Networking-HTTP-Cookies-Caching-CORS.md#6-whats-the-difference-between-cache-control-no-cache-and-no-store)*

### 7. How would you set caching headers for a React production deployment?

**Answer:** Give hashed static assets (`main.4b2c8e9f.js`) `Cache-Control: public, max-age=31536000, immutable`, since the filename itself changes whenever the content does, so caching forever is safe. Give `index.html` `Cache-Control: no-cache, must-revalidate`, since it references the current hashed filenames and must be re-checked with the server on every load, otherwise users can get stuck on a stale deploy indefinitely.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#7-how-would-you-set-caching-headers-for-a-react-production-deployment](11-Networking-HTTP-Cookies-Caching-CORS.md#7-how-would-you-set-caching-headers-for-a-react-production-deployment)*

### 8. 401 vs 403 — how should a frontend app react differently to each?

**Answer:** `401` means the request has no valid credentials, so the app should try a token refresh and, failing that, redirect to login. `403` means the credentials are valid but the user isn't allowed to do this, so the app should show a permission-denied state, not send the user back through login, since logging in again won't fix a permissions problem.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#8-401-vs-403-—-how-should-a-frontend-app-react-differently-to-each](11-Networking-HTTP-Cookies-Caching-CORS.md#8-401-vs-403-—-how-should-a-frontend-app-react-differently-to-each)*

### 9. Why is `PUT` idempotent but `POST` is not, and why does that matter for retries?

**Answer:** `PUT` replaces a resource at a known URI, so sending it twice with the same body leaves the resource in the same state either way. `POST` typically creates a new resource each time it's called, so blindly retrying a failed `POST` (say, after a timeout where you don't know if it succeeded) can create a duplicate order or charge — which is why retry logic for `POST` needs an idempotency key rather than a naive resend.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#9-why-is-put-idempotent-but-post-is-not-and-why-does-that-matter-for-retries](11-Networking-HTTP-Cookies-Caching-CORS.md#9-why-is-put-idempotent-but-post-is-not-and-why-does-that-matter-for-retries)*

### 10. Where does `ETag` help outside of static assets?

**Answer:** Any API `GET` endpoint with an expensive-to-render but infrequently-changing payload — a settings blob, a large list — can send an `ETag`, and the client's next request with `If-None-Match` gets back a cheap `304` instead of the full body when nothing changed. This saves both bandwidth and server render time compared to always returning `200` with the complete payload.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#10-where-does-etag-help-outside-of-static-assets](11-Networking-HTTP-Cookies-Caching-CORS.md#10-where-does-etag-help-outside-of-static-assets)*

## [12. Authentication, OAuth, and JWT from the Frontend](12-Authentication-OAuth-JWT.md)

### 1. Why is `localStorage` considered risky for storing a JWT?

**Answer:** Any JavaScript executing on the page — your own code, a third-party script, or a compromised npm dependency — can read `localStorage` directly. A single XSS vulnerability anywhere in the app lets an attacker exfiltrate the token wholesale and reuse it from their own machine, with no further interaction needed from the victim.

*Source: [12-Authentication-OAuth-JWT.md#1-why-is-localstorage-considered-risky-for-storing-a-jwt](12-Authentication-OAuth-JWT.md#1-why-is-localstorage-considered-risky-for-storing-a-jwt)*

### 2. If httpOnly cookies stop token theft, why doesn't everyone just use them?

**Answer:** Because they trade one problem for another: an httpOnly cookie is immune to being read by JavaScript, but the browser attaches it automatically to matching requests, which reopens CSRF. You have to add `SameSite` settings and CSRF tokens on state-changing requests, and cross-site cookie delivery (e.g. app and API on different domains) gets complicated with `SameSite=None` requirements and browser third-party-cookie restrictions.

*Source: [12-Authentication-OAuth-JWT.md#2-if-httponly-cookies-stop-token-theft-why-doesnt-everyone-just-use-them](12-Authentication-OAuth-JWT.md#2-if-httponly-cookies-stop-token-theft-why-doesnt-everyone-just-use-them)*

### 3. Walk me through what happens when a user clicks "Login with Google" in a React SPA.

**Answer:** The app generates a PKCE `code_verifier`/`code_challenge` pair and a random `state`, then redirects the full page to Google's authorize endpoint with the challenge and `state`. Google authenticates the user on its own domain and redirects back to the app's callback route with an authorization `code`; the app verifies `state` matches, then POSTs the code plus the original `code_verifier` to the token endpoint to receive the access, ID, and refresh tokens.

*Source: [12-Authentication-OAuth-JWT.md#3-walk-me-through-what-happens-when-a-user-clicks-login-with-google-in-a-react-spa](12-Authentication-OAuth-JWT.md#3-walk-me-through-what-happens-when-a-user-clicks-login-with-google-in-a-react-spa)*

### 4. What problem does PKCE actually solve?

**Answer:** A public client like a browser SPA can't hold a `client_secret` safely because the bundle is fully inspectable. PKCE replaces the static secret with a one-time secret (`code_verifier`) generated per login attempt, so even if an attacker intercepts the authorization code in the redirect, they can't exchange it for tokens without also having the verifier that only the legitimate app instance holds.

*Source: [12-Authentication-OAuth-JWT.md#4-what-problem-does-pkce-actually-solve](12-Authentication-OAuth-JWT.md#4-what-problem-does-pkce-actually-solve)*

### 5. Why does the frontend check `state` on the OAuth callback?

**Answer:** `state` is a CSRF defense for the redirect itself — without it, an attacker could initiate their own OAuth flow, capture a valid authorization code, and trick the victim into completing the callback with the attacker's code, logging the victim into the attacker's account. The app generates a random `state`, stores it before redirecting, and rejects the callback if the returned `state` doesn't match.

*Source: [12-Authentication-OAuth-JWT.md#5-why-does-the-frontend-check-state-on-the-oauth-callback](12-Authentication-OAuth-JWT.md#5-why-does-the-frontend-check-state-on-the-oauth-callback)*

### 6. Can the frontend trust the `roles` claim inside a JWT for showing/hiding an admin action?

**Answer:** It can use it to decide what to *render* for UX smoothness, but never as the actual security check, because the frontend has no way to verify the token's signature and the claim can be stale relative to a very recent permission change. The API endpoint behind that action must independently re-validate the token and re-check authorization server-side, since a hidden button is trivially bypassed with devtools or a raw HTTP call.

*Source: [12-Authentication-OAuth-JWT.md#6-can-the-frontend-trust-the-roles-claim-inside-a-jwt-for-showinghiding-an-admin-action](12-Authentication-OAuth-JWT.md#6-can-the-frontend-trust-the-roles-claim-inside-a-jwt-for-showinghiding-an-admin-action)*

### 7. How do you avoid firing five refresh requests when five API calls 401 at once?

**Answer:** Use a single in-flight promise that all callers await: the first 401 kicks off the refresh call and stores the pending promise, and subsequent 401s that arrive before it resolves just await the same promise instead of starting a new request. This prevents duplicate refresh calls from racing each other, which matters especially when refresh tokens rotate on use and an earlier one would get invalidated by a later one.

*Source: [12-Authentication-OAuth-JWT.md#7-how-do-you-avoid-firing-five-refresh-requests-when-five-api-calls-401-at-once](12-Authentication-OAuth-JWT.md#7-how-do-you-avoid-firing-five-refresh-requests-when-five-api-calls-401-at-once)*

### 8. What's the difference between an access token and an ID token in OIDC?

**Answer:** The access token is an opaque-to-the-client credential the frontend attaches to API calls so the resource server can authorize the request; the ID token is a JWT specifically meant for the client to read, containing profile claims like name and email so the frontend can render "who's logged in" state. Only the ID token is meant to be consumed by the frontend — the access token's format is a contract between the Authorization Server and Resource Server, not the client.

*Source: [12-Authentication-OAuth-JWT.md#8-whats-the-difference-between-an-access-token-and-an-id-token-in-oidc](12-Authentication-OAuth-JWT.md#8-whats-the-difference-between-an-access-token-and-an-id-token-in-oidc)*

### 9. Is a JWT encrypted?

**Answer:** No, a standard JWT (JWS) is encoded and signed, not encrypted — the payload is plain Base64URL and anyone holding the string can decode it with `atob()` or a site like jwt.io. That's why sensitive data (passwords, SSNs, secrets) should never go in a JWT payload, even one delivered only server-to-server.

*Source: [12-Authentication-OAuth-JWT.md#9-is-a-jwt-encrypted](12-Authentication-OAuth-JWT.md#9-is-a-jwt-encrypted)*

### 10. What's the frontend's role when a refresh token call fails?

**Answer:** Treat it as a hard logout, not a retry candidate: clear any in-memory access token, drop cached user state, and redirect to the login screen. A failed refresh usually means the refresh token expired, was revoked, or tripped reuse detection after rotation, and silently retrying would just mask a session that's genuinely gone.

*Source: [12-Authentication-OAuth-JWT.md#10-whats-the-frontends-role-when-a-refresh-token-call-fails](12-Authentication-OAuth-JWT.md#10-whats-the-frontends-role-when-a-refresh-token-call-fails)*

## [13. JavaScript Engine Internals](13-JavaScript-Engine-and-Browser-Internals.md)

### 1. What are the stages source code goes through before it actually runs in V8?

**Answer:** Source text is lexed into tokens, parsed into an AST, and compiled to bytecode that Ignition (the interpreter) executes; functions that get called repeatedly with stable input shapes are later JIT-compiled by TurboFan into optimized native machine code. Not every function reaches that last stage — most code just runs as interpreted bytecode.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#1-what-are-the-stages-source-code-goes-through-before-it-actually-runs-in-v8](13-JavaScript-Engine-and-Browser-Internals.md#1-what-are-the-stages-source-code-goes-through-before-it-actually-runs-in-v8)*

### 2. What is lazy parsing, and why does it matter for a large production bundle?

**Answer:** V8 pre-parses a function body just enough to find its boundaries and catch syntax errors, but defers the full parse (and bytecode generation) until the function is actually called. This means a multi-megabyte bundle containing rarely-used code (like an admin-only panel bundled with the main app) doesn't pay the full parse cost for that code during a normal user's session.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#2-what-is-lazy-parsing-and-why-does-it-matter-for-a-large-production-bundle](13-JavaScript-Engine-and-Browser-Internals.md#2-what-is-lazy-parsing-and-why-does-it-matter-for-a-large-production-bundle)*

### 3. Why does a deeply recursive function throw `Maximum call stack size exceeded` instead of just running slowly?

**Answer:** Each function call pushes a new frame onto the single call stack, and the stack has a fixed size limit set by the engine. A recursive function with no valid base case — like a comment-thread walk hitting a cyclical parent reference — keeps pushing frames until that limit is hit, and the engine throws a `RangeError` rather than let the stack grow unbounded.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#3-why-does-a-deeply-recursive-function-throw-maximum-call-stack-size-exceeded-instead-of-just-running-slowly](13-JavaScript-Engine-and-Browser-Internals.md#3-why-does-a-deeply-recursive-function-throw-maximum-call-stack-size-exceeded-instead-of-just-running-slowly)*

### 4. What's the practical difference between the interpreter and the JIT compiler?

**Answer:** The interpreter (Ignition) compiles bytecode and runs it directly, which starts fast but runs slower per call. The JIT compiler (TurboFan) profiles which functions are "hot" — called often with consistent argument shapes — and compiles just those to optimized native machine code, which is why a long-running Node process or a heavily interacted-with page can get measurably faster over time as its hot paths warm up.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#4-whats-the-practical-difference-between-the-interpreter-and-the-jit-compiler](13-JavaScript-Engine-and-Browser-Internals.md#4-whats-the-practical-difference-between-the-interpreter-and-the-jit-compiler)*

### 5. What causes a JIT-optimized function to deoptimize?

**Answer:** Deoptimization happens when a call to an already-optimized function violates the assumptions the JIT made from earlier calls — most commonly, receiving an object with a different shape than before. A `calculateCartTotal(items)` function optimized for `{ price, qty }` objects that suddenly receives a `{ price, isFreeGift: true }` object (no `qty`) is a realistic trigger, and the engine falls back to the interpreter for that function until it can re-optimize.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#5-what-causes-a-jit-optimized-function-to-deoptimize](13-JavaScript-Engine-and-Browser-Internals.md#5-what-causes-a-jit-optimized-function-to-deoptimize)*

### 6. What is a hidden class in V8, and why does it exist?

**Answer:** A hidden class is V8's internal descriptor of an object's property layout — which properties exist, in what order, at what memory offset — created so that property access can be a fast, fixed-offset lookup instead of a dictionary/hash lookup on every access. Objects created with the same properties assigned in the same order share a hidden class; objects built differently (extra conditional fields, different assignment order) get separate hidden classes even if they represent "the same kind of thing" logically.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#6-what-is-a-hidden-class-in-v8-and-why-does-it-exist](13-JavaScript-Engine-and-Browser-Internals.md#6-what-is-a-hidden-class-in-v8-and-why-does-it-exist)*

### 7. What's the difference between a monomorphic and a megamorphic inline cache, and why should you care as an engineer?

**Answer:** A monomorphic inline cache means a property-access callsite has only ever seen one hidden class, so the engine can keep using a fast, specialized lookup; megamorphic means it's seen too many different hidden classes and the engine falls back to a slow, generic lookup. You should care because it's an invisible perf cliff — code like `orders.map(o => o.total)` looks identical whether the `Order` objects behind it share a shape or not, but the runtime cost is very different.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#7-whats-the-difference-between-a-monomorphic-and-a-megamorphic-inline-cache-and-why-should-you-care-as-an-engineer](13-JavaScript-Engine-and-Browser-Internals.md#7-whats-the-difference-between-a-monomorphic-and-a-megamorphic-inline-cache-and-why-should-you-care-as-an-engineer)*

### 8. Is JavaScript single-threaded because of the call stack, and does that mean the browser can't do anything concurrently?

**Answer:** Yes and no — there is exactly one call stack, so only one piece of JS can be executing at any instant, which is what "single-threaded" refers to at the engine level. The browser still does network requests, timers, and I/O concurrently outside that stack and schedules the results back onto it via the event loop, which is a separate mechanism covered in the async/event-loop guide, not part of the engine's parsing/execution model itself.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#8-is-javascript-single-threaded-because-of-the-call-stack-and-does-that-mean-the-browser-cant-do-anything-concurrently](13-JavaScript-Engine-and-Browser-Internals.md#8-is-javascript-single-threaded-because-of-the-call-stack-and-does-that-mean-the-browser-cant-do-anything-concurrently)*

## [14. Internationalization (i18n) in JavaScript](14-Internationalization-i18n.md)

### 1. What's the difference between i18n, l10n, and g11n?

**Answer:** i18n (internationalization) is the engineering work of preparing an app's codebase so it can support any locale without structural rewrites — externalized strings, `Intl`-based formatting, direction-agnostic CSS. l10n (localization) is the content work of adapting that framework for one specific market — translating text, supplying regional formats. g11n (globalization) is the combination: i18n done once, l10n repeated per target market.

*Source: [14-Internationalization-i18n.md#1-whats-the-difference-between-i18n-l10n-and-g11n](14-Internationalization-i18n.md#1-whats-the-difference-between-i18n-l10n-and-g11n)*

### 2. Why is `amount.toFixed(2) + " €"` the wrong way to format currency?

**Answer:** It bakes in one locale's conventions — a period as the decimal separator, the symbol appended at the end — and breaks for any other locale. German formatting (`1.250.500,75 €`) flips the decimal and thousands separators entirely, and Japanese yen has no fractional (cents) unit at all. `Intl.NumberFormat(locale, { style: "currency", currency })` handles all of this correctly for any locale without custom logic.

*Source: [14-Internationalization-i18n.md#2-why-is-amounttofixed2-€-the-wrong-way-to-format-currency](14-Internationalization-i18n.md#2-why-is-amounttofixed2-€-the-wrong-way-to-format-currency)*

### 3. Why can't pluralization be handled with a simple `count === 1 ? singular : plural` check?

**Answer:** That check assumes English's plural rules, which only have two categories (`one`, `other`). Other languages have more: Russian has four plural categories, Arabic has six. A hardcoded ternary can't represent that, so real i18n systems use CLDR-based plural rules — ICU MessageFormat syntax or i18next's `_plural` key convention — so the correct category is selected per locale automatically.

*Source: [14-Internationalization-i18n.md#3-why-cant-pluralization-be-handled-with-a-simple-count-1-singular-plural-check](14-Internationalization-i18n.md#3-why-cant-pluralization-be-handled-with-a-simple-count-1-singular-plural-check)*

### 4. What does a locale identifier like `de-DE` actually encode, and why does it matter?

**Answer:** It follows the BCP 47 format `[language]-[REGION]` — `de-DE` is German as spoken in Germany. It matters because language alone isn't enough to determine formatting: it drives which date format, currency, decimal separator, and plural rules apply. The same language can format differently by region (e.g., `en-US` vs. `en-GB` dates), so the full locale, not just the language code, has to be passed to every `Intl` call.

*Source: [14-Internationalization-i18n.md#4-what-does-a-locale-identifier-like-de-de-actually-encode-and-why-does-it-matter](14-Internationalization-i18n.md#4-what-does-a-locale-identifier-like-de-de-actually-encode-and-why-does-it-matter)*

### 5. Why are CSS logical properties necessary for RTL support, and what's wrong with `margin-left`/`text-align: left`?

**Answer:** Physical properties like `margin-left` are anchored to the screen's left/right axis regardless of reading direction, so they stay frozen in an LTR layout even when `dir="rtl"` is set on the page. Logical properties like `margin-inline-start` and `text-align: start` resolve relative to the document's reading direction — `start` means left in LTR and right in RTL automatically — so the same stylesheet mirrors correctly for both directions with no separate RTL stylesheet.

*Source: [14-Internationalization-i18n.md#5-why-are-css-logical-properties-necessary-for-rtl-support-and-whats-wrong-with-margin-lefttext-align-left](14-Internationalization-i18n.md#5-why-are-css-logical-properties-necessary-for-rtl-support-and-whats-wrong-with-margin-lefttext-align-left)*

### 6. In `react-i18next`, what does `i18n.changeLanguage()` do, and does it require a page reload?

**Answer:** It swaps the active translation catalog at runtime and re-renders any component using `useTranslation()`'s `t()` function with the new language's strings. No reload is needed — React re-renders the affected components with the new locale's text as soon as the language changes, which is why the checkout header's language `<select>` can update the whole page instantly.

*Source: [14-Internationalization-i18n.md#6-in-react-i18next-what-does-i18nchangelanguage-do-and-does-it-require-a-page-reload](14-Internationalization-i18n.md#6-in-react-i18next-what-does-i18nchangelanguage-do-and-does-it-require-a-page-reload)*

### 7. Why should `interpolation.escapeValue` be set to `false` when configuring i18next for a React app?

**Answer:** i18next's interpolation defaults to escaping values (originally meant to prevent XSS when injecting translated strings into raw HTML). React already escapes all rendered text by default, so double-escaping would corrupt characters like accented letters or ampersands in translated strings. Setting `escapeValue: false` avoids that double-escaping since React's own rendering already provides the XSS protection.

*Source: [14-Internationalization-i18n.md#7-why-should-interpolationescapevalue-be-set-to-false-when-configuring-i18next-for-a-react-app](14-Internationalization-i18n.md#7-why-should-interpolationescapevalue-be-set-to-false-when-configuring-i18next-for-a-react-app)*

### 8. What's the actual difference between externalizing strings into a translation catalog versus just hardcoding text and later find/replacing it?

**Answer:** A translation catalog decouples text from code entirely — a component references a key (`checkout.welcome`), and the catalog for the active locale supplies the string, including locale-specific pluralization and interpolation. Find/replacing hardcoded text means every new locale requires touching and redeploying the component code, and it can't express the fact that a single English string may need multiple grammatically different translations (plural forms, gendered forms) that a single find/replace can't represent.

*Source: [14-Internationalization-i18n.md#8-whats-the-actual-difference-between-externalizing-strings-into-a-translation-catalog-versus-just-hardcoding-text-and-later-findreplacing-it](14-Internationalization-i18n.md#8-whats-the-actual-difference-between-externalizing-strings-into-a-translation-catalog-versus-just-hardcoding-text-and-later-findreplacing-it)*

### 9. How would you test that Northwind's checkout page is genuinely internationalized, not just translated?

**Answer:** Beyond checking translated text renders, verify the behaviors that translation alone doesn't cover: force an RTL locale and confirm the layout mirrors (not just that Arabic text displays), check that dates and currency reformat correctly across at least two different locales, run pseudo-localization to catch UI that breaks when strings are longer than English, and add a CI check that fails if any locale's catalog is missing a key present in the base (`en`) catalog.

*Source: [14-Internationalization-i18n.md#9-how-would-you-test-that-northwinds-checkout-page-is-genuinely-internationalized-not-just-translated](14-Internationalization-i18n.md#9-how-would-you-test-that-northwinds-checkout-page-is-genuinely-internationalized-not-just-translated)*

## [15. TypeScript Language Fundamentals](15-TypeScript-Language-Fundamentals.md)

### 1. What is the actual difference between `interface` and `type`, and which should you default to?

**Answer:** `interface` supports declaration merging (two `interface User {}` declarations with the same name combine into one) and is extended with `extends`; `type` cannot be re-opened but can alias unions, primitives, tuples, and mapped types, which `interface` cannot express (`interface Status = 'a' | 'b'` is a compile error). The common rule of thumb is `interface` for object shapes you expect might be extended, `type` for everything else — unions, intersections, and derived/mapped types.

*Source: [15-TypeScript-Language-Fundamentals.md#1-what-is-the-actual-difference-between-interface-and-type-and-which-should-you-default-to](15-TypeScript-Language-Fundamentals.md#1-what-is-the-actual-difference-between-interface-and-type-and-which-should-you-default-to)*

### 2. Why use a generic type like `ApiResponse<T>` instead of just typing every response as `any` or duplicating the envelope per endpoint?

**Answer:** `any` compiles but throws away all checking — a typo like `response.dta` would only fail at runtime — while duplicating `UserApiResponse`, `InvoiceApiResponse`, etc. means five near-identical interfaces to maintain. `ApiResponse<T>` is written once and reused for every payload shape, and `fetchJson<User>(...)` gives you `.data.name` fully typed and checked at compile time.

*Source: [15-TypeScript-Language-Fundamentals.md#2-why-use-a-generic-type-like-apiresponset-instead-of-just-typing-every-response-as-any-or-duplicating-the-envelope-per-endpoint](15-TypeScript-Language-Fundamentals.md#2-why-use-a-generic-type-like-apiresponset-instead-of-just-typing-every-response-as-any-or-duplicating-the-envelope-per-endpoint)*

### 3. What does a discriminated union buy you over a single object with a bunch of optional fields?

**Answer:** With optional fields, nothing stops you from constructing an invalid combination (a "success" object that also has an `error` populated), and every access needs a manual `if (value !== undefined)` check. A discriminated union like `Result<T, E>` makes invalid states unrepresentable — `success: true` variant simply has no `error` field to accidentally read — and checking the discriminant narrows the whole object's type for you.

*Source: [15-TypeScript-Language-Fundamentals.md#3-what-does-a-discriminated-union-buy-you-over-a-single-object-with-a-bunch-of-optional-fields](15-TypeScript-Language-Fundamentals.md#3-what-does-a-discriminated-union-buy-you-over-a-single-object-with-a-bunch-of-optional-fields)*

### 4. How does exhaustiveness checking with `never` actually catch a missed case at compile time?

**Answer:** In the `default` branch of a `switch` over every known variant of a union, TypeScript narrows the value's type down to `never` because, logically, nothing should reach that branch. Passing that value into a function typed to accept only `never` (`assertNever`) means that if a new union variant is added later and a case for it is missing, the value in `default` is no longer `never`, and the call becomes a compile error instead of running to production with the new variant silently unhandled.

*Source: [15-TypeScript-Language-Fundamentals.md#4-how-does-exhaustiveness-checking-with-never-actually-catch-a-missed-case-at-compile-time](15-TypeScript-Language-Fundamentals.md#4-how-does-exhaustiveness-checking-with-never-actually-catch-a-missed-case-at-compile-time)*

### 5. What's the difference between a type guard like `typeof x === 'string'` and a custom type predicate function (`x is Foo`)?

**Answer:** `typeof`/`instanceof`/discriminant checks are narrowing TypeScript understands natively inline. A custom type predicate (`function isUser(x: Account): x is User`) is needed when the check is more complex than a single built-in operator — for example, checking multiple properties at once — and it tells the compiler "if this returns `true`, narrow the argument to `User`" from that call site onward, exactly as if the check had been written inline.

*Source: [15-TypeScript-Language-Fundamentals.md#5-whats-the-difference-between-a-type-guard-like-typeof-x-string-and-a-custom-type-predicate-function-x-is-foo](15-TypeScript-Language-Fundamentals.md#5-whats-the-difference-between-a-type-guard-like-typeof-x-string-and-a-custom-type-predicate-function-x-is-foo)*

### 6. What does `Omit<User, 'passwordHash'>` actually generate, and why is it better than writing a second interface by hand?

**Answer:** It's a mapped type that takes every key of `User` except `passwordHash` and builds a new object type from them, computed automatically from `User`'s current shape. Writing `SafeUser` by hand as a second interface means it silently drifts out of sync if a field is later added to `User`; `Omit` (and `Pick`) stay correct automatically because they're derived, not duplicated.

*Source: [15-TypeScript-Language-Fundamentals.md#6-what-does-omituser-passwordhash-actually-generate-and-why-is-it-better-than-writing-a-second-interface-by-hand](15-TypeScript-Language-Fundamentals.md#6-what-does-omituser-passwordhash-actually-generate-and-why-is-it-better-than-writing-a-second-interface-by-hand)*

### 7. What is a conditional type, and where does `infer` fit in?

**Answer:** A conditional type (`T extends U ? X : Y`) is an if/else evaluated on types instead of values. `infer` lets you capture part of the type being checked and name it for reuse in the true branch — `T extends (...args: any[]) => infer R ? R : never` checks "is T a function?" and, if so, captures its return type as `R`. It's exactly how built-ins like `ReturnType<T>` and `Awaited<T>` are implemented, not a separate compiler feature.

*Source: [15-TypeScript-Language-Fundamentals.md#7-what-is-a-conditional-type-and-where-does-infer-fit-in](15-TypeScript-Language-Fundamentals.md#7-what-is-a-conditional-type-and-where-does-infer-fit-in)*

### 8. Why is `unknown` generally preferred over `any` for something like a caught error or an untyped API response?

**Answer:** `any` disables type checking entirely — you can call any method on it and the compiler stays silent even if that method doesn't exist. `unknown` still requires narrowing (`typeof`, `instanceof`, or a type guard) before you can use the value in any specific way, so mistakes like calling `.message` on a caught value that isn't actually an `Error` get caught at compile time instead of at runtime.

*Source: [15-TypeScript-Language-Fundamentals.md#8-why-is-unknown-generally-preferred-over-any-for-something-like-a-caught-error-or-an-untyped-api-response](15-TypeScript-Language-Fundamentals.md#8-why-is-unknown-generally-preferred-over-any-for-something-like-a-caught-error-or-an-untyped-api-response)*

## [16. Event Bubbling, Capturing, and Delegation](16-DOM-Events-Bubbling-Capturing-Delegation.md)

### 1. What are the three phases of DOM event propagation, in order?

**Answer:** Capturing (the event travels down from `window` to the target, ignored by listeners by default), target (the event fires on the actual element interacted with), and bubbling (the event travels back up from the target to `window`, which is what a normal `addEventListener` listens to unless told otherwise).

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#1-what-are-the-three-phases-of-dom-event-propagation-in-order](16-DOM-Events-Bubbling-Capturing-Delegation.md#1-what-are-the-three-phases-of-dom-event-propagation-in-order)*

### 2. How do you make an event listener run during the capturing phase instead of bubbling?

**Answer:** Pass `true` as the third argument to `addEventListener` (or `{ capture: true }` in the options-object form). Without it, the listener defaults to the bubbling phase.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#2-how-do-you-make-an-event-listener-run-during-the-capturing-phase-instead-of-bubbling](16-DOM-Events-Bubbling-Capturing-Delegation.md#2-how-do-you-make-an-event-listener-run-during-the-capturing-phase-instead-of-bubbling)*

### 3. What's the difference between `event.target` and `event.currentTarget`?

**Answer:** `event.target` is the actual, deepest element the user interacted with, and it never changes as the event travels through phases. `event.currentTarget` is whichever element the currently-running listener is attached to — inside a listener on an ancestor, it's always that ancestor, never the element the user actually clicked, which is why reading the wrong one inside a delegated handler is a real, common bug.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#3-whats-the-difference-between-eventtarget-and-eventcurrenttarget](16-DOM-Events-Bubbling-Capturing-Delegation.md#3-whats-the-difference-between-eventtarget-and-eventcurrenttarget)*

### 4. What's the difference between `stopPropagation()` and `preventDefault()`?

**Answer:** `stopPropagation()` stops the event from continuing through the remaining capturing/bubbling phases, but has no effect on the browser's default action for that event. `preventDefault()` stops the browser's default behavior (a link navigating, a checkbox toggling) but doesn't affect propagation at all — the event still bubbles unless `stopPropagation()` is also called. They solve two unrelated problems and are often confused for each other.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#4-whats-the-difference-between-stoppropagation-and-preventdefault](16-DOM-Events-Bubbling-Capturing-Delegation.md#4-whats-the-difference-between-stoppropagation-and-preventdefault)*

### 5. Why is calling `stopPropagation()` "just to be safe" actually risky?

**Answer:** It silently prevents any ancestor listener from ever seeing that event — including things you may not have anticipated, like a document-level analytics click tracker or another component's delegated handler higher up the tree. The bug this causes (an ancestor mysteriously never receiving an event) doesn't throw an error, which makes it a genuinely hard one to trace back to its cause.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#5-why-is-calling-stoppropagation-just-to-be-safe-actually-risky](16-DOM-Events-Bubbling-Capturing-Delegation.md#5-why-is-calling-stoppropagation-just-to-be-safe-actually-risky)*

### 6. What real problem does event delegation solve, and why does it depend specifically on the bubbling phase?

**Answer:** Attaching a separate listener to every row of a large or dynamically-changing list wastes memory and requires re-attaching listeners whenever rows are added or removed. Delegation attaches one listener to a stable ancestor and relies on bubbling to carry every descendant's click up to it, using `event.target` (typically with `.closest()`) to determine which specific descendant was actually involved — new descendants added later are automatically covered with no extra setup.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#6-what-real-problem-does-event-delegation-solve-and-why-does-it-depend-specifically-on-the-bubbling-phase](16-DOM-Events-Bubbling-Capturing-Delegation.md#6-what-real-problem-does-event-delegation-solve-and-why-does-it-depend-specifically-on-the-bubbling-phase)*

### 7. How does React's event system relate to native bubbling and delegation?

**Answer:** React attaches its own listeners near the application root rather than to every element with an `onClick`, relying on the same native bubbling mechanism internally, then dispatches a normalized synthetic event to your handler — effectively giving you delegation's performance benefit automatically. Calling `stopPropagation()` inside a React handler stops propagation within React's own synthetic event system, which can behave surprisingly if mixed with plain native `addEventListener` calls on the same DOM tree.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#7-how-does-reacts-event-system-relate-to-native-bubbling-and-delegation](16-DOM-Events-Bubbling-Capturing-Delegation.md#7-how-does-reacts-event-system-relate-to-native-bubbling-and-delegation)*
