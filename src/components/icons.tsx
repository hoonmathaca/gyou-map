import type { ReactNode } from 'react'
import { categoryInner } from './categorySvg'

/** 업종 아이콘 — 마커와 같은 모양(components/categorySvg.ts 문자열)을 그대로 그린다 */
export function CatIcon({ id, className = 'h-5 w-5' }: { id: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: categoryInner(id) }}
    />
  )
}

const UI: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16.2 20.5 20.7" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="M15 4.5 7.5 12l7.5 7.5" />,
  pin: (
    <>
      <path d="M12 21s6.6-6.1 6.6-11A6.6 6.6 0 0 0 5.4 10c0 4.9 6.6 11 6.6 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  locate: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21" />
    </>
  ),
  list: <path d="M4 7h16M4 12h16M4 17h16" />,
  map: (
    <>
      <path d="M9 4 3.6 6.2v13.4L9 17.4l6 2.4 5.4-2.2V4.2L15 6.4 9 4z" />
      <path d="M9 4v13.4M15 6.4V19.8" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l.9-4.1L15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.1 19.1 4 20z" />
      <path d="M14.4 6.4 17.4 9.4" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.2" />
      <path d="M15 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v8.5A1.5 1.5 0 0 0 5 15h1.5" />
    </>
  ),
  check: <path d="M5 12.5 9.5 17 19 6.5" />,
  arrow: <path d="M6 18 18 6M18 6h-8M18 6v8" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  camera: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.6" />
      <circle cx="12" cy="13.4" r="3.4" />
      <path d="M8.6 7 9.8 4.8h4.4L15.4 7" />
    </>
  ),
  flag: <path d="M6 21V4.5M6 4.5h9.5l-1.2 3.4 1.2 3.4H6" />,
  building: (
    <>
      <path d="M4 20.5V6.8L12 3l8 3.8v13.7" />
      <path d="M9 20.5v-5h6v5M9 9.5h1.5M13.5 9.5H15" />
    </>
  ),
  share: (
    <>
      <path d="M12 16V4.5M8.2 8.3 12 4.5l3.8 3.8" />
      <path d="M5.5 13.5V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-5.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 4v4.5h-4.5" />
    </>
  ),
}

export type IconName = keyof typeof UI

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {UI[name]}
    </svg>
  )
}
