import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect } from 'vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import agentHandler from './api/agent';
import copilotHandler from './api/copilot';
import rewriteHandler from './api/rewrite';
import writeHandler from './api/write';

type ApiHandler = (req: any, res: any) => void | Promise<void>;

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      resolve(undefined);
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve(undefined);
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
    req.on('error', reject);
  });
}

function createResponseAdapter(res: ServerResponse) {
  type EnhancedResponse = ServerResponse & {
    status: (code: number) => EnhancedResponse;
    json: (payload: unknown) => EnhancedResponse;
  };

  const enhanced = res as EnhancedResponse;

  enhanced.status = (code: number) => {
    res.statusCode = code;
    return enhanced;
  };

  enhanced.json = (payload: unknown) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(payload));
    return enhanced;
  };

  return enhanced;
}

function localApiPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  const routeMap = new Map<string, ApiHandler>([
    ['/api/agent', agentHandler],
    ['/api/copilot', copilotHandler],
    ['/api/rewrite', rewriteHandler],
    ['/api/write', writeHandler],
  ]);

  const applyApiMiddleware = (middlewares: Connect.Server) => {
    middlewares.use(async (req, res, next) => {
      const url = req.url ? new URL(req.url, 'http://localhost').pathname : '';
      const handler = routeMap.get(url);

      if (!handler) {
        next();
        return;
      }

      try {
        const body = await readRequestBody(req);
        const request = Object.assign(req, { body });
        const response = createResponseAdapter(res);
        await handler(request, response);
      } catch (error) {
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : '本地 API 调用失败',
            })
          );
        }
      }
    });
  };

  return {
    name: 'local-api-plugin',
    configureServer(server) {
      applyApiMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      applyApiMiddleware(server.middlewares);
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), localApiPlugin(mode)],
  server: {
    port: 3000,
    open: true,
  },
}));
