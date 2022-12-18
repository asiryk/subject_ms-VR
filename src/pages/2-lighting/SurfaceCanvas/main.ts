import fragment from "./fragment.glsl";
import vertex from "./vertex.glsl";
import { TrackballRotator } from "../../../lib/trackball-rotator.js";
import { Matrix4, Vector3, toRadians } from "@math.gl/core";
import { Program, initCanvas } from "../../../lib/webGL";
import { Pane, TpChangeEvent } from "tweakpane";

enum Uniforms {
  ModelViewMatrix = "model_view_matrix",
  ProjectionMatrix = "projection_matrix",
  NormalMatrix = "normal_matrix",
  LightPosition = "light_position",
}

enum Attributes {
  Vertices = "vertex",
}

function createVertices(): Vector3[] {
  const vertices: Vector3[] = [];
  const INT_MULT = 10;
  const DEG = 360;
  const H = 1;
  const P = 0.5;
  const zStep = H / 10;
  const bStep = DEG / 72;

  for (let z1 = -H * INT_MULT; z1 < H * INT_MULT; z1 += zStep * INT_MULT) {
    const z = z1 / INT_MULT;

    for (let b = 0; b <= DEG; b += bStep) {
      const x = ((Math.abs(z) - H) ** 2 / (2 * P)) * Math.cos(toRadians(b));
      const y = ((Math.abs(z) - H) ** 2 / (2 * P)) * Math.sin(toRadians(b));
      vertices.push(new Vector3(x, y, z));

      const x1 =
        ((Math.abs(z + zStep) - H) ** 2 / (2 * P)) *
        Math.cos(toRadians(b + bStep));

      const y1 =
        ((Math.abs(z + zStep) - H) ** 2 / (2 * P)) *
        Math.sin(toRadians(b + bStep));
      vertices.push(new Vector3(x1, y1, z + zStep));
    }
  }

  return vertices;
}

function draw(
  gl: WebGLRenderingContext,
  program: Program<Attributes, Uniforms>,
  surface: Vector3[],
  rotator: TrackballRotator
) {
  program.use(gl.useProgram.bind(gl));
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // removes black bg

  const projection = new Matrix4().ortho({
    left: 1,
    right: -1,
    bottom: 1,
    top: -1,
  });

  const rotatorView = rotator.getViewMatrix();
  const rotateToPointZero = new Matrix4().rotateAxis(
    0.7,
    new Vector3(0, 0, 0) // POV from top
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
  };

  pane.addInput(PARAMS, "light", { step: 0.1 });

  return pane;
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
    const surface = createVertices();
    program.setAttribute(
      Attributes.Vertices,
      surface.flatMap((v) => v),
      surface[0].length
    );
    const rotator = new TrackballRotator(canvas, null, 0);
    rotator.setCallback(() => draw(gl, program, surface, rotator));
    draw(gl, program, surface, rotator);

    const pane = initTweakpane();
    pane.on("change", (e: TpChangeEvent) => {
      if (e.presetKey === "light") {
        const { x, y, z } = e.value;
        const position = new Vector3(x, y, z);
        program.setUniform(Uniforms.LightPosition, position);
        draw(gl, program, surface, rotator);
      }
    });

    attachRoot.appendChild(canvas);
  } catch (e) {
    return alert(e);
  }
}
