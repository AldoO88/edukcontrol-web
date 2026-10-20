// =====================================================================
// src/app/prefect/announcements/page.tsx
// ---------------------------------------------------------------------
// Lista de Avisos del prefecto — puerto web de announcements/index.jsx:
//   - Segment tabs "Mis Avisos | Todos" (server: sender=yo en "Mis")
//   - Pills de prioridad (solo tab "Todos", server: priority)
//   - Chips de rango (Hoy/Semana/15 días/Historial, default 15 días)
//   - Búsqueda client-side (título/mensaje/emisor/grupos/estudiantes)
//   - Lista en FILAS densas dentro de un solo Card (patrón web del
//     producto; antes: una card alta por aviso, estilo app móvil)
//   - Paginación server con "Cargar más" (dedupe en el hook)
//   - Botón "+ Nuevo Aviso" → modal de creación (3 tipos de audiencia)
// Fuente: hook useAnnouncementsList.
// =====================================================================

"use client";

import { toNotice } from "@/lib/notice";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  DATE_RANGE_OPTIONS,
  useAnnouncementsList,
} from "@/lib/hooks/useAnnouncementsList";
import { CreateAnnouncementModal } from "@/app/prefect/_components/CreateAnnouncementModal";
import { FilterPills, SegmentTabs } from "@/app/prefect/_components/ListControls";
import { relativeDayLabel } from "@/lib/dates";
import { Bell, ChevronRight, Megaphone, Search } from "lucide-react";

// Etiqueta de audiencia derivada de targetType/targetGroups.
function audienceLabel(
  targetType: string,
  targetGroups?: unknown[]
): { text: string; count?: number } {
  if (targetType === "group") {
    const n = Array.isArray(targetGroups) ? targetGroups.length : 0;
    return { text: `${n} grupo${n === 1 ? "" : "s"}`, count: n };
  }
  if (targetType === "student") return { text: "Dirigido" };
  return { text: "General" };
}

// Label corto del rol del emisor (es-ES de la app → es-MX).
const ROLE_LABELS: Record<string, string> = {
  teacher: "Maestro",
  prefect: "Prefecto",
  admin: "Administrador",
  registrar: "Secretaría",
  director: "Director",
  social_worker: "Trabajo Social",
  super_admin: "Super Admin",
};

