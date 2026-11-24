export interface Category {
  id: string
  label: string
  glyph: string
}

/** 업종 — 등록 시 선택, 지도 필터 칩으로도 쓰인다 */
export const CATEGORIES: Category[] = [
  { id: 'restaurant', label: '음식점', glyph: '🍚' },
  { id: 'cafe', label: '카페·디저트', glyph: '☕' },
  { id: 'bakery', label: '제과·베이커리', glyph: '🥖' },
  { id: 'flower', label: '꽃·식물', glyph: '🌷' },
  { id: 'beauty', label: '미용·뷰티', glyph: '✂️' },
  { id: 'shop', label: '의류·잡화', glyph: '👕' },
  { id: 'grocery', label: '식료품·마트', glyph: '🧺' },
  { id: 'health', label: '병원·약국', glyph: '💊' },
  { id: 'edu', label: '교육·학원', glyph: '✏️' },
  { id: 'service', label: '생활·부동산', glyph: '🔑' },
  { id: 'photo', label: '사진·인쇄', glyph: '📷' },
  { id: 'etc', label: '기타', glyph: '🧩' },
]

export function categoryOf(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}

export const REPORT_REASONS = [
  '폐업했어요',
  '주소나 위치가 달라요',
  '교우 가게가 아니에요',
  '스티커 사진이 실제와 달라요',
  '기타',
] as const
