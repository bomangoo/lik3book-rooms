// 벽난로 장작 소리 (Web Audio 로 합성 — 별도 음원 파일 없음)
let ctx = null
let master = null
let crackleTimer = null

function noiseBuffer(ac, seconds, brown = false) {
  const len = ac.sampleRate * seconds
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (brown) {
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    } else d[i] = w
  }
  return buf
}

export function startAmbience() {
  if (ctx) {
    ctx.resume()
    master.gain.setTargetAtTime(0.6, ctx.currentTime, 0.5)
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)
  master.gain.setTargetAtTime(0.6, ctx.currentTime, 0.8)

  // 낮게 웅웅대는 불 소리
  const rumble = ctx.createBufferSource()
  rumble.buffer = noiseBuffer(ctx, 4, true)
  rumble.loop = true
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 420
  const rg = ctx.createGain()
  rg.gain.value = 0.35
  rumble.connect(lp).connect(rg).connect(master)
  rumble.start()

  const pop = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate)
  const pd = pop.getChannelData(0)
  for (let i = 0; i < pd.length; i++) pd[i] = (Math.random() * 2 - 1) * (1 - i / pd.length) ** 3

  const crackle = () => {
    const n = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < n; i++) {
      const s = ctx.createBufferSource()
      s.buffer = pop
      s.playbackRate.value = 0.6 + Math.random() * 1.2
      const hp = ctx.createBiquadFilter()
      hp.type = 'bandpass'
      hp.frequency.value = 1500 + Math.random() * 3000
      const g = ctx.createGain()
      g.gain.value = 0.15 + Math.random() * 0.35
      s.connect(hp).connect(g).connect(master)
      s.start(ctx.currentTime + i * (0.02 + Math.random() * 0.05))
    }
    crackleTimer = setTimeout(crackle, 80 + Math.random() * 600)
  }
  crackle()
}

export function stopAmbience() {
  if (!ctx) return
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.3)
}

export function disposeAmbience() {
  clearTimeout(crackleTimer)
  ctx?.close()
  ctx = null
}
