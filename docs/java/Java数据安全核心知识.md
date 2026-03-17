# Java数据安全核心知识

## 一、加密算法

### 1. 对称加密

#### AES（Advanced Encryption Standard）

**特点**：
- 密钥长度：128、192、256位
- 加密速度快
- 安全性高
- 适合大量数据加密

**实现示例**：

```java
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public class AESUtil {
    
    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/ECB/PKCS5Padding";
    
    // 生成密钥
    public static String generateKey() throws Exception {
        KeyGenerator keyGen = KeyGenerator.getInstance(ALGORITHM);
        keyGen.init(256);
        SecretKey secretKey = keyGen.generateKey();
        return Base64.getEncoder().encodeToString(secretKey.getEncoded());
    }
    
    // 加密
    public static String encrypt(String data, String key) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(key);
        SecretKeySpec secretKey = new SecretKeySpec(keyBytes, ALGORITHM);
        
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey);
        
        byte[] encryptedBytes = cipher.doFinal(data.getBytes("UTF-8"));
        return Base64.getEncoder().encodeToString(encryptedBytes);
    }
    
    // 解密
    public static String decrypt(String encryptedData, String key) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(key);
        SecretKeySpec secretKey = new SecretKeySpec(keyBytes, ALGORITHM);
        
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, secretKey);
        
        byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedData));
        return new String(decryptedBytes, "UTF-8");
    }
}
```

**AES加密模式**：

| 模式 | 说明 | 特点 |
|------|------|------|
| ECB | 电子密码本模式 | 简单但不安全，相同明文产生相同密文 |
| CBC | 密码分组链接模式 | 需要IV向量，安全性较高 |
| CTR | 计数器模式 | 可并行处理，性能好 |
| GCM | 伽罗瓦计数器模式 | 提供加密和认证，推荐使用 |

**AES-GCM示例**：

```java
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

public class AESGCMUtil {
    
    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;
    
    public static String encrypt(String data, String key) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(key);
        SecretKeySpec secretKey = new SecretKeySpec(keyBytes, ALGORITHM);
        
        // 生成随机IV
        byte[] iv = new byte[IV_LENGTH];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);
        
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, gcmSpec);
        
        byte[] encryptedBytes = cipher.doFinal(data.getBytes("UTF-8"));
        
        // IV + 密文
        byte[] result = new byte[iv.length + encryptedBytes.length];
        System.arraycopy(iv, 0, result, 0, iv.length);
        System.arraycopy(encryptedBytes, 0, result, iv.length, encryptedBytes.length);
        
        return Base64.getEncoder().encodeToString(result);
    }
    
    public static String decrypt(String encryptedData, String key) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(key);
        SecretKeySpec secretKey = new SecretKeySpec(keyBytes, ALGORITHM);
        
        byte[] decoded = Base64.getDecoder().decode(encryptedData);
        
        // 提取IV
        byte[] iv = new byte[IV_LENGTH];
        System.arraycopy(decoded, 0, iv, 0, IV_LENGTH);
        
        // 提取密文
        byte[] cipherText = new byte[decoded.length - IV_LENGTH];
        System.arraycopy(decoded, IV_LENGTH, cipherText, 0, cipherText.length);
        
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec);
        
        byte[] decryptedBytes = cipher.doFinal(cipherText);
        return new String(decryptedBytes, "UTF-8");
    }
}
```

#### DES/3DES

**特点**：
- DES密钥长度56位（已不安全）
- 3DES使用3个密钥，安全性提升
- 性能较AES差
- 逐渐被AES替代

### 2. 非对称加密

#### RSA

**特点**：
- 公钥加密，私钥解密
- 私钥签名，公钥验签
- 密钥长度：1024、2048、4096位
- 加密速度慢，适合小数据

**实现示例**：

