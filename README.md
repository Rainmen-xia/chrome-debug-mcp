# Chrome Debug MCP Server

**Language**: [English](README.md) | [中文](README.zh.md)

A Model Context Protocol (MCP) server for Chrome browser automation via debugging protocol, specifically designed to connect to Chrome debugging ports and enable browser automation with persistent login sessions.

## 🎯 Project Advantages

### 🚀 Core Technical Advantages

1. **🔧 Zero-Dependency Deployment**
   - No Chrome extensions required
   - No Chrome Web Store approval needed
   - Fully autonomous in enterprise environments

2. **📦 Container-Friendly** 
   - Perfect support for Docker/Kubernetes deployment
   - No extension permission or installation issues
   - Ideal for cloud-native architecture

3. **⚡ Two-Step Launch**
   ```bash
   # Launch with just two commands
   # 1. Start Chrome in debug mode
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   # 2. Run MCP server
   npx chrome-debug-mcp
   ```

4. **🛡️ Enterprise-Grade Security**
   - Based on standard Chrome DevTools Protocol
   - No third-party extension permissions required
   - Complete local operation

## 🚀 Quick Start

### Option 1: Direct Usage (Recommended)

Launch with npx - no installation required:

```bash
# 1. Start Chrome in debug mode
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# 2. Run MCP server directly
npx chrome-debug-mcp
```

### Option 2: Local Development

```bash
git clone https://github.com/rainmenxia/chrome-debug-mcp.git
cd chrome-debug-mcp
npm install
npm run build
npm start
```

## Core Features

- ✅ **Chrome Debug Port Connection**: Based on standard Chrome DevTools Protocol, no extensions required
- 🏢 **Enterprise-Grade Deployment**: Zero-dependency deployment, no Chrome Web Store approval needed
- 📱 **Intelligent Tab Management**: Reuse tabs for same domains, avoid duplicate openings
- 🖼️ **Real-time Screenshot Feedback**: Automatic screenshots after each operation for visual feedback
- 🌐 **Network Activity Monitoring**: Auto-wait for page load completion
- 🐳 **Native Docker Support**: Perfect support for containerized Chrome instances, no extension limitations
- ⚡ **Two-Step Launch**: Start Chrome in debug mode then run `npx chrome-debug-mcp`, no complex installation required
- 🔍 **Smart Browser Discovery**: Auto-discover Chrome instances in local and Docker environments

## Configuration & Usage

### 1. Start Chrome Debug Mode (Required)

The server needs to connect to a Chrome instance with debugging port enabled:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# Windows
chrome.exe --remote-debugging-port=9222 --user-data-dir=c:\temp\chrome-debug

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

**Important Notes**: 
- `--user-data-dir` parameter points to a temporary directory, ensuring Chrome starts in debug mode
- After startup, you can log into websites normally, and login sessions will be preserved
- The server will reuse this Chrome instance, no need to re-login

### 2. Configure MCP Client

Add the following configuration to your MCP client:

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

**That's it!** No installation, no downloads, no complex path configuration needed.

> 💡 **Alternative Installation Methods**:
> 
> **Global Installation**:
> ```bash
> npm install -g chrome-debug-mcp
> ```
> ```json
> {
>   "mcpServers": {
>     "browser-automation": {
>       "command": "chrome-debug-mcp"
>     }
>   }
> }
> ```
> 
> **Local Project Installation**:
> ```bash
> npm install chrome-debug-mcp
> ```
> ```json
> {
>   "mcpServers": {
>     "browser-automation": {
>       "command": "npx",
>       "args": ["chrome-debug-mcp"]
>     }
>   }
> }
> ```

## Available Tools

### 1. launch_browser
Connect to Chrome debug port and initialize browser session.

```json
{
  "name": "launch_browser",
  "arguments": {
    "remote_host": "http://localhost:9222"  // optional
  }
}
```

### 2. navigate_to
Navigate to specified URL with intelligent tab management.

```json
{
  "name": "navigate_to", 
  "arguments": {
    "url": "https://example.com"
  }
}
```

### 3. click
Click at specified coordinates.

```json
{
  "name": "click",
  "arguments": {
    "coordinate": "100,200"
  }
}
```

### 4. type_text
Input text content.

