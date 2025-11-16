/**
 * 数据库持久化模块
 * 集成 Koishi 数据库服务
 */

import { Context, Logger } from 'koishi'
import { ChatMessage, ConversationContext, ConversationRecord } from './types'

/**
 * 数据库服务
 */
export class DatabaseService {
  constructor(
    private ctx: Context,
    private logger: Logger
  ) {
    this.initializeDatabase()
  }

  /**
   * 初始化数据库表
   */
  private initializeDatabase(): void {
    try {
      // 扩展数据库模型 - 对话历史表
      this.ctx.model.extend('qwen_conversation_history', {
        id: 'unsigned',
        sessionId: 'string',
        userId: 'string',
        persona: 'string',
        messages: 'text', // JSON 字符串
        totalTokens: 'unsigned',
        messageCount: 'unsigned',
        createdAt: 'unsigned',
        updatedAt: 'unsigned'
      }, {
        primary: 'id',
        unique: ['sessionId']
      })

      // 扩展数据库模型 - 用户人设偏好表
      this.ctx.model.extend('qwen_user_preferences', {
        id: 'unsigned',
        userId: 'string',
        currentPersona: 'string',
        favoritePersonas: 'text', // JSON 数组
        createdAt: 'unsigned',
        updatedAt: 'unsigned'
      }, {
        primary: 'id',
        unique: ['userId']
      })

      // 扩展数据库模型 - 自定义人设表
      this.ctx.model.extend('qwen_custom_personas', {
        id: 'unsigned',
        userId: 'string',
        name: 'string',
        description: 'string',
        systemPrompt: 'text',
        temperature: 'double',
        maxTokens: 'unsigned',
        greeting: 'text',
        personalityTraits: 'text', // JSON 数组
        createdAt: 'unsigned',
        updatedAt: 'unsigned'
      }, {
        primary: 'id',
        unique: ['userId', 'name']
      })

      this.logger.info('数据库表初始化成功')
    } catch (error) {
      this.logger.error('数据库初始化失败', error)
      throw error
    }
  }

