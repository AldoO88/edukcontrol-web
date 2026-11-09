"use client";

// Selector de plataforma para /descargar: dos paneles (Android / iOS)
// con el botón de descarga de la tienda oficial y la guía de
// activación de cuenta (con las capturas de cada plataforma). La app
// está publicada en Google Play y en el App Store desde noviembre de
// 2026 — ya no se distribuye por APK de GitHub ni por TestFlight.
// Componente cliente por el estado del tab activo.

import { useState } from "react";
import { Apple, Download, FileDown, Smartphone } from "lucide-react";
import { ActivationGuide } from "./ActivationGuide";
import { AppleNote } from "./AppleNote";
import { APP_STORE_URL, APP_VERSION, PLAY_URL } from "../constants";

type Platform = "android" | "ios";

const TABS: {
  id: Platform;
  label: string;
  icon: typeof Smartphone;
}[] = [
  { id: "android", label: "App para Android", icon: Smartphone },
  { id: "ios", label: "App iOS", icon: Apple },
];

export function DownloadPlatforms() {
  const [platform, setPlatform] = useState<Platform>("android");

  return (
    <>
      {/* Selector segmentado: dos botones tipo píldora con tokens del
          sitio (bg-primary activo). Semántica ARIA de tabs para
          lectores de pantalla. */}
      <div className="flex justify-center py-2">
        <div
          role="tablist"
          aria-label="Elige tu plataforma"
          className="inline-flex rounded-full border border-border bg-card p-1 shadow-sm"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = platform === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPlatform(id)}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Paneles: ambos quedan en el DOM (SEO/compartidos por link) y
          solo se oculta el inactivo con el atributo hidden. */}
      <div role="tabpanel" aria-label="App para Android" hidden={platform !== "android"}>
        {/* Botón de Google Play: la tienda gestiona la instalación y
            las actualizaciones automáticas. */}
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <a
            href={PLAY_URL}
            className="inline-flex items-center gap-3 bg-primary hover:opacity-90 active:scale-[0.98] text-white font-semibold text-lg px-8 py-4 rounded-xl transition"
          >
            <Download size={22} />
            Descargar en Google Play
          </a>
          <p className="text-sm text-text-muted">
            Gratis · Versión {APP_VERSION} · Se actualiza automáticamente.
          </p>
        </div>

        <PdfTutorialLink platform="android" />

        <ActivationGuide platform="android" />
      </div>

      <div
        role="tabpanel"
        aria-label="App iOS"
        hidden={platform !== "ios"}
      >
        {/* Botón del App Store (iPhone y iPad). */}
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <a
            href={APP_STORE_URL}
            className="inline-flex items-center gap-3 bg-primary hover:opacity-90 active:scale-[0.98] text-white font-semibold text-lg px-8 py-4 rounded-xl transition"
          >
            <Apple size={22} />
            Descargar en el App Store
          </a>
          <p className="text-sm text-text-muted">
            Gratis · Versión {APP_VERSION} · Se actualiza automáticamente.
          </p>
        </div>

        <PdfTutorialLink platform="ios" />

        {/* Nota de "Continuar con Apple" (solo iOS) — compartida con la
            página imprimible /descargar/guia/ios. */}
        <AppleNote />

        <ActivationGuide platform="ios" />
      </div>
    </>
  );
}

/**
 * Botón de descarga del tutorial de activación de esta plataforma en
 * PDF. Apunta a un archivo estático en public/guias/ generado con
 * Chrome headless desde la página imprimible /descargar/guia/[platform]
 * (ver scripts/generar-tutoriales-pdf.sh): un toque y el PDF se
 * descarga — en celular/WhatsApp no hace falta pasar por el diálogo de
 * impresión del navegador.
 */
function PdfTutorialLink({ platform }: { platform: Platform }) {
  return (
    <div className="flex justify-center pt-1">
      <a
        href={`/guias/guia-activacion-${platform}.pdf`}
        download
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-background hover:text-text-primary"
      >
        <FileDown size={16} />
        Descargar tutorial en PDF
      </a>
    </div>
  );
}