```java
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import javax.crypto.Cipher;

public class RSAUtil {
    
    private static final String ALGORITHM = "RSA";
    private static final int KEY_SIZE = 2048;
    
    // 生成密钥对
    public static KeyPair generateKeyPair() throws Exception {
        KeyPairGenerator keyGen = KeyPairGenerator.getInstance(ALGORITHM);
        keyGen.initialize(KEY_SIZE);
        return keyGen.generateKeyPair();
    }
    
    // 公钥加密
    public static String encrypt(String data, String publicKeyStr) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(publicKeyStr);
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(keyBytes);
        KeyFactory keyFactory = KeyFactory.getInstance(ALGORITHM);
        PublicKey publicKey = keyFactory.generatePublic(keySpec);
        
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.ENCRYPT_MODE, publicKey);
        
        byte[] encryptedBytes = cipher.doFinal(data.getBytes("UTF-8"));
        return Base64.getEncoder().encodeToString(encryptedBytes);
    }
    
    // 私钥解密
    public static String decrypt(String encryptedData, String privateKeyStr) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(privateKeyStr);
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(keyBytes);
        KeyFactory keyFactory = KeyFactory.getInstance(ALGORITHM);
        PrivateKey privateKey = keyFactory.generatePrivate(keySpec);
        
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, privateKey);
        
        byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedData));
        return new String(decryptedBytes, "UTF-8");
    }
    
    // 私钥签名
    public static String sign(String data, String privateKeyStr) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(privateKeyStr);
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(keyBytes);
        KeyFactory keyFactory = KeyFactory.getInstance(ALGORITHM);
        PrivateKey privateKey = keyFactory.generatePrivate(keySpec);
        
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(privateKey);
        signature.update(data.getBytes("UTF-8"));
        
        byte[] signBytes = signature.sign();
        return Base64.getEncoder().encodeToString(signBytes);
    }
    
    // 公钥验签
    public static boolean verify(String data, String signStr, String publicKeyStr) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(publicKeyStr);
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(keyBytes);
        KeyFactory keyFactory = KeyFactory.getInstance(ALGORITHM);
        PublicKey publicKey = keyFactory.generatePublic(keySpec);
        
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initVerify(publicKey);
        signature.update(data.getBytes("UTF-8"));
        
        return signature.verify(Base64.getDecoder().decode(signStr));
    }
}
```

### 3. 哈希算法

#### MD5（不推荐用于安全场景）

```java
import java.security.MessageDigest;

public class MD5Util {
    
    public static String md5(String data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] hashBytes = md.digest(data.getBytes("UTF-8"));
        
        StringBuilder sb = new StringBuilder();
        for (byte b : hashBytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
```

#### SHA-256（推荐）

```java
import java.security.MessageDigest;

public class SHA256Util {
    
    public static String sha256(String data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hashBytes = md.digest(data.getBytes("UTF-8"));
        
        StringBuilder sb = new StringBuilder();
        for (byte b : hashBytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
    
    // 加盐哈希
    public static String sha256WithSalt(String data, String salt) throws Exception {
        return sha256(data + salt);
    }
}
```

#### HMAC

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public class HMACUtil {
    
    public static String hmacSHA256(String data, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(key.getBytes("UTF-8"), "HmacSHA256");
        mac.init(secretKey);
        
        byte[] hashBytes = mac.doFinal(data.getBytes("UTF-8"));
        return Base64.getEncoder().encodeToString(hashBytes);
    }
}
```

## 二、密码安全

### 1. BCrypt（推荐）

**特点**：
- 自动加盐
- 可调节计算强度
- 防止彩虹表攻击
- 适合密码存储

```java
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordUtil {
    
    private static final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    
    // 加密密码
    public static String encode(String password) {
        return encoder.encode(password);
    }
    
    // 验证密码
    public static boolean matches(String rawPassword, String encodedPassword) {
        return encoder.matches(rawPassword, encodedPassword);
    }
}
```

### 2. PBKDF2

```java
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

public class PBKDF2Util {
    
    private static final int ITERATIONS = 10000;
    private static final int KEY_LENGTH = 256;
    
    // 生成盐
    public static String generateSalt() {
        SecureRandom random = new SecureRandom();
        byte[] salt = new byte[16];
        random.nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }
    
    // 加密密码
    public static String hash(String password, String salt) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(
            password.toCharArray(),
            Base64.getDecoder().decode(salt),
            ITERATIONS,
            KEY_LENGTH
        );
        
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        byte[] hash = factory.generateSecret(spec).getEncoded();
        
        return Base64.getEncoder().encodeToString(hash);
    }
    
    // 验证密码
    public static boolean verify(String password, String salt, String hash) throws Exception {
        String newHash = hash(password, salt);
        return newHash.equals(hash);
    }
}
```

### 3. 密码强度校验

```java
import java.util.regex.Pattern;

