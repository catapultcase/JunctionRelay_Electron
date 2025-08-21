import { useState, useEffect, useMemo, useRef } from "react";
import ViewPort from "./ViewPort";
import Debug from "./Debug";

// Simple inline toast (non-blocking)
function Toast({ message, type }: { message: string; type: "info" | "error" }) {
  const bg = type === "error" ? "#c0392b" : "#2d7bf4";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        maxWidth: 560,
        background: bg,
        color: "white",
        padding: "10px 14px",
        borderRadius: 6,
        boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
        zIndex: 1000,
        fontSize: 13,
        lineHeight: 1.35,
      }}
    >
      {message}
    </div>
  );
}

export default function App() {
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState("http://10.168.1.90:7180/");
  const [visualizationOpen, setVisualizationOpen] = useState(false);
  const [debugWindowOpen, setDebugWindowOpen] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "error" } | null>(null);
  const [appVersion, setAppVersion] = useState<string>("");
  const [wsRunning, setWsRunning] = useState(false);

  // Use a ref to always get the current fullscreen mode value
  const fullscreenModeRef = useRef(fullscreenMode);
  const preferencesLoadedRef = useRef(preferencesLoaded);
  const visualizationOpenRef = useRef(visualizationOpen);

  // Update refs whenever state changes
  useEffect(() => {
    fullscreenModeRef.current = fullscreenMode;
  }, [fullscreenMode]);

  useEffect(() => {
    preferencesLoadedRef.current = preferencesLoaded;
  }, [preferencesLoaded]);

  useEffect(() => {
    visualizationOpenRef.current = visualizationOpen;
  }, [visualizationOpen]);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  // Load saved fullscreen preference on startup
  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.invoke('get-fullscreen-preference').then((saved: boolean | null) => {
        if (saved !== null) {
          console.log("[App] Loaded saved fullscreen preference:", saved);
          setFullscreenMode(saved);
        }
        setPreferencesLoaded(true);
        console.log("[App] Preferences loading complete");
      }).catch(() => {
        console.log("[App] No saved preference found, using default");
        setPreferencesLoaded(true);
      });
    } else {
      setPreferencesLoaded(true);
    }
  }, []);

  // Check for different modes
  const isVisualizationMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "visualization";
  }, []);

  const isDebugMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("debug") === "true";
  }, []);

  // Route to appropriate component based on URL params
  if (isVisualizationMode) {
    return <ViewPort />;
  }

  if (isDebugMode) {
    return <Debug />;
  }

  // IPC listeners + fetch version
  useEffect(() => {
    if (!window.ipcRenderer) return;

    const handleVisualizationOpened = () => setVisualizationOpen(true);
    const handleVisualizationClosed = () => setVisualizationOpen(false);
    const handleDebugWindowOpened = () => setDebugWindowOpen(true);
    const handleDebugWindowClosed = () => setDebugWindowOpen(false);
    const handleWsStatus = (_e: any, msg: { ok: boolean; message: string }) => {
      setToast({ msg: msg.message, type: msg.ok ? "info" : "error" });
      if (msg.message.includes("started") || msg.message.includes("already running")) {
        setWsRunning(true);
      } else if (msg.message.includes("stopped") || msg.message.includes("not running")) {
        setWsRunning(false);
      }
    };

    // Handle auto-opening viewport when config arrives - using refs to get current values
    const handleRiveConfig = (_e: any, data: any) => {
      if (data.type === 'rive_config') {
        const currentFullscreenMode = fullscreenModeRef.current;
        const currentPreferencesLoaded = preferencesLoadedRef.current;
        const currentVisualizationOpen = visualizationOpenRef.current;
        
        console.log("[App] Received rive-config, visualizationOpen:", currentVisualizationOpen);
        console.log("[App] Current fullscreen mode:", currentFullscreenMode, "Preferences loaded:", currentPreferencesLoaded);
        
        if (!currentVisualizationOpen && currentPreferencesLoaded) {
          console.log("[App] Auto-opening ViewPort with fullscreen mode:", currentFullscreenMode);
          setToast({ msg: `Configuration received, opening ViewPort in ${currentFullscreenMode ? 'Fullscreen' : 'Windowed'} mode...`, type: "info" });
          
          // Set state immediately to prevent duplicate opens
          setVisualizationOpen(true);
          
          window.ipcRenderer?.send("open-visualization", { fullscreen: currentFullscreenMode });
        } else if (!currentPreferencesLoaded) {
          console.log("[App] Config received but preferences not loaded yet, skipping auto-open");
        } else {
          console.log("[App] ViewPort already open, skipping auto-open");
        }
      }
    };

    window.ipcRenderer.on("visualization-opened", handleVisualizationOpened);
    window.ipcRenderer.on("visualization-closed", handleVisualizationClosed);
    window.ipcRenderer.on("debug-window-opened", handleDebugWindowOpened);
    window.ipcRenderer.on("debug-window-closed", handleDebugWindowClosed);
    window.ipcRenderer.on("ws-status", handleWsStatus);
    window.ipcRenderer.on("rive-config", handleRiveConfig);

    window.ipcRenderer.invoke("get-app-version").then((v) => v && setAppVersion(v));

    return () => {
      window.ipcRenderer?.off("visualization-opened", handleVisualizationOpened);
      window.ipcRenderer?.off("visualization-closed", handleVisualizationClosed);
      window.ipcRenderer?.off("debug-window-opened", handleDebugWindowOpened);
      window.ipcRenderer?.off("debug-window-closed", handleDebugWindowClosed);
      window.ipcRenderer?.off("ws-status", handleWsStatus);
      window.ipcRenderer?.off("rive-config", handleRiveConfig);
    };
  }, []); // Remove dependencies to avoid recreating the event handler

  const openJunctionRelay = () => setShowUrlDialog(true);
  const openJunctionRelayCloud = () => {
    if (!window.ipcRenderer) return setToast({ msg: "ipcRenderer unavailable.", type: "error" });
    try {
      window.ipcRenderer.send("open-external", "https://dashboard.junctionrelay.com");
      setToast({ msg: "Opening JunctionRelay Cloud…", type: "info" });
    } catch {
      setToast({ msg: "Error opening cloud dashboard.", type: "error" });
    }
  };
  const openJunctionRelaySettings = () => setToast({ msg: "Settings coming soon.", type: "info" });
  
  const startWebSocketServer = () => {
    if (!window.ipcRenderer) return setToast({ msg: "ipcRenderer unavailable.", type: "error" });
    try {
      if (wsRunning) {
        window.ipcRenderer.send("stop-ws");
        setToast({ msg: "Stopping WebSocket Server…", type: "info" });
      } else {
        window.ipcRenderer.send("start-ws");
        setToast({ msg: "Starting WebSocket Server…", type: "info" });
      }
    } catch {
      setToast({ msg: "Failed to toggle WebSocket Server.", type: "error" });
    }
  };

  const openDebugWindow = () => {
    if (!window.ipcRenderer) return setToast({ msg: "ipcRenderer unavailable.", type: "error" });
    try {
      window.ipcRenderer.send("open-debug-window");
      setToast({ msg: "Opening Debug Window…", type: "info" });
    } catch {
      setToast({ msg: "Failed to open debug window.", type: "error" });
    }
  };

  const closeDebugWindow = () => {
    if (!window.ipcRenderer) return setToast({ msg: "ipcRenderer unavailable.", type: "error" });
    try {
      window.ipcRenderer.send("close-debug-window");
      setToast({ msg: "Closing Debug Window…", type: "info" });
    } catch {
      setToast({ msg: "Failed to close debug window.", type: "error" });
    }
  };

  const handleOpenUrl = () => {
    if (!window.ipcRenderer) return setToast({ msg: "ipcRenderer unavailable.", type: "error" });
    if (!urlInput.trim()) return setToast({ msg: "Please enter a URL.", type: "info" });
    if (!/^https?:\/\//i.test(urlInput)) return setToast({ msg: "Enter a valid http/https URL.", type: "info" });
    try {
      window.ipcRenderer.send("open-external", urlInput);
      setShowUrlDialog(false);
      setToast({ msg: "Opening URL…", type: "info" });
    } catch {
      setToast({ msg: "Error sending message to main process.", type: "error" });
    }
  };

  const quitApp = () => {
    if (!window.ipcRenderer) return;
    try {
      window.ipcRenderer.send("quit-app");
    } catch {
      setToast({ msg: "Error quitting app.", type: "error" });
    }
  };

  const handleCancelUrl = () => setShowUrlDialog(false);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        boxSizing: "border-box",
        margin: 0,
        padding: 24,
        background: "#111",
        color: "#eaeaea",
        fontFamily: "system-ui, Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <header>
        <h1 style={{ margin: 0 }}>JunctionRelay</h1>
        <p style={{ color: "#9aa0a6", margin: "6px 0 0" }}>
          Virtual device with WebSocket server and Rive visualization.
        </p>
      </header>

      <main style={{ flex: 1, overflow: "hidden" }}>
        {/* JunctionRelay Access */}
        <section>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ padding: "10px 14px", cursor: "pointer" }} onClick={openJunctionRelay}>
                🏠 Local Server
              </button>
              <button style={{ padding: "10px 14px", cursor: "pointer" }} onClick={openJunctionRelayCloud}>
                ☁️ Cloud Dashboard
              </button>
            </div>
            <div>
              <button style={{ padding: "10px 14px", cursor: "pointer" }} onClick={openJunctionRelaySettings}>
                ⚙️ Settings
              </button>
            </div>
          </div>
        </section>

        <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid #333" }} />

        {/* Virtual Device Section */}
        <section>
          <h3 style={{ margin: "0 0 12px" }}>JunctionRelay Virtual Device</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button style={{ padding: "10px 14px", cursor: "pointer" }} onClick={startWebSocketServer}>
                {wsRunning ? "⏹️ Stop WebSocket Server" : "▶️ Start WebSocket Server"}
              </button>
              
              {/* Beautiful Toggle Switch */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "16px", 
                padding: "12px 20px", 
                backgroundColor: "#1e1e1e", 
                borderRadius: "12px",
                border: "2px solid #444",
                minWidth: "200px"
              }}>
                <span style={{ 
                  fontSize: "14px", 
                  color: "#fff", 
                  fontWeight: "500",
                  minWidth: "50px" 
                }}>
                  Mode:
                </span>
                
                {/* Custom Toggle Switch */}
                <div 
                  style={{ 
                    position: "relative",
                    width: "80px",
                    height: "40px",
                    backgroundColor: fullscreenMode ? "#0d7377" : "#d32f2f",
                    borderRadius: "20px",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
                    border: "3px solid " + (fullscreenMode ? "#4fc3f7" : "#ff7043")
                  }}
                  onClick={() => {
                    const newMode = !fullscreenMode;
                    setFullscreenMode(newMode);
                    // Save preference via IPC
                    if (window.ipcRenderer) {
                      console.log("[App] Saving fullscreen preference:", newMode);
                      window.ipcRenderer.send('save-fullscreen-preference', newMode);
                    }
                    setToast({ 
                      msg: `Mode switched to ${newMode ? 'Fullscreen' : 'Windowed'}`, 
                      type: "info" 
                    });
                  }}
                >
                  {/* Slider Circle */}
                  <div style={{
                    position: "absolute",
                    top: "3px",
                    left: fullscreenMode ? "43px" : "3px",
                    width: "32px",
                    height: "32px",
                    backgroundColor: "#ffffff",
                    borderRadius: "50%",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px"
                  }}>
                    {fullscreenMode ? "🖥️" : "🪟"}
                  </div>
                </div>
                
                {/* Status Text */}
                <div style={{ 
                  fontSize: "14px", 
                  color: fullscreenMode ? "#4fc3f7" : "#ff7043",
                  fontWeight: "600",
                  minWidth: "80px",
                  textTransform: "uppercase",
                  letterSpacing: "1px"
                }}>
                  {fullscreenMode ? "FULLSCREEN" : "WINDOWED"}
                </div>
              </div>

              <button 
                style={{ 
                  padding: "10px 14px", 
                  cursor: "pointer",
                  backgroundColor: visualizationOpen ? "#dc3545" : "#007acc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px"
                }} 
                onClick={() => {
                  console.log("[App] Manual ViewPort button clicked, current mode:", fullscreenMode);
                  if (visualizationOpen) {
                    window.ipcRenderer?.send("close-visualization");
                  } else {
                    window.ipcRenderer?.send("open-visualization", { fullscreen: fullscreenMode });
                  }
                }}
              >
                {visualizationOpen ? "⏰ Close ViewPort" : "🎨 Open ViewPort"}
              </button>
            </div>
            
            {/* Debug Controls Row */}
            <div style={{ display: "flex", gap: 12 }}>
              <button 
                style={{ 
                  padding: "10px 14px", 
                  cursor: "pointer",
                  backgroundColor: debugWindowOpen ? "#dc3545" : "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px"
                }} 
                onClick={() => {
                  console.log("[App] Debug button clicked, debugWindowOpen:", debugWindowOpen);
                  if (debugWindowOpen) {
                    closeDebugWindow();
                  } else {
                    openDebugWindow();
                  }
                }}
              >
                {debugWindowOpen ? "❌ Close Debug" : "🛠 Launch Debug"}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Quit Button (fixed) */}
      <button
        onClick={quitApp}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          padding: "8px 12px",
          cursor: "pointer",
          backgroundColor: "#dc3545",
          border: "none",
          borderRadius: 4,
          color: "white",
          fontSize: 12,
          fontWeight: 500,
          zIndex: 1000,
        }}
      >
        🚪 Quit
      </button>

      {/* Version (fixed, bottom-left) */}
      {appVersion && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: 20,
            fontSize: 12,
            color: "#9aa0a6",
            zIndex: 1000,
            userSelect: "none",
          }}
        >
          v{appVersion}
        </div>
      )}

      {/* URL Input Dialog */}
      {showUrlDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              color: "#111",
              padding: 24,
              borderRadius: 8,
              minWidth: 400,
              maxWidth: 500,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Enter JunctionRelay Local Server URL</h3>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="e.g. http://10.168.1.90:7180/"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 14,
                border: "1px solid #ccc",
                borderRadius: 4,
                marginBottom: 16,
                boxSizing: "border-box",
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleOpenUrl();
                if (e.key === "Escape") handleCancelUrl();
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={handleCancelUrl}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  backgroundColor: "#f5f5f5",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  color: "#333",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleOpenUrl}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  backgroundColor: "#007acc",
                  border: "1px solid #007acc",
                  borderRadius: 4,
                  color: "white",
                }}
              >
                Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}