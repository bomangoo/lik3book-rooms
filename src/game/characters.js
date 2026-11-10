// 귀여운 2등신 픽셀 캐릭터 (코드로 직접 그립니다)
import { makeCanvas, painter, outline, mirror } from './pixel.js'

export const SPRITE_W = 20
export const SPRITE_H = 30
/** 스프라이트 안에서 '발 밑' 기준점 */
export const ANCHOR_X = 10
export const ANCHOR_Y = 28

const EYE = '#2a1e24'
const BLUSH = 'rgba(255,110,130,0.5)'

export const CHARACTERS = [
  {
    id: 'doryeong',
    name: '선비 도령',
    desc: '갓을 쓴 책벌레',
    style: 'gat',
    skin: '#ffdcbf',
    hair: '#2b2230',
    cloth: '#eef1f5',
    clothDark: '#c4ccd8',
    accent: '#4a6fb5',
    shoe: '#3a2c2a',
  },
  {
    id: 'nangja',
    name: '댕기 낭자',
    desc: '색동 소매의 시 낭송가',
    style: 'braid',
    skin: '#ffdcbf',
    hair: '#3a2622',
    cloth: '#fde2a7',
    clothDark: '#e9c47a',
    skirt: '#d6334a',
    accent: '#d6334a',
    shoe: '#f3e9dc',
  },
  {
    id: 'monk',
    name: '동자승',
    desc: '산사에서 내려온 꼬마 스님',
    style: 'bald',
    skin: '#ffdcbf',
    hair: '#ffdcbf',
    cloth: '#a7adb5',
    clothDark: '#7f8791',
    accent: '#7a4b2a',
    shoe: '#5b4a3e',
  },
  {
    id: 'tiger',
    name: '아기 호랑이',
    desc: '벽난로 앞 낮잠 대장',
    style: 'tiger',
    skin: '#f4a03a',
    hair: '#f4a03a',
    cloth: '#f4a03a',
    clothDark: '#d9822a',
    accent: '#4a2a1a',
    belly: '#fff4e0',
    shoe: '#fff4e0',
  },
  {
    id: 'rabbit',
    name: '눈토끼',
    desc: '하얀 털의 조용한 독서가',
    style: 'rabbit',
    skin: '#f7f3ee',
    hair: '#f7f3ee',
    cloth: '#8fc1e3',
    clothDark: '#6a9fc6',
    accent: '#ffffff',
    inner: '#f6b8c4',
    shoe: '#5b6f8a',
  },
  {
    id: 'snowkid',
    name: '털모자 아이',
    desc: '눈사람을 만들다 들어온 아이',
    style: 'knit',
    skin: '#ffdcbf',
    hair: '#6b4026',
    cloth: '#f2c14e',
    clothDark: '#d39e2c',
    accent: '#3f8f5a',
    hat: '#d6453d',
    shoe: '#6b4026',
  },
]

export const CHARACTER_MAP = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]))

const BOOK_COLORS = ['#8b3a3a', '#3a5a8b', '#3f7a4f', '#7a4f8b']

// ───────────────────────── 몸 ─────────────────────────
function head(p, color) {
  p(5, 7, 10, 1, color)
  p(4, 8, 12, 1, color)
  p(3, 9, 14, 8, color)
  p(4, 17, 12, 1, color)
  p(5, 18, 10, 1, color)
}

function saekdongArms(p, xs, ys) {
  const cols = ['#e85d75', '#ffd166', '#5aa1e3', '#6cc287']
  for (const x of xs) cols.forEach((c, i) => p(x, ys + i, 2, 1, c))
}

function bodyFront(p, c, body, back) {
  const skirt = c.skirt || c.cloth
  const sitting = body === 'sit'
  // 팔
  if (c.style === 'braid') saekdongArms(p, [4, 14], 19)
  else {
    p(4, 19, 2, 4, c.clothDark)
    p(14, 19, 2, 4, c.clothDark)
  }
  if (sitting) {
    p(6, 19, 8, 4, c.cloth)
    p(5, 23, 10, 2, skirt === c.cloth ? c.clothDark : skirt)
    p(6, 25, 3, 1, c.shoe)
    p(11, 25, 3, 1, c.shoe)
    p(4, 23, 2, 1, c.skin)
    p(14, 23, 2, 1, c.skin)
    return
  }
  p(6, 19, 8, 5, c.cloth)
  p(5, 24, 10, 2, skirt)
  p(4, 23, 2, 1, c.skin)
  p(14, 23, 2, 1, c.skin)
  if (body === 'walkA') {
    p(5, 26, 3, 2, c.shoe)
    p(12, 26, 3, 1, c.shoe)
  } else if (body === 'walkB') {
    p(5, 26, 3, 1, c.shoe)
    p(12, 26, 3, 2, c.shoe)
  } else {
    p(6, 26, 3, 2, c.shoe)
    p(11, 26, 3, 2, c.shoe)
  }
  if (!back) clothDetailFront(p, c)
}

