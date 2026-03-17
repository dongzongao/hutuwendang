# G1 和 ZGC 垃圾回收器详解

## 一、G1 垃圾回收器（Garbage First）

### 1. G1 概述

G1（Garbage First）是 JDK 7 引入、JDK 9 成为默认垃圾回收器的一款面向服务端应用的垃圾回收器。

**核心特点**：
- 并行与并发：充分利用多核 CPU
- 分代收集：保留分代概念但不再物理隔离q
- 空间整合：整体基于标记-整理，局部基于复制
- 可预测的停顿：可设置期望停顿时间

**设计目标**：
- 在延迟可控的情况下获得尽可能高的吞吐量
- 支持大堆（>4GB）
- 停顿时间可预测且可配置

### 2. G1 内存布局

```
传统分代收集器：
┌─────────────────────────────────────────┐
│      新生代          │      老年代       │
│  Eden │ S0 │ S1     │                   │
└─────────────────────────────────────────┘

G1 收集器：
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│ E │ E │ S │ O │ O │ E │ H │ O │ S │ E │
└───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
 Region 1  Region 2  ...  Region N

Region 类型：
- E (Eden): 新生代 Eden 区
- S (Survivor): 新生代 Survivor 区
- O (Old): 老年代
- H (Humongous): 大对象区（对象大小 >= Region 的 50%）
```

**Region 特点**：
- 堆被划分为多个大小相等的 Region（1-32MB）
- 每个 Region 可以是 Eden、Survivor、Old、Humongous
- Region 的角色可以动态改变
- 逻辑上仍然保留分代概念

### 3. G1 回收过程

```java
/**
 * G1 回收过程
 * 
 * 1. 初始标记（Initial Mark）- STW
 *    - 标记 GC Roots 直接关联的对象
 *    - 修改 TAMS 指针
 *    - 与 Minor GC 同时进行
 * 
 * 2. 并发标记（Concurrent Mark）
 *    - 从 GC Roots 开始遍历对象图
 *    - 与应用程序并发执行
 *    - 可被 Young GC 中断
 * 
 * 3. 最终标记（Final Mark）- STW
 *    - 处理并发标记阶段的变化
 *    - 处理 SATB 记录的引用变化
 * 
 * 4. 筛选回收（Live Data Counting and Evacuation）- STW
 *    - 更新 Region 统计信息
 *    - 对各个 Region 的回收价值排序
 *    - 根据期望停顿时间制定回收计划
 *    - 复制存活对象到新 Region
 */
public class G1GCProcess {
    
    public static void main(String[] args) {
        /**
         * G1 GC 类型：
         * 
         * 1. Young GC（Minor GC）
         *    - Eden 区满时触发
         *    - 回收所有 Eden 和 Survivor 区
         *    - 存活对象复制到 Survivor 或晋升到 Old
         * 
         * 2. Mixed GC
         *    - 回收所有 Young Region + 部分 Old Region
         *    - 根据停顿时间目标选择 Old Region
         * 
         * 3. Full GC
         *    - 回收整个堆
         *    - 单线程执行，停顿时间长
         *    - 应尽量避免
         */
    }
}
```

### 4. G1 核心概念

#### 4.1 Remembered Set (RSet)

```java
/**
 * Remembered Set（记忆集）
 * 
 * 作用：
 * - 记录其他 Region 指向本 Region 的引用
 * - 避免全堆扫描
 * - 每个 Region 都有自己的 RSet
 * 
 * 实现：
 * - 使用 Card Table
 * - 每个 Region 维护一个 RSet
 * - 记录外部引用的 Card
 * 
 * ┌─────────────────────────────────────┐
 * │  Region A                            │
 * │  ┌────────┐                          │
 * │  │ Object │ ──────┐                  │
 * │  └────────┘       │                  │
 * └───────────────────┼──────────────────┘
 *                     │
 *                     ↓
 * ┌─────────────────────────────────────┐
 * │  Region B                            │
 * │  ┌────────┐                          │
 * │  │ Object │ ← 记录在 Region B 的 RSet│
 * │  └────────┘                          │
 * │  RSet: [Region A, Card 5]           │
 * └─────────────────────────────────────┘
 */
public class RememberedSetExample {
    
    /**
     * RSet 维护：
     * 
     * 写屏障（Write Barrier）：
     * - 在引用赋值时触发
     * - 更新 RSet
     * - 有一定性能开销
     */
}
```

#### 4.2 Collection Set (CSet)

