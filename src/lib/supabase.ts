import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** 설정이 빠졌을 때 화면에 바로 알 수 있게 남기는 값 */
export const supabaseReady = Boolean(url && anon)

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', anon ?? 'public-anon-key', {
  auth: { persistSession: false },
})

export const STICKER_BUCKET = 'stickers'
