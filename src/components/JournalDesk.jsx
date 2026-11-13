import { useEffect, useMemo, useRef, useState } from 'react'
import { JOURNAL_CATEGORIES, postsOf, findItem } from '../content/library.js'
import { loadBookmark, loadLastRead } from '../lib/bookmark.js'
import PixelIcon from './PixelIcon.jsx'

/**
 * 서재지기의 책상
 * 1) 주제(카테고리) 고르기 → 2) 그 주제의 글 목록
 * ↑↓ 고르기 · Space 열기 · Esc(←) 뒤로/닫기
 */
export default function JournalDesk({ onOpen, onClose, initialCategory = null, initialId = null }) {
  const [cat, setCat] = useState(initialCategory)
  const posts = useMemo(() => (cat ? postsOf(cat) : []), [cat])
  const lastRead = useMemo(() => {
    const it = findItem(loadLastRead()?.id)
    return it?.kind === 'journal' ? it : null
  }, [])
  // 카테고리 화면: 맨 위 '이어 읽기' 카드 + 카테고리들
  const catRows = useMemo(() => [...(lastRead ? [{ resume: lastRead }] : []), ...JOURNAL_CATEGORIES], [lastRead])
  const [sel, setSel] = useState(() => {
    if (initialCategory && initialId) return Math.max(0, postsOf(initialCategory).findIndex((p) => p.id === initialId))
    return 0
  })
  const listRef = useRef(null)
  const byKey = useRef(!!initialId)

  const rows = cat ? posts : catRows
  const selected = rows[sel]

  // 키보드로 고른 항목이 늘 보이도록 (마우스·손가락으로 고를 때는 목록을 움직이지 않음)
  useEffect(() => {
    if (!byKey.current) return
    byKey.current = false
    listRef.current?.querySelector('.selected')?.scrollIntoView({ block: 'nearest' })
  }, [sel, cat])

  const choose = (row) => {
    if (!row) return
    if (row.resume) onOpen(row.resume)
    else if (row.name) {
      setCat(row.name)
      setSel(0)
      listRef.current?.scrollTo?.(0, 0)
    } else onOpen(row)
  }
  const back = () => {
    if (!cat) return onClose()
    const i = catRows.findIndex((r) => r.name === cat)
    setCat(null)
    setSel(Math.max(0, i))
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key.startsWith('Arrow')) byKey.current = true
      if (e.repeat && (e.key === ' ' || e.key === 'Enter')) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setSel((s) => Math.min(rows.length - 1, s + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSel((s) => Math.max(0, s - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (cat) back()
        else setSel((s) => Math.max(0, s - 1))
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        choose(selected)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // 마우스를 실제로 움직일 때만 고르기 (목록이 바뀌며 가만히 있던 커서 아래 항목이 골라지지 않게)
  const hover = (i) => (e) => e.pointerType === 'mouse' && sel !== i && setSel(i)
  const conf = JOURNAL_CATEGORIES.find((c) => c.name === cat)

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal journal-modal" role="dialog" aria-modal="true" aria-label="서재지기의 책상">
        <button className="modal-close" onClick={onClose} aria-label="닫기">
          <PixelIcon name="close" size={20} />
        </button>
        <header className="sm-head">
          {cat ? (
            <button className="back-btn" onClick={back} aria-label="주제 고르기로">
              <PixelIcon name="prev" size={22} />
            </button>
          ) : (
            <PixelIcon name="journal" size={28} />
          )}
          <div>
            <h2>{cat || '서재지기의 책상'}</h2>
            <p>{cat ? `${conf?.desc || ''}${conf?.desc ? ' · ' : ''}${posts.length}편${conf?.order === 'oldest' ? ' · 처음 글부터' : ''}` : '읽고 싶은 이야기를 골라 주세요'}</p>
          </div>
        </header>

        <ul className="journal-list" ref={listRef}>
          {!cat &&
            catRows.map((r, i) =>
              r.resume ? (
                <li key="resume">
                  <button className={`resume-card${i === sel ? ' selected' : ''}`} onClick={() => choose(r)} onPointerMove={hover(i)}>
                    <span className="jl-cat">
                      <PixelIcon name="bookmark" size={12} /> 이어 읽기
                    </span>
                    <time>{Math.round((loadBookmark(r.resume.id)?.progress || 0) * 100)}% 읽음</time>
                    <strong>{r.resume.title}</strong>
                  </button>
                </li>
              ) : (
                <li key={r.name}>
                  <button className={`cat-card${i === sel ? ' selected' : ''}`} onClick={() => choose(r)} onPointerMove={hover(i)}>
                    <span className="cat-name">{r.name}</span>
                    <span className="cat-count">{r.posts.length}편</span>
                    <span className="cat-desc">{r.desc || `최근 글 ${r.latest}`}</span>
                  </button>
                </li>
              ),
            )}
          {cat && posts.length === 0 && <li className="empty">아직 글이 없어요</li>}
          {cat &&
            posts.map((j, i) => {
              const mark = loadBookmark(j.id)
              return (
                <li key={j.id}>
                  <button className={i === sel ? 'selected' : ''} onClick={() => choose(j)} onPointerMove={hover(i)}>
                    <span className="jl-num">{conf?.order === 'oldest' ? `${i + 1}` : j.date}</span>
                    <time>{mark?.progress >= 0.99 ? '다 읽음' : mark?.pos ? `${Math.round(mark.progress * 100)}% 읽음` : conf?.order === 'oldest' ? j.date : ''}</time>
                    <strong>{j.title}</strong>
                  </button>
                </li>
              )
            })}
        </ul>
        <p className="key-help">{cat ? '↑ ↓ 글 고르기 · Space 읽기 · Esc 주제로' : '↑ ↓ 고르기 · Space 열기 · Esc 닫기'}</p>
      </div>
    </div>
  )
}
