# ZooKeeper 核心知识

## 一、ZooKeeper 概述

### 1.1 什么是 ZooKeeper？

ZooKeeper 是一个开源的分布式协调服务，为分布式应用提供一致性服务。

**核心功能**：
- 配置管理
- 命名服务
- 分布式锁
- 集群管理
- 分布式队列

**特点**：
- 顺序一致性：客户端的更新顺序与发送顺序一致
- 原子性：更新要么成功要么失败
- 单一视图：无论连接哪个服务器，看到的数据一致
- 可靠性：一旦更新成功，数据持久化
- 实时性：客户端能及时获取最新数据

### 1.2 ZooKeeper 架构

```
┌─────────────────────────────────────────────┐
│              Client 客户端                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           ZooKeeper 集群                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ Leader  │  │Follower │  │Follower │    │
│  │  (主)   │  │  (从)   │  │  (从)   │    │
│  └─────────┘  └─────────┘  └─────────┘    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           持久化存储（磁盘）                  │
└─────────────────────────────────────────────┘
```

**角色**：
- **Leader**：处理所有写请求，负责投票的发起和决议
- **Follower**：处理读请求，转发写请求给 Leader，参与投票
- **Observer**：处理读请求，不参与投票（扩展读性能）

## 二、数据模型

### 2.1 ZNode 节点

ZooKeeper 的数据模型是树形结构，每个节点称为 ZNode。

```
/
├── app1
│   ├── config
│   │   ├── db
│   │   └── cache
│   └── servers
│       ├── server1
│       └── server2
└── app2
    └── config
```

**ZNode 类型**：

1. **持久节点（PERSISTENT）**
   - 创建后一直存在，除非主动删除
   ```java
   zk.create("/app/config", data, ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.PERSISTENT);
   ```

2. **持久顺序节点（PERSISTENT_SEQUENTIAL）**
   - 持久节点 + 自动编号
   ```java
   // 创建 /app/task0000000001, /app/task0000000002...
   zk.create("/app/task", data, ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.PERSISTENT_SEQUENTIAL);
   ```

3. **临时节点（EPHEMERAL）**
   - 客户端会话结束时自动删除
   ```java
   zk.create("/app/server1", data, ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL);
   ```

4. **临时顺序节点（EPHEMERAL_SEQUENTIAL）**
   - 临时节点 + 自动编号
   ```java
   zk.create("/app/lock", data, ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL_SEQUENTIAL);
   ```

### 2.2 ZNode 数据结构

```java
public class Stat {
    long czxid;          // 创建该节点的事务ID
    long mzxid;          // 最后修改该节点的事务ID
    long ctime;          // 创建时间
    long mtime;          // 最后修改时间
    int version;         // 数据版本号
    int cversion;        // 子节点版本号
    int aversion;        // ACL版本号
    long ephemeralOwner; // 临时节点的会话ID，持久节点为0
    int dataLength;      // 数据长度
    int numChildren;     // 子节点数量
    long pzxid;          // 最后修改子节点的事务ID
}
```

## 三、核心机制

### 3.1 ZAB 协议（ZooKeeper Atomic Broadcast）

ZAB 是 ZooKeeper 的核心协议，保证分布式数据一致性。

**两种模式**：

**1. 崩溃恢复模式**
- Leader 崩溃或集群启动时进入
- 选举新 Leader
- 数据同步

**2. 消息广播模式**
- 正常运行时的模式
- Leader 接收写请求
- 广播给 Follower
- 过半确认后提交

**流程**：
```
Client → Leader: 写请求
Leader → Followers: Proposal（提议）
Followers → Leader: ACK（确认）
Leader → Followers: Commit（提交）
Leader → Client: 响应
```

### 3.2 Leader 选举

**选举条件**：
- 集群启动
- Leader 崩溃
- Leader 失去过半 Follower 连接

**选举算法（FastLeaderElection）**：

```
1. 每个节点投票给自己
2. 交换投票信息
3. 比较规则：
   - ZXID 大的优先（数据越新越优先）
   - ZXID 相同，myid 大的优先
4. 过半节点投票给同一个节点，选举结束
```

