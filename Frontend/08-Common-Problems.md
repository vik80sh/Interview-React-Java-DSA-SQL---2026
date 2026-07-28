# Common React Interview Problems
## Search, Infinite Scroll, Dropdown, Modal, Toast, Pagination - Real Solutions

---

## TABLE OF CONTENTS
1. Search Component (Debounce + API)
2. Infinite Scroll / Virtual Scroll
3. Dropdown / Select Component
4. Modal / Dialog Component
5. Toast / Notification System
6. Pagination

---

# PROBLEM 1: SEARCH COMPONENT WITH DEBOUNCE

## Level 1: Basic Search (Easy)

```typescript
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

// PROBLEM: Makes API call on EVERY keystroke!
// For "react" (5 letters) = 5 API calls
```

---

## Level 2: With Debounce (Better)

```typescript
function SearchWithDebounce() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce search
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
    }, 300); // Wait 300ms after user stops typing
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  return (
    <div>
      <input
        value={query}
        onChange={handleInputChange}
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

// debounce function:
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

// NOW: Only 1 API call after user stops typing!
```

---

## Level 3: Advanced (Cancel Previous Requests)

```typescript
function AdvancedSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      // Cancel previous request
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
    },
    []
  );

  const debouncedSearch = useMemo(
    () => debounce(handleSearch, 300),
    [handleSearch]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  return (
    <div>
      <input
        value={query}
        onChange={handleInputChange}
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

// BENEFITS:
// - Debounces API calls
// - Cancels previous request if user types again
// - Handles race conditions
```

---

# PROBLEM 2: INFINITE SCROLL

## With IntersectionObserver

```typescript
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

  // Load more posts
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

  // Intersection Observer: Load when bottom is visible
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading) {
        loadMore();
      }
    }, {
      threshold: 0.1 // Trigger when 10% visible
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

      {/* Sentinel element - observing when this is visible triggers load more */}
      <div ref={observerRef} style={{ padding: '20px', textAlign: 'center' }}>
        {loading && <div>Loading more...</div>}
        {!hasMore && <div>No more posts</div>}
      </div>
    </div>
  );
}

// STEP-BY-STEP:
// 1. User scrolls to bottom
// 2. Sentinel element becomes visible
// 3. IntersectionObserver triggers
// 4. loadMore() fetches next page
// 5. New posts appended
// 6. Repeat
```

---

# PROBLEM 3: DROPDOWN COMPONENT

## Complete Dropdown Implementation

```typescript
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

  // Filter options based on search
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
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
      {/* Trigger Button */}
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

      {/* Dropdown Menu */}
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
          {/* Search Input */}
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

          {/* Options List */}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflow: 'auto' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  style={{
                    padding: '10px',
                    cursor: 'pointer',
                    background: value === option.value ? '#f0f0f0' : 'white',
                    ':hover': { background: '#f5f5f5' }
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

// USAGE:
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

---

# PROBLEM 4: MODAL COMPONENT

## Complete Modal Implementation

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
}

function Modal({ isOpen, onClose, title, children, onConfirm }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scroll
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
        onClick={(e) => e.stopPropagation()} // Prevent closing on inner click
      >
        {/* Header */}
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
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {children}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #eee',
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #ccc',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: '#007bff',
                color: 'white',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              Confirm
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// USAGE:
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

---

# PROBLEM 5: TOAST NOTIFICATION SYSTEM

## Complete Toast Implementation

```typescript
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

// Global context for toasts
const ToastContext = React.createContext<{
  toasts: Toast[];
  showToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
} | undefined>(undefined);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'], duration = 3000) => {
    const id = Math.random().toString(36);
    const newToast: Toast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

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
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b'
    };
    return colors[type];
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 2000
    }}>
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
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              marginLeft: '10px'
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// Hook for using toasts
function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// USAGE:
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

// Wrap app:
function Root() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}
```

---

# PROBLEM 6: PAGINATION

## Complete Pagination Component

```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i == 1 || i == totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
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
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          padding: '8px 12px',
          border: '1px solid #ccc',
          background: currentPage === 1 ? '#f5f5f5' : 'white',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
        }}
      >
        Previous
      </button>

      {/* Page Numbers */}
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

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          padding: '8px 12px',
          border: '1px solid #ccc',
          background: currentPage === totalPages ? '#f5f5f5' : 'white',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
        }}
      >
        Next
      </button>
    </div>
  );
}

// USAGE:
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
```

---

# SUMMARY: Common Problems Mastery

✅ **Search:**
- [ ] Understand debouncing
- [ ] Know when to cancel requests
- [ ] Can handle loading states

✅ **Infinite Scroll:**
- [ ] Understand IntersectionObserver
- [ ] Know sentinel element pattern
- [ ] Can manage page state

✅ **Dropdown:**
- [ ] Can implement dropdown from scratch
- [ ] Understand filtering
- [ ] Know click-outside pattern

✅ **Modal:**
- [ ] Can implement modal overlay
- [ ] Know keyboard handling (Escape)
- [ ] Understand focus management

✅ **Toast:**
- [ ] Can implement context-based system
- [ ] Know auto-dismissal
- [ ] Understand positioning

✅ **Pagination:**
- [ ] Know ellipsis logic
- [ ] Understand disabled states
- [ ] Can render page numbers

---

**Master these problems—they're 80% of "build a component" interview questions!**
