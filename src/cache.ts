/**
 * 缓存机制模块
 * 用于缓存人设、对话历史和 API 响应
 */

import { Logger } from 'koishi'

/**
 * 缓存项接口
 */
export interface CacheItem<T> {
  value: T
  timestamp: number
  ttl: number // 生存时间（毫秒）
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  personaTTL: number // 人设缓存 TTL（默认 1 小时）
  conversationTTL: number // 对话缓存 TTL（默认 30 分钟）
  apiResponseTTL: number // API 响应缓存 TTL（默认 5 分钟）
  maxCacheSize: number // 最大缓存项数（默认 1000）
}

/**
 * 缓存管理器
 */
export class CacheManager {
  private cache: Map<string, CacheItem<any>> = new Map()
  private accessCount: Map<string, number> = new Map()
  private config: CacheConfig

  constructor(
    private logger: Logger,
    config: Partial<CacheConfig> = {}
  ) {
    this.config = {
      personaTTL: config.personaTTL || 60 * 60 * 1000, // 1 小时
      conversationTTL: config.conversationTTL || 30 * 60 * 1000, // 30 分钟
      apiResponseTTL: config.apiResponseTTL || 5 * 60 * 1000, // 5 分钟
      maxCacheSize: config.maxCacheSize || 1000
    }

    // 定期清理过期缓存
    this.startCleanupInterval()
  }

  /**
   * 生成缓存键
   */
  private generateKey(namespace: string, id: string): string {
    return `${namespace}:${id}`
  }

  /**
   * 设置缓存
   */
  set<T>(namespace: string, id: string, value: T, ttl?: number): void {
    const key = this.generateKey(namespace, id)

    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxCacheSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    const cacheItem: CacheItem<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.getDefaultTTL(namespace)
    }

    this.cache.set(key, cacheItem)
    this.accessCount.set(key, 0)

    this.logger.debug(`缓存已设置: ${key}`)
  }

  /**
   * 获取缓存
   */
  get<T>(namespace: string, id: string): T | null {
    const key = this.generateKey(namespace, id)
    const item = this.cache.get(key)

    if (!item) {
      return null
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      this.accessCount.delete(key)
      this.logger.debug(`缓存已过期: ${key}`)
      return null
    }

    // 更新访问计数
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1)

    return item.value as T
  }

  /**
   * 删除缓存
   */
  delete(namespace: string, id: string): boolean {
    const key = this.generateKey(namespace, id)
    const deleted = this.cache.delete(key)
    this.accessCount.delete(key)

    if (deleted) {
      this.logger.debug(`缓存已删除: ${key}`)
    }

    return deleted
  }

  /**
   * 清空指定命名空间的缓存
   */
  clearNamespace(namespace: string): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${namespace}:`)) {
        this.cache.delete(key)
        this.accessCount.delete(key)
        count++
      }
    }

    this.logger.debug(`清空命名空间 "${namespace}" 的缓存，共 ${count} 项`)
    return count
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    this.accessCount.clear()
    this.logger.info(`清空所有缓存，共 ${size} 项`)
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    totalItems: number
    namespaces: Record<string, number>
    memoryUsage: string
  } {
    const namespaces: Record<string, number> = {}

    for (const key of this.cache.keys()) {
      const namespace = key.split(':')[0]
      namespaces[namespace] = (namespaces[namespace] || 0) + 1
    }

    // 粗略估计内存使用（每项约 100 字节）
    const estimatedMemory = this.cache.size * 100

    return {
      totalItems: this.cache.size,
      namespaces,
      memoryUsage: this.formatBytes(estimatedMemory)
    }
  }

  /**
   * 获取缓存命中率
   */
  getHitRate(): Record<string, string> {
    const hitRates: Record<string, string> = {}
    const namespaceStats: Record<string, { hits: number; total: number }> = {}

    for (const [key, hits] of this.accessCount.entries()) {
      const namespace = key.split(':')[0]
      if (!namespaceStats[namespace]) {
        namespaceStats[namespace] = { hits: 0, total: 0 }
      }
      namespaceStats[namespace].hits += hits
      namespaceStats[namespace].total++
    }

    for (const [namespace, stats] of Object.entries(namespaceStats)) {
      const rate = stats.total > 0 
        ? ((stats.hits / stats.total) * 100).toFixed(2)
        : '0.00'
      hitRates[namespace] = `${rate}%`
    }

    return hitRates
  }

  /**
   * 获取默认 TTL
   */
  private getDefaultTTL(namespace: string): number {
    switch (namespace) {
      case 'persona':
        return this.config.personaTTL
      case 'conversation':
        return this.config.conversationTTL
      case 'api_response':
        return this.config.apiResponseTTL
      default:
        return this.config.apiResponseTTL
    }
  }

  /**
   * 驱逐最少使用的缓存项（LRU）
   */
  private evictLRU(): void {
    let minKey: string | null = null
    let minCount = Infinity

    for (const [key, count] of this.accessCount.entries()) {
      if (count < minCount) {
        minCount = count
        minKey = key
      }
    }

    if (minKey) {
      this.cache.delete(minKey)
      this.accessCount.delete(minKey)
      this.logger.debug(`LRU 驱逐缓存: ${minKey}`)
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpired(): void {
    const now = Date.now()
    let count = 0

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
        this.accessCount.delete(key)
        count++
      }
    }

    if (count > 0) {
      this.logger.debug(`清理过期缓存 ${count} 项`)
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanupInterval(): void {
    // 每 5 分钟清理一次过期缓存
    setInterval(() => {
      this.cleanupExpired()
    }, 5 * 60 * 1000)
  }

  /**
   * 格式化字节大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * 获取缓存报告
   */
  getReport(): string {
    const stats = this.getStats()
    const hitRates = this.getHitRate()

    let report = '💾 缓存管理报告\n'
    report += '='.repeat(50) + '\n\n'
    report += `总缓存项数: ${stats.totalItems}\n`
    report += `内存使用: ${stats.memoryUsage}\n\n`

    report += '命名空间统计:\n'
    for (const [namespace, count] of Object.entries(stats.namespaces)) {
      const hitRate = hitRates[namespace] || '0.00%'
      report += `  ${namespace}: ${count} 项 (命中率: ${hitRate})\n`
    }

    return report
  }
}

/**
 * 缓存装饰器
 */
export function withCache(
  cacheManager: CacheManager,
  namespace: string,
  ttl?: number
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      // 使用第一个参数作为缓存键
      const cacheKey = args[0]?.toString() || 'default'

      // 尝试从缓存获取
      const cached = cacheManager.get(namespace, cacheKey)
      if (cached !== null) {
        return cached
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args)

      // 缓存结果
      cacheManager.set(namespace, cacheKey, result, ttl)

      return result
    }

    return descriptor
  }
}
