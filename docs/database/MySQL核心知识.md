# MySQL核心知识

## 一、MySQL架构

### 1. 整体架构层次

```
┌─────────────────────────────────────┐
│      连接层 (Connection Layer)       │
│  连接处理、授权认证、安全管理         │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│      服务层 (Service Layer)          │
│  SQL解析、优化、缓存、函数、存储过程  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│      引擎层 (Storage Engine Layer)   │
│  InnoDB、MyISAM、Memory等            │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│      存储层 (File System Layer)      │
│  数据文件、日志文件、配置文件         │
└─────────────────────────────────────┘
```

### 2. SQL执行流程

1. **连接器**：建立连接、权限验证
2. **查询缓存**：检查缓存（MySQL 8.0已移除）
3. **分析器**：词法分析、语法分析
4. **优化器**：执行计划生成、索引选择
5. **执行器**：调用存储引擎接口执行
6. **存储引擎**：数据读写

## 二、存储引擎

### 1. InnoDB（默认引擎）

**特点**：
- 支持事务（ACID）
- 支持行级锁
- 支持外键
- 支持MVCC（多版本并发控制）
- 崩溃恢复能力强

**适用场景**：
- 需要事务支持
- 高并发读写
- 数据一致性要求高

### 2. MyISAM

**特点**：
- 不支持事务
- 表级锁
- 查询速度快
- 不支持外键

**适用场景**：
- 只读或读多写少
- 不需要事务
- 表数据量小

### 3. Memory

**特点**：
- 数据存储在内存
- 速度极快
- 重启数据丢失
- 表级锁

**适用场景**：
- 临时表
- 缓存表
- 中间结果集

### 对比表

| 特性 | InnoDB | MyISAM | Memory |
|------|--------|--------|--------|
| 事务 | ✓ | ✗ | ✗ |
| 锁粒度 | 行锁 | 表锁 | 表锁 |
| 外键 | ✓ | ✗ | ✗ |
| MVCC | ✓ | ✗ | ✗ |
| 崩溃恢复 | ✓ | ✗ | ✗ |
| 全文索引 | ✓(5.6+) | ✓ | ✗ |

## 三、索引

### 1. 索引类型

#### B+Tree索引（默认）
- 所有数据存储在叶子节点
- 叶子节点通过指针连接
- 适合范围查询和排序

#### Hash索引
- 基于哈希表实现
- 只支持等值查询
- Memory引擎支持

#### 全文索引
- 用于全文搜索
- InnoDB和MyISAM支持

#### 空间索引
- 用于地理数据
- MyISAM支持

### 2. 索引分类

**按数据结构**：
- B+Tree索引
- Hash索引
- 全文索引
- 空间索引

**按物理存储**：
- 聚簇索引（主键索引）：数据和索引存储在一起
- 非聚簇索引（二级索引）：索引和数据分开存储

**按字段个数**：
- 单列索引
- 联合索引（复合索引）

**按功能**：
- 主键索引：PRIMARY KEY
- 唯一索引：UNIQUE
- 普通索引：INDEX
- 全文索引：FULLTEXT

### 3. 索引创建

```sql
-- 创建主键索引
ALTER TABLE users ADD PRIMARY KEY (id);

-- 创建唯一索引
CREATE UNIQUE INDEX idx_email ON users(email);

-- 创建普通索引
CREATE INDEX idx_name ON users(name);

-- 创建联合索引
CREATE INDEX idx_name_age ON users(name, age);

-- 创建全文索引
CREATE FULLTEXT INDEX idx_content ON articles(content);

-- 删除索引
DROP INDEX idx_name ON users;
```

### 4. 索引优化原则

#### 最左前缀原则
联合索引(a, b, c)可以支持：
- (a)
- (a, b)
- (a, b, c)

不支持：
- (b)
- (c)
- (b, c)

#### 索引失效场景

