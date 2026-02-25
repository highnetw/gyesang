'use client'

interface Props {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
  size?: number
}

export default function StarRating({ value, onChange, readonly, size = 24 }: Props) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(s => (
        <span
          key={s}
          onClick={() => !readonly && onChange?.(s)}
          style={{
            fontSize: size,
            color: s <= value ? 'var(--gold)' : '#333',
            cursor: readonly ? 'default' : 'pointer',
            transition: 'color 0.15s',
          }}
        >★</span>
      ))}
    </div>
  )
}
