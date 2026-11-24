interface Props {
  value: number
  size?: number
  onChange?: (value: number) => void
}

/** 별점 — onChange 가 있으면 누를 수 있는 입력이 된다 */
export default function StarRating({ value, size = 16, onChange }: Props) {
  const stars = [1, 2, 3, 4, 5]
  return (
    <div className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : undefined}>
      {stars.map((s) => {
        const on = s <= Math.round(value)
        return onChange ? (
          <button
            key={s}
            type="button"
            aria-label={`${s}점`}
            aria-checked={s === value}
            role="radio"
            onClick={() => onChange(s)}
            className="p-0.5"
          >
            <Star on={on} size={size + 8} />
          </button>
        ) : (
          <span key={s} aria-hidden>
            <Star on={on} size={size} />
          </span>
        )
      })}
    </div>
  )
}

function Star({ on, size }: { on: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.8l5.9-.9z"
        fill={on ? '#B9962F' : 'none'}
        stroke={on ? '#B9962F' : '#CFC6B4'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
