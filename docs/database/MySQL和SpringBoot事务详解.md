# MySQL 和 Spring Boot 事务详解

## 一、MySQL 事务基础

### 1.1 什么是事务？

事务是一组操作的集合，要么全部成功，要么全部失败。

**ACID 特性**：

1. **原子性（Atomicity）**
   - 事务是不可分割的最小单位
   - 要么全部执行，要么全部不执行

2. **一致性（Consistency）**
   - 事务执行前后，数据保持一致状态
   - 例如：转账前后总金额不变

3. **隔离性（Isolation）**
   - 多个事务并发执行时，互不干扰
   - 通过隔离级别控制

4. **持久性（Durability）**
   - 事务提交后，数据永久保存
   - 即使系统崩溃也不会丢失

### 1.2 事务的基本操作

```sql
-- 开启事务
START TRANSACTION;
-- 或
BEGIN;

-- 执行 SQL
UPDATE account SET balance = balance - 100 WHERE id = 1;
UPDATE account SET balance = balance + 100 WHERE id = 2;

-- 提交事务
COMMIT;

-- 回滚事务
ROLLBACK;

-- 设置保存点
SAVEPOINT sp1;
-- 回滚到保存点
ROLLBACK TO sp1;
```

### 1.3 事务隔离级别

**四种隔离级别**：

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---------|------|-----------|------|
| READ UNCOMMITTED | ✓ | ✓ | ✓ |
| READ COMMITTED | ✗ | ✓ | ✓ |
| REPEATABLE READ（默认）| ✗ | ✗ | ✓ |
| SERIALIZABLE | ✗ | ✗ | ✗ |

**并发问题**：

1. **脏读（Dirty Read）**
   - 读取到其他事务未提交的数据
   ```sql
   -- 事务 A
   UPDATE account SET balance = 1000 WHERE id = 1;
   -- 未提交
   
   -- 事务 B
   SELECT balance FROM account WHERE id = 1;  -- 读到 1000（脏读）
   
   -- 事务 A
   ROLLBACK;  -- 回滚，balance 实际还是原值
   ```

2. **不可重复读（Non-Repeatable Read）**
   - 同一事务中，多次读取同一数据结果不同
   ```sql
   -- 事务 A
   SELECT balance FROM account WHERE id = 1;  -- 读到 500
   
   -- 事务 B
   UPDATE account SET balance = 1000 WHERE id = 1;
   COMMIT;
   
   -- 事务 A
   SELECT balance FROM account WHERE id = 1;  -- 读到 1000（不可重复读）
   ```

3. **幻读（Phantom Read）**
   - 同一事务中，多次查询结果集不同
   ```sql
   -- 事务 A
   SELECT COUNT(*) FROM account WHERE balance > 500;  -- 结果 5 条
   
   -- 事务 B
   INSERT INTO account (balance) VALUES (1000);
   COMMIT;
   
   -- 事务 A
   SELECT COUNT(*) FROM account WHERE balance > 500;  -- 结果 6 条（幻读）
   ```

**设置隔离级别**：

```sql
-- 查看当前隔离级别
SELECT @@transaction_isolation;

-- 设置会话隔离级别
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 设置全局隔离级别
SET GLOBAL TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

### 1.4 MVCC（多版本并发控制）

**原理**：InnoDB 通过 MVCC 实现 REPEATABLE READ 隔离级别。

**核心概念**：

1. **隐藏列**
   - `DB_TRX_ID`：最后修改该行的事务 ID
   - `DB_ROLL_PTR`：回滚指针，指向 undo log
   - `DB_ROW_ID`：隐藏主键（如果没有主键）

2. **Read View（读视图）**
   - `m_ids`：当前活跃的事务 ID 列表
   - `min_trx_id`：最小活跃事务 ID
   - `max_trx_id`：下一个要分配的事务 ID
   - `creator_trx_id`：创建该 Read View 的事务 ID

3. **版本链**
   ```
   当前版本：id=1, name='Alice', trx_id=100
        ↓ (undo log)
   旧版本1：id=1, name='Bob', trx_id=90
        ↓ (undo log)
   旧版本2：id=1, name='Charlie', trx_id=80
   ```

**可见性判断**：

```
如果 DB_TRX_ID < min_trx_id：可见（已提交）
如果 DB_TRX_ID >= max_trx_id：不可见（未来事务）
如果 min_trx_id <= DB_TRX_ID < max_trx_id：
    如果 DB_TRX_ID 在 m_ids 中：不可见（未提交）
    否则：可见（已提交）
