import { app as o, session as f, ipcMain as c, shell as m, BrowserWindow as p } from "electron";
import { fileURLToPath as w } from "node:url";
import n from "node:path";
import h from "node:fs";
const d = n.dirname(w(import.meta.url));
function v() {
  try {
    const s = process.env.APP_ROOT || n.join(d, ".."), r = n.join(s, "package.json"), a = JSON.parse(h.readFileSync(r, "utf8"));
    if (a != null && a.version && typeof a.version == "string") return a.version;
  } catch (s) {
    console.warn("[Electron] Failed to read package.json version, falling back:", s);
  }
  return o.getVersion();
}
const g = process.env.JR_GPU === "1";
process.platform === "linux" && process.arch.startsWith("arm") && !g && (o.disableHardwareAcceleration(), o.commandLine.appendSwitch("disable-gpu"), o.commandLine.appendSwitch("disable-gpu-compositing"), o.commandLine.appendSwitch("disable-gpu-rasterization"), o.commandLine.appendSwitch("disable-gpu-sandbox"), console.log("[Electron] GPU disabled (Canvas mode)"));
process.env.JR_CLEAR_CACHE === "1" && o.whenReady().then(async () => {
  try {
    const s = f.defaultSession;
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
process.env.APP_ROOT = n.join(d, "..");
const t = process.env.VITE_DEV_SERVER_URL, b = n.join(process.env.APP_ROOT, "dist-electron"), l = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = t ? n.join(process.env.APP_ROOT, "public") : l;
let i, e = null;
function u() {
  i = new p({
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: n.join(d, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !0
    }
  }), o.isPackaged ? i.loadFile(n.join(l, "index.html")) : t ? (i.webContents.openDevTools(), i.loadURL(t)) : i.loadFile(n.join(l, "index.html"));
}
c.on("open-external", (s, r) => {
  try {
    m.openExternal(r);
  } catch (a) {
    console.error("Error opening external URL:", a);
  }
});
c.handle("get-app-version", () => v());
c.on("open-visualization", (s) => {
  try {
    e = new p({
      fullscreen: !0,
      frame: !1,
      alwaysOnTop: !0,
      skipTaskbar: !0,
      resizable: !1,
      webPreferences: {
        preload: n.join(d, "preload.mjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        webSecurity: !0
      },
      show: !1
    }), e.setAlwaysOnTop(!0, "screen-saver"), e.on("closed", () => {
      e = null, i && !i.isDestroyed() && i.webContents.send("visualization-closed");
    }), e.once("ready-to-show", () => e == null ? void 0 : e.show()), e.webContents.on("before-input-event", (r, a) => {
      a.key === "Escape" && a.type === "keyDown" && (e == null || e.close());
    }), o.isPackaged ? e.loadFile(n.join(l, "index.html"), {
      query: { mode: "visualization" }
    }) : t ? e.loadURL(t + "?mode=visualization") : e.loadFile(n.join(l, "index.html"), {
      query: { mode: "visualization" }
    }), s.sender.send("visualization-opened");
  } catch (r) {
    console.error("Error opening visualization kiosk:", r);
  }
});
c.on("close-visualization", (s) => {
  e && !e.isDestroyed() && (e.close(), e = null, s.sender.send("visualization-closed"));
});
c.on("quit-app", () => o.quit());
o.on("window-all-closed", () => {
  process.platform !== "darwin" && (o.quit(), i = null);
});
o.on("activate", () => {
  p.getAllWindows().length === 0 && u();
});
o.whenReady().then(() => {
  u();
});
export {
  b as MAIN_DIST,
  l as RENDERER_DIST,
  t as VITE_DEV_SERVER_URL
};
