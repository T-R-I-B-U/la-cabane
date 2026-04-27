attribute vec3 control0;
attribute vec3 control1;
attribute vec3 direction;
attribute float collapse;
attribute vec2 instanceOffset;

uniform vec2 resolution;

#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
  #include <color_vertex>

  // Transform the line segment ends and control points into camera clip space
  vec4 c0 = projectionMatrix * modelViewMatrix * vec4( control0, 1.0 );
  vec4 c1 = projectionMatrix * modelViewMatrix * vec4( control1, 1.0 );
  vec4 p0 = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  vec4 p1 = projectionMatrix * modelViewMatrix * vec4( position + direction, 1.0 );

  c0.xy /= c0.w;
  c1.xy /= c1.w;
  p0.xy /= p0.w;
  p1.xy /= p1.w;

  // Get the direction of the segment and an orthogonal vector
  vec2 dir = p1.xy - p0.xy;
  vec2 norm = vec2( -dir.y, dir.x );

  // Get control point directions from the line
  vec2 c0dir = c0.xy - p1.xy;
  vec2 c1dir = c1.xy - p1.xy;

  // If the vectors to the controls points are pointed in different directions away
  // from the line segment then the line should not be drawn.
  float d0 = dot( normalize( norm ), normalize( c0dir ) );
  float d1 = dot( normalize( norm ), normalize( c1dir ) );
  float discardFlag = float( sign( d0 ) != sign( d1 ) );
  
  vec3 p = position + ((discardFlag > 0.5) ? direction * collapse : vec3(0.0));    
  vec4 mvPosition = modelViewMatrix * vec4( p, 1.0 );
  gl_Position = projectionMatrix * mvPosition;

  // Apply screen space thickness offset
  if (resolution.x > 0.0 && resolution.y > 0.0) {
    vec2 ndcOffset = (instanceOffset / resolution) * 2.0;
    gl_Position.xy += ndcOffset * gl_Position.w;
  }

  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  #include <fog_vertex>
}
