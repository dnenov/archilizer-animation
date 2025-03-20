document.addEventListener("DOMContentLoaded", function () {
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
  const ringRadius = 4; // Radius of the main ring
  const sOrbitRadius = 0.25; // Default orbit size
  const lOrbitRadius = 0.1; // Default orbit size
  const sBaseOrbitSpeed = 1.5; // Base speed of orbits
  const lBaseOrbitSpeed = 0.8; // Base speed of orbits

  // Add the ring for reference
  drawRing(scene, ringRadius);

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

  function animate() {
    requestAnimationFrame(animate);

    dots.forEach((dotData, index) => {
      const dot = dotData.mesh;

      dotData.orbitSpeed = THREE.MathUtils.lerp(
        dotData.orbitSpeed,
        dotData.targetOrbitSpeed,
        0.005
      );
      dotData.orbitSize = THREE.MathUtils.lerp(
        dotData.orbitSize,
        dotData.targetOrbitSize,
        0.005
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
      const rotationAngle = performance.now() * 0.002 * dotData.orbitSpeed;
      dot.position.sub(dotData.basePosition); // Translate to origin
      dot.position.applyAxisAngle(dotData.orbitNormal, rotationAngle); // Apply rotation
      dot.position.add(dotData.basePosition); // Translate back
    });

    renderer.render(scene, camera);
  }

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

      // drawOrbitNormals(scene);

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
        orbitAngleOffset: Math.random() * Math.PI * 2, // Randomized start
        orbitSpeed: baseOrbitSpeed + (Math.random() - 0.5) * 0.2, // Slightly different speeds
        targetOrbitSpeed: baseOrbitSpeed, // NEW: Store the intended speed change
        orbitSize: orbitRadius + (Math.random() - 0.5) * 2.0, // Random orbit size
        targetOrbitSize: orbitRadius, // NEW: Store the intended orbit size change
        driftFactor: 0.2, // Random drift to add wobbly motion
      });
    }

    return clusterDots;
  }

  function drawRing(scene, ringRadius) {
    // Create a reference circle
    const ringGeometry = new THREE.CircleGeometry(ringRadius, 100); // 100 segments for smoothness
    const ringMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue color

    // Convert the CircleGeometry into a LineLoop (so it doesn’t fill the center)
    const ringEdges = new THREE.EdgesGeometry(ringGeometry);
    const ringOutline = new THREE.LineSegments(ringEdges, ringMaterial);

    scene.add(ringOutline);
  }

  function drawOrbitNormals(scene) {
    const normalMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
      transparent: true, // Enable transparency
      opacity: 0.5, // Adjust transparency (0 = fully transparent, 1 = fully opaque)
    });

    dots.forEach((dotData) => {
      const start = dotData.mesh.position.clone(); // Start at the dot's position
      const end = start
        .clone()
        .add(dotData.orbitNormal.clone().multiplyScalar(2)); // Extend by 1 unit

      const normalGeometry = new THREE.BufferGeometry().setFromPoints([
        start,
        end,
      ]);
      const normalLine = new THREE.Line(normalGeometry, normalMaterial);
      scene.add(normalLine);
    });
  }

  animate();

  // Handle Window Resize
  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // Slider Event Listener to Adjust Orbit Speed
  const orbitSpeedSlider = document.getElementById("orbitSpeedSlider");
  orbitSpeedSlider.addEventListener("input", (event) => {
    const newSpeed = parseFloat(event.target.value);

    dots.forEach((dotData) => {
      dotData.targetOrbitSpeed = newSpeed + (Math.random() - 0.25) * 0.1;
      dotData.targetOrbitSize = Math.max(0.1, newSpeed * 1.2);
    });

    const targetCameraZ = 10 - newSpeed * 2.0;
    smoothMoveCamera(targetCameraZ);
  });

  // Function to smoothly transition the camera position
  function smoothMoveCamera(targetZ) {
    const step = 0.05; // Adjust this for smoother/faster movement

    function stepMove() {
      if (Math.abs(camera.position.z - targetZ) > 0.1) {
        camera.position.z += (targetZ - camera.position.z) * step;
        requestAnimationFrame(stepMove);
      } else {
        camera.position.z = targetZ; // Snap to target if very close
      }
    }

    stepMove(); // Start transition
  }
});
