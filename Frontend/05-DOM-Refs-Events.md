# DOM, Refs & Events - Complete Interview Guide
## useRef, Direct DOM Access, Event Handling, Event Delegation

---

## TABLE OF CONTENTS
1. useRef Deep Dive
2. Refs vs State
3. Event Handling Patterns
4. DOM API & Browser Events
5. Common Interview Questions

---

# PART 1: USEREF DEEP DIVE

## What is useRef?

```typescript
// useRef = Access DOM directly OR persist value across renders

// Signature:
const ref = useRef<HTMLElement>(null);

// Has ONE property:
ref.current // The actual DOM element (or stored value)

// KEY DIFFERENCES from state:
// useState: Changes trigger re-render
// useRef: Changes do NOT trigger re-render
```

---

## Use Case 1: Focus Management

```typescript
// ❌ WITHOUT ref
function SearchInput() {
  const [, setSearchTerm] = useState('');

  const handleFocus = () => {
    // Can't focus without ref!
  };

  return (
    <div>
      <input onChange={(e) => setSearchTerm(e.target.value)} />
      <button onClick={handleFocus}>Focus Input</button>
    </div>
  );
}

// ✅ WITH ref
function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFocus = () => {
    inputRef.current?.focus(); // Direct DOM access
  };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = ''; // Direct DOM manipulation
      inputRef.current.focus();
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />
      <button onClick={handleFocus}>Focus</button>
      <button onClick={handleClear}>Clear</button>
    </div>
  );
}

// STEP-BY-STEP:
// 1. Create ref with useRef()
// 2. Attach to element with ref attribute
// 3. Access element with ref.current
// 4. DOM methods available: focus(), blur(), value, etc.
```

---

## Use Case 2: Managing Video/Audio Playback

```typescript
interface VideoPlayerProps {
  url: string;
}

function VideoPlayer({ url }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    videoRef.current?.play();
    setIsPlaying(true);
  };

  const handlePause = () => {
    videoRef.current?.pause();
    setIsPlaying(false);
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  };

  return (
    <div>
      <video
        ref={videoRef}
        src={url}
        style={{ width: '100%', maxWidth: '600px' }}
      />
      <div>
        <button onClick={handlePlay}>Play</button>
        <button onClick={handlePause}>Pause</button>
        <input
          type="range"
          min="0"
          max={videoRef.current?.duration || 0}
          onChange={(e) => handleSeek(parseFloat(e.target.value))}
        />
        <button onClick={handleMute}>Mute</button>
      </div>
    </div>
  );
}
```

---

## Use Case 3: Measuring DOM Elements

```typescript
// INTERVIEW: How to measure element width/height/position?

function ResizeObserverExample() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });
    });

    if (boxRef.current) {
      observer.observe(boxRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div
        ref={boxRef}
        style={{
          width: '100%',
          height: '200px',
          background: 'lightblue',
          resize: 'both',
          overflow: 'auto'
        }}
      />
      <p>Width: {Math.round(dimensions.width)}px</p>
      <p>Height: {Math.round(dimensions.height)}px</p>
    </div>
  );
}

// STEP-BY-STEP:
// 1. Create ResizeObserver to track element size
// 2. Observe the element in useEffect
// 3. Cleanup observer when component unmounts
// 4. Update state when size changes
```

---

## Use Case 4: Storing Mutable Values (Not DOM)

```typescript
// useRef can also store ANY mutable value that persists across renders

function Timer() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [count, setCount] = useState(0);

  const handleStart = () => {
    // Store interval ID in ref (not state!)
    intervalRef.current = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);
  };

  const handleStop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleReset = () => {
    handleStop();
    setCount(0);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleStart}>Start</button>
      <button onClick={handleStop}>Stop</button>
      <button onClick={handleReset}>Reset</button>
    </div>
  );
}

// WHY NOT useState?
// - Updating state would cause re-render (unnecessary)
// - Ref persists value without triggering re-render
// - Perfect for: interval IDs, timers, request IDs

// STEP-BY-STEP:
// 1. Create ref to store interval ID
// 2. setInterval returns ID → store in ref
// 3. Clear interval using stored ID
// 4. No state updates = no re-renders
```

