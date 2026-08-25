# Master Question Bank — JavaScript Interview Prep

This file aggregates **every interview question and its full answer** from each of the 16 files in this folder (`01-Scope-Hoisting-Variables.md` through `16-DOM-Events-Bubbling-Capturing-Delegation.md`), in one place, so the whole set can be drilled without opening each file individually. Every answer (and follow-up, where present) is copied verbatim from its source file, and every question links back to its exact heading in that original file (the `*Source: ...*` line beneath each answer) so you can open it for the surrounding lesson content, code examples, and Revision Checklist that give it fuller context.

## [1. Scope, Hoisting, and Variables in JavaScript](01-Scope-Hoisting-Variables.md)

### 1. What's the practical difference between `var`, `let`, and `const`?

**Answer:** Think of it as three levels of strictness. `var` is the loose one — it's function-scoped, gets hoisted and auto-set to `undefined`, and you can even redeclare it. `let` and `const` are block-scoped and stricter — they get hoisted too, but into a locked "temporal dead zone," so touching them before their declaration line throws instead of quietly giving `undefined`. `const` adds one more rule on top: you can't reassign the binding itself. But that's not the same as freezing the value — an object or array it points to can still be mutated, so `const cart = []` followed by `cart.push(item)` is completely fine.

*Source: [01-Scope-Hoisting-Variables.md#1-whats-the-practical-difference-between-var-let-and-const](01-Scope-Hoisting-Variables.md#1-whats-the-practical-difference-between-var-let-and-const)*

### 2. Why does a `var` declared inside an `if` block "leak" out, but a `let` doesn't?

**Answer:** Because `var` doesn't actually know what a block is. It only respects function boundaries or the global scope — a plain `{}` is invisible to it, just syntax. `let` and `const`, on the other hand, really do live and die inside that block; the moment the closing brace hits, they're gone. That's exactly why two `if` branches both declaring `var discount` can quietly stomp on each other's value — they're secretly sharing the same variable the whole time.

*Source: [01-Scope-Hoisting-Variables.md#2-why-does-a-var-declared-inside-an-if-block-leak-out-but-a-let-doesnt](01-Scope-Hoisting-Variables.md#2-why-does-a-var-declared-inside-an-if-block-leak-out-but-a-let-doesnt)*

### 3. What is the scope chain, and how does JavaScript resolve a variable reference?

**Answer:** Picture it as walking outward through a set of nested rooms until you find the name you're looking for. If a variable isn't in the current scope, the engine steps out to the next enclosing scope, then the next, in the order the code was written — and it either finds a match or hits a `ReferenceError` once it runs out of rooms at the global scope. The key rule: this is based on where the function was written, not where it's called from. That's why a nested function like `withAuth` inside an API client can still read `baseUrl` from the outer `createApiClient` function, no matter who calls `withAuth` later.

*Source: [01-Scope-Hoisting-Variables.md#3-what-is-the-scope-chain-and-how-does-javascript-resolve-a-variable-reference](01-Scope-Hoisting-Variables.md#3-what-is-the-scope-chain-and-how-does-javascript-resolve-a-variable-reference)*

### 4. Explain what actually happens during hoisting's "creation phase."

**Answer:** Nothing actually moves — that's the trick to remember. Before the engine runs a single line, it does a quick pre-scan of the whole scope and sets up memory slots for every declaration it sees. Function declarations get their entire body attached right away. `var` gets a slot pre-filled with `undefined`. `let`, `const`, and `class` get a slot too, but it's marked "uninitialized" — locked. So hoisting isn't code physically jumping to the top; it's this pre-scan happening before execution starts, which just makes it look that way.

*Source: [01-Scope-Hoisting-Variables.md#4-explain-what-actually-happens-during-hoistings-creation-phase](01-Scope-Hoisting-Variables.md#4-explain-what-actually-happens-during-hoistings-creation-phase)*

### 5. What is the Temporal Dead Zone, and why does `typeof` throw on a TDZ variable instead of returning `"undefined"`?

**Answer:** The TDZ is that awkward gap between entering a scope and actually reaching the `let`/`const` line — the variable technically exists, but it's locked, and touching it throws. Here's the twist: `typeof` on a truly undeclared variable safely returns `"undefined"`, but `typeof` on a variable stuck in the TDZ throws instead. That's not a bug, it's deliberate — it kills the old `var`-era habit of using `typeof` to safely "probe" whether a variable exists before it's ready.

*Source: [01-Scope-Hoisting-Variables.md#5-what-is-the-temporal-dead-zone-and-why-does-typeof-throw-on-a-tdz-variable-instead-of-returning-undefined](01-Scope-Hoisting-Variables.md#5-what-is-the-temporal-dead-zone-and-why-does-typeof-throw-on-a-tdz-variable-instead-of-returning-undefined)*

### 6. Why does a function declaration win over a `var` with the same name during hoisting?

**Answer:** Order of arrival matters, and functions get there first. During the creation phase, function declarations get hoisted and bound to their full body before anything else runs. When the engine then processes a `var` with the same name, it sees the slot is already taken by a function and doesn't stomp on it with `undefined`. So if a function has both `var notifyUser` and `function notifyUser(){}`, reading `notifyUser` right at the top always gives you the function — never `undefined` — no matter which one was written first in the source.

*Source: [01-Scope-Hoisting-Variables.md#6-why-does-a-function-declaration-win-over-a-var-with-the-same-name-during-hoisting](01-Scope-Hoisting-Variables.md#6-why-does-a-function-declaration-win-over-a-var-with-the-same-name-during-hoisting)*

### 7. Walk through why a `var` loop variable breaks closures attached inside a loop, and how `let` fixes it.

**Answer:** This is the classic "one shared box" problem. With `var`, there's only one loop variable for the entire loop — every iteration shares the exact same box. So when a closure created inside the loop, like a click handler, finally runs later, it reads whatever value ended up sitting in that box after the loop already finished — not the value it saw at the moment it was created. `let` fixes this by giving every single iteration its own fresh, private box, so each closure captures a distinct value. Concretely: attach "remove from cart" handlers with `var i` and every single button removes the last item, because they're all reading the same final `i`. Just swap it to `let i`, change nothing else, and each button correctly removes its own row.

*Source: [01-Scope-Hoisting-Variables.md#7-walk-through-why-a-var-loop-variable-breaks-closures-attached-inside-a-loop-and-how-let-fixes-it](01-Scope-Hoisting-Variables.md#7-walk-through-why-a-var-loop-variable-breaks-closures-attached-inside-a-loop-and-how-let-fixes-it)*

### 8. Is a `const` variable actually immutable?

**Answer:** No, and this trips people up constantly. `const` only locks the binding — the name — not the value it points to. So if that value is an object or array, you can still freely mutate its contents. `const cart = []; cart.push(item);` is totally legal. What's not legal is reassigning the name itself: `cart = []` afterward throws a `TypeError`.

*Source: [01-Scope-Hoisting-Variables.md#8-is-a-const-variable-actually-immutable](01-Scope-Hoisting-Variables.md#8-is-a-const-variable-actually-immutable)*

### 9. Are function declarations always hoisted to the top of the enclosing function, no matter where they're nested?

**Answer:** Not reliably — this is one to avoid rather than memorize the edge cases of. A function declared at the top level of a function or module gets fully hoisted, body and all. But one declared inside a block, like inside an `if` or `for`, is technically supposed to be block-scoped under strict mode and ES modules. The catch is that a lot of non-strict environments still hoist it out of the block anyway, using old legacy `var`-like fallback behavior. Since the behavior actually differs by environment, the safe move is to just avoid block-nested function declarations entirely and use a function expression assigned to `let` or `const` instead.

*Source: [01-Scope-Hoisting-Variables.md#9-are-function-declarations-always-hoisted-to-the-top-of-the-enclosing-function-no-matter-where-theyre-nested](01-Scope-Hoisting-Variables.md#9-are-function-declarations-always-hoisted-to-the-top-of-the-enclosing-function-no-matter-where-theyre-nested)*

### 10. How does hoisting differ between a function declaration and a function expression assigned to a `const`?

**Answer:** A function declaration is fully hoisted — name and body both — so you can call it anywhere in its scope, even above where it's written. A function expression, like `const sendConfirmationEmail = function(){}`, only gets the `const` treatment: the identifier is hoisted into the TDZ, not the function itself. So calling it before that assignment line runs throws a `ReferenceError`, exactly the same failure you'd get touching any other `const` too early.

*Source: [01-Scope-Hoisting-Variables.md#10-how-does-hoisting-differ-between-a-function-declaration-and-a-function-expression-assigned-to-a-const](01-Scope-Hoisting-Variables.md#10-how-does-hoisting-differ-between-a-function-declaration-and-a-function-expression-assigned-to-a-const)*

## [2. Closures](02-Closures.md)

### 1. What is a closure, in terms an interviewer will accept as precise?

**Answer:** A closure is a function that carries its birthplace around with it. Precisely: it's a function paired with a reference to the lexical environment it was created in, so it can keep reading and writing variables from that outer scope even after the outer function has already returned and finished. One subtlety worth saying out loud: the closure forms at the moment the function is *created*, not when it's returned or called later. Every function technically closes over its defining scope — you just can't observe it unless that function survives longer than the scope that made it.

*Source: [02-Closures.md#1-what-is-a-closure-in-terms-an-interviewer-will-accept-as-precise](02-Closures.md#1-what-is-a-closure-in-terms-an-interviewer-will-accept-as-precise)*

### 2. Does a closure capture a value or a variable?

**Answer:** A variable, not a value — it's a live link, not a snapshot. That's why `makeIdGenerator`'s `next()` function can keep incrementing the same `counter` on every single call: it's holding onto the actual variable, not a frozen copy taken back when `next` was created. And that exact same mechanism — holding the live variable instead of a snapshot — is also what causes the classic `var i` loop bug.

*Source: [02-Closures.md#2-does-a-closure-capture-a-value-or-a-variable](02-Closures.md#2-does-a-closure-capture-a-value-or-a-variable)*

### 3. Why did all three functions in the classic `var i` loop log the same final value?

**Answer:** Because there was really only one `i` the whole time, shared by everyone. `var` is function-scoped, so the loop never creates a fresh `i` per iteration — it's one binding for the entire function, and every closure made inside the loop body points at that same single binding. By the time any of those closures actually run, the loop is long finished and `i` is already sitting at its final value, so every closure reads that same last number.

*Source: [02-Closures.md#3-why-did-all-three-functions-in-the-classic-var-i-loop-log-the-same-final-value](02-Closures.md#3-why-did-all-three-functions-in-the-classic-var-i-loop-log-the-same-final-value)*

### 4. How does changing `var` to `let` fix the loop bug, mechanically?

**Answer:** `let` gives every iteration its own private box instead of one shared box. Because it's block-scoped, the engine creates a brand-new binding for `i` on every single pass through the loop, so each closure made in that iteration captures its own personal copy, not a shared one. Under the hood it's functionally the same trick people used before `let` existed: wrapping each iteration in an IIFE that takes the current index as a parameter.

*Source: [02-Closures.md#4-how-does-changing-var-to-let-fix-the-loop-bug-mechanically](02-Closures.md#4-how-does-changing-var-to-let-fix-the-loop-bug-mechanically)*

### 5. What is a "stale closure" in React, and how does `useDebounce`'s `useRef` avoid it?

**Answer:** A stale closure is a callback that got frozen in the past — usually inside `useEffect`, `setTimeout`, or `setInterval` — closing over a piece of state or a prop from an earlier render, and it never finds out about later updates because the effect never re-ran. `useDebounce` sidesteps this with a neat trick: instead of the long-lived closure directly closing over the `callback` argument, it reads `latestCallback.current` — a ref, whose box keeps the same identity across every render. A separate effect quietly keeps that box updated on every render, so the timer never needs to be recreated, and it always calls the freshest version of the callback.

*Source: [02-Closures.md#5-what-is-a-stale-closure-in-react-and-how-does-usedebounces-useref-avoid-it](02-Closures.md#5-what-is-a-stale-closure-in-react-and-how-does-usedebounces-useref-avoid-it)*

### 6. Give a real use of closures for private state, and say why it's stronger than a class field.

**Answer:** A rate limiter or counter built by a factory function, like `createRateLimiter`, is a good real example — it keeps its internal counters as plain local variables inside the factory's scope, and only exposes them through the methods it hands back. The reason this beats a class field: with `this.count` on a class instance, that count is a real, always-visible property sitting right on the object — anyone can log it, enumerate it, or overwrite it. With the closure version, there is no property path that reaches that variable from outside at all. It's genuinely private — nothing to enumerate, nothing to accidentally mutate.

*Source: [02-Closures.md#6-give-a-real-use-of-closures-for-private-state-and-say-why-its-stronger-than-a-class-field](02-Closures.md#6-give-a-real-use-of-closures-for-private-state-and-say-why-its-stronger-than-a-class-field)*

### 7. How does a memoization cache use closures?

**Answer:** `memoize(fn)` sets up one `Map` in its own scope, then hands back a wrapper function that closes over that exact `Map`. Every call to that wrapper reads and writes the same shared cache, because all those calls are sharing the one closure created by that single `memoize(fn)` invocation. Worth noting: if you call `memoize(fn)` a second time, you get a completely separate cache — two independent closures, two independent `Map`s.

*Source: [02-Closures.md#7-how-does-a-memoization-cache-use-closures](02-Closures.md#7-how-does-a-memoization-cache-use-closures)*

### 8. Why can closures cause memory leaks, and when should you actually worry about it?

**Answer:** Because a closure doesn't just keep the variables it uses alive — it keeps its *entire* outer scope alive, whether it needs all of it or not. So if that outer scope happens to also hold a large object or a DOM node the closure never touches, that whole thing stays pinned in memory anyway. In practice this only bites you with long-lived closures: an event listener that never gets removed, an interval that never gets cleared, a cache with no eviction policy. That's exactly why both `useDebounce` and the counter example are careful to clean up — `clearTimeout`/`clearInterval` — instead of letting timers pile up forever.

*Source: [02-Closures.md#8-why-can-closures-cause-memory-leaks-and-when-should-you-actually-worry-about-it](02-Closures.md#8-why-can-closures-cause-memory-leaks-and-when-should-you-actually-worry-about-it)*

### 9. What's the difference between a closure and a regular function scope lookup?

**Answer:** Every function does a scope lookup through its chain of enclosing scopes — that part's just normal scoping. "Closure" is the special case: it's when that outer scope would otherwise have already been destroyed, and the only reason it's still alive is that this function is holding onto it. So calling a function while its defining scope is still sitting on the call stack is just ordinary scoping, nothing special. What interviewers actually mean by "closure" is the case where the outer function has already returned and finished — and the inner function is still keeping its scope alive.

*Source: [02-Closures.md#9-whats-the-difference-between-a-closure-and-a-regular-function-scope-lookup](02-Closures.md#9-whats-the-difference-between-a-closure-and-a-regular-function-scope-lookup)*

### 10. In the debounce hook, why is the cleanup function also called a closure?

**Answer:** Because it's grabbing onto one specific `timerId`, not just "whatever the current timer is." The `return () => clearTimeout(timerId)` function captures the `timerId` from that exact run of the effect, so when React calls it later — right before the next effect run, or on unmount — it clears precisely the timer that run created, never some other run's timer. Every effect execution gets its own fresh `timerId` variable and its own cleanup closure wrapped around it, which is exactly what makes it safe to call `useDebounce` from a component that's re-rendering rapidly, with no timers colliding or clobbering each other.

*Source: [02-Closures.md#10-in-the-debounce-hook-why-is-the-cleanup-function-also-called-a-closure](02-Closures.md#10-in-the-debounce-hook-why-is-the-cleanup-function-also-called-a-closure)*

## [3. The `this` Keyword](03-this-Keyword.md)

### 1. How do you determine what `this` refers to inside a given function?

**Answer:** Rule of thumb: never look at where the function is defined, look at where it's *called*. Ask "how did this call actually happen?" — standalone (`fn()`), as a method (`obj.fn()`), explicitly forced (`fn.call(obj)`), or with `new`. The exact same function body can resolve `this` completely differently on every single call, purely depending on which of those four call shapes was used that time.

*Source: [03-this-Keyword.md#1-how-do-you-determine-what-this-refers-to-inside-a-given-function](03-this-Keyword.md#1-how-do-you-determine-what-this-refers-to-inside-a-given-function)*

### 2. What is the order of precedence among the four binding rules?

**Answer:** There's a strict pecking order, and `new` always wins at the top. From strongest to weakest: `new` binding beats explicit binding (`call`/`apply`/`bind`), which beats implicit binding (calling it as `obj.method()`), which beats plain default binding (just calling it standalone). So even if you've already locked a function's `this` with `.bind(obj)`, calling it with `new boundFn()` still overrides that — `this` becomes the brand-new instance `new` creates, not `obj`.

*Source: [03-this-Keyword.md#2-what-is-the-order-of-precedence-among-the-four-binding-rules](03-this-Keyword.md#2-what-is-the-order-of-precedence-among-the-four-binding-rules)*

### 3. Why does extracting a method off an object and calling it separately break `this`?

**Answer:** Because `this` binding cares about the dot right before the call, and once you pull the method out into a variable, that dot is gone. `const fn = obj.method; fn()` has no dot at the call-site anymore, so it falls all the way back to default binding — `this` ends up `undefined` in strict mode, or the global object otherwise. This exact thing happens whenever you hand `obj.method` straight to `setTimeout`, `addEventListener`, or a React `onClick` prop without binding it first — you've stripped away the dot without realizing it.

*Source: [03-this-Keyword.md#3-why-does-extracting-a-method-off-an-object-and-calling-it-separately-break-this](03-this-Keyword.md#3-why-does-extracting-a-method-off-an-object-and-calling-it-separately-break-this)*

### 4. How do arrow functions handle `this`, and why can't you `bind()` a new value onto one?

**Answer:** Arrow functions simply never got a `this` slot of their own — there's nothing to bind. Instead they resolve `this` lexically, by looking at whatever the enclosing scope's `this` was at the moment they were defined, exactly the same way a closure looks up any other outer variable. Because there's no internal `this` slot to overwrite, `call`, `apply`, `bind`, and even `new` all have zero effect on it — `arrowFn.bind(obj)` still hands you back a function using the same original lexical `this` as before.

*Source: [03-this-Keyword.md#4-how-do-arrow-functions-handle-this-and-why-cant-you-bind-a-new-value-onto-one](03-this-Keyword.md#4-how-do-arrow-functions-handle-this-and-why-cant-you-bind-a-new-value-onto-one)*

### 5. What's the practical difference between `call`, `apply`, and `bind`?

**Answer:** `call` and `apply` are basically twins — both invoke the function right away with a `this` you choose, and the only difference is how you hand over the arguments: one at a time for `call`, bundled as an array for `apply`. `bind` is the odd one out: it doesn't call anything at all. It just hands you back a brand-new function with `this` permanently welded in place, which is exactly what you reach for when you need a reusable callback rather than firing the function once right now.

*Source: [03-this-Keyword.md#5-whats-the-practical-difference-between-call-apply-and-bind](03-this-Keyword.md#5-whats-the-practical-difference-between-call-apply-and-bind)*

### 6. Why does `<button onClick={this.handleClick}>` throw inside a React class component, and how do you fix it?

**Answer:** Same root cause as extracting any other method — passing `this.handleClick` as a prop hands React a bare function reference, stripped of its dot. React later calls it as a plain standalone call with no receiver, so inside `handleClick`, `this` is `undefined`, and `this.setState(...)` throws. There are three standard fixes: bind it in the constructor (`this.handleClick = this.handleClick.bind(this)`), define it as an arrow-function class field instead of a regular method, or just wrap it inline: `onClick={() => this.handleClick()}`.

*Source: [03-this-Keyword.md#6-why-does-button-onclickthishandleclick-throw-inside-a-react-class-component-and-how-do-you-fix-it](03-this-Keyword.md#6-why-does-button-onclickthishandleclick-throw-inside-a-react-class-component-and-how-do-you-fix-it)*

### 7. Why doesn't this class of bug exist in function components?

**Answer:** Simple reason: function components don't have a `this` to lose in the first place. State comes from `useState`, and handlers are just ordinary closures over local variables and setter functions — no object instance involved anywhere. With no `this` on the table, there's nothing that can get disconnected, so a handler defined inside a function component always works correctly when passed to `onClick`, no binding required.

*Source: [03-this-Keyword.md#7-why-doesnt-this-class-of-bug-exist-in-function-components](03-this-Keyword.md#7-why-doesnt-this-class-of-bug-exist-in-function-components)*

### 8. What does `this` refer to inside a regular function passed to `setTimeout`, and how do you fix it without `bind`?

**Answer:** The timer calls your callback with no receiver at all, so a regular `function` falls straight back to default binding — `this` ends up `undefined` or the global object, definitely not the object that scheduled the timer. Swap it for an arrow function and the problem disappears, because an arrow function has no `this` of its own — it just inherits `this` lexically from the enclosing method where `setTimeout` was originally called, no `bind()` needed.

*Source: [03-this-Keyword.md#8-what-does-this-refer-to-inside-a-regular-function-passed-to-settimeout-and-how-do-you-fix-it-without-bind](03-this-Keyword.md#8-what-does-this-refer-to-inside-a-regular-function-passed-to-settimeout-and-how-do-you-fix-it-without-bind)*

### 9. If you pass `null` or `undefined` to `Function.prototype.call`, what happens to `this`?

**Answer:** It depends on strict mode, and the strict-mode version is the more useful one for catching bugs. In non-strict mode, JavaScript quietly swaps in the global object for a `null`/`undefined` receiver, so `this` silently becomes `window` (or `globalThis`) instead of throwing — which can hide a real mistake. In strict mode — which is automatically on inside ES modules, class bodies, and anything marked `"use strict"` — `this` stays exactly `null` or `undefined`, so touching a property on it throws a `TypeError` right away, surfacing the bug immediately instead of letting it hide.

*Source: [03-this-Keyword.md#9-if-you-pass-null-or-undefined-to-functionprototypecall-what-happens-to-this](03-this-Keyword.md#9-if-you-pass-null-or-undefined-to-functionprototypecall-what-happens-to-this)*

## [4. Prototypes and Classes](04-Prototypes-and-Classes.md)

### 1. What actually happens when you write `obj.someMethod()` and `someMethod` isn't defined directly on `obj`?

**Answer:** Think of it as walking up a chain of fallback objects until someone answers. The engine checks `obj` itself first; if `someMethod` isn't there, it follows `obj.__proto__` up to the next object in the chain, and keeps climbing until it either finds the property or hits `null` at the very top (`Object.prototype.__proto__`). If it reaches `null` and still hasn't found it, a plain access just gives you `undefined` — but trying to *call* it as a function throws a `TypeError`.

*Source: [04-Prototypes-and-Classes.md#1-what-actually-happens-when-you-write-objsomemethod-and-somemethod-isnt-defined-directly-on-obj](04-Prototypes-and-Classes.md#1-what-actually-happens-when-you-write-objsomemethod-and-somemethod-isnt-defined-directly-on-obj)*

### 2. How is `class`/`extends` different from manually wiring `Object.create` and `.call()`, if it's "the same mechanism"?

**Answer:** Under the hood, it's genuinely the exact same mechanism — `class`/`extends` is just syntax sugar on top of it. `extends` still wires `Child.prototype.__proto__` to `Parent.prototype`, and `super(...)` still runs the parent constructor against the new instance's `this`, exactly the way `Parent.call(this, ...)` did before ES6 existed. What `class` actually adds are extra safety rules enforced by the engine: you're not allowed to touch `this` in a derived constructor before calling `super()`, and unlike an old-school function declaration, a `class` declaration sits in the temporal dead zone and can't be used before its line actually runs.

*Source: [04-Prototypes-and-Classes.md#2-how-is-classextends-different-from-manually-wiring-objectcreate-and-call-if-its-the-same-mechanism](04-Prototypes-and-Classes.md#2-how-is-classextends-different-from-manually-wiring-objectcreate-and-call-if-its-the-same-mechanism)*

### 3. What's the difference between a property on `Button.prototype` and a property assigned inside the `Button` constructor with `this.x = ...`?

**Answer:** One copy shared by everyone versus one copy per instance — that's the whole distinction. A property on `Button.prototype` exists exactly once in memory, and every instance reaches it through the prototype chain, which is exactly why methods belong there. A property set with `this.x` inside the constructor, by contrast, gets created fresh on every single instance. That's correct for genuinely unique per-instance data, like a `baseUrl` — but it would be a waste of memory if you used it for a method that behaves identically on every instance anyway.

*Source: [04-Prototypes-and-Classes.md#3-whats-the-difference-between-a-property-on-buttonprototype-and-a-property-assigned-inside-the-button-constructor-with-thisx-](04-Prototypes-and-Classes.md#3-whats-the-difference-between-a-property-on-buttonprototype-and-a-property-assigned-inside-the-button-constructor-with-thisx-)*

### 4. Why does forgetting to reset `Child.prototype.constructor` after `Child.prototype = Object.create(Parent.prototype)` cause a bug, and does `class` have the same trap?

**Answer:** Because that line leaves a dangling pointer to the wrong parent. After `Child.prototype = Object.create(Parent.prototype)` runs, `Child.prototype.constructor` still points at `Parent` — the new object just inherited `constructor` from `Parent.prototype` rather than pointing back at `Child`. So any code that inspects `instance.constructor.name` for logging or reflection silently reports the wrong class name. Good news: `class extends` doesn't have this trap at all — the engine wires up the constructor link correctly and automatically, and this is one of the concrete, real bugs the `class` syntax was specifically designed to prevent.

*Source: [04-Prototypes-and-Classes.md#4-why-does-forgetting-to-reset-childprototypeconstructor-after-childprototype-objectcreateparentprototype-cause-a-bug-and-does-class-have-the-same-trap](04-Prototypes-and-Classes.md#4-why-does-forgetting-to-reset-childprototypeconstructor-after-childprototype-objectcreateparentprototype-cause-a-bug-and-does-class-have-the-same-trap)*

### 5. How does a private field (`#token`) differ from the old `_token` underscore convention?

**Answer:** It's the difference between a polite request and an actual lock. `_token` is purely a naming convention — nothing technically stops outside code from reading or writing `instance._token` directly, it's just a signal telling other developers "please don't." `#token` is enforced by the engine itself: trying to access `instance.#token` from outside the declaring class isn't just `undefined`, it's a `SyntaxError`. There's genuinely no way to reach in and touch it from outside, whether by accident or on purpose.

*Source: [04-Prototypes-and-Classes.md#5-how-does-a-private-field-token-differ-from-the-old-_token-underscore-convention](04-Prototypes-and-Classes.md#5-how-does-a-private-field-token-differ-from-the-old-_token-underscore-convention)*

### 6. When would you reach for a getter/setter instead of a plain public field?

**Answer:** Reach for a getter/setter whenever reading or writing that value needs to actually *do* something — not just store a value. Three concrete triggers: validation on write, like rejecting a negative retry count; a computed value on read, like `attemptsRemaining` derived from a private counter; or a side effect like logging. The nice part is callers still get to write plain `obj.prop` syntax, instead of ugly `obj.getProp()`/`obj.setProp()` calls. If there's genuinely no rule to enforce and nothing to compute, a plain public field is perfectly fine — no need to reach for a getter/setter.

*Source: [04-Prototypes-and-Classes.md#6-when-would-you-reach-for-a-gettersetter-instead-of-a-plain-public-field](04-Prototypes-and-Classes.md#6-when-would-you-reach-for-a-gettersetter-instead-of-a-plain-public-field)*

### 7. Is a `static` method reachable on an instance? What about a static field?

**Answer:** No — a `static` member lives on the class itself, the constructor function, not on `.prototype`, so instances have no path to it through the prototype chain at all. `HttpClient.withDefaultTimeout(...)` works fine, but calling `client.withDefaultTimeout(...)` on an instance throws a `TypeError`, because that method was never placed anywhere the instance's chain actually reaches.

*Source: [04-Prototypes-and-Classes.md#7-is-a-static-method-reachable-on-an-instance-what-about-a-static-field](04-Prototypes-and-Classes.md#7-is-a-static-method-reachable-on-an-instance-what-about-a-static-field)*

### 8. What actually is `Object.create(null)` useful for, and why not just use `{}`?

**Answer:** `Object.create(null)` gives you a truly bare object — no prototype at all, so it inherits nothing from `Object.prototype`. No `toString`, no `hasOwnProperty`, no `constructor`, nothing. `{}`, by contrast, quietly inherits from `Object.prototype` behind the scenes. That becomes a real security problem the moment you use the object as a dictionary with attacker-influenced keys: a key like `"toString"` or `"constructor"` would collide with an inherited method instead of just behaving like a plain, harmless data slot.

*Source: [04-Prototypes-and-Classes.md#8-what-actually-is-objectcreatenull-useful-for-and-why-not-just-use-](04-Prototypes-and-Classes.md#8-what-actually-is-objectcreatenull-useful-for-and-why-not-just-use-)*

## [5. JavaScript Modules: ESM vs CommonJS](05-Modules-ESM-CommonJS.md)

### 1. What is the fundamental difference between how CommonJS and ESM resolve imports?

**Answer:** Runtime versus compile-time — that's the core split. CommonJS resolves `require()` calls at runtime: the engine literally runs the required file right then and hands back its `module.exports` object at the exact moment `require` is called, which is why you can wrap a `require` in an `if`. ESM works completely differently — it figures out the entire import/export graph statically, before any module body even runs. That's exactly why `import` statements have to sit at the top level, and why the engine can reason about the whole graph without executing a single line of it first.

*Source: [05-Modules-ESM-CommonJS.md#1-what-is-the-fundamental-difference-between-how-commonjs-and-esm-resolve-imports](05-Modules-ESM-CommonJS.md#1-what-is-the-fundamental-difference-between-how-commonjs-and-esm-resolve-imports)*

### 2. Why does ESM enable tree-shaking while CommonJS effectively blocks it?

**Answer:** It comes down to whether a bundler can prove something is unused *without running the code*. ESM's `export`/`import` bindings are declared statically, so a bundler can build the whole dependency graph on paper, prove certain exports are never used, and safely delete them. CommonJS gives the bundler no such guarantee: `module.exports` is just a plain runtime object, and it could be built with loops, conditionals, or computed keys — the bundler can't know what's unused without actually simulating execution. So it plays it safe and just keeps the entire module.

*Source: [05-Modules-ESM-CommonJS.md#2-why-does-esm-enable-tree-shaking-while-commonjs-effectively-blocks-it](05-Modules-ESM-CommonJS.md#2-why-does-esm-enable-tree-shaking-while-commonjs-effectively-blocks-it)*

### 3. When would you use dynamic `import()` instead of a static `import`?

**Answer:** Reach for dynamic `import()` whenever you want to delay loading code until the exact moment it's needed — the classic case is only fetching a heavy charting library when a user actually opens the analytics tab on a dashboard, instead of shipping it in everyone's initial bundle. Mechanically, `import()` returns a Promise and can be called from literally anywhere, including inside an event handler — something static `import` simply can't do, since it's required to sit at the top level of a file.

*Source: [05-Modules-ESM-CommonJS.md#3-when-would-you-use-dynamic-import-instead-of-a-static-import](05-Modules-ESM-CommonJS.md#3-when-would-you-use-dynamic-import-instead-of-a-static-import)*

### 4. Explain the "live binding" behavior of ESM imports and how it differs from CommonJS.

**Answer:** Live reference versus one-time snapshot — that's the memorable version. In ESM, an imported binding is a live, read-only window straight into the actual variable in the exporting module, so if that module later reassigns the variable, every importer sees the new value instantly. CommonJS instead just copies whatever value happened to be sitting on `module.exports` at the exact moment `require` ran. So if the source module later mutates a primitive value, modules that already imported it never find out — unless they imported the whole containing object and mutated a property on that object directly.

*Source: [05-Modules-ESM-CommonJS.md#4-explain-the-live-binding-behavior-of-esm-imports-and-how-it-differs-from-commonjs](05-Modules-ESM-CommonJS.md#4-explain-the-live-binding-behavior-of-esm-imports-and-how-it-differs-from-commonjs)*

### 5. What actually happens when two ESM modules import each other in a cycle?

**Answer:** The engine hoists both modules' export declarations before running either module's body, so each side does get a live reference to the other's bindings set up in advance. The danger is timing: if one module's code runs and immediately tries to read a binding from the other before that other module's top-level code has actually run and assigned it, it throws a `ReferenceError` — the binding exists, but it's still sitting uninitialized. The real fix isn't to carefully manage execution order — it's to pull the shared piece both modules need out into a separate module they both depend on, breaking the cycle entirely.

*Source: [05-Modules-ESM-CommonJS.md#5-what-actually-happens-when-two-esm-modules-import-each-other-in-a-cycle](05-Modules-ESM-CommonJS.md#5-what-actually-happens-when-two-esm-modules-import-each-other-in-a-cycle)*

### 6. How does importing a CommonJS package from an ESM file actually work under Node and under bundlers?

**Answer:** Node's ESM loader treats the whole CJS `module.exports` object as a single default export when you `import` a `.cjs` module. It only exposes named exports on top of that if a static-analysis tool, `cjs-module-lexer`, can actually detect them syntactically — which isn't guaranteed if the exports were built dynamically at runtime. Bundlers like webpack solve the same problem a similar way: they wrap the CJS module and inject an interop helper so `import x from 'cjsPackage'` resolves correctly. That's the exact same mechanism behind TypeScript and Babel's `esModuleInterop` flag.

*Source: [05-Modules-ESM-CommonJS.md#6-how-does-importing-a-commonjs-package-from-an-esm-file-actually-work-under-node-and-under-bundlers](05-Modules-ESM-CommonJS.md#6-how-does-importing-a-commonjs-package-from-an-esm-file-actually-work-under-node-and-under-bundlers)*

### 7. Why do libraries like lodash ship both a CJS build and an ESM build (`lodash` vs `lodash-es`)?

**Answer:** Because the CJS build makes tree-shaking impossible by construction. Its `module.exports` is one single runtime object, so importing even a single function drags in the entire module — a bundler has no way to prove the rest is safe to delete. The ESM build, `lodash-es`, exports each function as its own separate, static named export, which lets Rollup, webpack, or esbuild tree-shake away every function you never actually imported — and that materially shrinks the final bundle size.

*Source: [05-Modules-ESM-CommonJS.md#7-why-do-libraries-like-lodash-ship-both-a-cjs-build-and-an-esm-build-lodash-vs-lodash-es](05-Modules-ESM-CommonJS.md#7-why-do-libraries-like-lodash-ship-both-a-cjs-build-and-an-esm-build-lodash-vs-lodash-es)*

### 8. How do Vite and webpack differ in how they handle ESM vs CommonJS during development versus production?

**Answer:** In dev, Vite serves your own source files directly to the browser as native ESM for instant hot-reload, but it has to pre-bundle any CJS `node_modules` dependencies into ESM-compatible chunks with esbuild up front — because browsers simply can't natively `import` a CJS file. In production, Vite hands the job off to Rollup, and webpack behaves much the same way throughout the whole process: both parse every module regardless of its original format, tree-shake the ESM portions of the graph, and treat CJS dependencies as opaque, un-shakeable units wrapped in interop helpers.

*Source: [05-Modules-ESM-CommonJS.md#8-how-do-vite-and-webpack-differ-in-how-they-handle-esm-vs-commonjs-during-development-versus-production](05-Modules-ESM-CommonJS.md#8-how-do-vite-and-webpack-differ-in-how-they-handle-esm-vs-commonjs-during-development-versus-production)*

### 9. Why can't you put a static `import` statement inside an `if` block, and how would you achieve the same effect?

**Answer:** Because static `import` has to be resolvable at parse time, before a single line of code executes — and an `if` condition is, by definition, something only known at runtime. Those two requirements directly contradict each other, so it's not just a lint rule, it's an actual syntax error to try it. The way to get the same conditional-loading effect is dynamic `import()` instead — it's a real function call that returns a Promise, so it can legally live inside any runtime branch, including an `if` block.

*Source: [05-Modules-ESM-CommonJS.md#9-why-cant-you-put-a-static-import-statement-inside-an-if-block-and-how-would-you-achieve-the-same-effect](05-Modules-ESM-CommonJS.md#9-why-cant-you-put-a-static-import-statement-inside-an-if-block-and-how-would-you-achieve-the-same-effect)*

### 10. Give a concrete reason a real project would still need CommonJS support in 2026 despite ESM being the modern standard.

**Answer:** Because the ecosystem hasn't fully moved on, plain and simple. A large chunk of npm packages — especially older or lightly-maintained ones — plus a good part of Node's own tooling world, like some Jest transforms and certain build plugins, still ship or expect CJS. So any nontrivial project's dependency tree is essentially guaranteed to include CJS modules somewhere. That's exactly why bundlers and Node's dual-package interop exist: you can't realistically force an entire ecosystem to migrate before you're allowed to ship your own app.

*Source: [05-Modules-ESM-CommonJS.md#10-give-a-concrete-reason-a-real-project-would-still-need-commonjs-support-in-2026-despite-esm-being-the-modern-standard](05-Modules-ESM-CommonJS.md#10-give-a-concrete-reason-a-real-project-would-still-need-commonjs-support-in-2026-despite-esm-being-the-modern-standard)*

## [6. Event Loop and Concurrency](06-Event-Loop-and-Concurrency.md)

### 1. JavaScript is single-threaded — so how can a browser tab run a timer, a network request, and stay responsive to clicks all "at once"?

**Answer:** Honest answer: it can't, not on the JS thread itself — there is exactly one call stack, full stop. The trick is that the "multitasking" isn't happening in JavaScript at all, it's happening around it. The browser, or Node's `libuv`, is genuinely multithreaded under the hood, and it handles timers, network I/O, and event listening on its own separate threads. All it does is drop the resulting callback into a queue, and the event loop runs that callback on the single JS thread once it's free. Worth remembering: `fetch`, `setTimeout`, and DOM listeners aren't JS engine features at all — they're Web APIs provided by the host environment.

*Source: [06-Event-Loop-and-Concurrency.md#1-javascript-is-single-threaded-—-so-how-can-a-browser-tab-run-a-timer-a-network-request-and-stay-responsive-to-clicks-all-at-once](06-Event-Loop-and-Concurrency.md#1-javascript-is-single-threaded-—-so-how-can-a-browser-tab-run-a-timer-a-network-request-and-stay-responsive-to-clicks-all-at-once)*

### 2. What's the concrete difference between a microtask and a macrotask, and which runs first?

**Answer:** Simple rule to hold onto: microtasks always cut in line ahead of macrotasks. Microtasks — `Promise.then`, `async/await` resuming, `queueMicrotask` — always run before the next macrotask, things like `setTimeout`, `setInterval`, or UI events. The reason is that the event loop completely drains the microtask queue, including any new microtasks scheduled while it's draining, before it will even glance at one macrotask. That's exactly why `Promise.resolve().then(...)` logs before a `setTimeout(fn, 0)`, even if that `setTimeout` was scheduled earlier in the same script.

*Source: [06-Event-Loop-and-Concurrency.md#2-whats-the-concrete-difference-between-a-microtask-and-a-macrotask-and-which-runs-first](06-Event-Loop-and-Concurrency.md#2-whats-the-concrete-difference-between-a-microtask-and-a-macrotask-and-which-runs-first)*

### 3. Predict the output: a script logs synchronously, schedules a `setTimeout(fn, 0)`, then a `Promise.resolve().then(fn)` that itself chains another `.then`, then logs synchronously again.

**Answer:** Order to say out loud: sync code first, then every microtask, then finally the macrotask. Both synchronous logs print first, in that order, because the call stack always finishes running before either queue gets checked at all. Then the microtask queue drains completely — the first `.then` runs, and because it schedules a second `.then` while the queue is draining, that second one also finishes before the engine is allowed to move on to anything else. Only once the microtask queue is fully empty does the `setTimeout` callback finally get its turn.

*Source: [06-Event-Loop-and-Concurrency.md#3-predict-the-output-a-script-logs-synchronously-schedules-a-settimeoutfn-0-then-a-promiseresolvethenfn-that-itself-chains-another-then-then-logs-synchronously-again](06-Event-Loop-and-Concurrency.md#3-predict-the-output-a-script-logs-synchronously-schedules-a-settimeoutfn-0-then-a-promiseresolvethenfn-that-itself-chains-another-then-then-logs-synchronously-again)*

### 4. Why does processing a large array synchronously (e.g., sorting 200,000 rows on a button click) freeze the entire tab, including a spinner you just rendered?

**Answer:** Because painting has to wait in line just like everything else — the call stack has to be completely empty before the browser is even allowed to paint or process the next task. That's a hard ordering rule baked into the platform, not just a performance guideline. So a long synchronous function keeps the stack occupied for its entire duration, meaning a `showSpinner()` DOM mutation you made right before it never actually gets painted to the screen — it's stuck behind the frozen stack. Meanwhile every click and scroll is quietly queuing up, invisible, until that function finally returns.

*Source: [06-Event-Loop-and-Concurrency.md#4-why-does-processing-a-large-array-synchronously-eg-sorting-200000-rows-on-a-button-click-freeze-the-entire-tab-including-a-spinner-you-just-rendered](06-Event-Loop-and-Concurrency.md#4-why-does-processing-a-large-array-synchronously-eg-sorting-200000-rows-on-a-button-click-freeze-the-entire-tab-including-a-spinner-you-just-rendered)*

### 5. How would you fix a UI freeze caused by a large synchronous computation, and what are the trade-offs between the options?

**Answer:** Two options, and they trade off differently. The quick fix is to break the work into chunks and yield between them with `setTimeout(fn, 0)` or `requestIdleCallback` — that forces the call stack to empty periodically so the browser gets a chance to paint and handle input. It's simple, but it adds overhead and the manual chunking logic gets messy. The real fix for genuinely CPU-bound work is a Web Worker — it runs on an actual separate OS thread, so the main thread is never blocked at all. The trade-off there is that a worker can't directly touch the DOM, so you need message-passing to shuttle data back and forth.

*Source: [06-Event-Loop-and-Concurrency.md#5-how-would-you-fix-a-ui-freeze-caused-by-a-large-synchronous-computation-and-what-are-the-trade-offs-between-the-options](06-Event-Loop-and-Concurrency.md#5-how-would-you-fix-a-ui-freeze-caused-by-a-large-synchronous-computation-and-what-are-the-trade-offs-between-the-options)*

### 6. What happens if a promise chain keeps rescheduling itself recursively (e.g., a retry loop with no backoff that always chains `.then`)?

**Answer:** It quietly starves the event loop to death. The rule is that the microtask queue must be fully drained before the loop can paint or run the next macrotask — so a microtask that keeps re-scheduling itself never lets that queue reach zero, and the loop never gets to move on. The frustrating part for debugging is that the tab just freezes with no obviously long-running function sitting on the call stack. Open a profiler and you won't see one big infinite loop — you'll see thousands of tiny microtask executions firing back to back, forever.

*Source: [06-Event-Loop-and-Concurrency.md#6-what-happens-if-a-promise-chain-keeps-rescheduling-itself-recursively-eg-a-retry-loop-with-no-backoff-that-always-chains-then](06-Event-Loop-and-Concurrency.md#6-what-happens-if-a-promise-chain-keeps-rescheduling-itself-recursively-eg-a-retry-loop-with-no-backoff-that-always-chains-then)*

### 7. Does `setTimeout(fn, 0)` run "immediately"? Why is it still useful in the chunking pattern?

**Answer:** No, and the name is a bit of a lie. It still has to wait for the current call stack to finish and for the entire microtask queue to drain first, and even then it's only guaranteed some minimum delay — commonly clamped to around 4ms once you're nesting timeouts — never actually zero. Its real value in a chunking pattern has nothing to do with speed. What it actually buys you is that scheduling it forces the current function to return right now, which empties the call stack and lets the browser paint and handle pending input before the next chunk of work even starts.

*Source: [06-Event-Loop-and-Concurrency.md#7-does-settimeoutfn-0-run-immediately-why-is-it-still-useful-in-the-chunking-pattern](06-Event-Loop-and-Concurrency.md#7-does-settimeoutfn-0-run-immediately-why-is-it-still-useful-in-the-chunking-pattern)*

### 8. Why does `useLayoutEffect` need to exist separately from `useEffect` — isn't "after render" the same either way?

**Answer:** No, and the timing difference is exactly the point. `useLayoutEffect` runs synchronously right after the DOM commit but before the browser is allowed to paint — same call-stack turn — so it can measure or adjust layout with zero visible flicker. `useEffect` is deliberately deferred until after paint, scheduled roughly like a macrotask. So if you used `useEffect` to adjust layout instead, the user would briefly see one flickery frame of the unadjusted state before the effect quietly corrects it a moment later.

*Source: [06-Event-Loop-and-Concurrency.md#8-why-does-uselayouteffect-need-to-exist-separately-from-useeffect-—-isnt-after-render-the-same-either-way](06-Event-Loop-and-Concurrency.md#8-why-does-uselayouteffect-need-to-exist-separately-from-useeffect-—-isnt-after-render-the-same-either-way)*

### 9. Why is it a performance mistake to do expensive work like a network call inside `useLayoutEffect`?

**Answer:** Because `useLayoutEffect` runs before the browser is allowed to paint at all, so any slow synchronous work stuffed inside it directly blocks the very next frame the user would see. Mechanically it's the exact same problem as a long synchronous loop freezing the tab — just triggered from inside a hook instead of an event handler. `useEffect` exists precisely to give that category of work — fetches, subscriptions, logging — a place to run that doesn't hold up paint, since it's scheduled to fire only after the browser has already painted the frame.

*Source: [06-Event-Loop-and-Concurrency.md#9-why-is-it-a-performance-mistake-to-do-expensive-work-like-a-network-call-inside-uselayouteffect](06-Event-Loop-and-Concurrency.md#9-why-is-it-a-performance-mistake-to-do-expensive-work-like-a-network-call-inside-uselayouteffect)*

### 10. What's the scope chain, and why does it matter beyond just "closures work somehow"?

**Answer:** Every execution context keeps a pointer back to its outer scope, and looking up a variable that isn't local just walks that chain outward, step by step — current function, then its enclosing function or functions, then global — until it finds a match or runs out of chain and throws a `ReferenceError`. It matters for two practical reasons: a deeply nested callback structure has to walk further on every single lookup, which is a real, if minor, cost — and it's the exact mechanism that explains why an inner function can still read a variable from an outer function even after that outer function has already returned and finished.

*Source: [06-Event-Loop-and-Concurrency.md#10-whats-the-scope-chain-and-why-does-it-matter-beyond-just-closures-work-somehow](06-Event-Loop-and-Concurrency.md#10-whats-the-scope-chain-and-why-does-it-matter-beyond-just-closures-work-somehow)*

## [7. Promises & Async/Await](07-Promises-Async-Await.md)

### 1. Why can a promise only settle once, and why does that matter in practice?

**Answer:** Think "settle once, forever locked" — a promise starts out pending and transitions to fulfilled or rejected exactly one time; any further calls to `resolve` or `reject` after that just get silently ignored. This matters in practice because it's what makes promises safe to share. Multiple different consumers can `.then()` off the exact same in-flight promise, and every one of them is guaranteed to see the same, single, consistent outcome — even if the underlying operation's completion callback somehow fires more than once, like a flaky webhook retry.

*Source: [07-Promises-Async-Await.md#1-why-can-a-promise-only-settle-once-and-why-does-that-matter-in-practice](07-Promises-Async-Await.md#1-why-can-a-promise-only-settle-once-and-why-does-that-matter-in-practice)*

### 2. How does promise chaining solve callback hell, mechanically?

**Answer:** It flattens nesting into a straight line, mechanically. Every `.then()` call returns a brand-new promise, and if the handler you passed to `.then()` itself returns another promise, the chain automatically waits on it and flattens the result — instead of nesting a new callback inside the previous one, the way old-school callbacks did. That turns what used to be N levels of nested callbacks, each needing its own error handling, into one flat sequence of `.then()` calls with a single `.catch()` at the very end.

*Source: [07-Promises-Async-Await.md#2-how-does-promise-chaining-solve-callback-hell-mechanically](07-Promises-Async-Await.md#2-how-does-promise-chaining-solve-callback-hell-mechanically)*

### 3. Is `async`/`await` faster than `.then()` chains?

**Answer:** No — it's purely a readability upgrade, not a performance one. Under the hood they run identically, because `async`/`await` is just syntactic sugar sitting on top of the exact same promise machinery and microtask scheduling. What you actually gain is cleaner control flow: ordinary `try/catch`, loops, and conditionals all work around an `await`ed call the same natural way they do around plain synchronous code — something a `.then()` chain can't offer nearly as gracefully.

*Source: [07-Promises-Async-Await.md#3-is-asyncawait-faster-than-then-chains](07-Promises-Async-Await.md#3-is-asyncawait-faster-than-then-chains)*

### 4. What's the difference between catching an error with `try/catch` around `await` versus `.catch()` on the promise chain?

**Answer:** For the `await`s actually inside that `try` block, they're equivalent — a `try/catch` wrapped around one or more `await`s behaves exactly like a `.catch()` attached to the chain up to that point. The real trap is a `.catch()` sitting in the *middle* of a chain: unless it explicitly re-throws, it silently converts the rejection back into a success for everything downstream. That's genuinely useful for fallback logic, like serving cached data on failure — but it's a real bug if you actually meant that `.catch()` to be the final error handler and just forgot it swallows the error instead.

*Source: [07-Promises-Async-Await.md#4-whats-the-difference-between-catching-an-error-with-trycatch-around-await-versus-catch-on-the-promise-chain](07-Promises-Async-Await.md#4-whats-the-difference-between-catching-an-error-with-trycatch-around-await-versus-catch-on-the-promise-chain)*

### 5. When would you use `Promise.all()` versus `Promise.allSettled()`?

**Answer:** All-or-nothing versus best-effort — that's the choice. Use `Promise.all()` when every single result is genuinely required and one failure should abort the whole operation: a profile page that needs both the user and their orders, where showing one without knowing the status of the other is worse than just showing a clean error. Use `Promise.allSettled()` when the operations are independent and partial success is still valuable — like dashboard widgets that should each render or fail entirely on their own, without one broken widget blanking out the whole page.

*Source: [07-Promises-Async-Await.md#5-when-would-you-use-promiseall-versus-promiseallsettled](07-Promises-Async-Await.md#5-when-would-you-use-promiseall-versus-promiseallsettled)*

### 6. What's the actual difference between `Promise.race()` and `Promise.any()`?

**Answer:** `Promise.race()` doesn't care whether the winner succeeded or failed — it settles on whatever finishes first, period, so a request that fails fast can "win" the race with a rejection. `Promise.any()` is pickier: it specifically waits for the first *success*, and only rejects — with an `AggregateError` — if literally every input promise rejects. That makes `Promise.any()` the right tool for redundant fallback sources, like a set of regional API replicas, where what you actually want is the first success, not just whichever response arrives first.

*Source: [07-Promises-Async-Await.md#6-whats-the-actual-difference-between-promiserace-and-promiseany](07-Promises-Async-Await.md#6-whats-the-actual-difference-between-promiserace-and-promiseany)*

### 7. What's wrong with `await`ing inside a `for` loop over independent requests, and how do you fix it?

**Answer:** It secretly turns parallel work into a slow, serial line. Each `await` pauses the loop and waits for that iteration's request to fully finish before the next one even starts — so requests that have nothing to do with each other end up serialized anyway, and your total latency becomes the sum of every single one instead of just the slowest. The fix: kick off every request first, typically with `.map()` to build an array of in-flight promises, and only then await them all together with `Promise.all()`. That way the total time is roughly the duration of the slowest single request, not the sum of all of them.

*Source: [07-Promises-Async-Await.md#7-whats-wrong-with-awaiting-inside-a-for-loop-over-independent-requests-and-how-do-you-fix-it](07-Promises-Async-Await.md#7-whats-wrong-with-awaiting-inside-a-for-loop-over-independent-requests-and-how-do-you-fix-it)*

### 8. If you forget to `await` or `.catch()` a promise-returning call, what actually happens?

**Answer:** The call still fires — it's not skipped — but its result and any rejection become completely disconnected from the caller, floating off with nobody listening. If it rejects, that becomes an unhandled promise rejection: browsers log a warning and fire an `unhandledrejection` event, and modern Node can actually crash the process by default. This is a genuine "fire and forget" bug, not just a style nitpick — especially dangerous for calls with real side effects that the caller is silently assuming completed successfully.

*Source: [07-Promises-Async-Await.md#8-if-you-forget-to-await-or-catch-a-promise-returning-call-what-actually-happens](07-Promises-Async-Await.md#8-if-you-forget-to-await-or-catch-a-promise-returning-call-what-actually-happens)*

### 9. Does `Promise.all()` cancel the other requests once one of them rejects?

**Answer:** No, and this is an easy thing to assume wrongly. `Promise.all()` itself immediately rejects and stops waiting the moment any one input rejects — but the other promises don't stop, they just keep quietly running to completion in the background. There's nothing in `Promise.all()` that cancels anything. If you actually need the underlying work to stop, like an in-flight `fetch`, you have to wire in something like `AbortController` yourself, separately.

*Source: [07-Promises-Async-Await.md#9-does-promiseall-cancel-the-other-requests-once-one-of-them-rejects](07-Promises-Async-Await.md#9-does-promiseall-cancel-the-other-requests-once-one-of-them-rejects)*

## [8. Debounce, Throttle, and Error Handling](08-Debounce-Throttle-and-Error-Handling.md)

### 1. What's the concrete difference between debounce and throttle, and how do you pick between them?

**Answer:** Easy way to keep them apart: debounce waits for silence, throttle enforces a steady drip. Debounce delays execution until calls actually stop arriving for `delay` milliseconds, resetting its timer on every new call — it only cares about the final state after a burst, like a search box firing exactly one request once the user pauses typing. Throttle instead guarantees execution happens at most once every `delay` milliseconds, no matter how many calls come in. That fits continuous streams like `scroll` or `mousemove`, where you need steady, periodic updates throughout the activity, not just a single update at the very end.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#1-whats-the-concrete-difference-between-debounce-and-throttle-and-how-do-you-pick-between-them](08-Debounce-Throttle-and-Error-Handling.md#1-whats-the-concrete-difference-between-debounce-and-throttle-and-how-do-you-pick-between-them)*

### 2. In your throttle implementation, why is a trailing-edge call necessary in addition to the leading-edge call?

**Answer:** Because a leading-edge-only throttle can leave the UI stuck on stale data. It fires on the very first event of a burst, then ignores everything else until the window elapses — so if activity stops partway through that window, the very last event's data never gets processed at all. Scheduling a trailing timeout fixes that: it captures that final call so the UI ends up reflecting the true end state, like the actual final scroll position, instead of freezing on whatever stale data the last leading-edge call happened to have.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#2-in-your-throttle-implementation-why-is-a-trailing-edge-call-necessary-in-addition-to-the-leading-edge-call](08-Debounce-Throttle-and-Error-Handling.md#2-in-your-throttle-implementation-why-is-a-trailing-edge-call-necessary-in-addition-to-the-leading-edge-call)*

### 3. Does `finally` run if the `try` block contains a `return` statement, and what's the one case where `finally` can silently override the outcome?

**Answer:** Yes — `finally` always runs, even after a `return`. The `return` value gets computed first, `finally` executes next, and only after that does control actually leave the function. The one case where `finally` can override the outcome: if `finally` itself contains its own `return` or `throw`, that silently replaces whatever the `try`/`catch` was about to produce. That's exactly why returning from `finally` is considered a footgun, and it's generally avoided.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#3-does-finally-run-if-the-try-block-contains-a-return-statement-and-whats-the-one-case-where-finally-can-silently-override-the-outcome](08-Debounce-Throttle-and-Error-Handling.md#3-does-finally-run-if-the-try-block-contains-a-return-statement-and-whats-the-one-case-where-finally-can-silently-override-the-outcome)*

### 4. Why does wrapping an `await`ed call in `try/catch` work, but wrapping a `.then()`-chained call in the same `try/catch` doesn't catch anything?

**Answer:** It comes down to timing — is the `try` block still around when the rejection happens? `await` suspends the function right there, and when the awaited promise rejects, it re-throws that rejection synchronously, right at the `await` line — so it behaves exactly like a normal thrown exception, and the surrounding `try/catch` catches it cleanly. A `.then()` call works completely differently: it schedules its callback for some future microtask, and by the time that rejection actually happens, the `try` block has already finished executing and moved on. There's simply nothing left there to catch it.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#4-why-does-wrapping-an-awaited-call-in-trycatch-work-but-wrapping-a-then-chained-call-in-the-same-trycatch-doesnt-catch-anything](08-Debounce-Throttle-and-Error-Handling.md#4-why-does-wrapping-an-awaited-call-in-trycatch-work-but-wrapping-a-then-chained-call-in-the-same-trycatch-doesnt-catch-anything)*

### 5. Why build a custom `Error` subclass hierarchy for a fetch wrapper instead of throwing plain `Error` with different messages?

**Answer:** Because typed errors let calling code make decisions safely, instead of guessing from a string. With subclasses like `ValidationError`, `NetworkError`, `HttpError`, and `UnauthorizedError`, calling code can branch cleanly with `instanceof` — redirect to login on `UnauthorizedError`, show field-level messages on `ValidationError`, show a generic retry toast on `NetworkError` — instead of fragile string-matching against `error.message`, which breaks the moment someone tweaks the wording. It also gives each subtype a natural place to carry structured data specific to that failure, like an HTTP `status` code or a `fieldErrors` map — something a flat `Error` just has nowhere to hold.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#5-why-build-a-custom-error-subclass-hierarchy-for-a-fetch-wrapper-instead-of-throwing-plain-error-with-different-messages](08-Debounce-Throttle-and-Error-Handling.md#5-why-build-a-custom-error-subclass-hierarchy-for-a-fetch-wrapper-instead-of-throwing-plain-error-with-different-messages)*

### 6. What's the practical difference between `fetch()` rejecting and `fetch()` resolving with a non-2xx status?

**Answer:** `fetch()` only calls it a rejection when the request never actually completed — being offline, a DNS failure, a CORS block. From `fetch()`'s point of view, a 404 or a 500 is still a completely *successful* HTTP round trip — the request went out, a response came back, job done. So it resolves normally, just with `response.ok === false`. You have to check `response.ok`, or `response.status`, yourself and throw your own error if you actually want a bad status code treated as a failure.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#6-whats-the-practical-difference-between-fetch-rejecting-and-fetch-resolving-with-a-non-2xx-status](08-Debounce-Throttle-and-Error-Handling.md#6-whats-the-practical-difference-between-fetch-rejecting-and-fetch-resolving-with-a-non-2xx-status)*

### 7. What is an unhandled promise rejection, and what should a production app do about it?

**Answer:** It's a rejection nobody ever caught — a promise that rejected without any `.catch()` handler, and without an `await` sitting inside a `try/catch`, ever being attached to it. In the browser this fires a `window.unhandledrejection` event; in Node it fires `process.on('unhandledRejection', ...)`, and depending on how Node is configured, it can actually terminate the process. A production app should still attach a global listener for this — but only as a last-resort safety net that logs the failure to monitoring. It should never be your primary error-handling strategy, because by the time an error reaches that handler, you've lost the specific context you'd need to actually recover or show the user something useful.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#7-what-is-an-unhandled-promise-rejection-and-what-should-a-production-app-do-about-it](08-Debounce-Throttle-and-Error-Handling.md#7-what-is-an-unhandled-promise-rejection-and-what-should-a-production-app-do-about-it)*

### 8. Why does `error.cause` (or manually attaching the original error) matter when wrapping errors in a fetch wrapper?

**Answer:** Without it, you throw away exactly the detail you'd need to debug the real problem. Catching a low-level network failure and throwing a new `NetworkError` on top of it loses the original stack trace and the actual underlying reason — was it "Failed to fetch," or a specific DNS error? Whoever ends up debugging the log is left staring at only the wrapper's generic message. Passing it as `super(message, { cause })`, the ES2022 syntax, preserves the entire original error object on `.cause` instead — the same reasoning behind exception chaining with `super(message, cause)` in Java.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#8-why-does-errorcause-or-manually-attaching-the-original-error-matter-when-wrapping-errors-in-a-fetch-wrapper](08-Debounce-Throttle-and-Error-Handling.md#8-why-does-errorcause-or-manually-attaching-the-original-error-matter-when-wrapping-errors-in-a-fetch-wrapper)*

### 9. What's a real bug that `var` vs closures aside — leading-edge-only throttling — causes in a scroll handler, and how do you fix it?

**Answer:** A sticky header or a progress bar that's visually stuck one step behind is the real bug here. If the throttle only fires on the leading edge, the layout recalculation runs at the start of each throttle window, but the true final scroll position — the one reached right after the user actually stops scrolling — never triggers a recalculation of its own. The fix is adding a trailing-edge `setTimeout` that fires one more time after the throttle window closes, using whatever arguments were most recently seen. That guarantees the last event always eventually gets processed, so the UI never gets left showing stale data.

*Source: [08-Debounce-Throttle-and-Error-Handling.md#9-whats-a-real-bug-that-var-vs-closures-aside-—-leading-edge-only-throttling-—-causes-in-a-scroll-handler-and-how-do-you-fix-it](08-Debounce-Throttle-and-Error-Handling.md#9-whats-a-real-bug-that-var-vs-closures-aside-—-leading-edge-only-throttling-—-causes-in-a-scroll-handler-and-how-do-you-fix-it)*

## [9. Memory Management, Garbage Collection, and WeakMap/WeakSet](09-Memory-Management-GC-WeakMap.md)

### 1. What algorithm do JS engines use for garbage collection, and how does it decide what to free?

**Answer:** Mark-and-sweep — think of it as a game of tag starting from a fixed set of "roots." Starting from those roots — globals, the active call stack — the collector tags every object it can reach by following references, then sweeps away, frees, everything that never got tagged. The one thing to really hold onto: what matters is reachability from the roots, full stop. Not whether a variable technically "went out of scope," and not whether two objects reference each other in a cycle.

*Source: [09-Memory-Management-GC-WeakMap.md#1-what-algorithm-do-js-engines-use-for-garbage-collection-and-how-does-it-decide-what-to-free](09-Memory-Management-GC-WeakMap.md#1-what-algorithm-do-js-engines-use-for-garbage-collection-and-how-does-it-decide-what-to-free)*

### 2. Can two objects that reference each other ever be garbage collected?

**Answer:** Yes, absolutely — mark-and-sweep handles unreachable cycles just fine, which is a real improvement over older reference-counting collectors, like the infamous IE6 DOM/COM leak. If neither object in a two-way reference cycle is reachable from any root, both of them get swept away in the same pass. The reason it works is that reachability is computed from the roots inward, not by counting how many inbound pointers each object has.

*Source: [09-Memory-Management-GC-WeakMap.md#2-can-two-objects-that-reference-each-other-ever-be-garbage-collected](09-Memory-Management-GC-WeakMap.md#2-can-two-objects-that-reference-each-other-ever-be-garbage-collected)*

### 3. What is a detached DOM node, and why does it leak memory?

**Answer:** It's an element that's gone from the page but not gone from memory. Concretely: it's an element removed from the visible document tree — via `.remove()`, `removeChild`, or replacing `innerHTML` — that some JS variable, closure, or cache still holds a reference to. Because that reference is still reachable from a root, the GC can't sweep the node — and critically, it also can't sweep the rest of the subtree still hanging underneath it. The fix is you have to explicitly null out every reference into a removed subtree; simply removing it from the document isn't enough on its own.

*Source: [09-Memory-Management-GC-WeakMap.md#3-what-is-a-detached-dom-node-and-why-does-it-leak-memory](09-Memory-Management-GC-WeakMap.md#3-what-is-a-detached-dom-node-and-why-does-it-leak-memory)*

### 4. Why do forgotten `setInterval` calls or `addEventListener` calls on unmounted React components cause leaks?

**Answer:** Because `window`, `document`, and the browser's internal timer queue are effectively GC roots themselves — anything they hold a live reference to is reachable forever, permanently. So an interval callback, or a `resize` listener registered inside a `useEffect` without a matching `clearInterval` or `removeEventListener` in its cleanup function, keeps its entire closure alive after the component unmounts — including any state or props it captured. Every ticker or listener still firing after its component is gone is memory that's never coming back.

*Source: [09-Memory-Management-GC-WeakMap.md#4-why-do-forgotten-setinterval-calls-or-addeventlistener-calls-on-unmounted-react-components-cause-leaks](09-Memory-Management-GC-WeakMap.md#4-why-do-forgotten-setinterval-calls-or-addeventlistener-calls-on-unmounted-react-components-cause-leaks)*

### 5. How does a closure leak memory even if the leaked object is never used inside the closure?

**Answer:** Because a closure drags its whole neighborhood along, not just the one variable it's actually using. A closure captures the entire enclosing scope, not merely the specific variables it references — so if a large object, like a raw API payload, was declared in the same function as a callback that gets kept alive long-term, say attached to a persistent button's `onclick`, that whole large object stays reachable through the scope chain for as long as the callback exists, even though the callback never touches it. The fix is moving that long-lived callback into its own smaller, separate function scope that only receives the one small value it actually needs.

*Source: [09-Memory-Management-GC-WeakMap.md#5-how-does-a-closure-leak-memory-even-if-the-leaked-object-is-never-used-inside-the-closure](09-Memory-Management-GC-WeakMap.md#5-how-does-a-closure-leak-memory-even-if-the-leaked-object-is-never-used-inside-the-closure)*

### 6. What makes a `WeakMap` different from a `Map`, mechanically?

**Answer:** Strong grip versus loose grip on the keys — that's the whole difference. A `Map` holds strong references to its keys and values, so anything stored in it stays reachable, and therefore never collected, for as long as the `Map` itself exists — even after every other reference to that key has vanished elsewhere. A `WeakMap` holds weak references to its keys instead: a weak reference simply doesn't count during the GC's mark phase. So once a key object has no other reachable references anywhere else, GC collects it, and its `WeakMap` entry just disappears automatically — no `.delete()` call ever needed.

*Source: [09-Memory-Management-GC-WeakMap.md#6-what-makes-a-weakmap-different-from-a-map-mechanically](09-Memory-Management-GC-WeakMap.md#6-what-makes-a-weakmap-different-from-a-map-mechanically)*

### 7. Why can't you use a string or number as a `WeakMap` key?

**Answer:** Because primitives simply don't have the concept of "reachability" that `WeakMap` depends on. There's no single heap allocation for the number `5` that could ever become "unreachable" and get swept — JS engines are free to represent and duplicate primitive values however they like. `WeakMap`'s entire mechanism only works because the key is an object whose reachability the GC can actually track, which is exactly why the spec requires object keys — or symbol keys, as of ES2023.

*Source: [09-Memory-Management-GC-WeakMap.md#7-why-cant-you-use-a-string-or-number-as-a-weakmap-key](09-Memory-Management-GC-WeakMap.md#7-why-cant-you-use-a-string-or-number-as-a-weakmap-key)*

### 8. Give a real, non-toy use case for `WeakMap` and explain why a regular `Map` would be wrong there.

**Answer:** A good real one is caching per-DOM-node computed data — say, a virtualized list caching each row element's measured height, keyed by the row element itself. Rows in that kind of list are constantly being created and destroyed as the user scrolls. With a regular `Map`, every removed row's cache entry would need an explicit `.delete()` call at every single removal code path, and missing even one of them leaks that DOM node forever. A `WeakMap` sidesteps the whole problem — it releases the entry automatically the instant the row element itself is no longer referenced anywhere else, with no manual cleanup required.

*Source: [09-Memory-Management-GC-WeakMap.md#8-give-a-real-non-toy-use-case-for-weakmap-and-explain-why-a-regular-map-would-be-wrong-there](09-Memory-Management-GC-WeakMap.md#8-give-a-real-non-toy-use-case-for-weakmap-and-explain-why-a-regular-map-would-be-wrong-there)*

### 9. Why are `WeakMap` and `WeakSet` not iterable and have no `.size`?

**Answer:** Because the exact set of entries at any given moment depends on when the garbage collector last happened to run — and GC timing is deliberately unobservable and left implementation-defined in the spec. If `.size` or iteration were allowed, that count would be unpredictable and non-deterministic across different engines and even different runs of the same code. So the spec just doesn't expose iteration or a count on weak collections at all — there's nothing reliable it could report.

*Source: [09-Memory-Management-GC-WeakMap.md#9-why-are-weakmap-and-weakset-not-iterable-and-have-no-size](09-Memory-Management-GC-WeakMap.md#9-why-are-weakmap-and-weakset-not-iterable-and-have-no-size)*

### 10. You suspect a React SPA leaks memory on every route navigation. Walk through how you'd confirm and locate it in Chrome DevTools.

**Answer:** Here's the walkthrough, step by step. First, take a baseline heap snapshot once the app has settled. Then navigate into and out of the suspect route several times, force a manual GC with the trash-can icon, and take a second snapshot. Open the Comparison view — the signature you're looking for is a `Delta` count on some object type that keeps growing proportionally to the number of navigation cycles, not just a one-time bump. Next, filter for "Detached" to catch leaked DOM subtrees specifically. Finally, expand the "Retainers" panel on one of them to see the exact reference chain keeping it alive — a closure, a stale cache, a forgotten listener — and that chain tells you precisely what to null out or unsubscribe.

*Source: [09-Memory-Management-GC-WeakMap.md#10-you-suspect-a-react-spa-leaks-memory-on-every-route-navigation-walk-through-how-youd-confirm-and-locate-it-in-chrome-devtools](09-Memory-Management-GC-WeakMap.md#10-you-suspect-a-react-spa-leaks-memory-on-every-route-navigation-walk-through-how-youd-confirm-and-locate-it-in-chrome-devtools)*

## [10. Browser APIs: Fetch, Storage, and Web Workers](10-Browser-APIs-Fetch-Storage-Workers.md)

### 1. Why doesn't a `fetch()` promise reject on a `404` or `500` response?

**Answer:** Because as far as the browser is concerned, a `404` or `500` means the round trip *worked*. `fetch()` only rejects on a genuine network-level failure — a DNS resolution failure, a dropped connection, a CORS block — because the HTTP request-response cycle actually completed; the server just happened to return an error status. So you have to check `response.ok`, or `response.status`, explicitly yourself. Otherwise a `try/catch` wrapped around `fetch()` will silently let every `4xx`/`5xx` response flow straight into your success path.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#1-why-doesnt-a-fetch-promise-reject-on-a-404-or-500-response](10-Browser-APIs-Fetch-Storage-Workers.md#1-why-doesnt-a-fetch-promise-reject-on-a-404-or-500-response)*

### 2. Walk through how `AbortController` prevents a stale search result from overwriting a fresh one.

**Answer:** The trick is: cancel the old one before you even start the new one. Each keystroke creates a fresh `AbortController`, but right before doing that, the handler calls `.abort()` on whatever controller is still active from the previous keystroke. That makes the in-flight fetch for the old query reject with an `AbortError`, which the `catch` block recognizes and silently swallows — so only the response for the most recent query ever actually reaches `renderResults`. Without this, a slower earlier request could resolve *after* a faster later one and clobber the correct results right there on screen.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#2-walk-through-how-abortcontroller-prevents-a-stale-search-result-from-overwriting-a-fresh-one](10-Browser-APIs-Fetch-Storage-Workers.md#2-walk-through-how-abortcontroller-prevents-a-stale-search-result-from-overwriting-a-fresh-one)*

### 3. How do you decide between `localStorage`, `sessionStorage`, and a cookie for a given piece of data?

**Answer:** Ask one question first: does the server need this automatically on every request? If yes, it has to be a cookie — that's the only one of the three the browser actually attaches to outgoing requests on its own. If it's purely UI-only state, split it by lifetime: something that should survive closing the browser, like a theme preference, goes in `localStorage`; something scoped to one tab and fine to lose, like an in-progress checkout form, goes in `sessionStorage`. One more reason cookies matter for anything security-sensitive, like a session token: they're the only one of the three that supports `HttpOnly`.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#3-how-do-you-decide-between-localstorage-sessionstorage-and-a-cookie-for-a-given-piece-of-data](10-Browser-APIs-Fetch-Storage-Workers.md#3-how-do-you-decide-between-localstorage-sessionstorage-and-a-cookie-for-a-given-piece-of-data)*

### 4. Why is IndexedDB asynchronous while `localStorage` is synchronous, and why does that distinction matter?

**Answer:** It comes down to scale. `localStorage` reads and writes block the main thread, and that's tolerable only because it's designed to hold small strings. IndexedDB is built for large structured datasets, potentially gigabytes of data, so a synchronous API there would freeze the whole page during any real query — that's just not acceptable at that size. Because IndexedDB is async and transactional instead, you can safely store and query large offline datasets, like a full local cache of records for a PWA, without janking scrolling or input while the query is running in the background.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#4-why-is-indexeddb-asynchronous-while-localstorage-is-synchronous-and-why-does-that-distinction-matter](10-Browser-APIs-Fetch-Storage-Workers.md#4-why-is-indexeddb-asynchronous-while-localstorage-is-synchronous-and-why-does-that-distinction-matter)*

### 5. What can a Web Worker not do, and why is that restriction there?

**Answer:** A Web Worker is deliberately boxed in: no access to the DOM, no `window`, no `document`, no `localStorage` or `sessionStorage`, and no access to the main thread's variables at all, except for whatever's explicitly passed over via `postMessage`. The DOM restriction specifically exists because the DOM simply isn't thread-safe — letting a second thread mutate it would reintroduce exactly the kind of race conditions that single-threaded JS was designed to avoid in the first place.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#5-what-can-a-web-worker-not-do-and-why-is-that-restriction-there](10-Browser-APIs-Fetch-Storage-Workers.md#5-what-can-a-web-worker-not-do-and-why-is-that-restriction-there)*

### 6. What actually travels across `postMessage`, and how does a `Transferable` differ from a normal message?

**Answer:** Copy versus handoff — that's the difference. A normal message gets deep-copied via the structured clone algorithm, so the receiving side gets its own fully independent copy, and mutating it never affects the sender's original object. A `Transferable`, like an `ArrayBuffer`, works completely differently: it hands ownership of the underlying memory straight over to the other side with zero copying involved. That's exactly why it's used for large binary payloads, where copying would be expensive — but the trade-off is the sending side loses access to it entirely once it's transferred.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#6-what-actually-travels-across-postmessage-and-how-does-a-transferable-differ-from-a-normal-message](10-Browser-APIs-Fetch-Storage-Workers.md#6-what-actually-travels-across-postmessage-and-how-does-a-transferable-differ-from-a-normal-message)*

### 7. When would you reach for a Web Worker instead of just making something `async`?

**Answer:** It's waiting versus actually working — those are two different problems, and only one of them needs a worker. `async`/`await` and Promises solve *I/O-bound* waiting: the main thread stays free while a network request or timer is pending, because there's no actual CPU work happening during that wait. A Web Worker solves the other problem, *CPU-bound* work — a genuinely expensive synchronous computation, like parsing a huge CSV or running encryption, that would otherwise occupy the main thread's one and only execution context and freeze the UI no matter how you dress it up in a Promise.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#7-when-would-you-reach-for-a-web-worker-instead-of-just-making-something-async](10-Browser-APIs-Fetch-Storage-Workers.md#7-when-would-you-reach-for-a-web-worker-instead-of-just-making-something-async)*

### 8. What's the difference between a Web Worker and a Service Worker?

**Answer:** They sound similar but solve totally different problems. A Web Worker is a general-purpose background thread for offloading CPU-heavy computation, and it lives only as long as the page that created it stays open. A Service Worker is something more specialized — it sits as a network proxy between the page, the network, and the cache. It can intercept `fetch` requests, serve cached responses offline, and it keeps running in the background even after the tab is closed. That's exactly what powers PWA offline mode and push notifications — but it was never meant for arbitrary heavy computation the way a Web Worker is.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#8-whats-the-difference-between-a-web-worker-and-a-service-worker](10-Browser-APIs-Fetch-Storage-Workers.md#8-whats-the-difference-between-a-web-worker-and-a-service-worker)*

### 9. If `HttpOnly` blocks JavaScript from ever reading a cookie, what's the actual security benefit?

**Answer:** It specifically defends against XSS, and that's actually a big deal. If an attacker manages to inject a malicious script into your page, that script runs with full JS privileges — but it still can't read `document.cookie` for an `HttpOnly` cookie. So even though the attacker's script can run arbitrary code, it can't exfiltrate the session token. It's not a defense against every attack — CSRF still needs `SameSite` on top of it — but it closes off the single most common path to session hijacking: stealing the cookie via an injected script.

*Source: [10-Browser-APIs-Fetch-Storage-Workers.md#9-if-httponly-blocks-javascript-from-ever-reading-a-cookie-whats-the-actual-security-benefit](10-Browser-APIs-Fetch-Storage-Workers.md#9-if-httponly-blocks-javascript-from-ever-reading-a-cookie-whats-the-actual-security-benefit)*

## [11. Networking: HTTP, Cookies, Caching, and CORS](11-Networking-HTTP-Cookies-Caching-CORS.md)

### 1. What does CORS actually block?

**Answer:** Here's the thing everyone gets wrong: CORS never stops the request from reaching the server at all. The server still processes it, and any side effects — writes, emails, charges — still happen exactly as if nothing was blocked. What CORS actually blocks is the browser handing the *response* back to your JavaScript, because the server never granted that origin permission. That's exactly why a "CORS error" on a `POST` can still mean the resource got created successfully behind the scenes — you have to check the server directly, never assume nothing happened just because the browser threw an error.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#1-what-does-cors-actually-block](11-Networking-HTTP-Cookies-Caching-CORS.md#1-what-does-cors-actually-block)*

### 2. When does the browser send a CORS preflight, and what is in it?

**Answer:** Whenever the request isn't a plain "simple request" — most commonly a JSON `POST` with `Content-Type: application/json`, or anything carrying a custom header like `Authorization`. In that case the browser first sends an `OPTIONS` request as a preflight, carrying `Origin`, `Access-Control-Request-Method`, and `Access-Control-Request-Headers`. It only actually fires the real request afterward if the server's response comes back with matching `Access-Control-Allow-*` headers.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#2-when-does-the-browser-send-a-cors-preflight-and-what-is-in-it](11-Networking-HTTP-Cookies-Caching-CORS.md#2-when-does-the-browser-send-a-cors-preflight-and-what-is-in-it)*

### 3. Why doesn't `Access-Control-Allow-Origin: *` work with cookies?

**Answer:** Because browsers treat the wildcard plus credentials combination as too dangerous to allow. Whenever a request carries credentials — cookies or HTTP auth — browsers require an exact, specific origin in `Access-Control-Allow-Origin`, plus `Access-Control-Allow-Credentials: true`, and they flatly refuse the wildcard in that case. The reason: allowing a wildcard alongside credentials would let literally any website read cookie-authenticated data from your API on a logged-in user's behalf — which is exactly the cross-site data leak the Same-Origin Policy exists to prevent in the first place.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#3-why-doesnt-access-control-allow-origin-work-with-cookies](11-Networking-HTTP-Cookies-Caching-CORS.md#3-why-doesnt-access-control-allow-origin-work-with-cookies)*

### 4. What is the difference between the Same-Origin Policy and CORS?

**Answer:** SOP is the lock, CORS is the key a server can choose to hand out. The Same-Origin Policy is the browser's default restriction — JavaScript on one origin simply cannot read responses from another origin, full stop. CORS is the opt-in mechanism a server uses to deliberately relax that restriction for specific origins, methods, and headers, by sending back `Access-Control-Allow-*` response headers. So SOP is always on by default; CORS is what a server does to selectively unlock it.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#4-what-is-the-difference-between-the-same-origin-policy-and-cors](11-Networking-HTTP-Cookies-Caching-CORS.md#4-what-is-the-difference-between-the-same-origin-policy-and-cors)*

### 5. `HttpOnly` vs `Secure` vs `SameSite` on a cookie — what does each one actually stop?

**Answer:** Three flags, three completely different attacks blocked. `HttpOnly` stops JavaScript from reading the cookie through `document.cookie` at all, which blocks a successful XSS payload from stealing the session token. `Secure` stops the cookie from ever being sent over plain HTTP, which blocks network eavesdropping. `SameSite=Lax` or `Strict` stops the cookie from being attached to cross-site requests, which blocks CSRF attacks — like an attacker's page silently submitting a form to your authenticated API using the victim's own cookie.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#5-httponly-vs-secure-vs-samesite-on-a-cookie-—-what-does-each-one-actually-stop](11-Networking-HTTP-Cookies-Caching-CORS.md#5-httponly-vs-secure-vs-samesite-on-a-cookie-—-what-does-each-one-actually-stop)*

### 6. What's the difference between `Cache-Control: no-cache` and `no-store`?

**Answer:** Despite the confusingly similar names, they mean very different things. `no-cache` actually still allows the response to be stored — it just forces revalidation with the server, via `ETag` or `Last-Modified`, before that stored copy can be reused, so a match still comes back as a fast `304` instead of the full body. `no-store` is the strict one: it forbids caching the response anywhere at all, no exceptions, which is exactly what you'd set on a page showing a bank balance or a one-time payment token.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#6-whats-the-difference-between-cache-control-no-cache-and-no-store](11-Networking-HTTP-Cookies-Caching-CORS.md#6-whats-the-difference-between-cache-control-no-cache-and-no-store)*

### 7. How would you set caching headers for a React production deployment?

**Answer:** Split it in two, by what actually changes. Give hashed static assets, like `main.4b2c8e9f.js`, `Cache-Control: public, max-age=31536000, immutable` — since the filename itself changes whenever the content does, caching it forever is completely safe. Give `index.html` the opposite treatment: `Cache-Control: no-cache, must-revalidate`, because it's the one file referencing the current hashed filenames, and it needs to be re-checked with the server on every single load. Skip that, and users can get stuck on a stale deploy indefinitely.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#7-how-would-you-set-caching-headers-for-a-react-production-deployment](11-Networking-HTTP-Cookies-Caching-CORS.md#7-how-would-you-set-caching-headers-for-a-react-production-deployment)*

### 8. 401 vs 403 — how should a frontend app react differently to each?

**Answer:** "Who are you?" versus "I know who you are, and no." — that's the difference between the two. `401` means the request has no valid credentials at all, so the app's move is to try a token refresh, and if that fails, redirect to login. `403` means the credentials are perfectly valid, the server just isn't letting this user do this action — so the right response is showing a permission-denied state, never bouncing the user back through login, since logging in again does absolutely nothing for a permissions problem.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#8-401-vs-403-—-how-should-a-frontend-app-react-differently-to-each](11-Networking-HTTP-Cookies-Caching-CORS.md#8-401-vs-403-—-how-should-a-frontend-app-react-differently-to-each)*

### 9. Why is `PUT` idempotent but `POST` is not, and why does that matter for retries?

**Answer:** Send it twice, get the same result, or get two different results — that's the whole test. `PUT` replaces a resource at a known URI, so sending the exact same `PUT` twice leaves the resource in the exact same state either way — completely safe to retry. `POST` typically creates a brand-new resource every time it's called, so blindly retrying a failed `POST` — say, after a timeout where you genuinely don't know if it succeeded — can create a duplicate order or charge the customer twice. That's exactly why retry logic for `POST` needs an idempotency key, not just a naive resend.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#9-why-is-put-idempotent-but-post-is-not-and-why-does-that-matter-for-retries](11-Networking-HTTP-Cookies-Caching-CORS.md#9-why-is-put-idempotent-but-post-is-not-and-why-does-that-matter-for-retries)*

### 10. Where does `ETag` help outside of static assets?

**Answer:** Anywhere you have an API `GET` endpoint whose payload is expensive to render but rarely actually changes — a settings blob, a large list. That endpoint can send an `ETag`, and the next time the client asks with `If-None-Match`, it gets back a cheap `304` instead of the full body, as long as nothing changed. That saves both bandwidth and server render time, compared to just always returning a full `200` with the complete payload every single time.

*Source: [11-Networking-HTTP-Cookies-Caching-CORS.md#10-where-does-etag-help-outside-of-static-assets](11-Networking-HTTP-Cookies-Caching-CORS.md#10-where-does-etag-help-outside-of-static-assets)*

## [12. Authentication, OAuth, and JWT from the Frontend](12-Authentication-OAuth-JWT.md)

### 1. Why is `localStorage` considered risky for storing a JWT?

**Answer:** Because literally any JavaScript running on the page can read it — your own code, a third-party script, even a compromised npm dependency buried three layers deep. That means a single XSS vulnerability anywhere in the app is enough for an attacker to grab the entire token and reuse it from their own machine, with zero further interaction needed from the victim.

*Source: [12-Authentication-OAuth-JWT.md#1-why-is-localstorage-considered-risky-for-storing-a-jwt](12-Authentication-OAuth-JWT.md#1-why-is-localstorage-considered-risky-for-storing-a-jwt)*

### 2. If httpOnly cookies stop token theft, why doesn't everyone just use them?

**Answer:** Because they don't actually solve the whole problem — they just trade one attack for another. An httpOnly cookie really is immune to being read by JavaScript, but the browser automatically attaches it to matching requests, and that automatic attachment is exactly what reopens the door to CSRF. So now you have to add `SameSite` settings and CSRF tokens on every state-changing request. On top of that, if your app and API sit on different domains, cross-site cookie delivery gets genuinely complicated, thanks to `SameSite=None` requirements and browsers increasingly restricting third-party cookies.

*Source: [12-Authentication-OAuth-JWT.md#2-if-httponly-cookies-stop-token-theft-why-doesnt-everyone-just-use-them](12-Authentication-OAuth-JWT.md#2-if-httponly-cookies-stop-token-theft-why-doesnt-everyone-just-use-them)*

### 3. Walk me through what happens when a user clicks "Login with Google" in a React SPA.

**Answer:** Walk through it as a sequence of handoffs. First, the app generates a PKCE `code_verifier`/`code_challenge` pair plus a random `state`, then redirects the full page over to Google's authorize endpoint, carrying that challenge and `state` along. Google authenticates the user on its own domain — the app never sees the password — and redirects back to the app's callback route with an authorization `code`. The app checks that `state` matches what it originally sent, then POSTs the code plus the original `code_verifier` to the token endpoint, and that's finally where it gets back the access, ID, and refresh tokens.

*Source: [12-Authentication-OAuth-JWT.md#3-walk-me-through-what-happens-when-a-user-clicks-login-with-google-in-a-react-spa](12-Authentication-OAuth-JWT.md#3-walk-me-through-what-happens-when-a-user-clicks-login-with-google-in-a-react-spa)*

### 4. What problem does PKCE actually solve?

**Answer:** It solves the problem that a browser SPA has nowhere safe to hide a secret — the whole bundle is fully inspectable by anyone, so a static `client_secret` would just be sitting there in plain sight. PKCE fixes this by swapping that static secret for a one-time secret, the `code_verifier`, freshly generated for each individual login attempt. So even if an attacker manages to intercept the authorization code from the redirect, they still can't exchange it for tokens, because they don't have the matching verifier — that only ever lived inside the legitimate app instance.

*Source: [12-Authentication-OAuth-JWT.md#4-what-problem-does-pkce-actually-solve](12-Authentication-OAuth-JWT.md#4-what-problem-does-pkce-actually-solve)*

### 5. Why does the frontend check `state` on the OAuth callback?

**Answer:** `state` exists purely as a CSRF defense for the redirect step itself. Without it, an attacker could kick off their own OAuth flow, grab a valid authorization code for themselves, and then trick a victim into completing the callback using the attacker's code — which would actually log the victim into the attacker's account. To prevent that, the app generates a random `state`, stores it before redirecting, and simply rejects the callback outright if the returned `state` doesn't match what it originally sent.

*Source: [12-Authentication-OAuth-JWT.md#5-why-does-the-frontend-check-state-on-the-oauth-callback](12-Authentication-OAuth-JWT.md#5-why-does-the-frontend-check-state-on-the-oauth-callback)*

### 6. Can the frontend trust the `roles` claim inside a JWT for showing/hiding an admin action?

**Answer:** For UX only, never for security — that's the line to hold. The frontend can use the `roles` claim to decide what to *render*, purely for a smooth experience, but it can never be the actual security check. Two reasons: the frontend has no way to verify the token's signature, and the claim could easily be stale relative to a permission change that happened moments ago. The real gate has to live server-side — the API endpoint behind that action must independently re-validate the token and re-check authorization itself, because a hidden button is trivially bypassed with devtools or a raw HTTP call.

*Source: [12-Authentication-OAuth-JWT.md#6-can-the-frontend-trust-the-roles-claim-inside-a-jwt-for-showinghiding-an-admin-action](12-Authentication-OAuth-JWT.md#6-can-the-frontend-trust-the-roles-claim-inside-a-jwt-for-showinghiding-an-admin-action)*

### 7. How do you avoid firing five refresh requests when five API calls 401 at once?

**Answer:** Share one in-flight promise instead of letting everyone start their own. The first 401 that comes in kicks off the refresh call and stashes that pending promise somewhere shared; any of the other four 401s that arrive before it resolves just await that same shared promise instead of firing off their own separate refresh request. That prevents duplicate refresh calls from racing each other — which matters a lot when refresh tokens rotate on use, since an earlier refresh call would otherwise get invalidated by a later one winning the race.

*Source: [12-Authentication-OAuth-JWT.md#7-how-do-you-avoid-firing-five-refresh-requests-when-five-api-calls-401-at-once](12-Authentication-OAuth-JWT.md#7-how-do-you-avoid-firing-five-refresh-requests-when-five-api-calls-401-at-once)*

### 8. What's the difference between an access token and an ID token in OIDC?

**Answer:** One's meant to be read by you, the other isn't. The access token is essentially opaque to the client — the frontend just attaches it to API calls so the resource server can authorize the request, without the frontend needing to understand its contents. The ID token, by contrast, is a JWT specifically meant for the client to actually read: it carries profile claims like name and email, so the frontend can render "who's logged in" state. Only the ID token is meant to be consumed by the frontend — the access token's format is really a private contract between the Authorization Server and Resource Server.

*Source: [12-Authentication-OAuth-JWT.md#8-whats-the-difference-between-an-access-token-and-an-id-token-in-oidc](12-Authentication-OAuth-JWT.md#8-whats-the-difference-between-an-access-token-and-an-id-token-in-oidc)*

### 9. Is a JWT encrypted?

**Answer:** No, and this catches people off guard. A standard JWT, technically a JWS, is encoded and signed, not encrypted — the payload is just plain Base64URL, and anyone holding the string can decode it in seconds with `atob()` or a site like jwt.io. That's exactly why sensitive data — passwords, SSNs, secrets — should never go inside a JWT payload, even one that's supposedly only ever delivered server-to-server.

*Source: [12-Authentication-OAuth-JWT.md#9-is-a-jwt-encrypted](12-Authentication-OAuth-JWT.md#9-is-a-jwt-encrypted)*

### 10. What's the frontend's role when a refresh token call fails?

**Answer:** Treat it as a hard logout, full stop — never as something to quietly retry. Clear any in-memory access token, drop the cached user state, and redirect straight to the login screen. A failed refresh usually means one of a few things: the refresh token expired, it was revoked, or it tripped reuse detection after rotation. In every one of those cases, silently retrying would just mask a session that's genuinely, permanently gone.

*Source: [12-Authentication-OAuth-JWT.md#10-whats-the-frontends-role-when-a-refresh-token-call-fails](12-Authentication-OAuth-JWT.md#10-whats-the-frontends-role-when-a-refresh-token-call-fails)*

## [13. JavaScript Engine Internals](13-JavaScript-Engine-and-Browser-Internals.md)

### 1. What are the stages source code goes through before it actually runs in V8?

**Answer:** Four stages, roughly: source text gets lexed into tokens, parsed into an AST, then compiled to bytecode that Ignition — V8's interpreter — actually executes. Functions that get called over and over with stable, consistent input shapes then get JIT-compiled by TurboFan into optimized native machine code. Worth remembering: most functions never make it to that last stage — the bulk of any real codebase just runs fine as plain interpreted bytecode.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#1-what-are-the-stages-source-code-goes-through-before-it-actually-runs-in-v8](13-JavaScript-Engine-and-Browser-Internals.md#1-what-are-the-stages-source-code-goes-through-before-it-actually-runs-in-v8)*

### 2. What is lazy parsing, and why does it matter for a large production bundle?

**Answer:** V8 doesn't fully parse every function up front — it just skims each function body enough to find its boundaries and catch obvious syntax errors, and defers the full parse and bytecode generation until that function is actually called. The payoff: a multi-megabyte bundle containing rarely-used code, like an admin-only panel shipped alongside the main app, never pays the full parse cost for that code during a normal user's session, since most users never trigger it.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#2-what-is-lazy-parsing-and-why-does-it-matter-for-a-large-production-bundle](13-JavaScript-Engine-and-Browser-Internals.md#2-what-is-lazy-parsing-and-why-does-it-matter-for-a-large-production-bundle)*

### 3. Why does a deeply recursive function throw `Maximum call stack size exceeded` instead of just running slowly?

**Answer:** Because the call stack has a hard ceiling, not an infinite floor. Every function call pushes a new frame onto that single stack, and the engine caps its size at a fixed limit. A recursive function with no valid base case — say, a comment-thread walk that accidentally hits a cyclical parent reference — just keeps pushing new frames until it slams into that limit, and the engine throws a `RangeError` rather than let the stack grow without bound and crash the whole process.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#3-why-does-a-deeply-recursive-function-throw-maximum-call-stack-size-exceeded-instead-of-just-running-slowly](13-JavaScript-Engine-and-Browser-Internals.md#3-why-does-a-deeply-recursive-function-throw-maximum-call-stack-size-exceeded-instead-of-just-running-slowly)*

### 4. What's the practical difference between the interpreter and the JIT compiler?

**Answer:** Starts fast but stays slow, versus starts slow but gets fast — that's the trade-off. The interpreter, Ignition, compiles bytecode and runs it directly, so it starts up fast but each individual call runs a bit slower. The JIT compiler, TurboFan, instead profiles which functions are actually "hot" — called often, with consistent argument shapes — and compiles just those specific ones into optimized native machine code. That's exactly why a long-running Node process, or a page you've been heavily interacting with, can get measurably faster over time as its hot paths warm up.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#4-whats-the-practical-difference-between-the-interpreter-and-the-jit-compiler](13-JavaScript-Engine-and-Browser-Internals.md#4-whats-the-practical-difference-between-the-interpreter-and-the-jit-compiler)*

### 5. What causes a JIT-optimized function to deoptimize?

**Answer:** It's the JIT getting caught off guard by a broken promise. Deoptimization happens when a call to an already-optimized function violates the assumptions the JIT baked in from earlier calls — most commonly, the function suddenly receives an object with a different shape than it saw before. A realistic trigger: a `calculateCartTotal(items)` function optimized around `{ price, qty }` objects, that suddenly gets handed a `{ price, isFreeGift: true }` object with no `qty` at all. When that happens, the engine falls back to running that function through the interpreter again, until it can gather fresh data and re-optimize.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#5-what-causes-a-jit-optimized-function-to-deoptimize](13-JavaScript-Engine-and-Browser-Internals.md#5-what-causes-a-jit-optimized-function-to-deoptimize)*

### 6. What is a hidden class in V8, and why does it exist?

**Answer:** A hidden class is V8's internal blueprint of an object's property layout — which properties exist, in what order, sitting at what memory offset. It exists so property access can be a fast, fixed-offset lookup instead of a slow dictionary or hash lookup on every single access. Objects created with the same properties assigned in the same order end up sharing one hidden class. Objects built differently — extra conditional fields, a different assignment order — get separate hidden classes, even if logically they represent "the same kind of thing."

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#6-what-is-a-hidden-class-in-v8-and-why-does-it-exist](13-JavaScript-Engine-and-Browser-Internals.md#6-what-is-a-hidden-class-in-v8-and-why-does-it-exist)*

### 7. What's the difference between a monomorphic and a megamorphic inline cache, and why should you care as an engineer?

**Answer:** One shape seen versus too many shapes seen — that's the whole distinction. Monomorphic means a property-access callsite has only ever encountered one hidden class, so the engine can keep using a fast, specialized lookup. Megamorphic means it's seen too many different hidden classes at that same callsite, and the engine gives up and falls back to a slow, generic lookup instead. You should care because this is an invisible perf cliff: code like `orders.map(o => o.total)` looks absolutely identical on the page whether the `Order` objects behind it all share one shape or not, but the actual runtime cost can be wildly different.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#7-whats-the-difference-between-a-monomorphic-and-a-megamorphic-inline-cache-and-why-should-you-care-as-an-engineer](13-JavaScript-Engine-and-Browser-Internals.md#7-whats-the-difference-between-a-monomorphic-and-a-megamorphic-inline-cache-and-why-should-you-care-as-an-engineer)*

### 8. Is JavaScript single-threaded because of the call stack, and does that mean the browser can't do anything concurrently?

**Answer:** Yes and no — it depends what layer you're talking about. Yes, there really is exactly one call stack, so only one piece of JS can be executing at any given instant — that's precisely what "single-threaded" refers to at the engine level. But no, that doesn't mean the browser can't do anything concurrently: it still runs network requests, timers, and I/O concurrently outside that stack, and schedules the results back onto it via the event loop. That event loop mechanism is a separate piece from the engine's parsing and execution model itself — it's the thing that makes single-threaded JS feel concurrent from the outside.

*Source: [13-JavaScript-Engine-and-Browser-Internals.md#8-is-javascript-single-threaded-because-of-the-call-stack-and-does-that-mean-the-browser-cant-do-anything-concurrently](13-JavaScript-Engine-and-Browser-Internals.md#8-is-javascript-single-threaded-because-of-the-call-stack-and-does-that-mean-the-browser-cant-do-anything-concurrently)*

## [14. Internationalization (i18n) in JavaScript](14-Internationalization-i18n.md)

### 1. What's the difference between i18n, l10n, and g11n?

**Answer:** Think of it as build the machine, then feed it content, repeatedly. i18n — internationalization — is the engineering work: preparing the codebase so it can support any locale without needing structural rewrites later, things like externalized strings, `Intl`-based formatting, direction-agnostic CSS. l10n — localization — is the content work on top of that: actually translating text and supplying regional formats for one specific market. g11n — globalization — is just the combination of the two: you do the i18n engineering work once, and then you repeat the l10n content work for every new target market.

*Source: [14-Internationalization-i18n.md#1-whats-the-difference-between-i18n-l10n-and-g11n](14-Internationalization-i18n.md#1-whats-the-difference-between-i18n-l10n-and-g11n)*

### 2. Why is `amount.toFixed(2) + " €"` the wrong way to format currency?

**Answer:** Because it silently assumes everyone formats numbers the American way, and that assumption breaks fast. It bakes in one locale's conventions — a period as the decimal separator, the currency symbol tacked on at the end — and it breaks for basically any other locale. German formatting flips the decimal and thousands separators entirely, turning into something like `1.250.500,75 €`. Japanese yen doesn't even have a fractional cents unit at all, so appending `.00` is just wrong. `Intl.NumberFormat(locale, { style: "currency", currency })` handles every one of these cases correctly for any locale, with zero custom logic needed.

*Source: [14-Internationalization-i18n.md#2-why-is-amounttofixed2-€-the-wrong-way-to-format-currency](14-Internationalization-i18n.md#2-why-is-amounttofixed2-€-the-wrong-way-to-format-currency)*

### 3. Why can't pluralization be handled with a simple `count === 1 ? singular : plural` check?

**Answer:** Because that check quietly assumes every language pluralizes the way English does, with just two categories: `one` and `other`. Plenty of languages need more: Russian has four distinct plural categories, Arabic has six. A hardcoded ternary just can't represent that many cases. Real i18n systems solve this with CLDR-based plural rules — either ICU MessageFormat syntax or i18next's `_plural` key convention — so the correct category gets selected automatically for whatever locale is active.

*Source: [14-Internationalization-i18n.md#3-why-cant-pluralization-be-handled-with-a-simple-count-1-singular-plural-check](14-Internationalization-i18n.md#3-why-cant-pluralization-be-handled-with-a-simple-count-1-singular-plural-check)*

### 4. What does a locale identifier like `de-DE` actually encode, and why does it matter?

**Answer:** It follows the BCP 47 format, `[language]-[REGION]` — so `de-DE` reads as German as spoken specifically in Germany. It matters because language alone genuinely isn't enough to determine formatting: the region half drives which date format, currency, decimal separator, and plural rules actually apply. Even the exact same language can format differently by region — `en-US` and `en-GB` write dates differently, for instance — which is exactly why the full locale, not just the bare language code, has to be passed to every `Intl` call.

*Source: [14-Internationalization-i18n.md#4-what-does-a-locale-identifier-like-de-de-actually-encode-and-why-does-it-matter](14-Internationalization-i18n.md#4-what-does-a-locale-identifier-like-de-de-actually-encode-and-why-does-it-matter)*

### 5. Why are CSS logical properties necessary for RTL support, and what's wrong with `margin-left`/`text-align: left`?

**Answer:** Physical properties, like `margin-left`, are anchored to the literal screen left/right axis no matter what — so they stay stubbornly frozen in an LTR layout even after you set `dir="rtl"` on the page. Logical properties, like `margin-inline-start` and `text-align: start`, resolve relative to the document's actual reading direction instead — `start` automatically means left in LTR and right in RTL. That's the whole trick: the exact same stylesheet mirrors correctly for both directions, with no separate RTL stylesheet needed at all.

*Source: [14-Internationalization-i18n.md#5-why-are-css-logical-properties-necessary-for-rtl-support-and-whats-wrong-with-margin-lefttext-align-left](14-Internationalization-i18n.md#5-why-are-css-logical-properties-necessary-for-rtl-support-and-whats-wrong-with-margin-lefttext-align-left)*

### 6. In `react-i18next`, what does `i18n.changeLanguage()` do, and does it require a page reload?

**Answer:** It swaps the active translation catalog right there at runtime, and re-renders any component that uses `useTranslation()`'s `t()` function with the new language's strings. No reload needed — React just re-renders the affected components with the new locale's text the moment the language changes. That's exactly why a language `<select>` in the checkout header can update the entire page instantly, with no flicker of a full page reload.

*Source: [14-Internationalization-i18n.md#6-in-react-i18next-what-does-i18nchangelanguage-do-and-does-it-require-a-page-reload](14-Internationalization-i18n.md#6-in-react-i18next-what-does-i18nchangelanguage-do-and-does-it-require-a-page-reload)*

### 7. Why should `interpolation.escapeValue` be set to `false` when configuring i18next for a React app?

**Answer:** Because otherwise you end up escaping twice, and that corrupts your text. i18next's interpolation defaults to escaping values — originally meant to prevent XSS when injecting translated strings straight into raw HTML. But React already escapes all rendered text by default on its own. So without turning that off, you'd get double-escaping, which mangles characters like accented letters or ampersands in your translated strings. Setting `escapeValue: false` avoids that double-escaping, since React's own rendering is already providing the XSS protection you need.

*Source: [14-Internationalization-i18n.md#7-why-should-interpolationescapevalue-be-set-to-false-when-configuring-i18next-for-a-react-app](14-Internationalization-i18n.md#7-why-should-interpolationescapevalue-be-set-to-false-when-configuring-i18next-for-a-react-app)*

### 8. What's the actual difference between externalizing strings into a translation catalog versus just hardcoding text and later find/replacing it?

**Answer:** A translation catalog fully decouples text from code — a component just references a key, like `checkout.welcome`, and the catalog for whatever locale is active supplies the actual string, including locale-specific pluralization and interpolation. Find/replacing hardcoded text is a much worse approach for two reasons: every new locale means touching and redeploying the component code itself, and it simply can't express something like one English string needing several grammatically different translations — plural forms, gendered forms — since a single find/replace has no way to represent multiple variants of the same string.

*Source: [14-Internationalization-i18n.md#8-whats-the-actual-difference-between-externalizing-strings-into-a-translation-catalog-versus-just-hardcoding-text-and-later-findreplacing-it](14-Internationalization-i18n.md#8-whats-the-actual-difference-between-externalizing-strings-into-a-translation-catalog-versus-just-hardcoding-text-and-later-findreplacing-it)*

### 9. How would you test that Northwind's checkout page is genuinely internationalized, not just translated?

**Answer:** Translation is the easy 20% — the real test is the behaviors that translation alone never covers. Force an RTL locale and confirm the *layout itself* mirrors correctly, not just that Arabic text happens to display. Check that dates and currency reformat correctly across at least two genuinely different locales. Run pseudo-localization to catch UI that breaks the moment strings get noticeably longer than English. And finally, add a CI check that fails automatically if any locale's catalog is missing a key that exists in the base `en` catalog — so a missing translation gets caught before it ships, not after.

*Source: [14-Internationalization-i18n.md#9-how-would-you-test-that-northwinds-checkout-page-is-genuinely-internationalized-not-just-translated](14-Internationalization-i18n.md#9-how-would-you-test-that-northwinds-checkout-page-is-genuinely-internationalized-not-just-translated)*

## [15. TypeScript Language Fundamentals](15-TypeScript-Language-Fundamentals.md)

### 1. What is the actual difference between `interface` and `type`, and which should you default to?

**Answer:** `interface` can be reopened, `type` cannot — that's the core mechanical difference. Two `interface User {}` declarations with the same name automatically merge into one, and it's extended with `extends`. A `type`, once declared, can't be reopened like that, but it can alias things `interface` simply cannot express — unions, primitives, tuples, mapped types. You genuinely can't write `interface Status = 'a' | 'b'`; that's a compile error. The common rule of thumb: use `interface` for object shapes you expect might get extended later, and `type` for everything else — unions, intersections, derived and mapped types.

*Source: [15-TypeScript-Language-Fundamentals.md#1-what-is-the-actual-difference-between-interface-and-type-and-which-should-you-default-to](15-TypeScript-Language-Fundamentals.md#1-what-is-the-actual-difference-between-interface-and-type-and-which-should-you-default-to)*

### 2. Why use a generic type like `ApiResponse<T>` instead of just typing every response as `any` or duplicating the envelope per endpoint?

**Answer:** `any` compiles just fine, but it throws away all checking in the process — a typo like `response.dta` would silently sail through and only fail once you're actually running the app. Duplicating a separate interface per endpoint isn't much better: `UserApiResponse`, `InvoiceApiResponse`, and so on quickly become five near-identical interfaces you now have to maintain by hand. `ApiResponse<T>` sidesteps both problems — write it once, reuse it for every payload shape, and `fetchJson<User>(...)` gives you `.data.name` fully typed and checked at compile time, catching that same typo before it ever ships.

*Source: [15-TypeScript-Language-Fundamentals.md#2-why-use-a-generic-type-like-apiresponset-instead-of-just-typing-every-response-as-any-or-duplicating-the-envelope-per-endpoint](15-TypeScript-Language-Fundamentals.md#2-why-use-a-generic-type-like-apiresponset-instead-of-just-typing-every-response-as-any-or-duplicating-the-envelope-per-endpoint)*

### 3. What does a discriminated union buy you over a single object with a bunch of optional fields?

**Answer:** It makes broken states literally impossible to construct, instead of just unlikely. With a pile of optional fields, nothing stops you from building an invalid combination — a "success" object that also somehow has an `error` populated — and every access needs its own manual `if (value !== undefined)` check scattered everywhere. A discriminated union, like `Result<T, E>`, makes that invalid state unrepresentable in the first place: the `success: true` variant simply has no `error` field to accidentally read. And checking the discriminant automatically narrows the whole object's type for you, for free.

*Source: [15-TypeScript-Language-Fundamentals.md#3-what-does-a-discriminated-union-buy-you-over-a-single-object-with-a-bunch-of-optional-fields](15-TypeScript-Language-Fundamentals.md#3-what-does-a-discriminated-union-buy-you-over-a-single-object-with-a-bunch-of-optional-fields)*

### 4. How does exhaustiveness checking with `never` actually catch a missed case at compile time?

**Answer:** It turns a future forgotten case into a compile error today, before anyone ships it. In the `default` branch of a `switch` covering every known variant of a union, TypeScript narrows that value's type down to `never`, because logically nothing should ever reach that branch. Now pass that value into a function typed to only accept `never` — commonly called `assertNever`. If someone later adds a new union variant and forgets to write a case for it, the value in `default` is no longer actually `never` anymore, and that call becomes a compile error — catching the missing case at build time instead of letting it slip into production silently unhandled.

*Source: [15-TypeScript-Language-Fundamentals.md#4-how-does-exhaustiveness-checking-with-never-actually-catch-a-missed-case-at-compile-time](15-TypeScript-Language-Fundamentals.md#4-how-does-exhaustiveness-checking-with-never-actually-catch-a-missed-case-at-compile-time)*

### 5. What's the difference between a type guard like `typeof x === 'string'` and a custom type predicate function (`x is Foo`)?

**Answer:** Built-in narrowing versus narrowing you teach the compiler yourself. `typeof`, `instanceof`, and discriminant checks are forms of narrowing TypeScript already understands natively, right there inline. A custom type predicate, like `function isUser(x: Account): x is User`, comes in when the check is more complex than any single built-in operator — say, checking several properties at once. Writing `x is User` as the return type tells the compiler "if this function returns `true`, go ahead and narrow the argument to `User`" from that call site onward, exactly as if you'd written the check inline yourself.

*Source: [15-TypeScript-Language-Fundamentals.md#5-whats-the-difference-between-a-type-guard-like-typeof-x-string-and-a-custom-type-predicate-function-x-is-foo](15-TypeScript-Language-Fundamentals.md#5-whats-the-difference-between-a-type-guard-like-typeof-x-string-and-a-custom-type-predicate-function-x-is-foo)*

### 6. What does `Omit<User, 'passwordHash'>` actually generate, and why is it better than writing a second interface by hand?

**Answer:** It's a mapped type that grabs every key of `User` except `passwordHash` and builds a brand-new object type out of the rest, computed automatically straight from `User`'s current shape. The reason it beats hand-writing a second interface: if you wrote `SafeUser` by hand, it would silently drift out of sync the moment someone adds a new field to `User` — nobody remembers to update the copy. `Omit`, and `Pick` too, stay correct automatically forever, because they're derived from the source type, never duplicated by hand.

*Source: [15-TypeScript-Language-Fundamentals.md#6-what-does-omituser-passwordhash-actually-generate-and-why-is-it-better-than-writing-a-second-interface-by-hand](15-TypeScript-Language-Fundamentals.md#6-what-does-omituser-passwordhash-actually-generate-and-why-is-it-better-than-writing-a-second-interface-by-hand)*

### 7. What is a conditional type, and where does `infer` fit in?

**Answer:** A conditional type is basically an if/else statement, just written for types instead of values: `T extends U ? X : Y`. `infer` is what lets you reach into the type being checked, grab a piece of it, and give that piece a name you can reuse in the true branch. So `T extends (...args: any[]) => infer R ? R : never` reads as "is T a function? If so, capture its return type and call it `R`." This isn't some separate compiler magic trick, either — it's exactly how built-ins like `ReturnType<T>` and `Awaited<T>` are actually implemented under the hood.

*Source: [15-TypeScript-Language-Fundamentals.md#7-what-is-a-conditional-type-and-where-does-infer-fit-in](15-TypeScript-Language-Fundamentals.md#7-what-is-a-conditional-type-and-where-does-infer-fit-in)*

### 8. Why is `unknown` generally preferred over `any` for something like a caught error or an untyped API response?

**Answer:** `any` completely switches off type checking — you can call any method on it, and the compiler stays quiet even if that method doesn't actually exist on the real value. `unknown` refuses to let you do that: it forces you to narrow the value first, with `typeof`, `instanceof`, or a type guard, before you're allowed to use it in any specific way. That's exactly why mistakes like calling `.message` on a caught value that isn't actually an `Error` get caught at compile time with `unknown`, instead of blowing up later at runtime.

*Source: [15-TypeScript-Language-Fundamentals.md#8-why-is-unknown-generally-preferred-over-any-for-something-like-a-caught-error-or-an-untyped-api-response](15-TypeScript-Language-Fundamentals.md#8-why-is-unknown-generally-preferred-over-any-for-something-like-a-caught-error-or-an-untyped-api-response)*

## [16. Event Bubbling, Capturing, and Delegation](16-DOM-Events-Bubbling-Capturing-Delegation.md)

### 1. What are the three phases of DOM event propagation, in order?

**Answer:** Picture it as a trip down, a stop, then a trip back up. First, capturing — the event travels down from `window` all the way to the target, and listeners ignore it during this phase by default. Second, target — the event actually fires on the specific element the user interacted with. Third, bubbling — the event travels back up from the target to `window`, and this is the phase a normal `addEventListener` listens to, unless you explicitly tell it otherwise.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#1-what-are-the-three-phases-of-dom-event-propagation-in-order](16-DOM-Events-Bubbling-Capturing-Delegation.md#1-what-are-the-three-phases-of-dom-event-propagation-in-order)*

### 2. How do you make an event listener run during the capturing phase instead of bubbling?

**Answer:** Pass `true` as the third argument to `addEventListener`, or `{ capture: true }` if you're using the options-object form instead. Leave that out, and the listener just defaults to the bubbling phase.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#2-how-do-you-make-an-event-listener-run-during-the-capturing-phase-instead-of-bubbling](16-DOM-Events-Bubbling-Capturing-Delegation.md#2-how-do-you-make-an-event-listener-run-during-the-capturing-phase-instead-of-bubbling)*

### 3. What's the difference between `event.target` and `event.currentTarget`?

**Answer:** "What the user actually clicked" versus "where this listener happens to live" — that's the split. `event.target` is the actual, deepest element the user interacted with, and it never changes no matter what phase the event is passing through. `event.currentTarget` is whichever element the currently-running listener is attached to — inside a listener sitting on an ancestor, it's always that ancestor, never the element the user actually clicked. Mixing the two up inside a delegated handler is a real, genuinely common bug.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#3-whats-the-difference-between-eventtarget-and-eventcurrenttarget](16-DOM-Events-Bubbling-Capturing-Delegation.md#3-whats-the-difference-between-eventtarget-and-eventcurrenttarget)*

### 4. What's the difference between `stopPropagation()` and `preventDefault()`?

**Answer:** They sound like they should overlap, but they solve two completely unrelated problems. `stopPropagation()` stops the event from continuing through the remaining capturing or bubbling phases — but it has zero effect on the browser's default action for that event. `preventDefault()` does the opposite job: it stops the browser's default behavior, like a link navigating or a checkbox toggling, but it doesn't touch propagation at all — the event still bubbles right on up unless `stopPropagation()` is also called separately. People mix these two up constantly.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#4-whats-the-difference-between-stoppropagation-and-preventdefault](16-DOM-Events-Bubbling-Capturing-Delegation.md#4-whats-the-difference-between-stoppropagation-and-preventdefault)*

### 5. Why is calling `stopPropagation()` "just to be safe" actually risky?

**Answer:** Because it silently blinds every ancestor listener to that event — including ones you almost certainly didn't anticipate, like a document-level analytics click tracker, or some other component's delegated handler sitting higher up the tree. What makes this genuinely nasty to debug is that the resulting bug — an ancestor mysteriously never receiving an event it should have — never throws an error. There's no stack trace pointing back at the culprit; it just quietly doesn't happen.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#5-why-is-calling-stoppropagation-just-to-be-safe-actually-risky](16-DOM-Events-Bubbling-Capturing-Delegation.md#5-why-is-calling-stoppropagation-just-to-be-safe-actually-risky)*

### 6. What real problem does event delegation solve, and why does it depend specifically on the bubbling phase?

**Answer:** One listener instead of a thousand — that's the whole idea. Attaching a separate listener to every single row of a large or constantly-changing list wastes memory, and forces you to re-attach listeners every time rows get added or removed. Delegation solves this by attaching exactly one listener to a stable ancestor, and leaning on bubbling to carry every descendant's click up to that one listener. It then uses `event.target`, typically paired with `.closest()`, to figure out which specific descendant was actually involved. The nice bonus: new descendants added later are automatically covered too, with zero extra setup required.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#6-what-real-problem-does-event-delegation-solve-and-why-does-it-depend-specifically-on-the-bubbling-phase](16-DOM-Events-Bubbling-Capturing-Delegation.md#6-what-real-problem-does-event-delegation-solve-and-why-does-it-depend-specifically-on-the-bubbling-phase)*

### 7. How does React's event system relate to native bubbling and delegation?

**Answer:** React is quietly doing delegation for you under the hood, all the time. Instead of attaching a real listener to every single element with an `onClick`, React attaches its own listeners near the application root, relies on the exact same native bubbling mechanism internally, and then dispatches a normalized synthetic event to your handler. So you get delegation's performance benefit automatically, without writing any delegation code yourself. One gotcha worth knowing: calling `stopPropagation()` inside a React handler only stops propagation within React's own synthetic event system — and that can behave surprisingly if you mix it with plain native `addEventListener` calls on the same DOM tree.

*Source: [16-DOM-Events-Bubbling-Capturing-Delegation.md#7-how-does-reacts-event-system-relate-to-native-bubbling-and-delegation](16-DOM-Events-Bubbling-Capturing-Delegation.md#7-how-does-reacts-event-system-relate-to-native-bubbling-and-delegation)*
