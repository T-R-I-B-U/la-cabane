import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { BlendFunction, EffectComposer, EffectPass, RenderPass } from 'postprocessing'
import { KuwaharaEffect } from './KuwaharaEffect'

export function WatercolorPass({ enabled = false, radius = 3 }) {
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
    if (!kuwaharaRef.current) return
    kuwaharaRef.current.radius = radius
  }, [radius])

  useEffect(() => {
    if (!kuwaharaRef.current) return
    kuwaharaRef.current.blendMode.blendFunction = enabled
      ? BlendFunction.NORMAL
      : BlendFunction.SKIP
  }, [enabled])

  useEffect(() => {
    if (!composerRef.current) return
    const pixelRatio = enabled ? 1 : Math.min(window.devicePixelRatio, 2)
    setDpr(pixelRatio)
    composerRef.current.setSize(size.width, size.height)
  }, [enabled, setDpr, size.height, size.width])

  useFrame((_, delta) => {
    composerRef.current?.render(delta)
  }, 1)

  return null
}