```java
/**
 * Collection Set（回收集合）
 * 
 * 作用：
 * - 记录本次 GC 要回收的 Region 集合
 * - 根据停顿时间目标动态选择
 * 
 * 选择策略：
 * 1. 所有 Young Region（必选）
 * 2. 部分 Old Region（根据价值排序）
 * 3. 价值 = 回收收益 / 回收时间
 */
public class CollectionSetExample {
    
    /**
     * CSet 选择过程：
     * 
     * 1. 计算每个 Region 的回收价值
     *    价值 = 垃圾对象大小 / 回收时间
     * 
     * 2. 按价值排序
     * 
     * 3. 根据停顿时间目标选择 Region
     *    - 优先选择价值高的 Region
     *    - 确保不超过停顿时间目标
     */
}
```

#### 4.3 SATB (Snapshot At The Beginning)

```java
/**
 * SATB（开始快照）
 * 
 * 作用：
 * - 解决并发标记时的对象消失问题
 * - 保证并发标记的正确性
 * 
 * 原理：
 * - 在并发标记开始时创建对象图快照
 * - 标记快照中的所有存活对象
 * - 即使对象在标记过程中变为垃圾，也会被标记为存活
 * 
 * 实现：
 * - 写前屏障（Pre-Write Barrier）
 * - 记录引用变化到 SATB 队列
 * - 最终标记阶段处理 SATB 队列
 */
public class SATBExample {
    
    /**
     * SATB 示例：
     * 
     * 初始状态：
     * A -> B -> C
     * 
     * 并发标记过程中：
     * A -> C  (B 被删除)
     * 
     * SATB 处理：
     * - 记录 B 的引用变化
     * - B 仍然被标记为存活（浮动垃圾）
     * - 下次 GC 时回收
     */
}
```

### 5. G1 参数配置

```java
public class G1Parameters {
    
    public static void main(String[] args) {
        /**
         * 基本参数：
         * 
         * -XX:+UseG1GC
         * 启用 G1 收集器
         * 
         * -XX:MaxGCPauseMillis=200
         * 设置期望的最大停顿时间（默认 200ms）
         * 注意：这是目标值，不是硬性保证
         * 
         * -XX:G1HeapRegionSize=n
         * 设置 Region 大小（1-32MB，必须是 2 的幂）
         * 默认：堆大小 / 2048
         * 
         * -XX:InitiatingHeapOccupancyPercent=45
         * 触发并发标记的堆占用阈值（默认 45%）
         * 
         * -XX:G1NewSizePercent=5
         * 新生代最小占比（默认 5%）
         * 
         * -XX:G1MaxNewSizePercent=60
         * 新生代最大占比（默认 60%）
         * 
         * -XX:G1ReservePercent=10
         * 保留空间占比（默认 10%）
         * 
         * -XX:ConcGCThreads=n
         * 并发标记线程数（默认：ParallelGCThreads / 4）
         * 
         * -XX:ParallelGCThreads=n
         * 并行回收线程数（默认：CPU 核心数）
         * 
         * -XX:G1MixedGCCountTarget=8
         * Mixed GC 的目标次数（默认 8）
         * 
         * -XX:G1HeapWastePercent=5
         * 允许的堆浪费百分比（默认 5%）
         */
        
        /**
         * 推荐配置示例：
         * 
         * 小堆（< 4GB）：
         * -Xms2g -Xmx2g
         * -XX:+UseG1GC
         * -XX:MaxGCPauseMillis=100
         * 
         * 中堆（4-16GB）：
         * -Xms8g -Xmx8g
         * -XX:+UseG1GC
         * -XX:MaxGCPauseMillis=200
         * -XX:G1HeapRegionSize=8m
         * 
         * 大堆（> 16GB）：
         * -Xms32g -Xmx32g
         * -XX:+UseG1GC
         * -XX:MaxGCPauseMillis=200
         * -XX:G1HeapRegionSize=16m
         * -XX:InitiatingHeapOccupancyPercent=40
         */
    }
}
```

### 6. G1 调优实践

