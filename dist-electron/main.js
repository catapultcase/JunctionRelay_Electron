var he = Object.defineProperty;
var ye = (s, e, n) => e in s ? he(s, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : s[e] = n;
var v = (s, e, n) => ye(s, typeof e != "symbol" ? e + "" : e, n);
import { app as h, session as we, ipcMain as b, shell as ve, BrowserWindow as J, screen as ce } from "electron";
import { fileURLToPath as Se } from "node:url";
import f from "node:path";
import j from "node:fs";
import { gunzip as be } from "zlib";
import { networkInterfaces as F, hostname as de, platform as ge, freemem as me, uptime as ue } from "os";
import { promisify as Ce } from "util";
const le = Ce(be), A = class A {
  constructor(e) {
    v(this, "callbacks");
    v(this, "messagesProcessed", 0);
    v(this, "errorCount", 0);
    // Limits (raise if you push big frames)
    v(this, "MAX_PAYLOAD_SIZE", 8 * 1024 * 1024);
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
        } catch (n) {
          console.error("[StreamProcessor] ERROR handling prefixed payload:", n), this.errorCount++;
        }
        return;
      }
    }
  }
  // ---------- Private ----------
  handleRawJSON(e) {
    const n = this.tryParseJSON(e);
    n && (this.forward(n), this.messagesProcessed++);
  }
  async handleRawGzip(e) {
    try {
      const n = await le(e), t = this.tryParseJSON(n);
      if (!t) return;
      this.forward(
        t,
        /*srcType*/
        3
      ), this.messagesProcessed++;
    } catch (n) {
      console.error("[StreamProcessor] ERROR: Failed to gunzip raw gzip:", n.message), this.errorCount++;
    }
  }
  async handlePrefixed(e) {
    const n = parseInt(e.toString("ascii", 0, 4), 10), t = parseInt(e.toString("ascii", 4, 6), 10), i = parseInt(e.toString("ascii", 6, 8), 10);
    if (!(t === 0 || t === 1)) {
      console.error("[StreamProcessor] ERROR: Invalid type field:", t), this.errorCount++;
      return;
    }
    const o = n > 0 ? n : Math.max(0, e.length - 8);
    if (o <= 0 || o > this.MAX_PAYLOAD_SIZE) {
      console.error("[StreamProcessor] ERROR: Invalid/oversize payload length:", o), this.errorCount++;
      return;
    }
    if (8 + o > e.length) {
      console.error("[StreamProcessor] ERROR: Incomplete payload:", o, "available:", e.length - 8), this.errorCount++;
      return;
    }
    const a = e.slice(8, 8 + o);
    if (t === 0) {
      const d = this.tryParseJSON(a);
      if (!d) return;
      this.forward(
        d,
        /*srcType*/
        2,
        i
      ), this.messagesProcessed++;
    } else
      try {
        const d = await le(a), m = this.tryParseJSON(d);
        if (!m) return;
        this.forward(
          m,
          /*srcType*/
          4,
          i
        ), this.messagesProcessed++;
      } catch (d) {
        console.error("[StreamProcessor] ERROR: Failed to gunzip prefixed gzip:", d.message), this.errorCount++;
      }
  }
  forward(e, n, t) {
    var d, m, p, $, k, c, C, y, u, w, E, G, X, Y, Q, Z, K, ee, se, ne, oe, te, re, ie;
    const i = e == null ? void 0 : e.type;
    if (i === "rive_config" || i === "rive_sensor") {
      if (console.log(`[StreamProcessor] Processing ${i} for screenId: ${e.screenId}`), i === "rive_config") {
        const P = ((m = (d = e.frameConfig) == null ? void 0 : d.frameConfig) == null ? void 0 : m.rive) || ((p = e.frameConfig) == null ? void 0 : p.rive);
        P != null && P.discovery && (console.log(`[StreamProcessor] Rive discovery: ${P.discovery.machines.length} machines, ${P.discovery.metadata.totalInputs} inputs`), P.discovery.machines.forEach((R) => {
          console.log(`[StreamProcessor]   Machine "${R.name}": ${R.inputs.length} inputs`);
        }));
        const N = (($ = e.frameConfig) == null ? void 0 : $.frameElements) || e.frameElements || [], I = N.filter((R) => {
          var L, ae;
          return ((ae = (L = R.riveConnections) == null ? void 0 : L.availableInputs) == null ? void 0 : ae.length) > 0;
        });
        console.log(`[StreamProcessor] ${N.length} frame elements, ${I.length} with Rive connections`);
      }
      if (i === "rive_sensor") {
        const P = Object.keys(e.sensors || {}), N = P.reduce((I, R) => I + R.split(",").length, 0);
        console.log(`[StreamProcessor] Sensor data: ${P.length} sensor keys expanding to ${N} individual tags`), P.forEach((I) => {
          const R = I.split(",").map((L) => L.trim());
          R.length > 1 && console.log(`[StreamProcessor]   Multi-tag: "${I}" → [${R.join(", ")}]`);
        });
      }
    }
    const o = e == null ? void 0 : e.destination, a = A.getFormattedMacAddress();
    if (o && a && o.toLowerCase() !== a.toLowerCase()) {
      (c = (k = this.callbacks).onProtocol) == null || c.call(k, e);
      return;
    }
    if (o && a && o.toLowerCase() === a.toLowerCase() && delete e.destination, !i) {
      (y = (C = this.callbacks).onSystem) == null || y.call(C, e), (w = (u = this.callbacks).onDocument) == null || w.call(u, e);
      return;
    }
    if (i === "rive_config" || i === "rive_sensor") {
      console.log(`[StreamProcessor] Routing ${i} to Document callback for renderer processing`), (G = (E = this.callbacks).onDocument) == null || G.call(E, e);
      return;
    }
    if (i === "sensor" || i === "config") {
      (Y = (X = this.callbacks).onDocument) == null || Y.call(X, e);
      return;
    }
    if (i === "MQTT_Subscription_Request" || i === "websocket_ping" || i === "http_request" || i === "espnow_message" || i === "peer_management") {
      (Z = (Q = this.callbacks).onProtocol) == null || Z.call(Q, e);
      return;
    }
    if (i === "preferences" || i === "stats" || i === "device_info" || i === "device_capabilities" || i === "system_command") {
      (ee = (K = this.callbacks).onSystem) == null || ee.call(K, e), (ne = (se = this.callbacks).onDocument) == null || ne.call(se, e);
      return;
    }
    console.log(`[StreamProcessor] Unknown message type '${i}', routing to System callback`), (te = (oe = this.callbacks).onSystem) == null || te.call(oe, e), (ie = (re = this.callbacks).onDocument) == null || ie.call(re, e);
  }
  tryParseJSON(e) {
    try {
      return JSON.parse(e.toString("utf8"));
    } catch (n) {
      return console.error("[StreamProcessor] ERROR: JSON parse failed:", n.message), this.errorCount++, null;
    }
  }
  isAllAsciiDigits(e) {
    for (let n = 0; n < e.length; n++) {
      const t = e[n];
      if (t < 48 || t > 57) return !1;
    }
    return !0;
  }
  // ===== Utilities for heartbeat parity =====
  static getFormattedMacAddress() {
    var o;
    if (this.cachedMac) return this.cachedMac;
    const e = F();
    for (const a of Object.keys(e))
      for (const d of e[a] || [])
        if (!d.internal && d.mac && d.mac !== "00:00:00:00:00:00")
          return this.cachedMac = d.mac.toUpperCase(), this.cachedMac;
    const n = de().toUpperCase(), t = (a) => a.padEnd(12, "0").slice(0, 12), i = Buffer.from(t(n)).toString("hex").slice(0, 12).toUpperCase();
    return this.cachedMac = ((o = i.match(/.{1,2}/g)) == null ? void 0 : o.join(":")) ?? "00:00:00:00:00:00", this.cachedMac;
  }
  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: A.getLocalIPv4(),
      uptime: Math.floor(ue() * 1e3),
      freeHeap: me(),
      // "free-ish" bytes
      firmware: process.env.npm_package_version || "0.0.0",
      platform: ge()
    };
  }
  static getLocalIPv4() {
    const e = F();
    for (const n of Object.keys(e))
      for (const t of e[n] || [])
        if (!t.internal && t.family === "IPv4" && t.address) return t.address;
    return "0.0.0.0";
  }
};
// 8 MB
// Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
v(A, "cachedMac", null);
let H = A;
const _ = class _ {
  constructor(e = {}) {
    v(this, "wss", null);
    v(this, "port");
    v(this, "connectedClients", /* @__PURE__ */ new Map());
    v(this, "nextClientId", 1);
    v(this, "processor");
    v(this, "messagesReceived", 0);
    v(this, "messagesSent", 0);
    v(this, "errorCount", 0);
    this.port = e.port ?? 81, this.processor = new H({
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
        } catch (n) {
          throw console.error("[Helper_WebSocket] ws module not available:", n), new Error("WebSocket module not installed. Run: npm install ws @types/ws");
        }
        this.wss = new e({ host: "0.0.0.0", port: this.port }), this.wss && (this.wss.on("connection", (n) => this.handleConnection(n)), this.wss.on("listening", () => {
          console.log(`[Helper_WebSocket] ✅ WebSocket server started on ws://0.0.0.0:${this.port}/`);
        }), this.wss.on("error", (n) => {
          console.error("[Helper_WebSocket] Server error:", n);
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
    const n = this.nextClientId++;
    this.connectedClients.set(n, e), console.log(`[Helper_WebSocket] Client ${n} connected (total: ${this.connectedClients.size})`), this.sendDeviceInfo(e, n), e.on("message", async (t, i) => {
      try {
        if (!i && typeof t != "object") {
          const a = t.toString();
          if (a === "ping") {
            e.send("pong"), this.messagesSent++;
            return;
          }
          if (a === "heartbeat" || a.includes("heartbeat-request")) {
            const d = _.getHeartbeat();
            e.send(JSON.stringify(d)), this.messagesSent++;
            return;
          }
          await this.processor.processData(Buffer.from(a, "utf8")), this.messagesReceived++;
          return;
        }
        const o = Buffer.isBuffer(t) ? t : Buffer.from(t);
        await this.processor.processData(o), this.messagesReceived++;
      } catch (o) {
        console.error("[Helper_WebSocket] ERROR handling message:", o), this.errorCount++, this.sendError(e, "message_handling_error", o.message || String(o));
      }
    }), e.on("close", () => {
      this.connectedClients.delete(n), console.log(
        `[Helper_WebSocket] Client ${n} disconnected (total: ${this.connectedClients.size})`
      );
    }), e.on("error", (t) => {
      console.error(`[Helper_WebSocket] Client ${n} error:`, t), this.errorCount++;
    });
  }
  sendDeviceInfo(e, n) {
    const t = {
      type: "device-connected",
      timestamp: Date.now().toString(),
      mac: _.getFormattedMacAddress(),
      ip: _.getLocalIPv4(),
      port: this.port,
      protocol: "WebSocket",
      clientId: n,
      note: "Send data as text or binary - both supported"
    };
    e.send(JSON.stringify(t)), this.messagesSent++;
  }
  sendError(e, n, t = "") {
    const i = {
      type: "error",
      error: n,
      context: t,
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
    const n = JSON.stringify(e);
    for (const [, t] of this.connectedClients)
      t.readyState === t.OPEN && t.send(n);
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
    const e = F();
    for (const a of Object.keys(e))
      for (const d of e[a] || [])
        if (!d.internal && d.mac && d.mac !== "00:00:00:00:00:00")
          return this.cachedMac = d.mac.toUpperCase(), this.cachedMac;
    const n = de().toUpperCase(), t = (a) => a.padEnd(12, "0").slice(0, 12), i = Buffer.from(t(n)).toString("hex").slice(0, 12).toUpperCase();
    return this.cachedMac = ((o = i.match(/.{1,2}/g)) == null ? void 0 : o.join(":")) ?? "00:00:00:00:00:00", this.cachedMac;
  }
  static getHeartbeat() {
    return {
      type: "heartbeat-response",
      timestamp: Date.now(),
      status: "ok",
      mac: this.getFormattedMacAddress(),
      ip: _.getLocalIPv4(),
      uptime: Math.floor(ue() * 1e3),
      freeHeap: me(),
      // "free-ish" bytes
      firmware: process.env.npm_package_version || "0.0.0",
      platform: ge()
    };
  }
  static getLocalIPv4() {
    const e = F();
    for (const n of Object.keys(e))
      for (const t of e[n] || [])
        if (!t.internal && t.family === "IPv4" && t.address) return t.address;
    return "0.0.0.0";
  }
};
// Cached "MAC" equivalent (closest parity to ESP32 getFormattedMacAddress)
v(_, "cachedMac", null);
let T = _;
const W = f.dirname(Se(import.meta.url));
let S = null, z = null;
const fe = () => {
  const s = h.getPath("userData");
  return f.join(s, "jr-preferences.json");
}, V = {
  fullscreenMode: !0
}, Pe = () => {
  try {
    const s = fe();
    if (j.existsSync(s)) {
      const e = j.readFileSync(s, "utf8"), n = JSON.parse(e);
      return console.log("[main] ✅ Loaded preferences from disk:", n), { ...V, ...n };
    } else
      return console.log("[main] 📄 No preferences file found, using defaults"), V;
  } catch (s) {
    return console.warn("[main] ⚠️ Error loading preferences, using defaults:", s), V;
  }
}, $e = (s) => {
  try {
    const e = fe(), n = f.dirname(e);
    return j.existsSync(n) || j.mkdirSync(n, { recursive: !0 }), j.writeFileSync(e, JSON.stringify(s, null, 2), "utf8"), console.log("[main] ✅ Saved preferences to disk:", s), !0;
  } catch (e) {
    return console.error("[main] ❌ Error saving preferences:", e), !1;
  }
};
let U = Pe();
function q() {
  try {
    const s = process.env.APP_ROOT || f.join(W, ".."), e = f.join(s, "package.json"), n = JSON.parse(j.readFileSync(e, "utf8"));
    if (n != null && n.version && typeof n.version == "string") return n.version;
  } catch (s) {
    console.warn("[Electron] Failed to read package.json version, falling back:", s);
  }
  return h.getVersion();
}
const ke = process.env.JR_GPU === "1";
process.platform === "linux" && process.arch.startsWith("arm") && !ke && (h.disableHardwareAcceleration(), h.commandLine.appendSwitch("disable-gpu"), h.commandLine.appendSwitch("disable-gpu-compositing"), h.commandLine.appendSwitch("disable-gpu-rasterization"), h.commandLine.appendSwitch("disable-gpu-sandbox"), console.log("[Electron] GPU disabled (Canvas mode)"));
process.env.JR_CLEAR_CACHE === "1" && h.whenReady().then(async () => {
  try {
    const s = we.defaultSession;
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
process.env.APP_ROOT = f.join(W, "..");
const O = process.env.VITE_DEV_SERVER_URL, We = f.join(process.env.APP_ROOT, "dist-electron"), x = f.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = O ? f.join(process.env.APP_ROOT, "public") : x;
let r, l = null, g = null, D = null;
function M(s, e, n) {
  if (s && !s.isDestroyed())
    try {
      return s.webContents.send(e, n), !0;
    } catch (t) {
      return console.error(`[main] Error sending ${e} to window:`, t), !1;
    }
  return !1;
}
function pe() {
  r = new J({
    icon: f.join(process.env.VITE_PUBLIC, "jr_platinum.svg"),
    webPreferences: {
      preload: f.join(W, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !0
    }
  }), h.isPackaged ? r.loadFile(f.join(x, "index.html")) : O ? (r.webContents.openDevTools(), r.loadURL(O)) : r.loadFile(f.join(x, "index.html"));
}
function Re(s) {
  var e, n, t, i, o, a, d, m, p, $, k;
  if (console.log("[main] Processing document type:", s.type), s.type === "rive_config") {
    console.log("[main] 📋 Received enhanced Rive configuration for screenId:", s.screenId), D = s;
    const c = ((n = (e = s.frameConfig) == null ? void 0 : e.frameConfig) == null ? void 0 : n.rive) || ((t = s.frameConfig) == null ? void 0 : t.rive);
    if (c) {
      console.log("[main] 📋 Config details:", {
        canvasSize: (i = s.frameConfig) != null && i.canvas ? `${s.frameConfig.canvas.width}x${s.frameConfig.canvas.height}` : "unknown",
        riveFile: c.file || "none",
        riveFileUrl: c.fileUrl || "none",
        riveEmbedded: c.embedded || !1,
        elementCount: ((o = s.frameElements) == null ? void 0 : o.length) || 0,
        hasDiscovery: !!c.discovery,
        stateMachines: ((d = (a = c.discovery) == null ? void 0 : a.machines) == null ? void 0 : d.length) || 0,
        totalInputs: ((p = (m = c.discovery) == null ? void 0 : m.metadata) == null ? void 0 : p.totalInputs) || 0
      }), ($ = c.discovery) != null && $.machines && (console.log("[main] 🎮 State machine discovery:"), c.discovery.machines.forEach((u) => {
        console.log(`[main]   🎯 ${u.name}: ${u.inputs.length} inputs`), u.inputs.forEach((w) => {
          console.log(`[main]     📊 ${w.name} (${w.type}): ${w.currentValue}`);
        });
      }));
      const C = ((k = s.frameConfig) == null ? void 0 : k.frameElements) || s.frameElements || [], y = C.filter((u) => {
        var w, E;
        return ((E = (w = u.riveConnections) == null ? void 0 : w.availableInputs) == null ? void 0 : E.length) > 0;
      });
      console.log(`[main] 🔍 Frame elements: ${C.length} total, ${y.length} with Rive connections`), y.forEach((u) => {
        console.log(`[main]   🔗 ${u.properties.sensorTag || u.id}: ${u.riveConnections.availableInputs.length} Rive connections`), u.riveConnections.availableInputs.forEach((w) => {
          console.log(`[main]     ⚡ ${w.fullKey} (${w.inputType})`);
        });
      });
    }
    M(l, "rive-config", s), M(g, "rive-config", s), M(r, "rive-config", s), console.log("[main] ✅ Enhanced Rive config forwarded to all windows");
    return;
  }
  if (s.type === "rive_sensor") {
    console.log("[main] 📊 Received enhanced Rive sensor data for screenId:", s.screenId);
    const c = Object.keys(s.sensors || {}), C = c.reduce((y, u) => y + u.split(",").length, 0);
    console.log("[main] 📊 Sensor payload analysis:"), console.log(`[main]   📦 ${c.length} sensor keys expanding to ${C} individual tags`), c.forEach((y) => {
      const u = s.sensors[y], w = y.split(",").map((E) => E.trim());
      w.length > 1 ? (console.log(`[main]   🔀 Multi-tag "${y}" → [${w.join(", ")}]`), console.log(`[main]     📊 Value: ${u.value} ${u.unit}`)) : console.log(`[main]   📊 ${y}: ${u.value} ${u.unit}`);
    }), M(l, "rive-sensor-data", s), M(g, "rive-sensor-data", s), M(r, "rive-sensor-data", s), console.log("[main] ✅ Enhanced Rive sensor data forwarded to all windows");
    return;
  }
  if (s.type === "sensor" && s.sensors) {
    console.log("[main] 📄 Processing legacy sensor format");
    try {
      const c = Object.keys(s.sensors)[0];
      if (c && s.sensors[c] && s.sensors[c][0]) {
        const C = parseInt(s.sensors[c][0].Value, 10), y = s.sensors[c][0].Unit || "";
        console.log(`[main] 📄 Legacy sensor: ${c} = ${C} ${y}`), l && !l.isDestroyed() && l.webContents.send("sensor-data", {
          value: C,
          unit: y,
          sensorName: c
        });
      }
    } catch (c) {
      console.error("[main] Error processing legacy sensor data:", c);
    }
    return;
  }
  if (s.type === "heartbeat-response" || s.type === "device-connected") {
    console.log(`[main] 💛 Received ${s.type}`);
    return;
  }
  console.log(`[main] ❓ Unknown message type: ${s.type}`), s.type && console.log(`[main] 📋 Message keys: ${Object.keys(s).join(", ")}`);
}
async function De() {
  try {
    const { Bonjour: s } = await import("./index-BNgNfdXg.js").then((a) => a.i), e = new s(), n = T.getFormattedMacAddress(), t = `JunctionRelay_Virtual_${n}`, i = e.publish({
      name: t,
      type: "junctionrelay",
      // Try without underscores first
      protocol: "tcp",
      // Separate protocol field
      port: 80,
      txt: {
        type: "virtual_device",
        firmware: q(),
        platform: "electron",
        mac: n
      }
    }), o = e.publish({
      name: `${t}_WS`,
      type: "junctionrelay-ws",
      protocol: "tcp",
      port: 81,
      txt: {
        type: "virtual_device_ws",
        firmware: q(),
        platform: "electron",
        mac: n
      }
    });
    z = { instance: e, httpService: i, wsService: o }, console.log(`[main] ✅ mDNS services started - device discoverable as ${t}`), console.log("[main] Advertising: junctionrelay.tcp (port 80) and junctionrelay-ws.tcp (port 81)");
  } catch (s) {
    console.log("[main] mDNS service failed to start:", s.message), console.log("[main] Device running without network discovery");
  }
}
async function Ee() {
  if (console.log("[main] startWebSocketServer() called"), S != null && S.isRunning()) {
    console.log("[main] Helper_WS already running on :81"), r == null || r.webContents.send("ws-status", { ok: !0, message: "WebSocket already running." });
    return;
  }
  try {
    console.log("[main] Creating Helper_WebSocket on :81"), S = new T({
      port: 81,
      onDocument: (s) => {
        r == null || r.webContents.send("display:json", s), Re(s);
      },
      onProtocol: (s) => {
        console.log("[main] 🔌 Protocol message:", s.type), r == null || r.webContents.send("display:protocol", s);
      },
      onSystem: (s) => {
        console.log("[main] ⚙️ System message:", s.type), r == null || r.webContents.send("display:system", s);
      }
    }), await S.start(), console.log("[main] ✅ Helper_WebSocket started on :81"), await De(), r == null || r.webContents.send("ws-status", { ok: !0, message: "WebSocket server started on :81" });
  } catch (s) {
    console.error("[main] Helper_WebSocket failed:", s), r == null || r.webContents.send("ws-status", { ok: !1, message: `Failed to start WebSocket: ${String(s)}` });
  }
}
function B() {
  if (console.log("[main] stopWebSocketServer() called"), z)
    try {
      z.instance && z.instance.destroy(), z = null, console.log("[main] mDNS services stopped");
    } catch (s) {
      console.error("[main] Error stopping mDNS:", s);
    }
  if (S) {
    try {
      S.stop();
    } catch (s) {
      console.error("[main] jrWs.stop error:", s);
    }
    S = null, console.log("[main] Helper_WS stopped"), r == null || r.webContents.send("ws-status", { ok: !0, message: "WebSocket server stopped." });
    return;
  }
  r == null || r.webContents.send("ws-status", { ok: !0, message: "WebSocket not running." });
}
b.on("open-external", (s, e) => {
  try {
    ve.openExternal(e);
  } catch (n) {
    console.error("Error opening external URL:", n);
  }
});
b.handle("get-app-version", () => q());
b.handle("get-fullscreen-preference", () => (console.log(`[main] 📖 Retrieved fullscreen preference: ${U.fullscreenMode}`), U.fullscreenMode));
b.on("save-fullscreen-preference", (s, e) => {
  U.fullscreenMode = e;
  const n = $e(U);
  console.log(`[main] ${n ? "✅" : "❌"} Saved fullscreen preference: ${e}`);
});
b.on("start-ws", () => {
  Ee();
});
b.on("stop-ws", () => {
  B();
});
b.handle("ws-stats", () => {
  var s;
  try {
    return ((s = S == null ? void 0 : S.getStats) == null ? void 0 : s.call(S)) ?? null;
  } catch {
    return null;
  }
});
b.on("open-debug-window", () => {
  try {
    if (console.log("[main] 🔍 Opening debug window"), g && !g.isDestroyed()) {
      g.focus();
      return;
    }
    g = new J({
      width: 800,
      height: 600,
      title: "JunctionRelay Debug Panel",
      webPreferences: {
        preload: f.join(W, "preload.mjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        webSecurity: !0
      },
      show: !1
    }), g.on("closed", () => {
      console.log("[main] 🔍 Debug window closed"), g = null, r && !r.isDestroyed() && r.webContents.send("debug-window-closed");
    }), g.once("ready-to-show", () => {
      console.log("[main] 🔍 Debug window ready, showing"), g == null || g.show(), setTimeout(() => {
        D && g && !g.isDestroyed() && (console.log("[main] 🔍 Sending buffered config to debug window"), g.webContents.send("rive-config", D));
      }, 500);
    }), h.isPackaged ? g.loadFile(f.join(x, "index.html"), {
      query: { debug: "true" }
    }) : O ? g.loadURL(O + "?debug=true") : g.loadFile(f.join(x, "index.html"), {
      query: { debug: "true" }
    }), r && !r.isDestroyed() && r.webContents.send("debug-window-opened"), console.log("[main] ✅ Debug window opened");
  } catch (s) {
    console.error("Error opening debug window:", s);
  }
});
b.on("close-debug-window", () => {
  g && !g.isDestroyed() && (console.log("[main] 🔍 Closing debug window (IPC request)"), g.close(), g = null, r && !r.isDestroyed() && r.webContents.send("debug-window-closed"));
});
b.on("open-visualization", (s, e = {}) => {
  var n, t, i;
  try {
    if (console.log("[main] 🎨 Opening visualization window with options:", e), l && !l.isDestroyed()) {
      console.log("[main] 🎨 Visualization window already exists, focusing it"), l.focus(), s.sender.send("visualization-opened");
      return;
    }
    let o = null, a = null;
    if (r && !r.isDestroyed())
      try {
        a = r.getBounds(), o = ce.getDisplayMatching(a).bounds, console.log(`[main] 🎨 Main window display: ${o.width}x${o.height} at ${o.x},${o.y}`), console.log(`[main] 🎨 Main window bounds: ${a.width}x${a.height} at ${a.x},${a.y}`);
      } catch (m) {
        console.warn("[main] ⚠️ Could not get main window display, using primary:", m), o = ce.getPrimaryDisplay().bounds, console.log(`[main] 🎨 Using primary display: ${o.width}x${o.height} at ${o.x},${o.y}`);
      }
    const d = {
      webPreferences: {
        preload: f.join(W, "preload.mjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        webSecurity: !0
      },
      show: !1
    };
    if (e.fullscreen !== !1)
      Object.assign(d, {
        fullscreen: !0,
        frame: !1,
        alwaysOnTop: !0,
        skipTaskbar: !0,
        resizable: !1
      }), o && (Object.assign(d, {
        x: o.x,
        y: o.y,
        width: o.width,
        height: o.height
      }), console.log(`[main] 🎨 Fullscreen on display: ${o.x},${o.y} ${o.width}x${o.height}`));
    else {
      let m = 1e3, p = 700;
      if (D) {
        const c = ((t = (n = D.frameConfig) == null ? void 0 : n.frameConfig) == null ? void 0 : t.canvas) || ((i = D.frameConfig) == null ? void 0 : i.canvas);
        c && c.width && c.height ? (m = c.width, p = c.height, console.log(`[main] 🎨 Using canvas dimensions: ${m}x${p}`)) : console.log(`[main] 🎨 No canvas dimensions found, using default: ${m}x${p}`);
      } else
        console.log(`[main] 🎨 No config available, using default dimensions: ${m}x${p}`);
      let $, k;
      o && ($ = o.x + Math.floor((o.width - m) / 2), k = o.y + Math.floor((o.height - p) / 2), console.log(`[main] 🎨 Positioning windowed visualization at ${$},${k} on display ${o.x},${o.y}`)), Object.assign(d, {
        width: m,
        height: p,
        x: $,
        y: k,
        frame: !0,
        alwaysOnTop: !1,
        skipTaskbar: !1,
        resizable: !0,
        title: `JunctionRelay Visualization (${m}×${p})`
      });
    }
    l = new J(d), e.fullscreen !== !1 && l.setAlwaysOnTop(!0, "screen-saver"), l.on("closed", () => {
      console.log("[main] 🎨 Visualization window closed"), l = null, r && !r.isDestroyed() && r.webContents.send("visualization-closed");
    }), l.once("ready-to-show", () => {
      console.log("[main] 🎨 Visualization window ready, showing"), l == null || l.show(), setTimeout(() => {
        D && l && !l.isDestroyed() && (console.log("[main] 🎨 Sending buffered config to visualization window"), l.webContents.send("rive-config", D));
      }, 500);
    }), l.webContents.on("before-input-event", (m, p) => {
      p.key === "Escape" && p.type === "keyDown" && (console.log("[main] 🎨 Escape key pressed, closing visualization"), l == null || l.close());
    }), h.isPackaged ? l.loadFile(f.join(x, "index.html"), {
      query: { mode: "visualization" }
    }) : O ? l.loadURL(O + "?mode=visualization") : l.loadFile(f.join(x, "index.html"), {
      query: { mode: "visualization" }
    }), s.sender.send("visualization-opened"), console.log("[main] ✅ Visualization window opened");
  } catch (o) {
    console.error("Error opening visualization kiosk:", o);
  }
});
b.on("close-visualization", (s) => {
  l && !l.isDestroyed() && (console.log("[main] 🎨 Closing visualization window (IPC request)"), l.close(), l = null, s.sender.send("visualization-closed"));
});
b.on("quit-app", () => {
  console.log("[main] 🚪 Quit app requested");
  try {
    B();
  } catch {
  }
  h.quit();
});
h.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    console.log("[main] 🚪 All windows closed, quitting app");
    try {
      B();
    } catch {
    }
    h.quit(), r = null;
  }
});
h.on("activate", () => {
  J.getAllWindows().length === 0 && (console.log("[main] 📱 App activated, creating window"), pe());
});
h.whenReady().then(() => {
  console.log("[main] 🚀 App ready, creating main window"), pe();
});
export {
  We as MAIN_DIST,
  x as RENDERER_DIST,
  O as VITE_DEV_SERVER_URL
};
