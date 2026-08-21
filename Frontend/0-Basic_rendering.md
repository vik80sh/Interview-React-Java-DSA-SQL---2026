# React Interview Terms: Explained

---

## REACT FIBER

### What is it?
**Fiber** is React's internal architecture for managing component rendering and updates.

```javascript
// Before Fiber (React 15)
// Render tree completely or nothing
// If interrupted, had to start over
// Large trees froze the UI

// After Fiber (React 16+)
// Breaks rendering into small units (fibers)
// Can pause, resume, abort rendering
// Prioritizes important updates
```

### Fiber Structure (In Memory)
```javascript
{
  type: 'div',                    // Component type or DOM tag
  key: 'list-item-1',            // Unique identifier
  ref: myRef,                    // Reference to DOM element
  props: { children: [...] },    // Component props
  
  // Fiber tree links
  return: parentFiber,           // Parent fiber
  child: firstChildFiber,        // First child
  sibling: nextSiblingFiber,     // Next sibling
  
  // State management
  state: stateValue,             // Component state
  hooks: [                        // useState, useEffect, etc.
    { hook: useState, state: value }
  ],
  
  // Work tracking
  alternate: oldFiber,           // Previous version (for diffing)
  effectTag: 'UPDATE',           // PLACEMENT | UPDATE | DELETION
  effects: [effectList],         // Changes to apply
  
  // Timing
  expirationTime: 1234567890,    // Deadline for this fiber
  childExpirationTime: 1234567891
}
```

### Why Fiber Matters (Interview Answer)
```
Q: Why did React introduce Fiber?

A: 
1. INTERRUPTION: Render can be paused/resumed
   - JS blocking removed
   - Can work on more important updates first
   - Main thread stays responsive

2. PRIORITIZATION: Some updates are more urgent
   - User input (very urgent)
   - Data updates (medium)
   - Pre-fetching (low)
   - Each gets different priority level

3. INCREMENTAL RENDERING: Break work into chunks
   - Render 1 fiber → yield control
   - Browser can paint/handle events
   - Resume next fiber
   - Smoother 60fps experience
```

### Fiber Rendering Process
```
1. RENDER PHASE (Can be paused)
   For each fiber:
     - Call component function
     - Create/update VDOM
     - Mark changes (effectTag)
   
   Can be interrupted → stop, go back later

2. COMMIT PHASE (Cannot be paused)
   Apply all marked changes to real DOM:
     - Update DOM
     - Call useEffect
     - Update refs
   
   Must complete atomically (all or nothing)
```

---

## RECONCILIATION (Diffing Algorithm)

### What is it?
Process of comparing **old VDOM** with **new VDOM** to figure out what changed.

```
Old VDOM:
<ul>
  <li key="1">Alice</li>
  <li key="2">Bob</li>
</ul>

New VDOM (Bob was deleted):
<ul>
  <li key="1">Alice</li>
</ul>

Reconciliation:
1. Compare <ul> tags → Same, reuse
2. Compare <li key="1"> → Same, reuse (Alice)
3. Compare <li key="2"> → Missing in new, DELETE (Bob)

Result: Only Bob's element is removed
Alice's element is reused (not re-created)
```

### Reconciliation Rules (Interview)

**Rule 1: Same Element Type = UPDATE**
```javascript
// OLD
<div className="red">Hello</div>

// NEW
<div className="blue">Hello</div>

// Reconciliation:
React reuses same DOM node
Updates: className from 'red' → 'blue'
✅ Efficient (DOM node stays, only attributes change)
```

**Rule 2: Different Element Type = DELETE + CREATE**
```javascript
// OLD
<div>Hello</div>

// NEW
<span>Hello</span>

// Reconciliation:
React deletes <div> completely
React creates new <span>
All children lose state/refs
❌ Inefficient (complete recreation)
```

