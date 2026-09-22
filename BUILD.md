# Build Instructions 

## Prerequisites

* **Bun >= 1.3.0**

```bash
bun --version
```

## Install dependencies

From the project root:

```bash
bun install
```

## Build outputs

Both modes:

* create browser-specific output in `dist/chrome/` and `dist/firefox/`
* compile and validate the manifest for the selected browser
* bundle imported JavaScript and referenced assets

### 1) Non-minified build 

```bash
bun run dev:chrome
# or
bun run dev:firefox
```
Result:

* Extension.js serves the selected browser target with watch mode.

### 2) Minified build 

```bash
bun run build
```

Behavior:
* builds Chrome and Firefox artifacts from one MV3 manifest
* translates the MV3 service worker to Firefox's supported background format
* injects the `browser.*` polyfill for Chrome
* bundles and validates manifest entrypoints

Result:
* `dist/chrome/` and `dist/firefox/` contain browser-ready artifacts.
