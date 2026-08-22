# The `this` Keyword

`this` is one of the most reliably-asked JavaScript fundamentals in senior interviews because it exposes whether you actually understand execution context or just memorized React patterns. Get it wrong and every follow-up about closures, class components, and event handlers gets shakier too.

## 1. `this` Is Decided by the Call-Site, Not the Definition-Site

The question to ask is never "what does `this` mean inside this function?" — it's "how is this function being invoked right now?" The exact same function can produce four different values of `this` depending on how it's called, because JavaScript binds `this` at call time, not at the moment the function was written.

```javascript
function logCurrentUser() {
    console.log(this.name);
}

const session = { name: "Priya", logCurrentUser };

logCurrentUser();          // undefined (or throws) — called standalone
session.logCurrentUser();  // "Priya" — called as session's method
logCurrentUser.call({ name: "Guest" }); // "Guest" — this forced explicitly
```

Same function body, three different outcomes. This is why grepping a function's source code can never tell you what `this` is — you have to look at every call-site instead.

## 2. The 4 Binding Rules, in Priority Order

JavaScript checks these rules in order of precedence when a normal (non-arrow) function runs: `new` binding beats explicit binding, which beats implicit binding, which beats default binding.

### Rule 1 — Default Binding (standalone invocation)

Calling a function with no receiver falls back to the global object in non-strict mode, or `undefined` in strict mode (and ES modules and class bodies are strict by default).

```javascript
function getDiscountRate() {
    console.log(this); // undefined in strict mode / module code
    return this.rate;  // TypeError: Cannot read properties of undefined
}
getDiscountRate();
```

### Rule 2 — Implicit Binding (method call)

When a function is invoked as `obj.method()`, `this` is whatever sits immediately to the left of the dot at the call-site — not wherever the function was originally defined.

```javascript
const cart = {
    items: [{ price: 500 }, { price: 1200 }],
    getTotal() {
        return this.items.reduce((sum, item) => sum + item.price, 0);
    }
};

cart.getTotal(); // 1700 — 'this' is 'cart' because of the dot

const detached = cart.getTotal;
detached(); // TypeError — no dot at the call-site, 'this' is undefined
```

Only the *immediate* receiver counts. In `checkout.cart.getTotal()`, `this` is `checkout.cart`, not `checkout`.

### Rule 3 — Explicit Binding (`call`, `apply`, `bind`)

You can force `this` yourself instead of relying on the call-site shape.

```javascript
function applyPromoCode(code) {
    console.log(`Applying ${code} to order for ${this.customerName}`);
}

const order = { customerName: "Rahul Sharma" };

applyPromoCode.call(order, "FESTIVE10");   // args passed individually
applyPromoCode.apply(order, ["FESTIVE10"]); // args passed as an array

const applyForRahul = applyPromoCode.bind(order);
applyForRahul("WELCOME50"); // this is permanently locked to 'order'
```

`bind` returns a new function with `this` hard-wired; calling `.call()` or `.apply()` on that bound function again cannot override it. `call`/`apply` invoke immediately; `bind` defers invocation and hands you a reusable function — exactly what you reach for when wiring up a callback that needs a fixed `this`.

### Rule 4 — `new` Binding (constructor invocation)

`new Foo()` creates a brand-new object, links its prototype to `Foo.prototype`, binds `this` to that new object inside the constructor, and returns it automatically (unless the constructor explicitly returns another object).

```javascript
function Coupon(code, percentOff) {
    this.code = code;
    this.percentOff = percentOff;
}

const festiveCoupon = new Coupon("FEST25", 25);
console.log(festiveCoupon.code); // "FEST25"
```

`new` binding wins over every other rule: even `new boundFunc()` on a function you already `bind()`-ed targets the freshly created instance, not the object you bound.

## 3. Arrow Functions Have No `this` of Their Own

