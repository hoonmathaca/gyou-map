# 교우의 집 지도 ⛪

천주교 교우가 운영하는 가게를 지도에서 찾는 웹앱입니다.
가게 문에 붙은 **‘교우의 집’ 스티커 사진**으로 믿고 찾아갈 수 있게 했습니다.

- 배포: **https://gyou-map.vercel.app** (관리자 https://gyou-map.vercel.app/admin)
- 저장소: https://github.com/hoonmathaca/gyou-map
- 지도: Leaflet + OpenStreetMap (**API 키 없이 바로 열립니다**)
- 주소: 다음 우편번호 서비스(`postcode.map.daum.net`, 키 불필요) + OpenStreetMap 좌표 변환
- 저장: Supabase (Postgres · Storage) / 배포: Vercel 무료 플랜

## 화면

| 경로 | 설명 |
| --- | --- |
| `/` | 지도 · 목록 — 가게이름/세례명/지역 검색, 업종 필터, 마커 → 요약 카드 |
| `/p/:id` | 가게 상세 — 스티커 사진, 정보, 리뷰 목록·작성, `사실과 달라요` 신고 |
| `/add` | 등록 — 사장님 직접 / 손님 제보, 주소검색, 지도 핀 조정, 사진 첨부(자동 축소) |
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

## 구조

```
src/
  components/MapView.tsx     지도 (Leaflet) — 카카오맵으로 바꿀 때 이 파일만 교체
  components/PlaceCard.tsx   목록 카드 · 스티커 썸네일
  components/StarRating.tsx  별점
  lib/api.ts                 Supabase 읽기/쓰기 (places, reviews, report RPC, 업로드)
  lib/admin.ts               /api/admin 호출 (로그인·목록·처리)
  lib/geocode.ts             주소 → 좌표 (Nominatim)
  lib/image.ts               사진 축소
  lib/categories.ts          업종 12종 · 신고 사유
  pages/MapPage.tsx  PlacePage.tsx  AddPage.tsx  AdminPage.tsx
api/admin.ts                 관리자 API (Vercel Serverless, pg 로 DB 직접 접속)
supabase/schema.sql          테이블·RLS·RPC·Storage 버킷
```

## 환경변수

`.env.local` (로컬) 과 Vercel 프로젝트 설정에 같은 값을 넣습니다.

| 이름 | 값 | 노출 |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://viagypcoagausmwdlijd.supabase.co` | 브라우저 OK |
| `VITE_SUPABASE_ANON_KEY` | publishable 키 | 브라우저 OK |
| `ADMIN_PASSWORD` | 관리자 비밀번호(기본 `0801`) — Vercel 'Secret' 타입 | **서버만** (앱 번들에 들어가지 않음) |
| `DATABASE_URL` | `postgres://postgres.<ref>:<DB비밀번호>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres` | **서버만** |
| `ADMIN_TOKEN_SECRET` | (선택) 세션 토큰 서명 키 | **서버만** |

> 관리자 비밀번호는 `/api/admin` 서버리스 함수 안에서만 비교합니다. 브라우저 번들에는
> 비밀번호도 service_role 키도 들어가지 않습니다.

## 로컬 실행

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # 타입체크 + 배포 빌드
```

로컬(`vite dev`)에서는 `/api/admin` 이 없으므로 관리자 화면은 Vercel 배포본에서 사용합니다.

## 데이터베이스

`supabase/schema.sql` 을 Supabase Dashboard → SQL Editor 에 붙여넣고 한 번 실행하면
테이블 3개, RLS 정책, `report_place()` RPC, `stickers` 버킷이 만들어집니다. 여러 번 실행해도 안전합니다.

## 관리자 비밀번호 바꾸기

Vercel 환경변수 `ADMIN_PASSWORD`(Secret) 를 바꾸고 재배포하면 됩니다.
(`VITE_ADMIN_PASSWORD` 로 넣어도 서버 함수가 같은 값으로 읽습니다.)
(비밀번호는 서버에서만 쓰이므로 DB에는 저장되지 않습니다.)
