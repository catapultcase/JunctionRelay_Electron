import { ipcMain as a, shell as f, BrowserWindow as c, app as l } from "electron";
import { fileURLToPath as w } from "node:url";
import n from "node:path";
const d = n.dirname(w(import.meta.url));
process.env.APP_ROOT = n.join(d, "..");
const s = process.env.VITE_DEV_SERVER_URL, m = n.join(process.env.APP_ROOT, "dist-electron"), p = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = s ? n.join(process.env.APP_ROOT, "public") : p;
let e, o = null;
function u() {
  e = new c({
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: n.join(d, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), s && e.webContents.openDevTools(), e.webContents.on("did-finish-load", () => {
    console.log("Window finished loading"), e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), s ? e.loadURL(s) : e.loadFile(n.join(p, "index.html"));
}
a.on("open-external", (t, i) => {
  console.log("Received open-external request for URL:", i);
  try {
    f.openExternal(i), console.log("Successfully opened external URL:", i);
  } catch (r) {
    console.error("Error opening external URL:", r);
  }
});
a.on("open-visualization", (t) => {
  console.log("Received open-visualization request");
  try {
    o = new c({
      width: 400,
      height: 1280,
      frame: !1,
      alwaysOnTop: !0,
      resizable: !1,
      webPreferences: {
        preload: n.join(d, "preload.mjs"),
        contextIsolation: !0,
        nodeIntegration: !1
      }
    }), o.on("closed", () => {
      o = null, e && !e.isDestroyed() && e.webContents.send("visualization-closed");
    }), o.webContents.on("before-input-event", (i, r) => {
      r.key === "Escape" && r.type === "keyDown" && (console.log("Escape key pressed - closing visualization"), o && o.close());
    }), s ? o.loadURL(s + "?mode=visualization") : o.loadFile(n.join(p, "index.html"), {
      query: { mode: "visualization" }
    }), t.sender.send("visualization-opened"), console.log("Visualization kiosk window opened (Press ESC to close)");
  } catch (i) {
    console.error("Error opening visualization kiosk:", i);
  }
});
a.on("close-visualization", (t) => {
  console.log("Received close-visualization request"), o && !o.isDestroyed() && (o.close(), o = null, t.sender.send("visualization-closed"), console.log("Visualization kiosk window closed"));
});
a.on("quit-app", () => {
  console.log("Received quit-app request"), l.quit();
});
console.log("IPC handler registered for open-external");
l.on("window-all-closed", () => {
  process.platform !== "darwin" && (l.quit(), e = null);
});
l.on("activate", () => {
  c.getAllWindows().length === 0 && u();
});
l.whenReady().then(() => {
  console.log("App is ready, creating window"), u();
});
export {
  m as MAIN_DIST,
  p as RENDERER_DIST,
  s as VITE_DEV_SERVER_URL
};
