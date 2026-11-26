// Sidebar del área del trabajador social (/social-worker/*)
// Variante del Sidebar de administración con las secciones del rol
// trabajador social: Inicio (dashboard), Consulta (grupos/alumnos/
// maestros), Operación (avisos, citatorios, reportes, pases de salida,
// inasistencias+justificantes) y Expedientes (listado con barra de
// progreso → ficha por alumno).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Briefcase,
  FileCheck,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Navegación del trabajador social — fuente única de las rutas de su
// área (espejo de prefectSections en PrefectSidebar).
const socialWorkerSections: NavSection[] = [
  {
    title: "Inicio",
    items: [
      { label: "Dashboard", href: "/social-worker/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Consulta",
    items: [
      { label: "Grupos", href: "/social-worker/groups", icon: Users },
      { label: "Alumnos", href: "/social-worker/students", icon: GraduationCap },
      { label: "Maestros", href: "/social-worker/teachers", icon: Briefcase },
    ],
  },
  {
    title: "Operación",
    items: [
      { label: "Avisos", href: "/social-worker/announcements", icon: Bell },
      { label: "Citatorios", href: "/social-worker/citations", icon: Mail },
      { label: "Reportes", href: "/social-worker/reports", icon: AlertTriangle },
      { label: "Pases de Salida", href: "/social-worker/exit-passes", icon: LogOut },
      // Fusión 2026-11-25: justificantes + inasistencias en una sola
      // pantalla con 3 tabs (la ruta attendance-summary redirige aquí).
      { label: "Inasistencias y Justificantes", href: "/social-worker/justificantes", icon: FileCheck },
    ],
  },
  {
    title: "Expedientes",
    items: [
      { label: "Listado", href: "/social-worker/expedientes", icon: FolderOpen },
    ],
  },
];

interface SocialWorkerSidebarProps {
  isCollapsed?: boolean;
}

export function SocialWorkerSidebar({
  isCollapsed = false,
}: SocialWorkerSidebarProps = {}) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside
      className={`
        bg-white border-r border-border h-full
        flex flex-col
        ${isCollapsed ? "w-16" : "w-64"}
        transition-all duration-200
      `}
    >
      {/* Logo — acento emerald del área del trabajador social */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-divider">
        <div className="flex items-center justify-center w-9 h-9 bg-emerald-600 rounded-xl shadow-sm shrink-0">
          <GraduationCap size={20} className="text-white" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-bold text-emerald-700 tracking-tight">
              EdukControl
            </span>
            {user?.role && (
              <span className="text-xs uppercase tracking-wider text-text-muted font-semibold">
                {user.role.replace("_", " ")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Navegación — aria-label distingue este landmark <nav> de
          otros (breadcrumb, etc.) para lectores de pantalla. */}
      <nav aria-label="Menú principal" className="flex-1 overflow-y-auto py-4">
        {socialWorkerSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!isCollapsed && (
              <p className="px-4 mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      // Marca la ruta ACTIVA para lectores de pantalla
                      // (WCAG 4.1.2): el estilo visual ya lo indicaba,
                      // ahora también el árbol de accesibilidad.
                      aria-current={isActive ? "page" : undefined}
                      className={`
                        flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                        transition-colors rounded-r-lg
                        ${
                          isActive
                            ? "bg-emerald-50 text-emerald-800 border-r-2 border-emerald-600"
                            : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"
                        }
                      `}
                    >
                      <span
                        className={
                          isActive ? "text-emerald-700" : "text-text-muted"
                        }
                      >
                        <Icon size={20} />
                      </span>
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
