# State Management - Redux, Context, Zustand
## Complete Interview Guide with Real Examples

---

## TABLE OF CONTENTS
1. State Management Fundamentals
2. Context API Patterns
3. Redux Mastery
4. Zustand & Modern Alternatives
5. Common Interview Questions

---

# PART 1: STATE MANAGEMENT FUNDAMENTALS

## When to Use State Management?

```javascript
// ❌ DON'T USE if:
- You only have 1-2 levels of prop drilling
- State is local to one component
- You have less than 5 pieces of global state

// ✅ USE if:
- Props drilling 3+ levels deep
- Multiple components need same state
- Complex state logic
- Frequent state updates
- Need time-travel debugging

// DECISION TREE:
Start with useState (local state)
  → If props drilling 2+ levels → Use Context API
    → If complex logic → Use Redux
    → If just simple actions → Use Zustand
```

---

## State Management Comparison

```
                  Local State  Context   Redux   Zustand
Simple?           ✅✅✅       ✅✅      ❌      ✅✅✅
Large apps?       ❌          ❌        ✅✅✅   ✅
DevTools?         ❌          ❌        ✅✅✅   ✅
Learning curve?   Easy        Easy      Hard    Easy
Bundle size?      0KB          0KB       5KB     3KB
Time-travel?      ❌          ❌        ✅✅✅   ✅
```

---

# PART 2: CONTEXT API PATTERNS

## Context API Basics (Review)

```typescript
// ❌ PROBLEM: Prop drilling
function App() {
  const [theme, setTheme] = useState('light');
  return <Header theme={theme} setTheme={setTheme} />;
}

function Header({ theme, setTheme }) {
  return <Nav theme={theme} setTheme={setTheme} />;
}

function Nav({ theme, setTheme }) {
  return <Button theme={theme} setTheme={setTheme} />;
}

// ✅ SOLUTION: Context API
const ThemeContext = React.createContext();

function App() {
  const [theme, setTheme] = useState('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Header />
      <Main />
      <Footer />
    </ThemeContext.Provider>
  );
}

function Button() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
    Toggle ({theme})
  </button>;
}
```

---

## Advanced Context Pattern: Separate Contexts

### Problem: All Consumers Re-render

```typescript
// ❌ PROBLEM: One context for everything
const AppContext = React.createContext();

function AppProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);

  const value = {
    theme, setTheme,
    language, setLanguage,
    notifications, setNotifications,
    user, setUser
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// ISSUE: When theme changes, ALL consumers re-render
// (language, notifications, user components re-render unnecessarily)

// ✅ SOLUTION: Split into multiple contexts
const ThemeContext = React.createContext();
const LanguageContext = React.createContext();
const UserContext = React.createContext();
const NotificationContext = React.createContext();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// NOW: When theme changes, only theme consumers re-render

// USAGE:
function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <UserProvider>
          <NotificationProvider>
            <MainApp />
          </NotificationProvider>
        </UserProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
```

---

## Pattern: useContext with useReducer for Complex State

```typescript
// INTERVIEW: How to use Context + useReducer for state management?

type TodoAction = 
  | { type: 'ADD'; payload: string }
  | { type: 'REMOVE'; payload: number }
  | { type: 'TOGGLE'; payload: number }
  | { type: 'LOAD'; payload: Todo[] };

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const TodoContext = React.createContext<{
  todos: Todo[];
  dispatch: React.Dispatch<TodoAction>;
} | undefined>(undefined);

function todoReducer(todos: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'ADD':
      return [...todos, { id: Date.now(), text: action.payload, completed: false }];
    
    case 'REMOVE':
      return todos.filter(t => t.id !== action.payload);
    
    case 'TOGGLE':
      return todos.map(t =>
        t.id === action.payload ? { ...t, completed: !t.completed } : t
      );
    
    case 'LOAD':
      return action.payload;
    
    default:
      return todos;
  }
}

function TodoProvider({ children }: { children: React.ReactNode }) {
  const [todos, dispatch] = useReducer(todoReducer, []);

  // Load todos from API on mount
  useEffect(() => {
    fetchTodos().then(todos => {
      dispatch({ type: 'LOAD', payload: todos });
    });
  }, []);

  return (
    <TodoContext.Provider value={{ todos, dispatch }}>
      {children}
    </TodoContext.Provider>
  );
}

function useTodos() {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodos must be used within TodoProvider');
  }
  return context;
}

// USAGE:
function TodoList() {
  const { todos, dispatch } = useTodos();

  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => dispatch({ type: 'TOGGLE', payload: todo.id })}
          />
          <span>{todo.text}</span>
          <button onClick={() => dispatch({ type: 'REMOVE', payload: todo.id })}>
            Delete
          </button>
        </div>
      ))}
      <AddTodo />
    </div>
  );
}

function AddTodo() {
  const { dispatch } = useTodos();
  const [input, setInput] = useState('');

  return (
    <div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="New todo..."
      />
      <button
        onClick={() => {
          dispatch({ type: 'ADD', payload: input });
          setInput('');
        }}
      >
        Add
      </button>
    </div>
  );
}
```

