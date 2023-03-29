#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

varying vec2 v_background; // background position
varying vec3 v_vertex;
varying vec3 v_vertex_position;
varying vec2 v_tex_coord_uv;

uniform mat4 normal_matrix;
uniform vec3 light_position;
uniform sampler2D u_texture;
uniform float u_background_flag; // use different color for bg

vec3 calculate_light(vec3 position) {
  vec3 shape_color = vec3(0.7, 0.7, 0.7);
  vec3 light_color = vec3(1., 1., 1.);

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
  vec3 specular = specular_strength * spec * light_color;

  return ambient + diffuse + specular;
}

vec4 draw_shape() {
  vec4 light = vec4(calculate_light(v_vertex_position), 1.0);
  vec4 tex = texture2D(u_texture, v_tex_coord_uv);

  return tex * light;
}

vec4 draw_background() {
  vec4 tex = texture2D(u_texture, v_background);
  return tex;
}

void main() {
  if (u_background_flag == 1.) {
    gl_FragColor = draw_background();
  } else {
    gl_FragColor = draw_shape();
  }
}
