# SpringBoot 核心讲解

## 一、SpringBoot 概述

### 1.1 什么是 SpringBoot？

SpringBoot 是基于 Spring 框架的快速开发脚手架，简化了 Spring 应用的初始搭建和开发过程。

**核心特性**：
- 自动配置（Auto Configuration）
- 起步依赖（Starter Dependencies）
- 内嵌服务器（Embedded Server）
- 生产就绪特性（Actuator）
- 无需 XML 配置

**优势**：
- 快速创建独立的 Spring 应用
- 直接嵌入 Tomcat、Jetty 或 Undertow
- 提供固化的"starter"依赖，简化构建配置
- 自动配置 Spring 和第三方库
- 提供生产就绪功能，如指标、健康检查
- 无代码生成和 XML 配置要求

### 1.2 SpringBoot vs Spring

| 特性 | Spring | SpringBoot |
|------|--------|------------|
| 配置 | XML/注解 | 自动配置 |
| 依赖管理 | 手动管理 | Starter 依赖 |
| 服务器 | 外部部署 | 内嵌服务器 |
| 开发效率 | 较低 | 高 |
| 学习曲线 | 陡峭 | 平缓 |

## 二、快速入门

### 2.1 创建项目

**方式1：Spring Initializr**
- 访问 https://start.spring.io/
- 选择依赖，生成项目

**方式2：Maven 创建**
```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```


### 2.2 主启动类

```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

**@SpringBootApplication 组合注解**：
```java
@SpringBootConfiguration  // 等同于 @Configuration
@EnableAutoConfiguration  // 启用自动配置
@ComponentScan           // 组件扫描
```

### 2.3 第一个 Controller

```java
@RestController
@RequestMapping("/api")
public class HelloController {
    
    @GetMapping("/hello")
    public String hello() {
        return "Hello SpringBoot!";
    }
    
    @GetMapping("/user/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }
    
    @PostMapping("/user")
    public User createUser(@RequestBody User user) {
        return userService.save(user);
    }
}
```

### 2.4 配置文件

**application.properties**：
```properties
# 服务器配置
server.port=8080
server.servlet.context-path=/api

# 数据源配置
spring.datasource.url=jdbc:mysql://localhost:3306/mydb
spring.datasource.username=root
spring.datasource.password=123456
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA 配置
spring.jpa.show-sql=true
spring.jpa.hibernate.ddl-auto=update

# 日志配置
logging.level.root=INFO
logging.level.com.example=DEBUG
```

**application.yml**（推荐）：
```yaml
server:
  port: 8080
  servlet:
    context-path: /api

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: 123456
    driver-class-name: com.mysql.cj.jdbc.Driver
  
  jpa:
    show-sql: true
    hibernate:
      ddl-auto: update

logging:
  level:
    root: INFO
    com.example: DEBUG
```


## 三、自动配置原理

### 3.1 @EnableAutoConfiguration

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@AutoConfigurationPackage
@Import(AutoConfigurationImportSelector.class)
public @interface EnableAutoConfiguration {
}
```

**工作流程**：
1. `@Import` 导入 `AutoConfigurationImportSelector`
2. 读取 `META-INF/spring.factories` 文件
3. 加载所有自动配置类
4. 根据 `@Conditional` 条件判断是否生效

### 3.2 自动配置类示例

```java
@Configuration
@ConditionalOnClass(DataSource.class)  // 类路径存在 DataSource
@ConditionalOnMissingBean(DataSource.class)  // 容器中没有 DataSource
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {
    
    @Bean
    @ConfigurationProperties(prefix = "spring.datasource")
    public DataSource dataSource(DataSourceProperties properties) {
        return DataSourceBuilder.create()
            .url(properties.getUrl())
            .username(properties.getUsername())
            .password(properties.getPassword())
            .build();
    }
}
```

### 3.3 常用条件注解

```java
@ConditionalOnClass          // 类路径存在指定类
@ConditionalOnMissingClass   // 类路径不存在指定类
@ConditionalOnBean           // 容器中存在指定 Bean
@ConditionalOnMissingBean    // 容器中不存在指定 Bean
@ConditionalOnProperty       // 配置文件存在指定属性
@ConditionalOnResource       // 类路径存在指定资源
@ConditionalOnWebApplication // Web 应用
@ConditionalOnExpression     // SpEL 表达式为 true
```

**使用示例**：
```java
@Configuration
@ConditionalOnProperty(name = "feature.enabled", havingValue = "true")
public class FeatureConfiguration {
    
    @Bean
    public FeatureService featureService() {
        return new FeatureService();
    }
}
```


## 四、核心注解

### 4.1 配置类注解

```java
// 配置类
@Configuration
public class AppConfig {
    
    @Bean
    public UserService userService() {
        return new UserServiceImpl();
    }
}

// 导入其他配置
@Configuration
@Import({DataSourceConfig.class, RedisConfig.class})
public class MainConfig {
}

// 导入资源文件
@Configuration
@PropertySource("classpath:custom.properties")
public class PropertiesConfig {
}
```

### 4.2 组件注解

```java
@Component      // 通用组件
@Service        // 服务层
@Repository     // 数据访问层
@Controller     // 控制层
@RestController // REST 控制层（@Controller + @ResponseBody）
```

### 4.3 依赖注入注解

```java
public class UserService {
    
    // 字段注入（不推荐）
    @Autowired
    private UserRepository userRepository;
    
    // 构造器注入（推荐）
    private final UserRepository userRepository;
    
    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    // Setter 注入
    private UserRepository userRepository;
    
    @Autowired
    public void setUserRepository(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}

// 按名称注入
@Autowired
@Qualifier("userRepositoryImpl")
private UserRepository userRepository;

// 资源注入
@Resource(name = "userRepository")
private UserRepository userRepository;

// 值注入
@Value("${app.name}")
private String appName;

@Value("#{systemProperties['user.name']}")
private String userName;
```


### 4.4 配置属性绑定

```java
// 配置类
@Data
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String name;
    private String version;
    private Database database;
    
    @Data
    public static class Database {
        private String url;
        private String username;
        private String password;
    }
}

// application.yml
app:
  name: MyApp
  version: 1.0.0
  database:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: 123456

// 使用
@Service
public class AppService {
    
    @Autowired
    private AppProperties appProperties;
    
    public void printConfig() {
        System.out.println(appProperties.getName());
        System.out.println(appProperties.getDatabase().getUrl());
    }
}
```

### 4.5 Web 注解

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    // 路径参数
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }
    
    // 查询参数
    @GetMapping
    public List<User> getUsers(
        @RequestParam(required = false) String name,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        return userService.findAll(name, page, size);
    }
    
    // 请求体
    @PostMapping
    public User createUser(@RequestBody @Valid User user) {
        return userService.save(user);
    }
    
    // 请求头
    @GetMapping("/header")
    public String getHeader(@RequestHeader("User-Agent") String userAgent) {
        return userAgent;
    }
    
    // Cookie
    @GetMapping("/cookie")
    public String getCookie(@CookieValue("sessionId") String sessionId) {
        return sessionId;
    }
}
```


## 五、数据访问

### 5.1 Spring Data JPA

**依赖**：
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
</dependency>
```

