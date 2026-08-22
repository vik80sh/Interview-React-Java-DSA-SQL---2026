# Web Performance and Core Web Vitals

Core Web Vitals matter in interviews for a concrete reason beyond "performance is good": Google uses them as an actual search-ranking signal, and most companies now track them in production dashboards — so "how would you improve this page's performance" has become a specific, measurable question with specific, nameable metrics, not a vague "make it faster."

## 1. The Three Core Web Vitals

| Metric | Measures | Good threshold | What actually causes a bad score |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | Time until the largest visible element (usually a hero image or heading) renders | ≤ 2.5s | Slow server response, render-blocking CSS/JS, unoptimized/oversized images, client-side-rendered content that isn't visible until JS loads and runs |
| **INP** (Interaction to Next Paint — replaced FID in 2024) | Responsiveness: time from a user interaction to the next visual update | ≤ 200ms | Long JavaScript tasks blocking the main thread, heavy event handlers, large synchronous state updates |
| **CLS** (Cumulative Layout Shift) | Visual stability: how much content unexpectedly shifts after it's already rendered | ≤ 0.1 | Images/ads/embeds without reserved dimensions, web fonts swapping in and reflowing text, content injected above existing content |

These three specifically were chosen because they map to what a real user actually experiences and complains about: "the page took forever to show anything" (LCP), "I tapped a button and nothing happened for a second" (INP), and "the page jumped right as I was about to tap something, and I hit the wrong thing" (CLS) — that last one being a genuinely common, frustrating real bug.

## 2. Fixing LCP — Get the Biggest Visible Thing on Screen Faster

```html
<!-- Preload the hero image so the browser fetches it immediately, not after CSS parsing finishes -->
<link rel="preload" as="image" href="/hero-product.webp" fetchpriority="high" />

<img src="/hero-product.webp" alt="Featured product" fetchpriority="high" />
```

```html
<!-- Everything below the fold can wait — don't compete with the LCP element for bandwidth -->
<img src="/related-product-1.jpg" loading="lazy" alt="Related product" />
```

The real-world checklist: serve the LCP image (usually a hero banner or main product photo) in a modern compressed format (WebP/AVIF), preload it explicitly rather than letting the browser discover it only after parsing the DOM down to that `<img>` tag, eliminate render-blocking resources above it (a large synchronous CSS or JS file loaded before that content), and — for a CSR React app — recognize that if your LCP element only appears after a client-side data fetch completes, your actual LCP is gated by "time to first byte + JS bundle download + JS execution + fetch + render," which is exactly the argument for SSR/SSG on content-heavy pages (see the [SSR/CSR and Next.js guide](../React/11-SSR-CSR-and-Nextjs.md)).

## 3. Fixing INP — Keep the Main Thread Free to Respond

```javascript
// Blocking: a heavy synchronous computation on every keystroke freezes input responsiveness
input.addEventListener('input', () => {
  const results = expensiveFilter(hugeDataset, input.value); // blocks the main thread
  renderResults(results);
});

// Better: break the work into smaller chunks that yield back to the browser between them
function processInChunks(items, index = 0) {
  const chunk = items.slice(index, index + 100);
  chunk.forEach(processItem);
  if (index + 100 < items.length) {
    setTimeout(() => processInChunks(items, index + 100), 0); // yields a turn back to the browser
  }
}
```

A bad INP score almost always traces back to one specific cause: JavaScript that runs long enough on the main thread to delay the browser from responding to the next user interaction (a click, a tap, a keystroke). The fix is nearly always some form of "do less work synchronously, or move it off the main thread" — debouncing expensive input handlers (see the [Debounce/Throttle guide](../JavaScript/08-Debounce-Throttle-and-Error-Handling.md)), breaking a large synchronous task into smaller chunks that yield control back between them, or offloading genuinely heavy computation to a Web Worker (see the [Browser APIs guide](../JavaScript/10-Browser-APIs-Fetch-Storage-Workers.md)) so it never blocks the thread handling user input at all.

## 4. Fixing CLS — Reserve Space Before Content Arrives

```html
<!-- Reserving the image's aspect ratio prevents text below it from jumping down once it loads -->
<img src="/product.jpg" width="400" height="300" alt="Product photo" />
```

```css
.product-image {
  aspect-ratio: 4 / 3; /* reserves the correct height even before the image finishes loading */
}

@font-face {
  font-family: 'Brand Sans';
  src: url('/brand-sans.woff2');
  font-display: optional; /* avoids a layout-shifting font swap on slow connections */
}
```

