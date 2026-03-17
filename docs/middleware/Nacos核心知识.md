# Nacos核心知识

## 一、Nacos简介

Nacos（Dynamic Naming and Configuration Service）是阿里巴巴开源的动态服务发现、配置管理和服务管理平台。

### 核心功能
- **服务发现与注册**：支持DNS和RPC服务发现
- **配置管理**：动态配置服务
- **服务健康监测**：健康检查和流量管理
- **动态DNS服务**：支持权重路由

### 核心特性
- 易于使用：简单的数据模型和API
- 高可用：支持集群部署
- 多数据中心：支持多环境
- 开放性：支持多种注册中心迁移

## 二、架构设计

### 1. 整体架构

```
┌─────────────────────────────────────────┐
│           Nacos Console (控制台)         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│         Open API (HTTP/gRPC)            │
└─────────────────────────────────────────┘
┌──────────────────┬──────────────────────┐
│   Naming Service │  Config Service      │
│   (服务注册发现)  │  (配置管理)          │
└──────────────────┴──────────────────────┘
┌─────────────────────────────────────────┐
│      Consistency Protocol (一致性)       │
│      Raft / Distro                      │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│         Storage (MySQL/Derby)           │
└─────────────────────────────────────────┘
```

### 2. 核心模块

**Naming模块**：
- 服务注册
- 服务发现
- 健康检查
- 负载均衡

**Config模块**：
- 配置发布
- 配置监听
- 配置变更推送
- 灰度发布

**Console模块**：
- Web管理界面
- 服务管理
- 配置管理
- 集群管理

## 三、服务注册与发现

### 1. 服务注册

**临时实例（默认）**：
- 使用心跳保持连接
- 服务下线自动注销
- 适合云原生应用

**永久实例**：
- 需要手动注销
- 服务下线不会自动删除
- 适合传统应用

### 2. 注册方式

**Spring Cloud集成**：

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
```

```yaml
spring:
  application:
    name: user-service
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848
        namespace: dev
        group: DEFAULT_GROUP
        ephemeral: true  # 临时实例
        weight: 1        # 权重
        metadata:
          version: 1.0.0
```

**Java SDK**：

```java
Properties properties = new Properties();
properties.put("serverAddr", "127.0.0.1:8848");
properties.put("namespace", "dev");

NamingService naming = NamingFactory.createNamingService(properties);

// 注册服务
naming.registerInstance("user-service", "192.168.1.100", 8080);

// 注销服务
naming.deregisterInstance("user-service", "192.168.1.100", 8080);
```

### 3. 服务发现

```java
// 获取所有实例
List<Instance> instances = naming.getAllInstances("user-service");

// 获取健康实例
List<Instance> healthyInstances = naming.selectInstances("user-service", true);

// 订阅服务变化
naming.subscribe("user-service", event -> {
    List<Instance> instances = ((NamingEvent) event).getInstances();
    // 处理服务变化
});
```


### 4. 健康检查

**客户端心跳（临时实例）**：
- 客户端定期发送心跳（默认5秒）
- 超过15秒未收到心跳标记不健康
- 超过30秒自动注销

**服务端探测（永久实例）**：
- TCP探测
- HTTP探测
- MySQL探测

```yaml
spring:
  cloud:
    nacos:
      discovery:
        heart-beat-interval: 5000    # 心跳间隔
        heart-beat-timeout: 15000    # 心跳超时
        ip-delete-timeout: 30000     # 删除超时
```

### 5. 负载均衡

**权重配置**：

```java
Instance instance = new Instance();
instance.setIp("192.168.1.100");
instance.setPort(8080);
instance.setWeight(2.0);  // 权重越大，流量越多
naming.registerInstance("user-service", instance);
```

**负载均衡策略**：
- 随机
- 轮询
- 权重随机
- 权重轮询

## 四、配置管理

### 1. 配置模型

**Data ID**：配置的唯一标识
- 格式：`${prefix}-${spring.profiles.active}.${file-extension}`
- 示例：`user-service-dev.yaml`

**Group**：配置分组
- 默认：DEFAULT_GROUP
- 用途：区分不同环境或业务

**Namespace**：命名空间
- 用于多租户隔离
- 不同namespace数据完全隔离

### 2. 配置使用

**Spring Cloud集成**：

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
</dependency>
```

**bootstrap.yml配置**：

