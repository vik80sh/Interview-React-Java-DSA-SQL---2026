# Frontend System Design Scenarios

Senior frontend interviews increasingly probe whether you can reason about a product at scale — hundreds of pages, several teams, unreliable networks, a server that renders half the answer — not just whether you know a hook's signature. Each scenario below follows the same shape: a concrete failure that shows up once the app is large, why the obvious fix breaks down, the architecture that actually holds, and what it costs you.

## 1. Architecting a Dashboard with 100+ Pages

**The problem:** A SaaS admin console grows from a handful of screens to 100+ pages spread across several teams (billing, users, reports, settings). A year in, onboarding a new engineer takes days because nobody can tell where anything lives, pull requests from different teams collide on the same files, and the initial bundle has grown large enough that users stare at a blank screen before the app becomes interactive.

**Why it's hard at scale:** Organizing by file type (`components/`, `hooks/`, `pages/`) forces anyone touching one feature to open five unrelated folders to understand it. Shipping every page in a single bundle means users pay for code they will never visit. And once there is no obvious place to put new state, everything defaults into one global store, which makes every consumer of that store re-render on unrelated changes and makes debugging state changes much harder than it needs to be.

**The solution:** Organize by business domain instead of file type, so each feature is self-contained:

```
src/
  features/
    auth/
      components/
      hooks/
      services/
      store.ts
    billing/
    users/
    reports/
  shared/
    ui/
    lib/
```

Each feature owns its own components, hooks, API calls, and local state; only genuinely cross-cutting code lives in `shared/`. A new engineer only has to understand the one feature folder they're assigned to.

Pair that with route-level code splitting so visiting one feature doesn't download the other ninety-nine:

```javascript
const UsersPage = React.lazy(() => import('@/features/users/pages/UsersPage'));

<Suspense fallback={<PageSkeleton />}>
  <Route path="/users" element={<UsersPage />} />
</Suspense>
```

This breaks one large `bundle.js` into per-route chunks (`users.chunk.js`, `billing.chunk.js`, ...). The browser downloads only the chunk for the route the user actually visits, and `Suspense` shows a fallback instead of a frozen UI while that chunk streams in. The same lazy-import pattern is worth applying to heavy third-party dependencies (chart libraries, rich text editors) even inside a page that isn't itself lazy-loaded, since those libraries are often the single biggest contributor to a page's bundle. Because each route lives in its own chunk, a change to one feature only invalidates that feature's chunk in the browser cache — repeat visitors don't re-download code that didn't change.

Layer state instead of defaulting everything into one global store: local component state stays in `useState`; server data goes through a caching layer (React Query or SWR) so identical requests from different components are deduplicated and served from cache instead of refetched; and only state that is genuinely cross-cutting — an auth session, an open modal, the active theme — belongs in a small external store. This is also where the Context-vs-Zustand-vs-Redux decision actually matters: Context re-renders every consumer whenever the provided value changes, which is fine for something that changes rarely like a theme toggle but wrong for anything updated often; a lightweight external store like Zustand gives components selective subscriptions to just the slice of state they read, with almost no setup; Redux buys strict unidirectional data flow, pure-function reducers, and time-travel debugging, at the cost of more boilerplate and real friction when you try to combine it with server-rendered components. Pick based on how often the state changes and how large the team is, not out of habit.

Finally, guard the parts of the system that don't fail gracefully on their own: centralize role-based access (admin / manager / user) behind route guards instead of re-implementing checks per page, enforce TypeScript and lint rules at feature boundaries, and treat inter-team APIs as contracts so one team's backend change doesn't silently break another team's screen.

**The trade-off:** Feature folders and per-route chunks add real structural overhead — the team needs a shared convention for what counts as "shared" versus "feature-owned," and splitting too aggressively turns a handful of large requests into a flood of small ones, which has its own network cost. The practical fix is splitting at the route level rather than per component, and letting the bundler group chunks by actual usage instead of hand-crafting one chunk per file. This structure also doesn't raise the ceiling on team scaling indefinitely — past a certain size, a modular monolith becomes the on-ramp to a microfrontend architecture rather than a permanent answer.

