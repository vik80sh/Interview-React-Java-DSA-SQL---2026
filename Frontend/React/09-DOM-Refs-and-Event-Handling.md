# DOM, Refs and Event Handling

Almost every React interview includes at least one "how would you do X without a re-render" question — focus an input, control a video, measure an element, integrate a jQuery widget — and `useRef` is the answer to all of them. This guide covers `useRef`'s real use cases, the refs-vs-state decision that trips people up, and the browser-level event/observer APIs interviewers expect you to know.

## 1. useRef Fundamentals

```typescript
const ref = useRef<HTMLElement>(null);

ref.current // the DOM node once attached, or whatever value you stored
```

`useRef` returns a plain mutable object with a single property, `current`, that survives across re-renders. The critical difference from `useState`: **mutating `ref.current` does not trigger a re-render**. That's the whole reason it exists — it's an escape hatch for values the component needs to remember or DOM nodes it needs to touch, without asking React to re-render just to hold onto them.

## 2. Use Case: Focus Management

```typescript
function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFocus = () => {
    inputRef.current?.focus(); // direct DOM access — no React API for this
  };

  const handleClear = () => {
    setSearchTerm('');
    inputRef.current?.focus();
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
```

There's no React state that represents "is this input focused" that you can set to make the browser focus it — focus is an imperative DOM operation. `focus()`, `blur()`, and `scrollIntoView()` all fall in this category: things only the underlying DOM node can do, so a ref is the only way in.

## 3. Use Case: Video/Audio Playback Control

```typescript
function VideoPlayer({ url }: { url: string }) {
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
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  return (
    <div>
      <video ref={videoRef} src={url} style={{ width: '100%', maxWidth: '600px' }} />
      <button onClick={isPlaying ? handlePause : handlePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <input type="range" min="0" max={videoRef.current?.duration || 0}
        onChange={(e) => handleSeek(parseFloat(e.target.value))} />
    </div>
  );
}
```

Media elements expose an imperative API (`play()`, `pause()`, `currentTime`, `muted`) that has no declarative equivalent — you can't render your way into "the video is now playing," you have to call `play()` on the actual `<video>` node. `isPlaying` stays in state because it drives what the UI *displays* (button label); the media control itself goes through the ref.

## 4. Use Case: Measuring DOM Elements

```typescript
function ResizeAwareBox() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    if (boxRef.current) observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div ref={boxRef} style={{ width: '100%', height: '200px', resize: 'both', overflow: 'auto' }} />
      <p>{Math.round(dimensions.width)} x {Math.round(dimensions.height)}</p>
    </div>
  );
}
```

Width and height aren't known until the element actually exists in the DOM and has been laid out — there's no prop or piece of state that magically knows them ahead of time. The pattern is always: ref to get the node, `ResizeObserver` (or a one-off `getBoundingClientRect()`) to read the measurement, and `useEffect` to wire the observer up and tear it down on unmount.

## 5. Use Case: Storing Mutable Values That Aren't DOM Nodes

```typescript
function Timer() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [count, setCount] = useState(0);

  const handleStart = () => {
    intervalRef.current = setInterval(() => setCount(c => c + 1), 1000);
  };

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleStart}>Start</button>
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}
```

A ref can hold *anything* mutable, not just DOM nodes — an interval ID, a request ID for cancelling a stale fetch, a "did this effect already run" flag, the previous value of a prop. None of these values should ever cause a re-render on their own; they're bookkeeping the component needs, not something the UI displays. Putting an interval ID in `useState` would be wrong on two counts: it re-renders for no visual reason, and it invites someone to render that ID directly.

## 6. Use Case: Integrating Non-React Libraries

```typescript
import $ from 'jquery';
import 'jquery-ui/jquery-ui.js';

function DatePickerComponent() {
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (!datePickerRef.current) return;

    $(datePickerRef.current).datepicker({
      onSelect: (date: string) => setSelectedDate(date),
    });

    return () => {
      $(datePickerRef.current!).datepicker('destroy');
    };
  }, []);

  return <input ref={datePickerRef} type="text" value={selectedDate} readOnly />;
}
```

Third-party widgets (jQuery plugins, D3, Chart.js, a Google Maps instance) manage their own DOM subtree and their own internal state outside React's rendering model. The ref hands the library a real node to mount onto; `useEffect` initializes it after React has committed the DOM, and the cleanup function tears it down before React might reuse or remove that node — skipping the cleanup is a classic source of duplicate widget instances and memory leaks.

