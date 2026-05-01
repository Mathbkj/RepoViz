import { useEffect, useState, useCallback } from 'react';
import type { GitHubUser } from '@repo-viz/shared';
import { API_BASE } from '../config';

const TOKEN_KEY = 'gh_token';

export interface AuthState {
  token: string | null;
  user: GitHubUser | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(false);

  // Pick up token from URL hash after OAuth redirect
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      const match = hash.match(/[#&]access_token=([^&]+)/);
      if (match) {
        const t = match[1];
        localStorage.setItem(TOKEN_KEY, t);
        setToken(t);
        // Clean up hash
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('auth_error')) {
        console.error('[auth] error:', params.get('auth_error'));
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    // Check hash on mount
    checkHash();

    // Listen for hash changes (when user clicks login again while already on GitHub)
    const handleHashChange = () => {
      checkHash();
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Fetch user info when token is available
  useEffect(() => {
    if (!token) { setUser(null); return; }
    setLoading(true);
    fetch(`${API_BASE}/api/repo/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((u: GitHubUser) => setUser(u))
      .catch(() => {
        // Token invalid — clear it
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(() => {
    window.location.href = `${API_BASE}/api/auth/github`;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return { token, user, loading, login, logout };
}
