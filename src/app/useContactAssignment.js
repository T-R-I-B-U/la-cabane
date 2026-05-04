import { useState, useRef, useEffect, useCallback } from 'react'

export function useContactAssignment() {
  const [selected, setSelected] = useState(null)
  const contacts = useRef([])

  useEffect(() => {
    fetch('/contacts.json')
      .then((res) => res.json())
      .then((data) => {
        contacts.current = data
      })
  }, [])

  const openContact = useCallback((fruitId) => {
    const contact = contacts.current.find((c) => c.fruitId === fruitId)
    if (!contact) return
    setSelected({ fruitId, contact })
  }, [])

  const close = useCallback(() => {
    setSelected(null)
  }, [])

  return { selected, openContact, close }
}
