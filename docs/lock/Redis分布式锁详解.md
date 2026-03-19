---
title: Redis 分布式锁详解
description: 深入解析 Redis 分布式锁实现原理，包括 SETNX 基础实现、过期时间与原子性问题、Lua 脚本保证原子释放、Redisson 看门狗续期机制及 RedLock 算法。
---

# Redis 分布式锁详解

## 为什么需要分布式锁

单机环境下用 synchronized / ReentrantLock 即可，但多实例部署时，不同进程的锁互不感知，需要借助外部存储实现跨进程的互斥。

---

## 基础实现：SETNX

```java
// 加锁：key 不存在时设置，返回 1 成功，0 失败
SET lock_key unique_value NX PX 30000
// NX = Not Exists，PX = 过期时间（毫秒）

// 释放锁：用 Lua 脚本保证原子性
String luaScript =
    "if redis.call('get', KEYS[1]) == ARGV[1] then " +
    "    return redis.call('del', KEYS[1]) " +
    "else return 0 end";
redisTemplate.execute(new DefaultRedisScript<>(luaScript, Long.class),
    List.of("lock_key"), "unique_value");
```

### 关键点

1. `unique_value` 必须唯一（UUID），防止误删其他线程的锁
2. 必须设置过期时间，防止持锁线程崩溃后锁永不释放
3. 释放锁必须用 Lua 脚本，保证「查询+删除」的原子性

### 误删问题

```
线程A 加锁，业务执行超时，锁自动过期
线程B 加锁成功
线程A 业务执行完，删除了线程B 的锁  ← 错误！

解决：释放时校验 value 是否是自己设置的
```

---

## Redisson 实现

Redisson 是生产级 Redis 分布式锁实现，解决了基础实现的所有问题。

```java
RLock lock = redissonClient.getLock("lock_key");

// 加锁（默认 30s 过期，看门狗自动续期）
lock.lock();

// 加锁（指定过期时间，不启用看门狗）
lock.lock(10, TimeUnit.SECONDS);

// 尝试加锁（等待 3s，持锁 10s）
boolean success = lock.tryLock(3, 10, TimeUnit.SECONDS);

try {
    // 业务逻辑
} finally {
    lock.unlock();
}
```

### 看门狗（Watchdog）续期

```
线程加锁成功（默认 30s 过期）
    ↓
看门狗定时任务（每 10s 执行一次）
    ↓
检查线程是否还持有锁
    ↓ 是
重置过期时间为 30s
    ↓
线程释放锁 → 看门狗停止
```

> 指定了过期时间（`lock(10, TimeUnit.SECONDS)`）则不启用看门狗，适合明确知道业务执行时间的场景。

### 可重入实现

Redisson 用 Hash 结构存储锁：

```
key: lock_key
value: {
    "uuid:threadId": 2   ← 重入次数
}
```

同一线程再次加锁，重入次数 +1；释放时 -1，减到 0 才真正删除 key。

---

## RedLock 算法

单节点 Redis 存在单点故障风险，RedLock 在多个独立 Redis 节点上加锁：

```
5 个独立 Redis 节点（无主从关系）

加锁流程：
1. 记录开始时间
2. 依次向 5 个节点发送 SET NX PX 命令
3. 超过半数（3个）加锁成功，且总耗时 < 锁过期时间 → 加锁成功
4. 否则向所有节点发送释放命令
```

RedLock 存在争议（Martin Kleppmann 指出时钟漂移问题），实际生产中：
- 对一致性要求极高 → 用 ZooKeeper 分布式锁
- 一般业务 → Redisson 单节点足够

---

## 常见问题

### 锁过期但业务未完成

业务执行时间超过锁过期时间，锁自动释放，其他线程进入临界区。

解决：使用 Redisson 看门狗自动续期，或将过期时间设置得足够长。

### Redis 主从切换导致锁丢失

主节点加锁成功，还未同步到从节点，主节点宕机，从节点升主，锁丢失。

解决：使用 RedLock，或接受极低概率的锁丢失风险（大多数业务可接受）。
