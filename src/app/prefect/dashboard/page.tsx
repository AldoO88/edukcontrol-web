// =====================================================================
// src/app/prefect/dashboard/page.tsx
// ---------------------------------------------------------------------
// Dashboard del prefecto — puerto web del PrefectDashboard.jsx de la
// app móvil. Mismas capacidades: stats del día (con la regla del "% —"
// de asistenciaPct), banner de citatorios pendientes, últimas
// incidencias, avisos recientes y las 5 áreas operativas (en la app
// son quick actions ocultos; en web viven en el sidebar Y aquí como
// accesos rápidos).
//
// Layout WEB (fase A del restilaje 2026-10-19) — fuera del stack
// vertical de la app: los 6 stats van en 2 filas de 3 (fila 1:
// Alumnos · Grupos · Alumnado; fila 2: Presentes · Faltas · % Asist.;
// móvil 2×3) y "Últimas Incidencias" / "Avisos Recientes" van en 2
// columnas en desktop. Misma data, mismos links.
//
// Fuente: GET /api/prefect/dashboard (hook usePrefectDashboard).
// =====================================================================

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { usePrefectDashboard } from "@/lib/hooks/usePrefectDashboard";
import { formatAsistPct } from "@/lib/asistenciaPct";
import {
  Users,
  UsersRound,
  ClipboardList,
  Percent,
  UserCheck,
  UserX,
  Megaphone,
  CalendarDays,
  ScrollText,
  DoorOpen,
  AlertTriangle,
  Activity,
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

// Tile de stat compacto (ícono + label + valor) que LLENA su celda
// de grid (h-full) para que la tira de stats se vea alineada en
// escritorio. `value` admite ReactNode (el tile "Alumnado" pinta
// niños/niñas inline) y `href` lo convierte en card clicable (los de
// Presentes/Faltas abren el drill-down de Asistencia del día).
function StatCard({
  icon: Icon,
  label,
  value,
  tint,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  tint: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-xl ${tint} shrink-0`}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-xl font-bold text-text-primary">{value}</p>
      </div>
    </div>
  );
  // Variante link → el tile entero navega al drill-down del día.
  if (href) {
    return (
      <Link href={href} className="block h-full">
        <Card className="h-full hover:shadow-md transition-shadow">
          <CardBody className="h-full">{inner}</CardBody>
        </Card>
      </Link>
    );
  }
  return (
    <Card className="h-full">
      <CardBody className="h-full">{inner}</CardBody>
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

      {/* Resumen del día — 6 tiles en 2 columnas de 3 (desktop y
          tablet: fila 1 = Alumnos · Grupos · Alumnado; fila 2 =
          Presentes · Faltas · % Asist.; móvil: 2×3). Presentes y
          Faltas son tiles-links al drill-down /prefect/today-attendance
          (antes: card "Asistencia de hoy"; mismos números). */}
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
          {/* Alumnado: los mismos números niños/niñas del card
              anterior, en línea (los íconos Mars/Venus ya denotan el
              género; sr-only conserva la lectura para lectores de
              pantalla). */}
          <StatCard
            icon={UsersRound}
            label="Alumnado"
            tint="bg-purple-100 text-purple-700"
            value={
              <span className="flex items-center gap-3 text-base">
                <span className="flex items-center gap-1 font-bold text-text-primary">
                  <Mars size={15} className="text-sky-600" aria-hidden />
                  <span className="sr-only">Niños: </span>
                  {stats.maleCount}
                </span>
                <span className="flex items-center gap-1 font-bold text-text-primary">
                  <Venus size={15} className="text-pink-500" aria-hidden />
                  <span className="sr-only">Niñas: </span>
                  {stats.femaleCount}
                </span>
              </span>
            }
          />
          {/* Links → drill-down de los registros de hoy (entry/exit
              por alumno con foto) en /prefect/today-attendance. */}
          <StatCard
            icon={UserCheck}
            label="Presentes hoy"
            value={stats.dayPresent}
            tint="bg-emerald-100 text-emerald-700"
            href="/prefect/today-attendance"
          />
          <StatCard
            icon={UserX}
            label="Faltas hoy"
            value={stats.dayAbsent}
            tint="bg-rose-100 text-rose-700"
            href="/prefect/today-attendance"
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

      {/* Incidencias y avisos — 2 columnas en desktop (en la app van
          apilados uno debajo del otro por el ancho de pantalla). Para
          romper el look monocromático: header con ícono en caja
          tintada (ámbar = incidencias, azul = avisos) + chip contador
          a la derecha; los avisos usan borde lateral sky en vez de
          gris y las filas responden al hover. */}
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
                      <p className="text-[11px] text-text-muted mt-1">De: {a.sender}</p>
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
