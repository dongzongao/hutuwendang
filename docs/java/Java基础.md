# Java基础核心考点

## 一、Java基础语法

### 1. 数据类型

**基本数据类型（8种）**：

| 类型 | 字节 | 位数 | 默认值 | 取值范围 |
|------|------|------|--------|----------|
| byte | 1 | 8 | 0 | -128 ~ 127 |
| short | 2 | 16 | 0 | -32768 ~ 32767 |
| int | 4 | 32 | 0 | -2^31 ~ 2^31-1 |
| long | 8 | 64 | 0L | -2^63 ~ 2^63-1 |
| float | 4 | 32 | 0.0f | 单精度浮点数 |
| double | 8 | 64 | 0.0d | 双精度浮点数 |
| char | 2 | 16 | '\u0000' | 0 ~ 65535 |
| boolean | 1 | - | false | true/false |

**包装类型**：
```java
Byte, Short, Integer, Long, Float, Double, Character, Boolean
```

**自动装箱/拆箱**：
```java
// 自动装箱
Integer i = 10;  // 等价于 Integer.valueOf(10)

// 自动拆箱
int n = i;  // 等价于 i.intValue()
```

**缓存机制**：
```java
// Integer 缓存 -128 ~ 127
Integer a = 127;
Integer b = 127;
System.out.println(a == b);  // true

Integer c = 128;
Integer d = 128;
System.out.println(c == d);  // false

// Long 缓存 -128 ~ 127
// Character 缓存 0 ~ 127
// Boolean 缓存 TRUE 和 FALSE
```

### 2. String 类

**不可变性**：
```java
public final class String {
    private final char[] value;  // Java 8
    private final byte[] value;  // Java 9+
}
```

**String vs StringBuilder vs StringBuffer**：

| 特性 | String | StringBuilder | StringBuffer |
|------|--------|---------------|--------------|
| 可变性 | 不可变 | 可变 | 可变 |
| 线程安全 | 安全 | 不安全 | 安全（synchronized） |
| 性能 | 慢 | 快 | 较快 |
| 使用场景 | 少量字符串操作 | 单线程大量操作 | 多线程大量操作 |

**字符串常量池**：
```java
String s1 = "hello";
String s2 = "hello";
System.out.println(s1 == s2);  // true，指向常量池同一对象

String s3 = new String("hello");
System.out.println(s1 == s3);  // false，s3在堆中

String s4 = s3.intern();
System.out.println(s1 == s4);  // true，intern()返回常量池引用
```

**常用方法**：
```java
// 长度
int length()

// 字符获取
char charAt(int index)

// 子串
String substring(int beginIndex, int endIndex)

// 查找
int indexOf(String str)
boolean contains(CharSequence s)
boolean startsWith(String prefix)
boolean endsWith(String suffix)

// 替换
String replace(char oldChar, char newChar)
String replaceAll(String regex, String replacement)

// 分割
String[] split(String regex)

// 大小写转换
String toLowerCase()
String toUpperCase()

// 去空格
String trim()

// 比较
boolean equals(Object obj)
boolean equalsIgnoreCase(String str)
int compareTo(String str)
```

### 3. 运算符

**位运算符**：
```java
&   // 按位与
|   // 按位或
^   // 按位异或
~   // 按位取反
<<  // 左移
>>  // 右移（带符号）
>>> // 无符号右移
```

**三元运算符**：
```java
result = condition ? value1 : value2;
```

**instanceof**：
```java
if (obj instanceof String) {
    String str = (String) obj;
}
```


## 二、面向对象

### 1. 三大特性

**封装**：
```java
public class Person {
    private String name;  // 私有属性
    private int age;
    
    // 公共方法访问
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
}
```

**继承**：
```java
public class Animal {
    protected String name;
    
    public void eat() {
        System.out.println("Animal eating");
    }
}

public class Dog extends Animal {
    @Override
    public void eat() {
        System.out.println("Dog eating");
    }
    
    public void bark() {
        System.out.println("Dog barking");
    }
}
```

**多态**：
```java
Animal animal = new Dog();  // 向上转型
animal.eat();  // 调用Dog的eat方法（动态绑定）

// 向下转型需要强制类型转换
if (animal instanceof Dog) {
    Dog dog = (Dog) animal;
    dog.bark();
}
```


### 2. 访问修饰符

| 修饰符 | 同类 | 同包 | 子类 | 其他 |
|--------|------|------|------|------|
| private | ✓ | ✗ | ✗ | ✗ |
| default | ✓ | ✓ | ✗ | ✗ |
| protected | ✓ | ✓ | ✓ | ✗ |
| public | ✓ | ✓ | ✓ | ✓ |

### 3. 关键字

**static**：
```java
public class Counter {
    private static int count = 0;  // 静态变量（类变量）
    
    public static void increment() {  // 静态方法
        count++;
    }
    
    static {  // 静态代码块
        System.out.println("Static block");
    }
}

// 静态内部类
public class Outer {
    static class Inner {
        // 可以访问外部类的静态成员
    }
}
```

**final**：
```java
// final 类：不能被继承
public final class FinalClass {}

// final 方法：不能被重写
public final void finalMethod() {}

// final 变量：常量
public static final int MAX_VALUE = 100;

// final 引用：引用不可变，但对象内容可变
final List<String> list = new ArrayList<>();
list.add("item");  // 可以
// list = new ArrayList<>();  // 编译错误
```


**abstract**：
```java
// 抽象类
public abstract class Shape {
    protected String color;
    
    // 抽象方法
    public abstract double getArea();
    
    // 普通方法
    public void setColor(String color) {
        this.color = color;
    }
}

public class Circle extends Shape {
    private double radius;
    
    @Override
    public double getArea() {
        return Math.PI * radius * radius;
    }
}
```

