# Complete Comparison & Missing Details


---

## MISSING FROM INTERVIEW NOTES (From File)

### 1. JAVASCRIPT PARSING FLOW
```
DNS Lookup → TCP Connection → TLS Handshake → HTTP Request → Server Response
→ Browser receives HTML string → Parser creates DOM → CSS loads → Layout calculated
→ Paint → Display
```

### 2. SPECIFIC HOOK TIMING TABLE
```
| Hook            | Runs When         | Before/After Paint | Blocks Rendering |
|-----------------|-------------------|-------------------|-----------------|
| useState        | During render     | BEFORE paint      | YES ✅          |
| useEffect       | After paint       | AFTER paint       | NO ❌           |
| useLayoutEffect | Before paint      | BEFORE paint      | YES ✅          |
| useMemo         | During render     | BEFORE paint      | YES ✅          |
| useCallback     | During render     | BEFORE paint      | YES ✅          |
```

### 3. EVENT LOOP ORDER
```
Call Stack → Microtask Queue (Promises) → Macrotask Queue (setTimeout)
→ Browser Paint happens BETWEEN Macrotasks

Important: useEffect runs in Microtask (after paint, before next macrotask)
```

### 4. RENDER BLOCKING DETAILS
```
✅ Blocks rendering:
- CSS files
- Script tags in head
- Layout calculations

❌ Doesn't block:
- Images
- Async script tags
- CSS in body
```

### 5. REFLOW vs REPAINT
```
REFLOW (expensive ~10-100ms):
- Changes layout properties (width, height, position, display)
- Affects multiple elements
- Must recalculate everything

REPAINT (cheaper ~1-10ms):
- Changes visual properties (color, background, opacity)
- Only affected element redrawn

React triggers both when DOM changes:
setState → Reflow → Repaint → Paint to screen
```

### 6. DOM vs VDOM vs CSSOM
```
DOM (Real DOM):
- Actual HTML elements in browser
- Thousands of properties/methods
- Heavy (1MB+ for large sites)
- Slow to manipulate

VDOM (Virtual DOM):
- React's lightweight representation
- Plain JavaScript objects
- In memory only
- Fast to diffing

CSSOM (CSS Object Model):
- CSS rules in memory
- Selector + declarations
- Used for style matching
```

### 7. FIBER RENDERING PHASES
```
Render Phase (can pause):
- Create VDOM
- Reconciliation
- Mark changes (effectTag)
- Can be interrupted

Commit Phase (cannot pause):
- Update real DOM
- Update refs
- Run useEffect cleanup
- Run useEffect callbacks
- MUST complete atomically
```

### 8. CRITICAL RENDERING PATH
```
Fetch HTML
↓
Parse HTML (DOM)
↓
Fetch CSS (blocking!)
↓
Parse CSS (CSSOM)
↓
Render Tree = DOM + CSSOM
↓
Layout = Calculate positions
↓
Paint = Draw to screen
↓
Composite = Send to GPU

Optimizations:
- Inline critical CSS → Don't wait
- Lazy load non-critical CSS
- Async load JavaScript
- Preload resources
```

### 9. BATCHING EXAMPLE (React 18)
```javascript
// Event Handler - BATCHED
function handleClick() {
  setState(1);
  setState(2);
  setState(3);
}
// 1 re-render

// setTimeout - ALSO BATCHED (React 18+)
setTimeout(() => {
  setState(1);
  setState(2);
}, 0);
// 1 re-render

// Promise - ALSO BATCHED (React 18+)
fetch('/api').then(res => {
  setState(res);
  setState(2);
});
// 1 re-render

// To force immediate update:
import { flushSync } from 'react-dom';
flushSync(() => setState(1));  // Executes immediately
setState(2);                   // Batched with next
```

### 10. EXTERNAL FILES LOADING
```
CSS in <head>:
- Blocks rendering
- User sees blank screen until loaded
- Solution: Inline critical CSS

JS in <head>:
- Blocks HTML parsing
- Parser waits for JS to execute
- Solution: Load in <body> or async

JS async:
<script async src="script.js"></script>
- Doesn't block parsing
- Executes when ready
- Order not guaranteed

JS defer:
<script defer src="script.js"></script>
- Doesn't block parsing
- Executes after HTML parsed
- Order guaranteed

Images:
- Don't block rendering
- Loaded after page displays
- Solution: Lazy load, WebP format
```

