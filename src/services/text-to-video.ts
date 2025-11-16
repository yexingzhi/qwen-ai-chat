/**
 * 文生视频服务模块
 */

import { Logger } from 'koishi'
import axios from 'axios'
import { TextToVideoParams, ApiResponse } from '../types'
import { logger, formatError } from '../utils'

/**
 * 视频时长选项（万相2.5仅支持5秒和10秒）
 */
export const VIDEO_DURATIONS = {
  '5': '5 秒',
  '10': '10 秒'
} as const

/**
 * 视频分辨率选项
 */
export const VIDEO_RESOLUTIONS = {
  '480p': {
    '16:9': '832*480',
    '9:16': '480*832',
    '1:1': '624*624'
  },
  '720p': {
    '16:9': '1280*720',
    '9:16': '720*1280',
    '1:1': '960*960',
    '4:3': '1088*832',
    '3:4': '832*1088'
  },
  '1080p': {
    '16:9': '1920*1080',
    '9:16': '1080*1920',
    '1:1': '1440*1440',
    '4:3': '1632*1248',
    '3:4': '1248*1632'
  }
} as const

/**
 * 文生视频服务
 */
export class TextToVideoService {
  private apiKey: string
  private baseUrl: string
  private queryUrl: string

  constructor(apiKey: string, region: string = 'beijing', private koishiLogger?: Logger) {
    if (!apiKey) {
      throw new Error('TextToVideoService: apiKey 不能为空')
    }
    if (!['beijing', 'singapore'].includes(region)) {
      throw new Error(`TextToVideoService: 不支持的地域 ${region}`)
    }

    this.apiKey = apiKey
    
    // 根据地域选择 API 端点
    if (region === 'singapore' || region === 'intl') {
      this.baseUrl = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis'
      this.queryUrl = 'https://dashscope-intl.aliyuncs.com/api/v1/tasks'
    } else {
      // 默认使用北京地域
      this.baseUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis'
      this.queryUrl = 'https://dashscope.aliyuncs.com/api/v1/tasks'
    }
  }

  /**
   * 生成视频
   */
  async generateVideo(params: TextToVideoParams): Promise<ApiResponse<string>> {
    try {
      if (!params.prompt || params.prompt.trim().length === 0) {
        return {
          success: false,
          error: '请提供视频描述'
        }
      }

      const duration = params.duration || 5
      
      // 验证时长
      if (duration > 10) {
        return {
          success: false,
          error: `❌ 不支持的时长: ${duration} 秒\n📺 支持的最大时长: 10 秒\n💡 请使用 5 秒或 10 秒`
        }
      }
      
      if (duration < 5 || (duration !== 5 && duration !== 10)) {
        return {
          success: false,
          error: `❌ 不支持的时长: ${duration} 秒\n📺 支持的时长: 5 秒、10 秒`
        }
      }

      const durationStr = String(duration) as keyof typeof VIDEO_DURATIONS

      logger.info(`生成视频: ${params.prompt} (${duration}s)`)

      // 步骤1：创建任务获取任务ID
      // 万相2.5 API 要求必须使用异步模式（X-DashScope-Async: enable）
      // 验证分辨率
      const size = params.size || '1920*1080'
      const validSizes = [
        // 480P
        '832*480', '480*832', '624*624',
        // 720P
        '1280*720', '720*1280', '960*960', '1088*832', '832*1088',
        // 1080P
        '1920*1080', '1080*1920', '1440*1440', '1632*1248', '1248*1632'
      ]
      
      if (!validSizes.includes(size)) {
        return {
          success: false,
          error: `❌ 不支持的分辨率: ${size}\n📺 支持的最大分辨率: 1920×1080（1080P）\n💡 支持的分辨率:\n${this.formatResolutionsList()}`
        }
      }

      const createResponse = await axios.post(this.baseUrl, {
        model: 'wan2.5-t2v-preview',
        input: {
          prompt: params.prompt,
          negative_prompt: params.negativePrompt || ''
        },
        parameters: {
          size: size,
          duration: duration,
          prompt_extend: true,
          watermark: false,
          audio: true
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'
        }
      })

      const taskId = createResponse.data?.output?.task_id
      if (!taskId) {
        return {
          success: false,
          error: '创建视频生成任务失败'
        }
      }

      logger.info(`视频任务已创建: ${taskId}`)

      // 步骤2：轮询查询结果
      // 万相2.5文生视频通常需要1-5分钟，建议轮询间隔15秒
      let videoUrl = ''
      let attempts = 0
      const maxAttempts = 40 // 最多等待 600 秒（10分钟）
      const pollInterval = 15000 // 15 秒轮询一次

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval))

