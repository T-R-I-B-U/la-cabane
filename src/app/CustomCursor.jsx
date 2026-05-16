import { useEffect, useRef, useState } from 'react'
import { cursorStore } from '../utils/cursorStore'

export function CustomCursor({ visible }) {
  const elRef = useRef(null)
  const [type, setType] = useState(cursorStore.type)

  useEffect(() => {
    return cursorStore.subscribePos((x, y) => {
      if (elRef.current) {
        elRef.current.style.transform = `translate(${x}px, ${y}px)`
      }
    })
  }, [])

  useEffect(() => cursorStore.subscribeType(setType), [])

  if (!visible) return null

  return (
    <div
      ref={elRef}
      className={`custom-cursor custom-cursor--${type}`}
      style={{ transform: `translate(${cursorStore.x}px, ${cursorStore.y}px)` }}
    />
  )
}
