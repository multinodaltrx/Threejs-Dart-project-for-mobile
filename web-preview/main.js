import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import GUI from 'lil-gui';

// MAGIC HAPPENS HERE: We import the exact files the Flutter team will use.
// ?raw tells Vite to import the file as a plain text string.
import vertexShader from '../mobile-assets/orb_vertex.glsl?raw';
import fragmentShader from '../mobile-assets/orb_frag.glsl?raw';
import presets from '../mobile-assets/presets.json';

// 1. Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// 2. Camera Setup
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 6);

// 3. Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 4. Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 15;

// 5. Shader Material Setup
const params = {
    preset: 'Default',
    ...presets['Default']
};

renderer.setPixelRatio(params.dpr);

const uniforms = {
    uTime: { value: 0 },
    uLocalCamPos: { value: new THREE.Vector3() },
    uPrimaryColor: { value: new THREE.Color(params.primaryEnergy) },
    uSecondaryColor: { value: new THREE.Color(params.secondaryEnergy) },
    uDensity: { value: params.density },
    uFractalIters: { value: params.fractalIters },
    uFractalScale: { value: params.fractalScale },
    uFractalDecay: { value: params.fractalDecay },
    uInternalAnim: { value: params.internalAnim },
    uSmoothness: { value: params.smoothness },
    uAsymmetry: { value: params.asymmetry }
};

const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,       // Loaded from mobile-assets
    fragmentShader: fragmentShader,   // Loaded from mobile-assets
    uniforms: uniforms,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

// Atmosphere Halo Material (Kept inline as it's optional for Flutter)
const atmosphereVertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const atmosphereFragmentShader = `
    uniform vec3 uColor;
    uniform float uGlow;
    uniform float uLevel;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float vdn = max(dot(normal, viewDir), 0.0);
        float edgeFade = smoothstep(0.0, 0.15, vdn);
        float innerFadePoint = clamp(1.0 - uLevel, 0.0, 0.99);
        float centerFade = smoothstep(1.0, innerFadePoint, vdn);
        float alpha = edgeFade * centerFade * uGlow;
        gl_FragColor = vec4(uColor, alpha);
    }
`;

const atmosphereUniforms = {
    uColor: { value: new THREE.Color(params.primaryEnergy) },
    uGlow: { value: params.atmosphereGlow },
    uLevel: { value: params.atmosphereLevel }
};

const atmosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: atmosphereUniforms,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

// 6. Object Creation
const geometry = new THREE.SphereGeometry(2.0, 128, 128);
const orb = new THREE.Mesh(geometry, material);
scene.add(orb);

const atmosphereMesh = new THREE.Mesh(geometry, atmosphereMaterial);
atmosphereMesh.scale.set(params.atmosphereScale, params.atmosphereScale, params.atmosphereScale);
orb.add(atmosphereMesh);

