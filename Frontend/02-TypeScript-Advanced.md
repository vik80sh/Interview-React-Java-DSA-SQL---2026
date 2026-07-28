# TypeScript for React - Advanced Patterns & Interview Guide
## Complete Guide with Real Examples & Solutions

---

## TABLE OF CONTENTS
1. TypeScript Fundamentals for React
2. Advanced Types & Patterns
3. Common Interview Questions
4. Real-World Examples
5. Type Safety Best Practices

---

# PART 1: TYPESCRIPT FUNDAMENTALS FOR REACT

## 1.1 Basic Types in React

### Component Props Typing

```typescript
// ❌ NO TYPE SAFETY
function Button(props) {
  return <button>{props.label}</button>;
}

// ✅ WITH TYPES
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean; // Optional
  variant?: 'primary' | 'secondary'; // Union type
}

function Button({ label, onClick, disabled, variant }: ButtonProps) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={variant}
    >
      {label}
    </button>
  );
}

// USAGE:
<Button label="Click me" onClick={() => console.log('clicked')} />
<Button 
  label="Delete" 
  onClick={handleDelete} 
  variant="primary"
  disabled={isLoading}
/>
```

---

### State Typing with useState

```typescript
// Basic types
const [count, setCount] = useState<number>(0);
const [name, setName] = useState<string>('John');
const [isVisible, setIsVisible] = useState<boolean>(false);

// Complex types
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

const [user, setUser] = useState<User | null>(null);

// Union types
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

// Array types
const [todos, setTodos] = useState<Todo[]>([]);
const [items, setItems] = useState<Array<string>>([]);

// Inferring types (when obvious)
const [user, setUser] = useState(null as User | null); // Type inference
```

---

### Event Typing

```typescript
// Button click
function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
  console.log(event.currentTarget.value);
}

// Input change
function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
  const value = event.target.value;
  const checked = event.currentTarget.checked;
}

// Form submit
function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
}

// Key press
function handleKeyPress(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key === 'Enter') {
    // Handle enter
  }
}

// USAGE IN COMPONENT:
interface InputProps {
  onValueChange: (value: string) => void;
}

function MyInput({ onValueChange }: InputProps) {
  return (
    <input 
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onValueChange(e.target.value)}
    />
  );
}
```

---

## 1.2 Advanced Types

### Generics

```typescript
// INTERVIEW: What are generics and why use them?

// BASIC GENERIC FUNCTION
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'John', age: 30 };
const name = getProperty(user, 'name'); // Type: string
const age = getProperty(user, 'age');   // Type: number
// getProperty(user, 'email'); // ERROR: 'email' is not a property

// GENERIC INTERFACE
interface Container<T> {
  value: T;
  getValue(): T;
  setValue(value: T): void;
}

const stringContainer: Container<string> = {
  value: 'hello',
  getValue() { return this.value; },
  setValue(value) { this.value = value; }
};

// GENERIC REACT COMPONENT
interface ApiResponse<T> {
  data: T;
  status: number;
  error: string | null;
}

function useApi<T>(url: string): ApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState(200);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json() as Promise<T>)
      .then(data => { setData(data); setStatus(200); })
      .catch(err => setError(err.message));
  }, [url]);

  return { data: data!, status, error };
}

// USAGE:
interface User {
  id: number;
  name: string;
}

function UserProfile() {
  const { data: user, loading } = useApi<User>('/api/user/1');
  return <div>{user?.name}</div>;
}

// BENEFIT: Reusable, type-safe, works with any data type
```

---

### Union & Intersection Types

