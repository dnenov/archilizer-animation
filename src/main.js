// Core THREE
import * as THREE from "https://esm.sh/three@0.132.2";

// Postprocessing (rewritten automatically)
import { EffectComposer } from "https://esm.sh/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js";
import { SSAOPass } from "https://esm.sh/three@0.132.2/examples/jsm/postprocessing/SSAOPass.js";
import { SMAAPass } from "https://esm.sh/three@0.132.2/examples/jsm/postprocessing/SMAAPass.js";
import { RenderPass } from "https://esm.sh/three@0.132.2/examples/jsm/postprocessing/RenderPass.js";
import { PMREMGenerator } from "https://esm.sh/three@0.132.2/src/extras/PMREMGenerator.js";

// GSAP
import gsap from "https://esm.sh/gsap@3.11.4";

// Your Custom Modules (must use raw GitHub URLs - REPLACE placeholders)
import { createDotCluster } from "./cluster.js";
import { animate, smoothMoveCamera, dots } from "./animation.js";
import { settings } from "./settings.js";

function generateNoiseTexture(size = 4) {
  const width = size;
  const height = size;
  const data = new Uint8Array(width * height * 3); // RGB

  for (let i = 0; i < width * height * 3; i++) {
    data[i] = Math.random() * 255;
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;

  return texture;
}

document.addEventListener("DOMContentLoaded", function () {
  const maxScrollY = 500;
  const container = document.getElementById("three-container");
  const logger = document.getElementById("logger");
  const isDebugMode =
    window.location.hostname === "localhost" ||
    window.location.protocol === "file:";

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(1, 1);
  container.appendChild(renderer.domElement);

  const pmrem = new PMREMGenerator(renderer);
  const composer = new EffectComposer(renderer);
  composer.setSize(1, 1);

  // Setup Scene, Camera, Renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  // scene.fog = new THREE.Fog(0xffffff, 9, 11);

  camera.position.set(-4, 0, 8); // Looking directly at the ring

  const renderPass = new RenderPass(scene, camera);
  const ssaoPass = new SSAOPass(scene, camera, 1, 1);
  const smaaPass = new SMAAPass(1, 1);

  container.appendChild(renderer.domElement);

  ssaoPass.kernelRadius = 0.65;
  ssaoPass.minDistance = 0.001;
  ssaoPass.maxDistance = 0.1;
  ssaoPass.sampleCount = 64;
  ssaoPass.output = SSAOPass.OUTPUT.Default;

  ssaoPass.noiseTexture = generateNoiseTexture();
  ssaoPass.noiseTexture.wrapS = THREE.RepeatWrapping;
  ssaoPass.noiseTexture.wrapT = THREE.RepeatWrapping;

  composer.addPass(renderPass);
  composer.addPass(ssaoPass);
  composer.addPass(smaaPass);

  smaaPass.renderToScreen = true;

  // Lighting
  const light = new THREE.AmbientLight(0xffffff, 1);
  scene.add(light);

  const ringGroup = new THREE.Group();
  scene.add(ringGroup);

  const dotsSmall = createDotCluster(
    settings.numSmall,
    settings.ringRadius,
    settings.dotGeometry,
    settings.dotMaterial,
    settings.sBaseOrbitSpeed,
    settings.sOrbitRadius,
    settings.sOrbitVariance,
    settings.smallDotSize,
    ringGroup,
    scene
  );

  const dotsLarge = createDotCluster(
    settings.numLargeDots,
    settings.ringRadius,
    settings.dotGeometry,
    settings.dotMaterial,
    settings.lBaseOrbitSpeed,
    settings.lOrbitRadius,
    settings.lOrbitVariance,
    settings.largeDotSize,
    ringGroup,
    scene
  );

  dots.push(...dotsLarge, ...dotsSmall);

  // Start the animation loop
  animate(camera, scene, composer, ringGroup);

  function animateToStage(stage) {
    const totalStages = 10;
    const t = (stage - 1) / (totalStages - 1);
    console.log(t);

    // Expand the ring instead of moving camera
    const radiusScale = THREE.MathUtils.lerp(settings.ringRadius, 10, t);
    gsap.to(settings, {
      duration: settings.transitionDuration,
      currentRingRadius: settings.ringRadius * radiusScale,
      ease: "sine.inOut",
    });

    settings.animationProgress = t;
    // smoothMoveCamera(camera, t); // now only rotates

    // Rotate the ring
    gsap.to(ringGroup.rotation, {
      z: THREE.MathUtils.degToRad(t * 72),
      duration: settings.transitionDuration,
      ease: "sine.inOut",
    });

    // Pan the ring
    gsap.to(ringGroup.position, {
      x: THREE.MathUtils.lerp(0, -4.5, t),
      y: THREE.MathUtils.lerp(0, 4.5, t), // move slightly up at higher stages
      duration: settings.transitionDuration,
      ease: "sine.inOut",
    });

    const orbitScale = THREE.MathUtils.lerp(
      settings.minOrbitMultiplier,
      settings.maxOrbitMultiplier,
      t
    );

    const speedMultiplier = THREE.MathUtils.lerp(
      settings.minSpeedFactor,
      settings.maxSpeedFactor,
      t * 2.5
    );

    // 🔁 Update base positions of all static dots
    dots.forEach((dotData) => {
      dotData.targetSpeed = dotData.baseOrbitSpeed * speedMultiplier;

      const theta = dotData.baseTheta; // already stored during creation
      const r = settings.currentRingRadius;
      dotData.basePosition.set(r * Math.cos(theta), r * Math.sin(theta), 0);
    });

    // 🎯 Smoothly transition orbit size
    gsap.killTweensOf(dots);
    dots.forEach((dotData) => {
      gsap.to(dotData, {
        duration: settings.transitionDuration,
        targetOrbitSize: dotData.baseOrbitSize * orbitScale,
        ease: "sine.inOut",
        overwrite: "auto",
      });
    });
  }

  function handleResize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
    ssaoPass.setSize(width, height);
    smaaPass.setSize(width, height);
  }

  // ✅ Final message handler
  window.addEventListener("message", (event) => {
    const { type, payload } = event.data;
    if (!type || !payload) return;

    switch (type) {
      case "setStage":
        console.log(`setting the stage to ${payload.stage}`);
        animateToStage(payload.stage);
        break;
      case "resize":
        handleResize(payload.width, payload.height);
        break;
      case "init":
        handleResize(payload.width, payload.height);
        const scrollY = payload.scrollY;
        const stage = getStageFromScroll(scrollY, 0, maxScrollY);
        animateToStage(stage);
        break;
      default:
        console.warn("Unknown message type:", type);
    }
  });

  // ✅ Add this helper in main.js (same as Webflow's)
  function getStageFromScroll(scrollY, minScrollY, maxScrollY) {
    const clampedT = Math.min(
      Math.max((scrollY - minScrollY) / (maxScrollY - minScrollY), 0),
      0.9999
    );
    const totalStages = 10;
    return Math.floor(clampedT * totalStages) + 1;
  }

  handleResize(window.innerWidth, window.innerHeight);
  const scrollY = window.scrollY;
  const stage = getStageFromScroll(scrollY, 0, maxScrollY);
  animateToStage(stage);

  window.addEventListener("scroll", () => {
    const stage = getStageFromScroll(window.scrollY, 0, maxScrollY);
    animateToStage(stage);
  });

  window.addEventListener("resize", () => {
    handleResize(window.innerWidth, window.innerHeight);
  });
});