function clothDetailFront(p, c) {
  switch (c.style) {
    case 'gat':
      p(8, 19, 1, 1, c.accent)
      p(9, 20, 1, 1, c.accent)
      p(11, 19, 1, 1, c.accent)
      p(10, 20, 1, 1, c.accent)
      p(6, 22, 8, 1, c.accent)
      break
    case 'braid':
      p(9, 19, 2, 1, '#ffffff')
      p(10, 20, 1, 3, c.accent)
      p(11, 21, 1, 2, c.accent)
      break
    case 'bald':
      for (const [x, y] of [[6, 19], [7, 20], [8, 21], [10, 21], [12, 20], [13, 19]]) p(x, y, 1, 1, c.accent)
      p(9, 21, 1, 2, c.accent)
      break
    case 'tiger':
      p(8, 20, 4, 4, c.belly)
      p(4, 20, 2, 1, c.accent)
      p(14, 20, 2, 1, c.accent)
      break
    case 'rabbit':
      p(6, 19, 8, 1, '#ffffff')
      p(9, 21, 1, 1, '#ffffff')
      p(9, 23, 1, 1, '#ffffff')
      break
    case 'knit':
      p(9, 22, 1, 1, '#8a5a1a')
      p(9, 24, 1, 1, '#8a5a1a')
      break
  }
}

function bodySide(p, c, body) {
  const skirt = c.skirt || c.cloth
  if (body === 'sit') {
    p(7, 19, 6, 4, c.cloth)
    p(8, 23, 7, 2, skirt === c.cloth ? c.clothDark : skirt)
    p(13, 25, 2, 1, c.shoe)
    if (c.style === 'braid') saekdongArms(p, [9], 19)
    else p(9, 19, 2, 4, c.clothDark)
    p(10, 23, 2, 1, c.skin)
    return
  }
  p(7, 19, 6, 5, c.cloth)
  p(6, 24, 8, 2, skirt)
  if (body === 'walkA') {
    p(5, 26, 3, 2, c.shoe)
    p(11, 26, 3, 2, c.shoe)
  } else if (body === 'walkB') {
    p(8, 26, 4, 2, c.shoe)
  } else {
    p(7, 26, 6, 2, c.shoe)
  }
  const armX = body === 'walkA' ? 10 : body === 'walkB' ? 8 : 9
  if (c.style === 'braid') saekdongArms(p, [armX], 19)
  else p(armX, 19, 2, 4, c.clothDark)
  p(armX, 23, 2, 1, c.skin)
  if (c.style === 'tiger') p(11, 20, 2, 4, c.belly)
  if (c.style === 'gat') p(7, 22, 6, 1, c.accent)
  if (c.style === 'rabbit') p(7, 19, 6, 1, '#ffffff')
}

// ───────────────────────── 얼굴/머리 ─────────────────────────
function faceDown(p, eyes) {
  if (eyes === 'closed') {
    p(6, 14, 2, 1, EYE)
    p(12, 14, 2, 1, EYE)
  } else {
    p(6, 13, 2, 2, EYE)
    p(12, 13, 2, 2, EYE)
    p(7, 13, 1, 1, '#ffffff')
    p(13, 13, 1, 1, '#ffffff')
  }
  p(5, 16, 2, 1, BLUSH)
  p(13, 16, 2, 1, BLUSH)
}

function faceSide(p, eyes) {
  if (eyes === 'closed') p(12, 14, 2, 1, EYE)
  else {
    p(12, 13, 2, 2, EYE)
    p(13, 13, 1, 1, '#ffffff')
  }
  p(13, 16, 2, 1, BLUSH)
}