public class PasswordValidator {
    
    // 至少8位，包含大小写字母、数字、特殊字符
    private static final Pattern STRONG_PASSWORD = Pattern.compile(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
    );
    
    public static boolean isStrong(String password) {
        return STRONG_PASSWORD.matcher(password).matches();
    }
    
    public static String validatePassword(String password) {
        if (password == null || password.length() < 8) {
            return "密码长度至少8位";
        }
        if (!password.matches(".*[a-z].*")) {
            return "密码必须包含小写字母";
        }
        if (!password.matches(".*[A-Z].*")) {
            return "密码必须包含大写字母";
        }
        if (!password.matches(".*\\d.*")) {
            return "密码必须包含数字";
        }
        if (!password.matches(".*[@$!%*?&].*")) {
            return "密码必须包含特殊字符";
        }
        return null;
    }
}
```

## 三、数据脱敏

### 1. 常见脱敏规则

```java
public class DataMaskUtil {
    
    // 手机号脱敏：138****8888
    public static String maskPhone(String phone) {
        if (phone == null || phone.length() != 11) {
            return phone;
        }
        return phone.replaceAll("(\\d{3})\\d{4}(\\d{4})", "$1****$2");
    }
    
    // 身份证脱敏：110***********1234
    public static String maskIdCard(String idCard) {
        if (idCard == null || idCard.length() < 8) {
            return idCard;
        }
        return idCard.replaceAll("(\\d{3})\\d+(\\d{4})", "$1***********$2");
    }
    
    // 邮箱脱敏：abc***@example.com
    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }
        String[] parts = email.split("@");
        String username = parts[0];
        if (username.length() <= 3) {
            return username.charAt(0) + "***@" + parts[1];
        }
        return username.substring(0, 3) + "***@" + parts[1];
    }
    
    // 银行卡脱敏：6222 **** **** 1234
    public static String maskBankCard(String bankCard) {
        if (bankCard == null || bankCard.length() < 8) {
            return bankCard;
        }
        return bankCard.replaceAll("(\\d{4})\\d+(\\d{4})", "$1 **** **** $2");
    }
    
    // 姓名脱敏：张*、欧阳**
    public static String maskName(String name) {
        if (name == null || name.length() == 0) {
            return name;
        }
        if (name.length() == 1) {
            return name;
        }
        return name.charAt(0) + "*".repeat(name.length() - 1);
    }
    
    // 地址脱敏：保留省市，其他用*代替
    public static String maskAddress(String address) {
        if (address == null || address.length() <= 6) {
            return address;
        }
        return address.substring(0, 6) + "****";
    }
}
```

### 2. 注解式脱敏

```java
import java.lang.annotation.*;

@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Sensitive {
    SensitiveType type();
}

public enum SensitiveType {
    PHONE,
    ID_CARD,
    EMAIL,
    BANK_CARD,
    NAME,
    ADDRESS
}
```

```java
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.BeanProperty;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.ContextualSerializer;

import java.io.IOException;

public class SensitiveSerializer extends JsonSerializer<String> implements ContextualSerializer {
    
    private SensitiveType type;
    
    @Override
    public void serialize(String value, JsonGenerator gen, SerializerProvider serializers) 
            throws IOException {
        if (value == null) {
            gen.writeNull();
            return;
        }
        
        String maskedValue = switch (type) {
            case PHONE -> DataMaskUtil.maskPhone(value);
            case ID_CARD -> DataMaskUtil.maskIdCard(value);
            case EMAIL -> DataMaskUtil.maskEmail(value);
            case BANK_CARD -> DataMaskUtil.maskBankCard(value);
            case NAME -> DataMaskUtil.maskName(value);
            case ADDRESS -> DataMaskUtil.maskAddress(value);
        };
        
        gen.writeString(maskedValue);
    }
    
    @Override
    public JsonSerializer<?> createContextual(SerializerProvider prov, BeanProperty property) {
        if (property != null) {
            Sensitive sensitive = property.getAnnotation(Sensitive.class);
            if (sensitive != null) {
                SensitiveSerializer serializer = new SensitiveSerializer();
                serializer.type = sensitive.type();
                return serializer;
            }
        }
        return this;
    }
}
```

**使用示例**：

```java
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

