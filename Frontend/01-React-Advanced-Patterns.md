# React Advanced Patterns & Hooks Deep Dive
## Complete Interview Guide with Real Examples & Solutions

---

## TABLE OF CONTENTS
1. Hooks Deep Dive (useState, useEffect, useContext, useReducer, Custom)
2. Context API & State Management
3. Performance Optimization (React.memo, useMemo, useCallback)
4. Common Interview Questions
5. Real-World Code Examples
6. Step-by-Step Problem Solutions

---

# PART 1: HOOKS DEEP DIVE

## 1.1 REACT.USESTATE - Advanced Concepts

### What is useState?
useState is a React Hook that lets functional components have state. When state changes, React re-renders the component.

### Basic Signature
```javascript
const [state, setState] = useState(initialValue);
```

### Interview Question 1: What happens when setState is called?

**Answer Breakdown:**
```
1. React schedules a re-render
2. React batches multiple setState calls (in event handlers)
3. React's reconciliation algorithm runs (diff algorithm)
4. Only affected components re-render
5. Browser paints the new DOM
```

### Deep Dive Example 1: Batch Updates

```javascript
// ❌ WHAT INTERVIEWER MIGHT ASK
// What will the console log show? How many re-renders?
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    console.log('Before setState:', count);
    setCount(count + 1);
    console.log('After setState:', count);  // Still 0!
    setCount(count + 2);
    console.log('Second setState:', count); // Still 0!
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
}

// EXPLANATION:
// - setState is ASYNCHRONOUS
// - Both setCount calls are BATCHED (React 18+ automatic batching)
// - Final state: 1 (count + 1, but second call uses same stale count value)
// - Console logs show OLD count because setState hasn't updated yet
// - Re-renders: 1 (both updates batched together)
```

**Step-by-Step Solution:**
1. **Synchronous console logs execute first** - they see the old state
2. **setState is queued** - not executed immediately
3. **Event handler finishes** - then React applies state updates
4. **One re-render happens** - with the final state value (1)
5. **After render** - new state is available

---

### Deep Dive Example 2: Lazy Initialization

```javascript
// ❌ INEFFICIENT - Runs on EVERY re-render!
function Component() {
  const [state, setState] = useState(expensiveCalculation());
  // expensiveCalculation() is called every time component re-renders
}

// ✅ CORRECT - Runs ONLY on first mount
function Component() {
  const [state, setState] = useState(() => expensiveCalculation());
  // expensiveCalculation() is called ONLY once, on mount
}

// INTERVIEW QUESTION: Why use lazy initialization?
// ANSWER:
// 1. Expensive calculations only run once
// 2. Better performance for large computations
// 3. Useful when initial state depends on props
```

**Real World Example:**
```javascript
function UserProfile({ userId }) {
  // Lazy init: fetch user data only once when component mounts
  const [user, setUser] = useState(() => {
    return fetchUserFromCache(userId) || { loading: true };
  });

  useEffect(() => {
    if (user.loading) {
      fetchUserFromAPI(userId).then(setUser);
    }
  }, [user.loading, userId]);

  return <div>{user.name}</div>;
}
```

---

### Deep Dive Example 3: Multiple State Batching

```javascript
// INTERVIEW: Predict the output and number of re-renders
function Form() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setName('');        // State update 1
    setEmail('');       // State update 2
    setSubmitted(true); // State update 3
    
    // Await something
    await fetch('/api/submit');
    
    setSubmitted(false); // State update 4
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

// ANSWER:
// Re-renders: 2
// 1st Re-render: After async function completes
//   - Updates 1, 2, 3 are batched together (same event handler)
//   - Component renders with name='', email='', submitted=true
// 2nd Re-render: After fetch completes
//   - Update 4 happens (submitted=false)
//   - Component renders with submitted=false
```

---

## 1.2 REACT.USEEFFECT - Advanced Concepts

### Signature
```javascript
useEffect(() => {
  // Effect code
  
  return () => {
    // Cleanup (optional)
  };
}, [dependencies]); // Dependency array
```

### Core Concepts

**Interview Question: What are the differences between these useEffect calls?**

```javascript
// 1️⃣ NO DEPENDENCY ARRAY
useEffect(() => {
  console.log('Runs after EVERY render');
});

// 2️⃣ EMPTY DEPENDENCY ARRAY
useEffect(() => {
  console.log('Runs ONCE after initial mount');
}, []);

// 3️⃣ WITH DEPENDENCIES
useEffect(() => {
  console.log('Runs when any dependency changes');
}, [dependency1, dependency2]);

// 4️⃣ MULTIPLE useEffect CALLS
useEffect(() => {
  console.log('Effect 1');
}, [dep1]);

useEffect(() => {
  console.log('Effect 2');
}, [dep2]);
// Both run independently
```

---

### Deep Dive Example 1: Cleanup Function

```javascript
// ❌ MEMORY LEAK - No cleanup
function ChatRoom({ roomId }) {
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();
    // Memory leak! Connection never closes
  }, [roomId]);

  return <div>Chat...</div>;
}

// ✅ CORRECT - With cleanup
function ChatRoom({ roomId }) {
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();
    
    // Cleanup function
    return () => {
      connection.disconnect();
    };
  }, [roomId]);

  return <div>Chat...</div>;
}

// DETAILED EXPLANATION:
// 1. Component mounts → connection.connect() called
// 2. roomId changes → cleanup runs (disconnect) → new effect runs (reconnect)
// 3. Component unmounts → cleanup runs (disconnect)
```

