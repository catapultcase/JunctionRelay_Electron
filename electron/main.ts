import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Raspberry Pi (Linux/ARM): force software rendering (Canvas-friendly)
// - disableHardwareAcceleration(): turns off GPU acceleration globally
// - disable-gpu* switches: prevent Chromium from trying EGL/GBM
// IMPORTANT: do NOT use 'disable-software-rasterizer' — we want SwiftShader.
if (process.platform === 'linux' && process.arch.startsWith('arm')) {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('disable-gpu-rasterization')
  app.commandLine.appendSwitch('disable-gpu-sandbox')
  // app.commandLine.appendSwitch('disable-software-rasterizer') // ❌ do NOT enable
}

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
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
    },
  })

  // Open DevTools in development
  if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools()
  }

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    console.log('Window finished loading')
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// IPC handler for opening external URLs
ipcMain.on('open-external', (_, url) => {
  console.log('Received open-external request for URL:', url)
  try {
    shell.openExternal(url)
    console.log('Successfully opened external URL:', url)
  } catch (error) {
    console.error('Error opening external URL:', error)
  }
})

// IPC handler for opening visualization kiosk
ipcMain.on('open-visualization', (event) => {
  console.log('Received open-visualization request')
  try {
    kioskWindow = new BrowserWindow({
      fullscreen: true,          // ✅ fullscreen mode, hides taskbar
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,         // don’t show in taskbar
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false,
      },
      show: false // Don't show until ready
    })

    kioskWindow.on('closed', () => {
      kioskWindow = null
      if (win && !win.isDestroyed()) {
        win.webContents.send('visualization-closed')
      }
    })

    kioskWindow.once('ready-to-show', () => {
      if (kioskWindow) {
        kioskWindow.show()
      }
    })

    kioskWindow.webContents.on('before-input-event', (_, input) => {
      if (input.key === 'Escape' && input.type === 'keyDown') {
        console.log('Escape key pressed - closing visualization')
        if (kioskWindow) {
          kioskWindow.close()
        }
      }
    })

    if (VITE_DEV_SERVER_URL) {
      kioskWindow.loadURL(VITE_DEV_SERVER_URL + '?mode=visualization')
    } else {
      kioskWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
        query: { mode: 'visualization' },
      })
    }

    event.sender.send('visualization-opened')
    console.log('Visualization kiosk window opened (Press ESC to close)')
  } catch (error) {
    console.error('Error opening visualization kiosk:', error)
  }
})

// IPC handler for closing visualization kiosk
ipcMain.on('close-visualization', (event) => {
  console.log('Received close-visualization request')
  if (kioskWindow && !kioskWindow.isDestroyed()) {
    kioskWindow.close()
    kioskWindow = null
    event.sender.send('visualization-closed')
    console.log('Visualization kiosk window closed')
  }
})

// IPC handler for quitting the app
ipcMain.on('quit-app', () => {
  console.log('Received quit-app request')
  app.quit()
})

console.log('IPC handler registered for open-external')

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  console.log('App is ready, creating window')
  createWindow()
})
