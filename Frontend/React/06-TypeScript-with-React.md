# TypeScript with React

TypeScript's value in a React codebase shows up exactly where plain JavaScript fails silently: props that don't match what a component actually needs, event handlers wired to the wrong DOM element, and reducers that forget a case. Interviewers use these patterns to see whether you reach for `any` or actually model the constraint.

## 1. Typing Function Component Props

A props interface should say exactly what a component accepts: which fields are required, which are optional, and what `children` is allowed to be.

```typescript
interface CardProps {
  title: string;
  subtitle?: string;                 // optional — caller may omit
  footer?: React.ReactNode;          // optional slot, not just text
  children: React.ReactNode;         // required — anything renderable
  onDismiss?: () => void;
}

function Card({ title, subtitle, footer, children, onDismiss }: CardProps) {
  return (
    <section className="card">
      <header>
        <h2>{title}</h2>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
        {onDismiss && <button onClick={onDismiss} aria-label="Dismiss">×</button>}
      </header>
      <div className="card-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  );
}

// USAGE:
<Card title="Deployment failed" onDismiss={() => setShowError(false)}>
  <p>Service <code>payments-api</code> failed health checks.</p>
</Card>
```

`React.ReactNode` is the right type for `children` and for any prop that renders arbitrary JSX — it covers elements, strings, numbers, fragments, and `null`. Do not type `children` as `JSX.Element`; that rejects strings, arrays of elements, and `null`, all of which are legal children.

## 2. Discriminated Union Props for Component Variants

Optional props alone can't express "this field is required only for this variant." A discriminated union on a `variant` (or `kind`) field lets TypeScript enforce that per-variant contract and narrows the props automatically once you branch on it.

```typescript
interface BaseAlertProps {
  message: string;
}

interface InfoAlertProps extends BaseAlertProps {
  variant: 'info';
}

interface SuccessAlertProps extends BaseAlertProps {
  variant: 'success';
  autoDismissMs?: number;
}

interface ErrorAlertProps extends BaseAlertProps {
  variant: 'error';
  onRetry: () => void;              // required only for the error variant
}

type AlertProps = InfoAlertProps | SuccessAlertProps | ErrorAlertProps;

function Alert(props: AlertProps) {
  switch (props.variant) {
    case 'info':
      return <div className="alert alert-info">{props.message}</div>;
    case 'success':
      return <div className="alert alert-success">{props.message}</div>;
    case 'error':
      // props.onRetry is known to exist here — TypeScript narrowed the union
      return (
        <div className="alert alert-error">
          {props.message}
          <button onClick={props.onRetry}>Retry</button>
        </div>
      );
  }
}

// USAGE:
<Alert variant="error" message="Could not save changes" onRetry={handleSave} />
// <Alert variant="error" message="oops" />  ❌ compile error: onRetry is missing
```

This catches a real class of bugs — a caller who passes `variant="error"` but forgets `onRetry` fails at compile time instead of rendering a broken button at runtime.

## 3. Typing useState and useReducer

`useState` infers a primitive's type from its initial value, but nullable or union state needs an explicit type argument. `useReducer` should type its action set as a discriminated union so the reducer's switch can be checked for exhaustiveness.

```typescript
interface User {
  id: number;
  name: string;
  role: 'admin' | 'member';
}

// nullable state needs an explicit type parameter
const [user, setUser] = useState<User | null>(null);
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

// useReducer with a discriminated union of actions
interface CartItem {
  sku: string;
  quantity: number;
  price: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; sku: string }
  | { type: 'SET_QUANTITY'; sku: string; quantity: number }
  | { type: 'CLEAR' };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD_ITEM':
      return [...state, action.item];
    case 'REMOVE_ITEM':
      return state.filter(item => item.sku !== action.sku);
    case 'SET_QUANTITY':
      return state.map(item =>
        item.sku === action.sku ? { ...item, quantity: action.quantity } : item
      );
    case 'CLEAR':
      return [];
    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
}

function CartPage() {
  const [items, dispatch] = useReducer(cartReducer, []);
  // dispatch({ type: 'ADD_ITEM' }); ❌ missing `item`
  dispatch({ type: 'ADD_ITEM', item: { sku: 'sku-1', quantity: 1, price: 9.99 } }); // ✅
  return <span>{items.length} items</span>;
}
```

