import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import KakaoMap, { type MapPoint } from '../components/KakaoMap'
import { Sticker, placeTitle } from '../components/PlaceCard'
import StarRating from '../components/StarRating'
import { Icon } from '../components/icons'
import { CATEGORIES, categoryOf } from '../lib/categories'
import { fetchPlaces, fetchReviews } from '../lib/api'
import { directionsUrl, distanceMeters, formatDistance, shortAddress } from '../lib/geo'
import type { Place, PlaceStats, Review } from '../lib/types'
import { KAKAO_KEY } from '../lib/kakao'
import { supabaseReady } from '../lib/supabase'

type Geo = { lat: number; lng: number }

export default function MapPage() {
  const navigate = useNavigate()
  const [places, setPlaces] = useState<Place[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [tab, setTab] = useState<'map' | 'list'>('map')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [level, setLevel] = useState(8)
  const [self, setSelf] = useState<Geo | null>(null)
  const [center, setCenter] = useState<Geo | null>(null)
  const [fitTick, setFitTick] = useState(0)
  const [toast, setToast] = useState('')
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!supabaseReady) {
      setLoading(false)
      setError('지도 설정이 아직 연결되지 않았어요.')
      return
    }
    Promise.all([fetchPlaces(), fetchReviews()])
      .then(([p, r]) => {
        setPlaces(p)
        setReviews(r)
        setFitTick((t) => t + 1)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const stats = useMemo(() => {
    const map = new Map<string, PlaceStats>()
    for (const review of reviews) {
      const s = map.get(review.place_id) ?? { count: 0, avg: 0 }
      s.avg = (s.avg * s.count + review.rating) / (s.count + 1)
      s.count += 1
      map.set(review.place_id, s)
    }
    return map
  }, [reviews])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return places.filter((p) => {
      if (category !== 'all' && p.category !== category) return false
      if (!q) return true
      const cat = categoryOf(p.category).label.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        (p.baptismal_name ?? '').toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        cat.includes(q)
      )
    })
  }, [places, query, category])

  const withDistance = useMemo(() => {
    if (!self) return filtered.map((p) => ({ place: p, meters: null as number | null }))
    return filtered
      .map((p) => ({ place: p, meters: distanceMeters(self.lat, self.lng, p.lat, p.lng) }))
      .sort((a, b) => (a.meters ?? 0) - (b.meters ?? 0))
  }, [filtered, self])

  const points: MapPoint[] = useMemo(
    () =>
      filtered.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        name: p.name,
        baptismal: p.baptismal_name,
        category: p.category,
        active: p.id === selectedId,
      })),
    [filtered, selectedId],
  )

  const selected = filtered.find((p) => p.id === selectedId) ?? null
  const selectedStats = selected ? stats.get(selected.id) : undefined
  const selectedMeters =
    selected && self ? distanceMeters(self.lat, self.lng, selected.lat, selected.lng) : null

  const pickCategory = (id: string) => {
    setCategory(id)
    setSelectedId(null)
    setFitTick((t) => t + 1)
  }

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setToast('이 브라우저에서는 위치를 쓸 수 없어요.')
      return
    }
    setToast('내 위치를 찾는 중…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setSelf(next)
        setCenter(next)
        setSelectedId(null)
        setToast('내 위치 주변을 보여드려요.')
      },
      (err) => {
        setToast(
          err.code === err.PERMISSION_DENIED
            ? '위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요.'
            : '위치를 찾지 못했어요. 잠시 뒤 다시 시도해 주세요.',
        )
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    )
  }, [])

  const onPointClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
    window.setTimeout(() => {
      const map = mapRef.current
      if (map) map.panBy(0, 60)
    }, 30)
  }, [])

  const openDirections = (place: Place) => {
    window.open(directionsUrl(placeTitle(place), place.lat, place.lng), '_blank', 'noopener')
  }

  const total = places.length

  return (
    <div className="flex h-[100dvh] flex-col bg-paper">
      {/* ── 상단: 검색 + 업종 ─────────────────────────── */}
      <header className="z-30 shrink-0 border-b border-line/70 bg-paper/95 px-3 pb-2 pt-[max(env(safe-area-inset-top),10px)] backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 2.8 4.6 8.4v11.2a1.2 1.2 0 0 0 1.2 1.2h12.4a1.2 1.2 0 0 0 1.2-1.2V8.4z" />
              <path d="M12 8.2v6M9 11.2h6" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[15.5px] font-extrabold leading-tight tracking-tight text-ink">
              천주교 교우의 집 지도
            </h1>
            <p className="text-[11px] leading-tight text-ink-mute">
              {total > 0 ? `교우가 운영하는 가게 ${total}곳` : '교우가 운영하는 가게를 모읍니다'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTab(tab === 'map' ? 'list' : 'map')}
            className="chip !py-1.5 !text-[12px]"
          >
            <Icon name={tab === 'map' ? 'list' : 'map'} className="h-3.5 w-3.5" />
            {tab === 'map' ? '목록' : '지도'}
          </button>
        </div>

        <div className="relative mt-2">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="가게이름 · 세례명 · 지역 검색"
            className="h-10 w-full rounded-full border border-line bg-white pl-10 pr-9 text-[13.5px] text-ink outline-none placeholder:text-ink-mute/70 focus:border-brand"
            aria-label="가게 검색"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색어 지우기"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3">
          <button
            type="button"
            onClick={() => pickCategory('all')}
            className={`chip ${category === 'all' ? 'chip-on' : ''}`}
          >
            전체 {total}
          </button>
          {CATEGORIES.map((c) => {
            const n = places.filter((p) => p.category === c.id).length
            if (n === 0 && category !== c.id) return null
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => pickCategory(category === c.id ? 'all' : c.id)}
                className={`chip ${category === c.id ? 'chip-on' : ''}`}
              >
                {c.label}
                <span className={`text-[11px] ${category === c.id ? 'text-white/70' : 'text-ink-mute'}`}>{n}</span>
              </button>
            )
          })}
        </div>
      </header>

      {error ? (
        <div className="m-3 rounded-2xl border border-rose/30 bg-rose/5 p-3 text-[12.5px] leading-relaxed text-rose">
          {error}
          {!KAKAO_KEY ? ' (카카오 지도 키가 비어 있어요)' : ''}
        </div>
      ) : null}

      {tab === 'map' ? (
        <div className="relative flex-1 overflow-hidden">
          <KakaoMap
            className="absolute inset-0"
            points={points}
            center={center}
            fitSignal={String(fitTick)}
            self={self}
            onPointClick={onPointClick}
            onMapClick={() => setSelectedId(null)}
            onReady={(map) => {
              mapRef.current = map
            }}
            onLevelChange={setLevel}
            compact={level > 8}
          />

          {/* 플로팅 버튼 — 내 위치 · 목록 · 등록 */}
          <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
            <button type="button" onClick={locate} className="fab" aria-label="내 위치">
              <Icon name="locate" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setTab('list')}
              className="fab"
              aria-label="목록으로 보기"
            >
              <Icon name="list" className="h-5 w-5" />
            </button>
            <Link to="/add" className="fab" aria-label="가게 등록">
              <Icon name="pencil" className="h-5 w-5" />
            </Link>
          </div>

          {toast ? (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-16">
              <p className="rounded-full bg-ink/90 px-3.5 py-2 text-center text-[11.5px] font-bold text-paper shadow-soft">
                {toast}
              </p>
            </div>
          ) : null}

          {!loading && total === 0 ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-8">
              <div className="pointer-events-auto w-full rounded-3xl border border-line bg-white/95 p-5 text-center shadow-soft">
                <p className="text-[14px] font-extrabold">아직 등록된 천주교 교우의 집이 없어요</p>
                <p className="mt-1.5 break-keep text-[12px] leading-relaxed text-ink-mute">
                  가게 문에 붙은 ‘천주교 교우의 집’ 스티커를 확인하고 첫 번째 가게를 등록해 주세요.
                </p>
                <Link to="/add" className="btn-primary mt-3 w-full !py-2.5 !text-[13.5px]">
                  가게 등록하기
                </Link>
              </div>
            </div>
          ) : null}

          {filtered.length === 0 && total > 0 ? (
            <div className="pointer-events-none absolute inset-x-4 top-3 z-10 rounded-2xl border border-line bg-white/95 p-3 text-center text-[12px] text-ink-soft shadow-card">
              조건에 맞는 가게가 없어요.
            </div>
          ) : null}

          {/* 하단 프리뷰 카드 */}
          {selected ? (
            <div className="absolute inset-x-0 bottom-0 z-30 animate-slideup">
              <div className="mx-auto w-full max-w-md rounded-t-[26px] border border-line bg-paper px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-2.5 shadow-sheet">
                <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-line" />
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-brand">
                      {categoryOf(selected.category).label}
                    </p>
                    <h2 className="mt-1 truncate text-[19px] font-extrabold leading-tight text-ink">
                      {selected.name}
                      {selected.baptismal_name ? (
                        <span className="ml-1 text-[14px] font-bold text-brand-deep">
                          ({selected.baptismal_name})
                        </span>
                      ) : null}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-ink-soft">
                      {selectedMeters !== null ? (
                        <span className="font-extrabold text-brand-deep">{formatDistance(selectedMeters)}</span>
                      ) : null}
                      {selectedMeters !== null ? <span className="text-ink-mute">·</span> : null}
                      <span className="truncate">{shortAddress(selected.address)}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/p/${selected.id}`)}
                    className="shrink-0"
                    aria-label="스티커 사진 크게 보기"
                  >
                    <Sticker
                      url={selected.sticker_url}
                      name={selected.name}
                      className="h-[72px] w-[72px] !rounded-2xl"
                    />
                  </button>
                </div>

                {selected.intro ? (
                  <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-ink-soft">
                    {selected.intro}
                  </p>
                ) : null}

                <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-mute">
                  <StarRating value={selectedStats?.avg ?? 0} size={12} />
                  <span>
                    {selectedStats && selectedStats.count > 0
                      ? `${selectedStats.avg.toFixed(1)} · 리뷰 ${selectedStats.count}`
                      : '아직 리뷰 없음'}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openDirections(selected)}
                    className="btn-ghost flex-1 !rounded-full !py-2.5 !text-[13.5px]"
                  >
                    길찾기
                    <Icon name="arrow" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/p/${selected.id}`)}
                    className="btn-primary flex-[1.25] !rounded-full !py-2.5 !text-[13.5px]"
                  >
                    상세보기
                    <Icon name="chevron" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto pb-24">
          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <p className="text-[12px] font-bold text-ink-mute">
              {filtered.length}곳{self ? ' · 가까운 순' : ' · 최신순'}
            </p>
            <button type="button" onClick={() => setTab('map')} className="text-[12px] font-bold text-brand-deep">
              지도로 보기 ›
            </button>
          </div>

          {loading ? (
            <p className="py-12 text-center text-[13px] text-ink-mute">불러오는 중…</p>
          ) : filtered.length === 0 ? (
            <div className="px-8 py-14 text-center">
              <p className="text-[13.5px] font-bold">등록된 가게가 없어요.</p>
              <Link to="/add" className="btn-primary mt-3 !py-2.5 !text-[13px]">
                가게 등록하기
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line/80">
              {withDistance.map(({ place, meters }) => (
                <li key={place.id}>
                  <Link to={`/p/${place.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-brand-soft/40">
                    <Sticker
                      url={place.sticker_url}
                      name={place.name}
                      className="h-[62px] w-[62px] !rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-extrabold leading-snug text-ink">
                        {place.name}
                        {place.baptismal_name ? (
                          <span className="ml-1 text-[12px] font-bold text-brand-deep">
                            ({place.baptismal_name})
                          </span>
                        ) : null}
                      </h3>
                      <p className="mt-0.5 truncate text-[12px] text-ink-mute">{place.address}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-mute">
                        <span className="font-bold text-brand-deep">{categoryOf(place.category).label}</span>
                        <span>·</span>
                        <span>리뷰 {stats.get(place.id)?.count ?? 0}</span>
                        {place.registrant_type === 'owner' ? (
                          <>
                            <span>·</span>
                            <span>사장님 등록</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    {meters !== null ? (
                      <span className="shrink-0 text-[12px] font-extrabold text-brand-deep">
                        {formatDistance(meters)}
                      </span>
                    ) : (
                      <Icon name="chevron" className="h-4 w-4 shrink-0 text-ink-mute" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      )}
    </div>
  )
}