**interface**：
```java
// 接口
public interface Flyable {
    // 常量（默认 public static final）
    int MAX_SPEED = 1000;
    
    // 抽象方法（默认 public abstract）
    void fly();
    
    // 默认方法（Java 8+）
    default void land() {
        System.out.println("Landing");
    }
    
    // 静态方法（Java 8+）
    static void checkSpeed(int speed) {
        if (speed > MAX_SPEED) {
            throw new IllegalArgumentException("Speed too high");
        }
    }
}

public class Bird implements Flyable {
    @Override
    public void fly() {
        System.out.println("Bird flying");
    }
}
```


### 4. 抽象类 vs 接口

| 特性 | 抽象类 | 接口 |
|------|--------|------|
| 继承 | 单继承 | 多实现 |
| 方法 | 可以有实现 | 默认抽象（Java 8+可有默认方法） |
| 变量 | 任意类型 | public static final |
| 构造方法 | 可以有 | 不能有 |
| 访问修饰符 | 任意 | public |
| 使用场景 | is-a 关系 | can-do 能力 |

### 5. 重写 vs 重载

**重写（Override）**：
```java
public class Parent {
    public void method(int a) {
        System.out.println("Parent");
    }
}

public class Child extends Parent {
    @Override
    public void method(int a) {  // 方法签名相同
        System.out.println("Child");
    }
}
```

**重载（Overload）**：
```java
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
    
    public double add(double a, double b) {  // 参数类型不同
        return a + b;
    }
    
    public int add(int a, int b, int c) {  // 参数个数不同
        return a + b + c;
    }
}
```

| 特性 | 重写 | 重载 |
|------|------|------|
| 发生位置 | 子类 | 同类 |
| 方法名 | 相同 | 相同 |
| 参数列表 | 相同 | 不同 |
| 返回类型 | 相同或子类 | 无要求 |
| 访问修饰符 | 不能更严格 | 无要求 |
| 异常 | 不能更多 | 无要求 |


## 三、集合框架

### 1. 集合体系结构

```
Collection
├── List（有序、可重复）
│   ├── ArrayList
│   ├── LinkedList
│   └── Vector
│       └── Stack
├── Set（无序、不重复）
│   ├── HashSet
│   │   └── LinkedHashSet
│   └── TreeSet
└── Queue（队列）
    ├── PriorityQueue
    └── Deque
        └── ArrayDeque

Map（键值对）
├── HashMap
│   └── LinkedHashMap
├── TreeMap
├── Hashtable
└── ConcurrentHashMap
```

### 2. ArrayList vs LinkedList

| 特性 | ArrayList | LinkedList |
|------|-----------|------------|
| 底层结构 | 动态数组 | 双向链表 |
| 随机访问 | O(1) | O(n) |
| 插入/删除（头部） | O(n) | O(1) |
| 插入/删除（尾部） | O(1) | O(1) |
| 插入/删除（中间） | O(n) | O(n) |
| 内存占用 | 连续空间 | 额外指针空间 |
| 使用场景 | 查询多 | 增删多 |

**ArrayList 源码分析**：
```java
public class ArrayList<E> {
    private static final int DEFAULT_CAPACITY = 10;
    transient Object[] elementData;
    private int size;
    
    // 扩容机制
    private void grow(int minCapacity) {
        int oldCapacity = elementData.length;
        int newCapacity = oldCapacity + (oldCapacity >> 1);  // 1.5倍
        if (newCapacity < minCapacity)
            newCapacity = minCapacity;
        elementData = Arrays.copyOf(elementData, newCapacity);
    }
}
```


### 3. HashMap

**底层结构**：
- Java 7：数组 + 链表
- Java 8+：数组 + 链表/红黑树（链表长度 > 8 转红黑树）

**核心参数**：
```java
static final int DEFAULT_INITIAL_CAPACITY = 16;  // 初始容量
static final float DEFAULT_LOAD_FACTOR = 0.75f;  // 负载因子
static final int TREEIFY_THRESHOLD = 8;          // 树化阈值
static final int UNTREEIFY_THRESHOLD = 6;        // 退化阈值
```

**put 流程**：
```java
public V put(K key, V value) {
    // 1. 计算 hash
    int hash = hash(key);
    
    // 2. 计算索引：(n - 1) & hash
    int index = (table.length - 1) & hash;
    
    // 3. 判断位置是否为空
    if (table[index] == null) {
        // 直接插入
        table[index] = new Node(hash, key, value, null);
    } else {
        // 4. 遍历链表/红黑树
        // 5. key 存在则覆盖，不存在则插入
        // 6. 链表长度 > 8 转红黑树
    }
    
    // 7. 判断是否需要扩容
    if (++size > threshold) {
        resize();  // 扩容为原来的 2 倍
    }
}
```

**hash 计算**：
```java
static final int hash(Object key) {
    int h;
    // 高16位与低16位异或，减少碰撞
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```

**扩容机制**：
```java
final Node<K,V>[] resize() {
    // 1. 容量扩大为原来的 2 倍
    int newCapacity = oldCapacity << 1;
    
    // 2. 重新计算每个元素的位置
    // 元素要么在原位置，要么在原位置 + oldCapacity
}
```


### 4. HashMap vs Hashtable vs ConcurrentHashMap

| 特性 | HashMap | Hashtable | ConcurrentHashMap |
|------|---------|-----------|-------------------|
| 线程安全 | 否 | 是（synchronized） | 是（分段锁/CAS） |
| null key | 允许1个 | 不允许 | 不允许 |
| null value | 允许 | 不允许 | 不允许 |
| 性能 | 高 | 低 | 高 |
| 初始容量 | 16 | 11 | 16 |
| 扩容 | 2倍 | 2倍+1 | 2倍 |

