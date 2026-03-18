---
title: Elasticsearch 详解
description: 深入解析 Elasticsearch 核心原理，包括倒排索引、集群架构、Segment 写入流程、Query Then Fetch 两阶段查询、BM25 评分、深分页优化及与 MySQL 协同架构。
---

# Elasticsearch 详解

## 核心概念

| ES 概念 | 类比 MySQL | 说明 |
|---------|-----------|------|
| Index | 表 | 存储同类文档的集合 |
| Document | 行 | 一条 JSON 数据 |
| Field | 列 | 文档中的字段 |
| Shard | 分区 | 索引的物理分片，支持水平扩展 |
| Replica | 从库 | 分片的副本，提供高可用和读扩展 |

---

## 集群架构

```
Client
   ↓
Coordinating Node（协调节点）
   ↓ 路由
Data Node 1    Data Node 2    Data Node 3
[Shard 0]      [Shard 1]      [Shard 2]
[Replica 1]    [Replica 2]    [Replica 0]
```

| 节点类型 | 职责 |
|----------|------|
| Master Node | 管理集群元数据、索引创建删除、节点加入退出 |
| Data Node | 存储数据，执行 CRUD 和搜索计算 |
| Coordinating Node | 接收客户端请求，路由分发，汇总结果 |
| Ingest Node | 数据预处理管道（可选） |

---

## 倒排索引原理

ES 全文搜索快的核心。

**正排索引（MySQL）**：文档 ID → 词列表
**倒排索引（ES）**：词 → 文档 ID 列表 + 位置信息

```
文档1: "Java 并发编程"
文档2: "Java 虚拟机"
文档3: "并发与锁"

倒排索引：
Java    → [文档1, 文档2]
并发    → [文档1, 文档3]
编程    → [文档1]
虚拟机  → [文档2]
锁      → [文档3]
```

搜索 "Java 并发" 时，分词后取各词的文档列表求交集 → 文档1，速度极快。

每个词条（Term）在倒排索引中还存储了：
- 词频（TF）：该词在文档中出现次数，影响相关性评分
- 位置信息：支持短语查询
- 偏移量：支持高亮显示

---

## 写入流程

```
1. 请求到 Coordinating Node
2. 根据 routing 计算目标主分片
   shard = hash(_routing) % 主分片数
3. 转发到对应 Data Node 的主分片
4. 写入内存 Buffer + Translog（WAL）
5. refresh（默认 1s）→ Buffer 写入 Segment，数据可被搜索
6. flush → Segment fsync 持久化到磁盘，清空 Translog
```

> refresh 之前数据不可搜索，这是 ES 近实时（NRT）而非实时的原因。
> Translog 类似 MySQL 的 redo log，保证节点崩溃后数据不丢失。

**Segment 合并（Merge）：**

小 Segment 会不断合并成大 Segment，合并时删除标记为 deleted 的文档，释放空间。合并由后台线程自动执行，也可手动触发 `forcemerge`。

---

## 查询流程（Query Then Fetch）

```
第一阶段 - Query：
Coordinating Node
   ↓ 广播
所有相关 Shard（主或副本）
   ↓ 各自返回
匹配的 doc_id + 相关性分数（不含完整数据）

第二阶段 - Fetch：
Coordinating Node 汇总，按分数排序取 Top N
   ↓ 回查
对应 Shard 拉取完整文档数据
   ↓
返回给客户端
```

---

## 常用查询 DSL

```json
// 全文搜索（分词匹配）
{ "match": { "title": "Java 并发" } }

// 精确匹配（不分词，适合 keyword 类型）
{ "term": { "status": "active" } }

// 范围查询
{ "range": { "age": { "gte": 18, "lte": 30 } } }

// 复合查询
{
  "bool": {
    "must":     [{ "match": { "title": "Java" } }],
    "filter":   [{ "term":  { "status": "active" } }],
    "should":   [{ "match": { "tag": "热门" } }],
    "must_not": [{ "term":  { "deleted": true } }]
  }
}

// 聚合统计
{
  "aggs": {
    "by_status": {
      "terms": { "field": "status" }
    }
  }
}
```

