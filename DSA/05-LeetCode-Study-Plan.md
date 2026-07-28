# LeetCode Study Plan - 60+ Medium Problems
## Complete Roadmap with Problems Organized by Category & Patterns

---

## OVERVIEW

```
GOAL: Master 60+ LeetCode Medium problems in 8-12 weeks

APPROACH:
- Week 1-2: Arrays, Strings, Two Pointers (foundation)
- Week 3-4: Linked Lists, Stacks, Queues
- Week 5-6: Trees, Graphs, BFS/DFS
- Week 7-8: Dynamic Programming
- Week 9-10: Backtracking, Math problems
- Week 11-12: Mixed review & weak areas

DAILY PLAN:
- 2-3 problems per day
- 45-60 minutes per problem (including review)
- 1 review session per week on weak areas
```

---

## WEEK 1-2: ARRAYS, STRINGS, TWO POINTERS (Foundation)

### Arrays & Strings (10 problems)

```
EASY (Start here):
1. Two Sum #1
2. Valid Palindrome #125
3. Merge Sorted Array #88
4. Remove Duplicates from Sorted Array #26
5. Valid Parentheses #20

MEDIUM (Main focus):
6. 3Sum #15
   Pattern: Two pointers + sorting
   Difficulty: Medium
   Time: 15 min
   
7. Container With Most Water #11
   Pattern: Two pointers (greedy)
   Difficulty: Medium
   Time: 15 min
   
8. Longest Substring Without Repeating Characters #3
   Pattern: Sliding window
   Difficulty: Medium
   Time: 20 min
   
9. Longest Repeating Character Replacement #424
   Pattern: Sliding window
   Difficulty: Medium
   Time: 20 min
   
10. Minimum Window Substring #76
    Pattern: Sliding window + hash map
    Difficulty: Hard (include as stretch)
    Time: 30 min
```

---

## WEEK 2-3: LINKED LISTS (8 problems)

```
MEDIUM:
11. Reverse Linked List #206
    Pattern: In-place reversal
    Time: 10 min
    
12. Merge Two Sorted Lists #21
    Pattern: Two pointers merge
    Time: 10 min
    
13. Remove Nth Node From End of List #19
    Pattern: Two pointers (dummy node)
    Time: 15 min
    
14. Reorder List #143
    Pattern: Find middle + reverse + merge
    Time: 25 min
    
15. Palindrome Linked List #234
    Pattern: Fast/slow pointer
    Time: 15 min
    
16. Linked List Cycle #141
    Pattern: Fast/slow pointer detection
    Time: 10 min
    
17. Intersection of Two Linked Lists #160
    Pattern: Two pointers
    Time: 10 min
    
18. Odd Even Linked List #328
    Pattern: Rearrange nodes
    Time: 15 min
```

---

## WEEK 4-5: STACKS, QUEUES, HASH MAPS (10 problems)

```
MEDIUM:
19. Evaluate Reverse Polish Notation #150
    Pattern: Stack
    Time: 15 min
    
20. Daily Temperatures #739
    Pattern: Monotonic stack
    Time: 15 min
    
21. Next Greater Element #496
    Pattern: Monotonic stack
    Time: 15 min
    
22. Design Twitter #355
    Pattern: Heap + Hash maps (Design)
    Time: 30 min
    
23. LRU Cache #146
    Pattern: Hash map + Doubly linked list (Design)
    Time: 30 min
    
24. Top K Frequent Elements #347
    Pattern: Heap + Hash map
    Time: 20 min
    
25. Group Anagrams #49
    Pattern: Hash map + sorting
    Time: 15 min
    
26. Valid Sudoku #36
    Pattern: Hash sets (validation)
    Time: 15 min
    
27. Majority Element #169
    Pattern: Hash map / Boyer-Moore
    Time: 15 min
    
28. Longest Consecutive #128
    Pattern: Hash set (clever approach)
    Time: 20 min
```

---

## WEEK 5-6: TREES (12 problems)

```
MEDIUM:
29. Binary Tree Inorder Traversal #94
    Pattern: Iterative traversal
    Time: 10 min
    
30. Binary Tree Level Order Traversal #102
    Pattern: BFS
    Time: 15 min
    
31. Maximum Depth of Binary Tree #104
    Pattern: Recursion
    Time: 10 min
    
32. Symmetric Tree #101
    Pattern: Recursion (compare subtrees)
    Time: 15 min
    
33. Validate Binary Search Tree #98
    Pattern: Recursion (pass bounds)
    Time: 15 min
    
34. Lowest Common Ancestor of BST #235
    Pattern: BST property
    Time: 10 min
    
35. Lowest Common Ancestor of BT #236
    Pattern: Recursion (post-order)
    Time: 15 min
    
36. Binary Tree Path Sum #112
    Pattern: DFS (root-to-leaf paths)
    Time: 10 min
    
37. Path Sum II #113
    Pattern: Backtracking on tree
    Time: 20 min
    
38. Flatten Binary Tree to Linked List #114
    Pattern: Pre-order traversal
    Time: 15 min
    
39. Construct Binary Tree from Preorder and Inorder #105
    Pattern: Recursion (divide and conquer)
    Time: 20 min
    
40. Serialize and Deserialize Binary Tree #297
    Pattern: BFS/DFS + string parsing (Hard - include as stretch)
    Time: 30 min
```

