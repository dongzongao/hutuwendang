# Spring Boot IOC 容器加载机制

## 一、IOC 容器概述

### 1.1 什么是 IOC？

IOC (Inversion of Control) 控制反转，是一种设计思想。

**传统方式**：
```java
public class UserService {
    // 主动创建依赖对象
    private UserDao userDao = new UserDaoImpl();
}
```

**IOC 方式**：
```java
public class UserService {
    // 由容器注入依赖对象
    @Autowired
    private UserDao userDao;
}
```

**核心概念**：
- **DI (Dependency Injection)**：依赖注入，IOC 的实现方式
- **Bean**：由 IOC 容器管理的对象
- **BeanFactory**：IOC 容器的基本实现
- **ApplicationContext**：BeanFactory 的扩展，提供更多企业级功能

### 1.2 容器层次结构

```
BeanFactory (接口)
    ↓
ApplicationContext (接口)
    ↓
ConfigurableApplicationContext (接口)
    ↓
AbstractApplicationContext (抽象类)
    ↓
GenericApplicationContext
    ↓
AnnotationConfigApplicationContext (注解配置)
ServletWebServerApplicationContext (Web 应用)
```

## 二、容器启动流程

### 2.1 启动入口

```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

### 2.2 完整启动流程

```java
public ConfigurableApplicationContext run(String... args) {
    // 1. 创建并启动计时器
    StopWatch stopWatch = new StopWatch();
    stopWatch.start();
    
    // 2. 创建引导上下文
    DefaultBootstrapContext bootstrapContext = createBootstrapContext();
    ConfigurableApplicationContext context = null;
    
    // 3. 配置 Headless 模式
    configureHeadlessProperty();
    
    // 4. 获取运行监听器
    SpringApplicationRunListeners listeners = getRunListeners(args);
    listeners.starting(bootstrapContext, this.mainApplicationClass);
    
    try {
        // 5. 封装命令行参数
        ApplicationArguments applicationArguments = new DefaultApplicationArguments(args);
        
        // 6. 准备环境
        ConfigurableEnvironment environment = prepareEnvironment(listeners, 
            bootstrapContext, applicationArguments);
        
        // 7. 打印 Banner
        Banner printedBanner = printBanner(environment);
        
        // 8. 创建 ApplicationContext
        context = createApplicationContext();
        
        // 9. 准备上下文
        prepareContext(bootstrapContext, context, environment, listeners,
            applicationArguments, printedBanner);
        
        // 10. 刷新上下文（核心）
        refreshContext(context);
        
        // 11. 刷新后处理
        afterRefresh(context, applicationArguments);
        
        // 12. 停止计时
        stopWatch.stop();
        
        // 13. 发布启动完成事件
        listeners.started(context);
        
        // 14. 执行 Runner
        callRunners(context, applicationArguments);
        
    } catch (Throwable ex) {
        handleRunFailure(context, ex, listeners);
        throw new IllegalStateException(ex);
    }
    
    // 15. 发布就绪事件
    listeners.running(context);
    
    return context;
}
```

## 三、核心步骤详解

### 3.1 创建 ApplicationContext

```java
protected ConfigurableApplicationContext createApplicationContext() {
    // 根据应用类型创建不同的上下文
    return this.applicationContextFactory.create(this.webApplicationType);
}

// 应用类型判断
public enum WebApplicationType {
    NONE,      // 非 Web 应用
    SERVLET,   // Servlet Web 应用
    REACTIVE   // Reactive Web 应用
}