```java
public class G1Tuning {
    
    /**
     * 调优目标：
     * 1. 减少 Full GC
     * 2. 控制停顿时间
     * 3. 提高吞吐量
     */
    
    /**
     * 问题1：频繁 Full GC
     * 
     * 原因：
     * - 堆空间不足
     * - Mixed GC 回收速度跟不上分配速度
     * - 大对象分配失败
     * 
     * 解决方案：
     * 1. 增加堆大小
     *    -Xms8g -Xmx8g
     * 
     * 2. 降低 IHOP 阈值，提前触发并发标记
     *    -XX:InitiatingHeapOccupancyPercent=40
     * 
     * 3. 增加并发标记线程数
     *    -XX:ConcGCThreads=4
     * 
     * 4. 增加 Mixed GC 次数
     *    -XX:G1MixedGCCountTarget=16
     */
    
    /**
     * 问题2：停顿时间过长
     * 
     * 原因：
     * - MaxGCPauseMillis 设置过小
     * - Region 过大
     * - RSet 更新耗时
     * 
     * 解决方案：
     * 1. 适当增加停顿时间目标
     *    -XX:MaxGCPauseMillis=200
     * 
     * 2. 减小 Region 大小
     *    -XX:G1HeapRegionSize=4m
     * 
     * 3. 减少 RSet 更新开销
     *    -XX:G1RSetUpdatingPauseTimePercent=10
     */
    
    /**
     * 问题3：吞吐量低
     * 
     * 原因：
     * - GC 频率过高
     * - 停顿时间目标过小
     * 
     * 解决方案：
     * 1. 增加堆大小
     * 2. 适当增加停顿时间目标
     * 3. 调整新生代大小
     *    -XX:G1NewSizePercent=10
     *    -XX:G1MaxNewSizePercent=50
     */
}
```

### 7. G1 适用场景

```java
public class G1UseCases {
    
    /**
     * 适合 G1 的场景：
     * 
     * 1. 大堆应用（> 4GB）
     * 2. 需要可预测的停顿时间
     * 3. 对延迟敏感的应用
     * 4. 对象分配速率高
     * 5. 老年代占用变化大
     * 
     * 不适合 G1 的场景：
     * 
     * 1. 小堆应用（< 4GB）
     * 2. 对吞吐量要求极高
     * 3. 实时系统（考虑 ZGC）
     */
}
```

## 二、ZGC 垃圾回收器（Z Garbage Collector）

### 1. ZGC 概述

ZGC 是 JDK 11 引入的一款低延迟垃圾回收器，目标是在任何堆大小下都能保持极低的停顿时间。

**核心特点**：
- 超低延迟：停顿时间不超过 10ms
- 支持大堆：支持 TB 级别的堆
- 并发执行：几乎所有工作都并发执行
- 基于 Region：使用染色指针技术
- 不分代：不区分新生代和老年代

**设计目标**：
- 停顿时间不超过 10ms
- 停顿时间不随堆大小增加而增加
- 支持 8MB - 16TB 的堆

### 2. ZGC 核心技术

#### 2.1 染色指针（Colored Pointers）

```java
/**
 * 染色指针技术
 * 
 * 64 位指针结构：
 * ┌─────────────────────────────────────────────────────────┐
 * │ 63-48 │ 47-46 │ 45 │ 44 │ 43 │ 42 │ 41-0              │
 * │ 未使用 │ 保留  │ M0 │ M1 │ R  │ F  │ 对象地址           │
 * └─────────────────────────────────────────────────────────┘
 * 
 * 标志位说明：
 * - M0 (Marked0): 标记位 0
 * - M1 (Marked1): 标记位 1
 * - R (Remapped): 重映射标记
 * - F (Finalizable): 可终结标记
 * 
 * 优势：
 * 1. 不需要额外的标记位图
 * 2. 支持并发标记和并发移动
 * 3. 可以快速判断对象状态
 * 
 * 限制：
 * - 只支持 64 位系统
 * - 最大支持 4TB 堆（42 位地址）
 */
public class ColoredPointers {
    
    /**
     * 指针状态转换：
     * 
     * 1. 标记阶段：
     *    - 设置 M0 或 M1 位
     *    - 表示对象已被标记
     * 
     * 2. 重定位阶段：
     *    - 设置 R 位
     *    - 表示对象已被移动
     * 
     * 3. 重映射阶段：
     *    - 更新指针指向新地址
     *    - 清除旧标记位
     */
}
```

#### 2.2 读屏障（Load Barrier）

```java
/**
 * 读屏障技术
 * 
 * 作用：
 * - 在读取对象引用时插入屏障代码
 * - 检查对象是否需要重定位
 * - 自动修正指针
 * 
 * 实现：
 * Object obj = field;  // 原始代码
 * 
 * // 插入读屏障后
 * Object obj = field;
 * if (需要重定位(obj)) {
 *     obj = 重定位(obj);
 *     field = obj;  // 自愈
 * }
 */
public class LoadBarrier {
    
    private Object field;
    
    public Object getField() {
        // JVM 自动插入读屏障
        return field;
    }
    
    /**
     * 读屏障特点：
     * 
     * 1. 只在读取引用时触发
     * 2. 自动修正过期指针（自愈）
     * 3. 有一定性能开销（约 4%）
     * 4. 支持并发移动对象
     */
}
```

#### 2.3 多重映射（Multi-Mapping）