**ConcurrentHashMap（Java 8）**：
```java
// 使用 CAS + synchronized 实现线程安全
public V put(K key, V value) {
    // 1. 如果桶为空，使用 CAS 插入
    if (casTabAt(tab, i, null, new Node(hash, key, value))) {
        break;
    }
    
    // 2. 如果桶不为空，使用 synchronized 锁住桶
    synchronized (f) {
        // 插入节点
    }
}
```

### 5. HashSet

**底层实现**：
```java
public class HashSet<E> {
    private transient HashMap<E, Object> map;
    private static final Object PRESENT = new Object();
    
    public boolean add(E e) {
        return map.put(e, PRESENT) == null;
    }
}
```

### 6. TreeMap

**底层结构**：红黑树

**特点**：
- 有序（自然排序或自定义排序）
- 时间复杂度：O(log n)

```java
// 自然排序
TreeMap<Integer, String> map1 = new TreeMap<>();

// 自定义排序
TreeMap<Integer, String> map2 = new TreeMap<>((a, b) -> b - a);
```


## 四、异常处理

### 1. 异常体系

```
Throwable
├── Error（系统错误，不可恢复）
│   ├── OutOfMemoryError
│   ├── StackOverflowError
│   └── NoClassDefFoundError
└── Exception（程序异常，可处理）
    ├── RuntimeException（运行时异常，非受检）
    │   ├── NullPointerException
    │   ├── ArrayIndexOutOfBoundsException
    │   ├── ClassCastException
    │   ├── ArithmeticException
    │   └── IllegalArgumentException
    └── 其他Exception（受检异常，必须处理）
        ├── IOException
        ├── SQLException
        └── ClassNotFoundException
```

### 2. 异常处理

**try-catch-finally**：
```java
try {
    // 可能抛出异常的代码
    int result = 10 / 0;
} catch (ArithmeticException e) {
    // 处理特定异常
    System.out.println("除数不能为0");
} catch (Exception e) {
    // 处理其他异常
    e.printStackTrace();
} finally {
    // 总是执行（除非 System.exit()）
    System.out.println("清理资源");
}
```

**try-with-resources（Java 7+）**：
```java
// 自动关闭资源
try (FileInputStream fis = new FileInputStream("file.txt");
     BufferedReader br = new BufferedReader(new InputStreamReader(fis))) {
    String line = br.readLine();
} catch (IOException e) {
    e.printStackTrace();
}
```

**throws 声明异常**：
```java
public void readFile(String path) throws IOException {
    FileReader reader = new FileReader(path);
}
```

**throw 抛出异常**：
```java
public void setAge(int age) {
    if (age < 0) {
        throw new IllegalArgumentException("年龄不能为负数");
    }
    this.age = age;
}
```


### 3. 自定义异常

```java
public class BusinessException extends RuntimeException {
    private int errorCode;
    
    public BusinessException(int errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    
    public int getErrorCode() {
        return errorCode;
    }
}

// 使用
throw new BusinessException(1001, "用户不存在");
```

## 五、多线程

### 1. 创建线程的方式

**继承 Thread**：
```java
public class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println("Thread running");
    }
}

// 使用
MyThread thread = new MyThread();
thread.start();
```

**实现 Runnable**：
```java
public class MyRunnable implements Runnable {
    @Override
    public void run() {
        System.out.println("Runnable running");
    }
}

// 使用
Thread thread = new Thread(new MyRunnable());
thread.start();

// Lambda 表达式
new Thread(() -> System.out.println("Lambda running")).start();
```

**实现 Callable**：
```java
public class MyCallable implements Callable<Integer> {
    @Override
    public Integer call() throws Exception {
        return 123;
    }
}

// 使用
FutureTask<Integer> task = new FutureTask<>(new MyCallable());
new Thread(task).start();
Integer result = task.get();  // 获取返回值
```


**线程池**：
```java
// 固定大小线程池
ExecutorService executor = Executors.newFixedThreadPool(5);

// 缓存线程池
ExecutorService executor = Executors.newCachedThreadPool();

// 单线程线程池
ExecutorService executor = Executors.newSingleThreadExecutor();

// 定时任务线程池
ScheduledExecutorService executor = Executors.newScheduledThreadPool(5);

// 自定义线程池（推荐）
ThreadPoolExecutor executor = new ThreadPoolExecutor(
    5,                      // 核心线程数
    10,                     // 最大线程数
    60L,                    // 空闲线程存活时间
    TimeUnit.SECONDS,       // 时间单位
    new LinkedBlockingQueue<>(100),  // 任务队列
    Executors.defaultThreadFactory(), // 线程工厂
    new ThreadPoolExecutor.AbortPolicy()  // 拒绝策略
);

// 提交任务
executor.execute(() -> System.out.println("Task"));
Future<Integer> future = executor.submit(() -> 123);

// 关闭线程池
executor.shutdown();
```

### 2. 线程状态

```
NEW（新建）
  ↓ start()
RUNNABLE（就绪/运行）
  ↓ 获取锁失败 / wait() / sleep() / join()
BLOCKED（阻塞）/ WAITING（等待）/ TIMED_WAITING（超时等待）
  ↓ 获取锁 / notify() / 超时
RUNNABLE
  ↓ 执行完成
TERMINATED（终止）
```


### 3. 线程同步

**synchronized**：
```java
// 同步方法
public synchronized void method() {
    // 锁住当前对象
}

// 同步静态方法
public static synchronized void method() {
    // 锁住类对象
}

// 同步代码块
public void method() {
    synchronized (this) {
        // 锁住当前对象
    }
    
    synchronized (SomeClass.class) {
        // 锁住类对象
    }
}
```

**Lock**：
```java
private Lock lock = new ReentrantLock();

public void method() {
    lock.lock();
    try {
        // 临界区代码
    } finally {
        lock.unlock();
    }
}

// 尝试获取锁
if (lock.tryLock()) {
    try {
        // 临界区代码
    } finally {
        lock.unlock();
    }
}

// 超时获取锁
if (lock.tryLock(1, TimeUnit.SECONDS)) {
    try {
        // 临界区代码
    } finally {
        lock.unlock();
    }
}
```