// 创建对应的上下文
switch (webApplicationType) {
    case SERVLET:
        return new AnnotationConfigServletWebServerApplicationContext();
    case REACTIVE:
        return new AnnotationConfigReactiveWebServerApplicationContext();
    default:
        return new AnnotationConfigApplicationContext();
}
```

### 3.2 准备上下文

```java
private void prepareContext(
    DefaultBootstrapContext bootstrapContext,
    ConfigurableApplicationContext context,
    ConfigurableEnvironment environment,
    SpringApplicationRunListeners listeners,
    ApplicationArguments applicationArguments,
    Banner printedBanner) {
    
    // 1. 设置环境
    context.setEnvironment(environment);
    
    // 2. 后置处理上下文
    postProcessApplicationContext(context);
    
    // 3. 执行 ApplicationContextInitializer
    applyInitializers(context);
    
    // 4. 发布上下文准备完成事件
    listeners.contextPrepared(context);
    
    // 5. 关闭引导上下文
    bootstrapContext.close(context);
    
    // 6. 注册特殊的单例 Bean
    ConfigurableListableBeanFactory beanFactory = context.getBeanFactory();
    beanFactory.registerSingleton("springApplicationArguments", applicationArguments);
    
    // 7. 加载启动类（主配置类）
    Set<Object> sources = getAllSources();
    load(context, sources.toArray(new Object[0]));
    
    // 8. 发布上下文加载完成事件
    listeners.contextLoaded(context);
}
```

### 3.3 刷新上下文（核心）

```java
@Override
public void refresh() throws BeansException, IllegalStateException {
    synchronized (this.startupShutdownMonitor) {
        // 1. 准备刷新
        prepareRefresh();
        
        // 2. 获取 BeanFactory
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();
        
        // 3. 准备 BeanFactory
        prepareBeanFactory(beanFactory);
        
        try {
            // 4. BeanFactory 后置处理
            postProcessBeanFactory(beanFactory);
            
            // 5. 执行 BeanFactoryPostProcessor
            invokeBeanFactoryPostProcessors(beanFactory);
            
            // 6. 注册 BeanPostProcessor
            registerBeanPostProcessors(beanFactory);
            
            // 7. 初始化消息源
            initMessageSource();
            
            // 8. 初始化事件广播器
            initApplicationEventMulticaster();
            
            // 9. 刷新特定上下文（启动 Web 服务器）
            onRefresh();
            
            // 10. 注册监听器
            registerListeners();
            
            // 11. 实例化所有非懒加载的单例 Bean
            finishBeanFactoryInitialization(beanFactory);
            
            // 12. 完成刷新
            finishRefresh();
            
        } catch (BeansException ex) {
            // 销毁已创建的 Bean
            destroyBeans();
            cancelRefresh(ex);
            throw ex;
        } finally {
            // 重置缓存
            resetCommonCaches();
        }
    }
}
```

## 四、Bean 生命周期

### 4.1 完整生命周期

```
1. 实例化 Bean
   ↓
2. 设置属性值
   ↓
3. BeanNameAware.setBeanName()
   ↓
4. BeanFactoryAware.setBeanFactory()
   ↓
5. ApplicationContextAware.setApplicationContext()
   ↓
6. BeanPostProcessor.postProcessBeforeInitialization()
   ↓
7. @PostConstruct 注解方法
   ↓
8. InitializingBean.afterPropertiesSet()
   ↓
9. init-method 指定的方法
   ↓
10. BeanPostProcessor.postProcessAfterInitialization()
   ↓
11. Bean 可以使用
   ↓
12. @PreDestroy 注解方法
   ↓
13. DisposableBean.destroy()
   ↓
14. destroy-method 指定的方法
```

### 4.2 生命周期示例

```java
@Component
public class LifecycleBean implements 
    BeanNameAware, 
    BeanFactoryAware,
    ApplicationContextAware,
    InitializingBean,
    DisposableBean {
    
    private String beanName;
    
    // 1. 构造方法
    public LifecycleBean() {
        System.out.println("1. 构造方法");
    }
    
    // 2. 设置属性
    @Value("${app.name}")
    private String appName;
    
    // 3. BeanNameAware
    @Override
    public void setBeanName(String name) {
        this.beanName = name;
        System.out.println("3. BeanNameAware.setBeanName: " + name);
    }
    
    // 4. BeanFactoryAware
    @Override
    public void setBeanFactory(BeanFactory beanFactory) {
        System.out.println("4. BeanFactoryAware.setBeanFactory");
    }
    
    // 5. ApplicationContextAware
    @Override
    public void setApplicationContext(ApplicationContext context) {
        System.out.println("5. ApplicationContextAware.setApplicationContext");
    }
    
    // 6. @PostConstruct
    @PostConstruct
    public void postConstruct() {
        System.out.println("6. @PostConstruct");
    }
    
    // 7. InitializingBean
    @Override
    public void afterPropertiesSet() {
        System.out.println("7. InitializingBean.afterPropertiesSet");
    }
    
    // 8. init-method
    public void initMethod() {
        System.out.println("8. init-method");
    }
    
    // 9. @PreDestroy
    @PreDestroy
    public void preDestroy() {
        System.out.println("9. @PreDestroy");
    }
    
    // 10. DisposableBean
    @Override
    public void destroy() {
        System.out.println("10. DisposableBean.destroy");
    }
    
    // 11. destroy-method
    public void destroyMethod() {
        System.out.println("11. destroy-method");
    }
}
```

### 4.3 BeanPostProcessor

```java
@Component
public class MyBeanPostProcessor implements BeanPostProcessor {
    
    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) 
        throws BeansException {
        System.out.println("BeanPostProcessor.postProcessBeforeInitialization: " + beanName);
        return bean;
    }
    
    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) 
        throws BeansException {
        System.out.println("BeanPostProcessor.postProcessAfterInitialization: " + beanName);
        
        // 可以返回代理对象
        if (bean instanceof UserService) {
            return Proxy.newProxyInstance(
                bean.getClass().getClassLoader(),
                bean.getClass().getInterfaces(),
                (proxy, method, args) -> {
                    System.out.println("代理方法执行前");
                    Object result = method.invoke(bean, args);
                    System.out.println("代理方法执行后");
                    return result;
                }
            );
        }
        
        return bean;
    }
}
```

## 五、Bean 的创建过程

### 5.1 getBean 流程

```java
public Object getBean(String name) throws BeansException {
    return doGetBean(name, null, null, false);
}