```sql
-- 1. 使用函数或表达式
SELECT * FROM users WHERE YEAR(create_time) = 2024;  -- 失效
SELECT * FROM users WHERE create_time >= '2024-01-01';  -- 生效

-- 2. 类型转换
SELECT * FROM users WHERE phone = 13800138000;  -- phone是varchar，失效
SELECT * FROM users WHERE phone = '13800138000';  -- 生效

-- 3. 模糊查询以%开头
SELECT * FROM users WHERE name LIKE '%张';  -- 失效
SELECT * FROM users WHERE name LIKE '张%';  -- 生效

-- 4. OR条件
SELECT * FROM users WHERE id = 1 OR age = 20;  -- 可能失效
SELECT * FROM users WHERE id = 1 UNION SELECT * FROM users WHERE age = 20;  -- 优化

-- 5. 不等于操作
SELECT * FROM users WHERE status != 1;  -- 可能失效

-- 6. IS NULL / IS NOT NULL
SELECT * FROM users WHERE email IS NULL;  -- 可能失效

-- 7. NOT IN / NOT EXISTS
SELECT * FROM users WHERE id NOT IN (1, 2, 3);  -- 可能失效
```

#### 索引设计建议

1. **选择性高的列**：区分度高的列建索引
2. **频繁查询的列**：WHERE、ORDER BY、GROUP BY的列
3. **控制索引数量**：过多影响写入性能
4. **索引长度**：VARCHAR类型可指定前缀长度
5. **避免冗余索引**：(a, b)和(a)重复
6. **覆盖索引**：查询列都在索引中，避免回表

```sql
-- 前缀索引
CREATE INDEX idx_email ON users(email(10));

-- 覆盖索引示例
CREATE INDEX idx_name_age ON users(name, age);
SELECT name, age FROM users WHERE name = '张三';  -- 无需回表
```

## 四、事务

### 1. ACID特性

- **原子性（Atomicity）**：事务不可分割，要么全部成功，要么全部失败
- **一致性（Consistency）**：事务前后数据完整性保持一致
- **隔离性（Isolation）**：多个事务并发执行互不干扰
- **持久性（Durability）**：事务提交后永久保存

### 2. 事务隔离级别

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---------|------|-----------|------|
| READ UNCOMMITTED | ✓ | ✓ | ✓ |
| READ COMMITTED | ✗ | ✓ | ✓ |
| REPEATABLE READ（默认） | ✗ | ✗ | ✓ |
| SERIALIZABLE | ✗ | ✗ | ✗ |

**问题说明**：
- **脏读**：读取到未提交的数据
- **不可重复读**：同一事务中多次读取结果不同（UPDATE）
- **幻读**：同一事务中多次查询记录数不同（INSERT/DELETE）

### 3. 事务操作

```sql
-- 开启事务
START TRANSACTION;
-- 或
BEGIN;

-- 提交事务
COMMIT;

-- 回滚事务
ROLLBACK;

-- 设置保存点
SAVEPOINT sp1;
ROLLBACK TO sp1;

-- 查看隔离级别
SELECT @@transaction_isolation;

-- 设置隔离级别
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

### 4. MVCC（多版本并发控制）

**实现原理**：
- 每行记录包含隐藏字段：
  - `DB_TRX_ID`：事务ID
  - `DB_ROLL_PTR`：回滚指针
  - `DB_ROW_ID`：隐藏主键

- **Read View**：事务开始时创建的快照
  - `m_ids`：活跃事务ID列表
  - `min_trx_id`：最小活跃事务ID
  - `max_trx_id`：下一个事务ID
  - `creator_trx_id`：当前事务ID

- **版本链**：通过undo log形成历史版本链

**可见性判断**：
1. 如果记录的trx_id < min_trx_id，可见
2. 如果记录的trx_id >= max_trx_id，不可见
3. 如果记录的trx_id在m_ids中，不可见
4. 否则可见

## 五、锁机制

### 1. 锁分类

**按粒度**：
- 全局锁：FLUSH TABLES WITH READ LOCK
- 表级锁：LOCK TABLES、MDL锁
- 行级锁：Record Lock、Gap Lock、Next-Key Lock

**按性质**：
- 共享锁（S锁）：读锁，多个事务可同时持有
- 排他锁（X锁）：写锁，独占

**按态度**：
- 乐观锁：版本号、CAS
- 悲观锁：SELECT ... FOR UPDATE

### 2. InnoDB行锁

#### Record Lock（记录锁）
锁定单条记录。

```sql
SELECT * FROM users WHERE id = 1 FOR UPDATE;
```

#### Gap Lock（间隙锁）
锁定索引记录之间的间隙，防止幻读。

```sql
-- id索引：1, 5, 10
SELECT * FROM users WHERE id > 5 AND id < 10 FOR UPDATE;
-- 锁定(5, 10)间隙
```

#### Next-Key Lock（临键锁）
Record Lock + Gap Lock，锁定记录及前面的间隙。

```sql
-- 默认情况下使用Next-Key Lock
SELECT * FROM users WHERE id >= 5 FOR UPDATE;
```

### 3. 死锁

**产生条件**：
1. 互斥条件
2. 请求与保持
3. 不可剥夺
4. 循环等待

**示例**：

```sql
-- 事务1
BEGIN;
UPDATE users SET name = 'A' WHERE id = 1;
UPDATE users SET name = 'B' WHERE id = 2;  -- 等待

