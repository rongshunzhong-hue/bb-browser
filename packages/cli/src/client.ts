/**
 * HTTP 客户端 - 与 Daemon 通信
 */

import type { Request, Response } from "@bb-browser/shared";
import { DAEMON_BASE_URL, COMMAND_TIMEOUT } from "@bb-browser/shared";

/**
 * 发送命令到 Daemon 并等待响应
 */
export async function sendCommand(request: Request): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COMMAND_TIMEOUT);

  try {
    const res = await fetch(`${DAEMON_BASE_URL}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // 根据 HTTP 状态码返回错误
      if (res.status === 408) {
        return {
          id: request.id,
          success: false,
          error: "命令执行超时",
        };
      }
      if (res.status === 503) {
        return {
          id: request.id,
          success: false,
          error: [
            "Chrome extension not connected.",
            "",
            "Setup guide:",
            "  1. Install:  npm install -g bb-browser",
            "  2. Open:     chrome://extensions/ → Enable Developer Mode",
            "  3. Load:     Click \"Load unpacked\" → select node_modules/bb-browser/extension/",
            "  4. Start:    bb-browser daemon",
            "  5. Verify:   bb-browser status",
            "",
            "Or download the extension from:",
            "  https://github.com/epiral/bb-browser/releases",
          ].join("\n"),
        };
      }
      return {
        id: request.id,
        success: false,
        error: `HTTP 错误: ${res.status} ${res.statusText}`,
      };
    }

    return (await res.json()) as Response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          id: request.id,
          success: false,
          error: "请求超时",
        };
      }
      // 连接错误
      if (
        error.message.includes("fetch failed") ||
        error.message.includes("ECONNREFUSED")
      ) {
        throw new Error([
          "Cannot connect to daemon.",
          "",
          "Start the daemon first:",
          "  bb-browser daemon",
          "",
          "Then load the Chrome extension:",
          "  chrome://extensions/ → Developer Mode → Load unpacked → node_modules/bb-browser/extension/",
        ].join("\n"));
      }
      throw error;
    }
    throw error;
  }
}
