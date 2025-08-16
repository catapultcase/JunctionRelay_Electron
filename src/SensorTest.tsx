import { useMemo, useState, useEffect } from 'react'
import {
  useRive,
  useStateMachineInput,
  Layout,
  Fit,
  Alignment,
} from '@rive-app/react-canvas'

const STATE_MACHINE = "State Machine 1";
const INPUT_NAME = "Sensor1_Value"; // or Sensor1_Value1 if that's the actual name
const ARTBOARD = "Jr_Background";

export default function SensorTest() {
  // Resolve Rive file for both dev (http) and prod (file://)
  const riveSrc = useMemo(() => {
    if (import.meta.env.DEV) return '/jr.riv'
    return new URL('jr.riv', window.location.href).toString()
  }, [])

  const { rive, RiveComponent } = useRive({
    src: riveSrc,
    artboard: ARTBOARD,
    stateMachines: STATE_MACHINE,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoad: () => {
      console.log('✅ Rive loaded successfully!', { riveSrc })
    },
    onLoadError: (error) => {
      console.error('❌ Rive load error:', error, { riveSrc })
    },
  })

  const sensor = useStateMachineInput(rive, STATE_MACHINE, INPUT_NAME);
  const [displayVal, setDisplayVal] = useState(0);
  const [sensorName, setSensorName] = useState("CPU");
  const [sensorUnit, setSensorUnit] = useState("%");

  const setSensorValue = (val: number) => {
    if (!sensor) return;
    sensor.value = val;
    setDisplayVal(val);
  };

  // Listen for sensor data from main process
  useEffect(() => {
    if (!window.ipcRenderer) return;

    const handleSensorData = (_event: any, data: { value: number; unit: string; sensorName: string }) => {
      setSensorValue(data.value);
      setSensorName(data.sensorName);
      setSensorUnit(data.unit);
    };

    window.ipcRenderer.on("sensor-data", handleSensorData);

    return () => {
      window.ipcRenderer?.off("sensor-data", handleSensorData);
    };
  }, [sensor]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        backgroundColor: '#000',   // black background
        overflow: 'hidden',        // disable scrollbars
        cursor: 'none',            // hide cursor
      }}
    >
      {/* Rive animation - fullscreen */}
      <RiveComponent style={{ width: '100%', height: '100%' }} />

      {/* Overlay text - matching POC style */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: 120,
          fontSize: '32px',
          fontFamily: "'Orbitron', sans-serif",
          color: '#929E00',
          fontWeight: 'bold',
          textShadow: '0 0 6px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
        }}
      >
        {sensorName}: {displayVal}{sensorUnit}
      </div>
    </div>
  )
}