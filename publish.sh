#!/bin/bash

# 🚀 Koishi 插件快速发布脚本
# 用法: ./publish.sh

set -e

echo "🚀 开始发布流程..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 步骤 1: 清理和构建
echo -e "${BLUE}[1/5]${NC} 清理和构建项目..."
rm -rf lib/
npm install > /dev/null 2>&1
npm run build > /dev/null 2>&1
echo -e "${GREEN}✅ 构建成功${NC}"
echo ""

# 步骤 2: 运行测试
echo -e "${BLUE}[2/5]${NC} 运行测试..."
npm test -- --forceExit > /dev/null 2>&1
echo -e "${GREEN}✅ 所有测试通过${NC}"
echo ""

# 步骤 3: 更新版本
echo -e "${BLUE}[3/5]${NC} 更新版本号..."
OLD_VERSION=$(npm info . version 2>/dev/null || echo "1.0.2")
npm version patch > /dev/null 2>&1
NEW_VERSION=$(npm info . version 2>/dev/null || cat package.json | grep '"version"' | head -1 | awk -F'"' '{print $4}')
echo -e "${GREEN}✅ 版本已更新: ${OLD_VERSION} → ${NEW_VERSION}${NC}"
echo ""

# 步骤 4: 提交到 GitHub
echo -e "${BLUE}[4/5]${NC} 提交到 GitHub..."
git add . > /dev/null 2>&1
git commit -m "Release v${NEW_VERSION}: Update and improvements" > /dev/null 2>&1
git push origin main > /dev/null 2>&1
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}" > /dev/null 2>&1
git push origin "v${NEW_VERSION}" > /dev/null 2>&1
echo -e "${GREEN}✅ 已推送到 GitHub${NC}"
echo ""

# 步骤 5: 发布到 NPM
echo -e "${BLUE}[5/5]${NC} 发布到 NPM..."
npm publish > /dev/null 2>&1
echo -e "${GREEN}✅ 已发布到 NPM${NC}"
echo ""

# 验证
echo -e "${YELLOW}📋 发布验证${NC}"
echo -e "GitHub: https://github.com/yourusername/koishi-plugin-qwen-ai-chat"
echo -e "NPM: https://www.npmjs.com/package/koishi-plugin-qwen-ai-chat"
echo ""

echo -e "${GREEN}🎉 发布完成！${NC}"
echo -e "版本: ${NEW_VERSION}"
echo ""
