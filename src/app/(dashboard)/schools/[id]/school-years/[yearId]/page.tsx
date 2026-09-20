// Overview del ciclo escolar

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { SchoolYear } from "@/lib/types";
import {
  Calendar,
  Clock,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  TrendingUp,
  FileText,
  Bell,
  Key,
  UserCheck,
} from "lucide-react";

export default function SchoolYearOverviewPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSchoolYear() {
      try {
        const res = await api.get<SchoolYear>(`${ENDPOINTS.SCHOOL_YEARS}/${yearId}`);
        setSchoolYear(res);
      } catch {
        // Error silencioso
      } finally {
        setIsLoading(false);
      }
    }
    fetchSchoolYear();
  }, [yearId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!schoolYear) {
    return (
      <div className="text-center py-12 text-text-secondary">
        No se encontró el ciclo escolar.
      </div>
    );
  }

  const basePath = `/schools/${schoolId}/school-years/${yearId}`;

  const quickLinks = [
    { label: "Turnos", href: "shifts", icon: <Clock size={20} />, color: "text-accent-dark", bgColor: "bg-accent/10" },
    { label: "Materias", href: "subjects", icon: <BookOpen size={20} />, color: "text-emerald-600", bgColor: "bg-emerald-100" },
    { label: "Maestros", href: "teachers", icon: <Users size={20} />, color: "text-amber-600", bgColor: "bg-amber-100" },
    { label: "Asignar Materias", href: "teacher-subjects", icon: <UserCheck size={20} />, color: "text-violet-600", bgColor: "bg-violet-100" },
    { label: "Grupos", href: "groups", icon: <ClipboardList size={20} />, color: "text-rose-600", bgColor: "bg-rose-100" },
    { label: "Períodos", href: "grading-periods", icon: <TrendingUp size={20} />, color: "text-sky-600", bgColor: "bg-sky-100" },
    { label: "Alumnos", href: "students", icon: <GraduationCap size={20} />, color: "text-orange-600", bgColor: "bg-orange-100" },
    { label: "Inscripciones", href: "enrollments", icon: <FileText size={20} />, color: "text-teal-600", bgColor: "bg-teal-100" },
    { label: "Horarios", href: "schedules", icon: <Bell size={20} />, color: "text-indigo-600", bgColor: "bg-indigo-100" },
    { label: "Credenciales", href: "credentials", icon: <Key size={20} />, color: "text-pink-600", bgColor: "bg-pink-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Info del ciclo */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-accent/10 rounded-xl">
              <Calendar size={32} className="text-accent-dark" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Ciclo {schoolYear.name}</h2>
              <p className="text-sm text-text-secondary">
                {new Date(schoolYear.startDate).toLocaleDateString("es-MX")} —{" "}
                {new Date(schoolYear.endDate).toLocaleDateString("es-MX")}
              </p>
            </div>
            <div className="ml-auto">
              <Badge variant={schoolYear.isActive ? "emerald" : "slate"}>
                {schoolYear.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Links de acceso rápido */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Configuración del Ciclo
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={`${basePath}/${link.href}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardBody>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${link.bgColor}`}>
                      <span className={link.color}>{link.icon}</span>
                    </div>
                    <span className="font-medium text-text-primary">{link.label}</span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
