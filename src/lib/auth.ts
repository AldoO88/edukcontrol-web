// Servicios de autenticación
// Login, verify, logout, changePassword

import { api } from "./api";
import { ENDPOINTS } from "./constants";
import type { AuthResponse, User } from "./types";

interface VerifyResponse {
  user: {
    _id: string;
    email?: string;
    name: string;
    last_name?: string;
    role: string;
    phoneNumber?: string;
    schoolId?: string;
  };
}

export async function login(
  phone: string,
  password: string
): Promise<{ success: boolean; user?: User; token?: string; message?: string }> {
  try {
    // La web no tiene checkbox "recordar mi sesión" (solo la app),
    // así que siempre pide sesión larga: refresh 30 d + access 15 min.
    const response = await api.post<AuthResponse>(ENDPOINTS.LOGIN, {
      phone,
      password,
      remember: true,
      client: "web",
    });

    if (response.authToken && response.refreshToken) {
      api.setSessionTokens(response.authToken, response.refreshToken);
    } else if (response.authToken) {
      // Compat: backend sin refresh todavía (no debería pasar).
      api.setAuthToken(response.authToken);
    }

    return {
      success: true,
      user: response.user,
      token: response.authToken,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al iniciar sesión";
    return { success: false, message };
  }
}

export async function verify(): Promise<User | null> {
  try {
    if (!api.isAuthenticated()) {
      return null;
    }

    const response = await api.get<VerifyResponse>(ENDPOINTS.VERIFY);

    if (!response?.user?._id) {
      console.warn("[auth] verify: respuesta sin user._id", response);
      return null;
    }

    return {
      _id: response.user._id,
      email: response.user.email,
      name: response.user.name,
      last_name: response.user.last_name,
      role: response.user.role as User["role"],
      phoneNumber: response.user.phoneNumber || "",
      school: response.user.schoolId || undefined,
      isActive: true,
    };
  } catch (error) {
    console.warn("[auth] verify falló:", error instanceof Error ? error.message : error);
    api.clearAuthToken();
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    // El backend acepta el refreshToken en body para revocarlo
    // específicamente. Best-effort: si falla, igual limpiamos local
    // (el access de 15 min expirará solo).
    const refresh =
      typeof window !== "undefined"
        ? localStorage.getItem("edukcontrol_refresh")
        : null;
    await api
      .post(ENDPOINTS.LOGOUT, refresh ? { refreshToken: refresh } : undefined)
      .catch(() => {});
  } finally {
    api.clearAuthToken();
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await api.put(ENDPOINTS.CHANGE_PASSWORD, { currentPassword, newPassword });
    return { success: true, message: "Contraseña actualizada correctamente." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cambiar la contraseña";
    return { success: false, message };
  }
}
