---
title: MQ 架构设计详解
description: 深入解析 MQ 消息队列架构设计，包括异步解耦、流量削峰、事件驱动等不同场景的处理方案，以及 Kafka、RocketMQ、RabbitMQ 的技术选型对比。
---

# MQ 架构设计详解

## MQ 的核心价值

```
同步调用（无 MQ）：
A → B → C → D   串行等待，强耦合，任一环节慢则全慢

异步解耦（有 MQ）：
A → MQ ← B
         ← C     各自独立消费，互不影响
         ← D
```

---

## 一、异步解耦场景

### 问题

订单创建后需要通知库存、积分、短信、推送等多个下游系统，同步调用导致：
- 接口响应慢（需等所有下游完成）
- 强耦合（新增下游需改主流程代码）
- 下游故障影响主流程

### 方案

```
用户下单
  ↓
订单服务（写 DB，发 MQ）← 快速返回
  ↓
order-created topic
  ├── 库存服务（消费，扣减库存）
  ├── 积分服务（消费，增加积分）
  ├── 短信服务（消费，发送通知）
  └── 推送服务（消费，App 推送）
```

**设计要点：**
- 主流程只负责写 DB + 发消息，不关心下游
- 下游新增/删除不影响主流程，只需订阅/取消订阅 topic
- 每个下游独立消费，互不影响

---

## 二、流量削峰场景

### 问题

秒杀、大促活动瞬间流量是平时的 100 倍，直接打到数据库会压垮系统。

### 方案

```
用户请求（10000 QPS）
  ↓
MQ（缓冲队列）
  ↓
消费者（匀速处理，500 QPS）
  ↓
数据库（稳定写入）
```

**设计要点：**
- MQ 作为蓄水池，吸收流量峰值
- 消费者按数据库承受能力匀速消费
- 超出 MQ 容量的请求直接返回"活动火爆，请稍后重试"
- 结合 Redis 预扣库存，减少无效消息进入 MQ

```java
// 秒杀下单：先 Redis 预扣，再发 MQ
Long stock = redis.decrement("seckill:stock:" + itemId);
if (stock < 0) {
    redis.increment("seckill:stock:" + itemId); // 回补
    return Result.fail("库存不足");
}
// 发送 MQ，异步创建订单
mqTemplate.send("seckill-order", new SeckillOrder(userId, itemId));
return Result.ok("排队中，请稍候");
```

---

## 三、事件驱动场景

### 问题

微服务间需要数据同步，但直接 RPC 调用导致服务间强依赖，一个服务故障影响全链路。

### 方案：事件溯源（Event Sourcing）

```
用户服务
  ↓ 发布 UserRegistered 事件
MQ
  ├── 邮件服务（发送欢迎邮件）
  ├── 推荐服务（初始化推荐数据）
  └── 风控服务（建立用户画像）
```

**设计要点：**
- 事件命名用过去式（UserRegistered、OrderPaid）
- 事件包含足够信息，消费者无需回查
- 事件不可变，只追加不修改

```java
// 事件定义
public class OrderPaidEvent {
    private String orderId;
    private String userId;
    private BigDecimal amount;
    private LocalDateTime paidAt;
    // 包含消费者需要的所有信息，避免回查
}
```

---

## 四、延迟消息场景

### 问题

订单 30 分钟未支付自动取消、会员到期前 3 天提醒等延迟任务。

### 方案

**RocketMQ 延迟消息：**

```java
Message msg = new Message("order-timeout", body);
// 延迟级别：1s 5s 10s 30s 1m 2m 3m 4m 5m 6m 7m 8m 9m 10m 20m 30m 1h 2h
msg.setDelayTimeLevel(4); // 30s
producer.send(msg);
```

**Kafka 无原生延迟支持，常见方案：**

```
方案1：时间轮（HashedWheelTimer）+ Redis ZSet
  - 消息存入 Redis ZSet，score = 执行时间戳
  - 定时扫描到期消息，投递到 Kafka

方案2：多级 topic
  - delay_30s_topic → 消费者等待 30s 后转发到 real_topic
```

---

## 五、顺序消息场景

### 问题

订单状态流转（创建→支付→发货→完成）必须按顺序处理，乱序会导致状态机异常。

### 方案

**Kafka：同一 key 路由到同一 partition**

```java
// 生产者：用 orderId 作为 key，保证同一订单进同一 partition
kafkaTemplate.send("order-status", orderId, message);

// 同一 partition 内消息有序，单线程消费保证顺序
@KafkaListener(topicPartitions = @TopicPartition(
    topic = "order-status", partitions = {"0"}))
public void consume(ConsumerRecord<String, String> record) {
    // 单线程处理，保证顺序
}
```

**RocketMQ：MessageQueueSelector 选择固定队列**

```java
producer.send(msg, (mqs, msg, arg) -> {
    int index = Math.abs(arg.hashCode()) % mqs.size();
    return mqs.get(index);
}, orderId);
```