**synchronized vs Lock**：

| 特性 | synchronized | Lock |
|------|--------------|------|
| 类型 | 关键字 | 接口 |
| 锁释放 | 自动 | 手动 |
| 可中断 | 否 | 是 |
| 公平锁 | 非公平 | 可选 |
| 多条件 | 否 | 是（Condition） |
| 性能 | 较低 | 较高 |


### 4. 线程通信

**wait/notify**：
```java
public class ProducerConsumer {
    private Queue<Integer> queue = new LinkedList<>();
    private int maxSize = 10;
    
    public synchronized void produce() throws InterruptedException {
        while (queue.size() == maxSize) {
            wait();  // 队列满，等待
        }
        queue.add(1);
        notify();  // 通知消费者
    }
    
    public synchronized void consume() throws InterruptedException {
        while (queue.isEmpty()) {
            wait();  // 队列空，等待
        }
        queue.poll();
        notify();  // 通知生产者
    }
}
```

**Condition**：
```java
private Lock lock = new ReentrantLock();
private Condition notFull = lock.newCondition();
private Condition notEmpty = lock.newCondition();

public void produce() throws InterruptedException {
    lock.lock();
    try {
        while (queue.size() == maxSize) {
            notFull.await();
        }
        queue.add(1);
        notEmpty.signal();
    } finally {
        lock.unlock();
    }
}

public void consume() throws InterruptedException {
    lock.lock();
    try {
        while (queue.isEmpty()) {
            notEmpty.await();
        }
        queue.poll();
        notFull.signal();
    } finally {
        lock.unlock();
    }
}
```

### 5. volatile 关键字

**作用**：
1. 保证可见性
2. 禁止指令重排序
3. 不保证原子性

```java
public class VolatileExample {
    private volatile boolean flag = false;
    
    public void writer() {
        flag = true;  // 写入立即刷新到主内存
    }
    
    public void reader() {
        if (flag) {  // 读取前从主内存刷新
            // do something
        }
    }
}
```


### 6. ThreadLocal

**作用**：线程本地变量，每个线程独立副本

```java
public class ThreadLocalExample {
    private static ThreadLocal<Integer> threadLocal = new ThreadLocal<>();
    
    public static void main(String[] args) {
        new Thread(() -> {
            threadLocal.set(1);
            System.out.println(threadLocal.get());  // 1
            threadLocal.remove();  // 防止内存泄漏
        }).start();
        
        new Thread(() -> {
            threadLocal.set(2);
            System.out.println(threadLocal.get());  // 2
            threadLocal.remove();
        }).start();
    }
}
```

**应用场景**：
- 数据库连接管理
- Session 管理
- 用户信息传递

**内存泄漏问题**：
- ThreadLocal 使用弱引用
- 线程池场景下需要手动 remove()

## 六、IO 流

### 1. IO 分类

**按流向**：
- 输入流（InputStream、Reader）
- 输出流（OutputStream、Writer）

**按数据类型**：
- 字节流（InputStream、OutputStream）
- 字符流（Reader、Writer）

**按功能**：
- 节点流：直接操作数据源
- 处理流：包装节点流，提供额外功能

### 2. 常用流

**字节流**：
```java
// 文件字节流
FileInputStream fis = new FileInputStream("input.txt");
FileOutputStream fos = new FileOutputStream("output.txt");

// 缓冲字节流
BufferedInputStream bis = new BufferedInputStream(fis);
BufferedOutputStream bos = new BufferedOutputStream(fos);

// 数据流
DataInputStream dis = new DataInputStream(fis);
DataOutputStream dos = new DataOutputStream(fos);

// 对象流
ObjectInputStream ois = new ObjectInputStream(fis);
ObjectOutputStream oos = new ObjectOutputStream(fos);
```


**字符流**：
```java
// 文件字符流
FileReader fr = new FileReader("input.txt");
FileWriter fw = new FileWriter("output.txt");

// 缓冲字符流
BufferedReader br = new BufferedReader(fr);
BufferedWriter bw = new BufferedWriter(fw);

// 转换流
InputStreamReader isr = new InputStreamReader(fis, "UTF-8");
OutputStreamWriter osw = new OutputStreamWriter(fos, "UTF-8");
```

### 3. NIO

**核心组件**：
- Channel（通道）
- Buffer（缓冲区）
- Selector（选择器）

```java
// 文件复制
try (FileChannel inChannel = FileChannel.open(Paths.get("input.txt"), StandardOpenOption.READ);
     FileChannel outChannel = FileChannel.open(Paths.get("output.txt"), 
         StandardOpenOption.WRITE, StandardOpenOption.CREATE)) {
    
    ByteBuffer buffer = ByteBuffer.allocate(1024);
    
    while (inChannel.read(buffer) != -1) {
        buffer.flip();  // 切换到读模式
        outChannel.write(buffer);
        buffer.clear();  // 清空缓冲区
    }
}
```

**BIO vs NIO**：

| 特性 | BIO | NIO |
|------|-----|-----|
| 阻塞 | 阻塞 | 非阻塞 |
| 面向 | 流 | 缓冲区 |
| 选择器 | 无 | 有 |
| 性能 | 低 | 高 |
| 适用场景 | 连接数少 | 连接数多 |


## 七、反射

### 1. 获取 Class 对象

```java
// 方式1：Class.forName()
Class<?> clazz1 = Class.forName("com.example.User");

// 方式2：类名.class
Class<?> clazz2 = User.class;

// 方式3：对象.getClass()
User user = new User();
Class<?> clazz3 = user.getClass();
```

### 2. 反射操作