> `filter` 不计算相关性分数，结果会被缓存，性能优于 `must`，能用 filter 的场景尽量用 filter。

---

## 分词器

| 分词器 | 说明 | 适用场景 |
|--------|------|----------|
| standard | 按空格/标点分词 | 英文 |
| ik_max_word | 中文最细粒度分词 | 中文全文搜索 |
| ik_smart | 中文智能分词，粒度较粗 | 中文精准搜索 |
| pinyin | 拼音分词 | 拼音搜索 |

---

## 相关性评分（BM25）

ES 默认使用 BM25 算法计算文档与查询的相关性：

```
score = IDF × TF_normalized

IDF（逆文档频率）：词在所有文档中越稀有，分数越高
TF（词频）：词在当前文档出现越多，分数越高（但有上限，避免刷词）
```

可通过 `boost` 参数手动调整字段权重：

```json
{
  "multi_match": {
    "query": "Java",
    "fields": ["title^3", "content^1"]  // title 权重是 content 的 3 倍
  }
}
```

---

## 技术分析

### 为什么 ES 搜索快

1. 倒排索引：词 → 文档的映射，避免全表扫描
2. FST（有限状态转换器）：Term Dictionary 用 FST 压缩存储，内存占用小，查找 O(len)
3. Roaring Bitmap：文档 ID 集合用位图压缩，集合运算（AND/OR）极快
4. 列式存储（Doc Values）：聚合、排序走列存，避免加载无关字段
5. 分片并行：查询分发到多个 Shard 并行执行，天然水平扩展

### ES 的局限性

| 问题 | 原因 | 应对 |
|------|------|------|
| 近实时，非实时 | refresh 默认 1s | 写入后手动 refresh，或接受延迟 |
| 不支持事务 | 分布式架构设计取舍 | 主库用 MySQL，ES 做搜索副本 |
| 深分页性能差 | from+size 需要每个 Shard 返回大量数据再汇总 | 用 search_after 替代 |
| 数据一致性弱 | 副本异步同步 | 重要数据以 MySQL 为准 |
| 频繁更新性能差 | 更新 = 标记删除 + 新增，Segment 不可变 | 减少更新频率，批量操作 |

### 深分页问题

```
from=10000, size=10

每个 Shard 需返回 10010 条数据
5 个 Shard → Coordinating Node 汇总 50050 条
再取 Top 10 → 内存和网络开销极大
```

解决方案：

```json
// search_after：基于上一页最后一条数据的排序值翻页
{
  "sort": [{ "timestamp": "desc" }, { "_id": "asc" }],
  "search_after": [1700000000000, "doc_123"],
  "size": 10
}
```

### 与 MySQL 协同架构

```
写入：业务服务 → MySQL（主库）
同步：Canal/Binlog → MQ → ES 同步服务 → ES
查询：搜索请求 → ES；精确查询 → MySQL
```

---

## ES vs MySQL 选型

| 场景 | 选择 |
|------|------|
| 全文搜索、模糊搜索 | ES |
| 日志分析、聚合统计 | ES |
| 强事务、精确查询 | MySQL |
| 多表关联查询 | MySQL |
| 地理位置搜索 | ES |

---

## 性能优化要点

- 写入：用 `bulk` 批量写入，调大 `refresh_interval`（如 `30s`），关闭副本写入后再开启
- 查询：`filter` 代替 `query`，避免 `wildcard` 前缀模糊（`*keyword`），用 `keyword` 类型做精确匹配
- 分片：单分片建议 10~50GB，节点数 × 3 左右为宜，避免过多小分片
- 映射：提前定义 Mapping，关闭不需要的 `_source`、`norms`，减少存储
- 内存：堆内存设为机器内存的 50%，剩余留给文件系统缓存