public class User {
    
    private Long id;
    
    @Sensitive(type = SensitiveType.NAME)
    @JsonSerialize(using = SensitiveSerializer.class)
    private String name;
    
    @Sensitive(type = SensitiveType.PHONE)
    @JsonSerialize(using = SensitiveSerializer.class)
    private String phone;
    
    @Sensitive(type = SensitiveType.ID_CARD)
    @JsonSerialize(using = SensitiveSerializer.class)
    private String idCard;
    
    @Sensitive(type = SensitiveType.EMAIL)
    @JsonSerialize(using = SensitiveSerializer.class)
    private String email;
    
    // getters and setters
}
```


## 四、SQL注入防护

### 1. 使用PreparedStatement

```java
// 不安全：SQL注入风险
public User findByUsername(String username) {
    String sql = "SELECT * FROM users WHERE username = '" + username + "'";
    // 攻击者输入：admin' OR '1'='1
    return jdbcTemplate.queryForObject(sql, new BeanPropertyRowMapper<>(User.class));
}

// 安全：使用参数化查询
public User findByUsername(String username) {
    String sql = "SELECT * FROM users WHERE username = ?";
    return jdbcTemplate.queryForObject(sql, new BeanPropertyRowMapper<>(User.class), username);
}
```

### 2. MyBatis防注入

```xml
<!-- 不安全：${} 直接拼接 -->
<select id="findByUsername" resultType="User">
    SELECT * FROM users WHERE username = '${username}'
</select>

<!-- 安全：#{} 预编译 -->
<select id="findByUsername" resultType="User">
    SELECT * FROM users WHERE username = #{username}
</select>

<!-- 动态排序场景：白名单验证 -->
<select id="findUsers" resultType="User">
    SELECT * FROM users
    <if test="orderBy != null">
        ORDER BY
        <choose>
            <when test="orderBy == 'name'">name</when>
            <when test="orderBy == 'age'">age</when>
            <otherwise>id</otherwise>
        </choose>
    </if>
</select>
```

### 3. 输入验证

```java
import org.springframework.util.StringUtils;

public class SQLInjectionValidator {
    
    // SQL关键字黑名单
    private static final String[] SQL_KEYWORDS = {
        "select", "insert", "update", "delete", "drop", "create",
        "alter", "exec", "execute", "script", "union", "and", "or"
    };
    
    public static boolean isSafe(String input) {
        if (!StringUtils.hasText(input)) {
            return true;
        }
        
        String lowerInput = input.toLowerCase();
        for (String keyword : SQL_KEYWORDS) {
            if (lowerInput.contains(keyword)) {
                return false;
            }
        }
        
        // 检查特殊字符
        if (lowerInput.contains("'") || lowerInput.contains("\"") || 
            lowerInput.contains(";") || lowerInput.contains("--")) {
            return false;
        }
        
        return true;
    }
}
```

## 五、XSS防护

### 1. HTML转义

```java
import org.springframework.web.util.HtmlUtils;

public class XSSUtil {
    
    // 转义HTML特殊字符
    public static String escapeHtml(String input) {
        if (input == null) {
            return null;
        }
        return HtmlUtils.htmlEscape(input);
    }
    
    // 手动转义
    public static String escape(String input) {
        if (input == null) {
            return null;
        }
        
        return input.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&#x27;")
                    .replace("/", "&#x2F;");
    }
}
```

### 2. 过滤器防护

```java
import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import java.io.IOException;