-- 事务2
BEGIN;
UPDATE users SET name = 'C' WHERE id = 2;
UPDATE users SET name = 'D' WHERE id = 1;  -- 死锁
```

**解决方案**：
- 按相同顺序访问资源
- 减少事务持有锁的时间
- 使用较低的隔离级别
- 设置锁等待超时：innodb_lock_wait_timeout

**查看死锁**：

```sql
SHOW ENGINE INNODB STATUS;
```

## 六、日志系统

### 1. Redo Log（重做日志）

**作用**：保证事务持久性，崩溃恢复。

**特点**：
- InnoDB特有
- 物理日志，记录数据页的修改
- 循环写入，固定大小
- WAL（Write-Ahead Logging）机制

**配置**：

```ini
innodb_log_file_size = 512M
innodb_log_files_in_group = 2
innodb_flush_log_at_trx_commit = 1
```

**刷盘策略**：
- 0：每秒写入并刷盘
- 1：每次事务提交写入并刷盘（默认，最安全）
- 2：每次事务提交写入，每秒刷盘

### 2. Undo Log（回滚日志）

**作用**：
- 事务回滚
- MVCC实现

**特点**：
- 逻辑日志，记录相反操作
- INSERT → DELETE
- UPDATE → UPDATE（旧值）
- DELETE → INSERT

### 3. Bin Log（二进制日志）

**作用**：
- 主从复制
- 数据恢复
- 审计

**特点**：
- Server层实现，所有引擎共享
- 逻辑日志，记录SQL语句
- 追加写入，不会覆盖

**格式**：

```ini
binlog_format = ROW  # 推荐
# STATEMENT：记录SQL语句
# ROW：记录每行数据变化
# MIXED：混合模式
```

**配置**：

```ini
log_bin = /var/log/mysql/mysql-bin
expire_logs_days = 7
max_binlog_size = 100M
```

### 4. 两阶段提交

保证Redo Log和Bin Log一致性：

1. **Prepare阶段**：写入Redo Log，状态为prepare
2. **Commit阶段**：写入Bin Log，Redo Log状态改为commit

**崩溃恢复**：
- Redo Log为prepare，Bin Log完整：提交事务
- Redo Log为prepare，Bin Log不完整：回滚事务

## 七、主从复制

### 1. 复制原理

```
Master                          Slave
  │                              │
  │  1. 写入Bin Log              │
  │ ──────────────────────────>  │
  │                              │  2. IO线程读取
  │                              │  3. 写入Relay Log
  │                              │
  │                              │  4. SQL线程执行
  │                              │  5. 写入数据
```

**步骤**：
1. Master执行SQL，写入Bin Log
2. Slave的IO线程连接Master，读取Bin Log
3. IO线程将Bin Log写入Relay Log
4. SQL线程读取Relay Log并执行
5. 数据写入Slave数据库

### 2. 复制模式

**异步复制（默认）**：
- Master不等待Slave确认
- 性能最好
- 可能丢失数据

**半同步复制**：
- Master等待至少一个Slave确认
- 性能和安全性平衡

```sql
-- 安装插件
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';

-- 启用半同步
SET GLOBAL rpl_semi_sync_master_enabled = 1;
SET GLOBAL rpl_semi_sync_slave_enabled = 1;
```

**全同步复制**：
- Master等待所有Slave确认
- 性能最差
- 数据最安全

### 3. 主从延迟

**原因**：
- Slave性能差
- 大事务执行
- 网络延迟
- 单线程回放（MySQL 5.6之前）

**解决方案**：
- 并行复制：slave_parallel_workers
- 读写分离时读主库
- 缓存热点数据
- 升级硬件

### 4. 配置示例

**Master配置**：

```ini
[mysqld]
server-id = 1
log_bin = mysql-bin
binlog_format = ROW
```

**Slave配置**：

```ini
[mysqld]
server-id = 2
relay_log = relay-bin
read_only = 1
```

**建立复制**：

```sql
-- Master创建复制用户
CREATE USER 'repl'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';

