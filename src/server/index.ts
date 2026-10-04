import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import open from 'open';
import { handleApiRoute } from './api-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerOptions {
  port?: number;
  openBrowser?: boolean;
  projectSlug?: string;
}

export interface RunningServer {
  server: http.Server;
  port: number;
  url: string;
  close: () => Promise<void>;
}

let globalServerInstance: RunningServer | null = null;

export async function createLocalServer(port: number = 3333): Promise<RunningServer> {
  const isDev = process.env.NODE_ENV !== 'production';

  // Tentativa de carregar Next.js dinamicamente se disponível
  let nextHandler: ((req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>) | null = null;
  try {
    const nextModule = await import('next');
    const createNext = nextModule.default || nextModule;
    const webDir = path.resolve(__dirname, '../web');
    const nextApp = (createNext as any)({
      dev: isDev,
      dir: webDir
    });
    await nextApp.prepare();
    nextHandler = nextApp.getRequestHandler();
  } catch (err: any) {
    // Fallback: se Next.js não estiver compilado/iniciado, exibe página de status operacional
  }

  const server = http.createServer(async (req, res) => {
    try {
      // 1. Roteamento de API e SSE
      const handled = await handleApiRoute(req, res);
      if (handled) {
        return;
      }

      // 2. Roteamento de UI Next.js
      if (nextHandler) {
        await nextHandler(req, res);
        return;
      }

      // 3. Fallback visual para modo headless / bootstrap
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>MemoryCard Server</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; background: #000; color: #fff; padding: 2rem; }
              h1 { font-size: 1.5rem; border-bottom: 1px solid #333; padding-bottom: 0.5rem; }
              p { color: #888; }
            </style>
          </head>
          <body>
            <h1>MemoryCard — Local Server</h1>
            <p>Servidor ativo. API e SSE operacionais em <code>/api</code>.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        reject(err);
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      const url = `http://localhost:${port}`;
      const running: RunningServer = {
        server,
        port,
        url,
        close: async () => {
          return new Promise(resClose => server.close(() => resClose()));
        }
      };
      globalServerInstance = running;
      resolve(running);
    });
  });
}

/**
 * Inicia ou reutiliza o servidor local e abre o navegador caso solicitado.
 */
export async function startLocalServer(options: ServerOptions = {}): Promise<RunningServer> {
  const preferredPort = options.port || 3333;
  const projectSlug = options.projectSlug;

  // Se já houver instância ativa neste processo
  if (globalServerInstance) {
    const targetUrl = projectSlug ? `${globalServerInstance.url}/${projectSlug}` : globalServerInstance.url;
    if (options.openBrowser) {
      await open(targetUrl).catch(() => {});
    }
    return globalServerInstance;
  }

  // Tenta conectar em porta existente
  const isPortResponding = await new Promise<boolean>((resolve) => {
    const req = http.get(`http://localhost:${preferredPort}/api/projects`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });

  if (isPortResponding) {
    const targetUrl = projectSlug ? `http://localhost:${preferredPort}/${projectSlug}` : `http://localhost:${preferredPort}`;
    console.log(`MemoryCard já está rodando em ${targetUrl}`);
    if (options.openBrowser) {
      await open(targetUrl).catch(() => {});
    }
    return {
      server: null as any,
      port: preferredPort,
      url: `http://localhost:${preferredPort}`,
      close: async () => {}
    };
  }

  // Inicia novo servidor
  let currentPort = preferredPort;
  let running: RunningServer | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      running = await createLocalServer(currentPort);
      break;
    } catch (err: any) {
      if (err.code === 'EADDRINUSE') {
        currentPort++;
      } else {
        throw err;
      }
    }
  }

  if (!running) {
    throw new Error(`Não foi possível iniciar o servidor MemoryCard nas portas ${preferredPort} a ${currentPort}`);
  }

  const targetUrl = projectSlug ? `${running.url}/${projectSlug}` : running.url;
  console.log(`MemoryCard rodando em ${running.url}`);

  if (options.openBrowser) {
    await open(targetUrl).catch(() => {});
  }

  return running;
}

const serverScriptPath = process.argv[1] ? path.normalize(process.argv[1]) : '';
if (
  serverScriptPath.endsWith(path.normalize('src/server/index.ts')) ||
  serverScriptPath.endsWith(path.normalize('src/server/index.js'))
) {
  startLocalServer({ openBrowser: true });
}

