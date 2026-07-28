# JavaScript Fundamentals for React
## Event Loop, Closure, Async/Await, Promises - Essential for Interviews

---

## TABLE OF CONTENTS
1. Event Loop & Execution Context
2. Closure Deep Dive
3. Promises & Async/Await
4. Common JavaScript Patterns
5. Interview Questions & Answers

---

# PART 1: EVENT LOOP & EXECUTION CONTEXT

## The Event Loop (Most Important!)

```javascript
// INTERVIEW: "Explain the event loop"

// JavaScript is SINGLE-THREADED
// Event loop coordinates execution of:
// 1. Synchronous code (Call stack)
// 2. Asynchronous callbacks (Callback queue, Microtask queue)

// VISUAL:
/*
┌─────────────────────────────────────┐
│       JavaScript Engine             │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────┐  ┌────────────┐  │
│  │  Call Stack  │  │  Memory    │  │
│  │ (sync code)  │  │  (variables)│ │
│  └──────────────┘  └────────────┘  │
│                                     │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│      Event Loop (Browser/Node)      │
├─────────────────────────────────────┤
│ 1. Check Call Stack (empty?)        │
│ 2. Check Microtask Queue (Promise)  │
│ 3. Check Callback Queue (setTimeout)│
│ 4. Render if needed                 │
│ 5. Repeat                           │
└─────────────────────────────────────┘
*/

// EXECUTION ORDER:
console.log('1. Synchronous');

setTimeout(() => console.log('2. setTimeout'), 0);

Promise.resolve()
  .then(() => console.log('3. Promise'));

console.log('4. Synchronous');

// OUTPUT:
// 1. Synchronous
// 4. Synchronous
// 3. Promise
// 2. setTimeout

// WHY THIS ORDER?
// 1. Call stack: console.log 1, console.log 4
// 2. Microtask queue (empty): Promise
// 3. Callback queue (empty): setTimeout
```

---

## Execution Context & Call Stack

```javascript
// EXECUTION CONTEXT = Environment where code runs
// Contains: variables, scope, this

function outer() {
  console.log('outer called');
  
  function inner() {
    console.log('inner called');
  }
  
  inner();
}

outer();

// CALL STACK VISUALIZATION:
/*
Step 1: outer() called
┌──────────────┐
│   global()   │
├──────────────┤
│  outer()     │  ← current
└──────────────┘

Step 2: inner() called from outer
┌──────────────┐
│   global()   │
├──────────────┤
│   outer()    │
├──────────────┤
│  inner()     │  ← current
└──────────────┘

Step 3: inner() returns
┌──────────────┐
│   global()   │
├──────────────┤
│  outer()     │  ← current
└──────────────┘

Step 4: outer() returns
┌──────────────┐
│   global()   │  ← current
└──────────────┘
*/

// KEY CONCEPTS:
// - Stack: LIFO (Last In, First Out)
// - Each function call creates execution context
// - Scope chain: local → function → global
```

---

## Scope & Scope Chain

```javascript
// GLOBAL SCOPE
var globalVar = 'global';

function outer() {
  // OUTER FUNCTION SCOPE
  var outerVar = 'outer';
  
  function inner() {
    // INNER FUNCTION SCOPE
    var innerVar = 'inner';
    
    console.log(innerVar);   // ✅ inner
    console.log(outerVar);   // ✅ outer (scope chain)
    console.log(globalVar);  // ✅ global (scope chain)
  }
  
  inner();
  console.log(innerVar);     // ❌ ReferenceError: innerVar not defined
}

outer();

// SCOPE CHAIN:
// inner() can access:
// 1. Its own scope (innerVar)
// 2. outer() scope (outerVar)
// 3. Global scope (globalVar)

// But outer() cannot access inner's scope
```

---

# PART 2: CLOSURE DEEP DIVE

## What is a Closure?

