# Java 正则表达式核心知识

## 一、正则表达式基础

### 1. 什么是正则表达式

正则表达式（Regular Expression，简称 Regex）是一种用于匹配字符串模式的强大工具。

**主要用途**：
- 字符串匹配和查找
- 字符串替换
- 字符串分割
- 数据验证（邮箱、手机号、身份证等）
- 文本提取

### 2. Java 中的正则表达式

```java
import java.util.regex.Pattern;
import java.util.regex.Matcher;

public class RegexBasic {
    
    public static void main(String[] args) {
        String text = "Hello World 123";
        String regex = "\\d+";  // 匹配数字
        
        // 方式1：使用 String 类方法
        boolean matches = text.matches(".*\\d+.*");
        String replaced = text.replaceAll("\\d+", "XXX");
        String[] parts = text.split("\\s+");
        
        // 方式2：使用 Pattern 和 Matcher
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(text);
        
        if (matcher.find()) {
            System.out.println("找到匹配: " + matcher.group());
        }
    }
}
```

## 二、正则表达式语法

### 1. 普通字符

```java
public class OrdinaryCharacters {
    
    public static void main(String[] args) {
        // 普通字符直接匹配
        System.out.println("abc".matches("abc"));        // true
        System.out.println("ABC".matches("abc"));        // false（区分大小写）
        
        // 字母、数字、下划线
        System.out.println("hello123".matches("\\w+"));  // true
        
        // 任意字符（除换行符）
        System.out.println("a".matches("."));            // true
        System.out.println("1".matches("."));            // true
    }
}
```

### 2. 元字符

| 元字符 | 说明 | 示例 |
|-------|------|------|
| `.` | 匹配任意字符（除换行符） | `a.c` 匹配 "abc", "a1c" |
| `^` | 匹配字符串开头 | `^abc` 匹配以 "abc" 开头 |
| `$` | 匹配字符串结尾 | `abc$` 匹配以 "abc" 结尾 |
| `*` | 匹配前面的字符 0 次或多次 | `ab*c` 匹配 "ac", "abc", "abbc" |
| `+` | 匹配前面的字符 1 次或多次 | `ab+c` 匹配 "abc", "abbc" |
| `?` | 匹配前面的字符 0 次或 1 次 | `ab?c` 匹配 "ac", "abc" |
| `\|` | 或运算符 | `cat\|dog` 匹配 "cat" 或 "dog" |
| `()` | 分组 | `(ab)+` 匹配 "ab", "abab" |
| `[]` | 字符集 | `[abc]` 匹配 "a", "b", "c" |
| `{}` | 量词 | `a{2,4}` 匹配 "aa", "aaa", "aaaa" |

```java
public class Metacharacters {
    
    public static void main(String[] args) {
        // . 任意字符
        System.out.println("abc".matches("a.c"));        // true
        System.out.println("a\nc".matches("a.c"));       // false（.不匹配换行）
        
        // ^ 开头
        System.out.println("abc".matches("^abc"));       // true
        System.out.println("xabc".matches("^abc"));      // false
        
        // $ 结尾
        System.out.println("abc".matches("abc$"));       // true
        System.out.println("abcx".matches("abc$"));      // false
        
        // * 0次或多次
        System.out.println("ac".matches("ab*c"));        // true
        System.out.println("abc".matches("ab*c"));       // true
        System.out.println("abbc".matches("ab*c"));      // true
        
        // + 1次或多次
        System.out.println("ac".matches("ab+c"));        // false
        System.out.println("abc".matches("ab+c"));       // true
        System.out.println("abbc".matches("ab+c"));      // true
        
        // ? 0次或1次
        System.out.println("ac".matches("ab?c"));        // true
        System.out.println("abc".matches("ab?c"));       // true
        System.out.println("abbc".matches("ab?c"));      // false
        
        // | 或
        System.out.println("cat".matches("cat|dog"));    // true
        System.out.println("dog".matches("cat|dog"));    // true
        System.out.println("bird".matches("cat|dog"));   // false
    }
}
```

### 3. 字符类

