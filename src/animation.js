import * as THREE from "https://esm.sh/three@0.132.2";
import gsap from "https://esm.sh/gsap@3.11.4";
import { settings } from "./settings.js";
export const dots = [];
const clock = new THREE.Clock();

function updateMaterials(camera) {
  const t = performance.now() / 1000;

  dots.forEach((dotData) => {
    const dot = dotData.mesh;
    const children = dot.isGroup ? dot.children : [dot];

    // ✅ Update all children — no animation here
    children.forEach((child) => {
      if (child.userData.isGlow) {
        child.lookAt(camera.position);
        if (child.material.uniforms?.time) {
          child.material.uniforms.time.value = t;
        }
      }
    });
  });
}

export function animate(
  camera,
  scene,
  composer,
  ringGroup,
  dynamicCluster,
  getMouseWorld
) {
  function loop() {
    requestAnimationFrame(loop);
    updateMaterials(camera);

    const deltaTime = clock.getDelta();
    const mousePos = getMouseWorld(); // ✅ Live mouse position in world coords

    const repulsionRadius = 0.5;
    const baseRepulsionStrength = 0.02;

    const t = settings.animationProgress; // ✅ Use stage-based progress (0 to 1)
    const dynamicRepulsionRadius = repulsionRadius * (1 + t * 2); // Stronger at later stages
    const dynamicStrength = baseRepulsionStrength * (1 + t * 100); // Stronger at later stages

    const toDot = new THREE.Vector3();

    dynamicCluster.update(camera, deltaTime);

    dots.forEach((dotData) => {
      dotData.currentSpeed +=
        (dotData.targetSpeed - dotData.currentSpeed) * 0.1;
      dotData.orbitSize += (dotData.targetOrbitSize - dotData.orbitSize) * 0.1;

      const r = settings.currentRingRadius;
      const theta = dotData.baseTheta;
      dotData.basePosition.set(r * Math.cos(theta), r * Math.sin(theta), 0);

      // ✅ Repulsion logic
      const worldPos = dotData.mesh.getWorldPosition(new THREE.Vector3());
      toDot.subVectors(worldPos, mousePos);
      const dist = toDot.length();

      if (dist < dynamicRepulsionRadius) {
        const falloff =
          (dynamicRepulsionRadius - dist) / dynamicRepulsionRadius;
        const push = toDot
          .normalize()
          .multiplyScalar(Math.pow(falloff, 3) * dynamicStrength * 10); // 👈 boost here

        dotData.repulsionOffset.add(push);
      }

      // 🌀 Let them drift back slowly — adjust these for 'less elastic' feel
      dotData.repulsionOffset.multiplyScalar(0.985); // how long they linger
      dotData.repulsionOffset.lerp(new THREE.Vector3(), 0.012); // how fast they return

      const finalBase = dotData.basePosition
        .clone()
        .add(dotData.repulsionOffset);

      dotData.accumulatedPhase += dotData.currentSpeed * deltaTime;

      const tangent = new THREE.Vector3()
        .crossVectors(dotData.orbitNormal, new THREE.Vector3(0, 0, 1))
        .normalize();

      const orbitOffset = tangent
        .clone()
        .multiplyScalar(dotData.orbitSize)
        .negate();

      dotData.mesh.position.copy(finalBase).add(orbitOffset);
      dotData.mesh.position.sub(finalBase);
      dotData.mesh.position.applyAxisAngle(
        dotData.orbitNormal,
        dotData.accumulatedPhase + dotData.orbitAngleOffset
      );
      dotData.mesh.position.add(finalBase);
    });

    composer.render();
  }

  loop();
}

export function smoothMoveCamera(camera, targetT) {
  const duration = 0.8; // Shorter duration for responsiveness

  // Define start/end positions (now based on targetT)
  const startPos = new THREE.Vector3(0, 0, 15);
  const endPos = new THREE.Vector3(0, 0, 2);
  const startRot = 0;
  const endRot = -1.5;

  // Calculate target position/rotation for this frame
  const targetPos = new THREE.Vector3().lerpVectors(startPos, endPos, targetT);
  const targetRot = THREE.MathUtils.lerp(startRot, endRot, targetT);

  // Smoothly move toward the target (no timeline)
  // gsap.to(camera.position, {
  //   x: targetPos.x,
  //   y: targetPos.y,
  //   z: targetPos.z,
  //   duration: duration,
  //   ease: "sine.inOut",
  // });

  // gsap.to(camera.rotation, {
  //   z: targetRot,
  //   duration: duration,
  //   ease: "sine.inOut",
  // });
}
