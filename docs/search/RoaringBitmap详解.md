---
title: Roaring Bitmap 详解
description: 深入解析 Roaring Bitmap 压缩位图原理，Array/Bitmap/Run 三种容器自适应选择策略，Elasticsearch 倒排列表与 Filter 缓存的底层实现。
---

# Roaring Bitmap 详解

## 是什么

Roaring Bitmap 是一种高效的压缩位图数据结构，ES/Lucene 用它来存储倒排列表中的文档 ID 集合，并支持快速的集合运算（AND、OR、NOT）。

---

## 普通 Bitmap 的问题

普通 Bitmap 用一个 bit 表示一个文档 ID 是否存在：

```
文档 ID: 0  1  2  3  4  5  ...  1000000
Bitmap:  1  0  1  0  0  1  ...  1
```

- 优点：集合运算极快（位运算）
- 缺点：稀疏时浪费内存。如果只有 ID=1 和 ID=1000000，需要分配 125KB 内存

---

## Roaring Bitmap 原理

将 32 位文档 ID 拆分为高 16 位（容器编号）和低 16 位（容器内偏移）：

```
doc_id = 高16位(container_key) + 低16位(container_value)
```

每个容器根据数据密度自动选择存储方式：

| 容器类型 | 触发条件 | 存储方式 |
|----------|----------|----------|
| Array Container | 元素数 ≤ 4096 | 直接存 uint16 数组（稀疏） |
| Bitmap Container | 元素数 > 4096 | 65536 bit 的位图（密集） |
| Run Container | 连续区间多 | 存区间 [start, length]（连续） |

```
示例：文档 ID = [1, 2, 3, 100000, 100001, 200000]

高16位=0 的容器（Array）: [1, 2, 3]
高16位=1 的容器（Array）: [34464, 34465]  // 100000-65536, 100001-65536
高16位=3 的容器（Array）: [3392]           // 200000-3*65536
```

---

## 集合运算

AND（交集）、OR（并集）运算直接在容器级别并行执行：

```
查询: "Java" AND "并发"

Java    的文档集合: Roaring Bitmap A
并发    的文档集合: Roaring Bitmap B

A AND B：
  遍历相同 container_key 的容器对
  Array & Array → 归并排序取交集
  Bitmap & Bitmap → 位与运算
  Array & Bitmap → 遍历 Array 查 Bitmap
```

---

## 与其他方案对比

| 方案 | 稀疏场景 | 密集场景 | 集合运算 |
|------|----------|----------|----------|
| 普通数组 | 内存小 | 内存大 | 慢（需排序） |
| 普通 Bitmap | 内存极大 | 内存小 | 快 |
| Roaring Bitmap | 内存小 | 内存小 | 快 |

Roaring Bitmap 在各种场景下都能保持较优的内存和性能，是目前工业界最广泛使用的压缩位图方案。

---

## 在 ES 中的应用

- 倒排列表：每个 Term 对应的文档 ID 集合
- Filter 缓存：`filter` 查询结果缓存为 Roaring Bitmap，下次直接复用
- 删除文档标记：被删除的文档 ID 存在 `.del` 文件中，用 Bitmap 标记
