// =====================================================================
// src/app/social-worker/justificantes/page.tsx
// ---------------------------------------------------------------------
// Inasistencias y Justificantes — pantalla ÚNICA del trabajador social
// (fusión 2026-11-25 de las antiguas justificantes/ y
// attendance-summary/, que se redirigen aquí desde next.config.ts).
// Puerto con estilo propio (acento emerald, rutas /social-worker/*):
//   - Segment tabs "Por justificar | Justificadas | Por alumno" con
//     conteos EXACTOS del server (los 2 primeros consultan
//     ?justified=false|true por separado — fix 2026-11-27, antes el
//     split era en cliente sobre UNA fetch paginada y con "Todos los
//     grupos" las justificadas viejas nunca cabían en la página 1; el
//     3º lista TODOS los alumnos con faltas del rango).
//   - Barra COMPARTIDA por tab: chips de grupo (regular, toggle) +
//     búsqueda por nombre + rango ("Esta semana" default | "Todo el
//     ciclo").
//   - Filas densas: pendiente → botón "Justificar" (modal); justificada
//     → motivo + fecha. Clic en el alumno (cualquier tab) → MODAL DE
//     HISTORIAL (faltas sin justificar / justificadas del alumno).
//   - "Cargar más" paginado en los tabs de logs (limit 200 del endpoint).
// Fuente: hook useInasistencias (GET /api/attendance/logs +
// GET /api/social-worker/school-absences + PUT .../justify).
// =====================================================================