If a new action variant is added to `CartAction` without updating the reducer, the `default` branch's `never` assignment fails to compile — the same exhaustiveness guarantee you get from a well-designed backend enum switch.

## 4. Typing useContext with a Safe Custom Hook

A context's value is almost always `undefined` before a provider mounts, so the context type should include `undefined` and every consumer should go through a hook that asserts the provider exists rather than accessing the raw context directly.

```typescript
interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<User>('/auth/login', { email, password });
    setUser(response.data);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ✅ Every consumer goes through this hook — never useContext(AuthContext) directly
function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// USAGE:
function ProfileMenu() {
  const { user, logout } = useAuth(); // never undefined, no null checks needed
  return user ? <button onClick={logout}>Log out {user.name}</button> : null;
}
```

The thrown error turns a silent `undefined.user` crash deep in a component tree into an immediate, actionable message at the exact call site that forgot the provider.

## 5. Event Handler Typing

React's synthetic events are generic over the DOM element they attach to. Typing the handler's parameter with the matching element (`HTMLButtonElement`, `HTMLInputElement`, `HTMLFormElement`) gives you the correct, non-`any` shape for `event.target` and `event.currentTarget`.

```typescript
interface LoginFormState {
  email: string;
  password: string;
}

function LoginForm({ onSubmit }: { onSubmit: (data: LoginFormState) => void }) {
  const [form, setForm] = useState<LoginFormState>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    onSubmit(form);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setForm({ email: '', password: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" value={form.email} onChange={handleChange} onKeyDown={handleKeyDown} />
      <input name="password" type="password" value={form.password} onChange={handleChange} />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Log in</button>
    </form>
  );
}
```

Typing `handleChange`'s parameter as `React.MouseEvent<HTMLInputElement>` instead of `ChangeEvent` is a common slip — TypeScript would reject `event.target.value` usage patterns that don't exist on that event, which is exactly the point of typing the DOM element explicitly rather than leaving the parameter untyped.

## 6. React.memo and useCallback with TypeScript

`React.memo` needs a type parameter (or infers it from the wrapped component) so its optional custom-comparison function still sees typed `prevProps`/`nextProps`. `useCallback` should let TypeScript infer the function type from its body rather than restating the signature, since a restated signature can silently drift from the real implementation.

```typescript
interface RowProps {
  order: { id: number; status: 'pending' | 'shipped' | 'delivered'; total: number };
  onSelect: (orderId: number) => void;
}

const OrderRow = React.memo(
  function OrderRow({ order, onSelect }: RowProps) {
    return (
      <tr onClick={() => onSelect(order.id)}>
        <td>{order.id}</td>
        <td>{order.status}</td>
        <td>${order.total.toFixed(2)}</td>
      </tr>
    );
  },
  (prev, next) => prev.order.status === next.order.status && prev.order.total === next.order.total
);

function OrderTable({ orders }: { orders: RowProps['order'][] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // inferred as (orderId: number) => void — stable identity across renders
  const handleSelect = useCallback((orderId: number) => {
    setSelectedId(orderId);
  }, []);

  return (
    <table>
      <tbody>
        {orders.map(order => (
          <OrderRow key={order.id} order={order} onSelect={handleSelect} />
        ))}
      </tbody>
    </table>
  );
}
```

`handleSelect` keeps the same reference between renders because its dependency array is empty, which lets `React.memo`'s comparator actually skip re-renders for unaffected rows — without a stable callback identity, memoizing `OrderRow` would do nothing.