```java
/**
 * 多重映射技术
 * 
 * 原理：
 * - 将同一块物理内存映射到多个虚拟地址
 * - 不同的虚拟地址对应不同的标记状态
 * - 避免修改对象头
 * 
 * 虚拟地址空间：
 * ┌─────────────────────────────────────┐
 * │  Marked0 View (M0=1)                │
 * │  0x0000 - 0x0FFF                    │
 * ├─────────────────────────────────────┤
 * │  Marked1 View (M1=1)                │  ──┐
 * │  0x1000 - 0x1FFF                    │    │
 * ├─────────────────────────────────────┤    ├─> 同一块物理内存
 * │  Remapped View (R=1)                │    │
 * │  0x2000 - 0x2FFF                    │  ──┘
 * └─────────────────────────────────────┘
 */
public class MultiMapping {
    
    /**
     * 优势：
     * 1. 不需要修改对象头
     * 2. 支持并发标记和移动
     * 3. 减少内存访问冲突
     */
}
```


### 3. ZGC 回收过程

```java
/**
 * ZGC 回收阶段
 * 
 * 1. 初始标记（Pause Mark Start）- STW
 *    - 标记 GC Roots
 *    - 停顿时间：< 1ms
 * 
 * 2. 并发标记（Concurrent Mark）
 *    - 遍历对象图
 *    - 与应用程序并发执行
 *    - 使用读屏障
 * 
 * 3. 最终标记（Pause Mark End）- STW
 *    - 处理标记阶段的变化
 *    - 停顿时间：< 1ms
 * 
 * 4. 并发预备重分配（Concurrent Prepare for Relocate）
 *    - 选择需要回收的 Region
 *    - 创建重分配集合
 * 
 * 5. 初始重分配（Pause Relocate Start）- STW
 *    - 重定位 GC Roots 引用的对象
 *    - 停顿时间：< 1ms
 * 
 * 6. 并发重分配（Concurrent Relocate）
 *    - 移动对象到新位置
 *    - 与应用程序并发执行
 *    - 使用读屏障自动修正指针
 * 
 * 7. 并发重映射（Concurrent Remap）
 *    - 修正所有指向旧对象的指针
 *    - 与下一次 GC 的并发标记阶段合并
 */
public class ZGCProcess {
    
    /**
     * ZGC 时间线：
     * 
     * ┌─────────────────────────────────────────────────────┐
     * │ 应用线程                                             │
     * │ ████████████████████████████████████████████████    │
     * └─────────────────────────────────────────────────────┘
     * 
     * ┌─────────────────────────────────────────────────────┐
     * │ GC 线程                                              │
     * │ ▓▓░░░░░░░░░░░░░░░░▓▓░░░░░░░░░░░░░░▓▓░░░░░░░░░░░░░░│
     * │ ↑                 ↑                ↑                │
     * │ 初始标记          最终标记         初始重分配        │
     * │ (< 1ms)          (< 1ms)          (< 1ms)          │
     * └─────────────────────────────────────────────────────┘
     * 
     * ▓ = STW 阶段
     * ░ = 并发阶段
     * █ = 应用运行
     */
}
```

### 4. ZGC 参数配置

```java
public class ZGCParameters {
    
    public static void main(String[] args) {
        /**
         * 基本参数：
         * 
         * -XX:+UseZGC
         * 启用 ZGC 收集器（JDK 11+）
         * 
         * -Xms8g -Xmx8g
         * 设置堆大小（建议初始值和最大值相同）
         * 
         * -XX:ConcGCThreads=4
         * 并发 GC 线程数（默认：CPU 核心数 / 8）
         * 
         * -XX:ParallelGCThreads=8
         * 并行 GC 线程数（默认：CPU 核心数）
         * 
         * -XX:ZCollectionInterval=5
         * GC 间隔时间（秒，默认 0 表示自动）
         * 
         * -XX:ZAllocationSpikeTolerance=2
         * 分配峰值容忍度（默认 2）
         * 
         * -XX:ZFragmentationLimit=25
         * 碎片化限制（默认 25%）
         * 
         * -XX:+UnlockExperimentalVMOptions
         * 解锁实验性参数（JDK 11-14 需要）
         */
        
        /**
         * 推荐配置示例：
         * 
         * 小堆（< 8GB）：
         * -Xms4g -Xmx4g
         * -XX:+UseZGC
         * 
         * 中堆（8-64GB）：
         * -Xms16g -Xmx16g
         * -XX:+UseZGC
         * -XX:ConcGCThreads=4
         * 
         * 大堆（> 64GB）：
         * -Xms128g -Xmx128g
         * -XX:+UseZGC
         * -XX:ConcGCThreads=8
         * -XX:ParallelGCThreads=16
         */
        
        /**
         * JDK 版本差异：
         * 
         * JDK 11-14：
         * -XX:+UnlockExperimentalVMOptions -XX:+UseZGC
         * 
         * JDK 15+：
         * -XX:+UseZGC
         * 
         * JDK 17+：
         * -XX:+UseZGC
         * -XX:+ZGenerational  // 分代 ZGC（实验性）
         */
    }
}
```

