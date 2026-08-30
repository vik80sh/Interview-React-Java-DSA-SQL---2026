# DSA Complete Cheat Sheet (Non-DP)

The whole-DSA companion to [07-DP-Quick-Revision-Cheatsheet.md](07-DP-Quick-Revision-Cheatsheet.md) — same format, everything else: two pointers, sliding window, prefix sum, linked lists, trees, graphs, backtracking, binary search, greedy, stacks/monotonic stack, heaps, and hash maps. Every problem gets **the problem stated in plain English**, a real example, the one tip that unlocks it, and the pattern it belongs to, so this one file is enough to re-read before an interview. This file plus 07 together cover every one of the 73 problems in [05-LeetCode-Study-Plan.md](05-LeetCode-Study-Plan.md) — 90+ problems here, ~50 more in 07's DP coverage. For deeper explanation of any pattern, see [02-Arrays-Strings.md](02-Arrays-Strings.md), [03-Trees-Graphs-LinkedLists.md](03-Trees-Graphs-LinkedLists.md), and [04-DP-Backtracking.md](04-DP-Backtracking.md) — this file is the fast recall layer on top of those, and DP itself lives entirely in files 06/07, not repeated here.

## The One Table — Scan This First

| Category | Recognize it when... | Core trick |
|---|---|---|
| Two Pointers | Sorted array, or "pair/triplet summing to X" | Move two indices toward or away from each other based on a comparison |
| Sliding Window | "Longest/shortest/max substring or subarray with a condition" | Expand the window right, shrink from the left when the condition breaks |
| Prefix Sum | "Range sum," "subarray sum equals K," repeated range queries | Precompute cumulative sums; a range sum is one subtraction |
| Linked List | Node-based list, "reverse," "cycle," "merge," "Nth from end" | Dummy head node + fast/slow pointers solve most of this family |
| Trees | Hierarchical, "traverse," "path," "ancestor," "balanced" | Recursion is the default; know when it's pre/in/post-order vs BFS |
| Graphs | Nodes + edges, "connected," "shortest path," "cycle," "islands" | DFS for exploration/components, BFS for shortest unweighted path |
| Backtracking | "Generate all," "every combination/arrangement," constraint puzzles | Choose → Explore → Unchoose, prune early |
| Binary Search | Sorted data, OR "find the minimum X such that condition(X) holds" | Search on the ANSWER, not just the array, once you spot the second form |
| Greedy | "Minimum number of X," intervals, always-locally-best choice provably works | Sort first, then make one pass taking the obviously-best local choice |
| Stack / Monotonic Stack | "Next greater/smaller," matching brackets, histogram-shaped problems | Push while helpful, pop while the top is now useless |
| Heap / Priority Queue | "Kth largest/smallest," "top K," "merge K sorted," scheduling | Maintain a heap of exactly the size you need; never sort the whole thing |
| Hash Map / Array | "Have I seen this before," "count occurrences," "group by a derived key" | A hash map turns an O(n) or O(n log n) search/sort into an O(1) lookup |

---

## 1. Two Pointers — "move toward or away from each other"

### 1. Two Sum II (sorted input)
- **Problem:** Given a SORTED array and a target, find the indices of two numbers that add up to the target.
- **Example:** `[2,7,11,15]`, target `9` → `[1,2]` (indices of 2 and 7)
- **Tip:** since the array is sorted, if the current pair's sum is too small move the left pointer right; too big, move the right pointer left.
- **Pattern:** classic converging two pointers, O(n), no extra space — contrast with unsorted Two Sum, which needs a hash map instead.

### 2. 3Sum
- **Problem:** Given an array, find every unique triplet of numbers that sums to zero.
- **Example:** `[-1,0,1,2,-1,-4]` → `[[-1,-1,2],[-1,0,1]]`
- **Tip:** sort first, then fix one number and run the Two Sum II two-pointer scan on the rest — skip duplicate values at each level to avoid duplicate triplets.
- **Pattern:** two pointers nested inside a single outer loop, O(n²).

### 3. Container With Most Water
- **Problem:** Given the heights of vertical lines at each index, choose two lines that, together with the x-axis, form a container holding the most water.
- **Example:** `[1,8,6,2,5,4,8,3,7]` → `49`
- **Tip:** start with the widest possible container (both ends); the shorter wall is always the bottleneck, so move THAT pointer inward — moving the taller one can never improve the area.
- **Pattern:** two pointers narrowing from the outside in, guided by "which side is currently limiting me."

### 4. Trapping Rain Water
- **Problem:** Given an elevation map (a bar height at each index), compute how much rainwater it can trap between the bars after it rains.
- **Example:** `[0,1,0,2,1,0,1,3,2,1,2,1]` → `6`
- **Tip:** water trapped at index `i` is `min(maxLeft[i], maxRight[i]) - height[i]` — track the running max from both sides with two pointers instead of precomputing two full arrays.
- **Pattern:** two pointers with running "best seen so far" state on each side.

### 5. Valid Palindrome
- **Problem:** Determine whether a string is a palindrome, considering only alphanumeric characters and ignoring case.
- **Example:** `"A man, a plan, a canal: Panama"` → `true`
- **Tip:** one pointer from each end, skip non-alphanumeric characters, compare lowercase — no need to build a cleaned copy of the string first.
- **Pattern:** simple converging two pointers with a skip condition.

### 6. Sort Colors (Dutch National Flag)
- **Problem:** Given an array containing only the values 0, 1, and 2 (representing colors), sort it in place in one pass without using a separate counting or full-sort step.
- **Example:** `[2,0,2,1,1,0]` → `[0,0,1,1,2,2]`
- **Tip:** THREE pointers — `low` (boundary for 0s), `mid` (current), `high` (boundary for 2s) — swap and advance based on the value at `mid`, in one single pass.
- **Pattern:** three-pointer partitioning, O(n) one pass, no counting/sorting needed.

### 7. Remove Duplicates from Sorted Array
- **Problem:** Given a sorted array, remove the duplicates in place so each element appears only once, and return the count of unique elements.
- **Example:** `[0,0,1,1,1,2,2,3,3,4]` → `5` (array becomes `[0,1,2,3,4,...]`, return the count of uniques)
- **Tip:** a "write pointer" only advances (and copies the current value into place) when it differs from the last written value — everything before it stays sorted and deduplicated in place.
- **Pattern:** two pointers where one reads and one writes, compacting the array without extra space.

### 8. Merge Sorted Array
- **Problem:** Given two sorted arrays, merge the second one into the first in place — the first array has enough extra trailing space to hold both.
- **Example:** `nums1=[1,2,3,0,0,0]` (m=3), `nums2=[2,5,6]` (n=3) → `[1,2,2,3,5,6]`
- **Tip:** merge from the BACK, not the front — `nums1` has empty trailing space, so filling it end-to-start avoids ever overwriting a `nums1` value you still need to compare.
- **Pattern:** reverse two-pointer merge, the in-place variant of Merge Two Sorted Lists.

