/**
 * 单元测试
 * 使用 Jest 框架
 */

import { CacheManager } from '../src/cache'
import { PerformanceMonitor } from '../src/performance'
import { ErrorHandler, ErrorType, AppError } from '../src/error-handler'
import { Logger } from 'koishi'

// Mock Logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
} as unknown as Logger

describe('CacheManager', () => {
  let cacheManager: CacheManager

  beforeEach(() => {
    cacheManager = new CacheManager(mockLogger)
  })

  describe('基本操作', () => {
    test('应该能够设置和获取缓存', () => {
      cacheManager.set('test', 'key1', { value: 'test' })
      const result = cacheManager.get('test', 'key1')
      expect(result).toEqual({ value: 'test' })
    })

    test('应该能够删除缓存', () => {
      cacheManager.set('test', 'key1', { value: 'test' })
      const deleted = cacheManager.delete('test', 'key1')
      expect(deleted).toBe(true)
      expect(cacheManager.get('test', 'key1')).toBeNull()
    })

    test('应该返回 null 当缓存不存在', () => {
      const result = cacheManager.get('test', 'nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('TTL 管理', () => {
    test('应该在 TTL 过期后删除缓存', (done?: () => void) => {
      cacheManager.set('test', 'key1', { value: 'test' }, 100) // 100ms TTL
      
      expect(cacheManager.get('test', 'key1')).toEqual({ value: 'test' })
      
      setTimeout(() => {
        expect(cacheManager.get('test', 'key1')).toBeNull()
        if (done) done()
      }, 150)
    })

    test('应该使用默认 TTL', () => {
      cacheManager.set('persona', 'key1', { name: 'test' })
      expect(cacheManager.get('persona', 'key1')).toEqual({ name: 'test' })
    })
  })

  describe('命名空间管理', () => {
    test('应该能够清空指定命名空间', () => {
      cacheManager.set('ns1', 'key1', 'value1')
      cacheManager.set('ns1', 'key2', 'value2')
      cacheManager.set('ns2', 'key1', 'value3')

      const cleared = cacheManager.clearNamespace('ns1')
      expect(cleared).toBe(2)
      expect(cacheManager.get('ns1', 'key1')).toBeNull()
      expect(cacheManager.get('ns2', 'key1')).toEqual('value3')
    })

    test('应该能够清空所有缓存', () => {
      cacheManager.set('ns1', 'key1', 'value1')
      cacheManager.set('ns2', 'key1', 'value2')

      cacheManager.clear()
      expect(cacheManager.get('ns1', 'key1')).toBeNull()
      expect(cacheManager.get('ns2', 'key1')).toBeNull()
    })
  })

  describe('统计信息', () => {
    test('应该返回正确的缓存统计', () => {
      cacheManager.set('persona', 'key1', 'value1')
      cacheManager.set('persona', 'key2', 'value2')
      cacheManager.set('conversation', 'key1', 'value3')

      const stats = cacheManager.getStats()
      expect(stats.totalItems).toBe(3)
      expect(stats.namespaces['persona']).toBe(2)
      expect(stats.namespaces['conversation']).toBe(1)
    })

    test('应该计算命中率', () => {
      cacheManager.set('test', 'key1', 'value1')
      
      // 访问多次
      cacheManager.get('test', 'key1')
      cacheManager.get('test', 'key1')
      cacheManager.get('test', 'key1')

      const hitRates = cacheManager.getHitRate()
      expect(hitRates['test']).toBeDefined()
    })
  })
})

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = new PerformanceMonitor(mockLogger)
  })

  describe('指标记录', () => {
    test('应该记录成功的指标', () => {
      monitor.recordMetric('test-command', 100, true)
      const stats = monitor.getStats('test-command')
      
      expect(stats).not.toBeNull()
      expect(stats!.totalCalls).toBe(1)
      expect(stats!.successCalls).toBe(1)
      expect(stats!.failedCalls).toBe(0)
    })

    test('应该记录失败的指标', () => {
      monitor.recordMetric('test-command', 100, false, 'Error')
      const stats = monitor.getStats('test-command')
      
      expect(stats).not.toBeNull()
      expect(stats!.totalCalls).toBe(1)
      expect(stats!.successCalls).toBe(0)
      expect(stats!.failedCalls).toBe(1)
    })

    test('应该计算平均耗时', () => {
      monitor.recordMetric('test-command', 100, true)
      monitor.recordMetric('test-command', 200, true)
      monitor.recordMetric('test-command', 300, true)

      const stats = monitor.getStats('test-command')
      expect(stats!.averageDuration).toBe(200)
    })
  })

  describe('统计信息', () => {
    test('应该返回正确的最小和最大耗时', () => {
      monitor.recordMetric('test-command', 50, true)
      monitor.recordMetric('test-command', 200, true)
      monitor.recordMetric('test-command', 100, true)

      const stats = monitor.getStats('test-command')
      expect(stats!.minDuration).toBe(50)
      expect(stats!.maxDuration).toBe(200)
    })

    test('应该返回所有统计信息', () => {
      monitor.recordMetric('command1', 100, true)
      monitor.recordMetric('command2', 200, true)

      const allStats = monitor.getAllStats()
      expect(Object.keys(allStats).length).toBe(2)
      expect(allStats['command1']).toBeDefined()
      expect(allStats['command2']).toBeDefined()
    })

    test('应该获取最近的指标', () => {
      for (let i = 0; i < 15; i++) {
        monitor.recordMetric('test-command', 100 + i, true)
      }

      const recent = monitor.getRecentMetrics('test-command', 5)
      expect(recent.length).toBe(5)
    })
  })

  describe('性能警告', () => {
    test('应该在成功率低时发出警告', () => {
      for (let i = 0; i < 15; i++) {
        monitor.recordMetric('test-command', 100, i < 12) // 80% 成功率 (12/15)
      }

      const warnings = monitor.getWarnings()
      expect(warnings.length).toBeGreaterThan(0)
    })

    test('应该在耗时过长时发出警告', () => {
      monitor.recordMetric('test-command', 5000, true)
      monitor.recordMetric('test-command', 5000, true)
      monitor.recordMetric('test-command', 5000, true)

      const warnings = monitor.getWarnings()
      expect(warnings.length).toBeGreaterThan(0)
    })
  })

  describe('数据管理', () => {
    test('应该能够重置统计信息', () => {
      monitor.recordMetric('test-command', 100, true)
      monitor.reset()

      const stats = monitor.getStats('test-command')
      expect(stats).toBeNull()
    })
  })
})

