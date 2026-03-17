# Java 线程与并发核心知识

## 一、线程基础

### 1. 进程与线程

**进程（Process）**：
- 操作系统资源分配的基本单位
- 拥有独立的内存空间
- 进程间通信需要 IPC（管道、消息队列、共享内存）
- 创建和销毁开销大

**线程（Thread）**：
- CPU 调度的基本单位
- 共享进程的内存空间
- 线程间通信简单（共享变量）
- 创建和销毁开销小

```
进程结构：
┌─────────────────────────────────┐
│         进程                     │
├─────────────────────────────────┤
│  代码段 | 数据段 | 堆 | 栈       │
├─────────────────────────────────┤
│  线程1  │  线程2  │  线程3      │
│  (栈)   │  (栈)   │  (栈)       │
└─────────────────────────────────┘
```

### 2. 线程的生命周期

```
线程状态转换图：
                    start()
        NEW ──────────────────> RUNNABLE
                                    │
                                    │ 获得CPU
                                    ↓
                                 RUNNING
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        │ wait()/join()             │ sleep()/yield()          │ synchronized
        ↓                           ↓                           ↓
    WAITING                    TIMED_WAITING                 BLOCKED
        │                           │                           │
        │ notify()/notifyAll()      │ 时间到                    │ 获得锁
        └───────────────────────────┴───────────────────────────┘
                                    │
                                    │ 执行完成
                                    ↓
                               TERMINATED
```

**6 种状态**：

| 状态 | 说明 |
|------|------|
| NEW | 新建状态，线程被创建但未启动 |
| RUNNABLE | 可运行状态，包括就绪和运行中 |
| BLOCKED | 阻塞状态，等待获取锁 |
| WAITING | 等待状态，等待其他线程唤醒 |
| TIMED_WAITING | 超时等待状态，指定时间后自动返回 |
| TERMINATED | 终止状态，线程执行完成 |

### 3. 创建线程的方式

#### 方式 1：继承 Thread 类

```java
public class MyThread extends Thread {
    
    @Override
    public void run() {
        System.out.println("线程名称: " + Thread.currentThread().getName());
        System.out.println("线程ID: " + Thread.currentThread().getId());
    }
    
    public static void main(String[] args) {
        MyThread thread = new MyThread();
        thread.setName("自定义线程");
        thread.start();  // 启动线程
    }
}
```

#### 方式 2：实现 Runnable 接口（推荐）

```java
public class MyRunnable implements Runnable {
    
    @Override
    public void run() {
        System.out.println("执行任务: " + Thread.currentThread().getName());
    }
    
    public static void main(String[] args) {
        MyRunnable task = new MyRunnable();
        Thread thread = new Thread(task, "工作线程");
        thread.start();
        
        // Lambda 表达式方式
        new Thread(() -> {
            System.out.println("Lambda 线程");
        }).start();
    }
}
```

#### 方式 3：实现 Callable 接口（有返回值）

```java
public class MyCallable implements Callable<String> {
    
    @Override
    public String call() throws Exception {
        Thread.sleep(1000);
        return "任务执行结果";
    }
    
    public static void main(String[] args) throws Exception {
        MyCallable task = new MyCallable();
        FutureTask<String> futureTask = new FutureTask<>(task);
        
        Thread thread = new Thread(futureTask);
        thread.start();
        
        // 获取返回值（会阻塞）
        String result = futureTask.get();
        System.out.println("结果: " + result);
    }
}
```

#### 方式 4：线程池（推荐）

```java
public class ThreadPoolExample {
    
    public static void main(String[] args) {
        // 创建线程池
        ExecutorService executor = Executors.newFixedThreadPool(5);
        
        // 提交任务
        for (int i = 0; i < 10; i++) {
            final int taskId = i;
            executor.submit(() -> {
                System.out.println("执行任务 " + taskId + 
                    " 线程: " + Thread.currentThread().getName());
            });
        }
        
        // 关闭线程池
        executor.shutdown();
    }
}
```

### 4. Thread 类常用方法

```java
public class ThreadMethods {
    
    public static void main(String[] args) throws InterruptedException {
        Thread thread = new Thread(() -> {
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });
        
        // 启动线程
        thread.start();
        
        // 获取线程名称
        String name = thread.getName();
        
        // 设置线程名称
        thread.setName("工作线程");
        
        // 获取线程ID
        long id = thread.getId();
        
        // 获取线程状态
        Thread.State state = thread.getState();
        
        // 获取线程优先级（1-10，默认5）
        int priority = thread.getPriority();
        thread.setPriority(Thread.MAX_PRIORITY);
        
        // 判断线程是否存活
        boolean isAlive = thread.isAlive();
        
        // 判断是否为守护线程
        boolean isDaemon = thread.isDaemon();
        thread.setDaemon(true);  // 设置为守护线程（必须在start前）
        
        // 等待线程结束
        thread.join();  // 当前线程等待thread执行完成
        thread.join(1000);  // 最多等待1秒
        
        // 中断线程
        thread.interrupt();
        boolean isInterrupted = thread.isInterrupted();
        
        // 静态方法
        Thread currentThread = Thread.currentThread();  // 获取当前线程
        Thread.sleep(1000);  // 当前线程休眠
        Thread.yield();  // 当前线程让出CPU
    }
}
```

## 二、线程同步

### 1. synchronized 关键字

#### 同步方法

```java
public class SynchronizedMethod {
    
    private int count = 0;
    
    // 同步实例方法（锁是this）
    public synchronized void increment() {
        count++;
    }
    
    // 同步静态方法（锁是类对象）
    public static synchronized void staticMethod() {
        System.out.println("静态同步方法");
    }
    
    // 等价于
    public void increment2() {
        synchronized (this) {
            count++;
        }
    }
    
    public static void staticMethod2() {
        synchronized (SynchronizedMethod.class) {
            System.out.println("静态同步方法");
        }
    }
}
```

#### 同步代码块

