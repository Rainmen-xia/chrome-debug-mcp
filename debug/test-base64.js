#!/usr/bin/env node

/**
 * Base64测试工具
 * 专门用于诊断截图Base64编码问题
 */

import { connect } from 'puppeteer-core';
import { writeFileSync } from 'fs';
import { discoverChromeHostUrl } from '../build/browserDiscovery.js';

console.log('🔍 Base64测试工具');
console.log('=================');

class Base64Tester {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async connectToChrome() {
        console.log('\n1️⃣ 连接Chrome...');
        
        const chromeUrl = await discoverChromeHostUrl();
        if (!chromeUrl) {
            throw new Error('无法找到Chrome调试端口');
        }
        
        console.log(`✅ 找到Chrome: ${chromeUrl}`);
        
        this.browser = await connect({
            browserURL: chromeUrl,
            defaultViewport: { width: 1200, height: 800 }
        });
        
        console.log('✅ Chrome连接成功');
    }

    async createTestPage() {
        console.log('\n2️⃣ 创建测试页面...');
        
        this.page = await this.browser.newPage();
        
        // 创建一个简单的测试页面
        await this.page.setContent(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Base64截图测试页面</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                        color: white;
                    }
                    .test-box {
                        background: rgba(255,255,255,0.1);
                        padding: 20px;
                        border-radius: 10px;
                        margin: 20px 0;
                    }
                    .emoji {
                        font-size: 48px;
                        margin: 10px;
                    }
                </style>
            </head>
            <body>
                <h1>🖼️ Base64截图测试页面</h1>
                <div class="test-box">
                    <h2>测试内容</h2>
                    <p>这是一个用于测试截图Base64编码的页面</p>
                    <div class="emoji">🚀 📸 ✅ 🔍</div>
                    <p>时间戳: ${new Date().toISOString()}</p>
                </div>
            </body>
            </html>
        `);
        
        console.log('✅ 测试页面创建完成');
    }

    async testScreenshots() {
        console.log('\n3️⃣ 测试不同格式的截图...');
        
        const testConfigs = [
            {
                name: 'WebP高质量',
                config: { type: 'webp', quality: 90, encoding: 'base64' }
            },
            {
                name: 'WebP中等质量',
                config: { type: 'webp', quality: 75, encoding: 'base64' }
            },
            {
                name: 'WebP低质量',
                config: { type: 'webp', quality: 50, encoding: 'base64' }
            },
            {
                name: 'PNG格式',
                config: { type: 'png', encoding: 'base64' }
            },
            {
                name: 'JPEG格式',
                config: { type: 'jpeg', quality: 75, encoding: 'base64' }
            }
        ];

        const results = [];

        for (const testConfig of testConfigs) {
            console.log(`\n📸 测试 ${testConfig.name}...`);
            
            try {
                const startTime = Date.now();
                const screenshot = await this.page.screenshot(testConfig.config);
                const endTime = Date.now();
                
                if (!screenshot) {
                    console.log(`❌ ${testConfig.name}: 截图返回空数据`);
                    results.push({
                        name: testConfig.name,
                        success: false,
                        error: '截图返回空数据'
                    });
                    continue;
                }

                // 基础信息
                const dataSize = screenshot.length;
                const duration = endTime - startTime;
                
                console.log(`   📏 数据大小: ${dataSize} 字符`);
                console.log(`   ⏱️  耗时: ${duration}ms`);
                console.log(`   🔍 前50字符: ${screenshot.substring(0, 50)}...`);
                
                // Base64验证
                const isValidBase64 = this.validateBase64(screenshot);
                console.log(`   ✅ Base64格式: ${isValidBase64 ? '有效' : '无效'}`);
                
                if (!isValidBase64) {
                    console.log(`   🚨 Base64验证失败！`);
                    this.analyzeBase64Error(screenshot);
                }
                
                // 保存截图文件（用于验证）
                const filename = `debug/test-screenshot-${testConfig.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
                try {
                    writeFileSync(filename, screenshot);
                    console.log(`   💾 已保存到: ${filename}`);
                } catch (writeError) {
                    console.log(`   ❌ 保存失败: ${writeError.message}`);
                }
                
                // 尝试解码Base64
                try {
                    const buffer = Buffer.from(screenshot, 'base64');
                    console.log(`   🔄 解码后大小: ${buffer.length} 字节`);
                    
                    // 保存二进制文件
                    const binaryFilename = `debug/test-screenshot-${testConfig.name.replace(/\s+/g, '-').toLowerCase()}.${testConfig.config.type}`;
                    writeFileSync(binaryFilename, buffer);
                    console.log(`   💾 二进制文件: ${binaryFilename}`);
                    
                } catch (decodeError) {
                    console.log(`   ❌ Base64解码失败: ${decodeError.message}`);
                }
                
                // 测试MCP格式
                const mcpDataUrl = `data:image/${testConfig.config.type};base64,${screenshot}`;
                const mcpValid = this.validateDataUrl(mcpDataUrl);
                console.log(`   📋 MCP数据URL格式: ${mcpValid ? '有效' : '无效'}`);
                
                results.push({
                    name: testConfig.name,
                    success: isValidBase64,
                    dataSize,
                    duration,
                    isValidBase64,
                    mcpValid,
                    config: testConfig.config
                });
                
            } catch (error) {
                console.log(`   ❌ 截图失败: ${error.message}`);
                results.push({
                    name: testConfig.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    validateBase64(base64String) {
        try {
            // 检查字符串是否只包含Base64字符
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            if (!base64Regex.test(base64String)) {
                return false;
            }
            
            // 尝试解码和重新编码
            const decoded = Buffer.from(base64String, 'base64');
            const reencoded = decoded.toString('base64');
            return reencoded === base64String;
        } catch (error) {
            return false;
        }
    }

    validateDataUrl(dataUrl) {
        try {
            const dataUrlRegex = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]*={0,2})$/;
            return dataUrlRegex.test(dataUrl);
        } catch (error) {
            return false;
        }
    }

    analyzeBase64Error(base64String) {
        console.log('   🔬 Base64错误分析:');
        
        // 检查长度
        if (base64String.length % 4 !== 0) {
            console.log(`      ❌ 长度不是4的倍数: ${base64String.length}`);
        }
        
        // 检查无效字符
        const validBase64Chars = /^[A-Za-z0-9+/=]*$/;
        if (!validBase64Chars.test(base64String)) {
            console.log('      ❌ 包含无效字符');
            
            // 找出无效字符
            const invalidChars = base64String.match(/[^A-Za-z0-9+/=]/g);
            if (invalidChars) {
                console.log(`      🚨 无效字符: ${[...new Set(invalidChars)].join(', ')}`);
            }
        }
        
        // 检查填充字符位置
        const paddingIndex = base64String.indexOf('=');
        if (paddingIndex !== -1 && paddingIndex < base64String.length - 2) {
            console.log('      ❌ 填充字符位置错误');
        }
    }

    showTestSummary(results) {
        console.log('\n📊 Base64测试结果汇总');
        console.log('======================');
        
        const successful = results.filter(r => r.success).length;
        const total = results.length;
        
        console.log(`总测试数: ${total}`);
        console.log(`成功: ${successful}`);
        console.log(`失败: ${total - successful}`);
        console.log(`成功率: ${((successful / total) * 100).toFixed(1)}%`);
        
        console.log('\n详细结果:');
        results.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.name}`);
            
            if (result.success) {
                console.log(`    数据大小: ${result.dataSize} 字符`);
                console.log(`    耗时: ${result.duration}ms`);
                console.log(`    MCP格式: ${result.mcpValid ? '有效' : '无效'}`);
            } else if (result.error) {
                console.log(`    错误: ${result.error}`);
            }
        });
        
        // 推荐设置
        console.log('\n💡 推荐设置:');
        const bestResult = results.find(r => r.success && r.mcpValid);
        if (bestResult) {
            console.log(`推荐使用: ${bestResult.name}`);
            console.log(`配置: ${JSON.stringify(bestResult.config, null, 2)}`);
        } else {
            console.log('❌ 未找到可用的截图配置');
        }
    }

    async cleanup() {
        console.log('\n🧹 清理资源...');
        
        if (this.page) {
            await this.page.close();
        }
        
        if (this.browser) {
            await this.browser.disconnect();
        }
        
        console.log('✅ 清理完成');
    }
}

// 主执行函数
async function main() {
    const tester = new Base64Tester();
    
    try {
        await tester.connectToChrome();
        await tester.createTestPage();
        const results = await tester.testScreenshots();
        tester.showTestSummary(results);
        
    } catch (error) {
        console.error('\n💥 测试过程中发生错误:');
        console.error(error.message);
        console.error(error.stack);
        process.exit(1);
        
    } finally {
        await tester.cleanup();
    }
}

// 处理进程退出
process.on('SIGINT', async () => {
    console.log('\n🛑 收到中断信号，正在清理...');
    process.exit(0);
});

main(); 