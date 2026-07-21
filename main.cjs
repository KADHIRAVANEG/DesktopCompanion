// Electron main process for DesktopCompanion.
// Transparent, frameless, always-on-top mascot window + tray + settings.
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, screen, globalShortcut, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = !app.isPackaged;

// ---- Low-power hardening (must run before app.whenReady) ----
// Reduce background CPU/GPU + memory usage.
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService,CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
// Ask the OS scheduler to keep us out of the way.
if (process.platform === 'win32') app.setAppUserModelId('dev.desktopcompanion');

const rendererDir = path.join(__dirname, 'renderer', 'dist');

const userDataDir = app.getPath('userData');
const settingsPath = path.join(userDataDir, 'settings.json');

function defaultAvatarPath() {
  const dir = path.join(rendererDir, 'avatars');
  try {
    const first = fs.readdirSync(dir).find((f) => f.toLowerCase().endsWith('.vrm'));
    return first ? path.join(dir, first) : null;
  } catch { return null; }
}

const defaultSettings = {
  vrmPath: null,
  scale: 1.0,
  alwaysOnTop: true,
  fpsCap: 60,
  windowX: null,
  windowY: null,
  windowSize: 420,
};

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings(s) {
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}

let settings = defaultSettings;
let mascotWindow = null;
let settingsWindow = null;
let tray = null;

function createMascotWindow() {
  const size = settings.windowSize || 420;
  const display = screen.getPrimaryDisplay();
  const x = settings.windowX ?? display.workArea.x + display.workArea.width - size - 40;
  const y = settings.windowY ?? display.workArea.y + display.workArea.height - size - 40;

  mascotWindow = new BrowserWindow({
    width: size,
    height: size,
    x,
    y,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: settings.alwaysOnTop,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Keep the render loop running when the window is behind others
      // (mascot is always-on-top; user still sees it moving).
      backgroundThrottling: false,
      devTools: isDev,
      spellcheck: false,
      webgl: true,
      // No need for images/webAudio outside the 3D canvas.
      autoplayPolicy: 'document-user-activation-required',
    },
  });

  if (settings.alwaysOnTop) {
    mascotWindow.setAlwaysOnTop(true, 'screen-saver');
  }

  const indexHtml = path.join(rendererDir, 'index.html');
  if (isDev && process.env.RENDERER_URL) {
    mascotWindow.loadURL(process.env.RENDERER_URL);
  } else {
    mascotWindow.loadFile(indexHtml);
  }

  mascotWindow.on('moved', () => {
    const [wx, wy] = mascotWindow.getPosition();
    settings.windowX = wx;
    settings.windowY = wy;
    saveSettings(settings);
  });

  mascotWindow.on('closed', () => {
    mascotWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 480,
    height: 560,
    resizable: false,
    title: 'DesktopCompanion Settings',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const url = path.join(rendererDir, 'settings.html');
  settingsWindow.loadFile(url);
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function buildTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  let img;
  try {
    img = nativeImage.createFromPath(iconPath);
    if (img.isEmpty()) throw new Error('empty');
  } catch {
    // fallback 16x16 transparent icon
    img = nativeImage.createEmpty();
  }
  tray = new Tray(img);
  tray.setToolTip('DesktopCompanion');
  const menu = Menu.buildFromTemplate([
    { label: 'Show / Hide', click: () => mascotWindow && (mascotWindow.isVisible() ? mascotWindow.hide() : mascotWindow.show()) },
    { label: 'Settings…', click: createSettingsWindow },
    { label: 'Choose VRM…', click: pickVrm },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => mascotWindow && (mascotWindow.isVisible() ? mascotWindow.hide() : mascotWindow.show()));
}

async function pickVrm() {
  const result = await dialog.showOpenDialog({
    title: 'Choose a VRM avatar',
    filters: [{ name: 'VRM models', extensions: ['vrm'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  settings.vrmPath = result.filePaths[0];
  saveSettings(settings);
  broadcastSettings();
  return result.filePaths[0];
}

function broadcastSettings() {
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send('settings:updated', settings);
  }
}

// ---- IPC ----
ipcMain.handle('settings:get', () => settings);
ipcMain.handle('settings:set', (_e, patch) => {
  settings = { ...settings, ...patch };
  saveSettings(settings);
  if (mascotWindow) {
    mascotWindow.setAlwaysOnTop(!!settings.alwaysOnTop, settings.alwaysOnTop ? 'screen-saver' : 'normal');
  }
  broadcastSettings();
  return settings;
});
ipcMain.handle('vrm:pick', pickVrm);
ipcMain.handle('avatars:list', () => {
  const dir = path.join(rendererDir, 'avatars');
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith('.vrm'))
      .map((f) => ({ name: f.replace(/\.vrm$/i, ''), path: path.join(dir, f) }));
  } catch {
    return [];
  }
});
ipcMain.handle('vrm:readAsDataURL', async (_e, filePath) => {
  if (!filePath) return null;
  try {
    const buf = fs.readFileSync(filePath);
    return `data:model/gltf-binary;base64,${buf.toString('base64')}`;
  } catch (err) {
    console.error('vrm:readAsDataURL failed', err);
    return null;
  }
});

// Drag: renderer requests window move deltas
ipcMain.on('window:drag', (_e, { dx, dy }) => {
  if (!mascotWindow) return;
  const [x, y] = mascotWindow.getPosition();
  mascotWindow.setPosition(Math.round(x + dx), Math.round(y + dy));
});

ipcMain.on('window:hide', () => mascotWindow && mascotWindow.hide());
ipcMain.on('app:quit', () => app.quit());
ipcMain.on('settings:open', () => createSettingsWindow());

app.whenReady().then(() => {
  settings = loadSettings();
  if (!settings.vrmPath) {
    settings.vrmPath = defaultAvatarPath();
    saveSettings(settings);
  }
  createMascotWindow();
  buildTray();
  globalShortcut.register('M', () => {
    if (settingsWindow) settingsWindow.focus();
    else createSettingsWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  // keep tray running
  e.preventDefault?.();
});
