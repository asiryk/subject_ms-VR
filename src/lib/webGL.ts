import { NumericArray, Matrix4, Vector4, Vector3 } from "@math.gl/core";

export class Program<A extends string, U extends string> {
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly attributes: Map<A, GLint>;
  private readonly uniforms: Map<U, WebGLUniformLocation>;

  constructor(
    gl: WebGLRenderingContext,
    vertex: string,
    fragment: string,
    attributes: A[],
    uniforms: U[]
  ) {
    this.gl = gl;
    this.uniforms = new Map();

    const vShader = this.createShader(this.gl.VERTEX_SHADER, vertex);
    const fShader = this.createShader(this.gl.FRAGMENT_SHADER, fragment);
    this.program = this.createProgram(vShader, fShader);

    // Look up attribute locations (gpu memory)
    this.attributes = new Map(
      attributes.map((attr) => [
        attr,
        this.gl.getAttribLocation(this.program, attr),
      ])
    );

    // Look up uniform locations (gpu memory)
    this.uniforms = new Map(
      uniforms.map((uniform) => [
        uniform,
        this.gl.getUniformLocation(this.program, uniform),
      ])
    );
  }

  public use(useProgram: (prog: WebGLProgram) => void): void {
    useProgram(this.program);
  }

  public setUniform(uniform: U, cpuMem: NumericArray): void {
    const gpuMem = this.uniforms.get(uniform);
    if (cpuMem instanceof Matrix4) {
      this.gl.uniformMatrix4fv(gpuMem, false, cpuMem);
    } else if (cpuMem instanceof Vector4) {
      this.gl.uniform4fv(gpuMem, cpuMem);
    } else if (cpuMem instanceof Vector3) {
      this.gl.uniform3fv(gpuMem, cpuMem);
    } else {
      throw new Error("Unsupported type");
    }
  }

  public setAttribute(attrubute: A, cpuMem: NumericArray, size: number): void {
    // https://web.archive.org/web/20221105152646/https://webglfundamentals.org/webgl/lessons/webgl-fundamentals.html
    const type = this.gl.FLOAT;
    const cpuMemBuf = new Float32Array(cpuMem);
    const gpuMem = this.attributes.get(attrubute);
    const gpuBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, gpuBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, cpuMemBuf, this.gl.STREAM_DRAW);
    this.gl.enableVertexAttribArray(gpuMem);
    this.gl.vertexAttribPointer(gpuMem, size, type, false, 0, 0);
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
