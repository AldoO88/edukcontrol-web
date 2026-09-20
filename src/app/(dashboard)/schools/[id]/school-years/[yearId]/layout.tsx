// Layout del detalle de ciclo escolar con tabs horizontales

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { SchoolYear } from "@/lib/types";
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  UserCheck,
  ClipboardList,
  TrendingUp,
  GraduationCap,
  FileText,
  Bell,
  Key,
  ArrowLeft,
} from "lucide-react";

interface SchoolYearDetailLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; yearId: string }>;
}

const SCHOOL_YEAR_TABS = [
  { label: "General", href: "", icon: <Calendar size={16} /> },
  { label: "Turnos", href: "shifts", icon: <Clock size={16} /> },
  { label: "Materias", href: "subjects", icon: <BookOpen size={16} /> },
  { label: "Maestros", href: "teachers", icon: <Users size={16} /> },
  { label: "Asignar Materias", href: "teacher-subjects", icon: <UserCheck size={16} /> },
  { label: "Grupos", href: "groups", icon: <ClipboardList size={16} /> },
  { label: "Períodos", href: "grading-periods", icon: <TrendingUp size={16} /> },
  { label: "Alumnos", href: "students", icon: <GraduationCap size={16} /> },
  { label: "Inscripciones", href: "enrollments", icon: <FileText size={16} /> },
  { label: "Horarios", href: "schedules", icon: <Bell size={16} /> },
  { label: "Credenciales", href: "credentials", icon: <Key size={16} /> },
];

export default function SchoolYearDetailLayout({
  children,
  params,
}: SchoolYearDetailLayoutProps) {
  const { id: schoolId, yearId } = use(params);
  const pathname = usePathname();
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null);

  const basePath = `/schools/${schoolId}/school-years/${yearId}`;

  useEffect(() => {
    async function fetchSchoolYear() {
      try {
        const res = await api.get<SchoolYear>(`${ENDPOINTS.SCHOOL_YEARS}/${yearId}`);
        setSchoolYear(res);
      } catch {
        // Error silencioso
      }
    }
    fetchSchoolYear();
  }, [yearId]);

  const activeTab = pathname === basePath
    ? ""
    : pathname.replace(basePath + "/", "").split("/")[0];

  return (
    <div className="space-y-6">
      {/* Header con botón volver y nombre del ciclo */}
      <div className="flex items-center gap-4">
        <Link
          href={`/schools/${schoolId}/school-years`}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors text-text-secondary"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Ciclo {schoolYear?.name || "Cargando..."}
          </h1>
          {schoolYear && (
            <p className="text-sm text-text-secondary">
              {new Date(schoolYear.startDate).toLocaleDateString("es-MX")} —{" "}
              {new Date(schoolYear.endDate).toLocaleDateString("es-MX")}
            </p>
          )}
        </div>
      </div>

      {/* Tabs horizontales */}
      <nav className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
        {SCHOOL_YEAR_TABS.map((tab) => {
          const href = tab.href ? `${basePath}/${tab.href}` : basePath;
          const isActive = activeTab === tab.href;
          return (
            <Link
              key={tab.href || "general"}
              href={href}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg
                transition-colors whitespace-nowrap
                ${isActive
                  ? "bg-accent/10 text-accent-dark"
                  : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Contenido de la página */}
      <div>{children}</div>
    </div>
  );
}
