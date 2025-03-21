import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { CopyShader } from "three/addons/shaders/CopyShader.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { PMREMGenerator } from "three";
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
  const orbitSpeedSlider = document.getElementById("orbitSpeedSlider");
  const logger = document.getElementById("logger");
  const logger1 = document.getElementById("logger1");

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
  camera.position.set(0, 0, 10); // Looking directly at the ring

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

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

  // Replace your bloom pass configuration with:
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5, // Strength
    0.1, // Radius
    0.4 // Threshold
  );

  composer.addPass(renderPass);
  composer.addPass(ssaoPass);
  // composer.addPass(bloomPass);
  composer.addPass(smaaPass);

  smaaPass.renderToScreen = true;

  // Lighting
  const light = new THREE.AmbientLight(0xffffff, 1);
  scene.add(light);

  // Create dot clusters
  new RGBELoader()
    .setPath("../public/textures/") // Folder where your HDR lives
    .load("royal_esplanade_4k.hdr", (hdr) => {
      const envMap = pmrem.fromEquirectangular(hdr).texture;

      const reflectiveMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x000000,
        metalness: 1.0,
        roughness: 0.05,
        transmission: 1.0,
        thickness: 1.0,
        ior: 1.5,
        envMap: envMap,
        envMapIntensity: 1.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
      });

      scene.environment = envMap;

      // 💡 Now create the clusters with BOTH glow + core
      const dotsSmall = createDotCluster(
        settings.numSmall,
        settings.ringRadius,
        settings.dotGeometry,
        settings.dotMaterial,
        settings.sBaseOrbitSpeed,
        settings.sOrbitRadius,
        settings.smallDotSize,
        scene,
        reflectiveMaterial
      );
      const dotsLarge = createDotCluster(
        settings.numLargeDots,
        settings.ringRadius,
        settings.dotGeometry,
        settings.dotMaterial,
        settings.lBaseOrbitSpeed,
        settings.lOrbitRadius,
        settings.largeDotSize,
        scene,
        reflectiveMaterial
      );
      dots.push(...dotsLarge, ...dotsSmall);
    });

  // Start the animation loop
  animate(scene, camera, renderer, composer);

  // Event Listeners
  orbitSpeedSlider.addEventListener("input", (event) => {
    const newSpeed = parseFloat(event.target.value);
    dots.forEach((dotData) => {
      smoothUpdateTarget(dotData, newSpeed);
    });
    const targetCameraZ = 10 + (1 - newSpeed) * 4;
    const targetRotation = newSpeed * 0.1;
    logger1.innerHTML = `Target rotation: ${targetRotation.toFixed(2)}`;
    smoothMoveCamera(camera, targetCameraZ, targetRotation);
  });

  window.addEventListener("wheel", (event) => {
    event.preventDefault();
    settings.targetZ += event.deltaY * settings.zoomSpeed;
    settings.targetZ = THREE.MathUtils.clamp(
      settings.targetZ,
      settings.minZ,
      settings.maxZ
    );
    settings.targetRotation += event.deltaY * settings.zoomSpeed;
    settings.targetRotation = THREE.MathUtils.clamp(
      settings.targetRotation,
      settings.minRotation,
      settings.maxRotation
    );
    logger1.innerHTML = `Target rotation: ${settings.targetRotation.toFixed(
      2
    )}`;
    smoothMoveCamera(camera, settings.targetZ, settings.targetRotation);
  });

  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY;
    settings.targetZ = THREE.MathUtils.lerp(
      settings.maxZ,
      settings.minZ,
      scrollY / settings.scrollRange
    );
    smoothMoveCamera(camera, settings.targetZ, camera.rotation.z);
  });

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
