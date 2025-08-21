import { useState, useEffect } from 'react';

interface DebugMessage {
  timestamp: string;
  message: string;
  type: 'sensor' | 'config' | 'system';
}

export default function Debug() {
  // State management for debug window
  const [debugMessages, setDebugMessages] = useState<DebugMessage[]>([]);
  const [riveConfig, setRiveConfig] = useState<any>(null);
  const [currentSensorData, setCurrentSensorData] = useState<Record<string, any>>({});
  const [autoScroll, setAutoScroll] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  // Add debug message helper
  const addDebugMessage = (message: string, type: 'sensor' | 'config' | 'system' = 'system') => {
    const newMessage: DebugMessage = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setDebugMessages(prev => [...prev.slice(-99), newMessage]);
  };

  // Listen for IPC messages when in debug mode
  useEffect(() => {
    if (!window.ipcRenderer) {
      addDebugMessage("❌ No ipcRenderer available - running in browser mode", 'system');
      return;
    }

    addDebugMessage("🔌 Debug window initialized, listening for data...", 'system');

    const handleRiveConfig = (_event: any, data: any) => {
      addDebugMessage(`📋 Received rive-config for screenId: ${data.screenId}`, 'config');
      setRiveConfig(data);
      setIsConfigured(true);
      
      // Log config details
      const riveConfigData = data.frameConfig?.frameConfig?.rive || data.frameConfig?.rive;
      if (riveConfigData?.discovery) {
        addDebugMessage(`🎮 State machines: ${riveConfigData.discovery.machines.length}, Total inputs: ${riveConfigData.discovery.metadata.totalInputs}`, 'config');
      }
      
      const elements = data.frameConfig?.frameElements || data.frameElements || [];
      addDebugMessage(`📐 Frame elements: ${elements.length} total`, 'config');
    };

    const handleSensorData = (_event: any, data: any) => {
      addDebugMessage(`📊 Received sensor data for screenId: ${data.screenId}`, 'sensor');
      
      // Expand comma-separated sensor tags
      const expandedSensorData: Record<string, any> = {};
      Object.entries(data.sensors || {}).forEach(([sensorKey, sensorData]: [string, any]) => {
        const sensorTags = sensorKey.split(',').map((tag: string) => tag.trim());
        sensorTags.forEach(tag => {
          expandedSensorData[tag] = sensorData;
        });
      });
      
      setCurrentSensorData(expandedSensorData);
      
      const sensorCount = Object.keys(expandedSensorData).length;
      addDebugMessage(`📊 Updated ${sensorCount} sensor values`, 'sensor');
    };

    const handleDisplayJson = (_event: any, data: any) => {
      if (data.type === 'rive_config') {
        handleRiveConfig(_event, data);
      } else if (data.type === 'rive_sensor') {
        handleSensorData(_event, data);
      } else {
        addDebugMessage(`📝 Received ${data.type} message`, 'system');
      }
    };

    window.ipcRenderer.on("rive-config", handleRiveConfig);
    window.ipcRenderer.on("rive-sensor-data", handleSensorData);
    window.ipcRenderer.on("display:json", handleDisplayJson);

    return () => {
      window.ipcRenderer?.off("rive-config", handleRiveConfig);
      window.ipcRenderer?.off("rive-sensor-data", handleSensorData);
      window.ipcRenderer?.off("display:json", handleDisplayJson);
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll) {
      const container = document.getElementById('debug-log-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [debugMessages, autoScroll]);

  const getCanvasConfig = () => {
    if (!riveConfig) return null;
    const canvas = riveConfig.frameConfig?.frameConfig?.canvas || riveConfig.frameConfig?.canvas;
    const background = riveConfig.frameConfig?.frameConfig?.background || riveConfig.frameConfig?.background;
    
    return {
      width: canvas?.width || 400,
      height: canvas?.height || 1280,
      orientation: canvas?.orientation || 'portrait',
      backgroundColor: background?.color || '#000000',
      backgroundType: background?.type || 'color'
    };
  };

  const clearLogs = () => {
    setDebugMessages([]);
    addDebugMessage("🗑️ Debug logs cleared", 'system');
  };

  const exportLogs = () => {
    const logsText = debugMessages.map(msg => 
      `[${msg.timestamp}] [${msg.type.toUpperCase()}] ${msg.message}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canvasConfig = getCanvasConfig();

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#0a0a0a',
      color: '#e0e0e0',
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '13px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, #1a1a1a, #2a2a2a)',
        padding: '12px 20px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            color: '#00d4aa',
            fontSize: '18px',
            fontWeight: 'bold',
          }}>
            🛠️ JunctionRelay Debug Panel
          </h1>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            Real-time debugging and monitoring
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={clearLogs}
            style={{
              padding: '6px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            🗑️ Clear
          </button>
          <button
            onClick={exportLogs}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            💾 Export
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel - Status */}
        <div style={{
          width: '350px',
          backgroundColor: '#111',
          borderRight: '1px solid #333',
          padding: '20px',
          overflow: 'auto',
        }}>
          <h3 style={{ color: '#00d4aa', margin: '0 0 15px 0', fontSize: '14px' }}>📊 System Status</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#888' }}>Status:</span>{' '}
              <span style={{ color: isConfigured ? '#28a745' : '#ffc107' }}>
                {isConfigured ? '✅ Configured' : '⏳ Waiting for config'}
              </span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#888' }}>Canvas:</span>{' '}
              <span style={{ color: '#17a2b8' }}>
                {canvasConfig ? `${canvasConfig.width}×${canvasConfig.height}` : 'Unknown'}
              </span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#888' }}>Active Sensors:</span>{' '}
              <span style={{ color: '#17a2b8' }}>{Object.keys(currentSensorData).length}</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#888' }}>IPC:</span>{' '}
              <span style={{ color: window.ipcRenderer ? '#28a745' : '#dc3545' }}>
                {window.ipcRenderer ? '✅ Connected' : '❌ Not Available'}
              </span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#888' }}>Messages:</span>{' '}
              <span style={{ color: '#17a2b8' }}>{debugMessages.length}</span>
            </div>
          </div>

          {/* Current Sensor Data */}
          {Object.keys(currentSensorData).length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#ffc107', margin: '0 0 10px 0', fontSize: '13px' }}>📊 Live Sensor Data</h4>
              <div style={{
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                padding: '10px',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                {Object.entries(currentSensorData).map(([key, data]: [string, any]) => (
                  <div key={key} style={{ 
                    marginBottom: '6px',
                    padding: '4px 8px',
                    backgroundColor: '#161b22',
                    borderRadius: '3px',
                    fontSize: '12px',
                  }}>
                    <div style={{ color: '#58a6ff', fontWeight: 'bold' }}>{key}</div>
                    <div style={{ color: '#e6edf3' }}>
                      {data.value} <span style={{ color: '#7d8590' }}>{data.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Config Info */}
          {riveConfig && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#28a745', margin: '0 0 10px 0', fontSize: '13px' }}>📋 Configuration</h4>
              <div style={{
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '11px',
              }}>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#58a6ff' }}>Screen ID:</span> {riveConfig.screenId}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#58a6ff' }}>Elements:</span> {(riveConfig.frameConfig?.frameElements || riveConfig.frameElements || []).length}
                </div>
                {canvasConfig && (
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#58a6ff' }}>Canvas:</span> {canvasConfig.width}×{canvasConfig.height}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Debug Logs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Log Controls */}
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#1a1a1a',
            borderBottom: '1px solid #333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{ color: '#17a2b8', margin: 0, fontSize: '14px' }}>📝 Debug Messages</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#888' }}>
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  style={{ marginRight: '5px' }}
                />
                Auto-scroll
              </label>
              <span style={{ fontSize: '12px', color: '#888' }}>
                {debugMessages.length} messages
              </span>
            </div>
          </div>

          {/* Log Container */}
          <div
            id="debug-log-container"
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '10px 20px',
              backgroundColor: '#0a0a0a',
            }}
          >
            {debugMessages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#666',
                marginTop: '50px',
                fontSize: '14px',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📡</div>
                <div>Debug panel ready</div>
                <div style={{ fontSize: '12px', marginTop: '10px' }}>
                  Start WebSocket server and send data to see messages here
                </div>
              </div>
            ) : (
              debugMessages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: '6px',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    backgroundColor: msg.type === 'sensor' ? '#0d2818' : 
                                   msg.type === 'config' ? '#2d1810' : '#1a1a2e',
                    borderLeft: `3px solid ${
                      msg.type === 'sensor' ? '#28a745' : 
                      msg.type === 'config' ? '#ffc107' : '#17a2b8'
                    }`,
                    fontSize: '12px',
                    lineHeight: '1.4',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '2px',
                  }}>
                    <span style={{
                      color: msg.type === 'sensor' ? '#28a745' : 
                             msg.type === 'config' ? '#ffc107' : '#17a2b8',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      fontSize: '10px',
                    }}>
                      {msg.type}
                    </span>
                    <span style={{ color: '#666', fontSize: '10px' }}>
                      {msg.timestamp}
                    </span>
                  </div>
                  <div style={{ color: '#e0e0e0' }}>
                    {msg.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}