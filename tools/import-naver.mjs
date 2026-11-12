// 네이버 블로그 글을 '서재지기의 책상'으로 가져옵니다.
//
// 사용 (GitHub Actions 의 "Import Naver Blog" 버튼이 이 스크립트를 실행합니다):
//   NAVER_CATEGORIES="서재일기,책 이야기" node tools/import-naver.mjs
//   POST_URLS="https://blog.naver.com/lik3book/224257280672" node tools/import-naver.mjs
//
// 환경 변수
//   NAVER_BLOG_ID     블로그 아이디 (기본 lik3book)
//   NAVER_CATEGORIES  가져올 카테고리 이름들 (쉼표로 구분). 비우면 카테고리 목록만 보여 주고 끝납니다.
//   POST_URLS         카테고리와 상관없이 꼭 가져올 글 주소들 (쉼표로 구분, 선택)
//   OVERWRITE         'true' 면 이미 가져온 글도 다시 가져옴
import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'node-html-parser'

const BLOG_ID = process.env.NAVER_BLOG_ID || 'lik3book'
const CATEGORIES = split(process.env.NAVER_CATEGORIES)
const POST_URLS = split(process.env.POST_URLS)
const OVERWRITE = process.env.OVERWRITE === 'true'
const OUT_DIR = path.resolve('content/journal')
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

function split(v) {
  return (v || '').split(',').map((s) => s.trim()).filter(Boolean)
}

async function get(url, { binary = false } = {}) {
  const res = await fetch(url, { headers: { 'user-agent': UA, referer: `https://blog.naver.com/${BLOG_ID}` } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return binary ? { buf: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') || '' } : res.text()
}

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))
  return m ? decode(m[1]) : ''
}

const safeDecode = (s) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

const logNoOf = (url) => (url.match(/(\d{9,})/) || [])[1]

/** '2026. 5. 9. 10:42' 같은 네이버 날짜 → YYYY-MM-DD (상대 시간이면 오늘) */
function parseDate(s) {
  const m = s.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return s ? kstDate(Date.now()) : ''
}