---

# PART 3: REDUX MASTERY

## Redux Fundamentals

```typescript
// REDUX = Predictable state container for JavaScript apps
// Core concepts: Action → Reducer → Store → Component

// 1. ACTIONS: Describe what happened
const addTodoAction = {
  type: 'ADD_TODO',
  payload: { id: 1, text: 'Learn Redux' }
};

// 2. REDUCER: Updates state based on action
function todoReducer(state = [], action) {
  switch (action.type) {
    case 'ADD_TODO':
      return [...state, action.payload];
    default:
      return state;
  }
}

// 3. STORE: Holds the state
const store = createStore(todoReducer);

// 4. DISPATCH: Send actions to reducer
store.dispatch(addTodoAction);

// 5. SUBSCRIBE: React to state changes
store.subscribe(() => {
  console.log('State changed:', store.getState());
});

// 6. COMPONENT: Connected via react-redux
function TodoList() {
  const todos = useSelector(state => state.todos);
  const dispatch = useDispatch();

  return (
    <div>
      {todos.map(todo => <div key={todo.id}>{todo.text}</div>)}
      <button onClick={() => dispatch(addTodoAction)}>Add</button>
    </div>
  );
}
```

---

## Redux Patterns

### Pattern 1: Action Creators

```typescript
// ❌ MANUAL
dispatch({ type: 'SET_LOADING', payload: true });

// ✅ ACTION CREATOR FUNCTION
function setLoading(isLoading: boolean) {
  return { type: 'SET_LOADING', payload: isLoading };
}

dispatch(setLoading(true));

// ✅ TYPED ACTION CREATORS
type TodoAction = 
  | { type: 'ADD_TODO'; payload: string }
  | { type: 'REMOVE_TODO'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean };

const addTodo = (text: string): TodoAction => ({
  type: 'ADD_TODO',
  payload: text
});

const removeTodo = (id: number): TodoAction => ({
  type: 'REMOVE_TODO',
  payload: id
});

const setLoading = (isLoading: boolean): TodoAction => ({
  type: 'SET_LOADING',
  payload: isLoading
});

// NOW TYPE-SAFE
dispatch(addTodo('Buy milk')); // ✅
dispatch(addTodo(123)); // ❌ ERROR
```

---

### Pattern 2: Async Actions with Thunk

```typescript
// PROBLEM: Redux only handles sync actions
// SOLUTION: Redux Thunk middleware

// Install: npm install redux-thunk
// Setup:
const store = createStore(
  rootReducer,
  applyMiddleware(thunk)
);

// Async action (thunk)
const fetchTodos = (): AppThunk => async (dispatch) => {
  dispatch(setLoading(true));
  
  try {
    const todos = await fetch('/api/todos').then(r => r.json());
    dispatch({ type: 'SET_TODOS', payload: todos });
  } catch (err) {
    dispatch({ type: 'SET_ERROR', payload: err.message });
  } finally {
    dispatch(setLoading(false));
  }
};

// USAGE IN COMPONENT:
function TodoList() {
  const dispatch = useDispatch();
  const { todos, loading, error } = useSelector(state => state.todos);

  useEffect(() => {
    dispatch(fetchTodos());
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{todos.map(t => <div key={t.id}>{t.text}</div>)}</div>;
}
```

---

### Pattern 3: Redux Toolkit (Modern Redux)

