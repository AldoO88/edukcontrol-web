// Página de Maestros

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { User } from "@/lib/types";
import { Users } from "lucide-react";

export default function TeachersPage() {
  const router = useRouter();
  const params = useParams();
  const yearId = params.yearId as string;
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTeachers() {
      try {
        // Los maestros se obtienen vía teacher-subjects o se filtran del signup
        // Por ahora usamos el endpoint de teacher-subjects para listar
        const res = await api.get<{ items: User[] }>(
          `${ENDPOINTS.STUDENTS}?limit=1&school_year_id=${yearId}`
        );
        // TODO: Implementar endpoint específico de teachers
        setTeachers([]);
      } catch {
        // Error silencioso
      } finally {
        setIsLoading(false);
      }
    }
    fetchTeachers();
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
        title="Maestros"
        subtitle="Gestión del personal docente"
        action={{
          label: "Registrar Maestro",
          href: "/teachers/new",
        }}
      />

      {teachers.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No hay maestros registrados"
          description="Registra maestros para poder asignarles materias y grupos."
          action={{ label: "Registrar Maestro", href: "/teachers/new" }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher) => (
            <Card key={teacher._id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-xl">
                      <span className="text-emerald-600 font-bold text-lg">
                        {teacher.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">
                        {teacher.name} {teacher.last_name}
                      </h3>
                      <p className="text-sm text-text-secondary">{teacher.phoneNumber}</p>
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
