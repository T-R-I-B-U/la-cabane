import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStableInteractionCallback } from '../interactions/useStableInteractionCallback'

const PW = 0.44
const PH = 0.6
const T_COVER = 0.012
const T_PAGES = 0.03
const T_TOTAL = T_COVER * 2 + T_PAGES
const SPINE_W = 0.016
const BOOK_DIST = 0.55
const MAX_INTERACT_DIST = 3.5

const DUR_LIFT = 1.5
const DUR_OPEN = 0.9
const DUR_CLOSE = 0.7
const DUR_DESCEND = 1.3

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const REST_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.08))

export function JournalBook({ position, active, open, onStart, onOpen }) {
  const { camera } = useThree()
  const groupRef = useRef()
  const coverPivotRef = useRef()
  const pagesBlockRef = useRef()
  const innerFaceRef = useRef()

  const stateRef = useRef('IDLE')
  const elapsedRef = useRef(0)
  const liftInitPos = useRef(new THREE.Vector3())
  const liftInitQuat = useRef(new THREE.Quaternion())
  const targetPos = useRef(new THREE.Vector3())
  const targetQuat = useRef(new THREE.Quaternion())
  const restPos = useRef(new THREE.Vector3(...position))
  const inRangeRef = useRef(false)

  const onStartRef = useStableInteractionCallback(onStart)
  const onOpenRef = useStableInteractionCallback(onOpen)

  useEffect(() => {
    if (!open && stateRef.current === 'OPEN') {
      stateRef.current = 'CLOSING'
      elapsedRef.current = 0
    }
  }, [open])

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'default'
    }
  }, [])

  useEffect(() => {
    if (!active) document.body.style.cursor = 'default'
  }, [active])

  const computePageBounds = () => {
    const W = window.innerWidth
    const H = window.innerHeight
    groupRef.current.updateMatrixWorld(true)

    const project = (obj, lx, ly, lz = 0) => {
      const v = new THREE.Vector3(lx, ly, lz)
      obj.localToWorld(v)
      v.project(camera)
      return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H }
    }

    const phw = (PW - SPINE_W) / 2
    const phh = (PH - 0.004) / 2

    // Page droite — face avant du bloc de pages (dans l'espace local du groupe)
    const rtl = project(groupRef.current, -phw, phh, T_PAGES / 2)
    const rbr = project(groupRef.current, phw, -phh, T_PAGES / 2)

    // Page gauche — face de la couverture intérieure ouverte
    const ltl = project(innerFaceRef.current, -phw, phh)
    const lbr = project(innerFaceRef.current, phw, -phh)

    return {
      right: { left: rtl.x, top: rtl.y, width: rbr.x - rtl.x, height: rbr.y - rtl.y },
      left: { left: ltl.x, top: ltl.y, width: lbr.x - ltl.x, height: lbr.y - ltl.y },
    }
  }

  const computeTarget = () => {
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    targetPos.current.copy(camera.position).addScaledVector(dir, BOOK_DIST)
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
    targetPos.current.addScaledVector(right, PW * 0.35)
    const col0 = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
    const col1 = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
    const col2 = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2)
    targetQuat.current.setFromRotationMatrix(new THREE.Matrix4().makeBasis(col0, col1, col2))
  }

  const handlePointerDown = () => {
    if (!active || !inRangeRef.current || stateRef.current !== 'IDLE') return
    computeTarget()
    liftInitPos.current.copy(groupRef.current.position)
    liftInitQuat.current.copy(groupRef.current.quaternion)
    stateRef.current = 'LIFTING'
    elapsedRef.current = 0
    document.body.style.cursor = 'default'
    onStartRef.current?.()
  }

  const handlePointerEnter = () => {
    if (active && inRangeRef.current && stateRef.current === 'IDLE')
      document.body.style.cursor = 'pointer'
  }

  const handlePointerLeave = () => {
    document.body.style.cursor = 'default'
  }

  useFrame((_, delta) => {
    const group = groupRef.current
    const cover = coverPivotRef.current
    if (!group || !cover) return

    // Zone de proximité — interaction uniquement quand assez proche
    const dist = camera.position.distanceTo(group.position)
    inRangeRef.current = dist <= MAX_INTERACT_DIST

    const state = stateRef.current

    if (state === 'IDLE') {
      group.position.y = restPos.current.y + Math.sin(performance.now() * 0.0008) * 0.005
      return
    }

    elapsedRef.current += Math.min(delta, 0.1)
    const elapsed = elapsedRef.current

    if (state === 'LIFTING') {
      const t = ease(Math.min(elapsed / DUR_LIFT, 1))
      group.position.lerpVectors(liftInitPos.current, targetPos.current, t)
      group.quaternion.slerpQuaternions(liftInitQuat.current, targetQuat.current, t)
      if (elapsed >= DUR_LIFT) {
        group.position.copy(targetPos.current)
        group.quaternion.copy(targetQuat.current)
        stateRef.current = 'OPENING'
        elapsedRef.current = 0
      }
      return
    }

    if (state === 'OPENING') {
      const t = ease(Math.min(elapsed / DUR_OPEN, 1))
      cover.rotation.y = -Math.PI * t
      if (elapsed >= DUR_OPEN) {
        cover.rotation.y = -Math.PI
        stateRef.current = 'OPEN'
        onOpenRef.current?.(computePageBounds())
      }
      return
    }

    if (state === 'CLOSING') {
      const t = ease(Math.min(elapsed / DUR_CLOSE, 1))
      cover.rotation.y = -Math.PI * (1 - t)
      if (elapsed >= DUR_CLOSE) {
        cover.rotation.y = 0
        stateRef.current = 'DESCENDING'
        elapsedRef.current = 0
      }
      return
    }

    if (state === 'DESCENDING') {
      const t = ease(Math.min(elapsed / DUR_DESCEND, 1))
      group.position.lerpVectors(targetPos.current, restPos.current, t)
      group.quaternion.slerpQuaternions(targetQuat.current, REST_QUAT, t)
      if (elapsed >= DUR_DESCEND) {
        group.position.copy(restPos.current)
        group.quaternion.copy(REST_QUAT)
        stateRef.current = 'IDLE'
        elapsedRef.current = 0
      }
    }
  })

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[-Math.PI / 2, 0, 0.08]}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Couverture arrière */}
      <mesh position={[0, 0, -(T_PAGES / 2 + T_COVER / 2)]} castShadow receiveShadow>
        <boxGeometry args={[PW, PH, T_COVER]} />
        <meshStandardMaterial color={0x6b3a2a} roughness={0.75} />
      </mesh>

      {/* Bloc de pages (page droite quand ouvert) */}
      <mesh ref={pagesBlockRef} castShadow receiveShadow>
        <boxGeometry args={[PW - SPINE_W, PH - 0.004, T_PAGES]} />
        <meshStandardMaterial color={0xf0e6ce} roughness={0.95} />
      </mesh>

      {/* Reliure */}
      <mesh position={[-PW / 2 + SPINE_W / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[SPINE_W, PH, T_TOTAL + 0.002]} />
        <meshStandardMaterial color={0x4e2a1a} roughness={0.8} />
      </mesh>

      {/* Couverture avant — pivot sur la reliure */}
      <group ref={coverPivotRef} position={[-PW / 2, 0, T_PAGES / 2 + T_COVER / 2]}>
        <mesh position={[PW / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[PW, PH, T_COVER]} />
          <meshStandardMaterial color={0x6b3a2a} roughness={0.75} />
        </mesh>
        {/* Page intérieure — gauche quand ouvert, sert de cible pour les bounds */}
        <mesh
          ref={innerFaceRef}
          position={[PW / 2, 0, -(T_COVER / 2 + 0.001)]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[PW - SPINE_W, PH - 0.004]} />
          <meshStandardMaterial color={0xf0e6ce} roughness={0.9} side={2} />
        </mesh>
      </group>
    </group>
  )
}