protected <T> T doGetBean(
    String name, 
    Class<T> requiredType,
    Object[] args, 
    boolean typeCheckOnly) {
    
    // 1. 转换 Bean 名称
    String beanName = transformedBeanName(name);
    Object bean;
    
    // 2. 从缓存获取单例 Bean
    Object sharedInstance = getSingleton(beanName);
    if (sharedInstance != null && args == null) {
        bean = getObjectForBeanInstance(sharedInstance, name, beanName, null);
    } else {
        // 3. 检查是否正在创建（循环依赖检测）
        if (isPrototypeCurrentlyInCreation(beanName)) {
            throw new BeanCurrentlyInCreationException(beanName);
        }
        
        // 4. 检查父容器
        BeanFactory parentBeanFactory = getParentBeanFactory();
        if (parentBeanFactory != null && !containsBeanDefinition(beanName)) {
            return parentBeanFactory.getBean(name);
        }
        
        // 5. 标记 Bean 正在创建
        if (!typeCheckOnly) {
            markBeanAsCreated(beanName);
        }
        
        try {
            // 6. 获取 BeanDefinition
            RootBeanDefinition mbd = getMergedLocalBeanDefinition(beanName);
            
            // 7. 创建依赖的 Bean
            String[] dependsOn = mbd.getDependsOn();
            if (dependsOn != null) {
                for (String dep : dependsOn) {
                    getBean(dep);
                }
            }
            
            // 8. 创建 Bean 实例
            if (mbd.isSingleton()) {
                // 单例
                sharedInstance = getSingleton(beanName, () -> {
                    return createBean(beanName, mbd, args);
                });
                bean = getObjectForBeanInstance(sharedInstance, name, beanName, mbd);
                
            } else if (mbd.isPrototype()) {
                // 原型
                Object prototypeInstance = createBean(beanName, mbd, args);
                bean = getObjectForBeanInstance(prototypeInstance, name, beanName, mbd);
                
            } else {
                // 其他作用域
                String scopeName = mbd.getScope();
                Scope scope = this.scopes.get(scopeName);
                Object scopedInstance = scope.get(beanName, () -> {
                    return createBean(beanName, mbd, args);
                });
                bean = getObjectForBeanInstance(scopedInstance, name, beanName, mbd);
            }
            
        } catch (BeansException ex) {
            cleanupAfterBeanCreationFailure(beanName);
            throw ex;
        }
    }
    
    // 9. 类型转换
    if (requiredType != null && !requiredType.isInstance(bean)) {
        return getTypeConverter().convertIfNecessary(bean, requiredType);
    }
    
    return (T) bean;
}
```

### 5.2 createBean 流程

```java
protected Object createBean(String beanName, RootBeanDefinition mbd, Object[] args) {
    RootBeanDefinition mbdToUse = mbd;
    
    // 1. 解析 Bean 的 Class
    Class<?> resolvedClass = resolveBeanClass(mbd, beanName);
    
    try {
        // 2. 准备方法覆盖
        mbdToUse.prepareMethodOverrides();
        
        // 3. 给 BeanPostProcessor 一个返回代理对象的机会
        Object bean = resolveBeforeInstantiation(beanName, mbdToUse);
        if (bean != null) {
            return bean;
        }
        
    } catch (Throwable ex) {
        throw new BeanCreationException("BeanPostProcessor before instantiation failed");
    }
    
    try {
        // 4. 创建 Bean 实例
        Object beanInstance = doCreateBean(beanName, mbdToUse, args);
        return beanInstance;
        
    } catch (BeanCreationException ex) {
        throw ex;
    }
}