const STYLES = {
  gat: {
    down(p, c) {
      p(5, 7, 10, 1, c.hair)
      p(4, 8, 12, 1, c.hair)
      p(3, 9, 14, 2, c.hair)
      p(3, 11, 2, 3, c.hair)
      p(15, 11, 2, 3, c.hair)
      p(9, 17, 2, 1, '#d98a7a')
    },
    up(p, c) {
      head(p, c.hair)
    },
    side(p, c) {
      p(5, 7, 10, 1, c.hair)
      p(4, 8, 12, 1, c.hair)
      p(3, 9, 14, 2, c.hair)
      p(3, 11, 6, 6, c.hair)
      p(4, 17, 4, 1, c.hair)
    },
    front(p, c, dir) {
      // 갓
      p(6, 1, 8, 7, '#231d27')
      p(7, 2, 1, 5, '#463c4d')
      p(6, 6, 8, 1, '#5b4a52')
      p(0, 8, 20, 1, '#231d27')
      p(1, 9, 18, 1, 'rgba(35,29,39,0.55)')
      if (dir === 'down') {
        p(4, 14, 1, 1, '#c9a86b')
        p(15, 14, 1, 1, '#c9a86b')
        p(5, 17, 1, 1, '#c9a86b')
        p(14, 17, 1, 1, '#c9a86b')
      }
    },
  },
  braid: {
    down(p, c) {
      p(5, 7, 10, 1, c.hair)
      p(4, 8, 12, 1, c.hair)
      p(3, 9, 14, 3, c.hair)
      p(3, 12, 4, 1, c.hair)
      p(13, 12, 4, 1, c.hair)
      p(3, 12, 2, 7, c.hair)
      p(15, 12, 2, 7, c.hair)
      p(9, 9, 2, 1, c.skin)
      p(14, 8, 2, 2, '#e85d75')
    },
    up(p, c) {
      head(p, c.hair)
      p(9, 8, 2, 1, shadeHair(c.hair))
    },
    side(p, c) {
      p(5, 7, 10, 1, c.hair)
      p(4, 8, 12, 1, c.hair)
      p(3, 9, 14, 3, c.hair)
      p(3, 12, 7, 7, c.hair)
      p(12, 12, 4, 1, c.hair)
      p(5, 8, 2, 2, '#e85d75')
    },
    front(p, c, dir) {
      if (dir === 'up') {
        p(9, 19, 2, 6, c.hair)
        p(8, 24, 4, 2, c.accent)
      } else if (dir === 'side') {
        p(4, 19, 2, 4, c.hair)
        p(3, 22, 4, 2, c.accent)
      }
    },
  },
  bald: {
    down(p) {
      p(5, 7, 10, 1, '#efc9b0')
      p(4, 8, 12, 1, '#efc9b0')
      p(6, 9, 2, 1, '#fff3e6')
      p(9, 17, 2, 1, '#d98a7a')
    },
    up(p) {
      p(5, 7, 10, 1, '#efc9b0')
      p(4, 8, 12, 2, '#efc9b0')
      p(7, 9, 2, 1, '#fff3e6')
    },
    side(p) {
      p(5, 7, 10, 1, '#efc9b0')
      p(4, 8, 12, 1, '#efc9b0')
      p(9, 9, 2, 1, '#fff3e6')
      p(5, 13, 2, 3, '#f3c7a8')
    },
  },
  tiger: {
    behind(p, c, dir) {
      if (dir === 'side') {
        p(5, 4, 4, 4, c.hair)
        p(6, 5, 2, 2, '#c76a2a')
        p(2, 18, 2, 3, c.cloth)
        p(2, 18, 2, 1, c.accent)
        p(3, 20, 4, 2, c.cloth)
      } else {
        p(3, 4, 4, 5, c.hair)
        p(13, 4, 4, 5, c.hair)
        p(4, 5, 2, 2, '#c76a2a')
        p(14, 5, 2, 2, '#c76a2a')
      }
    },
    down(p, c) {
      p(9, 7, 2, 3, c.accent)
      p(6, 8, 1, 2, c.accent)
      p(13, 8, 1, 2, c.accent)
      p(3, 12, 2, 1, c.accent)
      p(15, 12, 2, 1, c.accent)
      p(3, 14, 2, 1, c.accent)
      p(15, 14, 2, 1, c.accent)
      p(7, 15, 6, 3, c.belly)
      p(9, 15, 2, 1, '#5a2c2c')
    },
    up(p, c) {
      p(9, 8, 2, 5, c.accent)
      p(6, 9, 1, 3, c.accent)
      p(13, 9, 1, 3, c.accent)
      p(3, 13, 2, 1, c.accent)
      p(15, 13, 2, 1, c.accent)
    },
    side(p, c) {
      p(6, 8, 1, 3, c.accent)
      p(8, 7, 1, 3, c.accent)
      p(4, 12, 2, 1, c.accent)
      p(4, 14, 2, 1, c.accent)
      p(12, 15, 5, 3, c.belly)
      p(16, 15, 1, 1, '#5a2c2c')
    },
    front(p, c, dir) {
      if (dir === 'up') {
        p(14, 22, 3, 2, c.cloth)
        p(16, 19, 2, 4, c.cloth)
        p(16, 19, 2, 1, c.accent)
        p(16, 21, 2, 1, c.accent)
      }
    },
  },
  rabbit: {
    behind(p, c, dir) {
      if (dir === 'side') {
        p(9, 1, 3, 7, '#e8e2da')
        p(5, 0, 3, 8, c.hair)
        p(6, 1, 1, 6, c.inner)
      } else {
        p(5, 0, 3, 8, c.hair)
        p(12, 0, 3, 8, c.hair)
        if (dir === 'down') {
          p(6, 1, 1, 6, c.inner)
          p(13, 1, 1, 6, c.inner)
        }
      }
    },
    down(p, c) {
      p(9, 15, 2, 1, '#f08aa0')
      p(8, 9, 1, 1, '#ffffff')
    },
    up() {},
    side(p) {
      p(16, 15, 1, 1, '#f08aa0')
    },
    front(p, c, dir) {
      if (dir === 'up') p(9, 23, 2, 2, c.hair)
      if (dir === 'side') p(5, 23, 2, 2, c.hair)
    },
  },
  knit: {
    down(p, c) {
      p(4, 13, 12, 1, c.hair)
      p(3, 13, 2, 4, c.hair)
      p(15, 13, 2, 4, c.hair)
      p(9, 17, 2, 1, '#d98a7a')
    },
    up(p, c) {
      head(p, c.hair)
    },
    side(p, c) {
      p(3, 13, 6, 5, c.hair)
      p(12, 13, 3, 1, c.hair)
    },
    front(p, c, dir) {
      // 털모자
      p(6, 5, 8, 1, c.hat)
      p(4, 6, 12, 1, c.hat)
      p(3, 7, 14, 4, c.hat)
      p(3, 11, 14, 2, '#f3e9dc')
      for (let x = 4; x < 16; x += 3) p(x, 9, 1, 1, '#f3e9dc')
      p(8, 1, 4, 4, '#ffffff')
      // 목도리
      p(5, 19, 10, 2, c.accent)
      p(5, 20, 10, 1, '#2f6e44')
      if (dir === 'down') p(12, 21, 2, 3, c.accent)
      else if (dir === 'up') p(6, 21, 2, 3, c.accent)
      else p(6, 21, 2, 3, c.accent)
    },
  },
}

