import fragment from "./fragment.glsl";
import vertex from "./vertex.glsl";
import { TrackballRotator } from "../../../lib/trackball-rotator.js";
import { Matrix4, Vector3, toRadians, Vector2 } from "@math.gl/core";
import { Program, initCanvas } from "../../../lib/webGL";
import { Pane, TpChangeEvent } from "tweakpane";

enum Uniforms {
  ModelViewMatrix = "model_view_matrix",
  ProjectionMatrix = "projection_matrix",
  NormalMatrix = "normal_matrix",
  LightPosition = "light_position",
  TextureScale = "u_texture_scale",
  TexturePivot = "u_texture_center",
  TextureRotAxis = "u_texture_rot_axis",
  TextureRotAngleDeg = "u_texture_rot_angle_deg",
}

enum Attributes {
  Vertices = "a_vertex",
  Uvs = "a_tex_coord_uv",
}

function createVertices(): { vertices: Vector3[]; uvs: Vector2[] } {
  const vertices: Vector3[] = [];
  const uvs: Vector2[] = [];
  const INT_MULT = 10;
  const DEG = 360;
  const H = 1;
  const P = 0.5;
  const zStep = H / 10;
  const bStep = DEG / 72;

  const toVertex = (z: number, b: number) => {
    const x = ((Math.abs(z) - H) ** 2 / (2 * P)) * Math.cos(toRadians(b));
    const y = ((Math.abs(z) - H) ** 2 / (2 * P)) * Math.sin(toRadians(b));
    return new Vector3(x, y, z);
  };

  const toUv = (z: number, b: number) => {
    const u = (z + H) / (2 * H);
    const v = b / DEG;
    return new Vector2(u, v);
  };

  for (let z1 = -H * INT_MULT; z1 < H * INT_MULT; z1 += zStep * INT_MULT) {
    const z = z1 / INT_MULT;

    for (let b = 0; b <= DEG; b += bStep) {
      vertices.push(toVertex(z, b));
      uvs.push(toUv(z, b));

      vertices.push(toVertex(z + zStep, b + bStep));
      uvs.push(toUv(z + zStep, b + bStep));
    }
  }

  return { vertices, uvs };
}

function draw(
  gl: WebGLRenderingContext,
  program: Program<Attributes, Uniforms>,
  surface: Vector3[],
  rotator: TrackballRotator
) {
  program.use(gl.useProgram.bind(gl));
  gl.clearColor(0, 0, 0, 1);
  // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // removes black bg

  drawLeft(gl, program, surface, rotator);
  drawRight(gl, program, surface, rotator);

}

// draw shape for left eye
function drawLeft(
  gl: WebGLRenderingContext,
  program: Program<Attributes, Uniforms>,
  surface: Vector3[],
  rotator: TrackballRotator
) {
  const projection = new Matrix4().ortho({
    left: 1,
    right: -1,
    bottom: 1,
    top: -1,
  });

  const rotatorView = rotator.getViewMatrix();
  const rotateToPointZero = new Matrix4().rotateAxis(
    1.5,
    new Vector3(1, 1, -1)
  );
  const translateToPointZero = new Matrix4().translate(new Vector3(0, 0, -10));
  const matAccum0 = rotateToPointZero.multiplyRight(rotatorView);
  const modelView = translateToPointZero.multiplyRight(matAccum0);

  // create normal matrix from modelView matrix
  const normalMatrix = new Matrix4().copy(modelView).invert().transpose();

  program.setUniform(Uniforms.ModelViewMatrix, modelView);
  program.setUniform(Uniforms.ProjectionMatrix, projection);
  program.setUniform(Uniforms.NormalMatrix, normalMatrix);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, surface.length);

}

