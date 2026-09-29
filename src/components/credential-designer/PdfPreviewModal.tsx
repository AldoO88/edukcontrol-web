// Vista previa del PDF de credenciales (compartida entre la pantalla de
// credenciales y el diseñador). El hook genera el PDF (blob) y controla el
// objectURL; el modal solo lo muestra y permite descargar.

"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ENDPOINTS } from "@/lib/constants";

export interface PdfPreviewScope {
  yearId: string;
  schoolId: string;
  ids?: string;
}

export function usePdfPreview() {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const revokeCurrent = () => {
    if (urlRef.current) {
      window.URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  };

  // Revoca el objectURL al desmontar.
  useEffect(() => {
    return () => {
      if (urlRef.current) window.URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const generate = async (scope: PdfPreviewScope) => {
    setError(null);
    setIsLoading(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("edukcontrol_token")
          : null;
      const endpoint = ENDPOINTS.CREDENTIALS_PDF(
        scope.yearId,
        scope.schoolId,
        scope.ids
      );
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";
      const res = await fetch(`${apiBase}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Error ${res.status}`);
      }
      const blob = await res.blob();
      revokeCurrent();
      const nextUrl = window.URL.createObjectURL(blob);
      urlRef.current = nextUrl;
      setUrl(nextUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el PDF");
    } finally {
      setIsLoading(false);
    }
  };

  const close = () => {
    revokeCurrent();
    setUrl(null);
  };

  const download = (filename: string) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return { url, isLoading, error, setError, generate, close, download };
}

// Lista resumida que el modal necesita para renderizar el selector.
// Mantenerla pequeña (id + nombre + matrícula) para no transmitir 461
// alumnos por la red; la página padre ya tiene la lista completa.
export interface PdfPreviewStudentOption {
  _id: string;
  first_name: string;
  last_name: string;
  controlNumber?: string;
}

interface PdfPreviewModalProps {
  url: string | null;
  isLoading?: boolean;
  onClose: () => void;
  onDownload: () => void;
  filename?: string;
  students?: PdfPreviewStudentOption[];
  selectedStudentId?: string;
  onSelectStudent?: (id: string) => void;
  /** Texto del botón de regenerar (cuando hay selector de alumno). */
  regenerateLabel?: string;
}

export function PdfPreviewModal({
  url,
  isLoading = false,
  onClose,
  onDownload,
  filename = "credenciales.pdf",
  students,
  selectedStudentId,
  onSelectStudent,
  regenerateLabel = "Regenerar PDF",
}: PdfPreviewModalProps) {
  const showPicker = !!students && students.length > 0 && onSelectStudent;
  return (
    <Modal
      isOpen={!!url || isLoading}
      onClose={onClose}
      title="Vista previa del PDF"
      size="xl"
    >
      <div className="space-y-4">
        {showPicker && (
          <div className="flex items-center gap-3 flex-wrap rounded-xl border border-divider bg-slate-50 px-3 py-2">
            <label
              htmlFor="pdf-preview-student"
              className="text-xs font-semibold text-text-secondary"
            >
              Alumno de muestra:
            </label>
            <select
              id="pdf-preview-student"
              value={selectedStudentId ?? ""}
              onChange={(e) => onSelectStudent?.(e.target.value)}
              disabled={isLoading}
              className="flex-1 min-w-[240px] max-w-[420px] rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
            >
              {students!.map((s) => (
                <option key={s._id} value={s._id}>
                  {[
                    `${s.last_name} ${s.first_name}`.trim(),
                    s.controlNumber,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              ))}
            </select>
            <Button
              variant="sky"
              size="sm"
              type="button"
              onClick={() => {
                if (selectedStudentId) onSelectStudent?.(selectedStudentId);
              }}
              disabled={!selectedStudentId || isLoading}
            >
              <RefreshCw size={14} className="mr-1.5" />
              {regenerateLabel}
            </Button>
          </div>
        )}
        {isLoading ? (
          <div className="h-[70vh] flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-xl">
            <Spinner />
            <p className="text-sm text-text-secondary">Generando PDF…</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-slate-100">
            {url && (
              <iframe
                src={url}
                className="w-full h-[70vh]"
                title="Vista previa PDF"
              />
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-text-muted">
            Revisa el resultado. La descarga usa el PDF ya generado, sin volver
            a crearlo. ({filename})
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
              <X size={14} className="mr-1.5" />
              Cerrar
            </Button>
            <Button
              variant="sky"
              size="sm"
              onClick={onDownload}
              disabled={!url || isLoading}
            >
              <Download size={14} className="mr-1.5" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