## 2. Keeping the UI Responsive Under Bursty or Rate-Limited API Traffic

**The problem:** A search box, a "Generate Report" button, or several components independently requesting the same data can all flood the backend and start receiving `429 Too Many Requests`. Users respond to a slow or failing UI by clicking again, which makes the burst worse.

**Why it's hard at scale:** The traffic causing the problem is user-driven — fast typing, repeated clicks, several components asking for the same resource — so it can't be fixed on the server alone. Retrying a failed request immediately just adds to the burst that caused the failure in the first place. And without any UI feedback, a user who has been rate-limited has no way to know that clicking again won't help.

**The solution:** Attack each source of unnecessary traffic separately. Debounce input that fires on every keystroke, such as a search field, so a burst of keystrokes collapses into a single request once the user pauses:

```javascript
const debouncedQuery = useDebounce(query, 300);
```

Retry actual failures with exponential backoff and jitter instead of retrying immediately, giving the backend room to recover:

```javascript
useQuery(['report', id], fetchReport, {
  retry: 3,
  retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
});
```

Let a request-caching layer deduplicate identical in-flight requests fired from multiple components, and cache responses for a reasonable window (`staleTime`) so the same screen doesn't refetch data that hasn't gone stale yet. For user-triggered actions that shouldn't be repeatable mid-flight — like a report-generation button — disable the control on click and re-enable it only once the response comes back, rather than relying on the network layer to absorb duplicate clicks. Give the user a visible reason when they are throttled ("Too many requests, try again in a moment") instead of silently swallowing the failure.

Push the cross-cutting parts of this into one place rather than repeating them at every call site — a shared HTTP client with a response interceptor that recognizes `429` and reacts consistently, and, if the API returns a `Retry-After` header, honoring it directly instead of guessing a delay:

```javascript
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 429) {
      const retryAfter = err.response.headers['retry-after'];
      // schedule the retry / surface a cooldown using retryAfter
    }
    return Promise.reject(err);
  }
);
```

**The trade-off:** Debouncing trades a small amount of perceived latency (the delay before a search fires) for far fewer requests, which is usually the right trade for typed input but wrong for something that must feel instantaneous, like a toggle. A long `staleTime` reduces load but risks showing data the user knows is out of date. And centralizing 429 handling in one interceptor is convenient, but it can hide the fact that different call sites may need different recovery behavior — a background sync retry can wait quietly; a user-initiated save cannot.

## 3. Preventing Hydration Mismatches in a Server-Rendered App

**The problem:** In a server-rendered React app (Next.js), the server sends fully-formed HTML, but that HTML has no event listeners attached — buttons don't respond until React "hydrates" the page in the browser. Hydration assumes the server-rendered HTML and the client's first render produce identical output; when they don't, React throws a hydration-mismatch warning and the UI can flicker or behave inconsistently.

**Why it's hard at scale:** The server has no `window`, `document`, or `localStorage`, so any code that reads them runs into `undefined` on the server but a real value in the browser. Non-deterministic values (`Math.random()`, `new Date()`) compute differently on each side by definition. Rendering conditionally on client-only state — such as checking an auth token the server never saw — produces one branch on the server and another in the browser. And if server-side and client-side data fetching return different results for the same query, the two renders diverge even though the code is identical.

**The solution:** Defer anything the server can't compute to a point in the lifecycle that only runs in the browser. Move browser-API reads into `useEffect` so the server and the initial client render both compute the same "unknown" value, and the effect updates it afterward:

```javascript
const [width, setWidth] = useState(undefined);
useEffect(() => {
  setWidth(window.innerWidth);
}, []);
```

For entire components that only make sense in a browser — charts, rich editors, anything wrapping a browser-only library — skip server rendering for that component specifically:

```javascript
const Chart = dynamic(() => import('./Chart'), { ssr: false });
```

For data, avoid the mismatch at the source rather than patching around it: pass the server-fetched data into the client's query cache (React Query hydration) so the client renders from the same data the server used instead of firing a second, possibly-different fetch. For auth-dependent UI, keep the initial render consistent with what the server actually knew, and switch to the authenticated view only after the client has mounted and checked the token.

