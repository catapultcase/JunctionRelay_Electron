import { useMemo } from 'react'
import { useRive } from '@rive-app/react-canvas'

export default function SensorTest() {
  // Resolve Rive file for both dev (http) and prod (file://)
  const riveSrc = useMemo(() => {
    if (import.meta.env.DEV) return '/jr.riv'
    return new URL('jr.riv', window.location.href).toString()
  }, [])

  const { RiveComponent } = useRive({
    src: riveSrc,
    autoplay: true,
    onLoad: () => {
      console.log('✅ Rive loaded successfully on Pi!', { riveSrc })
    },
    onLoadError: (error) => {
      console.error('❌ Rive load error on Pi:', error, { riveSrc })
    },
  })

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
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
