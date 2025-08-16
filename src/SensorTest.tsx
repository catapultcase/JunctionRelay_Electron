import React from 'react';
import { useRive } from '@rive-app/react-webgl';

export default function SensorTest() {
  const { RiveComponent } = useRive({
    src: '/jr.riv',
    autoplay: true,
  });

  return (
    <div style={{ 
      width: '400px', 
      height: '1280px',
      backgroundColor: '#000'
    }}>
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  );
}