**Rule 3: Key Matters**
```javascript
// WITHOUT keys - Order dependent
<ul>
  <li>Alice</li>     // index 0
  <li>Bob</li>       // index 1
  <li>Charlie</li>   // index 2
</ul>

// If Bob deleted:
React: "Item at index 1 changed (was Bob, now Charlie)"
Thinks: Delete entire <li>Bob</li>, create <li>Charlie</li>
Result: Bob's state is lost, Charlie inherits Bob's DOM

// WITH keys - Stable identity
<ul>
  <li key="alice">Alice</li>
  <li key="bob">Bob</li>
  <li key="charlie">Charlie</li>
</ul>

// If Bob deleted:
React: "key='bob' is gone"
Knows: Delete Bob, Charlie stays as Charlie
Result: Charlie keeps its state/DOM
```

---

## VIRTUAL DOM (VDOM)

### What is it?
Lightweight JavaScript representation of what UI should look like (not actual DOM).

```javascript
// Real DOM (heavy)
{
  nodeType: 1,
  nodeName: 'DIV',
  attributes: HTMLCollection(5),
  childNodes: NodeList(3),
  appendChild: function() {},
  addEventListener: function() {},
  // ... hundreds of properties
}

// Virtual DOM (lightweight)
{
  type: 'div',
  props: { className: 'container', children: [...] },
  key: null
}

// VDOM is ~100x smaller, in memory, no side effects
```

### VDOM Benefits
```
1. ABSTRACTION: React code doesn't touch real DOM
   - Can render to different targets (web, mobile, VR)
   - Same component works everywhere

2. BATCHING: Multiple updates = 1 real DOM update
   setState() 3 times
   → Create 3 VDOMs
   → Reconcile once
   → 1 DOM update

3. DIFFING: Compare old vs new efficiently
   - Algorithm is O(n) not O(n³)
   - React can make intelligent decisions
```

---

## KEY PROP (Critical for Interviews)

### Why Keys Matter
```javascript
// List items with unique IDs
const todos = [
  { id: 1, text: 'Buy milk' },
  { id: 2, text: 'Walk dog' },
  { id: 3, text: 'Code' }
];

// ❌ BAD: Using index as key
{todos.map((todo, index) => (
  <li key={index}>{todo.text}</li>
))}

Problem: If list reordered, index changes
Input state gets mismatched
Checkboxes, form values get confused

// ✅ GOOD: Using stable ID
{todos.map(todo => (
  <li key={todo.id}>{todo.text}</li>
))}

Now: Each item keeps its state/DOM even if list reorders
React recognizes: "This is still item #2"
```

### Key Rule (Interview Question)
```
Q: When do keys matter?

A: 
1. Lists with reordering (sort, filter, add/remove)
2. Items have identity (database ID)
3. Items have controlled components (inputs, checkboxes)

Q: What if I use index as key?

A:
- Works fine if list is static
- Breaks if list reorders/filters
- Input values get confused
- Performance issues
```

---

## DIFFING ALGORITHM (How React Figures Out Changes)

### Two Level Comparison
```
Level 1: Component Type
<div> vs <span> → Different type → DELETE + CREATE
<div> vs <div> → Same type → Compare children

Level 2: Elements/Props
Props changed? → UPDATE
Children changed? → RECONCILE each child
```

### Step-by-Step Example
```javascript
// RENDER 1 (initial)
<div>
  <h1>Count: 0</h1>
  <button>Increment</button>
</div>

VDOM:
{
  type: 'div',
  children: [
    { type: 'h1', children: 'Count: 0' },
    { type: 'button', children: 'Increment' }
  ]
}

// RENDER 2 (after setState to 1)
<div>
  <h1>Count: 1</h1>
  <button>Increment</button>
</div>

New VDOM:
{
  type: 'div',
  children: [
    { type: 'h1', children: 'Count: 1' },  ← CHANGED
    { type: 'button', children: 'Increment' }
  ]
}

DIFFING PROCESS:
1. <div> vs <div> → Same type ✅
2. Check children:
   - <h1> vs <h1> → Same type ✅
     - Props check: None changed
     - Children: 'Count: 0' vs 'Count: 1' → Different text
     - Mark: UPDATE text
   - <button> vs <button> → Same type ✅
     - Props: same
     - Children: same
     - Mark: NO CHANGE

RESULT:
Only h1's text content is updated
Button DOM is untouched
```

---

## BATCHING

### What is it?
Multiple setState calls = 1 re-render.

