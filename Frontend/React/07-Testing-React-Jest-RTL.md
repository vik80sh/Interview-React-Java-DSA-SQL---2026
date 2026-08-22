# Testing React with Jest and React Testing Library

Testing is the single most-probed practical skill in a React interview: almost every panel asks you to write or critique a component test. The two ideas that separate a strong answer from a weak one are testing behavior instead of implementation, and querying the DOM the way a user or assistive technology would.

## 1. Testing Pyramid and Testing Levels

```
            /\
           /  \
          /E2E \        End-to-End Tests (~10%)
         /------\
        /        \
       /Integration\    Integration Tests (~30%)
      /------------\
     /              \
    /   Unit Tests   \  Unit Tests (~60%)
   /__________________\
```

More unit tests, fewer end-to-end tests. Unit tests isolate a single function or component; integration tests exercise several units together (a form plus its validation and submit handler); end-to-end tests drive a full user journey through a real or simulated browser.

```typescript
// Unit: a single function
function add(a: number, b: number): number {
  return a + b;
}
test('add returns sum of two numbers', () => {
  expect(add(2, 3)).toBe(5);
});

// Integration: multiple units working together
test('form submits and updates user profile', () => {
  render(<UserForm onSubmit={handleSubmit} />);
  userEvent.type(screen.getByLabelText('Name'), 'John');
  userEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(handleSubmit).toHaveBeenCalledWith({ name: 'John' });
});

// E2E: an entire user flow through a real browser
test('user can sign up and view dashboard', async () => {
  // navigate to signup, fill the form, submit, assert redirect and loaded data
});
```

## 2. Test Behavior, Not Implementation

This is the single most important testing principle to state out loud in an interview. A test that reaches into internal state or calls a private method breaks on every refactor even when the feature still works; a test that asserts on what the user sees survives refactors and only fails when the feature actually breaks.

```typescript
// Avoid: asserting on internal state
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}

test('counter increments state', () => {
  const { getByRole } = render(<Counter />);
  getByRole('button');
  // reaching into internal state here is the anti-pattern
});

// Prefer: asserting on rendered, user-visible output
test('counter displays incremented count when clicked', () => {
  render(<Counter />);
  const button = screen.getByRole('button', { name: /count: 0/i });
  userEvent.click(button);
  expect(screen.getByRole('button', { name: /count: 1/i })).toBeInTheDocument();
});
```

The same principle applies to interactions: simulate what a user actually does rather than manipulating the DOM directly.

```typescript
// Avoid: not realistic, bypasses React's event handling
test('search executes', () => {
  const { getByDisplayValue } = render(<SearchForm />);
  fireEvent.change(getByDisplayValue(''), { target: { value: 'react' } });
});

// Prefer: simulate real user behavior end to end
test('user can search and see results', async () => {
  render(<SearchForm />);
  userEvent.type(screen.getByPlaceholderText('Search...'), 'react');
  userEvent.click(screen.getByRole('button', { name: 'Search' }));
  const results = await screen.findByRole('list');
  expect(results).toBeInTheDocument();
});
```

## 3. Jest Fundamentals

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};

# setupTests.js
import '@testing-library/jest-dom';
```

Core matchers cover equality, truthiness, numbers, strings, arrays, objects, and mock functions:

```typescript
expect(value).toBe(5);                    // strict equality (===)
expect(value).toEqual({ a: 1 });          // deep equality
expect(value).toStrictEqual({ a: 1 });    // deep equality, no undefined props
expect(value).toBeTruthy();
expect(value).toBeNull();
expect(value).toBeGreaterThan(5);
expect(value).toBeCloseTo(3.14, 2);
expect(value).toMatch(/pattern/);
expect([1, 2, 3]).toContain(2);
expect(obj).toHaveProperty('name');
expect(obj).toMatchObject({ name: 'John' });
expect(fn).toHaveBeenCalledTimes(3);
expect(fn).toHaveBeenCalledWith(arg1, arg2);
```

`test`/`it`, `describe`, and the lifecycle hooks structure a suite:

```typescript
describe('Calculator', () => {
  describe('add function', () => {
    test('adds two numbers', () => {
      expect(add(2, 3)).toBe(5);
    });
  });
});

