// Guía de activación de cuenta (primer ingreso) — la recibe cada
// panel del selector /descargar con su plataforma ("android" | "ios")
// para mostrar las capturas de cada tienda. El flujo es idéntico en
// ambas plataformas (celular → código OTP → contraseña); lo que
// cambia son las capturas y la nota de "Continuar con Apple" (solo
// iOS, ver DownloadPlatforms).
//
// Canal del código: SMS es el canal PRINCIPAL y garantizado (llega
// como mensaje de texto, sin instalar nada — Guideline 4.2.3(i)) y
// WhatsApp es una alternativa opcional que el usuario elige con el
// selector de la pantalla de activación. Por eso el manual habla de
// SMS primero y de WhatsApp como opción.
//
// Capturas de la app 1.0.1 publicada en tiendas: Android (emulador
// Pixel_9) e iOS (simulador iPhone 17 Pro).

import Image from "next/image";
import { LegalSection } from "@/components/legal/LegalShell";

type Platform = "android" | "ios";

// Rutas y dimensiones (px reales de la captura) por plataforma.
const SHOTS: Record<
  Platform,
  {
    bienvenido: string;
    activacion: string;
    codigo: string;
    contrasena: string;
    width: number;
    height: number;
  }
> = {
  android: {
    bienvenido: "/manual-android-bienvenido.png",
    activacion: "/manual-android-activacion.png",
    codigo: "/manual-android-codigo.png",
    contrasena: "/manual-android-contrasena.png",
    width: 1080,
    height: 2424,
  },
  ios: {
    bienvenido: "/manual-ios-bienvenido.png",
    activacion: "/manual-ios-activacion.png",
    codigo: "/manual-ios-codigo.png",
    contrasena: "/manual-ios-contrasena.png",
    width: 1206,
    height: 2622,
  },
};

