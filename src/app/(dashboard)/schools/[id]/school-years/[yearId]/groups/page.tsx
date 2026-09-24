// Página de Grupos (scoped por ciclo escolar)
// Muestra grupos regulares y talleres en secciones separadas.

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Group } from "@/lib/types";
import { ClipboardList, Users, User, Wrench } from "lucide-react";

interface GroupStudent {
  _id: string;
  student_id: {
    _id: string;
    controlNumber: string;
    first_name: string;
    last_name: string;
    photoUrl?: string;
  };
  cycle_status: string;
}

export default function GroupsPage() {
  const params = useParams();
  const yearId = params.yearId as string;
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await api.get<Group[]>(
          `${ENDPOINTS.GROUPS}?school_year_id=${yearId}`
        );
        setGroups(res);
      } catch {
        setError("Error al cargar los grupos.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchGroups();
  }, []);

  const { regulares, talleres } = useMemo(() => ({
    regulares: groups.filter((g) => g.type !== "taller"),
    talleres: groups.filter((g) => g.type === "taller"),
  }), [groups]);

  const openStudentsModal = async (group: Group) => {
    setSelectedGroup(group);
    setStudents([]);
    setStudentsError(null);
    setIsLoadingStudents(true);

    try {
      const res = await api.get<{ items: GroupStudent[]; total: number }>(
        ENDPOINTS.GROUP_STUDENTS(group._id)
      );
      setStudents(res.items || []);
    } catch {
      setStudentsError("Error al cargar los alumnos del grupo.");
    } finally {
      setIsLoadingStudents(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando grupos..." height="page" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: () => window.location.reload() }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grupos"
        subtitle={`${groups.length} grupo${groups.length !== 1 ? "s" : ""} en el ciclo`}
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} />}
          title="No hay grupos configurados"
          description="Crea grupos desde la plantilla de la escuela para comenzar a asignar alumnos."
        />
      ) : (
        <>
          {/* Grupos Regulares */}
          {regulares.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <ClipboardList size={18} className="text-violet-500" />
                Grupos Regulares
                <span className="text-xs font-normal text-text-muted bg-slate-100 px-2 py-0.5 rounded-full">
                  {regulares.length}
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regulares.map((group) => (
                  <Card key={group._id} className="hover:shadow-md transition-shadow">
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-text-primary text-lg">
                            {group.grade}° {group.section}
                          </h3>
                          <p className="text-sm text-text-secondary mt-1">
                            {group.shift === "matutino" ? "Matutino" : "Vespertino"}
                          </p>
                        </div>
                        <Badge variant="sky">Regular</Badge>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStudentsModal(group)}
                        >
                          <Users size={16} className="mr-1.5" />
                          Ver Alumnos
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Talleres */}
          {talleres.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <Wrench size={18} className="text-amber-500" />
                Talleres
                <span className="text-xs font-normal text-text-muted bg-slate-100 px-2 py-0.5 rounded-full">
                  {talleres.length}
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {talleres.map((group) => (
                  <Card key={group._id} className="hover:shadow-md transition-shadow">
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-text-primary text-lg">
                            {group.grade}° {group.section}
                          </h3>
                          <p className="text-sm text-text-secondary mt-1">
                            {group.shift === "matutino" ? "Matutino" : "Vespertino"}
                          </p>
                        </div>
                        <Badge variant="amber">Taller</Badge>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStudentsModal(group)}
                        >
                          <Users size={16} className="mr-1.5" />
                          Ver Alumnos
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Alumnos */}
      <Modal
        isOpen={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        title={
          selectedGroup
            ? `${selectedGroup.grade}° ${selectedGroup.section} — Alumnos`
            : "Alumnos"
        }
      >
        {isLoadingStudents ? (
          <div className="flex justify-center py-8">
            <LoadingState message="Cargando alumnos..." height="compact" />
          </div>
        ) : studentsError ? (
          <div className="p-4 text-center text-error text-sm">{studentsError}</div>
        ) : students.length === 0 ? (
          <div className="py-8 text-center">
            <User size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-sm text-text-secondary">
              No hay alumnos asignados a este grupo aún.
            </p>
            {selectedGroup?.type === "taller" ? (
              <p className="text-xs text-text-muted mt-1">
                Asigna alumnos desde la sección de Talleres en el ciclo escolar.
              </p>
            ) : (
              <p className="text-xs text-text-muted mt-1">
                Asigna alumnos desde la página de Inscripciones.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {students.map((s) => (
              <div
                key={s._id}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {s.student_id?.photoUrl ? (
                    <img
                      src={s.student_id.photoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-text-secondary">
                      {s.student_id?.first_name?.[0]}
                      {s.student_id?.last_name?.[0]}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {s.student_id?.first_name} {s.student_id?.last_name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {s.student_id?.controlNumber}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
