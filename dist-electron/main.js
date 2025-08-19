var ce = Object.defineProperty;
var le = (s, e, t) => e in s ? ce(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var h = (s, e, t) => le(s, typeof e != "symbol" ? e + "" : e, t);
import { app as f, session as me, ipcMain as C, shell as pe, BrowserWindow as T } from "electron";
import { fileURLToPath as de } from "node:url";
import u from "node:path";
import ge from "node:fs";
import { gunzip as he } from "zlib";
import { networkInterfaces as A, hostname as oe, platform as ne, freemem as re, uptime as ie } from "os";
import { promisify as fe } from "util";
const te = fe(he), I = class I {
  constructor(e) {
    h(this, "callbacks");
    h(this, "messagesProcessed", 0);
    h(this, "errorCount", 0);
    // Limits (raise if you push big frames)
    h(this, "MAX_PAYLOAD_SIZE", 8 * 1024 * 1024);
    this.callbacks = e;
  }
  // Public stats (optional)
  getStats() {
    return { messagesProcessed: this.messagesProcessed, errorCount: this.errorCount };
  }
  // Entry point – pass every WS message buffer here (text converted to Buffer by caller)
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
      const t = await te(e), o = this.tryParseJSON(t);
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
    const t = parseInt(e.toString("ascii", 0, 4), 10), o = parseInt(e.toString("ascii", 4, 6), 10), n = parseInt(e.toString("ascii", 6, 8), 10);
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
    const l = e.slice(8, 8 + i);
    if (o === 0) {
      const m = this.tryParseJSON(l);
      if (!m) return;
      this.forward(
        m,
        /*srcType*/
        2,
        n
      ), this.messagesProcessed++;
    } else
      try {
        const m = await te(l), b = this.tryParseJSON(m);
        if (!b) return;
        this.forward(
          b,
          /*srcType*/
          4,
          n
        ), this.messagesProcessed++;
      } catch (m) {
        console.error("[StreamProcessor] ERROR: Failed to gunzip prefixed gzip:", m.message), this.errorCount++;
      }
  }
  forward(e, t, o) {
    var m, b, E, _, $, c, v, d, p, g, k, F, V, H, J, q, B, G, Q, X, Y, Z, K, ee;
    const n = e == null ? void 0 : e.type;
    if (n === "rive_config" || n === "rive_sensor") {
      if (console.log(`[StreamProcessor] Processing ${n} for screenId: ${e.screenId}`), n === "rive_config") {
        const w = ((b = (m = e.frameConfig) == null ? void 0 : m.frameConfig) == null ? void 0 : b.rive) || ((E = e.frameConfig) == null ? void 0 : E.rive);
        w != null && w.discovery && (console.log(`[StreamProcessor] Rive discovery: ${w.discovery.machines.length} machines, ${w.discovery.metadata.totalInputs} inputs`), w.discovery.machines.forEach((S) => {
          console.log(`[StreamProcessor]   Machine "${S.name}": ${S.inputs.length} inputs`);
        }));
        const j = ((_ = e.frameConfig) == null ? void 0 : _.frameElements) || e.frameElements || [], P = j.filter((S) => {
          var z, se;
          return ((se = (z = S.riveConnections) == null ? void 0 : z.availableInputs) == null ? void 0 : se.length) > 0;
        });
        console.log(`[StreamProcessor] ${j.length} frame elements, ${P.length} with Rive connections`);
      }
      if (n === "rive_sensor") {
        const w = Object.keys(e.sensors || {}), j = w.reduce((P, S) => P + S.split(",").length, 0);
        console.log(`[StreamProcessor] Sensor data: ${w.length} sensor keys expanding to ${j} individual tags`), w.forEach((P) => {
          const S = P.split(",").map((z) => z.trim());
          S.length > 1 && console.log(`[StreamProcessor]   Multi-tag: "${P}" → [${S.join(", ")}]`);
        });
      }
    }
    const i = e == null ? void 0 : e.destination, l = I.getFormattedMacAddress();
    if (i && l && i.toLowerCase() !== l.toLowerCase()) {
      (c = ($ = this.callbacks).onProtocol) == null || c.call($, e);
      return;
    }
    if (i && l && i.toLowerCase() === l.toLowerCase() && delete e.destination, !n) {
      (d = (v = this.callbacks).onSystem) == null || d.call(v, e), (g = (p = this.callbacks).onDocument) == null || g.call(p, e);
      return;
    }
    if (n === "rive_config" || n === "rive_sensor") {
      console.log(`[StreamProcessor] Routing ${n} to Document callback for renderer processing`), (F = (k = this.callbacks).onDocument) == null || F.call(k, e);
      return;
    }
    if (n === "sensor" || n === "config") {
      (H = (V = this.callbacks).onDocument) == null || H.call(V, e);
      return;
    }
    if (n === "MQTT_Subscription_Request" || n === "websocket_ping" || n === "http_request" || n === "espnow_message" || n === "peer_management") {
      (q = (J = this.callbacks).onProtocol) == null || q.call(J, e);
      return;
    }
    if (n === "preferences" || n === "stats" || n === "device_info" || n === "device_capabilities" || n === "system_command") {
      (G = (B = this.callbacks).onSystem) == null || G.call(B, e), (X = (Q = this.callbacks).onDocument) == null || X.call(Q, e);
      return;
    }
    console.log(`[StreamProcessor] Unknown message type '${n}', routing to System callback`), (Z = (Y = this.callbacks).onSystem) == null || Z.call(Y, e), (ee = (K = this.callbacks).onDocument) == null || ee.call(K, e);
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
    const e = A();
    for (const l of Object.keys(e))
      for (const m of e[l] || [])
        if (!m.internal && m.mac && m.mac !== "00:00:00:00:00:00")
          return this.cachedMac = m.mac.toUpperCase(), this.cachedMac;
    const t = oe().toUpperCase(), o = (l) => l.padEnd(12, "0").slice(0, 12), n = Buffer.from(o(t)).toString("hex").slice(0, 12).toUpperCase();
    return this.cachedMac = ((i = n.match(/.{1,2}/g)) == null ? void 0 : i.join(":")) ?? "00:00:00:00:00:00", this.cachedMac;
  }
  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: I.getLocalIPv4(),
      uptime: Math.floor(ie() * 1e3),
      freeHeap: re(),
      // "free-ish" bytes
      firmware: process.env.npm_package_version || "0.0.0",
      platform: ne()
    };
  }
  static getLocalIPv4() {
    const e = A();
    for (const t of Object.keys(e))
      for (const o of e[t] || [])
        if (!o.internal && o.family === "IPv4" && o.address) return o.address;
    return "0.0.0.0";
  }
};
// 8 MB
// Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
h(I, "cachedMac", null);
let L = I;
const R = class R {
  constructor(e = {}) {
    h(this, "wss", null);
    h(this, "port");
    h(this, "connectedClients", /* @__PURE__ */ new Map());
    h(this, "nextClientId", 1);
    h(this, "processor");
    h(this, "messagesReceived", 0);
    h(this, "messagesSent", 0);
    h(this, "errorCount", 0);
    this.port = e.port ?? 81, this.processor = new L({
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
    this.connectedClients.set(t, e), console.log(`[Helper_WebSocket] Client ${t} connected (total: ${this.connectedClients.size})`), this.sendDeviceInfo(e, t), e.on("message", async (o, n) => {
      try {
        if (!n && typeof o != "object") {
          const l = o.toString();
          if (l === "ping") {
            e.send("pong"), this.messagesSent++;
            return;
          }
          if (l === "heartbeat" || l.includes("heartbeat-request")) {
            const m = R.getHeartbeat();
            e.send(JSON.stringify(m)), this.messagesSent++;
            return;
          }
          await this.processor.processData(Buffer.from(l, "utf8")), this.messagesReceived++;
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
      mac: R.getFormattedMacAddress(),
      ip: R.getLocalIPv4(),
      port: this.port,
      protocol: "WebSocket",
      clientId: t,
      note: "Send data as text or binary - both supported"
    };
    e.send(JSON.stringify(o)), this.messagesSent++;
  }
  sendError(e, t, o = "") {
    const n = {
      type: "error",
      error: t,
      context: o,
      timestamp: Date.now()
    };
    try {
      e.send(JSON.stringify(n)), this.messagesSent++;
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
    const e = A();
    for (const l of Object.keys(e))
      for (const m of e[l] || [])
        if (!m.internal && m.mac && m.mac !== "00:00:00:00:00:00")
          return this.cachedMac = m.mac.toUpperCase(), this.cachedMac;
    const t = oe().toUpperCase(), o = (l) => l.padEnd(12, "0").slice(0, 12), n = Buffer.from(o(t)).toString("hex").slice(0, 12).toUpperCase();
    return this.cachedMac = ((i = n.match(/.{1,2}/g)) == null ? void 0 : i.join(":")) ?? "00:00:00:00:00:00", this.cachedMac;
  }
  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: R.getLocalIPv4(),
      uptime: Math.floor(ie() * 1e3),
      freeHeap: re(),
      // "free-ish" bytes
      firmware: process.env.npm_package_version || "0.0.0",
      platform: ne()
    };
  }
  static getLocalIPv4() {
    const e = A();
    for (const t of Object.keys(e))
      for (const o of e[t] || [])
        if (!o.internal && o.family === "IPv4" && o.address) return o.address;
    return "0.0.0.0";
  }
};
// Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
h(R, "cachedMac", null);
let x = R;
const W = u.dirname(de(import.meta.url));
let y = null, O = null;
function N() {
  try {
    const s = process.env.APP_ROOT || u.join(W, ".."), e = u.join(s, "package.json"), t = JSON.parse(ge.readFileSync(e, "utf8"));
    if (t != null && t.version && typeof t.version == "string") return t.version;
  } catch (s) {
    console.warn("[Electron] Failed to read package.json version, falling back:", s);
  }
  return f.getVersion();
}
const ue = process.env.JR_GPU === "1";
process.platform === "linux" && process.arch.startsWith("arm") && !ue && (f.disableHardwareAcceleration(), f.commandLine.appendSwitch("disable-gpu"), f.commandLine.appendSwitch("disable-gpu-compositing"), f.commandLine.appendSwitch("disable-gpu-rasterization"), f.commandLine.appendSwitch("disable-gpu-sandbox"), console.log("[Electron] GPU disabled (Canvas mode)"));
process.env.JR_CLEAR_CACHE === "1" && f.whenReady().then(async () => {
  try {
    const s = me.defaultSession;
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
process.env.APP_ROOT = u.join(W, "..");
const D = process.env.VITE_DEV_SERVER_URL, $e = u.join(process.env.APP_ROOT, "dist-electron"), M = u.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = D ? u.join(process.env.APP_ROOT, "public") : M;
let r, a = null;
function ae() {
  r = new T({
    icon: u.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: u.join(W, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !0
    }
  }), f.isPackaged ? r.loadFile(u.join(M, "index.html")) : D ? (r.webContents.openDevTools(), r.loadURL(D)) : r.loadFile(u.join(M, "index.html"));
}
function ye(s) {
  var e, t, o, n, i, l, m, b, E, _, $;
  if (console.log("[main] Processing document type:", s.type), s.type === "rive_config") {
    console.log("[main] 📋 Received enhanced Rive configuration for screenId:", s.screenId);
    const c = ((t = (e = s.frameConfig) == null ? void 0 : e.frameConfig) == null ? void 0 : t.rive) || ((o = s.frameConfig) == null ? void 0 : o.rive);
    if (c) {
      console.log("[main] 📋 Config details:", {
        canvasSize: (n = s.frameConfig) != null && n.canvas ? `${s.frameConfig.canvas.width}x${s.frameConfig.canvas.height}` : "unknown",
        riveFile: c.file || "none",
        riveFileUrl: c.fileUrl || "none",
        riveEmbedded: c.embedded || !1,
        elementCount: ((i = s.frameElements) == null ? void 0 : i.length) || 0,
        hasDiscovery: !!c.discovery,
        stateMachines: ((m = (l = c.discovery) == null ? void 0 : l.machines) == null ? void 0 : m.length) || 0,
        totalInputs: ((E = (b = c.discovery) == null ? void 0 : b.metadata) == null ? void 0 : E.totalInputs) || 0
      }), (_ = c.discovery) != null && _.machines && (console.log("[main] 🎮 State machine discovery:"), c.discovery.machines.forEach((p) => {
        console.log(`[main]   🎯 ${p.name}: ${p.inputs.length} inputs`), p.inputs.forEach((g) => {
          console.log(`[main]     📊 ${g.name} (${g.type}): ${g.currentValue}`);
        });
      }));
      const v = (($ = s.frameConfig) == null ? void 0 : $.frameElements) || s.frameElements || [], d = v.filter((p) => {
        var g, k;
        return ((k = (g = p.riveConnections) == null ? void 0 : g.availableInputs) == null ? void 0 : k.length) > 0;
      });
      console.log(`[main] 📐 Frame elements: ${v.length} total, ${d.length} with Rive connections`), d.forEach((p) => {
        console.log(`[main]   🔗 ${p.properties.sensorTag || p.id}: ${p.riveConnections.availableInputs.length} Rive connections`), p.riveConnections.availableInputs.forEach((g) => {
          console.log(`[main]     ⚡ ${g.fullKey} (${g.inputType})`);
        });
      });
    }
    a && !a.isDestroyed() && (a.webContents.send("rive-config", s), console.log("[main] ✅ Enhanced Rive config forwarded to visualization window")), r && !r.isDestroyed() && r.webContents.send("rive-config", s);
    return;
  }
  if (s.type === "rive_sensor") {
    console.log("[main] 📊 Received enhanced Rive sensor data for screenId:", s.screenId);
    const c = Object.keys(s.sensors || {}), v = c.reduce((d, p) => d + p.split(",").length, 0);
    console.log("[main] 📊 Sensor payload analysis:"), console.log(`[main]   📦 ${c.length} sensor keys expanding to ${v} individual tags`), c.forEach((d) => {
      const p = s.sensors[d], g = d.split(",").map((k) => k.trim());
      g.length > 1 ? (console.log(`[main]   🔀 Multi-tag "${d}" → [${g.join(", ")}]`), console.log(`[main]     📊 Value: ${p.value} ${p.unit}`)) : console.log(`[main]   📊 ${d}: ${p.value} ${p.unit}`);
    }), a && !a.isDestroyed() && (a.webContents.send("rive-sensor-data", s), console.log("[main] ✅ Enhanced Rive sensor data forwarded to visualization window")), r && !r.isDestroyed() && r.webContents.send("rive-sensor-data", s);
    return;
  }
  if (s.type === "sensor" && s.sensors) {
    console.log("[main] 🔄 Processing legacy sensor format");
    try {
      const c = Object.keys(s.sensors)[0];
      if (c && s.sensors[c] && s.sensors[c][0]) {
        const v = parseInt(s.sensors[c][0].Value, 10), d = s.sensors[c][0].Unit || "";
        console.log(`[main] 🔄 Legacy sensor: ${c} = ${v} ${d}`), a && !a.isDestroyed() && a.webContents.send("sensor-data", {
          value: v,
          unit: d,
          sensorName: c
        });
      }
    } catch (c) {
      console.error("[main] Error processing legacy sensor data:", c);
    }
    return;
  }
  if (s.type === "heartbeat-response" || s.type === "device-connected") {
    console.log(`[main] 💓 Received ${s.type}`);
    return;
  }
  console.log(`[main] ❓ Unknown message type: ${s.type}`), s.type && console.log(`[main] 📋 Message keys: ${Object.keys(s).join(", ")}`);
}
async function ve() {
  try {
    const { Bonjour: s } = await import("./index-BNgNfdXg.js").then((l) => l.i), e = new s(), t = x.getFormattedMacAddress(), o = `JunctionRelay_Virtual_${t}`, n = e.publish({
      name: o,
      type: "junctionrelay",
      // Try without underscores first
      protocol: "tcp",
      // Separate protocol field
      port: 80,
      txt: {
        type: "virtual_device",
        firmware: N(),
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
        firmware: N(),
        platform: "electron",
        mac: t
      }
    });
    O = { instance: e, httpService: n, wsService: i }, console.log(`[main] ✅ mDNS services started - device discoverable as ${o}`), console.log("[main] Advertising: junctionrelay.tcp (port 80) and junctionrelay-ws.tcp (port 81)");
  } catch (s) {
    console.log("[main] mDNS service failed to start:", s.message), console.log("[main] Device running without network discovery");
  }
}
async function we() {
  if (console.log("[main] startWebSocketServer() called"), y != null && y.isRunning()) {
    console.log("[main] Helper_WS already running on :81"), r == null || r.webContents.send("ws-status", { ok: !0, message: "WebSocket already running." });
    return;
  }
  try {
    console.log("[main] Creating Helper_WebSocket on :81"), y = new x({
      port: 81,
      onDocument: (s) => {
        r == null || r.webContents.send("display:json", s), ye(s);
      },
      onProtocol: (s) => {
        console.log("[main] 🔌 Protocol message:", s.type), r == null || r.webContents.send("display:protocol", s);
      },
      onSystem: (s) => {
        console.log("[main] ⚙️ System message:", s.type), r == null || r.webContents.send("display:system", s);
      }
    }), await y.start(), console.log("[main] ✅ Helper_WebSocket started on :81"), await ve(), r == null || r.webContents.send("ws-status", { ok: !0, message: "WebSocket server started on :81" });
  } catch (s) {
    console.error("[main] Helper_WebSocket failed:", s), r == null || r.webContents.send("ws-status", { ok: !1, message: `Failed to start WebSocket: ${String(s)}` });
  }
}
function U() {
  if (console.log("[main] stopWebSocketServer() called"), O)
    try {
      O.instance && O.instance.destroy(), O = null, console.log("[main] mDNS services stopped");
    } catch (s) {
      console.error("[main] Error stopping mDNS:", s);
    }
  if (y) {
    try {
      y.stop();
    } catch (s) {
      console.error("[main] jrWs.stop error:", s);
    }
    y = null, console.log("[main] Helper_WS stopped"), r == null || r.webContents.send("ws-status", { ok: !0, message: "WebSocket server stopped." });
    return;
  }
  r == null || r.webContents.send("ws-status", { ok: !0, message: "WebSocket not running." });
}
C.on("open-external", (s, e) => {
  try {
    pe.openExternal(e);
  } catch (t) {
    console.error("Error opening external URL:", t);
  }
});
C.handle("get-app-version", () => N());
C.on("start-ws", () => {
  we();
});
C.on("stop-ws", () => {
  U();
});
C.handle("ws-stats", () => {
  var s;
  try {
    return ((s = y == null ? void 0 : y.getStats) == null ? void 0 : s.call(y)) ?? null;
  } catch {
    return null;
  }
});
C.on("open-visualization", (s, e = {}) => {
  try {
    console.log("[main] 🎨 Opening visualization window with options:", e);
    const t = {
      webPreferences: {
        preload: u.join(W, "preload.mjs"),
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
    }), a = new T(t), e.fullscreen !== !1 && a.setAlwaysOnTop(!0, "screen-saver"), a.on("closed", () => {
      console.log("[main] 🎨 Visualization window closed"), a = null, r && !r.isDestroyed() && r.webContents.send("visualization-closed");
    }), a.once("ready-to-show", () => {
      console.log("[main] 🎨 Visualization window ready, showing"), a == null || a.show();
    }), a.webContents.on("before-input-event", (o, n) => {
      n.key === "Escape" && n.type === "keyDown" && (console.log("[main] 🎨 Escape key pressed, closing visualization"), a == null || a.close());
    }), f.isPackaged ? a.loadFile(u.join(M, "index.html"), {
      query: { mode: "visualization" }
    }) : D ? a.loadURL(D + "?mode=visualization") : a.loadFile(u.join(M, "index.html"), {
      query: { mode: "visualization" }
    }), s.sender.send("visualization-opened"), console.log("[main] ✅ Visualization window opened");
  } catch (t) {
    console.error("Error opening visualization kiosk:", t);
  }
});
C.on("close-visualization", (s) => {
  a && !a.isDestroyed() && (console.log("[main] 🎨 Closing visualization window (IPC request)"), a.close(), a = null, s.sender.send("visualization-closed"));
});
C.on("quit-app", () => {
  console.log("[main] 🚪 Quit app requested");
  try {
    U();
  } catch {
  }
  f.quit();
});
f.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    console.log("[main] 🚪 All windows closed, quitting app");
    try {
      U();
    } catch {
    }
    f.quit(), r = null;
  }
});
f.on("activate", () => {
  T.getAllWindows().length === 0 && (console.log("[main] 📱 App activated, creating window"), ae());
});
f.whenReady().then(() => {
  console.log("[main] 🚀 App ready, creating main window"), ae();
});
export {
  $e as MAIN_DIST,
  M as RENDERER_DIST,
  D as VITE_DEV_SERVER_URL
};
