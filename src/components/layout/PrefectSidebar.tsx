// Sidebar del área del prefecto (/prefect/*)
// Variante del Sidebar de administración con las secciones del rol
// prefecto: Inicio, Consulta (grupos/alumnos/maestros), Operación
// (avisos/citatorios/reportes/pases/inasistencias) y Perfil.
//
// Diferencia con la app móvil: en el celular las áreas operativas están
// ocultas tras los quick actions del dashboard (por espacio); en web la
// barra lateral las muestra todas — misma funcionalidad, mejor alcance.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Briefcase,
  Megaphone,
  CalendarDays,
  ScrollText,
  DoorOpen,
  UserX,
  User,
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

// Navegación del prefecto — fuente única de las rutas de su área.
const prefectSections: NavSection[] = [
  {
    title: "Inicio",
    items: [{ label: "Dashboard", href: "/prefect/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Consulta",
    items: [
      { label: "Grupos", href: "/prefect/groups", icon: Users },
      { label: "Alumnos", href: "/prefect/students", icon: GraduationCap },
      { label: "Maestros", href: "/prefect/teachers", icon: Briefcase },
    ],
  },
  {
    title: "Operación",
    items: [
      { label: "Avisos", href: "/prefect/announcements", icon: Megaphone },
      { label: "Citatorios", href: "/prefect/citations", icon: CalendarDays },
      { label: "Reportes", href: "/prefect/reports", icon: ScrollText },
      { label: "Pases de salida", href: "/prefect/exit-passes", icon: DoorOpen },
      { label: "Inasistencias", href: "/prefect/attendance-summary", icon: UserX },
    ],
  },
  {
    title: "Cuenta",
    items: [{ label: "Perfil", href: "/prefect/profile", icon: User }],
  },
];

interface PrefectSidebarProps {
  isCollapsed?: boolean;
}

export function PrefectSidebar({ isCollapsed = false }: PrefectSidebarProps = {}) {
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
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-divider">
        <div className="flex items-center justify-center w-9 h-9 bg-accent rounded-xl shadow-sm shrink-0">
          <GraduationCap size={20} className="text-white" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-bold text-accent tracking-tight">
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
          otros (breadcrumb, etc.) para lectores de pantalla (Fase F
          a11y). */}
      <nav aria-label="Menú principal" className="flex-1 overflow-y-auto py-4">
        {prefectSections.map((section) => (
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
                      // (WCAG 4.1.2 / skill accessibility): el estilo
                      // visual ya lo indicaba, ahora también el árbol de
                      // accesibilidad.
                      aria-current={isActive ? "page" : undefined}
                      className={`
                        flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                        transition-colors rounded-r-lg
                        ${
                          isActive
                            ? "bg-accent/10 text-accent-dark border-r-2 border-accent-dark"
                            : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"
                        }
                      `}
                    >
                      <span
                        className={
                          isActive ? "text-accent-dark" : "text-text-muted"
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
