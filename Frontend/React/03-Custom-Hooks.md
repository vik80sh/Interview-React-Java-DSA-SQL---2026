# Custom Hooks in React

Almost every React interview asks you to build a custom hook on the spot — `useDebounce`, `useLocalStorage`, `useFetch` — and the difference between a strong answer and a weak one usually comes down to whether you actually understand the state-isolation mental model, not just the syntax.

## 1. The Mental Model — Custom Hooks Share Logic, Never State

A **custom hook** is just a JavaScript function whose name starts with `use` and which calls other hooks (`useState`, `useEffect`, etc.) inside it. The critical thing to internalize: **custom hooks do not share state between the components that call them.** Every time a component calls a custom hook, React gives that call its own isolated state bucket and effect lifecycle inside that component's Fiber node.

```jsx
function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  const increment = () => setCount(c => c + 1);
  return [count, increment];
}

function ComponentA() {
  const [count, increment] = useCounter(); // its own bucket
  return <button onClick={increment}>A: {count}</button>;
}

function ComponentB() {
  const [count, increment] = useCounter(); // a completely separate bucket
  return <button onClick={increment}>B: {count}</button>;
}
```

Clicking A's button never changes B's count, even though both components called the exact same `useCounter` function. What's shared is the *logic* — the state-update rules, the effect setup/cleanup — not the *data*. If you need components to actually share a live value, that value has to live in a common ancestor (lifted state, Context, or a store), not inside a custom hook.

## 2. Naming Convention — Why the `use` Prefix Is Not Just a Style Rule

Custom hooks must be named starting with `use` (`useDebounce`, `useOnlineStatus`, `useFetch`). This isn't cosmetic — the `eslint-plugin-react-hooks` linter (which enforces the Rules of Hooks) specifically looks for the `use` prefix to know which functions are hooks. A function named `getWindowSize` that internally calls `useState` will not be checked for hook-order violations, and calling it conditionally or inside a loop won't get flagged even though it will break at runtime. Naming it `useWindowSize` instead makes the linter treat it as a hook, so it enforces "only call at the top level" and "only call from a React function or another hook" automatically.

```jsx
// ❌ Linter cannot protect this — it doesn't know it's a hook
function getWindowSize() {
  const [size, setSize] = useState(window.innerWidth);
  return size;
}

// ✅ Linter enforces Rules of Hooks because of the `use` prefix
function useWindowSize() {
  const [size, setSize] = useState(window.innerWidth);
  return size;
}
```

## 3. useLocalStorage — Persisting a User's UI Preference

A common real requirement: remember a user's choice (theme, sidebar collapsed state, table column widths) across page reloads without wiring up a backend call. `useLocalStorage` behaves like `useState`, but every write is mirrored into `localStorage`, and the initial read is lazy so `localStorage` is only touched once, on mount.

```jsx
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Failed to read localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Failed to write localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// USAGE: remember the user's theme choice across sessions
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage('ui-theme', 'light');

  return (
    <button onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}>
      Current theme: {theme}
    </button>
  );
}
```

The `try/catch` matters in production: `localStorage` throws in Safari private browsing mode and can hit quota limits, so a naive implementation without it would crash the component instead of degrading gracefully to in-memory state.

## 4. useFetch — Data Fetching With Loading, Error, and Data States

Every data-driven screen needs the same three states — `loading`, `error`, `data` — plus protection against two real bugs: updating state after the component has unmounted, and a stale response overwriting a newer one when the URL changes quickly (a search box, a tab switcher). `useReducer` keeps the three related fields updating together instead of via three separate `useState` calls that could drift out of sync, and `AbortController` cancels the in-flight request instead of just ignoring its result.

