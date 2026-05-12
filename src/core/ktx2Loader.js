import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'

const ktx2Loader = new KTX2Loader()
ktx2Loader.setTranscoderPath('/basis/')

let initialized = false
let resolveReady
const readyPromise = new Promise((resolve) => {
  resolveReady = resolve
})

export function initKTX2Loader(renderer) {
  if (initialized) return
  initialized = true
  ktx2Loader.detectSupport(renderer)
  resolveReady()
}

export function whenKTX2Ready() {
  return readyPromise
}

export { ktx2Loader }