"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentTabs } from "@/app/prefect/_components/ListControls";
import { StudentAvatar } from "@/app/prefect/_components/StudentAvatar";
import {
  useInasistencias,
  type AbsenceLogItem,
  type AbsenceRange,
} from "@/lib/hooks/useInasistencias";
import { JustifyAbsenceModal } from "@/app/social-worker/_components/JustifyAbsenceModal";
import {
  StudentAbsenceHistoryModal,
  type HistoryStudent,
} from "@/app/social-worker/_components/StudentAbsenceHistoryModal";
import { formatFullDateTime, formatShortDate } from "@/lib/dates";
import {
  CalendarX2,
  CheckCircle,
  FileCheck,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

type TabId = "pending" | "justified" | "students";

// Opciones del rango compartido (default = semana actual).
const RANGE_OPTIONS: { value: AbsenceRange; label: string }[] = [
  { value: "week", label: "Esta semana" },
  { value: "cycle", label: "Todo el ciclo" },
];

// Helpers de lectura sobre el ítem (student poblado por el endpoint).
function studentNameOf(item: AbsenceLogItem): string {
  const s = item.student_id;
  if (!s) return "Sin alumno";
  return `${s.last_name || ""}, ${s.first_name || ""}`.replace(/^,\s*/, "") || "Sin alumno";
}

function studentIdOf(item: AbsenceLogItem): string {
  return item.student_id?._id || "";
}

export default function SocialWorkerJustificantesPage() {
  const {
    groups,
    groupId,
    toggleGroup,
    clearGroup,
    range,
    setRange,
    pendingList,
    justifiedList,
    isLoading,
    isLoadingMore,
    error,
    refetch,
    loadMore,
    justify,
    absences,
    isLoadingAbsences,
    absencesError,
    refetchAbsences,
  } = useInasistencias();

  const [tab, setTab] = useState<TabId>("pending");
  const [searchText, setSearchText] = useState("");
  const [absenceToJustify, setAbsenceToJustify] = useState<AbsenceLogItem | null>(null);
  const [historyStudent, setHistoryStudent] = useState<HistoryStudent | null>(null);

  // Map de grupos para resolver current_group_id (ObjectId crudo del
  // populate, no viene poblado de forma anidada).
  const groupLabelById = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => map.set(g._id, g.label));
    return map;
  }, [groups]);

  const groupLabelOf = (item: AbsenceLogItem): string => {
    const ref = item.student_id?.current_group_id;
    if (ref && typeof ref === "object" && ref.grade != null && ref.section) {
      return `${ref.grade}°${ref.section}`;
    }
    if (typeof ref === "string") return groupLabelById.get(ref) || "";
    return "";
  };

  // Tabs 1-2: cada lista viene YA filtrada por el server
  // (?justified=false|true) con su propia paginación y su `total`
  // exacto (fix 2026-11-27 — antes el split era en cliente sobre UNA
  // fetch paginada y con "Todos los grupos" el tab quedaba vacío).
  const pending = pendingList.items;
  const justified = justifiedList.items;
  const students = useMemo(
    () => absences?.topAbsentStudents ?? [],
    [absences]
  );

  // Estado de la lista del tab ACTIVO (para paginación y conteos).
  const activeList = tab === "justified" ? justifiedList : pendingList;

  // Término de búsqueda (compartido, se aplica al tab ACTIVO).
  const term = searchText.toLowerCase().trim();

  const filteredItems = useMemo(() => {
    const base = tab === "justified" ? justified : pending;
    if (!term) return base;
    return base.filter((i) => studentNameOf(i).toLowerCase().includes(term));
  }, [tab, pending, justified, term]);

  const filteredStudents = useMemo(() => {
    if (!term) return students;
    return students.filter((s) => s.fullName.toLowerCase().includes(term));
  }, [students, term]);

  // Cambio de tab → limpia búsqueda (como la app).
  const handleTabChange = (id: string) => {
    setTab(id as TabId);
    setSearchText("");
  };

  // Selección de alumno → MODAL DE HISTORIAL (desde cualquier tab).
  const openHistoryFromLog = (item: AbsenceLogItem) => {
    const sid = studentIdOf(item);
    if (!sid) return;
    setHistoryStudent({
      _id: sid,
      name: studentNameOf(item),
      group: groupLabelOf(item),
    });
  };

  const openHistoryFromRow = (row: (typeof students)[number]) => {
    setHistoryStudent({ _id: row._id, name: row.fullName, group: row.group });
  };

  // Gate de carga inicial (espera a AMBAS listas: pendientes + justificadas).
  const bothEmpty = pending.length === 0 && justified.length === 0;
  if (isLoading && bothEmpty && !error) {
    return <LoadingState message="Cargando inasistencias…" />;
  }
  if (error && bothEmpty) {
    return (
      <ErrorState
        message={error}
        action={{
          label: "Reintentar",
          onClick: () => {
            refetch();
            refetchAbsences();
          },
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inasistencias y Justificantes"
        subtitle="Justificación de faltas y control de inasistencias por alumno"
        action={{ label: "← Volver", href: "/social-worker/dashboard" }}
      />

      {/* Tabs: Por justificar | Justificadas | Por alumno (con conteos) */}
      <SegmentTabs
        tabs={[
          { id: "pending", label: `Por justificar (${pendingList.total})` },
          { id: "justified", label: `Justificadas (${justifiedList.total})` },
          { id: "students", label: `Por alumno (${students.length})` },
        ]}
        active={tab}
        onChange={handleTabChange}
      />

      {/* Barra de filtros COMPARTIDA — chips de grupo (toggle) + rango
          (default esta semana). Acento emerald. */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={clearGroup}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            groupId == null
              ? "bg-emerald-600 border-emerald-600 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Todos los grupos
        </button>
        {groups.map((group) => (
          <button
            key={group._id}
            onClick={() => toggleGroup(group._id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              groupId === group._id
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Búsqueda (filtra el tab activo) + rango */}
      <div className="flex flex-wrap gap-3 items-stretch">
        <div className="flex-1 min-w-[220px]">
          <Input
            placeholder="Buscar alumno..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            icon={<Search size={16} className="text-slate-400" />}
          />
        </div>
        <div className="w-44">
          <Select
            aria-label="Rango de fechas"
            options={RANGE_OPTIONS}
            value={range}
            onChange={(e) => setRange(e.target.value as AbsenceRange)}
          />
        </div>
      </div>

      {/* ───────────────────────── TAB: POR ALUMNO ───────────────────── */}
      {tab === "students" ? (
        isLoadingAbsences && !absences ? (
          <LoadingState message="Cargando alumnos con faltas…" />
        ) : absencesError && !absences ? (
          <ErrorState
            message={absencesError}
            action={{ label: "Reintentar", onClick: refetchAbsences }}
          />
        ) : (
          <div className="space-y-4">
            {/* Stat cards (las del antiguo attendance-summary) */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-l-4 border-l-rose-500">
                <CardBody>
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-rose-600">
                    <CalendarX2 size={12} />
                    Total de Faltas
                  </p>
                  <p className="text-3xl font-extrabold text-rose-600 mt-1">
                    {absences?.summary.totalAbsences ?? 0}
                  </p>
                </CardBody>
              </Card>
              <Card className="border-l-4 border-l-amber-500">
                <CardBody>
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-amber-600">
                    <Users size={12} />
                    Alumnos Afectados
                  </p>
                  <p className="text-3xl font-extrabold text-amber-600 mt-1">
                    {absences?.summary.affectedStudents ?? 0}
                  </p>
                </CardBody>
              </Card>
            </div>

            {/* Lista rankeada — clic → historial del alumno */}
            <Card>
              <CardBody>
                <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary mb-3">
                  <TrendingUp size={16} className="text-rose-500" />
                  Alumnos con más faltas
                </p>
                {filteredStudents.length === 0 ? (
                  <EmptyState
                    icon={<Users size={40} className="text-slate-300" />}
                    title={term ? "Sin coincidencias" : "Sin faltas registradas"}
                    description={
                      term
                        ? `Ningún alumno coincide con "${searchText.trim()}".`
                        : "No hay inasistencias en el rango consultado."
                    }
                  />
                ) : (
                  <ol className="space-y-4">
                    {filteredStudents.map((student, index) => {
                      const absencesCount = student.absenceCount || 0;
                      // Escala relativa al máximo VISIBLE (búsqueda
                      // incluida) para que las barras sigan leyéndose.
                      const maxVisible = filteredStudents.reduce(
                        (max, s) => Math.max(max, s.absenceCount || 0),
                        1
                      );
                      const pct = Math.max(
                        Math.round((absencesCount / maxVisible) * 100),
                        8
                      );
                      return (
                        <li key={student._id}>
                          <button
                            onClick={() => openHistoryFromRow(student)}
                            className="w-full text-left flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                            aria-label={`Ver historial de ${student.fullName}`}
                          >
                            <span
                              className={`w-6 text-center text-sm font-extrabold shrink-0 ${
                                index === 0
                                  ? "text-rose-600"
                                  : index === 1
                                    ? "text-amber-600"
                                    : "text-slate-400"
                              }`}
                            >
                              #{student.rank ?? index + 1}
                            </span>
                            <StudentAvatar name={student.fullName} size={40} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-text-primary truncate">
                                  {student.fullName}
                                </p>
                                <span className="text-xs font-extrabold text-rose-600 shrink-0">
                                  {absencesCount} falta{absencesCount !== 1 ? "s" : ""}
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full rounded-full bg-rose-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {student.group || "—"}
                                {student.controlNumber
                                  ? ` • ${student.controlNumber}`
                                  : ""}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </CardBody>
            </Card>
          </div>
        )
      ) : filteredItems.length === 0 && !isLoading ? (
        /* ───────────── TABS 1-2: LISTA DE LOGS ───────────── */
        <EmptyState
          icon={
            tab === "pending" ? (
              <CheckCircle size={48} className="text-slate-300" />
            ) : (
              <FileCheck size={48} className="text-slate-300" />
            )
          }
          title={
            tab === "pending"
              ? term
                ? "Sin coincidencias"
                : "Sin inasistencias pendientes"
              : term
                ? "Sin coincidencias"
                : "Sin justificantes"
          }
          description={
            tab === "pending"
              ? term
                ? `Ningún alumno coincide con "${searchText.trim()}".`
                : range === "week"
                  ? "No hay faltas por justificar esta semana con los filtros actuales."
                  : "No hay faltas por justificar con los filtros actuales."
              : term
                ? `Ningún alumno coincide con "${searchText.trim()}".`
                : "Las inasistencias justificadas aparecerán aquí."
          }
        />
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {filteredItems.map((item) => {
            const isPending = !item.justified;
            const name = studentNameOf(item);
            const sid = studentIdOf(item);
            const gLabel = groupLabelOf(item);
            const dateStr = formatShortDate(item.event_time || item.createdAt) || "—";
            return (
              <div key={item._id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
                    isPending
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {isPending ? <CalendarX2 size={16} /> : <CheckCircle size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* Alumno → HISTORIAL de faltas (el expediente vive
                        dentro del modal, con link "Ver expediente"). */}
                    {sid ? (
                      <button
                        onClick={() => openHistoryFromLog(item)}
                        className="text-sm font-bold text-text-primary truncate hover:text-emerald-700 transition-colors text-left"
                      >
                        {name}
                      </button>
                    ) : (
                      <p className="text-sm font-bold text-text-primary truncate">{name}</p>
                    )}
                    {gLabel && (
                      <Badge variant="slate" className="shrink-0">
                        {gLabel}
                      </Badge>
                    )}
                    {isPending ? (
                      <Badge variant="rose" className="shrink-0">
                        Pendiente
                      </Badge>
                    ) : (
                      <Badge variant="emerald" className="shrink-0">
                        Justificada
                      </Badge>
                    )}
                  </div>
                  {/* Meta en 1 línea: fecha de la falta · motivo del
                      justificante + cuándo (trunca en móvil). */}
                  <p className="text-xs text-text-secondary truncate mt-0.5">
                    Falta del {dateStr}
                    {!isPending && item.justified_reason
                      ? ` · ${item.justified_reason}${
                          item.justified_at
                            ? ` (${formatFullDateTime(item.justified_at)})`
                            : ""
                        }`
                      : ""}
                  </p>
                </div>
                {isPending && (
                  <button
                    onClick={() => setAbsenceToJustify(item)}
                    className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shrink-0 transition-colors"
                  >
                    <FileCheck size={14} /> Justificar
                  </button>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {/* Paginación server (limit 200 = cap del endpoint) — solo tabs
          1-2. Condición SOLO sobre la paginación del tab activo (nunca
          sobre la lista filtrada por búsqueda): si la búsqueda no
          matchea nada, "Cargar más" sigue disponible para seguir
          cargando. */}
      {tab !== "students" && activeList.total > 0 && (
        <div className="flex justify-center py-2">
          {isLoadingMore ? (
            <span className="flex items-center gap-2 text-sm text-text-secondary">
              <Spinner size="sm" /> Cargando…
            </span>
          ) : activeList.page < activeList.pages ? (
            <Button variant="secondary" onClick={() => loadMore(tab === "justified")}>
              Cargar más ({activeList.items.length} de {activeList.total})
            </Button>
          ) : (
            <span className="text-xs text-text-muted">
              {activeList.total} inasistencia{activeList.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Modal de justificación — tras el éxito el modal se cierra solo
          (1.2s) y el ítem ya quedó parchado en local por el hook. */}
      <JustifyAbsenceModal
        isOpen={!!absenceToJustify}
        onClose={() => setAbsenceToJustify(null)}
        absence={absenceToJustify}
        groupLabel={absenceToJustify ? groupLabelOf(absenceToJustify) : ""}
        onSubmit={(reason) => {
          if (!absenceToJustify) {
            return Promise.resolve({ success: false, message: "Inasistencia no disponible." });
          }
          return justify(absenceToJustify._id, reason);
        }}
      />

      {/* Modal de HISTORIAL del alumno (compartido por los 3 tabs). */}
      <StudentAbsenceHistoryModal
        student={historyStudent}
        onClose={() => setHistoryStudent(null)}
      />
    </div>
  );
}
