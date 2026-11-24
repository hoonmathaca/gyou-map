import { supabase, STICKER_BUCKET } from './supabase'
import type { Place, PlaceInput, Review } from './types'

function fail(message: string, error: unknown): never {
  console.error(message, error)
  throw new Error(message)
}

export async function fetchPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) fail('가게 목록을 불러오지 못했어요.', error)
  return (data ?? []) as Place[]
}

export async function fetchPlace(id: string): Promise<Place | null> {
  const { data, error } = await supabase.from('places').select('*').eq('id', id).maybeSingle()
  if (error) fail('가게 정보를 불러오지 못했어요.', error)
  return (data as Place) ?? null
}

export async function fetchReviews(placeId?: string): Promise<Review[]> {
  let query = supabase.from('reviews').select('*').order('created_at', { ascending: false })
  if (placeId) query = query.eq('place_id', placeId)
  const { data, error } = await query
  if (error) fail('리뷰를 불러오지 못했어요.', error)
  return (data ?? []) as Review[]
}

export async function uploadSticker(blob: Blob): Promise<string> {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const name = `${stamp}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(STICKER_BUCKET).upload(name, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) fail('스티커 사진을 올리지 못했어요. 잠시 뒤 다시 시도해 주세요.', error)
  const { data } = supabase.storage.from(STICKER_BUCKET).getPublicUrl(name)
  return data.publicUrl
}

export async function createPlace(input: PlaceInput): Promise<Place> {
  const { data, error } = await supabase.from('places').insert(input).select('*').single()
  if (error) fail('등록하지 못했어요. 잠시 뒤 다시 시도해 주세요.', error)
  return data as Place
}

export async function createReview(input: {
  place_id: string
  nickname: string
  baptismal_name: string | null
  rating: number
  content: string
}): Promise<Review> {
  const { data, error } = await supabase.from('reviews').insert(input).select('*').single()
  if (error) fail('리뷰를 남기지 못했어요. 잠시 뒤 다시 시도해 주세요.', error)
  return data as Review
}

export interface ReportResult {
  count: number
  hidden: boolean
  already: boolean
}

export async function reportPlace(
  placeId: string,
  reason: string,
  detail: string,
  reporterKey: string,
): Promise<ReportResult> {
  const { data, error } = await supabase.rpc('report_place', {
    p_place_id: placeId,
    p_reason: reason,
    p_detail: detail,
    p_key: reporterKey,
  })
  if (error) fail('신고를 접수하지 못했어요. 잠시 뒤 다시 시도해 주세요.', error)
  const result = data as { count: number; hidden: boolean; already: boolean }
  return result
}
