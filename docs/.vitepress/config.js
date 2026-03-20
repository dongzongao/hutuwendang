import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '后端技术文档',
  titleTemplate: ':title | 后端技术文档',
  description: 'Java 后端开发技术文档，深入讲解 JVM、Spring、MySQL、Redis、Kafka、Elasticsearch、网络协议、算法等核心原理，持续更新。',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'keywords', content: 'Java,JVM,Spring,SpringBoot,MySQL,Redis,Kafka,Elasticsearch,MyBatis,MVCC,B+树,网络协议,算法,后端开发' }],
    ['meta', { name: 'author', content: 'dongzongao' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: '后端技术文档' }],
    ['meta', { property: 'og:description', content: 'Java 后端开发技术文档，深入讲解 JVM、Spring、MySQL、Redis、Kafka、Elasticsearch 等核心原理' }],
    ['meta', { property: 'og:site_name', content: '后端技术文档' }],
    ['link', { rel: 'canonical', href: 'https://dongzongao.github.io/hutuwendang/' }],
  ],
  themeConfig: {
    logo: '📚',
    nav: [
      { text: '首页', link: '/' },
      { text: '说明', link: '/guide' },
      {
        text: 'Java & JVM',
        items: [
          { text: 'Java', link: '/java/Java基础' },
          { text: 'JVM', link: '/jvm/JVM详解' },
          { text: 'Spring', link: '/spring/SpringBoot详解' },
        ]
      },
      {
        text: '存储',
        items: [
          { text: '数据库', link: '/database/MySQL详解' },
          { text: '缓存', link: '/cache/Redis详解' },
          { text: '搜索引擎', link: '/search/Elasticsearch详解' },
        ]
      },
      {
        text: '分布式',
        items: [
          { text: '中间件', link: '/middleware/Nacos详解' },
          { text: '锁', link: '/lock/锁概览' },
          { text: '架构设计', link: '/architecture/幂等设计详解' },
        ]
      },
      { text: '网络', link: '/network/HTTP与HTTPS细节区别' },
      { text: '算法', link: '/algorithm/算法学习路径' },
      { text: '方法论', link: '/methodology/开发方法论' },
    ],
    sidebar: {
      '/java/': [
        {
          text: 'Java',
          items: [
            { text: 'Java 基础', link: '/java/Java基础' },
            { text: 'Java 线程与并发', link: '/java/Java线程与并发' },
            { text: 'Java 线程技术详解', link: '/java/Java线程技术详解' },
            { text: 'Java 数据安全', link: '/java/Java数据安全' },
            { text: 'Java 正则表达式', link: '/java/Java正则表达式' },
            { text: 'Java Stream', link: '/java/Java Stream详解' },
            { text: 'Pattern 类', link: '/java/Pattern类详解' },
          ]
        }
      ],
      '/jvm/': [
        {
          text: 'JVM',
          items: [
            { text: 'JVM 详解', link: '/jvm/JVM详解' },
            { text: 'G1 和 ZGC 垃圾回收器', link: '/jvm/G1和ZGC垃圾回收器详解' },
            { text: '三色标记算法', link: '/jvm/三色标记算法详解' },
            { text: '类加载机制', link: '/jvm/类加载机制详解' },
          ]
        }
      ],
      '/spring/': [
        {
          text: 'Spring 生态',
          items: [
            { text: 'SpringBoot 详解', link: '/spring/SpringBoot详解' },
            { text: 'SpringBoot IOC 容器', link: '/spring/SpringBoot-IOC容器加载机制' },
            { text: 'WebFlux 详解', link: '/spring/WebFlux详解' },
            { text: 'Reactor 响应式编程', link: '/spring/Reactor响应式编程详解' },
          ]
        }
      ],
      '/database/': [
        {
          text: '数据库',
          items: [
            { text: 'MySQL 详解', link: '/database/MySQL详解' },
            { text: 'MySQL 与 SpringBoot 事务', link: '/database/MySQL和SpringBoot事务详解' },
            { text: '数据库回表问题', link: '/database/数据库回表问题详解' },
            { text: 'MVCC 详解', link: '/database/MVCC详解' },
            { text: 'B 树与 B+ 树', link: '/database/B树与B+树详解' },
            { text: 'MyBatis 核心原理', link: '/database/MyBatis核心原理' },
            { text: 'MySQL 锁详解', link: '/database/MySQL锁详解' },
            { text: '幻读详解', link: '/database/幻读详解' },
          ]
        }
      ],
      '/cache/': [
        {
          text: '缓存',
          items: [
            { text: 'Redis 详解', link: '/cache/Redis详解' },
            { text: 'Redis 源码解读', link: '/cache/Redis源码解读' },
          ]
        }
      ],
      '/middleware/': [
        {
          text: '中间件 & 微服务',
          items: [
            { text: 'Nacos 详解', link: '/middleware/Nacos详解' },
            { text: 'ZooKeeper 详解', link: '/middleware/ZooKeeper详解' },
            { text: '微服务服务治理', link: '/middleware/微服务服务治理' },
            { text: 'Nginx 与 Gateway 对比', link: '/middleware/Nginx与Gateway对比详解' },
            { text: 'MQ 重复消费解决方案', link: '/middleware/MQ重复消费解决方案' },
            { text: 'Kafka 消息投递与重试', link: '/middleware/Kafka消息投递与重试' },
          ]
        }
      ],
      '/network/': [
        {
          text: '网络 & 协议',
          items: [
            { text: 'HTTP 与 HTTPS', link: '/network/HTTP与HTTPS细节区别' },
            { text: 'HTTP/2 详解', link: '/network/HTTP2详解' },
            { text: 'HTTP 状态码 402', link: '/network/HTTP状态码402详解' },
            { text: 'TCP 与 UDP', link: '/network/TCP与UDP差异详解' },
            { text: '多路复用', link: '/network/多路复用详解' },
            { text: '通信协议', link: '/network/通信协议详解' },
          ]
        }
      ],
      '/security/': [
        {
          text: '安全 & 加密',
          items: [
            { text: '对称加密与非对称加密', link: '/security/对称加密与非对称加密' },
          ]
        }
      ],
      '/architecture/': [
        {
          text: '架构设计',
          items: [
            { text: '幂等设计', link: '/architecture/幂等设计详解' },
            { text: 'MQ 兜底方案', link: '/architecture/MQ兜底方案详解' },
            { text: 'MQ 架构设计', link: '/architecture/MQ架构设计详解' },
          ]
        }
      ],
      '/lock/': [
        {
          text: '锁',
          items: [
            { text: '锁概览', link: '/lock/锁概览' },
            { text: 'MySQL 锁详解', link: '/lock/MySQL锁详解' },
            { text: '悲观锁与乐观锁', link: '/lock/悲观锁与乐观锁' },
            { text: 'synchronized 详解', link: '/lock/synchronized详解' },
            { text: 'ReentrantLock 与 AQS', link: '/lock/ReentrantLock与AQS详解' },
            { text: '读写锁详解', link: '/lock/读写锁详解' },
            { text: 'Redis 分布式锁', link: '/lock/Redis分布式锁详解' },
            { text: 'ZooKeeper 分布式锁', link: '/lock/ZooKeeper分布式锁详解' },
          ]
        }
      ],
      '/search/': [
        {
          text: '搜索引擎',
          items: [
            { text: 'Elasticsearch 详解', link: '/search/Elasticsearch详解' },
            { text: 'FST 详解', link: '/search/FST详解' },
            { text: 'Roaring Bitmap 详解', link: '/search/RoaringBitmap详解' },
            { text: 'BM25 算法详解', link: '/search/BM25算法详解' },
            { text: 'Canal 数据同步', link: '/search/Canal数据同步详解' },
          ]
        }
      ],
      '/algorithm/': [
        {
          text: '算法',
          items: [
            { text: '算法学习路径', link: '/algorithm/算法学习路径' },
            { text: '算法题与解题思路', link: '/algorithm/算法题与解题思路' },
            { text: '时间与空间复杂度', link: '/algorithm/时间与空间复杂度' },
            { text: '红黑树详解', link: '/algorithm/红黑树详解' },
          ]
        }
      ],
      '/methodology/': [
        {
          text: '开发方法论',
          items: [
            { text: '开发方法论', link: '/methodology/开发方法论' },
          ]
        }
      ],
    },
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/dongzongao/hutuwendang' }
    ],
    footer: {
      message: '后端技术文档',
    }
  }
})
