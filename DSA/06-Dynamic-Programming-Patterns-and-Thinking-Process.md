# Dynamic Programming: Patterns, Thinking Process, and Tips

DP is the topic where memorizing solutions actively hurts you — there are thousands of DP problems and maybe twelve underlying patterns, and the interview isn't testing whether you've seen this exact problem before, it's testing whether you can recognize which pattern it's wearing a disguise as. This file is organized around that recognition skill: for each pattern, how to spot it from the problem statement, the recurrence template, a fully worked thinking process for one representative problem, and the other problems that share the same shape.

## 1. The Universal DP Thinking Process (Use This Every Time)

Before touching a pattern, run every DP problem through the same four questions, in order:

1. **Does this even smell like DP?** Look for: an optimization word (min/max/longest/shortest/count the ways), a decision at each step that affects later decisions, and — critically — **overlapping subproblems** (the same smaller sub-question gets asked more than once if you solved it with plain recursion). If a greedy, always-take-the-locally-best-choice approach provably works, it's not DP; DP exists specifically because the locally-best choice at step `i` isn't always part of the globally-best answer.
2. **Define the state.** What do you need to know to make the next decision? This becomes your `dp[...]` index(es). Getting this wrong (too few dimensions, so two genuinely different situations collide in the same cell) is the single most common real DP bug.
3. **Find the recurrence.** How does `dp[state]` relate to `dp[smaller state]`? This is almost always "try every choice available at this state, and take the best/sum/count of what each choice leads to."
4. **Base cases and order.** What's the smallest state you can answer directly with no recursion? And in bottom-up form, what order do you fill the table so that every `dp[state]` you read was already computed?

### Worked example: Climbing Stairs ("you can climb 1 or 2 steps at a time, how many distinct ways to reach the top?")

1. **Smells like DP?** Yes — "how many ways" (counting), and the ways to reach step 5 overlap heavily with the ways to reach step 4 and step 3.
2. **State:** `dp[i]` = number of distinct ways to reach step `i`. One dimension is enough — nothing else about *how* you got there matters for what comes next.
3. **Recurrence:** to reach step `i`, your last move was either a 1-step from `i-1` or a 2-step from `i-2`, so `dp[i] = dp[i-1] + dp[i-2]`.
4. **Base cases:** `dp[0] = 1` (one way to be at the start: do nothing), `dp[1] = 1`. Fill `i` from `2` to `n`.

```java
int climbStairs(int n) {
    if (n <= 1) return 1;
    int prev2 = 1, prev1 = 1; // dp[0], dp[1]
    for (int i = 2; i <= n; i++) {
        int curr = prev1 + prev2;
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}
```

Every pattern below is this same four-step process; only the state definition and recurrence shape change.

## 2. Pattern Recognition Cheat Sheet

| Signal in the problem | Pattern | Section |
|---|---|---|
| One sequence, decision at each index depends on the last 1-2 answers | Linear/1D DP | §3 |
| "Maximum sum of a contiguous subarray" | Kadane's / Max Subarray | §4 |
| "Can we pick items (each used once) to hit exactly a target" | 0/1 Knapsack (Subset Sum) family | §5 |
| "Fewest/most ways to make an amount, items reusable" | Unbounded Knapsack (Coin Change) family | §6 |
| Two strings/arrays, "subsequence," "common," "convert one into another" | LCS family (2D, two sequences) | §7 |
| "Longest increasing/chain" in one sequence | LIS family | §8 |
| "Substring," "palindrome," a range `[i, j]` inside one string | Palindrome / Interval DP | §9 |
| "Split into two parts and combine," cost depends on where you cut | Matrix Chain / Partition DP | §10 |
| Grid, "paths," "min/max cost to reach the corner" | Grid/Path DP | §11 |
| "Buy and sell," holding/not-holding an asset, transaction limits | State Machine DP | §12 |
| Tree structure, decision at a node depends on children | DP on Trees | §13 |
| Small `n` (≤ ~20), "visit all," "assign all," subsets of items | Bitmask DP | §14 |

## 3. Linear / 1D DP

