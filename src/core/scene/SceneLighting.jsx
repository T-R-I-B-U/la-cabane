import { useHelper, Environment } from '@react-three/drei'
import { useRef } from 'react'
import { DirectionalLightHelper } from 'three'

export function SceneLighting() {
  const directionalLightRef = useRef()

  // Helper debug : affiche la direction et la portée de la lumière dans la scène.
  useHelper(directionalLightRef, DirectionalLightHelper, 2, 'yellow')

  return (
    <>
      <Environment preset="apartment" />
      <ambientLight intensity={1} />
      <directionalLight ref={directionalLightRef} position={[10, 70, 10]} intensity={1.5} castShadow />
    </>
  )
}
