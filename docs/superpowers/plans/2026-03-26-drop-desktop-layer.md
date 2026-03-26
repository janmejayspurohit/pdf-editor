# Drop Desktop/Tauri Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Tauri desktop and proprietary layer code, collapsing the frontend to a single web-only build that targets `src/core/` directly.

**Architecture:** The frontend currently uses a 3-tier path alias cascade (`desktop/ → proprietary/ → core/`) to support multiple build targets. After this cleanup, `@app/*` resolves directly to `src/core/*` — no layers, no stubs, no mode switching. The build always produces a web SPA proxied to the Spring Boot backend.

**Tech Stack:** React, TypeScript, Vite, Spring Boot (backend unchanged)

---

## Files Modified

| File | Change |
|------|--------|
| `frontend/src-tauri/` | **DELETE** entire directory |
| `frontend/src/desktop/` | **DELETE** entire directory |
| `frontend/tsconfig.desktop.vite.json` | **DELETE** |
| `frontend/tsconfig.saas.vite.json` | **DELETE** |
| `frontend/tsconfig.proprietary.vite.json` | **DELETE** |
| `frontend/config/.env.desktop.example` | **DELETE** |
| `frontend/config/.env.saas.example` | **DELETE** |
| `frontend/vite.config.ts` | Simplify to single web target, always proxy |
| `frontend/tsconfig.json` | Flatten `@app/*` → `src/core/*` only |
| `frontend/package.json` | Remove tauri/desktop/saas scripts and packages |
| `frontend/scripts/setup-env.ts` | Remove `--desktop` / `--saas` flag handling |
| `docker/frontend/Dockerfile` | Use `npm run build:core` explicitly |

---

### Task 1: Delete Tauri and Desktop source

**Files:**
- Delete: `frontend/src-tauri/`
- Delete: `frontend/src/desktop/`

- [ ] **Step 1: Delete both directories**

```bash
cd /home/janmejay/docker/pdf-editor-custom-src
rm -rf frontend/src-tauri frontend/src/desktop
```

- [ ] **Step 2: Verify deletion**

```bash
ls frontend/src/
# Expected: shows core/ (and possibly global.d.ts, index.tsx, etc.) — no desktop/
ls frontend/src-tauri 2>/dev/null && echo "EXISTS" || echo "GONE"
# Expected: GONE
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete Tauri desktop app and desktop frontend layer"
```

---

### Task 2: Delete mode-specific tsconfigs and env examples

**Files:**
- Delete: `frontend/tsconfig.desktop.vite.json`
- Delete: `frontend/tsconfig.saas.vite.json`
- Delete: `frontend/tsconfig.proprietary.vite.json`
- Delete: `frontend/config/.env.desktop.example`
- Delete: `frontend/config/.env.saas.example`

- [ ] **Step 1: Delete the files**

```bash
cd /home/janmejay/docker/pdf-editor-custom-src/frontend
rm -f tsconfig.desktop.vite.json tsconfig.saas.vite.json tsconfig.proprietary.vite.json
rm -f config/.env.desktop.example config/.env.saas.example
```

- [ ] **Step 2: Verify**

```bash
ls frontend/tsconfig*.json
# Expected: tsconfig.json  tsconfig.core.vite.json
ls frontend/config/
# Expected: .env.example only
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete desktop/saas/proprietary tsconfigs and env examples"
```

---

### Task 3: Simplify `vite.config.ts`

**Files:**
- Modify: `frontend/vite.config.ts`

Replace the entire file with a single-target web config — no mode switching, no desktop conditionals, always proxy to the Spring Boot backend.

