import { IncomingMessage, ServerResponse } from 'node:http';
import { readGlobalProjects, relinkProjectInGlobalRegistry, unregisterProjectFromGlobalRegistry } from '../storage/project-registry.js';
import { ProjectService } from '../core/services/project-service.js';
import { TaskService } from '../core/services/task-service.js';
import { TodoService } from '../core/services/todo-service.js';
import { CommentService } from '../core/services/comment-service.js';
import { StatusService } from '../core/services/status-service.js';
import { ModelService } from '../core/services/model-service.js';
import { ConcurrencyConflictError } from '../storage/hashing.js';
import { openNativeFolderDialog } from './native-dialog.js';
import { sseManager } from './sse.js';
import { ProjectWatcher } from '../watcher/project-watcher.js';

// Cache de watchers ativos por diretório de projeto
const activeWatchers = new Map<string, ProjectWatcher>();

export async function ensureWatcherForProject(rootDir: string, projectId?: string): Promise<void> {
  if (!activeWatchers.has(rootDir)) {
    const watcher = new ProjectWatcher(rootDir, projectId);
    await watcher.start();
    activeWatchers.set(rootDir, watcher);
  }
}

async function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Corpo da requisição JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: any): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, If-Match'
  });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, err: any): void {
  let status = 500;
  if (err instanceof ConcurrencyConflictError || err.name === 'ConcurrencyConflictError') {
    status = 409;
  } else if (err.name?.includes('NotFound')) {
    status = 404;
  } else if (err.name?.includes('Invalid') || err.name?.includes('AlreadyExists') || err.name?.includes('InUse')) {
    status = 400;
  }
  sendJson(res, status, { error: err.message, name: err.name });
}

async function resolveProjectBySlugOrId(identifier: string): Promise<{ rootDir: string; projectId: string; slug: string }> {
  const { projects } = await readGlobalProjects();
  const match = projects.find(p => p.project_id === identifier || p.slug === identifier);
  if (!match || !match.available) {
    throw new Error(`Projeto "${identifier}" não encontrado ou inacessível no sistema.`);
  }
  return {
    rootDir: match.path,
    projectId: match.project_id,
    slug: match.slug!
  };
}

