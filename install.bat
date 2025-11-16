@echo off
REM Koishi 插件依赖安装脚本 (Windows)
REM 用于安装 koishi-plugin-qwen-ai-chat 的所有依赖

echo.
echo ========================================
echo Koishi 插件依赖安装脚本
echo ========================================
echo.

REM 检查是否在正确的目录
if not exist "package.json" (
    echo 错误: 请在插件根目录运行此脚本
    echo 当前目录: %cd%
    pause
    exit /b 1
)

echo 当前目录: %cd%
echo.

REM 检查 yarn 是否安装
where yarn >nul 2>nul
if %errorlevel% neq 0 (
    echo 检测到 yarn 未安装，使用 npm 进行安装
    echo.
    echo 安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo 错误: npm install 失败
        pause
        exit /b 1
    )
) else (
    echo 检测到 yarn 已安装，使用 yarn 进行安装
    echo.
    echo 安装依赖...
    call yarn install
    if %errorlevel% neq 0 (
        echo 错误: yarn install 失败
        pause
        exit /b 1
    )
)

echo.
echo ✅ 依赖安装完成！
echo.
echo 可用的命令:
echo   npm run build         - 构建项目
echo   npm run dev           - 开发模式（监视）
echo   npm test              - 运行测试
echo   npm run test:watch    - 测试监视模式
echo   npm run test:coverage - 生成覆盖率报告
echo.
echo 下一步:
echo   1. 运行 npm run build 构建项目
echo   2. 运行 npm test 运行测试
echo.
pause