```javascript
// CLOSURE = Function + its lexical scope (parent scope)

// Simple closure:
function makeCounter() {
  let count = 0; // Captured in closure
  
  return function increment() {
    count++;
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3

// WHAT'S HAPPENING:
// 1. makeCounter() creates scope with count = 0
// 2. Returns increment function
// 3. increment closes over count variable
// 4. Even after makeCounter() returns, increment remembers count
// 5. Each call to counter() accesses the SAME count variable
```

---

## Closure Use Cases

### Case 1: Data Privacy

```javascript
function createBankAccount(initialBalance) {
  // balance is PRIVATE (not accessible directly)
  let balance = initialBalance;
  
  return {
    deposit: function(amount) {
      balance += amount;
      return balance;
    },
    withdraw: function(amount) {
      balance -= amount;
      return balance;
    },
    getBalance: function() {
      return balance;
    }
  };
}

const account = createBankAccount(1000);
console.log(account.deposit(500));   // 1500
console.log(account.withdraw(200));  // 1300
console.log(account.getBalance());   // 1300
console.log(account.balance);        // undefined (private!)

// Cannot do: account.balance = 10000; (doesn't work)
// Balance is truly encapsulated
```

---

### Case 2: Function Factories

```javascript
function makeMultiplier(multiplier) {
  return function(number) {
    return number * multiplier;
  };
}

const double = makeMultiplier(2);
const triple = makeMultiplier(3);

console.log(double(5));  // 10
console.log(triple(5));  // 15

// Each function has its own closure with different multiplier
```

---

### Case 3: Callbacks with Context

```javascript
// INTERVIEW QUESTION: How to preserve context in callbacks?

class User {
  constructor(name) {
    this.name = name;
  }
  
  // ❌ PROBLEM: Lost context
  async getDataWithoutClosure() {
    const data = await fetch('/api/user');
    console.log(this.name); // ❌ undefined (this is wrong)
  }
  
  // ✅ SOLUTION 1: Arrow function (has closure)
  async getDataWithArrow() {
    const data = await fetch('/api/user');
    console.log(this.name); // ✅ works (arrow function closes over this)
  }
  
  // ✅ SOLUTION 2: Save this in closure
  async getDataWithClosure() {
    const self = this;
    const data = await fetch('/api/user');
    console.log(self.name); // ✅ works (closes over self)
  }
}

// Arrow functions are better because:
// - Lexical this binding (from enclosing scope)
// - No need to save this variable
```

---

### Case 4: Common Closure Bug

```javascript
// ❌ PROBLEM: Closure over loop variable

const functions = [];

for (var i = 0; i < 3; i++) {
  functions.push(function() {
    console.log(i);
  });
}

functions[0](); // 3 (not 0!)
functions[1](); // 3 (not 1!)
functions[2](); // 3 (not 2!)

// WHY? All functions close over the SAME i variable
// After loop, i = 3
// When functions call, they see i = 3

// ✅ SOLUTION 1: Use let (block scope)
const functions = [];

for (let i = 0; i < 3; i++) { // let, not var
  functions.push(function() {
    console.log(i);
  });
}

functions[0](); // 0 ✅
functions[1](); // 1 ✅
functions[2](); // 2 ✅

// Why? let creates NEW binding for each iteration

// ✅ SOLUTION 2: Immediately-Invoked Function Expression (IIFE)
const functions = [];

for (var i = 0; i < 3; i++) {
  (function(j) {
    functions.push(function() {
      console.log(j);
    });
  })(i); // Pass i to create separate scope
}

functions[0](); // 0 ✅
functions[1](); // 1 ✅
functions[2](); // 2 ✅
```

---

# PART 3: PROMISES & ASYNC/AWAIT

## Promises Deep Dive

```javascript
// PROMISE = Object representing eventual completion or failure

// States:
// 1. PENDING: Initial state
// 2. FULFILLED: Operation succeeded
// 3. REJECTED: Operation failed

// ✅ Creating promises
const promise1 = new Promise((resolve, reject) => {
  // resolve(value) → FULFILLED
  // reject(error) → REJECTED
  
  setTimeout(() => {
    resolve('Success!');
  }, 1000);
});

const promise2 = Promise.resolve('Immediate success');
const promise3 = Promise.reject('Immediate error');

// ✅ Consuming promises
promise1
  .then(result => console.log(result)) // Called when fulfilled
  .catch(error => console.log(error))  // Called when rejected
  .finally(() => console.log('Done')); // Always called
```

