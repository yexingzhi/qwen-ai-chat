/**
 * 翻译服务模块
 */

import axios from 'axios'
import OpenAI from 'openai'
import { TranslateParams, ApiResponse } from '../types'
import { logger, formatError } from '../utils'

/**
 * 支持的语言
 */
export const SUPPORTED_LANGUAGES = {
  'zh': '中文',
  'en': '英文',
  'ja': '日文',
  'ko': '韩文',
  'es': '西班牙文',
  'fr': '法文',
  'de': '德文',
  'ru': '俄文',
  'pt': '葡萄牙文',
  'it': '意大利文',
  'th': '泰文',
  'vi': '越南文',
  'ar': '阿拉伯文',
  'hi': '印地文',
  'tr': '土耳其文'
} as const

/**
 * 翻译质量选项
 */
export const TRANSLATE_QUALITIES = {
  'fast': '快速翻译',
  'balanced': '平衡翻译',
  'accurate': '精准翻译'
} as const

/**
 * 翻译服务
 */
export class TranslateService {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, region: string = 'beijing') {
    this.apiKey = apiKey
    if (region === 'singapore' || region === 'intl') {
      this.baseUrl = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions'
    } else {
      this.baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    }
  }

  /**
   * 根据中文描述自动识别目标语言
   */
  detectTargetLanguage(text: string): string {
    const lowerText = text.toLowerCase()
    
    // 英文相关关键词
    if (/英文|english|en\b|英|翻译成英/.test(text)) {
      return 'en'
    }
    
    // 日文相关关键词
    if (/日文|日语|japanese|ja\b|日|翻译成日/.test(text)) {
      return 'ja'
    }
    
    // 韩文相关关键词
    if (/韩文|韩语|korean|ko\b|韩|翻译成韩/.test(text)) {
      return 'ko'
    }
    
    // 西班牙文相关关键词
    if (/西班牙|spanish|es\b|西班牙文/.test(text)) {
      return 'es'
    }
    
    // 法文相关关键词
    if (/法文|法语|french|fr\b|法|翻译成法/.test(text)) {
      return 'fr'
    }
    
    // 德文相关关键词
    if (/德文|德语|german|de\b|德|翻译成德/.test(text)) {
      return 'de'
    }
    
    // 俄文相关关键词
    if (/俄文|俄语|russian|ru\b|俄|翻译成俄/.test(text)) {
      return 'ru'
    }
    
    // 葡萄牙文相关关键词
    if (/葡萄牙|portuguese|pt\b|葡/.test(text)) {
      return 'pt'
    }
    
    // 意大利文相关关键词
    if (/意大利|italian|it\b|意/.test(text)) {
      return 'it'
    }
    
    // 泰文相关关键词
    if (/泰文|泰语|thai|th\b|泰|翻译成泰/.test(text)) {
      return 'th'
    }
    
    // 越南文相关关键词
    if (/越南|vietnamese|vi\b|越|翻译成越/.test(text)) {
      return 'vi'
    }
    
    // 阿拉伯文相关关键词
    if (/阿拉伯|arabic|ar\b|阿/.test(text)) {
      return 'ar'
    }
    
    // 印地文相关关键词
    if (/印地|hindi|hi\b|印/.test(text)) {
      return 'hi'
    }
    
    // 土耳其文相关关键词
    if (/土耳其|turkish|tr\b|土/.test(text)) {
      return 'tr'
    }
    
    // 中文相关关键词
    if (/中文|中文|chinese|zh\b|中|翻译成中/.test(text)) {
      return 'zh'
    }
    
    // 默认翻译为英文
    return 'en'
  }

  /**
   * 从文本中提取要翻译的内容
   */
  extractTranslateText(text: string): string {
    // 移除语言标识词，保留要翻译的内容
    let result = text
      .replace(/翻译成?[a-z]*文?/gi, '')
      .replace(/翻译为?[a-z]*文?/gi, '')
      .replace(/translate to /gi, '')
      .replace(/translate into /gi, '')
      .replace(/英文|日文|韩文|法文|德文|俄文|西班牙|葡萄牙|意大利|泰文|越南|阿拉伯|印地|土耳其|中文/g, '')
      .replace(/english|japanese|korean|french|german|russian|spanish|portuguese|italian|thai|vietnamese|arabic|hindi|turkish|chinese/gi, '')
      .replace(/en\b|ja\b|ko\b|fr\b|de\b|ru\b|es\b|pt\b|it\b|th\b|vi\b|ar\b|hi\b|tr\b|zh\b/gi, '')
      .trim()
    
    return result
  }

  /**
   * 翻译文本
   */
  async translate(params: TranslateParams): Promise<ApiResponse<string>> {
    try {
      logger.info(`[翻译] 开始翻译`)
      logger.info(`[翻译] 参数: text=${params.text}, targetLanguage=${params.targetLanguage}`)
      
      if (!params.text || params.text.trim().length === 0) {
        logger.error(`[翻译] 翻译文本为空`)
        return {
          success: false,
          error: '请提供要翻译的文本'
        }
      }

      if (!params.targetLanguage) {
        logger.error(`[翻译] 目标语言未指定`)
        return {
          success: false,
          error: '请指定目标语言'
        }
      }

      const targetLang = params.targetLanguage.toLowerCase()
      if (!SUPPORTED_LANGUAGES[targetLang as keyof typeof SUPPORTED_LANGUAGES]) {
        logger.error(`[翻译] 不支持的语言: ${targetLang}`)
        return {
          success: false,
          error: `不支持的语言: ${targetLang}`
        }
      }

      const sourceLang = params.sourceLanguage?.toLowerCase() || 'auto'
      const targetLangName = SUPPORTED_LANGUAGES[targetLang as keyof typeof SUPPORTED_LANGUAGES]

      logger.info(`[翻译] 翻译文本到 ${targetLangName}`)
      logger.info(`[翻译] 调用 API: ${this.baseUrl}`)

      // 调用千问翻译 API (qwen-mt-flash)
      // 翻译 API 需要在请求体中直接指定 translation_options
      const response = await axios.post(this.baseUrl, {
        model: 'qwen-mt-flash',
        messages: [
          {
            role: 'user',
            content: params.text
          }
        ],
        translation_options: {
          source_lang: sourceLang === 'auto' ? 'auto' : sourceLang,
          target_lang: this.mapLanguageCode(targetLang)
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      logger.info(`[翻译] API 响应状态: ${response.status}`)
      logger.info(`[翻译] API 响应数据: ${JSON.stringify(response.data)}`)

      const translatedText = response.data?.choices?.[0]?.message?.content
      if (!translatedText) {
        logger.error(`[翻译] 翻译失败，无法从响应中提取翻译结果`)
        logger.error(`[翻译] 完整响应: ${JSON.stringify(response.data)}`)
        return {
          success: false,
          error: '翻译失败'
        }
      }

      logger.info(`[翻译] 翻译成功: ${translatedText}`)

      return {
        success: true,
        data: translatedText.trim(),
        message: `已翻译为 ${targetLangName}`
      }
    } catch (error: any) {
      logger.error(`[翻译] 翻译异常: ${formatError(error)}`)
      
      // 处理 API 错误响应
      if (error.response?.data) {
        const errorData = error.response.data
        const errorCode = errorData.code
        const errorMessage = errorData.message
        
        logger.error(`[翻译] API 错误代码: ${errorCode}`)
        logger.error(`[翻译] API 错误信息: ${errorMessage}`)
        
        // 根据错误代码返回友好的错误信息
        if (errorCode === '400-InvalidParameter') {
          if (errorMessage?.includes('暂时不支持当前设置的语种')) {
            return {
              success: false,
              error: '❌ 暂时不支持当前设置的语种，请检查源语言或目标语言设置'
            }
          }
          return {
            success: false,
            error: `❌ 参数错误: ${errorMessage}`
          }
        } else if (errorCode === '401-InvalidApiKey' || errorCode === '401-NOT AUTHORIZED') {
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
        error: `❌ 翻译失败: ${formatError(error)}`
      }
    }
  }


  /**
   * 映射语言代码为 API 支持的格式
   */
  private mapLanguageCode(code: string): string {
    const languageMap: Record<string, string> = {
      'zh': 'Chinese',
      'en': 'English',
      'ja': 'Japanese',
      'ko': 'Korean',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'ru': 'Russian',
      'pt': 'Portuguese',
      'it': 'Italian',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'tr': 'Turkish'
    }
    return languageMap[code] || code
  }

  /**
   * 获取支持的语言
   */
  getSupportedLanguages(): Record<string, string> {
    return SUPPORTED_LANGUAGES
  }

  /**
   * 获取翻译质量选项
   */
  getQualityOptions(): Record<string, string> {
    return TRANSLATE_QUALITIES
  }

  /**
   * 格式化语言列表
   */
  formatLanguagesList(): string {
    return Object.entries(SUPPORTED_LANGUAGES)
      .map(([code, name]) => `  • ${code} - ${name}`)
      .join('\n')
  }

  /**
   * 格式化质量列表
   */
  formatQualitiesList(): string {
    return Object.entries(TRANSLATE_QUALITIES)
      .map(([key, value]) => `  • ${key} - ${value}`)
      .join('\n')
  }
}