/** 한국 시간 기준 YYYY-MM-DD */
function kstDate(d) {
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return new Date().toISOString().slice(0, 10)
  return new Date(t.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

const postHtmlCache = new Map()
async function getPostHtml(logNo) {
  if (!postHtmlCache.has(logNo)) {
    postHtmlCache.set(
      logNo,
      await get(`https://blog.naver.com/PostView.naver?blogId=${BLOG_ID}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=false`),
    )
  }
  return postHtmlCache.get(logNo)
}

/** 블로그 전체 글 목록 {logNo, title, categoryNo} (RSS 는 최근 50개뿐이라 따로 읽음) */
async function listAll() {
  const out = []
  for (let page = 1; page <= 100; page++) {
    const url = `https://blog.naver.com/PostTitleListAsync.naver?blogId=${BLOG_ID}&viewdate=&currentPage=${page}&categoryNo=0&parentCategoryNo=&countPerPage=30`
    const text = await get(url)
    const items = [...text.matchAll(/\{[^{}]*"logNo"[^{}]*\}/g)].map(([obj]) => ({
      logNo: (obj.match(/"logNo"\s*:\s*"?(\d+)/) || [])[1],
      title: safeDecode(((obj.match(/"title"\s*:\s*"([^"]*)"/) || [])[1] || '').replace(/\+/g, ' ')),
      categoryNo: (obj.match(/"categoryNo"\s*:\s*"?(\d+)/) || [])[1],
    }))
    if (page === 1 && !items.length) console.warn(`  ! 글 목록 형식을 읽지 못했어요: ${text.slice(0, 200)}`)
    const fresh = items.filter((i) => i.logNo && !out.some((o) => o.logNo === i.logNo))
    out.push(...fresh)
    if (!fresh.length) break
  }
  return out
}

async function readFeed() {
  const xml = await get(`https://rss.blog.naver.com/${BLOG_ID}.xml`)
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => ({
    title: tag(it, 'title'),
    link: tag(it, 'link'),
    category: tag(it, 'category'),
    date: tag(it, 'pubDate'),
    description: tag(it, 'description'),
  }))
}

const clean = (s) => s.replace(/[​ ﻿]/g, ' ').replace(/[ \t]+/g, ' ').trim()

/** 스마트에디터 본문 → 블록 [{type:'p'|'quote'|'h2'|'img'|'break', text|src}] */
function parsePost(html) {
  const root = parse(html)
  const meta = {
    title: clean(root.querySelector('.se-title-text')?.text || root.querySelector('.pcol1')?.text || ''),
    category: clean(root.querySelector('.blog2_series a, .cate a')?.text || ''),
    date: parseDate(clean(root.querySelector('.se_publishDate, .date')?.text || '')),
  }
  const main = root.querySelector('.se-main-container')
  const blocks = []
  if (main) {
    for (const comp of main.querySelectorAll('.se-component')) {
      const cls = comp.classNames || comp.getAttribute('class') || ''
      if (cls.includes('se-image') || cls.includes('se-imageStrip') || cls.includes('se-imageGroup')) {
        for (const img of comp.querySelectorAll('img')) {
          const src = img.getAttribute('data-lazy-src') || img.getAttribute('src')
          if (src && !src.startsWith('data:')) blocks.push({ type: 'img', src, alt: clean(comp.querySelector('.se-caption')?.text || '') })
        }
      } else if (cls.includes('se-horizontalLine')) {
        blocks.push({ type: 'break' })
      } else if (cls.includes('se-sectionTitle')) {
        const t = clean(comp.text)
        if (t) blocks.push({ type: 'h2', text: t })
      } else if (cls.includes('se-quotation')) {
        const t = comp.querySelectorAll('.se-quote p, .se-text-paragraph').map((p) => clean(p.text)).filter(Boolean).join('\n')
        if (t) blocks.push({ type: 'quote', text: t })
      } else if (cls.includes('se-text')) {
        // 빈 줄을 경계로 문단을 나누고, 같은 문단 안의 줄바꿈은 살림
        let lines = []
        const flush = () => {
          if (lines.length) blocks.push({ type: 'p', text: lines.join('\n') })
          lines = []
        }
        for (const p of comp.querySelectorAll('.se-text-paragraph')) {
          const t = clean(p.text)
          if (t) lines.push(t)
          else flush()
        }
        flush()
      }
    }
  } else {
    // 예전 에디터로 쓴 글
    const old = root.querySelector('#postViewArea, .post-view')
    if (old) for (const p of old.text.split(/\n\s*\n/)) if (clean(p)) blocks.push({ type: 'p', text: clean(p) })
  }
  return { meta, blocks }
}

function fromDescription(desc) {
  const root = parse(desc)
  const blocks = root.text.split(/\n\s*\n/).map(clean).filter(Boolean).map((text) => ({ type: 'p', text }))
  for (const img of root.querySelectorAll('img')) blocks.push({ type: 'img', src: img.getAttribute('src'), alt: '' })
  return blocks
}

const extOf = (type, url) => {
  if (type.includes('png')) return 'png'
  if (type.includes('gif')) return 'gif'
  if (type.includes('webp')) return 'webp'
  const m = url.match(/\.(jpe?g|png|gif|webp)(\?|$)/i)
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg'
}

/** 네이버 사진은 다른 사이트에서 바로 못 불러오는 경우가 많아 저장소에 받아 둠 */
async function saveImages(blocks, dir, rel) {
  let n = 0
  for (const b of blocks) {
    if (b.type !== 'img') continue
    const url = b.src.replace(/\?type=\w+/, '') + '?type=w966'
    try {
      const { buf, type } = await get(url, { binary: true })
      const name = `img-${++n}.${extOf(type, b.src)}`
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, name), buf)
      b.file = `${rel}/${name}`
    } catch (e) {
      console.warn(`  ! 사진을 받지 못했어요: ${e.message}`)
    }
  }
}

function toMarkdown({ title, date, category, link }, blocks) {
  const esc = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  const body = blocks
    .map((b) => {
      if (b.type === 'img') return b.file ? `![${b.alt || ''}](${b.file})` : ''
      if (b.type === 'break') return '---'
      if (b.type === 'h2') return `## ${b.text}`
      if (b.type === 'quote') return b.text.split('\n').map((l) => `> ${l}`).join('\n')
      return b.text
    })
    .filter(Boolean)
    .join('\n\n')
  return `---\ntitle: ${esc(title)}\ndate: ${date}\ncategory: ${esc(category)}\nsource: ${link}\n---\n\n${body}\n`
}

function existingFile(logNo) {
  if (!fs.existsSync(OUT_DIR)) return null
  return fs.readdirSync(OUT_DIR).find((f) => f.endsWith(`-naver-${logNo}.md`)) || null
}

async function importPost(item) {
  const logNo = logNoOf(item.link)
  if (!logNo) return console.warn(`  ! 글 번호를 찾지 못했어요: ${item.link}`)
  const prev = existingFile(logNo)
  if (prev && !OVERWRITE) return console.log(`  - 이미 있음: ${prev}`)

  let blocks = []
  let meta = {}
  try {
    ;({ meta, blocks } = parsePost(await getPostHtml(logNo)))
  } catch (e) {
    console.warn(`  ! 본문 페이지를 읽지 못했어요 (${e.message}). RSS 요약으로 대신합니다.`)
  }
  if (!blocks.some((b) => b.type === 'p') && item.description) blocks = fromDescription(item.description)

  const post = {
    title: item.title || meta.title || `블로그 글 ${logNo}`,
    category: item.category || meta.category || '서재지기의 일기',
    date: item.date ? kstDate(item.date) : meta.date || kstDate(Date.now()),
    link: `https://blog.naver.com/${BLOG_ID}/${logNo}`,
  }
  const base = `${post.date}-naver-${logNo}`
  if (prev && prev !== `${base}.md`) fs.rmSync(path.join(OUT_DIR, prev))
  await saveImages(blocks, path.join(OUT_DIR, base), base)
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, `${base}.md`), toMarkdown(post, blocks))
  const imgs = blocks.filter((b) => b.file).length
  console.log(`  + ${base}.md  「${post.title}」 [${post.category}] 문단 ${blocks.filter((b) => b.type === 'p').length}개, 사진 ${imgs}장`)
}

async function main() {
  console.log(`네이버 블로그: ${BLOG_ID}`)
  const feed = await readFeed()
  const cats = [...new Set(feed.map((i) => i.category).filter(Boolean))]
  console.log(`RSS 최근 글 ${feed.length}개 · 카테고리: ${cats.join(' / ') || '(없음)'}`)

  const targets = []
  if (CATEGORIES.length) {
    for (const it of feed) if (CATEGORIES.includes(it.category)) targets.push(it)
    console.log(`\n카테고리 [${CATEGORIES.join(', ')}] 최근 글 ${targets.length}개`)
    // RSS 에 없는 예전 글까지: 전체 목록에서, RSS 로 확인된 같은 카테고리 글의 카테고리 번호로 골라냄
    try {
      const all = await listAll()
      console.log(`  · 블로그 전체 글 ${all.length}개 확인`)
      for (const name of CATEGORIES) {
        const known = new Set(feed.filter((f) => f.category === name).map((f) => logNoOf(f.link)))
        const nos = new Set(all.filter((p) => known.has(p.logNo) && p.categoryNo).map((p) => p.categoryNo))
        if (!nos.size) {
          console.warn(`  ! [${name}] 카테고리 번호를 찾지 못해 최근 글만 가져와요`)
          continue
        }
        let added = 0
        const inCat = all.filter((p) => nos.has(p.categoryNo))
        for (const p of inCat) {
          if (targets.some((t) => logNoOf(t.link) === p.logNo)) continue
          targets.push({ link: `https://blog.naver.com/${BLOG_ID}/${p.logNo}`, title: p.title, category: name, date: '', description: '' })
          added++
        }
        console.log(`  · [${name}] (카테고리 번호 ${[...nos].join(',')}) 전체 ${inCat.length}개, 예전 글 ${added}개 추가`)
      }
    } catch (e) {
      console.warn(`  ! 예전 글 목록을 읽지 못했어요: ${e.message}`)
    }
  }
  for (const url of POST_URLS) {
    const logNo = logNoOf(url)
    if (!logNo || targets.some((t) => logNoOf(t.link) === logNo)) continue
    targets.push(feed.find((f) => logNoOf(f.link) === logNo) || { link: url, title: '', category: '', date: '', description: '' })
  }
  if (!CATEGORIES.length && !POST_URLS.length) {
    console.log('\n가져올 카테고리를 정하지 않아 목록만 보여 드렸어요. 위 카테고리 이름 중에서 골라 주세요.')
    return
  }
  for (const it of targets) await importPost(it)
  console.log('\n끝!')
}

export { parsePost, toMarkdown }

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
