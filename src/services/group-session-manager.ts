/**
 * 群组会话管理器
 * 负责管理群组级别的对话上下文和消息历史
 */

import { Logger } from 'koishi'
import { ChatMessage, ConversationContext, EnhancedConfig } from '../types'

/**
 * 群组会话配置
 */
export interface GroupSessionConfig {
  /** 群组 ID */
  groupId: string
  /** 群组名称 */
  groupName?: string
  /** 群组人设 */
  persona: string
  /** 是否启用群组共享上下文 */
  enableSharedContext: boolean
  /** 最大成员数 */
  maxMembers: number
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
}

/**
 * 群组消息记录
 */
export interface GroupMessage extends ChatMessage {
  /** 发送者 ID */
  senderId: string
  /** 发送者名称 */
  senderName?: string
}

/**
 * 群组会话上下文
 */
export interface GroupConversationContext extends ConversationContext {
  /** 群组 ID */
  groupId: string
  /** 群组配置 */
  config: GroupSessionConfig
  /** 成员列表 */
  members: Set<string>
  /** 群组消息（包含发送者信息） */
  groupMessages: GroupMessage[]
}

/**
 * 群组会话管理器
 */
export class GroupSessionManager {
  /** 群组会话存储 (groupId -> context) */
  private groupSessions: Map<string, GroupConversationContext> = new Map()
  
  /** 用户所在群组映射 (userId -> groupIds) */
  private userGroupMap: Map<string, Set<string>> = new Map()

  constructor(private config: EnhancedConfig, private logger?: Logger) {}

  /**
   * 日志辅助方法
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (this.logger) {
      this.logger[level](`[GroupSessionManager] ${message}`)
    }
  }

  /**
   * 创建或获取群组会话
   */
  getGroupSession(groupId: string, groupName?: string): GroupConversationContext {
    let context = this.groupSessions.get(groupId)
    const now = Date.now()
    const timeout = this.config.contextTimeout || 3600000

    // 如果会话不存在或已过期，创建新会话
    if (!context || now - context.updatedAt > timeout) {
      context = {
        groupId,
        sessionId: `group_${groupId}`,
        messages: [],
        groupMessages: [],
        persona: this.config.defaultPersona || 'assistant',
        createdAt: now,
        updatedAt: now,
        maxHistoryLength: this.config.maxHistoryLength || 10,
        members: new Set(),
        config: {
          groupId,
          groupName: groupName || `Group_${groupId}`,
          persona: this.config.defaultPersona || 'assistant',
          enableSharedContext: true,
          maxMembers: 100,
          createdAt: now,
          updatedAt: now
        }
      }
      this.groupSessions.set(groupId, context)
      this.log(`创建新群组会话: ${groupId}`)
    }

    return context
  }

  /**
   * 添加成员到群组
   */
  addMember(groupId: string, userId: string): void {
    const context = this.getGroupSession(groupId)
    
    if (context.members.size >= context.config.maxMembers) {
      this.log(`群组 ${groupId} 已达到最大成员数`, 'warn')
      return
    }

    context.members.add(userId)
    context.updatedAt = Date.now()

    // 更新用户群组映射
    if (!this.userGroupMap.has(userId)) {
      this.userGroupMap.set(userId, new Set())
    }
    this.userGroupMap.get(userId)!.add(groupId)

    this.log(`用户 ${userId} 加入群组 ${groupId}`)
  }

  /**
   * 移除成员
   */
  removeMember(groupId: string, userId: string): void {
    const context = this.groupSessions.get(groupId)
    if (!context) return

    context.members.delete(userId)
    context.updatedAt = Date.now()

    // 更新用户群组映射
    const userGroups = this.userGroupMap.get(userId)
    if (userGroups) {
      userGroups.delete(groupId)
      if (userGroups.size === 0) {
        this.userGroupMap.delete(userId)
      }
    }

    this.log(`用户 ${userId} 离开群组 ${groupId}`)
  }

  /**
   * 添加群组消息
   */
  addGroupMessage(
    groupId: string,
    message: ChatMessage,
    senderId: string,
    senderName?: string
  ): void {
    const context = this.getGroupSession(groupId)

    const groupMessage: GroupMessage = {
      ...message,
      senderId,
      senderName: senderName || senderId,
      timestamp: Date.now(),
      tokens: this.estimateTokens(message.content)
    }

    // 添加到通用消息列表
    context.messages.push(groupMessage)
    // 添加到群组消息列表
    context.groupMessages.push(groupMessage)
    context.updatedAt = Date.now()

    // 限制历史消息长度
    const maxMessages = context.maxHistoryLength * 2
    if (context.messages.length > maxMessages) {
      context.messages = context.messages.slice(-maxMessages)
      context.groupMessages = context.groupMessages.slice(-maxMessages)
    }
  }

