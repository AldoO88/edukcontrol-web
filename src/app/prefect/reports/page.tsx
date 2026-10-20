// =====================================================================
// src/app/prefect/reports/page.tsx
// ---------------------------------------------------------------------
// Lista de Reportes de Conducta — puerto web de reports/index.jsx:
//   - Segment tabs "Mis Reportes | Todos" (scope CLIENT por
//     reported_by._id === yo)
//   - Select de filtro: Activos (default) / Cancelados / Deméritos /
//     Méritos / Todos — client-side sobre el listado cargado
//   - Búsqueda client (alumno, grupo, descripción, reportero)
//   - Lista en FILAS densas dentro de un solo Card (patrón web del
//     producto; antes: una card alta por reporte, estilo app móvil)
//   - Paginación server con "Cargar más" (hasMore = página ≥ 20)
//   - "+ Nuevo Reporte" → modal (SOLO prefect puede crear — el hook
//     inyecta school_year_id desde el dashboard)
// Fuente: hook useReportsList.
// =====================================================================

"use client";

import { toNotice } from "@/lib/notice";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/hooks/useAuth";
import { useReportsList } from "@/lib/hooks/useReportsList";
import { CreateReportModal } from "@/app/prefect/_components/CreateReportModal";
import { SegmentTabs } from "@/app/prefect/_components/ListControls";
import { formatShortDate } from "@/lib/dates";
import { ChevronRight, FileWarning, Search, TrendingDown, TrendingUp } from "lucide-react";

// Opciones del dropdown de filtro (mismos values que la app).
const FILTER_OPTIONS = [
  { value: "active", label: "Activos" },
  { value: "cancelled", label: "Cancelados" },
  { value: "demerit", label: "Deméritos" },
  { value: "merit", label: "Méritos" },
  { value: "all", label: "Todos" },
];

