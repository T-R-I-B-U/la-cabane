# Shaders et matériaux

## Vue d'ensemble

Deux effets visuels custom sont implémentés :
1. **WatercolorPass** — effet aquarelle post-processing (Kuwahara filter)
2. **Outline effect** — contour géométrique sur les objets interactifs

---

## WatercolorPass

Fichiers :
- `src/world/materials/WatercolorPass.jsx` (composant R3F, 46 lignes)
- `src/world/materials/KuwaharaEffect.js` (implémentation shader, ~105 lignes)

### Activation

```jsx
// Scene.jsx
{shaderEnabled && <WatercolorPass radius={shaderRadius} />}
```

`shaderEnabled` et `shaderRadius` sont contrôlés depuis `ViewerControls.jsx` (toggle + slider).

### `WatercolorPass.jsx`

Crée un `EffectComposer` custom (pas le composer par défaut de R3F) et le rend après la scène :

```jsx
export function WatercolorPass({ radius = 3 }) {
  const composerRef = useRef(null)

  useEffect(() => {
    const composer = new EffectComposer(gl)
    const kuwahara = new KuwaharaEffect()   // pas de radius ici
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new EffectPass(camera, kuwahara))
    composerRef.current = composer
    kuwaharaRef.current = kuwahara
    return () => { composer.dispose(); composerRef.current = null }
  }, [camera, gl, scene])

  // Radius mis à jour séparément via le getter/setter
  useEffect(() => {
    if (kuwaharaRef.current) kuwaharaRef.current.radius = radius
  }, [radius])

  // Resize + DPR réduit à 1 pour limiter la charge GPU (Kuwahara coûteux)
  useEffect(() => {
    if (!composerRef.current) return
    setDpr(1)
    composerRef.current.setSize(size.width, size.height)
  }, [setDpr, size.width, size.height])

  // Restore DPR sur unmount : Math.min(window.devicePixelRatio, 2)
  useEffect(() => {
    return () => setDpr(Math.min(window.devicePixelRatio, 2))
  }, [setDpr])

  useFrame((_, delta) => {
    composerRef.current?.render(delta)
  }, 1)    // render order 1 → s'exécute après le render principal (order 0)
}
```

### Algorithme Kuwahara

Le filtre Kuwahara est un filtre de lissage non-linéaire qui préserve les contours, donnant un aspect peinture/aquarelle.

**Principe** : pour chaque pixel, divise le voisinage en 4 quadrants. Calcule la **moyenne** et la **variance** de chaque quadrant. Retourne la couleur du quadrant avec la variance minimale (le plus "homogène").

```glsl
// KuwaharaEffect.js — fragment shader

#define MAX_RADIUS 5
uniform int uRadius;
uniform vec2 uTexelSize;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 mean[4]   = vec3[4](vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
  vec3 sqMean[4] = vec3[4](vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
  float count[4] = float[4](0.0, 0.0, 0.0, 0.0);

  // Quadrant 0 : i <= 0, j <= 0
  // Quadrant 1 : i >= 0, j <= 0
  // Quadrant 2 : i <= 0, j >= 0
  // Quadrant 3 : i >= 0, j >= 0

  for (int i = -uRadius; i <= uRadius; i++) {
    for (int j = -uRadius; j <= uRadius; j++) {
      vec2 offset = vec2(float(i), float(j)) * uTexelSize;
      vec3 col = texture2D(inputBuffer, uv + offset).rgb;

      // Attribue le sample au(x) quadrant(s) correspondant(s)
      if (i <= 0 && j <= 0) { mean[0] += col; sqMean[0] += col*col; count[0]++; }
      if (i >= 0 && j <= 0) { mean[1] += col; sqMean[1] += col*col; count[1]++; }
      if (i <= 0 && j >= 0) { mean[2] += col; sqMean[2] += col*col; count[2]++; }
      if (i >= 0 && j >= 0) { mean[3] += col; sqMean[3] += col*col; count[3]++; }
    }
  }

  float minVariance = 1e10;
  vec3 result = inputColor.rgb;

  for (int k = 0; k < 4; k++) {
    mean[k] /= count[k];
    sqMean[k] /= count[k];
    float variance = dot(abs(sqMean[k] - mean[k] * mean[k]), vec3(1.0));

    if (variance < minVariance) {
      minVariance = variance;
      result = mean[k];
    }
  }

  outputColor = vec4(result, inputColor.a);
}
```

**Paramètre `radius`** : taille du voisinage (1–5, clamped via getter/setter). Plus grand = effet plus prononcé mais plus lent.

