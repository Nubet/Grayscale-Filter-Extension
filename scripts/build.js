#!/usr/bin/env bun

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const BUILD_DIR = ".output/firefox-mv2";

const isDev = process.argv.includes("--dev");
const buildLabel = isDev ? "dev" : "prod";

const copyPlan = [
  { from: "src", to: "src", optional: false },
  { from: "manifest.json", to: "manifest.json", optional: false },
  { from: "assets", to: "assets", optional: true },
  { from: "README.md", to: "README.md", optional: false },
  { from: "LICENSE", to: "LICENSE", optional: false },
];

function ensureCleanDir(dirPath) {
  if (existsSync(dirPath)) rmSync(dirPath, { recursive: true, force: true });
  mkdirSync(dirPath, { recursive: true });
}

function copyItem(buildDir, { from, to, optional }) {
  if (!existsSync(from)) {
    if (optional) return { copied: false, reason: "optional-missing" };
    throw new Error(`Missing required path: ${from}`);
  }

  cpSync(from, join(buildDir, to), { recursive: true });
  return { copied: true };
}

function log(message) {
  console.log(`[build:${buildLabel}] ${message}`);
}

function main() {
  log(`Start -> ${BUILD_DIR}`);

  ensureCleanDir(BUILD_DIR);

  for (const item of copyPlan) {
    const result = copyItem(BUILD_DIR, item);
    if (result.copied) log(`Copied ${item.from}`);
  }

  log("Done");
}

main();
