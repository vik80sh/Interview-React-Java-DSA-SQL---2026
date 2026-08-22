# Performance Optimization

Interviewers use performance questions to see whether you can reason about real user impact — bundle weight, render count, DOM size — rather than just naming APIs. This guide covers the render-level and load-level techniques; `useMemo` and `useCallback` are covered in [02-Hooks-Deep-Dive.md](./02-Hooks-Deep-Dive.md) and are only cross-referenced here.

## 1. `React.memo` and Custom Comparison

`React.memo` wraps a component so React skips re-rendering it when its props are shallowly equal to the previous render's props. Shallow equality means primitives are compared by value and objects/arrays/functions are compared by reference, so a new object literal created on every parent render defeats the memoization even if its contents are identical. When a prop is an object you cannot easily stabilize (for example it originates from an API response and gets a new reference each fetch), pass a second argument — a custom comparator — that returns `true` when the render can be skipped and `false` when it must proceed.

```javascript
function UserCard({ user, status }) {
  console.log('UserCard rendered');
  return <div>{user.name} - {status}</div>;
}

// Return true => props are "equal enough", skip the re-render.
// Return false => something relevant changed, re-render.
function arePropsEqual(prevProps, nextProps) {
  return (
    prevProps.status === nextProps.status &&
    prevProps.user.id === nextProps.user.id &&
    prevProps.user.updatedAt === nextProps.user.updatedAt
  );
}

export const MemoizedUserCard = React.memo(UserCard, arePropsEqual);
```

`user` is a fresh object on every fetch, but the comparator only cares about `id` and `updatedAt`. If neither changed, React skips re-rendering `UserCard` even though `user` itself is a new reference. Reach for `React.memo` on components that render often with unchanged data and are expensive enough to matter — wrapping every component adds a comparison cost of its own.

## 2. Code Splitting with `React.lazy` and `Suspense`

By default a bundler compiles the whole app into one JavaScript file, so a regular user's first page load downloads the admin dashboard, the settings page, and every other route even though they will never open most of them. Code splitting breaks the bundle into separate chunks, and `React.lazy` + dynamic `import()` defer downloading a chunk until the component is actually rendered. While the chunk is in flight, React "suspends" that part of the tree and shows the nearest `<Suspense>` fallback instead of a blank screen or a crash.

```javascript
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// AdminPanel and its dependencies (charts, tables, admin-only libs)
// are compiled into their own chunk, e.g. AdminPanel.[hash].js
const AdminPanel = lazy(() => import('./AdminPanel'));
const Dashboard = lazy(() => import('./Dashboard'));

function App({ user }) {
  return (
    <Suspense fallback={<div className="page-skeleton">Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        {user.role === 'admin' && (
          <Route path="/admin" element={<AdminPanel />} />
        )}
      </Routes>
    </Suspense>
  );
}
```

A regular user's browser never requests `AdminPanel.[hash].js` — the chunk simply is not referenced because the route is never rendered for them. Only when an admin navigates to `/admin` does React attempt to render the lazy component, find the module isn't downloaded yet, suspend, and show the fallback while the network request completes. This is the highest-leverage code-splitting boundary in most apps: split at the route level first, then split individual heavy widgets (rich text editors, charting libraries, PDF viewers) behind their own lazy import.

## 3. List Virtualization for Large Tables and Feeds

Rendering a list of 10,000 rows with `.map()` forces React to create 10,000 virtual DOM nodes and the browser to build, lay out, and paint 10,000 real DOM nodes. Scroll performance degrades because every scroll-driven repaint has to account for a massive DOM tree, memory usage climbs, and even simple state updates get slower because reconciliation has more nodes to diff. Windowing (virtualization) solves this by rendering only the rows currently inside — or just outside — the visible viewport, while a spacer element preserves the total scrollable height so the scrollbar still behaves correctly.

```jsx
import { FixedSizeList as List } from 'react-window';

function Row({ index, data, style }) {
  const item = data[index];
  return (
    <div className="feed-row" style={style}>
      <span className="row-id">#{item.id}</span>
      <p className="row-text">{item.text}</p>
    </div>
  );
}

export function VirtualizedFeed({ items }) {
  return (
    <List
      height={600}
      width="100%"
      itemCount={items.length}
      itemSize={72}
      itemData={items}
    >
      {Row}
    </List>
  );
}
```

