let _x = typeof window !== 'undefined' ? window.innerWidth / 2 : 0
let _y = typeof window !== 'undefined' ? window.innerHeight / 2 : 0
let _type = 'default'
let _posListeners = []
let _typeListeners = []

export const cursorStore = {
  get x() {
    return _x
  },
  get y() {
    return _y
  },
  get type() {
    return _type
  },
  move(dx, dy) {
    _x = Math.max(0, Math.min(window.innerWidth, _x + dx))
    _y = Math.max(0, Math.min(window.innerHeight, _y + dy))
    _posListeners.forEach((fn) => fn(_x, _y))
  },
  setType(type) {
    if (_type === type) return
    _type = type
    _typeListeners.forEach((fn) => fn(type))
  },
  subscribePos(fn) {
    _posListeners.push(fn)
    return () => {
      _posListeners = _posListeners.filter((f) => f !== fn)
    }
  },
  subscribeType(fn) {
    _typeListeners.push(fn)
    return () => {
      _typeListeners = _typeListeners.filter((f) => f !== fn)
    }
  },
  reset() {
    _x = window.innerWidth / 2
    _y = window.innerHeight / 2
    _posListeners.forEach((fn) => fn(_x, _y))
  },
}
