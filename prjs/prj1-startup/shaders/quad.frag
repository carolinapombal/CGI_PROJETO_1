#version 300 es

precision highp float;
precision highp int;

const int MAX_SITES = 32;

uniform vec2 u_resolution;
uniform vec2 u_pan;
uniform float u_zoom;

uniform vec2 u_site_position[MAX_SITES];
uniform vec3 u_site_color[MAX_SITES];

uniform int u_n_sites;
uniform int u_metric;
uniform int u_show_borders;

out vec4 frag_color;

float distance_metric(vec2 p, vec2 q) {
    vec2 delta = abs(p - q);

    if(u_metric == 1) {
        return delta.x + delta.y;
    }

    if(u_metric == 2) {
        return max(delta.x, delta.y);
    }

    return length(delta);
}

void main() {
    vec2 pixel = gl_FragCoord.xy;

    float scale = min(u_resolution.x, u_resolution.y) * u_zoom;

    vec2 world_position = (pixel - 0.5f * u_resolution) / scale + u_pan;

    if(u_n_sites == 0) {
        frag_color = vec4(0.08f, 0.08f, 0.09f, 1.0f);
        return;
    }

    float nearest_distance = 1e20f;
    float second_distance = 1e20f;
    int nearest_index = 0;

    for(int i = 0; i < MAX_SITES; i++) {
        if(i >= u_n_sites) {
            break;
        }

        float d = distance_metric(world_position, u_site_position[i]);

        if(d < nearest_distance) {
            second_distance = nearest_distance;
            nearest_distance = d;
            nearest_index = i;
        } else if(d < second_distance) {
            second_distance = d;
        }
    }

    vec3 color = u_site_color[nearest_index];

    // Subtle shading based on distance to the nearest site.
    float shade = 0.45f + 0.55f * exp(-2.0f * nearest_distance);
    color *= shade;

    // Border thickness is approximately constant in screen pixels.
    float epsilon = 1.5f / scale;

    if(u_show_borders == 1 &&
        abs(second_distance - nearest_distance) < epsilon) {
        color = vec3(0.95f, 0.95f, 0.95f);
    }

    frag_color = vec4(color, 1.0f);
}
