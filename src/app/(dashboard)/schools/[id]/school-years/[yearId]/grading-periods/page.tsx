// Página de Períodos de Evaluación (scoped por ciclo escolar)

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { GradingPeriod } from "@/lib/types";
import { TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const periodSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  order: z.number().min(0, "Orden debe ser 0 o mayor"),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().min(1, "Fecha de fin requerida"),
});

type PeriodFormData = z.infer<typeof periodSchema>;

export default function GradingPeriodsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;
  const [periods, setPeriods] = useState<GradingPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PeriodFormData>({
    resolver: zodResolver(periodSchema),
  });

  const fetchPeriods = async () => {
    try {
      const res = await api.get<GradingPeriod[]>(
        `${ENDPOINTS.GRADING_PERIODS}?school_year_id=${yearId}`
      );
      setPeriods(res);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const onSubmit = async (data: PeriodFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(ENDPOINTS.GRADING_PERIODS, {
        ...data,
        school: schoolId,
        school_year_id: yearId,
      });
      setIsModalOpen(false);
      reset();
      fetchPeriods();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el período");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando..." height="page" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Períodos de Evaluación"
        subtitle="Configuración de períodos del ciclo"
        action={{
          label: "Nuevo Período",
          onClick: () => setIsModalOpen(true),
        }}
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
      )}

      {periods.length === 0 ? (
        <EmptyState
          icon={<TrendingUp size={48} />}
          title="No hay períodos configurados"
          description="Crea períodos de evaluación (trimestres, bimestres, etc.)."
          action={{ label: "Crear Período", onClick: () => setIsModalOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {periods.map((period) => (
            <Card key={period._id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary">{period.name}</h3>
                    <p className="text-sm text-text-secondary mt-1">
                      {period.startDate.split("-").reverse().join("/")} —{" "}
                      {period.endDate.split("-").reverse().join("/")}
                    </p>
                    <p className="text-sm text-text-secondary">
                      Orden: {period.order}
                    </p>
                  </div>
                  <Badge variant={period.isClosed ? "rose" : "emerald"}>
                    {period.isClosed ? "Cerrado" : "Abierto"}
                  </Badge>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Período">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
          )}
          <Input
            label="Nombre"
            placeholder="Primer Trimestre"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Orden"
            type="number"
            error={errors.order?.message}
            {...register("order", { valueAsNumber: true })}
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
