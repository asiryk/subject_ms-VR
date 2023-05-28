import { NumericArray, Matrix4, Vector4, Vector3, Vector2 } from "@math.gl/core";

export class Program {
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  public vertices: Vector3[][];

  constructor(
    gl: WebGLRenderingContext,
    vertex: string,
    fragment: string,
  ) {
    this.gl = gl;

    const vShader = this.createShader(this.gl.VERTEX_SHADER, vertex);
    const fShader = this.createShader(this.gl.FRAGMENT_SHADER, fragment);
    this.program = this.createProgram(vShader, fShader);
  }

  public use(useProgram: (prog: WebGLProgram) => void): void {
    useProgram(this.program);
  }

  public setUniform(uniform: string, cpuMem: NumericArray | number): void {
    const gpuMem = this.gl.getUniformLocation(this.program, uniform);
    if (cpuMem instanceof Matrix4) {
      this.gl.uniformMatrix4fv(gpuMem, false, cpuMem);
    } else if (cpuMem instanceof Vector4) {
      this.gl.uniform4fv(gpuMem, cpuMem);
    } else if (cpuMem instanceof Vector3) {
      this.gl.uniform3fv(gpuMem, cpuMem);
    } else if (cpuMem instanceof Vector2) {
      this.gl.uniform2fv(gpuMem, cpuMem);
    } else if (typeof cpuMem === "number") {
      this.gl.uniform1f(gpuMem, cpuMem);
    } else {
      throw new Error("Unsupported type");
    }
  }

  /**
   * this method should be called only once.
   * we are creating the buffer that shares multiple data
   */
  public initBuffer(attribName: string, vertices: Vector3[][], uvsName: string, uvsVec: Vector2[]): void {
    // https://web.archive.org/web/20221105152646/https://webglfundamentals.org/webgl/lessons/webgl-fundamentals.html
    const gl = this.gl;
    this.vertices = vertices;

    const allVertices = vertices.flatMap(v => v).flatMap(v => v);
    const allUvs = uvsVec.flatMap(v => v);
    const cpuBuffer = new Float32Array(allVertices.concat(allUvs));
    const gpuBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gpuBuffer);
    gl.bufferData(this.gl.ARRAY_BUFFER, cpuBuffer, this.gl.STREAM_DRAW);

    const attribute = gl.getAttribLocation(this.program, attribName);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, vertices[0][0].length, this.gl.FLOAT, false, 0, 0);

    const attribute2 = gl.getAttribLocation(this.program, uvsName);
    gl.enableVertexAttribArray(attribute2);
    gl.vertexAttribPointer(attribute2, uvsVec[0].length, this.gl.FLOAT, false, 0, allVertices.length * 4); // 4 = float bytes
  }

  public setTexture(image: HTMLImageElement): void {
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
  }

  private createShader(type: GLenum, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const log = this.gl.getShaderInfoLog(shader);
      const msg = "Error compiling shader: " + log;
      throw new Error(msg);
    }

    return shader;
  }

  private createProgram(
    vertex: WebGLShader,
    fragment: WebGLShader
  ): WebGLProgram {
    const prog = this.gl.createProgram();
    this.gl.attachShader(prog, vertex);
    this.gl.attachShader(prog, fragment);
    this.gl.linkProgram(prog);
    if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) {
      const log = this.gl.getProgramInfoLog(prog);
      const msg = "Link error in program: " + log;
      throw new Error(msg);
    }
    return prog;
  }
}

export class VertexData {
  constructor(
    private readonly array: number[],
    private readonly size: number
  ) {}

  public getData(): number[] {
    return this.array;
  }

  public getSize(): number {
    return this.size;
  }

  public getCount(): number {
    return this.array.length / this.size;
  }
}

export function initCanvas(
  width: number,
  height: number
): {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
} {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("width", width.toString());
  canvas.setAttribute("height", height.toString());
  const gl = canvas.getContext("webgl");

  if (!gl) {
    throw "Browser does not support WebGL";
  }
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  return { canvas, gl };
}
