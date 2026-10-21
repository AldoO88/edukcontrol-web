// =====================================================================
// src/app/prefect/citations/[id]/page.tsx
// ---------------------------------------------------------------------
// Detalle de Citatorio — puerto web de citations/[id].jsx:
//   - Héroe: estado (CITATION_STATUS_LABELS), alumno (→ ficha), grupo,
//     tipo, fecha/hora completas, ubicación, motivo.
//   - Banner ámbar si el tutor pidió reagendar (rescheduleRequested).
//   - Timeline de history[] (event → label + timestamp).
//   - Acciones del CREADOR según status (misma matriz que la app):
//       pending               → Editar + Reagendar + Cancelar
//       confirmed/no_show/    → Reagendar + Cancelar
//       expired
//       reschedule_requested  → Reagendar + Cancelar (sin Editar)
//       completed/cancelled   → sin acciones (terminal)
// Fuente: hook useCitationDetail (PUT parcial / PATCH reschedule|cancel).
// =====================================================================

"use client";

import { toNotice } from "@/lib/notice";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCitationDetail } from "@/lib/hooks/useCitationDetail";
import {
  CITATION_STATUS_LABELS,
  CITATION_TYPE_LABELS,
  HISTORY_EVENT_LABELS,
  normalizeCitation,
} from "@/lib/citations";
import { EditCitationModal } from "@/app/prefect/_components/EditCitationModal";
import { RescheduleCitationModal } from "@/app/prefect/_components/RescheduleCitationModal";
import { formatFullDateTime, formatShortDate, formatTime12 } from "@/lib/dates";
import {
  AlertTriangle,
  Calendar,
  Clock,
  History,
  MapPin,
  Pencil,
  Wrench,
  XCircle,
} from "lucide-react";

// Badge de estado por valor crudo.
const STATUS_VARIANT: Record<string, "amber" | "sky" | "emerald" | "rose" | "slate"> = {
  pending: "amber",
  reschedule_requested: "amber",
  confirmed: "sky",
  completed: "emerald",
  no_show: "rose",
  expired: "slate",
  cancelled: "slate",
};

