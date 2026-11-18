// Sección PERSONALES (solo lectura) de la ficha de expediente.
// Muestra la identidad del alumno tal cual vive en Student (no se
// edita desde aquí: el alta/edición de datos personales es tarea de
// admin/registrar). Incluye los tutores vinculados (populate de
// GET /api/students/:id).

"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StudentAvatar } from "@/app/prefect/_components/StudentAvatar";
import type { PrefectStudent } from "@/lib/types";

interface PersonalSectionProps {
  student: PrefectStudent;
  /** Avanza a la siguiente sección (esta no guarda nada). */
  onNext: () => void;
}

// Fila de datos (label + valor) para la grid de lectura.
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-text-muted uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-sm font-semibold text-text-primary mt-0.5">
        {value && value.trim() ? value : "—"}
      </dd>
    </div>
  );
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PersonalSection({ student, onNext }: PersonalSectionProps) {
  const fullName =
    `${student.first_name || ""} ${student.last_name || ""}`.trim() || "—";
  const group =
    typeof student.current_group_id === "object" && student.current_group_id
      ? `${student.current_group_id.grade ?? ""}°${
          student.current_group_id.section ?? ""
        }`
      : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-5">
          {/* Retrato + identidad */}
          <div className="flex items-center gap-4">
            <StudentAvatar photoUrl={student.photoUrl} name={fullName} size={72} />
            <div className="min-w-0">
              <p className="text-lg font-bold text-text-primary truncate">
                {fullName}
              </p>
              <p className="text-sm text-text-secondary">
                {student.controlNumber || "Sin número de control"}
                {group ? ` · Grupo ${group}` : ""}
              </p>
            </div>
          </div>

          {/* Datos de identidad — grid de solo lectura */}
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
            <Row label="CURP" value={student.curp} />
            <Row
              label="Fecha de nacimiento"
              value={formatDate(student.date_of_birth)}
            />
            <Row
              label="Sexo"
              value={
                student.sex === "male"
                  ? "Masculino"
                  : student.sex === "female"
                    ? "Femenino"
                    : null
              }
            />
            <Row label="Teléfono" value={student.phone} />
            <Row label="Tipo de sangre" value={student.blood_type} />
            <Row label="Número de control" value={student.controlNumber} />
            <Row label="Dirección" value={student.address} />
            <Row label="Estado" value={student.status} />
          </dl>

          {/* Tutores vinculados */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              Tutores
            </h3>
            {student.guardians && student.guardians.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {student.guardians.map((g, i) => (
                  <li
                    key={g._id || i}
                    className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                  >
                    <span className="font-semibold text-text-primary">
                      {`${g.name || ""} ${g.lastname || ""}`.trim() || "Sin nombre"}
                    </span>
                    {g.relationship && (
                      <span className="text-xs text-text-secondary">
                        {g.relationship}
                      </span>
                    )}
                    {(g.phone || g.phoneNumber) && (
                      <span className="text-xs text-text-muted">
                        {g.phone || g.phoneNumber}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary">Sin tutores vinculados.</p>
            )}
          </div>

          <p className="text-xs text-text-muted">
            Los datos personales se editan desde el panel de administración
            (alta de alumnos), no desde el expediente.
          </p>
        </CardBody>
      </Card>

      {/* Esta sección no guarda: solo avanza */}
      <div className="flex justify-end">
        <Button type="button" variant="emerald" onClick={onNext}>
          Continuar a Familia →
        </Button>
      </div>
    </div>
  );
}
