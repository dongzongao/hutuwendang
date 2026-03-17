import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '后端核心技术点知识库',
  description: '系统整理后端开发核心知识点',
  lang: 'zh-CN',
  themeConfig: {
    logo: '📚',
    nav: [
      { text: '首页', link: '/' },
      { text: 'Java', link: '/java/Java基础核心考点' },
      { text: 'JVM', link: '/jvm/JVM核心知识' },
      { text: 'Spring', link: '/spring/SpringBoot核心讲解' },
      { text: '数据库', link: '/database/MySQL核心知识' },
      { text: '网络', link: '/network/HTTP与HTTPS细节区别' },
      { text: '算法', link: '/algorithm/算法题学习路径' },
    ],
    sidebar: {
      '/java/': [
        {
          text: 'Java 核心',
          items: [
            { text: 'Java基础核心考点', link: '/java/Java基础核心考点' },
            { text: 'Java线程与并发核心知识', link: '/java/Java线程与并发核心知识' },
            { text: 'Java线程技术点详解', link: '/java/Java线程技术点详解' },
            { text: 'Java数据安全核心知识', link: '/java/Java数据安全核心知识' },
            { text: 'Java正则表达式核心知识', link: '/java/Java正则表达式核心知识' },
            { text: 'Java Stream详解', link: '/java/Java Stream详解' },
            { text: 'Pattern类详解', link: '/java/Pattern类详解' },
          ]
        }
      ],
      '/jvm/': [
        {
          text: 'JVM',
          items: [
            { text: 'JVM核心知识', link: '/jvm/JVM核心知识' },
            { text: 'G1和ZGC垃圾回收器详解', link: '/jvm/G1和ZGC垃圾回收器详解' },
            { text: '类加载机制详解', link: '/jvm/类加载机制详解' },
          ]
        }
      ],
      '/spring/': [
        {
          text: 'Spring 生态',
          items: [
            { text: 'SpringBoot核心讲解', link: '/spring/SpringBoot核心讲解' },
            { text: 'SpringBoot-IOC容器加载机制', link: '/spring/SpringBoot-IOC容器加载机制' },
            { text: 'WebFlux详解', link: '/spring/WebFlux详解' },
            { text: 'Reactor响应式编程详解', link: '/spring/Reactor响应式编程详解' },
          ]
        }
      ],
      '/database/': [
        {
          text: '数据库',
          items: [
            { text: 'MySQL核心知识', link: '/database/MySQL核心知识' },
            { text: 'MySQL和SpringBoot事务详解', link: '/database/MySQL和SpringBoot事务详解' },
            { text: '数据库回表问题详解', link: '/database/数据库回表问题详解' },
          ]
        }
      ],
      '/cache/': [
        {
          text: '缓存',
          items: [
            { text: 'Redis核心知识', link: '/cache/Redis核心知识' },
            { text: 'Redis核心源码解读', link: '/cache/Redis核心源码解读' },
          ]
        }
      ],
      '/middleware/': [
        {
          text: '中间件 & 微服务',
          items: [
            { text: 'Nacos核心知识', link: '/middleware/Nacos核心知识' },
            { text: 'ZooKeeper核心知识', link: '/middleware/ZooKeeper核心知识' },
            { text: '微服务服务治理核心知识', link: '/middleware/微服务服务治理核心知识' },
            { text: 'Nginx与Gateway对比详解', link: '/middleware/Nginx与Gateway对比详解' },
            { text: 'MQ重复消费解决方案', link: '/middleware/MQ重复消费解决方案' },
          ]
        }
      ],
      '/network/': [
        {
          text: '网络 & 协议',
          items: [
            { text: 'HTTP与HTTPS细节区别', link: '/network/HTTP与HTTPS细节区别' },
            { text: 'HTTP2详解', link: '/network/HTTP2详解' },
            { text: 'HTTP状态码402详解', link: '/network/HTTP状态码402详解' },
            { text: 'TCP与UDP差异详解', link: '/network/TCP与UDP差异详解' },
            { text: '多路复用详解', link: '/network/多路复用详解' },
            { text: '通信协议详解', link: '/network/通信协议详解' },
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
            { text: '幂等设计详解', link: '/architecture/幂等设计详解' },
          ]
        }
      ],
      '/algorithm/': [
        {
          text: '算法',
          items: [
            { text: '算法题学习路径', link: '/algorithm/算法题学习路径' },
            { text: '简单算法题与解题思路', link: '/algorithm/简单算法题与解题思路' },
            { text: '时间复杂度与空间复杂度', link: '/algorithm/时间复杂度与空间复杂度' },
          ]
        }
      ],
    },
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/dongzongao/hexinjishudian' }
    ],
    footer: {
      message: '后端核心技术点知识库',
    }
  }
})