---

### Deep Dive Example 2: Race Conditions

```javascript
// ❌ BUGGY - Race condition! 
function SearchResults({ query }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetchResults(query).then(data => {
      if (!cancelled) {  // Only update if effect wasn't cleaned up
        setResults(data);
      }
    });

    return () => {
      cancelled = true;  // Mark as cancelled when component unmounts or query changes
    };
  }, [query]);

  return <div>{results.map(r => <div key={r.id}>{r.name}</div>)}</div>;
}

// STEP-BY-STEP EXPLANATION:
// Scenario: User types "react" then immediately types "vue"
// 
// Timeline:
// 1. query="r" → fetch "r" starts
// 2. query="re" → cleanup runs (cancelled=true), fetch "re" starts
// 3. query="rea" → cleanup runs (cancelled=true), fetch "rea" starts
// 4. "r" API response arrives first (slowest) → but cancelled=true, so IGNORED
// 5. "rea" API response arrives → cancelled=false, results UPDATE
// 
// WITHOUT the cancelled flag:
// - "r" response would overwrite "rea" response (wrong results!)
```

---

### Deep Dive Example 3: Infinite Loop Pitfall

```javascript
// ❌ INFINITE LOOP - Missing dependency
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
    // Missing [userId] dependency!
    // Every render → effect runs → setUser → re-render → effect runs again
  });

  return <div>{user?.name}</div>;
}

// ✅ CORRECT
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]); // Include userId!
}

// ✅ ALSO CORRECT - If userId doesn't change
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, []); // Empty array = run once on mount
}
```

---

### Deep Dive Example 4: Order of Execution

```javascript
function Component() {
  console.log('Render');

  useEffect(() => {
    console.log('Effect 1');
    return () => console.log('Cleanup 1');
  }, []);

  useEffect(() => {
    console.log('Effect 2');
    return () => console.log('Cleanup 2');
  }, []);

  return <div>Hello</div>;
}

// FIRST MOUNT OUTPUT:
// Render
// Effect 1
// Effect 2

// UNMOUNT OUTPUT:
// Cleanup 2
// Cleanup 1
// (Reverse order!)

// WHY? React runs cleanup in reverse order (stack-like behavior)
```

---

## 1.3 REACT.USECALLBACK - Advanced Concepts

### Signature
```javascript
const memoizedCallback = useCallback(
  () => {
    // function code
  },
  [dependencies] // re-create function if dependencies change
);
```

### When to Use useCallback

```javascript
// ❌ UNNECESSARY - Simple function, no dependencies
function Counter() {
  const [count, setCount] = useState(0);

  const increment = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  return <button onClick={increment}>Count: {count}</button>;
}
// Why unnecessary? This component doesn't pass increment to child components

// ✅ NECESSARY - Function passed to optimized child
function Parent() {
  const [count, setCount] = useState(0);

  const handleAddTodo = useCallback((text) => {
    addTodo(text);
  }, []);

  // TodoList is memoized and depends on handleAddTodo
  return <TodoList onAdd={handleAddTodo} />;
}

const TodoList = React.memo(({ onAdd }) => {
  return <button onClick={() => onAdd('New')}>Add</button>;
});
// Without useCallback, parent re-render creates new function
// TodoList sees new prop, re-renders (React.memo comparison fails)
// With useCallback, function reference stays same, TodoList doesn't re-render
```

---

### Deep Dive Example 1: Function Reference Equality

```javascript
// INTERVIEW QUESTION: How many times does Child re-render?

function Parent() {
  const [count, setCount] = useState(0);

  // ❌ WITHOUT useCallback
  const handleClick = () => {
    console.log('Clicked');
  };

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Parent Count: {count}
      </button>
      <Child onClick={handleClick} />
    </div>
  );
}

const Child = React.memo(({ onClick }) => {
  console.log('Child rendered');
  return <button onClick={onClick}>Child</button>;
});

// ANSWER: Child re-renders EVERY TIME parent re-renders
// WHY? New handleClick function is created each render
// React.memo sees new prop (function reference), re-renders Child

// ✅ WITH useCallback
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Parent Count: {count}
      </button>
      <Child onClick={handleClick} />
    </div>
  );
}

// ANSWER: Child renders ONLY once (when mounted)
// WHY? handleClick reference never changes (empty dependency)
// React.memo sees same prop, skips re-render
```

---

### Deep Dive Example 2: useCallback with Dependencies

```javascript
// INTERVIEW: Predict when Child re-renders

function Parent({ userId }) {
  const [search, setSearch] = useState('');

  const handleSearch = useCallback((query) => {
    fetchResults(userId, query);
  }, [userId]); // Depends on userId!

  return (
    <div>
      <input onChange={(e) => setSearch(e.target.value)} />
      <Child onSearch={handleSearch} />
    </div>
  );
}

const Child = React.memo(({ onSearch }) => {
  console.log('Child rendered');
  return <button onClick={() => onSearch('test')}>Search</button>;
});

// ANSWER:
// 1st render: Child renders once
// 2nd render: search state changes → Parent re-renders
//   - handleSearch reference SAME → Child does NOT re-render
// 3rd scenario: userId prop changes → Parent re-renders
//   - handleSearch dependency changed → NEW function created
//   - Child sees new prop → Child RE-RENDERS

// KEY POINT: useCallback re-creates function when dependency changes
```

