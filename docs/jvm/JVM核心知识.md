# JVM 核心知识

## 一、JVM 概述

### 1. 什么是 JVM

JVM（Java Virtual Machine，Java 虚拟机）是 Java 程序的运行环境，负责将字节码转换为机器码并执行。

**核心特性**：
- **跨平台性**：一次编译，到处运行（Write Once, Run Anywhere）
- **自动内存管理**：垃圾回收机制
- **安全性**：字节码验证、安全管理器
- **高性能**：JIT 编译器优化

### 2. JVM 架构

```
┌─────────────────────────────────────────────────────────────┐
│                        JVM 架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              类加载子系统                           │    │
│  │  Bootstrap ClassLoader                             │    │
│  │  Extension ClassLoader                             │    │
│  │  Application ClassLoader                           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              运行时数据区                           │    │
│  │  ┌──────────┬──────────┬──────────┬──────────┐    │    │
│  │  │ 方法区    │   堆      │  虚拟机栈 │  本地方法栈│    │    │
│  │  │(Method   │  (Heap)  │  (VM     │  (Native  │    │    │
│  │  │ Area)    │          │  Stack)  │  Stack)   │    │    │
│  │  └──────────┴──────────┴──────────┴──────────┘    │    │
│  │  ┌──────────────────────────────────────────┐    │    │
│  │  │         程序计数器 (PC Register)          │    │    │
│  │  └──────────────────────────────────────────┘    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              执行引擎                               │    │
│  │  解释器 | JIT编译器 | 垃圾回收器                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              本地方法接口 (JNI)                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. JVM、JRE、JDK 的关系

```
┌─────────────────────────────────────┐
│              JDK                     │
│  ┌───────────────────────────────┐  │
│  │           JRE                  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │        JVM              │  │  │
│  │  │  类加载器               │  │  │
│  │  │  执行引擎               │  │  │
│  │  │  运行时数据区           │  │  │
│  │  └─────────────────────────┘  │  │
│  │  Java 核心类库               │  │
│  └───────────────────────────────┘  │
│  开发工具 (javac, jar, javadoc)    │
└─────────────────────────────────────┘
```

## 二、运行时数据区

### 1. 程序计数器（PC Register）

```java
/**
 * 程序计数器
 * 
 * 特点：
 * - 线程私有
 * - 记录当前线程执行的字节码行号
 * - 唯一不会发生 OOM 的区域
 * - 执行 Native 方法时为空
 */
public class PCRegisterExample {
    
    public static void main(String[] args) {
        int a = 1;
        int b = 2;
        int c = a + b;
        
        /**
         * 字节码：
         * 0: iconst_1      // PC = 0
         * 1: istore_1      // PC = 1
         * 2: iconst_2      // PC = 2
         * 3: istore_2      // PC = 3
         * 4: iload_1       // PC = 4
         * 5: iload_2       // PC = 5
         * 6: iadd          // PC = 6
         * 7: istore_3      // PC = 7
         */
    }
}
```

### 2. Java 虚拟机栈（VM Stack）

```java
/**
 * Java 虚拟机栈
 * 
 * 特点：
 * - 线程私有
 * - 生命周期与线程相同
 * - 存储栈帧（Stack Frame）
 * - 默认大小：1MB（-Xss 设置）
 * 
 * 栈帧结构：
 * - 局部变量表
 * - 操作数栈
 * - 动态链接
 * - 方法返回地址
 */
public class VMStackExample {
    
    public static void main(String[] args) {
        method1();
    }
    
    public static void method1() {
        int a = 1;
        method2();
    }
    
    public static void method2() {
        int b = 2;
        method3();
    }
    
    public static void method3() {
        int c = 3;
    }
    
    /**
     * 栈帧结构：
     * 
     * ┌─────────────────┐
     * │   method3()     │ ← 栈顶
     * ├─────────────────┤
     * │   method2()     │
     * ├─────────────────┤
     * │   method1()     │
     * ├─────────────────┤
     * │   main()        │
     * └─────────────────┘
     */
}
```

#### 栈帧详解

```java
public class StackFrameDetail {
    
    private int instanceVar = 10;
    
    public int calculate(int a, int b) {
        int c = a + b;
        int d = c * 2;
        return d + instanceVar;
    }
    