```

**RC vs RR 的区别**：

- **READ COMMITTED**：每次查询都生成新的 Read View
- **REPEATABLE READ**：事务开始时生成 Read View，之后一直使用

### 1.5 锁机制

**锁的类型**：

1. **共享锁（S Lock）**
   ```sql
   SELECT * FROM table WHERE id = 1 LOCK IN SHARE MODE;
   ```
   - 允许其他事务读取
   - 阻止其他事务修改

2. **排他锁（X Lock）**
   ```sql
   SELECT * FROM table WHERE id = 1 FOR UPDATE;
   ```
   - 阻止其他事务读取和修改

3. **意向锁（Intention Lock）**
   - 表级锁，表示事务想要获取行锁
   - IS：意向共享锁
   - IX：意向排他锁

4. **记录锁（Record Lock）**
   - 锁定索引记录

5. **间隙锁（Gap Lock）**
   - 锁定索引记录之间的间隙
   - 防止幻读

6. **临键锁（Next-Key Lock）**
   - 记录锁 + 间隙锁
   - REPEATABLE READ 默认使用

**锁示例**：

```sql
-- 表数据：id = 1, 5, 10, 15

-- 事务 A
SELECT * FROM table WHERE id = 5 FOR UPDATE;
-- 锁定：(1, 5] 和 (5, 10)

-- 事务 B（会阻塞）
INSERT INTO table (id) VALUES (3);   -- 在间隙 (1, 5) 中
INSERT INTO table (id) VALUES (7);   -- 在间隙 (5, 10) 中

-- 事务 B（不会阻塞）
INSERT INTO table (id) VALUES (12);  -- 不在锁定范围
```

## 二、Spring Boot 事务管理

### 2.1 @Transactional 注解

**基本使用**：

```java
@Service
public class UserService {
    
    @Autowired
    private UserMapper userMapper;
    
    @Autowired
    private AccountMapper accountMapper;
    
    // 方法级事务
    @Transactional
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        // 扣款
        accountMapper.deduct(fromId, amount);
        
        // 模拟异常
        if (amount.compareTo(new BigDecimal("1000")) > 0) {
            throw new RuntimeException("金额过大");
        }
        
        // 加款
        accountMapper.add(toId, amount);
    }
}

// 类级事务
@Service
@Transactional
public class OrderService {
    
    public void createOrder(Order order) {
        // 所有方法都有事务
    }
    
    public void updateOrder(Order order) {
        // 所有方法都有事务
    }
}
```

### 2.2 事务属性

**1. 传播行为（Propagation）**

```java
public enum Propagation {
    
    // 如果当前存在事务，则加入；否则创建新事务（默认）
    REQUIRED(0),
    
    // 如果当前存在事务，则加入；否则以非事务方式执行
    SUPPORTS(1),
    
    // 如果当前存在事务，则加入；否则抛出异常
    MANDATORY(2),
    
    // 创建新事务，如果当前存在事务，则挂起
    REQUIRES_NEW(3),
    
    // 以非事务方式执行，如果当前存在事务，则挂起
    NOT_SUPPORTED(4),
    
    // 以非事务方式执行，如果当前存在事务，则抛出异常
    NEVER(5),
    
    // 如果当前存在事务，则在嵌套事务中执行；否则创建新事务
    NESTED(6);
}
```

**传播行为示例**：

```java
@Service
public class OrderService {
    
    @Autowired
    private LogService logService;
    
    // REQUIRED（默认）
    @Transactional(propagation = Propagation.REQUIRED)
    public void createOrder() {
        // 创建订单
        orderMapper.insert(order);
        
        // 记录日志（加入当前事务）
        logService.log("创建订单");
        
        // 如果日志失败，订单也会回滚
    }
    
