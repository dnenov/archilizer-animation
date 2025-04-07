import * as THREE from "https://esm.sh/three@0.132.2";
import { settings } from "./settings.js";

export const dynamicDots = [];

const MAX_DYNAMIC_DOTS = 500;
const SPAWN_INTERVAL = 0.1;
let spawnTimer = 0;
let nextSpawnInterval = SPAWN_INTERVAL;

export function spawnDynamicDot(scene) {
  const theta = Math.random() * Math.PI * 2;
  const x = settings.ringRadius * Math.cos(theta);
  const y = settings.ringRadius * Math.sin(theta);
  const z = 0;

  const mesh = new THREE.Mesh(
    settings.dotGeometry,
    settings.dotSpawnMaterial.clone()
  );
  const scale = Math.random() * 0.8 + 0.2;
  mesh.scale.set(scale, scale, scale);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  const radialDir = new THREE.Vector3(x, y, z).normalize();
  const orbitNormal = new THREE.Vector3()
    .crossVectors(radialDir, new THREE.Vector3(0, 0, 1))
    .normalize();

  const orbitSpeed = 0.5 + Math.random();
  const orbitSize = 0.1 + Math.random() * 0.2;
  const globalSpeed =
    (Math.random() < 0.5 ? -1 : 1) * (0.02 + Math.random() * 0.08);

  const dot = {
    mesh,
    basePosition: new THREE.Vector3(x, y, z),
    orbitNormal,
    orbitAngleOffset: Math.random() * Math.PI * 2,
    accumulatedPhase: 0,
    currentSpeed: orbitSpeed,
    targetSpeed: orbitSpeed,
    orbitSize,
    baseOrbitSize: orbitSize,
    targetOrbitSize: orbitSize,
    life: 15 + Math.random() * 5, // sets the lifespan
    globalAngle: Math.random() * Math.PI * 2,
    globalSpeed,
    maxLife: 0,
  };

  dot.maxLife = dot.life;
  dynamicDots.push(dot);
}

export function updateDynamicDots(scene, deltaTime) {
  // Spawn new if under max
  spawnTimer += deltaTime;
  if (spawnTimer > nextSpawnInterval && dynamicDots.length < MAX_DYNAMIC_DOTS) {
    spawnDynamicDot(scene);
    spawnTimer = 0;
    nextSpawnInterval = 0.01 + Math.random() * 0.05;
  }

  for (let i = dynamicDots.length - 1; i >= 0; i--) {
    const dot = dynamicDots[i];

    dot.life -= deltaTime;
    const fadeDuration = 1.5;
    const fadeBuffer = 0.2;

    const totalLife = dot.maxLife;
    const fadeIn = Math.min(1, (totalLife - dot.life) / fadeDuration);
    const fadeOut = Math.min(1, dot.life / fadeDuration);
    const alpha = THREE.MathUtils.clamp(Math.min(fadeIn, fadeOut), 0, 1);

    if (dot.mesh.material?.uniforms?.opacity) {
      dot.mesh.material.uniforms.opacity.value = alpha;
    } else {
      dot.mesh.material.opacity = alpha;
    }

    if (dot.life <= -fadeBuffer) {
      scene.remove(dot.mesh);
      dynamicDots.splice(i, 1);
      continue;
    }

    dot.accumulatedPhase += dot.currentSpeed * deltaTime;
    dot.globalAngle += dot.globalSpeed * deltaTime;

    // Update base position (rotating slowly around center)
    const radius = settings.ringRadius;
    const bx = radius * Math.cos(dot.globalAngle);
    const by = radius * Math.sin(dot.globalAngle);
    dot.basePosition.set(bx, by, 0);

    const tangent = new THREE.Vector3()
      .crossVectors(dot.orbitNormal, new THREE.Vector3(0, 0, 1))
      .normalize();

    const orbitOffset = tangent.clone().multiplyScalar(dot.orbitSize).negate();

    dot.mesh.position.copy(dot.basePosition).add(orbitOffset);
    dot.mesh.position.sub(dot.basePosition);
    dot.mesh.position.applyAxisAngle(
      dot.orbitNormal,
      dot.accumulatedPhase + dot.orbitAngleOffset
    );
    dot.mesh.position.add(dot.basePosition);
  }
}
