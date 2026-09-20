// Página de Materias (catálogo compartido, no scoped por ciclo)

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Subject } from "@/lib/types";
import { BookOpen } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const subjectSchema = z.object({
  code: z.string().min(1, "Código requerido"),
  name: z.string().min(1, "Nombre requerido"),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

export default function SubjectsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  });

  const fetchSubjects = async () => {
    try {
      const res = await api.get<{ items: Subject[] }>(
        `${ENDPOINTS.SUBJECTS}?school=${schoolId}`
      );
      setSubjects(res.items);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const onSubmit = async (data: SubjectFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(ENDPOINTS.SUBJECTS, {
        ...data,
        school: schoolId,
      });
      setIsModalOpen(false);
      reset();
      fetchSubjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la materia");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Subject>[] = [
    { key: "code", label: "Código" },
    { key: "name", label: "Nombre" },
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
        title="Materias"
        subtitle="Catálogo de materias de la escuela"
        action={{
          label: "Nueva Materia",
          onClick: () => setIsModalOpen(true),
        }}
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
      )}

      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={48} />}
          title="No hay materias registradas"
          description="Agrega materias al catálogo de la escuela."
          action={{ label: "Agregar Materia", onClick: () => setIsModalOpen(true) }}
        />
      ) : (
        <DataTable columns={columns} data={subjects} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Materia">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
          )}
          <Input
            label="Código"
            placeholder="MAT-001"
            error={errors.code?.message}
            {...register("code")}
          />
          <Input
            label="Nombre"
            placeholder="Matemáticas"
            error={errors.name?.message}
            {...register("name")}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={isSubmitting}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
