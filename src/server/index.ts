import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import open from 'open';
import { handleApiRoute } from './api-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerOptions {
  port?: number;
  host?: string;
  openBrowser?: boolean;
  projectSlug?: string;
  qr?: boolean;
}

export interface RunningServer {
  server: http.Server;
  port: number;
  host: string;
  url: string;
  networkUrl: string | null;
  networkAddresses: string[];
  close: () => Promise<void>;
}

let globalServerInstance: RunningServer | null = null;

export function getRunningServerInstance(): RunningServer | null {
  return globalServerInstance;
}

/**
 * Retorna todos os endereços IPv4 externos disponíveis nesta máquina (Wi-Fi, Ethernet, etc.).
 */
export function getNetworkAddresses(port: number): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(`http://${net.address}:${port}`);
      }
    }
  }
  return addresses;
}

export async function createLocalServer(port: number = 3333, host: string = '0.0.0.0'): Promise<RunningServer> {
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

    server.listen(port, host, () => {
      const url = `http://localhost:${port}`;
      const networkAddresses = getNetworkAddresses(port);
      const networkUrl = networkAddresses[0] || null;
      const running: RunningServer = {
        server,
        port,
        host,
        url,
        networkUrl,
        networkAddresses,
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
  const host = options.host || '0.0.0.0';
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
    const networkAddrs = getNetworkAddresses(preferredPort);
    const targetNetworkUrl = networkAddrs[0]
      ? (projectSlug ? `${networkAddrs[0]}/${projectSlug}` : networkAddrs[0])
      : null;

    console.log(`\n  \x1b[1m\x1b[32m[MemoryCard] Servidor já em execução:\x1b[0m`);
    console.log(`  > \x1b[1mLocal:\x1b[0m   ${targetUrl}`);
    if (targetNetworkUrl) {
      console.log(`  > \x1b[1mRede:\x1b[0m    ${targetNetworkUrl}`);
      console.log(`  \x1b[2m(Acesse do seu celular ou qualquer dispositivo no mesmo Wi-Fi)\x1b[0m`);
    }

    if (options.qr && targetNetworkUrl) {
      try {
        const qrcode = (await import('qrcode')).default;
        const qrStr = await qrcode.toString(targetNetworkUrl, { type: 'terminal', small: true });
        console.log(`\n${qrStr}\n`);
      } catch {}
    }

    if (options.openBrowser) {
      await open(targetUrl).catch(() => {});
    }
    return {
      server: null as any,
      port: preferredPort,
      host,
      url: `http://localhost:${preferredPort}`,
      networkUrl: targetNetworkUrl,
      networkAddresses: networkAddrs,
      close: async () => {}
    };
  }

  // Inicia novo servidor
  let currentPort = preferredPort;
  let running: RunningServer | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      running = await createLocalServer(currentPort, host);
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
  const targetNetworkUrl = running.networkUrl
    ? (projectSlug ? `${running.networkUrl}/${projectSlug}` : running.networkUrl)
    : null;

  console.log(`\n  \x1b[1m\x1b[32m[MemoryCard] Servidor ativo:\x1b[0m`);
  console.log(`  > \x1b[1mLocal:\x1b[0m   ${targetUrl}`);
  if (targetNetworkUrl) {
    console.log(`  > \x1b[1mRede:\x1b[0m    ${targetNetworkUrl}`);
    console.log(`  \x1b[2m(Acesse do seu celular ou qualquer dispositivo no mesmo Wi-Fi)\x1b[0m`);
  }

  if (options.qr && targetNetworkUrl) {
    try {
      const qrcode = (await import('qrcode')).default;
      const qrStr = await qrcode.toString(targetNetworkUrl, { type: 'terminal', small: true });
      console.log(`\n${qrStr}\n`);
    } catch {}
  } else if (targetNetworkUrl) {
    console.log(`  \x1b[2mDica: use 'memorycard --qr' ou use o botão 'Celular' no computador para escanear com a câmera.\x1b[0m\n`);
  }

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

