// Overview del ciclo escolar

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
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

  const fetchAll = async () => {
    try {
      const yearRes = await api.get<SchoolYear>(
        `${ENDPOINTS.SCHOOL_YEARS}/${yearId}`
      );
      setSchoolYear(yearRes);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [yearId]);

  const basePath = `/schools/${schoolId}/school-years/${yearId}`;

  const linkCategories = [
    {
      title: "1. Estructura Académica",
      links: [
        { label: "Turnos", href: "shifts", icon: <Clock size={20} />, color: "text-accent-dark", bgColor: "bg-accent/10" },
        { label: "Materias", href: "subjects", icon: <BookOpen size={20} />, color: "text-emerald-600", bgColor: "bg-emerald-100" },
        { label: "Grupos", href: "groups", icon: <ClipboardList size={20} />, color: "text-rose-600", bgColor: "bg-rose-100" },
        { label: "Períodos", href: "grading-periods", icon: <TrendingUp size={20} />, color: "text-sky-600", bgColor: "bg-sky-100" },
        { label: "Calendario", href: "calendar", icon: <Calendar size={20} />, color: "text-amber-600", bgColor: "bg-amber-100" },
      ],
    },
    {
      title: "2. Personal y Asignaciones",
      links: [
        { label: "Maestros", href: "teachers", icon: <Users size={20} />, color: "text-amber-600", bgColor: "bg-amber-100" },
        { label: "Asignar Materias", href: "teacher-subjects", icon: <UserCheck size={20} />, color: "text-violet-600", bgColor: "bg-violet-100" },
      ],
    },
    {
      title: "3. Alumnado",
      links: [
        { label: "Alumnos", href: "students", icon: <GraduationCap size={20} />, color: "text-orange-600", bgColor: "bg-orange-100" },
        { label: "Inscripciones", href: "enrollments", icon: <FileText size={20} />, color: "text-teal-600", bgColor: "bg-teal-100" },
      ],
    },
    {
      title: "4. Operación Diaria",
      links: [
        { label: "Horarios", href: "schedules", icon: <Bell size={20} />, color: "text-indigo-600", bgColor: "bg-indigo-100" },
        { label: "Credenciales", href: "credentials", icon: <Key size={20} />, color: "text-pink-600", bgColor: "bg-pink-100" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Info del ciclo */}
      {schoolYear && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 bg-accent/10 rounded-xl">
                <Calendar size={32} className="text-accent-dark" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  Ciclo {schoolYear.name}
                </h2>
                <p className="text-sm text-text-secondary">
                  {schoolYear.startDate.slice(0, 10).split("-").reverse().join("/")} —{" "}
                  {schoolYear.endDate.slice(0, 10).split("-").reverse().join("/")}
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
      )}

      {/* Links de acceso rápido */}
      {schoolYear && (
        <div className="space-y-6">
          {linkCategories.map((cat) => (
            <div key={cat.title}>
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                {cat.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.links.map((link) => (
                  <Link key={link.href} href={`${basePath}/${link.href}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardBody>
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex items-center justify-center w-12 h-12 rounded-xl ${link.bgColor}`}
                          >
                            <span className={link.color}>{link.icon}</span>
                          </div>
                          <span className="font-medium text-text-primary">
                            {link.label}
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <LoadingState message="Cargando ciclo escolar..." height="page" />
      )}

      {!isLoading && !schoolYear && (
        <ErrorState
          title="Ciclo escolar no encontrado"
          message="El ciclo escolar que buscas no existe o fue eliminado."
          action={{
            label: "Volver a ciclos",
            onClick: () => {
              if (typeof window !== "undefined") {
                window.location.href = `/schools/${schoolId}`;
              }
            },
          }}
        />
      )}

    </div>
  );
}