```yaml
spring:
  application:
    name: user-service
  cloud:
    nacos:
      config:
        server-addr: 127.0.0.1:8848
        namespace: dev
        group: DEFAULT_GROUP
        file-extension: yaml
        refresh-enabled: true  # 自动刷新
        extension-configs:
          - data-id: common.yaml
            group: DEFAULT_GROUP
            refresh: true
        shared-configs:
          - data-id: redis.yaml
            group: DEFAULT_GROUP
            refresh: true
```

**动态刷新**：

```java
@RestController
@RefreshScope  // 支持动态刷新
public class ConfigController {
    
    @Value("${user.name}")
    private String userName;
    
    @GetMapping("/config")
    public String getConfig() {
        return userName;
    }
}
```

### 3. 配置监听

**Java SDK**：

```java
Properties properties = new Properties();
properties.put("serverAddr", "127.0.0.1:8848");
properties.put("namespace", "dev");

ConfigService configService = NacosFactory.createConfigService(properties);

// 获取配置
String content = configService.getConfig("user-service.yaml", "DEFAULT_GROUP", 5000);

// 监听配置变化
configService.addListener("user-service.yaml", "DEFAULT_GROUP", new Listener() {
    @Override
    public void receiveConfigInfo(String configInfo) {
        System.out.println("配置更新：" + configInfo);
    }
    
    @Override
    public Executor getExecutor() {
        return null;
    }
});

// 发布配置
boolean result = configService.publishConfig("user-service.yaml", "DEFAULT_GROUP", "content");
```

### 4. 配置优先级

从高到低：
1. `${spring.application.name}-${profile}.${file-extension}`
2. `${spring.application.name}.${file-extension}`
3. `extension-configs`
4. `shared-configs`

### 5. 灰度发布

**Beta发布**：
- 指定IP列表接收新配置
- 验证无误后全量发布

**流程**：
1. 创建Beta配置
2. 指定Beta IP列表
3. Beta环境验证
4. 停止Beta，全量发布

## 五、集群部署

### 1. 集群架构

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Nacos-1  │───│ Nacos-2  │───│ Nacos-3  │
│ Leader   │    │ Follower │    │ Follower │
└──────────┘    └──────────┘    └──────────┘
      │              │              │
      └──────────────┴──────────────┘
                     │
              ┌──────────────┐
              │    MySQL     │
              └──────────────┘
```

### 2. 部署模式

**单机模式**：
- 适合开发测试
- 使用内置Derby数据库

```bash
sh startup.sh -m standalone
```

**集群模式**：
- 适合生产环境
- 使用MySQL数据库
- 至少3个节点

### 3. 集群配置

**cluster.conf**：

```
192.168.1.101:8848
192.168.1.102:8848
192.168.1.103:8848
```

**application.properties**：

```properties
# MySQL配置
spring.datasource.platform=mysql
db.num=1
db.url.0=jdbc:mysql://127.0.0.1:3306/nacos?characterEncoding=utf8&connectTimeout=1000&socketTimeout=3000&autoReconnect=true&useUnicode=true&useSSL=false&serverTimezone=UTC
db.user.0=nacos
db.password.0=nacos

# 集群配置
nacos.core.auth.enabled=true
nacos.core.auth.server.identity.key=nacos
nacos.core.auth.server.identity.value=nacos
```

### 4. 数据库初始化

```sql
-- 执行nacos-mysql.sql脚本
source nacos-mysql.sql
```

### 5. 启动集群

```bash
# 每个节点执行
sh startup.sh
```

## 六、一致性协议

### 1. AP模式（默认）

**Distro协议**：
- 用于临时实例
- 最终一致性
- 高可用优先

**特点**：
- 每个节点负责部分数据
- 节点间数据同步
- 客户端随机选择节点

### 2. CP模式

**Raft协议**：
- 用于永久实例和配置
- 强一致性
- 一致性优先

**特点**：
- Leader选举
- 日志复制
- 过半确认

### 3. 切换模式

```bash
# 切换为CP模式
curl -X PUT 'http://127.0.0.1:8848/nacos/v1/ns/operator/switches?entry=serverMode&value=CP'

# 切换为AP模式
curl -X PUT 'http://127.0.0.1:8848/nacos/v1/ns/operator/switches?entry=serverMode&value=AP'
```

## 七、命名空间与多环境

### 1. 命名空间

**用途**：
- 环境隔离：dev、test、prod
- 租户隔离：不同团队或项目
- 数据隔离：完全独立

**创建命名空间**：
- 控制台创建
- 获取namespace ID

### 2. 多环境配置

```yaml
spring:
  profiles:
    active: dev
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848
        namespace: ${nacos.namespace.${spring.profiles.active}}
      config:
        server-addr: 127.0.0.1:8848
        namespace: ${nacos.namespace.${spring.profiles.active}}

