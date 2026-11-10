import { useEffect, useState } from 'react'
import { SHELVES, booksOfShelf } from '../content/books.js'

const THEMES = Object.keys(SHELVES)

/**
 * 책장(목록) ↔ 책 읽기 화면
 * @param {{ initialTheme?: string, initialBook?: any, onClose: () => void, onReadingChange?: (reading: boolean) => void }} props
 */
export default function BookModal({ initialTheme = 'poem', initialBook = null, onClose, onReadingChange }) {
  const [theme, setTheme] = useState(initialBook?.shelf || initialTheme)
  const [book, setBook] = useState(initialBook)
  const [fontScale, setFontScale] = useState(1)

  useEffect(() => {
    onReadingChange?.(!!book)
  }, [book, onReadingChange])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (book && !initialBook) setBook(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [book, initialBook, onClose])

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${book ? 'reader' : 'shelf-view'}`} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="닫기">✕</button>

        {!book && (
          <>
            <header className="shelf-head">
              <h2>{SHELVES[theme].title}</h2>
              <p>{SHELVES[theme].desc}</p>
            </header>
            <nav className="shelf-tabs" aria-label="책장">
              {THEMES.map((t) => (
                <button key={t} className={t === theme ? 'active' : ''} onClick={() => setTheme(t)}>
                  {SHELVES[t].title}
                </button>
              ))}
            </nav>
            <ul className="book-list">
              {booksOfShelf(theme).map((b) => (
                <li key={b.id}>
                  <button className="book-card" onClick={() => setBook(b)}>
                    <span className="spine" style={{ '--c': b.color }} aria-hidden="true" />
                    <span className="book-meta">
                      <strong>{b.title}</strong>
                      <em>{b.author}</em>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {book && (
          <article className="page" style={{ '--fs': fontScale }}>
            <div className="reader-tools">
              {!initialBook && (
                <button onClick={() => setBook(null)}>← 책장으로</button>
              )}
              <span className="spacer" />
              <button onClick={() => setFontScale((s) => Math.max(0.85, s - 0.1))} aria-label="글자 작게">가-</button>
              <button onClick={() => setFontScale((s) => Math.min(1.5, s + 0.1))} aria-label="글자 크게">가+</button>
            </div>
            <div className="page-scroll">
              <h2>{book.title}</h2>
              <p className="author">{book.author}</p>
              {book.original && <p className="original">{book.original}</p>}
              <div className="body">{book.body}</div>
              <p className="fin">❦</p>
            </div>
          </article>
        )}
      </div>
    </div>
  )
}
