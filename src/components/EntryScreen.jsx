import { useState } from 'react'
import { CHARACTERS } from '../game/characters.js'
import CharacterPreview from './CharacterPreview.jsx'
import Snowfall from './Snowfall.jsx'

export default function EntryScreen({ onEnter }) {
  const [charId, setCharId] = useState(CHARACTERS[0].id)
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const selected = CHARACTERS.find((c) => c.id === charId)

  const submit = (e) => {
    e.preventDefault()
    if (!trimmed) return
    onEnter({ name: trimmed.slice(0, 10), charId })
  }

  return (
    <div className="entry">
      <Snowfall />
      <form className="entry-card" onSubmit={submit}>
        <header className="entry-head">
          <p className="entry-kicker">❄ 눈 내리는 밤의 산방 ❄</p>
          <h1>겨울 서재</h1>
          <p className="entry-sub">벽난로 곁에서 책을 읽고, 조용히 사색하다 가세요.<br />한 방에 다섯 사람까지 머물 수 있어요.</p>
        </header>

        <div className="entry-stage">
          <div className="entry-hero">
            <CharacterPreview charId={charId} scale={6} />
          </div>
          <div className="entry-hero-text">
            <strong>{selected.name}</strong>
            <span>{selected.desc}</span>
          </div>
        </div>

        <fieldset className="char-grid">
          <legend>캐릭터를 골라 주세요</legend>
          {CHARACTERS.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`char-option${c.id === charId ? ' selected' : ''}`}
              onClick={() => setCharId(c.id)}
              aria-pressed={c.id === charId}
              aria-label={c.name}
            >
              <CharacterPreview charId={c.id} scale={3} animate={c.id === charId} />
              <span>{c.name}</span>
            </button>
          ))}
        </fieldset>

        <label className="name-field">
          <span>이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 10))}
            placeholder="서재에서 불릴 이름 (10자 이내)"
            maxLength={10}
            autoComplete="off"
            enterKeyHint="go"
          />
        </label>

        <button className="enter-btn" type="submit" disabled={!trimmed}>
          서재에 들어가기
        </button>
        <p className="entry-note">캐릭터와 이름은 이 브라우저 탭에 기억되어, 다시 오면 바로 입장해요.</p>
      </form>
    </div>
  )
}
