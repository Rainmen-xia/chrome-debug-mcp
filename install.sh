#!/bin/bash

echo "🚀 MCP浏览器自动化服务器 - 一键安装脚本"
echo "============================================"

# 检查Node.js环境
check_node() {
    if ! command -v node &> /dev/null; then
        echo "❌ 未找到Node.js，请先安装Node.js (版本 >= 18)"
        echo "下载地址: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js版本过低，需要版本 >= 18，当前版本: $(node -v)"
        exit 1
    fi
    
    echo "✅ Node.js版本检查通过: $(node -v)"
}

# 检查npm
check_npm() {
    if ! command -v npm &> /dev/null; then
        echo "❌ 未找到npm，请先安装npm"
        exit 1
    fi
    echo "✅ npm版本: $(npm -v)"
}

# 安装依赖
install_dependencies() {
    echo "📦 正在安装依赖包..."
    if npm install; then
        echo "✅ 依赖安装成功"
    else
        echo "❌ 依赖安装失败"
        exit 1
    fi
}

# 编译TypeScript
build_project() {
    echo "🔨 正在编译TypeScript..."
    if npm run build; then
        echo "✅ 编译成功"
    else
        echo "❌ 编译失败"
        exit 1
    fi
}

# 检查Chrome
check_chrome() {
    echo "🌐 检查Chrome浏览器..."
    
    # macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        if [ -f "$CHROME_PATH" ]; then
            echo "✅ 找到Chrome: $CHROME_PATH"
        else
            echo "⚠️  未找到Chrome，请安装Google Chrome"
            echo "下载地址: https://www.google.com/chrome/"
        fi
    # Linux
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v google-chrome &> /dev/null; then
            echo "✅ 找到Chrome: $(which google-chrome)"
        elif command -v chromium-browser &> /dev/null; then
            echo "✅ 找到Chromium: $(which chromium-browser)"
        else
            echo "⚠️  未找到Chrome/Chromium，请安装"
            echo "Ubuntu/Debian: sudo apt install google-chrome-stable"
            echo "或: sudo apt install chromium-browser"
        fi
    # Windows (in Git Bash or WSL)
    elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]]; then
        if [ -f "/c/Program Files/Google/Chrome/Application/chrome.exe" ] || \
           [ -f "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" ]; then
            echo "✅ 找到Chrome"
        else
            echo "⚠️  未找到Chrome，请安装Google Chrome"
            echo "下载地址: https://www.google.com/chrome/"
        fi
    fi
}

# 创建启动Chrome的脚本
create_chrome_script() {
    echo "📝 创建Chrome启动脚本..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        cat > start-chrome-debug.sh << 'EOF'
#!/bin/bash
echo "🚀 启动Chrome调试模式..."
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug \
  --disable-web-security \
  --disable-features=VizDisplayCompositor &

echo "✅ Chrome已在调试模式下启动"
echo "🌐 调试端口: http://localhost:9222"
echo "📂 数据目录: /tmp/chrome-debug"
echo ""
echo "现在可以正常使用Chrome并登录各种网站"
echo "登录状态会保持，供MCP服务器使用"
EOF
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        cat > start-chrome-debug.sh << 'EOF'
#!/bin/bash
echo "🚀 启动Chrome调试模式..."

# 尝试使用google-chrome
if command -v google-chrome &> /dev/null; then
    google-chrome \
      --remote-debugging-port=9222 \
      --user-data-dir=/tmp/chrome-debug \
      --disable-web-security \
      --disable-features=VizDisplayCompositor &
# 备选使用chromium
elif command -v chromium-browser &> /dev/null; then
    chromium-browser \
      --remote-debugging-port=9222 \
      --user-data-dir=/tmp/chrome-debug \
      --disable-web-security \
      --disable-features=VizDisplayCompositor &
else
    echo "❌ 未找到Chrome或Chromium"
    exit 1
fi

echo "✅ Chrome已在调试模式下启动"
echo "🌐 调试端口: http://localhost:9222"
echo "📂 数据目录: /tmp/chrome-debug"
echo ""
echo "现在可以正常使用Chrome并登录各种网站"
echo "登录状态会保持，供MCP服务器使用"
EOF
    else
        # Windows/其他
        cat > start-chrome-debug.bat << 'EOF'
@echo off
echo 🚀 启动Chrome调试模式...

set CHROME_PATH="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% (
    set CHROME_PATH="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
)

