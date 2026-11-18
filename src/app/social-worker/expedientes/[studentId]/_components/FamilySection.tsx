// Sección FAMILIA de la ficha de expediente.
// Guarda `family_socioeconomic` (merge profundo en el backend) vía
// PATCH /api/students/:id/health. react-hook-form para los campos
// escalares + useFieldArray para los miembros del hogar.
// Espejo de FamilyTab.jsx de la app móvil.

"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { SectionFooter } from "./SectionFooter";
import type { PrefectStudent } from "@/lib/types";
import type { MutateResult, HealthSectionPayload } from "@/lib/hooks/useStudentExpediente";

// Miembro del hogar — age como string en el form (input text/number
// con "" vacío); se convierte a number al armar el payload.
const familySchema = z.object({
  family_dynamics: z.string().max(2000, "Máximo 2000 caracteres").optional(),
  monthly_income: z.string().max(100).optional(),
  income_sources: z.string().max(1000).optional(),
  housing_type: z.string().max(100).optional(),
  housing_materials: z.string().max(500).optional(),
  basic_services: z.string().max(500).optional(),
  family_members: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Nombre requerido"),
        relationship: z.string().max(100).optional(),
        age: z
          .string()
          .regex(/^\d{0,3}$/, "Solo números")
          .optional(),
        occupation: z.string().max(200).optional(),
        education_level: z.string().max(100).optional(),
      })
    )
    .optional(),
});

type FamilyValues = z.infer<typeof familySchema>;

interface FamilySectionProps {
  student: PrefectStudent;
  onSave: (payload: HealthSectionPayload) => Promise<MutateResult>;
  onNext: () => void;
  isSaving: boolean;
}

export function FamilySection({
  student,
  onSave,
  onNext,
  isSaving,
}: FamilySectionProps) {
  const fam = student.health_inclusion?.family_socioeconomic;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FamilyValues>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      family_dynamics: fam?.family_dynamics || "",
      monthly_income: fam?.monthly_income || "",
      income_sources: fam?.income_sources || "",
      housing_type: fam?.housing_type || "",
      housing_materials: fam?.housing_materials || "",
      basic_services: fam?.basic_services || "",
      family_members: (fam?.family_members || []).map((m) => ({
        name: m.name || "",
        relationship: m.relationship || "",
        age: m.age !== undefined && m.age !== null ? String(m.age) : "",
        occupation: m.occupation || "",
        education_level: m.education_level || "",
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "family_members",
  });

  const submit = (goNext: boolean) =>
    handleSubmit(async (data) => {
      const payload: HealthSectionPayload = {
        family_socioeconomic: {
          family_dynamics: data.family_dynamics?.trim() || null,
          monthly_income: data.monthly_income?.trim() || null,
          income_sources: data.income_sources?.trim() || null,
          housing_type: data.housing_type?.trim() || null,
          housing_materials: data.housing_materials?.trim() || null,
          basic_services: data.basic_services?.trim() || null,
          family_members: (data.family_members || [])
            .filter((m) => m.name.trim())
            .map((m) => ({
              name: m.name.trim(),
              relationship: m.relationship?.trim() || undefined,
              age: m.age ? Number(m.age) : undefined,
              occupation: m.occupation?.trim() || undefined,
              education_level: m.education_level?.trim() || undefined,
            })),
        },
      };
      const result = await onSave(payload);
      if (result.success && goNext) onNext();
    });

  return (
    <Card>
      <CardBody>
        <form className="space-y-5" onSubmit={submit(false)}>
          {/* Miembros del hogar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Miembros del hogar
                </h3>
                <p className="text-xs text-text-secondary">
                  Personas que viven con el alumno.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  append({
                    name: "",
                    relationship: "",
                    age: "",
                    occupation: "",
                    education_level: "",
                  })
                }
              >
                + Agregar
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-text-secondary italic">
                Sin miembros registrados.
              </p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-xl border border-border p-3 space-y-3 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted">
                      Miembro {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Nombre"
                      placeholder="Nombre completo"
                      error={errors.family_members?.[index]?.name?.message}
                      {...register(`family_members.${index}.name`)}
                    />
                    <Input
                      label="Parentesco"
                      placeholder="Madre, padre, abuelo…"
                      {...register(`family_members.${index}.relationship`)}
                    />
                    <Input
                      label="Edad"
                      type="number"
                      min={0}
                      max={120}
                      placeholder="Ej. 38"
                      error={errors.family_members?.[index]?.age?.message}
                      {...register(`family_members.${index}.age`)}
                    />
                    <Input
                      label="Ocupación"
                      placeholder="Ej. Docente"
                      {...register(`family_members.${index}.occupation`)}
                    />
                    <Input
                      label="Escolaridad"
                      placeholder="Ej. Secundaria"
                      {...register(`family_members.${index}.education_level`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dinámica familiar */}
          <TextArea
            label="Dinámica familiar"
            placeholder="Describe la convivencia, roles y situaciones relevantes del hogar…"
            maxLength={2000}
            error={errors.family_dynamics?.message}
            {...register("family_dynamics")}
          />

          {/* Economía del hogar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Ingreso mensual aproximado"
              placeholder="Ej. $8,000"
              {...register("monthly_income")}
            />
            <Input
              label="Fuentes de ingreso"
              placeholder="Ej. Sueldo, negocio propio…"
              {...register("income_sources")}
            />
          </div>

          {/* Vivienda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tipo de vivienda"
              placeholder="Ej. Renta, propia, prestada…"
              {...register("housing_type")}
            />
            <Input
              label="Materiales de construcción"
              placeholder="Ej. Concreto, lámina…"
              {...register("housing_materials")}
            />
          </div>
          <Input
            label="Servicios básicos"
            placeholder="Ej. Agua, luz, drenaje, internet…"
            {...register("basic_services")}
          />

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
