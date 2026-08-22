# HTML and CSS Interview Roadmap

HTML/CSS gets underweighted in prep because it "feels basic," but it's exactly where senior candidates get caught out — a specificity bug they can't explain, an accessibility question they've never had to answer, a performance metric they've heard of but can't fix. This folder treats it with the same rigor as the JavaScript and React folders.

## Recommended Order

1. [Semantic HTML and Accessibility](01-Semantic-HTML-and-Accessibility.md)
2. [CSS Box Model and Positioning](02-CSS-Box-Model-and-Positioning.md)
3. [Flexbox and Grid](03-Flexbox-and-Grid.md)
4. [CSS Specificity, Cascade, and Selectors](04-CSS-Specificity-Cascade-and-Selectors.md)
5. [Responsive Design and Media Queries](05-Responsive-Design-and-Media-Queries.md)
6. [CSS Architecture: BEM, Modules, CSS-in-JS](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md)
7. [The Critical Rendering Path and Browser Rendering](07-Critical-Rendering-Path-and-Browser-Rendering.md)
8. [Web Performance and Core Web Vitals](08-Web-Performance-and-Core-Web-Vitals.md)
9. [CSS Animations and Transitions](09-CSS-Animations-and-Transitions.md)

## What Mastery Looks Like

- You can explain why a layout bug happens (a box-model miscalculation, a missing positioning context, a stacking-context surprise) and fix it, not just recognize the symptom.
- You can justify a CSS architecture choice (BEM, CSS Modules, CSS-in-JS, utility-first) by its actual trade-off, not personal preference.
- You can trace a real page's rendering pipeline from HTML bytes to composited pixels, and explain which CSS changes are cheap (compositor-only) versus expensive (full reflow).
- You can name Core Web Vitals, diagnose which one a real symptom maps to, and fix it with a specific, correct technique.

## Final Readiness Checklist

- [ ] Choose the right semantic element and ARIA usage for a real UI, and audit keyboard accessibility by tabbing through a page.
- [ ] Calculate an element's actual rendered width under `content-box` vs `border-box`, and debug a real z-index stacking bug.
- [ ] Justify flexbox vs grid for a stated layout and compose them together correctly.
- [ ] Calculate CSS specificity and explain the full cascade tiebreak order.
- [ ] Build a mobile-first responsive layout using `min-width` queries, `clamp()`, and (where appropriate) container queries.
- [ ] Justify a CSS architecture choice for a stated team/product scenario.
- [ ] Draw the Critical Rendering Path and classify a given CSS property as reflow/repaint/compositor-only.
- [ ] Diagnose a real LCP, INP, or CLS problem from a described symptom and fix it with a specific technique.
- [ ] Animate with `transform`/`opacity` instead of layout-triggering properties, and explain why mechanically.

## Cross-Cutting Topics

This folder is the foundation underneath the [React folder](../React/INDEX.md) — every React component eventually renders to real DOM and CSS, and React's own performance guidance (avoid unnecessary re-renders, virtualize long lists) is solving the exact same rendering-cost problems described here, one layer up. The [JavaScript folder](../JavaScript/INDEX.md) covers the DOM APIs, events, and networking that connect script to markup.
