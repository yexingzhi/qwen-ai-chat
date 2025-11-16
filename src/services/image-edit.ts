/**
 * 图片编辑服务模块
 */

import { Logger } from 'koishi'
import axios from 'axios'
import { ImageEditParams, ApiResponse } from '../types'
import { logger, formatError, isUrl } from '../utils'

/**
 * 图片编辑操作类型
 */
export const EDIT_ACTIONS = {
  'fix': '修复/去除瑕疵',
  'extend': '扩展/补全',
  'inpaint': '内容填充',
  'enhance': '增强/优化',
  'style-transfer': '风格转换'
} as const

/**
 * 图片编辑服务
 */
export class ImageEditService {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, region: string = 'beijing', private koishiLogger?: Logger) {
    if (!apiKey) {
      throw new Error('ImageEditService: apiKey 不能为空')
    }
    if (!['beijing', 'singapore'].includes(region)) {
      throw new Error(`ImageEditService: 不支持的地域 ${region}`)
    }

    this.apiKey = apiKey
    if (region === 'singapore' || region === 'intl') {
      this.baseUrl = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
    } else {
      this.baseUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
    }
  }

  /**
   * 根据中文描述自动识别编辑操作
   */
  detectActionFromPrompt(prompt: string): keyof typeof EDIT_ACTIONS {
    const lowerPrompt = prompt.toLowerCase()
    
    // 修复/去除瑕疵的关键词
    if (/修复|去除|移除|删除|清除|去掉|消除|瑕疵|污点|斑点|痕迹|杂物|垃圾/.test(prompt)) {
      return 'fix'
    }
    
    // 扩展/补全的关键词
    if (/扩展|补全|延伸|拓展|扩大|增加|添加|加上|右侧|左侧|上方|下方|周围/.test(prompt)) {
      return 'extend'
    }
    
    // 内容填充的关键词
    if (/填充|填补|补充|覆盖|替换|换成|变成|改成|涂|画/.test(prompt)) {
      return 'inpaint'
    }
    
    // 增强/优化的关键词
    if (/增强|优化|提高|改善|清晰|锐化|对比|亮度|饱和度|色彩|质量|效果/.test(prompt)) {
      return 'enhance'
    }
    
    // 风格转换的关键词
    if (/风格|转换|转变|变成|像|效果|艺术|油画|水彩|素描|卡通|漫画|动画|3D|渲染/.test(prompt)) {
      return 'style-transfer'
    }
    
    // 默认使用 inpaint
    return 'inpaint'
  }

  /**
   * 编辑图片
   */
  async editImage(params: ImageEditParams): Promise<ApiResponse<string>> {
    try {
      logger.info(`[图片编辑] 开始编辑图片`)
      logger.info(`[图片编辑] 参数: action=${params.action}, imageUrl=${params.imageUrl}, prompt=${params.prompt}`)
      
      if (!params.imageUrl || !isUrl(params.imageUrl)) {
        logger.error(`[图片编辑] 图片 URL 无效: ${params.imageUrl}`)
        return {
          success: false,
          error: '请提供有效的图片 URL'
        }
      }

      const action = params.action || 'inpaint'
      if (!EDIT_ACTIONS[action as keyof typeof EDIT_ACTIONS]) {
        logger.error(`[图片编辑] 不支持的操作: ${action}`)
        return {
          success: false,
          error: `不支持的编辑操作: ${action}`
        }
      }

      if (!params.prompt || params.prompt.trim().length === 0) {
        logger.error(`[图片编辑] 编辑描述为空`)
        return {
          success: false,
          error: '请提供编辑描述'
        }
      }

      logger.info(`[图片编辑] 编辑图片: ${action} - ${params.prompt}`)

      // 构建编辑提示词
      const editPrompt = this.buildEditPrompt(action as keyof typeof EDIT_ACTIONS, params.prompt)
      logger.info(`[图片编辑] 编辑提示词: ${editPrompt}`)

      // 调用阿里云千问图片编辑 API
      logger.info(`[图片编辑] 调用 API: ${this.baseUrl}`)
      const response = await axios.post(this.baseUrl, {
        model: 'qwen-image-edit-plus',
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  image: params.imageUrl
                },
                {
                  text: editPrompt
                }
              ]
            }
          ]
        },
        parameters: {
          n: 1,
          negative_prompt: '',
          prompt_extend: true,
          watermark: false
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      logger.info(`[图片编辑] API 响应状态: ${response.status}`)
      logger.info(`[图片编辑] API 响应数据: ${JSON.stringify(response.data)}`)
      
      // 从 choices 中提取图像 URL
      let editedImageUrl = response.data?.output?.choices?.[0]?.message?.content?.[0]?.image
      logger.info(`[图片编辑] 提取的图像 URL: ${editedImageUrl}`)
      
      if (!editedImageUrl) {
        logger.error(`[图片编辑] 图片编辑失败，无法从响应中提取图像 URL`)
        logger.error(`[图片编辑] 完整响应: ${JSON.stringify(response.data)}`)
        return {
          success: false,
          error: '图片编辑失败'
        }
      }

      logger.info(`[图片编辑] 图片编辑成功: ${editedImageUrl}`)

      return {
        success: true,
        data: editedImageUrl,
        message: '图片编辑成功'
      }
    } catch (error: any) {
      logger.error(`[图片编辑] 图片编辑异常: ${formatError(error)}`)
      if (error instanceof Error) {
        logger.error(`[图片编辑] 错误详情: ${error.message}`)
        logger.error(`[图片编辑] 错误堆栈: ${error.stack}`)
      }
      
      // 处理 API 错误响应
      if (error.response?.data) {
        const errorData = error.response.data
        const errorCode = errorData.code
        const errorMessage = errorData.message
        
        logger.error(`[图片编辑] API 错误代码: ${errorCode}`)
        logger.error(`[图片编辑] API 错误信息: ${errorMessage}`)
        
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
        error: `❌ 图片编辑失败: ${formatError(error)}`
      }
    }
  }

  /**
   * 构建编辑提示词
   */
  private buildEditPrompt(action: keyof typeof EDIT_ACTIONS, userPrompt: string): string {
    const prompts: Record<keyof typeof EDIT_ACTIONS, string> = {
      'fix': `修复图片中的瑕疵和缺陷。${userPrompt}`,
      'extend': `扩展和补全图片内容。${userPrompt}`,
      'inpaint': `在指定区域填充内容。${userPrompt}`,
      'enhance': `增强和优化图片质量。${userPrompt}`,
      'style-transfer': `转换图片风格。${userPrompt}`
    }
    return prompts[action]
  }

  /**
   * 获取支持的操作
   */
  getSupportedActions(): Record<string, string> {
    return EDIT_ACTIONS
  }

  /**
   * 格式化操作列表
   */
  formatActionsList(): string {
    return Object.entries(EDIT_ACTIONS)
      .map(([key, value]) => `  • ${key} - ${value}`)
      .join('\n')
  }
}
