import * as THREE from "https://esm.sh/three@0.132.2";
import { settings } from "./settings.js";
import { DYNAMIC_CLUSTER_DEFAULTS as cfg } from "./dynamicClusterConfig.js";

export class DynamicCluster {
  constructor(ringGroup) {
    this.ringGroup = ringGroup;
    this.dots = [];
    this.spawnTimer = 0;
    this.nextSpawnInterval = cfg.SPAWN_INTERVAL_BASE;

    this.state = {
      orbitSizeMultiplier: 1,
      visibilityThreshold: 1,
    };
  }

  spawnDot() {
    if (Math.random() > this.state.visibilityThreshold) return;

    const theta = Math.random() * Math.PI * 2;
    const x = settings.ringRadius * Math.cos(theta);
    const y = settings.ringRadius * Math.sin(theta);
    const z = 0;

    const mesh = new THREE.Mesh(
      settings.dotGeometry,
      settings.dotSpawnMaterial.clone()
    );

    const scale = Math.random() * cfg.SIZE + 0.5;
    mesh.scale.set(scale, scale, scale);
    mesh.position.set(x, y, z);
    this.ringGroup.add(mesh);

    const radialDir = new THREE.Vector3(x, y, z).normalize();
    const orbitNormal = new THREE.Vector3()
      .crossVectors(radialDir, new THREE.Vector3(0, 0, 1))
      .normalize();

    const baseOrbitSpeed =
      cfg.ORBIT_SPEED_BASE +
      Math.random() * (cfg.ORBIT_SPEED_MAX - cfg.ORBIT_SPEED_BASE);
    const baseGlobalSpeed =
      (Math.random() < 0.5 ? -1 : 1) * (0.02 + Math.random() * 0.08);

    const orbitSize = 0.1 + Math.random() * cfg.ORBIT_SIZE;
    const globalSpeed =
      (Math.random() < 0.5 ? -1 : 1) * (0.02 + Math.random() * 0.08);

    const dot = {
      mesh,
      basePosition: new THREE.Vector3(x, y, z),
      orbitNormal,
      orbitAngleOffset: Math.random() * Math.PI * 2,
      accumulatedPhase: 0,
      baseOrbitSpeed,
      currentSpeed: baseOrbitSpeed,
      targetSpeed: baseOrbitSpeed,
      baseGlobalSpeed,
      globalSpeed: baseGlobalSpeed,
      orbitSize,
      baseOrbitSize: orbitSize,
      targetOrbitSize: orbitSize,
      life: cfg.LIFE_SPAN + Math.random() * 5,
      maxLife: 0,
      globalAngle: Math.random() * Math.PI * 2,
      globalSpeed,
      isVisible: false,
    };

    dot.maxLife = dot.life;
    this.dots.push(dot);
  }

  update(camera, deltaTime) {
    // Try to spawn new dot
    this.spawnTimer += deltaTime;
    if (
      this.spawnTimer > this.nextSpawnInterval &&
      this.dots.length < cfg.MAX_DOTS
    ) {
      this.spawnDot();
      this.spawnTimer = 0;
      this.nextSpawnInterval = 0.01;
    }

    for (let i = this.dots.length - 1; i >= 0; i--) {
      const dot = this.dots[i];

      dot.life -= deltaTime;

      const fadeIn = Math.min(1, (dot.maxLife - dot.life) / cfg.FADE_DURATION);
      const fadeOut = Math.min(1, dot.life / cfg.FADE_DURATION);
      const alpha = THREE.MathUtils.clamp(Math.min(fadeIn, fadeOut), 0, 1);

      if (dot.mesh.material?.uniforms?.opacity) {
        dot.mesh.material.uniforms.opacity.value = alpha;
      } else {
        dot.mesh.material.opacity = alpha;
      }

      if (dot.life <= -cfg.FADE_BUFFER) {
        this.ringGroup.remove(dot.mesh);
        this.dots.splice(i, 1);
        continue;
      }

      dot.accumulatedPhase += dot.currentSpeed * deltaTime;
      dot.globalAngle += (dot.globalSpeedScaled ?? dot.globalSpeed) * deltaTime;

      dot.currentSpeed += (dot.targetSpeed - dot.currentSpeed) * 0.1;
      dot.orbitSize += (dot.targetOrbitSize - dot.orbitSize) * 0.1;

      const radius = settings.currentRingRadius;
      const bx = radius * Math.cos(dot.globalAngle);
      const by = radius * Math.sin(dot.globalAngle);
      dot.basePosition.set(bx, by, 0);

      const tangent = new THREE.Vector3()
        .crossVectors(dot.orbitNormal, new THREE.Vector3(0, 0, 1))
        .normalize();

      const orbitOffset = tangent
        .clone()
        .multiplyScalar(dot.orbitSize)
        .negate();

      dot.mesh.position.copy(dot.basePosition).add(orbitOffset);
      dot.mesh.position.sub(dot.basePosition);
      dot.mesh.position.applyAxisAngle(
        dot.orbitNormal,
        dot.accumulatedPhase + dot.orbitAngleOffset
      );
      dot.mesh.position.add(dot.basePosition);
    }
  }

  setOrbitScale(multiplier) {
    this.state.orbitSizeMultiplier = multiplier;
    for (const dot of this.dots) {
      dot.targetOrbitSize = dot.baseOrbitSize * multiplier;
    }
  }

  setVisibilityThreshold(value) {
    this.state.visibilityThreshold = value;
  }

  setSpeedMultiplier(t) {
    const speedMultiplier = THREE.MathUtils.lerp(
      cfg.ORBIT_SPEED_BASE,
      cfg.ORBIT_SPEED_MAX,
      t
    );

    for (const dot of this.dots) {
      dot.targetSpeed = dot.baseOrbitSpeed * speedMultiplier;
      dot.globalSpeed = dot.baseGlobalSpeed * speedMultiplier;
    }
  }
}
