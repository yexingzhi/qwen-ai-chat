/**
 * 人设适配器
 * 提供灵活的人设接口适配，支持自定义人设扩展
 */

import { PersonaConfig } from '../types'

/**
 * 人设适配器接口
 */
export interface PersonaAdapter {
  /** 适配器名称 */
  name: string
  /** 适配器版本 */
  version: string
  /** 适配器描述 */
  description: string
  /** 转换人设配置 */
  adapt(input: any): PersonaConfig | null
  /** 验证人设配置 */
  validate(persona: PersonaConfig): boolean
  /** 获取适配器信息 */
  getInfo(): AdapterInfo
}

/**
 * 适配器信息
 */
export interface AdapterInfo {
  name: string
  version: string
  description: string
  supportedFormats: string[]
  author?: string
  homepage?: string
}

/**
 * 人设适配器管理器
 */
export class PersonaAdapterManager {
  private adapters: Map<string, PersonaAdapter> = new Map()

  /**
   * 注册适配器
   */
  registerAdapter(adapter: PersonaAdapter): void {
    this.adapters.set(adapter.name, adapter)
  }

  /**
   * 注销适配器
   */
  unregisterAdapter(name: string): boolean {
    return this.adapters.delete(name)
  }

  /**
   * 获取适配器
   */
  getAdapter(name: string): PersonaAdapter | null {
    return this.adapters.get(name) || null
  }

  /**
   * 获取所有适配器
   */
  getAllAdapters(): PersonaAdapter[] {
    return Array.from(this.adapters.values())
  }

  /**
   * 使用适配器转换人设
   */
  adapt(adapterName: string, input: any): PersonaConfig | null {
    const adapter = this.getAdapter(adapterName)
    if (!adapter) {
      return null
    }

    const persona = adapter.adapt(input)
    if (persona && adapter.validate(persona)) {
      return persona
    }

    return null
  }

  /**
   * 尝试所有适配器进行转换
   */
  adaptAny(input: any): { adapter: string; persona: PersonaConfig } | null {
    for (const adapter of this.adapters.values()) {
      const persona = adapter.adapt(input)
      if (persona && adapter.validate(persona)) {
        return { adapter: adapter.name, persona }
      }
    }
    return null
  }

  /**
   * 获取适配器列表信息
   */
  getAdaptersInfo(): AdapterInfo[] {
    return Array.from(this.adapters.values()).map(adapter => adapter.getInfo())
  }
}

/**
 * 标准人设适配器 - 直接使用 PersonaConfig 对象
 */
export class StandardPersonaAdapter implements PersonaAdapter {
  name = 'standard'
  version = '1.0.0'
  description = '标准人设适配器，直接使用 PersonaConfig 对象'

  adapt(input: any): PersonaConfig | null {
    if (typeof input !== 'object' || input === null) {
      return null
    }

    // 检查必需字段
    if (!input.name || !input.description || !input.systemPrompt || !input.greeting) {
      return null
    }

    return {
      name: String(input.name),
      description: String(input.description),
      systemPrompt: String(input.systemPrompt),
      temperature: typeof input.temperature === 'number' ? input.temperature : 0.7,
      maxTokens: typeof input.maxTokens === 'number' ? input.maxTokens : 1000,
      avatar: input.avatar ? String(input.avatar) : undefined,
      greeting: String(input.greeting),
      personalityTraits: Array.isArray(input.personalityTraits)
        ? input.personalityTraits.map(String)
        : []
    }
  }

  validate(persona: PersonaConfig): boolean {
    return !!(
      persona.name &&
      persona.description &&
      persona.systemPrompt &&
      persona.greeting &&
      typeof persona.temperature === 'number' &&
      persona.temperature >= 0 &&
      persona.temperature <= 2 &&
      typeof persona.maxTokens === 'number' &&
      persona.maxTokens > 0
    )
  }

  getInfo(): AdapterInfo {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      supportedFormats: ['PersonaConfig', 'JSON']
    }
  }
}

/**
 * JSON 字符串适配器 - 从 JSON 字符串解析人设
 */
export class JsonPersonaAdapter implements PersonaAdapter {
  name = 'json'
  version = '1.0.0'
  description = 'JSON 字符串适配器，从 JSON 字符串解析人设配置'

  private standardAdapter = new StandardPersonaAdapter()

  adapt(input: any): PersonaConfig | null {
    if (typeof input !== 'string') {
      return null
    }

    try {
      const parsed = JSON.parse(input)
      return this.standardAdapter.adapt(parsed)
    } catch {
      return null
    }
  }

  validate(persona: PersonaConfig): boolean {
    return this.standardAdapter.validate(persona)
  }

  getInfo(): AdapterInfo {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      supportedFormats: ['JSON String']
    }
  }
}

/**
 * YAML 字符串适配器 - 从 YAML 字符串解析人设
 */
export class YamlPersonaAdapter implements PersonaAdapter {
  name = 'yaml'
  version = '1.0.0'
  description = 'YAML 字符串适配器，从 YAML 字符串解析人设配置'

  private standardAdapter = new StandardPersonaAdapter()

