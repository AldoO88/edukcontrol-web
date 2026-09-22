// Página de Talleres a nivel Escuela
// Muestra las ofertas de talleres (definidas en materias tipo WORKSHOP)
// y los Group(type:"taller") activos del ciclo.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { SchoolYear } from "@/lib/types";
import { Hammer, ChevronLeft, Users } from "lucide-react";

interface WorkshopOffering {
  name: string;
}

interface WorkshopSubject {
  _id: string;
  name: string;
  code: string;
  color?: string;
  icon?: string;
  workshops: WorkshopOffering[];
}

interface TallerGroup {
  _id: string;
  grade: number;
  section: string;
  shift: string;
  head_teacher_id?: { name: string; last_name: string };
  school_year_id: string;
  studentCount: number;
}

interface WorkshopsData {
  offerings: WorkshopSubject[];
  groups: TallerGroup[];
}

export default function SchoolWorkshopsPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [data, setData] = useState<WorkshopsData | null>(null);
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState("");

  const fetchData = async () => {
    try {
      const [workshopsRes, yearsRes] = await Promise.all([
        api.get<WorkshopsData>(
          yearFilter
            ? `${ENDPOINTS.DASHBOARD_WORKSHOPS(schoolId)}?yearId=${yearFilter}`
            : ENDPOINTS.DASHBOARD_WORKSHOPS(schoolId)
        ),
        api.get<{ items: SchoolYear[] }>(
          `${ENDPOINTS.SCHOOL_YEARS}?school=${schoolId}`
        ),
      ]);
      setData(workshopsRes);
      setYears(yearsRes.items || []);
    } catch {
      setError("Error al cargar los talleres.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId, yearFilter]);

  if (isLoading) {
    return <LoadingState message="Cargando talleres..." height="page" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: fetchData }}
      />
    );
  }

  const yearOptions = [
    { value: "", label: "Ciclo activo" },
    ...years.map((y) => ({ value: y._id, label: y.name })),
  ];

  const offerings = data?.offerings || [];
  const groups = data?.groups || [];

  // Agrupar grupos por grado
  const groupsByGrade: Record<number, TallerGroup[]> = {};
  for (const g of groups) {
    if (!groupsByGrade[g.grade]) groupsByGrade[g.grade] = [];
    groupsByGrade[g.grade].push(g);
  }

  const hasOfferings = offerings.length > 0;
  const hasGroups = groups.length > 0;

  return (
    <div className="space-y-6">
      <Link
        href={`/schools/${schoolId}`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent-dark transition-colors"
      >
        <ChevronLeft size={16} />
        Volver a Escuela
      </Link>

      <PageHeader
        title="Talleres"
        subtitle={
          hasGroups
            ? `${groups.length} grupo${groups.length !== 1 ? "s" : ""} taller activo${groups.length !== 1 ? "s" : ""}`
            : "Ofertas de talleres de la escuela"
        }
      />

      {/* Filtro de ciclo */}
      {years.length > 0 && (
        <Card>
          <CardBody>
            <div className="w-full sm:w-48">
              <Select
                options={yearOptions}
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Ofertas de talleres (definidas en materias) */}
      {hasOfferings && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-text-primary">
            Ofertas de Talleres
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offerings.map((subject) => (
              <Card key={subject._id}>
                <CardBody>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-xl shrink-0">
                      <Hammer size={18} className="text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-text-primary truncate">
                        {subject.name}
                      </h4>
                      <p className="text-sm text-text-secondary">{subject.code}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {subject.workshops.map((w, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"
                      >
                        {w.name}
                      </span>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Grupos taller activos */}
      {hasGroups && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-text-primary">
            Grupos Talleres Activos
          </h3>
          {[1, 2, 3]
            .filter((grade) => groupsByGrade[grade])
            .map((grade) => (
              <div key={grade} className="space-y-2">
                <h4 className="text-sm font-semibold text-text-secondary">
                  {grade}° Grado
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groupsByGrade[grade].map((group) => (
                    <Card key={group._id}>
                      <CardBody>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-9 h-9 bg-orange-50 rounded-lg shrink-0">
                              <Hammer size={16} className="text-orange-600" />
                            </div>
                            <div>
                              <h5 className="font-semibold text-text-primary text-sm">
                                {group.section}
                              </h5>
                              {group.head_teacher_id && (
                                <p className="text-xs text-text-muted">
                                  {group.head_teacher_id.name}{" "}
                                  {group.head_teacher_id.last_name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Users size={12} />
                            <span>{group.studentCount}</span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Empty state */}
      {!hasOfferings && !hasGroups && (
        <EmptyState
          icon={<Hammer size={48} />}
          title="No hay talleres configurados"
          description="Define los talleres en el catálogo de Materias (clasificación 'Taller') y luego crea los grupos en el ciclo escolar."
        />
      )}
    </div>
  );
}
