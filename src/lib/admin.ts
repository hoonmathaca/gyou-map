import type { Place, Report, Review } from './types'

/**
 * 관리자 기능은 Vercel 서버리스 함수(/api/admin)를 거친다.
 * 관리자 비밀번호와 service_role 키는 서버에만 있고 브라우저로 내려오지 않는다.
 */
const ENDPOINT = '/api/admin'
const TOKEN_KEY = 'gyou.admin.token'

export function savedToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* noop */
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* noop */
  }
}

async function request<T>(init: RequestInit): Promise<T> {
  const res = await fetch(ENDPOINT, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : '요청을 처리하지 못했어요.'
    throw new Error(message)
  }
  return body as T
}

export async function adminLogin(password: string): Promise<string> {
  const body = await request<{ token: string }>({
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  saveToken(body.token)
  return body.token
}

export interface AdminData {
  places: Place[]
  reviews: Review[]
  reports: Report[]
}

export async function adminLoad(token: string): Promise<AdminData> {
  return request<AdminData>({
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export type AdminAction =
  | 'place.hide'
  | 'place.restore'
  | 'place.delete'
  | 'review.hide'
  | 'review.restore'
  | 'review.delete'
  | 'report.delete'

export async function adminAct(token: string, action: AdminAction, id: string): Promise<void> {
  await request<{ ok: true }>({
    method: 'POST',
    body: JSON.stringify({ token, action, id }),
  })
}
