---
title: Kafka 消息投递与重试
description: 深入解析 Kafka 消息投递语义（at-most-once/at-least-once/exactly-once），acks 配置、ISR 副本同步、消费者重试、死信队列（DLT）及事务消息原理。
---

# Kafka 消息投递与重试

## 投递语义

| 语义 | 说明 | 配置 |
|------|------|------|
| at-most-once | 最多一次，可能丢消息 | acks=0，不重试 |
| at-least-once | 至少一次，可能重复 | acks=all，开启重试（默认） |
| exactly-once | 恰好一次 | 幂等生产 + 事务 |

---

## 生产者投递流程

```
Producer
   ↓ 发送
Leader Partition
   ↓ 同步
Follower Partition × N
   ↓ ISR 全部写入
返回 ack 给 Producer
```

关键配置：

```ini
# 等待所有 ISR 副本确认，最安全
acks=all

# 重试次数，建议设大，配合幂等使用
retries=2147483647

# 重试间隔
retry.backoff.ms=100

# 开启幂等，防止重试导致重复写入
enable.idempotence=true
```

---

## acks 三种模式

```
acks=0   Producer ──→ broker（不等响应，最快，可能丢）

acks=1   Producer ──→ Leader 写入 ──→ 返回 ack（Leader 挂了会丢）

acks=all Producer ──→ Leader + 所有 ISR 写入 ──→ 返回 ack（最安全）
```

---

## 消费者重试

Kafka 本身没有内置消费重试机制，需要业务侧处理。

**Spring Kafka 重试配置：**

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, String> factory(
        ConsumerFactory<String, String> cf) {
    var factory = new ConcurrentKafkaListenerContainerFactory<String, String>();
    factory.setConsumerFactory(cf);

    // 本地重试 3 次，间隔 1s
    factory.setCommonErrorHandler(new DefaultErrorHandler(
        new FixedBackOff(1000L, 3L)
    ));
    return factory;
}
```

**死信队列（DLT）兜底：**

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, String> factory(
        ConsumerFactory<String, String> cf,
        KafkaTemplate<String, String> template) {
    var factory = new ConcurrentKafkaListenerContainerFactory<String, String>();
    factory.setConsumerFactory(cf);

    // 重试 3 次后发送到死信 topic：original-topic.DLT
    var recoverer = new DeadLetterPublishingRecoverer(template);
    factory.setCommonErrorHandler(new DefaultErrorHandler(
        recoverer, new FixedBackOff(1000L, 3L)
    ));
    return factory;
}
```

死信 topic 命名规则默认是 `原topic.DLT`，可单独消费处理或人工介入。

---

## 重试 vs 死信

```
消息消费失败
    ↓
本地重试（3次）
    ↓ 仍失败
发送到 DLT（死信 topic）
    ↓
告警 + 人工处理 / 定时重新投递
```

---

## 事务消息（exactly-once）

```java
// 开启事务
kafkaTemplate.executeInTransaction(ops -> {
    ops.send("topic-a", "msg1");
    ops.send("topic-b", "msg2");
    return true;
    // 两条消息原子提交，要么都成功要么都回滚
});
```

配置：

```ini
# 生产者
enable.idempotence=true
transactional.id=my-transactional-id

# 消费者（只读已提交的消息）
isolation.level=read_committed
```

---

## 总结

| 场景 | 推荐方案 |
|------|----------|
| 普通业务 | acks=all + 幂等生产 + 消费侧去重 |
| 重要消息不能丢 | acks=all + 重试 + DLT 兜底 |
| 强一致（金融） | 事务消息 + isolation.level=read_committed |
