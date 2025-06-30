# MCP浏览器服务器调试指南

## 🚀 快速开始

如果你遇到问题，请按照以下步骤进行调试：

### 1. 环境检查

```bash
# 检查环境是否正确配置
node debug/debug-utils.js --check
```

### 2. Chrome连接测试

```bash
# 测试Chrome调试端口连接
npm run test-chrome
```

### 3. Base64编码测试

```bash
# 专门测试截图Base64编码问题
npm run test-base64
```

### 4. 完整MCP服务器测试

```bash
# 测试完整的MCP协议通信
npm run test
```

## 🛠️ 调试工具说明

### 1. Chrome连接测试 (`test-chrome-connection.js`)

**用途**: 验证Chrome调试端口连接和截图功能
**命令**: `npm run test-chrome`

**测试内容**:
- 检测常见调试端口 (9222, 9223, 9224)
- 自动发现Chrome实例
- WebSocket连接测试
- 截图功能验证
- Base64格式检查

**常见问题**:
- Chrome未启动调试模式 → 运行 `./start-chrome-debug.sh`
- 端口被占用 → 检查 `lsof -i :9222`
- 防火墙阻止 → 检查防火墙设置

### 2. MCP协议测试 (`test-mcp-server.js`)

**用途**: 测试完整的MCP服务器功能和工具调用
**命令**: `npm run test`

**测试内容**:
- 工具列表查询
- 浏览器启动连接
- 页面导航
- 页面内容获取
- 浏览器关闭

**输出信息**:
- 📤 发送的请求
- 📥 收到的响应
- ✅/❌ 测试结果
- 📊 成功率统计

### 3. Base64编码测试 (`test-base64.js`)

**用途**: 专门诊断截图Base64编码问题
**命令**: `npm run test-base64`

**测试内容**:
- 不同图片格式测试 (WebP, PNG, JPEG)
- 不同质量设置测试
- Base64格式验证
- MCP数据URL格式检查
- 文件保存和解码测试

**生成文件**:
- `debug/test-screenshot-*.txt` - Base64文本
- `debug/test-screenshot-*.webp/png/jpeg` - 解码后的图片

### 4. 综合调试工具 (`debug-utils.js`)

**用途**: 提供所有调试功能的统一入口
**命令**: `node debug/debug-utils.js`

**功能**:
- 交互式调试模式
- 环境检查
- 工具快捷执行
- 使用说明

## 🔍 调试模式

### 1. 标准调试模式

```bash
# 启动Node.js调试器
npm run debug

# 然后在Chrome中打开: chrome://inspect
# 或在VS Code中attach到调试进程
```

### 2. 详细日志模式

```bash
# 启动详细日志输出
npm run debug-verbose

# 查看所有调试信息
DEBUG=* npm start
```

### 3. 交互式调试

```bash
# 启动交互式调试工具
node debug/debug-utils.js

# 或指定具体功能
node debug/debug-utils.js --check
node debug/debug-utils.js --chrome
node debug/debug-utils.js --base64
```

## 🚨 常见问题排查

### Chrome连接失败

**症状**: `❌ 连接失败: http://localhost:9222`

**解决方案**:
1. 确保Chrome以调试模式启动:
   ```bash
   ./start-chrome-debug.sh
   ```

2. 检查端口是否被占用:
   ```bash
   lsof -i :9222
   ```

3. 验证Chrome调试接口:
   ```bash
   curl http://localhost:9222/json/version
   ```

4. 检查防火墙设置

### Base64验证错误

**症状**: `❌ Base64格式验证失败`

**解决方案**:
1. 运行专门的Base64测试:
   ```bash
   npm run test-base64
   ```

2. 检查生成的测试文件:
   ```bash
   ls -la debug/test-screenshot-*
   ```

3. 尝试不同的截图格式和质量设置

4. 查看错误分析输出

### MCP通信失败

**症状**: `请求超时` 或 `JSON解析错误`

**解决方案**:
1. 检查MCP服务器是否正常启动:
   ```bash
   npm run test
   ```

2. 验证JSON格式:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node build/index.js
   ```

3. 使用详细日志模式:
   ```bash
   npm run debug-verbose
   ```

### 性能问题

**症状**: 响应缓慢或超时

**解决方案**:
1. 减小浏览器窗口大小:
   ```javascript
   resize_browser("800,600")
   ```

2. 降低截图质量:
   ```javascript
   // 在browserSession.ts中调整
   quality: 50  // 降低质量
   ```

3. 检查网络连接和资源使用

## 📊 调试日志分析

### 理解日志输出

```
🔍 服务器信息: MCP浏览器自动化服务器启动中...
✅ 服务器启动完成
📤 发送测试 "工具列表查询": {...}
📥 收到响应: {...}
✅ 测试通过: 工具列表查询
```

### 关键日志标识

- 🔍 **服务器信息**: 服务器状态日志
- 📤 **发送请求**: 客户端向服务器发送的请求
- 📥 **收到响应**: 服务器返回的响应
- ✅ **测试通过**: 成功的操作
- ❌ **测试失败**: 失败的操作
- 🚨 **警告信息**: 需要注意的问题

## 🔧 高级调试技巧

### 1. 自定义测试

创建自己的测试脚本:

```javascript
// debug/my-custom-test.js
import { BrowserSession } from '../build/browserSession.js';

const session = new BrowserSession();
await session.launchBrowser();
// 添加你的测试逻辑
```

### 2. 条件断点

在关键位置添加条件断点:

```javascript
// 在src/browserSession.ts中
if (process.env.DEBUG_SCREENSHOTS) {
    console.log('截图数据:', screenshot.substring(0, 100));
}
```

### 3. 内存和性能监控

```bash
# 启用Node.js性能监控
node --inspect --trace-warnings build/index.js
```

## 📞 获取帮助

如果以上方法都无法解决问题:

1. 查看 `README.md` 的详细说明
2. 阅读 `ARCHITECTURE.md` 了解技术架构
3. 查看 `example-usage.md` 的使用示例
4. 检查GitHub Issues中的类似问题

## 🎯 调试检查清单

在报告问题前，请确认已完成:

- [ ] 运行环境检查: `node debug/debug-utils.js --check`
- [ ] Chrome连接测试: `npm run test-chrome`
- [ ] Base64编码测试: `npm run test-base64`
- [ ] MCP服务器测试: `npm run test`
- [ ] 查看了详细日志: `npm run debug-verbose`
- [ ] 尝试了不同的配置设置
- [ ] 检查了生成的调试文件 