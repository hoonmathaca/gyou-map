/** 이 브라우저를 구분하는 임의 키 — 같은 브라우저의 중복 신고를 막는 데만 쓴다 */
export function deviceKey(): string {
  const KEY = 'gyou.device'
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && saved.length >= 8) return saved
    const value = crypto.randomUUID().replace(/-/g, '')
    localStorage.setItem(KEY, value)
    return value
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 임시 키 (이번 방문에서만 중복 방지)
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  }
}

/** 지난번 리뷰에 쓴 닉네임을 기억해 둔다 (다음 리뷰에 미리 채워 준다) */
export function rememberNickname(name: string) {
  try {
    localStorage.setItem('gyou.nickname', name)
  } catch {
    /* noop */
  }
}

export function savedNickname(): string {
  try {
    return localStorage.getItem('gyou.nickname') ?? ''
  } catch {
    return ''
  }
}
