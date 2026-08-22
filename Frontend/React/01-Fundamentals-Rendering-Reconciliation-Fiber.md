# React Fundamentals: Rendering, Reconciliation, and Fiber

This is the single most common opening sequence in a React interview: "what is the virtual DOM," "why do keys matter," "explain Fiber." Getting through all three cleanly, with real examples instead of `<div>`/`<span>` toys, signals you actually understand the rendering pipeline rather than having memorized definitions.

## 1. React's Core Model: UI as a Function of State

React is **declarative**: you describe what the UI should look like for a given state, and React figures out how to make the real DOM match it. You never write "find this DOM node and change its class" — you write "given this state, render this JSX," and React re-runs that description whenever the state changes.

```javascript
function ProductPage({ product }) {
  const [selectedSize, setSelectedSize] = useState('M');
  const [inStock, setInStock] = useState(product.stock[selectedSize] > 0);

  useEffect(() => {
    setInStock(product.stock[selectedSize] > 0);
  }, [selectedSize, product.stock]);

  // The entire render is just: given selectedSize and inStock, what does this look like?
  return (
    <div>
      <SizePicker sizes={product.sizes} selected={selectedSize} onSelect={setSelectedSize} />
      <button disabled={!inStock}>{inStock ? 'Add to Cart' : 'Out of Stock'}</button>
    </div>
  );
}
```

Nowhere in `ProductPage` do you imperatively toggle the button's `disabled` attribute or swap its text. You changed `selectedSize`, and the function re-ran and computed the new output — the "render" is `f(state) -> UI`. This is the property that makes React predictable: the same state always produces the same tree, so debugging a UI bug becomes "which state is wrong," not "which DOM mutation fired out of order."

## 2. The Virtual DOM: Diffing a Lightweight Tree Instead of Touching the Real DOM

The **Virtual DOM** is a plain JavaScript object tree that mirrors what the real DOM should look like — a `{ type, props, children }` structure, not an actual browser node. Mutating the real DOM is expensive because a single attribute change can trigger layout recalculation and repaint; the browser has to reconcile styles, geometry, and rendering, not just update a value in memory.

```javascript
// A cart summary badge — real DOM node has hundreds of properties
// (attributes, event listeners, layout info, style computation hooks, etc.)

// The Virtual DOM equivalent React actually works with:
{
  type: 'span',
  props: { className: 'cart-badge', children: '3 items' },
  key: null
}
```

When the cart count changes from 3 to 4, React does not touch the browser at all during the calculation step. It builds a new plain-object tree in memory, compares it against the previous plain-object tree, and only after that comparison does it touch the real DOM — and only for the parts that actually differ:

```javascript
// Dashboard with a live order counter re-rendering every few seconds
function OrderDashboard({ pendingOrders }) {
  return (
    <div className="dashboard">
      <Header />                              {/* unchanged every tick */}
      <OrderCount count={pendingOrders} />    {/* only this text node actually changes */}
      <Footer />                              {/* unchanged every tick */}
    </div>
  );
}
```

Without a Virtual DOM, a naive re-render would mean re-creating and re-inserting the whole dashboard's markup on every tick. With it, React diffs the new in-memory tree against the old one, discovers `Header` and `Footer` are structurally identical, and touches only the single text node inside `OrderCount`. Comparing plain JS objects is fast; comparing them lets React batch several state changes into one real DOM update instead of one per `setState` call.

## 3. Reconciliation and Keys: Why List Identity Matters

**Reconciliation** is the algorithm that walks the old and new Virtual DOM trees and decides what actually changed. Its two governing rules: if an element's type changes (a `<div>` becomes a `<section>`), React throws away the old subtree and rebuilds from scratch; if the type stays the same, React reuses the DOM node and just updates its props. For lists, React needs a third signal — a **key** — to track which array item is which across renders, because position alone is not identity.

Here's the real failure mode: a shopping cart where each row has a quantity `<input>`, rendered without a stable key:

