import { Browser, Page, ScreenshotOptions, TimeoutError, connect } from "puppeteer-core";
import pWaitFor from "p-wait-for";
import delay from "delay";
import { discoverChromeHostUrl, tryChromeHostUrl } from "./browserDiscovery.js";

/**
 * 浏览器操作结果接口
 */
export interface BrowserActionResult {
	screenshot?: string;
	logs?: string;
	currentUrl?: string;
	currentMousePosition?: string;
	success?: boolean;
	error?: string;
}

/**
 * 浏览器会话管理类
 * 专门用于连接Chrome调试端口，保持登录状态
 */
export class BrowserSession {
	private browser?: Browser;
	private page?: Page;
	private currentMousePosition?: string;
	private lastConnectionAttempt?: number;
	private isUsingRemoteBrowser: boolean = false;
	private cachedChromeHostUrl?: string;

	constructor() {
		// 构造函数保持简单
	}

	/**
	 * 获取视口大小，默认值
	 */
	private getViewport() {
		return { width: 1200, height: 800 };
	}

	/**
	 * 使用Chrome主机URL连接浏览器
	 */
	private async connectWithChromeHostUrl(chromeHostUrl: string): Promise<boolean> {
		try {
			this.browser = await connect({
				browserURL: chromeHostUrl,
				defaultViewport: this.getViewport(),
			});

			// 缓存成功的端点
			console.log(`连接到远程浏览器: ${chromeHostUrl}`);
			this.cachedChromeHostUrl = chromeHostUrl;
			this.lastConnectionAttempt = Date.now();
			this.isUsingRemoteBrowser = true;

			return true;
		} catch (error) {
			console.log(`使用WebSocket端点连接失败: ${error}`);
			return false;
		}
	}

	/**
	 * 尝试连接到远程浏览器
	 */
	private async connectToRemoteBrowser(remoteBrowserHost?: string): Promise<boolean> {
		// 如果提供了远程浏览器主机，先尝试连接
		if (remoteBrowserHost) {
			console.log(`尝试连接到远程浏览器: ${remoteBrowserHost}`);
			try {
				const hostIsValid = await tryChromeHostUrl(remoteBrowserHost);

				if (!hostIsValid) {
					throw new Error("在响应中找不到chromeHostUrl");
				}

				console.log(`找到WebSocket端点: ${remoteBrowserHost}`);

				if (await this.connectWithChromeHostUrl(remoteBrowserHost)) {
					return true;
				}
			} catch (error) {
				console.error(`连接到远程浏览器失败: ${error}`);
				// 如果远程连接失败，回退到自动发现
			}
		}

		// 尝试使用缓存的端点（如果存在且不太旧）
		if (this.cachedChromeHostUrl && this.lastConnectionAttempt && Date.now() - this.lastConnectionAttempt < 3_600_000) {
			console.log(`尝试使用缓存的Chrome主机URL: ${this.cachedChromeHostUrl}`);
			if (await this.connectWithChromeHostUrl(this.cachedChromeHostUrl)) {
				return true;
			}
			// 清除无效的缓存端点
			this.cachedChromeHostUrl = undefined;
		}

		try {
			console.log("尝试浏览器自动发现...");
			const chromeHostUrl = await discoverChromeHostUrl();

			if (chromeHostUrl && (await this.connectWithChromeHostUrl(chromeHostUrl))) {
				return true;
			}
		} catch (error) {
			console.error(`自动发现失败: ${error}`);
		}

		return false;
	}

	/**
	 * 启动浏览器连接
	 */
	async launchBrowser(remoteBrowserHost?: string): Promise<BrowserActionResult> {
		console.log("启动浏览器连接");

		if (this.browser) {
			await this.closeBrowser();
		}

		const remoteConnected = await this.connectToRemoteBrowser(remoteBrowserHost);

		if (!remoteConnected) {
			return {
				success: false,
				error: "无法连接到Chrome调试端口。请确保Chrome以 --remote-debugging-port=9222 参数启动"
			};
		}

		return { success: true };
	}

