# HTTP 与 HTTPS 细节区别

## 1. 协议层次结构

```
HTTP:   应用层(HTTP) → 传输层(TCP) → 网络层(IP)
HTTPS:  应用层(HTTP) → 安全层(SSL/TLS) → 传输层(TCP) → 网络层(IP)
```

HTTPS 本质就是 HTTP + TLS，并不是一个全新协议。

---

## 2. TLS 握手详细流程（TLS 1.2）

```
Client                              Server
  |                                   |
  |--- ClientHello -----------------> |  // 支持的TLS版本、加密套件、随机数(Random_C)
  |                                   |
  |<-- ServerHello ------------------|  // 选定加密套件、随机数(Random_S)
  |<-- Certificate ------------------|  // 服务端证书(含公钥)
  |<-- ServerHelloDone --------------|
  |                                   |
  |--- ClientKeyExchange -----------> |  // 用公钥加密预主密钥(Pre-Master Secret)
  |--- ChangeCipherSpec ------------> |  // 通知切换加密
  |--- Finished --------------------> |  // 握手摘要(对称加密)
  |                                   |
  |<-- ChangeCipherSpec --------------|
  |<-- Finished ----------------------|
  |                                   |
  |======= 对称加密通信开始 ==========|
```

双方用 `Random_C + Random_S + Pre-Master Secret` 共同生成 `Master Secret`，再派生出会话密钥。

---

## 3. TLS 1.3 的改进

TLS 1.2 需要 2-RTT 握手，TLS 1.3 优化到 1-RTT，甚至支持 0-RTT（会话恢复）：

```
TLS 1.2:  Client → Server → Client → Server  (2次往返才能传数据)
TLS 1.3:  Client → Server → Client           (1次往返)
0-RTT:    Client → Server                    (直接带数据，有重放攻击风险)
```

---

## 4. 证书验证链

```
Root CA（根证书，内置在操作系统/浏览器）
    └── Intermediate CA（中间证书）
            └── End-Entity Certificate（服务器证书）
```

浏览器验证时逐级向上验证签名，直到找到信任的根证书。
证书包含：域名、公钥、有效期、签发机构、数字签名。

---

## 5. 加密体系分工

| 阶段 | 算法 | 作用 |
|------|------|------|
| 身份验证 | RSA / ECDSA | 验证服务端身份，防中间人 |
| 密钥交换 | ECDHE / DHE | 协商会话密钥（前向安全） |
| 数据加密 | AES-GCM / ChaCha20 | 对称加密，加密实际传输数据 |
| 完整性校验 | HMAC-SHA256 | 防数据篡改 |

**前向安全（Forward Secrecy）**：ECDHE 每次握手生成临时密钥对，即使服务器私钥泄露，历史会话也无法被解密。

---

## 6. 常见攻击与防御

| 攻击 | 原理 | 防御 |
|------|------|------|
| 中间人攻击(MITM) | 伪造证书劫持流量 | 证书验证 + HSTS |
| SSL剥离攻击 | 将HTTPS降级为HTTP | HSTS（强制HTTPS） |
| 重放攻击 | 重复发送已捕获的请求 | TLS序列号 + 时间戳 |
| BEAST/POODLE | 利用旧版TLS漏洞 | 禁用TLS 1.0/1.1、SSL 3.0 |

**HSTS**（HTTP Strict Transport Security）：服务端响应头 `Strict-Transport-Security: max-age=31536000`，浏览器在有效期内强制使用 HTTPS。

---

## 7. 性能差异细节

- 握手开销：首次连接多 1-2 个 RTT（TLS 1.3 已优化）
- 计算开销：对称加密 AES 有硬件加速（AES-NI 指令集），现代 CPU 影响极小
- 会话复用：`Session ID` 或 `Session Ticket` 机制，避免重复完整握手
- HTTP/2 只在 HTTPS 下工作，多路复用、头部压缩反而让 HTTPS 比 HTTP/1.1 更快

实际上现代服务器开启 HTTPS 的性能损耗**不到 1%**，安全收益远大于性能代价。