The mechanism worth understanding precisely: hydration is React re-running your component code once in the browser and diffing that output against the server-rendered HTML *before* it mounts anything or runs any effects. Only once that diff succeeds does React mount the tree and start running `useEffect`. That ordering is exactly why moving browser-only logic into `useEffect` fixes the mismatch — the "before mount" comparison now sees the same value on both sides, and the correction happens safely afterward, a tick later.

**The trade-off:** Pushing logic into `useEffect` doesn't make the problem disappear — it makes it deliberate. The first paint is briefly "wrong" (an `undefined` width, a logged-out view for a logged-in user) until the effect runs and corrects it, which trades a hard hydration error for a controlled, brief flash. Disabling SSR for a component with `ssr: false` removes the SEO and first-paint benefits of server rendering for exactly that component, so it should be reserved for genuinely browser-only pieces, not used as a blanket fix.

## 4. Building a Design System Shared Across Multiple Teams

**The problem:** Once several teams build UI independently, each one ends up with its own version of `Button`, `Modal`, and `Input`, with slightly different spacing, color, and behavior. The product feels inconsistent, and every team pays the cost of building and maintaining the same components from scratch.

**Why it's hard at scale:** Without a single source of truth for colors, typography, and spacing, "consistent" becomes a matter of opinion between teams. If UI components absorb business logic — a `Button` that itself calls an API — they stop being reusable outside the one place they were written for. Any breaking change to a shared component ripples across every team that consumes it, so releases need discipline. And a component library with no documentation quietly turns into a bottleneck, because every team that can't figure out how to use it routes questions back to the small team that owns it.

**The solution:** Start from design tokens rather than hardcoded styles, so theming and rebranding are configuration changes, not code changes:

```css
--primary-color: #2563eb;
--spacing-md: 16px;
```

Separate "dumb" UI components that only render and emit events (`Button`, `Input`, `Modal`) from "smart" feature components that own business logic and data (`UserForm`, `DashboardCard`). Only the former belong in the shared library; the latter stay in the feature folders that use them. Publish the library as a versioned private package with semantic versioning, so consuming teams can tell a patch from a breaking change at a glance:

```
v1.0.0 → stable
v1.1.0 → new, backward-compatible feature
v2.0.0 → breaking change
```

Document every component with something consumers can self-serve from — props, variants, and usage examples in Storybook — so adoption doesn't depend on asking the core team directly. Back the library with unit tests for logic and visual/snapshot tests for appearance, since a component used across a dozen teams needs to be reliable in a way a page-local component doesn't. Keep exports modular so bundlers can tree-shake unused components:

```javascript
import { Button } from '@company/ui'; // only Button ships, not the whole library
```

And run the whole thing under explicit governance — a core team that owns the library, a contribution process for teams that want to add to it, and code review before anything ships — rather than letting anyone push changes directly.

**The trade-off:** Tokens, versioning, documentation, and governance are all overhead that a single team building for itself doesn't need — this only pays off once enough teams share the library that inconsistency and duplicated work would otherwise cost more. Strict semantic versioning means even small fixes ship more slowly, because consumers need a safe migration path rather than an unannounced change. And keeping the library framework-agnostic (versus standardizing every team on one stack) is more portable but considerably more expensive to build and maintain.

## 5. Choosing a Rendering Strategy Across a Multi-Surface Product

**The problem:** A single product usually has pages with very different needs — a marketing homepage that needs to rank in search, a pricing page that changes occasionally, and an authenticated dashboard that needs to feel instantaneous. Picking one rendering strategy for the entire app under-serves most of these pages.

**Why it's hard at scale:** Client-side rendering (CSR) sends an empty shell and lets React render everything in the browser — great for interactivity, bad for SEO and first paint, since there's nothing for a crawler or a slow connection to see until the JS runs. Server-side rendering (SSR) renders full HTML per request, fixing SEO and first paint, but that HTML is regenerated on every single request, which costs server capacity and adds latency compared to serving a static file. Static site generation (SSG) pre-renders pages at build time and serves them from a CDN, which is by far the cheapest and fastest option, but it can't reflect data that changes after the build.

