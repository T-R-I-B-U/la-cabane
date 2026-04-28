import { forwardRef, useMemo } from 'react'
import { EffectComposer } from '@react-three/postprocessing'
import { KuwaharaEffect } from './KuwaharaEffect'

const Kuwahara = forwardRef(function Kuwahara({ radius = 3 }, ref) {
  const effect = useMemo(() => new KuwaharaEffect({ radius }), [radius])
  return <primitive ref={ref} object={effect} dispose={null} />
})

export function WatercolorPass({ enabled = false, radius = 3 }) {
  return (
    <EffectComposer enabled={enabled}>
      <Kuwahara radius={radius} />
    </EffectComposer>
  )
}
