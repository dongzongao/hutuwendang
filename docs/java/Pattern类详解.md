# Pattern 类详解

## 一、Pattern 类概述

Pattern 类是 Java 正则表达式的核心类，用于编译正则表达式并创建 Matcher 对象。

```java
package java.util.regex;

public final class Pattern implements java.io.Serializable {
    // Pattern 是不可变的、线程安全的
}
```

## 二、创建 Pattern 对象

### 1. 基本编译

```java
public class PatternCreation {
    
    public static void main(String[] args) {
        // 方式1：compile() 方法
        Pattern pattern1 = Pattern.compile("\\d+");
        
        // 方式2：带标志的 compile()
        Pattern pattern2 = Pattern.compile("abc", Pattern.CASE_INSENSITIVE);
        
        // 方式3：多个标志（使用位或运算）
        Pattern pattern3 = Pattern.compile("abc", 
            Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
        
        // 方式4：静态方法 matches()（一次性匹配）
        boolean result = Pattern.matches("\\d+", "123");
        System.out.println("匹配结果: " + result);  // true
    }
}
```

### 2. Pattern 标志（Flags）

```java
public class PatternFlags {
    
    public static void main(String[] args) {
        String text = "Hello\nWorld";
        
        // 1. CASE_INSENSITIVE (0x02) - 忽略大小写
        Pattern p1 = Pattern.compile("hello", Pattern.CASE_INSENSITIVE);
        System.out.println(p1.matcher("HELLO").matches());  // true
        
        // 2. MULTILINE (0x08) - 多行模式
        // ^ 和 $ 匹配每一行的开头和结尾
        Pattern p2 = Pattern.compile("^World$", Pattern.MULTILINE);
        System.out.println(p2.matcher(text).find());  // true
        
        // 3. DOTALL (0x20) - 点号匹配所有字符（包括换行符）
        Pattern p3 = Pattern.compile("Hello.World", Pattern.DOTALL);
        System.out.println(p3.matcher(text).matches());  // true
        
        // 4. UNICODE_CASE (0x40) - Unicode 大小写
        Pattern p4 = Pattern.compile("\\u00e9", 
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        
        // 5. CANON_EQ (0x80) - 规范等价
        // 匹配规范等价的字符序列
        Pattern p5 = Pattern.compile("\\u00e9", Pattern.CANON_EQ);
        
        // 6. UNIX_LINES (0x01) - Unix 行模式
        // 只识别 \n 作为行终止符
        Pattern p6 = Pattern.compile(".", Pattern.UNIX_LINES);
        
        // 7. LITERAL (0x10) - 字面值模式
        // 将正则表达式作为普通字符串处理
        Pattern p7 = Pattern.compile("\\d+", Pattern.LITERAL);
        System.out.println(p7.matcher("\\d+").matches());  // true
        
        // 8. COMMENTS (0x04) - 注释模式
        // 忽略空白和 # 注释
        String regex = """
            \\d{4}  # 年份
            -       # 分隔符
            \\d{2}  # 月份
            -       # 分隔符
            \\d{2}  # 日期
            """;
        Pattern p8 = Pattern.compile(regex, Pattern.COMMENTS);
        System.out.println(p8.matcher("2024-01-15").matches());  // true
    }
}
```

### 3. 标志常量表

| 标志 | 值 | 说明 |
|------|---|------|
| UNIX_LINES | 0x01 | 启用 Unix 行模式 |
| CASE_INSENSITIVE | 0x02 | 忽略大小写 |
| COMMENTS | 0x04 | 允许注释和空白 |
| MULTILINE | 0x08 | 多行模式 |
| LITERAL | 0x10 | 字面值模式 |
| DOTALL | 0x20 | 点号匹配所有字符 |
| UNICODE_CASE | 0x40 | Unicode 大小写 |
| CANON_EQ | 0x80 | 规范等价 |
| UNICODE_CHARACTER_CLASS | 0x100 | Unicode 字符类 |

## 三、Pattern 类的主要方法

### 1. compile() - 编译正则表达式

