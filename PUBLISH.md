# 快速发布指南 / Quick Publish Guide

## 🚀 一键发布流程 / One-Click Publishing

### 第一步：准备工作 / Step 1: Preparation

```bash
# 1. 确保代码已提交
git status

# 2. 清理构建文件
rm -rf lib dist

# 3. 重新构建
yarn build

# 4. 验证构建成功
ls -la lib/
```

### 第二步：更新版本 / Step 2: Update Version

编辑 `package.json`，更新以下信息：

```json
{
  "version": "1.0.0",                    // 更新版本号
  "author": "Your Name",                 // 更新作者
  "homepage": "https://github.com/yourusername/koishi-plugin-qwen-ai-chat",
  "repository": {
    "url": "https://github.com/yourusername/koishi-plugin-qwen-ai-chat.git"
  }
}
```

### 第三步：登录 NPM / Step 3: Login to NPM

```bash
npm login
# 输入用户名、密码和邮箱
```

### 第四步：发布 / Step 4: Publish

```bash
# 方式一：直接发布（如果已更新版本号）
npm publish

# 方式二：自动更新版本并发布
npm version patch && npm publish
```

### 第五步：验证 / Step 5: Verify

```bash
# 查看 NPM 上的包
npm view koishi-plugin-qwen-ai-chat

# 或访问：https://www.npmjs.com/package/koishi-plugin-qwen-ai-chat
```

---

## 📋 必需的信息 / Required Information

在发布前，请准备以下信息：

1. **NPM 账户**
   - 用户名
   - 密码
   - 邮箱

2. **GitHub 仓库信息**
   - 仓库 URL
   - 作者名称
   - 许可证类型

3. **插件信息**
   - 版本号（遵循 Semantic Versioning）
   - 描述
   - 关键词

---

## ⚠️ 常见错误 / Common Errors

### 错误 1: 403 Forbidden

```
npm ERR! 403 Forbidden
```

**解决方案**:
```bash
# 检查是否登录
npm whoami

# 如果未登录，重新登录
npm login

# 检查包名是否已被占用
npm view koishi-plugin-qwen-ai-chat
```

### 错误 2: 版本号冲突

```
npm ERR! 409 Conflict
```

**解决方案**:
```bash
# 更新版本号
npm version patch

# 或手动编辑 package.json 中的 version 字段
```

### 错误 3: 文件缺失

```
npm ERR! 404 Not Found
```

**解决方案**:
```bash
# 确保 lib/ 目录存在
ls -la lib/

# 重新构建
yarn build
```

---

## 🔄 更新已发布的包 / Update Published Package

```bash
# 1. 修改代码
# ...

# 2. 更新版本
npm version minor  # 或 patch/major

# 3. 提交更改
git add .
git commit -m "chore: bump version"

# 4. 推送到 GitHub
git push origin main
git push origin v1.1.0

# 5. 重新发布
npm publish
```

---

## 📊 发布后 / After Publishing

### 监控下载量
```bash
# 访问 npm stats
https://npm-stat.com/charts.html?package=koishi-plugin-qwen-ai-chat
```

### 收集反馈
- 监控 GitHub Issues
- 回复用户问题
- 修复报告的 bug

### 定期更新
- 修复安全漏洞
- 添加新功能
- 改进文档

---

## ✅ 发布检查表 / Checklist

- [ ] 代码已提交到 Git
- [ ] 版本号已更新
- [ ] 作者信息已更新
- [ ] 仓库 URL 已更新
- [ ] `yarn build` 成功
- [ ] `lib/` 目录存在
- [ ] 本地测试通过
- [ ] NPM 已登录
- [ ] `npm publish` 成功
- [ ] NPM 上可以查看到包

---

**准备好了吗？开始发布吧！** 🎉

```bash
npm publish
```
