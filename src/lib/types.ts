export type RegistrantType = 'owner' | 'visitor'

export interface Place {
  id: string
  created_at: string
  name: string
  baptismal_name: string | null
  category: string
  address: string
  address_detail: string | null
  lat: number
  lng: number
  intro: string | null
  sticker_url: string
  registrant_type: RegistrantType
  hidden: boolean
  report_count: number
}

export interface Review {
  id: string
  created_at: string
  place_id: string
  nickname: string
  baptismal_name: string | null
  rating: number
  content: string
  hidden: boolean
}

export interface Report {
  id: string
  created_at: string
  place_id: string
  reason: string
  detail: string | null
  reporter_key: string | null
}

export interface PlaceStats {
  count: number
  avg: number
}

export interface PlaceInput {
  name: string
  baptismal_name: string | null
  category: string
  address: string
  address_detail: string | null
  lat: number
  lng: number
  intro: string | null
  sticker_url: string
  registrant_type: RegistrantType
}