```java
public class CompileMethod {
    
    public static void main(String[] args) {
        // 基本编译
        Pattern pattern = Pattern.compile("\\d+");
        
        // 带标志编译
        Pattern pattern2 = Pattern.compile("abc", Pattern.CASE_INSENSITIVE);
        
        // 多个标志
        int flags = Pattern.CASE_INSENSITIVE | 
                   Pattern.MULTILINE | 
                   Pattern.DOTALL;
        Pattern pattern3 = Pattern.compile("regex", flags);
        
        /**
         * 方法签名：
         * public static Pattern compile(String regex)
         * public static Pattern compile(String regex, int flags)
         * 
         * 抛出异常：
         * PatternSyntaxException - 如果正则表达式语法错误
         */
    }
}
```

### 2. matcher() - 创建 Matcher 对象

```java
public class MatcherMethod {
    
    public static void main(String[] args) {
        Pattern pattern = Pattern.compile("\\d+");
        
        // 创建 Matcher
        Matcher matcher = pattern.matcher("Hello 123 World 456");
        
        // 可以重复使用 Pattern 创建多个 Matcher
        Matcher matcher2 = pattern.matcher("789");
        Matcher matcher3 = pattern.matcher("abc");
        
        /**
         * 方法签名：
         * public Matcher matcher(CharSequence input)
         * 
         * 参数：
         * input - 要匹配的字符序列
         * 
         * 返回：
         * 新的 Matcher 对象
         */
    }
}
```

### 3. matches() - 静态匹配方法

```java
public class MatchesMethod {
    
    public static void main(String[] args) {
        // 一次性匹配（不需要创建 Pattern 对象）
        boolean result1 = Pattern.matches("\\d+", "123");
        System.out.println(result1);  // true
        
        boolean result2 = Pattern.matches("\\d+", "abc");
        System.out.println(result2);  // false
        
        // 等价于
        Pattern pattern = Pattern.compile("\\d+");
        Matcher matcher = pattern.matcher("123");
        boolean result3 = matcher.matches();
        
        /**
         * 方法签名：
         * public static boolean matches(String regex, CharSequence input)
         * 
         * 注意：
         * - 这是一次性操作，不适合重复使用
         * - 每次调用都会重新编译正则表达式
         * - 如果需要多次匹配，应该先编译 Pattern
         */
    }
}
```

### 4. split() - 分割字符串

```java
public class SplitMethod {
    
    public static void main(String[] args) {
        Pattern pattern = Pattern.compile("\\s+");
        
        // 基本分割
        String[] parts1 = pattern.split("Hello   World  Java");
        System.out.println(Arrays.toString(parts1));
        // [Hello, World, Java]
        
        // 限制分割次数
        String[] parts2 = pattern.split("Hello   World  Java", 2);
        System.out.println(Arrays.toString(parts2));
        // [Hello, World  Java]
        
        // 分割数字
        Pattern numPattern = Pattern.compile("\\d+");
        String[] parts3 = numPattern.split("a1b2c3d4");
        System.out.println(Arrays.toString(parts3));
        // [a, b, c, d]
        
        // 保留空字符串
        Pattern commaPattern = Pattern.compile(",");
        String[] parts4 = commaPattern.split("a,,b,c,");
        System.out.println(Arrays.toString(parts4));
        // [a, , b, c]
        
        /**
         * 方法签名：
         * public String[] split(CharSequence input)
         * public String[] split(CharSequence input, int limit)
         * 
         * 参数：
         * input - 要分割的字符序列
         * limit - 分割次数限制
         *   > 0: 最多分割 limit-1 次
         *   = 0: 分割所有，去除尾部空字符串
         *   < 0: 分割所有，保留尾部空字符串
         */
    }
}
```

### 5. pattern() - 获取正则表达式

```java
public class PatternMethod {
    
    public static void main(String[] args) {
        Pattern pattern = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");
        
        // 获取原始正则表达式
        String regex = pattern.pattern();
        System.out.println("正则表达式: " + regex);
        // \d{4}-\d{2}-\d{2}
        
        /**
         * 方法签名：
         * public String pattern()
         * 
         * 返回：
         * 编译时使用的正则表达式字符串
         */
    }
}
```

### 6. flags() - 获取标志