-- Slave配置
CHANGE MASTER TO
  MASTER_HOST='192.168.1.100',
  MASTER_USER='repl',
  MASTER_PASSWORD='password',
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=154;

-- 启动复制
START SLAVE;

-- 查看状态
SHOW SLAVE STATUS\G
```

## 八、查询优化

### 1. EXPLAIN分析

```sql
EXPLAIN SELECT * FROM users WHERE name = '张三';
```

**关键字段**：

| 字段 | 说明 |
|------|------|
| id | 查询序号 |
| select_type | 查询类型（SIMPLE、PRIMARY、SUBQUERY等） |
| table | 表名 |
| type | 访问类型（system > const > eq_ref > ref > range > index > ALL） |
| possible_keys | 可能使用的索引 |
| key | 实际使用的索引 |
| key_len | 索引长度 |
| ref | 索引引用 |
| rows | 扫描行数 |
| Extra | 额外信息 |

**type类型**（性能从好到差）：
- `system`：表只有一行
- `const`：主键或唯一索引等值查询
- `eq_ref`：主键或唯一索引关联
- `ref`：非唯一索引等值查询
- `range`：范围查询
- `index`：索引全扫描
- `ALL`：全表扫描

**Extra信息**：
- `Using index`：覆盖索引，无需回表
- `Using where`：使用WHERE过滤
- `Using temporary`：使用临时表
- `Using filesort`：文件排序，需优化

### 2. 慢查询日志

**配置**：

```ini
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
log_queries_not_using_indexes = 1
```

**分析工具**：

```bash
# mysqldumpslow
mysqldumpslow -s t -t 10 slow.log

# pt-query-digest
pt-query-digest slow.log
```

### 3. 优化技巧

#### 避免SELECT *

```sql
-- 不推荐
SELECT * FROM users WHERE id = 1;

-- 推荐
SELECT id, name, email FROM users WHERE id = 1;
```

#### 分页优化

```sql
-- 深分页问题
SELECT * FROM users ORDER BY id LIMIT 1000000, 10;  -- 慢

-- 优化：使用子查询
SELECT * FROM users WHERE id >= (
  SELECT id FROM users ORDER BY id LIMIT 1000000, 1
) LIMIT 10;

-- 优化：记录上次最大ID
SELECT * FROM users WHERE id > 1000000 ORDER BY id LIMIT 10;
```

#### JOIN优化

```sql
-- 小表驱动大表
SELECT * FROM small_table s
INNER JOIN large_table l ON s.id = l.small_id;

-- 确保关联字段有索引
CREATE INDEX idx_small_id ON large_table(small_id);
```

#### 子查询优化

```sql
-- 不推荐：子查询
SELECT * FROM users WHERE id IN (
  SELECT user_id FROM orders WHERE status = 1
);

-- 推荐：JOIN
SELECT u.* FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status = 1;
```

#### COUNT优化

```sql
-- COUNT(*)、COUNT(1)、COUNT(主键)性能相近
SELECT COUNT(*) FROM users;  -- 推荐

-- COUNT(字段)会过滤NULL
SELECT COUNT(email) FROM users;

-- 大表COUNT优化：使用近似值或缓存
```

#### OR优化

```sql
-- OR改为UNION
SELECT * FROM users WHERE id = 1
UNION ALL
SELECT * FROM users WHERE name = '张三';
```

## 九、分库分表

### 1. 垂直拆分

**垂直分库**：按业务模块拆分
- 用户库：users、user_profiles
- 订单库：orders、order_items
- 商品库：products、categories

**垂直分表**：按字段拆分
- users：id、name、email
- user_profiles：user_id、avatar、bio

### 2. 水平拆分

**水平分库**：按数据量拆分
- db_0、db_1、db_2...

**水平分表**：按数据量拆分
- users_0、users_1、users_2...

### 3. 分片策略

**范围分片**：

```
user_id: 1-1000000 → db_0
user_id: 1000001-2000000 → db_1
```

**哈希分片**：

```
db_index = user_id % 4
```

**一致性哈希**：
- 解决扩容问题
- 减少数据迁移

### 4. 分库分表中间件

- **ShardingSphere**：Apache项目
- **MyCat**：开源分库分表中间件
- **Vitess**：YouTube开源

### 5. 分库分表问题

**跨库JOIN**：
- 应用层组装
- 数据冗余
- 全局表

**分布式事务**：
- 两阶段提交（2PC）
- TCC
- 本地消息表
- Seata

**分布式ID**：
- 雪花算法（Snowflake）
- UUID
- 数据库号段
- Redis自增

**分页查询**：
- 每个分片查询后合并
- 性能问题

## 十、性能优化

### 1. 硬件优化
- SSD硬盘
- 增加内存
- 多核CPU

### 2. 配置优化

```ini
# 连接数
max_connections = 1000

