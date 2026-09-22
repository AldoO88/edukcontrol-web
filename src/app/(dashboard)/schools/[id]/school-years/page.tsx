// Página de Ciclos Escolares de una escuela

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { SchoolYear } from "@/lib/types";
import { Calendar, XCircle } from "lucide-react";
import { CreateSchoolYearModal } from "@/components/school-years/CreateSchoolYearModal";

export default function SchoolYearsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleActivate = async (id: string) => {
    try {
      await api.post(ENDPOINTS.SCHOOL_YEAR_ACTIVATE(id));
      fetchYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al activar el ciclo");
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await api.post(ENDPOINTS.SCHOOL_YEAR_DEACTIVATE(id));
      fetchYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cerrar el ciclo");
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando..." height="page" />;
  }

  if (years.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<Calendar size={48} />}
          title="No hay ciclos escolares"
          description="Crea tu primer ciclo escolar para comenzar a configurar la escuela."
          action={{ label: "Crear Primer Ciclo", onClick: () => setIsModalOpen(true) }}
        />
        <CreateSchoolYearModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={() => fetchYears()}
          schoolId={schoolId}
          existingYears={years}
        />
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
                {year.isActive ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeactivate(year._id)}
                  >
                    <XCircle size={14} className="mr-1" />
                    Cerrar Ciclo
                  </Button>
                ) : (
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

      <CreateSchoolYearModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => fetchYears()}
        schoolId={schoolId}
        existingYears={years}
      />
    </div>
  );
}
