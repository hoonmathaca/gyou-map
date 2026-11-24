import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import { CATEGORIES, categoryOf } from '../lib/categories'
import { createPlace, uploadSticker } from '../lib/api'
import { geocodeAddress } from '../lib/geocode'
import { shrinkImage } from '../lib/image'
import type { RegistrantType } from '../lib/types'

/** 다음 우편번호 서비스 — 키 없이 쓰는 주소검색 */
const DAUM_SCRIPT = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

interface DaumResult {
  roadAddress: string
  jibunAddress: string
  buildingName: string
  bname: string
  apartment: string
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: { oncomplete: (data: DaumResult) => void; width?: string; height?: string }) => {
        open: (options?: { popupTitle?: string }) => void
        embed: (element: HTMLElement) => void
      }
    }
  }
}

let daumLoading: Promise<void> | null = null
function loadDaum(): Promise<void> {
  if (window.daum?.Postcode) return Promise.resolve()
  if (daumLoading) return daumLoading
  daumLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = DAUM_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('주소검색을 불러오지 못했어요.'))
    document.head.appendChild(script)
  })
  return daumLoading
}

export default function AddPage() {
  const navigate = useNavigate()
  const [registrant, setRegistrant] = useState<RegistrantType>('owner')
  const [name, setName] = useState('')
  const [baptismal, setBaptismal] = useState('')
  const [category, setCategory] = useState('cafe')
  const [address, setAddress] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [intro, setIntro] = useState('')
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null)
  const [center, setCenter] = useState<[number, number]>([37.5665, 126.978])
  const [zoom, setZoom] = useState(12)
  const [geoState, setGeoState] = useState<'idle' | 'finding' | 'ok' | 'fail'>('idle')
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const photoInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.preview)
    }
  }, [photo])

  async function pickAddress() {
    setError('')
    try {
      await loadDaum()
      const Postcode = window.daum?.Postcode
      if (!Postcode) throw new Error('주소검색을 불러오지 못했어요.')
      new Postcode({
        oncomplete: async (data) => {
          const base = data.roadAddress || data.jibunAddress
          setAddress(base)
          if (data.buildingName && data.apartment === 'Y') setAddressDetail(data.buildingName)
          setGeoState('finding')
          const coords = await geocodeAddress(base)
          if (coords) {
            setDraft(coords)
            setCenter([coords.lat, coords.lng])
            setZoom(16)
            setGeoState('ok')
          } else {
            setGeoState('fail')
            setZoom(14)
          }
        },
        width: '100%',
        height: '100%',
      }).open({ popupTitle: '주소 검색' })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function onPickPhoto(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('사진 파일을 골라 주세요.')
      return
    }
    if (photo) URL.revokeObjectURL(photo.preview)
    setPhoto({ file, preview: URL.createObjectURL(file) })
    setError('')
  }

  async function submit() {
    setError('')
    if (!name.trim()) return setError('가게 이름을 적어 주세요.')
    if (!address.trim()) return setError('주소를 찾아 주세요.')
    if (!draft) return setError('지도에서 가게 위치를 확인해 주세요.')
    if (!photo) return setError('교우의 집 스티커 사진을 올려 주세요.')

    setSending(true)
    try {
      const blob = await shrinkImage(photo.file)
      const stickerUrl = await uploadSticker(blob)
      const place = await createPlace({
        name: name.trim().slice(0, 40),
        baptismal_name: baptismal.trim().slice(0, 20) || null,
        category,
        address: address.trim(),
        address_detail: addressDetail.trim().slice(0, 60) || null,
        lat: draft.lat,
        lng: draft.lng,
        intro: intro.trim().slice(0, 120) || null,
        sticker_url: stickerUrl,
        registrant_type: registrant,
      })
      navigate(`/p/${place.id}?new=1`, { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setSending(false)
    }
  }

  return (
    <div className="screen pb-6">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-paper/95 px-3 pb-2.5 pt-[max(env(safe-area-inset-top),10px)] backdrop-blur">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          aria-label="뒤로"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[15px] shadow-card"
        >
          ←
        </button>
        <div>
          <h1 className="text-[15px] font-extrabold leading-tight">교우의 집 등록</h1>
          <p className="text-[11.5px] text-ink-mute">30초면 충분해요</p>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 pt-4">
        <section>
          <span className="label">누가 등록하나요?</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRegistrant('owner')}
              className={`rounded-2xl border px-3 py-3 text-left ${
                registrant === 'owner' ? 'border-ink bg-ink text-paper' : 'border-line bg-white'
              }`}
            >
              <span className="block text-[14px] font-extrabold">사장님 직접</span>
              <span className={`text-[11.5px] ${registrant === 'owner' ? 'text-paper/70' : 'text-ink-mute'}`}>
                우리 가게 등록
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRegistrant('visitor')}
              className={`rounded-2xl border px-3 py-3 text-left ${
                registrant === 'visitor' ? 'border-ink bg-ink text-paper' : 'border-line bg-white'
              }`}
            >
              <span className="block text-[14px] font-extrabold">손님 제보</span>
              <span className={`text-[11.5px] ${registrant === 'visitor' ? 'text-paper/70' : 'text-ink-mute'}`}>
                다녀온 가게 알려주기
              </span>
            </button>
          </div>
        </section>

        <section className="space-y-2.5">
          <div>
            <label htmlFor="name" className="label">
              가게 이름 <span className="text-gold">*</span>
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="예) 하늘빵집"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="baptismal" className="label">
              세례명 <span className="text-ink-mute">(선택)</span>
            </label>
            <input
              id="baptismal"
              value={baptismal}
              onChange={(e) => setBaptismal(e.target.value)}
              maxLength={20}
              placeholder="예) 요한"
              className="field"
            />
          </div>
        </section>

        <section>
          <span className="label">
            업종 <span className="text-gold">*</span>
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`rounded-2xl border px-2 py-2.5 text-[12.5px] font-bold ${
                  category === c.id ? 'border-gold bg-gold-soft text-ink' : 'border-line bg-white text-ink-soft'
                }`}
              >
                <span className="mr-1">{c.glyph}</span>
                {c.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <span className="label">
            주소 <span className="text-gold">*</span>
          </span>
          <div className="flex gap-2">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="주소를 검색해 주세요"
              className="field flex-1"
              aria-label="주소"
            />
            <button type="button" onClick={pickAddress} className="btn-ghost shrink-0 !px-3 !py-2.5 !text-[13px]">
              주소 찾기
            </button>
          </div>
          <input
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
            maxLength={60}
            placeholder="상세 주소 (동·호수, 선택)"
            className="field mt-2"
            aria-label="상세 주소"
          />

          <div className="mt-2 overflow-hidden rounded-3xl border border-line">
            <div className="flex items-center justify-between bg-white px-3 py-2 text-[11.5px] text-ink-mute">
              <span>
                {geoState === 'finding'
                  ? '주소로 위치를 찾는 중…'
                  : geoState === 'ok'
                    ? '핀을 옮겨 정확한 위치로 맞춰 주세요'
                    : draft
                      ? '지도를 눌러 위치를 옮길 수 있어요'
                      : '주소를 찾으면 지도에 표시됩니다'}
              </span>
              {draft ? <span className="font-bold text-gold">위치 지정됨</span> : null}
            </div>
            <div className="h-44">
              <MapView
                draft={draft}
                center={center}
                zoom={zoom}
                onDraftMove={(lat, lng) => {
                  setDraft({ lat, lng })
                  setGeoState('ok')
                }}
              />
            </div>
          </div>
          {geoState === 'fail' ? (
            <p className="mt-1.5 text-[11.5px] leading-snug text-rose">
              주소의 좌표를 자동으로 찾지 못했어요. 지도를 눌러 가게 위치를 직접 지정해 주세요.
            </p>
          ) : null}
        </section>

        <section>
          <label htmlFor="intro" className="label">
            한줄 소개 <span className="text-ink-mute">(선택)</span>
          </label>
          <textarea
            id="intro"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            rows={2}
            maxLength={120}
            placeholder="예) 매일 아침 직접 굽는 빵, 교우 10% 할인"
            className="field resize-none"
          />
        </section>

        <section>
          <span className="label">
            교우의 집 스티커 사진 <span className="text-gold">*</span>
          </span>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            onChange={(e) => onPickPhoto(e.target.files?.[0])}
            className="hidden"
          />
          {photo ? (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-2.5">
              <img src={photo.preview} alt="스티커 미리보기" className="h-20 w-20 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold">{photo.file.name || '사진'}</p>
                <p className="text-[11.5px] text-ink-mute">업로드 전에 자동으로 줄여요</p>
                <div className="mt-1 flex gap-2 text-[11.5px] font-bold">
                  <button type="button" onClick={() => photoInput.current?.click()} className="text-gold">
                    바꾸기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(photo.preview)
                      setPhoto(null)
                    }}
                    className="text-rose"
                  >
                    지우기
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              className="flex w-full flex-col items-center gap-1.5 rounded-2xl border border-dashed border-gold-line bg-gold-soft/40 px-4 py-6 text-center"
            >
              <span className="text-2xl">📷</span>
              <span className="text-[13px] font-bold text-ink-soft">스티커 사진 찍기 / 앨범에서 고르기</span>
              <span className="text-[11.5px] leading-snug text-ink-mute">
                가게 문에 붙은 ‘교우의 집’ 스티커를 찍어 주세요.
                <br />
                확인되면 다른 교우들이 믿고 찾아갈 수 있어요.
              </span>
            </button>
          )}
        </section>

        {error ? <p className="rounded-2xl bg-rose/5 px-3.5 py-3 text-[12.5px] text-rose">{error}</p> : null}

        <button type="button" onClick={submit} disabled={sending} className="btn-primary w-full !py-3.5">
          {sending ? '등록하는 중…' : `${categoryOf(category).label} · 지도에 등록하기`}
        </button>
        <p className="pb-2 text-center text-[11px] leading-relaxed text-ink-mute">
          등록하면 바로 지도에 보여요. 잘못된 정보는 다른 교우의 신고로 숨겨질 수 있어요.
        </p>
      </main>
    </div>
  )
}
