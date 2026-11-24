// =====================================================================
// src/app/social-worker/justificantes/page.tsx
// ---------------------------------------------------------------------
// Justificantes (Fase D — sección Operación del trabajador social).
// Puerto con estilo propio (acento emerald, rutas /social-worker/*) de
// justificantes/index.jsx de la app:
//   - Segment tabs "Pendientes | Justificadas" (split CLIENT-SIDE por
//     `justified`, con conteos — igual que la app)
//   - Chips de filtro por grupo (regular; toggle) → re-fetchea
//   - Búsqueda client por nombre de alumno
//   - Lista en FILAS densas: pendiente → botón "Justificar" (modal);
//     justificada → motivo + fecha del justificante
//   - Alumno → FICHA DE EXPEDIENTE del rol
// Fuente: hook useJustificantes (GET /api/attendance/logs
// status=absent&event_type=entry + PUT .../justify).
// =====================================================================

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentTabs } from "@/app/prefect/_components/ListControls";
import { useJustificantes, type JustificanteItem } from "@/lib/hooks/useJustificantes";
import { JustifyAbsenceModal } from "@/app/social-worker/_components/JustifyAbsenceModal";
import { formatFullDateTime, formatShortDate } from "@/lib/dates";
import { CalendarX2, CheckCircle, FileCheck, Search } from "lucide-react";

// Helpers de lectura sobre el ítem (student poblado por el endpoint).
function studentNameOf(item: JustificanteItem): string {
  const s = item.student_id;
  if (!s) return "Sin alumno";
  return `${s.last_name || ""}, ${s.first_name || ""}`.replace(/^,\s*/, "") || "Sin alumno";
}

function studentIdOf(item: JustificanteItem): string {
  return item.student_id?._id || "";
}

export default function SocialWorkerJustificantesPage() {
  const {
    groups,
    groupId,
    toggleGroup,
    clearGroup,
    items,
    page,
    pages,
    isLoading,
    isLoadingMore,
    error,
    refetch,
    loadMore,
    justify,
  } = useJustificantes();

  const [tab, setTab] = useState<"pending" | "justified">("pending");
  const [searchText, setSearchText] = useState("");
  const [absenceToJustify, setAbsenceToJustify] = useState<JustificanteItem | null>(null);

  // Map de grupos para resolver current_group_id (ObjectId crudo del
  // populate, no viene poblado de forma anidada).
  const groupLabelById = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => map.set(g._id, g.label));
    return map;
  }, [groups]);

  const groupLabelOf = (item: JustificanteItem): string => {
    const ref = item.student_id?.current_group_id;
    if (ref && typeof ref === "object" && ref.grade != null && ref.section) {
      return `${ref.grade}°${ref.section}`;
    }
    if (typeof ref === "string") return groupLabelById.get(ref) || "";
    return "";
  };

  // Split de tabs por `justified` (mismo criterio que la app).
  const pending = useMemo(() => items.filter((i) => !i.justified), [items]);
  const justified = useMemo(() => items.filter((i) => i.justified), [items]);
  const baseItems = tab === "pending" ? pending : justified;

  // Búsqueda client por nombre de alumno.
  const filteredItems = useMemo(() => {
    const term = searchText.toLowerCase().trim();
    if (!term) return baseItems;
    return baseItems.filter((i) => studentNameOf(i).toLowerCase().includes(term));
  }, [baseItems, searchText]);

  // Cambio de tab → limpia búsqueda (como la app).
  const handleTabChange = (id: string) => {
    setTab(id as "pending" | "justified");
    setSearchText("");
  };

  if (isLoading && items.length === 0 && !error) {
    return <LoadingState message="Cargando inasistencias…" />;
  }
  if (error && items.length === 0) {
    return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Justificantes"
        subtitle="Justificación de inasistencias registradas"
        action={{ label: "← Volver", href: "/social-worker/dashboard" }}
      />

      {/* Tabs: Pendientes | Justificadas (con conteos) */}
      <SegmentTabs
        tabs={[
          { id: "pending", label: `Pendientes (${pending.length})` },
          { id: "justified", label: `Justificadas (${justified.length})` },
        ]}
        active={tab}
        onChange={handleTabChange}
      />

      {/* Chips de grupo (toggle, como la app) — acento emerald */}
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

      {/* Búsqueda */}
      <Input
        placeholder="Buscar alumno..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        icon={<Search size={16} className="text-slate-400" />}
      />

      {/* Lista */}
      {filteredItems.length === 0 && !isLoading ? (
        <EmptyState
          icon={
            tab === "pending" ? (
              <CheckCircle size={48} className="text-slate-300" />
            ) : (
              <FileCheck size={48} className="text-slate-300" />
            )
          }
          title={
            tab === "pending" ? "Sin inasistencias pendientes" : "Sin justificantes"
          }
          description={
            tab === "pending"
              ? "No hay faltas por justificar con los filtros actuales."
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
                    isPending ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {isPending ? <CalendarX2 size={16} /> : <CheckCircle size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* Alumno → FICHA DE EXPEDIENTE del rol */}
                    {sid ? (
                      <Link
                        href={`/social-worker/expedientes/${sid}`}
                        className="text-sm font-bold text-text-primary truncate hover:text-emerald-700 transition-colors"
                      >
                        {name}
                      </Link>
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

      {/* Paginación server (limit 200 = cap del endpoint) */}
      {filteredItems.length > 0 && (
        <div className="flex justify-center py-2">
          {isLoadingMore ? (
            <span className="flex items-center gap-2 text-sm text-text-secondary">
              <Spinner size="sm" /> Cargando…
            </span>
          ) : page < pages ? (
            <Button variant="secondary" onClick={loadMore}>
              Cargar más ({items.length} cargados)
            </Button>
          ) : (
            <span className="text-xs text-text-muted">
              {items.length} inasistencia{items.length !== 1 ? "s" : ""}
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
    </div>
  );
}