**创建对象**：
```java
// 无参构造
User user1 = (User) clazz.newInstance();

// 有参构造
Constructor<User> constructor = clazz.getConstructor(String.class, int.class);
User user2 = constructor.newInstance("张三", 20);
```

**访问字段**：
```java
// 获取字段
Field field = clazz.getDeclaredField("name");
field.setAccessible(true);  // 访问私有字段

// 设置值
field.set(user, "李四");

// 获取值
String name = (String) field.get(user);
```

**调用方法**：
```java
// 获取方法
Method method = clazz.getDeclaredMethod("setName", String.class);
method.setAccessible(true);

// 调用方法
method.invoke(user, "王五");
```

**获取注解**：
```java
// 类注解
Annotation[] annotations = clazz.getAnnotations();

// 方法注解
Method method = clazz.getMethod("getName");
if (method.isAnnotationPresent(MyAnnotation.class)) {
    MyAnnotation annotation = method.getAnnotation(MyAnnotation.class);
}
```

### 3. 反射的应用

- 框架开发（Spring、MyBatis）
- 动态代理
- 注解处理
- 序列化/反序列化


## 八、注解

### 1. 内置注解

```java
@Override       // 重写方法
@Deprecated     // 过时方法
@SuppressWarnings("unchecked")  // 抑制警告
@FunctionalInterface  // 函数式接口
```

### 2. 元注解

```java
@Target(ElementType.METHOD)  // 作用目标
@Retention(RetentionPolicy.RUNTIME)  // 保留策略
@Documented  // 生成文档
@Inherited   // 可继承
```

**@Target 取值**：
- TYPE：类、接口、枚举
- FIELD：字段
- METHOD：方法
- PARAMETER：参数
- CONSTRUCTOR：构造方法
- LOCAL_VARIABLE：局部变量

**@Retention 取值**：
- SOURCE：源码阶段，编译后丢弃
- CLASS：编译阶段，运行时丢弃
- RUNTIME：运行时保留，可通过反射获取

### 3. 自定义注解

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface MyAnnotation {
    String value() default "";
    int timeout() default 3000;
    String[] tags() default {};
}

// 使用
@MyAnnotation(value = "test", timeout = 5000, tags = {"tag1", "tag2"})
public void method() {
}

// 解析
Method method = clazz.getMethod("method");
if (method.isAnnotationPresent(MyAnnotation.class)) {
    MyAnnotation annotation = method.getAnnotation(MyAnnotation.class);
    String value = annotation.value();
    int timeout = annotation.timeout();
    String[] tags = annotation.tags();
}
```


## 九、泛型

### 1. 泛型类

```java
public class Box<T> {
    private T value;
    
    public void set(T value) {
        this.value = value;
    }
    
    public T get() {
        return value;
    }
}

// 使用
Box<String> box = new Box<>();
box.set("Hello");
String value = box.get();
```

### 2. 泛型方法

```java
public class GenericMethod {
    public <T> T method(T param) {
        return param;
    }
    
    public <T> void print(T... args) {
        for (T arg : args) {
            System.out.println(arg);
        }
    }
}

// 使用
String result = method("Hello");
print(1, 2, 3);
```

### 3. 泛型接口

```java
public interface Generator<T> {
    T generate();
}

public class StringGenerator implements Generator<String> {
    @Override
    public String generate() {
        return "Generated String";
    }
}
```

### 4. 泛型通配符

```java
// 无界通配符
public void print(List<?> list) {
    for (Object obj : list) {
        System.out.println(obj);
    }
}

// 上界通配符（extends）
public void sum(List<? extends Number> list) {
    double sum = 0;
    for (Number num : list) {
        sum += num.doubleValue();
    }
}

// 下界通配符（super）
public void addNumbers(List<? super Integer> list) {
    list.add(1);
    list.add(2);
}
```


### 5. 泛型擦除

Java 泛型是编译时特性，运行时会被擦除。

```java
List<String> list1 = new ArrayList<>();
List<Integer> list2 = new ArrayList<>();

// 运行时类型相同
System.out.println(list1.getClass() == list2.getClass());  // true
```

## 十、Lambda 表达式与 Stream API

### 1. Lambda 表达式

**语法**：
```java
(parameters) -> expression
(parameters) -> { statements; }
```

**示例**：
```java
// 无参数
Runnable r = () -> System.out.println("Hello");

// 单参数
Consumer<String> c = s -> System.out.println(s);

// 多参数
Comparator<Integer> comp = (a, b) -> a - b;

// 代码块
BiFunction<Integer, Integer, Integer> add = (a, b) -> {
    int sum = a + b;
    return sum;
};
```

### 2. 函数式接口

```java
@FunctionalInterface
public interface MyFunction {
    void apply();
}

// 常用函数式接口
Function<T, R>      // T -> R
Consumer<T>         // T -> void
Supplier<T>         // () -> T
Predicate<T>        // T -> boolean
BiFunction<T, U, R> // (T, U) -> R
```

### 3. 方法引用

```java
// 静态方法引用
Function<String, Integer> f1 = Integer::parseInt;

// 实例方法引用
String str = "Hello";
Supplier<Integer> f2 = str::length;

// 类方法引用
Function<String, Integer> f3 = String::length;

// 构造方法引用
Supplier<List<String>> f4 = ArrayList::new;
```


### 4. Stream API

**创建流**：
```java
// 从集合创建
List<String> list = Arrays.asList("a", "b", "c");
Stream<String> stream1 = list.stream();

// 从数组创建
String[] array = {"a", "b", "c"};
Stream<String> stream2 = Arrays.stream(array);

// 使用 Stream.of()
Stream<String> stream3 = Stream.of("a", "b", "c");