Arrow functions don't participate in any of the four rules above. They have no `this` binding at all — they resolve `this` by looking up the enclosing lexical scope, exactly like a normal variable in a closure. `call`, `apply`, `bind`, and `new` all have no effect on an arrow function's `this`.

```javascript
const orderTracker = {
    status: "Placed",
    startDelivery() {
        console.log("Delivery started for status:", this.status); // 'orderTracker', via implicit binding

        setTimeout(function () {
            // regular function passed to setTimeout — called standalone by the timer,
            // so 'this' falls back to Default Binding (undefined/window), NOT orderTracker
            this.status = "Out for delivery";
            console.log("Broken update:", this.status);
        }, 1000);

        setTimeout(() => {
            // arrow function — no own 'this', so it inherits 'this' from startDelivery(),
            // which is 'orderTracker'
            this.status = "Out for delivery";
            console.log("Correct update:", this.status);
        }, 1000);
    }
};

orderTracker.startDelivery();
```

This is the single most common real bug: any regular function handed to `setTimeout`, `addEventListener`, `Array.prototype.map`, or a promise callback loses its intended receiver unless it's an arrow function or explicitly bound.

## 4. The Classic Production Bug: Losing `this` in a React Event Handler

Before hooks, this was the single most common runtime bug in class components, and it still shows up whenever a class method is handed off as a callback without protecting its `this`.

```jsx
class CheckoutButton extends React.Component {
    state = { isProcessing: false };

    handleClick() {
        // 'this' here depends entirely on how handleClick gets invoked
        this.setState({ isProcessing: true });
        this.props.onCheckout();
    }

    render() {
        // BROKEN: passing the method as a bare reference strips its receiver.
        // React calls it later as a standalone function — this.setState throws
        // "Cannot read properties of undefined (reading 'setState')".
        return <button onClick={this.handleClick}>Checkout</button>;
    }
}
```

`this.handleClick` is a plain function reference by the time React stores it as an event listener and invokes it on click — there's no dot at the call-site anymore, so Default Binding kicks in and `this` is `undefined` in strict mode (class bodies are always strict). This is exactly Rule 1 biting a real component.

**Fix 1 — bind in the constructor** (the classic pre-hooks idiom):

```jsx
class CheckoutButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = { isProcessing: false };
        this.handleClick = this.handleClick.bind(this); // lock 'this' once, up front
    }

    handleClick() {
        this.setState({ isProcessing: true });
        this.props.onCheckout();
    }

    render() {
        return <button onClick={this.handleClick}>Checkout</button>;
    }
}
```

**Fix 2 — arrow function as a class field** (most common in modern class components):

```jsx
class CheckoutButton extends React.Component {
    state = { isProcessing: false };

    // class field arrow function: captures 'this' lexically from the instance
    // being constructed, so it never depends on how it's later called
    handleClick = () => {
        this.setState({ isProcessing: true });
        this.props.onCheckout();
    };

    render() {
        return <button onClick={this.handleClick}>Checkout</button>;
    }
}
```

**Fix 3 — wrap it inline at the call-site:**

```jsx
render() {
    // a fresh arrow function is created on every render; it closes over 'this'
    // lexically (the component instance) and forwards the call correctly
    return <button onClick={() => this.handleClick()}>Checkout</button>;
}
```

Fix 3 is the easiest to reach for but re-creates a new function on every render, which can matter for `React.memo`/`PureComponent` children receiving it as a prop. Fix 2 is generally preferred in class components today; in function components the entire category of bug disappears because there's no `this` to lose — state and handlers are just closures over local variables.

## Interview Questions and Answers

### 1. How do you determine what `this` refers to inside a given function?

**Answer:** Look at the call-site, not the function definition. Ask how the function is actually invoked: standalone (`fn()`), as a method (`obj.fn()`), explicitly (`fn.call(obj)`), or with `new`. The same function body can resolve `this` differently on every call depending on which of these shapes applies.

### 2. What is the order of precedence among the four binding rules?

