# DP Quick Revision Cheat Sheet

One file, re-read before any interview — every important problem, with the **problem stated in plain English**, a real example, the one tip that unlocks it, its recurrence, and which pattern it belongs to. No prose to wade through. (For the deeper *why* behind any pattern, see [06-Dynamic-Programming-Patterns-and-Thinking-Process.md](06-Dynamic-Programming-Patterns-and-Thinking-Process.md) — read that once, read this one every time.)

## The One Table — Scan This First

| # | Pattern | Recognize it when... | Remember it as... | Recurrence (one line) |
|---|---|---|---|---|
| 1 | Linear/1D | One sequence, answer at `i` needs only the last 1-2 answers | "Yesterday and the day before" | `dp[i] = f(dp[i-1], dp[i-2], nums[i])` |
| 2 | Kadane's | "Max/min sum of a *contiguous* subarray" | "Ride the wave, or start a new one" | `dp[i] = max(nums[i], dp[i-1] + nums[i])` |
| 3 | 0/1 Knapsack | Each item used **at most once**, hit a target sum/weight | "One shot each → walk BACKWARDS" | `dp[s] = dp[s] OR dp[s-item]` (backward loop) |
| 4 | Unbounded Knapsack | Items **reusable**, min/max/count ways to make an amount | "Unlimited coins → any direction's fine" | `dp[a] = min/sum(dp[a-coin] + 1)` |
| 5 | LCS family | Two strings/arrays, "subsequence," "common," "convert into" | "Match = diagonal+1, else best of up/left" | `dp[i][j] = match ? 1+dp[i-1][j-1] : max(dp[i-1][j], dp[i][j-1])` |
| 6 | LIS | "Longest increasing subsequence/chain," one sequence | "Look back at everyone shorter, be taller by 1" | `dp[i] = 1 + max(dp[j])` for `nums[j] < nums[i]` |
| 7 | Palindrome/Interval | "Substring," "palindrome," a range `[i,j]` in one string | "Small islands first, then bigger islands" | `dp[i][j] = (s[i]==s[j]) AND dp[i+1][j-1]` |
| 8 | Matrix Chain/Partition | "Split into two parts, cost depends on the cut point" | "Try every cut, keep the best" | `dp[i][j] = min over k of dp[i][k]+dp[k][j]+cost` |
| 9 | Grid/Path | Actual 2D grid, "paths," "min/max cost to reach corner" | "Arrows point where you came from" | `dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])` |
| 10 | State Machine (stock) | "Buy/sell," holding vs not holding, transaction limits/cooldown | "Draw the states before you code" | `hold/sold/rest` transitions — see #10 below |
| 11 | DP on Trees | Tree, decision at a node depends on its children | "Kids report both options up to parent" | return `[notRob, rob]` per node, post-order |
| 12 | Bitmask | Small `n` (≤20), "visit/assign all," need to know *which* subset | "n≤20 → bits ARE your memory" | `dp[mask]` where bit `i` = "element `i` used" |

## The 4-Step Process, Compressed to One Line Each

1. **Smells like DP?** Optimization/counting word + overlapping subproblems (plain recursion would re-ask the same question).
2. **State:** what do you need to know to make the NEXT decision? That's your `dp[...]` index.
3. **Recurrence:** try every choice available at this state; combine with min/max/sum/OR.
4. **Base case + order:** smallest state answerable directly; fill order so every read was already computed.

---

## 1. Linear / 1D DP — "yesterday and the day before"

### Climbing Stairs
- **Problem:** You're climbing a staircase of `n` steps. Each move you can climb 1 or 2 steps. How many distinct ways can you reach the top?
- **Example:** `n = 3` → `3` (ways: 1+1+1, 1+2, 2+1)
- **Tip:** it's Fibonacci wearing a costume — to reach step `i` you arrived via a 1-step from `i-1` or a 2-step from `i-2`.
- **Recurrence:** `dp[i] = dp[i-1] + dp[i-2]`; base `dp[0]=1, dp[1]=1`.

### House Robber
- **Problem:** Houses are lined up in a row, each holding some amount of money. You can't rob two adjacent houses (they're alarm-linked). What's the maximum money you can rob?
- **Example:** `[1,2,3,1]` → `4` (rob house 0 and house 2: 1+3)
- **Tip:** at each house, "skip it" vs "rob it and add the best from two houses back" — you can never rob two adjacent.
- **Recurrence:** `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`.

