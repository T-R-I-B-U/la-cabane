import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { play, stop } from '../../utils/audioStore'

const FILL_COLOR = new THREE.Color('#da4d79')
const DEFAULT_DURATION = 7.5

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// mode 'uvY'    → suit l'UV.y du mesh (pipe courbé)
// mode 'localY' → suit la hauteur locale Y avec bounding box (pot, récipient)
function buildFillMaterial(base, { mode = 'uvY', yMin = 0, yMax = 1, invertFill = false } = {}) {
  const mat = base.clone()
  const uniforms = {
    fillAmount: { value: 0 },
    fillStart: { value: 0 },
    fillColor: { value: FILL_COLOR },
    ...(mode === 'localY' && { fillYMin: { value: yMin }, fillYMax: { value: yMax } }),
  }

  if (mode === 'uvY') {
    // Force vUv varying — indépendant du chargement de texture (USE_MAP peut être absent au compile)
    mat.defines = { ...(mat.defines ?? {}), USE_UV: '' }
  }

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)

    if (mode === 'localY') {
      shader.vertexShader = `varying float vFillY;\n` + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvFillY = position.y;`
      )
      shader.fragmentShader =
        `uniform float fillAmount;\nuniform float fillStart;\nuniform float fillYMin;\nuniform float fillYMax;\nuniform vec3 fillColor;\nvarying float vFillY;\n` +
        shader.fragmentShader
    } else {
      shader.fragmentShader =
        `uniform float fillAmount;\nuniform float fillStart;\nuniform vec3 fillColor;\n` +
        shader.fragmentShader
    }

    const localYExpr = `(vFillY - fillYMin) / max(fillYMax - fillYMin, 0.001)`
    const normExpr = mode === 'localY' ? (invertFill ? `1.0 - ${localYExpr}` : localYExpr) : `vUv.y`

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <tonemapping_fragment>',
      `float _norm = ${normExpr};
float _filled = smoothstep(fillStart - 0.03, fillStart + 0.03, _norm) * (1.0 - smoothstep(fillAmount - 0.03, fillAmount + 0.03, _norm));
float _lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
gl_FragColor.rgb = mix(gl_FragColor.rgb, fillColor * (_lum * 1.2 + 0.2), _filled * 0.55);
#include <tonemapping_fragment>`
    )
  }

  mat.needsUpdate = true
  return { mat, uniforms }
}

function buildButtonMaterial(base, yMin, yMax) {
  const mat = base.clone()
  const uniforms = {
    redOn: { value: 1.0 },
    greenOn: { value: 0.0 },
    btnYMid: { value: (yMin + yMax) / 2 },
  }

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)

    shader.vertexShader = `varying float vBtnY;\n` + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nvBtnY = position.y;`
    )

    shader.fragmentShader =
      `uniform float redOn;\nuniform float greenOn;\nuniform float btnYMid;\nvarying float vBtnY;\n` +
      shader.fragmentShader

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <tonemapping_fragment>',
      `float _isTop = step(btnYMid, vBtnY);
vec3 _btnColor = mix(vec3(1.0, 0.1, 0.0) * redOn, vec3(0.0, 1.0, 0.27) * greenOn, _isTop);
gl_FragColor.rgb += _btnColor * 0.25;
#include <tonemapping_fragment>`
    )
  }

  mat.needsUpdate = true
  return { mat, uniforms }
}

const MESH_CONFIGS = [
  { name: 'pipe', mode: 'uvY', startAt: 0.0, maxFill: 1.0, drains: true, fillPhase: 'fill' },
  {
    name: 'pot',
    mode: 'localY',
    startAt: 0.3,
    fillWindow: 1.4,
    maxFill: 0.7,
    invertFill: false,
    drains: false,
    fillPhase: 'span',
  },
]

// Pot fill starts at gT=0.3 (matches MESH_CONFIGS pot.startAt)
const POT_FILL_START = 0.3

