const api = window.companion;

const els = {
  vrmPath: document.getElementById('vrm-path'),
  pick: document.getElementById('pick-vrm'),
  preset: document.getElementById('preset'),
  scale: document.getElementById('scale'),
  scaleVal: document.getElementById('scale-val'),
  size: document.getElementById('size'),
  sizeVal: document.getElementById('size-val'),
  ontop: document.getElementById('ontop'),
  fps: document.getElementById('fps'),
  fpsVal: document.getElementById('fps-val'),
  quit: document.getElementById('quit'),
  close: document.getElementById('close'),
};

let current = {};
let presets = [];

function paint(s) {
  current = s;
  els.vrmPath.textContent = s.vrmPath || 'Not chosen';
  const match = presets.find((p) => p.path === s.vrmPath);
  els.preset.value = match ? match.path : '';
  els.scale.value = s.scale ?? 1;
  els.scaleVal.textContent = Number(els.scale.value).toFixed(2);
  els.size.value = s.windowSize ?? 420;
  els.sizeVal.textContent = els.size.value;
  els.ontop.checked = !!s.alwaysOnTop;
  els.fps.value = s.fpsCap ?? 60;
  els.fpsVal.textContent = els.fps.value;
}

(async () => {
  presets = (await api.listAvatars?.()) || [];
  for (const p of presets) {
    const opt = document.createElement('option');
    opt.value = p.path;
    opt.textContent = p.name;
    els.preset.appendChild(opt);
  }
  paint(await api.getSettings());
})();

els.preset.addEventListener('change', () => {
  const v = els.preset.value;
  if (v) api.setSettings({ vrmPath: v });
});
els.pick.addEventListener('click', async () => {
  const path = await api.pickVrm();
  if (path) els.vrmPath.textContent = path;
});
els.scale.addEventListener('input', () => {
  els.scaleVal.textContent = Number(els.scale.value).toFixed(2);
  api.setSettings({ scale: Number(els.scale.value) });
});
els.size.addEventListener('change', () => {
  els.sizeVal.textContent = els.size.value;
  api.setSettings({ windowSize: Number(els.size.value) });
});
els.ontop.addEventListener('change', () => api.setSettings({ alwaysOnTop: els.ontop.checked }));
els.fps.addEventListener('input', () => {
  els.fpsVal.textContent = els.fps.value;
  api.setSettings({ fpsCap: Number(els.fps.value) });
});
els.quit.addEventListener('click', () => api.quit());
els.close.addEventListener('click', () => window.close());

api.onSettingsUpdated(paint);