---

## WEEK 7: GRAPHS & BFS/DFS (10 problems)

```
MEDIUM:
41. Number of Islands #200
    Pattern: DFS/BFS island counting
    Time: 15 min
    
42. Clone Graph #133
    Pattern: DFS/BFS graph traversal
    Time: 20 min
    
43. Course Schedule #207
    Pattern: Topological sort (BFS)
    Time: 20 min
    
44. Course Schedule II #210
    Pattern: Topological sort (return order)
    Time: 20 min
    
45. Rotting Oranges #994
    Pattern: Multi-source BFS
    Time: 20 min
    
46. Walls and Gates #286
    Pattern: Multi-source BFS
    Time: 15 min
    
47. Word Ladder #127
    Pattern: BFS shortest path
    Time: 25 min
    
48. Pacific Atlantic Water Flow #417
    Pattern: DFS from boundaries
    Time: 20 min
    
49. Graph Valid Tree #261
    Pattern: Union-Find or DFS
    Time: 15 min
    
50. Number of Connected Components #323
    Pattern: Union-Find or DFS
    Time: 15 min
```

---

## WEEK 8-9: DYNAMIC PROGRAMMING (15 problems)

```
MEDIUM:
51. Climbing Stairs #70
    Pattern: Simple DP (1D)
    Time: 10 min
    
52. House Robber #198
    Pattern: 1D DP (rolling array)
    Time: 10 min
    
53. Unique Paths #62
    Pattern: 2D DP
    Time: 15 min
    
54. Unique Paths II #63
    Pattern: 2D DP with obstacles
    Time: 15 min
    
55. Coin Change #322
    Pattern: 1D DP (min coins)
    Time: 15 min
    
56. Word Break #139
    Pattern: 1D DP + hash set
    Time: 15 min
    
57. Longest Increasing Subsequence #300
    Pattern: 1D DP or binary search
    Time: 20 min
    
58. Edit Distance #72
    Pattern: 2D DP
    Time: 20 min
    
59. Maximum Subarray #53
    Pattern: DP (Kadane's algorithm)
    Time: 10 min
    
60. Jump Game #55
    Pattern: Greedy/DP
    Time: 15 min
    
61. Jump Game II #45
    Pattern: Greedy approach
    Time: 15 min
    
62. Partition Equal Subset Sum #416
    Pattern: 1D DP (0/1 knapsack)
    Time: 20 min
    
63. Longest Common Subsequence #1143
    Pattern: 2D DP
    Time: 15 min
    
64. Decode Ways #91
    Pattern: 1D DP
    Time: 20 min
    
65. Longest Palindromic Subsequence #516
    Pattern: 2D DP
    Time: 15 min
```

---

## WEEK 10: BACKTRACKING & MATH (8 problems)

```
MEDIUM:
66. Permutations #46
    Pattern: Backtracking (permutations)
    Time: 15 min
    
67. Combinations #77
    Pattern: Backtracking (combinations)
    Time: 15 min
    
68. Combination Sum #39
    Pattern: Backtracking (with repetition)
    Time: 20 min
    
69. Combination Sum II #40
    Pattern: Backtracking (no repetition)
    Time: 20 min
    
70. Subsets #78
    Pattern: Backtracking (iterative or recursive)
    Time: 15 min
    
71. Subsets II #90
    Pattern: Backtracking with duplicates
    Time: 15 min
    
72. Letter Combinations of Phone Number #17
    Pattern: Backtracking (iterative/recursive)
    Time: 15 min
    
73. Generate Parentheses #22
    Pattern: Backtracking (constraint satisfaction)
    Time: 20 min
```

---

## STUDY SCHEDULE SUMMARY

```
Week 1-2:   Arrays, Strings, Two Pointers   (10 problems)
Week 2-3:   Linked Lists                    (8 problems)
Week 4-5:   Stacks, Queues, Hash Maps      (10 problems)
Week 5-6:   Trees                           (12 problems)
Week 7:     Graphs & BFS/DFS               (10 problems)
Week 8-9:   Dynamic Programming            (15 problems)
Week 10:    Backtracking & Math             (8 problems)
─────────────────────────────────────────────────────
TOTAL:                                      (73 problems)

Additional stretch (10+ more):
- Binary Search problems
- Bit Manipulation
- Trie problems
- Math problems (Pow, Sqrt, etc.)
```

---

## DAILY PRACTICE CHECKLIST

