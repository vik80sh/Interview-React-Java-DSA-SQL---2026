# React Hooks Deep Dive

Hooks questions are where most React interviews live or die — not "what does `useState` do" but "predict the re-renders," "find the race condition," "why does this memoized child still re-render." This guide works through each core hook with a real-world example, then the Rules of Hooks and the `useMemo`/`useCallback`/`React.memo` interaction that trips up almost everyone at least once.

## 1. `useState` — Batching and Lazy Initialization

`useState` gives a function component a piece of state that survives re-renders; calling its setter schedules a re-render rather than updating anything synchronously. Two behaviors around it come up constantly in interviews: how React batches multiple setter calls inside one event handler, and how the *initial* value is computed only once instead of on every render.

```javascript
// Checkout form: several fields reset together after a successful order
function CheckoutForm() {
  const [cardNumber, setCardNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();

    setStatus('submitting');
    console.log('status right after setStatus:', status); // still 'idle' — setState is async

    const result = await placeOrder({ cardNumber, billingAddress });

    // These three calls happen inside the same async continuation, but in React 18+
    // they are still batched into ONE re-render, not three.
    setStatus(result.ok ? 'success' : 'error');
    setCardNumber('');
    setBillingAddress('');
  };

  return <form onSubmit={handleSubmit}>{/* fields */}</form>;
}
```

Before React 18, only updates inside React event handlers were batched — the three calls after `await` (outside the synchronous handler body) would each have triggered their own render. React 18's automatic batching batches *any* setter calls that happen before the next paint, including inside promises, `setTimeout`, and native event handlers, so `CheckoutForm` re-renders once for that whole block instead of three times.

```javascript
// Product filter panel: restoring saved filters is expensive (parsing + validating JSON),
// so it should run once on mount, not on every re-render.
function ProductFilterPanel({ category }) {
  // BAD: readSavedFilters() runs on every render, even though only its first result matters.
  // const [filters, setFilters] = useState(readSavedFilters(category));

  // GOOD: passing a function defers the call — React only invokes it on the initial mount.
  const [filters, setFilters] = useState(() => readSavedFilters(category));

  const [priceRange, setPriceRange] = useState(() => filters.priceRange ?? [0, 1000]);

  return <FilterSidebar filters={filters} priceRange={priceRange} onChange={setFilters} />;
}
```

`useState(readSavedFilters(category))` calls `readSavedFilters` on *every* render — React just throws away the result after the first one, but the parsing work still happens each time. `useState(() => readSavedFilters(category))` passes a lazy initializer instead: React calls it exactly once, on mount, and never again for the lifetime of that component instance.

## 2. `useEffect` — Subscriptions and Cleanup

`useEffect` runs side effects after a render commits, and its return value — the cleanup function — runs before the next effect execution and again on unmount. Forgetting cleanup is one of the most common real production bugs: connections and listeners quietly pile up.

```javascript
// Real-time notification system: subscribe to a push channel for the current user
function NotificationBell({ userId }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const channel = notificationSocket.subscribe(userId, (notification) => {
      setUnreadCount((count) => count + 1);
    });

    return () => {
      channel.unsubscribe(); // runs before re-subscribing on a new userId, and on unmount
    };
  }, [userId]);

  return <BellIcon count={unreadCount} />;
}
```

Without the returned cleanup function, switching users (userId changes) would leave the old subscription open forever while a new one is created on top of it — every future notification for the old user would still fire a callback on an unmounted or stale component, and the number of open socket subscriptions would grow without bound as users navigate around the app.

## 3. `useEffect` — Race Conditions and Dependency Array Pitfalls

The dependency array tells React when to re-run an effect, and getting it wrong causes two very different classes of bugs: stale/out-of-order results from network races, and infinite render loops from missing or over-eager dependencies.

