import { Helper_StreamProcessor } from "./Helper_StreamProcessor";
import { networkInterfaces, hostname, uptime, freemem, platform } from "os";

// Type definitions for WebSocket (avoiding ws module dependency)
interface WebSocketLike {
  readyState: number;
  OPEN: number;
  send(data: string | Buffer): void;
  close(code?: number, reason?: string): void;
  on(event: 'message', listener: (data: any, isBinary: boolean) => void): void;
  on(event: 'close', listener: () => void): void;
  on(event: 'error', listener: (err: Error) => void): void;
}

interface WebSocketServerLike {
  close(): void;
  on(event: 'connection', listener: (ws: WebSocketLike) => void): void;
  on(event: 'listening', listener: () => void): void;
  on(event: 'error', listener: (err: Error) => void): void;
}

export interface JrWebSocketOptions {
  port?: number; // default 81
  onDocument?: (doc: Record<string, any>) => void; // forward to renderer
  onProtocol?: (doc: Record<string, any>) => void;
  onSystem?: (doc: Record<string, any>) => void;
}

export class Helper_WebSocket {
  private wss: WebSocketServerLike | null = null;
  private port: number;
  private connectedClients = new Map<number, WebSocketLike>();
  private nextClientId = 1;
  private processor: Helper_StreamProcessor;

  private messagesReceived = 0;
  private messagesSent = 0;
  private errorCount = 0;

  // Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
  private static cachedMac: string | null = null;

  constructor(opts: JrWebSocketOptions = {}) {
    this.port = opts.port ?? 81;
    this.processor = new Helper_StreamProcessor({
      onDocument: opts.onDocument,
      onProtocol: opts.onProtocol,
      onSystem: opts.onSystem,
    });
  }

  async start() {
    if (this.wss) return;
    
    try {
      // Dynamic import to avoid compile-time dependency
      let WebSocketServer: any;
      try {
        const wsModule = await import("ws");
        WebSocketServer = wsModule.WebSocketServer;
      } catch (wsError) {
        console.error("[Helper_WebSocket] ws module not available:", wsError);
        throw new Error("WebSocket module not installed. Run: npm install ws @types/ws");
      }
      
      this.wss = new WebSocketServer({ host: "0.0.0.0", port: this.port }) as WebSocketServerLike;
      
      if (this.wss) {
        this.wss.on("connection", (ws: WebSocketLike) => this.handleConnection(ws));
        this.wss.on("listening", () => {
          console.log(`[Helper_WebSocket] ✅ WebSocket server started on ws://0.0.0.0:${this.port}/`);
        });
        this.wss.on("error", (err: Error) => {
          console.error("[Helper_WebSocket] Server error:", err);
        });
      }
    } catch (error) {
      console.error("[Helper_WebSocket] Failed to start WebSocket server:", error);
      throw error;
    }
  }

  stop() {
    if (!this.wss) return;
    for (const [, ws] of this.connectedClients) {
      try { ws.close(1001, "server closing"); } catch {}
    }
    this.connectedClients.clear();
    this.wss.close();
    this.wss = null;
    console.log("[Helper_WebSocket] WebSocket server stopped");
  }

  isRunning() {
    return !!this.wss;
  }

