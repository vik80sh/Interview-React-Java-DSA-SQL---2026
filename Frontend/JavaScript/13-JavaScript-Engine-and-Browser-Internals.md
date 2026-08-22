# JavaScript Engine Internals

Every JS interview eventually asks some version of "what actually happens when the browser runs your code?" Knowing the answer — parsing to an AST, interpreting vs JIT-compiling, hidden classes, and the call stack — is what separates "it just works" from being able to explain a real perf regression or a `Maximum call stack size exceeded` crash in production. This guide covers only the engine's parsing-and-execution model; the page-rendering pipeline (DOM/CSSOM/render tree/layout/paint) is covered separately in the HTML-CSS guide.

## 1. Lexing, Parsing, and the AST

Before a single line of your code runs, the engine (V8 in Chrome/Node, SpiderMonkey in Firefox, JavaScriptCore in Safari) has to turn raw source text into a structure it can actually execute:

```text
Source text ---> Tokens (lexing) ---> AST (parsing) ---> Bytecode ---> (maybe) machine code
```

* **Lexing** breaks the raw characters into tokens — keywords, identifiers, operators, literals.
* **Parsing** arranges those tokens into an **Abstract Syntax Tree (AST)**, a tree representation of the program's grammar (a `FunctionDeclaration` node containing a `BlockStatement`, containing an `IfStatement`, and so on).
* V8 does not fully parse every function body up front. It **pre-parses** — a fast pass that just finds matching braces, scopes, and syntax errors — and defers the full parse (and bytecode generation) of a function's body until that function is actually called. This is called **lazy parsing**.

**Real-world example:** A production checkout bundle (`checkout.bundle.js`) can easily be several megabytes, containing hundreds of component functions, validators, and admin-only utilities bundled together for one deploy. On page load, V8 doesn't pay the full parse cost for every one of those functions — it pre-parses the whole file quickly, then only fully parses and compiles the body of, say, `renderCartSummary()` when it's actually invoked. A rarely-used `renderAdminRefundPanel()` function that ships in the same bundle but is never called for a normal customer session never gets fully parsed at all during that session, which is exactly why lazy parsing matters for real-world startup performance on large bundles.

## 2. Execution Contexts and the Call Stack

