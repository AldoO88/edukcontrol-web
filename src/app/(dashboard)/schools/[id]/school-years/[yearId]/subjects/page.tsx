// Página de Materias del ciclo escolar (solo lectura)
// Muestra materias activas del catálogo agrupadas por macroCategoría.
// Edición solo desde Configuración de Escuela.

"use client";

import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Subject } from "@/lib/types";
import {
  getSubjectIcon,
  hexToRgba,
} from "@/lib/subjectIcons";
import { BookOpen, Search } from "lucide-react";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSubjects = async () => {
    try {
      const res = await api.get<{ items: Subject[] }>(ENDPOINTS.SUBJECTS);
      // Solo materias activas
      setSubjects((res.items || []).filter((s) => s.isActive !== false));
    } catch {
      setError("Error al cargar las materias.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const grouped = useMemo(() => {
    const filtered = subjects.filter((s) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.macroCategory && s.macroCategory.toLowerCase().includes(q))
      );
    });

    const groups: Record<string, Subject[]> = {};
    for (const s of filtered) {
      const key = s.macroCategory || "Sin categoría";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Sin categoría") return 1;
      if (b === "Sin categoría") return -1;
      return a.localeCompare(b);
    });
    return sortedKeys.map((key) => ({ category: key, items: groups[key] }));
  }, [subjects, searchQuery]);

  if (isLoading) {
    return <LoadingState message="Cargando materias..." height="page" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: fetchSubjects }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materias"
        subtitle={`${subjects.length} materia${subjects.length !== 1 ? "s" : ""} activa${subjects.length !== 1 ? "s" : ""}`}
      />

      {subjects.length > 0 && (
        <Card>
          <CardBody>
            <Input
              placeholder="Buscar por nombre, código o categoría..."
              icon={<Search size={18} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </CardBody>
        </Card>
      )}

      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={48} />}
          title="No hay materias activas"
          description="Activa materias desde la configuración de la escuela."
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="Sin resultados"
          description="No se encontraron materias con ese criterio."
        />
      ) : (
        grouped.map(({ category, items }) => (
          <div key={category} className="space-y-3">
            <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
              {category}
              <span className="text-xs font-normal text-text-muted bg-slate-100 px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((subject) => {
                const Icon = getSubjectIcon(subject.icon);
                const color = subject.color || "#EF4444";
                return (
                  <Card key={subject._id} className="hover:shadow-md transition-shadow">
                    <CardBody>
                      <div className="flex items-start gap-3">
                        <div
                          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                          style={{ backgroundColor: hexToRgba(color, 0.1) }}
                        >
                          <Icon size={18} style={{ color }} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-text-primary truncate">
                            {subject.name}
                          </h4>
                          <p className="text-sm text-text-secondary">
                            {subject.code}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-muted">
                        {subject.grade && <span>Grado {subject.grade}°</span>}
                        {subject.isTutoria && (
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded-full">Tutoría</span>
                        )}
                      </div>
                      {subject.workshops && subject.workshops.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {subject.workshops.map((w, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                            >
                              {w.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
