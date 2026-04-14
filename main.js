document.addEventListener('DOMContentLoaded', function() {
    // Initialize particles.js
    particlesJS('particles-js', {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: "#2563eb" },
            shape: { type: "circle" },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: "#7c3aed", opacity: 0.4, width: 1 },
            move: { enable: true, speed: 2, direction: "none", random: true, straight: false, out_mode: "out" }
        },
        interactivity: {
            detect_on: "canvas",
            events: {
                onhover: { enable: true, mode: "repulse" },
                onclick: { enable: true, mode: "push" }
            },
            modes: {
                repulse: { distance: 100, duration: 0.4 },
                push: { particles_nb: 4 }
            }
        }
    });

    // Initialize 3D Bridge Model
    initBridgeModel();

    // Typing animation
    const typingText = document.querySelector('.typing-text');
    const words = ["Data Science", "AI Models", "Civil Engineering", "CodeStruct"];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isEnd = false;

    function type() {
        const currentWord = words[wordIndex];
        const currentChar = currentWord.substring(0, charIndex);
        typingText.textContent = currentChar;
        typingText.classList.add('active');
        
        if (!isDeleting && charIndex < currentWord.length) {
            charIndex++;
            setTimeout(type, 100);
        } else if (isDeleting && charIndex > 0) {
            charIndex--;
            setTimeout(type, 50);
        } else {
            typingText.classList.remove('active');
            isDeleting = !isDeleting;
            if (!isDeleting) {
                wordIndex = (wordIndex + 1) % words.length;
            }
            setTimeout(type, 1000);
        }
    }

    // Start typing animation after 2.5 seconds
    setTimeout(type, 2500);

    // Smooth scroll for CTA button
    document.querySelector('.cta-button').addEventListener('click', function(e) {
        e.preventDefault();
        
        // More elaborate confetti effect
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            
            // Use different colors
            confetti(Object.assign({}, defaults, { 
                particleCount, 
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: ['#2563eb', '#10b981', '#7c3aed']
            }));
            confetti(Object.assign({}, defaults, { 
                particleCount, 
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: ['#2563eb', '#10b981', '#7c3aed']
            }));
        }, 250);
        
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // Counter animation with improved animation
    function animateCounters() {
        const counters = document.querySelectorAll('.counter');
        const speed = 200;
        
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const count = +counter.innerText;
            const increment = target / speed;
            
            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(animateCounters, 1);
            } else {
                counter.innerText = target;
                
                // Add pulse animation when counter reaches target
                counter.style.animation = 'pulse 0.5s ease-in-out';
                setTimeout(() => {
                    counter.style.animation = '';
                }, 500);
            }
        });
    }

    // Start counters when visible
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            animateCounters();
        }
    }, { threshold: 0.5 });

    observer.observe(document.querySelector('.stats-container'));
    
    // Add mousemove parallax effect
    document.addEventListener('mousemove', function(e) {
        const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
        const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
        
        document.querySelector('.title').style.transform = `translate(${moveX}px, ${moveY}px)`;
        document.querySelector('.subtitle').style.transform = `translate(${moveX * 1.5}px, ${moveY * 1.5}px)`;
    });
});

// 3D Bridge Model with animations
function initBridgeModel() {
    const container = document.getElementById('bridge-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Lighting with animation
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Add point lights with animation
    const pointLight1 = new THREE.PointLight(0x10b981, 1, 50);
    pointLight1.position.set(10, 5, 10);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x2563eb, 1, 50);
    pointLight2.position.set(-10, -5, -10);
    scene.add(pointLight2);

    // Simple Bridge Geometry with improved materials
    const createBridgeSegment = (x) => {
        const group = new THREE.Group();
        
        // Road with better material
        const roadGeometry = new THREE.BoxGeometry(10, 0.5, 2);
        const roadMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            specular: 0x111111,
            shininess: 30
        });
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.position.set(x, 0, 0);
        group.add(road);
        
        // Pillars with better material
        const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.5, 5, 8);
        const pillarMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2563eb,
            specular: 0x111111,
            shininess: 30,
            emissive: 0x072a60,
            emissiveIntensity: 0.2
        });
        
        for (let z = -1; z <= 1; z += 2) {
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(x, -2.5, z * 1.5);
            pillar.rotation.x = Math.PI / 2;
            group.add(pillar);
        }
        
        // Cables with glowing material
        const cableMaterial = new THREE.LineBasicMaterial({ 
            color: 0x10b981,
            linewidth: 2
        });
        
        for (let z = -1; z <= 1; z += 2) {
            const points = [];
            points.push(new THREE.Vector3(x - 5, -1, z * 1.5));
            points.push(new THREE.Vector3(x, 1, 0));
            points.push(new THREE.Vector3(x + 5, -1, z * 1.5));
            
            const cableGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const cable = new THREE.Line(cableGeometry, cableMaterial);
            group.add(cable);
        }
        
        return group;
    };

    // Create bridge segments
    const bridgeSegments = [];
    for (let x = -20; x <= 20; x += 10) {
        const segment = createBridgeSegment(x);
        scene.add(segment);
        bridgeSegments.push(segment);
    }

    camera.position.set(0, 3, 10);
    camera.lookAt(0, 0, 0);

    // Animation loop with more complex animations
    let time = 0;
    function animate() {
        requestAnimationFrame(animate);
        
        time += 0.01;
        
        // Animate the entire scene
        scene.rotation.y += 0.005;
        
        // Animate individual bridge segments
        bridgeSegments.forEach((segment, i) => {
            segment.position.y = Math.sin(time + i * 0.3) * 0.2;
            segment.rotation.z = Math.sin(time + i * 0.5) * 0.03;
        });
        
        // Animate lights
        pointLight1.intensity = 1 + Math.sin(time * 2) * 0.5;
        pointLight2.intensity = 1 + Math.cos(time * 2) * 0.5;
        
        renderer.render(scene, camera);
    }

    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