protected Object doCreateBean(String beanName, RootBeanDefinition mbd, Object[] args) {
    // 1. 实例化 Bean
    BeanWrapper instanceWrapper = createBeanInstance(beanName, mbd, args);
    Object bean = instanceWrapper.getWrappedInstance();
    
    // 2. 允许后置处理器修改 BeanDefinition
    synchronized (mbd.postProcessingLock) {
        if (!mbd.postProcessed) {
            applyMergedBeanDefinitionPostProcessors(mbd, beanType, beanName);
            mbd.postProcessed = true;
        }
    }
    
    // 3. 提前暴露单例（解决循环依赖）
    boolean earlySingletonExposure = (mbd.isSingleton() && 
        this.allowCircularReferences && isSingletonCurrentlyInCreation(beanName));
    
    if (earlySingletonExposure) {
        addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean));
    }
    
    // 4. 填充属性
    Object exposedObject = bean;
    populateBean(beanName, mbd, instanceWrapper);
    
    // 5. 初始化 Bean
    exposedObject = initializeBean(beanName, exposedObject, mbd);
    
    // 6. 注册销毁方法
    registerDisposableBeanIfNecessary(beanName, bean, mbd);
    
    return exposedObject;
}
```

### 5.3 三级缓存解决循环依赖

```java
public class DefaultSingletonBeanRegistry {
    
    // 一级缓存：完整的单例对象
    private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);
    
    // 二级缓存：早期的单例对象（未完全初始化）
    private final Map<String, Object> earlySingletonObjects = new HashMap<>(16);
    
    // 三级缓存：单例工厂
    private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);
    
    protected Object getSingleton(String beanName, boolean allowEarlyReference) {
        // 1. 从一级缓存获取
        Object singletonObject = this.singletonObjects.get(beanName);
        
        if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
            synchronized (this.singletonObjects) {
                // 2. 从二级缓存获取
                singletonObject = this.earlySingletonObjects.get(beanName);
                
                if (singletonObject == null && allowEarlyReference) {
                    // 3. 从三级缓存获取
                    ObjectFactory<?> singletonFactory = 
                        this.singletonFactories.get(beanName);
                    
                    if (singletonFactory != null) {
                        singletonObject = singletonFactory.getObject();
                        // 放入二级缓存
                        this.earlySingletonObjects.put(beanName, singletonObject);
                        // 移除三级缓存
                        this.singletonFactories.remove(beanName);
                    }
                }
            }
        }
        
        return singletonObject;
    }
}
```

**循环依赖示例**：
```java
@Component
public class A {
    @Autowired
    private B b;
}

@Component
public class B {
    @Autowired
    private A a;
}

// 解决流程：
// 1. 创建 A，实例化后放入三级缓存
// 2. 填充 A 的属性 b，发现需要 B
// 3. 创建 B，实例化后放入三级缓存
// 4. 填充 B 的属性 a，从三级缓存获取 A（早期引用）
// 5. B 创建完成，放入一级缓存
// 6. A 的属性 b 注入完成
// 7. A 创建完成，放入一级缓存
```



## 六、自动配置原理

### 6.1 @SpringBootApplication 注解

```java
@SpringBootConfiguration  // 标记为配置类
@EnableAutoConfiguration  // 启用自动配置
@ComponentScan           // 组件扫描
public @interface SpringBootApplication {
}
```

### 6.2 @EnableAutoConfiguration

```java
@AutoConfigurationPackage
@Import(AutoConfigurationImportSelector.class)
public @interface EnableAutoConfiguration {
}
```

### 6.3 AutoConfigurationImportSelector

```java
public class AutoConfigurationImportSelector implements DeferredImportSelector {
    
