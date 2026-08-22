# Responsive Design and Media Queries

Every product ships to phones, tablets, and desktops from one codebase, so "how would you make this responsive" is asked in some form at nearly every frontend interview. The strong answer isn't "add a media query" — it's knowing which of several tools (fluid layout, relative units, container queries, breakpoints) actually fits the problem, and reaching for a media query last, not first.

## 1. Mobile-First vs Desktop-First — and Why It Changes Your Media Query Direction

```css
/* Mobile-first: base styles ARE the mobile styles; media queries ADD complexity for larger screens */
.product-grid {
  display: grid;
  grid-template-columns: 1fr; /* single column by default */
}

@media (min-width: 768px) {
  .product-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .product-grid { grid-template-columns: repeat(4, 1fr); }
}
```

Mobile-first uses `min-width` queries, layering on complexity as the viewport grows — the base (unqueried) styles are what phones get, which is deliberate: phones are the most constrained target, so writing for them first forces a simpler, more robust layout that then gets enhanced, rather than writing a complex desktop layout first and trying to unwind it down to a phone with `max-width` overrides. Nearly every production team defaults to mobile-first for this reason, and it's the expected answer unless there's a stated reason otherwise (e.g. an internal enterprise tool used exclusively on desktop).

## 2. The Viewport Meta Tag — the One Line That Makes Media Queries Work at All

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

Without this, mobile browsers render the page at a fake desktop-width viewport (historically ~980px) and shrink it to fit the screen — every media query breakpoint you write becomes meaningless because the browser never reports the phone's *actual* width. This single line is a real, common "why do my media queries not seem to fire on mobile" bug and is worth knowing as the first thing to check.

## 3. Relative Units — Sizing That Adapts Without a Media Query at All

```css
:root {
  font-size: 100%; /* respects the user's browser default (usually 16px) */
}

.card {
  padding: 1.5rem;        /* relative to the root font-size, NOT the parent's */
  font-size: 1.125rem;
}

.hero-title {
  font-size: clamp(1.5rem, 5vw, 3rem); /* scales smoothly with viewport, with a floor and ceiling */
}
```

- `rem` is relative to the root (`html`) font-size, so it scales predictably even in deeply nested components — unlike `em`, which compounds relative to each ancestor's font-size and can produce surprising sizes several levels deep.
- `vw`/`vh` are relative to the viewport itself — useful for a hero title that should genuinely scale with screen width, but risky for body text alone (it can become unreadably small or comically large at the extremes).
- `clamp(min, preferred, max)` is the real modern answer to "how do I make text scale with the viewport without a dozen breakpoints" — it takes a fluid `vw`-based preferred value but clamps it between a sane floor and ceiling, which is genuinely one of the more useful additions to CSS for responsive typography in the last several years.

## 4. Media Query Features Beyond Just Width

```css
@media (prefers-color-scheme: dark) {
  body { background: #111; color: #eee; }
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}

@media (hover: hover) {
  .card:hover { transform: translateY(-4px); } /* only apply hover lift on devices that truly support hover */
}
```

Width isn't the only signal worth querying: `prefers-color-scheme` respects the OS-level dark mode setting (a real, expected feature in nearly every modern product), `prefers-reduced-motion` respects a genuine accessibility setting for users with vestibular disorders who can be made physically ill by unnecessary motion, and `hover`/`pointer` media features distinguish a mouse-driven device from a touch device — applying a hover-lift effect only where hovering is actually a real interaction, rather than leaving a touch user's tap stuck in a "hovered" visual state.

## 5. Container Queries — Responsive to the Component's Container, Not the Viewport

```css
.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}

@container sidebar (min-width: 300px) {
  .product-card { display: flex; } /* switches layout based on the SIDEBAR's width, not the page's */
}
```

This solves a real problem viewport media queries genuinely cannot: the same `ProductCard` component rendered inside a narrow sidebar and inside a wide main content area needs *different* internal layouts at the *same* overall page/viewport width — a plain `@media` query has no way to know how wide the component's actual container is, only the whole viewport. Container queries are the newer (broadly supported since 2023) answer, and knowing they exist — beyond just viewport media queries — is a genuine signal of staying current with CSS.

