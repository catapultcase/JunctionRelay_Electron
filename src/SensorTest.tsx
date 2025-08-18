import { useMemo, useState, useEffect } from 'react'
import {
  useRive,
  Layout,
  Fit,
  Alignment,
  StateMachineInputType,
} from '@rive-app/react-canvas'

interface RiveSettings {
  fit: string;
  alignment: string;
  autoplay: boolean;
  loop: boolean;
  stateMachine?: string;
}

interface RiveConfigItem {
  enabled: boolean;
  file: string;
  fileUrl?: string;
  inputs: Record<string, any>;
  settings: RiveSettings;
  fileData?: string;
  filename?: string;
  embedded?: boolean;
}

interface CanvasConfig {
  width: number;
  height: number;
  orientation: string;
}

interface BackgroundConfig {
  type: string;
  color: string;
  hasImageData: boolean;
  opacity: number;
}

interface FrameConfig {
  version?: string;
  lastConfigUpdate?: string;
  canvas: CanvasConfig;
  background: BackgroundConfig;
  rive: RiveConfigItem;
}

interface RiveConfig {
  type: "rive_config";
  screenId: string;
  frameConfig: {
    type?: "rive_config";
    screenId?: string;
    frameConfig?: FrameConfig;
    canvas?: CanvasConfig;
    background?: BackgroundConfig;
    rive?: RiveConfigItem;
    frameElements?: Array<{
      id: string;
      type: string;
      position: { x: number; y: number; width: number; height: number };
      display: { visible: boolean; zIndex: number; order: number };
      properties: {
        sensorTag?: string;
        placeholderValue?: string;
        placeholderUnit?: string;
        fontSize?: number;
        fontFamily?: string;
        fontWeight?: string;
        textColor?: string;
        color?: string;
        showUnit?: boolean;
        showLabel?: boolean;
        placeholderSensorLabel?: string;
        text?: string;
        textAlign?: string;
        backgroundColor?: string;
        [key: string]: any;
      };
      lastModified?: string;
    }>;
  };
  frameElements?: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; width: number; height: number };
    display: { visible: boolean; zIndex: number; order: number };
    properties: {
      sensorTag?: string;
      placeholderValue?: string;
      placeholderUnit?: string;
      fontSize?: number;
      fontFamily?: string;
      fontWeight?: string;
      textColor?: string;
      color?: string;
      showUnit?: boolean;
      showLabel?: boolean;
      placeholderSensorLabel?: string;
      text?: string;
      textAlign?: string;
      backgroundColor?: string;
      [key: string]: any;
    };
    lastModified?: string;
  }>;
  riveFile?: string;
  riveEmbedInPayload?: boolean;
  riveDataEmbedded?: boolean;
}

interface SensorPayload {
  type: "rive_sensor";
  screenId: string;
  sensors: Record<string, {
    value: number;
    unit: string;
    displayValue: string;
  }>;
}

interface DisplayElement {
  id: string;
  type: 'sensor' | 'text';
  position: { x: number; y: number; width: number; height: number };
  properties: Record<string, any>;
  sensorTag?: string;
  text?: string;
  currentValue?: string;
  currentUnit?: string;
}

