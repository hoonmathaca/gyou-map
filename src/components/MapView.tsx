import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * 지도 컴포넌트 — 지금은 Leaflet + OpenStreetMap (키 불필요).
 * 나중에 카카오맵으로 바꾸려면 이 파일만 같은 props 로 다시 구현하면 된다.
 * (points / center / zoom / onPointClick / draft / onDraftMove / fit)
 */
export interface MapPoint {
  id: string
  lat: number
  lng: number
  active?: boolean
  glyph?: string
}

export interface MapViewProps {
  points?: MapPoint[]
  center?: [number, number]
  zoom?: number
  className?: string
  onPointClick?: (id: string) => void
  fit?: boolean
  draft?: { lat: number; lng: number } | null
  onDraftMove?: (lat: number, lng: number) => void
  interactive?: boolean
}

const HOUSE_SVG =
  '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></svg>'

const DEFAULT_CENTER: [number, number] = [37.5665, 126.978] // 서울시청
const DEFAULT_ZOOM = 11

function pinIcon(active: boolean, glyph?: string) {
  const cls = `gyou-pin__inner ${active ? 'gyou-pin--on__inner' : ''}`
  const inner = glyph ? `<span class="gyou-pin__glyph">${glyph}</span>` : HOUSE_SVG
  return L.divIcon({
    className: `gyou-pin${active ? ' gyou-pin--on' : ''}`,
    html: `<div class="${cls}">${inner}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 36],
  })
}

export default function MapView({
  points = [],
  center,
  zoom,
  className = '',
  onPointClick,
  fit = false,
  draft = null,
  onDraftMove,
  interactive = true,
}: MapViewProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const draftRef = useRef<L.Marker | null>(null)
  const clickRef = useRef<((lat: number, lng: number) => void) | null>(null)
  const selectRef = useRef<((id: string) => void) | null>(null)

  clickRef.current = onDraftMove ?? null
  selectRef.current = onPointClick ?? null

  // 지도 생성
  useEffect(() => {
    if (!boxRef.current || mapRef.current) return
    const map = L.map(boxRef.current, {
      center: center ?? DEFAULT_CENTER,
      zoom: zoom ?? DEFAULT_ZOOM,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      attributionControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) => {
      clickRef.current?.(e.latlng.lat, e.latlng.lng)
    })
    mapRef.current = map

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(boxRef.current)
    const timer = window.setTimeout(() => map.invalidateSize(), 120)

    return () => {
      window.clearTimeout(timer)
      ro.disconnect()
      map.remove()
      mapRef.current = null
      layerRef.current = null
      draftRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 중심·줌
  useEffect(() => {
    const map = mapRef.current
    if (!map || !center) return
    map.setView(center, zoom ?? Math.max(map.getZoom(), DEFAULT_ZOOM), { animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1], zoom])

  // 마커
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    points.forEach((p) => {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return
      const marker = L.marker([p.lat, p.lng], {
        icon: pinIcon(Boolean(p.active), p.glyph),
        keyboard: false,
        zIndexOffset: p.active ? 500 : 0,
      })
      marker.on('click', () => selectRef.current?.(p.id))
      layer.addLayer(marker)
    })
    if (fit && points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
      if (points.length === 1) {
        map.setView(bounds.getCenter(), 15, { animate: true })
      } else {
        map.fitBounds(bounds, { padding: [42, 42], maxZoom: 15, animate: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, fit])

  // 등록 화면의 위치 핀
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!draft) {
      draftRef.current?.remove()
      draftRef.current = null
      return
    }
    if (!draftRef.current) {
      const marker = L.marker([draft.lat, draft.lng], {
        draggable: true,
        icon: pinIcon(true, '📍'),
        zIndexOffset: 900,
      })
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        clickRef.current?.(pos.lat, pos.lng)
      })
      marker.addTo(map)
      draftRef.current = marker
    } else {
      draftRef.current.setLatLng([draft.lat, draft.lng])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.lat, draft?.lng])

  return <div ref={boxRef} className={`h-full w-full ${className}`} aria-label="지도" />
}
