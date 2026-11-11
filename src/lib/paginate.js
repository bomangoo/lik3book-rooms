// 화면에 맞춰 본문을 쪽 단위로 나눕니다.
// 숨겨 둔 측정용 요소에 실제와 같은 스타일로 그려 보면서, 넘치면 다음 쪽으로 넘깁니다.

export const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

export function blockClass(item) {
  if (item.type === 'h1') return 'pg-h1'
  if (item.type === 'h2') return 'pg-h2'
  if (item.type === 'quote') return 'pg-quote'
  return item.cont ? 'pg-p cont' : 'pg-p'
}

const TAG = { h1: 'h2', h2: 'h3', quote: 'blockquote', p: 'p' }

function html(items) {
  return items.map((it) => `<${TAG[it.type]} class="${blockClass(it)}">${esc(it.text)}</${TAG[it.type]}>`).join('')
}

/**
 * @param {Array} blocks parseBlocks 결과
 * @param {HTMLElement} el 측정용 요소 (쪽 본문과 같은 크기/글꼴)
 * @param {{headHtml?: string}} opt 첫 쪽 위에 들어갈 머리말(일기 제목 등)
 * @returns {Array} 쪽 목록 {kind:'text', items, start:{b,o}} | {kind:'image', src, alt, start}
 */
export function paginate(blocks, el, { headHtml = '' } = {}) {
  const pages = []
  let cur = []
  let start = { b: 0, o: 0 }
  const fits = (items) => {
    el.innerHTML = (pages.length === 0 ? headHtml : '') + html(items)
    return el.scrollHeight <= el.clientHeight + 1
  }
  const flush = () => {
    if (!cur.length) return
    // 제목이 쪽 끝에 홀로 남지 않도록 다음 쪽으로
    const last = cur[cur.length - 1]
    let carry = null
    if (cur.length > 1 && (last.type === 'h1' || last.type === 'h2')) carry = cur.pop()
    pages.push({ kind: 'text', items: cur, start })
    cur = []
    if (carry) {
      cur.push(carry)
      start = { b: carry.b, o: 0 }
    }
  }

  for (let b = 0; b < blocks.length; b++) {
    const bl = blocks[b]
    if (bl.type === 'break') {
      flush()
      if (cur.length) flush()
      start = { b: b + 1, o: 0 }
      continue
    }
    if (bl.type === 'img') {
      flush()
      if (cur.length) flush()
      pages.push({ kind: 'image', src: bl.src, alt: bl.alt, start: { b, o: 0 } })
      start = { b: b + 1, o: 0 }
      continue
    }
    const text = bl.text
    let offset = 0
    for (let guard = 0; guard < 500; guard++) {
      if (!cur.length) start = { b, o: offset }
      const item = { type: bl.type, text: text.slice(offset), cont: offset > 0, b, o: offset }
      if (fits([...cur, item])) {
        cur.push(item)
        break
      }
      if (bl.type === 'h1' || bl.type === 'h2') {
        if (!cur.length) {
          cur.push(item)
          break
        }
        flush()
        continue
      }
      // 문단을 쪼개서 들어가는 만큼만 넣기
      let lo = 0
      let hi = text.length - offset
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2)
        if (fits([...cur, { ...item, text: text.slice(offset, offset + mid) }])) lo = mid
        else hi = mid - 1
      }
      let cut = lo
      // 띄어쓰기나 줄바꿈 자리에서 끊기
      const sp = Math.max(text.lastIndexOf(' ', offset + cut), text.lastIndexOf('\n', offset + cut))
      if (sp > offset && sp - offset > cut * 0.6) cut = sp - offset + 1
      if (cut <= 0) {
        if (!cur.length) {
          // 빈 쪽에도 안 들어가면 그냥 넣음 (아주 긴 단어 등)
          cur.push(item)
          break
        }
        flush()
        continue
      }
      cur.push({ ...item, text: text.slice(offset, offset + cut).trimEnd() })
      offset += cut
      while (text[offset] === ' ' || text[offset] === '\n') offset++
      flush()
      if (offset >= text.length) break
    }
  }
  flush()
  if (cur.length) flush()
  el.innerHTML = ''
  return pages
}

/** 위치 {b,o} 가 들어 있는 쪽 번호 */
export function pageOf(pages, pos) {
  if (!pos) return -1
  let found = -1
  pages.forEach((p, i) => {
    if (!p.start) return
    if (p.start.b < pos.b || (p.start.b === pos.b && p.start.o <= pos.o)) found = i
  })
  return found
}
