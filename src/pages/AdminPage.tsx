import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminAct, adminLoad, adminLogin, clearToken, savedToken, type AdminAction, type AdminData } from '../lib/admin'
import { categoryOf } from '../lib/categories'
import StarRating from '../components/StarRating'

type Tab = 'places' | 'reviews' | 'reports'

export default function AdminPage() {
  const [token, setToken] = useState(savedToken())
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [data, setData] = useState<AdminData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState<Tab>('places')
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    if (!token) return
    refresh(token)
  }, [token])

  async function refresh(t: string) {
    try {
      const next = await adminLoad(t)
      setData(next)
      setLoadError('')
    } catch (e) {
      const message = (e as Error).message
      if (/인증|권한|세션/.test(message)) {
        clearToken()
        setToken('')
        setData(null)
        setLoginError('다시 로그인해 주세요.')
      } else {
        setLoadError(message)
      }
    }
  }

  async function login() {
    setLoggingIn(true)
    setLoginError('')
    try {
      const t = await adminLogin(password)
      setPassword('')
      setToken(t)
    } catch (e) {
      setLoginError((e as Error).message)
    } finally {
      setLoggingIn(false)
    }
  }

  async function act(action: AdminAction, id: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusyId(id)
    try {
      await adminAct(token, action, id)
      await refresh(token)
    } catch (e) {
      setLoadError((e as Error).message)
    } finally {
      setBusyId('')
    }
  }

  if (!token) {
    return (
      <div className="screen">
        <header className="border-b border-line px-4 pb-3 pt-[max(env(safe-area-inset-top),14px)]">
          <h1 className="text-[17px] font-extrabold">관리자</h1>
          <p className="text-[12px] text-ink-mute">교우의 집 지도 운영 도구</p>
        </header>
        <main className="flex flex-1 flex-col justify-center px-6 pb-24">
          <div className="card space-y-3 p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-[18px] text-paper">
                🔑
              </span>
              <div>
                <p className="text-[15px] font-extrabold">관리자 로그인</p>
                <p className="text-[11.5px] text-ink-mute">비밀번호는 운영자만 알고 있어요</p>
              </div>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') login()
              }}
              placeholder="관리자 비밀번호"
              className="field"
              autoComplete="current-password"
            />
            {loginError ? <p className="text-[12px] text-rose">{loginError}</p> : null}
            <button type="button" onClick={login} disabled={loggingIn || !password} className="btn-primary w-full">
              {loggingIn ? '확인 중…' : '들어가기'}
            </button>
          </div>
          <Link to="/" className="mt-4 text-center text-[12px] font-bold text-ink-mute">
            ← 지도로 돌아가기
          </Link>
        </main>
      </div>
    )
  }

  const places = data?.places ?? []
  const reviews = data?.reviews ?? []
  const reports = data?.reports ?? []
  const hiddenPlaces = places.filter((p) => p.hidden).length
  const placeName = (id: string) => places.find((p) => p.id === id)?.name ?? '(삭제된 가게)'

  return (
    <div className="screen pb-10">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 px-4 pb-2 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-extrabold">관리자</h1>
            <p className="text-[11.5px] text-ink-mute">
              가게 {places.length} · 숨김 {hiddenPlaces} · 리뷰 {reviews.length} · 신고 {reports.length}
            </p>
          </div>
          <div className="flex gap-2 text-[11.5px] font-bold">
            <button type="button" onClick={() => refresh(token)} className="rounded-full border border-line bg-white px-2.5 py-1.5">
              새로고침
            </button>
            <button
              type="button"
              onClick={() => {
                clearToken()
                setToken('')
                setData(null)
              }}
              className="rounded-full border border-line bg-white px-2.5 py-1.5 text-ink-mute"
            >
              로그아웃
            </button>
          </div>
        </div>
        <div className="mt-2 flex rounded-2xl bg-white p-0.5 text-[12.5px] font-bold shadow-card">
          {(
            [
              ['places', `가게 ${places.length}`],
              ['reviews', `리뷰 ${reviews.length}`],
              ['reports', `신고 ${reports.length}`],
            ] as Array<[Tab, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-xl py-2 ${tab === id ? 'bg-ink text-paper' : 'text-ink-mute'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 space-y-2.5 px-4 pt-3">
        {loadError ? <p className="rounded-2xl bg-rose/5 px-3 py-2.5 text-[12px] text-rose">{loadError}</p> : null}
        {!data ? <p className="py-8 text-center text-[13px] text-ink-mute">불러오는 중…</p> : null}

        {tab === 'places'
          ? places.map((p) => (
              <div key={p.id} className="card p-3">
                <div className="flex gap-2.5">
                  <img src={p.sticker_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/p/${p.id}`} className="truncate text-[13.5px] font-extrabold">
                        {p.name}
                        {p.baptismal_name ? `(${p.baptismal_name})` : ''}
                      </Link>
                      {p.hidden ? (
                        <span className="shrink-0 rounded-full bg-rose/10 px-1.5 py-0.5 text-[10px] font-bold text-rose">
                          숨김
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-[11.5px] text-ink-mute">
                      {categoryOf(p.category).label} · {p.address}
                    </p>
                    <p className="text-[11px] text-ink-mute">
                      {p.registrant_type === 'owner' ? '사장님' : '손님 제보'} · 신고 {p.report_count} ·{' '}
                      {formatDate(p.created_at)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex gap-1.5 text-[11.5px] font-bold">
                  {p.hidden ? (
                    <ActionBtn onClick={() => act('place.restore', p.id)} busy={busyId === p.id} tone="ok">
                      복구
                    </ActionBtn>
                  ) : (
                    <ActionBtn onClick={() => act('place.hide', p.id)} busy={busyId === p.id}>
                      숨김
                    </ActionBtn>
                  )}
                  <ActionBtn
                    onClick={() => act('place.delete', p.id, `'${p.name}' 가게를 완전히 삭제할까요? 리뷰와 신고도 함께 지워집니다.`)}
                    busy={busyId === p.id}
                    tone="danger"
                  >
                    삭제
                  </ActionBtn>
                </div>
              </div>
            ))
          : null}

        {tab === 'reviews'
          ? reviews.map((r) => (
              <div key={r.id} className="card p-3">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[12.5px] font-extrabold">
                    {placeName(r.place_id)} · {r.nickname}
                  </span>
                  {r.hidden ? (
                    <span className="shrink-0 rounded-full bg-rose/10 px-1.5 py-0.5 text-[10px] font-bold text-rose">
                      숨김
                    </span>
                  ) : null}
                  <span className="ml-auto shrink-0 text-[10.5px] text-ink-mute">{formatDate(r.created_at)}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <StarRating value={r.rating} size={11} />
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-snug text-ink-soft">{r.content}</p>
                <div className="mt-2 flex gap-1.5 text-[11.5px] font-bold">
                  {r.hidden ? (
                    <ActionBtn onClick={() => act('review.restore', r.id)} busy={busyId === r.id} tone="ok">
                      복구
                    </ActionBtn>
                  ) : (
                    <ActionBtn onClick={() => act('review.hide', r.id)} busy={busyId === r.id}>
                      숨김
                    </ActionBtn>
                  )}
                  <ActionBtn
                    onClick={() => act('review.delete', r.id, '이 리뷰를 완전히 삭제할까요?')}
                    busy={busyId === r.id}
                    tone="danger"
                  >
                    삭제
                  </ActionBtn>
                </div>
              </div>
            ))
          : null}

        {tab === 'reports'
          ? reports.map((r) => (
              <div key={r.id} className="card p-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-extrabold">{placeName(r.place_id)}</span>
                  <span className="rounded-full bg-gold-soft px-1.5 py-0.5 text-[10px] font-bold text-gold">
                    {r.reason}
                  </span>
                  <span className="ml-auto text-[10.5px] text-ink-mute">{formatDate(r.created_at)}</span>
                </div>
                {r.detail ? <p className="mt-1 text-[12.5px] text-ink-soft">{r.detail}</p> : null}
                <div className="mt-2 flex gap-1.5 text-[11.5px] font-bold">
                  <ActionBtn
                    onClick={() => act('report.delete', r.id, '이 신고를 지울까요? 신고 수가 다시 계산됩니다.')}
                    busy={busyId === r.id}
                    tone="danger"
                  >
                    신고 삭제
                  </ActionBtn>
                </div>
              </div>
            ))
          : null}

        {data &&
        ((tab === 'places' && places.length === 0) ||
          (tab === 'reviews' && reviews.length === 0) ||
          (tab === 'reports' && reports.length === 0)) ? (
          <p className="py-10 text-center text-[13px] text-ink-mute">내역이 없습니다.</p>
        ) : null}
      </main>
    </div>
  )
}

function ActionBtn({
  children,
  onClick,
  busy,
  tone = 'normal',
}: {
  children: React.ReactNode
  onClick: () => void
  busy?: boolean
  tone?: 'normal' | 'danger' | 'ok'
}) {
  const color =
    tone === 'danger' ? 'text-rose border-rose/30' : tone === 'ok' ? 'text-gold border-gold-line' : 'text-ink-soft border-line'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`rounded-full border bg-white px-3 py-1.5 ${color} disabled:opacity-50`}
    >
      {children}
    </button>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
