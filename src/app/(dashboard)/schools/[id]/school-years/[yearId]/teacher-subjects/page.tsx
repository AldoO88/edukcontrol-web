// Página de Asignación de Materias a Maestros

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { TeacherSubject, User, Subject, Group } from "@/lib/types";
import { UserCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const assignmentSchema = z.object({
  teacher_id: z.string().min(1, "Maestro requerido"),
  subject_id: z.string().min(1, "Materia requerida"),
  group_id: z.string().min(1, "Grupo requerido"),
  school_year_id: z.string().min(1, "Ciclo escolar requerido"),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

export default function TeacherSubjectsPage() {
  const params = useParams();
  const yearId = params.yearId as string;
  const [assignments, setAssignments] = useState<TeacherSubject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      school_year_id: yearId,
    },
  });

  const fetchData = async () => {
    try {
      const assignRes = await api.get<{ items: TeacherSubject[] }>(
        `${ENDPOINTS.TEACHER_SUBJECTS}?school_year_id=${yearId}`
      );
      setAssignments(assignRes.items);

      // Cargar datos para selects
      const [subjectsRes] = await Promise.all([
        api.get<{ items: Subject[] }>(ENDPOINTS.SUBJECTS),
      ]);
      setSubjects(subjectsRes.items);

      // TODO: Endpoint específico para listar teachers
      setTeachers([]);
      setGroups([]);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: AssignmentFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(ENDPOINTS.TEACHER_SUBJECTS, data);
      setIsModalOpen(false);
      reset();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la asignación");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<TeacherSubject>[] = [
    {
      key: "teacher_id",
      label: "Maestro",
      render: (item) => {
        const teacher = item.teacher_id as User;
        return teacher ? `${teacher.name} ${teacher.last_name || ""}` : "—";
      },
    },
    {
      key: "subject_id",
      label: "Materia",
      render: (item) => {
        const subject = item.subject_id as Subject;
        return subject?.name || "—";
      },
    },
    {
      key: "group_id",
      label: "Grupo",
      render: (item) => {
        const group = item.group_id as Group;
        return group ? `${group.grade}°${group.section}` : "—";
      },
    },
  ];

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
        title="Asignar Materias"
        subtitle="Asignar materias a maestros por grupo"
        action={{
          label: "Nueva Asignación",
          onClick: () => setIsModalOpen(true),
        }}
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
      )}

      <Card>
        {assignments.length === 0 ? (
          <EmptyState
            icon={<UserCheck size={48} />}
            title="No hay asignaciones"
            description="Asigna materias a maestros para que puedan calificar y tomar asistencia."
            action={{ label: "Crear Asignación", onClick: () => setIsModalOpen(true) }}
          />
        ) : (
          <DataTable columns={columns} data={assignments} />
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Asignación" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Maestro"
            placeholder="Seleccionar maestro"
            options={teachers.map((t) => ({
              value: t._id,
              label: `${t.name} ${t.last_name || ""}`,
            }))}
            error={errors.teacher_id?.message}
            {...register("teacher_id")}
          />
          <Select
            label="Materia"
            placeholder="Seleccionar materia"
            options={subjects.map((s) => ({ value: s._id, label: s.name }))}
            error={errors.subject_id?.message}
            {...register("subject_id")}
          />
          <Select
            label="Grupo"
            placeholder="Seleccionar grupo"
            options={groups.map((g) => ({
              value: g._id,
              label: `${g.grade}°${g.section}`,
            }))}
            error={errors.group_id?.message}
            {...register("group_id")}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={isSubmitting}>
              Asignar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