beforeAll(() => setupDatabase());   // once, before all tests in the file
beforeEach(() => jest.clearAllMocks()); // before every test
afterEach(() => jest.resetAllMocks());
afterAll(() => cleanupDatabase());
```

### Mocking functions and modules

A mock is a fake function that stands in for a real dependency so a test can control its output and verify how it was called.

```typescript
test('calls callback when button clicked', () => {
  const mockCallback = jest.fn();
  render(<Button onClick={mockCallback}>Click me</Button>);
  userEvent.click(screen.getByRole('button'));
  expect(mockCallback).toHaveBeenCalledTimes(1);
});

test('calls implementation multiple times', () => {
  const mockFn = jest.fn(x => x * 2);
  expect(mockFn(5)).toBe(10);
  expect(mockFn).toHaveBeenNthCalledWith(1, 5);
});
```

Mock a whole module when a component depends on a service rather than a prop callback:

```typescript
// userService.ts
export async function fetchUser(id: number) {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

// UserProfile.tsx
function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState(null);
  useEffect(() => { fetchUser(userId).then(setUser); }, [userId]);
  return <div>{user?.name}</div>;
}

// UserProfile.test.tsx
import * as userService from './userService';
jest.mock('./userService');

test('displays user name after loading', async () => {
  (userService.fetchUser as jest.Mock).mockResolvedValue({ id: 1, name: 'John' });
  render(<UserProfile userId={1} />);

  expect(screen.queryByText('John')).not.toBeInTheDocument(); // still loading
  expect(await screen.findByText('John')).toBeInTheDocument(); // after resolve
});

test('handles error', async () => {
  (userService.fetchUser as jest.Mock).mockRejectedValue(new Error('API Error'));
  render(<UserProfile userId={1} />);
  expect(await screen.findByText(/error/i)).toBeInTheDocument();
});
```

## 4. Querying with React Testing Library

### Query priority (most to least preferred)

This ordering is the second most commonly probed concept after "behavior not implementation," and it exists because it pushes tests toward accessible markup:

1. **Accessible queries** — the way a real user or a screen reader finds the element:
   `getByRole('button', { name: 'Submit' })`, `getByLabelText('Username')`,
   `getByPlaceholderText('Search...')`, `getByText('Welcome')`, `getByDisplayValue('john@example.com')`.
2. **Semantic queries** — still tied to user-facing markup: `getByAltText('Profile picture')`, `getByTitle('Menu')`.
3. **Test IDs — last resort**: `getByTestId('user-profile')`, used only when no accessible or semantic query is available (a bare `<div>` with no role or text).
4. **Avoid entirely**: CSS selectors and DOM structure, such as `container.querySelector('.btn')`. They couple the test to styling and markup that has nothing to do with the feature's behavior.

### getBy / queryBy / findBy

```typescript
// getBy*: throws if not found — use when the element should already be present
const button = screen.getByRole('button');

// queryBy*: returns null if not found — use to assert absence
expect(screen.queryByRole('button')).not.toBeInTheDocument();

// findBy*: returns a promise, retries until found (default timeout ~1000ms) — use for async appearance
const button = await screen.findByRole('button');
```

```typescript
test('button is initially hidden then visible', async () => {
  render(<ConditionalButton show={false} />);

  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Show' }));

  const button = await screen.findByRole('button', { name: 'Click me' });
  expect(button).toBeInTheDocument();
});
```

## 5. Simulating User Interactions

`userEvent` simulates the full sequence of events a real user triggers (focus, keydown, input, change, blur); `fireEvent` dispatches a single raw DOM event and can silently skip behavior that depends on that sequence, such as blur handlers or controlled-input focus management. Prefer `userEvent` by default.

```typescript
test('typing in input updates value', async () => {
  render(<SearchBox />);
  const input = screen.getByRole('textbox');
  userEvent.clear(input);
  userEvent.type(input, 'react');
  expect(input).toHaveValue('react');
});