```java
public class SynchronizedBlock {
    
    private final Object lock = new Object();
    private int count = 0;
    
    public void increment() {
        // 同步代码块（锁是lock对象）
        synchronized (lock) {
            count++;
        }
    }
    
    // 细粒度锁
    private final Object lock1 = new Object();
    private final Object lock2 = new Object();
    
    public void method1() {
        synchronized (lock1) {
            // 操作1
        }
    }
    
    public void method2() {
        synchronized (lock2) {
            // 操作2（与method1不互斥）
        }
    }
}
```

#### synchronized 原理

```java
/**
 * synchronized 底层原理：
 * 
 * 1. 对象头（Mark Word）：
 *    - 无锁状态：hashCode、GC年龄
 *    - 偏向锁：线程ID、epoch
 *    - 轻量级锁：指向栈中锁记录的指针
 *    - 重量级锁：指向monitor的指针
 * 
 * 2. Monitor（监视器）：
 *    - Owner：持有锁的线程
 *    - EntryList：等待获取锁的线程队列
 *    - WaitSet：调用wait()的线程队列
 * 
 * 3. 锁升级过程：
 *    无锁 -> 偏向锁 -> 轻量级锁 -> 重量级锁
 */

public class SynchronizedPrinciple {
    
    private int count = 0;
    
    public void increment() {
        synchronized (this) {
            count++;
        }
    }
    
    // 字节码：
    // monitorenter  // 获取锁
    // ... 业务代码
    // monitorexit   // 释放锁
    // monitorexit   // 异常时释放锁
}
```

### 2. volatile 关键字

```java
public class VolatileExample {
    
    // volatile 保证可见性和有序性，但不保证原子性
    private volatile boolean flag = false;
    private volatile int count = 0;
    
    public void writer() {
        count = 1;      // 1
        flag = true;    // 2（volatile写）
    }
    
    public void reader() {
        if (flag) {     // 3（volatile读）
            int i = count;  // 4（一定能看到count=1）
        }
    }
    
    /**
     * volatile 特性：
     * 
     * 1. 可见性：
     *    - 写操作会立即刷新到主内存
     *    - 读操作会从主内存读取最新值
     * 
     * 2. 有序性：
     *    - 禁止指令重排序
     *    - volatile写之前的操作不会重排到写之后
     *    - volatile读之后的操作不会重排到读之前
     * 
     * 3. 不保证原子性：
     *    - count++ 不是原子操作
     *    - 需要使用 AtomicInteger
     */
    
    // 错误示例：volatile不保证原子性
    public void increment() {
        count++;  // 非原子操作：读取、加1、写入
    }
    
    // 正确示例：使用AtomicInteger
    private AtomicInteger atomicCount = new AtomicInteger(0);
    
    public void incrementAtomic() {
        atomicCount.incrementAndGet();
    }
}
```

### 3. Lock 接口

```java
public class LockExample {
    
    private final Lock lock = new ReentrantLock();
    private int count = 0;
    
    // 基本用法
    public void increment() {
        lock.lock();
        try {
            count++;
        } finally {
            lock.unlock();  // 必须在finally中释放锁
        }
    }
    
    // 尝试获取锁
    public void tryLockExample() {
        if (lock.tryLock()) {
            try {
                count++;
            } finally {
                lock.unlock();
            }
        } else {
            System.out.println("获取锁失败");
        }
    }
    
    // 超时获取锁
    public void tryLockWithTimeout() throws InterruptedException {
        if (lock.tryLock(1, TimeUnit.SECONDS)) {
            try {
                count++;
            } finally {
                lock.unlock();
            }
        }
    }
    
    // 可中断锁
    public void lockInterruptibly() throws InterruptedException {
        lock.lockInterruptibly();
        try {
            count++;
        } finally {
            lock.unlock();
        }
    }
}
```

#### ReentrantLock 高级特性

```java
public class ReentrantLockAdvanced {
    
    // 公平锁（按申请顺序获取锁）
    private final Lock fairLock = new ReentrantLock(true);
    
    // 非公平锁（默认，性能更好）
    private final Lock unfairLock = new ReentrantLock(false);
    
    // 可重入性
    private final ReentrantLock lock = new ReentrantLock();
    
    public void method1() {
        lock.lock();
        try {
            System.out.println("method1");
            method2();  // 可重入
        } finally {
            lock.unlock();
        }
    }
    
    public void method2() {
        lock.lock();
        try {
            System.out.println("method2");
        } finally {
            lock.unlock();
        }
    }
    
    // 获取锁信息
    public void lockInfo() {
        System.out.println("是否被锁定: " + lock.isLocked());
        System.out.println("是否被当前线程持有: " + lock.isHeldByCurrentThread());
        System.out.println("持有锁的次数: " + lock.getHoldCount());
        System.out.println("等待线程数: " + lock.getQueueLength());
    }
}
```

#### ReadWriteLock 读写锁

```java
public class ReadWriteLockExample {
    
    private final ReadWriteLock rwLock = new ReentrantReadWriteLock();
    private final Lock readLock = rwLock.readLock();
    private final Lock writeLock = rwLock.writeLock();
    
    private Map<String, String> cache = new HashMap<>();
    
    // 读操作（共享锁）
    public String get(String key) {
        readLock.lock();
        try {
            return cache.get(key);
        } finally {
            readLock.unlock();
        }
    }
    
    // 写操作（独占锁）
    public void put(String key, String value) {
        writeLock.lock();
        try {
            cache.put(key, value);
        } finally {
            writeLock.unlock();
        }
    }
    
    /**
     * 读写锁特性：
     * 1. 读-读：不互斥，可并发
     * 2. 读-写：互斥
     * 3. 写-写：互斥
     * 
     * 适用场景：读多写少
     */
}
```

### 4. synchronized vs Lock

| 特性 | synchronized | Lock |
|------|-------------|------|
| 使用方式 | 关键字，自动释放 | 接口，手动释放 |
| 锁类型 | 可重入、非公平 | 可重入、可公平 |
| 等待可中断 | 不支持 | 支持 |
| 超时获取 | 不支持 | 支持 |
| 条件变量 | 1个（wait/notify） | 多个（Condition） |
| 性能 | JDK6后优化，相近 | 略优 |
| 使用场景 | 简单同步 | 复杂场景 |


