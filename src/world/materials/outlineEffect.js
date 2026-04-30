import { useEffect } from 'react'
import * as THREE from 'three'
import { createConditionalEdgesGeometry } from '../../utils/ConditionalEdgesGeometry'
import conditionalLineVertShader from './conditionalLine.vert.glsl'
import conditionalLineFragShader from './conditionalLine.frag.glsl'

export function createOutlineGeometry(geometry, thresholdAngle = 40, glowRadius = 3) {
  const baseGeo = createConditionalEdgesGeometry(geometry, thresholdAngle)
  const instancedGeo = new THREE.InstancedBufferGeometry()
  instancedGeo.copy(baseGeo)

  const offsets = []
  const opacities = []
  for (let x = -glowRadius; x <= glowRadius; x++) {
    for (let y = -glowRadius; y <= glowRadius; y++) {
      const dist = Math.sqrt(x * x + y * y)
      if (dist <= glowRadius) {
        offsets.push(x, y)
        const op = Math.max(0, 1.0 - dist / glowRadius)
        opacities.push(Math.pow(op, 1.5) * 0.4)
      }
    }
  }

  instancedGeo.setAttribute(
    'instanceOffset',
    new THREE.InstancedBufferAttribute(new Float32Array(offsets), 2)
  )
  instancedGeo.setAttribute(
    'instanceOpacity',
    new THREE.InstancedBufferAttribute(new Float32Array(opacities), 1)
  )
  instancedGeo.instanceCount = offsets.length / 2
  return instancedGeo
}

export function createOutlineMaterial(color = 0xffffff) {
  return new THREE.ShaderMaterial({
    vertexShader: conditionalLineVertShader,
    fragmentShader: conditionalLineFragShader,
    uniforms: {
      diffuse: { value: new THREE.Color(color) },
      opacity: { value: 1.0 },
      resolution: { value: new THREE.Vector2() },
    },
    transparent: true,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  })
}

export function useOutlineResolution(gl, material) {
  useEffect(() => {
    if (!material) return
    const update = () => {
      const canvas = gl.domElement
      const pixelRatio = gl.getPixelRatio()
      material.uniforms.resolution.value.set(
        canvas.clientWidth * pixelRatio,
        canvas.clientHeight * pixelRatio
      )
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [gl, material])
}
