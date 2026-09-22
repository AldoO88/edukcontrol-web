// Modal reutilizable para crear un ciclo escolar.
// Solo crea el año. La configuración (turnos, grupos, etc.) se hace en el ConfigWizard.

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormShape>({
    resolver: zodResolver(schoolYearSchema),
  });

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

      setIsSubmitting(false);
      reset();
      onCreated(newYear._id);
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
