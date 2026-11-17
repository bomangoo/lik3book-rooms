import { useEffect, useRef, useState } from 'react'
import PixelIcon from './PixelIcon.jsx'

const FRESH_MS = 12000
const time = (ts) => new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

/**
 * 대화 기록
 * - 닫혀 있을 때: 최근 몇 줄을 채팅창 위에 잠깐 띄웠다가 흐려짐
 * - 열었을 때: 지난 대화 전체 (들어오고 나간 사람 포함)
 */
export default function ChatLog({ log, open, onClose }) {
  const listRef = useRef(null)
  const [, tick] = useState(0)

  // 새 줄이 오면 맨 아래로
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log, open])

  // 잠깐 띄운 줄이 사라지도록 다시 그리기
  useEffect(() => {
    if (open) return
    const t = setInterval(() => tick((n) => n + 1), 2000)
    return () => clearInterval(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) {
    const now = Date.now()
    const fresh = log.filter((m) => now - m.ts < FRESH_MS).slice(-3)
    if (!fresh.length) return null
    return (
      <div className="chatlog peek" aria-live="polite">
        {fresh.map((m) => (
          <Line key={m.key} m={m} fading={now - m.ts > FRESH_MS - 3000} />
        ))}
      </div>
    )
  }

  return (
    <div className="chatlog full modal" role="dialog" aria-label="대화 기록">
      <header>
        <PixelIcon name="chat" size={18} />
        <strong>대화</strong>
        <span className="cl-note">이 방에 있는 사람들과 나눈 이야기예요</span>
        <button className="cl-close" onClick={onClose} aria-label="닫기">
          <PixelIcon name="close" size={16} />
        </button>
      </header>
      <ul ref={listRef}>
        {log.length === 0 && <li className="cl-empty">아직 나눈 이야기가 없어요. 먼저 인사를 건네 보세요.</li>}
        {log.map((m) => (
          <Line key={m.key} m={m} withTime />
        ))}
      </ul>
    </div>
  )
}

function Line({ m, withTime, fading }) {
  if (m.system) {
    return (
      <li className={`cl-line system${fading ? ' fading' : ''}`}>
        {withTime && <time>{time(m.ts)}</time>}
        <span>{m.text}</span>
      </li>
    )
  }
  return (
    <li className={`cl-line${m.self ? ' self' : ''}${fading ? ' fading' : ''}`}>
      {withTime && <time>{time(m.ts)}</time>}
      <b>{m.name}</b>
      <span>{m.text}</span>
    </li>
  )
}
