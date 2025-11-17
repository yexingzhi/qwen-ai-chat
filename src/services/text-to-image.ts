/**
 * 文生图服务模块
 */

import { Logger } from 'koishi'
import OpenAI from 'openai'
import { ApiResponse, TextToImageParams } from '../types'
import { formatError, logger } from '../utils'
import axios from 'axios'

// 图像尺寸常量
export const IMAGE_SIZES = {
  '1328x1328': '1328*1328',
  '1664x928': '1664*928',
  '1472x1140': '1472*1140',
  '1140x1472': '1140*1472',
  '928x1664': '928*1664'
}

// 图像风格常量
export const IMAGE_STYLES = {
  realistic: '逼真摄影',
  artistic: '艺术风格',
  cartoon: '卡通风格',
  watercolor: '水彩风格',
  oil_painting: '油画风格'
}

export class TextToImageService {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, region: string = 'beijing', private koishiLogger?: Logger) {
    // 验证配置
    if (!apiKey) {
      throw new Error('TextToImageService: apiKey 不能为空')
    }
    if (!['beijing', 'singapore'].includes(region)) {
      throw new Error(`TextToImageService: 不支持的地域 ${region}`)
    }

    this.apiKey = apiKey
    if (region === 'singapore' || region === 'intl') {
      this.baseUrl = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
    } else {
      this.baseUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
    }
  }

  /**
   * 日志辅助方法
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (this.koishiLogger) {
      this.koishiLogger[level](`[TextToImageService] ${message}`)
    }
  }

  /**
   * 获取支持的尺寸
   */
  getSupportedSizes(): string[] {
    return Object.keys(IMAGE_SIZES)
  }

  /**
   * 获取支持的风格
   */
  getSupportedStyles(): Record<string, string> {
    return IMAGE_STYLES
  }

  /**
   * 生成图像
   */
  async generateImage(params: TextToImageParams): Promise<ApiResponse<string>> {
    try {
      if (!params.prompt || params.prompt.trim().length === 0) {
        return {
          success: false,
          error: '请提供图像描述'
        }
      }

      const size = (params.size || '1328x1328') as keyof typeof IMAGE_SIZES
      if (!IMAGE_SIZES[size]) {
        return {
          success: false,
          error: `不支持的尺寸: ${size}`
        }
      }

      // 调用阿里云千问文生图 API
      const response = await axios.post(this.baseUrl, {
        model: 'qwen-image-plus',
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  text: params.prompt
                }
              ]
            }
          ]
        },
        parameters: {
          negative_prompt: '',
          prompt_extend: true,
          watermark: false,
          size: IMAGE_SIZES[size]
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      // 从 choices 中提取图像 URL
      let imageUrl = response.data?.output?.choices?.[0]?.message?.content?.[0]?.image
      
      if (!imageUrl) {
        logger.error(`[文生图] 生成失败，无法提取图像 URL`)
        return {
          success: false,
          error: '生成图像失败'
        }
      }

      return {
        success: true,
        data: imageUrl,
        message: '图像生成成功'
      }
    } catch (error: any) {
      logger.error(`[文生图] 异常: ${formatError(error)}`)
      
      // 处理 API 错误响应
      if (error.response?.data) {
        const errorData = error.response.data
        const errorCode = errorData.code
        const errorMessage = errorData.message
        
        // 根据错误代码返回友好的错误信息
        if (errorCode === 'DataInspectionFailed') {
          return {
            success: false,
            error: '❌ 输入内容包含不适当的内容，请修改描述后重试'
          }
        } else if (errorCode === 'InvalidApiKey') {
          return {
            success: false,
            error: '❌ API Key 无效或已过期'
          }
        } else if (errorCode === 'RateLimitExceeded') {
          return {
            success: false,
            error: '❌ 请求过于频繁，请稍后再试'
          }
        } else if (errorCode === 'ModelNotFound') {
          return {
            success: false,
            error: '❌ 模型不可用'
          }
        }
        
        return {
          success: false,
          error: `❌ API 错误: ${errorMessage}`
        }
      }
      
      if (error.response?.status === 401) {
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
        error: `❌ 文生图失败: ${formatError(error)}`
      }
    }
  }

  /**
   * 格式化尺寸列表
   */
  formatSizesList(): string {
    return Object.keys(IMAGE_SIZES)
      .map(size => `  • ${size}`)
      .join('\n')
  }

  /**
   * 格式化风格列表
   */
  formatStylesList(): string {
    return Object.entries(IMAGE_STYLES)
      .map(([key, value]) => `  • ${key} - ${value}`)
      .join('\n')
  }
}
