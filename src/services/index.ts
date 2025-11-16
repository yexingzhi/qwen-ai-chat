/**
 * 服务模块导出
 */

import { Logger } from 'koishi'
import { TextToImageService } from './text-to-image'
import { ImageEditService } from './image-edit'
import { TextToVideoService } from './text-to-video'
import { TranslateService } from './translate'
import { PersonaManager } from './persona-manager'
import { ConversationManager } from './conversation-manager'
import { GroupSessionManager } from './group-session-manager'
import { EnhancedConfig, PluginConfig } from '../types'

export { TextToImageService, IMAGE_SIZES, IMAGE_STYLES } from './text-to-image'
export { ImageEditService, EDIT_ACTIONS } from './image-edit'
export { TextToVideoService, VIDEO_DURATIONS, VIDEO_RESOLUTIONS } from './text-to-video'
export { TranslateService, SUPPORTED_LANGUAGES, TRANSLATE_QUALITIES } from './translate'
export { PersonaManager } from './persona-manager'
export { ConversationManager } from './conversation-manager'
export { ConversationManagerWithDB } from './conversation-manager-db'
export { GroupSessionManager, type GroupSessionConfig, type GroupMessage, type GroupConversationContext } from './group-session-manager'

/**
 * 统一的服务接口定义
 */
export interface QwenAIServices {
  personaManager: PersonaManager
  conversationManager: ConversationManager
  groupSessionManager: GroupSessionManager
  textToImageService: TextToImageService
  imageEditService: ImageEditService
  textToVideoService: TextToVideoService
  translateService: TranslateService
}

/**
 * 服务工厂函数 - 统一创建所有服务
 */
export function createServices(
  apiKey: string,
  region: string,
  personaVersion: 'simple' | 'complex',
  enhancedConfig: EnhancedConfig,
  logger?: Logger
): QwenAIServices {
  return {
    personaManager: new PersonaManager(enhancedConfig, personaVersion, logger),
    conversationManager: new ConversationManager(enhancedConfig, logger),
    groupSessionManager: new GroupSessionManager(enhancedConfig, logger),
    textToImageService: new TextToImageService(apiKey, region, logger),
    imageEditService: new ImageEditService(apiKey, region, logger),
    textToVideoService: new TextToVideoService(apiKey, region, logger),
    translateService: new TranslateService(apiKey, region, logger),
  }
}
