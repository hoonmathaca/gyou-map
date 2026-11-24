import { Link } from 'react-router-dom'
import type { Place, PlaceStats } from '../lib/types'
import { categoryOf } from '../lib/categories'
import StarRating from './StarRating'

export function placeTitle(place: Place) {
  return place.baptismal_name ? `${place.name}(${place.baptismal_name})` : place.name
}

export default function PlaceCard({
  place,
  stats,
  onSelect,
}: {
  place: Place
  stats?: PlaceStats
  onSelect?: () => void
}) {
  const cat = categoryOf(place.category)
  return (
    <div className="card flex gap-3 p-3">
      <Link to={`/p/${place.id}`} className="shrink-0" onClick={onSelect}>
        <Sticker url={place.sticker_url} name={place.name} className="h-20 w-20" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/p/${place.id}`} className="min-w-0" onClick={onSelect}>
            <h3 className="truncate text-[15px] font-extrabold leading-snug">{placeTitle(place)}</h3>
            <p className="mt-0.5 truncate text-[12px] text-ink-mute">{place.address}</p>
          </Link>
          <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
            {cat.glyph} {cat.label}
          </span>
        </div>
        {place.intro ? (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-ink-soft">{place.intro}</p>
        ) : null}
        <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-mute">
          <StarRating value={stats?.avg ?? 0} size={12} />
          <span>
            {stats && stats.count > 0 ? `${stats.avg.toFixed(1)} · 리뷰 ${stats.count}` : '아직 리뷰 없음'}
          </span>
        </div>
      </div>
    </div>
  )
}

export function Sticker({
  url,
  name,
  className = '',
}: {
  url: string
  name: string
  className?: string
}) {
  return url ? (
    <img
      src={url}
      alt={`${name} 천주교 교우의 집 스티커`}
      loading="lazy"
      className={`rounded-2xl border border-line object-cover ${className}`}
    />
  ) : (
    <div
      className={`flex items-center justify-center rounded-2xl border border-line bg-paper-deep text-2xl ${className}`}
    >
      🏠
    </div>
  )
}
