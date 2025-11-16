/**
 * 配置管理命令
 * 符合 Koishi 最佳实践标准
 */

import { Context } from 'koishi'
import { PluginConfig } from '../types'
import { formatConfigInfo } from '../utils'

export function registerConfigCommands(
  ctx: Context,
  pluginConfig: PluginConfig
): void {
  const logger = ctx.logger('config-commands')

  logger.info('注册配置管理命令')

  // 配置主命令
  const config = ctx.command('config / 配置', '配置管理 / Configuration management')
    .alias('cfg')

  // 查看配置
  config.subcommand('view / 查看', '查看当前配置 / View current configuration')
    .action(({ session }) => {
      logger.debug('查看配置命令被调用', { userId: session?.userId })

      logger.info('用户查看配置', { userId: session?.userId })
      return formatConfigInfo(pluginConfig)
    })

  // 查看功能状态
  config.subcommand('status / 状态', '查看功能启用状态 / View feature status')
    .action(({ session }) => {
      logger.debug('查看功能状态命令被调用', { userId: session?.userId })

      const status = `⚙️ 功能启用状态 / Feature Status:
• 文生图 / Text-to-Image: ${pluginConfig.enableTextToImage ? '✅ 启用' : '❌ 禁用'} / ${pluginConfig.enableTextToImage ? 'Enabled' : 'Disabled'}
• 图片编辑 / Image Editing: ${pluginConfig.enableImageEdit ? '✅ 启用' : '❌ 禁用'} / ${pluginConfig.enableImageEdit ? 'Enabled' : 'Disabled'}
• 文生视频 / Text-to-Video: ${pluginConfig.enableTextToVideo ? '✅ 启用' : '❌ 禁用'} / ${pluginConfig.enableTextToVideo ? 'Enabled' : 'Disabled'}
• 翻译 / Translation: ${pluginConfig.enableTranslate ? '✅ 启用' : '❌ 禁用'} / ${pluginConfig.enableTranslate ? 'Enabled' : 'Disabled'}`

      logger.info('用户查看功能状态', { userId: session?.userId })
      return status
    })

  // 查看模型配置
  config.subcommand('models / 模型', '查看模型配置 / View model configuration')
    .action(({ session }) => {
      logger.debug('查看模型配置命令被调用', { userId: session?.userId })

      const models = pluginConfig.models
      if (models.length === 0) {
        logger.warn('没有配置任何模型', { userId: session?.userId })
        return '❌ 没有配置任何模型 / No models configured'
      }

      const modelList = models
        .map(m => `• ${m.name}: ${m.model} (${m.description || '无描述'})`)
        .join('\n')

      logger.info('用户查看模型配置', { userId: session?.userId, count: models.length })
      return `📦 模型配置 / Model Configuration:\n${modelList}`
    })
}