### 5. ZGC 调优实践

```java
public class ZGCTuning {
    
    /**
     * 调优目标：
     * 1. 保持低延迟
     * 2. 避免分配停滞
     * 3. 减少内存碎片
     */
    
    /**
     * 问题1：分配停滞（Allocation Stall）
     * 
     * 原因：
     * - GC 回收速度跟不上分配速度
     * - 堆空间不足
     * 
     * 解决方案：
     * 1. 增加堆大小
     *    -Xms16g -Xmx16g
     * 
     * 2. 增加并发 GC 线程数
     *    -XX:ConcGCThreads=8
     * 
     * 3. 调整分配峰值容忍度
     *    -XX:ZAllocationSpikeTolerance=5
     * 
     * 4. 提前触发 GC
     *    -XX:ZCollectionInterval=5
     */
    
    /**
     * 问题2：内存碎片
     * 
     * 原因：
     * - 对象大小分布不均
     * - 长时间运行
     * 
     * 解决方案：
     * 1. 降低碎片化限制
     *    -XX:ZFragmentationLimit=15
     * 
     * 2. 定期触发 GC
     *    -XX:ZCollectionInterval=300
     * 
     * 3. 增加堆大小
     */
    
    /**
     * 问题3：CPU 使用率高
     * 
     * 原因：
     * - 并发线程过多
     * - GC 频率过高
     * 
     * 解决方案：
     * 1. 减少并发线程数
     *    -XX:ConcGCThreads=2
     * 
     * 2. 增加堆大小
     * 
     * 3. 优化应用代码，减少对象分配
     */
}
```

### 6. ZGC 监控

```java
public class ZGCMonitoring {
    
    /**
     * GC 日志参数：
     * 
     * -Xlog:gc*:file=gc.log:time,uptime,level,tags
     * 
     * 关键指标：
     * 
     * 1. 停顿时间
     *    - Pause Mark Start
     *    - Pause Mark End
     *    - Pause Relocate Start
     * 
     * 2. 并发时间
     *    - Concurrent Mark
     *    - Concurrent Relocate
     *    - Concurrent Remap
     * 
     * 3. 内存使用
     *    - Used: 已使用内存
     *    - Committed: 已提交内存
     *    - Max: 最大内存
     * 
     * 4. 分配速率
     *    - Allocation Rate
     * 
     * 5. 回收效率
     *    - Reclaimed: 回收的内存
     */
    
    /**
     * 示例日志：
     * 
     * [0.521s][info][gc] GC(0) Garbage Collection (Warmup)
     * [0.521s][info][gc] GC(0) Pause Mark Start 0.234ms
     * [0.621s][info][gc] GC(0) Concurrent Mark 100.123ms
     * [0.621s][info][gc] GC(0) Pause Mark End 0.156ms
     * [0.721s][info][gc] GC(0) Concurrent Relocate 99.876ms
     * [0.721s][info][gc] GC(0) Load: 2.15/2.34/2.56
     * [0.721s][info][gc] GC(0) MMU: 2ms/99.8%, 5ms/99.9%, 10ms/99.9%
     * [0.721s][info][gc] GC(0) Mark: 2 stripe(s), 2 proactive flush(es)
     * [0.721s][info][gc] GC(0) Relocation: 1024M->512M
     * [0.721s][info][gc] GC(0) Garbage Collection (Warmup) 200.123ms
     */
}
```

### 7. ZGC 适用场景

```java
public class ZGCUseCases {
    
    /**
     * 适合 ZGC 的场景：
     * 
     * 1. 对延迟极度敏感的应用
     *    - 在线交易系统
     *    - 实时数据处理
     *    - 游戏服务器
     * 
     * 2. 大堆应用（> 8GB）
     *    - 大数据处理
     *    - 缓存服务
     * 
     * 3. 需要稳定停顿时间
     *    - 不随堆大小变化
     *    - 不随存活对象数量变化
     * 
     * 4. 高吞吐量应用
     *    - 可以接受一定的 CPU 开销
     * 
     * 不适合 ZGC 的场景：
     * 
     * 1. 小堆应用（< 4GB）
     *    - G1 或 Parallel GC 更合适
     * 
     * 2. CPU 资源紧张
     *    - ZGC 需要额外的 CPU 资源
     * 
     * 3. 32 位系统
     *    - ZGC 只支持 64 位系统
     */
}
```