## 2. Sliding Window — "expand right, shrink left when broken"

### 9. Maximum Sum Subarray of Size K (fixed window)
- **Problem:** Find the maximum sum of any contiguous subarray of exactly size `K`.
- **Example:** `[2,1,5,1,3,2]`, `k=3` → `9` (`[5,1,3]`)
- **Tip:** slide the window by adding the new right element and subtracting the element that just fell off the left — never re-sum the whole window.
- **Pattern:** fixed-size window, O(n).

### 10. Longest Substring Without Repeating Characters
- **Problem:** Find the length of the longest substring of a given string that contains no repeating characters.
- **Example:** `"abcabcbb"` → `3` (`"abc"`)
- **Tip:** expand right; the moment the new character is already in the window, shrink from the left until the duplicate is gone. A hash map of `char → last seen index` lets you jump the left pointer directly instead of stepping one at a time.
- **Pattern:** variable-size window, grows and shrinks based on a validity condition.

### 11. Minimum Window Substring
- **Problem:** Find the smallest substring of `s` that contains every character of `t` (including repeats of the same character).
- **Example:** `s="ADOBECODEBANC"`, `t="ABC"` → `"BANC"`
- **Tip:** expand right until the window contains every character of `t` (tracked via a count map), then shrink from the left as much as possible while still valid, recording the smallest valid window seen.
- **Pattern:** variable window with a "have I satisfied the full requirement yet" counter, not just a set-membership check.

### 12. Longest Substring with At Most K Distinct Characters
- **Problem:** Find the length of the longest substring that contains at most `K` distinct characters.
- **Example:** `"eceba"`, `k=2` → `3` (`"ece"`)
- **Tip:** identical shape to "Without Repeating Characters," except the shrink condition is "distinct count `> k`" instead of "duplicate found."
- **Pattern:** variable window keyed on a frequency map's size, not its contents.

### 13. Sliding Window Maximum
- **Problem:** Given an array and a window size `k`, return the maximum value inside each position of the window as it slides across the whole array.
- **Example:** `[1,3,-1,-3,5,3,6,7]`, `k=3` → `[3,3,5,5,6,7]`
- **Tip:** a monotonic deque holding indices in decreasing value order — the front is always the current window's max; pop from the back whenever a new element beats what's there (those are now useless), pop from the front when it slides out of the window.
- **Pattern:** sliding window PLUS monotonic deque — the two patterns compose here.

### 14. Fruit Into Baskets
- **Problem:** You can carry at most 2 distinct types of fruit at once, picking fruit from trees planted in a row, starting anywhere but only moving forward. Find the maximum number of fruits collectible.
- **Example:** `[1,2,1,2,3]` → `4` (`[1,2,1,2]`, only 2 distinct fruit types allowed)
- **Tip:** it's "Longest Substring with At Most K Distinct Characters" with `k=2`, just phrased as fruit baskets — recognizing the disguise is the entire problem.
- **Pattern:** same as the At-Most-K-Distinct window above.

### 15. Longest Repeating Character Replacement
- **Problem:** You may replace at most `K` characters in a string with any other character. Find the length of the longest substring consisting of a single repeated character achievable this way.
- **Example:** `"AABABBA"`, `k=1` → `4` (replace one character to get `"AABA"` or similar, all same letter)
- **Tip:** a window stays valid as long as `(window length) - (count of its most frequent character) ≤ k` — that's exactly "how many characters would I need to replace." Shrink from the left whenever this is violated.
- **Pattern:** variable window with a frequency-count validity formula instead of a simple distinct-count check.

### 16. Permutation in String
- **Problem:** Given two strings, determine whether any permutation of the first exists as a contiguous substring of the second.
- **Example:** `s1="ab"`, `s2="eidbaooo"` → `true` (`"ba"` inside `s2` is a permutation of `"ab"`)
- **Tip:** a FIXED-size window of length `len(s1)` sliding across `s2` — compare character-frequency maps (or a single rolling match-count) instead of checking every permutation explicitly.
- **Pattern:** fixed window + frequency map comparison, same family as Minimum Window Substring but with a known target window size.

## 3. Prefix Sum — "precompute cumulative, a range sum is one subtraction"

### 17. Subarray Sum Equals K
- **Problem:** Count how many contiguous subarrays of a given array sum to exactly `K`.
- **Example:** `[1,1,1]`, `k=2` → `2` (two subarrays sum to 2)
- **Tip:** if `prefixSum[j] - prefixSum[i] = k`, then the subarray `(i, j]` sums to `k` — store how many times each prefix sum value has occurred in a hash map, and for each new prefix sum, check how many earlier prefix sums equal `currentPrefix - k`.
- **Pattern:** prefix sum + hash map counting, O(n), not the O(n²) brute-force double loop.

### 18. Range Sum Query (Immutable)
- **Problem:** Given an array that never changes, answer many repeated queries asking for the sum of elements between two given indices, efficiently.
- **Example:** `nums=[-2,0,3,-5,2,-1]`; `sumRange(0,2)` → `1`
- **Tip:** precompute `prefix[i] = sum of nums[0..i-1]` once; any range sum is `prefix[right+1] - prefix[left]`.
- **Pattern:** the textbook use case prefix sum exists for — many repeated range queries after one O(n) precompute.

### 19. Product of Array Except Self
- **Problem:** For each element in the array, compute the product of every OTHER element, without using division and without an O(n²) brute force.
- **Example:** `[1,2,3,4]` → `[24,12,8,6]`
- **Tip:** it's a "prefix" pattern in disguise — compute a running PRODUCT from the left, then a running product from the right, and multiply the two for each index (without ever dividing, which breaks on zeros).
- **Pattern:** prefix (and suffix) aggregation, generalized beyond sums to products.

### 20. Continuous Subarray Sum (divisible by K)
- **Problem:** Determine whether the array has a contiguous subarray of size at least 2 whose sum is a multiple of `K`.
- **Example:** `[23,2,4,6,7]`, `k=6` → `true` (`[2,4]` sums to 6)
- **Tip:** if two prefix sums have the SAME remainder mod `k`, the subarray between them is divisible by `k` — store the first index each remainder was seen at.
- **Pattern:** prefix sum + modular arithmetic + hash map, same family as Subarray Sum Equals K.

## 4. Linked Lists — "dummy head + fast/slow pointers solve most of this"

### 21. Reverse Linked List
- **Problem:** Reverse a singly linked list in place and return the new head.
- **Example:** `1→2→3→4→5` → `5→4→3→2→1`
- **Tip:** three pointers walking together — `prev`, `curr`, `next` — reverse one link per step, always saving `curr.next` before overwriting it.
- **Pattern:** the foundational linked-list manipulation every other list problem builds on.