**Recurrence template:** `dp[i] = f(dp[i-1], dp[i-2], ..., nums[i])` — the answer for the first `i` elements depends on the answer for a small, fixed number of smaller prefixes.

### Thinking process: House Robber ("can't rob two adjacent houses, maximize loot")

1. **State:** `dp[i]` = max loot considering houses `0..i`.
2. **Recurrence:** at house `i`, either skip it (`dp[i-1]`) or rob it and add to the best from two houses back (`dp[i-2] + nums[i]`) — you take whichever is larger: `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`.
3. **Base cases:** `dp[0] = nums[0]`, `dp[1] = max(nums[0], nums[1])`.

```java
int rob(int[] nums) {
    int prev2 = 0, prev1 = 0;
    for (int n : nums) {
        int curr = Math.max(prev1, prev2 + n);
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}
```

Notice the space optimization: since `dp[i]` only ever needs the last two values, you never need the full array — this "roll two variables forward" trick applies to almost every 1D DP with a small fixed lookback.

**Other problems in this pattern:** Min Cost Climbing Stairs, Decode Ways (a string of digits, count ways to decode — same shape as Climbing Stairs but the transition is conditional on whether the last 1-2 characters form a valid code), Delete and Earn (House Robber in disguise, after bucketing values by count).

## 4. Kadane's Algorithm / Max Subarray Family

**The core insight:** track "the best subarray *ending exactly at* index `i`," not "the best subarray somewhere in `0..i`" — the second framing doesn't give you a usable recurrence, the first one does.

### Thinking process: Maximum Subarray

