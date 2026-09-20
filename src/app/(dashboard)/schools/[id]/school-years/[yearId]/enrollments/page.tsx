// Página de Matrícula de Alumnos

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
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Enrollment, Student, Group } from "@/lib/types";
import { BookUser } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const enrollmentSchema = z.object({
  student_id: z.string().min(1, "Alumno requerido"),
  group_id: z.string().min(1, "Grupo requerido"),
  school_year_id: z.string().min(1, "Ciclo escolar requerido"),
  grade: z.number().min(1).max(6),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

export default function EnrollmentsPage() {
  const params = useParams();
  const yearId = params.yearId as string;
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
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
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      school_year_id: yearId,
    },
  });

  const fetchData = async () => {
    try {
      const [enrollRes, studentsRes, groupsRes] = await Promise.all([
        api.get<Enrollment[]>(`${ENDPOINTS.ENROLLMENTS}?school_year_id=${yearId}`),
        api.get<{ items: Student[] }>(ENDPOINTS.STUDENTS),
        api.get<Group[]>(`${ENDPOINTS.GROUPS}?school_year_id=${yearId}`),
      ]);
      setEnrollments(enrollRes);
      setStudents(studentsRes.items);
      setGroups(groupsRes);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: EnrollmentFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(ENDPOINTS.ENROLLMENTS, data);
      setIsModalOpen(false);
      reset();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al matricular");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusMap: Record<string, { label: string; variant: "emerald" | "rose" | "amber" }> = {
    enrolled: { label: "Inscrito", variant: "emerald" },
    withdrawn: { label: "Baja", variant: "rose" },
    graduated: { label: "Graduado", variant: "amber" },
    transferred: { label: "Transferido", variant: "amber" },
  };

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
        title="Matrícula"
        subtitle="Gestión de inscripciones de alumnos"
        action={{
          label: "Nueva Matrícula",
          onClick: () => setIsModalOpen(true),
        }}
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
      )}

      {enrollments.length === 0 ? (
        <EmptyState
          icon={<BookUser size={48} />}
          title="No hay matrículas registradas"
          description="Inscribe alumnos en grupos para comenzar a gestionar su asistencia y calificaciones."
          action={{ label: "Nueva Matrícula", onClick: () => setIsModalOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrollments.map((enroll) => {
            const student = enroll.student_id as Student;
            const group = enroll.group_id as Group;
            const status = statusMap[enroll.cycle_status] || statusMap.enrolled;

            return (
              <Card key={enroll._id}>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-text-primary">
                        {student?.first_name} {student?.last_name || ""}
                      </h3>
                      <p className="text-sm text-text-secondary mt-1">
                        {group ? `${group.grade}°${group.section}` : "—"}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Matrícula">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Alumno"
            placeholder="Seleccionar alumno"
            options={students.map((s) => ({
              value: s._id,
              label: `${s.first_name} ${s.last_name || ""} (${s.controlNumber || ""})`,
            }))}
            error={errors.student_id?.message}
            {...register("student_id")}
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
              Inscribir
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
