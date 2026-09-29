// Editor de fondo del diseñador CR80: sube el PDF original de la plantilla
// (Canva/Illustrator, sin datos de alumnos). El backend lo guarda en
// Cloudinary como raw (bytes intactos) y lo estampa al imprimir; aquí solo
// se referencia con sus metadatos (páginas, tamaño).

"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import {
  MAX_TEMPLATE_PDF_BYTES,
  type TemplatePdfMeta,
} from "@/lib/credential-cr80";

interface BackgroundEditorProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  current: TemplatePdfMeta | null;
  // Aplica el fondo y lo auto-guarda en el servidor; devuelve null si OK o
  // el mensaje de error si falló.
  onApply: (pdf: TemplatePdfMeta | null) => Promise<string | null>;
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

export function BackgroundEditor({
  isOpen,
  onClose,
  schoolId,
  current,
  onApply,
}: BackgroundEditorProps) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNotice(null);

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setNotice({ type: "error", text: "El archivo debe ser un PDF (.pdf)." });
      return;
    }
    if (file.size > MAX_TEMPLATE_PDF_BYTES) {
      setNotice({
        type: "error",
        text: `El PDF supera el máximo de ${formatBytes(MAX_TEMPLATE_PDF_BYTES)}.`,
      });
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("background", file);
      const meta = await api.upload<TemplatePdfMeta>(
        ENDPOINTS.CREDENTIAL_TEMPLATE_ASSETS(schoolId),
        fd
      );
      const errMsg = await onApply(meta);
      if (errMsg) {
        setNotice({ type: "error", text: errMsg });
        return;
      }
      onClose(); // guardado y aplicado — el lienzo ya está renderizando
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Error al subir el PDF.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (
      !window.confirm(
        "¿Quitar el PDF de fondo? Los elementos colocados sobre las caras se conservarán, pero no se imprimirán hasta que subas un fondo nuevo."
      )
    ) {
      return;
    }
    setBusy(true);
    const errMsg = await onApply(null);
    setBusy(false);
    if (errMsg) {
      setNotice({ type: "error", text: errMsg });
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fondo de la credencial (PDF)" size="lg">
      <div className="space-y-4">
        <p className="text-xs text-text-secondary">
          Sube el PDF de tu plantilla tal cual lo diseñaste (frente en la
          página 1 y, si aplica, reverso en la página 2),{" "}
          <span className="font-medium text-amber-600">
            sin datos de alumnos — solo marcos, colores y logos
          </span>
          . El servidor lo conserva byte a byte y coloca los datos encima al
          imprimir. Máximo {formatBytes(MAX_TEMPLATE_PDF_BYTES)}.
        </p>

        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={handlePdfFile}
          disabled={busy}
          className="block w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-sky-50 file:text-sky-700 file:text-xs file:font-semibold hover:file:bg-sky-100"
        />

        {current && (
          <div className="p-3 rounded-xl bg-slate-50 border border-divider text-xs text-text-secondary space-y-1">
            <p>
              <span className="font-semibold text-text-primary">Fondo actual:</span>{" "}
              {current.pages} página{current.pages === 1 ? "" : "s"} ·{" "}
              {Math.round(current.widthPt)} × {Math.round(current.heightPt)} pt
              {current.pages === 1 ? " (solo frente)" : " (frente y reverso)"}
            </p>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="text-rose-600 font-semibold hover:underline disabled:opacity-50"
            >
              Quitar fondo
            </button>
          </div>
        )}

        {notice && (
          <div
            className={`p-3 rounded-xl text-sm ${
              notice.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={busy}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
