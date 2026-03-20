---
title: MQ 兜底方案详解
description: 深入解析 MQ 消息可靠性兜底方案，按 Kafka 和 RocketMQ 分别说明生产者、Broker、消费者三个环节的丢失场景与对应兜底策略。
---

# MQ 兜底方案详解

## 消息丢失的三个环节

```
生产者 → [①发送丢失] → Broker → [②存储丢失] → 消费者 → [③消费丢失]
```

---

## Kafka 兜底方案

### ① 生产者发送丢失

**原因：** 网络抖动、Broker 宕机，消息未到达，生产者未感知。

**方案：acks + 重试 + 本地消息表**

```ini
# 等待所有 ISR 副本确认，最安全
acks=all

# 开启幂等，防止重试导致重复写入
enable.idempotence=true

# 重试次数
retries=2147483647
retry.backoff.ms=100
```

本地消息表兜底（防止重试也失败的极端情况）：

```java
@Transactional
public void createOrder(Order order) {
    orderMapper.insert(order);
    // 同一事务写入消息表
    localMessageMapper.insert(new LocalMessage("order-created", JSON.toJSONString(order)));
}

// 定时补偿：扫描超时未发送的消息
@Scheduled(fixedDelay = 5000)
public void retryPendingMessages() {
    localMessageMapper.selectPending().forEach(msg -> {
        try {
            kafkaTemplate.send(msg.getTopic(), msg.getContent()).get();
            localMessageMapper.markSent(msg.getId());
        } catch (Exception e) {
            localMessageMapper.incrementRetry(msg.getId());
        }
    });
}
```

### ② Broker 存储丢失

**原因：** 消息写入 PageCache 后 Broker 宕机，未 fsync 到磁盘。

**方案：多副本 + min.insync.replicas**

```ini
# 副本数（建议 3）
replication.factor=3

# 最少同步副本数，低于此数量拒绝写入
min.insync.replicas=2

# 生产者端配合
acks=all
```

```
3 副本：Leader + 2 Follower
min.insync.replicas=2：至少 2 个副本写入才返回成功
即使 1 个节点宕机，数据仍安全
```

### ③ 消费者消费丢失

**原因：** 自动提交 offset，业务处理失败但 offset 已提交。

**方案：手动提交 + 重试 + 死信队列（DLT）**

```java
// 关闭自动提交
spring.kafka.consumer.enable-auto-commit=false

@KafkaListener(topics = "order-topic")
public void consume(ConsumerRecord<String, String> record, Acknowledgment ack) {
    try {
        orderService.process(record.value());
        ack.acknowledge(); // 处理成功才提交 offset
    } catch (Exception e) {
        // 不 ack，消息重新投递
        log.error("消费失败，等待重试: {}", record.offset(), e);
    }
}
```

死信队列配置（重试 3 次后进 DLT）：

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, String> factory(
        ConsumerFactory<String, String> cf, KafkaTemplate<String, String> template) {
    var factory = new ConcurrentKafkaListenerContainerFactory<String, String>();
    factory.setConsumerFactory(cf);
    var recoverer = new DeadLetterPublishingRecoverer(template);
    // 指数退避：1s、2s、4s，共 3 次
    factory.setCommonErrorHandler(new DefaultErrorHandler(
        recoverer, new ExponentialBackOff(1000L, 2.0)));
    return factory;
}
```

---

## RocketMQ 兜底方案

### ① 生产者发送丢失

**原因：** 网络问题或 Broker 故障导致发送失败。

**方案一：同步发送 + 重试**

```java
// 同步发送，失败自动重试（默认重试 2 次）
SendResult result = producer.send(msg);
if (result.getSendStatus() != SendStatus.SEND_OK) {
    // 记录本地消息表，等待补偿
    localMessageMapper.insert(failedMsg);
}
```

**方案二：事务消息（强一致场景）**

```java
TransactionMQProducer producer = new TransactionMQProducer("group");
producer.setTransactionListener(new TransactionListener() {
    @Override
    public LocalTransactionState executeLocalTransaction(Message msg, Object arg) {
        try {
            orderService.createOrder((Order) arg); // 本地事务
            return LocalTransactionState.COMMIT_MESSAGE;
        } catch (Exception e) {
            return LocalTransactionState.ROLLBACK_MESSAGE;
        }
    }

    @Override
    public LocalTransactionState checkLocalTransaction(MessageExt msg) {
        // Broker 超时回查：检查本地事务是否成功
        String bizId = msg.getUserProperty("bizId");
        return orderService.exists(bizId)
            ? LocalTransactionState.COMMIT_MESSAGE
            : LocalTransactionState.ROLLBACK_MESSAGE;
    }
});
```

### ② Broker 存储丢失

**原因：** 异步刷盘模式下 Broker 宕机，PageCache 中的消息丢失。

**方案：同步刷盘 + 主从同步复制**

```ini
# Broker 配置
# 同步刷盘（默认 ASYNC_FLUSH，性能高但有丢失风险）
flushDiskType=SYNC_FLUSH

