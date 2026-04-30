import { Router, type Request, type Response } from 'express';
import axios from 'axios';

const router = Router();

const CLIENT_ID     = process.env.GITHUB_CLIENT_ID!;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const FRONTEND_URL  = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// ── Redirect user to GitHub OAuth ────────────────────────────────────────────
router.get('/github', (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: 'repo user',
    allow_signup: 'true',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// ── GitHub OAuth callback ─────────────────────────────────────────────────────
router.get('/github/callback', async (req: Request, res: Response): Promise<void> => {
  const code = req.query.code as string | undefined;

  if (!code) {
    res.redirect(`${FRONTEND_URL}?auth_error=no_code`);
    return;
  }

  try {
    const { data } = await axios.post<string>(
      'https://github.com/login/oauth/access_token',
      { client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code },
      { headers: { Accept: 'application/json' } }
    );

    // data is JSON when Accept: application/json
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const token = (parsed as { access_token?: string }).access_token;

    if (!token) {
      res.redirect(`${FRONTEND_URL}?auth_error=no_token`);
      return;
    }

    // Redirect to frontend with token in hash (never in query string – avoids server logs)
    res.redirect(`${FRONTEND_URL}#access_token=${token}`);
  } catch (err) {
    console.error('[auth] callback error', err);
    res.redirect(`${FRONTEND_URL}?auth_error=exchange_failed`);
  }
});

export default router;