**The solution:** Match the strategy to the page, not the app:

| | CSR | SSR | SSG |
|---|---|---|---|
| Initial load | Slow | Fast | Fastest |
| SEO | Poor | Good | Excellent |
| Server load | Low | High | Very low |
| Best for | Authenticated dashboards | Frequently-changing, SEO-relevant pages | Content that rarely changes |

In a real product this ends up hybrid within the same app: an authenticated admin dashboard rendered CSR (no SEO need, high interactivity), a marketing landing page as SSG (rarely changes, needs to load instantly worldwide), and a pricing or product page as SSR (needs SEO but also needs to reflect current data on every load).

**The trade-off:** Running three rendering strategies side by side means the team has to know, per route, which mode is in play and why — and the infrastructure has to support all three (a CDN for static assets, a server-rendering fleet for SSR pages). The most common regression at scale isn't picking the wrong strategy initially; it's a new page getting added to an existing route group and silently inheriting the wrong rendering mode because nobody revisited the decision.

## 6. Scaling the Frontend to 1M+ Daily Users

**The problem:** As daily active users climb into the millions, load time, backend load, release risk, security exposure, and the sheer number of bugs in production all increase together — none of them can be solved in isolation.

**Why it's hard at scale:** This isn't one problem; it's simultaneous pressure on delivery, backend capacity, release safety, security, and visibility into production. A bundle that felt fine for a thousand users adds up to enormous aggregate transfer at a million; an API that copes with light traffic buckles when every user's client refetches independently; shipping to everyone at once turns every release into a full-scale incident risk; and at this volume, some fraction of users will always be hitting some bug, so the question is whether you find out from monitoring or from a flood of support tickets.

**The solution:** Address each pressure point directly. Serve static assets from a CDN and keep pushing code-splitting so the code a first-time visitor downloads doesn't grow with the total size of the app. Cache and deduplicate API requests (the same request-caching layer from the API-traffic scenario) so a 10x increase in users doesn't translate into a 10x increase in API calls. Roll changes out behind feature flags with gradual or A/B rollout through CI/CD, rather than deploying to every user simultaneously, so a bad release affects a controlled slice of traffic instead of everyone at once. Treat security as a hard requirement rather than an afterthought at this scale: store auth tokens in HttpOnly cookies rather than `localStorage` so they aren't reachable from injected script, set CSP headers, and sanitize untrusted input. Invest in observability — error tracking and real-user performance monitoring — because at a million users, waiting for a bug report is strictly slower than watching a dashboard. And treat the modular structure from the dashboard scenario as the escape hatch: when a single deployable genuinely stops scaling for the organization (not just the traffic), it can evolve into a microfrontend architecture with independently deployable pieces, without a rewrite.

**The trade-off:** Feature flags and gradual rollout add real code complexity — branching logic in the app, and flag cleanup debt if old flags are never removed — in exchange for release safety. CDN and edge caching only help for content that's safe to be stale for some window; a live dashboard still needs SSR or direct client fetches layered on top, not just a cache. And observability tooling and CSP policies both carry real setup and tuning cost (alert noise, false positives) before they start paying for themselves.

## 7. Infinite Scroll and Search Over a Large, Changing Dataset

**The problem:** A social feed, a product catalog, or a search results page needs to show results from a dataset far too large to load at once, and new items can appear (or existing ones can be deleted) while the user is scrolling through it.

**Why it's hard at scale:** Offset-based pagination (`page=3&size=20`) breaks the moment the underlying data changes mid-session — if five new items were inserted ahead of the current page since the user loaded page 1, requesting "page 3" now returns a different, overlapping or gapped set of rows than what the user was actually looking at, producing duplicate or missing items as they scroll. Rendering every loaded item into the DOM without bound also means a long scroll session accumulates thousands of live DOM nodes, degrading scroll performance and memory over time even if the data itself was fetched correctly. And naively firing a request on every scroll-pixel event floods the network and the main thread with work that has nothing to do with what actually changed.