# 缓冲池大小（物理内存的70-80%）
innodb_buffer_pool_size = 8G

# 日志缓冲
innodb_log_buffer_size = 16M

# 查询缓存（8.0已移除）
query_cache_size = 0

# 临时表大小
tmp_table_size = 64M
max_heap_table_size = 64M

# 排序缓冲
sort_buffer_size = 2M

# 连接缓冲
join_buffer_size = 2M
```

### 3. SQL优化
- 使用索引
- 避免全表扫描
- 优化JOIN
- 减少子查询
- 批量操作

### 4. 架构优化
- 读写分离
- 分库分表
- 缓存（Redis）
- 消息队列解耦

## 十一、备份与恢复

### 1. 备份方式

**逻辑备份**：

```bash
# mysqldump
mysqldump -u root -p --databases db1 db2 > backup.sql
mysqldump -u root -p --all-databases > all.sql

# 恢复
mysql -u root -p < backup.sql
```

**物理备份**：

```bash
# XtraBackup
xtrabackup --backup --target-dir=/backup/
xtrabackup --prepare --target-dir=/backup/
xtrabackup --copy-back --target-dir=/backup/
```

### 2. 备份策略

- **全量备份**：每周一次
- **增量备份**：每天一次
- **Bin Log备份**：实时

### 3. 恢复方式

**时间点恢复**：

```bash
# 恢复全量备份
mysql -u root -p < full_backup.sql

# 恢复Bin Log到指定时间
mysqlbinlog --stop-datetime="2024-03-08 10:00:00" \
  mysql-bin.000001 | mysql -u root -p
```

## 十二、监控指标

### 关键指标

```sql
-- QPS/TPS
SHOW GLOBAL STATUS LIKE 'Questions';
SHOW GLOBAL STATUS LIKE 'Com_commit';

-- 连接数
SHOW GLOBAL STATUS LIKE 'Threads_connected';
SHOW GLOBAL STATUS LIKE 'Max_used_connections';

-- 缓冲池命中率
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read%';

-- 锁等待
SHOW GLOBAL STATUS LIKE 'Innodb_row_lock%';

-- 慢查询
SHOW GLOBAL STATUS LIKE 'Slow_queries';

-- 表锁
SHOW GLOBAL STATUS LIKE 'Table_locks%';
```

### 监控工具
- Prometheus + Grafana
- Zabbix
- Percona Monitoring and Management (PMM)
- MySQL Enterprise Monitor

## 十三、安全加固

### 1. 账号安全

```sql
-- 删除匿名用户
DELETE FROM mysql.user WHERE User='';

-- 删除test数据库
DROP DATABASE test;

-- 禁止root远程登录
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1');

-- 创建普通用户
CREATE USER 'app'@'%' IDENTIFIED BY 'StrongPassword123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app'@'%';

-- 刷新权限
FLUSH PRIVILEGES;
```

### 2. 网络安全

```ini
# 绑定IP
bind-address = 127.0.0.1

# 跳过DNS解析
skip-name-resolve = 1
```

### 3. 数据加密

```ini
# SSL连接
require_secure_transport = ON

