# Redis核心知识

## 一、Redis简介

Redis（Remote Dictionary Server）是一个开源的内存数据结构存储系统，可以用作数据库、缓存和消息中间件。

### 核心特点
- 基于内存运行，性能极高
- 支持数据持久化
- 支持多种数据结构
- 支持主从复制
- 支持事务
- 支持发布订阅

## 二、数据结构

### 1. String（字符串）
最基本的数据类型，二进制安全，可以存储任何数据。

```bash
SET key value
GET key
INCR key          # 自增
DECR key          # 自减
APPEND key value  # 追加
```

**应用场景**：
- 缓存：存储用户信息、配置信息
- 计数器：点赞数、访问量
- 分布式锁：SETNX实现
- Session共享

### 2. Hash（哈希）
键值对集合，适合存储对象。

```bash
HSET key field value
HGET key field
HMSET key field1 value1 field2 value2
HGETALL key
HINCRBY key field increment
```

**应用场景**：
- 存储对象：用户信息、商品信息
- 购物车：用户ID为key，商品ID为field

### 3. List（列表）
有序的字符串列表，底层是双向链表。

```bash
LPUSH key value    # 左侧插入
RPUSH key value    # 右侧插入
LPOP key           # 左侧弹出
RPOP key           # 右侧弹出
LRANGE key start stop
```

**应用场景**：
- 消息队列：LPUSH + BRPOP
- 最新列表：朋友圈、微博时间线
- 排行榜

### 4. Set（集合）
无序的字符串集合，元素唯一。

```bash
SADD key member
SMEMBERS key
SISMEMBER key member
SINTER key1 key2    # 交集
SUNION key1 key2    # 并集
SDIFF key1 key2     # 差集
```

**应用场景**：
- 标签系统：用户标签、文章标签
- 共同好友：交集运算
- 去重：唯一性保证

### 5. Sorted Set（有序集合）
有序的字符串集合，每个元素关联一个分数。

```bash
ZADD key score member
ZRANGE key start stop [WITHSCORES]
ZREVRANGE key start stop
ZRANK key member
ZINCRBY key increment member
```

**应用场景**：
- 排行榜：游戏积分、热搜榜
- 延迟队列：score为时间戳
- 优先级队列

## 三、持久化机制

### 1. RDB（Redis Database）
快照方式，将某个时间点的数据保存到磁盘。

**触发方式**：
- 手动触发：SAVE、BGSAVE命令
- 自动触发：配置save规则

```bash
# redis.conf配置
save 900 1      # 900秒内至少1个key变化
save 300 10     # 300秒内至少10个key变化
save 60 10000   # 60秒内至少10000个key变化
```

**优点**：
- 文件紧凑，适合备份
- 恢复速度快
- 性能影响小（fork子进程）

**缺点**：
- 可能丢失最后一次快照后的数据
- 数据量大时fork耗时

### 2. AOF（Append Only File）
记录每个写操作命令，重启时重新执行。

```bash
# redis.conf配置
appendonly yes
appendfsync always    # 每次写入都同步
appendfsync everysec  # 每秒同步（推荐）
appendfsync no        # 由操作系统决定
```

**AOF重写**：
- 自动触发：文件大小达到阈值
- 手动触发：BGREWRITEAOF命令

**优点**：
- 数据更安全，最多丢失1秒数据
- 文件可读，易于修复

**缺点**：
- 文件体积大
- 恢复速度慢
- 性能开销大

### 3. 混合持久化（Redis 4.0+）
RDB + AOF结合，AOF文件前半部分是RDB格式，后半部分是AOF格式。

```bash
aof-use-rdb-preamble yes
```

## 四、过期策略与淘汰机制

### 过期删除策略

1. **定期删除**：每隔一段时间随机检查一批key
2. **惰性删除**：访问key时检查是否过期

### 内存淘汰策略

当内存不足时，根据配置策略淘汰数据：

```bash
maxmemory-policy noeviction
```

**策略类型**：
- `noeviction`：不淘汰，写入返回错误（默认）
- `allkeys-lru`：所有key中淘汰最近最少使用
- `allkeys-lfu`：所有key中淘汰最少使用频率
- `allkeys-random`：所有key中随机淘汰
- `volatile-lru`：设置过期时间的key中淘汰LRU
- `volatile-lfu`：设置过期时间的key中淘汰LFU
- `volatile-random`：设置过期时间的key中随机淘汰
- `volatile-ttl`：淘汰即将过期的key

## 五、主从复制

### 复制原理

1. 从节点发送PSYNC命令
2. 主节点执行BGSAVE生成RDB
3. 主节点发送RDB文件给从节点
4. 从节点加载RDB文件
5. 主节点发送缓冲区的写命令
6. 后续增量同步

### 配置方式

```bash
# 从节点配置
replicaof <masterip> <masterport>
masterauth <password>
```

### 特点
- 一主多从
- 从节点只读
- 异步复制
- 支持部分复制（PSYNC2）

## 六、哨兵模式（Sentinel）

### 功能
- 监控：检查主从节点是否正常
- 通知：故障通知
- 自动故障转移：主节点故障时选举新主节点
- 配置提供：客户端获取主节点地址

### 配置示例

```bash
# sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 15000
```