---

## Use Case 5: Integration with Non-React Code

```typescript
// SCENARIO: Using jQuery plugin or external library in React

import $ from 'jquery';
import 'jquery-ui/jquery-ui.js';

function DatePickerComponent() {
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (datePickerRef.current) {
      // Initialize jQuery plugin
      $(datePickerRef.current).datepicker({
        onSelect: (date: string) => {
          setSelectedDate(date);
        }
      });
    }

    return () => {
      // Cleanup
      if (datePickerRef.current) {
        $(datePickerRef.current).datepicker('destroy');
      }
    };
  }, []);

  return (
    <div>
      <input
        ref={datePickerRef}
        type="text"
        value={selectedDate}
        readOnly
      />
    </div>
  );
}

// PATTERN:
// 1. Get ref to element
// 2. Initialize third-party code in useEffect
// 3. Cleanup in return function
```

---

# PART 2: REFS VS STATE - DECISION TREE

```typescript
// INTERVIEW: When to use ref vs state?

const decisionTree = {
  "Do you need the value to trigger re-render?": {
    YES: "Use useState",
    NO: "Continue..."
  },
  "Is it DOM-related (focus, value, scroll)?": {
    YES: "Use useRef (with controlled input if displaying)",
    NO: "Continue..."
  },
  "Is it a persistent mutable value (timer ID, etc)?": {
    YES: "Use useRef",
    NO: "Use useState"
  }
};

// PRACTICAL EXAMPLES:

// ✅ useState: Counter value (needs re-render)
const [count, setCount] = useState(0);

// ✅ useState: Form input (needs re-render for display)
const [email, setEmail] = useState('');

// ✅ useRef: Focus input (no re-render needed)
const inputRef = useRef<HTMLInputElement>(null);

// ✅ useRef: Store interval ID (no re-render needed)
const intervalRef = useRef<NodeJS.Timeout | null>(null);

// ✅ useRef + useState: Controlled input with additional DOM ops
const inputRef = useRef<HTMLInputElement>(null);
const [value, setValue] = useState('');

const handleClear = () => {
  setValue('');
  inputRef.current?.focus();
};
```

---

# PART 3: EVENT HANDLING PATTERNS

## Event Delegation

```typescript
// ❌ INEFFICIENT: Attach handler to every button
function TodoList({ todos }: { todos: Todo[] }) {
  const handleDelete = (id: number) => {
    // ...
  };

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          {todo.text}
          <button onClick={() => handleDelete(todo.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}

// ✅ EFFICIENT: Single handler on parent (event delegation)
function TodoList({ todos }: { todos: Todo[] }) {
  const listRef = useRef<HTMLUListElement>(null);

  const handleListClick = (e: React.MouseEvent<HTMLUListElement>) => {
    const target = e.target as HTMLElement;

    if (target.dataset.action === 'delete') {
      const todoId = parseInt(target.dataset.id || '0');
      // Handle delete
    }
  };

  return (
    <ul ref={listRef} onClick={handleListClick}>
      {todos.map(todo => (
        <li key={todo.id}>
          {todo.text}
          <button data-action="delete" data-id={todo.id}>Delete</button>
        </li>
      ))}
    </ul>
  );
}

// BENEFITS:
// - Single event listener instead of N listeners
// - Better for dynamic lists
// - Cleaner code at scale
```

---

## Event Handler Typing

