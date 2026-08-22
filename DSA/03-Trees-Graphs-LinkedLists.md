# Trees, Graphs & Linked Lists
## Common Patterns, Traversals, Key Algorithms

---

## TABLE OF CONTENTS
1. Linked Lists
2. Trees & Binary Search Trees
3. Graphs & Graph Algorithms
4. Key Problems & Patterns
5. Interview Tips

---

# PART 1: LINKED LISTS

## Common Patterns

```java
// PROBLEM 1: Reverse Linked List
public ListNode reverseList(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;
    
    while (curr != null) {
        ListNode next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}
// Time: O(n), Space: O(1)

// PROBLEM 2: Merge Two Sorted Lists
public ListNode mergeTwoLists(ListNode l1, ListNode l2) {
    ListNode dummy = new ListNode(0);
    ListNode curr = dummy;
    
    while (l1 != null && l2 != null) {
        if (l1.val < l2.val) {
            curr.next = l1;
            l1 = l1.next;
        } else {
            curr.next = l2;
            l2 = l2.next;
        }
        curr = curr.next;
    }
    
    curr.next = l1 != null ? l1 : l2;
    return dummy.next;
}
// Time: O(n+m), Space: O(1)

// PROBLEM 3: Detect Cycle
public boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        
        if (slow == fast) {
            return true;
        }
    }
    return false;
}
// Time: O(n), Space: O(1)

// PROBLEM 4: Remove Nth Node From End
public ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode first = dummy;
    ListNode second = dummy;
    
    // First pointer n+1 steps ahead
    for (int i = 0; i <= n; i++) {
        first = first.next;
    }
    
    // Move both until first reaches end
    while (first != null) {
        first = first.next;
        second = second.next;
    }
    
    second.next = second.next.next;
    return dummy.next;
}
// Time: O(n), Space: O(1)
```

---

## Linked List Patterns

```
PATTERN 1: Dummy Node
Problem: Handle edge case of removing head
Solution: Create dummy node pointing to head

ListNode dummy = new ListNode(0);
dummy.next = head;

PATTERN 2: Two Pointers
Problem: Find middle, kth element, cycle
Solution: Use slow and fast pointers

PATTERN 3: In-Place Reversal
Problem: Reverse list or part of list
Solution: Iterate through, reverse pointers as you go

PATTERN 4: Merging
Problem: Merge k lists
Solution: Use heap or recursively merge two at a time
```

---

# PART 2: TREES & BINARY SEARCH TREES

## Tree Traversals

```java
// INORDER TRAVERSAL (Left, Root, Right)
public List<Integer> inorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    Stack<TreeNode> stack = new Stack<>();
    TreeNode curr = root;
    
    while (curr != null || !stack.isEmpty()) {
        while (curr != null) {
            stack.push(curr);
            curr = curr.left;
        }
        curr = stack.pop();
        result.add(curr.val);
        curr = curr.right;
    }
    return result;
}
// Time: O(n), Space: O(h) where h = height

// PREORDER TRAVERSAL (Root, Left, Right)
public List<Integer> preorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    Stack<TreeNode> stack = new Stack<>();
    if (root != null) stack.push(root);
    
    while (!stack.isEmpty()) {
        TreeNode node = stack.pop();
        result.add(node.val);
        if (node.right != null) stack.push(node.right);
        if (node.left != null) stack.push(node.left);
    }
    return result;
}
// Time: O(n), Space: O(h)

// POSTORDER TRAVERSAL (Left, Right, Root)
public List<Integer> postorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    Stack<TreeNode> stack = new Stack<>();
    TreeNode curr = root;
    TreeNode last = null;
    
    while (curr != null || !stack.isEmpty()) {
        while (curr != null) {
            stack.push(curr);
            curr = curr.left;
        }
        TreeNode node = stack.peek();
        if (node.right != null && last != node.right) {
            curr = node.right;
        } else {
            result.add(node.val);
            last = stack.pop();
        }
    }
    return result;
}
// Time: O(n), Space: O(h)

// LEVEL ORDER TRAVERSAL (BFS)
public List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    
    Queue<TreeNode> queue = new LinkedList<>();
    queue.add(root);
    
    while (!queue.isEmpty()) {
        List<Integer> level = new ArrayList<>();
        int size = queue.size();
        
        for (int i = 0; i < size; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            
            if (node.left != null) queue.add(node.left);
            if (node.right != null) queue.add(node.right);
        }
        result.add(level);
    }
    return result;
}
// Time: O(n), Space: O(w) where w = max width
```

