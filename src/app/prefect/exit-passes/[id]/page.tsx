// =====================================================================
// src/app/prefect/exit-passes/[id]/page.tsx
// ---------------------------------------------------------------------
// Detalle de Pase de Salida — puerto web de exit-passes/[id].jsx.
// Solo lectura (la app tampoco ofrece acciones aquí): datos del
// alumno (→ ficha), quién retira, parentesco, motivo + detalles, hora
// de salida, fecha de registro y quién lo registró.
// Fuente: hook useExitPassDetail.
// =====================================================================

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useExitPassDetail } from "@/lib/hooks/useExitPassDetail";
import { StudentAvatar } from "@/app/prefect/_components/StudentAvatar";
import { formatFullDateTime, formatTime12 } from "@/lib/dates";
import { Calendar, Clock, LogOut, Shield, UserCheck, UserRound } from "lucide-react";

// Catálogos (idénticos a la lista).
const RELATIONSHIP_LABELS: Record<string, string> = {
  father: "Padre",
  mother: "Madre",
  guardian: "Tutor",
  family: "Familiar",
};
const REASON_LABELS: Record<string, string> = {
  illness: "Enfermedad",
  medical: "Cita médica",
  family: "Asunto familiar",
  personal: "Personal",
  other: "Otro",
};

// Fila de dato del detalle.
function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={16} className="text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-text-primary break-words">{value}</p>
      </div>
    </div>
  );
}

export default function PrefectExitPassDetailPage() {
  const params = useParams<{ id: string }>();
  const { exitPass, isLoading, error, refetch } = useExitPassDetail(params.id);

  if (isLoading) return <LoadingState message="Cargando pase de salida…" />;
  if (error || !exitPass) {
    return (
      <ErrorState
        message={error || "No se pudo cargar el pase de salida."}
        action={{ label: "Reintentar", onClick: refetch }}
      />
    );
  }

  const student =
    exitPass.student && typeof exitPass.student === "object" ? exitPass.student : null;
  const studentName = student
    ? `${student.last_name || ""}, ${student.first_name || ""}`.replace(/^,\s*/, "")
    : "Sin alumno";
  const fullName = student
    ? `${student.first_name || ""} ${student.last_name || ""}`.trim()
    : studentName;
  const groupLabel =
    student && typeof student.current_group_id === "object" && student.current_group_id
      ? `${student.current_group_id.grade ?? ""}°${student.current_group_id.section ?? ""}`
      : "";
  const registrar =
    (exitPass.created_by && typeof exitPass.created_by === "object"
      ? `${exitPass.created_by.last_name || ""} ${exitPass.created_by.name || ""}`.trim() ||
        exitPass.created_by.fullName ||
        ""
      : "") ||
    (exitPass.registered_by && typeof exitPass.registered_by === "object"
      ? `${exitPass.registered_by.last_name || ""} ${exitPass.registered_by.name || ""}`.trim()
      : "");

  const studentId = student?._id || "";

  return (
    // Sin el tope max-w-3xl mx-auto de la app: en desktop el detalle
    // usa todo el ancho del área de contenido.
    <div className="space-y-4">
      <PageHeader
        title="Detalle del Pase"
        subtitle={studentName}
        action={{ label: "← Volver", href: "/prefect/exit-passes" }}
      />

      {/* Héroe: alumno + hora de salida */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardBody className="flex items-center gap-4">
          <StudentAvatar photoUrl={student?.photoUrl} name={fullName} size={64} />
          <div className="min-w-0 flex-1">
            {studentId ? (
              <Link
                href={`/prefect/students/${studentId}`}
                className="text-lg font-bold text-text-primary hover:text-sky-600"
              >
                {studentName}
              </Link>
            ) : (
              <p className="text-lg font-bold text-text-primary">{studentName}</p>
            )}
            <p className="text-xs text-text-secondary mt-0.5">
              {groupLabel || "—"}
              {student?.controlNumber ? ` • No. ${student.controlNumber}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-extrabold text-emerald-600">
              {formatTime12(exitPass.exit_time) || "—"}
            </p>
            <p className="text-xs text-slate-400">hora de salida</p>
          </div>
        </CardBody>
      </Card>

      {/* Panel de datos — en desktop las 3 tarjetas van en UNA fila
          (lg:grid-cols-3; tablet 2; móvil apiladas). */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {/* Quién retira */}
        <Card className="border-l-4 border-l-sky-500">
          <CardBody className="space-y-4">
            <p className="text-sm font-bold text-text-primary">Quien retira</p>
            <DetailRow icon={UserRound} label="Nombre" value={exitPass.guardian_name} />
            <DetailRow
              icon={Shield}
              label="Parentesco"
              value={
                exitPass.relationship
                  ? RELATIONSHIP_LABELS[exitPass.relationship] || exitPass.relationship
                  : null
              }
            />
          </CardBody>
        </Card>

        {/* Motivo */}
        <Card className="border-l-4 border-l-amber-500">
          <CardBody className="space-y-4">
            <p className="text-sm font-bold text-text-primary">Motivo de salida</p>
            <DetailRow
              icon={UserCheck}
              label="Motivo"
              value={REASON_LABELS[exitPass.reason] || exitPass.reason || null}
            />
            <DetailRow icon={LogOut} label="Detalles" value={exitPass.reason_detail} />
          </CardBody>
        </Card>

        {/* Registro */}
        <Card>
          <CardBody className="space-y-4">
            <p className="text-sm font-bold text-text-primary">Registro</p>
            <DetailRow
              icon={Calendar}
              label="Fecha de registro"
              value={formatFullDateTime(exitPass.createdAt)}
            />
            <DetailRow icon={Clock} label="Hora de salida" value={formatTime12(exitPass.exit_time)} />
            <DetailRow icon={Shield} label="Registrado por" value={registrar || "—"} />
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="emerald">Salida autorizada</Badge>
              {exitPass.reason === "medical" && <Badge variant="sky">Cita médica</Badge>}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
