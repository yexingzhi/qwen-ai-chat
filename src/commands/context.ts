/**
 * 对话上下文管理命令
 * 符合 Koishi 最佳实践标准
 */

import { Context } from 'koishi'
import { ConversationManager } from '../services/conversation-manager'
import { PersonaManager } from '../services/persona-manager'
import { EnhancedConfig } from '../types'

type Config = EnhancedConfig

export function registerContextCommands(
  ctx: Context,
  conversationManager: ConversationManager,
  personaManager: PersonaManager,
  config: Config
): void {
  // 使用 Koishi 的 Logger
  const logger = ctx.logger('context-commands')

  // 检查功能是否启用
  if (!config.enableContext) {
    logger.info('对话上下文功能已禁用，跳过注册上下文命令')
    return
  }

  logger.info('注册对话上下文命令')

  // 清除对话历史命令
  ctx.command('context-clear / 清除对话', '清除对话历史 / Clear conversation history')
    .userFields(['authority'])
    .action(({ session }) => {
      logger.debug('清除对话历史命令被调用', { userId: session?.userId })

      if (!session?.userId) {
        logger.warn('无法获取会话信息')
        return '❌ 无法获取会话信息 / Failed to get session info'
      }

      // 权限检查：任何用户都可以清除自己的对话历史
      // 但如果要清除他人的历史，需要至少 1 级权限
      if (session.user?.authority < 1) {
        logger.warn('用户权限不足', { userId: session.userId, authority: session.user?.authority })
        return '❌ 权限不足 / Permission denied'
      }

      const oldPersona = conversationManager.getPersona(session.userId)
      conversationManager.clearHistory(session.userId)
      
      logger.info('用户清除对话历史', { userId: session.userId, persona: oldPersona })
      return '✅ 对话历史已清除 / Conversation history cleared'
    })

  // 上下文信息命令
  ctx.command('context-info / 上下文信息', '查看上下文信息 / View context information')
    .action(({ session }) => {
      logger.debug('上下文信息命令被调用', { userId: session?.userId })

      if (!session?.userId) {
        logger.warn('无法获取会话信息')
        return '❌ 无法获取会话信息 / Failed to get session info'
      }

      const stats = conversationManager.getConversationStats(session.userId)
      const persona = personaManager.getCurrentPersona(session.userId)

      logger.info('用户查看上下文信息', { userId: session.userId, persona: persona.name })

      return `📊 上下文信息 / Context Information:
🎭 当前人设 / Current Persona: **${persona.description}** (${persona.name})
💬 对话轮数 / Rounds: ${stats.rounds}
📝 消息数 / Messages: ${stats.messageCount}
🔥 总 Token / Total Tokens: ${stats.totalTokens}
⏰ 创建时间 / Created: ${stats.createdAt.toLocaleString()}
🔄 最后更新 / Last Updated: ${stats.updatedAt.toLocaleString()}`
    })

  // 对话统计命令
  ctx.command('context-stats / 对话统计', '查看对话统计 / View conversation statistics')
    .action(({ session }) => {
      logger.debug('对话统计命令被调用', { userId: session?.userId })

      if (!session?.userId) {
        logger.warn('无法获取会话信息')
        return '❌ 无法获取会话信息 / Failed to get session info'
      }

      const stats = conversationManager.getConversationStats(session.userId)
      const avgTokensPerMessage = stats.messageCount > 0 ? Math.round(stats.totalTokens / stats.messageCount) : 0
      const durationSeconds = Math.round((stats.updatedAt.getTime() - stats.createdAt.getTime()) / 1000)

      logger.info('用户查看对话统计', { userId: session.userId, rounds: stats.rounds, messages: stats.messageCount })

      return `📈 对话统计 / Conversation Statistics:
💬 总对话轮数 / Total Rounds: ${stats.rounds}
📝 总消息数 / Total Messages: ${stats.messageCount}
🔥 总 Token 数 / Total Tokens: ${stats.totalTokens}
📊 平均 Token/消息 / Avg Tokens/Message: ${avgTokensPerMessage}
⏱️ 对话时长 / Duration: ${durationSeconds}秒 / seconds`
    })
}