**示例**：
```
Server1: (myid=1, zxid=100)
Server2: (myid=2, zxid=100)
Server3: (myid=3, zxid=99)

第一轮：
Server1 投 Server1
Server2 投 Server2
Server3 投 Server3

第二轮（比较 zxid）：
Server1 和 Server2 的 zxid 相同且最大
Server3 改投 Server2（zxid 更大）

第三轮（比较 myid）：
Server1 改投 Server2（myid 更大）
Server2 获得 3 票，当选 Leader
```

### 3.3 Watch 机制

Watch 是 ZooKeeper 的通知机制，客户端可以监听节点变化。

**特点**：
- 一次性触发：触发后需要重新注册
- 异步通知：不阻塞客户端
- 轻量级：只通知变化，不返回数据

**事件类型**：
```java
// 节点创建
EventType.NodeCreated

// 节点删除
EventType.NodeDeleted

// 节点数据变化
EventType.NodeDataChanged

// 子节点变化
EventType.NodeChildrenChanged
```

**使用示例**：
```java
// 监听节点数据变化
zk.getData("/config", new Watcher() {
    @Override
    public void process(WatchedEvent event) {
        if (event.getType() == EventType.NodeDataChanged) {
            System.out.println("配置已更新");
            // 重新注册 Watch
            zk.getData("/config", this, null);
        }
    }
}, null);

// 监听子节点变化
zk.getChildren("/servers", new Watcher() {
    @Override
    public void process(WatchedEvent event) {
        if (event.getType() == EventType.NodeChildrenChanged) {
            System.out.println("服务器列表已变化");
            // 重新注册 Watch
            zk.getChildren("/servers", this);
        }
    }
});
```

### 3.4 Session 会话

**会话状态**：
```
CONNECTING → CONNECTED → CLOSED
              ↓
         DISCONNECTED
```

**会话超时**：
```java
// 创建会话，超时时间 5000ms
ZooKeeper zk = new ZooKeeper(
    "localhost:2181", 
    5000, 
    new Watcher() {
        @Override
        public void process(WatchedEvent event) {
            if (event.getState() == KeeperState.Expired) {
                System.out.println("会话过期");
            }
        }
    }
);
```

**会话保活**：
- 客户端定期发送心跳（ping）
- 默认心跳间隔 = sessionTimeout / 3

## 四、典型应用场景

### 4.1 分布式锁

**实现方式 1：临时顺序节点**

```java
public class DistributedLock {
    
    private ZooKeeper zk;
    private String lockPath = "/locks";
    private String currentNode;
    
    public void lock() throws Exception {
        // 1. 创建临时顺序节点
        currentNode = zk.create(
            lockPath + "/lock_",
            new byte[0],
            ZooDefs.Ids.OPEN_ACL_UNSAFE,
            CreateMode.EPHEMERAL_SEQUENTIAL
        );
        
        // 2. 获取所有子节点
        List<String> children = zk.getChildren(lockPath, false);
        Collections.sort(children);
        
        // 3. 判断是否是最小节点
        String minNode = children.get(0);
        if (currentNode.endsWith(minNode)) {
            // 获得锁
            return;
        }
        
        // 4. 监听前一个节点
        String prevNode = null;
        for (int i = 0; i < children.size(); i++) {
            if (currentNode.endsWith(children.get(i))) {
                prevNode = children.get(i - 1);
                break;
            }
        }
        
        CountDownLatch latch = new CountDownLatch(1);
        zk.exists(lockPath + "/" + prevNode, new Watcher() {
            @Override
            public void process(WatchedEvent event) {
                if (event.getType() == EventType.NodeDeleted) {
                    latch.countDown();
                }
            }
        });
        
        // 5. 等待前一个节点释放
        latch.await();
    }
    
    public void unlock() throws Exception {
        // 删除节点，释放锁
        zk.delete(currentNode, -1);
    }
}
```

**使用**：
```java
DistributedLock lock = new DistributedLock(zk);
try {
    lock.lock();
    // 执行业务逻辑
    System.out.println("获得锁，执行业务");
} finally {
    lock.unlock();
}
```

### 4.2 服务注册与发现