---

## Promise Chaining

```javascript
// PROBLEM: Nested promises (callback hell)
function getUser() {
  return fetch('/api/user').then(r => r.json());
}

function getPosts(userId) {
  return fetch(`/api/posts/${userId}`).then(r => r.json());
}

function getComments(postId) {
  return fetch(`/api/comments/${postId}`).then(r => r.json());
}

// ❌ Callback hell
getUser()
  .then(user => {
    return getPosts(user.id)
      .then(posts => {
        return getComments(posts[0].id)
          .then(comments => {
            console.log(comments);
          });
      });
  })
  .catch(error => console.log(error));

// ✅ Proper promise chaining
getUser()
  .then(user => getPosts(user.id))        // return promise
  .then(posts => getComments(posts[0].id)) // return promise
  .then(comments => console.log(comments))
  .catch(error => console.log(error));

// KEY: Each .then() returns a promise!
```

---

## Async/Await (Modern Approach)

```javascript
// ASYNC/AWAIT = Syntactic sugar for promises

// ✅ MODERN: Async/await
async function getComments() {
  try {
    const user = await getUser();
    const posts = await getPosts(user.id);
    const comments = await getComments(posts[0].id);
    console.log(comments);
  } catch (error) {
    console.log(error);
  }
}

// EQUIVALENT TO:
function getCommentsOld() {
  return getUser()
    .then(user => getPosts(user.id))
    .then(posts => getComments(posts[0].id))
    .then(comments => console.log(comments))
    .catch(error => console.log(error));
}

// BENEFITS:
// - Reads like synchronous code
// - Easier to understand
// - Can use try/catch
// - Better debugging
```

---

## Parallel vs Sequential

```javascript
// ❌ SEQUENTIAL: Takes long time
async function slow() {
  const user = await getUser();          // 1s
  const posts = await getPosts(user.id);  // 1s
  const friends = await getFriends(user.id); // 1s
  // Total: 3 seconds
}

// ✅ PARALLEL: Faster
async function fast() {
  const user = await getUser(); // 1s
  
  // These don't depend on each other, run in parallel
  const [posts, friends] = await Promise.all([
    getPosts(user.id),    // 1s (concurrent)
    getFriends(user.id)   // 1s (concurrent)
  ]);
  
  // Total: 2 seconds!
}

// ✅ ALSO PARALLEL: Using Promise.all()
Promise.all([
  fetch('/api/user'),
  fetch('/api/posts'),
  fetch('/api/friends')
])
.then(([userRes, postsRes, friendsRes]) => {
  // All requests in parallel
})

// Other utilities:
Promise.allSettled([p1, p2, p3]) // Wait for all (success or failure)
Promise.race([p1, p2, p3])        // Return first completed
Promise.any([p1, p2, p3])         // Return first fulfilled
```

---

# PART 4: COMMON JAVASCRIPT PATTERNS

## Debounce & Throttle

```javascript
// DEBOUNCE: Wait until user stops doing something
function debounce(func, delay) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// EXAMPLE: Search as user types
const handleSearch = debounce((query) => {
  fetch(`/api/search?q=${query}`);
}, 500);

input.addEventListener('input', (e) => {
  handleSearch(e.target.value);
});

// If user types: "react" (5 letters)
// Debounce fires ONCE after 500ms pause
// Not 5 separate API calls

// THROTTLE: Limit function calls to every N milliseconds
function throttle(func, delay) {
  let lastCall = 0;
  
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      func(...args);
      lastCall = now;
    }
  };
}

// EXAMPLE: Scroll event (fires many times)
const handleScroll = throttle(() => {
  console.log('Scrolling...');
}, 1000);

window.addEventListener('scroll', handleScroll);

// Throttle runs max once per second
```

---

## Try/Catch & Error Handling

