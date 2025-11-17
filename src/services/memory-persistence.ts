/**
 * 用户记忆数据库持久化
 * 将用户记忆保存到数据库，支持跨会话恢复
 */

import { Context } from 'koishi'
import { UserMemory, UserMemoryManager } from './user-memory'

/**
 * 数据库中的用户记忆记录
 */
export interface UserMemoryRecord {
  id?: number
  userId: string
  preferences: string // JSON 字符串
  conversationStyle: 'casual' | 'professional' | 'creative'
  topics: string // JSON 字符串
  memoryFragments: string // JSON 字符串
  createdAt: number
  updatedAt: number
}

/**
 * 内存中的用户记忆持久化管理器
 */
export class MemoryPersistenceManager {
  private ctx: Context
  private memoryManager: UserMemoryManager
  private saveQueue: Set<string> = new Set()
  private saveInterval: NodeJS.Timeout | null = null
  private readonly SAVE_DELAY = 5000 // 5 秒后保存

  constructor(ctx: Context, memoryManager: UserMemoryManager) {
    this.ctx = ctx
    this.memoryManager = memoryManager
  }

  /**
   * 初始化数据库表
   */
  async initializeDatabase(): Promise<void> {
    try {
      // 检查表是否存在，如果不存在则创建
      await this.ctx.model.extend('qwen_user_memory', {
        id: 'unsigned',
        userId: 'string',
        preferences: 'text',
        conversationStyle: 'string',
        topics: 'text',
        memoryFragments: 'text',
        createdAt: 'unsigned',
        updatedAt: 'unsigned'
      })
    } catch (error) {
      // 表可能已存在，忽略错误
    }
  }

  /**
   * 从数据库加载用户记忆
   */
  async loadUserMemory(userId: string): Promise<boolean> {
    try {
      const records = await this.ctx.database.get('qwen_user_memory', { userId }) as any[]
      
      if (records.length === 0) {
        return false
      }

      const record = records[0]
      const memory = this.memoryManager.getOrCreateMemory(userId)

      // 恢复偏好
      try {
        const preferences = JSON.parse(record.preferences || '[]')
        memory.preferences = Array.isArray(preferences) ? preferences : []
      } catch {
        memory.preferences = []
      }

      // 恢复对话风格
      if (['casual', 'professional', 'creative'].includes(record.conversationStyle)) {
        memory.conversationStyle = record.conversationStyle as 'casual' | 'professional' | 'creative'
      }

      // 恢复话题
      try {
        const topics = JSON.parse(record.topics || '[]')
        memory.topics = Array.isArray(topics) ? topics : []
      } catch {
        memory.topics = []
      }

      // 恢复记忆片段
      try {
        const fragments = JSON.parse(record.memoryFragments || '{}')
        if (typeof fragments === 'object') {
          Object.entries(fragments).forEach(([key, value]) => {
            memory.memoryFragments.set(key, { value, timestamp: Date.now() })
          })
        }
      } catch {
        // 忽略错误
      }

      memory.createdAt = new Date(record.createdAt)
      memory.updatedAt = new Date(record.updatedAt)

      return true
    } catch (error) {
      this.ctx.logger.error(`[内存持久化] 加载用户记忆失败: ${userId}`, error)
      return false
    }
  }

  /**
   * 保存用户记忆到数据库
   */
  async saveUserMemory(userId: string): Promise<boolean> {
    try {
      const memory = this.memoryManager.getMemory(userId)
      if (!memory) {
        return false
      }

      const fragments: Record<string, any> = {}
      memory.memoryFragments.forEach((fragment, key) => {
        fragments[key] = fragment.value
      })

      const data = {
        userId,
        preferences: JSON.stringify(memory.preferences),
        conversationStyle: memory.conversationStyle,
        topics: JSON.stringify(memory.topics),
        memoryFragments: JSON.stringify(fragments),
        createdAt: memory.createdAt.getTime(),
        updatedAt: memory.updatedAt.getTime()
      }

      // 检查是否存在记录
      const existing = await this.ctx.database.get('qwen_user_memory', { userId }) as any[]

      if (existing.length > 0) {
        // 更新现有记录
        await this.ctx.database.set('qwen_user_memory', { userId }, data)
      } else {
        // 创建新记录
        await this.ctx.database.create('qwen_user_memory', data)
      }

      return true
    } catch (error) {
      this.ctx.logger.error(`[内存持久化] 保存用户记忆失败: ${userId}`, error)
      return false
    }
  }

