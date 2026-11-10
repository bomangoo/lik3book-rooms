import { useCallback, useEffect, useRef, useState } from 'react'
import { Game } from '../game/engine.js'
import { createConnection } from '../net/client.js'
import { randomBook } from '../content/books.js'
import { CHARACTER_MAP } from '../game/characters.js'
import { startAmbience, stopAmbience, disposeAmbience } from '../audio/ambience.js'
import BookModal from './BookModal.jsx'
import ThinkOverlay from './ThinkOverlay.jsx'
import CharacterPreview from './CharacterPreview.jsx'

const EMOTES = ['👋', '☕', '❤️', '✨', '😴']
const CAPACITY = 5

export default function LibraryRoom({ profile, onLeave }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const connRef = useRef(null)
  const [status, setStatus] = useState('connecting')
  const [roomNo, setRoomNo] = useState(null)
  const [roster, setRoster] = useState({})
  const [self, setSelf] = useState({ pose: 'stand', seated: false })
  const [modal, setModal] = useState(null) // {theme} | {book}
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
        if (type === 'shelf') setModal({ theme: data.theme })
        else if (type === 'pile') setModal({ book: randomBook() })
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
            game.showBubble(msg.player.id, '안녕하세요 ❄', 3000)
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
    const t = setTimeout(() => setHint(false), 12000)

    return () => {
      clearTimeout(t)
      conn.close()
      game.stop()
      disposeAmbience()
    }
  }, [profile])

  // Enter 로 대화창 열기
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' || modal || thinking) return
      if (document.activeElement === chatInputRef.current) return
      e.preventDefault()
      setChatOpen(true)
      setTimeout(() => chatInputRef.current?.focus(), 0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, thinking])

  const restPose = useCallback(() => {
    const g = gameRef.current
    if (!g) return
    if (g.me.seat) g.setPose('sit')
    else g.setPose('stand')
  }, [])

  const onReadingChange = useCallback(
    (reading) => {
      const g = gameRef.current
      if (!g) return
      if (reading) g.setPose('read')
      else restPose()
    },
    [restPose],
  )

  const closeModal = useCallback(() => {
    setModal(null)
    restPose()
  }, [restPose])

  const startThinking = () => {
    gameRef.current?.setPose('think')
    setThinking(true)
  }
  const stopThinking = useCallback(() => {
    setThinking(false)
    restPose()
  }, [restPose])

  const sendChat = (e) => {
    e.preventDefault()
    const text = chat.trim()
    if (text) gameRef.current?.say(text.slice(0, 80))
    setChat('')
    chatInputRef.current?.blur()
    if (window.matchMedia('(pointer: coarse)').matches) setChatOpen(false)
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

  return (
    <div className="room">
      <canvas ref={canvasRef} className="room-canvas" />
      <div className="vignette" aria-hidden="true" />

      {/* 상단 */}
      <div className="hud-top">
        <button className="pill" onClick={() => setPanel(panel === 'people' ? null : 'people')}>
          <span className={`dot ${status}`} />
          <span className="pill-title">겨울 서재</span>
          <span className="pill-sub">{statusText}</span>
          <span className="pill-count">👥 {people.length}/{CAPACITY}</span>
        </button>
        <div className="hud-top-right">
          <button className={`icon-btn${sound ? ' on' : ''}`} onClick={toggleSound} aria-label="장작 소리" title="장작 소리">
            {sound ? '🔊' : '🔈'}
          </button>
          <button className="icon-btn hide-touch" onClick={toggleFullscreen} aria-label="전체 화면" title="전체 화면">⛶</button>
          <button className="icon-btn" onClick={() => setPanel(panel === 'menu' ? null : 'menu')} aria-label="메뉴" title="메뉴">☰</button>
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
          {status !== 'online' && <p className="panel-note">서버에 연결되지 않아 혼자 머무는 중이에요. 자동으로 다시 연결을 시도합니다.</p>}
        </div>
      )}
      {panel === 'menu' && (
        <div className="panel panel-right">
          <h3>{profile.name}</h3>
          <button className="menu-item" onClick={() => { setPanel(null); setModal({ theme: 'poem' }) }}>📚 책장 둘러보기</button>
          <button className="menu-item" onClick={() => { setPanel(null); startThinking() }}>💭 사색하기</button>
          <button className="menu-item" onClick={onLeave}>🎭 캐릭터·이름 바꾸기</button>
          <p className="panel-note">이동: 바닥 터치/클릭 · 방향키/WASD<br />상호작용: 책장·의자·벽난로·트리 누르기 (Space)<br />대화: Enter</p>
        </div>
      )}

      {hint && (
        <div className="hint" onClick={() => setHint(false)}>
          바닥을 눌러 걸어 보세요. 책장, 책 더미, 의자, 벽난로를 누르면 반응해요 ✨
        </div>
      )}

      {/* 하단 */}
      <div className="hud-bottom">
        {(self.seated || self.pose !== 'stand') && (
          <div className="actions">
            <button onClick={() => setModal({ theme: 'poem' })}>📖 책 읽기</button>
            <button onClick={startThinking}>💭 사색하기</button>
            {self.seated && <button onClick={() => gameRef.current?.standUp()}>🚶 일어나기</button>}
          </div>
        )}
        <div className="chatbar">
          <div className="emotes">
            {EMOTES.map((em) => (
              <button key={em} onClick={() => gameRef.current?.emote(em)} aria-label={`감정 ${em}`}>{em}</button>
            ))}
          </div>
          {chatOpen ? (
            <form className="chat-form" onSubmit={sendChat}>
              <input
                ref={chatInputRef}
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                onBlur={() => !chat && setChatOpen(false)}
                placeholder="조용히 한마디… (Enter)"
                maxLength={80}
                enterKeyHint="send"
                autoFocus
              />
              <button type="submit">보내기</button>
            </form>
          ) : (
            <button className="chat-open" onClick={() => { setChatOpen(true); setTimeout(() => chatInputRef.current?.focus(), 0) }}>
              💬 말하기
            </button>
          )}
        </div>
      </div>

      {modal && (
        <BookModal
          initialTheme={modal.theme}
          initialBook={modal.book}
          onClose={closeModal}
          onReadingChange={onReadingChange}
        />
      )}
      {thinking && <ThinkOverlay onClose={stopThinking} />}
    </div>
  )
}
