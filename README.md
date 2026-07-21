# DesktopCompanion

Open-source desktop mate (VRM mascot) — transparent, frameless, always-on-top.
Built with **Electron + three.js + @pixiv/three-vrm**. Runs on Windows, Linux, and macOS.

Ships with 7 preset avatars bundled inside the app — no external downloads.
Users can also load their own `.vrm` file from Settings.

## Download

Grab the latest build from [Releases](../../releases):

- **Windows** — `DesktopCompanion-win32-x64.zip`
- **Linux** — `DesktopCompanion-linux-x64.tar.gz`
- **macOS** — `DesktopCompanion-darwin-universal.zip` (Intel + Apple Silicon)

Extract and launch `DesktopCompanion` (`.exe` on Windows, `.app` on macOS).

## Build from source

```bash
bun install                        # or: npm install
bun run electron:package:win       # or :linux / :mac
```

Output lands in `electron-release/DesktopCompanion-<platform>-<arch>/`.
See [`build/PLATFORMS.md`](./build/PLATFORMS.md) for per-OS notes.

## Project layout

```
DesktopCompanion/
├── main.cjs          # Electron main process
├── preload.cjs       # Context-isolated IPC bridge
├── renderer/         # Vite bundle (mascot + settings)
│   └── public/avatars/*.vrm   # Bundled preset avatars
├── build/            # Build & platform notes
└── .github/          # Workflows, issue/PR templates
```

## Adding your own VRM

Drop any `.vrm` into `renderer/public/avatars/` before building and it appears
in Settings → Preset avatar. Users can also pick a custom file at runtime
via tray → "Choose VRM…".

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
Security issues: [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