# 主从同步复制（默认 ASYNC_MASTER）
brokerRole=SYNC_MASTER
```

| 配置 | 性能 | 可靠性 |
|------|------|--------|
| ASYNC_FLUSH + ASYNC_MASTER | 最高 | 最低，可能丢消息 |
| SYNC_FLUSH + ASYNC_MASTER | 中 | 中，刷盘安全但主从可能不一致 |
| SYNC_FLUSH + SYNC_MASTER | 最低 | 最高，金融场景推荐 |

### ③ 消费者消费丢失

**原因：** 消费者返回 CONSUME_SUCCESS 但业务实际未处理成功。

**方案：消费失败返回 RECONSUME_LATER + 死信队列**

```java
@RocketMQMessageListener(topic = "order-topic", consumerGroup = "order-group")
public class OrderConsumer implements RocketMQListener<MessageExt> {
    @Override
    public void onMessage(MessageExt message) {
        try {
            orderService.process(message);
            // 正常消费，RocketMQ 自动 ACK
        } catch (Exception e) {
            // 抛出异常 → RocketMQ 自动重试（默认 16 次，间隔递增）
            // 16 次后进入死信队列 %DLQ%order-group
            throw new RuntimeException("消费失败，触发重试", e);
        }
    }
}
```

RocketMQ 重试间隔（16 次）：
```
10s 30s 1m 2m 3m 4m 5m 6m 7m 8m 9m 10m 20m 30m 1h 2h
```

死信队列消费（人工处理）：

```java
@RocketMQMessageListener(
    topic = "%DLQ%order-group",
    consumerGroup = "order-dlq-group")
public class OrderDLQConsumer implements RocketMQListener<MessageExt> {
    @Override
    public void onMessage(MessageExt message) {
        // 告警 + 记录 + 人工介入
        alertService.send("死信消息告警: " + message.getMsgId());
        dlqRecordMapper.insert(message);
    }
}
```

---

## 通用兜底：本地消息表

无论 Kafka 还是 RocketMQ，本地消息表是最终兜底手段：

```sql
CREATE TABLE local_message (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    biz_id      VARCHAR(64) NOT NULL,
    topic       VARCHAR(128) NOT NULL,
    content     TEXT NOT NULL,
    status      TINYINT DEFAULT 0,   -- 0=待发送 1=已发送 2=已确认
    retry_count INT DEFAULT 0,
    next_retry  DATETIME,
    created_at  DATETIME DEFAULT NOW(),
    UNIQUE KEY uk_biz_id (biz_id)
);
```

---

## 兜底能力对比

| 能力 | Kafka | RocketMQ |
|------|-------|----------|
| 生产者重试 | 手动配置 retries | 自动重试，默认 2 次 |
| 事务消息 | 支持，配置复杂 | 原生支持，回查机制完善 |
| Broker 持久化 | 多副本 + min.insync.replicas | 同步刷盘 + 主从同步 |
| 消费重试 | 需手动实现（不 ack） | 自动重试 16 次，间隔递增 |
| 死信队列 | DLT（需配置） | %DLQ% 原生支持 |
| 消息轨迹 | 无 | 原生支持，可追踪每条消息 |

---

## 监控告警

| 监控项 | 告警阈值 | 处理方式 |
|--------|----------|----------|
| 本地消息表积压 | 超过 100 条待发送 | 检查 MQ 连通性 |
| 消费者 lag 持续增长 | 超过 5 分钟 | 扩容消费者实例 |
| 死信队列有消息 | 任意消息进入 | 立即告警，人工排查 |
| Broker 磁盘使用率 | 超过 80% | 扩容或清理过期消息 |
