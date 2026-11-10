import { useEffect, useRef } from 'react'
import { getSprite, SPRITE_W, SPRITE_H } from '../game/characters.js'

const FRAMES = ['walkA', 'stand', 'walkB', 'stand']

/** 캐릭터 미리보기 (제자리 걷기 애니메이션) */
export default function CharacterPreview({ charId, scale = 4, animate = true, dir = 'down' }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c.getContext('2d')
    ctx.imageSmoothingEnabled = false
    let i = 0
    let raf = 0
    let last = 0
    const draw = (now) => {
      if (!last || now - last > 160) {
        last = now
        const body = animate ? FRAMES[i++ % 4] : 'stand'
        ctx.clearRect(0, 0, c.width, c.height)
        ctx.drawImage(getSprite(charId, dir, body), 0, body === 'stand' ? scale : 0, SPRITE_W * scale, SPRITE_H * scale)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [charId, scale, animate, dir])
  return <canvas ref={ref} width={SPRITE_W * scale} height={(SPRITE_H + 1) * scale} className="char-preview" aria-hidden="true" />
}
