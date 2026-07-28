# React Testing - Jest & React Testing Library Guide
## Complete Interview Preparation with Real Examples

---

## TABLE OF CONTENTS
1. Testing Philosophy
2. Jest Fundamentals
3. React Testing Library
4. Common Testing Patterns
5. Interview Questions & Answers

---

# PART 1: TESTING PHILOSOPHY

## Testing Pyramid

```
            /\
           /  \
          /E2E \          End-to-End Tests (10%)
         /------\
        /        \
       / Integration Tests \    (30%)
      /------------ ------\
     /                    \
    /    Unit Tests        \    (60%)
   /________________________\

RULE: More unit tests, fewer E2E tests
```

### Testing Levels Explained

```typescript
// UNIT TEST: Test a single function
function add(a: number, b: number): number {
  return a + b;
}

test('add returns sum of two numbers', () => {
  expect(add(2, 3)).toBe(5);
});

// INTEGRATION TEST: Test multiple units working together
test('form submits and updates user profile', () => {
  render(<UserForm onSubmit={handleSubmit} />);
  
  const nameInput = screen.getByLabelText('Name');
  const submitButton = screen.getByRole('button', { name: 'Submit' });
  
  userEvent.type(nameInput, 'John');
  userEvent.click(submitButton);
  
  expect(handleSubmit).toHaveBeenCalledWith({ name: 'John' });
});

// E2E TEST: Test entire user flow
test('user can sign up and view dashboard', async () => {
  // Launch browser
  // Navigate to signup page
  // Fill form
  // Submit
  // Verify redirected to dashboard
  // Check data loaded
});
```

---

## Testing Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ BAD: Testing implementation
function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}

test('counter increments state', () => {
  const { getByRole } = render(<Counter />);
  const button = getByRole('button');
  
  // Testing internal state (bad)
  expect(/* internal state */).toBe(1);
});

// ✅ GOOD: Testing user-visible behavior
test('counter displays incremented count when clicked', () => {
  render(<Counter />);
  
  const button = screen.getByRole('button', { name: /count: 0/i });
  userEvent.click(button);
  
  expect(screen.getByRole('button', { name: /count: 1/i })).toBeInTheDocument();
});
```

---

### 2. Test User Interactions

```typescript
// ❌ BAD: Not realistic
test('search executes', () => {
  const { getByDisplayValue } = render(<SearchForm />);
  const input = getByDisplayValue('');
  
  fireEvent.change(input, { target: { value: 'react' } });
  // This doesn't feel like user interaction
});

// ✅ GOOD: Simulate real user behavior
test('user can search and see results', async () => {
  render(<SearchForm />);
  
  const input = screen.getByPlaceholderText('Search...');
  userEvent.type(input, 'react');
  userEvent.click(screen.getByRole('button', { name: 'Search' }));
  
  // Wait for results
  const results = await screen.findByRole('list');
  expect(results).toBeInTheDocument();
});
```

---

# PART 2: JEST FUNDAMENTALS

## Setting Up Jest

```bash
# Installation
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Jest config (jest.config.js)
module.exports = {
  testEnvironment: 'jsdom', // For React components
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};

# Setup file (setupTests.js)
import '@testing-library/jest-dom';
```

---

## Basic Jest Matchers

```typescript
// EQUALITY
expect(value).toBe(5);           // Strict equality (===)
expect(value).toEqual({ a: 1 }); // Deep equality
expect(value).toStrictEqual({ a: 1 }); // Strict (no undefined properties)

// TRUTHINESS
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// NUMBERS
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(3.14, 2); // Approximate equality

// STRINGS
expect(value).toMatch(/pattern/);
expect(value).toContain('substring');

// ARRAYS
expect([1, 2, 3]).toContain(2);
expect([1, 2, 3]).toEqual([1, 2, 3]);
expect([1, 2, 3]).toHaveLength(3);

// OBJECTS
expect(obj).toHaveProperty('name');
expect(obj).toMatchObject({ name: 'John' });

// FUNCTIONS
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenCalledTimes(3);
expect(fn).toReturn();
```

---

## Mocking

### Mocking Functions

```typescript
// INTERVIEW: What is a mock and when to use it?

// ANSWER: Mock = Fake function to verify how it's called

test('calls callback when button clicked', () => {
  const mockCallback = jest.fn();
  
  render(<Button onClick={mockCallback}>Click me</Button>);
  userEvent.click(screen.getByRole('button'));
  
  expect(mockCallback).toHaveBeenCalledTimes(1);
  expect(mockCallback).toHaveBeenCalledWith();
});