```typescript
// React event types (use these!)
interface ClickEvent extends React.MouseEvent<HTMLButtonElement> {}
interface ChangeEvent extends React.ChangeEvent<HTMLInputElement> {}
interface SubmitEvent extends React.FormEvent<HTMLFormElement> {}
interface KeyboardEvent extends React.KeyboardEvent<HTMLInputElement> {}

// Correct usage:
function Button() {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('Clicked', e.currentTarget);
  };

  return <button onClick={handleClick}>Click me</button>;
}

function Form() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Form data
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Input value:', e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Handle enter
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleInputChange} onKeyPress={handleKeyPress} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Event Pooling (React 16 vs 17+)

```typescript
// REACT 16: Event pooling (SyntheticEvent reused)
// ❌ This doesn't work in React 16
function Form() {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeout(() => {
      console.log(e.target.value); // ❌ undefined! Event pooled
    }, 0);
  };

  return <input onChange={handleChange} />;
}

// ✅ Workaround in React 16:
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value; // Save value
  setTimeout(() => {
    console.log(value); // ✅ works
  }, 0);
};

// REACT 17+: Event pooling removed
// ✅ This works in React 17+
function Form() {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeout(() => {
      console.log(e.target.value); // ✅ works!
    }, 0);
  };

  return <input onChange={handleChange} />;
}
```

---

# PART 4: DOM API & BROWSER EVENTS

## IntersectionObserver (Lazy Loading)

```typescript
// INTERVIEW: How to implement infinite scroll or lazy image loading?

function LazyImage({ src, alt }: { src: string; alt: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, {
      threshold: 0.1 // Trigger when 10% visible
    });

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isVisible ? src : undefined}
      alt={alt}
      style={{ minHeight: '200px', background: '#f0f0f0' }}
    />
  );
}

// STEP-BY-STEP:
// 1. Create IntersectionObserver
// 2. Observe element when component mounts
// 3. When element enters viewport (isIntersecting=true):
//    - setVisible(true) to load image
//    - unobserve to stop watching
// 4. Cleanup observer
```

---

## MutationObserver (Watch for DOM Changes)

```typescript
// Watch for attribute changes, child additions, etc.

function ElementMonitor() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [mutations, setMutations] = useState<string[]>([]);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          setMutations(prev => [
            ...prev,
            `Attribute changed: ${mutation.attributeName}`
          ]);
        }
        if (mutation.type === 'childList') {
          setMutations(prev => [
            ...prev,
            `Child added/removed`
          ]);
        }
      });
    });

    if (boxRef.current) {
      observer.observe(boxRef.current, {
        attributes: true,
        childList: true,
        subtree: true
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div ref={boxRef} id="monitored">
        <p>Watch me change!</p>
      </div>
      <div>
        {mutations.map((m, i) => <div key={i}>{m}</div>)}
      </div>
      <button onClick={() => {
        const box = boxRef.current;
        if (box) {
          box.style.color = box.style.color === 'red' ? 'black' : 'red';
        }
      }}>
        Change Color
      </button>
    </div>
  );
}
```

---

## Custom Event Handling

```typescript
// Create and dispatch custom events

function NotificationSystem() {
  const notificationRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      setNotifications(prev => [...prev, customEvent.detail.message]);
    };

    document.addEventListener('notify', handleCustomEvent);

    return () => document.removeEventListener('notify', handleCustomEvent);
  }, []);

  return (
    <div ref={notificationRef}>
      {notifications.map((n, i) => (
        <div key={i} style={{ background: '#ffe0e0', padding: '10px', margin: '5px' }}>
          {n}
        </div>
      ))}
    </div>
  );
}

// USAGE: Trigger from anywhere
function TriggerNotification() {
  const notify = (message: string) => {
    const event = new CustomEvent('notify', {
      detail: { message }
    });
    document.dispatchEvent(event);
  };

  return (
    <button onClick={() => notify('Hello from custom event!')}>
      Notify
    </button>
  );
}

// STEP-BY-STEP:
// 1. Listen for custom event in useEffect
// 2. Create CustomEvent with detail
// 3. Dispatch event from anywhere
// 4. Listener receives and handles it
```

---

# PART 5: COMMON INTERVIEW QUESTIONS

## Question 1: ref vs key - When to use each?

```typescript
// KEYS: For lists, help React identify which items changed
// REFS: For direct DOM access

