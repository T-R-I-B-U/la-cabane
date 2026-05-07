import { useState, useRef, useEffect, useCallback } from 'react'

export function useContactAssignment() {
  const [selectedContactAssignment, setSelectedContactAssignment] = useState(null)
  const contacts = useRef([])

  useEffect(() => {
    let cancelled = false

    fetch('/contacts.json')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((contactItems) => {
        if (!cancelled && Array.isArray(contactItems)) contacts.current = contactItems
      })
      .catch((error) => {
        console.error('useContactAssignment: failed to load /contacts.json', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const openContactForFruit = useCallback((fruitId) => {
    const contact = contacts.current.find((contactItem) => contactItem.fruitId === fruitId)
    if (!contact) return false
    setSelectedContactAssignment({ fruitId, contact })
    return true
  }, [])

  const closeContact = useCallback(() => {
    setSelectedContactAssignment(null)
  }, [])

  return { selectedContactAssignment, openContactForFruit, closeContact }
}
