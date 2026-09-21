// Overview del ciclo escolar

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
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
  CalendarOff,
  Edit3,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Días de la semana (mismo orden que en el modal de crear ciclo)
const WEEKDAYS = [
  { value: 0, short: "Dom", long: "Domingo" },
  { value: 1, short: "Lun", long: "Lunes" },
  { value: 2, short: "Mar", long: "Martes" },
  { value: 3, short: "Mié", long: "Miércoles" },
  { value: 4, short: "Jue", long: "Jueves" },
  { value: 5, short: "Vie", long: "Viernes" },
  { value: 6, short: "Sáb", long: "Sábado" },
];

const nonLectivoSchema = z.object({
  weekdays: z.array(z.number().min(0).max(6)),
});
type NonLectivoForm = z.infer<typeof nonLectivoSchema>;

export default function SchoolYearOverviewPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null);
  const [nonLectivoDates, setNonLectivoDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<NonLectivoForm>({
    resolver: zodResolver(nonLectivoSchema),
    defaultValues: { weekdays: [] },
  });

  const selectedDays = watch("weekdays") || [];

  const fetchAll = async () => {
    try {
      const [yearRes, calRes] = await Promise.all([
        api.get<SchoolYear>(`${ENDPOINTS.SCHOOL_YEARS}/${yearId}`),
        api.get<{ items: { dayOfWeek: number; date: string }[] }>(
          `${ENDPOINTS.SCHOOL_CALENDAR}?school_year_id=${yearId}&type=non_lectivo`
        ),
      ]);
      setSchoolYear(yearRes);
      // Deduplicate por día de la semana (un mismo weekday puede
      // aparecer en múltiples fechas; solo nos importa el set de días).
      const daySet = new Set<number>();
      const dates: string[] = [];
      for (const it of calRes.items || []) {
        if (!daySet.has(it.dayOfWeek)) {
          daySet.add(it.dayOfWeek);
          dates.push(it.date);
        }
      }
      setNonLectivoDates(dates);
    } catch {
      // silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId]);

  const openEditModal = () => {
    // Pre-popular form con los weekdays ya marcados (de la BD)
    const existingDays = new Set<number>();
    for (const date of nonLectivoDates) {
      const d = new Date(date);
      existingDays.add(d.getUTCDay());
    }
    reset({ weekdays: Array.from(existingDays).sort() });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: NonLectivoForm) => {
    try {
      // El backend AGREGA nuevas entries; las existentes con type distinto
      // se mantienen (no se eliminan). Para quitar un día marcado por
      // error, hay que hacerlo manualmente desde el calendario.
      if (data.weekdays.length > 0) {
        await api.post(ENDPOINTS.SCHOOL_CALENDAR_WEEKENDS, {
          school_year_id: yearId,
          weekdays: data.weekdays,
        });
      }
      setIsModalOpen(false);
      await fetchAll();
    } catch (err) {
      console.error("Failed to update non-lectivo days:", err);
      // Mantener el modal abierto para que el user pueda reintentar
    }
  };

  const nonLectivoCount = nonLectivoDates.length;
  const isInitialized = !isLoading;
  const nonLectivoEnabled = isInitialized && schoolYear;
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

  const renderNonLectivoTile = () => {
    if (!nonLectivoEnabled) {
      // Mientras el cycle_year está cargando, ocultar el tile en vez de
      // mostrar "0 días no lectivos" (que sería confuso).
      return null;
    }
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={openEditModal}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openEditModal();
          }
        }}
        className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer p-6"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl">
            <CalendarOff size={20} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary">Días no lectivos</p>
            <p className="text-xs text-text-secondary">
              {nonLectivoCount === 0
                ? "Todos los días son lectivos"
                : `${nonLectivoCount} día${nonLectivoCount === 1 ? "" : "s"} marcado${nonLectivoCount === 1 ? "" : "s"}`}
            </p>
          </div>
          {nonLectivoCount > 0 && (
            <Badge variant="amber">{nonLectivoCount}</Badge>
          )}
          <Edit3 size={16} className="text-text-secondary" />
        </div>
      </div>
    );
  };

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
      )}

      {/* Configuración especial: días no lectivos */}
      {nonLectivoEnabled && (
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Calendario
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderNonLectivoTile()}
          </div>
        </div>
      )}

      {/* Links de acceso rápido */}
      {schoolYear && (
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
                window.location.href = `/schools/${schoolId}/school-years`;
              }
            },
          }}
        />
      )}

      {/* Modal de edición de días no lectivos */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Días no lectivos del ciclo"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-text-secondary">
            Marca los días de la semana en que NO se imparten clases. El
            sistema los marcará como <code className="bg-slate-100 px-1.5 py-0.5 rounded">non_lectivo</code>{" "}
            en el calendario escolar.
          </p>

          <div className="grid grid-cols-7 gap-2">
            {WEEKDAYS.map((d) => {
              const isChecked = selectedDays.includes(d.value);
              return (
                <label
                  key={d.value}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer p-3 border rounded-xl transition-colors ${
                    isChecked
                      ? "bg-amber-50 border-amber-300"
                      : "border-border hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setValue(
                          "weekdays",
                          selectedDays.filter((v) => v !== d.value)
                        );
                      } else {
                        setValue("weekdays", [
                          ...selectedDays,
                          d.value,
                        ].sort());
                      }
                    }}
                    className="accent-amber-600 w-4 h-4"
                  />
                  <span
                    className={`text-xs font-semibold ${
                      isChecked ? "text-amber-700" : "text-text-secondary"
                    }`}
                  >
                    {d.short}
                  </span>
                </label>
              );
            })}
          </div>

          <p className="text-xs text-text-muted">
            Esto AGREGARÁ días no lectivos para todas las ocurrencias del
            día seleccionado en el rango del ciclo. Para quitar un día
            específico, edítalo manualmente desde la página del calendario.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="sky">
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
