// Cliente HTTP centralizado para EdukControl Web
// Usa fetch nativo con interceptor de JWT y manejo de errores.

import { API_URL } from "./constants";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("edukcontrol_token");
  }

  private setToken(token: string): void {
    localStorage.setItem("edukcontrol_token", token);
  }

  private removeToken(): void {
    localStorage.removeItem("edukcontrol_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // 401 = sesión inválida/expirada → limpiar token
    if (response.status === 401) {
      this.removeToken();
      // NO redirigir aquí — AuthGate maneja la redirección en el cliente.
      // Hacer window.location.href aquí causa loops infinitos cuando
      // verify() se llama al montar y no hay token.
      throw new Error("Sesión expirada. Por favor, inicia sesión de nuevo.");
    }

    // 403 = sin permiso para este recurso → NO limpiar token (la sesión sigue válida)
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

  // Upload de archivos (multipart/form-data)
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (response.status === 401) {
      this.removeToken();
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

  // Métodos de auth
  setAuthToken(token: string): void {
    this.setToken(token);
  }

  clearAuthToken(): void {
    this.removeToken();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

// Instancia singleton
export const api = new ApiClient(API_URL);
