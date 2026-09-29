// Paleta del diseñador CR80: foto del alumno, campos de texto mapeables,
// logos de la escuela y formas básicas (línea, rectángulo, elipse).
//
// Logos: el usuario sube archivos locales desde esta paleta. Cada logo se
// guarda en School.credentialConfig.logos[] (POST .../credential-config/logos)
// y aparece en la lista con un checkbox. Al marcarlo, se agrega un
// elemento `kind:"logo"` al lienzo con la referencia al logoId.

"use client";

import {
  Circle as CircleIcon,
  Image as ImageIcon,
  Loader2,
  Minus,
  Square,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  TEXT_FIELD_OPTIONS,
  type Cr80Element,
  type Cr80LogoEntry,
  type Cr80ShapeKind,
} from "@/lib/credential-cr80";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";

interface ElementsPaletteProps {
  schoolId: string;
  logos: Cr80LogoEntry[];
  onChangeLogos: (logos: Cr80LogoEntry[]) => void;
  onAdd: (
    kind: "photo" | "text" | "logo" | "shape",
    opts?: { field?: string; logoId?: string; shape?: Cr80ShapeKind }
  ) => void;
  onAddLogoElement: (logoId: string) => void;
  elements: Cr80Element[];
}

const groups = [
  {
    title: "Alumno",
    items: TEXT_FIELD_OPTIONS.filter((o) => o.value.startsWith("student.")),
  },
  {
    title: "Grupo y ciclo",
    items: TEXT_FIELD_OPTIONS.filter(
      (o) => o.value.startsWith("group.") || o.value.startsWith("schoolYear.")
    ),
  },
  {
    title: "Escuela",
    items: TEXT_FIELD_OPTIONS.filter((o) => o.value.startsWith("school.")),
  },
  {
    title: "Tutor",
    items: TEXT_FIELD_OPTIONS.filter((o) => o.value.startsWith("guardian.")),
  },
];

export function ElementsPalette({
  schoolId,
  logos,
  onChangeLogos,
  onAdd,
  onAddLogoElement,
  elements,
}: ElementsPaletteProps) {
  const btn =
    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-primary hover:bg-sky-50 transition-colors truncate";
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Logos que ya están en el lienzo (id del logo asociado → elemento).
  const logoOnCanvas = new Set<string>();
  for (const e of elements) {
    if (e.kind === "logo" && e.logoId) logoOnCanvas.add(e.logoId);
  }

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-subir el mismo archivo
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file, file.name);
      const res = await api.upload<{ logo: Cr80LogoEntry }>(
        ENDPOINTS.CREDENTIAL_CONFIG_LOGOS(schoolId),
        fd
      );
      onChangeLogos([...logos, res.logo]);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "No se pudo subir el logo."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteLogo = async (logoId: string) => {
    try {
      await api.delete<{ logos: Cr80LogoEntry[] }>(
        ENDPOINTS.CREDENTIAL_CONFIG_LOGO(schoolId, logoId)
      );
      onChangeLogos(logos.filter((l) => l.id !== logoId));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "No se pudo borrar el logo."
      );
    }
  };

  return (
    <div className="space-y-4 p-3 h-full overflow-y-auto">
      <div className="space-y-1">
        <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Foto
        </p>
        <button type="button" className={btn} onClick={() => onAdd("photo")}>
          <ImageIcon size={12} className="inline mr-1.5 -mt-0.5" />
          Foto del alumno
        </button>
      </div>

      {groups.map((g) => (
        <div key={g.title} className="space-y-1">
          <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {g.title}
          </p>
          {g.items.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={btn}
              onClick={() => onAdd("text", { field: opt.value })}
            >
              <Type size={12} className="inline mr-1.5 -mt-0.5" />
              {opt.label}
            </button>
          ))}
        </div>
      ))}

      <div className="space-y-2">
        <div className="flex items-center justify-between px-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Logos
          </p>
          <button
            type="button"
            title="Subir logo"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="p-1 rounded-md text-text-muted hover:bg-sky-50 hover:text-accent-dark disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Upload size={13} />
            )}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFileSelected}
        />
        {logos.length === 0 ? (
          <p className="px-2.5 text-[11px] text-text-muted">
            Sube un logo y aparecerá aquí para arrastrarlo al lienzo.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {logos.map((lg) => {
              const onCanvas = logoOnCanvas.has(lg.id);
              return (
                <li
                  key={lg.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border bg-white"
                >
                  <img
                    src={lg.url}
                    alt={lg.label || "logo"}
                    className="w-7 h-7 object-contain rounded border border-divider bg-slate-50"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-semibold text-text-primary truncate"
                      title={lg.label || lg.public_id}
                    >
                      {lg.label || lg.public_id.split("/").pop()}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {(lg.bytes ?? 0) > 0
                        ? `${Math.round(lg.bytes! / 1024)} KB · `
                        : ""}
                      {lg.format?.toUpperCase() || "PNG"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    title={
                      onCanvas
                        ? "Logo ya está en el lienzo"
                        : "Mostrar en el lienzo"
                    }
                    checked={onCanvas}
                    onChange={() => onAddLogoElement(lg.id)}
                    className="accent-accent-dark w-3.5 h-3.5 cursor-pointer"
                  />
                  <button
                    type="button"
                    title="Eliminar logo"
                    onClick={() => handleDeleteLogo(lg.id)}
                    className="p-1 text-text-muted hover:text-rose-500"
                  >
                    <Trash2 size={11} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {uploadError && (
          <p className="px-2.5 text-[11px] text-rose-600">{uploadError}</p>
        )}
      </div>

      <div className="space-y-1">
        <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Extras
        </p>
        <button type="button" className={btn} onClick={() => onAdd("text")}>
          <Type size={12} className="inline mr-1.5 -mt-0.5" />
          Texto libre
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => onAdd("shape", { shape: "line" })}
        >
          <Minus size={12} className="inline mr-1.5 -mt-0.5" />
          Línea
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => onAdd("shape", { shape: "rect" })}
        >
          <Square size={12} className="inline mr-1.5 -mt-0.5" />
          Rectángulo
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => onAdd("shape", { shape: "ellipse" })}
        >
          <CircleIcon size={12} className="inline mr-1.5 -mt-0.5" />
          Elipse
        </button>
      </div>
    </div>
  );
}

// Indicador de "ya está en el lienzo" usado por la paleta (helper export).
export function isLogoOnCanvas(
  elements: Cr80Element[],
  logoId: string
): boolean {
  return elements.some((e) => e.kind === "logo" && e.logoId === logoId);
}