**The solution:** Fetch pages with a stable, keyset-based cursor instead of an offset — a cursor built from the last item's own sort key (e.g. `createdAt` + `id`) rather than its position in the list, so inserts and deletes elsewhere in the dataset don't shift what "the next page" means:

```javascript
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['feed'],
  queryFn: ({ pageParam }) => fetchFeed({ cursor: pageParam }),
  getNextPageParam: lastPage => lastPage.nextCursor, // opaque cursor, not a page number
});
```

Trigger the next fetch from an `IntersectionObserver` watching a sentinel element near the bottom of the list, rather than a scroll listener — it fires only when that element actually becomes visible, with no per-pixel computation:

```javascript
const sentinelRef = useRef(null);
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) fetchNextPage();
  });
  observer.observe(sentinelRef.current);
  return () => observer.disconnect();
}, [fetchNextPage]);
```

Once the loaded list itself grows into the thousands, virtualize it (`react-window`/`react-virtual`) so only the rows currently in or near the viewport are actually mounted in the DOM, regardless of how many pages have been fetched in total. For the search-as-you-type variant of this same problem, debounce the input and cancel the previous in-flight request with `AbortController` when a new keystroke supersedes it, so a slow response for an outdated query can never overwrite the result of a newer one that resolved first.

**The trade-off:** Cursor-based pagination gives up the ability to jump directly to "page 7" the way offset pagination can, since a cursor only knows how to move forward (or backward) from where it currently is — acceptable for a feed people scroll through linearly, wrong for a UI that needs random page access. Virtualization adds real implementation complexity (row height measurement, scroll position restoration) in exchange for constant memory usage regardless of list length.

## 8. Rendering a Large, Interactive Data Grid

**The problem:** An operations dashboard needs to show tens of thousands of rows with sorting, filtering, inline editing, and column resizing — and it needs to stay responsive while doing all of it, not just render once and sit still.

**Why it's hard at scale:** Rendering every row and cell as real DOM nodes means the browser has to lay out, paint, and keep in memory tens of thousands of elements even though only a few dozen are ever visible at once — this is a direct, severe case of the reflow/DOM-cost problem covered in the [Critical Rendering Path guide](../HTML-CSS/07-Critical-Rendering-Path-and-Browser-Rendering.md). Sorting or filtering the full dataset on every keystroke in a client-side implementation blocks the main thread for a large array, hurting the exact INP metric covered in the [Web Performance guide](../HTML-CSS/08-Web-Performance-and-Core-Web-Vitals.md). And naive inline editing that re-renders the entire grid on every keystroke inside one cell makes typing itself feel laggy.

**The solution:** Virtualize both axes — render only the rows and columns currently scrolled into view (or just outside it, as a buffer), recycling the same DOM nodes as the user scrolls rather than creating new ones per row:

```javascript
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 40, // px per row, used to size the scrollable area correctly
  overscan: 10,
});
```

Push sorting and filtering to the server once the dataset is large enough that client-side array operations become the bottleneck — the client sends the current sort/filter state as query parameters and renders whatever page comes back, rather than holding the entire dataset in memory and processing it locally. Scope re-renders to the individual cell being edited, not the whole grid, by keeping edit-in-progress state local to that cell's own component rather than lifted into a single grid-wide state object that every cell subscribes to.

**The trade-off:** Virtualization means the grid can no longer use the browser's native find-in-page (`Ctrl+F`) or naive CSS row-based styling that assumes every row is a real, present DOM node — anything relying on "the row is actually in the DOM" needs its own accommodation. Server-side sort/filter trades instant, no-network client-side responsiveness for correctness at scale, and now every sort/filter interaction has real request latency that a purely client-side implementation wouldn't have for a smaller dataset.

## 9. File Upload at Scale

**The problem:** Users need to upload files — profile photos, CSV imports, multi-gigabyte video assets — reliably, with progress feedback, without the upload silently failing on a flaky connection or blocking the rest of the page while it happens.

