# Arrays & Strings
## Fundamental Problems, Patterns, Techniques

---

## TABLE OF CONTENTS
1. Array Basics & Patterns
2. String Techniques
3. Two Pointers Pattern
4. Sliding Window Pattern
5. Key Problems
6. Interview Questions

---

# PART 1: ARRAY BASICS & PATTERNS

## Common Array Problems

```java
// PROBLEM 1: Two Sum
// Given array, find two numbers that add to target
// Solution: Hash map
public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (seen.containsKey(complement)) {
            return new int[] {seen.get(complement), i};
        }
        seen.put(nums[i], i);
    }
    return null;
}
// Time: O(n), Space: O(n)

// PROBLEM 2: Remove Duplicates
// Remove duplicates from sorted array in-place
// Solution: Two pointers
public int removeDuplicates(int[] nums) {
    if (nums.length == 0) return 0;
    int j = 0;
    for (int i = 1; i < nums.length; i++) {
        if (nums[i] != nums[j]) {
            j++;
            nums[j] = nums[i];
        }
    }
    return j + 1;
}
// Time: O(n), Space: O(1)

// PROBLEM 3: Max Product Subarray
// Find maximum product of contiguous subarray
// Solution: DP tracking max/min
public int maxProduct(int[] nums) {
    int maxProd = nums[0];
    int minProd = nums[0];
    int result = nums[0];
    
    for (int i = 1; i < nums.length; i++) {
        int tempMax = Math.max(nums[i], Math.max(maxProd * nums[i], minProd * nums[i]));
        minProd = Math.min(nums[i], Math.min(maxProd * nums[i], minProd * nums[i]));
        maxProd = tempMax;
        result = Math.max(result, maxProd);
    }
    return result;
}
// Time: O(n), Space: O(1)

// PROBLEM 4: Rotate Array
// Rotate array by k steps
// Solution: Reverse in sections
public void rotate(int[] nums, int k) {
    k = k % nums.length;
    reverse(nums, 0, nums.length - 1);
    reverse(nums, 0, k - 1);
    reverse(nums, k, nums.length - 1);
}

private void reverse(int[] nums, int start, int end) {
    while (start < end) {
        int temp = nums[start];
        nums[start] = nums[end];
        nums[end] = temp;
        start++;
        end--;
    }
}
// Time: O(n), Space: O(1)
```

---

## Array Patterns to Know

```
PATTERN 1: Prefix Sum
Problem: Find sum of subarray quickly
Solution: Build prefix sum array

int[] prefixSum = new int[nums.length + 1];
for (int i = 0; i < nums.length; i++) {
    prefixSum[i+1] = prefixSum[i] + nums[i];
}
// Now: rangeSum(i, j) = prefixSum[j+1] - prefixSum[i]

PATTERN 2: Two Pointers (meet in middle)
Problem: Find pair or sorted order
Solution: One pointer from start, one from end

int left = 0, right = nums.length - 1;
while (left < right) {
    if (condition) {
        // Found, move appropriately
    }
}

PATTERN 3: Sliding Window
Problem: Find max/min subarray of size k
Solution: Move window across array

int left = 0;
for (int right = 0; right < nums.length; right++) {
    // Add nums[right]
    while (invalid) {
        // Remove nums[left]
        left++;
    }
    // Update result
}

PATTERN 4: XOR for finding single number
Problem: Find unpaired element
Solution: XOR all (pairs cancel out)

int result = 0;
for (int num : nums) {
    result ^= num;
}
return result;
```

---

# PART 2: STRING TECHNIQUES

## Common String Problems

