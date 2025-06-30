import * as net from "net";
import axios from "axios";
import * as dns from "dns";

/**
 * 检查指定主机的端口是否开放
 */
export async function isPortOpen(host: string, port: number, timeout = 1000): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		let status = false;

		// 设置超时
		socket.setTimeout(timeout);

		// 处理成功连接
		socket.on("connect", () => {
			status = true;
			socket.destroy();
		});

		// 处理错误
		socket.on("error", () => {
			socket.destroy();
		});

		// 处理超时
		socket.on("timeout", () => {
			socket.destroy();
		});

		// 处理关闭
		socket.on("close", () => {
			resolve(status);
		});

		// 尝试连接
		socket.connect(port, host);
	});
}

/**
 * 尝试连接到指定的Chrome主机URL
 */
export async function tryChromeHostUrl(chromeHostUrl: string): Promise<boolean> {
	try {
		console.log(`尝试连接到Chrome: ${chromeHostUrl}/json/version`);
		await axios.get(`${chromeHostUrl}/json/version`, { timeout: 1000 });
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * 获取Docker主机IP地址
 */
export async function getDockerHostIP(): Promise<string | null> {
	try {
		// 尝试解析host.docker.internal (适用于Docker Desktop)
		return new Promise((resolve) => {
			dns.lookup("host.docker.internal", (err: any, address: string) => {
				if (err) {
					resolve(null);
				} else {
					resolve(address);
				}
			});
		});
	} catch (error) {
		console.log("无法确定Docker主机IP:", error);
		return null;
	}
}

/**
 * 在网络范围内扫描Chrome调试端口
 */
export async function scanNetworkForChrome(baseIP: string, port: number): Promise<string | null> {
	if (!baseIP || !baseIP.match(/^\d+\.\d+\.\d+\./)) {
		return null;
	}

	// 提取网络前缀 (例如 "192.168.65.")
	const networkPrefix = baseIP.split(".").slice(0, 3).join(".") + ".";

	// 常见的Docker主机IP，优先尝试
	const priorityIPs = [
		networkPrefix + "1", // 常见网关
		networkPrefix + "2", // 常见主机
		networkPrefix + "254", // 某些Docker设置中的常见主机
	];

	console.log(`扫描网络 ${networkPrefix}* 中的优先IP`);

	// 首先检查优先IP
	for (const ip of priorityIPs) {
		const isOpen = await isPortOpen(ip, port);
		if (isOpen) {
			console.log(`在 ${ip} 上发现Chrome调试端口开放`);
			return ip;
		}
	}

	return null;
}

/**
 * 发现网络中的Chrome实例
 */
const discoverChromeHosts = async (port: number): Promise<string | null> => {
	// 获取所有网络接口
	const ipAddresses = [];

	// 尝试获取Docker主机IP
	const hostIP = await getDockerHostIP();
	if (hostIP) {
		console.log("发现Docker主机IP:", hostIP);
		ipAddresses.push(hostIP);
	}

	// 去除重复项
	const uniqueIPs = [...new Set(ipAddresses)];
	console.log("要尝试的IP地址:", uniqueIPs);

	// 尝试连接到每个IP地址
	for (const ip of uniqueIPs) {
		const hostEndpoint = `http://${ip}:${port}`;

		const hostIsValid = await tryChromeHostUrl(hostEndpoint);
		if (hostIsValid) {
			// 存储成功的IP供以后使用
			console.log(`✅ 在 ${hostEndpoint} 找到Chrome`);

			// 返回主机URL和端点
			return hostEndpoint;
		}
	}

	return null;
};

/**
 * 测试与远程浏览器调试WebSocket的连接。
 * 首先尝试特定主机，然后在需要时尝试自动发现。
 * @param port 浏览器调试端口 (默认: 9222)
 * @returns 如果连接成功则返回WebSocket调试器URL，否则返回null
 */
export async function discoverChromeHostUrl(port: number = 9222): Promise<string | null> {
	// 首先尝试特定主机
	const hostsToTry = [`http://localhost:${port}`, `http://127.0.0.1:${port}`];

	// 首先直接尝试每个主机
	for (const hostUrl of hostsToTry) {
		console.log(`尝试连接到: ${hostUrl}`);
		try {
			const hostIsValid = await tryChromeHostUrl(hostUrl);
			if (hostIsValid) return hostUrl;
		} catch (error) {
			console.log(`连接 ${hostUrl} 失败: ${error instanceof Error ? error.message : error}`);
		}
	}

	// 如果直接连接失败，尝试自动发现
	console.log("直接连接失败。尝试自动发现...");

	const discoveredHostUrl = await discoverChromeHosts(port);
	if (discoveredHostUrl) {
		console.log(`尝试连接到发现的主机: ${discoveredHostUrl}`);
		try {
			const hostIsValid = await tryChromeHostUrl(discoveredHostUrl);
			if (hostIsValid) return discoveredHostUrl;
			console.log(`连接到发现的主机 ${discoveredHostUrl} 失败`);
		} catch (error) {
			console.log(`连接到发现的主机时出错: ${error instanceof Error ? error.message : error}`);
		}
	} else {
		console.log("网络中未发现浏览器实例");
	}

	return null;
} 