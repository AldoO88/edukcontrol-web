// Página de Registro de Alumno

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const studentSchema = z.object({
  first_name: z.string().min(1, "Nombre requerido"),
  last_name: z.string().min(1, "Apellido requerido"),
  curp: z.string().regex(/^[A-Z0-9]{18}$/, "CURP debe tener 18 caracteres alfanuméricos"),
  rfid_card: z.string().optional(),
  sex: z.enum(["male", "female", ""]).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  blood_type: z.string().optional(),
  medical_notes: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

export default function NewStudentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const onSubmit = async (data: StudentFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(ENDPOINTS.STUDENTS + "/register", {
        ...data,
        rfid_card: data.rfid_card || undefined,
        sex: data.sex || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        date_of_birth: data.date_of_birth || undefined,
        blood_type: data.blood_type || undefined,
        medical_notes: data.medical_notes || undefined,
      });
      router.push("/students");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el alumno");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrar Alumno"
        subtitle="Agregar nuevo alumno al sistema"
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">{error}</div>
      )}

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
            <Input
              label="CURP"
              placeholder="18 caracteres alfanuméricos"
              error={errors.curp?.message}
              {...register("curp")}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre(s)"
                placeholder="María"
                error={errors.first_name?.message}
                {...register("first_name")}
              />
              <Input
                label="Apellido(s)"
                placeholder="López García"
                error={errors.last_name?.message}
                {...register("last_name")}
              />
            </div>
            <Input
              label="Tarjeta RFID (opcional)"
              placeholder="Número de tarjeta"
              error={errors.rfid_card?.message}
              {...register("rfid_card")}
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
            <Input
              label="Fecha de Nacimiento (opcional)"
              type="date"
              error={errors.date_of_birth?.message}
              {...register("date_of_birth")}
            />
            <Input
              label="Teléfono (opcional)"
              placeholder="Teléfono del alumno"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <Input
              label="Dirección (opcional)"
              placeholder="Calle, número, colonia"
              error={errors.address?.message}
              {...register("address")}
            />
            <Input
              label="Tipo de Sangre (opcional)"
              placeholder="A+, O-, B+"
              error={errors.blood_type?.message}
              {...register("blood_type")}
            />
            <Input
              label="Notas Médicas (opcional)"
              placeholder="Alergias, condiciones, etc."
              error={errors.medical_notes?.message}
              {...register("medical_notes")}
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
