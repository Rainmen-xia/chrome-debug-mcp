# Chrome调试MCP服务器

**Language**: [English](README.md) | [中文](README.zh.md)

一个基于 Model Context Protocol (MCP) 的浏览器自动化服务器，专门用于连接 Chrome 调试端口，实现带登录状态的浏览器自动化操作。

## 🎯 项目优势

### 🚀 核心技术优势

1. **🔧 零依赖部署**
   - 无需安装任何Chrome扩展
   - 无需通过Chrome Web Store审批
   - 企业内网环境完全自主可控

2. **📦 容器化友好** 
   - 完美支持Docker/Kubernetes部署
   - 无扩展权限和安装问题
   - 适合云原生架构

3. **⚡ 两步启动**
   ```bash
   # 只需两条命令即可运行
   # 1. 启动Chrome调试模式
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   # 2. 运行MCP服务器
   npx chrome-debug-mcp
   ```

4. **🛡️ 企业级安全**
   - 基于标准Chrome DevTools Protocol
   - 无需第三方扩展权限
   - 完全本地化运行

## 🚀 快速开始

### 方式一：直接使用 (推荐)

使用 npx 一键启动，无需安装：

```bash
# 1. 启动Chrome调试模式
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# 2. 直接运行MCP服务器
npx chrome-debug-mcp
```

### 方式二：本地开发

```bash
git clone https://github.com/rainmenxia/chrome-debug-mcp.git
cd chrome-debug-mcp
npm install
npm run build
npm start
```

## 核心特性

- ✅ **Chrome调试端口连接**: 基于标准Chrome DevTools Protocol，无需安装扩展
- 🏢 **企业级部署友好**: 零依赖部署，无需Chrome Web Store审批
- 📱 **智能标签页管理**: 相同域名复用标签页，避免重复打开
- 🖼️ **实时截图反馈**: 每次操作后自动截图，提供可视化反馈
- 🌐 **网络活动监控**: 自动等待页面加载完成
- 🐳 **原生Docker支持**: 完美支持容器化Chrome实例，无扩展限制
- ⚡ **两步启动**: 启动Chrome调试模式后运行 `npx chrome-debug-mcp`，无需复杂安装
- 🔍 **智能浏览器发现**: 自动发现本地和Docker环境中的Chrome实例

## 安装配置

### 1. 启动Chrome调试模式 (必需)

服务器需要连接到带调试端口的Chrome实例：

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# Windows
chrome.exe --remote-debugging-port=9222 --user-data-dir=c:\temp\chrome-debug

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

**重要说明**: 
- `--user-data-dir` 参数指向一个临时目录，确保Chrome以调试模式启动
- 启动后可以正常登录各种网站，登录状态会保持
- 服务器会复用这个Chrome实例，无需重新登录

### 2. 配置MCP客户端

在您的MCP客户端配置中添加：

```json
{
  "mcpServers": {
    "browser-automation": {
      "command": "npx",
      "args": ["chrome-debug-mcp"]
    }
  }
}
```

或者使用本地安装版本：

```json
{
  "mcpServers": {
    "browser-automation": {
      "command": "node",
      "args": ["/path/to/chrome-debug-mcp/build/index.js"]
    }
  }
}
```

## 可用工具

### 1. launch_browser
启动浏览器连接，连接到Chrome调试端口。

```json
{
  "name": "launch_browser",
  "arguments": {
    "remote_host": "http://localhost:9222"  // 可选
  }
}
```

### 2. navigate_to
导航到指定URL，智能管理标签页。

```json
{
  "name": "navigate_to", 
  "arguments": {
    "url": "https://example.com"
  }
}
```

### 3. click
在指定坐标位置点击。

```json
{
  "name": "click",
  "arguments": {
    "coordinate": "100,200"
  }
}
```

### 4. type_text
输入文本内容。

```json
{
  "name": "type_text",
  "arguments": {
    "text": "Hello World"
  }
}
```

### 5. scroll_down / scroll_up
滚动页面。

```json
{
  "name": "scroll_down",
  "arguments": {}
}
```

### 6. hover
将鼠标悬停在指定位置。