```json
{
  "name": "type_text",
  "arguments": {
    "text": "Hello World"
  }
}
```

### 5. scroll_down / scroll_up
Scroll the page.

```json
{
  "name": "scroll_down",
  "arguments": {}
}
```

### 6. hover
Hover mouse at specified position.

```json
{
  "name": "hover",
  "arguments": {
    "coordinate": "100,200"
  }
}
```

### 7. resize_browser
Resize browser window.

```json
{
  "name": "resize_browser",
  "arguments": {
    "size": "1200,800"
  }
}
```

### 8. get_page_content
Get current page HTML content.

```json
{
  "name": "get_page_content",
  "arguments": {}
}
```

### 9. close_browser
Close browser connection.

```json
{
  "name": "close_browser",
  "arguments": {}
}
```

## Typical Use Cases

### 1. Social Media Automation
```bash
# Manually log into Twitter/Weibo in Chrome first
# Then use MCP tools for automation
launch_browser -> navigate_to -> click -> type_text
```

### 2. E-commerce Operations
```bash
# Keep logged-in state for Taobao/JD
# Automate product search, price monitoring, etc.
launch_browser -> navigate_to -> type_text -> click
```

### 3. Data Scraping
```bash
# Scrape data from login-required websites
# Bypass login verification, direct operations
launch_browser -> navigate_to -> get_page_content
```

## Advanced Features

### Intelligent Tab Management
- Same domains (e.g., `example.com`) reuse existing tabs
- Different domains automatically create new tabs
- Avoid duplicate openings of same websites

### Auto-wait Mechanisms
- Monitor network activity, wait for complete page loading
- HTML content stability detection
- Automatic handling of dynamic content loading

### Error Recovery
- Auto-reconnect on connection drops
- Cache successful connection endpoints
- Detailed error logs and feedback

## Docker Environment Support

If Chrome runs in a Docker container:

```bash
# Start Chrome in Docker
docker run -d --name chrome-debug \
  -p 9222:9222 \
  --shm-size=2gb \
  zenika/alpine-chrome \
  --no-sandbox \
  --disable-dev-shm-usage \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222
```

The server will automatically discover Chrome instances in Docker environments.

## Troubleshooting

### Chrome Connection Failed
1. Confirm Chrome is started with `--remote-debugging-port=9222`
2. Check if port 9222 is occupied: `lsof -i :9222`
3. Ensure no other Chrome instances are running

### Operation Timeout
1. Check network connection
2. Increase page load timeout
3. Confirm target website is accessible

### Screenshot Failed
1. Confirm page is fully loaded
2. Check browser window size settings
3. Try refreshing page and retry operation

## Technical Architecture

```
MCP Client ←→ stdio ←→ MCP Server ←→ Chrome Debug Port ←→ Chrome Browser
```

- **Transport Protocol**: stdio (standard input/output)
- **Browser Engine**: Puppeteer + Chrome DevTools Protocol
- **Connection Method**: WebSocket (Chrome debug port)
- **Image Format**: WebP/PNG base64 encoding

## Development & Debugging

```bash
# Watch mode compilation
npm run dev

# View MCP communication logs
DEBUG=mcp* npm start
```

## Publishing to npm

```bash
# Build project
npm run build

# Publish to npm
npm publish
```

## Acknowledgments

This project's design philosophy and core concepts were inspired by the [RooCode](https://github.com/RooCodeInc/Roo-Code) project. RooCode is an excellent browser automation MCP server implementation that provided valuable technical references and design insights.

Special thanks to the RooCode team for their contributions in the following areas:
- 🎯 **MCP Protocol Integration**: Provided technical solutions for combining MCP servers with browser automation
- 🔗 **Browser Connection**: Demonstrated elegant browser connection and session management
- 📋 **Tool API Design**: Provided reference frameworks for standardizing browser operations

Building upon RooCode's foundation, this project further focuses on **browser automation with persistent login sessions**, achieving more practical automation capabilities by connecting to existing Chrome debug ports to maintain user sessions.

## License

MIT License

---

**Core Advantage**: The biggest feature of this MCP server is its ability to connect to existing Chrome instances and maintain login sessions, making it ideal for automation scenarios requiring user authentication. Through Chrome debug ports, it can take over user-logged browser sessions, achieving true "session-persistent" browser automation. 