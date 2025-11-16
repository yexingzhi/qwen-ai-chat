/**
 * 地域管理命令
 * 符合 Koishi 最佳实践标准
 */

import { Context } from 'koishi'

export function registerRegionCommands(
  ctx: Context,
  config: any,
  onServiceUpdate: () => void
): void {
  const logger = ctx.logger('region-commands')

  logger.info('注册地域管理命令')

  // 地域主命令
  const region = ctx.command('region / 地域', '地域管理 / Region management')
    .alias('r')

  // 查看当前地域
  region.subcommand('current / 当前', '查看当前地域 / View current region')
    .action(({ session }) => {
      logger.debug('查看当前地域命令被调用', { userId: session?.userId })

      const regionName = config.region === 'singapore' ? '新加坡 / Singapore' : '北京 / Beijing'
      logger.info('用户查看当前地域', { userId: session?.userId, region: config.region })
      return `📍 当前地域 / Current Region: ${regionName} (${config.region})`
    })

  // 切换地域
  region.subcommand('switch / 切换 <region:string>', '切换地域 / Switch region')
    .userFields(['authority'])
    .action(({ session }, regionInput: string) => {
      logger.debug('切换地域命令被调用', { userId: session?.userId, region: regionInput })

      if (!session?.user?.authority || session.user.authority < 1) {
        logger.warn('用户权限不足', { userId: session?.userId, authority: session.user?.authority })
        return '❌ 权限不足 / Permission denied'
      }

      if (!regionInput) {
        return `❌ 请指定地域 / Please specify region\n📍 支持的地域 / Supported regions: beijing (北京), singapore (新加坡)`
      }

      const validRegions = ['beijing', 'singapore', 'intl']
      if (!validRegions.includes(regionInput.toLowerCase())) {
        logger.warn('用户尝试切换不支持的地域', { userId: session?.userId, region: regionInput })
        return `❌ 不支持的地域 / Unsupported region: ${regionInput}\n📍 支持的地域 / Supported regions: beijing (北京), singapore (新加坡)`
      }

      const normalizedRegion = regionInput.toLowerCase() === 'intl' ? 'singapore' : regionInput.toLowerCase()
      config.region = normalizedRegion
      onServiceUpdate()

      const regionName = normalizedRegion === 'singapore' ? '新加坡 / Singapore' : '北京 / Beijing'
      logger.info('用户切换地域成功', { userId: session?.userId, region: normalizedRegion })
      return `✅ 已切换到地域 / Switched to: ${regionName} (${normalizedRegion})\n📍 所有服务已更新 / All services updated`
    })

  // 列出支持的地域
  region.subcommand('list / 列表', '列出支持的地域 / List supported regions')
    .action(({ session }) => {
      logger.debug('列出地域命令被调用', { userId: session?.userId })

      logger.info('用户查看支持的地域', { userId: session?.userId })
      return `📍 支持的地域 / Supported Regions:
• beijing (北京) - 中国大陆 / Mainland China
• singapore (新加坡) - 国际 / International`
    })
}
