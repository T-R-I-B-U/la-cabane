import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { applyAutoTextures } from '../cabane/textureResolver'

const MODEL_URL = '/models/book01.gltf'
const DUR_CAMERA = 0.8
const DUR_OPEN = 0.9
const DUR_CLOSE = 0.7
const OPEN_ROTATION_Z = Math.PI
const MODEL_SCALE = 1.8
const TOP_CAMERA_DISTANCE = 1.1
const LEFT_HINGE_X = -0.0688
const LEFT_HINGE_Y = 0.013614202849566936
const LEFT_CLOSED_X = -0.06768058240413666
const CAMERA_TOP_DIRECTION = new THREE.Vector3(0, 0.98, 0.2).normalize()
const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.35
const OUTLINE_COLOR = 0xfff1c2
const OUTLINE_OPACITY = 0.9

// Puzzle
const PIECE_NAMES = ['img01', 'img02', 'img03', 'img04']
const PARKING_POSITIONS = [
  new THREE.Vector3(-0.09, 0.015, 0.16),
  new THREE.Vector3(-0.03, 0.015, 0.16),
  new THREE.Vector3(0.03, 0.015, 0.16),
  new THREE.Vector3(0.09, 0.015, 0.16),
]
const DROP_THRESHOLD = 0.03
const PIECE_LERP = 3

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function cloneSingleMaterial(material) {
  const clone = material.clone()

  for (const [key, value] of Object.entries(clone)) {
    if (value?.isTexture) clone[key] = value.clone()
  }

  return clone
}

function cloneMaterial(material) {
  return Array.isArray(material) ? material.map(cloneSingleMaterial) : cloneSingleMaterial(material)
}

function createHoverOutline(mesh) {
  const geometry = new THREE.EdgesGeometry(mesh.geometry, 20)
  const material = new THREE.LineBasicMaterial({
    color: OUTLINE_COLOR,
    transparent: true,
    opacity: OUTLINE_OPACITY,
    depthTest: false,
  })
  const outline = new THREE.LineSegments(geometry, material)
  outline.name = `${mesh.name}-hover-outline`
  outline.visible = false
  outline.renderOrder = 10
  outline.raycast = () => {}
  return outline
}

