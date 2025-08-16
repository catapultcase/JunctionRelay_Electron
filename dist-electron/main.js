import { app as n, ipcMain as r, shell as w, BrowserWindow as c } from "electron";
import { fileURLToPath as f } from "node:url";
import i from "node:path";
const d = i.dirname(f(import.meta.url));
process.platform === "linux" && process.arch.startsWith("arm") && (n.disableHardwareAcceleration(), n.commandLine.appendSwitch("disable-gpu"), n.commandLine.appendSwitch("disable-gpu-compositing"), n.commandLine.appendSwitch("disable-gpu-rasterization"), n.commandLine.appendSwitch("disable-gpu-sandbox"));
process.env.APP_ROOT = i.join(d, "..");
const l = process.env.VITE_DEV_SERVER_URL, R = i.join(process.env.APP_ROOT, "dist-electron"), p = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = l ? i.join(process.env.APP_ROOT, "public") : p;
let o, e = null;
function u() {
  o = new c({
    icon: i.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: i.join(d, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), l && o.webContents.openDevTools(), o.webContents.on("did-finish-load", () => {
    console.log("Window finished loading"), o == null || o.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), l ? o.loadURL(l) : o.loadFile(i.join(p, "index.html"));
}
r.on("open-external", (a, s) => {
  console.log("Received open-external request for URL:", s);
  try {
    w.openExternal(s), console.log("Successfully opened external URL:", s);
  } catch (t) {
    console.error("Error opening external URL:", t);
  }
});
r.on("open-visualization", (a) => {
  console.log("Received open-visualization request");
  try {
    e = new c({
      fullscreen: !0,
      // ✅ fullscreen mode, hides taskbar
      frame: !1,
      alwaysOnTop: !0,
      resizable: !1,
      skipTaskbar: !0,
      // don’t show in taskbar
      webPreferences: {
        preload: i.join(d, "preload.mjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        webSecurity: !1
      },
      show: !1
      // Don't show until ready
    }), e.on("closed", () => {
      e = null, o && !o.isDestroyed() && o.webContents.send("visualization-closed");
    }), e.once("ready-to-show", () => {
      e && e.show();
    }), e.webContents.on("before-input-event", (s, t) => {
      t.key === "Escape" && t.type === "keyDown" && (console.log("Escape key pressed - closing visualization"), e && e.close());
    }), l ? e.loadURL(l + "?mode=visualization") : e.loadFile(i.join(p, "index.html"), {
      query: { mode: "visualization" }
    }), a.sender.send("visualization-opened"), console.log("Visualization kiosk window opened (Press ESC to close)");
  } catch (s) {
    console.error("Error opening visualization kiosk:", s);
  }
});
r.on("close-visualization", (a) => {
  console.log("Received close-visualization request"), e && !e.isDestroyed() && (e.close(), e = null, a.sender.send("visualization-closed"), console.log("Visualization kiosk window closed"));
});
r.on("quit-app", () => {
  console.log("Received quit-app request"), n.quit();
});
console.log("IPC handler registered for open-external");
n.on("window-all-closed", () => {
  process.platform !== "darwin" && (n.quit(), o = null);
});
n.on("activate", () => {
  c.getAllWindows().length === 0 && u();
});
n.whenReady().then(() => {
  console.log("App is ready, creating window"), u();
});
export {
  R as MAIN_DIST,
  p as RENDERER_DIST,
  l as VITE_DEV_SERVER_URL
};