function shadeHair(c) {
  return c === '#3a2622' ? '#5a3a32' : '#555'
}

function bookFront(p, c, color) {
  p(6, 20, 8, 4, color)
  p(9, 20, 2, 4, '#2b1b1e')
  p(7, 21, 1, 1, '#f5ecd7')
  p(12, 21, 1, 1, '#f5ecd7')
  p(5, 21, 1, 2, c.skin)
  p(14, 21, 1, 2, c.skin)
}

function bookSide(p, c, color) {
  p(12, 19, 4, 4, color)
  p(13, 19, 3, 1, '#f5ecd7')
  p(12, 22, 2, 1, c.skin)
}

/**
 * @param {string} charId
 * @param {'down'|'up'|'side'} dir
 * @param {{body?: 'stand'|'walkA'|'walkB'|'sit', book?: boolean, eyes?: 'open'|'closed'}} opt
 */
function draw(charId, dir, { body = 'stand', book = false, eyes = 'open' } = {}) {
  const c = CHARACTER_MAP[charId] || CHARACTERS[0]
  const style = STYLES[c.style]
  const canvas = makeCanvas(SPRITE_W, SPRITE_H)
  const ctx = canvas.getContext('2d')
  const p = painter(ctx)
  style.behind?.(p, c, dir)
  if (dir === 'side') bodySide(p, c, body)
  else bodyFront(p, c, body, dir === 'up')
  head(p, c.skin)
  if (dir === 'down') {
    faceDown(p, eyes)
    style.down(p, c)
  } else if (dir === 'up') style.up(p, c)
  else {
    faceSide(p, eyes)
    style.side(p, c)
  }
  style.front?.(p, c, dir)
  if (book) {
    const color = BOOK_COLORS[charId.length % BOOK_COLORS.length]
    if (dir === 'down') bookFront(p, c, color)
    else if (dir === 'side') bookSide(p, c, color)
  }
  return outline(canvas)
}

const cache = new Map()

/**
 * 캐시된 스프라이트를 돌려줍니다.
 * @param {string} charId
 * @param {'down'|'up'|'left'|'right'} dir
 * @param {'stand'|'walkA'|'walkB'|'sit'} body
 * @param {{book?: boolean, eyes?: 'open'|'closed'}} extra
 */
export function getSprite(charId, dir, body = 'stand', extra = {}) {
  const key = `${charId}|${dir}|${body}|${extra.book ? 1 : 0}|${extra.eyes || 'open'}`
  let s = cache.get(key)
  if (!s) {
    const base = dir === 'left' || dir === 'right' ? 'side' : dir
    s = draw(charId, base, { body, ...extra })
    if (dir === 'left') s = mirror(s)
    cache.set(key, s)
  }
  return s
}
