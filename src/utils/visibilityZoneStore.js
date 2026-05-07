import { useSyncExternalStore } from 'react'
import zoneMap from '../world/cabane/zoneMap.json'

// null = show all nodes.
const NODE_WHITELIST = zoneMap.zones

// Sub-nodes (mesh or group, matched by name) to force-hide inside visible parent nodes.
// Discovery: document.querySelector('canvas').__r3f.scene
//   .getObjectByName('platform-hut')?.traverse(o => console.log(o.name, o.type))
const HIDDEN_NODES = zoneMap.hidden

// Which React-managed features render per zone.
export const ZONE_COMPONENTS = {
  all: { characters: true, leaves: true, journal: true },
  'all-fake': { characters: false, leaves: true, journal: false },
  nid: { characters: false, leaves: false, journal: false },
  cabane: { characters: true, leaves: true, journal: true },
  serre: { characters: false, leaves: false, journal: false },
  arbre: { characters: false, leaves: true, journal: false },
}

export const VISIBILITY_ZONES = Object.keys(NODE_WHITELIST)

let visibilityZonesSnapshot = ['all']
const listeners = new Set()

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getVisibilityZones() {
  return visibilityZonesSnapshot
}

function isValidVisibilityZone(zone) {
  return VISIBILITY_ZONES.includes(zone)
}

function warnInvalidVisibilityZone(zone) {
  if (!import.meta.env.DEV) return
  console.warn(`[VisibilityZone] Ignoring unknown zone "${zone}"`)
}

function notifyVisibilityZoneListeners() {
  listeners.forEach((listener) => listener())
}

export function toggleVisibilityZone(zone) {
  if (!isValidVisibilityZone(zone)) {
    warnInvalidVisibilityZone(zone)
    return
  }

  const next = new Set(visibilityZonesSnapshot)
  if (next.has(zone)) next.delete(zone)
  else next.add(zone)
  visibilityZonesSnapshot = [...next]
  notifyVisibilityZoneListeners()
}

// Remplace l'ensemble des zones actives d'un coup.
// Utile pour piloter la visibilité depuis le GameManager (via onStepChange).
export function setVisibilityZones(zones) {
  const validZones = zones.filter((zone) => {
    const valid = isValidVisibilityZone(zone)
    if (!valid) warnInvalidVisibilityZone(zone)
    return valid
  })
  visibilityZonesSnapshot = validZones
  notifyVisibilityZoneListeners()
}

export function useVisibilityZones() {
  return useSyncExternalStore(subscribe, getVisibilityZones)
}

export function getZoneComponents(zones) {
  if (!zones.length) return { characters: false, leaves: false, journal: false }
  return {
    characters: zones.some((z) => ZONE_COMPONENTS[z]?.characters ?? false),
    leaves: zones.some((z) => ZONE_COMPONENTS[z]?.leaves ?? false),
    journal: zones.some((z) => ZONE_COMPONENTS[z]?.journal ?? false),
  }
}

function disableRaycast(mesh) {
  mesh.raycast = () => {}
}

function enableRaycast(mesh) {
  // Restores THREE.Mesh.prototype.raycast via prototype chain
  delete mesh.raycast
}

/**
 * Apply zone visibility to a cabane THREE.Group:
 * 1. Toggle direct children by merged NODE_WHITELIST across active zones
 * 2. Disable raycasting on hidden meshes — Three.js checks mesh.visible, not parent.visible
 * 3. Force-hide specific sub-meshes listed in HIDDEN_NODES
 */
export function applyVisibilityZone(cabaneGroup, zones) {
  if (!cabaneGroup) return

  let showAll = false
  const merged = []
  for (const zone of zones) {
    if (zone === 'all') {
      showAll = true
      break
    }
    const wl = NODE_WHITELIST[zone]
    if (!wl) {
      warnInvalidVisibilityZone(zone)
      continue
    }
    for (const node of wl) {
      if (!merged.includes(node)) merged.push(node)
    }
  }
  const whitelist = showAll ? null : merged

  cabaneGroup.children.forEach((child) => {
    const show = whitelist === null || whitelist.includes(child.name)
    child.visible = show
    child.traverse((obj) => {
      if (!obj.isMesh) return
      if (show) enableRaycast(obj)
      else disableRaycast(obj)
    })
  })

  const hidden = zones.flatMap((z) => HIDDEN_NODES[z] ?? [])
  if (hidden.length > 0) {
    cabaneGroup.traverse((obj) => {
      if (!hidden.includes(obj.name)) return
      obj.visible = false
      obj.traverse((child) => {
        if (child.isMesh) disableRaycast(child)
      })
    })
  }
}
