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

* remove and recreate `.output/firefox-mv2/`
* copy `manifest.json`, `assets/`, `README.md`, `LICENSE`
* copy `src/` recursively into `.output/firefox-mv2/` 

### 1) Non-minified build 

```bash
bun run build:dev
```
Result:

* `.output/firefox-mv2/` contains original sourcecode.

### 2) Minified build 

```bash
bun run build:prod
# or
bun run build
```

Behavior:
* `.js` minified with **Terser** using:
* 
    * `compress.drop_console = true`
    * `compress.drop_debugger = true`
    * `mangle = true`
* `.css` minified with **CleanCSS**
* all other files copied unchanged

Result:
* `.output/firefox-mv2/` contains minified sourcecode.
