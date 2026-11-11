import { useEffect, useMemo, useState } from 'react'
import { JOURNAL, JOURNAL_CATEGORIES } from '../content/library.js'
import PixelIcon from './PixelIcon.jsx'

const ALL = '전체'

/** 서재지기의 책상: 주제별 글 목록. ←→ 주제 · ↑↓ 글 · Space 읽기 · Esc 닫기 */
export default function JournalDesk({ onOpen, onClose }) {
  const tabs = [ALL, ...JOURNAL_CATEGORIES]
  const [tab, setTab] = useState(0)
  const [sel, setSel] = useState(0)
  const list = useMemo(() => (tab === 0 ? JOURNAL : JOURNAL.filter((j) => j.category === tabs[tab])), [tab]) // eslint-disable-line

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat && (e.key === ' ' || e.key === 'Enter')) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setTab((t) => (t + 1) % tabs.length)
        setSel(0)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setTab((t) => (t - 1 + tabs.length) % tabs.length)
        setSel(0)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSel((s) => Math.min(list.length - 1, s + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSel((s) => Math.max(0, s - 1))
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (list[sel]) onOpen(list[sel])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [list, sel, tabs.length, onOpen, onClose])

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal journal-modal" role="dialog" aria-modal="true" aria-label="서재지기의 책상">
        <button className="modal-close" onClick={onClose} aria-label="닫기">
          <PixelIcon name="close" size={20} />
        </button>
        <header className="sm-head">
          <PixelIcon name="journal" size={28} />
          <div>
            <h2>서재지기의 책상</h2>
            <p>서재지기가 남긴 일기와 이야기</p>
          </div>
        </header>
        <nav className="tabs">
          {tabs.map((t, i) => (
            <button key={t} className={i === tab ? 'active' : ''} onClick={() => { setTab(i); setSel(0) }}>
              {t}
            </button>
          ))}
        </nav>
        <ul className="journal-list">
          {list.length === 0 && <li className="empty">아직 글이 없어요</li>}
          {list.map((j, i) => (
            <li key={j.id}>
              <button className={i === sel ? 'selected' : ''} onClick={() => onOpen(j)} onMouseEnter={() => setSel(i)}>
                <span className="jl-cat">{j.category}</span>
                <strong>{j.title}</strong>
                <time>{j.date}</time>
              </button>
            </li>
          ))}
        </ul>
        <p className="key-help">← → 주제 · ↑ ↓ 글 고르기 · Space 읽기 · Esc 닫기</p>
      </div>
    </div>
  )
}
