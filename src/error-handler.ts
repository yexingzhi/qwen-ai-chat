/**
 * 统一错误处理模块
 * 符合 Koishi 最佳实践标准
 */

import { Logger } from 'koishi'
import { ApiResponse } from './types'

/**
 * 错误类型定义
 */
export enum ErrorType {
  // API 错误
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_PARAMETER_ERROR = 'API_PARAMETER_ERROR',
  API_DATA_INSPECTION_FAILED = 'API_DATA_INSPECTION_FAILED',

  // 权限错误
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  AUTHORITY_INSUFFICIENT = 'AUTHORITY_INSUFFICIENT',

  // 业务逻辑错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  FEATURE_DISABLED = 'FEATURE_DISABLED',

  // 系统错误
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 错误信息映射
 */
const ERROR_MESSAGES: Record<ErrorType, { zh: string; en: string }> = {
  [ErrorType.API_KEY_INVALID]: {
    zh: 'API Key 无效或已过期，请检查配置',
    en: 'API Key is invalid or expired, please check configuration'
  },
  [ErrorType.API_RATE_LIMIT]: {
    zh: '请求过于频繁，请稍后再试',
    en: 'Request too frequent, please try again later'
  },
  [ErrorType.API_SERVER_ERROR]: {
    zh: '服务器错误，请稍后重试',
    en: 'Server error, please try again later'
  },
  [ErrorType.API_TIMEOUT]: {
    zh: '请求超时，请稍后重试',
    en: 'Request timeout, please try again later'
  },
  [ErrorType.API_PARAMETER_ERROR]: {
    zh: '请求参数错误，请检查输入内容',
    en: 'Invalid request parameters, please check input'
  },
  [ErrorType.API_DATA_INSPECTION_FAILED]: {
    zh: '输入内容包含不适当的内容，请修改后重试',
    en: 'Input contains inappropriate content, please modify and try again'
  },
  [ErrorType.PERMISSION_DENIED]: {
    zh: '权限不足',
    en: 'Permission denied'
  },
  [ErrorType.AUTHORITY_INSUFFICIENT]: {
    zh: '权限不足，需要至少 1 级权限',
    en: 'Permission denied, require authority level 1 or higher'
  },
  [ErrorType.RESOURCE_NOT_FOUND]: {
    zh: '资源不存在',
    en: 'Resource not found'
  },
  [ErrorType.RESOURCE_ALREADY_EXISTS]: {
    zh: '资源已存在',
    en: 'Resource already exists'
  },
  [ErrorType.INVALID_PARAMETER]: {
    zh: '参数无效',
    en: 'Invalid parameter'
  },
  [ErrorType.FEATURE_DISABLED]: {
    zh: '功能已禁用',
    en: 'Feature is disabled'
  },
  [ErrorType.SESSION_NOT_FOUND]: {
    zh: '无法获取会话信息',
    en: 'Failed to get session info'
  },
  [ErrorType.DATABASE_ERROR]: {
    zh: '数据库错误',
    en: 'Database error'
  },
  [ErrorType.UNKNOWN_ERROR]: {
    zh: '发生未知错误，请查看日志',
    en: 'Unknown error occurred, please check logs'
  }
}

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public statusCode: number = 400,
    message?: string
  ) {
    super(message || ERROR_MESSAGES[type].zh)
    this.name = 'AppError'
  }

  /**
   * 获取错误消息
   */
  getMessage(lang: 'zh' | 'en' = 'zh'): string {
    return ERROR_MESSAGES[this.type][lang]
  }

  /**
   * 获取双语错误消息
   */
  getBilingualMessage(): string {
    const msg = ERROR_MESSAGES[this.type]
    return `❌ ${msg.zh} / ${msg.en}`
  }
}

/**
 * 错误处理器
 */
export class ErrorHandler {
  constructor(private logger: Logger) {}

  /**
   * 处理 API 错误
   */
  handleApiError(error: any, context?: string): AppError {
    const errorCode = error.response?.data?.code || error.response?.status
    const errorMessage = error.response?.data?.message || error.message

    this.logger.error(`API 错误 [${context}]`, {
      code: errorCode,
      message: errorMessage,
      status: error.response?.status
    })

    // 根据错误代码判断错误类型
    if (errorCode === '401-InvalidApiKey' || errorCode === 401) {
      return new AppError(ErrorType.API_KEY_INVALID, 401)
    } else if (errorCode === '429-Throttling' || errorCode === 429) {
      return new AppError(ErrorType.API_RATE_LIMIT, 429)
    } else if (errorCode === '500-InternalError' || errorCode === 500) {
      return new AppError(ErrorType.API_SERVER_ERROR, 500)
    } else if (errorCode === '400-InvalidParameter' || errorCode === 400) {
      return new AppError(ErrorType.API_PARAMETER_ERROR, 400)
    } else if (errorCode === 'DataInspectionFailed' || errorCode === '400-DataInspectionFailed') {
      return new AppError(ErrorType.API_DATA_INSPECTION_FAILED, 400)
    } else if (errorMessage?.includes('timeout')) {
      return new AppError(ErrorType.API_TIMEOUT, 408)
    }

    return new AppError(ErrorType.UNKNOWN_ERROR, error.response?.status || 500, errorMessage)
  }

  /**
   * 处理业务逻辑错误
   */
  handleBusinessError(type: ErrorType, context?: string): AppError {
    this.logger.warn(`业务错误 [${type}]`, { context })
    return new AppError(type)
  }

  /**
   * 处理权限错误
   */
  handlePermissionError(authority?: number, context?: string): AppError {
    this.logger.warn(`权限错误`, { authority, context })

    if (authority === undefined || authority === null) {
      return new AppError(ErrorType.PERMISSION_DENIED)
    }

    if (authority < 1) {
      return new AppError(ErrorType.AUTHORITY_INSUFFICIENT)
    }

    return new AppError(ErrorType.PERMISSION_DENIED)
  }

  /**
   * 处理通用错误
   */
  handleError(error: any, context?: string): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error.response) {
      return this.handleApiError(error, context)
    }

    this.logger.error(`未知错误 [${context}]`, error)
    return new AppError(ErrorType.UNKNOWN_ERROR, 500, error.message)
  }

  /**
   * 创建成功响应
   */
  createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message
    }
  }

  /**
   * 创建错误响应
   */
  createErrorResponse(error: AppError | ErrorType, lang: 'zh' | 'en' = 'zh'): ApiResponse {
    const appError = error instanceof AppError ? error : new AppError(error)
    return {
      success: false,
      error: appError.getMessage(lang)
    }
  }

  /**
   * 创建双语错误响应
   */
  createBilingualErrorResponse(error: AppError | ErrorType): ApiResponse {
    const appError = error instanceof AppError ? error : new AppError(error)
    return {
      success: false,
      error: appError.getBilingualMessage()
    }
  }
}

/**
 * 错误处理中间件
 */
export function createErrorMiddleware(logger: Logger) {
  return (error: any, context?: string) => {
    const handler = new ErrorHandler(logger)
    return handler.handleError(error, context)
  }
}
