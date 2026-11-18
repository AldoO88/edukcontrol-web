// =====================================================================
// src/app/social-worker/dashboard/page.tsx
// ---------------------------------------------------------------------
// Dashboard del trabajador social — diseño propio (no espejo del del
// prefecto): el EJE de este rol es el avance de expedientes, así que
// el card de progreso va primero, seguido de los stats del día y de
// las columnas de incidencias/avisos.
//
// Fuente: GET /api/social-worker/dashboard + GET
// /api/social-worker/expedientes?summary_only=1 (hook
// useSocialWorkerDashboard, ambas en paralelo).
// =====================================================================

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ExpedientesProgressBar } from "@/components/social-worker/ExpedientesProgressBar";
import { useSocialWorkerDashboard } from "@/lib/hooks/useSocialWorkerDashboard";
import { formatAsistPct } from "@/lib/asistenciaPct";
import {
  Users,
  UsersRound,
  ClipboardList,
  Percent,
  UserCheck,
  UserX,
  Megaphone,
  Activity,
  FolderOpen,
  ArrowRight,
  Mars,
  Venus,
  type LucideIcon,
} from "lucide-react";

// Tile de stat compacto (ícono + label + valor) que LLENA su celda
// de grid (h-full) para que la tira de stats se vea alineada.
function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  tint: string;
}) {
  return (
    <Card className="h-full">
      <CardBody className="h-full flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-xl ${tint} shrink-0`}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-text-secondary">{label}</p>
          <p className="text-xl font-bold text-text-primary">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export default function SocialWorkerDashboardPage() {
  const { data, summary, isLoading, error } = useSocialWorkerDashboard();

  if (isLoading) return <LoadingState message="Cargando dashboard…" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <ErrorState message="Sin datos del dashboard." />;

  const { stats, school, socialWorker, currentDate } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${socialWorker?.name || "Trabajo Social"}`}
        subtitle={`${school?.name || ""}${currentDate ? ` · ${currentDate}` : ""}`}
      />

      {/* EJE del rol: avance de expedientes (link al listado) */}
      <Link href="/social-worker/expedientes" className="block">
        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardBody className="bg-emerald-50/60">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white shrink-0">
                <FolderOpen size={16} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-text-primary">
                  Avance de expedientes
                </h2>
                <p className="text-xs text-text-secondary">
                  Captura de fichas del ciclo {school?.cycle || "activo"}
                </p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                Ver listado <ArrowRight size={14} />
              </span>
            </div>
            {summary ? (
              <ExpedientesProgressBar summary={summary} />
            ) : (
              <p className="text-sm text-text-secondary">
                Sin datos de expedientes.
              </p>
            )}
          </CardBody>
        </Card>
      </Link>

      {/* Stats del día — 6 tiles en 2 filas de 3 (desktop) / 2×3 móvil */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">
          Resumen del día
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
          {/* Alumnado: números niños/niñas en línea (Mars/Venus ya
              denotan el género; sr-only conserva la lectura). */}
          <StatCard
            icon={UsersRound}
            label="Alumnado"
            tint="bg-purple-100 text-purple-700"
            value={
              <span className="flex items-center gap-3 text-base">
                <span className="flex items-center gap-1 font-bold text-text-primary">
                  <Mars size={16} className="text-sky-600" aria-hidden />
                  <span className="sr-only">Niños: </span>
                  {stats.maleCount}
                </span>
                <span className="flex items-center gap-1 font-bold text-text-primary">
                  <Venus size={16} className="text-pink-500" aria-hidden />
                  <span className="sr-only">Niñas: </span>
                  {stats.femaleCount}
                </span>
              </span>
            }
          />
          <StatCard
            icon={UserCheck}
            label="Presentes hoy"
            value={stats.dayPresent}
            tint="bg-emerald-100 text-emerald-700"
          />
          <StatCard
            icon={UserX}
            label="Faltas hoy"
            value={stats.dayAbsent}
            tint="bg-rose-100 text-rose-700"
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

      {/* Incidencias y avisos — 2 columnas en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="h-full">
          <CardBody>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <Activity size={16} />
              </div>
              <h3 className="text-sm font-bold text-text-primary">
                Últimas Incidencias
              </h3>
              <Badge variant="amber" className="ml-auto">
                {data.recentConductLogs.length}
              </Badge>
            </div>
            {data.recentConductLogs.length === 0 ? (
              <p className="text-sm text-text-secondary">Sin incidencias recientes.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentConductLogs.map((log, i) => (
                  <li
                    key={log._id || i}
                    className="py-2.5 -mx-2 px-2 rounded-lg hover:bg-slate-50 transition-colors flex items-start gap-3"
                  >
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

        <Card className="h-full">
          <CardBody>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 text-sky-700 shrink-0">
                <Megaphone size={16} />
              </div>
              <h3 className="text-sm font-bold text-text-primary">
                Avisos Recientes
              </h3>
              <Badge variant="sky" className="ml-auto">
                {data.recentAnnouncements.length}
              </Badge>
            </div>
            {data.recentAnnouncements.length === 0 ? (
              <p className="text-sm text-text-secondary">Sin avisos recientes.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentAnnouncements.map((a) => (
                  <li
                    key={a._id}
                    className={`py-2.5 pl-3 border-l-4 rounded-r-lg hover:bg-slate-50 transition-colors ${
                      a.priority === "urgent" ? "border-rose-500" : "border-sky-400"
                    }`}
                  >
                    <p className="text-sm font-semibold text-text-primary">{a.title}</p>
                    <p className="text-xs text-text-secondary truncate">{a.message}</p>
                    {a.sender && (
                      <p className="text-xs text-text-muted mt-1">De: {a.sender}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
