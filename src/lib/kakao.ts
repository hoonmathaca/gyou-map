/**
 * 카카오맵 JavaScript SDK 로더.
 * 키는 빌드 시 VITE_KAKAO_MAP_KEY 로 주입된다(.env.local · Vercel 환경변수).
 * 도메인 제한이 걸려 있어 카카오 콘솔에 등록한 도메인에서만 동작한다.
 */
export const KAKAO_KEY = ((import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined) ?? '').trim()

export const kakaoReady = () => Boolean(window.kakao?.maps)

let pending: Promise<void> | null = null

export function loadKakao(): Promise<void> {
  if (kakaoReady()) return Promise.resolve()
  if (!KAKAO_KEY) return Promise.reject(new Error('카카오 지도 키가 설정되지 않았어요.'))
  if (pending) return pending

  pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false&language=ko`
    script.onload = () => {
      const kakao = window.kakao
      if (!kakao?.maps?.load) {
        reject(new Error('지도를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.'))
        return
      }
      kakao.maps.load(() => resolve())
    }
    script.onerror = () => {
      pending = null
      reject(new Error('지도를 불러오지 못했어요. 네트워크를 확인해 주세요.'))
    }
    document.head.appendChild(script)
  })
  return pending
}

export function latLng(lat: number, lng: number): any {
  return new window.kakao.maps.LatLng(lat, lng)
}
