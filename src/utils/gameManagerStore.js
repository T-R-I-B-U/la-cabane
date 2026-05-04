import { useSyncExternalStore } from 'react'

// @typedef {'cabane' | 'arbre'} Zone

let _zone = 'cabane'
const _subs = new Set()

function subscribe(fn) {
  _subs.add(fn)
  return () => _subs.delete(fn)
}

export function getZone() {
  return _zone
}

export function setZone(zone) {
  if (_zone === zone) return
  _zone = zone
  _subs.forEach((fn) => fn())
}

export function useActiveZone() {
  return useSyncExternalStore(subscribe, getZone)
}
