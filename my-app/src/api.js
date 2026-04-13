// Centralised API base URL.
// Set VITE_API_BASE_URL in your .env / Vercel environment variables
// to point at your deployed backend (e.g. https://museum-project.onrender.com).
// Falls back to localhost:5000 for local development.
export const API_BASE = () =>
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
