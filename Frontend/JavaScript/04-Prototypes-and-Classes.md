# Prototypes and Classes

JavaScript has no real classes at the engine level — every `class`, every `extends`, every method call ultimately resolves through one mechanism: objects linking to other objects. Interviewers probe this because engineers who only know the `class` syntax get stuck the moment they're asked "what does `extends` actually do under the hood," or hit a subtle bug involving shared state on a prototype.

## 1. The Prototype Chain and Method Lookup

Every object has an internal `[[Prototype]]` link (exposed as `__proto__`, though you should never set it directly in real code) to another object. When you access a property, the engine checks the object itself first; if it's not there, it walks up the chain — object to prototype to that prototype's prototype — until it hits `Object.prototype`, and finally `null`, where the chain ends.

```javascript
function ApiClient(baseUrl) {
  this.baseUrl = baseUrl;
}

ApiClient.prototype.get = function (path) {
  return fetch(`${this.baseUrl}${path}`);
};

const client = new ApiClient("https://api.example.com");

client.get("/users"); // "get" isn't on client itself...
// engine checks client -> not found
// engine checks client.__proto__ (ApiClient.prototype) -> found, runs it with `this` = client
```

`client.__proto__ === ApiClient.prototype` is exactly the wire the `new` keyword sets up: `get` lives once in memory on `ApiClient.prototype`, and every `ApiClient` instance reaches it through the chain instead of each instance carrying its own copy. Looking up a property that doesn't exist anywhere on the chain (`client.retryCount`, say) walks all the way to `null` and returns `undefined` — it does not throw.

## 2. `Object.create` — Linking Objects Directly

`Object.create(proto)` builds a new, empty object whose `[[Prototype]]` is set to `proto` directly, with no constructor function or `new` involved. It's the cleanest way to express "this object should fall back to that object" when there's no need for a reusable blueprint.

```javascript
const baseLogger = {
  log(message) {
    console.log(`[${this.serviceName}] ${message}`);
  },
};

const paymentServiceLogger = Object.create(baseLogger);
paymentServiceLogger.serviceName = "payment-service";

paymentServiceLogger.log("charge succeeded"); // "[payment-service] charge succeeded"
// log() isn't on paymentServiceLogger — found via the chain on baseLogger
```

`Object.create(null)` is also the standard trick for building a "dictionary" object with no inherited properties at all — no `toString`, no `hasOwnProperty` — useful when the object's keys come from untrusted input and you don't want a key like `"constructor"` to collide with anything inherited.

## 3. Prototypal Inheritance Before ES6

Before `class` existed, "inheritance" meant manually wiring one constructor's prototype to point at another's, using `Object.create` and calling the parent constructor by hand with `.call()`. This is the exact mechanism `class`/`extends` compiles down to today, so it's worth being able to write it from memory.

```javascript
function HttpClient(baseUrl) {
  this.baseUrl = baseUrl;
}

HttpClient.prototype.request = function (path, options) {
  return fetch(`${this.baseUrl}${path}`, options);
};

function AuthenticatedHttpClient(baseUrl, token) {
  HttpClient.call(this, baseUrl); // manually run the parent constructor against `this`
  this.token = token;
}

// Wire the chain: AuthenticatedHttpClient.prototype -> HttpClient.prototype
AuthenticatedHttpClient.prototype = Object.create(HttpClient.prototype);
AuthenticatedHttpClient.prototype.constructor = AuthenticatedHttpClient; // restore the constructor reference

AuthenticatedHttpClient.prototype.request = function (path, options) {
  const authedOptions = {
    ...options,
    headers: { ...options?.headers, Authorization: `Bearer ${this.token}` },
  };
  return HttpClient.prototype.request.call(this, path, authedOptions); // parent's method, called explicitly
};

const client = new AuthenticatedHttpClient("https://api.example.com", "abc123");
client.request("/users", {});
```

Three manual steps did all the work: `HttpClient.call(this, baseUrl)` to reuse the parent's constructor logic, `Object.create(HttpClient.prototype)` to wire the prototype chain, and `HttpClient.prototype.request.call(this, ...)` to call the parent's version of an overridden method. Forgetting the `.constructor` reassignment is a classic bug — `instanceof` still works without it, but anything that inspects `obj.constructor` breaks.

## 4. ES6 `class`/`extends`/`super` — The Exact Same Mechanism, New Syntax

`class` is syntactic sugar: the engine still creates a constructor function with methods on its `.prototype`, and `extends` still wires one prototype to another via the same chain. Rewriting the exact example from Section 3 with `class` produces identical runtime behavior:

