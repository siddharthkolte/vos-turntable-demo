import './style.css'
import * as THREE from 'three';
import { GLTFLoader, OrbitControls, RGBELoader, EffectComposer, OutputPass, SSRPass, SSAARenderPass, GTAOPass, RenderPass, SMAAPass } from 'three/examples/jsm/Addons.js';
import { SetupPCSSShadow } from './core/pcssShadow.js';
import { renderOptions } from './runtime/settings.js';

if (renderOptions.PCSSShadow) SetupPCSSShadow();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const size = new THREE.Vector2(window.innerWidth, window.innerHeight);

const renderer = new THREE.WebGLRenderer({antialias: false, alpha: true});
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 0.768;
renderer.setSize( size.width, size.height );
renderer.setAnimationLoop( onUpdate );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild( renderer.domElement );

const composer = new EffectComposer(renderer);

if (renderOptions.SSAAPass) {
  const ssaaPass = new SSAARenderPass(scene, camera);
  ssaaPass.clearAlpha = true;
  composer.addPass( ssaaPass );
}

if (renderOptions.SSRPass) {
  const ssrPass = new SSRPass({renderer, scene, camera, width:size.width, height:size.height});
  ssrPass.beautyRenderTarget.samples = 8;
  ssrPass.maxDistance = 2.5;
  ssrPass.blur = true;
  ssrPass.fresnel = true;
  composer.addPass(ssrPass);
}

if (renderOptions.GTAOPass) {
  if (!renderOptions.SSAAPass || !renderOptions.SSRPass) composer.addPass(new RenderPass(scene, camera));

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

if (renderOptions.SMAAPass) {
  const smaaPass = new SMAAPass(scene, camera);
  composer.addPass(smaaPass);
}

if (renderOptions.SMAAPass || renderOptions.SSAAPass || renderOptions.SSRPass || renderOptions.GTAOPass) composer.addPass(new OutputPass());
else {
  composer.addPass(new RenderPass(scene, camera));
}

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

camera.position.set(-30,15,30);

function onUpdate() {

  orbitControls.update();
  composer.render( scene, camera );

}