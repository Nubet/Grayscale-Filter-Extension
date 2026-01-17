#!/usr/bin/env bun

import archiver from 'archiver';
import { createWriteStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const buildDir = '.output/firefox-mv2';
const outputDir = '.output';

function readExtensionVersion() {
    const manifestPath = join(buildDir, 'manifest.json');
    if (!existsSync(manifestPath)) return '1.0.0';

    try {
        const manifestJson = readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestJson);
        return typeof manifest.version === 'string' && manifest.version.length > 0 ? manifest.version : '1.0.0';
    } catch {
        return '1.0.0';
    }
}

function requireBuildDir() {
    if (existsSync(buildDir)) return;
    console.error(`[zip] Build directory not found: ${buildDir}`);
    console.error(`[zip] Run: bun run build`);
    process.exit(1);
}

function formatKb(bytes) {
    return `${Math.round(bytes / 1024)} KB`;
}

function log(message) {
    console.log(`[zip] ${message}`);
}

function createZip(zipPath) {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    const done = new Promise((resolve, reject) => {
        output.on('close', () => resolve({ bytes: archive.pointer() }));
        output.on('error', reject);
        archive.on('error', reject);
    });

    archive.pipe(output);
    archive.directory(buildDir, false);
    void archive.finalize();

    return done;
}

async function main() {
    requireBuildDir();

    const version = readExtensionVersion();
    const zipName = `grayscale-everywhere-firefox-v${version}.zip`;
    const zipPath = join(outputDir, zipName);

    log(`Packing -> ${zipName}`);
    const { bytes } = await createZip(zipPath);

    log(`Done -> ${zipPath}`);
    log(`Size -> ${formatKb(bytes)}`);
    log('Ready for Firefox Add-ons upload');
}

main().catch((error) => {
    console.error('[zip] Failed:', error);
    process.exit(1);
});