**Why it's hard at scale:** A single `multipart/form-data` POST for a large file ties up one request for the file's entire transfer duration, with no way to resume if the connection drops partway through — a user on an unreliable connection re-uploading a 2GB file from scratch after a failure at 95% is a real, common complaint. Routing large file bytes through your own application server (rather than directly to storage) means your server's bandwidth and memory become the bottleneck for every concurrent upload. And a UI with no real progress feedback leaves users unsure whether an upload that's taking a while is working or has silently died.

**The solution:** For anything beyond small files, upload directly from the browser to object storage (S3, GCS) using a short-lived, server-issued **presigned URL**, so the file's bytes never pass through your application server at all:

```javascript
const { uploadUrl, fileKey } = await api.post('/uploads/presign', { filename, contentType });
await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });
await api.post('/uploads/complete', { fileKey }); // tell your backend the upload finished
```

For large files, split the upload into chunks and track progress per chunk, so a dropped connection only has to retry the failed chunk, not restart the whole file — this is exactly what S3's multipart upload API and browser-side libraries like `resumable.js`/`tus` implement:

```javascript
const chunks = splitIntoChunks(file, CHUNK_SIZE);
for (const [index, chunk] of chunks.entries()) {
  await uploadChunkWithRetry(chunk, index); // retry only this chunk on failure, not the whole file
  setProgress((index + 1) / chunks.length);
}
```

Report real progress via `XMLHttpRequest`'s `upload.onprogress` event (`fetch` alone doesn't expose upload progress natively as of this writing), and validate file type/size on the client before starting the upload as a fast UX check — while still re-validating on the server, since a client-side check is a convenience, not a security boundary.

**The trade-off:** Presigned direct-to-storage uploads mean your server can no longer inspect file content before it lands in storage (e.g. virus scanning must happen as an async post-upload step, or via a proxy that re-introduces the bandwidth cost you were trying to avoid). Chunked/resumable uploads add real client and server complexity — tracking which chunks succeeded, reassembling them, handling out-of-order completion — that a simple single-request upload doesn't need for small files, so it's worth reserving for uploads actually large enough to benefit.

## 10. Designing a Real-Time Notification System

**The problem:** Users need to see new notifications (a comment on their post, an order status change, a mention) appear live, without refreshing the page, across every tab they might have open, without seeing the same notification announced twice.

**Why it's hard at scale:** Polling an endpoint every few seconds from every open tab of every active user multiplies request volume by both the polling interval and the number of simultaneously open tabs, most of which return "nothing new." A WebSocket or Server-Sent Events (SSE) connection avoids the polling waste but now has to survive reconnects, and a naive implementation shows a duplicate toast if the same notification arrives while the user has the app open in two tabs, or after a reconnect re-delivers something already shown. And an unbounded, un-prioritized stream of every notification firing an intrusive interruption trains users to ignore or dismiss notifications altogether.

**The solution:** Use SSE for a one-directional server-to-client stream (simpler than WebSockets when the client never needs to send anything back over the same connection) or WebSockets when bidirectional communication is genuinely needed elsewhere in the app, and reconnect with backoff on drop:

```javascript
const eventSource = new EventSource('/api/notifications/stream');
eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  dispatchNotification(notification);
};
eventSource.onerror = () => {
  // the browser retries SSE connections automatically, but track state for a "reconnecting" indicator
};
```

Deduplicate by a stable notification ID before displaying anything, both against notifications already shown in this session and across tabs — a `BroadcastChannel` (or a shared `localStorage` key with a `storage` event listener) lets multiple open tabs of the same app agree on which notifications have already been surfaced to the user, so only one tab actually shows the toast:

```javascript
const channel = new BroadcastChannel('notifications');
channel.postMessage({ type: 'SHOWN', id: notification.id });
channel.onmessage = (event) => {
  if (event.data.type === 'SHOWN') markAsShown(event.data.id); // other tabs suppress their own toast
};
```

