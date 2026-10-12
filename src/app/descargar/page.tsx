// Página pública: Descargar la app de EdukControl para Android (APK)
// Enlace para las familias: se comparte directo (WhatsApp). El APK vive como
// asset del release de GitHub (v1.0.0, repo AldoO88/edukcontrol-app — público,
// descarga anónima; Cloudinary free limita 100 MB y el APK pesa ~103 MB).
// Es pública, no pasa por AuthGate.

import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/LegalShell";
import { Download } from "lucide-react";

const APK_URL =
  "https://github.com/AldoO88/edukcontrol-app/releases/download/v1.0.0/EdukControl-1.0.0.apk";
const APK_VERSION = "1.0.0";
const APK_SIZE = "103 MB";

export const metadata: Metadata = {
  title: "Descargar App — EdukControl",
  description:
    "Descarga la app de EdukControl para Android e instrucciones de instalación.",
};

export default function DownloadPage() {
  return (
    <LegalShell
      title="Descargar la App"
      subtitle="App oficial de EdukControl para Android — control de asistencia y calificaciones."
      updatedLabel={`Versión ${APK_VERSION} · 12 de octubre de 2026`}
    >
      {/* Botón de descarga */}
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
          Versión {APK_VERSION} · {APK_SIZE} · Se descarga el archivo e instalas
          directo en tu teléfono.
        </p>
      </div>

      <LegalSection heading="Cómo instalar">
        <ol className="list-decimal ml-5 space-y-3">
          <li>
            Toca <strong>«Descargar APK para Android</strong>» y espera a que
            termine la descarga.
          </li>
          <li>
            Al abrir el archivo, Android mostrará:{" "}
            <em>
              «Por tu seguridad, tu teléfono no permite instalar aplicaciones
              desconocidas de esta fuente»
            </em>
            . Toca <strong>Ajustes</strong>, activa{" "}
            <strong>«Permitir de esta fuente»</strong> y regresa.
          </li>
          <li>
            Play Protect puede avisar que la app no fue reconocida porque no
            viene de Play Store. Toca{" "}
            <strong>«Instalar de todos modos»</strong> — es la app oficial de
            EdukControl.
          </li>
          <li>
            Abre EdukControl y entra con tu <strong>teléfono celular</strong> y
            contraseña.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="Notas importantes">
        <ul className="list-disc ml-5 space-y-3">
          <li>
            Esta versión se instala directo (no viene de Play Store).{" "}
            <strong>No se actualiza sola</strong>: cuando salga una versión
            nueva te compartiremos este mismo enlace con el archivo actualizado.
          </li>
          <li>
            Si ya tienes una versión anterior instalada, instalar este archivo
            la actualiza sin borrar tus datos.
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
