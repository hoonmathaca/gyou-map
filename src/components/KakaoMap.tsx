import { useEffect, useRef, useState } from 'react'
import { loadKakao } from '../lib/kakao'
import { categorySvg } from './categorySvg'

export interface MapPoint {
  id: string
  lat: number
  lng: number
  name: string
  baptismal?: string | null
  category: string
  active?: boolean
}

export interface KakaoMapProps {
  points?: MapPoint[]
  className?: string
  /** 이 좌표로 이동한다 (검색 결과 선택 등) */
  center?: { lat: number; lng: number } | null
  level?: number
  /** 값이 바뀔 때마다 점들에 맞춰 화면을 다시 맞춘다 */
  fitSignal?: string
  padding?: number
  /** 등록 화면의 위치 핀 — 끌어서 옮길 수 있다 */
  draft?: { lat: number; lng: number } | null
  onDraftMove?: (lat: number, lng: number) => void
  /** 내 위치 표시 */
  self?: { lat: number; lng: number } | null
  onPointClick?: (id: string) => void
  onMapClick?: (lat: number, lng: number) => void
  onReady?: (map: any) => void
  onLevelChange?: (level: number) => void
  interactive?: boolean
  /** 멀리 볼 때 라벨을 숨긴다 / 강제로 숨긴다 */
  compact?: boolean
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;',
  )

