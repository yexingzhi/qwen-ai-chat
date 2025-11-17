/**
 * 工具函数模块
 */

import { ApiResponse } from './types'

/**
 * 创建成功响应
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  }
}

/**
 * 创建错误响应
 */
export function errorResponse(error: string | Error): ApiResponse {
  const message = error instanceof Error ? error.message : error
  return {
    success: false,
    error: message
  }
}

/**
 * 格式化错误信息
 */
export function formatError(error: any): string {
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      return '❌ API Key 无效或已过期，请检查配置'
    } else if (error.message.includes('429')) {
      return '❌ 请求过于频繁，请稍后再试'
    } else if (error.message.includes('500')) {
      return '❌ 服务器错误，请稍后重试'
    } else if (error.message.includes('timeout')) {
      return '❌ 请求超时，请稍后重试'
    }
    return `❌ 错误: ${error.message}`
  }
  return '❌ 发生未知错误'
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (i < maxRetries - 1) {
        await delay(delayMs * Math.pow(2, i)) // 指数退避
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * 验证 API Key
 */
export function validateApiKey(apiKey: string): boolean {
  return !!(apiKey && apiKey.startsWith('sk-') && apiKey.length > 10)
}

/**
 * 验证模型名称
 */
export function validateModelName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length > 0 && name.length <= 50
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '...'
}

/**
 * 格式化模型信息
 */
export function formatModelInfo(name: string, description?: string): string {
  return `📦 ${name}${description ? ` - ${description}` : ''}`
}

/**
 * 格式化配置信息
 */
export function formatConfigInfo(config: any): string {
  const lines: string[] = [
    '⚙️ 当前配置:',
    `  默认模型: ${config.defaultModel}`,
    `  温度: ${config.temperature}`,
    `  最大 Token: ${config.maxTokens}`,
    `  模型数量: ${config.models?.length || 0}`,
    '',
    '✨ 功能开关:',
    `  文生图: ${config.enableTextToImage ? '✅' : '❌'}`,
    `  图片编辑: ${config.enableImageEdit ? '✅' : '❌'}`,
    `  文生视频: ${config.enableTextToVideo ? '✅' : '❌'}`,
    `  翻译: ${config.enableTranslate ? '✅' : '❌'}`,
    `  表情包生成: ${config.enableEmojiGenerator ? '✅' : '❌'}`
  ]
  return lines.join('\n')
}

/**
 * 解析命令参数
 */
export function parseCommandArgs(input: string): string[] {
  return input
    .trim()
    .split(/\s+/)
    .filter(arg => arg.length > 0)
}

/**
 * 检查是否为 URL
 */
export function isUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * 检查是否为图片
 */
export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)
}

/**
 * 检查是否为视频
 */
export function isVideoFile(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'].includes(ext)
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 日志记录
 */
export class Logger {
  private prefix: string

  constructor(prefix: string = 'qwen') {
    this.prefix = prefix
  }

  info(message: string, data?: any): void {
    console.log(`[${this.prefix}] ℹ️ ${message}`, data || '')
  }

  warn(message: string, data?: any): void {
    console.warn(`[${this.prefix}] ⚠️ ${message}`, data || '')
  }

  error(message: string, error?: any): void {
    console.error(`[${this.prefix}] ❌ ${message}`, error || '')
  }

  debug(message: string, data?: any): void {
    if (process.env.DEBUG) {
      console.debug(`[${this.prefix}] 🐛 ${message}`, data || '')
    }
  }
}

export const logger = new Logger('qwen')
