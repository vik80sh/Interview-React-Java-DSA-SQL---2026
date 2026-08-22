# Event Bubbling, Capturing, and Delegation

This is one of the most reliably-asked JavaScript questions at every level, because it's simple to state and genuinely easy to get wrong in real code — a misunderstood `stopPropagation()` call, or an event listener attached to the wrong element, is a real bug you will actually hit while building a dropdown, a modal, or a data table.

## 1. The Three Phases Every DOM Event Travels Through

```text
Capturing phase (top → down)         Bubbling phase (bottom → up)
window → document → body → ul        li → ul → body → document → window
                          ↓
                    [target: li — the actual clicked element]
```

Every event dispatched on a DOM element travels through three phases, in this order:

1. **Capturing phase** — the event starts at `window` and travels *down* through every ancestor to reach the target. Listeners ignore this phase by default.
2. **Target phase** — the event fires on the actual element that was interacted with.
3. **Bubbling phase** — the event then travels back *up* from the target through every ancestor to `window`. This is the phase a normal `addEventListener` listens to by default.

```javascript
const list = document.querySelector('#product-list');
const item = document.querySelector('#product-42');

item.addEventListener('click', () => console.log('1. target/bubble: item clicked'));
list.addEventListener('click', () => console.log('2. bubble: list heard it too'), false);
list.addEventListener('click', () => console.log('0. capture: list heard it FIRST'), true);

// Clicking #product-42 logs, in this exact order: "0. capture...", "1. target/bubble...", "2. bubble..."
```

The third argument to `addEventListener` (or `{ capture: true }` in the options-object form) is what puts a listener into the capturing phase instead of the default bubbling phase — this is the single most commonly-forgotten detail in an otherwise-correct answer to this question.

## 2. `event.target` vs `event.currentTarget` — the Real Source of Confusion

```javascript
list.addEventListener('click', (event) => {
  console.log(event.target);        // the actual element the user clicked — could be a <span> inside a <li>
  console.log(event.currentTarget); // always the element the listener is attached to — here, #product-list
});
```

`event.target` is the deepest, actual element the interaction happened on, and it doesn't change as the event travels through capturing/bubbling. `event.currentTarget` is whichever element's listener is *currently* running, and inside a listener attached higher up the tree, it's always that ancestor — never the element the user actually clicked. Confusing these two is a very real bug: reading `event.target.dataset.id` when you meant `event.currentTarget.dataset.id` (or vice versa) inside a delegated handler.

## 3. Stopping Propagation — and the Trap of Doing It Too Aggressively

```javascript
// A dropdown menu that must NOT close when you click inside it, but SHOULD close on an outside click
menuButton.addEventListener('click', (event) => {
  event.stopPropagation(); // prevents this click from bubbling up to the document listener below
  toggleMenu();
});

document.addEventListener('click', () => {
  closeMenu(); // any click that reaches here (i.e. wasn't inside the menu) closes it
});
```

`stopPropagation()` stops the event from continuing to travel through the remaining phases — it does not stop other listeners *on the same element* from running (for that, `stopImmediatePropagation()` is the real, less-known tool). `preventDefault()` is a completely separate concern: it stops the browser's *default* behavior for that event (a link navigating, a form submitting) but has nothing to do with propagation — the event still bubbles unless you also call `stopPropagation()`.

The trap: calling `stopPropagation()` reflexively "to be safe" inside deeply nested components breaks any ancestor that legitimately needed to observe that event — a real example is an analytics library that listens for all clicks at the `document` level to track engagement; a component that calls `stopPropagation()` unnecessarily silently makes itself invisible to that tracking, and the bug is hard to spot because nothing throws an error.

## 4. Event Delegation — the Real Production Pattern

```javascript
// Bad: one listener per row — 10,000 rows means 10,000 listeners, each with its own memory overhead
document.querySelectorAll('.table-row').forEach(row => {
  row.addEventListener('click', () => selectRow(row));
});

// Good: ONE listener on the shared parent, using bubbling to catch every row's click
document.querySelector('#data-table').addEventListener('click', (event) => {
  const row = event.target.closest('.table-row'); // find the row, whatever was actually clicked inside it
  if (row) selectRow(row);
});
```

