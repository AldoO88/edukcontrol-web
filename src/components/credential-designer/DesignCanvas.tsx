// Lienzo del diseñador CR80: marco de tarjeta PVC (242.64 × 153.07 pt) con
// el PDF de fondo escalado "contain" (misma fórmula que el backend) y los
// elementos encima. Drag & resize con pointer events; las coordenadas se
// guardan en pt reales (origen arriba-izquierda) — lo que ves es lo que
// imprime. Resize desde 8 puntos (4 esquinas + 4 medios).

"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import {
  CR80_HEIGHT_PT,
  CR80_WIDTH_PT,
  cr80TextPreview,
  scaleToFit,
  type Cr80Element,
  type Cr80LogoEntry,
} from "@/lib/credential-cr80";
import {
  CR80_ASCENDER_RATIO,
  CR80_LINE_SPACING,
  cr80LineHeight,
  cr80TextWidth,
} from "@/lib/cr80-text-metrics";
import { layoutCr80Text } from "@/lib/cr80-text-layout";
import type { Cr80FontKind } from "@/lib/cr80-text-metrics";

export interface CanvasBgImage {
  src: string;
  width: number; // pt lógicos del PDF
  height: number; // pt lógicos del PDF
}

interface DesignCanvasProps {
  bgImage: CanvasBgImage | null;
  elements: Cr80Element[];
  selectedId: string | null;
  logos: Cr80LogoEntry[];
  onSelect: (id: string | null) => void;
  onElementsChange: (elements: Cr80Element[]) => void;
}

type ResizeHandle =
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | "n"
  | "s"
  | "e"
  | "w";

