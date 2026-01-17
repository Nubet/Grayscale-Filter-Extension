#!/usr/bin/env bun

import { cpSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';

const BUILD_DIR = '.output/firefox-mv2';

const isDev = process.argv.includes('--dev');
const buildLabel = isDev ? 'dev' : 'prod';

const copyPlan = [
    { from: 'src', to: 'src', optional: false, process: true },
    { from: 'manifest.json', to: 'manifest.json', optional: false },
    { from: 'assets', to: 'assets', optional: true },
    { from: 'README.md', to: 'README.md', optional: false },
    { from: 'LICENSE', to: 'LICENSE', optional: false },
];

function ensureCleanDir(dirPath) {
    if (existsSync(dirPath)) rmSync(dirPath, { recursive: true, force: true });
    mkdirSync(dirPath, { recursive: true });
}

async function minifyJS(code) {
    try {
        const { minify } = await import('terser');
        const result = await minify(code, {
            compress: {
                drop_console: true,
                drop_debugger: true
            },
            mangle: true
        });
        return result.code || code;
    } catch (error) {
        console.error('[build:prod] Minification error:', error.message);
        return code;
    }
}

async function minifyCSS(code) {
    try {
        const CleanCSS = (await import('clean-css')).default;
        const result = new CleanCSS().minify(code);
        if (result.errors.length > 0) {
            console.error('[build:prod] CSS minification error:', result.errors.join(', '));
            return code;
        }
        return result.styles;
    } catch (error) {
        console.error('[build:prod] CSS minification error:', error.message);
        return code;
    }
}

async function processFile(sourcePath, targetPath) {
    const ext = extname(sourcePath).toLowerCase();
    const content = readFileSync(sourcePath, 'utf8');
    let processedContent = content;

    if (!isDev) {
        switch (ext) {
            case '.js':
                processedContent = await minifyJS(content);
                break;
            case '.css':
                processedContent = await minifyCSS(content);
                break;
        }
    }

    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, processedContent);
}

function copyDirectory(sourcePath, targetPath) {
    mkdirSync(targetPath, { recursive: true });

    const items = readdirSync(sourcePath);

    for (const item of items) {
        const sourceItemPath = join(sourcePath, item);
        const targetItemPath = join(targetPath, item);
        const stat = statSync(sourceItemPath);

        if (stat.isDirectory()) {
            copyDirectory(sourceItemPath, targetItemPath);
        } else {
            const ext = extname(sourceItemPath).toLowerCase();
            if (ext === '.js' || ext === '.css') {
                processFile(sourceItemPath, targetItemPath);
                log(`${isDev ? 'Copied' : 'Minified'} ${sourceItemPath}`);
            } else {
                cpSync(sourceItemPath, targetItemPath);
                log(`Copied ${sourceItemPath}`);
            }
        }
    }
}

function copyItem(buildDir, { from, to, optional, process }) {
    if (!existsSync(from)) {
        if (optional) return { copied: false, reason: 'optional-missing' };
        throw new Error(`Missing required path: ${from}`);
    }

    const targetPath = join(buildDir, to);

    if (process && statSync(from).isDirectory()) {
        copyDirectory(from, targetPath);
    } else {
        cpSync(from, targetPath, { recursive: true });
        log(`Copied ${from}`);
    }

    return { copied: true };
}

function log(message) {
    console.log(`[build:${buildLabel}] ${message}`);
}

function main() {
    log(`Start -> ${BUILD_DIR}`);
    log(`Mode: ${isDev ? 'Development (unminified)' : 'Production (minified)'}`);

    ensureCleanDir(BUILD_DIR);

    for (const item of copyPlan) {
        const result = copyItem(BUILD_DIR, item);
        if (result.copied && !item.process) log(`Copied ${item.from}`);
    }

    log('Done');
}

main();