// Tipos y utilidades del diseñador CR80 (tarjeta PVC 85.6 × 54 mm).
//
// Coordenadas en puntos PDF (242.64 × 153.07) con origen arriba-izquierda,
// idénticas a las que guarda el backend (credential-template.service.js).
// El lienzo usa scaleToFit "contain" con la misma fórmula que
// credential-pdf.service.js para que la vista previa coincida con la
// impresión.

import { FIELD_SAMPLE_TEXT, TEXT_FIELD_OPTIONS, fieldLabel } from "./credential-layout";
import { layoutCr80Text } from "./cr80-text-layout";
import {
  CR80_LINE_SPACING,
  CR80_MIN_FONT_PT,
  type Cr80FontKind,
} from "./cr80-text-metrics";

export const CR80_WIDTH_PT = 242.64;
export const CR80_HEIGHT_PT = 153.07;
export const MAX_PDF_PAGES = 2;
export const MAX_TEMPLATE_PDF_BYTES = 10 * 1024 * 1024; // ≤ backend upload

export interface TemplatePdfMeta {
  url: string;
  public_id?: string | null;
  asset_id?: string | null;
  pages: number;
  widthPt: number;
  heightPt: number;
}

export interface Cr80Style {
  fontSize?: number;
  color?: string;
  fontWeight?: "bold" | "normal" | number;
  textAlign?: "left" | "center" | "right" | "justify";
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
}

export type Cr80ShapeKind = "line" | "rect" | "ellipse";

export interface Cr80Element {
  id: string;
  kind: "photo" | "text" | "logo" | "shape";
  x: number;
  y: number;
  w: number;
  h: number;
  field?: string | null;
  text?: string;
  logoId?: string | null;
  shape?: Cr80ShapeKind;
  style: Cr80Style;
}

// Logo subido por el usuario: vive en School.credentialConfig.logos[] y se
// referencia desde elementos `kind:"logo"` del lienzo.
export interface Cr80LogoEntry {
  id: string;
  url: string;
  public_id: string;
  asset_id?: string | null;
  format?: string | null;
  label?: string;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  createdAt?: string | null;
}

export interface Cr80Side {
  elements: Cr80Element[];
}
export type Cr80Sides = Cr80Side[];

