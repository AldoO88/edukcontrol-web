// Diseñador CR80 de credenciales: sube el PDF de fondo de la plantilla,
// coloca foto y datos sobre el marco de tarjeta PVC (242.64 × 153.07 pt) y
// guarda { pdf, sides } en School.credentialTemplate. El backend compone el
// PDF final con la misma fórmula de escalado → la vista previa es WYSIWYG.

"use client";

import { useCallback, useEffect, useState } from "react";
import { Eraser, Eye, FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { pdfBufferToPageImages } from "@/lib/pdfToImages";
import {
  CR80_HEIGHT_PT,
  CR80_WIDTH_PT,
  createCr80Element,
  emptySides,
  normalizeSides,
  type Cr80Element,
  type Cr80Sides,
  type TemplatePdfMeta,
} from "@/lib/credential-cr80";
import { DesignCanvas, type CanvasBgImage } from "./DesignCanvas";
import { ElementsPalette } from "./ElementsPalette";
import { PropertiesPanel } from "./PropertiesPanel";
import { BackgroundEditor } from "./BackgroundEditor";
import type { Cr80LogoEntry, Cr80ShapeKind } from "@/lib/credential-cr80";

interface CredentialDesignerProps {
  schoolId: string;
  pdfMeta: TemplatePdfMeta | null;
  sides: Cr80Sides;
  logos: Cr80LogoEntry[];
  onChange: (next: { pdf: TemplatePdfMeta | null; sides: Cr80Sides }) => void;
  onChangeLogos?: (logos: Cr80LogoEntry[]) => void;
  onPreview?: () => void;
}

export function CredentialDesigner({
  schoolId,
  pdfMeta,
  sides,
  logos,
  onChange,
  onChangeLogos,
  onPreview,
}: CredentialDesignerProps) {
  const [sideIndex, setSideIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bgEditorOpen, setBgEditorOpen] = useState(false);
  // Resultado de la carga del fondo; se deriva contra bgKey para evitar
  // setState síncrono dentro del efecto.
  const [bgResult, setBgResult] = useState<{
    key: string | null;
    pages: CanvasBgImage[];
    error: string | null;
  }>({ key: null, pages: [], error: null });

  const pageCount = pdfMeta ? pdfMeta.pages : 0;
  const hasPdf = !!pdfMeta;
  const bgKey = pdfMeta ? pdfMeta.asset_id || pdfMeta.public_id || pdfMeta.url : null;

  // Carga el PDF guardado (proxy autenticado) y renderiza sus páginas.
  useEffect(() => {
    if (!bgKey || !pdfMeta) return;
    let cancelled = false;
    (async () => {
      try {
        const buffer = await api.getBinary(
          ENDPOINTS.CREDENTIAL_TEMPLATE_BACKGROUND(schoolId, bgKey ?? undefined)
        );
        const images = await pdfBufferToPageImages(buffer, pdfMeta.pages, 3);
        if (cancelled) return;
        setBgResult({
          key: bgKey,
          pages: images.map((img) => ({
            src: img.dataUrl,
            width: img.width,
            height: img.height,
          })),
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "No se pudo cargar el fondo.";
        setBgResult({
          key: bgKey,
          pages: [],
          error: msg.includes("Background PDF not found")
            ? "El fondo todavía no está guardado en el servidor."
            : msg,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, bgKey, pdfMeta]);

  const bgReady = bgResult.key === bgKey;
  const bgPages: CanvasBgImage[] = bgReady ? bgResult.pages : [];
  const bgError = bgReady ? bgResult.error : null;
  const bgLoading = !!bgKey && !bgReady;

  const setSides = useCallback(
    (next: Cr80Sides) => onChange({ pdf: pdfMeta, sides: next }),
    [pdfMeta, onChange]
  );

  // La pestaña activa puede quedar fuera de rango al cambiar el PDF.
  const activeIndex = Math.min(sideIndex, Math.max(0, pageCount - 1));
  const side = sides[activeIndex] || { elements: [] };
  const bgImage = bgPages[activeIndex] || null;

  const handleAdd = (
    kind: "photo" | "text" | "logo" | "shape",
    opts: { field?: string; logoId?: string; shape?: Cr80ShapeKind } = {}
  ) => {
    if (!hasPdf) return;
    const el = createCr80Element(kind, opts);
    const next = sides.map((s, i) =>
      i === activeIndex ? { elements: [...s.elements, el] } : s
    );
    setSides(next);
    setSelectedId(el.id);
  };

  const handleAddLogoElement = (logoId: string) => {
    if (!hasPdf) return;
    // Si ya hay un elemento para este logo, deselecciónalo/elimínalo; si
    // no, agrega uno al centro de la tarjeta.
    const existingIdx = sides[activeIndex]?.elements.findIndex(
      (e) => e.kind === "logo" && e.logoId === logoId
    );
    if (existingIdx != null && existingIdx >= 0) {
      const next = sides.map((s, i) =>
        i === activeIndex
          ? {
              elements: s.elements.filter((_, j) => j !== existingIdx),
            }
          : s
      );
      setSides(next);
      return;
    }
    const el = createCr80Element("logo", { logoId });
    // Posición default para el nuevo logo cerca del margen superior.
    const cw = (window?.innerWidth || 1024) / 4;
    el.x = Math.max(8, Math.min(60, (CR80_WIDTH_PT - el.w) / 2));
    el.y = Math.max(8, Math.min(60, (CR80_HEIGHT_PT - el.h) / 2));
    const next = sides.map((s, i) =>
      i === activeIndex ? { elements: [...s.elements, el] } : s
    );
    setSides(next);
    setSelectedId(el.id);
    void cw;
  };

  const handleChangeLogos = (next: Cr80LogoEntry[]) => {
    // Si el usuario borra un logo, también limpia los elementos que lo
    // referenciaban (no es válido tener un logo en el lienzo cuyo asset
    // ya no existe).
    const nextIds = new Set(next.map((l) => l.id));
    const cleanedSides = sides.map((s) => ({
      ...s,
      elements: s.elements.filter(
        (e) => !(e.kind === "logo" && e.logoId && !nextIds.has(e.logoId))
      ),
    }));
    onChange({ pdf: pdfMeta, sides: cleanedSides });
    if (onChangeLogos) onChangeLogos(next);
  };

  const handleElementsChange = (elements: Cr80Element[]) => {
    setSides(
      sides.map((s, i) => (i === activeIndex ? { elements } : s))
    );
  };

  const selected = side.elements.find((el) => el.id === selectedId) || null;

  const handleSelectedChange = (el: Cr80Element) =>
    setSides(
      sides.map((s, i) =>
        i === activeIndex
          ? { elements: s.elements.map((e) => (e.id === el.id ? el : e)) }
          : s
      )
    );

  const handleDelete = () => {
    if (!selectedId) return;
    setSides(
      sides.map((s, i) =>
        i === activeIndex
          ? { elements: s.elements.filter((e) => e.id !== selectedId) }
          : s
      )
    );
    setSelectedId(null);
  };

  const handleDuplicate = () => {
    if (!selected) return;
    const copy: Cr80Element = {
      ...selected,
      id: `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      x: Math.min(selected.x + 8, CR80_WIDTH_PT - selected.w),
      y: Math.min(selected.y + 8, CR80_HEIGHT_PT - selected.h),
    };
    setSides(
      sides.map((s, i) =>
        i === activeIndex ? { elements: [...s.elements, copy] } : s
      )
    );
    setSelectedId(copy.id);
  };

  const handleClearSide = () => {
    if (!window.confirm("¿Borrar todos los elementos de esta cara?")) return;
    setSides(sides.map((s, i) => (i === activeIndex ? { elements: [] } : s)));
    setSelectedId(null);
  };

  const handleApplyBackground = async (
    pdf: TemplatePdfMeta | null
  ): Promise<string | null> => {
    // Mismas caras que páginas: recorta o agrega lados vacíos.
    const nextSides = pdf ? normalizeSides(sides, pdf.pages) : [];
    // Auto-guardado: el proxy /background lee de la BD, así que la
    // referencia debe persistirse antes de pedir el fondo a renderizar.
    try {
      await api.put(ENDPOINTS.CREDENTIAL_TEMPLATE(schoolId), {
        pdf,
        sides: pdf ? nextSides : null,
      });
    } catch (err) {
      return err instanceof Error
        ? err.message
        : "No se pudo guardar el fondo.";
    }
    onChange({ pdf, sides: nextSides });
    if (sideIndex > 0 && (!pdf || pdf.pages < 2)) setSideIndex(0);
    setSelectedId(null);
    return null;
  };

  const sideTabs = [
    { index: 0, label: "Frente" },
    ...(pageCount >= 2 ? [{ index: 1, label: "Reverso" }] : []),
  ];

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap px-3 py-2 border-b border-divider bg-slate-50">
        <div className="flex gap-1">
          {sideTabs.map((t) => (
            <button
              key={t.index}
              type="button"
              onClick={() => {
                setSideIndex(t.index);
                setSelectedId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeIndex === t.index
                  ? "bg-accent-dark text-white"
                  : "text-text-secondary hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setBgEditorOpen(true)}
          >
            <FileUp size={14} className="mr-1.5" />
            {hasPdf ? "Cambiar PDF" : "Subir PDF de fondo"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleClearSide}
            disabled={!hasPdf || side.elements.length === 0}
          >
            <Eraser size={14} className="mr-1.5" />
            Limpiar cara
          </Button>
          {onPreview && (
            <Button variant="sky" size="sm" type="button" onClick={onPreview}>
              <Eye size={14} className="mr-1.5" />
              Vista previa PDF
            </Button>
          )}
        </div>
      </div>

      {/* Cuerpo: paleta | lienzo | propiedades */}
      <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr_250px]">
        <div className="max-h-[300px] lg:max-h-[70vh] overflow-y-auto border-b lg:border-b-0 lg:border-r border-divider">
          {hasPdf ? (
            <ElementsPalette
              schoolId={schoolId}
              logos={logos}
              onChangeLogos={handleChangeLogos}
              elements={side.elements}
              onAdd={handleAdd}
              onAddLogoElement={handleAddLogoElement}
            />
          ) : (
            <div className="p-4 text-xs text-text-muted">
              Sube el PDF de tu plantilla para habilitar la paleta.
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-100 overflow-auto max-h-[70vh] flex justify-center">
          {!hasPdf ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <FileUp size={36} className="text-slate-400" />
              <p className="text-sm font-semibold text-text-primary">
                Aún no hay fondo
              </p>
              <p className="text-xs text-text-secondary max-w-[280px]">
                Sube el PDF de tu plantilla (frente en la página 1 y reverso en
                la página 2, si aplica). Después coloca la foto y los datos
                sobre él.
              </p>
              <Button
                variant="sky"
                size="sm"
                type="button"
                onClick={() => setBgEditorOpen(true)}
              >
                <FileUp size={14} className="mr-1.5" />
                Subir PDF de fondo
              </Button>
            </div>
          ) : bgLoading ? (
            <div className="flex items-center gap-2 py-16 text-sm text-text-secondary">
              <Loader2 size={16} className="animate-spin" />
              Cargando fondo…
            </div>
          ) : (
            <div className="space-y-2">
              <DesignCanvas
                bgImage={bgImage}
                elements={side.elements}
                selectedId={selectedId}
                logos={logos}
                onSelect={setSelectedId}
                onElementsChange={handleElementsChange}
              />
              {bgError && (
                <p className="text-xs text-rose-600 text-center max-w-[420px] mx-auto">
                  No se pudo cargar el fondo: {bgError}
                </p>
              )}
              {!bgImage && !bgError && (
                <p className="text-xs text-text-muted text-center">
                  Vista previa del fondo no disponible.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="max-h-[70vh] overflow-y-auto border-t lg:border-t-0 lg:border-l border-divider">
          <PropertiesPanel
            element={selected}
            onChange={handleSelectedChange}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        </div>
      </div>

      <BackgroundEditor
        isOpen={bgEditorOpen}
        onClose={() => setBgEditorOpen(false)}
        schoolId={schoolId}
        current={pdfMeta}
        onApply={handleApplyBackground}
      />
    </div>
  );
}

// Re-export para que la página pueda crear lados vacíos sin importar la lib.
export { emptySides };
