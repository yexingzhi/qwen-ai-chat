@echo off
REM 🚀 Koishi 插件快速发布脚本 (Windows)
REM 用法: publish.bat

setlocal enabledelayedexpansion

echo.
echo 🚀 开始发布流程...
echo.

REM 步骤 1: 清理和构建
echo [1/5] 清理和构建项目...
if exist lib rmdir /s /q lib
call npm install >nul 2>&1
call npm run build >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 构建失败
    exit /b 1
)
echo ✅ 构建成功
echo.

REM 步骤 2: 运行测试
echo [2/5] 运行测试...
call npm test -- --forceExit >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 测试失败
    exit /b 1
)
echo ✅ 所有测试通过
echo.

REM 步骤 3: 更新版本
echo [3/5] 更新版本号...
for /f "tokens=*" %%i in ('npm info . version 2^>nul') do set OLD_VERSION=%%i
if "!OLD_VERSION!"=="" set OLD_VERSION=1.0.2
call npm version patch >nul 2>&1
for /f "tokens=*" %%i in ('npm info . version 2^>nul') do set NEW_VERSION=%%i
echo ✅ 版本已更新: !OLD_VERSION! ^→ !NEW_VERSION!
echo.

REM 步骤 4: 提交到 GitHub
echo [4/5] 提交到 GitHub...
call git add . >nul 2>&1
call git commit -m "Release v!NEW_VERSION!: Update and improvements" >nul 2>&1
call git push origin main >nul 2>&1
call git tag -a "v!NEW_VERSION!" -m "Release v!NEW_VERSION!" >nul 2>&1
call git push origin "v!NEW_VERSION!" >nul 2>&1
echo ✅ 已推送到 GitHub
echo.

REM 步骤 5: 发布到 NPM
echo [5/5] 发布到 NPM...
call npm publish >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 发布失败
    exit /b 1
)
echo ✅ 已发布到 NPM
echo.

REM 验证
echo 📋 发布验证
echo GitHub: https://github.com/yourusername/koishi-plugin-qwen-ai-chat
echo NPM: https://www.npmjs.com/package/koishi-plugin-qwen-ai-chat
echo.

echo 🎉 发布完成！
echo 版本: !NEW_VERSION!
echo.

pause
