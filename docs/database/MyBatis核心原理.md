---
title: MyBatis 核心原理
description: 深入解析 MyBatis 核心原理，包括 JDK 动态代理生成 Mapper、MappedStatement 解析、SqlSource 动态 SQL 拼装、Executor 执行器类型及一级二级缓存机制。
---

# MyBatis 核心原理

## 整体架构

```
你的代码
   ↓
Mapper 接口（UserMapper.java）
   ↓
动态代理（MapperProxy）
   ↓
SqlSession
   ↓
Executor（执行器）
   ↓
StatementHandler → JDBC → 数据库
```

---

## 1. 动态代理生成 Mapper

你写的 `UserMapper` 只是个接口，MyBatis 用 JDK 动态代理生成实现类。调用 `userMapper.selectById(1)` 时，实际走的是 `MapperProxy.invoke()`：

```java
// 伪代码
public Object invoke(Object proxy, Method method, Object[] args) {
    // 根据 method 找到对应的 MappedStatement
    // 交给 SqlSession 执行
    return sqlSession.selectOne(statementId, args);
}
```

---

## 2. MappedStatement

每个 XML 里的 `<select>`、`<insert>` 等标签，启动时都会被解析成一个 `MappedStatement` 对象，存在 `Configuration` 中，key 是 `namespace + id`。

```
com.example.UserMapper.selectById  →  MappedStatement {
    sql: "SELECT * FROM user WHERE id = ?",
    resultMap: ...,
    parameterType: ...
}
```

---

## 3. SQL 动态拼装

`<if>`、`<foreach>`、`<where>` 等动态标签，由 `SqlSource` 在运行时根据参数拼装成最终 SQL：

- `#{}` 替换为 `?`，走预编译，安全
- `${}` 直接字符串拼接，有 SQL 注入风险，慎用

---

## 4. Executor 执行器

三种类型：

| 类型 | 说明 |
|------|------|
| `SimpleExecutor` | 默认，每次都创建新 Statement |
| `ReuseExecutor` | 复用 Statement，减少预编译开销 |
| `BatchExecutor` | 批量执行，适合批量插入/更新 |

---

## 5. 一级 / 二级缓存

- 一级缓存：SqlSession 级别，同一个 Session 内相同查询直接走缓存，默认开启
- 二级缓存：Mapper 级别，跨 Session 共享，需手动开启 `<cache/>`，存在脏读风险，生产慎用

```
查询流程：
二级缓存 → 一级缓存 → 数据库
```

---

## 6. 结果映射

查询结果通过 `ResultSetHandler` 处理，按 `ResultMap` 配置把 `ResultSet` 反射映射成 Java 对象，支持嵌套对象和集合的自动映射。

---

## 核心流程总结

```
1. 启动：解析 XML/注解 → 构建 Configuration + MappedStatement
2. 调用：Mapper 接口方法 → MapperProxy 拦截
3. 执行：SqlSession → Executor → StatementHandler → JDBC
4. 映射：ResultSetHandler 把结果集映射成对象返回
```
