// =====================================================================
// src/app/prefect/exit-passes/page.tsx
// ---------------------------------------------------------------------
// Lista de Pases de Salida — puerto web de exit-passes/index.jsx:
//   - Paginación server (page/limit 20, hasMore = acumulado < total)
//   - Búsqueda client por alumno o por quien retira (full width)
//   - Lista en FILAS densas dentro de un solo Card (patrón web del
//     producto; antes: una card alta por pase, estilo app móvil):
//     alumno+grupo, quién retira + parentesco, motivo, fecha y quién
//     registró; la hora de salida va al extremo derecho
//   - "+ Nuevo Pase" → modal picker grupo→alumno (el backend pone la
//     hora)
// Fuente: hook useExitPassesList.
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
import { useExitPassesList } from "@/lib/hooks/useExitPassesList";
import { CreateExitPassModal } from "@/app/prefect/_components/CreateExitPassModal";
import { formatShortDate, formatTime12 } from "@/lib/dates";
import { ChevronRight, DoorOpen, LogOut, Search } from "lucide-react";

// Catálogos (mismos values/labels que la app).
const RELATIONSHIP_LABELS: Record<string, string> = {
  father: "Padre",
  mother: "Madre",
  guardian: "Tutor",
  family: "Familiar",
};
const REASON_LABELS: Record<string, string> = {
  illness: "Enfermedad",
  medical: "Cita médica",
  family: "Asunto familiar",
  personal: "Personal",
  other: "Otro",
};

export default function PrefectExitPassesPage() {
  const { items, total, isLoading, isLoadingMore, error, loadMore, refetch, create } =
    useExitPassesList();

  const [searchText, setSearchText] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Nombre del alumno (student viene poblado en este endpoint).
  const studentName = (student: unknown): string => {
    if (!student || typeof student === "string") return "Sin alumno";
    const s = student as { first_name?: string; last_name?: string };
    return `${s.last_name || ""}, ${s.first_name || ""}`.replace(/^,\s*/, "") || "Sin alumno";
  };
  const studentGroup = (student: unknown): string => {
    if (!student || typeof student === "string") return "";
    const g = (student as { current_group_id?: unknown }).current_group_id;
    if (g && typeof g === "object") {
      const go = g as { grade?: number; section?: string };
      return `${go.grade ?? ""}°${go.section ?? ""}`;
    }
    return "";
  };
  const staffName = (staff: unknown): string => {
    if (!staff || typeof staff === "string") return "";
    const s = staff as { fullName?: string; name?: string; last_name?: string };
    if (s.fullName) return s.fullName;
    return `${s.last_name || ""} ${s.name || ""}`.trim();
  };

  // Búsqueda client: alumno o quien retira.
  const filteredItems = useMemo(() => {
    const term = searchText.toLowerCase().trim();
    if (!term) return items;
    return items.filter((pass) =>
      [studentName(pass.student), pass.guardian_name || ""]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [items, searchText]);

  if (isLoading && items.length === 0 && !error) {
    return <LoadingState message="Cargando pases de salida…" />;
  }
  if (error && items.length === 0) {
    return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pases de Salida"
        subtitle="Registro de salidas autorizadas"
        action={{ label: "+ Nuevo Pase", onClick: () => setIsCreateOpen(true) }}
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

      {/* Búsqueda — full width en desktop */}
      <Input
        placeholder="Buscar alumno o quien retira..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        icon={<Search size={16} className="text-slate-400" />}
      />

      {/* Lista */}
      {filteredItems.length === 0 && !isLoading ? (
        <EmptyState
          icon={<LogOut size={48} className="text-slate-300" />}
          title="No hay pases de salida"
          description="Ajusta la búsqueda o genera el primer pase."
        />
      ) : (
        <>
          {/* Lista en filas densas — UN Card con divide-y (patrón web;
              antes: una card alta por pase). Fila: ícono DoorOpen sky +
              alumno + badge parentesco + quién retira + meta en 1 línea
              + hora de salida destacada a la derecha. */}
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {filteredItems.map((pass) => {
              const group = studentGroup(pass.student);
              const registrar = staffName(pass.created_by) || staffName(pass.registered_by);
              return (
                <Link
                  key={pass._id}
                  href={`/prefect/exit-passes/${pass._id}`}
                  className="block hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-100 text-sky-700 shrink-0">
                      <DoorOpen size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {studentName(pass.student)}
                        </p>
                        <Badge variant="sky" className="shrink-0">
                          {pass.relationship
                            ? RELATIONSHIP_LABELS[pass.relationship] || pass.relationship
                            : "—"}
                        </Badge>
                        <span className="text-xs font-semibold text-text-primary shrink-0">
                          {pass.guardian_name}
                        </span>
                      </div>
                      {/* Meta en 1 línea: grupo · motivo(+detalle) ·
                          fecha · quién registró (trunca en móvil). */}
                      <p className="text-xs text-text-secondary truncate mt-0.5">
                        {group || "—"} · {REASON_LABELS[pass.reason] || pass.reason}
                        {pass.reason_detail ? ` — ${pass.reason_detail}` : ""} ·{" "}
                        {formatShortDate(pass.createdAt)}
                        {registrar ? ` · ${registrar}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-slate-700 shrink-0">
                      {formatTime12(pass.exit_time) || "—"}
                    </span>
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
            ) : items.length < total ? (
              <Button variant="secondary" onClick={loadMore}>
                Cargar más ({items.length} de {total})
              </Button>
            ) : items.length > 0 ? (
              <span className="text-xs text-text-muted">
                {items.length} pase{items.length !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        </>
      )}

      {/* Modal de creación */}
      <CreateExitPassModal
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
