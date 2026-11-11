import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { paginate, pageOf, blockClass, esc } from '../lib/paginate.js'
import { loadBookmark, saveBookmark, clearBookmark } from '../lib/bookmark.js'
import { playPageFlip, preloadPageFlip } from '../audio/ambience.js'
import PixelIcon from './PixelIcon.jsx'

const FLIP_MS = 620
const ASPECT = 0.7 // 쪽 가로/세로

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    let t = 0
    const on = () => {
      clearTimeout(t)
      t = setTimeout(() => setVp({ w: window.innerWidth, h: window.innerHeight }), 120)
    }
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

/** 화면 크기 → 펼침(두 쪽) / 한 쪽 보기, 쪽 크기 */
function layoutFor({ w, h }) {
  const availH = h - 132
  const spread = w >= 820 && w / h > 1.05
  if (spread) {
    const pageH = Math.min(availH, ((w - 64) / 2) / ASPECT, 760)
    return { spread, pageW: Math.round(pageH * ASPECT), pageH: Math.round(pageH) }
  }
  const pageH = Math.min(availH, (w - 24) / ASPECT, 820)
  return { spread, pageW: Math.round(pageH * ASPECT), pageH: Math.round(pageH) }
}

function Page({ page, item, number, side }) {
  if (!page) return <div className={`page blank ${side || ''}`} />
  const cls = `page ${side || ''} ${item.kind === 'journal' ? 'journal' : ''}`
  switch (page.kind) {
    case 'cover':
      return (
        <div className={`${cls} cover`} style={{ '--cover': item.color }}>
          {item.cover ? (
            <img src={item.cover} alt={`${item.title} 표지`} draggable={false} />
          ) : (
            <div className="cover-plain">
              <strong>{item.title}</strong>
              <span>{item.author}</span>
            </div>
          )}
          <div className="cover-sheen" />
        </div>
      )
    case 'endpaper':
      return (
        <div className={`${cls} endpaper`}>
          <img src={page.src} alt="" draggable={false} />
        </div>
      )
    case 'title':
      return (
        <div className={`${cls} title-page`}>
          <div className="tp-inner">
            {item.subtitle && <p className="tp-sub">{item.subtitle}</p>}
            <h1>{item.title}</h1>
            {item.tagline && <p className="tp-tag">“{item.tagline}”</p>}
            <p className="tp-author">{item.author}</p>
            <p className="tp-pub">{item.publisher}</p>
          </div>
        </div>
      )
    case 'image':
      return (
        <div className={`${cls} image-page`}>
          <figure>
            <img src={page.src} alt={page.alt} draggable={false} />
            {page.alt && <figcaption>{page.alt}</figcaption>}
          </figure>
          {number != null && <span className="folio">{number}</span>}
        </div>
      )
    case 'end':
      return (
        <div className={`${cls} end-page`}>
          <p>❦</p>
          <p className="end-title">{item.title}</p>
          <p className="end-sub">{item.kind === 'journal' ? `${item.date} · 서재지기` : '끝까지 읽어 주셔서 고마워요'}</p>
        </div>
      )
    default:
      return (
        <div className={`${cls} text-page`}>
          <header className="running">{item.kind === 'journal' ? item.category : item.title}</header>
          <div className="page-body">
            {page.journalHead && (
              <div className="journal-head">
                <span>{item.category}</span>
                <h2>{item.title}</h2>
                <time>{item.date}</time>
              </div>
            )}
            {page.items.map((it, i) => {
              const Tag = it.type === 'h1' ? 'h2' : it.type === 'h2' ? 'h3' : it.type === 'quote' ? 'blockquote' : 'p'
              return (
                <Tag key={i} className={blockClass(it)}>
                  {it.text}
                </Tag>
              )
            })}
          </div>
          {number != null && <span className="folio">{number}</span>}
        </div>
      )
  }
}

/**
 * 한 장씩 넘기는 책
 * @param {{ item: any, onClose: () => void }} props item: 책 또는 서재지기 글
 */
