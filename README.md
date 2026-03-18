# 后端技术文档 📚

> Java 后端开发技术文档，系统梳理后端核心技术原理，持续更新。

## 在线访问

[https://github.com/dongzongao/hutuwendang](https://github.com/dongzongao/hutuwendang)

## 本地运行

```bash
cd docs-site
npm install
npm run dev
```

访问 http://localhost:5173

---

## ☕ Java

| 文档 | 深度内容 |
|------|---------|
| Java 基础 | 对象内存模型、泛型类型擦除机制、集合底层数据结构（HashMap 红黑树转换、ConcurrentHashMap 分段锁演进）、ClassLoader 双亲委派 |
| Java 线程与并发 | AQS 同步队列原理、ReentrantLock 公平/非公平锁实现、CountDownLatch/CyclicBarrier 底层、线程池任务调度与拒绝策略 |
| Java 线程技术详解 | synchronized 锁升级（偏向锁→轻量级锁→重量级锁）、volatile 内存屏障、CAS 原子操作与 ABA 问题 |
| Java Stream | 惰性求值与流水线原理、Spliterator 并行分割策略、中间操作与终止操作的执行时机 |
| Java 正则表达式 | NFA/DFA 引擎原理、回溯机制与灾难性回溯、零宽断言与捕获组 |
| Java 数据安全 | 对称/非对称加密在 Java 中的实现、数字签名与证书链验证、KeyStore 管理 |
| Pattern 类详解 | Pattern 编译缓存、Matcher 状态机、命名捕获组与反向引用 |

---

## 🔧 JVM

| 文档 | 深度内容 |
|------|---------|
| JVM 详解 | 运行时数据区内存布局、类文件结构与字节码指令、JIT 即时编译与逃逸分析、GC Roots 可达性分析 |
| G1 和 ZGC 垃圾回收器 | G1 Region 分区设计、RSet 记忆集与 Card Table、ZGC 染色指针与读屏障、停顿时间可预测模型 |
| 类加载机制 | 加载→验证→准备→解析→初始化五阶段、双亲委派模型与破坏场景（SPI、OSGi、热部署） |

---

## 🌱 Spring 生态

| 文档 | 深度内容 |
|------|---------|
| SpringBoot 详解 | 自动配置 @EnableAutoConfiguration 原理、spring.factories 加载机制、条件注解 @Conditional 实现 |
| SpringBoot IOC 容器 | BeanDefinition 注册流程、BeanFactory 与 ApplicationContext 区别、Bean 生命周期回调（Aware、BeanPostProcessor、InitializingBean） |
| WebFlux 详解 | Reactor Netty 事件循环模型、DispatcherHandler 请求处理链、与 Spring MVC 的线程模型对比 |
| Reactor 响应式编程 | Publisher/Subscriber 契约、Mono/Flux 操作符原理、背压（Backpressure）实现机制、调度器与线程切换 |

---

## 🗄️ 数据库

| 文档 | 深度内容 |
|------|---------|
| MySQL 详解 | InnoDB 存储引擎架构、Buffer Pool 缓冲池管理、redo log/undo log/binlog 三者关系、索引下推与覆盖索引 |
| MySQL 与 SpringBoot 事务 | 事务传播行为底层实现（ThreadLocal 绑定连接）、@Transactional 失效的 7 种场景、分布式事务 2PC/TCC/Saga |
| 数据库回表问题 | 聚簇索引与非聚簇索引结构、回表的 IO 代价、覆盖索引消除回表、索引合并（Index Merge） |
| MVCC 详解 | 隐藏字段（trx_id/roll_ptr）、undo log 版本链构建、Read View 生成时机与可见性判断算法、RC 与 RR 的本质区别 |
| B 树与 B+ 树 | 节点分裂与合并过程、B+ 树叶子双向链表设计、InnoDB 页结构（16KB）、树高与 IO 次数的关系 |
| MyBatis 核心原理 | JDK 动态代理生成 Mapper、MappedStatement 解析与缓存、SqlSource 动态 SQL 拼装、一级/二级缓存失效场景 |

---

## ⚡ 缓存

| 文档 | 深度内容 |
|------|---------|
| Redis 详解 | SDS 简单动态字符串、跳表（SkipList）层级概率设计、ziplist/listpack 内存优化、渐进式 rehash、持久化 RDB/AOF 混合模式、Cluster 一致性哈希槽 |
| Redis 源码解读 | dict 字典扩容触发条件、zset 编码切换阈值、LRU/LFU 近似算法实现、事件驱动模型 ae_event |

---

## 🔗 中间件 & 微服务

| 文档 | 深度内容 |
|------|---------|
| Nacos 详解 | AP/CP 模式切换（Distro 协议 vs Raft）、服务健康检查心跳机制、配置中心长轮询实现、命名空间隔离 |
| ZooKeeper 详解 | ZAB 协议（崩溃恢复+消息广播）、Leader 选举流程、Watch 机制一次性触发设计、临时节点与会话超时 |
| 微服务服务治理 | Sentinel 滑动窗口限流算法、Hystrix 熔断状态机（Closed/Open/Half-Open）、链路追踪 TraceId 传递原理 |
| Nginx 与 Gateway 对比 | Nginx 事件驱动模型、upstream 负载均衡算法、Spring Cloud Gateway 过滤器链、动态路由刷新机制 |
| MQ 重复消费解决方案 | 幂等消费设计、数据库唯一索引兜底、Redis SETNX 去重、消息表与业务同一事务的强一致方案 |
| Kafka 消息投递与重试 | ISR 副本同步机制、acks 三种模式的可靠性权衡、消费者 rebalance 触发条件、死信队列（DLT）设计、事务消息 exactly-once |

---

## 🔍 搜索引擎

| 文档 | 深度内容 |
|------|---------|
| Elasticsearch 详解 | 倒排索引结构、Segment 不可变设计与合并策略、Query Then Fetch 两阶段查询、近实时（NRT）原理、深分页 search_after |
| FST 详解 | 有限状态转换器前缀+后缀共享压缩、与 Trie 树对比、Lucene Term Dictionary 三层索引结构 |
| Roaring Bitmap 详解 | Array/Bitmap/Run 三种容器自适应选择、文档 ID 集合的位运算加速、Filter 缓存实现原理 |
| BM25 算法详解 | IDF 逆文档频率、词频饱和上限（k1 参数）、文档长度归一化（b 参数）、与 TF-IDF 的本质区别 |
| Canal 数据同步 | 伪装 MySQL Slave 订阅 Binlog、ROW 格式事件解析、MySQL→ES 增量同步架构、ZooKeeper HA 主备切换 |

---

## 🌐 网络 & 协议

| 文档 | 深度内容 |
|------|---------|
| HTTP 与 HTTPS | TLS 1.3 握手流程（1-RTT）、证书链验证、HSTS 强制加密、对称密钥协商（ECDHE） |
| HTTP/2 详解 | 二进制分帧层、多路复用消除队头阻塞、HPACK 头部压缩、服务端推送（Server Push） |
| HTTP 状态码 402 | 402 Payment Required 的设计背景与现实使用场景 |
| TCP 与 UDP | 三次握手/四次挥手状态机、TIME_WAIT 存在原因、滑动窗口与拥塞控制（慢启动/拥塞避免/快重传） |
| 多路复用 | select/poll/epoll 三者对比、epoll ET/LT 触发模式、Reactor 模式与 Proactor 模式 |
| 通信协议 | OSI 七层模型与 TCP/IP 四层对应关系、常见应用层协议（DNS/DHCP/SMTP）工作原理 |

---

## 🔒 安全 & 加密

| 文档 | 深度内容 |
|------|---------|
| 对称加密与非对称加密 | AES-GCM 认证加密、RSA 密钥生成与 OAEP 填充、ECC 椭圆曲线优势、混合加密在 HTTPS 中的应用 |

---

## 🏗️ 架构设计

| 文档 | 深度内容 |
|------|---------|
| 幂等设计 | Token 机制、数据库唯一约束、乐观锁版本号、状态机幂等、分布式场景下的幂等挑战 |

---

## 📐 算法

| 文档 | 深度内容 |
|------|---------|
| 算法学习路径 | 数据结构与算法的系统化学习路线与资源推荐 |
| 算法题与解题思路 | 双指针、滑动窗口、回溯、动态规划、单调栈等核心解题模板 |
| 时间与空间复杂度 | 主定理（Master Theorem）、均摊分析、空间复杂度常见误区 |

---

## 💡 开发方法论

| 文档 | 深度内容 |
|------|---------|
| 开发方法论 | SOLID 原则、DDD 领域驱动设计、Clean Architecture、代码可读性与重构实践 |

---

## 技术栈

- [VitePress](https://vitepress.dev/) - 静态文档站点生成器
- Markdown - 文档编写格式
