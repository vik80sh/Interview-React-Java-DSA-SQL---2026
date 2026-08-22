# DSA Fundamentals & Complexity Analysis
## Big O Notation, Time & Space Complexity, Analysis Techniques

---

## TABLE OF CONTENTS
1. Big O Notation
2. Time Complexity Analysis
3. Space Complexity Analysis
4. Master Theorem
5. Common Patterns & Their Complexity
6. Interview Tips

---

# PART 1: BIG O NOTATION

## What is Big O?

```
Big O = Worst-case time complexity as input size grows

GOAL: Understand how algorithm scales with input size

NOT: Exact number of operations
     (O(5n) = O(n), constants dropped)

YES: Growth rate
     (Linear, quadratic, exponential, etc.)

ANALOGY:
If input goes from 1,000 to 10,000 (10x increase):
- O(1): Still 1 operation
- O(n): 10,000 operations (10x)
- O(n²): 100,000,000 operations (100x)
- O(2^n): Way too many (infeasible)
```

---

## Big O Ranking (Best to Worst)

```
O(1)           Constant - Best!
O(log n)       Logarithmic - Very good (binary search)
O(n)           Linear - Good (most practical)
O(n log n)     Linearithmic - Good (efficient sorting)
O(n²)          Quadratic - Acceptable for small n
O(n³)          Cubic - Very slow
O(2^n)         Exponential - Terrible (often need optimization)
O(n!)          Factorial - Worst!

VISUALIZATION (for n=1000):
O(1):        1
O(log n):    10
O(n):        1,000
O(n log n):  10,000
O(n²):       1,000,000
O(n³):       1,000,000,000
O(2^n):      Impossible to calculate!
```

---

# PART 2: TIME COMPLEXITY ANALYSIS

## Examples

```java
// O(1) - Constant
int firstElement = array[0];
int value = map.get("key");
list.append(x);

// O(n) - Linear
for (int i = 0; i < n; i++) {
    System.out.println(arr[i]);
}

// O(n²) - Quadratic (Nested loops)
for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j++) {
        System.out.println(arr[i][j]);
    }
}

// O(n³) - Cubic (Triple nested loops)
for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j++) {
        for (int k = 0; k < n; k++) {
            // O(1) work
        }
    }
}

// O(log n) - Logarithmic (Binary search)
int low = 0, high = n;
while (low <= high) {
    int mid = low + (high - low) / 2;
    if (arr[mid] == target) return mid;
    else if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
}

// O(n log n) - Linearithmic (Efficient sorting)
Arrays.sort(arr); // Merge sort, quick sort
Collections.sort(list);

// O(2^n) - Exponential (Permutations, recursion without memoization)
void generatePermutations(String s, String current) {
    if (current.length() == s.length()) {
        result.add(current);
        return;
    }
    for (char c : s.toCharArray()) {
        generatePermutations(s, current + c);
    }
}

// O(n!) - Factorial
void generateAllOrders(int[] arr) {
    // All possible permutations
    // Too slow for n > 10
}
```

---

## How to Analyze

```
RULE 1: Drop Constants
O(5n) = O(n)
O(2n² + 3n + 1) = O(n²)
Reason: Constants don't matter for large n

RULE 2: Drop Lower Order Terms
O(n² + n) = O(n²)
O(n log n + n) = O(n log n)
Reason: Higher order dominates

RULE 3: Count Loops
No loop = O(1)
1 loop = O(n)
Nested loops = O(n²), O(n³), etc.
Independent loops = O(n) + O(n) = O(2n) = O(n)

RULE 4: Recursive Calls
Recursion = Use recurrence relation
T(n) = T(n-1) + O(1) = O(n)
T(n) = 2*T(n-1) + O(1) = O(2^n)

RULE 5: Common Operations
Array access arr[i] = O(1)
Array search = O(n)
Array insert = O(n) (shift elements)
ArrayList append = O(1) amortized
Map lookup = O(1) average
Tree search (balanced) = O(log n)
```

---

## Example Analysis