- [ ] **Step 1: Rewrite `frontend/vite.config.ts`**

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tsconfigPaths({
        projects: ['./tsconfig.core.vite.json'],
      }),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/@embedpdf/pdfium/dist/pdfium.wasm',
            dest: 'pdfium',
          },
          {
            src: 'public/vendor/jscanify/*',
            dest: 'vendor/jscanify',
          },
        ],
      }),
    ],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          xfwd: true,
        },
        '/swagger-ui': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          xfwd: true,
        },
        '/v1/api-docs': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          xfwd: true,
        },
      },
    },
    base: env.RUN_SUBPATH ? `/${env.RUN_SUBPATH}` : './',
  };
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/vite.config.ts
git commit -m "chore: simplify vite config to single web-only build target"
```

---

### Task 4: Flatten `tsconfig.json` path aliases

**Files:**
- Modify: `frontend/tsconfig.json`

The `@app/*` path currently cascades through `desktop/ → proprietary/ → core/`. Collapse it to `core/` only and remove the now-unused `@proprietary/*` alias.

- [ ] **Step 1: Edit the `paths` block in `frontend/tsconfig.json`**

Find this section:
```json
"paths": {
  "@app/*": [
    "src/desktop/*",
    "src/proprietary/*",
    "src/core/*"
  ],
  "@proprietary/*": ["src/proprietary/*"],
  "@core/*": ["src/core/*"]
}
```

Replace with:
```json
"paths": {
  "@app/*": ["src/core/*"],
  "@core/*": ["src/core/*"]
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/tsconfig.json
git commit -m "chore: collapse @app/* alias to src/core/* (no more layering)"
```

---

### Task 5: Clean up `package.json`

**Files:**
- Modify: `frontend/package.json`

Remove: scripts for `desktop`, `saas`, `proprietary` build targets; Tauri CLI and plugin deps; Supabase, Stripe, Posthog, Userback deps.

- [ ] **Step 1: Remove scripts**

In `"scripts"`, delete these entries entirely:
```
"prep:saas"
"prep:desktop"
"prep:desktop-build"
"dev:proprietary"
"dev:saas"
"dev:desktop"
"build:proprietary"
"build:saas"
"build:desktop"
"tauri-dev"
"tauri-build"
"_tauri-build-dev"
"tauri-build-dev"
"tauri-build-dev-mac"
"tauri-build-dev-windows"
"tauri-build-dev-linux"
"tauri-clean"
"typecheck"              ← (was aliased to typecheck:proprietary, delete or replace)
"typecheck:proprietary"
"typecheck:saas"
"typecheck:desktop"
"typecheck:all"          ← replace with just core
```

Add/update:
```json
"typecheck": "tsc --noEmit --project src/core/tsconfig.json",
"typecheck:all": "npm run typecheck:core && npm run typecheck:scripts"
```

The `prep` script currently runs `tsx scripts/setup-env.ts && npm run generate-icons`. After Task 6 simplifies `setup-env.ts`, this still works fine.

Also update `build` and `dev` to use core explicitly:
```json
"dev": "npm run prep && vite --mode core",
"build": "npm run prep && vite build --mode core",
"build:core": "npm run prep && vite build --mode core"
```

- [ ] **Step 2: Remove npm dependencies**

From `"dependencies"`, remove:
```
"@posthog/react"
"@stripe/react-stripe-js"
"@stripe/stripe-js"
"@supabase/supabase-js"
"@tauri-apps/api"
"@tauri-apps/plugin-dialog"
"@tauri-apps/plugin-fs"
"@tauri-apps/plugin-http"
"@tauri-apps/plugin-notification"
"@tauri-apps/plugin-shell"
"@userback/widget"
"posthog-js"
```

From `"devDependencies"`, remove:
```
"@tauri-apps/cli"
```

- [ ] **Step 3: Verify the JSON is still valid**

```bash
cd /home/janmejay/docker/pdf-editor-custom-src/frontend
node -e "require('./package.json'); console.log('valid')"
# Expected: valid
```

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json
git commit -m "chore: remove tauri/saas/stripe/supabase/posthog deps and scripts from package.json"
```

---

### Task 6: Simplify `scripts/setup-env.ts`

**Files:**
- Modify: `frontend/scripts/setup-env.ts`

Remove the `--desktop` and `--saas` flag handling; the script now only manages `.env` from `.env.example`.

- [ ] **Step 1: Rewrite `frontend/scripts/setup-env.ts`**

```typescript
/**
 * Copies missing env files from their .example templates, and warns about
 * any keys present in the example but not set in the environment.
 * Also warns about any VITE_ vars set in the environment that aren't listed
 * in the example file.
 */

