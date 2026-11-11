import { useEffect, useState } from 'react'
import PixelIcon from './PixelIcon.jsx'
import { EMOTES, EMOTE_LABEL } from '../game/icons.js'

/**
 * 키보드 행동 메뉴 (Space 로 열림)
 * ↑↓ 고르기 · Space 선택 · Esc 닫기 / 감정 표현은 ←→
 */
export default function ActionMenu({ seated, onSelect, onClose }) {
  const items = [
    { id: 'read', icon: 'book', label: '책 읽기' },
    { id: 'think', icon: 'thought', label: '사색하기' },
    { id: 'chat', icon: 'chat', label: '말하기' },
    { id: 'emote', icon: 'heart', label: '감정 표현' },
    { id: 'journal', icon: 'journal', label: '서재지기의 글' },
    seated ? { id: 'stand', icon: 'stand', label: '일어나기' } : null,
  ].filter(Boolean)
  const [sel, setSel] = useState(0)
  const [emoteMode, setEmoteMode] = useState(false)
  const [emoteSel, setEmoteSel] = useState(0)

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key
      if (e.repeat && (k === ' ' || k === 'Enter')) return
      if (emoteMode) {
        if (k === 'ArrowRight' || k === 'ArrowDown') setEmoteSel((s) => (s + 1) % EMOTES.length)
        else if (k === 'ArrowLeft' || k === 'ArrowUp') setEmoteSel((s) => (s - 1 + EMOTES.length) % EMOTES.length)
        else if (k === ' ' || k === 'Enter') onSelect('emote', EMOTES[emoteSel])
        else if (k === 'Escape') setEmoteMode(false)
        else return
        e.preventDefault()
        return
      }
      if (k === 'ArrowDown' || k === 'ArrowRight') setSel((s) => (s + 1) % items.length)
      else if (k === 'ArrowUp' || k === 'ArrowLeft') setSel((s) => (s - 1 + items.length) % items.length)
      else if (k === ' ' || k === 'Enter') {
        if (items[sel].id === 'emote') setEmoteMode(true)
        else onSelect(items[sel].id)
      } else if (k === 'Escape') onClose()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="action-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="action-menu modal" role="menu" aria-label="행동">
        {!emoteMode ? (
          items.map((it, i) => (
            <button
              key={it.id}
              role="menuitem"
              className={i === sel ? 'selected' : ''}
              onMouseEnter={() => setSel(i)}
              onClick={() => (it.id === 'emote' ? setEmoteMode(true) : onSelect(it.id))}
            >
              <span className="cursor" aria-hidden="true">▶</span>
              <PixelIcon name={it.icon} size={22} />
              {it.label}
            </button>
          ))
        ) : (
          <div className="emote-pick">
            {EMOTES.map((em, i) => (
              <button
                key={em}
                className={i === emoteSel ? 'selected' : ''}
                onMouseEnter={() => setEmoteSel(i)}
                onClick={() => onSelect('emote', em)}
                aria-label={EMOTE_LABEL[em]}
              >
                <PixelIcon name={em} size={30} />
                <span>{EMOTE_LABEL[em]}</span>
              </button>
            ))}
          </div>
        )}
        <p className="key-help">{emoteMode ? '← → 고르기 · Space 표현 · Esc 뒤로' : '↑ ↓ 고르기 · Space 선택 · Esc 닫기'}</p>
      </div>
    </div>
  )
}
