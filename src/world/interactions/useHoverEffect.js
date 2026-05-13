import { useCallback, useEffect } from 'react'
import { cursorStore } from '../../utils/cursorStore'

export function useHoverEffect({ onHover, onOut, active = true } = {}) {
  useEffect(() => {
    return () => {
      cursorStore.setType('default')
    }
  }, [])

  useEffect(() => {
    if (!active) cursorStore.setType('default')
  }, [active])

  const onPointerOver = useCallback(
    (e) => {
      if (!active) return
      cursorStore.setType('pointer')
      onHover?.(e)
    },
    [active, onHover]
  )

  const onPointerOut = useCallback(
    (e) => {
      cursorStore.setType('default')
      onOut?.(e)
    },
    [onOut]
  )

  return { onPointerOver, onPointerOut }
}
