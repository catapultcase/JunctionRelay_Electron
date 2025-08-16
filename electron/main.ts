import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let kioskWindow: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
  })

  // Open DevTools in development
  if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools()
  }

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    console.log('Window finished loading')
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
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
      width: 400,
      height: 1280,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        contextIsolation: true,
        nodeIntegration: false
      },
    })

    // Handle when kiosk window is closed manually
    kioskWindow.on('closed', () => {
      kioskWindow = null
      // Notify main window that kiosk was closed
      if (win && !win.isDestroyed()) {
        win.webContents.send('visualization-closed')
      }
    })

    // Add keyboard shortcut to close visualization (Escape key)
    kioskWindow.webContents.on('before-input-event', (_, input) => {
      if (input.key === 'Escape' && input.type === 'keyDown') {
        console.log('Escape key pressed - closing visualization')
        if (kioskWindow) {
          kioskWindow.close()
        }
      }
    })

    // Load the visualization page with a query parameter
    if (VITE_DEV_SERVER_URL) {
      kioskWindow.loadURL(VITE_DEV_SERVER_URL + '?mode=visualization')
    } else {
      kioskWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), { 
        query: { mode: 'visualization' } 
      })
    }

    // Notify main window that kiosk was opened
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

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  console.log('App is ready, creating window')
  createWindow()
})