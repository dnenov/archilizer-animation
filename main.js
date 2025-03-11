document.addEventListener("DOMContentLoaded", function () {
    // Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 10); // Looking directly at the ring

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lighting
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    // Parameters
    const numDots = 100; // Number of dots in the ring
    const numLargeDots = 40; // Number of dots in the ring
    const ringRadius = 4; // Radius of the main ring
    const orbitRadius = 0.05; // Default orbit size
    const baseOrbitSpeed = 0.5; // Base speed of orbits

    // Array to store dot data
    let dots = [];

    // Create Small Spheres (Dots) Around the Ring
    const dotGeometry = new THREE.SphereGeometry(0.03, 16, 16);
    const dotMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x000000,        // Black color
        roughness: 0.1,         // Low roughness for a smoother surface
        metalness: 0.9,         // High metalness to reflect light
        transmission: 1.0,      // Semi-transparent glass effect (0 = opaque, 1 = full glass)
        opacity: 1.0,           // Slight transparency (ensure `transparent: true` is set)
        transparent: false,      // Enable transparency
        ior: 1.5,               // Index of Refraction (glass-like refraction)
        thickness: 0.5,         // Simulated glass thickness
        clearcoat: 1,           // Extra glossy surface
        clearcoatRoughness: 0.1 // Slight variation in glossiness
    });


    for (let i = 0; i < numLargeDots; i++) {
        const theta = (i / numLargeDots) * Math.PI * 2; // Position along the main ring
        const x = ringRadius * Math.cos(theta);
        const y = ringRadius * Math.sin(theta);
        const z = 0; // Keep the ring flat in the XY plane

        // Create dot mesh
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        const scaleFactor = Math.random() * 0.8 + 0.6; // Random size between 0.6 and 1.4
        dot.position.set(x, y, z);
        dot.scale.set(scaleFactor, scaleFactor, scaleFactor);
        scene.add(dot);

        // Compute the perpendicular plane normal at this point (cross product with Z-axis)
        const ringTangent = new THREE.Vector3(-Math.sin(theta), Math.cos(theta), 0); // Derivative of ring curve
        const orbitNormal = new THREE.Vector3().crossVectors(ringTangent, new THREE.Vector3(0, 0, 1)).normalize();

        // Store dot data with wobbling randomness
        dots.push({
            mesh: dot,
            baseTheta: theta,
            orbitNormal: orbitNormal,
            orbitAngleOffset: Math.random() * Math.PI * 2, // Randomized start
            orbitSpeed: baseOrbitSpeed + (Math.random() - 0.5) * 0.2, // Slightly different speeds
            orbitSize: orbitRadius + (Math.random() - 0.5) * 2.0, // Random orbit size
            driftFactor: (Math.random() - 0.5) * 0.2 // Random drift to add wobbly motion
        });
    }

    for (let i = 0; i < numDots; i++) {
        const theta = (i / numDots) * Math.PI * 2; // Position along the main ring
        const x = ringRadius * Math.cos(theta);
        const y = ringRadius * Math.sin(theta);
        const z = 0; // Keep the ring flat in the XY plane

        // Create dot mesh
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        const scaleFactor = Math.random() * 0.8 + 0.6; // Random size between 0.6 and 1.4
        dot.position.set(x, y, z);
        dot.scale.set(scaleFactor, scaleFactor, scaleFactor);
        scene.add(dot);

        // Compute the perpendicular plane normal at this point (cross product with Z-axis)
        const ringTangent = new THREE.Vector3(-Math.sin(theta), Math.cos(theta), 0); // Derivative of ring curve
        const orbitNormal = new THREE.Vector3().crossVectors(ringTangent, new THREE.Vector3(0, 0, 1)).normalize();

        // Store dot data with wobbling randomness
        dots.push({
            mesh: dot,
            baseTheta: theta,
            orbitNormal: orbitNormal,
            orbitAngleOffset: Math.random() * Math.PI * 2, // Randomized start
            orbitSpeed: baseOrbitSpeed + (Math.random() - 0.5) * 0.2, // Slightly different speeds
            orbitSize: orbitRadius + (Math.random() - 0.5) * 0.4, // Random orbit size
            driftFactor: (Math.random() - 0.5) * 0.2 // Random drift to add wobbly motion
        });
    }

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now() * 0.002; // Control animation speed

        // Animate Dots with Meandering, Drunken Orbits
        dots.forEach((dotData) => {
            const dot = dotData.mesh;
            const orbitAngle = time * dotData.orbitSpeed + dotData.orbitAngleOffset; // Time-based orbit movement

            // Get perpendicular orbit plane vectors
            const orbitNormal = dotData.orbitNormal;
            const orbitTangent = new THREE.Vector3().crossVectors(orbitNormal, new THREE.Vector3(0, 0, 1)).normalize();

            // Compute dot movement in the local perpendicular plane
            const localOrbitX = orbitNormal.x * Math.cos(orbitAngle) + orbitTangent.x * Math.sin(orbitAngle);
            const localOrbitY = orbitNormal.y * Math.cos(orbitAngle) + orbitTangent.y * Math.sin(orbitAngle);
            const localOrbitZ = orbitNormal.z * Math.cos(orbitAngle) + orbitTangent.z * Math.sin(orbitAngle);

            // Wobble effect: Introduce slight deviations
            const wobbleX = Math.sin(time * 0.7 + dotData.baseTheta) * dotData.driftFactor;
            const wobbleY = Math.cos(time * 0.5 + dotData.baseTheta) * dotData.driftFactor;
            const wobbleZ = Math.sin(time * 0.9 + dotData.baseTheta) * dotData.driftFactor;

            dot.position.set(
                (ringRadius + dotData.orbitSize * (localOrbitX + wobbleX)) * Math.cos(dotData.baseTheta),
                (ringRadius + dotData.orbitSize * (localOrbitY + wobbleY)) * Math.sin(dotData.baseTheta),
                dotData.orbitSize * (localOrbitZ + wobbleZ)
            );
        });

        renderer.render(scene, camera);
    }

    animate();

    // Handle Window Resize
    window.addEventListener("resize", () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
});
