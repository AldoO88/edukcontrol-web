// =====================================================================
// src/app/prefect/today-attendance/page.tsx
// ---------------------------------------------------------------------
// ASISTENCIA DE HOY — drill-down del card "Asistencia de hoy" del
// dashboard del prefecto. Muestra los registros de ENTRADA y SALIDA de
// hoy por alumno con su foto, con un selector de dos vistas:
//
//   1. "Asistencias" — los registros: un renglón por alumno con foto,
//      nombre, #control, grupo, hora de entrada, hora de salida y
//      estatus (DataTable, misma estructura que el detalle de día del
//      monitoreo admin).
//   2. "Faltas" — solo los alumnos con estatus de FALTA (falta simple
//      o justificada) o SIN REGISTRO — todo lo que no es presente —
//      fila con foto, nombre, grupo, horas y badge que distingue los
//      casos. Los presentes/retardos siguen visibles en los badges de
//      resumen.
//
// Fuente: GET /api/attendance/day-detail?date=YYYY-MM-DD vía hook
// useTodayAttendance (fecha LOCAL, tenant del JWT — el rol prefect se
// habilitó en routes/attendance.routes.js el 2026-10-19). Una sola
// llamada; grupo y búsqueda se filtran client-side.
//
// Notas de tiempo: event_time son instantes UTC reales; se muestran en
// hora de la escuela (CDMX) con timeZone "America/Mexico_City" (misma
// convención que la página admin de detalle de día).
// =====================================================================

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useTodayAttendance } from "@/lib/hooks/useTodayAttendance";
import { StudentAvatar } from "@/app/prefect/_components/StudentAvatar";
import { SegmentTabs } from "@/app/prefect/_components/ListControls";
import type { AttendanceDayRow } from "@/lib/types";
import { CalendarX2, Search, UserX } from "lucide-react";

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

// Badge de estatus del alumno (Presente / Retardo / Falta justificada
// / Falta / Sin registro) — misma semántica que el día detalle admin.
function StatusBadge({ row }: { row: AttendanceDayRow }) {
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
}

