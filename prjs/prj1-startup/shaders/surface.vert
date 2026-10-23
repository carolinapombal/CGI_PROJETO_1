#version 300 es

precision highp float;

const int MAX_SITES = 32;
const float PI = 3.14159265358979f;

uniform vec2 u_site_position[MAX_SITES];
uniform vec3 u_site_color[MAX_SITES];

uniform vec2 u_resolution;
uniform vec2 u_pan;
uniform float u_zoom;

uniform int u_metric;      // 0 Euclidiana, 1 Manhattan, 2 Chebyshev
uniform int u_sides;       // lados da orla: 128 para o cone, 4 para as pirâmides
uniform float u_radius;    // altura da orla, em coordenadas do mundo

flat out vec3 v_color;
out float v_height;

void main() {
  vec2 site = u_site_position[gl_InstanceID];

  vec2 offset = vec2(0.0f);
  float height = 0.0f;

    // Vértice 0: topo da superfície, sobre o site, com altura 0.

  if(gl_VertexID > 0) {
    int k = (gl_VertexID - 1) % u_sides;
    float angle = 2.0f * PI * float(k) / float(u_sides);
    float r = u_radius;

    if(u_metric == 2) {
      angle += 0.25f * PI;
      r *= sqrt(2.0f);
    }

    offset = r * vec2(cos(angle), sin(angle));
    height = u_radius;
  }

  vec2 world = site + offset;

  float scale = min(u_resolution.x, u_resolution.y) * u_zoom;
  vec2 screen_position = (world - u_pan) * scale + 0.5f * u_resolution;
  vec2 clip_position = 2.0f * screen_position / u_resolution - 1.0f;

  float depth = height / u_radius - 1.0f;

  gl_Position = vec4(clip_position, depth, 1.0f);

  v_color = u_site_color[gl_InstanceID];
  v_height = height;
}