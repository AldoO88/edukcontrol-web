// Tutorial de activación en página imprimible, una por plataforma.
//
// Es la MISMA guía que muestra el selector de /descargar (botón de
// tienda, nota de Apple solo iOS y ActivationGuide), servida como
// página estática sin el selector de tabs. Sirve para dos cosas:
//
//   1. Fuente determinista de los PDFs que descarga el botón
//      «Descargar tutorial en PDF» de /descargar: se generan con
//      Chrome headless desde esta ruta (ver
//      scripts/generar-tutoriales-pdf.sh → public/guias/*.pdf).
//   2. Versión imprimible/HTML enlazable (Ctrl+P también sale bien:
//      ver las reglas @media print de globals.css).
//
// Solo existen las dos plataformas (generateStaticParams +
// dynamicParams=false): cualquier otro segmento → 404.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalShell } from "@/components/legal/LegalShell";
import { ActivationGuide } from "../../_components/ActivationGuide";
import { AppleNote } from "../../_components/AppleNote";
import { APP_STORE_URL, APP_VERSION, PLAY_URL } from "../../constants";

type Platform = "android" | "ios";

const PLATFORMS: Record<
  Platform,
  { label: string; storeName: string; storeUrl: string }
> = {
  android: {
    label: "Android",
    storeName: "Google Play",
    storeUrl: PLAY_URL,
  },
  ios: {
    label: "iPhone y iPad",
    storeName: "App Store",
    storeUrl: APP_STORE_URL,
  },
};

export function generateStaticParams() {
  return [{ platform: "android" }, { platform: "ios" }];
}

// Sin params dinámicos fuera de los dos valores anteriores → 404.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string }>;
}): Promise<Metadata> {
  const { platform } = await params;
  if (platform !== "android" && platform !== "ios") return {};
  const p = PLATFORMS[platform];
  return {
    title: `Tutorial de activación — ${p.label}`,
    description: `Activa tu cuenta de EdukControl en ${p.label} en 3 pasos: celular, código de verificación de 6 dígitos y contraseña. Versión ${APP_VERSION}.`,
    // Espejo del contenido de /descargar: sin indexar.
    robots: { index: false },
  };
}

export default async function GuiaTutorialPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  if (platform !== "android" && platform !== "ios") notFound();
  const p = PLATFORMS[platform];

  return (
    <LegalShell
      title={`Tutorial de activación — ${p.label}`}
      subtitle="Primer ingreso a EdukControl: celular → código de verificación → contraseña."
      updatedLabel={`Versión ${APP_VERSION} · 5 de noviembre de 2026`}
    >
      {/* La tienda como línea de texto (en papel/ PDF un URL legible
          funciona mejor que el botón con fondo sólido). */}
      <p>
        Disponible en <strong>{p.storeName}</strong>:{" "}
        <a
          href={p.storeUrl}
          className="text-accent underline underline-offset-2"
        >
          {p.storeUrl}
        </a>
      </p>

      {platform === "ios" && <AppleNote />}

      <ActivationGuide platform={platform} />
    </LegalShell>
  );
}
