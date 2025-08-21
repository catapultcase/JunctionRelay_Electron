import { useMemo, useState, useEffect, useRef } from 'react'
import {
  useRive,
  Layout,
  Fit,
  Alignment,
} from '@rive-app/react-canvas'

// Google Fonts loader utility
const loadGoogleFont = (fontFamily: string) => {
  if (!fontFamily || fontFamily.includes('system') || fontFamily.includes('sans-serif') ||
      document.querySelector(`link[href*="${fontFamily.replace(/\s+/g, '+')}"]`)) {
    return;
  }

  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
};

interface RiveSettings {
  fit: string;
  alignment: string;
  autoplay: boolean;
  loop: boolean;
  stateMachine?: string;
}

interface RiveInputRef {
  name: string;
  type: string;
  currentValue: any;
  ref: any;
}

interface RiveStateMachine {
  name: string;
  inputNames: string[];
  inputs: RiveInputRef[];
}

interface RiveDiscovery {
  machines: RiveStateMachine[];
  lastUpdate: string;
  metadata: {
    totalInputs: number;
    inputTypeBreakdown: Record<string, number>;
    discoveryAttempts: number;
    lastSuccessfulDiscovery: string;
  };
  activeStateMachine: string;
  globalInputMappings: Record<string, any>;
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
  discovery?: RiveDiscovery;
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

interface RiveConnection {
  machineName: string;
  inputName: string;
  inputType: string;
  currentValue: any;
  fullKey: string;
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
      riveConnections?: {
        availableInputs: RiveConnection[];
        mappedInputs: RiveConnection[];
        lastMappingUpdate: string;
      };
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
    riveConnections?: {
      availableInputs: RiveConnection[];
      mappedInputs: RiveConnection[];
      lastMappingUpdate: string;
    };
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
  riveConnections?: {
    availableInputs: RiveConnection[];
    mappedInputs: RiveConnection[];
    lastMappingUpdate: string;
  };
}

export default function SensorTest() {
  // Core state
  const [riveConfig, setRiveConfig] = useState<RiveConfig | null>(null);
  const [displayElements, setDisplayElements] = useState<DisplayElement[]>([]);
  const [currentSensorData, setCurrentSensorData] = useState<Record<string, any>>({});
  const [riveFileBlob, setRiveFileBlob] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Rive state machine mappings - maps sensor tags to Rive inputs
  const [sensorToRiveMap, setSensorToRiveMap] = useState<Record<string, string[]>>({});

  // Check if we're in debug mode from URL params
  const isDebugMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("debug") === "true";
  }, []);

  // Debug state - only used in debug mode
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [configMessages, setConfigMessages] = useState<string[]>([]);

  // State machine input refs for direct control
  const stateMachineInputRefs = useRef<Record<string, any>>({});

  // Debug helpers - only active in debug mode
  const addDebugMessage = (message: string) => {
    if (isDebugMode) {
      console.log(`[SensorTest] ${message}`);
      setDebugMessages(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
    }
  };

  const addConfigMessage = (message: string) => {
    if (isDebugMode) {
      console.log(`[SensorTest-Config] ${message}`);
      setConfigMessages(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
    }
  };

  // Load Google Fonts when elements change
  useEffect(() => {
    const fontsToLoad = new Set<string>();

    displayElements.forEach(element => {
      const fontFamily = element.properties.fontFamily;
      if (fontFamily && fontFamily !== 'Inter' && !fontFamily.includes('system')) {
        fontsToLoad.add(fontFamily);
      }
    });

    fontsToLoad.forEach(loadGoogleFont);
  }, [displayElements]);

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
    addConfigMessage("📁 Starting Rive file processing...");
    
    const riveConfig = config.frameConfig?.frameConfig?.rive || config.frameConfig?.rive;
    
    if (isDebugMode && riveConfig) {
      addConfigMessage(`📁 Rive config found: ${riveConfig ? 'Yes' : 'No'}`);
      addConfigMessage(`📁 Rive config keys: ${Object.keys(riveConfig).join(', ')}`);
      addConfigMessage(`📁 fileUrl: ${riveConfig.fileUrl || 'None'}`);
      addConfigMessage(`📁 file: ${riveConfig.file || 'None'}`);
      addConfigMessage(`📁 embedded: ${riveConfig.embedded || 'None'}`);
      addConfigMessage(`📁 fileData length: ${riveConfig.fileData?.length || 0}`);
      
      if (riveConfig.discovery) {
        addConfigMessage(`🎮 Discovery found: ${riveConfig.discovery.machines.length} machines`);
        riveConfig.discovery.machines.forEach(machine => {
          addConfigMessage(`  🎯 ${machine.name}: ${machine.inputs.length} inputs`);
          machine.inputs.forEach(input => {
            addConfigMessage(`    📊 ${input.name} (${input.type}): ${input.currentValue}`);
          });
        });
      }
    }
    
    if (riveConfig?.fileUrl) {
      try {
        addConfigMessage(`📥 Starting download from: ${riveConfig.fileUrl}`);
        
        const startTime = Date.now();
        const response = await fetch(riveConfig.fileUrl);
        const fetchTime = Date.now() - startTime;
        
        addConfigMessage(`📥 Fetch completed in ${fetchTime}ms, status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const totalTime = Date.now() - startTime;
        
        addConfigMessage(`📥 Blob created: ${blob.size} bytes, total time: ${totalTime}ms`);
        
        if (isDebugMode && blob.size < 10000) {
          addConfigMessage(`⚠️ File appears small - checking first few bytes as text...`);
          const text = await blob.slice(0, Math.min(blob.size, 200)).text();
          addConfigMessage(`📄 First 200 chars: ${text}`);
        }
        
        const blobUrl = URL.createObjectURL(blob);
        setRiveFileBlob(blobUrl);
        
        addConfigMessage(`✅ SUCCESS: Rive file downloaded and blob URL created`);
        
        return blobUrl;
      } catch (error) {
        addConfigMessage(`❌ DOWNLOAD FAILED: ${error}`);
        return null;
      }
    } else if (riveConfig?.fileData && riveConfig?.embedded) {
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
      const fileUrl = `/api/frameengine/rive-files/${riveConfig.file}/content`;
      setRiveFileBlob(fileUrl);
      addConfigMessage(`🔗 Using relative file: ${fileUrl}`);
      return fileUrl;
    } else if (config.riveFile) {
      const fileUrl = `/api/frameengine/rive-files/${config.riveFile}/content`;
      setRiveFileBlob(fileUrl);
      addConfigMessage(`🔗 Using top-level file: ${fileUrl}`);
      return fileUrl;
    } else {
      const legacyUrl = '/jr.riv';
      setRiveFileBlob(legacyUrl);
      addConfigMessage(`🔗 Using fallback: ${legacyUrl}`);
      return legacyUrl;
    }
  };

  // Extract display elements from config
  const extractDisplayElements = (config: RiveConfig) => {
    const elements = config.frameConfig?.frameElements || config.frameElements || [];
    
    const displayElements: DisplayElement[] = elements.map(element => ({
      id: element.id,
      type: element.type as 'sensor' | 'text',
      position: element.position,
      properties: element.properties,
      sensorTag: element.properties.sensorTag,
      text: element.properties.text,
      riveConnections: element.riveConnections,
    }));
    
    const sensorCount = displayElements.filter(e => e.type === 'sensor').length;
    const textCount = displayElements.filter(e => e.type === 'text').length;
    
    addDebugMessage(`📋 Extracted ${sensorCount} sensors, ${textCount} text elements`);
    setDisplayElements(displayElements);
    
    return displayElements;
  };

  // Build sensor tag to Rive input mapping from config
  const buildSensorToRiveMapping = (config: RiveConfig) => {
    const mapping: Record<string, string[]> = {};
    
    const riveConfig = config.frameConfig?.frameConfig?.rive || config.frameConfig?.rive;
    const discovery = riveConfig?.discovery;
    
    if (discovery) {
      addConfigMessage(`🔗 Building sensor-to-Rive mappings from discovery data`);
      
      const allRiveInputs: string[] = [];
      discovery.machines.forEach(machine => {
        machine.inputs.forEach(input => {
          const fullKey = `${machine.name}.${input.name}`;
          allRiveInputs.push(fullKey);
          addConfigMessage(`  📊 Available Rive input: ${fullKey} (${input.type})`);
        });
      });
      
      const elements = config.frameConfig?.frameElements || config.frameElements || [];
      elements.forEach(element => {
        if (element.properties.sensorTag && element.riveConnections?.availableInputs) {
          const sensorTag = element.properties.sensorTag;
          const riveInputs: string[] = [];
          
          element.riveConnections.availableInputs.forEach(connection => {
            const fullKey = connection.fullKey || `${connection.machineName}.${connection.inputName}`;
            riveInputs.push(fullKey);
            addConfigMessage(`  🔗 ${sensorTag} -> ${fullKey}`);
          });
          
          if (riveInputs.length > 0) {
            mapping[sensorTag] = riveInputs;
          }
        }
      });
    }
    
    addConfigMessage(`🔗 Built mappings for ${Object.keys(mapping).length} sensor tags`);
    setSensorToRiveMap(mapping);
    return mapping;
  };

  // Process incoming config
  const processConfig = async (config: RiveConfig) => {
    addConfigMessage(`📥 Processing config for screenId: ${config.screenId}`);
    addConfigMessage(`📋 Raw config keys: ${Object.keys(config).join(', ')}`);
    
    setRiveConfig(config);
    await processRiveFileData(config);
    extractDisplayElements(config);
    buildSensorToRiveMapping(config);
    
    setIsConfigured(true);
    addConfigMessage("✅ Configuration complete!");
  };

  // Process incoming sensor data with enhanced comma-separated sensor tag support
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
    
    // Expand comma-separated sensor tags
    const expandedSensorData: Record<string, any> = {};
    
    Object.entries(sensorPayload.sensors).forEach(([sensorKey, sensorData]) => {
      const sensorTags = sensorKey.split(',').map(tag => tag.trim());
      sensorTags.forEach(tag => {
        expandedSensorData[tag] = sensorData;
        addDebugMessage(`📊 Expanded sensor: ${tag} = ${sensorData.value} ${sensorData.unit}`);
      });
    });
    
    setCurrentSensorData(expandedSensorData);
    
    // Update display elements with new sensor values
    setDisplayElements(prev => 
      prev.map(element => {
        if (element.type === 'sensor' && element.sensorTag) {
          const sensorData = expandedSensorData[element.sensorTag];
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

    // Update Rive state machine inputs
    updateRiveInputsFromSensorData(expandedSensorData);
  };

  // Update Rive state machine inputs based on sensor data
  const updateRiveInputsFromSensorData = (sensorData: Record<string, any>) => {
    if (!rive || Object.keys(stateMachineInputRefs.current).length === 0) {
      addDebugMessage("⚠️ Rive not ready or no state machine inputs available");
      return;
    }

    Object.entries(sensorData).forEach(([sensorTag, data]) => {
      const riveInputKeys = sensorToRiveMap[sensorTag] || [];
      
      riveInputKeys.forEach(riveInputKey => {
        const inputRef = stateMachineInputRefs.current[riveInputKey];
        if (inputRef) {
          try {
            const newValue = Number(data.value) || 0;
            inputRef.value = newValue;
            addDebugMessage(`🔄 Updated Rive "${riveInputKey}" = ${newValue} (from sensor "${sensorTag}")`);
          } catch (error) {
            addDebugMessage(`⚠️ Error updating Rive input "${riveInputKey}": ${error}`);
          }
        }
      });

      const directInputRef = stateMachineInputRefs.current[sensorTag];
      if (directInputRef) {
        try {
          const newValue = Number(data.value) || 0;
          directInputRef.value = newValue;
          addDebugMessage(`🔄 Updated Rive "${sensorTag}" = ${newValue} (direct match)`);
        } catch (error) {
          addDebugMessage(`⚠️ Error updating Rive input "${sensorTag}": ${error}`);
        }
      }
    });
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
  }, [riveConfig, sensorToRiveMap]);

  // Set up Rive
  const riveOptions = useMemo(() => ({
    src: riveFileBlob || '',
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoad: () => {
      addConfigMessage(`✅ Rive loaded successfully!`);
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
      addConfigMessage(`📄 Attempted to load: ${riveFileBlob}`);
    },
  }), [riveFileBlob]);

  const { rive, RiveComponent } = useRive(riveOptions);

  // Build state machine input references when Rive loads
  useEffect(() => {
    if (!rive) return;

    const buildInputRefs = () => {
      const inputRefs: Record<string, any> = {};
      
      try {
        const stateMachineNames = rive.stateMachineNames || [];
        
        stateMachineNames.forEach(machineName => {
          try {
            rive.play(machineName);
            
            const inputs = rive.stateMachineInputs(machineName) || [];
            
            inputs.forEach((input: any) => {
              if (input && input.name) {
                const fullKey = `${machineName}.${input.name}`;
                inputRefs[fullKey] = input;
                inputRefs[input.name] = input;
                
                addDebugMessage(`🎛️ Registered Rive input: ${fullKey} (type: ${input.type})`);
              }
            });
          } catch (error) {
            addDebugMessage(`⚠️ Error processing state machine "${machineName}": ${error}`);
          }
        });
        
        stateMachineInputRefs.current = inputRefs;
        addConfigMessage(`🎛️ Built ${Object.keys(inputRefs).length} input references`);
        
        if (Object.keys(currentSensorData).length > 0) {
          updateRiveInputsFromSensorData(currentSensorData);
        }
      } catch (error) {
        addConfigMessage(`❌ Error building state machine inputs: ${error}`);
      }
    };

    const timer = setTimeout(buildInputRefs, 100);
    return () => clearTimeout(timer);
  }, [rive, currentSensorData]);

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

      if (fontFamily && fontFamily !== 'Inter' && !fontFamily.includes('system')) {
        loadGoogleFont(fontFamily);
      }

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
            fontFamily: `"${fontFamily}", "Orbitron", "Courier New", monospace, sans-serif`,
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

  // Show debug panel only in debug mode or if not configured
  if (isDebugMode) {
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
          <div>Rive Inputs: {Object.keys(stateMachineInputRefs.current).length}</div>
          <div>Sensor-Rive Mappings: {Object.keys(sensorToRiveMap).length}</div>
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

        {Object.keys(sensorToRiveMap).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#f0f', margin: '0 0 10px 0' }}>🔗 Sensor-to-Rive Mappings</h3>
            <div style={{ backgroundColor: '#111', padding: '10px', borderRadius: '4px' }}>
              {Object.entries(sensorToRiveMap).map(([sensorTag, riveInputs]) => (
                <div key={sensorTag} style={{ marginBottom: '5px' }}>
                  <span style={{ color: '#0ff' }}>{sensorTag}:</span> {riveInputs.join(', ')}
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(stateMachineInputRefs.current).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#0f0', margin: '0 0 10px 0' }}>🎛️ Available Rive Inputs</h3>
            <div style={{ backgroundColor: '#111', padding: '10px', borderRadius: '4px', maxHeight: '150px', overflow: 'auto' }}>
              {Object.keys(stateMachineInputRefs.current).map(inputKey => (
                <div key={inputKey} style={{ marginBottom: '2px', fontSize: '11px' }}>
                  <span style={{ color: '#0f0' }}>{inputKey}</span>
                  {stateMachineInputRefs.current[inputKey].value !== undefined && (
                    <span style={{ color: '#999' }}> = {stateMachineInputRefs.current[inputKey].value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
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

  // Show loading screen if not configured
  if (!isConfigured) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: '18px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '20px', fontSize: '48px' }}>⏳</div>
          <div>Waiting for configuration...</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            IPC: {window.ipcRenderer ? '✅ Connected' : '❌ Not Available'}
          </div>
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
    </div>
  );
}