### 11. STATE UPDATES TIMELINE
```
User Event (click, input change)
↓
Event Handler Executes
  ↓
  setState() called
  Update added to queue
  Event handler continues
  
Event Handler Finishes
↓
React processes update queue
↓
RENDER PHASE:
  Component function called with new state
  New VDOM created
  Old VDOM vs New VDOM compared
  Changes marked
↓
COMMIT PHASE:
  Real DOM updated
  Refs updated
  useEffect cleanup runs (if deps changed)
↓
BROWSER PAINT:
  Reflow calculated
  Pixels painted
  Screen shows new state
↓
useEffect callbacks run
  (Can trigger new renders)

Key: setState doesn't immediately change state
State updates are asynchronous and batched
```

### 12. CLOSURE & HOOKS (Why Hook Order Matters)
```javascript
// React stores hooks in array
const hooks = [];
let hookIndex = 0;

function useState(initial) {
  const index = hookIndex;  // Closure captures index
  hookIndex++;
  
  if (!hooks[index]) {
    hooks[index] = initial;
  }
  
  const setState = (value) => {
    hooks[index] = value;
    scheduleRender();
  };
  
  return [hooks[index], setState];
}

// Each render resets hookIndex = 0
// Rules of Hooks:
// 1. Always call in same order (index must match)
// 2. Can't call in loops/conditions (breaks order)
// 3. Must be in component (captures closure)

// WRONG:
if (condition) {
  const [state, setState] = useState(0);  // ❌ breaks order
}

// RIGHT:
const [state, setState] = useState(0);
if (condition) {
  // use state here
}
```

### 13. REFERENCE vs PRIMITIVE (Critical for Deps)
```javascript
// Primitive (compared by value)
let a = 5;
let b = 5;
a === b  // true

// Object (compared by reference)
let obj1 = { x: 5 };
let obj2 = { x: 5 };
obj1 === obj2  // false (different objects!)

// In React dependencies:
useEffect(() => {
  console.log('runs when dependency changes');
}, [count]);  // Primitive - works fine

useEffect(() => {
  console.log('runs too often!');
}, [{ x: 5 }]);  // Object created fresh each render
                 // Object reference changes
                 // Effect runs EVERY render

// Solution:
const config = { x: 5 };  // Outside component
useEffect(() => {
  console.log('runs once');
}, [config]);
```

### 14. PERFORMANCE METRICS
```
FP (First Paint): First pixel appears (~1-2s)
FCP (First Contentful Paint): First content appears (~1-2s)
LCP (Largest Contentful Paint): Main content loads (~2-4s)
TTI (Time to Interactive): Page is responsive (~3-5s)
CLS (Cumulative Layout Shift): No unexpected layout changes

Target:
- FCP < 1.8s
- LCP < 2.5s
- TTI < 3.8s
- CLS < 0.1
```

### 15. OPTIMIZATION CHECKLIST
```
✅ HTML:
- Minimize size
- Compress (gzip)

✅ CSS:
- Inline critical CSS
- Defer non-critical
- Remove unused CSS

✅ JavaScript:
- Code splitting (lazy load)
- Remove unused code (tree-shaking)
- Defer execution (async/defer)

✅ React:
- Use React.memo for expensive components
- Use useMemo for expensive calculations
- Use useCallback for function props
- Lazy load components with React.lazy()

✅ Images:
- Use WebP format
- Lazy load with intersection observer
- Responsive images (srcset)

✅ Network:
- Use CDN
- Enable caching headers
- HTTP/2 push resources
```

---

## SUMMARY: What You Have Now

**In File:** Flow details (10 steps), Hooks timing, Performance tips

**In Above Notes:** Interview terms (Fiber, Reconciliation, Suspense, etc.)

**Here:** Missing technical details (Reflow, Event Loop, Deps, etc.)

Together = **Complete React Interview Prep** 🎯