### Min Cost Climbing Stairs
- **Problem:** Each step has a cost to land on. Starting free from index 0 or 1, and moving 1 or 2 steps at a time, find the minimum total cost to get past the last step.
- **Example:** `cost = [10,15,20]` → `15` (start at index 1, pay 15, two steps to the top)
- **Tip:** same shape as House Robber but minimizing cost instead of maximizing loot — you're allowed to START at index 0 or 1 for free.
- **Recurrence:** `dp[i] = min(dp[i-1]+cost[i-1], dp[i-2]+cost[i-2])`.

### Decode Ways
- **Problem:** A string of digits was encoded from letters (A=1, B=2, ..., Z=26). How many distinct ways can it be decoded back into letters?
- **Example:** `"226"` → `3` ("2,2,6" / "22,6" / "2,26")
- **Tip:** at each position, one-digit decode is always possible (if not '0'); two-digit decode is possible only if the pair is "10"–"26" — this conditional branch is the only twist over Climbing Stairs.
- **Recurrence:** `dp[i] = dp[i-1]` (if `s[i-1] != '0'`) `+ dp[i-2]` (if `s[i-2..i-1]` is 10-26).

### Delete and Earn
- **Problem:** Pick a number from the array and earn its value for every occurrence of it — but doing so deletes every occurrence of `(number-1)` and `(number+1)` from ever being picked. Maximize total points earned.
- **Example:** `[3,4,2]` → `6` (delete a 4 earning 4, which also removes all 3s and 5s; then delete the remaining 2)
- **Tip:** House Robber in disguise — bucket the total earnable value per number, then adjacent numbers become "adjacent houses" you can't both take.
- **Recurrence:** build `points[v] = v * count(v)`, then apply House Robber's recurrence over `points`.

### Paint House
- **Problem:** Paint each house in a row one of several colors, each with a different cost, so that no two adjacent houses share the same color. Minimize the total paint cost.
- **Example:** costs `[[17,2,17],[16,16,5],[14,3,19]]` → `10` (paint house 0 color B, house 1 color C, house 2 color B: 2+5+3)
- **Tip:** at each house, the cheapest color depends only on which colors were NOT used on the immediately previous house.
- **Recurrence:** `dp[i][c] = cost[i][c] + min(dp[i-1][c'])` over every color `c' != c`.

### N-th Tribonacci Number
- **Problem:** Like Fibonacci, but each term is the sum of the previous THREE terms (`T0=0, T1=1, T2=1`, then `Tn = Tn-1 + Tn-2 + Tn-3`). Find the n-th term.
- **Example:** `n=4` → `4` (0,1,1,2,4)
- **Tip:** identical shape to Fibonacci/Climbing Stairs, just looking back 3 states instead of 2 — the pattern doesn't change, only the lookback width.
- **Recurrence:** `dp[i] = dp[i-1] + dp[i-2] + dp[i-3]`.