  /**
   * 保存对话历史
   */
  async saveConversation(record: ConversationRecord): Promise<void> {
    try {
      const existing = await this.ctx.database.get('qwen_conversation_history', {
        sessionId: record.sessionId
      })

      if (existing.length > 0) {
        // 更新现有记录
        await this.ctx.database.set('qwen_conversation_history', {
          sessionId: record.sessionId
        }, {
          messages: JSON.stringify(record.messages),
          totalTokens: record.totalTokens,
          messageCount: record.messageCount,
          updatedAt: Date.now()
        })
      } else {
        // 创建新记录
        await this.ctx.database.create('qwen_conversation_history', {
          sessionId: record.sessionId,
          userId: record.userId,
          persona: record.persona,
          messages: JSON.stringify(record.messages),
          totalTokens: record.totalTokens,
          messageCount: record.messageCount,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      }

      this.logger.debug('对话历史已保存', { sessionId: record.sessionId })
    } catch (error) {
      this.logger.error('保存对话历史失败', error)
      throw error
    }
  }

  /**
   * 加载对话历史
   */
  async loadConversation(sessionId: string): Promise<ConversationRecord | null> {
    try {
      const records = await this.ctx.database.get('qwen_conversation_history', {
        sessionId
      })

      if (records.length === 0) {
        return null
      }

      const record = records[0]
      return {
        id: record.id,
        sessionId: record.sessionId,
        userId: record.userId,
        persona: record.persona,
        messages: JSON.parse(record.messages),
        totalTokens: record.totalTokens,
        messageCount: record.messageCount,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }
    } catch (error) {
      this.logger.error('加载对话历史失败', error)
      return null
    }
  }

  /**
   * 删除对话历史
   */
  async deleteConversation(sessionId: string): Promise<void> {
    try {
      await this.ctx.database.remove('qwen_conversation_history', {
        sessionId
      })

      this.logger.debug('对话历史已删除', { sessionId })
    } catch (error) {
      this.logger.error('删除对话历史失败', error)
      throw error
    }
  }

  /**
   * 清理过期对话（7天以上未更新）
   */
  async cleanupExpiredConversations(retentionDays: number = 7): Promise<number> {
    try {
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000)

      const records = await this.ctx.database.get('qwen_conversation_history', {
        updatedAt: { $lt: cutoffTime }
      })

      if (records.length === 0) {
        return 0
      }

      await this.ctx.database.remove('qwen_conversation_history', {
        updatedAt: { $lt: cutoffTime }
      })

      this.logger.info(`清理了 ${records.length} 个过期对话`)
      return records.length
    } catch (error) {
      this.logger.error('清理过期对话失败', error)
      return 0
    }
  }

  /**
   * 保存用户偏好
   */
  async saveUserPreference(userId: string, currentPersona: string, favoritePersonas: string[]): Promise<void> {
    try {
      const existing = await this.ctx.database.get('qwen_user_preferences', {
        userId
      })

      if (existing.length > 0) {
        await this.ctx.database.set('qwen_user_preferences', {
          userId
        }, {
          currentPersona,
          favoritePersonas: JSON.stringify(favoritePersonas),
          updatedAt: Date.now()
        })
      } else {
        await this.ctx.database.create('qwen_user_preferences', {
          userId,
          currentPersona,
          favoritePersonas: JSON.stringify(favoritePersonas),
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      }

      this.logger.debug('用户偏好已保存', { userId })
    } catch (error) {
      this.logger.error('保存用户偏好失败', error)
      throw error
    }
  }

  /**
   * 加载用户偏好
   */
  async loadUserPreference(userId: string): Promise<{ currentPersona: string; favoritePersonas: string[] } | null> {
    try {
      const records = await this.ctx.database.get('qwen_user_preferences', {
        userId
      })

      if (records.length === 0) {
        return null
      }

      const record = records[0]
      return {
        currentPersona: record.currentPersona,
        favoritePersonas: JSON.parse(record.favoritePersonas || '[]')
      }
    } catch (error) {
      this.logger.error('加载用户偏好失败', error)
      return null
    }
  }

  /**
   * 保存自定义人设
   */
  async saveCustomPersona(userId: string, persona: any): Promise<void> {
    try {
      const existing = await this.ctx.database.get('qwen_custom_personas', {
        userId,
        name: persona.name
      })

      if (existing.length > 0) {
        await this.ctx.database.set('qwen_custom_personas', {
          userId,
          name: persona.name
        }, {
          description: persona.description,
          systemPrompt: persona.systemPrompt,
          temperature: persona.temperature,
          maxTokens: persona.maxTokens,
          greeting: persona.greeting,
          personalityTraits: JSON.stringify(persona.personalityTraits),
          updatedAt: Date.now()
        })
      } else {
        await this.ctx.database.create('qwen_custom_personas', {
          userId,
          name: persona.name,
          description: persona.description,
          systemPrompt: persona.systemPrompt,
          temperature: persona.temperature,
          maxTokens: persona.maxTokens,
          greeting: persona.greeting,
          personalityTraits: JSON.stringify(persona.personalityTraits),
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      }

      this.logger.debug('自定义人设已保存', { userId, name: persona.name })
    } catch (error) {
      this.logger.error('保存自定义人设失败', error)
      throw error
    }
  }

  /**
   * 加载用户的自定义人设
   */
  async loadCustomPersonas(userId: string): Promise<any[]> {
    try {
      const records = await this.ctx.database.get('qwen_custom_personas', {
        userId
      })

      return records.map(record => ({
        name: record.name,
        description: record.description,
        systemPrompt: record.systemPrompt,
        temperature: record.temperature,
        maxTokens: record.maxTokens,
        greeting: record.greeting,
        personalityTraits: JSON.parse(record.personalityTraits || '[]')
      }))
    } catch (error) {
      this.logger.error('加载自定义人设失败', error)
      return []
    }
  }

  /**
   * 删除自定义人设
   */
  async deleteCustomPersona(userId: string, name: string): Promise<void> {
    try {
      await this.ctx.database.remove('qwen_custom_personas', {
        userId,
        name
      })

      this.logger.debug('自定义人设已删除', { userId, name })
    } catch (error) {
      this.logger.error('删除自定义人设失败', error)
      throw error
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getStatistics(): Promise<{
    conversationCount: number
    userCount: number
    customPersonaCount: number
  }> {
    try {
      const conversations = await this.ctx.database.get('qwen_conversation_history', {})
      const users = await this.ctx.database.get('qwen_user_preferences', {})
      const personas = await this.ctx.database.get('qwen_custom_personas', {})

      return {
        conversationCount: conversations.length,
        userCount: users.length,
        customPersonaCount: personas.length
      }
    } catch (error) {
      this.logger.error('获取数据库统计失败', error)
      return {
        conversationCount: 0,
        userCount: 0,
        customPersonaCount: 0
      }
    }
  }
}
