"use client";

// Selector de plataforma para /descargar: dos paneles (Android / iOS)
// con las instrucciones de instalación de cada uno y la guía de
// activación de cuenta (compartida — el flujo es idéntico en ambas
// plataformas). Componente cliente por el estado del tab activo.

import { useState } from "react";
import { Apple, Download, Smartphone } from "lucide-react";
import { LegalSection } from "@/components/legal/LegalShell";
import { ActivationGuide } from "./ActivationGuide";
import { APK_SIZE, APK_URL, APK_VERSION, TESTFLIGHT_URL } from "../constants";

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
          {/* Botón de descarga del APK (asset del release de GitHub
              v1.0.1 — la web solo enlaza). */}
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <a
              href={APK_URL}
              download
              className="inline-flex items-center gap-3 bg-primary hover:opacity-90 active:scale-[0.98] text-white font-semibold text-lg px-8 py-4 rounded-xl transition"
            >
              <Download size={22} />
              Descargar APK para Android
            </a>
            <p className="text-sm text-text-muted">
              Versión {APK_VERSION} · {APK_SIZE} · Se descarga el archivo e
              instalas directo en tu teléfono.
            </p>
          </div>

          <LegalSection heading="Cómo instalar en Android">
            <ol className="list-decimal ml-5 space-y-3">
              <li>
                Toca <strong>«Descargar APK para Android</strong>» y espera a
                que termine la descarga.
              </li>
              <li>
                Al abrir el archivo, Android mostrará:{" "}
                <em>
                  «Por tu seguridad, tu teléfono no permite instalar
                  aplicaciones desconocidas de esta fuente»
                </em>
                . Toca <strong>Ajustes</strong>, activa{" "}
                <strong>«Permitir de esta fuente»</strong> y regresa.
              </li>
              <li>
                Play Protect puede avisar que la app no fue reconocida porque
                no viene de Play Store. Toca{" "}
                <strong>«Instalar de todos modos»</strong> — es la app oficial
                de EdukControl.
              </li>
              <li>
                Abre EdukControl. Si es tu primera vez, sigue la sección
                «Activar tu cuenta» de abajo; si ya la activaste, entra con
                tu <strong>teléfono celular</strong> y contraseña.
              </li>
            </ol>
          </LegalSection>

          <ActivationGuide />
        </div>

        <div
          role="tabpanel"
          aria-label="App iOS"
          hidden={platform !== "ios"}
        >
          {/* Sección iOS: TestFlight. El enlace público de prueba se
              añadirá cuando Apple apruebe la Beta App Review (grupo
              "Comunidad Escolar" en App Store Connect). Cuando la app
              salga a la Tienda, aquí va también el botón "Descargar en
              el App Store". */}
          <LegalSection heading="Instalación con TestFlight">
            <p>
              En iPhone y iPad, EdukControl se distribuye con{" "}
              <strong>TestFlight</strong>, la app oficial de pruebas de Apple
              (gratis). Necesitas iOS 16.4 o superior.
            </p>

            <ol className="list-decimal ml-5 space-y-3">
              <li>
                Instala <strong>TestFlight</strong> desde el App Store:
                búscalo por nombre o toca{" "}
                <a
                  href={TESTFLIGHT_URL}
                  className="text-accent underline underline-offset-2"
                >
                  este enlace
                </a>
                .
              </li>
              <li>
                {/* TODO(link): cuando Apple apruebe la beta, habilitar el
                    enlace público del grupo "Comunidad Escolar" en App
                    Store Connect y poner aquí el link:
                    https://testflight.apple.com/join/<codigo> */}
                Abre el <strong>enlace de prueba</strong> de EdukControl y
                toca <strong>«Aceptar»</strong> cuando aparezca «Únete a la
                prueba beta».
              </li>
              <li>
                En TestFlight toca <strong>«Instalar»</strong> en EdukControl
                y después <strong>«Abrir»</strong>.
              </li>
              <li>
                Abre EdukControl y activa tu cuenta con la sección de abajo:
                es el mismo proceso que en Android (celular, código por
                WhatsApp y contraseña).
              </li>
            </ol>

            <p>
              En iOS la app <strong>se actualiza sola</strong> desde
              TestFlight: cuando publiquemos una versión nueva no tienes que
              descargar nada.
            </p>
          </LegalSection>

          <ActivationGuide />
        </div>
    </>
  );
}
