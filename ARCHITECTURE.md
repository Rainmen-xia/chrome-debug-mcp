# MCP浏览器自动化服务器 - 技术架构

## 概述

本项目将原有的VSCode扩展中的浏览器自动化功能抽象成了一个独立的MCP (Model Context Protocol) 服务器，实现了真正的"带登录态"浏览器自动化。

## 核心设计理念

### 1. 登录态保持 (Session Persistence)
- **问题**: 传统浏览器自动化工具每次启动都是全新会话，无法保持登录状态
- **解决方案**: 连接现有Chrome实例的调试端口，复用用户已登录的会话
- **技术实现**: Chrome DevTools Protocol + WebSocket连接

### 2. 智能浏览器发现 (Smart Browser Discovery)
- **本地发现**: 自动检测localhost:9222等常见端口
- **Docker支持**: 通过host.docker.internal发现容器中的Chrome
- **网络扫描**: 在特定网络范围内查找可用Chrome实例
- **连接缓存**: 记住成功的连接端点，加快后续连接

### 3. MCP协议集成 (MCP Protocol Integration)
- **stdio传输**: 使用标准输入输出与外部程序通信
- **工具化接口**: 将浏览器操作封装成标准MCP工具
- **类型安全**: 基于JSON Schema的参数验证

## 架构组件

```
┌─────────────────┐    stdio    ┌──────────────────┐    WebSocket    ┌─────────────────┐
│   MCP Client    │◄──────────►│  MCP Server      │◄───────────────►│  Chrome Browser │
│  (AI Assistant) │             │  (This Project)  │                 │  (Debug Mode)   │
└─────────────────┘             └──────────────────┘                 └─────────────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │ Browser Session  │
                                │   Manager        │
                                └──────────────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │ Browser Discovery│
                                │    Service       │
                                └──────────────────┘
```

## 文件结构说明

### 核心模块

#### `src/index.ts` - MCP服务器主控制器
- **职责**: MCP协议处理、工具注册、请求路由
- **关键特性**:
  - 实现标准MCP服务器接口
  - 定义10个浏览器自动化工具
  - 错误处理和优雅关闭
  - 支持图像和文本响应

#### `src/browserSession.ts` - 浏览器会话管理器
- **职责**: 浏览器连接管理、页面操作执行
- **关键特性**:
  - Chrome调试端口连接
  - 智能标签页管理（同域名复用）
  - 自动等待页面加载完成
  - 网络活动监控
  - 实时截图和日志收集

#### `src/browserDiscovery.ts` - 浏览器发现服务
- **职责**: 自动发现可用的Chrome实例
- **关键特性**:
  - 多环境支持（本地、Docker、远程）
  - 端口可用性检测
  - DNS解析（host.docker.internal）
  - 网络范围扫描

### 配置文件

#### `package.json`
- **运行时**: Node.js ESM模块
- **核心依赖**: 
  - `@modelcontextprotocol/sdk`: MCP协议实现
  - `puppeteer-core`: Chrome DevTools Protocol客户端
  - `axios`: HTTP请求处理
  - `p-wait-for`: 异步等待工具

#### `tsconfig.json`
- **目标**: ES2022 + ESNext模块
- **输出**: build/目录，包含类型定义和源码映射

## 工具API设计

### 连接管理工具
- `launch_browser`: 建立与Chrome的连接
- `close_browser`: 断开连接并清理资源

### 导航控制工具
- `navigate_to`: 智能URL导航（同域名标签页复用）

### 交互操作工具
- `click`: 坐标点击（支持网络活动监控）
- `type_text`: 文本输入
- `hover`: 鼠标悬停

### 页面控制工具
- `scroll_up/scroll_down`: 页面滚动
- `resize_browser`: 窗口大小调整
- `get_page_content`: HTML内容获取

## 技术实现细节

### 1. Chrome调试端口连接机制

```typescript
// 连接到Chrome调试端口
const browser = await connect({
    browserURL: chromeHostUrl,  // http://localhost:9222
    defaultViewport: { width: 1200, height: 800 }
});
```

**关键点**:
- 使用WebSocket协议通信
- 支持远程Chrome实例
- 保持现有用户会话