// With return value
test('uses returned value', () => {
  const mockGetUser = jest.fn(() => ({ id: 1, name: 'John' }));
  
  const user = mockGetUser(1);
  
  expect(user.name).toBe('John');
  expect(mockGetUser).toHaveBeenCalledWith(1);
});

// With implementation
test('calls implementation multiple times', () => {
  const mockFn = jest.fn(x => x * 2);
  
  expect(mockFn(5)).toBe(10);
  expect(mockFn(3)).toBe(6);
  
  expect(mockFn).toHaveBeenNthCalledWith(1, 5);
  expect(mockFn).toHaveBeenNthCalledWith(2, 3);
});
```

---

### Mocking Modules

```typescript
// INTERVIEW: How to mock API calls in tests?

// userService.ts
export async function fetchUser(id: number) {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

// UserProfile.tsx
function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  return <div>{user?.name}</div>;
}

// UserProfile.test.tsx
import * as userService from './userService';

jest.mock('./userService');

test('displays user name after loading', async () => {
  const mockUser = { id: 1, name: 'John' };
  (userService.fetchUser as jest.Mock).mockResolvedValue(mockUser);
  
  render(<UserProfile userId={1} />);
  
  // While loading
  expect(screen.queryByText('John')).not.toBeInTheDocument();
  
  // After loading
  const userName = await screen.findByText('John');
  expect(userName).toBeInTheDocument();
});

// Alternative: Mock with mockImplementation
test('handles error', async () => {
  (userService.fetchUser as jest.Mock).mockRejectedValue(
    new Error('API Error')
  );
  
  render(<UserProfile userId={1} />);
  
  const error = await screen.findByText(/error/i);
  expect(error).toBeInTheDocument();
});
```

---

# PART 3: REACT TESTING LIBRARY

## Querying Elements

### Query Priority (Most to Least Preferred)

```typescript
// 1️⃣ ACCESSIBLE (BEST - users interact with these)
screen.getByRole('button', { name: 'Submit' });      // Button, link by label
screen.getByLabelText('Username');                   // Form inputs by label
screen.getByPlaceholderText('Search...');            // Input by placeholder
screen.getByText('Welcome');                         // Text content
screen.getByDisplayValue('john@example.com');        // Form input current value

// 2️⃣ SEMANTIC (GOOD - still user-facing)
screen.getByAltText('Profile picture');              // Images
screen.getByTitle('Menu');                           // HTML title attribute

// 3️⃣ TEST IDs (LAST RESORT - fragile to changes)
screen.getByTestId('user-profile');                  // data-testid attribute

// ❌ AVOID: CSS selectors, DOM structure
screen.getByClassName('btn-primary');                // Bad
container.querySelector('.btn');                     // Bad
```

---

### Different Query Types

```typescript
// getBy* = throws error if not found
const button = screen.getByRole('button');
// If not found: "Unable to find an accessible element with role 'button'"

// queryBy* = returns null if not found
const button = screen.queryByRole('button');
if (!button) {
  console.log('Button not found');
}

// findBy* = returns promise (for async elements)
const button = await screen.findByRole('button');
// Waits up to 1000ms for element

// PRACTICAL EXAMPLES:
test('button is initially hidden then visible', async () => {
  render(<ConditionalButton show={false} />);
  
  // Check not in document initially
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  
  // Trigger appearance
  userEvent.click(screen.getByRole('button', { name: 'Show' }));
  
  // Wait for button to appear
  const button = await screen.findByRole('button', { name: 'Click me' });
  expect(button).toBeInTheDocument();
});
```

---

## User Interactions

### userEvent vs fireEvent

```typescript
// ❌ fireEvent: Fires raw DOM events (doesn't mimic real user)
const input = screen.getByRole('textbox');
fireEvent.change(input, { target: { value: 'test' } });
// Doesn't trigger onBlur, focus management, etc.

// ✅ userEvent: Simulates realistic user interaction
const input = screen.getByRole('textbox');
userEvent.type(input, 'test');
// Triggers: focus, input, change, blur events
// Handles: keyboard events, selection behavior

// COMPARISON TABLE:
//                      fireEvent    userEvent
// Type text             No           Yes ✅
// Click                 Yes          Yes ✅ (better)
// Tab navigation        No           Yes ✅
// Double click          Yes          Yes ✅
// Hover                 Yes          Yes ✅
// Feels real?           No           Yes ✅

// PRACTICAL EXAMPLES:
test('typing in input updates value', async () => {
  render(<SearchBox />);
  
  const input = screen.getByRole('textbox');
  
  // Clear first
  userEvent.clear(input);
  
  // Type
  userEvent.type(input, 'react');
  
  // Verify
  expect(input).toHaveValue('react');
});