```java
public class FlagsMethod {
    
    public static void main(String[] args) {
        Pattern pattern = Pattern.compile("abc", 
            Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
        
        // 获取标志
        int flags = pattern.flags();
        System.out.println("标志值: " + flags);
        
        // 检查特定标志
        boolean isCaseInsensitive = (flags & Pattern.CASE_INSENSITIVE) != 0;
        boolean isMultiline = (flags & Pattern.MULTILINE) != 0;
        
        System.out.println("忽略大小写: " + isCaseInsensitive);  // true
        System.out.println("多行模式: " + isMultiline);          // true
        
        /**
         * 方法签名：
         * public int flags()
         * 
         * 返回：
         * 编译时使用的标志位
         */
    }
}
```

### 7. quote() - 转义特殊字符

```java
public class QuoteMethod {
    
    public static void main(String[] args) {
        // 转义特殊字符
        String literal = "a.b*c+d?e";
        String quoted = Pattern.quote(literal);
        System.out.println("转义后: " + quoted);
        // \Qa.b*c+d?e\E
        
        // 使用转义后的字符串
        Pattern pattern = Pattern.compile(quoted);
        System.out.println(pattern.matcher("a.b*c+d?e").matches());  // true
        System.out.println(pattern.matcher("aXbXcXdXe").matches());  // false
        
        // 实际应用：搜索包含特殊字符的文本
        String searchText = "price: $100.00";
        String escapedSearch = Pattern.quote(searchText);
        Pattern searchPattern = Pattern.compile(escapedSearch);
        
        String text = "The price: $100.00 is final.";
        Matcher matcher = searchPattern.matcher(text);
        if (matcher.find()) {
            System.out.println("找到: " + matcher.group());
        }
        
        /**
         * 方法签名：
         * public static String quote(String s)
         * 
         * 返回：
         * 转义后的字符串（\Q...\E 包裹）
         * 
         * 作用：
         * 将字符串中的所有正则表达式元字符转义
         */
    }
}
```

### 8. asPredicate() - 转换为 Predicate

```java
public class AsPredicateMethod {
    
    public static void main(String[] args) {
        Pattern pattern = Pattern.compile("\\d+");
        
        // 转换为 Predicate
        Predicate<String> predicate = pattern.asPredicate();
        
        // 使用 Predicate
        List<String> list = Arrays.asList("123", "abc", "456", "xyz");
        List<String> numbers = list.stream()
            .filter(predicate)
            .collect(Collectors.toList());
        
        System.out.println(numbers);  // [123, 456]
        
        /**
         * 方法签名：
         * public Predicate<String> asPredicate()
         * 
         * 返回：
         * 一个 Predicate，用于测试字符串是否包含匹配
         * 
         * 注意：
         * - 使用 find() 而非 matches()
         * - 适合 Stream API
         */
    }
}
```

### 9. asMatchPredicate() - 完全匹配的 Predicate

```java
public class AsMatchPredicateMethod {
    
    public static void main(String[] args) {
        Pattern pattern = Pattern.compile("\\d+");
        
        // 转换为完全匹配的 Predicate
        Predicate<String> predicate = pattern.asMatchPredicate();
        
        // 使用 Predicate
        List<String> list = Arrays.asList("123", "abc", "456", "12a");
        List<String> numbers = list.stream()
            .filter(predicate)
            .collect(Collectors.toList());
        
        System.out.println(numbers);  // [123, 456]
        
        /**
         * 方法签名：
         * public Predicate<String> asMatchPredicate()
         * 
         * 返回：
         * 一个 Predicate，用于测试字符串是否完全匹配
         * 
         * 区别：
         * - asPredicate(): 使用 find()，部分匹配
         * - asMatchPredicate(): 使用 matches()，完全匹配
         */
    }
}
```

### 10. splitAsStream() - 分割为 Stream

```java
public class SplitAsStreamMethod {
    
    public static void main(String[] args) {
        Pattern pattern = Pattern.compile("\\s+");
        
        // 分割为 Stream
        Stream<String> stream = pattern.splitAsStream("Hello   World  Java");
        
        // 使用 Stream API
        List<String> result = stream
            .map(String::toUpperCase)
            .collect(Collectors.toList());
        
        System.out.println(result);  // [HELLO, WORLD, JAVA]
        
        // 实际应用：处理大文件
        Pattern linePattern = Pattern.compile("\n");
        try (Stream<String> lines = linePattern.splitAsStream(largeText)) {
            long count = lines
                .filter(line -> line.contains("error"))
                .count();
            System.out.println("错误行数: " + count);
        }
        
        /**
         * 方法签名：
         * public Stream<String> splitAsStream(CharSequence input)
         * 
         * 返回：
         * 分割后的字符串流
         * 
         * 优势：
         * - 惰性求值
         * - 适合处理大数据
         * - 可以与 Stream API 结合
         */
    }
}
```

