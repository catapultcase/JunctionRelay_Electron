import { app, BrowserWindow, ipcMain, shell, session, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { Helper_WebSocket } from "../src/main/Helper_WebSocket";

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// WebSocket server instance
let jrWs: Helper_WebSocket | null = null;
let mdnsService: any = null;

// Preferences file path
const getPreferencesPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'jr-preferences.json');
};

// Default preferences
const defaultPreferences = {
  fullscreenMode: true
};

// Load preferences from file
const loadPreferences = () => {
  try {
    const prefsPath = getPreferencesPath();
    if (fs.existsSync(prefsPath)) {
      const data = fs.readFileSync(prefsPath, 'utf8');
      const parsed = JSON.parse(data);
      console.log('[main] ✅ Loaded preferences from disk:', parsed);
      return { ...defaultPreferences, ...parsed };
    } else {
      console.log('[main] 📄 No preferences file found, using defaults');
      return defaultPreferences;
    }
  } catch (error) {
    console.warn('[main] ⚠️ Error loading preferences, using defaults:', error);
    return defaultPreferences;
  }
};

// Save preferences to file
const savePreferences = (preferences: any) => {
  try {
    const prefsPath = getPreferencesPath();
    const userDataPath = path.dirname(prefsPath);
    
    // Ensure user data directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    fs.writeFileSync(prefsPath, JSON.stringify(preferences, null, 2), 'utf8');
    console.log('[main] ✅ Saved preferences to disk:', preferences);
    return true;
  } catch (error) {
    console.error('[main] ❌ Error saving preferences:', error);
    return false;
  }
};

// Load preferences on startup
let userPreferences = loadPreferences();

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
let debugWindow: BrowserWindow | null = null

// Buffer for the last config to send to new windows
let lastRiveConfig: any = null

// Helper to safely send to window when ready
function safelySendToWindow(window: BrowserWindow | null, channel: string, data: any) {
  if (window && !window.isDestroyed()) {
    try {
      window.webContents.send(channel, data);
      return true;
    } catch (error) {
      console.error(`[main] Error sending ${channel} to window:`, error);
      return false;
    }
  }
  return false;
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'jr_platinum.svg'),
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

