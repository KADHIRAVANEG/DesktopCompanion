# Platform Builds

DesktopCompanion ships from one codebase to Windows, Linux, and macOS via
`@electron/packager`. All 7 preset VRMs are bundled inside the app on every
platform — no external downloads.

## Local build commands

Run from the repo root after `bun install` (or `npm install`):

| Platform | Command | Output folder |
| --- | --- | --- |
| Windows x64 | `bun run electron:package:win` | `electron-release/DesktopCompanion-win32-x64/` |
| Linux x64 | `bun run electron:package:linux` | `electron-release/DesktopCompanion-linux-x64/` |
| macOS (Intel + Apple Silicon) | `bun run electron:package:mac` | `electron-release/DesktopCompanion-darwin-universal/` |

Launch:
- **Windows**: `DesktopCompanion.exe`
- **Linux**: `./DesktopCompanion` (may need `chmod +x`)
- **macOS**: open `DesktopCompanion.app`

## Cross-compiling

`@electron/packager` cross-compiles from any host, but for smooth results:
- Build the Windows target on Windows (correct icon embedding, code signing later).
- Build the macOS target on macOS (required for future notarization / `.dmg`).
- Linux builds from anywhere.

The GitHub Actions workflow (`.github/workflows/release.yml`) already runs each
target on its native runner (`windows-latest`, `ubuntu-latest`, `macos-latest`),
so tag pushes produce all three artifacts.

## Release artifacts

Tag push `vX.Y.Z` produces one GitHub Release with:

- `DesktopCompanion-win32-x64.zip`
- `DesktopCompanion-linux-x64.tar.gz`
- `DesktopCompanion-darwin-universal.zip`

## Platform notes

- **macOS transparency**: frameless + `transparent: true` works out of the box.
  Gatekeeper will warn on first launch until the app is code-signed — users can
  right-click → Open to bypass.
- **Linux transparency**: requires a compositor (GNOME/KDE default, some tiling
  WMs need `picom` or similar). Without one the mascot renders on a solid
  background.
- **Tray icon**: macOS expects a small monochrome template image. The current
  `assets/tray.png` fallback works; swap in a `@2x` template PNG later for
  Retina.
- **Global shortcut**: the `M` hotkey registered in `main.cjs` works on all
  three platforms.
