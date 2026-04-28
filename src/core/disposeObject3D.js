function disposeMaterial(material) {
  for (const value of Object.values(material)) {
    if (value?.isTexture) value.dispose()
  }
  material.dispose()
}

export function disposeObject3D(object3d) {
  object3d.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose()

    if (Array.isArray(obj.material)) {
      obj.material.forEach(disposeMaterial)
    } else if (obj.material) {
      disposeMaterial(obj.material)
    }
  })
}
