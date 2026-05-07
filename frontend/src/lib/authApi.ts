import axios, { AxiosHeaders, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

class SessionExpiredError extends Error {
  constructor(message: string = 'Sessão expirada') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

const authApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,  // Enviar cookies automaticamente
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
  return config;
});

authApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Se o erro é 401 e ainda não tentamos refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Se já está fazendo refresh, aguarde e retente
        return new Promise((resolve) => {
          addRefreshSubscriber(() => {
            resolve(authApi(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Tentar renovar o token usando o refresh token armazenado no cookie
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true, // Enviar cookies com refresh token
          }
        );

        isRefreshing = false;

        // Notificar todos os subscribers que o token foi renovado
        onRefreshed(response.data.token_acesso);

        // Tentar novamente a requisição original com o novo token
        return authApi(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;

        // Se o refresh falhar, limpar sessão e rejeitar
        if (typeof window !== 'undefined') {
          localStorage.removeItem('usuario');
        }

        return Promise.reject(new SessionExpiredError());
      }
    }

    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('usuario');
      }
      return Promise.reject(new SessionExpiredError());
    }

    return Promise.reject(error);
  }
);

export function clearAuthSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('usuario');
  }
}

export { authApi, SessionExpiredError };
