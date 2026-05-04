import { useEffect, useEffectEvent, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { applyAutoTextures } from '../cabane/textureResolver'

const MODEL_URL = '/models/book01.gltf'
const MAX_INTERACT_DIST = 3.5
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

export function JournalBook({
  position,
  active,
  onInteractionStart,
  onInteractionEnd,
  onInteractionCancel,
}) {
  const { camera } = useThree()
  const { scene } = useGLTF(MODEL_URL)

  const groupRef = useRef()
  const leftPivotRef = useRef()
  const stateRef = useRef('CLOSED')
  const elapsedRef = useRef(0)
  const restYRef = useRef(position[1])
  const inRangeRef = useRef(false)
  const cameraInitPosRef = useRef(new THREE.Vector3())
  const cameraInitQuatRef = useRef(new THREE.Quaternion())
  const cameraTargetPosRef = useRef(new THREE.Vector3())
  const cameraTargetQuatRef = useRef(new THREE.Quaternion())
  const cameraReturnStartPosRef = useRef(new THREE.Vector3())
  const cameraReturnStartQuatRef = useRef(new THREE.Quaternion())
  const restoreCameraAfterCloseRef = useRef(false)

  const { left, right } = useMemo(() => {
    const clone = scene.clone(true)
    const leftObject = clone.getObjectByName('book01-left')
    const rightObject = clone.getObjectByName('book01-right')

    if (!leftObject || !rightObject) {
      throw new Error('JournalBook: expected book01-left and book01-right nodes in book01.gltf')
    }

    clone.traverse((object) => {
      if (!object.isMesh) return
      object.geometry = object.geometry.clone()
      object.material = cloneMaterial(object.material)
      object.castShadow = true
      object.receiveShadow = true
    })

    leftObject.parent?.remove(leftObject)
    rightObject.parent?.remove(rightObject)

    return { left: leftObject, right: rightObject }
  }, [scene])

  useEffect(() => {
    Promise.all([applyAutoTextures(left, 'book01'), applyAutoTextures(right, 'book01')]).catch(
      (error) => {
        console.error('JournalBook: failed to apply book textures', error)
      }
    )
  }, [left, right])

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'default'
    }
  }, [])

  useEffect(() => {
    if (!active) document.body.style.cursor = 'default'
  }, [active])

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

  const handlePointerDown = () => {
    if (!active || !inRangeRef.current) return

    if (stateRef.current === 'CLOSED') {
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
      return
    }
  }

  const handlePointerEnter = () => {
    if (active && inRangeRef.current) document.body.style.cursor = 'pointer'
  }

  const handlePointerLeave = () => {
    document.body.style.cursor = 'default'
  }

  useFrame((_, delta) => {
    const group = groupRef.current
    const leftPivot = leftPivotRef.current
    if (!group || !leftPivot) return

    const dist = camera.position.distanceTo(group.position)
    inRangeRef.current = dist <= MAX_INTERACT_DIST

    const state = stateRef.current

    if (state === 'CLOSED') {
      group.position.y = restYRef.current + Math.sin(performance.now() * 0.0008) * 0.005
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
    <group
      ref={groupRef}
      position={position}
      rotation={[0, 0.08, 0]}
      scale={MODEL_SCALE}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <primitive object={right} />
      <group ref={leftPivotRef} position={[LEFT_HINGE_X, LEFT_HINGE_Y, 0]}>
        <primitive object={left} position={[LEFT_CLOSED_X - LEFT_HINGE_X, 0, 0]} />
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_URL)
