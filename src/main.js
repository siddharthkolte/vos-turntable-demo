import './style.css'
import * as THREE from 'three';
import { OrbitControls, GLTFLoader, RGBELoader, EffectComposer, OutputPass, SSRPass, GTAOPass, RenderPass, SMAAPass, TAARenderPass } from 'three/examples/jsm/Addons.js';
import { SetupPCSSShadow } from './core/pcssShadow.js';
import { renderOptions } from './runtime/settings.js';

if (renderOptions.PCSSShadow) SetupPCSSShadow();

const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const size = new THREE.Vector2(window.innerWidth, window.innerHeight);

const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 0.768;
renderer.setSize( size.width, size.height );
renderer.setAnimationLoop( onUpdate );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild( renderer.domElement );

const composer = new EffectComposer(renderer);

const taaRenderPass = new TAARenderPass(scene, camera);
taaRenderPass.unbiased = false;
taaRenderPass.sampleLevel = 2;
composer.addPass(taaRenderPass);

if (renderOptions.GTAOPass) {
   
  const gtaoPass = new GTAOPass( scene, camera, size.width, size.height );
  gtaoPass.output = GTAOPass.OUTPUT.Default;
  const aoParameters = {
    radius: 0.25,
    distanceExponent: 1.,
    thickness: 0.1,
    scale: 2.,
    samples: 16,
    distanceFallOff: 1.,
    screenSpaceRadius: false,
  };
  const pdParameters = {
    lumaPhi: 10.,
    depthPhi: 2.,
    normalPhi: 3.,
    radius: 0.,
    radiusExponent: 1.,
    rings: 2.,
    samples: 16,
  };

  gtaoPass.updateGtaoMaterial(aoParameters);
  gtaoPass.updatePdMaterial( pdParameters );
  composer.addPass( gtaoPass );
}

composer.addPass(new OutputPass());

const hdriLoader = new RGBELoader();
hdriLoader.load("/textures/hdri/city.hdr", (texData) => {
  texData.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texData;
  scene.environmentIntensity = 0.75;
}, null, (error) => console.log(error));

const loader = new GLTFLoader();
loader.load("/pump/Pump_02.gltf", (data) => {
  data.scene.position.set(1.5,0,0);
  data.scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.geometry.computeVertexNormals();
    }
  });
  scene.add(data.scene);
}, null, (error) => console.log(error));

const light = new THREE.DirectionalLight( 0xffffff, 1. );
light.position.set( 0, 5, 0 ); //default; light shining from top
light.castShadow = true; // default false
scene.add( light );

light.shadow.normalBias = 1.;

const d = 10;

light.shadow.camera.left = -d;
light.shadow.camera.right = d;
light.shadow.camera.top = d;
light.shadow.camera.bottom = -d;

//Set up shadow properties for the light
light.shadow.mapSize.width = 1024; // default
light.shadow.mapSize.height = 1024; // default
light.shadow.camera.near = 0.1; // default
light.shadow.camera.far = 100; // default
light.shadow.bias = 0.001;
light.shadow.blurSamples = 4;

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.maxDistance = 10;
orbitControls.minDistance = 8;
orbitControls.enablePan = false;
orbitControls.keyRotateSpeed = 0;

orbitControls.minPolarAngle = -Math.PI - (10 * THREE.MathUtils.DEG2RAD);
orbitControls.maxPolarAngle = Math.PI - (10 * THREE.MathUtils.DEG2RAD);

orbitControls.autoRotate = false;
orbitControls.autoRotateSpeed = 0.0;

const autoOrbitSpeed = -3.0;
const autoOrbitTransitionIncrement = 0.01;
const autoOrbitIdealPitch = Math.PI / 2 - (20 * THREE.MathUtils.DEG2RAD);
const orbitWaitTime = 2.0;
var orbitTimer = 0.0;

camera.position.set(-6,4,6);
camera.lookAt(0,0,0);

orbitControls.saveState();
var orbitActivate = false;

window.addEventListener('mousedown', (event) => {
  if (event.button == 0) orbitActivate = true;
});

window.addEventListener('mousemove', (event) => {
  if (orbitActivate) {
    orbitTimer = 0.0;
    orbitControls.autoRotate = false;
    orbitControls.autoRotateSpeed = 0.0;
    
    orbitControls.minPolarAngle = -Math.PI - (10 * THREE.MathUtils.DEG2RAD);
    orbitControls.maxPolarAngle = Math.PI - (10 * THREE.MathUtils.DEG2RAD);
  }
});

window.addEventListener('mouseup', (event) => {
  orbitActivate = false;
});

function onUpdate() {
  orbitTimer += clock.getDelta();

  if (orbitTimer > orbitWaitTime) {
    orbitControls.autoRotate = true;

    if (Math.abs(orbitControls.autoRotateSpeed - autoOrbitSpeed) > 0.01) orbitControls.autoRotateSpeed = THREE.MathUtils.lerp(orbitControls.autoRotateSpeed, autoOrbitSpeed, autoOrbitTransitionIncrement);
    else orbitControls.autoRotateSpeed = autoOrbitSpeed;

    orbitControls.minPolarAngle = orbitControls.maxPolarAngle = orbitControls.getPolarAngle();
    orbitControls.minPolarAngle = orbitControls.maxPolarAngle = THREE.MathUtils.lerp(orbitControls.minPolarAngle, autoOrbitIdealPitch, autoOrbitTransitionIncrement);
    
  }

  orbitControls.update();
  composer.render( scene, camera );
}