```java
// PROBLEM 1: Palindrome Check
public boolean isPalindrome(String s) {
    String cleaned = s.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
    int left = 0, right = cleaned.length() - 1;
    while (left < right) {
        if (cleaned.charAt(left) != cleaned.charAt(right)) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}
// Time: O(n), Space: O(1) excluding cleaned string

// PROBLEM 2: Longest Substring Without Repeating Characters
public int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> lastIndex = new HashMap<>();
    int maxLen = 0;
    int left = 0;
    
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        if (lastIndex.containsKey(c) && lastIndex.get(c) >= left) {
            left = lastIndex.get(c) + 1;
        }
        lastIndex.put(c, right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}
// Time: O(n), Space: O(min(n, charset))

// PROBLEM 3: Valid Parentheses
public boolean isValid(String s) {
    Stack<Character> stack = new Stack<>();
    Map<Character, Character> pairs = new HashMap<>();
    pairs.put(')', '(');
    pairs.put('}', '{');
    pairs.put(']', '[');
    
    for (char c : s.toCharArray()) {
        if (pairs.containsKey(c)) {
            if (stack.isEmpty() || stack.pop() != pairs.get(c)) {
                return false;
            }
        } else {
            stack.push(c);
        }
    }
    return stack.isEmpty();
}
// Time: O(n), Space: O(n)

// PROBLEM 4: Longest Common Prefix
public String longestCommonPrefix(String[] strs) {
    if (strs.length == 0) return "";
    
    for (int i = 0; i < strs[0].length(); i++) {
        char c = strs[0].charAt(i);
        for (int j = 1; j < strs.length; j++) {
            if (i >= strs[j].length() || strs[j].charAt(i) != c) {
                return strs[0].substring(0, i);
            }
        }
    }
    return strs[0];
}
// Time: O(m*n) where m=min length, n=number of strings
```

---

# PART 3: TWO POINTERS PATTERN

## Core Concept

```
Two Pointers = One pointer from start, one from end

WHEN TO USE:
- Sorted array
- Find pair with specific sum
- Remove/rearrange elements in-place
- Merge operations

ADVANTAGES:
- O(1) space (in-place)
- O(n) time (linear pass)
- Works for many problems
```

---

## Key Problems

```java
// PROBLEM 1: Container With Most Water
// Find two lines that form max area
public int maxArea(int[] height) {
    int left = 0, right = height.length - 1;
    int maxArea = 0;
    
    while (left < right) {
        int area = (right - left) * Math.min(height[left], height[right]);
        maxArea = Math.max(maxArea, area);
        
        // Move pointer pointing to smaller height
        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }
    return maxArea;
}
// Time: O(n), Space: O(1)

// PROBLEM 2: 3Sum
// Find all triplets that sum to zero
public List<List<Integer>> threeSum(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> result = new ArrayList<>();
    
    for (int i = 0; i < nums.length - 2; i++) {
        if (nums[i] > 0) break; // Only if first < 0, sum can be 0
        if (i > 0 && nums[i] == nums[i-1]) continue; // Skip duplicates
        
        int left = i + 1, right = nums.length - 1;
        int target = -nums[i];
        
        while (left < right) {
            int sum = nums[left] + nums[right];
            if (sum == target) {
                result.add(Arrays.asList(nums[i], nums[left], nums[right]));
                
                // Skip duplicates
                while (left < right && nums[left] == nums[left+1]) left++;
                while (left < right && nums[right] == nums[right-1]) right--;
                
                left++;
                right--;
            } else if (sum < target) {
                left++;
            } else {
                right--;
            }
        }
    }
    return result;
}
// Time: O(n²), Space: O(1) excluding output

// PROBLEM 3: Trapping Rain Water
// Calculate water trapped between heights
public int trap(int[] height) {
    int left = 0, right = height.length - 1;
    int leftMax = 0, rightMax = 0;
    int water = 0;
    
    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) {
                leftMax = height[left];
            } else {
                water += leftMax - height[left];
            }
            left++;
        } else {
            if (height[right] >= rightMax) {
                rightMax = height[right];
            } else {
                water += rightMax - height[right];
            }
            right--;
        }
    }
    return water;
}
// Time: O(n), Space: O(1)
```

---

# PART 4: SLIDING WINDOW PATTERN

## Core Concept

```
Sliding Window = Variable-size window that slides across array

WHEN TO USE:
- Substring/subarray problems
- Max/min of all subarrays
- Find subarray with specific property
- Optimization from O(n²) to O(n)

TEMPLATE:
int left = 0;
for (int right = 0; right < n; right++) {
    // Expand window by adding arr[right]
    
    while (window is invalid) {
        // Shrink window from left
        left++;
    }
    
    // Window [left, right] is valid, update result
}
```

---

## Key Problems

