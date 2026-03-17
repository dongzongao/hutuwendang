# Redis 核心源码解读

> 基于 Redis 7.x 源码，使用 C 语言，核心文件在 src/ 目录下

## 一、基础数据结构源码

### 1. SDS（Simple Dynamic String）动态字符串

Redis 没有直接使用 C 的 char*，而是自己实现了 SDS。

```c
/* sds.h */

/* SDS 头部结构（sdshdr8 为例，存储长度 < 256 的字符串）*/
struct __attribute__ ((__packed__)) sdshdr8 {
    uint8_t len;        /* 已使用长度 */
    uint8_t alloc;      /* 分配的总长度（不含头部和\0）*/
    unsigned char flags;/* 低3位标识类型：sdshdr5/8/16/32/64 */
    char buf[];         /* 实际字符数组 */
};

/* 根据字符串长度选择不同头部类型，节省内存 */
/* sdshdr5:  len < 32      头部 1 字节 */
/* sdshdr8:  len < 256     头部 3 字节 */
/* sdshdr16: len < 65536   头部 5 字节 */
/* sdshdr32: len < 2^32    头部 9 字节 */
/* sdshdr64: len < 2^64    头部 17 字节 */
```

```c
/* sds.c - 创建 SDS */
sds sdsnewlen(const void *init, size_t initlen) {
    void *sh;
    sds s;
    char type = sdsReqType(initlen); /* 根据长度选类型 */
    int hdrlen = sdsHdrSize(type);

    sh = s_malloc(hdrlen + initlen + 1); /* +1 为 \0 */
    s = (char*)sh + hdrlen;             /* s 指向 buf */

    /* 设置头部信息 */
    switch(type) {
        case SDS_TYPE_8: {
            SDS_HDR_VAR(8, s);
            sh->len = initlen;
            sh->alloc = initlen;
            sh->flags = SDS_TYPE_8;
            break;
        }
        /* ... 其他类型 */
    }
    if (initlen && init)
        memcpy(s, init, initlen);
    s[initlen] = '\0';
    return s;
}
```

```c
/* sds.c - 追加字符串（空间不足时自动扩容）*/
sds sdscatlen(sds s, const void *t, size_t len) {
    size_t curlen = sdslen(s);

    s = sdsMakeRoomFor(s, len); /* 确保有足够空间 */
    if (s == NULL) return NULL;

    memcpy(s + curlen, t, len);
    sdssetlen(s, curlen + len);
    s[curlen + len] = '\0';
    return s;
}

/* 扩容策略 */
sds sdsMakeRoomFor(sds s, size_t addlen) {
    size_t avail = sdsavail(s);
    if (avail >= addlen) return s; /* 空间够用，直接返回 */

    size_t len = sdslen(s);
    size_t newlen = len + addlen;

    /* 扩容策略：小于 1MB 翻倍，大于 1MB 每次加 1MB */
    if (newlen < SDS_MAX_PREALLOC)  /* SDS_MAX_PREALLOC = 1MB */
        newlen *= 2;
    else
        newlen += SDS_MAX_PREALLOC;

    /* 重新分配内存 */
    /* ... */
}
```

**SDS 对比 C 字符串的优势**：

```
┌──────────────────┬──────────────────┬──────────────────┐
│  特性             │  C 字符串         │  SDS             │
├──────────────────┼──────────────────┼──────────────────┤
│ 获取长度          │ O(n) 遍历         │ O(1) 读 len 字段  │
│ 缓冲区溢出        │ 可能              │ 自动扩容，不会    │
│ 内存重分配        │ 每次修改都要      │ 预分配，惰性释放  │
│ 二进制安全        │ 不安全（\0截断）  │ 安全（记录长度）  │
│ 兼容 C 函数       │ 是               │ 是（buf 末尾有\0）│
└──────────────────┴──────────────────┴──────────────────┘
```

### 2. Dict（字典/哈希表）

Redis 的核心数据结构，数据库本身就是一个大 dict。

```c
/* dict.h */

/* 哈希表节点 */
typedef struct dictEntry {
    void *key;
    union {
        void *val;
        uint64_t u64;
        int64_t s64;
        double d;
    } v;
    struct dictEntry *next; /* 链地址法解决冲突，指向下一个节点 */
} dictEntry;

/* 哈希表 */
typedef struct dictht {
    dictEntry **table;   /* 哈希表数组（桶数组）*/
    unsigned long size;  /* 哈希表大小（2的幂次）*/
    unsigned long sizemask; /* size - 1，用于计算索引 */
    unsigned long used;  /* 已有节点数量 */
} dictht;

/* 字典 */
typedef struct dict {
    dictType *type;  /* 类型特定函数（hash/compare/dup/free）*/
    void *privdata;
    dictht ht[2];    /* 两个哈希表，用于渐进式 rehash */
    long rehashidx;  /* rehash 进度，-1 表示未在 rehash */
    int16_t pauserehash; /* 暂停 rehash 的计数 */
} dict;
```

```c
/* dict.c - 查找 key */
dictEntry *dictFind(dict *d, const void *key) {
    dictEntry *he;
    uint64_t h, idx, table;

    if (dictSize(d) == 0) return NULL;

    if (dictIsRehashing(d)) _dictRehashStep(d); /* 渐进式 rehash */

    h = dictHashKey(d, key); /* 计算哈希值 */

    /* 在 ht[0] 和 ht[1] 中都查找（rehash 期间两个表都有数据）*/
    for (table = 0; table <= 1; table++) {
        idx = h & d->ht[table].sizemask; /* 取模（位运算优化）*/
        he = d->ht[table].table[idx];
        while (he) {
            if (key == he->key || dictCompareKeys(d, key, he->key))
                return he;
            he = he->next; /* 链表遍历 */
        }
        if (!dictIsRehashing(d)) return NULL; /* 不在 rehash，只查 ht[0] */
    }
    return NULL;
}
```