```java
// Example 1: Find max element
int findMax(int[] arr) {
    int max = arr[0];           // O(1)
    for (int i = 1; i < n; i++) { // O(n)
        if (arr[i] > max) {      // O(1)
            max = arr[i];        // O(1)
        }
    }
    return max;                  // O(1)
}
// Total: O(1) + O(n) + O(1) = O(n)

// Example 2: Nested loop
void printPairs(int[] arr) {
    for (int i = 0; i < n; i++) {          // n iterations
        for (int j = 0; j < n; j++) {      // n iterations per i
            System.out.println(arr[i] + ", " + arr[j]); // O(1)
        }
    }
}
// Total: n * n * O(1) = O(n²)

// Example 3: Loop with different sizes
void printPairs(int[] arr) {
    for (int i = 0; i < n; i++) {          // i from 0 to n
        for (int j = i; j < n; j++) {      // j from i to n
            System.out.println(arr[i] + ", " + arr[j]);
        }
    }
}
// Iterations: n + (n-1) + (n-2) + ... + 1 = n(n+1)/2 = O(n²)

// Example 4: Sequential loops
for (int i = 0; i < n; i++) {
    doSomething(arr[i]); // O(1)
}
for (int i = 0; i < n; i++) {
    doSomethingElse(arr[i]); // O(1)
}
// Total: O(n) + O(n) = O(2n) = O(n)

// Example 5: Logarithmic
for (int i = 1; i < n; i *= 2) { // i = 1, 2, 4, 8, ...
    System.out.println(i);        // log₂(n) iterations
}
// Total: O(log n)
```

---

# PART 3: SPACE COMPLEXITY ANALYSIS

## Understanding Space

```
Space Complexity = Extra memory used (excluding input)

KEY POINT: Don't count input storage
           Only count additional space for algorithm

EXAMPLES:

// O(1) - Constant space
int findMax(int[] arr) {
    int max = arr[0]; // Just one integer
    for (int i = 1; i < arr.length; i++) {
        max = Math.max(max, arr[i]);
    }
    return max;
}

// O(n) - Linear space
List<Integer> duplicateArray(int[] arr) {
    List<Integer> copy = new ArrayList<>(); // New array of size n
    for (int num : arr) {
        copy.add(num);
    }
    return copy;
}

// O(n²) - Quadratic space
int[][] multiplyMatrix(int[][] a, int[][] b) {
    int[][] result = new int[n][n]; // n² space
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            for (int k = 0; k < n; k++) {
                result[i][j] += a[i][k] * b[k][j];
            }
        }
    }
    return result;
}

// O(n) - Recursion depth
void recursiveSum(int[] arr, int i, int sum) {
    if (i == arr.length) return sum;
    return recursiveSum(arr, i + 1, sum + arr[i]);
}
// Call stack: n levels deep = O(n) space

// O(log n) - Recursion with binary search
int binarySearch(int[] arr, int target, int low, int high) {
    if (low > high) return -1;
    int mid = low + (high - low) / 2;
    if (arr[mid] == target) return mid;
    else if (arr[mid] < target) return binarySearch(arr, target, mid+1, high);
    else return binarySearch(arr, target, low, mid-1);
}
// Call stack: log n levels deep = O(log n) space
```

---

# PART 4: MASTER THEOREM

## For Recursive Algorithms

```
Master Theorem: T(n) = a*T(n/b) + f(n)

Where:
- a = number of subproblems
- n/b = size of each subproblem
- f(n) = work done at each level

EXAMPLES:

Merge Sort: T(n) = 2*T(n/2) + O(n)
a=2, b=2, f(n)=O(n)
Result: O(n log n)

Binary Search: T(n) = 1*T(n/2) + O(1)
a=1, b=2, f(n)=O(1)
Result: O(log n)

Naive Fibonacci: T(n) = 2*T(n-1) + O(1)
(Not exactly Master Theorem form, but similar)
a=2, b=1, f(n)=O(1)
Result: O(2^n)

RULES:
If f(n) = O(n^d) and d > log_b(a):
  T(n) = O(f(n)) = O(n^d)
  
If f(n) = O(n^d) and d = log_b(a):
  T(n) = O(n^d * log n) = O(f(n) * log n)
  
If f(n) = O(n^d) and d < log_b(a):
  T(n) = O(n^(log_b(a)))

PRACTICAL: Know common complexities!
- Merge Sort: O(n log n)
- Quick Sort: O(n log n) average, O(n²) worst
- Binary Search: O(log n)
```

