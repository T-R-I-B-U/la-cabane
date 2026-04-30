import { useState, useRef, useEffect, useCallback } from 'react'

export function useSavoirAssignment() {
  const [selected, setSelected] = useState(null)
  const savoirs = useRef([])
  // Map<instanceId, savoirIdx> — assigned during session, not persisted
  const assignments = useRef(new Map())
  const nextIdx = useRef(0)

  useEffect(() => {
    fetch('/savoirs.json')
      .then((res) => res.json())
      .then((data) => {
        savoirs.current = data
      })
  }, [])

  const assignAndOpen = useCallback((instanceId) => {
    if (savoirs.current.length === 0) return
    let idx = assignments.current.get(instanceId)
    if (idx === undefined) {
      idx = nextIdx.current % savoirs.current.length
      nextIdx.current += 1
      assignments.current.set(instanceId, idx)
    }
    setSelected({ instanceId, savoir: savoirs.current[idx] })
  }, [])

  const close = useCallback(() => {
    setSelected(null)
  }, [])

  return { selected, assignAndOpen, close }
}
