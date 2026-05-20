const _hoveredIds = new Set()
let _cooldownUntil = 0

export const fruitHoverStore = {
  get anyHovered() {
    return _hoveredIds.size > 0
  },
  get onCooldown() {
    return Date.now() < _cooldownUntil
  },
  setHovered(id, hovered) {
    if (hovered) _hoveredIds.add(id)
    else _hoveredIds.delete(id)
  },
  startCooldown(ms = 500) {
    _cooldownUntil = Date.now() + ms
  },
}