	/**
	 * 关闭浏览器连接并重置状态
	 */
	async closeBrowser(): Promise<BrowserActionResult> {
		if (this.browser || this.page) {
			console.log("关闭浏览器连接...");

			if (this.isUsingRemoteBrowser && this.browser) {
				await this.browser.disconnect().catch(() => {});
			} else {
				await this.browser?.close().catch(() => {});
			}
			this.resetBrowserState();
		}
		return { success: true };
	}

	/**
	 * 重置所有浏览器状态变量
	 */
	private resetBrowserState(): void {
		this.browser = undefined;
		this.page = undefined;
		this.currentMousePosition = undefined;
		this.isUsingRemoteBrowser = false;
	}

	/**
	 * 执行浏览器操作的通用方法
	 */
	async doAction(action: (page: Page) => Promise<void>): Promise<BrowserActionResult> {
		if (!this.page) {
			return {
				success: false,
				error: "浏览器未启动。请先调用 launch_browser 工具。"
			};
		}

		const logs: string[] = [];
		let lastLogTs = Date.now();

		const consoleListener = (msg: any) => {
			if (msg.type() === "log") {
				logs.push(msg.text());
			} else {
				logs.push(`[${msg.type()}] ${msg.text()}`);
			}
			lastLogTs = Date.now();
		};

		const errorListener = (err: Error) => {
			logs.push(`[页面错误] ${err.toString()}`);
			lastLogTs = Date.now();
		};

		// 添加监听器
		this.page.on("console", consoleListener);
		this.page.on("pageerror", errorListener);

		try {
			await action(this.page);
		} catch (err) {
			if (!(err instanceof TimeoutError)) {
				logs.push(`[错误] ${err instanceof Error ? err.message : String(err)}`);
			}
			return {
				success: false,
				error: err instanceof Error ? err.message : String(err),
				logs: logs.join("\n")
			};
		}

		// 等待控制台静默，设置超时
		await pWaitFor(() => Date.now() - lastLogTs >= 500, {
			timeout: 3_000,
			interval: 100,
		}).catch(() => {});

		// 截图配置
		let options: ScreenshotOptions = {
			encoding: "base64",
		};

		let screenshotBase64 = await this.page.screenshot({
			...options,
			type: "webp",
			quality: 75,
		}).catch(() => null);
		
		let screenshot = screenshotBase64 ? `data:image/webp;base64,${screenshotBase64}` : undefined;

		if (!screenshotBase64) {
			console.log("webp截图失败，尝试png");
			screenshotBase64 = await this.page.screenshot({
				...options,
				type: "png",
			}).catch(() => null);
			screenshot = screenshotBase64 ? `data:image/png;base64,${screenshotBase64}` : undefined;
		}

		// 移除监听器
		this.page.off("console", consoleListener);
		this.page.off("pageerror", errorListener);

		return {
			success: true,
			screenshot,
			logs: logs.join("\n"),
			currentUrl: this.page.url(),
			currentMousePosition: this.currentMousePosition,
		};
	}

	/**
	 * 从URL中提取根域名
	 */
	private getRootDomain(url: string): string {
		try {
			const urlObj = new URL(url);
			// 移除www.前缀（如果存在）
			return urlObj.host.replace(/^www\./, "");
		} catch (error) {
			// 如果URL解析失败，返回原始URL
			return url;
		}
	}

	/**
	 * 使用标准加载选项导航到URL
	 */
	private async navigatePageToUrl(page: Page, url: string): Promise<void> {
		// 增加超时时间到15秒，使用更宽松的等待条件
		await page.goto(url, { 
			timeout: 15_000, 
			waitUntil: ["domcontentloaded", "networkidle2"] 
		}).catch(async (error) => {
			// 如果networkidle2失败，尝试仅等待domcontentloaded
			console.log(`网络静默等待失败，尝试仅等待DOM加载: ${error.message}`);
			await page.goto(url, { 
				timeout: 15_000, 
				waitUntil: ["domcontentloaded"] 
			});
		});
		await this.waitTillHTMLStable(page);
	}

