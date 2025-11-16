/**
 * 对话管理器
 * 负责管理对话上下文、消息历史和 token 计数
 */

import { ChatMessage, ConversationContext, EnhancedConfig } from '../types'

export class ConversationManager {
  /** 对话上下文存储 (sessionId -> context) */
  private conversations: Map<string, ConversationContext> = new Map()

  constructor(private config: EnhancedConfig) {}

  /**
   * 获取或创建对话上下文
   * @param sessionId 会话 ID
   * @returns 对话上下文
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
   * @param sessionId 会话 ID
   * @param message 消息内容
   */
  addMessage(sessionId: string, message: ChatMessage): void {
    const context = this.getConversation(sessionId)

    // 添加消息并计算 token 数
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
   * @param sessionId 会话 ID
   */
  clearHistory(sessionId: string): void {
    const context = this.getConversation(sessionId)
    context.messages = []
    context.updatedAt = Date.now()
  }

  /**
   * 设置对话人设
   * @param sessionId 会话 ID
   * @param personaName 人设名称
   */
  setPersona(sessionId: string, personaName: string): void {
    const context = this.getConversation(sessionId)
    context.persona = personaName
    context.updatedAt = Date.now()
  }

  /**
   * 获取对话人设
   * @param sessionId 会话 ID
   * @returns 人设名称
   */
  getPersona(sessionId: string): string {
    const context = this.getConversation(sessionId)
    return context.persona
  }

  /**
   * 构建完整的上下文消息序列
   * @param sessionId 会话 ID
   * @param systemPrompt 系统提示词
   * @param userMessage 用户消息
   * @returns 消息序列
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
   * @param messages 消息列表
   * @param maxTokens 最大 token 数
   * @returns 截断后的消息列表
   */
  private truncateMessages(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
    let totalTokens = 0
    const result: ChatMessage[] = []

    // 从最新消息开始添加，确保系统提示和最新消息优先保留
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      const tokens = message.tokens || this.estimateTokens(message.content)

      // 保留系统消息，即使超过限制
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
   * 简单估算：中文大致按 2 个 token 一个汉字，英文按 1.3 个 token 一个单词
   * @param text 文本内容
   * @returns 估算的 token 数
   */
  private estimateTokens(text: string): number {
    // 匹配中文字符
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    // 匹配英文单词
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    // 其他字符按 0.5 token 计算
    const otherChars = text.length - chineseChars - englishWords

    return Math.ceil(chineseChars * 2 + englishWords * 1.3 + otherChars * 0.5)
  }

  /**
   * 获取对话的总 token 数
   * @param sessionId 会话 ID
   * @returns 总 token 数
   */
  getConversationTokens(sessionId: string): number {
    const context = this.getConversation(sessionId)
    return context.messages.reduce((total, msg) => {
      return total + (msg.tokens || this.estimateTokens(msg.content))
    }, 0)
  }

  /**
   * 获取对话消息数
   * @param sessionId 会话 ID
   * @returns 消息数
   */
  getMessageCount(sessionId: string): number {
    const context = this.getConversation(sessionId)
    return context.messages.length
  }

  /**
   * 获取对话轮数（用户消息数）
   * @param sessionId 会话 ID
   * @returns 对话轮数
   */
  getConversationRounds(sessionId: string): number {
    const context = this.getConversation(sessionId)
    return Math.floor(context.messages.filter(m => m.role === 'user').length)
  }

  /**
   * 清理过期的对话
   * @returns 清理的对话数
   */
  cleanupExpiredConversations(): number {
    const now = Date.now()
    const timeout = this.config.contextTimeout || 3600000
    let count = 0

    for (const [sessionId, context] of this.conversations.entries()) {
      if (now - context.updatedAt > timeout) {
        this.conversations.delete(sessionId)
        count++
      }
    }

    return count
  }

  /**
   * 删除指定对话
   * @param sessionId 会话 ID
   * @returns 是否删除成功
   */
  deleteConversation(sessionId: string): boolean {
    return this.conversations.delete(sessionId)
  }

  /**
   * 获取所有对话数
   * @returns 对话数
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
   * 获取对话统计信息
   * @param sessionId 会话 ID
   * @returns 统计信息
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
}
