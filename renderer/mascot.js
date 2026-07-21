import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const api = window.companion;
const root = document.getElementById('root');

// ---------- three.js scene ----------
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
camera.position.set(0, 1.35, 2.2);
camera.lookAt(0, 1.25, 0);

// Low-power renderer: no MSAA (transparent bg makes it near-invisible anyway),
// capped pixel ratio, low-power GPU hint. Cuts VRAM ~30-50% vs defaults.
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: false,
  premultipliedAlpha: false,
  powerPreference: 'low-power',
  stencil: false,
  depth: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
root.appendChild(renderer.domElement);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

// Pause render loop when window is hidden/minimized → 0% GPU, ~0% CPU.
let visible = true;
document.addEventListener('visibilitychange', () => {
  visible = document.visibilityState === 'visible';
});

// lighting
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(1, 2, 1.5);
scene.add(key);
const fill = new THREE.HemisphereLight(0xffffff, 0x444466, 0.6);
scene.add(fill);

// ---------- VRM ----------
const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

let currentVrm = null;
let mixer = null;
let idleAction = null;
const clock = new THREE.Clock();
let userScale = 1.0;
let dragging = false;

// Empty-state UI
const emptyEl = document.createElement('div');
emptyEl.id = 'empty';
emptyEl.innerHTML = `
  <div>
    <div>No avatar loaded.</div>
    <div style="opacity:.75;margin-top:6px;">Drop a <code>.vrm</code> file here, or</div>
    <button id="empty-pick">Choose VRM…</button>
  </div>
`;
document.body.appendChild(emptyEl);
emptyEl.querySelector('#empty-pick').addEventListener('click', async () => {
  const picked = await api.pickVrm();
  if (picked) await loadVrmFromPath(picked);
});

function showEmpty(show) {
  emptyEl.style.display = show ? 'flex' : 'none';
}

async function loadVrmFromPath(path) {
  if (!path) return;
  const dataUrl = await api.readVrmAsDataUrl(path);
  if (!dataUrl) return;
  await loadVrmFromUrl(dataUrl);
}

async function loadVrmFromUrl(url) {
  try {
    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm;
    if (!vrm) throw new Error('Not a VRM');
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    VRMUtils.rotateVRM0(vrm);

    if (currentVrm) {
      scene.remove(currentVrm.scene);
      VRMUtils.deepDispose(currentVrm.scene);
    }
    currentVrm = vrm;
    scene.add(vrm.scene);
    setScale(userScale);
    setupIdle(vrm);
    showEmpty(false);
  } catch (err) {
    console.error('VRM load failed', err);
    alert('Failed to load VRM: ' + err.message);
  }
}

function setScale(s) {
  userScale = s;
  if (currentVrm) currentVrm.scene.scale.setScalar(s);
}

// Procedural idle: gentle breathing + subtle sway. No VRMA needed.
function setupIdle(vrm) {
  // Blink handled in tick.
  vrm._blinkTimer = 2 + Math.random() * 2;
  vrm._breathePhase = 0;
}

// ---------- Look at cursor ----------
const mouse = { x: 0.5, y: 0.5 };
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX / window.innerWidth;
  mouse.y = e.clientY / window.innerHeight;
});

// A world-space target the VRM.lookAt tracks
const lookTarget = new THREE.Object3D();
lookTarget.position.set(0, 1.35, 2);
scene.add(lookTarget);

// ---------- Dragging the window ----------
let dragStart = null;
renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  dragging = true;
  dragStart = { sx: e.screenX, sy: e.screenY };
});
window.addEventListener('mousemove', (e) => {
  if (!dragging || !dragStart) return;
  const dx = e.screenX - dragStart.sx;
  const dy = e.screenY - dragStart.sy;
  if (dx === 0 && dy === 0) return;
  api.dragBy(dx, dy);
  dragStart = { sx: e.screenX, sy: e.screenY };
});
window.addEventListener('mouseup', () => {
  dragging = false;
  dragStart = null;
});

// Right-click → open settings; escape → hide
renderer.domElement.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  api.openSettings();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') api.hideMascot();
});

// ---------- Drag-drop VRM ----------
['dragover', 'dragenter'].forEach((ev) => window.addEventListener(ev, (e) => { e.preventDefault(); }));
window.addEventListener('drop', async (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
  const buf = await file.arrayBuffer();
  const blob = new Blob([buf]);
  const url = URL.createObjectURL(blob);
  await loadVrmFromUrl(url);
  // Persist path if available (Electron gives .path on File)
  if (file.path) api.setSettings({ vrmPath: file.path });
  URL.revokeObjectURL(url);
});

// ---------- Animation loop ----------


// FPS-capped animation loop. Skips work when hidden or when no VRM is loaded.
let fpsCap = 30;
let frameInterval = 1000 / fpsCap;
let lastFrame = 0;

function tick(now) {
  requestAnimationFrame(tick);
  if (!visible) return;
  if (now - lastFrame < frameInterval) return;
  lastFrame = now;

  const dt = clock.getDelta();
  if (!currentVrm) return; // nothing to draw → skip GPU submit entirely

  // Breathing
  currentVrm._breathePhase = (currentVrm._breathePhase || 0) + dt;
  const breath = Math.sin(currentVrm._breathePhase * 1.2) * 0.015;
  const chest = currentVrm.humanoid?.getNormalizedBoneNode('chest') || currentVrm.humanoid?.getNormalizedBoneNode('spine');
  if (chest) chest.rotation.x = breath;

  // Subtle head sway toward cursor
  const head = currentVrm.humanoid?.getNormalizedBoneNode('head');
  if (head) {
    const yaw = (mouse.x - 0.5) * 0.5;
    const pitch = (mouse.y - 0.5) * 0.3;
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, yaw, 0.15);
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, pitch, 0.15);
  }

  lookTarget.position.set((mouse.x - 0.5) * 2, 1.35 - (mouse.y - 0.5) * 1.2, 2);
  if (currentVrm.lookAt) currentVrm.lookAt.target = camera;

  // Blink
  currentVrm._blinkTimer -= dt;
  if (currentVrm.expressionManager) {
    let v = currentVrm.expressionManager.getValue('blink') ?? 0;
    if (currentVrm._blinkTimer <= 0) {
      v = Math.min(1, v + dt * 12);
      if (v >= 1) currentVrm._blinkTimer = 2 + Math.random() * 3;
    } else {
      v = Math.max(0, v - dt * 12);
    }
    currentVrm.expressionManager.setValue('blink', v);
  }

  currentVrm.update(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);

// ---------- Boot ----------
(async () => {
  const s = await api.getSettings();
  userScale = s.scale ?? 1;
  fpsCap = Math.max(15, Math.min(60, s.fpsCap ?? 30));
  frameInterval = 1000 / fpsCap;
  if (s.vrmPath) {
    await loadVrmFromPath(s.vrmPath);
  } else {
    showEmpty(true);
  }
  api.onSettingsUpdated(async (next) => {
    if (next.scale !== userScale) setScale(next.scale);
    if (next.fpsCap && next.fpsCap !== fpsCap) {
      fpsCap = Math.max(15, Math.min(60, next.fpsCap));
      frameInterval = 1000 / fpsCap;
    }
    if (next.vrmPath && (!currentVrm || next.vrmPath !== s.vrmPath)) {
      await loadVrmFromPath(next.vrmPath);
    }
  });
})();
