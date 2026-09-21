// Página de Materias a nivel Escuela
// Lista todas las materias del catálogo de la escuela (no depende de ciclo escolar).

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Subject } from "@/lib/types";
import { BookOpen, Search, ChevronLeft } from "lucide-react";

export default function SchoolSubjectsPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSubjects = async () => {
    try {
      const res = await api.get<{ items: Subject[] }>(ENDPOINTS.SUBJECTS);
      setSubjects(res.items || []);
    } catch {
      setError("Error al cargar las materias.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [schoolId]);

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

  const filtered = subjects.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q)
    );
  });

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
        title="Materias"
        subtitle={`${subjects.length} materia${subjects.length !== 1 ? "s" : ""} en el catálogo`}
      />

      {subjects.length > 0 && (
        <Card>
          <CardBody>
            <Input
              placeholder="Buscar por nombre o código..."
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
          title="No hay materias registradas"
          description="Las materias se configuran desde el ciclo escolar."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="Sin resultados"
          description="No se encontraron materias con ese criterio."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((subject) => (
            <Card key={subject._id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-rose-100 rounded-xl shrink-0">
                      <BookOpen size={18} className="text-rose-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">
                        {subject.name}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {subject.code}
                      </p>
                    </div>
                  </div>
                  <Badge variant={subject.isActive ? "emerald" : "rose"}>
                    {subject.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                {subject.grade && (
                  <p className="text-xs text-text-muted mt-2">
                    Grado {subject.grade}
                  </p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
