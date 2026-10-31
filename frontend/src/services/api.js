const rawBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = `${rawBase}/api/v1`;

export class ApiError extends Error {
  constructor(status, payload, fallback) {
    super(payload?.message || fallback || 'Something went wrong.');
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.code || 'REQUEST_FAILED';
    this.details = payload?.details || [];
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, null, 'Cannot reach the server. Check that the backend is running.');
  }

  let payload = null;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/login')) {
      window.dispatchEvent(new CustomEvent('quickbite:unauthorized'));
    }
    throw new ApiError(response.status, payload?.error, `Request failed (${response.status}).`);
  }

  return payload?.data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
