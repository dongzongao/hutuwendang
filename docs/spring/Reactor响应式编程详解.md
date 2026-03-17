# Reactor 响应式编程详解

## 1. 什么是 Reactor

Reactor 是 Spring 官方的响应式编程库，实现了 Reactive Streams 规范，是 WebFlux 的底层核心。

```
Reactive Streams 规范（接口标准）
        ↓
   Reactor 实现
        ↓
  Spring WebFlux 使用
```

---

## 2. 核心接口：Publisher / Subscriber

```java
// Reactive Streams 四个核心接口
Publisher<T>    // 数据发布者
Subscriber<T>   // 数据订阅者
Subscription    // 订阅关系（控制背压）
Processor<T,R>  // 既是发布者又是订阅者
```

Reactor 提供两个核心实现：
- `Mono<T>`：0 或 1 个元素
- `Flux<T>`：0 到 N 个元素

---

## 3. 订阅才执行（冷流）

Reactor 是懒执行的，不订阅什么都不发生：

```java
Flux<Integer> flux = Flux.range(1, 5)
    .map(i -> i * 2)
    .filter(i -> i > 4);

// 上面代码不会执行任何操作，直到 subscribe()
flux.subscribe(
    value -> System.out.println("收到: " + value),  // onNext
    error -> System.err.println("错误: " + error),  // onError
    () -> System.out.println("完成")                // onComplete
);
```

---

## 4. 背压（Backpressure）

消费者告诉生产者"我能处理多少"，防止被压垮：

```java
Flux.range(1, 1000)
    .subscribe(new BaseSubscriber<Integer>() {
        @Override
        protected void hookOnSubscribe(Subscription subscription) {
            request(10); // 先请求10个
        }

        @Override
        protected void hookOnNext(Integer value) {
            System.out.println("处理: " + value);
            if (value % 10 == 0) {
                request(10); // 处理完10个再要10个
            }
        }
    });
```

---

## 5. 常用操作符分类

创建：
```java
Mono.just("hello")
Mono.empty()
Mono.error(new RuntimeException())
Flux.just(1, 2, 3)
Flux.range(1, 10)
Flux.fromList(list)
Flux.interval(Duration.ofSeconds(1)) // 每秒发一个
```

转换：
```java
// map：同步一对一转换
flux.map(i -> i * 2)

// flatMap：异步一对多转换（常用）
flux.flatMap(i -> Mono.just(i).delayElement(Duration.ofMillis(100)))

// concatMap：有序的 flatMap，保证顺序
flux.concatMap(i -> asyncCall(i))

// zip：合并多个流
Mono.zip(mono1, mono2).map(t -> new Result(t.getT1(), t.getT2()))
```

过滤：
```java
flux.filter(i -> i > 5)
flux.take(3)      // 只取前3个
flux.skip(2)      // 跳过前2个
flux.distinct()   // 去重
flux.first()      // 取第一个
```

错误处理：
```java
mono.onErrorReturn(defaultValue)            // 出错返回默认值
mono.onErrorResume(e -> fallbackMono)       // 出错切换到备用流
mono.onErrorMap(e -> new CustomException()) // 转换异常类型
mono.retry(3)                               // 重试3次
mono.timeout(Duration.ofSeconds(5))         // 超时
```

---

## 6. 调度器（线程切换）

```java
Flux.range(1, 5)
    .publishOn(Schedulers.boundedElastic()) // 后续操作切换到弹性线程池
    .map(i -> heavyWork(i))
    .subscribeOn(Schedulers.parallel())     // 订阅时用并行线程池
    .subscribe(System.out::println);
```

| 调度器 | 说明 |
|--------|------|
| `Schedulers.immediate()` | 当前线程 |
| `Schedulers.single()` | 单一复用线程 |
| `Schedulers.parallel()` | CPU 核数的线程池，计算密集 |
| `Schedulers.boundedElastic()` | 弹性线程池，I/O 密集（推荐） |

---

## 7. publishOn vs subscribeOn

```
subscribeOn：影响整条链从订阅开始的线程
publishOn：影响它之后的操作符所在线程

Flux.range(1,5)          ← subscribeOn 影响这里
    .map(...)             ← subscribeOn 影响这里
    .publishOn(elastic)
    .map(...)             ← publishOn 影响这里（切换到 elastic）
    .subscribe()
```

---

## 8. 实际场景：并发调用多个服务

```java
// 串行调用（慢）：总耗时 = A + B + C
Mono<Result> serial = serviceA.call()
    .flatMap(a -> serviceB.call())
    .flatMap(b -> serviceC.call());

// 并行调用（快）：总耗时 = max(A, B, C)
Mono<Result> parallel = Mono.zip(
    serviceA.call(),
    serviceB.call(),
    serviceC.call()
).map(tuple -> combine(tuple.getT1(), tuple.getT2(), tuple.getT3()));
```

---

## 9. 热流 vs 冷流

```java
// 冷流：每个订阅者都从头开始收到所有数据
Flux<Integer> cold = Flux.range(1, 5); // 每次 subscribe 都重新发

// 热流：订阅者只收到订阅后的数据（类似广播）
Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();
Flux<String> hot = sink.asFlux();

hot.subscribe(s -> System.out.println("订阅者1: " + s));
sink.tryEmitNext("A"); // 订阅者1收到
hot.subscribe(s -> System.out.println("订阅者2: " + s));
sink.tryEmitNext("B"); // 订阅者1和2都收到
```