```c
/* dict.c - 渐进式 rehash 核心逻辑 */
int dictRehash(dict *d, int n) {
    int empty_visits = n * 10; /* 最多访问空桶数，避免长时间阻塞 */

    if (!dictIsRehashing(d)) return 0;

    while (n-- && d->ht[0].used != 0) {
        dictEntry *de, *nextde;

        /* 跳过空桶 */
        while (d->ht[0].table[d->rehashidx] == NULL) {
            d->rehashidx++;
            if (--empty_visits == 0) return 1;
        }

        /* 将 ht[0] 当前桶的所有节点迁移到 ht[1] */
        de = d->ht[0].table[d->rehashidx];
        while (de) {
            nextde = de->next;
            uint64_t h = dictHashKey(d, de->key) & d->ht[1].sizemask;
            de->next = d->ht[1].table[h];
            d->ht[1].table[h] = de;
            d->ht[0].used--;
            d->ht[1].used++;
            de = nextde;
        }
        d->ht[0].table[d->rehashidx] = NULL;
        d->rehashidx++;
    }

    /* 检查是否 rehash 完成 */
    if (d->ht[0].used == 0) {
        zfree(d->ht[0].table);
        d->ht[0] = d->ht[1];
        _dictReset(&d->ht[1]);
        d->rehashidx = -1;
        return 0;
    }
    return 1;
}
```

**渐进式 rehash 原理**：

```
触发条件：
- 扩容：used / size >= 1（负载因子 >= 1），且没有 BGSAVE/BGREWRITEAOF
         used / size >= 5（负载因子 >= 5），强制扩容
- 缩容：used / size < 0.1（负载因子 < 0.1）

扩容大小：第一个 >= used*2 的 2 的幂次

渐进式过程：
┌─────────────────────────────────────────────────────┐
│  ht[0]（旧表）          ht[1]（新表）                │
│  [0] → A → B           [0] →                       │
│  [1] → C               [1] →                       │
│  [2] →                 [2] →                       │
│  [3] → D               [3] →                       │
│  rehashidx = 0                                      │
│                                                     │
│  每次操作（增删改查）时，迁移 rehashidx 指向的桶     │
│  迁移完成后 rehashidx++                             │
│                                                     │
│  新增操作只写 ht[1]，查询两个表都查                  │
└─────────────────────────────────────────────────────┘
```

### 3. ZSkipList（跳表）

Sorted Set 的底层实现之一，支持 O(log N) 的查找、插入、删除。

```c
/* server.h */

/* 跳表节点 */
typedef struct zskiplistNode {
    sds ele;                    /* 成员值 */
    double score;               /* 分数 */
    struct zskiplistNode *backward; /* 后退指针（用于反向遍历）*/
    struct zskiplistLevel {
        struct zskiplistNode *forward; /* 前进指针 */
        unsigned long span;            /* 跨越的节点数（用于计算排名）*/
    } level[];                  /* 层数组，柔性数组 */
} zskiplistNode;

/* 跳表 */
typedef struct zskiplist {
    struct zskiplistNode *header, *tail;
    unsigned long length; /* 节点数量（不含头节点）*/
    int level;            /* 当前最大层数 */
} zskiplist;

#define ZSKIPLIST_MAXLEVEL 32  /* 最大层数 */
#define ZSKIPLIST_P 0.25       /* 晋升概率 */
```

```c
/* t_zset.c - 随机生成层数 */
int zslRandomLevel(void) {
    static const int threshold = ZSKIPLIST_P * RAND_MAX;
    int level = 1;
    /* 每层有 25% 的概率继续增加层数 */
    while (random() < threshold)
        level += 1;
    return (level < ZSKIPLIST_MAXLEVEL) ? level : ZSKIPLIST_MAXLEVEL;
}

/* t_zset.c - 插入节点 */
zskiplistNode *zslInsert(zskiplist *zsl, double score, sds ele) {
    zskiplistNode *update[ZSKIPLIST_MAXLEVEL]; /* 记录每层的前驱节点 */
    unsigned long rank[ZSKIPLIST_MAXLEVEL];    /* 记录每层前驱节点的排名 */
    zskiplistNode *x = zsl->header;
    int i, level;

    /* 从最高层开始，找到每层的插入位置 */
    for (i = zsl->level - 1; i >= 0; i--) {
        rank[i] = (i == zsl->level - 1) ? 0 : rank[i + 1];
        while (x->level[i].forward &&
               (x->level[i].forward->score < score ||
                (x->level[i].forward->score == score &&
                 sdscmp(x->level[i].forward->ele, ele) < 0))) {
            rank[i] += x->level[i].span; /* 累加跨度 */
            x = x->level[i].forward;
        }
        update[i] = x;
    }

    level = zslRandomLevel(); /* 随机层数 */

    /* 如果新层数超过当前最大层数，初始化新层 */
    if (level > zsl->level) {
        for (i = zsl->level; i < level; i++) {
            rank[i] = 0;
            update[i] = zsl->header;
            update[i]->level[i].span = zsl->length;
        }
        zsl->level = level;
    }

    x = zslCreateNode(level, score, ele);

    /* 更新各层的前进指针和跨度 */
    for (i = 0; i < level; i++) {
        x->level[i].forward = update[i]->level[i].forward;
        update[i]->level[i].forward = x;
        x->level[i].span = update[i]->level[i].span - (rank[0] - rank[i]);
        update[i]->level[i].span = (rank[0] - rank[i]) + 1;
    }

    /* 更新后退指针 */
    x->backward = (update[0] == zsl->header) ? NULL : update[0];
    if (x->level[0].forward)
        x->level[0].forward->backward = x;
    else
        zsl->tail = x;

    zsl->length++;
    return x;
}
```

