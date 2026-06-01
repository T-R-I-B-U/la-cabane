import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { playOnce } from '../../utils/audioStore'

// Constantes réglables.
const DURATION = 3.4 // s, durée totale du geste
const APPROACH = 0.55 // fraction du trajet table → caméra (0 = reste, 1 = sur la caméra)
const LIFT_UP = 0.18 // m de hauteur supplémentaire (vers la bouche)
const TILT_ANGLE = 0.9 // rad d'inclinaison autour de l'axe droite caméra (vers la bouche)
const SHELL_OPACITY = 0.35 // coque de verre rendue transparente pour voir le jus dedans

// Bornes des phases en fraction de DURATION
const LIFT_END = 0.28
const DRINK_START = 0.3
const DRINK_END = 0.68
const RETURN_START = 0.7

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function findJuiceGlasses(cabaneGroup) {
  const glasses = []
  cabaneGroup.traverse((object) => {
    if (object.name === 'juiceglass' && object.userData?.cabaneNode) glasses.push(object)
  })
  return glasses
}

// Snapshot du repos authored une seule fois (un drain a pu décaler Y) puis remet plein.
// Le matériau du jus arrive en transparent + depthWrite:false → il échoue le test de
// profondeur derrière la coque et reste invisible. On le force opaque pour le voir.
function fillJuice(juice) {
  if (!juice) return
  if (juice.userData.drinkOrigY === undefined) {
    juice.geometry.computeBoundingBox()
    juice.userData.drinkOrigY = juice.position.y
    juice.userData.drinkMinY = juice.geometry.boundingBox.min.y
    const mats = Array.isArray(juice.material) ? juice.material : [juice.material]
    for (const mat of mats) {
      if (!mat) continue
      mat.transparent = false
      mat.depthWrite = true
      mat.opacity = 1
      mat.needsUpdate = true
    }
  }
  juice.scale.setY(1)
  juice.position.y = juice.userData.drinkOrigY
  juice.visible = true
}

// La coque de verre n'a pas de slot alpha dans le textureResolver → opaque par défaut,
// ce qui cache le jus à l'intérieur. On la passe en transparent une fois.
function makeShellTransparent(glass) {
  glass.traverse((obj) => {
    if (!obj.isMesh || obj.name !== 'juiceglass' || obj.userData.drinkShellDone) return
    obj.userData.drinkShellDone = true
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const mat of mats) {
      if (!mat) continue
      mat.transparent = true
      mat.opacity = SHELL_OPACITY
      mat.needsUpdate = true
    }
  })
}

// Choisit le verre dont le centre est le plus proche du rayon central de la caméra.
function pickGlassInView(glasses, camera) {
  const camPos = camera.getWorldPosition(new THREE.Vector3())
  const forward = camera.getWorldDirection(new THREE.Vector3())
  const glassPos = new THREE.Vector3()
  const toGlass = new THREE.Vector3()
  let best = null
  let bestPerp = Infinity
  for (const glass of glasses) {
    glass.getWorldPosition(glassPos)
    toGlass.subVectors(glassPos, camPos)
    const along = toGlass.dot(forward)
    if (along <= 0) continue // derrière la caméra
    const perp = glassPos.distanceToSquared(camPos.clone().addScaledVector(forward, along))
    if (perp < bestPerp) {
      bestPerp = perp
      best = glass
    }
  }
  return best ?? glasses[0] ?? null
}