## 三、线程通信

### 1. wait/notify 机制

```java
public class WaitNotifyExample {
    
    private final Object lock = new Object();
    private boolean condition = false;
    
    // 等待方
    public void waitMethod() throws InterruptedException {
        synchronized (lock) {
            while (!condition) {  // 使用while而非if
                lock.wait();  // 释放锁并等待
            }
            // 条件满足，执行业务逻辑
            System.out.println("条件满足，继续执行");
        }
    }
    
    // 通知方
    public void notifyMethod() {
        synchronized (lock) {
            condition = true;
            lock.notify();  // 唤醒一个等待线程
            // lock.notifyAll();  // 唤醒所有等待线程
        }
    }
    
    /**
     * wait/notify 注意事项：
     * 
     * 1. 必须在同步块中使用
     * 2. wait会释放锁
     * 3. notify不会立即释放锁
     * 4. 使用while而非if判断条件（防止虚假唤醒）
     * 5. notifyAll比notify更安全
     */
}
```

#### 生产者-消费者模式

```java
public class ProducerConsumer {
    
    private final Queue<Integer> queue = new LinkedList<>();
    private final int MAX_SIZE = 10;
    private final Object lock = new Object();
    
    // 生产者
    class Producer implements Runnable {
        @Override
        public void run() {
            int value = 0;
            while (true) {
                synchronized (lock) {
                    while (queue.size() == MAX_SIZE) {
                        try {
                            lock.wait();  // 队列满，等待
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
                    }
                    
                    queue.offer(value);
                    System.out.println("生产: " + value);
                    value++;
                    
                    lock.notifyAll();  // 唤醒消费者
                }
                
                try {
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }
    }
    
    // 消费者
    class Consumer implements Runnable {
        @Override
        public void run() {
            while (true) {
                synchronized (lock) {
                    while (queue.isEmpty()) {
                        try {
                            lock.wait();  // 队列空，等待
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
                    }
                    
                    int value = queue.poll();
                    System.out.println("消费: " + value);
                    
                    lock.notifyAll();  // 唤醒生产者
                }
                
                try {
                    Thread.sleep(200);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }
    }
    
    public static void main(String[] args) {
        ProducerConsumer pc = new ProducerConsumer();
        
        new Thread(pc.new Producer()).start();
        new Thread(pc.new Consumer()).start();
    }
}
```

### 2. Condition 条件变量

```java
public class ConditionExample {
    
    private final Lock lock = new ReentrantLock();
    private final Condition condition = lock.newCondition();
    private boolean ready = false;
    
    // 等待方
    public void await() throws InterruptedException {
        lock.lock();
        try {
            while (!ready) {
                condition.await();  // 等待信号
            }
            System.out.println("收到信号，继续执行");
        } finally {
            lock.unlock();
        }
    }
    
    // 通知方
    public void signal() {
        lock.lock();
        try {
            ready = true;
            condition.signal();  // 发送信号
            // condition.signalAll();  // 发送信号给所有等待线程
        } finally {
            lock.unlock();
        }
    }
}
```

#### 多条件变量示例

```java
public class BoundedBuffer {
    
    private final Lock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();
    
    private final Object[] items = new Object[100];
    private int putIndex, takeIndex, count;
    
    // 生产
    public void put(Object x) throws InterruptedException {
        lock.lock();
        try {
            while (count == items.length) {
                notFull.await();  // 队列满，等待notFull信号
            }
            
            items[putIndex] = x;
            if (++putIndex == items.length) {
                putIndex = 0;
            }
            count++;
            
            notEmpty.signal();  // 通知消费者
        } finally {
            lock.unlock();
        }
    }
    
    // 消费
    public Object take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) {
                notEmpty.await();  // 队列空，等待notEmpty信号
            }
            
            Object x = items[takeIndex];
            if (++takeIndex == items.length) {
                takeIndex = 0;
            }
            count--;
            
            notFull.signal();  // 通知生产者
            return x;
        } finally {
            lock.unlock();
        }
    }
}
```

### 3. CountDownLatch（倒计时门栓）

```java
public class CountDownLatchExample {
    
    public static void main(String[] args) throws InterruptedException {
        int threadCount = 5;
        CountDownLatch latch = new CountDownLatch(threadCount);
        
        // 启动多个线程
        for (int i = 0; i < threadCount; i++) {
            final int taskId = i;
            new Thread(() -> {
                try {
                    System.out.println("任务 " + taskId + " 开始执行");
                    Thread.sleep(1000);
                    System.out.println("任务 " + taskId + " 执行完成");
                } catch (InterruptedException e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();  // 计数减1
                }
            }).start();
        }
        
        // 等待所有线程完成
        latch.await();
        System.out.println("所有任务执行完成");
    }
    
    /**
     * 使用场景：
     * 1. 主线程等待多个子线程完成
     * 2. 多个线程等待某个条件满足后同时开始
     */
}
```

### 4. CyclicBarrier（循环栅栏）

```java
public class CyclicBarrierExample {
    
    public static void main(String[] args) {
        int threadCount = 3;
        
        // 所有线程到达后执行的任务
        Runnable barrierAction = () -> {
            System.out.println("所有线程都到达栅栏，开始下一阶段");
        };
        
        CyclicBarrier barrier = new CyclicBarrier(threadCount, barrierAction);
        
        for (int i = 0; i < threadCount; i++) {
            final int taskId = i;
            new Thread(() -> {
                try {
                    System.out.println("线程 " + taskId + " 准备中...");
                    Thread.sleep(1000 * (taskId + 1));
                    System.out.println("线程 " + taskId + " 准备完成，等待其他线程");
                    
                    barrier.await();  // 等待其他线程
                    
                    System.out.println("线程 " + taskId + " 开始执行");
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }
    
    /**
     * CyclicBarrier vs CountDownLatch：
     * 
     * CyclicBarrier：
     * - 可重用
     * - 线程互相等待
     * - 适合多阶段任务
     * 
     * CountDownLatch：
     * - 一次性
     * - 主线程等待子线程
     * - 适合一次性等待
     */
}
```