export async function handleApiRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method?.toUpperCase() || 'GET';

  // Pre-flight CORS
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, If-Match'
    });
    res.end();
    return true;
  }

  // 1. SSE Stream
  if (pathname === '/api/events' && method === 'GET') {
    sseManager.handleRequest(req, res);
    return true;
  }

  // 2. Seletor de diretório nativo
  if (pathname === '/api/system/select-directory' && method === 'GET') {
    try {
      const selectedPath = await openNativeFolderDialog();
      sendJson(res, 200, { path: selectedPath });
    } catch (err: any) {
      sendError(res, err);
    }
    return true;
  }

  // 3. Informações de rede local para acesso por celular / outros dispositivos
  if (pathname === '/api/system/network' && method === 'GET') {
    try {
      const { getNetworkAddresses, getRunningServerInstance } = await import('./index.js');
      const running = getRunningServerInstance();
      const port = running?.port || 3333;
      const networkAddresses = getNetworkAddresses(port);
      const networkBase = networkAddresses[0] || null;

      const targetPath = url.searchParams.get('path') || '';
      const cleanPath = targetPath.startsWith('/') ? targetPath : (targetPath ? `/${targetPath}` : '');
      const localUrl = `http://localhost:${port}${cleanPath}`;
      const networkUrl = networkBase ? `${networkBase}${cleanPath}` : null;

      let qrDataUrl: string | null = null;
      if (networkUrl) {
        try {
          const qrcode = (await import('qrcode')).default;
          qrDataUrl = await qrcode.toDataURL(networkUrl, {
            margin: 1,
            width: 240,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
        } catch (err: any) {
          console.error('Erro ao gerar QR code:', err);
        }
      }

      sendJson(res, 200, {
        port,
        local: localUrl,
        network: networkUrl,
        networkAddresses,
        qrDataUrl,
        hasNetwork: !!networkUrl
      });
    } catch (err: any) {
      sendError(res, err);
    }
    return true;
  }

  // 4. Projetos Globais
  if (pathname === '/api/projects' && method === 'GET') {
    try {
      const { projects } = await readGlobalProjects();
      sendJson(res, 200, { projects });
    } catch (err: any) {
      sendError(res, err);
    }
    return true;
  }

  if (pathname === '/api/projects/init' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const targetPath = body.path;
      if (!targetPath) {
        sendJson(res, 400, { error: 'O caminho do diretório é obrigatório' });
        return true;
      }
      const project = await ProjectService.initProject(targetPath, body.name);
      await ensureWatcherForProject(project.rootDir, project.config.project.id);
      sendJson(res, 201, project);
    } catch (err: any) {
      sendError(res, err);
    }
    return true;
  }

  if (pathname === '/api/projects/relink' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      await relinkProjectInGlobalRegistry(body.project_id, body.path);
      sendJson(res, 200, { success: true });
    } catch (err: any) {
      sendError(res, err);
    }
    return true;
  }

  const deleteProjectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (deleteProjectMatch && method === 'DELETE') {
    try {
      const projectId = deleteProjectMatch[1];
      const removed = await unregisterProjectFromGlobalRegistry(projectId);
      if (!removed) {
        sendJson(res, 404, { error: 'Projeto não encontrado no registro global.' });
      } else {
        sseManager.broadcast({ type: 'project-availability-changed', projectId });
        sendJson(res, 200, { success: true });
      }
    } catch (err: any) {
      sendError(res, err);
    }
    return true;
  }

  // Rotas com escopo de projeto: /api/projects/:idOrSlug/...
  const projectRouteMatch = pathname.match(/^\/api\/projects\/([^/]+)(\/.*)?$/);
  if (projectRouteMatch) {
    const idOrSlug = projectRouteMatch[1];
    const subRoute = projectRouteMatch[2] || '';

    let rootDir: string;
    let projectId: string;
    try {
      const resolved = await resolveProjectBySlugOrId(idOrSlug);
      rootDir = resolved.rootDir;
      projectId = resolved.projectId;
      await ensureWatcherForProject(rootDir, projectId);
    } catch (err: any) {
      sendError(res, err);
      return true;
    }

    // GET /api/projects/:slug/info
    if (subRoute === '' || subRoute === '/info') {
      try {
        const info = await ProjectService.getProject(rootDir);
        sendJson(res, 200, info);
      } catch (err: any) {
        sendError(res, err);
      }
      return true;
    }

    // /api/projects/:slug/tasks
    if (subRoute === '/tasks') {
      if (method === 'GET') {
        try {
          const sort = url.searchParams.get('sort') as any;
          const status = url.searchParams.get('status') || undefined;
          const tasks = await TaskService.listTasks(rootDir, { sort, status });
          sendJson(res, 200, { tasks });
        } catch (err: any) {
          sendError(res, err);
        }
        return true;
      }
      if (method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const task = await TaskService.createTask(rootDir, body);
          sendJson(res, 201, task);
        } catch (err: any) {
          sendError(res, err);
        }
        return true;
      }
    }

    // /api/projects/:slug/tasks/:taskId/...
    const taskMatch = subRoute.match(/^\/tasks\/(\d+)(.*)$/);
    if (taskMatch) {
      const taskId = Number(taskMatch[1]);
      const taskAction = taskMatch[2];

      // GET, PUT, DELETE em /tasks/:taskId
      if (taskAction === '') {
        if (method === 'GET') {
          try {
            const task = await TaskService.getTask(rootDir, taskId);
            sendJson(res, 200, task);
          } catch (err: any) {
            sendError(res, err);
          }
          return true;
        }
        if (method === 'PUT') {
          try {
            const body = await readJsonBody(req);
            const expectedHash = (req.headers['if-match'] as string) || body.hash;
            const updated = await TaskService.updateTask(rootDir, taskId, body, expectedHash);
            sendJson(res, 200, updated);
          } catch (err: any) {
            sendError(res, err);
          }
          return true;
        }
        if (method === 'DELETE') {
          try {
            await TaskService.deleteTask(rootDir, taskId);
            sendJson(res, 200, { success: true });
          } catch (err: any) {
            sendError(res, err);
          }
          return true;
        }
      }

      // POST /tasks/:taskId/move
      if (taskAction === '/move' && method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const expectedHash = (req.headers['if-match'] as string) || body.hash;
          const task = await TaskService.moveTask(rootDir, taskId, body.status, body.position, expectedHash);
          sendJson(res, 200, task);
        } catch (err: any) {
          sendError(res, err);
        }
        return true;
      }

      // /tasks/:taskId/todos
      if (taskAction === '/todos' && method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const expectedHash = (req.headers['if-match'] as string) || body.hash;
          const task = await TodoService.addTodo(rootDir, taskId, body.text, expectedHash);
          sendJson(res, 201, task);
        } catch (err: any) {
          sendError(res, err);
        }
        return true;
      }

      // /tasks/:taskId/todos/:index
      const todoIdxMatch = taskAction.match(/^\/todos\/(\d+)$/);
      if (todoIdxMatch) {
        const index = Number(todoIdxMatch[1]);
        if (method === 'PUT') {
          try {
            const body = await readJsonBody(req);
            const expectedHash = (req.headers['if-match'] as string) || body.hash;
            const task = body.completed
              ? await TodoService.doneTodo(rootDir, taskId, index, expectedHash)
              : await TodoService.undoTodo(rootDir, taskId, index, expectedHash);
            sendJson(res, 200, task);
          } catch (err: any) {
            sendError(res, err);
          }
          return true;
        }
        if (method === 'DELETE') {
          try {
            const expectedHash = req.headers['if-match'] as string;
            const task = await TodoService.removeTodo(rootDir, taskId, index, expectedHash);
            sendJson(res, 200, task);
          } catch (err: any) {
            sendError(res, err);
          }
          return true;
        }
      }

      // POST /tasks/:taskId/comments
      if (taskAction === '/comments' && method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const expectedHash = (req.headers['if-match'] as string) || body.hash;
          const task = await CommentService.addComment(rootDir, taskId, body.text, expectedHash);
          sendJson(res, 201, task);
        } catch (err: any) {
          sendError(res, err);
        }
        return true;
      }
    }

    // /api/projects/:slug/statuses
    if (subRoute === '/statuses') {
      if (method === 'GET') {
        try {
          const columns = await StatusService.listStatuses(rootDir);
          sendJson(res, 200, { columns });
        } catch (err: any) {
          sendError(res, err);
        }
        return true;
      }
      if (method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const col = await StatusService.addStatus(rootDir, body.name, body.id);
          sendJson(res, 201, col);
        } catch (err: any) {
          sendError(res, err);
        }
        return true;
      }
    }

    const statusIdMatch = subRoute.match(/^\/statuses\/([^/]+)$/);
    if (statusIdMatch) {
      const statusId = statusIdMatch[1];
      if (method === 'PUT') {
        try {
          const body = await readJsonBody(req);
          const col = await StatusService.renameStatus(rootDir, statusId, body.name);
          sendJson(res, 200, col);
        } catch (err: any) {
          sendError(res, err);
        }
        return true;
      }
      if (method === 'DELETE') {
        try {
          await StatusService.removeStatus(rootDir, statusId);
          sendJson(res, 200, { success: true });
        } catch (err: any) {
          sendError(res, err);
        }
        return true;
      }
    }

    // /api/projects/:slug/models
    if (subRoute === '/models') {
      if (method === 'GET') {
        try {
          const models = await ModelService.listModels(rootDir);
          sendJson(res, 200, { models });
        } catch (err: any) {
          sendError(res, err);
        }
        return true;
      }
      if (method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const model = await ModelService.createModel(body.name, body.scope, body.content, rootDir);
          sendJson(res, 201, model);
        } catch (err: any) {
          sendError(res, err);
        }
        return true;
      }
    }

    // PUT /api/projects/:slug/task-model
    if (subRoute === '/task-model' && method === 'PUT') {
      try {
        const body = await readJsonBody(req);
        const config = await ProjectService.setTaskModel(rootDir, body.modelName);
        sendJson(res, 200, config);
      } catch (err: any) {
        sendError(res, err);
      }
      return true;
    }

    // POST /api/projects/:slug/board-sort
    if (subRoute === '/board-sort' && method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const config = await ProjectService.setBoardSort(rootDir, body.sort);
        sendJson(res, 200, config);
      } catch (err: any) {
        sendError(res, err);
      }
      return true;
    }
  }

  return false;
}