```javascript
class HttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  request(path, options) {
    return fetch(`${this.baseUrl}${path}`, options);
  }
}

class AuthenticatedHttpClient extends HttpClient {
  constructor(baseUrl, token) {
    super(baseUrl); // exactly HttpClient.call(this, baseUrl)
    this.token = token;
  }

  request(path, options) {
    const authedOptions = {
      ...options,
      headers: { ...options?.headers, Authorization: `Bearer ${this.token}` },
    };
    return super.request(path, authedOptions); // exactly HttpClient.prototype.request.call(this, ...)
  }
}

const client = new AuthenticatedHttpClient("https://api.example.com", "abc123");
client.request("/users", {});

// Proof it's the same mechanism:
console.log(typeof HttpClient); // "function" — a class IS a function under the hood
console.log(AuthenticatedHttpClient.prototype.__proto__ === HttpClient.prototype); // true
console.log(client instanceof HttpClient); // true — same chain `instanceof` walks either way
```

Every piece maps one-to-one to Section 3: `extends HttpClient` is `Object.create(HttpClient.prototype)`, `super(baseUrl)` in the constructor is `HttpClient.call(this, baseUrl)`, and `super.request(...)` inside an overriding method is `HttpClient.prototype.request.call(this, ...)`. The real differences `class` adds are enforced rules, not a different runtime model: you cannot call a derived class's constructor before calling `super()` (accessing `this` before that throws a `ReferenceError`), and a `class` body — unlike a function declaration — is never hoisted usably; it stays in the "temporal dead zone" until the line it's declared on runs.

## 5. Static Methods and Fields

`static` attaches a property directly to the constructor/class itself, not to `.prototype` — so it's shared at the class level and never appears on instances. It's the right place for factory methods and constants that belong to the concept of "HttpClient," not to any one client.

```javascript
class HttpClient {
  static defaultTimeoutMs = 5000; // static field — one copy, lives on the class itself

  static withDefaultTimeout(baseUrl) {
    return new HttpClient(baseUrl, HttpClient.defaultTimeoutMs); // static factory method
  }

  constructor(baseUrl, timeoutMs = HttpClient.defaultTimeoutMs) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }
}

const client = HttpClient.withDefaultTimeout("https://api.example.com");
console.log(HttpClient.defaultTimeoutMs); // 5000 — reachable off the class
console.log(client.defaultTimeoutMs); // undefined — not reachable off an instance
```

The equivalent pre-ES6 version is just `HttpClient.defaultTimeoutMs = 5000` and `HttpClient.withDefaultTimeout = function (...) {...}` assigned directly onto the constructor function — `static` is sugar for exactly that assignment.

## 6. Private Fields (`#field`)

A `#`-prefixed field is enforced by the engine, not by convention — code outside the class cannot read, write, or even detect the field's existence, unlike the old `_balance` naming convention which was just a hint that relied on nobody violating it.

