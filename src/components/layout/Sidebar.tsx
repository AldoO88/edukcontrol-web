// Sidebar de navegación
// Menú lateral para el panel de administración
// Generación dinámica según el rol del usuario.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  School,
  Users,
  BookOpen,
  Settings,
  ListChecks,
  CalendarOff,
  ClipboardList,
  GraduationCap as Maestro,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import type { UserRole } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const superAdminSections: NavSection[] = [
  {
    title: "Administración Global",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Escuelas", href: "/schools", icon: School },
      { label: "Usuarios", href: "/users", icon: Users },
      { label: "Configuración Global", href: "/settings", icon: Settings },
    ],
  },
];

const adminSections: NavSection[] = [
  {
    title: "Operación",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
}

export function Sidebar({ isCollapsed = false }: SidebarProps = {}) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Determinar secciones según rol
  const role: UserRole | undefined = user?.role;
  let sections: NavSection[] = adminSections;
  if (role === "super_admin") {
    sections = superAdminSections;
  }

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
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                {user.role.replace("_", " ")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4">
        {sections.map((section) => (
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
