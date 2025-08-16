import { useRive } from '@rive-app/react-canvas';

export default function SensorTest() {
  const { RiveComponent, rive } = useRive({
    src: '/jr.riv',
    autoplay: true,
    onLoad: () => {
      console.log('✅ Rive loaded successfully on Pi!');
    },
    onLoadError: (error) => {
      console.error('❌ Rive load error on Pi:', error);
    },
  });

  console.log('🔍 SensorTest rendering on Pi');
  console.log('🔍 Rive instance:', rive);

  return (
    <div style={{ 
      width: '400px', 
      height: '1280px',
      backgroundColor: '#ff0000', // Red background to confirm container is visible
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '16px'
    }}>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <div>🎨 Rive Debug Info</div>
        <div>Rive Loaded: {rive ? 'YES' : 'NO'}</div>
        <div>Canvas Renderer: ACTIVE</div>
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '80%',
        border: '2px solid white',
        backgroundColor: '#000'
      }}>
        <RiveComponent style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}