    /**
     * 栈帧结构：
     * 
     * ┌──────────────────────────────────┐
     * │         局部变量表                 │
     * │  0: this                          │
     * │  1: a (参数)                      │
     * │  2: b (参数)                      │
     * │  3: c (局部变量)                  │
     * │  4: d (局部变量)                  │
     * ├──────────────────────────────────┤
     * │         操作数栈                   │
     * │  (用于计算的临时存储)              │
     * ├──────────────────────────────────┤
     * │         动态链接                   │
     * │  (指向运行时常量池的引用)          │
     * ├──────────────────────────────────┤
     * │         方法返回地址               │
     * │  (方法正常退出或异常退出的地址)    │
     * └──────────────────────────────────┘
     */
}
```

#### 栈异常

```java
public class StackException {
    
    /**
     * StackOverflowError：
     * - 栈深度超过限制
     * - 常见原因：递归调用过深
     */
    public static void stackOverflow() {
        stackOverflow();  // 无限递归
    }
    
    /**
     * OutOfMemoryError：
     * - 无法分配新的栈帧
     * - 常见原因：创建过多线程
     */
    public static void outOfMemory() {
        while (true) {
            new Thread(() -> {
                try {
                    Thread.sleep(Long.MAX_VALUE);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }
}
```

### 3. 本地方法栈（Native Method Stack）

```java
/**
 * 本地方法栈
 * 
 * 特点：
 * - 线程私有
 * - 为 Native 方法服务
 * - HotSpot 虚拟机将本地方法栈和虚拟机栈合二为一
 */
public class NativeMethodStackExample {
    
    public static void main(String[] args) {
        // 调用 Native 方法
        System.currentTimeMillis();  // Native 方法
        Thread.currentThread();      // Native 方法
        Object obj = new Object();
        obj.hashCode();              // Native 方法
    }
}
```

### 4. 堆（Heap）

```java
/**
 * 堆
 * 
 * 特点：
 * - 线程共享
 * - 存储对象实例和数组
 * - 垃圾回收的主要区域
 * - 可以物理上不连续
 * 
 * 堆结构（分代）：
 * ┌─────────────────────────────────────────┐
 * │                  堆                      │
 * ├──────────────────────┬──────────────────┤
 * │      新生代           │     老年代        │
 * │   (Young Gen)        │   (Old Gen)      │
 * ├──────┬───────┬───────┤                  │
 * │ Eden │ S0    │ S1    │                  │
 * │ 8    │ 1     │ 1     │       2          │
 * └──────┴───────┴───────┴──────────────────┘
 * 
 * 默认比例：
 * - 新生代:老年代 = 1:2
 * - Eden:Survivor0:Survivor1 = 8:1:1
 */
public class HeapExample {
    
    public static void main(String[] args) {
        // 对象分配在堆上
        Object obj = new Object();
        int[] array = new int[1000];
        String str = new String("Hello");
        
        /**
         * 堆参数设置：
         * -Xms: 初始堆大小
         * -Xmx: 最大堆大小
         * -Xmn: 新生代大小
         * -XX:SurvivorRatio: Eden 与 Survivor 比例
         * -XX:NewRatio: 新生代与老年代比例
         * 
         * 示例：
         * -Xms512m -Xmx2g -Xmn256m
         */
    }
}
```

#### 对象分配流程

```java
public class ObjectAllocation {
    
    /**
     * 对象分配流程：
     * 
     * 1. 新对象优先在 Eden 区分配
     * 2. Eden 区满时触发 Minor GC
     * 3. 存活对象移到 Survivor 区
     * 4. Survivor 区对象年龄+1
     * 5. 年龄达到阈值（默认15）晋升到老年代
     * 6. 大对象直接进入老年代
     * 7. 老年代满时触发 Full GC
     * 
     * ┌─────────────────────────────────────┐
     * │  1. 对象在 Eden 区分配               │
     * │     ┌──────────────────┐            │
     * │     │ Eden (新对象)     │            │
     * │     └──────────────────┘            │
     * └─────────────────────────────────────┘
     *              ↓ Minor GC
     * ┌─────────────────────────────────────┐
     * │  2. 存活对象移到 Survivor            │
     * │     ┌──────┐  ┌──────┐              │
     * │     │ S0   │  │ S1   │              │
     * │     │(age1)│  │      │              │
     * │     └──────┘  └──────┘              │
     * └─────────────────────────────────────┘
     *              ↓ 多次 GC
     * ┌─────────────────────────────────────┐
     * │  3. 年龄达到阈值晋升到老年代         │
     * │     ┌──────────────────┐            │
     * │     │ Old Gen (age15)  │            │
     * │     └──────────────────┘            │
     * └─────────────────────────────────────┘
     */
    
    public static void main(String[] args) {
        // 小对象：Eden 区分配
        byte[] small = new byte[1024];
        
        // 大对象：直接进入老年代
        // -XX:PretenureSizeThreshold=3145728 (3MB)
        byte[] large = new byte[4 * 1024 * 1024];
    }
}
```

### 5. 方法区（Method Area）

```java
/**
 * 方法区（元空间 Metaspace，JDK8+）
 * 
 * 特点：
 * - 线程共享
 * - 存储类信息、常量、静态变量、JIT 编译后的代码
 * - JDK7：永久代（PermGen）
 * - JDK8+：元空间（Metaspace），使用本地内存
 * 
 * 存储内容：
 * - 类的元数据（类名、方法、字段等）
 * - 运行时常量池
 * - 静态变量
 * - 即时编译器编译后的代码
 */
public class MethodAreaExample {
    
    // 静态变量存储在方法区
    private static int staticVar = 100;
    
    // 常量存储在方法区
    private static final String CONSTANT = "Hello";
    
    public static void main(String[] args) {
        /**
         * 方法区参数设置：
         * 
         * JDK7 及之前（永久代）：
         * -XX:PermSize=64m
         * -XX:MaxPermSize=256m
         * 
         * JDK8+（元空间）：
         * -XX:MetaspaceSize=64m
         * -XX:MaxMetaspaceSize=256m
         * 
         * 元空间优势：
         * 1. 使用本地内存，不受 JVM 堆大小限制
         * 2. 减少 Full GC
         * 3. 动态调整大小
         */
    }
}
```

#### 运行时常量池

```java
public class RuntimeConstantPool {
    
    public static void main(String[] args) {
        /**
         * 运行时常量池：
         * - 存储编译期生成的字面量和符号引用
         * - 类加载后存放在方法区
         * - 具有动态性（String.intern()）
         */
        
        // 字符串常量池
        String s1 = "hello";           // 常量池
        String s2 = "hello";           // 常量池（复用）
        String s3 = new String("hello"); // 堆
        String s4 = s3.intern();       // 常量池
        
        System.out.println(s1 == s2);  // true
        System.out.println(s1 == s3);  // false
        System.out.println(s1 == s4);  // true
        
        /**
         * 字符串常量池位置：
         * JDK6: 方法区（永久代）
         * JDK7+: 堆
         */
    }
}
```

### 6. 直接内存（Direct Memory）

```java
/**
 * 直接内存
 * 
 * 特点：
 * - 不属于 JVM 运行时数据区
 * - 使用本地内存
 * - 通过 DirectByteBuffer 访问
 * - 避免 Java 堆和 Native 堆之间的数据复制
 */
public class DirectMemoryExample {
    
    public static void main(String[] args) {
        // 分配直接内存
        ByteBuffer directBuffer = ByteBuffer.allocateDirect(1024 * 1024);
        
        // 普通堆内存
        ByteBuffer heapBuffer = ByteBuffer.allocate(1024 * 1024);
        
        /**
         * 直接内存参数：
         * -XX:MaxDirectMemorySize=512m
         * 
         * 优势：
         * - 减少数据复制
         * - 提高 I/O 性能
         * 
         * 劣势：
         * - 分配和回收成本高
         * - 不受 JVM 管理
         */
    }
}
```

## 三、对象创建与内存布局

### 1. 对象创建过程

```java
public class ObjectCreation {
    
    /**
     * 对象创建步骤：
     * 
     * 1. 类加载检查
     *    - 检查类是否已加载
     *    - 未加载则先加载类
     * 
     * 2. 分配内存
     *    - 指针碰撞（Bump the Pointer）：内存规整
     *    - 空闲列表（Free List）：内存不规整
     * 
     * 3. 初始化零值
     *    - 将分配的内存初始化为零值
     *    - 保证对象字段可以不赋初值就使用
     * 
     * 4. 设置对象头
     *    - 设置对象的元数据信息
     *    - 哈希码、GC 年龄、锁状态等
     * 
     * 5. 执行 <init> 方法
     *    - 执行构造方法
     *    - 初始化对象字段
     */
    
    public static void main(String[] args) {
        // new 关键字创建对象
        User user = new User("张三", 25);
        
        /**
         * 字节码：
         * 0: new           #2  // class User
         * 3: dup
         * 4: ldc           #3  // String 张三
         * 6: bipush        25
         * 8: invokespecial #4  // Method User."<init>"
         * 11: astore_1
         */
    }
}

class User {
    private String name;
    private int age;
    
    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }
}
```

### 2. 对象内存布局

```java
/**
 * 对象内存布局
 * 
 * ┌─────────────────────────────────────┐
 * │           对象头 (Header)            │
 * │  ┌───────────────────────────────┐  │
 * │  │  Mark Word (8字节)             │  │
 * │  │  - 哈希码                      │  │
 * │  │  - GC 年龄                     │  │
 * │  │  - 锁状态                      │  │
 * │  └───────────────────────────────┘  │
 * │  ┌───────────────────────────────┐  │
 * │  │  类型指针 (4/8字节)            │  │
 * │  │  - 指向类元数据                │  │
 * │  └───────────────────────────────┘  │
 * │  ┌───────────────────────────────┐  │
 * │  │  数组长度 (4字节，仅数组)      │  │
 * │  └───────────────────────────────┘  │
 * ├─────────────────────────────────────┤
 * │         实例数据 (Instance Data)     │
 * │  - 对象的字段数据                    │
 * │  - 按字段类型分组                    │
 * ├─────────────────────────────────────┤
 * │         对齐填充 (Padding)           │
 * │  - 保证对象大小是 8 字节的倍数       │
 * └─────────────────────────────────────┘
 */
public class ObjectLayout {
    
    private boolean flag;    // 1 字节
    private byte b;          // 1 字节
    private short s;         // 2 字节
    private int i;           // 4 字节
    private long l;          // 8 字节
    private float f;         // 4 字节
    private double d;        // 8 字节
    private Object obj;      // 4/8 字节（引用）
    
    /**
     * 对象大小计算：
     * 
     * 对象头：
     * - Mark Word: 8 字节
     * - 类型指针: 4 字节（开启压缩指针）
     * 
     * 实例数据：
     * - boolean: 1 字节
     * - byte: 1 字节
     * - short: 2 字节
     * - int: 4 字节
     * - long: 8 字节
     * - float: 4 字节
     * - double: 8 字节
     * - Object: 4 字节（开启压缩指针）
     * 
     * 对齐填充：
     * - 补齐到 8 字节的倍数
     * 
     * 总大小 = 对象头 + 实例数据 + 对齐填充
     */
}
```

### 3. 对象访问定位

```java
/**
 * 对象访问方式
 * 
 * 方式1：句柄访问
 * ┌──────────┐      ┌──────────────┐
 * │  栈      │      │  堆（句柄池） │
 * │  ┌────┐  │      │  ┌────────┐  │
 * │  │ref │──┼─────>│  │ 对象指针│──┼──> 对象实例
 * │  └────┘  │      │  │ 类指针  │──┼──> 类元数据
 * └──────────┘      │  └────────┘  │
 *                   └──────────────┘
 * 
 * 方式2：直接指针（HotSpot 使用）
 * ┌──────────┐      ┌──────────────┐
 * │  栈      │      │  堆          │
 * │  ┌────┐  │      │  ┌────────┐  │
 * │  │ref │──┼─────>│  │ 对象头  │  │
 * │  └────┘  │      │  │ 实例数据│  │
 * └──────────┘      │  └────────┘  │
 *                   └──────────────┘
 *                          │
 *                          └──> 类元数据
 */
public class ObjectAccess {
    
    public static void main(String[] args) {
        User user = new User();
        
        /**
         * 句柄访问：
         * 优点：对象移动时只需修改句柄，引用不变
         * 缺点：多一次指针定位
         * 
         * 直接指针：
         * 优点：访问速度快
         * 缺点：对象移动时需要修改所有引用
         * 
         * HotSpot 使用直接指针方式
         */
    }
}
```