	/**
	 * 创建新标签页并导航到指定URL
	 */
	private async createNewTab(url: string): Promise<BrowserActionResult> {
		if (!this.browser) {
			return {
				success: false,
				error: "浏览器未启动"
			};
		}

		// 创建新页面
		const newPage = await this.browser.newPage();

		// 设置新页面为活动页面
		this.page = newPage;

		// 导航到URL
		const result = await this.doAction(async (page) => {
			await this.navigatePageToUrl(page, url);
		});

		return result;
	}

	/**
	 * 导航到URL
	 */
	async navigateToUrl(url: string): Promise<BrowserActionResult> {
		if (!this.browser) {
			return {
				success: false,
				error: "浏览器未启动"
			};
		}

		// 移除尾部斜杠进行比较
		const normalizedNewUrl = url.replace(/\/$/, "");

		// 从URL中提取根域名
		const rootDomain = this.getRootDomain(normalizedNewUrl);

		// 获取所有当前页面
		const pages = await this.browser.pages();

		// 尝试找到具有相同根域名的页面
		let existingPage: Page | undefined;

		for (const page of pages) {
			try {
				const pageUrl = page.url();
				if (pageUrl && this.getRootDomain(pageUrl) === rootDomain) {
					existingPage = page;
					break;
				}
			} catch (error) {
				// 跳过可能已关闭或有错误的页面
				console.log(`检查页面URL时出错: ${error}`);
				continue;
			}
		}

		if (existingPage) {
			// 存在具有相同根域名的标签页，切换到它
			console.log(`域名 ${rootDomain} 的标签页已存在，切换到它`);

			// 更新活动页面
			this.page = existingPage;
			existingPage.bringToFront();

			// 如果URL不同则导航到新URL
			const currentUrl = existingPage.url().replace(/\/$/, ""); // 如果存在，移除尾部/
			if (this.getRootDomain(currentUrl) === rootDomain && currentUrl !== normalizedNewUrl) {
				console.log(`导航到新URL: ${normalizedNewUrl}`);
				// 导航到新URL
				return this.doAction(async (page) => {
					await this.navigatePageToUrl(page, normalizedNewUrl);
				});
			} else {
				console.log(`域名 ${rootDomain} 的标签页已存在，且URL相同: ${normalizedNewUrl}`);
				// URL相同，只需重新加载页面以确保它是最新的
				console.log(`重新加载页面: ${normalizedNewUrl}`);
				return this.doAction(async (page) => {
					await page.reload({ 
						timeout: 15_000, 
						waitUntil: ["domcontentloaded", "networkidle2"] 
					}).catch(async (error) => {
						// 如果networkidle2失败，尝试仅等待domcontentloaded
						console.log(`重新加载网络静默等待失败，尝试仅等待DOM: ${error.message}`);
						await page.reload({ 
							timeout: 15_000, 
							waitUntil: ["domcontentloaded"] 
						});
					});
					await this.waitTillHTMLStable(page);
				});
			}
		} else {
			// 不存在此根域名的标签页，创建新的
			console.log(`域名 ${rootDomain} 的标签页不存在，创建新的`);
			return this.createNewTab(normalizedNewUrl);
		}
	}

	/**
	 * 等待HTML稳定
	 */
	private async waitTillHTMLStable(page: Page, timeout = 5_000) {
		const checkDurationMsecs = 500;
		const maxChecks = timeout / checkDurationMsecs;
		let lastHTMLSize = 0;
		let checkCounts = 1;
		let countStableSizeIterations = 0;
		const minStableSizeIterations = 3;

		while (checkCounts++ <= maxChecks) {
			let html = await page.content();
			let currentHTMLSize = html.length;

			console.log("上次: ", lastHTMLSize, " <> 当前: ", currentHTMLSize);

			if (lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize) {
				countStableSizeIterations++;
			} else {
				countStableSizeIterations = 0; //重置计数器
			}

			if (countStableSizeIterations >= minStableSizeIterations) {
				console.log("页面完全渲染...");
				break;
			}

			lastHTMLSize = currentHTMLSize;
			await delay(checkDurationMsecs);
		}
	}