import { existsSync, copyFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { config, parse } from 'dotenv';

const root = process.cwd();

console.log('setup-env: see frontend/README.md#environment-variables for documentation');

function getExampleKeys(exampleFile: string): string[] {
  const examplePath = join(root, exampleFile);
  if (!existsSync(examplePath)) return [];
  return Object.keys(parse(readFileSync(examplePath, 'utf-8')));
}

function ensureEnvFile(envFile: string, exampleFile: string): boolean {
  const envPath = join(root, envFile);
  const examplePath = join(root, exampleFile);

  if (!existsSync(examplePath)) {
    console.warn(`setup-env: ${exampleFile} not found, skipping ${envFile}`);
    return false;
  }

  if (!existsSync(envPath)) {
    copyFileSync(examplePath, envPath);
    console.log(`setup-env: created ${envFile} from ${exampleFile}`);
  }

  config({ path: envPath });

  const missing = getExampleKeys(exampleFile).filter(k => !(k in process.env));
  if (missing.length > 0) {
    console.error(
      `setup-env: ${envFile} is missing keys from ${exampleFile}:\n` +
      missing.map(k => `  ${k}`).join('\n') +
      '\n  Add them manually or delete your local file to re-copy from the example.'
    );
    return true;
  }

  return false;
}

const failed = ensureEnvFile('.env', 'config/.env.example');

const allExampleKeys = new Set(getExampleKeys('config/.env.example'));
const unknownViteVars = Object.keys(process.env)
  .filter(k => k.startsWith('VITE_') && !allExampleKeys.has(k));
if (unknownViteVars.length > 0) {
  console.warn(
    'setup-env: the following VITE_ vars are set but not listed in any example file:\n' +
    unknownViteVars.map(k => `  ${k}`).join('\n') +
    '\n  Add them to config/.env.example if they are required.'
  );
}

if (failed) process.exit(1);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/scripts/setup-env.ts
git commit -m "chore: simplify setup-env.ts — remove desktop/saas flags"
```

---

### Task 7: Update Docker frontend build

**Files:**
- Modify: `docker/frontend/Dockerfile`

Use `npm run build:core` explicitly instead of the bare `npm run build` (which previously defaulted to proprietary mode).

- [ ] **Step 1: Edit `docker/frontend/Dockerfile`**

Find:
```dockerfile
RUN npm run build
```

Replace with:
```dockerfile
RUN npm run build:core
```

- [ ] **Step 2: Commit**

```bash
git add docker/frontend/Dockerfile
git commit -m "chore: docker frontend build uses build:core explicitly"
```

---

### Task 8: Verify no remaining desktop/tauri/proprietary references in core

- [ ] **Step 1: Search for broken imports in `src/core/`**

```bash
cd /home/janmejay/docker/pdf-editor-custom-src/frontend
grep -r "@tauri-apps\|@supabase\|@stripe\|posthog\|@userback\|src/desktop\|src/proprietary\|@proprietary/" src/core --include="*.ts" --include="*.tsx" -l
# Expected: no output
```

- [ ] **Step 2: Search for any remaining references to deleted directories**

```bash
grep -r "from '@app/services/authService'\|from '@app/auth/\|from '@tauri-apps\|invoke(" src/core --include="*.ts" --include="*.tsx" -l
# Expected: no output
```

- [ ] **Step 3: Verify tsconfig.core.vite.json resolves correctly**

```bash
cat frontend/tsconfig.core.vite.json
# Expected: @app/* → src/core/* only; excludes src/proprietary and src/desktop
```

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore: fix remaining desktop/proprietary references in core"
```