Persist unread notifications server-side (not just in the live connection) so a page reload or a device that was offline when the notification fired still shows it in an unread list, and use `aria-live="polite"` (see the [Accessibility guide](../HTML-CSS/01-Semantic-HTML-and-Accessibility.md#3-aria--only-when-html-itself-cant-say-it)) so the arrival is actually announced to screen reader users, not just visually toasted.

**The trade-off:** SSE is simpler than WebSockets but is strictly one-directional and, in HTTP/1.1, is limited to roughly six concurrent connections per browser per domain — a real constraint if the same page also needs other long-lived connections. Cross-tab deduplication via `BroadcastChannel` only coordinates tabs of the same browser profile on the same device — a user logged in on both their phone and laptop will still see the notification surface independently on each, which is usually acceptable but worth stating explicitly as a known limitation rather than an oversight.

## Interview Questions and Answers

### 1. Why does organizing a large React app by file type break down, and what replaces it?

**Answer:** Type-based folders (`components/`, `hooks/`, `pages/`) scatter the logic for one feature across several unrelated directories, so understanding or changing a feature means opening files spread across the whole codebase. A feature-based structure groups each feature's components, hooks, services, and state together, so ownership and onboarding scale with the number of features rather than the number of files.

### 2. How do code splitting and lazy loading work together, and what does `Suspense` add?

**Answer:** Code splitting breaks one large bundle into smaller per-route chunks; lazy loading (`React.lazy`) ensures a chunk is only requested when its route is actually visited, instead of upfront. `Suspense` covers the gap while that chunk downloads by rendering a fallback, so the UI shows a loading state instead of freezing or going blank.

### 3. Why is retrying a failed request immediately after a 429 dangerous, and what should replace it?

**Answer:** An immediate retry adds more load to a backend that just told you it's overwhelmed, which usually produces another failure and can trigger a retry storm across many clients at once. Exponential backoff with jitter, a bounded retry count, and respecting a `Retry-After` header if the server sends one give the backend room to recover instead of compounding the problem.

### 4. What causes a Next.js hydration mismatch? Give two concrete triggers and their fixes.

**Answer:** A mismatch happens whenever the server-rendered HTML and the client's first render compute different output — for example, reading `window.innerWidth` (undefined on the server, a real number in the browser) or rendering a conditional based on a client-only auth check the server never saw. Both are fixed the same way: defer the browser-only or client-only logic into `useEffect` so the value used during hydration's before-mount comparison matches on both sides, then let the effect correct it afterward.

### 5. Why does fixing a hydration issue with `useEffect` still cause a visible flash?

**Answer:** `useEffect` only runs after React has already compared the server HTML against the client's first render and mounted the tree, so the first paint necessarily uses the same placeholder value the server used (like `undefined`). The effect then updates that value a tick later, trading a hard hydration error for a brief, deliberate flash instead of eliminating the visible change entirely.

### 6. What's the practical difference between a shared component library and a design system?

**Answer:** A component library is the code — reusable `Button`, `Modal`, and `Input` components consuming teams can import. A design system is the layer above it: the design tokens, theming rules, documentation, versioning discipline, and governance that make that code consistent and safe for many teams to depend on. A library without that layer tends to drift back into inconsistency as more teams touch it.

### 7. How would you decide whether a given page should be CSR, SSR, or SSG?

**Answer:** Ask whether the page needs to be indexed by search engines and whether its content changes between builds. Content that's stable and doesn't need real-time data is the cheapest as SSG; pages that need both SEO and current data on every load need SSR; and authenticated, highly interactive surfaces with no SEO requirement, like a dashboard, are well served by CSR. Most real products end up running all three side by side, chosen per route rather than once for the whole app.

### 8. What's the single biggest lever for scaling a frontend to 1M+ daily users, and why doesn't caching alone fix backend overload?

**Answer:** There isn't one lever — delivery (CDN, code splitting), backend load (caching and deduplication), release safety (feature flags), security, and observability all have to move together, because at that scale each one becomes a bottleneck on its own. Caching reduces redundant requests but doesn't help the requests that are genuinely new or user-specific, so backend capacity and request deduplication still matter independently of how well the cache performs.

### 9. Why is a modular monolith often the right starting point instead of jumping straight to microfrontends?

**Answer:** A modular monolith already gets you feature isolation, independent ownership, and clear boundaries without the operational cost of multiple independently deployed applications — shared tooling, cross-app routing, and versioned contracts between apps. Microfrontends are worth the added complexity once a single deployable genuinely can't scale for the organization anymore, not as a default architecture chosen upfront.

### 10. Where do `useContext`, Zustand, and Redux each fit in a layered state strategy?

**Answer:** `useContext` is a distribution mechanism, not a store — it's fine for state that changes rarely, like a theme, because every consumer re-renders on any value change. Zustand fits medium-to-large client state (modals, active tabs, session) where you want selective subscriptions with minimal setup. Redux fits large, highly interconnected state where a team specifically needs strict unidirectional data flow and time-travel debugging, at the cost of more boilerplate and friction with server-rendered components.

### 11. Why does offset-based pagination (`page=3`) break down for infinite scroll over a dataset that changes while the user is browsing it?

**Answer:** Offset pagination identifies a page by position, so if rows are inserted or deleted elsewhere in the dataset between requests, "page 3" now refers to a different slice of data than the user was actually scrolled to, producing visible duplicates or gaps. A keyset/cursor built from the last item's own sort key instead of its position is stable under concurrent inserts and deletes, because it always means "everything after this specific item," not "everything at this specific offset."

### 12. Why should a large data grid virtualize both rows and columns instead of just paginating the rows?

**Answer:** Even a single fully-rendered page of a wide grid can mean rendering far more DOM cells than are ever visible in the viewport at once, which is expensive to lay out and paint regardless of how the rows were fetched. Virtualizing both axes recycles a small, constant number of DOM nodes for whatever is currently scrolled into view, keeping rendering cost roughly constant instead of scaling with total row and column count.

### 13. Why upload large files directly to object storage via a presigned URL instead of routing them through your own application server?

**Answer:** Routing file bytes through your server makes your server's own bandwidth and memory the bottleneck for every concurrent upload, and ties up a request for the entire transfer duration. A presigned URL lets the browser upload directly to storage (S3/GCS) while your server only issues the short-lived credential and confirms completion afterward, keeping large-file traffic off your application infrastructure entirely.

### 14. How would you prevent a user from seeing the same real-time notification twice across two open tabs?

**Answer:** Give every notification a stable ID and deduplicate against IDs already shown in this browser session before displaying anything. A `BroadcastChannel` (or a shared `localStorage` key with a `storage` event) lets open tabs of the same app coordinate which notifications have already been surfaced, so only one tab actually shows the toast even though both received the same live update.

## Revision Checklist

- [ ] Explain feature-based folder structure and route-level code splitting for a 100+ page app, including how chunking affects caching.
- [ ] Justify a layered state strategy (local, server, global) and when Context, Zustand, or Redux fits each layer.
- [ ] Handle bursty API traffic with debouncing, exponential backoff with jitter, request deduplication, and centralized 429/`Retry-After` handling.
- [ ] Diagnose a Next.js hydration mismatch from a code snippet and fix it with `useEffect`, `dynamic(..., { ssr: false })`, or hydrated query data.
- [ ] Explain the mechanism of hydration (pre-mount comparison, then mount, then effects) precisely enough to say why `useEffect` fixes match order.
- [ ] Design a versioned, documented, tree-shakeable component library with a clear split between UI and business-logic components.
- [ ] Choose CSR, SSR, or SSG per route based on SEO and data-freshness needs, and defend a hybrid approach across one product.
- [ ] Describe the delivery, reliability, and security levers for scaling to 1M+ daily users, and when a modular monolith should evolve into microfrontends.
- [ ] Design cursor-based infinite scroll with `IntersectionObserver`, and explain why it stays correct under concurrent inserts/deletes.
- [ ] Virtualize a large data grid on both axes and explain why server-side sort/filter becomes necessary past a certain dataset size.
- [ ] Design a resumable, presigned-URL file upload flow and explain what it removes from your own server.
- [ ] Design a deduplicated real-time notification pipeline (SSE/WebSocket + cross-tab coordination) and know SSE's connection-count limitation.
