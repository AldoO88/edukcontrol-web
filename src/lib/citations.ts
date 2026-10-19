// Citatorios — helpers de presentación (puerto de citationHelpers.js
// de la app móvil): normalización del item del API al shape de UI y
// catálogos de labels (tipos, estados, eventos de timeline) en una sola
// fuente para listas, detalle y modales.

import { formatDateTimeLocal } from "./dates";
import type { CitationItem } from "./types";

// ---------------------------------------------------------------------
// Catálogos
// ---------------------------------------------------------------------

// Tipos de citatorio → label (el prefecto solo CREA
// behavioral/administrative; academic aparece en lectura).
export const CITATION_TYPE_LABELS: Record<string, string> = {
  academic: "Aprovechamiento",
  behavioral: "Conductual",
  administrative: "Administrativo",
};

// Estados → label de detalle (texto largo, igual que la app).
export const CITATION_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente de Confirmación",
  confirmed: "Confirmado por Tutor",
  completed: "Atendido",
  no_show: "Tutor no se presentó",
  expired: "Expirado",
  cancelled: "Cancelado",
};

// Agrupación de estados para los pills del listado:
// Pendientes = todo lo que sigue vivo; Atendidos; Cancelados.
export const CITATION_STATUS_GROUPS: Record<string, string[]> = {
  pending: ["pending", "confirmed", "no_show", "expired", "reschedule_requested"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

// Eventos de la timeline (history[]) → label.
export const HISTORY_EVENT_LABELS: Record<string, string> = {
  created: "Citatorio creado",
  sent_to_tutor: "Enviado al tutor",
  confirmed: "Confirmado por el tutor",
  completed: "Atendido",
  no_show: "Tutor no se presentó",
  rescheduled: "Reagendado",
  expired: "Expirado",
  cancelled: "Cancelado",
};

// Título por género del staff (port de teacherName.js: male → Prof.,
// female → Profa., default Prof.).
function teacherTitle(sex?: string | null): string {
  if (sex === "female") return "Profa.";
  return "Prof.";
}

// Nombre completo del staff con prioridad a fullName del backend.
function staffFullName(person: {
  fullName?: string;
  name?: string;
  last_name?: string;
}): string {
  if (person.fullName?.trim()) return person.fullName.trim();
  const first = (person.name || "").trim();
  const last = (person.last_name || "").trim();
  if (first && last) {
    // Evita duplicar el apellido si ya viene dentro de `name`.
    return first.toLowerCase().includes(last.toLowerCase()) ? first : `${first} ${last}`;
  }
  return first || last || "Docente";
}

// ---------------------------------------------------------------------
// normalizeCitation
// ---------------------------------------------------------------------
// Shape API → shape de UI. Igual que la app: studentName "Apellido,
// Nombre", groupName denormalizado del backend, date/time con getters
// locales y creatorName con título por género.
export interface NormalizedCitation {
  id: string;
  studentName: string;
  studentId: string;
  groupName: string;
  subject: string;
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:mm'
  location: string;
  type: string;
  reason: string;
  status: string;
  creatorName: string;
  creatorId: string;
  createdAt: string;
  history: NonNullable<CitationItem["history"]>;
  rescheduleRequested: boolean;
  rescheduleReason: string;
}

export function normalizeCitation(item: CitationItem): NormalizedCitation {
  // student puede venir poblado o como id crudo.
  const studentObj = item.student && typeof item.student === "object" ? item.student : null;
  const first = studentObj?.first_name || "";
  const last = studentObj?.last_name || "";
  const studentName =
    last && first ? `${last}, ${first}` : first || last || "Sin nombre";

  const studentId = studentObj?._id || (typeof item.student === "string" ? item.student : "");

  const subject =
    typeof item.subject === "object" ? item.subject?.name || "" : "";

  const creator = item.creator && typeof item.creator === "object" ? item.creator : null;

  const { date, time } = formatDateTimeLocal(item.scheduledDate);

  return {
    id: item._id,
    studentName,
    studentId,
    groupName: item.groupName || "",
    subject,
    date,
    time,
    location: item.location || "",
    type: item.type || "academic",
    reason: item.reason || "",
    status: item.status || "pending",
    creatorName: creator
      ? `${teacherTitle(creator.sex)} ${staffFullName(creator)}`.trim()
      : "",
    creatorId: creator?._id || "",
    createdAt: item.createdAt || "",
    history: item.history || [],
    rescheduleRequested: !!item.rescheduleRequested,
    rescheduleReason: item.rescheduleReason || "",
  };
}
