// Página pública: Descargar la app de EdukControl (Android APK +
// iPhone vía TestFlight). Enlace para las familias: se comparte
// directo (WhatsApp). El APK vive como asset del release de GitHub
// (v1.0.1, repo AldoO88/edukcontrol-app — público, descarga anónima;
// Cloudinary free limita 100 MB y el APK pesa ~103 MB). Es pública,
// no pasa por AuthGate.
//
// El contenido por plataforma (instalación + activación) vive en
// _components/DownloadPlatforms.tsx (selector cliente Android/iOS).

import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/LegalShell";
import { DownloadPlatforms } from "./_components/DownloadPlatforms";
import { APK_VERSION } from "./constants";

export const metadata: Metadata = {
  title: "Descargar App — EdukControl",
  description:
    "Descarga la app de EdukControl: Android (APK) e iPhone (TestFlight), con instrucciones de instalación y activación de cuenta.",
};

export default function DownloadPage() {
  return (
    <LegalShell
      title="Descargar la App"
      subtitle="App oficial de EdukControl — control de asistencia y calificaciones. Elige tu plataforma."
      updatedLabel={`Versión ${APK_VERSION} · 12 de octubre de 2026`}
    >
      <DownloadPlatforms />

      <LegalSection heading="Notas importantes">
        <ul className="list-disc ml-5 space-y-3">
          <li>
            En Android, la app se instala directo del archivo APK (no viene
            de Play Store).{" "}
            <strong>No se actualiza sola</strong>: cuando salga una versión
            nueva te compartiremos este mismo enlace con el archivo
            actualizado.
          </li>
          <li>
            En Android, si ya tienes una versión anterior instalada, instalar
            el archivo nuevo la actualiza sin borrar tus datos.
          </li>
          <li>
            En iPhone, la app <strong>se actualiza sola</strong> desde
            TestFlight.
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
