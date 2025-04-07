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

  camera.position.set(0, 0, 15); // Looking directly at the ring

  const renderPass = new RenderPass(scene, camera);
  const ssaoPass = new SSAOPass(scene, camera, 1, 1);
  const smaaPass = new SMAAPass(1, 1);

  container.appendChild(renderer.domElement);

  ssaoPass.kernelRadius = 0.65;
  ssaoPass.minDistance = 0.001;
  ssaoPass.maxDistance = 0.1;
  ssaoPass.sampleCount = 64;
  ssaoPass.output = SSAOPass.OUTPUT.Default;

  // const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
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

  const dotsSmall = createDotCluster(
    settings.numSmall,
    settings.ringRadius,
    settings.dotGeometry,
    settings.dotMaterial,
    settings.sBaseOrbitSpeed,
    settings.sOrbitRadius,
    settings.sOrbitVariance,
    settings.smallDotSize,
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
    scene
  );
  dots.push(...dotsLarge, ...dotsSmall);

  // Start the animation loop
  animate(camera, composer);

  function animateToStage(stage) {
    const t = (stage - 1) * 0.25 + 0.125;

    settings.animationProgress = t;
    logger.innerHTML = `Animation Stage: ${stage}`;

    smoothMoveCamera(camera, t);

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

    dots.forEach((dotData) => {
      dotData.targetSpeed = dotData.baseOrbitSpeed * speedMultiplier;
    });

    gsap.killTweensOf(dots);
    dots.forEach((dotData) => {
      gsap.to(dotData, {
        duration: 1.0,
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
    const t = (scrollY - minScrollY) / (maxScrollY - minScrollY);
    if (t < 0.1) return 1;
    if (t < 0.25) return 2;
    if (t < 0.5) return 3;
    return 4;
  }

  // ✅ Dev fallback
  if (isDebugMode) {
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
  }
});
