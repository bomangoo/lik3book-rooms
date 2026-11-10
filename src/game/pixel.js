// 픽셀 아트용 도우미: 캔버스 생성, 자동 외곽선, 시드 난수, 색상 보정

export function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** 사각형 붓: p(x, y, w, h, color) */
export function painter(ctx) {
  return (x, y, w, h, color) => {
    if (!color) return
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }
}

export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex)
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))))
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** 불투명 픽셀 둘레에 1px 외곽선을 그립니다. */
export function outline(canvas, color = '#2b1b1e') {
  const ctx = canvas.getContext('2d')
  const { width: w, height: h } = canvas
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const out = new Uint8ClampedArray(d)
  const [r, g, b] = hexToRgb(color)
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (d[i + 3] > 40) continue
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        out[i] = r
        out[i + 1] = g
        out[i + 2] = b
        out[i + 3] = 255
      }
    }
  }
  ctx.putImageData(new ImageData(out, w, h), 0, 0)
  return canvas
}

export function mirror(canvas) {
  const c = makeCanvas(canvas.width, canvas.height)
  const ctx = c.getContext('2d')
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(canvas, 0, 0)
  return c
}

export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)]
