// Layout de texto CR80 compartido conceptualmente con el backend
// (services/credential-text-layout.js — mantener AMBOS idénticos).
//
// Especificación:
//   1. Párrafos = texto partido por "\n"; vacíos se ignoran.
//   2. Wrap voraz a lo ancho de la caja (palabras; palabras más anchas que
//      la caja se cortan por caracteres) usando las métricas Helvetica.
//   3. Auto-shrink: baja de 0.5 en 0.5 (piso CR80_MIN_FONT_PT) hasta que
//      TODAS las líneas quepan en el ancho Y el bloque (n × size × 1.2)
//      quepa en el alto de la caja.
//   4. Safety: si aún así hay más líneas de las que caben, se truncan.
//
// El resultado { lines, size } es lo que se imprime (WYSIWYG): el lienzo
// debe renderizar exactamente estas líneas a este tamaño.

import {
  CR80_LINE_SPACING,
  CR80_MIN_FONT_PT,
  cr80TextWidth,
  type Cr80FontKind,
} from "./cr80-text-metrics";

export interface Cr80TextLayout {
  lines: string[];
  size: number;
}

const MAX_FONT_PT = 96;

function wrapParagraphs(
  paragraphs: string[],
  boxW: number,
  size: number,
  kind: Cr80FontKind
): string[] {
  const widthAt = (t: string) => cr80TextWidth(t, size, kind);
  const out: string[] = [];
  for (const p of paragraphs) {
    if (p === "") continue;
    const words = p.split(/\s+/).filter((w) => w.length > 0);
    let cur = "";
    for (const word of words) {
      const cand = cur === "" ? word : `${cur} ${word}`;
      if (widthAt(cand) <= boxW) {
        cur = cand;
        continue;
      }
      if (cur !== "") {
        out.push(cur);
        cur = "";
      }
      if (widthAt(word) <= boxW) {
        cur = word;
        continue;
      }
      // Palabra más ancha que la caja → corte por caracteres.
      let chunk = "";
      for (const ch of Array.from(word)) {
        if (chunk !== "" && widthAt(chunk + ch) > boxW) {
          out.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      cur = chunk;
    }
    if (cur !== "") out.push(cur);
  }
  return out;
}

export function layoutCr80Text(
  paragraphs: string[],
  boxW: number,
  boxH: number,
  requestedSize: number,
  kind: Cr80FontKind
): Cr80TextLayout {
  const w = Math.max(4, boxW);
  const h = Math.max(4, boxH);
  const requested = Number.isFinite(requestedSize) ? requestedSize : 16;
  let size = Math.min(MAX_FONT_PT, Math.max(CR80_MIN_FONT_PT, requested));
  let lines = wrapParagraphs(paragraphs, w, size, kind);

  const fits = () =>
    !lines.some((l) => cr80TextWidth(l, size, kind) > w) &&
    lines.length * size * CR80_LINE_SPACING <= h;

  while (!fits() && size > CR80_MIN_FONT_PT) {
    size = Math.max(CR80_MIN_FONT_PT, size - 0.5);
    lines = wrapParagraphs(paragraphs, w, size, kind);
  }

  const maxLines = Math.max(
    1,
    Math.floor(h / (size * CR80_LINE_SPACING) + 1e-9)
  );
  if (lines.length > maxLines) lines = lines.slice(0, maxLines);
  return { lines, size };
}
