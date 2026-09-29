// Panel de propiedades del elemento seleccionado en el diseñador CR80.
// Lo que el backend estampa: texto (campo libre/mapeado, tamaño, color,
// negrita, alineación), logos (solo se mueve/redimensiona/borrera), y
// figuras básicas (línea / rect / elipse: stroke, fill, grosor).
//
// La geometría siempre se edita en pt del marco CR80 (242.64 × 153.07).

"use client";

import { AlignCenter, AlignLeft, AlignRight, Bold, Copy, Trash2 } from "lucide-react";
import {
  CR80_HEIGHT_PT,
  CR80_WIDTH_PT,
  TEXT_FIELD_OPTIONS,
  cr80TextAutoHeight,
  type Cr80Element,
} from "@/lib/credential-cr80";

interface PropertiesPanelProps {
  element: Cr80Element | null;
  onChange: (el: Cr80Element) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const labelCls = "block text-[11px] font-semibold text-text-muted mb-1";
const inputCls =
  "w-full px-2 py-1.5 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30";

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

const KIND_LABEL: Record<Cr80Element["kind"], string> = {
  photo: "Foto",
  text: "Texto",
  logo: "Logo",
  shape: "Figura",
};

export function PropertiesPanel({
  element,
  onChange,
  onDelete,
  onDuplicate,
}: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="p-4 h-full">
        <p className="text-xs text-text-muted">
          Selecciona un elemento del lienzo para editar sus propiedades.
        </p>
      </div>
    );
  }

  const st = element.style;
  const setStyle = (patch: Partial<Cr80Element["style"]>) =>
    onChange({ ...element, style: { ...st, ...patch } });
  const setGeom = (patch: Partial<Pick<Cr80Element, "x" | "y" | "w" | "h">>) =>
    onChange({ ...element, ...patch });

  const num = (v: number | undefined, fallback = 0) =>
    v === undefined ? fallback : v;
  const isBold =
    st.fontWeight === "bold" || Number(st.fontWeight ?? 0) >= 600;

  return (
    <div className="p-3 h-full overflow-y-auto space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text-primary uppercase tracking-wide">
          {KIND_LABEL[element.kind]}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            title="Duplicar"
            onClick={onDuplicate}
            className="p-1.5 rounded-lg text-text-muted hover:bg-slate-100"
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            title="Eliminar"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Contenido (solo texto) */}
      {element.kind === "text" && (
        <div className="space-y-2">
          <div>
            <label className={labelCls}>Campo</label>
            <select
              className={inputCls}
              value={element.field || ""}
              onChange={(e) =>
                onChange({
                  ...element,
                  field: e.target.value || null,
                  text: e.target.value ? "" : element.text || "Texto",
                })
              }
            >
              <option value="">— Texto libre —</option>
              {TEXT_FIELD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {!element.field && (
            <div>
              <label className={labelCls}>Texto</label>
              <textarea
                className={`${inputCls} min-h-[60px] resize-y`}
                value={element.text || ""}
                onChange={(e) =>
                  onChange({ ...element, text: e.target.value })
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Tipografía (solo texto) */}
      {element.kind === "text" && (() => {
        // Tamaño efectivo (lo que de verdad se imprime). Lo mostramos bajo
        // el input para que el cambio de tamaño sea visible aunque el ancho
        // de la caja obligue al auto-shrink a reducir el número real.
        const currentSize = num(st.fontSize, 11);
        const { size: effectiveSize, h: effectiveH } = cr80TextAutoHeight(
          element,
          currentSize
        );
        const effectiveHint =
          effectiveSize.toFixed(1) === currentSize.toString()
            ? `${effectiveSize.toFixed(1)} pt`
            : `${effectiveSize.toFixed(1)} pt (limitado por el ancho)`;
        return (
          <div className="space-y-2">
            <Row>
              <div>
                <label className={labelCls}>Tamaño (pt)</label>
                <input
                  className={inputCls}
                  type="number"
                  min={4}
                  max={96}
                  value={currentSize}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      // Borrar = mantener valor previo (evita 0 → 4pt).
                      return;
                    }
                    const v = Number(raw);
                    if (!Number.isFinite(v)) return;
                    const next = Math.max(4, Math.min(96, v));
                    // Re-medimos la altura con el nuevo tamaño sobre un
                    // elemento hipotético que ya tenga ese fontSize (el
                    // wrap depende del tamaño real a estampar).
                    const probe: Cr80Element = {
                      ...element,
                      style: { ...st, fontSize: next },
                    };
                    const { h } = cr80TextAutoHeight(probe, next);
                    onChange({
                      ...element,
                      style: { ...st, fontSize: next },
                      h,
                    });
                  }}
                />
                <p className="mt-1 text-[10px] text-text-muted">
                  efectivo: {effectiveHint} · alto: {Math.round(effectiveH)} pt
                </p>
              </div>
            <div>
              <label className={labelCls}>Color</label>
              <input
                className={`${inputCls} h-[30px] p-1`}
                type="color"
                value={st.color || "#0f172a"}
                onChange={(e) => setStyle({ color: e.target.value })}
              />
            </div>
          </Row>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              title="Negrita"
              onClick={() => setStyle({ fontWeight: isBold ? "normal" : "bold" })}
              className={`p-1.5 rounded-lg border ${
                isBold
                  ? "bg-sky-50 border-sky-300 text-sky-700"
                  : "border-border text-text-muted"
              }`}
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              title="Izquierda"
              onClick={() => setStyle({ textAlign: "left" })}
              className={`p-1.5 rounded-lg border ${
                (st.textAlign || "left") === "left"
                  ? "bg-sky-50 border-sky-300 text-sky-700"
                  : "border-border text-text-muted"
              }`}
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              title="Centro"
              onClick={() => setStyle({ textAlign: "center" })}
              className={`p-1.5 rounded-lg border ${
                st.textAlign === "center"
                  ? "bg-sky-50 border-sky-300 text-sky-700"
                  : "border-border text-text-muted"
              }`}
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              title="Derecha"
              onClick={() => setStyle({ textAlign: "right" })}
              className={`p-1.5 rounded-lg border ${
                st.textAlign === "right"
                  ? "bg-sky-50 border-sky-300 text-sky-700"
                  : "border-border text-text-muted"
              }`}
            >
              <AlignRight size={13} />
            </button>
          </div>
          </div>
        );
      })()}

      {element.kind === "photo" && (
        <p className="text-xs text-text-muted">
          Caja de la foto del alumno. Si el alumno no tiene foto, se imprime
          un recuadro gris en su lugar.
        </p>
      )}

      {element.kind === "logo" && (
        <p className="text-xs text-text-muted">
          Logo de la escuela. El checkbox en la paleta lo agrega o quita
          del lienzo. Solo se imprime si está presente aquí.
        </p>
      )}

      {element.kind === "shape" && (
        <div className="space-y-2">
          <Row>
            <div>
              <label className={labelCls}>Trazo</label>
              <input
                className={`${inputCls} h-[30px] p-1`}
                type="color"
                value={st.stroke || "#1e293b"}
                onChange={(e) => setStyle({ stroke: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Grosor (pt)</label>
              <input
                className={inputCls}
                type="number"
                min={0.5}
                max={8}
                step={0.5}
                value={num(st.strokeWidth, 1)}
                onChange={(e) =>
                  setStyle({ strokeWidth: Number(e.target.value) })
                }
              />
            </div>
          </Row>
          {element.shape !== "line" && (
            <div>
              <label className={labelCls}>Relleno</label>
              <div className="flex items-center gap-2">
                <input
                  className={`${inputCls} h-[30px] p-1`}
                  type="color"
                  value={st.fill || "#ffffff"}
                  onChange={(e) => setStyle({ fill: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setStyle({ fill: undefined })}
                  className="text-[11px] text-text-muted hover:text-text-primary"
                >
                  Sin relleno
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Geometría (pt del marco CR80) */}
      <div>
        <label className={labelCls}>
          Posición y tamaño (pt · {Math.round(CR80_WIDTH_PT)} ×{" "}
          {Math.round(CR80_HEIGHT_PT)})
        </label>
        <Row>
          <input
            className={inputCls}
            type="number"
            step="0.1"
            title="X"
            value={element.x}
            onChange={(e) => setGeom({ x: Number(e.target.value) })}
          />
          <input
            className={inputCls}
            type="number"
            step="0.1"
            title="Y"
            value={element.y}
            onChange={(e) => setGeom({ y: Number(e.target.value) })}
          />
          <input
            className={inputCls}
            type="number"
            step="0.1"
            title="Ancho"
            value={element.w}
            onChange={(e) =>
              setGeom({ w: Math.max(4, Number(e.target.value)) })
            }
          />
          <input
            className={inputCls}
            type="number"
            step="0.1"
            title="Alto"
            value={element.h}
            onChange={(e) =>
              setGeom({ h: Math.max(4, Number(e.target.value)) })
            }
          />
        </Row>
      </div>
    </div>
  );
}