### 22. Linked List Cycle (Floyd's)
- **Problem:** Determine whether a linked list contains a cycle (a node's `next` eventually loops back to an earlier node).
- **Example:** `3→2→0→-4→(back to 2)` → `true`
- **Tip:** a slow pointer (1 step) and a fast pointer (2 steps) — if there's a cycle, they MUST meet; if the fast pointer hits `null`, there's no cycle.
- **Pattern:** fast/slow pointers ("tortoise and hare") — also the basis for finding the cycle's actual start node with a second phase.

### 23. Merge Two Sorted Lists
- **Problem:** Merge two sorted linked lists into a single sorted linked list.
- **Example:** `1→2→4` and `1→3→4` → `1→1→2→3→4→4`
- **Tip:** a dummy head node avoids special-casing "what's the new head" — just always attach the smaller of the two current nodes and advance that list's pointer.
- **Pattern:** dummy-head technique, used constantly across linked-list-building problems.

### 24. Remove Nth Node From End of List
- **Problem:** Remove the `n`-th node from the end of a linked list, in a single pass, and return the head.
- **Example:** `1→2→3→4→5`, `n=2` → `1→2→3→5`
- **Tip:** advance a "lead" pointer `n` steps ahead first, then move both pointers together — when `lead` hits the end, `trail` is exactly one node before the one to remove.
- **Pattern:** offset two-pointer walk, avoids a separate pass to count the list length first.

### 25. Reorder List
- **Problem:** Given a linked list, reorder it in place so the nodes alternate front and back: `L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → ...`
- **Example:** `1→2→3→4` → `1→4→2→3`
- **Tip:** three steps chained together — find the middle (fast/slow pointers), reverse the second half, then merge the two halves by alternating nodes.
- **Pattern:** a composition of three earlier linked-list patterns — recognizing the decomposition is the whole skill.

### 26. LRU Cache
- **Problem:** Design a fixed-capacity cache that evicts the Least Recently Used entry when it's full, supporting `get`/`put` both in O(1).
- **Example:** capacity 2; put(1,1), put(2,2), get(1)→1, put(3,3) evicts key 2, get(2)→-1
- **Tip:** a doubly linked list gives O(1) move-to-front/eviction, and a hash map gives O(1) key lookup into that list — neither structure alone is fast enough for both operations.
- **Pattern:** hash map + doubly linked list combo, the canonical "design a data structure" linked-list question.

### 27. Copy List with Random Pointer
- **Problem:** Deep-copy a linked list where each node has a normal `next` pointer AND an additional `random` pointer that can point to any node in the list (or null).
- **Example:** a list where each node also points to an arbitrary other node → a fully independent deep copy
- **Tip:** a hash map from original node → cloned node lets you resolve both `next` and `random` pointers correctly in a second pass, even when the random target hasn't been created yet during the first pass.
- **Pattern:** hash map as an "old node → new node" translation table for graph-like copying.

### 28. Palindrome Linked List
- **Problem:** Determine whether a singly linked list is a palindrome (reads the same forwards and backwards).
- **Example:** `1→2→2→1` → `true`
- **Tip:** find the middle with fast/slow pointers, reverse the second half in place, then compare the two halves node by node — no need to copy the list into an array first.
- **Pattern:** fast/slow pointer (find middle) + in-place reversal, composed together — same building blocks as Reorder List.

### 29. Intersection of Two Linked Lists
- **Problem:** Given the heads of two singly linked lists, find the node at which the two lists intersect (merge into one shared tail), or `null` if they never do.
- **Example:** two lists that merge into a shared tail at some node → that shared node
- **Tip:** walk both lists with two pointers; when one reaches the end, redirect it to the OTHER list's head. The lengths equalize this way, so the two pointers meet exactly at the intersection (or both hit `null` together if there's none).
- **Pattern:** a "wrap around to the other list" two-pointer trick — avoids explicitly computing and aligning the two lengths first.

### 30. Odd Even Linked List
- **Problem:** Given a linked list, group all nodes at odd positions together followed by all nodes at even positions, preserving the relative order within each group.
- **Example:** `1→2→3→4→5` → `1→3→5→2→4`
- **Tip:** maintain two running tails — one for odd-position nodes, one for even-position nodes — and splice the even chain onto the end of the odd chain once both are built.
- **Pattern:** in-place list partitioning by position, one single pass.

## 5. Trees — "recursion by default; know pre/in/post vs BFS"

### 31. Binary Tree Inorder Traversal
- **Problem:** Return the values of a binary tree's nodes visited in inorder (left subtree, then node, then right subtree).
- **Example:** `[1,null,2,3]` → `[1,3,2]`
- **Tip:** left, then node, then right — the iterative version pushes left children onto a stack until it can't, visits, then moves right; know both the recursive AND the iterative version, since "do it iteratively" is a common explicit follow-up.
- **Pattern:** the traversal order underneath BST-sorted-output problems like Kth Smallest Element in a BST.

### 32. Maximum Depth of Binary Tree
- **Problem:** Find the number of nodes along the longest path from the root down to the farthest leaf.
- **Example:** `[3,9,20,null,null,15,7]` → `3`
- **Tip:** the depth of a node is `1 + max(depth(left), depth(right))` — a one-line post-order recursion, and the base building block every other tree-DP problem in this file extends.
- **Pattern:** the simplest possible tree recursion; if you can't derive this instantly, revisit recursion basics before anything else tree-related.

### 33. Symmetric Tree
- **Problem:** Determine whether a binary tree is a mirror of itself around its center.
- **Example:** `[1,2,2,3,4,4,3]` → `true`
- **Tip:** don't compare a tree to itself — write a helper that compares TWO subtrees for mirror-symmetry: `left.val == right.val`, `left.left` mirrors `right.right`, and `left.right` mirrors `right.left`.
- **Pattern:** recursion comparing two trees simultaneously, not just traversing one.

### 34. Binary Tree Level Order Traversal
- **Problem:** Return the tree's node values grouped level by level, top to bottom.
- **Example:** `[3,9,20,null,null,15,7]` → `[[3],[9,20],[15,7]]`
- **Tip:** BFS with a queue, but track the queue's size AT THE START of each level to know exactly when one level ends and the next begins.
- **Pattern:** the standard tree-BFS template — nearly every "per level" tree question reuses this exact loop shape.

### 35. Validate Binary Search Tree
- **Problem:** Determine whether a binary tree is a valid binary search tree — every node's value must fall strictly within the bounds established by ALL of its ancestors, not just its immediate parent.
- **Example:** `[5,1,4,null,null,3,6]` → `false` (4's right child 6 is fine, but 4's left child 3 must be `< 4` AND still `< 5`, which it violates against the ancestor bound)
- **Tip:** pass down a valid `(min, max)` range as you recurse — checking only the immediate parent is the classic wrong answer, since a node must respect EVERY ancestor's bound, not just its direct parent.
- **Pattern:** recursion carrying a shrinking valid-range constraint downward.

