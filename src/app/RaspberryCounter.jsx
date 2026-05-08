const TOTAL = 8

export function RaspberryCounter({ count }) {
  const pct = Math.min(count / TOTAL, 1) * 100
  const complete = count >= TOTAL

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '12px 20px',
        borderRadius: 14,
        border: '1px solid rgba(74, 98, 112, 0.18)',
        background: 'rgba(255, 250, 242, 0.92)',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 8px 32px rgba(20, 37, 49, 0.16)',
        cursor: 'none',
      }}
    >
      <span
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.78rem',
          fontWeight: 600,
          color: complete ? '#2a7a45' : '#142533',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {count} / {TOTAL} framboises récoltées
      </span>
      <div
        style={{
          width: 200,
          height: 6,
          borderRadius: 999,
          background: 'rgba(20, 37, 51, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 'inherit',
            background: complete
              ? 'linear-gradient(90deg, #4caf50, #2a7a45)'
              : 'linear-gradient(90deg, #c0392b, #e05b2b)',
            transition: 'width 0.3s ease, background 0.4s ease',
          }}
        />
      </div>
    </div>
  )
}
