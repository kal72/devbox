# Devbox — Architecture Document

## Overview

Devbox is a client-side developer toolbox built as a single-page application (SPA). It runs entirely in the browser — no backend, no server, no network requests. All processing happens locally using browser-native APIs.

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Language | TypeScript 6 |
| Bundler | Vite 8 |
| Styling | Vanilla CSS (no UI library) |
| Linting | ESLint + typescript-eslint |

## Application Structure

```
src/
├── main.tsx                  # React root mount
├── App.tsx                   # Route switcher
├── hooks/
│   ├── useHashRoute.ts       # Hash-based client-side router
│   └── useTheme.ts           # Theme state (light / dark / system)
├── components/
│   ├── layout/
│   │   ├── Layout.tsx        # Page shell (header + sidebar + content)
│   │   ├── Header.tsx        # Top bar with theme toggle
│   │   └── Sidebar.tsx       # Navigation with tool links
│   ├── common/
│   │   ├── CodeEditor.tsx    # Shared textarea-based code input
│   │   └── ThemeToggle.tsx   # Theme toggle button
│   └── tools/
│       ├── JsonFormatter.tsx # JSON beautify / minify / validate
│       ├── JsonToTable.tsx   # JSON array → grid + CSV export
│       ├── UuidGenerator.tsx # UUID v4 / v7 generator
│       ├── JwtTool.tsx       # JWT encode / decode / verify
│       └── SqlTool.tsx       # SQL format / minify
└── styles/
    ├── reset.css
    ├── variables.css         # CSS custom properties (design tokens)
    └── global.css
```

## Routing

The app uses a **hash-based router** (`useHashRoute`) with no external routing library. Navigation works by changing `window.location.hash` (e.g. `#/formatter`, `#/jwt`). The hook listens to `hashchange` events and returns the active route as a typed union:

```
Route = 'formatter' | 'table' | 'uuid' | 'jwt' | 'sql'
```

`App.tsx` renders the matching tool component via conditional rendering. The default route is `#/formatter`.

## Layout

```
┌──────────────────────────────────────────────┐
│  Header (title + theme toggle)               │
├─────────────┬────────────────────────────────┤
│  Sidebar    │  <Tool Component>              │
│  (nav)      │                                │
│             │                                │
└─────────────┴────────────────────────────────┘
```

`Layout` receives `currentRoute` from `App` and passes it down to `Sidebar` so the active nav item can be highlighted.

## Theming

`useTheme` manages three states: `system`, `light`, `dark`.

- **system** (default): follows `prefers-color-scheme` media query, no class on `<html>`, meta `color-scheme: light dark`.
- **light / dark** (pinned): persisted in `localStorage`, adds `theme-light` or `theme-dark` class to `<html>`, sets `meta[name=color-scheme]`.

Toggle behavior: system → opposite of system preference → back to system.

## Tools

### JSON Formatter (`#/formatter`)
- Beautify (configurable indent: 2 spaces, 4 spaces, tab)
- Minify
- Validate — extracts line number from the native `JSON.parse` error message
- Loose format — custom character-by-character parser for displaying invalid JSON in a readable way
- Stats: byte size, line count, total key/node count

### JSON to Table (`#/table`)
- Parses a JSON array and renders it as an HTML table grid
- CSV export

### UUID Generator (`#/uuid`)
- UUID v4: uses `crypto.randomUUID()` with a manual fallback using `crypto.getRandomValues`
- UUID v7: timestamp-prefixed using `Date.now()` encoded into the first 48 bits, then random bits with version/variant nibbles set

### JWT Tool (`#/jwt`)
- **Decode mode**: splits the token on `.`, base64url-decodes each segment, pretty-prints header and payload, verifies the HMAC signature using `crypto.subtle`
- **Encode mode**: assembles a header+payload signing input, signs with `crypto.subtle.sign('HMAC', ...)`, produces a complete token
- Supports HS256, HS384, HS512
- All crypto is done in-browser via the Web Crypto API — the secret never leaves the client

### SQL Formatter (`#/sql`)
- Format (beautify) and minify SQL queries

## Shared Component: CodeEditor

`CodeEditor` is a thin wrapper around `<textarea>` used consistently across tools as the code input/output surface. It supports `readOnly` mode for output panels.

## Clipboard Copy Strategy

All tools use the same two-step copy fallback pattern:

1. `document.execCommand('copy')` via a temporarily injected hidden textarea (works in most browser contexts)
2. `navigator.clipboard.writeText()` (async Clipboard API) as a secondary attempt
3. If both fail, visually select the text and prompt the user to press `Cmd/Ctrl+C`

## Build & Deployment

```bash
yarn dev       # Vite dev server with HMR
yarn build     # tsc type check + Vite production bundle → dist/
yarn preview   # Preview production build locally
yarn lint      # ESLint
```

Output is a fully static bundle in `dist/`. Can be served from any static host (Nginx, GitHub Pages, Netlify, etc.) with no server-side configuration needed.

## Design Principles

- **Zero dependencies at runtime** — no external libraries in `dependencies` beyond React and React DOM.
- **No network requests** — all tools operate on local state only.
- **Browser-native APIs** — `crypto.subtle`, `crypto.getRandomValues`, `crypto.randomUUID`, `Blob` for byte size, `MediaQueryList` for system theme detection.
- **CSS custom properties** — design tokens in `variables.css` drive the entire visual system, making theming a single-class toggle.
