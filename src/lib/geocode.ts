/**
 * 주소 → 좌표 (OpenStreetMap Nominatim, 무료·키 불필요).
 * 좌표를 찾지 못하면 null 을 돌려주고, 화면에서는 지도를 눌러 위치를 직접 잡게 한다.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const queries = addressVariants(address)
  for (const q of queries) {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', q)
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('limit', '1')
    url.searchParams.set('countrycodes', 'kr')
    url.searchParams.set('accept-language', 'ko')
    try {
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
      if (!res.ok) continue
      const rows = (await res.json()) as Array<{ lat: string; lon: string }>
      if (rows.length && rows[0]) {
        const lat = Number(rows[0].lat)
        const lng = Number(rows[0].lon)
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
      }
    } catch {
      // 다음 후보로
    }
  }
  return null
}

/** "경기 용인시 기흥구 동백죽전대로 315" 처럼 앞의 지역명을 붙여 다시 시도한다 */
function addressVariants(address: string): string[] {
  const cleaned = address.replace(/\s+/g, ' ').trim()
  const list = [cleaned]
  const noParen = cleaned.replace(/\(.*?\)/g, '').trim()
  if (noParen && noParen !== cleaned) list.push(noParen)
  const parts = noParen.split(' ')
  if (parts.length > 3) list.push(parts.slice(0, parts.length - 1).join(' '))
  return Array.from(new Set(list.filter(Boolean)))
}
