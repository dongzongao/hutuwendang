import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '后端技术文档',
  description: 'Java 后端开发技术文档，涵盖 JVM、Spring、数据库、中间件、网络、算法等方向',
  lang: 'zh-CN',
  themeConfig: {
    logo: '📚',
    nav: [
      { text: '首页', link: '/' },
      { text: '说明', link: '/guide' },
      { text: 'Java', link: '/java/Java基础' },
      { text: 'JVM', link: '/jvm/JVM详解' },
      { text: 'Spring', link: '/spring/SpringBoot详解' },
      { text: '数据库', link: '/database/MySQL详解' },
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
          ]
        }
      ],
      '/cache/': [
        {
          text: '缓存',
          items: [
            { text: 'Redis 详解', link: '/cache/Redis详解' },
            { text: 'Redis 源码解读', link: '/cache/Redis核心源码解读' },
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
