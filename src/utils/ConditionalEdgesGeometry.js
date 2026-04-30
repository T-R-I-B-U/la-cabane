import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export function createConditionalEdgesGeometry(baseGeometry, thresholdAngle = 1) {
  const g = new THREE.BufferGeometry()
  const thresholdDot = Math.cos(THREE.MathUtils.DEG2RAD * thresholdAngle)

  // Extract position to a standard buffer to avoid InterleavedBufferAttribute errors
  const cleanGeometry = new THREE.BufferGeometry()
  const positions = baseGeometry.attributes.position
  const positionArray = new Float32Array(positions.count * 3)
  for (let i = 0; i < positions.count; i++) {
    positionArray[i * 3] = positions.getX(i)
    positionArray[i * 3 + 1] = positions.getY(i)
    positionArray[i * 3 + 2] = positions.getZ(i)
  }
  cleanGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))

  if (baseGeometry.index) {
    cleanGeometry.setIndex(baseGeometry.index.clone())
  }

  // Merge vertices to ensure shared edges are found even across UV seams
  const geometry = mergeVertices(cleanGeometry)

  const index = geometry.index
  const positionAttribute = geometry.attributes.position

  if (!index || !positionAttribute) {
    console.warn('ConditionalEdgesGeometry requires indexed geometry with positions')
    return new THREE.EdgesGeometry(baseGeometry, thresholdAngle) // fallback
  }

  // Compute face normals manually since BufferGeometry only stores vertex normals
  const faceNormals = []
  const vA = new THREE.Vector3()
  const vB = new THREE.Vector3()
  const vC = new THREE.Vector3()
  const cb = new THREE.Vector3()
  const ab = new THREE.Vector3()

  for (let i = 0; i < index.count; i += 3) {
    vA.fromBufferAttribute(positionAttribute, index.getX(i))
    vB.fromBufferAttribute(positionAttribute, index.getX(i + 1))
    vC.fromBufferAttribute(positionAttribute, index.getX(i + 2))

    cb.subVectors(vC, vB)
    ab.subVectors(vA, vB)
    cb.cross(ab).normalize()

    faceNormals.push(cb.clone())
  }

  const edge = [0, 0]
  const edges = {}

  for (let i = 0; i < index.count / 3; i++) {
    for (let j = 0; j < 3; j++) {
      const edge1 = index.getX(i * 3 + j)
      const edge2 = index.getX(i * 3 + ((j + 1) % 3))
      edge[0] = Math.min(edge1, edge2)
      edge[1] = Math.max(edge1, edge2)

      const key = edge[0] + ',' + edge[1]

      if (edges[key] === undefined) {
        edges[key] = { index1: edge[0], index2: edge[1], face1: i, face2: undefined }
      } else {
        edges[key].face2 = i
      }
    }
  }

  const vertices = []
  const control0 = []
  const control1 = []
  const direction = []
  const collapse = []

  const v3 = new THREE.Vector3()
  const n = new THREE.Vector3()
  const n1 = new THREE.Vector3()
  const n2 = new THREE.Vector3()
  const d = new THREE.Vector3()

  for (const key in edges) {
    const e = edges[key]

    // Render edge if the angle between face normals exceeds threshold
    if (e.face2 === undefined || faceNormals[e.face1].dot(faceNormals[e.face2]) <= thresholdDot) {
      const vertex1 = new THREE.Vector3().fromBufferAttribute(positionAttribute, e.index1)
      const vertex2 = new THREE.Vector3().fromBufferAttribute(positionAttribute, e.index2)

      vertices.push(vertex1.x, vertex1.y, vertex1.z)
      vertices.push(vertex2.x, vertex2.y, vertex2.z)

      d.subVectors(vertex2, vertex1)
      collapse.push(0, 1)
      n.copy(d).normalize()
      direction.push(d.x, d.y, d.z)

      n1.copy(faceNormals[e.face1])
      n1.crossVectors(n, n1)

      d.subVectors(vertex1, vertex2)
      n.copy(d).normalize()

      if (e.face2 !== undefined) {
        n2.copy(faceNormals[e.face2])
        n2.crossVectors(n, n2)
      } else {
        n2.copy(n1) // fallback if only one face
      }

      direction.push(d.x, d.y, d.z)

      v3.copy(vertex1).add(n1) // control0
      control0.push(v3.x, v3.y, v3.z)
      v3.copy(vertex1).add(n2) // control1
      control1.push(v3.x, v3.y, v3.z)

      v3.copy(vertex2).add(n1) // control0
      control0.push(v3.x, v3.y, v3.z)
      v3.copy(vertex2).add(n2) // control1
      control1.push(v3.x, v3.y, v3.z)
    }
  }

  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  g.setAttribute('control0', new THREE.Float32BufferAttribute(control0, 3))
  g.setAttribute('control1', new THREE.Float32BufferAttribute(control1, 3))
  g.setAttribute('direction', new THREE.Float32BufferAttribute(direction, 3))
  g.setAttribute('collapse', new THREE.Float32BufferAttribute(collapse, 1))

  return g
}
