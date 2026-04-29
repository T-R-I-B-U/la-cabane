import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { EffectComposer, EffectPass, RenderPass } from 'postprocessing'
import { KuwaharaEffect } from './KuwaharaEffect'

export function WatercolorPass({ radius = 3 }) {
  const { camera, gl, scene, setDpr, size } = useThree()
  const composerRef = useRef(null)
  const kuwaharaRef = useRef(null)

  useEffect(() => {
    const composer = new EffectComposer(gl)
    const kuwahara = new KuwaharaEffect()
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new EffectPass(camera, kuwahara))
    composerRef.current = composer
    kuwaharaRef.current = kuwahara

    return () => {
      composer.dispose()
      composerRef.current = null
      kuwaharaRef.current = null
    }
  }, [camera, gl, scene])

  useEffect(() => {
    if (kuwaharaRef.current) kuwaharaRef.current.radius = radius
  }, [radius])

  useEffect(() => {
    if (!composerRef.current) return
    setDpr(1)
    composerRef.current.setSize(size.width, size.height)
  }, [setDpr, size.height, size.width])

  // Restore DPR on unmount
  useEffect(() => {
    return () => setDpr(Math.min(window.devicePixelRatio, 2))
  }, [setDpr])

  useFrame((_, delta) => {
    composerRef.current?.render(delta)
  }, 1)

  return null
}
