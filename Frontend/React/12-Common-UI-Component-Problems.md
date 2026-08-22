# Common UI Component Problems

Live coding rounds almost always land on one of these six components — a search box, an infinite list, a dropdown, a modal, a toast system, or pagination — because each one packs several real interview signals (state management, cleanup, race conditions, accessibility) into something you can build in 20-30 minutes. This guide gives a working implementation for each, with the search component built up in the three stages interviewers actually ask for.

## 1. Search Component with Debounce

### Level 1: naive search — fires on every keystroke

```tsx
function BasicSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${searchQuery}`);
      const data = await response.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          handleSearch(e.target.value);
        }}
        placeholder="Search..."
      />
      {loading && <div>Loading...</div>}
      <ul>
        {results.map(result => (
          <li key={result.id}>{result.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

This is the version most candidates write first, and it's the one interviewers expect you to catch yourself: typing "react" fires 5 separate API calls, one per keystroke. It works, but it wastes bandwidth and hammers the backend — the natural follow-up question is "how would you cut that down?"

### Level 2: debounced search — one call after typing stops

```tsx
function debounce<T extends any[]>(
  func: (...args: T) => void,
  delay: number
) {
  let timeoutId: NodeJS.Timeout;

  return function debounced(...args: T) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

function SearchWithDebounce() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Recreated only once — a fresh debounce() call on every render would
  // reset the internal timer and defeat the debounce entirely.
  const debouncedSearch = useMemo(() => {
    return debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${searchQuery}`);
        const data = await response.json();
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300); // wait 300ms after the user stops typing
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  return (
    <div>
      <input value={query} onChange={handleInputChange} placeholder="Search..." />
      {loading && <div>Loading...</div>}
      <ul>
        {results.map(result => (
          <li key={result.id}>{result.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

`debounce` collapses a burst of calls into one, firing only after `delay` ms of silence — five keystrokes in quick succession now produce exactly one fetch instead of five. The one thing that breaks this in practice is recreating the debounced function on every render (e.g. defining it inline in the render body instead of via `useMemo`/`useRef`); each new closure gets its own `timeoutId`, so the debounce timer never actually accumulates across keystrokes.

### Level 3: cancel stale requests with AbortController

```tsx
function AdvancedSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    // Cancel whatever request is still in flight before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/api/search?q=${searchQuery}`, {
        signal: abortControllerRef.current.signal
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Search failed:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(() => debounce(handleSearch, 300), [handleSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  return (
    <div>
      <input value={query} onChange={handleInputChange} placeholder="Search..." />
      {loading && <div>Loading...</div>}
      <ul>
        {results.map(result => (
          <li key={result.id}>{result.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

Debouncing alone doesn't fix everything: if a slow request for "rea" resolves *after* a fast request for "react", the stale "rea" results can overwrite the correct "react" results on screen — a classic race condition. `AbortController` closes that gap by cancelling the previous in-flight request the moment a new one starts, so a request that gets aborted never reaches its `then`/`setResults` with stale data; the `AbortError` it throws is caught and deliberately ignored.

## 2. Infinite Scroll with IntersectionObserver

```tsx
interface Post {
  id: number;
  title: string;
  content: string;
}

function InfiniteScroll() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/posts?page=${page}&limit=10`);
      const newPosts = await response.json();

      if (newPosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
        setPage(prev => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  // Load more posts the moment the sentinel element scrolls into view
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading) {
        loadMore();
      }
    }, {
      threshold: 0.1 // trigger once 10% of the sentinel is visible
    });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, loading]);

  return (
    <div>
      <div>
        {posts.map(post => (
          <div key={post.id} style={{ padding: '20px', borderBottom: '1px solid #ccc' }}>
            <h3>{post.title}</h3>
            <p>{post.content}</p>
          </div>
        ))}
      </div>

      {/* Sentinel element — observing when this is visible triggers load more */}
      <div ref={observerRef} style={{ padding: '20px', textAlign: 'center' }}>
        {loading && <div>Loading more...</div>}
        {!hasMore && <div>No more posts</div>}
      </div>
    </div>
  );
}
```

The mechanism: an empty "sentinel" `div` sits after the last post; `IntersectionObserver` watches it and fires a callback the instant it enters the viewport, which calls `loadMore()` to fetch and append the next page. This is strictly better than the older pattern of a `scroll` event listener plus `getBoundingClientRect()` math, because the browser does the visibility tracking off the main thread instead of running your handler on every single scroll tick — no manual throttling needed, and no layout thrashing from repeatedly reading `getBoundingClientRect()`.

## 3. Dropdown / Select Component

```tsx
interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function Dropdown({ options, value, onChange, placeholder = 'Select...' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  // Close the dropdown on an outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus the search input as soon as the menu opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option: DropdownOption) => {
    onChange(option.value);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '200px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px',
          textAlign: 'left',
          border: '1px solid #ccc',
          background: 'white',
          cursor: 'pointer'
        }}
      >
        {selectedOption?.label || placeholder}
        <span style={{ float: 'right' }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          border: '1px solid #ccc',
          background: 'white',
          zIndex: 10,
          marginTop: '5px'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{
              width: '100%',
              padding: '10px',
              border: 'none',
              borderBottom: '1px solid #eee',
              boxSizing: 'border-box'
            }}
          />

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflow: 'auto' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  style={{
                    padding: '10px',
                    cursor: 'pointer',
                    background: value === option.value ? '#f0f0f0' : 'white'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background =
                      value === option.value ? '#f0f0f0' : 'white';
                  }}
                >
                  {option.label}
                </li>
              ))
            ) : (
              <li style={{ padding: '10px', color: '#999' }}>No options found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Usage
function App() {
  const [selected, setSelected] = useState('');

  return (
    <Dropdown
      options={[
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
        { value: 'angular', label: 'Angular' }
      ]}
      value={selected}
      onChange={setSelected}
      placeholder="Choose framework"
    />
  );
}
```

Two details here are the actual interview signal, beyond just rendering a list: click-outside detection binds on `mousedown` (not `click`) so the menu closes before the click's own `click` handler would otherwise fire on whatever is underneath, and the search input autofocuses via a `ref` + `useEffect` keyed on `isOpen` so a keyboard-first user can start filtering the instant the menu opens without an extra click.

## 4. Modal / Dialog Component

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
}

function Modal({ isOpen, onClose, title, children, onConfirm }: ModalProps) {
  // Close on Escape, and lock page scroll while the modal is open
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1001,
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()} // don't let inner clicks bubble to the overlay
      >
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px' }}>{children}</div>

        <div style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}
          >
            Cancel
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              style={{ padding: '10px 20px', border: 'none', background: '#007bff', color: 'white', cursor: 'pointer', borderRadius: '4px' }}
            >
              Confirm
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// Usage
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>Open Modal</button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Action"
        onConfirm={() => {
          console.log('Confirmed!');
          setIsModalOpen(false);
        }}
      >
        <p>Are you sure you want to delete this item?</p>
      </Modal>
    </div>
  );
}
```

The overlay's `onClick={onClose}` and the modal panel's `onClick={(e) => e.stopPropagation()}` work together: any click that reaches the overlay (meaning it landed outside the panel) closes the modal, while a click inside the panel is stopped before it can bubble up to that same overlay handler. The `useEffect` cleanup is what makes this safe to mount and unmount repeatedly — every open toggles `document.body.style.overflow` back to `'unset'` and removes the `keydown` listener on close, so nothing leaks if the modal is opened and closed many times in one session.

## 5. Toast Notification System

```tsx
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

const ToastContext = React.createContext<{
  toasts: Toast[];
  showToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
} | undefined>(undefined);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'], duration = 3000) => {
    const id = Math.random().toString(36);
    const newToast: Toast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const context = React.useContext(ToastContext);
  if (!context) return null;

  const { toasts, removeToast } = context;

  const getBackgroundColor = (type: Toast['type']) => {
    const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
    return colors[type];
  };

  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 2000 }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            background: getBackgroundColor(toast.type),
            color: 'white',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minWidth: '300px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            animation: 'slideIn 0.3s ease'
          }}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '10px' }}
          >
            ✕
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Usage
function App() {
  const { showToast } = useToast();

  return (
    <div>
      <button onClick={() => showToast('Success!', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error!', 'error')}>Show Error</button>
      <button onClick={() => showToast('Info!', 'info')}>Show Info</button>
    </div>
  );
}

function Root() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}
```

This is the real-world shape of a toast system: a `Context` holds the list of active toasts plus `showToast`/`removeToast`, a single `ToastContainer` rendered once near the root subscribes to that context and renders whatever is in the array, and any component anywhere in the tree calls `showToast` via the `useToast` hook without prop drilling. Auto-dismissal is just a `setTimeout` scheduled at creation time that calls the same `removeToast` a user's manual "✕" click would call — one removal path handles both.

## 6. Pagination Component

```tsx
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const getPageNumbers = () => {
    const delta = 2; // how many pages to show on each side of the current page
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1); // gap of exactly one page — show it instead of "..."
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center' }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{ padding: '8px 12px', border: '1px solid #ccc', background: currentPage === 1 ? '#f5f5f5' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
      >
        Previous
      </button>

      {pageNumbers.map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '...'}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            background: page === currentPage ? '#007bff' : 'white',
            color: page === currentPage ? 'white' : 'black',
            cursor: page === '...' ? 'default' : 'pointer'
          }}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{ padding: '8px 12px', border: '1px solid #ccc', background: currentPage === totalPages ? '#f5f5f5' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
      >
        Next
      </button>
    </div>
  );
}

// Usage
function DataTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalItems = 100;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const items = allItems.slice(startIndex, endIndex);

  return (
    <div>
      <table>
        <tbody>
          {items.map(item => (
            <tr key={item.id}><td>{item.name}</td></tr>
          ))}
        </tbody>
      </table>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
```

The core trick is `getPageNumbers()`: it always keeps page 1, page `totalPages`, and a `delta`-wide window around the current page, then walks the resulting sorted list and drops in `'...'` wherever consecutive kept pages aren't adjacent (a gap of exactly one page is unrolled into the actual number instead of a dot, since showing "..." for a single hidden page reads worse than just showing it). This keeps the control's width roughly constant regardless of whether `totalPages` is 5 or 5,000, which is the real reason production pagination UIs use ellipsis windowing instead of rendering every page number.

## Interview Questions and Answers

### 1. Why isn't debouncing alone enough to make a search box correct?

**Answer:** Debouncing only controls *how often* requests are sent, not the *order in which responses arrive*. If a request for a shorter, earlier query happens to resolve after a request for a longer, later query, its stale response can overwrite the correct one already on screen. Fixing that race requires either cancelling the earlier request (AbortController) or tagging each response with its query and ignoring any response that doesn't match the current input.

### 2. Why use `AbortController` instead of a boolean "cancelled" flag to handle stale requests?

**Answer:** A boolean flag checked after `await fetch(...)` resolves still lets the network request run to completion in the background, wasting bandwidth and server work, and it requires manually re-checking the flag at every await point. `AbortController.abort()` actually terminates the underlying HTTP request immediately, throws a distinguishable `AbortError` you can filter out in the `catch` block, and composes cleanly with `fetch`'s built-in `signal` option instead of hand-rolled bookkeeping.

### 3. Why does infinite scroll use `IntersectionObserver` instead of a `scroll` event listener?

**Answer:** A `scroll` listener fires continuously as the user scrolls, forcing you to throttle it and manually compute `getBoundingClientRect()` on every tick just to ask "is the sentinel visible yet" — expensive and easy to get wrong. `IntersectionObserver` asks the browser to answer that exact visibility question asynchronously off the main thread, and only calls back when the intersection state actually changes, so there's no manual throttling and no layout-thrashing reads.

### 4. Why does the dropdown's click-outside handler listen on `mousedown` rather than `click`?

**Answer:** `mousedown` fires before `click`, so closing the menu on `mousedown` guarantees the menu is already closed by the time any `click` handler underneath it (or on the trigger button itself) runs. Listening on `click` instead can create ordering bugs — e.g. a click on the trigger button both closing the menu via the outside-click handler and immediately reopening it via the button's own `onClick`.

### 5. Why does the modal both add a `keydown` listener and reset `document.body.style.overflow` inside the same `useEffect`, and why does the cleanup function matter here?

**Answer:** Both are page-global side effects — a global key listener and a global style change — that must not outlive the modal being open, or they'll affect the rest of the app even after the modal closes. The cleanup function returned from `useEffect` runs on every close and on unmount, removing the listener and restoring `overflow: 'unset'`; without it, closing the modal without unmounting the component would leave scroll permanently locked and stack up duplicate `keydown` listeners on repeated opens.

### 6. Why implement the toast system with React Context and a hook instead of a global mutable array plus manual re-renders?

**Answer:** Context lets any component in the tree call `showToast` without the parent chain having to pass the function down as props (no prop drilling), while state updates through `setToasts` still go through React's normal render cycle so the `ToastContainer` re-renders correctly and predictably. A module-level mutable array bypasses React's rendering model entirely, so nothing would visually update unless you manually forced a re-render from outside React.

### 7. What's wrong with generating toast ids using `Math.random().toString(36)`, and what would you use in a production system?

**Answer:** It's not cryptographically unique — with enough toasts in a session, collisions become possible, and a duplicate `id` breaks the `key` prop in the list render and can cause `removeToast` to remove the wrong toast. `crypto.randomUUID()` (or a small library like `nanoid`) gives collision-resistant unique ids with effectively the same one-line ergonomics.

### 8. Why does the pagination component collapse the page list into windows with "..." instead of rendering every page number?

**Answer:** Rendering all `totalPages` buttons is fine for 5 pages but unusable for 5,000 — the control would overflow its container and the DOM would carry hundreds of unnecessary button nodes. Keeping only the first page, last page, and a small window around the current page (with "..." filling the gaps) keeps the control's width bounded and its render cost constant regardless of dataset size.

## Revision Checklist

- [ ] Build the search component through all three stages: naive, debounced, and AbortController-cancelled — and explain what each stage fixes.
- [ ] Explain the race condition debouncing alone doesn't solve, and why `AbortController` (not a boolean flag) is the fix.
- [ ] Implement infinite scroll with a sentinel element and `IntersectionObserver`, and explain why it beats a `scroll` listener.
- [ ] Implement a dropdown with click-outside close (on `mousedown`), search filtering, and autofocus on open.
- [ ] Implement a modal with `Escape`-to-close, scroll lock, and cleanup that undoes both on close/unmount.
- [ ] Implement a Context-based toast system with auto-dismissal and manual dismissal sharing one removal path.
- [ ] Implement pagination with ellipsis windowing and explain why it's bounded-width regardless of total pages.
- [ ] Be able to name the production hardening each component is missing (portals for modal/toast, `crypto.randomUUID()` for ids, ARIA roles for accessibility) even though the interview version skips it for time.