```
EACH PROBLEM:
[ ] Read problem carefully (5 min)
[ ] Think about approach (10 min)
[ ] Code solution (15 min)
[ ] Test with examples (5 min)
[ ] Optimize if needed (10 min)
[ ] Review solution on LeetCode (5 min)
[ ] Identify patterns for future (5 min)

TOTAL PER PROBLEM: ~45-60 minutes

If stuck (20+ min without progress):
[ ] Look at hints
[ ] Check similar problems
[ ] Review relevant data structure
[ ] Come back to it after solving 2-3 others
```

---

## WEEKLY REVIEW SESSION

```
EVERY SUNDAY (60-90 min):
1. Review weak problems (10 min)
   - Problems you struggled with
   - Re-solve without looking at solution
   
2. Practice common patterns (30 min)
   - Two pointers
   - Sliding window
   - DFS/BFS
   - DP
   
3. Create notes (20 min)
   - Pattern summary
   - Common mistakes
   - Key insights
   
4. Plan next week (10 min)
   - Which problems to focus on
   - Any areas needing extra work
```

---

## PROGRESSION LEVELS

```
LEVEL 1 (Foundational - Weeks 1-3):
- Understand basic patterns
- Can solve with hints
- 70-80% accuracy

LEVEL 2 (Intermediate - Weeks 4-7):
- Can solve without hints
- Write clean code
- Optimize solutions
- 85-90% accuracy

LEVEL 3 (Advanced - Weeks 8-10):
- Solve in <30 minutes
- Optimal solution immediately
- Can teach others
- 95%+ accuracy

SUCCESS: Can solve 70% of medium problems in <30 minutes
```

---

## IMPORTANT TIPS

```
1. UNDERSTAND BEFORE MEMORIZING
   - Why does this algorithm work?
   - How would you explain it?
   - Don't just copy solutions

2. RECOGNIZE PATTERNS
   - Same pattern in different problems
   - Two pointers, DFS, DP, etc.
   - Pattern recognition = speed

3. DISCUSS & TEACH
   - Explain solution to someone
   - Write up solution
   - Teaching cements understanding

4. TRACK MISTAKES
   - Keep list of problems you got wrong
   - Understand why
   - Review monthly

5. CONSISTENT SCHEDULE
   - 1-2 hours daily > 7 hours once/week
   - Build habits
   - Steady progress

6. DON'T SKIP EASY
   - Use easy to warm up
   - Learn patterns early
   - Build confidence

7. TIME YOURSELF
   - Practice under time pressure
   - Interview is timed
   - Getting faster matters

8. REVIEW CODE QUALITY
   - Variable names matter
   - Comments for clarity
   - Clean, readable code
```

---

## PROBLEM DIFFICULTY PROGRESSION

```
EASY:         Good foundation, warm up
MEDIUM:       Main interview level
              Most of your practice here
HARD:         Only if extra time
              Shows excellence
              Don't get stuck

RULE:
- 80% of time on MEDIUM
- 15% of time on EASY (foundations)
- 5% of time on HARD (stretch)
```

---

## FINAL CHECKLIST (Week 10-12)

```
Before interview:
[ ] Solved 60+ medium problems
[ ] Can recognize patterns immediately
[ ] Can code solution in <30 min
[ ] Code is clean and readable
[ ] Can optimize space/time
[ ] Know complexity analysis
[ ] Comfortable with all data structures
[ ] Can solve tree/graph/DP problems
[ ] Practiced mock interviews
[ ] Discussed solutions with others
[ ] Keep problems list for review
```

---

# BONUS: PROBLEM PATTERNS QUICK REFERENCE

```
TWO POINTERS:
- Two Sum II, 3Sum, Container With Most Water
- Remove elements, palindrome check

SLIDING WINDOW:
- Longest substring, permutation in string
- Minimum window substring

BFS:
- Level order, word ladder, rotting oranges
- Shortest path in unweighted graph

DFS:
- Island counting, path sum
- Graph connected components

DP:
- Coin change, climbing stairs, house robber
- Longest subsequence, edit distance

BACKTRACKING:
- Permutations, combinations, subsets
- Letter combinations, generate parentheses

TREE TRAVERSAL:
- Inorder, preorder, postorder
- Level order, path problems

TOPOLOGICAL SORT:
- Course schedule, alien dictionary

GRAPH PROBLEMS:
- Clone graph, number of islands
- Connected components, valid tree
```

---

# SUMMARY: 60+ Problem Mastery Plan

```
GOAL: Master all fundamental patterns

APPROACH:
1. Solve problems daily (2-3/day)
2. Understand patterns
3. Practice similar problems
4. Review and optimize
5. Teach and discuss

TIMELINE: 8-12 weeks
DAILY: 1-2 hours
WEEKLY: 1 review session

SUCCESS CRITERIA:
✅ Can solve 70% in <30 min
✅ Know all patterns
✅ Clean code quality
✅ Can optimize complexity
```

---

**Start with Week 1, do 2 problems daily, finish in 10-12 weeks! 🚀**
