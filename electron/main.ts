import { app, BrowserWindow, ipcMain, shell, session } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

// IPC: open external URL
ipcMain.on('open-external', (_, url) => {
  try {
    shell.openExternal(url)
  } catch (error) {
    console.error('Error opening external URL:', error)
  }
})

// ✅ IPC: app version for renderer, read from package.json
ipcMain.handle('get-app-version', () => getAppVersion())

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
ipcMain.on('quit-app', () => app.quit())

// Quit behavior
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
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
