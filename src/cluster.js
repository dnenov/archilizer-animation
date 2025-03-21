import * as THREE from "three";

export function createDotCluster(
  numDots,
  ringRadius,
  dotGeometry,
  glowMaterial,
  baseOrbitSpeed,
  orbitRadius,
  orbitVariance,
  dotSize,
  scene
) {
  const clusterDots = [];

  for (let i = 0; i < numDots; i++) {
    const theta = (i / numDots) * Math.PI * 2;
    const x = ringRadius * Math.cos(theta);
    const y = ringRadius * Math.sin(theta);
    const z = 0;

    const dot = new THREE.Mesh(dotGeometry, glowMaterial);
    const scaleFactor = Math.random() * dotSize + 0.4;
    dot.scale.set(scaleFactor, scaleFactor, scaleFactor);
    dot.position.set(x, y, z);
    scene.add(dot);

    const radialDirection = new THREE.Vector3(x, y, z).normalize();
    const orbitNormal = new THREE.Vector3()
      .crossVectors(radialDirection, new THREE.Vector3(0, 0, 1))
      .normalize();

    clusterDots.push({
      mesh: dot,
      baseTheta: theta,
      basePosition: new THREE.Vector3(x, y, z),
      orbitNormal: orbitNormal,
      orbitAngleOffset: Math.random() * Math.PI * 2,
      orbitSpeed: baseOrbitSpeed + (Math.random() - 0.5) * 0.2,
      baseOrbitSpeed: baseOrbitSpeed + (Math.random() - 0.5) * 0.2, // 💾 snapshot
      targetOrbitSpeed: baseOrbitSpeed,
      orbitSize: orbitRadius + orbitVariance * (Math.random() - 0.5) * 1.0,
      baseOrbitSize: orbitRadius + (Math.random() - 0.5) * 2.0, // 💾 snapshot
      targetOrbitSize: orbitRadius,
      driftFactor: 0.2,
    });
  }

  return clusterDots;
}