---

## 1.4 REACT.USEMEMO - Advanced Concepts

### Signature
```javascript
const memoizedValue = useMemo(() => {
  return expensiveCalculation(a, b);
}, [a, b]);
```

### When to Use useMemo

```javascript
// ❌ UNNECESSARY - Simple value
function Component() {
  const userName = useMemo(() => {
    return user.firstName + ' ' + user.lastName;
  }, [user]);
  // Use useMemo only for EXPENSIVE calculations
}

// ✅ NECESSARY - Expensive calculation
function Component({ items }) {
  const sortedItems = useMemo(() => {
    console.log('Sorting items...');
    return items.sort((a, b) => a.value - b.value);
  }, [items]);

  return <div>{sortedItems.map(item => <div key={item.id}>{item.name}</div>)}</div>;
}

// WITHOUT useMemo: items sorted on every render (wasteful)
// WITH useMemo: items sorted only when items array changes
```

---

### Deep Dive Example 1: Preventing Child Re-renders

```javascript
// INTERVIEW: How many times does Child re-render?

function Parent() {
  const [count, setCount] = useState(0);

  // ❌ WITHOUT useMemo
  const theme = {
    color: 'blue',
    fontSize: 16
  };

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <Child theme={theme} />
    </div>
  );
}

const Child = React.memo(({ theme }) => {
  console.log('Child rendered');
  return <div style={theme}>Hello</div>;
});

// ANSWER: Child re-renders EVERY TIME
// WHY? New theme object created each render (different reference)
// React.memo does shallow comparison of props
// { color: 'blue' } !== { color: 'blue' } (different objects!)

// ✅ WITH useMemo
function Parent() {
  const [count, setCount] = useState(0);

  const theme = useMemo(() => ({
    color: 'blue',
    fontSize: 16
  }), []); // Never changes

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <Child theme={theme} />
    </div>
  );
}

// ANSWER: Child renders ONLY once
// WHY? theme object reference never changes
// React.memo sees same prop, skips re-render
```

---

### Deep Dive Example 2: Expensive Calculation

```javascript
// Real-world example: Filtering and sorting large dataset

function UserList({ users, sortBy, filterRole }) {
  // ❌ WITHOUT useMemo
  const filtered = users.filter(u => u.role === filterRole);
  const sorted = filtered.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return a.date - b.date;
  });

  return (
    <div>
      {sorted.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}

// PROBLEM: Every render re-filters and re-sorts 10,000 users!

// ✅ WITH useMemo
function UserList({ users, sortBy, filterRole }) {
  const sorted = useMemo(() => {
    console.time('filter-sort');
    
    const filtered = users.filter(u => u.role === filterRole);
    const result = filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return a.date - b.date;
    });
    
    console.timeEnd('filter-sort');
    return result;
  }, [users, sortBy, filterRole]);

  return (
    <div>
      {sorted.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}

// NOW: Calculation only runs when users, sortBy, or filterRole changes
// Performance improvement: 100ms → 10ms (on re-renders with other state changes)
```

---

## 1.5 REACT.USECONTEXT - Advanced Concepts

### Signature
```javascript
const value = useContext(SomeContext);
```

### Basic Pattern

```javascript
// Step 1: Create context
const ThemeContext = React.createContext('light');

// Step 2: Create provider
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Step 3: Use in component
function MyComponent() {
  const { theme, setTheme } = useContext(ThemeContext);
  
  return (
    <div style={{ background: theme === 'dark' ? '#000' : '#fff' }}>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        Toggle Theme
      </button>
    </div>
  );
}

// Step 4: Wrap app
function App() {
  return (
    <ThemeProvider>
      <MyComponent />
    </ThemeProvider>
  );
}
```

---

### Deep Dive Example 1: Context Causes Unnecessary Re-renders

```javascript
// ❌ PROBLEM: All consumers re-render when ANY value changes

const ThemeContext = React.createContext();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');

  const value = {
    theme,
    setTheme,
    language,
    setLanguage
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemeButton() {
  const { theme, setTheme } = useContext(ThemeContext);
  console.log('ThemeButton rendered');
  
  return <button onClick={() => setTheme('dark')}>Change Theme</button>;
}

function LanguageSelect() {
  const { language, setLanguage } = useContext(ThemeContext);
  console.log('LanguageSelect rendered');
  
  return <select onChange={(e) => setLanguage(e.target.value)}>{/* options */}</select>;
}

// PROBLEM:
// 1. User clicks ThemeButton
// 2. theme state changes
// 3. value object changes (new reference)
// 4. ThemeContext.Provider re-renders
// 5. BOTH ThemeButton AND LanguageSelect re-render
// 6. LanguageSelect didn't need to re-render!

// ✅ SOLUTION 1: Split contexts
const ThemeContext = React.createContext();
const LanguageContext = React.createContext();

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

// NOW: Theme change only triggers ThemeButton re-render

// ✅ SOLUTION 2: Memoize provider value
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');

  const value = useMemo(() => ({
    theme,
    setTheme,
    language,
    setLanguage
  }), [theme, language]); // Still re-renders both on any change

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// NOTE: useMemo helps only if value structure is different
// For context, usually need to split contexts instead
```

