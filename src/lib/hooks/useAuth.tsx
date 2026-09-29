// Hook personalizado para autenticación
// Gestiona la sesión del usuario

"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { verify, logout as authLogout } from "@/lib/auth";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const verifiedUser = await verify();
      setUser(verifiedUser);
    } catch {
      setUser(null);
    }
  }, []);

  // Conectar el "onUnauthorized" del cliente HTTP: cuando el refresh
  // falla o hay un 401 irreparable, limpiamos el estado React. Antes
  // el token se borraba de localStorage pero `user` quedaba lleno y
  // la UI seguía "logueada" con API rota hasta recargar — bug arreglado.
  //
  // Esta asignación es síncrona (solo guarda una referencia a un
  // callback). No causa setState en el render, así que vive en el
  // cuerpo del Provider. El callback solo dispara setUser(null) cuando
  // la red devuelve un 401 irreparable, fuera del flujo de render.
  api.setOnUnauthorized(() => setUser(null));

  // Restaurar sesión al montar (una sola vez). El setIsLoading(false)
  // se hace en el callback del `.finally()` que es la respuesta del
  // sistema externo (verify) — exactamente el patrón permitido por la
  // regla ("calling setState in a callback function when external state
  // changes"). La regla del lint marca esta sintaxis por defecto, por
  // eso se desactiva puntualmente con la justificación abajo.
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [refreshUser]);

  const login = useCallback((userData: User, _token: string) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