## 四、Pattern 使用示例

### 1. 邮箱验证

```java
public class EmailValidation {
    
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@" +
        "(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}$"
    );
    
    public static boolean isValidEmail(String email) {
        if (email == null) {
            return false;
        }
        return EMAIL_PATTERN.matcher(email).matches();
    }
    
    public static void main(String[] args) {
        System.out.println(isValidEmail("user@example.com"));     // true
        System.out.println(isValidEmail("user.name@example.com")); // true
        System.out.println(isValidEmail("user@example"));          // false
        System.out.println(isValidEmail("@example.com"));          // false
    }
}
```

### 2. 手机号验证

```java
public class PhoneValidation {
    
    // 中国大陆手机号
    private static final Pattern PHONE_PATTERN = Pattern.compile(
        "^1[3-9]\\d{9}$"
    );
    
    public static boolean isValidPhone(String phone) {
        if (phone == null) {
            return false;
        }
        return PHONE_PATTERN.matcher(phone).matches();
    }
    
    public static void main(String[] args) {
        System.out.println(isValidPhone("13800138000"));  // true
        System.out.println(isValidPhone("12345678901"));  // false
        System.out.println(isValidPhone("138001380"));    // false
    }
}
```

### 3. URL 提取

```java
public class UrlExtraction {
    
    private static final Pattern URL_PATTERN = Pattern.compile(
        "(https?://[\\w\\-]+(\\.[\\w\\-]+)+[/#?]?.*?)",
        Pattern.CASE_INSENSITIVE
    );
    
    public static List<String> extractUrls(String text) {
        List<String> urls = new ArrayList<>();
        Matcher matcher = URL_PATTERN.matcher(text);
        
        while (matcher.find()) {
            urls.add(matcher.group(1));
        }
        
        return urls;
    }
    
    public static void main(String[] args) {
        String text = "Visit https://www.example.com and http://test.com/page";
        List<String> urls = extractUrls(text);
        urls.forEach(System.out::println);
        // https://www.example.com
        // http://test.com/page
    }
}
```

### 4. 敏感词过滤

```java
public class SensitiveWordFilter {
    
    private static final Pattern SENSITIVE_PATTERN;
    
    static {
        // 敏感词列表
        List<String> sensitiveWords = Arrays.asList("敏感词1", "敏感词2", "敏感词3");
        
        // 构建正则表达式
        String regex = sensitiveWords.stream()
            .map(Pattern::quote)  // 转义特殊字符
            .collect(Collectors.joining("|", "(", ")"));
        
        SENSITIVE_PATTERN = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
    }
    
    public static String filter(String text) {
        if (text == null) {
            return null;
        }
        
        Matcher matcher = SENSITIVE_PATTERN.matcher(text);
        return matcher.replaceAll("***");
    }
    
    public static void main(String[] args) {
        String text = "这是一段包含敏感词1和敏感词2的文本";
        String filtered = filter(text);
        System.out.println(filtered);
        // 这是一段包含***和***的文本
    }
}
```

### 5. 日期格式转换

```java
public class DateFormatConversion {
    
    private static final Pattern DATE_PATTERN = Pattern.compile(
        "(\\d{4})-(\\d{2})-(\\d{2})"
    );
    
    public static String convertDateFormat(String date) {
        Matcher matcher = DATE_PATTERN.matcher(date);
        
        if (matcher.find()) {
            String year = matcher.group(1);
            String month = matcher.group(2);
            String day = matcher.group(3);
            
            return day + "/" + month + "/" + year;
        }
        
        return date;
    }
    
    public static void main(String[] args) {
        System.out.println(convertDateFormat("2024-01-15"));  // 15/01/2024
        System.out.println(convertDateFormat("2024-12-31"));  // 31/12/2024
    }
}
```

## 五、Pattern 性能优化

### 1. 重用 Pattern 对象