    // REQUIRES_NEW
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createOrderWithNewTransaction() {
        // 创建订单
        orderMapper.insert(order);
        
        // 记录日志（新事务）
        logService.logInNewTransaction("创建订单");
        
        // 即使订单失败，日志也会提交
    }
    
    // NESTED
    @Transactional(propagation = Propagation.NESTED)
    public void createOrderWithNested() {
        // 创建订单
        orderMapper.insert(order);
        
        try {
            // 记录日志（嵌套事务）
            logService.logNested("创建订单");
        } catch (Exception e) {
            // 日志失败，只回滚日志，订单不受影响
        }
    }
}

@Service
public class LogService {
    
    @Transactional(propagation = Propagation.REQUIRED)
    public void log(String message) {
        logMapper.insert(new Log(message));
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logInNewTransaction(String message) {
        logMapper.insert(new Log(message));
    }
    
    @Transactional(propagation = Propagation.NESTED)
    public void logNested(String message) {
        logMapper.insert(new Log(message));
    }
}
```

**2. 隔离级别（Isolation）**

```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public void method1() {
    // 使用 READ COMMITTED 隔离级别
}

@Transactional(isolation = Isolation.REPEATABLE_READ)
public void method2() {
    // 使用 REPEATABLE READ 隔离级别
}

@Transactional(isolation = Isolation.SERIALIZABLE)
public void method3() {
    // 使用 SERIALIZABLE 隔离级别
}
```

**3. 超时时间（Timeout）**

```java
// 超时时间（秒）
@Transactional(timeout = 30)
public void method() {
    // 如果 30 秒内未完成，抛出异常并回滚
}
```

**4. 只读事务（ReadOnly）**

```java
// 只读事务（优化性能）
@Transactional(readOnly = true)
public List<User> listUsers() {
    return userMapper.selectAll();
}
```

**5. 回滚规则（Rollback）**

```java
// 默认：RuntimeException 和 Error 回滚
@Transactional
public void method1() {
    throw new RuntimeException();  // 回滚
}

// 指定回滚异常
@Transactional(rollbackFor = Exception.class)
public void method2() throws Exception {
    throw new Exception();  // 回滚
}

// 指定不回滚异常
@Transactional(noRollbackFor = BusinessException.class)
public void method3() {
    throw new BusinessException();  // 不回滚
}
```

### 2.3 事务失效场景

**1. 方法不是 public**

```java
@Service
public class UserService {
    
    // ❌ 事务失效
    @Transactional
    private void method() {
    }
    
    // ✅ 正常
    @Transactional
    public void method() {
    }
}
```

**2. 同类方法调用**

```java
@Service
public class UserService {
    
    public void methodA() {
        // ❌ 事务失效（直接调用，不走代理）
        this.methodB();
    }
    
    @Transactional
    public void methodB() {
        // 事务不生效
    }
}

// 解决方案1：注入自己
@Service
public class UserService {
    
    @Autowired
    private UserService self;
    
    public void methodA() {
        // ✅ 通过代理调用
        self.methodB();
    }
    
    @Transactional
    public void methodB() {
    }
}

// 解决方案2：使用 AopContext
@Service
public class UserService {
    
    public void methodA() {
        // ✅ 获取代理对象
        UserService proxy = (UserService) AopContext.currentProxy();
        proxy.methodB();
    }
    
    @Transactional
    public void methodB() {
    }
}
```

**3. 异常被捕获**

```java
@Service
public class UserService {
    
    // ❌ 事务失效
    @Transactional
    public void method() {
        try {
            // 业务逻辑
            throw new RuntimeException();
        } catch (Exception e) {
            // 异常被捕获，事务不会回滚
        }
    }
    
