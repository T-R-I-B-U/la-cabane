import { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { buildCabane } from '../world/entities/Cabane'

// Collects renderer stats + FPS every 350ms and forwards them to App.
function StatsCollector({ onStats }) {
  const { gl } = useThree()
  const frames = useRef(0)
  const lastAt = useRef(performance.now())

  useFrame(() => {
    frames.current += 1
    const now = performance.now()
    const elapsed = now - lastAt.current

    if (elapsed >= 350) {
      const fps = Math.round((frames.current * 1000) / elapsed)
      const frameMs = elapsed / frames.current
      frames.current = 0
      lastAt.current = now

      const info = gl.info
      onStats({
        fps,
        frameMs,
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      })
    }
  })

  return null
}

// Smoothly lerps OrbitControls target toward focusTarget on each frame.
function FocusRig({ controlsRef, focusTarget }) {
  useFrame(() => {
    const ctrl = controlsRef.current
    if (!ctrl) return
    if (ctrl.target.distanceTo(focusTarget.current) > 0.001) {
      ctrl.target.lerp(focusTarget.current, 0.08)
    }
  })
  return null
}

function CabaneMap({ onReady, onError, controlsRef, focusTarget }) {
  const [cabane, setCabane] = useState(null)
  const { camera } = useThree()

  useEffect(() => {
    buildCabane()
      .then((group) => {
        let meshes = 0
        let pivots = 0
        group.traverse((obj) => {
          if (obj === group) return
          if (obj.isMesh) meshes++
          else if (obj.userData.cabaneNode) pivots++
        })
        onReady({ meshes, pivots })

        // Auto-fit camera to scene bounding box.
        const box = new THREE.Box3().setFromObject(group)
        if (!box.isEmpty()) {
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const dist = Math.max(size.x, size.y, size.z) * 1.5
          focusTarget.current.copy(center)
          camera.position.set(
            center.x + dist * 0.55,
            center.y + dist * 0.35,
            center.z + dist,
          )
          if (controlsRef.current) {
            controlsRef.current.target.copy(center)
            controlsRef.current.update()
          }
        }

        setCabane(group)
      })
      .catch((err) => onError(err.message ?? String(err)))
  }, [onReady, onError, camera, controlsRef, focusTarget])

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      // Walk up the hierarchy to the nearest cabane node.
      let obj = e.object
      while (obj && !obj.userData.cabaneNode) obj = obj.parent
      if (!obj) return
      const pos = new THREE.Vector3()
      obj.getWorldPosition(pos)
      focusTarget.current.copy(pos)
    },
    [focusTarget],
  )

  if (!cabane) return null
  return <primitive object={cabane} onClick={handleClick} />
}

export default function Scene({ onStats, onReady, onError }) {
  const controlsRef = useRef()
  const focusTarget = useRef(new THREE.Vector3(0, 5, 0))

  return (
    <Canvas
      camera={{ fov: 50, near: 0.01, far: 500, position: [20, 15, 30] }}
      shadows
    >
      <StatsCollector onStats={onStats} />
      <FocusRig controlsRef={controlsRef} focusTarget={focusTarget} />

      {/* Environment HDRI — donne aux matériaux PBR quelque chose à refléter */}
      <Environment preset="apartment" backgroundBlurriness={1} />
      <ambientLight intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

      <CabaneMap
        onReady={onReady}
        onError={onError}
        controlsRef={controlsRef}
        focusTarget={focusTarget}
      />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={0.5}
        maxDistance={200}
      />
    </Canvas>
  )
}
