// Tipos, paleta y fábricas del diseñador visual de credenciales.
// Deben mantenerse alineados con services/credential-layout.service.js del
// backend (mismos campos mapeables, mismas coordenadas 816x1056 px = Letter).

export const CANVAS_WIDTH = 816;
export const CANVAS_HEIGHT = 1056;

export type ElementKind = "text" | "image" | "shape";
export type DesignSide = "front" | "back";

export interface ElementStyle {
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  fontWeight?: number | "bold" | "normal";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right" | "justify";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through";
  lineHeight?: number;
  letterSpacing?: number;
  padding?: number;
  borderRadius?: number;
  opacity?: number;
  objectFit?: "cover" | "contain" | "fill" | "none";
}

export interface LayoutElement {
  id: string;
  kind: ElementKind;
  field?: string | null;
  text?: string;
  src?: string;
  shape?: "rect" | "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
  style: ElementStyle;
}

export interface CredentialBackground {
  type: "image" | "css" | "none";
  url?: string;
  css?: string;
}

export interface LayoutPage {
  background: CredentialBackground;
  elements: LayoutElement[];
}

export interface CredentialLayout {
  version: 1;
  front: LayoutPage;
  back: LayoutPage;
}

// Datos mínimos que el lienzo usa para previsualizar (placeholders + logos).
export interface PreviewContext {
  dgetLogoUrl?: string;
  iheLogoUrl?: string;
  watermarkUrl?: string;
  logoUrl?: string;
}

export interface FieldOption {
  value: string;
  label: string;
}

export const TEXT_FIELD_OPTIONS: FieldOption[] = [
  { value: "student.full_name", label: "Nombre completo" },
  { value: "student.first_name", label: "Nombre" },
  { value: "student.last_name", label: "Apellidos" },
  { value: "student.controlNumber", label: "No. de control" },
  { value: "student.blood_type", label: "Tipo de sangre" },
  { value: "student.sex", label: "Sexo" },
  { value: "group.grade_section", label: "Grado y sección" },
  { value: "group.grade", label: "Grado" },
  { value: "group.section", label: "Sección" },
  { value: "group.shift", label: "Turno" },
  { value: "schoolYear.name", label: "Ciclo escolar" },
  { value: "school.name", label: "Nombre de la escuela" },
  { value: "school.honoraryName", label: "Nombre honorífico" },
  { value: "school.cct", label: "CCT" },
  { value: "school.address", label: "Dirección" },
  { value: "school.phoneNumber", label: "Teléfono" },
  { value: "school.directorName", label: "Director" },
  { value: "school.city", label: "Ciudad" },
  { value: "school.values", label: "Valores" },
  { value: "school.indications", label: "Indicaciones (lista)" },
  { value: "guardian.phone", label: "Teléfono del tutor" },
];

// Texto de muestra realista para cada campo cuando se renderiza el lienzo.
// Calibrado con nombres mexicanos de secundaria técnica (long-tailed): la
// mayoría de nombres cortos caben en 1–2 líneas, pero los largos como
// "LOPEZ GUADARRAMA FRANCISCO DE JESUS" pueden requerir 3 líneas. Sin este
// muestreo, el lienzo muestra el literal del campo (p. ej. "Nombre
// completo") y el usuario no dimensiona la caja para los casos largos.
export const FIELD_SAMPLE_TEXT: Record<string, string> = {
  "student.full_name": "LOPEZ GUADARRAMA FRANCISCO DE JESUS",
  "student.first_name": "FRANCISCO DE JESUS",
  "student.last_name": "LOPEZ GUADARRAMA",
  "student.controlNumber": "2410049041",
  "student.blood_type": "O+",
  "student.sex": "M",
  "group.grade_section": "3°A",
  "group.grade": "3",
  "group.section": "A",
  "group.shift": "MATUTINO",
  "schoolYear.name": "2025-2026",
  "school.name": "ESCUELA SECUNDARIA TECNICA No. 47",
  "school.honoraryName": "Jose Clemente Orozco",
  "school.cct": "13DST0047H",
  "school.address": "Av. Principal #123, Col. Centro, Pachuca",
  "school.phoneNumber": "771 234 5678",
  "school.directorName": "Mtro. Juan Perez Hernandez",
  "school.city": "Pachuca de Soto, Hidalgo",
  "school.values": "Respeto, Responsabilidad, Honestidad",
  "guardian.phone": "7712345678",
};

