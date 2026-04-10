import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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


//#region Background video and refraction setup

// Background plane with video
const planeGeometry = new THREE.PlaneGeometry(16, 9);
const planeMaterial = new THREE.MeshBasicMaterial({ 
    map: videoTexture,
    side: THREE.DoubleSide
});
const videoPlane = new THREE.Mesh(planeGeometry, planeMaterial);
videoPlane.position.z = -5;
scene.add(videoPlane);

// Create cube render target for refraction
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
});

// Cube camera for environment mapping
const cubeCamera = new THREE.CubeCamera(0.01, 100, cubeRenderTarget);
scene.add(cubeCamera);

//#endregion



//#region Load bottle GLB model

console.log('Loading bottle model...');
let bottle = null;
let bottle2 = null;
const loader = new GLTFLoader();

const bottleLoadStartTime = performance.now();

const bottleNormalMap = new THREE.TextureLoader().load('static/GlassNormal.png');
bottleNormalMap.mapping = THREE.UVMapping;
bottleNormalMap.wrapS = THREE.RepeatWrapping;
bottleNormalMap.wrapT = THREE.RepeatWrapping;
bottleNormalMap.repeat.set(1, -1);

const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.0,
    transmission: 1.0,
    thickness: 0.25,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.0,
    transparent: true,
    opacity: 1,
    ior: 1.5,
    reflectivity: 0.3,
    normalMap: bottleNormalMap,
});

const frontLabelTexture = new THREE.TextureLoader().load('static/Front512.png');
frontLabelTexture.flipY = false;
frontLabelTexture.mapping = THREE.UVMapping;

const backOutsideLabelTexture = new THREE.TextureLoader().load('static/BackOuter512.png');
backOutsideLabelTexture.flipY = false;
backOutsideLabelTexture.mapping = THREE.UVMapping;

const backInsideLabelTexture = new THREE.TextureLoader().load('static/BackInner512.png');
backInsideLabelTexture.flipY = false;
backInsideLabelTexture.mapping = THREE.UVMapping;


const frontLabelMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.5,
    envMap: cubeRenderTarget.texture,
    transparent: true,
    envMapIntensity: 0.5,
    alphaTest: 0.01,
    reflectivity: 0.1,
    map: frontLabelTexture,
});

const backOutsideLabelMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.5,
    envMap: cubeRenderTarget.texture,
    transparent: true,
    envMapIntensity: 0.5,
    alphaTest: 0.01,
    reflectivity: 0.1,
    map: backOutsideLabelTexture,
});

const backInsideLabelMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.5,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 0.5,
    alphaTest: 0.01,
    reflectivity: 0.1,
    map: backInsideLabelTexture,
});

loader.load('static/Bottle.glb', (gltf) => {
    const bottleLoadEndTime = performance.now();
    console.log(`Bottle loaded in ${(bottleLoadEndTime - bottleLoadStartTime).toFixed(2)}ms`);
    
    bottle = gltf.scene;

    console.log(bottle);
    
    for (const child of bottle.children) {
        console.log(child);
    }

    // Apply glass material with refraction to all meshes in the bottle
    bottle.traverse((child) => {
        if (child.isMesh) {
            if (child.name.includes('Front')) {
                child.material = frontLabelMaterial;
                child.renderOrder = 0;
            } else if (child.name.includes('Outside')) {
                child.material = backOutsideLabelMaterial;
                child.renderOrder = 0;
            } else if (child.name.includes('Inside')) {
                child.material = backInsideLabelMaterial;
                child.renderOrder = 0;
            } else {
                child.material = glassMaterial;
                child.renderOrder = 1;
            }
        }
    });
    
    bottle.position.z = 2;
    bottle.scale.set(10, 10, 10);
    scene.add(bottle);
}, undefined, (error) => {
    console.error('Error loading bottle model:', error);
}); 

//#endregion

//#region Lighting

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

//#endregion

// Position camera
camera.position.z = 10;
camera.fov = 40;
camera.updateProjectionMatrix();

// Set initial video plane size
updateVideoPlaneSize();

// Animation variables
let time = 0;

// Start animation
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateVideoPlaneSize();
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    time += 0.01;
    
    if (bottle) {
        // Position
        // bottle.position.x = Math.sin(time * 0.8) * 0.2;
        bottle.position.y = -1.5;
        
        // Rotation
        bottle.rotation.y = time * -0.3;
        bottle.rotation.y = Math.sin(time * 0.3) * 3;
        // bottle.rotation.x += Math.sin(time * 1.2) * 0.002;
        
        // Refraction update
        // bottle.visible = false;
        cubeCamera.position.copy(bottle.position);
        cubeCamera.update(renderer, scene);
        // bottle.visible = true;
    }
    
    renderer.render(scene, camera);
}

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