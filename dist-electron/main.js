var Ce = Object.defineProperty;
var Re = (s, e, t) => e in s ? Ce(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var g = (s, e, t) => Re(s, typeof e != "symbol" ? e + "" : e, t);
import { app as h, session as ke, ipcMain as v, shell as Pe, BrowserWindow as U, screen as me } from "electron";
import { fileURLToPath as Oe } from "node:url";
import u from "node:path";
import $ from "node:fs";
import { gunzip as Ee } from "zlib";
import { networkInterfaces as A, hostname as ue, platform as pe, freemem as he, uptime as we } from "os";
import { promisify as De } from "util";
const ge = De(Ee), y = class y {
  constructor(e) {
    g(this, "callbacks");
    g(this, "messagesProcessed", 0);
    g(this, "errorCount", 0);
    // Limits (raise if you push big frames)
    g(this, "MAX_PAYLOAD_SIZE", 8 * 1024 * 1024);
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
      const t = await ge(e), n = this.tryParseJSON(t);
      if (!n) return;
      this.forward(
        n,
        /*srcType*/
        3
      ), this.messagesProcessed++;
    } catch (t) {
      console.error("[StreamProcessor] ERROR: Failed to gunzip raw gzip:", t.message), this.errorCount++;
    }
  }
  async handlePrefixed(e) {
    const t = parseInt(e.toString("ascii", 0, 4), 10), n = parseInt(e.toString("ascii", 4, 6), 10), i = parseInt(e.toString("ascii", 6, 8), 10);
    if (!(n === 0 || n === 1)) {
      console.error("[StreamProcessor] ERROR: Invalid type field:", n), this.errorCount++;
      return;
    }
    const o = t > 0 ? t : Math.max(0, e.length - 8);
    if (o <= 0 || o > this.MAX_PAYLOAD_SIZE) {
      console.error("[StreamProcessor] ERROR: Invalid/oversize payload length:", o), this.errorCount++;
      return;
    }
    if (8 + o > e.length) {
      console.error("[StreamProcessor] ERROR: Incomplete payload:", o, "available:", e.length - 8), this.errorCount++;
      return;
    }
    const l = e.slice(8, 8 + o);
    if (n === 0) {
      const c = this.tryParseJSON(l);
      if (!c) return;
      this.forward(
        c,
        /*srcType*/
        2,
        i
      ), this.messagesProcessed++;
    } else
      try {
        const c = await ge(l), m = this.tryParseJSON(c);
        if (!m) return;
        this.forward(
          m,
          /*srcType*/
          4,
          i
        ), this.messagesProcessed++;
      } catch (c) {
        console.error("[StreamProcessor] ERROR: Failed to gunzip prefixed gzip:", c.message), this.errorCount++;
      }
  }
  forward(e, t, n) {
    var c, m, p, S, b, d, R, k, P, x, M, B, q, H, X, Y, Q, Z, K, ee, se, te, ne, oe, re, ie, ae, ce;
    const i = e == null ? void 0 : e.type;
    if ((i === "rive_config" || i === "rive_sensor") && i === "rive_config" && y.VERBOSE_CONFIG_LOGGING) {
      console.log(`[StreamProcessor] Processing ${i} for screenId: ${e.screenId}`);
      const _ = ((m = (c = e.frameConfig) == null ? void 0 : c.frameConfig) == null ? void 0 : m.rive) || ((p = e.frameConfig) == null ? void 0 : p.rive);
      _ != null && _.discovery && (console.log(`[StreamProcessor] Rive discovery: ${_.discovery.machines.length} machines, ${_.discovery.metadata.totalInputs} inputs`), _.discovery.machines.forEach((W) => {
        console.log(`[StreamProcessor]   Machine "${W.name}": ${W.inputs.length} inputs`);
      }));
      const le = ((S = e.frameConfig) == null ? void 0 : S.frameElements) || e.frameElements || [], be = le.filter((W) => {
        var de, fe;
        return ((fe = (de = W.riveConnections) == null ? void 0 : de.availableInputs) == null ? void 0 : fe.length) > 0;
      });
      console.log(`[StreamProcessor] ${le.length} frame elements, ${be.length} with Rive connections`);
    }
    const o = e == null ? void 0 : e.destination, l = y.getFormattedMacAddress();
    if (o && l && o.toLowerCase() !== l.toLowerCase()) {
      (d = (b = this.callbacks).onProtocol) == null || d.call(b, e);
      return;
    }
    if (o && l && o.toLowerCase() === l.toLowerCase() && delete e.destination, !i) {
      (k = (R = this.callbacks).onSystem) == null || k.call(R, e), (x = (P = this.callbacks).onDocument) == null || x.call(P, e);
      return;
    }
    if (i === "rive_config" || i === "rive_sensor") {
      (B = (M = this.callbacks).onDocument) == null || B.call(M, e);
      return;
    }
    if (i === "sensor" || i === "config") {
      (H = (q = this.callbacks).onDocument) == null || H.call(q, e);
      return;
    }
    if (i === "MQTT_Subscription_Request" || i === "websocket_ping" || i === "http_request" || i === "espnow_message" || i === "peer_management") {
      (Y = (X = this.callbacks).onProtocol) == null || Y.call(X, e);
      return;
    }
    if (i === "preferences" || i === "stats" || i === "device_info" || i === "device_capabilities" || i === "system_command") {
      (Z = (Q = this.callbacks).onSystem) == null || Z.call(Q, e), (ee = (K = this.callbacks).onDocument) == null || ee.call(K, e);
      return;
    }
    if (i === "heartbeat-response" || i === "device-connected") {
      (te = (se = this.callbacks).onSystem) == null || te.call(se, e), (oe = (ne = this.callbacks).onDocument) == null || oe.call(ne, e);
      return;
    }
    y.seenUnknownTypes.has(i) || (y.seenUnknownTypes.add(i), console.log(`[StreamProcessor] Unknown message type '${i}', routing to System callback`)), (ie = (re = this.callbacks).onSystem) == null || ie.call(re, e), (ce = (ae = this.callbacks).onDocument) == null || ce.call(ae, e);
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
      const n = e[t];
      if (n < 48 || n > 57) return !1;
    }
    return !0;
  }
  // ===== Utilities for heartbeat parity =====
  static getFormattedMacAddress() {
    var o;
    if (this.cachedMac) return this.cachedMac;
    const e = A();
    for (const l of Object.keys(e))
      for (const c of e[l] || [])
        if (!c.internal && c.mac && c.mac !== "00:00:00:00:00:00")
          return this.cachedMac = c.mac.toUpperCase(), this.cachedMac;
    const t = ue().toUpperCase(), n = (l) => l.padEnd(12, "0").slice(0, 12), i = Buffer.from(n(t)).toString("hex").slice(0, 12).toUpperCase();
    return this.cachedMac = ((o = i.match(/.{1,2}/g)) == null ? void 0 : o.join(":")) ?? "00:00:00:00:00:00", this.cachedMac;
  }
  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: y.getLocalIPv4(),
      uptime: Math.floor(we() * 1e3),
      freeHeap: he(),
      // "free-ish" bytes
      firmware: process.env.npm_package_version || "0.0.0",
      platform: pe()
    };
  }
  static getLocalIPv4() {
    const e = A();
    for (const t of Object.keys(e))
      for (const n of e[t] || [])
        if (!n.internal && n.family === "IPv4" && n.address) return n.address;
    return "0.0.0.0";
  }
};
// Debug control - set to false to reduce console spam
g(y, "VERBOSE_SENSOR_LOGGING", !1), g(y, "VERBOSE_CONFIG_LOGGING", !0), g(y, "VERBOSE_ROUTING_LOGGING", !1), // Static property for tracking seen unknown types
g(y, "seenUnknownTypes", /* @__PURE__ */ new Set()), // 8 MB
// Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
g(y, "cachedMac", null);
let G = y;
const O = class O {
  constructor(e = {}) {
    g(this, "wss", null);
    g(this, "port");
    g(this, "connectedClients", /* @__PURE__ */ new Map());
    g(this, "nextClientId", 1);
    g(this, "processor");
    g(this, "messagesReceived", 0);
    g(this, "messagesSent", 0);
    g(this, "errorCount", 0);
    this.port = e.port ?? 81, this.processor = new G({
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
    this.connectedClients.set(t, e), console.log(`[Helper_WebSocket] Client ${t} connected (total: ${this.connectedClients.size})`), this.sendDeviceInfo(e, t), e.on("message", async (n, i) => {
      try {
        if (!i && typeof n != "object") {
          const l = n.toString();
          if (l === "ping") {
            e.send("pong"), this.messagesSent++;
            return;
          }
          if (l === "heartbeat" || l.includes("heartbeat-request")) {
            const c = O.getHeartbeat();
            e.send(JSON.stringify(c)), this.messagesSent++;
            return;
          }
          await this.processor.processData(Buffer.from(l, "utf8")), this.messagesReceived++;
          return;
        }
        const o = Buffer.isBuffer(n) ? n : Buffer.from(n);
        await this.processor.processData(o), this.messagesReceived++;
      } catch (o) {
        console.error("[Helper_WebSocket] ERROR handling message:", o), this.errorCount++, this.sendError(e, "message_handling_error", o.message || String(o));
      }
    }), e.on("close", () => {
      this.connectedClients.delete(t), console.log(
        `[Helper_WebSocket] Client ${t} disconnected (total: ${this.connectedClients.size})`
      );
    }), e.on("error", (n) => {
      console.error(`[Helper_WebSocket] Client ${t} error:`, n), this.errorCount++;
    });
  }
  sendDeviceInfo(e, t) {
    const n = {
      type: "device-connected",
      timestamp: Date.now().toString(),
      mac: O.getFormattedMacAddress(),
      ip: O.getLocalIPv4(),
      port: this.port,
      protocol: "WebSocket",
      clientId: t,
      note: "Send data as text or binary - both supported"
    };
    e.send(JSON.stringify(n)), this.messagesSent++;
  }
  sendError(e, t, n = "") {
    const i = {
      type: "error",
      error: t,
      context: n,
      timestamp: Date.now()
    };
    try {
      e.send(JSON.stringify(i)), this.messagesSent++;
    } catch {
    }
  }
  // Optional helpers if you want parity methods for broadcast, etc.
  broadcastJSON(e) {
    if (!this.wss) return;
    const t = JSON.stringify(e);
    for (const [, n] of this.connectedClients)
      n.readyState === n.OPEN && n.send(t);
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
    var o;
    if (this.cachedMac) return this.cachedMac;
    const e = A();
    for (const l of Object.keys(e))
      for (const c of e[l] || [])
        if (!c.internal && c.mac && c.mac !== "00:00:00:00:00:00")
          return this.cachedMac = c.mac.toUpperCase(), this.cachedMac;
    const t = ue().toUpperCase(), n = (l) => l.padEnd(12, "0").slice(0, 12), i = Buffer.from(n(t)).toString("hex").slice(0, 12).toUpperCase();
    return this.cachedMac = ((o = i.match(/.{1,2}/g)) == null ? void 0 : o.join(":")) ?? "00:00:00:00:00:00", this.cachedMac;
  }
  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: O.getLocalIPv4(),
      uptime: Math.floor(we() * 1e3),
      freeHeap: he(),
      // "free-ish" bytes
      firmware: process.env.npm_package_version || "0.0.0",
      platform: pe()
    };
  }
  static getLocalIPv4() {
    const e = A();
    for (const t of Object.keys(e))
      for (const n of e[t] || [])
        if (!n.internal && n.family === "IPv4" && n.address) return n.address;
    return "0.0.0.0";
  }
};
// Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
g(O, "cachedMac", null);
let L = O;
const z = u.dirname(Oe(import.meta.url));
let w = null, j = null;
const ye = !1, ve = () => {
  const s = h.getPath("userData");
  return u.join(s, "jr-preferences.json");
}, F = {
  fullscreenMode: !0
}, _e = () => {
  try {
    const s = ve();
    if ($.existsSync(s)) {
      const e = $.readFileSync(s, "utf8"), t = JSON.parse(e);
      return console.log("[main] ✅ Loaded preferences from disk:", t), { ...F, ...t };
    } else
      return console.log("[main] 📄 No preferences file found, using defaults"), F;
  } catch (s) {
    return console.warn("[main] ⚠️ Error loading preferences, using defaults:", s), F;
  }
}, Ie = (s) => {
  try {
    const e = ve(), t = u.dirname(e);
    return $.existsSync(t) || $.mkdirSync(t, { recursive: !0 }), $.writeFileSync(e, JSON.stringify(s, null, 2), "utf8"), console.log("[main] ✅ Saved preferences to disk:", s), !0;
  } catch (e) {
    return console.error("[main] ❌ Error saving preferences:", e), !1;
  }
};
let T = _e();
function V() {
  try {
    const s = process.env.APP_ROOT || u.join(z, ".."), e = u.join(s, "package.json"), t = JSON.parse($.readFileSync(e, "utf8"));
    if (t != null && t.version && typeof t.version == "string") return t.version;
  } catch (s) {
    console.warn("[Electron] Failed to read package.json version, falling back:", s);
  }
  return h.getVersion();
}
const $e = process.env.JR_GPU === "1";
process.platform === "linux" && process.arch.startsWith("arm") && !$e && (h.disableHardwareAcceleration(), h.commandLine.appendSwitch("disable-gpu"), h.commandLine.appendSwitch("disable-gpu-compositing"), h.commandLine.appendSwitch("disable-gpu-rasterization"), h.commandLine.appendSwitch("disable-gpu-sandbox"), console.log("[Electron] GPU disabled (Canvas mode)"));
process.env.JR_CLEAR_CACHE === "1" && h.whenReady().then(async () => {
  try {
    const s = ke.defaultSession;
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
process.env.APP_ROOT = u.join(z, "..");
const E = process.env.VITE_DEV_SERVER_URL, Fe = u.join(process.env.APP_ROOT, "dist-electron"), D = u.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = E ? u.join(process.env.APP_ROOT, "public") : D;
let r, a = null, f = null, C = null;
function I(s, e, t) {
  if (s && !s.isDestroyed())
    try {
      return s.webContents.send(e, t), !0;
    } catch (n) {
      return console.error(`[main] Error sending ${e} to window:`, n), !1;
    }
  return !1;
}
function Se() {
  r = new U({
    icon: u.join(process.env.VITE_PUBLIC, "jr_platinum.svg"),
    webPreferences: {
      preload: u.join(z, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !0
    }
  }), h.isPackaged ? r.loadFile(u.join(D, "index.html")) : E ? (r.webContents.openDevTools(), r.loadURL(E)) : r.loadFile(u.join(D, "index.html"));
}
function N(s) {
  var e, t, n, i, o, l, c, m, p, S, b;
  if (N.seenTypes || (N.seenTypes = /* @__PURE__ */ new Set()), s.type === "rive_config") {
    {
      console.log("[main] 📋 Received Rive configuration for screenId:", s.screenId);
      const d = ((t = (e = s.frameConfig) == null ? void 0 : e.frameConfig) == null ? void 0 : t.rive) || ((n = s.frameConfig) == null ? void 0 : n.rive);
      if (d) {
        console.log("[main] 📋 Config details:", {
          canvasSize: (i = s.frameConfig) != null && i.canvas ? `${s.frameConfig.canvas.width}x${s.frameConfig.canvas.height}` : "unknown",
          riveFile: d.file || "none",
          riveFileUrl: d.fileUrl || "none",
          riveEmbedded: d.embedded || !1,
          elementCount: ((o = s.frameElements) == null ? void 0 : o.length) || 0,
          hasDiscovery: !!d.discovery,
          stateMachines: ((c = (l = d.discovery) == null ? void 0 : l.machines) == null ? void 0 : c.length) || 0,
          totalInputs: ((p = (m = d.discovery) == null ? void 0 : m.metadata) == null ? void 0 : p.totalInputs) || 0
        }), (S = d.discovery) != null && S.machines && console.log("[main] 🎮 State machines:", d.discovery.machines.map((P) => `${P.name}(${P.inputs.length} inputs)`).join(", "));
        const R = ((b = s.frameConfig) == null ? void 0 : b.frameElements) || s.frameElements || [], k = R.filter((P) => {
          var x, M;
          return ((M = (x = P.riveConnections) == null ? void 0 : x.availableInputs) == null ? void 0 : M.length) > 0;
        });
        k.length > 0 && console.log(`[main] 🔗 ${k.length}/${R.length} elements have Rive connections`);
      }
    }
    C = s, I(a, "rive-config", s), I(f, "rive-config", s), I(r, "rive-config", s), console.log("[main] ✅ Rive config forwarded to all windows");
    return;
  }
  if (s.type === "rive_sensor") {
    I(a, "rive-sensor-data", s), I(f, "rive-sensor-data", s), I(r, "rive-sensor-data", s);
    return;
  }
  if (s.type === "sensor" && s.sensors) {
    try {
      const d = Object.keys(s.sensors)[0];
      if (d && s.sensors[d] && s.sensors[d][0]) {
        const R = parseInt(s.sensors[d][0].Value, 10), k = s.sensors[d][0].Unit || "";
        a && !a.isDestroyed() && a.webContents.send("sensor-data", {
          value: R,
          unit: k,
          sensorName: d
        });
      }
    } catch (d) {
      console.error("[main] Error processing legacy sensor data:", d);
    }
    return;
  }
  s.type === "heartbeat-response" || s.type === "device-connected" || s.type && !N.seenTypes.has(s.type) && (N.seenTypes.add(s.type), console.log(`[main] ❓ Unknown message type: ${s.type}`), console.log(`[main] 📋 Message keys: ${Object.keys(s).join(", ")}`));
}
async function xe() {
  try {
    const { Bonjour: s } = await import("./index-BNgNfdXg.js").then((l) => l.i), e = new s(), t = L.getFormattedMacAddress(), n = `JunctionRelay_Virtual_${t}`, i = e.publish({
      name: n,
      type: "junctionrelay",
      // Try without underscores first
      protocol: "tcp",
      // Separate protocol field
      port: 80,
      txt: {
        type: "virtual_device",
        firmware: V(),
        platform: "electron",
        mac: t
      }
    }), o = e.publish({
      name: `${n}_WS`,
      type: "junctionrelay-ws",
      protocol: "tcp",
      port: 81,
      txt: {
        type: "virtual_device_ws",
        firmware: V(),
        platform: "electron",
        mac: t
      }
    });
    j = { instance: e, httpService: i, wsService: o }, console.log(`[main] ✅ mDNS services started - device discoverable as ${n}`);
  } catch (s) {
    console.log("[main] mDNS service failed to start:", s.message), console.log("[main] Device running without network discovery");
  }
}
async function Me() {
  if (console.log("[main] startWebSocketServer() called"), w != null && w.isRunning()) {
    console.log("[main] Helper_WS already running on :81"), r == null || r.webContents.send("ws-status", { ok: !0, message: "WebSocket already running." });
    return;
  }
  try {
    console.log("[main] Creating Helper_WebSocket on :81"), w = new L({
      port: 81,
      onDocument: (s) => {
        r == null || r.webContents.send("display:json", s), N(s);
      },
      onProtocol: (s) => {
        r == null || r.webContents.send("display:protocol", s);
      },
      onSystem: (s) => {
        console.log("[main] ⚙️ System message:", s.type), r == null || r.webContents.send("display:system", s);
      }
    }), await w.start(), console.log("[main] ✅ Helper_WebSocket started on :81"), await xe(), r == null || r.webContents.send("ws-status", { ok: !0, message: "WebSocket server started on :81" });
  } catch (s) {
    console.error("[main] Helper_WebSocket failed:", s), r == null || r.webContents.send("ws-status", { ok: !1, message: `Failed to start WebSocket: ${String(s)}` });
  }
}
function J() {
  if (console.log("[main] stopWebSocketServer() called"), j)
    try {
      j.instance && j.instance.destroy(), j = null, console.log("[main] mDNS services stopped");
    } catch (s) {
      console.error("[main] Error stopping mDNS:", s);
    }
  if (w) {
    try {
      w.stop();
    } catch (s) {
      console.error("[main] jrWs.stop error:", s);
    }
    w = null, console.log("[main] Helper_WS stopped"), r == null || r.webContents.send("ws-status", { ok: !0, message: "WebSocket server stopped." });
    return;
  }
  r == null || r.webContents.send("ws-status", { ok: !0, message: "WebSocket not running." });
}
v.on("open-external", (s, e) => {
  try {
    Pe.openExternal(e);
  } catch (t) {
    console.error("Error opening external URL:", t);
  }
});
v.handle("get-app-version", () => V());
v.handle("get-fullscreen-preference", () => (console.log(`[main] 📖 Retrieved fullscreen preference: ${T.fullscreenMode}`), T.fullscreenMode));
v.on("save-fullscreen-preference", (s, e) => {
  T.fullscreenMode = e;
  const t = Ie(T);
  console.log(`[main] ${t ? "✅" : "❌"} Saved fullscreen preference: ${e}`);
});
v.on("start-ws", () => {
  Me();
});
v.on("stop-ws", () => {
  J();
});
v.handle("ws-stats", () => {
  var s;
  try {
    return ((s = w == null ? void 0 : w.getStats) == null ? void 0 : s.call(w)) ?? null;
  } catch {
    return null;
  }
});
v.on("open-debug-window", () => {
  try {
    if (console.log("[main] 🔍 Opening debug window"), f && !f.isDestroyed()) {
      f.focus();
      return;
    }
    f = new U({
      width: 800,
      height: 600,
      title: "JunctionRelay Debug Panel",
      webPreferences: {
        preload: u.join(z, "preload.mjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        webSecurity: !0
      },
      show: !1
    }), f.on("closed", () => {
      console.log("[main] 🔍 Debug window closed"), f = null, r && !r.isDestroyed() && r.webContents.send("debug-window-closed");
    }), f.once("ready-to-show", () => {
      console.log("[main] 🔍 Debug window ready, showing"), f == null || f.show(), setTimeout(() => {
        C && f && !f.isDestroyed() && (console.log("[main] 🔍 Sending buffered config to debug window"), f.webContents.send("rive-config", C));
      }, 500);
    }), h.isPackaged ? f.loadFile(u.join(D, "index.html"), {
      query: { debug: "true" }
    }) : E ? f.loadURL(E + "?debug=true") : f.loadFile(u.join(D, "index.html"), {
      query: { debug: "true" }
    }), r && !r.isDestroyed() && r.webContents.send("debug-window-opened"), console.log("[main] ✅ Debug window opened");
  } catch (s) {
    console.error("Error opening debug window:", s);
  }
});
v.on("close-debug-window", () => {
  f && !f.isDestroyed() && (console.log("[main] 🔍 Closing debug window (IPC request)"), f.close(), f = null, r && !r.isDestroyed() && r.webContents.send("debug-window-closed"));
});
v.on("open-visualization", (s, e = {}) => {
  var t, n, i;
  try {
    if (console.log("[main] 🎨 Opening visualization window with options:", e), a && !a.isDestroyed()) {
      console.log("[main] 🎨 Visualization window already exists, focusing it"), a.focus(), s.sender.send("visualization-opened");
      return;
    }
    let o = null, l = null;
    if (r && !r.isDestroyed())
      try {
        l = r.getBounds(), o = me.getDisplayMatching(l).bounds, console.log(`[main] 🎨 Using display: ${o.width}x${o.height} at ${o.x},${o.y}`);
      } catch (m) {
        console.warn("[main] ⚠️ Could not get main window display, using primary:", m), o = me.getPrimaryDisplay().bounds, console.log(`[main] 🎨 Using primary display: ${o.width}x${o.height} at ${o.x},${o.y}`);
      }
    const c = {
      webPreferences: {
        preload: u.join(z, "preload.mjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        webSecurity: !0
      },
      show: !1
    };
    if (e.fullscreen !== !1)
      Object.assign(c, {
        fullscreen: !0,
        frame: !1,
        alwaysOnTop: !0,
        skipTaskbar: !0,
        resizable: !1
      }), o && (Object.assign(c, {
        x: o.x,
        y: o.y,
        width: o.width,
        height: o.height
      }), console.log(`[main] 🎨 Fullscreen mode: ${o.width}x${o.height}`));
    else {
      let m = 1e3, p = 700;
      if (C) {
        const d = ((n = (t = C.frameConfig) == null ? void 0 : t.frameConfig) == null ? void 0 : n.canvas) || ((i = C.frameConfig) == null ? void 0 : i.canvas);
        d && d.width && d.height && (m = d.width, p = d.height, console.log(`[main] 🎨 Using canvas dimensions: ${m}x${p}`));
      }
      let S, b;
      o && (S = o.x + Math.floor((o.width - m) / 2), b = o.y + Math.floor((o.height - p) / 2), console.log(`[main] 🎨 Windowed mode: ${m}x${p} at ${S},${b}`)), Object.assign(c, {
        width: m,
        height: p,
        x: S,
        y: b,
        frame: !0,
        alwaysOnTop: !1,
        skipTaskbar: !1,
        resizable: !0,
        title: `JunctionRelay Visualization (${m}×${p})`
      });
    }
    a = new U(c), e.fullscreen !== !1 && a.setAlwaysOnTop(!0, "screen-saver"), a.on("closed", () => {
      console.log("[main] 🎨 Visualization window closed"), a = null, r && !r.isDestroyed() && r.webContents.send("visualization-closed");
    }), a.once("ready-to-show", () => {
      console.log("[main] 🎨 Visualization window ready, showing"), a == null || a.show(), setTimeout(() => {
        C && a && !a.isDestroyed() && (console.log("[main] 🎨 Sending buffered config to visualization window"), a.webContents.send("rive-config", C));
      }, 500);
    }), a.webContents.on("before-input-event", (m, p) => {
      p.key === "Escape" && p.type === "keyDown" && (console.log("[main] 🎨 Escape key pressed, closing visualization"), a == null || a.close());
    }), h.isPackaged ? a.loadFile(u.join(D, "index.html"), {
      query: { mode: "visualization" }
    }) : E ? a.loadURL(E + "?mode=visualization") : a.loadFile(u.join(D, "index.html"), {
      query: { mode: "visualization" }
    }), s.sender.send("visualization-opened"), console.log("[main] ✅ Visualization window opened");
  } catch (o) {
    console.error("Error opening visualization kiosk:", o);
  }
});
v.on("close-visualization", (s) => {
  a && !a.isDestroyed() && (console.log("[main] 🎨 Closing visualization window (IPC request)"), a.close(), a = null, s.sender.send("visualization-closed"));
});
v.on("quit-app", () => {
  console.log("[main] 🚪 Quit app requested");
  try {
    J();
  } catch {
  }
  h.quit();
});
h.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    console.log("[main] 🚪 All windows closed, quitting app");
    try {
      J();
    } catch {
    }
    h.quit(), r = null;
  }
});
h.on("activate", () => {
  U.getAllWindows().length === 0 && (console.log("[main] 📱 App activated, creating window"), Se());
});
h.whenReady().then(() => {
  console.log("[main] 🚀 App ready, creating main window"), Se();
});
export {
  Fe as MAIN_DIST,
  D as RENDERER_DIST,
  E as VITE_DEV_SERVER_URL
};