**注意：** 顺序消费会降低并发度，只对需要顺序的 key 使用，不要全局顺序。

---

## 六、分布式事务场景

### 问题

跨服务的数据一致性：订单服务扣款成功，但库存服务扣减失败，数据不一致。

### 方案：本地消息表 + MQ

```
1. 订单服务：扣款 + 写本地消息表（同一事务）
2. 定时任务：扫描消息表，发送 MQ
3. 库存服务：消费 MQ，扣减库存，幂等处理
4. 确认机制：库存服务回调，更新消息状态为已完成
5. 补偿：超时未确认的消息重新发送
```

### 方案：RocketMQ 事务消息

```
1. 发送半消息（消费者不可见）
2. 执行本地事务（扣款）
3. 成功 → 提交消息；失败 → 回滚消息
4. Broker 超时回查 → 检查本地事务状态
```

---

## Kafka vs RocketMQ 深度对比

### 架构设计差异

**Kafka：**
```
Producer → Topic(Partition) → Consumer Group
                ↓
         Partition 是核心单元
         每个 Partition 是一个有序日志文件
         消费进度由 Consumer 自己维护（offset）
         依赖 ZooKeeper（新版 KRaft 模式已去除）
```

**RocketMQ：**
```
Producer → Topic(MessageQueue) → Consumer Group
                ↓
         NameServer 做服务发现（轻量，无状态）
         Broker 主从架构，Master 写，Slave 读
         消费进度由 Broker 维护
```

### 核心能力对比

| 对比项 | Kafka | RocketMQ |
|--------|-------|----------|
| 吞吐量 | 极高（百万/s），顺序写磁盘 | 高（十万/s） |
| 延迟 | 毫秒级（批量发送有额外延迟） | 毫秒级，延迟更稳定 |
| 延迟消息 | ❌ 不支持，需自实现 | ✅ 18 个固定延迟级别 |
| 任意时间延迟 | ❌ | ✅ RocketMQ 5.x 支持 |
| 事务消息 | ✅ 支持（复杂） | ✅ 原生支持，回查机制完善 |
| 顺序消息 | ✅ 分区内有序 | ✅ 队列内有序，支持全局顺序 |
| 消息回溯 | ✅ 按 offset / 时间戳 | ✅ 按时间戳 |
| 死信队列 | ✅ DLT（需配置） | ✅ 原生支持 %DLQ% |
| 消息过滤 | ❌ 客户端过滤 | ✅ Broker 端 Tag/SQL 过滤 |
| 消息轨迹 | ❌ | ✅ 原生支持 |
| 运维复杂度 | 高（ZooKeeper 依赖） | 中（NameServer 轻量） |
| 大数据生态 | ✅ 极强（Flink/Spark/Hadoop） | 一般 |

### 消费模型差异

**Kafka Pull 模式：**
```
Consumer 主动拉取，自己控制消费速率
offset 由 Consumer 维护，可任意回溯
适合批量处理、大数据场景
```

**RocketMQ Push + Pull 混合：**
```
Push 模式：Broker 主动推送（底层仍是长轮询）
消费进度由 Broker 维护，重启后自动恢复
支持广播消费（每个消费者都收到）和集群消费
```

### 存储机制差异

**Kafka：**
```
每个 Partition 对应独立的日志文件
多 Partition 时磁盘随机写，性能下降
Partition 数量影响吞吐量上限
```

**RocketMQ：**
```
所有消息写入同一个 CommitLog（顺序写，性能高）
ConsumeQueue 作为索引，按 Topic/Queue 组织
即使 Topic 很多，写入性能也不下降
```

---

## 技术选型建议

| 场景 | 推荐 | 原因 |
|------|------|------|
| 日志收集、大数据管道 | Kafka | 吞吐量极高，与 Flink/Spark/Hadoop 生态无缝集成 |
| 电商订单、支付流程 | RocketMQ | 事务消息、延迟消息、顺序消息、消息轨迹原生支持 |
| 秒杀削峰 | Kafka / RocketMQ | 高吞吐，配合 Redis 预扣库存 |
| 强一致分布式事务 | RocketMQ | 事务消息 + 回查机制，比 Kafka 更完善 |
| 微服务异步解耦 | RocketMQ | Tag 过滤、消息轨迹、运维更简单 |
| 消息回溯重放 | Kafka | offset 机制天然支持任意位置回溯 |
| Topic 数量极多 | RocketMQ | CommitLog 统一存储，不受 Topic 数量影响 |
| 任务调度、工作流 | RabbitMQ | 灵活路由（Exchange/Binding），延迟极低 |

---

## 架构设计原则

1. 消息幂等：消费者必须保证幂等，MQ 不保证不重复
2. 消息顺序：只在必要时使用顺序消息，避免影响并发
3. 消息大小：单条消息建议 < 1MB，大文件存 OSS/S3，消息只传 URL
4. 监控告警：消费 lag、死信队列、重试次数必须监控
5. 容量规划：根据峰值 QPS × 消息大小 × 保留时间 规划存储