### Longest Arithmetic Subsequence
- **Problem:** Find the length of the longest subsequence (elements don't need to be contiguous, but must stay in order) that forms an arithmetic sequence — a constant difference between every consecutive pair.
- **Example:** `[3,6,9,12]` → `4` (the whole array, common difference 3)
- **Tip:** state needs the difference too, not just the index — `dp[i][diff]` = length of the longest arithmetic run ending at `i` with that common difference.
- **Recurrence:** `dp[i][nums[i]-nums[j]] = dp[j][nums[i]-nums[j]] + 1` for every `j < i`.

## 2. Kadane's / Max Subarray — "ride the wave, or start a new one"

### Maximum Subarray
- **Problem:** Find the contiguous subarray (at least one number) with the largest possible sum, and return that sum.
- **Example:** `[-2,1,-3,4,-1,2,1,-5,4]` → `6` (subarray `[4,-1,2,1]`)
- **Tip:** track "best sum ENDING exactly at `i`," not "best sum somewhere before `i`" — only the first framing gives a usable recurrence.
- **Recurrence:** `dp[i] = max(nums[i], dp[i-1]+nums[i])`; answer is `max(dp[i])` over all `i`.

### Maximum Product Subarray
- **Problem:** Find the contiguous subarray with the largest possible PRODUCT (not sum), and return that product.
- **Example:** `[2,3,-2,4]` → `6` (subarray `[2,3]`)
- **Tip:** one negative number can turn the smallest running product into the biggest — track BOTH a running max and a running min ending at `i`.
- **Recurrence:** `newMax = max(nums[i], nums[i]*max, nums[i]*min)`; symmetric for `newMin`.

### Maximum Sum Circular Subarray
- **Problem:** Same as Maximum Subarray, except the array is circular — a subarray is allowed to wrap around from the end back to the beginning.
- **Example:** `[5,-3,5]` → `10` (wrap around: last 5 + first 5)
- **Tip:** the answer is either a normal (non-wrapping) Kadane's result, OR `total sum - minimum subarray sum` (removing the worst middle chunk leaves the best wrapping chunk). Run Kadane's twice — once for max, once for min — and take the better of the two framings.
- **Recurrence:** standard Kadane's for both the max subarray and the min subarray, then `max(kadaneMax, total - kadaneMin)`.

### Maximum Absolute Sum of Any Subarray
- **Problem:** Find the contiguous subarray whose sum has the largest ABSOLUTE value — it could be a very large positive sum or a very large negative one.
- **Example:** `[1,-3,2,3,-4]` → `5` (subarray `[2,3]`)
- **Tip:** track a running max-ending-here AND a running min-ending-here simultaneously (like Max Product Subarray, but with addition) — the answer is the larger of `|max|` and `|min|` seen anywhere.
- **Recurrence:** `maxEnd = max(0, maxEnd) + nums[i]`; `minEnd = min(0, minEnd) + nums[i]`; track `max(|maxEnd|, |minEnd|)`.

## 3. 0/1 Knapsack (Subset Sum family) — "one shot each → walk backwards"

### Subset Sum
- **Problem:** Given a set of numbers, can SOME subset of them add up to exactly a given target sum?
- **Example:** `[1,2,3,7]`, target `6` → `true` (1+2+3)
- **Tip:** boolean reachability — can the first `i` items hit sum `s`? Space-optimize to 1D and iterate `s` from high to low.
- **Recurrence:** `dp[s] = dp[s] OR dp[s-num]`.

### Partition Equal Subset Sum
- **Problem:** Can the array be split into two subsets whose sums are equal to each other?
- **Example:** `[1,5,11,5]` → `true` (`[1,5,5]` and `[11]`, both sum to 11)
- **Tip:** if total sum is odd, instant `false`. Otherwise it's exactly Subset Sum with `target = total/2`.
- **Recurrence:** same as Subset Sum above.

### Target Sum
- **Problem:** You must place a `+` or `-` sign in front of every number in the array so the total equals a given target. Count how many ways to do that.
- **Example:** `nums=[1,1,1,1,1]`, `target=3` → `5` (five ways to place `+`/`-` signs to reach 3)
- **Tip:** reframe algebraically: `(sum of + numbers) - (sum of - numbers) = target` and `(+numbers) + (-numbers) = total` → solve for `+numbers = (total+target)/2`, then it's "count subsets summing to that value."
- **Recurrence:** `dp[s] += dp[s-num]` (counting, not OR).

### 0/1 Knapsack (classic)
- **Problem:** You have items, each with a weight and a value, and a knapsack that can hold a maximum total weight. Each item may be taken at most once. Maximize the total value you can carry.
- **Example:** weights `[1,3,4,5]`, values `[1,4,5,7]`, capacity `7` → `9` (take weight-3 and weight-4 items: values 4+5)
- **Tip:** maximize value instead of just checking feasibility — same backward loop, `max` instead of `OR`.
- **Recurrence:** `dp[w] = max(dp[w], dp[w-weight]+value)`.

## 4. Unbounded Knapsack (Coin Change family) — "unlimited coins → any direction's fine"

### Coin Change (min coins)
- **Problem:** Given coin denominations (unlimited supply of each) and a target amount, find the FEWEST coins needed to make that amount exactly, or `-1` if it's impossible.
- **Example:** `coins=[1,2,5]`, `amount=11` → `3` (5+5+1)
- **Tip:** try every coin as the LAST one added; no backward-loop trick needed here — reuse is the whole point.
- **Recurrence:** `dp[a] = min(dp[a], dp[a-coin]+1)`; base `dp[0]=0`, rest start at "infinity."

### Coin Change II (count ways)
- **Problem:** Given coin denominations (unlimited supply) and a target amount, count how many DISTINCT combinations of coins add up to that amount.
- **Example:** `coins=[1,2,5]`, `amount=5` → `4` (5 · 2+2+1 · 2+1+1+1 · 1+1+1+1+1)
- **Tip:** counting *combinations*, not permutations — loop coins on the OUTER loop and amounts on the INNER loop, or `{1,2}` and `{2,1}` get double-counted as different "ways."
- **Recurrence:** `dp[a] += dp[a-coin]`.

### Combination Sum
- **Problem:** Given a list of numbers (each reusable any number of times) and a target, find every distinct combination of numbers that adds up exactly to the target.
- **Example:** `candidates=[2,3,6,7]`, `target=7` → `[[2,2,3],[7]]`
- **Tip:** this one wants the actual combinations, so it's backtracking, not tabulated DP — but the "reusable item" signal is identical: don't advance the start index after picking a number, since you're allowed to pick it again.
- **Recurrence (as recursion):** `combinationSum(remaining, start) → for i in [start, n): pick candidates[i], recurse(remaining - candidates[i], i)` (note: `i`, not `i+1`).

### Word Break
- **Problem:** Given a string and a dictionary of words, determine whether the string can be split into a sequence of one or more dictionary words (words may repeat).
- **Example:** `s="leetcode"`, `wordDict=["leet","code"]` → `true` ("leet"+"code")
- **Tip:** `dp[i]` = can the first `i` characters of `s` be segmented using dictionary words? For each `i`, try every earlier split point `j` and check both "is `dp[j]` true" and "is `s[j..i]` a dictionary word" — words are reusable, exactly like coins.
- **Recurrence:** `dp[i] = OR over j<i of (dp[j] AND s[j..i] is in the dictionary)`; base `dp[0]=true` (empty prefix needs no words).

## 5. LCS Family (two-sequence 2D) — "match = diagonal+1, else best of up/left"

### Longest Common Subsequence
- **Problem:** Given two strings, find the length of their longest subsequence common to both (characters don't need to be contiguous, but must appear in the same relative order in each string).
- **Example:** `"abcde"`, `"ace"` → `3` ("ace")
- **Tip:** if the current characters match, they're free — extend the diagonal. If not, drop one character from whichever string is more promising to drop from, and take the better result.
- **Recurrence:** `dp[i][j] = text1[i-1]==text2[j-1] ? 1+dp[i-1][j-1] : max(dp[i-1][j], dp[i][j-1])`.

### Edit Distance
- **Problem:** Find the minimum number of single-character insertions, deletions, or replacements needed to turn one string into another.
- **Example:** `"horse"`, `"ros"` → `3` (horse → rorse → rose → ros)
- **Tip:** it's the LCS grid with one extra option on a mismatch: replace, costing `1 + dp[i-1][j-1]`, alongside delete and insert.
- **Recurrence:** match → `dp[i-1][j-1]`; else → `1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])`.

### Distinct Subsequences
- **Problem:** Count how many distinct ways string `t` appears as a subsequence inside string `s`.
- **Example:** `s="rabbbit"`, `t="rabbit"` → `3`
- **Tip:** counting PATHS through the grid, not lengths — on a match you get to choose "use this character" or "skip it," so ADD both possibilities instead of taking a max.
- **Recurrence:** match → `dp[i][j] = dp[i-1][j-1] + dp[i-1][j]`; no match → `dp[i][j] = dp[i-1][j]`.

### Shortest Common Supersequence
- **Problem:** Find the shortest possible string that contains BOTH given strings as subsequences.
- **Example:** `"abac"`, `"cab"` → `"cabac"` (length 5)
- **Tip:** build the LCS grid first, then walk it backward from `(m,n)`: where characters matched, keep one copy; where they didn't, insert whichever character belongs to the path you're following.
- **Recurrence:** same grid as LCS; the answer is reconstructed by backtracking through it, not read directly off `dp[m][n]`.

### Longest Palindromic Subsequence
- **Problem:** Find the length of the longest subsequence of a string that is itself a palindrome (not necessarily contiguous).
- **Example:** `"bbbab"` → `4` ("bbbb")
- **Tip:** the elegant reduction — the longest palindromic subsequence of `s` is exactly the LCS of `s` and its own reverse. No new algorithm needed, just recognizing the disguise.
- **Recurrence:** `LCS(s, reverse(s))`, using the exact LCS recurrence above.

## 6. LIS Family — "look back at everyone shorter, be taller by 1"

### Longest Increasing Subsequence
- **Problem:** Find the length of the longest STRICTLY increasing subsequence in an array (elements don't need to be contiguous, but must stay in order and each strictly greater than the last).
- **Example:** `[10,9,2,5,3,7,101,18]` → `4` (`[2,3,7,101]` or `[2,3,7,18]`)
- **Tip:** `dp[i]` = LIS ending exactly at `i` — check every earlier smaller element and extend its best chain by 1. The O(n log n) version replaces the inner loop with binary search over a `tails` array (smallest tail seen so far, per length) — `tails` is NOT a real LIS, just a greedy proxy for "best tail per length."
- **Recurrence:** `dp[i] = 1 + max(dp[j])` for every `j<i` with `nums[j]<nums[i]`.

### Number of Longest Increasing Subsequences
- **Problem:** Count how many DISTINCT longest increasing subsequences exist in the array (not just the length of the longest one).
- **Example:** `[1,3,5,4,7]` → `2` (two LIS of length 4: `[1,3,4,7]` and `[1,3,5,7]`)
- **Tip:** keep a parallel `count[i]` array; whenever you find `dp[j]+1 == dp[i]`, add `count[j]` into `count[i]` (another way to reach that same best length).
- **Recurrence:** `dp[i]` as above; `count[i] += count[j]` whenever `nums[j]<nums[i]` and `dp[j]+1==dp[i]`.

### Russian Doll Envelopes
- **Problem:** An envelope fits inside another only if BOTH its width and height are strictly smaller. Find the maximum number of envelopes you can nest inside one another like Russian dolls.
- **Example:** `[[5,4],[6,4],[6,7],[2,3]]` → `3`
- **Tip:** sort by width ascending, but height DESCENDING for ties — otherwise two envelopes of the same width could wrongly "nest" in the LIS step. Then it's plain LIS on the height sequence.
- **Recurrence:** LIS's recurrence, applied after that specific sort.

## 7. Palindrome / Interval DP — "small islands first, then bigger islands"

### Longest Palindromic Substring
- **Problem:** Find the longest substring (must be CONTIGUOUS, unlike a subsequence) of a string that reads the same forwards and backwards.
- **Example:** `"babad"` → `"bab"` (or `"aba"`, both valid)
- **Tip:** a range is a palindrome only if its outer characters match AND the inside is already a palindrome — must fill by increasing substring length, since `dp[i][j]` needs the smaller, nested `dp[i+1][j-1]`.
- **Recurrence:** `dp[i][j] = (s[i]==s[j]) AND (j-i<2 OR dp[i+1][j-1])`.

### Palindromic Substrings (count)
- **Problem:** Count how many substrings of a string are palindromes — every single character counts too, and the same text appearing more than once counts separately each time.
- **Example:** `"abc"` → `3` (each single char); `"aaa"` → `6` (a,a,a,aa,aa,aaa)
- **Tip:** exact same table as above — just increment a counter every time `dp[i][j]` is true instead of tracking the longest.
- **Recurrence:** same as Longest Palindromic Substring.

### Palindrome Partitioning II (min cuts)
- **Problem:** Find the minimum number of cuts needed to split a string into pieces that are all palindromes.
- **Example:** `"aab"` → `1` (cut into `"aa" | "b"`)
- **Tip:** first build the palindrome table above, then run a SECOND, simpler 1D DP on top of it: for each end position `j`, try every start `i` where `s[i..j]` is a palindrome.
- **Recurrence:** `cuts[j] = min(cuts[i-1] + 1)` over every `i` where `dp[i][j]` is true.

## 8. Matrix Chain / Partition (Interval) DP — "try every cut, keep the best"

### Matrix Chain Multiplication
- **Problem:** Given the dimensions of a chain of matrices to multiply together, find the parenthesization order that minimizes the total number of scalar multiplications (matrix multiplication is associative, but the order changes the cost a lot).
- **Example:** dimensions `[40,20,30,10,30]` → `26000` (minimum scalar multiplications)
- **Tip:** try every split point `k` between `i` and `j`, multiply the left group, multiply the right group, then combine — fill by increasing interval length, same rule as palindrome DP.
- **Recurrence:** `dp[i][j] = min over k of dp[i][k] + dp[k+1][j] + dims[i-1]*dims[k]*dims[j]`.

### Burst Balloons
- **Problem:** Each balloon has a number on it. Bursting balloon `i` earns `left_neighbor * balloon[i] * right_neighbor` coins, using whatever balloons are its current immediate neighbors at that moment. Find the maximum total coins from bursting every balloon in some order.
- **Example:** `[3,1,5,8]` → `167`
- **Tip:** the famous trick — recurse on the LAST balloon burst within range `[i,j]`, not the first, because that balloon's neighbors at burst time are guaranteed to be `i-1` and `j+1` (everything else in between is already gone).
- **Recurrence:** `dp[i][j] = max over k in [i,j] of dp[i][k-1] + dp[k+1][j] + nums[i-1]*nums[k]*nums[j+1]`.

### Minimum Cost to Merge Stones
- **Problem:** Piles of stones sit in a row. You may merge any `K` CONSECUTIVE piles into one pile, at a cost equal to the total number of stones merged. Find the minimum total cost to merge everything into a single pile (or `-1` if it's impossible).
- **Example:** `[3,2,4,1]`, `K=2` → `20`
- **Tip:** a range of stones can only be merged into one pile if its length is expressible as `1 + m*(K-1)` — check that divisibility before trying to split.
- **Recurrence:** `dp[i][j] = min over valid k of dp[i][k] + dp[k+1][j]`, plus the cost of a final full merge when the whole range qualifies.

## 9. Grid / Path DP — "arrows point where you came from"

### Unique Paths
- **Problem:** A robot sits at the top-left corner of an `m x n` grid and can move only right or down. How many distinct paths exist to reach the bottom-right corner?
- **Example:** `m=3, n=2` → `3`
- **Tip:** you can only arrive at `(i,j)` from above or from the left — first row and first column are each reachable exactly one way.
- **Recurrence:** `dp[i][j] = dp[i-1][j] + dp[i][j-1]`.

### Unique Paths II (with obstacles)
- **Problem:** Same as Unique Paths, but some grid cells are obstacles the robot cannot pass through at all.
- **Example:** `[[0,0,0],[0,1,0],[0,0,0]]` → `2`
- **Tip:** same recurrence, but any obstacle cell is forced to `0` — it can never be a source of paths for its neighbors.
- **Recurrence:** `dp[i][j] = 0` if obstacle, else `dp[i-1][j] + dp[i][j-1]`.

### Minimum Path Sum
- **Problem:** Given a grid of non-negative numbers, find a path from the top-left to the bottom-right (moving only right or down) that minimizes the sum of all numbers along the path.
- **Example:** `[[1,3,1],[1,5,1],[4,2,1]]` → `7` (path `1→3→1→1→1`)
- **Tip:** same "from above or left" shape as Unique Paths, but `min` + accumulate cost instead of counting paths.
- **Recurrence:** `dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])`.

### Dungeon Game
- **Problem:** A knight starts at the top-left of a dungeon grid (each cell heals or damages him by some amount) and must reach the bottom-right (the princess), moving only right or down, never letting his health drop to 0 or below at any point. Find the minimum starting health that guarantees he survives the whole path.
- **Example:** `[[-2,-3,3],[-5,-10,1],[10,30,-5]]` → `7` (minimum starting health to survive to the bottom-right)
- **Tip:** the twist pattern — "health needed here" depends on what's still AHEAD on the path, which forward-filling can't know yet. Fill BACKWARD, from the bottom-right corner toward the top-left.
- **Recurrence:** `dp[i][j] = max(1, min(dp[i+1][j], dp[i][j+1]) - dungeon[i][j])`.

## 10. State Machine DP (Buy/Sell Stock) — "draw the states before you code"

The 3 core states: **`hold`** (own a share) · **`sold`** (sold today, cooldown starts) · **`rest`** (free to buy).
Transitions: `hold[i]=max(hold[i-1], rest[i-1]-price[i])` · `sold[i]=hold[i-1]+price[i]` · `rest[i]=max(rest[i-1], sold[i-1])`.

### Best Time to Buy and Sell Stock I (one transaction)
- **Problem:** Given an array of daily stock prices, and allowed exactly ONE buy followed by ONE later sell, find the maximum profit achievable.
- **Example:** `[7,1,5,3,6,4]` → `5` (buy at 1, sell at 6)
- **Tip:** simplest case — track the minimum price seen so far, and the best profit is the max of `price - minSoFar` at every step.
- **Recurrence:** `minPrice = min(minPrice, price[i])`; `maxProfit = max(maxProfit, price[i]-minPrice)`.

### Stock II (unlimited transactions)
- **Problem:** Same setup, but you may complete AS MANY buy-sell transactions as you like (must sell before buying again). Maximize total profit.
- **Example:** `[7,1,5,3,6,4]` → `7` (buy 1 sell 5, buy 3 sell 6 → 4+3)
- **Tip:** with unlimited transactions the DP collapses to a greedy: sum every positive day-to-day price increase.
- **Recurrence:** `profit += max(0, price[i]-price[i-1])`.

### Stock III (at most 2 transactions)
- **Problem:** Same setup, but you may complete AT MOST TWO transactions total. Maximize total profit.
- **Example:** `[3,3,5,0,0,3,1,4]` → `6`
- **Tip:** track 4 running values — `buy1, sell1, buy2, sell2` — where `buy2` is funded by `sell1`'s profit, chaining the two transactions.
- **Recurrence:** `buy1=max(buy1,-price)`; `sell1=max(sell1,buy1+price)`; `buy2=max(buy2,sell1-price)`; `sell2=max(sell2,buy2+price)`.

### Stock with Cooldown
- **Problem:** Same as unlimited transactions, but after selling you must wait one full day (a cooldown) before you're allowed to buy again.
- **Example:** `[1,2,3,0,2]` → `3`
- **Tip:** exactly the 3-state machine at the top of this section — the cooldown IS the `rest` state only being reachable the step after `sold`, never directly from `hold`.
- **Recurrence:** as listed above.

### Stock with Transaction Fee
- **Problem:** Same as unlimited transactions, but every completed transaction (a buy+sell pair) incurs a fixed fee.
- **Example:** `prices=[1,3,2,8,4,9]`, `fee=2` → `8`
- **Tip:** same 3-state machine, just subtract the fee at the moment you sell.
- **Recurrence:** `sold[i] = hold[i-1] + price[i] - fee`.

## 11. DP on Trees — "kids report both options up to parent"

### House Robber III
- **Problem:** Houses are arranged in a binary tree instead of a row. You can't rob a node and its direct parent or child on the same edge. Maximize total loot.
- **Example:** tree `[3,2,3,null,3,null,1]` → `7` (rob nodes summing to 7, skipping any two directly connected)
- **Tip:** return TWO numbers per node — best-if-not-robbed and best-if-robbed — because the parent's own decision needs both possibilities about each child, not just one collapsed number.
- **Recurrence:** `notRob = max(left.notRob,left.rob) + max(right.notRob,right.rob)`; `rob = node.val + left.notRob + right.notRob`.

### Binary Tree Cameras
- **Problem:** Place the minimum number of cameras on tree nodes such that every single node is "covered" — a camera covers the node it's on, that node's parent, and that node's direct children.
- **Example:** tree `[0,0,null,0,0]` → `1` (one camera at the second-level node covers both leaves and itself)
- **Tip:** 3 states per node — "covered by a camera on this node," "covered by a child's camera," "not covered at all" — decided greedily bottom-up: a node with an uncovered child MUST get a camera.
- **Recurrence:** post-order; place a camera whenever a child reports "not covered."

### Diameter of Binary Tree
- **Problem:** Find the length (number of edges) of the longest path between ANY two nodes in a binary tree — the path doesn't have to pass through the root.
- **Example:** `[1,2,3,4,5]` → `3` (longest path has 3 edges, e.g. 4-2-1-3)
- **Tip:** not technically "optimization DP," but the same post-order-aggregate shape — at each node, the diameter THROUGH that node is `leftDepth + rightDepth`; track the max seen anywhere while returning `1+max(left,right)` upward as depth.
- **Recurrence:** `diameter_candidate = depth(left) + depth(right)`; `depth(node) = 1 + max(depth(left), depth(right))`.

## 12. Bitmask DP — "n≤20 → bits ARE your memory"

### Partition to K Equal Sum Subsets
- **Problem:** Given an array and a number `k`, determine whether the array can be divided into `k` non-empty subsets that each have an equal sum.
- **Example:** `nums=[4,3,2,3,5,2,1]`, `k=4` → `true` (four subsets each summing to 5)
- **Tip:** `2^n` states are only feasible because `n` is small — a bitmask remembers exactly WHICH elements are already assigned to some bucket, which a plain count can't. Sort descending first to prune failing branches faster.
- **Recurrence:** `dp[mask]` = can the elements marked in `mask` be validly bucketed so far.

### Shortest Path Visiting All Nodes
- **Problem:** Given an undirected connected graph, find the length of the shortest path that starts at any node and visits every node at least once (revisiting nodes/edges along the way is allowed).
- **Example:** `graph=[[1,2],[0,2],[0,1]]` → `2`
- **Tip:** state is `(mask, lastNode)` — which nodes have been visited AND where you currently are, since the next valid move depends on both.
- **Recurrence:** `dp[mask][node] = min steps to have visited exactly the nodes in mask, currently standing on node`.

### Shortest Superstring
- **Problem:** Given a list of strings, find the shortest single string that contains EVERY one of them as a substring somewhere inside it.
- **Example:** `["catg","ctaagt","gcta","ttca","atgcatc"]` → a shortest string containing all as substrings
- **Tip:** precompute the pairwise "overlap savings" between every two strings, then it's the same `(mask, lastString)` state as Shortest Path Visiting All Nodes — this problem is TSP with a custom distance function.
- **Recurrence:** `dp[mask][i] = max total overlap achievable ending with string i, having used exactly mask`.

---

## Rapid-Fire Interview Q&A

**Q: Greedy or DP?** — Can you find a counterexample where the locally-best choice loses overall? Yes → DP. No → probably greedy.

**Q: Why backward loop in 0/1 knapsack space optimization?** — Forward lets `dp[s-item]` reflect this same item already added this pass → accidental reuse → wrong answer, no crash.

**Q: Why does Coin Change not need that backward-loop care?** — Reuse IS the intended behavior for unbounded knapsack — there's no bug to avoid.

**Q: LCS vs Edit Distance — same problem?** — Same 2D grid. Edit Distance just adds a third "replace" option to the mismatch branch: `1 + dp[i-1][j-1]`.

**Q: Why "ending at i" instead of "using first i" for Kadane's/LIS?** — Because the recurrence needs to know if index `i` itself is used — "best so far" alone can't tell you that.

**Q: Top-down or bottom-up?** — Top-down when the state space is large but sparsely visited, or to derive the recurrence first. Bottom-up once it's settled — no recursion-depth risk, usually faster.

**Q: When does a grid DP need to fill backward?** — When the value at a cell depends on what's still AHEAD on the path (Dungeon Game's "health to survive"), not what's behind it.

**Q: How do you know you need a bitmask instead of a plain index state?** — The answer depends on WHICH specific elements were used, not just how many, and `n` is small enough that `2^n` is feasible.

**Q: DP on trees — what's the one mistake everyone makes?** — Collapsing a node's result to one number before returning it to the parent, when the parent actually needs to know 2+ possibilities about each child.

**Q: State machine DP — how do you not get lost in the buy/sell family?** — Draw the state diagram (hold/sold/rest, plus a transaction-count dimension if limited) before writing any code. Every variant reuses this.

**Q: Off-by-one — what's the recurring bug?** — `dp` sized `n` instead of `n+1` when `dp[0]` is a real base case (empty prefix/string), and forgetting `charAt(i-1)` inside a loop indexed from 1.

## Test-Day Meta-Tips

- Say the state and recurrence **out loud** before writing a line of code — interviewers grade the reasoning, not just the final syntax.
- Write the brute-force recursive version first in your head (even if you don't code it) — the memoized version is just that plus a cache; the tabulated version is just that unrolled iteratively.
- Verify the recurrence on a tiny hand-traceable example (3-4 elements) before coding the loop — catches an off-by-one or wrong base case in 30 seconds instead of mid-debug.
- If stuck identifying the pattern, ask: one sequence or two? A range/substring or a running prefix? Reusable items or not? Those three questions alone eliminate most of the 12 patterns.
- State the time/space complexity unprompted once your solution works — then mention the space optimization if one exists, even if you don't implement it.
