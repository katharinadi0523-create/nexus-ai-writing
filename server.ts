import express, { type RequestHandler } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import agentHandler from './api/agent.js';
import copilotHandler from './api/copilot.js';
import rewriteHandler from './api/rewrite.js';
import writeHandler from './api/write.js';

type ApiHandler = (req: any, res: any) => void | Promise<void>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const port = parsePort(process.env.PORT);

function parsePort(rawValue: string | undefined): number {
  const parsed = Number.parseInt(rawValue || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
}

function wrapApiHandler(handler: ApiHandler): RequestHandler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : '服务内部异常';
      console.error('[server] unhandled api error:', error);

      if (res.headersSent) {
        const contentType = String(res.getHeader('Content-Type') || '');
        if (contentType.includes('text/event-stream') && !res.writableEnded) {
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        }
        if (!res.writableEnded) {
          res.end();
        }
        return;
      }

      res.status(500).json({ error: message });
    }
  };
}

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.all('/api/agent', wrapApiHandler(agentHandler));
app.all('/api/copilot', wrapApiHandler(copilotHandler));
app.all('/api/rewrite', wrapApiHandler(rewriteHandler));
app.all('/api/write', wrapApiHandler(writeHandler));

app.use(
  express.static(distDir, {
    index: false,
  })
);

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
    return;
  }

  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`[server] nexus-writing-studio listening on http://0.0.0.0:${port}`);
});
