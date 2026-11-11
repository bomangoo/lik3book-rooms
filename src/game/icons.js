// 게임 톤의 12x12 픽셀 아이콘 (자동 외곽선). 캔버스와 React UI 에서 함께 사용합니다.
import { makeCanvas, outline, mirror } from './pixel.js'

const PAL = {
  w: '#fff8ec', c: '#f3e6cb', l: '#c9d6df', d: '#8f97a3',
  r: '#d6334a', R: '#9a2838', p: '#f6b8c4',
  y: '#f2c14e', Y: '#ffe39a',
  g: '#5b9a5a', b: '#5aa1e3', B: '#2f5aa8',
  k: '#8a5532', K: '#3a2620', s: '#ffdcbf', o: '#3a2620',
}

const ICONS = {
  book: [
    '............', '.oooo..oooo.', 'owwwwoowwwwo', 'owddwoowddwo', 'owwwwoowwwwo', 'owddwoowddwo',
    'owwwwoowwwwo', 'owddwoowddwo', 'owwwwoowwwwo', 'orrrroorrrro', '.oooo..oooo.', '............',
  ],
  shelf: [
    '............', '...yy....kk.', '.rryybbggkk.', '.rryybbggkk.', '.rYyybbggkk.', '.rryybBggkk.',
    '.rryybbggkk.', '.rryybbggkk.', '.rryybbggkk.', '.rryybbggkk.', 'kkkkkkkkkkkk', '............',
  ],
  thought: [
    '............', '...wwww.....', '..wwwwwww...', '.wwwwwwwww..', 'wwwwwwwwwww.', 'wwwwwwwwwwww',
    '.wwwwwwwwww.', '..wwwwwwww..', '............', '..ww........', '.wwww.......', '..ww........',
  ],
  chat: [
    '............', '.wwwwwwwwww.', 'wwwwwwwwwwww', 'wwwwwwwwwwww', 'wwwKwwKwwKww', 'wwwwwwwwwwww',
    'wwwwwwwwwwww', '.wwwwwwwwww.', '..ww........', '..w.........', '............', '............',
  ],
  stand: [
    '............', '....kkkk....', '....kkkk....', '....kkkk....', '....kkkk....', '....kkkk....',
    '....kkkkk...', '....kkkkkkk.', '...kkkkkkkkk', '...KKKKKKKKK', '............', '............',
  ],
  music: [
    '............', '.....yyyyy..', '.....yyyyyy.', '.....yy.....', '.....yy.....', '.....yy.....',
    '.....yy.....', '..yyyyy.....', '.yyyyyy.....', '.yyyyyy.....', '..yyyy......', '............',
  ],
  musicOff: [
    '............', '.....ddddd..', '.....dddddd.', '.....dd.....', '.....dd.....', '.....dd.....',
    '.....dd.r..r', '..dddd...rr.', '.dddddd..rr.', '.dddddd.r..r', '..dddd......', '............',
  ],
  heart: [
    '............', '............', '.ooo....ooo.', 'orwro..orrro', 'orwrrrrrrrro', 'orrrrrrrrrro',
    '.orrrrrrrro.', '..orrrrrro..', '...orrrro...', '....orro....', '.....oo.....', '............',
  ],
  tea: [
    '...l..l.....', '....l..l....', '...l..l.....', '............', 'wwwwwwwwww..', 'wkkkkkkkkww.',
    'wwwwwwwwww.w', 'wwrrwwwwww.w', 'wwwwwwwwwww.', '.wwwwwwww...', '..wwwwww....', 'llllllllll..',
  ],
  sparkle: [
    '.....oo.....', '....oyyo....', '....oyyo....', '...oyYYyo...', 'oooyYYYYyooo', 'oyyYYwwYYyyo',
    'oyyYYwwYYyyo', 'oooyYYYYyooo', '...oyYYyo...', '....oyyo....', '....oyyo....', '.....oo.....',
  ],
  sleep: [
    '............', '......bbbb..', '........b...', '.......b....', '......bbbb..', '............',
    '.bbbbbb.....', '.....bb.....', '....bb......', '...bb.......', '..bb........', '.bbbbbb.....',
  ],
  wave: [
    '....s.s.....', '..s.s.s.s...', '..s.s.s.s...', '..s.s.s.s...', '..sssssss.s.', '..sssssssss.',
    '..ssssssss..', '..sssssss...', '...sssss....', '...sssss....', '..........l.', '.........l..',
  ],
  people: [
    '............', '..KK....KK..', '.KssK..KssK.', '.ssss..ssss.', '..ss....ss..', '............',
    '.rrrr..gggg.', 'rrrrr..ggggg', 'rrrrr..ggggg', 'rrrrr..ggggg', '............', '............',
  ],
  menu: [
    '............', '............', '.cccccccccc.', '.cccccccccc.', '............', '.cccccccccc.',
    '.cccccccccc.', '............', '.cccccccccc.', '.cccccccccc.', '............', '............',
  ],
  fullscreen: [
    '............', '.cccc..cccc.', '.cc......cc.', '.c........c.', '.c........c.', '............',
    '............', '.c........c.', '.c........c.', '.cc......cc.', '.cccc..cccc.', '............',
  ],
  close: [
    '............', '.cc......cc.', '..cc....cc..', '...cc..cc...', '....cccc....', '.....cc.....',
    '....cccc....', '...cc..cc...', '..cc....cc..', '.cc......cc.', '............', '............',
  ],
  bookmark: [
    '...rrrrrr...', '...rprrrr...', '...rprrrr...', '...rprrrr...', '...rprrrr...', '...rprrrr...',
    '...rprrrr...', '...rrrrrr...', '...rrrrrr...', '...rr..rr...', '...r....r...', '............',
  ],
  next: [
    '............', '.....c......', '.....cc.....', '.....ccc....', '..cccccccc..', '..ccccccccc.',
    '..cccccccc..', '.....ccc....', '.....cc.....', '.....c......', '............', '............',
  ],
  journal: [
    '..........y.', '.gggggggg.yy', '.gwwwwwwgyy.', '.gwkkkkwyy..', '.gwwwwwwk...', '.gggggggg...',
    '.gggggggg...', '.ggYgggggg..', '.gggggggg...', '.gggggggg...', '.KKKKKKKK...', '............',
  ],
  face: [
    '............', '...KKKKKK...', '..KKKKKKKK..', '..KssssssK..', '..ssKssKss..', '..ssssssss..',
    '..psssssps..', '...ssssss...', '....rrrr....', '...rrrrrr...', '..rrrrrrrr..', '............',
  ],
  fire: [
    '.....r......', '....rr......', '....rrr..r..', '...rryrr.rr.', '..rryyyrrrr.', '..ryyYYyyrr.',
    '.rryYYYYyrr.', '.ryyYwwYYyr.', '.ryYwwwwYyr.', '..ryYwwYyr..', '.kkkkkkkkkk.', '..KK....KK..',
  ],
}

const cache = new Map()

/** 외곽선이 붙은 14x14 아이콘 캔버스 */
export function iconCanvas(name) {
  if (cache.has(name)) return cache.get(name)
  let rows = ICONS[name]
  let flipX = false
  if (name === 'prev') {
    rows = ICONS.next
    flipX = true
  }
  if (!rows) return null
  const c = makeCanvas(14, 14)
  const ctx = c.getContext('2d')
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = PAL[row[x]]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(x + 1, y + 1, 1, 1)
    }
  })
  let out = outline(c, '#2a1813')
  if (flipX) out = mirror(out)
  cache.set(name, out)
  return out
}

const urlCache = new Map()
export function iconUrl(name) {
  if (!urlCache.has(name)) urlCache.set(name, iconCanvas(name)?.toDataURL() || '')
  return urlCache.get(name)
}

export const EMOTES = ['wave', 'tea', 'heart', 'sparkle', 'sleep']
export const EMOTE_LABEL = { wave: '인사', tea: '차 한 잔', heart: '좋아요', sparkle: '반짝', sleep: '졸려요' }