```java
public class ServiceRegistry {
    
    private ZooKeeper zk;
    private String registryPath = "/services";
    
    /**
     * 注册服务
     */
    public void register(String serviceName, String address) throws Exception {
        String servicePath = registryPath + "/" + serviceName;
        
        // 创建服务节点（持久）
        if (zk.exists(servicePath, false) == null) {
            zk.create(servicePath, new byte[0], 
                ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.PERSISTENT);
        }
        
        // 创建服务实例节点（临时）
        String instancePath = servicePath + "/instance_";
        zk.create(instancePath, address.getBytes(),
            ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL_SEQUENTIAL);
        
        System.out.println("服务注册成功: " + serviceName + " -> " + address);
    }
    
    /**
     * 发现服务
     */
    public List<String> discover(String serviceName) throws Exception {
        String servicePath = registryPath + "/" + serviceName;
        
        // 获取所有服务实例
        List<String> children = zk.getChildren(servicePath, new Watcher() {
            @Override
            public void process(WatchedEvent event) {
                if (event.getType() == EventType.NodeChildrenChanged) {
                    try {
                        // 服务列表变化，重新获取
                        discover(serviceName);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
        });
        
        List<String> addresses = new ArrayList<>();
        for (String child : children) {
            byte[] data = zk.getData(servicePath + "/" + child, false, null);
            addresses.add(new String(data));
        }
        
        return addresses;
    }
}
```

### 4.3 配置中心

```java
public class ConfigCenter {
    
    private ZooKeeper zk;
    private String configPath = "/config";
    private Map<String, String> localCache = new ConcurrentHashMap<>();
    
    /**
     * 获取配置
     */
    public String getConfig(String key) throws Exception {
        String path = configPath + "/" + key;
        
        // 先从本地缓存获取
        if (localCache.containsKey(key)) {
            return localCache.get(key);
        }
        
        // 从 ZooKeeper 获取
        byte[] data = zk.getData(path, new Watcher() {
            @Override
            public void process(WatchedEvent event) {
                if (event.getType() == EventType.NodeDataChanged) {
                    try {
                        // 配置变化，更新缓存
                        updateCache(key);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
        }, null);
        
        String value = new String(data);
        localCache.put(key, value);
        return value;
    }
    
    /**
     * 更新配置
     */
    public void setConfig(String key, String value) throws Exception {
        String path = configPath + "/" + key;
        
        if (zk.exists(path, false) == null) {
            zk.create(path, value.getBytes(),
                ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.PERSISTENT);
        } else {
            zk.setData(path, value.getBytes(), -1);
        }
    }
    
    /**
     * 更新本地缓存
     */
    private void updateCache(String key) throws Exception {
        String path = configPath + "/" + key;
        byte[] data = zk.getData(path, true, null);
        String value = new String(data);
        localCache.put(key, value);
        System.out.println("配置已更新: " + key + " = " + value);
    }
}
```

### 4.4 Master 选举

```java
public class MasterElection {
    
    private ZooKeeper zk;
    private String masterPath = "/master";
    private boolean isMaster = false;
    
    /**
     * 竞选 Master
     */
    public void electMaster() throws Exception {
        try {
            // 尝试创建临时节点
            zk.create(masterPath, 
                InetAddress.getLocalHost().getHostAddress().getBytes(),
                ZooDefs.Ids.OPEN_ACL_UNSAFE, 
                CreateMode.EPHEMERAL);
            
            isMaster = true;
            System.out.println("成为 Master");
            
        } catch (KeeperException.NodeExistsException e) {
            // 节点已存在，说明已有 Master
            isMaster = false;
            System.out.println("成为 Slave");
            
            // 监听 Master 节点
            watchMaster();
        }
    }
    
    /**
     * 监听 Master 节点
     */
    private void watchMaster() throws Exception {
        zk.exists(masterPath, new Watcher() {
            @Override
            public void process(WatchedEvent event) {
                if (event.getType() == EventType.NodeDeleted) {
                    try {
                        // Master 下线，重新竞选
                        electMaster();
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
        });
    }
    
    public boolean isMaster() {
        return isMaster;
    }
}
```



## 五、集群部署

### 5.1 配置文件（zoo.cfg）

```properties
# 数据目录
dataDir=/var/lib/zookeeper

# 客户端连接端口
clientPort=2181

# 心跳间隔（毫秒）
tickTime=2000

# Follower 初始化连接 Leader 的超时时间（tickTime 的倍数）
initLimit=10

# Follower 与 Leader 同步的超时时间（tickTime 的倍数）
syncLimit=5

# 集群配置
# server.id=host:port1:port2
# port1: Follower 与 Leader 通信端口
# port2: Leader 选举端口
server.1=192.168.1.101:2888:3888
server.2=192.168.1.102:2888:3888
server.3=192.168.1.103:2888:3888

# 自动清理快照和日志
autopurge.snapRetainCount=3
autopurge.purgeInterval=24

# 最大客户端连接数
maxClientCnxns=60
```