export default function PrefectTodayAttendancePage() {
  const { data, isLoading, error, refetch } = useTodayAttendance();

  // Selector de vista: registros completos vs solo faltas.
  const [view, setView] = useState<"records" | "faltas">("records");
  // Filtros client-side compartidos por ambas vistas.
  const [groupFilter, setGroupFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  // Grupos distintos presentes en los datos — derivados del mismo
  // response (sin llamada extra al endpoint de grupos).
  const groupOptions = useMemo(() => {
    const map = new Map<string, string>(); // id → label ("1° A")
    for (const s of data?.students || []) {
      if (s.group) map.set(s.group.id, s.group.label);
    }
    return [...map.entries()]
      .sort((a, b) => (a[1] < b[1] ? -1 : 1))
      .map(([id, label]) => ({ value: id, label }));
  }, [data]);

  // Filas filtradas (grupo + búsqueda por nombre/#control) — igual para
  // las dos vistas del selector.
  const rows = useMemo(() => {
    let list = data?.students || [];
    if (groupFilter !== "all") list = list.filter((s) => s.group?.id === groupFilter);
    const term = searchText.toLowerCase().trim();
    if (term) {
      list = list.filter((s) =>
        `${s.student.first_name} ${s.student.last_name} ${s.student.controlNumber || ""}`
          .toLowerCase()
          .includes(term)
      );
    }
    return list;
  }, [data, groupFilter, searchText]);

  // Faltas de la vista "Faltas": estatus absent (simple o justificada)
  // + sin registro — todo lo que no es presente (los badges de la fila
  // distinguen cada caso; los presentes/retardos viven en el resumen).
  const absentRows = rows.filter((r) => r.status === "absent" || r.status === "no_record");

  // Columnas de la vista "Asistencias" (registros entry/exit).
  const columns: Column<AttendanceDayRow>[] = [
    {
      key: "photo",
      label: "",
      className: "w-12",
      render: (r) => (
        <StudentAvatar
          photoUrl={r.student.photoUrl}
          name={`${r.student.first_name} ${r.student.last_name}`}
          size={36}
        />
      ),
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

  // Fila compacta para la lista de la vista "Faltas".
  const AbsentRow = ({ row }: { row: AttendanceDayRow }) => (
    <li className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-b-0">
      <StudentAvatar
        photoUrl={row.student.photoUrl}
        name={`${row.student.first_name} ${row.student.last_name}`}
        size={40}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary truncate">
          {row.student.last_name}, {row.student.first_name}
          {row.student.controlNumber && (
            <span className="ml-2 text-xs font-normal text-text-secondary">
              #{row.student.controlNumber}
            </span>
          )}
        </p>
        <p className="text-xs text-text-secondary">
          {row.group?.label || "—"}
          {row.entry_time ? ` · entrada ${formatHour(row.entry_time)}` : ""}
          {row.exit_time ? ` · salida ${formatHour(row.exit_time)}` : ""}
        </p>
      </div>
      <StatusBadge row={row} />
    </li>
  );

  if (isLoading && !data) return <LoadingState message="Cargando asistencia de hoy…" />;
  if (error && !data) {
    return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Asistencia de hoy"
        subtitle={data?.date ? formatLongDay(data.date) : ""}
        action={{ label: "← Volver", href: "/prefect/dashboard" }}
      />

      {/* Resumen del día (mismo contract que el monitoreo admin) */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="emerald">{data?.summary.present ?? 0} presentes</Badge>
        <Badge variant="amber">{data?.summary.late ?? 0} retardos</Badge>
        <Badge variant="rose">{data?.summary.absent ?? 0} faltas</Badge>
        <Badge variant="slate">{data?.summary.no_record ?? 0} sin registro</Badge>
        {isLoading && <Spinner size="sm" />}
      </div>

      {/* Selector de vista: registros completos vs solo faltas */}
      <SegmentTabs
        tabs={[
          { id: "records", label: "Asistencias" },
          { id: "faltas", label: "Faltas" },
        ]}
        active={view}
        onChange={(id) => setView(id as "records" | "faltas")}
      />

      {/* Filtros client-side (compartidos por ambas vistas) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="sm:w-56">
          <Select
            label="Grupo"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            options={[{ value: "all", label: "Todos los grupos" }, ...groupOptions]}
          />
        </div>
        <div className="flex-1">
          <Input
            placeholder="Buscar alumno..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            icon={<Search size={16} className="text-slate-400" />}
          />
        </div>
      </div>

      {!data || data.students.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 size={48} className="text-slate-300" />}
          title="Sin matrícula activa"
          description="No hay alumnos activos para mostrar hoy."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Search size={48} className="text-slate-300" />}
          title="Sin resultados"
          description="Ajusta el grupo o la búsqueda para ver más alumnos."
        />
      ) : view === "records" ? (
        /* ---------------- VISTA 1: ASISTENCIAS (registros) --------------- */
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
      ) : (
        /* ------------------ VISTA 2: FALTAS (estatus falta) --------------- */
        <div className="space-y-4">
          <Card className="border-l-4 border-l-rose-500">
            <CardBody>
              <div className="flex items-center justify-between mb-1">
                <p className="flex items-center gap-1.5 text-sm font-bold text-rose-700">
                  <UserX size={15} />
                  Faltas
                </p>
                <span className="text-sm font-extrabold text-rose-600">{absentRows.length}</span>
              </div>
              {absentRows.length === 0 ? (
                <p className="text-sm text-text-secondary py-2">
                  Sin faltas con estos filtros. 🎉
                </p>
              ) : (
                <ul>
                  {absentRows.map((row) => (
                    <AbsentRow key={row.student.id} row={row} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