```javascript
// Cart items sorted by price-ascending after the user changes the sort order
const cartItems = [
  { id: 'sku-101', name: 'Wireless Mouse', qty: 2 },
  { id: 'sku-204', name: 'Mechanical Keyboard', qty: 1 },
  { id: 'sku-317', name: 'USB-C Hub', qty: 3 },
];

// BAD: index as key
{cartItems.map((item, index) => (
  <CartRow key={index} name={item.name}>
    <input type="number" defaultValue={item.qty} />
  </CartRow>
))}
```

Before the sort, index `0` is the Mouse row, and its `<input>` holds whatever quantity the user typed. After sorting by price, the USB-C Hub might now be at index `0`. React sees "the element at key `0` is still a `CartRow`" and reuses the same DOM node and the same `<input>` — including whatever value the user had typed into it — and just swaps the `name` prop. The quantity the user entered for the Mouse now visually sits next to the USB-C Hub. The DOM node's identity didn't move with the data; it stayed pinned to its position.

```javascript
// GOOD: stable identity that travels with the data
{cartItems.map((item) => (
  <CartRow key={item.id} name={item.name}>
    <input type="number" defaultValue={item.qty} />
  </CartRow>
))}
```

With `item.id` as the key, React recognizes `sku-101` as the same logical row wherever it moves in the array, and moves its actual DOM node (and the user's typed-in `<input>` value) along with it instead of recreating or misattributing it. The rule in practice: use index as a key only for a list that is genuinely static and never reorders, filters, or has items inserted/removed; anything with real identity — a database row, a cart line, a todo — needs a key derived from that identity.

## 4. Fiber Architecture: Interruptible, Prioritized Rendering

**Fiber** is the reconciliation engine React rewrote itself around in React 16, replacing the old **stack reconciler**. The stack reconciler walked the component tree using plain recursive function calls, and a JS call stack cannot be paused mid-flight — so a large tree update ran to completion in one synchronous block, however long that took, freezing the main thread for the duration.

Fiber breaks that same tree walk into a linked list of small units of work — a **Fiber node** per component/DOM element, each holding pointers to its child, sibling, and parent — so React can stop after any unit, hand control back to the browser, and resume later:

```javascript
// A fiber node's essential shape
{
  type: 'ProductList',
  child: firstChildFiber,
  sibling: nextSiblingFiber,
  return: parentFiber,
  alternate: previousVersionOfThisFiber, // for diffing against last commit
  effectTag: 'UPDATE',                   // PLACEMENT | UPDATE | DELETION
}
```

The real-world payoff: a search box filtering a large product catalog. The user types a character, `onChange` updates the query state, and that triggers a re-render of hundreds of `ProductCard` rows filtered against the new query.

```javascript
function SearchableProductGrid({ products }) {
  const [query, setQuery] = useState('');
  const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      {/* This must feel instant on every keystroke */}
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products..." />
      {/* This can legitimately take 10-20ms to re-render for a large catalog */}
      <ProductGrid items={filtered} />
    </div>
  );
}
```

Under the old stack reconciler, re-rendering hundreds of `ProductCard`s synchronously could take long enough to make the next keystroke feel dropped — the render blocks the thread, so the input's own update has to wait behind it. With Fiber, React's render phase is split into interruptible units: it can render some of the grid, notice a new keystroke arrived, pause the grid work, prioritize handling the input update first, and resume or restart the grid render afterward. This is also why Fiber's work is split into two phases — the render phase (building the work-in-progress tree, safe to pause) and the **commit** phase (actually mutating the real DOM), which is deliberately synchronous and non-interruptible, because a half-applied DOM patch would leave the user staring at a broken layout mid-update.

## Interview Questions and Answers

### 1. What does it mean that React is declarative, and why does that matter?

**Answer:** You describe the UI as a function of the current state and props, rather than writing step-by-step DOM mutation instructions. It matters because the same state always produces the same output, so a bug becomes "which state value is wrong" instead of "which imperative DOM call fired in the wrong order" — a much smaller debugging surface.

### 2. What is the Virtual DOM, and why is diffing it faster than manipulating the real DOM directly?

**Answer:** It's a plain JavaScript object tree — `{ type, props, children }` — that mirrors the intended UI, with none of the browser's layout, style, or event-listener machinery attached. Comparing two plain JS trees in memory is cheap; touching the real DOM is expensive because it can trigger layout recalculation and repaint, so React does all its "what changed" thinking in memory first and only issues the minimal real DOM operations at the end.

### 3. Walk through what happens when a single piece of state changes, from render to paint.

**Answer:** React re-runs the component function (and any children affected) to produce a new Virtual DOM tree — this is rendering, and it's pure calculation with no DOM contact yet. Reconciliation then diffs that new tree against the previous one to compute a minimal patch list, and the commit phase applies just those changes to the real DOM. Only after commit does the browser actually paint.

### 4. Why does using an array index as a `key` break when a list of cart items gets reordered?

**Answer:** React uses the key to match old and new elements across renders; with an index key, "identity" is really just "position." If the Mouse row (index 0, with a typed-in quantity) and the USB-C Hub row swap positions after a sort, React sees the element at key `0` is still a `CartRow` and reuses its DOM node — including the `<input>`'s current value — while only updating the props, so the quantity ends up attached to the wrong product. A stable key like `item.id` makes the identity travel with the data instead of the array slot.

### 5. When is index-as-key actually fine?

**Answer:** When the list is genuinely static — it never reorders, filters, or has items inserted or removed in the middle — the index and the item's identity never diverge, so there's no mismatch to create. The moment sorting, filtering, deletion, or insertion enters the picture, switch to a key derived from real data identity, like a database ID.

### 6. What problem did Fiber solve that the old stack reconciler couldn't?

**Answer:** The stack reconciler used plain recursive JS function calls to walk the component tree, and a call stack can't be paused mid-execution — so a large update ran synchronously to completion, however long that took, blocking the main thread and freezing input handling or animations. Fiber restructures that same walk as a linked list of small units of work that can be paused after any unit and resumed later.

### 7. Give a concrete scenario where Fiber's interruptibility is visibly the difference between good and bad UX.

**Answer:** A search input filtering a large product grid: typing a character re-renders hundreds of `ProductCard`s, which can take real time. Without Fiber, that render blocks the thread and the next keystroke feels dropped; with Fiber, React can pause the grid re-render mid-flight, prioritize handling the new keystroke, and resume the grid work afterward, so typing stays responsive even while a large re-render is happening in the background.

### 8. Why does Fiber split work into a render phase and a commit phase, and why is only one of them interruptible?

**Answer:** The render phase just builds a new work-in-progress tree and runs component functions and hooks — pure calculation with no visible side effects, so it's safe to pause, discard, or restart. The commit phase actually mutates the real DOM and fires effects; pausing partway through would leave the user looking at a half-applied, visually broken layout, so it always runs synchronously to completion once started.

### 9. What is a Fiber node, structurally?

**Answer:** It's a plain JavaScript object representing one unit of work — one component or DOM element — holding pointers to its child, sibling, and parent fibers (forming a linked-list-style tree), plus an `alternate` pointer to the previous version of itself for diffing, and an effect tag (`PLACEMENT`/`UPDATE`/`DELETION`) recording what changed. That structure is what lets React traverse, pause, and resume the tree without relying on the native call stack.

## Revision Checklist

- [ ] Explain React's rendering model as `UI = f(state)`, and why that makes bugs easier to isolate than imperative DOM code.
- [ ] Explain why diffing plain JS objects (Virtual DOM) is cheaper than direct real-DOM mutation, with layout/repaint cost as the reason.
- [ ] Walk through render -> reconciliation -> commit -> paint as four distinct steps, not one blurred step.
- [ ] Reproduce the cart-reordering-with-index-keys bug and explain exactly why the wrong `<input>` value ends up on the wrong row.
- [ ] State the actual rule for when index-as-key is safe versus when it silently breaks.
- [ ] Explain why the old stack reconciler couldn't be paused, and what specifically Fiber changed structurally to fix that.
- [ ] Give a real scenario (search input + large list) showing why interruptible rendering is a user-visible win, not just a theoretical one.
- [ ] Explain why the commit phase is deliberately synchronous even though the render phase isn't.