If `items` holds 10,000 objects, `VirtualizedFeed` still only mounts roughly 10-15 `Row` instances in the live DOM at any moment — exactly enough to cover the 600px viewport plus a small overscan buffer. The other thousands of rows stay as plain JavaScript objects in memory, not DOM nodes, so scrolling stays smooth and initial render time stops scaling with list size. `Row` is invoked by `List` as a function per visible index rather than written out as JSX, and `itemData` is how you hand the full dataset down since `Row` is declared outside the loop. Reach for `react-window` or `react-virtuoso` rather than hand-rolling scroll-offset math — variable row heights and dynamic content are easy to get subtly wrong.

## 4. Bundle Size Analysis and Dependency Weight

You cannot fix what you cannot see: run a bundle analyzer (`webpack-bundle-analyzer` for Webpack/CRA, `rollup-plugin-visualizer` for Vite) to get a treemap of what actually ships in production. It routinely surfaces libraries that are far heavier than expected, or accidental full-library imports (`import _ from 'lodash'` instead of `import debounce from 'lodash/debounce'`). Once a heavy dependency is identified, look for a modern, tree-shakable replacement instead of trying to trim the old one.

```javascript
// ❌ moment.js: ~67KB gzipped, bundles every locale, not tree-shakable
// because it exposes a CommonJS-style mutable default export.
import moment from 'moment';

function DateDisplay({ date }) {
  return <span>{moment(date).format('YYYY-MM-DD')}</span>;
}

// ✅ date-fns: named ESM exports, so bundlers can drop every
// function you don't import. Only `format` (a few KB) ships.
import { format } from 'date-fns';

function DateDisplay({ date }) {
  return <span>{format(date, 'yyyy-MM-dd')}</span>;
}
```

Swapping `moment` for `date-fns` in a component that only needs basic formatting can cut tens of kilobytes gzipped from the shared bundle, and every other page that imports `DateDisplay` benefits automatically since the dependency is shared. The same pattern applies broadly: `lodash` → `lodash-es` (or per-function imports) for tree-shaking, and `axios` → native `fetch` when you don't need axios-specific interceptors, all verified by re-running the analyzer and confirming the treemap shrank where you expected.

## 5. Image Lazy Loading

Loading every image in a gallery or feed up front means the browser competes for bandwidth downloading images the user may never scroll to, delaying images that are actually visible and slowing the initial page. Lazy loading defers an image's network request until it is about to enter the viewport, using either the native `loading="lazy"` attribute for simple cases or an `IntersectionObserver` when you need more control (placeholders, custom thresholds, non-`<img>` backgrounds).

```javascript
function LazyImage({ src, alt }) {
  const [imageSrc, setImageSrc] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // start loading slightly before it's on-screen
    );

    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [src]);

  return <img ref={imgRef} src={imageSrc ?? undefined} alt={alt} loading="lazy" />;
}

function ProductGallery({ products }) {
  return (
    <div className="gallery">
      {products.map((p) => (
        <LazyImage key={p.id} src={p.imageUrl} alt={p.name} />
      ))}
    </div>
  );
}
```

With a 200-product gallery, only the handful of images near the top of the viewport are requested on load; the rest are requested one by one as the user scrolls, each roughly 200px before it becomes visible so it has time to load. This keeps initial page weight and time-to-interactive low without holding back content the user actually asks to see.

## Interview Questions and Answers

### 1. Why doesn't `React.memo` help when a prop is an inline object literal?

**Answer:** `React.memo`'s default comparator checks reference equality for non-primitive props, and an object literal like `{ name: 'Alex' }` gets a new reference on every parent render even when its contents are unchanged. The fix is either a custom comparison function that checks the fields that matter, or stabilizing the reference in the parent with `useMemo`.

### 2. When would you write a custom comparison function instead of using `useMemo` in the parent?

**Answer:** Use a custom comparator when the object's reference is out of your control, such as data coming fresh from an API response or a third-party library, so you cannot memoize it upstream. It lets the child component itself decide which fields are semantically relevant (e.g. `user.id` and `user.updatedAt`) rather than requiring every caller to remember to memoize correctly.