# 数据加密
innodb_encrypt_tables = ON
```

## 十四、最佳实践

1. **表设计**：
   - 选择合适的数据类型
   - 避免NULL值
   - 合理使用范式
   - 预留扩展字段

2. **索引设计**：
   - 为WHERE、ORDER BY、GROUP BY字段建索引
   - 控制索引数量
   - 定期维护索引

3. **SQL编写**：
   - 避免SELECT *
   - 使用LIMIT限制结果集
   - 批量操作代替循环
   - 使用预编译语句

4. **事务使用**：
   - 保持事务简短
   - 避免长事务
   - 合理设置隔离级别

5. **运维规范**：
   - 定期备份
   - 监控告警
   - 慢查询优化
   - 容量规划

6. **高可用**：
   - 主从复制
   - 读写分离
   - 故障自动切换
   - 定期演练

7. **安全规范**：
   - 最小权限原则
   - 定期审计
   - 数据脱敏
   - SQL注入防护


## 十五、自增 ID 原理与失效场景

### 1. 自增 ID 核心机制

**实现原理**：
- **内存计数器**：InnoDB 在内存中维护自增计数器
- **持久化机制**：MySQL 8.0+ 持久化到 redo log
- **锁机制**：通过自增锁保证并发安全

**生成流程**：
```sql
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50)
);

INSERT INTO users(name) VALUES('张三');  -- id=1
INSERT INTO users(name) VALUES('李四');  -- id=2
```

1. 执行 INSERT 时从自增计数器获取下一个值
2. 将该值分配给 id 字段
3. 自增计数器 +1
4. 写入数据

### 2. 自增锁模式

**innodb_autoinc_lock_mode 配置**：

| 模式 | 名称 | 特点 | 适用场景 |
|------|------|------|----------|
| 0 | Traditional（传统） | 表级锁，整个 INSERT 期间持有 | 主从复制，Statement 格式 |
| 1 | Consecutive（连续，默认） | 简单 INSERT 轻量锁，批量 INSERT 表级锁 | 平衡性能和安全 |
| 2 | Interleaved（交错） | 所有 INSERT 都用轻量锁 | 高并发，ROW 格式 binlog |

```ini
# 配置文件
innodb_autoinc_lock_mode = 1
```

### 3. 自增值持久化差异

**MySQL 5.7 及之前**：
- 自增值仅存内存
- 重启后执行 `SELECT MAX(id) + 1` 重新计算
- 存在 ID 回溯风险

**MySQL 8.0+**：
- 自增值持久化到 redo log
- 每次变更写入 redo log
- 重启后从 redo log 恢复，不会回溯

### 4. 自增 ID 失效场景

#### 场景 1：事务回滚导致 ID 不连续

```sql
BEGIN;
INSERT INTO users(name) VALUES('张三');  -- 分配 id=1
ROLLBACK;  -- 回滚，但 id=1 已消耗

INSERT INTO users(name) VALUES('李四');  -- id=2，跳过了 1
```

**原因**：自增值分配后不会回收，即使事务回滚。

**影响**：ID 不连续，但不影响功能。

#### 场景 2：批量插入失败

```sql
INSERT INTO users(name) VALUES('张三'),('李四'),('王五');
-- 假设第二条违反唯一约束失败

-- 结果：张三 id=1，王五 id=3，id=2 被跳过
```

**原因**：批量插入时预分配多个 ID，失败的行不会回收 ID。

#### 场景 3：手动指定 ID 值

```sql
INSERT INTO users(id, name) VALUES(100, '张三');
-- 自增计数器更新为 101

INSERT INTO users(name) VALUES('李四');  -- id=101
-- id=2~99 被跳过
```

**原因**：手动指定的 ID 大于当前自增值时，自增计数器会更新。

**建议**：避免手动指定 ID。

#### 场景 4：MySQL 5.7 重启导致 ID 回溯

```sql
-- MySQL 5.7
INSERT INTO users(id, name) VALUES(100, '张三');
DELETE FROM users WHERE id = 100;
-- 当前自增值：101

-- 重启 MySQL
-- 自增值变为：SELECT MAX(id) + 1 = 1

INSERT INTO users(name) VALUES('李四');  -- id=1（回溯了！）
```

**原因**：MySQL 5.7 自增值不持久化，重启后重新计算。

**解决**：升级到 MySQL 8.0。

#### 场景 5：达到数据类型最大值

```sql
-- INT 类型最大值：2147483647
CREATE TABLE test (
  id INT AUTO_INCREMENT PRIMARY KEY
);

-- 当 id 达到 2147483647 后
INSERT INTO test VALUES();
-- ERROR 1467: Failed to read auto-increment value from storage engine
```

**原因**：自增值超过数据类型最大值。

**解决方案**：
```sql
-- 使用 BIGINT
ALTER TABLE test MODIFY id BIGINT AUTO_INCREMENT;

