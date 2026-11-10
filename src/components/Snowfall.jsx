import { useMemo } from 'react'

/** 입장 화면의 내리는 눈 (CSS 애니메이션) */
export default function Snowfall({ count = 60 }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 8 + Math.random() * 12,
        delay: -Math.random() * 20,
        drift: (Math.random() - 0.5) * 80,
        opacity: 0.4 + Math.random() * 0.6,
      })),
    [count],
  )
  return (
    <div className="snowfall" aria-hidden="true">
      {flakes.map((f) => (
        <i
          key={f.id}
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            opacity: f.opacity,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            '--drift': `${f.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
