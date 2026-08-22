# Advanced Component Patterns in React

These six patterns are what separates "I know hooks" from "I can design a component API" in an interview — they show up whenever the question shifts from "how does `useState` work" to "how would you build this reusable piece."

## 1. Controlled vs Uncontrolled Components

A **controlled** component has its value held in React state — every keystroke goes through `onChange`, and the DOM input is just a mirror of that state. An **uncontrolled** component lets the DOM manage its own value, and React only reaches in via a `ref` when it actually needs the value (typically on submit). The choice matters because controlled inputs let you validate, format, or conditionally disable on every keystroke, at the cost of a re-render per keystroke; uncontrolled inputs skip that re-render cost and are the only option for a native `<input type="file">`, whose value the browser refuses to let JavaScript set.

```jsx
// CONTROLLED: needed here because the submit button's disabled state
// and the inline error both depend on the current value on every keystroke
function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isValidEmail = /\S+@\S+\.\S+/.test(email);
  const canSubmit = isValidEmail && password.length >= 8;

  const handleSubmit = (e) => {
    e.preventDefault();
    submitSignup({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={email.length > 0 && !isValidEmail}
      />
      {email.length > 0 && !isValidEmail && <p>Enter a valid email</p>}

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {/* UNCONTROLLED: a resume upload — the browser owns this value,
          React never needs to read it until the moment of submit */}
      <input type="file" ref={fileInputRef} name="resume" />

      <button type="submit" disabled={!canSubmit}>Sign Up</button>
    </form>
  );
}
```

The rule of thumb that holds up in real codebases: default to controlled because it is what makes validation, formatting, and conditional UI possible in the first place, and reach for uncontrolled only for the handful of cases — file inputs, or wrapping a non-React widget — where React genuinely doesn't need to know the value on every change.

## 2. The Evolution From Render Props to HOCs to Hooks

All three patterns solve the same problem — sharing stateful logic (like tracking mouse position, or fetching data) across components without copy-pasting it — and they were tried in roughly this order as the community discovered each one's weak point. A **render prop** passes a function as a child so the parent can decide how to render the shared state, but nesting several of them produces deeply indented "callback hell" JSX. A **HOC** (higher-order component) wraps a component and injects props, but stacking several HOCs produces "wrapper hell" in the component tree (`withAuth(withTheme(withData(Profile)))`) and, worse, two HOCs that both decide to inject a prop called `data` will silently overwrite each other with no compile-time warning. A **custom hook** shares the exact same logic with neither problem, because it runs inside the consuming component's own render instead of wrapping it in an extra element.

```jsx
// BEFORE — Higher-Order Component: two unrelated HOCs, injected in sequence
function withMouseTracker(Component) {
  return function Wrapped(props) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    useEffect(() => {
      const handleMove = (e) => setPosition({ x: e.clientX, y: e.clientY });
      window.addEventListener('mousemove', handleMove);
      return () => window.removeEventListener('mousemove', handleMove);
    }, []);
    // Names this injected prop "position" — fine, until another HOC
    // in the chain also decides to call its injected prop "position"
    // or "data", and one silently clobbers the other.
    return <Component {...props} position={position} />;
  };
}

function withWindowSize(Component) {
  return function Wrapped(props) {
    const [size, setSize] = useState({ width: window.innerWidth });
    useEffect(() => {
      const handleResize = () => setSize({ width: window.innerWidth });
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    return <Component {...props} size={size} />;
  };
}

// The component tree in React DevTools is now three levels deeper than
// the actual UI, and tracing which HOC set which prop takes real digging.
export default withWindowSize(withMouseTracker(Dashboard));
```

```jsx
// AFTER — Custom Hooks: same two behaviors, no wrapper, no prop collision
function useMouseTracker() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMove = (e) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);
  return position;
}

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

function Dashboard() {
  // Each hook returns its own local variable — you choose the name,
  // there is no shared prop namespace for two libraries to collide on.
  const mousePosition = useMouseTracker();
  const windowSize = useWindowSize();

  return <div>{mousePosition.x} / {windowSize.width}</div>;
}
```

