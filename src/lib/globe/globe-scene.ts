import * as THREE from "three";

import { ArcLayer, type ArcRenderDatum } from "@/lib/globe/arc-layer";

const GLOBE_RADIUS = 1;

export interface GlobeMarkerDatum {
  currency: string;
  position: THREE.Vector3;
  color: THREE.Color;
  size: number;
}

export class GlobeScene {
  private readonly renderer: THREE.WebGLRenderer;

  private readonly scene: THREE.Scene;

  private readonly camera: THREE.PerspectiveCamera;

  private readonly globe: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;

  private readonly atmosphere: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;

  private readonly globeGrid: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;

  private readonly arcLayer: ArcLayer;

  private readonly originMarker: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;

  private readonly markerGroup = new THREE.Group();

  private readonly markerMap = new Map<string, THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>>();

  private readonly raycaster = new THREE.Raycaster();

  private readonly pointer = new THREE.Vector2();

  private reducedMotion = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#040b17");

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0.2, 3.5);

    const ambient = new THREE.AmbientLight("#6ab9ff", 0.35);
    const directional = new THREE.DirectionalLight("#b9ddff", 1.1);
    directional.position.set(4, 2, 3);
    this.scene.add(ambient, directional);

    const globeMaterial = new THREE.MeshStandardMaterial({
      color: "#316389",
      roughness: 0.72,
      metalness: 0.08
    });

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg",
      (texture) => {
        texture.anisotropy = 4;
        globeMaterial.map = texture;
        globeMaterial.needsUpdate = true;
      },
      undefined,
      () => {
        globeMaterial.color = new THREE.Color("#2d698f");
      }
    );

    this.globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 72, 72), globeMaterial);

    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.03, 72, 72),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uIntensity: { value: 0.25 },
          uColor: { value: new THREE.Color("#3bc9ff") }
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uIntensity;
          uniform vec3 uColor;
          varying vec3 vNormal;
          void main() {
            float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
            gl_FragColor = vec4(uColor, fresnel * uIntensity);
          }
        `
      })
    );

    this.globeGrid = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.002, 36, 36),
      new THREE.MeshBasicMaterial({
        color: "#3a5f88",
        wireframe: true,
        transparent: true,
        opacity: 0.13
      })
    );

    this.arcLayer = new ArcLayer(64, GLOBE_RADIUS);
    this.originMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 12, 12),
      new THREE.MeshBasicMaterial({ color: "#ffe173" })
    );
    this.originMarker.position.set(-0.17, 0.62, 0.77);

    this.scene.add(this.globe);
    this.scene.add(this.atmosphere);
    this.scene.add(this.globeGrid);
    this.scene.add(this.arcLayer.mesh);
    this.scene.add(this.markerGroup);
    this.scene.add(this.originMarker);

    this.resize();
  }

  resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  setArcs(arcs: ArcRenderDatum[]): void {
    this.arcLayer.updateArcs(arcs);
  }

  setMarkers(markers: GlobeMarkerDatum[]): void {
    const active = new Set<string>();

    for (const marker of markers) {
      active.add(marker.currency);
      let mesh = this.markerMap.get(marker.currency);

      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.012, 10, 10),
          new THREE.MeshBasicMaterial({ color: marker.color })
        );
        mesh.userData.currency = marker.currency;
        this.markerMap.set(marker.currency, mesh);
        this.markerGroup.add(mesh);
      }

      mesh.position.copy(marker.position);
      mesh.material.color.copy(marker.color);
      mesh.scale.setScalar(Math.max(0.85, marker.size));
      mesh.visible = true;
    }

    for (const [currency, mesh] of this.markerMap.entries()) {
      if (!active.has(currency)) {
        mesh.visible = false;
      }
    }
  }

  pickCurrency(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.markerGroup.children, false);

    if (hits.length === 0) {
      return null;
    }

    const currency = hits[0].object.userData.currency;
    return typeof currency === "string" ? currency : null;
  }

  setStress(score: number): void {
    const normalized = THREE.MathUtils.clamp(score / 100, 0, 1);
    this.arcLayer.setStressFactor(normalized);

    this.atmosphere.material.uniforms.uIntensity.value = 0.2 + normalized * 0.35;
    this.atmosphere.material.uniforms.uColor.value = new THREE.Color(
      normalized < 0.35 ? "#3bc9ff" : normalized < 0.7 ? "#ffd166" : "#ff6b6b"
    );
  }

  render(timeMs: number): void {
    const time = timeMs * 0.001;

    if (!this.reducedMotion) {
      this.globe.rotation.y += 0.0009;
      this.atmosphere.rotation.y += 0.0007;
      this.globeGrid.rotation.y += 0.0006;
    }
    this.arcLayer.setTime(time);

    this.renderer.render(this.scene, this.camera);
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  dispose(): void {
    this.arcLayer.dispose();
    this.globe.geometry.dispose();
    this.globe.material.dispose();
    this.globeGrid.geometry.dispose();
    this.globeGrid.material.dispose();
    this.atmosphere.geometry.dispose();
    this.atmosphere.material.dispose();
    for (const mesh of this.markerMap.values()) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.originMarker.geometry.dispose();
    this.originMarker.material.dispose();
    this.renderer.dispose();
  }
}