// 无限流
Stream<Integer> stream4 = Stream.iterate(0, n -> n + 1);
Stream<Double> stream5 = Stream.generate(Math::random);
```

**中间操作**：
```java
List<Integer> list = Arrays.asList(1, 2, 3, 4, 5, 6);

// filter：过滤
list.stream().filter(n -> n % 2 == 0);  // [2, 4, 6]

// map：映射
list.stream().map(n -> n * 2);  // [2, 4, 6, 8, 10, 12]

// flatMap：扁平化
List<List<Integer>> nested = Arrays.asList(
    Arrays.asList(1, 2),
    Arrays.asList(3, 4)
);
nested.stream().flatMap(List::stream);  // [1, 2, 3, 4]

// distinct：去重
Arrays.asList(1, 2, 2, 3).stream().distinct();  // [1, 2, 3]

// sorted：排序
list.stream().sorted();  // [1, 2, 3, 4, 5, 6]
list.stream().sorted(Comparator.reverseOrder());  // [6, 5, 4, 3, 2, 1]

// limit：限制
list.stream().limit(3);  // [1, 2, 3]

// skip：跳过
list.stream().skip(2);  // [3, 4, 5, 6]

// peek：查看
list.stream().peek(System.out::println);
```


**终止操作**：
```java
// forEach：遍历
list.stream().forEach(System.out::println);

// collect：收集
List<Integer> result = list.stream().collect(Collectors.toList());
Set<Integer> set = list.stream().collect(Collectors.toSet());
Map<Integer, String> map = list.stream()
    .collect(Collectors.toMap(n -> n, n -> "value" + n));

// reduce：归约
int sum = list.stream().reduce(0, (a, b) -> a + b);
int product = list.stream().reduce(1, (a, b) -> a * b);

// count：计数
long count = list.stream().count();

// max/min：最大/最小值
Optional<Integer> max = list.stream().max(Integer::compareTo);
Optional<Integer> min = list.stream().min(Integer::compareTo);

// anyMatch/allMatch/noneMatch：匹配
boolean hasEven = list.stream().anyMatch(n -> n % 2 == 0);
boolean allPositive = list.stream().allMatch(n -> n > 0);
boolean noNegative = list.stream().noneMatch(n -> n < 0);

// findFirst/findAny：查找
Optional<Integer> first = list.stream().findFirst();
Optional<Integer> any = list.stream().findAny();
```

**分组和分区**：
```java
List<String> words = Arrays.asList("apple", "banana", "cherry", "date");

// 按长度分组
Map<Integer, List<String>> grouped = words.stream()
    .collect(Collectors.groupingBy(String::length));
// {5=[apple], 6=[banana, cherry], 4=[date]}

// 按首字母分组
Map<Character, List<String>> grouped2 = words.stream()
    .collect(Collectors.groupingBy(s -> s.charAt(0)));

// 分区（true/false）
Map<Boolean, List<String>> partitioned = words.stream()
    .collect(Collectors.partitioningBy(s -> s.length() > 5));
// {false=[apple, date], true=[banana, cherry]}
```


## 十一、JVM 基础

### 1. JVM 内存结构

```
┌─────────────────────────────────────────┐
│          方法区（Method Area）           │
│      类信息、常量、静态变量、JIT代码      │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│            堆（Heap）                    │
│         对象实例、数组                   │
│  ┌──────────────┬──────────────────┐   │
│  │  新生代       │    老年代         │   │
│  │ Eden | S0|S1 │                  │   │
│  └──────────────┴──────────────────┘   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│          虚拟机栈（VM Stack）            │
│      局部变量表、操作数栈、方法出口       │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│        本地方法栈（Native Stack）        │
│           Native 方法调用                │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│        程序计数器（PC Register）         │
│          当前线程执行的字节码行号         │
└─────────────────────────────────────────┘
```

**线程私有**：
- 程序计数器
- 虚拟机栈
- 本地方法栈

**线程共享**：
- 堆
- 方法区

### 2. 垃圾回收

**判断对象是否存活**：

1. **引用计数法**：
   - 对象被引用时计数+1，引用失效时-1
   - 无法解决循环引用问题

2. **可达性分析**（Java 使用）：
   - 从 GC Roots 开始向下搜索
   - 不可达的对象可以被回收

**GC Roots**：
- 虚拟机栈中引用的对象
- 方法区静态属性引用的对象
- 方法区常量引用的对象
- 本地方法栈引用的对象


**垃圾回收算法**：

1. **标记-清除**：
   - 标记需要回收的对象，然后清除
   - 缺点：产生内存碎片

2. **标记-复制**：
   - 将内存分为两块，每次只使用一块
   - 存活对象复制到另一块，清空当前块
   - 缺点：浪费一半内存

3. **标记-整理**：
   - 标记后将存活对象移到一端
   - 清理边界外的内存
   - 缺点：移动对象开销大

4. **分代收集**（Java 使用）：
   - 新生代：标记-复制（对象存活率低）
   - 老年代：标记-清除或标记-整理

**垃圾收集器**：

| 收集器 | 类型 | 算法 | 特点 |
|--------|------|------|------|
| Serial | 新生代 | 复制 | 单线程，STW |
| ParNew | 新生代 | 复制 | 多线程，STW |
| Parallel Scavenge | 新生代 | 复制 | 吞吐量优先 |
| Serial Old | 老年代 | 标记-整理 | 单线程，STW |
| Parallel Old | 老年代 | 标记-整理 | 多线程 |
| CMS | 老年代 | 标记-清除 | 低停顿 |
| G1 | 全堆 | 标记-整理 | 可预测停顿 |
| ZGC | 全堆 | - | 超低停顿 |

### 3. 类加载机制

**类加载过程**：
```
加载 → 验证 → 准备 → 解析 → 初始化 → 使用 → 卸载
```

**类加载器**：
```
Bootstrap ClassLoader（启动类加载器）
    ↓