**Optimisation circulaire** : les coins du voisinage carré sont sautés via `dot(offset, offset) > radiusSquared` — réduit le nombre de samples de ~21% sur les bords.

### Implémentation Three.js

`KuwaharaEffect` étend la classe `Effect` de `postprocessing` :

```js
import { Effect } from 'postprocessing'

export class KuwaharaEffect extends Effect {
  constructor({ radius = 3 } = {}) {
    super('KuwaharaEffect', fragmentShader, {
      uniforms: new Map([
        ['uRadius', new THREE.Uniform(radius)],
        ['uTexelSize', new THREE.Uniform(new THREE.Vector2())],
      ])
    })
  }

  update(renderer, inputBuffer) {
    // Met à jour uTexelSize selon la résolution actuelle
    this.uniforms.get('uTexelSize').value.set(
      1 / inputBuffer.width,
      1 / inputBuffer.height
    )
  }

  setSize(width, height) {
    // Appelé par le composer lors des resize
    this.uniforms.get('uTexelSize').value.set(1 / width, 1 / height)
  }

  get radius() { return this.uniforms.get('uRadius').value }
  set radius(v) { this.uniforms.get('uRadius').value = Math.max(0, Math.min(5, v)) }
}
```

---

## Outline effect

Fichiers :
- `src/utils/ConditionalEdgesGeometry.js`
- `src/world/materials/outlineEffect.js`

Utilisé pour les objets interactifs (feuilles au hover, porte, fruits).

### `createOutlineGeometry(geometry, thresholdAngle=40, glowRadius=3)`

Construit une `InstancedBufferGeometry` avec un **effet de glow circulaire** :

```js
// Génère des instances décalées en cercle autour des arêtes
for (let x = -glowRadius; x <= glowRadius; x++) {
  for (let y = -glowRadius; y <= glowRadius; y++) {
    if (Math.sqrt(x*x + y*y) <= glowRadius) {
      // Opacité : Math.pow(1 - dist/glowRadius, 1.5) * 0.4
      offsets.push(x, y)
      opacities.push(...)
    }
  }
}
```

Les arêtes de base proviennent de `ConditionalEdgesGeometry` (pas `EdgesGeometry`).

### `ConditionalEdgesGeometry.js`

Geometry custom qui n'inclut que les arêtes où **l'angle entre les deux faces adjacentes** dépasse un seuil. Algorithme :

1. Merge des vertices via `mergeVertices` (pour trouver les arêtes partagées cross-UV)
2. Calcul des normales de chaque face (manual cross product)
3. Pour chaque arête : si `normal1.dot(normal2) <= cos(seuil)` → arête incluse
4. Attributs custom : `control0`, `control1`, `direction`, `collapse` (utilisés par le vertex shader pour le rendu conditionnel)

### `createOutlineMaterial(color=0xffffff)`

Retourne un **ShaderMaterial** custom (pas `LineBasicMaterial`) :

```js
new THREE.ShaderMaterial({
  vertexShader: conditionalLineVertShader,    // .glsl importé via vite-plugin-glsl
  fragmentShader: conditionalLineFragShader,
  uniforms: {
    diffuse:    { value: new THREE.Color(color) },
    opacity:    { value: 1.0 },
    resolution: { value: new THREE.Vector2() },
  },
  transparent: true,
  depthTest: false,
  blending: THREE.AdditiveBlending,
})
```

### `useOutlineResolution(gl, material)`

Hook qui met à jour l'uniform `resolution` sur le renderer resize :

```js
const update = () => {
  material.uniforms.resolution.value.set(
    canvas.clientWidth * gl.getPixelRatio(),
    canvas.clientHeight * gl.getPixelRatio()
  )
}
update()
window.addEventListener('resize', update)
```

### Note : ClickableDoor utilise EdgesGeometry (plus simple)

`ClickableDoor.jsx` utilise `new THREE.EdgesGeometry(geometry, 20)` et `LineBasicMaterial` directement — pas l'effet de glow. Les deux systèmes coexistent.

---

## Émissivité au hover

En complément des outlines, les objets interactifs utilisent l'**émissivité** Three.js pour le feedback hover :

```js
// Sauvegarde de l'émissivité originale
const originalEmissive = mesh.material.emissive.clone()
const originalIntensity = mesh.material.emissiveIntensity

// Au hover :
mesh.material.emissive.set(HOVER_EMISSIVE_COLOR)
mesh.material.emissiveIntensity = HOVER_EMISSIVE_INTENSITY

// Au unhover :
mesh.material.emissive.copy(originalEmissive)
mesh.material.emissiveIntensity = originalIntensity
```

Ce pattern est implémenté dans `useCenterScreenMeshInteraction.js`.
