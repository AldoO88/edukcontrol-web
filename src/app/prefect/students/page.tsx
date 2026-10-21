// =====================================================================
// src/app/prefect/students/page.tsx
// ---------------------------------------------------------------------
// Directorio de Alumnos — puerto web de (tabs)/students.jsx de la app:
// búsqueda global paginada (debounce 500ms), filtro por grupo (solo
// grupos regulares) y "cargar más" (equivalente al onEndReached del
// FlatList). Fuente: hook useStudentsDirectory.
// =====================================================================

"use client";

import Link from "next/link";
import { ChevronRight, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useStudentsDirectory } from "@/lib/hooks/useStudentsDirectory";
import { StudentAvatar } from "@/app/prefect/_components/StudentAvatar";

export default function PrefectStudentsPage() {
  const {
    groups,
    students,
    page,
    pages,
    search,
    setSearch,
    groupId,
    setGroupId,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    refetch,
  } = useStudentsDirectory();

  // Label del grupo activo para el subtítulo (siempre visible).
  const activeGroupLabel = groups.find((g) => g._id === groupId)?.label;

  if (isLoading && students.length === 0 && !error) {
    return <LoadingState message="Cargando alumnos…" />;
  }
  if (error && students.length === 0) {
    return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alumnos"
        subtitle="Busca y consulta la información de cualquier alumno"
      />

      {/* Búsqueda + filtro de grupo */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre, CURP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="sm:w-52">
          <Select
            placeholder="Todos los grupos"
            value={groupId ?? ""}
            onChange={(e) => setGroupId(e.target.value || null)}
            options={groups.map((g) => ({ value: g._id, label: g.label }))}
          />
        </div>
      </div>

      {activeGroupLabel && (
        <p className="text-xs font-semibold text-sky-600">
          Filtrando por el grupo {activeGroupLabel}
        </p>
      )}

      {/* Lista */}
      {students.length === 0 && !isLoading ? (
        <EmptyState
          icon={<GraduationCap size={48} className="text-slate-300" />}
          title="No hay alumnos"
          description="Prueba con otra búsqueda o limpia los filtros."
          action={
            search || groupId
              ? {
                  label: "Limpiar filtros",
                  onClick: () => {
                    setSearch("");
                    setGroupId(null);
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {students.map((student) => {
            const fullName =
              `${student.first_name || ""} ${student.last_name || ""}`.trim();
            const group =
              typeof student.current_group_id === "object" && student.current_group_id
                ? `${student.current_group_id.grade ?? ""}°${
                    student.current_group_id.section ?? ""
                  }`
                : "";
            return (
              <Link key={student._id} href={`/prefect/students/${student._id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardBody className="flex items-center gap-3">
                    <StudentAvatar photoUrl={student.photoUrl} name={fullName} size={48} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {student.last_name}, {student.first_name}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {group}
                        {group && student.controlNumber ? " • " : ""}
                        {student.controlNumber || ""}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </CardBody>
                </Card>
              </Link>
            );
          })}

          {/* Paginación: cargar más / fin de resultados */}
          <div className="flex justify-center py-2">
            {isLoadingMore ? (
              <span className="flex items-center gap-2 text-sm text-text-secondary">
                <Spinner size="sm" /> Cargando…
              </span>
            ) : page < pages ? (
              <Button variant="secondary" onClick={loadMore}>
                Cargar más ({students.length} de {pages * 50})
              </Button>
            ) : students.length > 0 ? (
              <span className="text-xs text-text-muted">
                {students.length} alumno{students.length !== 1 ? "s" : ""}
                {activeGroupLabel ? ` en ${activeGroupLabel}` : ""}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
