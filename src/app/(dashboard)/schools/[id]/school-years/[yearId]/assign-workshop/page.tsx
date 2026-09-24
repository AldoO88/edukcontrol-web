// Página de Asignación de Talleres
// Permite asignar alumnos inscritos a sus grupos taller.
// Los alumnos eligen su taller después de la primera semana.

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Student, Group } from "@/lib/types";
import {
  Wrench,
  Search,
  Check,
  UserCheck,
  Users,
  AlertCircle,
} from "lucide-react";

export default function AssignWorkshopPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [talleres, setTalleres] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTaller, setBulkTaller] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [studentsRes, groupsRes] = await Promise.all([
        api.get<{ items: Student[] } | Student[]>(
          `${ENDPOINTS.STUDENTS}?status=active&limit=500`
        ),
        api.get<Group[]>(
          `${ENDPOINTS.GROUPS}?school_year_id=${yearId}`
        ),
      ]);

      const allStudents = Array.isArray(studentsRes)
        ? studentsRes
        : studentsRes.items || [];
      setStudents(allStudents);
      setTalleres(groupsRes.filter((g) => g.type === "taller"));
    } catch {
      setError("Error al cargar datos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sinTaller = useMemo(() => {
    const filtered = students.filter((s) => {
      if (s.workshop_group_id) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.first_name?.toLowerCase().includes(q) ||
        s.last_name?.toLowerCase().includes(q) ||
        s.controlNumber?.toLowerCase().includes(q)
      );
    });
    return filtered;
  }, [students, searchQuery]);

  const conTaller = useMemo(() => {
    return students.filter((s) => s.workshop_group_id);
  }, [students]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sinTaller.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sinTaller.map((s) => s._id)));
    }
  };

  const assignSingle = async (studentId: string, workshopGroupId: string) => {
    try {
      await api.put(`${ENDPOINTS.STUDENTS}/${studentId}`, {
        workshop_group_id: workshopGroupId || null,
      });
      setSuccessMsg("Taller asignado correctamente.");
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchData();
    } catch {
      setError("Error al asignar taller.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const assignBulk = async () => {
    if (!bulkTaller || selectedIds.size === 0) return;
    setAssigning(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          api.put(`${ENDPOINTS.STUDENTS}/${id}`, {
            workshop_group_id: bulkTaller,
          })
        )
      );
      setSuccessMsg(
        `${selectedIds.size} alumno${selectedIds.size !== 1 ? "s" : ""} asignado${selectedIds.size !== 1 ? "s" : ""} correctamente.`
      );
      setSelectedIds(new Set());
      setBulkTaller("");
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchData();
    } catch {
      setError("Error al asignar talleres.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setAssigning(false);
    }
  };

  const getTallerName = (groupId: string) => {
    const g = talleres.find((t) => t._id === groupId);
    return g ? `${g.grade}° ${g.section}` : "Desconocido";
  };

  if (isLoading) {
    return <LoadingState message="Cargando alumnos y talleres..." height="page" />;
  }

  if (error && !successMsg) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: fetchData }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asignar Taller"
        subtitle={`${sinTaller.length} alumno${sinTaller.length !== 1 ? "s" : ""} sin taller · ${conTaller.length} asignado${conTaller.length !== 1 ? "s" : ""}`}
      />

      {talleres.length === 0 ? (
        <EmptyState
          icon={<Wrench size={48} />}
          title="No hay talleres configurados"
          description="Crea plantillas de taller en la configuración de la escuela. Al crear el ciclo, se copiarán automáticamente."
        />
      ) : sinTaller.length === 0 && conTaller.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No hay alumnos inscritos"
          description="Inscribe alumnos desde la página de Inscripciones antes de asignar talleres."
        />
      ) : sinTaller.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <Check size={48} className="mx-auto text-emerald-500 mb-3" />
              <h3 className="font-semibold text-text-primary text-lg">
                Todos los alumnos tienen taller asignado
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                {conTaller.length} alumno{conTaller.length !== 1 ? "s" : ""} asignado{conTaller.length !== 1 ? "s" : ""} a {talleres.length} taller{talleres.length !== 1 ? "es" : ""}.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Resumen de talleres */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {talleres.map((t) => {
              const count = conTaller.filter(
                (s) => s.workshop_group_id === t._id
              ).length;
              return (
                <Card key={t._id}>
                  <CardBody>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-text-primary">{count}</p>
                      <p className="text-sm text-text-secondary">{t.grade}° {t.section}</p>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>

          {/* Asignación masiva */}
          {selectedIds.size > 0 && (
            <Card className="border-2 border-accent/30">
              <CardBody>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-medium text-text-primary">
                    {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
                  </span>
                  <Select
                    options={[
                      { value: "", label: "Seleccionar taller..." },
                      ...talleres.map((t) => ({ value: t._id, label: `${t.grade}° ${t.section}` })),
                    ]}
                    value={bulkTaller}
                    onChange={(e) => setBulkTaller(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={assignBulk}
                    disabled={!bulkTaller || assigning}
                    isLoading={assigning}
                  >
                    <UserCheck size={16} className="mr-1.5" />
                    Asignar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Lista de alumnos sin taller */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Buscar alumno por nombre o número..."
                icon={<Search size={18} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              {sinTaller.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedIds.size === sinTaller.length
                    ? "Deseleccionar todo"
                    : "Seleccionar todo"}
                </Button>
              )}
            </div>

            {sinTaller.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-center text-sm text-text-secondary py-4">
                    {searchQuery
                      ? "No se encontraron alumnos con ese criterio."
                      : "No hay alumnos sin taller asignado."}
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-2">
                {sinTaller.map((student) => (
                  <Card
                    key={student._id}
                    className={`transition-colors ${
                      selectedIds.has(student._id)
                        ? "border-2 border-accent/30 bg-accent/5"
                        : "hover:shadow-sm"
                    }`}
                  >
                    <CardBody>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(student._id)}
                          onChange={() => toggleSelect(student._id)}
                          className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                        />
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {student.photoUrl ? (
                            <img
                              src={student.photoUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-text-secondary">
                              {student.first_name?.[0]}
                              {student.last_name?.[0]}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-xs text-text-muted">
                            {student.controlNumber}
                          </p>
                        </div>
                        <div className="w-44 shrink-0">
                          <Select
                            options={[
                              { value: "", label: "Sin taller" },
                              ...talleres.map((t) => ({
                                value: t._id,
                                label: `${t.grade}° ${t.section}`,
                              })),
                            ]}
                            value={student.workshop_group_id || ""}
                            onChange={(e) =>
                              assignSingle(student._id, e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Mensajes de éxito/error */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-lg text-sm">
            <Check size={16} />
            {successMsg}
          </div>
        </div>
      )}
      {error && successMsg === null && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-2 px-4 py-3 bg-error text-white rounded-xl shadow-lg text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