```javascript
class BankAccountClient {
  #authToken; // private field — genuinely inaccessible outside this class

  constructor(authToken) {
    this.#authToken = authToken;
  }

  #buildHeaders() {
    // private method — same enforcement
    return { Authorization: `Bearer ${this.#authToken}` };
  }

  fetchBalance(accountId) {
    return fetch(`/accounts/${accountId}/balance`, { headers: this.#buildHeaders() });
  }
}

const client = new BankAccountClient("secret-token");
client.fetchBalance("acct-1"); // works fine

console.log(client.authToken); // undefined — no such public property
console.log(client.#authToken); // SyntaxError outside the class body — not just undefined, a hard failure
```

That last line is the tell interviewers listen for: reading a private field from outside the class isn't `undefined`, it's a `SyntaxError` at parse time, because `#authToken` isn't valid syntax unless it appears inside the declaring class's own body.

## 7. Getters and Setters

`get`/`set` let a property read like a plain field from the outside while running real logic underneath — validation, computed values, or logging — without callers needing to know it isn't just a stored value.

```javascript
class RetryableRequest {
  #attempts = 0;

  get attemptsRemaining() {
    return Math.max(0, RetryableRequest.MAX_ATTEMPTS - this.#attempts);
  }

  set attempts(value) {
    if (value < 0) {
      throw new RangeError("attempts cannot go negative");
    }
    this.#attempts = value;
  }

  static MAX_ATTEMPTS = 3;
}

const req = new RetryableRequest();
req.attempts = 1; // looks like a plain assignment, actually runs the setter's validation
console.log(req.attemptsRemaining); // 2 — computed on read, not stored anywhere
req.attempts = -5; // throws RangeError
```

Combined with a private field, this is the standard way to expose a controlled, read-computed or validated-write view of internal state — the exact same invariant-protection idea as a validating setter in any other language, just expressed with `get`/`set` syntax instead of a `getX()`/`setX()` method pair.

## Interview Questions and Answers

### 1. What actually happens when you write `obj.someMethod()` and `someMethod` isn't defined directly on `obj`?

**Answer:** The engine checks `obj` itself first; if the property isn't found, it follows `obj.__proto__` to the next object in the chain, and keeps walking until it either finds the property or reaches `null` at the end of the chain (`Object.prototype.__proto__`). If it reaches `null` without finding it, the result is `undefined` for a plain access, or a `TypeError` if you try to call it as a function.

### 2. How is `class`/`extends` different from manually wiring `Object.create` and `.call()`, if it's "the same mechanism"?

**Answer:** The runtime object model is identical — `extends` still wires `Child.prototype.__proto__` to `Parent.prototype`, and `super(...)` still runs the parent constructor against the new instance's `this`, exactly like `Parent.call(this, ...)` did before ES6. The differences are enforced rules the engine adds: you cannot touch `this` in a derived constructor before calling `super()`, and a `class` declaration is not usable before its line runs (temporal dead zone), unlike a function declaration.

### 3. What's the difference between a property on `Button.prototype` and a property assigned inside the `Button` constructor with `this.x = ...`?

**Answer:** A property on `Button.prototype` exists once in memory and is shared — reached through the chain — by every instance, which is why methods belong there. A property set with `this.x` inside the constructor is created fresh on every single instance, which is correct for unique instance data like a `baseUrl`, but would waste memory if used for a method that behaves identically across every instance.

### 4. Why does forgetting to reset `Child.prototype.constructor` after `Child.prototype = Object.create(Parent.prototype)` cause a bug, and does `class` have the same trap?

**Answer:** After that line, `Child.prototype.constructor` still points at `Parent`, because the newly created object inherited `constructor` from `Parent.prototype` instead of pointing back at `Child` — code that inspects `instance.constructor.name` for logging or reflection silently gets the wrong class name. `class extends` doesn't have this trap: the engine sets up the constructor link correctly and automatically, which is one of the concrete bugs `class` syntax was designed to prevent.

### 5. How does a private field (`#token`) differ from the old `_token` underscore convention?

**Answer:** `_token` is purely a naming convention — nothing stops outside code from reading or writing `instance._token` directly, it's just a signal to other developers not to. `#token` is enforced by the JavaScript engine itself: accessing `instance.#token` from outside the declaring class is a `SyntaxError`, not merely `undefined`, so there is no way to accidentally or deliberately reach into it from outside.

### 6. When would you reach for a getter/setter instead of a plain public field?

**Answer:** When reading or writing the value needs to trigger real logic — validation on write (like rejecting a negative retry count), a computed value on read (like `attemptsRemaining` derived from a private counter), or a side effect like logging — while still letting callers use plain `obj.prop` syntax instead of `obj.getProp()`/`obj.setProp()`. A plain public field is fine when there's genuinely no invariant to protect and no computation involved.

### 7. Is a `static` method reachable on an instance? What about a static field?

**Answer:** No — a `static` member lives on the class/constructor function itself, not on `.prototype`, so instances never see it through the prototype chain. `HttpClient.withDefaultTimeout(...)` is callable, but `client.withDefaultTimeout(...)` on an instance throws a `TypeError`, since that method was never placed anywhere the instance's chain reaches.

### 8. What actually is `Object.create(null)` useful for, and why not just use `{}`?

**Answer:** `Object.create(null)` produces an object with no prototype at all, so it inherits nothing from `Object.prototype` — no `toString`, no `hasOwnProperty`, no `constructor`. `{}` implicitly inherits from `Object.prototype`, which becomes a real problem if the object is used as a dictionary with attacker-influenced keys, since a key like `"toString"` or `"constructor"` would otherwise collide with an inherited method instead of behaving like a plain data slot.

## Revision Checklist

- [ ] Explain method lookup as a literal walk up the `__proto__` chain, ending at `null`.
- [ ] Write the pre-ES6 inheritance pattern from memory: `Parent.call(this, ...)`, `Object.create(Parent.prototype)`, and resetting `.constructor`.
- [ ] Rewrite that same pattern with `class`/`extends`/`super` and point out the line-by-line equivalence.
- [ ] Explain why `super()` must run before `this` is touched in a derived constructor.
- [ ] Distinguish a `static` member (lives on the class) from an instance method (lives on `.prototype`, reached via the chain).
- [ ] Explain why `#field` is a hard `SyntaxError` from outside, not just a convention like `_field`.
- [ ] Justify a getter/setter over a plain field with a concrete validation or computed-value example.
