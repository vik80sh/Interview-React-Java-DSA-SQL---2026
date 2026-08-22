# Scope, Hoisting, and Variables in JavaScript

Almost every "explain this output" interview question is really a scope-and-hoisting question in disguise, and getting `var`/`let`/`const` semantics wrong is one of the fastest ways to look junior in a senior interview. The goal here isn't memorizing rules — it's being able to trace, line by line, what the engine does before and while your code runs.

## 1. `var`, `let`, and `const` — Declaration Rules That Actually Matter

The three keywords differ in scope, whether they can be redeclared, and whether the binding can be reassigned. `const` locks the *binding* (the variable name can't point to a new value), not the *contents* of whatever it points to — an array or object assigned to a `const` is still fully mutable.

| | `var` | `let` | `const` |
|---|---|---|---|
| Scope | Function (or global) | Block | Block |
| Hoisted | Yes, initialized to `undefined` | Yes, uninitialized (TDZ) | Yes, uninitialized (TDZ) |
| Redeclare in same scope | Allowed | `SyntaxError` | `SyntaxError` |
| Reassign | Allowed | Allowed | `TypeError` |
| Mutate contents (object/array) | N/A | Allowed | Allowed |

```javascript
const TAX_RATE = 0.08; // a config value that must never change during checkout
let subtotal = 0; // running total — reassigned as items are added

function addItem(cart, price) {
    subtotal += price; // fine: reassigning a let
    cart.push({ price }); // fine: const only locks the binding, not the array's contents
}

const cart = [];
addItem(cart, 29.99);
addItem(cart, 15.5);

// cart = []; // TypeError: Assignment to constant variable.
console.log(subtotal * (1 + TAX_RATE)); // 49.1292
```

The classic `var` trap is that it ignores block boundaries entirely:

```javascript
function applyCoupon(cartTotal, code) {
    if (code === "SAVE10") {
        var discount = 0.10; // var doesn't respect the if-block
    }
    // discount is still visible here even outside the if — this "leaks" by design
    return cartTotal * (1 - (discount || 0));
}
```

If a second developer later adds another `if` branch with its own `var discount = 0.20`, both branches silently share and overwrite the same function-scoped variable — a bug `let` makes structurally impossible.

## 2. Function Scope vs Block Scope

`var` is scoped to the nearest enclosing function (or the global scope if there isn't one) — a pair of `{ }` around an `if`, `for`, or bare block does nothing to contain it. `let` and `const` are scoped to the nearest enclosing block, full stop.

```javascript
function validateSignupForm(fields) {
    var hasLegacyError = false; // function-scoped: alive for the whole function body
    const errors = [];

    for (const field of fields) {
        if (!field.value) {
            let message = `${field.name} is required`; // block-scoped: dies at the closing brace
            errors.push(message);
            hasLegacyError = true;
        }
        // console.log(message); // ReferenceError — message never leaves this iteration's block
    }

    if (errors.length > 0) {
        var firstFailure = errors[0]; // still function-scoped, even though declared inside this if
    }

    console.log(firstFailure); // works fine outside the if — var punches through block boundaries
    return { errors, hasLegacyError };
}
```

The practical rule: if you want a variable to genuinely disappear once its `if`/`for`/`{}` block ends, `var` cannot give you that — only `let` or `const` can.

## 3. The Scope Chain — How a Variable Lookup Actually Resolves

JavaScript is **lexically scoped**: when the engine can't find an identifier in the current scope, it walks outward through each enclosing scope, in the order the code was *written*, not the order it was *called*. That ordered list of scopes is the scope chain, and it terminates at the global scope; if nothing matches there either, you get a `ReferenceError`.

```javascript
function createApiClient(baseUrl) {
    const defaultHeaders = { "Content-Type": "application/json" };

    function buildRequest(path) {
        function withAuth(token) {
            // withAuth references baseUrl and defaultHeaders without declaring either.
            // Lookup order: withAuth's own scope -> buildRequest's scope -> createApiClient's
            // scope -> global scope. It's found in createApiClient's scope and stops there.
            return {
                url: `${baseUrl}${path}`,
                headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
            };
        }
        return withAuth;
    }

    return { buildRequest };
}

const client = createApiClient("https://api.example.com");
const request = client.buildRequest("/orders")("abc123token");
```

Two things matter for interviews specifically: an inner scope can read outer variables but an outer scope can never reach into an inner one, and the chain is fixed at the point where a function is *defined*, not where it's later invoked from — that's exactly what makes closures possible (covered in depth in the closures guide), and it's why `withAuth` still sees `baseUrl` no matter who calls the function it returns.

## 4. Hoisting Mechanics — What the Creation Phase Actually Does

"Hoisting moves your declarations to the top" is a convenient lie. Nothing physically moves. Before the engine executes a single line, it runs a **creation phase** that scans the current scope and sets up memory bindings for every declaration it finds — that scan is what makes hoisting look like code got rearranged.

| Declaration type | Hoisted? | Initial value |
|---|---|---|
| `var` | Yes | `undefined` |
| `let` / `const` | Yes | Uninitialized (TDZ) |
| `function` declaration | Yes, fully | The actual function body |
| `class` declaration | Yes | Uninitialized (TDZ) |
| Function expression (`const f = function(){}`) | Follows the keyword used | `undefined` or TDZ, per the keyword |

```javascript
console.log(orderId); // undefined — var is hoisted and pre-initialized
// console.log(shippingLabel); // ReferenceError — let is hoisted but locked (TDZ)

generateOrderId(); // works — function declarations are hoisted with their full body attached

var orderId = "ORD-1001";
let shippingLabel = "printed";

function generateOrderId() {
    return "ORD-" + Date.now();
}
```

A function expression only gets the hoisting behavior of the keyword holding it — `const sendConfirmationEmail = function () {...}` hoists the *name* into the TDZ like any `const`, but the function body is not usable until that assignment line actually runs; calling it earlier throws exactly like accessing any other TDZ `const` would, not like calling a hoisted function declaration.

One more edge case worth knowing: a `function` declared *inside* a block (`if`, `for`, `{}`) is technically block-scoped under strict mode and ES modules, but many non-strict environments still hoist it out to the enclosing function via legacy ("Annex B") behavior with `var`-like semantics. Because that behavior differs across environments, never rely on a block-nested function declaration being visible outside its block — assign a function expression to a `let`/`const` instead if you need that.

## 5. The Temporal Dead Zone (TDZ)

Between entering a scope and reaching the actual `let`/`const` declaration line, that identifier exists (it's hoisted) but is marked internally as uninitialized. Any read or write attempt in that window throws a `ReferenceError` — that window is the Temporal Dead Zone, and it exists specifically to stop the class of silent `undefined`-related bugs `var` allowed for two decades.

```javascript
function loadFeatureFlags(rawConfig) {
    if (rawConfig.betaEnabled) {
        applyBetaDefaults(); // ReferenceError: Cannot access 'betaFlag' before initialization
    }

    let betaFlag = rawConfig.betaEnabled ?? false;

    function applyBetaDefaults() {
        console.log(betaFlag); // only reads betaFlag once actually invoked
    }
}
```

`applyBetaDefaults` is defined *after* `betaFlag` in the source, but that's irrelevant — the TDZ error fires because the function is **called** before the `let betaFlag` line has executed, not because of where the function happens to be written. TDZ is about execution order, not lexical position.

The interview-favorite nuance: `typeof` on a TDZ variable also throws, which is different from `typeof` on a variable that was never declared at all:

```javascript
console.log(typeof neverDeclaredVariable); // "undefined" — safe, no error
console.log(typeof shippingLabel);         // ReferenceError — TDZ, even though it's just typeof
let shippingLabel = "printed";
```

That asymmetry is deliberate: `typeof` was historically the safe way to probe for a variable's existence before using it, and TDZ intentionally breaks that safety net for `let`/`const` to force declarations to run before use.

## 6. Function Declarations vs `var` — The Hoisting Collision Trap

The creation phase runs in two effective passes: it hoists every function declaration first, then hoists `var`/`let`/`const` declarations. If a `var` and a function declaration share the same name in the same scope, the function wins the initial binding — the `var` is not re-initialized to `undefined` over it.

```javascript
var notifyUser = true; // global feature flag: send a confirmation email by default

function completeCheckout(order) {
    console.log(notifyUser); // ?

    if (order.total === 0) {
        var notifyUser = false; // a dev "disables" the email for free orders...
    }

    console.log(notifyUser); // ?

    notifyUser = "sent";
    return;

    function notifyUser() {
        // sends the "your order is confirmed" email
    }
}

completeCheckout({ total: 50 });
console.log(notifyUser); // ?
```

Walking it: during `completeCheckout`'s creation phase, the function declaration `notifyUser` is hoisted first and bound to the function body; the `var notifyUser` found afterward is the same name, already bound, so it is not overwritten with `undefined`. Both `console.log` calls print the function itself, because `order.total` is `50`, so the `if` block — and the reassignment to `false` inside it — never even runs. The line `notifyUser = "sent"` reassigns the *local* `notifyUser`, which disappears when the function returns, so the outer global `notifyUser` is untouched and still logs `true` at the end. The developer's intended fix never fires, and the bug is invisible unless you understand this exact hoisting order.

## 7. Classic Trap — Loop Variable Capture in Closures

A `for` loop declared with `var` shares a single function-scoped binding across every iteration. If a closure created inside the loop is only *called* later (after the loop has finished), it sees whatever value that one shared variable ended up with — not the value it had "at the time" the closure was created.

```javascript
function renderCartRows(cartItems) {
    for (var i = 0; i < cartItems.length; i++) {
        const button = document.querySelector(`#remove-${i}`);
        button.addEventListener("click", function () {
            removeFromCart(cartItems[i]); // bug: every handler closes over the same i
        });
    }
}
// After the loop finishes, i === cartItems.length for every single handler.
// Clicking ANY remove button reads cartItems[cartItems.length], which is undefined.
```

`let` fixes this because the specification gives each iteration of a `for` loop its own fresh lexical binding of the loop variable, copied forward from the previous iteration's value:

```javascript
function renderCartRowsFixed(cartItems) {
    for (let i = 0; i < cartItems.length; i++) {
        const button = document.querySelector(`#remove-${i}`);
        button.addEventListener("click", function () {
            removeFromCart(cartItems[i]); // correct: this closure captures its own i
        });
    }
}
```

Each click handler now closes over a separate `i`, frozen at the value it had for that specific iteration, so clicking the third row's button removes `cartItems[2]` regardless of how many rows exist or when the click actually happens. This single keyword swap is one of the most common real fixes senior engineers are expected to name immediately.

## Interview Questions and Answers

### 1. What's the practical difference between `var`, `let`, and `const`?

**Answer:** `var` is function-scoped, hoisted and pre-initialized to `undefined`, and can be redeclared. `let` and `const` are block-scoped and hoisted into the TDZ instead of being initialized, so using them before their declaration line throws. `const` additionally forbids reassigning the binding, though an object or array it points to can still be mutated, like pushing into a `const cart = []`.

### 2. Why does a `var` declared inside an `if` block "leak" out, but a `let` doesn't?

**Answer:** `var` is scoped to the nearest function (or global scope), and a bare `{}` block has no effect on that — it's purely a syntactic grouping for `var`. `let` and `const` are scoped to that exact block, so they cease to exist the moment the block's closing brace is reached. This is why two `if` branches using `var discount` for different rates can silently overwrite each other's value.

### 3. What is the scope chain, and how does JavaScript resolve a variable reference?

**Answer:** When an identifier isn't found in the current scope, the engine walks outward through each enclosing scope in the order the code was lexically written, stopping at the first match or throwing a `ReferenceError` at the global scope. It's resolved based on where a function was defined, not where it's called from, which is why a nested function like `withAuth` in an API client can still read `baseUrl` from an outer `createApiClient` closure no matter who invokes it later.

### 4. Explain what actually happens during hoisting's "creation phase."

**Answer:** Before executing any code in a scope, the engine scans it and sets up memory bindings for every declaration it finds — function declarations get their full body attached immediately, `var` gets pre-initialized to `undefined`, and `let`/`const`/`class` get a binding marked uninitialized. Nothing physically moves in the source; the illusion of "moving to the top" comes entirely from this pre-scan happening before line-by-line execution starts.

### 5. What is the Temporal Dead Zone, and why does `typeof` throw on a TDZ variable instead of returning `"undefined"`?

**Answer:** The TDZ is the window between a scope being entered and the actual `let`/`const` declaration line executing, during which the variable exists but is locked and throws on any access. `typeof` throwing here — unlike on a truly undeclared identifier, where it safely returns `"undefined"` — is a deliberate design choice: it removes the old `var`-era trick of using `typeof` to safely probe for a variable before it's been properly initialized.

### 6. Why does a function declaration win over a `var` with the same name during hoisting?

**Answer:** The creation phase hoists function declarations first and binds them to their full body; when it then processes `var` declarations with the same name, it finds the binding already occupied by a function and does not overwrite it with `undefined`. That's why, in a function containing both `var notifyUser` and `function notifyUser(){}`, reading `notifyUser` at the top of the function returns the function, not `undefined`, regardless of which one appears first in the source.

### 7. Walk through why a `var` loop variable breaks closures attached inside a loop, and how `let` fixes it.

**Answer:** With `var`, the loop variable is a single function-scoped binding shared by every iteration, so a closure that runs later — like a click handler — reads whatever value that one variable ended up with after the loop finished, not its value at closure-creation time. `let` gives each iteration of a `for` loop its own fresh binding, so each closure captures a distinct value; this is exactly why attaching per-row "remove from cart" click handlers with `var i` makes every button remove the last item, while switching to `let i` fixes it with no other code changes.

### 8. Is a `const` variable actually immutable?

**Answer:** No — `const` only prevents the binding itself from being reassigned to a different value or reference. If the value is an object or array, its contents can still be freely mutated, so `const cart = []; cart.push(item);` is completely legal, while `cart = []` afterward is a `TypeError`.

### 9. Are function declarations always hoisted to the top of the enclosing function, no matter where they're nested?

**Answer:** Not reliably. A function declared at the top level of a function or module is fully hoisted with its body. One declared inside a block like `if` or `for` is technically block-scoped under strict mode and ES modules, but many non-strict environments still hoist it out of the block using legacy fallback behavior with `var`-like semantics. Because the behavior differs by environment, block-nested function declarations should be avoided in favor of a function expression assigned to a `let`/`const`.

### 10. How does hoisting differ between a function declaration and a function expression assigned to a `const`?

**Answer:** A function declaration hoists both the name and the complete function body, so it's callable anywhere in its scope, even before its source line. A function expression like `const sendConfirmationEmail = function(){}` only hoists the identifier per `const`'s rules — into the TDZ — so calling it before that assignment line executes throws a `ReferenceError`, exactly like using any other TDZ `const` too early.

## Revision Checklist

- [ ] Explain `var`/`let`/`const` differences, including that `const` locks the binding, not the contents, with a real example like a cart total plus a coupon discount.
- [ ] Explain function scope vs block scope and why a `var` inside an `if`/`for` still leaks outside it.
- [ ] Trace a scope chain lookup through several nested functions without looking at notes.
- [ ] Explain the creation phase and why `var`, `let`, `const`, and function declarations are each hoisted differently.
- [ ] Explain the TDZ, including why `typeof` throws on a TDZ variable but not on an undeclared one.
- [ ] Trace the `var`-vs-function-declaration hoisting collision end to end, predicting every `console.log` output.
- [ ] Explain the classic `var`-in-a-loop closure bug with a concrete example (e.g., per-row button handlers) and why `let` fixes it.
- [ ] Know that block-nested function declarations are not reliably hoisted the same way across strict and non-strict environments.
