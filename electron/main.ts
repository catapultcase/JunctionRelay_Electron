import { app, BrowserWindow, ipcMain, shell, session } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { Helper_WebSocket } from "../src/main/Helper_WebSocket";

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// WebSocket server instance
let jrWs: Helper_WebSocket | null = null;
let mdnsService: any = null;

// ---------- Version helper: read from package.json (fallback to app.getVersion) ----------
function getAppVersion(): string {
  try {
    const appRoot = process.env.APP_ROOT || path.join(__dirname, '..')
    const pkgPath = path.join(appRoot, 'package.json')
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    if (pkgJson?.version && typeof pkgJson.version === 'string') return pkgJson.version
  } catch (e) {
    console.warn('[Electron] Failed to read package.json version, falling back:', e)
  }
  return app.getVersion()
}

// Raspberry Pi (Linux/ARM): force software rendering (Canvas-friendly)
// Allow opt-in GPU with env JR_GPU=1
const wantGPU = process.env.JR_GPU === '1'
if (process.platform === 'linux' && process.arch.startsWith('arm') && !wantGPU) {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('disable-gpu-rasterization')
  app.commandLine.appendSwitch('disable-gpu-sandbox')
  console.log('[Electron] GPU disabled (Canvas mode)')
}

// One-time cache clear (enable with JR_CLEAR_CACHE=1)
if (process.env.JR_CLEAR_CACHE === '1') {
  app.whenReady().then(async () => {
    try {
      const s = session.defaultSession
      await s.clearCache()
      await s.clearStorageData({
        storages: [
          'serviceworkers',
          'cachestorage',
          'localstorage',
          'indexdb',
          'websql',
          'filesystem',
          'cookies',
          'shadercache',
        ],
      })
      console.log('[Electron] Cache cleared on startup')
    } catch (e) {
      console.warn('[Electron] Cache clear failed:', e)
    }
  })
}

// Paths
process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null
let kioskWindow: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  if (app.isPackaged) {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  } else if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools()
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Process sensor data from WebSocket messages
function processSensorData(doc: Record<string, any>) {
  if (doc.type === "sensor" && doc.sensors) {
    try {
      // Get the first sensor in the payload
      const firstSensorKey = Object.keys(doc.sensors)[0];
      if (firstSensorKey && doc.sensors[firstSensorKey] && doc.sensors[firstSensorKey][0]) {
        const sensorValue = parseInt(doc.sensors[firstSensorKey][0].Value, 10);
        const sensorUnit = doc.sensors[firstSensorKey][0].Unit || "";
        
        // Forward to visualization window
        if (kioskWindow && !kioskWindow.isDestroyed()) {
          kioskWindow.webContents.send("sensor-data", {
            value: sensorValue,
            unit: sensorUnit,
            sensorName: firstSensorKey
          });
        }
      }
    } catch (error) {
      console.error("[main] Error processing sensor data:", error);
    }
  }
}

// WebSocket server functions
async function startWebSocketServer() {
  console.log("[main] startWebSocketServer() called");
  if (jrWs?.isRunning()) {
    console.log("[main] Helper_WS already running on :81");
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket already running." });
    return;
  }

  try {
    console.log("[main] Creating Helper_WebSocket on :81");
    jrWs = new Helper_WebSocket({
      port: 81,
      onDocument: (doc: Record<string, any>) => {
        win?.webContents.send("display:json", doc);
        processSensorData(doc); // Process sensor data for visualization
      },
      onProtocol: (doc: Record<string, any>) => win?.webContents.send("display:protocol", doc),
      onSystem:   (doc: Record<string, any>) => win?.webContents.send("display:system", doc),
    });

    await jrWs.start();
    console.log("[main] ✅ Helper_WebSocket started on :81");
    
    // Start mDNS service discovery
    await startMDNSService();
    
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket server started on :81" });
  } catch (helperErr) {
    console.error("[main] Helper_WebSocket failed:", helperErr);
    win?.webContents.send("ws-status", { ok: false, message: `Failed to start WebSocket: ${String(helperErr)}` });
  }
}

