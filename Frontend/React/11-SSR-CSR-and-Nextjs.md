# SSR, CSR, and Next.js

Rendering strategy is one of the first architecture questions in any React interview, and it is almost always followed by "so why not just use plain React?" The important interview skill is not reciting definitions; it is being able to trace the exact request/response and hydration sequence for each strategy and explain, with a real example, what Next.js buys you over a hand-rolled Vite or Create React App setup.

## 1. CSR vs SSR vs SSG vs ISR

All four strategies answer the same question — where and when is HTML generated — with different trade-offs between server cost, time-to-first-byte (TTFB), and time-to-interactive (TTI).

**CSR (Client-Side Rendering).** The server returns a near-empty HTML shell (`<div id="root"></div>`) plus a `<script>` tag. The browser downloads the JS bundle, executes it, builds the virtual DOM, and injects real DOM nodes. Sequence: request → tiny HTML → download bundle → parse/execute → mount → paint. There is no server-rendered markup to hydrate; the app simply mounts. TTFB is excellent (a static file), but FCP and TTI are both delayed until the bundle runs. This is the default model for plain React with Vite or Create React App.

**SSR (Server-Side Rendering).** On each request, the server runs the component tree, fetches data, and renders a complete HTML string, which streams back to the browser. Sequence: request → server renders + fetches → full HTML response → browser paints immediately → browser downloads JS → **hydration** attaches event listeners to the existing DOM nodes. FCP is fast because the browser paints real content right away; TTI still depends on the JS bundle downloading and hydrating, so there is a "visible but not yet clickable" window. TTFB is worse than CSR because the server does data fetching and rendering work before sending the first byte.

**SSG (Static Site Generation).** Rendering happens once, at build time, not per request. `next build` produces a static HTML file per page, which a CDN serves with effectively zero server compute per request. Sequence: build-time render → CDN caches HTML → request → CDN serves instantly → browser paints → hydration. This gives CSR-like TTFB with SSR-like FCP, but the content is only as fresh as the last build.

**ISR (Incremental Static Regeneration).** SSG with a revalidation window. The first request after the window expires still gets the stale cached page instantly, but triggers a background re-render that replaces the cached HTML for subsequent requests — no full rebuild needed. It is the practical middle ground between SSG's staleness and SSR's per-request server cost.

Real-world example: an e-commerce product page needs to be indexable by Google (ruling out plain CSR, where crawlers may see an empty shell if data fetches are slow), needs to load fast on mobile (ruling out a page that blocks on a slow SSR data fetch on every request), but also needs price and stock to not be wildly stale. The pragmatic choice is SSG for the product shell with ISR revalidating every 60 seconds — most requests hit the CDN instantly, and prices catch up within a minute, without paying full SSR server cost on every page view. A live shopping cart or checkout step, by contrast, is rendered CSR or SSR-per-request because that data must never be stale.

## 2. What Next.js Actually Is

Next.js is not a replacement for React — it is a framework built on top of React that adds the infrastructure React deliberately leaves out. React is a UI library: components, state, the virtual DOM, and nothing about routing, data fetching conventions, bundling, or server rendering. Next.js wraps React with file-system routing, SSR/SSG/ISR rendering, API routes, and automatic image/font/code-splitting optimization.

Concretely, in plain React (Vite/CRA):

- You hand-roll routing with `react-router-dom`: install it, define a `<Routes>` tree, wire up `<Link>` components, and manage code-splitting per route yourself with `React.lazy`.
- You hand-roll server rendering, if you want it at all — there is no built-in mechanism; you would reach for a separate SSR setup (e.g. a custom Express server rendering `ReactDOMServer.renderToString`) or simply ship CSR-only.
- You hand-roll data fetching with `useEffect` + `fetch`/`axios`, managing loading and error state yourself (or pulling in React Query/SWR).
- You hand-roll a backend entirely separately — a plain React app has no server-side code of its own, so an endpoint means standing up a separate Node/Express/Spring service.
- You hand-roll image optimization — resizing, format conversion, lazy loading, and layout-shift prevention are all manual work or third-party libraries.