describe('ErrorHandler', () => {
  let handler: ErrorHandler

  beforeEach(() => {
    handler = new ErrorHandler(mockLogger)
  })

  describe('错误处理', () => {
    test('应该处理 API 错误', () => {
      const error = {
        response: {
          status: 401,
          data: { code: '401-InvalidApiKey', message: 'Invalid API key' }
        }
      }

      const appError = handler.handleApiError(error, 'test')
      expect(appError.type).toBe(ErrorType.API_KEY_INVALID)
      expect(appError.statusCode).toBe(401)
    })

    test('应该处理业务逻辑错误', () => {
      const appError = handler.handleBusinessError(ErrorType.RESOURCE_NOT_FOUND, 'test')
      expect(appError.type).toBe(ErrorType.RESOURCE_NOT_FOUND)
    })

    test('应该处理权限错误', () => {
      const appError = handler.handlePermissionError(0, 'test')
      expect(appError.type).toBe(ErrorType.AUTHORITY_INSUFFICIENT)
    })

    test('应该处理通用错误', () => {
      const error = new Error('Test error')
      const appError = handler.handleError(error, 'test')
      expect(appError.type).toBe(ErrorType.UNKNOWN_ERROR)
    })
  })

  describe('响应生成', () => {
    test('应该创建成功响应', () => {
      const response = handler.createSuccessResponse({ data: 'test' }, 'Success')
      expect(response.success).toBe(true)
      expect(response.data).toEqual({ data: 'test' })
      expect(response.message).toBe('Success')
    })

    test('应该创建错误响应', () => {
      const appError = new AppError(ErrorType.API_KEY_INVALID)
      const response = handler.createErrorResponse(appError, 'zh')
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    test('应该创建双语错误响应', () => {
      const appError = new AppError(ErrorType.API_KEY_INVALID)
      const response = handler.createBilingualErrorResponse(appError)
      expect(response.success).toBe(false)
      expect(response.error).toContain('/')
    })
  })

  describe('错误消息', () => {
    test('应该返回中文错误消息', () => {
      const appError = new AppError(ErrorType.API_KEY_INVALID)
      const message = appError.getMessage('zh')
      expect(message).toBeDefined()
      expect(message.length).toBeGreaterThan(0)
    })

    test('应该返回英文错误消息', () => {
      const appError = new AppError(ErrorType.API_KEY_INVALID)
      const message = appError.getMessage('en')
      expect(message).toBeDefined()
      expect(message.length).toBeGreaterThan(0)
    })

    test('应该返回双语错误消息', () => {
      const appError = new AppError(ErrorType.API_KEY_INVALID)
      const message = appError.getBilingualMessage()
      expect(message).toContain('/')
      expect(message).toContain('❌')
    })
  })
})

describe('AppError', () => {
  test('应该创建应用错误', () => {
    const error = new AppError(ErrorType.API_KEY_INVALID, 401, 'Custom message')
    expect(error.type).toBe(ErrorType.API_KEY_INVALID)
    expect(error.statusCode).toBe(401)
    expect(error.message).toBe('Custom message')
  })

  test('应该继承 Error 类', () => {
    const error = new AppError(ErrorType.API_KEY_INVALID)
    expect(error instanceof Error).toBe(true)
    expect(error.name).toBe('AppError')
  })
})
