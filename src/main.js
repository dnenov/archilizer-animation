// Core THREE
import * as THREE from "https://esm.sh/three@0.132.2";

// Postprocessing (rewritten automatically)
import { EffectComposer } from "https://esm.sh/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://esm.sh/three@0.132.2/examples/jsm/postprocessing/RenderPass.js";
import { PMREMGenerator } from "https://esm.sh/three@0.132.2/src/extras/PMREMGenerator.js";
import { AfterimagePass } from "https://esm.sh/three@0.132.2/examples/jsm/postprocessing/AfterimagePass.js";
import { ShaderPass } from "https://esm.sh/three@0.132.2/examples/jsm/postprocessing/ShaderPass.js";

// GSAP
import gsap from "https://esm.sh/gsap@3.11.4";

// Your Custom Modules (must use raw GitHub URLs - REPLACE placeholders)
import { createDotCluster } from "./cluster.js";
import { animate, smoothMoveCamera, dots } from "./animation.js";
import { settings } from "./settings.js";
import { DynamicCluster } from "./dynamicCluster.js";

const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0003 }, // increase for stronger split
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    
    void main() {
      vec2 offset = amount * vec2(1.0, 1.0);
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

let mouseWorld = new THREE.Vector3();
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
  scene.fog = new THREE.Fog(0xffffff, 5.5, 6.5);

  camera.position.set(-4, 0, 6); // Looking directly at the ring

  const afterimagePass = new AfterimagePass();
  afterimagePass.uniforms["damp"].value = 0.2; // 0.8 = heavy ghosting, 0.95 = subtle

  const renderPass = new RenderPass(scene, camera);
  const chromaPass = new ShaderPass(ChromaticAberrationShader);
  container.appendChild(renderer.domElement);

  composer.addPass(renderPass);
  composer.addPass(afterimagePass);
  composer.addPass(chromaPass);
  chromaPass.renderToScreen = true;

  afterimagePass.renderToScreen = true;

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

  /**
   * Dynamic Cluster
   */
  const dynamicCluster = new DynamicCluster(ringGroup);

  // Start the animation loop
  animate(camera, scene, composer, ringGroup, dynamicCluster, () => mouseWorld);

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

    // Rotate the ring
    gsap.to(ringGroup.rotation, {
      z: THREE.MathUtils.degToRad(t * 72),
      duration: settings.transitionDuration,
      ease: "sine.inOut",
    });

    // Pan the ring
    gsap.to(ringGroup.position, {
      x: THREE.MathUtils.lerp(0, -4.5, t),
      y: THREE.MathUtils.lerp(0, 4.5, t),
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

    // Dynamic Cluster
    dynamicCluster.setOrbitScale(orbitScale);
    dynamicCluster.setSpeedMultiplier(t);
  }

  function handleResize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
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

  window.addEventListener("mousemove", (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = (0 - camera.position.z) / dir.z;
    mouseWorld = camera.position.clone().add(dir.multiplyScalar(distance));
  });
});