export function ActivationGuide({ platform }: { platform: Platform }) {
  const shots = SHOTS[platform];

  return (
    <LegalSection heading="Activar tu cuenta (primer ingreso)">
      <p>
        Si es tu primera vez en EdukControl, sigue estos pasos:
      </p>

      {/* Tutorial paso a paso con capturas de la app publicada (1.0.1)
          en cada tienda.

          En pantalla el texto va arriba y la captura centrada debajo;
          para el PDF (media print) cada paso con captura se envuelve
          en un <div> que imprime como fila: texto a la izquierda,
          captura a la derecha. Si no, cada paso con su captura ocupa
          casi una hoja entera y el documento queda con mucho espacio
          en blanco entre páginas. */}
      <ol className="list-decimal ml-5 space-y-4">
        <li>
          <p>
            <strong>Descarga EdukControl</strong>: búscala en{" "}
            {platform === "ios" ? "el App Store" : "Google Play"} por su
            nombre «<strong>EdukControl</strong>» o toca el enlace de arriba
            para ir directo a la tienda.
          </p>
        </li>
        <li>
          <div className="print:flex print:items-start print:gap-3">
            <p className="print:flex-1 print:min-w-0">
              Abre EdukControl y en la pantalla <strong>Bienvenido</strong>{" "}
              toca{" "}
              <strong>«¿Es tu primera vez? Activa tu cuenta aquí»</strong>.
            </p>
            <ManualShot
              src={shots.bienvenido}
              alt={
                platform === "ios"
                  ? "Pantalla Bienvenido de EdukControl con los campos teléfono y contraseña, el botón Continuar con Apple y el enlace ¿Es tu primera vez? Activa tu cuenta aquí"
                  : "Pantalla Bienvenido de EdukControl con los campos teléfono y contraseña y el enlace ¿Es tu primera vez? Activa tu cuenta aquí"
              }
              width={shots.width}
              height={shots.height}
            />
          </div>
        </li>
        <li>
          <div className="print:flex print:items-start print:gap-3">
            <p className="print:flex-1 print:min-w-0">
              Escribe el <strong>celular de 10 dígitos</strong> con el que
              estás registrado en la institución. Elige dónde recibir tu
              código: <strong>SMS</strong> (por defecto — llega como mensaje
              de texto, no necesitas instalar nada) o{" "}
              <strong>WhatsApp</strong> (opcional), y toca{" "}
              <strong>«Enviar código»</strong>.
            </p>
            <ManualShot
              src={shots.activacion}
              alt="Pantalla Activa tu cuenta con el campo de teléfono, el selector ¿Dónde recibes tu código? con las opciones SMS y WhatsApp, y el botón Enviar código"
              width={shots.width}
              height={shots.height}
            />
          </div>
        </li>
        <li>
          <p>
            Revisa tu <strong>SMS</strong> (o WhatsApp, si lo elegiste): te
            llegará un mensaje con un <strong>código de 6 dígitos</strong>.
            Caduca en <strong>10 minutos</strong>. ¿No llegó? Puedes
            reenviarlo (máximo 5 veces por hora).
          </p>
        </li>
        <li>
          <div className="print:flex print:items-start print:gap-3">
            <p className="print:flex-1 print:min-w-0">
              Escribe el código y toca <strong>«Verificar código»</strong>.
            </p>
            <ManualShot
              src={shots.codigo}
              alt="Pantalla Código de verificación con el campo para escribir el código de 6 dígitos"
              width={shots.width}
              height={shots.height}
            />
          </div>
        </li>
        <li>
          <div className="print:flex print:items-start print:gap-3">
            <p className="print:flex-1 print:min-w-0">
              Crea tu contraseña (<strong>mínimo 8 caracteres</strong>) y
              toca <strong>«Guardar y entrar»</strong>. Entrarás
              automáticamente a tu portal.
            </p>
            <ManualShot
              src={shots.contrasena}
              alt="Pantalla Crea tu contraseña con el campo de contraseña y el botón Guardar y entrar"
              width={shots.width}
              height={shots.height}
            />
          </div>
        </li>
        <li>
          <p>
            En los siguientes ingresos solo escribe tu{" "}
            <strong>celular y contraseña</strong> en la pantalla Bienvenido
            {platform === "ios" ? (
              <>
                , o toca <strong>«Continuar con Apple»</strong> si tu correo
                ya está vinculado (ver la nota de Apple de arriba).
              </>
            ) : (
              "."
            )}
          </p>
        </li>
      </ol>

      <p className="font-semibold text-text-primary pt-2 print:break-after-avoid">
        Si tienes algún problema
      </p>
      <ul className="list-disc ml-5 space-y-3">
        <li>
          Aparece «Este número no está registrado…» → pide a tu coordinador
          que verifique que tu celular esté dado de alta en la institución.
        </li>
        <li>
          ¿No te llegó el código? → verifica que el número tenga 10 dígitos y
          vuelve a solicitarlo (máximo 5 reenvíos por hora). Revisa también
          tu bandeja de mensajes no deseados.
        </li>
        <li>
          Aparece «Tu cuenta está desactivada…» → contacta a tu escuela para
          que la reactiven.
        </li>
        <li>
          ¿Ya activaste tu cuenta pero olvidaste tu contraseña? → en la
          pantalla Bienvenido toca{" "}
          <strong>«¿Olvidaste tu contraseña?»</strong> y sigue el mismo
          proceso de verificación.
        </li>
        {platform === "ios" && (
          <li>
            ¿Quieres usar <strong>«Continuar con Apple»</strong> y no te
            aparece o no entra? → tu correo aún no está vinculado a tu cuenta:
            envía a{" "}
            <a
              href="mailto:soporte@edukcontrol.net"
              className="text-accent underline underline-offset-2"
            >
              soporte@edukcontrol.net
            </a>{" "}
            tu <strong>correo de Apple</strong> indicando el{" "}
            <strong>nombre, grado y grupo del alumno</strong>.
          </li>
        )}
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

/** Captura del manual, centrada bajo el texto de su paso. */
function ManualShot({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  // Ancho fijo de 270 px en pantalla; la altura conserva la
  // proporción real de cada captura (Android e iOS difieren). En
  // impresión (PDF) baja a 190 px y queda como segundo ítem de la
  // fila print:flex del paso: a la derecha del texto y sin el
  // padding superior, para que quepan ~2 pasos por hoja.
  const displayHeight = Math.round((270 * height) / width);

  return (
    <div className="flex justify-center pt-3 print:flex-none print:pt-0">
      <Image
        src={src}
        alt={alt}
        width={270}
        height={displayHeight}
        className="rounded-xl border border-border shadow-sm print:w-[190px] print:h-auto"
      />
    </div>
  );
}