export const IMAGE_FIELD_OPTIONS: FieldOption[] = [
  { value: "student.photo", label: "Foto del alumno" },
  { value: "school.logoUrl", label: "Logo de la escuela" },
  { value: "school.dgetLogoUrl", label: "Logo DGET" },
  { value: "school.iheLogoUrl", label: "Logo IHE" },
  { value: "school.watermarkUrl", label: "Marca de agua" },
];

export function fieldLabel(kind: ElementKind, field?: string | null): string {
  const list = kind === "image" ? IMAGE_FIELD_OPTIONS : TEXT_FIELD_OPTIONS;
  return list.find((o) => o.value === field)?.label || "";
}

export function emptyLayout(): CredentialLayout {
  return {
    version: 1,
    front: { background: { type: "none" }, elements: [] },
    back: { background: { type: "none" }, elements: [] },
  };
}

export function normalizeLayout(raw: unknown): CredentialLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const l = raw as Partial<CredentialLayout>;
  const fixPage = (p: unknown): LayoutPage => {
    const page = p && typeof p === "object" ? (p as LayoutPage) : ({} as LayoutPage);
    return {
      background:
        page.background && typeof page.background === "object"
          ? page.background
          : { type: "none" },
      elements: Array.isArray(page.elements) ? page.elements : [],
    };
  };
  return {
    version: 1,
    front: fixPage(l.front),
    back: fixPage(l.back),
  };
}

let seq = 0;
function newId(): string {
  seq += 1;
  return `el_${Date.now().toString(36)}_${seq}`;
}

// Tamaños iniciales según el tipo de elemento.
export function createElement(
  kind: ElementKind,
  opts: { field?: string; shape?: "rect" | "ellipse" } = {}
): LayoutElement {
  const base: LayoutElement = {
    id: newId(),
    kind,
    x: 60,
    y: 60,
    w: 300,
    h: 50,
    style: {},
  };

  if (kind === "text") {
    return {
      ...base,
      field: opts.field ?? null,
      text: opts.field ? "" : "Texto",
      w: opts.field === "school.indications" ? 600 : 320,
      h: opts.field === "school.indications" ? 220 : 48,
      style: {
        fontSize: 18,
        color: "#0f172a",
        fontWeight: 400,
        textAlign: "left",
        lineHeight: 1.3,
      },
    };
  }

  if (kind === "image") {
    const isPhoto = opts.field === "student.photo";
    return {
      ...base,
      field: opts.field ?? null,
      src: "",
      w: isPhoto ? 170 : 150,
      h: isPhoto ? 200 : 70,
      style: { objectFit: "contain", borderRadius: 0, opacity: 1 },
    };
  }

  return {
    ...base,
    shape: opts.shape ?? "rect",
    w: 160,
    h: 160,
    style: { backgroundColor: "#8B1A2B", opacity: 1, borderRadius: 0 },
  };
}

// Resuelve la URL de una imagen mapeable para previsualizar en el lienzo.
export function resolvePreviewImageSrc(
  el: LayoutElement,
  ctx: PreviewContext
): string | null {
  if (el.kind !== "image") return null;
  if (!el.field) return el.src || null;
  switch (el.field) {
    case "school.dgetLogoUrl":
      return ctx.dgetLogoUrl || null;
    case "school.iheLogoUrl":
      return ctx.iheLogoUrl || null;
    case "school.watermarkUrl":
      return ctx.watermarkUrl || null;
    case "school.logoUrl":
      return ctx.logoUrl || null;
    case "student.photo":
      return null; // placeholder en el editor
    default:
      return null;
  }
}

// Texto de placeholder que muestra el lienzo para un campo mapeable.
export function previewText(el: LayoutElement): string {
  if (el.field) {
    if (el.field === "school.indications") return "1. Indicación…";
    return fieldLabel("text", el.field) || "—";
  }
  return el.text || "";
}
