# Collections Framework

Almost every Java interview leans hard on this topic because almost every real backend decision — "how do I cache this," "how do I dedupe this," "how do I keep a leaderboard sorted" — is really a "which collection do I reach for" decision. This guide picks a concrete real-world use case for each implementation instead of a bare feature list.

## 1. Collection vs Collections

- **`Collection`** (interface, `java.util`) — the root interface of the framework; `List`, `Set`, and `Queue` all extend it. Represents "a group of objects."
- **`Collections`** (utility class) — static helper methods: `Collections.sort(list)`, `Collections.unmodifiableList(list)`, `Collections.synchronizedList(list)`.

One is a type you implement/extend; the other is a toolbox you call static methods on.

## 2. List — Ordered, Index-Based, Allows Duplicates

### ArrayList — real use case: an order history page

```java
List<Order> recentOrders = new ArrayList<>();
recentOrders.add(order1);
recentOrders.add(order2);
Order latest = recentOrders.get(recentOrders.size() - 1); // O(1) — direct index access
```

Backed by a dynamic array. **Fast random-access reads** (`get(i)` is O(1)); **slow inserts/deletes in the middle** (O(n), because everything after the gap must shift). This is exactly why it fits an order-history list you mostly read and rarely reorder.

### LinkedList — real use case: rare in practice; know it, but reach for `ArrayDeque` instead

```java
Deque<Task> taskQueue = new ArrayDeque<>(); // the actual modern choice for a queue/stack, not LinkedList
taskQueue.addLast(newTask);
Task next = taskQueue.pollFirst();
```

`LinkedList` is a doubly-linked list: O(1) insert/delete at known positions, O(n) random access (it must walk the chain). In modern production code, `ArrayDeque` almost always outperforms `LinkedList` for queue/stack use because it avoids per-node object overhead — `LinkedList` shows up in interviews far more than it shows up in real codebases today, but you're still expected to know why it exists and when it theoretically wins (frequent insert/delete at arbitrary positions via an `Iterator`, not just the ends).

| | `ArrayList` | `LinkedList` |
|---|---|---|
| Structure | Dynamic array | Doubly linked list |
| `get(i)` | O(1) | O(n) |
| Insert/delete in the middle | O(n), shifting | O(1) once you're positioned there |
| Memory overhead | Lower | Higher (node + two pointers per element) |
| Real-world default | Yes | Rare — prefer `ArrayDeque` for queue/stack use |

## 3. Set — No Duplicates

### HashSet — real use case: deduplicating a bulk email list before sending

```java
Set<String> recipients = new HashSet<>();
for (String email : importedContactList) {
    recipients.add(email.toLowerCase()); // duplicates silently collapse to one entry
}
```

No ordering guarantee, backed by hashing, O(1) average add/contains. Allows one `null`.

### LinkedHashSet — real use case: deduplicating while preserving the original order (e.g. a "recently viewed products" list with no repeats)

```java
Set<Long> recentlyViewed = new LinkedHashSet<>();
recentlyViewed.add(productId); // re-adding an existing id doesn't move it or duplicate it
```

Same hashing performance as `HashSet`, plus insertion-order iteration.

### TreeSet — real use case: a sorted, deduplicated tag list to display alphabetically

```java
Set<String> tags = new TreeSet<>();
tags.add("electronics");
tags.add("clearance");
tags.add("bestseller");
System.out.println(tags); // [bestseller, clearance, electronics] — always sorted
```

Backed by a Red-Black Tree — O(log n) operations, always iterates in sorted order, does not allow `null`.

| | `HashSet` | `LinkedHashSet` | `TreeSet` |
|---|---|---|---|
| Order | None | Insertion order | Sorted |
| Performance | O(1) avg | O(1) avg (slightly more overhead) | O(log n) |
| Null allowed | One | One | None |

## 4. Map — Key-Value Pairs, Unique Keys

### HashMap — real use case: an in-memory product-by-SKU lookup cache

```java
Map<String, Product> productCache = new HashMap<>();
productCache.put("SKU-100", product);
Product found = productCache.get("SKU-100"); // O(1) average lookup
```

No ordering, one `null` key allowed, multiple `null` values allowed, **not thread-safe**.

### LinkedHashMap — real use case: a simple bounded LRU cache

```java
Map<Long, User> lruUserCache = new LinkedHashMap<>(16, 0.75f, true) { // true = access-order
    @Override
    protected boolean removeEldestEntry(Map.Entry<Long, User> eldest) {
        return size() > 100; // evict the least-recently-used entry once we exceed capacity
    }
};
```

This is a real, working LRU cache in about five lines, and a genuinely common interview follow-up to "how would you implement an LRU cache?" — `LinkedHashMap`'s access-order mode plus `removeEldestEntry` does exactly what a hand-rolled doubly-linked-list-plus-hashmap LRU implementation does, with far less code.

### TreeMap — real use case: a leaderboard sorted by score, or a price-range lookup