```typescript
// REDUX TOOLKIT = Better API for Redux
// Includes: createSlice, createAsyncThunk, configureStore

import { createSlice, createAsyncThunk, configureStore } from '@reduxjs/toolkit';

// 1. DEFINE STATE SHAPE
interface TodoState {
  items: Todo[];
  loading: boolean;
  error: string | null;
}

// 2. CREATE ASYNC THUNK
const fetchTodos = createAsyncThunk(
  'todos/fetchTodos',
  async () => {
    const response = await fetch('/api/todos');
    return response.json() as Promise<Todo[]>;
  }
);

// 3. CREATE SLICE (Combines reducer + actions)
const todoSlice = createSlice({
  name: 'todos',
  initialState: {
    items: [],
    loading: false,
    error: null
  } as TodoState,
  
  reducers: {
    // Synchronous actions
    addTodo: (state, action) => {
      state.items.push(action.payload);
    },
    removeTodo: (state, action) => {
      state.items = state.items.filter(t => t.id !== action.payload);
    }
  },
  
  extraReducers: (builder) => {
    // Handle async thunk states
    builder
      .addCase(fetchTodos.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTodos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch';
      });
  }
});

// 4. CONFIGURE STORE
const store = configureStore({
  reducer: {
    todos: todoSlice.reducer
  }
});

// 5. EXPORT ACTIONS
export const { addTodo, removeTodo } = todoSlice.actions;

// 6. USAGE IN COMPONENT
function TodoList() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading, error } = useSelector(state => state.todos);

  useEffect(() => {
    dispatch(fetchTodos());
  }, [dispatch]);

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {items.map(todo => (
        <div key={todo.id}>
          {todo.text}
          <button onClick={() => dispatch(removeTodo(todo.id))}>Delete</button>
        </div>
      ))}
      <button onClick={() => dispatch(addTodo({ id: 1, text: 'New' }))}>Add</button>
    </div>
  );
}
```

---

### Pattern 4: Selectors

```typescript
// PROBLEM: Selecting nested state is verbose and duplicated
const todos = useSelector(state => state.todos.items); // Repeated everywhere
const loading = useSelector(state => state.todos.loading);

// ✅ SOLUTION: Create reusable selectors
const selectTodos = (state: RootState) => state.todos.items;
const selectLoading = (state: RootState) => state.todos.loading;
const selectError = (state: RootState) => state.todos.error;

// MEMOIZED SELECTOR: Only recomputes when data changes
import { createSelector } from '@reduxjs/toolkit';

const selectCompletedTodos = createSelector(
  [selectTodos],
  (todos) => todos.filter(t => t.completed)
);

const selectTodoStats = createSelector(
  [selectTodos],
  (todos) => ({
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    pending: todos.filter(t => !t.completed).length
  })
);

// USAGE:
function TodoList() {
  const todos = useSelector(selectTodos);
  const loading = useSelector(selectLoading);
  const stats = useSelector(selectTodoStats); // Memoized!

  return (
    <div>
      <p>Total: {stats.total}, Completed: {stats.completed}, Pending: {stats.pending}</p>
      {todos.map(t => <div key={t.id}>{t.text}</div>)}
    </div>
  );
}
```

---

# PART 4: ZUSTAND & MODERN ALTERNATIVES

## Zustand Basics

```typescript
// ZUSTAND = Simple, lightweight state management
// No boilerplate like Redux

import { create } from 'zustand';

// Create store with shallow merge by default
const useTodoStore = create((set) => ({
  todos: [] as Todo[],
  loading: false,
  error: null,

  // Actions (update state)
  addTodo: (text: string) =>
    set((state) => ({
      todos: [...state.todos, { id: Date.now(), text, completed: false }]
    })),

  removeTodo: (id: number) =>
    set((state) => ({
      todos: state.todos.filter(t => t.id !== id)
    })),

  setLoading: (loading: boolean) => set({ loading }),

  fetchTodos: async () => {
    set({ loading: true });
    try {
      const todos = await fetch('/api/todos').then(r => r.json());
      set({ todos, loading: false, error: null });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  }
}));

// USAGE IN COMPONENT:
function TodoList() {
  const todos = useTodoStore((state) => state.todos);
  const addTodo = useTodoStore((state) => state.addTodo);
  const removeTodo = useTodoStore((state) => state.removeTodo);
  const loading = useTodoStore((state) => state.loading);

  useEffect(() => {
    useTodoStore.getState().fetchTodos();
  }, []);

  return (
    <div>
      {loading && <div>Loading...</div>}
      {todos.map(t => (
        <div key={t.id}>
          {t.text}
          <button onClick={() => removeTodo(t.id)}>Delete</button>
        </div>
      ))}
      <button onClick={() => addTodo('New todo')}>Add</button>
    </div>
  );
}
```

---

## Zustand vs Redux

```typescript
// ZUSTAND ADVANTAGES:
// 1. No boilerplate
// 2. Simpler API
// 3. Smaller bundle
// 4. Easier to learn

// REDUX ADVANTAGES:
// 1. DevTools (time-travel debugging)
// 2. Larger ecosystem
// 3. Middleware support
// 4. More mature

// WHEN TO USE:
// - Small to medium apps → Zustand
// - Large apps with many devs → Redux
// - Need debugging → Redux
// - Need flexibility → Zustand
```

---

## Zustand with Persist

```typescript
// Save state to localStorage automatically
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUserStore = create(
  persist(
    (set) => ({
      user: null as User | null,
      
      setUser: (user: User) => set({ user }),
      logout: () => set({ user: null })
    }),
    {
      name: 'user-store' // localStorage key
    }
  )
);

// NOW: User state persists across page reloads
```

