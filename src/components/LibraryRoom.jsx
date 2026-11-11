import { useCallback, useEffect, useRef, useState } from 'react'
import { Game } from '../game/engine.js'
import { createConnection } from '../net/client.js'
import { randomBook } from '../content/library.js'
import { CHARACTER_MAP } from '../game/characters.js'
import { EMOTES, EMOTE_LABEL } from '../game/icons.js'
import { startAmbience, stopAmbience, disposeAmbience } from '../audio/ambience.js'
import LibraryShelf from './LibraryShelf.jsx'
import JournalDesk from './JournalDesk.jsx'
import BookReader from './BookReader.jsx'
import ThinkOverlay from './ThinkOverlay.jsx'
import ActionMenu from './ActionMenu.jsx'
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
  const chatInputRef = useRef(null)

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
              r[p.id] = { name: p.name, charId: p.charId }
            }
            setRoster(r)
            setRoomNo(msg.room)
            break
          }
          case 'join':
            game.addPlayer(msg.player)
            game.showBubble(msg.player.id, '안녕하세요', 3000)
            setRoster((r) => ({ ...r, [msg.player.id]: { name: msg.player.name, charId: msg.player.charId } }))
            break
          case 'leave':
            game.removePlayer(msg.id)
            setRoster((r) => {
              const n = { ...r }
              delete n[msg.id]
              return n
            })
            break
          case 'move':
            game.remoteMove(msg.id, msg.x, msg.y, msg.dir)
            break
          case 'pose':
            game.remotePose(msg.id, msg.pose, msg.dir, msg.x, msg.y)
            break
          case 'chat':
            game.showBubble(msg.id, msg.text)
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

  // 창이 열려 있으면 캐릭터 이동 입력을 잠금
  useEffect(() => {
    gameRef.current?.setInputLocked(!!overlay || thinking || chatOpen)
  }, [overlay, thinking, chatOpen])

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

  const openBook = useCallback((item, back = null) => {
    gameRef.current?.setPose('read')
    setOverlay({ type: 'read', item, back })
  }, [])

  const closeOverlay = useCallback(() => {
    setOverlay((o) => {
      if (o?.type === 'read' && o.back) return { type: o.back }
      return null
    })
    restPose()
  }, [restPose])

  const onMenuSelect = (id, arg) => {
    const g = gameRef.current
    setOverlay(null)
    if (id === 'read') setOverlay({ type: 'shelf' })
    else if (id === 'think') startThinking()
    else if (id === 'chat') openChat()
    else if (id === 'emote') g?.emote(arg)
    else if (id === 'journal') setOverlay({ type: 'journal' })
    else if (id === 'stand') g?.standUp()
  }

  const sendChat = (e) => {
    e.preventDefault()
    const text = chat.trim()
    if (text) gameRef.current?.say(text.slice(0, 80))
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
  const statusText = status === 'online' ? `${roomNo}호실` : status === 'connecting' ? '연결 중…' : '혼자 모드'
  const seatedOrBusy = self.seated || self.pose !== 'stand'

  return (
    <div className="room">
      <canvas ref={canvasRef} className="room-canvas" />
      <div className="vignette" aria-hidden="true" />

      {/* 상단 */}
      <div className="hud-top">
        <button className="pill" onClick={() => { setHint(false); setPanel(panel === 'people' ? null : 'people') }}>
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

      {panel === 'people' && (
        <div className="panel panel-left">
          <h3>지금 서재에 있는 사람</h3>
          <ul className="people">
            {people.map((p) => (
              <li key={p.id}>
                <CharacterPreview charId={p.charId} scale={2} animate={false} />
                <span>
                  {p.name}
                  {p.me && <em> (나)</em>}
                </span>
                <small>{CHARACTER_MAP[p.charId]?.name}</small>
              </li>
            ))}
          </ul>
          {status === 'solo' && <p className="panel-note">이 주소에는 실시간 서버가 없어 혼자 머무는 서재예요. 조용히 책을 읽고 사색해 보세요.</p>}
          {(status === 'offline' || status === 'connecting') && <p className="panel-note">서버에 연결되지 않아 혼자 머무는 중이에요. 자동으로 다시 연결을 시도합니다.</p>}
        </div>
      )}
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
        <div className="chatbar">
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
                maxLength={80}
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

      {overlay?.type === 'menu' && <ActionMenu seated={overlay.seated} onSelect={onMenuSelect} onClose={() => setOverlay(null)} />}
      {overlay?.type === 'shelf' && <LibraryShelf onOpen={(b) => openBook(b, 'shelf')} onClose={closeOverlay} />}
      {overlay?.type === 'journal' && <JournalDesk onOpen={(j) => openBook(j, 'journal')} onClose={closeOverlay} />}
      {overlay?.type === 'read' && <BookReader key={overlay.item.id} item={overlay.item} onClose={closeOverlay} />}
      {thinking && <ThinkOverlay onClose={stopThinking} />}
    </div>
  )
}