export default function SensorTest() {
  // Core state
  const [riveConfig, setRiveConfig] = useState<RiveConfig | null>(null);
  const [displayElements, setDisplayElements] = useState<DisplayElement[]>([]);
  const [currentSensorData, setCurrentSensorData] = useState<Record<string, any>>({});
  const [riveFileBlob, setRiveFileBlob] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Debug state (remove in production)
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [configMessages, setConfigMessages] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true);

  // Debug helpers
  const addDebugMessage = (message: string) => {
    console.log(`[SensorTest] ${message}`);
    setDebugMessages(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const addConfigMessage = (message: string) => {
    console.log(`[SensorTest-Config] ${message}`);
    setConfigMessages(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Get canvas dimensions and background from config
  const getCanvasConfig = (config: RiveConfig) => {
    const canvas = config.frameConfig?.frameConfig?.canvas || config.frameConfig?.canvas;
    const background = config.frameConfig?.frameConfig?.background || config.frameConfig?.background;
    
    return {
      width: canvas?.width || 400,
      height: canvas?.height || 1280,
      orientation: canvas?.orientation || 'portrait',
      backgroundColor: background?.color || '#000000',
      backgroundType: background?.type || 'color'
    };
  };

  // Process Rive file data (embedded, URL, or file reference)
  const processRiveFileData = async (config: RiveConfig) => {
    addConfigMessage("🔍 Starting Rive file processing...");
    
    // Handle deeply nested config structure - check both levels
    const riveConfig = config.frameConfig?.frameConfig?.rive || config.frameConfig?.rive;
    
    addConfigMessage(`🔍 Rive config found: ${riveConfig ? 'Yes' : 'No'}`);
    if (riveConfig) {
      addConfigMessage(`🔍 Rive config keys: ${Object.keys(riveConfig).join(', ')}`);
      addConfigMessage(`🔍 fileUrl: ${riveConfig.fileUrl || 'None'}`);
      addConfigMessage(`🔍 file: ${riveConfig.file || 'None'}`);
      addConfigMessage(`🔍 embedded: ${riveConfig.embedded || 'None'}`);
      addConfigMessage(`🔍 fileData length: ${riveConfig.fileData?.length || 0}`);
    } else {
      addConfigMessage(`❌ No rive config found in nested structure`);
      addConfigMessage(`🔍 Checking frameConfig structure...`);
      if (config.frameConfig) {
        addConfigMessage(`🔍 frameConfig exists, keys: ${Object.keys(config.frameConfig).join(', ')}`);
        if (config.frameConfig.frameConfig) {
          addConfigMessage(`🔍 nested frameConfig exists, keys: ${Object.keys(config.frameConfig.frameConfig).join(', ')}`);
        } else {
          addConfigMessage(`❌ No nested frameConfig found`);
        }
      } else {
        addConfigMessage(`❌ No frameConfig found at all`);
      }
    }
    
    if (riveConfig?.fileUrl) {
      // Handle URL-based loading
      try {
        addConfigMessage(`📥 Starting download from: ${riveConfig.fileUrl}`);
        
        const startTime = Date.now();
        const response = await fetch(riveConfig.fileUrl);
        const fetchTime = Date.now() - startTime;
        
        addConfigMessage(`📥 Fetch completed in ${fetchTime}ms, status: ${response.status}`);
        addConfigMessage(`📋 Response headers:`);
        addConfigMessage(`   Content-Length: ${response.headers.get('Content-Length') || 'Not set'}`);
        addConfigMessage(`   Content-Type: ${response.headers.get('Content-Type') || 'Not set'}`);
        addConfigMessage(`   Transfer-Encoding: ${response.headers.get('Transfer-Encoding') || 'Not set'}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const totalTime = Date.now() - startTime;
        
        addConfigMessage(`📥 Blob created: ${blob.size} bytes, total time: ${totalTime}ms`);
        addConfigMessage(`📊 Expected ~110KB, got ${blob.size} bytes (${((blob.size/110000)*100).toFixed(1)}% of expected)`);
        
        if (blob.size < 10000) {
          addConfigMessage(`⚠️ File appears truncated - checking first few bytes as text...`);
          const text = await blob.slice(0, Math.min(blob.size, 200)).text();
          addConfigMessage(`🔍 First 200 chars: ${text}`);
        }
        
        const blobUrl = URL.createObjectURL(blob);
        setRiveFileBlob(blobUrl);
        
        addConfigMessage(`✅ SUCCESS: Rive file downloaded and blob URL created`);
        addConfigMessage(`🔗 Blob URL: ${blobUrl.substring(0, 50)}...`);
        
        return blobUrl;
      } catch (error) {
        addConfigMessage(`❌ DOWNLOAD FAILED: ${error}`);
        addConfigMessage(`❌ Error details: ${JSON.stringify(error)}`);
        return null;
      }
    } else if (riveConfig?.fileData && riveConfig?.embedded) {
      // Handle embedded base64 data
      try {
        const base64Data = riveConfig.fileData;
        addConfigMessage(`📦 Processing embedded base64: ${base64Data.length} chars`);
        
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/octet-stream' });
        const blobUrl = URL.createObjectURL(blob);
        setRiveFileBlob(blobUrl);
        addConfigMessage(`✅ Embedded file processed successfully`);
        return blobUrl;
      } catch (error) {
        addConfigMessage(`❌ Embedded processing failed: ${error}`);
        return null;
      }
    } else if (riveConfig?.file) {
      // Handle relative file reference
      const fileUrl = `/api/frameengine/rive-files/${riveConfig.file}/content`;
      setRiveFileBlob(fileUrl);
      addConfigMessage(`🔍 Using relative file: ${fileUrl}`);
      return fileUrl;
    } else if (config.riveFile) {
      // Handle top-level file reference
      const fileUrl = `/api/frameengine/rive-files/${config.riveFile}/content`;
      setRiveFileBlob(fileUrl);
      addConfigMessage(`🔍 Using top-level file: ${fileUrl}`);
      return fileUrl;
    } else {
      // Fallback
      const legacyUrl = '/jr.riv';
      setRiveFileBlob(legacyUrl);
      addConfigMessage(`🔍 Using fallback: ${legacyUrl}`);
      return legacyUrl;
    }
  };

  // Extract display elements from config
  const extractDisplayElements = (config: RiveConfig) => {
    // Try both nested and top-level frameElements
    const elements = config.frameConfig?.frameElements || config.frameElements || [];
    
    const displayElements: DisplayElement[] = elements.map(element => ({
      id: element.id,
      type: element.type as 'sensor' | 'text',
      position: element.position,
      properties: element.properties,
      sensorTag: element.properties.sensorTag,
      text: element.properties.text,
    }));
    
    const sensorCount = displayElements.filter(e => e.type === 'sensor').length;
    const textCount = displayElements.filter(e => e.type === 'text').length;
    
    addDebugMessage(`📋 Extracted ${sensorCount} sensors, ${textCount} text elements`);
    setDisplayElements(displayElements);
    
    return displayElements;
  };

  // Process incoming config
  const processConfig = async (config: RiveConfig) => {
    addConfigMessage(`📥 Processing config for screenId: ${config.screenId}`);
    addConfigMessage(`📋 Raw config keys: ${Object.keys(config).join(', ')}`);
    
    if (config.frameConfig) {
      addConfigMessage(`📋 frameConfig keys: ${Object.keys(config.frameConfig).join(', ')}`);
      if (config.frameConfig.frameConfig) {
        addConfigMessage(`📋 nested frameConfig keys: ${Object.keys(config.frameConfig.frameConfig).join(', ')}`);
        if (config.frameConfig.frameConfig.rive) {
          addConfigMessage(`📋 rive keys: ${Object.keys(config.frameConfig.frameConfig.rive).join(', ')}`);
        }
      }
    }
    
    setRiveConfig(config);
    await processRiveFileData(config);
    extractDisplayElements(config);
    
    setIsConfigured(true);
    // DON'T auto-hide debug when configured - let user decide
    addConfigMessage("✅ Configuration complete!");
  };

  // Process incoming sensor data
  const processSensorData = (sensorPayload: SensorPayload) => {
    if (!riveConfig) {
      addDebugMessage("⚠️ No config loaded, ignoring sensor data");
      return;
    }
    
    if (sensorPayload.screenId !== riveConfig.screenId) {
      addDebugMessage(`⚠️ ScreenId mismatch: ${sensorPayload.screenId} vs ${riveConfig.screenId}`);
      return;
    }

    addDebugMessage(`📊 Processing sensors: ${Object.keys(sensorPayload.sensors).join(', ')}`);
    setCurrentSensorData(sensorPayload.sensors);
    
    // Update display elements with new sensor values
    setDisplayElements(prev => 
      prev.map(element => {
        if (element.type === 'sensor' && element.sensorTag) {
          const sensorData = sensorPayload.sensors[element.sensorTag];
          if (sensorData) {
            return {
              ...element,
              currentValue: sensorData.value.toString(),
              currentUnit: sensorData.unit,
            };
          }
        }
        return element;
      })
    );
  };

  // IPC event listeners
  useEffect(() => {
    addDebugMessage("🔌 Setting up IPC listeners...");
    
    if (!window.ipcRenderer) {
      addDebugMessage("❌ No ipcRenderer available");
      return;
    }

    const handleRiveConfig = (_event: any, data: RiveConfig) => {
      addDebugMessage("📋 Received rive-config event");
      processConfig(data);
    };

    const handleSensorData = (_event: any, data: SensorPayload) => {
      processSensorData(data);
    };

    // Fallback: also listen to display:json events
    const handleDisplayJson = (_event: any, data: any) => {
      if (data.type === 'rive_config') {
        addDebugMessage("📋 Received rive_config via display:json");
        processConfig(data);
      } else if (data.type === 'rive_sensor') {
        processSensorData(data);
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
  }, [riveConfig]);

  // Set up Rive - Fixed useRive options type
  const riveOptions = useMemo(() => ({
    src: riveFileBlob || '',
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoad: () => {
      addConfigMessage(`✅ Rive loaded successfully!`);
      // Fixed: Check if rive has artboardNames property
      if (rive && 'artboardNames' in rive && Array.isArray(rive.artboardNames)) {
        addConfigMessage(`🎨 Artboards: ${rive.artboardNames.join(', ')}`);
      } else {
        addConfigMessage(`🎨 Artboards: none or not available`);
      }
      if (rive && rive.stateMachineNames?.length > 0) {
        addConfigMessage(`🎮 State machines: ${rive.stateMachineNames.join(', ')}`);
      } else {
        addConfigMessage(`⚠️ No state machines found`);
      }
    },
    onLoadError: (error: any) => {
      addConfigMessage(`❌ Rive load error: ${error}`);
      addConfigMessage(`🔍 Attempted to load: ${riveFileBlob}`);
      addConfigMessage(`🔍 File size was: 634 bytes (seems small for Rive file)`);
    },
  }), [riveFileBlob]);

  const { rive, RiveComponent } = useRive(riveOptions);

  // Get state machine inputs
  const stateMachineInputs = useMemo(() => {
    if (!rive) return {};
    
    try {
      // Try to get state machine from config or use first available
      const configStateMachine = riveConfig?.frameConfig?.frameConfig?.rive?.settings?.stateMachine || 
                                 riveConfig?.frameConfig?.rive?.settings?.stateMachine;
      
      const stateMachine = configStateMachine || rive.stateMachineNames?.[0];
      
      if (!stateMachine) return {};
      
      const inputs = rive.stateMachineInputs(stateMachine);
      const inputMap: Record<string, any> = {};
      
      inputs.forEach((input: any) => {
        inputMap[input.name] = input;
      });
      
      if (Object.keys(inputMap).length > 0) {
        addDebugMessage(`🎛️ Rive inputs: ${Object.keys(inputMap).join(', ')}`);
      }
      
      return inputMap;
    } catch (error) {
      addDebugMessage(`⚠️ Error getting state machine inputs: ${error}`);
      return {};
    }
  }, [rive, riveConfig]);

  // Update Rive inputs when sensor data changes
  useEffect(() => {
    if (!rive || Object.keys(stateMachineInputs).length === 0 || Object.keys(currentSensorData).length === 0) return;

    try {
      Object.entries(currentSensorData).forEach(([sensorTag, sensorData]) => {
        const input = stateMachineInputs[sensorTag];
        if (input && input.type === StateMachineInputType.Number) {
          input.value = Number(sensorData.value) || 0;
          addDebugMessage(`🔄 Updated Rive "${sensorTag}" = ${sensorData.value}`);
        }
      });
    } catch (error) {
      addDebugMessage(`⚠️ Error updating Rive inputs: ${error}`);
    }
  }, [rive, stateMachineInputs, currentSensorData]);

  // Render overlay elements
  const renderOverlayElements = () => {
    if (!riveConfig) return null;

    return displayElements.map((element) => {
      let content = '';
      let textColor = element.properties.textColor || element.properties.color || '#929e00';
      
      if (element.type === 'sensor' && element.sensorTag) {
        const sensorData = currentSensorData[element.sensorTag];
        const value = sensorData?.value?.toString() || element.properties.placeholderValue || '--';
        const unit = sensorData?.unit || element.properties.placeholderUnit || '';
        const showUnit = element.properties.showUnit !== false;
        
        content = showUnit && unit ? `${value} ${unit}` : value;
      } else if (element.type === 'text') {
        content = element.properties.text || '';
      }

      const fontSize = element.properties.fontSize || 32;
      const fontFamily = element.properties.fontFamily || 'Orbitron';
      const fontWeight = element.properties.fontWeight || '900';
      const textAlign = element.properties.textAlign || 'left';

      return (
        <div
          key={element.id}
          style={{
            position: 'absolute',
            left: element.position.x,
            top: element.position.y,
            width: element.position.width,
            height: element.position.height,
            fontSize: `${fontSize}px`,
            fontFamily: `'${fontFamily}', sans-serif`,
            color: textColor,
            fontWeight: fontWeight,
            textShadow: '0 0 6px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: textAlign === 'center' ? 'center' : 
                           textAlign === 'right' ? 'flex-end' : 'flex-start',
            zIndex: element.properties.zIndex || 10,
          }}
        >
          {content}
        </div>
      );
    });
  };

  // Show debug panel if not configured or in development
  if (showDebug || !isConfigured) {
    const canvasConfig = riveConfig ? getCanvasConfig(riveConfig) : null;
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        color: '#fff',
        padding: '20px',
        fontFamily: 'monospace',
        fontSize: '12px',
        overflow: 'auto',
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#0ff', margin: '0 0 10px 0' }}>🛠 SensorTest Debug Panel</h2>
          <div>Status: {isConfigured ? '✅ Configured' : '⏳ Waiting for config'}</div>
          <div>Rive File: {riveFileBlob ? '✅ Loaded' : '❌ None'}</div>
          <div>Canvas: {canvasConfig ? `${canvasConfig.width}×${canvasConfig.height}` : 'Unknown'}</div>
          <div>Elements: {displayElements.length}</div>
          <div>Sensors: {Object.keys(currentSensorData).length}</div>
          <div>IPC: {window.ipcRenderer ? '✅' : '❌'}</div>
          <div>Rive Inputs: {Object.keys(stateMachineInputs).length}</div>
        </div>

        <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#0f0', margin: '0 0 10px 0' }}>📊 Sensor Log</h3>
            <div style={{ 
              height: '200px', 
              overflow: 'auto', 
              backgroundColor: '#111', 
              padding: '10px',
              border: '1px solid #333',
              borderRadius: '4px'
            }}>
              {debugMessages.map((msg, i) => (
                <div key={i} style={{ marginBottom: '2px', fontSize: '11px' }}>{msg}</div>
              ))}
            </div>
          </div>
          
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#ff0', margin: '0 0 10px 0' }}>📋 Config Log</h3>
            <div style={{ 
              height: '200px', 
              overflow: 'auto', 
              backgroundColor: '#111', 
              padding: '10px',
              border: '1px solid #333',
              borderRadius: '4px'
            }}>
              {configMessages.map((msg, i) => (
                <div key={i} style={{ marginBottom: '2px', fontSize: '11px' }}>{msg}</div>
              ))}
            </div>
          </div>
        </div>

        {Object.keys(currentSensorData).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#ff0', margin: '0 0 10px 0' }}>📊 Current Sensor Data</h3>
            <div style={{ backgroundColor: '#111', padding: '10px', borderRadius: '4px' }}>
              {Object.entries(currentSensorData).map(([key, data]: [string, any]) => (
                <div key={key} style={{ marginBottom: '5px' }}>
                  <span style={{ color: '#0ff' }}>{key}:</span> {data.value} {data.unit}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => setShowDebug(false)}
            style={{ 
              backgroundColor: '#333', 
              color: '#fff', 
              border: '1px solid #666', 
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
            disabled={!isConfigured}
          >
            {isConfigured ? 'Hide Debug' : 'Waiting for Config...'}
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              backgroundColor: '#666', 
              color: '#fff', 
              border: '1px solid #999', 
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  // Main visualization view
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      backgroundColor: '#000',
      overflow: 'hidden',
      cursor: 'none',
    }}>
      {/* Rive animation */}
      {riveFileBlob && (
        <RiveComponent style={{ width: '100%', height: '100%' }} />
      )}

      {/* Overlay elements */}
      {renderOverlayElements()}

      {/* Debug button - always visible in top-left corner */}
      <button
        onClick={() => setShowDebug(true)}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '5px 10px',
          fontSize: '12px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: '#fff',
          border: '1px solid #666',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 1000,
        }}
      >
        Debug
      </button>

      {/* Debug info */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          fontSize: '10px',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}
      >
        {riveConfig?.screenId} | E:{displayElements.length} | S:{Object.keys(currentSensorData).length}
        <br />
        Rive: {riveFileBlob ? '✅' : '❌'} | Click Debug button
      </div>
    </div>
  );
}