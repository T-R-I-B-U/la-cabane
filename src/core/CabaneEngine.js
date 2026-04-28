import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildCabane } from '../world/entities/Cabane.js'

function addDebugMarkers(root, parent) {
  const geo = new THREE.SphereGeometry(0.08, 6, 6)
  const matPivot = new THREE.MeshBasicMaterial({ color: 0x8899aa })
  const wp = new THREE.Vector3()

  root.traverse((obj) => {
    if (!obj.userData.cabaneNode) return
    const hasMesh = (() => {
      let f = false
      obj.traverse((c) => {
        if (c.isMesh) f = true
      })
      return f
    })()
    if (hasMesh) return
    obj.getWorldPosition(wp)
    const m = new THREE.Mesh(geo, matPivot)
    m.position.copy(wp)
    parent.add(m)
  })
}

export class CabaneEngine {
  constructor(container, { onStats = () => {}, onReady = () => {}, onError = () => {} } = {}) {
    this.container = container
    this.onStats = onStats
    this.onReady = onReady
    this.onError = onError

    // ── Scene ───────────────────────────────────────────────────────────
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xdde4ea)
    this.scene.fog = new THREE.Fog(0xdde4ea, 60, 180)

    this._grid = new THREE.GridHelper(80, 40, 0xaabbcc, 0xc4d4dc)
    this.scene.add(this._grid)
    this.scene.add(new THREE.AxesHelper(3))

    // Container rechargeable — clear() enlève cabane + markers d'un coup.
    this._sceneRoot = new THREE.Group()
    this.scene.add(this._sceneRoot)

    // ── Lights ──────────────────────────────────────────────────────────
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x4f5f66, 1))

    const sun = new THREE.DirectionalLight(0xfff2df, 1.1)
    sun.position.set(10, 20, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.near = 0.1
    sun.shadow.camera.far = 80
    sun.shadow.camera.left = sun.shadow.camera.bottom = -20
    sun.shadow.camera.right = sun.shadow.camera.top = 20
    this.scene.add(sun)

    // ── Renderer ────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    // ── Camera ──────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.01,
      500
    )
    this.camera.position.set(20, 15, 30)

    // ── Controls ────────────────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.enableZoom = true
    this.controls.zoomSpeed = 1.2
    this.controls.minDistance = 0.5
    this.controls.maxDistance = 200
    this.controls.target.set(0, 5, 0)

    // ── Stats state ─────────────────────────────────────────────────────
    this._clock = new THREE.Clock()
    this._frames = 0
    this._lastStatsAt = performance.now()
    this._fps = 0
    this._cpu = 0

    // ── Resize ──────────────────────────────────────────────────────────
    this._boundResize = this._onResize.bind(this)
    window.addEventListener('resize', this._boundResize)

    // ── Click-to-focus ──────────────────────────────────────────────────
    this._raycaster = new THREE.Raycaster()
    this._pointer = new THREE.Vector2()
    this._pointerDownAt = null

    this._boundPointerDown = this._onPointerDown.bind(this)
    this._boundPointerUp = this._onPointerUp.bind(this)
    this.renderer.domElement.addEventListener('pointerdown', this._boundPointerDown)
    this.renderer.domElement.addEventListener('pointerup', this._boundPointerUp)

    // ── Render loop ─────────────────────────────────────────────────────
    this._animate = this._animate.bind(this)
    this._raf = requestAnimationFrame(this._animate)

    this._compressed = false

    // ── Load cabane ─────────────────────────────────────────────────────
    this._loadCabane(null)
  }

  _onPointerDown(e) {
    this._pointerDownAt = { x: e.clientX, y: e.clientY }
  }

  _onPointerUp(e) {
    if (!this._pointerDownAt) return
    const dx = e.clientX - this._pointerDownAt.x
    const dy = e.clientY - this._pointerDownAt.y
    this._pointerDownAt = null

    if (Math.sqrt(dx * dx + dy * dy) > 4) return
    if (e.button !== 0) return

    const rect = this.renderer.domElement.getBoundingClientRect()
    this._pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )

    this._raycaster.setFromCamera(this._pointer, this.camera)
    const hits = this._raycaster.intersectObjects(this.scene.children, true)

    const hit = hits.find((h) => h.object !== this._grid && !(h.object instanceof THREE.GridHelper))
    if (hit) {
      let target = hit.object
      while (target.parent && !target.userData.cabaneNode) target = target.parent

      const center = new THREE.Box3().setFromObject(target).getCenter(new THREE.Vector3())
      this.controls.target.copy(center)
      this.controls.update()
    }
  }

  async _loadCabane(jsonData) {
    // Clear previous cabane + debug markers without touching lights/grid.
    this._sceneRoot.clear()

    const basePath = this._compressed ? '/models/compressed/' : '/models/'
    const texturePath = this._compressed ? '/textures/compressed/' : '/textures/'

    try {
      const cabane = await buildCabane({ jsonData, basePath, texturePath })
      this._sceneRoot.add(cabane)
      addDebugMarkers(cabane, this._sceneRoot)

      let meshes = 0
      let pivots = 0
      cabane.traverse((obj) => {
        if (obj === cabane) return
        if (obj.isMesh) meshes++
        else pivots++
      })

      const box = new THREE.Box3().setFromObject(cabane)
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const dist = Math.max(size.x, size.y, size.z) * 1.5
        this.controls.target.copy(center)
        this.camera.position.set(center.x + dist * 0.55, center.y + dist * 0.35, center.z + dist)
        this.controls.update()
      }

      this.onReady({ meshes, pivots })
    } catch (err) {
      this.onError(err instanceof Error ? err.message : String(err))
    }
  }

  // Recharge la scène avec un JSON custom (ou null pour revenir au vrai fichier).
  reload(jsonData = null) {
    this._loadCabane(jsonData)
  }

  // Bascule entre les assets normaux et les assets compressés (mode perf).
  setCompressed(enabled) {
    this._compressed = enabled
    this._loadCabane(null)
  }

  _animate() {
    this._raf = requestAnimationFrame(this._animate)
    this.controls.update()

    const start = performance.now()
    this.renderer.render(this.scene, this.camera)
    this._cpu = performance.now() - start

    this._frames += 1
    const now = performance.now()
    const elapsed = now - this._lastStatsAt

    if (elapsed >= 350) {
      this._fps = Math.round((this._frames * 1000) / elapsed)
      this._frames = 0
      this._lastStatsAt = now

      const info = this.renderer.info
      this.onStats({
        fps: this._fps,
        cpu: this._cpu,
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      })
    }
  }

  _onResize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  setFloorY(y) {
    this._grid.position.y = y
  }

  dispose() {
    cancelAnimationFrame(this._raf)
    window.removeEventListener('resize', this._boundResize)
    this.renderer.domElement.removeEventListener('pointerdown', this._boundPointerDown)
    this.renderer.domElement.removeEventListener('pointerup', this._boundPointerUp)
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
