import { useEffect, useRef } from 'react'

export function useStableInteractionCallback(callback) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return callbackRef
}