export default function PrefectAnnouncementsPage() {
  const { user } = useAuth();
  const {
    scope,
    setScope,
    priority,
    setPriority,
    range,
    setRange,
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
  } = useAnnouncementsList(user?._id || "");

  const [searchText, setSearchText] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Búsqueda client-side sobre título, mensaje, emisor y etiquetas de
  // grupos/estudiantes (mismos campos que la app).
  const filteredItems = useMemo(() => {
    const term = searchText.toLowerCase().trim();
    if (!term) return items;
    return items.filter((a) => {
      const sender =
        typeof a.sender === "object"
          ? `${a.sender?.name || ""} ${a.sender?.last_name || ""} ${a.sender?.fullName || ""}`
          : "";
      const groups = (Array.isArray(a.targetGroups) ? a.targetGroups : [])
        .map((g) =>
          typeof g === "object" && g ? `${g.grade ?? ""}°${g.section ?? ""}` : String(g)
        )
        .join(" ");
      const students = (Array.isArray(a.targetStudents) ? a.targetStudents : [])
        .map((s) => (typeof s === "object" && s ? `${s.first_name} ${s.last_name}` : ""))
        .join(" ");
      return (
        (a.title || "").toLowerCase().includes(term) ||
        (a.message || "").toLowerCase().includes(term) ||
        sender.toLowerCase().includes(term) ||
        groups.toLowerCase().includes(term) ||
        students.toLowerCase().includes(term)
      );
    });
  }, [items, searchText]);

  // Cambio de tab → reset de prioridad y búsqueda (igual que la app).
  const handleScopeChange = (id: string) => {
    setScope(id as "mine" | "all");
    setPriority(null);
    setSearchText("");
  };

  if (isLoading && items.length === 0 && !error) {
    return <LoadingState message="Cargando avisos…" />;
  }
  if (error && items.length === 0) {
    return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Avisos"
        subtitle="Comunicados hacia tutores y alumnos"
        action={{ label: "+ Nuevo Aviso", onClick: () => setIsCreateOpen(true) }}
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

      {/* Tabs: Mis Avisos | Todos */}
      <SegmentTabs
        tabs={[
          { id: "mine", label: "Mis Avisos" },
          { id: "all", label: "Todos" },
        ]}
        active={scope}
        onChange={handleScopeChange}
      />

      {/* Pills de prioridad — solo en tab "Todos" (como la app) */}
      {scope === "all" && (
        <FilterPills
          options={[
            { value: "informative", label: "Informativo" },
            { value: "urgent", label: "Urgente" },
          ]}
          active={priority}
          onChange={(v) => setPriority(v as "informative" | "urgent" | null)}
        />
      )}

      {/* Chips de rango de fechas */}
      <div className="flex flex-wrap items-center gap-2">
        {DATE_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              range === opt.value
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <div className="flex-1 min-w-[180px]">
          <Input
            placeholder="Buscar aviso..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            icon={<Search size={16} className="text-slate-400" />}
          />
        </div>
      </div>

      {/* Lista */}
      {filteredItems.length === 0 && !isLoading ? (
        <EmptyState
          icon={<Bell size={48} className="text-slate-300" />}
          title={scope === "mine" ? "No has publicado avisos" : "No hay avisos"}
          description="Ajusta la búsqueda o los filtros para ver más resultados."
        />
      ) : (
        <>
          {/* Lista en filas densas — UN Card con divide-y (patrón web;
              antes: una card alta por aviso). El ícono toma el tinte
              de la prioridad (rose urgente / sky informativo). */}
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {filteredItems.map((announcement) => {
              const isUrgent = announcement.priority === "urgent";
              const sender =
                typeof announcement.sender === "object" ? announcement.sender : null;
              const senderName = sender
                ? `${sender.last_name || ""} ${sender.name || ""}`.trim() ||
                  sender.fullName ||
                  ""
                : "";
              const audience = audienceLabel(
                announcement.targetType || "general",
                announcement.targetGroups
              );
              const readCount = announcement.readCount ?? 0;
              const totalRecipients = announcement.totalRecipients ?? 0;
              const targetGroupLabels = (Array.isArray(announcement.targetGroups)
                ? announcement.targetGroups
                : []
              )
                .filter((g): g is NonNullable<typeof g> => !!g)
                .map((g) =>
                  typeof g === "object"
                    ? `${g.grade ?? ""}°${g.section ?? ""}`
                    : String(g)
                );
              return (
                <Link
                  key={announcement._id}
                  href={`/prefect/announcements/${announcement._id}`}
                  className="block hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
                        isUrgent ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      <Megaphone size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {announcement.title}
                        </p>
                        <Badge variant={isUrgent ? "rose" : "sky"} className="shrink-0">
                          {isUrgent ? "Urgente" : "Informativo"}
                        </Badge>
                        {totalRecipients > 0 && (
                          <span className="text-[10px] font-semibold text-emerald-600 shrink-0">
                            {readCount}/{totalRecipients} leídos
                          </span>
                        )}
                      </div>
                      {/* Meta en 1 línea: extracto del mensaje ·
                          audiencia(+grupos) · emisor+rol · fecha
                          relativa (trunca en móvil). */}
                      <p className="text-xs text-text-secondary truncate mt-0.5">
                        {announcement.message}
                        {" · "}
                        {audience.text}
                        {targetGroupLabels.length > 0
                          ? ` (${targetGroupLabels.slice(0, 4).join(", ")}${
                              targetGroupLabels.length > 4
                                ? ` +${targetGroupLabels.length - 4}`
                                : ""
                            })`
                          : ""}
                        {senderName ? ` · ${senderName}` : ""}
                        {sender?.role
                          ? ` · ${ROLE_LABELS[sender.role] || sender.role}`
                          : ""}{" "}
                        · {relativeDayLabel(announcement.createdAt)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </Card>

          {/* Paginación */}
          <div className="flex justify-center py-2">
            {isLoadingMore ? (
              <span className="flex items-center gap-2 text-sm text-text-secondary">
                <Spinner size="sm" /> Cargando…
              </span>
            ) : page < pages ? (
              <Button variant="secondary" onClick={loadMore}>
                Cargar más ({items.length} de {total})
              </Button>
            ) : items.length > 0 ? (
              <span className="text-xs text-text-muted">
                {items.length} aviso{items.length !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        </>
      )}

      {/* Modal de creación */}
      <CreateAnnouncementModal
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
