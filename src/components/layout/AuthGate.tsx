"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { homeHrefForRole } from "@/lib/auth";

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = ["/login"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  // El área del prefecto vive en su propio namespace /prefect/* (ver
  // src/app/prefect/). Cualquier otro rol dentro de ese namespace — o un
  // prefecto fuera de él — está en la sección equivocada.
  const isPrefectArea = pathname.startsWith("/prefect");

  // Gate por rol (mismo patrón que los _layout de la app móvil, pero
  // resuelto aquí en un solo lugar para todo el web). Sin bucles:
  // homeHrefForRole es la fuente única de destinos por rol.
  const roleMismatch =
    isAuthenticated &&
    !!user &&
    ((user.role === "prefect" && !isPrefectArea) ||
      (user.role !== "prefect" && isPrefectArea));

  useEffect(() => {
    if (isLoading) return;

    // Si no está autenticado y no es ruta pública, redirigir a login
    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/login");
      return;
    }

    // Si está autenticado y está en login, redirigir al home de SU rol
    if (isAuthenticated && isPublicRoute) {
      router.replace(user ? homeHrefForRole(user.role) : "/dashboard");
      return;
    }

    // Rol cruzado → home del rol correcto (prefecto ⇄ admin).
    if (roleMismatch && user) {
      router.replace(homeHrefForRole(user.role));
    }
  }, [isAuthenticated, isLoading, isPublicRoute, roleMismatch, user, router]);

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

  // Si no está autenticado y no es ruta pública, no renderizar.
  // roleMismatch también renderiza null: evita el flash de pantallas
  // ajenas al rol (con sus fetchs 403) mientras ocurre el redirect.
  if ((!isAuthenticated && !isPublicRoute) || roleMismatch) {
    return null;
  }

  return <>{children}</>;
}
