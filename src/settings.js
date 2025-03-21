import * as THREE from "three";
import FakeGlowMaterial from "./fakeGlowMaterial.js";

export const settings = {
  numSmall: 100,
  numLargeDots: 60,
  smallDotSize: 0.5,
  largeDotSize: 2.0,
  ringRadius: 2,
  sOrbitRadius: 0.25,
  lOrbitRadius: 0.1,
  sOrbitVariance: 5.0,
  lOrbitVariance: 1.5,
  sBaseOrbitSpeed: 1.5,
  lBaseOrbitSpeed: 0.8,
  dampingFactor: 5,
  targetZ: 10,
  targetRotation: 0,
  zoomSpeed: 0.1,
  scrollRange: 1000,
  minZ: 6,
  maxZ: 10,
  minRotation: 0,
  maxRotation: 0.5,
  dotGeometry: new THREE.PlaneGeometry(0.1, 0.1),
  dotMaterial: new FakeGlowMaterial({}),
  reflectiveMaterial: null,
};