### 工作原理
1. 主观下线：单个Sentinel认为主节点下线
2. 客观下线：多数Sentinel认为主节点下线
3. 选举Leader Sentinel
4. 故障转移：选择从节点升级为主节点

## 七、集群模式（Cluster）

### 特点
- 数据分片：16384个槽位
- 去中心化：节点对等
- 高可用：主从复制 + 自动故障转移
- 水平扩展：动态增删节点

### 数据分片

```
HASH_SLOT = CRC16(key) mod 16384
```

### 集群搭建

```bash
# 创建集群
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

### 重定向机制
- MOVED：槽位已迁移到其他节点
- ASK：槽位正在迁移中

## 八、事务

### 基本命令

```bash
MULTI       # 开启事务
EXEC        # 执行事务
DISCARD     # 取消事务
WATCH key   # 监控key，实现乐观锁
```

### 特点
- 批量执行
- 不支持回滚
- 原子性：要么全部执行，要么全部不执行
- WATCH实现CAS操作

### 示例

```bash
WATCH balance
MULTI
DECRBY balance 100
INCRBY target_balance 100
EXEC
```

## 九、发布订阅

### 命令

```bash
SUBSCRIBE channel       # 订阅频道
PUBLISH channel message # 发布消息
PSUBSCRIBE pattern      # 模式订阅
```

### 应用场景
- 消息通知
- 实时聊天
- 事件驱动

### 局限性
- 消息不持久化
- 无法保证可靠性
- 不支持消息堆积

## 十、常见问题与解决方案

### 1. 缓存穿透
**问题**：查询不存在的数据，缓存和数据库都没有。

**解决方案**：
- 布隆过滤器：判断key是否存在
- 缓存空值：设置较短过期时间
- 参数校验：拦截非法请求

### 2. 缓存击穿
**问题**：热点key过期，大量请求直达数据库。

**解决方案**：
- 热点数据永不过期
- 互斥锁：SETNX获取锁
- 提前更新：后台线程刷新

### 3. 缓存雪崩
**问题**：大量key同时过期，数据库压力骤增。

**解决方案**：
- 过期时间随机化
- 多级缓存：本地缓存 + Redis
- 限流降级：保护数据库
- 集群高可用

### 4. 数据一致性
**问题**：缓存与数据库数据不一致。

**解决方案**：
- Cache Aside模式：先更新数据库，再删除缓存
- 延迟双删：删除缓存 → 更新数据库 → 延迟删除缓存
- 订阅binlog：Canal监听MySQL变更
- 设置过期时间：兜底方案

### 5. 热Key问题
**问题**：某个key访问量极大，单节点压力大。

**解决方案**：
- 本地缓存：减少Redis访问
- key分散：添加随机后缀
- 读写分离：主从架构

### 6. 大Key问题
**问题**：单个key占用内存过大，影响性能。

**解决方案**：
- 拆分：将大key拆分为多个小key
- 压缩：序列化压缩
- 定期清理：删除无用数据
- 异步删除：UNLINK命令

## 十一、性能优化

### 1. 命令优化
- 避免使用KEYS命令：使用SCAN代替
- 批量操作：MGET、MSET、Pipeline
- 避免大key：控制集合大小

### 2. 网络优化
- Pipeline：批量发送命令
- 连接池：复用连接
- 客户端缓存：减少网络请求

### 3. 内存优化
- 数据压缩：序列化方式选择
- 过期时间：及时清理无用数据
- 内存碎片整理：activedefrag yes

### 4. 持久化优化
- RDB：调整save频率
- AOF：选择everysec策略
- 混合持久化：兼顾性能和安全

## 十二、监控指标

### 关键指标
- 内存使用率：used_memory
- 命中率：keyspace_hits / (keyspace_hits + keyspace_misses)
- QPS：instantaneous_ops_per_sec
- 连接数：connected_clients
- 阻塞客户端：blocked_clients
- 慢查询：slowlog

### 监控命令

```bash
INFO                    # 查看服务器信息
INFO memory             # 内存信息
INFO stats              # 统计信息
SLOWLOG GET 10          # 查看慢查询
CLIENT LIST             # 客户端连接列表
MONITOR                 # 实时监控命令
```

## 十三、最佳实践

1. **合理设置过期时间**：避免内存溢出
2. **使用连接池**：提高性能
3. **避免大key和热key**：影响性能
4. **选择合适的数据结构**：根据场景选择
5. **开启持久化**：保证数据安全
6. **主从+哨兵/集群**：保证高可用
7. **监控告警**：及时发现问题
8. **定期备份**：防止数据丢失
9. **安全配置**：设置密码、绑定IP
10. **版本升级**：使用稳定版本

## 十四、应用场景总结

| 场景 | 数据结构 | 说明 |
|------|----------|------|
| 缓存 | String | 用户信息、配置信息 |
| 计数器 | String | 点赞数、访问量 |
| 分布式锁 | String | SETNX实现 |
| Session共享 | String/Hash | 分布式会话 |
| 购物车 | Hash | 用户ID为key |
| 消息队列 | List | LPUSH + BRPOP |
| 排行榜 | Sorted Set | 游戏积分榜 |
| 标签系统 | Set | 用户标签 |
| 延迟队列 | Sorted Set | score为时间戳 |
| 限流 | String | 滑动窗口 |
| 地理位置 | GEO | 附近的人 |
| 布隆过滤器 | Bitmap | 去重判断 |
