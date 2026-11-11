import { useEffect, useState } from 'react'
import { BOOKS } from '../content/library.js'
import { loadBookmark } from '../lib/bookmark.js'
import PixelIcon from './PixelIcon.jsx'

/** 책장: 표지가 서 있는 나무 선반. ←→ 고르기 · Space 펼치기 · Esc 닫기 */
export default function LibraryShelf({ onOpen, onClose }) {
  const [sel, setSel] = useState(0)

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat && (e.key === ' ' || e.key === 'Enter')) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setSel((s) => (s + 1) % BOOKS.length)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setSel((s) => (s - 1 + BOOKS.length) % BOOKS.length)
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (BOOKS[sel]) onOpen(BOOKS[sel])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, onOpen, onClose])

  const book = BOOKS[sel]
  const mark = book && loadBookmark(book.id)

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal shelf-modal" role="dialog" aria-modal="true" aria-label="책장">
        <button className="modal-close" onClick={onClose} aria-label="닫기">
          <PixelIcon name="close" size={20} />
        </button>
        <header className="sm-head">
          <PixelIcon name="shelf" size={28} />
          <div>
            <h2>라이크북 책장</h2>
            <p>마음에 드는 책을 골라 펼쳐 보세요</p>
          </div>
        </header>

        <div className="shelf-row">
          {BOOKS.map((b, i) => {
            const m = loadBookmark(b.id)
            return (
              <button
                key={b.id}
                className={`shelf-book${i === sel ? ' selected' : ''}`}
                onClick={() => (i === sel ? onOpen(b) : setSel(i))}
                onDoubleClick={() => onOpen(b)}
                aria-label={b.title}
              >
                <span className="shelf-cover" style={{ '--c': b.color }}>
                  {b.cover ? <img src={b.cover} alt="" draggable={false} /> : <em>{b.title}</em>}
                  {m?.pos && <span className="shelf-mark" title="책갈피" />}
                </span>
              </button>
            )
          })}
          <div className="shelf-plank" aria-hidden="true" />
        </div>

        {book && (
          <div className="shelf-detail">
            <div>
              <strong>{book.title}</strong>
              <span>{[book.subtitle, book.author].filter(Boolean).join(' · ')}</span>
              {mark?.pos && <em>책갈피 · {Math.round((mark.progress || 0) * 100)}% 읽음</em>}
            </div>
            <button className="primary-btn" onClick={() => onOpen(book)}>
              <PixelIcon name="book" size={18} /> {mark?.pos ? '이어 읽기' : '펼치기'}
            </button>
          </div>
        )}
        <p className="key-help">← → 고르기 · Space 펼치기 · Esc 닫기</p>
      </div>
    </div>
  )
}