```java
// PROBLEM 1: Minimum Window Substring
// Find minimum substring containing all chars
public String minWindow(String s, String t) {
    Map<Character, Integer> need = new HashMap<>();
    for (char c : t.toCharArray()) {
        need.put(c, need.getOrDefault(c, 0) + 1);
    }
    
    int formed = 0;
    Map<Character, Integer> window = new HashMap<>();
    int left = 0;
    int minLen = Integer.MAX_VALUE;
    int minStart = 0;
    
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        window.put(c, window.getOrDefault(c, 0) + 1);
        
        if (need.containsKey(c) && window.get(c).equals(need.get(c))) {
            formed++;
        }
        
        while (formed == need.size()) {
            if (right - left + 1 < minLen) {
                minLen = right - left + 1;
                minStart = left;
            }
            
            char leftChar = s.charAt(left);
            window.put(leftChar, window.get(leftChar) - 1);
            if (need.containsKey(leftChar) && window.get(leftChar) < need.get(leftChar)) {
                formed--;
            }
            left++;
        }
    }
    
    return minLen == Integer.MAX_VALUE ? "" : s.substring(minStart, minStart + minLen);
}
// Time: O(n+m), Space: O(m) where m = charset size

// PROBLEM 2: Longest Repeating Character Replacement
// Find longest substring with same char after k replacements
public int characterReplacement(String s, int k) {
    Map<Character, Integer> count = new HashMap<>();
    int left = 0;
    int maxFreq = 0;
    int maxLen = 0;
    
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        count.put(c, count.getOrDefault(c, 0) + 1);
        maxFreq = Math.max(maxFreq, count.get(c));
        
        // If window size - max frequency > k, shrink
        while (right - left + 1 - maxFreq > k) {
            char leftChar = s.charAt(left);
            count.put(leftChar, count.get(leftChar) - 1);
            left++;
        }
        
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}
// Time: O(n), Space: O(1)

// PROBLEM 3: Permutation in String
// Check if s2 contains permutation of s1
public boolean checkInclusion(String s1, String s2) {
    if (s1.length() > s2.length()) return false;
    
    int[] s1Count = new int[26];
    int[] windowCount = new int[26];
    
    for (char c : s1.toCharArray()) {
        s1Count[c - 'a']++;
    }
    
    for (int i = 0; i < s2.length(); i++) {
        windowCount[s2.charAt(i) - 'a']++;
        
        if (i >= s1.length()) {
            windowCount[s2.charAt(i - s1.length()) - 'a']--;
        }
        
        if (Arrays.equals(s1Count, windowCount)) {
            return true;
        }
    }
    return false;
}
// Time: O(n), Space: O(1)
```

---

# PART 5: KEY PROBLEMS TO MASTER

```
MUST KNOW (in order of difficulty):

Easy:
[ ] Two Sum
[ ] Valid Palindrome
[ ] Valid Parentheses
[ ] Longest Common Prefix
[ ] Remove Duplicates from Sorted Array

Medium:
[ ] 3Sum
[ ] Container With Most Water
[ ] Longest Substring Without Repeating Characters
[ ] Longest Repeating Character Replacement
[ ] Permutation in String
[ ] Minimum Window Substring
[ ] Trapping Rain Water

Hard:
[ ] Regular Expression Matching
[ ] Wildcard Matching
[ ] Merge k Sorted Lists
[ ] Median of Two Sorted Arrays
```

---

# PART 6: INTERVIEW TIPS

## Approach

```
1. Understand the problem
   - Input/output format
   - Constraints (array size, value range)
   - Edge cases

2. Brainstorm solutions
   - Brute force first (easy to understand)
   - Optimize (use hash maps, pointers, etc.)
   - Space-time trade-offs

3. Implement cleanly
   - Clear variable names
   - Proper comments
   - Handle edge cases

4. Test
   - Example case
   - Edge cases (empty, single element)
   - Large input

5. Analyze complexity
   - Time: Big O
   - Space: Big O
```

---

# SUMMARY: Arrays & Strings Mastery

✅ **Array Patterns:**
- [ ] Know two pointers
- [ ] Know sliding window
- [ ] Know prefix sum
- [ ] Know sorting applications

✅ **String Techniques:**
- [ ] Know palindrome checks
- [ ] Know hash map patterns
- [ ] Know sliding window for substrings

✅ **Key Skills:**
- [ ] Can optimize O(n²) to O(n)
- [ ] Can handle duplicates
- [ ] Can work in-place
- [ ] Can analyze edge cases

---

**Master arrays & strings—foundation for all DSA! 🚀**
