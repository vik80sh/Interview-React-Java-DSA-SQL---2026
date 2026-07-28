# Dynamic Programming & Backtracking
## Patterns, Optimization, Key Problems

---

## TABLE OF CONTENTS
1. Dynamic Programming Fundamentals
2. DP Patterns & Examples
3. Backtracking Fundamentals
4. Key Problems
5. Interview Tips

---

# PART 1: DYNAMIC PROGRAMMING FUNDAMENTALS

## What is DP?

```
Dynamic Programming = Solving by breaking into subproblems

KEY PRINCIPLES:
1. Optimal substructure: Solution = optimal solutions to subproblems
2. Overlapping subproblems: Reuse solutions (memoization)

BOTTOM-UP vs TOP-DOWN:
- Top-down (Memoization): Recursion with caching
- Bottom-up (Tabulation): Iteration with table

WHEN TO USE:
- Optimization problems (max, min)
- Counting problems
- Decision problems (yes/no)
- Should have overlapping subproblems

NOT FOR:
- Problems that don't have optimal substructure
- When subproblems don't overlap
```

---

## Memoization (Top-Down)

```java
// Fibonacci with memoization
Map<Integer, Long> memo = new HashMap<>();

public long fib(int n) {
    if (n <= 1) return n;
    if (memo.containsKey(n)) return memo.get(n);
    
    long result = fib(n-1) + fib(n-2);
    memo.put(n, result);
    return result;
}

// Time: O(n), Space: O(n) + O(n) recursion stack
```

---

## Tabulation (Bottom-Up)

```java
// Fibonacci with tabulation
public long fib(int n) {
    if (n <= 1) return n;
    
    long[] dp = new long[n+1];
    dp[0] = 0;
    dp[1] = 1;
    
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i-1] + dp[i-2];
    }
    
    return dp[n];
}

// Time: O(n), Space: O(n)

// Space optimized
public long fib(int n) {
    if (n <= 1) return n;
    
    long prev = 0, curr = 1;
    for (int i = 2; i <= n; i++) {
        long next = prev + curr;
        prev = curr;
        curr = next;
    }
    return curr;
}

// Time: O(n), Space: O(1)
```

---

# PART 2: DP PATTERNS

## Pattern 1: Linear DP

```java
// PROBLEM: Max Sum of Non-Adjacent Elements
public int maxSum(int[] nums) {
    if (nums.length == 0) return 0;
    if (nums.length == 1) return nums[0];
    
    int[] dp = new int[nums.length];
    dp[0] = nums[0];
    dp[1] = Math.max(nums[0], nums[1]);
    
    for (int i = 2; i < nums.length; i++) {
        dp[i] = Math.max(dp[i-1], dp[i-2] + nums[i]);
    }
    
    return dp[nums.length-1];
}

// Space optimized
public int maxSum(int[] nums) {
    if (nums.length == 0) return 0;
    if (nums.length == 1) return nums[0];
    
    int prev1 = nums[0];
    int prev2 = Math.max(nums[0], nums[1]);
    
    for (int i = 2; i < nums.length; i++) {
        int curr = Math.max(prev2, prev1 + nums[i]);
        prev1 = prev2;
        prev2 = curr;
    }
    
    return prev2;
}
// Time: O(n), Space: O(1)
```

---

## Pattern 2: 2D DP

```java
// PROBLEM: Unique Paths (m x n grid)
public int uniquePaths(int m, int n) {
    int[][] dp = new int[m][n];
    
    // Initialize first row and column
    for (int i = 0; i < m; i++) dp[i][0] = 1;
    for (int j = 0; j < n; j++) dp[0][j] = 1;
    
    // Fill the table
    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            dp[i][j] = dp[i-1][j] + dp[i][j-1];
        }
    }
    
    return dp[m-1][n-1];
}
// Time: O(m*n), Space: O(m*n)

// PROBLEM: Edit Distance
public int editDistance(String word1, String word2) {
    int m = word1.length(), n = word2.length();
    int[][] dp = new int[m+1][n+1];
    
    // Initialize base cases
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    
    // Fill the table
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1.charAt(i-1) == word2.charAt(j-1)) {
                dp[i][j] = dp[i-1][j-1];
            } else {
                dp[i][j] = 1 + Math.min({
                    dp[i-1][j],    // delete
                    dp[i][j-1],    // insert
                    dp[i-1][j-1]   // replace
                });
            }
        }
    }
    
    return dp[m][n];
}
// Time: O(m*n), Space: O(m*n)
```

---

## Pattern 3: DP on Trees

```java
// PROBLEM: House Robber III (Rob or don't rob)
public int rob(TreeNode root) {
    int[] result = dfs(root);
    return Math.max(result[0], result[1]);
}

private int[] dfs(TreeNode node) {
    if (node == null) return new int[]{0, 0};
    
    int[] left = dfs(node.left);
    int[] right = dfs(node.right);
    
    // result[0] = max if not robbing this node
    // result[1] = max if robbing this node
    int notRob = Math.max(left[0], left[1]) + Math.max(right[0], right[1]);
    int rob = node.val + left[0] + right[0];
    
    return new int[]{notRob, rob};
}
// Time: O(n), Space: O(h)
```

---

