// =====================================================================
// src/app/prefect/citations/page.tsx
// ---------------------------------------------------------------------
// Lista de Citatorios del prefecto — puerto web de citations/index.jsx:
//   - Segment tabs "Mis Citatorios | Todos" (scope CLIENT-SIDE por
//     creatorId === yo, igual que la app)
//   - Pills de estado Pendientes/Atendidos/Cancelados (agrupación
//     client-side vía CITATION_STATUS_GROUPS)
//   - Stats derivadas (Pendientes/Confirmados/Atendidos) sobre lo cargado
//   - Búsqueda client (alumno, grupo, motivo, creador, ubicación)
//   - Paginación server con "Cargar más" (dedupe en el hook)
//   - "+ Nuevo Citatorio" → modal 2 pasos (prefect solo crea
//     behavioral/administrative)
// Fuente: hook useCitationsList (items ya normalizados).
// =====================================================================

"use client";

import { toNotice } from "@/lib/notice";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCitationsList } from "@/lib/hooks/useCitationsList";
import {
  CITATION_STATUS_GROUPS,
  CITATION_STATUS_LABELS,
  CITATION_TYPE_LABELS,
} from "@/lib/citations";
import { CreateCitationModal } from "@/app/prefect/_components/CreateCitationModal";
import { FilterPills, SegmentTabs } from "@/app/prefect/_components/ListControls";
import { formatShortDate, formatTime12 } from "@/lib/dates";
import { Calendar, ChevronRight, FileText, MapPin, Search } from "lucide-react";

// Badge de estado por agrupación (Pendientes/Atendidos/Cancelados).
const STATUS_BADGE: Record<string, "amber" | "emerald" | "slate"> = {
  pending: "amber",
  completed: "emerald",
  cancelled: "slate",
};

// Estado del pill activo → grupos de status incluidos.
function statusMatch(itemStatus: string, filter: string | null): boolean {
  if (!filter) return true;
  const group = CITATION_STATUS_GROUPS[filter];
  if (!group) return true;
  // reschedule_requested cuenta como pendiente en la agrupación.
  if (filter === "pending" && itemStatus === "reschedule_requested") return true;
  return group.includes(itemStatus);
}