const DRAFT_PIN =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><path d="M18 34.5S31 23 31 14.2A13 13 0 1 0 5 14.2C5 23 18 34.5 18 34.5z" fill="#12296B" stroke="#fff" stroke-width="2.6"/><circle cx="18" cy="14" r="4.6" fill="#fff"/></svg>`,
  )

export default function KakaoMap({
  points = [],
  className = '',
  center = null,
  level,
  fitSignal,
  padding = 56,
  draft = null,
  onDraftMove,
  self = null,
  onPointClick,
  onMapClick,
  onReady,
  onLevelChange,
  interactive = true,
  compact = false,
}: KakaoMapProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const overlayRef = useRef<Map<string, any>>(new Map())
  const selfRef = useRef<any>(null)
  const draftRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const pointsRef = useRef<MapPoint[]>(points)
  pointsRef.current = points

  const cb = useRef({ onPointClick, onMapClick, onDraftMove, onReady, onLevelChange })
  cb.current = { onPointClick, onMapClick, onDraftMove, onReady, onLevelChange }

  // ── 지도 만들기 ──────────────────────────────────────────
  useEffect(() => {
    let alive = true
    loadKakao()
      .then(() => {
        if (!alive || !boxRef.current || mapRef.current) return
        const maps = window.kakao.maps
        const start = center ?? pointsRef.current[0] ?? { lat: 37.5665, lng: 126.978 }
        const options: Record<string, unknown> = {
          center: new maps.LatLng(start.lat, start.lng),
          level: level ?? (center ? 4 : 9),
          mapTypeControl: false,
          zoomControl: false,
        }
        if (!interactive) {
          Object.assign(options, {
            draggable: false,
            scrollwheel: false,
            disableDoubleClickZoom: true,
            keyboardShortcuts: false,
          })
        }
        const map = new maps.Map(boxRef.current, options)
        maps.event.addListener(map, 'click', (e: any) =>
          cb.current.onMapClick?.(e.latLng.getLat(), e.latLng.getLng()),
        )
        maps.event.addListener(map, 'zoom_changed', () => cb.current.onLevelChange?.(map.getLevel()))
        mapRef.current = map
        cb.current.onLevelChange?.(map.getLevel())
        setReady(true)
        cb.current.onReady?.(map)

        const relayout = () => {
          try {
            map.relayout()
          } catch {
            /* noop */
          }
        }
        const ro = new ResizeObserver(relayout)
        ro.observe(boxRef.current)
        const timers = [80, 260, 700].map((ms) => window.setTimeout(relayout, ms))

        return () => {
          ro.disconnect()
          timers.forEach((t) => window.clearTimeout(t))
        }
      })
      .catch((e: Error) => setError(e.message))

    return () => {
      alive = false
      overlayRef.current.forEach((o) => o.setMap(null))
      overlayRef.current.clear()
      selfRef.current?.setMap(null)
      selfRef.current = null
      draftRef.current?.setMap(null)
      draftRef.current = null
      if (mapRef.current) {
        mapRef.current = null
        if (boxRef.current) boxRef.current.innerHTML = ''
      }
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 가게 핀 ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const maps = window.kakao.maps
    overlayRef.current.forEach((o) => o.setMap(null))
    overlayRef.current.clear()

    points.forEach((p, i) => {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return
      const el = document.createElement('div')
      el.className = `kpin${p.active ? ' kpin--on' : ''}`
      el.setAttribute('role', 'button')
      el.setAttribute('tabindex', '0')
      const label = `${p.name}${p.baptismal ? `(${p.baptismal})` : ''}`
      el.setAttribute('aria-label', label)
      el.innerHTML =
        `<span class="kpin__dot">${categorySvg(p.category)}</span>` +
        `<span class="kpin__label">${escapeHtml(p.name)}` +
        (p.baptismal ? `<span class="kpin__bap">(${escapeHtml(p.baptismal)})</span>` : '') +
        `</span>`
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        cb.current.onPointClick?.(p.id)
      })
      el.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault()
          cb.current.onPointClick?.(p.id)
        }
      })

      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(p.lat, p.lng),
        content: el,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: p.active ? 60 : 5 + (i % 20),
        clickable: true,
      })
      overlay.setMap(map)
      overlayRef.current.set(p.id, overlay)
    })
  }, [points, ready])

  // ── 화면 맞추기 ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !fitSignal) return
    const maps = window.kakao.maps
    const list = pointsRef.current.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    if (list.length === 0) return
    if (list.length === 1) {
      map.setLevel(4)
      map.panTo(new maps.LatLng(list[0].lat, list[0].lng))
      return
    }
    const bounds = new maps.LatLngBounds()
    list.forEach((p) => bounds.extend(new maps.LatLng(p.lat, p.lng)))
    map.setBounds(bounds, padding, padding, padding, padding)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal, ready])

  // ── 중심 이동 ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !center) return
    const maps = window.kakao.maps
    map.panTo(new maps.LatLng(center.lat, center.lng))
    if (level) map.setLevel(level)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng, ready])

  // ── 내 위치 ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const maps = window.kakao.maps
    if (!self) {
      selfRef.current?.setMap(null)
      selfRef.current = null
      return
    }
    const pos = new maps.LatLng(self.lat, self.lng)
    if (!selfRef.current) {
      const el = document.createElement('div')
      el.className = 'kloc'
      selfRef.current = new maps.CustomOverlay({
        position: pos,
        content: el,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 40,
      })
      selfRef.current.setMap(map)
    } else {
      selfRef.current.setPosition(pos)
    }
  }, [self?.lat, self?.lng, ready])

  // ── 등록 핀(끌어서 이동) ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const maps = window.kakao.maps
    if (!draft) {
      draftRef.current?.setMap(null)
      draftRef.current = null
      return
    }
    const pos = new maps.LatLng(draft.lat, draft.lng)
    if (!draftRef.current) {
      const marker = new maps.Marker({
        position: pos,
        draggable: interactive,
        image: new maps.MarkerImage(DRAFT_PIN, new maps.Size(36, 36), {
          offset: new maps.Point(18, 33),
        }),
        zIndex: 80,
      })
      maps.event.addListener(marker, 'dragend', (e: any) =>
        cb.current.onDraftMove?.(e.latLng.getLat(), e.latLng.getLng()),
      )
      marker.setMap(map)
      draftRef.current = marker
      map.panTo(pos)
    } else {
      draftRef.current.setPosition(pos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.lat, draft?.lng, ready])

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-paper-deep p-6 text-center ${className}`}>
        <p className="text-[13px] font-bold text-ink-soft">지도를 불러오지 못했어요</p>
        <p className="text-[12px] leading-relaxed text-ink-mute">{error}</p>
      </div>
    )
  }

  return (
    <div
      ref={boxRef}
      className={`kakao-map ${compact ? 'kmap--far' : ''} ${className}`}
      aria-label="가게 지도"
    />
  )
}
