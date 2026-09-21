// Página de Maestros

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  const params = useParams();
  const schoolId = params.id as string;

  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeachers = async () => {
    try {
      const res = await api.get<{ items: User[] }>(
        `${ENDPOINTS.DASHBOARD_TEACHERS(schoolId)}`
      );
      setTeachers(res.items || []);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

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
        subtitle="Personal docente registrado en la escuela"
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
