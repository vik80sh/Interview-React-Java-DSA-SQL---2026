# Memory Management, Garbage Collection, and WeakMap/WeakSet

Every frontend interview eventually asks "how would you find a memory leak in a React app?" — and most candidates can name `useEffect` cleanup in the abstract but can't explain *why* a leak actually happens or *how* to prove one in DevTools. This guide covers the GC algorithm, the three leak patterns that show up in real SPAs, and the WeakMap/WeakSet APIs interviewers use to test whether you actually understand reachability.

## 1. How Garbage Collection Actually Works

JavaScript engines don't count references directly — they determine **reachability** from a set of **roots** (the global object, currently executing function's local variables, and anything on the active call stack) and free everything else. The algorithm used by V8 and every modern engine is **mark-and-sweep**.

- **Mark phase** — starting from the roots, the collector walks every reference it can follow (object properties, closures, array elements) and marks each object it reaches as "alive."
- **Sweep phase** — the collector scans the whole heap; anything not marked is unreachable and its memory is reclaimed.

This means an object is never freed because a variable "went out of scope" in the source-code sense — it's freed because no live reference chain from a root reaches it anymore. Two objects can reference each other in a cycle and still be collected, because reachability is checked from the roots, not by counting inbound references (this is the classic reason JS never had IE6's old reference-counting circular-reference leak for plain objects):

```javascript
function buildOrderPipeline() {
  const validator = { name: "validator" };
  const formatter = { name: "formatter" };
  validator.next = formatter;
  formatter.prev = validator; // circular reference between the two
  return null; // nothing outside this function points to either object anymore
}

buildOrderPipeline();
// validator and formatter still reference each other, but neither is reachable
// from any root, so mark-and-sweep collects both — reference counting isn't used.
```