test('form submits on enter key', async () => {
  const mockSubmit = jest.fn();
  render(<SearchForm onSubmit={mockSubmit} />);
  userEvent.type(screen.getByRole('textbox'), 'test{enter}');
  expect(mockSubmit).toHaveBeenCalled();
});

test('clicking button calls handler', async () => {
  const mockClick = jest.fn();
  render(<Button onClick={mockClick}>Delete</Button>);
  userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(mockClick).toHaveBeenCalledTimes(1);
});
```

## 6. Async Testing

```typescript
test('loads and displays user', async () => {
  render(<UserProfile userId={1} />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  const userName = await screen.findByText('John'); // waits for the async render
  expect(userName).toBeInTheDocument();
});

test('shows error message after failed fetch', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
  render(<UserProfile userId={1} />);
  expect(await screen.findByText(/network error/i)).toBeInTheDocument();
});

test('updates when props change', async () => {
  const { rerender } = render(<UserProfile userId={1} />);
  await screen.findByText('User 1');

  rerender(<UserProfile userId={2} />);
  expect(await screen.findByText('User 2')).toBeInTheDocument();
});
```

Avoid arbitrary `setTimeout`/sleep-based waits; `findBy*` and `waitFor` poll until the assertion passes or time out, which is both faster and less flaky.

## 7. Testing Forms

```typescript
function LoginForm() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      setError('All fields required');
      return;
    }
    try {
      await loginAPI(credentials);
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={credentials.email} placeholder="Email"
        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} />
      <input type="password" value={credentials.password} placeholder="Password"
        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} />
      <button type="submit">Login</button>
      {error && <div role="alert">{error}</div>}
    </form>
  );
}

describe('LoginForm', () => {
  test('validates required fields', async () => {
    render(<LoginForm />);
    userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('All fields required');
  });

  test('submits form with valid credentials', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ token: 'abc' })));
    render(<LoginForm />);
    userEvent.type(screen.getByPlaceholderText('Email'), 'john@example.com');
    userEvent.type(screen.getByPlaceholderText('Password'), 'password123');
    userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('shows error on failed login', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Invalid'));
    render(<LoginForm />);
    userEvent.type(screen.getByPlaceholderText('Email'), 'john@example.com');
    userEvent.type(screen.getByPlaceholderText('Password'), 'wrong');
    userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });
});
```

Use the accessible `role="alert"` region for error text rather than a `data-testid` — it makes the test resilient and matches the query-priority guidance above.

## 8. Testing Custom Hooks

`renderHook` mounts a hook in a minimal test component and exposes its return value through `result.current`; `act` flushes state updates triggered outside of an event handler.

```typescript
function usePagination(items: any[], pageSize: number) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentItems = items.slice(startIndex, startIndex + pageSize);

  const goToPage = (page: number) => setCurrentPage(Math.min(page, totalPages));
  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  return { currentPage, currentItems, nextPage, prevPage, totalPages };
}

import { renderHook, act } from '@testing-library/react';

