# Chrome调试MCP服务器使用示例

## 快速开始示例

### 1. 基础网页浏览示例 (推荐方式)

```bash
# 1. 启动Chrome（重要！）
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug

# 2. 直接使用npx启动MCP服务器
npx chrome-debug-mcp
```

### 2. 本地开发方式

```bash
# 1. 启动Chrome（重要！）
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug

# 2. 在新终端中启动MCP服务器
git clone https://github.com/rainmenxia/chrome-debug-mcp.git
cd chrome-debug-mcp
npm install
npm run build
npm start
```

### 3. 与AI助手集成示例

在支持MCP的AI助手中（如Claude Desktop），配置服务器：

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

或者使用本地版本：

```json
{
  "mcpServers": {
    "browser-automation": {
      "command": "node",
      "args": ["/Users/你的用户名/path/to/chrome-debug-mcp/build/index.js"]
    }
  }
}
```

然后可以对AI说：

```
请帮我打开百度，搜索"天气预报"

AI会自动调用:
1. launch_browser - 连接Chrome
2. navigate_to - 打开百度
3. click - 点击搜索框
4. type_text - 输入"天气预报"
5. click - 点击搜索按钮
```

## 社交媒体自动化示例

### 1. 微博发布内容（需要先手动登录）

```bash
# 在Chrome中手动登录微博 https://weibo.com
# 然后使用MCP工具：

1. launch_browser()  # 连接已登录的Chrome
2. navigate_to("https://weibo.com")  # 导航到微博
3. click("发微博按钮坐标")  # 点击发微博
4. type_text("今天天气真好！")  # 输入内容
5. click("发布按钮坐标")  # 发布
```

### 2. 淘宝商品监控示例

```bash
# 先在Chrome中登录淘宝
# 然后监控商品价格：

1. launch_browser()
2. navigate_to("商品页面URL")
3. get_page_content()  # 获取页面内容
4. # AI解析价格信息
5. # 设置定时任务重复检查
```

## 实际操作流程

### 完整的电商操作示例

```python
# 这是概念性的流程，实际通过MCP工具调用

# 1. 连接浏览器
launch_browser()

# 2. 打开电商网站（已保持登录状态）
navigate_to("https://www.taobao.com")

# 3. 搜索商品
click("120,50")  # 搜索框坐标
type_text("iPhone 15")

# 4. 点击搜索
click("200,50")  # 搜索按钮坐标

# 5. 筛选结果
click("300,200")  # 价格筛选
click("400,250")  # 品牌筛选

# 6. 查看商品详情
click("商品图片坐标")

# 7. 获取页面信息
content = get_page_content()

# 8. 截图保存
# 每次操作都会自动截图
```

## Docker环境示例

### 1. 启动Docker Chrome

```bash
# 创建Docker容器运行Chrome
docker run -d --name chrome-headless \
  -p 9222:9222 \
  --shm-size=2gb \
  zenika/alpine-chrome \
  --no-sandbox \
  --disable-dev-shm-usage \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --disable-web-security

# 验证Chrome是否启动
curl http://localhost:9222/json/version
```

### 2. 连接Docker Chrome

```bash
# MCP服务器会自动发现Docker中的Chrome
launch_browser()  # 自动连接到Docker Chrome

# 或者明确指定Docker主机
launch_browser(remote_host="http://localhost:9222")
```

## 高级使用技巧

### 1. 批量操作示例

```bash
# 批量处理多个页面
for url in ["page1", "page2", "page3"]:
    navigate_to(url)
    # AI分析页面内容
    content = get_page_content()
    # 执行特定操作
    click("specific_element")
    type_text("批量输入内容")
```

### 2. 智能等待和重试

```bash
# MCP服务器内置智能等待
navigate_to("动态加载页面") 
# 自动等待页面完全加载后返回截图

# 如果操作失败，可以重试
try:
    click("可能不存在的元素")
except:
    scroll_down()  # 滚动后重试
    click("元素")
```

### 3. 多标签页管理

```bash
# 智能标签页复用
navigate_to("https://example.com/page1")  # 新标签页
navigate_to("https://example.com/page2")  # 复用同域名标签页
navigate_to("https://other.com")          # 新标签页（不同域名）
```

## 调试技巧

### 1. 查看操作结果

每次操作都会返回：
- ✅ 成功/失败状态
- 🖼️ 当前页面截图  
- 📝 浏览器控制台日志
- 🌐 当前URL
- 🖱️ 鼠标位置

### 2. 错误排查

```bash
# 如果连接失败
1. 检查Chrome是否以调试模式启动
2. 验证端口9222是否可访问: curl localhost:9222
3. 查看MCP服务器日志

# 如果操作无响应
1. 检查坐标是否正确
2. 确认页面是否完全加载
3. 尝试滚动到目标元素
```

### 3. 性能优化

```bash
# 减少不必要的截图
get_page_content()  # 只获取内容，不截图

# 调整浏览器窗口大小优化性能  
resize_browser("800,600")  # 较小窗口加载更快

# 批量操作时复用连接
launch_browser()  # 只需要启动一次
# ... 执行多个操作 ...
close_browser()   # 最后关闭
```

## 注意事项

1. **隐私安全**: 服务器会接管Chrome会话，请确保在安全环境中使用
2. **网站政策**: 遵守目标网站的服务条款和robots.txt
3. **性能影响**: 长时间运行可能影响浏览器性能，建议定期重启
4. **错误处理**: 网络问题可能导致操作失败，建议加入重试逻辑

## 扩展开发

如需添加新功能，可以修改 `src/index.ts` 中的工具定义：

```typescript
// 添加新工具示例
{
  name: "wait_for_element",
  description: "等待特定元素出现",
  inputSchema: {
    type: "object", 
    properties: {
      selector: { type: "string" }
    }
  }
}
```

然后在 `src/browserSession.ts` 中实现对应方法。 