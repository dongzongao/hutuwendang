---
title: MySQL 锁详解
description: 深入解析 MySQL InnoDB 锁机制，包括行锁、表锁、间隙锁、临键锁、意向锁的原理与加锁规则，以及死锁的产生原因与排查方法。
---

# MySQL 锁详解

## 锁的分类

```
MySQL 锁
├── 按粒度
│   ├── 表锁（Table Lock）
│   └── 行锁（Row Lock）
│       ├── 记录锁（Record Lock）
│       ├── 间隙锁（Gap Lock）
│       └── 临键锁（Next-Key Lock）
├── 按模式
│   ├── 共享锁 S（读锁）
│   └── 排他锁 X（写锁）
└── 意向锁（Intention Lock）
    ├── IS（意向共享锁）
    └── IX（意向排他锁）
```

---

## 行锁类型

### 记录锁（Record Lock）

锁住索引上的某一条记录，精确锁定单行。

```sql
-- 锁住 id=1 这一行
SELECT * FROM user WHERE id = 1 FOR UPDATE;
```

> 行锁锁的是索引，不是数据行本身。如果查询条件没有走索引，会退化为表锁。

### 间隙锁（Gap Lock）

锁住索引记录之间的间隙，防止其他事务在间隙中插入数据，解决幻读问题。

```
索引值：1, 5, 10, 20

间隙锁范围：(-∞,1)  (1,5)  (5,10)  (10,20)  (20,+∞)

锁住 (5,10) 这个间隙后，其他事务无法插入 id=6,7,8,9 的记录
```

间隙锁只在 `REPEATABLE READ` 隔离级别下生效，`READ COMMITTED` 下不存在间隙锁。

### 临键锁（Next-Key Lock）

= 记录锁 + 间隙锁，锁住记录本身及其左侧间隙，是 InnoDB 默认的行锁形式。

```
索引值：1, 5, 10

Next-Key Lock 范围（左开右闭）：
(-∞, 1]  (1, 5]  (5, 10]  (10, +∞)
```

---

## 意向锁

事务在加行锁之前，先在表级别加意向锁，让表锁检测时不需要遍历所有行。

| 意向锁 | 含义 |
|--------|------|
| IS | 事务打算对某些行加共享锁 |
| IX | 事务打算对某些行加排他锁 |

兼容矩阵：

|  | IS | IX | S | X |
|--|----|----|---|---|
| IS | ✅ | ✅ | ✅ | ❌ |
| IX | ✅ | ✅ | ❌ | ❌ |
| S  | ✅ | ❌ | ✅ | ❌ |
| X  | ❌ | ❌ | ❌ | ❌ |

---

## 加锁规则

InnoDB 加锁遵循以下原则（RR 隔离级别）：

1. 加锁基本单位是 Next-Key Lock（左开右闭区间）
2. 查询只访问到的对象才加锁
3. 索引上的等值查询，命中唯一索引时，Next-Key Lock 退化为记录锁
4. 索引上的等值查询，向右遍历到最后一个不满足条件的值时，退化为间隙锁
5. 唯一索引上的范围查询会访问到不满足条件的第一个值为止

```sql
-- 示例表：id 为主键，c 为普通索引
-- 数据：(1,1), (5,5), (10,10), (15,15), (20,20)

-- 等值查询命中唯一索引 → 记录锁
SELECT * FROM t WHERE id = 5 FOR UPDATE;
-- 加锁：id=5 记录锁

-- 等值查询未命中 → 间隙锁
SELECT * FROM t WHERE id = 7 FOR UPDATE;
-- 加锁：(5, 10) 间隙锁

-- 范围查询
SELECT * FROM t WHERE id >= 10 AND id < 15 FOR UPDATE;
-- 加锁：(5,10] Next-Key Lock + (10,15) 间隙锁
```

---

## 表锁

```sql
-- 手动加表锁
LOCK TABLES user READ;   -- 共享表锁
LOCK TABLES user WRITE;  -- 排他表锁
UNLOCK TABLES;
```

InnoDB 一般不需要手动加表锁，DDL 操作（ALTER TABLE）会自动加 MDL（元数据锁）。

### MDL 锁（元数据锁）

MySQL 5.5 引入，自动加锁，保护表结构不被并发修改：

- 增删改查 → 自动加 MDL 读锁
- ALTER TABLE → 自动加 MDL 写锁，需等所有读锁释放

> MDL 锁导致的问题：长事务持有 MDL 读锁，DDL 操作被阻塞，后续所有查询也被阻塞，造成雪崩。

---

## 死锁

### 产生条件

两个事务互相持有对方需要的锁：

```
事务A：锁住 id=1，等待 id=2
事务B：锁住 id=2，等待 id=1
→ 死锁
```

### InnoDB 死锁检测

InnoDB 有自动死锁检测，发现死锁后会回滚代价较小的事务（undo log 量少的），另一个事务继续执行。

### 查看死锁日志

```sql
SHOW ENGINE INNODB STATUS;
-- 查看 LATEST DETECTED DEADLOCK 部分
```

### 避免死锁的方法

1. 保持加锁顺序一致：多个事务按相同顺序访问资源
2. 缩短事务：减少事务持锁时间，尽快提交
3. 降低隔离级别：RC 级别下无间隙锁，死锁概率降低
4. 批量操作按主键排序：避免乱序加锁
5. 超时设置：`innodb_lock_wait_timeout`（默认 50s）

---

## 锁等待排查

```sql
-- 查看当前锁等待情况
SELECT * FROM information_schema.INNODB_LOCK_WAITS;

-- 查看事务持锁情况
SELECT * FROM information_schema.INNODB_TRX;

-- 查看锁详情（MySQL 8.0+）
SELECT * FROM performance_schema.data_locks;
SELECT * FROM performance_schema.data_lock_waits;
```

---

## 常见问题

### 为什么没走索引会变成表锁

行锁锁的是索引节点，没有索引就无法精确定位行，InnoDB 只能锁全表。

### SELECT 会加锁吗

- 普通 `SELECT`：不加锁，走 MVCC 快照读
- `SELECT ... FOR UPDATE`：加排他锁（X）
- `SELECT ... LOCK IN SHARE MODE`：加共享锁（S）

### RC 和 RR 锁的区别

| 隔离级别 | 间隙锁 | 幻读 |
|----------|--------|------|
| READ COMMITTED | 无 | 存在 |
| REPEATABLE READ | 有 | 通过 Next-Key Lock 解决（当前读） |