```typescript
// UNION TYPES: Variable can be one of multiple types
type Status = 'idle' | 'loading' | 'success' | 'error';
type ID = string | number;

const id: ID = 123; // ✅
const id2: ID = 'abc'; // ✅
const id3: ID = true; // ❌ ERROR

// INTERSECTION TYPES: Combines multiple types
interface Admin {
  permissions: string[];
  canDelete: boolean;
}

interface User {
  name: string;
  email: string;
}

type AdminUser = Admin & User; // Has all properties of both

const adminUser: AdminUser = {
  name: 'John',
  email: 'john@example.com',
  permissions: ['read', 'write'],
  canDelete: true
};

// PRACTICAL EXAMPLE: Component variant
type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface BaseButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

interface PrimaryButtonProps extends BaseButtonProps {
  variant: 'primary';
  large?: boolean;
}

interface DangerButtonProps extends BaseButtonProps {
  variant: 'danger';
  confirmText: string; // Required for danger button
}

type ButtonProps = PrimaryButtonProps | DangerButtonProps;

function Button(props: ButtonProps) {
  if (props.variant === 'danger') {
    // props.confirmText is available here
    return <button>{props.confirmText}</button>;
  } else {
    // props.large is available here
    return <button>{props.children}</button>;
  }
}
```

---

### Conditional Types

```typescript
// INTERVIEW: What are conditional types and when to use them?

// BASIC CONDITIONAL TYPE
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>;  // true
type B = IsString<number>;   // false

// PRACTICAL EXAMPLE: Return type based on input
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function add(a: number, b: number): number {
  return a + b;
}

type AddReturnType = ReturnType<typeof add>; // number

// USEFUL FOR API RESPONSES
type Flatten<T> = T extends Array<infer U> ? U : T;

type Str = Flatten<string[]>; // string
type Num = Flatten<number>; // number

// REAL WORLD: Determine if response is success or error
type ApiResponse<T> = 
  T extends { error: any } 
    ? { status: 'error'; data: null } 
    : { status: 'success'; data: T };

type UserResponse = ApiResponse<{ id: number; name: string }>; 
// { status: 'success'; data: { id: number; name: string } }

type ErrorResponse = ApiResponse<{ error: string }>;
// { status: 'error'; data: null }
```

---

### Utility Types

```typescript
// Partial<T>: Make all properties optional
interface User {
  id: number;
  name: string;
  email: string;
}

type PartialUser = Partial<User>; // All properties optional
const updateUser: PartialUser = { name: 'Jane' }; // ✅

// Required<T>: Make all properties required
type RequiredUser = Required<User>; // All properties required

// ReadOnly<T>: Make all properties read-only
type ReadOnlyUser = ReadOnly<User>;
const user: ReadOnlyUser = { id: 1, name: 'John', email: 'john@example.com' };
// user.name = 'Jane'; // ❌ ERROR: Cannot assign to readonly property

// Pick<T, K>: Select specific properties
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: number; name: string }

// Omit<T, K>: Exclude specific properties
type UserWithoutEmail = Omit<User, 'email'>;
// { id: number; name: string }

// Record<K, T>: Create object with specific keys and values
type UserRoles = Record<'admin' | 'user' | 'guest', string>;
// { admin: string; user: string; guest: string }

const roles: UserRoles = {
  admin: 'Administrator',
  user: 'Regular User',
  guest: 'Guest User'
};

// PRACTICAL EXAMPLE: State update
interface FormState {
  name: string;
  email: string;
  password: string;
  terms: boolean;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function validateForm(data: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!data.name) errors.name = 'Name required';
  if (!data.email) errors.email = 'Email required';
  return errors;
}
```

---

## 1.3 Type Guards & Narrowing

### Type Guards

```typescript
// ❌ WITHOUT type guard
function processValue(value: string | number) {
  console.log(value.toUpperCase()); // ERROR: number doesn't have toUpperCase
}

// ✅ WITH type guard
function processValue(value: string | number) {
  if (typeof value === 'string') {
    console.log(value.toUpperCase()); // ✅ value is string here
  } else {
    console.log(value.toFixed(2)); // ✅ value is number here
  }
}

// TYPE GUARD PATTERN
interface User {
  type: 'user';
  name: string;
}

interface Admin {
  type: 'admin';
  permissions: string[];
}

type Account = User | Admin;

function getPermissions(account: Account): string[] {
  if (account.type === 'admin') {
    return account.permissions; // ✅ TypeScript knows it's Admin
  }
  return []; // ✅ User has no permissions
}

// CUSTOM TYPE GUARD FUNCTION
function isUser(account: Account): account is User {
  return account.type === 'user';
}

function processAccount(account: Account) {
  if (isUser(account)) {
    console.log(account.name); // ✅ account is User
  } else {
    console.log(account.permissions); // ✅ account is Admin
  }
}

// INTERVIEW: Type guard with instanceof
function processError(error: unknown) {
  if (error instanceof Error) {
    console.log(error.message); // ✅ error is Error
  } else {
    console.log(error); // ✅ error is unknown
  }
}
```

