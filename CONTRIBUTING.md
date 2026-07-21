# Contributing to DesktopCompanion

Thanks for helping build an open desktop mate! 💙

## Quick start

```bash
git clone https://github.com/OWNER/DesktopCompanion.git
cd DesktopCompanion
bun install                       # or: npm install
bun run renderer:build
bun run electron:package:win      # or :linux / :mac
```

Output goes to `electron-release/DesktopCompanion-<platform>-<arch>/`.

## Project layout

```
DesktopCompanion/
├── main.cjs          # Electron main process (window, tray, IPC, settings)
├── preload.cjs       # Context-isolated bridge exposed as window.companion
├── renderer/         # Standalone Vite bundle (mascot + settings windows)
│   ├── index.html
│   ├── mascot.js     # three-vrm scene, idle animation, cursor look-at
│   ├── settings.html
│   ├── settings.js
│   ├── public/avatars/*.vrm   # Bundled preset avatars (ship inside the app)
│   └── vite.config.mjs
├── build/            # Build & platform notes
└── .github/          # Workflows, issue/PR templates
```

## Ground rules

- Keep the mascot lightweight. Idle RAM budget: **≤ 250 MB**. Idle CPU: **≤ 2%**.
- Do not disable `contextIsolation` or enable `nodeIntegration`.
- New IPC handlers go through `preload.cjs` with a narrow API surface.
- All default VRMs must remain bundled inside the app — no runtime downloads.

## Releasing

Releases are automated by `.github/workflows/release.yml`:

1. Bump the version in `package.json`.
2. Tag the commit: `git tag v0.2.0 && git push --tags`.
3. GitHub Actions builds Windows, Linux, and macOS artifacts and publishes a Release.

For a dry run without publishing, use the **Run workflow** button on the Actions tab.

## Reporting bugs / suggesting features

Use the templates under **Issues → New issue**. Security issues follow [SECURITY.md](./SECURITY.md).

## Code of Conduct

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).
