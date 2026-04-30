import { Router, type Request, type Response } from 'express';
import type { AnalyzeRequest, AnalyzeResponse, ApiError } from '@repo-viz/shared';
import { AnalyzeService } from '../services/analyzeService';

export const analyzeRouter = Router();
const analyzeService = new AnalyzeService();

// Mounted at /api, so full path is POST /api/analyze
analyzeRouter.post('/analyze', async (req: Request, res: Response) => {
  const body = req.body as AnalyzeRequest;

  if (!body?.repoUrl || typeof body.repoUrl !== 'string') {
    const err: ApiError = { error: 'Missing or invalid repoUrl' };
    res.status(400).json(err);
    return;
  }

  const url = body.repoUrl.trim();
  if (!/^https:\/\/github\.com\/.+\/.+/.test(url)) {
    const err: ApiError = { error: 'Only GitHub URLs are supported (https://github.com/owner/repo)' };
    res.status(400).json(err);
    return;
  }

  try {
    const result = await analyzeService.analyze(url);
    const response: AnalyzeResponse = result;
    res.json(response);
  } catch (err: unknown) {
    console.error('[analyze] error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const apiErr: ApiError = { error: message };
    res.status(500).json(apiErr);
  }
});
