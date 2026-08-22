# React Interview Roadmap

React interviews test three layers at once: do you understand the mechanism (Fiber, reconciliation, hooks), can you build with it (custom hooks, forms, state management), and can you reason about it at production scale (performance, testing, system design). This folder is ordered to build from the first layer to the third.

## Recommended Order

1. [Fundamentals: Rendering, Reconciliation, and Fiber](01-Fundamentals-Rendering-Reconciliation-Fiber.md)
2. [Hooks Deep Dive](02-Hooks-Deep-Dive.md)
3. [Custom Hooks](03-Custom-Hooks.md)
4. [Performance Optimization](04-Performance-Optimization.md)
5. [Advanced Component Patterns](05-Advanced-Component-Patterns.md)
6. [TypeScript with React](06-TypeScript-with-React.md)
7. [Testing with Jest and React Testing Library](07-Testing-React-Jest-RTL.md)
8. [State Management: Context, Redux, Zustand](08-State-Management-Context-Redux-Zustand.md)
9. [DOM, Refs, and Event Handling](09-DOM-Refs-and-Event-Handling.md)
10. [Forms and Validation](10-Forms-and-Validation.md)
11. [SSR, CSR, and Next.js](11-SSR-CSR-and-Nextjs.md)
12. [Common UI Component Problems](12-Common-UI-Component-Problems.md)
13. [Frontend System Design Scenarios](13-Frontend-System-Design-Scenarios.md)

This folder assumes the [JavaScript folder](../JavaScript/INDEX.md) fundamentals (closures, `this`, the event loop, promises) — React's hook rules and stale-closure bugs are only fully explainable once those are solid.

## What Mastery Looks Like

- You can explain *why* Fiber and reconciliation exist with a real failure mode (a search box freezing during a large re-render), not just name the terms.
- You can build a real custom hook, a compound component, and a debounced search from memory.
- You can justify a state-management choice (local state vs Context vs Zustand vs Redux) based on how often the state changes and how many components need it, not by habit.
- You can walk through the SSR/CSR/SSG/ISR trade-offs for a real page and explain what Next.js buys you over plain React for it.
- You can design a real system (a dashboard, a data grid, a notification pipeline) end to end: the problem, why it's hard at scale, the architecture, and the trade-off it costs.

## Final Readiness Checklist

- [ ] Explain the Virtual DOM, reconciliation, and Fiber with a real re-render-freezing example.
- [ ] Explain every hook's real use case and the Rules of Hooks' linked-list mental model.
- [ ] Build 3+ custom hooks from memory (useDebounce, useFetch/useAsync, useLocalStorage).
- [ ] Diagnose an unnecessary re-render and fix it with `React.memo`/`useMemo`/`useCallback` correctly, not reflexively.
- [ ] Explain the Render Props → HOC → Hooks evolution and why hooks won.
- [ ] Type a component's props, a reducer's actions, and a `forwardRef` component correctly in TypeScript.
- [ ] Write a test that checks behavior, not implementation, using RTL's query priority.
- [ ] Justify a state-management choice for a stated real scenario.
- [ ] Explain SSR/CSR/SSG/ISR trade-offs and the Next.js vs plain React comparison end to end.
- [ ] Design at least one full frontend system-design scenario (dashboard, infinite scroll, data grid, file upload, or notifications) unprompted.

## Cross-Cutting Topics

The [JavaScript folder](../JavaScript/INDEX.md) covers language fundamentals, browser APIs, networking, and auth that apply whether or not you're using React. The [HTML-CSS folder](../HTML-CSS/INDEX.md) covers semantic markup, accessibility, layout, and the rendering pipeline underneath everything React eventually paints to the screen.
