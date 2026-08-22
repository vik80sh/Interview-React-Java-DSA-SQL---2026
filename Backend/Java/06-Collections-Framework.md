# Collections Framework (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](../Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. The Big Picture: `Collection` vs `Collections`

Say you're building the backend for an online store. Over the course of one feature you need to: hold a customer's list of `Order` objects, remove duplicate email addresses from an imported contact list before a marketing send, and build a leaderboard of top customers sorted by spend. Three different-sounding problems — but all three are really the same underlying need: "hold a group of objects, and give me a smart way to work with them." Java's Collections Framework is the standard set of ready-built tools for exactly that need, so you're not hand-rolling a resizable array or a lookup table yourself every time.

Two names that look almost identical trip up nearly every beginner (and plenty of interview candidates):

- **`Collection`** — an interface, the root of the framework. `List`, `Set`, and `Queue` all extend it. It's a *type*: something you declare a variable as, or implement.
- **`Collections`** — a utility class full of `static` helper methods that operate *on* collections you already have: `Collections.sort(list)`, `Collections.unmodifiableList(list)`, `Collections.synchronizedList(list)`.

```java
List<Order> orders = new ArrayList<>();      // Collection — the type you're using
Collections.sort(orders, byOrderDate);        // Collections — a static helper acting on it
```

Remember it this way: **`Collection` is a type you implement or extend; `Collections` is a toolbox you call static methods on.** They share almost the same name on purpose (both are part of the same framework), but they are not related by inheritance and don't do the same job.

One more piece of vocabulary that comes up constantly in this file: **Big-O notation**, a shorthand for "how does the work grow as the number of elements grows?" `O(1)` means constant time — the same number of steps whether you have 10 elements or 10 million. `O(n)` means the work grows in direct proportion to the number of elements — twice the elements, twice the work. `O(log n)` means the work grows very slowly as elements are added, because each step eliminates roughly half of what's left to search (this is what a balanced tree gives you). Every collection choice in this file ultimately comes down to which of these numbers you get for the operations you actually perform most.

## 2. List: Ordered, Index-Based Storage

### `ArrayList` — real use case: an order history page

```java
List<Order> recentOrders = new ArrayList<>();
recentOrders.add(order1);
recentOrders.add(order2);
Order latest = recentOrders.get(recentOrders.size() - 1); // O(1) — direct index access
```

An order history page is read constantly (scroll through it, jump to a specific row) and written rarely (a new order gets appended to the end once in a while). `ArrayList` is backed by a plain array under the hood, which is exactly why `get(i)` is `O(1)` — the array already knows where element `i` lives in memory, no searching required. Appending to the end is usually fast too. This makes `ArrayList` the right default for the vast majority of lists you'll write.

### The problem: inserting at the front, a million times

Now picture a different scenario — a task queue where new, higher-priority tasks constantly get pushed to the *front* of the list, and you're storing it in an `ArrayList`:

```java
List<Task> tasks = new ArrayList<>();
for (int i = 0; i < 1_000_000; i++) {
    tasks.add(0, new Task(i)); // insert at index 0 — the FRONT — every single time
}
```

This is dramatically slower than appending, and it's not obvious why until you think about what an array actually is. `ArrayList` stores its elements in one contiguous block, so element 0 must always physically be first. Every time you insert *at* index 0, every existing element has to shift one slot to the right to make room — that's `O(n)` work for a single insert. Do that a million times, with `n` growing each time, and the total cost is roughly `O(n²)` — for a million inserts, that's on the order of a trillion element-shifts, not a million. The list *works*, it's just secretly become the slowest part of your program.

### `LinkedList` and `ArrayDeque` — the fix, and the modern twist

`LinkedList` is a doubly linked list: each element is a separate node holding a value plus pointers to the node before and after it. Inserting or deleting at a position you already have a reference to is `O(1)` — you just relink a couple of pointers, nothing shifts. The trade-off: there's no array to jump into directly, so `get(i)` has to walk the chain from one end, making random access `O(n)`.

```java
Deque<Task> taskQueue = new ArrayDeque<>(); // the actual modern choice for a queue/stack, not LinkedList
taskQueue.addFirst(newUrgentTask);
Task next = taskQueue.pollFirst();
```