```
跳表结构示意（4层）：

level4: header ──────────────────────────────────────> NULL
level3: header ──────────> [score:3] ────────────────> NULL
level2: header ──────────> [score:3] ──> [score:7] ──> NULL
level1: header ──> [1] ──> [score:3] ──> [5] ──> [7] > NULL

查找 score=5：
- 从 level4 开始，header.forward=NULL，降层
- level3：header → 3 < 5，继续；3.forward=NULL，降层
- level2：3 → 7 > 5，降层
- level1：3 → 5，找到！

时间复杂度：O(log N)，期望层数 = log(1/P)(N) = log4(N)
```

**为什么用跳表而不用红黑树**：

```
1. 实现简单：跳表代码量远少于红黑树
2. 范围查询更快：跳表天然有序，范围查询只需找到起点后顺序遍历
3. 内存局部性：跳表节点按 score 顺序排列，缓存友好
4. 并发友好：跳表的锁粒度更细（Redis 单线程不需要，但设计上更优）
```

### 4. QuickList（快速列表）

List 类型的底层实现，是 ziplist（或 listpack）的双向链表。

```c
/* quicklist.h */

typedef struct quicklistNode {
    struct quicklistNode *prev;
    struct quicklistNode *next;
    unsigned char *entry;   /* 指向 ziplist 或 listpack */
    size_t sz;              /* entry 的字节大小 */
    unsigned int count : 16;/* ziplist 中的元素数量 */
    unsigned int encoding : 2; /* RAW=1（ziplist）, LZF=2（压缩）*/
    unsigned int container : 2;/* PLAIN=1, PACKED=2（ziplist/listpack）*/
    unsigned int recompress : 1;
    unsigned int attempted_compress : 1;
    unsigned int dont_compress : 1;
    unsigned int extra : 9;
} quicklistNode;

typedef struct quicklist {
    quicklistNode *head;
    quicklistNode *tail;
    unsigned long count;    /* 所有 ziplist 中的元素总数 */
    unsigned long len;      /* quicklistNode 数量 */
    signed int fill : QL_FILL_BITS;     /* 每个节点最大元素数 */
    unsigned int compress : QL_COMP_BITS; /* 两端不压缩的节点数 */
    unsigned int bookmark_count: QL_BM_BITS;
    quicklistBookmark bookmarks[];
} quicklist;
```

```
QuickList 结构：

┌──────────────────────────────────────────────────────┐
│  quicklist                                            │
│  head ──> node1 <──> node2 <──> node3 <── tail       │
│           │          │          │                     │
│           ▼          ▼          ▼                     │
│        ziplist    ziplist    ziplist                  │
│        [a,b,c]    [d,e,f]    [g,h,i]                 │
└──────────────────────────────────────────────────────┘

配置参数：
list-max-ziplist-size -2   # 每个节点最大 8KB
list-compress-depth 0      # 两端各 0 个节点不压缩（0=不压缩）
```

### 5. ListPack（紧凑列表，Redis 7.0 替代 ZipList）

```c
/* listpack.h / listpack.c */

/*
 * ListPack 内存布局：
 *
 * <total-bytes> <num-elements> <element-1> ... <element-N> <end>
 *    4字节          2字节                                    1字节(0xFF)
 *
 * 每个 element 结构：
 * <encoding-type> <element-data> <backlen>
 *
 * backlen：当前 entry 的总长度，用于从后往前遍历
 *
 * 对比 ZipList 的改进：
 * - ZipList 的 prevlen 字段记录前一个节点长度，修改时可能引发连锁更新
 * - ListPack 的 backlen 只记录自身长度，彻底解决连锁更新问题
 */

/* 编码类型 */
#define LP_ENCODING_7BIT_UINT     0x00  /* 0xxxxxxx，7位无符号整数 */
#define LP_ENCODING_6BIT_STR      0x80  /* 10xxxxxx，6位长度字符串 */
#define LP_ENCODING_13BIT_INT     0xC0  /* 110xxxxx，13位有符号整数 */
#define LP_ENCODING_16BIT_INT     0xF1  /* 16位整数 */
#define LP_ENCODING_24BIT_INT     0xF2  /* 24位整数 */
#define LP_ENCODING_32BIT_INT     0xF3  /* 32位整数 */
#define LP_ENCODING_64BIT_INT     0xF4  /* 64位整数 */
#define LP_ENCODING_12BIT_STR     0xE0  /* 12位长度字符串 */
#define LP_ENCODING_32BIT_STR     0xF0  /* 32位长度字符串 */
```

## 二、对象系统（RedisObject）

### 1. RedisObject 结构