---

### Deep Dive Example 2: Custom useContext Hook

```javascript
// INTERVIEW: Create a custom hook that prevents undefined context errors

// ❌ BASIC (can crash if context not provided)
function useTheme() {
  const context = useContext(ThemeContext);
  return context;
}

// ✅ SAFE (with error handling)
function useTheme() {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  
  return context;
}

// USAGE:
function MyComponent() {
  const { theme, setTheme } = useTheme();
  // If used outside ThemeProvider, throws helpful error
  
  return <div style={{ background: theme }}>Hello</div>;
}
```

---

## 1.6 REACT.USEREDUCER - Advanced Concepts

### Signature
```javascript
const [state, dispatch] = useReducer(reducer, initialState);
```

### When to Use useReducer vs useState

```javascript
// ✅ useState: Simple state updates
function Toggle() {
  const [isOn, setIsOn] = useState(false);
  return <button onClick={() => setIsOn(!isOn)}>Toggle</button>;
}

// ✅ useReducer: Complex state logic
function TodoApp() {
  const initialState = { todos: [], filter: 'all' };

  function reducer(state, action) {
    switch (action.type) {
      case 'ADD_TODO':
        return { ...state, todos: [...state.todos, action.payload] };
      case 'REMOVE_TODO':
        return { ...state, todos: state.todos.filter(t => t.id !== action.payload) };
      case 'SET_FILTER':
        return { ...state, filter: action.payload };
      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div>
      <button onClick={() => dispatch({ type: 'ADD_TODO', payload: { id: 1, text: 'Learn React' } })}>
        Add Todo
      </button>
    </div>
  );
}
```

---

### Deep Dive Example 1: Complex State Management

```javascript
// Real-world: Async data fetching with useReducer

const initialState = {
  data: null,
  loading: true,
  error: null
};

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload, error: null };
    
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload, data: null };
    
    default:
      return state;
  }
}

function DataFetcher({ id }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'FETCH_START' });
    
    fetchData(id)
      .then(data => dispatch({ type: 'FETCH_SUCCESS', payload: data }))
      .catch(err => dispatch({ type: 'FETCH_ERROR', payload: err.message }));
  }, [id]);

  if (state.loading) return <div>Loading...</div>;
  if (state.error) return <div>Error: {state.error}</div>;
  
  return <div>{state.data}</div>;
}

// ADVANTAGE: Single dispatch instead of setState, setError, setLoading
// Easier to understand state transitions
```

---

## 1.7 CUSTOM HOOKS - Advanced Concepts

### Pattern 1: useLocalStorage

```javascript
// INTERVIEW: Implement a custom hook for localStorage

function useLocalStorage(key, initialValue) {
  // Get stored value or use initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // Update localStorage and state
  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// USAGE:
function MyComponent() {
  const [name, setName] = useLocalStorage('userName', 'Guest');

  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <p>Saved: {name}</p>
    </div>
  );
}

// STEP-BY-STEP:
// 1. Lazy init reads localStorage on mount
// 2. setValue updates both state and localStorage
// 3. Even after page refresh, value persists
```

---

### Pattern 2: useFetch

```javascript
// INTERVIEW: Implement a custom hook for API calls

function useFetch(url, options = {}) {
  const [state, dispatch] = useReducer(
    (state, action) => ({ ...state, ...action }),
    {
      data: null,
      loading: true,
      error: null
    }
  );

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    (async () => {
      try {
        const response = await fetch(url, {
          ...options,
          signal: abortController.signal
        });
        
        if (!response.ok) throw new Error(response.statusText);
        
        const data = await response.json();
        
        if (isMounted) {
          dispatch({ data, loading: false, error: null });
        }
      } catch (error) {
        if (isMounted) {
          dispatch({ loading: false, error: error.message, data: null });
        }
      }
    })();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [url, options]);

  return state;
}

// USAGE:
function UserProfile({ userId }) {
  const { data: user, loading, error } = useFetch(`/api/users/${userId}`);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{user.name}</div>;
}

// FEATURES:
// 1. Handles loading, error, and success states
// 2. Prevents state updates if unmounted (isMounted flag)
// 3. Cancels fetch if component unmounts (AbortController)
// 4. Re-fetches when URL changes
```

---

### Pattern 3: useDebounce

```javascript
// INTERVIEW: Implement debouncing for search input

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up timer
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up timer if value changes before delay ends
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// USAGE:
function SearchUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Wait 500ms

  useEffect(() => {
    if (debouncedSearchTerm) {
      // Only search after user stops typing
      searchAPI(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <input 
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search users..."
    />
  );
}

// STEP-BY-STEP:
// 1. User types 'r' → timer starts (500ms)
// 2. User types 'e' → timer resets (old timer cleared)
// 3. User types 'a' → timer resets again
// 4. User stops typing → 500ms pass → debouncedValue updates
// 5. useEffect runs with debouncedSearchTerm
// 6. API call executes once (not 3 times!)
```

---

