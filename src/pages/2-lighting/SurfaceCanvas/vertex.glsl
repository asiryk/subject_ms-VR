attribute vec3 vertex;

uniform mat4 model_view_matrix;
uniform mat4 projection_matrix;

varying vec3 v_vertex;
varying vec3 v_vertex_position;

void main() {
    mat4 transformation_matrix = projection_matrix * model_view_matrix;
    vec4 position = transformation_matrix * vec4(vertex, 1.0);

    v_vertex = vertex;
    v_vertex_position = vec3(position) / position.w;

    gl_Position = position;
}
