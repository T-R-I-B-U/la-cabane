import { useSyncExternalStore } from 'react'

// @typedef {'LOADING' | 'INIT' | 'INTRO' | 'EXPLORATION'} GameStep

export const GAME_STEPS = /** @type {const} */ ({
  LOADING: 'LOADING',
  INIT: 'INIT',
  INTRO: 'INTRO',
  EXPLORATION: 'EXPLORATION',
  ARBRE_INTRO: 'ARBRE_INTRO',
})

let _step = GAME_STEPS.LOADING
const _subs = new Set()

function subscribe(fn) {
  _subs.add(fn)
  return () => _subs.delete(fn)
}

export function getGameStep() {
  return _step
}

export function setGameStep(step) {
  if (_step === step) return
  _step = step
  _subs.forEach((fn) => fn())
}

export function useGameStep() {
  return useSyncExternalStore(subscribe, getGameStep)
}
