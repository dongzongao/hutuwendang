# HTTP/2 详解

## 1. HTTP/1.1 的问题

```
队头阻塞：同一连接请求必须串行，前一个没响应后面全等
多连接浪费：浏览器开6-8个TCP连接绕过限制，资源浪费
头部冗余：每次请求都带大量重复 Header（Cookie、UA等）
无优先级：所有请求平等，重要资源不能优先加载
```

---

## 2. HTTP/2 核心特性

### 多路复用

同一个 TCP 连接上并发多个请求，互不阻塞：

```
HTTP/1.1（串行）：
TCP连接: [请求A]──[响应A]──[请求B]──[响应B]

HTTP/2（多路复用）：
TCP连接: [A帧][B帧][C帧][A帧][B帧][C帧]...
          ↑同一连接，多个Stream交错传输
```

### 二进制分帧

HTTP/1.1 是文本协议，HTTP/2 改为二进制帧，解析更高效：

```
HTTP/1.1 文本格式：
GET /index.html HTTP/1.1\r\n
Host: example.com\r\n
...

HTTP/2 二进制帧：
+-----------------------------------------------+
| Length(24) | Type(8) | Flags(8) | Stream ID(31)|
+-----------------------------------------------+
|                  Frame Payload                 |
+-----------------------------------------------+
```

帧类型：HEADERS帧（请求头）、DATA帧（请求体）、SETTINGS、PING、RST_STREAM 等

### 头部压缩（HPACK）

```
第一次请求：发送完整 Header，建立动态表
后续请求：相同 Header 只发索引号，不重复传输

User-Agent: Mozilla/5.0...  → 索引 62（1字节代替几十字节）
Cookie: session=xxx         → 索引 + 差异部分
```

压缩率通常达到 80-90%。

### 服务端推送（Server Push）

服务端主动推送客户端可能需要的资源：

```
客户端请求 index.html
服务端返回 index.html
        + 主动推送 style.css
        + 主动推送 app.js
（客户端还没请求，服务端就推过来了）
```

```nginx
# Nginx 配置 Server Push
location = /index.html {
    http2_push /style.css;
    http2_push /app.js;
}
```

### 请求优先级

可以给 Stream 设置权重和依赖关系，让重要资源优先传输：

```
Stream 1（HTML）权重256  ← 最高优先级
Stream 3（CSS） 权重128
Stream 5（JS）  权重64
Stream 7（图片）权重16   ← 最低优先级
```

---

## 3. HTTP/1.1 vs HTTP/2 对比

| 对比项 | HTTP/1.1 | HTTP/2 |
|--------|----------|--------|
| 协议格式 | 文本 | 二进制 |
| 多路复用 | 不支持 | 支持 |
| 头部压缩 | 不支持 | HPACK 压缩 |
| 服务端推送 | 不支持 | 支持 |
| 请求优先级 | 不支持 | 支持 |
| 连接数 | 每域名6-8个 | 1个连接搞定 |
| 队头阻塞 | 有（应用层） | 解决了应用层，TCP层仍有 |

---

## 4. HTTP/2 仍存在的问题

TCP 层队头阻塞没解决：

```
HTTP/2 的多个 Stream 共享一个 TCP 连接
一旦某个 TCP 包丢失，所有 Stream 都要等重传
丢包率高的网络下，HTTP/2 可能比 HTTP/1.1 更慢
```

这也是 HTTP/3 用 QUIC（基于UDP）替换 TCP 的原因。

---

## 5. HTTP/1.1 vs HTTP/2 vs HTTP/3

```
HTTP/1.1：文本 + TCP
HTTP/2：  二进制 + TCP（解决应用层队头阻塞）
HTTP/3：  二进制 + QUIC/UDP（彻底解决队头阻塞）
```

QUIC 每个 Stream 独立处理丢包重传，一个 Stream 丢包不影响其他 Stream。
