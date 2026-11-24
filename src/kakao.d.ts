declare global {
  /* 카카오맵 SDK — 쓰는 만큼만 any 로 열어 둔다 */
  interface Window {
    kakao: any
    daum?: any
  }
}

export {}
