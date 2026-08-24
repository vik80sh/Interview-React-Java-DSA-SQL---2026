# Master Question Bank — HTML & CSS

This file aggregates every interview question and its full answer from all nine files in this folder (`01-Semantic-HTML-and-Accessibility.md` through `09-CSS-Animations-and-Transitions.md`), in one place, for quick revision. Each file's questions are kept under their own section with their original numbering preserved, and every question links back to its source file — and to the exact question heading within it — so you can open the original for the surrounding explanation, code samples, and revision checklist.

## [1. Semantic HTML and Accessibility](01-Semantic-HTML-and-Accessibility.md)

### 1. Why does semantic HTML matter if the page looks identical either way?

**Answer:** The visual result being identical is exactly the trap — a screen reader, a search engine crawler, and browser built-in keyboard/focus behavior all read the *structure*, not the pixels. A `<div class="nav">` looks like navigation to a sighted user but gives a screen reader nothing to jump to, unlike a real `<nav>` landmark.

*Source: [01-Semantic-HTML-and-Accessibility.md#1-why-does-semantic-html-matter-if-the-page-looks-identical-either-way](01-Semantic-HTML-and-Accessibility.md#1-why-does-semantic-html-matter-if-the-page-looks-identical-either-way)*

### 2. When should you reach for an ARIA attribute instead of a native HTML element?

**Answer:** Only when no native element already expresses what you need — ARIA's first rule is "don't use ARIA if HTML already solves it." A `<button>` already has focus, keyboard activation, and the right role built in; a custom widget like a combobox or a tab panel, which has no single native equivalent, is where `role`/`aria-*` attributes actually earn their place.

*Source: [01-Semantic-HTML-and-Accessibility.md#2-when-should-you-reach-for-an-aria-attribute-instead-of-a-native-html-element](01-Semantic-HTML-and-Accessibility.md#2-when-should-you-reach-for-an-aria-attribute-instead-of-a-native-html-element)*

### 3. What's the fastest way to self-audit a page's keyboard accessibility?

**Answer:** Unplug the mouse and tab through the entire page. Every interactive control should be reachable in a sensible order, its focus indicator should be visible, and a modal or dropdown should trap focus while open rather than letting `Tab` leak into the content behind it.

*Source: [01-Semantic-HTML-and-Accessibility.md#3-whats-the-fastest-way-to-self-audit-a-pages-keyboard-accessibility](01-Semantic-HTML-and-Accessibility.md#3-whats-the-fastest-way-to-self-audit-a-pages-keyboard-accessibility)*

### 4. Why should `alt=""` be used for decorative images instead of omitting the `alt` attribute entirely?

**Answer:** A missing `alt` attribute causes some screen readers to announce the image's filename or URL as a fallback, which is noise for a purely decorative image. An explicit empty `alt=""` tells the screen reader to skip the image entirely, which is the correct behavior when the image adds no information.

*Source: [01-Semantic-HTML-and-Accessibility.md#4-why-should-alt-be-used-for-decorative-images-instead-of-omitting-the-alt-attribute-entirely](01-Semantic-HTML-and-Accessibility.md#4-why-should-alt-be-used-for-decorative-images-instead-of-omitting-the-alt-attribute-entirely)*

### 5. Why must heading levels (`h1`–`h6`) nest in order rather than being picked by visual size?

**Answer:** Screen reader users navigate by jumping between headings to build a mental outline of the page, the same way a sighted user's eyes skim heading text. Skipping from `h1` to `h4` because a designer wanted smaller text at that point breaks that outline — heading level should reflect document structure, and font size should be controlled with CSS instead.

*Source: [01-Semantic-HTML-and-Accessibility.md#5-why-must-heading-levels-h1h6-nest-in-order-rather-than-being-picked-by-visual-size](01-Semantic-HTML-and-Accessibility.md#5-why-must-heading-levels-h1h6-nest-in-order-rather-than-being-picked-by-visual-size)*

### 6. What does `aria-live="polite"` actually do, and when would you use it?

**Answer:** It tells assistive technology to announce changes inside that region without interrupting whatever the user is currently doing (as opposed to `assertive`, which interrupts immediately). A real use case is a toast notification or an "item added to cart" confirmation that appears without a page navigation — without `aria-live`, a screen reader user would never know it appeared at all.

*Source: [01-Semantic-HTML-and-Accessibility.md#6-what-does-aria-livepolite-actually-do-and-when-would-you-use-it](01-Semantic-HTML-and-Accessibility.md#6-what-does-aria-livepolite-actually-do-and-when-would-you-use-it)*

### 7. Why is `<label for="...">` linked to an input's `id` better than just placing text near the input?

**Answer:** The explicit association is what lets a screen reader announce the label together with the input's role and state, and it also makes the label itself clickable to focus/activate the input — a real usability improvement for everyone, not only assistive-tech users, especially on small touch targets.

*Source: [01-Semantic-HTML-and-Accessibility.md#7-why-is-label-for-linked-to-an-inputs-id-better-than-just-placing-text-near-the-input](01-Semantic-HTML-and-Accessibility.md#7-why-is-label-for-linked-to-an-inputs-id-better-than-just-placing-text-near-the-input)*

## [2. CSS Box Model and Positioning](02-CSS-Box-Model-and-Positioning.md)

### 1. Why does a `300px`-wide element with `padding: 20px` sometimes render at `340px`, and sometimes render at exactly `300px`?

**Answer:** It depends on `box-sizing`. The default `content-box` applies `width` only to the content area, adding padding and border on top, producing `340px`. `border-box` makes `width` include padding and border, carving them out of the declared width instead — which is why almost every real project sets `box-sizing: border-box` globally as one of the first lines of its CSS reset.

*Source: [02-CSS-Box-Model-and-Positioning.md#1-why-does-a-300px-wide-element-with-padding-20px-sometimes-render-at-340px-and-sometimes-render-at-exactly-300px](02-CSS-Box-Model-and-Positioning.md#1-why-does-a-300px-wide-element-with-padding-20px-sometimes-render-at-340px-and-sometimes-render-at-exactly-300px)*

### 2. Why do two stacked block elements with `margin-bottom: 20px` and `margin-top: 20px` end up with only 20px of space between them, not 40px?

**Answer:** Adjacent vertical margins between block-level siblings collapse into a single margin equal to the larger of the two, not their sum. This collapsing doesn't happen with padding, and it doesn't happen between flex or grid children, which is one real reason teams sometimes switch a layout to flexbox specifically to get predictable spacing.

*Source: [02-CSS-Box-Model-and-Positioning.md#2-why-do-two-stacked-block-elements-with-margin-bottom-20px-and-margin-top-20px-end-up-with-only-20px-of-space-between-them-not-40px](02-CSS-Box-Model-and-Positioning.md#2-why-do-two-stacked-block-elements-with-margin-bottom-20px-and-margin-top-20px-end-up-with-only-20px-of-space-between-them-not-40px)*

### 3. Why does `position: absolute` sometimes position an element relative to the whole page instead of its intended parent?

**Answer:** An absolutely positioned element is placed relative to its nearest ancestor with a `position` value other than `static` — if no ancestor has one, it falls back to the page's initial containing block. The fix is giving the intended parent `position: relative` (or another non-static value) so it becomes the positioning context.

*Source: [02-CSS-Box-Model-and-Positioning.md#3-why-does-position-absolute-sometimes-position-an-element-relative-to-the-whole-page-instead-of-its-intended-parent](02-CSS-Box-Model-and-Positioning.md#3-why-does-position-absolute-sometimes-position-an-element-relative-to-the-whole-page-instead-of-its-intended-parent)*

### 4. Why can a dropdown with `z-index: 999` still render behind an element with `z-index: 1`?

**Answer:** `z-index` values only compare meaningfully within the same stacking context. If an ancestor of that other element created a new stacking context (via `transform`, `opacity < 1`, `will-change`, or `isolation: isolate`), everything inside it stacks as a unit relative to siblings outside — so a low z-index inside a "higher" stacking context can still beat a high z-index trapped inside a "lower" one.

*Source: [02-CSS-Box-Model-and-Positioning.md#4-why-can-a-dropdown-with-z-index-999-still-render-behind-an-element-with-z-index-1](02-CSS-Box-Model-and-Positioning.md#4-why-can-a-dropdown-with-z-index-999-still-render-behind-an-element-with-z-index-1)*

### 5. What makes `position: sticky` different from both `relative` and `fixed`?

**Answer:** It behaves like `relative` (staying in normal flow, so its siblings still reserve its original space) until the page scrolls past a threshold you define (like `top: 0`), at which point it behaves like `fixed` relative to its nearest scrolling ancestor. `fixed` alone never respects normal flow at all, and `relative` alone never "catches" onto the viewport during scroll.

*Source: [02-CSS-Box-Model-and-Positioning.md#5-what-makes-position-sticky-different-from-both-relative-and-fixed](02-CSS-Box-Model-and-Positioning.md#5-what-makes-position-sticky-different-from-both-relative-and-fixed)*

### 6. Why does a tooltip inside a card sometimes get clipped even though it's `position: absolute`?

**Answer:** If the card (or any ancestor) has `overflow: hidden` (or `auto`/`scroll`), it clips any content that visually extends past its box, including an absolutely positioned child trying to escape it. The real production fix is usually rendering the tooltip through a portal so its DOM node lives outside the clipping ancestor entirely, rather than trying to override `overflow` on a container that needs it for other reasons.

*Source: [02-CSS-Box-Model-and-Positioning.md#6-why-does-a-tooltip-inside-a-card-sometimes-get-clipped-even-though-its-position-absolute](02-CSS-Box-Model-and-Positioning.md#6-why-does-a-tooltip-inside-a-card-sometimes-get-clipped-even-though-its-position-absolute)*

## [3. Flexbox and Grid](03-Flexbox-and-Grid.md)

### 1. How do you decide between flexbox and grid for a given layout?

**Answer:** Flexbox for one-dimensional, content-driven layout — a row or column where item sizing follows the content, like a navbar or button group. Grid for two-dimensional, structure-driven layout — where you define the rows and columns first and place content into them, like a page shell or a responsive card gallery. In practice they compose: grid for the outer skeleton, flexbox for aligning things inside one region of it.

*Source: [03-Flexbox-and-Grid.md#1-how-do-you-decide-between-flexbox-and-grid-for-a-given-layout](03-Flexbox-and-Grid.md#1-how-do-you-decide-between-flexbox-and-grid-for-a-given-layout)*

### 2. What's the difference between `justify-content` and `align-items` in flexbox?

**Answer:** `justify-content` controls alignment along the main axis — the direction `flex-direction` sets the items to flow in. `align-items` controls alignment along the cross axis, perpendicular to that flow. Swapping `flex-direction` from `row` to `column` swaps which axis each property actually controls, which is the source of a lot of real confusion.

*Source: [03-Flexbox-and-Grid.md#2-whats-the-difference-between-justify-content-and-align-items-in-flexbox](03-Flexbox-and-Grid.md#2-whats-the-difference-between-justify-content-and-align-items-in-flexbox)*

### 3. How does `flex: 1` actually work, and how would you build a cart row with a flexible name column and a fixed-width price column?

**Answer:** `flex: 1` is shorthand for `flex-grow: 1; flex-shrink: 1; flex-basis: 0%`, meaning the item grows to consume available leftover space. Setting the name column to `flex: 1` and the price column to `flex: 0 0 80px` (never grow, never shrink, fixed basis) gives exactly that layout without manual width math.

*Source: [03-Flexbox-and-Grid.md#3-how-does-flex-1-actually-work-and-how-would-you-build-a-cart-row-with-a-flexible-name-column-and-a-fixed-width-price-column](03-Flexbox-and-Grid.md#3-how-does-flex-1-actually-work-and-how-would-you-build-a-cart-row-with-a-flexible-name-column-and-a-fixed-width-price-column)*

### 4. What does `repeat(auto-fill, minmax(220px, 1fr))` actually do, and why is it useful?

**Answer:** It creates as many columns as fit the container, each at least 220px wide, sharing any leftover space equally via `1fr` — producing a responsive card grid that adds or removes columns as the viewport resizes, with zero media queries needed for that behavior specifically.

*Source: [03-Flexbox-and-Grid.md#4-what-does-repeatauto-fill-minmax220px-1fr-actually-do-and-why-is-it-useful](03-Flexbox-and-Grid.md#4-what-does-repeatauto-fill-minmax220px-1fr-actually-do-and-why-is-it-useful)*

### 5. Why do two flex items in a row end up the same height even when neither has an explicit height set?

**Answer:** Flex items default to `align-items: stretch` on the cross axis, so each item stretches to match the height of the tallest item in that flex line unless a different `align-items`/`align-self` value overrides it. This is the real mechanism behind the common "equal height columns" layout trick, not a special CSS feature — it's the flexbox default doing its normal job.

*Source: [03-Flexbox-and-Grid.md#5-why-do-two-flex-items-in-a-row-end-up-the-same-height-even-when-neither-has-an-explicit-height-set](03-Flexbox-and-Grid.md#5-why-do-two-flex-items-in-a-row-end-up-the-same-height-even-when-neither-has-an-explicit-height-set)*

### 6. How would you center a modal both horizontally and vertically, and why is that historically hard in CSS?

**Answer:** `display: flex; justify-content: center; align-items: center` on the overlay container centers its child both ways in two lines. It's historically "hard" because centering vertically has no single clean pre-flexbox solution — old techniques relied on table-cell display, absolute positioning with negative margins computed from a known height, or line-height hacks, all fragile compared to flexbox's built-in cross-axis alignment.

*Source: [03-Flexbox-and-Grid.md#6-how-would-you-center-a-modal-both-horizontally-and-vertically-and-why-is-that-historically-hard-in-css](03-Flexbox-and-Grid.md#6-how-would-you-center-a-modal-both-horizontally-and-vertically-and-why-is-that-historically-hard-in-css)*

### 7. What's the difference between `auto-fill` and `auto-fit` in a grid `repeat()` track list?

**Answer:** Both fit as many tracks of the given minimum size as the container allows, but `auto-fill` keeps empty tracks in the layout (leaving visible gaps if there are fewer items than tracks), while `auto-fit` collapses those empty tracks to zero width, letting the actual items stretch to fill the remaining space instead of leaving empty columns.

*Source: [03-Flexbox-and-Grid.md#7-whats-the-difference-between-auto-fill-and-auto-fit-in-a-grid-repeat-track-list](03-Flexbox-and-Grid.md#7-whats-the-difference-between-auto-fill-and-auto-fit-in-a-grid-repeat-track-list)*

## [4. CSS Specificity, the Cascade, and Selectors](04-CSS-Specificity-Cascade-and-Selectors.md)

### 1. Two CSS rules target the same element with the same specificity — which one wins, and why?

**Answer:** The one that appears later in source order (later in the same file, or in a file loaded/imported later) wins. This is the cascade's final tiebreaker after origin/importance and specificity, and it's the reason stylesheet load order matters even when nobody is using `!important`.

*Source: [04-CSS-Specificity-Cascade-and-Selectors.md#1-two-css-rules-target-the-same-element-with-the-same-specificity--which-one-wins-and-why](04-CSS-Specificity-Cascade-and-Selectors.md#1-two-css-rules-target-the-same-element-with-the-same-specificity--which-one-wins-and-why)*

### 2. Why does an ID selector always beat any number of chained class selectors?

**Answer:** Specificity is compared as a 3-part tuple (IDs, classes/attributes/pseudo-classes, elements) column by column, not summed into a single number — so any nonzero value in the ID column outranks an arbitrarily large value in the class column. `(1, 0, 0)` beats `(0, 50, 0)`.

*Source: [04-CSS-Specificity-Cascade-and-Selectors.md#2-why-does-an-id-selector-always-beat-any-number-of-chained-class-selectors](04-CSS-Specificity-Cascade-and-Selectors.md#2-why-does-an-id-selector-always-beat-any-number-of-chained-class-selectors)*

### 3. Why do experienced teams avoid deep selector chains like `.page .content .card .title`?

**Answer:** Each extra class in the chain raises that rule's specificity, making it progressively harder for anyone else to override later without matching or exceeding that same specificity — which is exactly how codebases end up reaching for `!important` just to win an otherwise-avoidable specificity fight.

*Source: [04-CSS-Specificity-Cascade-and-Selectors.md#3-why-do-experienced-teams-avoid-deep-selector-chains-like-page-content-card-title](04-CSS-Specificity-Cascade-and-Selectors.md#3-why-do-experienced-teams-avoid-deep-selector-chains-like-page-content-card-title)*

### 4. Why is `!important` considered a real long-term problem rather than just a quick fix?

**Answer:** It overrides specificity entirely, so once used, the only way to override it later is with another equal-or-higher-specificity `!important` rule — which invites an escalating arms race between teams/components, after which nobody can predict what actually renders without inspecting computed styles in DevTools. The durable fix is reducing selector specificity project-wide, not stacking more `!important`s.

*Source: [04-CSS-Specificity-Cascade-and-Selectors.md#4-why-is-important-considered-a-real-long-term-problem-rather-than-just-a-quick-fix](04-CSS-Specificity-Cascade-and-Selectors.md#4-why-is-important-considered-a-real-long-term-problem-rather-than-just-a-quick-fix)*

### 5. What's the practical difference between `.card .title` and `.card > .title`?

**Answer:** `.card .title` matches `.title` at any nesting depth inside `.card`, including inside a nested card. `.card > .title` matches only a `.title` that is a direct child of `.card` — which matters for real components that can contain other instances of themselves, like a card that can contain another card.

*Source: [04-CSS-Specificity-Cascade-and-Selectors.md#5-whats-the-practical-difference-between-card-title-and-card--title](04-CSS-Specificity-Cascade-and-Selectors.md#5-whats-the-practical-difference-between-card-title-and-card--title)*

### 6. Why does setting `color` on `body` style the whole page, but setting `border` on `body` does nothing to nested elements?

**Answer:** `color` (and other typography properties like `font-family`, `font-size`, `line-height`) inherit by default, cascading down to every descendant unless overridden. Box-model properties like `border`, `margin`, and `padding` don't inherit at all — they have to be set explicitly on whichever element actually needs them.

*Source: [04-CSS-Specificity-Cascade-and-Selectors.md#6-why-does-setting-color-on-body-style-the-whole-page-but-setting-border-on-body-does-nothing-to-nested-elements](04-CSS-Specificity-Cascade-and-Selectors.md#6-why-does-setting-color-on-body-style-the-whole-page-but-setting-border-on-body-does-nothing-to-nested-elements)*

## [5. Responsive Design and Media Queries](05-Responsive-Design-and-Media-Queries.md)

### 1. Why is mobile-first (using `min-width` media queries) generally preferred over desktop-first (`max-width`)?

**Answer:** Writing the base, unqueried styles for the most constrained target (mobile) forces a simpler, more robust layout up front, and each media query then only adds complexity as space becomes available. Desktop-first tends to produce a complex base layout that then has to be unwound piece by piece for smaller screens, which is more fragile and harder to maintain.

*Source: [05-Responsive-Design-and-Media-Queries.md#1-why-is-mobile-first-using-min-width-media-queries-generally-preferred-over-desktop-first-max-width](05-Responsive-Design-and-Media-Queries.md#1-why-is-mobile-first-using-min-width-media-queries-generally-preferred-over-desktop-first-max-width)*

### 2. Why don't media query breakpoints work correctly on mobile if the viewport meta tag is missing?

**Answer:** Without `<meta name="viewport" content="width=device-width, initial-scale=1">`, mobile browsers render the page at a fake, wider desktop-like viewport and scale it down visually, so the browser never reports the phone's true width to your media queries — every breakpoint effectively never matches what you'd expect.

*Source: [05-Responsive-Design-and-Media-Queries.md#2-why-dont-media-query-breakpoints-work-correctly-on-mobile-if-the-viewport-meta-tag-is-missing](05-Responsive-Design-and-Media-Queries.md#2-why-dont-media-query-breakpoints-work-correctly-on-mobile-if-the-viewport-meta-tag-is-missing)*

### 3. `rem` vs `em` — what's the practical difference, and why does it matter in deeply nested components?

**Answer:** `rem` is always relative to the root element's font-size, so its computed size is predictable no matter how deeply nested the element is. `em` is relative to its own element's (or inherited) font-size, which compounds across nested elements that each set their own font-size — producing sizes that are hard to predict several levels deep, which is why `rem` is the safer default for most sizing.

*Source: [05-Responsive-Design-and-Media-Queries.md#3-rem-vs-em--whats-the-practical-difference-and-why-does-it-matter-in-deeply-nested-components](05-Responsive-Design-and-Media-Queries.md#3-rem-vs-em--whats-the-practical-difference-and-why-does-it-matter-in-deeply-nested-components)*

### 4. What does `clamp(1.5rem, 5vw, 3rem)` actually do, and why is it useful for responsive typography?

**Answer:** It computes a fluid, viewport-relative size (`5vw`) but clamps the result between a minimum (`1.5rem`) and maximum (`3rem`), so text scales smoothly with the viewport without ever becoming unreadably small or absurdly large at the extremes — replacing what used to require several explicit breakpoints with one line.

*Source: [05-Responsive-Design-and-Media-Queries.md#4-what-does-clamp15rem-5vw-3rem-actually-do-and-why-is-it-useful-for-responsive-typography](05-Responsive-Design-and-Media-Queries.md#4-what-does-clamp15rem-5vw-3rem-actually-do-and-why-is-it-useful-for-responsive-typography)*

### 5. What real problem do container queries solve that viewport media queries cannot?

**Answer:** A component that renders inside different-width containers on the same page — say, a card shown both in a narrow sidebar and a wide main area — needs different internal layouts at the exact same overall viewport width. A `@media` query only knows the viewport's width; a `@container` query lets the component respond to its actual container's width instead, which viewport queries have no way to express.

*Source: [05-Responsive-Design-and-Media-Queries.md#5-what-real-problem-do-container-queries-solve-that-viewport-media-queries-cannot](05-Responsive-Design-and-Media-Queries.md#5-what-real-problem-do-container-queries-solve-that-viewport-media-queries-cannot)*

### 6. Why is `srcset`/`sizes` a real performance improvement over just using `max-width: 100%` on an image?

**Answer:** `max-width: 100%` only prevents visual overflow — the browser still downloads the full-resolution image file regardless of how small it's displayed. `srcset`/`sizes` lets the browser choose and download an appropriately sized image file for the actual rendered size and device pixel ratio, which is a real bandwidth and load-time saving, not just a visual fix.

*Source: [05-Responsive-Design-and-Media-Queries.md#6-why-is-srcsetsizes-a-real-performance-improvement-over-just-using-max-width-100-on-an-image](05-Responsive-Design-and-Media-Queries.md#6-why-is-srcsetsizes-a-real-performance-improvement-over-just-using-max-width-100-on-an-image)*

### 7. Why should `prefers-reduced-motion` be treated as a real accessibility requirement rather than a nice-to-have?

**Answer:** Some users have vestibular disorders where unnecessary animation and motion can cause genuine physical discomfort or dizziness, not just annoyance. Respecting `prefers-reduced-motion: reduce` by disabling non-essential animations for those users is an accessibility accommodation, in the same category as screen-reader support, not a cosmetic preference.

*Source: [05-Responsive-Design-and-Media-Queries.md#7-why-should-prefers-reduced-motion-be-treated-as-a-real-accessibility-requirement-rather-than-a-nice-to-have](05-Responsive-Design-and-Media-Queries.md#7-why-should-prefers-reduced-motion-be-treated-as-a-real-accessibility-requirement-rather-than-a-nice-to-have)*

## [6. CSS Architecture: BEM, CSS Modules, and CSS-in-JS](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md)

### 1. What specific problem does BEM, CSS Modules, and CSS-in-JS all independently try to solve?

**Answer:** CSS has no built-in scoping — every class name is effectively global, so two unrelated components can accidentally use the same class name and one silently overrides the other based on source order. Each of these approaches is a different strategy (naming convention, compiler-enforced renaming, or colocated runtime-scoped styles) for preventing that collision.

*Source: [06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#1-what-specific-problem-does-bem-css-modules-and-css-in-js-all-independently-try-to-solve](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#1-what-specific-problem-does-bem-css-modules-and-css-in-js-all-independently-try-to-solve)*

### 2. Does BEM actually prevent naming collisions, or just make them less likely?

**Answer:** Just less likely. BEM is purely a naming convention with no tooling enforcement — two teams could still both define `.product-card__title` and collide. Its real value is making collisions much rarer in practice (since every class is prefixed with its owning block) and keeping specificity flat, not providing a hard guarantee the way a compiler-based solution does.

*Source: [06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#2-does-bem-actually-prevent-naming-collisions-or-just-make-them-less-likely](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#2-does-bem-actually-prevent-naming-collisions-or-just-make-them-less-likely)*

### 3. How do CSS Modules actually guarantee unique class names, and what do you give up in exchange?

**Answer:** The build tool rewrites each class name into a genuinely unique generated name (like `ProductCard_card__a3f9x`) at build time, so collisions become structurally impossible rather than just unlikely. The trade-off is that styles are scoped per file by default — sharing a class across components requires an explicit `composes` or importing a shared module, rather than casually reusing a class name from outside.

*Source: [06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#3-how-do-css-modules-actually-guarantee-unique-class-names-and-what-do-you-give-up-in-exchange](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#3-how-do-css-modules-actually-guarantee-unique-class-names-and-what-do-you-give-up-in-exchange)*

### 4. What's the real advantage of CSS-in-JS over CSS Modules for dynamic styling, and what's the real cost?

**Answer:** CSS-in-JS libraries let styles reference component props/state directly in the style definition itself, avoiding manual class-name toggling based on state. The cost is usually a runtime performance and bundle-size overhead for libraries that generate and inject styles while the app runs, which is why the ecosystem has shifted toward zero-runtime CSS-in-JS or utility-first CSS for performance-sensitive products.

*Source: [06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#4-whats-the-real-advantage-of-css-in-js-over-css-modules-for-dynamic-styling-and-whats-the-real-cost](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#4-whats-the-real-advantage-of-css-in-js-over-css-modules-for-dynamic-styling-and-whats-the-real-cost)*

### 5. What's the actual trade-off with a utility-first approach like Tailwind, stated honestly rather than as a preference?

**Answer:** You eliminate custom class-naming decisions and specificity conflicts entirely, since there are no custom classes to name or collide, and unused utilities get purged from the final build. In exchange, markup becomes visually denser and harder to skim, and there's a real learning curve to the utility vocabulary before it feels fast to write.

*Source: [06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#5-whats-the-actual-trade-off-with-a-utility-first-approach-like-tailwind-stated-honestly-rather-than-as-a-preference](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#5-whats-the-actual-trade-off-with-a-utility-first-approach-like-tailwind-stated-honestly-rather-than-as-a-preference)*

## [7. The Critical Rendering Path and Browser Rendering](07-Critical-Rendering-Path-and-Browser-Rendering.md)

### 1. Why is CSSOM construction render-blocking, while DOM construction is incremental?

**Answer:** DOM nodes can be built as HTML bytes stream in because each new node just extends the tree. CSSOM can't be safely built incrementally because CSS's cascade means a rule appearing later in a stylesheet can override one that appeared earlier — the browser can't know the final computed styles until it has parsed the entire stylesheet, so it blocks rendering until CSS finishes downloading and parsing.

*Source: [07-Critical-Rendering-Path-and-Browser-Rendering.md#1-why-is-cssom-construction-render-blocking-while-dom-construction-is-incremental](07-Critical-Rendering-Path-and-Browser-Rendering.md#1-why-is-cssom-construction-render-blocking-while-dom-construction-is-incremental)*

### 2. What's the practical difference between a reflow and a repaint, and why does it matter for performance?

**Answer:** A reflow recalculates geometry (size/position) and can cascade to affect sibling and ancestor elements, making it expensive; a repaint only recalculates visual appearance with no geometry involved and skips the layout step entirely, making it meaningfully cheaper. Knowing which category a given CSS property falls into is the real basis for "why did changing this one style make the page janky."

*Source: [07-Critical-Rendering-Path-and-Browser-Rendering.md#2-whats-the-practical-difference-between-a-reflow-and-a-repaint-and-why-does-it-matter-for-performance](07-Critical-Rendering-Path-and-Browser-Rendering.md#2-whats-the-practical-difference-between-a-reflow-and-a-repaint-and-why-does-it-matter-for-performance)*

### 3. Why does calling `element.offsetHeight` inside a loop that also writes styles cause a real performance problem?

**Answer:** Reading a layout-dependent property like `offsetHeight` forces the browser to synchronously flush any pending layout-invalidating writes to compute an up-to-date value. Alternating reads and writes inside a loop forces this "layout thrashing" on every single iteration; batching all the reads first and all the writes second means layout is recalculated only once in each direction instead of once per iteration.

*Source: [07-Critical-Rendering-Path-and-Browser-Rendering.md#3-why-does-calling-elementoffsetheight-inside-a-loop-that-also-writes-styles-cause-a-real-performance-problem](07-Critical-Rendering-Path-and-Browser-Rendering.md#3-why-does-calling-elementoffsetheight-inside-a-loop-that-also-writes-styles-cause-a-real-performance-problem)*

### 4. Why does animating `transform`/`opacity` perform better than animating `top`/`left`/`width`/`height`?

**Answer:** `transform` and `opacity` changes can be handled entirely on the GPU compositor layer, skipping both the layout and paint steps of the rendering pipeline every frame. Animating `top`/`left`/`width`/`height` triggers a full reflow (and often a repaint) on every single frame of the animation, which is why those properties visibly stutter under animation while `transform`/`opacity` reliably stay smooth.

*Source: [07-Critical-Rendering-Path-and-Browser-Rendering.md#4-why-does-animating-transformopacity-perform-better-than-animating-topleftwidthheight](07-Critical-Rendering-Path-and-Browser-Rendering.md#4-why-does-animating-transformopacity-perform-better-than-animating-topleftwidthheight)*

### 5. What real problem does event delegation solve, and how does it work mechanically?

**Answer:** Attaching a separate listener to every row of a very large list wastes memory and slows down initial rendering. Event delegation attaches one listener to a shared ancestor and relies on the event's bubbling phase to reach it, using `event.target` (often with `.closest()`) inside that single handler to determine which specific descendant was actually interacted with.

*Source: [07-Critical-Rendering-Path-and-Browser-Rendering.md#5-what-real-problem-does-event-delegation-solve-and-how-does-it-work-mechanically](07-Critical-Rendering-Path-and-Browser-Rendering.md#5-what-real-problem-does-event-delegation-solve-and-how-does-it-work-mechanically)*

### 6. Why is a `::before`/`::after` pseudo-element part of the Render Tree even though it doesn't exist in the raw DOM?

**Answer:** The Render Tree is built by combining the DOM with computed styles from the CSSOM, and generated content (created via the `content` CSS property) is a computed-style-level construct, not an HTML-parsed one — so it gets added at the point the Render Tree is assembled, even though no corresponding DOM node was ever parsed from the HTML source.

*Source: [07-Critical-Rendering-Path-and-Browser-Rendering.md#6-why-is-a-beforeafter-pseudo-element-part-of-the-render-tree-even-though-it-doesnt-exist-in-the-raw-dom](07-Critical-Rendering-Path-and-Browser-Rendering.md#6-why-is-a-beforeafter-pseudo-element-part-of-the-render-tree-even-though-it-doesnt-exist-in-the-raw-dom)*

## [8. Web Performance and Core Web Vitals](08-Web-Performance-and-Core-Web-Vitals.md)

### 1. What do LCP, INP, and CLS each actually measure, in plain terms?

**Answer:** LCP measures how long until the largest visible piece of content actually renders — perceived load speed. INP measures how long the page takes to visually respond after a user interaction — perceived responsiveness. CLS measures how much visible content shifts unexpectedly after it's already rendered — perceived stability, and the direct cause of "I meant to tap that other button."

*Source: [08-Web-Performance-and-Core-Web-Vitals.md#1-what-do-lcp-inp-and-cls-each-actually-measure-in-plain-terms](08-Web-Performance-and-Core-Web-Vitals.md#1-what-do-lcp-inp-and-cls-each-actually-measure-in-plain-terms)*

### 2. Why can a client-side-rendered React app struggle to get a good LCP score even with a fast server?

**Answer:** If the LCP element (say, a hero image or main content block) only appears after the JS bundle downloads, parses, executes, and fetches its own data client-side, the actual LCP timestamp is gated by all of that combined — server response time alone doesn't capture it. This is the concrete performance argument for SSR/SSG for content-heavy, LCP-sensitive pages instead of pure CSR.

*Source: [08-Web-Performance-and-Core-Web-Vitals.md#2-why-can-a-client-side-rendered-react-app-struggle-to-get-a-good-lcp-score-even-with-a-fast-server](08-Web-Performance-and-Core-Web-Vitals.md#2-why-can-a-client-side-rendered-react-app-struggle-to-get-a-good-lcp-score-even-with-a-fast-server)*

### 3. What's the most common root cause of a poor INP score, and what's the general fix pattern?

**Answer:** A long-running synchronous JavaScript task blocking the main thread when the user tries to interact — a heavy computation in an input handler, an expensive re-render, or a large synchronous state update. The fix pattern is almost always reducing main-thread work per interaction: debouncing, chunking work with yields back to the browser, or moving genuinely heavy computation to a Web Worker.

*Source: [08-Web-Performance-and-Core-Web-Vitals.md#3-whats-the-most-common-root-cause-of-a-poor-inp-score-and-whats-the-general-fix-pattern](08-Web-Performance-and-Core-Web-Vitals.md#3-whats-the-most-common-root-cause-of-a-poor-inp-score-and-whats-the-general-fix-pattern)*

### 4. Why does an `<img>` without explicit `width`/`height` cause a layout shift, and how do you prevent it?

**Answer:** Without a declared size, the browser doesn't know how much vertical space to reserve for the image before it finishes downloading, so it renders at zero height and then abruptly pushes everything below it down once the image loads and its real dimensions are known. Declaring `width`/`height` attributes or a CSS `aspect-ratio` reserves that space immediately, before the image data even arrives.

*Source: [08-Web-Performance-and-Core-Web-Vitals.md#4-why-does-an-img-without-explicit-widthheight-cause-a-layout-shift-and-how-do-you-prevent-it](08-Web-Performance-and-Core-Web-Vitals.md#4-why-does-an-img-without-explicit-widthheight-cause-a-layout-shift-and-how-do-you-prevent-it)*

### 5. What's the difference between "lab data" and "field data" for performance measurement, and why do teams need both?

**Answer:** Lab data (Lighthouse, WebPageTest) is a controlled, repeatable simulation — great for catching regressions in CI before something ships. Field data (the Chrome UX Report, or a real-user-monitoring library like `web-vitals`) reflects what actual users on real devices and networks experience, which is also what search ranking is based on — and the two can genuinely disagree, since a fast dev machine's lab score can hide a poor real-world experience on low-end mobile devices.

*Source: [08-Web-Performance-and-Core-Web-Vitals.md#5-whats-the-difference-between-lab-data-and-field-data-for-performance-measurement-and-why-do-teams-need-both](08-Web-Performance-and-Core-Web-Vitals.md#5-whats-the-difference-between-lab-data-and-field-data-for-performance-measurement-and-why-do-teams-need-both)*

### 6. Why does font loading sometimes cause a layout shift, and how does `font-display` help?

**Answer:** If a custom web font hasn't loaded yet, the browser initially renders text in a fallback font with different character widths, then swaps to the custom font once it arrives — that swap can reflow the surrounding layout if the two fonts render text at different sizes. `font-display: optional` (or a carefully chosen fallback font with similar metrics) avoids or minimizes that shift by controlling whether and how the swap happens.

*Source: [08-Web-Performance-and-Core-Web-Vitals.md#6-why-does-font-loading-sometimes-cause-a-layout-shift-and-how-does-font-display-help](08-Web-Performance-and-Core-Web-Vitals.md#6-why-does-font-loading-sometimes-cause-a-layout-shift-and-how-does-font-display-help)*

## [9. CSS Animations and Transitions](09-CSS-Animations-and-Transitions.md)

### 1. When would you use a CSS transition versus a `@keyframes` animation?

**Answer:** A transition fits a simple two-state change triggered by something like `:hover` or a class toggle — it animates automatically whenever the property's computed value changes. `@keyframes` is needed for anything with more than two states, precise timing control at specific percentages, or looping behavior (`infinite`), like a loading skeleton or a spinner.

*Source: [09-CSS-Animations-and-Transitions.md#1-when-would-you-use-a-css-transition-versus-a-keyframes-animation](09-CSS-Animations-and-Transitions.md#1-when-would-you-use-a-css-transition-versus-a-keyframes-animation)*

### 2. Why does an element sometimes snap back to its original style right after a keyframe animation finishes?

**Answer:** By default, an animation's effect doesn't persist after it completes — the element reverts to its pre-animation computed styles. Setting `animation-fill-mode: forwards` (directly or via the `animation` shorthand) keeps the element at its final keyframe's styles once the animation ends, which is almost always the intended behavior for something like a toast sliding into view and staying visible.

*Source: [09-CSS-Animations-and-Transitions.md#2-why-does-an-element-sometimes-snap-back-to-its-original-style-right-after-a-keyframe-animation-finishes](09-CSS-Animations-and-Transitions.md#2-why-does-an-element-sometimes-snap-back-to-its-original-style-right-after-a-keyframe-animation-finishes)*

### 3. Why is animating `transform`/`opacity` cheaper than animating `width`/`left`, mechanically?

**Answer:** `transform` and `opacity` changes can be handled entirely by the GPU compositor, skipping the layout and paint steps of the rendering pipeline on every frame. Animating `width`/`left` (or similar geometry-affecting properties) forces a full reflow — and often a repaint — on every single frame, which is the direct mechanical reason those animations tend to stutter under load while transform-based ones stay smooth.

*Source: [09-CSS-Animations-and-Transitions.md#3-why-is-animating-transformopacity-cheaper-than-animating-widthleft-mechanically](09-CSS-Animations-and-Transitions.md#3-why-is-animating-transformopacity-cheaper-than-animating-widthleft-mechanically)*

### 4. What does `will-change` actually do, and why shouldn't it be applied to everything "just in case"?

**Answer:** It tells the browser to proactively promote an element to its own compositor layer before an animation starts, avoiding a small layer-creation delay right when the animation begins. Applying it permanently to many elements wastes GPU memory maintaining layers that mostly sit idle, so it should be applied briefly, right before a genuinely upcoming animation, and removed afterward — not sprinkled everywhere as a general performance hint.

*Source: [09-CSS-Animations-and-Transitions.md#4-what-does-will-change-actually-do-and-why-shouldnt-it-be-applied-to-everything-just-in-case](09-CSS-Animations-and-Transitions.md#4-what-does-will-change-actually-do-and-why-shouldnt-it-be-applied-to-everything-just-in-case)*

### 5. How would you re-express a sidebar's "slide in from the left" animation to avoid triggering layout on every frame?

**Answer:** Instead of animating `left` or `width` (both geometry properties that force a reflow each frame), animate `transform: translateX(...)` between the off-screen and on-screen positions. The visual result is identical, but the cost drops to a compositor-only operation with no layout or paint recalculation involved.

*Source: [09-CSS-Animations-and-Transitions.md#5-how-would-you-re-express-a-sidebars-slide-in-from-the-left-animation-to-avoid-triggering-layout-on-every-frame](09-CSS-Animations-and-Transitions.md#5-how-would-you-re-express-a-sidebars-slide-in-from-the-left-animation-to-avoid-triggering-layout-on-every-frame)*