# PART 3: BACKTRACKING FUNDAMENTALS

## What is Backtracking?

```
Backtracking = Exploring all possible solutions

PATTERN:
1. Choose: Pick an option
2. Explore: Recursively solve with that choice
3. Unchoose: Backtrack and try other options

WHEN TO USE:
- Generate all permutations/combinations
- Solve constraint satisfaction problems
- Path finding problems
- N-Queens, Sudoku, etc.
```

---

## Backtracking Pattern

```java
public void backtrack(List<T> currentSolution) {
    // Base case: found solution
    if (isComplete(currentSolution)) {
        results.add(new ArrayList<>(currentSolution));
        return;
    }
    
    // Try each option
    for (T option : getOptions(currentSolution)) {
        // Choose
        currentSolution.add(option);
        
        // Explore
        backtrack(currentSolution);
        
        // Unchoose
        currentSolution.remove(currentSolution.size()-1);
    }
}
```

---

## Key Backtracking Problems

```java
// PROBLEM 1: Permutations
public List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(result, new ArrayList<>(), nums, new boolean[nums.length]);
    return result;
}

private void backtrack(List<List<Integer>> result, List<Integer> current, int[] nums, boolean[] used) {
    if (current.size() == nums.length) {
        result.add(new ArrayList<>(current));
        return;
    }
    
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        
        current.add(nums[i]);
        used[i] = true;
        
        backtrack(result, current, nums, used);
        
        current.remove(current.size()-1);
        used[i] = false;
    }
}
// Time: O(n! * n), Space: O(n)

// PROBLEM 2: Combinations
public List<List<Integer>> combine(int n, int k) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(result, new ArrayList<>(), 1, n, k);
    return result;
}

private void backtrack(List<List<Integer>> result, List<Integer> current, int start, int n, int k) {
    if (current.size() == k) {
        result.add(new ArrayList<>(current));
        return;
    }
    
    for (int i = start; i <= n; i++) {
        current.add(i);
        backtrack(result, current, i+1, n, k);
        current.remove(current.size()-1);
    }
}
// Time: O(C(n,k) * k), Space: O(C(n,k))

// PROBLEM 3: N-Queens
public List<List<String>> solveNQueens(int n) {
    List<List<String>> result = new ArrayList<>();
    char[][] board = new char[n][n];
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            board[i][j] = '.';
        }
    }
    
    backtrack(result, board, 0);
    return result;
}

private void backtrack(List<List<String>> result, char[][] board, int row) {
    if (row == board.length) {
        result.add(constructBoard(board));
        return;
    }
    
    for (int col = 0; col < board.length; col++) {
        if (isValid(board, row, col)) {
            board[row][col] = 'Q';
            backtrack(result, board, row+1);
            board[row][col] = '.';
        }
    }
}

private boolean isValid(char[][] board, int row, int col) {
    // Check column
    for (int i = 0; i < row; i++) {
        if (board[i][col] == 'Q') return false;
    }
    // Check diagonal
    for (int i = row-1, j = col-1; i >= 0 && j >= 0; i--, j--) {
        if (board[i][j] == 'Q') return false;
    }
    for (int i = row-1, j = col+1; i >= 0 && j < board.length; i--, j++) {
        if (board[i][j] == 'Q') return false;
    }
    return true;
}
// Time: O(n!), Space: O(n²)
```

---

# PART 4: KEY DP PROBLEMS

```
EASY:
[ ] Climbing Stairs
[ ] Best Time to Buy and Sell Stock
[ ] House Robber
[ ] Min Cost Climbing Stairs

MEDIUM:
[ ] Coin Change
[ ] Longest Increasing Subsequence
[ ] Longest Common Subsequence
[ ] Edit Distance
[ ] Unique Paths
[ ] Word Break
[ ] Partition Equal Subset Sum

HARD:
[ ] Regular Expression Matching
[ ] Wildcard Matching
[ ] Burst Balloons
[ ] Distinct Subsequences
```

---

# PART 5: INTERVIEW TIPS

## DP Approach

```
1. Define subproblem
   - What's the state?
   - What are the dimensions?

2. Write recurrence relation
   - How does current state depend on previous?
   - Base cases?

3. Implement
   - Top-down (memoization) or bottom-up (tabulation)?
   - Can we optimize space?

4. Optimize
   - Space optimization (rolling array)
   - Pruning (early termination)
```

---

## Backtracking Approach

```
1. Understand constraints
   - What are valid solutions?
   - Any optimization possible?

2. Choose representation
   - How to track current state?
   - What to check for validity?

3. Implement systematically
   - Choose → Explore → Unchoose
   - Handle duplicates
   - Prune invalid branches

4. Test edge cases
   - Empty input
   - Single element
   - All permutations valid
```

---

# SUMMARY: DP & Backtracking

✅ **Dynamic Programming:**
- [ ] Know when to use (overlapping subproblems)
- [ ] Know memoization vs tabulation
- [ ] Know common patterns (linear, 2D, trees)
- [ ] Can optimize space

✅ **Backtracking:**
- [ ] Know when to use (generate all)
- [ ] Know choose-explore-unchoose pattern
- [ ] Know permutations vs combinations
- [ ] Can prune effectively

---

**Master DP & backtracking—they're advanced DSA! 🚀**
