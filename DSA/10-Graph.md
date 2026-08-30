### Graph Cheatsheet – Patterns, Code, and Explanation
```js
const edges = [
  ["A", "B"],
  ["A", "C"],
  ["B", "D"],
  ["B", "E"],
  ["C", "F"],
  ["E", "F"],
];

const needToMakeAdjecent = {
  A: ["B", "C"],
  B: ["A", "D", "E"],
  C: ["A", "F"],
  D: ["B"],
  E: ["B", "F"],
  F: ["C", "E"],
};

const graph = () => {
  const adjecent = {};
  for (const [src, des] of edges) {
    if (!adjecent[src]) adjecent[src] = [];
    if (!adjecent[des]) adjecent[des] = [];

    adjecent[src].push(des);
    adjecent[des].push(src);
  }
  return adjecent;
};
const graphTraversals = (edges) => {
  const adjecent = graph(edges);

  const bfs = (startFrom) => {
    const set = new Set();
    let q = [startFrom];
    const result = [];

    while (q.length > 0) {
      const node = q.shift();
      if (!set.has(node)) {
        set.add(node);
        result.push(node);
        for (const key of adjecent[node]) {
          if (!set.has(key)) {
            q.push(key);
          }
        }
      }
    }
    return result;
  };
//---------------------------------------------------------------------------
  const dfsSet = new Set();
  const result = [];

  const dfs = (node) => {
    dfsSet.add(node);
    result.push(node);

    for (const key of adjecent[node]) {
      if (!dfsSet.has(key)) dfs(key);
    }
  };

  dfs("A");
  console.log(result);
};

graphTraversals(edges);


```
---

## ✅ 1. Topological Sort (DFS-based)


Topological Sort: sorting condition-> parent should print before the child

So, topological sort will not work on:
1. directed graph: parent <=> child
2. Acyclic graph: if a graph has a cycle, a parent can be a child

```pre
 a->b->c    => a, d, b, c
    ^
    |
    d
```
DFS => start point b 
visite [0,0,0,0]=>
    [0,1,0,0]=> result []
    [0,1,1,0]=> result []

    before recursion end push (end)value=> push c=> result [c]
    push b => result [c,b]

    check visted pass index 0=> [1,1,1,0] => push [c,b,a]
    check visited pass index 3=> [1,1,1,0] => push [c,b, a, d]


**Steps:**
- Use a `visited` set to track visited nodes.
- Use a `recStack` to detect cycles (if needed).
- Use a `result` array to store topological order.
- For each unvisited node, call DFS.
- In DFS:
  - Mark the node as visited.
  - Recursively visit all unvisited neighbors.
  - After exploring all neighbors, add to the result (post-order).


```js
const topologicalSortDFS = (v, edges) => {
    const adj = {};
    for (const [src, dest] of edges) {
        if (!adj[src]) adj[src] = [];
        adj[src].push(dest);
    }

    const visited = new Set();
    const result = [];

    const dfs = (node) => {
        visited.add(node);
        for (const neighbor of adj[node] || []) {
            if (!visited.has(neighbor)) dfs(neighbor);
        }
        result.push(node); // post-order
    };

    for (let i = 0; i < v; i++) {
        if (!visited.has(i)) dfs(i);
    }

    return result.reverse();
};
```

---

## ✅ 2. Topological Sort (Kahn’s Algorithm - BFS)

**Steps:**
- Use `adjacency list` and `indegree map`.
- Push all nodes with `indegree = 0` to queue.
- While queue is not empty:
  - Remove node, add to result.
  - Reduce indegree of neighbors.
  - If neighbor indegree becomes 0, push to queue.
- If result length != v → cycle exists.

```js
const topologicalSort_Kahn = (v, edges) => {
    const adjacency = {};
    const indegree = new Map();

    for (const [src, dest] of edges) {
        if (!adjacency[src]) adjacency[src] = [];
        adjacency[src].push(dest);

        indegree.set(dest, (indegree.get(dest) || 0) + 1);
        if (!indegree.has(src)) indegree.set(src, 0);
    }

    const queue = [];
    for (let i = 0; i < v; i++) {
        if (!indegree.has(i)) indegree.set(i, 0);
        if (indegree.get(i) === 0) queue.push(i);
    }

    const topoSort = [];
    while (queue.length > 0) {
        const node = queue.shift();
        topoSort.push(node);

        for (const neighbor of adjacency[node] || []) {
            indegree.set(neighbor, indegree.get(neighbor) - 1);
            if (indegree.get(neighbor) === 0) queue.push(neighbor);
        }
    }

    const isCycle = topoSort.length !== v;
    return { isCycle, topologicalOrder: isCycle ? [] : topoSort };
};
```

---

## ✅ 3. Number of Islands (DFS on Grid)

**Steps:**
- Use nested loop to scan the grid.
- On encountering '1', start DFS and increase island count.
- In DFS:
  - Mark cell as visited (grid[row][col] = '0')
  - Visit all 4 directions (up, down, left, right).

```js
const numIslands = (grid) => {
    const rows = grid.length;
    const cols = grid[0].length;
    let count = 0;

    const dfs = (r, c) => {
        if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] === '0') return;
        grid[r][c] = '0';
        dfs(r + 1, c);
        dfs(r - 1, c);
        dfs(r, c + 1);
        dfs(r, c - 1);
    };

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === '1') {
                dfs(r, c);
                count++;
            }
        }
    }

    return count;
};
```

