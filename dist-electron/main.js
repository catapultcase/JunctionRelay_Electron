var Z = Object.defineProperty;
var K = (s, e, t) => e in s ? Z(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var d = (s, e, t) => K(s, typeof e != "symbol" ? e + "" : e, t);
import { app as p, session as ee, ipcMain as u, shell as se, BrowserWindow as O } from "electron";
import { fileURLToPath as te } from "node:url";
import m from "node:path";
import oe from "node:fs";
import { gunzip as ne } from "zlib";
import { networkInterfaces as C, hostname as B, platform as G, freemem as Q, uptime as X } from "os";
import { promisify as re } from "util";
const q = re(ne), v = class v {
  constructor(e) {
    d(this, "callbacks");
    d(this, "messagesProcessed", 0);
    d(this, "errorCount", 0);
    // Limits (raise if you push big frames)
    d(this, "MAX_PAYLOAD_SIZE", 8 * 1024 * 1024);
    this.callbacks = e;
  }
  // Public stats (optional)
  getStats() {
    return { messagesProcessed: this.messagesProcessed, errorCount: this.errorCount };
  }
  // Entry point — pass every WS message buffer here (text converted to Buffer by caller)
  async processData(e) {
    if (!(!e || e.length === 0)) {
      if (e[0] === 123) {
        this.handleRawJSON(e);
        return;
      }
      if (e.length >= 2 && e[0] === 31 && e[1] === 139) {
        await this.handleRawGzip(e);
        return;
      }
      if (e.length >= 8 && this.isAllAsciiDigits(e.slice(0, 8))) {
        try {
          await this.handlePrefixed(e);
        } catch (t) {
          console.error("[StreamProcessor] ERROR handling prefixed payload:", t), this.errorCount++;
        }
        return;
      }
    }
  }
  // ---------- Private ----------
  handleRawJSON(e) {
    const t = this.tryParseJSON(e);
    t && (this.forward(t), this.messagesProcessed++);
  }
  async handleRawGzip(e) {
    try {
      const t = await q(e), o = this.tryParseJSON(t);
      if (!o) return;
      this.forward(
        o,
        /*srcType*/
        3
      ), this.messagesProcessed++;
    } catch (t) {
      console.error("[StreamProcessor] ERROR: Failed to gunzip raw gzip:", t.message), this.errorCount++;
    }
  }
  async handlePrefixed(e) {
    const t = parseInt(e.toString("ascii", 0, 4), 10), o = parseInt(e.toString("ascii", 4, 6), 10), l = parseInt(e.toString("ascii", 6, 8), 10);
    if (!(o === 0 || o === 1)) {
      console.error("[StreamProcessor] ERROR: Invalid type field:", o), this.errorCount++;
      return;
    }
    const i = t > 0 ? t : Math.max(0, e.length - 8);
    if (i <= 0 || i > this.MAX_PAYLOAD_SIZE) {
      console.error("[StreamProcessor] ERROR: Invalid/oversize payload length:", i), this.errorCount++;
      return;
    }
    if (8 + i > e.length) {
      console.error("[StreamProcessor] ERROR: Incomplete payload:", i, "available:", e.length - 8), this.errorCount++;
      return;
    }
    const r = e.slice(8, 8 + i);
    if (o === 0) {
      const a = this.tryParseJSON(r);
      if (!a) return;
      this.forward(
        a,
        /*srcType*/
        2,
        l
      ), this.messagesProcessed++;
    } else
      try {
        const a = await q(r), g = this.tryParseJSON(a);
        if (!g) return;
        this.forward(
          g,
          /*srcType*/
          4,
          l
        ), this.messagesProcessed++;
      } catch (a) {
        console.error("[StreamProcessor] ERROR: Failed to gunzip prefixed gzip:", a.message), this.errorCount++;
      }
  }
  forward(e, t, o) {
    var a, g, w, D, I, z, M, A, j, x, L, W, N, $, T, U, F, H, J, V;
    const l = e == null ? void 0 : e.destination, i = v.getFormattedMacAddress();
    if (l && i && l.toLowerCase() !== i.toLowerCase()) {
      (g = (a = this.callbacks).onProtocol) == null || g.call(a, e);
      return;
    }
    l && i && l.toLowerCase() === i.toLowerCase() && delete e.destination;
    const r = e == null ? void 0 : e.type;
    if (!r) {
      (D = (w = this.callbacks).onSystem) == null || D.call(w, e), (z = (I = this.callbacks).onDocument) == null || z.call(I, e);
      return;
    }
    if (r === "rive_config" || r === "rive_sensor") {
      console.log(`[StreamProcessor] Routing ${r} to Document callback`), (A = (M = this.callbacks).onDocument) == null || A.call(M, e);
      return;
    }
    if (r === "sensor" || r === "config") {
      (x = (j = this.callbacks).onDocument) == null || x.call(j, e);
      return;
    }
    if (r === "MQTT_Subscription_Request" || r === "websocket_ping" || r === "http_request" || r === "espnow_message" || r === "peer_management") {
      (W = (L = this.callbacks).onProtocol) == null || W.call(L, e);
      return;
    }
    if (r === "preferences" || r === "stats" || r === "device_info" || r === "device_capabilities" || r === "system_command") {
      ($ = (N = this.callbacks).onSystem) == null || $.call(N, e), (U = (T = this.callbacks).onDocument) == null || U.call(T, e);
      return;
    }
    console.log(`[StreamProcessor] Unknown message type '${r}', routing to System callback`), (H = (F = this.callbacks).onSystem) == null || H.call(F, e), (V = (J = this.callbacks).onDocument) == null || V.call(J, e);
  }
  tryParseJSON(e) {
    try {
      return JSON.parse(e.toString("utf8"));
    } catch (t) {
      return console.error("[StreamProcessor] ERROR: JSON parse failed:", t.message), this.errorCount++, null;
    }
  }
  isAllAsciiDigits(e) {
    for (let t = 0; t < e.length; t++) {
      const o = e[t];
      if (o < 48 || o > 57) return !1;
    }
    return !0;
  }
  // ===== Utilities for heartbeat parity =====
  static getFormattedMacAddress() {
    var i;
    if (this.cachedMac) return this.cachedMac;
    const e = C();
    for (const r of Object.keys(e))
      for (const a of e[r] || [])
        if (!a.internal && a.mac && a.mac !== "00:00:00:00:00:00")
          return this.cachedMac = a.mac.toUpperCase(), this.cachedMac;
    const t = B().toUpperCase(), o = (r) => r.padEnd(12, "0").slice(0, 12), l = Buffer.from(o(t)).toString("hex").slice(0, 12).toUpperCase();
    return this.cachedMac = ((i = l.match(/.{1,2}/g)) == null ? void 0 : i.join(":")) ?? "00:00:00:00:00:00", this.cachedMac;
  }
  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: v.getLocalIPv4(),
      uptime: Math.floor(X() * 1e3),
      freeHeap: Q(),
      // "free-ish" bytes
      firmware: process.env.npm_package_version || "0.0.0",
      platform: G()
    };
  }
  static getLocalIPv4() {
    const e = C();
    for (const t of Object.keys(e))
      for (const o of e[t] || [])
        if (!o.internal && o.family === "IPv4" && o.address) return o.address;
    return "0.0.0.0";
  }
};
// 8 MB
// Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
d(v, "cachedMac", null);
let P = v;
const f = class f {
  constructor(e = {}) {
    d(this, "wss", null);
    d(this, "port");
    d(this, "connectedClients", /* @__PURE__ */ new Map());
    d(this, "nextClientId", 1);
    d(this, "processor");
    d(this, "messagesReceived", 0);
    d(this, "messagesSent", 0);
    d(this, "errorCount", 0);
    this.port = e.port ?? 81, this.processor = new P({
      onDocument: e.onDocument,
      onProtocol: e.onProtocol,
      onSystem: e.onSystem
    });
  }
  async start() {
    if (!this.wss)
      try {
        let e;
        try {
          e = (await import("./wrapper-B1zr3zr6.js")).WebSocketServer;
        } catch (t) {
          throw console.error("[Helper_WebSocket] ws module not available:", t), new Error("WebSocket module not installed. Run: npm install ws @types/ws");
        }
        this.wss = new e({ host: "0.0.0.0", port: this.port }), this.wss && (this.wss.on("connection", (t) => this.handleConnection(t)), this.wss.on("listening", () => {
          console.log(`[Helper_WebSocket] ✅ WebSocket server started on ws://0.0.0.0:${this.port}/`);
        }), this.wss.on("error", (t) => {
          console.error("[Helper_WebSocket] Server error:", t);
        }));
      } catch (e) {
        throw console.error("[Helper_WebSocket] Failed to start WebSocket server:", e), e;
      }
  }
  stop() {
    if (this.wss) {
      for (const [, e] of this.connectedClients)
        try {
          e.close(1001, "server closing");
        } catch {
        }
      this.connectedClients.clear(), this.wss.close(), this.wss = null, console.log("[Helper_WebSocket] WebSocket server stopped");
    }
  }
  isRunning() {
    return !!this.wss;
  }
  handleConnection(e) {
    const t = this.nextClientId++;
    this.connectedClients.set(t, e), console.log(`[Helper_WebSocket] Client ${t} connected (total: ${this.connectedClients.size})`), this.sendDeviceInfo(e, t), e.on("message", async (o, l) => {
      try {
        if (!l && typeof o != "object") {
          const r = o.toString();
          if (r === "ping") {
            e.send("pong"), this.messagesSent++;
            return;
          }
          if (r === "heartbeat" || r.includes("heartbeat-request")) {
            const a = f.getHeartbeat();
            e.send(JSON.stringify(a)), this.messagesSent++;
            return;
          }
          await this.processor.processData(Buffer.from(r, "utf8")), this.messagesReceived++;
          return;
        }
        const i = Buffer.isBuffer(o) ? o : Buffer.from(o);
        await this.processor.processData(i), this.messagesReceived++;
      } catch (i) {
        console.error("[Helper_WebSocket] ERROR handling message:", i), this.errorCount++, this.sendError(e, "message_handling_error", i.message || String(i));
      }
    }), e.on("close", () => {
      this.connectedClients.delete(t), console.log(
        `[Helper_WebSocket] Client ${t} disconnected (total: ${this.connectedClients.size})`
      );
    }), e.on("error", (o) => {
      console.error(`[Helper_WebSocket] Client ${t} error:`, o), this.errorCount++;
    });
  }
  sendDeviceInfo(e, t) {
    const o = {
      type: "device-connected",
      timestamp: Date.now().toString(),
      mac: f.getFormattedMacAddress(),
      ip: f.getLocalIPv4(),
      port: this.port,
      protocol: "WebSocket",
      clientId: t,
      note: "Send data as text or binary - both supported"
    };
    e.send(JSON.stringify(o)), this.messagesSent++;
  }
  sendError(e, t, o = "") {
    const l = {
      type: "error",
      error: t,
      context: o,
      timestamp: Date.now()
    };
    try {
      e.send(JSON.stringify(l)), this.messagesSent++;
    } catch {
    }
  }
  // Optional helpers if you want parity methods for broadcast, etc.
  broadcastJSON(e) {
    if (!this.wss) return;
    const t = JSON.stringify(e);
    for (const [, o] of this.connectedClients)
      o.readyState === o.OPEN && o.send(t);
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
    var i;
    if (this.cachedMac) return this.cachedMac;
    const e = C();
    for (const r of Object.keys(e))
      for (const a of e[r] || [])
        if (!a.internal && a.mac && a.mac !== "00:00:00:00:00:00")
          return this.cachedMac = a.mac.toUpperCase(), this.cachedMac;
    const t = B().toUpperCase(), o = (r) => r.padEnd(12, "0").slice(0, 12), l = Buffer.from(o(t)).toString("hex").slice(0, 12).toUpperCase();
    return this.cachedMac = ((i = l.match(/.{1,2}/g)) == null ? void 0 : i.join(":")) ?? "00:00:00:00:00:00", this.cachedMac;
  }
  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: f.getLocalIPv4(),
      uptime: Math.floor(X() * 1e3),
      freeHeap: Q(),
      // "free-ish" bytes
      firmware: process.env.npm_package_version || "0.0.0",
      platform: G()
    };
  }
  static getLocalIPv4() {
    const e = C();
    for (const t of Object.keys(e))
      for (const o of e[t] || [])
        if (!o.internal && o.family === "IPv4" && o.address) return o.address;
    return "0.0.0.0";
  }
};
// Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
d(f, "cachedMac", null);
let k = f;
const R = m.dirname(te(import.meta.url));
let h = null, y = null;
function _() {
  try {
    const s = process.env.APP_ROOT || m.join(R, ".."), e = m.join(s, "package.json"), t = JSON.parse(oe.readFileSync(e, "utf8"));
    if (t != null && t.version && typeof t.version == "string") return t.version;
  } catch (s) {
    console.warn("[Electron] Failed to read package.json version, falling back:", s);
  }
  return p.getVersion();
}
const ae = process.env.JR_GPU === "1";
process.platform === "linux" && process.arch.startsWith("arm") && !ae && (p.disableHardwareAcceleration(), p.commandLine.appendSwitch("disable-gpu"), p.commandLine.appendSwitch("disable-gpu-compositing"), p.commandLine.appendSwitch("disable-gpu-rasterization"), p.commandLine.appendSwitch("disable-gpu-sandbox"), console.log("[Electron] GPU disabled (Canvas mode)"));
process.env.JR_CLEAR_CACHE === "1" && p.whenReady().then(async () => {
  try {
    const s = ee.defaultSession;
    await s.clearCache(), await s.clearStorageData({
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
    }), console.log("[Electron] Cache cleared on startup");
  } catch (s) {
    console.warn("[Electron] Cache clear failed:", s);
  }
});
process.env.APP_ROOT = m.join(R, "..");
const S = process.env.VITE_DEV_SERVER_URL, ye = m.join(process.env.APP_ROOT, "dist-electron"), b = m.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = S ? m.join(process.env.APP_ROOT, "public") : b;
let n, c = null;
function Y() {
  n = new O({
    icon: m.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: m.join(R, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !0
    }
  }), p.isPackaged ? n.loadFile(m.join(b, "index.html")) : S ? (n.webContents.openDevTools(), n.loadURL(S)) : n.loadFile(m.join(b, "index.html"));
}
function ie(s) {
  var e, t, o, l, i, r;
  if (console.log("[main] Processing document type:", s.type), s.type === "rive_config") {
    console.log("[main] 📋 Received Rive configuration for screenId:", s.screenId), console.log("[main] 📋 Config details:", {
      canvasSize: (e = s.frameConfig) != null && e.canvas ? `${s.frameConfig.canvas.width}x${s.frameConfig.canvas.height}` : "unknown",
      riveFile: ((o = (t = s.frameConfig) == null ? void 0 : t.rive) == null ? void 0 : o.file) || "none",
      riveEmbedded: ((i = (l = s.frameConfig) == null ? void 0 : l.rive) == null ? void 0 : i.embedded) || !1,
      elementCount: ((r = s.frameElements) == null ? void 0 : r.length) || 0
    }), c && !c.isDestroyed() && (c.webContents.send("rive-config", s), console.log("[main] ✅ Rive config forwarded to visualization window")), n && !n.isDestroyed() && n.webContents.send("rive-config", s);
    return;
  }
  if (s.type === "rive_sensor") {
    console.log("[main] 📊 Received Rive sensor data for screenId:", s.screenId), console.log("[main] 📊 Sensor tags:", Object.keys(s.sensors || {})), s.sensors && Object.entries(s.sensors).forEach(([a, g]) => {
      console.log(`[main] 📊   ${a}: ${g.value} ${g.unit}`);
    }), c && !c.isDestroyed() && (c.webContents.send("rive-sensor-data", s), console.log("[main] ✅ Rive sensor data forwarded to visualization window")), n && !n.isDestroyed() && n.webContents.send("rive-sensor-data", s);
    return;
  }
  if (s.type === "sensor" && s.sensors) {
    console.log("[main] 🔄 Processing legacy sensor format");
    try {
      const a = Object.keys(s.sensors)[0];
      if (a && s.sensors[a] && s.sensors[a][0]) {
        const g = parseInt(s.sensors[a][0].Value, 10), w = s.sensors[a][0].Unit || "";
        console.log(`[main] 🔄 Legacy sensor: ${a} = ${g} ${w}`), c && !c.isDestroyed() && c.webContents.send("sensor-data", {
          value: g,
          unit: w,
          sensorName: a
        });
      }
    } catch (a) {
      console.error("[main] Error processing legacy sensor data:", a);
    }
    return;
  }
  if (s.type === "heartbeat-response" || s.type === "device-connected") {
    console.log(`[main] 💓 Received ${s.type}`);
    return;
  }
  console.log(`[main] ❓ Unknown message type: ${s.type}`);
}
async function ce() {
  try {
    const { Bonjour: s } = await import("./index-BNgNfdXg.js").then((r) => r.i), e = new s(), t = k.getFormattedMacAddress(), o = `JunctionRelay_Virtual_${t}`, l = e.publish({
      name: o,
      type: "junctionrelay",
      // Try without underscores first
      protocol: "tcp",
      // Separate protocol field
      port: 80,
      txt: {
        type: "virtual_device",
        firmware: _(),
        platform: "electron",
        mac: t
      }
    }), i = e.publish({
      name: `${o}_WS`,
      type: "junctionrelay-ws",
      protocol: "tcp",
      port: 81,
      txt: {
        type: "virtual_device_ws",
        firmware: _(),
        platform: "electron",
        mac: t
      }
    });
    y = { instance: e, httpService: l, wsService: i }, console.log(`[main] ✅ mDNS services started - device discoverable as ${o}`), console.log("[main] Advertising: junctionrelay.tcp (port 80) and junctionrelay-ws.tcp (port 81)");
  } catch (s) {
    console.log("[main] mDNS service failed to start:", s.message), console.log("[main] Device running without network discovery");
  }
}
async function le() {
  if (console.log("[main] startWebSocketServer() called"), h != null && h.isRunning()) {
    console.log("[main] Helper_WS already running on :81"), n == null || n.webContents.send("ws-status", { ok: !0, message: "WebSocket already running." });
    return;
  }
  try {
    console.log("[main] Creating Helper_WebSocket on :81"), h = new k({
      port: 81,
      onDocument: (s) => {
        n == null || n.webContents.send("display:json", s), ie(s);
      },
      onProtocol: (s) => {
        console.log("[main] 🔌 Protocol message:", s.type), n == null || n.webContents.send("display:protocol", s);
      },
      onSystem: (s) => {
        console.log("[main] ⚙️ System message:", s.type), n == null || n.webContents.send("display:system", s);
      }
    }), await h.start(), console.log("[main] ✅ Helper_WebSocket started on :81"), await ce(), n == null || n.webContents.send("ws-status", { ok: !0, message: "WebSocket server started on :81" });
  } catch (s) {
    console.error("[main] Helper_WebSocket failed:", s), n == null || n.webContents.send("ws-status", { ok: !1, message: `Failed to start WebSocket: ${String(s)}` });
  }
}
function E() {
  if (console.log("[main] stopWebSocketServer() called"), y)
    try {
      y.instance && y.instance.destroy(), y = null, console.log("[main] mDNS services stopped");
    } catch (s) {
      console.error("[main] Error stopping mDNS:", s);
    }
  if (h) {
    try {
      h.stop();
    } catch (s) {
      console.error("[main] jrWs.stop error:", s);
    }
    h = null, console.log("[main] Helper_WS stopped"), n == null || n.webContents.send("ws-status", { ok: !0, message: "WebSocket server stopped." });
    return;
  }
  n == null || n.webContents.send("ws-status", { ok: !0, message: "WebSocket not running." });
}
u.on("open-external", (s, e) => {
  try {
    se.openExternal(e);
  } catch (t) {
    console.error("Error opening external URL:", t);
  }
});
u.handle("get-app-version", () => _());
u.on("start-ws", () => {
  le();
});
u.on("stop-ws", () => {
  E();
});
u.handle("ws-stats", () => {
  var s;
  try {
    return ((s = h == null ? void 0 : h.getStats) == null ? void 0 : s.call(h)) ?? null;
  } catch {
    return null;
  }
});
u.on("open-visualization", (s, e = {}) => {
  try {
    console.log("[main] 🎨 Opening visualization window with options:", e);
    const t = {
      webPreferences: {
        preload: m.join(R, "preload.mjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        webSecurity: !0
      },
      show: !1
    };
    e.fullscreen !== !1 ? Object.assign(t, {
      fullscreen: !0,
      frame: !1,
      alwaysOnTop: !0,
      skipTaskbar: !0,
      resizable: !1
    }) : Object.assign(t, {
      width: 1e3,
      height: 700,
      frame: !0,
      alwaysOnTop: !1,
      skipTaskbar: !1,
      resizable: !0,
      title: "JunctionRelay Visualization (Debug Mode)"
    }), c = new O(t), e.fullscreen !== !1 && c.setAlwaysOnTop(!0, "screen-saver"), c.on("closed", () => {
      console.log("[main] 🎨 Visualization window closed"), c = null, n && !n.isDestroyed() && n.webContents.send("visualization-closed");
    }), c.once("ready-to-show", () => {
      console.log("[main] 🎨 Visualization window ready, showing"), c == null || c.show();
    }), c.webContents.on("before-input-event", (o, l) => {
      l.key === "Escape" && l.type === "keyDown" && (console.log("[main] 🎨 Escape key pressed, closing visualization"), c == null || c.close());
    }), p.isPackaged ? c.loadFile(m.join(b, "index.html"), {
      query: { mode: "visualization" }
    }) : S ? c.loadURL(S + "?mode=visualization") : c.loadFile(m.join(b, "index.html"), {
      query: { mode: "visualization" }
    }), s.sender.send("visualization-opened"), console.log("[main] ✅ Visualization window opened");
  } catch (t) {
    console.error("Error opening visualization kiosk:", t);
  }
});
u.on("close-visualization", (s) => {
  c && !c.isDestroyed() && (console.log("[main] 🎨 Closing visualization window (IPC request)"), c.close(), c = null, s.sender.send("visualization-closed"));
});
u.on("quit-app", () => {
  console.log("[main] 🚪 Quit app requested");
  try {
    E();
  } catch {
  }
  p.quit();
});
p.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    console.log("[main] 🚪 All windows closed, quitting app");
    try {
      E();
    } catch {
    }
    p.quit(), n = null;
  }
});
p.on("activate", () => {
  O.getAllWindows().length === 0 && (console.log("[main] 📱 App activated, creating window"), Y());
});
p.whenReady().then(() => {
  console.log("[main] 🚀 App ready, creating main window"), Y();
});
export {
  ye as MAIN_DIST,
  b as RENDERER_DIST,
  S as VITE_DEV_SERVER_URL
};
