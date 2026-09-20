"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = ["/login"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (isLoading) return;

    // Si no está autenticado y no es ruta pública, redirigir a login
    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/login");
    }

    // Si está autenticado y está en login, redirigir a dashboard
    if (isAuthenticated && isPublicRoute) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, isPublicRoute, router]);

  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Cargando EdukControl...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado y no es ruta pública, no renderizar
  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}