### 5. Semaphore（信号量）

```java
public class SemaphoreExample {
    
    // 限制同时访问的线程数
    private static final Semaphore semaphore = new Semaphore(3);
    
    public static void main(String[] args) {
        for (int i = 0; i < 10; i++) {
            final int taskId = i;
            new Thread(() -> {
                try {
                    semaphore.acquire();  // 获取许可
                    System.out.println("线程 " + taskId + " 获得许可，开始执行");
                    Thread.sleep(2000);
                    System.out.println("线程 " + taskId + " 执行完成，释放许可");
                } catch (InterruptedException e) {
                    e.printStackTrace();
                } finally {
                    semaphore.release();  // 释放许可
                }
            }).start();
        }
    }
    
    /**
     * 使用场景：
     * 1. 限流（限制并发数）
     * 2. 资源池（数据库连接池）
     * 3. 停车场（限制车位数）
     */
}
```

### 6. Exchanger（交换器）

```java
public class ExchangerExample {
    
    private static final Exchanger<String> exchanger = new Exchanger<>();
    
    public static void main(String[] args) {
        // 线程1
        new Thread(() -> {
            try {
                String data = "来自线程1的数据";
                System.out.println("线程1准备交换: " + data);
                
                String result = exchanger.exchange(data);
                
                System.out.println("线程1收到: " + result);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }).start();
        
        // 线程2
        new Thread(() -> {
            try {
                Thread.sleep(1000);
                String data = "来自线程2的数据";
                System.out.println("线程2准备交换: " + data);
                
                String result = exchanger.exchange(data);
                
                System.out.println("线程2收到: " + result);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }).start();
    }
    
    /**
     * 使用场景：
     * 1. 两个线程交换数据
     * 2. 校对工作（两个线程处理同一数据，交换结果对比）
     */
}
```

## 四、线程池

### 1. 线程池的优势

- **降低资源消耗**：重用线程，减少创建销毁开销
- **提高响应速度**：任务到达时无需等待线程创建
- **提高可管理性**：统一管理、监控、调优
- **提供更多功能**：定时执行、周期执行

### 2. ThreadPoolExecutor 核心参数

```java
public class ThreadPoolParameters {
    
    public static void main(String[] args) {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
            5,                      // corePoolSize: 核心线程数
            10,                     // maximumPoolSize: 最大线程数
            60L,                    // keepAliveTime: 空闲线程存活时间
            TimeUnit.SECONDS,       // unit: 时间单位
            new LinkedBlockingQueue<>(100),  // workQueue: 任务队列
            Executors.defaultThreadFactory(), // threadFactory: 线程工厂
            new ThreadPoolExecutor.AbortPolicy()  // handler: 拒绝策略
        );
    }
    
    /**
     * 参数说明：
     * 
     * 1. corePoolSize（核心线程数）：
     *    - 线程池维持的最小线程数
     *    - 即使空闲也不会销毁
     * 
     * 2. maximumPoolSize（最大线程数）：
     *    - 线程池允许的最大线程数
     *    - 包括核心线程和非核心线程
     * 
     * 3. keepAliveTime（存活时间）：
     *    - 非核心线程空闲后的存活时间
     *    - 超过时间会被销毁
     * 
     * 4. workQueue（任务队列）：
     *    - ArrayBlockingQueue: 有界队列
     *    - LinkedBlockingQueue: 无界队列（默认Integer.MAX_VALUE）
     *    - SynchronousQueue: 不存储元素的队列
     *    - PriorityBlockingQueue: 优先级队列
     * 
     * 5. threadFactory（线程工厂）：
     *    - 创建新线程
     *    - 可自定义线程名称、优先级等
     * 
     * 6. handler（拒绝策略）：
     *    - AbortPolicy: 抛出异常（默认）
     *    - CallerRunsPolicy: 调用者线程执行
     *    - DiscardPolicy: 丢弃任务
     *    - DiscardOldestPolicy: 丢弃最旧任务
     */
}
```

### 3. 线程池执行流程

```
任务提交流程：
                提交任务
                   ↓
        核心线程数已满？
                   ↓
            否 ←───┴───→ 是
            ↓              ↓
      创建核心线程      队列已满？
            ↓              ↓
         执行任务    否 ←─┴─→ 是
                     ↓        ↓
                  加入队列  最大线程数已满？
                     ↓        ↓
                  等待执行  否 ←─┴─→ 是
                            ↓        ↓
                      创建非核心线程  执行拒绝策略
                            ↓
                         执行任务
```

```java
public class ThreadPoolFlow {
    
    public static void main(String[] args) {
        // 核心2，最大4，队列容量3
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
            2, 4, 60L, TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(3),
            new ThreadPoolExecutor.AbortPolicy()
        );
        
        // 提交10个任务
        for (int i = 0; i < 10; i++) {
            final int taskId = i;
            try {
                executor.execute(() -> {
                    System.out.println("执行任务 " + taskId + 
                        " 线程: " + Thread.currentThread().getName());
                    try {
                        Thread.sleep(2000);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                });
            } catch (RejectedExecutionException e) {
                System.out.println("任务 " + taskId + " 被拒绝");
            }
        }
        
        /**
         * 执行过程：
         * 任务0-1: 创建核心线程执行
         * 任务2-4: 加入队列等待
         * 任务5-6: 创建非核心线程执行
         * 任务7-9: 队列满且线程数达到最大，被拒绝
         */
        
        executor.shutdown();
    }
}
```

### 4. 常见线程池类型