### 2. 智能标签页管理

```typescript
// 域名提取和比较
private getRootDomain(url: string): string {
    return new URL(url).host.replace(/^www\./, "");
}

// 标签页复用逻辑
if (existingPage && sameDomain) {
    this.page = existingPage;  // 复用现有标签页
} else {
    this.page = await browser.newPage();  // 创建新标签页
}
```

**优势**:
- 避免重复打开相同网站
- 保持网站内导航的连续性
- 减少资源消耗

### 3. 页面加载等待策略

```typescript
// 多重等待机制
await page.goto(url, { 
    waitUntil: ["domcontentloaded", "networkidle2"] 
});
await this.waitTillHTMLStable(page);  // HTML大小稳定检测
```

**实现原理**:
- DOM内容加载完成
- 网络请求静默2秒
- HTML内容大小连续3次检查相同

### 4. 网络活动监控

```typescript
// 监控网络请求
page.on("request", () => { hasNetworkActivity = true });

// 操作后检查网络活动
if (hasNetworkActivity) {
    await page.waitForNavigation({ waitUntil: "networkidle2" });
}
```

**应用场景**:
- 点击按钮触发AJAX请求
- 表单提交导致页面跳转
- 动态内容加载

## 安全考虑

### 1. Chrome启动参数
```bash
--remote-debugging-port=9222    # 启用调试端口
--user-data-dir=/tmp/chrome-debug  # 独立用户数据目录
--disable-web-security         # 禁用同源策略（仅开发环境）
```

### 2. 网络访问控制
- 仅连接本地Chrome实例（默认）
- Docker环境需要明确配置
- 不支持未授权的远程连接

### 3. 数据隔离
- 使用临时用户数据目录
- 不影响用户正常的Chrome配置
- 调试会话与正常会话分离

## 性能优化

### 1. 连接复用
- 缓存成功的Chrome连接端点
- 避免重复发现过程
- 连接保持时间：1小时

### 2. 截图优化
- WebP格式优先（更小体积）
- PNG格式备用（兼容性）
- Base64编码传输

### 3. 内存管理
- 及时清理事件监听器
- 页面关闭时释放资源
- 浏览器连接优雅断开

## 扩展性设计

### 1. 新工具添加
```typescript
// 在src/index.ts中添加工具定义
{
    name: "new_tool",
    description: "新工具描述",
    inputSchema: { /* JSON Schema */ }
}

// 在src/browserSession.ts中添加实现
async newTool(params: any): Promise<BrowserActionResult> {
    // 实现逻辑
}
```

### 2. 多浏览器支持
- 抽象浏览器接口
- 支持Firefox、Safari等
- 统一的工具API

### 3. 云端部署
- Docker容器化
- Kubernetes集群部署
- 负载均衡和高可用

## 故障排除指南

### 常见问题

1. **连接失败**
   - 检查Chrome是否以调试模式启动
   - 验证端口9222可访问性
   - 确认防火墙设置

2. **操作超时**
   - 检查网络连接稳定性
   - 增加页面加载超时时间
   - 确认目标元素可见性

3. **截图失败**
   - 确认页面完全加载
   - 检查浏览器窗口大小
   - 尝试刷新页面

### 调试方法

1. **启用详细日志**
   ```bash
   DEBUG=mcp* npm start
   ```

2. **Chrome调试检查**
   ```bash
   curl -s http://localhost:9222/json/version
   ```

3. **MCP通信测试**
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node build/index.js
   ```

## 未来发展方向

### 短期目标
- [ ] 增加元素选择器支持（CSS Selector、XPath）
- [ ] 添加表单填写快捷工具
- [ ] 支持文件上传/下载操作

### 中期目标
- [ ] 多浏览器引擎支持
- [ ] 分布式部署方案
- [ ] 操作录制和回放功能

### 长期目标
- [ ] AI驱动的智能操作
- [ ] 可视化操作编辑器
- [ ] 企业级权限管理

---

**技术栈总结**:
- **语言**: TypeScript + Node.js
- **协议**: MCP (Model Context Protocol)
- **浏览器**: Chrome DevTools Protocol
- **传输**: stdio + WebSocket
- **构建**: tsc + npm scripts 