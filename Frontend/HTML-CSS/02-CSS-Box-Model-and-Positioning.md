# CSS Box Model and Positioning

Every CSS layout bug — an element that's 20px wider than expected, a sidebar that won't stick, an overlay hidden behind content it should cover — traces back to one of two things: a box-model miscalculation or a positioning-context misunderstanding. Both are asked constantly because they separate "can write CSS" from "can debug CSS."

## 1. The Box Model — What `width` Actually Means

Every element is four nested boxes: **content**, **padding**, **border**, **margin**.

```css
.product-card {
  width: 300px;
  padding: 16px;
  border: 2px solid #ddd;
  margin: 8px;
}
```

With the browser default (`box-sizing: content-box`), `width: 300px` sets **only the content box** — padding and border are added *on top* of that, so this card actually renders `300 + 16*2 + 2*2 = 336px` wide. This is the classic "why is my grid column overflowing by a few pixels" bug: two `300px`-wide cards with different padding render at different actual widths even though their `width` declarations match.

```css
* {
  box-sizing: border-box; /* the real-world default almost every team sets globally */
}
```

With `border-box`, `width: 300px` means the padding and border are carved *out of* that 300px, so the content area shrinks to fit — the element's rendered width matches its declared width exactly, which is why resetting `box-sizing: border-box` on `*` is one of the first lines in nearly every production CSS reset.

Margin behaves differently from padding in one important way: **vertical margins between two block-level siblings collapse** into a single margin (the larger of the two, not their sum) — a real cause of "why is there only 20px of space, not 40px" between a heading with `margin-bottom: 20px` and a paragraph with `margin-top: 20px`. This collapsing does not happen with padding, and does not happen across a flex or grid container's children (Section 2 of the [Flexbox/Grid guide](03-Flexbox-and-Grid.md)).

## 2. `position` — Establishing and Escaping Layout Flow

```css
.badge {
  position: relative;
  top: -4px; /* nudges the badge up, but other elements still reserve its ORIGINAL space */
}
```

| Value | Removed from normal flow? | Positioned relative to |
|---|---|---|
| `static` | No (the default) | Normal document flow |
| `relative` | No — space is still reserved | Its own original position |
| `absolute` | Yes | Nearest ancestor with `position` other than `static` (its "positioning context") |
| `fixed` | Yes | The browser viewport, ignoring scroll |
| `sticky` | No, until a scroll threshold | Its normal position, then the viewport once scrolled past a given offset |

The real, commonly-tested trap: `position: absolute` positions relative to the **nearest ancestor that itself has a non-static `position`** — not necessarily the direct parent, and not the whole page. Forgetting to give any ancestor `position: relative` means the absolute element positions relative to the whole document (or the initial containing block), which is exactly the "why did my tooltip jump to the top-left corner of the page" bug:

```html
<div class="product-card"> <!-- needs position: relative to become the positioning context -->
  <span class="badge">Sale</span>
</div>
```

```css
.product-card { position: relative; } /* establishes the positioning context */
.badge {
  position: absolute;
  top: 8px;
  right: 8px; /* now correctly anchored to the card's own corner, not the whole page */
}
```

`position: sticky` is genuinely different from both: an element stays in normal flow (its siblings still respect its original space) until the page scrolls past a threshold you set (`top: 0`), at which point it "sticks" to that position within its nearest scrolling ancestor — a real use case is a table's header row staying visible while its rows scroll underneath, or a section's navigation staying pinned while its content scrolls.

## 3. Stacking Context and `z-index`

```css
.modal-overlay { position: fixed; z-index: 1000; }
.dropdown-menu { position: absolute; z-index: 10; }
```

`z-index` only has an effect on a **positioned** element (anything other than `static`) — and it only compares meaningfully *within the same stacking context*. A real, frustrating bug: a dropdown with `z-index: 999` still renders behind another element with `z-index: 1`, because that other element's ancestor created a *new* stacking context (via `transform`, `opacity` less than 1, `will-change`, or `isolation: isolate`) that the dropdown's high z-index can never escape, since z-index comparisons happen only among siblings within the same stacking context — a value of 999 inside a "lower" stacking context still loses to a value of 1 in a "higher" one. Debugging this means walking up the DOM tree looking for the ancestor that accidentally created a new stacking context, not just cranking `z-index` higher and higher.

