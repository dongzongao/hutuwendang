---
title: ReentrantLock 与 AQS 详解
description: 深入解析 ReentrantLock 可重入锁原理及 AQS（AbstractQueuedSynchronizer）同步队列框架，包括公平锁/非公平锁实现、CLH 队列、state 状态机及 Condition 条件变量。
---

# ReentrantLock 与 AQS 详解

## AQS 核心结构

AQS（AbstractQueuedSynchronizer）是 Java 并发包的基础框架，ReentrantLock、Semaphore、CountDownLatch 都基于它实现。

```
AQS
├── state（int）：同步状态，含义由子类定义
│   ReentrantLock：0=未锁，>0=重入次数
│   Semaphore：剩余许可数
│   CountDownLatch：剩余计数
│
└── CLH 队列（双向链表）：等待获取锁的线程节点
    head → [Node] ↔ [Node] ↔ [Node] ← tail
```

### CLH 队列节点

```java
static final class Node {
    Thread thread;       // 等待的线程
    Node prev;           // 前驱节点
    Node next;           // 后继节点
    int waitStatus;      // 节点状态
    // CANCELLED=1, SIGNAL=-1, CONDITION=-2, PROPAGATE=-3
}
```

---

## 加锁流程

```
lock()
  ↓
tryAcquire()  尝试 CAS 修改 state
  ↓ 失败
addWaiter()   创建 Node 加入 CLH 队列尾部
  ↓
acquireQueued()  自旋等待
  前驱是 head → 再次 tryAcquire()
  成功 → 出队，成为新 head
  失败 → park() 挂起线程
```

### 非公平锁（默认）

```java
// 新来的线程直接 CAS 抢锁，不管队列里有没有等待线程
if (compareAndSetState(0, 1)) {
    setExclusiveOwnerThread(Thread.currentThread());
}
// 抢失败才入队
```

### 公平锁

```java
// 先检查队列里有没有等待线程，有则直接入队
if (!hasQueuedPredecessors() && compareAndSetState(0, 1)) {
    setExclusiveOwnerThread(Thread.currentThread());
}
```

非公平锁吞吐量更高（减少线程切换），但可能导致队列中的线程长时间等待（饥饿）。

---

## 可重入实现

```java
// 同一线程再次加锁，state 累加
if (current == getExclusiveOwnerThread()) {
    setState(state + 1);  // 重入次数 +1
    return true;
}

// 解锁时 state 递减，减到 0 才真正释放
int c = getState() - 1;
if (c == 0) {
    setExclusiveOwnerThread(null);
}
setState(c);
```

---

## 解锁流程

```
unlock()
  ↓
tryRelease()  state - 1，减到 0 则释放锁
  ↓
unparkSuccessor()  唤醒 CLH 队列中的下一个节点
  ↓
被唤醒的线程重新 tryAcquire()
```

---

## Condition 条件变量

ReentrantLock 支持多个 Condition，比 synchronized 的 wait/notify 更灵活：

```java
ReentrantLock lock = new ReentrantLock();
Condition notFull  = lock.newCondition();
Condition notEmpty = lock.newCondition();

// 生产者
lock.lock();
try {
    while (queue.isFull()) notFull.await();   // 等待"不满"条件
    queue.add(item);
    notEmpty.signal();  // 通知消费者
} finally { lock.unlock(); }

// 消费者
lock.lock();
try {
    while (queue.isEmpty()) notEmpty.await(); // 等待"不空"条件
    queue.poll();
    notFull.signal();   // 通知生产者
} finally { lock.unlock(); }
```

Condition 内部维护一个等待队列（单向链表），`await()` 将线程移入等待队列并释放锁，`signal()` 将线程从等待队列移回 CLH 队列。

---

## 常用 API

```java
ReentrantLock lock = new ReentrantLock();

lock.lock();                          // 阻塞加锁
lock.lockInterruptibly();             // 可中断加锁
lock.tryLock();                       // 非阻塞尝试加锁
lock.tryLock(1, TimeUnit.SECONDS);    // 超时加锁
lock.unlock();                        // 释放锁
lock.isLocked();                      // 是否被锁住
lock.getQueueLength();                // 等待队列长度
```