export default function PrefectReportsPage() {
  const { user } = useAuth();
  const { items, hasMore, isLoading, isLoadingMore, error, loadMore, refetch, create } =
    useReportsList();

  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [filter, setFilter] = useState("active");
  const [searchText, setSearchText] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Helpers de lectura sobre campos poblados/crudos.
  const studentName = (student: unknown): string => {
    if (!student) return "Sin alumno";
    if (typeof student === "string") return "";
    const s = student as { first_name?: string; last_name?: string };
    return `${s.last_name || ""}, ${s.first_name || ""}`.replace(/^,\s*/, "") || "Sin alumno";
  };
  const studentGroupId = (student: unknown): string => {
    if (!student || typeof student === "string") return "";
    const g = (student as { current_group_id?: unknown }).current_group_id;
    if (g && typeof g === "object") {
      const go = g as { grade?: number; section?: string };
      return `${go.grade ?? ""}°${go.section ?? ""}`;
    }
    return "";
  };
  const reporterName = (reporter: unknown): string => {
    if (!reporter || typeof reporter === "string") return "";
    const r = reporter as { name?: string; last_name?: string };
    return `${r.last_name || ""} ${r.name || ""}`.trim();
  };

  // Scope: "Mis Reportes" = creados por mí.
  const scopedItems = useMemo(() => {
    if (scope === "mine" && user?._id) {
      return items.filter(
        (r) =>
          typeof r.reported_by === "object" && r.reported_by?._id === user._id
      );
    }
    return items;
  }, [items, scope, user?._id]);

  // Filtro por dropdown.
  const filteredByStatus = useMemo(() => {
    switch (filter) {
      case "active":
        return scopedItems.filter((r) => r.status !== "cancelled");
      case "cancelled":
        return scopedItems.filter((r) => r.status === "cancelled");
      case "demerit":
        return scopedItems.filter((r) => r.eventType === "demerit");
      case "merit":
        return scopedItems.filter((r) => r.eventType === "merit");
      default:
        return scopedItems;
    }
  }, [scopedItems, filter]);

  // Búsqueda client (mismos campos que la app).
  const filteredItems = useMemo(() => {
    const term = searchText.toLowerCase().trim();
    if (!term) return filteredByStatus;
    return filteredByStatus.filter((r) =>
      [
        studentName(r.student_id),
        studentGroupId(r.student_id),
        r.description || "",
        reporterName(r.reported_by),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [filteredByStatus, searchText]);

  // Cambio de tab → reset de filtros (igual que la app).
  const handleScopeChange = (id: string) => {
    setScope(id as "mine" | "all");
    setFilter("active");
    setSearchText("");
  };

  if (isLoading && items.length === 0 && !error) {
    return <LoadingState message="Cargando reportes…" />;
  }
  if (error && items.length === 0) {
    return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reportes de Conducta"
        subtitle="Deméritos y méritos de la escuela"
        action={{ label: "+ Nuevo Reporte", onClick: () => setIsCreateOpen(true) }}
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

      {/* Tabs: Mis Reportes | Todos */}
      <SegmentTabs
        tabs={[
          { id: "mine", label: "Mis Reportes" },
          { id: "all", label: "Todos" },
        ]}
        active={scope}
        onChange={handleScopeChange}
      />

      {/* Filtro dropdown + búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="sm:w-52">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={FILTER_OPTIONS}
          />
        </div>
        <div className="flex-1">
          <Input
            placeholder="Buscar alumno, descripción..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            icon={<Search size={16} className="text-slate-400" />}
          />
        </div>
      </div>

      {/* Lista */}
      {filteredItems.length === 0 && !isLoading ? (
        <EmptyState
          icon={<FileWarning size={48} className="text-slate-300" />}
          title="No hay reportes"
          description="Ajusta la búsqueda o los filtros para ver más resultados."
        />
      ) : (
        <>
          {/* Lista en filas densas — UN Card con divide-y (patrón web;
              antes: una card alta por reporte). Fila: ícono tintado
              por tipo (cancelado → gris) + alumno + badges + impacto
              de puntos + meta en 1 línea. */}
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {filteredItems.map((report) => {
              const isMerit = report.eventType === "merit";
              const isCancelled = report.status === "cancelled";
              // Tinte del ícono: cancelados en gris (ya no aportan
              // color de evento), mérito esmeralda, demérito rosa.
              const iconTint = isCancelled
                ? "bg-slate-100 text-slate-500"
                : isMerit
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700";
              return (
                <Link
                  key={report._id}
                  href={`/prefect/reports/${report._id}`}
                  className="block hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${iconTint}`}
                    >
                      {isMerit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {studentName(report.student_id)}
                        </p>
                        <Badge variant={isMerit ? "emerald" : "rose"} className="shrink-0">
                          {isMerit ? "Mérito" : "Demérito"}
                        </Badge>
                        {!isMerit && report.severity && (
                          <Badge variant="slate" className="shrink-0">
                            {report.severity === "minor"
                              ? "Leve"
                              : report.severity === "moderate"
                                ? "Moderado"
                                : "Grave"}
                          </Badge>
                        )}
                        {isCancelled && (
                          <Badge variant="slate" className="shrink-0">
                            Cancelado
                          </Badge>
                        )}
                        {/* Impacto de puntos al extremo derecho de la
                            línea 1 (dato clave del reporte). */}
                        <span
                          className={`ml-auto flex items-center gap-1 text-sm font-extrabold shrink-0 ${
                            isMerit ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isMerit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {isMerit ? "+" : "-"}
                          {report.points_impact}
                        </span>
                      </div>
                      {/* Meta en 1 línea: grupo · descripción · fecha ·
                          reportero (trunca en móvil). */}
                      <p className="text-xs text-text-secondary truncate mt-0.5">
                        {studentGroupId(report.student_id) || "—"} ·{" "}
                        {report.description || "Sin descripción"} ·{" "}
                        {formatShortDate(report.createdAt)}
                        {reporterName(report.reported_by)
                          ? ` · ${reporterName(report.reported_by)}`
                          : ""}
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
            ) : hasMore && scope === "all" ? (
              <Button variant="secondary" onClick={loadMore}>
                Cargar más ({items.length} cargados)
              </Button>
            ) : items.length > 0 ? (
              <span className="text-xs text-text-muted">
                {filteredItems.length} de {items.length} reporte
                {items.length !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        </>
      )}

      {/* Modal de creación */}
      <CreateReportModal
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