nacos:
  namespace:
    dev: dev-namespace-id
    test: test-namespace-id
    prod: prod-namespace-id
```

### 3. 分组管理

**常见分组**：
- DEFAULT_GROUP：默认分组
- SEATA_GROUP：Seata配置
- SENTINEL_GROUP：Sentinel配置

```yaml
spring:
  cloud:
    nacos:
      config:
        group: ${spring.profiles.active}_GROUP
```

## 八、安全认证

### 1. 开启鉴权

**application.properties**：

```properties
nacos.core.auth.enabled=true
nacos.core.auth.system.type=nacos
nacos.core.auth.plugin.nacos.token.secret.key=SecretKey012345678901234567890123456789012345678901234567890123456789
nacos.core.auth.plugin.nacos.token.expire.seconds=18000
```

### 2. 用户管理

**默认用户**：
- 用户名：nacos
- 密码：nacos

**创建用户**：
- 控制台 → 权限控制 → 用户列表 → 创建用户

### 3. 角色权限

**内置角色**：
- ROLE_ADMIN：管理员
- ROLE_USER：普通用户

**权限类型**：
- 读权限：查看配置和服务
- 写权限：修改配置和服务

### 4. 客户端认证

```yaml
spring:
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848
        username: nacos
        password: nacos
      config:
        server-addr: 127.0.0.1:8848
        username: nacos
        password: nacos
```

## 九、监控与运维

### 1. 监控指标

**服务指标**：
- 服务数量
- 实例数量
- 健康实例数
- 订阅数量

**配置指标**：
- 配置数量
- 监听器数量
- 推送次数
- 推送延迟

**系统指标**：
- CPU使用率
- 内存使用率
- 磁盘使用率
- 网络流量

### 2. 监控接口

```bash
# 集群状态
curl http://127.0.0.1:8848/nacos/v1/ns/operator/metrics

# 服务列表
curl http://127.0.0.1:8848/nacos/v1/ns/catalog/services

# 配置列表
curl http://127.0.0.1:8848/nacos/v1/cs/configs
```

### 3. 日志管理

**日志目录**：
- `logs/nacos.log`：主日志
- `logs/naming-server.log`：服务注册日志
- `logs/config-server.log`：配置管理日志
- `logs/naming-raft.log`：Raft日志

**日志级别配置**：

```properties
logging.level.com.alibaba.nacos=INFO
```

### 4. 备份恢复

**配置备份**：

```bash
# 导出配置
curl -X GET 'http://127.0.0.1:8848/nacos/v1/cs/configs?export=true&group=DEFAULT_GROUP'

# 导入配置
curl -X POST 'http://127.0.0.1:8848/nacos/v1/cs/configs?import=true' -F 'file=@config.zip'
```

**数据库备份**：

```bash
mysqldump -u nacos -p nacos > nacos_backup.sql
```

## 十、Open API

### 1. 服务注册API

```bash
# 注册实例
curl -X POST 'http://127.0.0.1:8848/nacos/v1/ns/instance' \
  -d 'serviceName=user-service&ip=192.168.1.100&port=8080'

# 注销实例
curl -X DELETE 'http://127.0.0.1:8848/nacos/v1/ns/instance' \
  -d 'serviceName=user-service&ip=192.168.1.100&port=8080'

# 查询实例列表
curl -X GET 'http://127.0.0.1:8848/nacos/v1/ns/instance/list?serviceName=user-service'

# 查询实例详情
curl -X GET 'http://127.0.0.1:8848/nacos/v1/ns/instance?serviceName=user-service&ip=192.168.1.100&port=8080'
```

### 2. 配置管理API

```bash
# 发布配置
curl -X POST 'http://127.0.0.1:8848/nacos/v1/cs/configs' \
  -d 'dataId=user-service.yaml&group=DEFAULT_GROUP&content=key: value'

# 获取配置
curl -X GET 'http://127.0.0.1:8848/nacos/v1/cs/configs?dataId=user-service.yaml&group=DEFAULT_GROUP'

# 删除配置
curl -X DELETE 'http://127.0.0.1:8848/nacos/v1/cs/configs?dataId=user-service.yaml&group=DEFAULT_GROUP'

# 监听配置
curl -X POST 'http://127.0.0.1:8848/nacos/v1/cs/configs/listener' \
  -d 'Listening-Configs=user-service.yaml%02DEFAULT_GROUP%02contentMD5%01'
