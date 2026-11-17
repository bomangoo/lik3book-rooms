import { useEffect, useState } from 'react'
import { CHARACTER_MAP } from '../game/characters.js'
import { findItem } from '../content/library.js'
import CharacterPreview from './CharacterPreview.jsx'
import PixelIcon from './PixelIcon.jsx'

export function activityText(a) {
  if (!a) return '서재를 둘러보는 중'
  if (a.kind === 'read') return `「${a.title}」 읽는 중`
  if (a.kind === 'think') return '조용히 사색하는 중'
  return ''
}

/**
 * 함께 있는 사람들
 * ↑↓ 사람 고르기 · ←→ 할 일 고르기 · Space 하기 · Esc 닫기
 */
export default function PeopleModal({ people, initialId, online, onWave, onOpenItem, onTalk, onClose }) {
  const others = people.filter((p) => !p.me)
  const [sel, setSel] = useState(() => Math.max(0, others.findIndex((p) => p.id === initialId)))
  const [act, setAct] = useState(0)
  const person = others[sel]
  const item = person?.activity?.kind === 'read' ? findItem(person.activity.item) : null
  const actions = person
    ? [
        { id: 'wave', icon: 'wave', label: '인사하기', run: () => onWave(person) },
        { id: 'talk', icon: 'chat', label: '말 걸기', run: () => onTalk(person) },
        item ? { id: 'read', icon: 'book', label: '같은 책 펼치기', run: () => onOpenItem(item) } : null,
      ].filter(Boolean)
    : []

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat && (e.key === ' ' || e.key === 'Enter')) return
      if (e.key === 'ArrowDown') setSel((s) => Math.min(others.length - 1, s + 1))
      else if (e.key === 'ArrowUp') setSel((s) => Math.max(0, s - 1))
      else if (e.key === 'ArrowRight') setAct((a) => Math.min(actions.length - 1, a + 1))
      else if (e.key === 'ArrowLeft') setAct((a) => Math.max(0, a - 1))
      else if (e.key === ' ' || e.key === 'Enter') actions[Math.min(act, actions.length - 1)]?.run()
      else if (e.key === 'Escape') onClose()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal people-modal" role="dialog" aria-modal="true" aria-label="함께 있는 사람">
        <button className="modal-close" onClick={onClose} aria-label="닫기">
          <PixelIcon name="close" size={20} />
        </button>
        <header className="sm-head">
          <PixelIcon name="people" size={28} />
          <div>
            <h2>함께 있는 사람</h2>
            <p>{online ? `나 말고 ${others.length}명이 이 방에 있어요` : '지금은 혼자 머무는 중이에요'}</p>
          </div>
        </header>

        {others.length === 0 ? (
          <p className="pm-empty">
            {online ? '아직 아무도 없어요. 누군가 들어오면 여기에서 인사할 수 있어요.' : '실시간 서버에 연결되면 같은 방에 있는 사람들과 이야기할 수 있어요.'}
          </p>
        ) : (
          <ul className="pm-list">
            {others.map((p, i) => (
              <li key={p.id}>
                <button
                  className={`pm-person${i === sel ? ' selected' : ''}`}
                  onClick={() => {
                    setSel(i)
                    setAct(0)
                  }}
                >
                  <CharacterPreview charId={p.charId} scale={2} animate={i === sel} />
                  <span className="pm-name">
                    <strong>{p.name}</strong>
                    <small>{CHARACTER_MAP[p.charId]?.name}</small>
                  </span>
                  <span className="pm-act">{activityText(p.activity)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {person && (
          <div className="pm-actions">
            {actions.map((a, i) => (
              <button key={a.id} className={i === act ? 'selected' : ''} onClick={a.run} onPointerMove={(e) => e.pointerType === 'mouse' && setAct(i)}>
                <PixelIcon name={a.icon} size={20} /> {a.label}
              </button>
            ))}
          </div>
        )}
        <p className="key-help">↑ ↓ 사람 · ← → 할 일 · Space 하기 · Esc 닫기</p>
      </div>
    </div>
  )
}
