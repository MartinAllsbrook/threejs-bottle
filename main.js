import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Video setup
const video = document.createElement('video');
video.src = 'static/ip-trimmed-drone.mp4';
video.loop = true;
video.muted = true;
video.playsInline = true;
video.play();

const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.format = THREE.RGBAFormat;

// Background plane with video
const planeGeometry = new THREE.PlaneGeometry(16, 9);
const planeMaterial = new THREE.MeshBasicMaterial({ 
    map: videoTexture,
    side: THREE.DoubleSide
});
const videoPlane = new THREE.Mesh(planeGeometry, planeMaterial);
videoPlane.position.z = -5;
scene.add(videoPlane);

// Function to update video plane size to cover screen
function updateVideoPlaneSize() {
    const distance = Math.abs(videoPlane.position.z - camera.position.z);
    const vFov = camera.fov * Math.PI / 180;
    const planeHeight = 2 * Math.tan(vFov / 2) * distance;
    const planeWidth = planeHeight * camera.aspect;
    
    // Video aspect ratio is 16:9
    const videoAspect = 16 / 9;
    const screenAspect = camera.aspect;
    
    // Scale to cover the screen (crop instead of squish)
    if (screenAspect > videoAspect) {
        // Screen is wider than video, fit to width
        const scale = planeWidth / 16;
        videoPlane.scale.set(scale, scale, 1);
    } else {
        // Screen is taller than video, fit to height
        const scale = planeHeight / 9;
        videoPlane.scale.set(scale, scale, 1);
    }
}

// Create cube render target for refraction
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
});

// Cube camera for environment mapping
const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
scene.add(cubeCamera);

// Glass cube with refraction
const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
const cubeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.0,
    transmission: 1.0,
    thickness: 0.5,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.0,
    transparent: true,
    opacity: 1.0,
    ior: 1.5,
    reflectivity: 0.5,
});

const glassCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
glassCube.position.z = 2;
scene.add(glassCube);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Position camera
camera.position.z = 7;

// Set initial video plane size
updateVideoPlaneSize();

// Animation variables
let time = 0;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    time += 0.01;
    
    // Oscillate cube back and forth (X-axis) and up and down (Y-axis)
    glassCube.position.x = Math.sin(time * 0.8) * 1.5;
    glassCube.position.y = Math.sin(time * 1.2) * 0.5;
    
    // Rotate cube slightly for more visual interest
    glassCube.rotation.y += 0.005;
    glassCube.rotation.x += 0.003;
    
    // Update cube camera for refraction effect
    glassCube.visible = false;
    cubeCamera.position.copy(glassCube.position);
    cubeCamera.update(renderer, scene);
    glassCube.visible = true;
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateVideoPlaneSize();
});

// Start animation
animate();
