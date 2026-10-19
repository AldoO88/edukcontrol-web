// =====================================================================
// src/app/prefect/announcements/[id]/page.tsx
// ---------------------------------------------------------------------
// Detalle de Aviso — puerto web de announcements/[id].jsx:
//   - Lectura: título, prioridad, audiencia (chips de grupos), emisor,
//     fecha de creación, cuerpo completo y progreso de lecturas.
//   - Acciones SOLO si el usuario es el emisor (misma regla que la app):
//     Editar (modal con título/prioridad/mensaje) y Eliminar (confirm
//     destructivo → back al listado).
// Fuente: hook useAnnouncementDetail.
// =====================================================================

"use client";

import { toNotice } from "@/lib/notice";
import { useRouter } from "next/navigation";
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
import { useAnnouncementDetail } from "@/lib/hooks/useAnnouncementDetail";
import { EditAnnouncementModal } from "@/app/prefect/_components/EditAnnouncementModal";
import { formatFullDateTime } from "@/lib/dates";
import { Pencil, Trash2, Users } from "lucide-react";

// Labels cortos de rol (mismos que la lista).
const ROLE_LABELS: Record<string, string> = {
  teacher: "Maestro",
  prefect: "Prefecto",
  admin: "Administrador",
  registrar: "Secretaría",
  director: "Director",
  social_worker: "Trabajo Social",
  super_admin: "Super Admin",
};

export default function PrefectAnnouncementDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { announcement, isLoading, error, update, remove, refetch } = useAnnouncementDetail(
    params.id
  );

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Auto-dismiss del banner de feedback.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  if (isLoading) return <LoadingState message="Cargando aviso…" />;
  if (error || !announcement) {
    return (
      <ErrorState
        message={error || "No se pudo cargar el aviso."}
        action={{ label: "Reintentar", onClick: refetch }}
      />
    );
  }

  // Emisor: puede editar/eliminar SOLO si soy yo (sobre poblado o id).
  const senderId =
    typeof announcement.sender === "object"
      ? announcement.sender?._id || ""
      : announcement.sender || "";
  const canEdit = !!senderId && senderId === (user?._id || "");
  const sender = typeof announcement.sender === "object" ? announcement.sender : null;
  const senderName = sender
    ? `${sender.last_name || ""} ${sender.name || ""}`.trim() || sender.fullName || ""
    : "";
  const isUrgent = announcement.priority === "urgent";
  const readCount = announcement.readCount ?? 0;
  const totalRecipients = announcement.totalRecipients ?? 0;

  // Chips de grupos/estudiantes según la audiencia.
  const groupLabels = (Array.isArray(announcement.targetGroups)
    ? announcement.targetGroups
    : []
  )
    .filter(Boolean)
    .map((g) =>
      typeof g === "object" && g ? `${g.grade ?? ""}°${g.section ?? ""}` : String(g)
    );
  const studentNames = (Array.isArray(announcement.targetStudents)
    ? announcement.targetStudents
    : []
  )
    .filter(Boolean)
    .map((s) =>
      typeof s === "object" && s ? `${s.last_name}, ${s.first_name}` : ""
    )
    .filter(Boolean);

  // Eliminar → feedback + regreso al listado (misma UX que la app).
  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await remove();
    setIsDeleting(false);
    if (result.success) router.push("/prefect/announcements");
    else {
      setIsDeleteOpen(false);
      setNotice({ ok: false, text: result.message });
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageHeader
        title="Detalle del Aviso"
        subtitle={announcement.title}
        action={{ label: "← Volver", href: "/prefect/announcements" }}
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

      {/* Tarjeta héroe: prioridad + audiencia + emisor + fecha */}
      <Card className={`border-l-4 ${isUrgent ? "border-l-rose-500" : "border-l-sky-500"}`}>
        <CardBody className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant={isUrgent ? "rose" : "sky"}>
                {isUrgent ? "Urgente" : "Informativo"}
              </Badge>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Users size={13} />
                {announcement.targetType === "group"
                  ? `A ${groupLabels.length} grupo${groupLabels.length === 1 ? "" : "s"}`
                  : announcement.targetType === "student"
                    ? "Dirigido"
                    : "General"}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xl font-bold text-text-primary">{announcement.title}</p>
            <p className="text-xs text-slate-400 mt-1">
              {formatFullDateTime(announcement.createdAt)}
            </p>
            {senderName && (
              <p className="text-xs text-text-secondary mt-0.5">
                {senderName}
                {sender?.role ? ` · ${ROLE_LABELS[sender.role] || sender.role}` : ""}
              </p>
            )}
          </div>

          {/* Chips de grupos / nombres de alumnos */}
          {(groupLabels.length > 0 || studentNames.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {groupLabels.map((label, idx) => (
                <span
                  key={`g-${idx}`}
                  className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold"
                >
                  {label}
                </span>
              ))}
              {studentNames.slice(0, 8).map((name, idx) => (
                <span
                  key={`s-${idx}`}
                  className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold"
                >
                  {name}
                </span>
              ))}
              {studentNames.length > 8 && (
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                  +{studentNames.length - 8}
                </span>
              )}
            </div>
          )}

          {/* Progreso de lecturas (si el backend lo trae) */}
          {totalRecipients > 0 && (
            <div>
              <div className="flex justify-between text-[10px] font-semibold mb-1">
                <span className="text-text-secondary">Lecturas</span>
                <span className="text-emerald-600">
                  {readCount}/{totalRecipients}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${Math.min((readCount / totalRecipients) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Cuerpo del aviso */}
      <Card>
        <CardBody>
          <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
            {announcement.message}
          </p>
        </CardBody>
      </Card>

      {/* Acciones — solo el emisor */}
      {canEdit && (
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
            <Pencil size={14} className="mr-1.5" /> Editar
          </Button>
          <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 size={14} className="mr-1.5" /> Eliminar
          </Button>
        </div>
      )}

      {/* Modal de edición (solo emisor) */}
      <EditAnnouncementModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initial={{
          title: announcement.title || "",
          message: announcement.message || "",
          priority: announcement.priority || "informative",
        }}
        onSubmit={async (payload) => {
          const result = await update(payload);
          setNotice(toNotice(result));
          if (result.success) setTimeout(() => setNotice(null), 4500);
          return result;
        }}
      />

      {/* Confirmación de borrado */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar aviso"
        message={`¿Eliminar "${announcement.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        isLoading={isDeleting}
      />
    </div>
  );
}