async function startMDNSService() {
  try {
    // Import bonjour-service directly since it's installed
    const { Bonjour } = await import('bonjour-service');
    const instance = new Bonjour();
    
    const mac = Helper_WebSocket.getFormattedMacAddress();
    const deviceName = `JunctionRelay_Virtual_${mac}`;
    
    // Try the exact format that Tmds.MDns expects
    const httpService = instance.publish({
      name: deviceName,
      type: 'junctionrelay',  // Try without underscores first
      protocol: 'tcp',        // Separate protocol field
      port: 80,
      txt: {
        type: 'virtual_device',
        firmware: getAppVersion(),
        platform: 'electron',
        mac: mac
      }
    });
    
    // Also try advertising WebSocket service
    const wsService = instance.publish({
      name: `${deviceName}_WS`,
      type: 'junctionrelay-ws',
      protocol: 'tcp',
      port: 81,
      txt: {
        type: 'virtual_device_ws',
        firmware: getAppVersion(),
        platform: 'electron',
        mac: mac
      }
    });
    
    mdnsService = { instance, httpService, wsService };
    console.log(`[main] ✅ mDNS services started - device discoverable as ${deviceName}`);
    console.log(`[main] Advertising: junctionrelay.tcp (port 80) and junctionrelay-ws.tcp (port 81)`);
    
  } catch (error) {
    console.log("[main] mDNS service failed to start:", (error as Error).message);
    console.log("[main] Device running without network discovery");
  }
}

function stopWebSocketServer() {
  console.log("[main] stopWebSocketServer() called");
  
  // Stop mDNS services
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
    try { jrWs.stop(); } catch (e) { console.error("[main] jrWs.stop error:", e); }
    jrWs = null;
    console.log("[main] Helper_WS stopped");
    win?.webContents.send("ws-status", { ok: true, message: "WebSocket server stopped." });
    return;
  }
  win?.webContents.send("ws-status", { ok: true, message: "WebSocket not running." });
}

// IPC: open external URL
ipcMain.on('open-external', (_, url) => {
  try {
    shell.openExternal(url)
  } catch (error) {
    console.error('Error opening external URL:', error)
  }
})

// IPC: app version for renderer, read from package.json
ipcMain.handle('get-app-version', () => getAppVersion())

// WebSocket IPC handlers
ipcMain.on("start-ws", () => {
  startWebSocketServer();
});

ipcMain.on("stop-ws", () => {
  stopWebSocketServer();
});

ipcMain.handle("ws-stats", () => {
  try { return jrWs?.getStats?.() ?? null; } catch { return null; }
});

// IPC: open kiosk visualization
ipcMain.on('open-visualization', (event) => {
  try {
    kioskWindow = new BrowserWindow({
      fullscreen: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
      show: false,
    })

    kioskWindow.setAlwaysOnTop(true, 'screen-saver')

    kioskWindow.on('closed', () => {
      kioskWindow = null
      if (win && !win.isDestroyed()) win.webContents.send('visualization-closed')
    })

    kioskWindow.once('ready-to-show', () => kioskWindow?.show())

    kioskWindow.webContents.on('before-input-event', (_, input) => {
      if (input.key === 'Escape' && input.type === 'keyDown') kioskWindow?.close()
    })

    if (app.isPackaged) {
      kioskWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
        query: { mode: 'visualization' },
      })
    } else if (VITE_DEV_SERVER_URL) {
      kioskWindow.loadURL(VITE_DEV_SERVER_URL + '?mode=visualization')
    } else {
      kioskWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
        query: { mode: 'visualization' },
      })
    }

    event.sender.send('visualization-opened')
  } catch (error) {
    console.error('Error opening visualization kiosk:', error)
  }
})

// IPC: close kiosk
ipcMain.on('close-visualization', (event) => {
  if (kioskWindow && !kioskWindow.isDestroyed()) {
    kioskWindow.close()
    kioskWindow = null
    event.sender.send('visualization-closed')
  }
})

// IPC: quit app
ipcMain.on('quit-app', () => {
  try { stopWebSocketServer(); } catch {}
  app.quit()
})

// Quit behavior
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    try { stopWebSocketServer(); } catch {}
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(() => {
  createWindow()
})