## 三、G1 vs ZGC 对比

### 1. 核心差异

```java
public class G1VsZGC {
    
    /**
     * 对比表：
     * 
     * ┌──────────────┬─────────────────┬─────────────────┐
     * │   特性        │      G1         │      ZGC        │
     * ├──────────────┼─────────────────┼─────────────────┤
     * │ 停顿时间      │ 可预测（ms级）   │ 极低（< 10ms）   │
     * │ 堆大小支持    │ 4GB - 64GB      │ 8MB - 16TB      │
     * │ 分代          │ 是              │ 否（JDK17+可选）│
     * │ 并发程度      │ 部分并发        │ 几乎全并发       │
     * │ CPU 开销      │ 中等            │ 较高            │
     * │ 内存开销      │ 中等            │ 较高            │
     * │ 吞吐量        │ 较高            │ 中等            │
     * │ 成熟度        │ 成熟（JDK9+）   │ 生产可用（JDK15+）│
     * │ 适用场景      │ 通用            │ 低延迟          │
     * └──────────────┴─────────────────┴─────────────────┘
     */
    
    /**
     * 停顿时间对比：
     * 
     * G1:
     * - Young GC: 10-50ms
     * - Mixed GC: 50-200ms
     * - Full GC: 秒级（应避免）
     * 
     * ZGC:
     * - 所有阶段: < 10ms
     * - 不随堆大小变化
     * - 不随存活对象数量变化
     */
    
    /**
     * 吞吐量对比：
     * 
     * G1:
     * - 吞吐量: 90-95%
     * - GC 开销: 5-10%
     * 
     * ZGC:
     * - 吞吐量: 85-90%
     * - GC 开销: 10-15%
     * - 读屏障开销: 约 4%
     */
}
```

### 2. 选择建议

```java
public class GCSelection {
    
    /**
     * 选择 G1 的场景：
     * 
     * 1. 堆大小 4-64GB
     * 2. 停顿时间要求 100-200ms
     * 3. 对吞吐量有一定要求
     * 4. 通用应用场景
     * 5. 需要成熟稳定的 GC
     * 
     * 示例配置：
     * -Xms8g -Xmx8g
     * -XX:+UseG1GC
     * -XX:MaxGCPauseMillis=200
     * -XX:G1HeapRegionSize=8m
     */
    
    /**
     * 选择 ZGC 的场景：
     * 
     * 1. 堆大小 > 8GB
     * 2. 停顿时间要求 < 10ms
     * 3. 对延迟极度敏感
     * 4. 可以接受一定的吞吐量损失
     * 5. 有充足的 CPU 资源
     * 
     * 示例配置：
     * -Xms16g -Xmx16g
     * -XX:+UseZGC
     * -XX:ConcGCThreads=4
     */
    
    /**
     * 迁移建议：
     * 
     * 从 G1 迁移到 ZGC：
     * 1. 评估停顿时间需求
     * 2. 评估 CPU 资源
     * 3. 小流量测试
     * 4. 监控关键指标
     * 5. 逐步灰度上线
     * 
     * 关注指标：
     * - 停顿时间
     * - CPU 使用率
     * - 内存使用
     * - 吞吐量
     * - 响应时间
     */
}
```

### 3. 性能测试对比

```java
public class PerformanceComparison {
    
    /**
     * 测试场景：
     * - 堆大小: 16GB
     * - 对象分配速率: 1GB/s
     * - 存活对象: 8GB
     * - CPU: 16 核
     * 
     * G1 结果：
     * - Young GC: 20-30ms, 频率: 10s
     * - Mixed GC: 100-150ms, 频率: 60s
     * - 平均停顿: 25ms
     * - 最大停顿: 150ms
     * - 吞吐量: 92%
     * 
     * ZGC 结果：
     * - GC 停顿: 1-3ms
     * - GC 频率: 30s
     * - 平均停顿: 2ms
     * - 最大停顿: 5ms
     * - 吞吐量: 88%
     * 
     * 结论：
     * - ZGC 停顿时间更稳定、更低
     * - G1 吞吐量略高
     * - ZGC CPU 使用率高 5-10%
     */
}
```

## 四、最佳实践

### 1. G1 最佳实践