### Pattern 4: useAsync

```javascript
// INTERVIEW: Implement a generic async hook

function useAsync(asyncFunction, immediate = true) {
  const [status, setStatus] = useState('idle');
  const [value, setValue] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setStatus('pending');
    setValue(null);
    setError(null);
    
    try {
      const response = await asyncFunction();
      setValue(response);
      setStatus('success');
      return response;
    } catch (error) {
      setError(error);
      setStatus('error');
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, status, value, error };
}

// USAGE:
function UserProfile({ userId }) {
  const { execute, status, value: user, error } = useAsync(
    () => fetch(`/api/users/${userId}`).then(r => r.json()),
    true // Run immediately on mount
  );

  const handleRefresh = () => execute();

  if (status === 'pending') return <div>Loading...</div>;
  if (status === 'error') return <div>Error: {error.message}</div>;
  if (status === 'success') return <div>{user.name} <button onClick={handleRefresh}>Refresh</button></div>;
  
  return null;
}
```

---

### Pattern 5: useToggle

```javascript
// INTERVIEW: Implement a simple toggle hook

function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(v => !v);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return [value, toggle, { setTrue, setFalse }];
}

// USAGE:
function Modal() {
  const [isOpen, toggle, { setTrue, setFalse }] = useToggle(false);

  return (
    <>
      <button onClick={toggle}>Open Modal</button>
      {isOpen && (
        <div>
          <h1>Modal</h1>
          <button onClick={setFalse}>Close</button>
        </div>
      )}
    </>
  );
}
```

---

# PART 2: REACT HOOKS RULES

## Critical Rules Every Developer Must Know

### Rule 1: Only Call Hooks at Top Level

```javascript
// ❌ WRONG - Inside conditional
function Component({ isLoggedIn }) {
  if (isLoggedIn) {
    const [user, setUser] = useState(null); // ERROR!
  }
}

// ❌ WRONG - Inside loop
function Component() {
  for (let i = 0; i < 10; i++) {
    const [value, setValue] = useState(0); // ERROR!
  }
}

// ✅ CORRECT - Top level
function Component({ isLoggedIn }) {
  const [user, setUser] = useState(null);
  
  if (isLoggedIn) {
    // Use hook state, don't call hook
  }
}

// WHY THIS RULE?
// React maintains a linked list of hooks for each component
// Hooks must be called in same order every render
// If you call hook conditionally, order changes, React can't track state
```

---

### Rule 2: Only Call Hooks from React Functions

```javascript
// ❌ WRONG - Regular JavaScript function
function calculateTotal(items) {
  const [total, setTotal] = useState(0); // ERROR!
  return total;
}

// ❌ WRONG - Class component
class MyComponent extends React.Component {
  render() {
    const [value, setValue] = useState(0); // ERROR!
  }
}

// ✅ CORRECT - Functional component
function MyComponent() {
  const [value, setValue] = useState(0);
  return <div>{value}</div>;
}

// ✅ CORRECT - Custom hook
function useCustom() {
  const [value, setValue] = useState(0);
  return value;
}

// ✅ CORRECT - In custom hook called from functional component
function MyComponent() {
  const value = useCustom();
  return <div>{value}</div>;
}
```

---

# PART 3: PERFORMANCE OPTIMIZATION

## 3.1 REACT.MEMO - Preventing Unnecessary Re-renders

### Basic Usage

```javascript
// ❌ WITHOUT React.memo - Child re-renders when Parent re-renders
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <Child name="John" />
    </div>
  );
}

function Child({ name }) {
  console.log('Child rendered');
  return <div>Hello {name}</div>;
}

// PROBLEM: Child logs "Child rendered" every time count changes

// ✅ WITH React.memo - Child only re-renders if props change
const Child = React.memo(function Child({ name }) {
  console.log('Child rendered');
  return <div>Hello {name}</div>;
});

// NOW: Child only logs "Child rendered" on first mount
// When Parent re-renders, Child props are same, so Child doesn't re-render
```

---

### Deep Dive: Custom Comparison

```javascript
// Sometimes default shallow comparison isn't enough

// ❌ PROBLEM: Objects compared by reference, not content
const User = React.memo(({ user }) => {
  console.log('User rendered');
  return <div>{user.name}</div>;
});

function Parent() {
  const [count, setCount] = useState(0);

  const user = { name: 'John', age: 30 }; // New object every render!

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <User user={user} /> {/* Always sees new user object */}
    </div>
  );
}

// Child logs "User rendered" every time Parent re-renders
// Even though user.name hasn't changed!

// ✅ SOLUTION 1: Custom comparison function
const User = React.memo(
  ({ user }) => {
    console.log('User rendered');
    return <div>{user.name}</div>;
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (DON'T re-render)
    // Return false if props are different (DO re-render)
    return prevProps.user.name === nextProps.user.name &&
           prevProps.user.age === nextProps.user.age;
  }
);

// ✅ SOLUTION 2: Use useMemo in Parent
function Parent() {
  const [count, setCount] = useState(0);

  const user = useMemo(() => ({ name: 'John', age: 30 }), []);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <User user={user} /> {/* user reference never changes */}
    </div>
  );
}
```

---

## 3.2 CODE SPLITTING & LAZY LOADING

### React.lazy & Suspense

