// Página de Registro de Maestro a nivel Escuela
// Crea un maestro (User con role=teacher) vinculado a esta escuela.
// Sin contraseña — el maestro activa su cuenta vía OTP después.

"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AcademicRecordTable } from "@/components/ui/AcademicRecordTable";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { AcademicRecord } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const teacherSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  last_name: z.string().min(1, "Apellido requerido"),
  phoneNumber: z.string().regex(/^\d{10}$/, "Teléfono debe tener 10 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  sex: z.enum(["M", "F", ""]).optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

export default function NewTeacherPage() {
  const router = useRouter();
  const params = useParams();
  const schoolId = params.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [academicPrep, setAcademicPrep] = useState<AcademicRecord[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
  });

  const onSubmit = async (data: TeacherFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(ENDPOINTS.SIGNUP, {
        name: data.name,
        last_name: data.last_name,
        phoneNumber: data.phoneNumber,
        email: data.email || undefined,
        sex: data.sex || undefined,
        academicPreparation: academicPrep,
        role: "teacher",
        school: schoolId,
      });
      router.push(`/schools/${schoolId}/teachers`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el maestro");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrar Maestro"
        subtitle="Agregar nuevo personal docente a la escuela"
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
      )}

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre(s)"
                placeholder="Juan"
                error={errors.name?.message}
                {...register("name")}
              />
              <Input
                label="Apellido(s)"
                placeholder="Pérez García"
                error={errors.last_name?.message}
                {...register("last_name")}
              />
            </div>
            <Input
              label="Teléfono"
              type="tel"
              placeholder="10 dígitos"
              error={errors.phoneNumber?.message}
              {...register("phoneNumber")}
            />
            <Input
              label="Email (opcional)"
              type="email"
              placeholder="correo@ejemplo.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Select
              label="Sexo (opcional)"
              options={[
                { value: "", label: "No especificado" },
                { value: "male", label: "Masculino" },
                { value: "female", label: "Femenino" },
              ]}
              {...register("sex")}
            />
            <AcademicRecordTable
              value={academicPrep}
              onChange={setAcademicPrep}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" variant="sky" isLoading={isSubmitting}>
                Registrar
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
