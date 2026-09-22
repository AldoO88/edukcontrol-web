// Página de Grupos a nivel Escuela
// Lista todos los grupos de la escuela (puede filtrar por ciclo).

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Group, SchoolYear } from "@/lib/types";
import { ClipboardList, Search, ChevronLeft } from "lucide-react";

export default function SchoolGroupsPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [groups, setGroups] = useState<Group[]>([]);
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const fetchData = async () => {
    try {
      const [groupsRes, yearsRes] = await Promise.all([
        api.get<{ items: Group[] }>(
          yearFilter
            ? `${ENDPOINTS.DASHBOARD_GROUPS(schoolId)}?yearId=${yearFilter}`
            : ENDPOINTS.DASHBOARD_GROUPS(schoolId)
        ),
        api.get<{ items: SchoolYear[] }>(
          `${ENDPOINTS.SCHOOL_YEARS}?school=${schoolId}`
        ),
      ]);
      setGroups(groupsRes.items || []);
      setYears(yearsRes.items || []);
    } catch {
      setError("Error al cargar los grupos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId, yearFilter]);

  if (isLoading) {
    return <LoadingState message="Cargando grupos..." height="page" />;
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

  const filtered = groups.filter((g) => {
    // Excluir grupos tipo taller — se gestionan en /workshops
    if (g.type === "taller") return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const gradeStr = `${g.grade}° ${g.section}`;
    return gradeStr.toLowerCase().includes(q);
  });

  const yearOptions = [
    { value: "", label: "Todos los ciclos" },
    ...years.map((y) => ({ value: y._id, label: y.name })),
  ];

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
        title="Grupos"
        subtitle={`${groups.length} grupo${groups.length !== 1 ? "s" : ""}`}
      />

      {groups.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por grado o sección..."
                  icon={<Search size={18} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  options={yearOptions}
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {groups.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} />}
          title="No hay grupos registrados"
          description="Los grupos se crean desde el ciclo escolar."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="Sin resultados"
          description="No se encontraron grupos con ese criterio."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group) => (
            <Card key={group._id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-violet-100 rounded-xl shrink-0">
                      <ClipboardList size={18} className="text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">
                        {group.grade}° {group.section}
                      </h3>
                      <p className="text-sm text-text-secondary capitalize">
                        {group.shift}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={group.type === "taller" ? "amber" : "slate"}>
                      {group.type === "taller" ? "Taller" : "Regular"}
                    </Badge>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
