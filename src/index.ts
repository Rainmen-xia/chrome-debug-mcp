#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	Tool,
	CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { BrowserSession } from "./browserSession.js";

/**
 * MCP浏览器自动化服务器
 * 提供Chrome调试端口连接和浏览器操作功能
 */
class BrowserMCPServer {
	private server: Server;
	private browserSession: BrowserSession;

	constructor() {
		this.server = new Server(
			{
				name: "browser-automation-server",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {},
				},
			}
		);

		this.browserSession = new BrowserSession();
		this.setupToolHandlers();
		this.setupErrorHandling();
	}

	/**
	 * 设置工具处理器
	 */
	private setupToolHandlers(): void {
		// 注册工具列表处理器
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			return {
				tools: [
					{
						name: "launch_browser",
						description: "启动浏览器连接，连接到Chrome调试端口以保持登录状态",
						inputSchema: {
							type: "object",
							properties: {
								remote_host: {
									type: "string",
									description: "可选的远程Chrome主机URL (例如: http://localhost:9222)",
								},
							},
						},
					},
					{
						name: "close_browser",
						description: "关闭浏览器连接",
						inputSchema: {
							type: "object",
							properties: {},
						},
					},
					{
						name: "navigate_to",
						description: "导航到指定URL，智能管理标签页（相同域名复用标签页）",
						inputSchema: {
							type: "object",
							properties: {
								url: {
									type: "string",
									description: "要导航到的URL",
								},
							},
							required: ["url"],
						},
					},
					{
						name: "click",
						description: "在指定坐标位置点击",
						inputSchema: {
							type: "object",
							properties: {
								coordinate: {
									type: "string",
									description: "点击位置的坐标，格式为 'x,y'",
								},
							},
							required: ["coordinate"],
						},
					},
					{
						name: "type_text",
						description: "输入文本内容",
						inputSchema: {
							type: "object",
							properties: {
								text: {
									type: "string",
									description: "要输入的文本内容",
								},
							},
							required: ["text"],
						},
					},
					{
						name: "scroll_down",
						description: "向下滚动页面一个视口高度",
						inputSchema: {
							type: "object",
							properties: {},
						},
					},
					{
						name: "scroll_up",
						description: "向上滚动页面一个视口高度",
						inputSchema: {
							type: "object",
							properties: {},
						},
					},
					{
						name: "hover",
						description: "将鼠标悬停在指定坐标位置",
						inputSchema: {
							type: "object",
							properties: {
								coordinate: {
									type: "string",
									description: "悬停位置的坐标，格式为 'x,y'",
								},
							},
							required: ["coordinate"],
						},
					},
					{
						name: "resize_browser",
						description: "调整浏览器窗口大小",
						inputSchema: {
							type: "object",
							properties: {
								size: {
									type: "string",
									description: "窗口大小，格式为 'width,height'",
								},
							},
							required: ["size"],
						},
					},
					{
						name: "get_page_content",
						description: "获取当前页面的HTML内容",
						inputSchema: {
							type: "object",
							properties: {},
						},
					},
				] as Tool[],
			};
		});

		// 注册工具调用处理器
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;

			try {
				let result;

				switch (name) {
					case "launch_browser":
						result = await this.browserSession.launchBrowser(args?.remote_host as string);
						break;

					case "close_browser":
						result = await this.browserSession.closeBrowser();
						break;

					case "navigate_to":
						if (!args?.url) {
							throw new Error("URL参数是必需的");
						}
						result = await this.browserSession.navigateToUrl(args.url as string);
						break;

					case "click":
						if (!args?.coordinate) {
							throw new Error("coordinate参数是必需的");
						}
						result = await this.browserSession.click(args.coordinate as string);
						break;

					case "type_text":
						if (!args?.text) {
							throw new Error("text参数是必需的");
						}
						result = await this.browserSession.type(args.text as string);
						break;

					case "scroll_down":
						result = await this.browserSession.scrollDown();
						break;

					case "scroll_up":
						result = await this.browserSession.scrollUp();
						break;

					case "hover":
						if (!args?.coordinate) {
							throw new Error("coordinate参数是必需的");
						}
						result = await this.browserSession.hover(args.coordinate as string);
						break;

					case "resize_browser":
						if (!args?.size) {
							throw new Error("size参数是必需的");
						}
						result = await this.browserSession.resize(args.size as string);
						break;

					case "get_page_content":
						result = await this.browserSession.getPageContent();
						break;

					default:
						throw new Error(`未知工具: ${name}`);
				}

				// 构建响应内容
				const content = [];
				
				if (result.error) {
					content.push({
						type: "text" as const,
						text: `错误: ${result.error}`,
					});
				} else {
					// 添加成功消息
					content.push({
						type: "text" as const,
						text: this.getSuccessMessage(name, result),
					});

					// 如果有截图，添加截图
					if (result.screenshot) {
						// 从data URL中提取纯Base64数据和MIME类型
						const dataUrlMatch = result.screenshot.match(/^data:image\/([^;]+);base64,(.+)$/);
						if (dataUrlMatch) {
							const [, imageType, base64Data] = dataUrlMatch;
							content.push({
								type: "image" as const,
								data: base64Data, // 只传递纯Base64数据，不包含data URL前缀
								mimeType: `image/${imageType}`,
							});
						} else {
							// 如果不是标准的data URL格式，直接使用原始数据
							content.push({
								type: "image" as const,
								data: result.screenshot,
								mimeType: "image/png", // 默认类型
							});
						}
					}

					// 如果有日志，添加日志
					if (result.logs && result.logs.trim()) {
						content.push({
							type: "text" as const,
							text: `日志信息:\n${result.logs}`,
						});
					}
				}

				return {
					content,
					isError: !!result.error,
				} as CallToolResult;

			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				return {
					content: [
						{
							type: "text" as const,
							text: `执行工具 "${name}" 时发生错误: ${errorMessage}`,
						},
					],
					isError: true,
				} as CallToolResult;
			}
		});
	}

	/**
	 * 根据工具名称和结果生成成功消息
	 */
	private getSuccessMessage(toolName: string, result: any): string {
		switch (toolName) {
			case "launch_browser":
				return "✅ 浏览器连接成功建立";
			case "close_browser":
				return "✅ 浏览器连接已关闭";
			case "navigate_to":
				return `✅ 成功导航到: ${result.currentUrl || "目标页面"}`;
			case "click":
				return `✅ 点击操作完成${result.currentMousePosition ? ` (位置: ${result.currentMousePosition})` : ""}`;
			case "type_text":
				return "✅ 文本输入完成";
			case "scroll_down":
				return "✅ 向下滚动完成";
			case "scroll_up":
				return "✅ 向上滚动完成";
			case "hover":
				return `✅ 悬停操作完成${result.currentMousePosition ? ` (位置: ${result.currentMousePosition})` : ""}`;
			case "resize_browser":
				return "✅ 浏览器窗口大小调整完成";
			case "get_page_content":
				return "✅ 页面内容获取完成";
			default:
				return "✅ 操作完成";
		}
	}

	/**
	 * 设置错误处理
	 */
	private setupErrorHandling(): void {
		this.server.onerror = (error) => {
			console.error("[MCP服务器错误]", error);
		};

		process.on("SIGINT", async () => {
			console.log("\n正在关闭MCP服务器...");
			await this.browserSession.closeBrowser();
			process.exit(0);
		});

		process.on("SIGTERM", async () => {
			console.log("\n正在关闭MCP服务器...");
			await this.browserSession.closeBrowser();
			process.exit(0);
		});
	}

	/**
	 * 启动服务器
	 */
	async run(): Promise<void> {
		const transport = new StdioServerTransport();
		console.error("MCP浏览器自动化服务器启动中...");
		await this.server.connect(transport);
		console.error("✅ MCP服务器已启动，等待连接...");
	}
}

// 启动服务器
const server = new BrowserMCPServer();
server.run().catch((error) => {
	console.error("启动服务器失败:", error);
	process.exit(1);
}); 