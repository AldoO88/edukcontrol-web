// Dashboard Super Admin
// Stats globales + tabla de escuelas con filtros

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import {
  School as SchoolIcon,
  Users,
  GraduationCap,
  ClipboardList,
  Search,
  ArrowRight,
  Settings,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface SchoolListItem {
  _id: string;
  name: string;
  cct: string;
  honoraryName?: string;
  logoUrl?: string;
  isActive: boolean;
  currentSchoolYear?: string | null;
  shifts: string[];
  classDuration?: number | null;
  staffCount: number;
  teachersCount: number;
  studentsCount: number;
  groupsCount: number;
}

interface DashboardData {
  schools: { total: number; active: number };
  users: { total: number; thisMonth: number };
  students: { active: number; schoolYear: string };
  schoolsList: SchoolListItem[];
}

interface PendingTaskIssue {
  kind: string;
  message: string;
}

interface PendingTask {
  school_id: string;
  school_name: string;
  school_year_id: string | null;
  school_year_name: string | null;
  issues: PendingTaskIssue[];
}

interface PendingTasksData {
  tasks: PendingTask[];
  total_schools: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTasksData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [dashRes, tasksRes] = await Promise.all([
          api.get<DashboardData>(ENDPOINTS.DASHBOARD_SUPER_ADMIN),
          api.get<PendingTasksData>(ENDPOINTS.DASHBOARD_PENDING_TASKS),
        ]);
        setData(dashRes);
        setPendingTasks(tasksRes);
      } catch {
        // Error silencioso
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const filteredSchools = useMemo(() => {
    if (!data) return [];
    return data.schoolsList.filter((school) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          school.name.toLowerCase().includes(q) ||
          school.cct.toLowerCase().includes(q) ||
          school.honoraryName?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      // Shift filter
      if (shiftFilter !== "all") {
        const shiftLabel = shiftFilter === "matutino" ? "Matutino" : "Vespertino";
        if (!school.shifts.includes(shiftLabel)) return false;
      }
      // Status filter
      if (statusFilter === "active" && !school.isActive) return false;
      if (statusFilter === "inactive" && school.isActive) return false;
      return true;
    });
  }, [data, searchQuery, shiftFilter, statusFilter]);

  if (isLoading) {
    return <LoadingState message="Cargando dashboard..." height="page" />;
  }

  if (!data) {
    return (
      <ErrorState
        title="No se pudieron cargar los datos"
        message="Intenta de nuevo más tarde."
        action={{
          label: "Reintentar",
          onClick: () => window.location.reload(),
        }}
      />
    );
  }

  const stats = [
    {
      label: "Escuelas Registradas",
      value: data.schools.total,
      subtitle: `${data.schools.active} activas`,
      icon: <SchoolIcon size={24} />,
      color: "text-sky-600",
      bgColor: "bg-sky-100",
    },
    {
      label: "Usuarios Totales",
      value: data.users.total,
      subtitle: data.users.thisMonth > 0 ? `↑${data.users.thisMonth} este mes` : "Sin cambios este mes",
      icon: <Users size={24} />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      label: "Alumnos Activos",
      value: data.students.active.toLocaleString(),
      subtitle: `Ciclo ${data.students.schoolYear}`,
      icon: <GraduationCap size={24} />,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      label: "Grupos Activos",
      value: data.schoolsList.reduce((acc, s) => acc + s.groupsCount, 0),
      subtitle: data.schoolsList.reduce((acc, s) => acc + s.studentsCount, 0).toLocaleString() + " alumnos",
      icon: <ClipboardList size={24} />,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Super Admin Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Control global de escuelas afiliadas, periodos y aprovisionamiento SaaS
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/schools/new">
            <Button variant="sky">
              + Nueva Escuela
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-text-primary mt-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    {stat.subtitle}
                  </p>
                </div>
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.bgColor}`}>
                  <span className={stat.color}>{stat.icon}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Pending Tasks Section */}
      {pendingTasks && pendingTasks.tasks.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <AlertTriangle
                    size={20}
                    className="text-amber-600"
                  />
                  Tareas Pendientes
                </h2>
                <p className="text-sm text-text-secondary">
                  {pendingTasks.tasks.length} escuela
                  {pendingTasks.tasks.length === 1 ? "" : "s"} con piezas de
                  configuracion faltantes
                </p>
              </div>
              <Badge variant="amber">{pendingTasks.tasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {pendingTasks.tasks.map((task) => (
                <Link
                  key={task.school_id}
                  href={`/schools/${task.school_id}${
                    task.school_year_id ? `/school-years/${task.school_year_id}` : ""
                  }`}
                  className="block p-3 border border-border rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-amber-50 rounded-lg shrink-0">
                      <SchoolIcon size={18} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-text-primary text-sm">
                          {task.school_name}
                        </p>
                        {task.school_year_name && (
                          <Badge variant="slate">
                            {task.school_year_name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {task.issues.map((iss) => (
                          <span
                            key={iss.kind}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"
                          >
                            {iss.message}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight
                      size={18}
                      className="text-text-muted self-center shrink-0"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {pendingTasks && pendingTasks.tasks.length === 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 p-3 rounded-xl">
              <CheckCircle2 size={20} />
              <div>
                <p className="font-semibold text-sm">
                  Todas las escuelas están completamente configuradas
                </p>
                <p className="text-xs text-emerald-700">
                  No hay tareas pendientes
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Schools Table Section */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                Escuelas Administradas
              </h2>
              <p className="text-sm text-text-secondary">
                Control operativo multicampus, asignación de turnos y gestión de periodos escolares
              </p>
            </div>
            <Badge variant="sky">
              {data.schools.total} Planteles
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por nombre o CCT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-xl text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">Todos los turnos</option>
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-xl text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>

          {/* Table */}
          {filteredSchools.length === 0 ? (
            <EmptyState
              icon={<SchoolIcon size={48} />}
              title="No se encontraron escuelas"
              description={searchQuery ? "Intenta con otros términos de búsqueda" : "No hay escuelas registradas"}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider pb-3 pr-4">
                      Escuela
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider pb-3 pr-4">
                      Turnos
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider pb-3 pr-4">
                      Duración Clase
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider pb-3 pr-4">
                      Personal
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider pb-3 pr-4">
                      Estado
                    </th>
                    <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider pb-3">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {filteredSchools.map((school) => (
                    <tr key={school._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          {school.logoUrl ? (
                            <img
                              src={school.logoUrl}
                              alt={`Logo de ${school.name}`}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-10 h-10 bg-accent/10 rounded-lg">
                              <span className="text-sm font-bold text-accent-dark">
                                {school.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-text-primary text-sm">
                              {school.name}
                            </p>
                            <p className="text-xs text-text-secondary">
                              CCT: {school.cct}
                              {school.honoraryName && ` • ${school.honoraryName}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex gap-1.5">
                          {school.shifts.map((shift) => (
                            <Badge
                              key={shift}
                              variant={shift === "Matutino" ? "sky" : "amber"}
                            >
                              {shift}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="text-sm text-text-secondary">
                          {school.classDuration ? `${school.classDuration} min` : "—"}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {school.staffCount} miembros
                          </p>
                          <p className="text-xs text-text-secondary">
                            {school.teachersCount} docentes • {school.staffCount - school.teachersCount} admin
                          </p>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge variant={school.isActive ? "emerald" : "rose"}>
                          {school.isActive ? "Operativa" : "Inactiva"}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/schools/${school._id}`}>
                            <Button variant="sky" size="sm">
                              Administrar
                              <ArrowRight size={14} className="ml-1" />
                            </Button>
                          </Link>
                          <Link href={`/schools/${school._id}`}>
                            <Button variant="ghost" size="sm">
                              <Settings size={14} />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
