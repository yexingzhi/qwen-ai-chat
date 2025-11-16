/**
 * 支持数据库持久化的对话管理器
 * 集成 Koishi 自带的数据库功能
 */

import { ChatMessage, ConversationContext, EnhancedConfig, ConversationRecord } from '../types'

export class ConversationManagerWithDB {
  /** 对话上下文存储 (sessionId -> context) */
  private conversations: Map<string, ConversationContext> = new Map()
  
  /** 数据库实例 */
  private database: any = null
  
  /** 清理定时器 */
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(
    private config: EnhancedConfig,
    database?: any
  ) {
    this.database = database || null
    
    // 如果启用数据库，初始化表
    if (this.config.enablePersistence && this.database) {
      this.initializeDatabase()
    }
    
    // 启动定期清理任务
    this.startCleanupTask()
  }

  /**
   * 初始化数据库表
   */
  private initializeDatabase(): void {
    if (!this.database) return

    try {
      // 创建对话记录表
      this.database.extend('conversation_history', {
        id: 'unsigned',
        sessionId: 'string',
        userId: 'string',
        persona: 'string',
        messages: 'text',
        totalTokens: 'unsigned',
        messageCount: 'unsigned',
        createdAt: 'unsigned',
        updatedAt: 'unsigned'
      }, {
        primary: 'id',
        unique: ['sessionId']
      })
    } catch (error) {
      console.error('[数据库] 初始化失败:', error)
    }
  }

  /**
   * 获取或创建对话上下文
   */
  getConversation(sessionId: string): ConversationContext {
    let context = this.conversations.get(sessionId)
    const now = Date.now()
    const timeout = this.config.contextTimeout || 3600000

    // 如果对话不存在或已过期，创建新对话
    if (!context || now - context.updatedAt > timeout) {
      context = {
        sessionId,
        messages: [],
        persona: this.config.defaultPersona || 'assistant',
        createdAt: now,
        updatedAt: now,
        maxHistoryLength: this.config.maxHistoryLength || 10
      }
      this.conversations.set(sessionId, context)
    }

    return context
  }

  /**
   * 添加消息到对话历史
   */
  addMessage(sessionId: string, message: ChatMessage): void {
    const context = this.getConversation(sessionId)

    const newMessage: ChatMessage = {
      ...message,
      timestamp: Date.now(),
      tokens: this.estimateTokens(message.content)
    }

    context.messages.push(newMessage)
    context.updatedAt = Date.now()

    // 限制历史消息长度
    const maxMessages = context.maxHistoryLength * 2
    if (context.messages.length > maxMessages) {
      context.messages = context.messages.slice(-maxMessages)
    }
  }

  /**
   * 清除对话历史
   */
  clearHistory(sessionId: string): void {
    const context = this.getConversation(sessionId)
    context.messages = []
    context.updatedAt = Date.now()
  }

  /**
   * 设置对话人设
   */
  setPersona(sessionId: string, personaName: string): void {
    const context = this.getConversation(sessionId)
    context.persona = personaName
    context.updatedAt = Date.now()
  }

  /**
   * 获取对话人设
   */
  getPersona(sessionId: string): string {
    const context = this.getConversation(sessionId)
    return context.persona
  }