    // ✅ 手动回滚
    @Transactional
    public void method() {
        try {
            // 业务逻辑
            throw new RuntimeException();
        } catch (Exception e) {
            // 手动标记回滚
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        }
    }
}
```

**4. 数据库不支持事务**

```java
// MyISAM 不支持事务
CREATE TABLE user (
    id INT PRIMARY KEY,
    name VARCHAR(50)
) ENGINE=MyISAM;

// ❌ 事务失效
@Transactional
public void method() {
    userMapper.insert(user);
}

// ✅ 使用 InnoDB
CREATE TABLE user (
    id INT PRIMARY KEY,
    name VARCHAR(50)
) ENGINE=InnoDB;
```

**5. 传播行为设置错误**

```java
// ❌ 事务失效
@Transactional(propagation = Propagation.NOT_SUPPORTED)
public void method() {
    // 以非事务方式执行
}

// ❌ 事务失效
@Transactional(propagation = Propagation.NEVER)
public void method() {
    // 以非事务方式执行
}
```

**6. 多线程调用**

```java
@Service
public class UserService {
    
    // ❌ 事务失效
    @Transactional
    public void method() {
        new Thread(() -> {
            // 新线程，事务不会传播
            userMapper.insert(user);
        }).start();
    }
    
    // ✅ 使用线程池 + TransactionTemplate
    @Autowired
    private TransactionTemplate transactionTemplate;
    
    @Autowired
    private ThreadPoolTaskExecutor executor;
    
    public void method() {
        executor.submit(() -> {
            transactionTemplate.execute(status -> {
                userMapper.insert(user);
                return null;
            });
        });
    }
}
```

### 2.4 编程式事务

**1. TransactionTemplate**

```java
@Service
public class UserService {
    
    @Autowired
    private TransactionTemplate transactionTemplate;
    
    @Autowired
    private UserMapper userMapper;
    
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        transactionTemplate.execute(status -> {
            try {
                // 扣款
                userMapper.deduct(fromId, amount);
                
                // 加款
                userMapper.add(toId, amount);
                
                return true;
            } catch (Exception e) {
                // 回滚
                status.setRollbackOnly();
                return false;
            }
        });
    }
}
```

**2. PlatformTransactionManager**

```java
@Service
public class UserService {
    
    @Autowired
    private PlatformTransactionManager transactionManager;
    
    @Autowired
    private UserMapper userMapper;
    
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        // 定义事务属性
        DefaultTransactionDefinition def = new DefaultTransactionDefinition();
        def.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRED);
        def.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        
        // 获取事务状态
        TransactionStatus status = transactionManager.getTransaction(def);
        
        try {
            // 扣款
            userMapper.deduct(fromId, amount);
            
            // 加款
            userMapper.add(toId, amount);
            
            // 提交
            transactionManager.commit(status);
            
        } catch (Exception e) {
            // 回滚
            transactionManager.rollback(status);
            throw e;
        }
    }
}
```



## 三、分布式事务

### 3.1 分布式事务问题

**场景**：跨多个数据库或服务的事务

```java
@Service
public class OrderService {
    
    @Autowired
    private OrderMapper orderMapper;
    
    @Autowired
    private InventoryService inventoryService;  // 库存服务（另一个数据库）
    
    @Autowired
    private PaymentService paymentService;      // 支付服务（另一个数据库）
    
    // ❌ 本地事务无法保证一致性
    @Transactional
    public void createOrder(Order order) {
        // 1. 创建订单（本地数据库）
        orderMapper.insert(order);
        
        // 2. 扣减库存（远程调用）
        inventoryService.deduct(order.getProductId(), order.getQuantity());
        
        // 3. 扣款（远程调用）
        paymentService.pay(order.getUserId(), order.getAmount());
        
        // 如果步骤 3 失败，步骤 2 已经执行，无法回滚
    }
}
```

### 3.2 分布式事务解决方案

**1. 两阶段提交（2PC）**

```java
// 使用 Seata AT 模式
@Service
public class OrderService {
    
    @GlobalTransactional  // 全局事务
    public void createOrder(Order order) {
        // 1. 创建订单
        orderMapper.insert(order);
        
        // 2. 扣减库存（远程调用）
        inventoryService.deduct(order.getProductId(), order.getQuantity());
        
        // 3. 扣款（远程调用）
        paymentService.pay(order.getUserId(), order.getAmount());
        
        // 任何一步失败，全部回滚
    }
}