describe('usePagination', () => {
  test('returns correct page items', () => {
    const { result } = renderHook(() => usePagination(['a', 'b', 'c', 'd', 'e'], 2));
    expect(result.current.currentItems).toEqual(['a', 'b']);
    expect(result.current.totalPages).toBe(3);
  });

  test('navigates to next page', () => {
    const { result } = renderHook(() => usePagination(['a', 'b', 'c', 'd', 'e'], 2));
    act(() => { result.current.nextPage(); });
    expect(result.current.currentPage).toBe(2);
    expect(result.current.currentItems).toEqual(['c', 'd']);
  });

  test('prevents navigating past last page', () => {
    const { result } = renderHook(() => usePagination(['a', 'b', 'c'], 2));
    act(() => {
      result.current.nextPage();
      result.current.nextPage();
      result.current.nextPage();
    });
    expect(result.current.currentPage).toBe(2); // stopped at last page
  });
});
```

## 9. Testing Context Providers

Render the consumer inside the real provider rather than mocking `useContext` — this keeps the test asserting on rendered behavior instead of the wiring.

```typescript
const ThemeContext = React.createContext<{ theme: 'light' | 'dark' }>({ theme: 'light' });

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');
  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
      <button onClick={toggle}>Toggle Theme</button>
    </ThemeContext.Provider>
  );
}

function ThemedButton() {
  const { theme } = React.useContext(ThemeContext);
  return <button style={{ background: theme === 'dark' ? '#000' : '#fff' }}>Button</button>;
}

test('provides theme context to children', () => {
  render(<ThemeProvider><ThemedButton /></ThemeProvider>);
  expect(screen.getByRole('button', { name: 'Button' })).toHaveStyle('background: #fff');
});

test('toggles theme', () => {
  render(<ThemeProvider><ThemedButton /></ThemeProvider>);
  userEvent.click(screen.getByRole('button', { name: 'Toggle Theme' }));
  expect(screen.getByRole('button', { name: 'Button' })).toHaveStyle('background: #000');
});
```

## 10. Testing Components with API Calls and localStorage

Mock the network or storage boundary, never the component under test.

```typescript
test('displays data after API call', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ id: 1, name: 'John' }) } as Response)
  );

  render(<UserProfile userId={1} />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  expect(await screen.findByText('John')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith('/api/users/1');
});
```

MSW (Mock Service Worker) intercepts at the network layer instead of stubbing `fetch`, which is more realistic and works the same way in tests and in the browser:

```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/users/1', (req, res, ctx) => res(ctx.json({ id: 1, name: 'John' })))
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('displays user data', async () => {
  render(<UserProfile userId={1} />);
  expect(await screen.findByText('John')).toBeInTheDocument();
});
```

`localStorage` is a real, synchronous global in jsdom, so it can be used directly instead of mocked:

```typescript
function PreferencesForm() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return <select value={theme} onChange={(e) => handleThemeChange(e.target.value)}>{/* options */}</select>;
}

beforeEach(() => localStorage.clear());

test('loads theme from localStorage', () => {
  localStorage.setItem('theme', 'dark');
  render(<PreferencesForm />);
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('dark');
});

test('saves theme to localStorage', () => {
  render(<PreferencesForm />);
  userEvent.selectOptions(screen.getByRole('combobox'), 'dark');
  expect(localStorage.getItem('theme')).toBe('dark');
});
```

## 11. Coverage as a Signal, Not a Target

Line, branch, function, and statement coverage (`npm test -- --coverage`) show which code ran, not whether the assertions are meaningful. Aim for strong coverage of critical paths and edge cases — roughly 80-90% — rather than chasing 100%; a component with every branch exercised but only happy-path assertions is a false sense of safety.

```typescript
function calculateDiscount(price: number, isVIP: boolean): number {
  if (isVIP) {
    return price > 100 ? price * 0.2 : price * 0.1;
  }
  return 0;
}