```javascript
// ❌ BEFORE: All components loaded upfront
import Dashboard from './Dashboard';
import Settings from './Settings';
import Profile from './Profile';

function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

// Bundle size: 500KB (all code loaded on page load)

// ✅ AFTER: Components loaded on demand
const Dashboard = React.lazy(() => import('./Dashboard'));
const Settings = React.lazy(() => import('./Settings'));
const Profile = React.lazy(() => import('./Profile'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}

// Bundle size: 100KB (main), 100KB (Dashboard), 100KB (Settings), etc.
// Initial load: 100KB + 100KB (route) only
// Performance improvement: 2x faster initial load

// STEP-BY-STEP:
// 1. User loads app → Dashboard, Settings, Profile bundles NOT loaded
// 2. User navigates to /settings → Settings bundle loads
// 3. While loading → Suspense fallback shows "Loading..."
// 4. Bundle downloaded → Settings component renders
```

---

### Lazy Load Lists with Virtual Scrolling

```javascript
// INTERVIEW: How to render 10,000 list items efficiently?

// ❌ INEFFICIENT - Render all 10,000 items
function UserList({ users }) {
  return (
    <div>
      {users.map(user => (
        <UserItem key={user.id} user={user} />
      ))}
    </div>
  );
}

// ✅ EFFICIENT - Virtual scrolling (only render visible items)
import { FixedSizeList } from 'react-window';

function UserList({ users }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <UserItem user={users[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={users.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// EXPLANATION:
// Without virtual scrolling: 10,000 DOM nodes in memory
// With virtual scrolling: Only 15-20 visible DOM nodes at a time
// Performance: Smooth scrolling, fast rendering
```

---

## 3.3 BUNDLE SIZE OPTIMIZATION

### Identifying Large Dependencies

```javascript
// INTERVIEW: How to reduce bundle size?

// Tool: webpack-bundle-analyzer
// Install: npm install --save-dev webpack-bundle-analyzer

// In webpack config:
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin()
  ]
};

// Run build → Opens visual map of bundle
// Identify large libraries:
// - moment.js (67KB) → Replace with date-fns (13KB)
// - lodash (71KB) → Use lodash-es with tree-shaking (only needed functions)
// - axios (14KB) → Use fetch API
```

---

### Example: Replace moment with date-fns

```javascript
// ❌ LARGE: moment.js adds 67KB to bundle
import moment from 'moment';

function DateDisplay({ date }) {
  return <div>{moment(date).format('YYYY-MM-DD')}</div>;
}

// ✅ SMALL: date-fns is only 13KB and tree-shakeable
import { format } from 'date-fns';

function DateDisplay({ date }) {
  return <div>{format(date, 'yyyy-MM-dd')}</div>;
}

// Bundle size reduction: 67KB → 13KB (54KB saved!)
```

---

## 3.4 IMAGE OPTIMIZATION

### Lazy Load Images

```javascript
// ❌ Load all images upfront
function ImageGallery({ images }) {
  return (
    <div>
      {images.map(img => (
        <img key={img.id} src={img.url} alt={img.title} />
      ))}
    </div>
  );
}

// ✅ Lazy load images with Intersection Observer
function ImageGallery({ images }) {
  return (
    <div>
      {images.map(img => (
        <LazyImage key={img.id} src={img.url} alt={img.title} />
      ))}
    </div>
  );
}

function LazyImage({ src, alt }) {
  const [imageSrc, setImageSrc] = useState(null);
  const imageRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.unobserve(entry.target);
        }
      });
    });

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return <img ref={imageRef} src={imageSrc} alt={alt} />;
}

// BENEFIT: Images only load when they come into view
// Page load time: 5s → 1s
```

---

# PART 4: COMMON INTERVIEW QUESTIONS & ANSWERS

## Question 1: What's the difference between setState and state hooks?

```javascript
// CLASS COMPONENT (setState)
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  render() {
    return (
      <button onClick={() => this.setState({ count: this.state.count + 1 })}>
        Count: {this.state.count}
      </button>
    );
  }
}

// FUNCTIONAL COMPONENT (useState hook)
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}

// KEY DIFFERENCES:
// 1. setState merges objects, useState replaces state
// 2. useState easier to test (independent of this)
// 3. useState enables code reuse with custom hooks
// 4. useState cleaner syntax (no this binding)
```

---

## Question 2: What is the virtual DOM and how does it work?

```javascript
// ANSWER BREAKDOWN:

// 1. WHAT IS VIRTUAL DOM?
// - JavaScript representation of real DOM
// - Lightweight copy in memory
// - Not rendered to browser

// 2. HOW DOES IT WORK?
// Step 1: Render phase
function MyComponent() {
  const [count, setCount] = useState(0);
  // React creates virtual DOM here (JavaScript object)
  return <div>Count: {count}</div>;
}
// Virtual DOM: { type: 'div', props: {}, children: ['Count: 0'] }

// Step 2: Reconciliation
// React compares old virtual DOM with new virtual DOM
// Old: <div>Count: 0</div>
// New: <div>Count: 1</div>
// Difference: Only text content changed

// Step 3: Update phase
// React updates only the changed part
// Before: DOM node "Count: 0"
// After: DOM node "Count: 1"
// (Didn't re-create the entire div!)

// BENEFIT: Batching updates and minimal DOM mutations = better performance
```

