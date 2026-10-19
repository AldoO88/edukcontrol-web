// Modal "Trabajo Social" de la ficha del alumno — puerto web del
// TrabajoSocialModal.jsx compartido de la app (mismas secciones:
// estilo de aprendizaje, diagnóstico, discapacidad, medicamentos y
// alertas; solo lectura).

"use client";

import { AlertTriangle, Pill } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { HealthInclusion } from "@/lib/types";

// Configuración por tipo de alerta (mismos colores que la app).
const ALERT_TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  medica: { color: "#DC2626", label: "Médica" },
  comportamental: { color: "#D97706", label: "Comportamental" },
  academica: { color: "#0284C7", label: "Académica" },
  otra: { color: "#64748B", label: "Otra" },
};

const DISABILITY_LABELS: Record<string, string> = {
  cognitiva: "Cognitiva",
  fisica: "Física",
  sensorial: "Sensorial",
  multiple: "Múltiple",
  ninguna: "Ninguna",
};

const SEVERITY_LABELS: Record<string, string> = {
  leve: "Leve",
  moderada: "Moderada",
  severa: "Severa",
};

const LEARNING_STYLE_LABELS: Record<string, string> = {
  visual: "Visual",
  auditivo: "Auditivo",
  kinestesico: "Kinestésico",
  mixto: "Mixto",
};

// Título de sección (versión uppercase/lupado del SectionTitle de RN).
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-4 mb-2">
      {children}
    </p>
  );
}

// Tarjeta de contenido con estado vacío unificado.
function InfoCard({
  isEmpty,
  children,
}: {
  isEmpty: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 mb-4 border border-slate-100">
      {isEmpty ? (
        <p className="text-slate-400 text-sm">Sin datos registrados</p>
      ) : (
        children
      )}
    </div>
  );
}

interface TrabajoSocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthInclusion?: HealthInclusion | null;
}

export function TrabajoSocialModal({
  isOpen,
  onClose,
  healthInclusion,
}: TrabajoSocialModalProps) {
  const hi = healthInclusion || {};

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Trabajo Social" size="md">
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {/* Estilo de aprendizaje */}
        <SectionTitle>Estilo de Aprendizaje</SectionTitle>
        <InfoCard isEmpty={!hi.learning_style}>
          <span className="inline-block px-3 py-1 rounded-full bg-sky-600 text-white text-[11px] font-extrabold tracking-wider">
            {LEARNING_STYLE_LABELS[hi.learning_style || ""] || hi.learning_style}
          </span>
          {hi.style_hint && (
            <p className="mt-2 text-slate-700 text-sm">{hi.style_hint}</p>
          )}
        </InfoCard>

        {/* Diagnóstico */}
        <SectionTitle>Diagnóstico</SectionTitle>
        <InfoCard isEmpty={!hi.diagnosis}>
          <p className="text-slate-700 text-sm font-semibold">{hi.diagnosis}</p>
        </InfoCard>

        {/* Discapacidad */}
        <SectionTitle>Discapacidad</SectionTitle>
        <InfoCard
          isEmpty={!hi.disability_type || hi.disability_type === "ninguna"}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-extrabold tracking-wide">
              {DISABILITY_LABELS[hi.disability_type || ""] || hi.disability_type}
            </span>
            {hi.disability_severity && (
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold tracking-wide">
                {SEVERITY_LABELS[hi.disability_severity] || hi.disability_severity}
              </span>
            )}
          </div>
        </InfoCard>

        {/* Medicamentos */}
        <SectionTitle>Medicamentos</SectionTitle>
        <InfoCard isEmpty={!hi.medications || hi.medications.length === 0}>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {(hi.medications || []).map((med, idx) => (
              <li key={idx} className="flex items-center gap-1.5 text-slate-700 text-sm">
                <Pill size={13} className="text-emerald-600" />
                {med}
              </li>
            ))}
          </ul>
        </InfoCard>

        {/* Alertas */}
        <SectionTitle>Alertas</SectionTitle>
        {!hi.alerts || hi.alerts.length === 0 ? (
          <InfoCard isEmpty />
        ) : (
          <div className="bg-white rounded-2xl p-2 border border-slate-100">
            {hi.alerts.map((alert, index) => {
              const config =
                ALERT_TYPE_CONFIG[alert.type || ""] || ALERT_TYPE_CONFIG.otra;
              return (
                <div
                  key={alert._id || index}
                  className={`flex items-center p-2 ${
                    index < hi.alerts!.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                >
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                    style={{ backgroundColor: `${config.color}15` }}
                  >
                    <AlertTriangle size={16} style={{ color: config.color }} />
                  </div>
                  <div className="ml-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-slate-900 text-sm font-bold">
                        {alert.label || config.label}
                      </p>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                        style={{ backgroundColor: `${config.color}15`, color: config.color }}
                      >
                        {config.label}
                      </span>
                    </div>
                    {alert.description && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        {alert.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold py-3 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
