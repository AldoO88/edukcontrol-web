// =====================================================================
// src/app/(dashboard)/schools/[id]/school-years/[yearId]/attendance/[date]/page.tsx
// ---------------------------------------------------------------------
// ASISTENCIA — Detalle de UN día. Pantalla a la que llega el click en
// un renglón del historial (/attendance): un renglón por alumno activo
// con FOTO, nombre, # de control, grupo, hora de ENTRADA, hora de
// SALIDA y estatus (Presente / Retardo / Falta / Sin registro).
//
// Fuente: GET /api/attendance/day-detail?school=&date=YYYY-MM-DD —
// el backend trae todos los alumnos activos mergeados con los logs
// entry/exit del día (primer tap de cada tipo por alumno).
//
// Filtros de grupo y estatus: client-side (los datos ya vienen todos
// en el response — cero llamadas extra).
//
// Notas de tiempo: los event_time son instantes UTC reales; se muestran
// en hora de la escuela (CDMX) con timeZone "America/Mexico_City" —
// los taps 13:00-20:30Z se leen 07:00-14:30. El "date" del path es día
// calendario UTC (misma convención que el historial).
// =====================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";

// Tipos del response de /day-detail (ver controller en el backend).
type DayStudentRow = {
  student: {
    id: string;
    controlNumber?: string | null;
    first_name: string;
    last_name: string;
    photoUrl?: string | null; // URL pública de Cloudinary
  };
  group: { id: string; label: string; type: "regular" | "taller" } | null;
  entry_time: string | null; // ISO UTC — null si no hubo tap (o si fue falta del cron)
  exit_time: string | null; // ISO UTC
  status: "present" | "late" | "absent" | "no_record";
  justified: boolean;
};

type DayDetailResponse = {
  date: string;
  summary: { present: number; late: number; absent: number; no_record: number };
  students: DayStudentRow[];
};

// "YYYY-MM-DD" → "viernes 16 de octubre". T12:00Z + timeZone "UTC"
// ancla al día calendario del backend (no se corre al día anterior).
const formatLongDay = (dateStr: string) =>
  new Date(`${dateStr}T12:00:00.000Z`).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

// Instante UTC ISO → "09:36" en hora de la escuela (CDMX). Vacío → "—".
const formatHour = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Mexico_City",
      })
    : "—";

// Avatar del alumno: foto de Cloudinary si existe; si no, iniciales
// sobre círculo gris (mismo patrón que StudentAvatar de la app móvil).
const StudentPhoto = ({ row }: { row: DayStudentRow }) => {
  if (row.student.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={row.student.photoUrl}
        alt={`${row.student.first_name} ${row.student.last_name}`}
        className="w-9 h-9 rounded-full object-cover bg-slate-100"
      />
    );
  }
  const initials =
    `${row.student.first_name?.[0] || ""}${row.student.last_name?.[0] || ""}`.toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold">
      {initials || "?"}
    </div>
  );
};

// Badge del estatus del alumno.
const StatusBadge = ({ row }: { row: DayStudentRow }) => {
  switch (row.status) {
    case "present":
      return <Badge variant="emerald">Presente</Badge>;
    case "late":
      return <Badge variant="amber">Retardo</Badge>;
    case "absent":
      return row.justified ? (
        <Badge variant="sky">Falta justificada</Badge>
      ) : (
        <Badge variant="rose">Falta</Badge>
      );
    default:
      return <Badge variant="slate">Sin registro</Badge>;
  }
};

export default function AttendanceDayDetailPage() {
  const params = useParams<{ id: string; yearId: string; date: string }>();
  const schoolId = params.id;
  const yearId = params.yearId;
  const date = params.date;

  const [data, setData] = useState<DayDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Filtros client-side.
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Carga del detalle del día (una sola llamada — el resto es local).
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await api.get<DayDetailResponse>(
          `${ENDPOINTS.ATTENDANCE_DAY_DETAIL}?school=${schoolId}&date=${date}`
        );
        setData(res);
      } catch (e: unknown) {
        setError((e as Error)?.message || "No se pudo cargar el detalle del día.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [schoolId, date]);

  // Grupos distintos presentes en los datos — derivados del mismo
  // response (sin llamada extra al endpoint de grupos).
  const groupOptions = useMemo(() => {
    const map = new Map<string, string>(); // id → label ("2° B")
    for (const s of data?.students || []) {
      if (s.group) map.set(s.group.id, s.group.label);
    }
    return [...map.entries()]
      .sort((a, b) => (a[1] < b[1] ? -1 : 1))
      .map(([id, label]) => ({ value: id, label }));
  }, [data]);

  // Filas filtradas (grupo + estatus).
  const rows = useMemo(() => {
    let list = data?.students || [];
    if (groupFilter !== "all") list = list.filter((s) => s.group?.id === groupFilter);
    if (statusFilter !== "all") list = list.filter((s) => s.status === statusFilter);
    return list;
  }, [data, groupFilter, statusFilter]);

  const columns: Column<DayStudentRow>[] = [
    {
      key: "photo",
      label: "",
      className: "w-12",
      render: (r) => <StudentPhoto row={r} />,
    },
    {
      key: "name",
      label: "Alumno",
      render: (r) => (
        <div className="min-w-0">
          <span className="font-semibold text-text-primary">
            {r.student.first_name} {r.student.last_name}
          </span>
          {r.student.controlNumber && (
            <span className="ml-2 text-xs text-text-secondary">#{r.student.controlNumber}</span>
          )}
        </div>
      ),
    },
    {
      key: "group",
      label: "Grupo",
      render: (r) =>
        r.group ? (
          <Badge variant="sky">{r.group.label}</Badge>
        ) : (
          <span className="text-text-secondary">—</span>
        ),
    },
    { key: "entry", label: "Entrada", render: (r) => formatHour(r.entry_time) },
    { key: "exit", label: "Salida", render: (r) => formatHour(r.exit_time) },
    { key: "status", label: "Estatus", render: (r) => <StatusBadge row={r} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Asistencia — ${formatLongDay(date)}`}
        subtitle="Detalle por alumno: foto, grupo, entrada, salida y estatus"
        action={{
          label: "Volver",
          href: `/schools/${schoolId}/school-years/${yearId}/attendance`,
          icon: <ArrowLeft size={16} />,
        }}
      />

      {isLoading ? (
        <LoadingState message="Cargando detalle del día…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <>
          {/* Resumen del día + filtros */}
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="emerald">{data?.summary.present ?? 0} presentes</Badge>
                <Badge variant="amber">{data?.summary.late ?? 0} retardos</Badge>
                <Badge variant="rose">{data?.summary.absent ?? 0} faltas</Badge>
                <Badge variant="slate">{data?.summary.no_record ?? 0} sin registro</Badge>
              </div>
              <div className="flex flex-wrap items-end gap-3 mt-4">
                <Select
                  label="Grupo"
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  options={[{ value: "all", label: "Todos los grupos" }, ...groupOptions]}
                />
                <Select
                  label="Estatus"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "present", label: "Presentes" },
                    { value: "late", label: "Retardos" },
                    { value: "absent", label: "Faltas" },
                    { value: "no_record", label: "Sin registro" },
                  ]}
                />
                <span className="ml-auto text-sm text-text-secondary">
                  {rows.length} alumno{rows.length === 1 ? "" : "s"}
                </span>
              </div>
            </CardBody>
          </Card>

          {/* Tabla por alumno */}
          <Card>
            <CardBody>
              <DataTable
                columns={columns}
                data={rows}
                keyExtractor={(r) => r.student.id}
                emptyMessage="Sin alumnos con estos filtros."
              />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