---

# PART 5: COMMON INTERVIEW QUESTIONS

## Question 1: What's the difference between Redux and Context API?

```typescript
// ANSWER:

// Context API:
// - Built into React
// - Simple for small apps
// - No DevTools
// - All consumers re-render on any change
// - Good for: theme, language, current user

// Redux:
// - External library
// - Better for complex apps
// - Has DevTools (time-travel debugging)
// - Optimized re-renders (selector-based)
// - Good for: app state, data management

// CHOICE:
const contextVsRedux = {
  useContext: 'Local state + props drilling < 3 levels',
  redux: 'Complex state, many developers, need debugging'
};
```

---

## Question 2: How do you prevent unnecessary re-renders with Context?

```typescript
// ❌ PROBLEM: All consumers re-render
const AppContext = React.createContext();

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  // New object every render!
  const value = { user, setUser, theme, setTheme };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// ✅ SOLUTION 1: Memoize value
const value = useMemo(() => ({
  user, setUser, theme, setTheme
}), [user, theme]);

// ✅ SOLUTION 2: Split contexts
const UserContext = React.createContext();
const ThemeContext = React.createContext();

// NOW: Theme change only re-renders theme consumers
```

---

## Question 3: When should you use Redux Thunk vs Redux Saga?

```typescript
// THUNK (Simple):
// - Function that returns function
// - Handles async actions
// - Easier to learn
// - Synchronous testing

const fetchUser = (id) => async (dispatch) => {
  dispatch({ type: 'LOADING' });
  const user = await fetch(`/api/users/${id}`).then(r => r.json());
  dispatch({ type: 'SET_USER', payload: user });
};

// SAGA (Complex):
// - Generator functions
// - Better for complex flows
// - Side effects handling
// - Easier to cancel/retry

function* fetchUserSaga(action) {
  try {
    const user = yield call(fetch, `/api/users/${action.id}`);
    yield put({ type: 'SET_USER', payload: user });
  } catch (err) {
    yield put({ type: 'SET_ERROR', payload: err.message });
  }
}

// WHEN TO USE:
// - Simple async → Thunk
// - Complex flows (retry, cancel, polling) → Saga
// - Most apps → Thunk (simpler)
```

---

## Question 4: How would you handle real-time updates with Redux?

```typescript
// SCENARIO: Live notifications, real-time data

// Solution with Thunk + WebSocket
const setupWebSocket = () => (dispatch) => {
  const ws = new WebSocket('wss://api.example.com/notifications');

  ws.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: notification
    });
  };

  return ws; // Return for cleanup
};

// In component:
function NotificationCenter() {
  const dispatch = useDispatch();

  useEffect(() => {
    const ws = dispatch(setupWebSocket());

    return () => {
      ws.close();
    };
  }, [dispatch]);

  const notifications = useSelector(state => state.notifications);

  return (
    <div>
      {notifications.map(n => (
        <div key={n.id}>{n.message}</div>
      ))}
    </div>
  );
}
```

---

## Question 5: Redux vs Zustand - Which would you choose and why?

```typescript
// INTERVIEW ANSWER FRAMEWORK:

// "It depends on the project size and team expertise."

// I would choose ZUSTAND if:
// 1. Small to medium app
// 2. Team prefers simplicity
// 3. No need for DevTools
// 4. Want minimal boilerplate
// Example: "I'd use Zustand for a personal project or startup"

// I would choose REDUX if:
// 1. Large, complex app
// 2. Multiple developers
// 3. Need time-travel debugging
// 4. Heavy async flows
// Example: "Redux for enterprise app with 20+ developers"

// I have used BOTH in production:
// - Zustand for: dashboard, small features, simple state
// - Redux for: monolithic backend-heavy app, complex state flows
```

---

# SUMMARY: State Management Mastery Checklist

✅ **Context API:**
- [ ] Know when to use Context vs Redux
- [ ] Can implement useContext with useReducer
- [ ] Understand context re-render issues
- [ ] Know how to split contexts for optimization

✅ **Redux:**
- [ ] Understand action → reducer → store flow
- [ ] Know Redux Toolkit (modern approach)
- [ ] Can use createSlice and createAsyncThunk
- [ ] Understand selectors and memoization
- [ ] Know async handling with Thunk

✅ **Zustand:**
- [ ] Know basic Zustand store creation
- [ ] Can use persist middleware
- [ ] Understand when to choose Zustand vs Redux
- [ ] Know Zustand selector optimization

✅ **Interview:**
- [ ] Can compare Context, Redux, Zustand
- [ ] Can explain data flow
- [ ] Can handle async operations
- [ ] Know performance optimization techniques

---

**Master state management and half your interview is won!**
