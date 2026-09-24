// Modal reutilizable para crear un ciclo escolar.
// Incluye configuración de días lectivos y días no lectivos.

"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { SchoolYear } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, AlertTriangle } from "lucide-react";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const schoolYearSchema = z.object({
  name: z.string().regex(/^\d{4}-\d{4}$/, "Formato: YYYY-YYYY (ej. 2025-2026)"),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().min(1, "Fecha de fin requerida"),
});

type FormShape = z.infer<typeof schoolYearSchema>;

interface CreateSchoolYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (yearId: string) => void;
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
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const hasActiveYear = existingYears.some((y) => y.isActive);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormShape>({
    resolver: zodResolver(schoolYearSchema),
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");

  const toggleWorkingDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const onSubmit = async (data: FormShape) => {
    setError(null);

    if (hasActiveYear) {
      setError("Ya existe un ciclo activo. Cierra el ciclo actual antes de crear uno nuevo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newYear = await api.post<{ _id: string }>(ENDPOINTS.SCHOOL_YEARS, {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        school: schoolId,
        workingDays,
      });

      // Auto-mark non-working days as non_lectivo in the calendar
      const startParts = data.startDate.split("-").map(Number);
      const endParts = data.endDate.split("-").map(Number);
      let cy = startParts[0], cm = startParts[1] - 1, cd = startParts[2];
      const ey = endParts[0], em = endParts[1] - 1, ed = endParts[2];

      while (cy < ey || (cy === ey && cm < em) || (cy === ey && cm === em && cd <= ed)) {
        const dow = new Date(cy, cm, cd).getDay();
        if (!workingDays.includes(dow)) {
          const dateStr = `${cy}-${String(cm + 1).padStart(2, "0")}-${String(cd).padStart(2, "0")}`;
          await api.post(ENDPOINTS.SCHOOL_CALENDAR, {
            school: schoolId,
            school_year_id: newYear._id,
            date: dateStr,
            type: "non_lectivo",
          }).catch(() => {});
        }
        cd++;
        const daysInMonth = new Date(cy, cm + 1, 0).getDate();
        if (cd > daysInMonth) { cd = 1; cm++; if (cm > 11) { cm = 0; cy++; } }
      }

      setIsSubmitting(false);
      reset();
      setWorkingDays([1, 2, 3, 4, 5]);
      onCreated(newYear._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el ciclo");
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setWorkingDays([1, 2, 3, 4, 5]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo Ciclo Escolar" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

        <div className="grid grid-cols-2 gap-4">
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
        </div>

        {/* Días lectivos */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Días Lectivos
          </label>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleWorkingDay(i)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  workingDays.includes(i)
                    ? "bg-sky-500 text-white"
                    : "bg-slate-100 text-text-secondary hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-1.5">
            Los días no seleccionados se marcarán automáticamente como no lectivos en el calendario.
          </p>
        </div>

        {hasActiveYear && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 text-amber-700 text-sm">
            <AlertTriangle size={16} />
            Ya existe un ciclo activo. Cierra el ciclo actual antes de crear uno nuevo.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="sky" isLoading={isSubmitting} disabled={hasActiveYear}>
            {existingYears.length === 0 ? "Crear Primer Ciclo" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
