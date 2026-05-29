import { useState, useRef, useEffect, useCallback } from 'react'

export function useSavoirAssignment() {
  const [selectedSavoirAssignment, setSelectedSavoirAssignment] = useState(null)
  const savoirs = useRef([])
  // Map<instanceId, savoirIdx> — assigned during session, not persisted
  const assignments = useRef(new Map())
  const nextSavoirIndex = useRef(0)

  useEffect(() => {
    let cancelled = false

    fetch('/savoirs.json')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((savoirItems) => {
        if (!cancelled && Array.isArray(savoirItems)) savoirs.current = savoirItems
      })
      .catch((error) => {
        console.error('useSavoirAssignment: failed to load /savoirs.json', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const openSavoirForLeaf = useCallback((instanceId) => {
    if (savoirs.current.length === 0) return false
    let savoirIndex = assignments.current.get(instanceId)
    if (savoirIndex === undefined) {
      savoirIndex = nextSavoirIndex.current % savoirs.current.length
      nextSavoirIndex.current += 1
      assignments.current.set(instanceId, savoirIndex)
    }
    setSelectedSavoirAssignment({ instanceId, savoir: savoirs.current[savoirIndex] })
    return true
  }, [])

  const openSavoirDirect = useCallback((savoir) => {
    setSelectedSavoirAssignment({ instanceId: null, savoir })
    return true
  }, [])

  const closeSavoir = useCallback(() => {
    setSelectedSavoirAssignment(null)
  }, [])

  return { selectedSavoirAssignment, openSavoirForLeaf, openSavoirDirect, closeSavoir }
}
