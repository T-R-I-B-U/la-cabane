import { useState, useEffect, useRef, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, PointerLockControls, Environment } from '@react-three/drei'
import { Physics, RigidBody, CapsuleCollider, CuboidCollider, useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { buildCabane } from '../world/entities/Cabane'
import { SlidingDoors } from '../world/entities/SlidingDoors'


function StatsCollector({ onStats }) {
  const { gl } = useThree()
  const frames = useRef(0)
  const lastAt = useRef(0)

  useFrame(() => {
    const now = performance.now()

    if (lastAt.current === 0) {
      lastAt.current = now
      return
    }

    frames.current += 1
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

// Loads the cabane model and notifies parent — rendering is handled by Scene
// so the primitive can be placed inside a RigidBody after load.
function CabaneLoader({ onReady, onError, onCabaneLoaded }) {
  useEffect(() => {
    buildCabane()
      .then((group) => {
        let meshes = 0
        let pivots = 0
        group.traverse((obj) => {
          if (obj === group) return
          if (obj.isMesh) {
            meshes++
            // C4D Boolean objects are the platform railings — mark as barrier
            if (obj.name.startsWith('Booléen')) obj.userData.isBarrier = true
          } else if (obj.userData.cabaneNode) pivots++
        })
        onReady({ meshes, pivots })
        onCabaneLoaded(group)
      })
      .catch((err) => onError(err.message ?? String(err)))
  }, [onReady, onError, onCabaneLoaded])

  return null
}

function Floor() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, FLOOR_Y, 0]}
      receiveShadow
      userData={{ isFloor: true }}
    >
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#e8e0d5" />
    </mesh>
  )
}

const FLOOR_Y = 0.04         // top face of hut base ring
const PLAYER_HEIGHT = 1.4
const SPEED = 0.09           // horizontal displacement per frame
const GRAVITY = 25           // m/s² (stronger than real for snappier feel)
const UP = new THREE.Vector3(0, 1, 0)

// Builds a physics-only THREE.Group (invisible, no barriers, no animated door panels).
// Geometry is shared with the visual cabane — no memory duplication.
function buildPhysicsGroup(cabane) {
  const group = new THREE.Group()
  cabane.traverse((obj) => {
    if (!obj.isMesh) return
    if (obj.userData.isBarrier) return
    // Door panels are animated — exclude them; they have no static physics
    if (obj.name.startsWith('door_right') || obj.name.startsWith('door_left')) return
    obj.updateWorldMatrix(true, false)
    const mesh = new THREE.Mesh(obj.geometry)
    mesh.visible = false
    mesh.matrixAutoUpdate = false
    mesh.matrix.copy(obj.matrixWorld)
    group.add(mesh)
  })
  return group
}

function DebugCollisions({ cabane }) {
  const groupRef = useRef()

  useEffect(() => {
    if (!cabane || !groupRef.current) return
    const group = groupRef.current

    // One shared wireframe material for all overlays
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff44, wireframe: true })

    cabane.traverse((obj) => {
      if (!obj.isMesh) return
      // Compute final world transform so the overlay sits exactly on the mesh
      obj.updateWorldMatrix(true, false)
      const overlay = new THREE.Mesh(obj.geometry, mat)
      overlay.matrix.copy(obj.matrixWorld)
      overlay.matrixAutoUpdate = false
      group.add(overlay)
    })

    return () => {
      mat.dispose()
      while (group.children.length) group.remove(group.children[0])
    }
  }, [cabane])

  return <group ref={groupRef} />
}