```java
public class CharacterClasses {
    
    public static void main(String[] args) {
        // [abc] 匹配 a、b 或 c
        System.out.println("a".matches("[abc]"));        // true
        System.out.println("d".matches("[abc]"));        // false
        
        // [^abc] 不匹配 a、b、c
        System.out.println("d".matches("[^abc]"));       // true
        System.out.println("a".matches("[^abc]"));       // false
        
        // [a-z] 匹配 a 到 z
        System.out.println("m".matches("[a-z]"));        // true
        System.out.println("M".matches("[a-z]"));        // false
        
        // [a-zA-Z] 匹配所有字母
        System.out.println("M".matches("[a-zA-Z]"));     // true
        
        // [0-9] 匹配数字
        System.out.println("5".matches("[0-9]"));        // true
        
        // [a-zA-Z0-9] 匹配字母和数字
        System.out.println("a1".matches("[a-zA-Z0-9]+"));// true
    }
}
```

### 4. 预定义字符类

| 字符类 | 说明 | 等价于 |
|-------|------|--------|
| `\d` | 数字 | `[0-9]` |
| `\D` | 非数字 | `[^0-9]` |
| `\w` | 单词字符 | `[a-zA-Z0-9_]` |
| `\W` | 非单词字符 | `[^a-zA-Z0-9_]` |
| `\s` | 空白字符 | `[ \t\n\r\f]` |
| `\S` | 非空白字符 | `[^ \t\n\r\f]` |

```java
public class PredefinedCharacterClasses {
    
    public static void main(String[] args) {
        // \d 数字
        System.out.println("123".matches("\\d+"));       // true
        System.out.println("abc".matches("\\d+"));       // false
        
        // \D 非数字
        System.out.println("abc".matches("\\D+"));       // true
        System.out.println("123".matches("\\D+"));       // false
        
        // \w 单词字符（字母、数字、下划线）
        System.out.println("abc_123".matches("\\w+"));   // true
        System.out.println("abc-123".matches("\\w+"));   // false
        
        // \W 非单词字符
        System.out.println("-".matches("\\W"));          // true
        System.out.println("a".matches("\\W"));          // false
        
        // \s 空白字符
        System.out.println(" ".matches("\\s"));          // true
        System.out.println("\t".matches("\\s"));         // true
        System.out.println("a".matches("\\s"));          // false
        
        // \S 非空白字符
        System.out.println("a".matches("\\S"));          // true
        System.out.println(" ".matches("\\S"));          // false
    }
}
```

### 5. 量词

| 量词 | 说明 |
|------|------|
| `X?` | X 出现 0 次或 1 次 |
| `X*` | X 出现 0 次或多次 |
| `X+` | X 出现 1 次或多次 |
| `X{n}` | X 恰好出现 n 次 |
| `X{n,}` | X 至少出现 n 次 |
| `X{n,m}` | X 出现 n 到 m 次 |

```java
public class Quantifiers {
    
    public static void main(String[] args) {
        // {n} 恰好n次
        System.out.println("aaa".matches("a{3}"));       // true
        System.out.println("aa".matches("a{3}"));        // false
        
        // {n,} 至少n次
        System.out.println("aaa".matches("a{2,}"));      // true
        System.out.println("aaaa".matches("a{2,}"));     // true
        System.out.println("a".matches("a{2,}"));        // false
        
        // {n,m} n到m次
        System.out.println("aa".matches("a{2,4}"));      // true
        System.out.println("aaa".matches("a{2,4}"));     // true
        System.out.println("aaaa".matches("a{2,4}"));    // true
        System.out.println("aaaaa".matches("a{2,4}"));   // false
    }
}
```

### 6. 贪婪与非贪婪

