import { Effect } from 'postprocessing'
import { Uniform, Vector2 } from 'three'

const fragmentShader = /* glsl */ `
#define MAX_RADIUS 5

uniform int  uRadius;
uniform vec2 uTexelSize;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 mean0 = vec3(0.0);
  vec3 mean1 = vec3(0.0);
  vec3 mean2 = vec3(0.0);
  vec3 mean3 = vec3(0.0);

  vec3 sqMean0 = vec3(0.0);
  vec3 sqMean1 = vec3(0.0);
  vec3 sqMean2 = vec3(0.0);
  vec3 sqMean3 = vec3(0.0);

  float count0 = 0.0;
  float count1 = 0.0;
  float count2 = 0.0;
  float count3 = 0.0;

  float radiusSquared = float(uRadius * uRadius);

  for (int j = -MAX_RADIUS; j <= MAX_RADIUS; j++) {
    for (int i = -MAX_RADIUS; i <= MAX_RADIUS; i++) {
      if (abs(i) > uRadius || abs(j) > uRadius) continue;

      vec2 offset = vec2(float(i), float(j));
      if (dot(offset, offset) > radiusSquared) continue;

      vec3 sampleColor = texture(inputBuffer, uv + offset * uTexelSize).rgb;

      if (i <= 0 && j <= 0) {
        mean0 += sampleColor;
        sqMean0 += sampleColor * sampleColor;
        count0 += 1.0;
      }
      if (i >= 0 && j <= 0) {
        mean1 += sampleColor;
        sqMean1 += sampleColor * sampleColor;
        count1 += 1.0;
      }
      if (i <= 0 && j >= 0) {
        mean2 += sampleColor;
        sqMean2 += sampleColor * sampleColor;
        count2 += 1.0;
      }
      if (i >= 0 && j >= 0) {
        mean3 += sampleColor;
        sqMean3 += sampleColor * sampleColor;
        count3 += 1.0;
      }
    }
  }

  mean0 /= max(count0, 1.0);
  mean1 /= max(count1, 1.0);
  mean2 /= max(count2, 1.0);
  mean3 /= max(count3, 1.0);

  float variance0 = dot(abs(sqMean0 / max(count0, 1.0) - mean0 * mean0), vec3(1.0));
  float variance1 = dot(abs(sqMean1 / max(count1, 1.0) - mean1 * mean1), vec3(1.0));
  float variance2 = dot(abs(sqMean2 / max(count2, 1.0) - mean2 * mean2), vec3(1.0));
  float variance3 = dot(abs(sqMean3 / max(count3, 1.0) - mean3 * mean3), vec3(1.0));

  vec3 result = inputColor.rgb;
  float minVariance = variance0;
  result = mean0;

  if (variance1 < minVariance) { minVariance = variance1; result = mean1; }
  if (variance2 < minVariance) { minVariance = variance2; result = mean2; }
  if (variance3 < minVariance) { result = mean3; }

  outputColor = vec4(result, inputColor.a);
}
`

export class KuwaharaEffect extends Effect {
  constructor({ radius = 3 } = {}) {
    const r = Math.max(0, Math.min(5, Math.floor(radius)))

    super('KuwaharaEffect', fragmentShader, {
      uniforms: new Map([
        ['uRadius', new Uniform(r)],
        ['uTexelSize', new Uniform(new Vector2(1 / 1920, 1 / 1080))],
      ]),
    })
  }

  setSize(width, height) {
    this.uniforms.get('uTexelSize').value.set(1 / width, 1 / height)
  }

  get radius() {
    return this.uniforms.get('uRadius').value
  }
  set radius(v) {
    this.uniforms.get('uRadius').value = Math.max(0, Math.min(5, Math.floor(v)))
  }
}