```c
/* server.h */

typedef struct redisObject {
    unsigned type : 4;      /* 对象类型：OBJ_STRING/LIST/SET/ZSET/HASH */
    unsigned encoding : 4;  /* 编码方式（底层数据结构）*/
    unsigned lru : LRU_BITS;/* LRU 时钟（24位），用于 LRU 淘汰 */
    int refcount;           /* 引用计数，为 0 时释放内存 */
    void *ptr;              /* 指向实际数据 */
} robj;

/* 类型常量 */
#define OBJ_STRING  0
#define OBJ_LIST    1
#define OBJ_SET     2
#define OBJ_ZSET    3
#define OBJ_HASH    4

/* 编码常量 */
#define OBJ_ENCODING_RAW        0  /* SDS */
#define OBJ_ENCODING_INT        1  /* long 整数，ptr 直接存值 */
#define OBJ_ENCODING_HT         2  /* dict */
#define OBJ_ENCODING_ZIPLIST    5  /* ziplist（旧版）*/
#define OBJ_ENCODING_INTSET     6  /* intset */
#define OBJ_ENCODING_SKIPLIST   7  /* skiplist + dict */
#define OBJ_ENCODING_EMBSTR     8  /* embstr 编码的 SDS */
#define OBJ_ENCODING_QUICKLIST  9  /* quicklist */
#define OBJ_ENCODING_STREAM    10  /* stream */
#define OBJ_ENCODING_LISTPACK  11  /* listpack */
```

### 2. 各类型编码转换

```
String 编码转换：
┌─────────────────────────────────────────────────────────┐
│  整数值（0~9999 共享对象，其他 long 范围整数）            │
│  → OBJ_ENCODING_INT（ptr 直接存 long 值）                │
│                                                          │
│  字符串长度 <= 44 字节                                   │
│  → OBJ_ENCODING_EMBSTR（robj 和 SDS 连续内存，一次分配） │
│                                                          │
│  字符串长度 > 44 字节                                    │
│  → OBJ_ENCODING_RAW（robj 和 SDS 分开分配）              │
└─────────────────────────────────────────────────────────┘

Hash 编码转换：
┌─────────────────────────────────────────────────────────┐
│  元素数量 <= 128 且所有值长度 <= 64 字节                  │
│  → OBJ_ENCODING_LISTPACK（紧凑，省内存）                 │
│                                                          │
│  超过阈值                                                │
│  → OBJ_ENCODING_HT（dict，O(1) 查找）                   │
└─────────────────────────────────────────────────────────┘

ZSet 编码转换：
┌─────────────────────────────────────────────────────────┐
│  元素数量 <= 128 且所有成员长度 <= 64 字节                │
│  → OBJ_ENCODING_LISTPACK                                │
│                                                          │
│  超过阈值                                                │
│  → OBJ_ENCODING_SKIPLIST + OBJ_ENCODING_HT（双索引）    │
│    skiplist：按 score 排序，支持范围查询                  │
│    dict：按 member 查找，O(1) 获取 score                 │
└─────────────────────────────────────────────────────────┘

Set 编码转换：
┌─────────────────────────────────────────────────────────┐
│  全是整数 且 数量 <= 512                                  │
│  → OBJ_ENCODING_INTSET（有序整数数组，二分查找）          │
│                                                          │
│  超过阈值或有非整数                                       │
│  → OBJ_ENCODING_LISTPACK（数量 <= 128）                  │
│  → OBJ_ENCODING_HT（超过 128）                           │
└─────────────────────────────────────────────────────────┘
```

```c
/* object.c - embstr vs raw 的分界线 */
#define OBJ_ENCODING_EMBSTR_SIZE_LIMIT 44

/* 为什么是 44？
 * jemalloc 分配内存以 2 的幂次为单位
 * robj 大小 = 16 字节
 * sdshdr8 大小 = 3 字节（len + alloc + flags）
 * \0 = 1 字节
 * 16 + 3 + 44 + 1 = 64 字节，正好是 jemalloc 的一个分配单元
 */
robj *createStringObject(const char *ptr, size_t len) {
    if (len <= OBJ_ENCODING_EMBSTR_SIZE_LIMIT)
        return createEmbstrStringObject(ptr, len);
    else
        return createRawStringObject(ptr, len);
}
```

## 三、事件驱动模型（ae.c）

### 1. 事件循环核心

```c
/* ae.h */

/* 文件事件 */
typedef struct aeFileEvent {
    int mask;               /* AE_READABLE | AE_WRITABLE | AE_BARRIER */
    aeFileProc *rfileProc;  /* 读事件处理函数 */
    aeFileProc *wfileProc;  /* 写事件处理函数 */
    void *clientData;
} aeFileEvent;

/* 时间事件 */
typedef struct aeTimeEvent {
    long long id;
    monotime when;
    aeTimeProc *timeProc;   /* 时间事件处理函数 */
    aeEventFinalizerProc *finalizerProc;
    void *clientData;
    struct aeTimeEvent *prev;
    struct aeTimeEvent *next;
    int refcount;
} aeTimeEvent;

/* 事件循环 */
typedef struct aeEventLoop {
    int maxfd;
    int setsize;            /* 监听的最大 fd 数量 */
    long long timeEventNextId;
    aeFileEvent *events;    /* 注册的文件事件数组 */
    aeFiredEvent *fired;    /* 已触发的事件数组 */
    aeTimeEvent *timeEventHead; /* 时间事件链表头 */
    int stop;
    void *apidata;          /* 底层 IO 多路复用数据（epoll/kqueue/select）*/
    aeBeforeSleepProc *beforesleep;
    aeBeforeSleepProc *aftersleep;
    int flags;
} aeEventLoop;
```

