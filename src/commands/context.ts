/**
 * 对话上下文管理命令
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
  // 清除对话历史命令
  ctx.command('context-clear', '清除对话历史')
    .action(({ session }) => {
      if (!session?.userId) return '❌ 无法获取会话信息'
      if (!config.enableContext) {
        return '❌ 对话上下文功能未启用'
      }

      conversationManager.clearHistory(session.userId)
      return '✅ 对话历史已清除'
    })

  // 上下文信息命令
  ctx.command('context-info', '查看上下文信息')
    .action(({ session }) => {
      if (!session?.userId) return '❌ 无法获取会话信息'
      if (!config.enableContext) {
        return '❌ 对话上下文功能未启用'
      }

      const stats = conversationManager.getConversationStats(session.userId)
      const persona = personaManager.getCurrentPersona(session.userId)

      return `📊 上下文信息:
🎭 当前人设: **${persona.description}** (${persona.name})
💬 对话轮数: ${stats.rounds}
📝 消息数: ${stats.messageCount}
🔥 总 Token: ${stats.totalTokens}
⏰ 创建时间: ${stats.createdAt.toLocaleString()}
🔄 最后更新: ${stats.updatedAt.toLocaleString()}`
    })

  // 对话统计命令
  ctx.command('context-stats', '查看对话统计')
    .action(({ session }) => {
      if (!session?.userId) return '❌ 无法获取会话信息'
      if (!config.enableContext) {
        return '❌ 对话上下文功能未启用'
      }

      const stats = conversationManager.getConversationStats(session.userId)
      const avgTokensPerMessage = stats.messageCount > 0 ? Math.round(stats.totalTokens / stats.messageCount) : 0

      return `📈 对话统计:
💬 总对话轮数: ${stats.rounds}
📝 总消息数: ${stats.messageCount}
🔥 总 Token 数: ${stats.totalTokens}
📊 平均 Token/消息: ${avgTokensPerMessage}
⏱️ 对话时长: ${Math.round((stats.updatedAt.getTime() - stats.createdAt.getTime()) / 1000)}秒`
    })
}
