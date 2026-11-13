// content/ 폴더의 마크다운을 읽어 책과 서재지기 글로 만듭니다.
// (빌드할 때 함께 묶이므로 별도 DB 없이 GitHub 에서 파일만 고치면 됩니다)

const MD = import.meta.glob('/content/{books,journal}/**/*.md', { query: '?raw', import: 'default', eager: true })
const CATEGORY_CONF = Object.values(import.meta.glob('/content/journal/categories.json', { import: 'default', eager: true }))[0] || {}
const ASSETS = import.meta.glob('/content/**/*.{jpg,jpeg,png,webp,gif}', { query: '?url', import: 'default', eager: true })

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { meta: {}, body: text }
  const meta = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+)\s*:\s*(.*)$/)
    if (!kv) continue
    let v = kv[2].trim()
    const q = v.match(/^"((?:[^"\\]|\\.)*)"|^'([^']*)'/)
    if (q) v = q[1] != null ? q[1].replace(/\\(.)/g, '$1') : q[2]
    else v = v.replace(/\s+#.*$/, '')
    meta[kv[1]] = v
  }
  return { meta, body: m[2] }
}

const stripInline = (s) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1$2')

function resolveAsset(dir, name) {
  if (!name) return null
  if (/^(https?:)?\/\//.test(name)) return name
  return ASSETS[`${dir}/${name.replace(/^\.\//, '')}`] || null
}

/** 본문 마크다운 → 블록 목록 */
export function parseBlocks(body, dir) {
  const blocks = []
  const chunks = body.replace(/\r/g, '').split(/\n{2,}/)
  for (const raw of chunks) {
    const chunk = raw.trim()
    if (!chunk) continue
    if (/^(-{3,}|\*{3,})$/.test(chunk)) {
      blocks.push({ type: 'break' })
      continue
    }
    // ![설명](그림.jpg) → 한 쪽 전체 그림, ![설명](그림.png "spot") → 글 사이의 작은 그림 ("spot large" 는 조금 크게)
    const img = chunk.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/)
    if (img) {
      const spot = (img[3] || '').startsWith('spot')
      blocks.push({ type: spot ? 'spot' : 'img', size: spot && img[3].includes('large') ? 'lg' : '', alt: img[1], src: resolveAsset(dir, img[2]) })
      continue
    }
    const h = chunk.match(/^(#{1,3})\s+(.*)$/)
    if (h) {
      blocks.push({ type: h[1].length === 1 ? 'h1' : 'h2', text: stripInline(h[2]) })
      continue
    }
    if (chunk.startsWith('>')) {
      blocks.push({ type: 'quote', text: stripInline(chunk.replace(/^>\s?/gm, '')) })
      continue
    }
    // 문단 안의 줄바꿈은 그대로 살림 (시, 블로그 글의 짧은 줄)
    blocks.push({ type: 'p', text: stripInline(chunk.replace(/[ \t]*\n[ \t]*/g, '\n')) })
  }
  return blocks
}

const books = []
const journal = []

for (const [path, text] of Object.entries(MD)) {
  const dir = path.slice(0, path.lastIndexOf('/'))
  const { meta, body } = parseFrontmatter(text)
  if (path.startsWith('/content/books/')) {
    const id = dir.split('/').pop()
    books.push({
      id,
      kind: 'book',
      title: meta.title || id,
      subtitle: meta.subtitle || '',
      author: meta.author || '',
      publisher: meta.publisher || '',
      tagline: meta.tagline || '',
      moreUrl: meta.more_url || '',
      moreLabel: meta.more_label || '책 더 알아보기',
      color: meta.color || '#c8a27a',
      order: Number(meta.order ?? 99),
      cover: resolveAsset(dir, meta.cover),
      endpaper: resolveAsset(dir, meta.endpaper),
      blocks: parseBlocks(body, dir),
    })
  } else {
    const file = path.split('/').pop().replace(/\.md$/, '')
    journal.push({
      id: `journal-${file}`,
      file,
      kind: 'journal',
      title: meta.title || file,
      date: meta.date || '',
      category: meta.category || '서재지기의 일기',
      source: meta.source || '',
      author: '서재지기',
      blocks: parseBlocks(body, dir),
    })
  }
}

books.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ko'))
// 같은 날짜면 파일 이름(블로그 글 번호) 순서로
const byOldest = (a, b) => (a.date || '').localeCompare(b.date || '') || a.file.localeCompare(b.file)
journal.sort((a, b) => byOldest(b, a))

/** 카테고리별 글 (content/journal/categories.json 의 order: oldest 면 처음 글부터) */
const byCategory = {}
for (const j of journal) (byCategory[j.category] ||= []).push(j)
for (const [cat, list] of Object.entries(byCategory)) {
  if (CATEGORY_CONF[cat]?.order === 'oldest') list.sort(byOldest)
}

export const BOOKS = books
export const JOURNAL = journal
export const JOURNAL_CATEGORIES = Object.keys(byCategory).map((name) => ({
  name,
  desc: CATEGORY_CONF[name]?.desc || '',
  order: CATEGORY_CONF[name]?.order === 'oldest' ? 'oldest' : 'newest',
  posts: byCategory[name],
  latest: journal.find((j) => j.category === name)?.date || '',
}))
JOURNAL_CATEGORIES.sort((a, b) => b.latest.localeCompare(a.latest))
export const postsOf = (category) => byCategory[category] || []

const ALL_ITEMS = new Map([...books, ...journal].map((it) => [it.id, it]))
export const findItem = (id) => ALL_ITEMS.get(id) || null

/** 같은 카테고리에서 다음에 읽을 글 */
export function nextPost(item) {
  if (item?.kind !== 'journal') return null
  const list = postsOf(item.category)
  const i = list.findIndex((j) => j.id === item.id)
  return i >= 0 ? list[i + 1] || null : null
}
export const randomBook = () => BOOKS[Math.floor(Math.random() * BOOKS.length)]