### 5.2 myid 文件

在每个节点的 dataDir 目录下创建 myid 文件：

```bash
# Server1
echo "1" > /var/lib/zookeeper/myid

# Server2
echo "2" > /var/lib/zookeeper/myid

# Server3
echo "3" > /var/lib/zookeeper/myid
```

### 5.3 启动集群

```bash
# 启动 ZooKeeper
zkServer.sh start

# 查看状态
zkServer.sh status

# 输出示例
Mode: leader    # 或 follower

# 停止
zkServer.sh stop
```

### 5.4 Docker Compose 部署

```yaml
version: '3'

services:
  zoo1:
    image: zookeeper:3.8
    hostname: zoo1
    ports:
      - "2181:2181"
    environment:
      ZOO_MY_ID: 1
      ZOO_SERVERS: server.1=zoo1:2888:3888;2181 server.2=zoo2:2888:3888;2181 server.3=zoo3:2888:3888;2181
    volumes:
      - ./zoo1/data:/data
      - ./zoo1/datalog:/datalog

  zoo2:
    image: zookeeper:3.8
    hostname: zoo2
    ports:
      - "2182:2181"
    environment:
      ZOO_MY_ID: 2
      ZOO_SERVERS: server.1=zoo1:2888:3888;2181 server.2=zoo2:2888:3888;2181 server.3=zoo3:2888:3888;2181
    volumes:
      - ./zoo2/data:/data
      - ./zoo2/datalog:/datalog

  zoo3:
    image: zookeeper:3.8
    hostname: zoo3
    ports:
      - "2183:2181"
    environment:
      ZOO_MY_ID: 3
      ZOO_SERVERS: server.1=zoo1:2888:3888;2181 server.2=zoo2:2888:3888;2181 server.3=zoo3:2888:3888;2181
    volumes:
      - ./zoo3/data:/data
      - ./zoo3/datalog:/datalog
```

## 六、客户端操作

### 6.1 命令行客户端

```bash
# 连接 ZooKeeper
zkCli.sh -server localhost:2181

# 创建节点
create /app "data"
create /app/config "config_data"

# 创建临时节点
create -e /temp "temp_data"

# 创建顺序节点
create -s /app/task "task_data"

# 获取数据
get /app

# 设置数据
set /app "new_data"

# 删除节点
delete /app/config

# 递归删除
deleteall /app

# 查看子节点
ls /app

# 查看节点状态
stat /app

# 监听节点
get -w /app
ls -w /app
```

### 6.2 Java 客户端（原生）

```java
public class ZooKeeperClient {
    
    private ZooKeeper zk;
    
    public void connect(String hosts) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        
        zk = new ZooKeeper(hosts, 5000, new Watcher() {
            @Override
            public void process(WatchedEvent event) {
                if (event.getState() == KeeperState.SyncConnected) {
                    latch.countDown();
                }
            }
        });
        
        // 等待连接成功
        latch.await();
    }
    
    public void create(String path, String data) throws Exception {
        zk.create(path, data.getBytes(), 
            ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.PERSISTENT);
    }
    
    public String getData(String path) throws Exception {
        byte[] data = zk.getData(path, false, null);
        return new String(data);
    }
    
    public void setData(String path, String data) throws Exception {
        zk.setData(path, data.getBytes(), -1);
    }
    
    public void delete(String path) throws Exception {
        zk.delete(path, -1);
    }
    
    public List<String> getChildren(String path) throws Exception {
        return zk.getChildren(path, false);
    }
    
    public void close() throws Exception {
        if (zk != null) {
            zk.close();
        }
    }
}
```

### 6.3 Curator 客户端（推荐）