// --- Post-Processing Setup ---
const composer = new EffectComposer(renderer);
composer.setPixelRatio(params.dpr);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const ChromaticAberrationShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "uAmount": { value: params.chromaticAberration }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uAmount;
        varying vec2 vUv;
        void main() {
            vec4 baseColor = texture2D(tDiffuse, vUv);
            float luma = max(baseColor.r, max(baseColor.g, baseColor.b));
            float mask = smoothstep(0.01, 0.1, luma);
            vec2 offset = (vUv - 0.5) * uAmount;
            float r = texture2D(tDiffuse, vUv + offset).r;
            float g = texture2D(tDiffuse, vUv).g;
            float b = texture2D(tDiffuse, vUv - offset).b;
            vec3 aberratedColor = vec3(r, g, b);
            gl_FragColor = vec4(mix(baseColor.rgb, aberratedColor, mask), 1.0);
        }
    `
};
const caPass = new ShaderPass(ChromaticAberrationShader);
composer.addPass(caPass);

// 7. GUI Setup 
const gui = new GUI({ title: 'Orb Settings' });

gui.add(params, 'preset', Object.keys(presets)).name('Preset').onChange(val => {
    const p = presets[val];
    Object.assign(params, p);
    
    uniforms.uPrimaryColor.value.set(params.primaryEnergy);
    atmosphereUniforms.uColor.value.set(params.primaryEnergy);
    uniforms.uSecondaryColor.value.set(params.secondaryEnergy);
    atmosphereUniforms.uGlow.value = params.atmosphereGlow;
    atmosphereUniforms.uLevel.value = params.atmosphereLevel;
    atmosphereMesh.scale.set(params.atmosphereScale, params.atmosphereScale, params.atmosphereScale);
    uniforms.uDensity.value = params.density;
    caPass.uniforms.uAmount.value = params.chromaticAberration;
    renderer.setPixelRatio(params.dpr);
    composer.setPixelRatio(params.dpr);
    uniforms.uInternalAnim.value = params.internalAnim;
    uniforms.uSmoothness.value = params.smoothness;
    uniforms.uAsymmetry.value = params.asymmetry;
    uniforms.uFractalIters.value = params.fractalIters;
    uniforms.uFractalScale.value = params.fractalScale;
    uniforms.uFractalDecay.value = params.fractalDecay;
    
    gui.controllersRecursive().forEach(c => c.updateDisplay());
});

const styleFolder = gui.addFolder('Energy Style');
styleFolder.addColor(params, 'primaryEnergy').name('Primary Color').onChange(val => {
    uniforms.uPrimaryColor.value.set(val);
    atmosphereUniforms.uColor.value.set(val);
});
styleFolder.addColor(params, 'secondaryEnergy').name('Secondary Color').onChange(val => uniforms.uSecondaryColor.value.set(val));
styleFolder.add(params, 'atmosphereGlow', 0.0, 5.0, 0.01).name('Atmosphere Glow').onChange(val => atmosphereUniforms.uGlow.value = val);
styleFolder.add(params, 'atmosphereLevel', 0.1, 1.0, 0.01).name('Atmosphere Level').onChange(val => atmosphereUniforms.uLevel.value = val);
styleFolder.add(params, 'atmosphereScale', 1.0, 1.1, 0.001).name('Atmosphere Scale').onChange(val => atmosphereMesh.scale.set(val, val, val));
styleFolder.add(params, 'speed', 0.1, 3.0, 0.1).name('Internal Speed');
styleFolder.add(params, 'orbRotation', 0.0, 1.0, 0.01).name('Orb Auto-Rotation');
styleFolder.add(params, 'density', 0.1, 3.0, 0.1).name('Global Density').onChange(val => uniforms.uDensity.value = val);
styleFolder.add(params, 'chromaticAberration', 0.0, 0.05, 0.001).name('Chromatic Aberr.').onChange(val => caPass.uniforms.uAmount.value = val);
styleFolder.add(params, 'dpr', 0.1, 2.0, 0.1).name('Resolution (DPR)').onChange(val => {
    renderer.setPixelRatio(val);
    composer.setPixelRatio(val);
});

const fractalFolder = gui.addFolder('Fractal Structure');
fractalFolder.add(params, 'internalAnim', 0.0, 2.0, 0.01).name('Internal Anim Speed').onChange(val => uniforms.uInternalAnim.value = val);
fractalFolder.add(params, 'smoothness', 0.0, 0.15, 0.001).name('Corner Smoothness').onChange(val => uniforms.uSmoothness.value = val);
fractalFolder.add(params, 'asymmetry', 0.0, 1.0, 0.01).name('Asymmetry').onChange(val => uniforms.uAsymmetry.value = val);
fractalFolder.add(params, 'fractalIters', 2, 12, 1).name('Iterations').onChange(val => uniforms.uFractalIters.value = val);
fractalFolder.add(params, 'fractalScale', 0.3, 1.5, 0.01).name('Scale').onChange(val => uniforms.uFractalScale.value = val);
fractalFolder.add(params, 'fractalDecay', -25.0, -5.0, 0.1).name('Energy Decay').onChange(val => uniforms.uFractalDecay.value = val);

gui.close();

// 8. Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// 9. Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    uniforms.uTime.value += delta * params.speed;
    
    orb.rotation.y += delta * params.orbRotation;
    orb.rotation.x += delta * (params.orbRotation * 0.5);
    
    orb.updateMatrixWorld();
    
    const localCam = new THREE.Vector3().copy(camera.position);
    orb.worldToLocal(localCam);
    uniforms.uLocalCamPos.value.copy(localCam);

    controls.update();
    composer.render();
}

animate();
