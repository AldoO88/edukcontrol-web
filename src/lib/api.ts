// Cliente HTTP centralizado para EdukControl Web
// Usa fetch nativo con interceptor de JWT + refresh-on-401 + manejo
// de errores.
//
// Modelo de sesión:
//   - access JWT (15 min) en localStorage["edukcontrol_token"], se
//     envía en cada request como `Authorization: Bearer …`.
//   - refresh token (30 d en la web) en localStorage["edukcontrol_refresh"],
//     sin tocar el cuerpo del request; se usa solo en /auth/refresh.
//   - ambos se descartan juntos cuando el refresh expira o es
//     rechazado por reuso/family-revoke.
//
// Refresh-on-401:
//   En 401 → POST /auth/refresh con el refresh persistido → reemplaza
//   el par → reintenta la request original una sola vez. Si el refresh
//   falla → limpia storage + invoca el callback `onUnauthorized` y
//   deja que AuthGate redirija.
//
// onUnauthorized:
//   Callback que useAuth registra para resetear el estado React
//   (setUser(null)). Es una settable desde fuera para evitar el
//   import circular api ↔ useAuth.

import { API_URL } from "./constants";

class ApiClient {
  private baseUrl: string;
  private onUnauthorized: () => void = () => {};

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // ─── storage helpers ───────────────────────────────────────────────
  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("edukcontrol_token");
  }
  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("edukcontrol_refresh");
  }
  private setTokens(access: string, refresh: string): void {
    localStorage.setItem("edukcontrol_token", access);
    localStorage.setItem("edukcontrol_refresh", refresh);
  }
  private removeTokens(): void {
    localStorage.removeItem("edukcontrol_token");
    localStorage.removeItem("edukcontrol_refresh");
  }

  // Single-flight del refresh: si varias requests concurrentes
  // chocan con un 401, todas reutilizan la misma Promesa en vuelo.
  private refreshInFlight: Promise<boolean> | null = null;

  private async performRefresh(): Promise<boolean> {
    const refresh = this.getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { authToken?: string; refreshToken?: string };
      if (!data.authToken || !data.refreshToken) return false;
      this.setTokens(data.authToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  private async refreshTokens(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.performRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  // ─── request core ──────────────────────────────────────────────────
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    didAttemptRefresh = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Inyecta access token (NO el refresh — solo va en /auth/refresh).
    const token = this.getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // Refresh-on-401: una sola vez, y NO recursivamente sobre
    // /auth/refresh (eso es lo que se está usando para refrescar).
    if (
      response.status === 401 &&
      !didAttemptRefresh &&
      endpoint !== "/auth/refresh" &&
      endpoint !== "/auth/login"
    ) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        return this.request<T>(endpoint, options, true);
      }
      // Refresh falló (inválido, expirado, reuso, family revocado):
      // limpiamos y avisamos al AuthContext.
      this.removeTokens();
      this.onUnauthorized();
      throw new Error("Sesión expirada. Por favor, inicia sesión de nuevo.");
    }

    // 403 = sin permiso para este recurso → NO tocar la sesión.
    if (response.status === 403) {
      throw new Error("No tienes permisos para realizar esta acción.");
    }

    // Parsear respuesta
    let data: unknown;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const message =
        (data as Record<string, unknown>)?.message as string ||
        `Error ${response.status}`;
      throw new Error(message);
    }

    return data as T;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // Descarga binaria (p. ej. el PDF de fondo vía proxy autenticado).
  async getBinary(endpoint: string): Promise<ArrayBuffer> {
    const headers: Record<string, string> = {};
    const token = this.getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}${endpoint}`, { headers });

    if (response.status === 401) {
      // Para binarios NO hacemos refresh-on-401 (sería complejo clonar
      // el body). El caller del binario es 100% controlado (descarga
      // de fondo, exports), un token muerto simplemente se reintenta
      // manualmente. Limpiamos igual para mantener simetría.
      this.removeTokens();
      this.onUnauthorized();
      throw new Error("Sesión expirada. Por favor, inicia sesión de nuevo.");
    }
    if (response.status === 403) {
      throw new Error("No tienes permisos para realizar esta acción.");
    }
    if (!response.ok) {
      let message = `Error ${response.status}`;
      try {
        const data = await response.json();
        if (data?.message) message = String(data.message);
      } catch {
        // respuesta sin JSON
      }
      throw new Error(message);
    }
    return response.arrayBuffer();
  }

  // Upload de archivos (multipart/form-data) — tampoco aplica
  // refresh-on-401 (re-serializar un FormData es caro y propenso).
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    const token = this.getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (response.status === 401) {
      this.removeTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Sesión expirada. Por favor, inicia sesión de nuevo.");
    }

    if (response.status === 403) {
      throw new Error("No tienes permisos para realizar esta acción.");
    }

    const data = await response.json();

    if (!response.ok) {
      const message = (data as Record<string, unknown>)?.message as string;
      throw new Error(message || `Error ${response.status}`);
    }

    return data as T;
  }

  // ─── métodos de auth ───────────────────────────────────────────────
  setSessionTokens(access: string, refresh: string): void {
    this.setTokens(access, refresh);
  }

  setAuthToken(_token: string): void {
    // Compat: aún recibe token suelto. Migrar callers a setSessionTokens.
  }

  clearAuthToken(): void {
    this.removeTokens();
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Permite a useAuth hookeear el "la sesión murió" sin ciclo de
  // imports entre api y useAuth.
  setOnUnauthorized(callback: () => void): void {
    this.onUnauthorized = callback;
  }
}

// Instancia singleton
export const api = new ApiClient(API_URL);
