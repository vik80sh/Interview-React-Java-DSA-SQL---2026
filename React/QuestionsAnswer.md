

✅ Q1: Scalable React Dashboard (100+ pages)


---

🧩 1. Problem: Codebase becomes unmanageable

When you have 100+ pages:

Huge folders (components/, pages/)

Hard to find logic

Teams overwrite each other


✅ Solution: Feature-Based Architecture

Structure by business domain, not file type:

features/
  auth/
  dashboard/
  users/
  restaurants/

👉 Each feature contains:

components

hooks

services

state


Why it solves it:

Localized logic

Easy onboarding

Independent development



---

⚡ 2. Problem: Initial load becomes slow

100 pages = huge JS bundle → slow first load

✅ Solution: Code Splitting + Lazy Loading

const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'));

Why it solves it:

Load only what user visits

Reduces bundle size

Faster initial render



---

🔄 3. Problem: State becomes messy (Redux overload)

Common mistake:

Everything in global store


✅ Solution: Layered State Strategy

Use:

Local → useState

Server → React Query ✅

Global → Zustand (minimal)


Why it solves it:

Avoids unnecessary re-renders

Better separation

Easier debugging



---

🌐 4. Problem: API logic scattered everywhere

API calls inside components

Hard to change backend


✅ Solution: Dedicated API Layer

features/users/services/userApi.ts

Why it solves it:

Clean separation

Reusable API calls

Easy mocking/testing



---

🧱 5. Problem: Duplicate UI & inconsistent design

Different teams create:

Different buttons

Different modals


✅ Solution: Shared UI + Design System

shared/ui/
  Button.tsx
  Modal.tsx

Why it solves it:

Consistency

Faster development

Easier maintenance



---

🚀 6. Problem: Performance issues (re-renders, large lists)

Tables with 1000+ rows

Frequent re-renders


✅ Solution:

Memoization (React.memo, useMemo)

List virtualization (react-window)


Why it solves it:

Reduces DOM load

Improves FPS

Better UX



---

🔐 7. Problem: Complex access control (roles)

Dashboard apps usually have:

Admin

Manager

User


✅ Solution: Centralized Auth + Route Guards

Auth store (Zustand/Context)

Protected routes


Why it solves it:

Prevents duplication

Secure navigation



---

👥 8. Problem: Multiple teams working → conflicts

Merge conflicts

Breaking changes


✅ Solution:

Feature ownership

Strict linting + TypeScript

Contract-based APIs


Why it solves it:

Independent teams

Safer scaling



---

🧪 9. Problem: Bugs increase with scale

100 pages = high risk

✅ Solution:

Unit tests (components)

Integration tests (feature)

E2E (flows)


Why it solves it:

Confidence in releases

Prevent regressions



---

📦 10. Problem: Hard to scale further (future growth)

✅ Solution:

Modular monolith → can evolve into microfrontends


Why it solves it:

Future-proof architecture

No rewrite needed



---

🎯 Final Interview Answer (Clean)

> “I design scalable React apps by identifying common scaling problems—like code maintainability, performance, and team conflicts—and solving each systematically.
I use a feature-based architecture for maintainability, lazy loading for performance, React Query for server state, a shared design system for consistency, and strict separation of concerns. This ensures the app scales both technically and across teams.”

---


✅ Q2: Explain how code splitting and lazy loading improve performance


---

⚡ 1. Problem: Large bundle size slows initial load

In big apps:

Entire JS bundle loads at once

100+ pages = huge file

User waits before seeing anything


✅ Solution: Code Splitting

Break bundle into smaller chunks

👉 Instead of:

bundle.js (5MB)


You get:

dashboard.chunk.js

users.chunk.js

settings.chunk.js


Why it solves it:

Browser downloads only required code

Faster first paint (FCP)



---

🚀 2. Problem: Unnecessary code loaded for unused pages

User opens:

/dashboard


But app loads:

/users

/settings

/reports


✅ Solution: Lazy Loading (On-Demand Loading)

const UsersPage = React.lazy(() => import('./UsersPage'));

Why it solves it:

Code loads only when route is visited

Reduces network usage



---

