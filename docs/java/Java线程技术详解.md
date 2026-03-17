# Java 线程技术点详解

## 1. 线程生命周期

```
NEW → RUNNABLE → RUNNING → BLOCKED/WAITING/TIMED_WAITING → TERMINATED

NEW:           new Thread() 创建但未启动
RUNNABLE:      调用 start()，等待 CPU 调度
RUNNING:       获得 CPU 时间片，正在执行
BLOCKED:       等待 synchronized 锁
WAITING:       调用 wait() / join() / park()，无限等待
TIMED_WAITING: sleep(n) / wait(n)，超时自动唤醒
TERMINATED:    run() 执行完毕
```

---

## 2. 线程创建方式

```java
// 方式1：继承 Thread
class MyThread extends Thread {
    public void run() { System.out.println("running"); }
}
new MyThread().start();

// 方式2：实现 Runnable（推荐，避免单继承限制）
new Thread(() -> System.out.println("running")).start();

// 方式3：Callable + FutureTask（有返回值）
FutureTask<Integer> task = new FutureTask<>(() -> 42);
new Thread(task).start();
int result = task.get(); // 阻塞等待结果

// 方式4：线程池（生产推荐）
ExecutorService pool = Executors.newFixedThreadPool(10);
pool.submit(() -> System.out.println("running"));
```

---

## 3. synchronized 详解

```java
// 修饰实例方法 → 锁当前对象实例
public synchronized void method() {}

// 修饰静态方法 → 锁 Class 对象
public static synchronized void staticMethod() {}

// 修饰代码块 → 锁指定对象
synchronized (this) {}
synchronized (MyClass.class) {}
```

锁升级过程（JVM 优化）：
```
无锁 → 偏向锁 → 轻量级锁（CAS自旋）→ 重量级锁（OS互斥量）
```
- 偏向锁：只有一个线程访问，记录线程ID，无需CAS
- 轻量级锁：多线程交替访问，CAS自旋，不阻塞
- 重量级锁：多线程竞争激烈，挂起线程，进入阻塞队列

---

## 4. volatile 详解

```java
private volatile boolean flag = false;
```

保证两件事：
- 可见性：一个线程修改后，其他线程立即可见（强制从主内存读）
- 禁止指令重排：通过内存屏障实现

不保证原子性：
```java
volatile int count = 0;
count++; // 非原子！等价于 read → add → write 三步，仍有并发问题
// 应该用 AtomicInteger
```

典型用法：双重检查锁单例
```java
public class Singleton {
    private static volatile Singleton instance;

    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton(); // volatile 防止指令重排
                }
            }
        }
        return instance;
    }
}
```

---

## 5. ReentrantLock vs synchronized

```java
ReentrantLock lock = new ReentrantLock();

// 基本用法
lock.lock();
try {
    // 临界区
} finally {
    lock.unlock(); // 必须在 finally 释放
}

// tryLock 尝试获取，不阻塞
if (lock.tryLock(3, TimeUnit.SECONDS)) {
    try { } finally { lock.unlock(); }
} else {
    // 获取失败，做其他处理
}
```

| 对比项 | synchronized | ReentrantLock |
|--------|-------------|---------------|
| 锁释放 | 自动 | 手动（finally） |
| 公平锁 | 不支持 | 支持 |
| 可中断 | 不支持 | 支持 lockInterruptibly() |
| 超时获取 | 不支持 | 支持 tryLock(timeout) |
| 条件变量 | 一个 wait/notify | 多个 Condition |

---

## 6. 线程池详解

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    5,                              // corePoolSize 核心线程数
    10,                             // maximumPoolSize 最大线程数
    60, TimeUnit.SECONDS,           // 空闲线程存活时间
    new LinkedBlockingQueue<>(100), // 任务队列
    new ThreadPoolExecutor.CallerRunsPolicy() // 拒绝策略
);
```

任务提交流程：
```
提交任务
  ↓
核心线程数未满 → 创建核心线程执行
  ↓
核心线程已满 → 放入队列
  ↓
队列已满 → 创建非核心线程（不超过最大线程数）
  ↓
达到最大线程数且队列满 → 触发拒绝策略
```

拒绝策略：
- AbortPolicy：抛 RejectedExecutionException（默认）
- CallerRunsPolicy：由提交任务的线程自己执行
- DiscardPolicy：静默丢弃
- DiscardOldestPolicy：丢弃队列最老的任务

---

## 7. 常用并发工具

```java
// CountDownLatch：等待多个线程完成
CountDownLatch latch = new CountDownLatch(3);
latch.countDown(); // 每个子线程完成后调用
latch.await();     // 主线程等待所有子线程

// CyclicBarrier：多个线程互相等待到达屏障点
CyclicBarrier barrier = new CyclicBarrier(3, () -> System.out.println("all ready"));
barrier.await(); // 等够3个才继续

// Semaphore：控制并发数量（限流）
Semaphore semaphore = new Semaphore(10); // 最多10个并发
semaphore.acquire();
try { } finally { semaphore.release(); }

// AtomicInteger：原子操作
AtomicInteger count = new AtomicInteger(0);
count.incrementAndGet();        // 原子 +1
count.compareAndSet(5, 10);     // CAS：期望值5，改为10
```

---

## 8. ThreadLocal

每个线程独立存储变量，线程间互不干扰：

```java
ThreadLocal<User> userHolder = new ThreadLocal<>();

userHolder.set(currentUser);  // 存
User user = userHolder.get(); // 取
userHolder.remove();          // 用完必须清除，防止内存泄漏
```

内存泄漏原因：ThreadLocalMap 的 key 是弱引用，value 是强引用，key 被 GC 后 value 无法回收，线程池中线程长期存活导致泄漏。

---

## 9. CAS 原理

Compare And Swap，乐观锁的底层实现：

```
期望值 == 内存当前值 → 更新为新值，返回 true
期望值 != 内存当前值 → 不更新，返回 false（自旋重试）
```

```java
// AtomicInteger 底层
public final int incrementAndGet() {
    return unsafe.getAndAddInt(this, valueOffset, 1) + 1;
    // 底层是 CPU 的 CMPXCHG 指令，原子操作
}
```

ABA 问题：值从 A→B→A，CAS 认为没变化但实际变过。
解决：用 `AtomicStampedReference` 加版本号。