## 7. Refs vs State — the Decision Guide

This is one of the most common interview probes, because it tests whether you actually understand *why* each hook exists rather than just how to call it.

```
Does the value need to show up in the rendered UI or affect what renders?
  YES → useState (or derived from state/props)
  NO  → keep reading

Is it something only the DOM node itself can do (focus, scroll, measure, play/pause,
  or a third-party library that needs a real node)?
  YES → useRef
  NO  → keep reading

Is it a mutable value the component needs to remember between renders, but that
  should never itself cause a re-render (timer/interval IDs, previous prop values,
  request-cancellation tokens, "has this run already" flags)?
  YES → useRef
  NO  → useState
```

Rule of thumb: **if changing the value should update what's on screen, it's state; if it's plumbing that supports the component without appearing on screen, it's a ref.** A controlled input that also needs to be focusable typically needs both — `useState` for the value that's rendered, `useRef` for the imperative `focus()` call:

```typescript
const inputRef = useRef<HTMLInputElement>(null);
const [value, setValue] = useState('');

const handleClear = () => {
  setValue('');
  inputRef.current?.focus();
};
```

Overusing refs is a real anti-pattern worth naming in an interview: mutating `ref.current` and then manually pushing that value into the DOM (`displayRef.current.textContent = ...`) bypasses React's data flow, is harder to test, and risks the ref and the actual DOM silently drifting out of sync. If a value should be visible in the UI, let state drive it — don't reach for `textContent` by hand.

## 8. Event Delegation

```typescript
// One listener per row — doesn't scale well with large, dynamic lists
function TodoListNaive({ todos }: { todos: Todo[] }) {
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

// Single listener on the parent, using event bubbling
function TodoList({ todos }: { todos: Todo[] }) {
  const handleListClick = (e: React.MouseEvent<HTMLUListElement>) => {
    const target = e.target as HTMLElement;
    if (target.dataset.action === 'delete') {
      const todoId = parseInt(target.dataset.id ?? '0', 10);
      handleDelete(todoId);
    }
  };

  return (
    <ul onClick={handleListClick}>
      {todos.map(todo => (
        <li key={todo.id}>
          {todo.text}
          <button data-action="delete" data-id={todo.id}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

A click on any child bubbles up to the parent, so one listener on the `<ul>` can handle clicks for every current and future `<li>` without attaching (and cleaning up) a handler per row. In practice React's synthetic event system already delegates at the root for you internally, so the *performance* win of manual delegation is smaller than people assume — but it's still the right pattern for very large or frequently-changing lists, and it's exactly how vanilla-JS event delegation works under the hood, which is usually what the question is really probing.

## 9. Event Handler Typing

```typescript
function Form() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { /* ... */ }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleInputChange} onKeyDown={handleKeyDown} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

React's generic synthetic event types (`React.MouseEvent<T>`, `React.ChangeEvent<T>`, `React.FormEvent<T>`, `React.KeyboardEvent<T>`) are parameterized by the element the handler is attached to, so `e.currentTarget` and `e.target` come back correctly typed instead of as `EventTarget`. Getting this wrong is a common TypeScript-in-React interview trip-up — reaching for the plain DOM `Event`/`KeyboardEvent` types instead of React's wrapped versions loses that typing.

## 10. Event Pooling (React 16 vs 17+)

```typescript
// React 16: SyntheticEvent objects were pooled and nulled out after the handler returned
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setTimeout(() => {
    console.log(e.target.value); // React 16: undefined — the event was already recycled
  }, 0);
};

// Fix under React 16: pull out the value synchronously, before the event is pooled
const handleChangeFixed = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setTimeout(() => console.log(value), 0); // works
};
```

React 16 reused a single `SyntheticEvent` instance across events for performance and nulled out its fields immediately after the handler synchronously returned, so referencing the event asynchronously (inside a `setTimeout`, a promise callback, etc.) read stale/nulled fields. React 17 removed pooling entirely, so accessing `e.target.value` inside an async callback works without the "extract it first" workaround — but it's worth knowing the old behavior since plenty of interview questions and older codebases still assume it.

## 11. IntersectionObserver for Lazy Loading