```java
public class G1BestPractices {
    
    /**
     * 1. 堆大小设置
     *    - 初始值和最大值相同
     *    - 避免动态调整开销
     *    -Xms8g -Xmx8g
     * 
     * 2. 停顿时间目标
     *    - 不要设置过小（< 50ms）
     *    - 建议 100-200ms
     *    -XX:MaxGCPauseMillis=200
     * 
     * 3. Region 大小
     *    - 根据对象大小调整
     *    - 避免大对象直接进入老年代
     *    -XX:G1HeapRegionSize=8m
     * 
     * 4. 并发标记阈值
     *    - 根据分配速率调整
     *    - 避免 Full GC
     *    -XX:InitiatingHeapOccupancyPercent=40
     * 
     * 5. 监控和调优
     *    - 开启 GC 日志
     *    - 监控 Full GC 频率
     *    - 监控停顿时间分布
     */
}
```

### 2. ZGC 最佳实践

```java
public class ZGCBestPractices {
    
    /**
     * 1. 堆大小设置
     *    - 预留足够的空间
     *    - 建议实际使用的 2-3 倍
     *    -Xms16g -Xmx16g
     * 
     * 2. 线程数配置
     *    - 根据 CPU 核心数调整
     *    - 并发线程数 = CPU 核心数 / 8
     *    -XX:ConcGCThreads=4
     * 
     * 3. 避免分配停滞
     *    - 监控分配速率
     *    - 及时调整堆大小
     *    - 优化对象分配
     * 
     * 4. 内存碎片管理
     *    - 定期触发 GC
     *    - 调整碎片化限制
     *    -XX:ZFragmentationLimit=20
     * 
     * 5. 监控和调优
     *    - 监控停顿时间
     *    - 监控 CPU 使用率
     *    - 监控内存使用
     *    - 关注分配停滞
     */
}
```

### 3. 通用建议

```java
public class GeneralBestPractices {
    
    /**
     * 1. 选择合适的 GC
     *    - 根据应用特点选择
     *    - 不要盲目追求低延迟
     * 
     * 2. 充分测试
     *    - 压力测试
     *    - 长时间运行测试
     *    - 模拟生产环境
     * 
     * 3. 监控关键指标
     *    - 停顿时间
     *    - 吞吐量
     *    - CPU 使用率
     *    - 内存使用
     * 
     * 4. 优化应用代码
     *    - 减少对象分配
     *    - 对象复用
     *    - 避免内存泄漏
     * 
     * 5. 持续优化
     *    - 定期review GC 日志
     *    - 根据业务变化调整
     *    - 关注 JDK 版本更新
     */
}
```

这份文档详细介绍了 G1 和 ZGC 两款现代垃圾回收器的原理、配置、调优和最佳实践。需要我补充其他内容吗？


## 五、G1 vs ZGC 速度深度对比

### 1. 停顿时间对比（核心指标）

```
测试环境：JDK 17，16核CPU，堆 16GB，对象分配速率 500MB/s

G1 停顿时间分布：
┌─────────────────────────────────────────────────────────┐
│  Young GC    ████████████████░░░░░░░░░░░░░░░░░░░░░░░░  │
│              10ms ~ 50ms（平均 25ms）                    │
│                                                          │
│  Mixed GC    ████████████████████████████░░░░░░░░░░░░  │
│              50ms ~ 200ms（平均 120ms）                  │
│                                                          │
│  Full GC     ████████████████████████████████████████  │
│              1s ~ 10s（应避免）                          │
└─────────────────────────────────────────────────────────┘

ZGC 停顿时间分布：
┌─────────────────────────────────────────────────────────┐
│  Pause Mark Start    █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                      0.5ms ~ 2ms                         │
│                                                          │
│  Pause Mark End      █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                      0.5ms ~ 2ms                         │
│                                                          │
│  Pause Relocate      █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                      0.5ms ~ 2ms                         │
└─────────────────────────────────────────────────────────┘

结论：ZGC 停顿时间比 G1 低 10~100 倍
```

### 2. 吞吐量对比

```
相同压测场景（TPS 10000，堆 16GB）：

┌──────────────────┬──────────────┬──────────────┐
│  指标             │    G1        │    ZGC       │
├──────────────────┼──────────────┼──────────────┤
│ 应用吞吐量        │ 92% ~ 95%    │ 85% ~ 90%    │
│ GC CPU 占用       │ 5% ~ 8%      │ 10% ~ 15%    │
│ 读屏障开销        │ 无           │ ~4%          │
│ 写屏障开销        │ ~1%（RSet）  │ ~1%          │
└──────────────────┴──────────────┴──────────────┘

G1 吞吐量更高，ZGC 为低延迟付出了约 5% 的吞吐量代价
```

### 3. 不同堆大小下的停顿时间

