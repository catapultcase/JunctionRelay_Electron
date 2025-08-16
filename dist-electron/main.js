import { ipcMain, shell, BrowserWindow, app } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools();
  }
  win.webContents.on("did-finish-load", () => {
    console.log("Window finished loading");
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
ipcMain.on("open-external", (event, url) => {
  console.log("Received open-external request for URL:", url);
  try {
    shell.openExternal(url);
    console.log("Successfully opened external URL:", url);
  } catch (error) {
    console.error("Error opening external URL:", error);
  }
});
let kioskWindow = null;
ipcMain.on("open-visualization", (event) => {
  console.log("Received open-visualization request");
  try {
    kioskWindow = new BrowserWindow({
      width: 400,
      height: 1280,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.mjs"),
        contextIsolation: true,
        enableRemoteModule: false,
        nodeIntegration: false
      }
    });
    kioskWindow.on("closed", () => {
      kioskWindow = null;
      if (win && !win.isDestroyed()) {
        win.webContents.send("visualization-closed");
      }
    });
    kioskWindow.webContents.on("before-input-event", (event2, input) => {
      if (input.key === "Escape" && input.type === "keyDown") {
        console.log("Escape key pressed - closing visualization");
        kioskWindow.close();
      }
    });
    if (VITE_DEV_SERVER_URL) {
      kioskWindow.loadURL(VITE_DEV_SERVER_URL + "?mode=visualization");
    } else {
      kioskWindow.loadFile(path.join(RENDERER_DIST, "index.html"), {
        query: { mode: "visualization" }
      });
    }
    event.sender.send("visualization-opened");
    console.log("Visualization kiosk window opened (Press ESC to close)");
  } catch (error) {
    console.error("Error opening visualization kiosk:", error);
  }
});
ipcMain.on("close-visualization", (event) => {
  console.log("Received close-visualization request");
  if (kioskWindow && !kioskWindow.isDestroyed()) {
    kioskWindow.close();
    kioskWindow = null;
    event.sender.send("visualization-closed");
    console.log("Visualization kiosk window closed");
  }
});
ipcMain.on("quit-app", (event) => {
  console.log("Received quit-app request");
  app.quit();
});
console.log("IPC handler registered for open-external");
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  console.log("App is ready, creating window");
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
