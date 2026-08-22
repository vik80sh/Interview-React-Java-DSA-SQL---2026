# Semantic HTML and Accessibility

Semantic HTML and accessibility get treated as a checkbox, but they're asked constantly at senior frontend interviews because they reveal whether you actually think about who and what consumes your markup — screen readers, search engines, keyboard-only users — not just what a sighted mouse user sees.

## 1. Why Semantic HTML Matters Beyond "It's Best Practice"

```html
<!-- Div soup: works visually, means nothing structurally -->
<div class="header">
  <div class="nav">
    <div class="nav-item">Products</div>
  </div>
</div>
<div class="main">
  <div class="post">
    <div class="post-title">New Feature Launch</div>
  </div>
</div>
```

```html
<!-- Semantic: the same visual result, but the structure is machine-readable -->
<header>
  <nav>
    <a href="/products">Products</a>
  </nav>
</header>
<main>
  <article>
    <h1>New Feature Launch</h1>
  </article>
</main>
```

Three real consumers depend on this structure, not just the browser rendering it:

- **Screen readers** build a navigable outline from `<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`, and heading levels — a screen reader user can jump straight to "main content" or "navigation" the same way a sighted user's eyes skip straight to the nav bar. A `<div class="nav">` gives that user nothing to jump to.
- **Search engines** weight a `<h1>` and `<article>` differently than a `<div>` with the same text — semantic structure is a real, measurable SEO input.
- **Browser built-ins** — a `<button>` gets keyboard focus, `Enter`/`Space` activation, and the correct ARIA role for free. A `<div onClick={...}>` styled to look like a button gets none of that unless you manually re-implement it (see Section 3).

## 2. Choosing the Right Element for the Job

```html
<!-- A real product page's structure -->
<body>
  <header>
    <nav aria-label="Main navigation">...</nav>
  </header>

  <main>
    <article>
      <h1>Wireless Noise-Cancelling Headphones</h1>
      <section aria-labelledby="specs-heading">
        <h2 id="specs-heading">Specifications</h2>
        <ul>
          <li>Battery life: 30 hours</li>
        </ul>
      </section>
      <section aria-labelledby="reviews-heading">
        <h2 id="reviews-heading">Customer Reviews</h2>
      </section>
    </article>
    <aside aria-label="Related products">...</aside>
  </main>

  <footer>...</footer>
</body>
```

Heading levels (`h1`–`h6`) must nest in order — skipping from `h1` to `h4` because "it looked right visually" breaks the document outline a screen reader relies on. There should be exactly one `<h1>` per page (the product name here), with `<h2>`s for its major sections.

## 3. ARIA — Only When HTML Itself Can't Say It

The first rule of ARIA is: **don't use ARIA if a native HTML element already does the job.** `<button>` already has the right role, is keyboard-focusable, and fires on `Enter`/`Space` — adding `role="button"` to a `<div>` only becomes necessary when a native element genuinely can't express what you need.

```html
<!-- Wrong: reinventing what <button> gives you for free, and getting it partially wrong -->
<div class="btn" onclick="submitOrder()">Place Order</div>

<!-- Right: use the native element -->
<button type="button" onclick="submitOrder()">Place Order</button>

<!-- ARIA earns its place here: a custom dropdown has no single native HTML equivalent -->
<button aria-haspopup="listbox" aria-expanded="false" aria-controls="country-list">
  Select country
</button>
<ul id="country-list" role="listbox" hidden>
  <li role="option" aria-selected="false">India</li>
</ul>
```

