# Security Policy

## Supported Versions

Only the latest release on the `main` branch receives security updates.

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| older   | ❌        |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report privately via one of:

1. GitHub's **"Report a vulnerability"** button under the repository's
   Security tab (preferred — creates a private advisory).
2. A private email to the maintainer listed in the repository profile.

Include:

- A clear description of the issue and its impact
- Steps to reproduce (proof-of-concept if possible)
- Affected version / commit
- Your suggested fix, if any

You should receive an acknowledgement within **72 hours**. We aim to publish
a fix or mitigation within **30 days** for confirmed high-severity issues.

## Scope

In-scope:

- The Electron app (`DesktopCompanion/`) — main process, preload, renderer
- The marketing landing site (`src/`)
- Build & release workflows (`.github/workflows/`)

Out-of-scope:

- Third-party VRM models supplied by users
- Vulnerabilities in upstream dependencies already tracked by their vendor
  (please report those to the vendor first)

## Hardening Notes for Contributors

- `contextIsolation: true` and `nodeIntegration: false` **must** remain on.
- Never expose `ipcRenderer` directly — go through `preload.cjs`.
- Validate all filesystem paths coming from the renderer.
- Do not load remote URLs into the mascot window.