1. **State:** `dp[i]` = max sum of a contiguous subarray ending at index `i` (not the overall max yet — that's a separate running max you track alongside).
2. **Recurrence:** either extend the previous best-ending-here subarray by including `nums[i]`, or start fresh at `i` if the previous running sum was actually hurting you: `dp[i] = max(nums[i], dp[i-1] + nums[i])`.
3. **Base case:** `dp[0] = nums[0]`.

```java
int maxSubArray(int[] nums) {
    int currentSum = nums[0], best = nums[0];
    for (int i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        best = Math.max(best, currentSum);
    }
    return best;
}
```

**The trap in Maximum Product Subarray:** a single negative number can turn the smallest running product into the largest one (two negatives multiply to a positive), so you must track **both** a running max and a running min ending at `i`, and consider both when a negative number flips them: `newMax = max(nums[i], nums[i]*max, nums[i]*min)`, and symmetric for `newMin`. This is the direct answer to "why can't I just track one running product" — the min matters exactly because multiplication, unlike addition, isn't monotonic with sign.

## 5. 0/1 Knapsack Family (Subset Sum)

**Signal:** each item can be used **at most once**, and you're asking "can we hit exactly this target" (boolean), "how many subsets hit this target" (count), or "max value under this weight" (optimization).

### Thinking process: Partition Equal Subset Sum ("can the array be split into two subsets with equal sum?")

1. **Reframe first:** if the total sum is odd, it's immediately impossible. Otherwise the question becomes "can some subset sum to exactly `total / 2`?" — a subset-sum boolean DP.
2. **State:** `dp[i][s]` = can the first `i` items form sum `s`?
3. **Recurrence:** for item `i`, either don't use it (`dp[i-1][s]`) or use it if `s >= nums[i-1]` (`dp[i-1][s - nums[i-1]]`) — `dp[i][s] = dp[i-1][s] OR (s >= nums[i-1] AND dp[i-1][s-nums[i-1]])`.
4. **Base case:** `dp[0][0] = true` (empty subset makes sum 0); every other `dp[0][s] = false`.

```java
boolean canPartition(int[] nums) {
    int total = Arrays.stream(nums).sum();
    if (total % 2 != 0) return false;
    int target = total / 2;

    boolean[] dp = new boolean[target + 1];
    dp[0] = true;
    for (int num : nums) {
        for (int s = target; s >= num; s--) { // MUST go backwards — see below
            dp[s] = dp[s] || dp[s - num];
        }
    }
    return dp[target];
}
```

**The single most important detail in 0/1 knapsack space optimization:** the inner loop must run `s` from high to low. Going forward would let the same item get "used" twice in computing `dp[s]` within the same outer iteration, because `dp[s - num]` might already reflect this iteration's update rather than last iteration's — silently turning your 0/1 knapsack into an unbounded one. This single line is one of the most common real bugs in a live-coded knapsack solution.

**Other problems in this pattern:** Subset Sum (the boolean check itself), Target Sum (assign `+`/`-` to each number to hit a target — reframes into a subset-sum problem on `(total + target) / 2`), 0/1 Knapsack itself (maximize value instead of just checking feasibility, so `dp[s] = max(dp[s], dp[s-weight] + value)`), Number of Subsets with a given sum (same recurrence, but `dp[s] += dp[s-num]` — counting instead of OR-ing).

## 6. Unbounded Knapsack Family (Coin Change)

**Signal:** items can be **reused any number of times** — "minimum coins," "number of ways to make change," "combination sum."

### Thinking process: Coin Change ("fewest coins to make amount")

1. **State:** `dp[a]` = minimum coins to make amount `a`.
2. **Recurrence:** try using each coin as the *last* coin added: `dp[a] = min over each coin c of (1 + dp[a - c])`, provided `a - c >= 0` and `dp[a-c]` is reachable.
3. **Base case:** `dp[0] = 0` (zero coins needed to make amount 0). Initialize everything else to "infinity"/unreachable.

```java
int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, Integer.MAX_VALUE);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int coin : coins) {
            if (coin <= a && dp[a - coin] != Integer.MAX_VALUE) {
                dp[a] = Math.min(dp[a], dp[a - coin] + 1);
            }
        }
    }
    return dp[amount] == Integer.MAX_VALUE ? -1 : dp[amount];
}
```

**Direct contrast with Section 5:** here the inner loop over coins runs for every amount, and because a coin can be reused, there's no "iterate backwards" trick needed — `dp[a - coin]` is meant to possibly already include this same coin. This is the exact, nameable reason Coin Change's loop order looks different from Partition Equal Subset Sum's, even though both look like "knapsack" on the surface — one is 0/1 (backwards, or an item-then-amount nesting), the other is unbounded (any order works, since reuse is the whole point).

**Other problems in this pattern:** Coin Change II (count the number of *ways*, not the minimum count — `dp[a] += dp[a-coin]`, summed instead of min'd), Combination Sum (backtracking to enumerate the actual combinations, not just count them — the DP recurrence is the same shape, but the question wants the sequences themselves).

## 7. LCS Family — Two-Sequence 2D DP

**Signal:** two strings or arrays, and words like "subsequence," "common," "convert `word1` into `word2`," "how many ways does one appear inside the other."

### Thinking process: Longest Common Subsequence

1. **State:** `dp[i][j]` = LCS length using the first `i` characters of `text1` and the first `j` characters of `text2`.
2. **Recurrence:** if the current characters match (`text1[i-1] == text2[j-1]`), they can both be part of the LCS, so extend the diagonal: `dp[i][j] = 1 + dp[i-1][j-1]`. If they don't match, the best is whichever of "drop the last char of `text1`" or "drop the last char of `text2`" is better: `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`.
3. **Base case:** `dp[0][j] = dp[i][0] = 0` — an empty string has an LCS of length 0 with anything.

```java
int longestCommonSubsequence(String text1, String text2) {
    int m = text1.length(), n = text2.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
                dp[i][j] = 1 + dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n];
}
```

**Extension: Edit Distance** is the exact same 2D grid, but with a third option added to the "characters don't match" branch — you can also *replace* the character, costing `1 + dp[i-1][j-1]`, alongside delete (`1 + dp[i-1][j]`) and insert (`1 + dp[i][j-1]`), taking the minimum of the three. Seeing Edit Distance as "LCS's grid, plus a replace option" — rather than a brand-new problem — is exactly the pattern-recognition skill this file is for.

**Other problems in this pattern:** Distinct Subsequences (count how many times `s2` appears as a subsequence of `s1` — same grid, but sum instead of max when characters match, since you're counting paths, not lengths), Shortest Common Supersequence (build the actual shortest string containing both as subsequences, using the LCS grid to know where to merge vs. insert).

## 8. Longest Increasing Subsequence (LIS) Family

### Thinking process: LIS, first the O(n²) version, then the real O(n log n) one

1. **State (O(n²)):** `dp[i]` = length of the longest increasing subsequence *ending exactly at* index `i` (same "ending at," not "somewhere in," framing as Kadane's).
2. **Recurrence:** `dp[i] = 1 + max(dp[j])` for every `j < i` where `nums[j] < nums[i]` (or just `1` if no such `j` exists).

```java
int lengthOfLIS(int[] nums) {
    int[] dp = new int[nums.length];
    Arrays.fill(dp, 1);
    int best = 1;
    for (int i = 1; i < nums.length; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
        }
        best = Math.max(best, dp[i]);
    }
    return best;
}
```

**The O(n log n) upgrade** replaces the inner loop with binary search over a `tails` array, where `tails[k]` holds the smallest possible tail value of an increasing subsequence of length `k+1` seen so far. For each new number, binary-search for where it belongs in `tails` and either extend `tails` (if it's bigger than everything, a new longest subsequence is possible) or replace an existing entry (a smaller tail for that same length gives future numbers a better chance to extend it). The point worth explaining out loud in an interview: `tails` is **not** an actual LIS itself — it's a greedy "best possible tail for each length," which is why the trick works at all.

**Other problems in this pattern:** Number of LIS (count how many distinct LIS of the maximum length exist — same `dp[i]` array, plus a parallel `count[i]` array), Russian Doll Envelopes (sort by one dimension, then it reduces exactly to LIS on the other dimension).

## 9. Palindrome / Interval DP

**Signal:** one string, and the question is about ranges `[i, j]` within it — "is this a palindrome," "how many palindromic substrings," "minimum cuts to partition into palindromes."

### Thinking process: Longest Palindromic Substring

1. **State:** `dp[i][j]` = is `s[i..j]` a palindrome? (boolean)
2. **Recurrence:** `s[i..j]` is a palindrome if the outer characters match **and** the inside is also a palindrome: `dp[i][j] = (s[i] == s[j]) AND dp[i+1][j-1]`.
3. **Base cases:** every single character `dp[i][i] = true`; every 2-character substring `dp[i][i+1] = (s[i] == s[i+1])`.
4. **Fill order matters here:** `dp[i][j]` depends on `dp[i+1][j-1]` — a *shorter* interval nested inside — so you must iterate by increasing substring length (or, equivalently, iterate `i` from the end of the string backwards and `j` forward from `i`), never in plain row-major order.

```java
String longestPalindrome(String s) {
    int n = s.length();
    boolean[][] dp = new boolean[n][n];
    int start = 0, maxLen = 1;

    for (int i = n - 1; i >= 0; i--) {
        dp[i][i] = true;
        for (int j = i + 1; j < n; j++) {
            if (s.charAt(i) == s.charAt(j) && (j - i == 1 || dp[i + 1][j - 1])) {
                dp[i][j] = true;
                if (j - i + 1 > maxLen) { start = i; maxLen = j - i + 1; }
            }
        }
    }
    return s.substring(start, start + maxLen);
}
```

(The "expand from every center outward" approach is simpler and equally common for this specific problem, but the DP table version is the one that generalizes to the rest of this pattern family, which is why it's worth knowing both.)

**Other problems in this pattern:** Palindromic Substrings (count instead of find the longest — same table, just increment a counter whenever `dp[i][j]` is true), Palindrome Partitioning II (minimum cuts to split the string into palindromic pieces — a second DP layer on top of the palindrome table: `cuts[j] = min(cuts[i-1] + 1)` for every `i` where `s[i..j]` is a palindrome, per the [Interval DP pattern](#10-matrix-chain--partition-interval-dp) below).

## 10. Matrix Chain / Partition (Interval) DP

**Signal:** "split a range into two parts at some point `k`, and the cost of combining them depends on where you split" — the defining feature is a recurrence that tries every possible split point.

**Recurrence template:** `dp[i][j] = min/max over every k in (i, j) of (dp[i][k] + dp[k][j] + cost(i, k, j))`.

### Thinking process: Matrix Chain Multiplication ("minimize scalar multiplications to multiply a chain of matrices")

1. **State:** `dp[i][j]` = minimum cost to multiply matrices `i` through `j` into a single result.
2. **Recurrence:** try every split point `k` between `i` and `j` — multiply the left group, multiply the right group, then combine them: `dp[i][j] = min over k of (dp[i][k] + dp[k+1][j] + cost of combining those two results)`.
3. **Base case:** `dp[i][i] = 0` (a single matrix needs no multiplication).
4. **Fill order:** exactly like the palindrome table, `dp[i][j]` depends on strictly smaller intervals, so you fill by increasing interval length (`len` from 2 up to `n`), not row-major order.

**Other problems in this pattern:** Burst Balloons (the trick is realizing the *last* balloon burst in a range, not the first, is the cleaner split point to recurse on — a genuinely famous "aha" in this pattern), Minimum Cost to Merge Stones (splitting a range of stone piles, with an added constraint on how many piles you can merge at once).

## 11. Grid / Path DP

**Signal:** an actual 2D grid, "paths," "minimum/maximum cost to go from top-left to bottom-right," obstacles.

### Thinking process: Minimum Path Sum

1. **State:** `dp[i][j]` = minimum cost to reach cell `(i, j)` from the top-left.
2. **Recurrence:** you can only arrive at `(i, j)` from above or from the left, so take whichever was cheaper: `dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])`.
3. **Base cases:** the first row and first column can only be reached one way each (straight along the edge), so they're a running sum, not a `min`.

**The twist worth knowing: Dungeon Game inverts the fill direction.** When the question is "minimum starting health to survive a path to the *bottom-right*," you can't compute forward from the top-left, because the minimum health needed at a cell depends on the health cost of everything still ahead of it, which you don't know yet moving forward — so that problem fills the table **backwards**, from the bottom-right corner toward the top-left. Recognizing when a grid DP needs to run in reverse (whenever the "cost so far" framing doesn't work because the constraint is about surviving what's still ahead) is a genuine, higher-level pattern-recognition skill worth calling out explicitly in an interview.

**Other problems in this pattern:** Unique Paths / Unique Paths II (counting instead of min-cost, with obstacles blocking a cell entirely by setting `dp[i][j] = 0`), Cherry Pickup (two simultaneous paths through the same grid, tracked as one combined state).

## 12. State Machine DP (Stock Buy/Sell Family)

**Signal:** "buy and sell," a limited number of transactions, a cooldown or fee — model each day as being in one of a small number of *states*, and the recurrence is "how did I get into this state."

### Thinking process: Best Time to Buy and Sell Stock with Cooldown

1. **States, per day:** `hold` (currently holding a share), `sold` (just sold today — triggers the cooldown), `rest` (not holding, and not on cooldown — free to buy).
2. **Recurrence:**
   - `hold[i] = max(hold[i-1], rest[i-1] - price[i])` — either keep holding, or buy today from a resting state.
   - `sold[i] = hold[i-1] + price[i]` — you can only have just sold if you were holding yesterday.
   - `rest[i] = max(rest[i-1], sold[i-1])` — either you were already resting, or your cooldown from selling yesterday just ended.
3. **Base cases:** `hold[0] = -price[0]`, `sold[0] = 0` (impossible to have sold on day 0, so this stays a non-winning value), `rest[0] = 0`.
4. **Answer:** `max(sold[n-1], rest[n-1])` — you should never end holding a share for maximum profit.

This is the actual reusable skill: draw the state diagram first (which states exist, which transitions are legal between them) *before* writing any recurrence — the buy/sell family (I, II, III, IV, with cooldown, with fee) is really the same few states with slightly different transition rules or an added "how many transactions used so far" dimension, not a family of unrelated problems.

## 13. DP on Trees

**Signal:** a tree, and the decision at a node depends on aggregating results computed at its children — always solved with post-order recursion (children first, then combine).

### Thinking process: House Robber III ("can't rob a node and its direct child on the same path, maximize loot in a tree")

1. **State (per node):** return **two** values — `[bestIfNotRobbingThisNode, bestIfRobbingThisNode]` — because a parent needs to know both possibilities about each child to decide its own best move.
2. **Recurrence:** `notRob(node) = max(left.notRob, left.rob) + max(right.notRob, right.rob)` — if you don't rob this node, each child is independently free to be robbed or not, so take the best of each. `rob(node) = node.val + left.notRob + right.notRob` — if you rob this node, neither child can be robbed.
3. **Base case:** a `null` child returns `[0, 0]`.

```java
int rob(TreeNode root) {
    int[] result = dfs(root);
    return Math.max(result[0], result[1]);
}
private int[] dfs(TreeNode node) {
    if (node == null) return new int[]{0, 0};
    int[] left = dfs(node.left), right = dfs(node.right);
    int notRob = Math.max(left[0], left[1]) + Math.max(right[0], right[1]);
    int rob = node.val + left[0] + right[0];
    return new int[]{notRob, rob};
}
```

The reusable insight: whenever a tree problem's answer at a node depends on "what happened at each child," return a small fixed-size array of *all* the states a parent might need, not just one number — trying to collapse it to a single value too early is the most common way to get stuck on this pattern.

## 14. Bitmask DP

**Signal:** small `n` (roughly ≤ 20, since `2^n` states must be feasible), and the question involves "visiting/assigning all of them" — the state needs to remember *which specific subset* has been used, not just *how many*.

### Thinking process: Partition to K Equal Sum Subsets

1. **State:** `dp[mask]` = can the subset of elements represented by `mask` (a bitmask where bit `i` means "element `i` is used") be partitioned so far according to the rules? Or, more directly for this problem: track which elements have been assigned to *some* bucket, and recursively try assigning the next unused element to each of the `k` buckets with remaining capacity.
2. **Why a bitmask specifically:** with `n ≤ 16` elements, there are `2^16 = 65536` possible subsets — small enough to use an integer's bits as a set membership test (`mask & (1 << i)` to check if element `i` is used, `mask | (1 << i)` to mark it used) and memoize on that integer directly, which a normal array-based state couldn't represent compactly.
3. **Recurrence:** for the current bucket's remaining target sum, try adding each unused element (`(mask & (1 << i)) == 0`) that still fits, recursing with the updated mask.

**Other problems in this pattern:** Traveling Salesman-style "shortest path visiting all nodes" (`dp[mask][lastNode]` = shortest path visiting exactly the nodes in `mask`, currently ending at `lastNode`), Shortest Superstring (similar mask-plus-last-piece state).

## 15. Common Mistakes and Debugging Tips

- **Off-by-one on array size.** A `dp` array meant to hold "the answer using the first `i` elements" for `i` from `0` to `n` needs size `n + 1`, not `n` — the extra slot is `dp[0]`, the empty-prefix base case, and forgetting it is the single most common indexing bug in DP code.
- **Wrong sentinel value.** Use `Integer.MAX_VALUE`/`-1`/`false` consistently to mean "unreachable," and check for it before combining values (`dp[a-coin] + 1` overflows badly if `dp[a-coin]` was left at `Integer.MAX_VALUE` as a sentinel and you add 1 without checking first).
- **Backwards vs forwards iteration in space-optimized knapsack.** Covered in depth in §5 — going the wrong direction silently turns a 0/1 knapsack into an unbounded one, or vice versa, with no runtime error, just a wrong answer on some inputs.
- **Fill order for interval DP.** `dp[i][j]` that depends on smaller sub-intervals (palindrome DP, matrix chain DP) must be filled in increasing interval-length order, not plain row-major order, or you'll read from a cell that hasn't been computed yet.
- **Top-down vs bottom-up isn't just style.** Top-down (memoized recursion) only computes states that are actually reachable from the starting call, which can matter a lot when the full state space is large but sparse — bottom-up tabulation computes every cell in the table whether or not it's ever used. Bottom-up avoids recursion-depth limits and is usually a bit faster in practice due to no call-stack overhead; top-down is often easier to derive correctly first, since it mirrors the recursive recurrence directly, before converting to tabulation once the recurrence is verified.

## 16. Interview Questions and Answers

### 1. How do you tell whether a problem is actually solvable with a greedy approach instead of needing full DP?

**Answer:** Try to find a counterexample where the locally-best choice at one step provably leads to a worse overall answer than a different choice would have. If you can't construct one and can informally argue the greedy choice never needs to be reconsidered, it's a genuine greedy problem; if a counterexample exists, that's exactly what "overlapping subproblems whose best solution depends on later context" means, and it's DP.

### 2. What's the real difference between defining `dp[i]` as "the best answer using the first `i` elements" versus "the best answer ending exactly at index `i`"?

**Answer:** "First `i` elements" gives you a monotonically-refined running answer but doesn't tell you anything about whether the optimal solution actually uses element `i`, which some recurrences need to know. "Ending exactly at `i`" (Kadane's, LIS) is the framing that actually admits a clean recurrence for problems about contiguous or chained structure — the general lesson is that the right one depends on what information the recurrence at the next step actually needs.

### 3. Why does the loop direction matter in 0/1 knapsack's space-optimized version, and why doesn't it matter for Coin Change (unbounded knapsack)?

**Answer:** In 0/1 knapsack, iterating the amount forward would let `dp[s - item]` already reflect this same item being used again earlier in the same pass, effectively allowing the item to be reused — iterating backward guarantees `dp[s - item]` still reflects the *previous* item's pass. In unbounded knapsack, reuse is exactly the intended behavior, so there's no bug to avoid — the recurrence is designed around `dp[a-coin]` possibly already including the same coin.

### 4. When should you reach for a top-down memoized solution instead of bottom-up tabulation?

**Answer:** When the reachable state space is meaningfully smaller than the full theoretical state space, so computing every cell in a bottom-up table wastes work on states that never actually get visited, or when deriving the recurrence is easier to reason about as recursion first. Bottom-up is generally preferred once the recurrence is settled, for its lack of recursion-depth risk and typically better constant-factor performance.

### 5. How do you recognize that a problem needs a bitmask state instead of a simple index-based one?

**Answer:** When the answer at a given point depends on *which specific subset* of elements has been used so far, not just how many — and `n` is small enough (roughly ≤ 20) that `2^n` is a feasible number of states. An index or count alone can't distinguish "elements {1,3} used" from "elements {2,4} used," which a bitmask can represent as a state directly.

### 6. What's the actual reusable skill behind DP on trees, beyond "use recursion"?

**Answer:** Returning a small fixed set of *all* the states a parent might need from each child — not collapsing to a single number too early — because the parent's own optimal choice usually depends on more than one possibility about each child (e.g., "best if this child was robbed" and "best if it wasn't," together, not just the max of the two prematurely).

### 7. Why does Dungeon Game need to fill its DP table in the opposite direction from Minimum Path Sum, even though both are grid path problems?

**Answer:** Minimum Path Sum accumulates a cost that only depends on the path taken *so far*, so it can be computed forward from the start. Dungeon Game's "minimum health to survive" at a cell depends on the damage still ahead on the rest of the path, which isn't known yet moving forward — so it must be computed backward from the destination, where "what's still ahead" is already known at each step.

## Revision Checklist

- [ ] Run a new, unseen DP problem through the four-step thinking process (DP smell test → state → recurrence → base cases/order) out loud, without looking at a memorized solution.
- [ ] Recognize each of the twelve patterns above from a one-sentence problem description.
- [ ] Explain the 0/1 vs unbounded knapsack loop-direction difference, and reproduce the bug that happens when you get it backwards.
- [ ] Derive the LCS recurrence from scratch, then extend it to Edit Distance by adding the replace option.
- [ ] Explain why LIS's O(n log n) `tails` array isn't itself a real LIS.
- [ ] Draw a state diagram before coding a state-machine DP problem (stock buy/sell family).
- [ ] Explain when a grid DP needs to fill backward instead of forward, using Dungeon Game as the example.
- [ ] Explain when a bitmask state is actually necessary instead of a plain index/count state.
