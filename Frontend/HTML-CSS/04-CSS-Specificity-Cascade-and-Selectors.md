# CSS Specificity, the Cascade, and Selectors

"Why isn't my CSS applying?" is one of the most common real debugging sessions in frontend work, and it's almost always answered by the cascade — the deterministic set of rules that decides which of several competing declarations actually wins. Knowing this cold is the difference between guessing with `!important` and fixing it in ten seconds.

## 1. The Cascade — the Order CSS Actually Resolves Conflicts

When multiple rules target the same element and property, the browser resolves the conflict in this order:

1. **Origin and importance** — user-agent styles lose to author (your) styles, which lose to `!important` author styles, which lose to user `!important` styles (rare in practice).
2. **Specificity** — a more specific selector wins (Section 2).
3. **Source order** — if specificity ties, whichever rule appears later in the stylesheet (or later `<link>`/`<style>`) wins.

```css
.btn { color: blue; }
.btn { color: green; } /* wins — same specificity, appears later */
```

This third rule — pure source order as the final tiebreaker — is the one people forget, and it's exactly why import/link order matters: a component's own stylesheet loaded *before* a shared theme stylesheet can have its rules silently overridden by an equally-specific rule in that theme file, purely because of load order.

## 2. Specificity — How "More Specific" Is Actually Calculated

Specificity is a 3-part score: **(ID selectors, class/attribute/pseudo-class selectors, element/pseudo-element selectors)** — compared left to right, like a version number, not summed into one number.

```css
button { color: black; }                    /* (0, 0, 1) */
.btn { color: blue; }                        /* (0, 1, 0) — beats the element selector */
.card .btn { color: green; }                 /* (0, 2, 0) — beats a single class */
#checkout-button { color: red; }             /* (1, 0, 0) — beats any number of classes */
```

`#checkout-button` beats `.card .btn` beats `.btn` beats `button`, regardless of how many classes are chained — one ID always outranks any number of classes, because comparison is column-by-column, not a weighted sum (`(0, 99, 0)` still loses to `(1, 0, 0)`). This is the real, practical reason senior teams avoid styling by ID and avoid deep selector chains (`.page .content .card .header .title`) — a highly specific selector like that becomes almost impossible to override later without matching or exceeding its exact specificity, which is how projects end up drowning in `!important`.

```css
.btn:hover { color: darkblue; }   /* (0, 2, 0) — pseudo-classes count like classes */
.btn::before { content: "→"; }    /* (0, 1, 1) — pseudo-elements count like elements */
```

Inline styles (`style="color: red"`) outrank every selector-based rule except `!important`, which is exactly why inline styles are hard to override from a stylesheet and why component libraries generally avoid emitting them for anything a consumer might need to theme.

## 3. `!important` — Why It's a Real Production Problem, Not Just a Style Nitpick

```css
.btn { color: blue !important; }
```

`!important` doesn't just win once — it wins against *every* non-`!important` rule regardless of specificity, and the only way to override an `!important` rule is with another `!important` rule of equal or higher specificity. The real production problem: once one team adds `!important` to force their button color through a specificity fight, the next team hits the exact same wall and adds their own `!important` on top, and the codebase spirals into an arms race where nobody can predict what actually renders without checking DevTools. The durable fix is almost always reducing selector specificity everywhere (flatter selectors, a consistent naming convention like BEM — see the [CSS Architecture guide](06-CSS-Architecture-BEM-Modules-CSS-in-JS.md)) rather than reaching for `!important` to win one battle.

## 4. Selector Types Worth Knowing Cold

```css
.card > .card-title      { }  /* direct child only */
.card .card-title        { }  /* any descendant, any depth */
.card + .card             { }  /* the sibling immediately after a .card */
.card ~ .card              { }  /* any sibling after a .card */

input:focus               { }  /* pseudo-class: a state */
input:disabled            { }
li:nth-child(odd)          { }  /* real use: zebra-striping a table without extra classes */
p::first-letter            { }  /* pseudo-element: a generated sub-part of the element */

[data-status="pending"]   { }  /* attribute selector — real use: styling by a data attribute
                                    instead of adding a class per state */
```

`>` (direct child) vs plain descendant matters in real components: `.card > .card-title` only matches a title that's a *direct* child of `.card`, which prevents accidentally styling a nested card's title too if cards can contain other cards. `:nth-child` and attribute selectors are the real-world tools for styling based on structural position or data state without needing JavaScript to toggle an extra class for every visual variant.

## 5. Inheritance — Which Properties Cascade Down "For Free"

```css
body { font-family: sans-serif; color: #222; } /* inherited by every descendant automatically */
.card { border: 1px solid #ddd; }                /* NOT inherited — border doesn't cascade down */
```

Typography-related properties (`color`, `font-family`, `font-size`, `line-height`) inherit by default; box-model properties (`border`, `margin`, `padding`, `width`) do not. This is why setting `font-family` once on `body` styles an entire app, while a `border` has to be set on every element that needs one — and it's why `inherit`, `initial`, and `unset` exist as explicit values when you need to override that default behavior in either direction.

## Interview Questions and Answers

### 1. Two CSS rules target the same element with the same specificity — which one wins, and why?

**Answer:** The one that appears later in source order (later in the same file, or in a file loaded/imported later) wins. This is the cascade's final tiebreaker after origin/importance and specificity, and it's the reason stylesheet load order matters even when nobody is using `!important`.

### 2. Why does an ID selector always beat any number of chained class selectors?

**Answer:** Specificity is compared as a 3-part tuple (IDs, classes/attributes/pseudo-classes, elements) column by column, not summed into a single number — so any nonzero value in the ID column outranks an arbitrarily large value in the class column. `(1, 0, 0)` beats `(0, 50, 0)`.

### 3. Why do experienced teams avoid deep selector chains like `.page .content .card .title`?

**Answer:** Each extra class in the chain raises that rule's specificity, making it progressively harder for anyone else to override later without matching or exceeding that same specificity — which is exactly how codebases end up reaching for `!important` just to win an otherwise-avoidable specificity fight.

### 4. Why is `!important` considered a real long-term problem rather than just a quick fix?

**Answer:** It overrides specificity entirely, so once used, the only way to override it later is with another equal-or-higher-specificity `!important` rule — which invites an escalating arms race between teams/components, after which nobody can predict what actually renders without inspecting computed styles in DevTools. The durable fix is reducing selector specificity project-wide, not stacking more `!important`s.

### 5. What's the practical difference between `.card .title` and `.card > .title`?

**Answer:** `.card .title` matches `.title` at any nesting depth inside `.card`, including inside a nested card. `.card > .title` matches only a `.title` that is a direct child of `.card` — which matters for real components that can contain other instances of themselves, like a card that can contain another card.

### 6. Why does setting `color` on `body` style the whole page, but setting `border` on `body` does nothing to nested elements?

**Answer:** `color` (and other typography properties like `font-family`, `font-size`, `line-height`) inherit by default, cascading down to every descendant unless overridden. Box-model properties like `border`, `margin`, and `padding` don't inherit at all — they have to be set explicitly on whichever element actually needs them.

## Revision Checklist

- [ ] Calculate specificity for a set of competing selectors and predict which rule wins.
- [ ] Explain the cascade's full tiebreak order: origin/importance, then specificity, then source order.
- [ ] Explain why `!important` causes long-term maintainability problems, not just short-term wins.
- [ ] Distinguish `>` (direct child) from plain descendant selectors with a real nested-component example.
- [ ] Use an attribute selector (`[data-status="..."]`) or `:nth-child` to style by state/position without adding extra classes.
- [ ] Name which common CSS properties inherit by default and which don't.
