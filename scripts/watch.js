#!/usr/bin/env bun

import chokidar from "chokidar";
import { spawn } from "node:child_process";

const watchGlobs = ["src/**/*", "manifest.json", "assets/**/*"];

function log(message) {
  console.log(`[watch] ${message}`);
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn("bun", ["run", "build:dev"], {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`build:dev exited with code ${code}`));
    });
  });
}

function createRebuildScheduler() {
  let isBuilding = false;
  let hasPendingChange = false;

  async function rebuild() {
    if (isBuilding) {
      hasPendingChange = true;
      return;
    }

    isBuilding = true;
    hasPendingChange = false;

    log("Change detected, rebuilding...");

    try {
      await runBuild();
      log("Rebuild completed");
    } catch (error) {
      log(`Rebuild failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      isBuilding = false;

      if (hasPendingChange) {
        queueMicrotask(rebuild);
      }
    }
  }

  return rebuild;
}

const watcher = chokidar.watch(watchGlobs, {
  ignored: /node_modules/,
  persistent: true,
  ignoreInitial: true,
});

const rebuild = createRebuildScheduler();

watcher.on("add", rebuild);
watcher.on("change", rebuild);
watcher.on("unlink", rebuild);

log(`Watching: ${watchGlobs.join(", ")}`);
