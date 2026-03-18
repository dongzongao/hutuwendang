---
title: Canal 数据同步详解
description: 深入解析 Canal 数据同步原理，MySQL Binlog 订阅机制、伪装 Slave 实现增量同步、MySQL 到 Elasticsearch 的实时同步架构及 ZooKeeper 高可用部署方案。
---

# Canal 数据同步详解

## 是什么

Canal 是阿里巴巴开源的 MySQL Binlog 增量订阅和消费组件，常用于将 MySQL 数据实时同步到 ES、Redis、MQ 等下游系统。

---

## 原理

Canal 伪装成 MySQL 的从库（Slave），订阅主库的 Binlog：

```
MySQL 主库
   ↓ Binlog（row 格式）
Canal Server（伪装成 Slave）
   ↓ 解析 Binlog 事件
Canal Client / MQ
   ↓
ES / Redis / 其他系统
```

MySQL 主从复制的原理：
1. 主库将数据变更写入 Binlog
2. 从库的 IO Thread 连接主库，拉取 Binlog 存到 Relay Log
3. 从库的 SQL Thread 重放 Relay Log

Canal 就是模拟步骤 2，假装自己是从库，拉取 Binlog 后自己解析处理。

---

## Binlog 格式

Canal 要求 MySQL 开启 row 格式的 Binlog：

```ini
# my.cnf
log-bin=mysql-bin
binlog-format=ROW
server-id=1
```

| 格式 | 说明 | Canal 支持 |
|------|------|-----------|
| STATEMENT | 记录 SQL 语句 | 不推荐（函数结果不确定） |
| ROW | 记录每行数据的变化（前后镜像） | ✅ 推荐 |
| MIXED | 混合模式 | 部分支持 |

---

## Canal 事件类型

| 事件 | 对应操作 |
|------|----------|
| INSERT | 新增行 |
| UPDATE | 修改行（包含修改前和修改后的数据） |
| DELETE | 删除行 |
| DDL | 表结构变更 |

---

## 与 ES 同步架构

```
MySQL（主库）
   ↓ Binlog
Canal Server
   ↓ 解析事件
MQ（Kafka/RocketMQ）    ← 解耦，削峰
   ↓
ES 同步消费者
   ↓ bulk 写入
Elasticsearch
```

直连模式（无 MQ）：

```
Canal Server → Canal Client（业务服务）→ ES
```

---

## 核心代码示例

```java
// Canal Client 消费示例
CanalConnector connector = CanalConnectors.newSingleConnector(
    new InetSocketAddress("127.0.0.1", 11111), "example", "", "");

connector.connect();
connector.subscribe(".*\\..*");  // 订阅所有库表

while (true) {
    Message message = connector.getWithoutAck(100);
    long batchId = message.getId();

    for (CanalEntry.Entry entry : message.getEntries()) {
        if (entry.getEntryType() == CanalEntry.EntryType.ROWDATA) {
            CanalEntry.RowChange rowChange = CanalEntry.RowChange.parseFrom(
                entry.getStoreValue());

            for (CanalEntry.RowData rowData : rowChange.getRowDatasList()) {
                if (rowChange.getEventType() == CanalEntry.EventType.INSERT) {
                    // 同步到 ES
                    syncToES(rowData.getAfterColumnsList());
                } else if (rowChange.getEventType() == CanalEntry.EventType.UPDATE) {
                    syncUpdateToES(rowData.getAfterColumnsList());
                } else if (rowChange.getEventType() == CanalEntry.EventType.DELETE) {
                    deleteFromES(rowData.getBeforeColumnsList());
                }
            }
        }
    }
    connector.ack(batchId);
}
```

---

## 高可用部署

Canal 支持 HA 模式，通过 ZooKeeper 实现主备切换：

```
Canal Server 1（Active）  ←→  ZooKeeper
Canal Server 2（Standby）←→  ZooKeeper

Active 宕机 → ZooKeeper 感知 → Standby 接管
```

---

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 数据延迟 | 消费速度跟不上 Binlog 产生速度 | 增加消费者并发，批量写入 ES |
| 数据重复 | Canal 重启后从上次位点重新消费 | ES 写入做幂等（用 MySQL 主键作为 ES `_id`） |
| 全量同步 | Canal 只能增量，首次需全量 | 先全量导入，再开启 Canal 增量同步 |
| DDL 变更 | 表结构变更需同步更新 ES Mapping | 监听 DDL 事件，自动更新 Mapping |