## 7. forwardRef with TypeScript

A styled input that still needs to expose focus/blur to its parent (for validation, autofocus, or "scroll to first error") must forward its ref through `React.forwardRef<Element, Props>` — a plain function component cannot receive a `ref` prop.

```typescript
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, id, ...inputProps }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="form-field">
        <label htmlFor={inputId}>{label}</label>
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          className={error ? 'input-error' : undefined}
          {...inputProps}
        />
        {error && <span className="field-error">{error}</span>}
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';

// USAGE: focus the first invalid field after a failed submit
function SignupForm() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [emailError, setEmailError] = useState<string | undefined>();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = emailRef.current?.value ?? '';
    if (!email.includes('@')) {
      setEmailError('Enter a valid email');
      emailRef.current?.focus();
      return;
    }
    setEmailError(undefined);
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormInput ref={emailRef} label="Email" error={emailError} name="email" />
      <button type="submit">Sign up</button>
    </form>
  );
}
```

`React.InputHTMLAttributes<HTMLInputElement>` gives `FormInputProps` every native input attribute (`name`, `type`, `placeholder`, `onChange`, ...) for free, so the wrapper stays a thin, fully-typed layer over the real `<input>` rather than a hand-maintained list of passthrough props.

## 8. Render Props and HOC with TypeScript

Render props and higher-order components both need a generic type parameter for the data they carry — the component doesn't know that type; only its caller does, so the generic has to flow from the call site through the wrapper and into the render function or wrapped component.

```typescript
// RENDER PROP: generic on the fetched resource type
interface FetchRenderProps<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface DataFetcherProps<T> {
  url: string;
  children: (props: FetchRenderProps<T>) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then(res => res.json() as Promise<T>)
      .then(json => setData(json))
      .catch(err => setError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [url]);

  return <>{children({ data, loading, error })}</>;
}

// USAGE:
interface Invoice { id: number; amountDue: number }

<DataFetcher<Invoice> url="/api/invoices/42">
  {({ data, loading, error }) => {
    if (loading) return <Spinner />;
    if (error) return <ErrorBanner message={error} />;
    return data && <span>Due: ${data.amountDue}</span>;
  }}
</DataFetcher>

// HOC: injects an `isAuthenticated` prop, generic over the wrapped component's own props
function withAuthGuard<P extends object>(Component: React.ComponentType<P>) {
  return function AuthGuarded(props: P) {
    const { user } = useAuth();
    if (!user) {
      return <Navigate to="/login" />;
    }
    return <Component {...props} />;
  };
}

const ProtectedDashboard = withAuthGuard(Dashboard);
```

`P extends object` on the HOC is what lets `{...props}` forward the wrapped component's actual prop shape without widening it to `any` — TypeScript still checks that `<ProtectedDashboard someProp="x" />` matches `Dashboard`'s real props.

## 9. Typing a Redux Store and Slice

Redux Toolkit infers most action types from the slice's reducers, so the manual work is narrowed to three things: the slice's own state shape, the root state type derived from the store, and typed versions of `useDispatch`/`useSelector` so components never call the untyped hooks directly.

```typescript
// features/cart/cartSlice.ts
interface CartItem {
  sku: string;
  quantity: number;
  price: number;
}

interface CartState {
  items: CartItem[];
  status: 'idle' | 'checking-out' | 'error';
}

const initialState: CartState = { items: [], status: 'idle' };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    itemAdded(state, action: PayloadAction<CartItem>) {
      state.items.push(action.payload); // Immer lets this look mutable but stay immutable
    },
    itemRemoved(state, action: PayloadAction<{ sku: string }>) {
      state.items = state.items.filter(item => item.sku !== action.payload.sku);
    },
    checkoutStarted(state) {
      state.status = 'checking-out';
    },
  },
});

export const { itemAdded, itemRemoved, checkoutStarted } = cartSlice.actions;
export default cartSlice.reducer;

// store.ts
const store = configureStore({
  reducer: { cart: cartSlice.reducer, user: userReducer },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

// typed hooks — every component uses these, never the raw react-redux hooks
const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// USAGE:
function CartSummary() {
  const items = useAppSelector(state => state.cart.items); // state is RootState, fully typed
  const dispatch = useAppDispatch();

  return (
    <button onClick={() => dispatch(itemRemoved({ sku: 'sku-1' }))}>
      Remove ({items.length} in cart)
    </button>
  );
}
```

