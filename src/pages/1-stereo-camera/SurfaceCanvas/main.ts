import fragment from "./fragment.glsl";
import vertex from "./vertex.glsl";
import { TrackballRotator } from "../../../lib/trackball-rotator.js";
import { Matrix4, Vector3, toRadians, Vector2, radians } from "@math.gl/core";
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
  DrawingSphere = "u_sphere_draw",
}

enum Attributes {
  SphereVertices = "a_sphere_vertex",
  Vertices = "a_vertex",
  Uvs = "a_tex_coord_uv",
}

class Camera {
  constructor(
    public eyeSeparation: number,
    public convergence: number,
    public fov: number,
    public near: number,
    public far: number,
  ) {}
}

function createVertices(): { vertices: Vector3[]; uvs: Vector2[] } {
  const vertices: Vector3[] = [];
  const uvs: Vector2[] = [];
  const INT_MULT = 10; // multiplier to avoid float precision
  const DEG = 360;
  const H = 1;
  const P = 0.5;
  const zStep = H / 10; // 10 steps for H to draw
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

function createSphere(): { vertices: Vector3[]; uvs: Vector2[] } {
  const topOffset = 1.2;
  const radius = 0.15;
  const slices = 16;
  const stacks = 16;
  const vertices = [];
  const uvs = [];

  for(let stackNumber = 0; stackNumber <= stacks; stackNumber++) {
    const theta = stackNumber * Math.PI / stacks;
    const nextTheta = (stackNumber + 1) * Math.PI / stacks;

    for(let sliceNumber = 0; sliceNumber <= slices; sliceNumber++) {
      const phi = sliceNumber * 2 * Math.PI / slices;
      const nextPhi = (sliceNumber + 1) * 2 * Math.PI / slices;

      // Vertices for current slice
      const x1 = radius * Math.sin(theta) * Math.cos(phi);
      const y1 = radius * Math.cos(theta);
      const z1 = radius * Math.sin(theta) * Math.sin(phi);
      const u1 = sliceNumber / slices;
      const v1 = stackNumber / stacks;

      // Vertices for next slice
      const x2 = radius * Math.sin(nextTheta) * Math.cos(nextPhi);
      const y2 = radius * Math.cos(nextTheta);
      const z2 = radius * Math.sin(nextTheta) * Math.sin(nextPhi);
      const u2 = (sliceNumber + 1) / slices;
      const v2 = (stackNumber + 1) / stacks;

      vertices.push(new Vector3(x1, y1 + topOffset, z1));
      vertices.push(new Vector3(x2, y2 + topOffset, z2));
      uvs.push(new Vector2(u1, v1));
      uvs.push(new Vector2(u2, v2));
    }
  }

  return { vertices, uvs };
}

function draw(
  gl: WebGLRenderingContext,
  program: Program,
  rotator: TrackballRotator,
  camera: Camera,
  rotationMatrix: Matrix4
) {
  program.use(gl.useProgram.bind(gl));
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.DEPTH_BUFFER_BIT); // removes black bg
  drawLeft(gl, program, rotator, camera, rotationMatrix);
}

function leftFrustum(
  aspectRatio: number,
  eyeSeparation: number, // eye separation parameter
  convergence: number, // convergence distance
  fov: number, // field of view
  near: number, // near clipping distance
  far = Infinity, // far of the frustum
) {
  const top = near * Math.tan(fov / 2);
  const bottom = -top;

  const a = aspectRatio * Math.tan(fov / 2) * convergence;
  const b = a - eyeSeparation / 2;
  const c = a + eyeSeparation / 2;

  const left = -b * near / convergence;
  const right = c * near / convergence;

  return new Matrix4().frustum({
    top,
    right,
    bottom,
    left,
    near,
    far,
  });
}

// draw shape for left eye
function drawLeft(
  gl: WebGLRenderingContext,
  program: Program,
  rotator: TrackballRotator,
  camera: Camera,
  sensorRotation: Matrix4,
) {

  const aspectRatio = gl.canvas.width / gl.canvas.height;
  const {eyeSeparation, convergence, fov, near, far} = camera;

  const projection = leftFrustum(aspectRatio, eyeSeparation, convergence, fov, near, far);

  const rotatorView = rotator.getViewMatrix();
  const rotateToPointZero = new Matrix4().rotateAxis(
    1.5,
    new Vector3(1, 1, -1)
  );
                                  
  //          Y |                    
  //            |                    
  //            |   /                
  //            |  /                 
  //            | /                  
  //            |/                   
  //------------/--------------------
  //           /|                   X
  //          / |                    
  //         /  |                    
  //        /   |                    
  //       /    |                    
  //      /                          
  //     /  Z                        
  // shift by -20 because Z-axis looking at us

  const translateToPointZero = new Matrix4().translate(new Vector3(0, 0, -20));
  const moveLeftEye = new Matrix4().translate(new Vector3(-eyeSeparation / 2, 0, 0));
  const translate = translateToPointZero.multiplyRight(moveLeftEye);
  const rotate = rotateToPointZero.multiplyRight(rotatorView).multiplyRight(sensorRotation);
  const modelView = translate.multiplyRight(rotate);

  // create normal matrix from modelView matrix
  const normalMatrix = new Matrix4().copy(modelView).invert().transpose();

  program.setUniform(Uniforms.ModelViewMatrix, modelView);
  program.setUniform(Uniforms.ProjectionMatrix, projection);
  program.setUniform(Uniforms.NormalMatrix, normalMatrix);

  for (let i = 0, offset = 0; i < program.vertices.length; i++) {
    const surface = program.vertices[i];
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, surface.length);
    offset += surface.length;
  }
}

