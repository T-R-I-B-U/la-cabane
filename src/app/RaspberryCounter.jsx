const TOTAL = 5

export function RaspberryCounter({ count }) {
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
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        padding: 10,
        borderRadius: 18,
        background: 'rgba(255, 255, 255, 0.9)',
        width: 'calc(100vw - 400px)',
        maxWidth: 1112,
        cursor: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          fontFamily: "'citrus-gothic-rough', serif",
          fontSize: 20,
          fontWeight: 400,
          lineHeight: 1,
          color: '#33330f',
        }}
      >
        MA COLLECTE DE FRAMBOISE
      </span>
      <div
        style={{
          background: '#e3e7b3',
          borderRadius: 360,
          padding: '8px 20px',
        }}
      >
        <span
          style={{
            fontFamily: "'citrus-gothic-rough', serif",
            fontSize: 32,
            fontWeight: 400,
            lineHeight: 1,
            color: '#8b8e50',
          }}
        >
          {count}/{TOTAL}
        </span>
      </div>
    </div>
  )
}