```java
public class CuratorClient {
    
    private CuratorFramework client;
    
    public void connect(String hosts) {
        // 重试策略
        RetryPolicy retryPolicy = new ExponentialBackoffRetry(1000, 3);
        
        // 创建客户端
        client = CuratorFrameworkFactory.builder()
            .connectString(hosts)
            .sessionTimeoutMs(5000)
            .connectionTimeoutMs(3000)
            .retryPolicy(retryPolicy)
            .namespace("app") // 命名空间
            .build();
        
        client.start();
    }
    
    public void create(String path, String data) throws Exception {
        client.create()
            .creatingParentsIfNeeded() // 递归创建父节点
            .withMode(CreateMode.PERSISTENT)
            .forPath(path, data.getBytes());
    }
    
    public String getData(String path) throws Exception {
        byte[] data = client.getData().forPath(path);
        return new String(data);
    }
    
    public void setData(String path, String data) throws Exception {
        client.setData().forPath(path, data.getBytes());
    }
    
    public void delete(String path) throws Exception {
        client.delete()
            .deletingChildrenIfNeeded() // 递归删除
            .forPath(path);
    }
    
    public List<String> getChildren(String path) throws Exception {
        return client.getChildren().forPath(path);
    }
    
    /**
     * 监听节点变化
     */
    public void watch(String path) throws Exception {
        NodeCache cache = new NodeCache(client, path);
        cache.start(true);
        
        cache.getListenable().addListener(() -> {
            ChildData data = cache.getCurrentData();
            if (data != null) {
                System.out.println("节点变化: " + new String(data.getData()));
            }
        });
    }
    
    /**
     * 监听子节点变化
     */
    public void watchChildren(String path) throws Exception {
        PathChildrenCache cache = new PathChildrenCache(client, path, true);
        cache.start(PathChildrenCache.StartMode.POST_INITIALIZED_EVENT);
        
        cache.getListenable().addListener((client, event) -> {
            switch (event.getType()) {
                case CHILD_ADDED:
                    System.out.println("子节点添加: " + event.getData().getPath());
                    break;
                case CHILD_UPDATED:
                    System.out.println("子节点更新: " + event.getData().getPath());
                    break;
                case CHILD_REMOVED:
                    System.out.println("子节点删除: " + event.getData().getPath());
                    break;
            }
        });
    }
    
    public void close() {
        if (client != null) {
            client.close();
        }
    }
}
```

### 6.4 Curator 分布式锁

```java
public class CuratorLock {
    
    private CuratorFramework client;
    
    /**
     * 可重入锁
     */
    public void reentrantLock() throws Exception {
        InterProcessMutex lock = new InterProcessMutex(client, "/locks/lock1");
        
        try {
            // 获取锁，最多等待 10 秒
            if (lock.acquire(10, TimeUnit.SECONDS)) {
                // 执行业务逻辑
                System.out.println("获得锁");
                Thread.sleep(5000);
            }
        } finally {
            lock.release();
        }
    }
    
    /**
     * 读写锁
     */
    public void readWriteLock() throws Exception {
        InterProcessReadWriteLock rwLock = 
            new InterProcessReadWriteLock(client, "/locks/rwlock");
        
        // 读锁
        InterProcessMutex readLock = rwLock.readLock();
        try {
            readLock.acquire();
            System.out.println("获得读锁");
        } finally {
            readLock.release();
        }
        
        // 写锁
        InterProcessMutex writeLock = rwLock.writeLock();
        try {
            writeLock.acquire();
            System.out.println("获得写锁");
        } finally {
            writeLock.release();
        }
    }
    
    /**
     * 信号量
     */
    public void semaphore() throws Exception {
        InterProcessSemaphoreV2 semaphore = 
            new InterProcessSemaphoreV2(client, "/locks/semaphore", 5);
        
        Lease lease = semaphore.acquire();
        try {
            System.out.println("获得信号量");
        } finally {
            semaphore.returnLease(lease);
        }
    }
}
```

## 七、性能优化

### 7.1 配置优化

```properties
# 增加快照频率（事务数）
snapCount=100000

# 增加最大客户端连接数
maxClientCnxns=1000

# 启用 NIO
serverCnxnFactory=org.apache.zookeeper.server.NIOServerCnxnFactory

# 增加 JVM 内存
export JVMFLAGS="-Xms2g -Xmx2g"

# 禁用 fsync（提升写性能，但可能丢数据）
forceSync=no

# 预分配事务日志文件
preAllocSize=65536
```

### 7.2 客户端优化

