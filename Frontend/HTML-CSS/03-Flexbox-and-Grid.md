# Flexbox and Grid

Both are layout systems that replaced the old float/table hacks, and interviewers use them to check something specific: not "do you know the property names" but "do you know which system fits which problem." The honest answer — flexbox for one-dimensional flow, grid for two-dimensional layout — is the whole exam in one sentence, and every question below is really testing whether you can back that up.

## 1. Flexbox — One Dimension, Content-Driven

```css
.navbar {
  display: flex;
  justify-content: space-between; /* main axis: push logo left, nav-links + avatar right */
  align-items: center;            /* cross axis: vertically center everything */
  gap: 16px;
}
```

Flexbox lays children out along a single axis (row or column, set by `flex-direction`) and is built for content that dictates its own size — a navbar, a button group, a card's header. `justify-content` controls the **main axis** (the direction items flow); `align-items` controls the **cross axis** (perpendicular to that flow) — mixing these two up is the single most common flexbox interview stumble.

```css
.cart-item {
  display: flex;
}
.cart-item__name { flex: 1; }        /* grow to fill remaining space */
.cart-item__price { flex: 0 0 80px; } /* never grow, never shrink, fixed 80px */
```

`flex` is shorthand for `flex-grow flex-shrink flex-basis`. A real, common layout — a cart row where the product name should expand to fill available width but the price column should stay a fixed width — is exactly `flex: 1` vs `flex: 0 0 80px`, not something that needs manual width calculations.

## 2. Grid — Two Dimensions, Layout-Driven

```css
.dashboard {
  display: grid;
  grid-template-columns: 240px 1fr;   /* fixed sidebar, flexible main area */
  grid-template-rows: 64px 1fr;       /* fixed header, flexible content */
  grid-template-areas:
    "sidebar header"
    "sidebar main";
  height: 100vh;
}
.sidebar { grid-area: sidebar; }
.header  { grid-area: header; }
.main    { grid-area: main; }
```

Grid defines the layout **structure first** (rows and columns) and then places children into it — the opposite mental model from flexbox, which lays items out based on their own content. A dashboard shell (sidebar + header + main content) is the textbook real use case: you're not asking "how should these three things flow," you're asking "here is the page's fixed structure, place these three regions into it."

```css
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}
```

`repeat(auto-fill, minmax(220px, 1fr))` is the real-world "responsive card grid" one-liner: as many 220px-minimum columns fit the row as possible, and they share the leftover space evenly — no media query needed to add or remove columns as the viewport changes width. `auto-fit` instead of `auto-fill` additionally collapses empty tracks when there are fewer items than would fill a row, which matters when the grid has very few items and you don't want them stretched across leftover empty column tracks.

## 3. The Decision: Flexbox vs Grid

| | Flexbox | Grid |
|---|---|---|
| Dimensions | One (row or column) | Two (rows and columns together) |
| Driven by | Content size | Explicit structure you define |
| Real use case | Navbar, button group, a card's internal layout | Page shell, dashboard layout, photo gallery, responsive card grid |
| Item overflow | Items can wrap to a new line, but each line is independently laid out | Items are placed into a defined grid; alignment spans the whole structure |

The honest, most senior-sounding answer to "flexbox or grid?" is: **use grid for the page/component's overall skeleton, and flexbox for aligning things within one region of that skeleton** — a dashboard is commonly `display: grid` at the outer level (sidebar/header/main) with `display: flex` inside the header (logo, search bar, avatar in a row) and inside the sidebar (nav items stacked in a column). They're not competitors; they compose.

## 4. Common Real Alignment Problems, Solved

```css
/* Perfectly centering a modal/spinner — the answer to "how do you center a div" */
.modal-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* A footer that sticks to the bottom even on a short page, without position: fixed */
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.page__content { flex: 1; } /* takes all leftover vertical space, pushing footer down */

/* Equal-height sidebar and main content, without JS measuring anything */
.layout {
  display: flex;
}
.sidebar, .main { flex: 1; } /* flex items in a row stretch to match the tallest by default */
```

The equal-height sidebar trick works because flex items default to `align-items: stretch` on the cross axis — this is the actual mechanism behind "why do flex children end up the same height even though I never set a height," a fact worth being able to explain rather than just knowing as folklore.

## Interview Questions and Answers

### 1. How do you decide between flexbox and grid for a given layout?

**Answer:** Flexbox for one-dimensional, content-driven layout — a row or column where item sizing follows the content, like a navbar or button group. Grid for two-dimensional, structure-driven layout — where you define the rows and columns first and place content into them, like a page shell or a responsive card gallery. In practice they compose: grid for the outer skeleton, flexbox for aligning things inside one region of it.

### 2. What's the difference between `justify-content` and `align-items` in flexbox?

**Answer:** `justify-content` controls alignment along the main axis — the direction `flex-direction` sets the items to flow in. `align-items` controls alignment along the cross axis, perpendicular to that flow. Swapping `flex-direction` from `row` to `column` swaps which axis each property actually controls, which is the source of a lot of real confusion.

### 3. How does `flex: 1` actually work, and how would you build a cart row with a flexible name column and a fixed-width price column?

**Answer:** `flex: 1` is shorthand for `flex-grow: 1; flex-shrink: 1; flex-basis: 0%`, meaning the item grows to consume available leftover space. Setting the name column to `flex: 1` and the price column to `flex: 0 0 80px` (never grow, never shrink, fixed basis) gives exactly that layout without manual width math.

### 4. What does `repeat(auto-fill, minmax(220px, 1fr))` actually do, and why is it useful?

**Answer:** It creates as many columns as fit the container, each at least 220px wide, sharing any leftover space equally via `1fr` — producing a responsive card grid that adds or removes columns as the viewport resizes, with zero media queries needed for that behavior specifically.

### 5. Why do two flex items in a row end up the same height even when neither has an explicit height set?

**Answer:** Flex items default to `align-items: stretch` on the cross axis, so each item stretches to match the height of the tallest item in that flex line unless a different `align-items`/`align-self` value overrides it. This is the real mechanism behind the common "equal height columns" layout trick, not a special CSS feature — it's the flexbox default doing its normal job.

### 6. How would you center a modal both horizontally and vertically, and why is that historically hard in CSS?

**Answer:** `display: flex; justify-content: center; align-items: center` on the overlay container centers its child both ways in two lines. It's historically "hard" because centering vertically has no single clean pre-flexbox solution — old techniques relied on table-cell display, absolute positioning with negative margins computed from a known height, or line-height hacks, all fragile compared to flexbox's built-in cross-axis alignment.

### 7. What's the difference between `auto-fill` and `auto-fit` in a grid `repeat()` track list?

**Answer:** Both fit as many tracks of the given minimum size as the container allows, but `auto-fill` keeps empty tracks in the layout (leaving visible gaps if there are fewer items than tracks), while `auto-fit` collapses those empty tracks to zero width, letting the actual items stretch to fill the remaining space instead of leaving empty columns.

## Revision Checklist

- [ ] Explain the flexbox main axis vs cross axis and correctly pair `justify-content`/`align-items` to each.
- [ ] Build a flexible-plus-fixed-width row layout using `flex` shorthand values.
- [ ] Build a page shell with CSS Grid using named grid areas.
- [ ] Build a responsive card grid with `repeat(auto-fill, minmax(...))` and explain `auto-fill` vs `auto-fit`.
- [ ] Justify a flexbox-vs-grid choice for a stated real layout, and explain how they compose together.
- [ ] Center something both ways with flexbox and explain why that was historically awkward in CSS.