        const queryResponse = await axios.get(`${this.queryUrl}/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        })

        const status = queryResponse.data?.output?.task_status
        logger.info(`[文生视频] 任务状态: ${status} (第 ${attempts + 1} 次查询)`)
        
        if (status === 'SUCCEEDED') {
          videoUrl = queryResponse.data?.output?.video_url
          logger.info(`[文生视频] 任务成功，视频URL: ${videoUrl}`)
          break
        } else if (status === 'FAILED') {
          const errorCode = queryResponse.data?.output?.code
          const errorMessage = queryResponse.data?.output?.message
          logger.error(`[文生视频] 任务失败: ${errorCode} - ${errorMessage}`)
          return {
            success: false,
            error: `视频生成失败: ${errorMessage || '未知错误'}`
          }
        } else if (status === 'CANCELED') {
          return {
            success: false,
            error: '视频生成任务已取消'
          }
        } else if (status === 'UNKNOWN') {
          return {
            success: false,
            error: '任务不存在或状态未知（可能已过期）'
          }
        }

        attempts++
      }

      if (!videoUrl) {
        return {
          success: false,
          error: '视频生成超时（已等待10分钟）'
        }
      }

      logger.info(`视频生成成功: ${videoUrl}`)

      return {
        success: true,
        data: videoUrl,
        message: `视频生成成功 (${duration}秒)`
      }
    } catch (error: any) {
      logger.error('文生视频失败', error)
      
      // 处理 API 错误响应
      if (error.response?.data) {
        const errorData = error.response.data
        const errorCode = errorData.code
        const errorMessage = errorData.message
        
        logger.error(`[文生视频] API 错误代码: ${errorCode}`)
        logger.error(`[文生视频] API 错误信息: ${errorMessage}`)
        
        // 根据错误代码返回友好的错误信息
        if (errorCode === '400-InvalidParameter') {
          if (errorMessage?.includes('暂时不支持当前设置的语种')) {
            return {
              success: false,
              error: '❌ 暂时不支持当前设置的语言，请使用中文或英文描述'
            }
          }
          return {
            success: false,
            error: `❌ 参数错误: ${errorMessage}`
          }
        } else if (errorCode === 'InvalidParameter.DataInspection') {
          return {
            success: false,
            error: '❌ 输入内容包含不适当的内容，请修改后重试'
          }
        } else if (errorCode === '401-InvalidApiKey') {
          return {
            success: false,
            error: '❌ API Key 无效或已过期'
          }
        } else if (errorCode === '403-AccessDenied') {
          return {
            success: false,
            error: '❌ 无权限访问此 API'
          }
        } else if (errorCode === '429-Throttling' || errorCode === '429-Throttling.RateQuota') {
          return {
            success: false,
            error: '❌ 请求过于频繁，请稍后再试'
          }
        } else if (errorCode === '500-InternalError' || errorCode === '500-SystemError') {
          return {
            success: false,
            error: '❌ 服务器内部错误，请稍后重试'
          }
        } else if (errorCode === '400-DataInspectionFailed') {
          return {
            success: false,
            error: '❌ 输入内容包含不适当的内容，请修改后重试'
          }
        }
        
        return {
          success: false,
          error: `❌ API 错误 [${errorCode}]: ${errorMessage}`
        }
      }
      
      if (error.response?.status === 400) {
        return {
          success: false,
          error: '❌ 请求参数错误，请检查输入内容'
        }
      } else if (error.response?.status === 401) {
        return {
          success: false,
          error: '❌ API Key 无效或已过期'
        }
      } else if (error.response?.status === 429) {
        return {
          success: false,
          error: '❌ 请求过于频繁，请稍后再试'
        }
      } else if (error.response?.status === 500) {
        return {
          success: false,
          error: '❌ 服务器错误，请稍后重试'
        }
      }
      
      return {
        success: false,
        error: `❌ 文生视频失败: ${formatError(error)}`
      }
    }
  }

  /**
   * 从中文描述识别视频时长
   */
  detectDurationFromChinese(text: string): string {
    // 检查中文时长关键词
    if (text.includes('10秒') || text.includes('十秒')) {
      return '10'
    }
    // 默认返回 5 秒
    return '5'
  }

  /**
   * 从中文描述识别视频分辨率
   */
  detectResolutionFromChinese(text: string): string {
    // 检查中文分辨率关键词
    if (text.includes('1080') || text.includes('1080p') || text.includes('1080P') || text.includes('高清') || text.includes('超清')) {
      // 默认 1080P 使用 16:9 比例
      return '1920*1080'
    } else if (text.includes('720') || text.includes('720p') || text.includes('720P') || text.includes('标清')) {
      // 默认 720P 使用 16:9 比例
      return '1280*720'
    } else if (text.includes('480') || text.includes('480p') || text.includes('480P') || text.includes('低清')) {
      // 默认 480P 使用 16:9 比例
      return '832*480'
    }
    // 默认返回最低分辨率 480P
    return '832*480'
  }

  /**
   * 获取支持的时长
   */
  getSupportedDurations(): Record<string, string> {
    return VIDEO_DURATIONS
  }

  /**
   * 获取支持的分辨率
   */
  getSupportedResolutions(): Record<string, Record<string, string>> {
    return VIDEO_RESOLUTIONS
  }

  /**
   * 格式化时长列表
   */
  formatDurationsList(): string {
    return Object.entries(VIDEO_DURATIONS)
      .map(([key, value]) => `  • ${key}s - ${value}`)
      .join('\n')
  }

  /**
   * 格式化分辨率列表
   */
  formatResolutionsList(): string {
    let result = ''
    for (const [resolution, ratios] of Object.entries(VIDEO_RESOLUTIONS)) {
      result += `\n${resolution}:\n`
      for (const [ratio, size] of Object.entries(ratios)) {
        result += `  • ${ratio} - ${size}\n`
      }
    }
    return result
  }

  /**
   * 获取支持的最大分辨率
   */
  getMaxResolution(): string {
    return '1920*1080（1080P）'
  }

  /**
   * 获取支持的最大时长
   */
  getMaxDuration(): string {
    return '10 秒'
  }
}