```c
/* ae.c - 事件循环主函数 */
void aeMain(aeEventLoop *eventLoop) {
    eventLoop->stop = 0;
    while (!eventLoop->stop) {
        aeProcessEvents(eventLoop, AE_ALL_EVENTS | AE_CALL_BEFORE_SLEEP
                        | AE_CALL_AFTER_SLEEP);
    }
}

/* ae.c - 处理事件 */
int aeProcessEvents(aeEventLoop *eventLoop, int flags) {
    int processed = 0, numevents;

    /* 计算最近时间事件的等待时间，作为 IO 多路复用的超时时间 */
    struct timeval tv, *tvp = NULL;
    aeTimeEvent *shortest = aeSearchNearestTimer(eventLoop);
    if (shortest) {
        /* 计算距最近时间事件还有多久 */
        /* ... */
        tvp = &tv;
    }

    if (eventLoop->beforesleep != NULL && flags & AE_CALL_BEFORE_SLEEP)
        eventLoop->beforesleep(eventLoop); /* 处理前的回调（如 flushAppendOnlyFile）*/

    /* 调用底层 IO 多路复用（epoll_wait / kevent / select）*/
    numevents = aeApiPoll(eventLoop, tvp);

    if (eventLoop->aftersleep != NULL && flags & AE_CALL_AFTER_SLEEP)
        eventLoop->aftersleep(eventLoop);

    /* 处理触发的文件事件 */
    for (int j = 0; j < numevents; j++) {
        int fd = eventLoop->fired[j].fd;
        aeFileEvent *fe = &eventLoop->events[fd];
        int mask = eventLoop->fired[j].mask;

        /* 先读后写（除非设置了 AE_BARRIER）*/
        int fired = 0;
        int invert = fe->mask & AE_BARRIER;

        if (!invert && fe->mask & mask & AE_READABLE) {
            fe->rfileProc(eventLoop, fd, fe->clientData, mask);
            fired++;
        }
        if (fe->mask & mask & AE_WRITABLE) {
            if (!fired || fe->wfileProc != fe->rfileProc) {
                fe->wfileProc(eventLoop, fd, fe->clientData, mask);
                fired++;
            }
        }
        processed++;
    }

    /* 处理时间事件 */
    if (flags & AE_TIME_EVENTS)
        processed += processTimeEvents(eventLoop);

    return processed;
}
```

### 2. IO 多路复用封装

```c
/* ae_epoll.c（Linux）/ ae_kqueue.c（macOS）/ ae_select.c（通用）*/

/* Redis 自动选择最优的 IO 多路复用实现 */
#ifdef HAVE_EVPORT
#include "ae_evport.c"  /* Solaris */
#else
    #ifdef HAVE_EPOLL
    #include "ae_epoll.c"   /* Linux */
    #else
        #ifdef HAVE_KQUEUE
        #include "ae_kqueue.c"  /* macOS/BSD */
        #else
        #include "ae_select.c"  /* 通用 */
        #endif
    #endif
#endif

/* ae_epoll.c - 等待事件 */
static int aeApiPoll(aeEventLoop *eventLoop, struct timeval *tvp) {
    aeApiState *state = eventLoop->apidata;
    int retval, numevents = 0;

    retval = epoll_wait(state->epfd, state->events, eventLoop->setsize,
                        tvp ? (tvp->tv_sec*1000 + (tvp->tv_usec+999)/1000) : -1);

    if (retval > 0) {
        for (int j = 0; j < retval; j++) {
            int mask = 0;
            struct epoll_event *e = state->events + j;
            if (e->events & EPOLLIN)  mask |= AE_READABLE;
            if (e->events & EPOLLOUT) mask |= AE_WRITABLE;
            if (e->events & EPOLLERR) mask |= AE_READABLE | AE_WRITABLE;
            if (e->events & EPOLLHUP) mask |= AE_READABLE | AE_WRITABLE;
            eventLoop->fired[numevents].fd = e->data.fd;
            eventLoop->fired[numevents].mask = mask;
            numevents++;
        }
    }
    return numevents;
}
```

```
Redis 事件模型总览：

┌─────────────────────────────────────────────────────────┐
│                    Redis 主线程                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │                  事件循环 (aeMain)                 │  │
│  │                                                    │  │
│  │  ┌─────────────┐    ┌──────────────────────────┐  │  │
│  │  │  时间事件    │    │       文件事件            │  │  │
│  │  │             │    │                          │  │  │
│  │  │ serverCron  │    │  acceptTcpHandler（连接）│  │  │
│  │  │ (100ms)     │    │  readQueryFromClient（读）│  │  │
│  │  │             │    │  sendReplyToClient（写）  │  │  │
│  │  └─────────────┘    └──────────────────────────┘  │  │
│  │                              ↑                      │  │
│  │                         epoll_wait                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 四、命令处理流程（networking.c + server.c）

### 1. 客户端请求处理

```c
/* networking.c - 读取客户端数据 */
void readQueryFromClient(connection *conn) {
    client *c = connGetPrivateData(conn);
    int nread, big_arg = 0;
    size_t qblen;

    /* 读取数据到 querybuf */
    qblen = sdslen(c->querybuf);
    c->querybuf = sdsMakeRoomFor(c->querybuf, readlen);
    nread = connRead(c->conn, c->querybuf + qblen, readlen);

    if (nread <= 0) {
        /* 处理错误或连接关闭 */
        freeClientAsync(c);
        return;
    }

    sdsIncrLen(c->querybuf, nread);
    c->lastinteraction = server.unixtime;

    /* 解析命令 */
    processInputBuffer(c);
}

