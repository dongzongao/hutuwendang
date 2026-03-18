# FST 详解（有限状态转换器）

## 是什么

FST（Finite State Transducer，有限状态转换器）是 Lucene/ES 用来存储 Term Dictionary 的核心数据结构。

它是一种有向无环图（DAG），可以将一组有序字符串映射到对应的值，同时做到：
- 极致压缩：共享前缀和后缀，内存占用远小于 HashMap
- 查找 O(len)：时间复杂度只与词长度有关，与词数量无关

---

## 与 Trie 树的区别

Trie 树只共享前缀，FST 同时共享前缀和后缀：

```
词列表：cat, car, card, care, bat

Trie（只共享前缀）：
        root
       /    \
      c      b
      |      |
      a      a
     / \     |
    t   r    t
        |
       d/e

FST（同时共享后缀）：
相同的后缀节点会被合并，进一步压缩
```

---

## 在 ES 中的作用

Lucene 的索引结构分三层：

```
Term Dictionary（FST）
   ↓ 找到 Term 在 Term Index 中的位置
Term Index（磁盘）
   ↓ 找到对应的 Posting List 偏移量
Posting List（倒排列表）
   存储匹配该 Term 的所有文档 ID
```

FST 常驻内存，用于快速定位词条在磁盘上的位置，避免每次都全量扫描磁盘。

---

## 核心优势

| 对比项 | HashMap | Trie | FST |
|--------|---------|------|-----|
| 内存占用 | 大 | 中 | 极小 |
| 查找复杂度 | O(1) | O(len) | O(len) |
| 前缀查询 | 不支持 | 支持 | 支持 |
| 后缀共享 | 不支持 | 不支持 | 支持 |
| 构建复杂度 | 低 | 低 | 高（需有序输入） |

> FST 构建时要求输入有序，Lucene 在写入 Segment 时会对 Term 排序，天然满足这个条件。

---

## 简单示例

存储映射：`mon → 2, thurs → 5, tues → 3`

```
FST 构建后：
m → o → n → (output: 2)
t → h → u → r → s → (output: 5)
    u → e → s → (output: 3)

"th" 和 "tu" 共享前缀 "t"
```

查找 "tues" 时，沿路径 t→u→e→s 走一遍即可，时间复杂度 O(4)。