---

### Exhaustiveness Checking

```typescript
// INTERVIEW: Ensure all cases are handled

type Status = 'idle' | 'loading' | 'success' | 'error';

function getStatusMessage(status: Status): string {
  switch (status) {
    case 'idle':
      return 'Idle';
    case 'loading':
      return 'Loading...';
    case 'success':
      return 'Success!';
    case 'error':
      return 'Error!';
  }
  // ✅ All cases covered, no default needed
}

// ❌ INCOMPLETE - Missing case
function getStatusMessage(status: Status): string {
  switch (status) {
    case 'idle':
      return 'Idle';
    case 'loading':
      return 'Loading...';
    // Missing success and error!
  }
  // ERROR: Function lacks ending return statement (when status is 'success' or 'error')
}

// PATTERN: Using exhaustive check function
function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${value}`);
}

function getStatusMessage(status: Status): string {
  switch (status) {
    case 'idle':
      return 'Idle';
    case 'loading':
      return 'Loading...';
    case 'success':
      return 'Success!';
    default:
      return assertNever(status); // ✅ If status is not handled, ERROR
  }
}

// If you add new status:
type Status = 'idle' | 'loading' | 'success' | 'error' | 'pending';

// Now getStatusMessage will ERROR because 'pending' is not handled
// This forces you to update all status handlers
```

---

# PART 2: REACT-SPECIFIC TYPESCRIPT PATTERNS

## 2.1 Component Types

### Function Component Types

```typescript
// SIMPLE: No props
type SimpleComponent = React.FC;
const Simple: React.FC = () => <div>Hello</div>;

// WITH PROPS
interface ButtonProps {
  label: string;
  onClick: () => void;
}

// Option 1: React.FC (deprecated, but still used)
const Button: React.FC<ButtonProps> = ({ label, onClick }) => (
  <button onClick={onClick}>{label}</button>
);

// Option 2: Function with return type (modern, preferred)
function Button({ label, onClick }: ButtonProps): JSX.Element {
  return <button onClick={onClick}>{label}</button>;
}

// Option 3: Arrow function
const Button = ({ label, onClick }: ButtonProps): JSX.Element => (
  <button onClick={onClick}>{label}</button>
);

// WITH CHILDREN
interface CardProps {
  title: string;
  children: React.ReactNode; // Text, elements, anything
}

const Card = ({ title, children }: CardProps) => (
  <div>
    <h2>{title}</h2>
    {children}
  </div>
);

// WITH CHILDREN EXPLICITLY TYPED
interface ListProps {
  items: string[];
  children: (item: string) => React.ReactNode; // Function render prop
}

const List = ({ items, children }: ListProps) => (
  <ul>
    {items.map((item, i) => <li key={i}>{children(item)}</li>)}
  </ul>
);

// USAGE:
<List items={['a', 'b']} children={(item) => <strong>{item}</strong>} />
```

---

### React.memo with TypeScript

```typescript
interface UserCardProps {
  user: User;
  onSelect: (userId: number) => void;
}

// Option 1: Wrap after creation
const UserCard = ({ user, onSelect }: UserCardProps) => (
  <div onClick={() => onSelect(user.id)}>{user.name}</div>
);

export default React.memo(UserCard);

// Option 2: Type memo with custom comparison
interface ButtonProps {
  count: number;
  onClick: () => void;
}

