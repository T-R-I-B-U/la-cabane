// Proxy mesh outline — matrix already has 1.1× scale baked in by syncProxy() on the JS side.
// BackSide material makes the enlarged back faces peek past the front-facing leaf → outline ring.
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