  private handleConnection(ws: WebSocketLike) {
    const id = this.nextClientId++;
    this.connectedClients.set(id, ws);
    console.log(`[Helper_WebSocket] Client ${id} connected (total: ${this.connectedClients.size})`);

    // Send device info immediately on connect (ESP32 parity)
    this.sendDeviceInfo(ws, id);

    ws.on("message", async (data: any, isBinary: boolean) => {
      try {
        // Handle ping/heartbeat text at WS layer (ESP32 parity)
        if (!isBinary && typeof data !== "object") {
          const msg = data.toString();
          if (msg === "ping") {
            ws.send("pong");
            this.messagesSent++;
            return;
          }
          if (msg === "heartbeat" || msg.includes("heartbeat-request")) {
            const hb = Helper_WebSocket.getHeartbeat();
            ws.send(JSON.stringify(hb));
            this.messagesSent++;
            return;
          }
          // Forward *all* other text to the stream processor
          await this.processor.processData(Buffer.from(msg, "utf8"));
          this.messagesReceived++;
          return;
        }

        // Binary path → direct to stream processor (gzip or prefixed/binary)
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        await this.processor.processData(buf);
        this.messagesReceived++;
      } catch (e) {
        console.error("[Helper_WebSocket] ERROR handling message:", e);
        this.errorCount++;
        this.sendError(ws, "message_handling_error", (e as Error).message || String(e));
      }
    });

    ws.on("close", () => {
      this.connectedClients.delete(id);
      console.log(
        `[Helper_WebSocket] Client ${id} disconnected (total: ${this.connectedClients.size})`
      );
    });

    ws.on("error", (err: Error) => {
      console.error(`[Helper_WebSocket] Client ${id} error:`, err);
      this.errorCount++;
    });
  }

  private sendDeviceInfo(ws: WebSocketLike, clientId: number) {
    const info = {
      type: "device-connected",
      timestamp: Date.now().toString(),
      mac: Helper_WebSocket.getFormattedMacAddress(),
      ip: Helper_WebSocket.getLocalIPv4(),
      port: this.port,
      protocol: "WebSocket",
      clientId,
      note: "Send data as text or binary - both supported",
    };
    ws.send(JSON.stringify(info));
    this.messagesSent++;
  }

  private sendError(ws: WebSocketLike, error: string, context = "") {
    const msg = {
      type: "error",
      error,
      context,
      timestamp: Date.now(),
    };
    try {
      ws.send(JSON.stringify(msg));
      this.messagesSent++;
    } catch { /* noop */ }
  }

  // Optional helpers if you want parity methods for broadcast, etc.
  broadcastJSON(doc: Record<string, any>) {
    if (!this.wss) return;
    const msg = JSON.stringify(doc);
    for (const [, ws] of this.connectedClients) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
    this.messagesSent += this.connectedClients.size;
  }

  getStats() {
    return {
      clients: this.connectedClients.size,
      messagesReceived: this.messagesReceived,
      messagesSent: this.messagesSent,
      errorCount: this.errorCount,
      processor: this.processor.getStats(),
    };
  }

  static getFormattedMacAddress(): string {
    if (this.cachedMac) return this.cachedMac;
    const ifs = networkInterfaces();
    for (const name of Object.keys(ifs)) {
      for (const info of ifs[name] || []) {
        if (!info.internal && info.mac && info.mac !== "00:00:00:00:00:00") {
          this.cachedMac = info.mac.toUpperCase();
          return this.cachedMac;
        }
      }
    }
    // Fallback to host hash-like
    const h = hostname().toUpperCase();
    // Create pseudo-MAC AA:— from hostname chars
    const pad = (s: string) => s.padEnd(12, "0").slice(0, 12);
    const hex = Buffer.from(pad(h)).toString("hex").slice(0, 12).toUpperCase();
    this.cachedMac = hex.match(/.{1,2}/g)?.join(":") ?? "00:00:00:00:00:00";
    return this.cachedMac;
  }

  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: Helper_WebSocket.getLocalIPv4(),
      uptime: Math.floor(uptime() * 1000),
      freeHeap: freemem(), // "free-ish" bytes
      firmware: process.env.npm_package_version || "0.0.0",
      platform: platform(),
    };
  }

  static getLocalIPv4(): string {
    const ifs = networkInterfaces();
    for (const name of Object.keys(ifs)) {
      for (const info of ifs[name] || []) {
        if (!info.internal && info.family === "IPv4" && info.address) return info.address;
      }
    }
    return "0.0.0.0";
  }
}

// Small convenience factory (optional)
export function createJrWebSocketServer(opts?: JrWebSocketOptions) {
  const server = new Helper_WebSocket(opts);
  server.start();
  return server;
}