V8 additionally splits the heap into generations (young/old, mirroring the JVM's Eden/Old split) so that the young generation — where every short-lived React render's intermediate objects are born — can be swept quickly and often (Scavenge), while the old generation gets a slower, less frequent full mark-sweep-compact pass. You don't control this directly, but it's why creating lots of small short-lived objects per render is usually cheap: most never survive to the expensive collection.

## 2. Leak Pattern: Detached DOM Nodes Kept Alive by a Stale Reference

A **detached DOM node** is an element removed from the document tree that JavaScript still holds a reference to. The DOM node is gone from the page, but because a variable, closure, or cache still points to it, it stays reachable and the GC can never sweep it — and because it's still attached to the rest of its subtree, the whole subtree leaks with it.

```javascript
// A dashboard widget caches its own root element "for fast re-access"
class ChartWidget {
  constructor(container) {
    this.container = container;
    this.rootEl = container.querySelector(".chart-root");
    this.cachedRows = []; // rows of <tr> elements built once and reused
  }

  renderRows(data) {
    this.cachedRows = data.map((row) => {
      const tr = document.createElement("tr");
      tr.textContent = row.label;
      this.rootEl.appendChild(tr);
      return tr; // kept in this.cachedRows even after removal
    });
  }

  destroy() {
    this.rootEl.remove(); // removes rootEl (and its <tr> children) from the document
    // BUG: this.cachedRows still holds references to every <tr> that was
    // appended, and `this` (the widget instance) is still referenced by
    // whatever created it — so the entire detached subtree stays in the heap.
  }
}
```

The fix is to null out every reference that points into a removed subtree when you tear it down, not just remove the node from the document:

```javascript
destroy() {
  this.rootEl.remove();
  this.cachedRows = []; // release the references, not just the DOM
  this.rootEl = null;
  this.container = null;
}
```

## 3. Leak Pattern: Forgotten Event Listeners and Timers on Unmounted Components

Attaching a listener or timer to something outside the component's own lifecycle (`window`, `document`, a shared event bus, `setInterval`) creates a reference that outlives the component unless you explicitly remove it. The component instance — and everything its closure captured — stays reachable through that live listener/timer, even after React has unmounted it and the user has navigated away.

```javascript
function LivePriceTicker({ symbol }) {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    const handleResize = () => recalculateLayout(); // captures component-scoped state
    window.addEventListener("resize", handleResize);

    const pollId = setInterval(() => {
      fetchPrice(symbol).then(setPrice); // closure captures `symbol` and `setPrice`
    }, 2000);

    // BUG: no cleanup returned — on unmount, `window` and the timer queue
    // still hold live references to this closure, `setPrice`, and by extension
    // the fiber/component tree that created them.
  }, [symbol]);

  return <span>{price}</span>;
}
```

```javascript
useEffect(() => {
  const handleResize = () => recalculateLayout();
  window.addEventListener("resize", handleResize);

  const pollId = setInterval(() => {
    fetchPrice(symbol).then(setPrice);
  }, 2000);

  return () => {
    window.removeEventListener("resize", handleResize); // breaks the live reference
    clearInterval(pollId); // stops the Web API from holding the closure alive
  };
}, [symbol]);
```

This is exactly why `setInterval`/`addEventListener` without a matching `clearInterval`/`removeEventListener` is the single most common cause of "my SPA's memory grows every time I navigate between pages" — each navigation mounts a new ticker, and none of the old ones are ever released because the browser's timer queue and global listener list are GC roots.

## 4. Leak Pattern: Closures Accidentally Capturing Large Objects

A closure captures its entire enclosing scope, not just the variables it uses. If a function that's kept alive long-term (an event handler, a memoized callback, an exported module-level function) is defined in the same scope as a large object, that object stays alive for as long as the closure does — even if the closure never touches it.

```javascript
function loadDashboard() {
  const rawApiResponse = fetchHugePayload(); // e.g. a 50k-row dataset, several MB
  const summary = summarize(rawApiResponse);   // the only part actually needed later

  // This handler is attached to a long-lived button and only needs `summary`,
  // but it closes over the whole `loadDashboard` scope, including rawApiResponse.
  document.getElementById("export-btn").onclick = () => {
    exportSummary(summary);
  };

  return summary;
}
```

Because `onclick` keeps the closure alive for the button's entire lifetime, `rawApiResponse` — several megabytes never referenced again — is retained too, since it's still reachable through the closure's scope chain. The fix is to extract only what the long-lived closure needs into a smaller scope, so the large object has no live path to it:

```javascript
function loadDashboard() {
  const summary = summarize(fetchHugePayload()); // rawApiResponse has no name outside this line
  attachExportHandler(summary);                    // separate function/scope — nothing else leaks in
  return summary;
}

function attachExportHandler(summary) {
  document.getElementById("export-btn").onclick = () => exportSummary(summary);
}
```

## 5. WeakMap and WeakSet: What Makes Them "Weak"

A regular `Map` or `Set` holds a **strong reference** to every key and value it stores — as long as the collection itself is reachable, so is everything inside it, forever, even if every other variable pointing to that object has been set to `null`. `WeakMap` and `WeakSet` hold **weak references** to their keys (`WeakMap`) or members (`WeakSet`): a weak reference does not count during the mark phase, so if an object's *only* remaining references are weak ones, the GC collects it — and its entry disappears from the WeakMap/WeakSet automatically, with no explicit `.delete()` needed.

```javascript
let session = { userId: 42 };
const strongCache = new Map();
strongCache.set(session, { lastSeen: Date.now() });
session = null;
// strongCache still holds the object — Map.size is still 1. It leaks forever
// unless something explicitly calls strongCache.delete(...).

let session2 = { userId: 42 };
const weakCache = new WeakMap();
weakCache.set(session2, { lastSeen: Date.now() });
session2 = null;
// Once GC runs, session2's object has no other references, so it — and its
// entry inside weakCache — are collected automatically. No leak, no cleanup call.
```

This is why `WeakMap`/`WeakSet` enforce two rules that trip people up in interviews: keys must be objects (primitives like numbers/strings can't be weakly referenced — the engine can't "collect" the number `5`), and neither type is iterable and has no `.size` — because which entries exist at any instant depends on when GC last ran, which is intentionally unobservable, so the spec doesn't let you enumerate or count them.

## 6. Real Use Case: Per-DOM-Node Cache That Never Leaks

The canonical real use case is attaching computed metadata to DOM nodes — memoized measurements, analytics counters, virtualized-list row heights — without needing to remember to clean the cache up when the node is removed. This is exactly the pattern behind libraries like React's internal fiber-to-DOM bookkeeping and virtualized-list row-height caches.

```javascript
// A virtualized table caches each row's measured height so it doesn't
// re-measure on every scroll frame — keyed by the actual row element.
const rowHeightCache = new WeakMap();

function getRowHeight(rowEl) {
  if (rowHeightCache.has(rowEl)) {
    return rowHeightCache.get(rowEl);
  }
  const height = rowEl.getBoundingClientRect().height;
  rowHeightCache.set(rowEl, height);
  return height;
}

// Rows are created and destroyed constantly as the user scrolls a virtualized list.
function recycleRow(rowEl) {
  rowEl.remove();
  // No cache cleanup needed here at all: once rowEl has no other references,
  // the WeakMap entry is collected along with it. A Map would require an
  // explicit rowHeightCache.delete(rowEl) at every single removal site —
  // miss one call site and you leak a DOM node plus its cached data forever.
}
```

A second common real use case is simulating private instance fields before native `#field` syntax was available (and it's still used today when a private value must live keyed by an *external* object rather than `this`, e.g. a library attaching private state to a DOM node or a class instance it doesn't own):

```javascript
const privateBalances = new WeakMap();

class BankAccount {
  constructor(owner, initialBalance) {
    this.owner = owner; // public
    privateBalances.set(this, initialBalance); // "private" — not on the instance itself
  }

  getBalance() {
    return privateBalances.get(this);
  }

  deposit(amount) {
    privateBalances.set(this, this.getBalance() + amount);
  }
}

const acct = new BankAccount("Priya", 1000);
console.log(acct.balance); // undefined — the balance isn't a property of acct at all
console.log(acct.getBalance()); // 1000
// When `acct` itself is no longer referenced anywhere, its WeakMap entry is
// collected too — there's no separate "private state" object to leak.
```

## 7. Diagnosing a Real Memory Leak in Chrome DevTools

Knowing the theory doesn't help in production without knowing the workflow. The standard process:

1. **Open the Memory tab** in Chrome DevTools and take a **heap snapshot** as your baseline, right after the page/component you suspect has settled (e.g. right after a route loads).
2. **Reproduce the suspected leak** — e.g. navigate into and out of the suspect view several times, or open/close a modal repeatedly — then force garbage collection with the trash-can icon in the Memory panel (this rules out "GC just hasn't run yet" as a false positive).
3. **Take a second snapshot** and use the **"Comparison" view** between the two snapshots. Look at the `Delta` column for object types whose count grows every cycle and never drops back down — that delta, repeated across N cycles, is your leak signature (if you navigated in/out 5 times and see 5x the detached nodes, that's proof, not coincidence).
4. **Filter the snapshot for "Detached"** — Chrome's heap snapshot explicitly flags DOM nodes as `Detached HTMLDivElement`, `Detached HTMLButtonElement`, etc. when they're removed from the document but still reachable from JS. Any non-zero count here after GC is a live leak.
5. **Expand a detached node's "Retainers" panel** — this shows the exact reference chain keeping it alive (e.g. `cachedRows` array → `ChartWidget` instance → closure of some `onclick` handler → `window`). This retainer chain is what tells you *which* variable to null out or which listener to remove — it's the single most useful piece of information in the whole workflow.
6. For leaks tied to timers/allocation rate rather than a one-time DOM leak, use the **Allocation instrumentation on timeline** recording instead of discrete snapshots — it charts allocations over time and lets you select a time range to see exactly what was allocated and never freed during it.

The **Performance Monitor** tab's live "JS heap size" graph is a faster first check before doing a full snapshot comparison: a sawtooth that always returns to baseline after GC is normal; a staircase that keeps climbing and never comes back down is the visual signature of a leak.

## Interview Questions and Answers

### 1. What algorithm do JS engines use for garbage collection, and how does it decide what to free?

**Answer:** Mark-and-sweep. Starting from a set of roots (globals, the active call stack), the collector marks every object reachable by following references, then sweeps — frees — everything left unmarked. It's reachability from roots that matters, not whether a variable "went out of scope" or whether objects reference each other in a cycle.

### 2. Can two objects that reference each other ever be garbage collected?

**Answer:** Yes — mark-and-sweep collects unreachable cycles just fine, unlike older reference-counting collectors (e.g. IE6's DOM/COM leak). If neither object in a two-way reference cycle is reachable from any root, both get swept in the same pass, because reachability is computed from the roots inward, not by counting inbound pointers on each object.

### 3. What is a detached DOM node, and why does it leak memory?

**Answer:** It's an element removed from the visible document tree (via `.remove()`, `removeChild`, or replacing `innerHTML`) that some JS variable, closure, or cache still references. Because that reference is still reachable from a root, the GC can't sweep the node or, critically, the rest of the subtree still attached under it — you have to explicitly null out every reference into a removed subtree, not just remove it from the document.

### 4. Why do forgotten `setInterval` calls or `addEventListener` calls on unmounted React components cause leaks?

**Answer:** `window`, `document`, and the browser's internal timer queue are effectively GC roots — anything they hold a live reference to stays reachable forever. An interval callback or a `resize` listener registered in a `useEffect` without a matching `clearInterval`/`removeEventListener` in the cleanup function keeps its whole closure (and the state/props it captured) alive after the component unmounts, which is why every unmounted-but-still-firing ticker or listener is memory that never comes back.

### 5. How does a closure leak memory even if the leaked object is never used inside the closure?

**Answer:** A closure captures its entire enclosing scope, not just the variables it references — so if a large object (like a raw API payload) is declared in the same function as a callback that's kept alive long-term (e.g. attached to a persistent button's `onclick`), that object stays reachable through the scope chain for as long as the callback exists. The fix is moving the long-lived callback into a smaller, separate function scope that only receives the small value it actually needs.

### 6. What makes a `WeakMap` different from a `Map`, mechanically?

**Answer:** A `Map` holds strong references to its keys and values, so anything stored in it is reachable — and therefore never collected — for as long as the `Map` itself exists, even after every other reference to that key is gone. A `WeakMap` holds weak references to its keys: a weak reference doesn't count during the mark phase, so once a key object has no other reachable references, GC collects it and its `WeakMap` entry disappears automatically, with no `.delete()` call required.

### 7. Why can't you use a string or number as a `WeakMap` key?

**Answer:** Primitives aren't garbage-collected the way objects are — there's no single heap allocation for the number `5` that could become "unreachable" and get swept, since JS engines can represent and duplicate primitive values freely. `WeakMap`'s entire mechanism depends on the key being an object whose reachability the GC can actually track, so the spec requires object (or symbol, from ES2023) keys.

### 8. Give a real, non-toy use case for `WeakMap` and explain why a regular `Map` would be wrong there.

**Answer:** Caching per-DOM-node computed data — e.g. a virtualized list caching each row element's measured height keyed by the row element itself. Rows are created and destroyed constantly as the user scrolls; with a `Map`, every removed row's cache entry would need an explicit `.delete()` call at every single removal code path, and missing even one leaks that DOM node forever — a `WeakMap` releases the entry automatically the moment the row element itself is no longer referenced.

### 9. Why are `WeakMap` and `WeakSet` not iterable and have no `.size`?

**Answer:** Because exactly which entries exist at any given moment depends on when the garbage collector last ran, and GC timing is intentionally unobservable and implementation-defined in the spec. If you could call `.size` or iterate, that count would be unpredictable and non-deterministic across engines and runs, so the spec simply doesn't expose iteration or count on weak collections.

### 10. You suspect a React SPA leaks memory on every route navigation. Walk through how you'd confirm and locate it in Chrome DevTools.

**Answer:** Take a baseline heap snapshot after the app settles, navigate into and out of the suspect route several times, force a manual GC with the trash-can icon, then take a second snapshot and use the Comparison view — a `Delta` count on some object type that keeps growing proportional to the number of navigation cycles (not a one-time bump) is the leak signature. Filter for "Detached" to catch leaked DOM subtrees specifically, then expand the "Retainers" panel on one to see the exact reference chain — closure, stale cache, or forgotten listener — keeping it alive, which tells you exactly what to null out or unsubscribe.

## Revision Checklist

- [ ] Explain mark-and-sweep and why reachability (not scope, not reference counting) decides what's freed.
- [ ] Explain why a reference cycle between two otherwise-unreachable objects still gets collected.
- [ ] Describe a real detached-DOM-node leak (a cached row/element reference surviving `.remove()`) and its fix.
- [ ] Describe a real forgotten-listener/timer leak on an unmounted component and the `useEffect` cleanup that fixes it.
- [ ] Explain how a closure can leak a large object it never actually uses, and how to scope around it.
- [ ] Explain what "weak reference" means mechanically and how it differs from a `Map`'s strong reference.
- [ ] Give one real `WeakMap` use case (per-node cache, or private-field-before-`#` pattern) and why a `Map` would leak there instead.
- [ ] Walk through the Chrome DevTools heap-snapshot-comparison and Retainers workflow for confirming and locating a leak.
