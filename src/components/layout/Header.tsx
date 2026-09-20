// Header superior
// Barra con nombre de escuela, usuario y logout

"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Detectar si estamos en el detalle de una escuela
  const schoolMatch = pathname.match(/^\/schools\/([a-f0-9]+)/i);
  const isInSchoolDetail = !!schoolMatch;

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6">
      {/* Lado izquierdo */}
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-text-secondary">
          {isInSchoolDetail ? "Detalle de Escuela" : "Panel de Administración"}
        </h2>
      </div>

      {/* Lado derecho */}
      <div className="flex items-center gap-4">
        {/* Usuario */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-accent/10 rounded-full">
            <span className="text-sm font-bold text-accent-dark">
              {user?.name?.charAt(0) || "U"}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-text-primary">
              {user?.name} {user?.last_name}
            </p>
            <p className="text-xs text-text-secondary capitalize">
              {user?.role?.replace("_", " ")}
            </p>
          </div>
        </div>

        {/* Separator */}
        <div className="h-8 w-px bg-divider" />

        {/* Acciones */}
        <button
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-text-secondary"
          title="Configuración"
        >
          <Settings size={18} />
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-text-secondary"
        >
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  );
}
