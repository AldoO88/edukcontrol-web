// Sección SALUD de la ficha de expediente.
// Guarda los campos clínicos + de inclusión vía PATCH
// /api/students/:id/health (whitelist del backend). Espejo de
// HealthTab.jsx de la app móvil: selectores de estilo de aprendizaje /
// discapacidad, condiciones y medicamentos como "chips" (estado local
// + input), autorizaciones como checkboxes.
// Regla de la app: si disability_type = "ninguna" se limpia la severidad.

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { SectionFooter } from "./SectionFooter";
import type { PrefectStudent } from "@/lib/types";
import type { MutateResult, HealthSectionPayload } from "@/lib/hooks/useStudentExpediente";

const healthSchema = z.object({
  learning_style: z.string().optional(),
  style_hint: z.string().max(500, "Máximo 500 caracteres").optional(),
  diagnosis: z.string().max(500, "Máximo 500 caracteres").optional(),
  disability_type: z.string().optional(),
  disability_severity: z.string().optional(),
  allergies: z.string().max(1000, "Máximo 1000 caracteres").optional(),
  health_insurance: z.string().max(100).optional(),
  vaccination_authorization: z.boolean().optional(),
  protection_civil_authorization: z.boolean().optional(),
});

type HealthValues = z.infer<typeof healthSchema>;

const LEARNING_STYLES = [
  { value: "", label: "Sin especificar" },
  { value: "visual", label: "Visual" },
  { value: "auditivo", label: "Auditivo" },
  { value: "kinestesico", label: "Kinestésico" },
  { value: "mixto", label: "Mixto" },
];

const DISABILITY_TYPES = [
  { value: "ninguna", label: "Ninguna" },
  { value: "cognitiva", label: "Cognitiva" },
  { value: "fisica", label: "Física" },
  { value: "sensorial", label: "Sensorial" },
  { value: "multiple", label: "Múltiple" },
];

const DISABILITY_SEVERITIES = [
  { value: "", label: "Sin especificar" },
  { value: "leve", label: "Leve" },
  { value: "moderada", label: "Moderada" },
  { value: "severa", label: "Severa" },
];

interface HealthSectionProps {
  student: PrefectStudent;
  onSave: (payload: HealthSectionPayload) => Promise<MutateResult>;
  onNext: () => void;
  isSaving: boolean;
}

// Editor de arreglos de strings (condiciones médicas / medicamentos).
function ChipList({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-text-primary">{label}</label>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <li
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 text-xs font-semibold"
            >
              {item}
              <button
                type="button"
                aria-label={`Quitar ${item}`}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-emerald-600 hover:text-emerald-900"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
        />
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          Agregar
        </Button>
      </div>
    </div>
  );
}

export function HealthSection({
  student,
  onSave,
  onNext,
  isSaving,
}: HealthSectionProps) {
  const h = student.health_inclusion;

  const [medicalConditions, setMedicalConditions] = useState<string[]>(
    h?.medical_conditions || []
  );
  const [medications, setMedications] = useState<string[]>(h?.medications || []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<HealthValues>({
    resolver: zodResolver(healthSchema),
    defaultValues: {
      learning_style: h?.learning_style || "",
      style_hint: h?.style_hint || "",
      diagnosis: h?.diagnosis || "",
      disability_type: h?.disability_type || "ninguna",
      disability_severity: h?.disability_severity || "",
      allergies: h?.allergies || "",
      health_insurance: h?.health_insurance || "",
      vaccination_authorization: !!h?.vaccination_authorization,
      protection_civil_authorization: !!h?.protection_civil_authorization,
    },
  });

  const disabilityType = watch("disability_type");

  const submit = (goNext: boolean) =>
    handleSubmit(async (data) => {
      const payload: HealthSectionPayload = {
        learning_style: data.learning_style || null,
        style_hint: data.style_hint?.trim() || null,
        diagnosis: data.diagnosis?.trim() || null,
        disability_type: data.disability_type || null,
        // Regla de la app: sin discapacidad → severidad limpiada.
        disability_severity:
          data.disability_type === "ninguna" ? null : data.disability_severity || null,
        medical_conditions: medicalConditions,
        medications: medications,
        allergies: data.allergies?.trim() || null,
        health_insurance: data.health_insurance?.trim() || null,
        vaccination_authorization: !!data.vaccination_authorization,
        protection_civil_authorization: !!data.protection_civil_authorization,
      };
      const result = await onSave(payload);
      if (result.success && goNext) onNext();
    });

  return (
    <Card>
      <CardBody>
        <form className="space-y-5" onSubmit={submit(false)}>
          {/* Estilo de aprendizaje */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Estilo de aprendizaje"
              options={LEARNING_STYLES}
              {...register("learning_style")}
            />
            <Input
              label="Diagnóstico principal"
              placeholder="Ej. TDAH, TEA, Discalculia…"
              error={errors.diagnosis?.message}
              {...register("diagnosis")}
            />
          </div>
          <TextArea
            label="Indicadores del estilo de aprendizaje"
            placeholder="Observaciones sobre cómo aprende mejor el alumno…"
            maxLength={500}
            error={errors.style_hint?.message}
            {...register("style_hint")}
          />

          {/* Discapacidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tipo de discapacidad"
              options={DISABILITY_TYPES}
              {...register("disability_type")}
            />
            <Select
              label="Severidad"
              options={DISABILITY_SEVERITIES}
              disabled={disabilityType === "ninguna" || !disabilityType}
              {...register("disability_severity")}
            />
          </div>

          {/* Salud */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Alergias y cuidados especiales"
              placeholder="Ej. Alergia al cacahuate…"
              error={errors.allergies?.message}
              {...register("allergies")}
            />
            <Input
              label="Derechohabiencia"
              placeholder="Ej. IMSS, ISSSTE, ninguno…"
              {...register("health_insurance")}
            />
          </div>

          <ChipList
            label="Condiciones médicas"
            items={medicalConditions}
            onChange={setMedicalConditions}
            placeholder="Ej. Asma, epilepsia…"
          />
          <ChipList
            label="Medicamentos actuales"
            items={medications}
            onChange={setMedications}
            placeholder="Ej. Metilfenidato 10 mg…"
          />

          {/* Autorizaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 border border-border p-4">
            <Checkbox
              label="Autorización de vacunación"
              description="El alumno puede recibir vacunas en la escuela"
              {...register("vaccination_authorization")}
            />
            <Checkbox
              label="Autorización Protección Civil"
              description="Participación en actividades de Protección Civil"
              {...register("protection_civil_authorization")}
            />
          </div>

          <SectionFooter
            onSave={submit(false)}
            onNext={submit(true)}
            isSaving={isSaving}
          />
        </form>
      </CardBody>
    </Card>
  );
}
