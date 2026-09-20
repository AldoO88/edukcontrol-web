// Página de Gestión de Usuarios

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { ENDPOINTS, ROLES } from "@/lib/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users } from "lucide-react";

const userSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  last_name: z.string().optional(),
  phoneNumber: z.string().regex(/^\d{10}$/, "Teléfono debe tener 10 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  password: z.string().min(8, "Contraseña debe tener al menos 8 caracteres"),
  role: z.enum([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.PRINCIPAL,
    ROLES.REGISTRAR,
    ROLES.TEACHER,
    ROLES.PREFECT,
    ROLES.SOCIAL_WORKER,
  ]),
});

type UserFormData = z.infer<typeof userSchema>;

const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: "Administrador" },
  { value: ROLES.PRINCIPAL, label: "Director" },
  { value: ROLES.REGISTRAR, label: "Secretario/a" },
  { value: ROLES.TEACHER, label: "Maestro/a" },
  { value: ROLES.PREFECT, label: "Prefecto/a" },
  { value: ROLES.SOCIAL_WORKER, label: "Trabajador/a Social" },
];

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: ROLES.ADMIN,
    },
  });

  const onSubmit = async (data: UserFormData) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      await api.post(ENDPOINTS.SIGNUP, {
        name: data.name,
        last_name: data.last_name || undefined,
        phoneNumber: data.phoneNumber,
        email: data.email || undefined,
        password: data.password,
        role: data.role,
      });
      setSuccess("Usuario creado exitosamente.");
      setIsModalOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        subtitle="Gestión de usuarios administradores del sistema"
        action={{
          label: "Nuevo Usuario",
          onClick: () => setIsModalOpen(true),
        }}
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
          {success}
        </div>
      )}

      <Card>
        <CardBody>
          <div className="flex items-center justify-center py-12 text-text-secondary">
            <div className="text-center">
              <Users size={48} className="mx-auto mb-4 text-text-muted" />
              <p className="text-lg font-medium">Gestión de Usuarios</p>
              <p className="text-sm mt-1">
                Crea y administra usuarios administradores, directores, maestros y demás personal.
              </p>
              <Button
                variant="sky"
                className="mt-4"
                onClick={() => setIsModalOpen(true)}
              >
                Crear Primer Usuario
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Usuario">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              placeholder="Juan"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Apellido (opcional)"
              placeholder="Pérez"
              error={errors.last_name?.message}
              {...register("last_name")}
            />
          </div>
          <Input
            label="Teléfono"
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
          <Input
            label="Contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            error={errors.password?.message}
            {...register("password")}
          />
          <Select
            label="Rol"
            options={ROLE_OPTIONS}
            error={errors.role?.message}
            {...register("role")}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={isSubmitting}>
              Crear Usuario
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