// draw shape for right eye
function drawRight(
  gl: WebGLRenderingContext,
  program: Program<Attributes, Uniforms>,
  surface: Vector3[],
  rotator: TrackballRotator
) {
  const projection = new Matrix4().ortho({
    left: 1,
    right: -1,
    bottom: 1,
    top: -1,
  });

  const rotatorView = rotator.getViewMatrix();
  const rotateToPointZero = new Matrix4().rotateAxis(
    1.5,
    new Vector3(1, 1, -1)
  );
  const translateToPointZero = new Matrix4().translate(new Vector3(0, 0, -10));
  const matAccum0 = rotateToPointZero.multiplyRight(rotatorView);
  const modelView = translateToPointZero.multiplyRight(matAccum0);

  // create normal matrix from modelView matrix
  const normalMatrix = new Matrix4().copy(modelView).invert().transpose();

  program.setUniform(Uniforms.ModelViewMatrix, modelView);
  program.setUniform(Uniforms.ProjectionMatrix, projection);
  program.setUniform(Uniforms.NormalMatrix, normalMatrix);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, surface.length);
}


function initTweakpane() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pane = new Pane() as any;

  const PARAMS = {
    light: { x: 0, y: 0, z: 0 },
    texScale: { x: 0, y: 0 },
    texRotAxis: { x: 0, y: 0 },
    texRotAngle: 0,
  };

  pane.addInput(PARAMS, "light", {});
  pane.addInput(PARAMS, "texScale", {
    x: { step: 0.1, min: 1 },
    y: { step: 0.1, min: 1 },
  });

  pane.addInput(PARAMS, "texRotAxis", {
    x: { step: 0.1 },
    y: { step: 0.1 },
  });

  pane.addInput(PARAMS, "texRotAngle", {
    step: 1,
    min: -360,
    max: 360,
  });

  return pane;
}

function loadImage(): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.src = "/subject_ms-VR/texture1024x1024.jpg";
    image.onerror = (e) => reject(e);
    image.onload = () => {
      resolve(image);
    };
  });
}

export function init(attachRoot: HTMLElement) {
  try {
    const size = Math.min(600, window.innerWidth - 50);
    const { gl, canvas } = initCanvas(size, size);
    const program = new Program(
      gl,
      vertex,
      fragment,
      Object.values(Attributes),
      Object.values(Uniforms)
    );
    const { vertices: surface, uvs } = createVertices();
    program.setAttribute(
      Attributes.Vertices,
      surface.flatMap((v) => v),
      surface[0].length
    );
    program.setAttribute(
      Attributes.Uvs,
      uvs.flatMap((v) => v),
      uvs[0].length
    );
    const rotator = new TrackballRotator(canvas, null, 0);
    rotator.setCallback(() => draw(gl, program, surface, rotator));
    draw(gl, program, surface, rotator);

    const pane = initTweakpane();
    program.setUniform(Uniforms.TextureScale, new Vector2(1, 1));
    program.setUniform(Uniforms.LightPosition, new Vector3(0, 0, 0));
    program.setUniform(Uniforms.TextureRotAxis, new Vector2(0, 0));
    program.setUniform(Uniforms.TextureRotAngleDeg, 0);
    draw(gl, program, surface, rotator);
    pane.on("change", (e: TpChangeEvent) => {
      if (e.presetKey === "light") {
        const { x, y, z } = e.value;
        const position = new Vector3(x, y, z);
        program.setUniform(Uniforms.LightPosition, position);
      }

      if (e.presetKey === "texScale") {
        const { x, y } = e.value;
        const scale = new Vector2(x, y);
        program.setUniform(Uniforms.TextureScale, scale);
      }

      if (e.presetKey === "texRotAxis") {
        const { x, y } = e.value;
        const axis = new Vector2(x, y);
        program.setUniform(Uniforms.TextureRotAxis, axis);
      }

      if (e.presetKey === "texRotAngle") {
        const deg = e.value;
        program.setUniform(Uniforms.TextureRotAngleDeg, deg);
      }

      draw(gl, program, surface, rotator);
    });

    loadImage().then((image) => {
      program.setTexture(image);
      draw(gl, program, surface, rotator);
    });
    attachRoot.appendChild(canvas);
  } catch (e) {
    console.error(e);
    return alert(e);
  }
}