```jsx
function useFetch(url, options = {}) {
  const [state, dispatch] = useReducer(
    (prev, action) => ({ ...prev, ...action }),
    { data: null, loading: true, error: null }
  );

  useEffect(() => {
    const abortController = new AbortController();
    dispatch({ loading: true, error: null });

    (async () => {
      try {
        const response = await fetch(url, { ...options, signal: abortController.signal });
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        dispatch({ data, loading: false, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') {
          dispatch({ loading: false, error: error.message, data: null });
        }
      }
    })();

    // Cancels the request if the URL changes again or the component unmounts
    return () => abortController.abort();
  }, [url]);

  return state;
}

// USAGE: a product page that shows loading/error/data states cleanly
function UserProfile({ userId }) {
  const { data: user, loading, error } = useFetch(`/api/users/${userId}`);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Failed to load user: {error}</div>;
  return <div>{user.name}</div>;
}
```

If `userId` changes quickly (fast navigation between profiles), the previous fetch's `AbortController.abort()` fires in the effect's cleanup before the new fetch starts — so an old, slow response can never land after a newer one already updated the UI.

## 5. useDebounce — Search-as-You-Type Without Hammering the API

Typing "react" one keystroke at a time would fire five API calls if you searched on every `onChange`. `useDebounce` delays reflecting a fast-changing value until it has stopped changing for a set delay, by resetting a `setTimeout` on every new value and only committing the update once the timer actually completes.

```jsx
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    // Runs before the *next* effect fires — cancels the stale timer
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// USAGE: only call the search API after the user stops typing for 500ms
function SearchUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm) {
      searchAPI(debouncedSearchTerm); // fires once, not on every keystroke
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search users..."
    />
  );
}
```

Typing "r", "re", "rea" in quick succession resets the timer twice and only lets the third one complete — so exactly one API call fires, for "rea", instead of three.

## 6. useOnlineStatus — A "You're Offline" Banner

Production apps that let users submit forms or place orders need to know if the browser has lost network connectivity, so they can warn the user instead of letting a submit silently fail. This hook subscribes to the browser's native `online`/`offline` events and exposes a single boolean, with `useDebugValue` making the current status visible in React DevTools without extra logging.

```jsx
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useDebugValue(isOnline ? 'Online' : 'Offline');

  return isOnline;
}

// USAGE: a persistent banner that warns the user before they lose work
function App() {
  const isOnline = useOnlineStatus();

  return (
    <>
      {!isOnline && (
        <div className="offline-banner" role="alert">
          You're offline. Changes will be saved once you're back online.
        </div>
      )}
      <MainContent />
    </>
  );
}
```

The cleanup function is what makes this safe to use in multiple components at once: each mounted instance adds its own listeners and removes exactly those same listeners on unmount, so there's no listener leak even if `useOnlineStatus` is called from ten different components on the page.

## 7. useToggle — Modal and Sidebar Open/Close State

A huge share of UI state is just a boolean that flips: is the modal open, is the sidebar expanded, is the dropdown visible. Writing `setIsOpen(v => !v)` inline everywhere works, but a small hook makes the intent explicit and gives you named actions (`open`, `close`) instead of just a raw setter.

```jsx
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);
  const open = useCallback(() => setValue(true), []);
  const close = useCallback(() => setValue(false), []);

  return [value, toggle, { open, close }];
}

// USAGE: a modal that can be opened, closed, or toggled from different triggers
function ProductPage() {
  const [isModalOpen, toggleModal, { open, close }] = useToggle(false);

  return (
    <>
      <button onClick={open}>View details</button>
      {isModalOpen && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Product details</h2>
            <button onClick={close}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
```

Returning both `toggle` and the `{ open, close }` pair covers every real trigger pattern: a hamburger icon that toggles a sidebar, and a separate "X" button or backdrop click that should only ever close, never re-open, the same panel.

## Interview Questions and Answers

### 1. Do two components calling the same custom hook share state?

**Answer:** No. Each call to a custom hook gets its own isolated state bucket inside that component's Fiber node. If `ComponentA` and `ComponentB` both call `useCounter()`, incrementing A's counter never affects B's — the hook only shares the reusable *logic*, not a live data value.

### 2. Why must a custom hook's name start with `use`?

**Answer:** The `use` prefix is how `eslint-plugin-react-hooks` recognizes a function as a hook and enforces the Rules of Hooks on it — only call at the top level, only call from a component or another hook. A helper function that internally calls `useState` but isn't named `useSomething` won't be checked, so calling it conditionally could break at runtime with no lint warning.