-- BIGINT 最大值：9223372036854775807
```

#### 场景 6：REPLACE 或 INSERT ON DUPLICATE KEY UPDATE

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(50) UNIQUE,
  name VARCHAR(50)
);

INSERT INTO users(email, name) VALUES('a@test.com', '张三');  -- id=1

-- REPLACE 会先删除再插入
REPLACE INTO users(email, name) VALUES('a@test.com', '李四');  -- id=2

-- 或使用 INSERT ON DUPLICATE KEY UPDATE
INSERT INTO users(email, name) VALUES('a@test.com', '王五')
ON DUPLICATE KEY UPDATE name='王五';  -- id 仍然消耗
```

**原因**：REPLACE 和某些 ON DUPLICATE KEY UPDATE 会消耗自增 ID。

#### 场景 7：主从复制不一致（Statement 格式）

```sql
-- 主库并发插入（innodb_autoinc_lock_mode=2）
-- 会话1：INSERT INTO users(name) VALUES('A');  -- id=1
-- 会话2：INSERT INTO users(name) VALUES('B');  -- id=2

-- Statement 格式 binlog 记录顺序可能是：
-- INSERT INTO users(name) VALUES('B');  -- 从库 id=1
-- INSERT INTO users(name) VALUES('A');  -- 从库 id=2

-- 结果：主从 ID 不一致
```

**原因**：Statement 格式记录 SQL 语句，并发时顺序不确定。

**解决方案**：
```ini
# 使用 ROW 格式
binlog_format = ROW

# 或使用模式 1
innodb_autoinc_lock_mode = 1
```

#### 场景 8：TRUNCATE 重置自增值

```sql
INSERT INTO users(name) VALUES('张三');  -- id=1
INSERT INTO users(name) VALUES('李四');  -- id=2

TRUNCATE TABLE users;  -- 自增值重置为 1

INSERT INTO users(name) VALUES('王五');  -- id=1（重新开始）
```

**原因**：TRUNCATE 会重置自增计数器。

**对比**：
```sql
DELETE FROM users;  -- 不会重置自增值
INSERT INTO users(name) VALUES('王五');  -- id=3
```

#### 场景 9：导入数据时 ID 冲突

```sql
-- 表中已有数据，id=1,2,3
-- 导入的数据也包含 id=1,2,3

LOAD DATA INFILE 'users.csv' INTO TABLE users;
-- ERROR 1062: Duplicate entry '1' for key 'PRIMARY'
```

**解决方案**：
```sql
-- 方案1：导入前清空表
TRUNCATE TABLE users;

-- 方案2：导入时忽略 id 列
LOAD DATA INFILE 'users.csv' INTO TABLE users (name, email);

-- 方案3：修改自增起始值
ALTER TABLE users AUTO_INCREMENT = 10000;
```

#### 场景 10：分布式环境 ID 冲突

```sql
-- 多个数据库实例使用相同的自增配置
-- 实例1：INSERT → id=1
-- 实例2：INSERT → id=1（冲突！）
```

**解决方案**：
```sql
-- 设置不同的起始值和步长
-- 实例1
SET @@auto_increment_offset = 1;
SET @@auto_increment_increment = 3;
-- 生成：1, 4, 7, 10...

-- 实例2
SET @@auto_increment_offset = 2;
SET @@auto_increment_increment = 3;
-- 生成：2, 5, 8, 11...
```

#### 场景 11：ALTER TABLE 操作

```sql
-- 修改自增值（只能改大，不能改小）
ALTER TABLE users AUTO_INCREMENT = 1000;  -- 成功

ALTER TABLE users AUTO_INCREMENT = 1;  -- 无效，保持当前值
```

**注意**：
- 只能将自增值改大
- 改小会被忽略
- 不会影响已存在的数据

#### 场景 12：自增列不是主键或第一列

```sql
-- 错误示例
CREATE TABLE test (
  name VARCHAR(50),
  id INT AUTO_INCREMENT,  -- 自增列不是第一列
  PRIMARY KEY(id)
);
-- ERROR 1075: Incorrect table definition; there can be only one auto column and it must be defined as a key
```