⏳ 3. Problem: Blocking UI while loading heavy components

Without lazy loading:

UI freezes until everything loads


✅ Solution: Suspense + Fallback

<Suspense fallback={<Loader />}>
  <UsersPage />
</Suspense>

Why it solves it:

Shows loader instead of blank screen

Better UX



---

📦 4. Problem: Poor caching efficiency

Single bundle:

Small change → whole bundle invalidated


✅ Solution: Chunk-based caching

Each chunk cached separately


Why it solves it:

Only changed chunks reload

Faster repeat visits



---

🌐 5. Problem: Slow performance on low bandwidth

Users with:

3G / weak networks


✅ Solution:

Smaller chunks + lazy loading


Why it solves it:

Less data upfront

Faster interaction readiness



---

🧠 6. Problem: Third-party libraries increase bundle size

Example:

Charts

Rich editors


✅ Solution: Lazy load heavy dependencies

const Chart = lazy(() => import('./Chart'));

Why it solves it:

Heavy libs loaded only when needed



---

⚠️ 7. Problem: Too many small requests (over-splitting)

If you split too much:

Many network calls


✅ Solution:

Smart chunking (route-level splitting)


Why it solves it:

Balanced performance

Avoids network overhead



---

🎯 Final Interview Answer (Clean)

> “Code splitting breaks a large bundle into smaller chunks, and lazy loading ensures those chunks are loaded only when needed. This reduces initial load time, improves caching, and avoids loading unused code. Combined with Suspense, it also enhances user experience by preventing UI blocking.”



---

✅ Q3: How do you handle API rate limits gracefully on the frontend?


---

🚫 1. Problem: Too many API calls → 429 (Rate Limit Exceeded)

Causes:

Rapid clicks

Typing search input

Multiple components firing same API


✅ Solution: Request Throttling & Debouncing

👉 Example (search input):

useDebounce(value, 300);

Why it solves it:

Reduces unnecessary API calls

Prevents hitting rate limits



---

🔁 2. Problem: Retrying immediately worsens the issue

If API fails with 429:

Immediate retry = more failures


✅ Solution: Exponential Backoff Retry

Retry with delay:

1st → 1s

2nd → 2s

3rd → 4s


👉 Using React Query:

retry: 3,
retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000)

Why it solves it:

Gives server time to recover

Avoids spamming



---

🧠 3. Problem: Duplicate API calls from multiple components

Example:

Same data requested in 3 places


✅ Solution: Request Deduplication (React Query)

Same query → single API call


Why it solves it:

Prevents redundant requests

Saves rate limit quota



---

💾 4. Problem: Re-fetching same data again and again

✅ Solution: Caching

Cache API responses


👉 React Query:

staleTime: 5 * 60 * 1000

Why it solves it:

Reduces API hits

Improves performance



---

⛔ 5. Problem: No feedback to user when limit is hit

User keeps clicking → frustration

✅ Solution: Graceful UI Handling

Show message:
👉 “Too many requests, please try again in a moment”

Disable button temporarily


Why it solves it:

Better UX

Prevents repeated calls



---

🔐 6. Problem: Burst actions (button spam)

Example:

User clicks "Generate Report" 10 times


✅ Solution: Action Locking

Disable button after first click

Enable after response


Why it solves it:

Prevents duplicate requests



---

🌐 7. Problem: Global API flooding

✅ Solution: Centralized API Client

Use Axios interceptor:

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response.status === 429) {
      // handle globally
    }
    return Promise.reject(err);
  }
);

Why it solves it:

Central control

Consistent handling



---

📊 8. Problem: No awareness of rate limits

✅ Solution: Respect server headers

Some APIs send:

Retry-After


👉 Use it to delay next request

Why it solves it:

Smart retry timing

Better cooperation with backend



---

🎯 Final Interview Answer (Clean)

> “To handle API rate limits, I reduce unnecessary requests using debouncing, caching, and request deduplication. I handle failures using exponential backoff instead of immediate retries, and provide user feedback with disabled actions and error messages. I also use centralized API interceptors to handle 429 responses consistently.”




---

🔥 This answer shows:

Performance thinking

System design awareness

UX consideration



---