    @Override
    public String[] selectImports(AnnotationMetadata annotationMetadata) {
        if (!isEnabled(annotationMetadata)) {
            return NO_IMPORTS;
        }
        
        // 1. 获取自动配置类
        AutoConfigurationEntry autoConfigurationEntry = 
            getAutoConfigurationEntry(annotationMetadata);
        
        return StringUtils.toStringArray(
            autoConfigurationEntry.getConfigurations());
    }
    
    protected AutoConfigurationEntry getAutoConfigurationEntry(
        AnnotationMetadata annotationMetadata) {
        
        if (!isEnabled(annotationMetadata)) {
            return EMPTY_ENTRY;
        }
        
        // 2. 获取注解属性
        AnnotationAttributes attributes = getAttributes(annotationMetadata);
        
        // 3. 加载候选配置类（从 META-INF/spring.factories）
        List<String> configurations = getCandidateConfigurations(
            annotationMetadata, attributes);
        
        // 4. 去重
        configurations = removeDuplicates(configurations);
        
        // 5. 排除指定的配置类
        Set<String> exclusions = getExclusions(annotationMetadata, attributes);
        configurations.removeAll(exclusions);
        
        // 6. 过滤（根据条件注解）
        configurations = getConfigurationClassFilter()
            .filter(configurations);
        
        // 7. 触发自动配置导入事件
        fireAutoConfigurationImportEvents(configurations, exclusions);
        
        return new AutoConfigurationEntry(configurations, exclusions);
    }
    
    protected List<String> getCandidateConfigurations(
        AnnotationMetadata metadata, 
        AnnotationAttributes attributes) {
        
        // 从 META-INF/spring.factories 加载配置类
        List<String> configurations = SpringFactoriesLoader.loadFactoryNames(
            getSpringFactoriesLoaderFactoryClass(), 
            getBeanClassLoader());
        
        return configurations;
    }
}
```

### 6.4 spring.factories 文件

```properties
# spring-boot-autoconfigure.jar 中的 META-INF/spring.factories

# Auto Configure
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
org.springframework.boot.autoconfigure.admin.SpringApplicationAdminJmxAutoConfiguration,\
org.springframework.boot.autoconfigure.aop.AopAutoConfiguration,\
org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration,\
org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,\
org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,\
org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration,\
...
```

### 6.5 条件注解

```java
// DataSource 自动配置示例
@Configuration
@ConditionalOnClass({ DataSource.class, EmbeddedDatabaseType.class })
@ConditionalOnMissingBean(DataSource.class)
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {
    
    @Bean
    @ConditionalOnProperty(name = "spring.datasource.type")
    public DataSource dataSource(DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().build();
    }
}
```

**常用条件注解**：
```java
@ConditionalOnClass          // 类路径存在指定类
@ConditionalOnMissingClass   // 类路径不存在指定类
@ConditionalOnBean           // 容器中存在指定 Bean
@ConditionalOnMissingBean    // 容器中不存在指定 Bean
@ConditionalOnProperty       // 配置文件中存在指定属性
@ConditionalOnResource       // 类路径存在指定资源
@ConditionalOnWebApplication // Web 应用
@ConditionalOnExpression     // SpEL 表达式为 true
```

## 七、依赖注入方式

### 7.1 构造器注入（推荐）

```java
@Service
public class UserService {
    
    private final UserDao userDao;
    private final CacheService cacheService;
    
    // 单个构造器可以省略 @Autowired
    public UserService(UserDao userDao, CacheService cacheService) {
        this.userDao = userDao;
        this.cacheService = cacheService;
    }
}
```

**优点**：
- 依赖不可变（final）
- 依赖不为 null
- 完全初始化后才能使用
- 便于单元测试

### 7.2 Setter 注入

```java
@Service
public class UserService {
    
    private UserDao userDao;
    
    @Autowired
    public void setUserDao(UserDao userDao) {
        this.userDao = userDao;
    }
}
```

**优点**：
- 可选依赖
- 可以重新注入

### 7.3 字段注入

```java
@Service
public class UserService {
    
    @Autowired
    private UserDao userDao;
}
```

**缺点**：
- 不能使用 final
- 难以进行单元测试
- 隐藏依赖关系

### 7.4 方法注入

```java
@Service
public class UserService {
    
    private UserDao userDao;
    private CacheService cacheService;
    
    @Autowired
    public void init(UserDao userDao, CacheService cacheService) {
        this.userDao = userDao;
        this.cacheService = cacheService;
    }
}
```

### 7.5 @Resource vs @Autowired

```java
// @Autowired：按类型注入（Spring）
@Autowired
private UserDao userDao;