Next.js gives you file-based routing (a file under `app/` or `pages/` is a route, no router library needed), SSR/SSG/ISR/CSR all available per-page or per-fetch, colocated API routes (a file under `app/api/` is a backend endpoint, in the same project), and `next/image` and `next/font` doing lazy loading, format conversion (WebP/AVIF), and layout-shift prevention automatically.

Real-world example: for the same e-commerce product page, plain React would need react-router-dom for the `/products/:id` route, a separate backend service for the `/api/products/:id` endpoint, manual `useEffect` fetching with loading spinners, and a hand-tuned `<img>` with manual `srcset` for responsive images. Next.js gives you the route for free from the folder structure, an `app/api/products/[id]/route.js` file as the backend, an `async` Server Component that fetches data directly with no client-side loading spinner needed, and `<Image>` handling responsive sizing and format automatically.

## 3. Next.js vs Plain React

This is the comparison interviewers actually want: not "which is better" but "which trade-offs does each make, and when does that matter."

| Concern | Plain React (Vite/CRA) | Next.js |
| --- | --- | --- |
| Rendering strategy | CSR only, by default and effectively by design | SSR, SSG, ISR, and CSR all available, chosen per page or per fetch |
| Routing | Manual — install and configure `react-router-dom`, define routes by hand | File-based — a file under `app/`/`pages/` is automatically a route |
| Data fetching | `useEffect` + `fetch`, or a client library (React Query/SWR), always client-triggered | `getServerSideProps`/`getStaticProps` (Pages Router) or `async` Server Components fetching directly (App Router) |
| SEO | Weak by default — crawlers may see an empty shell unless you add SSR yourself | Strong by default — real HTML is present on first response for SSR/SSG/ISR pages |
| Backend capability | None — a separate service is required for any server-side endpoint | Built-in API routes colocated in the same project |
| Bundling/optimization | Manual code-splitting (`React.lazy`), manual image/font handling | Automatic per-route code-splitting, `next/image`, `next/font` out of the box |
| Build tooling | You choose and configure (Vite, Webpack) | Turbopack/Webpack preconfigured, zero-config by default |

When plain React is still the right call: a pure SPA sitting behind an auth wall, where every user is already logged in and no page needs to be indexed by search engines — an internal admin dashboard, an analytics console, or a settings panel inside a larger authenticated product. SEO buys nothing there, the extra server infrastructure Next.js implies is pure overhead, and a Vite SPA deploys as static files with none of the server-cost or caching complexity SSR introduces. The e-commerce product page needs Next.js precisely because it must be public, fast, and indexable; an internal "manage warehouse inventory" tool behind a login screen does not, and shipping it as a plain Vite SPA is simpler and cheaper.

## 4. App Router vs Pages Router, and React Server Components

Next.js has two routing systems. The **Pages Router** (`pages/` directory, the original model) uses `getServerSideProps` for per-request SSR, `getStaticProps` for build-time SSG, and `getStaticPaths` to enumerate dynamic SSG routes; every page component itself still runs on the client after being sent as HTML. The **App Router** (`app/` directory, the current model) replaces those data-fetching functions with `async` components and a `fetch` cache (`{ next: { revalidate: N } }` for ISR-style behavior), and layouts (`layout.js`) persist across nested route changes instead of remounting.

The deeper shift in the App Router is **React Server Components (RSC)**. Every component under `app/` is a Server Component by default: it runs only on the server, can be `async` and query a database or call an internal service directly, and its code — including its dependencies — never ships to the browser bundle at all. Adding `"use client"` at the top of a file marks it and everything it imports as a Client Component: it ships to the browser, can use `useState`/`useEffect`, and can attach event handlers like `onClick`.

This is a genuinely new mental model, not just a naming convention on top of plain React. In plain React, every component you write ships as JS to the browser, full stop — there is no such thing as a component that only exists on the server. RSC introduces components with zero client-side JS cost: a Server Component that renders a large Markdown-to-HTML conversion library, or one that queries a SQL database directly, adds nothing to the bundle a user downloads.

