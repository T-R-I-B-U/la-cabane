import { useEffect, useRef, useState } from 'react'
import { useGameStep, GAME_STEPS } from '../utils/gameStateStore'
import { startKonamiOverlay, stopKonamiOverlay } from '../utils/audioStore'

// ↑ ↑ ↓ ↓ ← → ← → B A
const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
]

// Events swallowed while frozen so no other action can run until the code is re-entered.
const BLOCKED_EVENTS = [
  'keyup',
  'mousedown',
  'mouseup',
  'click',
  'dblclick',
  'wheel',
  'contextmenu',
  'pointerdown',
  'pointerup',
  'pointermove',
  'mousemove',
]

// Konami easter egg: at any point while the experience runs, entering the code
// suspends the story (audio + all inputs) and plays the konami clip; entering it
// again resumes everything.
export function useKonamiCode() {
  const step = useGameStep()
  const active = step !== GAME_STEPS.LOADING && step !== GAME_STEPS.INIT

  const [frozen, setFrozen] = useState(false)
  const frozenRef = useRef(false)
  const progressRef = useRef(0)

  useEffect(() => {
    if (!active) return

    const onKeyDown = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const expected = SEQUENCE[progressRef.current]

      if (key === expected) {
        progressRef.current += 1
      } else {
        progressRef.current = key === SEQUENCE[0] ? 1 : 0
      }

      if (progressRef.current === SEQUENCE.length) {
        progressRef.current = 0
        const next = !frozenRef.current
        frozenRef.current = next
        setFrozen(next)
        if (next) startKonamiOverlay()
        else stopKonamiOverlay()
        e.preventDefault()
        e.stopImmediatePropagation()
        return
      }

      // While frozen, no key reaches the rest of the app (only the code is listened for).
      if (frozenRef.current) {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [active])

  // Swallow every other input while frozen.
  useEffect(() => {
    if (!frozen) return
    const block = (e) => {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    BLOCKED_EVENTS.forEach((type) => window.addEventListener(type, block, { capture: true }))
    return () =>
      BLOCKED_EVENTS.forEach((type) => window.removeEventListener(type, block, { capture: true }))
  }, [frozen])

  // Safety: if the experience unwinds while frozen, release the overlay.
  useEffect(() => {
    if (active || !frozenRef.current) return
    frozenRef.current = false
    setFrozen(false)
    stopKonamiOverlay()
  }, [active])
}
