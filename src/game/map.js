// 서재 배치도: 24 x 16 타일 (1타일 = 16px)
export const TILE = 16
export const COLS = 24
export const ROWS = 16
export const WORLD_W = COLS * TILE
export const WORLD_H = ROWS * TILE
export const WALL_ROWS = 3 // 0~2행은 벽면

/**
 * 오브젝트: x,y,w,h 는 바닥 점유(타일) 영역.
 * interact: 'shelf' | 'fire' | 'tree' | 'pile' | 'window' | 'seat'
 * seats: 앉을 수 있는 자리 (그 타일 위에서 dir 방향을 바라봄)
 */
export const OBJECTS = [
  // 벽쪽 책장
  { id: 'shelf-1', type: 'shelf', x: 1, y: 3, w: 3, h: 1, seed: 11, interact: 'shelf' },
  { id: 'shelf-2', type: 'shelf', x: 4, y: 3, w: 3, h: 1, seed: 23, interact: 'shelf' },
  { id: 'shelf-3', type: 'shelf', x: 17, y: 3, w: 3, h: 1, seed: 37, interact: 'shelf' },
  { id: 'shelf-4', type: 'shelf', x: 20, y: 3, w: 3, h: 1, seed: 51, interact: 'shelf' },
  // 창가 벤치 (정면)
  {
    id: 'bench-l', type: 'bench', x: 7, y: 3, w: 2, h: 1, color: '#9a4a5a', interact: 'seat',
    seats: [{ x: 7, y: 3, dir: 'down' }, { x: 8, y: 3, dir: 'down' }],
  },
  {
    id: 'bench-r', type: 'bench', x: 15, y: 3, w: 2, h: 1, color: '#4f7a62', interact: 'seat',
    seats: [{ x: 15, y: 3, dir: 'down' }, { x: 16, y: 3, dir: 'down' }],
  },
  // 벽난로
  { id: 'fireplace', type: 'fireplace', x: 10, y: 3, w: 4, h: 1, interact: 'fire' },
  // 벽난로 앞: 마주 보는 안락의자 + 찻상
  { id: 'armchair-l', type: 'armchairSide', dir: 'right', x: 9, y: 7, w: 1, h: 1, color: '#b5653b', throw: '#3f7a4f', interact: 'seat', seats: [{ x: 9, y: 7, dir: 'right' }] },
  { id: 'armchair-r', type: 'armchairSide', dir: 'left', x: 14, y: 7, w: 1, h: 1, color: '#7d9b6a', throw: '#c8384f', interact: 'seat', seats: [{ x: 14, y: 7, dir: 'left' }] },
  { id: 'sidetable-l', type: 'sideTable', x: 8, y: 7, w: 1, h: 1 },
  { id: 'sidetable-r', type: 'sideTable', x: 15, y: 7, w: 1, h: 1 },
  { id: 'teatable', type: 'teaTable', x: 11, y: 7, w: 2, h: 1 },
  // 벽난로를 바라보는 소파
  {
    id: 'sofa', type: 'sofaUp', x: 10, y: 10, w: 4, h: 1, color: '#5b7f6a', interact: 'seat',
    seats: [{ x: 10, y: 10, dir: 'up' }, { x: 11, y: 10, dir: 'up' }, { x: 12, y: 10, dir: 'up' }, { x: 13, y: 10, dir: 'up' }],
  },
  // 흔들의자 (정면)
  { id: 'rocking', type: 'rockingChair', x: 6, y: 6, w: 1, h: 1, color: '#c8384f', interact: 'seat', seats: [{ x: 6, y: 6, dir: 'down' }] },
  // 서재지기의 책상 (일기장)
  { id: 'desk', type: 'desk', x: 2, y: 8, w: 3, h: 1, interact: 'journal' },
  { id: 'deskchair', type: 'chairUp', x: 3, y: 9, w: 1, h: 1, color: '#c8384f', interact: 'seat', seats: [{ x: 3, y: 9, dir: 'up' }] },
  // 독서 구석: 정면 안락의자 + 스탠드
  { id: 'readchair', type: 'armchairDown', x: 2, y: 12, w: 1, h: 1, color: '#d9a441', throw: '#c8384f', interact: 'seat', seats: [{ x: 2, y: 12, dir: 'down' }] },
  { id: 'lamptable', type: 'lampTable', x: 1, y: 12, w: 1, h: 1 },
  // 크리스마스 트리
  { id: 'tree', type: 'tree', x: 19, y: 10, w: 3, h: 2, interact: 'tree' },
  { id: 'gift-1', type: 'gift', x: 18, y: 11, w: 1, h: 1, color: '#c8384f', ribbon: '#ffd84a' },
  { id: 'gift-2', type: 'gift', x: 22, y: 11, w: 1, h: 1, color: '#3a6fb5', ribbon: '#f3e9dc' },
  { id: 'gift-3', type: 'gift', x: 20, y: 12, w: 1, h: 1, color: '#3f8f5a', ribbon: '#e85d75' },
  // 빈백 (정면)
  { id: 'beanbag-1', type: 'beanbag', x: 17, y: 9, w: 1, h: 1, color: '#d9a441', interact: 'seat', seats: [{ x: 17, y: 9, dir: 'down' }] },
  { id: 'beanbag-2', type: 'beanbag', x: 18, y: 13, w: 1, h: 1, color: '#8b5a7a', interact: 'seat', seats: [{ x: 18, y: 13, dir: 'down' }] },
  // 책 더미
  { id: 'pile-1', type: 'pile', x: 9, y: 4, w: 1, h: 1, seed: 3, interact: 'pile' },
  { id: 'pile-2', type: 'pile', x: 14, y: 4, w: 1, h: 1, seed: 8, interact: 'pile', top: 'mug' },
  { id: 'pile-3', type: 'pile', x: 5, y: 9, w: 1, h: 1, seed: 15, interact: 'pile', top: 'candle' },
  { id: 'pile-4', type: 'pile', x: 1, y: 9, w: 1, h: 1, seed: 21, interact: 'pile' },
  { id: 'pile-5', type: 'pile', x: 6, y: 13, w: 1, h: 1, seed: 29, interact: 'pile', top: 'cat' },
  { id: 'pile-6', type: 'pile', x: 15, y: 13, w: 1, h: 1, seed: 33, interact: 'pile' },
  { id: 'pile-7', type: 'pile', x: 22, y: 8, w: 1, h: 1, seed: 41, interact: 'pile', top: 'candle' },
  { id: 'pile-8', type: 'pile', x: 8, y: 11, w: 1, h: 1, seed: 47, interact: 'pile' },
  // 소품
  { id: 'floorlamp', type: 'floorLamp', x: 22, y: 4, w: 1, h: 1 },
  { id: 'plant-1', type: 'plant', x: 1, y: 14, w: 1, h: 1 },
  { id: 'plant-2', type: 'plant', x: 22, y: 14, w: 1, h: 1 },
]

