"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { homeHrefForRole } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = ["/login"];

// Áreas con namespace propio (fuente única del gate por rol): un
// usuario solo puede estar DENTRO del área de SU rol, y nadie más
// puede entrar en ella. Los roles sin área (admin, principal, etc.)
// viven en el panel de administración /dashboard.
const ROLE_AREAS: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/prefect", roles: ["prefect"] },
  { prefix: "/social-worker", roles: ["social_worker"] },
];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Gate por rol (mismo patrón que los _layout de la app móvil, pero
  // resuelto aquí en un solo lugar para todo el web). Sin bucles:
  // homeHrefForRole es la fuente única de destinos por rol.
  const userRole = (user?.role ?? null) as UserRole | null;
  const pathArea = ROLE_AREAS.find((a) => pathname.startsWith(a.prefix));
  const userArea = userRole
    ? ROLE_AREAS.find((a) => a.roles.includes(userRole))
    : undefined;
  const roleMismatch =
    isAuthenticated &&
    !!userRole &&
    // Rol ajeno dentro de un área con namespace (prefecto en
    // /social-worker, admin en /prefect, …) → fuera de ahí.
    ((!!pathArea && !pathArea.roles.includes(userRole)) ||
      // Rol con área propia fuera de ella (social_worker en
      // /dashboard) → a SU home.
      (!!userArea && !pathname.startsWith(userArea.prefix)));

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
