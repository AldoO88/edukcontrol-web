// Página de Personal del Ciclo Escolar (solo lectura)
// Muestra todos los roles: Dirección, Docentes, Trabajo Social, Prefectura, Control Escolar.
// Modal de detalle con preparación académica.

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { AcademicRecordTable } from "@/components/ui/AcademicRecordTable";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { User, UserRole } from "@/lib/types";
import {
  Shield,
  GraduationCap,
  Search,
  Phone,
  Mail,
  X,
} from "lucide-react";

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
  registrar: "Control Escolar",
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

export default function PersonalPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.phoneNumber?.includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const getUsersByRole = (role: UserRole) =>
    filteredUsers.filter((u) => u.role === role);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal"
        subtitle={`${users.length} miembro${users.length !== 1 ? "s" : ""} en la escuela`}
      />

      {users.length > 0 && (
        <Card>
          <CardBody>
            <Input
              placeholder="Buscar por nombre, teléfono o email..."
              icon={<Search size={18} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </CardBody>
        </Card>
      )}

      {users.length === 0 ? (
        <EmptyState
          icon={<Shield size={48} />}
          title="No hay personal registrado"
          description="Registra personal desde la configuración de la escuela."
        />
      ) : (
        STAFF_ROLES.map(({ role, label, color, bgColor }) => {
          const roleUsers = getUsersByRole(role);
          if (roleUsers.length === 0 && searchQuery) return null;
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
                    <div
                      key={user._id}
                      onClick={() => setSelectedUser(user)}
                      className="cursor-pointer"
                    >
                      <Card className="hover:shadow-md transition-shadow">
                        <CardBody>
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${bgColor}`}
                          >
                            <span className={`font-bold text-lg ${color}`}>
                              {user.name?.charAt(0)}
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Modal Detalle Personal (solo lectura) */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="Detalle del Personal"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            {/* Header con avatar y nombre */}
            <div className="flex items-center gap-4">
              {(() => {
                const roleConfig = STAFF_ROLES.find((r) => r.role === selectedUser.role);
                const bgColor = roleConfig?.bgColor || "bg-slate-100";
                const color = roleConfig?.color || "text-slate-600";
                return (
                  <div className={`flex items-center justify-center w-16 h-16 rounded-xl shrink-0 ${bgColor}`}>
                    <span className={`font-bold text-2xl ${color}`}>
                      {selectedUser.name?.charAt(0)}
                      {(selectedUser.last_name || "").charAt(0)}
                    </span>
                  </div>
                );
              })()}
              <div>
                <h3 className="text-xl font-bold text-text-primary">
                  {selectedUser.name} {selectedUser.last_name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE_COLORS[selectedUser.role]}`}
                  >
                    {ROLE_LABELS[selectedUser.role]}
                  </span>
                  <Badge variant={selectedUser.isActive ? "emerald" : "rose"}>
                    {selectedUser.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Info de contacto */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <p className="text-xs text-text-muted mb-1">Teléfono</p>
                <p className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <Phone size={14} className="text-text-muted" />
                  {selectedUser.phoneNumber || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Email</p>
                <p className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <Mail size={14} className="text-text-muted" />
                  {selectedUser.email || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Sexo</p>
                <p className="text-sm font-medium text-text-primary">
                  {selectedUser.sex === "male"
                    ? "Masculino"
                    : selectedUser.sex === "female"
                      ? "Femenino"
                      : "—"}
                </p>
              </div>
            </div>

            {/* Preparación académica */}
            {selectedUser.academicPreparation &&
              selectedUser.academicPreparation.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <AcademicRecordTable
                    value={selectedUser.academicPreparation}
                    onChange={() => {}}
                    readonly
                  />
                </div>
              )}

            {/* Botón cerrar */}
            <div className="flex justify-end pt-4">
              <Button variant="ghost" onClick={() => setSelectedUser(null)}>
                <X size={16} className="mr-1.5" />
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
