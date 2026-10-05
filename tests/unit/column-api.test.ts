import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { ProjectService } from '../../src/core/services/project-service.js';
import { TaskService } from '../../src/core/services/task-service.js';
import { StatusService } from '../../src/core/services/status-service.js';
import { createLocalServer, RunningServer } from '../../src/server/index.js';

describe('Column Actions API (Rename & Delete)', () => {
  let testProjectDir: string;
  let activeServer: RunningServer;
  const testPort = 39890;

  beforeAll(async () => {
    testProjectDir = path.join(
      os.tmpdir(),
      `memorycard-test-colapi-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await ProjectService.initProject(testProjectDir, 'Column Test Project');
    activeServer = await createLocalServer(testPort, '127.0.0.1');
  });

  afterAll(async () => {
    if (activeServer) {
      await activeServer.close();
    }
    try {
      await fs.promises.rm(testProjectDir, { recursive: true, force: true });
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
                'Content-Length': Buffer.byteLength(payload),
              }
            : {},
        },
        (res) => {
          let responseBody = '';
          res.on('data', (chunk) => (responseBody += chunk));
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode || 0,
                data: responseBody ? JSON.parse(responseBody) : {},
              });
            } catch (e) {
              resolve({
                status: res.statusCode || 0,
                data: responseBody,
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

  it('renomeia uma coluna via endpoint PUT /api/projects/:slug/statuses/:statusId', async () => {
    const slug = 'column-test-project';
    const res = await makeRequest('PUT', `/api/projects/${slug}/statuses/todo`, {
      name: 'A Fazer (Renomeado)',
    });

    expect(res.status).toBe(200);
    expect(res.data.name).toBe('A Fazer (Renomeado)');

    const statuses = await StatusService.listStatuses(testProjectDir);
    const todoCol = statuses.find((s) => s.id === 'todo');
    expect(todoCol?.name).toBe('A Fazer (Renomeado)');
  });

  it('impede a exclusão de coluna que possui tasks vinculadas via DELETE', async () => {
    const slug = 'column-test-project';
    await TaskService.createTask(testProjectDir, {
      title: 'Tarefa em Todo',
      status: 'todo',
    });

    const res = await makeRequest('DELETE', `/api/projects/${slug}/statuses/todo`);
    expect(res.status).toBe(400);
    expect(res.data.error).toContain('Não é possível remover o status "todo"');

    const statuses = await StatusService.listStatuses(testProjectDir);
    expect(statuses.some((s) => s.id === 'todo')).toBe(true);
  });

  it('permite a exclusão de coluna vazia via DELETE', async () => {
    const slug = 'column-test-project';
    await StatusService.addStatus(testProjectDir, 'Coluna Vazia', 'empty-col');

    const statusesBefore = await StatusService.listStatuses(testProjectDir);
    expect(statusesBefore.some((s) => s.id === 'empty-col')).toBe(true);

    const res = await makeRequest('DELETE', `/api/projects/${slug}/statuses/empty-col`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);

    const statusesAfter = await StatusService.listStatuses(testProjectDir);
    expect(statusesAfter.some((s) => s.id === 'empty-col')).toBe(false);
  });
});