const Button = React.memo<ButtonProps>(
  ({ count, onClick }) => <button onClick={onClick}>{count}</button>,
  (prevProps, nextProps) => {
    // Return true if props are equal (don't re-render)
    return prevProps.count === nextProps.count;
  }
);
```

---

### ForwardRef with TypeScript

```typescript
// ❌ ERROR: Can't forward ref to function component
function Input(props: React.InputHTMLAttributes<HTMLInputElement>, ref) {
  return <input ref={ref} {...props} />;
}

// ✅ CORRECT: Use React.forwardRef
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => (
    <div>
      {label && <label>{label}</label>}
      <input ref={ref} {...props} />
    </div>
  )
);

// USAGE:
function Form() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <Input ref={inputRef} label="Username" />
      <button onClick={handleClick}>Focus Input</button>
    </div>
  );
}
```

---

## 2.2 Hooks with TypeScript

### useContext with TypeScript

```typescript
// ❌ ERROR: Accessing undefined context
const ThemeContext = React.createContext<{ theme: string }>();

function useTheme() {
  const context = useContext(ThemeContext);
  // context might be undefined!
  return context.theme; // ERROR
}

// ✅ CORRECT: Check for undefined
const ThemeContext = React.createContext<{ theme: string } | undefined>(undefined);

function useTheme() {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  
  return context.theme;
}

// ✅ BETTER: Create custom hook with assertion
function useThemeContext(): { theme: string } {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  
  return context;
}

// USAGE:
function MyComponent() {
  const { theme } = useThemeContext(); // ✅ Never undefined
}
```

---

### useCallback with TypeScript

```typescript
interface TodoListProps {
  todos: Todo[];
  onAddTodo: (text: string) => void;
}

function TodoList({ todos, onAddTodo }: TodoListProps) {
  // Type is inferred from usage
  const handleAdd = useCallback((text: string) => {
    onAddTodo(text);
  }, [onAddTodo]);

  return <div onClick={() => handleAdd('test')}>Add</div>;
}

// EXPLICIT TYPING:
const handleAdd = useCallback<(text: string) => void>((text) => {
  onAddTodo(text);
}, [onAddTodo]);
```

---

### useReducer with TypeScript

```typescript
// Define action types
type TodoAction = 
  | { type: 'ADD'; payload: string }
  | { type: 'DELETE'; payload: number }
  | { type: 'TOGGLE'; payload: number };

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const reducer = (state: Todo[], action: TodoAction): Todo[] => {
  switch (action.type) {
    case 'ADD':
      return [...state, { id: Date.now(), text: action.payload, completed: false }];
    
    case 'DELETE':
      return state.filter(t => t.id !== action.payload);
    
    case 'TOGGLE':
      return state.map(t => 
        t.id === action.payload ? { ...t, completed: !t.completed } : t
      );
    
    default:
      const _exhaustive: never = action;
      return _exhaustive; // Ensures all cases handled
  }
};

function TodoApp() {
  const [todos, dispatch] = useReducer(reducer, []);

  return (
    <div>
      <button onClick={() => dispatch({ type: 'ADD', payload: 'New todo' })}>
        Add
      </button>
    </div>
  );
}
```

---

## 2.3 Advanced Component Patterns

### Render Props with TypeScript

```typescript
// Define what the render function receives
interface RenderProps<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

interface DataFetcherProps<T> {
  url: string;
  children: (props: RenderProps<T>) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(url)
      .then(r => r.json() as Promise<T>)
      .then(data => { setData(data); setLoading(false); })
      .catch(err => { setError(err); setLoading(false); });
  }, [url]);

  return children({ data: data!, loading, error });
}

// USAGE:
interface User {
  id: number;
  name: string;
}

function App() {
  return (
    <DataFetcher<User> url="/api/user">
      {({ data, loading, error }) => (
        <>
          {loading && <div>Loading...</div>}
          {error && <div>Error: {error.message}</div>}
          {data && <div>{data.name}</div>}
        </>
      )}
    </DataFetcher>
  );
}
```

---

### HOC with TypeScript

```typescript
// Generic HOC that adds props
interface WithDataProps<T> {
  data: T;
  loading: boolean;
}