// Seata 配置
@Configuration
public class SeataConfig {
    
    @Bean
    public GlobalTransactionScanner globalTransactionScanner() {
        return new GlobalTransactionScanner("order-service", "default");
    }
}
```

**2. TCC（Try-Confirm-Cancel）**

```java
@Service
public class InventoryService {
    
    // Try：预留资源
    @TwoPhaseBusinessAction(name = "deduct", commitMethod = "confirm", rollbackMethod = "cancel")
    public boolean deduct(
        BusinessActionContext context,
        @BusinessActionContextParameter(paramName = "productId") Long productId,
        @BusinessActionContextParameter(paramName = "quantity") Integer quantity) {
        
        // 冻结库存
        inventoryMapper.freeze(productId, quantity);
        return true;
    }
    
    // Confirm：确认提交
    public boolean confirm(BusinessActionContext context) {
        Long productId = context.getActionContext("productId", Long.class);
        Integer quantity = context.getActionContext("quantity", Integer.class);
        
        // 扣减库存
        inventoryMapper.deduct(productId, quantity);
        return true;
    }
    
    // Cancel：回滚
    public boolean cancel(BusinessActionContext context) {
        Long productId = context.getActionContext("productId", Long.class);
        Integer quantity = context.getActionContext("quantity", Integer.class);
        
        // 解冻库存
        inventoryMapper.unfreeze(productId, quantity);
        return true;
    }
}
```

**3. SAGA 模式**

```java
@Service
public class OrderSaga {
    
    @Autowired
    private OrderService orderService;
    
    @Autowired
    private InventoryService inventoryService;
    
    @Autowired
    private PaymentService paymentService;
    
    public void createOrder(Order order) {
        try {
            // 1. 创建订单
            orderService.create(order);
            
            // 2. 扣减库存
            inventoryService.deduct(order.getProductId(), order.getQuantity());
            
            // 3. 扣款
            paymentService.pay(order.getUserId(), order.getAmount());
            
        } catch (Exception e) {
            // 补偿操作
            compensate(order);
        }
    }
    
    private void compensate(Order order) {
        // 1. 取消订单
        orderService.cancel(order.getId());
        
        // 2. 恢复库存
        inventoryService.restore(order.getProductId(), order.getQuantity());
        
        // 3. 退款
        paymentService.refund(order.getUserId(), order.getAmount());
    }
}
```

**4. 本地消息表**

```java
@Service
public class OrderService {
    
    @Autowired
    private OrderMapper orderMapper;
    
    @Autowired
    private MessageMapper messageMapper;
    
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    @Transactional
    public void createOrder(Order order) {
        // 1. 创建订单
        orderMapper.insert(order);
        
        // 2. 保存消息到本地消息表
        Message message = new Message();
        message.setContent(JSON.toJSONString(order));
        message.setStatus("PENDING");
        messageMapper.insert(message);
        
        // 3. 发送消息（异步）
        rabbitTemplate.convertAndSend("order.exchange", "order.created", message);
    }
    
    // 定时任务：重试失败的消息
    @Scheduled(fixedDelay = 60000)
    public void retryFailedMessages() {
        List<Message> messages = messageMapper.selectPending();
        for (Message message : messages) {
            try {
                rabbitTemplate.convertAndSend("order.exchange", "order.created", message);
                message.setStatus("SUCCESS");
                messageMapper.updateById(message);
            } catch (Exception e) {
                log.error("重试消息失败: {}", message.getId(), e);
            }
        }
    }
}

// 库存服务消费消息
@Component
public class InventoryConsumer {
    
    @RabbitListener(queues = "inventory.queue")
    public void handleOrderCreated(Message message) {
        Order order = JSON.parseObject(message.getContent(), Order.class);
        
        // 扣减库存
        inventoryService.deduct(order.getProductId(), order.getQuantity());
    }
}
```

**5. 最大努力通知**

```java
@Service
public class PaymentService {
    
    @Autowired
    private PaymentMapper paymentMapper;
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Transactional
    public void pay(Long userId, BigDecimal amount) {
        // 1. 扣款
        paymentMapper.deduct(userId, amount);
        
        // 2. 通知订单服务（最大努力）
        notifyOrderService(userId, amount);
    }
    