```java
NavigableMap<Integer, String> leaderboard = new TreeMap<>();
leaderboard.put(980, "alice");
leaderboard.put(1200, "bob");
leaderboard.put(1100, "carol");

String topScore = leaderboard.lastEntry().getValue();       // "bob"
var above1000 = leaderboard.tailMap(1000);                   // everyone scoring 1000+, still sorted
```

Sorted by key, O(log n) operations, no `null` key. `firstKey()`/`lastKey()`/`higherKey()`/`lowerKey()` give you range queries a `HashMap` simply cannot do.

| | `HashMap` | `LinkedHashMap` | `TreeMap` |
|---|---|---|---|
| Order | None | Insertion (or access, if configured) | Sorted by key |
| Performance | O(1) avg | O(1) avg | O(log n) |
| Null key | One | One | None |
| Real use case | General-purpose lookup cache | LRU cache | Leaderboard, range queries |

### How HashMap actually works internally

```text
map.put(key, value)
  1. key.hashCode() is computed and spread/mixed into a bucket index
  2. the bucket at that index is located (an array slot)
  3. if the bucket is empty, the entry is stored directly
  4. if the bucket already has entries (a collision), equals() checks each one
     for a match; if found, its value is replaced; otherwise the new entry is added
     to that bucket (as a linked list, or — since Java 8 — a Red-Black Tree once a
     single bucket gets crowded enough, turning O(n) worst case into O(log n))
```

- **Load factor** (default `0.75`) is the fill-ratio threshold: once the map's size exceeds `capacity * loadFactor`, it **resizes** (doubles capacity) and **rehashes** every existing entry into the new, larger bucket array. This is why bulk-loading a `HashMap` you know the final size of ahead of time with `new HashMap<>(expectedSize)` avoids repeated resize/rehash churn.
- This is exactly why `hashCode()` and `equals()` must be consistent (Section 2 of the [Constructors/equals/hashCode guide](04-Constructors-Equals-HashCode-Keywords.md)) — the bucket is chosen by `hashCode()`, and `equals()` is what actually confirms "is this the same key" once inside that bucket.

## 5. Queue

### PriorityQueue — real use case: processing support tickets by urgency, not arrival order

```java
PriorityQueue<Ticket> tickets = new PriorityQueue<>(Comparator.comparing(Ticket::getPriority));
tickets.add(new Ticket("Server down", Priority.CRITICAL));
tickets.add(new Ticket("Typo on page", Priority.LOW));

Ticket next = tickets.poll(); // always returns the highest-priority ticket first, not FIFO
```

A `PriorityQueue` is a min-heap by default (`poll()` returns the smallest according to the given `Comparator`, or natural ordering if none is given) — not a regular FIFO queue. It's the direct real-world tool whenever "process the most urgent thing next" beats "process in arrival order."

## 6. Iterator, ListIterator, and Fail-Fast vs Fail-Safe

```java
Iterator<Order> it = orders.iterator();
while (it.hasNext()) {
    Order order = it.next();
    if (order.isCancelled()) {
        it.remove(); // the ONLY safe way to remove while iterating a fail-fast collection
    }
}
```

Trying `orders.remove(order)` directly inside a `for-each` loop over an `ArrayList` throws `ConcurrentModificationException` — `ArrayList`'s iterator is **fail-fast**: it detects the underlying list was structurally modified mid-iteration (by anything other than the iterator's own `remove()`) and throws immediately rather than risk returning inconsistent data.

`ListIterator` extends `Iterator` with backward traversal and in-place `set()`/`add()`, but only exists for `List` types (not `Set`/`Map`):

```java
ListIterator<String> li = names.listIterator();
while (li.hasNext()) {
    String name = li.next();
    if (name.isBlank()) li.set("UNKNOWN"); // in-place replace, List-only capability
}
```