test('non-VIP gets no discount', () => {
  expect(calculateDiscount(50, false)).toBe(0);
});
test('VIP gets 10% discount for low price', () => {
  expect(calculateDiscount(50, true)).toBe(5);
});
test('VIP gets 20% discount for high price', () => {
  expect(calculateDiscount(150, true)).toBe(30);
});
```

## Interview Questions and Answers

### 1. What does "test behavior, not implementation" mean in practice?

**Answer:** Assert on what the user sees and can do — rendered text, roles, form values, callback invocations — rather than internal state, private methods, or component structure. A behavior-focused test keeps passing through a refactor that preserves the feature, while an implementation-focused test breaks on refactors that change nothing observable.

### 2. What is React Testing Library's query priority, and why does it matter?

**Answer:** Prefer `getByRole`, `getByLabelText`, and `getByPlaceholderText`/`getByText` first because they mirror how a real user or screen reader finds an element; fall back to `getByAltText`/`getByTitle` for semantic markup; use `getByTestId` only as a last resort. This ordering pushes the component toward accessible markup as a side effect of writing the test, and keeps the test decoupled from CSS classes or DOM structure.

### 3. What's the difference between `getBy`, `queryBy`, and `findBy`?

**Answer:** `getBy*` throws immediately if the element is missing, so it's for elements expected to be present now. `queryBy*` returns `null` instead of throwing, so it's for asserting an element is absent. `findBy*` returns a promise that retries until the element appears or a timeout elapses, so it's for elements that appear asynchronously.

### 4. Why prefer `userEvent` over `fireEvent`?

**Answer:** `fireEvent` dispatches one raw DOM event, which can skip behavior a real interaction would trigger, such as focus, blur, or the full keydown/input/change sequence. `userEvent` simulates the complete sequence a browser produces for a real user action, so it catches bugs that only show up with realistic event ordering.

### 5. How do you test a component that makes an API call?

**Answer:** Mock the network boundary — either `global.fetch`/the service module with `jest.mock`, or intercept requests with MSW — never mock the component itself. Render the component, assert the loading state is shown first, then use `findBy*` to wait for the resolved UI, and optionally assert the mock was called with the right arguments.

### 6. How do you test a component that reads and writes `localStorage`?

**Answer:** `localStorage` is a real synchronous API in jsdom, so no mock is needed — clear it in `beforeEach` for isolation, seed it before rendering to test the read path, and assert on `localStorage.getItem` after an interaction to test the write path.

### 7. How do you test a custom hook in isolation?

**Answer:** Use `renderHook` from `@testing-library/react` to mount the hook without a full component, and read its return value from `result.current`. Wrap any call that triggers a state update outside of an event handler in `act` so React flushes the update before the next assertion.

### 8. Is 100% test coverage a meaningful goal?

**Answer:** No. Coverage percentages show which lines executed, not whether the assertions are strong or the edge cases are handled. Aim for high coverage of critical paths, branches, and error states — usually 80-90% is a healthy target — rather than treating the number itself as the goal.

### 9. What's the difference between a unit, integration, and end-to-end test for a React app?

**Answer:** A unit test isolates one function or component with its dependencies stubbed. An integration test exercises several units together, such as a form, its validation, and its submit handler. An end-to-end test drives a real or simulated browser through a full user journey across multiple pages. The pyramid favors many fast unit tests, a moderate number of integration tests, and few, high-value end-to-end tests.

### 10. When should you reach for a `data-testid`?

**Answer:** Only when no accessible or semantic query can identify the element — for example, a purely decorative wrapper `div` with no role, label, or text. Reaching for `data-testid` by default is a sign the test isn't validating anything about accessibility or user-facing behavior, and it's the most fragile query when markup changes.

## Revision Checklist

- [ ] Explain the testing pyramid and why unit tests should outnumber integration and E2E tests.
- [ ] State and demonstrate "test behavior, not implementation" with a concrete before/after example.
- [ ] Recite the RTL query priority order and justify why `getByRole`/`getByLabelText` beat `getByTestId`.
- [ ] Explain `getBy` vs `queryBy` vs `findBy` and when each is correct.
- [ ] Justify `userEvent` over `fireEvent` for realistic interaction simulation.
- [ ] Write a form test that covers validation, successful submit, and a failed-submit error path.
- [ ] Test a custom hook with `renderHook` and `act`, and a context provider by rendering the real provider.
- [ ] Mock an API call or `localStorage` at the correct boundary, and explain why 100% coverage isn't the goal.
