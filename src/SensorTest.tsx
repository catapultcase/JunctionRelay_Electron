import { useMemo } from 'react'
import { useRive } from '@rive-app/react-canvas'

export default function SensorTest() {
  // Resolve Rive file for both dev (http) and prod (file://)
  const riveSrc = useMemo(() => {
    // In dev, Vite serves from http://... so absolute works
    if (import.meta.env.DEV) return '/jr.riv'
    // In prod, index.html is file://.../dist/index.html; use relative
    return new URL('jr.riv', window.location.href).toString()
  }, [])

  const { RiveComponent, rive } = useRive({
    src: riveSrc,
    autoplay: true,
    onLoad: () => {
      console.log('✅ Rive loaded successfully on Pi!', { riveSrc })
    },
    onLoadError: (error) => {
      console.error('❌ Rive load error on Pi:', error, { riveSrc })
    },
  })

  console.log('🔍 SensorTest rendering on Pi; rive instance:', rive)

  return (
    <div
      style={{
        width: '400px',
        height: '1280px',
        backgroundColor: '#ff0000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '16px',
      }}
    >
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <div>🎨 Rive Debug Info</div>
        <div>Rive Loaded: {rive ? 'YES' : 'NO'}</div>
        <div>Canvas Renderer: ACTIVE</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>src: {riveSrc}</div>
      </div>

      <div
        style={{
          width: '100%',
          height: '80%',
          border: '2px solid white',
          backgroundColor: '#000',
        }}
      >
        <RiveComponent style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}