```java
public class ThreadPoolTypes {
    
    /**
     * 1. FixedThreadPool（固定大小线程池）
     */
    public static void fixedThreadPool() {
        ExecutorService executor = Executors.newFixedThreadPool(5);
        
        // 等价于
        new ThreadPoolExecutor(
            5, 5, 0L, TimeUnit.MILLISECONDS,
            new LinkedBlockingQueue<>()
        );
        
        // 特点：
        // - 核心线程数 = 最大线程数
        // - 无界队列
        // - 适合负载较重的服务器
    }
    
    /**
     * 2. CachedThreadPool（缓存线程池）
     */
    public static void cachedThreadPool() {
        ExecutorService executor = Executors.newCachedThreadPool();
        
        // 等价于
        new ThreadPoolExecutor(
            0, Integer.MAX_VALUE, 60L, TimeUnit.SECONDS,
            new SynchronousQueue<>()
        );
        
        // 特点：
        // - 核心线程数为0
        // - 最大线程数无限制
        // - 适合执行大量短期异步任务
    }
    
    /**
     * 3. SingleThreadExecutor（单线程线程池）
     */
    public static void singleThreadExecutor() {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        
        // 等价于
        new ThreadPoolExecutor(
            1, 1, 0L, TimeUnit.MILLISECONDS,
            new LinkedBlockingQueue<>()
        );
        
        // 特点：
        // - 只有一个线程
        // - 保证任务顺序执行
        // - 适合需要顺序执行的场景
    }
    
    /**
     * 4. ScheduledThreadPool（定时线程池）
     */
    public static void scheduledThreadPool() {
        ScheduledExecutorService executor = Executors.newScheduledThreadPool(5);
        
        // 延迟执行
        executor.schedule(() -> {
            System.out.println("延迟3秒执行");
        }, 3, TimeUnit.SECONDS);
        
        // 周期执行（固定延迟）
        executor.scheduleWithFixedDelay(() -> {
            System.out.println("每隔2秒执行一次");
        }, 0, 2, TimeUnit.SECONDS);
        
        // 周期执行（固定频率）
        executor.scheduleAtFixedRate(() -> {
            System.out.println("每2秒执行一次");
        }, 0, 2, TimeUnit.SECONDS);
    }
    
    /**
     * 5. WorkStealingPool（工作窃取线程池，JDK8+）
     */
    public static void workStealingPool() {
        ExecutorService executor = Executors.newWorkStealingPool();
        
        // 特点：
        // - 基于ForkJoinPool
        // - 每个线程有自己的任务队列
        // - 空闲线程可以窃取其他线程的任务
        // - 适合计算密集型任务
    }
}
```

### 5. 自定义线程池（推荐）

```java
public class CustomThreadPool {
    
    /**
     * 阿里巴巴开发手册推荐：
     * 不要使用Executors创建线程池，而是手动创建ThreadPoolExecutor
     * 
     * 原因：
     * 1. FixedThreadPool和SingleThreadExecutor使用无界队列，可能OOM
     * 2. CachedThreadPool最大线程数无限制，可能创建大量线程导致OOM
     */
    
    public static ThreadPoolExecutor createThreadPool() {
        return new ThreadPoolExecutor(
            // 核心线程数 = CPU核心数 + 1
            Runtime.getRuntime().availableProcessors() + 1,
            
            // 最大线程数 = CPU核心数 * 2
            Runtime.getRuntime().availableProcessors() * 2,
            
            // 空闲线程存活时间
            60L,
            TimeUnit.SECONDS,
            
            // 有界队列
            new LinkedBlockingQueue<>(1000),
            
            // 自定义线程工厂
            new ThreadFactory() {
                private final AtomicInteger threadNumber = new AtomicInteger(1);
                
                @Override
                public Thread newThread(Runnable r) {
                    Thread thread = new Thread(r);
                    thread.setName("custom-pool-" + threadNumber.getAndIncrement());
                    thread.setDaemon(false);
                    thread.setPriority(Thread.NORM_PRIORITY);
                    return thread;
                }
            },
            
            // 自定义拒绝策略
            new RejectedExecutionHandler() {
                @Override
                public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
                    // 记录日志
                    System.err.println("任务被拒绝: " + r.toString());
                    
                    // 可以选择：
                    // 1. 抛出异常
                    // throw new RejectedExecutionException("任务被拒绝");
                    
                    // 2. 调用者线程执行
                    // r.run();
                    
                    // 3. 丢弃任务
                    // do nothing
                    
                    // 4. 放入备用队列
                    // backupQueue.offer(r);
                }
            }
        );
    }
}
```


### 6. 线程池监控

```java
public class ThreadPoolMonitor {
    
    private final ThreadPoolExecutor executor;
    
    public ThreadPoolMonitor(ThreadPoolExecutor executor) {
        this.executor = executor;
    }
    
    // 监控线程池状态
    public void monitor() {
        System.out.println("=== 线程池监控 ===");
        System.out.println("核心线程数: " + executor.getCorePoolSize());
        System.out.println("最大线程数: " + executor.getMaximumPoolSize());
        System.out.println("当前线程数: " + executor.getPoolSize());
        System.out.println("活跃线程数: " + executor.getActiveCount());
        System.out.println("历史最大线程数: " + executor.getLargestPoolSize());
        System.out.println("任务总数: " + executor.getTaskCount());
        System.out.println("已完成任务数: " + executor.getCompletedTaskCount());
        System.out.println("队列大小: " + executor.getQueue().size());
        System.out.println("队列剩余容量: " + executor.getQueue().remainingCapacity());
    }
    
    // 定时监控
    public void startMonitoring() {
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
        scheduler.scheduleAtFixedRate(() -> {
            monitor();
        }, 0, 5, TimeUnit.SECONDS);
    }
}
```

### 7. 线程池最佳实践