/* networking.c - 解析 RESP 协议 */
void processInputBuffer(client *c) {
    while (c->qb_pos < sdslen(c->querybuf)) {
        /* 判断协议类型 */
        if (c->querybuf[c->qb_pos] == '*') {
            /* RESP 多行协议（标准客户端）*/
            if (processMultibulkBuffer(c) != C_OK) break;
        } else {
            /* 内联命令（telnet 直接输入）*/
            if (processInlineBuffer(c) != C_OK) break;
        }

        /* 命令解析完成，执行命令 */
        if (c->argc == 0) {
            resetClient(c);
        } else {
            if (processCommandAndResetClient(c) == C_ERR) return;
        }
    }
}
```

```c
/* server.c - 命令执行核心 */
int processCommand(client *c) {
    /* 1. 查找命令表 */
    c->cmd = c->lastcmd = c->realcmd = lookupCommand(c->argv, c->argc);

    if (!c->cmd) {
        /* 命令不存在 */
        rejectCommandFormat(c, "unknown command `%s`", ...);
        return C_OK;
    }

    /* 2. 权限检查 */
    if (authRequired(c)) { ... }

    /* 3. 参数数量检查 */
    if ((c->cmd->arity > 0 && c->cmd->arity != c->argc) ||
        (c->argc < -c->cmd->arity)) {
        rejectCommandFormat(c, "wrong number of arguments for '%s' command", ...);
        return C_OK;
    }

    /* 4. 内存检查 */
    if (server.maxmemory && !server.loading) {
        int out_of_memory = (performEvictions() == EVICT_FAIL);
        /* ... */
    }

    /* 5. 持久化检查（AOF/RDB 错误时拒绝写命令）*/
    /* ... */

    /* 6. 执行命令 */
    call(c, CMD_CALL_FULL);

    return C_OK;
}

/* server.c - 实际调用命令处理函数 */
void call(client *c, int flags) {
    long long dirty = server.dirty;
    uint64_t client_old_flags = c->flags;
    struct redisCommand *real_cmd = c->realcmd;

    /* 执行命令 */
    c->cmd->proc(c);  /* 调用具体命令的处理函数，如 setCommand、getCommand */

    /* 统计命令耗时 */
    long long duration = ustime() - c->cmd->microseconds;

    /* 慢日志记录 */
    if (flags & CMD_CALL_SLOWLOG)
        slowlogPushCurrentCommand(c, real_cmd, duration);

    /* 传播到 AOF 和从节点 */
    if (flags & CMD_CALL_PROPAGATE) {
        propagate(c, dbid, c->argv, c->argc, propagate_flags);
    }
}
```

### 2. RESP 协议解析

```
RESP（Redis Serialization Protocol）格式：

简单字符串：+OK\r\n
错误：       -ERR message\r\n
整数：       :1000\r\n
批量字符串： $6\r\nfoobar\r\n
数组：       *3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n

SET key value 的 RESP 编码：
*3\r\n          ← 3个元素的数组
$3\r\n          ← 第1个元素长度3
SET\r\n         ← 第1个元素
$3\r\n          ← 第2个元素长度3
key\r\n         ← 第2个元素
$5\r\n          ← 第3个元素长度5
value\r\n       ← 第3个元素
```

## 五、过期键删除源码

```c
/* db.c - 惰性删除：访问 key 时检查是否过期 */
int expireIfNeeded(redisDb *db, robj *key, int flags) {
    if (!keyIsExpired(db, key)) return 0; /* 未过期，直接返回 */

    /* 从节点不主动删除，等主节点的 DEL 命令 */
    if (server.masterhost != NULL) {
        if (server.current_client &&
            (server.current_client->flags & CLIENT_MASTER)) return 0;
        if (!(flags & EXPIRE_FORCE_DELETE_EXPIRED)) return 1;
    }

    /* 删除过期 key */
    deleteExpiredKeyAndPropagate(db, key);
    return 1;
}

