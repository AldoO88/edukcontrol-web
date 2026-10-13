// Guía de activación de cuenta (primer ingreso) — compartida por el
// panel Android y el panel iOS del selector de /descargar: el flujo es
// idéntico en ambas plataformas (celular → código OTP por WhatsApp →
// contraseña).
//
// El código OTP lo envía el backend vía Twilio WhatsApp, aunque el
// botón en la app 1.0.1 aún dice "Enviar código por SMS" en las
// capturas (la corrección a "WhatsApp" entra en 1.0.2) — por eso el
// manual no cita ese label y habla directo del mensaje de WhatsApp.

import Image from "next/image";
import { LegalSection } from "@/components/legal/LegalShell";

export function ActivationGuide() {
  return (
    <LegalSection heading="Activar tu cuenta (primer ingreso)">
      <p>
        Si es tu primera vez en EdukControl, crea tu contraseña con estos
        pasos:
      </p>

      {/* Tutorial paso a paso con capturas del APK 1.0.1 (tomadas en
          emulador Android con teléfono ficticio 5512345678). */}
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