Extension ClassLoader（扩展类加载器）
    ↓
Application ClassLoader（应用类加载器）
    ↓
Custom ClassLoader（自定义类加载器）
```

**双亲委派模型**：
- 类加载请求先委派给父加载器
- 父加载器无法加载时，子加载器才尝试加载
- 保证核心类库的安全性


## 十二、设计模式

### 1. 单例模式

**饿汉式**：
```java
public class Singleton {
    private static final Singleton INSTANCE = new Singleton();
    
    private Singleton() {}
    
    public static Singleton getInstance() {
        return INSTANCE;
    }
}
```

**懒汉式（双重检查锁）**：
```java
public class Singleton {
    private static volatile Singleton instance;
    
    private Singleton() {}
    
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

**静态内部类**：
```java
public class Singleton {
    private Singleton() {}
    
    private static class Holder {
        private static final Singleton INSTANCE = new Singleton();
    }
    
    public static Singleton getInstance() {
        return Holder.INSTANCE;
    }
}
```

**枚举**：
```java
public enum Singleton {
    INSTANCE;
    
    public void method() {
        // 业务方法
    }
}
```

### 2. 工厂模式

**简单工厂**：
```java
public class ShapeFactory {
    public static Shape createShape(String type) {
        switch (type) {
            case "circle":
                return new Circle();
            case "rectangle":
                return new Rectangle();
            default:
                throw new IllegalArgumentException("Unknown shape");
        }
    }
}
```


**工厂方法**：
```java
public interface ShapeFactory {
    Shape createShape();
}

public class CircleFactory implements ShapeFactory {
    @Override
    public Shape createShape() {
        return new Circle();
    }
}

public class RectangleFactory implements ShapeFactory {
    @Override
    public Shape createShape() {
        return new Rectangle();
    }
}
```

### 3. 代理模式

**静态代理**：
```java
public interface Subject {
    void request();
}

public class RealSubject implements Subject {
    @Override
    public void request() {
        System.out.println("Real request");
    }
}

public class Proxy implements Subject {
    private RealSubject realSubject;
    
    @Override
    public void request() {
        if (realSubject == null) {
            realSubject = new RealSubject();
        }
        before();
        realSubject.request();
        after();
    }
    
    private void before() {
        System.out.println("Before");
    }
    
    private void after() {
        System.out.println("After");
    }
}
```

**动态代理（JDK）**：
```java
public class DynamicProxy implements InvocationHandler {
    private Object target;
    
    public DynamicProxy(Object target) {
        this.target = target;
    }
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        System.out.println("Before");
        Object result = method.invoke(target, args);
        System.out.println("After");
        return result;
    }
    
    public static Object getProxy(Object target) {
        return Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces(),
            new DynamicProxy(target)
        );
    }
}

// 使用
Subject subject = new RealSubject();
Subject proxy = (Subject) DynamicProxy.getProxy(subject);
proxy.request();
```


### 4. 观察者模式

```java
// 观察者接口
public interface Observer {
    void update(String message);
}

// 被观察者
public class Subject {
    private List<Observer> observers = new ArrayList<>();
    
    public void attach(Observer observer) {
        observers.add(observer);
    }
    
    public void detach(Observer observer) {
        observers.remove(observer);
    }
    
    public void notifyObservers(String message) {
        for (Observer observer : observers) {
            observer.update(message);
        }
    }
}

// 具体观察者
public class ConcreteObserver implements Observer {
    private String name;
    
    public ConcreteObserver(String name) {
        this.name = name;
    }
    
    @Override
    public void update(String message) {
        System.out.println(name + " received: " + message);
    }
}

// 使用
Subject subject = new Subject();
subject.attach(new ConcreteObserver("Observer1"));
subject.attach(new ConcreteObserver("Observer2"));
subject.notifyObservers("Hello");
```

### 5. 策略模式

```java
// 策略接口
public interface Strategy {
    int calculate(int a, int b);
}

// 具体策略
public class AddStrategy implements Strategy {
    @Override
    public int calculate(int a, int b) {
        return a + b;
    }
}

public class SubtractStrategy implements Strategy {
    @Override
    public int calculate(int a, int b) {
        return a - b;
    }
}

// 上下文
public class Context {
    private Strategy strategy;
    
    public Context(Strategy strategy) {
        this.strategy = strategy;
    }
    
    public int execute(int a, int b) {
        return strategy.calculate(a, b);
    }
}

// 使用
Context context = new Context(new AddStrategy());
int result = context.execute(10, 5);  // 15
```


## 十三、常见面试题

### 1. == vs equals()

```java
// == 比较引用地址
String s1 = new String("hello");
String s2 = new String("hello");
System.out.println(s1 == s2);  // false

// equals() 比较内容
System.out.println(s1.equals(s2));  // true

// 基本类型用 ==
int a = 10;
int b = 10;
System.out.println(a == b);  // true
```

### 2. hashCode() 与 equals()

**规则**：
- equals() 相等，hashCode() 必须相等
- hashCode() 相等，equals() 不一定相等

```java
@Override
public boolean equals(Object obj) {
    if (this == obj) return true;
    if (obj == null || getClass() != obj.getClass()) return false;
    User user = (User) obj;
    return age == user.age && Objects.equals(name, user.name);
}

@Override
public int hashCode() {
    return Objects.hash(name, age);
}
```

### 3. Java 值传递

Java 只有值传递，没有引用传递。

```java
public void swap(int a, int b) {
    int temp = a;
    a = b;
    b = temp;
}

int x = 1, y = 2;
swap(x, y);
System.out.println(x + ", " + y);  // 1, 2（未交换）

// 对象传递的是引用的副本
public void modify(User user) {
    user.setName("New Name");  // 会修改原对象
    user = new User();  // 不会影响原引用
}
```

### 4. 深拷贝 vs 浅拷贝

**浅拷贝**：
```java
public class User implements Cloneable {
    private String name;
    private Address address;
    
    @Override
    protected Object clone() throws CloneNotSupportedException {
        return super.clone();  // 浅拷贝
    }
}
```

**深拷贝**：
```java
@Override
protected Object clone() throws CloneNotSupportedException {
    User cloned = (User) super.clone();
    cloned.address = (Address) address.clone();  // 深拷贝
    return cloned;
}

// 或使用序列化
public User deepCopy() {
    try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
         ObjectOutputStream oos = new ObjectOutputStream(bos)) {
        oos.writeObject(this);
        
        try (ByteArrayInputStream bis = new ByteArrayInputStream(bos.toByteArray());
             ObjectInputStream ois = new ObjectInputStream(bis)) {
            return (User) ois.readObject();
        }
    } catch (Exception e) {
        throw new RuntimeException(e);
    }
}
```


### 5. String 不可变的好处

1. **线程安全**：多线程环境下无需同步
2. **缓存 hash 值**：适合作为 HashMap 的 key
3. **字符串常量池**：节省内存
4. **安全性**：防止被篡改（如文件路径、网络连接）

### 6. 为什么重写 equals() 必须重写 hashCode()？

HashMap 等集合依赖 hashCode() 来定位元素：
1. 先通过 hashCode() 找到桶位置
2. 再通过 equals() 比较内容

如果只重写 equals()，可能导致：
- 相同对象存储在不同桶中
- 无法正确查找和去重

### 7. Java 中的四种引用

```java
// 强引用：不会被回收
Object obj = new Object();

// 软引用：内存不足时回收
SoftReference<Object> soft = new SoftReference<>(new Object());

// 弱引用：GC 时回收
WeakReference<Object> weak = new WeakReference<>(new Object());

// 虚引用：随时可能被回收，用于跟踪对象回收
PhantomReference<Object> phantom = new PhantomReference<>(new Object(), queue);
```

### 8. 序列化与反序列化

```java
// 实现 Serializable 接口
public class User implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private String name;
    private transient String password;  // 不序列化
    
    // getters and setters
}

// 序列化
try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream("user.ser"))) {
    oos.writeObject(user);
}

// 反序列化
try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream("user.ser"))) {
    User user = (User) ois.readObject();
}
```

**serialVersionUID 的作用**：
- 版本控制
- 不一致会导致 InvalidClassException


### 9. Java 8 新特性

1. **Lambda 表达式**
2. **Stream API**
3. **函数式接口**
4. **方法引用**
5. **默认方法**
6. **Optional 类**
7. **新的日期时间 API**
8. **接口静态方法**

**Optional 使用**：
```java
// 创建
Optional<String> optional = Optional.of("value");
Optional<String> empty = Optional.empty();
Optional<String> nullable = Optional.ofNullable(null);

// 判断
if (optional.isPresent()) {
    System.out.println(optional.get());
}

// 链式调用
String result = optional
    .map(String::toUpperCase)
    .filter(s -> s.length() > 3)
    .orElse("default");

// ifPresent
optional.ifPresent(System.out::println);

// orElseThrow
String value = optional.orElseThrow(() -> new RuntimeException("Value not found"));
```

**新日期时间 API**：
```java
// LocalDate
LocalDate date = LocalDate.now();
LocalDate birthday = LocalDate.of(1990, 1, 1);

// LocalTime
LocalTime time = LocalTime.now();
LocalTime noon = LocalTime.of(12, 0);

// LocalDateTime
LocalDateTime dateTime = LocalDateTime.now();

// 格式化
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
String formatted = dateTime.format(formatter);

// 解析
LocalDateTime parsed = LocalDateTime.parse("2024-01-01 12:00:00", formatter);

// 计算
LocalDate tomorrow = date.plusDays(1);
LocalDate lastMonth = date.minusMonths(1);

// 比较
boolean isBefore = date.isBefore(tomorrow);
boolean isAfter = date.isAfter(birthday);
```


### 10. 常见异常处理最佳实践

```java
// 1. 不要捕获 Throwable 或 Error
try {
    // code
} catch (Exception e) {  // ✓
    // handle
}

// 2. 不要忽略异常
try {
    // code
} catch (Exception e) {
    // ✗ 空 catch 块
}

// 3. 使用具体的异常类型
try {
    // code
} catch (FileNotFoundException e) {  // ✓ 具体异常
    // handle
} catch (IOException e) {
    // handle
}

// 4. 记录异常信息
try {
    // code
} catch (Exception e) {
    logger.error("Error occurred", e);  // ✓ 记录堆栈
    throw e;
}

// 5. 不要在 finally 中使用 return
try {
    return "try";
} finally {
    return "finally";  // ✗ 会覆盖 try 的返回值
}

// 6. 使用 try-with-resources
try (FileInputStream fis = new FileInputStream("file.txt")) {
    // ✓ 自动关闭资源
}

// 7. 自定义异常要有意义
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(Long userId) {
        super("User not found: " + userId);
    }
}
```

---

## 总结

Java 基础核心考点涵盖：

1. **基础语法**：数据类型、String、运算符
2. **面向对象**：封装、继承、多态、接口、抽象类
3. **集合框架**：List、Set、Map 及其实现类
4. **异常处理**：异常体系、try-catch-finally
5. **多线程**：线程创建、同步、通信、线程池
6. **IO 流**：字节流、字符流、NIO
7. **反射**：Class 对象、动态操作
8. **注解**：内置注解、自定义注解
9. **泛型**：泛型类、方法、通配符
10. **Lambda 与 Stream**：函数式编程
11. **JVM**：内存结构、垃圾回收、类加载
12. **设计模式**：单例、工厂、代理、观察者、策略

掌握这些核心知识点，能够应对大部分 Java 基础面试题。
