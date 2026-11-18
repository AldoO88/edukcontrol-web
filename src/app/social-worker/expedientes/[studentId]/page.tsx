// =====================================================================
// src/app/social-worker/expedientes/[studentId]/page.tsx
// ---------------------------------------------------------------------
// FICHA DEL EXPEDIENTE — página única con nav lateral de 6 secciones
// (decisión Fase B): Personales (solo lectura), Familia, Salud,
// Emergencia, Intervenciones y Notas. Cada sección editable persiste
// por separado vía PATCH /api/students/:id/health con el botón
// "Guardar y siguiente"; el estado del expediente se marca/reabre con
// PATCH /api/social-worker/students/:id/expediente-status.
//
// Fuente: hook useStudentExpediente (alumno + acuerdos + canalizaciones).
// Acento emerald del área.
// =====================================================================

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Handshake,
  Heart,
  Phone,
  RotateCcw,
  StickyNote,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { StudentAvatar } from "@/app/prefect/_components/StudentAvatar";
import { ExpedienteStatusBadge } from "@/components/social-worker/ExpedienteStatusBadge";
import { useStudentExpediente } from "@/lib/hooks/useStudentExpediente";
import { toNotice, type Notice } from "@/lib/notice";
import { PersonalSection } from "./_components/PersonalSection";
import { FamilySection } from "./_components/FamilySection";
import { HealthSection } from "./_components/HealthSection";
import { EmergencySection } from "./_components/EmergencySection";
import { InterventionsSection } from "./_components/InterventionsSection";
import { NotesSection } from "./_components/NotesSection";

type SectionId =
  | "personal"
  | "family"
  | "health"
  | "emergency"
  | "interventions"
  | "notes";