Here's the twist that surprises a lot of people: in real production code today, you'll rarely see `LinkedList` actually used. For the common "add/remove from one or both ends" pattern — a queue or a stack — `ArrayDeque` almost always outperforms `LinkedList`, because `LinkedList` pays for a separate object (with two pointers) per element, while `ArrayDeque` is array-backed and avoids that per-node overhead entirely. `LinkedList` still theoretically wins in one specific case: frequent inserts/deletes at *arbitrary* positions in the middle, reached via a `ListIterator` you're already holding — but that pattern is uncommon enough that `LinkedList` shows up in interviews far more than it shows up in real codebases. Know why it exists; reach for `ArrayDeque` when you actually need a queue or stack.

| | `ArrayList` | `LinkedList` |
|---|---|---|
| Structure | Dynamic array | Doubly linked list |
| `get(i)` | O(1) | O(n) |
| Insert/delete in the middle | O(n), shifting | O(1) once you're positioned there |
| Memory overhead | Lower | Higher (node + two pointers per element) |
| Real-world default | Yes | Rare — prefer `ArrayDeque` for queue/stack use |

## 3. Set: When Duplicates Are the Bug

### The problem: deduplicating by hand

Imagine you're deduplicating a bulk email list before a marketing send, and the first instinct is to keep a `List` and check it before every insert:

```java
List<String> recipients = new ArrayList<>();
for (String email : importedContactList) {
    String normalized = email.toLowerCase();
    if (!recipients.contains(normalized)) {   // O(n) — scans the whole list, every single time
        recipients.add(normalized);
    }
}
```

`contains()` on an `ArrayList` has to walk the entire list checking each element with `equals()`. For a list of 100,000 imported contacts, that's up to 100,000 comparisons for *each* new email — another `O(n²)` trap, this time from the "no duplicates" rule instead of the "insert at front" rule.

### `HashSet` — the fix

```java
Set<String> recipients = new HashSet<>();
for (String email : importedContactList) {
    recipients.add(email.toLowerCase()); // duplicates silently collapse to one entry
}
```

**This is exactly what a `Set` answers: a collection that enforces "no duplicates" as a core guarantee, not something you check for yourself.** `HashSet` does it using hashing (the same mechanism `HashMap` uses internally — covered in detail in the next section), giving `O(1)` average `add`/`contains` instead of `O(n)`. It gives up something in exchange: there's no ordering guarantee at all — two runs of the same program can iterate a `HashSet` in different orders. It allows exactly one `null`.

### `LinkedHashSet` — real use case: a "recently viewed products" list with no repeats

Sometimes "no duplicates" isn't enough — you also need the *order things were added* to survive, e.g. a "recently viewed products" list where re-viewing a product shouldn't create a second entry or reset its position:

```java
Set<Long> recentlyViewed = new LinkedHashSet<>();
recentlyViewed.add(productId); // re-adding an existing id doesn't move it or duplicate it
```

`LinkedHashSet` gives the same hashing performance as `HashSet`, plus predictable insertion-order iteration — it's a `HashSet` with a linked list quietly threaded through it to remember order.

### `TreeSet` — real use case: a sorted, deduplicated tag list

For a product-tag list you want to *always* display alphabetically, sorted on every iteration with no extra sort step:

```java
Set<String> tags = new TreeSet<>();
tags.add("electronics");
tags.add("clearance");
tags.add("bestseller");
System.out.println(tags); // [bestseller, clearance, electronics] — always sorted
```

`TreeSet` is backed by a Red-Black Tree (a self-balancing binary search tree), giving `O(log n)` operations in exchange for always iterating in sorted order. It does not allow `null` — sorting requires comparing every element against every other, and there's no natural ordering for `null` against anything.

| | `HashSet` | `LinkedHashSet` | `TreeSet` |
|---|---|---|---|
| Order | None | Insertion order | Sorted |
| Performance | O(1) avg | O(1) avg (slightly more overhead) | O(log n) |
| Null allowed | One | One | None |

## 4. Map: Key-Value Lookups

### The problem: searching a list for a match, every time

Suppose you need to look up a `Product` by its SKU (Stock Keeping Unit — the unique code retailers assign to each distinct item they sell). A first attempt might keep products in a `List` and scan for a match:

```java
Product findBySku(List<Product> products, String sku) {
    for (Product p : products) {
        if (p.getSku().equals(sku)) return p;   // O(n) — scans every product, every lookup
    }
    return null;
}
```

Every single lookup walks the whole catalog. For a large product list, called on every page load, this is a real performance problem.

### `HashMap` — the fix

