// =====================================================================
// src/app/(dashboard)/schools/[id]/school-years/[yearId]/attendance/page.tsx
// ---------------------------------------------------------------------
// ASISTENCIA — Historial por día. Pantalla de monitoreo para
// super_admin (y admin de escuela) dentro del detalle del ciclo.
//
// Fuente de datos: GET /api/attendance/daily-history — el backend
// agrega AttendanceLog por día calendario UTC con alumnos ÚNICOS por
// status (presentes = on_time + retardos; faltas = absent). El response
// trae además `totalStudents` (matrícula activa) y el % de asistencia
// se calcula como presentes ÷ matrícula — NO presentes ÷ registros del
// día: el número responde "¿cuántos de los matriculados vinieron?" y
// los días son comparables entre sí.
//
// Drill-down: click en un renglón → PANTALLA NUEVA
// attendance/[date]/page.tsx con el detalle por alumno (foto, nombre,
// grupo, hora de entrada, hora de salida y estatus).
//
// Nota de día UTC: el backend agrupa por la fecha UTC de event_time —
// misma convención del dashboard móvil (utils/school-time.js del
// backend): taps reales (13:00-20:30Z) y ausencias del cron (07:30Z
// wall-clock) caen en el MISMO día calendario.
// =====================================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { SchoolYear } from "@/lib/types";

// Fila del agregado diario (respuesta de /daily-history).
type DailyRow = {
  date: string; // "YYYY-MM-DD" — día calendario UTC
  on_time: number;
  late: number;
  absent: number;
  present: number; // on_time + late
  total: number; // present + absent
};

// Helpers de fecha: TODO en strings "YYYY-MM-DD" (días calendario UTC
// del backend) para no correrse de día con la zona local del navegador.
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgoStr = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

// "2026-10-16" → "vie 16 oct". T12:00Z ancla al día UTC (el midday
// sobrevive a cualquier offset de zona local de −12 a +14).
const formatDay = (dateStr: string) =>
  new Date(`${dateStr}T12:00:00.000Z`).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

// Badge del % de asistencia del día = presentes ÷ MATRÍCULA activa
// (totalStudents del response — misma convención que el "Alumnos" del
// dashboard móvil). Día sin registros (total 0) → slate "—": vacío =
// sin dato, no "todos ausentes" (el cron no marca faltas de un día sin
// eventos). Umbrales: ≥85 emerald, ≥70 amber, <70 rose — un día normal
// ronda ~88%, con los thresholds viejos 90/75 siempre quedaría ámbar.
const PctBadge = ({ row, totalStudents }: { row: DailyRow; totalStudents: number }) => {
  if (row.total === 0) return <Badge variant="slate">—</Badge>;
  // Defensivo: sin matrícula conocida se cae al % sobre registros del día.
  const pct =
    totalStudents > 0
      ? Math.round((row.present / totalStudents) * 100)
      : Math.round((row.present / row.total) * 100);
  const variant = pct >= 85 ? "emerald" : pct >= 70 ? "amber" : "rose";
  return <Badge variant={variant}>{pct}%</Badge>;
};

export default function AttendanceHistoryPage() {
  const params = useParams<{ id: string; yearId: string }>();
  const schoolId = params.id;
  const yearId = params.yearId;
  const router = useRouter();

  const [days, setDays] = useState<DailyRow[]>([]);
  // Matrícula activa del response — denominador del % de asistencia.
  const [totalStudents, setTotalStudents] = useState(0);
  const [range, setRange] = useState<{ from: string; to: string }>({
    from: daysAgoStr(29),
    to: todayStr(),
  });
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ciclo escolar: solo se usa para el botón "Ciclo completo" (startDate).
  useEffect(() => {
    api
      .get<SchoolYear>(`${ENDPOINTS.SCHOOL_YEARS}/${yearId}`)
      .then(setSchoolYear)
      .catch(() => null);
  }, [yearId]);

  // Carga del agregado diario — re-fetch automático al cambiar el rango.
  const fetchDays = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<{
        from: string;
        to: string;
        totalStudents: number;
        days: DailyRow[];
      }>(
        `${ENDPOINTS.ATTENDANCE_DAILY_HISTORY}?school=${schoolId}&from=${range.from}&to=${range.to}&school_year_id=${yearId}`
      );
      setTotalStudents(res.totalStudents || 0);
      setDays(res.days || []);
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudo cargar el historial.");
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, yearId, range.from, range.to]);

  useEffect(() => {
    fetchDays();
  }, [fetchDays]);

  // Click en un renglón → pantalla de detalle del día
  // (/attendance/[date]: foto, nombre, grupo, entrada, salida, estatus).
  const openDay = (row: DailyRow) => {
    router.push(`/schools/${schoolId}/school-years/${yearId}/attendance/${row.date}`);
  };

  const columns: Column<DailyRow>[] = [
    {
      key: "date",
      label: "Día",
      render: (r) => <span className="font-semibold text-text-primary">{formatDay(r.date)}</span>,
    },
    // Presentes incluye los retardos (on_time + late) — a nivel día la
    // columna "Retardos" se quitó por decisión de monitoreo; los
    // retardos individuales se ven en la pantalla de detalle del día.
    { key: "present", label: "Presentes" },
    { key: "absent", label: "Faltas" },
    { key: "total", label: "Total registros" },
    { key: "pct", label: "% Asist.", render: (r) => <PctBadge row={r} totalStudents={totalStudents} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asistencia — Historial por día"
        subtitle="Monitoreo diario de la escuela: asistencia por día calendario"
      />

      {/* Filtros de rango */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <Input
              type="date"
              label="Desde"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
            <Input
              type="date"
              label="Hasta"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
            <Button
              variant="secondary"
              onClick={() => setRange({ from: daysAgoStr(29), to: todayStr() })}
            >
              Últimos 30 días
            </Button>
            {schoolYear?.startDate && (
              <Button
                variant="secondary"
                onClick={() =>
                  setRange({
                    from: new Date(schoolYear.startDate).toISOString().slice(0, 10),
                    to: todayStr(),
                  })
                }
              >
                Ciclo completo
              </Button>
            )}
            <span className="ml-auto text-sm text-text-secondary">
              Matrícula:{" "}
              <span className="font-semibold text-text-primary">
                {totalStudents || "—"}
              </span>
              {" · "}
              {days.length} día{days.length === 1 ? "" : "s"} con registros
            </span>
          </div>
        </CardBody>
      </Card>

      {/* Tabla por día */}
      <Card>
        <CardBody>
          {isLoading ? (
            <LoadingState height="inline" message="Cargando historial…" />
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <DataTable
              columns={columns}
              data={days}
              keyExtractor={(r) => r.date}
              onRowClick={openDay}
              emptyMessage="Sin registros de asistencia en este rango."
            />
          )}
          <p className="text-xs text-text-secondary mt-3">
            Haz click en un día para ver el detalle por alumno (foto, entrada, salida y estatus).
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
