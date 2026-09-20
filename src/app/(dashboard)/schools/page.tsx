// Página de Escuelas (super_admin)

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { School } from "@/lib/types";
import { School as SchoolIcon } from "lucide-react";

export default function SchoolsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSchools() {
      try {
        const res = await api.get<{ items: School[] }>(ENDPOINTS.SCHOOLS);
        setSchools(res.items);
      } catch {
        // Error silencioso
      } finally {
        setIsLoading(false);
      }
    }
    fetchSchools();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escuelas"
        subtitle="Gestión de instituciones educativas"
        action={{
          label: "Nueva Escuela",
          href: "/schools/new",
        }}
      />

      {schools.length === 0 ? (
        <EmptyState
          icon={<SchoolIcon size={48} />}
          title="No hay escuelas registradas"
          description="Crea tu primera escuela para comenzar a gestionar el sistema."
          action={{ label: "Crear Escuela", href: "/schools/new" }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((school) => (
            <Card key={school._id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {school.logoUrl ? (
                      <img
                        src={school.logoUrl}
                        alt={`Logo de ${school.name}`}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-xl">
                        <SchoolIcon size={24} className="text-accent-dark" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-text-primary">{school.name}</h3>
                      {school.honoraryName && (
                        <p className="text-sm text-accent-dark italic">
                          {school.honoraryName}
                        </p>
                      )}
                      <p className="text-sm text-text-secondary">CCT: {school.cct}</p>
                    </div>
                  </div>
                  <Badge variant={school.isActive ? "emerald" : "rose"}>
                    {school.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <button
                  onClick={() => router.push(`/schools/${school._id}`)}
                  className="mt-4 text-sm text-accent-dark hover:text-accent font-medium"
                >
                  Ver detalles →
                </button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
