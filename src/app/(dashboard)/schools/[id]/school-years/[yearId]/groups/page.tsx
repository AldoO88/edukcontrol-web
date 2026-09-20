// Página de Grupos (scoped por ciclo escolar)

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
import type { Group } from "@/lib/types";
import { ClipboardList } from "lucide-react";

export default function GroupsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await api.get<Group[]>(
          `${ENDPOINTS.GROUPS}?school_year_id=${yearId}`
        );
        setGroups(res);
      } catch {
        // Error silencioso
      } finally {
        setIsLoading(false);
      }
    }
    fetchGroups();
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
        title="Grupos"
        subtitle="Grupos del ciclo escolar"
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} />}
          title="No hay grupos configurados"
          description="Crea grupos para comenzar a asignar alumnos."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group._id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary">
                      {group.grade}° {group.section}
                    </h3>
                    <p className="text-sm text-text-secondary mt-1">
                      {group.shift === "matutino" ? "Matutino" : "Vespertino"}
                    </p>
                  </div>
                  <Badge variant={group.type === "taller" ? "amber" : "sky"}>
                    {group.type === "taller" ? "Taller" : "Regular"}
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
