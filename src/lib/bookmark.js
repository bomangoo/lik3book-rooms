// 책갈피: 읽던 위치를 브라우저에 저장 (블록 번호 + 글자 위치라 화면 크기가 바뀌어도 같은 곳을 찾음)
// 로컬 스토리지에 두어 탭을 닫았다 다시 와도 이어 읽을 수 있어요.
const key = (id) => `lik3book.bookmark.v1.${id}`
const LAST = 'lik3book.lastRead.v1'

function store() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function read(k) {
  try {
    const raw = store()?.getItem(k) ?? sessionStorage.getItem(k) // 예전(세션) 책갈피도 읽어 줌
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(k, v) {
  try {
    if (v == null) {
      store()?.removeItem(k)
      sessionStorage.removeItem(k)
    } else store()?.setItem(k, JSON.stringify(v))
  } catch {
    /* 저장소 사용 불가 */
  }
}

export const loadBookmark = (id) => read(key(id))
export const saveBookmark = (id, mark) => write(key(id), { ...mark, at: Date.now() })
export const clearBookmark = (id) => write(key(id), null)

/** 마지막으로 읽던 책/글 */
export const loadLastRead = () => read(LAST)
export const saveLastRead = (id) => write(LAST, { id, at: Date.now() })
