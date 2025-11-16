/**
 * 模型管理模块
 */

import { ModelConfig, PluginConfig } from './types'

/**
 * 预定义的模型列表
 */
export const PRESET_MODELS: Record<string, ModelConfig> = {
  'qwen-turbo': {
    name: 'qwen-turbo',
    model: 'qwen-turbo',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2000,
    description: '快速模型，适合实时对话'
  },
  'qwen-plus': {
    name: 'qwen-plus',
    model: 'qwen-plus',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2000,
    description: '平衡模型，推荐使用'
  },
  'qwen-max': {
    name: 'qwen-max',
    model: 'qwen-max',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2000,
    description: '高性能模型，适合复杂任务'
  },
  'qwen-long': {
    name: 'qwen-long',
    model: 'qwen-long',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 4000,
    description: '长文本模型，支持更长的输入'
  }
}

/**
 * 模型管理器
 */
export class ModelManager {
  private models: Map<string, ModelConfig> = new Map()
  private currentModel: string = 'qwen-plus'

  constructor(config: PluginConfig) {
    // 初始化模型
    config.models.forEach(model => {
      this.models.set(model.name, model)
    })
    this.currentModel = config.defaultModel
  }

  /**
   * 获取所有模型
   */
  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values())
  }

  /**
   * 获取模型
   */
  getModel(name: string): ModelConfig | undefined {
    return this.models.get(name)
  }

  /**
   * 获取当前模型
   */
  getCurrentModel(): ModelConfig | undefined {
    return this.models.get(this.currentModel)
  }

  /**
   * 设置当前模型
   */
  setCurrentModel(name: string): boolean {
    if (this.models.has(name)) {
      this.currentModel = name
      return true
    }
    return false
  }

  /**
   * 添加模型
   */
  addModel(model: ModelConfig): boolean {
    if (this.models.has(model.name)) {
      return false
    }
    this.models.set(model.name, model)
    return true
  }

  /**
   * 删除模型
   */
  removeModel(name: string): boolean {
    if (name === this.currentModel) {
      return false // 不能删除当前模型
    }
    return this.models.delete(name)
  }

  /**
   * 更新模型
   */
  updateModel(name: string, updates: Partial<ModelConfig>): boolean {
    const model = this.models.get(name)
    if (!model) {
      return false
    }
    Object.assign(model, updates)
    return true
  }

  /**
   * 获取模型列表字符串
   */
  getModelListString(): string {
    const models = this.getAllModels()
    const current = this.currentModel
    
    return models
      .map(m => {
        const marker = m.name === current ? '✓ ' : '  '
        return `${marker}${m.name} - ${m.description || m.model}`
      })
      .join('\n')
  }

  /**
   * 导出配置
   */
  exportConfig(): ModelConfig[] {
    return this.getAllModels()
  }
}

/**
 * 创建默认配置
 */
export function createDefaultConfig(apiKey: string): PluginConfig {
  const defaultModels = [
    {
      ...PRESET_MODELS['qwen-plus'],
      apiKey
    },
    {
      ...PRESET_MODELS['qwen-turbo'],
      apiKey
    },
    {
      ...PRESET_MODELS['qwen-max'],
      apiKey
    }
  ]

  return {
    defaultModel: 'qwen-plus',
    models: defaultModels,
    temperature: 0.7,
    maxTokens: 2000,
    enableTextToImage: true,
    enableImageEdit: true,
    enableTextToVideo: true,
    enableTranslate: true
  }
}