// Nav lateral — fuente única del orden de las secciones.
const SECTIONS: Array<{
  id: SectionId;
  label: string;
  hint: string;
  icon: LucideIcon;
}> = [
  { id: "personal", label: "Personales", hint: "Identidad y tutores", icon: User },
  { id: "family", label: "Familia", hint: "Hogar y economía", icon: Users },
  { id: "health", label: "Salud", hint: "Clínico e inclusión", icon: Heart },
  { id: "emergency", label: "Emergencia", hint: "Contactos", icon: Phone },
  { id: "interventions", label: "Intervenciones", hint: "Visitas y acuerdos", icon: Handshake },
  { id: "notes", label: "Notas", hint: "Alertas y notas", icon: StickyNote },
];

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExpedienteFichaPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params?.studentId;

  const {
    student,
    agreements,
    referrals,
    isLoading,
    error,
    isSaving,
    saveHealth,
    saveStatus,
    saveAgreement,
    saveReferral,
    refetch,
  } = useStudentExpediente(studentId);

  const [active, setActive] = useState<SectionId>("personal");
  const [notice, setNotice] = useState<Notice | null>(null);

  // Cualquier mutación muestra el banner de feedback (patrón de las
  // páginas del prefecto); el de éxito se auto-oculta a los 4.5 s.
  // Devuelven el MutateResult ORIGINAL (las secciones ramifican con
  // result.success) además de pintar el aviso.
  const notify = (result: { success: boolean; message: string }) => {
    const n = toNotice(result);
    setNotice(n);
    if (n.ok) setTimeout(() => setNotice(null), 4500);
    return result;
  };

  const handleSave = async (payload: Record<string, unknown>) =>
    notify(await saveHealth(payload));

  const handleAgreement = async (
    payload: Record<string, unknown>,
    id?: string
  ) => notify(await saveAgreement(payload, id));

  const handleReferral = async (
    payload: Record<string, unknown>,
    id?: string
  ) => notify(await saveReferral(payload, id));

  const handleToggleStatus = async () => {
    if (!student) return;
    const next =
      student.expediente_status === "completed" ? "in_progress" : "completed";
    notify(await saveStatus(next));
  };

  const goToSection = (id: SectionId) => {
    // El banner de feedback NO se limpia al cambiar de sección: tras
    // "Guardar y siguiente" el aviso de éxito viaja junto al usuario.
    setActive(id);
  };

  const goNext = () => {
    const index = SECTIONS.findIndex((s) => s.id === active);
    if (index >= 0 && index < SECTIONS.length - 1) {
      goToSection(SECTIONS[index + 1].id);
    }
  };

  if (isLoading && !student) return <LoadingState message="Cargando expediente…" />;
  if (error) return <ErrorState message={error} action={{ label: "Reintentar", onClick: refetch }} />;
  if (!student) return <ErrorState message="Alumno no encontrado." />;

  const fullName =
    `${student.last_name || ""} ${student.first_name || ""}`.trim() || "Sin nombre";
  const group =
    typeof student.current_group_id === "object" && student.current_group_id
      ? `${student.current_group_id.grade ?? ""}°${
          student.current_group_id.section ?? ""
        }`
      : null;
  const isCompleted = student.expediente_status === "completed";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expediente"
        subtitle={fullName}
        action={{
          label: "← Volver al listado",
          href: "/social-worker/expedientes",
        }}
      />

      {/* Banner de feedback */}
      {notice && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            notice.ok
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Hero: identidad + estado del expediente */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardBody className="flex flex-wrap items-center gap-4">
          <StudentAvatar photoUrl={student.photoUrl} name={fullName} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">{fullName}</h2>
              <ExpedienteStatusBadge status={student.expediente_status || "pending"} />
            </div>
            <p className="text-sm text-text-secondary">
              {student.controlNumber || "Sin control"}
              {group ? ` · Grupo ${group}` : ""}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Última actualización: {formatDateTime(student.expediente_last_saved_at)}
              {isCompleted &&
                ` · Completado el ${formatDateTime(student.expediente_completed_at)}`}
            </p>
          </div>
          <Button
            type="button"
            variant={isCompleted ? "secondary" : "emerald"}
            onClick={handleToggleStatus}
            disabled={isSaving}
            isLoading={isSaving}
          >
            {isCompleted ? (
              <>
                <RotateCcw size={16} />
                Reabrir expediente
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Marcar como completado
              </>
            )}
          </Button>
        </CardBody>
      </Card>

      {/* Nav lateral (6 secciones) + contenido de la sección activa */}
      <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-5 items-start">
        <nav
          aria-label="Secciones del expediente"
          className="lg:sticky lg:top-2"
        >
          <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {SECTIONS.map((section) => {
              const isActive = active === section.id;
              const Icon = section.icon;
              return (
                <li key={section.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => goToSection(section.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                      text-sm font-medium transition-colors text-left
                      ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-text-secondary hover:bg-white hover:text-text-primary"
                      }
                    `}
                  >
                    <Icon size={18} className={isActive ? "text-white" : "text-text-muted"} />
                    <span className="min-w-0">
                      <span className="block truncate">{section.label}</span>
                      <span
                        className={`block text-[11px] truncate ${
                          isActive ? "text-emerald-100" : "text-text-muted"
                        }`}
                      >
                        {section.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Contenido — key por sección para reiniciar los formularios
            con los valores actuales del alumno al cambiar de sección. */}
        <div key={active}>
          {active === "personal" && (
            <PersonalSection student={student} onNext={goNext} />
          )}
          {active === "family" && (
            <FamilySection
              student={student}
              onSave={handleSave}
              onNext={goNext}
              isSaving={isSaving}
            />
          )}
          {active === "health" && (
            <HealthSection
              student={student}
              onSave={handleSave}
              onNext={goNext}
              isSaving={isSaving}
            />
          )}
          {active === "emergency" && (
            <EmergencySection
              student={student}
              onSave={handleSave}
              onNext={goNext}
              isSaving={isSaving}
            />
          )}
          {active === "interventions" && (
            <InterventionsSection
              student={student}
              agreements={agreements}
              referrals={referrals}
              onSave={handleSave}
              onSaveAgreement={handleAgreement}
              onSaveReferral={handleReferral}
              onNext={goNext}
              isSaving={isSaving}
            />
          )}
          {active === "notes" && (
            <NotesSection
              student={student}
              onSave={handleSave}
              isSaving={isSaving}
              // Última sección del flujo: sin "Guardar y siguiente".
            />
          )}
        </div>
      </div>

      {/* Vuelta al listado al final de la página */}
      <div className="flex justify-start">
        <Link
          href="/social-worker/expedientes"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <ArrowLeft size={16} />
          Volver al listado de expedientes
        </Link>
      </div>
    </div>
  );
}