Real-world example: the product listing itself (`app/products/page.js`) is a Server Component — it is `async`, calls `fetch()` for the catalog directly, and its dependency weight never reaches the browser. The "like" heart button on each product card needs `onClick` and local state, so it is extracted into its own file starting with `"use client"` and imported as a leaf inside the otherwise server-rendered page. The page composes both: server-rendered structure and data, with a small client-rendered interactive island.

## 5. Hydration and Hydration Mismatches

Hydration is the step where React, given server-rendered HTML already in the DOM, attaches its internal virtual DOM representation and event listeners to those existing nodes instead of recreating them. React expects the markup it hydrates against to match exactly what it would have rendered on the client; when it does not, React logs a hydration mismatch error and, in the worst case, discards and re-renders the mismatched subtree on the client, briefly showing a flash of incorrect content.

A real, common bug: rendering `new Date().toLocaleString()` or reading `window.innerWidth` directly in the component body. On the server, `Date.now()` evaluates at request time in the server's timezone/clock; by the time the identical component runs again on the client during hydration, the timestamp string is different, and `window` does not exist on the server at all, so a server-rendered branch that checks `typeof window !== 'undefined'` renders differently server-side than the client's re-render of the same component. React sees the server HTML says one thing and the client's first render says another, and throws a hydration mismatch warning.

The fix is to make the server and the client agree on the first render, and only diverge after that. Move the `window`-dependent or time-dependent value into a `useEffect` (which runs only on the client, after hydration) and set it into state, so the server-rendered output and the client's *initial* render both show the same placeholder; the "real" client-only value appears in a second render pass after hydration completes, which is a state update, not a hydration mismatch. `suppressHydrationWarning` on the specific element is an acceptable narrow escape hatch for genuinely-expected small differences (e.g. a relative timestamp like "2 minutes ago"), but it should not be reached for as a general fix.

Real-world example: the e-commerce product page shows "Free shipping — order within 2h 14m," computed against the current time. If that countdown string is computed directly during the server render and directly during the client's first render, the two timestamps will not match, and React throws a hydration error on every page load. The fix is to render a static "Free shipping today" on the server and the client's first pass, then swap in the live countdown from a `useEffect` after mount.

## Interview Questions and Answers

### 1. What is the fundamental difference between CSR and SSR?

**Answer:** CSR ships a near-empty HTML shell and lets the browser build the page after downloading and executing JavaScript; SSR executes the component tree on the server per request and ships a complete HTML string that the browser paints immediately, then hydrates. The practical difference is where the "white screen" wait happens: on the client waiting for JS in CSR, or on the server computing the response in SSR (a TTFB cost).

### 2. What is SSG and how does it differ from SSR?

**Answer:** SSG renders pages once at build time into static HTML served by a CDN, with no per-request server compute; SSR renders on every request. SSG gets CSR-level TTFB with SSR-level FCP, but the trade-off is staleness — content is only as fresh as the last build, which is why a product catalog favors SSG/ISR while a live checkout page favors SSR.

### 3. What is ISR and when would you use it over plain SSG?

**Answer:** ISR is SSG with a revalidation window — the cached page is served instantly, and after the window expires, one request triggers a background re-render that updates the cache for everyone after, without a full rebuild. Use it when data changes occasionally (product prices, blog content) and near-real-time freshness is not required, avoiding both SSG's staleness and SSR's per-request server cost.

### 4. Walk through the hydration sequence for an SSR page.

**Answer:** The server renders the full component tree to an HTML string and sends it; the browser parses and paints that HTML immediately, so the user sees content before any JS has run. The browser then downloads the JS bundle in the background, and once ready, React "hydrates" by walking the existing DOM and attaching its internal representation and event listeners to it, rather than rebuilding the DOM from scratch. Until hydration finishes, the page is visible but not interactive — clicking a button does nothing yet.

### 5. Is Next.js a replacement for React?

**Answer:** No — Next.js is a framework built on top of React; every Next.js component is still a React component using the same hooks and JSX. Next.js adds the parts React intentionally does not provide: file-based routing, SSR/SSG/ISR rendering, API routes, and built-in image/font optimization.

