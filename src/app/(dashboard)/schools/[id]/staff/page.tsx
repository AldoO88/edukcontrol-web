// Página de Personal de la Escuela
// Muestra todos los roles: Docentes, Dirección, Prefectura, Trabajo Social.
// CRUD completo con modal que incluye preparación académica para docentes.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { AcademicRecordTable } from "@/components/ui/AcademicRecordTable";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { User, UserRole, AcademicRecord } from "@/lib/types";
import {
  Shield,
  GraduationCap,
  ChevronLeft,
  Plus,
  Phone,
  Mail,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const STAFF_ROLES: { role: UserRole; label: string; color: string; bgColor: string }[] = [
  { role: "principal", label: "Dirección", color: "text-emerald-600", bgColor: "bg-emerald-100" },
  { role: "teacher", label: "Docentes", color: "text-sky-600", bgColor: "bg-sky-100" },
  { role: "social_worker", label: "Trabajo Social", color: "text-rose-600", bgColor: "bg-rose-100" },
  { role: "prefect", label: "Prefectura", color: "text-violet-600", bgColor: "bg-violet-100" },
  { role: "registrar", label: "Control Escolar", color: "text-amber-600", bgColor: "bg-amber-100" },
];

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  principal: "Dirección",
  registrar: "Secretaría",
  teacher: "Docente",
  prefect: "Prefecto",
  social_worker: "Trabajo Social",
  tutor: "Tutor",
};

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-slate-100 text-slate-700",
  admin: "bg-blue-100 text-blue-700",
  principal: "bg-emerald-100 text-emerald-700",
  registrar: "bg-amber-100 text-amber-700",
  teacher: "bg-sky-100 text-sky-700",
  prefect: "bg-violet-100 text-violet-700",
  social_worker: "bg-rose-100 text-rose-700",
  tutor: "bg-slate-100 text-slate-600",
};

const staffSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  last_name: z.string().min(1, "Apellido requerido"),
  phoneNumber: z.string().regex(/^\d{10}$/, "Teléfono debe tener 10 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  sex: z.enum(["male", "female", ""]).optional(),
  role: z.string().min(1, "Rol requerido"),
});

type StaffFormData = z.infer<typeof staffSchema>;

const roleOptions = STAFF_ROLES.map((r) => ({ value: r.role, label: r.label }));

export default function SchoolStaffPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultRole, setDefaultRole] = useState<UserRole>("teacher");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [academicPrep, setAcademicPrep] = useState<AcademicRecord[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
  });

  const selectedRole = watch("role");

  const fetchUsers = async () => {
    try {
      const res = await api.get<{ items: User[] }>(
        ENDPOINTS.DASHBOARD_USERS(schoolId)
      );
      setUsers(res.items || []);
    } catch {
      setError("Error al cargar el personal.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [schoolId]);

  const openModal = (role: UserRole) => {
    setDefaultRole(role);
    setSubmitError(null);
    setAcademicPrep([]);
    reset({ name: "", last_name: "", phoneNumber: "", email: "", sex: "", role });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: StaffFormData) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(ENDPOINTS.SIGNUP, {
        name: data.name,
        last_name: data.last_name,
        phoneNumber: data.phoneNumber,
        email: data.email || undefined,
        sex: data.sex || undefined,
        role: data.role,
        school: schoolId,
        ...(data.role === "teacher" ? { academicPreparation: academicPrep } : {}),
      });
      setIsModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Error al guardar el personal.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando personal..." height="page" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: fetchUsers }}
      />
    );
  }

  const getUsersByRole = (role: UserRole) =>
    users.filter((u) => u.role === role);

  return (
    <div className="space-y-6">
      <Link
        href={`/schools/${schoolId}`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent-dark transition-colors"
      >
        <ChevronLeft size={16} />
        Volver a Escuela
      </Link>

      <PageHeader
        title="Personal de la Escuela"
        subtitle={`${users.length} miembro${users.length !== 1 ? "s" : ""}`}
        action={{
          label: "Agregar Personal",
          onClick: () => openModal(defaultRole),
          icon: <Plus size={18} />,
        }}
      />

      {STAFF_ROLES.map(({ role, label, color, bgColor }) => {
        const roleUsers = getUsersByRole(role);
        return (
          <div key={role} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${bgColor}`}>
                {role === "teacher" ? (
                  <GraduationCap size={16} className={color} />
                ) : (
                  <Shield size={16} className={color} />
                )}
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                {label}
              </h3>
              <span className="text-sm text-text-muted">
                ({roleUsers.length})
              </span>
            </div>

            {roleUsers.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-sm text-text-muted text-center py-4">
                    No hay personal de {label.toLowerCase()} registrado.
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roleUsers.map((user) => (
                  <Card key={user._id}>
                    <CardBody>
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${bgColor}`}
                        >
                          <span className={`font-bold text-lg ${color}`}>
                            {user.name.charAt(0)}
                            {(user.last_name || "").charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-text-primary truncate">
                            {user.name} {user.last_name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                            <Phone size={12} className="text-text-muted" />
                            {user.phoneNumber}
                          </div>
                          {user.email && (
                            <div className="flex items-center gap-1.5 text-xs text-text-muted truncate">
                              <Mail size={10} />
                              {user.email}
                            </div>
                          )}
                          <div className="mt-1.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE_COLORS[user.role]}`}
                            >
                              {ROLE_LABELS[user.role]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-auto">
                          <Badge variant={user.isActive ? "emerald" : "rose"}>
                            {user.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal Agregar Personal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Agregar Personal"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="px-4 py-3 bg-error-light text-error rounded-lg text-sm">
              {submitError}
            </div>
          )}

          <Select
            label="Rol"
            options={roleOptions}
            error={errors.role?.message}
            {...register("role")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Apellido"
              error={errors.last_name?.message}
              {...register("last_name")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              placeholder="10 dígitos"
              error={errors.phoneNumber?.message}
              {...register("phoneNumber")}
            />
            <Select
              label="Sexo"
              options={[
                { value: "", label: "Seleccionar" },
                { value: "male", label: "Masculino" },
                { value: "female", label: "Femenino" },
              ]}
              {...register("sex")}
            />
          </div>

          <Input
            label="Email (opcional)"
            placeholder="correo@ejemplo.com"
            error={errors.email?.message}
            {...register("email")}
          />

          {selectedRole === "teacher" && (
            <div className="border-t border-border pt-4">
              <AcademicRecordTable
                value={academicPrep}
                onChange={setAcademicPrep}
              />
            </div>
          )}

          <p className="text-xs text-text-muted">
            La cuenta se activa vía OTP. No se requiere contraseña.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={submitting}>
              Agregar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
