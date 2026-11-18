// Sección EMERGENCIA de la ficha de expediente.
// Guarda `emergency_contacts` (arreglo — el backend lo REEMPLAZA
// completo) vía PATCH /api/students/:id/health. useFieldArray para la
// lista de contactos con "principal" como radio. Espejo de
// EmergencyContactsTab.jsx de la app móvil.

"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SectionFooter } from "./SectionFooter";
import type { PrefectStudent } from "@/lib/types";
import type { MutateResult, HealthSectionPayload } from "@/lib/hooks/useStudentExpediente";

const emergencySchema = z.object({
  emergency_contacts: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Nombre requerido"),
        phone: z
          .string()
          .trim()
          .regex(/^[\d\s+()-]*$/, "Teléfono inválido")
          .min(7, "Teléfono muy corto"),
        relationship: z.string().max(100).optional(),
        is_primary: z.boolean().optional(),
      })
    )
    .optional(),
});

type EmergencyValues = z.infer<typeof emergencySchema>;

interface EmergencySectionProps {
  student: PrefectStudent;
  onSave: (payload: HealthSectionPayload) => Promise<MutateResult>;
  onNext: () => void;
  isSaving: boolean;
}

export function EmergencySection({
  student,
  onSave,
  onNext,
  isSaving,
}: EmergencySectionProps) {
  const contacts = student.health_inclusion?.emergency_contacts || [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmergencyValues>({
    resolver: zodResolver(emergencySchema),
    defaultValues: {
      emergency_contacts: contacts.map((c) => ({
        name: c.name || "",
        phone: c.phone || "",
        relationship: c.relationship || "",
        is_primary: !!c.is_primary,
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "emergency_contacts",
  });

  // "Principal" es exclusivo: al marcar uno se desmarcan los demás.
  const setPrimary = (index: number) => {
    fields.forEach((_, i) =>
      setValue(`emergency_contacts.${i}.is_primary`, i === index, {
        shouldDirty: true,
      })
    );
  };

  const submit = (goNext: boolean) =>
    handleSubmit(async (data) => {
      const payload: HealthSectionPayload = {
        emergency_contacts: (data.emergency_contacts || [])
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name.trim(),
            phone: c.phone.trim(),
            relationship: c.relationship?.trim() || undefined,
            is_primary: !!c.is_primary,
          })),
      };
      const result = await onSave(payload);
      if (result.success && goNext) onNext();
    });

  return (
    <Card>
      <CardBody>
        <form className="space-y-5" onSubmit={submit(false)}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Contactos de emergencia
              </h3>
              <p className="text-xs text-text-secondary">
                A quién se le llama primero si algo le pasa al alumno.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                append({ name: "", phone: "", relationship: "", is_primary: false })
              }
            >
              + Agregar
            </Button>
          </div>

          {fields.length === 0 && (
            <p className="text-sm text-text-secondary italic">
              Sin contactos registrados.
            </p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => {
              const isPrimary = watch(`emergency_contacts.${index}.is_primary`);
              return (
                <div
                  key={field.id}
                  className={`rounded-xl border p-3 space-y-3 ${
                    isPrimary
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-border bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!isPrimary}
                        onChange={() => setPrimary(index)}
                        className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-600/40"
                      />
                      <span className="text-xs font-semibold text-text-primary">
                        Contacto principal
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Nombre"
                      placeholder="Nombre completo"
                      error={errors.emergency_contacts?.[index]?.name?.message}
                      {...register(`emergency_contacts.${index}.name`)}
                    />
                    <Input
                      label="Teléfono"
                      type="tel"
                      placeholder="10 dígitos"
                      error={errors.emergency_contacts?.[index]?.phone?.message}
                      {...register(`emergency_contacts.${index}.phone`)}
                    />
                    <Input
                      label="Parentesco"
                      placeholder="Ej. Madre, tío…"
                      {...register(`emergency_contacts.${index}.relationship`)}
                    />
                  </div>
                </div>
              );
            })}
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
