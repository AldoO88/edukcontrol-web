// =====================================================================
// src/app/prefect/teachers/page.tsx
// ---------------------------------------------------------------------
// Lista de Maestros — puerto web de (tabs)/teachers.jsx de la app:
// nombre, teléfono y horas/semana + búsqueda client-side por nombre.
// Fuente: GET /api/prefect/teachers (hook usePrefectTeachers).
// =====================================================================

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Briefcase, ChevronRight, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePrefectTeachers } from "@/lib/hooks/usePrefectTeachers";

export default function PrefectTeachersPage() {
  const { teachers, isLoading, error, refetch } = usePrefectTeachers();
  const [searchText, setSearchText] = useState("");

  // Filtro client-side (mismo matching que la app: apellido, nombre o
  // nombre completo).
  const filteredTeachers = useMemo(() => {
    const term = searchText.toLowerCase().trim();
    if (!term) return teachers;
    return teachers.filter((t) => {
      const fullName = `${t.last_name || ""} ${t.name || ""}`.toLowerCase();
      return (
        fullName.includes(term) ||
        t.name?.toLowerCase().includes(term) ||
        t.last_name?.toLowerCase().includes(term)
      );
    });
  }, [teachers, searchText]);

  if (isLoading) return <LoadingState message="Cargando maestros…" />;
  if (error) return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Maestros"
        subtitle="Consulta horarios y información de contacto"
      />

      {/* Búsqueda */}
      <div className="max-w-md">
        <Input
          placeholder="Buscar maestro..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          icon={<Search size={16} className="text-slate-400" />}
        />
      </div>

      {filteredTeachers.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={48} className="text-slate-300" />}
          title={teachers.length === 0 ? "No hay maestros" : "Sin resultados"}
          description={
            teachers.length === 0
              ? "Aún no hay maestros registrados."
              : "No hay maestros con esta búsqueda."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTeachers.map((teacher) => {
            // Orden apellido-nombre (mismo display que la app).
            const fullName =
              `${teacher.last_name || ""} ${teacher.name || ""}`.trim();
            const initials =
              `${teacher.name?.[0] || ""}${teacher.last_name?.[0] || ""}`.toUpperCase();
            return (
              <Link key={teacher._id} href={`/prefect/teachers/${teacher._id}`}>
                <Card className="border-l-4 border-l-violet-600 hover:shadow-md transition-shadow h-full">
                  <CardBody className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-violet-600">
                        {initials || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {fullName}
                      </p>
                      {teacher.phoneNumber && (
                        <p className="text-xs text-text-secondary mt-0.5">
                          {teacher.phoneNumber}
                        </p>
                      )}
                      {teacher.totalHours != null && teacher.totalHours > 0 && (
                        <p className="text-xs text-text-muted mt-0.5">
                          {teacher.totalHours} hora{teacher.totalHours !== 1 ? "s" : ""}
                          /semana
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-violet-500" />
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