```

## 十一、与其他组件集成

### 1. Spring Cloud Gateway

```yaml
spring:
  cloud:
    gateway:
      discovery:
        locator:
          enabled: true  # 启用服务发现
          lower-case-service-id: true
      routes:
        - id: user-service
          uri: lb://user-service  # 负载均衡
          predicates:
            - Path=/user/**
```

### 2. Sentinel

```yaml
spring:
  cloud:
    sentinel:
      datasource:
        ds1:
          nacos:
            server-addr: 127.0.0.1:8848
            dataId: sentinel-rules
            groupId: SENTINEL_GROUP
            rule-type: flow
```

### 3. Seata

```yaml
seata:
  registry:
    type: nacos
    nacos:
      server-addr: 127.0.0.1:8848
      namespace: seata
      group: SEATA_GROUP
  config:
    type: nacos
    nacos:
      server-addr: 127.0.0.1:8848
      namespace: seata
      group: SEATA_GROUP
```

### 4. Dubbo

```yaml
dubbo:
  registry:
    address: nacos://127.0.0.1:8848
    parameters:
      namespace: dubbo
      group: DEFAULT_GROUP
```

## 十二、常见问题与解决方案

### 1. 服务注册失败

**原因**：
- 网络不通
- 鉴权失败
- 命名空间错误

**解决**：
- 检查网络连接
- 验证用户名密码
- 确认namespace配置

### 2. 配置不生效

**原因**：
- Data ID错误
- Group错误
- 未开启动态刷新

**解决**：
- 检查配置文件名
- 确认分组配置
- 添加@RefreshScope注解

### 3. 服务下线不及时

**原因**：
- 心跳超时时间过长
- 网络延迟

**解决**：
- 调整心跳参数
- 使用永久实例+主动探测

### 4. 集群脑裂

**原因**：
- 网络分区
- 节点故障

**解决**：
- 使用奇数节点
- 配置合理的超时时间
- 监控集群状态

### 5. 配置推送延迟

**原因**：
- 客户端过多
- 网络带宽不足
- 服务器性能瓶颈

**解决**：
- 增加服务器节点
- 优化网络
- 分批推送

## 十三、性能优化

### 1. 服务端优化

```properties
# 线程池配置
nacos.naming.distro.taskDispatchThreadCount=10
nacos.naming.distro.batchSyncKeyCount=1000

# 推送配置
nacos.config.push.maxRetryTime=3
nacos.config.push.timeout=3000

# 缓存配置
nacos.naming.cache.enabled=true
```

### 2. 客户端优化

```yaml
spring:
  cloud:
    nacos:
      discovery:
        naming-load-cache-at-start: true  # 启动时加载缓存
        cache-dir: /tmp/nacos/cache       # 缓存目录
      config:
        refresh-enabled: true
        enable-remote-sync-config: true
```

### 3. 网络优化

- 使用gRPC协议（Nacos 2.0+）
- 启用长连接
- 配置合理的超时时间

### 4. 数据库优化

- 使用主从复制
- 添加索引
- 定期清理历史数据

## 十四、最佳实践

1. **命名规范**：
   - 服务名：小写字母+连字符
   - Data ID：服务名-环境.扩展名
   - Group：业务分组或环境分组

2. **环境隔离**：
   - 使用namespace隔离环境
   - dev、test、prod独立命名空间
   - 不同团队使用不同namespace

3. **配置管理**：
   - 公共配置使用shared-configs
   - 敏感信息加密存储
   - 配置变更记录审计

4. **高可用部署**：
   - 至少3个节点
   - 使用外部MySQL
   - 配置负载均衡

5. **监控告警**：
   - 监控服务健康状态
   - 监控配置推送情况
   - 设置告警阈值

6. **安全加固**：
   - 开启鉴权
   - 修改默认密码
   - 限制访问IP

7. **版本管理**：
   - 使用稳定版本
   - 定期升级
   - 做好备份

8. **容量规划**：
   - 评估服务数量
   - 评估配置数量
   - 预留扩展空间

## 十五、Nacos 2.0新特性

### 1. 长连接模型

- 使用gRPC替代HTTP
- 减少连接数
- 提升性能

### 2. 性能提升

- 支持百万级连接
- 配置推送性能提升10倍
- 内存占用降低50%

### 3. 插件化

- 支持自定义插件
- 鉴权插件
- 加密插件

### 4. 统一配置

- 统一配置模型
- 简化配置管理
- 提升易用性