function withData<T, P extends WithDataProps<T>>(
  Component: React.ComponentType<P>,
  url: string
) {
  return (props: Omit<P, 'data' | 'loading'>) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetch(url)
        .then(r => r.json() as Promise<T>)
        .then(data => { setData(data); setLoading(false); });
    }, []);

    return <Component {...(props as P)} data={data!} loading={loading} />;
  };
}

// USAGE:
interface UserProps extends WithDataProps<User> {
  onUserLoaded?: () => void;
}

function UserComponent({ data, loading, onUserLoaded }: UserProps) {
  return <div>{data.name}</div>;
}

const UserWithData = withData<User, UserProps>(UserComponent, '/api/user');
```

---

# PART 3: COMMON INTERVIEW QUESTIONS

## Question 1: What is the difference between `interface` and `type`?

```typescript
// Both can define object shapes
interface User {
  name: string;
  age: number;
}

type UserType = {
  name: string;
  age: number;
};

// DIFFERENCES:

// 1. DECLARATION MERGING (interface only)
interface User {
  id: number; // Merged with above User interface
}

// 2. EXTENDS vs INTERSECTION
interface Admin extends User {
  permissions: string[];
}

type AdminType = UserType & { permissions: string[] };

// 3. TYPE ALIASES CAN USE UNIONS (type only)
type Status = 'active' | 'inactive';
// interface Status = 'active' | 'inactive'; // ❌ ERROR

// 4. TYPE ALIASES CAN USE MAPPED TYPES (type only)
type ReadOnlyUser = Readonly<User>;
// interface ReadOnlyUser = Readonly<User>; // ❌ ERROR

// RULE OF THUMB:
// - Use interface for object shapes (especially React props)
// - Use type for everything else (unions, primitives, mapped types)
```

---

## Question 2: How do you type Redux store?

```typescript
// State shape
interface AppState {
  user: User | null;
  todos: Todo[];
  loading: boolean;
}

// Action types (using discriminated unions)
type AppAction = 
  | { type: 'SET_USER'; payload: User }
  | { type: 'ADD_TODO'; payload: Todo }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGOUT' };

// Reducer
const reducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    // ... other cases
    default:
      const _exhaustive: never = action; // Ensures all cases handled
      return _exhaustive;
  }
};

// Type-safe dispatch
type AppDispatch = (action: AppAction) => void;

// Context
const AppContext = React.createContext<[AppState, AppDispatch] | undefined>(undefined);

function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

// USAGE:
function MyComponent() {
  const [state, dispatch] = useAppContext();
  
  // dispatch({ type: 'INVALID' }); // ❌ TYPE ERROR
  dispatch({ type: 'SET_USER', payload: { id: 1, name: 'John' } }); // ✅
}
```

---

## Question 3: How do you handle async operations with TypeScript?

```typescript
// Promise typing
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json() as Promise<User>;
}

// Using in component
function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return <div>{user?.name}</div>;
}

// With error handling
async function safeCall<T>(
  promise: Promise<T>
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// USAGE:
const { data, error } = await safeCall(fetchUser(1));
if (error) {
  console.error('Failed:', error.message);
} else {
  console.log('User:', data.name);
}
```

---

# SUMMARY: TypeScript Mastery Checklist

✅ **Fundamentals:**
- [ ] Can type React components and props
- [ ] Understand generics and when to use them
- [ ] Know interface vs type differences
- [ ] Can use utility types (Pick, Omit, Partial, Required)

✅ **Advanced:**
- [ ] Can create generic custom hooks
- [ ] Understand conditional types
- [ ] Can use discriminated unions effectively
- [ ] Know type guards and type narrowing

✅ **React Patterns:**
- [ ] Can type React.memo, forwardRef, useContext
- [ ] Understand render props with TypeScript
- [ ] Can create typed HOCs
- [ ] Know exhaustiveness checking

✅ **Common Issues:**
- [ ] Can fix "Object is possibly undefined" errors
- [ ] Know how to properly type event handlers
- [ ] Can work with unknown types safely

---

**Master TypeScript and React together—this combination is gold for big tech interviews!**