**Fail-safe** collections (like `ConcurrentHashMap`'s iterator, or `CopyOnWriteArrayList`) iterate over a snapshot or otherwise tolerate concurrent modification without throwing — but that also means the iteration might not reflect changes made during it. Fail-fast trades availability for an early, loud signal that something unexpected happened; fail-safe trades a strict up-to-date view for never throwing.

## 7. Comparable vs Comparator — Sorting a Real Domain Object

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

`Comparable` defines a single, natural ordering built into the class itself — reasonable when there's one obvious default (salary for payroll sorting, price for a product catalog). The moment you need a *different* sort for a *different* screen — the same `Employee` list sorted by name for a directory page — you need a `Comparator` instead, without touching the `Employee` class:

```java
Comparator<Employee> byNameThenSalaryDesc =
    Comparator.comparing((Employee e) -> e.name)
              .thenComparing(Comparator.comparing((Employee e) -> e.salary).reversed());

employees.sort(byNameThenSalaryDesc);
```

| | `Comparable` | `Comparator` |
|---|---|---|
| Defined | Inside the class (`compareTo`) | As a separate object (`compare`) |
| How many orderings | One "natural" ordering per class | As many as you need |
| Modifies the class? | Yes | No |

## 8. Collections Comparison Table

| Feature | `ArrayList` | `LinkedList` | `HashMap` | `HashSet` | `TreeMap`/`TreeSet` |
|---|---|---|---|---|---|
| Internal structure | Dynamic array | Doubly linked list | Hash table | Hash table (backed by a `HashMap`) | Red-Black Tree |
| Ordering | Insertion | Insertion | None | None | Sorted |
| Duplicates | Allowed | Allowed | Unique keys | Not allowed | Unique |
| Random access | O(1) | O(n) | O(1) avg by key | N/A | O(log n) |
| Insert/delete | O(n) middle | O(1) at a known node | O(1) avg | O(1) avg | O(log n) |
| Thread-safe | No | No | No | No | No |

**Thread safety note:** none of the standard collections above are thread-safe. Real thread-safe choices are `Vector`/`Hashtable` (legacy, synchronized on every call, rarely the right pick today), `Collections.synchronizedList(...)`/`synchronizedMap(...)` (wraps with a single lock), or — the actual modern default — `ConcurrentHashMap`, `CopyOnWriteArrayList`, and the rest of `java.util.concurrent`, covered in the [Multithreading guide](08-Multithreading-Concurrency.md).

## Interview Questions and Answers

### 1. `ArrayList` vs `LinkedList` — how would you actually decide, in a real system?

**Answer:** `ArrayList` for anything read-heavy with occasional appends, which covers most real lists (order history, search results). `LinkedList` only when you have genuinely frequent inserts/deletes at arbitrary positions via an iterator — and even then, `ArrayDeque` usually beats it for the common queue/stack shape, since it avoids per-node object overhead.

### 2. How would you implement a bounded LRU cache with minimal code?

**Answer:** A `LinkedHashMap` constructed with `accessOrder = true`, overriding `removeEldestEntry` to return `true` once the map exceeds the desired capacity. That's a complete, correct LRU cache without hand-rolling a doubly-linked list plus hash map.

### 3. Why is `HashMap` not thread-safe, and what would you use instead in a multithreaded service?

**Answer:** Concurrent `put`/`resize` operations can corrupt its internal bucket structure or lose updates, since there's no internal locking or coordination. `ConcurrentHashMap` is the standard real-world replacement — it partitions locking so concurrent reads and writes on different keys don't block each other, unlike wrapping a `HashMap` with `Collections.synchronizedMap`, which serializes every access behind one lock.

### 4. Walk through what happens internally on `map.put(key, value)`.

**Answer:** `key.hashCode()` is computed and mixed into a bucket index. If that bucket is empty, the entry is stored directly. If not (a collision), `equals()` checks existing entries in that bucket for a match — replacing the value if found, or adding a new entry to the bucket (a linked list, or a Red-Black Tree if that bucket has grown large enough, since Java 8) if not.

### 5. What is the load factor, and why does it matter for performance?

**Answer:** It's the fill-ratio threshold (default `0.75`) at which the map resizes (typically doubling capacity) and rehashes every entry into the new bucket array. Resizing is O(n), so repeated resizes during a large bulk load are wasted work — pre-sizing the map with the expected element count avoids that churn.

### 6. Why does removing an element with `list.remove(element)` inside a `for-each` loop throw `ConcurrentModificationException`?

**Answer:** `ArrayList`'s iterator is fail-fast: it tracks a modification count and checks it on every `next()` call. Removing directly on the list (not through the iterator) bumps that count out from under the iterator, and the iterator throws rather than risk returning an inconsistent view. The fix is `iterator.remove()`, which keeps the iterator's own bookkeeping in sync.

### 7. Comparable vs Comparator — when do you reach for each?

**Answer:** `Comparable` (via `compareTo`) when a class has one obvious natural ordering that belongs to the class itself, like sorting employees by salary for payroll. `Comparator` when you need a different, situational ordering — sorting the same employees by name for a directory screen — without modifying the class, and you can have as many `Comparator`s as you need.

### 8. Why does `TreeMap`/`TreeSet` not allow a `null` key, while `HashMap`/`HashSet` allow one?

**Answer:** A `TreeMap`/`TreeSet` needs to compare every key to maintain sorted order, and comparing `null` against anything throws `NullPointerException` (there's no natural ordering for `null`). `HashMap`/`HashSet` only need `hashCode()`/`equals()`, and `null` is handled as a special case internally, so one `null` key is allowed.

## Revision Checklist

- [ ] Pick the right collection for a stated real scenario (cache, leaderboard, dedup list, priority processing) and justify it.
- [ ] Implement an LRU cache with `LinkedHashMap` and explain `removeEldestEntry`.
- [ ] Explain `HashMap` internals: hashing, buckets, collisions, load factor, resize/rehash, and Java 8 treeification.
- [ ] Explain fail-fast vs fail-safe iteration and the correct way to remove elements while iterating.
- [ ] Decide between `Comparable` and `Comparator` for a real sorting requirement.
- [ ] Name which standard collections are thread-safe (none of the common ones) and what to use instead.
