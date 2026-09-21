// Página de Maestros a nivel Escuela
// Lista TODOS los maestros de la escuela (activos e inactivos) para historial.
// Esta es la ruta principal de maestros; la ruta year-level es para asignación a ciclos.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import type { User } from "@/lib/types";
import { Users, Search } from "lucide-react";

type FilterStatus = "all" | "active" | "inactive";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

export default function SchoolTeachersPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const fetchTeachers = async () => {
    try {
      const res = await api.get<{ items: User[] }>(
        `${ENDPOINTS.DASHBOARD_TEACHERS(schoolId)}`
      );
      setTeachers(res.items || []);
    } catch {
      setError("Error al cargar los maestros.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [schoolId]);

  if (isLoading) {
    return <LoadingState message="Cargando maestros..." height="page" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: fetchTeachers }}
      />
    );
  }

  const filtered = teachers.filter((t) => {
    const matchesSearch =
      searchQuery === "" ||
      `${t.name} ${t.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phoneNumber.includes(searchQuery) ||
      (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && t.isActive) ||
      (statusFilter === "inactive" && !t.isActive);

    return matchesSearch && matchesStatus;
  });

  const activeCount = teachers.filter((t) => t.isActive).length;
  const inactiveCount = teachers.length - activeCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maestros"
        subtitle={`${teachers.length} registrado${teachers.length !== 1 ? "s" : ""} — ${activeCount} activo${activeCount !== 1 ? "s" : ""}, ${inactiveCount} inactivo${inactiveCount !== 1 ? "s" : ""}`}
        action={{
          label: "Registrar Maestro",
          href: `/schools/${schoolId}/teachers/new`,
        }}
      />

      {/* Filtros */}
      {teachers.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nombre, teléfono o email..."
                  icon={<Search size={18} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-40">
                <Select
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Lista */}
      {teachers.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No hay maestros registrados"
          description="Registra maestros para poder asignarles materias y grupos en los ciclos escolares."
          action={{
            label: "Registrar Primer Maestro",
            href: `/schools/${schoolId}/teachers/new`,
          }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="Sin resultados"
          description="No se encontraron maestros con los filtros seleccionados."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((teacher) => (
            <Card key={teacher._id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-xl shrink-0">
                      <span className="text-emerald-600 font-bold text-lg">
                        {teacher.name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">
                        {teacher.name} {teacher.last_name}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {teacher.phoneNumber}
                      </p>
                      {teacher.email && (
                        <p className="text-xs text-text-muted truncate">
                          {teacher.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={teacher.isActive ? "emerald" : "rose"}>
                    {teacher.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