**正确做法**：
```sql
CREATE TABLE test (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50)
);

-- 或者自增列是联合主键的第一列
CREATE TABLE test (
  id INT AUTO_INCREMENT,
  type INT,
  name VARCHAR(50),
  PRIMARY KEY(id, type)
);
```

### 5. 自增 ID 操作命令

```sql
-- 查看当前自增值
SHOW CREATE TABLE users;

SELECT AUTO_INCREMENT 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA='mydb' AND TABLE_NAME='users';

-- 修改自增值
ALTER TABLE users AUTO_INCREMENT = 1000;

-- 重置自增值（清空表）
TRUNCATE TABLE users;

-- 查看自增锁模式
SHOW VARIABLES LIKE 'innodb_autoinc_lock_mode';
```

### 6. 分布式 ID 解决方案

#### 方案 1：雪花算法（Snowflake）

```
64位 ID 结构：
┌─┬─────────────────────────────────────────┬──────────────┬──────────────┐
│0│        41位时间戳（毫秒）                 │ 10位机器ID    │ 12位序列号    │
└─┴─────────────────────────────────────────┴──────────────┴──────────────┘
```

**优点**：
- 趋势递增
- 不依赖数据库
- 高性能（每毫秒可生成 4096 个 ID）

**缺点**：
- 依赖系统时钟
- 机器 ID 需要管理

#### 方案 2：数据库号段模式

```sql
CREATE TABLE id_generator (
  biz_type VARCHAR(50) PRIMARY KEY,
  max_id BIGINT NOT NULL,
  step INT NOT NULL,
  version INT NOT NULL
);

-- 获取号段
UPDATE id_generator 
SET max_id = max_id + step, version = version + 1
WHERE biz_type = 'user' AND version = 当前版本;

-- 应用层使用 max_id 到 max_id+step 之间的 ID
```

**优点**：
- 简单可靠
- 趋势递增

**缺点**：
- 依赖数据库
- 存在单点问题

#### 方案 3：Redis 自增

```bash
# 单个 ID
INCR user_id_seq

# 批量获取
INCRBY user_id_seq 100
```

**优点**：
- 性能高
- 实现简单

**缺点**：
- 依赖 Redis
- 需要持久化配置

#### 方案 4：UUID

```sql
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(50)
);
```

**优点**：
- 全局唯一
- 无需中心化服务

**缺点**：
- 无序，影响索引性能
- 占用空间大（36字节）
- 不适合作为主键

### 7. 最佳实践

1. **数据类型选择**：
   ```sql
   -- 推荐使用 BIGINT
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
   ```

2. **避免手动指定 ID**：
   ```sql
   -- 不推荐
   INSERT INTO users(id, name) VALUES(999, '张三');
   
   -- 推荐
   INSERT INTO users(name) VALUES('张三');
   ```

3. **批量插入优化**：
   ```sql
   -- 推荐
   INSERT INTO users(name) VALUES('张三'),('李四'),('王五');
   ```

4. **分布式环境**：
   - 使用分布式 ID 方案
   - 或配置不同的 offset 和 increment

5. **主从复制**：
   ```ini
   binlog_format = ROW
   innodb_autoinc_lock_mode = 1
   ```

6. **监控告警**：
   ```sql
   -- 监控自增值使用率
   SELECT 
     TABLE_NAME,
     AUTO_INCREMENT,
     CASE DATA_TYPE
       WHEN 'int' THEN 2147483647
       WHEN 'bigint' THEN 9223372036854775807
     END AS max_value,
     ROUND(AUTO_INCREMENT / 
       CASE DATA_TYPE
         WHEN 'int' THEN 2147483647
         WHEN 'bigint' THEN 9223372036854775807
       END * 100, 2) AS usage_percent
   FROM information_schema.TABLES t
   JOIN information_schema.COLUMNS c 
     ON t.TABLE_SCHEMA = c.TABLE_SCHEMA 
     AND t.TABLE_NAME = c.TABLE_NAME
   WHERE c.EXTRA = 'auto_increment'
     AND t.TABLE_SCHEMA = 'mydb';
   ```

7. **安全考虑**：
   - 不要在 URL 中暴露自增 ID
   - 使用 UUID 或加密 ID 对外展示
   - 防止遍历攻击

8. **版本选择**：
   - 生产环境推荐 MySQL 8.0+
   - 避免 5.7 的 ID 回溯问题
