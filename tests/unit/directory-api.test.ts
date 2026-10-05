import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createLocalServer, RunningServer } from '../../src/server/index.js';

describe('Directory Browser HTTP API (§System / FS API)', () => {
  let tempBaseDir: string;
  let activeServer: RunningServer;
  const testPort = 39896;

  beforeAll(async () => {
    tempBaseDir = path.join(
      os.tmpdir(),
      `memorycard-test-dirapi-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await fs.promises.mkdir(tempBaseDir, { recursive: true });
    activeServer = await createLocalServer(testPort, '127.0.0.1');
  });

  afterAll(async () => {
    if (activeServer) {
      await activeServer.close();
    }
    try {
      await fs.promises.rm(tempBaseDir, { recursive: true, force: true });
    } catch {}
  });

  function makeRequest(
    method: string,
    urlPath: string,
    body?: any
  ): Promise<{ status: number; data: any }> {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : undefined;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: testPort,
          path: urlPath,
          method,
          headers: payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
              }
            : undefined
        },
        (res) => {
          let responseBody = '';
          res.on('data', (chunk) => (responseBody += chunk));
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode || 0,
                data: JSON.parse(responseBody)
              });
            } catch {
              resolve({
                status: res.statusCode || 0,
                data: responseBody
              });
            }
          });
        }
      );
      req.on('error', reject);
      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

  it('GET /api/system/fs-browse retorna lista da Home com atalhos ordenados por padrão', async () => {
    const res = await makeRequest('GET', '/api/system/fs-browse');

    expect(res.status).toBe(200);
    expect(res.data.currentPath).toBe(path.resolve(os.homedir()));
    expect(res.data.shortcuts[0].name).toBe('Home (~)');
    expect(res.data.shortcuts[res.data.shortcuts.length - 1].name).toBe('Pasta Atual (CWD)');
    expect(Array.isArray(res.data.breadcrumbs)).toBe(true);
    expect(Array.isArray(res.data.directories)).toBe(true);
  });

  it('GET /api/system/fs-browse?path=... lista diretório específico solicitado', async () => {
    const subFolder = path.join(tempBaseDir, 'pasta-especifica');
    await fs.promises.mkdir(subFolder, { recursive: true });

    const queryUrl = `/api/system/fs-browse?path=${encodeURIComponent(tempBaseDir)}`;
    const res = await makeRequest('GET', queryUrl);

    expect(res.status).toBe(200);
    expect(res.data.currentPath).toBe(path.resolve(tempBaseDir));
    const names = res.data.directories.map((d: any) => d.name);
    expect(names).toContain('pasta-especifica');
  });

  it('POST /api/system/create-directory cria novo diretório com sucesso', async () => {
    const targetDir = path.join(tempBaseDir, 'pasta-via-api');
    const res = await makeRequest('POST', '/api/system/create-directory', {
      path: targetDir
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(fs.existsSync(targetDir)).toBe(true);
  });

  it('POST /api/system/create-directory retorna erro 400 se o caminho não for enviado', async () => {
    const res = await makeRequest('POST', '/api/system/create-directory', {});

    expect(res.status).toBe(400);
    expect(res.data.error).toBeDefined();
  });
});