test('form submits on enter key', async () => {
  const mockSubmit = jest.fn();
  render(<SearchForm onSubmit={mockSubmit} />);
  
  const input = screen.getByRole('textbox');
  userEvent.type(input, 'test{enter}');
  
  expect(mockSubmit).toHaveBeenCalled();
});

test('clicking button calls handler', async () => {
  const mockClick = jest.fn();
  render(<Button onClick={mockClick}>Delete</Button>);
  
  userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  
  expect(mockClick).toHaveBeenCalledTimes(1);
});
```

---

## Async Testing

```typescript
// INTERVIEW: How to test async operations?

test('loads and displays user', async () => {
  render(<UserProfile userId={1} />);
  
  // Show loading first
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  // Wait for user name (waits up to 1000ms)
  const userName = await screen.findByText('John');
  expect(userName).toBeInTheDocument();
});

// Waiting with waitFor
test('shows error message after failed fetch', async () => {
  // Setup failed API
  jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
  
  render(<UserProfile userId={1} />);
  
  // Wait for error message
  const error = await screen.findByText(/network error/i);
  expect(error).toBeInTheDocument();
});

// Using waitFor for complex waits
test('updates when props change', async () => {
  const { rerender } = render(<UserProfile userId={1} />);
  
  await screen.findByText('User 1');
  
  // Change props
  rerender(<UserProfile userId={2} />);
  
  // Wait for new user
  const newUser = await screen.findByText('User 2');
  expect(newUser).toBeInTheDocument();
});
```

---

# PART 4: COMMON TESTING PATTERNS

## Pattern 1: Testing Forms

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
      const response = await loginAPI(credentials);
      // Success
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={credentials.email}
        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
        placeholder="Email"
      />
      <input
        type="password"
        value={credentials.password}
        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
        placeholder="Password"
      />
      <button type="submit">Login</button>
      {error && <div role="alert">{error}</div>}
    </form>
  );
}

// TESTS:
describe('LoginForm', () => {
  test('validates required fields', async () => {
    render(<LoginForm />);
    
    // Submit empty form
    userEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    // Check error message
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('All fields required');
  });

  test('submits form with valid credentials', async () => {
    // Mock API
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ token: 'abc' }))
    );

    render(<LoginForm />);
    
    // Fill form
    userEvent.type(screen.getByPlaceholderText('Email'), 'john@example.com');
    userEvent.type(screen.getByPlaceholderText('Password'), 'password123');
    
    // Submit
    userEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    // Verify no error shown
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('shows error on failed login', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Invalid'));

    render(<LoginForm />);
    
    userEvent.type(screen.getByPlaceholderText('Email'), 'john@example.com');
    userEvent.type(screen.getByPlaceholderText('Password'), 'wrong');
    userEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Invalid credentials');
  });
});
```

---

## Pattern 2: Testing Custom Hooks

```typescript
// usePagination.ts
function usePagination(items: any[], pageSize: number) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentItems = items.slice(startIndex, endIndex);
  
  const goToPage = (page: number) => {
    setCurrentPage(Math.min(page, totalPages));
  };
  
  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);
  
  return { currentPage, currentItems, nextPage, prevPage, totalPages };
}

// TESTS:
import { renderHook, act } from '@testing-library/react';

describe('usePagination', () => {
  test('returns correct page items', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    
    const { result } = renderHook(() => usePagination(items, 2));
    
    expect(result.current.currentItems).toEqual(['a', 'b']);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(3);
  });

  test('navigates to next page', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const { result } = renderHook(() => usePagination(items, 2));
    
    act(() => {
      result.current.nextPage();
    });
    
    expect(result.current.currentPage).toBe(2);
    expect(result.current.currentItems).toEqual(['c', 'd']);
  });

  test('prevents navigating past last page', () => {
    const items = ['a', 'b', 'c'];
    const { result } = renderHook(() => usePagination(items, 2));
    
    act(() => {
      result.current.nextPage();
      result.current.nextPage();
      result.current.nextPage();
    });
    
    expect(result.current.currentPage).toBe(2); // Stopped at last page
  });
});
```

---

## Pattern 3: Testing Context

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

// TESTS:
test('provides theme context to children', () => {
  render(
    <ThemeProvider>
      <ThemedButton />
    </ThemeProvider>
  );
  
  const button = screen.getByRole('button', { name: 'Button' });
  expect(button).toHaveStyle('background: #fff');
});

