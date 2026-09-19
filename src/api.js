const MODEL_API = import.meta.env.VITE_MODEL_API_URL || 'http://localhost:8001';
const AUTH_API = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8000';

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.message || `Request failed (${response.status})`);
  return data;
}

export const modelApi = {
  health: () => request(MODEL_API, '/health'),
  startResearch: (company, domain) => request(MODEL_API, '/run-pipeline', {
    method: 'POST', body: JSON.stringify({ company, ...(domain ? { domain } : {}) }),
  }),
  resumeResearch: (threadId, domain) => request(MODEL_API, `/run-pipeline/${threadId}/resume`, {
    method: 'POST', body: JSON.stringify({ domain }),
  }),
};

// Adjust these two paths only if the auth repository uses different routes.
export const authApi = {
  signIn: (email, password) => request(AUTH_API, '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signUp: (name, email, password) => request(AUTH_API, '/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
};