```javascript
// Product filter panel: typing in the search box re-queries the catalog on every keystroke
function ProductSearch({ query }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    let cancelled = false;

    searchCatalog(query).then((data) => {
      if (!cancelled) setResults(data);
    });

    return () => {
      cancelled = true; // the in-flight request for the PREVIOUS query is now ignored
    };
  }, [query]);

  return <ProductGrid items={results} />;
}
```

If a user types "phone" quickly, requests fire for `"p"`, `"ph"`, `"pho"`, and `"phone"` — network latency is unpredictable, so the response for `"p"` can arrive *after* the response for `"phone"` and would otherwise overwrite the correct results with stale ones. The `cancelled` flag set in cleanup means only the most recent effect's response is ever applied; `AbortController` on the underlying `fetch` is the more complete real-world version of the same idea.

```javascript
// Missing dependency: causes an infinite render loop
function OrderStatus({ orderId }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchOrderStatus(orderId).then(setStatus);
    // No dependency array at all: this effect runs after EVERY render.
    // setStatus triggers a render, which runs the effect again, which calls setStatus again...
  });

  return <div>{status}</div>;
}

// Correct: only re-fetch when orderId actually changes
function OrderStatusFixed({ orderId }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchOrderStatus(orderId).then(setStatus);
  }, [orderId]);

  return <div>{status}</div>;
}
```

An effect with no dependency array runs after every single render with no exception, so any state update inside it re-triggers itself forever. The opposite mistake — an empty `[]` array that *omits* a value the effect actually reads, like `orderId` — causes a different bug: the effect closes over the `orderId` from the very first render and silently keeps using that stale value even after the prop changes, since it never runs again to pick up the new one.

## 4. `useCallback` — Stable Function Identity for Memoized Children

A function defined inside a component body is a brand-new object on every render, even if its code never changes. `useCallback` caches that function definition itself and only returns a new reference when something in its dependency array changes — which matters the moment that function is a prop to a `React.memo`-wrapped child.

```javascript
// Product filter panel: each filter chip is memoized to avoid re-rendering all of them
// whenever the parent's unrelated state (e.g. sort order) changes.
const FilterChip = React.memo(function FilterChip({ label, active, onToggle }) {
  console.log('rendering chip:', label);
  return (
    <button className={active ? 'chip active' : 'chip'} onClick={onToggle}>
      {label}
    </button>
  );
});

function ProductFilterPanel({ availableBrands }) {
  const [activeBrands, setActiveBrands] = useState([]);
  const [sortOrder, setSortOrder] = useState('relevance');

  // Without useCallback, toggleBrand is a new function every render (including when
  // only sortOrder changes), so every FilterChip would see a "new" onToggle prop and
  // React.memo's shallow comparison would fail — all chips re-render for no reason.
  const toggleBrand = useCallback((brand) => {
    setActiveBrands((current) =>
      current.includes(brand) ? current.filter((b) => b !== brand) : [...current, brand]
    );
  }, []); // no external dependencies — setActiveBrands's updater form doesn't need activeBrands

  return (
    <div>
      <SortDropdown value={sortOrder} onChange={setSortOrder} />
      {availableBrands.map((brand) => (
        <FilterChip
          key={brand}
          label={brand}
          active={activeBrands.includes(brand)}
          onToggle={() => toggleBrand(brand)}
        />
      ))}
    </div>
  );
}
```

`toggleBrand` keeps the same reference across renders because its dependency array is empty and it uses the updater-function form of `setActiveBrands` (`current => ...`) instead of reading `activeBrands` directly, so it never needs that value as a dependency. Note the chip still receives a new inline arrow (`() => toggleBrand(brand)`) each render — `useCallback` on `toggleBrand` alone doesn't fully solve chip re-renders; Section 6 covers that remaining gap.

## 5. `useMemo` — Memoizing Expensive Derived Data

`useMemo` caches the *return value* of a computation, re-running it only when a dependency changes, and executes during render (unlike `useEffect`, which runs after). It exists for genuinely expensive work — filtering and sorting a large collection is the textbook real-world case.