```json
{
  "name": "hover",
  "arguments": {
    "coordinate": "100,200"
  }
}
```

### 7. resize_browser
调整浏览器窗口大小。

```json
{
  "name": "resize_browser",
  "arguments": {
    "size": "1200,800"
  }
}
```

### 8. get_page_content
获取当前页面HTML内容。

```json
{
  "name": "get_page_content",
  "arguments": {}
}
```

### 9. close_browser
关闭浏览器连接。

```json
{
  "name": "close_browser",
  "arguments": {}
}
```

## 典型使用场景

### 1. 社交媒体自动化
```bash
# 先在Chrome中手动登录Twitter/微博等
# 然后使用MCP工具进行自动化操作
launch_browser -> navigate_to -> click -> type_text
```

### 2. 电商操作
```bash
# 保持淘宝/京东登录状态
# 自动化商品搜索、价格监控等
launch_browser -> navigate_to -> type_text -> click
```

### 3. 数据抓取
```bash
# 需要登录的网站数据抓取
# 绕过登录验证，直接操作
launch_browser -> navigate_to -> get_page_content
```

## 高级特性

### 智能标签页管理
- 相同域名（如 `example.com`）会复用已存在的标签页
- 不同域名会自动创建新标签页
- 避免重复打开相同网站

### 自动等待机制
- 监控网络活动，等待页面完全加载
- HTML内容稳定性检测
- 自动处理动态内容加载

### 错误恢复
- 连接断开自动重连
- 缓存成功的连接端点
- 详细的错误日志和反馈

## Docker环境支持

如果Chrome运行在Docker容器中：

```bash
# Docker中启动Chrome
docker run -d --name chrome-debug \
  -p 9222:9222 \
  --shm-size=2gb \
  zenika/alpine-chrome \
  --no-sandbox \
  --disable-dev-shm-usage \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222
```

服务器会自动发现Docker环境中的Chrome实例。

## 故障排除

### Chrome连接失败
1. 确认Chrome使用 `--remote-debugging-port=9222` 启动
2. 检查端口9222是否被占用：`lsof -i :9222`
3. 确认Chrome没有其他实例在运行

### 操作超时
1. 检查网络连接
2. 增加页面加载超时时间
3. 确认目标网站可访问

### 截图失败
1. 确认页面已完全加载
2. 检查浏览器窗口大小设置
3. 尝试刷新页面后重新操作

## 技术架构

```
MCP客户端 ←→ stdio ←→ MCP服务器 ←→ Chrome调试端口 ←→ Chrome浏览器
```

- **传输协议**: stdio (标准输入输出)
- **浏览器引擎**: Puppeteer + Chrome DevTools Protocol
- **连接方式**: WebSocket (Chrome调试端口)
- **图像格式**: WebP/PNG base64编码

## 开发调试

```bash
# 监听模式编译
npm run dev

# 查看MCP通信日志
DEBUG=mcp* npm start
```

## 发布到npm

```bash
# 构建项目
npm run build

# 发布到npm
npm publish
```

## 致谢

本项目的设计理念和核心思路受到了 [RooCode](https://github.com/RooCodeInc/Roo-Code) 项目的启发。RooCode 是一个优秀的浏览器自动化MCP服务器实现，为我们提供了宝贵的技术参考和设计思路。

特别感谢 RooCode 团队在以下方面的贡献：
- 🎯 **MCP协议集成**: 提供了MCP服务器与浏览器自动化结合的技术方案
- 🔗 **浏览器连接**: 展示了如何优雅地管理浏览器连接和会话
- 📋 **工具API设计**: 为浏览器操作的标准化提供了参考框架

在 RooCode 的基础上，本项目进一步专注于**带登录状态的浏览器自动化**，通过连接现有Chrome调试端口来保持用户会话，实现了更贴近实际应用场景的自动化能力。

## 许可证

MIT License

---

**核心优势**: 这个MCP服务器的最大特点是能够连接到已有的Chrome实例并保持登录状态，非常适合需要用户认证的自动化场景。通过Chrome调试端口，可以接管用户已经登录的浏览器会话，实现真正的"带登录态"自动化操作。 