CLS is almost entirely a "did you reserve space before the content that will occupy it actually arrives" problem: an `<img>` with no `width`/`height` (or `aspect-ratio`) renders at zero height until it loads, then suddenly pushes everything below it downward — explicit dimensions (or `aspect-ratio`) reserve that space immediately, even before the image data arrives. The same logic applies to ads, embeds, and any content injected by JavaScript above existing content — reserve the space up front, or inject below the fold, never both without a reserved placeholder.

## 5. Measuring What You've Actually Fixed

```javascript
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(metric => sendToAnalytics('LCP', metric.value));
onINP(metric => sendToAnalytics('INP', metric.value));
onCLS(metric => sendToAnalytics('CLS', metric.value));
```

There are two genuinely different measurement categories worth distinguishing in an interview: **lab data** (Lighthouse, WebPageTest — a controlled, repeatable simulation run once) versus **field data** (the Chrome UX Report, or your own `web-vitals` library reporting from real users' actual devices and networks). Lab data is great for catching regressions in CI before shipping; field data is what Google's search ranking and your real users actually experience, and the two can genuinely disagree — a page that scores well in a lab run on a fast dev machine can still have a poor real-world INP for users on low-end phones over throttled mobile networks, which is exactly why production teams track field data, not just a single Lighthouse score.

## Interview Questions and Answers

### 1. What do LCP, INP, and CLS each actually measure, in plain terms?

**Answer:** LCP measures how long until the largest visible piece of content actually renders — perceived load speed. INP measures how long the page takes to visually respond after a user interaction — perceived responsiveness. CLS measures how much visible content shifts unexpectedly after it's already rendered — perceived stability, and the direct cause of "I meant to tap that other button."

### 2. Why can a client-side-rendered React app struggle to get a good LCP score even with a fast server?

**Answer:** If the LCP element (say, a hero image or main content block) only appears after the JS bundle downloads, parses, executes, and fetches its own data client-side, the actual LCP timestamp is gated by all of that combined — server response time alone doesn't capture it. This is the concrete performance argument for SSR/SSG for content-heavy, LCP-sensitive pages instead of pure CSR.

### 3. What's the most common root cause of a poor INP score, and what's the general fix pattern?

**Answer:** A long-running synchronous JavaScript task blocking the main thread when the user tries to interact — a heavy computation in an input handler, an expensive re-render, or a large synchronous state update. The fix pattern is almost always reducing main-thread work per interaction: debouncing, chunking work with yields back to the browser, or moving genuinely heavy computation to a Web Worker.

### 4. Why does an `<img>` without explicit `width`/`height` cause a layout shift, and how do you prevent it?

**Answer:** Without a declared size, the browser doesn't know how much vertical space to reserve for the image before it finishes downloading, so it renders at zero height and then abruptly pushes everything below it down once the image loads and its real dimensions are known. Declaring `width`/`height` attributes or a CSS `aspect-ratio` reserves that space immediately, before the image data even arrives.

### 5. What's the difference between "lab data" and "field data" for performance measurement, and why do teams need both?

**Answer:** Lab data (Lighthouse, WebPageTest) is a controlled, repeatable simulation — great for catching regressions in CI before something ships. Field data (the Chrome UX Report, or a real-user-monitoring library like `web-vitals`) reflects what actual users on real devices and networks experience, which is also what search ranking is based on — and the two can genuinely disagree, since a fast dev machine's lab score can hide a poor real-world experience on low-end mobile devices.

### 6. Why does font loading sometimes cause a layout shift, and how does `font-display` help?

**Answer:** If a custom web font hasn't loaded yet, the browser initially renders text in a fallback font with different character widths, then swaps to the custom font once it arrives — that swap can reflow the surrounding layout if the two fonts render text at different sizes. `font-display: optional` (or a carefully chosen fallback font with similar metrics) avoids or minimizes that shift by controlling whether and how the swap happens.

## Revision Checklist

- [ ] Define LCP, INP, and CLS in plain terms and name a real cause of each scoring poorly.
- [ ] Explain why CSR alone can hurt LCP, and connect it to the SSR/SSG trade-off.
- [ ] Diagnose a poor INP score as a main-thread-blocking problem and name three real fixes.
- [ ] Fix a real CLS-causing layout by reserving space (image dimensions/`aspect-ratio`) ahead of content arrival.
- [ ] Explain the difference between lab data and field data, and why both matter.
- [ ] Set up basic real-user Core Web Vitals reporting with the `web-vitals` library.
