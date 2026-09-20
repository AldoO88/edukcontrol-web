// Página de Turnos / Campanas (scoped por ciclo escolar)

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { api } from "@/lib/api";
import { ENDPOINTS, SHIFTS } from "@/lib/constants";
import type { SchoolShift } from "@/lib/types";
import { Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const shiftSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  shift: z.enum(["matutino", "vespertino"]),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:mm"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:mm"),
  moduleDurationMinutes: z.number().min(5).max(240),
  gracePeriodMinutes: z.number().min(0).max(120).optional(),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

export default function ShiftsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;
  const [shifts, setShifts] = useState<SchoolShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      moduleDurationMinutes: 50,
      gracePeriodMinutes: 30,
    },
  });

  const fetchShifts = async () => {
    try {
      const res = await api.get<SchoolShift[]>(
        `${ENDPOINTS.SCHOOL_SHIFTS}?school_year_id=${yearId}`
      );
      setShifts(res);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const onSubmit = async (data: ShiftFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(ENDPOINTS.SCHOOL_SHIFTS, {
        ...data,
        school: schoolId,
        school_year_id: yearId,
      });
      setIsModalOpen(false);
      reset();
      fetchShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el turno");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turnos"
        subtitle="Configuración de turnos y campanas"
        action={{
          label: "Nuevo Turno",
          onClick: () => setIsModalOpen(true),
        }}
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
      )}

      {shifts.length === 0 ? (
        <EmptyState
          icon={<Clock size={48} />}
          title="No hay turnos configurados"
          description="Crea un turno para comenzar a definir el horario de la escuela."
          action={{ label: "Crear Turno", onClick: () => setIsModalOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <Card key={shift._id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary">{shift.name}</h3>
                    <p className="text-sm text-text-secondary mt-1">
                      {shift.startTime} — {shift.endTime}
                    </p>
                    <p className="text-sm text-text-secondary">
                      Módulo: {shift.moduleDurationMinutes} min
                    </p>
                  </div>
                  <Badge variant={shift.isActive ? "emerald" : "slate"}>
                    {shift.shift === "matutino" ? "Matutino" : "Vespertino"}
                  </Badge>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Turno">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
          )}
          <Input
            label="Nombre"
            placeholder="Turno Matutino"
            error={errors.name?.message}
            {...register("name")}
          />
          <Select
            label="Tipo"
            options={[
              { value: "matutino", label: "Matutino" },
              { value: "vespertino", label: "Vespertino" },
            ]}
            error={errors.shift?.message}
            {...register("shift")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hora Inicio"
              type="time"
              error={errors.startTime?.message}
              {...register("startTime")}
            />
            <Input
              label="Hora Fin"
              type="time"
              error={errors.endTime?.message}
              {...register("endTime")}
            />
          </div>
          <Input
            label="Duración del Módulo (minutos)"
            type="number"
            error={errors.moduleDurationMinutes?.message}
            {...register("moduleDurationMinutes", { valueAsNumber: true })}
          />
          <Input
            label="Periodo de Gracia (minutos)"
            type="number"
            error={errors.gracePeriodMinutes?.message}
            {...register("gracePeriodMinutes", { valueAsNumber: true })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={isSubmitting}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
