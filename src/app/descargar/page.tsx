// Página pública: Descargar la app de EdukControl para Android (APK)
// Enlace para las familias: se comparte directo (WhatsApp). El APK vive como
// asset del release de GitHub (v1.0.1, repo AldoO88/edukcontrol-app — público,
// descarga anónima; Cloudinary free limita 100 MB y el APK pesa ~103 MB).
// Es pública, no pasa por AuthGate.

import type { Metadata } from "next";
import Image from "next/image";
import { LegalShell, LegalSection } from "@/components/legal/LegalShell";
import { Download } from "lucide-react";

const APK_URL =
  "https://github.com/AldoO88/edukcontrol-app/releases/download/v1.0.1/EdukControl-1.0.1.apk";
const APK_VERSION = "1.0.1";
const APK_SIZE = "103 MB";

export const metadata: Metadata = {
  title: "Descargar App — EdukControl",
  description:
    "Descarga la app de EdukControl: Android (APK) e iPhone (TestFlight), con instrucciones de instalación y activación de cuenta.",
};

export default function DownloadPage() {
  return (
    <LegalShell
      title="Descargar la App"
      subtitle="App oficial de EdukControl — control de asistencia y calificaciones. Disponible para Android (APK) e iPhone (TestFlight)."
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

      <LegalSection heading="Cómo instalar en Android">
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
            Abre EdukControl. Si es tu primera vez, sigue la sección
            «Activar tu cuenta» de abajo; si ya la activaste, entra con tu{" "}
            <strong>teléfono celular</strong> y contraseña.
          </li>
        </ol>
      </LegalSection>

      {/* Sección iOS: TestFlight. El enlace público de prueba se añadirá
          cuando Apple apruebe la Beta App Review (grupo "Comunidad
          Escolar" en App Store Connect). */}
      <LegalSection heading="iPhone / iPad (TestFlight)">
        <p>
          En iPhone y iPad, EdukControl se distribuye con{" "}
          <strong>TestFlight</strong>, la app oficial de pruebas de Apple
          (gratis). Necesitas iOS 16.4 o superior.
        </p>

        <ol className="list-decimal ml-5 space-y-3">
          <li>
            Instala <strong>TestFlight</strong> desde el App Store: búscalo
            por nombre o toca{" "}
            <a
              href="https://apps.apple.com/app/testflight/id899247664"
              className="text-accent underline underline-offset-2"
            >
              este enlace
            </a>
            .
          </li>
          <li>
            {/* TODO(link): cuando Apple apruebe la beta, habilitar el
                enlace público del grupo "Comunidad Escolar" en App Store
                Connect y poner aquí el link:
                https://testflight.apple.com/join/<codigo> */}
            Abre el <strong>enlace de prueba</strong> de EdukControl y toca{" "}
            <strong>«Aceptar»</strong> cuando aparezca «Únete a la prueba
            beta».
          </li>
          <li>
            En TestFlight toca <strong>«Instalar»</strong> en EdukControl y
            después <strong>«Abrir»</strong>.
          </li>
          <li>
            Abre EdukControl y activa tu cuenta con los pasos de la sección
            siguiente: es el mismo proceso que en Android (celular, código
            por WhatsApp y contraseña).
          </li>
        </ol>

        <p>
          En iOS la app <strong>se actualiza sola</strong> desde TestFlight:
          cuando publiquemos una versión nueva no tienes que descargar nada.
        </p>
      </LegalSection>

      {/* Manual de activación: primer ingreso. El código OTP llega por
          WhatsApp (así lo envía el backend vía Twilio), aunque el botón
          en versiones anteriores decía "SMS" — por eso el manual no cita
          ese label y habla directo del mensaje de WhatsApp. */}
      <LegalSection heading="Activar tu cuenta (primer ingreso)">
        <p>
          Si es tu primera vez en EdukControl, crea tu contraseña con estos
          pasos:
        </p>

        {/* Tutorial paso a paso con capturas del APK 1.0.1 (tomadas en
            emulador con teléfono ficticio 5512345678). El botón de la app
            1.0.1 aún dice "Enviar código por SMS" en las capturas; la
            corrección a "WhatsApp" entra en 1.0.2. Por eso el texto de
            los pasos habla directo del mensaje de WhatsApp (lo que
            realmente sucede) y no cita ese label. */}
        <ol className="list-decimal ml-5 space-y-4">
          <li>
            Abre EdukControl y en la pantalla <strong>Bienvenido</strong> toca{" "}
            <strong>«¿Es tu primera vez? Activa tu cuenta aquí»</strong>.
            <ManualShot
              src="/manual-activar-cuenta.png"
              alt="Pantalla Bienvenido de EdukControl con los campos teléfono y contraseña, y el enlace ¿Es tu primera vez? Activa tu cuenta aquí"
            />
          </li>
          <li>
            Escribe el <strong>celular de 10 dígitos</strong> con el que estás
            registrado en la institución y toca el botón para enviar el código.
            <ManualShot
              src="/manual-activacion-celular.png"
              alt="Pantalla Activa tu cuenta con el campo de teléfono y el botón para enviar el código"
            />
          </li>
          <li>
            Revisa tu <strong>WhatsApp</strong>: te llegará un mensaje con un{" "}
            <strong>código de 6 dígitos</strong>. Caduca en{" "}
            <strong>10 minutos</strong>. ¿No llegó? Puedes reenviarlo (máximo
            5 veces por hora).
          </li>
          <li>
            Escribe el código y toca <strong>«Verificar código»</strong>.
            <ManualShot
              src="/manual-activacion-codigo.png"
              alt="Pantalla Código de verificación con el campo para escribir el código de 6 dígitos"
            />
          </li>
          <li>
            Crea tu contraseña (<strong>mínimo 8 caracteres</strong>) y toca{" "}
            <strong>«Guardar y entrar»</strong>. Entrarás automáticamente a tu
            portal.
            <ManualShot
              src="/manual-activacion-contrasena.png"
              alt="Pantalla Crea tu contraseña con el campo de contraseña y el botón Guardar y entrar"
            />
          </li>
          <li>
            En los siguientes ingresos solo escribe tu{" "}
            <strong>celular y contraseña</strong> en la pantalla Bienvenido.
          </li>
        </ol>

        <p className="font-semibold text-text-primary pt-2">
          Si tienes algún problema
        </p>
        <ul className="list-disc ml-5 space-y-3">
          <li>
            Aparece «Este número no está registrado…» → pide a tu coordinador
            que verifique que tu celular esté dado de alta en la institución.
          </li>
          <li>
            La app te pide autorizar los mensajes de WhatsApp → pídele a tu
            escuela habilitar las notificaciones de WhatsApp en tu cuenta.
          </li>
          <li>
            Aparece «Tu cuenta está desactivada…» → contacta a tu escuela para
            que la reactiven.
          </li>
          <li>
            ¿Ya activaste tu cuenta pero olvidaste tu contraseña? → en la
            pantalla Bienvenido toca{" "}
            <strong>«¿Olvidaste tu contraseña?»</strong> y sigue el mismo
            proceso por WhatsApp.
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

      <LegalSection heading="Notas importantes">
        <ul className="list-disc ml-5 space-y-3">
          <li>
            En Android, la app se instala directo del archivo APK (no viene
            de Play Store).{" "}
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

/** Captura del manual (1080×2424), centrada bajo el texto de su paso. */
function ManualShot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex justify-center pt-3">
      <Image
        src={src}
        alt={alt}
        width={270}
        height={606}
        className="rounded-xl border border-border shadow-sm"
      />
    </div>
  );
}
