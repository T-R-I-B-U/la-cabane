import { useCallback, useEffect } from 'react'

export function useHoverEffect({ onHover, onOut, active = true } = {}) {
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'default'
    }
  }, [])

  useEffect(() => {
    if (!active) document.body.style.cursor = 'default'
  }, [active])

  const onPointerOver = useCallback(
    (e) => {
      if (!active) return
      document.body.style.cursor = 'pointer'
      onHover?.(e)
    },
    [active, onHover]
  )

  const onPointerOut = useCallback(
    (e) => {
      document.body.style.cursor = 'default'
      onOut?.(e)
    },
    [onOut]
  )

  return { onPointerOver, onPointerOut }
}
