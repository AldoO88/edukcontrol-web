// Página de Turnos a nivel Escuela
// Lista todos los turnos registrados (puede haber varios por ciclo).

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
import type { SchoolShift } from "@/lib/types";
import { Clock, Search, ChevronLeft } from "lucide-react";

export default function SchoolShiftsPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [shifts, setShifts] = useState<SchoolShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchShifts = async () => {
    try {
      const res = await api.get<{ items: SchoolShift[] }>(ENDPOINTS.SCHOOL_SHIFTS);
      setShifts(res.items || []);
    } catch {
      setError("Error al cargar los turnos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [schoolId]);

  if (isLoading) {
    return <LoadingState message="Cargando turnos..." height="page" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: fetchShifts }}
      />
    );
  }

  const filtered = shifts.filter((s) => {
    if (!searchQuery) return true;
    return s.name.toLowerCase().includes(searchQuery.toLowerCase());
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
        title="Turnos"
        subtitle={`${shifts.length} turno${shifts.length !== 1 ? "s" : ""} registrado${shifts.length !== 1 ? "s" : ""}`}
      />

      {shifts.length > 0 && (
        <Card>
          <CardBody>
            <Input
              placeholder="Buscar por nombre..."
              icon={<Search size={18} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </CardBody>
        </Card>
      )}

      {shifts.length === 0 ? (
        <EmptyState
          icon={<Clock size={48} />}
          title="No hay turnos registrados"
          description="Los turnos se configuran desde el ciclo escolar."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="Sin resultados"
          description="No se encontraron turnos con ese criterio."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((shift) => (
            <Card key={shift._id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-xl shrink-0">
                      <Clock size={18} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">
                        {shift.name}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {shift.startTime} — {shift.endTime}
                      </p>
                    </div>
                  </div>
                  <Badge variant={shift.isActive ? "emerald" : "rose"}>
                    {shift.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-muted">
                  <span>{shift.moduleDurationMinutes} min/módulo</span>
                  <span>•</span>
                  <span>{shift.timeBlocks?.length || 0} bloques</span>
                  <span>•</span>
                  <span>Gracia: {shift.gracePeriodMinutes} min</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