### 36. Lowest Common Ancestor of a Binary Tree
- **Problem:** Find the lowest (deepest) node in a binary tree that has both of two given nodes as descendants.
- **Example:** tree with nodes 5 and 1 as targets → their LCA is 3
- **Tip:** recurse into both children; if a node gets a non-null result from BOTH sides, it IS the LCA — if only one side returns non-null, pass that result upward unchanged.
- **Pattern:** post-order recursion where "what did each child find" determines the current node's answer — the same shape as DP on Trees in file 07, just returning a node instead of a number.

### 37. Lowest Common Ancestor of a BST
- **Problem:** Same as above, but the tree is specifically a binary SEARCH tree, which lets you use its ordering to avoid the generic tree recursion.
- **Example:** BST with nodes 2 and 8 as targets → their LCA is the root
- **Tip:** don't do the full generic-tree recursion above — a BST's ordering tells you directly which way to go: if both targets are smaller than the current node, go left; both bigger, go right; otherwise the current node IS the split point (the LCA).
- **Pattern:** exploiting the BST invariant to solve in O(log n) rather than the generic O(n) tree-LCA approach.

### 38. Path Sum
- **Problem:** Determine whether a binary tree has a root-to-leaf path whose node values sum to exactly a given target.
- **Example:** `[5,4,8,11,null,13,4,7,2,null,null,null,1]`, `target=22` → `true` (`5→4→11→2`)
- **Tip:** DFS down each root-to-leaf path, subtracting the current node's value from the remaining target — a leaf reached with exactly `0` remaining is a valid path.
- **Pattern:** simple DFS with an accumulating/decrementing parameter, no backtracking needed since you're only checking existence.

### 39. Path Sum II
- **Problem:** Same as Path Sum, but return EVERY root-to-leaf path (the actual sequence of values) whose sum equals the target, not just whether one exists.
- **Example:** same tree as above, `target=22` → `[[5,4,11,2],[5,8,4,5]]`
- **Tip:** identical DFS to Path Sum, but now you must COLLECT the actual path — add the current node before recursing, remove it after (the standard backtracking choose/explore/unchoose), since the same list is reused across branches.
- **Pattern:** DFS + backtracking, the moment a tree question wants the actual paths instead of just a yes/no.

### 40. Flatten Binary Tree to Linked List
- **Problem:** Flatten a binary tree into a "linked list" in place — following the same order as its preorder traversal, reusing the tree's own right-child pointers as the list's `next` pointers.
- **Example:** `[1,2,5,3,4,null,6]` → `[1,null,2,null,3,null,4,null,5,null,6]` (a right-only chain, pre-order)
- **Tip:** process nodes in REVERSE pre-order (right subtree, then left subtree, then the node itself), keeping a "previously processed" pointer — each node's right child becomes that pointer, left becomes null.
- **Pattern:** a modified traversal order chosen specifically to make the in-place rewiring possible in one pass.

### 41. Construct Binary Tree from Preorder and Inorder Traversal
- **Problem:** Given a binary tree's preorder and inorder traversal sequences, reconstruct the original tree.
- **Example:** `preorder=[3,9,20,15,7]`, `inorder=[9,3,15,20,7]` → `[3,9,20,null,null,15,7]`
- **Tip:** preorder's first element is always the current subtree's root; find that same value's position in inorder — everything to its left in inorder is the left subtree, everything to its right is the right subtree. Recurse with a hash map for O(1) inorder-index lookups.
- **Pattern:** divide and conquer using the two traversal orders' complementary information — recognizing what each traversal order tells you is the entire skill.

### 42. Kth Smallest Element in a BST
- **Problem:** Find the `k`-th smallest value stored in a binary search tree.
- **Example:** `[3,1,4,null,2]`, `k=1` → `1`
- **Tip:** an in-order traversal of a BST visits nodes in sorted order for free — just count visits until you hit the `k`-th.
- **Pattern:** in-order traversal exploiting the BST invariant, instead of collecting everything and sorting.

### 43. Serialize and Deserialize Binary Tree
- **Problem:** Design an algorithm that converts a binary tree into a string, and can convert that string back into the exact original tree structure.
- **Example:** `[1,2,3,null,null,4,5]` → a string like `"1,2,null,null,3,4,null,null,5,null,null"` → reconstructs the identical tree
- **Tip:** pre-order traversal with explicit `null` markers is enough to reconstruct the exact tree unambiguously — without the null markers, the structure is genuinely lost.
- **Pattern:** pre-order encode/decode, a common "design" question testing traversal fluency, not a new algorithm.

### 44. Binary Tree Right Side View
- **Problem:** Return the values of the nodes you'd see if you stood to the right of the tree and looked straight across, one value per level.
- **Example:** `[1,2,3,null,5,null,4]` → `[1,3,4]`
- **Tip:** BFS level by level, and take only the LAST node visited at each level — equivalent to Level Order Traversal with one extra check.
- **Pattern:** level-order BFS, filtered to one node per level.

## 6. Graphs — "DFS for exploration, BFS for shortest unweighted path"

### 45. Number of Islands
- **Problem:** Given a grid of `1`s (land) and `0`s (water), count how many islands (connected groups of adjacent land cells) exist.
- **Example:** grid with land (`1`) and water (`0`) clusters → count of separate land clusters
- **Tip:** DFS (or BFS) from every unvisited land cell, marking the entire connected cluster visited before moving to the next unvisited cell — each fresh DFS you start is one new island.
- **Pattern:** connected-components via DFS/BFS on an implicit grid graph — the template behind most "count the groups" grid problems.

### 46. Clone Graph
- **Problem:** Given a reference to one node in a connected undirected graph, return a complete deep copy of the entire graph.
- **Example:** a graph `1--2--3` (with 1 connected back to 3 too) → an independent deep copy with the same connections
- **Tip:** a hash map from original node → cloned node prevents infinite loops on cycles and lets you resolve neighbor pointers correctly even before all clones exist.
- **Pattern:** DFS/BFS + a visited/clone map, same translation-table idea as Copy List with Random Pointer.

### 47. Course Schedule (can you finish all courses?)
- **Problem:** Given a number of courses and a list of prerequisite pairs, determine whether it's possible to finish all courses (i.e., there's no circular dependency).
- **Example:** `numCourses=2`, `prerequisites=[[1,0]]` → `true` (take 0, then 1)
- **Tip:** this is cycle detection in a directed graph — if there's a cycle in the prerequisite graph, it's impossible. Track 3 states per node (unvisited / in-progress / done); hitting an "in-progress" node again means a cycle.
- **Pattern:** DFS cycle detection with 3-color marking, or equivalently topological sort via Kahn's algorithm (BFS with in-degree counting) — know both.

### 48. Number of Connected Components (Union-Find)
- **Problem:** Given `n` nodes and a list of undirected edges, count how many separate connected components exist.
- **Example:** `n=5`, edges `[[0,1],[1,2],[3,4]]` → `2` components
- **Tip:** Union-Find (disjoint set) merges nodes into groups as edges are processed; the final number of distinct "root" parents is the answer — often faster to reason about than DFS for this specific question.
- **Pattern:** Union-Find with path compression and union by rank — worth knowing as an alternative to DFS/BFS for connectivity questions.

