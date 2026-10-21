// =====================================================================
// src/app/prefect/students/[id]/page.tsx
// ---------------------------------------------------------------------
// Ficha completa del alumno — puerto web de students/[studentId].jsx
// de la app: perfil (foto/estado), tutor legal, datos personales,
// salud y los 3 accesos modales de solo lectura:
//   - Trabajo Social → salud/inclusión (health_inclusion)
//   - Citatorios     → activos (sin cancelled) con contador
//   - Conducta       → score + resumen + historial
// Fuente: hook useStudentFile (4 fetchs en paralelo).
// =====================================================================

"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useStudentFile } from "@/lib/hooks/useStudentFile";
import { StudentAvatar } from "@/app/prefect/_components/StudentAvatar";
import { TrabajoSocialModal } from "@/app/prefect/_components/TrabajoSocialModal";
import { CitationsModal } from "@/app/prefect/_components/CitationsModal";
import { ConductModal } from "@/app/prefect/_components/ConductModal";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Eye,
  FileText,
  Heart,
  Mail,
  MapPin,
  Phone,
  Shield,
  TrendingUp,
  User,
} from "lucide-react";

// Etiquetas de catálogo (idénticas a la app).
const SEX_LABELS: Record<string, string> = { male: "Masculino", female: "Femenino" };
const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  withdrawn_temp: "Baja temporal",
  withdrawn_permanent: "Baja definitiva",
};
const RELATIONSHIP_LABELS: Record<string, string> = {
  parent: "Padre/Madre",
  father: "Padre",
  mother: "Madre",
  guardian: "Tutor",
};

// Fila de dato (icono + label + valor) del diseño de la app.
function InfoRow({
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
    <div className="flex items-start gap-2.5 mb-2.5">
      <Icon size={16} className="text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-base font-medium text-text-primary break-words">{value}</p>
      </div>
    </div>
  );
}

// Card con borde lateral de color (misma estética de las tarjetas de
// la ficha en la app). El acento se pasa como CLASE Tailwind literal
// (Card no acepta `style`): border-l-sky-500/violet-600/rose-500
// equivalen a los hex #0EA5E9/#7C3AED/#E11D48 de la app.
function SectionCard({
  title,
  accentClass,
  children,
}: {
  title: string;
  accentClass: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`border-l-4 ${accentClass}`}>
      <CardBody>
        <p className="text-base font-bold text-text-primary mb-3">{title}</p>
        {children}
      </CardBody>
    </Card>
  );
}

// Fila-gatillo que abre un modal (Trabajo Social / Citatorios / Conducta).
function ModalTrigger({
  icon: Icon,
  title,
  accent,
  tint,
  count,
  onClick,
}: {
  // Tipo de icono lucide tolerante a style (el color del acento se
  // pasa inline para no romper la purga de clases de Tailwind).
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
  title: string;
  accent: string;
  tint: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl px-4 py-4 border border-slate-200 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <span
        className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
        style={{ backgroundColor: tint }}
      >
        <Icon size={20} style={{ color: accent }} />
      </span>
      <span className="flex-1 text-sm font-bold text-text-primary">{title}</span>
      {count ? (
        <span
          className="px-2.5 py-1 rounded-full text-xs font-extrabold text-white"
          style={{ backgroundColor: accent }}
        >
          {count}
        </span>
      ) : null}
      <ChevronRight size={20} className="text-slate-400" />
    </button>
  );
}