### 6. What would you have to hand-roll in a plain React (Vite/CRA) app that Next.js gives you out of the box?

**Answer:** Routing (`react-router-dom` and manual route configuration), any server-side rendering (there is none by default — a plain React app is CSR-only unless you build a custom SSR server), a separate backend service for any API endpoint, and image optimization (responsive `srcset`, format conversion, lazy loading) all have to be built or wired up manually. Next.js provides file-based routing, SSR/SSG/ISR per page, colocated API routes, and `next/image`/`next/font` automatically.

### 7. When would you still choose plain React over Next.js?

**Answer:** For a pure SPA sitting behind authentication where SEO is irrelevant — an internal admin dashboard or analytics console that every user reaches only after logging in. There is nothing to gain from server rendering or file-based routing overhead there, and a Vite SPA deploys as static files with simpler infrastructure and no server-cost or cache-invalidation concerns.

### 8. What's the difference between the App Router and the Pages Router?

**Answer:** The Pages Router (`pages/`) uses exported functions like `getServerSideProps` and `getStaticProps` for data fetching, and every page is client-rendered after being delivered as HTML. The App Router (`app/`) replaces those with `async` Server Components that fetch data directly and a `fetch`-level cache for ISR-style revalidation, and adds persistent `layout.js` files that avoid remounting shared UI across nested route changes.

### 9. What is a React Server Component, and how does it differ from a Client Component?

**Answer:** A Server Component runs only on the server — it can be `async`, query data directly, and its code never ships to the browser bundle at all. Adding `"use client"` at the top of a file marks it (and its imports) as a Client Component, which ships to the browser and can use `useState`, `useEffect`, and DOM event handlers. This is a new mental model beyond plain React, where every component unconditionally ships as client JS.

### 10. Why can't a Server Component use `useState` or an `onClick` handler?

**Answer:** Server Components run once on the server to produce output and are never re-rendered in the browser in response to user interaction, so there is no runtime on the client to hold state or dispatch events for them. Any interactivity has to be pushed down into a `"use client"` leaf component, which is why patterns like the product page's "like" button are extracted into their own client file while the surrounding page stays a Server Component.

### 11. What causes a hydration mismatch error, and give a concrete example?

**Answer:** It happens when the HTML React would produce on the client's first render does not match the HTML the server actually sent — commonly because the render reads something that differs between environments, like `Date.now()` (different clock/instant) or `window` (undefined on the server). A countdown timer computed directly in a component body during both server and client render is a classic example; the fix is to render a static placeholder on both server and initial client render, then update the live value from inside a `useEffect` after mount.

### 12. How does `getServerSideProps` differ from `getStaticProps`, and how does the App Router change this?

**Answer:** `getServerSideProps` runs on every request (SSR); `getStaticProps` runs at build time (SSG), optionally with `revalidate` for ISR. The App Router replaces both with `async` Server Components that call `fetch` directly, where the caching behavior — SSR-like (no cache), SSG-like (cached indefinitely), or ISR-like (`revalidate: N`) — is configured per fetch call instead of per exported function.

## Revision Checklist

- [ ] Explain the request/response and hydration sequence for CSR, SSR, SSG, and ISR without notes.
- [ ] State the TTFB vs TTI vs SEO trade-off for each rendering strategy using concrete numbers or examples.
- [ ] Explain what Next.js adds on top of React — routing, rendering strategies, API routes, and optimization — and name the plain-React equivalent you would hand-roll for each.
- [ ] Recite the Next.js vs plain React comparison table (rendering, routing, data fetching, SEO, backend, bundling) and give a real case for choosing plain React.
- [ ] Explain the difference between the App Router and Pages Router, including their data-fetching models.
- [ ] Define a Server Component vs a Client Component and explain why `"use client"` is a boundary, not just a hint.
- [ ] Reproduce a hydration mismatch bug (e.g. `Date.now()` or `window` access) and explain the fix using `useEffect`.
- [ ] Design the rendering strategy for the e-commerce product page end to end: which parts are SSG/ISR, which are Server Components, and which are Client Component islands.
