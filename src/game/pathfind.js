import { COLS, ROWS, isWalkable } from './map.js'

const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]]

/**
 * BFS 길찾기. goals 중 하나에 도착하는 가장 짧은 경로(시작 타일 제외)를 반환.
 * 목표 타일은 걸을 수 없는 칸(의자)이어도 됩니다.
 */
export function findPath(sx, sy, goals) {
  if (!goals.length) return null
  const goalSet = new Set(goals.map(([x, y]) => y * COLS + x))
  const start = sy * COLS + sx
  if (goalSet.has(start)) return []
  const prev = new Int32Array(COLS * ROWS).fill(-2)
  prev[start] = -1
  const queue = [start]
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi]
    const cx = cur % COLS
    const cy = (cur / COLS) | 0
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue
      const ni = ny * COLS + nx
      if (prev[ni] !== -2) continue
      const isGoal = goalSet.has(ni)
      if (!isGoal && !isWalkable(nx, ny)) continue
      prev[ni] = cur
      if (isGoal) {
        const path = []
        for (let i = ni; i !== start; i = prev[i]) path.push([i % COLS, (i / COLS) | 0])
        return path.reverse()
      }
      queue.push(ni)
    }
  }
  return null
}

/** 걸을 수 없는 칸을 눌렀을 때, 가장 가까운 걸을 수 있는 칸 */
export function nearestWalkable(x, y) {
  let best = null
  let bestD = Infinity
  for (let yy = 0; yy < ROWS; yy++) {
    for (let xx = 0; xx < COLS; xx++) {
      if (!isWalkable(xx, yy)) continue
      const d = Math.abs(xx - x) + Math.abs(yy - y)
      if (d < bestD) {
        bestD = d
        best = [xx, yy]
      }
    }
  }
  return best
}