/* expire.c - 定期删除：serverCron 中调用 */
void activeExpireCycle(int type) {
    /* 每次最多处理 ACTIVE_EXPIRE_CYCLE_LOOKUPS_PER_LOOP 个 key */
    static unsigned int current_db = 0;
    int dbs_per_call = CRON_DBS_PER_CALL; /* 每次处理的数据库数量 */

    for (int j = 0; j < dbs_per_call && timelimit_exit == 0; j++) {
        redisDb *db = server.db + (current_db % server.dbnum);
        current_db++;

        do {
            unsigned long num = dictSize(db->expires); /* 有过期时间的 key 数量 */
            if (num == 0) break;

            /* 随机抽取 20 个 key 检查 */
            long long now = mstime();
            int expired = 0;
            int count = 0;

            while (count++ < ACTIVE_EXPIRE_CYCLE_LOOKUPS_PER_LOOP) {
                dictEntry *de = dictGetRandomKey(db->expires);
                if (!de) break;

                long long t = dictGetSignedIntegerVal(de);
                if (now > t) {
                    /* 过期，删除 */
                    sds key = dictGetKey(de);
                    robj *keyobj = createStringObject(key, sdslen(key));
                    deleteExpiredKeyAndPropagate(db, keyobj);
                    decrRefCount(keyobj);
                    expired++;
                }
            }

            /* 如果过期比例 > 25%，继续扫描 */
        } while (expired > ACTIVE_EXPIRE_CYCLE_LOOKUPS_PER_LOOP / 4);
    }
}
```

## 六、LRU / LFU 淘汰源码

```c
/* evict.c - 内存淘汰核心 */
int performEvictions(void) {
    if (!isSafeToPerformEvictions()) return EVICT_OK;

    /* 计算需要释放的内存量 */
    size_t mem_reported, mem_tofree, mem_freed;
    mem_reported = zmalloc_used_memory();
    if (mem_reported <= server.maxmemory) return EVICT_OK;
    mem_tofree = mem_reported - server.maxmemory;

    while (mem_freed < mem_tofree) {
        sds bestkey = NULL;
        int bestdbid;
        redisDb *db;
        dictEntry *de;

        if (server.maxmemory_policy & (MAXMEMORY_FLAG_LRU | MAXMEMORY_FLAG_LFU)
            || server.maxmemory_policy == MAXMEMORY_VOLATILE_TTL) {

            /* 使用近似 LRU/LFU：随机采样 maxmemory_samples 个 key */
            struct evictionPoolEntry *pool = EvictionPoolLRU;
            evictionPoolPopulate(bestdbid, db, db->dict, db->expires, pool);

            /* 从 pool 中选择最佳淘汰 key */
            for (int k = EVPOOL_SIZE - 1; k >= 0; k--) {
                if (pool[k].key == NULL) continue;
                bestdbid = pool[k].dbid;
                /* ... 找到 bestkey */
                break;
            }
        } else {
            /* RANDOM 策略：随机选一个 key */
            /* ... */
        }

        if (bestkey) {
            db = server.db + bestdbid;
            robj *keyobj = createStringObject(bestkey, sdslen(bestkey));
            /* 删除 key，统计释放的内存 */
            dbSyncDelete(db, keyobj);
            /* ... */
        }
    }
    return (mem_freed < mem_tofree) ? EVICT_FAIL : EVICT_OK;
}
```

```c
/* LRU 时钟（server.h）*/
#define LRU_CLOCK_MAX ((1<<24)-1)  /* 24位，最大值 16777215 */
#define LRU_CLOCK_RESOLUTION 1000  /* 精度 1000ms = 1秒 */

/* 获取当前 LRU 时钟值 */
unsigned int getLRUClock(void) {
    return (mstime() / LRU_CLOCK_RESOLUTION) & LRU_CLOCK_MAX;
}

/* LFU 编码（复用 lru 字段的 24 位）*/
/* 高16位：上次访问时间（分钟精度）*/
/* 低8位：访问频率计数（对数计数器，最大255）*/
#define LFU_INIT_VAL 5  /* 初始频率值 */

/* 对数计数器递增（不是每次访问都+1，而是概率递增）*/
uint8_t LFULogIncr(uint8_t counter) {
    if (counter == 255) return 255;
    double r = (double)rand() / RAND_MAX;
    double baseval = counter - LFU_INIT_VAL;
    if (baseval < 0) baseval = 0;
    double p = 1.0 / (baseval * server.lfu_log_factor + 1);
    if (r < p) counter++;
    return counter;
}
```

## 七、持久化源码

### 1. RDB 持久化

```c
/* rdb.c - BGSAVE 触发 fork */
int rdbSaveBackground(int req, char *filename, rdbSaveInfo *rsi) {
    pid_t childpid;

    if ((childpid = redisFork(CHILD_TYPE_RDB)) == 0) {
        /* 子进程：执行 RDB 保存 */
        int retval = rdbSave(req, filename, rsi);
        sendChildCowInfo(CHILD_INFO_TYPE_RDB_COW_SIZE, "RDB");
        exitFromChild((retval == C_OK) ? 0 : 1);
    } else {
        /* 父进程：记录子进程 PID，继续处理请求 */
        server.rdb_save_time_start = time(NULL);
        server.rdb_child_pid = childpid;
        return C_OK;
    }
    return C_OK;
}

/* rdb.c - 保存数据库到 RDB 文件 */
int rdbSave(int req, char *filename, rdbSaveInfo *rsi) {
    char tmpfile[256];
    FILE *fp = NULL;
    rio rdb;

    /* 写入临时文件，完成后原子重命名 */
    snprintf(tmpfile, 256, "temp-%d.rdb", (int)getpid());
    fp = fopen(tmpfile, "w");

    rioInitWithFile(&rdb, fp);

    /* 写入 RDB 头部：REDIS + 版本号 */
    if (rdbSaveRio(req, &rdb, &error, RDB_SAVE_NONE, rsi) == C_ERR) {
        /* ... */
    }

    fflush(fp);
    fsync(fileno(fp));
    fclose(fp);

    /* 原子重命名 */
    rename(tmpfile, filename);
    return C_OK;
}
```

```
RDB 文件格式：
┌──────────────────────────────────────────────────────┐
│  REDIS0011          ← 魔数 + 版本号（9字节）          │
├──────────────────────────────────────────────────────┤
│  FA                 ← 辅助字段标识                    │
│  redis-ver 7.0.0    ← Redis 版本                     │
│  FA                                                   │
│  redis-bits 64      ← 系统位数                       │
├──────────────────────────────────────────────────────┤
│  FE 0               ← 数据库编号（DB 0）              │
│  FB 100 50          ← key 数量 100，过期 key 50       │
├──────────────────────────────────────────────────────┤
│  [type][key][value] ← 键值对数据                     │
│  FC [expire_ms]     ← 过期时间（毫秒）                │
│  [type][key][value]                                   │
│  ...                                                  │
├──────────────────────────────────────────────────────┤
│  FF                 ← 结束标识                        │
│  [8字节 CRC64]      ← 校验和                          │
└──────────────────────────────────────────────────────┘
```

### 2. AOF 持久化

```c
/* aof.c - 将命令追加到 AOF 缓冲区 */
void feedAppendOnlyFile(client *c) {
    sds buf = sdsempty();
    robj **argv = c->argv;
    int argc = c->argc;

    /* 将命令转换为 RESP 格式追加到 buf */
    buf = catAppendOnlyGenericCommand(buf, argc, argv);

    /* 追加到 AOF 缓冲区 */
    server.aof_buf = sdscatlen(server.aof_buf, buf, sdslen(buf));
    sdsfree(buf);
}