  /**
   * 构建完整的上下文消息序列
   */
  buildContextMessages(
    sessionId: string,
    systemPrompt: string,
    userMessage: string
  ): ChatMessage[] {
    const context = this.getConversation(sessionId)
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
        timestamp: Date.now(),
        tokens: this.estimateTokens(systemPrompt)
      }
    ]

    // 添加历史消息（如果启用上下文）
    if (this.config.enableContext !== false) {
      messages.push(...context.messages)
    }

    // 添加当前用户消息
    messages.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
      tokens: this.estimateTokens(userMessage)
    })

    // 截断消息以符合 token 限制
    return this.truncateMessages(messages, this.config.maxContextTokens || 4000)
  }

  /**
   * 根据 token 限制截断消息
   */
  private truncateMessages(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
    let totalTokens = 0
    const result: ChatMessage[] = []

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      const tokens = message.tokens || this.estimateTokens(message.content)

      if (totalTokens + tokens > maxTokens && i > 0) {
        break
      }

      result.unshift(message)
      totalTokens += tokens
    }

    return result
  }

  /**
   * 估算文本的 token 数
   */
  private estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    const otherChars = text.length - chineseChars - englishWords

    return Math.ceil(chineseChars * 2 + englishWords * 1.3 + otherChars * 0.5)
  }

  /**
   * 获取对话的总 token 数
   */
  getConversationTokens(sessionId: string): number {
    const context = this.getConversation(sessionId)
    return context.messages.reduce((total, msg) => {
      return total + (msg.tokens || this.estimateTokens(msg.content))
    }, 0)
  }

  /**
   * 获取对话消息数
   */
  getMessageCount(sessionId: string): number {
    const context = this.getConversation(sessionId)
    return context.messages.length
  }

  /**
   * 获取对话轮数
   */
  getConversationRounds(sessionId: string): number {
    const context = this.getConversation(sessionId)
    return Math.floor(context.messages.filter(m => m.role === 'user').length)
  }

  /**
   * 获取对话统计信息
   */
  getConversationStats(sessionId: string): {
    messageCount: number
    rounds: number
    totalTokens: number
    createdAt: Date
    updatedAt: Date
    persona: string
  } {
    const context = this.getConversation(sessionId)
    const totalTokens = context.messages.reduce((total, msg) => {
      return total + (msg.tokens || this.estimateTokens(msg.content))
    }, 0)

    return {
      messageCount: context.messages.length,
      rounds: Math.floor(context.messages.filter(m => m.role === 'user').length),
      totalTokens,
      createdAt: new Date(context.createdAt),
      updatedAt: new Date(context.updatedAt),
      persona: context.persona
    }
  }

  /**
   * 保存对话到数据库
   */
  async saveConversationToDB(sessionId: string, userId: string): Promise<boolean> {
    if (!this.config.enablePersistence || !this.database) {
      return false
    }

    try {
      const context = this.getConversation(sessionId)
      const totalTokens = this.getConversationTokens(sessionId)

      const record: ConversationRecord = {
        sessionId,
        userId,
        persona: context.persona,
        messages: JSON.stringify(context.messages),
        totalTokens,
        messageCount: context.messages.length,
        createdAt: context.createdAt,
        updatedAt: context.updatedAt
      }

      // 检查是否已存在
      const existing = await this.database.get('conversation_history', { sessionId })

      if (existing) {
        // 更新现有记录
        await this.database.set('conversation_history', { sessionId }, record)
      } else {
        // 创建新记录
        await this.database.create('conversation_history', record)
      }

      return true
    } catch (error) {
      console.error('[数据库] 保存对话失败:', error)
      return false
    }
  }

  /**
   * 从数据库加载对话
   */
  async loadConversationFromDB(sessionId: string): Promise<boolean> {
    if (!this.config.enablePersistence || !this.database) {
      return false
    }

    try {
      const record = await this.database.get('conversation_history', { sessionId })

      if (record) {
        const context: ConversationContext = {
          sessionId,
          messages: JSON.parse(record.messages),
          persona: record.persona,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          maxHistoryLength: this.config.maxHistoryLength || 10
        }

        this.conversations.set(sessionId, context)
        return true
      }

      return false
    } catch (error) {
      console.error('[数据库] 加载对话失败:', error)
      return false
    }
  }

  /**
   * 删除数据库中的对话
   */
  async deleteConversationFromDB(sessionId: string): Promise<boolean> {
    if (!this.config.enablePersistence || !this.database) {
      return false
    }

    try {
      await this.database.remove('conversation_history', { sessionId })
      return true
    } catch (error) {
      console.error('[数据库] 删除对话失败:', error)
      return false
    }
  }

  /**
   * 清理过期的对话（内存和数据库）
   */
  async cleanupExpiredConversations(): Promise<number> {
    const now = Date.now()
    const retentionTime = this.config.sessionRetentionTime || (7 * 24 * 60 * 60 * 1000) // 默认 7 天
    let count = 0

    // 清理内存中的过期对话
    for (const [sessionId, context] of this.conversations.entries()) {
      if (now - context.updatedAt > retentionTime) {
        this.conversations.delete(sessionId)
        count++
      }
    }

    // 清理数据库中的过期对话
    if (this.config.enablePersistence && this.database) {
      try {
        const expiredTime = now - retentionTime
        const result = await this.database.remove('conversation_history', {
          updatedAt: { $lt: expiredTime }
        })
        count += result
      } catch (error) {
        console.error('[数据库] 清理过期对话失败:', error)
      }
    }

    return count
  }

  /**
   * 启动定期清理任务
   */
  private startCleanupTask(): void {
    const interval = this.config.cleanupInterval || 3600000 // 默认 1 小时

    this.cleanupInterval = setInterval(async () => {
      const cleaned = await this.cleanupExpiredConversations()
      if (cleaned > 0) {
        console.log(`[清理] 清理了 ${cleaned} 个过期对话`)
      }
    }, interval)
  }

  /**
   * 停止清理任务
   */
  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * 删除指定对话
   */
  deleteConversation(sessionId: string): boolean {
    return this.conversations.delete(sessionId)
  }

  /**
   * 获取所有对话数
   */
  getConversationCount(): number {
    return this.conversations.size
  }

  /**
   * 清除所有对话
   */
  clearAllConversations(): void {
    this.conversations.clear()
  }

  /**
   * 获取数据库中的所有对话数
   */
  async getDBConversationCount(): Promise<number> {
    if (!this.config.enablePersistence || !this.database) {
      return 0
    }

    try {
      const records = await this.database.get('conversation_history')
      return records.length
    } catch (error) {
      console.error('[数据库] 获取对话数失败:', error)
      return 0
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stopCleanupTask()
    this.conversations.clear()
  }
}