export default function PrefectCitationsPage() {
  const { user } = useAuth();
  const {
    items,
    total,
    page,
    pages,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    refetch,
    create,
  } = useCitationsList();

  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [statusFilter, setStatusFilter] = useState<string | null>("pending");
  const [searchText, setSearchText] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Scope: "Mis Citatorios" = creados por mí (client-side, como la app).
  const scopedItems = useMemo(() => {
    if (scope === "mine" && user?._id) {
      return items.filter((c) => c.creatorId === user._id);
    }
    return items;
  }, [items, scope, user?._id]);

  // Filtro de estado (pills de agrupación).
  const statusItems = useMemo(
    () => scopedItems.filter((c) => statusMatch(c.status, statusFilter)),
    [scopedItems, statusFilter]
  );

  // Búsqueda client (mismos campos que la app: alumno, grupo, motivo,
  // creador, ubicación).
  const filteredItems = useMemo(() => {
    const term = searchText.toLowerCase().trim();
    if (!term) return statusItems;
    return statusItems.filter(
      (c) =>
        c.studentName.toLowerCase().includes(term) ||
        c.groupName.toLowerCase().includes(term) ||
        c.reason.toLowerCase().includes(term) ||
        c.creatorName.toLowerCase().includes(term) ||
        c.location.toLowerCase().includes(term)
    );
  }, [statusItems, searchText]);

  // Stats derivadas sobre el scope actual (sin filtros de estado/búsqueda).
  const stats = useMemo(() => {
    const pending = scopedItems.filter(
      (c) => c.status === "pending" || c.status === "no_show"
    ).length;
    const confirmed = scopedItems.filter((c) => c.status === "confirmed").length;
    const completed = scopedItems.filter((c) => c.status === "completed").length;
    return { pending, confirmed, completed };
  }, [scopedItems]);

  // Cambio de tab → reset de filtros (igual que la app).
  const handleScopeChange = (id: string) => {
    setScope(id as "mine" | "all");
    setStatusFilter("pending");
    setSearchText("");
  };

  if (isLoading && items.length === 0 && !error) {
    return <LoadingState message="Cargando citatorios…" />;
  }
  if (error && items.length === 0) {
    return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Citatorios"
        subtitle="Citas con tutores"
        action={{ label: "+ Nuevo Citatorio", onClick: () => setIsCreateOpen(true) }}
      />

      {/* Banner de feedback de creación */}
      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            notice.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Tabs: Mis Citatorios | Todos */}
      <SegmentTabs
        tabs={[
          { id: "mine", label: "Mis Citatorios" },
          { id: "all", label: "Todos los Citatorios" },
        ]}
        active={scope}
        onChange={handleScopeChange}
      />

      {/* Stats derivadas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-700">{stats.pending}</p>
          <p className="text-[10px] text-amber-600">Pendientes</p>
        </div>
        <div className="bg-sky-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-sky-700">{stats.confirmed}</p>
          <p className="text-[10px] text-sky-600">Confirmados</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{stats.completed}</p>
          <p className="text-[10px] text-emerald-600">Atendidos</p>
        </div>
      </div>

      {/* Pills de estado */}
      <FilterPills
        options={[
          { value: "pending", label: "Pendientes" },
          { value: "completed", label: "Atendidos" },
          { value: "cancelled", label: "Cancelados" },
        ]}
        active={statusFilter}
        onChange={setStatusFilter}
      />

      {/* Búsqueda */}
      <div className="max-w-md">
        <Input
          placeholder="Buscar alumno, grupo, motivo..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          icon={<Search size={16} className="text-slate-400" />}
        />
      </div>

      {/* Lista */}
      {filteredItems.length === 0 && !isLoading ? (
        <EmptyState
          icon={<FileText size={48} className="text-slate-300" />}
          title="No hay citatorios"
          description="Ajusta la búsqueda o los filtros para ver más resultados."
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((citation) => {
            const typeBadge =
              citation.type === "behavioral"
                ? "rose"
                : citation.type === "administrative"
                  ? "amber"
                  : "sky";
            const statusVariant =
              STATUS_BADGE[citation.status === "reschedule_requested" ? "pending" : citation.status] ||
              "slate";
            const statusLabel =
              CITATION_STATUS_LABELS[citation.status] || citation.status;
            return (
              <Link key={citation.id} href={`/prefect/citations/${citation.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardBody>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {citation.studentName}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {citation.groupName || "—"}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 mt-1 shrink-0" />
                    </div>

                    {/* Chips de tipo + estado */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant={typeBadge}>
                        {CITATION_TYPE_LABELS[citation.type] || citation.type}
                      </Badge>
                      <Badge variant={statusVariant}>{statusLabel}</Badge>
                    </div>

                    {/* Motivo + meta (fecha/hora/lugar/creador) */}
                    <p className="text-xs text-text-primary mt-2 line-clamp-1">
                      {citation.reason || "Sin motivo"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-400">
                      {citation.date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatShortDate(citation.date)}
                          {citation.time ? ` · ${formatTime12(citation.time)}` : ""}
                        </span>
                      )}
                      {citation.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {citation.location}
                        </span>
                      )}
                      {citation.creatorName && <span>{citation.creatorName}</span>}
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}

          {/* Paginación */}
          <div className="flex justify-center py-2">
            {isLoadingMore ? (
              <span className="flex items-center gap-2 text-sm text-text-secondary">
                <Spinner size="sm" /> Cargando…
              </span>
            ) : page < pages && scope === "all" ? (
              <Button variant="secondary" onClick={loadMore}>
                Cargar más ({items.length} de {total})
              </Button>
            ) : items.length > 0 ? (
              <span className="text-xs text-text-muted">
                {filteredItems.length} de {items.length} citatorio
                {items.length !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal de creación (2 pasos) */}
      <CreateCitationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (payload) => {
          const result = await create(payload);
          setNotice(toNotice(result));
          if (result.success) setTimeout(() => setNotice(null), 4500);
          return result;
        }}
      />
    </div>
  );
}
