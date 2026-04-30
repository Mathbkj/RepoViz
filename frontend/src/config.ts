/// <reference types="vite/client" />

// In development: empty string → Vite proxy handles /api/* → localhost:3001
// In production (Netlify): set VITE_API_URL=https://your-backend.onrender.com
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