    private void notifyOrderService(Long userId, BigDecimal amount) {
        int maxRetry = 3;
        int[] delays = {0, 5, 10};  // 重试间隔（秒）
        
        for (int i = 0; i < maxRetry; i++) {
            try {
                if (i > 0) {
                    Thread.sleep(delays[i] * 1000);
                }
                
                restTemplate.postForObject(
                    "http://order-service/api/payment/callback",
                    new PaymentCallback(userId, amount),
                    String.class
                );
                
                return;  // 成功
                
            } catch (Exception e) {
                log.error("通知订单服务失败，重试次数: {}", i + 1, e);
            }
        }
        
        // 最终失败，记录日志或发送告警
        log.error("通知订单服务最终失败: userId={}, amount={}", userId, amount);
    }
}
```

## 四、事务优化

### 4.1 减小事务范围

```java
// ❌ 事务范围过大
@Transactional
public void createOrder(Order order) {
    // 1. 查询用户信息（不需要事务）
    User user = userMapper.selectById(order.getUserId());
    
    // 2. 查询商品信息（不需要事务）
    Product product = productMapper.selectById(order.getProductId());
    
    // 3. 计算价格（不需要事务）
    BigDecimal totalPrice = calculatePrice(product, order.getQuantity());
    
    // 4. 创建订单（需要事务）
    order.setTotalPrice(totalPrice);
    orderMapper.insert(order);
    
    // 5. 发送通知（不需要事务）
    sendNotification(order);
}

// ✅ 缩小事务范围
public void createOrder(Order order) {
    // 1. 查询用户信息
    User user = userMapper.selectById(order.getUserId());
    
    // 2. 查询商品信息
    Product product = productMapper.selectById(order.getProductId());
    
    // 3. 计算价格
    BigDecimal totalPrice = calculatePrice(product, order.getQuantity());
    order.setTotalPrice(totalPrice);
    
    // 4. 创建订单（事务）
    createOrderInTransaction(order);
    
    // 5. 发送通知
    sendNotification(order);
}

@Transactional
private void createOrderInTransaction(Order order) {
    orderMapper.insert(order);
}
```

### 4.2 避免长事务

```java
// ❌ 长事务
@Transactional
public void batchProcess(List<Order> orders) {
    for (Order order : orders) {
        // 处理每个订单（可能很慢）
        processOrder(order);
    }
}

// ✅ 分批处理
public void batchProcess(List<Order> orders) {
    int batchSize = 100;
    for (int i = 0; i < orders.size(); i += batchSize) {
        List<Order> batch = orders.subList(i, Math.min(i + batchSize, orders.size()));
        processBatch(batch);
    }
}

@Transactional
private void processBatch(List<Order> batch) {
    for (Order order : batch) {
        processOrder(order);
    }
}
```

### 4.3 使用乐观锁

```java
// 表结构
CREATE TABLE product (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100),
    stock INT,
    version INT DEFAULT 0  -- 版本号
);

// 实体类
@Data
public class Product {
    private Long id;
    private String name;
    private Integer stock;
    @Version  // MyBatis-Plus 乐观锁
    private Integer version;
}

// ✅ 使用乐观锁
@Service
public class ProductService {
    
    @Autowired
    private ProductMapper productMapper;
    
    public boolean deductStock(Long productId, Integer quantity) {
        // 1. 查询商品
        Product product = productMapper.selectById(productId);
        
        if (product.getStock() < quantity) {
            return false;
        }
        
        // 2. 扣减库存（乐观锁）
        product.setStock(product.getStock() - quantity);
        int rows = productMapper.updateById(product);
        
        // 3. 更新失败，说明版本号已变化
        if (rows == 0) {
            // 重试或返回失败
            return deductStock(productId, quantity);
        }
        
        return true;
    }
}

// SQL（MyBatis-Plus 自动生成）
UPDATE product 
SET stock = #{stock}, version = version + 1 
WHERE id = #{id} AND version = #{version}
```

### 4.4 异步处理

```java
@Service
public class OrderService {
    
