// Sección NOTAS de la ficha de expediente.
// Guarda `alerts`, `notes` y `last_evaluation_date` vía PATCH
// /api/students/:id/health. Las alertas son un arreglo (el backend lo
// REEMPLAZA completo) — se manejan en estado local con alta/baja
// inline; notes/last_evaluation_date van por react-hook-form.
// Espejo de NotesTab.jsx de la app móvil.

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
import { SectionFooter } from "./SectionFooter";
import type { HealthAlert, PrefectStudent } from "@/lib/types";
import type { MutateResult, HealthSectionPayload } from "@/lib/hooks/useStudentExpediente";

const notesSchema = z.object({
  notes: z.string().max(2000, "Máximo 2000 caracteres").optional(),
  last_evaluation_date: z.string().optional(),
});

type NotesValues = z.infer<typeof notesSchema>;

const ALERT_TYPES = [
  { value: "medica", label: "Médica" },
  { value: "comportamental", label: "Comportamental" },
  { value: "academica", label: "Académica" },
  { value: "otra", label: "Otra" },
];

interface NotesSectionProps {
  student: PrefectStudent;
  onSave: (payload: HealthSectionPayload) => Promise<MutateResult>;
  /** Ausente en la ÚLTIMA sección (no hay a dónde avanzar). */
  onNext?: () => void;
  isSaving: boolean;
}

export function NotesSection({
  student,
  onSave,
  onNext,
  isSaving,
}: NotesSectionProps) {
  const h = student.health_inclusion;

  const [alerts, setAlerts] = useState<HealthAlert[]>(h?.alerts || []);
  // Draft del alta de alerta
  const [draftType, setDraftType] = useState("medica");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NotesValues>({
    resolver: zodResolver(notesSchema),
    defaultValues: {
      notes: h?.notes || "",
      last_evaluation_date: h?.last_evaluation_date
        ? String(h.last_evaluation_date).slice(0, 10)
        : "",
    },
  });

  const addAlert = () => {
    if (!draftLabel.trim()) return;
    setAlerts([
      ...alerts,
      {
        type: draftType,
        label: draftLabel.trim(),
        description: draftDescription.trim() || undefined,
      },
    ]);
    setDraftLabel("");
    setDraftDescription("");
  };

  const submit = (goNext: boolean) =>
    handleSubmit(async (data) => {
      const payload: HealthSectionPayload = {
        alerts,
        notes: data.notes?.trim() || null,
        last_evaluation_date: data.last_evaluation_date
          ? new Date(`${data.last_evaluation_date}T00:00:00`).toISOString()
          : null,
      };
      const result = await onSave(payload);
      if (result.success && goNext && onNext) onNext();
    });

  return (
    <Card>
      <CardBody>
        <form className="space-y-5" onSubmit={submit(false)}>
          {/* Alertas visibles para otros roles */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Alertas
              </h3>
              <p className="text-xs text-text-secondary">
                Se marcan en la ficha del alumno para maestros y prefectos.
              </p>
            </div>

            {alerts.length > 0 && (
              <ul className="space-y-2">
                {alerts.map((alert, i) => (
                  <li
                    key={`${alert.label}-${i}`}
                    className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2"
                  >
                    <span className="mt-0.5 inline-flex items-center rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      {(
                        ALERT_TYPES.find((t) => t.value === alert.type)?.label ||
                        "Otra"
                      ).toLowerCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary">
                        {alert.label}
                      </p>
                      {alert.description && (
                        <p className="text-xs text-text-secondary">
                          {alert.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAlerts(alerts.filter((_, j) => j !== i))
                      }
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Alta inline de alerta */}
            <div className="rounded-xl border border-border bg-slate-50/50 p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  label="Tipo"
                  options={ALERT_TYPES}
                  value={draftType}
                  onChange={(e) => setDraftType(e.target.value)}
                />
                <Input
                  label="Título"
                  placeholder="Ej. Alergia severa"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                />
                <Input
                  label="Detalle (opcional)"
                  placeholder="Qué debe saber…"
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addAlert}
                  disabled={!draftLabel.trim()}
                >
                  + Agregar alerta
                </Button>
              </div>
            </div>
          </div>

          {/* Notas libres */}
          <TextArea
            label="Notas"
            placeholder="Observaciones generales del seguimiento…"
            maxLength={2000}
            error={errors.notes?.message}
            {...register("notes")}
          />

          {/* Última evaluación */}
          <div className="sm:w-60">
            <Input
              label="Última fecha de evaluación"
              type="date"
              error={errors.last_evaluation_date?.message}
              {...register("last_evaluation_date")}
            />
          </div>

          <SectionFooter
            onSave={submit(false)}
            onNext={submit(true)}
            saveLabel="Guardar expediente"
            isSaving={isSaving}
          />
        </form>
      </CardBody>
    </Card>
  );
}