// ✅ KEYS
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.text}</li>  // ← key, not ref
      ))}
    </ul>
  );
}

// ✅ REFS
function Form() {
  const nameRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    nameRef.current?.focus();  // ← ref for DOM access
  };

  return (
    <div>
      <input ref={nameRef} />
      <button onClick={handleFocus}>Focus</button>
    </div>
  );
}

// KEY DIFFERENCES:
// - Key: Help React identify list items (never directly access)
// - Ref: Direct DOM access (not for lists)
```

---

## Question 2: Why avoid refs when possible?

```typescript
// REASON: Refs make code less predictable and harder to reason about

// ❌ OVERUSING REF: Direct DOM manipulation
function Counter() {
  const countRef = useRef(0);
  const displayRef = useRef<HTMLDivElement>(null);

  const increment = () => {
    countRef.current++;
    if (displayRef.current) {
      displayRef.current.textContent = countRef.current.toString();
    }
  };

  return (
    <div>
      <div ref={displayRef}>0</div>
      <button onClick={increment}>Increment</button>
    </div>
  );
}

// PROBLEMS:
// - Hard to follow logic
// - Difficult to test
// - Ref and DOM out of sync if not careful
// - Breaks React's data flow

// ✅ CORRECT: Use state
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <div>{count}</div>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// BENEFITS:
// - Clear data flow
// - Easy to test
// - React manages synchronization
// - Predictable behavior
```

---

## Question 3: How to forward refs through component?

```typescript
// Problem: Can't attach ref directly to custom component
const MyButton = (props) => <button {...props} />;

function App() {
  const ref = useRef(null);
  return <MyButton ref={ref} />;  // ❌ ref not passed through
}

// Solution: Use forwardRef
import { forwardRef } from 'react';

const MyButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => (
    <button ref={ref} {...props}>{children}</button>
  )
);

function App() {
  const ref = useRef<HTMLButtonElement>(null);
  
  const handleClick = () => {
    ref.current?.focus();
  };

  return (
    <div>
      <MyButton ref={ref}>Click me</MyButton>
      <button onClick={handleClick}>Focus above button</button>
    </div>
  );
}
```

---

## Question 4: Memory leaks with event listeners?

```typescript
// ❌ MEMORY LEAK: Event listener not cleaned up
function SearchBox() {
  const handleResize = () => {
    console.log('Window resized');
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    // Missing cleanup! Listener stays after unmount
  }, []);

  return <input placeholder="Search..." />;
}

// ✅ CORRECT: Cleanup event listeners
function SearchBox() {
  const handleResize = () => {
    console.log('Window resized');
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <input placeholder="Search..." />;
}

// STEP-BY-STEP:
// 1. Add listener in useEffect
// 2. Return cleanup function
// 3. Remove listener in cleanup
// 4. Runs when component unmounts
```

---

# SUMMARY: DOM, Refs & Events Mastery

✅ **useRef:**
- [ ] Know when to use useRef vs useState
- [ ] Can focus/blur elements
- [ ] Can access form input values
- [ ] Can store mutable values (intervals, etc.)
- [ ] Know forwardRef pattern

✅ **Event Handling:**
- [ ] Know React event types
- [ ] Understand event delegation
- [ ] Know event pooling differences (React 16 vs 17+)
- [ ] Can handle keyboard events

✅ **DOM API:**
- [ ] Understand IntersectionObserver (lazy loading)
- [ ] Know ResizeObserver (measure elements)
- [ ] Can use MutationObserver (watch changes)
- [ ] Know custom events

✅ **Interview:**
- [ ] Can explain ref use cases
- [ ] Know when NOT to use refs
- [ ] Can avoid memory leaks
- [ ] Know event handling best practices

---

**Master refs and events—they're 10% of interviews but crucial to know!**
