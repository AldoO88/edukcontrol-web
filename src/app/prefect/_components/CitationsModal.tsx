// Modal "Citatorios" de la ficha del alumno — puerto web del
// CitationsModal.jsx del prefecto: lista SOLO los citatorios activos
// (excluye cancelled, igual que la app), con chip de tipo, chip de
// estado, motivo y fecha programada. Solo lectura.

"use client";

import { Calendar, FileText } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import type { CitationItem } from "@/lib/types";

// Chip de TIPO — misma semántica de color que la app.
const TYPE_STYLES: Record<string, { variant: "rose" | "sky" | "amber"; label: string }> = {
  behavioral: { variant: "rose", label: "Conductual" },
  academic: { variant: "sky", label: "Académico" },
  administrative: { variant: "amber", label: "Administrativo" },
};

// Chip de ESTADO — misma semántica de color que la app.
const STATUS_STYLES: Record<string, { variant: "amber" | "sky" | "emerald" | "rose" | "slate"; label: string }> = {
  pending: { variant: "amber", label: "Pendiente" },
  confirmed: { variant: "sky", label: "Confirmado" },
  completed: { variant: "emerald", label: "Atendido" },
  no_show: { variant: "rose", label: "Inasistió" },
  cancelled: { variant: "slate", label: "Cancelado" },
};

interface CitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  citations: CitationItem[];
}

export function CitationsModal({ isOpen, onClose, citations }: CitationsModalProps) {
  // Activos = todo menos cancelados (misma regla que la app).
  const activeCitations = citations.filter((c) => c.status !== "cancelled");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Citatorios" size="md">
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {/* Contador de activos en el header (como la app) */}
        {activeCitations.length > 0 && (
          <p className="text-sm text-slate-500 mb-3">
            {activeCitations.length} citatorio
            {activeCitations.length === 1 ? "" : "s"} activo
            {activeCitations.length === 1 ? "" : "s"}
          </p>
        )}

        {activeCitations.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {activeCitations.map((citation, idx) => {
              const typeStyle = TYPE_STYLES[citation.type] || TYPE_STYLES.behavioral;
              const statusStyle = STATUS_STYLES[citation.status] || STATUS_STYLES.pending;
              const scheduledDate = citation.scheduledDate
                ? new Date(citation.scheduledDate).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "";
              // subject puede venir poblado como objeto o como string.
              const subjectName =
                typeof citation.subject === "string"
                  ? citation.subject
                  : citation.subject?.name;
              return (
                <div
                  key={citation._id || idx}
                  className={`px-4 py-3 ${
                    idx < activeCitations.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={typeStyle.variant}>{typeStyle.label}</Badge>
                    <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>
                  </div>
                  <p className="text-slate-900 text-sm font-semibold mt-2">
                    {citation.reason || subjectName || "Sin asunto"}
                  </p>
                  {scheduledDate && (
                    <p className="flex items-center gap-1.5 text-slate-400 text-xs mt-1.5">
                      <Calendar size={12} />
                      {scheduledDate}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 flex flex-col items-center">
            <FileText size={24} className="text-slate-300" />
            <p className="text-slate-500 text-sm mt-2">Sin citatorios registrados</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold py-3 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
