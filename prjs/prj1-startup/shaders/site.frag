#version 300 es

precision highp float;

in vec3 v_color;

out vec4 frag_color;

void main() {
    vec2 p = gl_PointCoord - vec2(0.5);
    float r = length(p);

    if (r > 0.5) {
        discard;
    }

    if (r > 0.40) {
        frag_color = vec4(0.02, 0.02, 0.02, 1.0);
    } else if (r > 0.27) {
        frag_color = vec4(1.0, 1.0, 1.0, 1.0);
    } else {
        frag_color = vec4(v_color, 1.0);
    }
}