Delegation works specifically *because* of the bubbling phase: a click anywhere inside a row eventually bubbles up to the table's single listener, which uses `event.target.closest(...)` to figure out which row (if any) was actually involved. This is a genuinely important real-world pattern, not just an interview trick — it means new rows added to the table later (after a data refresh) are automatically handled with zero extra listener setup, since the listener lives on the parent, not on rows that come and go.

## 5. How React's Synthetic Events Relate to This

React doesn't attach a real DOM listener to every element with an `onClick` prop — it attaches listeners near the root of the app and uses this exact same bubbling mechanism internally, then dispatches a **synthetic event** (a cross-browser-normalized wrapper around the real DOM event) to your component's handler. This is why React's own event delegation is effectively automatic — you get the performance benefit of Section 4 without writing `closest()` yourself — but it also means `event.stopPropagation()` inside a React `onClick` stops propagation *within React's synthetic event system*, and mixing plain `addEventListener` calls with React's synthetic events on the same tree can produce surprising ordering. See the [React DOM/Refs guide](../React/09-DOM-Refs-and-Event-Handling.md) for the React-specific mechanics.

## Interview Questions and Answers

### 1. What are the three phases of DOM event propagation, in order?

**Answer:** Capturing (the event travels down from `window` to the target, ignored by listeners by default), target (the event fires on the actual element interacted with), and bubbling (the event travels back up from the target to `window`, which is what a normal `addEventListener` listens to unless told otherwise).

### 2. How do you make an event listener run during the capturing phase instead of bubbling?

**Answer:** Pass `true` as the third argument to `addEventListener` (or `{ capture: true }` in the options-object form). Without it, the listener defaults to the bubbling phase.

### 3. What's the difference between `event.target` and `event.currentTarget`?

**Answer:** `event.target` is the actual, deepest element the user interacted with, and it never changes as the event travels through phases. `event.currentTarget` is whichever element the currently-running listener is attached to — inside a listener on an ancestor, it's always that ancestor, never the element the user actually clicked, which is why reading the wrong one inside a delegated handler is a real, common bug.

### 4. What's the difference between `stopPropagation()` and `preventDefault()`?

**Answer:** `stopPropagation()` stops the event from continuing through the remaining capturing/bubbling phases, but has no effect on the browser's default action for that event. `preventDefault()` stops the browser's default behavior (a link navigating, a checkbox toggling) but doesn't affect propagation at all — the event still bubbles unless `stopPropagation()` is also called. They solve two unrelated problems and are often confused for each other.

### 5. Why is calling `stopPropagation()` "just to be safe" actually risky?

**Answer:** It silently prevents any ancestor listener from ever seeing that event — including things you may not have anticipated, like a document-level analytics click tracker or another component's delegated handler higher up the tree. The bug this causes (an ancestor mysteriously never receiving an event) doesn't throw an error, which makes it a genuinely hard one to trace back to its cause.

### 6. What real problem does event delegation solve, and why does it depend specifically on the bubbling phase?

**Answer:** Attaching a separate listener to every row of a large or dynamically-changing list wastes memory and requires re-attaching listeners whenever rows are added or removed. Delegation attaches one listener to a stable ancestor and relies on bubbling to carry every descendant's click up to it, using `event.target` (typically with `.closest()`) to determine which specific descendant was actually involved — new descendants added later are automatically covered with no extra setup.

### 7. How does React's event system relate to native bubbling and delegation?

**Answer:** React attaches its own listeners near the application root rather than to every element with an `onClick`, relying on the same native bubbling mechanism internally, then dispatches a normalized synthetic event to your handler — effectively giving you delegation's performance benefit automatically. Calling `stopPropagation()` inside a React handler stops propagation within React's own synthetic event system, which can behave surprisingly if mixed with plain native `addEventListener` calls on the same DOM tree.

## Revision Checklist

- [ ] Recite the three phases of event propagation in order and explain why bubbling is the default.
- [ ] Predict console output order for a set of capture/bubble listeners on the same click.
- [ ] Explain `event.target` vs `event.currentTarget` with a real delegated-handler example.
- [ ] Explain the difference between `stopPropagation()` and `preventDefault()`, and a real bug caused by overusing the former.
- [ ] Implement event delegation for a dynamic list and explain why it stays correct as rows are added/removed.
- [ ] Explain how React's synthetic event system relates to native bubbling and delegation.