// @Autowired + @Qualifier：按名称注入
@Autowired
@Qualifier("userDaoImpl")
private UserDao userDao;

// @Resource：按名称注入（JSR-250）
@Resource(name = "userDaoImpl")
private UserDao userDao;

// @Resource：按类型注入
@Resource
private UserDao userDao;
```

## 八、Bean 作用域

### 8.1 作用域类型

```java
@Component
@Scope("singleton")  // 默认，单例
public class SingletonBean {
}

@Component
@Scope("prototype")  // 原型，每次获取创建新实例
public class PrototypeBean {
}

@Component
@Scope("request")    // Web：每个 HTTP 请求一个实例
public class RequestBean {
}

@Component
@Scope("session")    // Web：每个 Session 一个实例
public class SessionBean {
}

@Component
@Scope("application") // Web：ServletContext 生命周期
public class ApplicationBean {
}
```

### 8.2 自定义作用域

```java
public class ThreadScope implements Scope {
    
    private final ThreadLocal<Map<String, Object>> threadScope = 
        ThreadLocal.withInitial(HashMap::new);
    
    @Override
    public Object get(String name, ObjectFactory<?> objectFactory) {
        Map<String, Object> scope = threadScope.get();
        Object bean = scope.get(name);
        
        if (bean == null) {
            bean = objectFactory.getObject();
            scope.put(name, bean);
        }
        
        return bean;
    }
    
    @Override
    public Object remove(String name) {
        Map<String, Object> scope = threadScope.get();
        return scope.remove(name);
    }
    
    @Override
    public void registerDestructionCallback(String name, Runnable callback) {
        // 注册销毁回调
    }
    
    @Override
    public Object resolveContextualObject(String key) {
        return null;
    }
    
    @Override
    public String getConversationId() {
        return Thread.currentThread().getName();
    }
}

// 注册自定义作用域
@Configuration
public class ScopeConfig {
    
    @Bean
    public static BeanFactoryPostProcessor beanFactoryPostProcessor() {
        return beanFactory -> {
            beanFactory.registerScope("thread", new ThreadScope());
        };
    }
}

// 使用
@Component
@Scope("thread")
public class ThreadScopedBean {
}
```

## 九、BeanDefinition

### 9.1 什么是 BeanDefinition？

BeanDefinition 是 Spring 对 Bean 的定义，包含：
- Bean 的类名
- Bean 的作用域
- Bean 的属性值
- 构造函数参数
- 依赖的 Bean
- 是否懒加载
- 初始化方法
- 销毁方法

### 9.2 BeanDefinition 注册

```java
@Configuration
public class BeanConfig {
    
    @Bean
    public BeanDefinitionRegistryPostProcessor beanDefinitionRegistryPostProcessor() {
        return new BeanDefinitionRegistryPostProcessor() {
            
            @Override
            public void postProcessBeanDefinitionRegistry(
                BeanDefinitionRegistry registry) throws BeansException {
                
                // 创建 BeanDefinition
                BeanDefinitionBuilder builder = BeanDefinitionBuilder
                    .genericBeanDefinition(UserService.class);
                
                builder.addPropertyValue("name", "admin");
                builder.setScope("singleton");
                builder.setLazyInit(false);
                
                // 注册 BeanDefinition
                registry.registerBeanDefinition("userService", 
                    builder.getBeanDefinition());
            }
            
            @Override
            public void postProcessBeanFactory(
                ConfigurableListableBeanFactory beanFactory) throws BeansException {
                // BeanFactory 后置处理
            }
        };
    }
}
```

### 9.3 动态注册 Bean

```java
@Component
public class DynamicBeanRegister implements BeanDefinitionRegistryPostProcessor {
    
    @Override
    public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) {
        // 扫描指定包
        ClassPathBeanDefinitionScanner scanner = 
            new ClassPathBeanDefinitionScanner(registry);
        
        // 添加过滤器
        scanner.addIncludeFilter(new AnnotationTypeFilter(MyAnnotation.class));
        
        // 扫描并注册
        scanner.scan("com.example.service");
    }
    
    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) {
        // 可以修改已注册的 BeanDefinition
        BeanDefinition bd = beanFactory.getBeanDefinition("userService");
        bd.setScope("prototype");
    }
}
```

## 十、FactoryBean

### 10.1 FactoryBean vs BeanFactory

- **BeanFactory**：IOC 容器，管理 Bean
- **FactoryBean**：工厂 Bean，用于创建复杂的 Bean

### 10.2 FactoryBean 使用

```java
@Component
public class UserFactoryBean implements FactoryBean<User> {
    