  /**
   * 清除群组对话历史
   */
  clearGroupHistory(groupId: string): void {
    const context = this.groupSessions.get(groupId)
    if (!context) return

    context.messages = []
    context.groupMessages = []
    context.updatedAt = Date.now()
    this.log(`清除群组 ${groupId} 的对话历史`)
  }

  /**
   * 设置群组人设
   */
  setGroupPersona(groupId: string, personaName: string): void {
    const context = this.getGroupSession(groupId)
    context.persona = personaName
    context.config.persona = personaName
    context.updatedAt = Date.now()
    this.log(`群组 ${groupId} 人设已设置为 ${personaName}`)
  }

  /**
   * 获取群组人设
   */
  getGroupPersona(groupId: string): string {
    const context = this.getGroupSession(groupId)
    return context.persona
  }

  /**
   * 构建群组上下文消息序列
   */
  buildGroupContextMessages(
    groupId: string,
    systemPrompt: string,
    userMessage: string
  ): ChatMessage[] {
    const context = this.getGroupSession(groupId)
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
        timestamp: Date.now(),
        tokens: this.estimateTokens(systemPrompt)
      }
    ]

    // 添加历史消息（如果启用上下文）
    if (this.config.enableContext !== false && context.config.enableSharedContext) {
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
   * 获取群组消息总 token 数
   */
  getGroupConversationTokens(groupId: string): number {
    const context = this.groupSessions.get(groupId)
    if (!context) return 0

    return context.messages.reduce((total, msg) => {
      return total + (msg.tokens || this.estimateTokens(msg.content))
    }, 0)
  }

  /**
   * 获取群组消息数
   */
  getGroupMessageCount(groupId: string): number {
    const context = this.groupSessions.get(groupId)
    if (!context) return 0

    return context.messages.length
  }

  /**
   * 获取群组成员数
   */
  getGroupMemberCount(groupId: string): number {
    const context = this.groupSessions.get(groupId)
    if (!context) return 0

    return context.members.size
  }

  /**
   * 获取群组成员列表
   */
  getGroupMembers(groupId: string): string[] {
    const context = this.groupSessions.get(groupId)
    if (!context) return []

    return Array.from(context.members)
  }

  /**
   * 获取用户所在的所有群组
   */
  getUserGroups(userId: string): string[] {
    const groups = this.userGroupMap.get(userId)
    return groups ? Array.from(groups) : []
  }

  /**
   * 获取群组统计信息
   */
  getGroupStats(groupId: string): {
    messageCount: number
    memberCount: number
    totalTokens: number
    createdAt: Date
    updatedAt: Date
    persona: string
    enableSharedContext: boolean
  } {
    const context = this.getGroupSession(groupId)
    const totalTokens = this.getGroupConversationTokens(groupId)

    return {
      messageCount: context.messages.length,
      memberCount: context.members.size,
      totalTokens,
      createdAt: new Date(context.config.createdAt),
      updatedAt: new Date(context.config.updatedAt),
      persona: context.persona,
      enableSharedContext: context.config.enableSharedContext
    }
  }

  /**
   * 获取最近的群组消息
   */
  getRecentGroupMessages(groupId: string, limit: number = 10): GroupMessage[] {
    const context = this.groupSessions.get(groupId)
    if (!context) return []

    return context.groupMessages.slice(-limit)
  }

  /**
   * 删除群组会话
   */
  deleteGroupSession(groupId: string): boolean {
    const context = this.groupSessions.get(groupId)
    if (!context) return false

    // 清理用户群组映射
    for (const userId of context.members) {
      const userGroups = this.userGroupMap.get(userId)
      if (userGroups) {
        userGroups.delete(groupId)
        if (userGroups.size === 0) {
          this.userGroupMap.delete(userId)
        }
      }
    }

    return this.groupSessions.delete(groupId)
  }

  /**
   * 获取所有群组数
   */
  getGroupCount(): number {
    return this.groupSessions.size
  }

  /**
   * 清除所有群组会话
   */
  clearAllGroupSessions(): void {
    this.groupSessions.clear()
    this.userGroupMap.clear()
  }

  /**
   * 清理过期的群组会话
   */
  cleanupExpiredGroupSessions(): number {
    const now = Date.now()
    const timeout = this.config.contextTimeout || 3600000
    let count = 0

    for (const [groupId, context] of this.groupSessions.entries()) {
      if (now - context.updatedAt > timeout) {
        this.deleteGroupSession(groupId)
        count++
      }
    }

    return count
  }

  /**
   * 启用/禁用群组共享上下文
   */
  setGroupSharedContext(groupId: string, enabled: boolean): void {
    const context = this.getGroupSession(groupId)
    context.config.enableSharedContext = enabled
    context.updatedAt = Date.now()
    this.log(`群组 ${groupId} 共享上下文已${enabled ? '启用' : '禁用'}`)
  }

  /**
   * 获取群组共享上下文状态
   */
  isGroupSharedContextEnabled(groupId: string): boolean {
    const context = this.groupSessions.get(groupId)
    return context?.config.enableSharedContext ?? true
  }
}
