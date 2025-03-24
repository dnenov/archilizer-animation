// THREE.js Core
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js";

// THREE.js Addons (absolute CDN paths)
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js";
import { SSAOPass } from "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/postprocessing/SSAOPass.js";
import { SMAAPass } from "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/postprocessing/SMAAPass.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/postprocessing/RenderPass.js";
import { PMREMGenerator } from "https://cdn.jsdelivr.net/npm/three@0.132.2/src/extras/PMREMGenerator.js";

// GSAP
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.11.4/dist/gsap.min.js";

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
  const container = document.getElementById("three-container");
  const logger = document.getElementById("logger");

  // Setup Scene, Camera, Renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  // scene.fog = new THREE.Fog(0xffffff, 9, 11);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 15); // Looking directly at the ring

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const pmrem = new PMREMGenerator(renderer);

  const composer = new EffectComposer(renderer);
  composer.setSize(window.innerWidth, window.innerHeight);

  const renderPass = new RenderPass(scene, camera);

  // Configure SSAO Pass
  const ssaoPass = new SSAOPass(
    scene,
    camera,
    window.innerWidth,
    window.innerHeight
  );
  ssaoPass.kernelRadius = 0.65;
  ssaoPass.minDistance = 0.001;
  ssaoPass.maxDistance = 0.1;
  ssaoPass.sampleCount = 64;
  ssaoPass.output = SSAOPass.OUTPUT.Default;

  const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
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

  // scroll
  let scrollTimeout;
  let targetT = 0;
  window.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const scrollY = window.scrollY;
      const t = THREE.MathUtils.clamp(
        (scrollY - settings.minScrollY) /
          (settings.maxScrollY - settings.minScrollY),
        0,
        1
      );

      settings.animationProgress = t;

      logger.innerHTML = `animation stage: ${t}`;

      // Camera animation (unchanged)
      targetT = THREE.MathUtils.clamp(
        (scrollY - settings.minScrollY) /
          (settings.maxScrollY - settings.minScrollY),
        0,
        1
      );

      // Immediately update camera target (no nested animation)
      smoothMoveCamera(camera, targetT);

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

      // Update dots with GSAP
      dots.forEach((dotData, i) => {
        dotData.targetSpeed = dotData.baseOrbitSpeed * speedMultiplier;

        gsap.to(dotData, {
          duration: 5, // Slightly longer duration for smoother transition
          targetOrbitSize: dotData.baseOrbitSize * orbitScale,
          ease: "sine.inOut",
          delay: 0.002,
          overwrite: "auto",
        });
      });
    }, 50);
  });

  // resize
  window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);

    smaaPass.setSize(width, height);
    ssaoPass.setSize(width, height);
    bloomPass.setSize(width, height);
  });
});