export function JuiceDrink({ cabane, playing, onComplete }) {
  const { camera } = useThree()

  const glassRef = useRef(null)
  const juiceRef = useRef(null)
  // Transform local d'origine (pour restauration)
  const origPosRef = useRef(new THREE.Vector3())
  const origQuatRef = useRef(new THREE.Quaternion())
  // Poses monde de départ et cible
  const startWorldPosRef = useRef(new THREE.Vector3())
  const startWorldQuatRef = useRef(new THREE.Quaternion())
  const targetWorldPosRef = useRef(new THREE.Vector3())
  const targetWorldQuatRef = useRef(new THREE.Quaternion())
  // Conversion monde → parent-local (le parent reste fixe pendant le geste)
  const parentInvMatrixRef = useRef(new THREE.Matrix4())
  const parentInvQuatRef = useRef(new THREE.Quaternion())
  const juiceOrigYRef = useRef(0)
  const juiceMinYRef = useRef(0)

  const elapsedRef = useRef(0)
  const activeRef = useRef(false)
  const completedRef = useRef(false)
  const soundPlayedRef = useRef(false)

  // Tous les verres pleins en permanence (seul celui qu'on boit sera vidé) et
  // coque transparente pour voir le jus dedans.
  useEffect(() => {
    if (!cabane) return
    for (const glass of findJuiceGlasses(cabane)) {
      fillJuice(glass.getObjectByName('juice'))
      makeShellTransparent(glass)
    }
  }, [cabane])

  useEffect(() => {
    if (!playing || !cabane) return

    const glass = pickGlassInView(findJuiceGlasses(cabane), camera)
    if (!glass) {
      onComplete?.() // pas de verre : ne pas bloquer le récit
      return
    }

    camera.updateMatrixWorld()
    glass.updateWorldMatrix(true, false)
    const parent = glass.parent
    parent?.updateWorldMatrix(true, false)

    glassRef.current = glass
    origPosRef.current.copy(glass.position)
    origQuatRef.current.copy(glass.quaternion)

    const juice = glass.getObjectByName('juice')
    juiceRef.current = juice ?? null
    if (juice) {
      fillJuice(juice)
      juiceOrigYRef.current = juice.userData.drinkOrigY
      juiceMinYRef.current = juice.userData.drinkMinY
    }

    // Pose monde de départ (sur la table)
    const startWorldPos = glass.getWorldPosition(new THREE.Vector3())
    const startWorldQuat = glass.getWorldQuaternion(new THREE.Quaternion())
    startWorldPosRef.current.copy(startWorldPos)
    startWorldQuatRef.current.copy(startWorldQuat)

    // Cible : entre la table et la caméra (qui est à côté de la table), un peu relevé.
    const camPos = camera.getWorldPosition(new THREE.Vector3())
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize()
    targetWorldPosRef.current.copy(startWorldPos).lerp(camPos, APPROACH)
    targetWorldPosRef.current.y += LIFT_UP
    const tilt = new THREE.Quaternion().setFromAxisAngle(right, TILT_ANGLE)
    targetWorldQuatRef.current.copy(tilt).multiply(startWorldQuat)

    // Matrices du parent (fixe) pour convertir monde → local chaque frame
    if (parent) {
      parentInvMatrixRef.current.copy(parent.matrixWorld).invert()
      parentInvQuatRef.current.copy(parent.getWorldQuaternion(new THREE.Quaternion())).invert()
    } else {
      parentInvMatrixRef.current.identity()
      parentInvQuatRef.current.identity()
    }

    elapsedRef.current = 0
    completedRef.current = false
    soundPlayedRef.current = false
    activeRef.current = true

    const origPos = origPosRef.current
    const origQuat = origQuatRef.current
    return () => {
      // Restaure la transform locale d'origine. Le jus reste vide pour le dialogue
      // d'adieu — il est remis plein au prochain début de geste.
      activeRef.current = false
      glass.position.copy(origPos)
      glass.quaternion.copy(origQuat)
    }
  }, [playing, cabane, camera, onComplete])

  useFrame((_, delta) => {
    if (!activeRef.current) return
    const glass = glassRef.current
    if (!glass) return

    elapsedRef.current += Math.min(delta, 0.1)
    const t = Math.min(elapsedRef.current / DURATION, 1)

    // Pose monde interpolée : montée → maintien → retour
    let f
    let fromPos
    let toPos
    let fromQuat
    let toQuat
    if (t <= LIFT_END) {
      f = easeInOut(t / LIFT_END)
      fromPos = startWorldPosRef.current
      toPos = targetWorldPosRef.current
      fromQuat = startWorldQuatRef.current
      toQuat = targetWorldQuatRef.current
    } else if (t >= RETURN_START) {
      f = easeInOut((t - RETURN_START) / (1 - RETURN_START))
      fromPos = targetWorldPosRef.current
      toPos = startWorldPosRef.current
      fromQuat = targetWorldQuatRef.current
      toQuat = startWorldQuatRef.current
    } else {
      f = 1
      fromPos = startWorldPosRef.current
      toPos = targetWorldPosRef.current
      fromQuat = startWorldQuatRef.current
      toQuat = targetWorldQuatRef.current
    }

    // Monde → parent-local
    _worldPos.lerpVectors(fromPos, toPos, f).applyMatrix4(parentInvMatrixRef.current)
    glass.position.copy(_worldPos)
    _worldQuat.copy(fromQuat).slerp(toQuat, f)
    glass.quaternion.copy(parentInvQuatRef.current).multiply(_worldQuat)

    // Drain du jus (échelle Y ancrée en bas)
    const juice = juiceRef.current
    if (juice) {
      let scaleY = 1
      if (t >= DRINK_END) scaleY = 0
      else if (t > DRINK_START)
        scaleY = 1 - easeInOut((t - DRINK_START) / (DRINK_END - DRINK_START))
      juice.scale.setY(scaleY)
      juice.position.y = juiceOrigYRef.current + juiceMinYRef.current * (1 - scaleY)
      juice.visible = scaleY > 0.001 // évite un disque blanc résiduel quand vidé
    }

    // Son de gorgée au moment où le verre arrive à la bouche
    if (!soundPlayedRef.current && t >= DRINK_START) {
      soundPlayedRef.current = true
      playOnce('drinking')
    }

    if (t >= 1 && !completedRef.current) {
      completedRef.current = true
      activeRef.current = false
      glass.position.copy(origPosRef.current)
      glass.quaternion.copy(origQuatRef.current)
      onComplete?.()
    }
  })

  return null
}

const _worldPos = new THREE.Vector3()
const _worldQuat = new THREE.Quaternion()
