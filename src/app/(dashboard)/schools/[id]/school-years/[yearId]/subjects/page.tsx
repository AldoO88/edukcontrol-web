// Página de Materias (catálogo compartido, no scoped por ciclo)

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Subject } from "@/lib/types";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Backend Subject fields exposed by the controller:
// code (required), name (required), grade (1-6), description.
// Other model fields (educationalLevel, classificationType, color, icon)
// are reserved for future full editor — out of scope of the setup wizard.
const subjectSchema = z.object({
  code: z.string().min(1, "Código requerido").max(20, "Máximo 20 caracteres"),
  name: z.string().min(1, "Nombre requerido").max(100, "Máximo 100 caracteres"),
  grade: z.union([z.number().min(1).max(6), z.null()]).optional(),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

const GRADE_OPTIONS = [
  { value: "", label: "(Sin grado específico)" },
  { value: "1", label: "1°" },
  { value: "2", label: "2°" },
  { value: "3", label: "3°" },
  { value: "4", label: "4°" },
  { value: "5", label: "5°" },
  { value: "6", label: "6°" },
];

export default function SubjectsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { code: "", name: "", grade: null, description: "" },
  });

  const fetchSubjects = async () => {
    try {
      const res = await api.get<{ items: Subject[] }>(
        `${ENDPOINTS.SUBJECTS}?school=${schoolId}`
      );
      setSubjects(res.items || []);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const openCreateModal = () => {
    setEditingSubject(null);
    reset({ code: "", name: "", grade: null, description: "" });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (subj: Subject) => {
    setEditingSubject(subj);
    reset({
      code: subj.code,
      name: subj.name,
      grade: subj.grade ?? null,
      description: subj.description ?? "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: SubjectFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        code: data.code.toUpperCase().trim(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
      };
      // Solo enviar grade si fue seleccionado
      if (data.grade != null && data.grade !== ("" as unknown)) {
        payload.grade = data.grade;
      }

      if (editingSubject) {
        await api.put(
          `${ENDPOINTS.SUBJECTS}/${editingSubject._id}`,
          payload
        );
      } else {
        await api.post(ENDPOINTS.SUBJECTS, {
          ...payload,
          school: schoolId,
        });
      }
      setIsModalOpen(false);
      setEditingSubject(null);
      fetchSubjects();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar la materia"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSubject) return;
    try {
      await api.delete(`${ENDPOINTS.SUBJECTS}/${deletingSubject._id}`);
      setDeletingSubject(null);
      fetchSubjects();
    } catch (err) {
      console.error("Error deleting subject:", err);
      setDeletingSubject(null);
    }
  };

  const columns: Column<Subject>[] = [
    { key: "code", label: "Código" },
    { key: "name", label: "Nombre" },
    {
      key: "grade",
      label: "Grado",
      render: (row) =>
        row.grade ? (
          `${row.grade}°`
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    {
      key: "description",
      label: "Descripción",
      render: (row) =>
        row.description ? (
          <span className="truncate max-w-xs block">{row.description}</span>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    {
      key: "_actions",
      label: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-text-secondary hover:text-accent-dark transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeletingSubject(row);
            }}
            className="p-1.5 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingState message="Cargando..." height="page" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materias"
        subtitle="Catálogo de materias de la escuela"
        action={{
          label: "Nueva Materia",
          onClick: openCreateModal,
        }}
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">
          {error}
        </div>
      )}

      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={48} />}
          title="No hay materias registradas"
          description="Agrega materias al catálogo de la escuela."
          action={{ label: "Agregar Materia", onClick: openCreateModal }}
        />
      ) : (
        <Card>
          <CardBody className="!p-0">
            <DataTable columns={columns} data={subjects} />
          </CardBody>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSubject ? "Editar Materia" : "Nueva Materia"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Código"
              placeholder="MAT-101"
              error={errors.code?.message}
              {...register("code")}
            />
            <Select
              label="Grado"
              options={GRADE_OPTIONS}
              {...register("grade", {
                setValueAs: (v) => (v === "" ? null : Number(v)),
              })}
            />
          </div>
          <Input
            label="Nombre"
            placeholder="Matemáticas I"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Descripción (opcional)"
            placeholder="Álgebra, geometría, estadística..."
            error={errors.description?.message}
            {...register("description")}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={isSubmitting}>
              {editingSubject ? "Guardar cambios" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingSubject}
        onClose={() => setDeletingSubject(null)}
        onConfirm={handleDelete}
        title="Eliminar materia"
        message={`¿Estás seguro de eliminar "${deletingSubject?.name}" (${deletingSubject?.code})?`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />
    </div>
  );
}
