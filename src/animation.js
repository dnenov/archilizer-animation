import * as THREE from "three";
import { settings } from "./settings.js";

export const dots = [];
const clock = new THREE.Clock();

function updateMaterials(camera) {
  const t = performance.now() / 1000;
  dots.forEach((dotData) => {
    const dot = dotData.mesh;
    const children = dot.isGroup ? dot.children : [dot];

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

export function animate(camera, composer) {
  function loop() {
    requestAnimationFrame(loop);
    updateMaterials(camera);

    dots.forEach((dotData) => {
      const dot = dotData.mesh;
      const tangent = new THREE.Vector3()
        .crossVectors(dotData.orbitNormal, new THREE.Vector3(0, 0, 1))
        .normalize();
      const orbitOffset = tangent
        .clone()
        .multiplyScalar(dotData.orbitSize)
        .negate();
      dot.position.set(
        dotData.basePosition.x + orbitOffset.x,
        dotData.basePosition.y + orbitOffset.y,
        dotData.basePosition.z + orbitOffset.z
      );

      const rotationAngle =
        clock.getElapsedTime() * dotData.orbitSpeed + dotData.orbitAngleOffset;
      dot.position.sub(dotData.basePosition);
      dot.position.applyAxisAngle(dotData.orbitNormal, rotationAngle);
      dot.position.add(dotData.basePosition);
    });

    composer.render();
  }

  loop();
}

export function smoothUpdateTarget(dotData, newSpeed) {
  const startSpeed = dotData.orbitSpeed;
  const startSize = dotData.orbitSize;

  const endSpeed = newSpeed + (Math.random() - 0.25) * 0.1;
  const endSize = Math.max(0.1, dotData.orbitSize * newSpeed * 1.2);

  const duration = 1; // seconds
  const startTime = performance.now();

  function stepUpdate() {
    const currentTime = performance.now();
    const elapsedTime = (currentTime - startTime) / 1000;
    let alpha = Math.min(elapsedTime / duration, 1);

    // easeInOutQuad
    alpha =
      alpha < 0.5 ? 2 * alpha * alpha : 1 - Math.pow(-2 * alpha + 2, 2) / 2;

    dotData.targetOrbitSpeed = THREE.MathUtils.lerp(
      startSpeed,
      endSpeed,
      alpha
    );
    dotData.targetOrbitSize = THREE.MathUtils.lerp(startSize, endSize, alpha);

    if (alpha < 1) {
      requestAnimationFrame(stepUpdate);
    }
  }

  stepUpdate();
}

export function smoothMoveCamera(camera, targetZ, targetRotation) {
  const duration = 1;
  const startZ = camera.position.z;
  const startRotation = camera.rotation.z;
  const startTime = performance.now();

  function stepMove() {
    const currentTime = performance.now();
    const elapsedTime = (currentTime - startTime) / 1000;
    let alpha = Math.min(elapsedTime / duration, 1);
    alpha =
      alpha < 0.5 ? 2 * alpha * alpha : 1 - Math.pow(-2 * alpha + 2, 2) / 2;

    camera.position.z = THREE.MathUtils.lerp(startZ, targetZ, alpha);
    camera.rotation.z = THREE.MathUtils.lerp(
      startRotation,
      targetRotation,
      alpha
    );

    if (alpha < 1) {
      requestAnimationFrame(stepMove);
    }
  }

  stepMove();
}