export default function PrefectCitationDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { citation, isLoading, error, update, reschedule, cancel, refetch } =
    useCitationDetail(params.id);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  if (isLoading) return <LoadingState message="Cargando citatorio…" />;
  if (error || !citation) {
    return (
      <ErrorState
        message={error || "No se pudo cargar el citatorio."}
        action={{ label: "Reintentar", onClick: refetch }}
      />
    );
  }

  const norm = normalizeCitation(citation);

  // Permisos: SOLO el creador edita/reagenda/cancela (matriz del backend).
  const creatorId = norm.creatorId;
  const isCreator = !!creatorId && creatorId === (user?._id || "");
  const isEditableStatus =
    citation.status === "pending" ||
    citation.status === "confirmed" ||
    citation.status === "no_show" ||
    citation.status === "expired" ||
    citation.status === "reschedule_requested";
  const canEdit = isCreator && citation.status === "pending";
  const canCancel =
    isCreator && isEditableStatus && citation.status !== "reschedule_requested";
  const canReschedule =
    isCreator && isEditableStatus && citation.status !== "reschedule_requested";
  const isTerminal = citation.status === "completed" || citation.status === "cancelled";

  const studentId = norm.studentId;

  // ¿Hay panel lateral? (acciones del creador y/o historial). Si no
  // hay, el contenido principal ocupa las 3 columnas.
  const hasAside = (isCreator && !isTerminal) || norm.history.length > 0;

  // Cancelar → feedback + refetch (el card queda en estado terminal).
  const handleCancel = async () => {
    setIsCancelling(true);
    const result = await cancel();
    setIsCancelling(false);
    setIsCancelOpen(false);
    setNotice(toNotice(result));
    if (result.success) setTimeout(() => setNotice(null), 4500);
  };

  return (
    // Sin el tope max-w-3xl mx-auto de la app: en desktop el detalle
    // usa todo el ancho del área de contenido.
    <div className="space-y-4">
      <PageHeader
        title="Detalle del Citatorio"
        subtitle={norm.studentName}
        action={{ label: "← Volver", href: "/prefect/citations" }}
      />

      {/* Banner de feedback */}
      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            notice.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Banner de solicitud de reagendar del tutor */}
      {norm.rescheduleRequested && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-700">
            <AlertTriangle size={16} />
            El tutor solicitó reagendar
          </p>
          {norm.rescheduleReason && (
            <p className="text-xs text-amber-600 mt-1 ml-6">{norm.rescheduleReason}</p>
          )}
        </div>
      )}

      {/* Layout web de detalle: contenido principal (2/3) + panel
          lateral (1/3) con acciones e historial. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className={hasAside ? "lg:col-span-2 space-y-4" : "space-y-4"}>
          {/* Héroe: estado + datos clave */}
          <Card className="border-l-4 border-l-sky-500">
            <CardBody className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[citation.status] || "slate"}>
                  {CITATION_STATUS_LABELS[citation.status] || citation.status}
                </Badge>
                <Badge
                  variant={
                    citation.type === "behavioral"
                      ? "rose"
                      : citation.type === "administrative"
                        ? "amber"
                        : "sky"
                  }
                >
                  {CITATION_TYPE_LABELS[citation.type] || citation.type}
                </Badge>
              </div>

              <div>
                {/* Alumno → su ficha */}
                {studentId ? (
                  <Link
                    href={`/prefect/students/${studentId}`}
                    className="text-lg font-bold text-text-primary hover:text-sky-600"
                  >
                    {norm.studentName}
                  </Link>
                ) : (
                  <p className="text-lg font-bold text-text-primary">{norm.studentName}</p>
                )}
                <p className="text-xs text-text-secondary mt-0.5">
                  {norm.groupName || "—"}
                  {norm.subject ? ` · ${norm.subject}` : ""}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Fecha</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {formatShortDate(norm.date) || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Hora</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {formatTime12(norm.time) || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-slate-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Lugar</p>
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {norm.location || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {norm.reason && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-0.5">Motivo / notas</p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">
                    {norm.reason}
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-400">
                Creado por {norm.creatorName || "—"}
                {citation.createdAt ? ` · ${formatFullDateTime(citation.createdAt)}` : ""}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Panel lateral: acciones (solo creador, según status — matriz
            de la app) + timeline de historial. */}
        {hasAside && (
          <div className="space-y-4">
            {isCreator && !isTerminal && (
              <Card>
                <CardBody>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-100 text-sky-700">
                      <Wrench size={14} />
                    </span>
                    <p className="text-sm font-bold text-text-primary">Acciones</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {canEdit && (
                      <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
                        <Pencil size={14} className="mr-1.5" /> Editar
                      </Button>
                    )}
                    {canReschedule && (
                      <Button variant="sky" onClick={() => setIsRescheduleOpen(true)}>
                        <Calendar size={14} className="mr-1.5" /> Reagendar
                      </Button>
                    )}
                    {canCancel && (
                      <Button variant="danger" onClick={() => setIsCancelOpen(true)}>
                        <XCircle size={14} className="mr-1.5" /> Cancelar
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}

            {norm.history.length > 0 && (
              <Card>
                <CardBody>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700">
                      <History size={14} />
                    </span>
                    <p className="text-sm font-bold text-text-primary">Historial</p>
                  </div>
                  <ol className="space-y-4 border-l-2 border-slate-100 pl-4 ml-1">
                    {norm.history.map((entry, idx) => (
                      <li key={idx} className="relative">
                        <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-sky-500" />
                        <p className="text-sm font-semibold text-text-primary">
                          {HISTORY_EVENT_LABELS[entry.event || entry.status || ""] ||
                            entry.event ||
                            entry.status ||
                            "Evento"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatFullDateTime(entry.timestamp)}
                        </p>
                        {(entry.reason || entry.note) && (
                          <p className="text-xs text-text-secondary mt-0.5">
                            {entry.reason || entry.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </CardBody>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Modal editar (solo pending + creador) */}
      <EditCitationModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initial={{
          type: citation.type || "behavioral",
          location: citation.location || "",
          reason: citation.reason || "",
        }}
        onSubmit={async (payload) => {
          const result = await update(payload);
          setNotice(toNotice(result));
          if (result.success) setTimeout(() => setNotice(null), 4500);
          return result;
        }}
      />

      {/* Modal reagendar */}
      <RescheduleCitationModal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        initial={{ date: norm.date, time: norm.time, location: norm.location }}
        onSubmit={async (payload) => {
          const result = await reschedule(payload);
          setNotice(toNotice(result));
          if (result.success) setTimeout(() => setNotice(null), 4500);
          return result;
        }}
      />

      {/* Confirmación de cancelación */}
      <ConfirmDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancelar citatorio"
        message="¿Seguro que deseas cancelar este citatorio? El tutor recibirá la notificación y no se podrá deshacer."
        confirmLabel="Sí, cancelar"
        isLoading={isCancelling}
      />

      {/* Utilidad: regreso directo a la ficha si existe alumno */}
      {studentId && (
        <p className="text-center">
          <Link
            href={`/prefect/students/${studentId}`}
            className="text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            Ver ficha del alumno →
          </Link>
        </p>
      )}
    </div>
  );
}
