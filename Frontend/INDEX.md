# Frontend Interview Roadmap

This is organized into three folders, mirroring how frontend actually layers: markup and styles at the bottom, the language in the middle, the framework on top. Study in that order — a lot of React's own guidance (avoid unnecessary re-renders, virtualize long lists, animate with `transform`) is really the DOM/CSS rendering-cost problem from the HTML-CSS folder showing up one layer up.

## Folders

1. **[HTML-CSS/](HTML-CSS/INDEX.md)** — semantic markup, accessibility, the box model, flexbox/grid, specificity and the cascade, responsive design, CSS architecture, the rendering pipeline, Core Web Vitals, and animation.
2. **[JavaScript/](JavaScript/INDEX.md)** — scope/closures/`this`/prototypes, the event loop and async, memory management, browser APIs, networking/auth, event bubbling and delegation, and TypeScript language fundamentals.
3. **[React/](React/INDEX.md)** — rendering/reconciliation/Fiber, hooks, custom hooks, performance, advanced patterns, TypeScript with React, testing, state management, forms, SSR/CSR/Next.js, and frontend system design scenarios.

## How to Study

1. Read one guide.
2. Close it and explain the concept out loud using its real-world example, not the abstract definition.
3. Predict the output of its code example before checking.
4. Answer its Interview Questions and Answers section, including the reasoning, not just the one-line answer.
5. Work through its Revision Checklist and note anything you couldn't explain cleanly — revisit that specific guide before moving on.

## Interview Answer Template

For an open-ended frontend question ("how would you build X," "why does Y happen"), structure the answer:

1. **State the mechanism** — what's actually happening under the hood (the rendering pipeline, the event loop, the reconciliation algorithm).
2. **Give a real example** — a scenario you'd actually build, not a toy one.
3. **Name the trap** — the thing that goes wrong if you get this slightly wrong (a stale closure, a hydration mismatch, a layout thrash).
4. **State the trade-off** — what the fix costs, and when you'd choose differently.

## Final Cross-Folder Readiness Checklist

- [ ] Explain a real UI bug (layout shift, stale closure, unnecessary re-render, hydration mismatch) by naming the exact underlying mechanism, not just the symptom.
- [ ] Justify at least one architecture decision (CSS approach, state management library, rendering strategy) with its actual trade-off, not a stated preference.
- [ ] Design one full frontend system-design scenario end to end (dashboard, data grid, infinite scroll, file upload, or notifications).
- [ ] Explain how a React concept (event handling, performance, SSR) maps down to the browser/JS mechanism underneath it.
- [ ] Have a real, personal example ready for at least one performance fix, one accessibility fix, and one production bug you diagnosed.
