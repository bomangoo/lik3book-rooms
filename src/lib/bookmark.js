// 책갈피: 읽던 위치를 세션 스토리지에 저장 (블록 번호 + 글자 위치라 화면 크기가 바뀌어도 같은 곳을 찾음)
const key = (id) => `lik3book.bookmark.v1.${id}`

export function loadBookmark(id) {
  try {
    const raw = sessionStorage.getItem(key(id))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveBookmark(id, mark) {
  try {
    sessionStorage.setItem(key(id), JSON.stringify({ ...mark, at: Date.now() }))
  } catch {
    /* 저장소 사용 불가 */
  }
}

export function clearBookmark(id) {
  try {
    sessionStorage.removeItem(key(id))
  } catch {
    /* 무시 */
  }
}
