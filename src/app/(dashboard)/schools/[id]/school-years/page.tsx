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
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
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

// Días de la semana en formato JavaScript (0=Domingo..6=Sábado)
// para que coincida con el formato de getDay() en el backend.
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
  // Array opcional de weekdays (0..6) marcados como no lectivos.
  // El usuario marca/desmarca los 7 toggles en el formulario.
  nonLectivoWeekdays: z.array(z.number().min(0).max(6)).optional(),
});

type SchoolYearFormData = z.infer<typeof schoolYearSchema>;

// FormData payload para el submit (mapea el array a un Set<string>).
// Usamos watch con el array del form para detectar cambios.
type FormShape = {
  name: string;
  startDate: string;
  endDate: string;
  cloneFromPrevious?: boolean;
  nonLectivoWeekdays?: number[];
};

function NonLectivoSelector({ value, onChange }: {
  value: number[];
  onChange: (next: number[]) => void;
}) {
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
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormShape>({
    resolver: zodResolver(schoolYearSchema),
    defaultValues: {
      cloneFromPrevious: true,
      nonLectivoWeekdays: [],
    },
  });

  const nonLectivoWeekdays = watch("nonLectivoWeekdays") || [];

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

      // Si pidió clonar del anterior, hacerlo
      if (data.cloneFromPrevious && years.length > 0) {
        const previousYear = years[0];
        try {
          await api.post(`/api/school-years/${newYear._id}/clone`, {
            sourceSchoolYearId: previousYear._id,
          });
        } catch {
          // La clonación falla silenciosamente, el ciclo ya se creó
        }
      }

      // Si marcó días no lectivos, crearlos como non_lectivo en el calendario.
      // El backend AGREGA (no sobrescribe); entries existentes con type distinto
      // se mantienen. Para borrarlos, hay que hacerlo manualmente desde el
      // calendar UI.
      if (data.nonLectivoWeekdays && data.nonLectivoWeekdays.length > 0) {
        try {
          await api.post(ENDPOINTS.SCHOOL_CALENDAR_WEEKENDS, {
            school_year_id: newYear._id,
            weekdays: data.nonLectivoWeekdays,
          });
        } catch (calErr) {
          // El ciclo ya está creado. Log warning, no romper el flow.
          // El user puede re-disparar desde la UI del ciclo.
          console.warn(
            "[school-years] Failed to mark non-lectivo days:",
            calErr
          );
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
    return <LoadingState message="Cargando..." height="page" />;
  }

  const renderForm = (showCloneOption: boolean) => (
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

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" variant="sky" isLoading={isSubmitting}>
          {years.length === 0 ? "Crear Primer Ciclo" : "Crear"}
        </Button>
      </div>
    </form>
  );

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
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Nuevo Ciclo Escolar"
        >
          {renderForm(false)}
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
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {years.map((year) => (
          <Card
            key={year._id}
            className={
              year.isActive
                ? "ring-2 ring-emerald-500 border-emerald-200 shadow-sm"
                : ""
            }
          >
            <CardBody>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-text-primary text-lg">
                      {year.name}
                    </h3>
                    {year.isActive && (
                      <Badge variant="emerald">Activo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    {new Date(year.startDate).toLocaleDateString("es-MX")} —{" "}
                    {new Date(year.endDate).toLocaleDateString("es-MX")}
                  </p>
                </div>
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
                  className="text-sm text-accent-dark hover:text-accent font-medium ml-auto flex items-center"
                >
                  Configurar
                  <span className="ml-1">→</span>
                </Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Ciclo Escolar"
      >
        {renderForm(true)}
      </Modal>
    </div>
  );
}
