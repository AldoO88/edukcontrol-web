// =====================================================================
// src/app/social-worker/_components/StudentAbsenceHistoryModal.tsx
// ---------------------------------------------------------------------
// Historial de inasistencias de UN alumno (pantalla única de
// inasistencias del trabajador social, 2026-11-25). Se abre desde
// cualquier tab (Por justificar / Justificadas / Por alumno) al
// seleccionar al alumno:
//   - GET /api/attendance/logs?student_id=X&status=absent&event_type=entry
//     (mismo endpoint que la lista principal; un alumno nunca acumula
//     200 faltas, así que la primera página es su historial completo)
//   - Segment tabs internos: Todo | Sin justificar | Justificadas
//     (split CLIENT-SIDE por `justified`, igual que la lista principal)
//   - Link a la FICHA DE EXPEDIENTE del rol (el resto del expediente)
// =====================================================================

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SegmentTabs } from "@/app/prefect/_components/ListControls";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { formatFullDateTime, formatShortDate } from "@/lib/dates";
import { CalendarX2, CheckCircle, FolderOpen, UserX } from "lucide-react";
import type { AbsenceLogItem } from "@/lib/hooks/useInasistencias";

// Alumno mínimo que necesita el modal (lo resuelve la página desde
// cualquier tab: item.student_id o la fila rankeada del tab 3).
export interface HistoryStudent {
  _id: string;
  name: string;
  group?: string | null;
}

interface LogsEnvelope {
  items: AbsenceLogItem[];
  total?: number;
  page?: number;
  pages?: number;
}

interface StudentAbsenceHistoryModalProps {
  student: HistoryStudent | null;
  onClose: () => void;
}

type HistoryTab = "all" | "pending" | "justified";

export function StudentAbsenceHistoryModal({
  student,
  onClose,
}: StudentAbsenceHistoryModalProps) {
  const [items, setItems] = useState<AbsenceLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<HistoryTab>("all");

  const studentId = student?._id || null;

  // Carga del historial. Guard por requestId: si el usuario cambia de
  // alumno rápido, la respuesta vieja NO pisa la nueva. Compartida por
  // el effect de apertura y el botón Reintentar del estado de error.
  const requestIdRef = useRef(0);
  const loadHistory = useCallback(async () => {
    if (!studentId) return;
    const requestId = ++requestIdRef.current;
    setError(null);
    setIsLoading(true);
    try {
      const qs = new URLSearchParams({
        student_id: studentId,
        status: "absent",
        event_type: "entry",
        limit: "200",
        page: "1",
      });
      const res = await api.get<LogsEnvelope>(
        `${ENDPOINTS.ATTENDANCE_LOGS}?${qs.toString()}`
      );
      if (requestId !== requestIdRef.current) return; // respuesta vieja
      setItems(res?.items || []);
    } catch (e: unknown) {
      if (requestId !== requestIdRef.current) return;
      setError(
        (e as Error)?.message || "No se pudo cargar el historial de faltas."
      );
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [studentId]);

  // Reset + fetch al abrir con un alumno.
  useEffect(() => {
    if (!studentId) return;
    setTab("all");
    setItems([]);
    void loadHistory();
  }, [studentId, loadHistory]);

  // Split por estado (mismo criterio que la lista principal).
  const pending = useMemo(() => items.filter((i) => !i.justified), [items]);
  const justified = useMemo(() => items.filter((i) => i.justified), [items]);
  const visible = useMemo(() => {
    if (tab === "pending") return pending;
    if (tab === "justified") return justified;
    return items;
  }, [tab, items, pending, justified]);

  if (!student) return null;

  return (
    <Modal
      isOpen={!!student}
      onClose={onClose}
      title="Historial de inasistencias"
      size="lg"
    >
      <div className="space-y-4">
        {/* Alumno + link al expediente */}
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 text-rose-700 shrink-0">
            <UserX size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">
              {student.name}
            </p>
            {student.group && (
              <p className="text-xs text-text-secondary">Grupo {student.group}</p>
            )}
          </div>
          <Link
            href={`/social-worker/expedientes/${student._id}`}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors shrink-0"
          >
            <FolderOpen size={14} /> Ver expediente
          </Link>
        </div>

        {/* Tabs internos: Todo | Sin justificar | Justificadas */}
        <SegmentTabs
          tabs={[
            { id: "all", label: `Todo (${items.length})` },
            { id: "pending", label: `Sin justificar (${pending.length})` },
            { id: "justified", label: `Justificadas (${justified.length})` },
          ]}
          active={tab}
          onChange={(id) => setTab(id as HistoryTab)}
        />

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-secondary">
            <Spinner size="sm" /> Cargando historial…
          </div>
        ) : error ? (
          <ErrorState message={error} action={{ label: "Reintentar", onClick: loadHistory }} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={
              tab === "pending" ? (
                <CheckCircle size={40} className="text-slate-300" />
              ) : (
                <CalendarX2 size={40} className="text-slate-300" />
              )
            }
            title={
              tab === "pending"
                ? "Sin faltas sin justificar"
                : tab === "justified"
                  ? "Sin faltas justificadas"
                  : "Sin inasistencias"
            }
            description={
              items.length === 0
                ? "Este alumno no tiene inasistencias registradas."
                : "No hay registros con el filtro seleccionado."
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
            {visible.map((item) => {
              const isPending = !item.justified;
              const dateStr =
                formatShortDate(item.event_time || item.createdAt) || "—";
              return (
                <li key={item._id} className="flex items-center gap-3 py-3">
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                      isPending
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {isPending ? <CalendarX2 size={14} /> : <CheckCircle size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">
                        Falta del {dateStr}
                      </p>
                      <Badge variant={isPending ? "rose" : "emerald"}>
                        {isPending ? "Pendiente" : "Justificada"}
                      </Badge>
                    </div>
                    {!isPending && item.justified_reason && (
                      <p className="text-xs text-text-secondary truncate mt-0.5">
                        {item.justified_reason}
                        {item.justified_at
                          ? ` · ${formatFullDateTime(item.justified_at)}`
                          : ""}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
