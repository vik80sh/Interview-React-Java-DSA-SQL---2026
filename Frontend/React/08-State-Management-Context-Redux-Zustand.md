# State Management: Context, Redux, and Zustand

State management questions probe whether you can justify a tool choice rather than recite an API. Interviewers care most about the decision framework: when local state is enough, when Context starts to hurt, and what Redux or Zustand actually buy you over the alternative.

## 1. Choosing a State Location

Start with the narrowest scope that works and widen only when a real symptom appears.

- **Local state (`useState`/`useReducer`)** — state used by one component or a small subtree. Zero dependencies, zero re-render cost outside that subtree.
- **Context API** — state that many distant components read but that changes rarely (theme, locale, current user, feature flags). Context is a dependency-injection mechanism, not a data store; it has no built-in way to limit re-renders to the parts of the value a consumer actually uses.
- **Redux (or Redux Toolkit)** — state shared across large parts of the app, updated frequently, with non-trivial derivation logic, multiple developers touching the same slices, or a real need for time-travel debugging and middleware.
- **Zustand** — the same shared/frequent-update problem as Redux, but for a team that wants a small external store without actions/reducers boilerplate, still with per-field subscriptions.

A useful rule: prop drilling two or three levels deep is not automatically a Context problem — passing props explicitly is often more readable than hiding the dependency behind a hook. Reach for Context when the same value is needed in many unrelated subtrees, and reach for Redux/Zustand when the value changes often enough that Context's coarse re-render behavior becomes a measurable cost.

## 2. Context API and the Re-render Gotcha

Context works by having every provider re-render trigger a re-render of every consumer, regardless of which fields of the context value that consumer actually reads.

```typescript
const AppContext = createContext(null);

function AppProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);

  // New object identity every render — every consumer re-renders
  // on every state change, even ones that only read `theme`.
  const value = { theme, setTheme, user, setUser };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
```

Two fixes address different parts of the problem:

1. **Memoize the value** with `useMemo` keyed on its dependencies. This stops consumers from re-rendering when the *provider* re-renders for an unrelated reason, but a change to any field in the value still re-renders every consumer.
2. **Split into multiple contexts**, one per independently-changing concern (`ThemeContext`, `UserContext`, `NotificationContext`). This is the real fix: a component that only reads `ThemeContext` no longer re-renders when `user` changes, because it never subscribed to `UserContext` in the first place.

```typescript
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

For non-trivial local logic inside a context, pair it with `useReducer` instead of several `useState` calls — the reducer centralizes the transition logic and keeps the provider component small:

```typescript
function TodoProvider({ children }) {
  const [todos, dispatch] = useReducer(todoReducer, []);
  return <TodoContext.Provider value={{ todos, dispatch }}>{children}</TodoContext.Provider>;
}
```

This pattern is still Context under the hood, so it inherits the same re-render ceiling — it solves state-transition clarity, not the subscription-granularity problem.

## 3. Redux Fundamentals

Redux is a single, predictable state container built on three pieces:

- **Actions** — plain objects describing what happened (`{ type: 'ADD_TODO', payload: ... }`), not what should change.
- **Reducers** — pure functions `(state, action) => newState` that compute the next state without mutating the previous one.
- **Store** — holds the single state tree, exposes `dispatch`, `getState`, and `subscribe`.

```typescript
function todoReducer(state = [], action) {
  switch (action.type) {
    case 'ADD_TODO':
      return [...state, action.payload];
    default:
      return state;
  }
}

const store = createStore(todoReducer);
store.dispatch({ type: 'ADD_TODO', payload: { id: 1, text: 'Learn Redux' } });
```

In components, `react-redux` connects this store: `useSelector` reads a slice of state and re-renders only when that slice's result changes; `useDispatch` sends actions. Wrapping action objects in **action creator functions** keeps dispatch calls type-safe and avoids typos in string literals scattered across the codebase.

The unidirectional flow — dispatch an action, a pure reducer computes the next state, subscribed components re-render — is what makes Redux state changes traceable and replayable, which is the basis for its DevTools time-travel debugging.

## 4. Redux Toolkit: The Modern Way to Write Redux

Hand-written Redux (switch-statement reducers, manually spread immutable updates, separate action-type constants) is verbose and error-prone. **Redux Toolkit (RTK)** is now the recommended way to use Redux; plain `createStore`/`combineReducers` should be treated as legacy knowledge for reading older code, not a pattern to write today.

```typescript
const todoSlice = createSlice({
  name: 'todos',
  initialState: { items: [], loading: false, error: null },
  reducers: {
    addTodo: (state, action) => {
      state.items.push(action.payload); // Immer lets you "mutate" safely
    },
    removeTodo: (state, action) => {
      state.items = state.items.filter(t => t.id !== action.payload);
    }
  }
});

