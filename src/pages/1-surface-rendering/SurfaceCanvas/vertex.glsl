attribute vec3 vertex;
uniform mat4 projection_matrix;

void main() {
    gl_Position = projection_matrix * vec4(vertex, 1.0);
}
