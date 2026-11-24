import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KakaoMap from '../components/KakaoMap'
import { CatIcon, Icon } from '../components/icons'
import { CATEGORIES, categoryOf } from '../lib/categories'
import { createPlace, uploadSticker } from '../lib/api'
import { loadKakao } from '../lib/kakao'
import { shrinkImage } from '../lib/image'
import type { RegistrantType } from '../lib/types'

/** 다음 우편번호 서비스 — 키 없이 쓰는 주소검색 */
const DAUM_SCRIPT = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

interface DaumResult {
  roadAddress: string
  jibunAddress: string
  buildingName: string
  apartment: string
}

interface FoundPlace {
  id: string
  name: string
  category: string
  address: string
  roadAddress: string
  lat: number
  lng: number
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

/** 카카오 장소 검색 결과의 업종 → 우리 업종 */
function guessCategory(name: string, categoryName: string, groupCode: string): string {
  const text = `${name} ${categoryName}`
  const has = (...words: string[]) => words.some((w) => text.includes(w))
  if (groupCode === 'CE7' || has('카페', '커피', '디저트')) return 'cafe'
  if (has('베이커리', '제과', '빵', '케이크')) return 'bakery'
  if (groupCode === 'FD6' || has('음식점', '식당', '국밥', '분식', '고기')) return 'restaurant'
  if (has('꽃', '화훼', '플라워')) return 'flower'
  if (has('미용', '헤어', '네일', '피부', '뷰티')) return 'beauty'
  if (groupCode === 'PM9' || groupCode === 'HP8' || has('병원', '약국', '의원', '한의원')) return 'health'
  if (groupCode === 'CS2' || groupCode === 'MT1' || has('마트', '편의점', '식료품', '청과')) return 'grocery'
  if (has('학원', '교육', '교습', '독서실')) return 'edu'
  if (has('의류', '패션', '잡화', '신발', '가방')) return 'shop'
  if (has('부동산', '세탁', '수리', '철물')) return 'service'
  if (has('사진', '인쇄', '복사')) return 'photo'
  return 'etc'
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
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<FoundPlace[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const photoInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.preview)
    }
  }, [photo])

  /** 카카오 장소 검색 — 가게 이름·주소로 찾아 좌표까지 채운다 */
  async function searchPlaces() {
    const q = keyword.trim()
    if (!q) return
    setError('')
    setSearching(true)
    setSearched(false)
    try {
      await loadKakao()
      const services = window.kakao.maps.services
      const ps = new services.Places()
      const found = await new Promise<FoundPlace[]>((resolve) => {
        ps.keywordSearch(
          q,
          (data: any[], status: string) => {
            if (status !== services.Status.OK) {
              resolve([])
              return
            }
            resolve(
              data.map((d) => ({
                id: String(d.id),
                name: d.place_name as string,
                category: guessCategory(d.place_name, d.category_name ?? '', d.category_group_code ?? ''),
                address: (d.road_address_name || d.address_name) as string,
                roadAddress: (d.address_name || '') as string,
                lat: Number(d.y),
                lng: Number(d.x),
              })),
            )
          },
          { size: 10 },
        )
      })
      setResults(found)
      setSearched(true)
      if (found.length === 0) setError('검색 결과가 없어요. 주소로 직접 찾아 주세요.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSearching(false)
    }
  }

  function pickFound(item: FoundPlace) {
    setName(item.name.slice(0, 40))
    if (item.address) setAddress(item.address.slice(0, 200))
    if (!CATEGORIES.some((c) => c.id === category) || category === 'cafe') setCategory(item.category)
    setDraft({ lat: item.lat, lng: item.lng })
    setCenter({ lat: item.lat, lng: item.lng })
    setResults([])
    setSearched(false)
    setKeyword(item.name)
  }

  /** 다음 우편번호 → 카카오 지오코딩 */
  async function pickAddress() {
    setError('')
    try {
      await loadDaum()
      const Postcode = window.daum?.Postcode
      if (!Postcode) throw new Error('주소검색을 불러오지 못했어요.')
      new Postcode({
        oncomplete: async (data: DaumResult) => {
          const base = data.roadAddress || data.jibunAddress
          setAddress(base)
          if (data.buildingName && data.apartment === 'Y') setAddressDetail(data.buildingName)
          try {
            await loadKakao()
            const geocoder = new window.kakao.maps.services.Geocoder()
            geocoder.addressSearch(base, (result: any[], status: string) => {
              const first = result?.[0]
              if (status === window.kakao.maps.services.Status.OK && first) {
                const next = { lat: Number(first.y), lng: Number(first.x) }
                setDraft(next)
                setCenter(next)
              } else {
                setError('주소의 좌표를 찾지 못했어요. 지도를 눌러 위치를 지정해 주세요.')
              }
            })
          } catch (e) {
            setError((e as Error).message)
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
    <div className="screen bg-paper pb-8">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line/70 bg-paper/95 px-3 pb-2.5 pt-[max(env(safe-area-inset-top),10px)] backdrop-blur">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          aria-label="뒤로"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink shadow-card"
        >
          <Icon name="back" className="h-4.5 w-4.5" />
        </button>
        <div>
          <h1 className="text-[15px] font-extrabold leading-tight">교우의 집 등록</h1>
          <p className="text-[11px] leading-tight text-ink-mute">1분이면 충분해요</p>
        </div>
      </header>

      <main className="flex-1 space-y-5 px-4 pt-4">
        {/* 누가 등록하나요 */}
        <section>
          <span className="label">누가 등록하나요?</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRegistrant('owner')}
              className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                registrant === 'owner'
                  ? 'border-gold bg-gold text-white shadow-card'
                  : 'border-line bg-white text-ink'
              }`}
            >
              <span className="block text-[13.5px] font-extrabold">사장님 직접</span>
              <span className={`text-[11px] ${registrant === 'owner' ? 'text-white/75' : 'text-ink-mute'}`}>
                우리 가게 등록
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRegistrant('visitor')}
              className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                registrant === 'visitor'
                  ? 'border-gold bg-gold text-white shadow-card'
                  : 'border-line bg-white text-ink'
              }`}
            >
              <span className="block text-[13.5px] font-extrabold">손님 제보</span>
              <span className={`text-[11px] ${registrant === 'visitor' ? 'text-white/75' : 'text-ink-mute'}`}>
                다녀온 가게 알려주기
              </span>
            </button>
          </div>
        </section>

        {/* 장소 검색 */}
        <section>
          <span className="label">장소 검색</span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute"
              />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    searchPlaces()
                  }
                }}
                placeholder="가게 이름이나 주소로 검색"
                className="field !pl-10 !text-[13.5px]"
                aria-label="장소 검색"
              />
            </div>
            <button
              type="button"
              onClick={searchPlaces}
              disabled={searching}
              className="btn-primary shrink-0 !rounded-2xl !px-4 !py-2.5 !text-[13px]"
            >
              {searching ? '찾는 중' : '검색'}
            </button>
          </div>

          <button
            type="button"
            onClick={pickAddress}
            className="mt-1.5 text-[11.5px] font-bold text-gold-deep underline decoration-gold-line underline-offset-2"
          >
            주소로 직접 찾기
          </button>

          {results.length > 0 ? (
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => pickFound(item)}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left active:bg-gold-soft/50"
                  >
                    <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-extrabold">{item.name}</span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-ink-mute">{item.address}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {searched && results.length === 0 ? (
            <p className="mt-2 text-[11.5px] leading-snug text-ink-mute">
              검색 결과가 없어요. ‘주소로 직접 찾기’로 주소를 넣어 주세요.
            </p>
          ) : null}
        </section>

        {/* 이름 · 세례명 */}
        <section className="space-y-2.5">
          <div>
            <label htmlFor="name" className="label">
              가게 이름 <span className="text-rose">*</span>
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
              세례명 <span className="font-bold text-ink-mute">(선택)</span>
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

        {/* 업종 */}
        <section>
          <span className="label">
            업종 <span className="text-rose">*</span>
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`flex items-center justify-center gap-1 rounded-2xl border px-1.5 py-2.5 text-[12px] font-bold transition ${
                  category === c.id
                    ? 'border-gold bg-gold text-white'
                    : 'border-line bg-white text-ink-soft'
                }`}
              >
                <CatIcon id={c.id} className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 주소 · 위치 */}
        <section>
          <span className="label">
            주소 <span className="text-rose">*</span>
          </span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="주소를 검색해 주세요"
            className="field"
            aria-label="주소"
          />
          <input
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
            maxLength={60}
            placeholder="상세 주소 (동·호수, 선택)"
            className="field mt-2"
            aria-label="상세 주소"
          />

          <div className="mt-2 overflow-hidden rounded-3xl border border-line bg-white">
            <div className="flex items-center justify-between px-3 py-2 text-[11px] text-ink-mute">
              <span>
                {draft ? '핀을 끌거나 지도를 눌러 위치를 맞춰 주세요' : '장소를 검색하면 지도에 표시됩니다'}
              </span>
              {draft ? <span className="font-bold text-gold-deep">위치 지정됨</span> : null}
            </div>
            <KakaoMap
              className="h-48 w-full"
              draft={draft}
              center={center}
              level={4}
              fitSignal={draft ? 'draft' : undefined}
              onDraftMove={(lat, lng) => setDraft({ lat, lng })}
              onMapClick={(lat, lng) => setDraft({ lat, lng })}
            />
          </div>
        </section>

        {/* 한줄 소개 */}
        <section>
          <label htmlFor="intro" className="label">
            한줄 소개 <span className="font-bold text-ink-mute">(선택)</span>
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

        {/* 스티커 사진 */}
        <section>
          <span className="label">
            교우의 집 스티커 사진 <span className="text-rose">*</span>
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
                <p className="text-[11px] text-ink-mute">업로드 전에 자동으로 줄여요</p>
                <div className="mt-1 flex gap-3 text-[11.5px] font-bold">
                  <button type="button" onClick={() => photoInput.current?.click()} className="text-gold-deep">
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
              className="flex w-full flex-col items-center gap-1.5 rounded-3xl border border-dashed border-gold-line bg-gold-soft/40 px-4 py-6 text-center"
            >
              <Icon name="camera" className="h-6 w-6 text-gold-deep" />
              <span className="text-[13px] font-extrabold text-gold-deep">스티커 사진 찍기 / 앨범에서 고르기</span>
              <span className="text-[11px] leading-snug text-ink-mute">
                가게 문에 붙은 ‘교우의 집’ 스티커를 찍어 주세요.
                <br />
                확인되면 다른 교우들이 믿고 찾아갈 수 있어요.
              </span>
            </button>
          )}
        </section>

        {error ? (
          <p className="rounded-2xl bg-rose/5 px-3.5 py-3 text-[12.5px] leading-relaxed text-rose">{error}</p>
        ) : null}

        <div className="space-y-2 pb-2">
          <button type="button" onClick={submit} disabled={sending} className="btn-primary w-full !py-3.5">
            {sending ? '등록하는 중…' : `${categoryOf(category).label} · 지도에 등록하기`}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-ink-mute">
            등록하면 바로 지도에 보여요. 잘못된 정보는 다른 교우의 신고로 숨겨질 수 있어요.
          </p>
        </div>
      </main>
    </div>
  )
}