export default function PrefectStudentFilePage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  const { student, conductLogs, citations, conductConfig, isLoading, error, refetch } =
    useStudentFile(studentId);

  // Estado de los 3 modales (solo lectura).
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [isCitationsOpen, setIsCitationsOpen] = useState(false);
  const [isConductOpen, setIsConductOpen] = useState(false);

  // Citatorios activos (sin cancelled) — contador del gatillo.
  const activeCitationsCount = useMemo(
    () => citations.filter((c) => c.status !== "cancelled").length,
    [citations]
  );

  if (isLoading) return <LoadingState message="Cargando ficha del alumno…" />;
  if (error || !student) {
    return (
      <ErrorState
        message={error || "No se encontró el alumno."}
        action={{ label: "Reintentar", onClick: refetch }}
      />
    );
  }

  const guardians = student.guardians || [];
  const fullName = `${student.last_name || ""} ${student.first_name || ""}`.trim();
  const group =
    typeof student.current_group_id === "object" && student.current_group_id
      ? `${student.current_group_id.grade ?? ""}°${student.current_group_id.section ?? ""}`
      : "";
  const isActive = student.status === "active";

  return (
    // Sin el tope max-w-3xl mx-auto de la app: en desktop la ficha
    // usa todo el ancho del área de contenido.
    <div className="space-y-4">
      <PageHeader
        title="Ficha del Alumno"
        subtitle={fullName}
        action={{ label: "← Volver", href: "/prefect/students" }}
      />

      {/* Layout web de ficha: contenido principal (2/3: perfil +
          datos personales + salud) + panel lateral (1/3: tutor legal
          y accesos modales). */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* Perfil — fila horizontal estilo web (antes: columna
              centrada de la app). */}
          <Card className="border-l-4 border-l-indigo-600">
            <CardBody className="flex items-center gap-4">
              <StudentAvatar photoUrl={student.photoUrl} name={fullName} size={72} />
              <div className="min-w-0">
                <p className="text-lg font-bold text-text-primary">{fullName}</p>
                <p className="text-sm text-slate-600 mt-0.5">
                  {group}
                  {group && student.controlNumber ? " • " : ""}
                  {student.controlNumber ? `No. ${student.controlNumber}` : ""}
                </p>
              </div>
              <Badge variant={isActive ? "emerald" : "amber"} className="ml-auto shrink-0">
                {STATUS_LABELS[student.status || ""] || student.status}
              </Badge>
            </CardBody>
          </Card>

          {/* Datos personales */}
          <SectionCard title="Datos Personales" accentClass="border-l-violet-600">
            <InfoRow icon={FileText} label="CURP" value={student.curp} />
            <InfoRow
              icon={User}
              label="Sexo"
              value={
                student.sex
                  ? SEX_LABELS[student.sex] || student.sex
                  : undefined
              }
            />
            <InfoRow icon={Heart} label="Tipo de sangre" value={student.blood_type} />
            <InfoRow icon={MapPin} label="Dirección" value={student.address} />
            <InfoRow
              icon={Calendar}
              label="Fecha de nacimiento"
              value={
                student.date_of_birth
                  ? new Date(student.date_of_birth).toLocaleDateString("es-MX")
                  : undefined
              }
            />
            {!student.curp &&
              !student.sex &&
              !student.blood_type &&
              !student.address &&
              !student.date_of_birth && (
                <p className="text-base text-slate-400 italic">Sin datos registrados</p>
              )}
          </SectionCard>

          {/* Salud */}
          {student.medical_notes && (
            <SectionCard title="Salud" accentClass="border-l-rose-500">
              <InfoRow icon={AlertTriangle} label="Notas médicas" value={student.medical_notes} />
            </SectionCard>
          )}
        </div>

        {/* Panel lateral: tutor legal + accesos a modales */}
        <div className="space-y-4">
          {/* Tutor legal */}
          <SectionCard title="Tutor Legal" accentClass="border-l-sky-500">
            {guardians.length > 0 ? (
              <div className="space-y-3">
                {guardians.map((guardian, idx) => (
                  <div
                    key={guardian._id || idx}
                    className={idx > 0 ? "pt-3 border-t border-slate-100" : ""}
                  >
                    <InfoRow
                      icon={Shield}
                      label="Nombre"
                      value={
                        [guardian.name, guardian.lastname].filter(Boolean).join(" ") || "—"
                      }
                    />
                    <InfoRow icon={Phone} label="Teléfono" value={guardian.phone} />
                    <InfoRow
                      icon={User}
                      label="Parentesco"
                      value={
                        guardian.relationship
                          ? RELATIONSHIP_LABELS[guardian.relationship] || guardian.relationship
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base text-slate-400 italic">Sin tutor registrado</p>
            )}
          </SectionCard>

          {/* Gatillos de modales, agrupados en un card de accesos */}
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700">
                  <Eye size={14} />
                </span>
                <p className="text-sm font-bold text-text-primary">Accesos</p>
              </div>
              <ModalTrigger
                icon={Eye}
                title="Trabajo Social"
                accent="#059669"
                tint="#D1FAE5"
                onClick={() => setIsSocialOpen(true)}
              />
              <ModalTrigger
                icon={FileText}
                title="Citatorios"
                accent="#D97706"
                tint="#FEF3C7"
                count={activeCitationsCount}
                onClick={() => setIsCitationsOpen(true)}
              />
              <ModalTrigger
                icon={TrendingUp}
                title="Conducta"
                accent="#E11D48"
                tint="#FEF2F2"
                count={conductLogs.length}
                onClick={() => setIsConductOpen(true)}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modales (solo lectura) */}
      <TrabajoSocialModal
        isOpen={isSocialOpen}
        onClose={() => setIsSocialOpen(false)}
        healthInclusion={student.health_inclusion}
      />
      <CitationsModal
        isOpen={isCitationsOpen}
        onClose={() => setIsCitationsOpen(false)}
        citations={citations}
      />
      <ConductModal
        isOpen={isConductOpen}
        onClose={() => setIsConductOpen(false)}
        conductLogs={conductLogs}
        conductConfig={conductConfig}
      />
    </div>
  );
}
