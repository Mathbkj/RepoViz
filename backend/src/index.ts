import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { analyzeRouter } from './controllers/analyzeController';

const app = express();
const PORT = process.env.PORT ?? 3001;
const isProd = process.env.NODE_ENV === 'production';

// ALLOWED_ORIGIN=https://your-app.netlify.app  (or * for dev)
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// API routes under /api
app.use('/api', analyzeRouter);

// Serve built frontend in production
if (isProd) {
  const publicDir = path.join(__dirname, '..', 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    // SPA fallback — send index.html for all non-API routes
    app.get('*', (_req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }
}

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT} (${isProd ? 'production' : 'dev'})`);
});
