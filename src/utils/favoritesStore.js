import { useState, useEffect } from 'react'

const MAX_FAVORITES = 3
const STORAGE_KEY = 'la-cabane-favorites'

function _load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

let _favorites = _load()
const _listeners = new Set()

function _notify() {
  _listeners.forEach((fn) => fn([..._favorites]))
}

function _save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_favorites))
}

export const favoritesStore = {
  getAll() {
    return [..._favorites]
  },
  isFavorite(id) {
    return _favorites.some((f) => f.id === id)
  },
  isFull() {
    return _favorites.length >= MAX_FAVORITES
  },
  toggle(savoir) {
    const idx = _favorites.findIndex((f) => f.id === savoir.id)
    if (idx !== -1) {
      _favorites = _favorites.filter((f) => f.id !== savoir.id)
    } else if (_favorites.length < MAX_FAVORITES) {
      _favorites = [
        ..._favorites,
        {
          id: savoir.id,
          title: savoir.title,
          drawingData: savoir.drawingData ?? null,
        },
      ]
    }
    _save()
    _notify()
  },
  subscribe(fn) {
    _listeners.add(fn)
    return () => _listeners.delete(fn)
  },
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(favoritesStore.getAll())
  useEffect(() => favoritesStore.subscribe(setFavorites), [])
  return favorites
}