// Enhanced sensor and config data processing with better Rive support
function processIncomingData(doc: Record<string, any>) {
  console.log("[main] Processing document type:", doc.type);

  // Handle enhanced Rive configuration payloads
  if (doc.type === "rive_config") {
    console.log("[main] 📋 Received enhanced Rive configuration for screenId:", doc.screenId);
    
    // Store the latest config for new windows
    lastRiveConfig = doc;
    
    // Log enhanced config details
    const riveConfig = doc.frameConfig?.frameConfig?.rive || doc.frameConfig?.rive;
    if (riveConfig) {
      console.log("[main] 📋 Config details:", {
        canvasSize: doc.frameConfig?.canvas ? `${doc.frameConfig.canvas.width}x${doc.frameConfig.canvas.height}` : 'unknown',
        riveFile: riveConfig.file || 'none',
        riveFileUrl: riveConfig.fileUrl || 'none',
        riveEmbedded: riveConfig.embedded || false,
        elementCount: doc.frameElements?.length || 0,
        hasDiscovery: !!riveConfig.discovery,
        stateMachines: riveConfig.discovery?.machines?.length || 0,
        totalInputs: riveConfig.discovery?.metadata?.totalInputs || 0
      });
      
      // Log state machine discovery details
      if (riveConfig.discovery?.machines) {
        console.log("[main] 🎮 State machine discovery:");
        riveConfig.discovery.machines.forEach((machine: any) => {
          console.log(`[main]   🎯 ${machine.name}: ${machine.inputs.length} inputs`);
          machine.inputs.forEach((input: any) => {
            console.log(`[main]     📊 ${input.name} (${input.type}): ${input.currentValue}`);
          });
        });
      }
      
      // Log frame elements with Rive connections
      const elements = doc.frameConfig?.frameElements || doc.frameElements || [];
      const elementsWithConnections = elements.filter((el: any) => el.riveConnections?.availableInputs?.length > 0);
      console.log(`[main] 🔍 Frame elements: ${elements.length} total, ${elementsWithConnections.length} with Rive connections`);
      
      elementsWithConnections.forEach((element: any) => {
        console.log(`[main]   🔗 ${element.properties.sensorTag || element.id}: ${element.riveConnections.availableInputs.length} Rive connections`);
        element.riveConnections.availableInputs.forEach((conn: any) => {
          console.log(`[main]     ⚡ ${conn.fullKey} (${conn.inputType})`);
        });
      });
    }
    
    // Forward config to all windows
    safelySendToWindow(kioskWindow, "rive-config", doc);
    safelySendToWindow(debugWindow, "rive-config", doc);
    safelySendToWindow(win, "rive-config", doc);
    
    console.log("[main] ✅ Enhanced Rive config forwarded to all windows");
    return;
  }

  // Handle enhanced Rive sensor data payloads with comma-separated tags
  if (doc.type === "rive_sensor") {
    console.log("[main] 📊 Received enhanced Rive sensor data for screenId:", doc.screenId);
    
    // Process comma-separated sensor tags
    const sensorKeys = Object.keys(doc.sensors || {});
    const expandedSensorCount = sensorKeys.reduce((count, key) => {
      return count + key.split(',').length;
    }, 0);
    
    console.log("[main] 📊 Sensor payload analysis:");
    console.log(`[main]   📦 ${sensorKeys.length} sensor keys expanding to ${expandedSensorCount} individual tags`);
    
    // Log each sensor key and its expansion
    sensorKeys.forEach(sensorKey => {
      const sensorData = doc.sensors[sensorKey];
      const tags = sensorKey.split(',').map((tag: string) => tag.trim());
      
      if (tags.length > 1) {
        console.log(`[main]   🔀 Multi-tag "${sensorKey}" → [${tags.join(', ')}]`);
        console.log(`[main]     📊 Value: ${sensorData.value} ${sensorData.unit}`);
      } else {
        console.log(`[main]   📊 ${sensorKey}: ${sensorData.value} ${sensorData.unit}`);
      }
    });
    
    // Forward sensor data to all windows
    safelySendToWindow(kioskWindow, "rive-sensor-data", doc);
    safelySendToWindow(debugWindow, "rive-sensor-data", doc);
    safelySendToWindow(win, "rive-sensor-data", doc);
    
    console.log("[main] ✅ Enhanced Rive sensor data forwarded to all windows");
    return;
  }

  // Legacy sensor processing for backward compatibility
  if (doc.type === "sensor" && doc.sensors) {
    console.log("[main] 📄 Processing legacy sensor format");
    try {
      // Get the first sensor in the payload
      const firstSensorKey = Object.keys(doc.sensors)[0];
      if (firstSensorKey && doc.sensors[firstSensorKey] && doc.sensors[firstSensorKey][0]) {
        const sensorValue = parseInt(doc.sensors[firstSensorKey][0].Value, 10);
        const sensorUnit = doc.sensors[firstSensorKey][0].Unit || "";
        
        console.log(`[main] 📄 Legacy sensor: ${firstSensorKey} = ${sensorValue} ${sensorUnit}`);
        
        // Forward to visualization window (legacy format)
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

  // Handle other message types
  if (doc.type === "heartbeat-response" || doc.type === "device-connected") {
    console.log(`[main] 💛 Received ${doc.type}`);
    return;
  }

  // Log unknown message types for debugging
  console.log(`[main] ❓ Unknown message type: ${doc.type}`);
  if (doc.type) {
    console.log(`[main] 📋 Message keys: ${Object.keys(doc).join(', ')}`);
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
        // Send to main window for debugging
        win?.webContents.send("display:json", doc);
        
        // Process both legacy and enhanced data formats
        processIncomingData(doc);
      },
      onProtocol: (doc: Record<string, any>) => {
        console.log("[main] 🔌 Protocol message:", doc.type);
        win?.webContents.send("display:protocol", doc);
      },
      onSystem: (doc: Record<string, any>) => {
        console.log("[main] ⚙️ System message:", doc.type);
        win?.webContents.send("display:system", doc);
      },
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

// IPC: fullscreen preference storage (now with file persistence)
ipcMain.handle('get-fullscreen-preference', () => {
  console.log(`[main] 📖 Retrieved fullscreen preference: ${userPreferences.fullscreenMode}`);
  return userPreferences.fullscreenMode;
});

ipcMain.on('save-fullscreen-preference', (_, preference: boolean) => {
  userPreferences.fullscreenMode = preference;
  const saved = savePreferences(userPreferences);
  console.log(`[main] ${saved ? '✅' : '❌'} Saved fullscreen preference: ${preference}`);
});

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

// Debug Window IPC handlers
ipcMain.on("open-debug-window", () => {
  try {
    console.log("[main] 🔍 Opening debug window");
    
    // If debug window already exists, focus it
    if (debugWindow && !debugWindow.isDestroyed()) {
      debugWindow.focus();
      return;
    }

    debugWindow = new BrowserWindow({
      width: 800,
      height: 600,
      title: "JunctionRelay Debug Panel",
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true
      },
      show: false
    });

    debugWindow.on("closed", () => {
      console.log("[main] 🔍 Debug window closed");
      debugWindow = null;
      if (win && !win.isDestroyed()) win.webContents.send("debug-window-closed");
    });

    debugWindow.once("ready-to-show", () => {
      console.log("[main] 🔍 Debug window ready, showing");
      debugWindow?.show();
      
      // Send any existing config data to the new debug window
      setTimeout(() => {
        if (lastRiveConfig && debugWindow && !debugWindow.isDestroyed()) {
          console.log("[main] 🔍 Sending buffered config to debug window");
          debugWindow.webContents.send("rive-config", lastRiveConfig);
        }
      }, 500); // Give window time to fully load
    });

    // Load with debug=true parameter
    if (app.isPackaged) {
      debugWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
        query: { debug: "true" }
      });
    } else if (VITE_DEV_SERVER_URL) {
      debugWindow.loadURL(VITE_DEV_SERVER_URL + "?debug=true");
    } else {
      debugWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
        query: { debug: "true" }
      });
    }

    if (win && !win.isDestroyed()) win.webContents.send("debug-window-opened");
    console.log("[main] ✅ Debug window opened");
  } catch (error) {
    console.error("Error opening debug window:", error);
  }
});

