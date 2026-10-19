// =====================================================================
// src/app/prefect/dashboard/page.tsx
// ---------------------------------------------------------------------
// Dashboard del prefecto — puerto web del PrefectDashboard.jsx de la
// app móvil. Mismas capacidades: stats del día (con la regla del "% —"
// de asistenciaPct), banner de citatorios pendientes, últimas
// incidencias, avisos recientes y las 5 áreas operativas (en la app
// son quick actions ocultos; en web viv en el sidebar Y aquí como
// accesos rápidos).
//
// Fuente: GET /api/prefect/dashboard (hook usePrefectDashboard).
// =====================================================================

"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { usePrefectDashboard } from "@/lib/hooks/usePrefectDashboard";
import { formatAsistPct } from "@/lib/asistenciaPct";
import {
  Users,
  ClipboardList,
  Percent,
  UserCheck,
  UserX,
  Megaphone,
  CalendarDays,
  ScrollText,
  DoorOpen,
  AlertTriangle,
  ChevronRight,
  Mars,
  Venus,
  type LucideIcon,
} from "lucide-react";

// Accesos rápidos a las áreas operativas (mismas 5 que los quick
// actions de la app).
const QUICK_ACTIONS: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Avisos", href: "/prefect/announcements", icon: Megaphone },
  { label: "Citatorios", href: "/prefect/citations", icon: CalendarDays },
  { label: "Reportes", href: "/prefect/reports", icon: ScrollText },
  { label: "Pase de salida", href: "/prefect/exit-passes", icon: DoorOpen },
  { label: "Inasistencias", href: "/prefect/attendance-summary", icon: UserX },
];

// Card pequeña de stat (misma estética de tarjetas de la app).
function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tint: string;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${tint}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">{label}</p>
            <p className="text-xl font-bold text-text-primary">{value}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function PrefectDashboardPage() {
  const { data, isLoading, error } = usePrefectDashboard();

  if (isLoading) return <LoadingState message="Cargando dashboard…" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <ErrorState message="Sin datos del dashboard." />;

  const { stats, school, prefect, currentDate } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${prefect?.name || "Prefecto"}`}
        subtitle={`${school?.name || ""}${currentDate ? ` · ${currentDate}` : ""}`}
      />

      {/* Accesos rápidos a las áreas operativas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card>
                <CardBody className="flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 text-accent-dark shrink-0">
                    <Icon size={20} />
                  </div>
                  <span className="text-sm font-semibold text-text-primary">
                    {action.label}
                  </span>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Banner de citatorios pendientes */}
      {data.pendingCitationsCount > 0 && (
        <Link href="/prefect/citations">
          <Card className="border-l-4 border-l-amber-500">
            <CardBody className="flex items-center gap-3 bg-amber-50">
              <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              <p className="text-sm font-medium text-amber-800">
                Tienes {data.pendingCitationsCount} citatorio
                {data.pendingCitationsCount === 1 ? "" : "s"} pendiente
                {data.pendingCitationsCount === 1 ? "" : "s"} de atención.
              </p>
            </CardBody>
          </Card>
        </Link>
      )}

      {/* Resumen del día */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">
          Resumen del día
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            icon={Users}
            label="Alumnos"
            value={stats.totalStudents}
            tint="bg-sky-100 text-sky-700"
          />
          <StatCard
            icon={ClipboardList}
            label="Grupos"
            value={stats.totalGroups}
            tint="bg-indigo-100 text-indigo-700"
          />
          {/* % con la MISMA regla de la app: umbral 50% de matrícula
              → "—" si el día no es representativo. */}
          <StatCard
            icon={Percent}
            label="% Asist."
            value={formatAsistPct(stats)}
            tint="bg-emerald-100 text-emerald-700"
          />
        </div>
      </div>

      {/* Niños/Niñas + Presentes/Faltas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardBody>
            <p className="text-xs text-text-secondary mb-3">Alumnado</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Mars size={20} className="text-sky-600" />
                <span className="text-lg font-bold text-text-primary">{stats.maleCount}</span>
                <span className="text-sm text-text-secondary">Niños</span>
              </div>
              <div className="flex items-center gap-2">
                <Venus size={20} className="text-pink-500" />
                <span className="text-lg font-bold text-text-primary">{stats.femaleCount}</span>
                <span className="text-sm text-text-secondary">Niñas</span>
              </div>
            </div>
          </CardBody>
        </Card>
        {/* Card enlazada → drill-down de los registros de hoy (entry/exit
            por alumno con foto) en /prefect/today-attendance. */}
        <Link href="/prefect/today-attendance">
          <Card className="h-full hover:shadow-md transition-shadow">
            <CardBody className="h-full">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-text-secondary">Asistencia de hoy</p>
                <ChevronRight size={14} className="text-slate-400" />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <UserCheck size={20} className="text-emerald-600" />
                  <span className="text-lg font-bold text-text-primary">{stats.dayPresent}</span>
                  <span className="text-sm text-text-secondary">Presentes</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserX size={20} className="text-rose-500" />
                  <span className="text-lg font-bold text-text-primary">{stats.dayAbsent}</span>
                  <span className="text-sm text-text-secondary">Faltas</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* Últimas incidencias */}
      <Card>
        <CardBody>
          <h3 className="text-sm font-semibold text-text-secondary mb-3">
            Últimas Incidencias
          </h3>
          {data.recentConductLogs.length === 0 ? (
            <p className="text-sm text-text-secondary">Sin incidencias recientes.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentConductLogs.map((log, i) => (
                <li key={log._id || i} className="py-2.5 flex items-start gap-3">
                  <Badge variant={log.eventType === "merit" ? "emerald" : "rose"}>
                    {log.eventType === "merit" ? "Mérito" : "Demérito"}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {log.studentName || "Alumno"}
                    </p>
                    <p className="text-xs text-text-secondary truncate">{log.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Avisos recientes */}
      <Card>
        <CardBody>
          <h3 className="text-sm font-semibold text-text-secondary mb-3">
            Avisos Recientes
          </h3>
          {data.recentAnnouncements.length === 0 ? (
            <p className="text-sm text-text-secondary">Sin avisos recientes.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentAnnouncements.map((a) => (
                <li
                  key={a._id}
                  className={`py-2.5 pl-3 border-l-4 ${
                    a.priority === "urgent" ? "border-rose-500" : "border-slate-200"
                  }`}
                >
                  <p className="text-sm font-semibold text-text-primary">{a.title}</p>
                  <p className="text-xs text-text-secondary truncate">{a.message}</p>
                  {a.sender && (
                    <p className="text-[11px] text-text-muted mt-1">De: {a.sender}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