public class XSSFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        chain.doFilter(new XSSRequestWrapper((HttpServletRequest) request), response);
    }
    
    static class XSSRequestWrapper extends HttpServletRequestWrapper {
        
        public XSSRequestWrapper(HttpServletRequest request) {
            super(request);
        }
        
        @Override
        public String getParameter(String name) {
            String value = super.getParameter(name);
            return cleanXSS(value);
        }
        
        @Override
        public String[] getParameterValues(String name) {
            String[] values = super.getParameterValues(name);
            if (values == null) {
                return null;
            }
            
            String[] cleanValues = new String[values.length];
            for (int i = 0; i < values.length; i++) {
                cleanValues[i] = cleanXSS(values[i]);
            }
            return cleanValues;
        }
        
        private String cleanXSS(String value) {
            if (value == null) {
                return null;
            }
            
            // 移除脚本标签
            value = value.replaceAll("<script>(.*?)</script>", "");
            value = value.replaceAll("javascript:", "");
            value = value.replaceAll("onerror=", "");
            value = value.replaceAll("onclick=", "");
            
            // HTML转义
            return XSSUtil.escape(value);
        }
    }
}
```

### 3. CSP（内容安全策略）

```java
import javax.servlet.*;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class CSPFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        // 设置CSP头
        httpResponse.setHeader("Content-Security-Policy",
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self' data:; " +
            "connect-src 'self';"
        );
        
        chain.doFilter(request, response);
    }
}
```

## 六、CSRF防护

### 1. Token验证

```java
import org.springframework.stereotype.Component;
import javax.servlet.http.HttpSession;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class CSRFTokenManager {
    
    private static final String CSRF_TOKEN_KEY = "CSRF_TOKEN";
    
    // 生成Token
    public String generateToken(HttpSession session) {
        byte[] tokenBytes = new byte[32];
        new SecureRandom().nextBytes(tokenBytes);
        String token = Base64.getEncoder().encodeToString(tokenBytes);
        
        session.setAttribute(CSRF_TOKEN_KEY, token);
        return token;
    }
    
    // 验证Token
    public boolean validateToken(HttpSession session, String token) {
        String sessionToken = (String) session.getAttribute(CSRF_TOKEN_KEY);
        return sessionToken != null && sessionToken.equals(token);
    }
}
```

### 2. Spring Security配置

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf()
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            .and()
            .authorizeRequests()
                .anyRequest().authenticated();
        
        return http.build();
    }
}
```

## 七、敏感数据加密存储

### 1. 数据库字段加密

```java
import javax.persistence.*;

@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String username;
    
    @Convert(converter = EncryptConverter.class)
    private String phone;
    
    @Convert(converter = EncryptConverter.class)
    private String idCard;
    
    // getters and setters
}
```

```java
import javax.persistence.AttributeConverter;
import javax.persistence.Converter;

@Converter
public class EncryptConverter implements AttributeConverter<String, String> {
    
    private static final String SECRET_KEY = "your-secret-key";
    
    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return AESUtil.encrypt(attribute, SECRET_KEY);
        } catch (Exception e) {
            throw new RuntimeException("加密失败", e);
        }
    }
    
    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            return AESUtil.decrypt(dbData, SECRET_KEY);
        } catch (Exception e) {
            throw new RuntimeException("解密失败", e);
        }
    }
}
```

### 2. MyBatis拦截器加密

```java
import org.apache.ibatis.executor.parameter.ParameterHandler;
import org.apache.ibatis.plugin.*;
import java.lang.reflect.Field;
import java.sql.PreparedStatement;
import java.util.Properties;

@Intercepts({
    @Signature(type = ParameterHandler.class, method = "setParameters", args = PreparedStatement.class)
})
public class EncryptInterceptor implements Interceptor {
    
    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        ParameterHandler parameterHandler = (ParameterHandler) invocation.getTarget();
        Object parameterObject = parameterHandler.getParameterObject();
        
        if (parameterObject != null) {
            encryptFields(parameterObject);
        }
        
        return invocation.proceed();
    }
    
    private void encryptFields(Object obj) throws Exception {
        Field[] fields = obj.getClass().getDeclaredFields();
        for (Field field : fields) {
            if (field.isAnnotationPresent(Encrypted.class)) {
                field.setAccessible(true);
                Object value = field.get(obj);
                if (value instanceof String) {
                    String encrypted = AESUtil.encrypt((String) value, "secret-key");
                    field.set(obj, encrypted);
                }
            }
        }
    }
}
```

## 八、API安全

### 1. 签名验证

```java
import java.util.*;
import java.util.stream.Collectors;

public class SignatureUtil {
    
    // 生成签名
    public static String generateSign(Map<String, String> params, String secretKey) throws Exception {
        // 1. 参数排序
        String sortedParams = params.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(e -> e.getKey() + "=" + e.getValue())
            .collect(Collectors.joining("&"));
        
        // 2. 拼接密钥
        String signStr = sortedParams + "&key=" + secretKey;
        
        // 3. MD5/SHA256加密
        return SHA256Util.sha256(signStr);
    }
    
    // 验证签名
    public static boolean verifySign(Map<String, String> params, String sign, String secretKey) 
            throws Exception {
        String expectedSign = generateSign(params, secretKey);
        return expectedSign.equals(sign);
    }
}
```