```
G1 停顿时间随堆增大而增加：

堆大小    Young GC    Mixed GC
4GB       10~20ms     50~100ms
8GB       15~30ms     80~150ms
16GB      20~50ms     100~200ms
32GB      30~80ms     150~400ms
64GB      50~150ms    300~800ms

ZGC 停顿时间几乎不随堆增大而变化：

堆大小    停顿时间
4GB       1~3ms
8GB       1~3ms
16GB      1~5ms
32GB      1~5ms
64GB      2~8ms
1TB       2~10ms

关键差异：G1 停顿时间与堆大小正相关，ZGC 基本恒定
```

### 4. 各阶段耗时拆解

```java
/**
 * G1 各阶段耗时（堆 16GB，存活对象 8GB）：
 *
 * Young GC（STW）：
 * - 根扫描：          2ms
 * - 对象复制：        15ms
 * - 引用处理：        3ms
 * - 总计：            ~20ms
 *
 * Mixed GC（STW）：
 * - 初始标记：        1ms
 * - 最终标记：        5ms
 * - 筛选回收：        100ms（复制存活对象）
 * - 总计：            ~106ms
 *
 * ZGC 各阶段耗时（堆 16GB，存活对象 8GB）：
 *
 * Pause Mark Start（STW）：  0.5ms（只扫描 GC Roots）
 * Concurrent Mark：          80ms（并发，不影响应用）
 * Pause Mark End（STW）：    0.5ms
 * Concurrent Relocate：      60ms（并发，不影响应用）
 * Pause Relocate Start（STW）：0.5ms
 *
 * STW 总时间：~1.5ms（ZGC）vs ~106ms（G1 Mixed GC）
 */
```

### 5. 内存占用对比

```
┌──────────────────────┬──────────────┬──────────────┐
│  内存开销             │    G1        │    ZGC       │
├──────────────────────┼──────────────┼──────────────┤
│ RSet 内存开销         │ 堆的 1%~5%   │ 无           │
│ 染色指针额外映射      │ 无           │ 堆的 3倍虚拟内存│
│ 转发表（Forwarding）  │ 无           │ 少量          │
│ 实际物理内存          │ 堆 + 1%~5%   │ 堆 + 少量     │
└──────────────────────┴──────────────┴──────────────┘

注意：ZGC 的多重映射消耗的是虚拟地址空间，不是物理内存
```

### 6. 启动预热速度

```
应用启动阶段（前 30 秒）：

G1：
- 启动即可正常工作
- 无需预热
- 初期 GC 停顿可能较长（JIT 未充分优化）

ZGC：
- 启动即可正常工作
- 读屏障在 JIT 充分优化前有额外开销
- 预热后性能更稳定

结论：启动速度两者相当，ZGC 在预热后延迟更稳定
```

### 7. 实际业务场景对比

```
场景1：电商秒杀（高并发，低延迟敏感）
┌─────────────────┬──────────────────┬──────────────────┐
│                 │       G1         │      ZGC         │
├─────────────────┼──────────────────┼──────────────────┤
│ 平均响应时间     │ 5ms              │ 5ms              │
│ P99 响应时间     │ 200ms（GC停顿）  │ 15ms             │
│ P999 响应时间    │ 500ms            │ 20ms             │
│ 推荐             │ ✗                │ ✓                │
└─────────────────┴──────────────────┴──────────────────┘

场景2：批量数据处理（高吞吐，延迟不敏感）
┌─────────────────┬──────────────────┬──────────────────┐
│                 │       G1         │      ZGC         │
├─────────────────┼──────────────────┼──────────────────┤
│ 处理吞吐量       │ 100万条/s        │ 92万条/s         │
│ CPU 使用率       │ 75%              │ 85%              │
│ 总耗时           │ 1000s            │ 1087s            │
│ 推荐             │ ✓                │ ✗                │
└─────────────────┴──────────────────┴──────────────────┘

场景3：大缓存服务（堆 64GB，读多写少）
┌─────────────────┬──────────────────┬──────────────────┐
│                 │       G1         │      ZGC         │
├─────────────────┼──────────────────┼──────────────────┤
│ GC 停顿          │ 300~800ms        │ 2~8ms            │
│ 缓存命中率       │ 相同             │ 相同             │
│ 推荐             │ ✗                │ ✓                │
└─────────────────┴──────────────────┴──────────────────┘
```

### 8. 一句话总结

```
G1：停顿可预测，吞吐量高，适合通用场景（堆 4~32GB）
ZGC：停顿极低且恒定，适合延迟敏感 / 超大堆场景（堆 > 8GB）

选择口诀：
- P99 延迟 < 50ms 要求  → ZGC
- 吞吐量优先            → G1
- 堆 > 32GB             → ZGC
- 堆 < 8GB              → G1 或 Parallel GC
```
