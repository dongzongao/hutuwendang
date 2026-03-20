---
title: IO 模型详解
description: 深入解析 BIO、NIO、IO 多路复用（select/poll/epoll）、信号驱动 IO、AIO 五种模型原理，epoll ET/LT 触发模式对比，以及 Netty、Redis、Nginx 的 IO 模型选型。
---

# IO 模型详解

## 1. 两个核心阶段

所有 IO 模型的本质区别，都在于如何处理这两个阶段：

```
阶段一：等待数据就绪（数据从网卡到内核缓冲区）
阶段二：数据拷贝（从内核缓冲区拷贝到用户空间）
```

各模型的差异就是：这两个阶段谁来等、是否阻塞。

---

## 2. BIO（Blocking IO）

两个阶段全部阻塞。线程发起 `read()` 后挂起，直到数据拷贝完成才返回。

```
用户线程:  read() --------阻塞等待-------- 返回数据
内核:              [等待数据到达] → [拷贝到用户空间]
```

特点：
- 编程模型简单，一个连接一个线程
- 连接数增多时线程数爆炸，内存和上下文切换开销大
- 适合连接数少、每连接处理时间长的场景（如传统 Tomcat BIO 模式）

---

## 3. NIO（Non-Blocking IO）

第一阶段非阻塞，线程反复轮询内核数据是否就绪；第二阶段（拷贝）仍然阻塞。

```
用户线程:  read() → EAGAIN → read() → EAGAIN → read() → 返回数据
                  （未就绪）          （未就绪）          （就绪，拷贝）
```

问题：单纯轮询会空转 CPU，实际不直接使用，需配合 IO 多路复用才有意义。

---

## 4. IO 多路复用

用一个线程同时监听多个 fd（文件描述符），有 fd 就绪再去 read。第二阶段仍然阻塞。

```
用户线程:  epoll_wait() ----阻塞监听多个 fd---- 返回就绪 fd 列表
           → 遍历就绪列表 → read() 各个 fd
```

### 4.1 select / poll / epoll 对比

| | select | poll | epoll |
|---|---|---|---|
| fd 数量限制 | 1024（FD_SETSIZE） | 无限制 | 无限制 |
| 就绪通知方式 | 遍历所有 fd，O(n) | 遍历所有 fd，O(n) | 回调机制，O(1) |
| 内核/用户数据拷贝 | 每次调用都拷贝全量 fd 集合 | 每次调用都拷贝全量 | 只返回就绪的 fd |
| 触发模式 | LT | LT | LT / ET |
| 内核实现 | fd_set 位图 | pollfd 数组 | 红黑树 + 就绪链表 |

### 4.2 epoll 内部结构

```
epoll_create()  → 创建 epoll 实例（内核维护一棵红黑树）
epoll_ctl()     → 向红黑树注册/修改/删除 fd
epoll_wait()    → 阻塞等待，就绪 fd 通过回调加入就绪链表，返回链表
```

```java
// Java NIO 对应的 epoll 使用
Selector selector = Selector.open();
channel.configureBlocking(false);
channel.register(selector, SelectionKey.OP_READ);

while (true) {
    selector.select();  // 对应 epoll_wait
    Set<SelectionKey> keys = selector.selectedKeys();
    for (SelectionKey key : keys) {
        if (key.isReadable()) {
            // 处理读事件
        }
    }
}
```

### 4.3 LT 与 ET 触发模式

**LT（Level Triggered，水平触发）**：只要 fd 缓冲区还有数据，每次 `epoll_wait` 都会通知。
- 安全，不会漏事件
- 通知次数多

**ET（Edge Triggered，边缘触发）**：只在 fd 状态发生变化时通知一次。
- 必须一次性将数据读完（循环 read 直到 EAGAIN），否则不再通知
- 通知次数少，性能更高
- Nginx 使用 ET 模式

```c
// ET 模式必须循环读完
while (true) {
    ssize_t n = read(fd, buf, sizeof(buf));
    if (n == -1 && errno == EAGAIN) break;  // 读完了
    if (n <= 0) break;                       // 连接关闭或出错
    process(buf, n);
}
```

---

## 5. 信号驱动 IO（SIGIO）

注册信号处理函数，内核数据就绪时发 `SIGIO` 信号通知用户线程，用户线程再去 read（第二阶段仍阻塞）。

```
用户线程:  sigaction(SIGIO, handler) → 继续干别的
内核:      数据就绪 → 发送 SIGIO 信号
用户线程:  收到信号 → 执行 handler → read()（阻塞拷贝）
```

实际使用少，信号处理复杂，且大量连接时信号队列可能溢出。

---

## 6. AIO（Async IO，异步 IO）

两个阶段都不阻塞。用户发起异步读请求后立即返回，内核完成等待和拷贝后回调通知。

```
用户线程:  aio_read(callback) → 立即返回 → 继续干别的
内核:      [等待数据就绪] → [拷贝到用户空间] → 执行 callback
```

现实情况：
- **Linux**：传统 POSIX AIO 用线程池模拟，并非真异步。`io_uring`（Linux 5.1+）才是真正的异步 IO，性能极高
- **Windows**：IOCP（I/O Completion Port）是真 AIO，成熟稳定
- **Java NIO2**：`AsynchronousSocketChannel` 在 Linux 上底层是线程池模拟，并非真 AIO

```java
// Java AIO 示例
AsynchronousSocketChannel channel = AsynchronousSocketChannel.open();
ByteBuffer buf = ByteBuffer.allocate(1024);
channel.read(buf, null, new CompletionHandler<Integer, Void>() {
    @Override
    public void completed(Integer result, Void attachment) {
        // 数据已拷贝到 buf，直接处理
        process(buf);
    }
    @Override
    public void failed(Throwable exc, Void attachment) {
        exc.printStackTrace();
    }
});
```

---

## 7. 五种模型总结

| 模型 | 等待就绪（阶段一） | 数据拷贝（阶段二） | 典型应用 |
|------|---------|---------|---------|
| BIO | 阻塞 | 阻塞 | 传统 Tomcat、JDBC |
| NIO | 非阻塞轮询 | 阻塞 | 配合 epoll 使用 |
| IO 多路复用 | 阻塞（监听多个 fd） | 阻塞 | Netty、Redis、Nginx |
| 信号驱动 IO | 非阻塞（信号通知） | 阻塞 | 少用 |
| AIO | 非阻塞 | 非阻塞 | io_uring、Windows IOCP |

---

## 8. 主流框架的 IO 模型选型

**Redis**：单线程 + epoll IO 多路复用
- 命令处理单线程避免锁竞争
- epoll 监听所有客户端连接，有事件才处理
- Redis 6.0 引入多线程处理网络 IO，命令执行仍单线程

**Nginx**：多进程 + epoll ET 模式
- Master 进程管理，Worker 进程处理请求
- 每个 Worker 独立 epoll，无锁竞争
- ET 模式减少系统调用次数

**Netty**：主从 Reactor + epoll
- BossGroup（1个线程）：accept 新连接
- WorkerGroup（CPU核数×2）：处理 IO 读写
- 业务线程池：处理耗时业务逻辑

```
Client → BossGroup(accept) → WorkerGroup(read/write) → BusinessPool(logic)
```
