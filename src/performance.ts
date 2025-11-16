/**
 * 性能监控模块
 * 用于监控和记录插件的性能指标
 */

import { Logger } from 'koishi'

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  commandName: string
  duration: number
  timestamp: number
  success: boolean
  errorType?: string
}

/**
 * 性能统计接口
 */
export interface PerformanceStats {
  totalCalls: number
  successCalls: number
  failedCalls: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  lastCallTime: number
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map()
  private stats: Map<string, PerformanceStats> = new Map()
  private readonly maxMetricsPerCommand = 1000 // 每个命令最多保存 1000 条记录

  constructor(private logger: Logger) {}

  /**
   * 记录性能指标
   */
  recordMetric(commandName: string, duration: number, success: boolean, errorType?: string): void {
    const metric: PerformanceMetrics = {
      commandName,
      duration,
      timestamp: Date.now(),
      success,
      errorType
    }

    // 获取或创建命令的指标列表
    if (!this.metrics.has(commandName)) {
      this.metrics.set(commandName, [])
    }

    const commandMetrics = this.metrics.get(commandName)!
    commandMetrics.push(metric)

    // 限制指标数量，防止内存溢出
    if (commandMetrics.length > this.maxMetricsPerCommand) {
      commandMetrics.shift()
    }

    // 更新统计信息
    this.updateStats(commandName, metric)

    // 记录到日志
    if (duration > 5000) {
      this.logger.warn(`命令 "${commandName}" 执行耗时过长`, {
        duration: `${duration}ms`,
        success
      })
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(commandName: string, metric: PerformanceMetrics): void {
    let stats = this.stats.get(commandName)

    if (!stats) {
      stats = {
        totalCalls: 0,
        successCalls: 0,
        failedCalls: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        lastCallTime: Date.now()
      }
      this.stats.set(commandName, stats)
    }

    stats.totalCalls++
    if (metric.success) {
      stats.successCalls++
    } else {
      stats.failedCalls++
    }

    stats.minDuration = Math.min(stats.minDuration, metric.duration)
    stats.maxDuration = Math.max(stats.maxDuration, metric.duration)
    stats.lastCallTime = metric.timestamp

    // 计算平均耗时
    const allMetrics = this.metrics.get(commandName) || []
    const totalDuration = allMetrics.reduce((sum, m) => sum + m.duration, 0)
    stats.averageDuration = Math.round(totalDuration / allMetrics.length)
  }

  /**
   * 获取命令的统计信息
   */
  getStats(commandName: string): PerformanceStats | null {
    return this.stats.get(commandName) || null
  }

  /**
   * 获取所有统计信息
   */
  getAllStats(): Record<string, PerformanceStats> {
    const result: Record<string, PerformanceStats> = {}
    for (const [command, stats] of this.stats.entries()) {
      result[command] = stats
    }
    return result
  }

  /**
   * 获取命令的最近 N 条指标
   */
  getRecentMetrics(commandName: string, limit: number = 10): PerformanceMetrics[] {
    const metrics = this.metrics.get(commandName) || []
    return metrics.slice(Math.max(0, metrics.length - limit))
  }

  /**
   * 获取性能报告
   */
  getReport(): string {
    const stats = this.getAllStats()
    if (Object.keys(stats).length === 0) {
      return '暂无性能数据'
    }

    let report = '📊 性能监控报告\n'
    report += '=' .repeat(50) + '\n\n'

    for (const [command, stat] of Object.entries(stats)) {
      const successRate = stat.totalCalls > 0 
        ? ((stat.successCalls / stat.totalCalls) * 100).toFixed(2)
        : '0.00'

      report += `命令: ${command}\n`
      report += `  总调用数: ${stat.totalCalls}\n`
      report += `  成功: ${stat.successCalls} | 失败: ${stat.failedCalls}\n`
      report += `  成功率: ${successRate}%\n`
      report += `  平均耗时: ${stat.averageDuration}ms\n`
      report += `  最小耗时: ${stat.minDuration}ms\n`
      report += `  最大耗时: ${stat.maxDuration}ms\n`
      report += '\n'
    }

    return report
  }

  /**
   * 获取性能警告
   */
  getWarnings(): string[] {
    const warnings: string[] = []
    const stats = this.getAllStats()

    for (const [command, stat] of Object.entries(stats)) {
      // 检查成功率
      if (stat.totalCalls > 10) {
        const successRate = stat.successCalls / stat.totalCalls
        if (successRate < 0.9) {
          warnings.push(`⚠️ 命令 "${command}" 的成功率过低: ${(successRate * 100).toFixed(2)}%`)
        }
      }

      // 检查平均耗时
      if (stat.averageDuration > 3000) {
        warnings.push(`⚠️ 命令 "${command}" 的平均耗时过长: ${stat.averageDuration}ms`)
      }

      // 检查最大耗时
      if (stat.maxDuration > 10000) {
        warnings.push(`⚠️ 命令 "${command}" 的最大耗时过长: ${stat.maxDuration}ms`)
      }
    }

    return warnings
  }

  /**
   * 重置统计信息
   */
  reset(): void {
    this.metrics.clear()
    this.stats.clear()
    this.logger.info('性能监控数据已重置')
  }

  /**
   * 清理过期数据（保留最近 1 小时的数据）
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)

    for (const [command, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > oneHourAgo)
      if (filtered.length === 0) {
        this.metrics.delete(command)
        this.stats.delete(command)
      } else {
        this.metrics.set(command, filtered)
      }
    }

    this.logger.debug('性能监控数据清理完成')
  }
}

/**
 * 创建性能监控装饰器
 */
export function withPerformanceMonitoring(
  monitor: PerformanceMonitor,
  commandName: string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      try {
        const result = await originalMethod.apply(this, args)
        const duration = Date.now() - startTime
        monitor.recordMetric(commandName, duration, true)
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        const errorType = error instanceof Error ? error.constructor.name : 'Unknown'
        monitor.recordMetric(commandName, duration, false, errorType)
        throw error
      }
    }

    return descriptor
  }
}
