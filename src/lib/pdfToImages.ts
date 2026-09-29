// Conversión de PDF → imágenes PNG en el navegador (pdf.js).
// Se usa para que el usuario suba su plantilla de credencial en PDF y el
// diseñador la use como fondo: página 1 → frente, página 2 → reverso.
// El PDF nunca viaja al backend; solo se sube el PNG renderizado.

import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export interface PdfPageImage {
  blob: Blob;
  pageNumber: number;
  width: number;
  height: number;
}

// Página renderizada del PDF guardado (fondo CR80).
// width/height son dimensiones lógicas del PDF (pt, viewport scale 1);
// dataUrl es el PNG renderizado a `scale` para nitidez en pantalla.
export interface PdfPageImageData {
  dataUrl: string;
  pageNumber: number;
  width: number;
  height: number;
}

/**
 * Renderiza hasta `maxPages` páginas de un PDF (bytes) como PNG data URLs.
 * Se usa para pintar el fondo guardado en el lienzo CR80 del diseñador.
 */
export async function pdfBufferToPageImages(
  data: ArrayBuffer,
  maxPages = 2,
  scale = 3
): Promise<PdfPageImageData[]> {
  // getDocument "desengancha" el ArrayBuffer: trabaja sobre una copia.
  const loadingTask = pdfjs.getDocument({ data: data.slice(0) });
  const doc = await loadingTask.promise;
  const images: PdfPageImageData[] = [];

  try {
    const total = Math.min(doc.numPages, maxPages);
    for (let pageNum = 1; pageNum <= total; pageNum++) {
      const page = await doc.getPage(pageNum);
      const logical = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo crear el canvas.");

      await page.render({ canvas, viewport }).promise;

      images.push({
        dataUrl: canvas.toDataURL("image/png"),
        pageNumber: pageNum,
        width: logical.width,
        height: logical.height,
      });
      page.cleanup();
    }
  } finally {
    // En pdf.js v6, destroy() vive en el loading task (no en el doc).
    await loadingTask.destroy().catch(() => {});
  }

  return images;
}

/**
 * Renderiza hasta `maxPages` páginas del PDF como PNG.
 * @param scale factor de zoom (2 ≈ 144 dpi, buena calidad de impresión)
 */
export async function pdfToPngImages(
  file: File,
  maxPages = 2,
  scale = 2
): Promise<PdfPageImage[]> {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  const images: PdfPageImage[] = [];

  try {
    const total = Math.min(doc.numPages, maxPages);
    for (let pageNum = 1; pageNum <= total; pageNum++) {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo crear el canvas.");

      await page.render({ canvas, viewport }).promise;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (blob) {
        images.push({
          blob,
          pageNumber: pageNum,
          width: canvas.width,
          height: canvas.height,
        });
      }
      page.cleanup();
    }
  } finally {
    // En pdf.js v6, destroy() vive en el loading task (no en el doc).
    await loadingTask.destroy().catch(() => {});
  }

  return images;
}