Execution happens inside **execution contexts**. The engine creates a **Global Execution Context** first, and every function call pushes a new **Function Execution Context** on top of a single, LIFO **call stack**. Because there is exactly one call stack, JavaScript can only run one piece of code at a time — this is what people mean when they say JS is "single-threaded" at the engine level (how the browser still handles I/O concurrently around that single stack is the event loop's job, covered separately).

```text
printReplies(comment)
  -> printReplies(comment.parent)
       -> printReplies(comment.parent.parent)
            -> ... (stack keeps growing, one frame per call)
```

**Real-world example:** Rendering a nested comment thread (a social feed's "replies to replies") with a function that recursively walks up to the root comment. If a backend data bug creates a cyclical `parent` reference — comment A's parent is B, and B's parent is accidentally set back to A — the recursive walk never terminates, and the call stack keeps growing one frame per call until the browser throws `RangeError: Maximum call stack size exceeded`. Pausing on that exception in DevTools shows the call stack panel filled with the same function repeating, which is exactly how you'd spot the cycle in the data rather than a bug in the recursion logic itself.

## 3. Interpreter vs. JIT Compilation

V8 doesn't compile everything to machine code up front, and it doesn't purely interpret forever either — it does both, in stages:

* **Ignition (interpreter):** compiles the AST to bytecode and executes it directly. This is fast to start, which matters a lot for page-load-sensitive code.
* **TurboFan (JIT compiler):** watches execution and profiles which functions are called repeatedly with consistent argument shapes — these are "hot" functions. It compiles those specific functions to **optimized native machine code**, skipping the interpreter entirely for future calls.
* **Deoptimization:** the optimized code is built on assumptions gathered from past calls (e.g., "this argument is always a plain object with a `price` field that's a number"). If a later call breaks that assumption, V8 discards the optimized version and falls back to the interpreter — a **deopt**.

**Real-world example:** A `calculateCartTotal(items)` function runs on every add-to-cart click and every re-render of the cart page — potentially thousands of calls in one shopping session. After a handful of calls with a consistent shape (`items` is always an array of `{ price, qty }` objects), TurboFan compiles a heavily optimized version of that function. If a promo code path later calls the same function with items missing `qty` (a `{ price, isFreeGift: true }` object with no `qty` field), V8 deoptimizes `calculateCartTotal` back to the interpreter — a real, measurable perf regression that shows up in a CPU profiler as a "deopt" event, and the fix is making the object shapes passed into hot functions consistent, not "add more code."

## 4. Hidden Classes and Inline Caches

JavaScript objects are dynamically typed — you can add or remove properties at any time — but V8 still needs fast property access. It does this with **hidden classes** (internally called "Maps" or "Shapes"): an internal descriptor of an object's property layout (which properties exist, in what order, at what offset), created behind the scenes so property access can be a fast offset lookup instead of a slow dictionary lookup.

Alongside hidden classes, V8 attaches an **Inline Cache (IC)** to each property-access site in your code. The IC remembers which hidden class it saw last time at that exact line:

* **Monomorphic:** the callsite always sees the same hidden class — fastest.
* **Polymorphic:** it sees a small, bounded set of different hidden classes — still reasonably fast.
* **Megamorphic:** it sees too many different hidden classes — V8 gives up optimizing that site and falls back to a slower generic lookup.

**Real-world example:** Rendering an order-history table with `orders.map(o => o.total)`. If every `Order` object returned by the API is built the same way — always `{ id, total, status, createdAt }`, fields assigned in that same order — every `Order` shares one hidden class, and the `.total` access inside `.map()` stays monomorphic and fast. But if a different code path (say, a legacy endpoint used for refunded orders) builds the object with an extra `refundReason` field added conditionally, or assigns the same fields in a different order, those `Order` objects end up with a different hidden class. The `.total` access site in that shared `.map()` call now sees two (or more) hidden classes and degrades to polymorphic or megamorphic — a subtle, easy-to-miss perf cost that only shows up under profiling, not in a code review.

## Interview Questions and Answers

### 1. What are the stages source code goes through before it actually runs in V8?

**Answer:** Source text is lexed into tokens, parsed into an AST, and compiled to bytecode that Ignition (the interpreter) executes; functions that get called repeatedly with stable input shapes are later JIT-compiled by TurboFan into optimized native machine code. Not every function reaches that last stage — most code just runs as interpreted bytecode.

### 2. What is lazy parsing, and why does it matter for a large production bundle?

**Answer:** V8 pre-parses a function body just enough to find its boundaries and catch syntax errors, but defers the full parse (and bytecode generation) until the function is actually called. This means a multi-megabyte bundle containing rarely-used code (like an admin-only panel bundled with the main app) doesn't pay the full parse cost for that code during a normal user's session.

### 3. Why does a deeply recursive function throw `Maximum call stack size exceeded` instead of just running slowly?

**Answer:** Each function call pushes a new frame onto the single call stack, and the stack has a fixed size limit set by the engine. A recursive function with no valid base case — like a comment-thread walk hitting a cyclical parent reference — keeps pushing frames until that limit is hit, and the engine throws a `RangeError` rather than let the stack grow unbounded.

### 4. What's the practical difference between the interpreter and the JIT compiler?

**Answer:** The interpreter (Ignition) compiles bytecode and runs it directly, which starts fast but runs slower per call. The JIT compiler (TurboFan) profiles which functions are "hot" — called often with consistent argument shapes — and compiles just those to optimized native machine code, which is why a long-running Node process or a heavily interacted-with page can get measurably faster over time as its hot paths warm up.

### 5. What causes a JIT-optimized function to deoptimize?

**Answer:** Deoptimization happens when a call to an already-optimized function violates the assumptions the JIT made from earlier calls — most commonly, receiving an object with a different shape than before. A `calculateCartTotal(items)` function optimized for `{ price, qty }` objects that suddenly receives a `{ price, isFreeGift: true }` object (no `qty`) is a realistic trigger, and the engine falls back to the interpreter for that function until it can re-optimize.

### 6. What is a hidden class in V8, and why does it exist?

**Answer:** A hidden class is V8's internal descriptor of an object's property layout — which properties exist, in what order, at what memory offset — created so that property access can be a fast, fixed-offset lookup instead of a dictionary/hash lookup on every access. Objects created with the same properties assigned in the same order share a hidden class; objects built differently (extra conditional fields, different assignment order) get separate hidden classes even if they represent "the same kind of thing" logically.

### 7. What's the difference between a monomorphic and a megamorphic inline cache, and why should you care as an engineer?

**Answer:** A monomorphic inline cache means a property-access callsite has only ever seen one hidden class, so the engine can keep using a fast, specialized lookup; megamorphic means it's seen too many different hidden classes and the engine falls back to a slow, generic lookup. You should care because it's an invisible perf cliff — code like `orders.map(o => o.total)` looks identical whether the `Order` objects behind it share a shape or not, but the runtime cost is very different.

### 8. Is JavaScript single-threaded because of the call stack, and does that mean the browser can't do anything concurrently?

**Answer:** Yes and no — there is exactly one call stack, so only one piece of JS can be executing at any instant, which is what "single-threaded" refers to at the engine level. The browser still does network requests, timers, and I/O concurrently outside that stack and schedules the results back onto it via the event loop, which is a separate mechanism covered in the async/event-loop guide, not part of the engine's parsing/execution model itself.

## Revision Checklist

- [ ] Explain the source-to-execution pipeline: tokens, AST, bytecode, and (sometimes) JIT-compiled machine code.
- [ ] Explain lazy parsing and why it helps large real-world bundles at startup.
- [ ] Draw how the call stack grows on a recursive call and explain why `Maximum call stack size exceeded` happens.
- [ ] Explain the difference between the interpreter (Ignition) and the JIT compiler (TurboFan), and what "hot" means.
- [ ] Give a concrete example of a deoptimization trigger (inconsistent object shape into a hot function).
- [ ] Explain what a hidden class is and why consistent object construction order matters for performance.
- [ ] Explain monomorphic vs. polymorphic vs. megamorphic inline caches with a real list-rendering example.
- [ ] State clearly that JS has one call stack, and know that the event loop and the render pipeline are documented in their own separate guides, not here.