const store = configureStore({ reducer: { todos: todoSlice.reducer } });
export const { addTodo, removeTodo } = todoSlice.actions;
```

`createSlice` generates action creators and a reducer from one object, and uses Immer internally so reducer code can write direct-looking mutations while the store still receives a new immutable state object. `configureStore` wires in the DevTools extension and sane default middleware (including a check that catches accidental state mutation and non-serializable actions) without manual setup.

## 5. Async Actions: Thunks

A reducer must be a pure, synchronous function, so an async operation like a network request cannot live inside one. **Thunk** middleware is the standard answer: instead of dispatching a plain object, you dispatch a function that receives `dispatch` (and `getState`), runs the async work, and dispatches plain actions as it progresses.

```typescript
const fetchTodos = createAsyncThunk('todos/fetchTodos', async () => {
  const response = await fetch('/api/todos');
  return response.json();
});

// in the slice:
extraReducers: (builder) => {
  builder
    .addCase(fetchTodos.pending, (state) => { state.loading = true; })
    .addCase(fetchTodos.fulfilled, (state, action) => {
      state.loading = false;
      state.items = action.payload;
    })
    .addCase(fetchTodos.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message ?? 'Failed to fetch';
    });
}
```

`createAsyncThunk` automatically dispatches `pending`/`fulfilled`/`rejected` actions around the promise, which removes the manual `try/catch` and loading-flag bookkeeping a hand-rolled thunk needs. Redux Saga is the alternative for flows that need cancellation, retry, or complex coordination between multiple async streams (generators plus effects), but it has a much steeper learning curve; most applications never need more than thunks.

## 6. Selectors and Why They Matter for Performance

A selector is just a function that reads a piece of state: `state => state.todos.items`. Defining selectors once and reusing them avoids duplicating the same access path across components and gives you a single place to change if the state shape moves.

The performance reason to care is **memoized selectors**. `useSelector` re-renders a component whenever the selector's return value differs (by reference) from the previous render. A selector that derives a new array or object on every call — `state => state.todos.filter(t => t.completed)` — returns a new reference every time, so the component re-renders on every store update even when the derived data hasn't actually changed.

```typescript
const selectTodos = (state) => state.todos.items;

const selectCompletedTodos = createSelector(
  [selectTodos],
  (todos) => todos.filter(t => t.completed)
);
```

`createSelector` (from Reselect, re-exported by RTK) caches the last inputs and output: if `selectTodos` returns the same reference as last time, the derivation is skipped and the previous result reference is reused, so components subscribed to `selectCompletedTodos` don't re-render for unrelated state changes. This is the Redux-side equivalent of the Context splitting problem in Section 2 — both are about narrowing what triggers a re-render.

## 7. Zustand: A Lightweight External Store

Zustand solves the same problem as Redux — a store outside React that many components can read and update — with far less ceremony. There is no action/reducer/dispatch layer; a store is just a function that returns state plus the functions that update it, backed by a plain external store (no Context and no provider component required).

```typescript
const useTodoStore = create((set) => ({
  todos: [],
  addTodo: (text) =>
    set((state) => ({ todos: [...state.todos, { id: Date.now(), text, completed: false }] })),
  fetchTodos: async () => {
    const todos = await fetch('/api/todos').then(r => r.json());
    set({ todos });
  }
}));

