import { useState, useEffect, useMemo } from "react";
import SensorTest from "./SensorTest";

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
  const [toast, setToast] = useState<{ msg: string; type: "info" | "error" } | null>(null);
  const [appVersion, setAppVersion] = useState<string>("");
  const [wsRunning, setWsRunning] = useState(false);
  // Removed unused wsStats state variable

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  // Visualization mode
  const isVisualizationMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "visualization";
  }, []);

  if (isVisualizationMode) return <SensorTest />;

  // IPC listeners + fetch version
  useEffect(() => {
    if (!window.ipcRenderer) return;

    const handleVisualizationOpened = () => setVisualizationOpen(true);
    const handleVisualizationClosed = () => setVisualizationOpen(false);
    const handleWsStatus = (_e: any, msg: { ok: boolean; message: string }) => {
      setToast({ msg: msg.message, type: msg.ok ? "info" : "error" });
      // Determine if WebSocket is running based on message
      if (msg.message.includes("started") || msg.message.includes("already running")) {
        setWsRunning(true);
      } else if (msg.message.includes("stopped") || msg.message.includes("not running")) {
        setWsRunning(false);
      }
    };

    window.ipcRenderer.on("visualization-opened", handleVisualizationOpened);
    window.ipcRenderer.on("visualization-closed", handleVisualizationClosed);
    window.ipcRenderer.on("ws-status", handleWsStatus);

    window.ipcRenderer.invoke("get-app-version").then((v) => v && setAppVersion(v));

    return () => {
      window.ipcRenderer?.off("visualization-opened", handleVisualizationOpened);
      window.ipcRenderer?.off("visualization-closed", handleVisualizationClosed);
      window.ipcRenderer?.off("ws-status", handleWsStatus);
    };
  }, []);

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

  // Removed unused launchVisualization function
  // Removed unused openVirtualDeviceSettings function

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
        // 🔒 Lock the app to the viewport with no overflow
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

        {/* Divider (tight margins to avoid vertical expansion) */}
        <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid #333" }} />

        {/* Virtual Device Section */}
<section>
  <h3 style={{ margin: "0 0 12px" }}>JunctionRelay Virtual Device</h3>
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", gap: 12 }}>
      <button style={{ padding: "10px 14px", cursor: "pointer" }} onClick={startWebSocketServer}>
        {wsRunning ? "⏹️ Stop WebSocket Server" : "▶️ Start WebSocket Server"}
      </button>
      <button 
        style={{ padding: "10px 14px", cursor: "pointer" }} 
        onClick={() => {
          if (visualizationOpen) {
            window.ipcRenderer?.send("close-visualization");
          } else {
            window.ipcRenderer?.send("open-visualization", { fullscreen: true });
          }
        }}
      >
        {visualizationOpen ? "⏰ Close Fullscreen" : "🎨 Launch Fullscreen"}
      </button>
      <button 
        style={{ padding: "10px 14px", cursor: "pointer" }} 
        onClick={() => {
          if (visualizationOpen) {
            window.ipcRenderer?.send("close-visualization");
          } else {
            window.ipcRenderer?.send("open-visualization", { fullscreen: false });
          }
        }}
      >
        {visualizationOpen ? "⏰ Close Debug" : "🛠 Launch Debug"}
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