#!/usr/bin/env node

/**
 * 网络连接测试工具
 * 专门诊断导航超时问题
 */

import { connect } from 'puppeteer-core';
import axios from 'axios';
import { discoverChromeHostUrl } from '../build/browserDiscovery.js';

console.log('🌐 网络连接测试工具');
console.log('===================');

class NetworkTester {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async testDirectNetworkAccess() {
        console.log('\n1️⃣ 测试直接网络访问...');
        
        const testUrls = [
            'https://example.com',
            'https://httpbin.org/get',
            'https://www.google.com',
            'http://httpbin.org/get'
        ];
        
        for (const url of testUrls) {
            try {
                console.log(`📡 测试 ${url}...`);
                const startTime = Date.now();
                const response = await axios.get(url, { 
                    timeout: 10000,
                    maxRedirects: 5
                });
                const duration = Date.now() - startTime;
                
                console.log(`✅ 成功 (${response.status}) - ${duration}ms`);
                console.log(`   内容长度: ${response.data?.length || 0} 字符`);
                
            } catch (error) {
                console.log(`❌ 失败: ${error.message}`);
                if (error.code) {
                    console.log(`   错误代码: ${error.code}`);
                }
            }
        }
    }

    async connectToChrome() {
        console.log('\n2️⃣ 连接Chrome...');
        
        const chromeUrl = await discoverChromeHostUrl();
        if (!chromeUrl) {
            throw new Error('无法找到Chrome调试端口');
        }
        
        console.log(`✅ 找到Chrome: ${chromeUrl}`);
        
        this.browser = await connect({
            browserURL: chromeUrl,
            defaultViewport: { width: 1200, height: 800 }
        });
        
        this.page = await this.browser.newPage();
        console.log('✅ Chrome连接成功');
    }

    async testBrowserNavigation() {
        console.log('\n3️⃣ 测试浏览器导航...');
        
        const testUrls = [
            {
                url: 'data:text/html,<h1>本地测试页面</h1><p>这是一个本地测试</p>',
                name: '本地HTML'
            },
            {
                url: 'https://httpbin.org/get',
                name: 'HTTPBin API'
            },
            {
                url: 'https://example.com',
                name: 'Example.com'
            }
        ];
        
        for (const testCase of testUrls) {
            console.log(`\n🚀 导航到 ${testCase.name}: ${testCase.url}`);
            
            try {
                const startTime = Date.now();
                
                // 设置更详细的等待条件
                await this.page.goto(testCase.url, {
                    waitUntil: ['domcontentloaded'],
                    timeout: 15000 // 增加超时时间到15秒
                });
                
                const duration = Date.now() - startTime;
                console.log(`✅ 导航成功 - ${duration}ms`);
                
                // 获取页面信息
                const title = await this.page.title();
                const url = this.page.url();
                console.log(`   页面标题: ${title}`);
                console.log(`   最终URL: ${url}`);
                
                // 等待页面稳定
                console.log('⏳ 等待页面加载完成...');
                await this.waitForPageStable();
                
                // 尝试截图测试
                console.log('📸 测试截图...');
                await this.testScreenshot();
                
            } catch (error) {
                console.log(`❌ 导航失败: ${error.message}`);
                
                if (error.name === 'TimeoutError') {
                    console.log('   🚨 这是一个超时错误');
                    console.log('   建议: 检查网络连接或增加超时时间');
                }
                
                // 尝试获取当前页面状态
                try {
                    const currentUrl = this.page.url();
                    console.log(`   当前页面: ${currentUrl}`);
                } catch (urlError) {
                    console.log('   无法获取当前页面URL');
                }
            }
        }
    }

    async waitForPageStable() {
        const maxWait = 10000; // 10秒最大等待
        const checkInterval = 500; // 每500ms检查一次
        let lastHTMLSize = 0;
        let stableCount = 0;
        const requiredStableCount = 3;
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            try {
                const html = await this.page.content();
                const currentHTMLSize = html.length;
                
                if (lastHTMLSize === currentHTMLSize) {
                    stableCount++;
                    if (stableCount >= requiredStableCount) {
                        console.log(`   ✅ 页面稳定 (大小: ${currentHTMLSize} 字符)`);
                        return;
                    }
                } else {
                    stableCount = 0;
                }
                
                lastHTMLSize = currentHTMLSize;
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                
            } catch (error) {
                console.log(`   ⚠️ 页面稳定性检查失败: ${error.message}`);
                break;
            }
        }
        
        console.log('   ⚠️ 页面稳定性检查超时');
    }

    async testScreenshot() {
        try {
            const screenshot = await this.page.screenshot({
                type: 'png',
                encoding: 'base64'
            });
            
            if (screenshot && screenshot.length > 0) {
                console.log(`   ✅ 截图成功 (${screenshot.length} 字符)`);
                return true;
            } else {
                console.log('   ❌ 截图返回空数据');
                return false;
            }
        } catch (error) {
            console.log(`   ❌ 截图失败: ${error.message}`);
            return false;
        }
    }

    async testNavigationWithDifferentSettings() {
        console.log('\n4️⃣ 测试不同的导航设置...');
        
        const navigationSettings = [
            {
                name: '仅DOM加载',
                waitUntil: ['domcontentloaded'],
                timeout: 10000
            },
            {
                name: '等待所有资源',
                waitUntil: ['load'],
                timeout: 15000
            },
            {
                name: '网络静默',
                waitUntil: ['networkidle0'],
                timeout: 20000
            },
            {
                name: '网络基本静默',
                waitUntil: ['networkidle2'],
                timeout: 15000
            }
        ];
        
        const testUrl = 'https://example.com';
        
        for (const setting of navigationSettings) {
            console.log(`\n🧪 测试设置: ${setting.name}`);
            
            try {
                const startTime = Date.now();
                
                await this.page.goto(testUrl, {
                    waitUntil: setting.waitUntil,
                    timeout: setting.timeout
                });
                
                const duration = Date.now() - startTime;
                console.log(`   ✅ 成功 - ${duration}ms`);
                
            } catch (error) {
                console.log(`   ❌ 失败: ${error.message}`);
            }
        }
    }

    async showRecommendations() {
        console.log('\n💡 针对导航超时的解决建议');
        console.log('============================');
        console.log('');
        console.log('1. 修改默认超时设置:');
        console.log('   在 src/browserSession.ts 中增加 timeout 值');
        console.log('   await page.goto(url, { timeout: 15000 });');
        console.log('');
        console.log('2. 使用更宽松的等待条件:');
        console.log('   waitUntil: ["domcontentloaded"] // 而不是 networkidle2');
        console.log('');
        console.log('3. 增加重试机制:');
        console.log('   try { await goto() } catch { retry }');
        console.log('');
        console.log('4. 检查网络连接:');
        console.log('   ping example.com');
        console.log('   curl -I https://example.com');
        console.log('');
        console.log('5. 使用本地测试页面:');
        console.log('   data:text/html,<h1>Test</h1>');
        console.log('');
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
    const tester = new NetworkTester();
    
    try {
        await tester.testDirectNetworkAccess();
        await tester.connectToChrome();
        await tester.testBrowserNavigation();
        await tester.testNavigationWithDifferentSettings();
        tester.showRecommendations();
        
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