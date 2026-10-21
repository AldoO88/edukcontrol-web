// Modal "Editar Aviso" (solo emisor) — puerto web de
// EditAnnouncementModal.jsx: título, prioridad y mensaje (con
// contadores) → PUT completo (la app manda los 3 campos siempre).

"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { FieldLabel } from "@/app/prefect/_components/CitationFields";

const PRIORITIES = [
  { value: "informative", label: "Informativo" },
  { value: "urgent", label: "Urgente" },
] as const;
type Priority = (typeof PRIORITIES)[number]["value"];

interface EditAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Prefill actual del aviso.
  initial: { title: string; message: string; priority: string };
  onSubmit: (payload: {
    title: string;
    message: string;
    priority: Priority;
  }) => Promise<{ success: boolean; message: string }>;
}

export function EditAnnouncementModal({
  isOpen,
  onClose,
  initial,
  onSubmit,
}: EditAnnouncementModalProps) {
  const [title, setTitle] = useState(initial.title);
  const [message, setMessage] = useState(initial.message);
  const [priority, setPriority] = useState<Priority>(
    initial.priority === "urgent" ? "urgent" : "informative"
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill al abrir.
  useEffect(() => {
    if (!isOpen) return;
    setTitle(initial.title);
    setMessage(initial.message);
    setPriority(initial.priority === "urgent" ? "urgent" : "informative");
    setError("");
  }, [isOpen, initial]);

  const canSubmit = title.trim().length > 0 && message.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError("");
    const result = await onSubmit({
      title: title.trim(),
      message: message.trim(),
      priority,
    });
    setIsSubmitting(false);
    if (result.success) onClose();
    else setError(result.message);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Aviso" size="lg">
      <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-5">
        {/* Prioridad */}
        <div>
          <FieldLabel>Prioridad</FieldLabel>
          <div className="flex bg-slate-100 rounded-xl p-1">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`flex-1 py-2 rounded-lg text-xs transition-colors ${
                  priority === p.value
                    ? p.value === "urgent"
                      ? "bg-white text-rose-600 font-bold shadow-sm"
                      : "bg-white text-indigo-600 font-bold shadow-sm"
                    : "text-slate-500 font-medium hover:text-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Título */}
        <div>
          <FieldLabel>Título</FieldLabel>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Título del aviso"
          />
          <p className="text-xs text-slate-400 mt-1 text-right">{title.length} / 200</p>
        </div>

        {/* Mensaje */}
        <div>
          <FieldLabel>Mensaje</FieldLabel>
          <TextArea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={5000}
            rows={6}
            placeholder="Contenido del aviso..."
          />
          <p className="text-xs text-slate-400 mt-1 text-right">
            {message.length} / 5000
          </p>
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!canSubmit}
          >
            Guardar cambios
          </Button>
        </div>
      </div>
    </Modal>
  );
}
