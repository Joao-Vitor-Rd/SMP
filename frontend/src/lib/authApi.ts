import axios, { AxiosHeaders } from 'axios';

export function getPublicApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').trim();

  if (typeof window === 'undefined') {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.hostname === 'backend') {
      return `http://localhost:${parsed.port || '8000'}`;
    }
  } catch {
    return raw;
  }

  return raw;
}

const API_BASE_URL = getPublicApiBaseUrl();

class SessionExpiredError extends Error {
  constructor(message: string = 'Sessão expirada') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

const authApi = axios.create({
  baseURL: API_BASE_URL,
});

authApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token_acesso');
    if (token) {
      const headers = AxiosHeaders.from(config.headers);
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
    }
  }

  return config;
});

authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token_acesso');
        localStorage.removeItem('token_atualizacao');
        localStorage.removeItem('usuario');
      }
      return Promise.reject(new SessionExpiredError());
    }

    return Promise.reject(error);
  }
);

export function clearAuthSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token_acesso');
    localStorage.removeItem('token_atualizacao');
    localStorage.removeItem('usuario');
  }
}

export { authApi, SessionExpiredError };