export function JuicePipeFill({ scene, playing, onComplete, duration = DEFAULT_DURATION }) {
  const globalTimeRef = useRef(0)
  const phaseRef = useRef('idle')
  const allUniformsRef = useRef([])
  const originalsRef = useRef([])
  const buttonsRef = useRef(null)
  const pouringTriggeredRef = useRef(false)

  useEffect(() => {
    if (!scene) return

    const allUniforms = []
    const originals = []

    for (const {
      name,
      mode,
      startAt,
      fillWindow,
      maxFill,
      invertFill,
      drains,
      fillPhase,
    } of MESH_CONFIGS) {
      const mesh = scene.getObjectByName(name)
      if (!mesh?.isMesh) continue

      let opts = { mode }
      if (mode === 'localY') {
        mesh.geometry.computeBoundingBox()
        const { min, max } = mesh.geometry.boundingBox
        opts = { mode, yMin: min.y, yMax: max.y, invertFill }
      }

      const { mat, uniforms } = buildFillMaterial(mesh.material, opts)
      originals.push({ mesh, original: mesh.material })
      mesh.material = mat
      allUniforms.push({
        uniforms,
        startAt: startAt ?? 0,
        fillWindow: fillWindow ?? 1.0,
        maxFill: maxFill ?? 1.0,
        drains: drains ?? false,
        fillPhase: fillPhase ?? 'fill',
      })
    }

    allUniformsRef.current = allUniforms
    originalsRef.current = originals

    const buttonsMesh = scene.getObjectByName('buttons')
    if (buttonsMesh?.isMesh) {
      buttonsMesh.geometry.computeBoundingBox()
      const { min, max } = buttonsMesh.geometry.boundingBox
      const { mat: btnMat, uniforms: btnUniforms } = buildButtonMaterial(
        buttonsMesh.material,
        min.y,
        max.y
      )
      originals.push({ mesh: buttonsMesh, original: buttonsMesh.material })
      buttonsMesh.material = btnMat
      buttonsRef.current = btnUniforms
    }

    return () => {
      for (const { mesh, original } of originalsRef.current) {
        mesh.material = original
      }
      buttonsRef.current = null
    }
  }, [scene])

  useEffect(() => {
    if (!playing) {
      stop('juiceMachine')
      stop('juicePouring')
      phaseRef.current = 'idle'
      globalTimeRef.current = 0
      pouringTriggeredRef.current = false
      if (buttonsRef.current) {
        buttonsRef.current.redOn.value = 1.0
        buttonsRef.current.greenOn.value = 0.0
      }
      return
    }
    globalTimeRef.current = 0
    phaseRef.current = 'filling'
    pouringTriggeredRef.current = false
    play('juiceMachine')
    for (const { uniforms } of allUniformsRef.current) {
      // eslint-disable-next-line react-hooks/immutability
      uniforms.fillAmount.value = 0
      uniforms.fillStart.value = 0
    }
    if (buttonsRef.current) {
      buttonsRef.current.redOn.value = 0.0
      buttonsRef.current.greenOn.value = 1.0
    }
  }, [playing])

  useFrame((_, delta) => {
    if (phaseRef.current === 'idle' || !allUniformsRef.current.length) return

    globalTimeRef.current = Math.min(globalTimeRef.current + delta / duration, 2)
    const gT = globalTimeRef.current // 0→1 fill, 1→2 drain

    const fillEased = easeInOut(Math.min(gT, 1))
    const drainEased = easeInOut(Math.max(gT - 1, 0))

    if (phaseRef.current === 'filling' && gT >= 1) phaseRef.current = 'draining'

    for (const {
      uniforms,
      startAt,
      fillWindow,
      maxFill,
      drains,
      fillPhase,
    } of allUniformsRef.current) {
      if (fillPhase === 'fill') {
        const local =
          fillEased < startAt
            ? 0
            : Math.min((fillEased - startAt) / Math.max(1 - startAt, 0.001), 1)
        // eslint-disable-next-line react-hooks/immutability
        uniforms.fillAmount.value = local * maxFill
      } else if (fillPhase === 'span') {
        const local = Math.max(0, Math.min((gT - startAt) / Math.max(fillWindow, 0.001), 1))
        uniforms.fillAmount.value = easeInOut(local) * maxFill
      }
      if (drains) uniforms.fillStart.value = drainEased
    }

    if (!pouringTriggeredRef.current && gT >= POT_FILL_START) {
      pouringTriggeredRef.current = true
      play('juicePouring')
    }

    if (phaseRef.current === 'draining' && gT >= 2) {
      phaseRef.current = 'idle'
      stop('juiceMachine')
      stop('juicePouring')
      if (buttonsRef.current) {
        buttonsRef.current.redOn.value = 1.0
        buttonsRef.current.greenOn.value = 0.0
      }
      onComplete?.()
    }
  })

  return null
}
