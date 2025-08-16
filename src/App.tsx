import { useState, useEffect } from "react";
import SensorTest from "./SensorTest";

// Use existing Window interface from electron-env.d.ts

export default function App() {
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState("http://10.168.1.90:7180/");
  const [visualizationOpen, setVisualizationOpen] = useState(false);

  // Check if we're in visualization mode
  const urlParams = new URLSearchParams(window.location.search);
  const isVisualizationMode = urlParams.get('mode') === 'visualization';

  console.log('Current URL:', window.location.href);
  console.log('Is visualization mode:', isVisualizationMode);

  // If we're in visualization mode, just show the sensor test
  if (isVisualizationMode) {
    return <SensorTest />;
  }

  // Set up IPC listeners for visualization state
  useEffect(() => {
    if (!window.ipcRenderer) return;

    const handleVisualizationOpened = () => {
      setVisualizationOpen(true);
    };

    const handleVisualizationClosed = () => {
      setVisualizationOpen(false);
    };

    window.ipcRenderer.on('visualization-opened', handleVisualizationOpened);
    window.ipcRenderer.on('visualization-closed', handleVisualizationClosed);

    return () => {
      window.ipcRenderer?.off('visualization-opened', handleVisualizationOpened);
      window.ipcRenderer?.off('visualization-closed', handleVisualizationClosed);
    };
  }, []);

  const openJunctionRelay = () => {
    console.log("JunctionRelay Local button clicked");
    setShowUrlDialog(true);
  };

  const openJunctionRelayCloud = () => {
    console.log("JunctionRelay Cloud button clicked");
    
    if (!window.ipcRenderer) {
      console.error("ipcRenderer is not available");
      alert("Error: ipcRenderer is not available. Check preload script.");
      return;
    }
    
    try {
      window.ipcRenderer.send("open-external", "https://dashboard.junctionrelay.com");
      console.log("Opening JunctionRelay Cloud dashboard");
    } catch (error) {
      console.error("Error opening cloud dashboard:", error);
      alert("Error opening cloud dashboard");
    }
  };

  const openJunctionRelaySettings = () => {
    alert("JunctionRelay Settings: coming soon");
  };

  const startWebSocketServer = () => {
    alert("WebSocket Server: coming soon");
  };

  const launchVisualization = () => {
    if (visualizationOpen) {
      // Close visualization
      console.log("Close Visualization button clicked");
      
      if (!window.ipcRenderer) {
        console.error("ipcRenderer is not available");
        alert("Error: ipcRenderer is not available. Check preload script.");
        return;
      }
      
      try {
        window.ipcRenderer.send("close-visualization");
        console.log("Visualization close request sent");
      } catch (error) {
        console.error("Error closing visualization:", error);
        alert("Error closing visualization");
      }
    } else {
      // Launch visualization
      console.log("Launch Visualization button clicked");
      
      if (!window.ipcRenderer) {
        console.error("ipcRenderer is not available");
        alert("Error: ipcRenderer is not available. Check preload script.");
        return;
      }
      
      try {
        window.ipcRenderer.send("open-visualization");
        console.log("Visualization launch request sent");
      } catch (error) {
        console.error("Error launching visualization:", error);
        alert("Error launching visualization");
      }
    }
  };

  const openVirtualDeviceSettings = () => {
    alert("Virtual Device Settings: coming soon");
  };

  const handleOpenUrl = () => {
    console.log("Attempting to open URL:", urlInput);
    
    if (!window.ipcRenderer) {
      console.error("ipcRenderer is not available");
      alert("Error: ipcRenderer is not available. Check preload script.");
      return;
    }
    
    if (!urlInput.trim()) {
      console.log("No URL entered");
      alert("Please enter a URL");
      return;
    }

    if (!/^https?:\/\//i.test(urlInput)) {
      console.log("Invalid URL format");
      alert("Please enter a valid http/https URL.");
      return;
    }
    
    console.log("Sending open-external message with URL:", urlInput);
    try {
      window.ipcRenderer.send("open-external", urlInput);
      console.log("Message sent successfully");
      setShowUrlDialog(false);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message to main process");
    }
  };

  const quitApp = () => {
    if (!window.ipcRenderer) {
      console.error("ipcRenderer is not available");
      return;
    }
    
    try {
      window.ipcRenderer.send("quit-app");
    } catch (error) {
      console.error("Error quitting app:", error);
    }
  };

  const handleCancelUrl = () => {
    setShowUrlDialog(false);
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, Arial, sans-serif", position: "relative", minHeight: "calc(100vh - 80px)", paddingBottom: 60 }}>
      <h1 style={{ marginTop: 0 }}>JunctionRelay</h1>
      <p style={{ color: "#666" }}>
        Virtual device with WebSocket server and Rive visualization.
      </p>

      {/* JunctionRelay Access */}
      <div style={{ marginTop: 16 }}>
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
      </div>

      {/* Divider */}
      <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid #ccc" }} />

      {/* Virtual Device Section */}
      <div>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>JunctionRelay Virtual Device</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{ padding: "10px 14px", cursor: "pointer" }} onClick={startWebSocketServer}>
              ▶️ Start WebSocket Server
            </button>
            <button style={{ padding: "10px 14px", cursor: "pointer" }} onClick={launchVisualization}>
              {visualizationOpen ? "❌ Close Visualization" : "🎨 Launch Visualization"}
            </button>
          </div>
          <div>
            <button style={{ padding: "10px 14px", cursor: "pointer" }} onClick={openVirtualDeviceSettings}>
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>

      {/* Quit Button */}
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
          zIndex: 1000
        }}
      >
        🚪 Quit
      </button>

      {/* URL Input Dialog */}
      {showUrlDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: 24,
            borderRadius: 8,
            minWidth: 400,
            maxWidth: 500
          }}>
            <h3 style={{ marginTop: 0, color: "#333" }}>Enter JunctionRelay Local Server URL</h3>
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
                boxSizing: "border-box"
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
                  color: "#333"
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
                  color: "white"
                }}
              >
                Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}