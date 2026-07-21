const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('companion', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  pickVrm: () => ipcRenderer.invoke('vrm:pick'),
  listAvatars: () => ipcRenderer.invoke('avatars:list'),
  readVrmAsDataUrl: (path) => ipcRenderer.invoke('vrm:readAsDataURL', path),
  dragBy: (dx, dy) => ipcRenderer.send('window:drag', { dx, dy }),
  hideMascot: () => ipcRenderer.send('window:hide'),
  quit: () => ipcRenderer.send('app:quit'),
  openSettings: () => ipcRenderer.send('settings:open'),
  onSettingsUpdated: (cb) => {
    const handler = (_e, s) => cb(s);
    ipcRenderer.on('settings:updated', handler);
    return () => ipcRenderer.removeListener('settings:updated', handler);
  },
});
