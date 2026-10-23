#version 300 es

precision highp float;

const int MAX_SITES = 32;

uniform vec2 u_site_position[MAX_SITES];
uniform vec3 u_site_color[MAX_SITES];

uniform vec2 u_resolution;
uniform vec2 u_pan;
uniform float u_zoom;

out vec3 v_color;

void main() {
    vec2 p = u_site_position[gl_VertexID];

    float scale = min(u_resolution.x, u_resolution.y) * u_zoom;
    vec2 screen_position = (p - u_pan) * scale + 0.5f * u_resolution;
    vec2 clip_position = 2.0f * screen_position / u_resolution - 1.0f;

    gl_Position = vec4(clip_position, 0.0f, 1.0f);
    gl_PointSize = 12.0f;

    v_color = u_site_color[gl_VertexID];
}
