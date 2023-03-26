attribute vec2 a_background;
attribute vec3 a_vertex;
attribute vec2 a_tex_coord_uv;

uniform mat4 model_view_matrix;
uniform mat4 projection_matrix;

uniform vec2 u_texture_scale;
uniform vec2 u_texture_center; // scaling and rotation center
uniform vec2 u_texture_rot_axis; // rotation axis
uniform float u_texture_rot_angle_deg; // rotation angle in degrees
uniform float u_background_flag; // use different vertices to render bg

varying vec2 v_background; // background position
varying vec3 v_vertex; // raw vertex position
varying vec3 v_vertex_position; // vertex position in camera space
varying vec2 v_tex_coord_uv; // texture coordinate

// region lib
mat4 identity4() {
  return mat4(
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 scale(mat4 m, vec3 v) {
  return m * mat4(
    vec4(v.x, 0.0, 0.0, 0.0),
    vec4(0.0, v.y, 0.0, 0.0),
    vec4(0.0, 0.0, v.z, 0.0),
    vec4(0.0, 0.0, 0.0, 1.0)
  );
}

mat4 translate(mat4 m, vec3 v) {
  return m * mat4(
    vec4(1.0, 0.0, 0.0, v.x),
    vec4(0.0, 1.0, 0.0, v.y),
    vec4(0.0, 0.0, 1.0, v.z),
    vec4(0.0, 0.0, 0.0, 1.0)
  );
}

mat4 rotate(mat4 m, vec3 axis, float angle) {
  // Normalize the axis vector
  axis = normalize(axis);

  // Convert the angle to radians
  float radians = radians(angle);

  // Calculate the sine and cosine of the angle
  float c = cos(radians / 2.0);
  float s = sin(radians / 2.0);

  // Create a quaternion from the axis and angle
  vec4 q = vec4(s * axis, c);

  // Convert the quaternion to a rotation matrix
  return m * mat4(
    1.0 - 2.0 * q.y * q.y - 2.0 * q.z * q.z,
    2.0 * q.x * q.y - 2.0 * q.z * q.w,
    2.0 * q.x * q.z + 2.0 * q.y * q.w,
    0.0,
    2.0 * q.x * q.y + 2.0 * q.z * q.w,
    1.0 - 2.0 * q.x * q.x - 2.0 * q.z * q.z,
    2.0 * q.y * q.z - 2.0 * q.x * q.w,
    0.0,
    2.0 * q.x * q.z - 2.0 * q.y * q.w,
    2.0 * q.y * q.z + 2.0 * q.x * q.w,
    1.0 - 2.0 * q.x * q.x - 2.0 * q.y * q.y,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0
  );
}
// endregion

vec2 scale_around_pivot(vec2 point, vec2 pivot, vec2 scale_xy) {
  mat4 tr = translate(identity4(), vec3(pivot, 0.0));
  mat4 sc = scale(tr, vec3(scale_xy, 0.0));
  mat4 trb = translate(sc, vec3(-pivot, 0.0));
  return vec2(trb * vec4(point, 0.0, 0.0));
}

vec2 rotate_around_pivot(vec2 point, vec2 pivot, vec2 axis, float angle_deg) {
  mat4 tr = translate(identity4(), vec3(pivot, 0.0));
  mat4 rt = rotate(tr, vec3(axis, 1.0), angle_deg);
  mat4 trb = translate(rt, vec3(-pivot, 0.0));
  return vec2(trb * vec4(point, 0.0, 0.0));
}

vec4 draw_shape() {
  mat4 transformation_matrix = projection_matrix * model_view_matrix;
  vec4 position = transformation_matrix * vec4(a_vertex, 1.0);

  v_vertex = a_vertex;
  v_vertex_position = vec3(position) / position.w;

  vec2 tex_scaled = scale_around_pivot(
      a_tex_coord_uv,
      u_texture_center,
      u_texture_scale
    );

  vec2 tex_rotated = rotate_around_pivot(
      tex_scaled,
      u_texture_center,
      u_texture_rot_axis,
      u_texture_rot_angle_deg
    );

  v_tex_coord_uv = tex_rotated;

  return position;
}

vec4 draw_background() {
  v_background = a_background;
  vec4 position = vec4(a_background.x, a_background.y, 0., 1.);
  return position;
}

void main() {
  if (u_background_flag == 1.0) {
    gl_Position = draw_background();
  } else {
    gl_Position = draw_shape();
  }
}
