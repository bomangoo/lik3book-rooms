import { useCallback, useEffect, useRef, useState } from 'react'
import { Game } from '../game/engine.js'
import { createConnection } from '../net/client.js'
import { randomBook, findItem, nextPost } from '../content/library.js'
import { loadLastRead, loadBookmark } from '../lib/bookmark.js'
import { EMOTES, EMOTE_LABEL } from '../game/icons.js'
import { startAmbience, stopAmbience, disposeAmbience } from '../audio/ambience.js'
import LibraryShelf from './LibraryShelf.jsx'
import JournalDesk from './JournalDesk.jsx'
import BookReader from './BookReader.jsx'
import ThinkOverlay from './ThinkOverlay.jsx'
import ActionMenu from './ActionMenu.jsx'
import ChatLog from './ChatLog.jsx'
import PeopleModal from './PeopleModal.jsx'
import CharacterPreview from './CharacterPreview.jsx'
import PixelIcon from './PixelIcon.jsx'

const CAPACITY = 5
const isTouch = () => window.matchMedia('(pointer: coarse)').matches

export default function LibraryRoom({ profile, onLeave }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const connRef = useRef(null)
  const [status, setStatus] = useState('connecting')
  const [roomNo, setRoomNo] = useState(null)
  const [roster, setRoster] = useState({})
  const [self, setSelf] = useState({ pose: 'stand', seated: false })
  // 화면 위에 열린 창: null | {type:'menu', seated} | {type:'shelf'} | {type:'journal'} | {type:'read', item, back}
  const [overlay, setOverlay] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [sound, setSound] = useState(false)
  const [chat, setChat] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [panel, setPanel] = useState(null) // 'people' | 'menu'
  const [hint, setHint] = useState(true)
  const [waking, setWaking] = useState(false)
  const [log, setLog] = useState([]) // 대화 기록 {key, ts, name, text, self?, system?}
  const [logOpen, setLogOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const chatInputRef = useRef(null)
  const rosterRef = useRef({})
  const logOpenRef = useRef(false)
  const activityRef = useRef(null)
  const keySeq = useRef(0)

  const addLog = useCallback((entry) => {
    const e = { key: ++keySeq.current, ts: Date.now(), ...entry }
    setLog((l) => [...l.slice(-99), e])
    if (!logOpenRef.current && !entry.self) setUnread((n) => n + 1)
  }, [])
  useEffect(() => {
    rosterRef.current = roster
  }, [roster])
  useEffect(() => {
    logOpenRef.current = logOpen
    if (logOpen) setUnread(0)
  }, [logOpen])

  // ── 게임 & 연결 ──
  useEffect(() => {
    const game = new Game(canvasRef.current, {
      profile,
      onNet: (msg) => connRef.current?.send(msg),
      onSelfChange: setSelf,
      onAction: (type, data) => {
        setHint(false)
        if (type === 'shelf') setOverlay({ type: 'shelf' })
        else if (type === 'pile') {
          const b = randomBook()
          if (b) setOverlay({ type: 'read', item: b })
        } else if (type === 'journal') setOverlay({ type: 'journal' })
        else if (type === 'player') setOverlay({ type: 'people', id: data.id })
        else if (type === 'menu') setOverlay({ type: 'menu', seated: data.seated })
      },
    })
    gameRef.current = game
    if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) window.__game = game
    game.start()

    const conn = createConnection({
      getHello: () => ({ name: profile.name, charId: profile.charId, ...game.snapshot() }),
      onStatus: setStatus,
      onMessage: (msg) => {
        switch (msg.t) {
          case 'welcome': {
            game.clearRemotes()
            const r = {}
            for (const p of msg.players) {
              game.addPlayer(p)
              r[p.id] = { name: p.name, charId: p.charId, activity: p.activity || null }
            }
            setRoster(r)
            setRoomNo(msg.room)
            // 들어오기 전 대화와 입장 안내
            setLog([
              ...(msg.history || []).map((h) => ({ key: ++keySeq.current, ts: h.ts, name: h.name, text: h.text })),
              { key: ++keySeq.current, ts: Date.now(), system: true, text: `${msg.room}호실에 들어왔어요.${msg.players.length ? ` ${msg.players.map((p) => p.name).join(', ')}님이 함께 있어요.` : ''}` },
            ])
            // 다시 연결됐을 때 지금 하던 일 다시 알리기
            if (activityRef.current) conn.send({ t: 'activity', activity: activityRef.current })
            break
          }
          case 'join':
            game.addPlayer(msg.player)
            game.showBubble(msg.player.id, '안녕하세요', 3000)
            setRoster((r) => ({ ...r, [msg.player.id]: { name: msg.player.name, charId: msg.player.charId, activity: msg.player.activity || null } }))
            addLog({ system: true, text: `${msg.player.name}님이 들어왔어요.` })
            break
          case 'leave': {
            const who = rosterRef.current[msg.id]
            game.removePlayer(msg.id)
            setRoster((r) => {
              const n = { ...r }
              delete n[msg.id]
              return n
            })
            if (who) addLog({ system: true, text: `${who.name}님이 나갔어요.` })
            break
          }
          case 'activity':
            setRoster((r) => (r[msg.id] ? { ...r, [msg.id]: { ...r[msg.id], activity: msg.activity } } : r))
            break
          case 'wave': {
            const from = rosterRef.current[msg.id]
            game.showEmote(msg.id, 'wave')
            if (msg.to === connRef.current?.myId) {
              game.showBubble(msg.id, '안녕하세요!', 3500)
              if (from) addLog({ system: true, text: `${from.name}님이 나에게 손을 흔들었어요.` })
            } else {
              const to = rosterRef.current[msg.to]
              if (from && to) addLog({ system: true, text: `${from.name}님이 ${to.name}님에게 손을 흔들었어요.` })
            }
            break
          }
          case 'move':
            game.remoteMove(msg.id, msg.x, msg.y, msg.dir)
            break
          case 'pose':
            game.remotePose(msg.id, msg.pose, msg.dir, msg.x, msg.y)
            break
          case 'chat':
            game.showBubble(msg.id, msg.text)
            addLog({ name: msg.name || rosterRef.current[msg.id]?.name || '누군가', text: msg.text })
            break
          case 'emote':
            game.showEmote(msg.id, msg.emote)
            break
        }
      },
    })
    connRef.current = conn
    const t = setTimeout(() => setHint(false), 14000)

    return () => {
      clearTimeout(t)
      conn.close()
      game.stop()
      disposeAmbience()
    }
  }, [profile])

  // 연결이 4초 넘게 걸리면 '서버 깨우는 중' 으로 안내 (무료 서버가 잠들어 있을 때)
  const settled = status === 'online' || status === 'solo'
  useEffect(() => {
    if (settled) {
      setWaking(false)
      return
    }
    const t = setTimeout(() => setWaking(true), 4000)
    return () => clearTimeout(t)
  }, [settled])

  // 창이 열려 있으면 캐릭터 이동 입력을 잠금
  useEffect(() => {
    gameRef.current?.setInputLocked(!!overlay || thinking || chatOpen || logOpen)
  }, [overlay, thinking, chatOpen, logOpen])

  const restPose = useCallback(() => {
    const g = gameRef.current
    if (!g) return
    g.setPose(g.me.seat ? 'sit' : 'stand')
  }, [])

  const openChat = () => {
    setChatOpen(true)
    setTimeout(() => chatInputRef.current?.focus(), 0)
  }

  const startThinking = () => {
    gameRef.current?.setPose('think')
    setThinking(true)
  }
  const stopThinking = useCallback(() => {
    setThinking(false)
    restPose()
  }, [restPose])

  // back: 책을 닫으면 돌아갈 창 ({type:'shelf'} | {type:'journal', category, id})
  const openBook = useCallback((item, back = null) => {
    gameRef.current?.setPose('read')
    setOverlay({ type: 'read', item, back })
  }, [])

  const closeOverlay = useCallback(() => {
    setOverlay((o) => {
      if (o?.type === 'read' && o.back) return o.back
      return null
    })
    restPose()
  }, [restPose])

  /** 마지막으로 읽던 책/글 (다 읽지 않은 것만) */
  const resumeItem = (() => {
    const it = findItem(loadLastRead()?.id)
    if (!it) return null
    const mark = loadBookmark(it.id)
    return mark?.progress >= 0.99 ? nextPost(it) || null : it
  })()
  const backFor = (it) => (it.kind === 'journal' ? { type: 'journal', category: it.category, id: it.id } : { type: 'shelf' })
  const resume = () => resumeItem && openBook(resumeItem, backFor(resumeItem))

  // 지금 하는 일을 방 사람들에게 알리기 (읽는 책 / 사색)
  useEffect(() => {
    const it = overlay?.type === 'read' ? overlay.item : null
    const a = it ? { kind: 'read', item: it.id, title: it.title } : thinking ? { kind: 'think' } : null
    if (JSON.stringify(a) === JSON.stringify(activityRef.current)) return
    activityRef.current = a
    connRef.current?.send({ t: 'activity', activity: a })
  }, [overlay, thinking])

  const online = status === 'online'
  const waveTo = (person) => {
    gameRef.current?.emote('wave')
    connRef.current?.send({ t: 'wave', to: person.id })
    addLog({ system: true, self: true, text: `${person.name}님에게 손을 흔들었어요.` })
    setOverlay(null)
  }
  const talkTo = (person) => {
    setOverlay(null)
    setChat(`${person.name}님, `)
    openChat()
  }

  const onMenuSelect = (id, arg) => {
    const g = gameRef.current
    setOverlay(null)
    if (id === 'read') setOverlay({ type: 'shelf' })
    else if (id === 'resume') resume()
    else if (id === 'think') startThinking()
    else if (id === 'chat') openChat()
    else if (id === 'emote') g?.emote(arg)
    else if (id === 'journal') setOverlay({ type: 'journal' })
    else if (id === 'people') setOverlay({ type: 'people' })
    else if (id === 'log') setLogOpen(true)
    else if (id === 'stand') g?.standUp()
  }

  const sendChat = (e) => {
    e.preventDefault()
    const text = chat.trim()
    if (text) {
      gameRef.current?.say(text.slice(0, 120))
      addLog({ self: true, name: profile.name, text: text.slice(0, 120) })
    }
    setChat('')
    chatInputRef.current?.blur()
    setChatOpen(false)
  }

  const toggleSound = () => {
    if (sound) stopAmbience()
    else startAmbience()
    setSound(!sound)
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const people = [{ id: 'me', name: profile.name, charId: profile.charId, me: true }, ...Object.entries(roster).map(([id, p]) => ({ id, ...p }))]
  const statusText =
    status === 'online' ? `${roomNo}호실` : status === 'connecting' || status === 'offline' ? (waking ? '서버 깨우는 중…' : '연결 중…') : '혼자 모드'
  const seatedOrBusy = self.seated || self.pose !== 'stand'

  return (
    <div className="room">
      <canvas ref={canvasRef} className="room-canvas" />
      <div className="vignette" aria-hidden="true" />

      {/* 상단 */}
      <div className="hud-top">
        <button className="pill" onClick={() => { setHint(false); setPanel(null); setOverlay({ type: 'people' }) }}>
          <span className={`dot ${status}`} />
          <span className="pill-title">겨울 서재</span>
          <span className="pill-sub">{statusText}</span>
          <span className="pill-count">
            <PixelIcon name="people" size={18} /> {people.length}/{CAPACITY}
          </span>
        </button>
        <div className="hud-top-right">
          <button className={`icon-btn${sound ? ' on' : ''}`} onClick={toggleSound} aria-label="음악과 장작 소리" title="음악과 장작 소리">
            <PixelIcon name={sound ? 'music' : 'musicOff'} size={24} />
          </button>
          <button className="icon-btn hide-touch" onClick={toggleFullscreen} aria-label="전체 화면" title="전체 화면">
            <PixelIcon name="fullscreen" size={24} />
          </button>
          <button className="icon-btn" onClick={() => { setHint(false); setPanel(panel === 'menu' ? null : 'menu') }} aria-label="메뉴" title="메뉴">
            <PixelIcon name="menu" size={24} />
          </button>
        </div>
      </div>

      {panel === 'menu' && (
        <div className="panel panel-right">
          <h3>{profile.name}</h3>
          <button className="menu-item" onClick={() => { setPanel(null); setOverlay({ type: 'shelf' }) }}>
            <PixelIcon name="shelf" size={22} /> 책장 둘러보기
          </button>
          <button className="menu-item" onClick={() => { setPanel(null); setOverlay({ type: 'journal' }) }}>
            <PixelIcon name="journal" size={22} /> 서재지기의 책상
          </button>
          <button className="menu-item" onClick={() => { setPanel(null); startThinking() }}>
            <PixelIcon name="thought" size={22} /> 사색하기
          </button>
          <button className="menu-item" onClick={onLeave}>
            <PixelIcon name="face" size={22} /> 캐릭터·이름 바꾸기
          </button>
          <div className="keys">
            <p><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> 걷기 · 고르기</p>
            <p><kbd>Space</kbd> 앉기 · 살펴보기 · 행동 메뉴</p>
            <p><kbd>Esc</kbd> 일어나기 · 닫기</p>
          </div>
        </div>
      )}

      {hint && (
        <div className="hint" onClick={() => setHint(false)}>
          {isTouch()
            ? '바닥을 눌러 걸어 보세요. 의자, 책장, 책상, 벽난로를 누르면 반응해요'
            : '방향키로 걷고, Space로 앉거나 살펴봐요. 아무것도 없을 땐 Space로 행동 메뉴!'}
        </div>
      )}

      {/* 하단 */}
      <div className="hud-bottom">
        {seatedOrBusy && !overlay && (
          <div className="actions">
            {resumeItem && (
              <button onClick={resume} title={resumeItem.title}>
                <PixelIcon name="bookmark" size={20} /> 이어 읽기
              </button>
            )}
            <button onClick={() => setOverlay({ type: 'shelf' })}>
              <PixelIcon name="book" size={20} /> 책 읽기
            </button>
            <button onClick={startThinking}>
              <PixelIcon name="thought" size={20} /> 사색하기
            </button>
            {self.seated && (
              <button onClick={() => gameRef.current?.standUp()}>
                <PixelIcon name="stand" size={20} /> 일어나기
              </button>
            )}
          </div>
        )}
        <ChatLog log={log} open={false} />
        <div className="chatbar">
          <button className={`icon-btn log-btn${unread ? ' has-new' : ''}`} onClick={() => setLogOpen(true)} aria-label="대화 기록" title="대화 기록">
            <PixelIcon name="chat" size={22} />
            {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
          <div className="emotes">
            {EMOTES.map((em) => (
              <button key={em} onClick={() => gameRef.current?.emote(em)} aria-label={EMOTE_LABEL[em]} title={EMOTE_LABEL[em]}>
                <PixelIcon name={em} size={24} />
              </button>
            ))}
          </div>
          {chatOpen ? (
            <form className="chat-form" onSubmit={sendChat}>
              <input
                ref={chatInputRef}
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                onBlur={() => !chat && setChatOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setChat('')
                    setChatOpen(false)
                    e.currentTarget.blur()
                  }
                }}
                placeholder="조용히 한마디… (Enter 보내기 · Esc 취소)"
                maxLength={120}
                enterKeyHint="send"
                autoFocus
              />
              <button type="submit">보내기</button>
            </form>
          ) : (
            <button className="chat-open" onClick={openChat}>
              <PixelIcon name="chat" size={20} /> 말하기
            </button>
          )}
        </div>
      </div>

      {logOpen && <ChatLog log={log} open onClose={() => setLogOpen(false)} />}
      {overlay?.type === 'people' && (
        <PeopleModal
          people={people}
          initialId={overlay.id}
          online={online}
          onWave={waveTo}
          onTalk={talkTo}
          onOpenItem={(it) => openBook(it, it.kind === 'journal' ? backFor(it) : { type: 'shelf' })}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.type === 'menu' && (
        <ActionMenu seated={overlay.seated} resumeTitle={resumeItem?.title} onSelect={onMenuSelect} onClose={() => setOverlay(null)} />
      )}
      {overlay?.type === 'shelf' && <LibraryShelf onOpen={(b) => openBook(b, { type: 'shelf' })} onClose={closeOverlay} />}
      {overlay?.type === 'journal' && (
        <JournalDesk
          key={`${overlay.category || ''}`}
          initialCategory={overlay.category || null}
          initialId={overlay.id || null}
          onOpen={(j) => openBook(j, backFor(j))}
          onClose={closeOverlay}
        />
      )}
      {overlay?.type === 'read' && (
        <BookReader
          key={overlay.item.id}
          item={overlay.item}
          next={nextPost(overlay.item)}
          onNext={() => {
            const n = nextPost(overlay.item)
            if (n) openBook(n, backFor(n))
          }}
          onClose={closeOverlay}
        />
      )}
      {thinking && <ThinkOverlay onClose={stopThinking} />}
    </div>
  )
}
