import * as THREE from "three";

const degToRad = (degrees: number): number => (degrees * Math.PI) / 180;

export const latLonToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
  const phi = degToRad(90 - lat);
  const theta = degToRad(lon + 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
};
