import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

/**
 * Resolves the target FastAPI backend URL at runtime from Vercel's service binding
 * (`process.env.BACKEND_URL`) or an explicitly configured `SLOTHAI_FASTAPI_URL`.
 */
function getBoundBackendUrl(): string {
  return (process.env.BACKEND_URL || process.env.SLOTHAI_FASTAPI_URL || '').trim();
}

interface BridgeResponse {
  _status: number;
  body: Record<string, unknown>;
}

/**
 * Forwards requests to the bound FastAPI `backend` service via `process.env.BACKEND_URL`
 * when available, or falls back to the local Python controller stdio bridge (`backend/cli_bridge.py`).
 */
async function invokePythonBackend(
  action: string,
  payload: Record<string, unknown>,
  fastApiPath?: string,
  method: 'GET' | 'POST' = 'POST'
): Promise<BridgeResponse> {
  const boundBackendUrl = getBoundBackendUrl();
  if (boundBackendUrl && fastApiPath) {
    try {
      const targetUrl = new URL(fastApiPath, boundBackendUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 95000);
      const resp = await fetch(targetUrl, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: method === 'POST' ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = (await resp.json()) as Record<string, unknown>;
      return { _status: resp.status, body: data };
    } catch {
      // Fall through to local Python controller bridge if HTTP service is unreachable in local non-Vercel dev
    }
  }

  return new Promise((resolve) => {
    const backendDir = path.resolve(process.cwd(), 'backend');
    const scriptPath = path.join(backendDir, 'cli_bridge.py');
    const child = spawn('python3', [scriptPath], {
      cwd: backendDir,
      env: { ...process.env, PYTHONPATH: backendDir },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', () => {
      try {
        const parsed = JSON.parse(stdout) as BridgeResponse;
        resolve(parsed);
      } catch {
        resolve({
          _status: 500,
          body: {
            success: false,
            error: stderr ? 'Python backend execution failed.' : 'Invalid response from Python controller.',
            code: 'bridge_error',
          },
        });
      }
    });

    child.stdin.write(JSON.stringify({ action, payload }));
    child.stdin.end();
  });
}

async function startServer() {
  const app = express();

  // Strict request size limit (6 MB max JSON body for base64 document uploads)
  app.use(express.json({ limit: '6mb' }));

  // Restricted CORS middleware (no wildcard *)
  const allowedOrigins = (
    process.env.SLOTHAI_CORS_ORIGINS ||
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173'
  )
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o && o !== '*');

  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // 1. GET /api/health
  app.get('/api/health', async (req, res) => {
    const model = typeof req.query.model === 'string' ? req.query.model : undefined;
    const querySuffix = model ? `?model=${encodeURIComponent(model)}` : '';
    const out = await invokePythonBackend('health', { model }, `/api/health${querySuffix}`, 'GET');
    res.status(out._status).json(out.body);
  });

  // 2. GET /api/models
  app.get('/api/models', async (_req, res) => {
    const out = await invokePythonBackend('models', {}, '/api/models', 'GET');
    res.status(out._status).json(out.body);
  });

  // 3. POST /api/models/pull
  app.post('/api/models/pull', async (req, res) => {
    const out = await invokePythonBackend('models_pull', req.body || {}, '/api/models/pull', 'POST');
    res.status(out._status).json(out.body);
  });

  // 4. POST /api/summarize
  app.post('/api/summarize', async (req, res) => {
    const out = await invokePythonBackend('summarize', req.body || {}, '/api/summarize', 'POST');
    res.status(out._status).json(out.body);
  });

  // 5. POST /api/extract-tasks
  app.post('/api/extract-tasks', async (req, res) => {
    const out = await invokePythonBackend('extract_tasks', req.body || {}, '/api/extract-tasks', 'POST');
    res.status(out._status).json(out.body);
  });

  // 6. POST /api/briefing
  app.post('/api/briefing', async (req, res) => {
    const out = await invokePythonBackend('briefing', req.body || {}, '/api/briefing', 'POST');
    res.status(out._status).json(out.body);
  });

  // 7. POST /api/organize/suggestions
  app.post('/api/organize/suggestions', async (req, res) => {
    const out = await invokePythonBackend(
      'organize_suggestions',
      req.body || {},
      '/api/organize/suggestions',
      'POST'
    );
    res.status(out._status).json(out.body);
  });

  // 8. POST /api/organize/apply
  app.post('/api/organize/apply', async (req, res) => {
    const out = await invokePythonBackend(
      'organize_apply',
      req.body || {},
      '/api/organize/apply',
      'POST'
    );
    res.status(out._status).json(out.body);
  });

  // 9. POST /api/documents/extract-text
  app.post('/api/documents/extract-text', async (req, res) => {
    const out = await invokePythonBackend(
      'extract_document_text',
      req.body || {},
      '/api/documents/extract-text',
      'POST'
    );
    res.status(out._status).json(out.body);
  });

  // 10. POST /api/connection/test
  app.post('/api/connection/test', async (req, res) => {
    const out = await invokePythonBackend(
      'connection_test',
      req.body || {},
      '/api/connection/test',
      'POST'
    );
    res.status(out._status).json(out.body);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SlothAI server listening on http://localhost:${PORT}`);
  });
}

startServer();
