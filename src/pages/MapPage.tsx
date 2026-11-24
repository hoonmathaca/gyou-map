import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MapView, { type MapPoint } from '../components/MapView'
import PlaceCard, { Sticker, placeTitle } from '../components/PlaceCard'
import StarRating from '../components/StarRating'
import { CATEGORIES, categoryOf } from '../lib/categories'
import { fetchPlaces, fetchReviews } from '../lib/api'
import type { Place, PlaceStats, Review } from '../lib/types'
import { supabaseReady } from '../lib/supabase'

export default function MapPage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [tab, setTab] = useState<'map' | 'list'>('map')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const navigate = useNavigate()

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
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

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

  const points: MapPoint[] = useMemo(
    () =>
      filtered.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        active: p.id === selectedId,
      })),
    [filtered, selectedId],
  )

  const selected = filtered.find((p) => p.id === selectedId) ?? null
  const selectedStats = selected ? stats.get(selected.id) : undefined

  return (
    <div className="screen h-[100dvh]">
      <header className="border-b border-line bg-paper/95 px-4 pb-2 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="flex items-center gap-1.5 text-[19px] font-extrabold tracking-tight text-ink">
              <span aria-hidden>⛪</span> 교우의 집 지도
            </h1>
            <p className="mt-0.5 text-[12px] text-ink-mute">교우가 운영하는 가게를 찾아보세요</p>
          </div>
          <div className="flex rounded-full border border-line bg-white p-0.5 text-[12px] font-bold">
            <button
              type="button"
              onClick={() => setTab('map')}
              className={`rounded-full px-3 py-1.5 ${tab === 'map' ? 'bg-ink text-paper' : 'text-ink-mute'}`}
            >
              지도
            </button>
            <button
              type="button"
              onClick={() => setTab('list')}
              className={`rounded-full px-3 py-1.5 ${tab === 'list' ? 'bg-ink text-paper' : 'text-ink-mute'}`}
            >
              목록
            </button>
          </div>
        </div>

        <div className="relative mt-2.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="가게이름 · 세례명 · 지역 검색"
            className="w-full rounded-2xl border border-line bg-white py-2.5 pl-10 pr-9 text-[14px] outline-none placeholder:text-ink-mute/70 focus:border-gold"
            aria-label="가게 검색"
          />
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-ink-mute">
            🔍
          </span>
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색어 지우기"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-mute"
            >
              ✕
            </button>
          ) : null}
        </div>

        <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`chip ${category === 'all' ? 'chip-on' : ''}`}
          >
            전체 {places.length}
          </button>
          {CATEGORIES.map((c) => {
            const n = places.filter((p) => p.category === c.id).length
            if (n === 0 && category !== c.id) return null
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(category === c.id ? 'all' : c.id)}
                className={`chip ${category === c.id ? 'chip-on' : ''}`}
              >
                {c.glyph} {c.label}
              </button>
            )
          })}
        </div>
      </header>

      {error ? (
        <div className="m-4 rounded-2xl border border-rose/30 bg-rose/5 p-4 text-[13px] text-rose">{error}</div>
      ) : null}

      {tab === 'map' ? (
        <div className="relative flex-1 overflow-hidden">
          <MapView
            points={points}
            fit={!selectedId}
            onPointClick={(id) => setSelectedId(id === selectedId ? null : id)}
          />

          {!loading && places.length === 0 ? (
            <div className="pointer-events-none absolute inset-x-4 top-4 rounded-2xl border border-line bg-white/95 p-4 text-center text-[13px] leading-relaxed text-ink-soft shadow-card">
              아직 등록된 교우의 집이 없어요.
              <br />
              첫 번째 가게를 등록해 주세요.
            </div>
          ) : null}

          {filtered.length === 0 && places.length > 0 ? (
            <div className="pointer-events-none absolute inset-x-4 top-4 rounded-2xl border border-line bg-white/95 p-3 text-center text-[12.5px] text-ink-soft shadow-card">
              조건에 맞는 가게가 없어요.
            </div>
          ) : null}

          {!selected ? (
            <Link
              to="/add"
              className="absolute bottom-5 right-4 z-[500] flex items-center gap-1.5 rounded-full bg-gold px-4 py-3 text-[14px] font-extrabold text-white shadow-soft"
            >
              <span className="text-[16px] leading-none">＋</span> 가게 등록
            </Link>
          ) : null}

          {selected ? (
            <div className="absolute inset-x-0 bottom-0 z-[450] animate-slideup border-t border-line bg-paper px-4 pb-[calc(env(safe-area-inset-bottom)+26px)] pt-3">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="닫기"
                className="absolute -top-9 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[13px] text-ink-soft shadow-card"
              >
                ✕
              </button>
              <button type="button" onClick={() => navigate(`/p/${selected.id}`)} className="w-full text-left">
                <div className="flex gap-3">
                  <Sticker url={selected.sticker_url} name={selected.name} className="h-24 w-24" />
                  <div className="min-w-0 flex-1">
                    <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-bold text-gold">
                      {categoryOf(selected.category).glyph} {categoryOf(selected.category).label}
                    </span>
                    <h2 className="mt-1 truncate text-[16px] font-extrabold">{placeTitle(selected)}</h2>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-mute">{selected.address}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-mute">
                      <StarRating value={selectedStats?.avg ?? 0} size={12} />
                      <span>
                        {selectedStats && selectedStats.count > 0
                          ? `${selectedStats.avg.toFixed(1)} · 리뷰 ${selectedStats.count}`
                          : '아직 리뷰 없음'}
                      </span>
                    </div>
                  </div>
                </div>
                {selected.intro ? (
                  <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-ink-soft">{selected.intro}</p>
                ) : null}
                <p className="mt-2 text-right text-[12px] font-bold text-gold">상세보기 ›</p>
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-3">
          {loading ? (
            <p className="py-10 text-center text-[13px] text-ink-mute">불러오는 중…</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-ink-mute">아직 등록된 가게가 없어요.</p>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((p) => (
                <PlaceCard key={p.id} place={p} stats={stats.get(p.id)} />
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  )
}
