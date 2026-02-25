'use client'

const NAV_ITEMS = [
  { id: 'home',     label: '홈',    icon: '⌂' },
  { id: 'members',  label: '회원',   icon: '👥' },
  { id: 'org',      label: '조직도', icon: '🏛' },
  { id: 'meetings', label: '모임',   icon: '🍽' },
  { id: 'notices',  label: '공지',   icon: '📢' },
]

interface Props {
  current: string
  onChange: (page: string) => void
}

export default function BottomNav({ current, onChange }: Props) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: 'var(--surface)', borderTop: '1px solid var(--gold-dim)',
      display: 'flex', zIndex: 200, paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {NAV_ITEMS.map(({ id, label, icon }) => {
        const active = current === id
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            flex: 1, padding: '10px 4px 8px', background: 'none', border: 'none',
            color: active ? 'var(--gold)' : '#555',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            fontSize: 10, transition: 'color 0.2s',
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