```javascript
function handleClick() {
  setState(1);        // Queued
  setState(2);        // Queued
  setState(3);        // Queued
  
  // handleClick ends
  // React processes queue
  // 1 re-render happens (not 3!)
}

// Timeline:
Click → setState x3 → handleClick ends → Process queue → 1 Re-render → Paint
```

### React 18+ Automatic Batching
```javascript
// React 17: Only batches in event handlers
function handleClick() {
  setState(1);
  setState(2);
  // Batched ✅
}

// React 17: NOT batched in Promises
setTimeout(() => {
  setState(1);
  setState(2);
  // 2 separate re-renders ❌
}, 100);

// React 18+: Everything is batched
setTimeout(() => {
  setState(1);
  setState(2);
  // Batched ✅
}, 100);

// To opt-out of batching (rare):
import { flushSync } from 'react-dom';

function handleClick() {
  flushSync(() => setState(1));  // Forces immediate update
  setState(2);
}
```

---

## TIME SLICING

### What is it?
Breaking rendering into small chunks to keep main thread responsive.

```
Traditional rendering:
Render component A (50ms)
Render component B (50ms)
Render component C (50ms)
= 150ms blocked

User input during this time → FROZEN

Time Slicing:
Render component A (16ms) → Yield
[User can interact]
Render component B (16ms) → Yield
[Browser can paint]
Render component C (16ms) → Yield
[User can interact]
= 150ms total, but responsive

How it works:
- Each fiber takes ~5ms
- After 5ms: Return control to browser
- Browser handles events/paint
- React resumes next fiber
```

---

## PRIORITY LEVELS (Why Some Updates Happen First)

```javascript
// Different priority levels:

1. IMMEDIATE (User input)
   - Typing in input
   - Clicking button
   - Must respond <100ms

2. NORMAL (State updates)
   - setTimeout
   - Promise resolution
   - Can wait a bit

3. LOW (Non-urgent)
   - Pre-fetching data
   - Analytics
   - Can wait a lot

Example:
User types in input (IMMEDIATE priority)
Meanwhile, data is being loaded (LOW priority)

React prioritizes typing, loads data in background
User never feels stuck typing
```

---

## SUSPENSE

### What is it?
Component that lets you "wait" for async data before rendering.

```javascript
<Suspense fallback={<Loading />}>
  <UserProfile userId={1} />
</Suspense>

How it works:
1. UserProfile needs data
2. Throws a Promise
3. Suspense catches it
4. Shows fallback (<Loading />)
5. Promise resolves
6. UserProfile renders
```

### Interview Answer
```
Q: What is Suspense?

A:
Suspense lets components suspend rendering while loading:
1. Component throws Promise (data loading)
2. Suspense catches promise
3. Shows fallback UI
4. Promise resolves
5. Component renders

Benefits:
- Cleaner code (no isLoading state)
- Better UX (show fallback while waiting)
- Automatic loading state handling
```

---

## ERROR BOUNDARY

### What is it?
Component that catches errors from child components.

```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log(error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}

<ErrorBoundary>
  <BuggyComponent />  {/* If this throws, caught here */}
</ErrorBoundary>
```

### What it Catches vs Doesn't
```
✅ Catches:
- Render errors
- Lifecycle method errors
- Constructor errors

❌ Doesn't catch:
- Event handler errors (use try/catch)
- Async code errors (use try/catch)
- Server-side rendering errors
- Error boundary's own errors
```

---

## CONTEXT API

### What is it?
Global state without drilling props through every level.

```javascript
// Create
const ThemeContext = React.createContext();

// Provider
<ThemeContext.Provider value="dark">
  <App />
</ThemeContext.Provider>

// Consumer
function Component() {
  const theme = useContext(ThemeContext);
  return <div>Theme: {theme}</div>;
}
```

### Interview Question: Context vs Redux
```
Q: When to use Context?

A:
✅ Context:
- Global state (theme, auth)
- Infrequent updates
- Not too much data

❌ Redux:
- Frequent updates (more efficient)
- Complex logic
- Need time-travel debugging
- Large app

Rule: Context for 5-10% of state updates
      Redux/Zustand for frequent updates
```

---

