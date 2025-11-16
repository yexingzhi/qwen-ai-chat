/**
 * 人设管理器
 * 负责管理内置人设、自定义人设和用户人设状态
 */

import { PersonaConfig, EnhancedConfig } from '../types'
import { getSimplePersonas } from './personas-simple'
import { getComplexPersonas } from './personas-complex'

export class PersonaManager {
  /** 内置人设存储 */
  private personas: Map<string, PersonaConfig> = new Map()
  /** 自定义人设存储 */
  private userPersonas: Map<string, PersonaConfig> = new Map()
  /** 用户当前人设状态 (userId -> personaName) */
  private userStates: Map<string, string> = new Map()
  /** 人设版本 */
  private personaVersion: 'simple' | 'complex'
  /** 人设别名映射 (中文名/别名 -> 英文名) */
  private personaAliases: Map<string, string> = new Map()

  constructor(private config: EnhancedConfig, personaVersion: 'simple' | 'complex' = 'simple') {
    this.personaVersion = personaVersion
    this.initializeDefaultPersonas()
  }

  /**
   * 初始化内置人设
   */
  private initializeDefaultPersonas(): void {
    const defaultPersonas = this.personaVersion === 'simple'
      ? getSimplePersonas()
      : getComplexPersonas()
    
    defaultPersonas.forEach(persona => {
      this.personas.set(persona.name, persona)
    })

    // 建立人设别名映射
    this.initializePersonaAliases()
  }

  /**
   * 初始化人设别名映射（中文名 -> 英文名）
   */
  private initializePersonaAliases(): void {
    const aliases: Record<string, string> = {
      // 默认人设
      '默认': 'default',
      '官方默认': 'default',
      
      // 助手类
      '助手': 'assistant',
      '标准助手': 'assistant',
      
      // 角色类
      '猫娘': 'catgirl',
      '可爱猫娘': 'catgirl',
      '女仆': 'maid',
      '专业女仆': 'maid',
      '大姐姐': 'big-sister',
      '温柔大姐姐': 'big-sister',
      '女友': 'girlfriend',
      '贴心女友': 'girlfriend',
      '男友': 'boyfriend',
      '温柔男友': 'boyfriend',
      
      // 性格类
      '傲娇': 'tsundere',
      '傲娇角色': 'tsundere',
      '元气': 'genki',
      '元气少女': 'genki',
      '御姐': 'cool-queen',
      '高冷御姐': 'cool-queen',
      '病娇': 'yandere',
      '病娇角色': 'yandere',
      '天然呆': 'dandere',
      '天然呆角色': 'dandere',
      '腹黑': 'schemer',
      '腹黑角色': 'schemer',
      
      // 特殊类
      '治愈': 'healer',
      '治愈系': 'healer',
      '总裁': 'ceo',
      '霸道总裁': 'ceo',
      '忠犬': 'loyal-dog',
      '忠犬系': 'loyal-dog'
    }

    // 添加别名到映射表
    Object.entries(aliases).forEach(([alias, name]) => {
      this.personaAliases.set(alias.toLowerCase(), name)
      this.personaAliases.set(alias, name)
    })

    // 英文名本身也作为别名
    this.personas.forEach((_, name) => {
      this.personaAliases.set(name.toLowerCase(), name)
      this.personaAliases.set(name, name)
    })
  }

  /**
   * 获取指定人设（支持中英文别名）
   * @param name 人设名称或别名
   * @returns 人设配置或 undefined
   */
  getPersona(name: string): PersonaConfig | undefined {
    // 先尝试直接查找
    let persona = this.personas.get(name) || this.userPersonas.get(name)
    if (persona) return persona

    // 尝试通过别名查找
    const realName = this.personaAliases.get(name) || this.personaAliases.get(name.toLowerCase())
    if (realName) {
      persona = this.personas.get(realName) || this.userPersonas.get(realName)
    }

    return persona
  }

  /**
   * 获取所有人设
   * @returns 所有人设列表
   */
  getAllPersonas(): PersonaConfig[] {
    return Array.from(this.personas.values()).concat(
      Array.from(this.userPersonas.values())
    )
  }

  /**
   * 获取用户当前人设
   * @param userId 用户 ID
   * @returns 当前人设配置
   */
  getCurrentPersona(userId: string): PersonaConfig {
    const personaName = this.userStates.get(userId) || (this.config.defaultPersona || 'default')
    return this.getPersona(personaName) || this.getPersona('default')!
  }

  /**
   * 切换用户人设（支持中英文别名）
   * @param userId 用户 ID
   * @param personaName 人设名称或别名
   * @returns 是否切换成功
   */
  switchPersona(userId: string, personaName: string): boolean {
    const persona = this.getPersona(personaName)
    if (persona) {
      // 存储真实的人设名称（英文名）
      this.userStates.set(userId, persona.name)
      return true
    }
    return false
  }

  /**
   * 获取用户当前人设名称
   * @param userId 用户 ID
   * @returns 人设名称
   */
  getCurrentPersonaName(userId: string): string {
    return this.userStates.get(userId) || (this.config.defaultPersona || 'default')
  }

  /**
   * 添加自定义人设
   * @param persona 人设配置
   * @returns 是否添加成功
   */
  addCustomPersona(persona: PersonaConfig): boolean {
    if (this.personas.has(persona.name) || this.userPersonas.has(persona.name)) {
      return false
    }
    this.userPersonas.set(persona.name, persona)
    return true
  }

  /**
   * 删除自定义人设
   * @param name 人设名称
   * @returns 是否删除成功
   */
  removeCustomPersona(name: string): boolean {
    // 不允许删除内置人设
    if (this.personas.has(name)) {
      return false
    }
    return this.userPersonas.delete(name)
  }

  /**
   * 检查人设是否存在
   * @param name 人设名称
   * @returns 是否存在
   */
  hasPersona(name: string): boolean {
    return this.personas.has(name) || this.userPersonas.has(name)
  }

  /**
   * 获取人设的所有别名
   * @param personaName 人设英文名
   * @returns 别名列表
   */
  getPersonaAliases(personaName: string): string[] {
    const aliases: string[] = [personaName]
    this.personaAliases.forEach((value, key) => {
      if (value === personaName && key !== personaName && key !== personaName.toLowerCase()) {
        aliases.push(key)
      }
    })
    return aliases
  }

  /**
   * 获取内置人设列表
   * @returns 内置人设列表
   */
  getDefaultPersonas(): PersonaConfig[] {
    return Array.from(this.personas.values())
  }

  /**
   * 获取自定义人设列表
   * @returns 自定义人设列表
   */
  getCustomPersonas(): PersonaConfig[] {
    return Array.from(this.userPersonas.values())
  }

  /**
   * 清除用户人设状态
   * @param userId 用户 ID
   */
  clearUserState(userId: string): void {
    this.userStates.delete(userId)
  }

  /**
   * 清除所有用户状态
   */
  clearAllUserStates(): void {
    this.userStates.clear()
  }
}
