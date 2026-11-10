// 캐릭터와 이름은 세션 스토리지에 저장합니다.
// (같은 탭에서 새로고침하거나 다시 들어오면 입장 화면 없이 바로 서재로 들어갑니다)
const KEY = 'lik3book.profile.v1'

export function loadProfile() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (typeof p?.name === 'string' && typeof p?.charId === 'string') return p
  } catch {
    /* 저장소 사용 불가 */
  }
  return null
}

export function saveProfile(profile) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    /* 무시 */
  }
}

export function clearProfile() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* 무시 */
  }
}