## 6. Responsive Images — Not Just `max-width: 100%`

```html
<img
  src="product-800w.jpg"
  srcset="product-400w.jpg 400w, product-800w.jpg 800w, product-1600w.jpg 1600w"
  sizes="(min-width: 1024px) 50vw, 100vw"
  alt="Wireless headphones, side view"
  loading="lazy"
/>
```

`srcset` + `sizes` lets the browser choose the *right-sized* image file for the current viewport and device pixel ratio, instead of shipping a 1600px image to a 400px-wide phone screen and just letting CSS scale it down visually — a real, measurable performance win (less bandwidth, faster load) that `max-width: 100%; height: auto` alone (a CSS-only fix that only prevents visual overflow, not the wasted download) doesn't provide.

## Interview Questions and Answers

### 1. Why is mobile-first (using `min-width` media queries) generally preferred over desktop-first (`max-width`)?

**Answer:** Writing the base, unqueried styles for the most constrained target (mobile) forces a simpler, more robust layout up front, and each media query then only adds complexity as space becomes available. Desktop-first tends to produce a complex base layout that then has to be unwound piece by piece for smaller screens, which is more fragile and harder to maintain.

### 2. Why don't media query breakpoints work correctly on mobile if the viewport meta tag is missing?

**Answer:** Without `<meta name="viewport" content="width=device-width, initial-scale=1">`, mobile browsers render the page at a fake, wider desktop-like viewport and scale it down visually, so the browser never reports the phone's true width to your media queries — every breakpoint effectively never matches what you'd expect.

### 3. `rem` vs `em` — what's the practical difference, and why does it matter in deeply nested components?

**Answer:** `rem` is always relative to the root element's font-size, so its computed size is predictable no matter how deeply nested the element is. `em` is relative to its own element's (or inherited) font-size, which compounds across nested elements that each set their own font-size — producing sizes that are hard to predict several levels deep, which is why `rem` is the safer default for most sizing.

### 4. What does `clamp(1.5rem, 5vw, 3rem)` actually do, and why is it useful for responsive typography?

**Answer:** It computes a fluid, viewport-relative size (`5vw`) but clamps the result between a minimum (`1.5rem`) and maximum (`3rem`), so text scales smoothly with the viewport without ever becoming unreadably small or absurdly large at the extremes — replacing what used to require several explicit breakpoints with one line.

### 5. What real problem do container queries solve that viewport media queries cannot?

**Answer:** A component that renders inside different-width containers on the same page — say, a card shown both in a narrow sidebar and a wide main area — needs different internal layouts at the exact same overall viewport width. A `@media` query only knows the viewport's width; a `@container` query lets the component respond to its actual container's width instead, which viewport queries have no way to express.

### 6. Why is `srcset`/`sizes` a real performance improvement over just using `max-width: 100%` on an image?

**Answer:** `max-width: 100%` only prevents visual overflow — the browser still downloads the full-resolution image file regardless of how small it's displayed. `srcset`/`sizes` lets the browser choose and download an appropriately sized image file for the actual rendered size and device pixel ratio, which is a real bandwidth and load-time saving, not just a visual fix.

### 7. Why should `prefers-reduced-motion` be treated as a real accessibility requirement rather than a nice-to-have?

**Answer:** Some users have vestibular disorders where unnecessary animation and motion can cause genuine physical discomfort or dizziness, not just annoyance. Respecting `prefers-reduced-motion: reduce` by disabling non-essential animations for those users is an accessibility accommodation, in the same category as screen-reader support, not a cosmetic preference.

## Revision Checklist

- [ ] Explain mobile-first vs desktop-first and why `min-width` queries are the common default.
- [ ] Explain why the viewport meta tag is required for media queries to behave correctly on mobile.
- [ ] Choose correctly between `rem`, `em`, `vw`/`vh`, and `clamp()` for a stated real sizing need.
- [ ] Use `prefers-color-scheme`, `prefers-reduced-motion`, and `hover`/`pointer` media features appropriately.
- [ ] Explain what a container query solves that a viewport media query structurally cannot.
- [ ] Set up `srcset`/`sizes` for a responsive image and explain the bandwidth benefit over CSS-only scaling.
