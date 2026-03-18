# MVCC 详解

## 什么是 MVCC

MVCC（Multi-Version Concurrency Control，多版本并发控制）是数据库实现并发读写的核心机制。它通过保存数据的多个历史版本，让读操作不阻塞写操作，写操作不阻塞读操作，从而大幅提升并发性能。

MySQL InnoDB 在 `READ COMMITTED` 和 `REPEATABLE READ` 隔离级别下使用 MVCC。

---

## 核心组成

### 1. 隐藏字段

InnoDB 每行数据都有三个隐藏字段：

| 字段 | 说明 |
|------|------|
| `DB_TRX_ID` | 最近一次修改该行的事务 ID |
| `DB_ROLL_PTR` | 回滚指针，指向 undo log 中的上一个版本 |
| `DB_ROW_ID` | 行 ID（无主键时自动生成） |

### 2. Undo Log（回滚日志）

每次对行数据做 UPDATE/DELETE，旧版本数据会写入 undo log，并通过 `DB_ROLL_PTR` 形成一条版本链：

```
当前行 → 版本N → 版本N-1 → ... → 最初版本
  (trx=100)   (trx=80)    (trx=50)
```

### 3. Read View（读视图）

事务发起快照读时，会生成一个 Read View，记录当前活跃事务的状态：

| 字段 | 说明 |
|------|------|
| `m_ids` | 当前所有活跃（未提交）事务 ID 列表 |
| `min_trx_id` | 活跃事务中最小的事务 ID |
| `max_trx_id` | 下一个将分配的事务 ID（即当前最大 + 1） |
| `creator_trx_id` | 创建该 Read View 的事务 ID |

---

## 可见性判断规则

对版本链中每个版本的 `DB_TRX_ID`，按以下规则判断是否对当前事务可见：

```
trx_id == creator_trx_id        → 自己修改的，可见 ✅
trx_id < min_trx_id             → 已提交的旧事务，可见 ✅
trx_id >= max_trx_id            → 在 Read View 创建之后才开启，不可见 ❌
min_trx_id <= trx_id < max_trx_id:
    trx_id 在 m_ids 中          → 活跃未提交，不可见 ❌
    trx_id 不在 m_ids 中        → 已提交，可见 ✅
```

沿版本链从新到旧遍历，找到第一个可见版本即为结果。

---

## 图解流程

```
事务 A (trx=200) 执行快照读
        │
        ▼
  生成 Read View
  m_ids = [150, 180]
  min_trx_id = 150
  max_trx_id = 201
        │
        ▼
  读取行数据，当前版本 DB_TRX_ID = 180
  180 在 m_ids 中 → 不可见 ❌
        │
        ▼ DB_ROLL_PTR
  上一版本 DB_TRX_ID = 120
  120 < min_trx_id(150) → 已提交 → 可见 ✅
        │
        ▼
  返回 trx=120 的版本数据
```

---

## RC 与 RR 的区别

| 隔离级别 | Read View 生成时机 | 效果 |
|----------|-------------------|------|
| READ COMMITTED | 每次快照读都生成新的 Read View | 能读到其他事务已提交的最新数据（不可重复读） |
| REPEATABLE READ | 事务第一次快照读时生成，后续复用 | 整个事务期间读到的数据一致（可重复读） |

---

## 快照读 vs 当前读

| 类型 | 触发方式 | 是否使用 MVCC |
|------|----------|--------------|
| 快照读 | `SELECT` | ✅ 使用 MVCC，读历史版本 |
| 当前读 | `SELECT ... FOR UPDATE` / `UPDATE` / `DELETE` / `INSERT` | ❌ 读最新版本，加锁 |

---

## MVCC 解决了什么问题

- 解决了读写互斥，提升并发性能
- 在 RR 级别下避免了不可重复读
- 配合间隙锁（Gap Lock）在 RR 级别下解决幻读

> MVCC 本身不能完全解决幻读，当前读场景下仍需依赖间隙锁。

---

## 总结

```
写操作 → 生成新版本 + 旧版本写入 undo log → 形成版本链
读操作 → 生成 Read View → 按可见性规则遍历版本链 → 返回合适版本
```

MVCC 的本质是用空间换时间：通过保留历史版本，让读写操作并发执行而互不干扰。
