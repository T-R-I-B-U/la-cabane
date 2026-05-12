import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getEditorFlyMode, onEditorFlyModeChange, setEditorFlyMode } from './cameraRegistry'

const SPEED = 10
const FAST_MULTIPLIER = 3
const MOUSE_SENSITIVITY = 0.0025
const UP = new THREE.Vector3(0, 1, 0)

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

export default function CameraEditorFlyControls() {
  const { camera, gl } = useThree()
  const activeRef = useRef(getEditorFlyMode())
  const mouseDownRef = useRef(false)
  const keysRef = useRef({})
  const eulerRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))

  useEffect(() => onEditorFlyModeChange((value) => (activeRef.current = value)), [])

  useEffect(() => {
    const canvas = gl.domElement

    function onKeyDown(event) {
      if (!activeRef.current) return
      if (isTypingTarget(event.target)) return
      keysRef.current[event.code] = true
      if (event.code === 'Space') event.preventDefault()
      if (event.code === 'Escape') setEditorFlyMode(false)
    }

    function onKeyUp(event) {
      keysRef.current[event.code] = false
    }

    function onMouseDown() {
      if (!activeRef.current) return
      eulerRef.current.setFromQuaternion(camera.quaternion)
      mouseDownRef.current = true
    }

    function onMouseUp() {
      mouseDownRef.current = false
    }

    function onMouseMove(event) {
      if (!activeRef.current || !mouseDownRef.current) return
      eulerRef.current.y -= event.movementX * MOUSE_SENSITIVITY
      eulerRef.current.x -= event.movementY * MOUSE_SENSITIVITY
      eulerRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, eulerRef.current.x))
      camera.quaternion.setFromEuler(eulerRef.current)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [camera, gl.domElement])

  useFrame((state, delta) => {
    if (!activeRef.current) return

    const { camera: frameCamera } = state
    const keys = keysRef.current
    const frameDelta = Math.min(delta, 0.1)
    const speed = SPEED * (keys.ShiftLeft || keys.ShiftRight ? FAST_MULTIPLIER : 1) * frameDelta
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(frameCamera.quaternion)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(frameCamera.quaternion)

    if (keys.KeyW || keys.KeyZ) frameCamera.position.addScaledVector(forward, speed)
    if (keys.KeyS) frameCamera.position.addScaledVector(forward, -speed)
    if (keys.KeyA || keys.KeyQ) frameCamera.position.addScaledVector(right, -speed)
    if (keys.KeyD) frameCamera.position.addScaledVector(right, speed)
    if (keys.Space) frameCamera.position.addScaledVector(UP, speed)
    if (keys.ControlLeft || keys.ControlRight) {
      frameCamera.position.addScaledVector(UP, -speed)
    }
  })

  return null
}
