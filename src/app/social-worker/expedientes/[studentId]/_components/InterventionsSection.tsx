// Sección INTERVENCIONES de la ficha de expediente.
// Tres bloques (espejo de InterventionsTab.jsx de la app móvil):
//   1. Visitas domiciliarias → se guardan en `home_visits` vía el
//      mismo PATCH de salud que las demás secciones (onSave).
//   2. Acuerdos con padres  → POST/PATCH propios del trabajador
//      social (/api/social-worker/.../agreements).
//   3. Canalizaciones externas → idem (.../referrals).
// Los modales de alta/edición usan react-hook-form + zod; el refrescado
// de listas lo hace el hook useStudentExpediente.

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CalendarDays,
  Handshake,
  Building2,
  Plus,
} from "lucide-react";
import type {
  HomeVisit,
  InstitutionReferralItem,
  ParentAgreementItem,
  PrefectStudent,
} from "@/lib/types";
import type { MutateResult, HealthSectionPayload } from "@/lib/hooks/useStudentExpediente";

// ---------------------------------------------------------------------
// Opciones de enums (espejo de los enums del backend)
// ---------------------------------------------------------------------
const AGREEMENT_TYPES = [
  { value: "conducta", label: "Conducta" },
  { value: "academico", label: "Académico" },
  { value: "salud", label: "Salud" },
  { value: "inclusion", label: "Inclusión" },
  { value: "otro", label: "Otro" },
];

const AGREEMENT_STATUSES = [
  { value: "active", label: "Activo" },
  { value: "completed", label: "Cumplido" },
  { value: "cancelled", label: "Cancelado" },
];

const REFERRAL_TYPES = [
  { value: "hospital", label: "Hospital" },
  { value: "clinica", label: "Clínica" },
  { value: "psicologia", label: "Psicología" },
  { value: "terapia", label: "Terapia" },
  { value: "trabajo_social", label: "Trabajo social" },
  { value: "educacion_especial", label: "Educación especial" },
  { value: "otro", label: "Otro" },
];