let seq = 0;
export function newElementId(): string {
  seq += 1;
  return `el_${Date.now().toString(36)}_${seq}`;
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// Escalado "contain" centrado — misma fórmula que el backend.
export function scaleToFit(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number
): { scale: number; x: number; y: number; width: number; height: number } {
  const scale = Math.min(maxW / srcW, maxH / srcH);
  const width = srcW * scale;
  const height = srcH * scale;
  return { scale, width, height, x: (maxW - width) / 2, y: (maxH - height) / 2 };
}

// Espejo del backend (services/credential-template.service.js#fitBackground):
// cover si el recorte queda dentro del sangrado típico (≤ 8.5 pt ≈ 3 mm),
// si no contain. Espejo exacto: mantenerlo idéntico al backend para que el
// preview del lienzo coincida con el PDF que se imprime.
export const MAX_BG_CROP_PT = 8.5;

export interface FitRect {
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function fitBackground(
  srcW: number,
  srcH: number,
  frameW: number,
  frameH: number
): FitRect {
  if (!(srcW > 0) || !(srcH > 0) || !(frameW > 0) || !(frameH > 0)) {
    return scaleToFit(srcW, srcH, frameW, frameH);
  }
  const coverScale = Math.max(frameW / srcW, frameH / srcH);
  const drawnW = srcW * coverScale;
  const drawnH = srcH * coverScale;
  const overflowW = Math.max(0, (drawnW - frameW) / 2);
  const overflowH = Math.max(0, (drawnH - frameH) / 2);
  if (Math.max(overflowW, overflowH) <= MAX_BG_CROP_PT) {
    return {
      scale: coverScale,
      x: (frameW - drawnW) / 2,
      y: (frameH - drawnH) / 2,
      width: drawnW,
      height: drawnH,
    };
  }
  return scaleToFit(srcW, srcH, frameW, frameH);
}

// Marco de salida del lienzo/PDF: la orientación la dicta el PDF de fondo
// (alto > ancho → vertical). Si no hay fondo, default horizontal (la
// convención histórica). Retorna { w, h, portrait } en pt PDF.
export interface Cr80Frame {
  w: number;
  h: number;
  portrait: boolean;
}

export function getFrame(widthPt: number | null | undefined, heightPt: number | null | undefined): Cr80Frame {
  if (
    Number.isFinite(widthPt) &&
    Number.isFinite(heightPt) &&
    (widthPt as number) > 0 &&
    (heightPt as number) > 0
  ) {
    const w = widthPt as number;
    const h = heightPt as number;
    return { w, h, portrait: h > w };
  }
  return { w: CR80_WIDTH_PT, h: CR80_HEIGHT_PT, portrait: false };
}

// Mapper afín entre el marco horizontal canónico (donde se guardan los
// elementos en BD) y el marco de salida del lienzo/PDF (orientado como el
// fondo). Si la salida es horizontal y el fit es idéntico, k = 1 → identidad
// (cero regresión). Los elementos se GUARDAN en coordenadas canónicas
// (stored) y se PINTAN / EDITA el usuario en coordenadas view.
export interface FrameMapper {
  /** Convierte un rect del marco horizontal canónico al marco de salida. */
  toViewRect: (r: { x: number; y: number; w: number; h: number }) => {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  /** Inverso: del marco de salida al canónico (lo que se guarda). */
  fromViewRect: (r: { x: number; y: number; w: number; h: number }) => {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  /** Factor uniforme k = sView / sStored (1 = identidad). */
  scale: number;
  /** Marco destino del lienzo y de la página de salida. */
  frame: Cr80Frame;
}

export function createFrameMapper(
  srcWidth: number,
  srcHeight: number,
  frame: Cr80Frame
): FrameMapper {
  const fitOld = fitBackground(srcWidth, srcHeight, CR80_WIDTH_PT, CR80_HEIGHT_PT);
  const fitNew = fitBackground(srcWidth, srcHeight, frame.w, frame.h);
  const k =
    fitOld.scale > 0 && fitNew.scale > 0 ? fitNew.scale / fitOld.scale : 1;
  const ox = fitOld.x;
  const oy = fitOld.y;
  const nx = fitNew.x;
  const ny = fitNew.y;
  return {
    scale: k,
    frame,
    toViewRect: (r) => {
      const w = Math.max(4, r.w * k);
      const h = Math.max(4, r.h * k);
      const x = nx + (r.x - ox) * k;
      const y = ny + (r.y - oy) * k;
      return {
        x: Math.min(Math.max(0, x), Math.max(0, frame.w - w)),
        y: Math.min(Math.max(0, y), Math.max(0, frame.h - h)),
        w,
        h,
      };
    },
    fromViewRect: (r) => {
      if (k <= 0) return { x: r.x, y: r.y, w: r.w, h: r.h };
      const w = r.w / k;
      const h = r.h / k;
      const x = ox + (r.x - nx) / k;
      const y = oy + (r.y - ny) / k;
      return { x, y, w, h };
    },
  };
}

export function emptySides(pages = 1): Cr80Sides {
  const n = clamp(Math.round(pages), 1, MAX_PDF_PAGES);
  return Array.from({ length: n }, () => ({ elements: [] }));
}

export function normalizePdfMeta(raw: unknown): TemplatePdfMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Partial<TemplatePdfMeta>;
  if (typeof m.url !== "string" || !m.url) return null;
  return {
    url: m.url,
    public_id: typeof m.public_id === "string" ? m.public_id : null,
    asset_id: typeof m.asset_id === "string" ? m.asset_id : null,
    pages: clamp(Math.round(Number(m.pages) || 1), 1, MAX_PDF_PAGES),
    widthPt: round2(clamp(Number(m.widthPt) || CR80_WIDTH_PT, 1, 2000)),
    heightPt: round2(clamp(Number(m.heightPt) || CR80_HEIGHT_PT, 1, 2000)),
  };
}

const SHAPE_KINDS_SET: ReadonlySet<Cr80ShapeKind> = new Set([
  "line",
  "rect",
  "ellipse",
]);

function normalizeElement(raw: unknown): Cr80Element | null {
  if (!raw || typeof raw !== "object") return null;
  const el = raw as Partial<Cr80Element>;
  const kind =
    el.kind === "photo" ||
    el.kind === "text" ||
    el.kind === "logo" ||
    el.kind === "shape"
      ? el.kind
      : null;
  if (!kind) return null;
  const style = (el.style && typeof el.style === "object"
    ? el.style
    : {}) as Cr80Style;

  const defaultW =
    kind === "photo" ? 60 : kind === "logo" ? 30 : kind === "shape" ? 50 : 100;
  const defaultH =
    kind === "photo" ? 75 : kind === "logo" ? 30 : kind === "shape" ? 6 : 14;

  const out: Cr80Element = {
    id:
      typeof el.id === "string" && el.id ? el.id.slice(0, 64) : newElementId(),
    kind,
    x: round2(clamp(Number(el.x) || 0, 0, CR80_WIDTH_PT)),
    y: round2(clamp(Number(el.y) || 0, 0, CR80_HEIGHT_PT)),
    w: round2(clamp(Number(el.w) || defaultW, 4, CR80_WIDTH_PT)),
    h: round2(clamp(Number(el.h) || defaultH, 4, CR80_HEIGHT_PT)),
    style: {},
  };
  out.x = round2(clamp(Number(el.x) || 0, 0, Math.max(0, CR80_WIDTH_PT - out.w)));
  out.y = round2(clamp(Number(el.y) || 0, 0, Math.max(0, CR80_HEIGHT_PT - out.h)));

  if (kind === "text") {
    out.field =
      typeof el.field === "string" &&
      TEXT_FIELD_OPTIONS.some((o) => o.value === el.field)
        ? el.field
        : null;
    out.text = typeof el.text === "string" ? el.text.slice(0, 300) : "";
    out.style.fontSize = clamp(Number(style.fontSize) || 16, 4, 96);
    out.style.color =
      typeof style.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(style.color)
        ? style.color
        : "#000000";
    if (style.fontWeight === "bold" || Number(style.fontWeight) >= 600) {
      out.style.fontWeight = "bold";
    } else if (
      style.fontWeight === "normal" ||
      Number(style.fontWeight) === 400
    ) {
      out.style.fontWeight = "normal";
    }
    if (
      style.textAlign === "center" ||
      style.textAlign === "right" ||
      style.textAlign === "left"
    ) {
      out.style.textAlign = style.textAlign;
    }
  } else if (kind === "logo") {
    out.logoId =
      typeof el.logoId === "string" && el.logoId ? el.logoId.slice(0, 128) : null;
  } else if (kind === "shape") {
    const sh =
      typeof el.shape === "string" ? (el.shape as Cr80ShapeKind) : "rect";
    out.shape = SHAPE_KINDS_SET.has(sh) ? sh : "rect";
    if (typeof style.stroke === "string" && /^#[0-9a-fA-F]{3,8}$/.test(style.stroke)) {
      out.style.stroke = style.stroke;
    } else {
      out.style.stroke = "#1e293b";
    }
    if (style.fill === null) {
      out.style.fill = undefined;
    } else if (typeof style.fill === "string" && /^#[0-9a-fA-F]{3,8}$/.test(style.fill)) {
      out.style.fill = style.fill;
    } else {
      out.style.fill = "#ffffff";
    }
    out.style.strokeWidth = clamp(Number(style.strokeWidth) || 1, 0.5, 8);
  }
  return out;
}

// Logo persistence shape (uniforma la respuesta de GET template / POST logo)
export function normalizeLogoEntry(raw: unknown): Cr80LogoEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const l = raw as Partial<Cr80LogoEntry>;
  if (typeof l.id !== "string" || !l.id) return null;
  if (typeof l.url !== "string" || !l.url) return null;
  if (typeof l.public_id !== "string" || !l.public_id) return null;
  return {
    id: l.id.slice(0, 64),
    url: l.url,
    public_id: l.public_id,
    asset_id:
      typeof l.asset_id === "string" ? l.asset_id.slice(0, 128) : null,
    format: typeof l.format === "string" ? l.format : null,
    label: typeof l.label === "string" ? l.label.slice(0, 80) : "",
    width: Number.isFinite(l.width) ? Math.round(l.width as number) : null,
    height: Number.isFinite(l.height) ? Math.round(l.height as number) : null,
    bytes: Number.isFinite(l.bytes) ? Math.round(l.bytes as number) : null,
    createdAt:
      typeof l.createdAt === "string" ? l.createdAt : null,
  };
}

// Reconstruye los lados guardados; recorta/crea según las páginas del PDF.
export function normalizeSides(raw: unknown, pages: number): Cr80Sides {
  const sides = emptySides(pages);
  if (!Array.isArray(raw)) return sides;
  for (let i = 0; i < Math.min(raw.length, sides.length); i++) {
    const side = raw[i] as { elements?: unknown[] } | null;
    const elements = side && Array.isArray(side.elements) ? side.elements : [];
    sides[i] = {
      elements: elements
        .map(normalizeElement)
        .filter((el): el is Cr80Element => el !== null),
    };
  }
  return sides;
}

// Elementos nuevos: cajas por defecto dentro del marco CR80.
export function createCr80Element(
  kind: "photo" | "text" | "logo" | "shape",
  opts: { field?: string; logoId?: string; shape?: Cr80ShapeKind } = {}
): Cr80Element {
  const id = newElementId();
  if (kind === "photo") {
    return { id, kind, x: 8, y: 34, w: 50, h: 64, style: {} };
  }
  if (kind === "logo") {
    return {
      id,
      kind,
      x: 8,
      y: 12,
      w: 28,
      h: 18,
      logoId: opts.logoId ?? null,
      style: {},
    };
  }
  if (kind === "shape") {
    const sh = opts.shape ?? "rect";
    if (sh === "line") {
      return {
        id,
        kind,
        x: 10,
        y: 80,
        w: 60,
        h: 4,
        shape: "line",
        style: { stroke: "#1e293b", strokeWidth: 1 },
      };
    }
    return {
      id,
      kind,
      x: 80,
      y: 40,
      w: 50,
      h: 40,
      shape: sh,
      style: {
        stroke: "#1e293b",
        fill: sh === "rect" ? "#ffffff" : "#e2e8f0",
        strokeWidth: 1,
      },
    };
  }
  return {
    id,
    kind: "text",
    field: opts.field ?? null,
    text: opts.field ? "" : "Texto",
    x: opts.field ? 64 : 64,
    y: 100,
    w: opts.field ? 170 : 120,
    h: 14,
    style: { fontSize: 11, color: "#0f172a", fontWeight: "normal", textAlign: "left" },
  };
}

// Texto que muestra el lienzo para un elemento (placeholder del campo).
// Para campos mapeados, usa un ejemplo realista calibrado con la longitud
// típica de los datos reales (ver FIELD_SAMPLE_TEXT). Esto permite que el
// usuario vea cómo se comportará el render final con nombres largos y
// cortos, y puede dimensionar la caja antes de imprimir.
export function cr80TextPreview(el: Cr80Element): string {
  if (el.field) {
    return FIELD_SAMPLE_TEXT[el.field] || fieldLabel("text", el.field) || "—";
  }
  return el.text || "";
}

// "Tamaño(pt)" del inspector: al cambiarlo, la caja se re-dimensiona para
// que el número pedido se imprima (hasta donde el ancho lo permita) sin
// cambiar la línea base vertical del texto (rectángulo bordea el bloque).
// Idea: pasamos un alto enorme para que el auto-shrink sólo constriña por
// ancho; tomamos { lines, size } y devolvemos h = lines × size × 1.2.
//
// Devuelve además `size` (puede ser menor al pedido si el ancho obliga a
// encoger la fuente — útil para avisarle al usuario en un hint debajo del
// input). En cualquier caso el `size` es exactamente el que
// `DesignCanvas` y el PDF van a dibujar.
export interface Cr80AutoHeightResult {
  h: number;
  size: number;
}

export function cr80TextAutoHeight(
  el: Cr80Element,
  requestedFontSize: number
): Cr80AutoHeightResult {
  const paragraphs = cr80TextPreview(el).split("\n");
  const st = el.style;
  const kind: Cr80FontKind =
    st?.fontWeight === "bold" || Number(st?.fontWeight) >= 600
      ? "bold"
      : "regular";
  const { lines, size } = layoutCr80Text(
    paragraphs,
    el.w,
    CR80_HEIGHT_PT, // alto "infinito": solo constriñe ancho
    requestedFontSize,
    kind
  );
  const lineBlock = lines.length * size * CR80_LINE_SPACING;
  const maxH = Math.max(size * CR80_LINE_SPACING, CR80_HEIGHT_PT - el.y);
  const minH = Math.max(size * CR80_LINE_SPACING, CR80_MIN_FONT_PT);
  const h = Math.max(minH, Math.min(lineBlock, maxH));
  return { h, size };
}

export { TEXT_FIELD_OPTIONS };