### 2. 时间戳防重放

```java
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import java.util.concurrent.TimeUnit;

@Component
public class ReplayAttackValidator {
    
    private final StringRedisTemplate redisTemplate;
    private static final long VALID_TIME = 5 * 60 * 1000; // 5分钟
    
    public ReplayAttackValidator(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    // 验证时间戳和nonce
    public boolean validate(String timestamp, String nonce) {
        // 1. 验证时间戳
        long requestTime = Long.parseLong(timestamp);
        long currentTime = System.currentTimeMillis();
        if (Math.abs(currentTime - requestTime) > VALID_TIME) {
            return false;
        }
        
        // 2. 验证nonce唯一性
        String key = "nonce:" + nonce;
        Boolean success = redisTemplate.opsForValue().setIfAbsent(key, "1", VALID_TIME, TimeUnit.MILLISECONDS);
        return Boolean.TRUE.equals(success);
    }
}
```

### 3. 接口限流

```java
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import java.util.concurrent.TimeUnit;

@Component
public class RateLimiter {
    
    private final StringRedisTemplate redisTemplate;
    
    public RateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    // 固定窗口限流
    public boolean tryAcquire(String key, int maxRequests, long windowSeconds) {
        String redisKey = "rate_limit:" + key;
        Long count = redisTemplate.opsForValue().increment(redisKey);
        
        if (count == 1) {
            redisTemplate.expire(redisKey, windowSeconds, TimeUnit.SECONDS);
        }
        
        return count <= maxRequests;
    }
    
    // 滑动窗口限流
    public boolean tryAcquireSliding(String key, int maxRequests, long windowSeconds) {
        String redisKey = "rate_limit:sliding:" + key;
        long currentTime = System.currentTimeMillis();
        long windowStart = currentTime - windowSeconds * 1000;
        
        // 移除过期记录
        redisTemplate.opsForZSet().removeRangeByScore(redisKey, 0, windowStart);
        
        // 获取当前窗口内的请求数
        Long count = redisTemplate.opsForZSet().zCard(redisKey);
        
        if (count < maxRequests) {
            redisTemplate.opsForZSet().add(redisKey, String.valueOf(currentTime), currentTime);
            redisTemplate.expire(redisKey, windowSeconds, TimeUnit.SECONDS);
            return true;
        }
        
        return false;
    }
}
```

### 4. JWT Token

```java
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.util.Date;
import java.util.Map;

public class JWTUtil {
    
    private static final String SECRET = "your-256-bit-secret-key-here-must-be-long-enough";
    private static final long EXPIRATION = 24 * 60 * 60 * 1000; // 24小时
    
    private static final Key key = Keys.hmacShaKeyFor(SECRET.getBytes());
    
    // 生成Token
    public static String generateToken(String subject, Map<String, Object> claims) {
        Date now = new Date();
        Date expiration = new Date(now.getTime() + EXPIRATION);
        
        return Jwts.builder()
            .setSubject(subject)
            .addClaims(claims)
            .setIssuedAt(now)
            .setExpiration(expiration)
            .signWith(key, SignatureAlgorithm.HS256)
            .compact();
    }
    
    // 解析Token
    public static Claims parseToken(String token) {
        try {
            return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
        } catch (ExpiredJwtException e) {
            throw new RuntimeException("Token已过期");
        } catch (JwtException e) {
            throw new RuntimeException("Token无效");
        }
    }
    
    // 验证Token
    public static boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    // 刷新Token
    public static String refreshToken(String token) {
        Claims claims = parseToken(token);
        return generateToken(claims.getSubject(), claims);
    }
}
```

## 九、文件上传安全

### 1. 文件类型验证

