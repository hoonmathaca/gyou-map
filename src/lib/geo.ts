/** 거리·길찾기·복사 같은 지도 주변 잡일 */

/** 두 좌표 사이 거리(m) — 하버사인 */
export function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return ''
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)}m`
  const km = meters / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km)}km`
}

/** 카카오맵 길찾기 — 출발지는 지금 위치, 도착지는 가게 */
export function directionsUrl(name: string, lat: number, lng: number): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`
}

/** 카카오맵에서 이 자리를 크게 보기 */
export function mapUrl(name: string, lat: number, lng: number): string {
  return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`
}

/** 클립보드 복사 — 실패하면 예전 방식으로 한 번 더 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}

/** 주소에서 앞쪽 광역·시군구만 짧게 — "경기 용인시 기흥구 …" */
export function shortAddress(address: string): string {
  const parts = address.replace(/\s+/g, ' ').trim().split(' ')
  if (parts.length <= 3) return address
  return parts.slice(0, 3).join(' ')
}