```javascript
// Product filter panel: filtering and sorting a large catalog on every keystroke
// in an unrelated search box would be wasteful.
function ProductCatalog({ products, activeBrands, sortOrder, searchQuery }) {
  const visibleProducts = useMemo(() => {
    console.time('filter-and-sort');

    const filtered = products.filter(
      (p) => activeBrands.length === 0 || activeBrands.includes(p.brand)
    );
    const sorted = [...filtered].sort((a, b) =>
      sortOrder === 'price' ? a.price - b.price : b.relevanceScore - a.relevanceScore
    );

    console.timeEnd('filter-and-sort'); // ~120ms for 20,000 products, unmemoized on every render
    return sorted;
  }, [products, activeBrands, sortOrder]);

  // searchQuery deliberately excluded from the dependency array here — it drives a
  // separate, debounced highlight pass, not the heavy filter/sort itself.
  return <ProductGrid items={visibleProducts} highlightQuery={searchQuery} />;
}
```

Without `useMemo`, typing into an unrelated search field (which re-renders `ProductCatalog` through `searchQuery`) would re-filter and re-sort all 20,000 products on every keystroke even though `products`, `activeBrands`, and `sortOrder` didn't change. With `useMemo`, that filter/sort only re-runs when one of its actual dependencies changes, and the cached array reference is reused otherwise — which also matters if `visibleProducts` is passed on to a memoized grid component.

## 6. The `useMemo`/`useCallback` + `React.memo` Interaction

This is the single most commonly tested interaction in the "why did my child re-render" family of questions: `React.memo` skips a re-render only if every prop is reference-equal to last time, and an inline function or object literal is a new reference on every render no matter how memoized the parent's other state is.

```javascript
const ProductCard = React.memo(function ProductCard({ product, onAddToCart }) {
  console.log('ProductCard rendered:', product.id);
  return (
    <div className="card">
      <span>{product.name}</span>
      <button onClick={() => onAddToCart(product.id)}>Add to cart</button>
    </div>
  );
});

// BROKEN: onAddToCart is a fresh arrow function every render, so EVERY ProductCard
// re-renders whenever ProductList re-renders for ANY reason — React.memo can't help.
function ProductListBroken({ products }) {
  const [cartCount, setCartCount] = useState(0);

  const handleAdd = (id) => {
    addToCart(id);
    setCartCount((c) => c + 1);
  };

  return products.map((p) => <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />);
}

// FIXED: useCallback gives handleAdd a stable reference across renders, so
// React.memo's shallow prop comparison actually succeeds and cards are skipped.
function ProductListFixed({ products }) {
  const [cartCount, setCartCount] = useState(0);

  const handleAdd = useCallback((id) => {
    addToCart(id);
    setCartCount((c) => c + 1);
  }, []);

  return products.map((p) => <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />);
}
```

