#!/usr/bin/env node

/**
 * Chrome连接测试工具
 * 用于验证Chrome调试端口连接是否正常
 */

import axios from 'axios';
import { connect } from 'puppeteer-core';
import { discoverChromeHostUrl, tryChromeHostUrl } from '../build/browserDiscovery.js';

console.log('🔍 Chrome连接测试工具');
console.log('====================');

async function testChromeConnection() {
    const testPorts = [9222, 9223, 9224];
    const testHosts = ['localhost', '127.0.0.1'];
    
    console.log('\n1️⃣ 测试常见端口可用性...');
    
    for (const port of testPorts) {
        for (const host of testHosts) {
            const url = `http://${host}:${port}`;
            try {
                console.log(`📡 测试 ${url}...`);
                const response = await axios.get(`${url}/json/version`, { timeout: 2000 });
                console.log(`✅ 连接成功: ${url}`);
                console.log(`   Chrome版本: ${response.data.Browser}`);
                console.log(`   WebKit版本: ${response.data['WebKit-Version']}`);
                
                // 测试WebSocket连接
                await testWebSocketConnection(url);
                return url;
                
            } catch (error) {
                console.log(`❌ 连接失败: ${url} - ${error.message}`);
            }
        }
    }
    
    console.log('\n2️⃣ 尝试自动发现Chrome实例...');
    try {
        const discoveredUrl = await discoverChromeHostUrl();
        if (discoveredUrl) {
            console.log(`✅ 自动发现成功: ${discoveredUrl}`);
            await testWebSocketConnection(discoveredUrl);
            return discoveredUrl;
        } else {
            console.log('❌ 自动发现失败');
        }
    } catch (error) {
        console.log(`❌ 自动发现出错: ${error.message}`);
    }
    
    return null;
}

async function testWebSocketConnection(chromeUrl) {
    console.log(`\n3️⃣ 测试WebSocket连接到 ${chromeUrl}...`);
    
    try {
        const browser = await connect({
            browserURL: chromeUrl,
            defaultViewport: { width: 1200, height: 800 }
        });
        
        console.log('✅ WebSocket连接成功');
        
        // 获取页面列表
        const pages = await browser.pages();
        console.log(`📄 当前页面数量: ${pages.length}`);
        
        if (pages.length > 0) {
            const page = pages[0];
            const url = page.url();
            console.log(`🌐 当前页面URL: ${url}`);
            
            // 测试截图功能
            await testScreenshot(page);
        }
        
        await browser.disconnect();
        console.log('✅ 连接测试完成');
        
    } catch (error) {
        console.log(`❌ WebSocket连接失败: ${error.message}`);
        throw error;
    }
}

async function testScreenshot(page) {
    console.log('\n4️⃣ 测试截图功能...');
    
    try {
        // 测试WebP截图
        console.log('📸 测试WebP截图...');
        const webpScreenshot = await page.screenshot({
            type: 'webp',
            quality: 75,
            encoding: 'base64'
        });
        
        if (webpScreenshot && typeof webpScreenshot === 'string') {
            console.log(`✅ WebP截图成功 (大小: ${webpScreenshot.length} 字符)`);
            console.log(`🔍 Base64前缀: ${webpScreenshot.substring(0, 50)}...`);
            
            // 验证Base64格式
            const isValidBase64 = validateBase64(webpScreenshot);
            console.log(`✅ Base64格式验证: ${isValidBase64 ? '通过' : '失败'}`);
            
        } else {
            console.log('❌ WebP截图返回空数据');
        }
        
        // 测试PNG截图
        console.log('📸 测试PNG截图...');
        const pngScreenshot = await page.screenshot({
            type: 'png',
            encoding: 'base64'
        });
        
        if (pngScreenshot && typeof pngScreenshot === 'string') {
            console.log(`✅ PNG截图成功 (大小: ${pngScreenshot.length} 字符)`);
            
            // 验证Base64格式
            const isValidBase64 = validateBase64(pngScreenshot);
            console.log(`✅ Base64格式验证: ${isValidBase64 ? '通过' : '失败'}`);
            
        } else {
            console.log('❌ PNG截图返回空数据');
        }
        
    } catch (error) {
        console.log(`❌ 截图测试失败: ${error.message}`);
    }
}

function validateBase64(base64String) {
    try {
        // 检查字符串是否为有效的Base64
        const decoded = Buffer.from(base64String, 'base64');
        const reencoded = decoded.toString('base64');
        return reencoded === base64String;
    } catch (error) {
        return false;
    }
}

function showUsageInstructions() {
    console.log('\n📋 如果测试失败，请检查以下事项：');
    console.log('');
    console.log('1️⃣ 确保Chrome以调试模式启动：');
    console.log('   macOS/Linux:');
    console.log('   ./start-chrome-debug.sh');
    console.log('');
    console.log('   或手动启动：');
    console.log('   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\');
    console.log('     --remote-debugging-port=9222 \\');
    console.log('     --user-data-dir=/tmp/chrome-debug &');
    console.log('');
    console.log('2️⃣ 检查端口是否被占用：');
    console.log('   lsof -i :9222');
    console.log('');
    console.log('3️⃣ 验证Chrome调试接口：');
    console.log('   curl http://localhost:9222/json/version');
    console.log('');
    console.log('4️⃣ 检查防火墙设置：');
    console.log('   确保端口9222未被阻止');
    console.log('');
}

// 主执行函数
async function main() {
    try {
        const chromeUrl = await testChromeConnection();
        
        if (chromeUrl) {
            console.log('\n🎉 所有测试通过！');
            console.log(`✅ Chrome可用地址: ${chromeUrl}`);
        } else {
            console.log('\n❌ Chrome连接测试失败');
            showUsageInstructions();
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 测试过程中发生错误:');
        console.error(error.message);
        console.error(error.stack);
        showUsageInstructions();
        process.exit(1);
    }
}

main(); 