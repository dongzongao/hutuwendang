---
title: Java synchronized 详解
description: 深入解析 Java synchronized 关键字原理，包括对象头 Mark Word 结构、锁升级过程（偏向锁→轻量级锁→重量级锁）、Monitor 监视器机制及使用场景。
---

# Java synchronized 详解

## 基本用法

```java
// 修饰实例方法，锁是当前对象
public synchronized void method() {}

// 修饰静态方法，锁是 Class 对象
public static synchronized void staticMethod() {}

// 修饰代码块，锁是指定对象
synchronized (this) {}
synchronized (MyClass.class) {}
```

---

## 底层原理：Monitor

每个 Java 对象都关联一个 Monitor（监视器），synchronized 本质是获取 Monitor：

```
字节码层面：
monitorenter  ← 进入同步块，尝试获取 Monitor
...
monitorexit   ← 退出同步块，释放 Monitor
```

Monitor 有三个区域：
- Entry Set：等待获取锁的线程队列
- Owner：当前持有锁的线程
- Wait Set：调用 wait() 后等待的线程

---

## 对象头 Mark Word

锁信息存储在对象头的 Mark Word（64位 JVM 占 8 字节）中：

```
锁状态        Mark Word 内容
无锁          hashcode(31) | age(4) | 0 | 01
偏向锁        threadId(54) | epoch(2) | age(4) | 1 | 01
轻量级锁      指向栈帧中 Lock Record 的指针 | 00
重量级锁      指向 Monitor 对象的指针 | 10
GC 标记       空 | 11
```

---

## 锁升级过程

JDK 6 引入锁升级优化，锁只能升级不能降级：

```
无锁
 ↓ 第一个线程访问
偏向锁（Biased Lock）
 ↓ 第二个线程竞争
轻量级锁（Lightweight Lock）
 ↓ 自旋超过阈值 / 等待线程过多
重量级锁（Heavyweight Lock）
```

### 偏向锁

第一个获取锁的线程，将自己的 threadId 写入 Mark Word，后续该线程再次进入无需 CAS，只需检查 threadId。

适合只有一个线程访问的场景，消除同步开销。

### 轻量级锁

有第二个线程竞争时，偏向锁升级为轻量级锁。线程在自己的栈帧中创建 Lock Record，通过 CAS 将 Mark Word 替换为指向 Lock Record 的指针。

获取失败则自旋等待（默认自旋 10 次），避免线程挂起的开销。

### 重量级锁

自旋超过阈值后升级为重量级锁，线程挂起，进入 Monitor 的 Entry Set 等待，由操作系统调度唤醒。

---

## synchronized vs ReentrantLock

| 对比项 | synchronized | ReentrantLock |
|--------|-------------|---------------|
| 实现层面 | JVM 内置 | JDK 类库（AQS） |
| 锁释放 | 自动释放 | 必须手动 unlock() |
| 可中断 | 不可中断 | 支持 lockInterruptibly() |
| 公平锁 | 不支持 | 支持 |
| 条件变量 | 一个（wait/notify） | 多个（Condition） |
| 性能 | JDK 6 后差距不大 | 高并发下略优 |

简单场景用 synchronized，需要高级特性（超时、可中断、多条件）用 ReentrantLock。