```java
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;

public class FileValidator {
    
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
        "jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx"
    );
    
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    
    // 验证文件扩展名
    public static boolean validateExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return false;
        }
        
        String extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        return ALLOWED_EXTENSIONS.contains(extension);
    }
    
    // 验证文件大小
    public static boolean validateSize(MultipartFile file) {
        return file.getSize() <= MAX_FILE_SIZE;
    }
    
    // 验证文件魔数（真实类型）
    public static boolean validateMagicNumber(MultipartFile file) throws IOException {
        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[8];
            is.read(header);
            
            String hexHeader = bytesToHex(header);
            
            // JPEG: FFD8FF
            if (hexHeader.startsWith("FFD8FF")) {
                return true;
            }
            // PNG: 89504E47
            if (hexHeader.startsWith("89504E47")) {
                return true;
            }
            // GIF: 474946
            if (hexHeader.startsWith("474946")) {
                return true;
            }
            // PDF: 25504446
            if (hexHeader.startsWith("25504446")) {
                return true;
            }
            
            return false;
        }
    }
    
    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }
}
```

### 2. 文件上传处理

```java
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/file")
public class FileUploadController {
    
    private static final String UPLOAD_DIR = "/data/uploads/";
    
    @PostMapping("/upload")
    public String upload(@RequestParam("file") MultipartFile file) throws IOException {
        // 1. 验证文件
        if (file.isEmpty()) {
            throw new RuntimeException("文件为空");
        }
        
        if (!FileValidator.validateExtension(file.getOriginalFilename())) {
            throw new RuntimeException("不支持的文件类型");
        }
        
        if (!FileValidator.validateSize(file)) {
            throw new RuntimeException("文件大小超过限制");
        }
        
        if (!FileValidator.validateMagicNumber(file)) {
            throw new RuntimeException("文件类型不匹配");
        }
        
        // 2. 生成安全的文件名
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        String filename = UUID.randomUUID().toString() + extension;
        
        // 3. 保存文件
        File dest = new File(UPLOAD_DIR + filename);
        dest.getParentFile().mkdirs();
        file.transferTo(dest);
        
        return filename;
    }
}
```

## 十、日志安全

### 1. 敏感信息过滤

```java
import ch.qos.logback.classic.PatternLayout;
import ch.qos.logback.classic.spi.ILoggingEvent;

public class SensitiveDataPatternLayout extends PatternLayout {
    
    @Override
    public String doLayout(ILoggingEvent event) {
        String message = super.doLayout(event);
        
        // 过滤手机号
        message = message.replaceAll("(\\d{3})\\d{4}(\\d{4})", "$1****$2");
        
        // 过滤身份证
        message = message.replaceAll("(\\d{6})\\d{8}(\\d{4})", "$1********$2");
        
        // 过滤邮箱
        message = message.replaceAll("([\\w.]+)@([\\w.]+)", "***@$2");
        
        // 过滤密码字段
        message = message.replaceAll("(password|pwd)=[^&\\s]+", "$1=******");
        
        return message;
    }
}
```

### 2. 审计日志

```java
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.stereotype.Component;
import javax.servlet.http.HttpServletRequest;

@Aspect
@Component
public class AuditLogAspect {
    
    private final HttpServletRequest request;
    
    public AuditLogAspect(HttpServletRequest request) {
        this.request = request;
    }
    
    @Pointcut("@annotation(com.example.annotation.AuditLog)")
    public void auditLogPointcut() {}
    
    @AfterReturning(pointcut = "auditLogPointcut()", returning = "result")
    public void afterReturning(JoinPoint joinPoint, Object result) {
        // 记录操作日志
        String username = getCurrentUsername();
        String ip = getClientIP();
        String method = joinPoint.getSignature().getName();
        Object[] args = joinPoint.getArgs();
        
        // 保存到数据库或日志文件
        saveAuditLog(username, ip, method, args, result);
    }
    
    private String getCurrentUsername() {
        // 从SecurityContext获取当前用户
        return "admin";
    }
    
    private String getClientIP() {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
    
    private void saveAuditLog(String username, String ip, String method, Object[] args, Object result) {
        // 实现日志保存逻辑
    }
}
```

## 十一、安全配置最佳实践

### 1. HTTPS配置

```yaml
server:
  port: 8443
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: password
    key-store-type: PKCS12
    key-alias: tomcat
```