%CHROME_PATH% ^
  --remote-debugging-port=9222 ^
  --user-data-dir=c:\temp\chrome-debug ^
  --disable-web-security ^
  --disable-features=VizDisplayCompositor

echo ✅ Chrome已在调试模式下启动
echo 🌐 调试端口: http://localhost:9222
echo 📂 数据目录: c:\temp\chrome-debug
echo.
echo 现在可以正常使用Chrome并登录各种网站
echo 登录状态会保持，供MCP服务器使用
pause
EOF
    fi
    
    chmod +x start-chrome-debug.sh 2>/dev/null || true
    echo "✅ Chrome启动脚本创建完成"
}

# 创建测试脚本
create_test_script() {
    echo "🧪 创建测试脚本..."
    
    cat > test-mcp-server.js << 'EOF'
#!/usr/bin/env node

/**
 * MCP浏览器服务器测试脚本
 * 用于验证服务器是否正常工作
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 MCP浏览器服务器测试');
console.log('====================');

// 启动MCP服务器
const serverPath = join(__dirname, 'build', 'index.js');
const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
});

// 测试请求
const testRequests = [
    // 1. 测试工具列表
    {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {}
    }
];

let testIndex = 0;

function sendNextTest() {
    if (testIndex >= testRequests.length) {
        console.log('✅ 所有测试完成');
        server.kill();
        return;
    }
    
    const request = testRequests[testIndex++];
    console.log(`📤 发送测试 ${testIndex}: ${request.method}`);
    
    server.stdin.write(JSON.stringify(request) + '\n');
}

server.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
        try {
            const response = JSON.parse(line);
            console.log('📥 收到响应:', JSON.stringify(response, null, 2));
            
            // 发送下一个测试
            setTimeout(() => sendNextTest(), 1000);
            
        } catch (error) {
            console.log('📄 服务器日志:', line);
        }
    });
});

server.stderr.on('data', (data) => {
    console.log('🔍 服务器信息:', data.toString().trim());
});

server.on('close', (code) => {
    console.log(`🏁 服务器退出，代码: ${code}`);
});

// 启动测试
console.log('🚀 启动MCP服务器...');
setTimeout(() => {
    console.log('📋 开始测试工具列表...');
    sendNextTest();
}, 2000);

// 5秒后超时
setTimeout(() => {
    console.log('⏰ 测试超时');
    server.kill();
    process.exit(1);
}, 5000);
EOF

    chmod +x test-mcp-server.js 2>/dev/null || true
    echo "✅ 测试脚本创建完成"
}

# 显示使用说明
show_usage() {
    echo ""
    echo "🎉 安装完成！"
    echo "============="
    echo ""
    echo "📋 接下来的步骤："
    echo ""
    echo "1️⃣  启动Chrome调试模式："
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "   ./start-chrome-debug.sh"
    else
        echo "   start-chrome-debug.bat"
    fi
    echo ""
    echo "2️⃣  在Chrome中登录你需要自动化的网站"
    echo "   （登录状态会保持）"
    echo ""
    echo "3️⃣  启动MCP服务器："
    echo "   npm start"
    echo ""
    echo "4️⃣  测试服务器（可选）："
    echo "   node test-mcp-server.js"
    echo ""
    echo "📚 查看详细使用说明："
    echo "   cat README.md"
    echo "   cat example-usage.md"
    echo ""
    echo "🔧 配置到AI助手中："
    echo '   添加到MCP配置文件中：'
    echo '   {'
    echo '     "mcpServers": {'
    echo '       "browser-automation": {'
    echo '         "command": "node",'
    echo "         \"args\": [\"$(pwd)/build/index.js\"]"
    echo '       }'
    echo '     }'
    echo '   }'
    echo ""
}

# 主安装流程
main() {
    echo "开始安装..."
    
    check_node
    check_npm
    install_dependencies
    build_project
    check_chrome
    create_chrome_script
    create_test_script
    show_usage
    
    echo "🎊 安装脚本执行完成！"
}

# 执行安装
main 