# JunctionRelay Electron

Electron app for running the JunctionRelay virtual device and visualization.

## Build & Run

### Development
```powershell
npm run dev
```

### Build
```powershell
npm run build
```

### Run Built App (Windows)
After build, the unpacked executable is here:
```
dist\win-unpacked\JunctionRelay.exe
```

Example:
```powershell
& "C:\Dev\JunctionRelay_Electron\dist\win-unpacked\JunctionRelay.exe"
```

### Run Built App (Raspberry Pi / Linux)
After build, the unpacked executable is here:
```
dist/linux-arm64-unpacked/junctionrelay-electron
```

Example:
```bash
./dist/linux-arm64-unpacked/junctionrelay-electron
```

---

## Runtime Flags

You can pass Chromium/Electron flags to the executable for debugging or performance tuning.

### Windows Examples
```powershell
& "C:\Dev\JunctionRelay_Electron\dist\win-unpacked\JunctionRelay.exe" --disable-gpu
& "C:\Dev\JunctionRelay_Electron\dist\win-unpacked\JunctionRelay.exe" --disable-software-rasterizer
& "C:\Dev\JunctionRelay_Electron\dist\win-unpacked\JunctionRelay.exe" --disable-http-cache
& "C:\Dev\JunctionRelay_Electron\dist\win-unpacked\JunctionRelay.exe" --ignore-gpu-blocklist
& "C:\Dev\JunctionRelay_Electron\dist\win-unpacked\JunctionRelay.exe" --enable-logging --v=1
```

### Raspberry Pi / Linux Examples
```bash
./dist/linux-arm64-unpacked/junctionrelay-electron --disable-gpu
./dist/linux-arm64-unpacked/junctionrelay-electron --disable-software-rasterizer
./dist/linux-arm64-unpacked/junctionrelay-electron --disable-http-cache
./dist/linux-arm64-unpacked/junctionrelay-electron --ignore-gpu-blocklist
./dist/linux-arm64-unpacked/junctionrelay-electron --enable-logging --v=1
```

### Common Flags
- `--disable-gpu` → Run in software rendering mode  
- `--disable-software-rasterizer` → Prevent software fallback  
- `--disable-http-cache` → Skip writing to cache for this run  
- `--ignore-gpu-blocklist` → Force-enable GPU features  
- `--enable-logging --v=1` → Verbose Chromium logs  

---

## Clearing Cache

There are **two ways** to clear the cache:

### 1. Disable cache at launch
Windows:
```powershell
& "C:\Dev\JunctionRelay_Electron\dist\win-unpacked\JunctionRelay.exe" --disable-http-cache
```
Raspberry Pi / Linux:
```bash
./dist/linux-arm64-unpacked/junctionrelay-electron --disable-http-cache
```

### 2. Clear cache from inside the app
We expose a `"clear-cache"` IPC event to clear cookies, local storage, and cache at runtime.

Example in `main.ts`:
```ts
ipcMain.on("clear-cache", async () => {
  const s = session.defaultSession
  await s.clearCache()
  await s.clearStorageData()
  console.log("Cache cleared")
})
```

Example in `App.tsx`:
```tsx
const clearCache = () => {
  window.ipcRenderer.send("clear-cache")
}
```

Add a button or menu entry to trigger this when needed.

---

## Version Tracking

The app shows the version (from `package.json`) in the **bottom-left corner** of the window to help debug caching issues.