test('toggles theme', () => {
  render(
    <ThemeProvider>
      <ThemedButton />
    </ThemeProvider>
  );
  
  const button = screen.getByRole('button', { name: 'Button' });
  const toggleButton = screen.getByRole('button', { name: 'Toggle Theme' });
  
  userEvent.click(toggleButton);
  
  expect(button).toHaveStyle('background: #000');
});
```

---

# PART 5: INTERVIEW QUESTIONS

## Question 1: What's the difference between test, it, and describe?

```typescript
// All same thing:
test('does something', () => {});
it('does something', () => {});

// Grouping tests
describe('Calculator', () => {
  describe('add function', () => {
    test('adds two numbers', () => {
      expect(add(2, 3)).toBe(5);
    });
  });
  
  describe('subtract function', () => {
    test('subtracts two numbers', () => {
      expect(subtract(5, 3)).toBe(2);
    });
  });
});

// Other hooks
beforeAll(() => {
  // Runs once before all tests
  setupDatabase();
});

beforeEach(() => {
  // Runs before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Runs after each test
  jest.resetAllMocks();
});

afterAll(() => {
  // Runs once after all tests
  cleanupDatabase();
});
```

---

## Question 2: How do you test a component that uses localStorage?

```typescript
function PreferencesForm() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return <select value={theme} onChange={(e) => handleThemeChange(e.target.value)}>{/* options */}</select>;
}

// TESTS:
beforeEach(() => {
  localStorage.clear();
});

test('loads theme from localStorage', () => {
  localStorage.setItem('theme', 'dark');
  
  render(<PreferencesForm />);
  
  const select = screen.getByRole('combobox') as HTMLSelectElement;
  expect(select.value).toBe('dark');
});

test('saves theme to localStorage', () => {
  render(<PreferencesForm />);
  
  const select = screen.getByRole('combobox') as HTMLSelectElement;
  userEvent.selectOptions(select, 'dark');
  
  expect(localStorage.getItem('theme')).toBe('dark');
});
```

---

## Question 3: How do you test a component with API calls?

```typescript
// ANSWER: Mock the API, not the component

test('displays data after API call', async () => {
  // 1. Mock the API
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ id: 1, name: 'John' }),
    } as Response)
  );

  // 2. Render component
  render(<UserProfile userId={1} />);

  // 3. Verify loading state
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  // 4. Wait for data
  const userName = await screen.findByText('John');
  expect(userName).toBeInTheDocument();

  // 5. Verify API was called
  expect(fetch).toHaveBeenCalledWith('/api/users/1');
});

// ALTERNATIVE: Use MSW (Mock Service Worker) for more realistic mocking
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/users/1', (req, res, ctx) => {
    return res(ctx.json({ id: 1, name: 'John' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('displays user data', async () => {
  render(<UserProfile userId={1} />);
  
  const userName = await screen.findByText('John');
  expect(userName).toBeInTheDocument();
});
```

---

## Question 4: How do you achieve good test coverage?

```typescript
// Coverage types:
// - Line coverage: % of lines executed
// - Branch coverage: % of if/else branches
// - Function coverage: % of functions called
// - Statement coverage: % of statements executed

// Run coverage
npm test -- --coverage

// Example report:
// File        | Coverage
// Button.tsx  | 95.2%
// Form.tsx    | 87.3%
// Modal.tsx   | 91.4%

// TIPS:
// 1. Aim for 80-90% coverage (not 100%)
// 2. Focus on critical paths
// 3. Test edge cases

// EXAMPLE: Achieving coverage
function calculateDiscount(price: number, isVIP: boolean): number {
  if (isVIP) {
    if (price > 100) {
      return price * 0.2; // 20% off
    }
    return price * 0.1; // 10% off
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

// All branches covered!
```

---

# TESTING CHECKLIST FOR INTERVIEWS

✅ **Fundamentals:**
- [ ] Understand testing pyramid (unit, integration, E2E)
- [ ] Know difference between test, describe, beforeEach
- [ ] Understand mocks and when to use them
- [ ] Can write basic component tests

✅ **React Testing Library:**
- [ ] Know query priorities (getByRole > getByLabelText > getByTestId)
- [ ] Understand getBy vs queryBy vs findBy
- [ ] Can test async operations with findBy
- [ ] Know userEvent vs fireEvent

✅ **Common Patterns:**
- [ ] Can test forms and inputs
- [ ] Can test API calls with mocking
- [ ] Can test custom hooks
- [ ] Can test context providers

✅ **Advanced:**
- [ ] Understand coverage metrics
- [ ] Can set up MSW for realistic API mocking
- [ ] Know how to test performance
- [ ] Can test accessibility

---

**Master testing and you'll write more confident code—interviews LOVE this!**
