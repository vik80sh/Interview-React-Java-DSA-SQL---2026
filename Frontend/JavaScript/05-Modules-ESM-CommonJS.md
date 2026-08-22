# JavaScript Modules: ESM vs CommonJS

Every senior frontend interview eventually pokes at "why does this import break in Jest but work in the browser" or "why can't I tree-shake this library" — both trace straight back to which module system is loading your code and how. This guide covers the two systems a real production codebase actually mixes: CommonJS in Node tooling and legacy packages, ESM everywhere else.

## 1. CommonJS — Synchronous, Runtime-Resolved

CommonJS (CJS) is the module system Node.js shipped with long before ESM was standardized, and it's still what a huge share of npm packages and Node's own internals use. `require()` is a real function call — it runs synchronously, reads the target file off disk (or from Node's module cache), executes it top to bottom, and returns whatever was assigned to `module.exports`.

```javascript
// db/connectionPool.js
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = { pool };

// services/orderService.js
const { pool } = require('../db/connectionPool');

async function getOrderById(id) {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return rows[0];
}

module.exports = { getOrderById };
```

Because `require` is just a function, you can call it conditionally, inside a `try/catch`, or build the path string at runtime — none of that is legal with static ESM `import`. That flexibility is also CJS's biggest weakness: the engine has no way to know what a module exports without actually running it, which is the root cause of both the tree-shaking gap and the circular-import quirks covered below.

## 2. ECMAScript Modules — Static, Compile-Time-Resolved

ESM is the language-native standard (`import`/`export`), supported in every modern browser and in Node since v12+ (stable without flags since v14, `.mjs` or `"type": "module"` required). The critical difference from CJS is that `import`/`export` declarations must sit at the top level of a file — never inside an `if`, a function body, or a loop — because the engine performs **static analysis**: it parses every module's import/export graph *before executing any module code*, builds the dependency graph, fetches everything, then executes modules in dependency order.

```javascript
// utils/currency.js
export function formatCurrency(amountInCents, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amountInCents / 100);
}

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'INR'];

// components/InvoiceLine.js
import { formatCurrency, SUPPORTED_CURRENCIES } from '../utils/currency.js';

export default function renderInvoiceLine(item) {
    return `${item.description}: ${formatCurrency(item.priceInCents)}`;
}
```

In the browser, `<script type="module">` fetches these over the network asynchronously and non-blocking (deferred by default), which is why ESM is described as async-by-nature even though a single module's body still runs synchronously once it starts.

## 3. Named vs Default Exports and Interop Pitfalls

ESM supports unlimited named exports (`import { a, b }`, names must match) plus at most one default export per file (`import anything from './file'`, freely aliasable). The practical interview trap is mixing this with CJS: Node's ESM loader wraps a CJS module's `module.exports` object as the *default* export when you `import` it from an ESM file, and only does best-effort static detection of named exports via tools like `cjs-module-lexer` — it is not guaranteed for dynamically-built `module.exports`.

```javascript
// legacy-logger.cjs (CommonJS)
module.exports = { info: (msg) => console.log('[INFO]', msg) };

// app.mjs (ESM importing CJS)
import logger from './legacy-logger.cjs';   // whole exports object as default
logger.info('Order placed');                 // works

// import { info } from './legacy-logger.cjs'; // fragile — only works if Node's
                                                // static analyzer can detect it
```

This is exactly why libraries that want to be consumed by both worlds ship **dual packages** (a `main` field for CJS and a `module`/`exports` field for ESM in `package.json`) rather than relying on runtime interop guesses.

## 4. Why ESM Enables Tree-Shaking and CommonJS Doesn't

Tree-shaking is dead-code elimination at the module-graph level: a bundler removes exports that no importing file actually uses. It only works reliably with ESM because `export`/`import` bindings are statically declared — a bundler like Rollup or webpack can build the entire import/export graph *without running any code*, see that, say, `formatCurrency` is imported but `SUPPORTED_CURRENCIES` never is, and delete the latter's code path entirely.

CommonJS can't offer this guarantee because `module.exports` is just a plain object assigned at runtime, potentially built with conditionals, loops, or computed keys:

```javascript
// A perfectly legal CJS module — but statically un-analyzable
function buildExports() {
    const exports = {};
    for (const key of getFeatureFlags()) {
        exports[key] = require(`./features/${key}`);
    }
    return exports;
}
module.exports = buildExports();
```

A bundler has no safe way to know which properties of `module.exports` are used without simulating execution, so it must keep the whole module (and everything it `require`s) intact. This is the concrete reason lodash's CJS build ships ~70KB even if you only call `debounce`, while `import { debounce } from 'lodash-es'` lets a bundler strip everything else.

## 5. Dynamic `import()` for Code-Splitting

Static `import` always loads eagerly at module-graph-resolution time, even for a component the user may never see. Dynamic `import()` is a function that returns a Promise and can be called anywhere — inside a click handler, a route guard, a conditional — making it the standard mechanism for code-splitting. A realistic case: a dashboard has multiple tabs, and one of them renders a chart using a heavy library (e.g., a charting engine that adds several hundred KB). You don't want that cost paid by every user who never opens that tab.

```javascript
// DashboardTabs.js
const tabButtons = document.querySelectorAll('[data-tab]');

tabButtons.forEach((button) => {
    button.addEventListener('click', async () => {
        const tabName = button.dataset.tab;
        showLoadingSpinner(tabName);

        if (tabName === 'analytics') {
            // Only fetched over the network the first time this tab is opened —
            // webpack/Vite emit this as a separate chunk, e.g. analytics.[hash].js
            const { renderRevenueChart } = await import('./charts/revenueChart.js');
            renderRevenueChart(document.getElementById('analytics-panel'), currentDashboardData);
        }

        hideLoadingSpinner(tabName);
        showTab(tabName);
    });
});
```

In a React app the same idea is `React.lazy(() => import('./charts/RevenueChart'))` wrapped in `<Suspense>`. The result under both webpack and Vite is a separate, cacheable chunk that's only requested when the user actually opens the analytics tab — it never inflates the initial bundle, which is the whole point for dashboards with several rarely-visited, heavy tabs.

## 6. Circular Import Gotchas

A circular dependency — module A imports from B, and B imports from A — behaves differently, and more dangerously, depending on the module system, because both systems return a *partial* module while the cycle is still resolving.

In CommonJS, when a `require` cycle is hit, Node returns whatever has been assigned to `module.exports` **so far** — often an empty object — because the required module hasn't finished running yet:

```javascript
// a.js
const b = require('./b');
console.log('b.value at require time:', b.value); // undefined — b.js hasn't set it yet
module.exports = { value: 'from-a' };

// b.js
const a = require('./a');           // a.js is mid-execution; a.exports is still {}
module.exports.value = 'from-b';
console.log('a at require time:', a); // {} — the require above got the *unfinished* exports object

// entry.js
require('./a');
```

In ESM, circular imports are safer because of **live bindings**: the engine hoists all `export` declarations before running any module body, so a circular `import` gets a live reference to a binding that will be filled in once the exporting module's top-level code actually runs — but reading it *before* that assignment executes throws a `ReferenceError` (the binding is in the "temporal dead zone") rather than silently returning `undefined` or a stale value.

```javascript
// counter.js
import { incrementFromLimiter } from './limiter.js';
export let count = 0;
export function increment() { count = incrementFromLimiter(count); }

// limiter.js
import { count } from './counter.js';
export function incrementFromLimiter(current) {
    // Safe as long as this only runs *after* both modules finish their top-level code —
    // calling it during the initial circular load, before counter.js sets count, throws.
    return Math.min(current + 1, 100);
}
```

The practical takeaway for both systems: circular imports are legal but fragile — prefer breaking the cycle by extracting the shared piece (a constants file, a small shared utility) into a third module both sides depend on, rather than depending on execution-order luck.

## 7. Bundler Interop: webpack and Vite Mixing Both Systems

Real projects are never purely one module system — `node_modules` is full of CJS packages, while your own source is written in ESM. Both webpack and Vite (via esbuild/Rollup) solve this by parsing every module regardless of format and normalizing it into their own internal module representation, injecting interop helpers rather than requiring you to pick one system project-wide.

```javascript
// your-app/src/PriceLabel.js — authored ESM
import isEqual from 'lodash.isequal';       // CJS package under the hood
import { formatCurrency } from './utils/currency.js'; // your own ESM module

export default function PriceLabel({ prevPrice, price }) {
    const changed = !isEqual(prevPrice, price);
    return `${formatCurrency(price)}${changed ? ' *' : ''}`;
}
```

webpack compiles this by wrapping the CJS module so `import isEqual from 'lodash.isequal'` resolves to `module.exports` (webpack injects `__esModule`/`__importDefault`-style interop, the same pattern Babel and TypeScript's `esModuleInterop` flag use), while your own ESM files keep their static import graph intact for tree-shaking. Vite goes further at dev time: it serves your ESM source directly to the browser as native ES modules (no bundling needed for fast HMR) while pre-bundling CJS `node_modules` dependencies with esbuild into ESM-compatible chunks up front, because the browser cannot `import` a raw CJS file. In production, Vite hands off to Rollup, which — like webpack — tree-shakes the ESM portions of the graph and treats CJS dependencies as opaque, un-shakeable black boxes. This is precisely why picking `lodash-es` over `lodash`, or a package that explicitly ships an `exports`/`module` ESM entry point, has a measurable bundle-size impact in a real project.

## Interview Questions and Answers

### 1. What is the fundamental difference between how CommonJS and ESM resolve imports?
**Answer:** CommonJS resolves `require()` calls at runtime — the engine literally executes the required file and returns its `module.exports` object at the moment `require` is called, so imports can be conditional. ESM resolves the entire import/export graph statically, before any module body runs, which is why `import` statements must be top-level and why the engine can reason about the graph without executing it.

### 2. Why does ESM enable tree-shaking while CommonJS effectively blocks it?
**Answer:** ESM's `export`/`import` bindings are declared statically, so a bundler can build the full dependency graph and prove which exports are unused without running any code, then delete them. CommonJS's `module.exports` is a plain runtime object that can be built with loops, conditionals, or computed keys, so a bundler cannot safely determine which properties are unused without simulating execution — it has to keep the whole module.

### 3. When would you use dynamic `import()` instead of a static `import`?
**Answer:** Whenever you want to defer loading code until it's actually needed — for example, only fetching a heavy charting library when a user opens an analytics tab on a dashboard, rather than shipping it in the initial bundle. `import()` returns a Promise and can be called from anywhere, including inside an event handler, which static `import` cannot do since it must sit at the top level.

### 4. Explain the "live binding" behavior of ESM imports and how it differs from CommonJS.
**Answer:** In ESM, an imported binding is a live, read-only reference to the actual variable in the exporting module — if the exporting module later reassigns that variable, every importer sees the new value immediately. CommonJS instead copies whatever value existed on `module.exports` at the time `require` ran; later mutations of a primitive value in the source module are invisible to modules that already imported it, unless they imported the containing object and mutated a property on it.

### 5. What actually happens when two ESM modules import each other in a cycle?
**Answer:** The engine hoists both modules' export declarations before running either body, so each side gets a live reference to the other's bindings — but if code from one module executes and immediately reads a binding from the other before that other module's top-level code has run and assigned it, it throws a `ReferenceError` because the binding is still in an uninitialized state. The safe fix in practice is to extract the shared piece both modules need into a separate module they both depend on, breaking the cycle rather than relying on execution order.

### 6. How does importing a CommonJS package from an ESM file actually work under Node and under bundlers?
**Answer:** Node's ESM loader treats the entire CJS `module.exports` object as the default export when you `import` a `.cjs` module, and only exposes named exports if a static-analysis tool like `cjs-module-lexer` can detect them syntactically — it's not guaranteed for dynamically-constructed exports. Bundlers like webpack do the same conceptually: they wrap the CJS module and inject an interop helper so `import x from 'cjsPackage'` resolves correctly, which is the same mechanism behind TypeScript/Babel's `esModuleInterop` flag.

### 7. Why do libraries like lodash ship both a CJS build and an ESM build (`lodash` vs `lodash-es`)?
**Answer:** The CJS build's `module.exports` is a single runtime object, so importing even one function pulls in the whole module because a bundler cannot prove the rest is unused. The ESM build (`lodash-es`) exports each function as a separate static named export, letting Rollup/webpack/esbuild tree-shake away every function you never imported, which materially shrinks the final bundle.

### 8. How do Vite and webpack differ in how they handle ESM vs CommonJS during development versus production?
**Answer:** In dev, Vite serves your own ESM source files directly to the browser as native modules for instant HMR, while pre-bundling CJS `node_modules` dependencies into ESM-compatible chunks with esbuild up front, since browsers can't natively `import` a CJS file. In production, Vite hands off to Rollup, and webpack behaves similarly throughout: both parse every module regardless of source format, tree-shake the ESM portions of the graph, and treat CJS dependencies as opaque, un-shakeable units wrapped with interop helpers.

### 9. Why can't you put a static `import` statement inside an `if` block, and how would you achieve the same effect?
**Answer:** Static `import` must be resolvable at parse time so the engine can build the module graph before executing anything, and an `if` condition is only known at runtime, which would contradict that guarantee — this is enforced as a syntax error, not just a lint rule. To conditionally load a module you use dynamic `import()`, which is a real function call returning a Promise and can legally live inside any runtime branch.

### 10. Give a concrete reason a real project would still need CommonJS support in 2026 despite ESM being the modern standard.
**Answer:** A large share of npm packages, especially older or infrequently-maintained ones, and much of Node's own tooling ecosystem (some Jest transforms, certain build plugins) still ship or expect CJS, so any nontrivial project's dependency tree is guaranteed to include CJS modules. Bundlers and Node's dual-package interop exist specifically because you can't realistically require an entire ecosystem to migrate before you're allowed to ship.

## Revision Checklist

- [ ] Explain CJS `require`/`module.exports` vs ESM `import`/`export` — runtime-resolved vs statically-analyzed, sync vs async loading.
- [ ] Explain why static analysis is what makes tree-shaking possible in ESM and impossible to guarantee in CJS, with the lodash vs lodash-es example.
- [ ] Write a real dynamic `import()` code-splitting example (lazy-loading a dashboard chart tab) and explain the resulting bundler chunk.
- [ ] Walk through a circular import in both CJS (partial `exports` object) and ESM (live binding, temporal dead zone `ReferenceError`), and how to break the cycle.
- [ ] Explain live bindings vs value copies as the answer to "does the imported value update if the source module changes it later."
- [ ] Explain how Node and bundlers interop CJS into ESM (default-export wrapping, `cjs-module-lexer`, `esModuleInterop`).
- [ ] Explain how Vite's dev-server ESM-native serving plus esbuild pre-bundling differs from its production Rollup path, and how webpack compares.
- [ ] Justify why a real dependency tree in 2026 still mixes both module systems rather than being purely ESM.
