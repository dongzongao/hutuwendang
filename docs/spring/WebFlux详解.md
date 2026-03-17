# WebFlux 详解

## 1. 什么是 WebFlux

Spring WebFlux 是 Spring 5 引入的响应式 Web 框架，基于 Reactor 库，底层使用 Netty 非阻塞 I/O，与传统 Spring MVC（Servlet 阻塞模型）并列存在。

```
Spring MVC:  请求 → Servlet线程阻塞等待 → 响应
Spring WebFlux: 请求 → 事件循环非阻塞 → 响应
```

---

## 2. 核心概念

### Mono 和 Flux

WebFlux 的两个核心数据类型：

| 类型 | 含义 | 类比 |
|------|------|------|
| Mono<T> | 0 或 1 个元素的异步序列 | 单个结果 |
| Flux<T> | 0 到 N 个元素的异步序列 | 列表/流 |

```java
Mono<String> mono = Mono.just("hello");           // 单个值
Mono<String> empty = Mono.empty();                // 空
Flux<Integer> flux = Flux.just(1, 2, 3, 4, 5);   // 多个值
Flux<Integer> range = Flux.range(1, 10);          // 1到10
```

---

## 3. WebFlux vs Spring MVC

| 对比项 | Spring MVC | Spring WebFlux |
|--------|------------|----------------|
| 编程模型 | 同步阻塞 | 异步非阻塞 |
| 底层容器 | Tomcat（Servlet） | Netty / Undertow |
| 线程模型 | 每请求一线程 | 少量线程处理大量请求 |
| 适用场景 | 传统 CRUD、低并发 | 高并发、I/O 密集型 |
| 学习成本 | 低 | 较高（响应式编程思维） |
| 数据库支持 | JPA/JDBC | R2DBC（响应式） |

---

## 4. 基本使用

### Controller 写法（和 MVC 类似）

```java
@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserService userService;

    // 返回单个用户
    @GetMapping("/{id}")
    public Mono<User> getUser(@PathVariable Long id) {
        return userService.findById(id);
    }

    // 返回用户列表
    @GetMapping
    public Flux<User> listUsers() {
        return userService.findAll();
    }

    // 创建用户
    @PostMapping
    public Mono<User> createUser(@RequestBody Mono<User> userMono) {
        return userMono.flatMap(userService::save);
    }
}
```

### Service 层

```java
@Service
public class UserService {

    @Autowired
    private UserRepository repository; // R2DBC Repository

    public Mono<User> findById(Long id) {
        return repository.findById(id)
            .switchIfEmpty(Mono.error(new NotFoundException("用户不存在")));
    }

    public Flux<User> findAll() {
        return repository.findAll();
    }

    public Mono<User> save(User user) {
        return repository.save(user);
    }
}
```

---

## 5. 常用操作符

```java
// map - 同步转换
Mono<String> name = userMono.map(user -> user.getName());

// flatMap - 异步转换（返回值是 Mono/Flux）
Mono<Order> order = userMono.flatMap(user -> orderService.findByUserId(user.getId()));

// filter - 过滤
Flux<User> activeUsers = userFlux.filter(user -> user.isActive());

// zip - 合并两个流
Mono<UserVO> result = Mono.zip(userMono, orderMono)
    .map(tuple -> new UserVO(tuple.getT1(), tuple.getT2()));

// onErrorReturn - 异常时返回默认值
Mono<User> safe = userMono.onErrorReturn(new User("default"));

// onErrorResume - 异常时切换到另一个流
Mono<User> fallback = userMono.onErrorResume(e -> cacheService.getUser(id));

// timeout - 超时处理
Mono<User> withTimeout = userMono.timeout(Duration.ofSeconds(3));

// retry - 重试
Mono<User> withRetry = userMono.retry(3);
```

---

## 6. R2DBC 响应式数据库

WebFlux 不能用传统 JDBC（阻塞），需要用 R2DBC：

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-r2dbc</artifactId>
</dependency>
<dependency>
    <groupId>io.r2dbc</groupId>
    <artifactId>r2dbc-mysql</artifactId>
</dependency>
```

```yaml
# application.yml
spring:
  r2dbc:
    url: r2dbc:mysql://localhost:3306/mydb
    username: root
    password: 123456
```

```java
// Repository 直接继承 ReactiveCrudRepository
public interface UserRepository extends ReactiveCrudRepository<User, Long> {
    Flux<User> findByStatus(String status);
    Mono<User> findByUsername(String username);
}
```

---

## 7. 线程模型对比

```
Spring MVC（Tomcat）：
请求1 → 线程1（阻塞等待DB） ──────────────→ 响应
请求2 → 线程2（阻塞等待DB） ──────────────→ 响应
请求3 → 线程3（阻塞等待DB） ──────────────→ 响应
（线程池耗尽时，新请求排队等待）

Spring WebFlux（Netty）：
请求1 ─┐
请求2 ─┤→ EventLoop线程 → 发起I/O → 继续处理其他请求
请求3 ─┘                  ↓ I/O完成回调 → 响应
（少量线程处理大量并发）
```

---

## 8. 适用场景

适合用 WebFlux：
- 高并发、I/O 密集型（调用多个下游服务、数据库）
- 实时数据推送（SSE、WebSocket）
- API 网关（Spring Cloud Gateway 就是基于 WebFlux）
- 微服务间大量 HTTP 调用

不适合用 WebFlux：
- 简单 CRUD 业务，团队不熟悉响应式编程
- 依赖大量阻塞库（如 MyBatis、传统 JDBC）
- 调试和排查问题要求高的场景（响应式调用栈难读）

---

## 9. WebClient（替代 RestTemplate）

WebFlux 环境下用 WebClient 发起 HTTP 请求：

```java
WebClient client = WebClient.create("http://user-service");

// GET 请求
Mono<User> user = client.get()
    .uri("/users/{id}", 1L)
    .retrieve()
    .bodyToMono(User.class);

// POST 请求
Mono<Order> order = client.post()
    .uri("/orders")
    .bodyValue(orderRequest)
    .retrieve()
    .bodyToMono(Order.class);

// 并发调用两个服务
Mono<UserVO> result = Mono.zip(
    client.get().uri("/users/1").retrieve().bodyToMono(User.class),
    client.get().uri("/orders/user/1").retrieve().bodyToFlux(Order.class).collectList()
).map(tuple -> new UserVO(tuple.getT1(), tuple.getT2()));
```