```java
public class ThreadPoolBestPractices {
    
    /**
     * 1. 合理设置线程数
     */
    public static int calculateThreadCount() {
        int cpuCount = Runtime.getRuntime().availableProcessors();
        
        // CPU密集型：线程数 = CPU核心数 + 1
        int cpuIntensive = cpuCount + 1;
        
        // IO密集型：线程数 = CPU核心数 * 2
        int ioIntensive = cpuCount * 2;
        
        // 混合型：线程数 = CPU核心数 * (1 + 等待时间/计算时间)
        // 例如：等待时间1秒，计算时间0.1秒
        int mixed = (int) (cpuCount * (1 + 1.0 / 0.1));
        
        return ioIntensive;
    }
    
    /**
     * 2. 合理设置队列大小
     */
    public static int calculateQueueSize() {
        // 根据业务场景设置
        // 1. 响应时间要求高：小队列
        // 2. 吞吐量要求高：大队列
        // 3. 内存有限：小队列
        
        return 1000;  // 示例值
    }
    
    /**
     * 3. 优雅关闭线程池
     */
    public static void shutdownGracefully(ExecutorService executor) {
        // 1. 停止接收新任务
        executor.shutdown();
        
        try {
            // 2. 等待已提交任务完成（最多等待60秒）
            if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
                // 3. 超时后强制关闭
                executor.shutdownNow();
                
                // 4. 再次等待
                if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
                    System.err.println("线程池未能正常关闭");
                }
            }
        } catch (InterruptedException e) {
            // 5. 当前线程被中断，强制关闭
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
    
    /**
     * 4. 异常处理
     */
    public static void handleException() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
            5, 10, 60L, TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(100),
            new ThreadFactory() {
                @Override
                public Thread newThread(Runnable r) {
                    Thread thread = new Thread(r);
                    // 设置未捕获异常处理器
                    thread.setUncaughtExceptionHandler((t, e) -> {
                        System.err.println("线程 " + t.getName() + " 发生异常: " + e.getMessage());
                        e.printStackTrace();
                    });
                    return thread;
                }
            }
        );
        
        // 或者在任务中捕获异常
        executor.execute(() -> {
            try {
                // 业务逻辑
            } catch (Exception e) {
                // 处理异常
                System.err.println("任务执行异常: " + e.getMessage());
            }
        });
    }
}
```

## 五、并发工具类

### 1. 原子类（Atomic）

```java
public class AtomicExample {
    
    // 原子整数
    private AtomicInteger count = new AtomicInteger(0);
    
    public void increment() {
        count.incrementAndGet();  // 原子操作：count++
        count.decrementAndGet();  // 原子操作：count--
        count.addAndGet(5);       // 原子操作：count += 5
        count.compareAndSet(0, 1); // CAS操作
    }
    
    // 原子长整数
    private AtomicLong longValue = new AtomicLong(0);
    
    // 原子布尔
    private AtomicBoolean flag = new AtomicBoolean(false);
    
    // 原子引用
    private AtomicReference<User> userRef = new AtomicReference<>();
    
    public void updateUser(User newUser) {
        User oldUser = userRef.get();
        userRef.compareAndSet(oldUser, newUser);
    }
    
    // 原子数组
    private AtomicIntegerArray array = new AtomicIntegerArray(10);
    
    public void updateArray(int index, int value) {
        array.set(index, value);
        array.incrementAndGet(index);
    }
    
    // 字段更新器
    private static final AtomicIntegerFieldUpdater<AtomicExample> scoreUpdater =
        AtomicIntegerFieldUpdater.newUpdater(AtomicExample.class, "score");
    
    private volatile int score = 0;
    
    public void updateScore(int newScore) {
        scoreUpdater.set(this, newScore);
    }
    
    /**
     * CAS（Compare And Swap）原理：
     * 
     * boolean compareAndSet(int expect, int update) {
     *     if (value == expect) {
     *         value = update;
     *         return true;
     *     }
     *     return false;
     * }
     * 
     * 优点：无锁，性能高
     * 缺点：
     * 1. ABA问题（使用AtomicStampedReference解决）
     * 2. 循环时间长开销大
     * 3. 只能保证一个变量的原子性
     */
}
```

### 2. 并发集合

```java
public class ConcurrentCollections {
    
    /**
     * 1. ConcurrentHashMap（线程安全的HashMap）
     */
    public static void concurrentHashMap() {
        ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
        
        // 基本操作
        map.put("key", 1);
        Integer value = map.get("key");
        map.remove("key");
        
        // 原子操作
        map.putIfAbsent("key", 1);  // 不存在才put
        map.computeIfAbsent("key", k -> 1);  // 不存在才计算
        map.computeIfPresent("key", (k, v) -> v + 1);  // 存在才计算
        map.merge("key", 1, Integer::sum);  // 合并
        
        /**
         * JDK7 vs JDK8：
         * 
         * JDK7：
         * - Segment数组 + HashEntry数组
         * - 分段锁（Segment继承ReentrantLock）
         * - 最多16个Segment
         * 
         * JDK8：
         * - Node数组 + 链表/红黑树
         * - CAS + synchronized
         * - 锁粒度更细（锁单个Node）
         */
    }
    
    /**
     * 2. CopyOnWriteArrayList（写时复制列表）
     */
    public static void copyOnWriteArrayList() {
        CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();
        
        // 写操作：复制整个数组
        list.add("item1");
        list.add("item2");
        list.remove("item1");
        
        // 读操作：不加锁
        for (String item : list) {
            System.out.println(item);
        }
        
        /**
         * 特点：
         * - 写操作加锁，复制整个数组
         * - 读操作不加锁，读取旧数组
         * - 适合读多写少的场景
         * - 内存占用大
         * - 数据一致性：最终一致性
         */
    }
    
    /**
     * 3. CopyOnWriteArraySet（写时复制集合）
     */
    public static void copyOnWriteArraySet() {
        CopyOnWriteArraySet<String> set = new CopyOnWriteArraySet<>();
        
        set.add("item1");
        set.add("item2");
        set.remove("item1");
        
        // 底层使用CopyOnWriteArrayList实现
    }
    
    /**
     * 4. ConcurrentLinkedQueue（无界非阻塞队列）
     */
    public static void concurrentLinkedQueue() {
        ConcurrentLinkedQueue<String> queue = new ConcurrentLinkedQueue<>();
        
        queue.offer("item1");  // 入队
        String item = queue.poll();  // 出队
        String peek = queue.peek();  // 查看队首
        
        /**
         * 特点：
         * - 基于CAS实现
         * - 无锁，高性能
         * - 无界队列
         * - 不允许null元素
         */
    }
    
    /**
     * 5. BlockingQueue（阻塞队列）
     */
    public static void blockingQueue() throws InterruptedException {
        // ArrayBlockingQueue：有界阻塞队列
        BlockingQueue<String> arrayQueue = new ArrayBlockingQueue<>(10);
        
        // LinkedBlockingQueue：无界阻塞队列
        BlockingQueue<String> linkedQueue = new LinkedBlockingQueue<>();
        
        // PriorityBlockingQueue：优先级阻塞队列
        BlockingQueue<String> priorityQueue = new PriorityBlockingQueue<>();
        
        // SynchronousQueue：不存储元素的队列
        BlockingQueue<String> syncQueue = new SynchronousQueue<>();
        
        // DelayQueue：延迟队列
        BlockingQueue<Delayed> delayQueue = new DelayQueue<>();
        
        // 操作方法
        arrayQueue.put("item");      // 阻塞插入
        String item = arrayQueue.take();  // 阻塞获取
        
        arrayQueue.offer("item", 1, TimeUnit.SECONDS);  // 超时插入
        item = arrayQueue.poll(1, TimeUnit.SECONDS);    // 超时获取
    }
    
    /**
     * 6. ConcurrentSkipListMap（跳表Map）
     */
    public static void concurrentSkipListMap() {
        ConcurrentSkipListMap<String, Integer> map = new ConcurrentSkipListMap<>();
        
        map.put("key1", 1);
        map.put("key2", 2);
        
        /**
         * 特点：
         * - 基于跳表实现
         * - 有序Map
         * - 支持高并发
         * - 时间复杂度：O(log n)
         */
    }
}
```

