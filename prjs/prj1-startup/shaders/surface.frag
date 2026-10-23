#version 300 es

precision highp float;

flat in vec3 v_color;
in float v_height;

out vec4 frag_color;

void main() {

  float shade = 0.45f + 0.55f * exp(-2.0f * v_height);
  frag_color = vec4(v_color * shade, 1.0f);
}