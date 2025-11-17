# Koishi 千问 AI 聊天插件 / Koishi Qwen AI Chat Plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js->=14.0.0-green.svg)](https://nodejs.org/)
[![Koishi](https://img.shields.io/badge/Koishi->=4.18.0-blue.svg)](https://koishi.chat/)

一个功能强大的 Koishi 插件，集成了阿里云千问大模型的对话、图片生成、视频生成、图片编辑和翻译功能。支持完整的人设系统、对话上下文管理和中英文双语命令。

A powerful Koishi plugin that integrates Qwen AI model with chat, image generation, video generation, image editing, and translation features. Supports complete persona system, conversation context management, and bilingual Chinese-English commands.

---

## ✨ 主要功能 / Key Features

### 🤖 对话系统 / Chat System
- ✅ 与千问大模型进行自然对话
- ✅ 完整的对话上下文管理
- ✅ 自动 Token 估算和截断
- ✅ 对话历史自动过期清理
- ✅ 用户隔离的对话状态

### 🎭 人设系统 / Persona System
- ✅ 15 个内置人设（简易版）+ 15 个详细人设（复杂版）
- ✅ 支持中文别名识别（如"猫娘"、"女仆"等）
- ✅ 自定义人设创建和管理
- ✅ 人设切换时自动清除历史
- ✅ 完整的人设统计和管理

### 🖼️ 图片功能 / Image Features
- ✅ 文生图：根据描述生成图片
- ✅ 图片编辑：支持中文描述自动识别编辑操作
- ✅ 多种图片尺寸和风格支持
- ✅ 自动图片 URL 处理

### 🎬 视频功能 / Video Features
- ✅ 文生视频：根据描述生成视频
- ✅ 自动识别时长和分辨率
- ✅ 支持多种视频规格

### 🌍 翻译功能 / Translation Features
- ✅ 多语言翻译支持
- ✅ 自动目标语言识别
- ✅ 源语言指定选项

### 🌐 双语支持 / Bilingual Support
- ✅ 所有命令支持中英文别名
- ✅ 中英文错误提示
- ✅ 人设中文别名识别
- ✅ 完整的中英文文档

### 🔐 权限管理 / Permission Management
- ✅ 管理员账号系统
- ✅ 受保护的关键指令
- ✅ 灵活的权限配置
- ✅ 完整的权限日志

### 🧠 用户记忆系统 / User Memory System
- ✅ 用户偏好记录和管理
- ✅ 对话风格个性化（casual/professional/creative）
- ✅ 话题记忆和追踪
- ✅ 灵活的记忆片段存储
- ✅ 数据库持久化支持
- ✅ 自动过期清理机制

### 🔄 人设适配器 / Persona Adapter
- ✅ 多格式人设导入（Standard/JSON/YAML/Simple）
- ✅ 模板人设系统（Assistant/Creative/Professional）
- ✅ 自定义适配器扩展
- ✅ 灵活的人设转换和验证
- ✅ 自动格式识别

---

## 📦 安装 / Installation

### 前置要求 / Prerequisites
- Node.js >= 14.0.0
- Koishi >= 4.18.0
- 阿里云百炼 API Key

### 安装步骤 / Installation Steps

```bash
# 1. 克隆仓库 / Clone repository
git clone https://github.com/yexingzhi/koishi-plugin-qwen-ai-chat.git
cd koishi-plugin-qwen-ai-chat

# 2. 安装依赖 / Install dependencies
yarn install

# 3. 构建项目 / Build project
yarn build

# 4. 在 Koishi 中安装插件 / Install plugin in Koishi
# 在 Koishi 控制台中搜索并安装 "qwen-ai-chat"
```

---

## ⚙️ 配置 / Configuration

在 Koishi 控制台中配置以下参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `apiKey` | 阿里云百炼 API Key | - |
| `model` | 默认使用的模型 | qwen-plus |
| `baseURL` | API 基础 URL | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| `region` | API 地域 | beijing |
| `temperature` | 创意度 (0-2) | 0.7 |
| `maxTokens` | 最大输出 token 数 | 2000 |
| `personaVersion` | 人设版本 (simple/complex) | simple |
| `enableTextToImage` | 启用文生图 | true |
| `enableImageEdit` | 启用图片编辑 | true |
| `enableTextToVideo` | 启用文生视频 | true |
| `enableTranslate` | 启用翻译 | true |
| `adminUsers` | 管理员用户 ID（逗号分隔）| - |

---

## 🔐 权限管理 / Permission Management

### 管理员设置 / Admin Setup

在 Koishi 控制台中配置管理员用户，多个用户 ID 用逗号分隔：

```
管理员用户 ID（逗号分隔）: 123456,789012,345678
```

### 受保护的指令 / Protected Commands

以下指令仅管理员可以执行：

| 指令 | 功能 | 权限 |
|------|------|------|
| `qwen-region <region>` | 切换 API 地域 | 仅管理员 |
| `chat -r` / `ask -r` | 清除对话历史 | 仅管理员 |

### 权限检查示例 / Permission Check Example

```bash
# 普通用户尝试切换地域 - 被拒绝
chat 你好
# 返回: ❌ 权限不足，仅管理员可以切换地域

# 管理员切换地域 - 成功
qwen-region singapore
# 返回: ✅ 已切换到地域: 新加坡 (singapore)

# 普通用户清除历史 - 被拒绝
chat -r
# 返回: ❌ 权限不足，仅管理员可以清除对话历史

# 管理员清除历史 - 成功
chat -r
# 返回: ✅ 对话历史已重置
```

---

## 🧠 用户记忆系统 / User Memory System

### 功能说明 / Features

用户记忆系统可以记录和管理每个用户的个性化信息：

- **用户偏好** - 记录用户的兴趣和偏好
- **对话风格** - 三种风格选择：casual（随意）、professional（专业）、creative（创意）
- **话题管理** - 追踪用户常讨论的话题
- **记忆片段** - 灵活存储任意 Key-Value 数据
- **数据持久化** - 自动保存到数据库
- **自动清理** - 自动清理 30 天未更新的记忆

### 使用示例 / Example

```typescript
// 添加用户偏好
memoryManager.addPreference(userId, '喜欢编程')

// 设置对话风格
memoryManager.setConversationStyle(userId, 'professional')

// 添加话题
memoryManager.addTopic(userId, 'Python')

// 存储记忆片段
memoryManager.setMemoryFragment(userId, 'favorite_book', 'Clean Code')

// 获取用户记忆摘要
const summary = memoryManager.getMemorySummary(userId)
```

---

## 🔄 人设适配器 / Persona Adapter

### 支持的格式 / Supported Formats

系统支持 5 种人设适配器，可以灵活导入各种格式的人设：

| 适配器 | 格式 | 说明 |
|--------|------|------|
| **Standard** | PersonaConfig 对象 | 标准人设配置格式 |
| **JSON** | JSON 字符串 | 从 JSON 字符串解析 |
| **YAML** | YAML 字符串 | 从 YAML 字符串解析 |
| **Simple** | 简化对象 | 最少配置（仅需 name 和 description） |
| **Template** | 模板名称 | 使用预定义模板（Assistant/Creative/Professional） |

### 使用示例 / Example

```typescript
// 使用标准适配器
const persona1 = manager.adapt('standard', {
  name: 'Alice',
  description: '友好的助手',
  systemPrompt: '你是 Alice...',
  greeting: '你好！',
  temperature: 0.7,
  maxTokens: 1000
})

// 使用 JSON 适配器
const persona2 = manager.adapt('json', '{"name":"Bob","description":"..."}')

// 使用简化适配器
const persona3 = manager.adapt('simple', {
  name: 'Charlie',
  description: '创意写手'
})

// 使用模板适配器
const persona4 = manager.adapt('template', 'creative')

// 自动识别格式
const result = manager.adaptAny(someInput)
```

### 内置模板 / Built-in Templates

- **Assistant** - 友好的 AI 助手（温度 0.7）
- **Creative** - 富有创意的写手（温度 1.2）
- **Professional** - 专业的商务顾问（温度 0.5）

---

## 🚀 快速开始 / Quick Start

### 基础对话 / Basic Chat
```bash
# 中文
chat 你好，今天天气怎么样？

# 英文
chat Hello, how is the weather today?
```

### 切换人设 / Switch Persona
```bash
# 中文 - 使用中文别名
切换人设 猫娘

# 英文 - 使用英文名
persona-switch catgirl
```

### 生成图片 / Generate Image
```bash
# 中文
生成图片 一只可爱的猫咪坐在沙发上

# 英文
image A cute cat sitting on the sofa
```

### 生成视频 / Generate Video
```bash
# 中文
生成视频 一只兔子在草地上跳跃，时长5秒

# 英文
video A rabbit jumping in the grass, 5 seconds
```

### 翻译文本 / Translate Text
```bash
# 中文
翻译 Hello world 英文转中文

# 英文
translate Hello world English to Chinese
```

---

## 📖 完整文档 / Documentation

- **[命令参考](./COMMANDS_REFERENCE.md)** - 所有命令的完整参考
- **[双语命令指南](./BILINGUAL_COMMANDS.md)** - 人设命令中英文使用指南
- **[人设别名参考](./PERSONA_ALIASES.md)** - 人设别名完整列表

---

## 🎭 内置人设 / Built-in Personas

### 简易版 (Simple) - 15 个人设
| 名称 | 中文别名 | 描述 |
|------|--------|------|
| default | 默认 | 官方默认 |
| assistant | 助手 | 标准助手 |
| catgirl | 猫娘 | 可爱猫娘 |
| maid | 女仆 | 专业女仆 |
| big-sister | 大姐姐 | 温柔大姐姐 |
| girlfriend | 女友 | 贴心女友 |
| boyfriend | 男友 | 温柔男友 |
| tsundere | 傲娇 | 傲娇角色 |
| genki | 元气 | 元气少女 |
| cool-queen | 御姐 | 高冷御姐 |
| yandere | 病娇 | 病娇角色 |
| dandere | 天然呆 | 天然呆角色 |
| schemer | 腹黑 | 腹黑角色 |
| healer | 治愈 | 治愈系角色 |
| ceo | 总裁 | 霸道总裁 |
| loyal-dog | 忠犬 | 忠犬系角色 |

### 复杂版 (Complex) - 15 个详细人设
与简易版相同的人设，但提示词更详细完整，适合沉浸式体验。

---

## 🛠️ 开发 / Development

### 项目结构 / Project Structure
```
src/
├── index.ts                 # 主入口文件
├── types.ts                 # 类型定义
├── models.ts                # 模型管理
├── utils.ts                 # 工具函数
├── commands/
│   ├── persona.ts          # 人设命令
│   ├── context.ts          # 对话命令
│   └── index.ts            # 命令导出
└── services/
    ├── persona-manager.ts      # 人设管理器
    ├── personas-simple.ts      # 简易人设
    ├── personas-complex.ts     # 复杂人设
    ├── conversation-manager.ts # 对话管理器
    ├── text-to-image.ts        # 文生图服务
    ├── image-edit.ts           # 图片编辑服务
    ├── text-to-video.ts        # 文生视频服务
    ├── translate.ts            # 翻译服务
    └── index.ts                # 服务导出
```

### 构建 / Build
```bash
# 开发模式（监听文件变化）
yarn dev

# 生产构建
yarn build
```

### 代码风格 / Code Style
- 使用 TypeScript 编写
- 遵循 Koishi 插件规范
- 完整的类型安全
- 详细的代码注释

---

## 🤝 贡献 / Contributing

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📝 许可证 / License

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。

---

## 🙏 致谢 / Acknowledgments

- [Koishi](https://koishi.chat/) - 机器人框架
- [阿里云百炼](https://bailian.aliyun.com/) - AI 模型服务
- 所有贡献者和使用者

---

## 📞 联系方式 / Contact

- **作者 / Author**: laojiu
- **GitHub**: https://github.com/yexingzhi/koishi-plugin-qwen-ai-chat
- **问题反馈 / Issues**: https://github.com/yexingzhi/koishi-plugin-qwen-ai-chat/issues

---

## 🔄 更新日志 / Changelog

### v1.0.5 (2025-11-17)
- ✅ 添加用户记忆系统（偏好、风格、话题、片段）
- ✅ 实现数据库持久化管理
- ✅ 新增人设适配器系统（5种适配器）
- ✅ 支持多格式人设导入（JSON/YAML/Simple）
- ✅ 内置人设模板系统
- ✅ 自动过期清理和统计功能

### v1.0.4 (2025-11-17)
- ✅ 添加管理员权限系统
- ✅ 受保护的关键指令（切换地域、清除历史）
- ✅ 删除不必要的调试日志，优化性能
- ✅ 修复 TypeScript 严格模式下的类型错误
- ✅ 禁用 sourceMap 和 declarationMap 减小包大小

### v1.0.3 (2025-11-17)
- ✅ 启用 TypeScript 严格模式
- ✅ 完整的类型安全检查
- ✅ 修复所有类型错误

### v1.0.2 (2025-11-17)
- ✅ 完整的中英文双语支持
- ✅ 人设中文别名识别系统
- ✅ 所有命令中英文别名

### v1.0.1 (2025-11-17)
- ✅ 性能优化（日志清理）
- ✅ 服务架构优化
- ✅ 错误处理改进

### v1.0.0 (2025-11-16)
- ✅ 初始版本发布
- ✅ 完整的对话系统
- ✅ 15 个内置人设 + 自定义人设
- ✅ 图片生成、编辑功能
- ✅ 视频生成功能
- ✅ 翻译功能
- ✅ 中英文双语支持
- ✅ 人设中文别名识别
- ✅ 完整的文档

---

## ⚡ 性能指标 / Performance

- **内存占用**: ~1KB 每个对话
- **响应时间**: 取决于 API 响应，通常 < 5 秒
- **并发支持**: 支持多用户并发对话
- **历史清理**: 自动清理 1 小时未活动的对话

---

## 🔐 安全性 / Security

- ✅ API Key 安全存储
- ✅ 用户数据隔离
- ✅ 输入验证和清理
- ✅ 错误信息不泄露敏感信息

---

## 📚 相关资源 / Related Resources

- [Koishi 官方文档](https://koishi.chat/)
- [阿里云百炼 API 文档](https://bailian.aliyun.com/docs)
- [OpenAI API 兼容模式](https://dashscope.aliyuncs.com/docs)
