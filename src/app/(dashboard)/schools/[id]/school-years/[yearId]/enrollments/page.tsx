// Página de Matrícula de Alumnos

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Enrollment, Student, Group } from "@/lib/types";
import { BookUser, Plus, Trash2 } from "lucide-react";

interface PopulatedEnrollment
  extends Omit<Enrollment, "student_id" | "group_id"> {
  student_id: Student;
  group_id: Group;
}

export default function EnrollmentsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [enrollments, setEnrollments] = useState<PopulatedEnrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state (no react-hook-form para mantener simple)
  const [studentId, setStudentId] = useState("");
  const [groupId, setGroupId] = useState("");

  // Filter / search
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Filtrar explícitamente por school + year. Como super_admin (wizard)
      // no tiene schoolId en JWT, el filtro del backend lo cubre igual.
      const [enrollRes, studentsRes, groupsRes] = await Promise.all([
        api.get<{ items: PopulatedEnrollment[] } | PopulatedEnrollment[]>(
          `${ENDPOINTS.ENROLLMENTS}?school_year_id=${yearId}`
        ),
        api.get<{ items: Student[] }>(
          `${ENDPOINTS.STUDENTS}?school_year_id=${yearId}`
        ),
        api.get<{ items: Group[] }>(
          `${ENDPOINTS.DASHBOARD_GROUPS(schoolId)}?yearId=${yearId}`
        ),
      ]);
      const enrollArr = Array.isArray(enrollRes)
        ? enrollRes
        : enrollRes.items || [];
      setEnrollments(enrollArr);
      setStudents(studentsRes.items || []);
      setGroups(groupsRes.items || []);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, yearId]);

  const filteredEnrollments = useMemo(() => {
    if (!search) return enrollments;
    const q = search.toLowerCase();
    return enrollments.filter((e) => {
      const s = e.student_id;
      return (
        s?.first_name?.toLowerCase().includes(q) ||
        s?.last_name?.toLowerCase().includes(q) ||
        s?.controlNumber?.toLowerCase().includes(q)
      );
    });
  }, [enrollments, search]);

  // Students ya inscritos en este ciclo (para no permitir duplicados en el select).
  const enrolledStudentIds = useMemo(
    () => new Set(enrollments.map((e) => e.student_id?._id).filter(Boolean)),
    [enrollments]
  );

  // Estudiantes disponibles: los activos que NO están ya inscritos.
  const availableStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.status === "active" && !enrolledStudentIds.has(s._id)
      ),
    [students, enrolledStudentIds]
  );

  const openCreateModal = () => {
    setStudentId("");
    setGroupId("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!studentId || !groupId) {
      setError("Selecciona alumno y grupo.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(ENDPOINTS.ENROLLMENTS, {
        student_id: studentId,
        group_id: groupId,
        school_year_id: yearId,
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al matricular");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`${ENDPOINTS.ENROLLMENTS}/${deletingId}`);
      setDeletingId(null);
      fetchData();
    } catch (err) {
      console.error("Error deleting enrollment:", err);
      setDeletingId(null);
    }
  };

  const STATUS_MAP: Record<
    string,
    { label: string; variant: "emerald" | "rose" | "amber" | "slate" }
  > = {
    enrolled: { label: "Inscrito", variant: "emerald" },
    withdrawn: { label: "Baja", variant: "rose" },
    graduated: { label: "Graduado", variant: "amber" },
    transferred: { label: "Transferido", variant: "amber" },
  };

  if (isLoading) {
    return <LoadingState message="Cargando..." height="page" />;
  }

  const groupOptions = groups.map((g) => ({
    value: g._id,
    label: `${g.grade}°${g.section}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matrícula"
        subtitle="Inscripciones de alumnos en grupos del ciclo"
        action={{
          label: "Importar Excel",
          href: `/schools/${schoolId}/school-years/${yearId}/enrollments/import`,
        }}
      />

      <div className="flex justify-end -mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={openCreateModal}
        >
          <Plus size={14} className="mr-1.5" />
          Nueva matrícula individual
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">
          {error}
        </div>
      )}

      {groups.length === 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Necesitas tener al menos un grupo configurado en este ciclo
          antes de poder matricular alumnos.
        </div>
      )}

      <Input
        placeholder="Buscar por nombre o número de control..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredEnrollments.length === 0 ? (
        <EmptyState
          icon={<BookUser size={48} />}
          title={
            enrollments.length === 0
              ? "No hay matrículas registradas"
              : "Sin coincidencias"
          }
          description={
            enrollments.length === 0
              ? "Inscribe alumnos en grupos para gestionar su asistencia y calificaciones."
              : "No hay matrículas que coincidan con la búsqueda."
          }
          action={
            enrollments.length === 0
              ? {
                  label: "Nueva Matrícula",
                  onClick: openCreateModal,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEnrollments.map((enroll) => {
            const s = enroll.student_id;
            const g = enroll.group_id;
            const status = STATUS_MAP[enroll.cycle_status] || STATUS_MAP.enrolled;
            return (
              <Card key={enroll._id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-text-primary truncate">
                        {s?.first_name} {s?.last_name || ""}
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        No. Control: {s?.controlNumber || "—"}
                      </p>
                      <p className="text-sm text-text-secondary mt-1">
                        Grupo:{" "}
                        <span className="font-medium">
                          {g ? `${g.grade}°${g.section}` : "—"}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <button
                        onClick={() => setDeletingId(enroll._id)}
                        className="p-1 rounded hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                        title="Eliminar matrícula"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Matrícula"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">
              {error}
            </div>
          )}

          {availableStudents.length === 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Todos los alumnos activos ya están inscritos en este
              ciclo. Registra más alumnos o promueve de ciclo.
            </div>
          )}

          <Select
            label="Alumno"
            placeholder={
              availableStudents.length === 0
                ? "Sin alumnos disponibles"
                : "Seleccionar alumno"
            }
            options={availableStudents.map((s) => ({
              value: s._id,
              label: `${s.first_name} ${s.last_name || ""} (${
                s.controlNumber || ""
              })`,
            }))}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <Select
            label="Grupo"
            placeholder="Seleccionar grupo"
            options={groupOptions}
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="sky"
              isLoading={isSubmitting}
              disabled={!studentId || !groupId}
            >
              <Plus size={16} className="mr-1.5" />
              Inscribir
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Eliminar matrícula"
        message="¿Estás seguro de eliminar esta matrícula? El alumno quedará sin grupo asignado en este ciclo."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />
    </div>
  );
}
