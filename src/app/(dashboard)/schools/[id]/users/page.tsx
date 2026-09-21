// Página de Usuarios a nivel Escuela
// Lista todos los usuarios de la escuela (admin, registrar, teacher, etc.).

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { User, UserRole } from "@/lib/types";
import { Users, Search, ChevronLeft } from "lucide-react";

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

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-slate-100 text-slate-700",
  admin: "bg-blue-100 text-blue-700",
  principal: "bg-emerald-100 text-emerald-700",
  registrar: "bg-amber-100 text-amber-700",
  teacher: "bg-sky-100 text-sky-700",
  prefect: "bg-violet-100 text-violet-700",
  social_worker: "bg-rose-100 text-rose-700",
  tutor: "bg-slate-100 text-slate-600",
};

const ROLE_OPTIONS = [
  { value: "", label: "Todos los roles" },
  { value: "admin", label: "Administrador" },
  { value: "principal", label: "Dirección" },
  { value: "registrar", label: "Secretaría" },
  { value: "teacher", label: "Docente" },
  { value: "prefect", label: "Prefecto" },
  { value: "social_worker", label: "Trabajo Social" },
];

export default function SchoolUsersPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await api.get<{ items: User[] }>(
        ENDPOINTS.DASHBOARD_USERS(schoolId)
      );
      setUsers(res.items || []);
    } catch {
      setError("Error al cargar los usuarios.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [schoolId]);

  if (isLoading) {
    return <LoadingState message="Cargando usuarios..." height="page" />;
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

  const filtered = users.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      `${u.name} ${u.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phoneNumber.includes(searchQuery) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = !roleFilter || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

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
        title="Usuarios"
        subtitle={`${users.length} usuario${users.length !== 1 ? "s" : ""} registrado${users.length !== 1 ? "s" : ""}`}
      />

      {users.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nombre, teléfono o email..."
                  icon={<Search size={18} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  options={ROLE_OPTIONS}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {users.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No hay usuarios registrados"
          description="Los usuarios se crean desde la administración."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="Sin resultados"
          description="No se encontraron usuarios con ese criterio."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((user) => (
            <Card key={user._id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-sky-100 rounded-xl shrink-0">
                      <span className="text-sky-600 font-bold text-lg">
                        {user.name.charAt(0)}{(user.last_name || "").charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">
                        {user.name} {user.last_name}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {user.phoneNumber}
                      </p>
                      {user.email && (
                        <p className="text-xs text-text-muted truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={user.isActive ? "emerald" : "rose"}>
                    {user.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      ROLE_COLORS[user.role] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