---

## ✅ 4. Cycle Detection in Directed Graph (DFS)

**Steps:**
- Use a `visited` set and a `recStack` to track nodes in current DFS path.
- For each unvisited node, call DFS.
- In DFS:
  - Mark node visited and add to recStack.
  - If neighbor is in recStack → cycle detected.
  - Remove node from recStack after recursion.

```js
const hasCycleDirected = (v, edges) => {
    const adj = {};
    for (const [src, dest] of edges) {
        if (!adj[src]) adj[src] = [];
        adj[src].push(dest);
    }

    const visited = new Set();
    const recStack = new Set();

    const dfs = (node) => {
        visited.add(node);
        recStack.add(node);

        for (const neighbor of adj[node] || []) {
            if (!visited.has(neighbor) && dfs(neighbor)) return true;
            else if (recStack.has(neighbor)) return true;
        }

        recStack.delete(node);
        return false;
    };

    for (let i = 0; i < v; i++) {
        if (!visited.has(i)) {
            if (dfs(i)) return true;
        }
    }
    return false;
};
```

---

## ✅ 5. Cycle Detection in Undirected Graph (DFS)

**Steps:**
- Use `visited` set.
- Track parent of node to skip back edge.
- In DFS:
  - If neighbor is visited and not parent → cycle.

```js
const hasCycleUndirected = (v, edges) => {
    const adj = {};
    for (const [u, v] of edges) {
        if (!adj[u]) adj[u] = [];
        if (!adj[v]) adj[v] = [];
        adj[u].push(v);
        adj[v].push(u);
    }

    const visited = new Set();

    const dfs = (node, parent) => {
        visited.add(node);
        for (const neighbor of adj[node] || []) {
            if (!visited.has(neighbor)) {
                if (dfs(neighbor, node)) return true;
            } else if (neighbor !== parent) {
                return true;
            }
        }
        return false;
    };

    for (let i = 0; i < v; i++) {
        if (!visited.has(i)) {
            if (dfs(i, -1)) return true;
        }
    }
    return false;
};
```

---

## ✅ 6. Union-Find (Disjoint Set) - Cycle Detection

**Steps:**
- Each node has a parent. Initially, node is its own parent.
- Use `find()` to get root parent.
- Use `union()` to join sets.
- If two nodes already share same root → cycle.

```js
const hasCycleUnionFind = (v, edges) => {
    const parent = Array(v).fill(0).map((_, i) => i);

    const find = (x) => {
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
    };

    const union = (x, y) => {
        const px = find(x);
        const py = find(y);
        if (px === py) return false; // cycle
        parent[py] = px;
        return true;
    };

    for (const [u, v] of edges) {
        if (!union(u, v)) return true;
    }
    return false;
};
```

---

## ✅ 7. Check if Graph is Bipartite (DFS Coloring)

**Steps:**
- Use color map (two colors: 0 and 1).
- DFS each unvisited node, alternate colors.
- If adjacent node has same color → not bipartite.

```js
const isBipartite = (graph) => {
    const color = {};

    const dfs = (node, c) => {
        if (color[node] !== undefined) return color[node] === c;
        color[node] = c;
        for (const neighbor of graph[node]) {
            if (!dfs(neighbor, 1 - c)) return false;
        }
        return true;
    };

    for (let i = 0; i < graph.length; i++) {
        if (color[i] === undefined) {
            if (!dfs(i, 0)) return false;
        }
    }
    return true;
};
```

---

## ✅ 8. Shortest Path from Source (BFS - Unweighted Graph)

**Steps:**
- Use queue for BFS.
- Track distances in an array/map.
- Start from source, mark distance = 0.
- Update distances as you explore neighbors.

```js
const shortestPathBFS = (v, edges, start) => {
    const adj = {};
    for (const [u, v] of edges) {
        if (!adj[u]) adj[u] = [];
        if (!adj[v]) adj[v] = [];
        adj[u].push(v);
        adj[v].push(u);
    }

    const dist = Array(v).fill(-1);
    const queue = [start];
    dist[start] = 0;

    while (queue.length > 0) {
        const node = queue.shift();
        for (const neighbor of adj[node]) {
            if (dist[neighbor] === -1) {
                dist[neighbor] = dist[node] + 1;
                queue.push(neighbor);
            }
        }
    }
    return dist;
};
```

---

## ✅ 9. Connected Components in Undirected Graph (DFS)

**Steps:**
- Use visited set.
- Run DFS on all unvisited nodes.
- Count how many DFS calls → number of components.

```js
const countConnectedComponents = (v, edges) => {
    const adj = {};
    for (const [u, v] of edges) {
        if (!adj[u]) adj[u] = [];
        if (!adj[v]) adj[v] = [];
        adj[u].push(v);
        adj[v].push(u);
    }

    const visited = new Set();

    const dfs = (node) => {
        visited.add(node);
        for (const neighbor of adj[node]) {
            if (!visited.has(neighbor)) dfs(neighbor);
        }
    };

    let count = 0;
    for (let i = 0; i < v; i++) {
        if (!visited.has(i)) {
            dfs(i);
            count++;
        }
    }
    return count;
};
```

---

✅ All core graph patterns added! Let me know if you want these exported to PDF or include practice problems for each.