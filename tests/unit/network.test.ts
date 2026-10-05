import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import { createLocalServer, getNetworkAddresses, RunningServer } from '../../src/server/index.js';

describe('Network & Mobile Access (§System)', () => {
  let activeServer: RunningServer | null = null;

  afterEach(async () => {
    if (activeServer) {
      await activeServer.close();
      activeServer = null;
    }
  });

  it('getNetworkAddresses retorna uma lista de URLs formatadas com a porta correta', () => {
    const port = 4567;
    const addrs = getNetworkAddresses(port);
    expect(Array.isArray(addrs)).toBe(true);

    for (const addr of addrs) {
      expect(addr).toMatch(new RegExp(`^http://[0-9.]+:4567$`));
      expect(addr).not.toContain('127.0.0.1');
    }
  });

  it('createLocalServer expõe endpoint /api/system/network com dados da rede local', async () => {
    const testPort = 39871;
    activeServer = await createLocalServer(testPort, '127.0.0.1');
    expect(activeServer.port).toBe(testPort);
    expect(activeServer.host).toBe('127.0.0.1');

    const res = await new Promise<{ status: number; data: any }>((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${testPort}/api/system/network`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            data: JSON.parse(body)
          });
        });
      });
      req.on('error', reject);
    });

    expect(res.status).toBe(200);
    expect(res.data.port).toBe(testPort);
    expect(res.data.local).toBe(`http://localhost:${testPort}`);
    expect(Array.isArray(res.data.networkAddresses)).toBe(true);
    expect(typeof res.data.hasNetwork).toBe('boolean');

    if (res.data.hasNetwork) {
      expect(res.data.network).toMatch(new RegExp(`^http://[0-9.]+:${testPort}$`));
      expect(typeof res.data.qrDataUrl).toBe('string');
      expect(res.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    }
  }, 15000);

  it('suporta parâmetro query ?path para compor links diretos de boards', async () => {
    const testPort = 39872;
    activeServer = await createLocalServer(testPort, '127.0.0.1');

    const res = await new Promise<{ status: number; data: any }>((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${testPort}/api/system/network?path=/meu-projeto-slug`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            data: JSON.parse(body)
          });
        });
      });
      req.on('error', reject);
    });

    expect(res.status).toBe(200);
    expect(res.data.local).toBe(`http://localhost:${testPort}/meu-projeto-slug`);
    if (res.data.hasNetwork) {
      expect(res.data.network).toMatch(new RegExp(`^http://[0-9.]+:${testPort}/meu-projeto-slug$`));
    }
  }, 15000);
});