    @Autowired
    private OrderMapper orderMapper;
    
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    @Transactional
    public void createOrder(Order order) {
        // 1. 创建订单（同步）
        orderMapper.insert(order);
        
        // 2. 发送消息（异步）
        rabbitTemplate.convertAndSend("order.exchange", "order.created", order);
    }
}

// 异步处理
@Component
public class OrderConsumer {
    
    @RabbitListener(queues = "order.queue")
    public void handleOrderCreated(Order order) {
        // 发送通知
        sendNotification(order);
        
        // 更新统计
        updateStatistics(order);
        
        // 其他非核心业务
    }
}
```

## 五、事务监控

### 5.1 慢事务监控

```java
@Aspect
@Component
@Slf4j
public class TransactionMonitorAspect {
    
    @Around("@annotation(org.springframework.transaction.annotation.Transactional)")
    public Object monitor(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        String methodName = joinPoint.getSignature().toShortString();
        
        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - start;
            
            // 慢事务告警（超过 3 秒）
            if (duration > 3000) {
                log.warn("慢事务: {}, 耗时: {}ms", methodName, duration);
            }
            
            return result;
            
        } catch (Throwable e) {
            long duration = System.currentTimeMillis() - start;
            log.error("事务失败: {}, 耗时: {}ms", methodName, duration, e);
            throw e;
        }
    }
}
```

### 5.2 事务统计

```java
@Component
public class TransactionMetrics {
    
    private final Counter transactionCounter;
    private final Counter successCounter;
    private final Counter failureCounter;
    private final Histogram transactionDuration;
    
    public TransactionMetrics(MeterRegistry registry) {
        this.transactionCounter = Counter.builder("transaction.total")
            .description("Total transactions")
            .register(registry);
        
        this.successCounter = Counter.builder("transaction.success")
            .description("Successful transactions")
            .register(registry);
        
        this.failureCounter = Counter.builder("transaction.failure")
            .description("Failed transactions")
            .register(registry);
        
        this.transactionDuration = Histogram.builder("transaction.duration")
            .description("Transaction duration")
            .baseUnit("milliseconds")
            .register(registry);
    }
    
    public void recordTransaction() {
        transactionCounter.increment();
    }
    
    public void recordSuccess() {
        successCounter.increment();
    }
    
    public void recordFailure() {
        failureCounter.increment();
    }
    
    public void recordDuration(long milliseconds) {
        transactionDuration.record(milliseconds);
    }
}
```

### 5.3 死锁检测

```sql
-- 查看当前事务
SELECT * FROM information_schema.INNODB_TRX;

-- 查看锁等待
SELECT * FROM information_schema.INNODB_LOCK_WAITS;

-- 查看锁信息
SELECT * FROM information_schema.INNODB_LOCKS;

-- 查看死锁日志
SHOW ENGINE INNODB STATUS;
```

---

## 总结

**MySQL 事务核心要点**：

1. **ACID 特性**：原子性、一致性、隔离性、持久性
2. **隔离级别**：READ UNCOMMITTED、READ COMMITTED、REPEATABLE READ、SERIALIZABLE
3. **并发问题**：脏读、不可重复读、幻读
4. **MVCC**：多版本并发控制，实现 REPEATABLE READ
5. **锁机制**：共享锁、排他锁、间隙锁、临键锁

**Spring Boot 事务核心要点**：

1. **@Transactional**：声明式事务管理
2. **传播行为**：REQUIRED、REQUIRES_NEW、NESTED 等
3. **事务失效**：非 public 方法、同类调用、异常捕获等
4. **编程式事务**：TransactionTemplate、PlatformTransactionManager
5. **分布式事务**：2PC、TCC、SAGA、本地消息表

**事务优化**：

1. 减小事务范围
2. 避免长事务
3. 使用乐观锁
4. 异步处理
5. 监控慢事务

**最佳实践**：

- 默认使用 REPEATABLE READ 隔离级别
- 事务方法尽量简短
- 避免在事务中调用远程服务
- 合理使用传播行为
- 监控事务性能