function initTweakpane() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.style.position = "absolute";
  container.style.top = "8px";
  container.style.left = "8px";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pane = new Pane({ container }) as any;
  const PARAMS = {
    light: { x: 1, y: 1, z: 10 },
    texScale: { x: 0, y: 0 },
    texRotAxis: { x: 0, y: 0 },
    texRotAngle: 0,
    cEyeSeparation: 0.004,
    cConvergence: 1,
    cFov: 15,
    cNear: 0.001,
  };

  pane.addInput(PARAMS, "light", {});

  const fTexture = pane.addFolder({
    title: "texture",
    expanded: false,
  });

  fTexture.addInput(PARAMS, "texScale", {
    x: { step: 0.1, min: 1 },
    y: { step: 0.1, min: 1 },
  });

  fTexture.addInput(PARAMS, "texRotAxis", {
    x: { step: 0.1 },
    y: { step: 0.1 },
  });

  fTexture.addInput(PARAMS, "texRotAngle", {
    step: 1,
    min: -360,
    max: 360,
  });

  const fStereo = pane.addFolder({
    title: "stereo camera",
    expanded: false,
  })

  fStereo.addInput(PARAMS, "cEyeSeparation", {
    step: 0.001,
    min: 0.001,
    max: 0.01,
  });

  fStereo.addInput(PARAMS, "cConvergence", {
    min: 0,
    max: 10,
  });
  fStereo.addInput(PARAMS, "cFov", {
    min: 0,
    max: 90,
  });
  fStereo.addInput(PARAMS, "cNear", {
    min: 0.001,
    max: 22,
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

async function initAudio() {
  const audioContext = new AudioContext();
  const decodedAudioData = await fetch("/subject_ms-VR/sound.mp3")
    .then(response => response.arrayBuffer())
    .then(audioData => audioContext.decodeAudioData(audioData));
  const source = audioContext.createBufferSource();
  source.buffer = decodedAudioData;
  source.connect(audioContext.destination);
  source.start();

  while(audioContext.state === "suspended") {
    await new Promise(resolve => window.setTimeout(resolve, 2000));
    audioContext.resume();
  }

  const mainVolume = audioContext.createGain();
  const panner = audioContext.createPanner();
  const volume = audioContext.createGain();
  volume.connect(panner);

  window.audioPosition = () => {
    console.log(`${panner.positionX.value};${panner.positionY.value};${panner.positionZ.value}`);
  }

  window.audioPositionSet = (x: number, y: number, z: number) => {
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
  }
}

export function init(attachRoot: HTMLElement) {
  try {
    const size = Math.min(600, window.innerWidth - 50);
    const { gl, canvas } = initCanvas(size, size);

    const program = new Program(gl, vertex, fragment);
    const { vertices: surface, uvs } = createVertices();
    const {vertices: sphere, uvs: uvsSphere } = createSphere();
    program.initBuffer(Attributes.Vertices, [surface, sphere], Attributes.Uvs, uvs.concat(uvsSphere));

    const eyeSeparation = 0.004;
    const convergence = 1;
    const fov = radians(15);
    const near = 0.001;
    const far = 30;
    const pane = initTweakpane();
    const camera = new Camera(eyeSeparation, convergence, fov, near, far);

    const rotator = new TrackballRotator(canvas, null, 0);
    const dummyRotation = new Matrix4().identity();

    rotator.setCallback(() => draw(gl, program, rotator, camera, dummyRotation));
    draw(gl, program, rotator, camera, dummyRotation);

    program.setUniform(Uniforms.TextureScale, new Vector2(1, 1));
    program.setUniform(Uniforms.LightPosition, new Vector3(1, 1, 10));
    program.setUniform(Uniforms.TextureRotAxis, new Vector2(0, 0));
    program.setUniform(Uniforms.TextureRotAngleDeg, 0);
    draw(gl, program, rotator, camera, dummyRotation);
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

      if (e.presetKey === "cEyeSeparation") {
        camera.eyeSeparation = e.value;
      }

      if (e.presetKey === "cConvergence") {
        camera.convergence = e.value;
      }

      if (e.presetKey === "cFov") {
        camera.fov = radians(e.value);
      }

      if (e.presetKey === "cNear") {
        camera.near = e.value;
      }

      draw(gl, program, rotator, camera, dummyRotation);
    });

    loadImage().then((image) => {
      program.setTexture(image);
      draw(gl, program, rotator, camera, dummyRotation);
    });

    // init magnetometer
    if ("Magnetometer" in window) {
      const magSensor = new Magnetometer({ frequency: 60 });
      magSensor.addEventListener("reading", (e) => {
        const sensor = e.target;
        const rotationX = Math.atan2(sensor.y, sensor.z);  // Calculate rotation around X axis
        const rotationY = Math.atan2(sensor.x, sensor.z);  // Calculate rotation around Y axis
        const rotationZ = Math.atan2(sensor.y, sensor.x);  // Calculate rotation around Z axis

        console.log(`${rotationY};${rotationY};${rotationZ}`)

        const rotationMatrix = new Matrix4()
        .rotateX(rotationX)
        .rotateY(rotationY)
        .rotateZ(rotationZ);

        draw(gl, program, rotator, camera, rotationMatrix);
      });
      magSensor.start();

    } else {
      console.error("Magnetometer API is not supported");
    }
    attachRoot.appendChild(canvas);



    initAudio()
      .then(console.log);



  } catch (e) {
    console.error(e);
    return alert(e);
  }

}