```java
public class GreedyVsReluctant {
    
    public static void main(String[] args) {
        String text = "aaaa";
        
        // 贪婪模式（默认）：尽可能多地匹配
        Pattern greedy = Pattern.compile("a+");
        Matcher m1 = greedy.matcher(text);
        if (m1.find()) {
            System.out.println("贪婪: " + m1.group());   // aaaa
        }
        
        // 非贪婪模式：尽可能少地匹配
        Pattern reluctant = Pattern.compile("a+?");
        Matcher m2 = reluctant.matcher(text);
        while (m2.find()) {
            System.out.println("非贪婪: " + m2.group()); // a (每次只匹配一个)
        }
        
        // 示例：提取HTML标签
        String html = "<div>content1</div><div>content2</div>";
        
        // 贪婪模式
        Pattern greedyPattern = Pattern.compile("<div>.*</div>");
        Matcher greedyMatcher = greedyPattern.matcher(html);
        if (greedyMatcher.find()) {
            System.out.println("贪婪: " + greedyMatcher.group());
            // 输出: <div>content1</div><div>content2</div>
        }
        
        // 非贪婪模式
        Pattern reluctantPattern = Pattern.compile("<div>.*?</div>");
        Matcher reluctantMatcher = reluctantPattern.matcher(html);
        while (reluctantMatcher.find()) {
            System.out.println("非贪婪: " + reluctantMatcher.group());
            // 输出: <div>content1</div>
            //      <div>content2</div>
        }
    }
    
    /**
     * 贪婪量词：
     * X?  X*  X+  X{n,m}
     * 
     * 非贪婪量词（在量词后加?）：
     * X??  X*?  X+?  X{n,m}?
     * 
     * 占有量词（在量词后加+）：
     * X?+  X*+  X++  X{n,m}+
     */
}
```

### 7. 边界匹配

| 边界 | 说明 |
|------|------|
| `^` | 行的开头 |
| `$` | 行的结尾 |
| `\b` | 单词边界 |
| `\B` | 非单词边界 |
| `\A` | 输入的开头 |
| `\Z` | 输入的结尾 |

```java
public class BoundaryMatchers {
    
    public static void main(String[] args) {
        // \b 单词边界
        String text = "cat cats category";
        
        Pattern pattern1 = Pattern.compile("\\bcat\\b");
        Matcher matcher1 = pattern1.matcher(text);
        while (matcher1.find()) {
            System.out.println("找到: " + matcher1.group());  // 只匹配 "cat"
        }
        
        // \B 非单词边界
        Pattern pattern2 = Pattern.compile("\\Bcat\\B");
        Matcher matcher2 = pattern2.matcher(text);
        while (matcher2.find()) {
            System.out.println("找到: " + matcher2.group());  // 匹配 "category" 中的 "cat"
        }
        
        // ^ 和 $ 多行模式
        String multiline = "line1\nline2\nline3";
        
        // 默认模式：^ 和 $ 匹配整个字符串
        Pattern pattern3 = Pattern.compile("^line1$");
        System.out.println(pattern3.matcher(multiline).find());  // false
        
        // 多行模式：^ 和 $ 匹配每一行
        Pattern pattern4 = Pattern.compile("^line1$", Pattern.MULTILINE);
        System.out.println(pattern4.matcher(multiline).find());  // true
    }
}
```

## 三、Pattern 和 Matcher

### 1. Pattern 类

```java
public class PatternExample {
    
    public static void main(String[] args) {
        // 编译正则表达式
        Pattern pattern = Pattern.compile("\\d+");
        
        // 带标志编译
        Pattern caseInsensitive = Pattern.compile("abc", Pattern.CASE_INSENSITIVE);
        Pattern multiline = Pattern.compile("^abc$", Pattern.MULTILINE);
        Pattern dotall = Pattern.compile(".*", Pattern.DOTALL);  // . 匹配换行符
        
        // 多个标志
        Pattern combined = Pattern.compile("abc", 
            Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
        
        // 获取正则表达式
        String regex = pattern.pattern();
        System.out.println("正则表达式: " + regex);
        
        // 分割字符串
        String text = "a1b2c3";
        String[] parts = pattern.split(text);
        System.out.println(Arrays.toString(parts));  // [a, b, c]
        
        // 快速匹配
        boolean matches = Pattern.matches("\\d+", "123");
        System.out.println("匹配结果: " + matches);  // true
    }
    
    /**
     * Pattern 标志：
     * 
     * CASE_INSENSITIVE: 忽略大小写
     * MULTILINE: 多行模式，^ 和 $ 匹配每一行
     * DOTALL: . 匹配所有字符（包括换行符）
     * UNICODE_CASE: Unicode 大小写
     * CANON_EQ: 规范等价
     * UNIX_LINES: Unix 行模式
     * LITERAL: 字面值模式
     * COMMENTS: 注释模式（忽略空白和 # 注释）
     */
}
```

