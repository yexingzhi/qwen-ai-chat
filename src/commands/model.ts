/**
 * 模型管理命令
 * 符合 Koishi 最佳实践标准
 */

import { Context } from 'koishi'
import { ModelManager } from '../models'
import { ModelConfig } from '../types'
import { formatModelInfo } from '../utils'

export function registerModelCommands(
  ctx: Context,
  modelManager: ModelManager,
  config: any,
  createOpenAIClient: (model: ModelConfig) => any,
  onServiceUpdate: () => void
): void {
  const logger = ctx.logger('model-commands')

  logger.info('注册模型管理命令')

  // 模型主命令组
  const model = ctx.command('model / 模型', '模型管理 / Model management')
    .alias('m')

  // 列出所有模型
  model.subcommand('list / 列表', '列出所有模型 / List all models')
    .action(({ session }) => {
      logger.debug('列出模型命令被调用', { userId: session?.userId })

      const models = modelManager.getAllModels()
      if (models.length === 0) {
        logger.warn('没有配置任何模型')
        return '❌ 没有配置任何模型 / No models configured'
      }

      const list = modelManager.getModelListString()
      logger.info('用户查看模型列表', { userId: session?.userId, count: models.length })
      return `📋 可用模型 / Available Models:\n${list}`
    })

  // 查看当前模型
  model.subcommand('current / 当前', '查看当前模型 / View current model')
    .action(({ session }) => {
      logger.debug('查看当前模型命令被调用', { userId: session?.userId })

      const current = modelManager.getCurrentModel()
      if (!current) {
        logger.warn('没有可用的模型')
        return '❌ 没有可用的模型 / No models available'
      }

      logger.info('用户查看当前模型', { userId: session?.userId, model: current.name })
      return `📦 当前模型 / Current Model: ${formatModelInfo(current.name, current.description)}`
    })

  // 切换模型
  model.subcommand('switch / 切换 <name:string>', '切换模型 / Switch model')
    .action(({ session }, name: string) => {
      logger.debug('切换模型命令被调用', { userId: session?.userId, name })

      if (!name) {
        logger.warn('模型名称为空', { userId: session?.userId })
        return '❌ 请指定模型名称 / Please specify model name'
      }

      if (modelManager.setCurrentModel(name)) {
        const model = modelManager.getCurrentModel()
        createOpenAIClient(model!)
        onServiceUpdate()

        logger.info('用户切换模型成功', { userId: session?.userId, model: name })
        return `✅ 已切换到模型 / Switched to: ${formatModelInfo(name, model?.description)}`
      } else {
        logger.warn('用户尝试切换不存在的模型', { userId: session?.userId, name })
        return `❌ 模型 "${name}" 不存在 / Model not found`
      }
    })

  // 添加模型
  model.subcommand('add / 添加 <name:string> <apiKey:string> [modelName:string]', '添加模型 / Add model')
    .userFields(['authority'])
    .action(({ session }, name: string, apiKey: string, modelName?: string) => {
      logger.debug('添加模型命令被调用', { userId: session?.userId, name })

      if (!session?.user?.authority || session.user.authority < 1) {
        logger.warn('用户权限不足', { userId: session?.userId, authority: session.user?.authority })
        return '❌ 权限不足 / Permission denied'
      }

      if (!name || !apiKey) {
        logger.warn('参数不完整', { userId: session?.userId })
        return '❌ 请提供模型名称和 API Key / Please provide model name and API Key'
      }

      const newModel: ModelConfig = {
        name,
        model: modelName || name,
        baseURL: config.baseURL,
        apiKey,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        description: `自定义模型 / Custom - ${name}`
      }

      if (modelManager.addModel(newModel)) {
        logger.info('用户添加模型成功', { userId: session?.userId, name })
        return `✅ 已添加模型 / Added: ${formatModelInfo(name)}`
      } else {
        logger.warn('用户尝试添加已存在的模型', { userId: session?.userId, name })
        return `❌ 模型 "${name}" 已存在 / Model already exists`
      }
    })

  // 删除模型
  model.subcommand('remove / 删除 <name:string>', '删除模型 / Remove model')
    .userFields(['authority'])
    .action(({ session }, name: string) => {
      logger.debug('删除模型命令被调用', { userId: session?.userId, name })

      if (!session?.user?.authority || session.user.authority < 1) {
        logger.warn('用户权限不足', { userId: session?.userId, authority: session.user?.authority })
        return '❌ 权限不足 / Permission denied'
      }

      if (!name) {
        logger.warn('模型名称为空', { userId: session?.userId })
        return '❌ 请指定模型名称 / Please specify model name'
      }

      if (modelManager.removeModel(name)) {
        logger.info('用户删除模型成功', { userId: session?.userId, name })
        return `✅ 已删除模型 / Removed: ${name}`
      } else {
        logger.warn('用户尝试删除不存在或当前模型', { userId: session?.userId, name })
        return `❌ 无法删除模型 "${name}" / Cannot remove model (may be current or not exist)`
      }
    })
}
