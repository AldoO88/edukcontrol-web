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
import { Plus, Trash2, Calendar, AlertTriangle } from "lucide-react";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const schoolYearSchema = z.object({
  name: z.string().regex(/^\d{4}-\d{4}$/, "Formato: YYYY-YYYY (ej. 2025-2026)"),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().min(1, "Fecha de fin requerida"),
});

type FormShape = z.infer<typeof schoolYearSchema>;

interface NonSchoolDay {
  date: string;
  type: "holiday" | "vacation" | "suspension";
  name: string;
}

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
  const [nonSchoolDays, setNonSchoolDays] = useState<NonSchoolDay[]>([]);

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

  const addNonSchoolDay = () => {
    setNonSchoolDays((prev) => [
      ...prev,
      { date: "", type: "holiday", name: "" },
    ]);
  };

  const updateNonSchoolDay = (
    index: number,
    field: keyof NonSchoolDay,
    value: string
  ) => {
    setNonSchoolDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  const removeNonSchoolDay = (index: number) => {
    setNonSchoolDays((prev) => prev.filter((_, i) => i !== index));
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

      // Save non-school days to SchoolCalendar
      const validDays = nonSchoolDays.filter((d) => d.date);
      for (const day of validDays) {
        await api.post(ENDPOINTS.SCHOOL_CALENDAR, {
          school_year_id: newYear._id,
          date: day.date,
          type: day.type,
          name: day.name || undefined,
        }).catch(() => {});
      }

      setIsSubmitting(false);
      reset();
      setWorkingDays([1, 2, 3, 4, 5]);
      setNonSchoolDays([]);
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
    setNonSchoolDays([]);
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
            Selecciona los días de la semana que son lectivos.
          </p>
        </div>

        {/* Días no lectivos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-text-primary">
              Días No Lectivos
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addNonSchoolDay}
            >
              <Plus size={14} className="mr-1" />
              Agregar
            </Button>
          </div>

          {nonSchoolDays.length === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 text-text-muted text-sm">
              <Calendar size={16} />
              Sin días no lectivos registrados.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {nonSchoolDays.map((day, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-xl border border-border bg-white"
                >
                  <Input
                    type="date"
                    value={day.date}
                    onChange={(e) =>
                      updateNonSchoolDay(index, "date", e.target.value)
                    }
                    className="flex-1"
                  />
                  <select
                    value={day.type}
                    onChange={(e) =>
                      updateNonSchoolDay(index, "type", e.target.value)
                    }
                    className="px-3 py-2 rounded-xl border border-border text-sm bg-white"
                  >
                    <option value="holiday">Festivo</option>
                    <option value="vacation">Receso</option>
                    <option value="suspension">Suspensión</option>
                  </select>
                  <Input
                    placeholder="Nombre (opc.)"
                    value={day.name}
                    onChange={(e) =>
                      updateNonSchoolDay(index, "name", e.target.value)
                    }
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeNonSchoolDay(index)}
                    className="p-2 text-text-muted hover:text-error transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