```java
// 1. 使用连接池
public class ZkConnectionPool {
    private GenericObjectPool<CuratorFramework> pool;
    
    public ZkConnectionPool(String hosts) {
        GenericObjectPoolConfig config = new GenericObjectPoolConfig();
        config.setMaxTotal(100);
        config.setMaxIdle(20);
        config.setMinIdle(5);
        
        pool = new GenericObjectPool<>(
            new ZkConnectionFactory(hosts), config);
    }
    
    public CuratorFramework getConnection() throws Exception {
        return pool.borrowObject();
    }
    
    public void returnConnection(CuratorFramework client) {
        pool.returnObject(client);
    }
}

// 2. 批量操作
public void batchCreate(List<String> paths) throws Exception {
    CuratorOp[] ops = new CuratorOp[paths.size()];
    for (int i = 0; i < paths.size(); i++) {
        ops[i] = client.transactionOp().create()
            .forPath(paths.get(i), new byte[0]);
    }
    client.transaction().forOperations(ops);
}

// 3. 本地缓存
private Map<String, String> cache = new ConcurrentHashMap<>();

public String getCachedData(String path) throws Exception {
    return cache.computeIfAbsent(path, k -> {
        try {
            return getData(k);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    });
}
```

### 7.3 集群优化

```bash
# 1. 增加 Observer 节点（只读，不参与投票）
server.1=host1:2888:3888
server.2=host2:2888:3888
server.3=host3:2888:3888
server.4=host4:2888:3888:observer

# 2. 分离数据目录和日志目录
dataDir=/data/zookeeper
dataLogDir=/logs/zookeeper

# 3. 使用 SSD 存储事务日志

# 4. 网络优化
# 增加 TCP 缓冲区
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
```

## 八、监控与运维

### 8.1 四字命令

```bash
# 查看服务器状态
echo stat | nc localhost 2181

# 查看配置
echo conf | nc localhost 2181

# 查看连接信息
echo cons | nc localhost 2181

# 查看监听信息
echo wchs | nc localhost 2181

# 查看环境变量
echo envi | nc localhost 2181

# 重置统计信息
echo srst | nc localhost 2181

# 测试服务是否正常
echo ruok | nc localhost 2181
# 返回 imok 表示正常
```

### 8.2 JMX 监控

```bash
# 启动时开启 JMX
export JMXPORT=9999
zkServer.sh start

# 使用 JConsole 连接
jconsole localhost:9999
```

**关键指标**：
- `OutstandingRequests`：待处理请求数
- `AvgRequestLatency`：平均请求延迟
- `NumAliveConnections`：活跃连接数
- `PacketsReceived`：接收的数据包数
- `PacketsSent`：发送的数据包数

### 8.3 日志分析

```bash
# 查看事务日志
zkTxnLogToolkit.sh /data/zookeeper/version-2/log.xxx

# 查看快照
zkSnapShotToolkit.sh /data/zookeeper/version-2/snapshot.xxx
```

## 九、常见问题

### 9.1 脑裂问题

**原因**：网络分区导致集群分裂成多个子集群

**解决**：
- 过半机制：只有获得过半节点支持才能成为 Leader
- 奇数节点：3、5、7 个节点，避免平票

### 9.2 会话超时

**原因**：
- 网络延迟
- GC 停顿
- 服务器负载高

**解决**：
```java
// 增加会话超时时间
ZooKeeper zk = new ZooKeeper(hosts, 30000, watcher);

// 使用 Curator 自动重连
RetryPolicy retryPolicy = new ExponentialBackoffRetry(1000, 3);
```

### 9.3 数据不一致

**原因**：
- 网络分区
- 节点故障

**解决**：
- ZAB 协议保证最终一致性
- 使用版本号进行乐观锁控制

```java
// 使用版本号更新
Stat stat = zk.exists(path, false);
zk.setData(path, data, stat.getVersion());
```

---

## 总结

ZooKeeper 核心知识点：

1. **架构**：Leader-Follower 模式，过半机制
2. **数据模型**：树形结构，4 种节点类型
3. **核心机制**：ZAB 协议、Leader 选举、Watch 机制
4. **应用场景**：分布式锁、服务注册、配置中心、Master 选举
5. **客户端**：原生 API、Curator（推荐）
6. **运维**：集群部署、监控、性能优化

ZooKeeper 是分布式系统的基础组件，广泛应用于 Kafka、HBase、Dubbo 等框架中。