---

## Key Tree Problems

```java
// PROBLEM 1: Validate Binary Search Tree
public boolean isValidBST(TreeNode root) {
    return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);
}

private boolean validate(TreeNode node, long min, long max) {
    if (node == null) return true;
    if (node.val <= min || node.val >= max) return false;
    
    return validate(node.left, min, node.val) && 
           validate(node.right, node.val, max);
}
// Time: O(n), Space: O(h)

// PROBLEM 2: Lowest Common Ancestor
public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;
    
    TreeNode left = lowestCommonAncestor(root.left, p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);
    
    if (left != null && right != null) return root;
    return left != null ? left : right;
}
// Time: O(n), Space: O(h)

// PROBLEM 3: Path Sum II
public List<List<Integer>> pathSum(TreeNode root, int targetSum) {
    List<List<Integer>> result = new ArrayList<>();
    dfs(root, targetSum, new ArrayList<>(), result);
    return result;
}

private void dfs(TreeNode node, int remaining, List<Integer> path, List<List<Integer>> result) {
    if (node == null) return;
    
    path.add(node.val);
    
    if (node.val == remaining && node.left == null && node.right == null) {
        result.add(new ArrayList<>(path));
    } else {
        dfs(node.left, remaining - node.val, path, result);
        dfs(node.right, remaining - node.val, path, result);
    }
    
    path.remove(path.size() - 1);
}
// Time: O(n), Space: O(h)
```

---

# PART 3: GRAPHS & GRAPH ALGORITHMS

## Graph Representations

```
ADJACENCY LIST (most common):
List<Integer>[] adj = new ArrayList[n];
for (int i = 0; i < n; i++) {
    adj[i] = new ArrayList<>();
}
adj[0].add(1); // Edge 0→1

ADJACENCY MATRIX:
boolean[][] adj = new boolean[n][n];
adj[0][1] = true; // Edge 0→1

EDGE LIST:
List<int[]> edges = new ArrayList<>();
edges.add(new int[]{0, 1}); // Edge 0→1
```

---

## Graph Traversals

```java
// DFS - Depth First Search
public void dfs(int node, List<Integer>[] adj, boolean[] visited) {
    visited[node] = true;
    System.out.println(node);
    
    for (int neighbor : adj[node]) {
        if (!visited[neighbor]) {
            dfs(neighbor, adj, visited);
        }
    }
}

// BFS - Breadth First Search
public void bfs(int start, List<Integer>[] adj) {
    Queue<Integer> queue = new LinkedList<>();
    boolean[] visited = new boolean[adj.length];
    
    queue.add(start);
    visited[start] = true;
    
    while (!queue.isEmpty()) {
        int node = queue.poll();
        System.out.println(node);
        
        for (int neighbor : adj[node]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                queue.add(neighbor);
            }
        }
    }
}

// Time: O(V + E) where V = vertices, E = edges
// Space: O(V) for visited array + recursion stack/queue
```

---

## Key Graph Problems

