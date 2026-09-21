// Setup Wizard para Super Admin
// Muestra qué piezas de configuración faltan para una escuela recién creada
// y guía al usuario a configurar cada una.
//
// Backend endpoint: GET /api/dashboard/super-admin/schools/:schoolId/setup-status
// Auth requerida: super_admin.

"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { Card, CardBody } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

interface SetupStatus {
  schoolId: string;
  schoolName: string;
  schoolCct: string;
  activeYear: {
    _id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  hasActiveYear: boolean;
  hasShift: boolean;
  hasCalendar: boolean;
  hasSubjects: boolean;
  hasTeachers: boolean;
  hasGroups: boolean;
  hasClassSchedules: boolean;
  counts: {
    shifts: number;
    groups: number;
    teachers: number;
    subjects: number;
    calendarDays: number;
    classSchedules: number;
  };
  progress: {
    completed: number;
    total: number;
    percent: number;
  };
  missing: string[];
}

interface StepCard {
  key: keyof Pick<
    SetupStatus,
    | "hasActiveYear"
    | "hasShift"
    | "hasCalendar"
    | "hasSubjects"
    | "hasTeachers"
    | "hasGroups"
    | "hasClassSchedules"
  >;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  href: (schoolId: string) => string;
  count?: keyof SetupStatus["counts"];
  countLabel: (count: number) => string;
}

const STEPS: StepCard[] = [
  {
    key: "hasActiveYear",
    icon: Calendar,
    title: "Ciclo Escolar Activo",
    description: "Crear y activar el ciclo escolar (ej. 2025-2026).",
    href: (id) => `/schools/${id}/school-years`,
    count: undefined,
    countLabel: () => "",
  },
  {
    key: "hasShift",
    icon: Clock,
    title: "Turnos",
    description: "Configurar al menos un turno (Matutino/Vespertino).",
    href: (id) => `/schools/${id}/school-years/_/shifts`,
    count: "shifts",
    countLabel: (n) => `${n} turno${n === 1 ? "" : "s"} configurado${n === 1 ? "" : "s"}`,
  },
  {
    key: "hasCalendar",
    icon: Calendar,
    title: "Calendario Escolar",
    description:
      "Marcar días festivos, vacaciones y suspensiones (afecta el cron de ausencias).",
    href: (id) => `/schools/${id}/school-years/_/calendar`,
    count: "calendarDays",
    countLabel: (n) => `${n} día${n === 1 ? "" : "s"} marcado${n === 1 ? "" : "s"}`,
  },
  {
    key: "hasSubjects",
    icon: BookOpen,
    title: "Materias",
    description: "Dar de alta el catálogo de materias del ciclo.",
    href: (id) => `/schools/${id}/school-years/_/subjects`,
    count: "subjects",
    countLabel: (n) => `${n} materia${n === 1 ? "" : "s"}`,
  },
  {
    key: "hasTeachers",
    icon: Users,
    title: "Maestros",
    description: "Crear usuarios con rol 'teacher' para esta escuela.",
    href: (id) => `/schools/${id}/school-years/_/teachers`,
    count: "teachers",
    countLabel: (n) => `${n} maestro${n === 1 ? "" : "s"}`,
  },
  {
    key: "hasGroups",
    icon: ClipboardList,
    title: "Grupos",
    description: "Crear los grupos del ciclo (ej. 1A, 1B, 2A, ...).",
    href: (id) => `/schools/${id}/school-years/_/groups`,
    count: "groups",
    countLabel: (n) => `${n} grupo${n === 1 ? "" : "s"}`,
  },
  {
    key: "hasClassSchedules",
    icon: GraduationCap,
    title: "Horarios de Clase",
    description: "Asignar materias a maestros y crear el horario semanal.",
    href: (id) => `/schools/${id}/school-years/_/schedules`,
    count: "classSchedules",
    countLabel: (n) => `${n} horario${n === 1 ? "" : "s"}`,
  },
];

export default function SetupWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: schoolId } = use(params);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<SetupStatus>(
        ENDPOINTS.DASHBOARD_SETUP_STATUS(schoolId)
      );
      setStatus(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el estado");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [schoolId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto text-error mb-3" />
        <p className="text-error">
          {error || "No se pudo cargar el estado de configuración."}
        </p>
      </div>
    );
  }

  const allComplete = status.missing.length === 0;

  return (
    <div className="space-y-6">
      {/* Header con barra de progreso */}
      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                Asistente de Configuración
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Completa los pasos para tener la escuela lista para operar.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-accent-dark">
                {status.progress.percent}%
              </div>
              <div className="text-xs text-text-secondary">
                {status.progress.completed} de {status.progress.total}{" "}
                completados
              </div>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mt-4">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-dark transition-all duration-300"
                style={{ width: `${status.progress.percent}%` }}
              />
            </div>
          </div>

          {allComplete ? (
            <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-800">
                  ¡Configuración completa!
                </p>
                <p className="text-sm text-emerald-700">
                  Todos los pasos de configuración están listos.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">
                  Faltan {status.missing.length} paso
                  {status.missing.length === 1 ? "" : "s"}
                </p>
                <p className="text-sm text-amber-700">
                  Sigue el orden sugerido abajo para tener todo listo antes
                  de inscribir alumnos.
                </p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Ciclo escolar activo info */}
      {status.activeYear && (
        <div className="text-sm text-text-secondary px-1">
          Ciclo escolar activo:{" "}
          <span className="font-semibold text-text-primary">
            {status.activeYear.name}
          </span>
        </div>
      )}

      {/* Grid de pasos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const completed = status[step.key];
          const count = step.count ? status.counts[step.count] : 0;

          return (
            <Link
              key={step.key}
              href={completed ? "#" : step.href(schoolId)}
              className={
                completed
                  ? "pointer-events-none"
                  : "transition-shadow hover:shadow-md"
              }
            >
              <Card>
                <CardBody>
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                        completed ? "bg-emerald-100" : "bg-slate-100"
                      }`}
                    >
                      <Icon
                        size={24}
                        className={
                          completed ? "text-emerald-600" : "text-text-secondary"
                        }
                      />
                    </div>
                    {completed ? (
                      <Badge variant="emerald">Completado</Badge>
                    ) : (
                      <Badge variant="slate">Pendiente</Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">
                    {step.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    {completed && step.count && (
                      <span className="text-xs text-emerald-700">
                        {step.countLabel(count)}
                      </span>
                    )}
                    {!completed && (
                      <span className="flex items-center text-sm font-medium text-accent-dark ml-auto">
                        Configurar <ArrowRight size={14} className="ml-1" />
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
