# HTTP 402 Payment Required 详解

## 1. 定义

402 是 HTTP 标准状态码，字面意思是"需要付款"。RFC 7231 中定义它是为将来的数字支付场景预留的，目前**没有官方标准用法**。

---

## 2. 现状

402 在实际开发中基本没有被标准化使用，各家实现五花八门：

- Stripe、Paddle 等支付平台：用 402 表示付款失败或账户余额不足
- SaaS 产品：用 402 表示免费额度用完，需要升级套餐
- API 服务：用 402 表示欠费，接口被限制访问
- 大多数场景：直接用 403（禁止访问）或 429（限流）代替

---

## 3. 和相近状态码的区别

| 状态码 | 含义 | 区别 |
|--------|------|------|
| 401 | Unauthorized | 未认证，需要登录 |
| 402 | Payment Required | 需要付款（未标准化） |
| 403 | Forbidden | 已认证但无权限 |
| 429 | Too Many Requests | 请求频率超限 |

---

## 4. 实际项目中怎么用

如果你在做 SaaS / API 计费系统，402 是个语义上合适的选择：

```java
// Spring Boot 示例
@GetMapping("/api/data")
public ResponseEntity<?> getData(@RequestHeader("Authorization") String token) {
    User user = authService.getUser(token);

    if (!user.hasActiveSubscription()) {
        return ResponseEntity
            .status(402)
            .body(Map.of(
                "code", 402,
                "message", "订阅已过期，请续费后使用",
                "upgradeUrl", "https://example.com/pricing"
            ));
    }

    return ResponseEntity.ok(dataService.getData());
}
```

---

## 5. 业界实践

- GitHub：超出 API 限制返回 403，不用 402
- Stripe：账单付款失败返回 402，是少数真正用 402 的
- OpenAI：额度用完返回 429，不用 402
- Twilio：账户余额不足返回 402

---

## 6. 结论

402 是个"名存实亡"的状态码，RFC 留了坑但没填。实际项目里：

- 纯权限问题用 403
- 限流用 429
- 如果是明确的付费墙场景，用 402 语义最准确，但要在响应体里说清楚原因