```typescript
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target); // only need to fire once
      }
    }, { threshold: 0.1 });

    if (imgRef.current) observer.observe(imgRef.current);
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
```

`IntersectionObserver` reports asynchronously when an element crosses a viewport threshold, without the layout-thrashing cost of polling `getBoundingClientRect()` on every scroll event. This is the standard mechanism behind lazy-loaded images, infinite scroll ("load more when the sentinel div is visible"), and scroll-triggered animations — the ref gets the observer a real node to watch, `isIntersecting` flips state, and `unobserve`/`disconnect` in cleanup stop it from doing unnecessary work once it's no longer needed.

## 12. MutationObserver for Watching DOM Changes

```typescript
function ElementMonitor() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          setLog(prev => [...prev, `Attribute changed: ${mutation.attributeName}`]);
        }
        if (mutation.type === 'childList') {
          setLog(prev => [...prev, 'Child added or removed']);
        }
      });
    });

    if (boxRef.current) {
      observer.observe(boxRef.current, { attributes: true, childList: true, subtree: true });
    }
    return () => observer.disconnect();
  }, []);

  return <div ref={boxRef}>Watch me change</div>;
}
```

`MutationObserver` reports attribute, child-list, or text changes to a subtree asynchronously in batches, which is what you'd reach for to detect DOM changes made outside React's own render cycle — typically from third-party scripts, browser extensions, or legacy jQuery code that mutates the DOM directly. In an all-React tree this is rarely needed since React already knows about every DOM change it makes; it earns its place specifically at the boundary with non-React code.

## 13. Custom Events for Cross-Component Communication

```typescript
function NotificationSystem() {
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    const handleNotify = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      setNotifications(prev => [...prev, detail.message]);
    };

    document.addEventListener('notify', handleNotify);
    return () => document.removeEventListener('notify', handleNotify);
  }, []);

  return (
    <div>
      {notifications.map((n, i) => <div key={i}>{n}</div>)}
    </div>
  );
}

// Dispatched from anywhere, including outside React's tree
function notify(message: string) {
  document.dispatchEvent(new CustomEvent('notify', { detail: { message } }));
}
```

`CustomEvent` plus `dispatchEvent`/`addEventListener` on `document` (or any shared node) gives two components a way to talk without a shared parent, a context provider, or a state library — useful mainly at integration boundaries with non-React code, or for genuinely global, decoupled signals (analytics events, a toast system triggered from outside React). For communication that stays entirely inside the React tree, prop drilling, context, or a state library is almost always the better-structured choice; custom events sidestep React's data flow the same way overusing refs does.

## 14. Cleaning Up Native Event Listeners

```typescript
function WindowWidthWatcher() {
  useEffect(() => {
    const handleResize = () => console.log(window.innerWidth);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize); // easy to forget
  }, []);

  return null;
}
```

Any listener attached directly to `window`, `document`, or a DOM node outside JSX's `onClick`-style props must be removed in the `useEffect` cleanup function, or it keeps firing (and keeps closures alive) after the component unmounts — a classic memory leak that shows up as "why is this console.log still running after I navigated away."

## 15. forwardRef — Passing a Ref Through a Custom Component

```typescript
// Won't work: a plain function component doesn't accept `ref` as a prop
const MyButton = (props: ButtonProps) => <button {...props} />;

// Fix: forwardRef exposes the underlying DOM node to the parent
const MyButtonForwarded = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => (
    <button ref={ref} {...props}>{children}</button>
  )
);

function App() {
  const ref = useRef<HTMLButtonElement>(null);
  return <MyButtonForwarded ref={ref}>Click me</MyButtonForwarded>;
}
```

`ref` is not a normal prop — React handles it specially, so a function component doesn't receive it unless the component is wrapped in `forwardRef`, which explicitly threads the ref through to whichever DOM node (or imperative handle) the component chooses to attach it to. This is the standard way a reusable component library (a design system's `<Button>`, `<Input>`, etc.) lets consumers still call `.focus()` on the real underlying element.

## Interview Questions and Answers

### 1. What's the fundamental difference between `useRef` and `useState`?

**Answer:** Both persist a value across re-renders, but updating a ref's `.current` does not trigger a re-render while updating state does. Use state for anything that should be reflected in the UI, and a ref for DOM access or mutable bookkeeping that the render output doesn't depend on.