`React.memo` performs a shallow comparison of props (`Object.is` per key); functions and objects are compared by reference, not by content, so `() => {}` !== `() => {}` even when the code inside is identical. Wrapping `handleAdd` in `useCallback` is necessary but only half the fix in practice — `product` must also stay referentially stable (e.g. it comes straight from a `useMemo`'d or otherwise-stable array, not rebuilt as `{ ...p, extra: true }` inline on every render), or `React.memo` will still see a "changed" prop and re-render anyway.

## 7. `useContext` — The "Every Consumer Re-renders" Problem

`useContext` reads whatever value the nearest matching `Provider` currently holds, and re-renders the *component calling it* whenever that value changes — regardless of whether the component actually cares about the specific field that changed. This is context's biggest performance trap in real apps.

```javascript
// Notification system: one context bundling toast list, unread count, AND a language setting
const AppContext = createContext(null);

function AppProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [language, setLanguage] = useState('en');

  // A single object recreated every render — even splitting this with useMemo only
  // helps if theme/language rarely change relative to notifications.
  const value = { notifications, setNotifications, language, setLanguage };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function NotificationBell() {
  const { notifications } = useContext(AppContext);
  console.log('NotificationBell rendered'); // fires on EVERY new notification — expected
  return <span>{notifications.length}</span>;
}

function LanguageSwitcher() {
  const { language, setLanguage } = useContext(AppContext);
  console.log('LanguageSwitcher rendered'); // fires on every new notification too — NOT expected
  return <select value={language} onChange={(e) => setLanguage(e.target.value)}>{/* ... */}</select>;
}
```

Every time a new notification arrives, `value` is a new object, the `Provider` re-renders with a new context value, and *both* `NotificationBell` and `LanguageSwitcher` re-render — even though `LanguageSwitcher` never reads `notifications` at all. `useMemo` around `value` doesn't fix this on its own, because `notifications` changing still makes the memoized object change; the real fix is splitting into separate contexts (`NotificationContext` and `LanguageContext`) so a consumer only re-renders when the slice of state it actually subscribes to changes.

```javascript
// A safe custom-hook wrapper is standard practice alongside any context
function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
```

## 8. `useReducer` — Modeling Complex State Transitions

`useReducer` centralizes state transitions into one pure function of `(state, action) => newState`, which becomes worth it the moment a piece of state has more than one field that change together, or the next state genuinely depends on the previous one rather than being an independent flag.

```javascript
// Checkout flow: cart contents AND submission status, both need coordinated updates
const initialState = {
  items: [],           // [{ id, name, price, quantity }]
  totalAmount: 0,
  status: 'idle',       // 'idle' | 'submitting' | 'success' | 'error'
  error: null,
};

function checkoutReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((item) => item.id === action.payload.id);
      const items = existing
        ? state.items.map((item) =>
            item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...state.items, { ...action.payload, quantity: 1 }];

      const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      return { ...state, items, totalAmount };
    }
    case 'REMOVE_ITEM': {
      const items = state.items.filter((item) => item.id !== action.payload);
      const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      return { ...state, items, totalAmount };
    }
    case 'SUBMIT_START':
      return { ...state, status: 'submitting', error: null };
    case 'SUBMIT_SUCCESS':
      return { ...state, status: 'success', items: [], totalAmount: 0 };
    case 'SUBMIT_ERROR':
      return { ...state, status: 'error', error: action.payload };
    default:
      return state;
  }
}

function Checkout() {
  const [state, dispatch] = useReducer(checkoutReducer, initialState);

  const handlePlaceOrder = async () => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      await submitOrder(state.items);
      dispatch({ type: 'SUBMIT_SUCCESS' });
    } catch (err) {
      dispatch({ type: 'SUBMIT_ERROR', payload: err.message });
    }
  };

  return (
    <div>
      <h3>Total: ${state.totalAmount}</h3>
      <button onClick={handlePlaceOrder} disabled={state.status === 'submitting'}>
        {state.status === 'submitting' ? 'Placing order...' : 'Place order'}
      </button>
      {state.status === 'error' && <p>Error: {state.error}</p>}
    </div>
  );
}
```

Doing this with five separate `useState` calls (`items`, `totalAmount`, `status`, `error`, plus whatever else gets added later) lets the component slip into invalid combinations — `status === 'submitting'` while `items` is simultaneously being mutated by a stale click, for instance — because nothing enforces that they change together. The reducer makes every transition an explicit, testable, pure function call: `checkoutReducer(state, action)` can be unit-tested with plain objects, with no component or DOM involved at all.

## 9. Custom Hooks — Extracting Reusable Stateful Logic

A custom hook is just a function whose name starts with `use` and that calls other hooks inside it; it lets logic (not markup) be shared between components, and it's how most of the patterns above actually get packaged for reuse.

```javascript
// Reused by the product search box AND the notification search/filter box
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle); // cancels the pending update if value changes again in time
  }, [value, delayMs]);

  return debounced;
}

function ProductSearchBox() {
  const [rawQuery, setRawQuery] = useState('');
  const debouncedQuery = useDebouncedValue(rawQuery, 400);

  useEffect(() => {
    if (debouncedQuery) searchCatalog(debouncedQuery);
  }, [debouncedQuery]); // only fires once typing pauses for 400ms, not on every keystroke

  return <input value={rawQuery} onChange={(e) => setRawQuery(e.target.value)} />;
}
```

`useDebouncedValue` composes `useState` and `useEffect` internally but exposes none of that to its caller — `ProductSearchBox` just gets back a value that lags the real one by 400ms. Because it's a plain function that calls hooks, it must itself follow the Rules of Hooks (Section 10), and any component using it automatically gets its own independent state — two components calling `useDebouncedValue` never share data, the same way two calls to `useState` in different components never share state.

## 10. The Rules of Hooks — and the Mental Model Behind Them

There are exactly two rules: only call hooks at the top level of a component or custom hook (never inside conditionals, loops, or nested functions), and only call hooks from React function components or other custom hooks (never from plain JavaScript functions or class components).

```javascript
// VIOLATES RULE 1 — conditional hook call
function CheckoutSummary({ isGuest }) {
  if (!isGuest) {
    const [savedCards, setSavedCards] = useState([]); // only sometimes called!
  }
  // ...
}

// CORRECT — hook always called, the condition moves to how the value is USED
function CheckoutSummaryFixed({ isGuest }) {
  const [savedCards, setSavedCards] = useState([]);

  if (!isGuest) {
    // use savedCards here
  }
  // ...
}
```

React doesn't know hooks by name — internally, each component instance holds a linked list of hook call records, and on every render React walks that list in order, matching the *n*-th `useState`/`useEffect`/etc. call to the *n*-th node it stored last time purely by call position. If a hook call is skipped on some renders (because it was inside an `if`), the second, third, and every subsequent hook call after it shifts to the wrong node in that list — a `useEffect`'s cleanup could get matched against a different `useState`'s slot, silently corrupting state or firing the wrong effect with no error message at all. Calling hooks unconditionally at the top level is what keeps that call order — and therefore the linked list alignment — identical on every single render.

## Interview Questions and Answers

### 1. Why does `console.log(state)` right after calling its setter still show the old value?

**Answer:** `useState`'s setter schedules a re-render rather than mutating anything in place; the variable in the current closure keeps referring to the value that was current when that render started. The new value only exists in the *next* render's closure, which is why reading `state` on the very next line after `setState(...)` still shows the pre-update value.

### 2. What's the difference between `useState(expensiveFn())` and `useState(() => expensiveFn())`?

**Answer:** The first form calls `expensiveFn()` on every single render and discards the result on all renders after the first, since React only uses the initial value once. The second form passes a lazy initializer function that React invokes exactly once, on mount — this matters whenever the initial value requires real work, like parsing `localStorage` or reading from a cache.

### 3. How does React know which cleanup function belongs to which effect when a component has several `useEffect` calls?

**Answer:** Each `useEffect` call is tracked by its position in the per-component hook list, in the same order every render, so React pairs each effect with the cleanup it returned last time by that positional slot. Cleanups run in reverse order relative to how the effects were declared, matching stack-like unwind semantics, before the next matching effect runs or the component unmounts.

### 4. Why does a search-as-you-type feature sometimes show results for an earlier, shorter query instead of the latest one?

**Answer:** This is a race condition — requests fire on every keystroke, and network latency means an earlier request (for a shorter, less specific query) can resolve after a later one. The fix is a cancellation flag or `AbortController` set in the effect's cleanup, so a stale response arriving after a newer request started is simply ignored instead of overwriting the correct results.

### 5. What actually happens if `useEffect` is given no dependency array at all?

**Answer:** The effect runs after every render with no exception, so any state update performed inside it (like `setState`) triggers another render, which runs the effect again, producing an infinite loop if the effect always updates state. An empty array `[]` runs it only once on mount; omitting the array entirely is different from an empty array and is almost never what's intended.

### 6. `useMemo` versus `useCallback` — what does each one actually cache?

**Answer:** `useMemo` runs a function during render and caches its *return value* — an object, array, or computed primitive. `useCallback` does not execute anything; it caches the *function definition itself* so the same reference is reused across renders, which only matters for reference-equality checks like `React.memo` or a dependency array elsewhere, not for the function's actual behavior.

### 7. A child is wrapped in `React.memo` but still re-renders every time its parent renders — why?

**Answer:** `React.memo` skips a re-render only if every prop is reference-equal (via `Object.is`, shallow comparison) to the previous render's props. Passing an inline arrow function or object literal — `onClick={() => doThing()}` or `style={{ color: 'red' }}` — creates a new reference every render regardless of memoization elsewhere, so the shallow comparison always reports a change; the function needs `useCallback` and any object prop needs `useMemo` (or to be defined outside the render entirely).

### 8. Why does changing an unrelated field in a context value cause a component that never reads that field to re-render anyway?

**Answer:** `useContext` subscribes a component to the *entire* context value, not to individual fields inside it, so any change to the provider's value re-renders every consumer of that context regardless of which specific property changed. The fix in real applications is splitting one large context into several smaller, more focused contexts (e.g. separating notifications from language settings) so a component only re-renders when the slice it actually consumes changes.

### 9. When would you reach for `useReducer` instead of several `useState` calls?

**Answer:** When multiple pieces of state change together in response to the same event (like a cart's items and total updating from one `ADD_ITEM` action), or when the next state depends heavily on the previous state in ways that are easy to get inconsistent across several independent setters. A reducer centralizes every valid transition into one pure, unit-testable function and makes invalid state combinations much harder to reach by accident.

### 10. Why can't hooks be called inside an `if` statement or a loop?

**Answer:** React tracks each component's hooks as an ordered list matched purely by call position, not by name — the *n*-th hook call in this render is matched to the *n*-th hook call from the last render. Calling a hook conditionally means that position can shift between renders, so a later hook's state or effect can get matched against the wrong stored data with no runtime error, which is why the rule is enforced unconditionally rather than treated as a style preference.

### 11. Can a custom hook share state between two different components that both call it?

**Answer:** No — every call to a custom hook gets its own independent state, exactly like two separate calls to `useState` never share a value. A custom hook only shares *logic* (the implementation), not state; sharing actual state across components requires lifting it up to a common ancestor or putting it in context.

### 12. What's the real risk of forgetting a cleanup function in an effect that subscribes to something?

**Answer:** Without cleanup, every time the effect re-runs (on a dependency change) or the component unmounts, the old subscription/listener/connection is never torn down, so they accumulate — a chat room component that reconnects on every `roomId` change without disconnecting the old one ends up with a growing number of live connections all still delivering events to components that no longer care about them.

## Revision Checklist

- [ ] Explain automatic batching in React 18+ and predict console output across multiple `setState` calls, including inside a promise continuation.
- [ ] Justify when a lazy initializer (`useState(() => ...)`) is worth using over a plain initial value.
- [ ] Diagnose and fix a race condition caused by out-of-order async responses in `useEffect`.
- [ ] Name the two specific dependency-array mistakes (missing array, missing entry) and the distinct bug each one causes.
- [ ] State precisely what `useMemo` caches versus what `useCallback` caches, without conflating them.
- [ ] Explain why an inline function or object prop defeats `React.memo`, and what fixes it.
- [ ] Explain the "every consumer re-renders" context gotcha and the context-splitting fix.
- [ ] Justify a `useReducer` refactor over multiple `useState` calls with a concrete example of an invalid state combination it prevents.
- [ ] State both Rules of Hooks and explain the linked-list-of-hook-calls mental model that motivates them.
