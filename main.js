document.addEventListener("DOMContentLoaded", function () {
  const orbitSpeedSlider = document.getElementById("orbitSpeedSlider");
  const logger = document.getElementById("logger");
  const logger1 = document.getElementById("logger1");

  // Setup Scene, Camera, Renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.Fog(0xffffff, 9, 11);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 10); // Looking directly at the ring

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lighting
  const light = new THREE.AmbientLight(0xffffff, 1);
  scene.add(light);

  // Parameters
  const numSmall = 100; // Number of dots in the ring
  const numLargeDots = 60; // Number of dots in the ring
  const smallDotSize = 0.5; // The size of the small dots before randomization
  const largeDotSize = 2.0; // The size of the large dots before randomization
  const ringRadius = 2; // Radius of the main ring
  const sOrbitRadius = 0.25; // Default orbit size
  const lOrbitRadius = 0.1; // Default orbit size
  const sBaseOrbitSpeed = 1.5; // Base speed of orbits
  const lBaseOrbitSpeed = 0.8; // Base speed of orbits

  const dampingFactor = 5;

  // Array to store dot data
  let dots = [];

  // Create Small Spheres (Dots) Around the Ring
  const dotGeometry = new THREE.SphereGeometry(0.03, 16, 16);
  const dotMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x000000, // Black color
    roughness: 0.1, // Low roughness for a smoother surface
    metalness: 0.9, // High metalness to reflect light
    transmission: 1.0, // Semi-transparent glass effect (0 = opaque, 1 = full glass)
    opacity: 1.0, // Slight transparency (ensure `transparent: true` is set)
    transparent: true, // Enable transparency
    ior: 1.5, // Index of Refraction (glass-like refraction)
    thickness: 0.5, // Simulated glass thickness
    clearcoat: 1, // Extra glossy surface
    clearcoatRoughness: 0.1, // Slight variation in glossiness
  });

  // Create dot clusters
  const dotsSmall = createDotCluster(
    numSmall,
    ringRadius,
    dotGeometry,
    dotMaterial,
    sBaseOrbitSpeed,
    sOrbitRadius,
    smallDotSize
  );
  const dotsLarge = createDotCluster(
    numLargeDots,
    ringRadius,
    dotGeometry,
    dotMaterial,
    lBaseOrbitSpeed,
    lOrbitRadius,
    largeDotSize
  );
  dots.push(...dotsLarge);
  dots.push(...dotsSmall);

  // Animation Loop
  const clock = new THREE.Clock(); // Create a clock instance

  function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta(); // Get time since last frame

    dots.forEach((dotData) => {
      const dot = dotData.mesh;

      // Smoothly interpolate orbitSpeed and orbitSize
      dotData.orbitSpeed = THREE.MathUtils.damp(
        dotData.orbitSpeed,
        dotData.targetOrbitSpeed,
        dampingFactor,
        deltaTime
      );
      dotData.orbitSize = THREE.MathUtils.damp(
        dotData.orbitSize,
        dotData.targetOrbitSize,
        dampingFactor,
        deltaTime
      );

      // Step 1: Get the orbit normal (we already have it stored)
      const tangent = new THREE.Vector3()
        .crossVectors(dotData.orbitNormal, new THREE.Vector3(0, 0, 1))
        .normalize();

      // Step 2: Compute the position offset along the orbit (radius * tangent)
      const orbitOffset = tangent
        .clone()
        .multiplyScalar(dotData.orbitSize)
        .negate();

      // Step 3: Update the dot's position in the orbit plane
      dot.position.set(
        dotData.basePosition.x + orbitOffset.x,
        dotData.basePosition.y + orbitOffset.y,
        dotData.basePosition.z + orbitOffset.z
      );

      // Step 4: Apply rotation around the orbit normal
      // The orbitAngleOffset is a random intial constant to give each sphere a random position around the ring
      const rotationAngle =
        clock.getElapsedTime() * dotData.orbitSpeed + dotData.orbitAngleOffset; // Use elapsed time for rotation
      dot.position.sub(dotData.basePosition); // Translate to origin
      dot.position.applyAxisAngle(dotData.orbitNormal, rotationAngle); // Apply rotation
      dot.position.add(dotData.basePosition); // Translate back
    });

    logger.innerHTML = `Camera Z: ${camera.position.z.toFixed(2)}`;

    renderer.render(scene, camera);
  }

  // Function to create a cluster of dots
  function createDotCluster(
    numDots,
    ringRadius,
    dotGeometry,
    dotMaterial,
    baseOrbitSpeed,
    orbitRadius,
    dotSize
  ) {
    let clusterDots = [];

    for (let i = 0; i < numDots; i++) {
      const theta = (i / numDots) * Math.PI * 2; // Position along the main ring
      const x = ringRadius * Math.cos(theta);
      const y = ringRadius * Math.sin(theta);
      const z = 0; // Keep the ring flat in the XY plane

      // Create dot mesh
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      const scaleFactor = Math.random() * dotSize + 0.6; // Random size between 0.6 and 1.4
      dot.position.set(x, y, z);
      dot.scale.set(scaleFactor, scaleFactor, scaleFactor);
      scene.add(dot);

      // Compute the perpendicular plane normal at this point (cross product with Z-axis)
      const radialDirection = new THREE.Vector3(x, y, z).normalize();
      const orbitNormal = new THREE.Vector3()
        .crossVectors(radialDirection, new THREE.Vector3(0, 0, 1))
        .normalize();

      // Store dot data with wobbling randomness
      clusterDots.push({
        mesh: dot,
        baseTheta: theta,
        basePosition: new THREE.Vector3(x, y, z),
        orbitNormal: orbitNormal,
        orbitAngleOffset: Math.random() * Math.PI * 2, // Random initial angle
        orbitSpeed: baseOrbitSpeed + (Math.random() - 0.5) * 0.2, // Slightly different speeds
        targetOrbitSpeed: baseOrbitSpeed,
        orbitSize: orbitRadius + (Math.random() - 0.5) * 2.0, // Random orbit size
        targetOrbitSize: orbitRadius,
        driftFactor: 0.2, // Random drift to add wobbly motion
      });
    }

    return clusterDots;
  }

  // Function to smoothly update target values
  function smoothUpdateTarget(dotData, newSpeed) {
    // Smoothly update targetOrbitSpeed and targetOrbitSize
    dotData.targetOrbitSpeed = THREE.MathUtils.damp(
      dotData.targetOrbitSpeed,
      newSpeed + (Math.random() - 0.25) * 0.1,
      dampingFactor,
      clock.getDelta() // Use deltaTime from the clock
    );
    dotData.targetOrbitSize = THREE.MathUtils.damp(
      dotData.targetOrbitSize,
      Math.max(0.1, newSpeed * 1.2),
      dampingFactor,
      clock.getDelta() // Use deltaTime from the clock
    );
  }

  // Slider Event Listener to Adjust Orbit Speed
  orbitSpeedSlider.addEventListener("input", (event) => {
    const newSpeed = parseFloat(event.target.value);

    dots.forEach((dotData) => {
      smoothUpdateTarget(dotData, newSpeed); // Smoothly update targets
    });

    // Updated formula for targetCameraZ
    const targetCameraZ = 10 + (1 - newSpeed) * 4; // Adjusted formula
    const targetRotation = newSpeed * 0.1; // Adjust rotation based on speed

    logger1.innerHTML = `Target rotation: ${targetRotation.toFixed(2)}`;
    smoothMoveCamera(targetCameraZ, targetRotation);
  });

  // Function to smoothly transition the camera position and rotation
  function smoothMoveCamera(targetZ, targetRotation) {
    const duration = 1; // Duration of the transition in seconds
    const startZ = camera.position.z;
    const startRotation = camera.rotation.z;
    const startTime = performance.now();

    function stepMove() {
      const currentTime = performance.now();
      const elapsedTime = (currentTime - startTime) / 1000; // Convert to seconds
      let alpha = Math.min(elapsedTime / duration, 1); // Clamp alpha between 0 and 1

      // Apply easing (ease-in-out in this example)
      alpha =
        alpha < 0.5
          ? 2 * alpha * alpha // Ease-in
          : 1 - Math.pow(-2 * alpha + 2, 2) / 2; // Ease-out

      // Interpolate camera position
      camera.position.z = THREE.MathUtils.lerp(startZ, targetZ, alpha);

      // Interpolate camera rotation
      camera.rotation.z = THREE.MathUtils.lerp(
        startRotation,
        targetRotation,
        alpha
      );

      // Continue the transition until alpha reaches 1
      if (alpha < 1) {
        requestAnimationFrame(stepMove);
      }
    }

    stepMove(); // Start transition
  }

  // Variables to store the target Z position and settings
  let targetZ = 10; // Initial camera Z position
  let targetRotation = 0; // Initial camera rotation
  const zoomSpeed = 0.1; // Mouse wheel zoom speed
  const scrollRange = 1000; // Total scroll range in pixels
  const minZ = 6; // Minimum camera Z position
  const maxZ = 10; // Maximum camera Z position
  const minRotation = 0; // Minimum camera rotation
  const maxRotation = 0.5; // Maximum camera rotation

  // Add event listener for mouse wheel
  window.addEventListener("wheel", (event) => {
    event.preventDefault(); // Prevent default scrolling
    targetZ += event.deltaY * zoomSpeed; // Adjust target Z
    targetZ = THREE.MathUtils.clamp(targetZ, minZ, maxZ); // Clamp to range

    targetRotation += event.deltaY * zoomSpeed;
    targetRotation = THREE.MathUtils.clamp(
      targetRotation,
      minRotation,
      maxRotation
    );

    logger1.innerHTML = `Target rotation: ${targetRotation.toFixed(2)}`;

    smoothMoveCamera(targetZ, targetRotation); // Smooth transition
  });

  // Add event listener for page scroll
  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY; // Get scroll position
    targetZ = THREE.MathUtils.lerp(maxZ, minZ, scrollY / scrollRange); // Map to Z
    smoothMoveCamera(targetZ, camera.rotation.z); // Smooth transition
  });

  // Handle Window Resize
  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // Start the animation loop
  animate();
});