    @Override
    public User getObject() throws Exception {
        // 创建复杂的 Bean
        User user = new User();
        user.setName("admin");
        user.setAge(18);
        // 复杂的初始化逻辑
        return user;
    }
    
    @Override
    public Class<?> getObjectType() {
        return User.class;
    }
    
    @Override
    public boolean isSingleton() {
        return true;
    }
}

// 使用
@Autowired
private User user;  // 注入的是 getObject() 返回的对象

@Autowired
private UserFactoryBean userFactoryBean;  // 注入 FactoryBean 本身

// 或者通过名称获取
User user = (User) context.getBean("userFactoryBean");
UserFactoryBean factoryBean = (UserFactoryBean) context.getBean("&userFactoryBean");
```

### 10.3 实际应用：MyBatis MapperFactoryBean

```java
public class MapperFactoryBean<T> extends SqlSessionDaoSupport 
    implements FactoryBean<T> {
    
    private Class<T> mapperInterface;
    
    @Override
    public T getObject() throws Exception {
        // 创建 Mapper 代理对象
        return getSqlSession().getMapper(this.mapperInterface);
    }
    
    @Override
    public Class<T> getObjectType() {
        return this.mapperInterface;
    }
    
    @Override
    public boolean isSingleton() {
        return true;
    }
}
```

## 十一、常见问题

### 11.1 循环依赖

**构造器循环依赖**：无法解决
```java
@Component
public class A {
    public A(B b) {}
}

@Component
public class B {
    public B(A a) {}
}
// 报错：BeanCurrentlyInCreationException
```

**解决方案**：
```java
// 1. 使用 @Lazy 延迟加载
@Component
public class A {
    public A(@Lazy B b) {}
}

// 2. 使用 Setter 注入
@Component
public class A {
    @Autowired
    private B b;
}

// 3. 使用 @PostConstruct
@Component
public class A {
    private B b;
    
    @Autowired
    public void setB(B b) {
        this.b = b;
    }
}
```

### 11.2 Bean 重复定义

```java
// 方式1：使用 @Primary
@Component
@Primary
public class UserServiceImpl1 implements UserService {
}

@Component
public class UserServiceImpl2 implements UserService {
}

// 方式2：使用 @Qualifier
@Autowired
@Qualifier("userServiceImpl1")
private UserService userService;

// 方式3：使用 @Resource
@Resource(name = "userServiceImpl1")
private UserService userService;
```

### 11.3 懒加载

```java
// 全局懒加载
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(Application.class);
        app.setLazyInitialization(true);
        app.run(args);
    }
}

// 单个 Bean 懒加载
@Component
@Lazy
public class LazyBean {
}

// 注入时懒加载
@Autowired
@Lazy
private LazyBean lazyBean;
```

### 11.4 条件注解不生效

```java
// 检查顺序
@Configuration
@ConditionalOnClass(DataSource.class)  // 先检查类
@ConditionalOnBean(DataSource.class)   // 再检查 Bean
public class MyConfig {
    
    @Bean
    @ConditionalOnMissingBean  // 最后检查
    public MyService myService() {
        return new MyService();
    }
}
```

---

## 总结

Spring Boot IOC 容器加载机制核心要点：

1. **启动流程**：创建上下文 → 准备上下文 → 刷新上下文 → 启动完成
2. **Bean 生命周期**：实例化 → 属性填充 → 初始化 → 使用 → 销毁
3. **循环依赖**：三级缓存解决（仅支持 Setter 注入）
4. **自动配置**：@EnableAutoConfiguration + spring.factories + 条件注解
5. **依赖注入**：构造器注入（推荐）、Setter 注入、字段注入
6. **Bean 作用域**：singleton、prototype、request、session
7. **扩展点**：BeanPostProcessor、BeanFactoryPostProcessor、FactoryBean

关键类：
- SpringApplication：启动入口
- ApplicationContext：IOC 容器
- BeanFactory：Bean 工厂
- BeanDefinition：Bean 定义
- BeanPostProcessor：Bean 后置处理器