### 2. 安全响应头

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityHeadersConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .headers()
                .contentSecurityPolicy("default-src 'self'")
            .and()
                .xssProtection()
            .and()
                .contentTypeOptions()
            .and()
                .frameOptions().deny()
            .and()
                .httpStrictTransportSecurity()
                    .maxAgeInSeconds(31536000)
                    .includeSubDomains(true);
        
        return http.build();
    }
}
```

### 3. 密钥管理

```java
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KeyManagementConfig {
    
    // 从环境变量读取
    @Value("${encryption.key:#{environment.ENCRYPTION_KEY}}")
    private String encryptionKey;
    
    // 从配置中心读取
    @Value("${nacos.config.encryption-key}")
    private String nacosEncryptionKey;
    
    // 使用密钥管理服务（KMS）
    public String getKeyFromKMS() {
        // 调用KMS服务获取密钥
        return "key-from-kms";
    }
}
```

### 4. 安全检查清单

```java
public class SecurityChecklist {
    
    /**
     * 数据传输安全
     * - 使用HTTPS
     * - 敏感数据加密传输
     * - 使用安全的加密算法
     */
    
    /**
     * 数据存储安全
     * - 密码使用BCrypt/PBKDF2加密
     * - 敏感数据加密存储
     * - 定期备份数据
     */
    
    /**
     * 身份认证
     * - 强密码策略
     * - 多因素认证
     * - 会话超时
     * - 防暴力破解
     */
    
    /**
     * 权限控制
     * - 最小权限原则
     * - RBAC权限模型
     * - 接口权限验证
     */
    
    /**
     * 输入验证
     * - SQL注入防护
     * - XSS防护
     * - CSRF防护
     * - 文件上传验证
     */
    
    /**
     * 日志审计
     * - 记录关键操作
     * - 敏感信息脱敏
     * - 日志完整性保护
     */
    
    /**
     * 依赖安全
     * - 定期更新依赖
     * - 漏洞扫描
     * - 使用安全的版本
     */
}
```

## 十二、常见安全漏洞与防护

### 1. 反序列化漏洞

```java
// 不安全：直接反序列化
public Object deserialize(byte[] data) throws Exception {
    ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(data));
    return ois.readObject();
}

// 安全：使用白名单
public Object deserializeSafe(byte[] data, Class<?> allowedClass) throws Exception {
    ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(data)) {
        @Override
        protected Class<?> resolveClass(ObjectStreamClass desc) throws IOException, ClassNotFoundException {
            if (!desc.getName().equals(allowedClass.getName())) {
                throw new InvalidClassException("Unauthorized deserialization attempt", desc.getName());
            }
            return super.resolveClass(desc);
        }
    };
    return ois.readObject();
}
```

### 2. XXE漏洞

```java
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;

// 安全的XML解析
public Document parseXMLSafely(InputStream xml) throws Exception {
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    
    // 禁用外部实体
    factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
    factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
    factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
    factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
    factory.setXIncludeAware(false);
    factory.setExpandEntityReferences(false);
    
    return factory.newDocumentBuilder().parse(xml);
}
```

### 3. 路径遍历漏洞

```java
import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;

public class PathTraversalValidator {
    
    private static final String BASE_DIR = "/data/files/";
    
    // 验证文件路径
    public static boolean isValidPath(String filename) {
        try {
            Path basePath = Paths.get(BASE_DIR).toRealPath();
            Path filePath = Paths.get(BASE_DIR, filename).toRealPath();
            
            // 确保文件在基础目录内
            return filePath.startsWith(basePath);
        } catch (Exception e) {
            return false;
        }
    }
    
    // 安全的文件读取
    public static File getFileSafely(String filename) {
        if (!isValidPath(filename)) {
            throw new SecurityException("非法的文件路径");
        }
        return new File(BASE_DIR, filename);
    }
}
```

## 十三、总结

### 核心原则

1. **纵深防御**：多层安全防护
2. **最小权限**：只授予必要的权限
3. **默认拒绝**：白名单优于黑名单
4. **安全编码**：从源头防止漏洞
5. **持续监控**：及时发现安全问题
6. **定期审计**：检查安全配置
7. **加密保护**：敏感数据加密存储和传输
8. **输入验证**：永远不信任用户输入

### 开发建议

- 使用成熟的安全框架（Spring Security）
- 定期更新依赖库
- 进行安全测试和代码审查
- 关注安全漏洞公告
- 建立安全应急响应机制
- 对开发人员进行安全培训