```java
Map<String, Product> productCache = new HashMap<>();
productCache.put("SKU-100", product);
Product found = productCache.get("SKU-100"); // O(1) average lookup
```

**This is exactly what a `Map` answers: instead of scanning for a match, you go straight to the value using its key.** `HashMap` gives `O(1)` average `get`/`put` by hashing the key directly to a storage location instead of comparing against every entry. It gives no ordering guarantee, allows one `null` key and multiple `null` values, and — important for later — is **not thread-safe**: nothing stops two threads from corrupting its internal structure if they call `put` at the same time.

### How `HashMap` actually finds the right bucket

The `O(1)` lookup isn't magic — here's what `map.put(key, value)` actually does internally:

```text
map.put(key, value)
  1. key.hashCode() is computed and spread/mixed into a bucket index
  2. the bucket at that index is located (a slot in an internal array)
  3. if the bucket is empty, the entry is stored directly
  4. if the bucket already has entries (a collision), equals() checks each one
     for a match; if found, its value is replaced; otherwise the new entry is added
     to that bucket (as a linked list, or — since Java 8 — a Red-Black Tree once a
     single bucket gets crowded enough, turning O(n) worst case into O(log n))
```

This is exactly why `hashCode()` and `equals()` must be kept consistent with each other (covered in [04-Constructors-Equals-HashCode-Keywords.md](04-Constructors-Equals-HashCode-Keywords.md)) — `hashCode()` decides which bucket a key lands in, and `equals()` is what confirms, once inside that bucket, "is this actually the same key, or just a hash collision with a different one?" Get either wrong and lookups either miss entries that should be found, or silently treat two different keys as the same one.

**Load factor** (default `0.75`) is the fill-ratio threshold: once the map's size exceeds `capacity * loadFactor`, it **resizes** (typically doubling capacity) and **rehashes** every existing entry into the new, larger bucket array — because each entry's bucket index depends on the array size, so a bigger array means every entry's bucket index has to be recomputed. This is why bulk-loading a `HashMap` when you already know the final size, via `new HashMap<>(expectedSize)`, avoids repeated resize/rehash churn.

### `LinkedHashMap` — real use case: a bounded LRU cache

Now picture a `HashMap` used as a cache that never evicts anything — it just grows forever and eventually exhausts memory. You need a rule for "when full, throw away the entry nobody's touched in the longest time" — the LRU (Least Recently Used) eviction policy. `LinkedHashMap` does this in a handful of lines:

```java
Map<Long, User> lruUserCache = new LinkedHashMap<>(16, 0.75f, true) { // true = access-order
    @Override
    protected boolean removeEldestEntry(Map.Entry<Long, User> eldest) {
        return size() > 100; // evict the least-recently-used entry once we exceed capacity
    }
};
```

With `accessOrder = true`, `LinkedHashMap` reorders its internal linked list on every `get`, not just every `put`, so the least-recently-touched entry always ends up at the "eldest" end. Overriding `removeEldestEntry` to return `true` once the map grows past capacity is a real, working, bounded LRU cache — and it's a genuinely common interview follow-up to "how would you implement an LRU cache?" because it does exactly what a hand-rolled doubly-linked-list-plus-hash-map implementation does, with far less code.

### `TreeMap` — real use case: a leaderboard sorted by score, or a price-range lookup

`HashMap` has no concept of order, so "who's in the top 3?" or "who scored 1000 or above?" isn't something it can answer without you sorting the entries yourself, every time. A leaderboard that needs to stay sorted by score as entries are added is a direct match for `TreeMap`:

```java
NavigableMap<Integer, String> leaderboard = new TreeMap<>();
leaderboard.put(980, "alice");
leaderboard.put(1200, "bob");
leaderboard.put(1100, "carol");

String topScore = leaderboard.lastEntry().getValue();       // "bob"
var above1000 = leaderboard.tailMap(1000);                   // everyone scoring 1000+, still sorted
```

`TreeMap` keeps its keys sorted at all times (also via a Red-Black Tree), giving `O(log n)` operations and no `null` key, for the same reason `TreeSet` disallows it. `firstKey()`/`lastKey()`/`higherKey()`/`lowerKey()`/`tailMap()` give you range queries a `HashMap` simply has no way to answer.

| | `HashMap` | `LinkedHashMap` | `TreeMap` |
|---|---|---|---|
| Order | None | Insertion (or access, if configured) | Sorted by key |
| Performance | O(1) avg | O(1) avg | O(log n) |
| Null key | One | One | None |
| Real use case | General-purpose lookup cache | LRU cache | Leaderboard, range queries |

