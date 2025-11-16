/**
 * 人设管理命令
 * 符合 Koishi 最佳实践标准
 */

import { Context } from 'koishi'
import { PersonaManager } from '../services/persona-manager'
import { ConversationManager } from '../services/conversation-manager'
import { EnhancedConfig } from '../types'

type Config = EnhancedConfig

export function registerPersonaCommands(
  ctx: Context,
  personaManager: PersonaManager,
  conversationManager: ConversationManager,
  config: Config
): void {
  // 使用 Koishi 的 Logger
  const logger = ctx.logger('persona-commands')

  // 检查功能是否启用
  if (!config.enablePersonas) {
    logger.info('人设功能已禁用，跳过注册人设命令')
    return
  }

  logger.info('注册人设管理命令')

  // 人设列表命令
  ctx.command('persona-list / 人设列表', '查看所有人设 / View all personas')
    .action(({ session }) => {
      logger.debug('人设列表命令被调用', { userId: session?.userId })

      if (!session?.userId) {
        logger.warn('无法获取会话信息')
        return '❌ 无法获取会话信息 / Failed to get session info'
      }

      const personas = personaManager.getAllPersonas()
      if (personas.length === 0) {
        logger.warn('没有可用人设', { userId: session.userId })
        return '❌ 没有可用人设 / No personas available'
      }

      const list = personas
        .map(p => {
          const aliases = personaManager.getPersonaAliases(p.name)
          const aliasText = aliases.length > 1 ? `\n  别名 / Aliases: ${aliases.slice(1).join(', ')}` : ''
          return `• **${p.name}** - ${p.description}\n  性格 / Traits: ${p.personalityTraits.join('、')}${aliasText}`
        })
        .join('\n\n')

      logger.info('用户查看人设列表', { userId: session.userId, count: personas.length })
      return `🎭 可用人设 / Available Personas (共 ${personas.length} 个 / Total ${personas.length}):\n\n${list}`
    })

  // 切换人设命令
  ctx.command('persona-switch / 切换人设 <name:string>', '切换人设 / Switch persona')
    .action(({ session }, name) => {
      logger.debug('切换人设命令被调用', { userId: session?.userId, name })

      if (!session?.userId) {
        logger.warn('无法获取会话信息')
        return '❌ 无法获取会话信息 / Failed to get session info'
      }

      // 确保 name 不为空
      const personaName = String(name).trim()
      
      if (!personaName) {
        logger.warn('人设名称为空', { userId: session.userId })
        return '❌ 请指定人设名称 / Please specify persona name\n💡 例如 / Example: persona-switch catgirl'
      }

      // 直接尝试切换，switchPersona 会检查人设是否存在
      if (personaManager.switchPersona(session.userId, personaName)) {
        const persona = personaManager.getCurrentPersona(session.userId)
        // 清除历史以适应新人设
        conversationManager.clearHistory(session.userId)
        const aliases = personaManager.getPersonaAliases(persona.name)
        const aliasInfo = aliases.length > 1 ? `\n💡 别名 / Aliases: ${aliases.join(', ')}` : ''
        
        logger.info('用户切换人设成功', { userId: session.userId, persona: persona.name })
        return `✅ 已切换到 / Switched to: **${persona.description}** (${persona.name})${aliasInfo}\n\n${persona.greeting}`
      } else {
        logger.warn('用户尝试切换不存在的人设', { userId: session.userId, name: personaName })
        return `❌ 人设 "${personaName}" 不存在 / Persona not found\n\n💡 使用 / Use \`persona-list\` 或 \`人设列表\` 查看所有可用人设及其别名`
      }
    })

  // 当前人设命令
  ctx.command('persona-current / 当前人设', '查看当前人设 / View current persona')
    .action(({ session }) => {
      if (!session?.userId) return '❌ 无法获取会话信息 / Failed to get session info'
      if (!config.enablePersonas) {
        return '❌ 人设功能未启用 / Persona feature not enabled'
      }

      const persona = personaManager.getCurrentPersona(session.userId)
      const stats = conversationManager.getConversationStats(session.userId)

      return `🎭 当前人设 / Current Persona: **${persona.description}** (${persona.name})
🤖 性格特征 / Traits: ${persona.personalityTraits.join('、')}
💬 对话轮数 / Rounds: ${stats.rounds}
📊 消息数 / Messages: ${stats.messageCount}
🔥 总 Token / Total Tokens: ${stats.totalTokens}
⏰ 创建时间 / Created: ${stats.createdAt.toLocaleString()}`
    })

  // 人设详情命令
  ctx.command('persona-info / 人设详情 <name:string>', '查看人设详情 / View persona details')
    .action(({ session }, name) => {
      if (!session?.userId) return '❌ 无法获取会话信息 / Failed to get session info'
      if (!config.enablePersonas) {
        return '❌ 人设功能未启用 / Persona feature not enabled'
      }

      const personaName = String(name).trim()
      if (!personaName) {
        return '❌ 请指定人设名称 / Please specify persona name'
      }

      const persona = personaManager.getPersona(personaName)
      if (!persona) {
        return `❌ 人设 "${personaName}" 不存在 / Persona not found`
      }

      const aliases = personaManager.getPersonaAliases(persona.name)
      const aliasInfo = aliases.length > 1 ? `\n🔤 别名 / Aliases: ${aliases.join(', ')}` : ''

      return `📝 人设详情 / Persona Details: **${persona.description}** (${persona.name})${aliasInfo}

🤖 系统提示 / System Prompt:
\`\`\`
${persona.systemPrompt}
\`\`\`

⚙️ 配置参数 / Parameters:
• 创意度 / Temperature: ${persona.temperature}
• 最大输出 / Max Tokens: ${persona.maxTokens} tokens
• 性格特征 / Traits: ${persona.personalityTraits.join('、')}

👋 问候语 / Greeting:
> ${persona.greeting}${persona.avatar ? `\n\n🖼️ 头像 / Avatar: ${persona.avatar}` : ''}`
    })

  // 自定义人设功能（如果启用）
  if (config.enableCustomPersonas) {
    logger.info('注册自定义人设命令')

    // 创建自定义人设命令
    ctx.command('persona create / 创建人设 <name:string> <description:string>', '创建自定义人设 / Create custom persona')
      .userFields(['authority'])
      .option('prompt', '-p <prompt:text> 系统提示词 / System prompt')
      .option('temperature', '-t <temperature:number> 创意度 / Temperature (0-2)', { fallback: 0.7 })
      .option('maxTokens', '-m <maxTokens:number> 最大输出长度 / Max tokens', { fallback: 1000 })
      .option('greeting', '-g <greeting:string> 问候语 / Greeting')
      .option('traits', '-tr <traits:string> 性格特征 / Traits（用逗号分隔 / comma-separated）')
      .action(({ session, options }, name: string, description: string) => {
        logger.debug('创建人设命令被调用', { userId: session?.userId, name })

        if (!session?.userId) {
          logger.warn('无法获取会话信息')
          return '❌ 无法获取会话信息 / Failed to get session info'
        }

        // 权限检查：需要至少 1 级权限
        if (session.user?.authority < 1) {
          logger.warn('用户权限不足', { userId: session.userId, authority: session.user?.authority })
          return '❌ 权限不足，需要至少 1 级权限 / Permission denied, require authority level 1 or higher'
        }

        if (!name || !description) {
          logger.warn('参数不完整', { userId: session.userId, name, description })
          return '❌ 请指定人设名称和描述 / Please specify persona name and description'
        }

        // 验证参数
        const temperature = Math.max(0, Math.min(2, (options?.temperature as number) || 0.7))
        const maxTokens = Math.max(100, Math.min(4000, (options?.maxTokens as number) || 1000))

        const persona = {
          name,
          description,
          systemPrompt: (options?.prompt as string) || `你是一个${description}，请根据这个角色进行对话。`,
          temperature,
          maxTokens,
          greeting: (options?.greeting as string) || `你好，我是${description}！`,
          personalityTraits: (options?.traits as string)
            ? (options.traits as string).split(',').map(t => t.trim())
            : ['自定义 / Custom']
        }

        if (personaManager.addCustomPersona(persona)) {
          logger.info('用户创建自定义人设成功', { userId: session.userId, name, description })
          return `✅ 已创建自定义人设 / Created: **${description}** (${name})`
        } else {
          logger.warn('用户尝试创建已存在的人设', { userId: session.userId, name })
          return `❌ 人设 "${name}" 已存在 / Persona already exists`
        }
      })

    // 删除自定义人设命令
    ctx.command('persona remove / 删除人设 <name:string>', '删除自定义人设 / Remove custom persona')
      .userFields(['authority'])
      .action(({ session }, name: string) => {
        logger.debug('删除人设命令被调用', { userId: session?.userId, name })

        if (!session?.userId) {
          logger.warn('无法获取会话信息')
          return '❌ 无法获取会话信息 / Failed to get session info'
        }

        // 权限检查：需要至少 1 级权限
        if (session.user?.authority < 1) {
          logger.warn('用户权限不足', { userId: session.userId, authority: session.user?.authority })
          return '❌ 权限不足，需要至少 1 级权限 / Permission denied, require authority level 1 or higher'
        }

        if (!name) {
          logger.warn('人设名称为空', { userId: session.userId })
          return '❌ 请指定要删除的人设名称 / Please specify persona name to remove'
        }

        if (personaManager.removeCustomPersona(name)) {
          logger.info('用户删除自定义人设成功', { userId: session.userId, name })
          return `✅ 已删除自定义人设 / Removed: ${name}`
        } else {
          logger.warn('用户尝试删除不存在或系统人设', { userId: session.userId, name })
          return `❌ 无法删除人设 "${name}" / Cannot remove persona (may not exist or is system persona)`
        }
      })

    // 列出自定义人设命令
    ctx.command('persona custom / 自定义人设', '查看自定义人设 / View custom personas')
      .action(({ session }) => {
        if (!session?.userId) return '❌ 无法获取会话信息 / Failed to get session info'
        if (!config.enablePersonas) {
          return '❌ 人设功能未启用 / Persona feature not enabled'
        }

        const customPersonas = personaManager.getCustomPersonas()
        if (customPersonas.length === 0) {
          return '❌ 没有自定义人设 / No custom personas\n\n💡 使用 / Use `persona create` 或 `创建人设` 创建新人设'
        }

        const list = customPersonas
          .map(p => `• **${p.name}** - ${p.description}`)
          .join('\n')

        return `🎭 自定义人设 / Custom Personas (共 ${customPersonas.length} 个 / Total ${customPersonas.length}):\n\n${list}`
      })
  }
}