```javascript
// Basic try/catch
try {
  riskyOperation();
} catch (error) {
  console.error('Error caught:', error.message);
} finally {
  cleanup();
}

// With async/await
async function safeOperation() {
  try {
    const data = await fetch('/api/data');
    return await data.json();
  } catch (error) {
    if (error instanceof TypeError) {
      console.log('Network error');
    } else {
      console.log('Other error:', error);
    }
  }
}

// Custom error handling
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validate(input) {
  if (!input.trim()) {
    throw new ValidationError('Input cannot be empty');
  }
}

try {
  validate('');
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.message);
  }
}
```

---

# PART 5: INTERVIEW QUESTIONS

## Question 1: Explain the event loop

**Answer:**
```
JavaScript runs on a single thread. The event loop coordinates:

1. Call Stack: Where function calls execute (synchronous code)
2. Web APIs: Browser features (setTimeout, fetch, events)
3. Callback Queue: setTimeout callbacks wait here
4. Microtask Queue: Promises wait here (higher priority)

Order of execution:
1. All synchronous code (call stack)
2. Microtasks (Promises)
3. Macrotasks (setTimeout)
4. Render
5. Repeat

Key insight: Promises execute before setTimeout!
```

---

## Question 2: What is a closure?

**Answer:**
```
A closure is a function that has access to:
1. Its own scope
2. Outer function's scope
3. Global scope

Closures are created every time a function is created.

Use cases:
- Data privacy (encapsulation)
- Function factories
- Callbacks with context
```

---

## Question 3: Async/await vs promises - Which is better?

**Answer:**
```
Async/await is generally better because:
1. Reads like synchronous code (easier to understand)
2. Better error handling (try/catch)
3. Better debugging (breakpoints work better)
4. Simpler code (no .then chains)

But under the hood, async/await IS promises!
So both work equally well performance-wise.

When to use each:
- Simple operation: Either is fine
- Complex chains: async/await
- Need to understand internals: promises
```

---

## Question 4: Write a function that retries N times

```javascript
// INTERVIEW QUESTION: Implement retry logic

async function retryAsync(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error; // Last attempt failed
      
      console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// USAGE:
async function unreliableAPI() {
  if (Math.random() < 0.7) {
    throw new Error('API failed');
  }
  return 'Success!';
}

try {
  const result = await retryAsync(unreliableAPI, 3, 1000);
  console.log(result);
} catch (error) {
  console.log('All retries failed:', error.message);
}
```

---

## Question 5: Memory leak with closures?

```javascript
// CLOSURE MEMORY LEAK: Holding onto large objects

function createComponent() {
  const largeData = new Array(1000000).fill('data'); // Large array
  
  return function() {
    console.log(largeData.length); // Closes over largeData!
  };
}

const fn = createComponent();
// largeData stays in memory as long as fn exists!

// SOLUTION: Clean up when no longer needed
let fn = createComponent();
fn(); // Use it
fn = null; // Release closure, largeData can be garbage collected

// Or don't capture if not needed:
function createComponent() {
  const largeData = new Array(1000000).fill('data');
  const size = largeData.length; // Capture size, not array
  
  return function() {
    console.log(size); // Only size stays in memory
  };
}
```

---

# SUMMARY: JavaScript Fundamentals Mastery

✅ **Event Loop:**
- [ ] Understand call stack
- [ ] Know microtask vs callback queue
- [ ] Understand execution order
- [ ] Can predict console output

✅ **Closure:**
- [ ] Understand what closure is
- [ ] Know use cases
- [ ] Avoid common bugs (var in loop)
- [ ] Understand memory implications

✅ **Promises:**
- [ ] Understand states (pending, fulfilled, rejected)
- [ ] Know promise chaining
- [ ] Understand .then/.catch/.finally

✅ **Async/Await:**
- [ ] Prefer async/await over promises
- [ ] Know parallel vs sequential
- [ ] Understand Promise.all() usage
- [ ] Know error handling with try/catch

✅ **Common Patterns:**
- [ ] Debounce & throttle
- [ ] Error handling
- [ ] Retry logic

---

**Master JavaScript fundamentals—they're asked in EVERY React interview!**
