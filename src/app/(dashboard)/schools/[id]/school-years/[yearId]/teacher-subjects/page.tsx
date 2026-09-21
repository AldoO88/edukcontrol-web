// Página de Asignación de Materias a Maestros

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { TeacherSubject, User, Subject, Group } from "@/lib/types";
import { UserCheck, Trash2 } from "lucide-react";
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

// Tipo expanded para el GET de dashboard (devuelve teacher/subject/group populados)
type PopulatedAssignment = Omit<TeacherSubject, "teacher_id" | "subject_id" | "group_id"> & {
  teacher_id: User;
  subject_id: Subject;
  group_id: Group;
};

export default function TeacherSubjectsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [assignments, setAssignments] = useState<PopulatedAssignment[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      school_year_id: yearId,
      teacher_id: "",
      subject_id: "",
      group_id: "",
    },
  });

  const fetchData = async () => {
    try {
      const [assignRes, teachersRes, subjectsRes, groupsRes] =
        await Promise.all([
          api.get<{ items: PopulatedAssignment[] }>(
            `${ENDPOINTS.DASHBOARD_TEACHER_SUBJECTS(schoolId)}?yearId=${yearId}`
          ),
          api.get<{ items: User[] }>(`${ENDPOINTS.DASHBOARD_TEACHERS(schoolId)}`),
          api.get<{ items: Subject[] }>(
            `${ENDPOINTS.SUBJECTS}?school=${schoolId}`
          ),
          api.get<{ items: Group[] }>(
            `${ENDPOINTS.DASHBOARD_GROUPS(schoolId)}?yearId=${yearId}`
          ),
        ]);
      setAssignments(assignRes.items || []);
      setTeachers(teachersRes.items || []);
      setSubjects(subjectsRes.items || []);
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

  const openCreateModal = () => {
    reset({
      school_year_id: yearId,
      teacher_id: "",
      subject_id: "",
      group_id: "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: AssignmentFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(ENDPOINTS.TEACHER_SUBJECTS, data);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al crear la asignación"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`${ENDPOINTS.TEACHER_SUBJECTS}/${deletingId}`);
      setDeletingId(null);
      fetchData();
    } catch (err) {
      console.error("Error deleting assignment:", err);
      setDeletingId(null);
    }
  };

  const columns: Column<PopulatedAssignment>[] = [
    {
      key: "teacher_id",
      label: "Maestro",
      render: (item) => {
        const t = item.teacher_id as User;
        return t ? (
          <span className="font-medium">
            {t.name} {t.last_name || ""}
          </span>
        ) : (
          "—"
        );
      },
    },
    {
      key: "subject_id",
      label: "Materia",
      render: (item) => {
        const s = item.subject_id as Subject;
        return (
          <div className="flex items-center gap-2">
            {s?.code && (
              <span className="text-xs font-mono text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded">
                {s.code}
              </span>
            )}
            <span>{s?.name || "—"}</span>
          </div>
        );
      },
    },
    {
      key: "group_id",
      label: "Grupo",
      render: (item) => {
        const g = item.group_id as Group;
        return g ? `${g.grade}°${g.section}` : "—";
      },
    },
    {
      key: "_actions",
      label: "",
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeletingId(item._id);
          }}
          className="p-1.5 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
          title="Eliminar asignación"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasPrerequisites =
    teachers.length > 0 && subjects.length > 0 && groups.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asignar Materias"
        subtitle="Asignar materias a maestros por grupo"
        action={{
          label: "Nueva Asignación",
          onClick: openCreateModal,
        }}
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">
          {error}
        </div>
      )}

      {!hasPrerequisites && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Para crear asignaciones necesitas tener al menos un maestro, una
          materia y un grupo configurados.
        </div>
      )}

      {assignments.length === 0 ? (
        <EmptyState
          icon={<UserCheck size={48} />}
          title="No hay asignaciones"
          description="Asigna materias a maestros para que puedan calificar y tomar asistencia."
          action={
            hasPrerequisites
              ? { label: "Crear Asignación", onClick: openCreateModal }
              : undefined
          }
        />
      ) : (
        <Card>
          <CardBody className="!p-0">
            <DataTable columns={columns} data={assignments} />
          </CardBody>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Asignación"
        size="lg"
      >
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
            options={subjects.map((s) => ({
              value: s._id,
              label: `${s.code} — ${s.name}`,
            }))}
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

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Eliminar asignación"
        message="¿Estás seguro de eliminar esta asignación maestro-materia-grupo?"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />
    </div>
  );
}