## MEMOIZATION & OPTIMIZATION

### React.memo
```javascript
const Component = React.memo(function MyComponent(props) {
  return <div>{props.name}</div>;
});

How it works:
1. Parent re-renders
2. Check: Did props change?
3. If NO → Skip re-render, reuse old component
4. If YES → Re-render

Cost: Extra comparison (~1ms)
Benefit: Skip render (~5-50ms)
Worth it if: Re-render is expensive or frequent
```

### useMemo
```javascript
const memoizedValue = useMemo(() => {
  return expensiveCalculation(a, b);
}, [a, b]);

When it runs:
- First render: Calculate
- Re-render with same [a, b]: Reuse value
- Re-render with different [a, b]: Recalculate

Use when:
- Expensive calculation
- Passed to memoized child component
```

### useCallback
```javascript
const memoizedFunc = useCallback(() => {
  doSomething(a, b);
}, [a, b]);

Similar to useMemo but for functions
Returns same function reference if deps unchanged
Use when: Passing function to React.memo child
```

---

## COMPOUND COMPONENTS (Advanced Pattern)

### What is it?
Components that work together as a group.

```javascript
// Design:
<Menu>
  <Menu.Item>Profile</Menu.Item>
  <Menu.Item>Settings</Menu.Item>
  <Menu.Item>Logout</Menu.Item>
</Menu>

Implementation:
function Menu({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(!open)}>
      {open && <ul>{children}</ul>}
    </div>
  );
}

Menu.Item = function MenuItem({ children }) {
  return <li>{children}</li>;
};

Benefit: 
- Flexible composition
- Implicit state sharing
- Clean API
```

---

## RENDER PROPS PATTERN

### What is it?
Function as children to share state/logic.

```javascript
<DataFetcher url="/api/users">
  {(data, loading, error) => (
    <>
      {loading && <div>Loading...</div>}
      {error && <div>Error!</div>}
      {data && <div>{data.name}</div>}
    </>
  )}
</DataFetcher>

Implementation:
function DataFetcher({ url, children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [url]);

  return children(data, loading, error);
}

Now replaced by: Custom hooks
```

---

## CUSTOM HOOKS

### What is it?
Reusable logic as a function.

```javascript
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}

Usage:
function Component() {
  const { data, loading, error } = useFetch('/api/users');
  // ...
}

Benefits:
- Reusable logic
- Easier than Render Props
- Better than HOC
```

---

## HIGHER ORDER COMPONENT (HOC)

### What is it?
Function that takes component and returns enhanced component.

```javascript
function withAuth(Component) {
  return function ProtectedComponent(props) {
    const [isAuth, setIsAuth] = useState(false);

    if (!isAuth) {
      return <div>Not authenticated</div>;
    }

    return <Component {...props} isAuth={isAuth} />;
  };
}

Usage:
const ProtectedProfile = withAuth(Profile);

Now replaced by: Custom hooks (better approach)
```

---

## INTERVIEW CHEAT SHEET

```
Q: What is Fiber?
A: Internal architecture for breaking rendering into chunks.
   Can pause/resume. Enables priority-based updates.

Q: What is Reconciliation?
A: Comparing old vs new VDOM to find what changed.
   React updates only changed parts.

Q: Why use keys in lists?
A: Stable identity. Without keys, list reordering breaks state.

Q: What is Batching?
A: Multiple setState calls in event = 1 re-render.

Q: useState vs useRef?
A: useState triggers re-render. useRef doesn't.
   useState for state, useRef for persistent values.

Q: useEffect vs useLayoutEffect?
A: useEffect runs after paint. useLayoutEffect before paint.
   Use useEffect 99% of time.

Q: How does React prevent unnecessary renders?
A: React.memo, useMemo, useCallback, shouldComponentUpdate.

Q: What is Virtual DOM?
A: Lightweight JS representation. Not actual DOM.
   React diffs old VDOM with new, updates real DOM.

Q: Context vs Redux?
A: Context for global state. Redux for complex state logic.

Q: What causes reflow/repaint?
A: DOM changes → Reflow → Repaint.
   Use transform instead of left/width (no reflow).
```

All set! These are the core React interview terms explained. 🎯