---

## Question 3: Explain the React fiber architecture

```javascript
// ANSWER BREAKDOWN (5 min explanation):

// OLD ARCHITECTURE (React 15):
// Reconciliation was synchronous and non-interruptible
// If reconciliation took 16ms (longer than frame time):
// - Animation stuttered
// - User input blocked

// NEW FIBER ARCHITECTURE (React 16+):
// 1. Breaks work into small units called "fibers"
// 2. Each fiber represents a component or DOM node
// 3. Work can be paused, resumed, or prioritized

// EXAMPLE:
function App() {
  return (
    <div>
      <Header />
      <Sidebar />
      <MainContent /> {/* Heavy component, takes 10ms to render */}
    </div>
  );
}

// WITHOUT FIBER (React 15):
// All or nothing - either wait 20ms for MainContent or show stuttering

// WITH FIBER (React 16+):
// 1. Render Header (1ms)
// 2. Pause to handle user input
// 3. Resume, render Sidebar (1ms)
// 4. Pause to handle animation frame
// 5. Resume, render MainContent (10ms)
// Result: Smooth UI, responsive to input

// KEY CONCEPTS:
// - Work loop: Processes one fiber at a time
// - Scheduler: Decides which fiber to work on next (based on priority)
// - Reconciliation: Creates update plan
// - Commit: Actually applies updates to DOM
```

---

## Question 4: When does React NOT batch state updates?

```javascript
// INTERVIEW: Predict console output

function Form() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // ❌ NOT BATCHED - setTimeout
  const handleSubmit = async (e) => {
    setName('John');
    console.log('1:', name); // Still ''

    setTimeout(() => {
      setEmail('john@example.com');
      console.log('2:', email); // ??? Still ''
    }, 0);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

// ANSWER:
// Console output:
// 1: 
// 2: 

// RE-RENDERS: 2 separate renders
// 1. After setName (outside setTimeout)
// 2. After setEmail (inside setTimeout)

// WHY NOT BATCHED?
// In React 17 and earlier: setTimeout breaks batching
// setTimeout is asynchronous, outside React's event system
// React 18 auto-batching fixed this:
// In React 18: Both updates are batched (1 re-render)

// REACT 18 BEHAVIOR:
// Re-renders: 1 (both updates batched)
// Console output:
// 1: 
// (no '2' until after first render completes)
```

---

## Question 5: How do you optimize a list component?

```javascript
// INTERVIEW: Optimize this component to handle 10,000 items

// ❌ UNOPTIMIZED
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}

// PROBLEMS:
// 1. Re-renders entire list when one item changes
// 2. 10,000 DOM nodes in memory
// 3. Each item re-renders with list

// ✅ OPTIMIZED - Multiple strategies

// Strategy 1: Memoize each item
const TodoItem = React.memo(({ todo, onDelete }) => {
  return <li>{todo.text} <button onClick={() => onDelete(todo.id)}>Delete</button></li>;
});

function TodoList({ todos, onDeleteTodo }) {
  return (
    <ul>
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} onDelete={onDeleteTodo} />
      ))}
    </ul>
  );
}

// Strategy 2: Virtual scrolling (for 10,000 items)
import { FixedSizeList } from 'react-window';

function TodoList({ todos, onDeleteTodo }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <TodoItem todo={todos[index]} onDelete={onDeleteTodo} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={todos.length}
      itemSize={35}
    >
      {Row}
    </FixedSizeList>
  );
}

// Strategy 3: Normalize state + memoization
// Store todos as { [id]: todo } instead of array
// Only re-render items that actually changed

const todoSlice = createSlice({
  name: 'todos',
  initialState: {}, // { '1': { id: 1, text: '...' } }
  reducers: {
    addTodo: (state, action) => {
      state[action.payload.id] = action.payload;
    },
    deleteTodo: (state, action) => {
      delete state[action.payload];
    }
  }
});

function TodoList() {
  const todos = useSelector(state => state.todos);
  
  return (
    <ul>
      {Object.values(todos).map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}

// RESULTS:
// - 10,000 items: 1s load time → 100ms
// - Only visible 20 items rendered: 10ms paint
// - Delete operation: 0 to many items instant
```

---

# PART 5: REAL-WORLD ADVANCED PATTERNS

## Pattern 1: Controlled vs Uncontrolled Components

```javascript
// CONTROLLED: React manages input value
function ControlledInput() {
  const [value, setValue] = useState('');

  return (
    <input 
      value={value} 
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

// UNCONTROLLED: DOM manages input value
function UncontrolledInput() {
  const inputRef = useRef();

  const handleSubmit = () => {
    console.log(inputRef.current.value);
  };

  return (
    <div>
      <input ref={inputRef} defaultValue="" />
      <button onClick={handleSubmit}>Get Value</button>
    </div>
  );
}

// WHEN TO USE:
// Controlled: Most cases (validation, formatting, conditional rendering)
// Uncontrolled: File inputs, integrating with non-React code
```

---

## Pattern 2: Render Props vs HOC vs Hooks

