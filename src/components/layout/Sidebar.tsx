// Sidebar de navegación
// Menú lateral para el panel de administración

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
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Sidebar principal (fuera del detalle de escuela)
const MAIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "Módulos Globales",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
      { label: "Escuelas", href: "/schools", icon: <School size={20} /> },
      { label: "Usuarios", href: "/users", icon: <Users size={20} /> },
      { label: "Catálogos", href: "/schools", icon: <BookOpen size={20} /> },
      { label: "Configuración Global", href: "/users", icon: <Settings size={20} /> },
    ],
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
}

export function Sidebar({ isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();

  const sections = MAIN_NAV_SECTIONS;

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
        <div className="flex items-center justify-center w-9 h-9 bg-accent rounded-xl shadow-sm">
          <GraduationCap size={20} className="text-white" />
        </div>
        {!isCollapsed && (
          <span className="text-lg font-bold text-accent tracking-tight">
            EdukControl
          </span>
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
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                        transition-colors rounded-r-lg
                        ${isActive
                          ? "bg-accent/10 text-accent-dark border-r-2 border-accent-dark"
                          : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"
                        }
                      `}
                    >
                      <span className={isActive ? "text-accent-dark" : "text-text-muted"}>
                        {item.icon}
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
