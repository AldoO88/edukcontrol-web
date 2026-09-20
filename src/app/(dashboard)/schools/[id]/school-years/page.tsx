// Página de Ciclos Escolares de una escuela

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { SchoolYear } from "@/lib/types";
import { Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schoolYearSchema = z.object({
  name: z.string().regex(/^\d{4}-\d{4}$/, "Formato: YYYY-YYYY (ej. 2025-2026)"),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().min(1, "Fecha de fin requerida"),
  cloneFromPrevious: z.boolean().optional(),
});

type SchoolYearFormData = z.infer<typeof schoolYearSchema>;

export default function SchoolYearsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchoolYearFormData>({
    resolver: zodResolver(schoolYearSchema),
    defaultValues: {
      cloneFromPrevious: true,
    },
  });

  const fetchYears = async () => {
    try {
      const res = await api.get<{ items: SchoolYear[] }>(
        `${ENDPOINTS.SCHOOL_YEARS}?school=${schoolId}`
      );
      setYears(res.items);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const onSubmit = async (data: SchoolYearFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const newYear = await api.post<{ _id: string }>(ENDPOINTS.SCHOOL_YEARS, {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        school: schoolId,
      });

      // Si pidió clonar del anterior, hacerlo
      if (data.cloneFromPrevious && years.length > 0) {
        const previousYear = years[0]; // El más reciente
        try {
          await api.post(`/api/school-years/${newYear._id}/clone`, {
            sourceSchoolYearId: previousYear._id,
          });
        } catch {
          // La clonación falla silenciosamente, el ciclo ya se creó
        }
      }

      setIsModalOpen(false);
      reset();
      fetchYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el ciclo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await api.post(ENDPOINTS.SCHOOL_YEAR_ACTIVATE(id));
      fetchYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al activar el ciclo");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // Si no hay ciclos, mostrar wizard de primer ciclo
  if (years.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<Calendar size={48} />}
          title="No hay ciclos escolares"
          description="Crea tu primer ciclo escolar para comenzar a configurar la escuela."
          action={{ label: "Crear Primer Ciclo", onClick: () => setIsModalOpen(true) }}
        />

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Ciclo Escolar">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
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
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="sky" isLoading={isSubmitting}>
                Crear Ciclo
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ciclos Escolares"
        subtitle="Gestión de ciclos académicos"
        action={{
          label: "Nuevo Ciclo",
          onClick: () => setIsModalOpen(true),
        }}
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {years.map((year) => (
          <Card key={year._id}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-text-primary text-lg">{year.name}</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    {new Date(year.startDate).toLocaleDateString("es-MX")} —{" "}
                    {new Date(year.endDate).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <Badge variant={year.isActive ? "emerald" : "slate"}>
                  {year.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <div className="mt-4 flex gap-2">
                {!year.isActive && (
                  <Button
                    variant="sky"
                    size="sm"
                    onClick={() => handleActivate(year._id)}
                  >
                    Activar
                  </Button>
                )}
                <Link
                  href={`/schools/${schoolId}/school-years/${year._id}`}
                  className="text-sm text-accent-dark hover:text-accent font-medium"
                >
                  Configurar →
                </Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Ciclo Escolar">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
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
          {years.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded border-border text-accent focus:ring-accent"
                {...register("cloneFromPrevious")}
              />
              <span>Clonar configuración del ciclo anterior</span>
            </label>
          )}
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