`PayloadAction<T>` types the `action.payload` field per reducer case, and deriving `RootState` from `store.getState` instead of hand-writing it means the type always matches the store's real, combined shape — adding a slice to `configureStore` automatically updates every `useAppSelector` call site.

## 10. Generic Components: A Reusable Table&lt;T&gt;

A table, list, or select that's reused across a codebase for different row shapes should be written once as a generic component, with the row type `T` flowing into column definitions, the row key, and the render output — instead of duplicating the component per entity.

```typescript
interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}

function Table<T>({ rows, columns, getRowKey, onRowClick }: TableProps<T>) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map(col => <th key={col.header}>{col.header}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={getRowKey(row)} onClick={() => onRowClick?.(row)}>
            {columns.map(col => <td key={col.header}>{col.render(row)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// USAGE: T is inferred as Invoice from `rows` — no explicit <Invoice> needed
interface Invoice {
  id: number;
  customer: string;
  amountDue: number;
}

<Table<Invoice>
  rows={invoices}
  getRowKey={invoice => invoice.id}
  columns={[
    { header: 'Customer', render: invoice => invoice.customer },
    { header: 'Amount Due', render: invoice => `$${invoice.amountDue.toFixed(2)}` },
  ]}
  onRowClick={invoice => navigate(`/invoices/${invoice.id}`)}
/>
```

Because `Column<T>['render']` takes a `T`, TypeScript rejects a column that assumes a field the row type doesn't have — swap `rows` to a list of `User` objects and every `render: invoice => invoice.amountDue` call fails to compile immediately, instead of rendering `undefined` in production.

## Interview Questions and Answers

### 1. Why type `children` as `React.ReactNode` instead of `JSX.Element`?

**Answer:** `JSX.Element` only covers a single rendered element and rejects strings, numbers, arrays, fragments, and `null` — all of which are valid React children. `React.ReactNode` is the union that actually matches what `children` can legally be, so a component like `<Card>Just text</Card>` type-checks correctly.

### 2. How do you make a prop required only for specific variants of a component?

**Answer:** Model the props as a discriminated union keyed on a `variant` (or `kind`) field, with each member interface adding its own required fields — for example an `ErrorAlertProps` variant requiring `onRetry` while `InfoAlertProps` does not. TypeScript then narrows the union inside a `switch (props.variant)`, so accessing `props.onRetry` is only allowed in the branch where it's guaranteed to exist, and omitting it on an `error` alert fails at compile time.

### 3. Why does `useContext` typically return `T | undefined`, and how do you avoid null checks everywhere?

**Answer:** The context has to have some default value before a provider mounts, and `undefined` is the honest one — claiming a fake default (`{}` cast as `T`) just hides the bug. The fix is a custom hook (`useAuth`, `useTheme`) that calls `useContext` once, throws if the value is `undefined`, and returns the narrowed non-null type, so every other component in the tree calls the safe hook instead of the raw context.

### 4. How do you type an event handler for a text input's `onChange`?

**Answer:** `(event: React.ChangeEvent<HTMLInputElement>) => void`. The generic parameter tells TypeScript which DOM element `event.target` refers to, so `event.target.value` and `event.target.checked` are typed correctly instead of falling back to `any` on an untyped `event`.

### 5. Why can't you pass a `ref` prop to a plain function component, and how does `forwardRef` fix it?