export function JournalBook({
  position,
  rotationY = 0.08,
  active,
  autoOpenToken = 0,
  closeToken = 0,
  pieceInteractionEnabled = true,
  onInteractionStart,
  onInteractionEnd,
  onInteractionCancel,
  onOpenComplete,
  onPiecePlaced,
}) {
  const { camera, gl } = useThree()
  const { scene } = useGLTF(MODEL_URL)

  const groupRef = useRef()
  const leftPivotRef = useRef()
  const rangeRef = useRef()
  const stateRef = useRef('CLOSED')
  const elapsedRef = useRef(0)
  const cameraInitPosRef = useRef(new THREE.Vector3())
  const cameraInitQuatRef = useRef(new THREE.Quaternion())
  const cameraTargetPosRef = useRef(new THREE.Vector3())
  const cameraTargetQuatRef = useRef(new THREE.Quaternion())
  const cameraReturnStartPosRef = useRef(new THREE.Vector3())
  const cameraReturnStartQuatRef = useRef(new THREE.Quaternion())
  const restoreCameraAfterCloseRef = useRef(false)
  const lastAutoOpenTokenRef = useRef(0)
  const lastCloseTokenRef = useRef(closeToken)
  const pendingAutoOpenRef = useRef(false)
  const hoveredRef = useRef(false)
  const interactRaycasterRef = useRef(new THREE.Raycaster())
  const pointerNdcRef = useRef(new THREE.Vector2())
  const pointerMovedRef = useRef(false)
  const materialStatesRef = useRef(new Map())
  const outlinesRef = useRef([])
  const debugStateRef = useRef({ hovered: false, hitCount: 0 })

  // Puzzle
  const piecesRef = useRef(null)
  const dragRef = useRef(null)
  const { left, right, meshes } = useMemo(() => {
    const clone = scene.clone(true)
    const leftObject = clone.getObjectByName('book01-left')
    const rightObject = clone.getObjectByName('book01-right')
    const meshList = []

    if (!leftObject || !rightObject) {
      throw new Error('JournalBook: expected book01-left and book01-right nodes in book01.gltf')
    }

    clone.traverse((object) => {
      if (!object.isMesh) return
      meshList.push(object)
      object.geometry = object.geometry.clone()
      object.material = cloneMaterial(object.material)
      object.castShadow = true
      object.receiveShadow = true
    })

    leftObject.parent?.remove(leftObject)
    rightObject.parent?.remove(rightObject)

    return { left: leftObject, right: rightObject, meshes: meshList }
  }, [scene])

  useEffect(() => {
    Promise.all([applyAutoTextures(left, 'book01'), applyAutoTextures(right, 'book01')]).catch(
      (error) => {
        console.error('JournalBook: failed to apply book textures', error)
      }
    )
  }, [left, right])

  useEffect(() => {
    materialStatesRef.current = new Map()
    const outlines = []

    for (const root of [left, right]) {
      root.traverse((object) => {
        if (!object.isMesh) return

        const outline = createHoverOutline(object)
        object.add(outline)
        outlines.push(outline)

        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          if (!material?.emissive) return
          materialStatesRef.current.set(material, {
            emissive: material.emissive.clone(),
            emissiveIntensity: material.emissiveIntensity ?? 0,
          })
        })
      })
    }

    outlinesRef.current = outlines

    return () => {
      outlines.forEach((outline) => {
        outline.removeFromParent()
        outline.geometry.dispose()
        outline.material.dispose()
      })
      outlinesRef.current = []
    }
  }, [left, right])

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'default'
    }
  }, [])

  useEffect(() => {
    if (!active) document.body.style.cursor = 'default'
  }, [active])

  useEffect(() => {
    const canvas = gl.domElement

    const updatePointerNdc = (event) => {
      const rect = canvas.getBoundingClientRect()
      pointerNdcRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointerNdcRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      pointerMovedRef.current = true
    }

    canvas.addEventListener('pointermove', updatePointerNdc)
    return () => canvas.removeEventListener('pointermove', updatePointerNdc)
  }, [gl])

  const startCameraReturn = () => {
    cameraReturnStartPosRef.current.copy(camera.position)
    cameraReturnStartQuatRef.current.copy(camera.quaternion)
    stateRef.current = 'CAMERA_RETURNING'
    elapsedRef.current = 0
  }

  const requestClose = useEffectEvent(() => {
    const state = stateRef.current
    if (state === 'CLOSED' || state === 'CAMERA_RETURNING') return

    onInteractionCancel?.()

    // Re-parent placed pieces into their original parent so they follow the closing cover.
    // Hide unplaced pieces below the counter.
    if (piecesRef.current) {
      piecesRef.current.forEach((p) => {
        if (p.state === 'placed') {
          p.originalParent.add(p.mesh)
          p.mesh.position.copy(p.originalLocalPos)
          p.mesh.quaternion.copy(p.originalLocalQuat)
        } else {
          p.mesh.position.y -= 0.5
          p.state = 'hidden'
        }
      })
    }

    if (state === 'CAMERA_MOVING' || state === 'OPENING') {
      startCameraReturn()
      return
    }

    if (state === 'OPEN' || state === 'CLOSING') {
      restoreCameraAfterCloseRef.current = true
      stateRef.current = 'CLOSING'
      elapsedRef.current = 0
    }
  })

  const openBook = useCallback(() => {
    if (!active || stateRef.current !== 'CLOSED') return

    const bookPosition = groupRef.current.getWorldPosition(new THREE.Vector3())
    cameraTargetPosRef.current
      .copy(bookPosition)
      .addScaledVector(CAMERA_TOP_DIRECTION, TOP_CAMERA_DISTANCE)
    const lookAtMatrix = new THREE.Matrix4().lookAt(
      cameraTargetPosRef.current,
      bookPosition,
      camera.up
    )

    cameraInitPosRef.current.copy(camera.position)
    cameraInitQuatRef.current.copy(camera.quaternion)
    cameraTargetQuatRef.current.setFromRotationMatrix(lookAtMatrix)

    onInteractionStart?.()
    restoreCameraAfterCloseRef.current = false
    stateRef.current = 'CAMERA_MOVING'
    elapsedRef.current = 0
  }, [active, camera, onInteractionStart])

  useEffect(() => {
    const onPointerDown = (event) => {
      if (event.button !== 0 || !hoveredRef.current) return
      if (stateRef.current !== 'CLOSED') return
      if (import.meta.env.DEV) {
        console.debug('JournalBook: click open', {
          state: stateRef.current,
          hovered: hoveredRef.current,
          hitCount: debugStateRef.current.hitCount,
        })
      }
      openBook()
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openBook])

  // Called once the book is fully open — extracts pieces from book hierarchy,
  // stores their open positions as targets, then sends them to parking.
  // useCallback with [] is safe: only refs and module-level constants are captured.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setupPuzzle = useCallback(() => {
    const group = groupRef.current
    group.updateWorldMatrix(true, true)

    if (piecesRef.current) {
      // Re-open: restore placed pieces to groupRef at target, animate others from below
      piecesRef.current.forEach((piece, i) => {
        if (piece.state === 'placed') {
          group.attach(piece.mesh)
          piece.mesh.position.copy(piece.targetPos)
        } else {
          piece.mesh.position.copy(PARKING_POSITIONS[i]).setY(PARKING_POSITIONS[i].y - 0.4)
          piece.state = 'animating_in'
        }
      })
      return
    }

    piecesRef.current = PIECE_NAMES.map((name, i) => {
      const mesh = group.getObjectByName(name)
      if (!mesh) return null

      // Capture original parent and local transform so we can re-parent on close
      const originalParent = mesh.parent
      const originalLocalPos = mesh.position.clone()
      const originalLocalQuat = mesh.quaternion.clone()

      // Re-parent into groupRef while preserving world transform.
      // mesh.position after attach() is already the target in group-local space.
      group.attach(mesh)
      const targetPos = mesh.position.clone()

      // Spawn below the book, animate up to parking
      mesh.position.copy(PARKING_POSITIONS[i]).setY(PARKING_POSITIONS[i].y - 0.4)

      return {
        mesh,
        name,
        targetPos,
        originalParent,
        originalLocalPos,
        originalLocalQuat,
        state: 'animating_in',
      }
    }).filter(Boolean)
  })

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'Escape') return

      const state = stateRef.current
      if (state === 'CLOSED') return

      event.preventDefault()
      event.stopPropagation()
      requestClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (autoOpenToken === lastAutoOpenTokenRef.current) return
    lastAutoOpenTokenRef.current = autoOpenToken
    pendingAutoOpenRef.current = true
  }, [autoOpenToken, openBook])

  useEffect(() => {
    if (closeToken === lastCloseTokenRef.current) return
    lastCloseTokenRef.current = closeToken
    requestClose()
  }, [closeToken])

  // Puzzle drag-and-drop — native events (pointer lock is off when book is open)
  useEffect(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const raycaster = new THREE.Raycaster()
    const toNDC = (e) =>
      new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      )

    const onPointerDown = (e) => {
      const pieces = piecesRef.current
      if (!pieces || !pieceInteractionEnabled || dragRef.current || stateRef.current !== 'OPEN')
        return

      raycaster.setFromCamera(toNDC(e), camera)
      const pickable = pieces.filter((p) => p.state !== 'placed').map((p) => p.mesh)
      const hits = raycaster.intersectObjects(pickable, true)
      if (!hits.length) return

      const hitMesh = hits[0].object
      const index = pieces.findIndex(
        (p) => p.mesh === hitMesh || p.mesh.children?.includes(hitMesh)
      )
      if (index === -1) return

      pieces[index].state = 'dragging'
      dragRef.current = { index }
    }

    const onPointerMove = (e) => {
      if (!dragRef.current) return

      const group = groupRef.current
      group.updateWorldMatrix(true, false)

      const piece = piecesRef.current[dragRef.current.index]
      const groupWorldY = group.getWorldPosition(new THREE.Vector3()).y
      // Plane at the piece's target height (world space), so worldToLocal gives correct local Y
      const planeY = groupWorldY + piece.targetPos.y * MODEL_SCALE
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY)

      raycaster.setFromCamera(toNDC(e), camera)
      const hit = new THREE.Vector3()
      if (!raycaster.ray.intersectPlane(plane, hit)) return

      const localPos = group.worldToLocal(hit)
      localPos.y = piece.targetPos.y
      piece.mesh.position.copy(localPos)
    }

    const onPointerUp = () => {
      if (!dragRef.current) return

      const { index } = dragRef.current
      dragRef.current = null

      const piece = piecesRef.current[index]
      if (piece.mesh.position.distanceTo(piece.targetPos) < DROP_THRESHOLD) {
        piece.mesh.position.copy(piece.targetPos)
        piece.state = 'placed'
        onPiecePlaced?.(piece.name)
      } else {
        piece.state = 'parking'
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }
  }, [camera, onPiecePlaced, pieceInteractionEnabled])

  useFrame((_, delta) => {
    const group = groupRef.current
    const leftPivot = leftPivotRef.current
    const range = rangeRef.current
    if (!group || !leftPivot || !range) return

    if (pendingAutoOpenRef.current && active && stateRef.current === 'CLOSED') {
      pendingAutoOpenRef.current = false
      openBook()
    }

    const state = stateRef.current

    if (active && state === 'CLOSED') {
      const ndc = document.pointerLockElement
        ? pointerNdcRef.current.set(0, 0)
        : pointerMovedRef.current
          ? pointerNdcRef.current
          : null

      if (ndc) {
        interactRaycasterRef.current.setFromCamera(ndc, camera)
        const hits = interactRaycasterRef.current.intersectObjects(meshes, true)
        hoveredRef.current = hits.length > 0
        debugStateRef.current.hitCount = hits.length
      } else {
        hoveredRef.current = false
        debugStateRef.current.hitCount = 0
      }

      if (import.meta.env.DEV && debugStateRef.current.hovered !== hoveredRef.current) {
        debugStateRef.current.hovered = hoveredRef.current
        console.debug('JournalBook: hover', {
          hovered: hoveredRef.current,
          hitCount: debugStateRef.current.hitCount,
          pointerLock: !!document.pointerLockElement,
        })
      }

      range.visible = false
      outlinesRef.current.forEach((outline) => {
        outline.visible = hoveredRef.current
      })

      materialStatesRef.current.forEach((original, material) => {
        material.emissive.copy(hoveredRef.current ? HOVER_EMISSIVE : original.emissive)
        material.emissiveIntensity = hoveredRef.current
          ? HOVER_EMISSIVE_INTENSITY
          : original.emissiveIntensity
      })

      document.body.style.cursor = hoveredRef.current ? 'pointer' : 'default'
    } else {
      hoveredRef.current = false
      debugStateRef.current.hitCount = 0
      range.visible = false
      outlinesRef.current.forEach((outline) => {
        outline.visible = false
      })

      materialStatesRef.current.forEach((original, material) => {
        material.emissive.copy(original.emissive)
        material.emissiveIntensity = original.emissiveIntensity
      })

      document.body.style.cursor = 'default'
    }

    if (state === 'CLOSED') {
      leftPivot.rotation.z = 0
      return
    }

    elapsedRef.current += Math.min(delta, 0.1)
    const elapsed = elapsedRef.current

    if (state === 'CAMERA_MOVING') {
      const t = ease(Math.min(elapsed / DUR_CAMERA, 1))
      camera.position.lerpVectors(cameraInitPosRef.current, cameraTargetPosRef.current, t)
      camera.quaternion.slerpQuaternions(cameraInitQuatRef.current, cameraTargetQuatRef.current, t)

      if (elapsed >= DUR_CAMERA) {
        camera.position.copy(cameraTargetPosRef.current)
        camera.quaternion.copy(cameraTargetQuatRef.current)
        stateRef.current = 'OPENING'
        elapsedRef.current = 0
      }
      return
    }

    if (state === 'CAMERA_RETURNING') {
      const t = ease(Math.min(elapsed / DUR_CAMERA, 1))
      camera.position.lerpVectors(cameraReturnStartPosRef.current, cameraInitPosRef.current, t)
      camera.quaternion.slerpQuaternions(
        cameraReturnStartQuatRef.current,
        cameraInitQuatRef.current,
        t
      )

      if (elapsed >= DUR_CAMERA) {
        camera.position.copy(cameraInitPosRef.current)
        camera.quaternion.copy(cameraInitQuatRef.current)
        stateRef.current = 'CLOSED'
        elapsedRef.current = 0
        onInteractionEnd?.()
      }
      return
    }

    if (state === 'OPENING') {
      const t = ease(Math.min(elapsed / DUR_OPEN, 1))
      leftPivot.rotation.z = OPEN_ROTATION_Z * t

      if (elapsed >= DUR_OPEN) {
        leftPivot.rotation.z = OPEN_ROTATION_Z
        stateRef.current = 'OPEN'
        elapsedRef.current = 0
        setupPuzzle()
        onOpenComplete?.()
      }
      return
    }

    if (state === 'OPEN') {
      // Animate pieces toward parking or back from drag
      const pieces = piecesRef.current
      if (pieces) {
        pieces.forEach((piece, i) => {
          if (piece.state === 'animating_in' || piece.state === 'parking') {
            piece.mesh.position.lerp(PARKING_POSITIONS[i], Math.min(delta * PIECE_LERP, 1))
            if (
              piece.state === 'animating_in' &&
              piece.mesh.position.distanceTo(PARKING_POSITIONS[i]) < 0.002
            ) {
              piece.mesh.position.copy(PARKING_POSITIONS[i])
              piece.state = 'parking'
            }
          }
        })
      }
      return
    }

    if (state === 'CLOSING') {
      const t = ease(Math.min(elapsed / DUR_CLOSE, 1))
      leftPivot.rotation.z = OPEN_ROTATION_Z * (1 - t)

      if (elapsed >= DUR_CLOSE) {
        leftPivot.rotation.z = 0
        elapsedRef.current = 0

        if (restoreCameraAfterCloseRef.current) {
          restoreCameraAfterCloseRef.current = false
          startCameraReturn()
          return
        }

        stateRef.current = 'CLOSED'
        onInteractionEnd?.()
      }
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]} scale={MODEL_SCALE}>
      <mesh ref={rangeRef} scale={1 / MODEL_SCALE} renderOrder={1}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial transparent depthWrite={false} wireframe />
      </mesh>
      <primitive object={right} />
      <group ref={leftPivotRef} position={[LEFT_HINGE_X, LEFT_HINGE_Y, 0]}>
        <primitive object={left} position={[LEFT_CLOSED_X - LEFT_HINGE_X, 0, 0]} />
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_URL)
