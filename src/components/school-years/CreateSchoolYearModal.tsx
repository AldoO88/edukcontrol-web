// Modal reutilizable para crear un ciclo escolar.
// Extraído de school-years/page.tsx para poder reusarlo desde el overview de escuela.

"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { SchoolYear, ShiftTemplate } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const WEEKDAYS = [
  { value: 0, short: "Dom", long: "Domingo" },
  { value: 1, short: "Lun", long: "Lunes" },
  { value: 2, short: "Mar", long: "Martes" },
  { value: 3, short: "Mié", long: "Miércoles" },
  { value: 4, short: "Jue", long: "Jueves" },
  { value: 5, short: "Vie", long: "Viernes" },
  { value: 6, short: "Sáb", long: "Sábado" },
];

const schoolYearSchema = z.object({
  name: z.string().regex(/^\d{4}-\d{4}$/, "Formato: YYYY-YYYY (ej. 2025-2026)"),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().min(1, "Fecha de fin requerida"),
  cloneFromPrevious: z.boolean().optional(),
  copyShiftTemplates: z.boolean().optional(),
  nonLectivoWeekdays: z.array(z.number().min(0).max(6)).optional(),
});

type FormShape = {
  name: string;
  startDate: string;
  endDate: string;
  cloneFromPrevious?: boolean;
  copyShiftTemplates?: boolean;
  nonLectivoWeekdays?: number[];
};

function NonLectivoSelector({ value, onChange }: { value: number[]; onChange: (next: number[]) => void }) {
  const toggle = (day: number) => {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day].sort());
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-text-primary mb-1">
        Días no lectivos
      </p>
      <p className="text-xs text-text-secondary mb-2">
        Marca los días de la semana en que NO se imparten clases. Si no
        marcas ninguno, todos los días se consideran lectivos (pero el
        sistema solo marca ausencias automáticamente de lunes a viernes).
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => {
          const isChecked = value.includes(d.value);
          return (
            <label
              key={d.value}
              className={`flex flex-col items-center gap-1 cursor-pointer p-2 border rounded-lg transition-colors ${
                isChecked
                  ? "bg-amber-50 border-amber-300"
                  : "border-border hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(d.value)}
                className="accent-amber-600"
              />
              <span
                className={`text-xs font-semibold ${
                  isChecked ? "text-amber-700" : "text-text-secondary"
                }`}
              >
                {d.short}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

interface CreateSchoolYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  schoolId: string;
  existingYears: SchoolYear[];
}

export function CreateSchoolYearModal({
  isOpen,
  onClose,
  onCreated,
  schoolId,
  existingYears,
}: CreateSchoolYearModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormShape>({
    resolver: zodResolver(schoolYearSchema),
    defaultValues: {
      cloneFromPrevious: true,
      copyShiftTemplates: true,
      nonLectivoWeekdays: [],
    },
  });

  const nonLectivoWeekdays = watch("nonLectivoWeekdays") || [];
  const showCloneOption = existingYears.length > 0;

  const onSubmit = async (data: FormShape) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const newYear = await api.post<{ _id: string }>(ENDPOINTS.SCHOOL_YEARS, {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        school: schoolId,
      });

      if (data.cloneFromPrevious && existingYears.length > 0) {
        try {
          await api.post(`/api/school-years/${newYear._id}/clone`, {
            sourceSchoolYearId: existingYears[0]._id,
          });
        } catch {
          // Clonación falla silenciosamente
        }
      }

      if (data.nonLectivoWeekdays && data.nonLectivoWeekdays.length > 0) {
        try {
          await api.post(ENDPOINTS.SCHOOL_CALENDAR_WEEKENDS, {
            school_year_id: newYear._id,
            weekdays: data.nonLectivoWeekdays,
          });
        } catch {
          console.warn("[CreateSchoolYearModal] Failed to mark non-lectivo days");
        }
      }

      // Copiar plantillas de turnos al nuevo ciclo
      if (data.copyShiftTemplates) {
        try {
          const templatesRes = await api.get<{ items: ShiftTemplate[] }>(ENDPOINTS.SHIFT_TEMPLATES);
          const templates = templatesRes.items || [];
          for (const tpl of templates) {
            await api.post(ENDPOINTS.SCHOOL_SHIFTS, {
              school_year_id: newYear._id,
              name: tpl.name,
              shift: tpl.shift,
              startTime: tpl.startTime,
              endTime: tpl.endTime,
              moduleDurationMinutes: tpl.moduleDurationMinutes,
              gracePeriodMinutes: tpl.gracePeriodMinutes,
              timeBlocks: tpl.timeBlocks.map((b) => ({
                name: b.name,
                startTime: b.startTime,
                endTime: b.endTime,
                isBreak: b.isBreak,
              })),
              school: schoolId,
            });
          }
        } catch {
          console.warn("[CreateSchoolYearModal] Failed to copy shift templates");
        }
      }

      setIsSubmitting(false);
      reset();
      onClose();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el ciclo");
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo Ciclo Escolar">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-error-light text-error text-sm">
            {error}
          </div>
        )}
        <Input
          label="Nombre"
          placeholder="2025-2026"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Fecha de Inicio"
          type="date"
          error={errors.startDate?.message}
          {...register("startDate")}
        />
        <Input
          label="Fecha de Fin"
          type="date"
          error={errors.endDate?.message}
          {...register("endDate")}
        />

        <div className="pt-1">
          <NonLectivoSelector
            value={nonLectivoWeekdays}
            onChange={(next) => setValue("nonLectivoWeekdays", next)}
          />
        </div>

        {showCloneOption && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded border-border text-accent focus:ring-accent"
              {...register("cloneFromPrevious")}
            />
            <span>Clonar configuración del ciclo anterior</span>
          </label>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="rounded border-border text-accent focus:ring-accent"
            {...register("copyShiftTemplates")}
          />
          <span>Copiar turnos desde plantillas</span>
        </label>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="sky" isLoading={isSubmitting}>
            {existingYears.length === 0 ? "Crear Primer Ciclo" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