### 3. ThreadLocal

```java
public class ThreadLocalExample {
    
    // 线程本地变量
    private static ThreadLocal<Integer> threadLocal = new ThreadLocal<Integer>() {
        @Override
        protected Integer initialValue() {
            return 0;  // 初始值
        }
    };
    
    // 使用Lambda简化
    private static ThreadLocal<Integer> threadLocal2 = 
        ThreadLocal.withInitial(() -> 0);
    
    public static void main(String[] args) {
        // 线程1
        new Thread(() -> {
            threadLocal.set(100);
            System.out.println("线程1: " + threadLocal.get());  // 100
        }).start();
        
        // 线程2
        new Thread(() -> {
            threadLocal.set(200);
            System.out.println("线程2: " + threadLocal.get());  // 200
        }).start();
        
        // 主线程
        System.out.println("主线程: " + threadLocal.get());  // 0
    }
    
    /**
     * ThreadLocal原理：
     * 
     * 1. 每个Thread对象有一个ThreadLocalMap
     * 2. ThreadLocalMap的key是ThreadLocal对象
     * 3. ThreadLocalMap的value是线程本地变量
     * 
     * Thread {
     *     ThreadLocalMap threadLocals;
     * }
     * 
     * ThreadLocalMap {
     *     Entry[] table;
     * }
     * 
     * Entry {
     *     WeakReference<ThreadLocal> key;
     *     Object value;
     * }
     */
    
    /**
     * 内存泄漏问题：
     * 
     * 1. ThreadLocal被回收（弱引用）
     * 2. Entry的key变为null
     * 3. value无法被访问但不会被回收
     * 4. 导致内存泄漏
     * 
     * 解决方案：
     * - 使用完后调用remove()
     * - 使用try-finally确保清理
     */
    
    public static void properUsage() {
        try {
            threadLocal.set(100);
            // 业务逻辑
        } finally {
            threadLocal.remove();  // 清理
        }
    }
}
```

#### ThreadLocal 应用场景

```java
public class ThreadLocalUseCases {
    
    /**
     * 1. 数据库连接管理
     */
    public static class ConnectionManager {
        private static ThreadLocal<Connection> connectionHolder = new ThreadLocal<>();
        
        public static Connection getConnection() {
            Connection conn = connectionHolder.get();
            if (conn == null) {
                conn = createConnection();
                connectionHolder.set(conn);
            }
            return conn;
        }
        
        public static void closeConnection() {
            Connection conn = connectionHolder.get();
            if (conn != null) {
                try {
                    conn.close();
                } catch (SQLException e) {
                    e.printStackTrace();
                } finally {
                    connectionHolder.remove();
                }
            }
        }
        
        private static Connection createConnection() {
            // 创建数据库连接
            return null;
        }
    }
    
    /**
     * 2. 用户上下文
     */
    public static class UserContext {
        private static ThreadLocal<User> userHolder = new ThreadLocal<>();
        
        public static void setUser(User user) {
            userHolder.set(user);
        }
        
        public static User getUser() {
            return userHolder.get();
        }
        
        public static void clear() {
            userHolder.remove();
        }
    }
    
    /**
     * 3. 日期格式化（SimpleDateFormat线程不安全）
     */
    public static class DateFormatUtil {
        private static ThreadLocal<SimpleDateFormat> dateFormat = 
            ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"));
        
        public static String format(Date date) {
            return dateFormat.get().format(date);
        }
        
        public static Date parse(String dateStr) throws ParseException {
            return dateFormat.get().parse(dateStr);
        }
    }
    
    /**
     * 4. 请求追踪ID
     */
    public static class TraceContext {
        private static ThreadLocal<String> traceId = new ThreadLocal<>();
        
        public static void setTraceId(String id) {
            traceId.set(id);
        }
        
        public static String getTraceId() {
            return traceId.get();
        }
        
        public static void clear() {
            traceId.remove();
        }
    }
}
```

## 六、并发问题

### 1. 死锁

