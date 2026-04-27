import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export function StatsCollector({ onStats }) {
  const { gl } = useThree()
  const frames = useRef(0)
  const lastAt = useRef(0)

  // EffectComposer calls renderer.render() multiple times per frame. With
  // autoReset=true (default), each call resets info.render — so we'd only see
  // the last pass. Disable it and reset manually so all passes accumulate.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
    }
  }, [gl])

  useFrame(() => {
    // Read totals accumulated by ALL render passes of the previous frame,
    // then reset so the current frame starts fresh.
    const calls = gl.info.render.calls
    const triangles = gl.info.render.triangles
    gl.info.reset()

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
      onStats({
        fps,
        frameMs,
        calls,
        triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
      })
    }
  })

  return null
}
