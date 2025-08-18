var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, session, ipcMain, shell, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { gunzip } from "zlib";
import { networkInterfaces, hostname, platform, freemem, uptime } from "os";
import { promisify } from "util";
const pGunzip = promisify(gunzip);
const _Helper_StreamProcessor = class _Helper_StreamProcessor {
  constructor(callbacks) {
    __publicField(this, "callbacks");
    __publicField(this, "messagesProcessed", 0);
    __publicField(this, "errorCount", 0);
    // Limits (raise if you push big frames)
    __publicField(this, "MAX_PAYLOAD_SIZE", 8 * 1024 * 1024);
    this.callbacks = callbacks;
  }
  // Public stats (optional)
  getStats() {
    return { messagesProcessed: this.messagesProcessed, errorCount: this.errorCount };
  }
  // Entry point — pass every WS message buffer here (text converted to Buffer by caller)
  async processData(buf) {
    if (!buf || buf.length === 0) return;
    if (buf[0] === 123) {
      this.handleRawJSON(buf);
      return;
    }
    if (buf.length >= 2 && buf[0] === 31 && buf[1] === 139) {
      await this.handleRawGzip(buf);
      return;
    }
    if (buf.length >= 8 && this.isAllAsciiDigits(buf.slice(0, 8))) {
      try {
        await this.handlePrefixed(buf);
      } catch (e) {
        console.error("[StreamProcessor] ERROR handling prefixed payload:", e);
        this.errorCount++;
      }
      return;
    }
  }
  // ---------- Private ----------
  handleRawJSON(buf) {
    const doc = this.tryParseJSON(buf);
    if (!doc) return;
    this.forward(doc);
    this.messagesProcessed++;
  }
  async handleRawGzip(buf) {
    try {
      const out = await pGunzip(buf);
      const doc = this.tryParseJSON(out);
      if (!doc) return;
      this.forward(
        doc,
        /*srcType*/
        3
      );
      this.messagesProcessed++;
    } catch (e) {
      console.error("[StreamProcessor] ERROR: Failed to gunzip raw gzip:", e.message);
      this.errorCount++;
    }
  }
  async handlePrefixed(buf) {
    const lengthHint = parseInt(buf.toString("ascii", 0, 4), 10);
    const typeField = parseInt(buf.toString("ascii", 4, 6), 10);
    const routeField = parseInt(buf.toString("ascii", 6, 8), 10);
    if (!(typeField === 0 || typeField === 1)) {
      console.error("[StreamProcessor] ERROR: Invalid type field:", typeField);
      this.errorCount++;
      return;
    }
    const payloadLen = lengthHint > 0 ? lengthHint : Math.max(0, buf.length - 8);
    if (payloadLen <= 0 || payloadLen > this.MAX_PAYLOAD_SIZE) {
      console.error("[StreamProcessor] ERROR: Invalid/oversize payload length:", payloadLen);
      this.errorCount++;
      return;
    }
    if (8 + payloadLen > buf.length) {
      console.error("[StreamProcessor] ERROR: Incomplete payload:", payloadLen, "available:", buf.length - 8);
      this.errorCount++;
      return;
    }
    const payload = buf.slice(8, 8 + payloadLen);
    if (typeField === 0) {
      const doc = this.tryParseJSON(payload);
      if (!doc) return;
      this.forward(
        doc,
        /*srcType*/
        2,
        routeField
      );
      this.messagesProcessed++;
    } else {
      try {
        const out = await pGunzip(payload);
        const doc = this.tryParseJSON(out);
        if (!doc) return;
        this.forward(
          doc,
          /*srcType*/
          4,
          routeField
        );
        this.messagesProcessed++;
      } catch (e) {
        console.error("[StreamProcessor] ERROR: Failed to gunzip prefixed gzip:", e.message);
        this.errorCount++;
      }
    }
  }
  forward(doc, _srcType, _route) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t;
    const dest = doc == null ? void 0 : doc.destination;
    const localMac = _Helper_StreamProcessor.getFormattedMacAddress();
    if (dest && localMac && dest.toLowerCase() !== localMac.toLowerCase()) {
      (_b = (_a = this.callbacks).onProtocol) == null ? void 0 : _b.call(_a, doc);
      return;
    }
    if (dest && localMac && dest.toLowerCase() === localMac.toLowerCase()) {
      delete doc.destination;
    }
    const t = doc == null ? void 0 : doc.type;
    if (!t) {
      (_d = (_c = this.callbacks).onSystem) == null ? void 0 : _d.call(_c, doc);
      (_f = (_e = this.callbacks).onDocument) == null ? void 0 : _f.call(_e, doc);
      return;
    }
    if (t === "rive_config" || t === "rive_sensor") {
      console.log(`[StreamProcessor] Routing ${t} to Document callback`);
      (_h = (_g = this.callbacks).onDocument) == null ? void 0 : _h.call(_g, doc);
      return;
    }
    if (t === "sensor" || t === "config") {
      (_j = (_i = this.callbacks).onDocument) == null ? void 0 : _j.call(_i, doc);
      return;
    }
    if (t === "MQTT_Subscription_Request" || t === "websocket_ping" || t === "http_request" || t === "espnow_message" || t === "peer_management") {
      (_l = (_k = this.callbacks).onProtocol) == null ? void 0 : _l.call(_k, doc);
      return;
    }
    if (t === "preferences" || t === "stats" || t === "device_info" || t === "device_capabilities" || t === "system_command") {
      (_n = (_m = this.callbacks).onSystem) == null ? void 0 : _n.call(_m, doc);
      (_p = (_o = this.callbacks).onDocument) == null ? void 0 : _p.call(_o, doc);
      return;
    }
    console.log(`[StreamProcessor] Unknown message type '${t}', routing to System callback`);
    (_r = (_q = this.callbacks).onSystem) == null ? void 0 : _r.call(_q, doc);
    (_t = (_s = this.callbacks).onDocument) == null ? void 0 : _t.call(_s, doc);
  }
  tryParseJSON(buf) {
    try {
      return JSON.parse(buf.toString("utf8"));
    } catch (e) {
      console.error("[StreamProcessor] ERROR: JSON parse failed:", e.message);
      this.errorCount++;
      return null;
    }
  }
  isAllAsciiDigits(b) {
    for (let i = 0; i < b.length; i++) {
      const c = b[i];
      if (c < 48 || c > 57) return false;
    }
    return true;
  }
  // ===== Utilities for heartbeat parity =====
  static getFormattedMacAddress() {
    var _a;
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
    const h = hostname().toUpperCase();
    const pad = (s) => s.padEnd(12, "0").slice(0, 12);
    const hex = Buffer.from(pad(h)).toString("hex").slice(0, 12).toUpperCase();
    this.cachedMac = ((_a = hex.match(/.{1,2}/g)) == null ? void 0 : _a.join(":")) ?? "00:00:00:00:00:00";
    return this.cachedMac;
  }
  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: _Helper_StreamProcessor.getLocalIPv4(),
      uptime: Math.floor(uptime() * 1e3),
      freeHeap: freemem(),
      // "free-ish" bytes
      firmware: process.env.npm_package_version || "0.0.0",
      platform: platform()
    };
  }
  static getLocalIPv4() {
    const ifs = networkInterfaces();
    for (const name of Object.keys(ifs)) {
      for (const info of ifs[name] || []) {
        if (!info.internal && info.family === "IPv4" && info.address) return info.address;
      }
    }
    return "0.0.0.0";
  }
};
// 8 MB
// Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
__publicField(_Helper_StreamProcessor, "cachedMac", null);
let Helper_StreamProcessor = _Helper_StreamProcessor;
const _Helper_WebSocket = class _Helper_WebSocket {
  constructor(opts = {}) {
    __publicField(this, "wss", null);
    __publicField(this, "port");
    __publicField(this, "connectedClients", /* @__PURE__ */ new Map());
    __publicField(this, "nextClientId", 1);
    __publicField(this, "processor");
    __publicField(this, "messagesReceived", 0);
    __publicField(this, "messagesSent", 0);
    __publicField(this, "errorCount", 0);
    this.port = opts.port ?? 81;
    this.processor = new Helper_StreamProcessor({
      onDocument: opts.onDocument,
      onProtocol: opts.onProtocol,
      onSystem: opts.onSystem
    });
  }
  async start() {
    if (this.wss) return;
    try {
      let WebSocketServer;
      try {
        const wsModule = await import("./wrapper-EAT-aO8Q.js");
        WebSocketServer = wsModule.WebSocketServer;
      } catch (wsError) {
        console.error("[Helper_WebSocket] ws module not available:", wsError);
        throw new Error("WebSocket module not installed. Run: npm install ws @types/ws");
      }
      this.wss = new WebSocketServer({ host: "0.0.0.0", port: this.port });
      if (this.wss) {
        this.wss.on("connection", (ws) => this.handleConnection(ws));
        this.wss.on("listening", () => {
          console.log(`[Helper_WebSocket] ✅ WebSocket server started on ws://0.0.0.0:${this.port}/`);
        });
        this.wss.on("error", (err) => {
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
      try {
        ws.close(1001, "server closing");
      } catch {
      }
    }
    this.connectedClients.clear();
    this.wss.close();
    this.wss = null;
    console.log("[Helper_WebSocket] WebSocket server stopped");
  }
  isRunning() {
    return !!this.wss;
  }
  handleConnection(ws) {
    const id = this.nextClientId++;
    this.connectedClients.set(id, ws);
    console.log(`[Helper_WebSocket] Client ${id} connected (total: ${this.connectedClients.size})`);
    this.sendDeviceInfo(ws, id);
    ws.on("message", async (data, isBinary) => {
      try {
        if (!isBinary && typeof data !== "object") {
          const msg = data.toString();
          if (msg === "ping") {
            ws.send("pong");
            this.messagesSent++;
            return;
          }
          if (msg === "heartbeat" || msg.includes("heartbeat-request")) {
            const hb = _Helper_WebSocket.getHeartbeat();
            ws.send(JSON.stringify(hb));
            this.messagesSent++;
            return;
          }
          await this.processor.processData(Buffer.from(msg, "utf8"));
          this.messagesReceived++;
          return;
        }
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        await this.processor.processData(buf);
        this.messagesReceived++;
      } catch (e) {
        console.error("[Helper_WebSocket] ERROR handling message:", e);
        this.errorCount++;
        this.sendError(ws, "message_handling_error", e.message || String(e));
      }
    });
    ws.on("close", () => {
      this.connectedClients.delete(id);
      console.log(
        `[Helper_WebSocket] Client ${id} disconnected (total: ${this.connectedClients.size})`
      );
    });
    ws.on("error", (err) => {
      console.error(`[Helper_WebSocket] Client ${id} error:`, err);
      this.errorCount++;
    });
  }
  sendDeviceInfo(ws, clientId) {
    const info = {
      type: "device-connected",
      timestamp: Date.now().toString(),
      mac: _Helper_WebSocket.getFormattedMacAddress(),
      ip: _Helper_WebSocket.getLocalIPv4(),
      port: this.port,
      protocol: "WebSocket",
      clientId,
      note: "Send data as text or binary - both supported"
    };
    ws.send(JSON.stringify(info));
    this.messagesSent++;
  }
  sendError(ws, error, context = "") {
    const msg = {
      type: "error",
      error,
      context,
      timestamp: Date.now()
    };
    try {
      ws.send(JSON.stringify(msg));
      this.messagesSent++;
    } catch {
    }
  }
  // Optional helpers if you want parity methods for broadcast, etc.
  broadcastJSON(doc) {
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
      processor: this.processor.getStats()
    };
  }
  static getFormattedMacAddress() {
    var _a;
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
    const h = hostname().toUpperCase();
    const pad = (s) => s.padEnd(12, "0").slice(0, 12);
    const hex = Buffer.from(pad(h)).toString("hex").slice(0, 12).toUpperCase();
    this.cachedMac = ((_a = hex.match(/.{1,2}/g)) == null ? void 0 : _a.join(":")) ?? "00:00:00:00:00:00";
    return this.cachedMac;
  }
  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: _Helper_WebSocket.getLocalIPv4(),
      uptime: Math.floor(uptime() * 1e3),
      freeHeap: freemem(),
      // "free-ish" bytes
      firmware: process.env.npm_package_version || "0.0.0",
      platform: platform()
    };
  }
  static getLocalIPv4() {
    const ifs = networkInterfaces();
    for (const name of Object.keys(ifs)) {
      for (const info of ifs[name] || []) {
        if (!info.internal && info.family === "IPv4" && info.address) return info.address;
      }
    }
    return "0.0.0.0";
  }
};
// Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
__publicField(_Helper_WebSocket, "cachedMac", null);
let Helper_WebSocket = _Helper_WebSocket;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let jrWs = null;
let mdnsService = null;
function getAppVersion() {
  try {
    const appRoot = process.env.APP_ROOT || path.join(__dirname, "..");
    const pkgPath = path.join(appRoot, "package.json");
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if ((pkgJson == null ? void 0 : pkgJson.version) && typeof pkgJson.version === "string") return pkgJson.version;
  } catch (e) {
    console.warn("[Electron] Failed to read package.json version, falling back:", e);
  }
  return app.getVersion();
}
const wantGPU = process.env.JR_GPU === "1";
if (process.platform === "linux" && process.arch.startsWith("arm") && !wantGPU) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-gpu-compositing");
  app.commandLine.appendSwitch("disable-gpu-rasterization");
  app.commandLine.appendSwitch("disable-gpu-sandbox");
  console.log("[Electron] GPU disabled (Canvas mode)");
}
if (process.env.JR_CLEAR_CACHE === "1") {
  app.whenReady().then(async () => {
    try {
      const s = session.defaultSession;
      await s.clearCache();
      await s.clearStorageData({
        storages: [
          "serviceworkers",
          "cachestorage",
          "localstorage",
          "indexdb",
          "websql",
          "filesystem",
          "cookies",
          "shadercache"
        ]
      });
      console.log("[Electron] Cache cleared on startup");
    } catch (e) {
      console.warn("[Electron] Cache clear failed:", e);
    }
  });
}
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let kioskWindow = null;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });
  if (app.isPackaged) {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  } else if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools();
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
function processIncomingData(doc) {
  var _a, _b, _c, _d, _e, _f;
  console.log("[main] Processing document type:", doc.type);
  if (doc.type === "rive_config") {
    console.log("[main] 📋 Received Rive configuration for screenId:", doc.screenId);
    console.log("[main] 📋 Config details:", {
      canvasSize: ((_a = doc.frameConfig) == null ? void 0 : _a.canvas) ? `${doc.frameConfig.canvas.width}x${doc.frameConfig.canvas.height}` : "unknown",
      riveFile: ((_c = (_b = doc.frameConfig) == null ? void 0 : _b.rive) == null ? void 0 : _c.file) || "none",
      riveEmbedded: ((_e = (_d = doc.frameConfig) == null ? void 0 : _d.rive) == null ? void 0 : _e.embedded) || false,
      elementCount: ((_f = doc.frameElements) == null ? void 0 : _f.length) || 0
    });
    if (kioskWindow && !kioskWindow.isDestroyed()) {
      kioskWindow.webContents.send("rive-config", doc);
      console.log("[main] ✅ Rive config forwarded to visualization window");
    }
    if (win && !win.isDestroyed()) {
      win.webContents.send("rive-config", doc);
    }
    return;
  }
  if (doc.type === "rive_sensor") {
    console.log("[main] 📊 Received Rive sensor data for screenId:", doc.screenId);
    console.log("[main] 📊 Sensor tags:", Object.keys(doc.sensors || {}));
    if (doc.sensors) {
      Object.entries(doc.sensors).forEach(([tag, data]) => {
        console.log(`[main] 📊   ${tag}: ${data.value} ${data.unit}`);
      });
    }
    if (kioskWindow && !kioskWindow.isDestroyed()) {
      kioskWindow.webContents.send("rive-sensor-data", doc);
      console.log("[main] ✅ Rive sensor data forwarded to visualization window");
    }
    if (win && !win.isDestroyed()) {
      win.webContents.send("rive-sensor-data", doc);
    }
    return;
  }
  if (doc.type === "sensor" && doc.sensors) {
    console.log("[main] 🔄 Processing legacy sensor format");
    try {
      const firstSensorKey = Object.keys(doc.sensors)[0];
      if (firstSensorKey && doc.sensors[firstSensorKey] && doc.sensors[firstSensorKey][0]) {
        const sensorValue = parseInt(doc.sensors[firstSensorKey][0].Value, 10);
        const sensorUnit = doc.sensors[firstSensorKey][0].Unit || "";
        console.log(`[main] 🔄 Legacy sensor: ${firstSensorKey} = ${sensorValue} ${sensorUnit}`);
        if (kioskWindow && !kioskWindow.isDestroyed()) {
          kioskWindow.webContents.send("sensor-data", {
            value: sensorValue,
            unit: sensorUnit,
            sensorName: firstSensorKey
          });
        }
      }
    } catch (error) {
      console.error("[main] Error processing legacy sensor data:", error);
    }
    return;
  }
  if (doc.type === "heartbeat-response" || doc.type === "device-connected") {
    console.log(`[main] 💓 Received ${doc.type}`);
    return;
  }
  console.log(`[main] ❓ Unknown message type: ${doc.type}`);
}
async function startMDNSService() {
  try {
    const { Bonjour } = await import("./index-DqJd3otR.js").then((n) => n.i);
    const instance = new Bonjour();
    const mac = Helper_WebSocket.getFormattedMacAddress();
    const deviceName = `JunctionRelay_Virtual_${mac}`;
    const httpService = instance.publish({
      name: deviceName,
      type: "junctionrelay",
      // Try without underscores first
      protocol: "tcp",
      // Separate protocol field
      port: 80,
      txt: {
        type: "virtual_device",
        firmware: getAppVersion(),
        platform: "electron",
        mac
      }
    });
    const wsService = instance.publish({
      name: `${deviceName}_WS`,
      type: "junctionrelay-ws",
      protocol: "tcp",
      port: 81,
      txt: {
        type: "virtual_device_ws",
        firmware: getAppVersion(),
        platform: "electron",
        mac
      }
    });
    mdnsService = { instance, httpService, wsService };
    console.log(`[main] ✅ mDNS services started - device discoverable as ${deviceName}`);
    console.log(`[main] Advertising: junctionrelay.tcp (port 80) and junctionrelay-ws.tcp (port 81)`);
  } catch (error) {
    console.log("[main] mDNS service failed to start:", error.message);
    console.log("[main] Device running without network discovery");
  }
}
async function startWebSocketServer() {
  console.log("[main] startWebSocketServer() called");
  if (jrWs == null ? void 0 : jrWs.isRunning()) {
    console.log("[main] Helper_WS already running on :81");
    win == null ? void 0 : win.webContents.send("ws-status", { ok: true, message: "WebSocket already running." });
    return;
  }
  try {
    console.log("[main] Creating Helper_WebSocket on :81");
    jrWs = new Helper_WebSocket({
      port: 81,
      onDocument: (doc) => {
        win == null ? void 0 : win.webContents.send("display:json", doc);
        processIncomingData(doc);
      },
      onProtocol: (doc) => {
        console.log("[main] 🔌 Protocol message:", doc.type);
        win == null ? void 0 : win.webContents.send("display:protocol", doc);
      },
      onSystem: (doc) => {
        console.log("[main] ⚙️ System message:", doc.type);
        win == null ? void 0 : win.webContents.send("display:system", doc);
      }
    });
    await jrWs.start();
    console.log("[main] ✅ Helper_WebSocket started on :81");
    await startMDNSService();
    win == null ? void 0 : win.webContents.send("ws-status", { ok: true, message: "WebSocket server started on :81" });
  } catch (helperErr) {
    console.error("[main] Helper_WebSocket failed:", helperErr);
    win == null ? void 0 : win.webContents.send("ws-status", { ok: false, message: `Failed to start WebSocket: ${String(helperErr)}` });
  }
}
function stopWebSocketServer() {
  console.log("[main] stopWebSocketServer() called");
  if (mdnsService) {
    try {
      if (mdnsService.instance) {
        mdnsService.instance.destroy();
      }
      mdnsService = null;
      console.log("[main] mDNS services stopped");
    } catch (e) {
      console.error("[main] Error stopping mDNS:", e);
    }
  }
  if (jrWs) {
    try {
      jrWs.stop();
    } catch (e) {
      console.error("[main] jrWs.stop error:", e);
    }
    jrWs = null;
    console.log("[main] Helper_WS stopped");
    win == null ? void 0 : win.webContents.send("ws-status", { ok: true, message: "WebSocket server stopped." });
    return;
  }
  win == null ? void 0 : win.webContents.send("ws-status", { ok: true, message: "WebSocket not running." });
}
ipcMain.on("open-external", (_, url) => {
  try {
    shell.openExternal(url);
  } catch (error) {
    console.error("Error opening external URL:", error);
  }
});
ipcMain.handle("get-app-version", () => getAppVersion());
ipcMain.on("start-ws", () => {
  startWebSocketServer();
});
ipcMain.on("stop-ws", () => {
  stopWebSocketServer();
});
ipcMain.handle("ws-stats", () => {
  var _a;
  try {
    return ((_a = jrWs == null ? void 0 : jrWs.getStats) == null ? void 0 : _a.call(jrWs)) ?? null;
  } catch {
    return null;
  }
});
ipcMain.on("open-visualization", (event, options = {}) => {
  try {
    console.log("[main] 🎨 Opening visualization window with options:", options);
    const windowOptions = {
      webPreferences: {
        preload: path.join(__dirname, "preload.mjs"),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true
      },
      show: false
    };
    if (options.fullscreen !== false) {
      Object.assign(windowOptions, {
        fullscreen: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false
      });
    } else {
      Object.assign(windowOptions, {
        width: 1e3,
        height: 700,
        frame: true,
        alwaysOnTop: false,
        skipTaskbar: false,
        resizable: true,
        title: "JunctionRelay Visualization (Debug Mode)"
      });
    }
    kioskWindow = new BrowserWindow(windowOptions);
    if (options.fullscreen !== false) {
      kioskWindow.setAlwaysOnTop(true, "screen-saver");
    }
    kioskWindow.on("closed", () => {
      console.log("[main] 🎨 Visualization window closed");
      kioskWindow = null;
      if (win && !win.isDestroyed()) win.webContents.send("visualization-closed");
    });
    kioskWindow.once("ready-to-show", () => {
      console.log("[main] 🎨 Visualization window ready, showing");
      kioskWindow == null ? void 0 : kioskWindow.show();
    });
    kioskWindow.webContents.on("before-input-event", (_, input) => {
      if (input.key === "Escape" && input.type === "keyDown") {
        console.log("[main] 🎨 Escape key pressed, closing visualization");
        kioskWindow == null ? void 0 : kioskWindow.close();
      }
    });
    if (app.isPackaged) {
      kioskWindow.loadFile(path.join(RENDERER_DIST, "index.html"), {
        query: { mode: "visualization" }
      });
    } else if (VITE_DEV_SERVER_URL) {
      kioskWindow.loadURL(VITE_DEV_SERVER_URL + "?mode=visualization");
    } else {
      kioskWindow.loadFile(path.join(RENDERER_DIST, "index.html"), {
        query: { mode: "visualization" }
      });
    }
    event.sender.send("visualization-opened");
    console.log("[main] ✅ Visualization window opened");
  } catch (error) {
    console.error("Error opening visualization kiosk:", error);
  }
});
ipcMain.on("close-visualization", (event) => {
  if (kioskWindow && !kioskWindow.isDestroyed()) {
    console.log("[main] 🎨 Closing visualization window (IPC request)");
    kioskWindow.close();
    kioskWindow = null;
    event.sender.send("visualization-closed");
  }
});
ipcMain.on("quit-app", () => {
  console.log("[main] 🚪 Quit app requested");
  try {
    stopWebSocketServer();
  } catch {
  }
  app.quit();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    console.log("[main] 🚪 All windows closed, quitting app");
    try {
      stopWebSocketServer();
    } catch {
    }
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log("[main] 📱 App activated, creating window");
    createWindow();
  }
});
app.whenReady().then(() => {
  console.log("[main] 🚀 App ready, creating main window");
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