**实体类**：
```java
@Entity
@Table(name = "users")
@Data
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 50)
    private String username;
    
    @Column(nullable = false)
    private String password;
    
    @Column(unique = true)
    private String email;
    
    @Enumerated(EnumType.STRING)
    private UserStatus status;
    
    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Order> orders;
}
```

**Repository**：
```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // 方法名查询
    User findByUsername(String username);
    
    List<User> findByEmailContaining(String email);
    
    List<User> findByStatusAndCreatedAtAfter(UserStatus status, LocalDateTime date);
    
    // @Query 查询
    @Query("SELECT u FROM User u WHERE u.username = :username")
    User findByUsernameCustom(@Param("username") String username);
    
    @Query(value = "SELECT * FROM users WHERE email = ?1", nativeQuery = true)
    User findByEmailNative(String email);
    
    // 更新
    @Modifying
    @Query("UPDATE User u SET u.status = :status WHERE u.id = :id")
    int updateStatus(@Param("id") Long id, @Param("status") UserStatus status);
    
    // 分页
    Page<User> findByStatus(UserStatus status, Pageable pageable);
}
```


**Service 层**：
```java
@Service
@Transactional
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    public User findById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
    
    public User save(User user) {
        return userRepository.save(user);
    }
    
    public Page<User> findAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return userRepository.findAll(pageable);
    }
    
    @Transactional(rollbackFor = Exception.class)
    public void updateStatus(Long id, UserStatus status) {
        User user = findById(id);
        user.setStatus(status);
        userRepository.save(user);
    }
}
```

### 5.2 MyBatis

**依赖**：
```xml
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>3.0.0</version>
</dependency>
```

**配置**：
```yaml
mybatis:
  mapper-locations: classpath:mapper/*.xml
  type-aliases-package: com.example.entity
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

**Mapper 接口**：
```java
@Mapper
public interface UserMapper {
    
    @Select("SELECT * FROM users WHERE id = #{id}")
    User findById(Long id);
    
    @Insert("INSERT INTO users(username, password, email) VALUES(#{username}, #{password}, #{email})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(User user);
    
    @Update("UPDATE users SET username = #{username} WHERE id = #{id}")
    int update(User user);
    
    @Delete("DELETE FROM users WHERE id = #{id}")
    int delete(Long id);
    
    // XML 映射
    List<User> findByCondition(UserQuery query);
}
```

**XML 映射文件**：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" 
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.mapper.UserMapper">
    
    <resultMap id="userMap" type="User">
        <id property="id" column="id"/>
        <result property="username" column="username"/>
        <result property="email" column="email"/>
    </resultMap>
    
    <select id="findByCondition" resultMap="userMap">
        SELECT * FROM users
        <where>
            <if test="username != null">
                AND username LIKE CONCAT('%', #{username}, '%')
            </if>
            <if test="email != null">
                AND email = #{email}
            </if>
        </where>
    </select>
</mapper>
```

