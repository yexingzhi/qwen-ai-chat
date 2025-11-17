/**
 * Qwen AI Chat 插件类型定义
 */

/**
 * 模型配置
 */
export interface ModelConfig {
  name: string
  model: string
  baseURL: string
  apiKey: string
  temperature?: number
  maxTokens?: number
  description?: string
}

/**
 * 插件配置
 */
export interface PluginConfig {
  // 默认模型
  defaultModel: string
  
  // 模型列表
  models: ModelConfig[]
  
  // 全局设置
  temperature: number
  maxTokens: number
  
  // 功能开关
  enableTextToImage: boolean
  enableImageEdit: boolean
  enableTextToVideo: boolean
  enableTranslate: boolean
}

/**
 * 人设配置接口
 */
export interface PersonaConfig {
  /** 人设唯一标识 */
  name: string
  /** 人设描述 */
  description: string
  /** 系统提示词 */
  systemPrompt: string
  /** 创意度 (0-2) */
  temperature: number
  /** 最大输出 token 数 */
  maxTokens: number
  /** 人设头像 URL */
  avatar?: string
  /** 初始问候语 */
  greeting: string
  /** 性格特征列表 */
  personalityTraits: string[]
}

/**
 * 对话消息接口
 */
export interface ChatMessage {
  /** 消息角色 */
  role: 'system' | 'user' | 'assistant'
  /** 消息内容 */
  content: string
  /** 消息时间戳 */
  timestamp: number
  /** 消息 token 数（可选） */
  tokens?: number
}

/**
 * 对话上下文接口
 */
export interface ConversationContext {
  /** 对话会话 ID */
  sessionId: string
  /** 消息历史 */
  messages: ChatMessage[]
  /** 当前使用的人设 */
  persona: string
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
  /** 最大历史消息数 */
  maxHistoryLength: number
}

/**
 * 数据库中的对话记录
 */
export interface ConversationRecord {
  id?: number
  sessionId: string
  userId: string
  persona: string
  messages: string  // JSON 字符串
  totalTokens: number
  messageCount: number
  createdAt: number
  updatedAt: number
}

/**
 * 插件配置扩展接口（用于人设和对话上下文功能）
 */
export interface EnhancedConfig {
  /** 启用人设功能 */
  enablePersonas?: boolean
  /** 启用对话上下文 */
  enableContext?: boolean
  /** 默认人设名称 */
  defaultPersona?: string
  /** 最大上下文 token 数 */
  maxContextTokens?: number
  /** 最大历史消息数 */
  maxHistoryLength?: number
  /** 对话超时时间（毫秒） */
  contextTimeout?: number
  /** 允许自定义人设 */
  enableCustomPersonas?: boolean
  /** 启用数据库持久化 */
  enablePersistence?: boolean
  /** 会话保留时间（毫秒），默认 7 天 */
  sessionRetentionTime?: number
  /** 自动清理间隔（毫秒），默认 1 小时 */
  cleanupInterval?: number
}

/**
 * API 响应通用接口
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean
  /** 响应数据 */
  data?: T
  /** 错误信息 */
  error?: string
  /** 提示信息 */
  message?: string
}

/**
 * 文生图参数接口
 */
export interface TextToImageParams {
  /** 图像描述 */
  prompt: string
  /** 图像尺寸 */
  size?: string
  /** 图像风格 */
  style?: string
  /** 负面提示 */
  negativePrompt?: string
  /** 图像质量 */
  quality?: string
}

/**
 * 文生视频参数接口
 */
export interface TextToVideoParams {
  /** 视频描述 */
  prompt: string
  /** 视频时长（秒） */
  duration?: number
  /** 视频分辨率 */
  size?: string
  /** 负面提示 */
  negativePrompt?: string
}

/**
 * 翻译参数接口
 */
export interface TranslateParams {
  /** 要翻译的文本 */
  text: string
  /** 目标语言代码 */
  targetLanguage: string
  /** 源语言代码（可选，默认自动检测） */
  sourceLanguage?: string
  /** 翻译质量（可选） */
  quality?: string
}

/**
 * 图片编辑参数接口
 */
export interface ImageEditParams {
  /** 图片 URL */
  imageUrl: string
  /** 编辑操作类型 */
  action?: string
  /** 编辑描述 */
  prompt: string
  /** 掩码 URL（可选，用于指定编辑区域） */
  maskUrl?: string
}

/**
 * 对话记录接口
 */
export interface ConversationRecord {
  id?: number
  sessionId: string
  userId: string
  persona: string
  messages: string // JSON 字符串
  totalTokens: number
  messageCount: number
  createdAt: number
  updatedAt: number
}

/**
 * Koishi 数据库表声明
 */
declare module 'koishi' {
  interface Tables {
    'qwen_conversation_history': {
      id: number
      sessionId: string
      userId: string
      persona: string
      messages: string
      totalTokens: number
      messageCount: number
      createdAt: number
      updatedAt: number
    }
    'qwen_user_preferences': {
      id: number
      userId: string
      currentPersona: string
      favoritePersonas: string
      createdAt: number
      updatedAt: number
    }
    'qwen_custom_personas': {
      id: number
      userId: string
      name: string
      description: string
      systemPrompt: string
      temperature: number
      maxTokens: number
      greeting: string
      personalityTraits: string
      createdAt: number
      updatedAt: number
    }
    'qwen_user_memory': {
      id: number
      userId: string
      preferences: string
      conversationStyle: 'casual' | 'professional' | 'creative'
      topics: string
      memoryFragments: string
      createdAt: number
      updatedAt: number
    }
  }
}
