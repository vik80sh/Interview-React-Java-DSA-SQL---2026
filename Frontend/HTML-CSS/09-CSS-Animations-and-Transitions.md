# CSS Animations and Transitions

The interview-relevant part of this topic isn't syntax — it's connecting straight back to the rendering pipeline in this same folder: which properties you animate determines whether the browser can hand the whole thing to the GPU or has to reflow and repaint on every single frame.

## 1. Transitions — Animating Between Two States

```css
.button {
  background-color: #2563eb;
  transform: scale(1);
  transition: background-color 0.2s ease, transform 0.2s ease;
}
.button:hover {
  background-color: #1d4ed8;
  transform: scale(1.05);
}
```

A transition animates a property automatically whenever its computed value changes — from a `:hover`/`:focus` state, a class toggle, or any other style change — without you writing a single keyframe. It needs a clear start and end state and a trigger (a pseudo-class, or a class added/removed by JavaScript); it can't loop or run through more than two states on its own.

```css
.card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
```

```jsx
// Real React pattern: transition the CSS, toggle a class/state
function Card({ isExpanded }) {
  return <div className={`card ${isExpanded ? 'card--expanded' : ''}`}>...</div>;
}
```

```css
.card--expanded { transform: scale(1.02); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
```

This is the real-world pattern behind almost every hover/expand/collapse micro-interaction in a product UI: React (or plain JS) toggles a class or a boolean-driven inline style, and CSS handles the actual animation between the two resulting states — the animation logic lives entirely in CSS, not in JS-driven frame-by-frame calculation.

## 2. Keyframe Animations — More Than Two States, or Looping

```css
@keyframes pulse {
  0%   { opacity: 1; }
  50%  { opacity: 0.4; }
  100% { opacity: 1; }
}

.skeleton-loader {
  animation: pulse 1.5s ease-in-out infinite;
}
```

`@keyframes` is what a transition can't do: multiple intermediate states, looping (`infinite`), and fine control over timing at specific percentages. A loading skeleton, a spinner, or an attention-drawing pulse on a notification badge are the real use cases — anything that needs to run continuously or pass through more than a simple start/end pair.

```css
@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

.toast {
  animation: slide-in 0.3s ease-out forwards; /* forwards = stay at the final keyframe state */
}
```

`animation-fill-mode: forwards` (often set via the `animation` shorthand's last value, as above) is a real, commonly-needed detail: without it, the element snaps back to its pre-animation styles the instant the animation completes, which is almost never what you actually want for something like a toast sliding in and staying visible.

## 3. Which Properties Are Actually Cheap to Animate

This is the direct payoff of understanding the [Critical Rendering Path guide](07-Critical-Rendering-Path-and-Browser-Rendering.md) — not every CSS property costs the same to animate:

```css
/* Cheap: compositor-only, GPU-handled, skips layout AND paint every frame */
.modal { transition: transform 0.3s, opacity 0.3s; }

/* Expensive: triggers a full reflow on every single frame of the animation */
.sidebar-bad { transition: width 0.3s, left 0.3s; }

/* The fix: express the same visual effect using transform instead */
.sidebar-good { transition: transform 0.3s; }
.sidebar-good--collapsed { transform: translateX(-100%); } /* visually identical result, GPU-only cost */
```

The concrete rule: prefer `transform` (translate/scale/rotate) and `opacity` for anything that needs to be smooth, especially on lower-end devices — nearly any animation that seems to need `width`, `height`, `top`, or `left` can usually be re-expressed with `transform: translate()`/`scale()` instead, and doing so is the single highest-leverage fix for a janky animation.

## 4. `will-change` — a Hint, Not a Magic Fix

```css
.card {
  will-change: transform; /* tells the browser to promote this to its own layer AHEAD of time */
}
```

`will-change` tells the browser to prepare a separate compositor layer for an element before an animation starts, avoiding a brief layer-creation cost right at the moment the animation begins. The real trap: applying `will-change` to many elements permanently (rather than only right before an animation and removed after) wastes GPU memory maintaining layers that are mostly just sitting idle — it's a targeted, temporary hint for a genuinely upcoming animation, not a blanket "make things fast" declaration to sprinkle everywhere.

## 5. Respecting Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  .card, .toast, .skeleton-loader {
    animation: none !important;
    transition: none !important;
  }
}
```

Covered in more depth in the [Responsive Design guide](05-Responsive-Design-and-Media-Queries.md#4-media-query-features-beyond-just-width), but worth repeating here specifically: any animation-heavy component should have a `prefers-reduced-motion` fallback, since this is a genuine accessibility requirement for users with vestibular disorders, not an optional nicety.

## Interview Questions and Answers

### 1. When would you use a CSS transition versus a `@keyframes` animation?

**Answer:** A transition fits a simple two-state change triggered by something like `:hover` or a class toggle — it animates automatically whenever the property's computed value changes. `@keyframes` is needed for anything with more than two states, precise timing control at specific percentages, or looping behavior (`infinite`), like a loading skeleton or a spinner.

### 2. Why does an element sometimes snap back to its original style right after a keyframe animation finishes?

**Answer:** By default, an animation's effect doesn't persist after it completes — the element reverts to its pre-animation computed styles. Setting `animation-fill-mode: forwards` (directly or via the `animation` shorthand) keeps the element at its final keyframe's styles once the animation ends, which is almost always the intended behavior for something like a toast sliding into view and staying visible.

### 3. Why is animating `transform`/`opacity` cheaper than animating `width`/`left`, mechanically?

**Answer:** `transform` and `opacity` changes can be handled entirely by the GPU compositor, skipping the layout and paint steps of the rendering pipeline on every frame. Animating `width`/`left` (or similar geometry-affecting properties) forces a full reflow — and often a repaint — on every single frame, which is the direct mechanical reason those animations tend to stutter under load while transform-based ones stay smooth.

### 4. What does `will-change` actually do, and why shouldn't it be applied to everything "just in case"?

**Answer:** It tells the browser to proactively promote an element to its own compositor layer before an animation starts, avoiding a small layer-creation delay right when the animation begins. Applying it permanently to many elements wastes GPU memory maintaining layers that mostly sit idle, so it should be applied briefly, right before a genuinely upcoming animation, and removed afterward — not sprinkled everywhere as a general performance hint.

### 5. How would you re-express a sidebar's "slide in from the left" animation to avoid triggering layout on every frame?

**Answer:** Instead of animating `left` or `width` (both geometry properties that force a reflow each frame), animate `transform: translateX(...)` between the off-screen and on-screen positions. The visual result is identical, but the cost drops to a compositor-only operation with no layout or paint recalculation involved.

## Revision Checklist

- [ ] Decide correctly between a transition and a `@keyframes` animation for a stated UI requirement.
- [ ] Explain `animation-fill-mode: forwards` and when it's needed.
- [ ] Re-express a `width`/`left`-based animation using `transform` instead, and explain why that's cheaper.
- [ ] Use `will-change` correctly — applied briefly before an animation, not left on permanently.
- [ ] Add a `prefers-reduced-motion` fallback to an animated component.