## 4. `overflow` and Why It Interacts With Positioning

```css
.card { overflow: hidden; border-radius: 12px; } /* clips rounded corners cleanly */
```

`overflow: hidden` clips any content that extends past the element's box — useful for rounding corners on an image, but it also clips an `absolute`ly positioned child that tries to escape that box, and this is exactly why a tooltip or dropdown inside a card with `overflow: hidden` gets silently clipped instead of floating above it. The real production fix is almost always a **React portal** (rendering the tooltip's DOM node elsewhere in the tree, e.g. directly under `<body>`, while keeping its React logical position — covered in the [React DOM/Refs guide](../React/09-DOM-Refs-and-Event-Handling.md)) rather than fighting `overflow` and `z-index` simultaneously.

## Interview Questions and Answers

### 1. Why does a `300px`-wide element with `padding: 20px` sometimes render at `340px`, and sometimes render at exactly `300px`?

**Answer:** It depends on `box-sizing`. The default `content-box` applies `width` only to the content area, adding padding and border on top, producing `340px`. `border-box` makes `width` include padding and border, carving them out of the declared width instead — which is why almost every real project sets `box-sizing: border-box` globally as one of the first lines of its CSS reset.

### 2. Why do two stacked block elements with `margin-bottom: 20px` and `margin-top: 20px` end up with only 20px of space between them, not 40px?

**Answer:** Adjacent vertical margins between block-level siblings collapse into a single margin equal to the larger of the two, not their sum. This collapsing doesn't happen with padding, and it doesn't happen between flex or grid children, which is one real reason teams sometimes switch a layout to flexbox specifically to get predictable spacing.

### 3. Why does `position: absolute` sometimes position an element relative to the whole page instead of its intended parent?

**Answer:** An absolutely positioned element is placed relative to its nearest ancestor with a `position` value other than `static` — if no ancestor has one, it falls back to the page's initial containing block. The fix is giving the intended parent `position: relative` (or another non-static value) so it becomes the positioning context.

### 4. Why can a dropdown with `z-index: 999` still render behind an element with `z-index: 1`?

**Answer:** `z-index` values only compare meaningfully within the same stacking context. If an ancestor of that other element created a new stacking context (via `transform`, `opacity < 1`, `will-change`, or `isolation: isolate`), everything inside it stacks as a unit relative to siblings outside — so a low z-index inside a "higher" stacking context can still beat a high z-index trapped inside a "lower" one.

### 5. What makes `position: sticky` different from both `relative` and `fixed`?

**Answer:** It behaves like `relative` (staying in normal flow, so its siblings still reserve its original space) until the page scrolls past a threshold you define (like `top: 0`), at which point it behaves like `fixed` relative to its nearest scrolling ancestor. `fixed` alone never respects normal flow at all, and `relative` alone never "catches" onto the viewport during scroll.

### 6. Why does a tooltip inside a card sometimes get clipped even though it's `position: absolute`?

**Answer:** If the card (or any ancestor) has `overflow: hidden` (or `auto`/`scroll`), it clips any content that visually extends past its box, including an absolutely positioned child trying to escape it. The real production fix is usually rendering the tooltip through a portal so its DOM node lives outside the clipping ancestor entirely, rather than trying to override `overflow` on a container that needs it for other reasons.

## Revision Checklist

- [ ] Explain the box model's four layers and calculate an element's actual rendered width under both `content-box` and `border-box`.
- [ ] Explain margin collapsing and when it does/doesn't apply.
- [ ] Predict where an `absolute`ly positioned element lands given a specific ancestor chain, and fix a missing positioning context.
- [ ] Debug a real z-index stacking bug by finding the ancestor that created an unintended stacking context.
- [ ] Explain `sticky` vs `relative` vs `fixed` with a real UI example for each.
- [ ] Explain why `overflow: hidden` clips absolutely positioned children, and the portal-based fix.
