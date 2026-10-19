// =====================================================================
// src/app/prefect/reports/[id]/page.tsx
// ---------------------------------------------------------------------
// Detalle de Reporte de Conducta — puerto web de reports/[id].jsx:
//   - Lectura: alumno (→ ficha), grupo, tipo/gravedad/puntos, puntos
//     actuales, descripción, reportero y estado.
//   - Acciones con la matriz de permisos del backend:
//       canEdit   = soy creador + reporte activo   → editar descripción
//                   (edición inline con TextArea, PATCH /:id)
//       canCancel = soy creador + activo           → confirm → PUT cancel
//                   (el backend restaura los puntos)
//       canDelete = rol super_admin                → confirm → DELETE
// Fuente: hook useReportDetail.
// =====================================================================

"use client";

import { toNotice } from "@/lib/notice";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/lib/hooks/useAuth";
import { useReportDetail } from "@/lib/hooks/useReportDetail";
import { formatFullDateTime, formatShortDate } from "@/lib/dates";
import { Calendar, Pencil, Trash2, XCircle } from "lucide-react";

export default function PrefectReportDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { report, isLoading, error, updateDescription, cancelReport, deleteReport, refetch } =
    useReportDetail(params.id);

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [draftDesc, setDraftDesc] = useState("");
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  if (isLoading) return <LoadingState message="Cargando reporte…" />;
  if (error || !report) {
    return (
      <ErrorState
        message={error || "No se pudo cargar el reporte."}
        action={{ label: "Reintentar", onClick: refetch }}
      />
    );
  }

  // Alumno poblado (student_id puede venir como objeto o id crudo).
  const student =
    report.student_id && typeof report.student_id === "object"
      ? report.student_id
      : null;
  const studentName = student
    ? `${student.last_name || ""}, ${student.first_name || ""}`.replace(/^,\s*/, "")
    : "Sin alumno";
  const studentId = student?._id || "";
  const groupLabel =
    student && typeof student.current_group_id === "object" && student.current_group_id
      ? `${student.current_group_id.grade ?? ""}°${student.current_group_id.section ?? ""}`
      : "";

  const reporter =
    typeof report.reported_by === "object" ? report.reported_by : null;
  const reporterName = reporter
    ? `${reporter.last_name || ""} ${reporter.name || ""}`.trim()
    : "";

  const isMerit = report.eventType === "merit";
  const isCancelled = report.status === "cancelled";

  // Matriz de permisos (idéntica a la app):
  const isCreator = !!reporter?._id && reporter._id === (user?._id || "");
  const isAdminLike = user?.role === "admin" || user?.role === "super_admin";
  const canEdit = isCreator && !isCancelled;
  const canCancel = (isCreator || isAdminLike) && !isCancelled;
  const canDelete = user?.role === "super_admin";

  // Editar descripción inline → PATCH + refetch.
  const handleSaveDescription = async () => {
    const trimmed = draftDesc.trim();
    if (!trimmed) return;
    setIsActionInFlight(true);
    const result = await updateDescription(trimmed);
    setIsActionInFlight(false);
    if (result.success) setIsEditingDesc(false);
    setNotice(toNotice(result));
    setTimeout(() => setNotice(null), 4500);
  };

  // Cancelar reporte → el backend restaura puntos.
  const handleCancel = async () => {
    setIsActionInFlight(true);
    const result = await cancelReport();
    setIsActionInFlight(false);
    setIsCancelOpen(false);
    setNotice(toNotice(result));
    setTimeout(() => setNotice(null), 4500);
  };

  // Eliminar (solo super_admin) → back al listado.
  const handleDelete = async () => {
    setIsActionInFlight(true);
    const result = await deleteReport();
    setIsActionInFlight(false);
    if (result.success) router.push("/prefect/reports");
    else {
      setIsDeleteOpen(false);
      setNotice(toNotice(result));
      setTimeout(() => setNotice(null), 4500);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageHeader
        title="Detalle del Reporte"
        subtitle={studentName}
        action={{ label: "← Volver", href: "/prefect/reports" }}
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

      {/* Tarjeta héroe: alumno + tipo + puntos + estado */}
      <Card
        className={`border-l-4 ${
          isCancelled
            ? "border-l-slate-300"
            : isMerit
              ? "border-l-emerald-500"
              : "border-l-rose-500"
        }`}
      >
        <CardBody className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              {/* Alumno → ficha */}
              {studentId ? (
                <Link
                  href={`/prefect/students/${studentId}`}
                  className="text-lg font-bold text-text-primary hover:text-sky-600"
                >
                  {studentName}
                </Link>
              ) : (
                <p className="text-lg font-bold text-text-primary">{studentName}</p>
              )}
              <p className="text-xs text-text-secondary mt-0.5">{groupLabel || "—"}</p>
            </div>
            <span
              className={`text-3xl font-extrabold shrink-0 ${
                isMerit ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {isMerit ? "+" : "-"}
              {report.points_impact}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={isMerit ? "emerald" : "rose"}>
              {isMerit ? "Mérito" : "Demérito"}
            </Badge>
            {!isMerit && report.severity && (
              <Badge variant="slate">
                {report.severity === "minor"
                  ? "Leve"
                  : report.severity === "moderate"
                    ? "Moderado"
                    : "Grave"}
              </Badge>
            )}
            {isCancelled ? (
              <Badge variant="slate">Cancelado</Badge>
            ) : (
              <Badge variant="emerald">Activo</Badge>
            )}
            {report.school_year_id && typeof report.school_year_id === "string" && (
              <Badge variant="sky">Ciclo escolar</Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formatShortDate(report.createdAt)}
            </span>
            {report.createdAt && <span>{formatFullDateTime(report.createdAt)}</span>}
            {reporterName && <span className="ml-auto">{reporterName}</span>}
          </div>
        </CardBody>
      </Card>

      {/* Descripción (lectura o edición inline para el creador) */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-text-primary">Descripción</p>
            {canEdit && !isEditingDesc && (
              <button
                onClick={() => {
                  setDraftDesc(report.description || "");
                  setIsEditingDesc(true);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                <Pencil size={13} /> Editar
              </button>
            )}
          </div>

          {isEditingDesc ? (
            <div className="space-y-3">
              <TextArea
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                maxLength={5000}
                rows={6}
                placeholder="Describe el hecho observado..."
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsEditingDesc(false)}
                  disabled={isActionInFlight}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveDescription}
                  isLoading={isActionInFlight}
                  disabled={!draftDesc.trim() || draftDesc.trim() === report.description}
                >
                  Guardar cambios
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
              {report.description || "Sin descripción"}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Acciones según permisos */}
      {(canCancel || canDelete) && !isEditingDesc && (
        <div className="flex flex-wrap gap-3">
          {canCancel && (
            <Button variant="danger" onClick={() => setIsCancelOpen(true)}>
              <XCircle size={14} className="mr-1.5" /> Cancelar reporte
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 size={14} className="mr-1.5" /> Eliminar
            </Button>
          )}
        </div>
      )}

      {/* Contexto del impacto (deméritos/méritos del alumno) — el modal
          de conducta de la ficha muestra el score completo. */}
      {studentId && (
        <p className="text-center">
          <Link
            href={`/prefect/students/${studentId}`}
            className="text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            Ver ficha y score de conducta →
          </Link>
        </p>
      )}

      {/* Confirmación de cancelación */}
      <ConfirmDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancelar reporte"
        message="¿Cancelar este reporte? Los puntos serán restaurados y la acción no se puede deshacer."
        confirmLabel="Sí, cancelar"
        isLoading={isActionInFlight}
      />

      {/* Confirmación de borrado (solo super_admin) */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar reporte"
        message="¿Eliminar este reporte de forma permanente? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        isLoading={isActionInFlight}
      />
    </div>
  );
}