### 2. Matcher 类

```java
public class MatcherExample {
    
    public static void main(String[] args) {
        String text = "Hello 123 World 456";
        Pattern pattern = Pattern.compile("\\d+");
        Matcher matcher = pattern.matcher(text);
        
        // 1. find() - 查找下一个匹配
        while (matcher.find()) {
            System.out.println("找到: " + matcher.group());
            System.out.println("起始位置: " + matcher.start());
            System.out.println("结束位置: " + matcher.end());
        }
        
        // 2. matches() - 整个字符串是否匹配
        Matcher matcher2 = Pattern.compile("\\d+").matcher("123");
        System.out.println("完全匹配: " + matcher2.matches());  // true
        
        // 3. lookingAt() - 从开头开始匹配
        Matcher matcher3 = Pattern.compile("\\d+").matcher("123abc");
        System.out.println("开头匹配: " + matcher3.lookingAt());  // true
        
        // 4. replaceAll() - 替换所有匹配
        String replaced = matcher.replaceAll("XXX");
        System.out.println("替换后: " + replaced);  // Hello XXX World XXX
        
        // 5. replaceFirst() - 替换第一个匹配
        matcher.reset();
        String replacedFirst = matcher.replaceFirst("XXX");
        System.out.println("替换第一个: " + replacedFirst);  // Hello XXX World 456
        
        // 6. appendReplacement() 和 appendTail() - 自定义替换
        matcher.reset();
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String replacement = "[" + matcher.group() + "]";
            matcher.appendReplacement(sb, replacement);
        }
        matcher.appendTail(sb);
        System.out.println("自定义替换: " + sb.toString());
        // Hello [123] World [456]
    }
}
```

### 3. 分组和捕获

```java
public class GroupingExample {
    
    public static void main(String[] args) {
        // 基本分组
        String text = "2024-01-15";
        Pattern pattern = Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})");
        Matcher matcher = pattern.matcher(text);
        
        if (matcher.find()) {
            System.out.println("完整匹配: " + matcher.group(0));  // 2024-01-15
            System.out.println("年: " + matcher.group(1));        // 2024
            System.out.println("月: " + matcher.group(2));        // 01
            System.out.println("日: " + matcher.group(3));        // 15
            System.out.println("分组数量: " + matcher.groupCount());  // 3
        }
        
        // 命名分组
        String regex = "(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})";
        Pattern namedPattern = Pattern.compile(regex);
        Matcher namedMatcher = namedPattern.matcher(text);
        
        if (namedMatcher.find()) {
            System.out.println("年: " + namedMatcher.group("year"));   // 2024
            System.out.println("月: " + namedMatcher.group("month"));  // 01
            System.out.println("日: " + namedMatcher.group("day"));    // 15
        }
        
        // 非捕获分组
        String text2 = "http://www.example.com";
        Pattern pattern2 = Pattern.compile("(?:http|https)://(.+)");
        Matcher matcher2 = pattern2.matcher(text2);
        
        if (matcher2.find()) {
            System.out.println("域名: " + matcher2.group(1));  // www.example.com
            // (?:http|https) 不会被捕获
        }
        
        // 反向引用
        String text3 = "hello hello";
        Pattern pattern3 = Pattern.compile("(\\w+)\\s+\\1");  // \1 引用第一个分组
        Matcher matcher3 = pattern3.matcher(text3);
        System.out.println("重复单词: " + matcher3.matches());  // true
    }
    
    /**
     * 分组类型：
     * 
     * (pattern)        - 捕获分组
     * (?<name>pattern) - 命名捕获分组
     * (?:pattern)      - 非捕获分组
     * (?=pattern)      - 正向前瞻
     * (?!pattern)      - 负向前瞻
     * (?<=pattern)     - 正向后顾
     * (?<!pattern)     - 负向后顾
     */
}
```