ipcMain.on("close-debug-window", () => {
  if (debugWindow && !debugWindow.isDestroyed()) {
    console.log("[main] 🔍 Closing debug window (IPC request)");
    debugWindow.close();
    debugWindow = null;
    if (win && !win.isDestroyed()) win.webContents.send("debug-window-closed");
  }
});

// IPC: open kiosk visualization
ipcMain.on('open-visualization', (event, options = {}) => {
  try {
    console.log("[main] 🎨 Opening visualization window with options:", options);
    
    // If visualization window already exists, focus it instead of creating new one
    if (kioskWindow && !kioskWindow.isDestroyed()) {
      console.log("[main] 🎨 Visualization window already exists, focusing it");
      kioskWindow.focus();
      event.sender.send('visualization-opened');
      return;
    }
    
    // Get the main window's display to ensure ViewPort opens on the same screen
    let displayBounds = null;
    let mainWindowBounds = null;
    
    if (win && !win.isDestroyed()) {
      try {
        mainWindowBounds = win.getBounds();
        const mainWindowDisplay = screen.getDisplayMatching(mainWindowBounds);
        displayBounds = mainWindowDisplay.bounds;
        console.log(`[main] 🎨 Main window display: ${displayBounds.width}x${displayBounds.height} at ${displayBounds.x},${displayBounds.y}`);
        console.log(`[main] 🎨 Main window bounds: ${mainWindowBounds.width}x${mainWindowBounds.height} at ${mainWindowBounds.x},${mainWindowBounds.y}`);
      } catch (error) {
        console.warn("[main] ⚠️ Could not get main window display, using primary:", error);
        // Fallback to primary display
        const primaryDisplay = screen.getPrimaryDisplay();
        displayBounds = primaryDisplay.bounds;
        console.log(`[main] 🎨 Using primary display: ${displayBounds.width}x${displayBounds.height} at ${displayBounds.x},${displayBounds.y}`);
      }
    }
    
    const windowOptions: any = {
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
      show: false,
    };

    // Apply fullscreen or windowed mode based on options
    if (options.fullscreen !== false) {
      // Fullscreen kiosk mode
      Object.assign(windowOptions, {
        fullscreen: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
      });
      
      // Position on the same display as main window
      if (displayBounds) {
        Object.assign(windowOptions, {
          x: displayBounds.x,
          y: displayBounds.y,
          width: displayBounds.width,
          height: displayBounds.height,
        });
        console.log(`[main] 🎨 Fullscreen on display: ${displayBounds.x},${displayBounds.y} ${displayBounds.width}x${displayBounds.height}`);
      }
    } else {
      // Windowed mode - use canvas dimensions if available
      let windowWidth = 1000;
      let windowHeight = 700;
      
      if (lastRiveConfig) {
        const canvas = lastRiveConfig.frameConfig?.frameConfig?.canvas || lastRiveConfig.frameConfig?.canvas;
        if (canvas && canvas.width && canvas.height) {
          windowWidth = canvas.width;
          windowHeight = canvas.height;
          console.log(`[main] 🎨 Using canvas dimensions: ${windowWidth}x${windowHeight}`);
        } else {
          console.log(`[main] 🎨 No canvas dimensions found, using default: ${windowWidth}x${windowHeight}`);
        }
      } else {
        console.log(`[main] 🎨 No config available, using default dimensions: ${windowWidth}x${windowHeight}`);
      }
      
      // Position windowed mode on the same display, centered
      let windowX = undefined;
      let windowY = undefined;
      
      if (displayBounds) {
        windowX = displayBounds.x + Math.floor((displayBounds.width - windowWidth) / 2);
        windowY = displayBounds.y + Math.floor((displayBounds.height - windowHeight) / 2);
        console.log(`[main] 🎨 Positioning windowed visualization at ${windowX},${windowY} on display ${displayBounds.x},${displayBounds.y}`);
      }
      
      Object.assign(windowOptions, {
        width: windowWidth,
        height: windowHeight,
        x: windowX,
        y: windowY,
        frame: true,
        alwaysOnTop: false,
        skipTaskbar: false,
        resizable: true,
        title: `JunctionRelay Visualization (${windowWidth}×${windowHeight})`,
      });
    }

    kioskWindow = new BrowserWindow(windowOptions);

    if (options.fullscreen !== false) {
      kioskWindow.setAlwaysOnTop(true, 'screen-saver');
    }

    kioskWindow.on('closed', () => {
      console.log("[main] 🎨 Visualization window closed");
      kioskWindow = null
      if (win && !win.isDestroyed()) win.webContents.send('visualization-closed')
    })

    kioskWindow.once('ready-to-show', () => {
      console.log("[main] 🎨 Visualization window ready, showing");
      kioskWindow?.show()
      
      // Send any existing config data to the new visualization window
      setTimeout(() => {
        if (lastRiveConfig && kioskWindow && !kioskWindow.isDestroyed()) {
          console.log("[main] 🎨 Sending buffered config to visualization window");
          kioskWindow.webContents.send("rive-config", lastRiveConfig);
        }
      }, 500); // Give window time to fully load
    })

    kioskWindow.webContents.on('before-input-event', (_, input) => {
      if (input.key === 'Escape' && input.type === 'keyDown') {
        console.log("[main] 🎨 Escape key pressed, closing visualization");
        kioskWindow?.close()
      }
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
    console.log("[main] ✅ Visualization window opened");
  } catch (error) {
    console.error('Error opening visualization kiosk:', error)
  }
})

// IPC: close kiosk
ipcMain.on('close-visualization', (event) => {
  if (kioskWindow && !kioskWindow.isDestroyed()) {
    console.log("[main] 🎨 Closing visualization window (IPC request)");
    kioskWindow.close()
    kioskWindow = null
    event.sender.send('visualization-closed')
  }
})

// IPC: quit app
ipcMain.on('quit-app', () => {
  console.log("[main] 🚪 Quit app requested");
  try { stopWebSocketServer(); } catch {}
  app.quit()
})

// Quit behavior
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    console.log("[main] 🚪 All windows closed, quitting app");
    try { stopWebSocketServer(); } catch {}
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log("[main] 📱 App activated, creating window");
    createWindow()
  }
})

app.whenReady().then(() => {
  console.log("[main] 🚀 App ready, creating main window");
  createWindow()
})