Common real ARIA attributes worth knowing: `aria-label` (an accessible name when there's no visible text, e.g. an icon-only close button), `aria-live="polite"` (announce dynamic content changes to screen readers — a real use case: a toast notification or a "3 items added to cart" message that appears without a page navigation), `aria-expanded`/`aria-controls` for disclosure widgets, and `aria-hidden="true"` to hide purely decorative content (an icon next to text that already conveys the same meaning) from assistive tech.

## 4. Keyboard Accessibility — the Fastest Way to Audit a Page Yourself

```html
<!-- A modal that traps focus correctly is real, common interview-relevant code -->
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Deletion</h2>
  <button autofocus>Cancel</button>
  <button>Delete</button>
</div>
```

The single fastest accessibility check anyone can do without a screen reader: **unplug the mouse and tab through the page.** Every interactive element should be reachable, its focus state should be visible (never `outline: none` without a real replacement focus style), and a modal should trap focus inside itself while open and return focus to the triggering element on close — a real, common bug is a modal that lets `Tab` escape into page content hidden behind it.

## 5. Forms and Alt Text — the Two Most-Tested Accessibility Basics

```html
<label for="email">Email address</label>
<input id="email" type="email" required aria-describedby="email-error" />
<span id="email-error" role="alert">Enter a valid email address</span>

<img src="chart-q3-revenue.png" alt="Q3 revenue grew 18% quarter over quarter" />
<img src="decorative-swirl.png" alt="" /> <!-- empty alt, not missing alt, for purely decorative images -->
```

A `<label for="...">` linked to its input's `id` is what lets a screen reader announce "Email address, edit text" instead of just "edit text" — clicking the label also focuses/activates the input, a real usability win for everyone, not just assistive-tech users. `alt` text should describe the image's *purpose in context* (a revenue chart's alt text should convey the trend, not just "chart"), and a genuinely decorative image should get `alt=""` (empty, not omitted) so screen readers skip it entirely instead of announcing an unhelpful filename.

## Interview Questions and Answers

### 1. Why does semantic HTML matter if the page looks identical either way?

**Answer:** The visual result being identical is exactly the trap — a screen reader, a search engine crawler, and browser built-in keyboard/focus behavior all read the *structure*, not the pixels. A `<div class="nav">` looks like navigation to a sighted user but gives a screen reader nothing to jump to, unlike a real `<nav>` landmark.

### 2. When should you reach for an ARIA attribute instead of a native HTML element?

**Answer:** Only when no native element already expresses what you need — ARIA's first rule is "don't use ARIA if HTML already solves it." A `<button>` already has focus, keyboard activation, and the right role built in; a custom widget like a combobox or a tab panel, which has no single native equivalent, is where `role`/`aria-*` attributes actually earn their place.

### 3. What's the fastest way to self-audit a page's keyboard accessibility?

**Answer:** Unplug the mouse and tab through the entire page. Every interactive control should be reachable in a sensible order, its focus indicator should be visible, and a modal or dropdown should trap focus while open rather than letting `Tab` leak into the content behind it.

### 4. Why should `alt=""` be used for decorative images instead of omitting the `alt` attribute entirely?

**Answer:** A missing `alt` attribute causes some screen readers to announce the image's filename or URL as a fallback, which is noise for a purely decorative image. An explicit empty `alt=""` tells the screen reader to skip the image entirely, which is the correct behavior when the image adds no information.

### 5. Why must heading levels (`h1`–`h6`) nest in order rather than being picked by visual size?

**Answer:** Screen reader users navigate by jumping between headings to build a mental outline of the page, the same way a sighted user's eyes skim heading text. Skipping from `h1` to `h4` because a designer wanted smaller text at that point breaks that outline — heading level should reflect document structure, and font size should be controlled with CSS instead.

### 6. What does `aria-live="polite"` actually do, and when would you use it?

**Answer:** It tells assistive technology to announce changes inside that region without interrupting whatever the user is currently doing (as opposed to `assertive`, which interrupts immediately). A real use case is a toast notification or an "item added to cart" confirmation that appears without a page navigation — without `aria-live`, a screen reader user would never know it appeared at all.

### 7. Why is `<label for="...">` linked to an input's `id` better than just placing text near the input?

**Answer:** The explicit association is what lets a screen reader announce the label together with the input's role and state, and it also makes the label itself clickable to focus/activate the input — a real usability improvement for everyone, not only assistive-tech users, especially on small touch targets.

## Revision Checklist

- [ ] Replace a div-soup layout with the correct semantic landmarks (`header`, `nav`, `main`, `article`, `aside`, `footer`).
- [ ] Explain the "don't use ARIA if HTML already does it" rule with a concrete example.
- [ ] Tab through a real page with no mouse and identify at least one keyboard-accessibility gap.
- [ ] Correctly choose `alt=""` vs a descriptive `alt` vs no `alt` at all for different image types.
- [ ] Explain why heading levels must nest in document order, independent of visual font size.
- [ ] Use `aria-live`, `aria-expanded`, and `aria-label` correctly in a real custom-widget example.