## 5. Queue: When Arrival Order Isn't Processing Order

A plain queue processes things FIFO (First In, First Out — whoever joined first gets handled first), which is fine until it isn't. Picture a support ticket system: tickets arrive constantly, but "Server is completely down" filed five minutes ago needs to jump ahead of "Typo on the pricing page" filed an hour ago. Processing strictly by arrival order means the urgent ticket waits behind a pile of trivial ones.

```java
PriorityQueue<Ticket> tickets = new PriorityQueue<>(Comparator.comparing(Ticket::getPriority));
tickets.add(new Ticket("Server down", Priority.CRITICAL));
tickets.add(new Ticket("Typo on page", Priority.LOW));

Ticket next = tickets.poll(); // always returns the highest-priority ticket first, not FIFO
```

**This is exactly what `PriorityQueue` answers: instead of "whoever arrived first," it always hands you "whoever ranks first" according to a rule you supply.** Internally it's a min-heap — a tree-shaped structure where `poll()` always returns the smallest element according to the given `Comparator` (or the natural ordering, via `Comparable`, if none is given) in `O(log n)`. It's the direct real-world tool whenever "process the most urgent thing next" needs to beat "process in arrival order."

## 6. Iterating Safely: Fail-Fast vs Fail-Safe

### The problem: removing an element while looping over the list

Picture cleaning up an order history list by removing cancelled orders, and reaching for the obvious-looking code:

```java
for (Order order : orders) {
    if (order.isCancelled()) {
        orders.remove(order);   // looks fine — throws ConcurrentModificationException at runtime
    }
}
```

This compiles and then blows up at runtime. The reason is subtle enough to be worth walking through slowly: a `for-each` loop is really just an `Iterator` under the hood, and `ArrayList`'s iterator keeps an internal counter of how many structural changes have happened to the list. Calling `orders.remove(order)` directly on the list changes that counter *without the iterator's knowledge*. The very next time the iterator advances, it checks that counter, notices it doesn't match what the iterator expects, and throws `ConcurrentModificationException` rather than risk silently skipping an element or returning an inconsistent view of the list. `ArrayList` (and most standard collections) are called **fail-fast** for exactly this behavior: they detect an unexpected structural change mid-iteration and fail loudly and immediately, instead of limping along with possibly-corrupted results.

### The fix: remove through the iterator itself

```java
Iterator<Order> it = orders.iterator();
while (it.hasNext()) {
    Order order = it.next();
    if (order.isCancelled()) {
        it.remove(); // the ONLY safe way to remove while iterating a fail-fast collection
    }
}
```

`Iterator.remove()` updates the iterator's own bookkeeping at the same time it removes the element, so there's no mismatch to detect — this is the one form of "modify while iterating" that fail-fast collections are explicitly built to allow.

`ListIterator` extends `Iterator` with two extra abilities — walking backward, and replacing an element in place with `set()` — but it only exists for `List` types, not `Set` or `Map`:

```java
ListIterator<String> li = names.listIterator();
while (li.hasNext()) {
    String name = li.next();
    if (name.isBlank()) li.set("UNKNOWN"); // in-place replace, List-only capability
}
```

### Fail-safe: the opposite trade-off

Some collections — `ConcurrentHashMap`'s iterator, or `CopyOnWriteArrayList` — are called **fail-safe**: they tolerate concurrent modification and simply never throw `ConcurrentModificationException`, typically by iterating over a snapshot of the data taken at the start, or by copying the underlying array on every write. The cost is the flip side of the benefit: because you may be iterating a snapshot, the iteration might not reflect changes made to the collection while it's running. Fail-fast trades availability for an early, loud signal that something unexpected happened mid-iteration; fail-safe trades a strict, always-current view for a guarantee that iterating will never throw.

## 7. Sorting Real Objects: Comparable vs Comparator

### The problem: "sorted" needs a rule, and sometimes more than one rule

`Collections.sort(employees)` — sorted by what? Name? Salary? Hire date? A list has no inherent sort order; something has to define one.

```java
class Employee implements Comparable<Employee> {
    String name;
    BigDecimal salary;

    @Override
    public int compareTo(Employee other) {
        return this.salary.compareTo(other.salary); // the ONE "natural" ordering for Employee
    }
}

Collections.sort(employees); // uses compareTo() automatically
```