/** 벽에 붙은 창문 (배경) */
export const WINDOWS = [
  { x: 7 * TILE + 3, y: 7, w: 2 * TILE - 6, h: 30 },
  { x: 15 * TILE + 3, y: 7, w: 2 * TILE - 6, h: 30 },
]

/** 족자 (배경) */
export const SCROLLS = [
  { x: 9 * TILE + 3, y: 8, text: '讀' },
  { x: 14 * TILE + 3, y: 8, text: '靜' },
]

export const SPAWN_TILES = [
  [11, 13], [12, 13], [10, 13], [13, 13], [11, 14], [12, 14],
]

/** 광원 (조명 패스에서 사용) */
export const LIGHTS = [
  { kind: 'fire', x: 12 * TILE, y: 3 * TILE + 10, r: 130, color: [255, 150, 60] },
  { kind: 'lamp', x: 4 * TILE + 6, y: 8 * TILE - 10, r: 54, color: [255, 210, 120] },
  { kind: 'lamp', x: 22 * TILE + 8, y: 4 * TILE - 16, r: 64, color: [255, 200, 120] },
  { kind: 'lamp', x: 1 * TILE + 8, y: 12 * TILE - 8, r: 52, color: [255, 200, 120] },
  { kind: 'candle', x: 8 * TILE + 8, y: 7 * TILE + 2, r: 30, color: [255, 180, 90] },
  { kind: 'candle', x: 15 * TILE + 8, y: 7 * TILE + 2, r: 30, color: [255, 180, 90] },
  { kind: 'candle', x: 12 * TILE + 12, y: 7 * TILE + 2, r: 34, color: [255, 180, 90] },
  { kind: 'candle', x: 5 * TILE + 8, y: 9 * TILE - 6, r: 22, color: [255, 180, 90] },
  { kind: 'candle', x: 22 * TILE + 8, y: 8 * TILE - 6, r: 22, color: [255, 180, 90] },
  { kind: 'tree', x: 20 * TILE + 8, y: 10 * TILE, r: 64, color: [255, 220, 150] },
  { kind: 'window', x: 8 * TILE, y: 3 * TILE + 4, r: 40, color: [150, 180, 255] },
  { kind: 'window', x: 16 * TILE, y: 3 * TILE + 4, r: 40, color: [150, 180, 255] },
]

// ── 충돌 격자 ──
const blocked = Array.from({ length: ROWS }, (_, y) =>
  Array.from({ length: COLS }, (_, x) => y < WALL_ROWS || y === ROWS - 1 || x === 0 || x === COLS - 1),
)
const seatAt = new Map()
for (const o of OBJECTS) {
  for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) blocked[yy][xx] = true
  for (const s of o.seats || []) seatAt.set(`${s.x},${s.y}`, { ...s, object: o })
}

export const inBounds = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS
export const isWalkable = (x, y) => inBounds(x, y) && !blocked[y][x]
export const getSeat = (x, y) => seatAt.get(`${x},${y}`) || null
export const ALL_SEATS = [...seatAt.values()]

/** 오브젝트 주변의 걸을 수 있는 타일 */
export function approachTiles(o) {
  const out = []
  for (let yy = o.y - 1; yy <= o.y + o.h; yy++) {
    for (let xx = o.x - 1; xx <= o.x + o.w; xx++) {
      const inside = xx >= o.x && xx < o.x + o.w && yy >= o.y && yy < o.y + o.h
      const diagonal = (xx < o.x || xx >= o.x + o.w) && (yy < o.y || yy >= o.y + o.h)
      if (!inside && !diagonal && isWalkable(xx, yy)) out.push([xx, yy])
    }
  }
  return out
}
