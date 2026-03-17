# Java Stream 详解

## 1. 什么是 Stream

Stream 是 Java 8 引入的数据流处理 API，对集合进行链式操作，不修改原数据，惰性求值（终止操作触发才执行）。

```
数据源（集合/数组）→ 中间操作（filter/map/...）→ 终止操作（collect/count/...）
```

---

## 2. 创建 Stream

```java
// 从集合
List<String> list = List.of("a", "b", "c");
Stream<String> s1 = list.stream();
Stream<String> s2 = list.parallelStream(); // 并行流

// 从数组
Stream<String> s3 = Arrays.stream(new String[]{"a", "b"});

// 直接创建
Stream<String> s4 = Stream.of("a", "b", "c");
Stream<String> s5 = Stream.empty();

// 无限流
Stream<Integer> s6 = Stream.iterate(0, n -> n + 2);  // 0,2,4,6...
Stream<Double>  s7 = Stream.generate(Math::random);   // 随机数
```

---

## 3. 中间操作（惰性，返回新 Stream）

```java
List<String> names = List.of("Alice", "Bob", "Charlie", "Anna", "David");

// filter：过滤
names.stream().filter(s -> s.startsWith("A")); // Alice, Anna

// map：转换元素
names.stream().map(String::toLowerCase); // alice, bob...

// flatMap：展开嵌套结构
List<List<Integer>> nested = List.of(List.of(1,2), List.of(3,4));
nested.stream().flatMap(Collection::stream); // 1,2,3,4

// distinct：去重
Stream.of(1,2,2,3,3).distinct(); // 1,2,3

// sorted：排序
names.stream().sorted();                                          // 自然排序
names.stream().sorted(Comparator.reverseOrder());                 // 逆序
names.stream().sorted(Comparator.comparingInt(String::length));   // 按长度

// limit / skip
names.stream().limit(3); // 取前3个
names.stream().skip(2);  // 跳过前2个

// peek：调试用，不改变元素
names.stream().peek(s -> System.out.println("处理: " + s)).collect(toList());
```

---

## 4. 终止操作（触发执行）

```java
// collect：收集结果
List<String> result = names.stream()
    .filter(s -> s.length() > 3)
    .collect(Collectors.toList());

// 收集到 Map
Map<Integer, List<String>> byLength = names.stream()
    .collect(Collectors.groupingBy(String::length));
// {3:[Bob], 4:[Anna], 5:[Alice,David], 7:[Charlie]}

// 收集到 Set
Set<String> set = names.stream().collect(Collectors.toSet());

// joining：拼接字符串
String joined = names.stream().collect(Collectors.joining(", ", "[", "]"));
// [Alice, Bob, Charlie, Anna, David]

// count / min / max
long count = names.stream().filter(s -> s.length() > 3).count();
Optional<String> min = names.stream().min(Comparator.comparingInt(String::length));
Optional<String> max = names.stream().max(Comparator.comparingInt(String::length));

// reduce：归约
int sum = Stream.of(1,2,3,4,5).reduce(0, Integer::sum); // 15
Optional<Integer> product = Stream.of(1,2,3,4).reduce((a, b) -> a * b); // 24

// anyMatch / allMatch / noneMatch
boolean anyA    = names.stream().anyMatch(s -> s.startsWith("A"));  // true
boolean allLong = names.stream().allMatch(s -> s.length() > 2);     // true
boolean noneZ   = names.stream().noneMatch(s -> s.startsWith("Z")); // true

// findFirst / findAny
Optional<String> first = names.stream().filter(s -> s.startsWith("A")).findFirst();
```

---

## 5. Collectors 常用方法

```java
// groupingBy：分组
Map<String, List<User>> byDept = users.stream()
    .collect(Collectors.groupingBy(User::getDepartment));

// groupingBy + 下游收集器
Map<String, Long> countByDept = users.stream()
    .collect(Collectors.groupingBy(User::getDepartment, Collectors.counting()));

Map<String, Double> avgSalaryByDept = users.stream()
    .collect(Collectors.groupingBy(User::getDepartment,
        Collectors.averagingDouble(User::getSalary)));

// partitioningBy：按 true/false 分两组
Map<Boolean, List<User>> partition = users.stream()
    .collect(Collectors.partitioningBy(u -> u.getSalary() > 10000));

// toMap
Map<Long, User> userMap = users.stream()
    .collect(Collectors.toMap(User::getId, u -> u));

// toMap 处理 key 冲突
Map<String, User> nameMap = users.stream()
    .collect(Collectors.toMap(User::getName, u -> u, (u1, u2) -> u1));
```

---

## 6. 并行流

```java
// 大数据量时用并行流提速
long sum = LongStream.rangeClosed(1, 1_000_000)
    .parallel()
    .sum();

// 注意：并行流不适合有状态操作和顺序敏感场景
List<Integer> result = Stream.of(1,2,3,4,5)
    .parallel()
    .sorted()           // 并行排序有额外开销
    .collect(toList());
```

---

## 7. 基本类型 Stream（避免装箱开销）

```java
IntStream.range(0, 10)          // 0到9
IntStream.rangeClosed(1, 10)    // 1到10
IntStream.of(1, 2, 3)

// 统计
IntSummaryStatistics stats = IntStream.of(1,2,3,4,5).summaryStatistics();
stats.getMax();     // 5
stats.getMin();     // 1
stats.getSum();     // 15
stats.getAverage(); // 3.0

// 对象流和基本类型流互转
Stream<Integer> boxed   = IntStream.range(1, 5).boxed();
IntStream unboxed = Stream.of(1,2,3).mapToInt(Integer::intValue);
```

---

## 8. 常见实战场景

```java
// 1. 列表转 Map（id → 对象）
Map<Long, User> userMap = users.stream()
    .collect(Collectors.toMap(User::getId, Function.identity()));

// 2. 提取字段列表
List<String> names = users.stream()
    .map(User::getName)
    .collect(Collectors.toList());

// 3. 过滤 + 转换 + 去重
List<String> depts = users.stream()
    .filter(u -> u.getSalary() > 8000)
    .map(User::getDepartment)
    .distinct()
    .sorted()
    .collect(Collectors.toList());

// 4. 求最高薪资的用户
Optional<User> topEarner = users.stream()
    .max(Comparator.comparingDouble(User::getSalary));

// 5. 按部门统计人数
Map<String, Long> deptCount = users.stream()
    .collect(Collectors.groupingBy(User::getDepartment, Collectors.counting()));
```

---

## 9. 注意事项

- Stream 只能消费一次，用完不能复用
- 中间操作是惰性的，没有终止操作不会执行
- 并行流适合 CPU 密集型大数据量，小数据量反而更慢（线程开销）
- 避免在 Stream 中修改外部状态（副作用），容易引发并发问题