export default function BookReader({ item, onClose }) {
  const vp = useViewport()
  const { spread, pageW, pageH } = layoutFor(vp)
  const measureRef = useRef(null)
  const [pages, setPages] = useState(null)
  const [view, setView] = useState(0)
  const [turn, setTurn] = useState(null) // {dir, from}
  const [toast, setToast] = useState(null)
  const posRef = useRef(loadBookmark(item.id)?.pos || null)
  const firstRef = useRef(true)
  const fs = Math.max(13, Math.min(19, pageW * 0.043))

  // 쪽 나누기 (화면 크기가 바뀌면 다시)
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const headHtml =
      item.kind === 'journal'
        ? `<div class="journal-head"><span>${esc(item.category)}</span><h2>${esc(item.title)}</h2><time>${esc(item.date)}</time></div>`
        : ''
    const body = paginate(item.blocks, el, { headHtml })
    const all = []
    if (item.kind === 'book') {
      all.push({ kind: 'cover' })
      if (item.endpaper) all.push({ kind: 'endpaper', src: item.endpaper })
      all.push({ kind: 'title' })
    }
    if (item.kind === 'journal') {
      if (body[0]?.kind === 'text') body[0].journalHead = true
      else body.unshift({ kind: 'text', items: [], start: { b: 0, o: 0 }, journalHead: true })
    }
    all.push(...body, { kind: 'end' })
    setPages(all)
  }, [item, pageW, pageH, fs])

  const coverOffset = pages?.[0]?.kind === 'cover' ? 1 : 0
  const viewCount = pages ? (spread ? Math.ceil((pages.length + coverOffset) / 2) : pages.length) : 0
  const viewPages = useCallback(
    (v) => {
      if (!pages) return {}
      if (!spread) return { right: pages[v] }
      const l = 2 * v - coverOffset
      return { left: pages[l] ?? null, right: pages[l + 1] ?? null, leftIdx: l, rightIdx: l + 1 }
    },
    [pages, spread, coverOffset],
  )
  const viewOfPage = useCallback((i) => (spread ? Math.floor((i + coverOffset) / 2) : i), [spread, coverOffset])

  // 책갈피 위치로 이동 (처음 열 때 / 쪽 나누기가 바뀔 때)
  useEffect(() => {
    if (!pages) return
    const idx = pageOf(pages, posRef.current)
    const v = idx >= 0 ? viewOfPage(idx) : 0
    setView(Math.min(v, viewCount - 1))
    if (firstRef.current) {
      firstRef.current = false
      if (idx > 0) setToast('책갈피에서 이어 읽어요')
    }
  }, [pages, viewOfPage, viewCount])

  // 쪽이 바뀔 때마다 책갈피 저장
  useEffect(() => {
    if (!pages || turn) return
    const { left, right } = viewPages(view)
    const pg = [left, right].find((p) => p?.start)
    if (pg) {
      posRef.current = pg.start
      saveBookmark(item.id, { pos: pg.start, progress: (view + 1) / viewCount })
    } else if (view === 0) {
      posRef.current = null
      clearBookmark(item.id)
    } else if (view === viewCount - 1) {
      saveBookmark(item.id, { pos: posRef.current, progress: 1 })
    }
  }, [view, pages, turn, viewPages, viewCount, item.id])

  useEffect(() => {
    preloadPageFlip()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const go = useCallback(
    (dir) => {
      if (turn || !pages) return
      const next = view + dir
      if (next < 0 || next >= viewCount) return
      playPageFlip()
      setTurn({ dir, from: view })
    },
    [turn, pages, view, viewCount],
  )

  const finishTurn = () => {
    if (!turn) return
    setView(turn.from + turn.dir)
    setTurn(null)
  }

  // 혹시 animationend 가 오지 않아도 넘김이 끝나도록
  useEffect(() => {
    if (!turn) return
    const t = setTimeout(finishTurn, FLIP_MS + 120)
    return () => clearTimeout(t)
  })

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat && (e.key === ' ' || e.key === 'Enter')) return
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  // 스와이프 & 탭
  const drag = useRef(null)
  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }
  const onPointerUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1)
      return
    }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const r = e.currentTarget.getBoundingClientRect()
      go(e.clientX - r.left > r.width / 2 ? 1 : -1)
    }
  }

  // 지금 그릴 장면 (넘기는 중이면 아래 깔린 쪽 + 넘어가는 장)
  const scene = useMemo(() => {
    if (!pages) return null
    if (!turn) return { base: viewPages(view) }
    const cur = viewPages(turn.from)
    const nxt = viewPages(turn.from + turn.dir)
    if (spread) {
      return turn.dir > 0
        ? { base: { left: cur.left, right: nxt.right, leftIdx: cur.leftIdx, rightIdx: nxt.rightIdx }, leaf: { front: cur.right, frontIdx: cur.rightIdx, back: nxt.left, backIdx: nxt.leftIdx } }
        : { base: { left: nxt.left, right: cur.right, leftIdx: nxt.leftIdx, rightIdx: cur.rightIdx }, leaf: { front: nxt.right, frontIdx: nxt.rightIdx, back: cur.left, backIdx: cur.leftIdx } }
    }
    return turn.dir > 0
      ? { base: { right: nxt.right }, leaf: { front: cur.right, back: null } }
      : { base: { right: cur.right }, leaf: { front: nxt.right, back: null } }
  }, [pages, turn, view, spread, viewPages])

  const numberOf = (idx) => {
    if (!pages || idx == null || idx < 0) return null
    const p = pages[idx]
    if (!p || (p.kind !== 'text' && p.kind !== 'image')) return null
    return idx + 1 - coverOffset
  }
  const singleIdx = (v) => v

  const isClosedCover = spread && !turn && view === 0 && coverOffset === 1
  const progress = viewCount > 1 ? view / (viewCount - 1) : 0
  const label = !pages ? '' : `${view + 1} / ${viewCount}`

  return (
    <div className="reader-overlay modal" role="dialog" aria-modal="true" aria-label={item.title}>
      <button className="reader-close" onClick={onClose} aria-label="닫기">
        <PixelIcon name="close" size={22} />
      </button>

      {/* 측정용 (보이지 않음) */}
      <div className={`page text-page measure ${item.kind === 'journal' ? 'journal' : ''}`} style={{ width: pageW, height: pageH, '--fs': `${fs}px` }} aria-hidden="true">
        <header className="running">.</header>
        <div className="page-body" ref={measureRef} />
        <span className="folio">0</span>
      </div>

      {pages && scene && (
        <div
          className={`book ${spread ? 'spread' : 'single'} ${isClosedCover ? 'closed' : ''}`}
          style={{ '--pw': `${pageW}px`, '--ph': `${pageH}px`, '--fs': `${fs}px`, '--flip': `${FLIP_MS}ms` }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {spread && (
            <div className="slot left">
              {scene.base.left !== undefined && <Page page={scene.base.left} item={item} side="left" number={numberOf(scene.base.leftIdx)} />}
            </div>
          )}
          <div className="slot right">
            <Page
              page={scene.base.right}
              item={item}
              side="right"
              number={numberOf(spread ? scene.base.rightIdx : turn ? null : singleIdx(view))}
            />
          </div>
          {scene.leaf && (
            <div className={`leaf ${turn.dir > 0 ? 'fwd' : 'bwd'}`} onAnimationEnd={finishTurn}>
              <div className="face front">
                <Page page={scene.leaf.front} item={item} side="right" number={numberOf(scene.leaf.frontIdx)} />
              </div>
              <div className="face back">
                <Page page={scene.leaf.back} item={item} side="left" number={numberOf(scene.leaf.backIdx)} />
              </div>
            </div>
          )}
          {!isClosedCover && <div className="gutter" aria-hidden="true" />}
          {posRef.current && <div className="ribbon" aria-hidden="true" />}
        </div>
      )}

      <div className="reader-bar">
        <button onClick={() => go(-1)} disabled={!pages || view === 0} aria-label="이전 쪽">
          <PixelIcon name="prev" size={22} />
        </button>
        <div className="reader-progress">
          <span className="reader-title">{item.title}</span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="reader-count">{label}</span>
        </div>
        <button onClick={() => go(1)} disabled={!pages || view >= viewCount - 1} aria-label="다음 쪽">
          <PixelIcon name="next" size={22} />
        </button>
      </div>

      {toast && (
        <div className="reader-toast">
          <PixelIcon name="bookmark" size={16} /> {toast}
          <button
            onClick={() => {
              posRef.current = null
              clearBookmark(item.id)
              setView(0)
              setToast(null)
            }}
          >
            처음부터
          </button>
        </div>
      )}
      <p className="reader-help">← → 넘기기 · Esc 닫기 · 읽던 곳은 자동으로 책갈피에 저장돼요</p>
    </div>
  )
}