### 49. Course Schedule II (return the actual order)
- **Problem:** Same setup as Course Schedule, but return a valid order in which all the courses can actually be taken (or an empty array if it's impossible).
- **Example:** `numCourses=4`, `prerequisites=[[1,0],[2,0],[3,1],[3,2]]` → `[0,1,2,3]` (one valid order)
- **Tip:** the same topological sort as Course Schedule, but now record the order nodes finish (post-order in DFS, or dequeue order in Kahn's BFS) instead of just detecting a cycle.
- **Pattern:** topological sort — Kahn's algorithm (BFS using in-degree counts, decrementing as neighbors are processed) is usually the cleaner version when you need the explicit order.

### 50. Rotting Oranges
- **Problem:** A grid contains fresh oranges, rotten oranges, and empty cells. Every minute, each rotten orange rots any fresh orange directly adjacent to it. Find the minimum number of minutes until no fresh orange remains (or `-1` if some fresh orange can never be reached).
- **Example:** grid `[[2,1,1],[1,1,0],[0,1,1]]` → `4` minutes for all oranges to rot
- **Tip:** start a BFS from EVERY rotten orange simultaneously (push them all into the queue before the first step), not one at a time — the answer is how many BFS "levels" it takes to reach every fresh orange.
- **Pattern:** multi-source BFS, level-by-level, same shape as Word Ladder but with many starting points at once instead of one.

### 51. Walls and Gates
- **Problem:** A grid contains gates, walls, and empty rooms. Fill every empty room with its distance to the nearest gate.
- **Example:** a grid with gates (0), walls (-1), and empty rooms (INF) → fill each empty room with its distance to the nearest gate
- **Tip:** same multi-source BFS as Rotting Oranges — start from every gate at once, and the first time BFS reaches a room IS its shortest distance, so just record the current level.
- **Pattern:** multi-source BFS computing distances, not just a completion time.

### 52. Graph Valid Tree
- **Problem:** Given `n` nodes and a list of undirected edges, determine whether they form a valid tree (fully connected, with no cycles).
- **Example:** `n=5`, edges `[[0,1],[0,2],[0,3],[1,4]]` → `true`
- **Tip:** a valid tree needs EXACTLY `n-1` edges (any more guarantees a cycle) AND full connectivity — check the edge count first as a cheap early rejection, then confirm connectivity with DFS/BFS or Union-Find.
- **Pattern:** cycle detection + connectivity check combined — Union-Find is a natural fit since a union that fails (both nodes already in the same set) directly signals a cycle.

### 53. Word Ladder
- **Problem:** Given a start word, an end word, and a dictionary, find the length of the shortest sequence of one-letter transformations from start to end, where every intermediate word must also be a real dictionary word.
- **Example:** `"hit"→"cog"`, dictionary `["hot","dot","dog","lot","log","cog"]` → `5` (`hit→hot→dot→dog→cog`)
- **Tip:** BFS where each "edge" is a one-letter transformation — BFS guarantees the FIRST time you reach the target is via the shortest path, which DFS cannot guarantee.
- **Pattern:** BFS shortest path on an implicit graph (transformations, not literal listed edges) — the "unweighted shortest path" signal.

### 54. Network Delay Time (Dijkstra's)
- **Problem:** Given a weighted directed graph representing network signal travel times between nodes, find how long it takes for a signal starting at a given node to reach every other node (or `-1` if some node is unreachable).
- **Example:** `times=[[2,1,1],[2,3,1],[3,4,1]]`, `n=4`, `k=2` → `2`
- **Tip:** unlike Word Ladder's plain BFS, edges here have WEIGHTS — a priority queue (min-heap) always expanding the currently-closest unvisited node is what BFS generalizes into once weights are involved.
- **Pattern:** Dijkstra's algorithm — the signal is "shortest path" PLUS "weighted edges," which plain BFS can't handle correctly.

### 55. Pacific Atlantic Water Flow
- **Problem:** Given a grid of heights representing terrain bordered by the Pacific and Atlantic oceans, find every cell from which water can flow to BOTH oceans (water can only flow from a cell to a neighbor whose height is less than or equal to the current cell's).
- **Example:** a height grid → the set of cells from which water can reach BOTH the Pacific and Atlantic borders
- **Tip:** instead of checking every cell's path outward (expensive), run DFS/BFS INWARD from every Pacific border cell and every Atlantic border cell separately, then intersect the two reachable sets.
- **Pattern:** multi-source BFS/DFS run from the borders inward, then a set intersection — reversing the direction of the search is the key insight.

## 7. Backtracking — "choose → explore → unchoose, prune early"

### 56. Subsets
- **Problem:** Return every possible subset (the full power set) of a given array of unique elements.
- **Example:** `[1,2,3]` → `[[],[1],[2],[3],[1,2],[1,3],[2,3],[1,2,3]]`
- **Tip:** at each element, branch into two recursive calls — "include it" and "don't" — or equivalently, at each recursion level, add the current partial subset to the result THEN keep extending it.
- **Pattern:** the simplest backtracking shape; most other backtracking problems add a constraint on top of this exact skeleton.

### 57. Permutations
- **Problem:** Return every possible ordering (permutation) of a given array of unique elements.
- **Example:** `[1,2,3]` → all 6 orderings
- **Tip:** track a `used[]` boolean array so each element appears exactly once per permutation — this is the "used" variant of the choose-explore-unchoose loop.
- **Pattern:** backtracking with a used-tracking array; contrast with Combinations, which advances a start index instead.

### 58. Combinations
- **Problem:** Return every possible combination of `k` numbers chosen from the range `1` to `n` (order doesn't matter, no repeats).
- **Example:** `n=4`, `k=2` → `[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]`
- **Tip:** unlike Permutations, order doesn't matter — advance a `start` index instead of a `used[]` array, so you only ever consider numbers AFTER the ones already chosen, which naturally avoids both duplicates and reordered repeats.
- **Pattern:** backtracking with an advancing start index — the "no reuse, order doesn't matter" variant.

### 59. Combination Sum II (no repetition, has duplicate inputs)
- **Problem:** Given a list of numbers (each usable at most once, and the list may contain duplicate values) and a target, find every unique combination that sums to the target.
- **Example:** `[10,1,2,7,6,1,5]`, `target=8` → `[[1,1,6],[1,2,5],[1,7],[2,6]]`
- **Tip:** sort first, then at each recursion level skip a candidate if it's the SAME VALUE as the previous candidate you just tried (and rejected) at that same level — this specific dedup check is what separates this from plain Combination Sum.
- **Pattern:** backtracking with sort + adjacent-duplicate-skip, the standard fix whenever an input array has duplicates but the output shouldn't.

### 60. Subsets II (with duplicates)
- **Problem:** Return every possible subset of an array that may contain duplicate elements, without any duplicate subsets appearing in the result.
- **Example:** `[1,2,2]` → `[[],[1],[1,2],[1,2,2],[2],[2,2]]`
- **Tip:** sort first, then apply the exact same adjacent-duplicate-skip rule as Combination Sum II at each recursion level.
- **Pattern:** the same sort + skip-duplicates fix, applied to the Subsets template instead of Combination Sum's.

### 61. Letter Combinations of a Phone Number
- **Problem:** Given a string of digits 2-9, return every possible letter combination the digits could represent on a phone's keypad.
- **Example:** `"23"` → `["ad","ae","af","bd","be","bf","cd","ce","cf"]`
- **Tip:** at each digit, branch into every letter that digit maps to — the recursion depth is fixed (one level per digit), so this is backtracking over a small, bounded tree rather than an open-ended search.
- **Pattern:** backtracking where the choices at each level come from a lookup table, not the input array itself.

### 62. Word Search
- **Problem:** Given a grid of letters and a target word, determine whether the word can be formed by a path of sequentially adjacent cells, using each cell at most once.
- **Example:** grid `[["A","B","C"],["S","F","C"],["A","D","E"]]`, word `"ABCCED"` → `true`
- **Tip:** DFS from every cell matching the word's first letter, marking cells visited temporarily (and un-marking on backtrack) so the same cell isn't reused within one path.
- **Pattern:** grid backtracking — DFS plus explicit "unchoose" (unmark) on the way back up, exactly like the generic template.

### 63. N-Queens
- **Problem:** Place `n` queens on an `n x n` chessboard so that no two queens attack each other (same row, column, or diagonal), and return every distinct valid arrangement.
- **Example:** `n=4` → `2` distinct solutions
- **Tip:** place one queen per row, and before placing check the column and both diagonals against every queen placed so far — pruning invalid placements immediately is what keeps this tractable.
- **Pattern:** backtracking with a validity check gating each choice, not just enumerating everything and filtering after.

### 64. Generate Parentheses
- **Problem:** Given `n` pairs of parentheses, generate every combination of well-formed (properly balanced and nested) parentheses strings.
- **Example:** `n=3` → `["((()))","(()())","(())()","()(())","()()()"]`
- **Tip:** track open-count and close-count used so far; you may add `(` whenever open-count `< n`, and `)` only when close-count `< open-count` — that inequality is what keeps every generated string valid without a separate validity check afterward.
- **Pattern:** backtracking with a built-in constraint that prevents ever generating an invalid partial string in the first place.

## 8. Binary Search — "search on the ANSWER, not just the array"

### 65. Binary Search (classic)
- **Problem:** Given a sorted array and a target value, find the target's index in O(log n) time, or `-1` if it isn't present.
- **Example:** `[-1,0,3,5,9,12]`, target `9` → `4`
- **Tip:** the recurring bug is the loop condition/midpoint update — use `left <= right` and `mid = left + (right-left)/2` to avoid overflow and off-by-one infinite loops.
- **Pattern:** the baseline template every other binary search variant modifies slightly.

### 66. Search in Rotated Sorted Array
- **Problem:** A sorted array has been rotated at some unknown pivot point. Find the index of a target value in O(log n) time.
- **Example:** `[4,5,6,7,0,1,2]`, target `0` → `4`
- **Tip:** at each step, figure out which HALF is properly sorted (compare `nums[left]` to `nums[mid]`), then check whether the target could be in that sorted half — if not, it must be in the other half.
- **Pattern:** binary search with an extra "which side is sorted" branch before the usual comparison.

### 67. Find Minimum in Rotated Sorted Array
- **Problem:** A sorted array with no duplicate values has been rotated at some unknown pivot. Find the minimum element in O(log n) time.
- **Example:** `[3,4,5,1,2]` → `1`
- **Tip:** compare `nums[mid]` to `nums[right]` — if `nums[mid] > nums[right]`, the minimum is strictly to the right of `mid`; otherwise it's at `mid` or to the left.
- **Pattern:** binary search narrowing toward the rotation point specifically.

### 68. Find Peak Element
- **Problem:** Find the index of any "peak" element (an element strictly greater than both of its neighbors) in an array, in O(log n) time.
- **Example:** `[1,2,3,1]` → `2` (index of value 3)
- **Tip:** if `nums[mid] < nums[mid+1]`, a peak must exist somewhere to the right (the sequence is still climbing); otherwise a peak is at `mid` or to the left.
- **Pattern:** binary search on a property (climbing vs not) rather than on equality to a target value.

### 69. Split Array Largest Sum (binary search on the answer)
- **Problem:** Split an array into `m` non-empty contiguous subarrays so as to minimize the largest sum among those subarrays.
- **Example:** `[7,2,5,10,8]`, `m=2` splits → minimized largest subarray sum is `18`
- **Tip:** binary search over the POSSIBLE ANSWER (the largest subarray sum, ranging from `max(nums)` to `sum(nums)`), and for each candidate, greedily check in O(n) whether the array can be split into `≤ m` parts each `≤` that candidate.
- **Pattern:** "binary search the answer" — the real signal is a monotonic yes/no feasibility check as the candidate answer increases, even though nothing about the input array itself is sorted.

## 9. Greedy — "sort first, then take the obviously-best local choice"

### 70. Jump Game
- **Problem:** Each array element represents the maximum jump length from that position. Determine whether you can reach the last index starting from the first.
- **Example:** `[2,3,1,1,4]` → `true` (reach the last index)
- **Tip:** track the farthest index reachable so far as you scan left to right — if the current index ever exceeds that farthest reach, it's impossible; otherwise keep extending it.
- **Pattern:** single-pass greedy tracking a running "farthest reachable" bound.

### 71. Jump Game II (minimum jumps)
- **Problem:** Same setup as Jump Game, but assuming the end is always reachable, find the MINIMUM number of jumps needed to reach the last index.
- **Example:** `[2,3,1,1,4]` → `2` (jump 1 step from index 0 to 1, then 3 steps to the end)
- **Tip:** track the current jump's reachable boundary AND the farthest reachable boundary seen so far; every time you walk past the current boundary, you're forced to take another jump, and the new boundary becomes the farthest one tracked during that stretch.
- **Pattern:** greedy "level-by-level" boundary expansion — conceptually similar to BFS levels, just computed without an actual queue.

### 72. Gas Station
- **Problem:** Gas stations are arranged in a circle, each with some gas available and some cost to travel to the next. Find the starting station index from which you can complete the entire circuit without ever running out of gas (or `-1` if impossible).
- **Example:** `gas=[1,2,3,4,5]`, `cost=[3,4,5,1,2]` → `3` (starting station index)
- **Tip:** if the total gas is less than total cost, no answer exists. Otherwise, whenever the running tank goes negative starting from some station, that station (and everything before the failure point) can't be the start — restart the count from the very next station.
- **Pattern:** greedy single pass with a "reset on failure" running total — a provable exchange-argument greedy, not something obvious without deriving it.

### 73. Merge Intervals
- **Problem:** Given a collection of intervals, merge every pair that overlaps into their minimal set of covering intervals.
- **Example:** `[[1,3],[2,6],[8,10],[15,18]]` → `[[1,6],[8,10],[15,18]]`
- **Tip:** sort by start time first — once sorted, you only ever need to compare each interval to the LAST merged one, never search backward further than that.
- **Pattern:** sort, then single greedy pass — the sort is what makes the greedy correct at all.

### 74. Non-overlapping Intervals (minimum removals)
- **Problem:** Given a collection of intervals, find the minimum number of intervals you'd need to remove so that none of the remaining ones overlap.
- **Example:** `[[1,2],[2,3],[3,4],[1,3]]` → `1`
- **Tip:** sort by END time (not start), and greedily keep an interval only if it starts after the last KEPT interval's end — this specific sort order is what makes the greedy provably optimal here.
- **Pattern:** interval scheduling greedy — sorting by end time is the classic, frequently-mis-remembered detail (sorting by start time gives a wrong answer on some inputs).

## 10. Stacks / Monotonic Stack — "push while helpful, pop while now useless"

### 75. Valid Parentheses
- **Problem:** Given a string of only bracket characters, determine whether every bracket is properly opened and closed in the correct nested order.
- **Example:** `"()[]{}"` → `true`; `"(]"` → `false`
- **Tip:** push opening brackets; on a closing bracket, it must match the top of the stack exactly, or the string is invalid.
- **Pattern:** the foundational stack-matching template.

### 76. Evaluate Reverse Polish Notation
- **Problem:** Evaluate an arithmetic expression given in Reverse Polish (postfix) Notation.
- **Example:** `["2","1","+","3","*"]` → `9` (`(2+1)*3`)
- **Tip:** push numbers; on an operator, pop the top TWO numbers, apply the operator (mind the order — the second-popped is the left operand), and push the result back.
- **Pattern:** stack-based expression evaluation — the standard way postfix/RPN expressions are evaluated without needing operator-precedence parsing at all.

### 77. Next Greater Element
- **Problem:** For each element in one array, find the next element greater than it that appears to its right in a second, related array (or `-1` if none exists).
- **Example:** `nums1=[4,1,2]`, `nums2=[1,3,4,2]` → `[-1,3,-1]`
- **Tip:** process `nums2` right to left (or left to right popping smaller elements) with a monotonic decreasing stack — whenever the current number beats the stack's top, that top just found ITS next greater element; store results in a hash map keyed by value.
- **Pattern:** the textbook monotonic stack problem Daily Temperatures generalizes — same mechanism, different framing.

### 78. Daily Temperatures (monotonic stack)
- **Problem:** Given a list of daily temperatures, for each day find how many days you'd have to wait until a warmer temperature occurs (or `0` if it never does).
- **Example:** `[73,74,75,71,69,72,76,73]` → `[1,1,4,2,1,1,0,0]`
- **Tip:** keep a stack of indices with DECREASING temperatures; whenever a new day's temperature beats the stack's top, that top index just found its answer — pop it and record the day-distance.
- **Pattern:** monotonic stack answering "next element that satisfies a comparison" in one O(n) pass instead of an O(n²) nested scan.

### 79. Largest Rectangle in Histogram
- **Problem:** Given the heights of bars forming a histogram, find the area of the largest rectangle that can be formed within it.
- **Example:** `[2,1,5,6,2,3]` → `10`
- **Tip:** a monotonic increasing stack of bar indices — when a shorter bar appears, pop and compute the rectangle area using the popped bar's height and the current span as its width.
- **Pattern:** monotonic stack tracking "how far back does this height extend," the hardest common instance of this pattern.

### 80. Min Stack
- **Problem:** Design a stack that supports push, pop, peeking the top, and retrieving the current minimum element, all in constant time.
- **Example:** push 2, push 0, push 3, getMin → 0, pop, getMin → 0
- **Tip:** maintain a SECOND stack tracking the running minimum at each push, so popping the main stack also correctly "un-does" the minimum tracking.
- **Pattern:** an auxiliary stack carrying derived state alongside the primary one — a very reusable trick beyond just min.

## 11. Heaps / Priority Queue — "maintain a heap of exactly the size you need"

### 81. Kth Largest Element in an Array
- **Problem:** Find the `k`-th largest element in an unsorted array (the k-th largest by VALUE, not the k-th distinct value).
- **Example:** `[3,2,1,5,6,4]`, `k=2` → `5`
- **Tip:** maintain a MIN-heap of size `k` — if it ever exceeds size `k`, pop the smallest; the top of the heap at the end is the `k`-th largest, without sorting the whole array.
- **Pattern:** bounded heap — a min-heap for a "kth largest" question is the counterintuitive but correct choice.

### 82. Top K Frequent Elements
- **Problem:** Given an array, return the `k` elements that occur most frequently.
- **Example:** `[1,1,1,2,2,3]`, `k=2` → `[1,2]`
- **Tip:** count frequencies with a hash map first, then use a heap of size `k` over the (value, frequency) pairs — same bounded-heap trick as Kth Largest, applied to a derived frequency instead of the raw value.
- **Pattern:** hash map (to derive a comparable key) + bounded heap.

### 83. Merge K Sorted Lists
- **Problem:** Merge `k` sorted linked lists into a single sorted linked list.
- **Example:** `[[1,4,5],[1,3,4],[2,6]]` → `[1,1,2,3,4,4,5,6]`
- **Tip:** put the head of each list into a min-heap; repeatedly pop the smallest, append it to the result, and push that node's `next` (if any) back into the heap.
- **Pattern:** a heap replacing what would otherwise be K-way manual comparison — generalizes "merge two sorted lists" to K.

### 84. Task Scheduler
- **Problem:** Given a list of tasks and a required cooldown period `n` between two occurrences of the same task, find the minimum total time (including any necessary idle slots) needed to complete every task.
- **Example:** `tasks=["A","A","A","B","B","B"]`, `n=2` → `8`
- **Tip:** always run the currently most-frequent remaining task next (a max-heap by remaining count), inserting a cooldown idle slot only when nothing is eligible yet.
- **Pattern:** greedy-by-frequency via a max-heap, with an explicit cooldown constraint layered on top.

### 85. Find Median from Data Stream
- **Problem:** Design a structure that accepts numbers one at a time from a continuous stream and can efficiently return the median of all numbers seen so far, at any point.
- **Example:** stream `1, 2, 3` → running medians `1, 1.5, 2`
- **Tip:** maintain TWO heaps — a max-heap for the lower half of numbers seen, a min-heap for the upper half — kept balanced in size after every insertion; the median is derivable from their two tops in O(1).
- **Pattern:** dual-heap balancing, the standard "running median" design question.

### 86. Design Twitter
- **Problem:** Design a simplified Twitter where users can post tweets, follow/unfollow other users, and retrieve the 10 most recent tweets in their news feed (their own tweets plus everyone they follow), most recent first.
- **Example:** `postTweet(1, 5)`, `follow(1, 2)`, `postTweet(2, 6)`, `getNewsFeed(1)` → `[6, 5]` (most recent first)
- **Tip:** each user's tweets are already individually time-ordered — getting a merged, globally time-ordered feed across everyone a user follows is exactly "Merge K Sorted Lists," where K is the number of followees, solved the same way with a heap keyed by timestamp.
- **Tip 2:** for `follow`/`unfollow`, a hash map of `userId → set of followeeIds` is enough; the heap only comes into play at feed-read time.
- **Pattern:** heap-based K-way merge, recognized underneath a "design a mini social feed" wrapper.

## 12. Arrays & Hash Maps — "a hash map turns a search into a lookup"

### 87. Two Sum (unsorted)
- **Problem:** Given an unsorted array of integers and a target, return the indices of the two numbers that add up to the target.
- **Example:** `[2,7,11,15]`, target `9` → `[0,1]`
- **Tip:** for each number, check whether `target - number` has ALREADY been seen (in a hash map built as you go) before inserting the current number — one pass, O(n), no sorting needed.
- **Pattern:** the hash-map counterpart to Two Sum II's two-pointer approach — reach for this one specifically when the array isn't sorted and you don't want to pay for sorting it.

### 88. Group Anagrams
- **Problem:** Given an array of strings, group all the strings that are anagrams of each other.
- **Example:** `["eat","tea","tan","ate","nat","bat"]` → `[["eat","tea","ate"],["tan","nat"],["bat"]]`
- **Tip:** two strings are anagrams exactly when their SORTED character sequence is identical — use that sorted string (or a 26-count signature) as a hash map key, and group every original string under its key.
- **Pattern:** hash map keyed by a derived canonical form, not the raw value itself.

### 89. Valid Sudoku
- **Problem:** Determine whether a partially-filled 9x9 Sudoku board is valid so far — no row, column, or 3x3 box contains a repeated digit among its currently filled cells.
- **Example:** a 9x9 partially-filled board → `true`/`false` for whether the filled cells violate any rule
- **Tip:** one pass over the board, checking each filled cell against three hash sets simultaneously — its row, its column, and its 3x3 box (indexed by `(row/3, col/3)`) — a duplicate in any of the three is an immediate `false`.
- **Pattern:** multiple hash sets tracking "have I seen this value in this group" for several overlapping groupings at once.

### 90. Majority Element
- **Problem:** Given an array, find the element that appears more than `⌊n/2⌋` times (guaranteed to exist).
- **Example:** `[2,2,1,1,1,2,2]` → `2`
- **Tip:** Boyer-Moore voting — track a candidate and a count; increment on a match, decrement on a mismatch, and swap to a new candidate when the count hits zero. Guaranteed correct because a true majority element (appearing more than n/2 times) can never be fully cancelled out.
- **Tip 2:** a hash map counting frequencies also works in O(n) time but O(n) space — Boyer-Moore is the O(1)-space upgrade worth knowing exists.
- **Pattern:** a specific clever exception to "you need a hash map to count things" — only valid because the problem guarantees a true majority exists.

### 91. Longest Consecutive Sequence
- **Problem:** Given an unsorted array, find the length of the longest run of consecutive integers it contains, in O(n) time (no sorting allowed if you want the optimal solution).
- **Example:** `[100,4,200,1,3,2]` → `4` (the run `1,2,3,4`)
- **Tip:** put every number in a hash set first; then only START counting a sequence from a number whose `number - 1` is NOT in the set (it's a true sequence start) — this avoids re-counting the same run from every one of its members, keeping it O(n) instead of O(n log n).
- **Pattern:** hash set membership check used to identify "sequence starts" specifically, avoiding a sort entirely.

---

## Rapid-Fire Interview Q&A

**Q: Two pointers or sliding window?** — Two pointers usually answers "does a pair/triplet exist," moving toward/away from each other on sorted data. Sliding window answers "what's the longest/shortest contiguous run satisfying a condition," expanding and shrinking one end at a time.

**Q: When does a hash map replace the need for sorting?** — Whenever you need O(1) existence/count lookups instead of O(log n) — Two Sum (unsorted) and Subarray Sum Equals K are the two canonical examples where a hash map beats sorting/searching outright.

**Q: DFS or BFS for a graph problem?** — BFS whenever you need the SHORTEST path in an unweighted graph (it explores level by level, so the first time you reach the target is guaranteed shortest). DFS for exploring structure, connectivity, or when you need to backtrack a path, and it doesn't matter which path you find first.

**Q: When do you reach for Union-Find instead of DFS/BFS?** — When the question is fundamentally about connectivity/grouping over a stream of edges being added, especially if you need to answer "are these two connected" repeatedly as edges are added incrementally — Union-Find answers that faster than re-running DFS each time.

**Q: How do you recognize "binary search on the answer" instead of on the array?** — The array itself might not even be sorted, but there's a monotonic yes/no feasibility check as a candidate answer increases (e.g., "can I split into ≤ m parts each ≤ X" becomes easier to satisfy as X grows) — that monotonicity is what binary search actually needs, not sortedness of the input.

**Q: How do you know a greedy approach is actually correct, not just plausible?** — You can either prove an exchange argument (swapping any two choices never improves the result) or you can't find a counterexample after genuinely trying — Gas Station and Non-overlapping Intervals both look "obviously greedy" but need a specific, provably-correct sort order or reset rule, not just any locally-reasonable rule.

**Q: What signal says "monotonic stack" instead of a plain stack?** — The phrase "next greater/smaller element" or a histogram/skyline-shaped problem — the stack stays sorted (increasing or decreasing) because anything violating that order is guaranteed useless for every future comparison, so it gets popped immediately.

**Q: Why a min-heap for "Kth LARGEST," not a max-heap?** — Counterintuitive but correct: a bounded min-heap of size k always evicts the smallest of the k largest seen so far, leaving exactly the k largest in the heap, with the k-th largest sitting right on top.

## Test-Day Meta-Tips

- State the brute-force approach and its complexity FIRST, even if you already see the optimal one — it shows your reasoning and gives the interviewer a checkpoint before you jump to the clever version.
- For any array/string problem, ask out loud: "is it sorted, or could I sort it?" — that single question routes you toward two pointers, binary search, or greedy far more often than it doesn't.
- For any graph problem, state the graph's actual shape explicitly (directed/undirected, weighted/unweighted, cyclic possible?) before picking DFS, BFS, Dijkstra, or Union-Find — most wrong answers come from skipping this and defaulting to "DFS everything."
- Trace through your own solution on the given example by hand before saying you're done — this catches off-by-one and edge-case bugs (empty input, single element, all-duplicate input) before the interviewer has to point them out.
- If you get stuck identifying the pattern, name the input shape and the question type out loud ("one sorted array, looking for a pair" / "grid, counting connected regions") — saying it plainly often surfaces the pattern faster than staring at the code.