type DragState = {
  id: string;
  mode: "move" | "resize";
  handle?: ResizeHandle;
  startX: number;
  startY: number;
  orig: { x: number; y: number; w: number; h: number };
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

const HANDLES: { handle: ResizeHandle; left: string; top: string; cursor: string }[] = [
  { handle: "nw", left: "-6px", top: "-6px", cursor: "nwse-resize" },
  { handle: "ne", left: "calc(100% - 4px)", top: "-6px", cursor: "nesw-resize" },
  { handle: "sw", left: "-6px", top: "calc(100% - 4px)", cursor: "nesw-resize" },
  { handle: "se", left: "calc(100% - 4px)", top: "calc(100% - 4px)", cursor: "nwse-resize" },
  { handle: "n", left: "calc(50% - 5px)", top: "-6px", cursor: "ns-resize" },
  { handle: "s", left: "calc(50% - 5px)", top: "calc(100% - 4px)", cursor: "ns-resize" },
  { handle: "e", left: "calc(100% - 4px)", top: "calc(50% - 5px)", cursor: "ew-resize" },
  { handle: "w", left: "-6px", top: "calc(50% - 5px)", cursor: "ew-resize" },
];

export function DesignCanvas({
  bgImage,
  elements,
  selectedId,
  logos,
  onSelect,
  onElementsChange,
}: DesignCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [fitScale, setFitScale] = useState(1.6);
  const [manualScale, setManualScale] = useState<number | null>(null);
  const scale = manualScale ?? fitScale;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setFitScale(Math.max(0.5, Math.min(w / CR80_WIDTH_PT, 3.2)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 8;
  const zoomStep = (factor: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale * factor));
    setManualScale(Math.round(next * 100) / 100);
  };
  const zoomPercent = Math.round(scale * 100);

  const startDrag = (
    e: React.PointerEvent,
    el: Cr80Element,
    mode: "move" | "resize",
    handle?: ResizeHandle
  ) => {
    e.stopPropagation();
    onSelect(el.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      id: el.id,
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      orig: { x: el.x, y: el.y, w: el.w, h: el.h },
    };
  };

  const resizeNew = (
    o: DragState["orig"],
    dx: number,
    dy: number,
    handle: ResizeHandle
  ) => {
    // Devuelve { x, y, w, h } ajustando el lado opuesto al handle.
    let { x, y, w, h } = o;
    if (handle === "nw") {
      x = o.x + dx; y = o.y + dy; w = o.w - dx; h = o.h - dy;
    } else if (handle === "ne") {
      y = o.y + dy; w = o.w + dx; h = o.h - dy; x = o.x;
    } else if (handle === "sw") {
      x = o.x + dx; w = o.w - dx; h = o.h + dy; y = o.y;
    } else if (handle === "se") {
      w = o.w + dx; h = o.h + dy; x = o.x; y = o.y;
    } else if (handle === "n") {
      y = o.y + dy; h = o.h - dy; x = o.x; w = o.w;
    } else if (handle === "s") {
      h = o.h + dy; x = o.x; y = o.y; w = o.w;
    } else if (handle === "e") {
      w = o.w + dx; x = o.x; y = o.y; h = o.h;
    } else if (handle === "w") {
      x = o.x + dx; w = o.w - dx; y = o.y; h = o.h;
    }
    return { x, y, w, h };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;

    const next = elements.map((el) => {
      if (el.id !== d.id) return el;
      if (d.mode === "move") {
        return {
          ...el,
          x: round2(clamp(d.orig.x + dx, 0, CR80_WIDTH_PT - el.w)),
          y: round2(clamp(d.orig.y + dy, 0, CR80_HEIGHT_PT - el.h)),
        };
      }
      const cand = resizeNew(d.orig, dx, dy, d.handle || "se");
      // Mantener la cara opuesta fija: w/h en [4, card] y el elemento
      // dentro del marco (clamp x,y respetando w,h resultantes).
      const minSize = 4;
      const wNew = round2(clamp(cand.w, minSize, CR80_WIDTH_PT));
      const hNew = round2(clamp(cand.h, minSize, CR80_HEIGHT_PT));
      // Ajustar x cuando hace falta para no salirse.
      const cxRaw = cand.w >= minSize ? cand.x : d.orig.x + (d.orig.w - minSize) * (d.handle === "nw" || d.handle === "sw" || d.handle === "w" ? -1 : 0);
      const cyRaw = cand.h >= minSize ? cand.y : d.orig.y + (d.orig.h - minSize) * (d.handle === "nw" || d.handle === "ne" || d.handle === "n" ? -1 : 0);
      const xNew = round2(clamp(cxRaw, 0, Math.max(0, CR80_WIDTH_PT - wNew)));
      const yNew = round2(clamp(cyRaw, 0, Math.max(0, CR80_HEIGHT_PT - hNew)));
      // Si el clamp de w/h modificó los valores, re-clamp x,y de nuevo.
      return {
        ...el,
        w: wNew,
        h: hNew,
        x: round2(clamp(xNew, 0, Math.max(0, CR80_WIDTH_PT - wNew))),
        y: round2(clamp(yNew, 0, Math.max(0, CR80_HEIGHT_PT - hNew))),
      };
    });
    onElementsChange(next);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (dragRef.current) {
      dragRef.current = null;
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  const lookupLogo = (logoId: string | null | undefined) =>
    logoId ? logos.find((l) => l.id === logoId) || null : null;

  const renderShape = (el: Cr80Element) => {
    const st = el.style || {};
    const w = st.strokeWidth ?? 1;
    const stroke = st.stroke || "#1e293b";
    const fill = el.shape === "line" ? "transparent" : st.fill || "#ffffff";
    if (el.shape === "line") {
      const y = el.h / 2;
      return (
        <svg
          width={el.w}
          height={el.h}
          viewBox={`0 0 ${el.w} ${el.h}`}
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <line
            x1={0}
            y1={y}
            x2={el.w}
            y2={y}
            stroke={stroke}
            strokeWidth={w}
            strokeLinecap="square"
          />
        </svg>
      );
    }
    if (el.shape === "ellipse") {
      return (
        <svg
          width={el.w}
          height={el.h}
          viewBox={`0 0 ${el.w} ${el.h}`}
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <ellipse
            cx={el.w / 2}
            cy={el.h / 2}
            rx={el.w / 2}
            ry={el.h / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={w}
          />
        </svg>
      );
    }
    // rect
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: fill,
          border: `${w}px solid ${stroke}`,
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      />
    );
  };

  const renderLogo = (el: Cr80Element) => {
    const lg = lookupLogo(el.logoId);
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f5f7fa",
          border: "1px dashed #94a3b8",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
          fontSize: 6,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {lg ? (
          <img
            src={lg.url}
            alt={lg.label || lg.public_id}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span>Logo</span>
        )}
      </div>
    );
  };

  const renderElement = (el: Cr80Element) => {
    const isSelected = el.id === selectedId;
    const box: CSSProperties = {
      position: "absolute",
      left: el.x,
      top: el.y,
      width: el.w,
      height: el.h,
      outline: isSelected ? "2px solid #0284c7" : "none",
      outlineOffset: 1,
      touchAction: "none",
      cursor: "move",
    };

    let content: React.ReactNode = null;

    if (el.kind === "photo") {
      content = (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#e1e7ef",
            border: "1px dashed #94a3b8",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 7,
            color: "#475569",
            pointerEvents: "none",
          }}
        >
          Foto
        </div>
      );
    } else if (el.kind === "logo") {
      content = renderLogo(el);
    } else if (el.kind === "shape") {
      content = renderShape(el);
    } else {
      const st = el.style;
      const kind: Cr80FontKind =
        st.fontWeight === "bold" || Number(st.fontWeight) >= 600
          ? "bold"
          : "regular";
      const paragraphs = cr80TextPreview(el).split("\n");
      const { lines, size } = layoutCr80Text(
        paragraphs,
        el.w,
        el.h,
        st.fontSize ?? 16,
        kind
      );
      const spacing = size * CR80_LINE_SPACING;
      const lineH = cr80LineHeight(size);
      const blockTop = Math.max(0, (el.h - lines.length * spacing) / 2);
      const align = st.textAlign ?? "left";
      content = (
        <svg
          width={el.w}
          height={el.h}
          viewBox={`0 0 ${el.w} ${el.h}`}
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          {lines.map((line, i) => {
            const tw = cr80TextWidth(line, size, kind);
            let lx = 0;
            if (align === "center") lx = Math.max(0, (el.w - tw) / 2);
            else if (align === "right") lx = Math.max(0, el.w - tw);
            const ly =
              blockTop + i * spacing + lineH * CR80_ASCENDER_RATIO;
            return (
              <text
                key={i}
                x={lx}
                y={ly}
                fill={st.color || "#000000"}
                fontSize={size}
                fontFamily="Helvetica, Arial, sans-serif"
                fontWeight={kind === "bold" ? 700 : 400}
                textAnchor="start"
                dominantBaseline="alphabetic"
                style={{ pointerEvents: "none" }}
              >
                {line}
              </text>
            );
          })}
        </svg>
      );
    }

    return (
      <div
        key={el.id}
        style={box}
        onPointerDown={(e) => startDrag(e, el, "move")}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {content}
        {isSelected &&
          HANDLES.map((h) => (
            <div
              key={h.handle}
              onPointerDown={(e) => startDrag(e, el, "resize", h.handle)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{
                position: "absolute",
                left: h.left,
                top: h.top,
                width: 10,
                height: 10,
                background: "#0284c7",
                border: "2px solid #fff",
                borderRadius: 3,
                cursor: h.cursor,
                touchAction: "none",
              }}
              title="Arrastrar para redimensionar"
            />
          ))}
      </div>
    );
  };

  const fit = bgImage
    ? scaleToFit(bgImage.width, bgImage.height, CR80_WIDTH_PT, CR80_HEIGHT_PT)
    : null;

  return (
    <div ref={wrapRef} className="w-full">
      {/* Controles de zoom */}
      <div className="flex items-center justify-center gap-1 mb-2 select-none">
        <button
          type="button"
          title="Alejar"
          onClick={() => zoomStep(1 / 1.25)}
          className="p-1.5 rounded-lg border border-border bg-white text-text-muted hover:bg-slate-100"
        >
          <ZoomOut size={14} />
        </button>
        <span
          className="w-14 text-center text-xs font-semibold text-text-secondary tabular-nums"
          title="Zoom del lienzo"
        >
          {zoomPercent}%
        </span>
        <button
          type="button"
          title="Acercar"
          onClick={() => zoomStep(1.25)}
          className="p-1.5 rounded-lg border border-border bg-white text-text-muted hover:bg-slate-100"
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          title="Ajustar a la ventana"
          onClick={() => setManualScale(null)}
          className={`ml-1 px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 ${
            manualScale === null
              ? "border-sky-300 bg-sky-50 text-sky-700"
              : "border-border bg-white text-text-muted hover:bg-slate-100"
          }`}
        >
          <Maximize2 size={12} />
          Ajustar
        </button>
      </div>
      <div
        style={{
          width: CR80_WIDTH_PT * scale,
          height: CR80_HEIGHT_PT * scale,
        }}
        className="relative"
      >
        <div
          onPointerDown={() => onSelect(null)}
          style={{
            width: CR80_WIDTH_PT,
            height: CR80_HEIGHT_PT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
            background: "#ffffff",
            boxShadow: "0 4px 24px rgba(15,23,42,0.15)",
            overflow: "hidden",
          }}
        >
          {bgImage && fit ? (
            <img
              src={bgImage.src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: fit.x,
                top: fit.y,
                width: fit.width,
                height: fit.height,
                pointerEvents: "none",
              }}
            />
          ) : null}

          {elements.map(renderElement)}
        </div>

        {elements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[11px] text-text-muted bg-white/90 border border-border rounded-lg px-3 py-1.5">
              Cara vacía — agrega la foto y los datos desde la paleta
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
