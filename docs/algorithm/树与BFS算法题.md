---
title: 树与BFS算法题
description: 二叉树与BFS经典算法题解析，涵盖层序遍历、最大深度、路径总和，含多语言运行与逐步执行流程可视化
---

<script setup>
const levelOrderCodes = {
  javascript: `class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}
function levelOrder(root) {
  if (!root) return [];
  const result = [], queue = [root];
  while (queue.length) {
    const size = queue.length, level = [];
    __trace__('处理第 ' + (result.length+1) + ' 层，共 ' + size + ' 个节点', { 层: result.length+1 });
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
    __trace__('第 ' + result.length + ' 层: [' + level.join(',') + ']', { 层结果: level });
  }
  return result;
}
const root = new TreeNode(3, new TreeNode(9), new TreeNode(20, new TreeNode(15), new TreeNode(7)));
console.log(JSON.stringify(levelOrder(root)));`,

  java: `import java.util.*;

public class Solution {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        while (!queue.isEmpty()) {
            int size = queue.size();
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                TreeNode node = queue.poll();
                level.add(node.val);
                if (node.left != null) queue.offer(node.left);
                if (node.right != null) queue.offer(node.right);
            }
            result.add(level);
        }
        return result;
    }
    public static void main(String[] args) {
        TreeNode root = new TreeNode(3,
            new TreeNode(9),
            new TreeNode(20, new TreeNode(15), new TreeNode(7)));
        System.out.println(new Solution().levelOrder(root));
    }
}`,

  python: `from collections import deque

class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val; self.left = left; self.right = right

def level_order(root):
    if not root: return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left: queue.append(node.left)
            if node.right: queue.append(node.right)
        result.append(level)
    return result

root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
print(level_order(root))`,
}

const maxDepthCodes = {
  javascript: `class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}
function maxDepth(node) {
  if (!node) return 0;
  const left = maxDepth(node.left);
  const right = maxDepth(node.right);
  const depth = 1 + Math.max(left, right);
  __trace__('节点' + node.val + ': 左深' + left + ' 右深' + right + ' → ' + depth, { 节点: node.val, 深度: depth });
  return depth;
}
const root = new TreeNode(3, new TreeNode(9), new TreeNode(20, new TreeNode(15), new TreeNode(7)));
console.log('最大深度:', maxDepth(root)); // 3`,

  java: `public class Solution {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode l, TreeNode r) { this.val = val; left = l; right = r; }
    }
    public int maxDepth(TreeNode node) {
        if (node == null) return 0;
        return 1 + Math.max(maxDepth(node.left), maxDepth(node.right));
    }
    public static void main(String[] args) {
        TreeNode root = new TreeNode(3,
            new TreeNode(9),
            new TreeNode(20, new TreeNode(15), new TreeNode(7)));
        System.out.println(new Solution().maxDepth(root)); // 3
    }
}`,

  python: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val; self.left = left; self.right = right

def max_depth(node):
    if not node: return 0
    return 1 + max(max_depth(node.left), max_depth(node.right))

root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
print(max_depth(root))  # 3`,
}
</script>

# 树与 BFS 算法题

> 核心思想：BFS 用队列逐层扩展，DFS 用递归深度优先。树的大多数问题可以递归分解为左右子树的子问题。

---

## 1. 二叉树层序遍历（BFS）

队列存当前层节点，每次取出整层，同时把子节点入队，记录每层结果。

<CodeRunner lang="javascript" :codes="levelOrderCodes"></CodeRunner>

---

## 2. 二叉树最大深度

递归，`depth(node) = 1 + max(depth(left), depth(right))`，空节点返回 0。

<CodeRunner lang="javascript" :codes="maxDepthCodes"></CodeRunner>
