# Nginx 与 Spring Cloud Gateway 对比详解

## 1. 定位对比

| 对比项 | Nginx | Spring Cloud Gateway |
|--------|-------|----------------------|
| 本质 | 高性能反向代理/Web服务器 | 微服务 API 网关 |
| 语言 | C | Java（Spring 生态） |
| 性能 | 极高，异步非阻塞 | 高，基于 Reactor/WebFlux |
| 动态路由 | 需重载配置 | 支持，可动态刷新 |
| 服务发现 | 不支持（需手动配置） | 集成 Nacos/Eureka |
| 限流熔断 | 基础限流（limit_req） | 集成 Sentinel/Resilience4j |
| 认证鉴权 | 基础 auth | 可写 Filter 灵活处理 |
| 适用层 | 流量入口层 | 微服务治理层 |

---

## 2. 架构位置

```
用户请求
   ↓
 Nginx（流量入口，SSL卸载，静态资源，负载均衡）
   ↓
Spring Cloud Gateway（路由转发，鉴权，限流，熔断）
   ↓
微服务集群（User服务 / Order服务 / Pay服务）
```

两者不是替代关系，生产环境通常一起用。

---

## 3. Nginx 核心配置示例

```nginx
# 反向代理 + 负载均衡
upstream gateway_cluster {
    server 192.168.1.10:8080 weight=2;
    server 192.168.1.11:8080 weight=1;
}

server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://gateway_cluster;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 4. Spring Cloud Gateway 核心配置

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: order-service
          uri: lb://order-service        # lb:// 表示从注册中心负载均衡
          predicates:
            - Path=/api/order/**
          filters:
            - StripPrefix=1              # 去掉路径前缀
            - name: RequestRateLimiter   # 限流
              args:
                redis-rate-limiter.replenishRate: 100
                redis-rate-limiter.burstCapacity: 200
```

---

## 5. 自定义 Filter（鉴权示例）

```java
@Component
public class AuthFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String token = exchange.getRequest().getHeaders().getFirst("Authorization");

        if (token == null || !jwtUtil.validate(token)) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        return chain.filter(exchange); // 放行
    }

    @Override
    public int getOrder() { return -100; } // 数字越小优先级越高
}
```

---

## 6. 各自擅长的事

Nginx 做：
- SSL 证书卸载
- 静态资源服务
- 高并发流量接入
- 基础负载均衡

Gateway 做：
- 动态路由（结合注册中心）
- JWT 鉴权、权限校验
- 限流、熔断、降级
- 请求/响应日志、链路追踪
- 灰度发布、A/B 测试