**This is exactly what `Comparable` answers: a class defines its own single, built-in "natural" ordering, once, inside itself.** It's the right tool when there's one obvious default for the whole class — salary for a payroll report, price for a product catalog.

### The problem returns: what about a *second* screen that needs a different order?

Payroll wants employees sorted by salary. The company directory page wants the exact same `Employee` objects sorted alphabetically by name instead. You can't give `Employee` two `compareTo()` methods, and you don't want to touch the class just to add a one-off sort for a single screen.

```java
Comparator<Employee> byNameThenSalaryDesc =
    Comparator.comparing((Employee e) -> e.name)
              .thenComparing(Comparator.comparing((Employee e) -> e.salary).reversed());

employees.sort(byNameThenSalaryDesc);
```

**This is exactly what `Comparator` answers: an ordering rule that lives outside the class, as its own object, so you can define as many different orderings as you need without modifying the class at all.** `Comparator.comparing(...).thenComparing(...)` chains multiple sort keys together (name first, salary descending as a tiebreaker) — something a single `compareTo()` can't express as cleanly.

| | `Comparable` | `Comparator` |
|---|---|---|
| Defined | Inside the class (`compareTo`) | As a separate object (`compare`) |
| How many orderings | One "natural" ordering per class | As many as you need |
| Modifies the class? | Yes | No |

## 8. Putting It All Together: Comparison Table and Thread Safety

| Feature | `ArrayList` | `LinkedList` | `HashMap` | `HashSet` | `TreeMap`/`TreeSet` |
|---|---|---|---|---|---|
| Internal structure | Dynamic array | Doubly linked list | Hash table | Hash table (backed by a `HashMap`) | Red-Black Tree |
| Ordering | Insertion | Insertion | None | None | Sorted |
| Duplicates | Allowed | Allowed | Unique keys | Not allowed | Unique |
| Random access | O(1) | O(n) | O(1) avg by key | N/A | O(log n) |
| Insert/delete | O(n) middle | O(1) at a known node | O(1) avg | O(1) avg | O(log n) |
| Thread-safe | No | No | No | No | No |

That last row is worth sitting with: **none of the standard collections used throughout this file are thread-safe.** Two threads calling `add` on the same `ArrayList`, or `put` on the same `HashMap`, at the same time can corrupt internal state or silently lose an update — there's no locking or coordination built in, by design, because that coordination costs performance that a single-threaded use case shouldn't have to pay for.

When you genuinely need concurrent access, the legacy answer is `Vector`/`Hashtable` — synchronized on every single call, which is rarely the right pick today since it serializes access even when it isn't necessary. `Collections.synchronizedList(...)`/`synchronizedMap(...)` wraps an existing collection with a single lock — better, but still one lock for the whole structure, so concurrent threads still queue up behind each other. The actual modern default is `ConcurrentHashMap`, `CopyOnWriteArrayList`, and the rest of `java.util.concurrent`, which partition or avoid locking far more cleverly — covered in full in the [Multithreading guide](08-Multithreading-Concurrency.md).

## Interview Questions and Answers

### 1. What's the difference between `Collection` and `Collections`?

**Answer:** `Collection` is an interface — the root of the framework, extended by `List`, `Set`, and `Queue`. `Collections` is an unrelated static utility class offering helper methods like `sort`, `unmodifiableList`, and `synchronizedList` that operate on collections you already have. One is a type; the other is a toolbox.

### 2. `ArrayList` vs `LinkedList` — how would you actually decide, in a real system?

**Answer:** `ArrayList` for anything read-heavy with occasional appends, which covers most real lists (order history, search results) — `get(i)` is `O(1)` and appends are cheap. `LinkedList` only in the rare case of genuinely frequent inserts/deletes at arbitrary positions via an iterator — and even then, `ArrayDeque` usually beats it for the common queue/stack shape, since it avoids the per-node object overhead a linked list pays for.

**Follow-up:** Why is inserting at index 0 of a large `ArrayList` a million times so slow? Every insert at the front has to shift every existing element one slot to the right, so a single insert is `O(n)` and a million of them is roughly `O(n²)` — the fix is a `LinkedList` or `ArrayDeque`, where inserting at an end is `O(1)`.

### 3. How would you implement a bounded LRU cache with minimal code?

**Answer:** A `LinkedHashMap` constructed with `accessOrder = true`, overriding `removeEldestEntry` to return `true` once the map exceeds the desired capacity. That's a complete, correct LRU (Least Recently Used) cache without hand-rolling a doubly-linked list plus hash map.

