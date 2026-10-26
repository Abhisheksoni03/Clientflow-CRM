const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'clientflow-token';

export const tokenStore = {
  get: () => window.localStorage.getItem(TOKEN_KEY),
  set: (token) => window.localStorage.setItem(TOKEN_KEY, token),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

async function request(path, options = {}) {
  let response;
  const token = tokenStore.get();
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Cannot reach the API. Check that the backend is running.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event('clientflow:unauthorized'));
    }
    throw new Error(payload.message || `Request failed (${response.status}).`);
  }
  return payload;
}

function queryString(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export const authApi = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (details) => request('/auth/register', { method: 'POST', body: JSON.stringify(details) }),
  forgotPassword: (details) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(details) }),
  resetPassword: (details) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(details) }),
  me: () => request('/auth/me'),
};

export const dashboardApi = {
  get: () => request('/dashboard'),
};

export const clientsApi = {
  list: (params) => request(`/clients${queryString(params)}`),
  get: (id) => request(`/clients/${encodeURIComponent(id)}`),
  create: (client) => request('/clients', { method: 'POST', body: JSON.stringify(client) }),
  update: (id, client) =>
    request(`/clients/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(client) }),
  addActivity: (id, message) =>
    request(`/clients/${encodeURIComponent(id)}/activity`, { method: 'POST', body: JSON.stringify({ message }) }),
  completeFollowUp: (id, completed) =>
    request(`/clients/${encodeURIComponent(id)}/follow-up`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
  remove: (id) => request(`/clients/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  exportCsv: async (params) => {
    let response;
    try {
      response = await fetch(`${API_URL}/clients/export${queryString(params)}`, {
        headers: { Authorization: `Bearer ${tokenStore.get()}` },
      });
    } catch {
      throw new Error('Cannot reach the API. Check that the backend is running.');
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        tokenStore.clear();
        window.dispatchEvent(new Event('clientflow:unauthorized'));
      }
      throw new Error(payload.message || `CSV export failed (${response.status}).`);
    }
    return response.blob();
  },
};