---

# PART 5: COMMON PATTERNS & COMPLEXITY

## Data Structure Operations

```
ARRAY:
Access:     O(1)
Search:     O(n)
Insert:     O(n)
Delete:     O(n)

LINKED LIST:
Access:     O(n)
Search:     O(n)
Insert:     O(1) if position known
Delete:     O(1) if position known

HASH TABLE:
Access:     O(1) average
Search:     O(1) average
Insert:     O(1) average
Delete:     O(1) average

BALANCED TREE (BST, AVL, Red-Black):
Access:     O(log n)
Search:     O(log n)
Insert:     O(log n)
Delete:     O(log n)

HEAP:
Insert:     O(log n)
Delete:     O(log n)
Find min:   O(1)

GRAPH (with n vertices, m edges):
BFS/DFS:    O(n + m)
Dijkstra:   O((n + m) log n) with heap
```

---

## Sorting Algorithms

```
Bubble Sort:    O(n²) time, O(1) space
Selection Sort: O(n²) time, O(1) space
Insertion Sort: O(n²) time, O(1) space
Merge Sort:     O(n log n) time, O(n) space
Quick Sort:     O(n log n) average, O(n²) worst, O(log n) space
Heap Sort:      O(n log n) time, O(1) space
Counting Sort:  O(n + k) where k = range of elements
Radix Sort:     O(n * k) where k = number of digits

RULE:
- Comparison-based sort: Min O(n log n)
- Non-comparison: Can do better (counting, radix)
```

---

# PART 6: INTERVIEW TIPS

## Analyzing During Interview

```
STEP 1: Understand the input
- What's the input size? (n, m)
- What operations needed?

STEP 2: Identify patterns
- Loops? How many levels?
- Recursion? What's the branching factor?
- Data structures? What operations?

STEP 3: Count operations
- Worst case (important for Big O!)
- Average case (sometimes asked)
- Best case (rarely important)

STEP 4: Verify with examples
- Small input: Trace through code
- Large input: What happens?

STEP 5: State clearly
"This solution is O(n²) time and O(1) space because..."
```

---

## Time vs Space Trade-off

```
COMMON PATTERNS:

More Time, Less Space:
- In-place algorithms (modify input)
- Streaming/single-pass algorithms
- Example: In-place sort

Less Time, More Space:
- Caching/memoization
- Hash maps for lookups
- Pre-computation
- Example: DP with memoization

CHOOSE BASED ON CONSTRAINTS:
- Memory-constrained? Optimize space (time can suffer)
- Time-constrained? Optimize time (space can suffer)
- Usually: Time matters more than space
```

---

## Practice Analysis

```
EXERCISE 1: Analyze this code
for (int i = 0; i < n; i++) {
    for (int j = i; j < n; j++) {
        sum += arr[i][j];
    }
}

ANSWER:
Outer loop: n times
Inner loop: (n-i) times
Total: n + (n-1) + (n-2) + ... + 1 = n(n+1)/2 = O(n²)

EXERCISE 2: Analyze this recursion
void solve(int n) {
    if (n <= 1) return;
    solve(n/2);
    solve(n/2);
}

ANSWER:
T(n) = 2*T(n/2) + O(1)
Using Master Theorem: O(2^log₂(n)) = O(n)

EXERCISE 3: Worst case vs Average
Hash map get():
- Average: O(1)
- Worst case: O(n) (all collisions)
```

---

# SUMMARY: Complexity Mastery

✅ **Big O Notation:**
- [ ] Know O(1) to O(n!) rankings
- [ ] Understand constant/lower-order dropping
- [ ] Know common complexities

✅ **Time Complexity:**
- [ ] Can analyze loops (single, nested)
- [ ] Can analyze recursion
- [ ] Can identify bottlenecks

✅ **Space Complexity:**
- [ ] Know recursion depth
- [ ] Know data structure storage
- [ ] Understand amortized analysis

✅ **Interview Skills:**
- [ ] Can explain complexity clearly
- [ ] Can discuss trade-offs
- [ ] Can optimize when asked

---

**Master Big O analysis—it's fundamental to DSA! 🚀**
