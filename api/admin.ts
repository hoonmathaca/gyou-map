/**
 * 교우의 집 지도 — 관리자 API (Vercel Serverless Function, /api/admin)
 *
 *  POST { password }                → 로그인, 서명된 세션 토큰 발급
 *  GET  (Authorization: Bearer …)   → 가게·리뷰·신고 전체 목록 (숨김 포함)
 *  POST { token, action, id }       → 숨김 / 복구 / 삭제
 *
 *  · 관리자 비밀번호는 서버 환경변수에만 있다 (브라우저 번들에 내려가지 않는다).
 *  · DB 접속은 서버에서만 쓰는 풀러 연결 문자열(DATABASE_URL)로 한다.
 *    service_role 키를 브라우저나 저장소에 두지 않는다.
 *
 *  필요한 Vercel 환경변수
 *    DATABASE_URL        postgres://postgres.<ref>:<비밀번호>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
 *    ADMIN_PASSWORD      관리자 비밀번호 (Vercel 'Secret' 타입, 기본 0801)
 *                        (VITE_ADMIN_PASSWORD 로 넣어도 인식한다)
 *    ADMIN_TOKEN_SECRET  (선택) 세션 토큰 서명 키
 */
import crypto from 'node:crypto'
import { Pool } from 'pg'

declare const process: { env: Record<string, string | undefined> }

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? process.env.VITE_ADMIN_PASSWORD ?? '0801'
const TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET ?? crypto.createHash('sha256').update(`gyou-map|${ADMIN_PASSWORD}`).digest('hex')
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000

interface ApiRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}
interface ApiResponse {
  status: (code: number) => ApiResponse
  setHeader: (name: string, value: string) => void
  json: (body: unknown) => void
  end: (body?: string) => void
}

/* ── DB ─────────────────────────────────────────────────────────── */
interface PoolHolder {
  pool?: Pool
}
const holder = globalThis as unknown as PoolHolder

function db(): Pool {
  if (!holder.pool) {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? ''
    holder.pool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      ssl: { rejectUnauthorized: false },
    })
  }
  return holder.pool
}

/* ── 토큰 ───────────────────────────────────────────────────────── */
function sign(payload: string) {
  return crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url')
}

function issueToken(): string {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString('base64url')
  return `${body}.${sign(body)}`
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false
  const [body, mac] = token.split('.')
  if (!body || !mac) return false
  const expected = sign(body)
  if (mac.length !== expected.length) return false
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString()) as { exp?: number }
    return typeof parsed.exp === 'number' && parsed.exp > Date.now()
  } catch {
    return false
  }
}

const failures = new globalThis.Map<string, { count: number; at: number }>()

function clientIp(req: ApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return (value ?? 'unknown').split(',')[0].trim()
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 신고 수를 다시 세고 자동 숨김 상태를 맞춘다 */
async function recomputeReports(placeId: string) {
  await db().query(
    `with counted as (
       select count(*)::int as n from public.reports where place_id = $1
     )
     update public.places p
        set report_count = counted.n,
            auto_hidden  = counted.n >= 3,
            hidden       = p.manual_hidden or counted.n >= 3
       from counted
      where p.id = $1`,
    [placeId],
  )
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    res.status(500).json({ error: '서버 DB 설정이 아직 완료되지 않았어요.' })
    return
  }

  try {
    if (req.method === 'GET') {
      const header = req.headers.authorization
      const token = (Array.isArray(header) ? header[0] : header ?? '').replace(/^Bearer\s+/i, '')
      if (!verifyToken(token)) {
        res.status(401).json({ error: '관리자 인증이 필요해요.' })
        return
      }
      const [places, reviews, reports] = await Promise.all([
        db().query('select * from public.places order by created_at desc'),
        db().query('select * from public.reviews order by created_at desc'),
        db().query(
          'select id, created_at, place_id, reason, detail from public.reports order by created_at desc',
        ),
      ])
      res.status(200).json({ places: places.rows, reviews: reviews.rows, reports: reports.rows })
      return
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: '지원하지 않는 요청이에요.' })
      return
    }

    const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as Record<string, unknown> | null
    if (!body) {
      res.status(400).json({ error: '잘못된 요청이에요.' })
      return
    }

    // ── 로그인
    if (typeof body.password === 'string' && !body.action) {
      const ip = clientIp(req)
      const record = failures.get(ip)
      if (record && record.count >= 8 && Date.now() - record.at < 10 * 60 * 1000) {
        res.status(429).json({ error: '시도가 너무 많아요. 10분 뒤에 다시 시도해 주세요.' })
        return
      }
      const given = Buffer.from(body.password)
      const expected = Buffer.from(ADMIN_PASSWORD)
      const ok = given.length === expected.length && crypto.timingSafeEqual(given, expected)
      if (!ok) {
        failures.set(ip, { count: (record?.count ?? 0) + 1, at: Date.now() })
        res.status(401).json({ error: '비밀번호가 맞지 않아요.' })
        return
      }
      failures.delete(ip)
      res.status(200).json({ token: issueToken() })
      return
    }

    // ── 관리 동작
    const token = typeof body.token === 'string' ? body.token : ''
    if (!verifyToken(token)) {
      res.status(401).json({ error: '관리자 인증이 필요해요. 다시 로그인해 주세요.' })
      return
    }
    const action = String(body.action ?? '')
    const id = String(body.id ?? '')
    if (!UUID.test(id)) {
      res.status(400).json({ error: '대상이 올바르지 않아요.' })
      return
    }

    switch (action) {
      case 'place.hide':
        await db().query('update public.places set hidden = true, manual_hidden = true where id = $1', [id])
        break
      case 'place.restore':
        await db().query(
          `update public.places
              set hidden = false, manual_hidden = false, auto_hidden = false, report_count = 0
            where id = $1`,
          [id],
        )
        await db().query('delete from public.reports where place_id = $1', [id])
        break
      case 'place.delete': {
        await db().query('delete from public.places where id = $1', [id])
        break
      }
      case 'review.hide':
        await db().query('update public.reviews set hidden = true where id = $1', [id])
        break
      case 'review.restore':
        await db().query('update public.reviews set hidden = false where id = $1', [id])
        break
      case 'review.delete':
        await db().query('delete from public.reviews where id = $1', [id])
        break
      case 'report.delete': {
        const found = await db().query<{ place_id: string }>(
          'select place_id from public.reports where id = $1',
          [id],
        )
        await db().query('delete from public.reports where id = $1', [id])
        const placeId = found.rows[0]?.place_id
        if (placeId) await recomputeReports(placeId)
        break
      }
      default:
        res.status(400).json({ error: '알 수 없는 동작이에요.' })
        return
    }

    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('admin api error', error)
    res.status(500).json({ error: '처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.' })
  }
}

/**
 * 스티커 사진 파일은 Supabase Storage 에 남는다 (직접 삭제는 Storage API 전용이라
 * 서버에서 service_role 없이 지울 수 없다). 필요하면 대시보드 Storage 에서 정리한다.
 */

function safeParse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}