function PlayerPhysics() {
  const rbRef = useRef()
  const { world } = useRapier()
  const cc = useRef()
  const keys = useRef({})
  const velY = useRef(0)

  // Build the Rapier character controller once (autostep handles stair climbing)
  useEffect(() => {
    const controller = world.createCharacterController(0.01)
    controller.enableAutostep(0.4, 0.1, true) // max step height, min width, include dynamic
    controller.enableSnapToGround(0.5)
    controller.setMaxSlopeClimbAngle(Math.PI * 0.45) // ~81° max slope
    controller.setSlideEnabled(true)
    cc.current = controller
    return () => world.removeCharacterController(controller)
  }, [world])

  useEffect(() => {
    const down = (e) => { keys.current[e.code] = true }
    const up = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((state, delta) => {
    const { camera } = state
    const rb = rbRef.current
    if (!rb || !cc.current) return

    const collider = rb.collider(0)
    const pos = rb.translation()

    // Gravity: accumulate vertical velocity, reset on ground contact
    if (cc.current.computedGrounded()) {
      velY.current = 0
    } else {
      velY.current -= GRAVITY * delta
    }

    // Horizontal movement from keyboard input
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, UP).normalize()

    const k = keys.current
    const move = new THREE.Vector3(0, velY.current * delta, 0)
    if (k['KeyW']) move.addScaledVector(forward, SPEED)
    if (k['KeyS']) move.addScaledVector(forward, -SPEED)
    if (k['KeyA']) move.addScaledVector(right, -SPEED)
    if (k['KeyD']) move.addScaledVector(right, SPEED)

    // Let the character controller resolve collisions and slopes
    cc.current.computeColliderMovement(collider, { x: move.x, y: move.y, z: move.z })
    const m = cc.current.computedMovement()

    rb.setNextKinematicTranslation({
      x: pos.x + m.x,
      y: pos.y + m.y,
      z: pos.z + m.z,
    })

    // Camera sits at eye level — centre of capsule + half its height
    camera.position.set(
      pos.x + m.x,
      pos.y + m.y + PLAYER_HEIGHT / 2,
      pos.z + m.z,
    )
  })

  // Capsule: half-height of cylindrical body + hemisphere radius = PLAYER_HEIGHT
  const capsuleHalf = PLAYER_HEIGHT / 2 - 0.35
  const capsuleRadius = 0.35

  return (
    <>
      <RigidBody
        ref={rbRef}
        type="kinematicPosition"
        colliders={false}
        position={[PLAYER_SPAWN.x, FLOOR_Y + PLAYER_HEIGHT / 2, PLAYER_SPAWN.z]}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[capsuleHalf, capsuleRadius]} />
      </RigidBody>
      <PointerLockControls makeDefault />
    </>
  )
}

// hut01 world position from cabane.json
const HUT_POS = [-5.0111, 2.3616, 0.9556]

// Spawn in front of the hut entrance
const PLAYER_SPAWN = new THREE.Vector3(HUT_POS[0], FLOOR_Y + PLAYER_HEIGHT, HUT_POS[2] + 6)

export default function Scene({ onStats, onReady, onError, playerMode, debugDoors, debugPlayer }) {
  const [cabane, setCabane] = useState(null)
  const controlsRef = useRef()

  // Physics group is derived once from the loaded cabane (no re-computation on re-renders)
  const physicsGroup = useMemo(() => (cabane ? buildPhysicsGroup(cabane) : null), [cabane])

  return (
    <Canvas
      camera={{
        fov: 60,
        near: 0.01,
        far: 500,
        position: [HUT_POS[0] + 22, HUT_POS[1] + 14, HUT_POS[2] + 28],
      }}
      shadows
    >
      <Physics gravity={[0, -9.81, 0]}>
        <StatsCollector onStats={onStats} />

        <Environment preset="apartment" />
        <ambientLight intensity={1} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

        {/* Visual floor */}
        <Floor />
        {/* Ground physics — flat box whose top face sits at FLOOR_Y */}
        <RigidBody type="fixed" position={[0, FLOOR_Y - 0.5, 0]}>
          <CuboidCollider args={[200, 0.5, 200]} />
        </RigidBody>

        {/* Load the model (no render here) */}
        <CabaneLoader onReady={onReady} onError={onError} onCabaneLoaded={setCabane} />

        {/* Visual cabane (full, with barriers and doors) */}
        {cabane && <primitive object={cabane} />}

        {/* Physics cabane — trimesh without barriers or animated door panels */}
        {physicsGroup && (
          <RigidBody type="fixed" colliders="trimesh">
            <primitive object={physicsGroup} />
          </RigidBody>
        )}

        {/* Sliding doors — visual only; door panels are excluded from physics trimesh */}
        <SlidingDoors
          cabane={cabane}
          playerMode={playerMode}
          controlsRef={controlsRef}
          debug={debugDoors}
        />

        {debugPlayer && <DebugCollisions cabane={cabane} />}

        {playerMode ? (
          <PlayerPhysics />
        ) : (
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.08}
            minDistance={0.5}
            maxDistance={200}
            target={HUT_POS}
          />
        )}
      </Physics>
    </Canvas>
  )
}
