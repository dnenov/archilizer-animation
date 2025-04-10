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

export function animate(camera, scene, composer, ringGroup, dynamicCluster) {
  function loop() {
    requestAnimationFrame(loop);
    updateMaterials(camera);

    const deltaTime = clock.getDelta();

    // The meandering dots
    dynamicCluster.update(camera, deltaTime);

    dots.forEach((dotData) => {
      // Smooth speed transition
      dotData.currentSpeed +=
        (dotData.targetSpeed - dotData.currentSpeed) * 0.1;

      // Smooth orbit radius transition
      dotData.orbitSize += (dotData.targetOrbitSize - dotData.orbitSize) * 0.1;

      const r = settings.currentRingRadius;
      const theta = dotData.baseTheta;
      dotData.basePosition.set(r * Math.cos(theta), r * Math.sin(theta), 0);

      // Integrate phase
      dotData.accumulatedPhase += dotData.currentSpeed * deltaTime;

      // Calculate orbital position
      const tangent = new THREE.Vector3()
        .crossVectors(dotData.orbitNormal, new THREE.Vector3(0, 0, 1))
        .normalize();

      const orbitOffset = tangent
        .clone()
        .multiplyScalar(dotData.orbitSize)
        .negate();

      dotData.mesh.position.copy(dotData.basePosition).add(orbitOffset);
      dotData.mesh.position.sub(dotData.basePosition);
      dotData.mesh.position.applyAxisAngle(
        dotData.orbitNormal,
        dotData.accumulatedPhase + dotData.orbitAngleOffset
      );
      dotData.mesh.position.add(dotData.basePosition);
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
