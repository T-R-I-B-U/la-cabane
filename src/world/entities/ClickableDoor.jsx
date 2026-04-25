import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const CENTER_NDC = new THREE.Vector2(0, 0)
const HOVER_EMISSIVE = new THREE.Color(0xfff1c2)
const HOVER_EMISSIVE_INTENSITY = 0.45
const OUTLINE_COLOR = 0xffffff
const OUTLINE_OPACITY = 0.9

function findDoorMeshes(cabane) {
  const meshes = []
  if (!cabane) return meshes
  cabane.traverse((obj) => {
    if (obj.isMesh && (obj.name.startsWith('door_right') || obj.name.startsWith('door_left'))) {
      meshes.push(obj)
    }
  })
  return meshes
}

function forEachMaterial(material, callback) {
  if (Array.isArray(material)) material.forEach(callback)
  else if (material) callback(material)
}

function cloneMaterial(material) {
  return Array.isArray(material) ? material.map((entry) => entry.clone()) : material.clone()
}

function createDoorOutline(mesh) {
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

export function ClickableDoor({ cabane, active, lockPointer = false, onDoorClick }) {
  const { camera, gl } = useThree()
  const hoveredRef = useRef(false)
  const mouseRef = useRef(new THREE.Vector2())
  const onDoorClickRef = useRef(onDoorClick)
  const outlinesRef = useRef([])
  const materialStatesRef = useRef(new Map())
  const raycaster = useRef(new THREE.Raycaster())

  const doorMeshes = useMemo(() => findDoorMeshes(cabane), [cabane])

  const updateMouseFromEvent = useCallback((canvas, event) => {
    const rect = canvas.getBoundingClientRect()
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }, [])

  const isDoorHit = useCallback(() => {
    const targetNdc = lockPointer ? CENTER_NDC : mouseRef.current
    raycaster.current.setFromCamera(targetNdc, camera)
    return raycaster.current.intersectObjects(doorMeshes, true).length > 0
  }, [camera, doorMeshes, lockPointer])

  // Keep the callback ref current without re-running the event-listener effect.
  useEffect(() => {
    onDoorClickRef.current = onDoorClick
  }, [onDoorClick])

  // Clone materials once per loaded cabane so hover feedback stays local to the door meshes.
  useEffect(() => {
    doorMeshes.forEach((mesh) => {
      if (mesh.material) mesh.material = cloneMaterial(mesh.material)
    })
  }, [doorMeshes])

  useEffect(() => {
    const outlines = doorMeshes.map((mesh) => {
      const outline = createDoorOutline(mesh)
      mesh.add(outline)
      return outline
    })

    outlinesRef.current = outlines
    materialStatesRef.current = new Map()

    doorMeshes.forEach((mesh) => {
      forEachMaterial(mesh.material, (material) => {
        if (!material.emissive) return
        materialStatesRef.current.set(material, {
          emissive: material.emissive.clone(),
          emissiveIntensity: material.emissiveIntensity ?? 0,
        })
      })
    })

    return () => {
      outlines.forEach((outline) => {
        outline.removeFromParent()
        outline.geometry.dispose()
        outline.material.dispose()
      })
      outlinesRef.current = []
    }
  }, [doorMeshes])

  const setDoorHover = useCallback(
    (isHovered) => {
      outlinesRef.current.forEach((outline) => {
        outline.visible = isHovered
      })

      doorMeshes.forEach((mesh) => {
        forEachMaterial(mesh.material, (material) => {
          const original = materialStatesRef.current.get(material)
          if (!original || !material.emissive) return

          if (isHovered) {
            material.emissive.copy(HOVER_EMISSIVE)
            material.emissiveIntensity = HOVER_EMISSIVE_INTENSITY
          } else {
            material.emissive.copy(original.emissive)
            material.emissiveIntensity = original.emissiveIntensity
          }
        })
      })
    },
    [doorMeshes]
  )

  useEffect(() => {
    if (!active || !doorMeshes.length) return

    const canvas = gl.domElement

    if (lockPointer) {
      const onPointerDown = (event) => {
        if (event.button !== 0) return

        if (isDoorHit()) {
          hoveredRef.current = true
          setDoorHover(true)
          onDoorClickRef.current?.()
        }
      }

      document.addEventListener('pointerdown', onPointerDown)

      return () => {
        document.removeEventListener('pointerdown', onPointerDown)
        hoveredRef.current = false
        setDoorHover(false)
        document.body.style.cursor = 'default'
      }
    }

    const onPointerMove = (event) => {
      updateMouseFromEvent(canvas, event)
      const isHovered = isDoorHit()

      if (hoveredRef.current !== isHovered) {
        hoveredRef.current = isHovered
        setDoorHover(isHovered)
      }

      document.body.style.cursor = isHovered ? 'pointer' : 'default'
    }

    const onClick = (event) => {
      updateMouseFromEvent(canvas, event)

      if (isDoorHit()) {
        hoveredRef.current = true
        setDoorHover(true)
        onDoorClickRef.current?.()
      }
    }

    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('click', onClick)

    return () => {
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('click', onClick)
      hoveredRef.current = false
      setDoorHover(false)
      document.body.style.cursor = 'default'
    }
  }, [active, doorMeshes, gl, isDoorHit, lockPointer, setDoorHover, updateMouseFromEvent])

  useFrame(() => {
    if (!active || !doorMeshes.length) return

    const isHovered = isDoorHit()

    if (hoveredRef.current !== isHovered) {
      hoveredRef.current = isHovered
      setDoorHover(isHovered)
    }

    document.body.style.cursor = isHovered ? 'pointer' : 'default'
  })

  return null
}