Hooks won this evolution for two concrete reasons, not just "they're newer": there is no extra component in the render tree (no wrapper hell — `Dashboard` renders directly, instead of being buried inside `WithWindowSize > WithMouseTracker > Dashboard`), and there is no shared prop name for two pieces of logic to collide on (no prop naming collisions — each hook's return value gets a name you choose at the call site, instead of being merged into one flat props object by `{...props}`).

## 3. Compound Components

A compound component splits one logical widget into several components that are meant to be used together, sharing implicit state through Context so the parent doesn't have to pass that state down through props at every level. The payoff is an API that reads like plain markup — `<Tabs><Tab/></Tabs>` — while the child components silently coordinate through context instead of the caller having to wire up `activeIndex` and `onChange` by hand.

```jsx
const TabsContext = createContext(null);

function Tabs({ defaultValue, children }) {
  const [activeValue, setActiveValue] = useState(defaultValue);

  // Every Tab and TabPanel below reads/writes this through context —
  // the caller never sees or manages activeValue directly.
  const value = useMemo(() => ({ activeValue, setActiveValue }), [activeValue]);

  return (
    <TabsContext.Provider value={value}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }) {
  return <div role="tablist">{children}</div>;
}

function Tab({ value, children }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tab must be used inside <Tabs>');

  const isActive = ctx.activeValue === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={isActive ? 'tab tab-active' : 'tab'}
      onClick={() => ctx.setActiveValue(value)}
    >
      {children}
    </button>
  );
}

function TabPanel({ value, children }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabPanel must be used inside <Tabs>');
  return ctx.activeValue === value ? <div role="tabpanel">{children}</div> : null;
}

// USAGE — reads like plain markup, no activeIndex/onChange plumbing
function BillingSettings() {
  return (
    <Tabs defaultValue="invoices">
      <TabList>
        <Tab value="invoices">Invoices</Tab>
        <Tab value="cards">Payment Cards</Tab>
      </TabList>

      <TabPanel value="invoices">...invoice list...</TabPanel>
      <TabPanel value="cards">...saved cards...</TabPanel>
    </Tabs>
  );
}
```

This is exactly the API shape libraries like Radix UI and Reach UI ship for widgets like `Select`, `Accordion`, and `Menu` — the parent (`Tabs`) owns the state, the children (`Tab`, `TabPanel`) read and update it through context, and the caller gets to compose and reorder pieces freely instead of being handed one rigid, all-in-one component with a long prop list.

## 4. State Machine Pattern

When a component has several states that are mutually exclusive — a form is either idle, submitting, showing success, or showing an error, never two of those at once — modeling each state as its own boolean (`isLoading`, `isSuccess`, `hasError`) lets impossible combinations exist in the type system even though they can never legitimately happen (`isLoading: true` and `isSuccess: true` at the same time is a bug waiting to happen, not a state anyone intended). A state machine collapses that into one variable that can only ever hold one value at a time, with a reducer that is the single place transitions are allowed to happen.

```jsx
// ❌ A pile of booleans — four independent flags describing what should
// really be one variable, and nothing stops two of them being true together
function useFormState_booleans() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  // Nothing here prevents setIsSubmitting(true) and setIsSuccess(true)
  // from both being true at once if a caller forgets to reset one.
}

// ✅ State machine — exactly one of these four values is ever true
function formReducer(state, action) {
  switch (state.status) {
    case 'idle':
      if (action.type === 'SUBMIT') return { status: 'submitting' };
      return state;
    case 'submitting':
      if (action.type === 'SUCCESS') return { status: 'success' };
      if (action.type === 'ERROR') return { status: 'error', error: action.error };
      return state;
    case 'success':
      if (action.type === 'RESET') return { status: 'idle' };
      return state;
    case 'error':
      if (action.type === 'RETRY') return { status: 'submitting' };
      return state;
    default:
      return state;
  }
}

function SignupForm() {
  const [state, dispatch] = useReducer(formReducer, { status: 'idle' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch({ type: 'SUBMIT' });
    try {
      await submitSignup();
      dispatch({ type: 'SUCCESS' });
    } catch (err) {
      dispatch({ type: 'ERROR', error: err.message });
    }
  };

  if (state.status === 'success') return <p>Welcome aboard!</p>;

  return (
    <form onSubmit={handleSubmit}>
      {state.status === 'error' && <p role="alert">{state.error}</p>}
      <button type="submit" disabled={state.status === 'submitting'}>
        {state.status === 'submitting' ? 'Submitting...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

The `switch (state.status)` structure also documents every legal transition in one place — `submitting` can only go to `success` or `error`, never straight back to `idle` — which is exactly the kind of thing a pile of independent booleans cannot express or enforce, and it's why this pattern is the seed of libraries like XState for anything more complex than four states.

## 5. Error Boundaries

An error boundary is a component that catches JavaScript errors thrown during rendering anywhere in its child tree and renders a fallback UI instead of letting the error unmount the entire application. It must currently be a class component, because the two lifecycle methods that catch render errors (`static getDerivedStateFromError` and `componentDidCatch`) have no hook equivalent, and it only catches errors thrown during rendering, in lifecycle methods, and in constructors — not errors inside event handlers, `setTimeout` callbacks, or async code, which still need a plain `try/catch`.

```jsx
class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logErrorToMonitoring(error, errorInfo, { widget: this.props.widgetName });
  }

  render() {
    if (this.state.hasError) {
      // Only this one widget's slot goes blank — everything around it
      // on the dashboard keeps rendering and stays interactive.
      return (
        <div className="widget-crashed">
          <p>{this.props.widgetName} couldn't load.</p>
          <button onClick={() => this.setState({ hasError: false })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// USAGE: wrap each dashboard widget individually, not the whole dashboard
function AnalyticsDashboard() {
  return (
    <div className="dashboard-grid">
      <WidgetErrorBoundary widgetName="Revenue Chart">
        <RevenueChartWidget />
      </WidgetErrorBoundary>

      <WidgetErrorBoundary widgetName="Live Stock Ticker">
        <StockTickerWidget /> {/* if this one throws on a malformed price feed */}
      </WidgetErrorBoundary>

      <WidgetErrorBoundary widgetName="User Activity Feed">
        <ActivityFeedWidget />
      </WidgetErrorBoundary>
    </div>
  );
}
```

Placing the boundary around each individual widget instead of once around the whole dashboard is the actual design decision being tested here: a bug in the stock ticker's price-parsing logic throws only inside `StockTickerWidget`, its boundary swaps in the "couldn't load" fallback for that one grid cell, and the revenue chart and activity feed next to it keep working exactly as if nothing happened.

## 6. Portals

A portal renders a component's children into a DOM node that lives outside its parent's DOM hierarchy, while the component still behaves as if it were rendered in its original place for React purposes — events bubble up through the React tree as normal, and context from ancestors is still visible. The real-world reason to reach for this is CSS: a modal or tooltip nested inside a container with `overflow: hidden`, a fixed `z-index` stacking context, or `transform` on an ancestor can get visually clipped or trapped no matter what z-index you give it, because those CSS properties constrain descendants in the DOM tree regardless of React's component tree.

```jsx
import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  // Rendered as a child of <body>, not inside whatever card/panel
  // happened to render <Modal> — so a parent's overflow:hidden or
  // z-index stacking context can no longer clip or bury it.
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.getElementById('modal-root')
  );
}

// The bug this solves: ProductCard has `overflow: hidden` for its image,
// so a modal rendered as a normal child gets clipped at the card's edge.
function ProductCard({ product }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="product-card" style={{ overflow: 'hidden' }}>
      <img src={product.image} alt={product.name} />
      <button onClick={() => setShowDetails(true)}>View Details</button>

      {/* Because Modal uses a portal, this still fully escapes the
          card's overflow:hidden and renders on top of the whole page. */}
      <Modal isOpen={showDetails} onClose={() => setShowDetails(false)}>
        <h2>{product.name}</h2>
        <p>{product.description}</p>
      </Modal>
    </div>
  );
}
```

Even though `Modal`'s markup ends up physically under `<body>` in the actual DOM, a click inside it still bubbles up through `ProductCard` in React's event system and a `useContext` call inside it still sees whatever provider wraps `ProductCard` in the JSX tree — portals only change *where* something is painted, not how it participates in React's component and event model.

## Interview Questions and Answers

### 1. When would you deliberately choose an uncontrolled input over a controlled one?
**Answer:** When you don't need to react to every keystroke — a file input is the clearest case, since the browser refuses to let JavaScript set its value at all, so it must stay uncontrolled and read via a `ref` on submit. It's also a reasonable choice for a very large form where re-rendering on every keystroke is a measurable performance cost and no per-keystroke validation is needed.

### 2. What specifically breaks when you stack multiple HOCs, beyond "it's messy"?
**Answer:** Two concrete things: the component tree grows a wrapper level per HOC (`withAuth(withTheme(withData(Profile)))` shows up as three extra components in DevTools with no visual counterpart), and two HOCs that both inject a prop with the same name — say `data` or `position` — silently overwrite each other with no compile-time error, because the injected props are merged with `{...props}` and JavaScript object spread just takes the last value.

### 3. Why don't custom hooks have the wrapper-hell or prop-collision problems that HOCs do?
**Answer:** A hook runs inside the consuming component's own function call rather than wrapping it in an extra rendered component, so it adds zero levels to the component tree. And because each hook's return value is assigned to a local variable the caller names explicitly (`const mousePosition = useMouseTracker()`), there is no shared props object for two unrelated pieces of logic to collide in.

### 4. Why must Error Boundaries be class components?
**Answer:** The two lifecycle methods that catch rendering errors — `static getDerivedStateFromError` for computing fallback state and `componentDidCatch` for side-effecting logging — only exist on the class component API; there is no hook equivalent for either one. This is also why third-party libraries like `react-error-boundary` still ship a class component under the hood even though they expose a hook-friendly wrapper API.

### 5. What kinds of errors will an Error Boundary NOT catch?
**Answer:** Errors thrown inside asynchronous event handlers (a `fetch` that rejects inside an `onClick`), inside `setTimeout` callbacks, and during server-side rendering are all invisible to an Error Boundary, because it only wraps the synchronous render/lifecycle call stack. Those cases still need an ordinary `try/catch` around the async code itself.

### 6. Why wrap each dashboard widget in its own Error Boundary instead of one boundary around the whole page?
**Answer:** A single boundary around the entire dashboard means any one widget's bug takes down every other widget on the page, since the boundary replaces its entire child tree with the fallback UI the moment anything inside throws. Wrapping each widget individually means a crash in, say, a stock ticker widget only blanks that one grid cell while the revenue chart and activity feed next to it keep rendering normally.

### 7. Why does a Portal-rendered modal still receive context from its logical parent, even though it's mounted under `<body>`?
**Answer:** `createPortal` only changes where React paints the DOM nodes — it does not remove the component from its place in the React component tree, which is what Context and event bubbling are both based on. So a `<Modal>` rendered by `<ProductCard>` still sees any context provider that wraps `ProductCard` in JSX, and a click inside the modal still bubbles up through `ProductCard`'s handlers, exactly as if no portal were involved.

### 8. Why does a pile of independent booleans (`isLoading`, `isSuccess`, `hasError`) cause real bugs, and how does a state machine fix it?
**Answer:** Nothing stops `isLoading` and `isSuccess` from both being `true` at the same time if one `setState` call is missed during a refactor, and that impossible combination has to be defensively guarded against in the JSX render logic. A state machine collapses those into one `status` field that can only hold one value, and a reducer's `switch` statement is the single place that defines which transitions are legal, so an impossible combination simply cannot be represented.

### 9. In the Tabs compound component example, what does Context actually save you from doing?
**Answer:** Without Context, `Tabs` would have to pass `activeValue` and `setActiveValue` down as explicit props through every intermediate component, and the caller composing `<Tabs><TabList><Tab/></TabList></Tabs>` would need to manually wire an `activeIndex`/`onChange` pair themselves. Context lets `Tab` and `TabPanel` read and update that shared state directly, no matter how deeply they're nested inside `<Tabs>`, while the caller's JSX stays plain markup.

### 10. Give a concrete case where a controlled component's re-render cost actually matters.
**Answer:** A large form with fifty text fields, each controlled and re-rendering the whole form component on every keystroke, can visibly lag on a slower device if the form's render function is doing nontrivial work like re-computing validation across all fields each time. In that case, splitting each field into its own controlled sub-component (so each keystroke only re-renders one field) or using an uncontrolled `ref`-based approach for fields that don't need live validation are both legitimate fixes.

## Revision Checklist

- [ ] Explain controlled vs uncontrolled components and name a real case (file input) where uncontrolled is the only option.
- [ ] Walk through the Render Props to HOC to Hooks evolution and name the two concrete problems hooks solve: wrapper hell and prop naming collisions.
- [ ] Build a compound component (`Tabs`/`Tab` or `Select`/`Option`) sharing state through Context instead of prop drilling.
- [ ] Implement a state machine with `useReducer` for a form's idle/submitting/success/error states and explain why it beats independent booleans.
- [ ] Write an Error Boundary class component and know which two lifecycle methods it needs and which categories of errors it cannot catch.
- [ ] Explain why wrapping each widget in its own Error Boundary isolates crashes on a dashboard.
- [ ] Implement a `createPortal`-based modal and explain why events still bubble through the React tree despite the different DOM location.
- [ ] Explain why a portal escapes `overflow: hidden` and `z-index` stacking issues that a normally-rendered child cannot.
