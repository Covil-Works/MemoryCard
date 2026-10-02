#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliEntry = path.resolve(__dirname, '../src/cli/index.ts');
const tsxCli = path.resolve(__dirname, '../node_modules/tsx/dist/cli.mjs');

let child;
if (fs.existsSync(tsxCli)) {
  child = spawn(process.execPath, [tsxCli, cliEntry, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env
  });
} else {
  child = spawn('npx', ['tsx', cliEntry, ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: true,
    env: process.env
  });
}

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