  /**
   * 异步保存用户记忆（带延迟）
   */
  async saveUserMemoryAsync(userId: string): Promise<void> {
    this.saveQueue.add(userId)

    // 清除之前的定时器
    if (this.saveInterval) {
      clearTimeout(this.saveInterval)
    }

    // 设置新的定时器
    this.saveInterval = setTimeout(async () => {
      for (const id of this.saveQueue) {
        await this.saveUserMemory(id)
      }
      this.saveQueue.clear()
    }, this.SAVE_DELAY)
  }

  /**
   * 删除用户记忆
   */
  async deleteUserMemory(userId: string): Promise<boolean> {
    try {
      await (this.ctx.database as any).remove('qwen_user_memory', { userId })
      this.memoryManager.clearMemory(userId)
      return true
    } catch (error) {
      this.ctx.logger.error(`[内存持久化] 删除用户记忆失败: ${userId}`, error)
      return false
    }
  }

  /**
   * 获取所有用户记忆
   */
  async getAllUserMemories(): Promise<UserMemoryRecord[]> {
    try {
      return await this.ctx.database.get('qwen_user_memory', {}) as any
    } catch (error) {
      this.ctx.logger.error('[内存持久化] 获取所有用户记忆失败', error)
      return []
    }
  }

  /**
   * 清理过期的用户记忆（可选）
   */
  async cleanupExpiredMemories(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const now = Date.now()
      const allMemories = await this.getAllUserMemories()
      
      let deletedCount = 0
      for (const record of allMemories) {
        if (now - record.updatedAt > maxAgeMs) {
          await this.deleteUserMemory(record.userId)
          deletedCount++
        }
      }

      if (deletedCount > 0) {
        this.ctx.logger.info(`[内存持久化] 清理了 ${deletedCount} 条过期记忆`)
      }

      return deletedCount
    } catch (error) {
      this.ctx.logger.error('[内存持久化] 清理过期记忆失败', error)
      return 0
    }
  }

  /**
   * 获取用户记忆统计
   */
  async getMemoryStats(): Promise<{
    totalUsers: number
    totalPreferences: number
    totalTopics: number
    totalFragments: number
  }> {
    try {
      const allMemories = await this.getAllUserMemories()
      
      let totalPreferences = 0
      let totalTopics = 0
      let totalFragments = 0

      for (const record of allMemories) {
        try {
          const prefs = JSON.parse(record.preferences || '[]')
          totalPreferences += Array.isArray(prefs) ? prefs.length : 0

          const topics = JSON.parse(record.topics || '[]')
          totalTopics += Array.isArray(topics) ? topics.length : 0

          const fragments = JSON.parse(record.memoryFragments || '{}')
          totalFragments += Object.keys(fragments).length
        } catch {
          // 忽略解析错误
        }
      }

      return {
        totalUsers: allMemories.length,
        totalPreferences,
        totalTopics,
        totalFragments
      }
    } catch (error) {
      this.ctx.logger.error('[内存持久化] 获取统计信息失败', error)
      return {
        totalUsers: 0,
        totalPreferences: 0,
        totalTopics: 0,
        totalFragments: 0
      }
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.saveInterval) {
      clearTimeout(this.saveInterval)
    }
  }
}

/**
 * 创建内存持久化管理器
 */
export function createMemoryPersistenceManager(
  ctx: Context,
  memoryManager: UserMemoryManager
): MemoryPersistenceManager {
  return new MemoryPersistenceManager(ctx, memoryManager)
}
