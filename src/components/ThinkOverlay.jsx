import { useEffect, useState } from 'react'
import { MUSINGS } from '../content/musings.js'
import PixelIcon from './PixelIcon.jsx'

/** 사색 모드: 호흡 가이드 + 생각할 거리. → 다른 생각거리 · Space/Esc 마치기 */
export default function ThinkOverlay({ onClose }) {
  const [seconds, setSeconds] = useState(0)
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * MUSINGS.length))
  const musing = MUSINGS[idx]

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    const onKey = (e) => {
      if (e.repeat) return
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIdx((i) => (i + 1) % MUSINGS.length)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setIdx((i) => (i - 1 + MUSINGS.length) % MUSINGS.length)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const phase = seconds % 10 < 5 ? '들이쉬고…' : '내쉬고…'
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="think-overlay modal">
      <div className="think-center">
        <div className="breath" aria-hidden="true">
          <div className="breath-ring" />
          <div className="breath-core" />
        </div>
        <p className="breath-text">{phase}</p>
        <p className="musing" key={idx}>“{musing}”</p>
        <p className="think-timer">{mm}:{ss}</p>
        <div className="think-actions">
          <button onClick={() => setIdx((i) => (i + 1) % MUSINGS.length)}>
            <PixelIcon name="thought" size={18} /> 다른 생각거리
          </button>
          <button className="primary" onClick={onClose}>사색 마치기</button>
        </div>
        <p className="key-help">→ 다른 생각거리 · Space/Esc 마치기</p>
      </div>
    </div>
  )
}
