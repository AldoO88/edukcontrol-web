// Modal "Conducta" de la ficha del alumno — puerto web del
// ConductModal.jsx del prefecto: score 0-baseline calculado desde los
// logs (merit suma, demerit resta, cancelled se ignora), resumen
// deméritos/méritos/neto e historial de reportes. Solo lectura.

"use client";

import { AlertTriangle, TrendingUp, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { ConductConfig, ConductLogItem } from "@/lib/types";

interface ConductModalProps {
  isOpen: boolean;
  onClose: () => void;
  conductLogs: ConductLogItem[];
  conductConfig?: ConductConfig | null;
}

// Color del score por porcentaje (mismos umbrales 80/60 que la app).
function scoreColor(pct: number): string {
  if (pct >= 80) return "#059669";
  if (pct >= 60) return "#D97706";
  return "#DC2626";
}

export function ConductModal({
  isOpen,
  onClose,
  conductLogs,
  conductConfig,
}: ConductModalProps) {
  const baseline = conductConfig?.baseline || 100;

  // Score actual: points_impact siempre positivo; el signo lo define
  // eventType (merit +, demerit −); cancelled no cuenta. Recorte 0..baseline.
  const signedTotal = conductLogs.reduce((acc, log) => {
    if (log.status === "cancelled") return acc;
    const impact = log.points_impact || 0;
    return acc + (log.eventType === "merit" ? impact : -impact);
  }, 0);
  const currentScore = Math.max(0, Math.min(baseline, baseline + signedTotal));
  const percentage = baseline > 0 ? (currentScore / baseline) * 100 : 0;
  const color = scoreColor(percentage);

  // Resumen de méritos/deméritos (solo logs activos).
  const demerits = conductLogs.filter(
    (l) => l.eventType === "demerit" && l.status !== "cancelled"
  );
  const merits = conductLogs.filter(
    (l) => l.eventType === "merit" && l.status !== "cancelled"
  );
  const demeritsPoints = demerits.reduce((acc, l) => acc + (l.points_impact || 0), 0);
  const meritsPoints = merits.reduce((acc, l) => acc + (l.points_impact || 0), 0);
  const netPoints = meritsPoints - demeritsPoints;
  const hasSummary = demerits.length > 0 || merits.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conducta" size="md">
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {/* Score card */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-slate-100 text-center">
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            Score de Conducta
          </p>
          <p className="text-5xl font-extrabold mt-1" style={{ color }}>
            {currentScore}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">de {baseline} puntos</p>
          {/* Barra de progreso */}
          <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${percentage}%`, backgroundColor: color }}
            />
          </div>
          <div className="flex justify-between w-full mt-1.5">
            <span className="text-slate-400 text-[10px]">0</span>
            <span className="text-slate-400 text-[10px]">{baseline}</span>
          </div>
        </div>

        {/* Resumen deméritos/méritos */}
        {hasSummary && (
          <div className="mb-4">
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2">
              Resumen
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center">
                <p className="text-[10px] font-bold uppercase text-rose-600">Deméritos</p>
                <p className="text-3xl font-extrabold text-rose-600">{demerits.length}</p>
                <p className="text-slate-400 text-xs">−{demeritsPoints} pts</p>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center">
                <p className="text-[10px] font-bold uppercase text-emerald-600">Méritos</p>
                <p className="text-3xl font-extrabold text-emerald-600">{merits.length}</p>
                <p className="text-slate-400 text-xs">+{meritsPoints} pts</p>
              </div>
            </div>
            <p
              className="text-center text-xs font-semibold mt-2"
              style={{ color: netPoints >= 0 ? "#059669" : "#DC2626" }}
            >
              Neto: {netPoints >= 0 ? "+" : ""}
              {netPoints} puntos
            </p>
          </div>
        )}

        {/* Historial */}
        <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2">
          Historial de Reportes
        </p>
        {conductLogs.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {conductLogs.map((log, idx) => {
              const isMerit = log.eventType === "merit";
              return (
                <div
                  key={log._id || idx}
                  className={`flex items-start px-4 py-3 ${
                    idx < conductLogs.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${
                      isMerit ? "bg-emerald-100" : "bg-rose-50"
                    }`}
                  >
                    {isMerit ? (
                      <TrendingUp size={14} className="text-emerald-600" />
                    ) : (
                      <XCircle size={14} className="text-rose-600" />
                    )}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-slate-900 text-[13px] font-semibold">
                      {log.description || "Sin descripción"}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                    </p>
                  </div>
                  {log.points_impact != null && (
                    <span
                      className={`text-sm font-bold ml-2 ${
                        isMerit ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {isMerit ? "+" : "-"}
                      {log.points_impact}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 flex flex-col items-center">
            <AlertTriangle size={24} className="text-emerald-500" />
            <p className="text-slate-500 text-sm mt-2">Sin reportes de conducta</p>
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