  adapt(input: any): PersonaConfig | null {
    if (typeof input !== 'string') {
      return null
    }

    try {
      // 简单的 YAML 解析（仅支持基础格式）
      const parsed = this.parseSimpleYaml(input)
      return this.standardAdapter.adapt(parsed)
    } catch {
      return null
    }
  }

  private parseSimpleYaml(yaml: string): any {
    const result: any = {}
    const lines = yaml.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const colonIndex = trimmed.indexOf(':')
      if (colonIndex === -1) continue

      const key = trimmed.substring(0, colonIndex).trim()
      let value = trimmed.substring(colonIndex + 1).trim()

      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      // 尝试解析数字
      if (!isNaN(Number(value)) && value !== '') {
        result[key] = Number(value)
      } else if (value === 'true') {
        result[key] = true
      } else if (value === 'false') {
        result[key] = false
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // 简单数组解析
        const arrayStr = value.slice(1, -1)
        result[key] = arrayStr.split(',').map(item => item.trim())
      } else {
        result[key] = value
      }
    }

    return result
  }

  validate(persona: PersonaConfig): boolean {
    return this.standardAdapter.validate(persona)
  }

  getInfo(): AdapterInfo {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      supportedFormats: ['YAML String']
    }
  }
}

/**
 * 简化人设适配器 - 从简化格式创建人设
 */
export class SimplePersonaAdapter implements PersonaAdapter {
  name = 'simple'
  version = '1.0.0'
  description = '简化人设适配器，从简化格式创建人设'

  adapt(input: any): PersonaConfig | null {
    if (typeof input !== 'object' || input === null) {
      return null
    }

    // 只需要名称和描述
    if (!input.name || !input.description) {
      return null
    }

    return {
      name: String(input.name),
      description: String(input.description),
      systemPrompt: input.systemPrompt || `你是一个名叫 ${input.name} 的 AI 助手。${input.description}`,
      temperature: input.temperature || 0.7,
      maxTokens: input.maxTokens || 1000,
      avatar: input.avatar,
      greeting: input.greeting || `你好！我是 ${input.name}。${input.description}`,
      personalityTraits: input.personalityTraits || []
    }
  }

  validate(persona: PersonaConfig): boolean {
    return !!(persona.name && persona.description)
  }

  getInfo(): AdapterInfo {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      supportedFormats: ['Simplified Object']
    }
  }
}

/**
 * 模板人设适配器 - 基于模板创建人设
 */
export class TemplatePersonaAdapter implements PersonaAdapter {
  name = 'template'
  version = '1.0.0'
  description = '模板人设适配器，基于预定义模板创建人设'

  private templates: Map<string, PersonaConfig> = new Map()

  constructor() {
    this.initializeDefaultTemplates()
  }

  private initializeDefaultTemplates(): void {
    this.templates.set('assistant', {
      name: 'assistant',
      description: '友好的 AI 助手',
      systemPrompt: '你是一个友好、有帮助的 AI 助手。',
      temperature: 0.7,
      maxTokens: 1000,
      greeting: '你好！我是你的 AI 助手，很高兴为你服务。',
      personalityTraits: ['友好', '有帮助', '专业']
    })

    this.templates.set('creative', {
      name: 'creative',
      description: '富有创意的写手',
      systemPrompt: '你是一个富有创意和想象力的写手。',
      temperature: 1.2,
      maxTokens: 2000,
      greeting: '你好！我是一个富有创意的写手，让我们一起创作精彩的故事吧！',
      personalityTraits: ['创意', '想象力丰富', '热情']
    })

    this.templates.set('professional', {
      name: 'professional',
      description: '专业的商务顾问',
      systemPrompt: '你是一个专业的商务顾问。',
      temperature: 0.5,
      maxTokens: 1500,
      greeting: '你好！我是一个专业的商务顾问，很高兴为您提供帮助。',
      personalityTraits: ['专业', '严谨', '高效']
    })
  }

  adapt(input: any): PersonaConfig | null {
    if (typeof input !== 'string') {
      return null
    }

    const template = this.templates.get(input.toLowerCase())
    if (!template) {
      return null
    }

    return { ...template }
  }

  validate(persona: PersonaConfig): boolean {
    return !!(persona.name && persona.description && persona.systemPrompt && persona.greeting)
  }

  addTemplate(name: string, persona: PersonaConfig): void {
    this.templates.set(name.toLowerCase(), persona)
  }

  removeTemplate(name: string): boolean {
    return this.templates.delete(name.toLowerCase())
  }

  getTemplates(): string[] {
    return Array.from(this.templates.keys())
  }

  getInfo(): AdapterInfo {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      supportedFormats: ['Template Name']
    }
  }
}

/**
 * 创建人设适配器管理器并注册默认适配器
 */
export function createPersonaAdapterManager(): PersonaAdapterManager {
  const manager = new PersonaAdapterManager()

  // 注册默认适配器
  manager.registerAdapter(new StandardPersonaAdapter())
  manager.registerAdapter(new JsonPersonaAdapter())
  manager.registerAdapter(new YamlPersonaAdapter())
  manager.registerAdapter(new SimplePersonaAdapter())
  manager.registerAdapter(new TemplatePersonaAdapter())

  return manager
}