	/**
	 * 处理鼠标交互，监控网络活动
	 */
	private async handleMouseInteraction(
		page: Page,
		coordinate: string,
		action: (x: number, y: number) => Promise<void>,
	): Promise<void> {
		const [x, y] = coordinate.split(",").map(Number);

		// 设置网络请求监控
		let hasNetworkActivity = false;
		const requestListener = () => {
			hasNetworkActivity = true;
		};
		page.on("request", requestListener);

		// 执行鼠标操作
		await action(x, y);
		this.currentMousePosition = coordinate;

		// 小延迟检查操作是否触发了任何网络活动
		await delay(100);

		if (hasNetworkActivity) {
			// 如果检测到网络活动，等待导航/加载
			await page
				.waitForNavigation({
					waitUntil: ["domcontentloaded", "networkidle2"],
					timeout: 15000,
				})
				.catch(async () => {
					// 如果networkidle2失败，尝试仅等待domcontentloaded
					console.log("鼠标交互后网络静默等待失败，尝试仅等待DOM");
					await page.waitForNavigation({
						waitUntil: ["domcontentloaded"],
						timeout: 15000,
					}).catch(() => {
						// 如果还是失败，就忽略，继续执行
						console.log("鼠标交互后导航等待失败，继续执行");
					});
				});
			await this.waitTillHTMLStable(page);
		}

		// 清理监听器
		page.off("request", requestListener);
	}

	/**
	 * 点击操作
	 */
	async click(coordinate: string): Promise<BrowserActionResult> {
		return this.doAction(async (page) => {
			await this.handleMouseInteraction(page, coordinate, async (x, y) => {
				await page.mouse.click(x, y);
			});
		});
	}

	/**
	 * 输入文本
	 */
	async type(text: string): Promise<BrowserActionResult> {
		return this.doAction(async (page) => {
			await page.keyboard.type(text);
		});
	}

	/**
	 * 滚动页面
	 */
	private async scrollPage(page: Page, direction: "up" | "down"): Promise<void> {
		const { height } = this.getViewport();
		const scrollAmount = direction === "down" ? height : -height;

		await page.evaluate((scrollHeight) => {
			window.scrollBy({
				top: scrollHeight,
				behavior: "auto",
			});
		}, scrollAmount);

		await delay(300);
	}

	/**
	 * 向下滚动
	 */
	async scrollDown(): Promise<BrowserActionResult> {
		return this.doAction(async (page) => {
			await this.scrollPage(page, "down");
		});
	}

	/**
	 * 向上滚动
	 */
	async scrollUp(): Promise<BrowserActionResult> {
		return this.doAction(async (page) => {
			await this.scrollPage(page, "up");
		});
	}

	/**
	 * 悬停操作
	 */
	async hover(coordinate: string): Promise<BrowserActionResult> {
		return this.doAction(async (page) => {
			await this.handleMouseInteraction(page, coordinate, async (x, y) => {
				await page.mouse.move(x, y);
				// 小延迟以允许任何悬停效果出现
				await delay(300);
			});
		});
	}

	/**
	 * 调整浏览器窗口大小
	 */
	async resize(size: string): Promise<BrowserActionResult> {
		return this.doAction(async (page) => {
			const [width, height] = size.split(",").map(Number);
			const session = await page.createCDPSession();
			await page.setViewport({ width, height });
			const { windowId } = await session.send("Browser.getWindowForTarget");
			await session.send("Browser.setWindowBounds", {
				bounds: { width, height },
				windowId,
			});
		});
	}

	/**
	 * 获取页面内容
	 */
	async getPageContent(): Promise<BrowserActionResult> {
		if (!this.page) {
			return {
				success: false,
				error: "浏览器未启动或页面不存在"
			};
		}

		try {
			const content = await this.page.content();
			return {
				success: true,
				logs: content
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
} 