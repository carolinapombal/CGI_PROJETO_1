#version 300 es

precision highp float;

in vec2 a_position;
in vec3 a_color;

uniform vec2 u_resolution;
uniform vec2 u_pan;
uniform float u_zoom;

out vec3 v_color;

void main() {
    float scale = min(u_resolution.x, u_resolution.y) * u_zoom;

    vec2 screen_position =
        (a_position - u_pan) * scale + 0.5 * u_resolution;

    vec2 clip_position =
        2.0 * screen_position / u_resolution - 1.0;

    gl_Position = vec4(clip_position, 0.0, 1.0);

    // Keep the points circular and easy to select.
    gl_PointSize = 12.0;

    v_color = a_color;
}
