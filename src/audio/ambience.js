// 서재의 소리: 배경음악 + 벽난로 + 책장 넘기는 소리
// - 배경음악: AI 생성 피아노 곡(끝과 처음을 교차 페이드해 자연스럽게 반복)
// - 벽난로/책장 소리: tools/make_audio.py 로 합성한 파일
// Web Audio 버퍼 반복 재생이라 이음매 없이 끊김 없이 돕니다.

const BASE = import.meta.env.BASE_URL || './'
const FILES = {
  bgm: `${BASE}audio/winter-library-bgm-loop.mp3`,
  fire: `${BASE}audio/fireplace.mp3`,
  flip: [1, 2, 3].map((i) => `${BASE}audio/page-flip-${i}.mp3`),
}
const LEVEL = { bgm: 0.42, fire: 0.3, flip: 0.55 }

let ctx = null
let master = null
let loops = null
const buffers = new Map()

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

async function load(url) {
  if (buffers.has(url)) return buffers.get(url)
  const p = fetch(url)
    .then((r) => r.arrayBuffer())
    .then((data) => new Promise((res, rej) => ctx.decodeAudioData(data, res, rej)))
  buffers.set(url, p)
  return p
}

function loop(buffer, level) {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const gain = ctx.createGain()
  gain.gain.value = 0
  src.connect(gain).connect(master)
  src.start()
  gain.gain.setTargetAtTime(level, ctx.currentTime, 1.2)
  return { src, gain, level }
}

/** 배경음악 + 벽난로 소리 켜기 (사용자 조작 안에서 호출해야 함) */
export async function startAmbience() {
  if (!audioCtx()) return
  if (loops) {
    for (const l of Object.values(loops)) l.gain.gain.setTargetAtTime(l.level, ctx.currentTime, 0.8)
    return
  }
  loops = {}
  const [bgm, fire] = await Promise.all([load(FILES.bgm), load(FILES.fire)])
  loops.bgm = loop(bgm, LEVEL.bgm)
  loops.fire = loop(fire, LEVEL.fire)
}

export function stopAmbience() {
  if (!ctx || !loops) return
  for (const l of Object.values(loops)) l.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
}

export function disposeAmbience() {
  if (!ctx || !loops) return
  for (const l of Object.values(loops)) {
    try {
      l.src.stop()
    } catch {
      /* 이미 멈춤 */
    }
  }
  loops = null
}

let lastFlip = -1
/** 책장 넘기는 소리 */
export async function playPageFlip() {
  if (!audioCtx()) return
  let i = Math.floor(Math.random() * FILES.flip.length)
  if (i === lastFlip) i = (i + 1) % FILES.flip.length
  lastFlip = i
  try {
    const buf = await load(FILES.flip[i])
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = 0.92 + Math.random() * 0.16
    const g = ctx.createGain()
    g.gain.value = LEVEL.flip
    src.connect(g).connect(master)
    src.start()
  } catch {
    /* 소리 없이 계속 */
  }
}

/** 미리 받아두기 (첫 넘김이 늦지 않도록) */
export function preloadPageFlip() {
  if (!audioCtx()) return
  FILES.flip.forEach((u) => load(u).catch(() => {}))
}
