# 천주교 교우의 집 지도 ⛪

천주교 교우가 운영하는 가게를 지도에서 찾는 웹앱입니다.
가게 문에 붙은 **‘천주교 교우의 집’ 스티커 사진**으로 믿고 찾아갈 수 있게 했습니다.
테마 색은 훈수학학원(선오공) 시그니처 남색·파랑입니다 — `navy #12296B` · `blue #1D4A9B`.

- 배포: **https://gyou-map.vercel.app** (관리자 https://gyou-map.vercel.app/admin)
- 저장소: https://github.com/hoonmathaca/gyou-map
- 지도: **카카오맵 JavaScript SDK** (앱 ID 1664277 · 카카오맵 무료 쿼터 사용)
- 주소·장소 검색: 카카오 장소 검색(`services.Places`) + 다음 우편번호 서비스(키 불필요)
- 저장: Supabase (Postgres · Storage) / 배포: Vercel 무료 플랜

## 화면

| 경로 | 설명 |
| --- | --- |
| `/` | 전체 화면 카카오맵 — 검색바·업종 필터 칩, 마커 아래 `가게이름(세례명)` 라벨, 우측 플로팅 버튼(내 위치·목록·등록), 마커 탭 시 하단 프리뷰 카드(거리·주소·한줄 소개·스티커 썸네일 → 길찾기 / 상세보기) |
| `/p/:id` | 가게 상세 — 업종·이름·주소(복사 버튼), 한줄 소개, 미니 카카오맵 + 길찾기, 스티커 사진 크게 보기, 교우 리뷰, `사실과 달라요` 신고 |
| `/add` | 등록 — 사장님 직접 / 손님 제보, 장소 검색(카카오) 또는 주소 검색(다음)으로 좌표·주소 자동 채움, 지도 핀 미세 조정, 스티커 사진 첨부(자동 축소) |
| `/admin` | 관리자 — 가게·리뷰·신고 확인, 숨김·복구·삭제 |

## 동작 규칙

- **등록 즉시 노출**: 등록이 끝나면 바로 지도에 마커가 생깁니다.
- **신고 3회 → 자동 숨김**: 서로 다른 브라우저 3곳에서 신고가 쌓이면 `report_place()`
  RPC가 `auto_hidden` 을 켜고 목록·지도·상세에서 사라집니다. 같은 브라우저는 1회만
  (`reports` 의 `unique (place_id, reporter_key)`).
- **관리자 복구**: 복구하면 신고 내역을 비우고 다시 노출합니다.
- **사진**: 업로드 전에 긴 변 1200px·JPEG 0.82 로 브라우저에서 줄여 올립니다
  (`src/lib/image.ts`). Storage 버킷 `stickers` 는 공개 읽기, 익명 업로드 허용(5MB 제한).
- **삭제**: 관리자가 가게를 지우면 DB 행(가게·리뷰·신고)은 바로 사라집니다. 사진 파일은
  Storage 에 남으므로(직접 삭제는 Storage API 전용) 필요하면 대시보드 Storage 에서 정리합니다.
- **지도 라벨**: 줌 레벨 8보다 멀리 보면 라벨을 숨겨 겹침을 줄이고, 선택한 가게의 라벨은 항상 보입니다.

## 카카오 개발자 설정 (2026-11-24)

| 항목 | 값 |
| --- | --- |
| 앱 이름 | 교우의 집 지도 (앱 ID `1664277`) — 카카오 콘솔 등록명 |
| 카테고리 | 지도/내비게이션 |
| 제품 | 제품 설정 → 카카오맵 **사용 설정 ON** (이 계정의 첫 활성화 앱 → 무료 쿼터) |
| JavaScript SDK 도메인 | `https://gyou-map.vercel.app`, `http://localhost:5174`, `http://localhost:5173` |

## 구조

```
src/
  components/KakaoMap.tsx      카카오맵 (마커 CustomOverlay·라벨·등록 핀·내 위치)
  components/categorySvg.ts    업종 아이콘 SVG 문자열 (마커 HTML 과 React 공용)
  components/icons.tsx         선 아이콘 · 업종 아이콘 컴포넌트
  components/PlaceCard.tsx     스티커 썸네일 · 카드
  components/StarRating.tsx    별점
  lib/kakao.ts                 SDK 로더(VITE_KAKAO_MAP_KEY)
  lib/geo.ts                   거리·길찾기 링크·주소 복사
  lib/api.ts                   Supabase 읽기/쓰기 (places, reviews, report RPC, 업로드)
  lib/admin.ts                 /api/admin 호출 (로그인·목록·처리)
  lib/image.ts                 사진 축소
  lib/categories.ts            업종 12종 · 신고 사유
  pages/MapPage.tsx  PlacePage.tsx  AddPage.tsx  AdminPage.tsx
api/admin.ts                   관리자 API (Vercel Serverless, pg 로 DB 직접 접속)
supabase/schema.sql            테이블·RLS·RPC·Storage 버킷
```

## 환경변수

`.env.local` (로컬) 과 Vercel 프로젝트 설정에 같은 값을 넣습니다.

| 이름 | 값 | 노출 |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://viagypcoagausmwdlijd.supabase.co` | 브라우저 OK |
| `VITE_SUPABASE_ANON_KEY` | publishable 키 | 브라우저 OK |
| `VITE_KAKAO_MAP_KEY` | 카카오 **JavaScript 키** (도메인 제한) | 브라우저 OK — 저장소에는 커밋하지 않음 |
| `ADMIN_PASSWORD` | 관리자 비밀번호(기본 `0801`) — Vercel 'Secret' 타입 | **서버만** (앱 번들에 들어가지 않음) |
| `DATABASE_URL` | `postgres://postgres.<ref>:<DB비밀번호>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres` | **서버만** |
| `ADMIN_TOKEN_SECRET` | (선택) 세션 토큰 서명 키 | **서버만** |

> 카카오 JavaScript 키는 브라우저에 내려가는 공개 키지만(도메인 제한으로 보호), 저장소에는
> 평문으로 커밋하지 않습니다. 키를 바꾸려면 카카오 콘솔에서 새 키를 받아 `.env.local` 과
> Vercel 환경변수만 갱신하고 다시 배포하면 됩니다.