function TodoList() {
  const todos = useTodoStore((state) => state.todos);
  const addTodo = useTodoStore((state) => state.addTodo);
  // subscribing via a selector function means this component only
  // re-renders when the `todos` slice it selected actually changes
}
```

Selecting a slice with `useTodoStore(state => state.todos)` gives per-field subscriptions similar to a Redux selector, without needing `createSelector` for the simple case — Zustand does a reference-equality check on the selected value by default. Middleware such as `persist` (auto-sync to `localStorage`) or a `devtools` binding are opt-in add-ons rather than built-in, which keeps the base bundle small.

## 8. Comparing the Options

| | Local state | Context | Redux (Toolkit) | Zustand |
|---|---|---|---|---|
| Boilerplate | none | low | moderate | low |
| Re-render granularity | n/a | whole subtree per provider | per selector | per selector |
| DevTools / time-travel | no | no | yes | optional |
| Async story | manual | manual | thunks/RTK Query | manual/plugin |
| Best for | component-local UI state | rarely-changing, widely-read values | large app, many contributors, complex derived state | small-to-medium app, minimal ceremony |

None of these tools is a strict upgrade over the others — the axis that matters is how often the state changes and how many unrelated components would be forced to re-render by a coarser mechanism. Context is fine for a theme flag that changes twice a session; it is a poor fit for state that changes on every keystroke and is read by half the tree.

## Interview Questions and Answers

### 1. When would you reach for Context instead of Redux?

**Answer:** When the value is read widely but changes infrequently, such as theme, locale, or the current authenticated user. Context avoids pulling in an external library for something that doesn't need selector-based re-render control or DevTools.

### 2. Why does Context cause unnecessary re-renders, and how do you fix it?

**Answer:** Every consumer of a context re-renders whenever the provider passes a new value, regardless of which fields the consumer reads, because Context has no per-field subscription mechanism. Memoizing the value with `useMemo` prevents renders caused by unrelated provider re-renders, but splitting one context into several independent contexts is what actually stops an unrelated field's change from re-rendering a consumer.

### 3. Walk through the Redux data flow.

**Answer:** A component dispatches a plain action object describing what happened. The store passes the current state and that action to a pure reducer, which returns a new state without mutating the old one. Subscribed components read the new state through selectors and re-render if the slice they selected changed.

### 4. What does Redux Toolkit change about writing Redux?

**Answer:** `createSlice` generates action creators and a reducer together and uses Immer so reducers can write direct-looking mutations while the store still gets an immutable update. `configureStore` sets up DevTools and default middleware, including checks for accidental mutation, removing most of the manual boilerplate of hand-written Redux.

### 5. How do you handle asynchronous logic in Redux?

**Answer:** Reducers must stay pure and synchronous, so async work is handled by middleware. A thunk is a function dispatched instead of an action object; it receives `dispatch` and can run async code, dispatching plain actions as it progresses. `createAsyncThunk` automates the pending/fulfilled/rejected action dispatch around a promise.

### 6. What is a selector and why does memoization matter?

**Answer:** A selector is a function that reads a piece of state, giving one reusable place to access a value. Memoized selectors (via `createSelector`) cache their result and only recompute when their inputs actually change by reference, which prevents components from re-rendering when a selector would otherwise return a new derived array or object on every call.

### 7. How does Zustand differ from Redux?

**Answer:** Zustand drops the action/reducer/dispatch ceremony — a store is just a function returning state and updater functions, with no provider component required. It still supports per-field subscriptions through selector functions, giving Redux-like re-render control with a much smaller API and bundle size, at the cost of Redux's mature middleware ecosystem and built-in DevTools.

### 8. Redux vs. Zustand — how would you decide for a real project?

**Answer:** It depends on team size and complexity rather than one being objectively better. Redux fits a large codebase with many contributors, complex derived state, and a need for time-travel debugging; Zustand fits a smaller team or app that wants shared state without the boilerplate, since both give comparable re-render performance through selectors.

### 9. Is prop drilling always a reason to add Context?

**Answer:** No. Passing props explicitly through two or three levels is often more readable and easier to trace than hiding a dependency behind `useContext`. Context earns its cost when the same value is needed by many unrelated subtrees, not simply because a prop passes through an intermediate component.

### 10. When would you choose Redux Saga over a thunk?

**Answer:** Thunks are enough for straightforward async flows like a single fetch-and-dispatch. Saga's generator-based effects are worth the steeper learning curve only when you need cancellation, retries, debouncing, or coordinating multiple concurrent async streams — behavior that gets awkward to hand-roll with plain thunks.

## Revision Checklist

- [ ] Explain the decision path from local state to Context to Redux/Zustand.
- [ ] Describe the Context all-consumers-re-render problem and both fixes (memoized value, split contexts).
- [ ] Trace the Redux action → reducer → store → component flow from memory.
- [ ] Write a `createSlice` with a synchronous reducer and a `createAsyncThunk` for an API call.
- [ ] Explain why unmemoized selectors cause extra re-renders and how `createSelector` fixes it.
- [ ] Describe Zustand's external-store pattern and how its selector subscriptions compare to Redux's.
- [ ] Justify Redux vs. Zustand vs. Context for a given app size and team, not just list pros/cons.
- [ ] Know when thunks are insufficient and Saga (or a similar effect model) becomes worth its complexity.