### 2. Give three concrete use cases for `useRef` beyond just holding a DOM node.

**Answer:** Storing an interval or timeout ID so it can be cleared later, storing the previous value of a prop to compare against the current one, and storing a boolean flag like "has this effect already run" to guard against duplicate initialization (common with `StrictMode`'s double-invoke in development).

### 3. How do you decide between `ref` and `key` when working with lists?

**Answer:** They solve unrelated problems. `key` tells React's reconciler which array item is which across renders so it can correctly reuse, reorder, or discard DOM nodes; it's never read or dereferenced by your code. `ref` gives you a handle to actually reach into a DOM node imperatively — it has nothing to do with list identity.

### 4. Why is overusing refs considered an anti-pattern in React?

**Answer:** Manually pushing values into the DOM through a ref (e.g., setting `textContent` by hand) bypasses React's declarative data flow, making the component harder to test and reason about, and risks the ref-held value and the actual rendered DOM silently drifting out of sync. If a value affects what's on screen, it belongs in state so React can keep the render output and the value consistent.

### 5. How do you attach a ref to a custom function component?

**Answer:** By default a function component can't receive `ref` as a prop because React intercepts it. Wrapping the component in `forwardRef` lets it explicitly forward the ref to whichever underlying DOM node (or object built with `useImperativeHandle`) it chooses to expose.

### 6. What changed about event pooling between React 16 and React 17?

**Answer:** In React 16, `SyntheticEvent` objects were pooled and reused, so their fields were nulled out immediately after the synchronous handler returned — reading `e.target.value` inside a `setTimeout` or async callback returned `undefined` unless you extracted the value first. React 17 removed pooling, so synthetic events can be safely referenced asynchronously without that workaround.

### 7. When would you reach for event delegation instead of a handler per element?

**Answer:** When rendering a large or frequently-changing list, attaching one listener to a shared parent and reading `e.target` (often via `data-*` attributes) to figure out which child was interacted with avoids creating and tearing down one listener per row. In practice React's synthetic event system already delegates at the root internally, so the main benefit shown here is understanding the underlying bubbling mechanism, which is what vanilla-JS delegation relies on directly.

### 8. What's the difference between `IntersectionObserver` and `MutationObserver`, and when would you use each?

**Answer:** `IntersectionObserver` reports when an element crosses a visibility threshold relative to the viewport (or another ancestor), which is what drives lazy-loading images and infinite scroll. `MutationObserver` reports when a DOM subtree's attributes, children, or text change, which is useful mainly for detecting changes made by code outside your control — typically third-party scripts or non-React libraries — since React already knows about the changes it makes itself.

### 9. Why must event listeners added directly to `window` or `document` be removed in a cleanup function?

**Answer:** `useEffect`'s callback runs on every mount (and dependency change), and if the returned cleanup doesn't call `removeEventListener`, the listener keeps firing after the component unmounts, holding its closure (and any DOM/state references it captures) alive indefinitely. This is a common source of real memory leaks and of stale callbacks firing against components that no longer exist.

### 10. Why doesn't a ref update cause a child component to re-render, and why is that useful?

**Answer:** `useRef` deliberately doesn't hook into React's state/scheduling system, so mutating `.current` is a plain JavaScript object mutation with zero rendering side effects. That's exactly what makes it the right tool for values like scroll positions, timer IDs, or a third-party library instance — things a component needs to track without paying a re-render for every change.

## Revision Checklist

- [ ] Explain the core difference between `useRef` and `useState`, and when a re-render should or shouldn't happen.
- [ ] Walk through at least three `useRef` use cases: focus management, imperative media control, and storing a non-DOM mutable value (timer/interval ID).
- [ ] State the refs-vs-state decision rule and apply it to a controlled input that also needs `.focus()`.
- [ ] Explain event delegation and why it still matters conceptually even though React already delegates internally.
- [ ] Describe the React 16 vs 17+ event pooling difference and the workaround for accessing event fields asynchronously.
- [ ] Explain what `IntersectionObserver` and `MutationObserver` each detect, and give one real use case for each.
- [ ] Explain why `forwardRef` is needed to pass a ref into a custom function component.
- [ ] Name the anti-pattern of overusing refs to mutate the DOM directly, and why it breaks React's data flow.
