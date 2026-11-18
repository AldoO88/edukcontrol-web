// Badge del ESTADO de un expediente (compartido por el listado y la
// ficha): pending → slate, in_progress → sky, completed → emerald.

"use client";

import { Badge } from "@/components/ui/Badge";
import type { ExpedienteStatus } from "@/lib/types";

const STATUS_META: Record<
  ExpedienteStatus,
  { label: string; variant: "slate" | "sky" | "emerald" }
> = {
  pending: { label: "Pendiente", variant: "slate" },
  in_progress: { label: "En proceso", variant: "sky" },
  completed: { label: "Completado", variant: "emerald" },
};

export function ExpedienteStatusBadge({
  status,
}: {
  status: ExpedienteStatus | string;
}) {
  const meta = STATUS_META[status as ExpedienteStatus] || STATUS_META.pending;
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

// Label legible del estado (para tooltips/textos).
export function expedienteStatusLabel(status: ExpedienteStatus | string): string {
  return (STATUS_META[status as ExpedienteStatus] || STATUS_META.pending).label;
}