### 3. What problem does `useDebounce` solve, and how does it work internally?

**Answer:** It stops a fast-changing value (like search input) from triggering expensive work (an API call) on every keystroke. Every time the source value changes, the effect clears the previous `setTimeout` and starts a new one; the debounced value only updates once the timer finishes uninterrupted, so a burst of keystrokes collapses into a single update.

### 4. In `useFetch`, why use `AbortController` instead of just an `isMounted` flag?

**Answer:** An `isMounted` flag only prevents the state update from happening — it doesn't stop the actual network request, which keeps consuming bandwidth and server resources. `AbortController.abort()` in the effect's cleanup actually cancels the underlying HTTP request, which matters when a user navigates quickly between pages that each trigger a fetch.

### 5. Why does `useLocalStorage` read the initial value lazily (`useState(() => ...)`) instead of `useState(localStorage.getItem(key))`?

**Answer:** Passing a plain value re-evaluates the expression on every render even though `useState` only uses it on the very first render — for `localStorage.getItem`, that means an unnecessary synchronous disk read on every re-render. The lazy initializer function form is only invoked once, on mount, which is both faster and avoids redundant `localStorage` access.

### 6. How would you make `useOnlineStatus` safe to use in many components on the same page?

**Answer:** Each component's call runs its own `useEffect`, which adds its own `online`/`offline` listeners and removes exactly those same listeners in its cleanup function. Because listener add/remove is scoped per hook call, ten components each calling `useOnlineStatus()` produce ten independent listener pairs with no shared state and no leaks.

### 7. What's the advantage of `useToggle` returning both a `toggle` function and separate `open`/`close` functions?

**Answer:** Different UI triggers need different semantics — a hamburger button should flip open/closed, but a modal's backdrop click or "X" button should only ever close it, never accidentally reopen it. Exposing all three lets each trigger call the action that matches its intent instead of every caller re-deriving the same boolean logic.

### 8. Why does `useFetch` use `useReducer` instead of three separate `useState` calls for `data`, `loading`, and `error`?

**Answer:** The three fields are not independent — they change together as a set (start: `loading=true, error=null`; success: `loading=false, data=...`), and three separate setters make it possible to accidentally leave them in an inconsistent combination, like `loading=true` and `data` already populated. A single reducer action updates all three atomically, so the state machine can't drift into an invalid combination.

### 9. Can you call a custom hook conditionally if you're careful about it?

**Answer:** No — this is a hard rule regardless of the custom hook's internal logic. React matches up hook calls between renders purely by call order, since hooks are stored as a linked list per component; skipping a call in some renders but not others shifts every subsequent hook's position and corrupts state for all of them.

### 10. Give a concrete example of when you'd reach for a custom hook instead of just inlining the logic in the component.

**Answer:** Any time the same stateful behavior is needed in more than one component — for example, three different pages each needing a "has the user scrolled past 200px" boolean to show a sticky header. Extracting it into `useScrollPosition()` avoids duplicating the same `useState`/`useEffect`/event-listener block three times and keeps the cleanup logic correct in exactly one place.

## Revision Checklist

- [ ] Explain that custom hooks share stateful *logic*, never the actual state value, between the components that call them.
- [ ] Explain why the `use` naming convention is functionally required for the Rules-of-Hooks linter, not just a style preference.
- [ ] Implement `useLocalStorage` with lazy initial read and a `try/catch` around both read and write.
- [ ] Implement `useFetch` (or `useAsync`) with loading/error/data state and both unmount protection and request cancellation.
- [ ] Implement `useDebounce` and explain exactly why a burst of keystrokes collapses into one update.
- [ ] Implement `useOnlineStatus` and explain why its listener cleanup makes it safe to call from multiple components.
- [ ] Implement `useToggle` and justify returning named `open`/`close` actions alongside `toggle`.
- [ ] Explain why calling a hook conditionally or inside a loop breaks React's per-component hook order.