const REFERRAL_STATUSES = [
  { value: "pending", label: "Pendiente" },
  { value: "sent", label: "Enviado" },
  { value: "in_progress", label: "En proceso" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

// Badge por status (agreement) — semántica: activo = sky, cumplido =
// emerald, cancelado = slate.
function agreementBadge(status?: string) {
  if (status === "completed") return <Badge variant="emerald">Cumplido</Badge>;
  if (status === "cancelled") return <Badge variant="slate">Cancelado</Badge>;
  return <Badge variant="sky">Activo</Badge>;
}

function referralBadge(status?: string) {
  switch (status) {
    case "completed":
      return <Badge variant="emerald">Completado</Badge>;
    case "cancelled":
      return <Badge variant="slate">Cancelado</Badge>;
    case "pending":
      return <Badge variant="amber">Pendiente</Badge>;
    default:
      return <Badge variant="sky">En trámite</Badge>;
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------
// Modal: Acuerdo con padres
// ---------------------------------------------------------------------
const agreementSchema = z.object({
  title: z.string().trim().min(1, "Título requerido").max(200),
  description: z.string().max(1000).optional(),
  agreement_type: z.string(),
  status: z.string(),
  review_date: z.string().optional(),
  notes: z.string().max(2000).optional(),
});
type AgreementValues = z.infer<typeof agreementSchema>;

function AgreementModal({
  isOpen,
  onClose,
  editing,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: ParentAgreementItem | null;
  onSave: (payload: Record<string, unknown>, id?: string) => Promise<MutateResult>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AgreementValues>({
    resolver: zodResolver(agreementSchema),
    defaultValues: {
      title: editing?.title || "",
      description: editing?.description || "",
      agreement_type: editing?.agreement_type || "conducta",
      status: editing?.status || "active",
      review_date: editing?.review_date
        ? String(editing.review_date).slice(0, 10)
        : "",
      notes: editing?.notes || "",
    },
  });

  const submit = handleSubmit(async (data) => {
    const payload: Record<string, unknown> = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      agreement_type: data.agreement_type,
      status: data.status,
      review_date: data.review_date
        ? new Date(`${data.review_date}T00:00:00`).toISOString()
        : null,
      notes: data.notes?.trim() || null,
    };
    const result = await onSave(payload, editing?._id);
    if (result.success) onClose();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Editar acuerdo" : "Nuevo acuerdo con padres"}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Título"
          placeholder="Ej. Asistencia puntual"
          error={errors.title?.message}
          {...register("title")}
        />
        <TextArea
          label="Descripción"
          placeholder="Qué se acordó con la familia…"
          maxLength={1000}
          {...register("description")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Tipo"
            options={AGREEMENT_TYPES}
            {...register("agreement_type")}
          />
          <Select
            label="Estado"
            options={AGREEMENT_STATUSES}
            {...register("status")}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Fecha de revisión"
            type="date"
            {...register("review_date")}
          />
        </div>
        <TextArea
          label="Notas"
          placeholder="Seguimiento, compromisos, etc."
          maxLength={2000}
          {...register("notes")}
        />
        <div className="flex justify-end gap-3 pt-2 border-t border-divider">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="emerald" isLoading={isSubmitting}>
            Guardar acuerdo
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Modal: Canalización externa
// ---------------------------------------------------------------------
const referralSchema = z.object({
  institution_name: z.string().trim().min(1, "Institución requerida").max(200),
  institution_type: z.string(),
  contact_info: z.string().max(200).optional(),
  reason: z.string().trim().min(1, "Motivo requerido").max(1000),
  status: z.string(),
  response_notes: z.string().max(2000).optional(),
  response_date: z.string().optional(),
});
type ReferralValues = z.infer<typeof referralSchema>;

function ReferralModal({
  isOpen,
  onClose,
  editing,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: InstitutionReferralItem | null;
  onSave: (payload: Record<string, unknown>, id?: string) => Promise<MutateResult>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReferralValues>({
    resolver: zodResolver(referralSchema),
    defaultValues: {
      institution_name: editing?.institution_name || "",
      institution_type: editing?.institution_type || "otro",
      contact_info: editing?.contact_info || "",
      reason: editing?.reason || "",
      status: editing?.status || "pending",
      response_notes: editing?.response_notes || "",
      response_date: editing?.response_date
        ? String(editing.response_date).slice(0, 10)
        : "",
    },
  });

  const submit = handleSubmit(async (data) => {
    const payload: Record<string, unknown> = {
      institution_name: data.institution_name.trim(),
      institution_type: data.institution_type,
      contact_info: data.contact_info?.trim() || null,
      reason: data.reason.trim(),
      status: data.status,
      response_notes: data.response_notes?.trim() || null,
      response_date: data.response_date
        ? new Date(`${data.response_date}T00:00:00`).toISOString()
        : null,
    };
    const result = await onSave(payload, editing?._id);
    if (result.success) onClose();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Editar canalización" : "Nueva canalización externa"}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Institución"
          placeholder="Ej. DIF municipal"
          error={errors.institution_name?.message}
          {...register("institution_name")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Tipo de institución"
            options={REFERRAL_TYPES}
            {...register("institution_type")}
          />
          <Input
            label="Contacto"
            placeholder="Teléfono o correo"
            {...register("contact_info")}
          />
        </div>
        <TextArea
          label="Motivo de la canalización"
          placeholder="Por qué se canaliza al alumno/familia…"
          maxLength={1000}
          error={errors.reason?.message}
          {...register("reason")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Estado"
            options={REFERRAL_STATUSES}
            {...register("status")}
          />
          <Input
            label="Fecha de respuesta"
            type="date"
            {...register("response_date")}
          />
        </div>
        <TextArea
          label="Respuesta de la institución"
          placeholder="Qué respondió la institución…"
          maxLength={2000}
          {...register("response_notes")}
        />
        <div className="flex justify-end gap-3 pt-2 border-t border-divider">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="emerald" isLoading={isSubmitting}>
            Guardar canalización
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Sección principal
// ---------------------------------------------------------------------
interface InterventionsSectionProps {
  student: PrefectStudent;
  agreements: ParentAgreementItem[];
  referrals: InstitutionReferralItem[];
  onSave: (payload: HealthSectionPayload) => Promise<MutateResult>;
  onSaveAgreement: (
    payload: Record<string, unknown>,
    id?: string
  ) => Promise<MutateResult>;
  onSaveReferral: (
    payload: Record<string, unknown>,
    id?: string
  ) => Promise<MutateResult>;
  /** Ausente en la última sección. */
  onNext?: () => void;
  isSaving: boolean;
}

export function InterventionsSection({
  student,
  agreements,
  referrals,
  onSave,
  onSaveAgreement,
  onSaveReferral,
  onNext,
  isSaving,
}: InterventionsSectionProps) {
  // Visitas domiciliarias — estado local (se persisten con onSave).
  const [visits, setVisits] = useState<HomeVisit[]>(
    student.health_inclusion?.home_visits || []
  );
  const [visitDate, setVisitDate] = useState("");
  const [visitObservations, setVisitObservations] = useState("");
  const [editingVisitIndex, setEditingVisitIndex] = useState<number | null>(null);

  // Modales
  const [agreementModal, setAgreementModal] = useState<{
    open: boolean;
    editing: ParentAgreementItem | null;
  }>({ open: false, editing: null });
  const [referralModal, setReferralModal] = useState<{
    open: boolean;
    editing: InstitutionReferralItem | null;
  }>({ open: false, editing: null });

  const persistVisits = async (next: HomeVisit[]): Promise<MutateResult> => {
    setVisits(next);
    return onSave({ home_visits: next });
  };

  const submitVisit = async () => {
    if (!visitDate) return;
    let next: HomeVisit[];
    if (editingVisitIndex !== null) {
      next = visits.map((v, i) =>
        i === editingVisitIndex
          ? { ...v, date: visitDate, observations: visitObservations.trim() || undefined }
          : v
      );
    } else {
      next = [
        ...visits,
        { date: visitDate, observations: visitObservations.trim() || undefined, conducted_by: null },
      ];
    }
    const result = await persistVisits(next);
    if (result.success) {
      setVisitDate("");
      setVisitObservations("");
      setEditingVisitIndex(null);
    }
  };

  const removeVisit = async (index: number) => {
    await persistVisits(visits.filter((_, i) => i !== index));
    if (editingVisitIndex === index) {
      setEditingVisitIndex(null);
      setVisitDate("");
      setVisitObservations("");
    }
  };

  const startEditVisit = (index: number) => {
    const v = visits[index];
    setEditingVisitIndex(index);
    setVisitDate(v.date ? String(v.date).slice(0, 10) : "");
    setVisitObservations(v.observations || "");
  };

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------- */}
      {/* 1. Visitas domiciliarias                                    */}
      {/* ---------------------------------------------------------- */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <CalendarDays size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Visitas domiciliarias
              </h3>
              <p className="text-xs text-text-secondary">
                Se guardan automáticamente al agregarlas.
              </p>
            </div>
          </div>

          {visits.length > 0 && (
            <ul className="space-y-2">
              {visits.map((visit, i) => (
                <li
                  key={`${visit.date}-${i}`}
                  className="flex items-start gap-3 rounded-xl border border-border bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">
                      {formatDate(visit.date)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {visit.observations || "Sin observaciones"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditVisit(i)}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => removeVisit(i)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Alta / edición de visita */}
          <div className="rounded-xl border border-border bg-emerald-50/40 p-3 space-y-3">
            <p className="text-xs font-semibold text-emerald-800">
              {editingVisitIndex !== null
                ? "Editando visita"
                : "Registrar visita"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <Input
                label="Fecha"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
              <div className="sm:col-span-2">
                <TextArea
                  label="Observaciones"
                  placeholder="Describe lo observado en la visita…"
                  maxLength={2000}
                  value={visitObservations}
                  onChange={(e) => setVisitObservations(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {editingVisitIndex !== null && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingVisitIndex(null);
                    setVisitDate("");
                    setVisitObservations("");
                  }}
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="button"
                variant="emerald"
                size="sm"
                onClick={submitVisit}
                disabled={!visitDate || isSaving}
                isLoading={isSaving}
              >
                <Plus size={14} />
                {editingVisitIndex !== null ? "Actualizar" : "Agregar visita"}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ---------------------------------------------------------- */}
      {/* 2. Acuerdos con padres                                      */}
      {/* ---------------------------------------------------------- */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 text-sky-700 shrink-0">
                <Handshake size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Acuerdos con padres
                </h3>
                <p className="text-xs text-text-secondary">
                  Compromisos firmados con la familia.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAgreementModal({ open: true, editing: null })}
            >
              <Plus size={14} />
              Nuevo
            </Button>
          </div>

          {agreements.length === 0 ? (
            <EmptyState
              icon={<Handshake size={40} className="text-slate-300" />}
              title="Sin acuerdos"
              description="Aún no se han registrado acuerdos con la familia."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {agreements.map((a) => (
                <li
                  key={a._id}
                  className="py-3 flex items-start gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">
                        {a.title}
                      </p>
                      {agreementBadge(a.status)}
                    </div>
                    {a.description && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {a.description}
                      </p>
                    )}
                    <p className="text-xs text-text-muted mt-1">
                      {AGREEMENT_TYPES.find((t) => t.value === a.agreement_type)
                        ?.label || a.agreement_type}
                      {a.review_date ? ` · Revisión: ${formatDate(a.review_date)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAgreementModal({ open: true, editing: a })}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                  >
                    Editar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* ---------------------------------------------------------- */}
      {/* 3. Canalizaciones externas                                  */}
      {/* ---------------------------------------------------------- */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                <Building2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Canalizaciones externas
                </h3>
                <p className="text-xs text-text-secondary">
                  Referencias a otras instituciones.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setReferralModal({ open: true, editing: null })}
            >
              <Plus size={14} />
              Nueva
            </Button>
          </div>

          {referrals.length === 0 ? (
            <EmptyState
              icon={<Building2 size={40} className="text-slate-300" />}
              title="Sin canalizaciones"
              description="Aún no se han referenciado instituciones."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {referrals.map((r) => (
                <li key={r._id} className="py-3 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">
                        {r.institution_name}
                      </p>
                      {referralBadge(r.status)}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {r.reason}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {REFERRAL_TYPES.find((t) => t.value === r.institution_type)
                        ?.label || r.institution_type}
                      {r.referral_date ? ` · ${formatDate(r.referral_date)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReferralModal({ open: true, editing: r })}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                  >
                    Editar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Esta sección persiste por bloque (visitas al agregarlas,
          acuerdos/canalizaciones desde su modal) — sin footer de
          guardado único; solo se avanza a la siguiente sección. */}
      {onNext && (
        <div className="flex justify-end">
          <Button type="button" variant="emerald" onClick={onNext}>
            Siguiente →
          </Button>
        </div>
      )}

      {/* Modales */}
      <AgreementModal
        isOpen={agreementModal.open}
        onClose={() => setAgreementModal({ open: false, editing: null })}
        editing={agreementModal.editing}
        onSave={onSaveAgreement}
      />
      <ReferralModal
        isOpen={referralModal.open}
        onClose={() => setReferralModal({ open: false, editing: null })}
        editing={referralModal.editing}
        onSave={onSaveReferral}
      />
    </div>
  );
}
