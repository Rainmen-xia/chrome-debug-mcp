#!/usr/bin/env node

/**
 * 综合调试工具集
 * 提供MCP浏览器服务器的各种调试功能
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🛠️  MCP浏览器服务器调试工具集');
console.log('==============================');

class DebugUtils {
    constructor() {
        this.buildPath = join(__dirname, '..', 'build');
    }

    async checkEnvironment() {
        console.log('\n🔍 环境检查');
        console.log('============');
        
        // 检查Node.js版本
        const nodeVersion = process.version;
        console.log(`✅ Node.js版本: ${nodeVersion}`);
        
        // 检查项目是否已编译
        const indexPath = join(this.buildPath, 'index.js');
        const hasBuilt = existsSync(indexPath);
        console.log(`${hasBuilt ? '✅' : '❌'} TypeScript编译: ${hasBuilt ? '已完成' : '需要运行 npm run build'}`);
        
        // 检查依赖
        const nodeModulesPath = join(__dirname, '..', 'node_modules');
        const hasDeps = existsSync(nodeModulesPath);
        console.log(`${hasDeps ? '✅' : '❌'} 依赖安装: ${hasDeps ? '已完成' : '需要运行 npm install'}`);
        
        // 检查Chrome端口
        await this.checkChromePort();
        
        return hasBuilt && hasDeps;
    }

    async checkChromePort() {
        try {
            const { default: axios } = await import('axios');
            const response = await axios.get('http://localhost:9222/json/version', { timeout: 2000 });
            console.log('✅ Chrome调试端口: 可访问');
            console.log(`   版本: ${response.data.Browser}`);
        } catch (error) {
            console.log('❌ Chrome调试端口: 不可访问');
            console.log('   建议: 启动Chrome调试模式');
            console.log('   命令: ./start-chrome-debug.sh');
        }
    }

    async runTool(toolName) {
        const toolPath = join(__dirname, `${toolName}.js`);
        
        if (!existsSync(toolPath)) {
            console.error(`❌ 找不到工具: ${toolName}`);
            return false;
        }
        
        console.log(`\n🚀 运行工具: ${toolName}`);
        console.log('============================');
        
        return new Promise((resolve, reject) => {
            const child = spawn('node', [toolPath], {
                stdio: 'inherit',
                cwd: join(__dirname, '..')
            });
            
            child.on('close', (code) => {
                console.log(`\n🏁 工具 ${toolName} 执行完成，退出代码: ${code}`);
                resolve(code === 0);
            });
            
            child.on('error', (error) => {
                console.error(`❌ 工具执行失败: ${error.message}`);
                reject(error);
            });
        });
    }

    showUsage() {
        console.log('\n📖 使用说明');
        console.log('============');
        console.log('');
        console.log('🔧 可用的调试工具:');
        console.log('');
        console.log('  npm run test-chrome     - 测试Chrome连接和截图功能');
        console.log('  npm run test            - 测试完整MCP服务器功能');
        console.log('  npm run test-base64     - 专门测试Base64编码问题');
        console.log('  npm run debug           - 启动调试模式（支持断点）');
        console.log('  npm run debug-verbose   - 启动详细日志模式');
        console.log('');
        console.log('📋 直接运行工具:');
        console.log('');
        console.log('  node debug/test-chrome-connection.js');
        console.log('  node debug/test-mcp-server.js');
        console.log('  node debug/test-base64.js');
        console.log('  node debug/debug-utils.js --help');
        console.log('');
        console.log('🔍 调试步骤建议:');
        console.log('');
        console.log('1. 环境检查: node debug/debug-utils.js --check');
        console.log('2. Chrome测试: npm run test-chrome');
        console.log('3. Base64测试: npm run test-base64');
        console.log('4. MCP服务器测试: npm run test');
        console.log('5. 如有问题，使用: npm run debug-verbose');
        console.log('');
        console.log('🚨 常见问题排查:');
        console.log('');
        console.log('• Chrome连接失败:');
        console.log('  - 确保Chrome以调试模式启动');
        console.log('  - 检查端口9222是否被占用: lsof -i :9222');
        console.log('  - 验证调试接口: curl http://localhost:9222/json/version');
        console.log('');
        console.log('• Base64验证错误:');
        console.log('  - 运行专门的Base64测试: npm run test-base64');
        console.log('  - 检查截图格式和质量设置');
        console.log('  - 查看生成的测试文件');
        console.log('');
        console.log('• MCP通信失败:');
        console.log('  - 检查JSON格式是否正确');
        console.log('  - 确认stdio通信正常');
        console.log('  - 使用详细日志模式排查');
        console.log('');
        console.log('📞 如需更多帮助:');
        console.log('  查看 README.md 和 ARCHITECTURE.md');
        console.log('');
    }

    async interactiveMode() {
        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('\n🔄 交互调试模式');
        console.log('================');
        console.log('可用命令:');
        console.log('  1. check     - 环境检查');
        console.log('  2. chrome    - Chrome连接测试');
        console.log('  3. base64    - Base64编码测试');
        console.log('  4. mcp       - MCP服务器测试');
        console.log('  5. help      - 显示帮助');
        console.log('  6. exit      - 退出');
        console.log('');

        const askCommand = () => {
            rl.question('请选择命令 (1-6): ', async (answer) => {
                switch (answer.trim()) {
                    case '1':
                    case 'check':
                        await this.checkEnvironment();
                        askCommand();
                        break;
                    case '2':
                    case 'chrome':
                        await this.runTool('test-chrome-connection');
                        askCommand();
                        break;
                    case '3':
                    case 'base64':
                        await this.runTool('test-base64');
                        askCommand();
                        break;
                    case '4':
                    case 'mcp':
                        await this.runTool('test-mcp-server');
                        askCommand();
                        break;
                    case '5':
                    case 'help':
                        this.showUsage();
                        askCommand();
                        break;
                    case '6':
                    case 'exit':
                        console.log('👋 再见！');
                        rl.close();
                        break;
                    default:
                        console.log('❌ 无效命令，请重新选择');
                        askCommand();
                        break;
                }
            });
        };

        askCommand();
    }
}

// 命令行参数处理
async function main() {
    const debugUtils = new DebugUtils();
    const args = process.argv.slice(2);

    if (args.length === 0) {
        await debugUtils.interactiveMode();
        return;
    }

    const command = args[0];

    switch (command) {
        case '--check':
        case '-c':
            await debugUtils.checkEnvironment();
            break;

        case '--chrome':
            await debugUtils.runTool('test-chrome-connection');
            break;

        case '--base64':
            await debugUtils.runTool('test-base64');
            break;

        case '--mcp':
            await debugUtils.runTool('test-mcp-server');
            break;

        case '--help':
        case '-h':
            debugUtils.showUsage();
            break;

        case '--interactive':
        case '-i':
            await debugUtils.interactiveMode();
            break;

        default:
            console.error(`❌ 未知命令: ${command}`);
            debugUtils.showUsage();
            process.exit(1);
    }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('💥 未捕获的异常:', error.message);
    console.error(error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 未处理的Promise拒绝:', reason);
    process.exit(1);
});

main().catch(error => {
    console.error('💥 执行失败:', error.message);
    process.exit(1);
}); 