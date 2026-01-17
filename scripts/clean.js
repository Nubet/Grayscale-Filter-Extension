#!/usr/bin/env bun

import { existsSync, rmSync } from 'fs';

const OUTPUT_DIR = '.output';

if (existsSync(OUTPUT_DIR)) {
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  console.log('Cleaned .output directory');
} else {
  console.log('Nothing to clean');
}

