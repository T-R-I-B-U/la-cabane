import { useSyncExternalStore } from 'react'

// Which top-level cabane.json nodes are visible per zone.
// null = show all nodes.
const NODE_WHITELIST = {
  all: null,
  'all-fake': [
    'ground-hut',
    'leaf',
    'trunk',
    'hut01',
    'stairs01',
    'platform-hut',
    'railling-hut',
    'railling',
    'platform',
    'greenhouse',
    'nest',
  ],
  nid: ['nest'],
  cabane: ['ground-hut', 'hut01', 'counter01', 'trunk', 'leaf', 'stairs01', 'railling'],
  serre: ['greenhouse'],
  arbre: ['trunk', 'leaf', 'platform', 'platform-hut', 'railling-hut', 'railling'],
}

// Sub-nodes (mesh or group, matched by name) to force-hide inside visible parent nodes.
// Discovery: document.querySelector('canvas').__r3f.scene
//   .getObjectByName('platform-hut')?.traverse(o => console.log(o.name, o.type))
const HIDDEN_NODES = {
  all: [],
  'all-fake': [],
  nid: [],
  cabane: [],
  serre: [],
  arbre: ['platforme-hut.gltf'],
}

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

let _zone = 'all'
const _subs = new Set()

function subscribe(fn) {
  _subs.add(fn)
  return () => _subs.delete(fn)
}

export function getVisibilityZone() {
  return _zone
}

export function setVisibilityZone(zone) {
  if (_zone === zone) return
  _zone = zone
  _subs.forEach((fn) => fn())
}

export function useVisibilityZone() {
  return useSyncExternalStore(subscribe, getVisibilityZone)
}

export function getZoneComponents(zone) {
  return ZONE_COMPONENTS[zone] ?? ZONE_COMPONENTS.all
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
 * 1. Toggle direct children by NODE_WHITELIST
 * 2. Disable raycasting on hidden meshes — Three.js checks mesh.visible, not parent.visible
 * 3. Force-hide specific sub-meshes listed in HIDDEN_MESHES
 */
export function applyVisibilityZone(cabaneGroup, zone) {
  if (!cabaneGroup) return

  const whitelist = NODE_WHITELIST[zone] ?? null
  cabaneGroup.children.forEach((child) => {
    const show = whitelist === null || whitelist.includes(child.name)
    child.visible = show
    child.traverse((obj) => {
      if (!obj.isMesh) return
      if (show) enableRaycast(obj)
      else disableRaycast(obj)
    })
  })

  const hidden = HIDDEN_NODES[zone] ?? []
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
