# Master Question Bank — HTML & CSS

This file aggregates every interview question and its full answer from all nine files in this folder (`01-Semantic-HTML-and-Accessibility.md` through `09-CSS-Animations-and-Transitions.md`), in one place, for quick revision. Each file's questions are kept under their own section with their original numbering preserved, and every question links back to its source file — and to the exact question heading within it — so you can open the original for the surrounding explanation, code samples, and revision checklist.

## [1. Semantic HTML and Accessibility](01-Semantic-HTML-and-Accessibility.md)

### 1. Why does semantic HTML matter if the page looks identical either way?

**Answer:** Here's the trap: looking the same is exactly the problem. A screen reader, a search engine crawler, and the browser's own keyboard navigation don't see pixels at all — they read structure. A `<div class="nav">` looks like a navbar to your eyes, but to a screen reader it's just an anonymous box with nothing to jump to. A real `<nav>` element is an actual landmark the screen reader can jump straight to.

*Source: [01-Semantic-HTML-and-Accessibility.md#1-why-does-semantic-html-matter-if-the-page-looks-identical-either-way](01-Semantic-HTML-and-Accessibility.md#1-why-does-semantic-html-matter-if-the-page-looks-identical-either-way)*

### 2. When should you reach for an ARIA attribute instead of a native HTML element?

**Answer:** Only as a last resort — the first rule of ARIA is literally "don't use ARIA if HTML already solves it." A `<button>` already gives you focus, keyboard activation, and the right role for free, so there's no reason to fake it with ARIA. Where ARIA actually earns its keep is a custom widget with no native equivalent — think a combobox or a tab panel. That's when `role` and `aria-*` attributes are the right tool.

*Source: [01-Semantic-HTML-and-Accessibility.md#2-when-should-you-reach-for-an-aria-attribute-instead-of-a-native-html-element](01-Semantic-HTML-and-Accessibility.md#2-when-should-you-reach-for-an-aria-attribute-instead-of-a-native-html-element)*

### 3. What's the fastest way to self-audit a page's keyboard accessibility?

**Answer:** Simplest test: unplug your mouse and just tab through the whole page. Three things to check as you go. Every interactive control should be reachable, in an order that actually makes sense. The focus indicator should always be visible, so you can see where you are. And a modal or dropdown should trap focus while it's open — `Tab` shouldn't leak out into the page behind it.

*Source: [01-Semantic-HTML-and-Accessibility.md#3-whats-the-fastest-way-to-self-audit-a-pages-keyboard-accessibility](01-Semantic-HTML-and-Accessibility.md#3-whats-the-fastest-way-to-self-audit-a-pages-keyboard-accessibility)*

### 4. Why should `alt=""` be used for decorative images instead of omitting the `alt` attribute entirely?

**Answer:** If you just leave `alt` off entirely, some screen readers fall back to reading out the image's filename or URL — pure noise for a decorative image. Writing `alt=""` on purpose tells the screen reader "skip this, there's nothing here worth announcing." So for a purely decorative image, an empty alt beats no alt at all.

*Source: [01-Semantic-HTML-and-Accessibility.md#4-why-should-alt-be-used-for-decorative-images-instead-of-omitting-the-alt-attribute-entirely](01-Semantic-HTML-and-Accessibility.md#4-why-should-alt-be-used-for-decorative-images-instead-of-omitting-the-alt-attribute-entirely)*

### 5. Why must heading levels (`h1`–`h6`) nest in order rather than being picked by visual size?

**Answer:** Think of headings as the page's table of contents. Screen reader users jump between them to build a mental outline of the page, the same way your eyes skim headings when scanning. Jump from `h1` straight to `h4` just because a designer wanted smaller text there, and you've broken that outline. Heading level should always describe document structure — if you want smaller text, change the font-size with CSS, not the heading level.

*Source: [01-Semantic-HTML-and-Accessibility.md#5-why-must-heading-levels-h1h6-nest-in-order-rather-than-being-picked-by-visual-size](01-Semantic-HTML-and-Accessibility.md#5-why-must-heading-levels-h1h6-nest-in-order-rather-than-being-picked-by-visual-size)*

### 6. What does `aria-live="polite"` actually do, and when would you use it?

**Answer:** `aria-live="polite"` tells assistive tech: "announce this change, but wait for a natural pause — don't interrupt what the user's doing right now." That's different from `assertive`, which butts in immediately. A good real-world example is a toast notification, like "item added to cart," that pops up without a page navigation. Without `aria-live`, a screen reader user would have no idea it ever appeared.

*Source: [01-Semantic-HTML-and-Accessibility.md#6-what-does-aria-livepolite-actually-do-and-when-would-you-use-it](01-Semantic-HTML-and-Accessibility.md#6-what-does-aria-livepolite-actually-do-and-when-would-you-use-it)*

### 7. Why is `<label for="...">` linked to an input's `id` better than just placing text near the input?

**Answer:** Linking `<label for="...">` to the input's `id` does two things that placing text nearby never can. First, it lets a screen reader announce the label together with the input's role and state, as one connected unit. Second, it makes the label itself clickable — tapping the text focuses or activates the input. That second part helps everyone, not just assistive-tech users, especially on small touch targets on mobile.

*Source: [01-Semantic-HTML-and-Accessibility.md#7-why-is-label-for-linked-to-an-inputs-id-better-than-just-placing-text-near-the-input](01-Semantic-HTML-and-Accessibility.md#7-why-is-label-for-linked-to-an-inputs-id-better-than-just-placing-text-near-the-input)*

## [2. CSS Box Model and Positioning](02-CSS-Box-Model-and-Positioning.md)

### 1. Why does a `300px`-wide element with `padding: 20px` sometimes render at `340px`, and sometimes render at exactly `300px`?

**Answer:** It all comes down to `box-sizing`. The default, `content-box`, applies `width` only to the content itself, then stacks padding and border on top of that — so 300px of content plus 20px of padding on each side becomes 340px total. `border-box` flips that: `width` becomes the final total, and padding and border get carved out of it instead of added on. That's exactly why almost every real project sets `box-sizing: border-box` globally as one of the first lines in its CSS reset.

*Source: [02-CSS-Box-Model-and-Positioning.md#1-why-does-a-300px-wide-element-with-padding-20px-sometimes-render-at-340px-and-sometimes-render-at-exactly-300px](02-CSS-Box-Model-and-Positioning.md#1-why-does-a-300px-wide-element-with-padding-20px-sometimes-render-at-340px-and-sometimes-render-at-exactly-300px)*

### 2. Why do two stacked block elements with `margin-bottom: 20px` and `margin-top: 20px` end up with only 20px of space between them, not 40px?

**Answer:** This is margin collapsing. When two block-level siblings meet, their vertical margins don't add up — they collapse into one margin equal to whichever is bigger. So 20px plus 20px gives you 20px, not 40px. Padding never does this. Flex or grid children never do this either — which is actually one real reason teams switch a layout to flexbox, just to get spacing that behaves predictably.

*Source: [02-CSS-Box-Model-and-Positioning.md#2-why-do-two-stacked-block-elements-with-margin-bottom-20px-and-margin-top-20px-end-up-with-only-20px-of-space-between-them-not-40px](02-CSS-Box-Model-and-Positioning.md#2-why-do-two-stacked-block-elements-with-margin-bottom-20px-and-margin-top-20px-end-up-with-only-20px-of-space-between-them-not-40px)*

### 3. Why does `position: absolute` sometimes position an element relative to the whole page instead of its intended parent?

**Answer:** An absolutely positioned element looks upward for the nearest ancestor that has any `position` value other than `static`, and anchors to that. If it climbs all the way up and finds none, it falls back to the whole page as its containing block — which is why it looks like it "escaped" its parent. The fix is simple: give the intended parent `position: relative` (or another non-static value) so it becomes the anchor point.

*Source: [02-CSS-Box-Model-and-Positioning.md#3-why-does-position-absolute-sometimes-position-an-element-relative-to-the-whole-page-instead-of-its-intended-parent](02-CSS-Box-Model-and-Positioning.md#3-why-does-position-absolute-sometimes-position-an-element-relative-to-the-whole-page-instead-of-its-intended-parent)*

### 4. Why can a dropdown with `z-index: 999` still render behind an element with `z-index: 1`?

**Answer:** `z-index` numbers only mean something when comparing elements inside the same stacking context — they're not global. If some ancestor created its own stacking context, using `transform`, `opacity` below 1, `will-change`, or `isolation: isolate`, then everything inside that ancestor stacks as one sealed unit relative to the outside world. So a `z-index: 1` trapped inside a "higher" stacking context can still beat a `z-index: 999` trapped inside a "lower" one. It's context first, number second.

*Source: [02-CSS-Box-Model-and-Positioning.md#4-why-can-a-dropdown-with-z-index-999-still-render-behind-an-element-with-z-index-1](02-CSS-Box-Model-and-Positioning.md#4-why-can-a-dropdown-with-z-index-999-still-render-behind-an-element-with-z-index-1)*

### 5. What makes `position: sticky` different from both `relative` and `fixed`?

**Answer:** Think of `sticky` as a hybrid that switches modes as you scroll. It starts out behaving like `relative` — it stays in the normal flow, so its space is still reserved among siblings. Then once you scroll past a threshold you define, like `top: 0`, it flips to behaving like `fixed`, locked relative to its nearest scrolling ancestor. `fixed` alone never respects normal flow at all. `relative` alone never locks onto the viewport during scroll. Sticky is genuinely both, one after the other.

*Source: [02-CSS-Box-Model-and-Positioning.md#5-what-makes-position-sticky-different-from-both-relative-and-fixed](02-CSS-Box-Model-and-Positioning.md#5-what-makes-position-sticky-different-from-both-relative-and-fixed)*

### 6. Why does a tooltip inside a card sometimes get clipped even though it's `position: absolute`?

**Answer:** The usual culprit is `overflow: hidden` (or `auto` or `scroll`) on the card or one of its ancestors. That clips anything that visually spills past its box, and a `position: absolute` tooltip trying to escape gets clipped right along with it — absolute positioning doesn't save you from overflow clipping. The real production fix isn't fighting the `overflow` property; it's rendering the tooltip through a portal, so its DOM node lives completely outside the clipping ancestor.

*Source: [02-CSS-Box-Model-and-Positioning.md#6-why-does-a-tooltip-inside-a-card-sometimes-get-clipped-even-though-its-position-absolute](02-CSS-Box-Model-and-Positioning.md#6-why-does-a-tooltip-inside-a-card-sometimes-get-clipped-even-though-its-position-absolute)*

## [3. Flexbox and Grid](03-Flexbox-and-Grid.md)

### 1. How do you decide between flexbox and grid for a given layout?

**Answer:** Simple rule of thumb: flexbox is one-dimensional, grid is two-dimensional. Flexbox is for a single row or column where sizing follows the content — a navbar, a button group. Grid is for when you're defining rows and columns up front and placing content into that structure — a page shell, a responsive card gallery. In real projects they're not rivals, they team up: grid for the outer skeleton of the page, flexbox for aligning things inside one region of it.

*Source: [03-Flexbox-and-Grid.md#1-how-do-you-decide-between-flexbox-and-grid-for-a-given-layout](03-Flexbox-and-Grid.md#1-how-do-you-decide-between-flexbox-and-grid-for-a-given-layout)*

### 2. What's the difference between `justify-content` and `align-items` in flexbox?

**Answer:** Easiest way to remember it: `justify-content` works along the main axis, the direction items are flowing in. `align-items` works along the cross axis, perpendicular to that flow. Here's the trap — flip `flex-direction` from `row` to `column`, and the axes swap too, so these two properties suddenly control the opposite dimension from what you'd expect. That swap is the source of most real-world confusion with flexbox alignment.

*Source: [03-Flexbox-and-Grid.md#2-whats-the-difference-between-justify-content-and-align-items-in-flexbox](03-Flexbox-and-Grid.md#2-whats-the-difference-between-justify-content-and-align-items-in-flexbox)*

### 3. How does `flex: 1` actually work, and how would you build a cart row with a flexible name column and a fixed-width price column?

**Answer:** `flex: 1` is shorthand for `flex-grow: 1; flex-shrink: 1; flex-basis: 0%` — in plain words, "grow to eat up whatever space is left." For a cart row, give the name column `flex: 1` so it eats the leftover space, and give the price column `flex: 0 0 80px`, meaning never grow, never shrink, always exactly 80px. That combination gives you the flexible-name, fixed-price layout with zero manual width math.

*Source: [03-Flexbox-and-Grid.md#3-how-does-flex-1-actually-work-and-how-would-you-build-a-cart-row-with-a-flexible-name-column-and-a-fixed-width-price-column](03-Flexbox-and-Grid.md#3-how-does-flex-1-actually-work-and-how-would-you-build-a-cart-row-with-a-flexible-name-column-and-a-fixed-width-price-column)*

### 4. What does `repeat(auto-fill, minmax(220px, 1fr))` actually do, and why is it useful?

**Answer:** Read it as: "fit as many 220px-minimum columns as you can, and share whatever space is left equally." `auto-fill` figures out how many columns fit, and `minmax(220px, 1fr)` says each one is at least 220px but can grow to fill leftover space. The result is a responsive card grid that adds or drops columns automatically as the screen resizes — and you didn't write a single media query to get that.

*Source: [03-Flexbox-and-Grid.md#4-what-does-repeatauto-fill-minmax220px-1fr-actually-do-and-why-is-it-useful](03-Flexbox-and-Grid.md#4-what-does-repeatauto-fill-minmax220px-1fr-actually-do-and-why-is-it-useful)*

### 5. Why do two flex items in a row end up the same height even when neither has an explicit height set?

**Answer:** It's not magic, it's just the default. Flex items automatically get `align-items: stretch` on the cross axis, so every item stretches to match the height of the tallest item in that row, unless a different `align-items`/`align-self` value overrides it. That default behavior is literally the "equal height columns" trick everyone asks for — there's no special feature involved, flexbox is just doing what it always does.

*Source: [03-Flexbox-and-Grid.md#5-why-do-two-flex-items-in-a-row-end-up-the-same-height-even-when-neither-has-an-explicit-height-set](03-Flexbox-and-Grid.md#5-why-do-two-flex-items-in-a-row-end-up-the-same-height-even-when-neither-has-an-explicit-height-set)*

### 6. How would you center a modal both horizontally and vertically, and why is that historically hard in CSS?

**Answer:** Three lines solve it today: `display: flex`, `justify-content: center`, `align-items: center` on the overlay container centers the modal both ways. It's historically "hard" because before flexbox, vertical centering had no clean answer — people faked it with `display: table-cell`, or absolute positioning with negative margins calculated from a known height, or line-height hacks. All of those were fragile. Flexbox's cross-axis alignment just solves it directly.

*Source: [03-Flexbox-and-Grid.md#6-how-would-you-center-a-modal-both-horizontally-and-vertically-and-why-is-that-historically-hard-in-css](03-Flexbox-and-Grid.md#6-how-would-you-center-a-modal-both-horizontally-and-vertically-and-why-is-that-historically-hard-in-css)*

### 7. What's the difference between `auto-fill` and `auto-fit` in a grid `repeat()` track list?

**Answer:** Both fit as many tracks of your minimum size as will physically fit. The difference is what happens with leftover, empty tracks. `auto-fill` keeps them in the layout — so if you have fewer items than tracks, you get visible empty gaps. `auto-fit` collapses those empty tracks down to zero width and lets your actual items stretch to fill the space instead. So: fill leaves gaps, fit closes them.

*Source: [03-Flexbox-and-Grid.md#7-whats-the-difference-between-auto-fill-and-auto-fit-in-a-grid-repeat-track-list](03-Flexbox-and-Grid.md#7-whats-the-difference-between-auto-fill-and-auto-fit-in-a-grid-repeat-track-list)*

## [4. CSS Specificity, the Cascade, and Selectors](04-CSS-Specificity-Cascade-and-Selectors.md)

### 1. Two CSS rules target the same element with the same specificity — which one wins, and why?

**Answer:** Simple tiebreaker: whichever rule appears later in the source wins — later in the same file, or in a file loaded later. Source order is the cascade's last resort, checked only after origin/importance and specificity are already tied. That's exactly why stylesheet load order matters in real projects, even when nobody's touching `!important`.

*Source: [04-CSS-Specificity-Cascade-and-Selectors.md#1-two-css-rules-target-the-same-element-with-the-same-specificity--which-one-wins-and-why](04-CSS-Specificity-Cascade-and-Selectors.md#1-two-css-rules-target-the-same-element-with-the-same-specificity--which-one-wins-and-why)*

### 2. Why does an ID selector always beat any number of chained class selectors?

**Answer:** Here's the key thing people get wrong: specificity isn't one number, it's three columns — IDs, then classes/attributes/pseudo-classes, then elements — compared left to right. Any ID at all, even just one, beats any number of classes stacked together, because you never even get to compare the class column. `(1, 0, 0)` beats `(0, 50, 0)` every time.

*Source: [04-CSS-Specificity-Cascade-and-Selectors.md#2-why-does-an-id-selector-always-beat-any-number-of-chained-class-selectors](04-CSS-Specificity-Cascade-and-Selectors.md#2-why-does-an-id-selector-always-beat-any-number-of-chained-class-selectors)*

### 3. Why do experienced teams avoid deep selector chains like `.page .content .card .title`?

**Answer:** Every extra class you chain on raises that rule's specificity — and the higher it climbs, the harder it becomes for anyone to override it later without matching or beating that same specificity. That's exactly the trap that pushes teams toward `!important` — they're fighting a specificity war that a flatter selector would have avoided in the first place.

*Source: [04-CSS-Specificity-Cascade-and-Selectors.md#3-why-do-experienced-teams-avoid-deep-selector-chains-like-page-content-card-title](04-CSS-Specificity-Cascade-and-Selectors.md#3-why-do-experienced-teams-avoid-deep-selector-chains-like-page-content-card-title)*

### 4. Why is `!important` considered a real long-term problem rather than just a quick fix?

**Answer:** `!important` short-circuits specificity entirely. And that's the problem: once one rule uses it, the only way to beat it later is another `!important` with equal or higher specificity. That kicks off an arms race between teams and components, until eventually nobody can predict what actually renders without opening DevTools and checking computed styles. The real, durable fix is lowering selector specificity across the project — not piling on more `!important`s.

*Source: [04-CSS-Specificity-Cascade-and-Selectors.md#4-why-is-important-considered-a-real-long-term-problem-rather-than-just-a-quick-fix](04-CSS-Specificity-Cascade-and-Selectors.md#4-why-is-important-considered-a-real-long-term-problem-rather-than-just-a-quick-fix)*

### 5. What's the practical difference between `.card .title` and `.card > .title`?

**Answer:** `.card .title` — the descendant selector — matches `.title` at any depth inside `.card`, no matter how deeply buried. `.card > .title` — the direct child selector — only matches a `.title` that's an immediate child. This matters for real components that can nest inside themselves, like a card containing another card — the direct child selector is what stops your styling from leaking into that nested card's own title.

*Source: [04-CSS-Specificity-Cascade-and-Selectors.md#5-whats-the-practical-difference-between-card-title-and-card--title](04-CSS-Specificity-Cascade-and-Selectors.md#5-whats-the-practical-difference-between-card-title-and-card--title)*

### 6. Why does setting `color` on `body` style the whole page, but setting `border` on `body` does nothing to nested elements?

**Answer:** Simple rule: typography properties inherit, box-model properties don't. `color`, along with `font-family`, `font-size`, and `line-height`, cascades down to every descendant automatically unless something overrides it. But `border`, `margin`, and `padding` never inherit — set border on `body` and it just sits on the body, it never trickles down. Anything box-model related has to be set explicitly on the exact element that needs it.

*Source: [04-CSS-Specificity-Cascade-and-Selectors.md#6-why-does-setting-color-on-body-style-the-whole-page-but-setting-border-on-body-does-nothing-to-nested-elements](04-CSS-Specificity-Cascade-and-Selectors.md#6-why-does-setting-color-on-body-style-the-whole-page-but-setting-border-on-body-does-nothing-to-nested-elements)*

## [5. Responsive Design and Media Queries](05-Responsive-Design-and-Media-Queries.md)

### 1. Why is mobile-first (using `min-width` media queries) generally preferred over desktop-first (`max-width`)?

**Answer:** Mobile-first means your unqueried, base styles target the most constrained screen first, and that forces you to start simple and robust. From there, each media query only adds complexity as more screen space becomes available — you're building up, not tearing down. Desktop-first works backwards: you start complex, then have to unwind that complexity piece by piece for smaller screens. That's more fragile and harder to maintain long-term.

*Source: [05-Responsive-Design-and-Media-Queries.md#1-why-is-mobile-first-using-min-width-media-queries-generally-preferred-over-desktop-first-max-width](05-Responsive-Design-and-Media-Queries.md#1-why-is-mobile-first-using-min-width-media-queries-generally-preferred-over-desktop-first-max-width)*

### 2. Why don't media query breakpoints work correctly on mobile if the viewport meta tag is missing?

**Answer:** Without the viewport meta tag — `<meta name="viewport" content="width=device-width, initial-scale=1">` — mobile browsers quietly lie about screen size. They render the page at a fake, wider desktop-like viewport and just zoom it out visually. That means your media queries never see the phone's real width, so your breakpoints silently stop matching what you designed for.

*Source: [05-Responsive-Design-and-Media-Queries.md#2-why-dont-media-query-breakpoints-work-correctly-on-mobile-if-the-viewport-meta-tag-is-missing](05-Responsive-Design-and-Media-Queries.md#2-why-dont-media-query-breakpoints-work-correctly-on-mobile-if-the-viewport-meta-tag-is-missing)*

### 3. `rem` vs `em` — what's the practical difference, and why does it matter in deeply nested components?

**Answer:** `rem` always measures against the root element's font-size, full stop — so it's predictable no matter how deeply nested you are. `em` measures against its own element's font-size, which means it compounds every time a nested element sets its own font-size along the way. Go several levels deep and `em` sizing becomes genuinely hard to predict. That compounding problem is exactly why `rem` is the safer default for most sizing.

*Source: [05-Responsive-Design-and-Media-Queries.md#3-rem-vs-em--whats-the-practical-difference-and-why-does-it-matter-in-deeply-nested-components](05-Responsive-Design-and-Media-Queries.md#3-rem-vs-em--whats-the-practical-difference-and-why-does-it-matter-in-deeply-nested-components)*

### 4. What does `clamp(1.5rem, 5vw, 3rem)` actually do, and why is it useful for responsive typography?

**Answer:** Think of `clamp(1.5rem, 5vw, 3rem)` as "grow with the screen, but never below a floor or above a ceiling." The middle value, `5vw`, is a fluid size that scales with the viewport. The first and last values are the minimum and maximum it's allowed to hit. So text scales smoothly, but never gets unreadably tiny or absurdly huge at the extremes. One line replaces what used to take several explicit breakpoints.

*Source: [05-Responsive-Design-and-Media-Queries.md#4-what-does-clamp15rem-5vw-3rem-actually-do-and-why-is-it-useful-for-responsive-typography](05-Responsive-Design-and-Media-Queries.md#4-what-does-clamp15rem-5vw-3rem-actually-do-and-why-is-it-useful-for-responsive-typography)*

### 5. What real problem do container queries solve that viewport media queries cannot?

**Answer:** Here's the situation viewport queries can't handle: the same component, at the same viewport width, rendered inside two different containers — say a card that shows up both in a narrow sidebar and a wide main area. It needs a different internal layout in each case, even though the viewport hasn't changed at all. A `@media` query only ever knows the viewport's width. A `@container` query lets the component respond to its own container's width instead — which is the actual thing that matters here.

*Source: [05-Responsive-Design-and-Media-Queries.md#5-what-real-problem-do-container-queries-solve-that-viewport-media-queries-cannot](05-Responsive-Design-and-Media-Queries.md#5-what-real-problem-do-container-queries-solve-that-viewport-media-queries-cannot)*

### 6. Why is `srcset`/`sizes` a real performance improvement over just using `max-width: 100%` on an image?

**Answer:** `max-width: 100%` only fixes what you see — it stops the image from visually overflowing, but the browser still downloads the full-size file no matter how small it's displayed. That's wasted bandwidth. `srcset`/`sizes` actually fixes the download itself: the browser picks and downloads a properly sized image file based on how big it's actually rendered and the device's pixel density. So one is a visual patch, the other is a real bandwidth and load-time saving.

*Source: [05-Responsive-Design-and-Media-Queries.md#6-why-is-srcsetsizes-a-real-performance-improvement-over-just-using-max-width-100-on-an-image](05-Responsive-Design-and-Media-Queries.md#6-why-is-srcsetsizes-a-real-performance-improvement-over-just-using-max-width-100-on-an-image)*

### 7. Why should `prefers-reduced-motion` be treated as a real accessibility requirement rather than a nice-to-have?

**Answer:** This isn't about taste, it's about health. Some users have vestibular disorders, where unnecessary motion on screen can cause real physical discomfort or dizziness — not just mild annoyance. Respecting `prefers-reduced-motion: reduce` by turning off non-essential animation for those users is an accessibility accommodation, the same category as screen-reader support, not a nice-to-have cosmetic setting.

*Source: [05-Responsive-Design-and-Media-Queries.md#7-why-should-prefers-reduced-motion-be-treated-as-a-real-accessibility-requirement-rather-than-a-nice-to-have](05-Responsive-Design-and-Media-Queries.md#7-why-should-prefers-reduced-motion-be-treated-as-a-real-accessibility-requirement-rather-than-a-nice-to-have)*

## [6. CSS Architecture: BEM, CSS Modules, and CSS-in-JS](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md)

### 1. What specific problem does BEM, CSS Modules, and CSS-in-JS all independently try to solve?

**Answer:** The root problem all three are solving is that CSS has no scoping at all — every class name is global by default. Two completely unrelated components can accidentally both use `.title`, and one silently wins based on source order, with no warning. BEM, CSS Modules, and CSS-in-JS are just three different strategies for the same goal: preventing that collision. One's a naming convention, one's compiler-enforced renaming, one's colocated runtime-scoped styles — different mechanisms, same fix.

*Source: [06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#1-what-specific-problem-does-bem-css-modules-and-css-in-js-all-independently-try-to-solve](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#1-what-specific-problem-does-bem-css-modules-and-css-in-js-all-independently-try-to-solve)*

### 2. Does BEM actually prevent naming collisions, or just make them less likely?

**Answer:** Just less likely — BEM doesn't actually guarantee anything. It's purely a naming convention, with no tooling behind it, so two teams could still both write `.product-card__title` and collide. What it really gives you is much rarer collisions in practice, because every class carries its owning block's name as a prefix, plus flat specificity. It's a strong convention, not a hard guarantee the way a compiler-based tool provides.

*Source: [06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#2-does-bem-actually-prevent-naming-collisions-or-just-make-them-less-likely](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#2-does-bem-actually-prevent-naming-collisions-or-just-make-them-less-likely)*

### 3. How do CSS Modules actually guarantee unique class names, and what do you give up in exchange?

**Answer:** CSS Modules solve it at the build step: the tool rewrites every class name into something genuinely unique, like `ProductCard_card__a3f9x`, so collisions aren't just unlikely, they're structurally impossible. What you give up is casual class reuse — styles are scoped per file by default, so sharing a class across components needs an explicit `composes`, or importing a shared module, instead of just referencing a class name from somewhere else.

*Source: [06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#3-how-do-css-modules-actually-guarantee-unique-class-names-and-what-do-you-give-up-in-exchange](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#3-how-do-css-modules-actually-guarantee-unique-class-names-and-what-do-you-give-up-in-exchange)*

### 4. What's the real advantage of CSS-in-JS over CSS Modules for dynamic styling, and what's the real cost?

**Answer:** The big win with CSS-in-JS is that styles can reference component props and state directly, right inside the style definition — no manually toggling class names based on state. The cost is runtime overhead: libraries that generate and inject styles while the app is running add performance and bundle-size cost. That trade-off is exactly why the ecosystem has been shifting toward zero-runtime CSS-in-JS, or utility-first CSS, for performance-sensitive products.

*Source: [06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#4-whats-the-real-advantage-of-css-in-js-over-css-modules-for-dynamic-styling-and-whats-the-real-cost](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#4-whats-the-real-advantage-of-css-in-js-over-css-modules-for-dynamic-styling-and-whats-the-real-cost)*

### 5. What's the actual trade-off with a utility-first approach like Tailwind, stated honestly rather than as a preference?

**Answer:** Told honestly: with something like Tailwind, you eliminate class-naming decisions and specificity conflicts entirely — there are no custom classes to name or collide, and unused utilities get stripped from the final build. In exchange, your markup gets visually denser and harder to skim at a glance, and there's a genuine learning curve with the utility vocabulary before writing it actually feels fast. It's a real trade, not a free win.

*Source: [06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#5-whats-the-actual-trade-off-with-a-utility-first-approach-like-tailwind-stated-honestly-rather-than-as-a-preference](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md#5-whats-the-actual-trade-off-with-a-utility-first-approach-like-tailwind-stated-honestly-rather-than-as-a-preference)*

## [7. The Critical Rendering Path and Browser Rendering](07-Critical-Rendering-Path-and-Browser-Rendering.md)

### 1. Why is CSSOM construction render-blocking, while DOM construction is incremental?

**Answer:** DOM building is incremental because it's simple — each new HTML byte just extends the tree, no need to look ahead. CSSOM can't work that way, because of the cascade: a rule further down the stylesheet can override one earlier in it. That means the browser genuinely cannot know the final computed styles until it's parsed the entire stylesheet. So it has no choice but to block rendering until all the CSS is downloaded and parsed.

*Source: [07-Critical-Rendering-Path-and-Browser-Rendering.md#1-why-is-cssom-construction-render-blocking-while-dom-construction-is-incremental](07-Critical-Rendering-Path-and-Browser-Rendering.md#1-why-is-cssom-construction-render-blocking-while-dom-construction-is-incremental)*

### 2. What's the practical difference between a reflow and a repaint, and why does it matter for performance?

**Answer:** A reflow recalculates geometry — size and position — and that can ripple outward to siblings and ancestors, which makes it expensive. A repaint only redraws visual appearance, no geometry involved, and skips the layout step entirely, which makes it meaningfully cheaper. Knowing which bucket a given CSS property falls into is really the answer to "why did changing this one style make the whole page janky."

*Source: [07-Critical-Rendering-Path-and-Browser-Rendering.md#2-whats-the-practical-difference-between-a-reflow-and-a-repaint-and-why-does-it-matter-for-performance](07-Critical-Rendering-Path-and-Browser-Rendering.md#2-whats-the-practical-difference-between-a-reflow-and-a-repaint-and-why-does-it-matter-for-performance)*

### 3. Why does calling `element.offsetHeight` inside a loop that also writes styles cause a real performance problem?

**Answer:** Reading `offsetHeight` forces the browser to stop and synchronously flush any pending style writes, just to give you an up-to-date number. So if your loop alternates writing a style and then reading `offsetHeight`, you force that expensive flush on every single iteration — that's called layout thrashing. The fix is batching: do all your reads first, then all your writes, so layout only gets recalculated once total instead of once per loop iteration.

*Source: [07-Critical-Rendering-Path-and-Browser-Rendering.md#3-why-does-calling-elementoffsetheight-inside-a-loop-that-also-writes-styles-cause-a-real-performance-problem](07-Critical-Rendering-Path-and-Browser-Rendering.md#3-why-does-calling-elementoffsetheight-inside-a-loop-that-also-writes-styles-cause-a-real-performance-problem)*

### 4. Why does animating `transform`/`opacity` perform better than animating `top`/`left`/`width`/`height`?

**Answer:** `transform` and `opacity` can be handled entirely on the GPU's compositor layer, which means every frame skips both layout and paint completely. Animating `top`, `left`, `width`, or `height` instead triggers a full reflow, and often a repaint, on every single frame of the animation. That's the whole reason those properties visibly stutter when animated, while `transform` and `opacity` stay buttery smooth.

*Source: [07-Critical-Rendering-Path-and-Browser-Rendering.md#4-why-does-animating-transformopacity-perform-better-than-animating-topleftwidthheight](07-Critical-Rendering-Path-and-Browser-Rendering.md#4-why-does-animating-transformopacity-perform-better-than-animating-topleftwidthheight)*

### 5. What real problem does event delegation solve, and how does it work mechanically?

**Answer:** Attaching a separate click listener to every row of a huge list wastes memory and slows down your initial render — that's the problem event delegation solves. Instead, you attach just one listener to a shared ancestor, and rely on the event bubbling up to reach it. Inside that single handler, you check `event.target`, often with `.closest()`, to figure out exactly which descendant was actually clicked.

*Source: [07-Critical-Rendering-Path-and-Browser-Rendering.md#5-what-real-problem-does-event-delegation-solve-and-how-does-it-work-mechanically](07-Critical-Rendering-Path-and-Browser-Rendering.md#5-what-real-problem-does-event-delegation-solve-and-how-does-it-work-mechanically)*

### 6. Why is a `::before`/`::after` pseudo-element part of the Render Tree even though it doesn't exist in the raw DOM?

**Answer:** The Render Tree isn't just the DOM — it's the DOM combined with computed styles from the CSSOM. Generated content created by the CSS `content` property is a computed-style-level thing, not something parsed from HTML at all. So it gets added at the moment the Render Tree is assembled, even though no matching DOM node was ever parsed from the HTML source in the first place.

*Source: [07-Critical-Rendering-Path-and-Browser-Rendering.md#6-why-is-a-beforeafter-pseudo-element-part-of-the-render-tree-even-though-it-doesnt-exist-in-the-raw-dom](07-Critical-Rendering-Path-and-Browser-Rendering.md#6-why-is-a-beforeafter-pseudo-element-part-of-the-render-tree-even-though-it-doesnt-exist-in-the-raw-dom)*

## [8. Web Performance and Core Web Vitals](08-Web-Performance-and-Core-Web-Vitals.md)

### 1. What do LCP, INP, and CLS each actually measure, in plain terms?

**Answer:** Easiest way to remember the three: LCP is speed, INP is responsiveness, CLS is stability. LCP measures how long until the biggest visible piece of content actually renders — perceived load speed. INP measures how long the page takes to visually respond after you interact with it — perceived responsiveness. CLS measures how much visible content shifts unexpectedly after it's already rendered — perceived stability, and it's the exact reason you sometimes tap the wrong button because the page moved under you.

*Source: [08-Web-Performance-and-Core-Web-Vitals.md#1-what-do-lcp-inp-and-cls-each-actually-measure-in-plain-terms](08-Web-Performance-and-Core-Web-Vitals.md#1-what-do-lcp-inp-and-cls-each-actually-measure-in-plain-terms)*

### 2. Why can a client-side-rendered React app struggle to get a good LCP score even with a fast server?

**Answer:** The server can respond instantly, and LCP can still be terrible — because if the LCP element, say a hero image or main content block, only shows up after the JS bundle downloads, parses, executes, and then fetches its own data, the LCP timestamp is gated by all of that combined work. Server response time alone doesn't capture any of it. That gap is the real, concrete performance argument for SSR or SSG over pure client-side rendering, on any page where LCP matters.

*Source: [08-Web-Performance-and-Core-Web-Vitals.md#2-why-can-a-client-side-rendered-react-app-struggle-to-get-a-good-lcp-score-even-with-a-fast-server](08-Web-Performance-and-Core-Web-Vitals.md#2-why-can-a-client-side-rendered-react-app-struggle-to-get-a-good-lcp-score-even-with-a-fast-server)*

### 3. What's the most common root cause of a poor INP score, and what's the general fix pattern?

**Answer:** The usual culprit is a long, synchronous JavaScript task blocking the main thread right when the user tries to interact — a heavy computation inside an input handler, an expensive re-render, a big synchronous state update. The fix pattern is almost always the same: cut down main-thread work per interaction. Debounce it, break it into chunks that yield back to the browser between steps, or move genuinely heavy computation off to a Web Worker entirely.

*Source: [08-Web-Performance-and-Core-Web-Vitals.md#3-whats-the-most-common-root-cause-of-a-poor-inp-score-and-whats-the-general-fix-pattern](08-Web-Performance-and-Core-Web-Vitals.md#3-whats-the-most-common-root-cause-of-a-poor-inp-score-and-whats-the-general-fix-pattern)*

### 4. Why does an `<img>` without explicit `width`/`height` cause a layout shift, and how do you prevent it?

**Answer:** Without a declared size, the browser has no idea how much vertical space to reserve for an image before it's downloaded, so it renders at zero height at first. Then the image finishes loading, the browser learns its real size, and everything below it gets shoved down abruptly. That shove is the layout shift. Declaring `width`/`height` attributes, or a CSS `aspect-ratio`, reserves that space immediately, before the image data even shows up.

*Source: [08-Web-Performance-and-Core-Web-Vitals.md#4-why-does-an-img-without-explicit-widthheight-cause-a-layout-shift-and-how-do-you-prevent-it](08-Web-Performance-and-Core-Web-Vitals.md#4-why-does-an-img-without-explicit-widthheight-cause-a-layout-shift-and-how-do-you-prevent-it)*

### 5. What's the difference between "lab data" and "field data" for performance measurement, and why do teams need both?

**Answer:** Think of it as simulation versus reality. Lab data, from tools like Lighthouse or WebPageTest, is a controlled, repeatable simulation — great for catching regressions in CI before something ships. Field data, from the Chrome UX Report or a real-user-monitoring library like `web-vitals`, reflects what actual users on real devices and real networks are experiencing — and that's also what search ranking is actually based on. The two can genuinely disagree: a fast dev laptop can post a great lab score while real users on low-end mobile phones are having a rough time.

*Source: [08-Web-Performance-and-Core-Web-Vitals.md#5-whats-the-difference-between-lab-data-and-field-data-for-performance-measurement-and-why-do-teams-need-both](08-Web-Performance-and-Core-Web-Vitals.md#5-whats-the-difference-between-lab-data-and-field-data-for-performance-measurement-and-why-do-teams-need-both)*

### 6. Why does font loading sometimes cause a layout shift, and how does `font-display` help?

**Answer:** If your custom web font hasn't loaded yet, the browser shows text in a fallback font first, with different character widths, then swaps to the custom font once it arrives. If the two fonts size text differently, that swap reflows the surrounding layout — that's the shift. `font-display: optional`, or just picking a fallback font with similar metrics to your custom one, controls whether and how that swap happens, so it avoids or shrinks the shift.

*Source: [08-Web-Performance-and-Core-Web-Vitals.md#6-why-does-font-loading-sometimes-cause-a-layout-shift-and-how-does-font-display-help](08-Web-Performance-and-Core-Web-Vitals.md#6-why-does-font-loading-sometimes-cause-a-layout-shift-and-how-does-font-display-help)*

## [9. CSS Animations and Transitions](09-CSS-Animations-and-Transitions.md)

### 1. When would you use a CSS transition versus a `@keyframes` animation?

**Answer:** Simple rule: two states, use a transition; more than two, use keyframes. A transition fits a simple before-and-after change, triggered by something like `:hover` or a class toggle — it just animates automatically whenever the property's value changes. `@keyframes` comes in when you need more than two states, precise timing at specific percentages, or looping with `infinite` — think a loading skeleton or a spinner.

*Source: [09-CSS-Animations-and-Transitions.md#1-when-would-you-use-a-css-transition-versus-a-keyframes-animation](09-CSS-Animations-and-Transitions.md#1-when-would-you-use-a-css-transition-versus-a-keyframes-animation)*

### 2. Why does an element sometimes snap back to its original style right after a keyframe animation finishes?

**Answer:** By default, animations are surprisingly forgetful — once they finish, the element just snaps back to whatever it looked like before the animation started. Setting `animation-fill-mode: forwards`, either directly or through the `animation` shorthand, fixes that: it keeps the element sitting at its final keyframe's styles after the animation ends. That's almost always what you actually want, like a toast that slides in and then stays visible instead of vanishing.

*Source: [09-CSS-Animations-and-Transitions.md#2-why-does-an-element-sometimes-snap-back-to-its-original-style-right-after-a-keyframe-animation-finishes](09-CSS-Animations-and-Transitions.md#2-why-does-an-element-sometimes-snap-back-to-its-original-style-right-after-a-keyframe-animation-finishes)*

### 3. Why is animating `transform`/`opacity` cheaper than animating `width`/`left`, mechanically?

**Answer:** Mechanically, it comes down to which pipeline stages get skipped. `transform` and `opacity` changes are handled entirely by the GPU compositor, so layout and paint get skipped completely, every single frame. Animating `width` or `left` instead forces a full reflow, and usually a repaint too, on every frame of the animation. That's the direct mechanical reason geometry-based animations stutter under load, while transform-based ones stay smooth no matter what.

*Source: [09-CSS-Animations-and-Transitions.md#3-why-is-animating-transformopacity-cheaper-than-animating-widthleft-mechanically](09-CSS-Animations-and-Transitions.md#3-why-is-animating-transformopacity-cheaper-than-animating-widthleft-mechanically)*

### 4. What does `will-change` actually do, and why shouldn't it be applied to everything "just in case"?

**Answer:** `will-change` is a heads-up to the browser: "promote this element to its own compositor layer now, before the animation starts," so you avoid a small layer-creation delay right at the moment the animation begins. The catch is it's not free — leaving it on permanently across lots of elements wastes GPU memory maintaining layers that mostly just sit idle. The right pattern is to apply it briefly, right before a genuinely upcoming animation, then remove it afterward. It's not a general performance seasoning to sprinkle everywhere.

*Source: [09-CSS-Animations-and-Transitions.md#4-what-does-will-change-actually-do-and-why-shouldnt-it-be-applied-to-everything-just-in-case](09-CSS-Animations-and-Transitions.md#4-what-does-will-change-actually-do-and-why-shouldnt-it-be-applied-to-everything-just-in-case)*

### 5. How would you re-express a sidebar's "slide in from the left" animation to avoid triggering layout on every frame?

**Answer:** Instead of animating `left` or `width`, which are both geometry properties that force a reflow on every frame, animate `transform: translateX(...)` between the off-screen and on-screen positions instead. The end result looks exactly the same to the user. But the cost drops dramatically — it becomes a compositor-only operation, with no layout or paint recalculation involved at all.

*Source: [09-CSS-Animations-and-Transitions.md#5-how-would-you-re-express-a-sidebars-slide-in-from-the-left-animation-to-avoid-triggering-layout-on-every-frame](09-CSS-Animations-and-Transitions.md#5-how-would-you-re-express-a-sidebars-slide-in-from-the-left-animation-to-avoid-triggering-layout-on-every-frame)*
