---
title: MQ 兜底方案详解
description: 深入解析 MQ 消息可靠性兜底方案，包括消息丢失的各个环节分析、本地消息表、事务消息、死信队列、补偿任务等完整兜底体系设计。
---

# MQ 兜底方案详解

## 消息丢失的三个环节

```
生产者 → [①发送丢失] → Broker → [②存储丢失] → 消费者 → [③消费丢失]
```

兜底方案需要覆盖每个环节。

---

## 环节一：生产者发送丢失

### 问题

网络抖动、Broker 宕机导致消息未到达 Broker，生产者未感知。

### 方案：本地消息表

```
1. 业务操作 + 写入本地消息表（同一事务）
2. 异步线程扫描消息表，发送未发送的消息
3. 发送成功后更新消息状态为"已发送"
4. 定时补偿：扫描超时未确认的消息，重新发送
```

```sql
CREATE TABLE local_message (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    biz_id      VARCHAR(64) NOT NULL,       -- 业务唯一 ID
    topic       VARCHAR(128) NOT NULL,
    content     TEXT NOT NULL,
    status      TINYINT DEFAULT 0,          -- 0=待发送 1=已发送 2=已确认
    retry_count INT DEFAULT 0,
    next_retry  DATETIME,
    created_at  DATETIME DEFAULT NOW(),
    UNIQUE KEY uk_biz_id (biz_id)
);
```

```java
@Transactional
public void createOrder(Order order) {
    // 1. 业务操作
    orderMapper.insert(order);

    // 2. 写入本地消息表（同一事务，原子性）
    LocalMessage msg = new LocalMessage();
    msg.setBizId(order.getId());
    msg.setTopic("order-created");
    msg.setContent(JSON.toJSONString(order));
    localMessageMapper.insert(msg);
}

// 定时任务：扫描待发送消息
@Scheduled(fixedDelay = 5000)
public void sendPendingMessages() {
    List<LocalMessage> msgs = localMessageMapper.selectPending();
    for (LocalMessage msg : msgs) {
        try {
            mqTemplate.send(msg.getTopic(), msg.getContent());
            localMessageMapper.updateStatus(msg.getId(), SENT);
        } catch (Exception e) {
            localMessageMapper.incrementRetry(msg.getId());
        }
    }
}
```

### 方案：事务消息（RocketMQ）

RocketMQ 原生支持事务消息，无需本地消息表：

```
1. 发送半消息（Half Message）到 Broker，消费者不可见
2. 执行本地事务
3. 本地事务成功 → 提交消息（消费者可见）
   本地事务失败 → 回滚消息（删除）
4. Broker 超时未收到确认 → 回查生产者事务状态
```

```java
TransactionMQProducer producer = new TransactionMQProducer("group");
producer.setTransactionListener(new TransactionListener() {
    @Override
    public LocalTransactionState executeLocalTransaction(Message msg, Object arg) {
        try {
            orderService.createOrder((Order) arg);
            return LocalTransactionState.COMMIT_MESSAGE;
        } catch (Exception e) {
            return LocalTransactionState.ROLLBACK_MESSAGE;
        }
    }

    @Override
    public LocalTransactionState checkLocalTransaction(MessageExt msg) {
        // Broker 回查：检查本地事务是否执行成功
        String bizId = msg.getUserProperty("bizId");
        return orderService.exists(bizId)
            ? LocalTransactionState.COMMIT_MESSAGE
            : LocalTransactionState.ROLLBACK_MESSAGE;
    }
});
```

---

## 环节二：Broker 存储丢失

### 问题

消息写入 Broker 内存后，Broker 宕机，消息未持久化到磁盘。

### 方案

**Kafka：**
```ini
# 每条消息同步刷盘（性能损耗大，重要场景使用）
log.flush.interval.messages=1

# 多副本 + 等待所有 ISR 确认
acks=all
replication.factor=3
min.insync.replicas=2
```

**RocketMQ：**
```ini
# 同步刷盘（默认异步）
flushDiskType=SYNC_FLUSH

# 主从同步复制
brokerRole=SYNC_MASTER
```

---

## 环节三：消费者消费丢失

### 问题

消费者拉取消息后，业务处理失败或进程崩溃，消息被标记为已消费但实际未处理。

### 方案：手动 ACK + 重试

```java
// Kafka：关闭自动提交，手动提交 offset
@KafkaListener(topics = "order-topic")
public void consume(ConsumerRecord<String, String> record,
                    Acknowledgment ack) {
    try {
        orderService.process(record.value());
        ack.acknowledge();  // 处理成功才提交 offset
    } catch (Exception e) {
        // 不 ack，消息会重新投递
        log.error("消费失败，等待重试", e);
    }
}
```

### 方案：死信队列（DLT）兜底

```
消费失败
  ↓ 重试 N 次（指数退避）
仍失败
  ↓
发送到死信 topic（original-topic.DLT）
  ↓
告警通知 + 人工处理 / 定时重新投递
```

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, String> factory(
        ConsumerFactory<String, String> cf,
        KafkaTemplate<String, String> template) {
    var factory = new ConcurrentKafkaListenerContainerFactory<String, String>();
    factory.setConsumerFactory(cf);

    // 重试 3 次（1s、2s、4s 指数退避），失败后进死信
    var recoverer = new DeadLetterPublishingRecoverer(template);
    var backOff = new ExponentialBackOff(1000L, 2.0);
    backOff.setMaxAttempts(3);
    factory.setCommonErrorHandler(new DefaultErrorHandler(recoverer, backOff));
    return factory;
}
```

---

## 完整兜底体系

```
生产者
  ├── 本地消息表 / 事务消息（保证发送）
  └── 定时补偿任务（扫描未确认消息重发）

Broker
  ├── 同步刷盘（防止宕机丢消息）
  └── 多副本同步（防止单点故障）

消费者
  ├── 手动 ACK（处理成功才确认）
  ├── 重试机制（指数退避，避免瞬时故障）
  ├── 死信队列（兜底，人工介入）
  └── 幂等消费（防止重试导致重复处理）
```

---

## 监控告警

| 监控项 | 告警阈值 | 处理方式 |
|--------|----------|----------|
| 本地消息表积压 | 超过 100 条待发送 | 检查 MQ 连通性 |
| 消费者 lag 增长 | 持续增长超 5 分钟 | 扩容消费者 |
| 死信队列有消息 | 任意消息进入 DLT | 立即告警，人工排查 |
| 重试次数异常 | 单消息重试 > 3 次 | 检查消费者业务逻辑 |