/* aof.c - 将 AOF 缓冲区刷盘（在事件循环的 beforesleep 中调用）*/
void flushAppendOnlyFile(int force) {
    ssize_t nwritten;
    int sync_in_progress = 0;

    if (sdslen(server.aof_buf) == 0) {
        /* 缓冲区为空，但可能需要 fsync */
        if (server.aof_fsync == AOF_FSYNC_EVERYSEC && ...)
            goto try_fsync;
        return;
    }

    /* 写入文件 */
    nwritten = aofWrite(server.aof_fd, server.aof_buf, sdslen(server.aof_buf));

    /* 根据 appendfsync 配置决定是否 fsync */
    if (server.aof_fsync == AOF_FSYNC_ALWAYS) {
        redis_fsync(server.aof_fd); /* 每次都 fsync */
    } else if (server.aof_fsync == AOF_FSYNC_EVERYSEC) {
        /* 每秒 fsync，异步执行 */
        if (!sync_in_progress) aof_background_fsync(server.aof_fd);
    }

    /* 清空已写入的缓冲区 */
    server.aof_buf = sdstrim(server.aof_buf, "");
}
```

## 八、主从复制源码

```c
/* replication.c - 从节点发起复制 */
void replicationCron(void) {
    /* 定期检查复制状态 */
    if (server.masterhost && server.repl_state == REPL_STATE_CONNECT) {
        connectWithMaster(); /* 连接主节点 */
    }
}

/* replication.c - 发送 PSYNC 命令 */
int slaveTryPartialResynchronization(connection *conn, int read_reply) {
    char *psync_replid;
    char psync_offset[32];

    if (!read_reply) {
        /* 发送 PSYNC <replid> <offset> */
        if (server.cached_master) {
            /* 有缓存的主节点信息，尝试部分同步 */
            psync_replid = server.cached_master->replid;
            snprintf(psync_offset, sizeof(psync_offset), "%lld",
                     server.cached_master->reploff + 1);
        } else {
            /* 全量同步 */
            psync_replid = "?";
            memcpy(psync_offset, "-1", 3);
        }

        reply = sendSynchronousCommand(SYNC_CMD_WRITE, conn,
                                       "PSYNC", psync_replid, psync_offset, NULL);
        return PSYNC_WAIT_REPLY;
    }

    /* 读取主节点响应 */
    reply = sendSynchronousCommand(SYNC_CMD_READ, conn, NULL);

    if (!strncmp(reply, "+FULLRESYNC", 11)) {
        /* 全量同步：接收 RDB */
        /* ... */
        return PSYNC_FULLRESYNC;
    } else if (!strncmp(reply, "+CONTINUE", 9)) {
        /* 部分同步：接收增量命令 */
        return PSYNC_CONTINUE;
    }
}
```

```
主从复制流程：

主节点                              从节点
  │                                   │
  │  <── PSYNC ? -1（全量同步请求）── │
  │                                   │
  │  FULLRESYNC <replid> <offset> ──> │
  │                                   │
  │  fork 子进程生成 RDB               │
  │  ──── RDB 文件 ──────────────────> │  加载 RDB
  │                                   │
  │  ──── 缓冲区积压的写命令 ─────────> │  执行命令
  │                                   │
  │  ──── 实时增量命令（RESP）────────> │  持续同步
  │                                   │

复制积压缓冲区（repl_backlog）：
- 固定大小的环形缓冲区（默认 1MB）
- 记录最近的写命令
- 用于断线重连后的部分同步
- 如果从节点落后太多（超出缓冲区），触发全量同步
```

## 九、核心源码文件速查

```
src/
├── server.h / server.c     # 核心数据结构定义、serverCron、命令表
├── ae.h / ae.c             # 事件循环
├── ae_epoll.c              # epoll 实现（Linux）
├── networking.c            # 客户端连接、RESP 协议解析、回复发送
├── db.c                    # 数据库操作（增删改查、过期）
├── object.c                # RedisObject 创建、编码转换
├── sds.h / sds.c           # 动态字符串
├── dict.h / dict.c         # 字典（哈希表）
├── adlist.h / adlist.c     # 双向链表
├── quicklist.h / quicklist.c # 快速列表
├── listpack.h / listpack.c # 紧凑列表（Redis 7.0+）
├── ziplist.h / ziplist.c   # 压缩列表（旧版）
├── intset.h / intset.c     # 整数集合
├── t_string.c              # String 命令实现
├── t_list.c                # List 命令实现
├── t_hash.c                # Hash 命令实现
├── t_set.c                 # Set 命令实现
├── t_zset.c                # ZSet 命令实现（含跳表）
├── rdb.h / rdb.c           # RDB 持久化
├── aof.c                   # AOF 持久化
├── replication.c           # 主从复制
├── sentinel.c              # 哨兵模式
├── cluster.h / cluster.c   # 集群模式
├── evict.c                 # 内存淘汰（LRU/LFU）
├── expire.c                # 过期键处理
├── bio.c                   # 后台 IO 线程（异步删除等）
└── lazyfree.c              # 惰性删除（UNLINK）
```