```java
// PROBLEM 1: Number of Islands
public int numIslands(char[][] grid) {
    int count = 0;
    for (int i = 0; i < grid.length; i++) {
        for (int j = 0; j < grid[0].length; j++) {
            if (grid[i][j] == '1') {
                count++;
                dfs(grid, i, j);
            }
        }
    }
    return count;
}

private void dfs(char[][] grid, int i, int j) {
    if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length || grid[i][j] == '0') {
        return;
    }
    grid[i][j] = '0';
    dfs(grid, i+1, j);
    dfs(grid, i-1, j);
    dfs(grid, i, j+1);
    dfs(grid, i, j-1);
}
// Time: O(m*n), Space: O(m*n)

// PROBLEM 2: Course Schedule (Topological Sort)
public boolean canFinish(int numCourses, int[][] prerequisites) {
    List<Integer>[] adj = new ArrayList[numCourses];
    int[] inDegree = new int[numCourses];
    
    for (int i = 0; i < numCourses; i++) {
        adj[i] = new ArrayList<>();
    }
    
    for (int[] pre : prerequisites) {
        adj[pre[1]].add(pre[0]);
        inDegree[pre[0]]++;
    }
    
    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numCourses; i++) {
        if (inDegree[i] == 0) queue.add(i);
    }
    
    int count = 0;
    while (!queue.isEmpty()) {
        int course = queue.poll();
        count++;
        
        for (int next : adj[course]) {
            inDegree[next]--;
            if (inDegree[next] == 0) {
                queue.add(next);
            }
        }
    }
    
    return count == numCourses;
}
// Time: O(V + E), Space: O(V + E)

// PROBLEM 3: Dijkstra's Algorithm
public int[] dijkstra(int[][] edges, int n, int start) {
    List<int[]>[] adj = new ArrayList[n];
    for (int i = 0; i < n; i++) {
        adj[i] = new ArrayList<>();
    }
    
    for (int[] edge : edges) {
        adj[edge[0]].add(new int[]{edge[1], edge[2]});
    }
    
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[start] = 0;
    
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);
    pq.offer(new int[]{start, 0});
    
    while (!pq.isEmpty()) {
        int[] current = pq.poll();
        int node = current[0];
        int d = current[1];
        
        if (d > dist[node]) continue;
        
        for (int[] edge : adj[node]) {
            int neighbor = edge[0];
            int weight = edge[1];
            
            if (dist[node] + weight < dist[neighbor]) {
                dist[neighbor] = dist[node] + weight;
                pq.offer(new int[]{neighbor, dist[neighbor]});
            }
        }
    }
    
    return dist;
}
// Time: O((V + E) log V), Space: O(V + E)
```

---

# PART 4: KEY PROBLEMS SUMMARY

```
LINKED LISTS:
[ ] Reverse Linked List
[ ] Merge Two Sorted Lists
[ ] Detect Cycle
[ ] Find Middle of Linked List
[ ] Remove Nth Node From End

TREES:
[ ] Inorder/Preorder/Postorder Traversal
[ ] Level Order Traversal (BFS)
[ ] Validate Binary Search Tree
[ ] Lowest Common Ancestor
[ ] Path Sum / Path Sum II
[ ] Serialize/Deserialize Binary Tree

GRAPHS:
[ ] Number of Islands
[ ] Course Schedule (Topological Sort)
[ ] Word Ladder
[ ] Clone Graph
[ ] Alien Dictionary
[ ] Dijkstra's Algorithm
```

---

# PART 5: INTERVIEW TIPS

## Tree Problems Strategy

```
1. Recursive Approach
   - Base case (null node)
   - Recursive case (process left, right, root)
   - Return value

2. Iterative Approach
   - Use stack/queue
   - Manually manage traversal
   - Handle edge cases

3. Common Patterns
   - Counting nodes
   - Finding max/min
   - Checking properties (valid BST, balanced)
   - Path problems (sum, LCA)
```

---

## Graph Problems Strategy

```
1. Choose Representation
   - Adjacency list (most efficient)
   - Adjacency matrix (simpler sometimes)

2. Choose Algorithm
   - DFS: Recursion, backtracking
   - BFS: Shortest path in unweighted
   - Dijkstra: Shortest path with weights
   - Topological sort: Dependency ordering

3. Handle Visited/Seen
   - Prevent cycles
   - Prevent re-processing
```

---

# SUMMARY: Trees, Graphs, Linked Lists

✅ **Linked Lists:**
- [ ] Know dummy node pattern
- [ ] Know two pointer technique
- [ ] Know in-place reversal

✅ **Trees:**
- [ ] Know all traversals
- [ ] Know recursive vs iterative
- [ ] Know common patterns

✅ **Graphs:**
- [ ] Know DFS & BFS
- [ ] Know topological sort
- [ ] Know shortest path algorithms

---

**Master data structures—they're key to solving complex problems! 🚀**