### 3. How does `React.lazy` combined with `Suspense` actually defer downloading code?

**Answer:** `React.lazy` wraps a dynamic `import()` call, which returns a promise instead of resolving synchronously; the module is only requested over the network the first time React tries to render that component. Until the promise resolves, React "suspends" that subtree and renders the nearest `Suspense` fallback, so a route or bundle a user never visits is never fetched at all.

### 4. Why is splitting an admin-only route into its own bundle valuable even if only 5% of users are admins?

**Answer:** Because the split moves the admin code out of the main chunk entirely, the other 95% of users' initial bundle shrinks by however much that admin code weighed, directly improving their time-to-interactive. Without the split, every visitor downloads and parses code they will never execute, purely because it was bundled alongside code they do need.

### 5. Why does rendering 10,000 list items without virtualization hurt performance even if the data itself is small?

**Answer:** The cost isn't the JavaScript data — it's that the browser has to create, lay out, and paint 10,000 real DOM nodes, and every subsequent reconciliation pass has more nodes to diff. Scroll and resize handlers also get more expensive because layout recalculation scales with DOM node count, so the page feels laggy well before memory becomes the bottleneck.

### 6. How does windowing keep the scrollbar accurate if most rows aren't actually in the DOM?

**Answer:** The virtualization library renders a container sized to the full logical height (row count times row height) even though only the visible rows plus a small overscan buffer are mounted inside it. The browser's scrollbar reflects that container's height, so it behaves as if all rows were present, while the library swaps which rows are mounted in and out as `scrollTop` changes.

### 7. How do you find out what's actually bloating a production bundle, and what do you do next?

**Answer:** Run a bundle analyzer (`webpack-bundle-analyzer` or `rollup-plugin-visualizer`) against the production build to get a treemap of every module's contribution to bundle size. From there, look for accidental full-library imports (importing all of `lodash` for one function) and swap monolithic, non-tree-shakable dependencies like `moment` for modular alternatives like `date-fns`, then re-run the analyzer to confirm the reduction.

### 8. Why is `moment.js` hard to tree-shake, and how does `date-fns` avoid the same problem?

**Answer:** `moment` ships as a single object with every method attached and bundles all locale data by default, so a bundler can't statically determine which parts are unused and safely drop them. `date-fns` exposes each function as an independent named ES module export, so importing only `format` lets the bundler exclude every other function from the final bundle.

### 9. What's the difference between `loading="lazy"` and an `IntersectionObserver`-based lazy image component?

**Answer:** `loading="lazy"` is a native browser attribute that defers the image request until it nears the viewport, with no JavaScript required, but it only works on plain `<img>` elements and offers no hook for placeholders or custom thresholds. An `IntersectionObserver` implementation gives you control over the trigger margin, lets you show a placeholder until the real image loads, and works for CSS background images too — at the cost of writing and maintaining the observer logic yourself.

### 10. A component re-renders on every keystroke in a search box even though it's wrapped in `React.memo`. What's the most likely cause?

**Answer:** The most common cause is that one of its props is a new object, array, or function reference created on every parent render — for example an inline `onSelect={() => ...}` handler — which fails `React.memo`'s shallow comparison every time. The fix is to stabilize that reference with `useCallback` or `useMemo` in the parent (see the Hooks Deep Dive guide) or to write a custom comparator that ignores the parts of the prop that don't affect output.

## Revision Checklist

- [ ] Explain why `React.memo`'s shallow comparison fails on inline object/array/function props.
- [ ] Write a custom comparison function for `React.memo` and know when to prefer it over `useMemo` in the parent.
- [ ] Implement route-level code splitting with `React.lazy` and `Suspense`, and explain what "suspending" means.
- [ ] Justify why an admin-only route should be lazy-loaded rather than bundled into `main.js`.
- [ ] Explain why 10,000 unvirtualized DOM nodes hurt performance and how windowing fixes it without breaking the scrollbar.
- [ ] Use a bundle analyzer to find bloat and describe at least one real dependency swap (moment → date-fns) with the size impact.
- [ ] Implement image lazy loading with `loading="lazy"` and with `IntersectionObserver`, and know when each is appropriate.
- [ ] Know that `useMemo`/`useCallback` live in the Hooks Deep Dive guide, not here.