```java
public class DeadlockExample {
    
    private static final Object lock1 = new Object();
    private static final Object lock2 = new Object();
    
    public static void main(String[] args) {
        // 线程1：先获取lock1，再获取lock2
        new Thread(() -> {
            synchronized (lock1) {
                System.out.println("线程1获得lock1");
                try {
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                synchronized (lock2) {
                    System.out.println("线程1获得lock2");
                }
            }
        }).start();
        
        // 线程2：先获取lock2，再获取lock1
        new Thread(() -> {
            synchronized (lock2) {
                System.out.println("线程2获得lock2");
                try {
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                synchronized (lock1) {
                    System.out.println("线程2获得lock1");
                }
            }
        }).start();
    }
    
    /**
     * 死锁的四个必要条件：
     * 1. 互斥条件：资源不能被共享
     * 2. 请求与保持：持有资源的同时请求新资源
     * 3. 不可剥夺：资源不能被强制剥夺
     * 4. 循环等待：存在资源的循环等待链
     * 
     * 预防死锁：
     * 1. 破坏互斥条件：使用无锁算法
     * 2. 破坏请求与保持：一次性申请所有资源
     * 3. 破坏不可剥夺：超时释放
     * 4. 破坏循环等待：按顺序申请资源
     */
    
    // 解决方案：按顺序获取锁
    public static void solution() {
        new Thread(() -> {
            synchronized (lock1) {
                synchronized (lock2) {
                    System.out.println("线程1执行");
                }
            }
        }).start();
        
        new Thread(() -> {
            synchronized (lock1) {  // 与线程1相同顺序
                synchronized (lock2) {
                    System.out.println("线程2执行");
                }
            }
        }).start();
    }
}
```

### 2. 活锁

```java
public class LivelockExample {
    
    static class Spoon {
        private Diner owner;
        
        public Spoon(Diner owner) {
            this.owner = owner;
        }
        
        public Diner getOwner() {
            return owner;
        }
        
        public void setOwner(Diner owner) {
            this.owner = owner;
        }
        
        public synchronized void use() {
            System.out.println(owner.name + " 使用勺子吃饭");
        }
    }
    
    static class Diner {
        private String name;
        private boolean isHungry;
        
        public Diner(String name) {
            this.name = name;
            this.isHungry = true;
        }
        
        public void eatWith(Spoon spoon, Diner spouse) {
            while (isHungry) {
                // 如果勺子不属于自己
                if (spoon.getOwner() != this) {
                    try {
                        Thread.sleep(1);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    continue;
                }
                
                // 如果配偶饿了，让给配偶
                if (spouse.isHungry) {
                    System.out.println(name + " 让勺子给 " + spouse.name);
                    spoon.setOwner(spouse);
                    continue;
                }
                
                // 使用勺子
                spoon.use();
                isHungry = false;
                spoon.setOwner(spouse);
            }
        }
    }
    
    /**
     * 活锁：
     * - 线程没有阻塞
     * - 但一直在改变状态
     * - 无法继续执行
     * 
     * 解决方案：
     * - 引入随机性
     * - 重试次数限制
     */
}
```

### 3. 线程饥饿

```java
public class StarvationExample {
    
    /**
     * 线程饥饿：
     * - 线程长期无法获得所需资源
     * - 无法继续执行
     * 
     * 原因：
     * 1. 高优先级线程占用资源
     * 2. 线程持有锁时间过长
     * 3. 线程池任务过多
     * 
     * 解决方案：
     * 1. 使用公平锁
     * 2. 合理设置线程优先级
     * 3. 避免长时间持有锁
     */
    
    // 使用公平锁
    private final Lock fairLock = new ReentrantLock(true);
    
    public void method() {
        fairLock.lock();
        try {
            // 业务逻辑
        } finally {
            fairLock.unlock();
        }
    }
}
```

## 七、最佳实践

### 1. 线程安全的单例模式

```java
// 1. 饿汉式（线程安全）
public class Singleton1 {
    private static final Singleton1 INSTANCE = new Singleton1();
    
    private Singleton1() {}
    
    public static Singleton1 getInstance() {
        return INSTANCE;
    }
}

// 2. 懒汉式 + 双重检查锁（线程安全）
public class Singleton2 {
    private static volatile Singleton2 instance;
    
    private Singleton2() {}
    
    public static Singleton2 getInstance() {
        if (instance == null) {
            synchronized (Singleton2.class) {
                if (instance == null) {
                    instance = new Singleton2();
                }
            }
        }
        return instance;
    }
}

// 3. 静态内部类（线程安全，推荐）
public class Singleton3 {
    private Singleton3() {}
    
    private static class Holder {
        private static final Singleton3 INSTANCE = new Singleton3();
    }
    
    public static Singleton3 getInstance() {
        return Holder.INSTANCE;
    }
}

// 4. 枚举（线程安全，最佳）
public enum Singleton4 {
    INSTANCE;
    
    public void doSomething() {
        // 业务方法
    }
}
```

### 2. 并发编程建议

```java
public class ConcurrencyBestPractices {
    
    /**
     * 1. 优先使用不可变对象
     */
    public static final class ImmutableUser {
        private final String name;
        private final int age;
        
        public ImmutableUser(String name, int age) {
            this.name = name;
            this.age = age;
        }
        
        // 只提供getter，不提供setter
        public String getName() { return name; }
        public int getAge() { return age; }
    }
    
    /**
     * 2. 减小锁的粒度
     */
    private final Object lock1 = new Object();
    private final Object lock2 = new Object();
    
    public void method1() {
        synchronized (lock1) {  // 只锁需要同步的部分
            // 操作1
        }
    }
    
    public void method2() {
        synchronized (lock2) {  // 使用不同的锁
            // 操作2
        }
    }
    
    /**
     * 3. 使用并发工具类代替wait/notify
     */
    private final CountDownLatch latch = new CountDownLatch(1);
    
    /**
     * 4. 优先使用并发集合
     */
    private final ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
    
    /**
     * 5. 使用线程池管理线程
     */
    private final ExecutorService executor = Executors.newFixedThreadPool(10);
    
    /**
     * 6. 避免在锁内做耗时操作
     */
    public void badExample() {
        synchronized (this) {
            // 数据库查询（耗时操作）
            // 网络请求（耗时操作）
        }
    }
    
    public void goodExample() {
        // 先执行耗时操作
        String result = queryDatabase();
        
        // 再加锁更新
        synchronized (this) {
            updateData(result);
        }
    }
}
```

这份文档涵盖了 Java 线程与并发的核心知识，包括线程基础、同步机制、线程通信、线程池、并发工具类和最佳实践。需要我继续补充其他内容吗？