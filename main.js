import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Globals ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xFFFAEC);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
});
const cubeCamera = new THREE.CubeCamera(0.01, 100, cubeRenderTarget);

let bottle = null;
let videoPlane = null;
let time = 0;

// --- Entry point ---
init();

// --- Functions ---

async function init() {
    initRenderer();
    scene.add(cubeCamera);
    initLighting();
    await Promise.all([loadBottle(), setupVideoBackground()]);
    camera.position.z = 10;
    camera.fov = 40;
    camera.updateProjectionMatrix();
    updateVideoPlaneSize();
    window.addEventListener('resize', onResize);
    animate();
}

function initRenderer() {
    const videoContainer = document.getElementsByClassName('video-content')[0];
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    videoContainer.appendChild(renderer.domElement);
}

function initLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
}

async function loadBottle() {
    const textureLoader = new THREE.TextureLoader();

    const bottleNormalMap = textureLoader.load('https://cdn.shopify.com/s/files/1/0565/4472/3021/files/GlassNormal.png?v=1776176035');
    bottleNormalMap.mapping = THREE.UVMapping;
    bottleNormalMap.wrapS = THREE.RepeatWrapping;
    bottleNormalMap.wrapT = THREE.RepeatWrapping;
    bottleNormalMap.repeat.set(1, -1);

    const frontLabelTexture = textureLoader.load('https://cdn.shopify.com/s/files/1/0565/4472/3021/files/FrontLabel.png?v=1776176032');
    frontLabelTexture.flipY = false;
    frontLabelTexture.mapping = THREE.UVMapping;

    const backLabelTexture = textureLoader.load('https://cdn.shopify.com/s/files/1/0565/4472/3021/files/BackLabel.png?v=1776176035');
    backLabelTexture.flipY = false;
    backLabelTexture.mapping = THREE.UVMapping;

    const capTexture = textureLoader.load('https://cdn.shopify.com/s/files/1/0565/4472/3021/files/CapTexture.png?v=1776176033');
    capTexture.flipY = false;
    capTexture.mapping = THREE.UVMapping;

    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.0,
        transmission: 1.0,
        thickness: 0.1,
        envMap: cubeRenderTarget.texture,
        envMapIntensity: 1.0,
        transparent: true,
        opacity: 1,
        ior: 1.5,
        reflectivity: 0.3,
        normalMap: bottleNormalMap,
    });

    const sharedLabelProps = {
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.5,
        envMap: cubeRenderTarget.texture,
        envMapIntensity: 0.5,
        alphaTest: 0.01,
        reflectivity: 0.1,
    };

    const materialMap = {
        Front_Inside:  { material: new THREE.MeshPhysicalMaterial({ ...sharedLabelProps, map: frontLabelTexture }),                renderOrder: 0 },
        Front_Outside: { material: new THREE.MeshPhysicalMaterial({ ...sharedLabelProps, map: frontLabelTexture, transparent: true }), renderOrder: 0 },
        Back_Inside:   { material: new THREE.MeshPhysicalMaterial({ ...sharedLabelProps, map: backLabelTexture }),                 renderOrder: 0 },
        Back_Outside:  { material: new THREE.MeshPhysicalMaterial({ ...sharedLabelProps, map: backLabelTexture, transparent: true }),  renderOrder: 0 },
        Cap:           { material: new THREE.MeshPhysicalMaterial({ ...sharedLabelProps, map: capTexture, transparent: true }),    renderOrder: 1 },
    };

    return new Promise((resolve, reject) => {
        new GLTFLoader().load('https://cdn.shopify.com/3d/models/9f0541156f356a39/Bottle.glb', (gltf) => {
            bottle = gltf.scene;

            bottle.traverse((child) => {
                if (!child.isMesh) return;
                const match = Object.keys(materialMap).find(key => child.name.includes(key));
                if (match) {
                    child.material = materialMap[match].material;
                    child.renderOrder = materialMap[match].renderOrder;
                } else {
                    child.material = glassMaterial;
                    child.renderOrder = 1;
                }
            });

            bottle.position.set(0, -2.1, 2);
            bottle.scale.setScalar(14);
            scene.add(bottle);
            resolve();
        }, undefined, reject);
    });
}

function setupVideoBackground() {
    const video = document.createElement('video');
    video.src = '//isolation-staging.myshopify.com/cdn/shop/videos/c/vp/989e9c7f98e749c1b3e037c7f3df1633/989e9c7f98e749c1b3e037c7f3df1633.HD-720p-4.5Mbps-81117813.mp4?v=0';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.play();

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;

    const planeMaterial = new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.DoubleSide,
        color: 0xFFFAEC,
    });

    videoPlane = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), planeMaterial);
    videoPlane.position.z = -5;
    scene.add(videoPlane);
}

function animate() {
    requestAnimationFrame(animate);

    time += 0.01;

    if (bottle) {
        bottle.rotation.y = Math.sin(time * 0.3) * 1.5;
        cubeCamera.position.copy(bottle.position);
        cubeCamera.update(renderer, scene);
    }

    renderer.render(scene, camera);
}

function updateVideoPlaneSize() {
    if (!videoPlane) return;

    const distance = Math.abs(videoPlane.position.z - camera.position.z);
    const vFov = camera.fov * Math.PI / 180;
    const planeHeight = 2 * Math.tan(vFov / 2) * distance;
    const planeWidth = planeHeight * camera.aspect;

    const videoAspect = 16 / 9;
    const scale = camera.aspect > videoAspect
        ? planeWidth / 16
        : planeHeight / 9;

    videoPlane.scale.setScalar(scale);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateVideoPlaneSize();
}


console.log(`
mm           mm        mm     mmmmmmmm mmm    mmm             mmmm    mmmmmmmm  mm    mm  mmmmm      mmmmmm     mmmm   
##          ####      ####    """""###  ##m  m##            m#""""#   """##"""  ##    ##  ##"""##    ""##""    ##""##  
##          ####      ####        ##"    ##mm##             ##m          ##     ##    ##  ##    ##     ##     ##    ## 
##         ##  ##    ##  ##     m##"      "##"               "####m      ##     ##    ##  ##    ##     ##     ##    ## 
##         ######    ######    m##         ##                    "##     ##     ##    ##  ##    ##     ##     ##    ## 
##mmmmmm  m##  ##m  m##  ##m  ###mmmmm     ##               #mmmmm#"     ##     "##mm##"  ##mmm##    mm##mm    ##mm##  
""""""""  ""    ""  ""    ""  """"""""     ""                """""       ""       """"    """""      """"""     """"   
`);