```javascript
// All three solve the same problem: Code reuse

// OPTION 1: Render Props
function MouseTracker() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    setPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div onMouseMove={handleMouseMove}>
      {/* Render prop: Function as child */}
      {(position) => (
        <p>Mouse position: {position.x}, {position.y}</p>
      )}
    </div>
  );
}

// OPTION 2: Higher-Order Component (HOC)
function withMouseTracker(Component) {
  return (props) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    return (
      <div onMouseMove={handleMouseMove}>
        <Component position={position} {...props} />
      </div>
    );
  };
}

function MyComponent({ position }) {
  return <p>Mouse: {position.x}, {position.y}</p>;
}

export default withMouseTracker(MyComponent);

// OPTION 3: Custom Hook (MODERN, PREFERRED)
function useMouseTracker() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return position;
}

function MyComponent() {
  const position = useMouseTracker();
  return <p>Mouse: {position.x}, {position.y}</p>;
}

// COMPARISON:
// Hooks: Cleaner, better composability, modern approach
// HOC: Can lead to wrapper hell, harder to debug
// Render Props: More flexible, but harder to read
```

---

## Pattern 3: Compound Components

```javascript
// PATTERN: Component that manages its state and children work together

// ❌ INFLEXIBLE
function Accordion({ items }) {
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.content}</p>
        </div>
      ))}
    </div>
  );
}

// ✅ FLEXIBLE: Compound Components
const AccordionContext = React.createContext();

function Accordion({ children }) {
  const [activeId, setActiveId] = useState(null);

  return (
    <AccordionContext.Provider value={{ activeId, setActiveId }}>
      <div>{children}</div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({ id, children }) {
  return (
    <div>
      {children}
    </div>
  );
}

function AccordionTrigger({ id, children }) {
  const { activeId, setActiveId } = useContext(AccordionContext);

  return (
    <button onClick={() => setActiveId(activeId === id ? null : id)}>
      {children}
    </button>
  );
}

function AccordionContent({ id, children }) {
  const { activeId } = useContext(AccordionContext);
  return activeId === id ? <div>{children}</div> : null;
}

// USAGE:
function App() {
  return (
    <Accordion>
      <AccordionItem id="1">
        <AccordionTrigger id="1">Section 1</AccordionTrigger>
        <AccordionContent id="1">Content 1</AccordionContent>
      </AccordionItem>
      
      <AccordionItem id="2">
        <AccordionTrigger id="2">Section 2</AccordionTrigger>
        <AccordionContent id="2">Content 2</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// BENEFITS:
// 1. Flexible markup structure
// 2. Clearer intent
// 3. Easy to customize
```

---

## Pattern 4: State Machine Pattern

```javascript
// Common scenario: Form with loading, success, error states

// ❌ UNMANAGEABLE: Multiple useState calls
function Form() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Can get into invalid states: isLoading=true AND isSuccess=true
}

// ✅ STATE MACHINE: Single source of truth
function formReducer(state, action) {
  switch (state) {
    case 'idle':
      if (action.type === 'SUBMIT') return 'submitting';
      break;
    
    case 'submitting':
      if (action.type === 'SUCCESS') return 'success';
      if (action.type === 'ERROR') return 'error';
      break;
    
    case 'success':
      if (action.type === 'RESET') return 'idle';
      break;
    
    case 'error':
      if (action.type === 'RETRY') return 'submitting';
      if (action.type === 'RESET') return 'idle';
      break;
  }
  return state;
}

function Form() {
  const [state, dispatch] = useReducer(formReducer, 'idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch({ type: 'SUBMIT' });
    
    try {
      await submitForm();
      dispatch({ type: 'SUCCESS' });
    } catch (err) {
      dispatch({ type: 'ERROR', payload: err });
    }
  };

  if (state === 'idle') return <button onClick={handleSubmit}>Submit</button>;
  if (state === 'submitting') return <div>Loading...</div>;
  if (state === 'success') return <div>Success! <button onClick={() => dispatch({ type: 'RESET' })}>Reset</button></div>;
  if (state === 'error') return <div>Error <button onClick={() => dispatch({ type: 'RETRY' })}>Retry</button></div>;
}

// BENEFITS:
// 1. No invalid state combinations
// 2. Predictable state transitions
// 3. Easier to test and debug
```

---

# SUMMARY: Interview Prep Checklist

✅ **Hooks Mastery:**
- [ ] Understand useState closure behavior
- [ ] Know useEffect cleanup and dependency rules
- [ ] Can explain useCallback vs useMemo tradeoffs
- [ ] Understand when useContext causes re-renders
- [ ] Can implement 3+ custom hooks

✅ **Performance:**
- [ ] Know React.memo, useMemo, useCallback differences
- [ ] Can identify performance bottlenecks
- [ ] Understand lazy loading and code splitting
- [ ] Know virtual scrolling for large lists

✅ **Patterns:**
- [ ] Controlled vs uncontrolled components
- [ ] Render props vs HOC vs hooks
- [ ] Compound components
- [ ] State machine patterns
- [ ] Custom hooks library (useFetch, useDebounce, etc.)

✅ **Common Issues:**
- [ ] Explain why setState is asynchronous
- [ ] Explain virtual DOM reconciliation
- [ ] Know rules of hooks
- [ ] Can prevent memory leaks

---

**Good luck with your interviews! Master these concepts and you'll be confident in any React conversation.**