### 4. Why is `HashMap` not thread-safe, and what would you use instead in a multithreaded service?

**Answer:** Concurrent `put`/resize operations can corrupt its internal bucket structure or lose updates, since there's no internal locking or coordination. `ConcurrentHashMap` is the standard real-world replacement — it partitions locking so concurrent reads and writes on different keys don't block each other, unlike wrapping a `HashMap` with `Collections.synchronizedMap`, which serializes every access behind one lock.

### 5. Walk through what happens internally on `map.put(key, value)`.

**Answer:** `key.hashCode()` is computed and mixed into a bucket index. If that bucket is empty, the entry is stored directly. If not (a collision), `equals()` checks existing entries in that bucket for a match — replacing the value if found, or adding a new entry to the bucket (a linked list, or a Red-Black Tree if that bucket has grown large enough, since Java 8) if not.

### 6. What is the load factor, and why does it matter for performance?

**Answer:** It's the fill-ratio threshold (default `0.75`) at which the map resizes (typically doubling capacity) and rehashes every entry into the new bucket array, because each entry's bucket index depends on the array's size. Resizing is `O(n)`, so repeated resizes during a large bulk load are wasted work — pre-sizing the map with `new HashMap<>(expectedSize)` avoids that churn.

### 7. Why does removing an element with `list.remove(element)` inside a `for-each` loop throw `ConcurrentModificationException`?

**Answer:** `ArrayList`'s iterator is fail-fast: it tracks a modification count and checks it on every `next()` call. Removing directly on the list (not through the iterator) bumps that count out from under the iterator, and the iterator throws rather than risk returning an inconsistent view. The fix is `iterator.remove()`, which keeps the iterator's own bookkeeping in sync.

### 8. What's the difference between fail-fast and fail-safe iteration?

**Answer:** Fail-fast collections (`ArrayList`, `HashMap`, and most standard collections) detect an unexpected structural change mid-iteration and throw `ConcurrentModificationException` immediately. Fail-safe collections (`ConcurrentHashMap`'s iterator, `CopyOnWriteArrayList`) tolerate concurrent modification without throwing, typically by iterating a snapshot — the trade-off is the iteration might not reflect changes made while it's running.

### 9. Comparable vs Comparator — when do you reach for each?

**Answer:** `Comparable` (via `compareTo`) when a class has one obvious natural ordering that belongs to the class itself, like sorting employees by salary for payroll. `Comparator` when you need a different, situational ordering — sorting the same employees by name for a directory screen — without modifying the class, and you can have as many `Comparator`s as you need.

### 10. Why does `TreeMap`/`TreeSet` not allow a `null` key, while `HashMap`/`HashSet` allow one?

**Answer:** A `TreeMap`/`TreeSet` needs to compare every key to maintain sorted order, and comparing `null` against anything throws `NullPointerException` — there's no natural ordering for `null`. `HashMap`/`HashSet` only need `hashCode()`/`equals()`, and `null` is handled as a special case internally, so one `null` key is allowed.

### 11. Why should `PriorityQueue` not be treated as a regular queue?

**Answer:** `poll()` doesn't return the element that's been waiting longest — it returns the smallest element according to the given `Comparator` (or natural ordering via `Comparable`), backed by a min-heap. It's the right tool specifically when "most urgent/most important next" should beat strict arrival order, like processing support tickets by severity instead of FIFO (First In, First Out).

## Revision Checklist

- [ ] Explain the `Collection` vs `Collections` naming trap in one sentence each.
- [ ] Explain Big-O in plain terms (`O(1)`, `O(n)`, `O(log n)`) well enough to justify why a collection choice matters.
- [ ] Walk through why inserting at the front of a large `ArrayList` repeatedly is slow, and which structure fixes it.
- [ ] Pick the right collection for a stated real scenario (cache, leaderboard, dedup list, priority processing) and justify it.
- [ ] Implement an LRU cache with `LinkedHashMap` and explain `removeEldestEntry`.
- [ ] Explain `HashMap` internals: hashing, buckets, collisions, load factor, resize/rehash, and Java 8 treeification.
- [ ] Explain fail-fast vs fail-safe iteration and the correct way to remove elements while iterating.
- [ ] Decide between `Comparable` and `Comparator` for a real sorting requirement.
- [ ] Name which standard collections are thread-safe (none of the common ones) and what to use instead.
