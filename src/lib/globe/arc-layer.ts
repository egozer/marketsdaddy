import * as THREE from "three";

export interface ArcRenderDatum {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: THREE.Color;
  thickness: number;
  pulse: number;
  opacity: number;
  elevation: number;
}

const buildBaseStripGeometry = (segments: number): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const tValues: number[] = [];
  const sideValues: number[] = [];

  for (let i = 0; i < segments; i += 1) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;

    const vertices: Array<[number, number]> = [
      [t0, -1],
      [t0, 1],
      [t1, -1],
      [t0, 1],
      [t1, 1],
      [t1, -1]
    ];

    for (const [t, side] of vertices) {
      positions.push(0, 0, 0);
      tValues.push(t);
      sideValues.push(side);
    }
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aT", new THREE.Float32BufferAttribute(tValues, 1));
  geometry.setAttribute("aSide", new THREE.Float32BufferAttribute(sideValues, 1));

  return geometry;
};

export class ArcLayer {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;

  private readonly geometry: THREE.InstancedBufferGeometry;

  private readonly material: THREE.ShaderMaterial;

  private readonly starts: Float32Array;

  private readonly ends: Float32Array;

  private readonly colors: Float32Array;

  private readonly thicknesses: Float32Array;

  private readonly pulses: Float32Array;

  private readonly opacities: Float32Array;

  private readonly elevations: Float32Array;

  constructor(private readonly maxArcs: number, radius: number) {
    const baseGeometry = buildBaseStripGeometry(48);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute("position", baseGeometry.getAttribute("position"));
    geometry.setAttribute("aT", baseGeometry.getAttribute("aT"));
    geometry.setAttribute("aSide", baseGeometry.getAttribute("aSide"));

    this.starts = new Float32Array(maxArcs * 3);
    this.ends = new Float32Array(maxArcs * 3);
    this.colors = new Float32Array(maxArcs * 3);
    this.thicknesses = new Float32Array(maxArcs);
    this.pulses = new Float32Array(maxArcs);
    this.opacities = new Float32Array(maxArcs);
    this.elevations = new Float32Array(maxArcs);

    geometry.setAttribute("instanceStart", new THREE.InstancedBufferAttribute(this.starts, 3));
    geometry.setAttribute("instanceEnd", new THREE.InstancedBufferAttribute(this.ends, 3));
    geometry.setAttribute("instanceColor", new THREE.InstancedBufferAttribute(this.colors, 3));
    geometry.setAttribute("instanceThickness", new THREE.InstancedBufferAttribute(this.thicknesses, 1));
    geometry.setAttribute("instancePulse", new THREE.InstancedBufferAttribute(this.pulses, 1));
    geometry.setAttribute("instanceOpacity", new THREE.InstancedBufferAttribute(this.opacities, 1));
    geometry.setAttribute("instanceElevation", new THREE.InstancedBufferAttribute(this.elevations, 1));
    geometry.instanceCount = 0;

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: radius }
      },
      vertexShader: `
        attribute float aT;
        attribute float aSide;
        attribute vec3 instanceStart;
        attribute vec3 instanceEnd;
        attribute vec3 instanceColor;
        attribute float instanceThickness;
        attribute float instancePulse;
        attribute float instanceOpacity;
        attribute float instanceElevation;

        uniform float uTime;
        uniform float uRadius;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vT;

        vec3 bezier(vec3 p0, vec3 p1, vec3 p2, float t) {
          float s = 1.0 - t;
          return s * s * p0 + 2.0 * s * t * p1 + t * t * p2;
        }

        void main() {
          vec3 p0 = normalize(instanceStart) * uRadius;
          vec3 p2 = normalize(instanceEnd) * uRadius;
          vec3 controlDirection = normalize(p0 + p2);
          vec3 p1 = controlDirection * (uRadius + instanceElevation);

          vec3 point = bezier(p0, p1, p2, aT);
          vec3 nextPoint = bezier(p0, p1, p2, min(1.0, aT + 0.01));

          vec3 tangent = normalize(nextPoint - point);
          vec3 toCam = normalize(cameraPosition - point);
          vec3 normal = normalize(cross(tangent, toCam));

          float pulse = 1.0 + instancePulse * 0.35 * sin(uTime * 5.0 + aT * 12.0);
          vec3 worldPosition = point + normal * aSide * instanceThickness * pulse;

          float fadeHead = smoothstep(0.0, 0.08, aT);
          float fadeTail = smoothstep(1.0, 0.85, aT);
          float particle = 0.72 + 0.28 * sin((uTime * 3.0) - (aT * 36.0));
          vAlpha = instanceOpacity * fadeHead * fadeTail * particle;
          vColor = instanceColor;
          vT = aT;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vT;

        void main() {
          vec3 headTint = mix(vColor, vec3(1.0), 0.25);
          vec3 gradient = mix(vColor, headTint, smoothstep(0.4, 1.0, vT));
          gl_FragColor = vec4(gradient, vAlpha);
        }
      `
    });

    this.geometry = geometry;
    this.material = material;
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
  }

  updateArcs(data: ArcRenderDatum[]): void {
    const count = Math.min(this.maxArcs, data.length);

    for (let i = 0; i < count; i += 1) {
      const entry = data[i];
      const offset3 = i * 3;
      this.starts[offset3] = entry.start.x;
      this.starts[offset3 + 1] = entry.start.y;
      this.starts[offset3 + 2] = entry.start.z;

      this.ends[offset3] = entry.end.x;
      this.ends[offset3 + 1] = entry.end.y;
      this.ends[offset3 + 2] = entry.end.z;

      this.colors[offset3] = entry.color.r;
      this.colors[offset3 + 1] = entry.color.g;
      this.colors[offset3 + 2] = entry.color.b;

      this.thicknesses[i] = entry.thickness;
      this.pulses[i] = entry.pulse;
      this.opacities[i] = entry.opacity;
      this.elevations[i] = entry.elevation;
    }

    this.geometry.instanceCount = count;

    const startAttr = this.geometry.getAttribute("instanceStart") as THREE.InstancedBufferAttribute;
    const endAttr = this.geometry.getAttribute("instanceEnd") as THREE.InstancedBufferAttribute;
    const colorAttr = this.geometry.getAttribute("instanceColor") as THREE.InstancedBufferAttribute;
    const thicknessAttr = this.geometry.getAttribute(
      "instanceThickness"
    ) as THREE.InstancedBufferAttribute;
    const pulseAttr = this.geometry.getAttribute("instancePulse") as THREE.InstancedBufferAttribute;
    const opacityAttr = this.geometry.getAttribute("instanceOpacity") as THREE.InstancedBufferAttribute;
    const elevationAttr = this.geometry.getAttribute(
      "instanceElevation"
    ) as THREE.InstancedBufferAttribute;

    startAttr.needsUpdate = true;
    endAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    thicknessAttr.needsUpdate = true;
    pulseAttr.needsUpdate = true;
    opacityAttr.needsUpdate = true;
    elevationAttr.needsUpdate = true;
  }

  setTime(timeSeconds: number): void {
    this.material.uniforms.uTime.value = timeSeconds;
  }

  setStressFactor(factor: number): void {
    this.mesh.material.opacity = 0.8 + factor * 0.2;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
