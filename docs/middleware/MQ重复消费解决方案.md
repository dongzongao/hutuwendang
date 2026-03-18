# MQ 重复消费解决方案

## 1. 为什么会重复消费

MQ 保证消息至少投递一次（At Least Once），以下场景都会触发重复消费：

```
场景1：消费者处理完业务，ACK 前宕机 → MQ 重新投递
场景2：消费者处理超时，MQ 认为失败 → 重新投递
场景3：网络抖动，ACK 丢失 → MQ 重新投递
场景4：手动重试、消费者重启
```

核心原则：**MQ 不保证不重复，业务侧保证幂等**。

---

## 2. 方案一：数据库唯一索引（最简单）

在消费记录表上建唯一索引，重复消费直接被数据库拦截。

```sql
CREATE TABLE mq_consume_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    msg_id VARCHAR(64) NOT NULL,
    topic VARCHAR(128),
    consume_time DATETIME,
    UNIQUE KEY uk_msg_id (msg_id)  -- 唯一索引
);
```

```java
@Transactional
public void consume(Message message) {
    try {
        // 插入消费记录
        consumeLogMapper.insert(new ConsumeLog(message.getMsgId()));
        // 执行业务逻辑
        businessService.process(message);
    } catch (DuplicateKeyException e) {
        // 重复消费，直接忽略
        log.warn("重复消息，忽略: {}", message.getMsgId());
    }
}
```

优点：简单可靠，DB 保证
缺点：每条消息多一次 DB 写入

---

## 3. 方案二：Redis SETNX 去重

用消息 ID 作为 key，消费前 SETNX，成功才处理。

```java
public void consume(Message message) {
    String key = "mq:consumed:" + message.getMsgId();
    
    // SETNX + 过期时间，原子操作
    Boolean isNew = redisTemplate.opsForValue()
        .setIfAbsent(key, "1", 24, TimeUnit.HOURS);
    
    if (!Boolean.TRUE.equals(isNew)) {
        log.warn("重复消息，忽略: {}", message.getMsgId());
        return;
    }
    
    // 执行业务逻辑
    businessService.process(message);
}
```

优点：性能好，不依赖 DB
缺点：Redis 故障时可能失效，需降级方案

---

## 4. 方案三：业务状态判断（状态机）

消费前查询业务数据当前状态，已处理则跳过。

```java
public void consume(OrderMessage message) {
    Order order = orderMapper.selectById(message.getOrderId());
    
    // 状态已流转，说明已处理过
    if (!"PENDING".equals(order.getStatus())) {
        log.warn("订单已处理，忽略重复消息: {}", message.getOrderId());
        return;
    }
    
    // 用条件更新做兜底，防并发
    int rows = orderMapper.updateStatus(
        message.getOrderId(), "PENDING", "PAID"
    );
    if (rows == 0) {
        log.warn("并发更新失败，忽略: {}", message.getOrderId());
        return;
    }
    
    // 后续业务处理
}
```

优点：语义清晰，天然幂等
缺点：依赖业务有明确状态，不通用

---

## 5. 方案四：Token + Redis（强一致）

消息生产时携带唯一 token，消费时用 Lua 脚本原子判断+删除。

```java
// Lua 脚本：判断存在则删除，原子操作
String luaScript =
    "if redis.call('get', KEYS[1]) == ARGV[1] then " +
    "   return redis.call('del', KEYS[1]) " +
    "else return 0 end";

String key = "mq:token:" + message.getMsgId();
Long result = redisTemplate.execute(
    new DefaultRedisScript<>(luaScript, Long.class),
    Collections.singletonList(key),
    message.getToken()
);

if (result == null || result == 0) {
    log.warn("重复消息或token无效: {}", message.getMsgId());
    return;
}

businessService.process(message);
```

---

## 6. 方案五：消息表 + 业务同一事务

消费记录插入和业务操作在同一个本地事务，要么都成功要么都回滚。

```java
@Transactional
public void consume(Message message) {
    // 1. 查询是否已消费
    if (consumeLogMapper.exists(message.getMsgId())) {
        return;
    }
    
    // 2. 执行业务
    businessService.process(message);
    
    // 3. 记录已消费（同一事务）
    consumeLogMapper.insert(new ConsumeLog(
        message.getMsgId(),
        message.getTopic(),
        LocalDateTime.now()
    ));
    // 事务提交后再 ACK
}
```

优点：强一致，业务和消费记录原子性
缺点：业务 DB 和消费记录必须同库

---

## 7. 各方案对比

| 方案 | 一致性 | 性能 | 复杂度 | 适用场景 |
|------|--------|------|--------|----------|
| 唯一索引 | 强 | 中 | 低 | 通用，首选 |
| Redis SETNX | 弱（Redis故障） | 高 | 低 | 高并发，允许极少量漏判 |
| 业务状态判断 | 强 | 中 | 中 | 有状态流转的业务 |
| Token + Lua | 强 | 高 | 中 | 需要精确控制的场景 |
| 消息表+事务 | 最强 | 低 | 高 | 金融、支付等强一致场景 |

---

## 8. RocketMQ / Kafka 消息 ID 获取

```java
// RocketMQ
@RocketMQMessageListener(topic = "order-topic", consumerGroup = "order-group")
public class OrderConsumer implements RocketMQListener<MessageExt> {
    @Override
    public void onMessage(MessageExt message) {
        String msgId = message.getMsgId(); // 唯一ID
        // 去重逻辑...
    }
}

// Kafka
@KafkaListener(topics = "order-topic", groupId = "order-group")
public void consume(ConsumerRecord<String, String> record) {
    // Kafka 用 topic + partition + offset 组合唯一标识
    String msgId = record.topic() + "-" + record.partition() + "-" + record.offset();
    // 去重逻辑...
}
```

---

## 9. 最佳实践总结

1. 消息生产方：每条消息携带全局唯一 msgId（UUID 或雪花算法）
2. 消费方：先查后处理，处理和记录同事务
3. 兜底：数据库唯一索引作为最后防线
4. 监控：记录重复消费次数，异常频繁时告警排查上游

---

## 10. Kafka 重复消费专项

### 为什么 Kafka 更容易重复

1. 消费者处理完消息，提交 offset 前挂掉 → 重启后从上次 offset 重新消费
2. 消费者处理超时，被 Kafka 认为宕机，触发 rebalance，消息被其他消费者重新消费
3. 生产者开启重试，网络抖动导致 broker 已写入但 ack 未返回，生产者重发

### 生产者侧：开启幂等生产

Kafka 0.11+ 支持 exactly-once 语义，配置生产者幂等：

```ini
enable.idempotence=true
acks=all
retries=2147483647
```

开启后 Kafka 为每条消息分配序列号，broker 自动去重，避免生产者重试导致的重复写入。

### 消费者侧：用 topic + partition + offset 作唯一 ID

```java
@KafkaListener(topics = "order-topic", groupId = "order-group")
public void consume(ConsumerRecord<String, String> record) {
    String msgId = record.topic() + "-" + record.partition() + "-" + record.offset();

    if (redis.exists("msg:" + msgId)) {
        return; // 已处理，跳过
    }

    // 处理业务逻辑
    businessService.process(record.value());

    redis.set("msg:" + msgId, "1", 24, TimeUnit.HOURS);
}
```

### 总结

| 层面 | 方案 |
|------|------|
| 生产者 | `enable.idempotence=true` |
| 消费者 | Redis/DB 去重 + 唯一索引 + 乐观锁 |
| 业务设计 | 让操作本身幂等（如 upsert 代替 insert） |

最稳的做法是生产者 + 消费者两侧都做，不依赖单一保障。
