// Página pública: Descargar la app de EdukControl. La app está
// publicada en Google Play (Android) y en el App Store (iPhone/iPad)
// desde noviembre de 2026 — la página enlaza a las tiendas oficiales
// y muestra el tutorial de activación con capturas de cada
// plataforma. Enlace para las familias: se comparte directo
// (WhatsApp). Es pública, no pasa por AuthGate.
//
// El contenido por plataforma (botón de tienda + activación) vive en
// _components/DownloadPlatforms.tsx (selector cliente Android/iOS).

import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/LegalShell";
import { DownloadPlatforms } from "./_components/DownloadPlatforms";
import { APP_VERSION } from "./constants";

export const metadata: Metadata = {
  title: "Descargar App — EdukControl",
  description:
    "Descarga la app de EdukControl en Google Play (Android) o en el App Store (iPhone), con instrucciones de activación de cuenta.",
};

export default function DownloadPage() {
  return (
    <LegalShell
      title="Descargar la App"
      subtitle="App oficial de EdukControl — control de asistencia y calificaciones. Elige tu plataforma."
      updatedLabel={`Versión ${APP_VERSION} · 5 de noviembre de 2026`}
    >
      <DownloadPlatforms />

      <LegalSection heading="Notas importantes">
        <ul className="list-disc ml-5 space-y-3">
          <li>
            Descárgala desde la tienda oficial de tu teléfono:{" "}
            <strong>Google Play</strong> en Android o el{" "}
            <strong>App Store</strong> en iPhone y iPad. Ambas versiones{" "}
            <strong>se actualizan automáticamente</strong>: no tienes que
            descargar nada cuando salga una versión nueva.
          </li>
          <li>
            La descarga y el uso de la app son <strong>gratuitos</strong>.
          </li>
          <li>
            ¿Dudas o problemas? Escríbenos a{" "}
            <a
              href="mailto:soporte@edukcontrol.net"
              className="text-accent underline underline-offset-2"
            >
              soporte@edukcontrol.net
            </a>
            .
          </li>
        </ul>
      </LegalSection>
    </LegalShell>
  );
}
