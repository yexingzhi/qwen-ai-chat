/**
 * 用户记忆和个性化管理
 * 提供用户偏好、对话风格、话题记忆等功能
 */

import { Context } from 'koishi'

/**
 * 用户记忆接口
 */
export interface UserMemory {
  /** 用户 ID */
  userId: string
  /** 用户偏好列表 */
  preferences: string[]
  /** 对话风格 */
  conversationStyle: 'casual' | 'professional' | 'creative'
  /** 常用话题 */
  topics: string[]
  /** 记忆片段 Map */
  memoryFragments: Map<string, any>
  /** 创建时间 */
  createdAt: Date
  /** 最后更新时间 */
  updatedAt: Date
}

/**
 * 用户记忆管理器
 */
export class UserMemoryManager {
  private memories: Map<string, UserMemory> = new Map()
  private ctx: Context

  constructor(ctx: Context) {
    this.ctx = ctx
  }

  /**
   * 获取或创建用户记忆
   */
  getOrCreateMemory(userId: string): UserMemory {
    if (!this.memories.has(userId)) {
      this.memories.set(userId, {
        userId,
        preferences: [],
        conversationStyle: 'casual',
        topics: [],
        memoryFragments: new Map(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
    return this.memories.get(userId)!
  }

  /**
   * 获取用户记忆
   */
  getMemory(userId: string): UserMemory | null {
    return this.memories.get(userId) || null
  }

  /**
   * 添加用户偏好
   */
  addPreference(userId: string, preference: string): void {
    const memory = this.getOrCreateMemory(userId)
    if (!memory.preferences.includes(preference)) {
      memory.preferences.push(preference)
      memory.updatedAt = new Date()
    }
  }

  /**
   * 移除用户偏好
   */
  removePreference(userId: string, preference: string): void {
    const memory = this.getOrCreateMemory(userId)
    const index = memory.preferences.indexOf(preference)
    if (index > -1) {
      memory.preferences.splice(index, 1)
      memory.updatedAt = new Date()
    }
  }

  /**
   * 获取用户偏好列表
   */
  getPreferences(userId: string): string[] {
    const memory = this.getOrCreateMemory(userId)
    return memory.preferences
  }

  /**
   * 设置对话风格
   */
  setConversationStyle(userId: string, style: 'casual' | 'professional' | 'creative'): void {
    const memory = this.getOrCreateMemory(userId)
    memory.conversationStyle = style
    memory.updatedAt = new Date()
  }

  /**
   * 获取对话风格
   */
  getConversationStyle(userId: string): 'casual' | 'professional' | 'creative' {
    const memory = this.getOrCreateMemory(userId)
    return memory.conversationStyle
  }

  /**
   * 添加话题
   */
  addTopic(userId: string, topic: string): void {
    const memory = this.getOrCreateMemory(userId)
    if (!memory.topics.includes(topic)) {
      memory.topics.push(topic)
      memory.updatedAt = new Date()
    }
  }

  /**
   * 移除话题
   */
  removeTopic(userId: string, topic: string): void {
    const memory = this.getOrCreateMemory(userId)
    const index = memory.topics.indexOf(topic)
    if (index > -1) {
      memory.topics.splice(index, 1)
      memory.updatedAt = new Date()
    }
  }

  /**
   * 获取话题列表
   */
  getTopics(userId: string): string[] {
    const memory = this.getOrCreateMemory(userId)
    return memory.topics
  }

  /**
   * 存储记忆片段
   */
  setMemoryFragment(userId: string, key: string, value: any): void {
    const memory = this.getOrCreateMemory(userId)
    memory.memoryFragments.set(key, {
      value,
      timestamp: Date.now()
    })
    memory.updatedAt = new Date()
  }

  /**
   * 获取记忆片段
   */
  getMemoryFragment(userId: string, key: string): any {
    const memory = this.getOrCreateMemory(userId)
    const fragment = memory.memoryFragments.get(key)
    return fragment ? fragment.value : null
  }

  /**
   * 获取所有记忆片段
   */
  getAllMemoryFragments(userId: string): Record<string, any> {
    const memory = this.getOrCreateMemory(userId)
    const result: Record<string, any> = {}
    memory.memoryFragments.forEach((fragment, key) => {
      result[key] = fragment.value
    })
    return result
  }

  /**
   * 删除记忆片段
   */
  deleteMemoryFragment(userId: string, key: string): void {
    const memory = this.getOrCreateMemory(userId)
    memory.memoryFragments.delete(key)
    memory.updatedAt = new Date()
  }

  /**
   * 清空用户记忆
   */
  clearMemory(userId: string): void {
    this.memories.delete(userId)
  }

  /**
   * 获取用户记忆摘要
   */
  getMemorySummary(userId: string): string {
    const memory = this.getOrCreateMemory(userId)
    const lines: string[] = []

    lines.push(`👤 用户记忆摘要 / User Memory Summary`)
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    
    if (memory.preferences.length > 0) {
      lines.push(`📌 偏好 / Preferences: ${memory.preferences.join(', ')}`)
    }
    
    lines.push(`💬 对话风格 / Conversation Style: ${memory.conversationStyle}`)
    
    if (memory.topics.length > 0) {
      lines.push(`🏷️ 话题 / Topics: ${memory.topics.join(', ')}`)
    }
    
    if (memory.memoryFragments.size > 0) {
      lines.push(`🧠 记忆片段数 / Memory Fragments: ${memory.memoryFragments.size}`)
    }
    
    lines.push(`⏰ 最后更新 / Last Updated: ${memory.updatedAt.toLocaleString()}`)

    return lines.join('\n')
  }

  /**
   * 导出用户记忆为 JSON
   */
  exportMemory(userId: string): string {
    const memory = this.getOrCreateMemory(userId)
    const fragments: Record<string, any> = {}
    memory.memoryFragments.forEach((fragment, key) => {
      fragments[key] = fragment.value
    })

    return JSON.stringify({
      userId: memory.userId,
      preferences: memory.preferences,
      conversationStyle: memory.conversationStyle,
      topics: memory.topics,
      memoryFragments: fragments,
      createdAt: memory.createdAt.toISOString(),
      updatedAt: memory.updatedAt.toISOString()
    }, null, 2)
  }

  /**
   * 从 JSON 导入用户记忆
   */
  importMemory(userId: string, jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)
      const memory = this.getOrCreateMemory(userId)

      if (Array.isArray(data.preferences)) {
        memory.preferences = data.preferences
      }
      if (data.conversationStyle) {
        memory.conversationStyle = data.conversationStyle
      }
      if (Array.isArray(data.topics)) {
        memory.topics = data.topics
      }
      if (data.memoryFragments && typeof data.memoryFragments === 'object') {
        Object.entries(data.memoryFragments).forEach(([key, value]) => {
          memory.memoryFragments.set(key, { value, timestamp: Date.now() })
        })
      }

      memory.updatedAt = new Date()
      return true
    } catch (error) {
      return false
    }
  }
}

/**
 * 创建用户记忆管理器
 */
export function createUserMemoryManager(ctx: Context): UserMemoryManager {
  return new UserMemoryManager(ctx)
}
