/**
 * 업종 아이콘의 SVG 속 내용(문자열).
 * 마커는 카카오 지도 CustomOverlay 에 HTML 문자열로 넣어야 해서
 * React 컴포넌트와 같은 모양을 쓰도록 문자열 한 벌만 둔다.
 */
export const CATEGORY_INNER: Record<string, string> = {
  restaurant:
    '<path d="M7 3v6.5a2 2 0 0 0 4 0V3"/><path d="M9 11.5V21"/><path d="M17 3c-1.6 1.7-2.4 3.8-2.4 6 0 1.5.8 2.4 2.4 2.4V21"/>',
  cafe:
    '<path d="M5 8.5h11v4a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 12.5v-4z"/><path d="M16 9.5h1.6a2.2 2.2 0 0 1 0 4.4H16"/><path d="M4.5 20.5h13"/>',
  bakery:
    '<path d="M4.5 13.6c0-4 3.4-7.1 7.5-7.1s7.5 3.1 7.5 7.1v1.4a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2v-1.4z"/><path d="M9 9.8 8.2 12.4M12 8.6v2.8M15 9.8l.8 2.6"/>',
  flower:
    '<path d="M8 4.5s1.2 2.2 4 2.2 4-2.2 4-2.2v4.6a4 4 0 0 1-8 0V4.5z"/><path d="M12 13v6"/><path d="M9.4 19h5.2"/>',
  beauty:
    '<circle cx="6" cy="6.2" r="2.6"/><circle cx="6" cy="17.8" r="2.6"/><path d="M8.1 7.8 20 19.5M8.1 16.2 20 4.5"/>',
  shop: '<path d="M8.6 4 12 5.6 15.4 4 20 6.6l-1.7 3.5-2.3-1V20H8V9.1L5.7 10.1 4 6.6z"/>',
  grocery:
    '<path d="M4.6 9.6h14.8l-1.6 8.9a2 2 0 0 1-2 1.6H8.2a2 2 0 0 1-2-1.6z"/><path d="M8.6 9.6 11 4M15.4 9.6 13 4"/><path d="M9.6 13v3.2M14.4 13v3.2"/>',
  health: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>',
  edu: '<path d="M4 20l.9-4.1L15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.1 19.1 4 20z"/><path d="M14.4 6.4 17.4 9.4"/>',
  service:
    '<circle cx="8" cy="8" r="4"/><path d="M10.9 10.9 20 20M17.2 17.2l2.4-2.4M14.6 14.6l2.4-2.4"/>',
  photo:
    '<rect x="3" y="7" width="18" height="13" rx="2.6"/><circle cx="12" cy="13.4" r="3.4"/><path d="M8.6 7 9.8 4.8h4.4L15.4 7"/>',
  etc:
    '<rect x="4" y="4" width="6.2" height="6.2" rx="1.8"/><rect x="13.8" y="4" width="6.2" height="6.2" rx="1.8"/><rect x="4" y="13.8" width="6.2" height="6.2" rx="1.8"/><rect x="13.8" y="13.8" width="6.2" height="6.2" rx="1.8"/>',
}

export function categoryInner(id: string): string {
  return CATEGORY_INNER[id] ?? CATEGORY_INNER.etc
}

/** 마커·목록에서 바로 쓰는 <svg> 문자열 */
export function categorySvg(id: string, size = 19): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${categoryInner(
    id,
  )}</svg>`
}