```java
public class PatternReuse {
    
    // 不推荐：每次都编译
    public static boolean badExample(String text) {
        return Pattern.matches("\\d+", text);  // 每次都重新编译
    }
    
    // 推荐：重用 Pattern
    private static final Pattern NUMBER_PATTERN = Pattern.compile("\\d+");
    
    public static boolean goodExample(String text) {
        return NUMBER_PATTERN.matcher(text).matches();
    }
    
    /**
     * 性能对比：
     * - badExample: 每次调用都编译正则表达式
     * - goodExample: 只编译一次，重复使用
     * 
     * 性能提升：约 10-100 倍
     */
}
```

### 2. 选择合适的方法

```java
public class MethodSelection {
    
    private static final Pattern PATTERN = Pattern.compile("\\d+");
    
    // 场景1：只需要判断是否匹配
    public static boolean checkMatch(String text) {
        return PATTERN.matcher(text).find();  // 使用 find()
    }
    
    // 场景2：需要提取匹配内容
    public static List<String> extractMatches(String text) {
        List<String> matches = new ArrayList<>();
        Matcher matcher = PATTERN.matcher(text);
        while (matcher.find()) {
            matches.add(matcher.group());
        }
        return matches;
    }
    
    // 场景3：替换匹配内容
    public static String replaceMatches(String text) {
        return PATTERN.matcher(text).replaceAll("XXX");
    }
}
```

### 3. 避免回溯

```java
public class AvoidBacktracking {
    
    // 不推荐：可能导致大量回溯
    private static final Pattern BAD_PATTERN = Pattern.compile("(a+)+b");
    
    // 推荐：使用占有量词避免回溯
    private static final Pattern GOOD_PATTERN = Pattern.compile("(a++)b");
    
    /**
     * 回溯问题：
     * - 输入 "aaaaaaaaaaaaaaaaaac" 时
     * - BAD_PATTERN 会尝试大量组合
     * - GOOD_PATTERN 不会回溯
     * 
     * 解决方案：
     * - 使用占有量词：++, *+, ?+
     * - 使用原子组：(?>pattern)
     * - 简化正则表达式
     */
}
```

## 六、常见问题

### 1. Pattern 是线程安全的吗？

```java
/**
 * Pattern 是不可变的、线程安全的
 * 可以在多线程环境中共享同一个 Pattern 对象
 * 
 * Matcher 不是线程安全的
 * 每个线程应该创建自己的 Matcher 对象
 */
public class ThreadSafety {
    
    private static final Pattern PATTERN = Pattern.compile("\\d+");
    
    public static void main(String[] args) {
        // 多线程共享 Pattern（安全）
        ExecutorService executor = Executors.newFixedThreadPool(10);
        
        for (int i = 0; i < 100; i++) {
            final String text = "Number: " + i;
            executor.submit(() -> {
                // 每个线程创建自己的 Matcher
                Matcher matcher = PATTERN.matcher(text);
                if (matcher.find()) {
                    System.out.println(matcher.group());
                }
            });
        }
        
        executor.shutdown();
    }
}
```

### 2. 如何处理 PatternSyntaxException？

```java
public class ExceptionHandling {
    
    public static Pattern compilePattern(String regex) {
        try {
            return Pattern.compile(regex);
        } catch (PatternSyntaxException e) {
            System.err.println("正则表达式语法错误:");
            System.err.println("描述: " + e.getDescription());
            System.err.println("索引: " + e.getIndex());
            System.err.println("模式: " + e.getPattern());
            System.err.println("消息: " + e.getMessage());
            return null;
        }
    }
    
    public static void main(String[] args) {
        // 错误的正则表达式
        Pattern pattern = compilePattern("(abc");  // 缺少右括号
    }
}
```

### 3. Pattern 缓存策略

```java
public class PatternCache {
    
    private static final Map<String, Pattern> CACHE = new ConcurrentHashMap<>();
    
    public static Pattern getPattern(String regex) {
        return CACHE.computeIfAbsent(regex, Pattern::compile);
    }
    
    public static Pattern getPattern(String regex, int flags) {
        String key = regex + ":" + flags;
        return CACHE.computeIfAbsent(key, k -> Pattern.compile(regex, flags));
    }
    
    /**
     * 使用场景：
     * - 动态生成的正则表达式
     * - 用户输入的正则表达式
     * - 避免重复编译
     */
}
```

这份文档详细介绍了 Pattern 类的所有核心方法、使用示例和最佳实践。需要我继续补充其他内容吗？
