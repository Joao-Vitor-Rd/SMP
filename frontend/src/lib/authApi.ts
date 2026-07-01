import axios, { AxiosError } from 'axios';

export const ACCESS_TOKEN_STORAGE_KEY = 'accessToken';

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

class SessionExpiredError extends Error {
  constructor(message: string = 'Sessão expirada') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

const authApi = axios.create({
  withCredentials: true,
});

// Flag para evitar múltiplas tentativas de refresh simultâneas
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

authApi.interceptors.request.use((config) => {
  config.baseURL = getPublicApiBaseUrl();
  config.withCredentials = true;

  // Leitura dinâmica a cada requisição — nunca no escopo global do módulo.
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token?.trim()) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token.trim()}`;
    }
  }

  return config;
});

authApi.interceptors.response.use(
  (response) => {
    if (typeof window !== 'undefined') {
      const tokenAcesso = response.data?.token_acesso;
      if (typeof tokenAcesso === 'string' && tokenAcesso.trim()) {
        localStorage.setItem('accessToken', tokenAcesso.trim());
      }
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber(() => {
            resolve(authApi(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${getPublicApiBaseUrl()}/auth/refresh`,
          {},
          {
            withCredentials: true,
          }
        );

        isRefreshing = false;

        if (typeof window !== 'undefined') {
          const tokenAcesso = response.data?.token_acesso;
          if (typeof tokenAcesso === 'string' && tokenAcesso.trim()) {
            localStorage.setItem('accessToken', tokenAcesso.trim());
          }
        }

        onRefreshed(response.data?.token_acesso ?? '');

        return authApi(originalRequest);
      } catch {
        isRefreshing = false;
        clearAuthSession();
        return Promise.reject(new SessionExpiredError());
      }
    }

    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthSession();
      return Promise.reject(new SessionExpiredError());
    }

    return Promise.reject(error);
  }
);

export function clearAuthSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('usuario');
    localStorage.removeItem('accessToken');
  }
}

export { authApi, SessionExpiredError };
