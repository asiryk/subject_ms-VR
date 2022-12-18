#ifdef GL_FRAGMENT_PRECISION_HIGH
   precision highp float;
#else
   precision mediump float;
#endif

varying vec3 light;
varying vec3 v_vertex;
varying vec3 v_vertex_position;

uniform mat4 normal_matrix;
uniform vec3 light_position;

vec3 calculate_light(vec3 position) {
    vec3 shape_color = vec3(0.21176470588235, 0.054901960784313, 0.12156862745098);
    vec3 light_color = vec3(1., 0.788235294117647, 0.5803921568627451);

    // ambient component
    vec3 ambient = light_color * 0.2;

    // diffuse component
    vec3 normal = normalize(vec3(normal_matrix * vec4(v_vertex, 0.)));
    vec3 light_direction = normalize(light_position - position);
    float dot_light = max(dot(normal, light_direction), 0.0);
    vec3 diffuse = shape_color * dot_light;

    // specular component
    float specular_strength = 0.5;
    float spec = 0.;
    if (dot_light > 0.) {
        vec3 view_dir = normalize(-position);
        vec3 reflect_dir = reflect(-light_direction, normal);
        float spec_angle = max(dot(view_dir, reflect_dir), 0.0);
        spec = pow(spec_angle, 32.);
    }
    // vec3 reflect_direction = reflect(-light_direction, normal);
    // float spec = pow(max(dot(light_direction, reflect_direction), 0.0), 32.);
    vec3 specular = specular_strength * spec * light_color;

    return ambient + diffuse + specular;
}

void main() {
    gl_FragColor = vec4(calculate_light(v_vertex_position), 1.0);
}