**Answer:** `new` binding wins over explicit binding (`call`/`apply`/`bind`), which wins over implicit binding (method call syntax), which wins over default binding (standalone call). For example, calling `new boundFn()` on a function already bound with `.bind(obj)` still targets the brand-new instance created by `new`, not `obj`.

### 3. Why does extracting a method off an object and calling it separately break `this`?

**Answer:** Implicit binding depends on there being a dot immediately before the call — `const fn = obj.method; fn()` has no dot at the call-site, so it falls through to default binding and `this` becomes `undefined` (strict mode) or the global object. This is exactly what happens when you pass `obj.method` directly to `setTimeout`, `addEventListener`, or as a React `onClick` handler without binding it.

### 4. How do arrow functions handle `this`, and why can't you `bind()` a new value onto one?

**Answer:** Arrow functions have no `this` binding of their own; they resolve `this` lexically by looking at the enclosing scope at the time they were defined, exactly like a closed-over variable. Since there's no internal `this` slot to set, `call`, `apply`, `bind`, and `new` all have no effect on an arrow function's `this` — `arrowFn.bind(obj)` returns a function that still uses the original lexical `this`.

### 5. What's the practical difference between `call`, `apply`, and `bind`?

**Answer:** `call` and `apply` both invoke the function immediately with a given `this`, differing only in how arguments are passed — individually for `call`, as an array for `apply`. `bind` does not invoke anything; it returns a new function with `this` permanently locked, which is what you use when you need a reusable callback rather than a one-off invocation.

### 6. Why does `<button onClick={this.handleClick}>` throw inside a React class component, and how do you fix it?

**Answer:** `this.handleClick` passed as a prop is just a bare function reference; React later invokes it as a standalone call with no receiver, so `this` inside `handleClick` is `undefined` and `this.setState(...)` throws. The standard fixes are binding it in the constructor (`this.handleClick = this.handleClick.bind(this)`), defining it as an arrow-function class field, or wrapping it inline as `onClick={() => this.handleClick()}`.

### 7. Why doesn't this class of bug exist in function components?

**Answer:** Function components have no `this` at all — state comes from `useState` and handlers are ordinary closures over local variables and setter functions. Since there's no object instance whose `this` could be lost, passing a handler defined inside a function component to `onClick` always works correctly without binding.

### 8. What does `this` refer to inside a regular function passed to `setTimeout`, and how do you fix it without `bind`?

**Answer:** A callback passed to `setTimeout` is invoked by the timer with no receiver, so a regular `function` falls back to default binding and `this` is `undefined` or the global object, not the object that scheduled it. Replacing it with an arrow function fixes it because the arrow function has no own `this` and instead inherits it lexically from the enclosing method where `setTimeout` was called.

### 9. If you pass `null` or `undefined` to `Function.prototype.call`, what happens to `this`?

**Answer:** In non-strict mode, JavaScript silently substitutes the global object for a `null`/`undefined` receiver, so `this` ends up being `window` (or `globalThis`) rather than throwing. In strict mode — which applies inside ES modules, class bodies, and any function marked `"use strict"` — `this` stays exactly `null` or `undefined`, so accessing a property on it throws a `TypeError` immediately, which is usually the more useful failure mode for catching bugs early.

## Revision Checklist

- [ ] Explain why `this` must be evaluated at the call-site, never at the function's definition site.
- [ ] Walk through all four binding rules and their exact precedence order, with a one-line example for each.
- [ ] Explain why an extracted method (`const fn = obj.method; fn()`) loses its `this`.
- [ ] Explain why arrow functions have no `this` of their own and cannot be re-bound with `call`/`apply`/`bind`.
- [ ] Distinguish `call`, `apply`, and `bind` precisely, including which ones invoke immediately.
- [ ] Reproduce the `<button onClick={this.handleClick}>` bug from memory and name all three fixes.
- [ ] Explain why function components never need `this`-binding fixes at all.
- [ ] Explain the behavior difference between strict and non-strict mode when `this` would otherwise be `null`/`undefined`.