**Answer:** Function components don't automatically receive a second `ref` argument the way class components' underlying DOM nodes do — React treats `ref` as a reserved prop that bypasses the normal props object. `React.forwardRef<HTMLInputElement, FormInputProps>((props, ref) => ...)` explicitly opts the component into receiving that ref and forwarding it to the real `<input>`, which is what lets a parent call `inputRef.current?.focus()` on a custom wrapper component.

### 6. What's the point of `React.memo`'s second argument, and does it work without `useCallback`?

**Answer:** The second argument is a custom equality function that decides whether to skip a re-render; without it, `memo` does a shallow prop comparison by default. It only helps if the props being compared are stable between renders — if a parent passes a new inline callback on every render, `memo` sees a new function reference every time and re-renders anyway, which is why memoized child components are usually paired with `useCallback` on the handlers passed to them.

### 7. How do you type a Redux Toolkit slice so `action.payload` isn't `any`?

**Answer:** Type each reducer's action parameter as `PayloadAction<T>` from `@reduxjs/toolkit`, where `T` is the shape of that specific action's payload — `PayloadAction<{ sku: string }>` for a "remove item" action, for instance. Redux Toolkit then generates the matching typed action creator automatically, so calling `itemRemoved({ sku: 'x' })` is checked against that same `T` at the call site.

### 8. Why derive `RootState` and `AppDispatch` from the store instead of writing them by hand?

**Answer:** `type RootState = ReturnType<typeof store.getState>` and `type AppDispatch = typeof store.dispatch` stay automatically in sync with whatever reducers are actually registered in `configureStore`. A hand-written `interface RootState` would silently drift out of date the moment someone adds or renames a slice, and every `useSelector` call using the stale type would compile without catching the mismatch.

### 9. How do you write one `Table` component that works for both `Invoice` rows and `User` rows without losing type safety?

**Answer:** Make the component generic — `function Table<T>({ rows, columns, getRowKey }: TableProps<T>)` — with `Column<T>['render']` typed as `(row: T) => React.ReactNode`. TypeScript infers `T` from the `rows` array passed in, so a column definition that references a field missing from that particular `T` fails to compile, which is the whole benefit over a loosely typed table that accepts `rows: any[]`.

### 10. What's the generic constraint doing in `function withAuthGuard<P extends object>(Component: React.ComponentType<P>)`?

**Answer:** `P extends object` lets the HOC accept a component with any props shape while still being able to spread `{...props}` onto it safely — without the constraint, `P` could theoretically be a primitive type that spreading doesn't make sense for. It also means the returned wrapped component (`AuthGuarded`) keeps the original component's exact prop types, so callers still get full autocomplete and type-checking on `ProtectedDashboard`'s props.

## Revision Checklist

- [ ] Type component props including `children` as `React.ReactNode`, with optional fields marked `?`.
- [ ] Model component variants as a discriminated union so variant-specific props become required only where they apply.
- [ ] Type `useState` explicitly when the value is nullable or a union; type `useReducer` actions as a discriminated union with an exhaustive `switch`.
- [ ] Wrap `useContext` in a custom hook that throws on `undefined` instead of letting every consumer null-check the raw context.
- [ ] Type event handlers with the correct synthetic event and DOM element generic (`ChangeEvent<HTMLInputElement>`, `FormEvent<HTMLFormElement>`, `MouseEvent<HTMLButtonElement>`).
- [ ] Use `React.forwardRef<Element, Props>` for any wrapper that needs to expose a native DOM ref (focus, scroll, measure) to its parent.
- [ ] Explain how `React.memo`'s comparator and `useCallback`'s stable identity work together — and why one without the other often does nothing.
- [ ] Type a Redux Toolkit slice with `PayloadAction<T>`, and derive `RootState`/`AppDispatch` from the store instead of hand-writing them.
- [ ] Write at least one generic component (`Table<T>`, `List<T>`) where the row/item type flows into columns, keys, and render output.
