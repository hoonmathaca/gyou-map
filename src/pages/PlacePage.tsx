import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import StarRating from '../components/StarRating'
import { Sticker, placeTitle } from '../components/PlaceCard'
import { REPORT_REASONS, categoryOf } from '../lib/categories'
import { createReview, fetchPlace, fetchReviews, reportPlace } from '../lib/api'
import type { Place, Review } from '../lib/types'
import { deviceKey, rememberNickname, savedNickname } from '../lib/deviceKey'

export default function PlacePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [justAdded, setJustAdded] = useState(params.get('new') === '1')
  const [place, setPlace] = useState<Place | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0])
  const [reportDetail, setReportDetail] = useState('')
  const [reportState, setReportState] = useState<'idle' | 'sending' | 'done' | 'already'>('idle')
  const [reportError, setReportError] = useState('')

  const [reviewOpen, setReviewOpen] = useState(false)
  const [nickname, setNickname] = useState(savedNickname())
  const [baptismal, setBaptismal] = useState('')
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [reviewSending, setReviewSending] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const loadReviews = useMemo(
    () => async () => {
      const list = await fetchReviews(id)
      setReviews(list)
    },
    [id],
  )

  useEffect(() => {
    setLoading(true)
    fetchPlace(id)
      .then(async (p) => {
        if (!p) {
          setMissing(true)
          return
        }
        setPlace(p)
        await loadReviews()
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false))
  }, [id, loadReviews])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  if (loading) {
    return (
      <div className="screen items-center justify-center">
        <p className="text-[13px] text-ink-mute">불러오는 중…</p>
      </div>
    )
  }

  if (missing || !place) {
    return (
      <div className="screen">
        <TopBar />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="text-4xl">🙈</span>
          <p className="text-[15px] font-bold">찾을 수 없는 가게예요</p>
          <p className="text-[13px] leading-relaxed text-ink-mute">
            신고가 누적되어 지도에서 숨겨졌거나,
            <br />
            삭제된 가게일 수 있어요.
          </p>
          <Link to="/" className="btn-ghost mt-2">
            지도로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const cat = categoryOf(place.category)
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  async function submitReport() {
    if (!place) return
    setReportState('sending')
    setReportError('')
    try {
      const result = await reportPlace(place.id, reportReason, reportDetail, deviceKey())
      if (result.already) {
        setReportState('already')
        return
      }
      setReportState('done')
      if (result.hidden) {
        setTimeout(() => navigate('/'), 1800)
      }
    } catch (e) {
      setReportState('idle')
      setReportError((e as Error).message)
    }
  }

  async function submitReview() {
    if (!place) return
    const name = nickname.trim()
    if (!name) {
      setReviewError('닉네임이나 세례명을 적어 주세요.')
      return
    }
    if (content.trim().length < 2) {
      setReviewError('리뷰 내용을 조금 더 적어 주세요.')
      return
    }
    setReviewSending(true)
    setReviewError('')
    try {
      await createReview({
        place_id: place.id,
        nickname: name,
        baptismal_name: baptismal.trim() || null,
        rating,
        content: content.trim(),
      })
      rememberNickname(name)
      setContent('')
      setBaptismal('')
      setReviewOpen(false)
      await loadReviews()
    } catch (e) {
      setReviewError((e as Error).message)
    } finally {
      setReviewSending(false)
    }
  }

  return (
    <div className="screen pb-28">
      <TopBar />

      {justAdded ? (
        <div className="mx-4 mt-2.5 flex items-center gap-2 rounded-2xl border border-gold-line bg-gold-soft px-3.5 py-2.5 text-[12.5px] font-bold text-ink">
          <span aria-hidden>🎉</span>
          <span className="flex-1">등록 완료! 지도에 바로 표시됩니다.</span>
          <button type="button" aria-label="알림 닫기" onClick={() => setJustAdded(false)} className="text-ink-mute">
            ✕
          </button>
        </div>
      ) : null}

      <main className="flex-1">
        <div className="bg-paper-deep px-4 pb-4 pt-3">
          <Sticker
            url={place.sticker_url}
            name={place.name}
            className="aspect-[4/3] w-full !rounded-3xl object-cover shadow-soft"
          />
          <div className="mt-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-bold text-gold">
                {cat.glyph} {cat.label}
              </span>
              <h1 className="mt-1.5 text-[21px] font-extrabold leading-tight">{placeTitle(place)}</h1>
              <p className="mt-1 text-[13px] leading-snug text-ink-soft">
                {place.address}
                {place.address_detail ? ` ${place.address_detail}` : ''}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-2 text-[12.5px] text-ink-mute">
            <StarRating value={avg} size={14} />
            <span>{reviews.length ? `${avg.toFixed(1)} · 리뷰 ${reviews.length}` : '아직 리뷰가 없어요'}</span>
            <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink-soft">
              {place.registrant_type === 'owner' ? '사장님 등록' : '교우 제보'}
            </span>
          </div>

          {place.intro ? (
            <p className="mt-3 rounded-2xl bg-white p-3.5 text-[13.5px] leading-relaxed text-ink-soft">
              {place.intro}
            </p>
          ) : null}

          <div className="mt-3 flex gap-2">
            <a
              href={`https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.lat},${place.lng}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost flex-1 !py-2.5 !text-[13px]"
            >
              🧭 길찾기
            </a>
            <button
              type="button"
              onClick={() => {
                setReportOpen(true)
                setReportState('idle')
                setReportError('')
              }}
              className="btn-ghost flex-1 !border-rose/30 !py-2.5 !text-[13px] !text-rose"
            >
              사실과 달라요
            </button>
          </div>
        </div>

        <section className="px-4 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold">
              교우 리뷰 <span className="text-gold">{reviews.length}</span>
            </h2>
            <button
              type="button"
              onClick={() => setReviewOpen((v) => !v)}
              className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-bold text-ink-soft"
            >
              {reviewOpen ? '닫기' : '리뷰 쓰기'}
            </button>
          </div>

          {reviewOpen ? (
            <div className="card mt-2.5 animate-fadein space-y-2.5 p-3.5">
              <div className="flex gap-2">
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임"
                  className="field !py-2.5 !text-[13.5px]"
                  aria-label="닉네임"
                />
                <input
                  value={baptismal}
                  onChange={(e) => setBaptismal(e.target.value)}
                  placeholder="세례명(선택)"
                  className="field !py-2.5 !text-[13.5px]"
                  aria-label="세례명"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] text-ink-mute">별점</span>
                <StarRating value={rating} onChange={setRating} size={16} />
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="가게에 다녀온 이야기를 남겨 주세요."
                className="field resize-none !text-[13.5px]"
                aria-label="리뷰 내용"
              />
              {reviewError ? <p className="text-[12px] text-rose">{reviewError}</p> : null}
              <button type="button" onClick={submitReview} disabled={reviewSending} className="btn-primary w-full !py-2.5">
                {reviewSending ? '남기는 중…' : '리뷰 남기기'}
              </button>
            </div>
          ) : null}

          <ul className="mt-3 space-y-2.5 pb-4">
            {reviews.map((r) => (
              <li key={r.id} className="card p-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold">
                    {r.nickname}
                    {r.baptismal_name ? `(${r.baptismal_name})` : ''}
                  </span>
                  <StarRating value={r.rating} size={12} />
                  <span className="ml-auto text-[11px] text-ink-mute">{formatDate(r.created_at)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">{r.content}</p>
              </li>
            ))}
            {reviews.length === 0 ? (
              <li className="py-8 text-center text-[13px] text-ink-mute">첫 리뷰를 남겨 보세요.</li>
            ) : null}
          </ul>
        </section>
      </main>

      {reportOpen ? (
        <div className="fixed inset-0 z-[900] flex items-end justify-center">
          <button
            type="button"
            aria-label="닫기"
            className="dim absolute inset-0"
            onClick={() => setReportOpen(false)}
          />
          <div className="relative w-full max-w-md animate-slideup rounded-t-3xl bg-paper px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            {reportState === 'done' || reportState === 'already' ? (
              <div className="py-6 text-center">
                <p className="text-[16px] font-extrabold">
                  {reportState === 'already' ? '이미 신고한 가게예요' : '신고가 접수되었어요'}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-mute">
                  {reportState === 'already'
                    ? '같은 브라우저에서는 한 번만 신고할 수 있어요.'
                    : '확인 후 지도에서 숨겨집니다. 감사합니다.'}
                </p>
                <button type="button" onClick={() => setReportOpen(false)} className="btn-primary mt-4 w-full">
                  확인
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-[16px] font-extrabold">사실과 달라요</h2>
                <p className="mt-1 text-[12.5px] text-ink-mute">
                  다른 교우들이 헛걸음하지 않도록 알려 주세요. 서로 다른 교우 3명이 신고하면 자동으로 숨겨져요.
                </p>
                <div className="mt-3 space-y-1.5">
                  {REPORT_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-[13.5px] ${
                        reportReason === reason ? 'border-gold bg-gold-soft/60' : 'border-line bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        checked={reportReason === reason}
                        onChange={() => setReportReason(reason)}
                        className="accent-gold"
                      />
                      {reason}
                    </label>
                  ))}
                </div>
                <textarea
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  rows={2}
                  maxLength={200}
                  placeholder="자세한 내용(선택)"
                  className="field mt-2.5 resize-none !text-[13px]"
                />
                {reportError ? <p className="mt-1 text-[12px] text-rose">{reportError}</p> : null}
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setReportOpen(false)} className="btn-ghost flex-1">
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={submitReport}
                    disabled={reportState === 'sending'}
                    className="btn flex-1 bg-rose text-white"
                  >
                    {reportState === 'sending' ? '보내는 중…' : '신고하기'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TopBar() {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-paper/95 px-3 pb-2.5 pt-[max(env(safe-area-inset-top),10px)] backdrop-blur">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        aria-label="뒤로"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[15px] shadow-card"
      >
        ←
      </button>
      <span className="text-[14px] font-extrabold">교우의 집</span>
      <Link to="/" className="ml-auto text-[12px] font-bold text-ink-mute">
        지도
      </Link>
    </header>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
